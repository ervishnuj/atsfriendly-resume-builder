/**
 * GeminiService — the single, backend-only Google Gemini client for this app.
 * The API key never leaves the server. No third-party AI gateway is used.
 */

const DEFAULT_MODEL = process.env.GEMINI_MODEL || "gemini-2.0-flash";
const DEFAULT_BASE_URL =
  process.env.GEMINI_API_URL || "https://generativelanguage.googleapis.com/v1beta";

export type GeminiJsonOptions = {
  systemPrompt: string;
  userPrompt: string;
  schema: Record<string, unknown>;
  temperature?: number;
};

function extractJson(text: string): string {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const body = fenced ? fenced[1].trim() : trimmed;
  const start = body.search(/[{[]/);
  if (start === -1) return body;
  const end = Math.max(body.lastIndexOf("}"), body.lastIndexOf("]"));
  return end > start ? body.slice(start, end + 1) : body.slice(start);
}

/** Calls Gemini and safely parses a JSON-only response. */
export async function callGeminiJson<T>({
  systemPrompt,
  userPrompt,
  schema,
  temperature = 0.4,
}: GeminiJsonOptions): Promise<T> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "Gemini is not configured. Add the GEMINI_API_KEY backend environment variable.",
    );
  }

  const res = await fetch(
    `${DEFAULT_BASE_URL}/models/${DEFAULT_MODEL}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: "user", parts: [{ text: userPrompt }] }],
        generationConfig: {
          temperature,
          responseMimeType: "application/json",
          responseSchema: schema,
        },
      }),
    },
  );

  if (!res.ok) {
    const body = await res.text();
    if (res.status === 429) {
      throw new Error("Gemini rate limit reached. Please try again in a moment.");
    }
    if (res.status === 401 || res.status === 403) {
      throw new Error("Gemini rejected the configured API key. Please check GEMINI_API_KEY.");
    }
    throw new Error(`Gemini request failed [${res.status}]: ${body.slice(0, 500)}`);
  }

  const json = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const text =
    json.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
  if (!text.trim()) throw new Error("Gemini returned an empty response. Please try again.");

  try {
    return JSON.parse(extractJson(text)) as T;
  } catch {
    throw new Error("Gemini returned a response that could not be parsed. Please try again.");
  }
}

const S = { type: "string" } as const;
const SARR = { type: "array", items: { type: "string" } } as const;

export const resumeSchema = {
  type: "object",
  properties: {
    atsScore: { type: "number" },
    matchingKeywords: SARR,
    missingKeywords: SARR,
    optimizedProfile: {
      type: "object",
      properties: {
        personal: {
          type: "object",
          properties: {
            fullName: S,
            title: S,
            email: S,
            phone: S,
            linkedin: S,
            github: S,
            portfolio: S,
            summary: S,
          },
          required: [
            "fullName",
            "title",
            "email",
            "phone",
            "linkedin",
            "github",
            "portfolio",
            "summary",
          ],
        },
        skills: {
          type: "array",
          items: {
            type: "object",
            properties: { category: S, items: SARR },
            required: ["category", "items"],
          },
        },
        experience: {
          type: "array",
          items: {
            type: "object",
            properties: { title: S, company: S, dateRange: S, bullets: SARR },
            required: ["title", "company", "dateRange", "bullets"],
          },
        },
        education: {
          type: "array",
          items: {
            type: "object",
            properties: { degree: S, major: S, institution: S, year: S, score: S },
            required: ["degree", "major", "institution", "year", "score"],
          },
        },
      },
      required: ["personal", "skills", "experience", "education"],
    },
  },
  required: ["atsScore", "matchingKeywords", "missingKeywords", "optimizedProfile"],
} as const;

export const atsSchema = {
  type: "object",
  properties: {
    score: { type: "number" },
    matchingKeywords: SARR,
    missingKeywords: SARR,
    skillsMatched: SARR,
    skillsMissing: SARR,
    strengths: SARR,
    weaknesses: SARR,
    suggestions: SARR,
  },
  required: [
    "score",
    "matchingKeywords",
    "missingKeywords",
    "skillsMatched",
    "skillsMissing",
    "strengths",
    "weaknesses",
    "suggestions",
  ],
} as const;

export const skillGapSchema = {
  type: "object",
  properties: {
    matchedSkills: SARR,
    missingSkills: SARR,
    partialSkills: SARR,
    learningPlan: {
      type: "array",
      items: {
        type: "object",
        properties: { skill: S, why: S, howToLearn: S, priority: S },
        required: ["skill", "why", "howToLearn", "priority"],
      },
    },
  },
  required: ["matchedSkills", "missingSkills", "partialSkills", "learningPlan"],
} as const;

export const coverLetterSchema = {
  type: "object",
  properties: { coverLetter: S, highlights: SARR },
  required: ["coverLetter", "highlights"],
} as const;

export const NO_FABRICATION_RULES = `Strict honesty rules:
- NEVER invent a company, job title, degree, certification, employment date, metric, or skill that is not present in the candidate profile.
- Only rephrase, tailor and emphasise information that already exists in the profile.
- If something required by the job description is missing, report it as missing rather than fabricating it.`;
