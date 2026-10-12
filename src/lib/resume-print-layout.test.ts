import { describe, expect, it } from "vitest";
import { ATS_CLASSIC } from "./resume-templates";
import { resumePrintConfig } from "./resume-print-layout";

describe("PDF-only presentation", () => {
  it("bounds readable dimensions without mutating stored template configuration", () => {
    const source = { ...ATS_CLASSIC, bodyFontSize: 7, nameFontSize: 28, marginTop: 35 };
    const result = resumePrintConfig(source);
    expect(result.bodyFontSize).toBe(9);
    expect(result.nameFontSize).toBe(22);
    expect(result.marginTop).toBe(18);
    expect(source.bodyFontSize).toBe(7);
    expect(result.sectionOrder).toEqual(["summary", "skills", "experience", "education"]);
    expect(result.sections).toEqual(source.sections);
  });
  it("preserves custom ordering and stays stable when applied to preview copies", () => {
    const source = { ...ATS_CLASSIC, sectionOrder: ["skills", "experience", "summary", "education"] as typeof ATS_CLASSIC.sectionOrder };
    const result = resumePrintConfig(source);
    expect(result.sectionOrder).toEqual(source.sectionOrder);
    expect(resumePrintConfig(result)).toEqual(result);
  });
});