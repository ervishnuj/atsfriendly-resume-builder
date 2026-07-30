import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type AdminUserRow = {
  id: string;
  email: string;
  is_unlimited: boolean;
  subscription_expires_at: string | null;
  daily_usage_count: number;
  last_reset_date: string;
  created_at: string;
  role: string;
};

async function assertAdmin(userId: string) {
  const { isAdmin } = await import("./account.server");
  if (!(await isAdmin(userId))) {
    throw new Error("403 Unauthorized: admin access required");
  }
}

export const adminOverview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ search: z.string().max(200).default("") }).parse(input ?? {}),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    let query = supabaseAdmin
      .from("app_users")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    if (data.search.trim()) query = query.ilike("email", `%${data.search.trim()}%`);

    const [{ data: users, error }, { data: roles }, { data: txns }] = await Promise.all([
      query,
      supabaseAdmin.from("user_roles").select("user_id, role"),
      supabaseAdmin
        .from("transactions")
        .select("id, user_id, payment_id, amount, currency, status, validity_start, validity_end, created_at")
        .order("created_at", { ascending: false })
        .limit(100),
    ]);
    if (error) throw new Error(error.message);

    const roleMap = new Map((roles ?? []).map((r) => [r.user_id, r.role]));
    const rows: AdminUserRow[] = (users ?? []).map((u) => ({
      ...u,
      role: roleMap.get(u.id) ?? "user",
    }));

    const totalPaid = (txns ?? [])
      .filter((t) => t.status === "paid" || t.status === "succeeded")
      .reduce((sum, t) => sum + Number(t.amount ?? 0), 0);

    return {
      users: rows,
      transactions: txns ?? [],
      stats: {
        totalUsers: rows.length,
        activeSubscribers: rows.filter(
          (u) =>
            u.is_unlimited ||
            (u.subscription_expires_at &&
              new Date(u.subscription_expires_at).getTime() > Date.now()),
        ).length,
        totalPaid,
        generationsToday: rows.reduce((s, u) => s + u.daily_usage_count, 0),
      },
    };
  });

export const adminUpdateUserPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        targetUserId: z.string().uuid(),
        isUnlimited: z.boolean().optional(),
        extendDays: z.number().int().min(-3650).max(3650).optional(),
        clearSubscription: z.boolean().optional(),
        resetUsage: z.boolean().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: row, error: readErr } = await supabaseAdmin
      .from("app_users")
      .select("*")
      .eq("id", data.targetUserId)
      .maybeSingle();
    if (readErr) throw new Error(readErr.message);
    if (!row) throw new Error("User not found");

    const update: {
      is_unlimited?: boolean;
      daily_usage_count?: number;
      subscription_expires_at?: string | null;
    } = {};
    if (typeof data.isUnlimited === "boolean") update.is_unlimited = data.isUnlimited;
    if (data.resetUsage) update.daily_usage_count = 0;
    if (data.clearSubscription) update.subscription_expires_at = null;
    if (data.extendDays) {
      const base =
        row.subscription_expires_at &&
        new Date(row.subscription_expires_at).getTime() > Date.now()
          ? new Date(row.subscription_expires_at)
          : new Date();
      base.setDate(base.getDate() + data.extendDays);
      update.subscription_expires_at = base.toISOString();

      if (data.extendDays > 0) {
        await supabaseAdmin.from("transactions").insert({
          user_id: data.targetUserId,
          payment_id: `manual-${Date.now()}`,
          amount: 0,
          status: "manual",
          validity_start: new Date().toISOString(),
          validity_end: base.toISOString(),
        });
      }
    }

    const { error } = await supabaseAdmin
      .from("app_users")
      .update(update)
      .eq("id", data.targetUserId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminGetSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { decryptField } = await import("./crypto.server");
    const { data, error } = await supabaseAdmin
      .from("app_settings")
      .select("*")
      .order("key");
    if (error) throw new Error(error.message);
    return (data ?? []).map((s) => {
      const value = decryptField(s.encrypted_value) ?? "";
      return {
        key: s.key,
        description: s.description,
        updated_at: s.updated_at,
        // Never return full secrets to the browser.
        masked: value ? `${value.slice(0, 4)}••••${value.slice(-4)}` : "",
        hasValue: !!value,
      };
    });
  });

export const adminSaveSetting = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        key: z
          .string()
          .trim()
          .min(2)
          .max(64)
          .regex(/^[A-Za-z0-9_.-]+$/, "Use letters, numbers, _ . - only"),
        value: z.string().max(5000),
        description: z.string().max(200).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { encryptField } = await import("./crypto.server");
    const { error } = await supabaseAdmin.from("app_settings").upsert(
      {
        key: data.key,
        encrypted_value: encryptField(data.value),
        description: data.description ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "key" },
    );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminDeleteSetting = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ key: z.string().min(1) }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("app_settings").delete().eq("key", data.key);
    if (error) throw new Error(error.message);
    return { ok: true };
  });