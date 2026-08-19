import {
  callGeminiJson,
  resumeSchema,
  atsExtractionSchema,
  skillGapSchema,
  coverLetterSchema,
  NO_FABRICATION_RULES,
} from "./gemini.server";
import { computeAtsScores, type AtsExtraction } from "./ats-scoring";
import { profileToResumeText } from "./resume-text";
import type {
  ProfileInput,
  OptimizedResume,
  AtsAnalysis,
  SkillGapAnalysis,
  CoverLetterResult,
} from "./resume-schemas";

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(Number(n) || 0)));

const EXTRACTION_PROMPT = `You are an ATS parsing engine. You DO NOT score anything — you only extract facts.
From the JOB DESCRIPTION extract: the job title, required skills (explicitly mandatory), preferred/nice-to-have
skills, technical keywords (tools, frameworks, languages, platforms, domain terms — no generic English words),
key responsibilities (short phrases), minimum years of experience (0 if unstated) and education requirements.
From the RESUME TEXT extract: total years of professional experience (0 if unclear), job titles held and education.
Then, for EVERY required skill, preferred skill and technical keyword, and for EVERY responsibility, decide whether
the RESUME genuinely evidences it, including semantically equivalent wording.
Critical rules:
- "evidence" MUST be an exact verbatim substring copied from the resume text. If you cannot quote the resume, set
  present=false and evidence="".
- NEVER invent skills, tools, employers or experience that are absent from the resume text.
- Do not treat a different technology as a match (JavaScript is NOT Java; MySQL is NOT SQL Server).
Also list factual strengths, weaknesses and improvement suggestions. Return JSON only.`;

/** Runs the extraction pass, then applies the deterministic scoring formula. */
async function runAtsAnalysis(resumeText: string, jobDescription: string): Promise<AtsAnalysis> {
  const extraction = await callGeminiJson<AtsExtraction>({
    systemPrompt: `${EXTRACTION_PROMPT}\n${NO_FABRICATION_RULES}`,
    userPrompt: `JOB DESCRIPTION:\n${jobDescription}\n\nRESUME TEXT:\n${resumeText}`,
    schema: atsExtractionSchema as unknown as Record<string, unknown>,
    temperature: 0,
  });
  const scored = computeAtsScores(resumeText, jobDescription, extraction);
  return {
    ...scored,
    score: scored.atsScore,
    matchingKeywords: scored.matchedKeywords,
    skillsMatched: scored.matchedKeywords,
    skillsMissing: scored.missingRequiredKeywords,
    strengths: extraction.strengths ?? [],
    weaknesses: extraction.weaknesses ?? [],
    suggestions: scored.recommendations,
  };
}

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
  // Score the ACTUAL generated resume, not the raw profile, using the
  // deterministic engine — Gemini's own number is discarded.
  try {
    const ats = await runAtsAnalysis(
      profileToResumeText(result.optimizedProfile as unknown as ProfileInput),
      jobDescription,
    );
    result.atsScore = ats.atsScore;
    result.atsMatchScore = ats.atsMatchScore;
    result.ats = ats;
    result.matchingKeywords = ats.matchedKeywords;
    result.missingKeywords = ats.missingKeywords;
  } catch (error) {
    console.warn("Deterministic ATS scoring failed for the generated resume.", error);
  }
  return result;
}

export async function analyzeAtsMatch(
  profile: ProfileInput,
  jobDescription: string,
): Promise<AtsAnalysis> {
  return runAtsAnalysis(profileToResumeText(profile), jobDescription);
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
  return runAtsAnalysis(resumeText, jobDescription);
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
