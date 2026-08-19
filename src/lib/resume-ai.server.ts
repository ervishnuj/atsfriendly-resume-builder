import {
  callGeminiJson,
  resumeSchema,
  atsSchema,
  skillGapSchema,
  coverLetterSchema,
  NO_FABRICATION_RULES,
} from "./gemini.server";
import type {
  ProfileInput,
  OptimizedResume,
  AtsAnalysis,
  SkillGapAnalysis,
  CoverLetterResult,
} from "./resume-schemas";

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(Number(n) || 0)));

function context(profile: ProfileInput, jobDescription: string) {
  return `JOB DESCRIPTION:\n${jobDescription}\n\nCANDIDATE PROFILE (JSON):\n${JSON.stringify(profile, null, 2)}`;
}

export async function generateOptimizedResume(
  profile: ProfileInput,
  jobDescription: string,
): Promise<OptimizedResume> {
  const result = await callGeminiJson<OptimizedResume>({
    systemPrompt: `You are an expert ATS (Applicant Tracking System) specialist and career coach.
Produce an ATS-optimized resume tailored to the target job description, covering: professional summary,
technical skills, professional experience, relevant projects (as experience entries only if present in the
profile), education, JD-specific keywords and ATS-friendly bullet points.
- Rewrite the summary and each bullet using the X-Y-Z method: "Accomplished [X], as measured by [Y], by doing [Z]".
- Naturally integrate job-description keywords the candidate genuinely matches.
- Keep bullets under ~30 words, starting with a strong action verb.
${NO_FABRICATION_RULES}
Return JSON only.`,
    userPrompt: context(profile, jobDescription),
    schema: resumeSchema as unknown as Record<string, unknown>,
  });
  result.atsScore = clamp(result.atsScore);
  return result;
}

export async function analyzeAtsMatch(
  profile: ProfileInput,
  jobDescription: string,
): Promise<AtsAnalysis> {
  const result = await callGeminiJson<AtsAnalysis>({
    systemPrompt: `You are an expert ATS analyzer and technical recruiter.
Analyze the candidate's resume against the provided job description and calculate a realistic score from 0 to 100 based on:
job title relevance, technical skills, required technologies, experience relevance, JD keywords, industry/domain keywords,
education requirements, resume keyword coverage, relevant achievements and resume structure.
Rules:
- Do NOT automatically return 100. Be honest and critical.
- Identify matching keywords, missing keywords, matched skills, missing skills, strengths, weaknesses and actionable suggestions.
${NO_FABRICATION_RULES}
Return JSON only.`,
    userPrompt: context(profile, jobDescription),
    schema: atsSchema as unknown as Record<string, unknown>,
    temperature: 0.2,
  });
  result.score = clamp(result.score);
  return result;
}

export async function analyzeSkillGaps(
  profile: ProfileInput,
  jobDescription: string,
): Promise<SkillGapAnalysis> {
  return analyzeSkillGapsImpl(profile, jobDescription);
}

/**
 * ATS analysis for a resume the user imported (PDF/DOCX text), rather than the
 * profile stored in the app. Nothing is invented — only the supplied text counts.
 */
export async function analyzeAtsMatchFromText(
  resumeText: string,
  jobDescription: string,
): Promise<AtsAnalysis> {
  const result = await callGeminiJson<AtsAnalysis>({
    systemPrompt: `You are an expert ATS analyzer and technical recruiter.
Analyze the candidate's EXISTING RESUME TEXT against the provided job description and calculate a realistic
score from 0 to 100 based on: job title relevance, technical skills, required technologies, experience relevance,
JD keywords, industry keywords, education requirements, keyword coverage, achievements and resume structure.
Rules:
- Do NOT automatically return 100. Be honest and critical.
- Use ONLY skills, tools and experience that literally appear in the resume text. Never invent skills or experience.
- Identify matching keywords, missing keywords, matched skills, missing skills, strengths, weaknesses and actionable suggestions.
${NO_FABRICATION_RULES}
Return JSON only.`,
    userPrompt: `JOB DESCRIPTION:\n${jobDescription}\n\nEXISTING RESUME TEXT:\n${resumeText}`,
    schema: atsSchema as unknown as Record<string, unknown>,
    temperature: 0.2,
  });
  result.score = clamp(result.score);
  return result;
}

async function analyzeSkillGapsImpl(
  profile: ProfileInput,
  jobDescription: string,
): Promise<SkillGapAnalysis> {
  return callGeminiJson<SkillGapAnalysis>({
    systemPrompt: `You are a technical hiring manager performing a skill gap analysis between a candidate profile
and a target job description. Classify each required skill as matched, partial or missing, and give a prioritised
learning plan (priority: high | medium | low) for the missing ones.
${NO_FABRICATION_RULES}
Return JSON only.`,
    userPrompt: context(profile, jobDescription),
    schema: skillGapSchema as unknown as Record<string, unknown>,
    temperature: 0.3,
  });
}

export async function writeCoverLetter(
  profile: ProfileInput,
  jobDescription: string,
): Promise<CoverLetterResult> {
  return callGeminiJson<CoverLetterResult>({
    systemPrompt: `You are an expert career writer. Write a concise, professional, ATS-friendly cover letter
(3-4 short paragraphs, under 320 words) tailored to the job description, using only the candidate's real background.
Also return 3-5 highlight bullet points summarising why the candidate fits.
${NO_FABRICATION_RULES}
Return JSON only.`,
    userPrompt: context(profile, jobDescription),
    schema: coverLetterSchema as unknown as Record<string, unknown>,
    temperature: 0.6,
  });
}
