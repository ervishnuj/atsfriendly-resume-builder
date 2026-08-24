import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { ProfileSchema, ResumeInputSchema } from "./resume-schemas";
import type {
  OptimizedResume,
  AtsAnalysis,
  SkillGapAnalysis,
  CoverLetterResult,
  InterviewPrep,
  LinkedInOptimization,
} from "./resume-schemas";
import type { AiUsageSummary } from "./ai-limits";

export type {
  OptimizedResume,
  AtsAnalysis,
  SkillGapAnalysis,
  CoverLetterResult,
  InterviewPrep,
  LinkedInOptimization,
} from "./resume-schemas";

const GuardedInputSchema = ResumeInputSchema.extend({
  requestId: z.string().min(8).max(120),
});

export type GeneratedResumeResponse = {
  resume: OptimizedResume;
  usage: AiUsageSummary;
};

/**
 * Resume generation. Order matters: identity (JWT) -> entitlement -> daily AI
 * limit / rate limit / idempotency -> Gemini. Gemini is never called once a
 * limit is hit, and a failed Gemini call releases the reserved slot.
 */
export const generateResume = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => GuardedInputSchema.parse(input))
  .handler(async ({ data, context }): Promise<GeneratedResumeResponse> => {
    const { hasPremiumAccess } = await import("./billing.server");
    const access = await hasPremiumAccess(context.userId);
    if (!access.allowed) {
      throw new Error("SUBSCRIPTION_REQUIRED: Please choose a subscription plan to continue.");
    }

    const { reserveAiGeneration, finishAiGeneration, getAiUsage, adminBypassEnabled } =
      await import("./ai-usage.server");

    if (access.isAdmin && adminBypassEnabled()) {
      const { generateOptimizedResume } = await import("./resume-ai.server");
      const resume = await generateOptimizedResume(data.profile, data.jobDescription);
      return { resume, usage: await getAiUsage(context.userId, "RESUME") };
    }

    const reservation = await reserveAiGeneration(context.userId, data.requestId, "RESUME");
    if (reservation.cached) {
      return { resume: reservation.cached as OptimizedResume, usage: reservation.usage };
    }

    try {
      const { generateOptimizedResume } = await import("./resume-ai.server");
      const resume = await generateOptimizedResume(data.profile, data.jobDescription);
      await finishAiGeneration(context.userId, data.requestId, true, resume);
      return { resume, usage: reservation.usage };
    } catch (err) {
      // Gemini failure (429/timeout/malformed) must not consume a generation.
      await finishAiGeneration(context.userId, data.requestId, false);
      throw err;
    }
  });

/**
 * ATS score is available to any authenticated user — no subscription gate and
 * no PDF/free entitlement is consumed. It is still protected by the lightweight
 * ANALYSIS limit (daily cap + cooldown + idempotency) so Gemini can't be spammed.
 */
export const analyzeAtsScore = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => GuardedInputSchema.parse(input))
  .handler(async ({ data, context }): Promise<AtsAnalysis> => {
    const { reserveAiGeneration, finishAiGeneration } = await import("./ai-usage.server");
    const { fingerprint } = await import("./ats-scoring");
    const { profileToResumeText } = await import("./resume-text");
    // Deterministic cache key: the same profile + JD reuses the stored result
    // instead of calling Gemini again, so the score never drifts.
    const requestId = fingerprint(
      profileToResumeText(data.profile),
      data.jobDescription,
      "ats",
    );
    const reservation = await reserveAiGeneration(context.userId, requestId, "ANALYSIS");
    if (reservation.cached) return reservation.cached as AtsAnalysis;
    try {
      const { analyzeAtsMatch } = await import("./resume-ai.server");
      const result = await analyzeAtsMatch(data.profile, data.jobDescription);
      await finishAiGeneration(context.userId, requestId, true, result);
      return result;
    } catch (err) {
      await finishAiGeneration(context.userId, requestId, false);
      throw err;
    }
  });

const ImportedAtsSchema = z.object({
  resumeText: z.string().min(120).max(30000),
  jobDescription: z.string().min(20).max(30000),
  requestId: z.string().min(8).max(120),
});

/** ATS score for a resume the user imported (PDF/DOCX) — never consumes a PDF credit. */
export const analyzeImportedResumeAts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ImportedAtsSchema.parse(input))
  .handler(async ({ data, context }): Promise<AtsAnalysis> => {
    const { reserveAiGeneration, finishAiGeneration } = await import("./ai-usage.server");
    const { fingerprint } = await import("./ats-scoring");
    const requestId = fingerprint(data.resumeText, data.jobDescription, "atsdoc");
    const reservation = await reserveAiGeneration(context.userId, requestId, "ANALYSIS");
    if (reservation.cached) return reservation.cached as AtsAnalysis;
    try {
      const { analyzeAtsMatchFromText } = await import("./resume-ai.server");
      const result = await analyzeAtsMatchFromText(data.resumeText, data.jobDescription);
      await finishAiGeneration(context.userId, requestId, true, result);
      return result;
    } catch (err) {
      await finishAiGeneration(context.userId, requestId, false);
      throw err;
    }
  });

/** Skill gap uses a separate, lightweight AI limit — never the resume counter. */
export const analyzeSkillGap = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => GuardedInputSchema.parse(input))
  .handler(async ({ data, context }): Promise<SkillGapAnalysis> => {
    const { reserveAiGeneration, finishAiGeneration } = await import("./ai-usage.server");
    const reservation = await reserveAiGeneration(context.userId, data.requestId, "ANALYSIS");
    if (reservation.cached) return reservation.cached as SkillGapAnalysis;
    try {
      const { analyzeSkillGaps } = await import("./resume-ai.server");
      const result = await analyzeSkillGaps(data.profile, data.jobDescription);
      await finishAiGeneration(context.userId, data.requestId, true, result);
      return result;
    } catch (err) {
      await finishAiGeneration(context.userId, data.requestId, false);
      throw err;
    }
  });

export const generateCoverLetter = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    GuardedInputSchema.extend({
      tone: z.enum(["short", "professional", "detailed"]).default("professional"),
    }).parse(input),
  )
  .handler(async ({ data, context }): Promise<CoverLetterResult> => {
    const { hasPremiumAccess } = await import("./billing.server");
    const access = await hasPremiumAccess(context.userId);
    if (!access.allowed) {
      throw new Error("SUBSCRIPTION_REQUIRED: Please choose a subscription plan to continue.");
    }
    const { reserveAiGeneration, finishAiGeneration } = await import("./ai-usage.server");
    const reservation = await reserveAiGeneration(context.userId, data.requestId, "ANALYSIS");
    if (reservation.cached) return reservation.cached as CoverLetterResult;
    try {
      const { writeCoverLetter } = await import("./resume-ai.server");
      const result = await writeCoverLetter(data.profile, data.jobDescription, data.tone);
      await finishAiGeneration(context.userId, data.requestId, true, result);
      return result;
    } catch (err) {
      await finishAiGeneration(context.userId, data.requestId, false);
      throw err;
    }
  });

/** Interview preparation for a specific JD + profile. Premium, ANALYSIS-limited. */
export const prepareInterview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => GuardedInputSchema.parse(input))
  .handler(async ({ data, context }): Promise<InterviewPrep> => {
    const { hasPremiumAccess } = await import("./billing.server");
    const access = await hasPremiumAccess(context.userId);
    if (!access.allowed) {
      throw new Error("SUBSCRIPTION_REQUIRED: Please choose a subscription plan to continue.");
    }
    const { reserveAiGeneration, finishAiGeneration } = await import("./ai-usage.server");
    const reservation = await reserveAiGeneration(context.userId, data.requestId, "ANALYSIS");
    if (reservation.cached) return reservation.cached as InterviewPrep;
    try {
      const { generateInterviewPrep } = await import("./resume-ai.server");
      const result = await generateInterviewPrep(data.profile, data.jobDescription);
      await finishAiGeneration(context.userId, data.requestId, true, result);
      return result;
    } catch (err) {
      await finishAiGeneration(context.userId, data.requestId, false);
      throw err;
    }
  });

const LinkedInInputSchema = z.object({
  profile: ProfileSchema,
  requestId: z.string().min(8).max(120),
});

/** LinkedIn profile optimization from the user's real profile. Premium, ANALYSIS-limited. */
export const optimizeLinkedInProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => LinkedInInputSchema.parse(input))
  .handler(async ({ data, context }): Promise<LinkedInOptimization> => {
    const { hasPremiumAccess } = await import("./billing.server");
    const access = await hasPremiumAccess(context.userId);
    if (!access.allowed) {
      throw new Error("SUBSCRIPTION_REQUIRED: Please choose a subscription plan to continue.");
    }
    const { reserveAiGeneration, finishAiGeneration } = await import("./ai-usage.server");
    const reservation = await reserveAiGeneration(context.userId, data.requestId, "ANALYSIS");
    if (reservation.cached) return reservation.cached as LinkedInOptimization;
    try {
      const { optimizeLinkedIn } = await import("./resume-ai.server");
      const result = await optimizeLinkedIn(data.profile);
      await finishAiGeneration(context.userId, data.requestId, true, result);
      return result;
    } catch (err) {
      await finishAiGeneration(context.userId, data.requestId, false);
      throw err;
    }
  });

/** Read-only usage counters for the UI. The backend remains the source of truth. */
export const getMyAiUsage = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ resume: AiUsageSummary; analysis: AiUsageSummary }> => {
    const { getAiUsage } = await import("./ai-usage.server");
    return {
      resume: await getAiUsage(context.userId, "RESUME"),
      analysis: await getAiUsage(context.userId, "ANALYSIS"),
    };
  });
