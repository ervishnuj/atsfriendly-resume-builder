import { emptyProfile, type Profile } from "@/components/ProfileForm";
import { z } from "zod";

const str = (v: unknown): string => (typeof v === "string" ? v : typeof v === "number" ? String(v) : "");

const strArray = (v: unknown): string[] => {
  if (Array.isArray(v)) return v.map(str).filter((s) => s.trim() !== "");
  if (typeof v === "string")
    return v
      .split(/[\n,]/)
      .map((s) => s.trim())
      .filter(Boolean);
  return [];
};

const asRecord = (v: unknown): Record<string, unknown> =>
  v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};

const asArray = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);

/**
 * Accepts a raw parsed JSON value (a saved profile export, or the
 * `optimizedProfile` object from a generated resume) and coerces it into a
 * complete, safe Profile. Unknown/missing fields fall back to empty values.
 */
export function normalizeProfile(input: unknown): Profile {
  const root = asRecord(input);
  // Support wrappers: { profile: {...} } or { optimizedProfile: {...} }
  const source = asRecord(root["profile"] ?? root["optimizedProfile"] ?? root);
  const personal = asRecord(source["personal"] ?? source["personalInfo"] ?? source);

  const skills = asArray(source["skills"]).map((raw) => {
    const s = asRecord(raw);
    return { category: str(s["category"]), items: strArray(s["items"]) };
  });

  const experience = asArray(source["experience"] ?? source["projects"]).map((raw) => {
    const e = asRecord(raw);
    return {
      title: str(e["title"]),
      company: str(e["company"]),
      dateRange: str(e["dateRange"]),
      bullets: strArray(e["bullets"]),
    };
  });

  const education = asArray(source["education"]).map((raw) => {
    const e = asRecord(raw);
    return {
      degree: str(e["degree"]),
      major: str(e["major"]),
      institution: str(e["institution"]),
      year: str(e["year"]),
      score: str(e["score"]),
    };
  });

  return {
    personal: {
      fullName: str(personal["fullName"] ?? personal["name"]),
      title: str(personal["title"]),
      email: str(personal["email"]),
      phone: str(personal["phone"]),
      linkedin: str(personal["linkedin"]),
      github: str(personal["github"]),
      portfolio: str(personal["portfolio"] ?? personal["website"]),
      summary: str(personal["summary"]),
    },
    skills: skills.length ? skills : emptyProfile.skills,
    experience: experience.length ? experience : emptyProfile.experience,
    education: education.length ? education : emptyProfile.education,
  };
}

export type ProfileImportIssue = { field: string; message: string };

export class ProfileImportError extends Error {
  issues: ProfileImportIssue[];
  constructor(message: string, issues: ProfileImportIssue[] = []) {
    super(message);
    this.name = "ProfileImportError";
    this.issues = issues;
  }
}

const nonEmpty = (label: string, max = 200) =>
  z
    .string({ required_error: `${label} is required.`, invalid_type_error: `${label} must be text.` })
    .trim()
    .min(1, `${label} cannot be empty.`)
    .max(max, `${label} must be under ${max} characters.`);

/** Schema applied to the *normalized* profile — required keys must be present and non-empty. */
const profileSchema = z.object({
  personal: z.object({
    fullName: nonEmpty("Full name", 100),
    title: z.string().max(120).optional().default(""),
    email: z
      .string({ required_error: "Email is required." })
      .trim()
      .min(1, "Email is required.")
      .email("Email must be a valid address (e.g. name@example.com).")
      .max(255),
    phone: z.string().max(40).optional().default(""),
    linkedin: z.string().max(300).optional().default(""),
    github: z.string().max(300).optional().default(""),
    portfolio: z.string().max(300).optional().default(""),
    summary: z.string().max(3000).optional().default(""),
  }),
  skills: z
    .array(
      z.object({
        category: nonEmpty("Skill category", 80),
        items: z.array(z.string().trim().min(1)).min(1, "Add at least one skill item."),
      }),
    )
    .min(1, "Add at least one skill group."),
  experience: z
    .array(
      z.object({
        title: nonEmpty("Role title", 120),
        company: nonEmpty("Company / project", 120),
        dateRange: z.string().max(60).optional().default(""),
        bullets: z.array(z.string().trim().min(1)).min(1, "Add at least one bullet point."),
      }),
    )
    .min(1, "Add at least one experience or project entry."),
  education: z
    .array(
      z.object({
        degree: nonEmpty("Degree", 120),
        major: z.string().max(120).optional().default(""),
        institution: nonEmpty("Institution", 160),
        year: z.string().max(30).optional().default(""),
        score: z.string().max(30).optional().default(""),
      }),
    )
    .min(1, "Add at least one education entry."),
});

const LABELS: Record<string, string> = {
  personal: "Personal info",
  skills: "Skills",
  experience: "Experience",
  education: "Education",
};

const formatPath = (path: (string | number)[]): string => {
  if (path.length === 0) return "Profile";
  const [head, ...rest] = path;
  const base = LABELS[String(head)] ?? String(head);
  const tail = rest
    .map((p) => (typeof p === "number" ? `#${p + 1}` : ` → ${p}`))
    .join("");
  return `${base}${tail}`;
};

export function parseProfileJson(text: string): Profile {
  const trimmed = text.trim();
  if (!trimmed) throw new ProfileImportError("Nothing to import — paste some JSON first.");
  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    throw new ProfileImportError(
      "That isn't valid JSON. Check for missing quotes, commas or brackets.",
    );
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new ProfileImportError("Expected a JSON object at the top level.");
  }

  const profile = normalizeProfile(parsed);
  const result = profileSchema.safeParse(profile);
  if (!result.success) {
    const issues = result.error.issues.map((i) => ({
      field: formatPath(i.path as (string | number)[]),
      message: i.message,
    }));
    throw new ProfileImportError(
      `This profile JSON is missing or has invalid required fields (${issues.length}).`,
      issues,
    );
  }
  return profile;
}
