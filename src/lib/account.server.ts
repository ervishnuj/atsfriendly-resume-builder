import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const SUPER_ADMIN_EMAIL = "ervishnuj@gmail.com";
export const FREE_DAILY_LIMIT = 3;

export type AccountRow = {
  id: string;
  email: string;
  is_unlimited: boolean;
  subscription_expires_at: string | null;
  daily_usage_count: number;
  last_reset_date: string;
};

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Creates the account row on first sign-in, resets the daily counter, and grants roles. */
export async function ensureAccount(userId: string, email: string): Promise<AccountRow> {
  const isSuperAdmin = email.toLowerCase() === SUPER_ADMIN_EMAIL;

  const { data: existing } = await supabaseAdmin
    .from("app_users")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  let row = existing as AccountRow | null;

  if (!row) {
    const { data, error } = await supabaseAdmin
      .from("app_users")
      .insert({ id: userId, email, is_unlimited: isSuperAdmin })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    row = data as AccountRow;
  } else if (row.last_reset_date !== today()) {
    const { data, error } = await supabaseAdmin
      .from("app_users")
      .update({ daily_usage_count: 0, last_reset_date: today(), email })
      .eq("id", userId)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    row = data as AccountRow;
  }

  await supabaseAdmin
    .from("user_roles")
    .upsert(
      { user_id: userId, role: isSuperAdmin ? "admin" : "user" },
      { onConflict: "user_id,role", ignoreDuplicates: true },
    );

  if (isSuperAdmin && !row!.is_unlimited) {
    await supabaseAdmin.from("app_users").update({ is_unlimited: true }).eq("id", userId);
    row!.is_unlimited = true;
  }

  return row!;
}

export async function isAdmin(userId: string): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  return !!data;
}

export function hasActiveSubscription(row: AccountRow): boolean {
  if (row.is_unlimited) return true;
  if (!row.subscription_expires_at) return false;
  return new Date(row.subscription_expires_at).getTime() > Date.now();
}

export type Quota = {
  unlimited: boolean;
  used: number;
  limit: number;
  remaining: number;
};

export function quotaFor(row: AccountRow): Quota {
  const unlimited = hasActiveSubscription(row);
  return {
    unlimited,
    used: row.daily_usage_count,
    limit: FREE_DAILY_LIMIT,
    remaining: unlimited ? Infinity : Math.max(0, FREE_DAILY_LIMIT - row.daily_usage_count),
  };
}

/** Throws when the free daily allowance is exhausted; otherwise records one usage. */
export async function consumeQuota(row: AccountRow): Promise<void> {
  if (hasActiveSubscription(row)) return;
  if (row.daily_usage_count >= FREE_DAILY_LIMIT) {
    throw new Error(
      `Daily free limit reached (${FREE_DAILY_LIMIT}/day). Upgrade your plan to keep generating resumes today.`,
    );
  }
  await supabaseAdmin
    .from("app_users")
    .update({ daily_usage_count: row.daily_usage_count + 1 })
    .eq("id", row.id);
}