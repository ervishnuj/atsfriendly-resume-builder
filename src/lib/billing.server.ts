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
  if (!check.isAdmin) throw new Error("FORBIDDEN: admin access required");
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

export async function getActiveSubscription(userId: string) {
  await expireStaleSubscriptions(userId);
  const { data } = await supabaseAdmin
    .from("subscriptions")
    .select(
      "id, plan_id, payment_id, start_date, end_date, status, subscription_plans(plan_name, price, currency, duration_days)",
    )
    .eq("user_id", userId)
    .eq("status", "ACTIVE")
    .gt("end_date", new Date().toISOString())
    .order("end_date", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data ?? null;
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
    .select("id, plan_name, price, duration_days")
    .eq("id", payment.plan_id)
    .maybeSingle();
  if (!plan) throw new Error("Plan not found");

  if (Number(payment.amount) !== Number(plan.price)) {
    throw new Error("Payment amount does not match the plan price");
  }

  const current = await getActiveSubscription(payment.user_id);
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