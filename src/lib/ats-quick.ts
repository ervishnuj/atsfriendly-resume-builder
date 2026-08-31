import { containsTerm, normalizeText, normalizeTerm, scoreBand } from "@/lib/ats-scoring";

/**
 * Deterministic, offline keyword match used by the public /ats-checker page.
 * No AI call: keywords come from the job description itself, so the score is
 * fully explainable and free to run for anonymous visitors.
 */

const STOPWORDS = new Set(
  `a an the and or but if then than that this those these of in on at to for with without from by as is are was were be been being will shall can could should would may might must have has had do does did not no you your our we they he she it its their his her them us who whom which what when where why how all any both each few more most other some such only own same so too very just about into over under again further once here there both during before after above below off out up down our ours yours theirs i me my mine also per via etc role roles job jobs work working works experience experienced years year team teams strong excellent good ability able skills skill knowledge understanding candidate candidates ideal plus preferred required requirements responsibilities responsibility qualifications you'll we're company position opportunity join looking help ensure using use used across within new`
    .split(/\s+/)
    .filter(Boolean),
);

export type QuickAtsResult = {
  score: number;
  band: string;
  matched: string[];
  missing: string[];
  totalKeywords: number;
  wordCount: number;
  notes: string[];
};

function extractKeywords(jd: string, limit = 30): string[] {
  const normalized = normalizeText(jd);
  const tokens = normalized.split(/\s+/).filter(Boolean);

  const counts = new Map<string, number>();
  const bump = (term: string, weight = 1) => {
    const key = normalizeTerm(term);
    if (!key || key.length < 3) return;
    counts.set(key, (counts.get(key) || 0) + weight);
  };

  tokens.forEach((t) => {
    if (STOPWORDS.has(t) || /^\d+$/.test(t)) return;
    bump(t);
  });

  // Two-word phrases carry more signal than single tokens ("rest api").
  for (let i = 0; i < tokens.length - 1; i++) {
    const a = tokens[i];
    const b = tokens[i + 1];
    if (STOPWORDS.has(a) || STOPWORDS.has(b)) continue;
    if (a.length < 3 || b.length < 3) continue;
    bump(`${a} ${b}`, 1.5);
  }

  const ranked = [...counts.entries()]
    .filter(([, n]) => n >= 1)
    .sort((x, y) => y[1] - x[1] || x[0].localeCompare(y[0]))
    .map(([term]) => term);

  // Drop single words already covered by a higher-ranked phrase.
  const chosen: string[] = [];
  for (const term of ranked) {
    if (chosen.length >= limit) break;
    if (!term.includes(" ") && chosen.some((c) => c.includes(" ") && c.split(" ").includes(term)))
      continue;
    chosen.push(term);
  }
  return chosen;
}

export function quickAtsCheck(resumeText: string, jobDescription: string): QuickAtsResult {
  const keywords = extractKeywords(jobDescription);
  const resumeNorm = normalizeText(resumeText);
  const wordCount = resumeText.trim().split(/\s+/).filter(Boolean).length;

  const matched: string[] = [];
  const missing: string[] = [];
  keywords.forEach((k) => (containsTerm(resumeNorm, k) ? matched : missing).push(k));

  const coverage = keywords.length ? matched.length / keywords.length : 0;
  let score = Math.round(coverage * 100);

  const notes: string[] = [];
  if (wordCount < 250) {
    score -= 8;
    notes.push("Your resume is short (under 250 words) — ATS parsers favour more detail.");
  }
  if (!/\b(\d{4})\b/.test(resumeText)) {
    score -= 4;
    notes.push("No dates detected. Add year ranges to every role so parsers can build a timeline.");
  }
  if (!/(experience|employment|work history)/i.test(resumeText)) {
    score -= 4;
    notes.push('Add a clearly labelled "Experience" section heading.');
  }
  if (!/(education|qualification)/i.test(resumeText)) {
    score -= 3;
    notes.push('Add an "Education" section heading.');
  }
  if (!/(skills)/i.test(resumeText)) {
    score -= 3;
    notes.push('Add a "Skills" section listing your tools and technologies.');
  }
  if (missing.length) {
    notes.push(
      `Weave in the missing keywords where they are genuinely true of your experience — start with: ${missing
        .slice(0, 5)
        .join(", ")}.`,
    );
  }

  score = Math.max(0, Math.min(100, score));
  return {
    score,
    band: scoreBand(score),
    matched,
    missing,
    totalKeywords: keywords.length,
    wordCount,
    notes,
  };
}
