import { ROLE_GUIDES } from "./role-guides";

export interface GuideSection {
  heading: string;
  paragraphs?: string[];
  bullets?: string[];
}

export interface Guide {
  slug: string;
  title: string;
  metaTitle: string;
  description: string;
  readingMinutes: number;
  updated: string;
  intro: string;
  sections: GuideSection[];
  takeaways: string[];
}

export const GUIDES: Guide[] = [
  {
    slug: "ats-resume-format",
    title: "ATS Resume Format: Layout, Headings and Date Examples",
    metaTitle: "ATS Resume Format & Date Examples | TheResumeRocket",
    description:
      "Practical ATS resume formatting guidance with section order, readable headings, month/year date examples and selectable PDF or DOCX checks.",
    readingMinutes: 6,
    updated: "November 2026",
    intro:
      "Use a clear reading order, familiar section headings and consistent dates so recruiters and parsing software can understand your resume. These are conservative formatting practices, not a guarantee that every applicant tracking system will parse every file the same way.",
    sections: [
      {
        heading: "Use a single-column layout",
        paragraphs: [
          "A single-column layout reduces the risk of text from sidebars and main content being interleaved during extraction. Some systems handle columns well, but a simple reading order is easier to inspect yourself.",
        ],
        bullets: [
          "No text boxes, no tables for layout, no headers or footers holding contact details.",
          "Put your name, phone, email, city and LinkedIn URL as plain lines at the top of the body.",
          "Avoid icons in place of labels — a phone glyph is not extractable text.",
        ],
      },
      {
        heading: "Name your sections the way the parser expects",
        paragraphs: [
          "Familiar section headings help people and parsing software identify your content. Creative labels may be harder to interpret, so keep important labels descriptive.",
        ],
        bullets: [
          "Use: Summary, Skills, Experience (or Work Experience), Education, Certifications, Projects.",
          "Avoid: \"Where I've Made Impact\", \"My Toolkit\", \"Chapters\".",
          "Keep headings on their own line, in the same case, larger or bolder than body text.",
        ],
      },
      {
        heading: "ATS-friendly date format for your resume",
        paragraphs: [
          "Clear date ranges help readers understand when you held a role. Inconsistent or ambiguous dates can create interpretation errors; the effect depends on the employer and its software.",
          "A readable ATS-friendly date format is a short month name plus a four-digit year, such as \"Mar 2023 – Present\". A numeric \"03/2023 – Present\" is another understandable choice. Choose one format and use it for every role, degree and certification.",
        ],
        bullets: [
          "Good: \"Mar 2023 – Present\", \"Jun 2020 – Feb 2023\", \"03/2023 – 11/2024\".",
          "Avoid: \"2023 – now\", \"Spring '22\", \"3.23 – 11.24\", or a month with no year.",
          "Always include the year. Add months for employment when you know them; a graduation year alone can be appropriate. Never invent dates to fill gaps.",
          "Write \"Present\" for a current role rather than leaving the end date blank.",
          "Put the date on the same line as the role or immediately below it, never in a margin, table or text box.",
        ],
      },
      {
        heading: "Short example of an ATS-friendly experience entry",
        paragraphs: [
          "Here is how one role looks when the title, employer, location and dates are plain text in a single column:",
        ],
        bullets: [
          "Software Engineer — Acme Technologies, Bengaluru | Mar 2023 – Present",
          "Built REST APIs in Java and Spring Boot that handled 2M requests per day.",
          "Reduced page load time by 35% by moving reports to cached SQL views.",
          "Education: B.Tech, Computer Science — Example Institute of Technology | Aug 2018 – May 2022",
          "(This is a fictional example. Use only your own real roles, dates and results.)",
        ],
      },
      {
        heading: "Check your format before you apply",
        paragraphs: [
          "Upload your PDF or DOCX, or paste the text, into the free checker with a target job description. It runs in your browser with no sign-up and shows whether your sections, dates and keywords are readable. It is an estimate, not an employer's screening decision.",
        ],
      },
      {
        heading: "Fonts, bullets and file type",
        bullets: [
          "Stick to Arial, Calibri, Helvetica, Georgia or Times New Roman at 10–12pt.",
          "Use standard round bullets. Wingdings, emoji and custom glyphs can parse as junk characters.",
          "Export PDF from a text-based document. A scanned or image-based PDF contains no text at all.",
          "If a portal explicitly asks for .docx, send .docx — do not out-think the instructions.",
        ],
      },
      {
        heading: "Length and density",
        bullets: [
          "Aim for a concise resume that retains relevant evidence; one page often suits early-career candidates, while two pages may suit substantial experience. There is no universal years-to-pages rule.",
          "Include enough detail to support the role without repeating yourself. A checker's word-count heuristic is not an employer's hiring rule.",
          "Choose a few relevant bullets per role. Use a clear action and an outcome or scope you can support; numbers are useful only when genuine.",
        ],
      },
    ],
    takeaways: [
      "One column, standard headings, consistent dates.",
      "Text-based PDF, common font, plain bullets.",
      "Contact details in the body, never in the page header.",
    ],
  },
  {
    slug: "ats-keywords",
    title: "How to Find and Use ATS Keywords From a Job Description",
    metaTitle: "ATS Keywords: Match a Job Description | TheResumeRocket",
    description:
      "A repeatable method for pulling the right keywords out of a job posting and placing them in your resume without keyword stuffing.",
    readingMinutes: 7,
    updated: "November 2026",
    intro:
      "Keyword matching is the part of ATS screening you can actually control. The goal is not to cram terms in; it is to make sure every requirement you genuinely meet appears in your resume in the same words the posting uses.",
    sections: [
      {
        heading: "Pull the keywords out of the posting, not out of your head",
        paragraphs: [
          "Copy the full job description into a plain text editor and mark every noun phrase that names a tool, method, certification, domain or deliverable. Those are your candidate keywords.",
        ],
        bullets: [
          "Hard skills and tools: Python, Kubernetes, Salesforce, IFRS, Figma.",
          "Methods and frameworks: A/B testing, Agile, SOC 2, demand forecasting.",
          "Domain nouns: claims adjudication, supply chain, B2B SaaS renewals.",
          "Ignore filler: \"fast-paced environment\", \"team player\", \"rockstar\".",
        ],
      },
      {
        heading: "Separate required from preferred",
        paragraphs: [
          "Read explicit required and preferred labels rather than assuming the first bullets are always most important. Prioritise required qualifications you genuinely meet; employer weighting varies.",
        ],
      },
      {
        heading: "Match the posting's exact wording — plus one variant",
        paragraphs: [
          "Some matching tools rely on exact terms, while others recognise related wording. When accurate, spell out an acronym alongside its common form so your evidence is understandable to people and software.",
        ],
        bullets: [
          "\"Built CI/CD pipelines (continuous integration and delivery) in GitHub Actions.\"",
          "Spell out acronyms once: \"Search Engine Optimization (SEO)\".",
          "Match singular/plural and punctuation: Node.js vs Node, React.js vs React.",
        ],
      },
      {
        heading: "Place keywords where they earn credibility",
        bullets: [
          "Skills section: the flat list of tools, for the matcher.",
          "Experience bullets: the same terms attached to an outcome, for the human.",
          "Summary: the three or four terms that define the role you are targeting.",
          "Never use hidden text or misleading keyword blocks. They can appear in extracted text and undermine trust; include relevant terms visibly with real evidence.",
        ],
      },
      {
        heading: "Aim for coverage, then stop",
        paragraphs: [
          "There is no universal keyword-coverage percentage that makes a candidate competitive. Run the resume and posting through the free checker to identify possible wording gaps, then review which requirements you genuinely meet.",
        ],
      },
    ],
    takeaways: [
      "Extract keywords from the posting itself; prioritise required over preferred.",
      "Use their exact wording plus one natural variant.",
      "Support every keyword with a real bullet — coverage without evidence fails the human screen.",
    ],
  },
  {
    slug: "resume-mistakes",
    title: "12 Resume Mistakes That Quietly Cost You Interviews",
    metaTitle: "12 Common Resume Mistakes & Fixes | TheResumeRocket",
    description:
      "A practical checklist of formatting, wording and content issues to review before applying, with specific fixes that preserve truthful evidence.",
    readingMinutes: 5,
    updated: "November 2026",
    intro:
      "These are the issues that show up again and again when resumes are scored against real job descriptions. Each one has a concrete fix you can apply in a few minutes.",
    sections: [
      {
        heading: "Content mistakes",
        bullets: [
          "Vague duties without context. Fix: describe your action and its genuine outcome or scope. Use a number only if you can substantiate it.",
          "One resume for every application. Fix: rewrite the summary and top three bullets per posting.",
          "A summary that describes your personality. Fix: role, years, domain, two headline achievements.",
          "Missing the job title you are applying for. Fix: mirror the posting's title if your work honestly matches it.",
        ],
      },
      {
        heading: "Formatting mistakes",
        bullets: [
          "Contact details in the page header. Fix: move them into the document body.",
          "Skills in a sidebar column. Fix: single column, dedicated Skills section.",
          "Inconsistent or missing dates. Fix: \"Mon YYYY – Mon YYYY\" everywhere.",
          "Image-based or design-tool PDF exports. Fix: export selectable text and confirm you can copy-paste it.",
        ],
      },
      {
        heading: "Language mistakes",
        bullets: [
          "Passive voice: \"was responsible for\". Fix: lead with a verb — led, shipped, reduced, negotiated.",
          "Unexplained internal jargon. Fix: describe the outcome in industry-standard terms.",
          "Buzzword clusters with no evidence. Fix: one claim, one proof point.",
          "Typos in the first 40 words. Fix: read the top section aloud before every send.",
        ],
      },
    ],
    takeaways: [
      "Results beat responsibilities on every bullet.",
      "Tailor the top third of the resume to each posting.",
      "If you cannot copy-paste readable text, check the export or use the employer's requested format; some systems have OCR, but you should not rely on it.",
    ],
  },
  ...ROLE_GUIDES,
];

/** Older/alternate URLs that should resolve to a canonical guide slug. */
export const GUIDE_SLUG_ALIASES: Record<string, string> = {
  "keyword-matching": "ats-keywords",
  "ats-keyword-matching": "ats-keywords",
  "resume-format": "ats-resume-format",
};

export function resolveGuideSlug(slug: string): string {
  return GUIDE_SLUG_ALIASES[slug] ?? slug;
}

export function getGuide(slug: string): Guide | undefined {
  const resolved = resolveGuideSlug(slug);
  return GUIDES.find((g) => g.slug === resolved);
}
