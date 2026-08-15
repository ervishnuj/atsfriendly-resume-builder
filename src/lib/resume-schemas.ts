import { z } from "zod";

export const ExperienceSchema = z.object({
  title: z.string().default(""),
  company: z.string().default(""),
  dateRange: z.string().default(""),
  bullets: z.array(z.string()).default([]),
});

export const EducationSchema = z.object({
  degree: z.string().default(""),
  major: z.string().default(""),
  institution: z.string().default(""),
  year: z.string().default(""),
  score: z.string().default(""),
});

export const SkillGroupSchema = z.object({
  category: z.string().default(""),
  items: z.array(z.string()).default([]),
});

export const ProfileSchema = z.object({
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

export const ResumeInputSchema = z.object({
  profile: ProfileSchema,
  jobDescription: z.string().min(1),
});

export type ProfileInput = z.infer<typeof ProfileSchema>;

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

export type AtsAnalysis = {
  score: number;
  matchingKeywords: string[];
  missingKeywords: string[];
  skillsMatched: string[];
  skillsMissing: string[];
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
};

export type SkillGapAnalysis = {
  matchedSkills: string[];
  missingSkills: string[];
  partialSkills: string[];
  learningPlan: { skill: string; why: string; howToLearn: string; priority: string }[];
};

export type CoverLetterResult = { coverLetter: string; highlights: string[] };
