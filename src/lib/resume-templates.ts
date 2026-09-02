/**
 * Resume template system.
 *
 * A template is pure *presentation* configuration — it never touches resume
 * content, AI generation, scoring or entitlements. The renderer
 * (`ResumePreview`) turns structured resume data + a config into real HTML so
 * the output stays selectable, searchable and ATS-readable.
 */

export type SectionKey = "summary" | "skills" | "experience" | "education";

export type TemplateConfig = {
  templateName: string;
  fontFamily: string;
  bodyFontSize: number; // pt
  nameFontSize: number; // pt
  headingFontSize: number; // pt
  headingWeight: number;
  lineHeight: number;
  textColor: string;
  headingColor: string;
  accentColor: string;
  dividerColor: string;
  marginTop: number; // mm
  marginBottom: number;
  marginLeft: number;
  marginRight: number;
  sectionSpacing: number; // px
  itemSpacing: number; // px
  bulletSpacing: number; // px
  headerAlignment: "left" | "center" | "right";
  contactLayout: "inline" | "stacked";
  uppercaseHeadings: boolean;
  showDividers: boolean;
  sectionOrder: SectionKey[];
  sections: Record<SectionKey, boolean>;
  showFooter: boolean;
  footerText: string;
};

export const DEFAULT_SECTION_ORDER: SectionKey[] = [
  "summary",
  "experience",
  "education",
  "skills",
];

/** "Professional ATS Classic" — the default, reference-inspired template. */
export const ATS_CLASSIC: TemplateConfig = {
  templateName: "Professional ATS Classic",
  fontFamily: '"Times New Roman", Georgia, serif',
  bodyFontSize: 10.5,
  nameFontSize: 20,
  headingFontSize: 11,
  headingWeight: 700,
  lineHeight: 1.25,
  textColor: "#111111",
  headingColor: "#000000",
  accentColor: "#333333",
  dividerColor: "#999999",
  marginTop: 14,
  marginBottom: 14,
  marginLeft: 16,
  marginRight: 16,
  sectionSpacing: 12,
  itemSpacing: 9,
  bulletSpacing: 2,
  headerAlignment: "center",
  contactLayout: "inline",
  uppercaseHeadings: true,
  showDividers: true,
  sectionOrder: DEFAULT_SECTION_ORDER,
  sections: { summary: true, skills: true, experience: true, education: true },
  showFooter: false,
  footerText: "",
};

export type BuiltinTemplate = {
  id: string;
  name: string;
  description: string;
  config: TemplateConfig;
};

const variant = (over: Partial<TemplateConfig>, name: string): TemplateConfig => ({
  ...ATS_CLASSIC,
  ...over,
  templateName: name,
  sections: { ...ATS_CLASSIC.sections, ...(over.sections ?? {}) },
  sectionOrder: over.sectionOrder ?? ATS_CLASSIC.sectionOrder,
});

export const BUILTIN_TEMPLATES: BuiltinTemplate[] = [
  {
    id: "ats-classic",
    name: "Professional ATS Classic",
    description: "Recommended · compact corporate single column",
    config: ATS_CLASSIC,
  },
  {
    id: "modern-ats",
    name: "Modern ATS",
    description: "Sans-serif, left header, airy spacing",
    config: variant(
      {
        fontFamily: "Arial, Helvetica, sans-serif",
        bodyFontSize: 10.5,
        nameFontSize: 22,
        headingFontSize: 10.5,
        headerAlignment: "left",
        sectionSpacing: 14,
        lineHeight: 1.35,
        headingColor: "#1f2937",
        dividerColor: "#c7ccd4",
      },
      "Modern ATS",
    ),
  },
  {
    id: "minimal-ats",
    name: "Minimal ATS",
    description: "No dividers, generous whitespace",
    config: variant(
      {
        fontFamily: "Arial, Helvetica, sans-serif",
        showDividers: false,
        nameFontSize: 19,
        sectionSpacing: 15,
        headerAlignment: "left",
        headingColor: "#111111",
      },
      "Minimal ATS",
    ),
  },
  {
    id: "technical-developer",
    name: "Technical Developer",
    description: "Skills first, dense layout for engineers",
    config: variant(
      {
        fontFamily: "Arial, Helvetica, sans-serif",
        bodyFontSize: 10,
        lineHeight: 1.2,
        sectionSpacing: 10,
        itemSpacing: 7,
        headerAlignment: "left",
        sectionOrder: ["summary", "skills", "experience", "education"],
      },
      "Technical Developer",
    ),
  },
  {
    id: "executive",
    name: "Executive",
    description: "Serif, larger name, summary-led",
    config: variant(
      {
        fontFamily: 'Georgia, "Times New Roman", serif',
        nameFontSize: 24,
        headingFontSize: 12,
        bodyFontSize: 11,
        lineHeight: 1.35,
        sectionSpacing: 15,
        headerAlignment: "center",
        accentColor: "#222222",
      },
      "Executive",
    ),
  },
  {
    id: "clean-professional",
    name: "Clean Professional",
    description: "Balanced sans-serif, subtle grey headings",
    config: variant(
      {
        fontFamily: '"Helvetica Neue", Arial, sans-serif',
        headingColor: "#374151",
        dividerColor: "#d1d5db",
        nameFontSize: 21,
        sectionSpacing: 13,
        headerAlignment: "center",
      },
      "Clean Professional",
    ),
  },
];

export const SECTION_LABELS: Record<SectionKey, string> = {
  summary: "Professional Summary",
  experience: "Experience & Projects",
  education: "Education",
  skills: "Technical Skills",
};

export const FONT_CHOICES = [
  { label: "Times New Roman (classic)", value: '"Times New Roman", Georgia, serif' },
  { label: "Georgia (serif)", value: 'Georgia, "Times New Roman", serif' },
  { label: "Arial (ATS safe)", value: "Arial, Helvetica, sans-serif" },
  { label: "Helvetica Neue", value: '"Helvetica Neue", Arial, sans-serif' },
  { label: "Calibri", value: "Calibri, Candara, Arial, sans-serif" },
  { label: "Verdana", value: "Verdana, Geneva, sans-serif" },
];

/** Non-blocking ATS readability warnings for custom templates. */
export function atsWarnings(c: TemplateConfig): string[] {
  const out: string[] = [];
  if (c.bodyFontSize < 9) out.push("Body text under 9pt can be hard for recruiters and parsers to read.");
  if (c.nameFontSize < c.bodyFontSize + 2) out.push("Your name should stand out clearly above body text.");
  if (c.lineHeight < 1.05) out.push("Very tight line height can cause overlapping text in PDF exports.");
  if (contrastTooLow(c.textColor)) out.push("Light body text colour reduces contrast and readability.");
  if (contrastTooLow(c.headingColor)) out.push("Light heading colour reduces contrast and readability.");
  if (c.marginLeft < 8 || c.marginRight < 8 || c.marginTop < 8 || c.marginBottom < 8)
    out.push("Margins under 8mm may be clipped by some printers and PDF parsers.");
  if (!c.sections.experience) out.push("Hiding Experience removes the section recruiters and ATS weight most.");
  return out;
}

function contrastTooLow(hex: string): boolean {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return false;
  const n = parseInt(m[1], 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  // Relative luminance — anything brighter than mid-grey is too light on white.
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255 > 0.55;
}

export function normalizeConfig(raw: unknown): TemplateConfig {
  const c = (raw ?? {}) as Partial<TemplateConfig>;
  const order = Array.isArray(c.sectionOrder)
    ? (c.sectionOrder.filter((k) => k in SECTION_LABELS) as SectionKey[])
    : DEFAULT_SECTION_ORDER;
  const missing = DEFAULT_SECTION_ORDER.filter((k) => !order.includes(k));
  return {
    ...ATS_CLASSIC,
    ...c,
    sections: { ...ATS_CLASSIC.sections, ...(c.sections ?? {}) },
    sectionOrder: [...order, ...missing],
  };
}

/**
 * Defense-in-depth: only allow plain font-stack characters before a font value
 * is interpolated into CSS. Anything else falls back to an ATS-safe stack.
 */
export function safeFontFamily(value: string | undefined | null): string {
  const v = (value ?? "").trim();
  if (!v || !/^[A-Za-z0-9 ,'"-]+$/.test(v)) return "Arial, Helvetica, sans-serif";
  return v;
}
