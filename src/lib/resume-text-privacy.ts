/** Removes contact identifiers before an uploaded or generated resume enters ATS analysis. */
export function withoutResumeContactDetails(text: string): string {
  return text
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, "")
    .replace(/(?:https?:\/\/|www\.)[\w.-]+\.[a-z]{2,}(?:\/[^\s|,;]*)?/gi, "")
    .replace(/\b(?:linkedin\.com|github\.com)\/[^\s|,;]*/gi, "")
    .replace(/(?:\+?\d[\d ().-]{7,}\d)/g, "")
    .split("\n")
    .filter((line, index) => index > 0 || !/^[\p{L} .'-]{2,80}$/u.test(line.trim()))
    .join("\n")
    .replace(/[|, ]+(?=\n|$)/gm, "")
    .trim();
}