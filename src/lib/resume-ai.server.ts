import {
  callGeminiJson,
  resumeSchema,
  atsExtractionSchema,
  skillGapSchema,
  coverLetterSchema,
  interviewPrepSchema,
  linkedInSchema,
  NO_FABRICATION_RULES,
} from "./gemini.server";
import { computeAtsScores, type AtsExtraction } from "./ats-scoring";
import { profileToResumeText } from "./resume-text";
import { withoutResumeContactDetails } from "./resume-text-privacy";
import { classifyRequirements, describeChanges, validateOptimizedProfile } from "./resume-optimization";
import {
  buildAtsPayload,
  buildCoverLetterPayload,
  buildInterviewPayload,
  buildLinkedInPayload,
  buildResumeGenerationPayload,
  buildSkillGapPayload,
} from "./ai-payloads";
import type {
  ProfileInput,
  OptimizedResume,
  AtsAnalysis,
  SkillGapAnalysis,
  CoverLetterResult,
  CoverLetterTone,
  InterviewPrep,
  LinkedInOptimization,
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
  const safeResumeText = withoutResumeContactDetails(resumeText);
  const extraction = await callGeminiJson<AtsExtraction>({
    systemPrompt: `${EXTRACTION_PROMPT}\n${NO_FABRICATION_RULES}`,
    userPrompt: `JOB DESCRIPTION:\n${jobDescription}\n\nRESUME TEXT:\n${safeResumeText}`,
    schema: atsExtractionSchema as unknown as Record<string, unknown>,
    temperature: 0,
  });
  // Score the original text locally: contact details count toward ATS readiness,
  // but only the redacted text is sent to Gemini for extraction.
  const scored = computeAtsScores(resumeText, jobDescription, extraction);
  return {
    ...scored,
    score: scored.atsScore,
    jobTitle: extraction.jobTitle ?? "",
    matchingKeywords: scored.matchedKeywords,
    skillsMatched: scored.matchedKeywords,
    skillsMissing: scored.missingRequiredKeywords,
    strengths: extraction.strengths ?? [],
    weaknesses: extraction.weaknesses ?? [],
    suggestions: scored.recommendations,
  };
}

async function extractForOptimization(resumeText: string, jobDescription: string): Promise<AtsExtraction> {
  return callGeminiJson<AtsExtraction>({
    systemPrompt: `${EXTRACTION_PROMPT}\n${NO_FABRICATION_RULES}`,
    userPrompt: `JOB DESCRIPTION:\n${jobDescription}\n\nRESUME TEXT:\n${withoutResumeContactDetails(resumeText)}`,
    schema: atsExtractionSchema as unknown as Record<string, unknown>,
    temperature: 0,
  });
}

function context(profile: ProfileInput, jobDescription: string) {
  return `JOB DESCRIPTION:\n${jobDescription}\n\nCANDIDATE PROFILE (JSON):\n${JSON.stringify(profile, null, 2)}`;
}

export async function generateOptimizedResume(
  profile: ProfileInput,
  jobDescription: string,
): Promise<OptimizedResume> {
  const originalText = profileToResumeText(profile);
  const extraction = await extractForOptimization(originalText, jobDescription);
  const before = computeAtsScores(originalText, jobDescription, extraction);
  const result = await callGeminiJson<OptimizedResume>({
    systemPrompt: `You are an expert ATS (Applicant Tracking System) specialist and career coach.
Produce an ATS-optimized resume tailored to the target job description, covering: professional summary,
technical skills, professional experience, relevant projects (as experience entries only if present in the
profile), education, JD-specific keywords and ATS-friendly bullet points.
- Rewrite the summary and each bullet using the X-Y-Z method: "Accomplished [X], as measured by [Y], by doing [Z]".
- Naturally integrate job-description keywords the candidate genuinely matches.
- Keep bullets under ~30 words, starting with a strong action verb.
- Preserve exact name, contact, titles, employers, dates and education. Preserve all experience entries and bullet counts; reorder entries for relevance and rewrite their bullets without adding any unverified numbers, metrics, technologies or claims.
- Reorder only existing skills. Do not introduce new skills or unsupported job requirements. Projects or certifications may only be presented when explicitly supplied as experience entries.
${NO_FABRICATION_RULES}
Return JSON only.`,
    userPrompt: context(buildResumeGenerationPayload(profile), jobDescription),
    schema: resumeSchema as unknown as Record<string, unknown>,
  });
  result.optimizedProfile = validateOptimizedProfile(profile, result.optimizedProfile as ProfileInput);
  const optimizedText = profileToResumeText(result.optimizedProfile);
  // Re-extract against the final artifact: quoted evidence cannot be reused after rewriting.
  const optimizedExtraction = await extractForOptimization(optimizedText, jobDescription);
  const after = computeAtsScores(optimizedText, jobDescription, optimizedExtraction);
  result.atsScore = clamp(after.atsScore);
  result.atsMatchScore = after.atsMatchScore;
  result.ats = {
    ...after, score: after.atsScore, jobTitle: optimizedExtraction.jobTitle,
    matchingKeywords: after.matchedKeywords, skillsMatched: after.matchedKeywords,
    skillsMissing: after.missingRequiredKeywords, strengths: optimizedExtraction.strengths ?? [],
    weaknesses: optimizedExtraction.weaknesses ?? [], suggestions: after.recommendations,
  };
  result.matchingKeywords = after.matchedKeywords;
  result.missingKeywords = after.missingKeywords;
  result.optimization = {
    profileFit: before.atsMatchScore,
    currentAlignment: before.atsMatchScore,
    requirements: classifyRequirements(extraction, originalText, originalText),
    changes: describeChanges(profile, result.optimizedProfile, { before, after }),
    improvements: before.recommendations,
  };
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
learning plan for the missing ones. For every learning plan item include:
- priority: high | medium | low
- level: Beginner | Intermediate | Advanced (the level the candidate needs to reach for this JD)
- effort: a realistic estimated learning effort (e.g. "1-2 weeks", "about 1 month")
- resources: 1-3 official or free learning resources. STRONGLY prefer official sources such as Microsoft Learn,
  AWS Skill Builder / AWS Educate, Google Cloud Skills Boost, GitHub documentation and the official documentation
  of the technology. Only include a URL you are confident is a real, stable official page (homepage or docs root).
  Never invent or guess deep course URLs — if unsure, return an empty resources array.
- howToLearn should include a concrete practice/project suggestion.
${NO_FABRICATION_RULES}
Return JSON only.`,
    userPrompt: context(buildSkillGapPayload(profile), jobDescription),
    schema: skillGapSchema as unknown as Record<string, unknown>,
    temperature: 0.3,
  });
}

const COVER_LETTER_TONES: Record<CoverLetterTone, string> = {
  short: "Keep it very short: 2 short paragraphs, under 150 words.",
  professional: "Keep it concise and professional: 3-4 short paragraphs, under 320 words.",
  detailed: "Make it detailed: 4-5 paragraphs, under 500 words, mapping the candidate's real experience to the role.",
};

export async function writeCoverLetter(
  profile: ProfileInput,
  jobDescription: string,
  tone: CoverLetterTone = "professional",
): Promise<CoverLetterResult> {
  return callGeminiJson<CoverLetterResult>({
    systemPrompt: `You are an expert career writer. Write an ATS-friendly cover letter tailored to the job
description, using only the candidate's real background. ${COVER_LETTER_TONES[tone] ?? COVER_LETTER_TONES.professional}
Also return 3-5 highlight bullet points summarising why the candidate fits.
${NO_FABRICATION_RULES}
Return JSON only.`,
    userPrompt: context(buildCoverLetterPayload(profile), jobDescription),
    schema: coverLetterSchema as unknown as Record<string, unknown>,
    temperature: 0.6,
  });
}

/**
 * Interview preparation grounded in the JD + the candidate's real profile.
 * Questions only — the AI must not promise these will be asked.
 */
export async function generateInterviewPrep(
  profile: ProfileInput,
  jobDescription: string,
): Promise<InterviewPrep> {
  return callGeminiJson<InterviewPrep>({
    systemPrompt: `You are an experienced technical interviewer preparing a candidate for a specific job.
Generate likely interview questions in six categories:
- technicalQuestions: technologies and concepts named in the job description (4-8 questions)
- projectQuestions: questions the interviewer may ask about the candidate's own projects/experience (3-6)
- hrQuestions: classic HR/screening questions for this role (2-4)
- behavioralQuestions: situational/behavioural questions relevant to the responsibilities in the JD (2-4)
- jdSpecificQuestions: questions about specific requirements, tools or responsibilities in this exact JD (3-6)
- skillGapQuestions: questions targeting skills the JD requires that the candidate's profile does NOT evidence (1-4)
For each question include "whatTheyTest" (one short sentence) and "howToAnswer" (2-3 sentences of guidance
grounded in the candidate's real background — never invent experience for them).
${NO_FABRICATION_RULES}
Return JSON only.`,
    userPrompt: context(buildInterviewPayload(profile), jobDescription),
    schema: interviewPrepSchema as unknown as Record<string, unknown>,
    temperature: 0.5,
  });
}

/** LinkedIn profile content built strictly from the candidate's real profile. */
export async function optimizeLinkedInProfile(
  profile: ProfileInput,
): Promise<LinkedInOptimization> {
  return callGeminiJson<LinkedInOptimization>({
    systemPrompt: `You are a LinkedIn profile strategist. Using ONLY the candidate's real profile, write:
- headline: a keyword-rich LinkedIn headline (under 220 characters)
- aboutSection: a first-person About section (under 2200 characters) covering their real experience and skills
- skillsSuggestions: up to 15 LinkedIn skills that are genuinely evidenced in the profile
- projectDescription: a polished description of their most significant real project (empty string if none)
- experienceDescription: a concise achievement-focused description of their most recent real role
${NO_FABRICATION_RULES}
Return JSON only.`,
    userPrompt: `CANDIDATE PROFILE (JSON):\n${JSON.stringify(buildLinkedInPayload(profile), null, 2)}`,
    schema: linkedInSchema as unknown as Record<string, unknown>,
    temperature: 0.5,
  });
}
