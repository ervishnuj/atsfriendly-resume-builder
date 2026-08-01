import { emptyProfile, type Profile } from "@/components/ProfileForm";

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

export function parseProfileJson(text: string): Profile {
  const trimmed = text.trim();
  if (!trimmed) throw new Error("Nothing to import — paste some JSON first.");
  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    throw new Error("That isn't valid JSON. Check for missing quotes, commas or brackets.");
  }
  const profile = normalizeProfile(parsed);
  const hasAnything =
    Object.values(profile.personal).some((v) => v.trim() !== "") ||
    profile.skills.some((s) => s.category || s.items.length) ||
    profile.experience.some((e) => e.title || e.company || e.bullets.length) ||
    profile.education.some((e) => e.degree || e.institution);
  if (!hasAnything)
    throw new Error("No recognizable profile fields found in that JSON.");
  return profile;
}
