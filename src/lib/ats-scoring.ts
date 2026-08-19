/**
 * Deterministic ATS scoring engine.
 *
 * Gemini is used ONLY to extract structured facts (what the JD requires, and
 * which requirements are semantically evidenced in the resume). Every number
 * below is computed here with a fixed, documented formula, so the same
 * resume + job description always produces the same scores.
 */

export type AtsBreakdown = {
  structure: number; // /20
  contact: number; // /10
  sections: number; // /15
  keywords: number; // /20
  jobRelevance: number; // /15
  experience: number; // /10
  formatting: number; // /10
};

export type AtsMatchBreakdown = {
  requiredSkills: number; // /40
  technicalKeywords: number; // /25
  responsibilities: number; // /15
  experience: number; // /10
  education: number; // /5
  jobTitle: number; // /5
};

export const ATS_MAX: AtsBreakdown = {
  structure: 20,
  contact: 10,
  sections: 15,
  keywords: 20,
  jobRelevance: 15,
  experience: 10,
  formatting: 10,
};

export const MATCH_MAX: AtsMatchBreakdown = {
  requiredSkills: 40,
  technicalKeywords: 25,
  responsibilities: 15,
  experience: 10,
  education: 5,
  jobTitle: 5,
};

export type AtsExtraction = {
  jobTitle: string;
  requiredSkills: string[];
  preferredSkills: string[];
  technicalKeywords: string[];
  responsibilities: string[];
  minYearsExperience: number;
  educationRequirements: string[];
  candidateYearsExperience: number;
  candidateTitles: string[];
  candidateEducation: string[];
  /** Semantic presence checks: `evidence` MUST be quoted from the resume text. */
  skillEvidence: { term: string; present: boolean; evidence: string }[];
  responsibilityEvidence: { responsibility: string; present: boolean; evidence: string }[];
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
};

export type AtsScoreResult = {
  atsScore: number;
  atsMatchScore: number;
  band: string;
  breakdown: AtsBreakdown;
  matchBreakdown: AtsMatchBreakdown;
  matchedKeywords: string[];
  missingRequiredKeywords: string[];
  missingPreferredKeywords: string[];
  missingKeywords: string[];
  recommendations: string[];
};

/* ------------------------------------------------------------------ */
/* Normalization                                                       */
/* ------------------------------------------------------------------ */

const ALIASES: Record<string, string> = {
  springboot: "spring boot",
  "spring-boot": "spring boot",
  restapi: "rest api",
  "restful api": "rest api",
  "restful apis": "rest api",
  "rest apis": "rest api",
  restfulservices: "rest api",
  nodejs: "node js",
  "node.js": "node js",
  reactjs: "react",
  "react.js": "react",
  postgres: "postgresql",
  "js": "javascript",
  "ts": "typescript",
  k8s: "kubernetes",
  gcp: "google cloud",
  "ci/cd": "cicd",
  "ci cd": "cicd",
  "my sql": "mysql",
};

/** Lowercase, strip punctuation/bullets, collapse whitespace. Analysis only. */
export function normalizeText(input: string): string {
  let text = ` ${(input || "").toLowerCase()} `;
  text = text.replace(/[\u2022\u25cf\u25aa\u2023\u2043]/g, " ");
  text = text.replace(/[\r\n\t]+/g, " ");
  text = text.replace(/[^a-z0-9+#./ -]/g, " ");
  text = text.replace(/\s+/g, " ");
  for (const [from, to] of Object.entries(ALIASES)) {
    text = text.split(` ${from} `).join(` ${to} `);
  }
  return text.replace(/\s+/g, " ");
}

export function normalizeTerm(term: string): string {
  const n = normalizeText(term).trim();
  return ALIASES[n] ?? n;
}

const STOP_TERMS = new Set([
  "experience", "work", "team", "good", "strong", "excellent", "skills", "knowledge",
  "ability", "communication", "years", "year", "plus", "etc", "and", "or", "the",
  "with", "using", "must", "should", "role", "job", "candidate", "responsibilities",
]);

/** True when `term` appears in `normalizedText` on token boundaries. */
export function containsTerm(normalizedText: string, term: string): boolean {
  const t = normalizeTerm(term);
  if (!t || t.length < 2 || STOP_TERMS.has(t)) return false;
  const escaped = t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  // Boundaries are non [a-z0-9+#] so "java" never matches inside "javascript".
  const re = new RegExp(`(^|[^a-z0-9+#])${escaped}([^a-z0-9+#]|$)`);
  return re.test(normalizedText);
}

/** Dedupe by normalized form, keeping the first original spelling. */
function dedupe(terms: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of terms || []) {
    const t = (raw || "").trim();
    const key = normalizeTerm(t);
    if (!t || !key || key.length < 2 || STOP_TERMS.has(key) || seen.has(key)) continue;
    seen.add(key);
    out.push(t);
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Matching                                                            */
/* ------------------------------------------------------------------ */

/**
 * A term counts as present when it literally appears in the resume, OR when
 * Gemini flagged semantic evidence AND that quoted evidence really exists in
 * the resume text. Unverifiable "evidence" is discarded, so the model can
 * never inflate the score by inventing experience.
 */
function buildPresence(resumeNorm: string, extraction: AtsExtraction) {
  const evidence = new Map<string, boolean>();
  for (const e of extraction.skillEvidence || []) {
    if (!e?.present || !e.term) continue;
    const quote = normalizeText(e.evidence || "").trim();
    const verified = quote.length >= 4 && resumeNorm.includes(quote);
    if (verified) evidence.set(normalizeTerm(e.term), true);
  }
  return (term: string) =>
    containsTerm(resumeNorm, term) || evidence.get(normalizeTerm(term)) === true;
}

function coverage(terms: string[], has: (t: string) => boolean) {
  const matched = terms.filter(has);
  const missing = terms.filter((t) => !has(t));
  return {
    matched,
    missing,
    ratio: terms.length === 0 ? 0 : matched.length / terms.length,
  };
}

const round = (n: number) => Math.round(n * 10) / 10;
const clamp = (n: number, max: number) => Math.max(0, Math.min(max, n));

export function scoreBand(score: number): string {
  if (score >= 90) return "Excellent Match";
  if (score >= 75) return "Strong Match";
  if (score >= 60) return "Moderate Match";
  if (score >= 40) return "Needs Improvement";
  return "Poor Match";
}

const SECTION_HEADINGS = [
  "summary", "objective", "profile", "skills", "experience", "employment",
  "education", "projects", "certifications", "achievements",
];

const ACTION_VERBS = [
  "built", "developed", "designed", "led", "implemented", "improved", "migrated",
  "automated", "delivered", "reduced", "increased", "created", "launched",
  "optimized", "architected", "managed", "owned", "shipped", "integrated",
];

/** Degree synonyms so "B.Tech" satisfies a "Bachelor's degree" requirement. */
const DEGREE_SYNONYMS: [RegExp, string][] = [
  [/\b(b tech|btech|b e|bsc|b sc|bs|bca|bachelors?)\b/, " bachelor bachelors degree "],
  [/\b(m tech|mtech|msc|m sc|ms|mca|mba|masters?)\b/, " master masters degree "],
  [/\b(phd|doctorate)\b/, " phd doctorate degree "],
];

function expandDegrees(normalized: string): string {
  let out = ` ${normalized.replace(/\./g, " ").replace(/\s+/g, " ")} `;
  for (const [re, add] of DEGREE_SYNONYMS) if (re.test(out)) out += add;
  return out.replace(/\s+/g, " ");
}

/* ------------------------------------------------------------------ */
/* Scoring                                                             */
/* ------------------------------------------------------------------ */

export function computeAtsScores(
  resumeText: string,
  jobDescription: string,
  raw: AtsExtraction,
): AtsScoreResult {
  const resumeNorm = normalizeText(resumeText);
  const has = buildPresence(resumeNorm, raw);

  const required = dedupe(raw.requiredSkills || []);
  const preferred = dedupe(raw.preferredSkills || []).filter(
    (p) => !required.some((r) => normalizeTerm(r) === normalizeTerm(p)),
  );
  const technical = dedupe([...(raw.technicalKeywords || []), ...preferred]);

  const req = coverage(required, has);
  const tech = coverage(technical, has);
  const pref = coverage(preferred, has);

  /* ---- ATS Match Score (JD fit) ---- */
  const responsibilities = dedupe(raw.responsibilities || []);
  const respVerified = new Set(
    (raw.responsibilityEvidence || [])
      .filter((r) => {
        if (!r?.present) return false;
        const quote = normalizeText(r.evidence || "").trim();
        return quote.length >= 4 && resumeNorm.includes(quote);
      })
      .map((r) => normalizeTerm(r.responsibility)),
  );
  const respRatio =
    responsibilities.length === 0
      ? 0
      : responsibilities.filter((r) => respVerified.has(normalizeTerm(r))).length /
        responsibilities.length;

  const needYears = Math.max(0, Number(raw.minYearsExperience) || 0);
  const haveYears = Math.max(0, Number(raw.candidateYearsExperience) || 0);
  const yearsRatio = needYears === 0 ? (haveYears > 0 ? 1 : 0.5) : Math.min(1, haveYears / needYears);

  const eduReqs = dedupe(raw.educationRequirements || []);
  const eduText = expandDegrees(
    normalizeText((raw.candidateEducation || []).join(" ")) || normalizeText(resumeText),
  );
  const eduRatio =
    eduReqs.length === 0
      ? eduText.trim().length > 0
        ? 1
        : 0.5
      : eduReqs.filter((e) => containsTerm(eduText, e) || containsTerm(resumeNorm, e)).length /
        eduReqs.length;

  const jdTitleTokens = normalizeText(raw.jobTitle || "")
    .split(" ")
    .filter((t) => t.length > 2 && !STOP_TERMS.has(t));
  const candTitleText = normalizeText((raw.candidateTitles || []).join(" "));
  const titleRatio =
    jdTitleTokens.length === 0
      ? 0.5
      : jdTitleTokens.filter((t) => containsTerm(candTitleText, t)).length / jdTitleTokens.length;

  const matchBreakdown: AtsMatchBreakdown = {
    requiredSkills: round(MATCH_MAX.requiredSkills * req.ratio),
    technicalKeywords: round(MATCH_MAX.technicalKeywords * tech.ratio),
    responsibilities: round(MATCH_MAX.responsibilities * respRatio),
    experience: round(MATCH_MAX.experience * yearsRatio),
    education: round(MATCH_MAX.education * eduRatio),
    jobTitle: round(MATCH_MAX.jobTitle * titleRatio),
  };
  const atsMatchScore = Math.round(
    Object.values(matchBreakdown).reduce((a, b) => a + b, 0),
  );

  /* ---- ATS Score (resume quality / readiness) ---- */
  const hasEmail = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i.test(resumeText);
  const hasPhone = /(\+?\d[\d\s().-]{7,}\d)/.test(resumeText);
  const hasLink = /(linkedin\.com|github\.com|https?:\/\/)/i.test(resumeText);
  const contact = clamp((hasEmail ? 4 : 0) + (hasPhone ? 3 : 0) + (hasLink ? 3 : 0), ATS_MAX.contact);

  const hasSummary = /(summary|objective|profile)/i.test(resumeText) || resumeText.length > 400;
  const hasSkills = /skills?/i.test(resumeText);
  const hasExperience = /(experience|employment|work history)/i.test(resumeText);
  const hasEducation = /(education|b\.?tech|bachelor|master|degree|university|college)/i.test(resumeText);
  const sections = clamp(
    (hasSummary ? 3 : 0) + (hasSkills ? 4 : 0) + (hasExperience ? 5 : 0) + (hasEducation ? 3 : 0),
    ATS_MAX.sections,
  );

  const headingsFound = SECTION_HEADINGS.filter((h) => resumeNorm.includes(h)).length;
  const lines = resumeText.split(/\n+/).map((l) => l.trim()).filter(Boolean);
  const bulletLines = lines.filter((l) => /^([-*\u2022\u25cf]|\d+[.)])/.test(l));
  const bulletCount = bulletLines.length || lines.filter((l) => l.length > 40).length;
  const structure = clamp(
    Math.round(Math.min(12, headingsFound * 2)) + (bulletCount >= 5 ? 8 : bulletCount >= 2 ? 5 : 2),
    ATS_MAX.structure,
  );

  const keywords = round(ATS_MAX.keywords * tech.ratio);
  const jobRelevance = round(ATS_MAX.jobRelevance * (0.7 * req.ratio + 0.3 * titleRatio));

  const sampled = bulletLines.length ? bulletLines : lines.filter((l) => l.length > 40);
  const quantified = sampled.filter((l) => /\d/.test(l)).length;
  const actionLed = sampled.filter((l) =>
    ACTION_VERBS.some((v) => normalizeText(l).trim().startsWith(v)),
  ).length;
  const ratio = (n: number) => (sampled.length ? n / sampled.length : 0);
  const experience = clamp(
    round(5 * ratio(quantified) + 3 * ratio(actionLed) + (sampled.length >= 5 ? 2 : 0)),
    ATS_MAX.experience,
  );

  const tooLong = sampled.filter((l) => l.split(/\s+/).length > 45).length;
  const wordCount = resumeText.split(/\s+/).filter(Boolean).length;
  const graphics = /(\t{2,}|\|\s*\|)/.test(resumeText);
  const formatting = clamp(
    ATS_MAX.formatting -
      (graphics ? 3 : 0) -
      (tooLong > 0 ? Math.min(3, tooLong) : 0) -
      (wordCount < 150 ? 3 : 0) -
      (wordCount > 1200 ? 2 : 0) -
      (bulletCount === 0 ? 2 : 0),
    ATS_MAX.formatting,
  );

  const breakdown: AtsBreakdown = {
    structure,
    contact,
    sections,
    keywords,
    jobRelevance,
    experience,
    formatting,
  };
  const atsScore = Math.round(Object.values(breakdown).reduce((a, b) => a + b, 0));

  /* ---- Explanations (deterministic, never fabricating skills) ---- */
  const recommendations: string[] = [];
  if (req.missing.length)
    recommendations.push(
      `The job description requires ${req.missing.join(", ")}, which is not present in your resume. Add it only if you genuinely have it.`,
    );
  if (pref.missing.length)
    recommendations.push(`Preferred (nice-to-have) skills not found: ${pref.missing.join(", ")}.`);
  if (breakdown.contact < ATS_MAX.contact)
    recommendations.push("Complete your contact header (email, phone and a LinkedIn/GitHub link).");
  if (breakdown.experience < 7)
    recommendations.push("Add measurable achievements (numbers, %, scale) and start bullets with strong action verbs.");
  if (breakdown.sections < ATS_MAX.sections)
    recommendations.push("Include all standard ATS sections: Summary, Skills, Experience and Education.");
  if (breakdown.formatting < 8)
    recommendations.push("Simplify formatting: shorter bullets, no tables or graphics, plain section headings.");
  for (const s of (raw.suggestions || []).slice(0, 3)) if (s) recommendations.push(s);

  return {
    atsScore,
    atsMatchScore,
    band: scoreBand(atsMatchScore),
    breakdown,
    matchBreakdown,
    matchedKeywords: dedupe([...req.matched, ...tech.matched]),
    missingRequiredKeywords: req.missing,
    missingPreferredKeywords: pref.missing,
    missingKeywords: dedupe([...req.missing, ...tech.missing]),
    recommendations: recommendations.slice(0, 8),
  };
}

/** Stable fingerprint of resume + JD, used as the idempotency/cache key. */
export function fingerprint(resumeText: string, jobDescription: string, tag: string): string {
  const input = `${tag}::${normalizeText(resumeText)}::${normalizeText(jobDescription)}`;
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  for (let i = 0; i < input.length; i += 1) {
    const c = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 16777619) >>> 0;
    h2 = Math.imul(h2 + c + i, 2246822519) >>> 0;
  }
  return `${tag}-${h1.toString(36)}${h2.toString(36)}${input.length.toString(36)}`;
}
