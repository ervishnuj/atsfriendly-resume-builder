import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type StoredProfile = {
  personal: Record<string, string>;
  skills: { category: string; items: string[] }[];
  experience: {
    title: string;
    company: string;
    dateRange: string;
    bullets: string[];
  }[];
  education: Record<string, string>[];
};

export type AccountSummary = {
  userId: string;
  email: string;
  isAdmin: boolean;
  isUnlimited: boolean;
  subscriptionExpiresAt: string | null;
  dailyUsageCount: number;
  dailyLimit: number;
  remaining: number | null;
  profile: StoredProfile | null;
};

export const getMyAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AccountSummary> => {
    const { ensureAccount, quotaFor, isAdmin } = await import("./account.server");
    const { decryptJson } = await import("./crypto.server");

    const email = (context.claims.email as string | undefined) ?? "";
    const row = await ensureAccount(context.userId, email);
    const quota = quotaFor(row);

    const { data } = await context.supabase
      .from("profiles")
      .select("*")
      .eq("user_id", context.userId)
      .maybeSingle();

    const profile = data
      ? {
          personal: decryptJson<StoredProfile["personal"] | null>(
            data.encrypted_personal_info,
            null,
          ),
          skills: decryptJson<StoredProfile["skills"]>(data.encrypted_skills, []),
          experience: decryptJson<StoredProfile["experience"]>(data.encrypted_projects, []),
          education: decryptJson<StoredProfile["education"]>(data.encrypted_education, []),
        }
      : null;

    return {
      userId: context.userId,
      email: row.email,
      isAdmin: await isAdmin(context.userId),
      isUnlimited: row.is_unlimited,
      subscriptionExpiresAt: row.subscription_expires_at,
      dailyUsageCount: row.daily_usage_count,
      dailyLimit: quota.limit,
      remaining: quota.unlimited ? null : quota.remaining,
      profile: profile?.personal ? (profile as StoredProfile) : null,
    };
  });

const SaveSchema = z.object({
  personal: z.record(z.string(), z.any()),
  skills: z.array(z.any()),
  experience: z.array(z.any()),
  education: z.array(z.any()),
});

export const saveMyProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => SaveSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { encryptJson } = await import("./crypto.server");
    const { error } = await context.supabase.from("profiles").upsert(
      {
        user_id: context.userId,
        encrypted_personal_info: encryptJson(data.personal),
        encrypted_skills: encryptJson(data.skills),
        encrypted_projects: encryptJson(data.experience),
        encrypted_education: encryptJson(data.education),
      },
      { onConflict: "user_id" },
    );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const clearMyProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { error } = await context.supabase
      .from("profiles")
      .delete()
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getMyTransactions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("transactions")
      .select("id, payment_id, amount, currency, status, validity_start, validity_end, created_at")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });