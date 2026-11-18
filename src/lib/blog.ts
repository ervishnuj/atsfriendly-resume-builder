export interface BlogSection {
  heading: string;
  paragraphs?: string[];
  bullets?: string[];
}

export interface BlogPost {
  slug: string;
  title: string;
  metaTitle: string;
  description: string;
  category: string;
  readingMinutes: number;
  published: string;
  publishedIso: string;
  intro: string;
  sections: BlogSection[];
  takeaways: string[];
}

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: "why-ats-rejects-resumes",
    title: "Why an ATS Rejects a Good Resume (and How to Tell if Yours Is at Risk)",
    metaTitle: "Why ATS Rejects Your Resume: 4 Fixable Reasons + Free Check",
    description:
      "Rejected by an ATS despite being qualified? Learn the 4 common reasons (unreadable PDFs, odd headings, dates, missing keywords), a 5-minute self-test and a free ATS checker.",
    category: "ATS basics",
    readingMinutes: 6,
    published: "5 September 2026",
    publishedIso: "2026-09-05",
    intro:
      "Applicant tracking systems help employers collect and organise applications. Depending on the configuration, screening may involve eligibility questions, recruiter review, parsing and search. A rejection alone does not reveal its cause. The four checks below address preventable presentation problems, not every hiring decision.",
    sections: [
      {
        heading: "Failure one: the parser could not read the document",
        paragraphs: [
          "An image-only PDF or outlined text may not contain selectable characters. Extraction can fail without OCR; systems differ in OCR support. A text-based export is easier to review and less dependent on that support.",
        ],
        bullets: [
          "Self-test: open your PDF, select all, copy, and paste into a plain text editor. If nothing appears, or the order is scrambled, that is what the ATS sees.",
          "Fix: export from a text-based document, or rebuild the resume in a single-column layout.",
        ],
      },
      {
        heading: "Failure two: sections landed in the wrong field",
        paragraphs: [
          "Clear headings such as Experience and Education make content easier to classify. Unusual labels can create ambiguity; they do not prove that an employer will ignore your experience.",
        ],
        bullets: [
          "Use plain headings: Summary, Skills, Experience, Education, Certifications, Projects.",
          "Keep each heading alone on its line, visually distinct from body text.",
        ],
      },
      {
        heading: "Failure three: dates that cannot be computed",
        paragraphs: [
          "Recruiters may review or filter experience dates. Ambiguous ranges can complicate that review. Use consistent month/year ranges where known, without inventing dates.",
        ],
        bullets: [
          "Pick one format — \"Mar 2023 – Present\" — and repeat it in every entry.",
          "Always include the year; never place the date in a sidebar or margin.",
        ],
      },
      {
        heading: "Failure four: the words do not match the requisition",
        paragraphs: [
          "Some search and matching tools depend on terms, while others recognise related language. If you genuinely implemented CI/CD, say so alongside a concrete deployment example. A different phrase alone does not establish the reason for rejection.",
          "To see which of the job's terms your resume is missing, paste both into the free checker — no sign-up needed. Only add a missing term if you genuinely have that skill or experience.",
        ],
      },
      {
        heading: "A five-minute self-check",
        bullets: [
          "Copy-paste test: does the text come out in reading order?",
          "Heading test: are all six standard section names present and spelled conventionally?",
          "Date test: is every range in one format, with years?",
          "Keyword test: paste the resume and the posting into the free checker and read the missing-terms list.",
        ],
      },
    ],
    takeaways: [
      "A rejection does not identify its cause; check readability, eligibility and job relevance separately.",
      "Copy-paste your own PDF — that is the version the software reads.",
      "Standard headings, consistent dates and supported terminology can reduce avoidable ambiguity.",
    ],
  },
  {
    slug: "tailor-resume-in-20-minutes",
    title: "How to Tailor a Resume to a Job Description in 20 Minutes",
    metaTitle: "Tailor Your Resume to a Job Description in 20 Minutes | Resume Rocket",
    description:
      "A timed, repeatable workflow for adapting one base resume to each application: what to change, what to leave alone, and where the score actually moves.",
    category: "Tactics",
    readingMinutes: 7,
    published: "5 September 2026",
    publishedIso: "2026-09-05",
    intro:
      "Tailoring does not mean rewriting. Your factual history stays fixed; relevant emphasis can change across the summary, skills and bullets. Here is the workflow, with time budgets, that we use when scoring resumes against real postings.",
    sections: [
      {
        heading: "Minutes 0–5: extract the requirements",
        paragraphs: [
          "Paste the posting into a plain text editor. Mark every noun phrase that names a tool, method, certification, domain or deliverable. Separate the ones under \"required\" or in the first three bullets from the \"nice to have\" list — the first group carries the screening weight.",
        ],
      },
      {
        heading: "Minutes 5–10: rewrite the summary",
        paragraphs: [
          "Use a short summary to clarify your target role and relevant evidence. Include years, domain or achievements only when accurate; there is no universal rule that a matcher reads the summary first.",
        ],
        bullets: [
          "Mirror the posting's job title if your work honestly matches it.",
          "Include the three or four terms that define the role, verbatim.",
          "Cut anything about personality, passion or fast-paced environments.",
        ],
      },
      {
        heading: "Minutes 10–15: reorder and rewrite the top bullets",
        paragraphs: [
          "Under your most recent role, promote the bullets that map onto the required list and rewrite them to use the posting's terms. Each bullet: a truthful action, what you did, relevant terminology and a supported outcome or scope.",
        ],
        bullets: [
          "Fictional illustration: the following after-example adds details that must be verified, not inferred from the before sentence.",
          "Before: \"Responsible for deployment automation across services.\"",
          "After: \"Built CI/CD pipelines in GitHub Actions for 14 services, cutting release time from 3 hours to 20 minutes.\"",
        ],
      },
      {
        heading: "Minutes 15–18: reconcile the skills section",
        paragraphs: [
          "Your skills list is the flat inventory the matcher reads. Add every required term you truthfully hold and that appears somewhere in your experience. Remove terms irrelevant to this posting — they dilute the match and add nothing for the reader.",
        ],
      },
      {
        heading: "Minutes 18–20: score and stop",
        paragraphs: [
          "Run the resume and the posting through the free ATS check. No universal coverage percentage establishes competitiveness. Fix only the missing required terms you can honestly support, then send it.",
        ],
      },
    ],
    takeaways: [
      "Change the summary, the top bullets and the skills list — leave the rest.",
      "Every added keyword needs a real bullet behind it.",
      "Stop at good coverage; stuffing costs you the human screen.",
    ],
  },
  {
    slug: "resume-bullet-points-that-score",
    title: "Writing Resume Bullet Points That Score With Software and Humans",
    metaTitle: "How to Write Resume Bullet Points That Score | Resume Rocket",
    description:
      "A formula for bullets that carry keywords for the parser and evidence for the recruiter, with before-and-after rewrites across several roles.",
    category: "Writing",
    readingMinutes: 6,
    published: "5 September 2026",
    publishedIso: "2026-09-05",
    intro:
      "A bullet has two audiences. The matcher wants the exact terms from the requisition; the recruiter, who spends seconds on the page, wants proof you produced a result. One sentence can serve both if you build it in a fixed order.",
    sections: [
      {
        heading: "The formula",
        paragraphs: [
          "Action verb → what you built or changed → the tool or method named in the posting → the measurable outcome. Keep it to one or two lines; three-line bullets get skimmed past.",
        ],
        bullets: [
          "Verbs that work: led, shipped, built, migrated, reduced, negotiated, automated, recovered.",
          "Keep the verb truthful: use assisted or contributed when you did not lead or own the work.",
        ],
      },
      {
        heading: "Find a number even when the work feels unmeasurable",
        paragraphs: [
          "Use a real volume, frequency, duration or scope when you can verify it. If no reliable metric exists, explain the deliverable and why it mattered; never fabricate a number.",
        ],
        bullets: [
          "Volume: tickets, accounts, campaigns, records, releases per month.",
          "Time: hours saved per week, cycle time before and after.",
          "Money: revenue influenced, cost avoided, budget managed.",
          "Scale: team size, users served, regions covered.",
        ],
      },
      {
        heading: "Before and after",
        paragraphs: ["These are fictional illustrations with invented metrics and tools. They are not rewrites of verified candidate evidence; use only facts you can support."],
        bullets: [
          "Support: \"Handled customer queries.\" → \"Resolved 120+ weekly support tickets in Zendesk, holding CSAT at 4.7/5 across two quarters.\"",
          "Finance: \"Prepared monthly reports.\" → \"Closed monthly IFRS reporting for three entities, cutting close time from 9 to 5 working days.\"",
          "Marketing: \"Ran social media.\" → \"Ran paid social across LinkedIn and Meta on a ₹4L monthly budget, lifting qualified leads 38% year on year.\"",
          "Engineering: \"Worked on the API.\" → \"Migrated 22 REST endpoints to a typed Node.js service, reducing p95 latency from 780ms to 210ms.\"",
        ],
      },
      {
        heading: "How many bullets per role",
        bullets: [
          "Current role: 4–6 bullets. Previous role: 3–4. Anything beyond five years back: 2, or a single line.",
          "Roles older than about ten years can be a compact list of titles, employers and dates.",
        ],
      },
    ],
    takeaways: [
      "Verb, work, their term, a number — in that order.",
      "If the outcome is unmeasurable, measure the volume or the time.",
      "Weight the bullet count toward your most recent, most relevant role.",
    ],
  },
  {
    slug: "ats-myths",
    title: "Seven ATS Myths That Are Costing You Interviews",
    metaTitle: "7 ATS Myths, Debunked | Resume Rocket Blog",
    description:
      "White-text keywords, the one-page rule, PDFs being unreadable — the ATS advice that circulates online, checked against how these systems actually behave.",
    category: "ATS basics",
    readingMinutes: 5,
    published: "5 September 2026",
    publishedIso: "2026-09-05",
    intro:
      "Applicant tracking systems are opaque, so folklore fills the gap. Some of that folklore is harmless; a few pieces of it will get your application binned. Here are the ones worth correcting.",
    sections: [
      {
        heading: "Myth: hidden white keyword text boosts your score",
        paragraphs: [
          "Hidden text may appear in extracted views and mislead a reviewer. It is not a legitimate way to present qualifications; use visible, relevant terms with genuine evidence.",
        ],
      },
      {
        heading: "Myth: an ATS cannot read PDFs",
        paragraphs: [
          "Many systems support text-based PDFs, but parser and OCR capabilities vary. Selectable text is easier to inspect than an image export. Follow the portal's file-type instructions; if it asks for DOCX, send DOCX.",
        ],
      },
      {
        heading: "Myth: a resume must be one page",
        paragraphs: [
          "Choose length based on relevant evidence and the application instructions, not a fixed years-of-experience threshold. One page can suit a focused early-career resume; longer histories may need two. No universal ATS page-count rule applies.",
        ],
      },
      {
        heading: "Myth: the ATS auto-rejects you",
        paragraphs: [
          "Employers configure screening differently. Eligibility questions may trigger automatic rules, and other applications may be searched, ranked or reviewed by recruiters. A rejection does not reveal which process applied; read the actual eligibility requirements.",
        ],
      },
      {
        heading: "Myth: creative design helps you stand out",
        paragraphs: [
          "Design should support readability for both people and software. Columns, text boxes and header contact details can complicate extraction in some systems. Review the copied text order and follow the portal instructions rather than assuming a visual style always passes or fails.",
        ],
      },
      {
        heading: "Myth: keyword stuffing wins",
        paragraphs: [
          "Keyword coverage is only one signal, and no universal percentage guarantees competitiveness. Unsupported terms can mislead the reader even if a checker recognises them. Prioritise relevant evidence over repetition.",
        ],
      },
      {
        heading: "Myth: one resume can serve every application",
        paragraphs: [
          "Tailoring relevant evidence to a posting can clarify your fit. Start with the summary and the most relevant bullets, but keep every factual claim unchanged. The time required varies and no edit guarantees a particular score or response.",
        ],
      },
    ],
    takeaways: [
      "Never hide or fabricate keywords; keep claims visible and truthful.",
      "Text-based PDFs are fine — image exports are not.",
      "Screening behaviour depends on employer settings, eligibility rules and recruiter workflows.",
    ],
  },
  {
    slug: "career-change-resume",
    title: "The Career-Change Resume: Getting Past a Filter Built for Linear Careers",
    metaTitle: "Career Change Resume: Beat the ATS Filter | Resume Rocket",
    description:
      "How to structure a resume when your job titles do not match the role you want, including transferable-skill framing that still parses cleanly.",
    category: "Situations",
    readingMinutes: 7,
    published: "5 September 2026",
    publishedIso: "2026-09-05",
    intro:
      "A career change may require explaining how existing experience supports a different role. A reverse-chronological history with a focused summary makes dates and transferable work easy to inspect. Keep official titles accurate and separate newly learned skills from employment.",
    sections: [
      {
        heading: "Do not use a functional resume",
        paragraphs: [
          "A skills-only presentation can make employers and dates harder to associate with your work. Keep a clear chronological history and use a skills summary to highlight transferable evidence rather than hiding the timeline.",
        ],
      },
      {
        heading: "Rewrite the summary as a bridge",
        paragraphs: [
          "State the target role, transferable skills and real evidence of related work. Use a genuine metric if available, or a concrete scope when it is not.",
        ],
        bullets: [
          "Fictional example, not a real candidate or a template for invented achievements.",
          "\"Operations lead moving into data analytics. Six years turning warehouse throughput data into weekly decisions; built the SQL and Power BI reporting that cut stockouts 24%. Google Data Analytics certified, 2026.\"",
        ],
      },
      {
        heading: "Use a hybrid title line when it is honest",
        paragraphs: [
          "If your official title was internal jargon, you can write the standard equivalent followed by the formal title in parentheses. Never invent seniority or a role you did not hold.",
        ],
        bullets: [
          "\"Operations Analyst (official title: Logistics Executive II)\" — accurate and searchable.",
        ],
      },
      {
        heading: "Re-cut old bullets around the new target",
        paragraphs: [
          "Same jobs, different emphasis. Lead each bullet with the part of the work that resembles the target role, and use the target field's vocabulary for it.",
        ],
        bullets: [
          "Teacher → project manager: \"Coordinated a 14-person team across a 9-month curriculum rollout, tracking milestones and reporting weekly to leadership.\"",
          "Retail manager → customer success: \"Owned retention for 400+ repeat accounts; introduced a follow-up cadence that raised repeat purchase rate 18%.\"",
        ],
      },
      {
        heading: "Make the new skills concrete and verifiable",
        bullets: [
          "Put certifications with issuer and year in a Certifications section — parsers map that field cleanly.",
          "Add a Projects section with two or three real artefacts, each with a scope and an outcome, and a link where one exists.",
          "List the target role's tools in Skills only if a bullet or project supports each one.",
        ],
      },
      {
        heading: "Address the gap plainly",
        paragraphs: [
          "A visible gap with a one-line explanation — study, caregiving, relocation, contract work — reads far better than a hidden one. Keep the date format consistent so tenure still computes.",
        ],
      },
    ],
    takeaways: [
      "Stay chronological; reframe the top third instead.",
      "Every transferable claim needs real evidence; metrics are optional when no reliable number exists.",
      "Certifications and real projects are how the new field gets verified.",
    ],
  },
];

export function getBlogPost(slug: string): BlogPost | undefined {
  return BLOG_POSTS.find((p) => p.slug === slug);
}
