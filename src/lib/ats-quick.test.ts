import { describe, expect, it } from "vitest";
import { extractJobRequirements, quickAtsCheck } from "./ats-quick";

const resume = `Example Candidate
Java Full Stack Developer
candidate@example.test | +91 9000000000
SUMMARY
Java developer with 3 years of experience building services.
SKILLS
Java, Spring Boot, REST APIs, SQL, React, JavaScript
EXPERIENCE
Java Full Stack Developer | Example | 2023 - 2026
- Built REST APIs with Java and Spring Boot.
- Reviewed code and debugged application issues.
- Wrote unit tests for SQL services.
EDUCATION
Bachelor of Computer Science`;
const javaJd = `Java Full Stack Developer
Required skills:
Java, Spring Boot, REST APIs, Hibernate, SQL / MySQL, React / JavaScript.
Responsibilities:
Debugging, code reviews and unit testing.
Preferred skills:
Docker, Kubernetes.
Activities including engineering and active backlogs.`;

describe("contextual public ATS checker", () => {
  it("prioritizes technical terms, never arbitrary adjacent generic phrases", () => {
    const result = quickAtsCheck(resume, javaJd);
    expect(result.requirements.map(item => item.term)).toEqual(expect.arrayContaining(["java", "spring boot", "rest api", "hibernate", "sql", "mysql", "react", "javascript", "debugging", "code review", "unit testing"]));
    for (const term of ["including", "activities", "engineering", "active backlogs", "activities including"]) expect(result.missingKeywords).not.toContain(term);
    expect(result.missingKeywords).toContain("hibernate");
    expect(result.missingPreferredKeywords).toContain("kubernetes");
    expect(result.requirements[0].importance).toBe("Required");
  });
  it("keeps Java distinct from JavaScript and accepts task equivalents", () => {
    const result = quickAtsCheck("SKILLS\nJavaScript\nEXPERIENCE\nReviewed code and wrote unit tests.", "Developer\nRequired: Java, JavaScript.\nResponsibilities:\nCode reviews and unit testing.");
    expect(result.missingRequiredKeywords).toContain("java");
    expect(result.matchedKeywords).toContain("javascript");
    expect(result.matchBreakdown.responsibilities).toBe(15);
    expect(result.evidence["code review"]).toContain("Reviewed code");
  });
  it("preserves meaningful engineering phrases and unknown named technologies", () => {
    const { requirements } = extractJobRequirements("Data Engineer\nRequired: Python, feature engineering, data engineering, Polars.\nPreferred: DuckDB.");
    expect(requirements.map(item => item.term)).toEqual(expect.arrayContaining(["python", "feature engineering", "data engineering", "polars", "duckdb"]));
    expect(requirements.map(item => item.term)).not.toContain("engineering");
  });
  it("does not change scores when generic filler is added", () => {
    const basic = quickAtsCheck(resume, javaJd);
    const noisy = quickAtsCheck(resume, javaJd + "\nActivities including active backlogs and engineering activities.");
    expect(noisy.atsMatchScore).toBe(basic.atsMatchScore);
    expect(noisy.missingKeywords).toEqual(basic.missingKeywords);
  });
  it("gives an optional skill less influence than a mandatory one", () => {
    const jd = "Developer\nRequired: Java.\nPreferred: Python.";
    const mandatory = quickAtsCheck("SKILLS\nJava", jd);
    const optional = quickAtsCheck("SKILLS\nPython", jd);
    expect(mandatory.matchBreakdown.requiredSkills).toBe(40);
    expect(optional.matchBreakdown.requiredSkills).toBe(0);
    expect(mandatory.matchBreakdown.technicalKeywords).toBeGreaterThan(optional.matchBreakdown.technicalKeywords);
  });
  it("classifies non-developer requirements with exact JD context", () => {
    const jd = "Financial Analyst\nRequired skills:\nExcel, financial reporting, risk management.\nPreferred skills:\nTableau.\nBachelor degree required.";
    const { requirements } = extractJobRequirements(jd);
    expect(requirements.map(item => item.term)).toEqual(expect.arrayContaining(["excel", "financial reporting", "risk management", "tableau", "bachelor degree"]));
    expect(requirements.find(item => item.term === "tableau")?.importance).toBe("Preferred");
    expect(requirements.find(item => item.term === "excel")?.context).toBe("Excel, financial reporting, risk management.");
  });
  it("does not treat explicit negation as skill evidence", () => {
    const result = quickAtsCheck("SKILLS\nJavaScript\nNo experience with Java", "Developer\nRequired: Java.");
    expect(result.matchedKeywords).not.toContain("java");
    expect(result.evidence.java).toBeUndefined();
  });
  it("does not mistake education date spans for work experience", () => {
    const result = quickAtsCheck("SKILLS\nJava\nEDUCATION\nSchool 2010\nBachelor degree 2024", "Java Developer\nRequired: Java.\nMinimum 5 years experience.");
    expect(result.matchBreakdown.experience).toBe(0);
  });
});