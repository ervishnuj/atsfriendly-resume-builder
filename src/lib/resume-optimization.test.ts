import { describe, expect, it } from "vitest";
import { classifyRequirements, describeChanges, repairResumeReadability, validateOptimizedProfile } from "./resume-optimization";
import { computeAtsScores, type AtsExtraction } from "./ats-scoring";
import { profileToResumeText } from "./resume-text";
import type { ProfileInput } from "./resume-schemas";
import { buildResumeGenerationPayload } from "./ai-payloads";

const source: ProfileInput = {
  personal: { fullName: "Casey Sample", title: "Developer", email: "casey@example.test", phone: "555 010 4567", linkedin: "", github: "", portfolio: "", summary: "Developer with Java experience." },
  skills: [{ category: "Technical", items: ["Java", "Spring Boot", "MySQL"] }],
  experience: [{ title: "Developer", company: "Example Co", dateRange: "2022–2024", bullets: ["Built Java services with Spring Boot."] }],
  education: [{ degree: "BSc", major: "Computing", institution: "Example School", year: "2021", score: "" }],
};
const extraction: AtsExtraction = {
  jobTitle: "Developer", requiredSkills: ["Java", "Spring Boot", "AWS"], preferredSkills: ["MySQL"], technicalKeywords: [], responsibilities: [],
  minYearsExperience: 0, educationRequirements: [], candidateYearsExperience: 2,
  candidateTitles: ["Developer"], candidateEducation: ["BSc"], skillEvidence: [], responsibilityEvidence: [], strengths: [], weaknesses: [], suggestions: [],
};

describe("truthful resume optimization", () => {
  it("separates verified strengths, underrepresentation and genuine gaps", () => {
    expect(classifyRequirements(extraction, profileToResumeText(source), "Developer with Java experience.")).toEqual({
      strong: ["Java"], underrepresented: ["Spring Boot", "MySQL"], potentialGaps: ["AWS"],
    });
  });
  it("rejects hallucinated roles, titles, skills, dates, metrics and novel claims", () => {
    const changed: ProfileInput = {
      ...source,
      personal: { ...source.personal, fullName: "Another Person", email: "wrong@example.test", summary: "Led Kubernetes teams with 50% growth." },
      skills: [{ category: "Technical", items: ["AWS", "Java"] }],
      experience: [
        { title: "Director", company: "Other Co", dateRange: "2025", bullets: ["Led 50 engineers"] },
        { ...source.experience[0], bullets: ["Scaled AWS by 50%."] },
      ],
      education: [],
    };
    const checked = validateOptimizedProfile(source, changed);
    expect(checked.personal).toEqual(source.personal);
    expect(checked.experience).toEqual(source.experience);
    expect(checked.education).toEqual(source.education);
    expect(checked.skills.flatMap((g) => g.items).sort()).toEqual(["Java", "MySQL", "Spring Boot"]);
  });
  it("never sends identity to the optimizer, but restores it in the output", () => {
    const payload = buildResumeGenerationPayload(source);
    expect(payload.personal.fullName).toBe("");
    expect(payload.personal.email).toBe("");
    expect(payload.personal.phone).toBe("");
    expect(validateOptimizedProfile(source, payload).personal.fullName).toBe(source.personal.fullName);
  });
  it("rejects unsupported action verbs and claims borrowed from other entries", () => {
    const proposed = { ...source, experience: [{ ...source.experience[0], bullets: ["Led Java services with Spring Boot."] }] };
    expect(validateOptimizedProfile(source, proposed).experience[0].bullets).toEqual(source.experience[0].bullets);
  });
  it("does not transfer a date or metric from elsewhere in the profile into a bullet", () => {
    const proposed = { ...source, experience: [{ ...source.experience[0], bullets: ["Built 2024 Java services with Spring Boot."] }] };
    expect(validateOptimizedProfile(source, proposed).experience[0].bullets).toEqual(source.experience[0].bullets);
  });
  it("keeps profile fit fixed while evaluating the newly represented resume", () => {
    const original = profileToResumeText(source);
    const before = computeAtsScores(original, "Developer Java Spring Boot AWS", extraction);
    const proposed = { ...source, personal: { ...source.personal, summary: "Developer with Java and Spring Boot experience." } };
    const afterProfile = validateOptimizedProfile(source, proposed);
    const after = computeAtsScores(profileToResumeText(afterProfile), "Developer Java Spring Boot AWS", extraction);
    expect(before.atsMatchScore).toBeLessThanOrEqual(after.atsMatchScore);
    expect(classifyRequirements(extraction, original, profileToResumeText(afterProfile)).potentialGaps).toContain("AWS");
    expect(describeChanges(source, afterProfile, { before, after })[0].change).toContain("summary");
  });
  it("cleans up bullets without adding new claims", () => {
    const cleaned = repairResumeReadability({ ...source, experience: [{ ...source.experience[0], bullets: ["•  Built   Java services with Spring Boot."] }] });
    expect(cleaned.experience[0].bullets[0]).toBe("Built Java services with Spring Boot.");
  });
});