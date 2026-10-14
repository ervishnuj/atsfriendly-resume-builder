import { describe, expect, it, vi } from "vitest";
import { detectResumeFileKind, extractResumeText, resumeExtractionError, MAX_RESUME_BYTES } from "./resume-import";

vi.mock("mammoth/mammoth.browser.js", () => ({ extractRawText: async () => ({ value: "" }) }));

describe("resume extraction validation and errors", () => {
  it("accepts uppercase names and generic mobile MIME types", () => {
    expect(detectResumeFileKind(new File(["%PDF"], "Resume.PDF"))).toBe("pdf");
    expect(detectResumeFileKind(new File(["PK"], "Resume.DOCX", { type: "application/octet-stream" }))).toBe("docx");
    expect(detectResumeFileKind(new File(["x"], "Resume.pdf", { type: "image/png" }))).toBeNull();
  });
  it("rejects empty, oversized, unsupported and false signatures before parsing", async () => {
    await expect(extractResumeText(new File([], "resume.pdf"))).rejects.toThrow("empty");
    await expect(extractResumeText(new File([new Uint8Array(MAX_RESUME_BYTES + 1)], "resume.pdf"))).rejects.toThrow("5 MB");
    await expect(extractResumeText(new File(["resume"], "resume.txt"))).rejects.toThrow("Only PDF and DOCX");
    await expect(extractResumeText(new File(["not pdf"], "resume.pdf"))).rejects.toThrow("does not appear");
  });
  it("reports a blank DOCX without calling it scanned or protected", async () => {
    await expect(extractResumeText(new File(["PK00"], "resume.docx"))).rejects.toThrow("DOCX contains no readable text");
  });
  it("separates password, worker, invalid-file and unexpected failures", () => {
    const password = new Error("Need a password"); password.name = "PasswordException";
    const invalid = new Error("Invalid PDF structure"); invalid.name = "InvalidPDFException";
    expect(resumeExtractionError(password, "pdf")).toContain("password protected");
    expect(resumeExtractionError(invalid, "pdf")).toContain("damaged");
    expect(resumeExtractionError(new Error("Setting up fake worker failed"), "pdf")).toContain("browser");
    expect(resumeExtractionError(new Error("Unexpected extraction failure"), "pdf")).not.toContain("password");
    expect(resumeExtractionError(new Error("OCR is required"), "pdf")).toContain("OCR");
  });
});