import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const IST_OFFSET_MS = 330 * 60 * 1000;

/** Start of the selected period in Asia/Kolkata, returned as a UTC ISO string. */
export function periodStart(period: "day" | "month", now = new Date()): string {
  const ist = new Date(now.getTime() + IST_OFFSET_MS);
  const y = ist.getUTCFullYear();
  const m = ist.getUTCMonth();
  const d = period === "day" ? ist.getUTCDate() : 1;
  return new Date(Date.UTC(y, m, d) - IST_OFFSET_MS).toISOString();
}

async function adminClient(userId: string) {
  const { requireAdmin } = await import("./billing.server");
  await requireAdmin(userId);
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

export type MonitoringStats = {
  since: string;
  registeredUsers: number;
  newUsers: number;
  activeUsers: number;
  resumeSuccess: number;
  resumeFailed: number;
  analysisSuccess: number;
  analysisFailed: number;
  uploadFailures: number;
  aiErrors: number;
  paymentFailures: number;
  paymentsSucceeded: number;
  activePartners: number;
  partnerCreditsUsed: number;
  funnel: {
    homepageViews: number;
    checkerStarted: number;
    checkerCompleted: number;
    signups: number;
    payingCustomers: number;
  };
};

export const adminGetMonitoring = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ period: z.enum(["day", "month"]) }).parse(input))
  .handler(async ({ data, context }): Promise<MonitoringStats> => {
    const db = await adminClient(context.userId);
    const since = periodStart(data.period);
    const count = async (q: PromiseLike<{ count: number | null; error: unknown }>) => {
      const { count: c, error } = await q;
      if (error) throw new Error("Could not load monitoring data.");
      return c ?? 0;
    };
    const ai = (kind: string, status: string) =>
      count(db.from("ai_generation_requests").select("id", { count: "exact", head: true })
        .eq("kind", kind).eq("status", status).gte("created_at", since));
    const ev = (event: string) =>
      count(db.from("analytics_events").select("id", { count: "exact", head: true })
        .eq("event", event).gte("created_at", since));

    const [registeredUsers, newUsers, resumeSuccess, resumeFailed, analysisSuccess, analysisFailed,
      uploadFailures, aiErrors, paymentFailures, activePartners, homepageViews, checkerStarted,
      checkerCompleted, signups] = await Promise.all([
      count(db.from("app_users").select("id", { count: "exact", head: true })),
      count(db.from("app_users").select("id", { count: "exact", head: true }).gte("created_at", since)),
      ai("RESUME", "SUCCESS"), ai("RESUME", "FAILED"), ai("ANALYSIS", "SUCCESS"), ai("ANALYSIS", "FAILED"),
      ev("RESUME_UPLOAD_FAILED"),
      count(db.from("app_error_log").select("id", { count: "exact", head: true })
        .eq("category", "AI_GENERATION_FAILED").gte("created_at", since)),
      count(db.from("payments").select("id", { count: "exact", head: true })
        .eq("status", "FAILED").gte("created_at", since)),
      count(db.from("partners").select("id", { count: "exact", head: true }).eq("status", "active")),
      ev("HOMEPAGE_VIEWED"), ev("CHECKER_STARTED"), ev("ATS_CHECK_COMPLETED"), ev("SIGNUP_COMPLETED"),
    ]);

    const [{ data: activeRows }, { data: paidRows }, { data: creditRows }] = await Promise.all([
      db.from("ai_generation_requests").select("user_id").gte("created_at", since).limit(10000),
      db.from("payments").select("user_id").eq("status", "SUCCESS").gte("created_at", since).limit(10000),
      db.from("partner_credit_transactions").select("credits").eq("kind", "consumption").gte("created_at", since).limit(10000),
    ]);
    const paying = new Set((paidRows ?? []).map((r) => r.user_id).filter(Boolean));
    return {
      since,
      registeredUsers,
      newUsers,
      activeUsers: new Set((activeRows ?? []).map((r) => r.user_id)).size,
      resumeSuccess, resumeFailed, analysisSuccess, analysisFailed,
      uploadFailures, aiErrors, paymentFailures,
      paymentsSucceeded: paidRows?.length ?? 0,
      activePartners,
      partnerCreditsUsed: (creditRows ?? []).reduce((sum, r) => sum + Math.abs(Number(r.credits) || 0), 0),
      funnel: { homepageViews, checkerStarted, checkerCompleted, signups, payingCustomers: paying.size },
    };
  });

export const adminListErrors = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = await adminClient(context.userId);
    const { data, error } = await db.from("app_error_log")
      .select("id, category, service, code, request_id, status, created_at")
      .order("created_at", { ascending: false }).limit(100);
    if (error) throw new Error("Could not load the error log.");
    return data ?? [];
  });

export const adminSetErrorStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ id: z.string().uuid(), status: z.enum(["OPEN", "RESOLVED"]) }).parse(input))
  .handler(async ({ data, context }) => {
    const db = await adminClient(context.userId);
    const { error } = await db.from("app_error_log").update({ status: data.status }).eq("id", data.id);
    if (error) throw new Error("Could not update this error.");
    return { ok: true as const };
  });

export const adminListSupport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ status: z.enum(["ALL", "OPEN", "IN_PROGRESS", "RESOLVED"]).default("OPEN") }).parse(input ?? {}))
  .handler(async ({ data, context }) => {
    const db = await adminClient(context.userId);
    let q = db.from("contact_messages")
      .select("id, name, email, category, subject, message, status, admin_note, created_at")
      .order("created_at", { ascending: false }).limit(200);
    if (data.status !== "ALL") q = q.eq("status", data.status);
    const { data: rows, error } = await q;
    if (error) throw new Error("Could not load support messages.");
    return rows ?? [];
  });

export const adminUpdateSupport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({
      id: z.string().uuid(),
      status: z.enum(["OPEN", "IN_PROGRESS", "RESOLVED"]),
      adminNote: z.string().trim().max(2000).optional(),
    }).parse(input))
  .handler(async ({ data, context }) => {
    const db = await adminClient(context.userId);
    const { error } = await db.from("contact_messages")
      .update({ status: data.status, admin_note: data.adminNote ?? null, updated_at: new Date().toISOString() })
      .eq("id", data.id);
    if (error) throw new Error("Could not update this message.");
    return { ok: true as const };
  });
