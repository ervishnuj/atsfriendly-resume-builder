/**
 * Shared (client-safe) AI usage-limit contract. The values here are for display
 * and error handling only — every limit is enforced by the backend/database.
 */
export const DAILY_RESUME_GENERATION_LIMIT = 10;
export const DAILY_ANALYSIS_LIMIT = 30;
export const RESUME_GENERATION_COOLDOWN_SECONDS = 30;
export const ANALYSIS_COOLDOWN_SECONDS = 10;

export type AiLimitCode =
  | "DAILY_RESUME_LIMIT_REACHED"
  | "RESUME_GENERATION_RATE_LIMITED"
  | "DUPLICATE_GENERATION_IN_FLIGHT"
  | "DAILY_ANALYSIS_LIMIT_REACHED"
  | "ANALYSIS_RATE_LIMITED";

export type AiUsageSummary = {
  limit: number;
  used: number;
  remaining: number;
  resetAt: string;
};

/** Encode a structured limit error into a message a server fn can throw. */
export function encodeAiLimitError(code: AiLimitCode, payload: Record<string, unknown>) {
  return `${code}: ${JSON.stringify(payload)}`;
}

export type ParsedAiLimitError = {
  code: AiLimitCode;
  message: string;
  limit?: number;
  used?: number;
  remaining?: number;
  resetAt?: string;
  retryAfterSeconds?: number;
};

const MESSAGES: Record<AiLimitCode, (p: ParsedAiLimitError) => string> = {
  DAILY_RESUME_LIMIT_REACHED: (p) =>
    `You have reached today's AI resume generation limit of ${p.limit ?? DAILY_RESUME_GENERATION_LIMIT}. Your existing plan is still active — please try again tomorrow.`,
  RESUME_GENERATION_RATE_LIMITED: (p) =>
    `Please wait ${p.retryAfterSeconds ?? RESUME_GENERATION_COOLDOWN_SECONDS}s before generating another resume.`,
  DUPLICATE_GENERATION_IN_FLIGHT: () =>
    "This resume is already being generated. Please wait for it to finish.",
  DAILY_ANALYSIS_LIMIT_REACHED: (p) =>
    `You have reached today's AI analysis limit of ${p.limit ?? DAILY_ANALYSIS_LIMIT}. Please try again tomorrow.`,
  ANALYSIS_RATE_LIMITED: (p) =>
    `Please wait ${p.retryAfterSeconds ?? ANALYSIS_COOLDOWN_SECONDS}s before running another AI analysis.`,
};

/** Parse an error thrown by a server function back into a structured limit error. */
export function parseAiLimitError(raw: string): ParsedAiLimitError | null {
  const match = raw.match(
    /(DAILY_RESUME_LIMIT_REACHED|RESUME_GENERATION_RATE_LIMITED|DUPLICATE_GENERATION_IN_FLIGHT|DAILY_ANALYSIS_LIMIT_REACHED|ANALYSIS_RATE_LIMITED):\s*(\{[\s\S]*\})?/,
  );
  if (!match) return null;
  const code = match[1] as AiLimitCode;
  let payload: Record<string, unknown> = {};
  try {
    payload = match[2] ? (JSON.parse(match[2]) as Record<string, unknown>) : {};
  } catch {
    payload = {};
  }
  const parsed: ParsedAiLimitError = { code, message: "", ...payload } as ParsedAiLimitError;
  parsed.message = MESSAGES[code](parsed);
  return parsed;
}

export function newGenerationRequestId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `req-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
