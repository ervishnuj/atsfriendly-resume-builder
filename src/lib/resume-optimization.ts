import type { AtsExtraction, AtsScoreResult } from "./ats-scoring";
import { containsTerm, normalizeTerm, normalizeText } from "./ats-scoring";
import type { ProfileInput } from "./resume-schemas";
import { classifyJobSkills, labelLearningSkills, type SkillEvidence } from "./skill-status";

export type RequirementGroup = {
  strong: string[];
  underrepresented: string[];
  potentialGaps: string[];
  details?: SkillEvidence[];
};

export type LearningStep = { skill: string; why: string; priority: "High" | "Medium"; learning: string; practice: string };

/** Gap guidance is about future learning, never a claim about the candidate. */
export function planForGaps(extraction: AtsExtraction, gaps: string[]): LearningStep[] {
  const required = new Set(extraction.requiredSkills.map(normalizeTerm));
  return gaps.map((skill) => ({
    skill,
    why: required.has(normalizeTerm(skill)) ? "Required in this job description; not found in the provided profile/resume." : "Preferred in this job description; not found in the provided profile/resume.",
    priority: required.has(normalizeTerm(skill)) ? "High" : "Medium",
    learning: `Learn the fundamentals of ${skill}, then work through its official documentation and a guided exercise.`,
    practice: `Build a small practice project using ${skill}; add it to your profile only after completing it.`,
  }));
}

export type ReadabilityIssue = { code: string; message: string };

/** Audit only properties we can actually inspect in structured resume content. */
export function auditResumeReadability(profile: ProfileInput): ReadabilityIssue[] {
  const issues: ReadabilityIssue[] = [];
  if (!profile.personal.fullName.trim()) issues.push({ code: "name", message: "Add your name to the contact header." });
  if (!profile.personal.email.trim() && !profile.personal.phone.trim()) issues.push({ code: "contact", message: "Add an email address or phone number to the contact header." });
  if (!profile.personal.summary.trim()) issues.push({ code: "summary", message: "Add a verified professional summary." });
  if (!profile.skills.some((group) => group.items.some(Boolean))) issues.push({ code: "skills", message: "Add verified skills." });
  if (!profile.experience.some((entry) => entry.title.trim() || entry.company.trim())) issues.push({ code: "experience", message: "Add experience or projects, if applicable." });
  if (!profile.education.some((entry) => entry.degree.trim() || entry.institution.trim())) issues.push({ code: "education", message: "Add education details, if applicable." });
  for (const [i, entry] of profile.experience.entries()) {
    if (!entry.dateRange.trim()) issues.push({ code: `date-${i}`, message: `${entry.title || entry.company || "An entry"} has no date range; confirm it in your profile.` });
    for (const [j, bullet] of entry.bullets.entries()) {
      if (/^\s*[-•*]/.test(bullet) || /\s{2,}/.test(bullet)) issues.push({ code: `spacing-${i}-${j}`, message: "Inconsistent bullet spacing or markers." });
      if (bullet.trim().split(/\s+/).length > 45) issues.push({ code: `length-${i}-${j}`, message: "A bullet is longer than 45 words; shorten it without removing facts." });
    }
  }
  if (profile.skills.some((group) => new Set(group.items.map(normalizeTerm)).size !== group.items.length)) issues.push({ code: "duplicates", message: "Duplicate skills found." });
  return issues;
}

/** Rank existing entries by literal evidence; never insert a JD term into an entry. */
export function prioritizeVerifiedExperience(profile: ProfileInput, extraction: AtsExtraction): ProfileInput {
  const terms = [...extraction.requiredSkills, ...extraction.preferredSkills, ...extraction.technicalKeywords];
  const score = (entry: ProfileInput["experience"][number]) => {
    const text = normalizeText([entry.title, entry.company, ...entry.bullets].join(" "));
    return terms.reduce((total, term) => total + (containsTerm(text, term) ? 1 : 0), 0);
  };
  return { ...profile, experience: profile.experience.map((entry, index) => ({ entry, index }))
    .sort((a, b) => score(b.entry) - score(a.entry) || a.index - b.index).map(({ entry }) => entry) };
}

/** Never treat a model's unsupported presence claim as verified evidence. */
export function classifyRequirements(
  extraction: AtsExtraction,
  sourceText: string,
  currentText: string,
  profile?: ProfileInput,
): RequirementGroup {
  const source = normalizeText(sourceText);
  const current = normalizeText(currentText);
  const seen = new Set<string>();
  const groups: RequirementGroup = { strong: [], underrepresented: [], potentialGaps: [] };
  if (profile) groups.details = classifyJobSkills(profile, [...extraction.requiredSkills, ...extraction.preferredSkills, ...extraction.technicalKeywords]);
  for (const term of [...extraction.requiredSkills, ...extraction.preferredSkills, ...extraction.technicalKeywords]) {
    const key = normalizeTerm(term);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    const evidence = extraction.skillEvidence.find((item) => normalizeTerm(item.term) === key);
    const quote = normalizeText(evidence?.evidence ?? "").trim();
    const supported = containsTerm(source, term) || Boolean(evidence?.present && quote.length >= 4 && source.includes(quote));
    const status = groups.details?.find((item) => normalizeTerm(item.term) === key);
    if (status?.status === "potentialGap" || (!status && !supported)) groups.potentialGaps.push(term);
    else if (status && (status.status === "currentlyLearning" || status.status === "currentlyTraining") && !containsTerm(current, term)) groups.underrepresented.push(term);
    else if (containsTerm(current, term)) groups.strong.push(term);
    else groups.underrepresented.push(term);
  }
  return groups;
}

export function learningAwareWeights(profile: ProfileInput, extraction: AtsExtraction): Map<string, number> {
  const weights: Record<SkillEvidence["status"], number> = { verifiedExperience: 1, projectExposure: 0.8, verifiedSkill: 0.7, currentlyTraining: 0.35, currentlyLearning: 0.35, potentialGap: 0, notRelevant: 0 };
  return new Map(classifyJobSkills(profile, [...extraction.requiredSkills, ...extraction.preferredSkills, ...extraction.technicalKeywords])
    .map((item) => [normalizeTerm(item.term), weights[item.status]]));
}

export { labelLearningSkills };

/** Surface relevant skills without inventing synonyms or removing learning qualifiers. */
export function prioritizeVerifiedSkills(profile: ProfileInput, extraction: AtsExtraction): ProfileInput {
  const terms = [...extraction.requiredSkills, ...extraction.preferredSkills, ...extraction.technicalKeywords];
  const relevance = (item: string) => terms.reduce((total, term, index) =>
    total + (containsTerm(normalizeText(item), term) ? terms.length - index : 0), 0);
  const skills = profile.skills.map((group) => ({ ...group,
    items: group.items.map((item, index) => ({ item, index })).sort((a, b) => relevance(b.item) - relevance(a.item) || a.index - b.index).map(({ item }) => item),
  }));
  return { ...profile, skills: skills.map((group, index) => ({ group, index }))
    .sort((a, b) => Math.max(0, ...b.group.items.map(relevance)) - Math.max(0, ...a.group.items.map(relevance)) || a.index - b.index)
    .map(({ group }) => group) };
}

/** A rewrite is not an improvement if either existing deterministic score falls. */
export function keepOptimizedCandidate(before: AtsScoreResult, after: AtsScoreResult): boolean {
  return after.atsScore >= before.atsScore && after.atsMatchScore >= before.atsMatchScore;
}

/** Scores include content and JD evidence, not just formatting; never promise a target. */
export function explainScoreTarget(scores: AtsScoreResult): { readiness: string[]; match: string[] } {
  const readiness: string[] = [];
  const match: string[] = [];
  if (scores.atsScore < 95) {
    if (scores.breakdown.contact < 10) readiness.push("Complete your real contact details, including a professional link if you have one.");
    if (scores.breakdown.structure < 20 || scores.breakdown.sections < 15) readiness.push("Supply missing summary, skills, experience/project and education details where applicable; empty sections do not establish evidence.");
    if (scores.breakdown.keywords < 20 || scores.breakdown.jobRelevance < 15) readiness.push("The readiness score also includes job keywords and relevance. Missing skills cannot be repaired through formatting alone.");
    if (scores.breakdown.experience < 10) readiness.push("Add actual outcomes and measurements you can substantiate. Do not invent numbers to increase the score.");
    if (scores.breakdown.formatting < 10) readiness.push("Review long bullets and resume length; use a plain single-column layout such as ATS Classic.");
  }
  if (scores.atsMatchScore < 95) {
    if (scores.missingRequiredKeywords.length) match.push(`Required evidence not found: ${scores.missingRequiredKeywords.join(", ")}.`);
    if (scores.missingPreferredKeywords.length) match.push(`Preferred evidence not found: ${scores.missingPreferredKeywords.join(", ")}.`);
    if (scores.matchBreakdown.requiredSkills < 40 || scores.matchBreakdown.technicalKeywords < 25) match.push("Learning, training and project exposure receive partial fit credit; only substantiated professional use receives full weight.");
    if (scores.matchBreakdown.responsibilities < 15) match.push("Document actual examples of the job's responsibilities; wording alone does not prove them.");
    if (scores.matchBreakdown.experience < 10 || scores.matchBreakdown.education < 5 || scores.matchBreakdown.jobTitle < 5) match.push("Experience duration, education and role alignment must come from your real background, not the target job title.");
  }
  return { readiness, match };
}

/** Restore all identity, claims and skills from the source. Unsafe rewrites fall back to source wording. */
export function validateOptimizedProfile(source: ProfileInput, proposed: ProfileInput): ProfileInput {
  if (!proposed || !proposed.personal || !Array.isArray(proposed.experience)) {
    throw new Error("The generated resume was incomplete. Please try again.");
  }
  const sourceWords = new Set(normalizeText(JSON.stringify(source)).split(/\s+/));
  // Only grammatical connectors are free. New action verbs/claims must be present in the specific source bullet.
  const connectiveWords = new Set("a an and as at by for from in into of on or the to with using through across while".split(" "));
  const safeText = (text: string, fallback: string, allowedWords = sourceWords) => {
    if (typeof text !== "string") return fallback;
    // Word membership alone cannot distinguish negation or training from professional use.
    // Retain source wording whenever a qualified claim is rewritten.
    if (/\b(not|no|never|without|learning|training|studying|enrolled|assisted|supported)\b/i.test(fallback)
      && normalizeText(text).trim() !== normalizeText(fallback).trim()) return fallback;
    const newNumbers = text.match(/\d+(?:[.,]\d+)*%?/g) ?? [];
    const originalNumbers = new Set(fallback.match(/\d+(?:[.,]\d+)*%?/g) ?? []);
    const newClaims = normalizeText(text).split(/\s+/).filter((word) => word.length > 2 && !allowedWords.has(word) && !connectiveWords.has(word));
    return newNumbers.every((n) => originalNumbers.has(n)) && newClaims.length === 0 ? text : fallback;
  };
  const originalSkills = new Set(source.skills.flatMap((g) => g.items.map(normalizeTerm)));
  const skills = Array.isArray(proposed.skills) ? proposed.skills.map((group) => ({
    category: source.skills.some((original) => original.category === group.category) ? group.category : "Skills",
    items: Array.isArray(group.items) ? group.items.filter((item) => typeof item === "string" && originalSkills.has(normalizeTerm(item))) : [],
  })).filter((g) => g.items.length > 0) : [];
  const included = new Set(skills.flatMap((g) => g.items.map(normalizeTerm)));
  for (const group of source.skills) {
    const rest = group.items.filter((item) => !included.has(normalizeTerm(item)));
    if (rest.length) skills.push({ category: group.category, items: rest });
  }

  // Only source entries may appear; fixed identity fields always come from the profile.
  const remaining = [...source.experience];
  const experience = proposed.experience.flatMap((entry) => {
    const index = remaining.findIndex((original) => original.title === entry.title && original.company === entry.company && original.dateRange === entry.dateRange);
    if (index < 0) return [];
    const original = remaining.splice(index, 1)[0];
    return [{ ...original, bullets: Array.isArray(entry.bullets) && entry.bullets.length === original.bullets.length
      ? entry.bullets.map((bullet, i) => safeText(bullet, original.bullets[i], new Set(normalizeText(original.bullets[i]).split(/\s+/))))
      : original.bullets }];
  });
  return {
    personal: { ...source.personal, summary: safeText(proposed.personal.summary, source.personal.summary) },
    skills,
    experience: [...experience, ...remaining],
    education: source.education,
  };
}

/** Keep final exported text readable without inventing new content. */
export function repairResumeReadability(profile: ProfileInput): ProfileInput {
  return {
    ...profile,
    personal: { ...profile.personal, summary: profile.personal.summary.replace(/\s+/g, " ").trim() },
    skills: profile.skills.map((group) => ({ ...group, items: group.items.map((item) => item.trim()).filter((item, index, items) => item && items.findIndex((other) => normalizeTerm(other) === normalizeTerm(item)) === index) })),
    experience: profile.experience.map((entry) => ({
      ...entry,
      bullets: entry.bullets.map((bullet) => bullet.replace(/^\s*[-•*]\s*/, "").replace(/\s+/g, " ").trim()),
    })),
  };
}

export function describeChanges(before: ProfileInput, after: ProfileInput, scores: { before: AtsScoreResult; after: AtsScoreResult }): { change: string; why: string }[] {
  const changes: { change: string; why: string }[] = [];
  if (before.personal.summary !== after.personal.summary) changes.push({ change: "Professional summary tailored", why: "The summary now foregrounds relevant, supplied background." });
  if (JSON.stringify(before.skills) !== JSON.stringify(after.skills)) changes.push({ change: "Skills reorganized", why: "Verified skills are easier to find near the top of the resume." });
  if (JSON.stringify(before.experience) !== JSON.stringify(after.experience)) changes.push({ change: "Experience clarified", why: "Relevant source experience is prioritized and described more clearly." });
  const newlyVisible = scores.after.matchedKeywords.filter((term) => !scores.before.matchedKeywords.includes(term));
  if (newlyVisible.length) changes.push({ change: `${newlyVisible.join(", ")} now represented`, why: "These requirements are supported by the profile and now appear in the resume." });
  if (!changes.length) changes.push({ change: "No substantive content changes", why: "The source material could not safely be improved without adding unsupported claims." });
  return changes;
}