import { describe, expect, it } from "vitest";
import { parseResumeText, hasProfileContent, profileDifferences } from "./resume-parser";
import { emptyProfile } from "@/components/ProfileForm";
import { AnalyticsPayloadSchema } from "./analytics-schemas";
import { buildAtsPayload, buildCoverLetterPayload, buildResumeGenerationPayload, buildSkillGapPayload, buildInterviewPayload, buildLinkedInPayload } from "./ai-payloads";
import { DAILY_RESUME_GENERATION_LIMIT, DAILY_ANALYSIS_LIMIT, RESUME_GENERATION_COOLDOWN_SECONDS, ANALYSIS_COOLDOWN_SECONDS } from "./ai-limits";

const synthetic = `Jordan Example
Software Engineer
jordan@example.test | +1 415 555 0100 | https://www.linkedin.com/in/jordan-example | https://github.com/example
SUMMARY
Builds reliable web applications and accessible user interfaces.
SKILLS
Programming: TypeScript, SQL, Python
EXPERIENCE
Software Engineer — Example Studio — 2021–2024
• Built accessible web applications for internal teams.
• Improved reliability with automated test coverage.
EDUCATION
Bachelor of Science — Sample University — 2020
CERTIFICATIONS
Sample Security Certificate
LANGUAGES
English, Spanish`;

describe("local resume parsing", () => {
  it("maps only supplied details into the existing builder profile", () => {
    const { profile, recognizedSections } = parseResumeText(synthetic);
    expect(profile.personal.fullName).toBe("Jordan Example");
    expect(profile.personal.email).toBe("jordan@example.test");
    expect(profile.personal.github).toContain("github.com/example");
    expect(profile.skills[0].items).toEqual(["TypeScript", "SQL", "Python"]);
    expect(profile.skills[1].category).toBe("Languages");
    expect(profile.experience[0].bullets).toHaveLength(2);
    expect(profile.experience[1].title).toBe("Certifications");
    expect(profile.education[0].institution).toBe("Sample University");
    expect(recognizedSections).toContain("experience");
  });
  it("leaves missing personal data blank rather than guessing", () => {
    const result = parseResumeText(`SUMMARY\n${"Relevant professional summary. ".repeat(7)}\nSKILLS\nCore: TypeScript, Testing`);
    expect(result.profile.personal.fullName).toBe("");
    expect(result.profile.personal.email).toBe("");
    expect(result.issues.some((issue) => issue.path === "personal.fullName")).toBe(true);
  });
  it("rejects empty or unreadable text", () => {
    expect(() => parseResumeText("\n \n")).toThrow(/readable text/);
  });
  it("detects preexisting information and differences without changing it", () => {
    expect(hasProfileContent(emptyProfile)).toBe(false);
    const existing = { ...emptyProfile, personal: { ...emptyProfile.personal, fullName: "Existing User" } };
    const original = JSON.stringify(existing);
    expect(hasProfileContent(existing)).toBe(true);
    expect(profileDifferences(existing, parseResumeText(synthetic).profile)).toContain("Full name");
    expect(JSON.stringify(existing)).toBe(original);
  });
});

describe("privacy and unchanged usage contracts", () => {
  it("rejects unexpected analytics metadata and permits tracker status fields", () => {
    expect(AnalyticsPayloadSchema.safeParse({ event: "JD_ANALYZED", meta: { job_description: synthetic } }).success).toBe(false);
    expect(AnalyticsPayloadSchema.safeParse({ event: "RESUME_CREATED", meta: { email: "jordan@example.test" } }).success).toBe(false);
    expect(AnalyticsPayloadSchema.safeParse({ event: "APPLICATION_CREATED", meta: { status: "APPLIED" } }).success).toBe(true);
  });
  it("excludes contact data from analysis payloads and retains it only for final generation", () => {
    const profile = parseResumeText(synthetic).profile;
    for (const payload of [buildAtsPayload, buildSkillGapPayload, buildInterviewPayload, buildLinkedInPayload]) {
      const safe = payload(profile);
      expect(safe.personal.email).toBe("");
      expect(safe.personal.phone).toBe("");
      expect(safe.personal.linkedin).toBe("");
      expect(safe.personal.github).toBe("");
    }
    expect(buildCoverLetterPayload(profile).personal.fullName).toBe("Jordan Example");
    expect(buildCoverLetterPayload(profile).personal.email).toBe("");
    expect(buildResumeGenerationPayload(profile).personal.email).toBe("jordan@example.test");
  });
  it("preserves existing daily limits and cooldowns", () => {
    expect([DAILY_RESUME_GENERATION_LIMIT, DAILY_ANALYSIS_LIMIT, RESUME_GENERATION_COOLDOWN_SECONDS, ANALYSIS_COOLDOWN_SECONDS]).toEqual([10, 30, 30, 10]);
  });
});