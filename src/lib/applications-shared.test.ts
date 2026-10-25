import { describe, expect, it } from "vitest";
import { computeApplicationStats, filterApplications, mapApplicationRow, platformLabel, type JobApplication } from "./applications-shared";

const app = (o: Partial<JobApplication>): JobApplication => ({
  ...mapApplicationRow({ id: Math.random().toString(), created_at: "2026-10-01T10:00:00Z", updated_at: "2026-10-01T10:00:00Z" }),
  ...o,
});

describe("tracker rules", () => {
  it("does not count Resume Generated as an application submitted", () => {
    const s = computeApplicationStats([app({ status: "RESUME_GENERATED" }), app({ status: "READY_TO_APPLY" })]);
    expect(s.applied).toBe(0);
    expect(s.resumesGenerated).toBe(1);
  });
  it("counts Applied and later stages as submitted", () => {
    const s = computeApplicationStats([app({ status: "APPLIED" }), app({ status: "INTERVIEW_SCHEDULED" }), app({ status: "NO_RESPONSE" })]);
    expect(s.applied).toBe(3);
    expect(s.interviews).toBe(1);
    expect(s.noResponse).toBe(1);
  });
  it("filters by multiple platforms, grouping Other and Custom", () => {
    const list = [app({ platform: "LINKEDIN" }), app({ platform: "NAUKRI" }), app({ platform: "CUSTOM", customPlatform: "Instahyre" }), app({ platform: "INDEED" })];
    expect(filterApplications(list, { platforms: ["LINKEDIN", "OTHER_CUSTOM"] }).map((a) => a.platform).sort()).toEqual(["CUSTOM", "LINKEDIN"]);
  });
  it("shows the user-entered custom platform name", () => {
    expect(platformLabel({ platform: "OTHER", customPlatform: "Agency X" })).toBe("Agency X");
  });
  it("uses the selected application date for last-7-days and sorting", () => {
    const list = [app({ appliedAt: "2026-10-24" }), app({ appliedAt: "2026-10-18" }), app({ appliedAt: "2026-10-17" })];
    expect(filterApplications(list, { range: "7d" }, "2026-10-24").map((a) => a.appliedAt)).toEqual(["2026-10-24", "2026-10-18"]);
    expect(filterApplications(list, { sort: "oldest" }).map((a) => a.appliedAt)[0]).toBe("2026-10-17");
  });
  it("searches company and role", () => {
    const list = [app({ company: "Acme", jobTitle: "Java Dev" }), app({ company: "Zeta", jobTitle: "QA" })];
    expect(filterApplications(list, { search: "java" })).toHaveLength(1);
  });
});
