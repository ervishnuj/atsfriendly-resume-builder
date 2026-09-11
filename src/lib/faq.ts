export interface FaqItem {
  question: string;
  answer: string;
}

export interface FaqGroup {
  title: string;
  items: FaqItem[];
}

export const FAQ_GROUPS: FaqGroup[] = [
  {
    title: "ATS score and matching",
    items: [
      {
        question: "What does the ATS score actually measure?",
        answer:
          "The score is calculated with a fixed, rule-based engine — not by an AI guess. It looks at how your resume text lines up with the job description you paste in: required keywords found, skills coverage, responsibilities addressed, section structure and formatting signals that applicant tracking systems rely on. Every score comes with a breakdown showing which parts helped or hurt.",
      },
      {
        question: "Does a high ATS score guarantee an interview?",
        answer:
          "No. The score is a guidance tool that highlights keyword, skill and formatting gaps. Hiring decisions depend on the employer, the role and the wider candidate pool, and no tool can guarantee an interview or a job.",
      },
      {
        question: "Why does my score change when I paste a different job description?",
        answer:
          "The score is always relative to one specific job description. The same resume can match one role well and another poorly, which is the whole point of tailoring per application.",
      },
      {
        question: "What is the Skill Gap Analyzer?",
        answer:
          "Inside the Resume Builder, the AI analysis compares your saved profile against the job description and lists skills you already demonstrate and skills the role asks for that your profile does not evidence. It reports gaps rather than inventing skills for you.",
      },
    ],
  },
  {
    title: "Free ATS Checker",
    items: [
      {
        question: "Is the free ATS Checker really free?",
        answer:
          "Yes. The checker at /ats-checker needs no account and no payment. You paste a job description, add or upload your resume, and get a score with a breakdown.",
      },
      {
        question: "Where is my resume processed in the free checker?",
        answer:
          "The free checker runs its scoring in your browser. PDF and DOCX files you drop in are read in the browser too, and the resulting text is not uploaded to our servers by that page.",
      },
      {
        question: "Which file types can I upload?",
        answer: "PDF and DOCX files, or you can paste your resume text directly.",
      },
    ],
  },
  {
    title: "Building and generating resumes",
    items: [
      {
        question: "How does the Resume Builder work?",
        answer:
          "You fill in (or import) your profile, paste a target job description, run the AI analysis, generate a tailored resume, review and edit it, re-check the ATS score and then export it.",
      },
      {
        question: "Does the AI invent skills or experience?",
        answer:
          "No. Generation works from the profile you provide. Missing skills are reported as gaps. You are responsible for reviewing the generated content and making sure everything in your resume is truthful.",
      },
      {
        question: "How many resumes can I generate?",
        answer:
          "Free accounts include one free resume export. The Single Resume plan includes one AI-generated resume. The 7-Day and 30-Day passes allow multiple generations per day, with a per-day limit and a short cooldown between requests to keep usage fair.",
      },
      {
        question: "Can I edit a resume after it is generated?",
        answer:
          "Yes. You can edit your profile and template settings and regenerate or re-check at any time.",
      },
    ],
  },
  {
    title: "Templates and downloads",
    items: [
      {
        question: "Which templates are available?",
        answer:
          "Six built-in single-column templates: Professional ATS Classic, Modern ATS, Minimal ATS, Technical Developer, Executive and Clean Professional. You can also adjust typography, colours, spacing and section order in the template studio and save your own version.",
      },
      {
        question: "Can I download as PDF and DOCX?",
        answer:
          "Yes. Resumes can be exported as an A4 PDF or as a DOCX file. A PDF preview shows the exact page breaks and margins before you export.",
      },
    ],
  },
  {
    title: "Pricing, payments and privacy",
    items: [
      {
        question: "Is there a recurring subscription?",
        answer:
          "No. Every plan is a one-time payment and nothing renews automatically.",
      },
      {
        question: "How are payments made?",
        answer:
          "Payments are made by UPI. You pay to the displayed UPI ID or QR code and submit the transaction reference, which is then verified before your plan is activated.",
      },
      {
        question: "Is my resume data private?",
        answer:
          "Profile data saved to your account is encrypted before storage, and only you can read it. Full details are in the Privacy Policy.",
      },
      {
        question: "Can I get a refund?",
        answer:
          "Refunds are handled case by case — see the Refund Policy for what qualifies, such as duplicate payments and charges where access was never delivered.",
      },
    ],
  },
];
