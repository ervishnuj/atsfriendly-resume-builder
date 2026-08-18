import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  ANALYSIS_COOLDOWN_SECONDS,
  DAILY_ANALYSIS_LIMIT,
  DAILY_RESUME_GENERATION_LIMIT,
  RESUME_GENERATION_COOLDOWN_SECONDS,
  encodeAiLimitError,
  type AiUsageSummary,
} from "./ai-limits";

export type AiKind = "RESUME" | "ANALYSIS";

const CONFIG: Record<AiKind, { limit: number; cooldown: number }> = {
  RESUME: { limit: DAILY_RESUME_GENERATION_LIMIT, cooldown: RESUME_GENERATION_COOLDOWN_SECONDS },
  ANALYSIS: { limit: DAILY_ANALYSIS_LIMIT, cooldown: ANALYSIS_COOLDOWN_SECONDS },
};

/**
 * Admins are NOT exempt from Gemini protection by default — the API key must be
 * protected even from the owner account. Set ADMIN_BYPASS_AI_LIMIT=true to opt out.
 */
export function adminBypassEnabled() {
  return String(process.env.ADMIN_BYPASS_AI_LIMIT ?? "").toLowerCase() === "true";
}

type StartResult = {
  allowed: boolean;
  code: string;
  limit?: number;
  used?: number;
  remaining?: number;
  resetAt?: string;
  retryAfterSeconds?: number;
  result?: unknown;
};

/**
 * Atomically reserve one AI slot for this user/day BEFORE calling Gemini.
 * Throws a structured limit error when the request must be blocked, and returns
 * a cached result when the same request id was already fulfilled (idempotency).
 */
export async function reserveAiGeneration(
  userId: string,
  requestId: string,
  kind: AiKind,
): Promise<{ cached?: unknown; usage: AiUsageSummary }> {
  const { limit, cooldown } = CONFIG[kind];
  const { data, error } = await supabaseAdmin.rpc("start_ai_generation", {
    _user_id: userId,
    _request_id: requestId,
    _kind: kind,
    _limit: limit,
    _cooldown_seconds: cooldown,
  });
  if (error) throw new Error(error.message);
  const res = data as unknown as StartResult;

  if (res.allowed) {
    return {
      usage: {
        limit,
        used: res.used ?? 0,
        remaining: res.remaining ?? 0,
        resetAt: res.resetAt ?? "",
      },
    };
  }

  if (res.code === "DUPLICATE_RESULT") {
    return {
      cached: res.result,
      usage: { limit, used: res.used ?? 0, remaining: res.remaining ?? 0, resetAt: res.resetAt ?? "" },
    };
  }

  const payload = {
    limit,
    used: res.used ?? limit,
    remaining: res.remaining ?? 0,
    resetAt: res.resetAt,
    retryAfterSeconds: res.retryAfterSeconds,
  };
  if (res.code === "DAILY_LIMIT_REACHED") {
    throw new Error(
      encodeAiLimitError(
        kind === "RESUME" ? "DAILY_RESUME_LIMIT_REACHED" : "DAILY_ANALYSIS_LIMIT_REACHED",
        payload,
      ),
    );
  }
  if (res.code === "RATE_LIMITED") {
    throw new Error(
      encodeAiLimitError(
        kind === "RESUME" ? "RESUME_GENERATION_RATE_LIMITED" : "ANALYSIS_RATE_LIMITED",
        payload,
      ),
    );
  }
  throw new Error(encodeAiLimitError("DUPLICATE_GENERATION_IN_FLIGHT", payload));
}

/** Only a successful generation keeps its reserved slot; failures release it. */
export async function finishAiGeneration(
  userId: string,
  requestId: string,
  success: boolean,
  result?: unknown,
) {
  await supabaseAdmin.rpc("finish_ai_generation", {
    _user_id: userId,
    _request_id: requestId,
    _success: success,
    _result: success ? (result as never) : null,
  });
}

export async function getAiUsage(userId: string, kind: AiKind): Promise<AiUsageSummary> {
  const { limit } = CONFIG[kind];
  const { data } = await supabaseAdmin.rpc("get_ai_usage", { _user_id: userId, _kind: kind });
  const row = (data ?? {}) as { used?: number; resetAt?: string };
  const used = Number(row.used ?? 0);
  return { limit, used, remaining: Math.max(0, limit - used), resetAt: row.resetAt ?? "" };
}
