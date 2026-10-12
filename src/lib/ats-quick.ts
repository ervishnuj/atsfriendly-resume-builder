import {
  computeAtsScores,
  normalizeText,
  normalizeTerm,
  type AtsExtraction,
  type AtsScoreResult,
} from "@/lib/ats-scoring";

/**
 * Free, offline ATS check for the public /ats-checker page.
 *
 * It uses EXACTLY the same scoring engine as the builder
 * (`computeAtsScores` in ats-scoring.ts) — the same weights, the same keyword
 * normalization/aliases and the same recommendations. The only difference is
 * where the structured facts come from: the builder asks Gemini to extract
 * them, while this page derives them from the job description text itself so
 * anonymous visitors get an instant, free and fully deterministic result.
 */

const STOPWORDS = new Set(
  `a an the and or but if then than that this those these of in on at to for with without from by as is are was were be been being will shall can could should would may might must have has had do does did not no you your our we they he she it its their his her them us who whom which what when where why how all any both each few more most other some such only own same so too very just about into over under again further once here there during before after above below off out up down ours yours theirs i me my mine also per via etc role roles job jobs work working works experience experienced years year team teams strong excellent good ability able skills skill knowledge understanding candidate candidates ideal plus preferred required requirements responsibilities responsibility qualifications company position opportunity join looking help ensure using use used across within new`
    .split(/\s+/)
    .filter(Boolean),
);

const REQUIRED_HINT = /(must have|must-have|required|requirement|essential|minimum|proficien|strong experience|expertise)/i;
const PREFERRED_HINT = /(preferred|nice to have|nice-to-have|bonus|plus|good to have|desirable|advantage)/i;
const RESP_HINT = /(responsib|you will|role involves|day to day|what you'll do|duties)/i;
const TITLE_WORDS =
  /(engineer|developer|manager|analyst|designer|consultant|architect|scientist|administrator|specialist|lead|intern|associate|director|officer)/i;
const DEGREE_WORDS =
  /(bachelor|master|b\.?tech|m\.?tech|b\.?sc|m\.?sc|bca|mca|mba|phd|degree|diploma|university|college)/i;

export type QuickAtsResult = AtsScoreResult & {
  /** Job-description keywords that drove the keyword sub-scores. */
  keywordsChecked: number;
  wordCount: number;
};

function lines(text: string): string[] {
  return text
    .split(/\r?\n+/)
    .map((l) => l.replace(/^[\s\u2022\u25cf*+-]+/, "").trim())
    .filter(Boolean);
}

/** Frequency + phrase ranked keywords from the job description. */
function extractKeywords(jd: string, limit = 30): string[] {
  // Tokenize per clause so bigrams never straddle a sentence boundary
  // ("graphql. bachelor") and trailing punctuation never leaks into a keyword.
  const clauses = jd
    .split(/[.;:!?\n\r,()/]+/)
    .map((c) =>
      normalizeText(c)
        .split(/\s+/)
        .map((t) => t.replace(/^[.\-]+|[.\-]+$/g, ""))
        .filter(Boolean),
    )
    .filter((c) => c.length);
  const counts = new Map<string, number>();
  const bump = (term: string, weight = 1) => {
    const key = normalizeTerm(term);
    if (!key || key.length < 3) return;
    counts.set(key, (counts.get(key) || 0) + weight);
  };

  for (const tokens of clauses) {
    tokens.forEach((t) => {
      if (STOPWORDS.has(t) || /^\d+$/.test(t)) return;
      bump(t);
    });
    for (let i = 0; i < tokens.length - 1; i++) {
      const a = tokens[i];
      const b = tokens[i + 1];
      if (STOPWORDS.has(a) || STOPWORDS.has(b)) continue;
      if (a.length < 3 || b.length < 3) continue;
      bump(`${a} ${b}`, 1.5);
    }
  }


  const ranked = [...counts.entries()]
    .sort((x, y) => y[1] - x[1] || x[0].localeCompare(y[0]))
    .map(([term]) => term);

  const chosen: string[] = [];
  for (const term of ranked) {
    if (chosen.length >= limit) break;
    if (!term.includes(" ") && chosen.some((c) => c.includes(" ") && c.split(" ").includes(term)))
      continue;
    chosen.push(term);
  }
  return chosen;
}

function yearsFrom(text: string): number {
  const m = text.match(/(\d{1,2})\s*\+?\s*(?:to|-|–)?\s*\d{0,2}\s*(?:years?|yrs?)/i);
  if (m) return Number(m[1]) || 0;
  // Fall back to the span covered by four-digit years in the text.
  const years = (text.match(/\b(19|20)\d{2}\b/g) || []).map(Number);
  if (years.length >= 2) {
    const span = Math.max(...years) - Math.min(...years);
    if (span > 0 && span < 50) return span;
  }
  return 0;
}

/**
 * Derives the same fact shape Gemini returns in the builder, using only text
 * heuristics so nothing is invented and no network call is needed.
 */
function localExtraction(resumeText: string, jobDescription: string): AtsExtraction {
  const jdLines = lines(jobDescription);
  const resumeLines = lines(resumeText);
  const resumeNorm = normalizeText(resumeText);

  const keywords = extractKeywords(jobDescription);

  // A keyword is "required" when it shows up in a sentence that signals a hard
  // requirement, "preferred" when the sentence signals a nice-to-have.
  const requiredSkills: string[] = [];
  const preferredSkills: string[] = [];
  const sentences = jobDescription.split(/(?<=[.;:!?])\s+|\r?\n+/).filter(Boolean);
  for (const kw of keywords) {
    const hosts = sentences.filter((s) => normalizeText(s).includes(` ${kw} `));
    const isPreferred = hosts.some((s) => PREFERRED_HINT.test(s));
    const isRequired = hosts.some((s) => REQUIRED_HINT.test(s));
    if (isRequired && !isPreferred) requiredSkills.push(kw);
    else if (isPreferred) preferredSkills.push(kw);
  }
  // If the posting has no explicit "required" wording, treat the strongest
  // keywords as the required set so the sub-score stays meaningful.
  if (requiredSkills.length === 0) requiredSkills.push(...keywords.slice(0, 10));

  const sentenceLike = jdLines.filter((l) => {
    const n = l.split(/\s+/).length;
    return n >= 4 && n <= 30;
  });
  const flagged = sentenceLike.filter((l) => RESP_HINT.test(l));
  const responsibilities = (flagged.length >= 3 ? flagged : sentenceLike).slice(0, 8);


  // Responsibility "evidence" must be a real resume line, so a responsibility
  // only counts when a resume bullet actually shares most of its key terms.
  const responsibilityEvidence = responsibilities.map((r) => {
    const terms = normalizeText(r)
      .split(/\s+/)
      .filter((t) => t.length > 3 && !STOPWORDS.has(t));
    let best = "";
    let bestHits = 0;
    for (const line of resumeLines) {
      const ln = normalizeText(line);
      const hits = terms.filter((t) => ln.includes(t)).length;
      if (hits > bestHits) {
        bestHits = hits;
        best = line;
      }
    }
    const present = terms.length > 0 && bestHits / terms.length >= 0.5;
    return { responsibility: r, present, evidence: present ? best : "" };
  });

  const educationRequirements = jdLines
    .filter((l) => DEGREE_WORDS.test(l))
    .slice(0, 3)
    .map((l) => (DEGREE_WORDS.exec(l)?.[0] ?? "").trim())
    .filter(Boolean);

  const jdTitle =
    jdLines.find((l) => l.length <= 80 && TITLE_WORDS.test(l)) ??
    (jdLines[0] && jdLines[0].length <= 80 ? jdLines[0] : "");


  return {
    jobTitle: jdTitle,
    requiredSkills,
    preferredSkills,
    technicalKeywords: keywords,
    responsibilities,
    minYearsExperience: yearsFrom(jobDescription),
    educationRequirements,
    candidateYearsExperience: yearsFrom(resumeText),
    candidateTitles: resumeLines.filter((l) => TITLE_WORDS.test(l) && l.length <= 80).slice(0, 6),
    candidateEducation: resumeLines.filter((l) => DEGREE_WORDS.test(l)).slice(0, 4),
    // No AI: literal/alias matching only, never semantic guesses.
    skillEvidence: extraction.technicalKeywords.map(kw => ({ term: kw, present: resumeNorm.includes(normalizeTerm(kw)), evidence: resumeLines.find(l => normalizeText(l).includes(normalizeTerm(kw))) ?? "" })),
    responsibilityEvidence,
    strengths: [],
    weaknesses: [],
    suggestions: resumeNorm.includes("summary")
      ? []
      : ["Add a short professional summary at the top tailored to this job title."],
  };
}

export function quickAtsCheck(resumeText: string, jobDescription: string): QuickAtsResult {
  const extraction = localExtraction(resumeText, jobDescription);
  const scored = computeAtsScores(resumeText, jobDescription, extraction);
  return {
    ...scored,
    keywordsChecked: extraction.technicalKeywords.length,
    wordCount: resumeText.trim().split(/\s+/).filter(Boolean).length,
  };
}
