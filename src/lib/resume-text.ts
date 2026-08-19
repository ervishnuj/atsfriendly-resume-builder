import type { ProfileInput } from "./resume-schemas";

/**
 * Renders a profile (or a generated resume) as plain resume text so that the
 * deterministic ATS engine always scores the *same* artefact the recruiter's
 * ATS would parse — never the raw JSON structure.
 */
export function profileToResumeText(profile: ProfileInput): string {
  const p = profile.personal;
  const lines: string[] = [];
  lines.push(p.fullName, p.title);
  lines.push([p.email, p.phone, p.linkedin, p.github, p.portfolio].filter(Boolean).join(" | "));
  if (p.summary) lines.push("", "SUMMARY", p.summary);
  if (profile.skills.length) {
    lines.push("", "SKILLS");
    for (const g of profile.skills) lines.push(`${g.category}: ${g.items.join(", ")}`);
  }
  if (profile.experience.length) {
    lines.push("", "EXPERIENCE");
    for (const e of profile.experience) {
      lines.push(`${e.title} — ${e.company} (${e.dateRange})`);
      for (const b of e.bullets) lines.push(`- ${b}`);
    }
  }
  if (profile.education.length) {
    lines.push("", "EDUCATION");
    for (const e of profile.education)
      lines.push(`${e.degree} ${e.major} — ${e.institution} ${e.year} ${e.score}`.trim());
  }
  return lines.filter((l) => l !== undefined).join("\n").replace(/\n{3,}/g, "\n\n").trim();
}
