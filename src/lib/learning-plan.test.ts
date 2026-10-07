import { describe, expect, it } from "vitest";
import { defaultMilestones, planProgress, proposeProfileAddition } from "./learning-plan";
import { classifySkill } from "./skill-status";
import type { ProfileInput } from "./resume-schemas";

const profile: ProfileInput = {
  personal: { fullName: "Test", title: "", email: "", phone: "", linkedin: "", github: "", portfolio: "", summary: "" },
  skills: [{ category: "Languages", items: ["Java"] }],
  experience: [{ title: "Developer", company: "Acme", dateRange: "2022", bullets: ["Built Java services"] }],
  education: [],
};

describe("learning plan milestones (synthetic)", () => {
  it("tracks progress", () => {
    const m = defaultMilestones("Docker");
    expect(planProgress(m)).toBe(0);
    m[0].status = "completed"; m[1].status = "inProgress";
    expect(planProgress(m)).toBe(50);
  });

  it("proposes nothing until completed and never re-adds", () => {
    const [learn] = defaultMilestones("Docker");
    expect(proposeProfileAddition("Docker", learn)).toBeNull();
    expect(proposeProfileAddition("Docker", { ...learn, status: "completed", addedToProfile: true })).toBeNull();
  });

  it("adds training as a labeled skill, classified as training not experience", () => {
    const [, course] = defaultMilestones("Docker");
    const next = proposeProfileAddition("Docker", { ...course, status: "completed" })!.apply(profile);
    expect(next.skills.find((g) => g.category === "Currently Training")?.items).toEqual(["Docker — Currently Training"]);
    expect(next.experience).toHaveLength(1);
    expect(classifySkill(next, "Docker").status).toBe("currentlyTraining");
  });

  it("requires a description for projects and adds them only as personal projects", () => {
    const project = { ...defaultMilestones("Docker")[2], status: "completed" as const };
    expect(proposeProfileAddition("Docker", project)).toBeNull();
    const next = proposeProfileAddition("Docker", { ...project, evidence: "Containerized a Docker todo app" })!.apply(profile);
    expect(next.experience.at(-1)).toMatchObject({ company: "Personal Project", dateRange: "" });
    expect(classifySkill(next, "Docker").status).toBe("projectExposure");
  });
});
