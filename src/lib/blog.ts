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
    metaTitle: "Why an ATS Rejects Good Resumes | Resume Rocket Blog",
    description:
      "Applicant tracking systems reject strong candidates for mechanical reasons. Here are the failure modes we see most often and a quick self-test for your own resume.",
    category: "ATS basics",
    readingMinutes: 6,
    published: "5 September 2026",
    publishedIso: "2026-09-05",
    intro:
      "An applicant tracking system does not judge your career. It extracts text, maps it into fields, and scores that structured record against a requisition. Most rejections that feel unfair are really extraction failures — the system never saw the thing that would have qualified you.",
    sections: [
      {
        heading: "Failure one: the parser could not read the document",
        paragraphs: [
          "If a PDF was exported as an image, or produced by a design tool that draws text as vector outlines, the file contains no selectable characters. The ATS stores an empty record and you score zero on every requirement.",
        ],
        bullets: [
          "Self-test: open your PDF, select all, copy, and paste into a plain text editor. If nothing appears, or the order is scrambled, that is what the ATS sees.",
          "Fix: export from a text-based document, or rebuild the resume in a single-column layout.",
        ],
      },
      {
        heading: "Failure two: sections landed in the wrong field",
        paragraphs: [
          "Parsers match headings against a known vocabulary. \"Where I've made an impact\" is not in that vocabulary, so those bullets get filed as unclassified text and never count toward the experience requirement.",
        ],
        bullets: [
          "Use plain headings: Summary, Skills, Experience, Education, Certifications, Projects.",
          "Keep each heading alone on its line, visually distinct from body text.",
        ],
      },
      {
        heading: "Failure three: dates that cannot be computed",
        paragraphs: [
          "Recruiters filter on years of experience, and that number is computed from your date ranges. Mixed or partial formats often parse as missing, which silently drops you below the minimum tenure filter even when you exceed it.",
        ],
        bullets: [
          "Pick one format — \"Mar 2023 – Present\" — and repeat it in every entry.",
          "Always include the year; never place the date in a sidebar or margin.",
        ],
      },
      {
        heading: "Failure four: the words do not match the requisition",
        paragraphs: [
          "Screening scores are largely term overlap. If the posting says \"CI/CD\" and your resume only says \"automated deployment pipelines\", a strict matcher scores nothing for that requirement. Write their term and your natural phrasing together.",
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
      "Most ATS rejections are extraction failures, not judgements about you.",
      "Copy-paste your own PDF — that is the version the software reads.",
      "Standard headings, consistent dates and the posting's own wording fix the majority of cases.",
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
      "Tailoring does not mean rewriting. Roughly 80% of your resume stays fixed; the score moves on the top third and the skills list. Here is the workflow, with time budgets, that we use when scoring resumes against real postings.",
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
          "Your summary is the highest-leverage three lines on the page, because both the matcher and the human read it first. Structure it as: target role, years, domain, two headline achievements with numbers.",
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
          "Under your most recent role, promote the bullets that map onto the required list and rewrite them to use the posting's terms. Each bullet: verb, what you did, the term they used, and a measurable outcome.",
        ],
        bullets: [
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
          "Run the resume and the posting through the free ATS check. Above roughly 75% coverage of meaningful terms you are competitive, and further additions start reading as stuffing. Fix only the missing required terms you can honestly support, then send it.",
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
          "Verbs to drop: assisted with, was responsible for, participated in, helped.",
        ],
      },
      {
        heading: "Find a number even when the work feels unmeasurable",
        paragraphs: [
          "Almost every task has a volume, a frequency, a duration, a rupee value or a headcount attached to it. If you truly cannot measure the outcome, measure the input.",
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
          "It is detectable, and recruiters see it the moment they open the parsed text view. It reads as an attempt to game the process and is a standard reason for immediate rejection. There is no upside worth this risk.",
        ],
      },
      {
        heading: "Myth: an ATS cannot read PDFs",
        paragraphs: [
          "Every major system reads text-based PDFs. What it cannot read is an image-based export or text drawn as outlines by a design tool. The file type is not the problem; how it was produced is. When a portal explicitly asks for .docx, send .docx.",
        ],
      },
      {
        heading: "Myth: a resume must be one page",
        paragraphs: [
          "One page is right under about eight years of experience. Beyond that, compressing a real career into one page usually means deleting the evidence that qualifies you. Two pages is normal and no system penalises it.",
        ],
      },
      {
        heading: "Myth: the ATS auto-rejects you",
        paragraphs: [
          "In most configurations the system ranks and filters; a human sets the thresholds and reviews what surfaces. Knockout questions — work authorisation, licences — do auto-reject, but your bullet phrasing does not trigger an automatic no.",
        ],
      },
      {
        heading: "Myth: creative design helps you stand out",
        paragraphs: [
          "It helps only if a human sees it first, which in a portal application they do not. Columns, text boxes and header-bar contact details are the most common causes of mangled records. Save the designed version for direct email and portfolio sites.",
        ],
      },
      {
        heading: "Myth: keyword stuffing wins",
        paragraphs: [
          "Coverage above roughly 75% of the meaningful terms makes you competitive. Past that, additional unsupported terms add nothing to the score and cost you at the human screen, where every claim needs a bullet behind it.",
        ],
      },
      {
        heading: "Myth: one resume can serve every application",
        paragraphs: [
          "The single highest-return habit in a job search is rewriting the summary and the top three bullets for each posting. It takes twenty minutes and it is the part of the score you fully control.",
        ],
      },
    ],
    takeaways: [
      "Never hide text; it is detected and it is disqualifying.",
      "Text-based PDFs are fine — image exports are not.",
      "Ranking, not automatic rejection, is what most systems actually do.",
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
      "Screening software rewards continuity: matching titles, matching tools, unbroken dates. A career change breaks all three. The answer is not a functional resume — those parse badly and recruiters distrust them — but a chronological resume with a deliberately reframed top third.",
    sections: [
      {
        heading: "Do not use a functional resume",
        paragraphs: [
          "Grouping everything under skill headings with employers relegated to a footer is the format parsers handle worst: bullets detach from employers, tenure cannot be computed, and recruiters read it as concealment. Keep reverse-chronological structure and do the reframing inside it.",
        ],
      },
      {
        heading: "Rewrite the summary as a bridge",
        paragraphs: [
          "State the target role, the transferable core, and the proof that you have already done the work in some form. Three lines, ending with a number.",
        ],
        bullets: [
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
      "Every transferable claim needs a bullet with a number.",
      "Certifications and real projects are how the new field gets verified.",
    ],
  },
];

export function getBlogPost(slug: string): BlogPost | undefined {
  return BLOG_POSTS.find((p) => p.slug === slug);
}
