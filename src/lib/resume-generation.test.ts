import { describe, expect, it, vi } from "vitest";
vi.mock("./gemini.server", () => ({ callGeminiJson: vi.fn(), resumeSchema: {}, atsExtractionSchema: {}, NO_FABRICATION_RULES: "No invented facts" }));
import { callGeminiJson } from "./gemini.server";
import { generateOptimizedResume } from "./resume-ai.server";
import { computeAtsScores, type AtsExtraction } from "./ats-scoring";
import { prepareOptimizationSource, validateOptimizedProfile } from "./resume-optimization";
import { profileToResumeText } from "./resume-text";
import type { ProfileInput } from "./resume-schemas";

const base: ProfileInput = {
  personal: { fullName: "Synthetic Candidate", title: "Developer", email: "sample@example.test", phone: "+91 9000000000", linkedin: "https://linkedin.com/in/sample", github: "", portfolio: "", summary: "Developer building Java services." },
  skills: [], experience: [{ title: "Developer", company: "Sample", dateRange: "2020–2025", bullets: ["Building Java services with Spring Boot.", "Created 2 Java services."] }],
  education: [{ degree: "BSc", major: "Computing", institution: "Sample University", year: "2020", score: "" }],
};
const jd: AtsExtraction = { jobTitle: "Developer", requiredSkills: ["Java", "Spring Boot"], preferredSkills: [], technicalKeywords: ["Java", "Spring Boot"], responsibilities: ["Build Java services"], minYearsExperience: 2, educationRequirements: ["Bachelor"], candidateYearsExperience: 5, candidateTitles: ["Developer"], candidateEducation: ["BSc"], skillEvidence: [], responsibilityEvidence: [{ responsibility: "Build Java services", present: true, evidence: "Building Java services with Spring Boot." }], strengths: [], weaknesses: [], suggestions: [] };

describe("automatic generation quality (mocked AI; no requests or credits)", () => {
  it.each([
    { name: "professional with omitted skills", candidate: base, requirements: jd, expected: "Technical Skills: Java, Spring Boot" },
    { name: "fresher with a personal project", candidate: { ...base, experience: [{ ...base.experience[0], title: "Personal Project", company: "Personal" }] }, requirements: { ...jd, candidateYearsExperience: 0 }, expected: "Project Experience: Java, Spring Boot" },
    { name: "learning in an existing entry", candidate: { ...base, experience: [{ ...base.experience[0], bullets: ["Currently learning Java."] }] }, requirements: jd, expected: "Currently Learning: Java" },
    { name: "training in summary", candidate: { ...base, personal: { ...base.personal, summary: "Currently training in Spring Boot." }, experience: [] }, requirements: jd, expected: "Currently Training: Spring Boot" },
    { name: "unrelated candidate with genuine gaps", candidate: { ...base, experience: [], personal: { ...base.personal, summary: "Customer service representative." } }, requirements: jd, expected: "Customer service representative" },
    { name: "data analyst with Python and SQL", candidate: { ...base, personal: { ...base.personal, title: "Data Analyst" }, experience: [{ title: "Data Analyst", company: "Sample", dateRange: "2020–2025", bullets: ["Built Python reports with SQL."] }] }, requirements: { ...jd, jobTitle: "Data Analyst", requiredSkills: ["Python", "SQL"], technicalKeywords: ["Python", "SQL"], responsibilities: [], responsibilityEvidence: [], candidateTitles: ["Data Analyst"] }, expected: "Technical Skills: Python, SQL" },
    { name: "cloud engineer with a full AWS name", candidate: { ...base, personal: { ...base.personal, title: "Cloud Engineer" }, experience: [{ title: "Cloud Engineer", company: "Sample", dateRange: "2020–2025", bullets: ["Deployed services on Amazon Web Services."] }] }, requirements: { ...jd, jobTitle: "Cloud Engineer", requiredSkills: ["AWS"], technicalKeywords: ["AWS"], responsibilities: [], responsibilityEvidence: [], candidateTitles: ["Cloud Engineer"] }, expected: "Technical Skills: AWS" },
  ])("generates $name from verified evidence", async ({ candidate, requirements, expected }) => {
    const original = JSON.stringify(candidate);
    const prepared = prepareOptimizationSource(candidate, requirements);
    vi.mocked(callGeminiJson).mockReset();
    vi.mocked(callGeminiJson).mockResolvedValueOnce(requirements).mockResolvedValueOnce(requirements)
      .mockResolvedValueOnce({ optimizedProfile: prepared, atsScore: 99 }).mockResolvedValueOnce(requirements);
    const result = await generateOptimizedResume(candidate, `${requirements.jobTitle}: ${requirements.requiredSkills.join(", ")}. ${requirements.responsibilities.join(". ")}. Bachelor's degree; 2 years.`, "Weak current resume with Kubernetes claims.");
    expect(profileToResumeText(result.optimizedProfile)).toContain(expected);
    expect(profileToResumeText(result.optimizedProfile)).not.toContain("Kubernetes");
    expect(JSON.stringify(candidate)).toBe(original);
    expect(result.atsScore).toBe(result.ats?.atsScore);
    expect(result.optimizedProfile.personal.fullName).toBe(candidate.personal.fullName);
    expect(callGeminiJson).toHaveBeenCalledTimes(4);
  });

  it("accepts same-action inflections and reordering but never duplicate or borrowed claims", () => {
    const proposed = { ...base, experience: [{ ...base.experience[0], bullets: ["Created 2 Java services.", "Built Java services with Spring Boot."] }] };
    expect(validateOptimizedProfile(base, proposed).experience[0].bullets).toEqual(proposed.experience[0].bullets);
    proposed.experience[0].bullets = ["Created 2 Java services.", "Created 2 Java services."];
    expect(validateOptimizedProfile(base, proposed).experience[0].bullets).toEqual(base.experience[0].bullets);
    proposed.experience[0].bullets = ["Built 2 Java services with Spring Boot.", "Created 2 Java services."];
    expect(validateOptimizedProfile(base, proposed).experience[0].bullets).toEqual(base.experience[0].bullets);
  });

  it("credits actual action-led bullets rather than their list markers", () => {
    const score = computeAtsScores(profileToResumeText({ ...base, experience: [{ ...base.experience[0], bullets: ["Built 2 Java services.", "Created 2 Java services."] }] }), "Java", jd);
    expect(score.breakdown.experience).toBe(8);
  });

  it("keeps project exposure categorized and preserves labels during attempted promotion", () => {
    const candidate = { ...base, skills: [{ category: "Project Experience", items: ["Java"] }] };
    const promoted = validateOptimizedProfile(candidate, { ...candidate, skills: [{ category: "Technical Skills", items: ["Java"] }] });
    expect(promoted.skills.find((group) => group.items.includes("Java"))?.category).toBe("Project Experience");
  });

  it("keeps the source-backed baseline if the generated artifact scores worse", async () => {
    const prepared = prepareOptimizationSource(base, jd);
    vi.mocked(callGeminiJson).mockReset();
    vi.mocked(callGeminiJson).mockResolvedValueOnce(jd).mockResolvedValueOnce({ optimizedProfile: prepared, atsScore: 100 })
      .mockResolvedValueOnce({ ...jd, candidateYearsExperience: 0, candidateTitles: [], candidateEducation: [], responsibilityEvidence: [] });
    const result = await generateOptimizedResume(base, "Developer Java Spring Boot");
    expect(result.optimizedProfile).toEqual(prepared);
    expect(result.atsMatchScore).toBe(computeAtsScores(profileToResumeText(prepared), "Developer Java Spring Boot", jd, new Map([["java", 1], ["spring boot", 1]])).atsMatchScore);
  });

  it("allows 95+ alignment when professional evidence supports every requirement, without a floor", async () => {
    const strong = { ...base, experience: [{ ...base.experience[0], bullets: ["Built 2 Java services with Spring Boot.", "Created 2 Java services.", "Developed 3 Java services.", "Implemented 4 Java services.", "Delivered 5 Java services."] }] };
    const facts = { ...jd, responsibilityEvidence: [{ responsibility: "Build Java services", present: true, evidence: strong.experience[0].bullets[0] }] };
    vi.mocked(callGeminiJson).mockReset();
    vi.mocked(callGeminiJson).mockResolvedValueOnce(facts).mockResolvedValueOnce({ optimizedProfile: prepareOptimizationSource(strong, facts), atsScore: 0 }).mockResolvedValueOnce(facts);
    const result = await generateOptimizedResume(strong, "Developer Java Spring Boot");
    expect(result.atsMatchScore).toBeGreaterThanOrEqual(95);
    const unsupported = computeAtsScores("Customer service", "Developer Java Spring Boot", { ...facts, candidateYearsExperience: 0, candidateTitles: [], candidateEducation: [], responsibilityEvidence: [] });
    expect(unsupported.atsMatchScore).toBeLessThan(95);
  });
});