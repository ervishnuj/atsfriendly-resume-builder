import { z } from "zod";

/**
 * Bounded schemas for the profile/template save endpoints. Every string,
 * array and number carries an explicit size limit so an authenticated user
 * cannot store oversized or malformed payloads in their own database row.
 */

const short = (max = 200) => z.string().trim().max(max);
const boundedList = (item: z.ZodTypeAny, max: number) => z.array(item).max(max);

export const SaveProfileSchema = z.object({
  profile: z.object({
    personal: z.object({
      fullName: short(120).default(""),
      title: short(120).default(""),
      email: short(255).default(""),
      phone: short(40).default(""),
      linkedin: short(300).default(""),
      github: short(300).default(""),
      portfolio: short(300).default(""),
      summary: short(3000).default(""),
    }),
    skills: boundedList(
      z.object({
        category: short(80).default(""),
        items: boundedList(short(80), 60).default([]),
      }),
      30,
    ).default([]),
    experience: boundedList(
      z.object({
        title: short(120).default(""),
        company: short(120).default(""),
        dateRange: short(60).default(""),
        bullets: boundedList(short(500), 20).default([]),
      }),
      30,
    ).default([]),
    education: boundedList(
      z.object({
        degree: short(120).default(""),
        major: short(120).default(""),
        institution: short(160).default(""),
        year: short(30).default(""),
        score: short(30).default(""),
      }),
      15,
    ).default([]),
  }),
});

const sectionKey = z.enum(["summary", "skills", "experience", "education"]);
const fontSize = (min: number, max: number) => z.number().min(min).max(max);
const color = z
  .string()
  .trim()
  .max(40)
  .regex(/^[#a-zA-Z0-9(),.%\s-]+$/, "Invalid color value.");

export const SaveTemplateSchema = z.object({
  id: z.string().trim().max(64).nullish(),
  name: z.string().trim().min(1, "Please enter a template name.").max(80),
  config: z.object({
    templateName: short(80).default(""),
    fontFamily: short(120).default(""),
    bodyFontSize: fontSize(7, 16),
    nameFontSize: fontSize(12, 40),
    headingFontSize: fontSize(8, 20),
    headingWeight: z.number().int().min(100).max(900),
    lineHeight: z.number().min(1).max(2.5),
    textColor: color,
    headingColor: color,
    accentColor: color,
    dividerColor: color,
    marginTop: z.number().min(0).max(40),
    marginBottom: z.number().min(0).max(40),
    marginLeft: z.number().min(0).max(40),
    marginRight: z.number().min(0).max(40),
    sectionSpacing: z.number().min(0).max(60),
    itemSpacing: z.number().min(0).max(40),
    bulletSpacing: z.number().min(0).max(20),
    headerAlignment: z.enum(["left", "center", "right"]),
    contactLayout: z.enum(["inline", "stacked"]),
    uppercaseHeadings: z.boolean(),
    showDividers: z.boolean(),
    sectionOrder: z.array(sectionKey).max(8),
    sections: z.object({
      summary: z.boolean(),
      skills: z.boolean(),
      experience: z.boolean(),
      education: z.boolean(),
    }),
    showFooter: z.boolean(),
    footerText: short(200).default(""),
  }),
});

export const DeleteTemplateSchema = z.object({
  id: z.string().trim().min(1).max(64),
});
