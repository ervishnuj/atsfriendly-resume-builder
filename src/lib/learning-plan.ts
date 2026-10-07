import { z } from "zod";
import type { ProfileInput } from "./resume-schemas";

export const MilestoneSchema = z.object({
  id: z.string().min(1).max(40),
  title: z.string().min(1).max(200),
  kind: z.enum(["learning", "training", "project"]),
  status: z.enum(["notStarted", "inProgress", "completed"]),
  evidence: z.string().max(600).default(""),
  addedToProfile: z.boolean().default(false),
});
export type Milestone = z.infer<typeof MilestoneSchema>;

export type LearningPlan = {
  id: string;
  jobTitle: string;
  skill: string;
  priority: string;
  why: string;
  milestones: Milestone[];
  updatedAt: string;
};

/** Deterministic milestones: no AI request is needed to create or update a plan. */
export function defaultMilestones(skill: string): Milestone[] {
  return [
    { id: "fundamentals", kind: "learning", title: `Learn the fundamentals of ${skill}`, status: "notStarted", evidence: "", addedToProfile: false },
    { id: "course", kind: "training", title: `Complete a guided course or training in ${skill}`, status: "notStarted", evidence: "", addedToProfile: false },
    { id: "project", kind: "project", title: `Build a small practice project using ${skill}`, status: "notStarted", evidence: "", addedToProfile: false },
  ];
}

export function planProgress(milestones: Milestone[]): number {
  if (!milestones.length) return 0;
  const points = milestones.reduce((sum, m) => sum + (m.status === "completed" ? 1 : m.status === "inProgress" ? 0.5 : 0), 0);
  return Math.round((points / milestones.length) * 100);
}

export type ProfileAddition = { milestoneId: string; description: string; apply: (profile: ProfileInput) => ProfileInput };

/**
 * What a completed milestone may truthfully add. Learning and training stay labeled skills;
 * only a project with the user's own description becomes a personal project entry — never employment.
 */
export function proposeProfileAddition(skill: string, milestone: Milestone): ProfileAddition | null {
  if (milestone.status !== "completed" || milestone.addedToProfile) return null;
  if (milestone.kind === "project") {
    const bullet = milestone.evidence.trim();
    if (!bullet) return null;
    const title = `${skill} Practice Project`;
    return {
      milestoneId: milestone.id,
      description: `Add a personal project "${title}" with your description: "${bullet}"`,
      apply: (profile) => profile.experience.some((e) => e.title === title && e.company === "Personal Project")
        ? profile
        : { ...profile, experience: [...profile.experience, { title, company: "Personal Project", dateRange: "", bullets: [bullet] }] },
    };
  }
  const label = milestone.kind === "training" ? "Currently Training" : "Currently Learning";
  const item = `${skill} — ${label}`;
  return {
    milestoneId: milestone.id,
    description: `Add "${item}" to your skills under "${label}"`,
    apply: (profile) => {
      const base = (s: string) => s.replace(/\s*[—-]\s*Currently (?:Learning|Training)\s*$/i, "").trim().toLowerCase();
      const skills = profile.skills.map((g) => ({ ...g, items: g.items.filter((i) => !(base(i) === skill.toLowerCase() && /Currently (Learning|Training)/i.test(i))) }));
      const group = skills.find((g) => g.category === label);
      if (group) group.items.push(item); else skills.push({ category: label, items: [item] });
      return { ...profile, skills: skills.filter((g) => g.items.length) };
    },
  };
}
