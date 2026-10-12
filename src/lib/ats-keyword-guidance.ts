import { classifyJobSkills, type SkillStatus } from "./skill-status";
import { parseResumeText } from "./resume-parser";
import type { QuickAtsResult } from "./ats-quick";

export type KeywordGuidance = {
  term: string;
  status: SkillStatus;
  label: string;
  evidence: string;
  action: string;
  required: boolean;
};

/** Presentation-only evidence review: never modifies inputs or score weights. */
export function atsKeywordGuidance(text: string, result: QuickAtsResult): KeywordGuidance[] {
  const profile = parseResumeText(text).profile;
  const terms = [...new Set([...result.matchedKeywords, ...result.missingKeywords])];
  return classifyJobSkills(profile, terms).map((item) => {
    const common = { term: item.term, status: item.status, evidence: item.evidence, required: result.missingRequiredKeywords.includes(item.term) };
    switch (item.status) {
      case "verifiedExperience": return { ...common, label: "Work evidence supplied", action: "Keep this keyword in the existing professional experience bullet. Preserve the role and the scope of your contribution." };
      case "projectExposure": return { ...common, label: "Project evidence supplied", action: "Describe the supplied project in Projects or Experience & Projects. Do not present it as employment." };
      case "verifiedSkill": return { ...common, label: "Skill listed in resume", action: "Keep it in Technical Skills. Include it in Summary or an experience bullet only if you can supply specific supporting details." };
      case "currentlyTraining": return { ...common, label: "Training — not professional experience", action: "Keep the training label in Technical Skills or Certifications and Training. Name the course and completed work only if accurate." };
      case "currentlyLearning": return { ...common, label: "Learning — not professional experience", action: "Use a Currently Learning label in Technical Skills. Add a project only after you can describe work you actually completed." };
      default: return { ...common, label: "Needs confirmation", action: "The resume does not clearly establish this requirement. If you have relevant training, a project, or work experience, supply details in that section; otherwise leave it out." };
    }
  });
}