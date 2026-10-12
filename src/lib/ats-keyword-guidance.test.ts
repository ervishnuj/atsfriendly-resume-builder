import { describe, expect, it } from "vitest";
import { atsKeywordGuidance } from "./ats-keyword-guidance";
import { quickAtsCheck } from "./ats-quick";

const text = `Example Candidate
Software Engineer
PROFESSIONAL SUMMARY
Developer building Java services and currently learning Kubernetes.
TECHNICAL SKILLS
Languages: Java, SQL
Currently Learning: Kubernetes
EXPERIENCE
Software Engineer | Example Company | 2022 - Present
- Built Java services and SQL queries reducing latency by 20%.
EDUCATION
B.Tech Computer Science | Example University | 2022`;
const jd = "Software Engineer\nRequired: Java, SQL, Kubernetes, Python.\nBuild Java services using SQL and Kubernetes. Python expertise is required.";

describe("ATS keyword guidance", () => {
  it("preserves scores and inputs while separating study evidence from unconfirmed requirements", () => {
    const result = quickAtsCheck(text, jd);
    const snapshot = JSON.stringify(result);
    const guidance = atsKeywordGuidance(text, result);
    expect(JSON.stringify(result)).toBe(snapshot);
    expect(quickAtsCheck(text, jd)).toEqual(result);
    expect(guidance.find((item) => item.term === "python")?.label).toBe("Needs confirmation");
    expect(guidance.find((item) => item.term === "kubernetes")?.status).toBe("currentlyLearning");
    expect(guidance.find((item) => item.term === "kubernetes")?.action).toContain("Currently Learning");
    expect(guidance.find((item) => item.term === "python")?.action).toContain("otherwise leave it out");
  });
});