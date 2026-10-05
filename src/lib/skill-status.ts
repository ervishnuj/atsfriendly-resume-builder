import { containsTerm, normalizeTerm, normalizeText } from "./ats-scoring";
import type { ProfileInput } from "./resume-schemas";

export type SkillStatus = "verifiedExperience" | "projectExposure" | "verifiedSkill" | "currentlyTraining" | "currentlyLearning" | "potentialGap" | "notRelevant";
export type SkillEvidence = { term: string; status: SkillStatus; evidence: string; treatment: string; secondary?: "currentlyTraining" | "currentlyLearning" };

const training = /\b(currently\s+)?(training|train(?:ed|ing)?\s+in|undergoing|enrolled|course|classes|bootcamp)\b/i;
const learning = /\b(currently\s+)?(learning|studying|self.studying|developing skills|pursuing studies)\b/i;
const negative = /\b(no experience|not learned|never used|do not know|don't know|not familiar|without experience)\b/i;
const project = /\b(project|personal|academic|portfolio|open.source|capstone)\b/i;

function mentions(text: string, term: string): boolean { return containsTerm(normalizeText(text), term); }
function learningSignal(text: string, term: string): "currentlyTraining" | "currentlyLearning" | null {
  // Keep a status local to its clause; never infer that every skill in a paragraph is in training.
  for (const clause of text.split(/[.;\n]/)) {
    if (!mentions(clause, term) || negative.test(clause)) continue;
    if (training.test(clause)) return "currentlyTraining";
    if (learning.test(clause)) return "currentlyLearning";
  }
  return null;
}

export function classifySkill(profile: ProfileInput, term: string, relevant = true): SkillEvidence {
  const evidence = (status: SkillStatus, text: string, secondary?: SkillEvidence["secondary"]): SkillEvidence => ({
    term, status, evidence: text.trim(), secondary,
    treatment: status === "potentialGap" ? "Do not add to the resume without evidence." :
      status === "notRelevant" ? "Keep only if useful to the candidate's broader resume." :
      status === "currentlyTraining" ? `${term} — Currently Training` :
      status === "currentlyLearning" ? `${term} — Currently Learning` :
      status === "projectExposure" ? "Prioritize the verified project; do not claim professional use." :
      status === "verifiedExperience" ? "Use only the verified professional role's existing evidence." : "List as a skill without claiming work experience.",
  });
  if (!relevant) return evidence("notRelevant", "Not required by this job description.");
  const summary = profile.personal.summary;
  const skillGroups = profile.skills.filter((group) => mentions(group.category, term) || group.items.some((item) => mentions(item, term)));
  const skillText = skillGroups.flatMap((group) => group.items.filter((item) => mentions(item, term)).map((item) => `${group.category}: ${item}`));
  const learning = [summary, ...skillText].map((text) => ({ status: learningSignal(text, term), text })).find((item) => item.status);
  const entries = profile.experience.filter((entry) => mentions([entry.title, entry.company, ...entry.bullets].join(" "), term));
  const projectEntry = entries.find((entry) => project.test(`${entry.title} ${entry.company}`));
  const professionalEntry = entries.find((entry) => !project.test(`${entry.title} ${entry.company}`) && entry.bullets.some((bullet) => mentions(bullet, term) && !learningSignal(bullet, term) && !negative.test(bullet)));
  if (professionalEntry) return evidence("verifiedExperience", professionalEntry.bullets.find((bullet) => mentions(bullet, term)) ?? professionalEntry.title, learning?.status ?? undefined);
  if (projectEntry) return evidence("projectExposure", projectEntry.bullets.find((bullet) => mentions(bullet, term)) ?? `${projectEntry.title} — ${projectEntry.company}`, learning?.status ?? undefined);
  if (learning?.status) return evidence(learning.status, learning.text);
  const explicit = skillText.find((text) => !negative.test(text));
  if (explicit) return evidence("verifiedSkill", explicit);
  return evidence("potentialGap", "No supplied evidence for this requirement.");
}

export function classifyJobSkills(profile: ProfileInput, terms: string[]): SkillEvidence[] {
  const seen = new Set<string>();
  return terms.filter((term) => { const key = normalizeTerm(term); if (!key || seen.has(key)) return false; seen.add(key); return true; })
    .map((term) => classifySkill(profile, term));
}

/** Only canonical source labels may enter an exported skills list. */
export function labelLearningSkills(source: ProfileInput, output: ProfileInput, terms: string[]): ProfileInput {
  const statuses = classifyJobSkills(source, terms);
  const learningSkills = statuses.filter((item) => item.status === "currentlyLearning" || item.status === "currentlyTraining");
  if (!learningSkills.length) return output;
  const normalized = (item: string) => normalizeTerm(item.replace(/\s*[—-]\s*Currently (?:Learning|Training)\s*$/i, ""));
  const skills = output.skills.map((group) => ({ ...group, items: group.items.filter((item) => !learningSkills.some((skill) => normalized(item) === normalizeTerm(skill.term))) }));
  for (const status of learningSkills) {
    // Add only when the candidate actually named the skill in a skill list; summary-only evidence stays in the summary.
    if (!source.skills.some((group) => group.items.some((item) => mentions(item, status.term)))) continue;
    const category = status.status === "currentlyTraining" ? "Currently Training" : "Currently Learning";
    let group = skills.find((item) => item.category === category);
    if (!group) { group = { category, items: [] }; skills.push(group); }
    group.items.push(status.term);
  }
  return { ...output, skills: skills.filter((group) => group.items.length) };
}