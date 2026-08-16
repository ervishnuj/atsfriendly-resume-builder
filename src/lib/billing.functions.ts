import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type Plan = {
  id: string;
  planName: string;
  planCode: string | null;
  planType: "ONE_TIME" | "PASS";
  price: number;
  currency: string;
  durationDays: number;
  pdfCredits: number;
  features: string[];
  highlight: boolean;
  description: string | null;
};

export type CurrentSubscription =
  | {
      admin: true;
      active: true;
    }
  | {
      admin: false;
      active: true;
      planName: string;
      planType: "ONE_TIME" | "PASS";
      creditsRemaining: number | null;
      price: number;
      currency: string;
      startDate: string;
      endDate: string;
      daysRemaining: number;
    }
  | { admin: false; active: false; message: string };

export type PaymentRow = {
  id: string;
  plan: string;
  amount: number;
  currency: string;
  status: string;
  paymentMethod: string;
  upiReference: string | null;
  date: string;
  adminNote: string | null;
};

export type UpiConfig = {
  upiId: string;
  displayName: string;
  instructions: string | null;
  qrUrl: string | null;
  active: boolean;
} | null;

export const listPlans = createServerFn({ method: "GET" }).handler(async (): Promise<Plan[]> => {
  const { createClient } = await import("@supabase/supabase-js");
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  const url = process.env["SUPABASE_URL"]!;
  const client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
  const { data, error } = await client
    .from("subscription_plans")
    .select("id, plan_name, plan_code, plan_type, price, currency, duration_days, pdf_credits, features, highlight, description")
    .eq("active", true)
    .order("sort_order", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map((p) => ({
    id: p.id as string,
    planName: p.plan_name as string,
    planCode: (p.plan_code as string | null) ?? null,
    planType: (p.plan_type as "ONE_TIME" | "PASS") ?? "PASS",
    price: Number(p.price),
    currency: p.currency as string,
    durationDays: p.duration_days as number,
    pdfCredits: Number(p.pdf_credits ?? 0),
    features: (p.features as string[] | null) ?? [],
    highlight: Boolean(p.highlight),
    description: (p.description as string | null) ?? null,
  }));
});

export const getCurrentSubscription = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<CurrentSubscription> => {
    const { hasPremiumAccess } = await import("./billing.server");
    const access = await hasPremiumAccess(context.userId);
    if (access.isAdmin) return { admin: true, active: true };
    const sub = access.subscription;
    if (!sub) return { admin: false, active: false, message: "Subscription expired" };
    const plan = sub.subscription_plans as unknown as {
      plan_name: string;
      plan_type: string;
      price: number;
      currency: string;
    };
    const ms = new Date(sub.end_date).getTime() - Date.now();
    return {
      admin: false,
      active: true,
      planName: plan.plan_name,
      planType: (plan.plan_type as "ONE_TIME" | "PASS") ?? "PASS",
      creditsRemaining: access.kind === "credit" ? access.creditsRemaining : null,
      price: Number(plan.price),
      currency: plan.currency,
      startDate: sub.start_date,
      endDate: sub.end_date,
      daysRemaining: Math.max(0, Math.ceil(ms / (24 * 60 * 60 * 1000))),
    };
  });

/**
 * Server-authoritative download gate. Passes and the admin account download
 * freely; a one-time Single Resume purchase spends its single PDF credit here.
 */
export const consumeDownloadEntitlement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { consumeDownloadEntitlement: consume } = await import("./billing.server");
    const result = await consume(context.userId);
    if (!result.allowed) {
      throw new Error("SUBSCRIPTION_REQUIRED: Purchase a plan to download your resume PDF.");
    }
    return result;
  });

export const getPaymentHistory = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<PaymentRow[]> => {
    const { data, error } = await context.supabase
      .from("payments")
      .select("id, amount, currency, status, payment_method, upi_reference, created_at, admin_note, subscription_plans(plan_name)")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []).map((p) => ({
      id: p.id as string,
      plan: ((p.subscription_plans as unknown as { plan_name: string } | null)?.plan_name) ?? "—",
      amount: Number(p.amount),
      currency: p.currency as string,
      status: p.status as string,
      paymentMethod: p.payment_method as string,
      upiReference: (p.upi_reference as string | null) ?? null,
      date: p.created_at as string,
      adminNote: (p.admin_note as string | null) ?? null,
    }));
  });

export const getUpiConfig = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<UpiConfig> => {
    const { data } = await context.supabase
      .from("upi_configuration")
      .select("upi_id, display_name, instructions, qr_image_path, active")
      .eq("active", true)
      .maybeSingle();
    if (!data) return null;
    let qrUrl: string | null = null;
    if (data.qr_image_path) {
      // Bucket reads are admin-only; sign the URL server-side after auth.
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: signed } = await supabaseAdmin.storage
        .from("upi-qr")
        .createSignedUrl(data.qr_image_path, 60 * 60);
      qrUrl = signed?.signedUrl ?? null;
    }
    return {
      upiId: data.upi_id,
      displayName: data.display_name,
      instructions: data.instructions,
      qrUrl,
      active: data.active,
    };
  });

export const submitUpiPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        planId: z.string().uuid(),
        upiReference: z.string().trim().min(6).max(64),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    // Admin has unlimited free access — never create a payment for it.
    const { checkAdmin } = await import("./billing.server");
    const { isAdmin } = await checkAdmin(context.userId);
    if (isAdmin) throw new Error("Admin account has unlimited free access. No payment required.");

    // Amount always comes from the database, never from the client
    const { data: plan, error: planError } = await context.supabase
      .from("subscription_plans")
      .select("id, price, currency, active")
      .eq("id", data.planId)
      .maybeSingle();
    if (planError) throw new Error(planError.message);
    if (!plan || !plan.active) throw new Error("Selected plan is not available.");

    const { data: dupe } = await context.supabase
      .from("payments")
      .select("id")
      .ilike("upi_reference", data.upiReference)
      .maybeSingle();
    if (dupe) throw new Error("This UPI reference has already been submitted.");

    const { data: inserted, error } = await context.supabase
      .from("payments")
      .insert({
        user_id: context.userId,
        plan_id: plan.id,
        provider: "manual_upi",
        payment_method: "UPI",
        amount: plan.price,
        currency: plan.currency,
        upi_reference: data.upiReference,
        status: "PENDING",
      })
      .select("id")
      .single();
    if (error) {
      if (error.code === "23505") throw new Error("This UPI reference has already been submitted.");
      throw new Error(error.message);
    }
    return { paymentId: inserted.id as string, status: "PENDING" as const };
  });

export const amIAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { checkAdmin } = await import("./billing.server");
    const { isAdmin, email } = await checkAdmin(context.userId);
    return { isAdmin, email };
  });

export const adminListPayments = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        status: z.enum(["ALL", "CREATED", "PENDING", "SUCCESS", "FAILED", "REFUNDED"]).default("ALL"),
        planName: z.string().default("ALL"),
      })
      .parse(input ?? {}),
  )
  .handler(async ({ data, context }) => {
    const { requireAdmin } = await import("./billing.server");
    await requireAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    let query = supabaseAdmin
      .from("payments")
      .select("id, user_id, amount, currency, status, payment_method, upi_reference, gateway_order_id, gateway_payment_id, created_at, admin_note, subscription_plans(plan_name)")
      .order("created_at", { ascending: false })
      .limit(500);
    if (data.status !== "ALL") query = query.eq("status", data.status);
    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);

    const { data: users } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const emails = new Map((users?.users ?? []).map((u) => [u.id, u.email ?? ""]));

    const payments = (rows ?? [])
      .map((p) => ({
        id: p.id as string,
        userId: p.user_id as string,
        email: emails.get(p.user_id as string) ?? "—",
        plan: ((p.subscription_plans as unknown as { plan_name: string } | null)?.plan_name) ?? "—",
        amount: Number(p.amount),
        currency: p.currency as string,
        status: p.status as string,
        paymentMethod: p.payment_method as string,
        reference: (p.upi_reference as string | null) ?? (p.gateway_payment_id as string | null),
        orderId: (p.gateway_order_id as string | null) ?? null,
        date: p.created_at as string,
        adminNote: (p.admin_note as string | null) ?? null,
      }))
      .filter((p) => data.planName === "ALL" || p.plan === data.planName);

    const { count: activeSubs } = await supabaseAdmin
      .from("subscriptions")
      .select("id", { count: "exact", head: true })
      .eq("status", "ACTIVE")
      .gt("end_date", new Date().toISOString());
    const { count: expiredSubs } = await supabaseAdmin
      .from("subscriptions")
      .select("id", { count: "exact", head: true })
      .or(`status.eq.EXPIRED,end_date.lt.${new Date().toISOString()}`);
    const { data: allPayments } = await supabaseAdmin.from("payments").select("amount, status");

    const stats = {
      totalRevenue: (allPayments ?? [])
        .filter((p) => p.status === "SUCCESS")
        .reduce((sum, p) => sum + Number(p.amount), 0),
      success: (allPayments ?? []).filter((p) => p.status === "SUCCESS").length,
      pending: (allPayments ?? []).filter((p) => p.status === "PENDING" || p.status === "CREATED").length,
      failed: (allPayments ?? []).filter((p) => p.status === "FAILED").length,
      refunded: (allPayments ?? []).filter((p) => p.status === "REFUNDED").length,
      activeSubscriptions: activeSubs ?? 0,
      expiredSubscriptions: expiredSubs ?? 0,
    };

    return { payments, stats };
  });

export const adminUpdatePayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        paymentId: z.string().uuid(),
        status: z.enum(["SUCCESS", "FAILED", "REFUNDED", "PENDING"]),
        note: z.string().max(500).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { requireAdmin, activatePaymentSubscription } = await import("./billing.server");
    await requireAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    if (data.status === "SUCCESS") {
      await activatePaymentSubscription(data.paymentId, data.note);
      return { ok: true };
    }
    const { error } = await supabaseAdmin
      .from("payments")
      .update({ status: data.status, admin_note: data.note ?? null })
      .eq("id", data.paymentId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminGetUpiConfig = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { requireAdmin } = await import("./billing.server");
    await requireAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("upi_configuration")
      .select("id, upi_id, display_name, instructions, qr_image_path, active")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!data) return null;
    let qrUrl: string | null = null;
    if (data.qr_image_path) {
      const { data: signed } = await supabaseAdmin.storage
        .from("upi-qr")
        .createSignedUrl(data.qr_image_path, 60 * 60);
      qrUrl = signed?.signedUrl ?? null;
    }
    return { ...data, qrUrl };
  });

export const adminSaveUpiConfig = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: z.string().uuid().nullable().optional(),
        upiId: z.string().trim().min(3).max(120),
        displayName: z.string().trim().max(120).default(""),
        instructions: z.string().max(2000).default(""),
        qrImagePath: z.string().max(300).nullable().optional(),
        active: z.boolean().default(true),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { requireAdmin } = await import("./billing.server");
    await requireAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const payload = {
      upi_id: data.upiId,
      display_name: data.displayName,
      instructions: data.instructions,
      qr_image_path: data.qrImagePath ?? null,
      active: data.active,
    };

    if (data.active) {
      // only one active config at a time
      let deactivate = supabaseAdmin.from("upi_configuration").update({ active: false }).eq("active", true);
      if (data.id) deactivate = deactivate.neq("id", data.id);
      await deactivate;
    }

    if (data.id) {
      const { error } = await supabaseAdmin.from("upi_configuration").update(payload).eq("id", data.id);
      if (error) throw new Error(error.message);
      return { id: data.id };
    }
    const { data: inserted, error } = await supabaseAdmin
      .from("upi_configuration")
      .insert(payload)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: inserted.id as string };
  });

export const adminUploadQr = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        fileName: z.string().min(1).max(200),
        contentType: z.string().min(3).max(100),
        dataBase64: z.string().min(10).max(4_000_000),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { requireAdmin } = await import("./billing.server");
    await requireAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const ext = data.fileName.split(".").pop()?.toLowerCase() ?? "png";
    const path = `qr/${Date.now()}.${ext.replace(/[^a-z0-9]/g, "")}`;
    const bytes = Uint8Array.from(atob(data.dataBase64), (c) => c.charCodeAt(0));
    const { error } = await supabaseAdmin.storage.from("upi-qr").upload(path, bytes, {
      contentType: data.contentType,
      upsert: true,
    });
    if (error) throw new Error(error.message);
    return { path };
  });