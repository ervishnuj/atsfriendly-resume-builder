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
    title: "ATS Resume Format: The Layout That Parses Cleanly Every Time",
    metaTitle: "ATS Resume Format Guide (2026) | Resume Rocket",
    description:
      "A practical, parser-tested resume format: section order, headings, dates, fonts and file types that applicant tracking systems read without errors.",
    readingMinutes: 6,
    updated: "September 2026",
    intro:
      "Most resumes are rejected before a human reads them because the applicant tracking system could not reliably extract the text. Formatting is the cheapest problem to fix, and this guide covers the layout rules that hold across Workday, Greenhouse, Lever, Taleo and iCIMS.",
    sections: [
      {
        heading: "Use a single-column layout",
        paragraphs: [
          "Two-column resumes look designed, but many parsers read a page left-to-right line by line. A sidebar of skills gets interleaved into your job bullets and the result is unreadable text. Keep one column from top to bottom.",
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
          "Parsers map sections by matching headings against a known list. Creative labels break that mapping and your experience ends up in an unclassified blob.",
        ],
        bullets: [
          "Use: Summary, Skills, Experience (or Work Experience), Education, Certifications, Projects.",
          "Avoid: \"Where I've Made Impact\", \"My Toolkit\", \"Chapters\".",
          "Keep headings on their own line, in the same case, larger or bolder than body text.",
        ],
      },
      {
        heading: "Write dates in one consistent format",
        paragraphs: [
          "Date ranges drive the tenure and gap calculations recruiters filter on. Mixed formats often parse as missing dates, which quietly drops you out of experience filters.",
        ],
        bullets: [
          "Use \"Mar 2023 – Present\" or \"03/2023 – Present\" — pick one and repeat it.",
          "Always include the year. Month-only or year-only ranges cause tenure errors.",
          "Put the date on the same line as the role or immediately below it, never in a margin.",
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
          "One page for under 8 years of experience, two pages beyond that.",
          "400–800 words is the sweet spot; under 300 words usually scores poorly on completeness.",
          "3–6 bullets per role, each starting with a verb and containing one measurable outcome.",
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
    metaTitle: "ATS Keywords: How to Match a Job Description | Resume Rocket",
    description:
      "A repeatable method for pulling the right keywords out of a job posting and placing them in your resume without keyword stuffing.",
    readingMinutes: 7,
    updated: "September 2026",
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
          "Requirements listed under \"must have\", \"required\" or in the first three bullets carry the most screening weight. Preferred and \"nice to have\" items are tie-breakers. Cover every required term you truthfully meet before you spend space on the optional ones.",
        ],
      },
      {
        heading: "Match the posting's exact wording — plus one variant",
        paragraphs: [
          "Some parsers do exact string matching. If the posting says \"CI/CD\" and your resume says \"continuous delivery pipelines\", a strict matcher scores zero. Write both the way they wrote it and your natural phrasing.",
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
          "Never use white text, hidden layers or a keyword block — screening software flags it and recruiters reject on sight.",
        ],
      },
      {
        heading: "Aim for coverage, then stop",
        paragraphs: [
          "Above roughly 75% coverage of the meaningful terms in a posting, you are competitive on keywords and further additions start to read as stuffing. Run the resume and the posting through the free checker to see exactly which required terms are still missing.",
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
    metaTitle: "12 Common Resume Mistakes and How to Fix Them | Resume Rocket",
    description:
      "The formatting, wording and content mistakes that most often sink otherwise strong resumes — and the specific fix for each one.",
    readingMinutes: 5,
    updated: "September 2026",
    intro:
      "These are the issues that show up again and again when resumes are scored against real job descriptions. Each one has a concrete fix you can apply in a few minutes.",
    sections: [
      {
        heading: "Content mistakes",
        bullets: [
          "Duties instead of results. Fix: end each bullet with a number — volume, percentage, money or time.",
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
      "If you cannot copy-paste your PDF's text, neither can the ATS.",
    ],
  },
];

export function getGuide(slug: string): Guide | undefined {
  return GUIDES.find((g) => g.slug === slug);
}
