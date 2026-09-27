import { emptyProfile, type Profile } from "@/components/ProfileForm";
import type { ProfileImportIssue } from "./profile-io";

type Section =
  | "header"
  | "summary"
  | "skills"
  | "experience"
  | "education"
  | "projects"
  | "certifications"
  | "achievements"
  | "languages"
  | "other";

export type ResumeParseResult = {
  profile: Profile;
  issues: ProfileImportIssue[];
  recognizedSections: string[];
};

const HEADINGS: Array<[RegExp, Section]> = [
  [/^((professional\s+)?summary|profile|objective|about( me)?)$/i, "summary"],
  [/^((technical\s+|core\s+|key\s+)?skills|technologies|competencies)$/i, "skills"],
  [/^((work\s+|professional\s+)?experience|employment( history)?|work history)$/i, "experience"],
  [/^(education|academics?|academic background|academic qualifications)$/i, "education"],
  [/^(selected\s+|personal\s+)?projects$/i, "projects"],
  [/^(certifications?|licenses?( and certifications)?)$/i, "certifications"],
  [/^(achievements?|awards?( and honors)?|honors?)$/i, "achievements"],
  [/^languages?$/i, "languages"],
  [/^(publications?|volunteering|interests?|additional information)$/i, "other"],
];

const EMAIL = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;
const PHONE = /(?:\+?\d[\d ().-]{7,}\d)/;
const URL = /(?:https?:\/\/)?(?:www\.)?[a-z0-9][a-z0-9.-]+\.[a-z]{2,}(?:\/[^\s|,]*)?/i;
const WEB_URL = /(?:https?:\/\/|www\.)[a-z0-9.-]+\.[a-z]{2,}(?:\/[^\s|,]*)?/gi;
const IS_WEB_URL = /(?:https?:\/\/|www\.)[a-z0-9.-]+\.[a-z]{2,}/i;
const DATE_RANGE = /\b(?:19|20)\d{2}\b.*(?:\b(?:19|20)\d{2}\b|present|current|now)/i;
const DATE_SPAN = /\b(?:19|20)\d{2}\s*(?:-|–|—|to)\s*(?:(?:19|20)\d{2}|present|current|now)\b/i;

function clean(line: string): string {
  return line.replace(/^\s*[•●▪◦‣*-]\s*/, "").replace(/\s+/g, " ").trim();
}

function headingFor(line: string): Section | null {
  const candidate = clean(line).replace(/:$/, "");
  if (candidate.length > 45) return null;
  return HEADINGS.find(([pattern]) => pattern.test(candidate))?.[1] ?? null;
}

function sectionsFrom(text: string): Map<Section, string[]> {
  const sections = new Map<Section, string[]>([["header", []]]);
  let current: Section = "header";
  for (const raw of text.replace(/\r/g, "").split("\n")) {
    const line = raw.trim().replace(/\s+/g, " ");
    if (!line) continue;
    const heading = headingFor(line);
    if (heading) {
      current = heading;
      if (!sections.has(current)) sections.set(current, []);
      continue;
    }
    const values = sections.get(current) ?? [];
    values.push(line);
    sections.set(current, values);
  }
  return sections;
}

function findUrl(lines: string[], host: string): string {
  for (const line of lines) {
    const candidates = line.match(WEB_URL) ?? [];
    const found = candidates.find((value) => value.toLowerCase().includes(host));
    if (found) return found;
  }
  return "";
}

function parseSkills(lines: string[]): Profile["skills"] {
  const groups: Profile["skills"] = [];
  for (const line of lines) {
    const split = line.match(/^([^:]{2,50}):\s*(.+)$/);
    const category = split?.[1]?.trim() || "Skills";
    const source = split?.[2] || line;
    const items = source.split(/[,;|]/).map(clean).filter(Boolean);
    if (items.length) groups.push({ category, items });
  }
  return groups;
}

function parseExperience(lines: string[]): Profile["experience"] {
  if (!lines.length) return [];
  const entries: Profile["experience"] = [];
  let current: Profile["experience"][number] | null = null;
  for (const line of lines) {
    const isBullet = /^[•●▪◦‣*-]/.test(line);
    if (!current || (!isBullet && (DATE_SPAN.test(line) || /\s(?:—|–|\||@)\s/.test(line)))) {
      if (current) entries.push(current);
      const date = line.match(DATE_SPAN)?.[0] ?? "";
      const remaining = clean(line.replace(date, "")).replace(/[\s(\[\-|–—|@]+$/, "").trim();
      const main = remaining.split(/\s+(?:—|–|\||@|-)\s+/).map(clean).filter(Boolean);
      current = {
        title: main[0] ?? "",
        company: main[1] ?? "",
        dateRange: date,
        bullets: [],
      };
    } else if (isBullet) {
      current.bullets.push(clean(line));
    } else if (!current.title) {
      current.title = clean(line);
    } else if (!current.company) {
      current.company = clean(line);
    } else {
      current.bullets.push(clean(line));
    }
  }
  if (current) entries.push(current);
  return entries.filter((entry) => entry.title || entry.company || entry.bullets.some(Boolean));
}

function parseEducation(lines: string[]): Profile["education"] {
  if (!lines.length) return [];
  const entries: Profile["education"] = [];
  let current: Profile["education"][number] | null = null;
  for (const line of lines) {
    const year = line.match(/\b(?:19|20)\d{2}\b/)?.[0] ?? "";
    const degreeLike = /bachelor|master|degree|diploma|ph\.?d|b\.?tech|m\.?tech|b\.?e\.?|m\.?b\.?a|b\.?sc|m\.?sc/i.test(line);
    if (!current || degreeLike) {
      if (current) entries.push(current);
      const parts = line.replace(/\s+(?:—|–|\||-)\s*\b(?:19|20)\d{2}\b\s*$/, "").split(/\s+(?:—|–|\||-)\s+/).map(clean);
      current = { degree: parts[0] ?? "", major: "", institution: parts[1] ?? "", year, score: "" };
    } else if (!current.institution) {
      current.institution = clean(line.replace(year, ""));
      current.year ||= year;
    } else {
      current.major ||= clean(line.replace(year, ""));
      current.year ||= year;
    }
  }
  if (current) entries.push(current);
  return entries.filter((entry) => entry.degree || entry.institution);
}

function labeledEntry(label: string, lines: string[]): Profile["experience"][number] | null {
  if (!lines.length) return null;
  return { title: label, company: "", dateRange: "", bullets: lines.map(clean).filter(Boolean) };
}

export function hasProfileContent(profile: Profile): boolean {
  return Boolean(
    Object.values(profile.personal).some((value) => value.trim()) ||
      profile.skills.some((group) => group.category.trim() !== "Technical Skills" || group.items.length > 0) ||
      profile.experience.some((entry) => entry.title || entry.company || entry.dateRange || entry.bullets.some(Boolean)) ||
      profile.education.some((entry) => Object.values(entry).some(Boolean)),
  );
}

export function profileDifferences(current: Profile, incoming: Profile): string[] {
  const differences: string[] = [];
  const labels: Array<[keyof Profile["personal"], string]> = [
    ["fullName", "Full name"], ["title", "Professional title"], ["email", "Email"], ["phone", "Phone"],
    ["linkedin", "LinkedIn"], ["github", "GitHub"], ["portfolio", "Portfolio"], ["summary", "Summary"],
  ];
  for (const [key, label] of labels) {
    if (incoming.personal[key] && incoming.personal[key] !== current.personal[key]) differences.push(label);
  }
  if (JSON.stringify(current.skills) !== JSON.stringify(incoming.skills)) differences.push("Skills");
  if (JSON.stringify(current.experience) !== JSON.stringify(incoming.experience)) differences.push("Experience and projects");
  if (JSON.stringify(current.education) !== JSON.stringify(incoming.education)) differences.push("Education");
  return differences;
}

export function parseResumeText(text: string): ResumeParseResult {
  const normalized = text.replace(/\u0000/g, "").replace(/[ \t]+/g, " ").trim();
  if (normalized.length < 120) throw new Error("We couldn't find enough readable text in that resume.");
  const sections = sectionsFrom(normalized);
  const header = sections.get("header") ?? [];
  const allLines = normalized.split("\n").map(clean).filter(Boolean);
  const email = allLines.map((line) => line.match(EMAIL)?.[0]).find(Boolean) ?? "";
  const phone = allLines.map((line) => line.match(PHONE)?.[0]).find(Boolean) ?? "";
  const linkedIn = findUrl(allLines, "linkedin");
  const github = findUrl(allLines, "github");
  const location = header.find((line) => /^location\s*:/i.test(line))?.replace(/^location\s*:\s*/i, "").trim() ?? "";
  const urls = allLines.flatMap((line) => line.match(WEB_URL) ?? []);
  const portfolio = urls.find((url) => !/linkedin|github/i.test(url) && !url.includes("@")) ?? "";
  const name = header.find((line) => !EMAIL.test(line) && !PHONE.test(line) && !IS_WEB_URL.test(line) && line.length <= 80) ?? "";
  const title = header.find((line) => line !== name && !EMAIL.test(line) && !PHONE.test(line) && !IS_WEB_URL.test(line) && line.length <= 120) ?? "";
  const experience = [
    ...parseExperience(sections.get("experience") ?? []),
    ...parseExperience(sections.get("projects") ?? []),
  ];
  for (const [section, label] of [["certifications", "Certifications"], ["achievements", "Achievements"], ["other", "Additional Information"]] as const) {
    const entry = labeledEntry(label, sections.get(section) ?? []);
    if (entry) experience.push(entry);
  }
  const skills = parseSkills(sections.get("skills") ?? []);
  const languages = sections.get("languages") ?? [];
  if (languages.length) skills.push({ category: "Languages", items: languages.flatMap((line) => line.split(/[,;|]/).map(clean)).filter(Boolean) });
  const education = parseEducation(sections.get("education") ?? []);
  const profile: Profile = {
    personal: { fullName: name, title, email, phone, linkedin: linkedIn, github, portfolio, summary: [location && `Location: ${location}`, (sections.get("summary") ?? []).join(" ")].filter(Boolean).join("\n") },
    skills: skills.length ? skills : structuredClone(emptyProfile.skills),
    experience: experience.length ? experience : structuredClone(emptyProfile.experience),
    education: education.length ? education : structuredClone(emptyProfile.education),
  };
  const issues: ProfileImportIssue[] = [];
  if (!profile.personal.fullName) issues.push({ field: "Full name", path: "personal.fullName", message: "Not confidently detected. Please enter it." });
  if (!profile.personal.email) issues.push({ field: "Email", path: "personal.email", message: "Not confidently detected. Please enter it." });
  if (!skills.length) issues.push({ field: "Skills", path: "skills.0.items", message: "No clearly labelled skills section was detected." });
  if (!experience.length) issues.push({ field: "Experience", path: "experience.0.title", message: "No clearly labelled experience or projects section was detected." });
  return { profile, issues, recognizedSections: [...sections.keys()].filter((key) => key !== "header") };
}