import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const ADMIN_EMAIL = "ervishnuj@gmail.com";

export type AdminCheck = { isAdmin: boolean; email: string | null };

/** Server-side admin authorization. Never trust the client for this. */
export async function checkAdmin(userId: string): Promise<AdminCheck> {
  const { data } = await supabaseAdmin.auth.admin.getUserById(userId);
  const email = data.user?.email?.toLowerCase() ?? null;
  if (email === ADMIN_EMAIL) return { isAdmin: true, email };
  const { data: roles } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin");
  return { isAdmin: (roles?.length ?? 0) > 0, email };
}

export async function requireAdmin(userId: string) {
  const check = await checkAdmin(userId);
  if (!check.isAdmin) {
    throw new Response("Forbidden", { status: 403 });
  }
  return check;
}

/** Flip any past-due ACTIVE subscriptions to EXPIRED. */
export async function expireStaleSubscriptions(userId?: string) {
  let q = supabaseAdmin
    .from("subscriptions")
    .update({ status: "EXPIRED" })
    .eq("status", "ACTIVE")
    .lt("end_date", new Date().toISOString());
  if (userId) q = q.eq("user_id", userId);
  await q;
}

const SUBSCRIPTION_SELECT =
  "id, plan_id, payment_id, start_date, end_date, status, credits_total, credits_used, subscription_plans(plan_name, plan_code, plan_type, price, currency, duration_days, pdf_credits)";

type PlanJoin = {
  plan_name: string;
  plan_code: string | null;
  plan_type: string;
  price: number;
  currency: string;
  duration_days: number;
  pdf_credits: number;
};

/**
 * Self-healing entitlement reconciliation.
 *
 * A payment that the backend has verified (status SUCCESS) must always have
 * exactly one matching entitlement row. If activation previously failed
 * mid-way (or a payment was flipped to SUCCESS outside the activation path),
 * the user is left paid-but-blocked. This repairs that, idempotently: the
 * unique index on subscriptions.payment_id guarantees one payment can never
 * produce two entitlements.
 */
export async function reconcileVerifiedPayments(userId: string) {
  const { data: paid } = await supabaseAdmin
    .from("payments")
    .select("id")
    .eq("user_id", userId)
    .eq("status", "SUCCESS");
  if (!paid?.length) return;

  const { data: subs } = await supabaseAdmin
    .from("subscriptions")
    .select("payment_id")
    .eq("user_id", userId)
    .not("payment_id", "is", null);
  const activated = new Set((subs ?? []).map((s) => s.payment_id as string));

  for (const payment of paid) {
    if (activated.has(payment.id)) continue;
    try {
      await activatePaymentSubscription(payment.id);
    } catch (err) {
      console.error("[billing] reconcile failed for payment", payment.id, err);
    }
  }
}

async function listActiveSubscriptions(userId: string) {
  await reconcileVerifiedPayments(userId);
  await expireStaleSubscriptions(userId);
  const { data } = await supabaseAdmin
    .from("subscriptions")
    .select(SUBSCRIPTION_SELECT)
    .eq("user_id", userId)
    .eq("status", "ACTIVE")
    .gt("end_date", new Date().toISOString())
    .order("end_date", { ascending: false });
  return data ?? [];
}

function isPass(row: { subscription_plans: unknown; credits_total: number }) {
  const plan = row.subscription_plans as unknown as PlanJoin | null;
  return (plan?.plan_type ?? "PASS") === "PASS" && row.credits_total === 0;
}

/** Longest-running time-based pass (7-day / 30-day), or null. */
export async function getActivePass(userId: string) {
  const rows = await listActiveSubscriptions(userId);
  return rows.find(isPass) ?? null;
}

/** Unconsumed one-time PDF credit purchase, or null. */
export async function getCreditSubscription(userId: string) {
  const rows = await listActiveSubscriptions(userId);
  return (
    rows.find((r) => r.credits_total > 0 && r.credits_used < r.credits_total) ?? null
  );
}

/** Backwards-compatible: any active entitlement, passes first. */
export async function getActiveSubscription(userId: string) {
  const rows = await listActiveSubscriptions(userId);
  return rows.find(isPass) ?? rows.find((r) => r.credits_used < r.credits_total) ?? null;
}

export type PremiumAccess = {
  allowed: boolean;
  isAdmin: boolean;
  /** "admin" = unlimited, "pass" = time-based plan, "credit" = one-time PDF purchase */
  kind: "admin" | "pass" | "credit" | "none";
  creditsRemaining: number | null;
  subscription: Awaited<ReturnType<typeof getActiveSubscription>>;
};

/**
 * Centralized entitlement check. The admin account has unlimited free access;
 * every other account needs an active subscription. Identity always comes from
 * the verified JWT (userId), never from client-supplied data.
 */
export async function hasPremiumAccess(userId: string): Promise<PremiumAccess> {
  const { isAdmin } = await checkAdmin(userId);
  if (isAdmin)
    return { allowed: true, isAdmin: true, kind: "admin", creditsRemaining: null, subscription: null };
  const rows = await listActiveSubscriptions(userId);
  const pass = rows.find(isPass) ?? null;
  if (pass)
    return { allowed: true, isAdmin: false, kind: "pass", creditsRemaining: null, subscription: pass };
  const credit = rows.find((r) => r.credits_total > 0 && r.credits_used < r.credits_total) ?? null;
  if (credit)
    return {
      allowed: true,
      isAdmin: false,
      kind: "credit",
      creditsRemaining: credit.credits_total - credit.credits_used,
      subscription: credit,
    };
  return { allowed: false, isAdmin: false, kind: "none", creditsRemaining: 0, subscription: null };
}

/**
 * Consume one PDF credit for a one-time purchase. Admins and pass holders
 * download without consuming anything. Returns whether the download is allowed.
 */
export async function consumeDownloadEntitlement(userId: string) {
  const access = await hasPremiumAccess(userId);
  if (access.kind === "admin" || access.kind === "pass") {
    return { allowed: true, unlimited: true, creditsRemaining: null as number | null };
  }
  if (access.kind !== "credit") return { allowed: false, unlimited: false, creditsRemaining: 0 };
  const { data, error } = await supabaseAdmin.rpc("consume_pdf_credit", { _user_id: userId });
  if (error) throw new Error(error.message);
  if (!data) return { allowed: false, unlimited: false, creditsRemaining: 0 };
  return {
    allowed: true,
    unlimited: false,
    creditsRemaining: Math.max(0, (access.creditsRemaining ?? 1) - 1),
  };
}

/** Idempotently mark a payment SUCCESS and activate/extend the subscription. */
export async function activatePaymentSubscription(paymentId: string, adminNote?: string) {
  const { data: payment, error } = await supabaseAdmin
    .from("payments")
    .select("id, user_id, plan_id, amount, status")
    .eq("id", paymentId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!payment) throw new Error("Payment not found");

  const { data: existing } = await supabaseAdmin
    .from("subscriptions")
    .select("id")
    .eq("payment_id", paymentId)
    .maybeSingle();
  if (existing) return existing;

  const { data: plan } = await supabaseAdmin
    .from("subscription_plans")
    .select("id, plan_name, price, duration_days, plan_type, pdf_credits")
    .eq("id", payment.plan_id)
    .maybeSingle();
  if (!plan) throw new Error("Plan not found");

  if (Number(payment.amount) !== Number(plan.price)) {
    throw new Error("Payment amount does not match the plan price");
  }

  const isOneTime = plan.plan_type === "ONE_TIME" || (plan.pdf_credits ?? 0) > 0;
  // One-time purchases always start now; passes stack on top of an active pass.
  const current = isOneTime ? null : await getActivePass(payment.user_id);
  const start = current ? new Date(current.end_date) : new Date();
  const end = new Date(start.getTime() + plan.duration_days * 24 * 60 * 60 * 1000);

  const { data: sub, error: subError } = await supabaseAdmin
    .from("subscriptions")
    .insert({
      user_id: payment.user_id,
      plan_id: plan.id,
      payment_id: payment.id,
      start_date: start.toISOString(),
      end_date: end.toISOString(),
      credits_total: isOneTime ? (plan.pdf_credits ?? 1) : 0,
      credits_used: 0,
      status: "ACTIVE",
    })
    .select("id")
    .single();
  if (subError) throw new Error(subError.message);

  await supabaseAdmin
    .from("payments")
    .update({
      status: "SUCCESS",
      verified_at: new Date().toISOString(),
      admin_note: adminNote ?? null,
    })
    .eq("id", payment.id);

  return sub;
}