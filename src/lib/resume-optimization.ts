import type { AtsExtraction, AtsScoreResult } from "./ats-scoring";
import { containsTerm, normalizeTerm, normalizeText } from "./ats-scoring";
import type { ProfileInput } from "./resume-schemas";

export type RequirementGroup = {
  strong: string[];
  underrepresented: string[];
  potentialGaps: string[];
};

/** Never treat a model's unsupported presence claim as verified evidence. */
export function classifyRequirements(
  extraction: AtsExtraction,
  sourceText: string,
  currentText: string,
): RequirementGroup {
  const source = normalizeText(sourceText);
  const current = normalizeText(currentText);
  const seen = new Set<string>();
  const groups: RequirementGroup = { strong: [], underrepresented: [], potentialGaps: [] };
  for (const term of [...extraction.requiredSkills, ...extraction.preferredSkills, ...extraction.technicalKeywords]) {
    const key = normalizeTerm(term);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    const evidence = extraction.skillEvidence.find((item) => normalizeTerm(item.term) === key);
    const quote = normalizeText(evidence?.evidence ?? "").trim();
    const supported = containsTerm(source, term) || Boolean(evidence?.present && quote.length >= 4 && source.includes(quote));
    if (!supported) groups.potentialGaps.push(term);
    else if (containsTerm(current, term)) groups.strong.push(term);
    else groups.underrepresented.push(term);
  }
  return groups;
}

/** Restore all identity, claims and skills from the source. Unsafe rewrites fall back to source wording. */
export function validateOptimizedProfile(source: ProfileInput, proposed: ProfileInput): ProfileInput {
  if (!proposed || !proposed.personal || !Array.isArray(proposed.experience)) {
    throw new Error("The generated resume was incomplete. Please try again.");
  }
  const originalNumbers = new Set((JSON.stringify(source).match(/\d+(?:[.,]\d+)*%?/g) ?? []));
  const sourceWords = new Set(normalizeText(JSON.stringify(source)).split(/\s+/));
  // Only grammatical connectors are free. New action verbs/claims must be present in the specific source bullet.
  const connectiveWords = new Set("a an and as at by for from in into of on or the to with using through across while".split(" "));
  const safeText = (text: string, fallback: string, allowedWords = sourceWords) => {
    if (typeof text !== "string") return fallback;
    const newNumbers = text.match(/\d+(?:[.,]\d+)*%?/g) ?? [];
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
    skills: profile.skills.map((group) => ({ ...group, items: [...new Set(group.items.filter(Boolean))] })),
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