import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { ResumeInputSchema } from "./resume-schemas";
import type {
  OptimizedResume,
  AtsAnalysis,
  SkillGapAnalysis,
  CoverLetterResult,
} from "./resume-schemas";

export type {
  OptimizedResume,
  AtsAnalysis,
  SkillGapAnalysis,
  CoverLetterResult,
} from "./resume-schemas";

export const generateResume = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ResumeInputSchema.parse(input))
  .handler(async ({ data, context }): Promise<OptimizedResume> => {
    const { hasPremiumAccess } = await import("./billing.server");
    const access = await hasPremiumAccess(context.userId);
    if (!access.allowed) {
      throw new Error("SUBSCRIPTION_REQUIRED: Please choose a subscription plan to continue.");
    }
    const { generateOptimizedResume } = await import("./resume-ai.server");
    return generateOptimizedResume(data.profile, data.jobDescription);
  });

/** ATS score is available to any authenticated user — no subscription gate. */
export const analyzeAtsScore = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ResumeInputSchema.parse(input))
  .handler(async ({ data }): Promise<AtsAnalysis> => {
    const { analyzeAtsMatch } = await import("./resume-ai.server");
    return analyzeAtsMatch(data.profile, data.jobDescription);
  });

export const analyzeSkillGap = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ResumeInputSchema.parse(input))
  .handler(async ({ data }): Promise<SkillGapAnalysis> => {
    const { analyzeSkillGaps } = await import("./resume-ai.server");
    return analyzeSkillGaps(data.profile, data.jobDescription);
  });

export const generateCoverLetter = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ResumeInputSchema.parse(input))
  .handler(async ({ data, context }): Promise<CoverLetterResult> => {
    const { hasPremiumAccess } = await import("./billing.server");
    const access = await hasPremiumAccess(context.userId);
    if (!access.allowed) {
      throw new Error("SUBSCRIPTION_REQUIRED: Please choose a subscription plan to continue.");
    }
    const { writeCoverLetter } = await import("./resume-ai.server");
    return writeCoverLetter(data.profile, data.jobDescription);
  });
