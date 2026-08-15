import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const ExperienceSchema = z.object({
  title: z.string().default(""),
  company: z.string().default(""),
  dateRange: z.string().default(""),
  bullets: z.array(z.string()).default([]),
});

const EducationSchema = z.object({
  degree: z.string().default(""),
  major: z.string().default(""),
  institution: z.string().default(""),
  year: z.string().default(""),
  score: z.string().default(""),
});

const SkillGroupSchema = z.object({
  category: z.string().default(""),
  items: z.array(z.string()).default([]),
});

const ProfileSchema = z.object({
  personal: z.object({
    fullName: z.string().default(""),
    title: z.string().default(""),
    email: z.string().default(""),
    phone: z.string().default(""),
    linkedin: z.string().default(""),
    github: z.string().default(""),
    portfolio: z.string().default(""),
    summary: z.string().default(""),
  }),
  skills: z.array(SkillGroupSchema).default([]),
  experience: z.array(ExperienceSchema).default([]),
  education: z.array(EducationSchema).default([]),
});

const InputSchema = z.object({
  profile: ProfileSchema,
  jobDescription: z.string().min(1),
});

export type ResumeInput = z.infer<typeof InputSchema>;

export type OptimizedResume = {
  atsScore: number;
  matchingKeywords: string[];
  missingKeywords: string[];
  optimizedProfile: {
    personal: {
      fullName: string;
      title: string;
      email: string;
      phone: string;
      linkedin: string;
      github: string;
      portfolio: string;
      summary: string;
    };
    skills: { category: string; items: string[] }[];
    experience: {
      title: string;
      company: string;
      dateRange: string;
      bullets: string[];
    }[];
    education: {
      degree: string;
      major: string;
      institution: string;
      year: string;
      score: string;
    }[];
  };
};

export const generateResume = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data, context }): Promise<OptimizedResume> => {
    // ATS scoring/analysis is free for every authenticated user.
    // Premium gating applies only to exports (see billing.functions.ts).
    void context.userId;
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("Missing LOVABLE_API_KEY");

    const systemPrompt = `You are an expert ATS (Applicant Tracking System) Specialist and Career Coach.
Analyze the candidate profile against the target Job Description and produce an ATS-optimized resume.
Rules:
- Rewrite the professional summary and each experience bullet using the X-Y-Z Action Verb Method: "Accomplished [X], as measured by [Y], by doing [Z]".
- Naturally integrate missing keywords from the JD. NEVER fabricate experience, employers, dates, or metrics that aren't in the source profile. If a metric is missing, use qualitative phrasing.
- Tailor skills and phrasing to target a 90+ ATS match score.
- Keep bullets concise (max ~30 words), start with a strong action verb, quantify where possible.
- Return ONLY valid JSON matching the schema — no markdown, no prose.`;

    const userPrompt = `JOB DESCRIPTION:\n${data.jobDescription}\n\nCANDIDATE PROFILE (JSON):\n${JSON.stringify(data.profile, null, 2)}`;

    const schema = {
      type: "object",
      properties: {
        atsScore: { type: "number" },
        matchingKeywords: { type: "array", items: { type: "string" } },
        missingKeywords: { type: "array", items: { type: "string" } },
        optimizedProfile: {
          type: "object",
          properties: {
            personal: {
              type: "object",
              properties: {
                fullName: { type: "string" },
                title: { type: "string" },
                email: { type: "string" },
                phone: { type: "string" },
                linkedin: { type: "string" },
                github: { type: "string" },
                portfolio: { type: "string" },
                summary: { type: "string" },
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
              additionalProperties: false,
            },
            skills: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  category: { type: "string" },
                  items: { type: "array", items: { type: "string" } },
                },
                required: ["category", "items"],
                additionalProperties: false,
              },
            },
            experience: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  company: { type: "string" },
                  dateRange: { type: "string" },
                  bullets: { type: "array", items: { type: "string" } },
                },
                required: ["title", "company", "dateRange", "bullets"],
                additionalProperties: false,
              },
            },
            education: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  degree: { type: "string" },
                  major: { type: "string" },
                  institution: { type: "string" },
                  year: { type: "string" },
                  score: { type: "string" },
                },
                required: ["degree", "major", "institution", "year", "score"],
                additionalProperties: false,
              },
            },
          },
          required: ["personal", "skills", "experience", "education"],
          additionalProperties: false,
        },
      },
      required: [
        "atsScore",
        "matchingKeywords",
        "missingKeywords",
        "optimizedProfile",
      ],
      additionalProperties: false,
    };

    const res = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "google/gemini-3.6-flash",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "optimized_resume",
              strict: true,
              schema,
            },
          },
        }),
      },
    );

    if (!res.ok) {
      const body = await res.text();
      if (res.status === 429)
        throw new Error("Rate limit reached. Please try again in a moment.");
      if (res.status === 402)
        throw new Error(
          "AI credits exhausted. Add credits in your Lovable workspace to continue.",
        );
      throw new Error(`AI request failed [${res.status}]: ${body}`);
    }

    const json = (await res.json()) as {
      choices: { message: { content: string } }[];
    };
    const content = json.choices?.[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(content) as OptimizedResume;
    // clamp score
    parsed.atsScore = Math.max(0, Math.min(100, Math.round(parsed.atsScore)));
    return parsed;
  });