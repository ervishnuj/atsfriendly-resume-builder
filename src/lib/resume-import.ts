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
  if (name.endsWith(".pdf") || file.type === "application/pdf") return "pdf";
  if (
    name.endsWith(".docx") ||
    file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  )
    return "docx";
  return null;
}

async function extractPdfText(file: File): Promise<string> {
  const pdfjs = await import("pdfjs-dist");
  const workerUrl = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default;
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
  const buffer = await file.arrayBuffer();
  const doc = await pdfjs.getDocument({ data: new Uint8Array(buffer) }).promise;
  const pages: string[] = [];
  for (let i = 1; i <= doc.numPages; i += 1) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    pages.push(
      content.items
        .map((item) => ("str" in item ? item.str : ""))
        .join(" ")
        .replace(/\s+/g, " "),
    );
  }
  return pages.join("\n").trim();
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
export async function extractResumeText(file: File): Promise<string> {
  if (file.size === 0) throw new Error("That file is empty. Please choose a valid resume file.");
  if (file.size > MAX_RESUME_BYTES) throw new Error("Resume files must be 5 MB or smaller.");
  const kind = detectResumeFileKind(file);
  if (!kind) throw new Error("Only PDF and DOCX resumes are supported.");

  let text = "";
  try {
    text = kind === "pdf" ? await extractPdfText(file) : await extractDocxText(file);
  } catch {
    throw new Error("We couldn't read that file. It may be corrupted or password protected.");
  }
  if (text.length < MIN_RESUME_CHARS) {
    throw new Error(
      "We couldn't find enough readable text in that resume. Scanned/image-only PDFs are not supported.",
    );
  }
  return text.slice(0, 30000);
}