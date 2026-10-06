import { describe, expect, it } from "vitest";
import { auditResumeReadability, classifyRequirements, describeChanges, planForGaps, prioritizeVerifiedExperience, repairResumeReadability, validateOptimizedProfile } from "./resume-optimization";
import { computeAtsScores, type AtsExtraction } from "./ats-scoring";
import { profileToResumeText } from "./resume-text";
import type { ProfileInput } from "./resume-schemas";
import { buildResumeGenerationPayload } from "./ai-payloads";
import { classifyJobSkills, classifySkill, labelLearningSkills } from "./skill-status";
import { buildResumeDocx } from "./resume-docx";
import { ATS_CLASSIC } from "./resume-templates";
import JSZip from "jszip";

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
  it("plans learning for required and preferred gaps without presenting them as candidate facts", () => {
    const plan = planForGaps({ ...extraction, preferredSkills: ["Docker"] }, ["AWS", "Docker"]);
    expect(plan.map((item) => item.priority)).toEqual(["High", "Medium"]);
    expect(plan.every((item) => item.why.includes("not found in the provided profile/resume"))).toBe(true);
    expect(JSON.stringify(source)).not.toContain("Docker");
  });
  it("prioritizes only source-backed project and experience entries", () => {
    const older = { title: "Developer", company: "Old Co", dateRange: "2019", bullets: ["Built HTML pages."] };
    const project = { title: "Spring Boot project", company: "Personal", dateRange: "2024", bullets: ["Built Java services with Spring Boot."] };
    const ordered = prioritizeVerifiedExperience({ ...source, experience: [older, project] }, extraction);
    expect(ordered.experience).toEqual([project, older]);
    expect(ordered.experience).toHaveLength(2);
  });
  it("repairs and audits formatting, without claiming missing facts were fixed", () => {
    const candidate = { ...source, experience: [{ ...source.experience[0], dateRange: "", bullets: ["•  Built  Java services."] }] };
    expect(auditResumeReadability(candidate).map((issue) => issue.code)).toContain("spacing-0-0");
    const repaired = repairResumeReadability(candidate);
    expect(auditResumeReadability(repaired).map((issue) => issue.code)).not.toContain("spacing-0-0");
    expect(auditResumeReadability(repaired).map((issue) => issue.code)).toContain("date-0");
  });
});

describe("synthetic job and candidate scenarios", () => {
  const project = { title: "Java project", company: "Personal", dateRange: "2024", bullets: ["Built Java services with Spring Boot."] };
  const oldRole = { title: "Assistant", company: "Old Co", dateRange: "2018", bullets: ["Prepared HTML pages."] };
  const cases: { name: string; candidate: ProfileInput; current: string; jd: AtsExtraction; expectedGap: string[]; firstEntry?: string }[] = [
    { name: "strong candidate and strong resume", candidate: source, current: profileToResumeText(source), jd: { ...extraction, requiredSkills: ["Java", "Spring Boot"], preferredSkills: [] }, expectedGap: [] },
    { name: "strong profile and weak current resume", candidate: source, current: "Developer Java", jd: extraction, expectedGap: ["AWS"] },
    { name: "strong experience with missing resume keywords", candidate: source, current: "Developer at Example Co", jd: extraction, expectedGap: ["AWS"] },
    { name: "strong project and weak experience", candidate: { ...source, experience: [oldRole, project] }, current: "Assistant HTML", jd: extraction, expectedGap: ["AWS"], firstEntry: "Java project" },
    { name: "fresher with a verified project", candidate: { ...source, experience: [project] }, current: "Computing graduate", jd: extraction, expectedGap: ["AWS"], firstEntry: "Java project" },
    { name: "genuine skill gap", candidate: source, current: profileToResumeText(source), jd: { ...extraction, requiredSkills: ["Java", "Kubernetes"] }, expectedGap: ["Kubernetes"] },
    { name: "irrelevant old experience", candidate: { ...source, experience: [oldRole, source.experience[0]] }, current: "Assistant HTML", jd: extraction, expectedGap: ["AWS"], firstEntry: "Developer" },
    { name: "multiple relevant projects", candidate: { ...source, experience: [oldRole, project, { ...project, title: "Spring Boot API", company: "Open Source" }] }, current: "Assistant HTML", jd: extraction, expectedGap: ["AWS"], firstEntry: "Java project" },
    { name: "ATS-unfriendly bullet markers", candidate: { ...source, experience: [{ ...source.experience[0], bullets: ["•  Built   Java services with Spring Boot."] }] }, current: "Developer Java", jd: extraction, expectedGap: ["AWS"] },
    { name: "required plus preferred skills", candidate: source, current: "Developer Java", jd: { ...extraction, preferredSkills: ["MySQL", "Docker"] }, expectedGap: ["AWS", "Docker"] },
  ];

  it.each(cases)("keeps $name truthful and scores the evidence", ({ candidate, current, jd, expectedGap, firstEntry }) => {
    const original = profileToResumeText(candidate);
    const groups = classifyRequirements(jd, original, current);
    expect(groups.potentialGaps).toEqual(expectedGap);
    const reordered = prioritizeVerifiedExperience(candidate, jd);
    const validated = repairResumeReadability(validateOptimizedProfile(candidate, reordered));
    expect(validated.experience).toHaveLength(candidate.experience.length);
    if (firstEntry) expect(validated.experience[0].title).toBe(firstEntry);
    expect(JSON.stringify(validated)).not.toContain("Kubernetes");
    const profileFit = computeAtsScores(original, "Java Spring Boot AWS Docker", jd).atsMatchScore;
    const currentScore = computeAtsScores(current, "Java Spring Boot AWS Docker", jd).atsMatchScore;
    const finalScore = computeAtsScores(profileToResumeText(validated), "Java Spring Boot AWS Docker", jd).atsMatchScore;
    expect(profileFit).toBe(computeAtsScores(original, "Java Spring Boot AWS Docker", jd).atsMatchScore);
    expect(finalScore).toBeGreaterThanOrEqual(currentScore);
    expect(groups.potentialGaps.every((gap) => !candidate.skills.some((group) => group.items.includes(gap)))).toBe(true);
    expect(auditResumeReadability(repairResumeReadability(validated)).some((issue) => issue.code.startsWith("spacing"))).toBe(false);
  });
});

describe("learning and training-aware optimization (synthetic, no AI or credits)", () => {
  const candidate: ProfileInput = {
    ...source,
    personal: { ...source.personal, summary: "Java developer currently learning Spring Boot. Currently training in AWS." },
    skills: [{ category: "Technical", items: ["Java", "Spring Boot — Currently Learning", "AWS — Currently Training", "Kafka — Currently Learning", "Docker — Currently Training"] }],
    experience: [{ ...source.experience[0], bullets: ["Built Java services with MySQL."] }],
  };
  const jd = { ...extraction, requiredSkills: ["Java", "Spring Boot", "AWS", "Kafka", "Docker", "Kubernetes"], preferredSkills: [] };
  it("separates professional, learning, training, multiple studies and missing skills", () => {
    expect(classifyJobSkills(candidate, jd.requiredSkills).map((item) => item.status)).toEqual([
      "verifiedExperience", "currentlyLearning", "currentlyTraining", "currentlyLearning", "currentlyTraining", "potentialGap",
    ]);
    const groups = classifyRequirements(jd, profileToResumeText(candidate), "Java developer", candidate);
    expect(groups.potentialGaps).toEqual(["Kubernetes"]);
    expect(groups.underrepresented).toContain("Spring Boot");
    expect(groups.details?.find((item) => item.term === "AWS")?.treatment).toBe("AWS — Currently Training");
  });
  it("prefers verified project evidence without promoting it to professional use", () => {
    const withProject = { ...candidate, experience: [...candidate.experience, { title: "Spring Boot project", company: "Personal", dateRange: "2025", bullets: ["Built a Spring Boot demo."] }] };
    expect(classifySkill(withProject, "Spring Boot")).toMatchObject({ status: "projectExposure", secondary: "currentlyLearning" });
    expect(classifySkill(candidate, "React").status).toBe("potentialGap");
    expect(classifySkill(candidate, "Java", false).status).toBe("notRelevant");
  });
  it("does not promote studying in a role to professional experience or invent course topics", () => {
    const studyingAtWork = { ...candidate, experience: [{ ...source.experience[0], bullets: ["Currently learning Spring Boot at work."] }] };
    expect(classifySkill(studyingAtWork, "Spring Boot").status).toBe("currentlyLearning");
    expect(classifySkill({ ...candidate, personal: { ...candidate.personal, summary: "Currently undergoing Java Full Stack training." }, skills: [] }, "REST API").status).toBe("potentialGap");
  });
  it("weights JD fit partially without inflating professional experience or generic ATS checks", () => {
    const text = profileToResumeText(candidate);
    const full = computeAtsScores(text, "Java Spring Boot AWS Kafka Docker Kubernetes", jd);
    const weighted = computeAtsScores(text, "Java Spring Boot AWS Kafka Docker Kubernetes", jd, new Map([
      ["java", 1], ["spring boot", 0.35], ["aws", 0.35], ["kafka", 0.35], ["docker", 0.35], ["kubernetes", 0],
    ]));
    expect(weighted.atsMatchScore).toBeLessThan(full.atsMatchScore);
    expect(weighted.atsScore).toBe(full.atsScore);
  });
  it("keeps labels visible in resume text and DOCX, without fabricated role bullets", async () => {
    const proposed = { ...candidate, skills: [{ category: "Technical", items: ["Java", "Spring Boot", "AWS", "Docker"] }], experience: [{ ...candidate.experience[0], bullets: ["Built Java services with AWS."] }] };
    const safe = labelLearningSkills(candidate, validateOptimizedProfile(candidate, proposed), jd.requiredSkills);
    expect(safe.experience[0].bullets).toEqual(candidate.experience[0].bullets);
    expect(profileToResumeText(safe)).toContain("Currently Learning: Spring Boot, Kafka");
    expect(profileToResumeText(safe)).toContain("Currently Training: AWS, Docker");
    const blob = await buildResumeDocx({ atsScore: 0, matchingKeywords: [], missingKeywords: [], optimizedProfile: safe }, ATS_CLASSIC);
    const content = await (await JSZip.loadAsync(await blob.arrayBuffer())).file("word/document.xml")?.async("text") ?? "";
    expect(content).toContain("Currently Learning");
    expect(content).toContain("Spring Boot");
    expect(content).not.toContain("Built Java services with AWS");
  });
});