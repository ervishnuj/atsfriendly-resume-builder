import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { getPartnerForUser } from "./partners.server";
import { encodeAiLimitError, type AiUsageSummary } from "./ai-limits";

export async function resolveGenerationPartner(userId: string) {
  // Only verified account emails can claim an unlinked partner account.
  const { data, error } = await supabaseAdmin.auth.admin.getUserById(userId);
  if (error || !data.user) throw new Error("Unable to verify your account. Please try again.");
  const email = data.user.email_confirmed_at ? data.user.email ?? null : null;
  const partner = await getPartnerForUser(userId, email);
  if (partner && partner.status !== "active") throw new Error("PARTNER_INACTIVE: This partner account is not active. Contact the administrator.");
  return partner;
}

export function partnerGenerationError(code: string, payload: Record<string, unknown> = {}) {
  if (code === "DAILY_LIMIT_REACHED") return new Error(encodeAiLimitError("DAILY_RESUME_LIMIT_REACHED", payload));
  if (code === "RATE_LIMITED") return new Error(encodeAiLimitError("RESUME_GENERATION_RATE_LIMITED", payload));
  if (code === "DUPLICATE_IN_FLIGHT") return new Error(encodeAiLimitError("DUPLICATE_GENERATION_IN_FLIGHT", payload));
  const messages: Record<string, string> = {
    NO_CREDITS: "PARTNER_NO_CREDITS: No partner credits are available. Buy credits and wait for payment verification before generating another resume.",
    PRICE_NOT_SET: "PARTNER_PRICE_NOT_SET: Set your customer selling price on the Partner Dashboard before generating a resume.",
    PARTNER_INACTIVE: "PARTNER_INACTIVE: This partner account is not active. Contact the administrator.",
    RESERVATION_EXPIRED: "This generation reservation expired. No partner credit was deducted. Start a new generation.",
  };
  return new Error(messages[code] ?? "Unable to confirm partner credits. Please try again.");
}

type PartnerUsage = AiUsageSummary & { balance: number };
export async function getPartnerGenerationUsage(partnerId: string): Promise<PartnerUsage> {
  const { data, error } = await supabaseAdmin.rpc("get_partner_usage", { _partner_id: partnerId });
  if (error) throw new Error("Unable to read partner credits. Please try again.");
  const row = data as { used?: number; limit?: number; balance?: number } | null;
  const limit = Number(row?.limit ?? 30);
  const used = Number(row?.used ?? 0);
  // The standard usage reader supplies the same IST reset time to the UI.
  const { data: partner } = await supabaseAdmin.from("partners").select("user_id").eq("id", partnerId).single();
  const { data: usage } = await supabaseAdmin.rpc("get_ai_usage", { _user_id: partner?.user_id ?? "", _kind: "RESUME" });
  return { limit, used, remaining: Math.max(0, limit - used), balance: Number(row?.balance ?? 0), resetAt: (usage as { resetAt?: string } | null)?.resetAt ?? "" };
}

/** Reserve availability, then atomically charge + cache only a successful result. */
export async function runPartnerGeneration<T>(userId: string, partnerId: string, requestId: string, generate: () => Promise<T>) {
  const args = { _user_id: userId, _partner_id: partnerId, _request_id: requestId };
  const { data, error } = await supabaseAdmin.rpc("start_partner_resume_generation", args);
  if (error) throw new Error("Unable to reserve partner credits. No generation was started.");
  const reservation = data as { allowed: boolean; code: string; result?: T; [key: string]: unknown };
  if (!reservation.allowed) {
    if (reservation.code === "DUPLICATE_RESULT" && reservation.result) {
      return { resume: reservation.result, usage: await getPartnerGenerationUsage(partnerId), partnerCreditCharged: false };
    }
    throw partnerGenerationError(reservation.code, reservation);
  }
  let completed = false;
  try {
    const resume = await generate();
    const { data: result, error: finishError } = await supabaseAdmin.rpc("finish_partner_resume_generation", {
      ...args, _success: true, _result: resume as never,
    });
    if (finishError) throw new Error("Unable to confirm generation completion. Retry this request to check its status; it will not be charged twice.");
    const finish = result as { ok: boolean; code: string; [key: string]: unknown };
    if (!finish.ok) throw partnerGenerationError(finish.code, finish);
    completed = true;
    return { resume, usage: await getPartnerGenerationUsage(partnerId), partnerCreditCharged: finish.code !== "DUPLICATE" };
  } catch (error) {
    if (completed) throw error; // Never undo an already stored, charged result.
    const { error: releaseError } = await supabaseAdmin.rpc("finish_partner_resume_generation", { ...args, _success: false, _result: null });
    if (releaseError) throw new Error("Generation could not be completed. Your unused reservation clears within five minutes; retry the same request to check its status.");
    // Preserve the upstream safe failure/refusal message, including empty-output errors.
    throw error;
  }
}