import { describe, expect, it } from "vitest";
import { periodStart } from "./admin-monitoring.functions";
import { ANONYMOUS_EVENTS, AnalyticsPayloadSchema } from "./analytics-schemas";

describe("monitoring periods use India time", () => {
  it("today starts at 00:00 IST", () => {
    expect(periodStart("day", new Date("2026-11-12T20:00:00Z"))).toBe("2026-11-12T18:30:00.000Z");
  });
  it("this month starts on the 1st at 00:00 IST", () => {
    expect(periodStart("month", new Date("2026-11-12T10:00:00Z"))).toBe("2026-10-31T18:30:00.000Z");
  });
});

describe("analytics privacy", () => {
  it("payments cannot be recorded anonymously", () => {
    expect(ANONYMOUS_EVENTS.has("PAYMENT_COMPLETED")).toBe(false);
  });
  it("upload events reject extra fields such as file names", () => {
    expect(() => AnalyticsPayloadSchema.parse({ event: "RESUME_UPLOADED", meta: { type: "pdf", name: "cv.pdf" } })).toThrow();
  });
});
