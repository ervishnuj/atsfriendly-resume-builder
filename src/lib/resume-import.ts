/**
 * Browser-side resume text extraction for the ATS importer.
 *
 * The file itself never leaves the user's device — only the extracted plain
 * text is sent to the backend for the authenticated user's ATS analysis, so no
 * uploaded resume is ever stored or exposed to another account.
 */
export const MAX_RESUME_BYTES = 5 * 1024 * 1024;
export const MIN_RESUME_CHARS = 120;

export type ResumeFileKind = "pdf" | "docx";

export function detectResumeFileKind(file: File): ResumeFileKind | null {
  const name = file.name.toLowerCase();
  const pdfName = name.endsWith(".pdf");
  const docxName = name.endsWith(".docx");
  const pdfMime = file.type === "application/pdf";
  const docxMime = file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  const genericMime = !file.type || file.type === "application/octet-stream";
  if (pdfName && (pdfMime || genericMime)) return "pdf";
  if (docxName && (docxMime || genericMime)) return "docx";
  return null;
}

async function hasExpectedSignature(file: File, kind: ResumeFileKind): Promise<boolean> {
  const bytes = new Uint8Array(await file.slice(0, 4).arrayBuffer());
  return kind === "pdf"
    ? bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46
    : bytes[0] === 0x50 && bytes[1] === 0x4b;
}

async function extractPdfText(file: File): Promise<string> {
  // Both builds must match: the legacy pair supplies APIs missing in older Safari.
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const workerUrl = (await import("pdfjs-dist/legacy/build/pdf.worker.min.mjs?url")).default;
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
  const buffer = await file.arrayBuffer();
  const task = pdfjs.getDocument({ data: new Uint8Array(buffer), isEvalSupported: false });
  const pages: string[] = [];
  let hasImages = false;
  try {
    const doc = await task.promise;
    for (let i = 1; i <= doc.numPages; i += 1) {
    const page = await doc.getPage(i);
    try {
    // PDF.js 6 getTextContent uses ReadableStream async iteration, absent in Safari.
    // The public stream reader API supports those browsers without global polyfills.
    const reader = page.streamTextContent().getReader();
    const items: Awaited<ReturnType<typeof page.getTextContent>>["items"] = [];
    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        items.push(...value.items);
      }
    } finally { reader.releaseLock(); }
    const lines = new Map<number, string[]>();
    for (const item of items) {
      if (!("str" in item)) continue;
      const transform = "transform" in item ? item.transform : undefined;
      const y = Array.isArray(transform) && typeof transform[5] === "number" ? Math.round(transform[5] / 3) * 3 : 0;
      lines.set(y, [...(lines.get(y) ?? []), item.str]);
    }
    pages.push([...lines.entries()].sort((a, b) => b[0] - a[0]).map(([, values]) => values.join(" ").replace(/\s+/g, " ").trim()).filter(Boolean).join("\n"));
    if (!items.some(item => "str" in item && item.str.trim())) {
      const ops = await page.getOperatorList();
      hasImages ||= ops.fnArray.some(op => [pdfjs.OPS.paintImageXObject, pdfjs.OPS.paintInlineImageXObject, pdfjs.OPS.paintImageMaskXObject].includes(op));
    }
    } finally { page.cleanup(); }
    }
    const text = pages.join("\n").trim();
    if (!text && hasImages) throw new Error("This PDF contains images but no selectable text. OCR is required; use a text-based PDF or paste the resume text.");
    return text;
  } finally {
    // Release worker/document even on rejection; repeated mobile uploads stay bounded.
    await task.destroy().catch(() => undefined);
  }
}

async function extractDocxText(file: File): Promise<string> {
  const mammoth = await import("mammoth/mammoth.browser.js");
  const buffer = await file.arrayBuffer();
  const result = await (
    mammoth as unknown as {
      extractRawText: (o: { arrayBuffer: ArrayBuffer }) => Promise<{ value: string }>;
    }
  ).extractRawText({ arrayBuffer: buffer });
  return result.value.replace(/\n{3,}/g, "\n\n").trim();
}

/** Validates the file and returns its plain text, or throws a friendly error. */
export function resumeExtractionError(error: unknown, kind: ResumeFileKind): string {
  const name = error instanceof Error ? error.name : "";
  const message = error instanceof Error ? error.message : "";
  if (message.includes("OCR is required")) return message;
  if (name === "PasswordException") return "This PDF is password protected. Remove the password and upload it again, or paste the resume text.";
  if (/worker|dynamically imported module|fetch|network|withResolvers|Promise\.try|API version|DOMMatrix/i.test(message)) return "The resume reader could not load or run in this browser. Retry the upload, or use an updated browser or Paste Resume Text.";
  if (name === "InvalidPDFException" || /invalid pdf|bad zip|zip file|central directory|could not find|invalid signature|unexpected end/i.test(message)) return `This ${kind.toUpperCase()} is damaged or is not a readable ${kind.toUpperCase()} document. Export a new copy and try again.`;
  return `The ${kind.toUpperCase()} reader could not extract this file. Try exporting a new copy, retry the upload, or paste the resume text.`;
}

export async function extractResumeText(file: File): Promise<string> {
  if (file.size === 0) throw new Error("That file is empty. Please choose a valid resume file.");
  if (file.size > MAX_RESUME_BYTES) throw new Error("Resume files must be 5 MB or smaller.");
  const kind = detectResumeFileKind(file);
  if (!kind) throw new Error("Only PDF and DOCX resumes are supported.");
  if (!(await hasExpectedSignature(file, kind))) {
    throw new Error(`That file does not appear to be a valid ${kind.toUpperCase()} resume.`);
  }

  let text = "";
  try {
    text = kind === "pdf" ? await extractPdfText(file) : await extractDocxText(file);
  } catch (error) {
    throw new Error(resumeExtractionError(error, kind));
  }
  if (!text.trim()) throw new Error(`This ${kind.toUpperCase()} contains no readable text. Use a document with selectable text or paste the resume text.`);
  if (text.length < MIN_RESUME_CHARS) {
    throw new Error(
      "This file has too little readable resume text. Upload a complete text-based resume or paste its text.",
    );
  }
  return text.slice(0, 30000);
}