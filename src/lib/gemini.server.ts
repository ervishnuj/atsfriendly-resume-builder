/**
 * GeminiService — the single, backend-only Google Gemini client for this app.
 * The API key never leaves the server. No third-party AI gateway is used.
 */

// Use another stable, lower-demand Gemini model when the primary model is
// temporarily unavailable. Environment values are read at request time so
// deployed serverless environments can inject them correctly.
const FALLBACK_MODELS = ["gemini-flash-latest", "gemini-flash-lite-latest", "gemini-pro-latest"]; // ["gemini-2.5-flash-lite", "gemini-2.5-flash"];
const RETRYABLE_STATUSES = new Set([429, 500, 502, 503, 504]);
const MAX_ATTEMPTS_PER_MODEL = 3;

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

function retryDelay(response: Response, attempt: number): number {
  const retryAfter = response.headers.get("retry-after");
  if (retryAfter) {
    const seconds = Number(retryAfter);
    if (Number.isFinite(seconds)) return Math.min(seconds * 1_000, 3_000);
  }
  return 500 * 2 ** attempt + Math.floor(Math.random() * 250);
}

async function pause(milliseconds: number): Promise<void> {
  await new Promise<void>((resolve) => setTimeout(resolve, milliseconds));
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
    throw new Error("API Key is not configured. Add the API_KEY backend environment variable.");
  }
  // const apiKey = [process.env.GEMINI_API_KEY, process.env.GEMINI_API_KEY_2].filter((key): key is string =>
  //   Boolean(key?.trim()),
  // );

  // if (apiKey.length === 0) {
  //   throw new Error("Gemini is not configured. Add GEMINI_API_KEY or GEMINI_API_KEY_2.");
  // }

  const configuredModel = process.env.GEMINI_MODEL || "gemini-flash-latest";
  const baseUrl = (process.env.GEMINI_API_URL || "https://generativelanguage.googleapis.com/v1beta").replace(/\/$/, "");

  const payload = JSON.stringify({
    systemInstruction: { parts: [{ text: systemPrompt }] },
    contents: [{ role: "user", parts: [{ text: userPrompt }] }],
    generationConfig: {
      temperature,
      responseMimeType: "application/json",
      responseSchema: schema,
    },
  });

  const models = [configuredModel, ...FALLBACK_MODELS.filter((model) => model !== configuredModel)];
  let res: Response | undefined;
  for (const model of models) {
    for (let attempt = 0; attempt < MAX_ATTEMPTS_PER_MODEL; attempt += 1) {
      try {
        res = await fetch(`${baseUrl}/models/${model}:generateContent`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
          body: payload,
        });
      } catch (error) {
        console.warn(`AI network failure for ${model} (attempt ${attempt + 1}).`, error);
        if (attempt + 1 < MAX_ATTEMPTS_PER_MODEL) {
          await pause(500 * 2 ** attempt);
          continue;
        }
        break;
      }

      if (res.ok) break;
      if (!RETRYABLE_STATUSES.has(res.status)) break;

      console.warn(`AI ${model} returned ${res.status} (attempt ${attempt + 1}).`);
      if (attempt + 1 < MAX_ATTEMPTS_PER_MODEL) {
        await pause(retryDelay(res, attempt));
      }
    }
    if (res?.ok) break;
    if (res && !RETRYABLE_STATUSES.has(res.status) && res.status !== 404) break;
  }

  if (!res || !res.ok) {
    const body = res ? await res.text() : "";
    if (res?.status === 429) {
      throw new Error("AI demand is unusually high right now. Please wait a moment and try again.");
    }
    if (res && RETRYABLE_STATUSES.has(res.status)) {
      throw new Error("AI generation is temporarily busy. Please try again in a moment.");
    }
    if (res?.status === 401 || res?.status === 403 || body.includes("API_KEY_INVALID")) {
      throw new Error("AI rejected the configured API key. Please add a valid API_KEY.");
    }
    console.error(`Gemini request failed with status ${res?.status ?? "unknown"}.`, body.slice(0, 500));
    throw new Error("AI generation could not be completed. Please try again.");
  }

  const json = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const text = json.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
  if (!text.trim()) throw new Error("AI returned an empty response. Please try again.");

  try {
    return JSON.parse(extractJson(text)) as T;
  } catch {
    throw new Error("AI returned a response that could not be parsed. Please try again.");
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
          required: ["fullName", "title", "email", "phone", "linkedin", "github", "portfolio", "summary"],
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

/**
 * Extraction-only schema. Gemini reports FACTS (what the JD asks for, and which
 * of those are evidenced in the resume, quoting the resume verbatim). It never
 * returns a score — every number is computed deterministically in ats-scoring.ts.
 */
export const atsExtractionSchema = {
  type: "object",
  properties: {
    jobTitle: S,
    requiredSkills: SARR,
    preferredSkills: SARR,
    technicalKeywords: SARR,
    responsibilities: SARR,
    minYearsExperience: { type: "number" },
    educationRequirements: SARR,
    candidateYearsExperience: { type: "number" },
    candidateTitles: SARR,
    candidateEducation: SARR,
    skillEvidence: {
      type: "array",
      items: {
        type: "object",
        properties: { term: S, present: { type: "boolean" }, evidence: S },
        required: ["term", "present", "evidence"],
      },
    },
    responsibilityEvidence: {
      type: "array",
      items: {
        type: "object",
        properties: { responsibility: S, present: { type: "boolean" }, evidence: S },
        required: ["responsibility", "present", "evidence"],
      },
    },
    strengths: SARR,
    weaknesses: SARR,
    suggestions: SARR,
  },
  required: [
    "jobTitle",
    "requiredSkills",
    "preferredSkills",
    "technicalKeywords",
    "responsibilities",
    "minYearsExperience",
    "educationRequirements",
    "candidateYearsExperience",
    "candidateTitles",
    "candidateEducation",
    "skillEvidence",
    "responsibilityEvidence",
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
        properties: {
          skill: S,
          why: S,
          howToLearn: S,
          priority: S,
          level: S,
          effort: S,
          resources: {
            type: "array",
            items: {
              type: "object",
              properties: { name: S, url: S },
              required: ["name", "url"],
            },
          },
        },
        required: ["skill", "why", "howToLearn", "priority", "level", "effort", "resources"],
      },
    },
  },
  required: ["matchedSkills", "missingSkills", "partialSkills", "learningPlan"],
} as const;

const QLIST = {
  type: "array",
  items: {
    type: "object",
    properties: { question: S, whatTheyTest: S, howToAnswer: S },
    required: ["question", "whatTheyTest", "howToAnswer"],
  },
} as const;

export const interviewPrepSchema = {
  type: "object",
  properties: {
    technicalQuestions: QLIST,
    projectQuestions: QLIST,
    hrQuestions: QLIST,
    behavioralQuestions: QLIST,
    jdSpecificQuestions: QLIST,
    skillGapQuestions: QLIST,
  },
  required: [
    "technicalQuestions",
    "projectQuestions",
    "hrQuestions",
    "behavioralQuestions",
    "jdSpecificQuestions",
    "skillGapQuestions",
  ],
} as const;

export const linkedInSchema = {
  type: "object",
  properties: {
    headline: S,
    aboutSection: S,
    skillsSuggestions: SARR,
    projectDescription: S,
    experienceDescription: S,
  },
  required: ["headline", "aboutSection", "skillsSuggestions", "projectDescription", "experienceDescription"],
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
