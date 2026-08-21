/**
 * Renders every built-in resume template (plus an "imported resume" fixture)
 * to standalone HTML using the app's real renderer + print CSS.
 *
 * Run via `bun run validate:pdf-exports` — see validate.py.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { mkdirSync, writeFileSync } from "node:fs";
import { ResumePreview } from "@/components/ResumePreview";
import { BUILTIN_TEMPLATES } from "@/lib/resume-templates";

const OUT = process.env["PDFQA_DIR"] ?? "/tmp/pdf-export-qa";

/** A generated resume (AI-optimized profile). */
const generated: any = {
  optimizedProfile: {
    personal: {
      fullName: "Vishnu Jayaraman",
      title: "Senior Full-Stack Engineer",
      email: "vishnu@example.com",
      phone: "+91 98765 43210",
      linkedin: "linkedin.com/in/vishnuj",
      github: "github.com/vishnuj",
      portfolio: "theresumerocket.com",
      summary:
        "Full-stack engineer with 8 years building React and Node.js platforms, scaling ATS-grade document pipelines and payment systems.",
    },
    skills: [
      { category: "Languages", items: ["TypeScript", "Java", "Python", "SQL"] },
      { category: "Frameworks", items: ["React", "Node.js", "Spring Boot", "TanStack Start"] },
    ],
    experience: [
      {
        company: "Acme Corp",
        title: "Senior Software Engineer",
        dateRange: "2021 - Present",
        bullets: [
          "Led migration of billing service to event-driven architecture, cutting latency 42%.",
          "Built ATS scoring engine processing 120k resumes per month with deterministic results.",
        ],
      },
      {
        company: "Globex",
        title: "Software Engineer",
        dateRange: "2018 - 2021",
        bullets: ["Shipped React design system adopted by 14 product teams."],
      },
    ],
    education: [
      {
        institution: "Anna University",
        degree: "B.Tech",
        major: "Computer Science",
        year: "2018",
        score: "8.7 CGPA",
      },
    ],
  },
};

/** An imported resume (PDF/DOCX upload path): accents, symbols, long bullets. */
const imported: any = {
  optimizedProfile: {
    personal: {
      fullName: "Ananya Krishnan-Müller",
      title: "Data Platform Lead",
      email: "ananya@example.com",
      phone: "+91 90000 11111",
      linkedin: "linkedin.com/in/ananyakm",
      github: "",
      portfolio: "",
      summary:
        "Imported résumé fixture — validates that uploaded documents keep accents (é, ü), symbols (₹, &, %) and long wrapped lines selectable after export.",
    },
    skills: [{ category: "Data", items: ["Airflow", "dbt", "Snowflake", "C++", "R&D tooling"] }],
    experience: [
      {
        company: "Northwind Analytics",
        title: "Lead Engineer",
        dateRange: "2019 – Present",
        bullets: [
          "Owned ₹4.2Cr data platform budget while cutting warehouse spend 31% year over year through workload isolation and query tuning.",
          "Migrated 380+ legacy jobs to dbt with zero downtime.",
        ],
      },
    ],
    education: [
      { institution: "IIT Madras", degree: "M.Tech", major: "Data Science", year: "2016", score: "9.1 CGPA" },
    ],
  },
};

mkdirSync(`${OUT}/html`, { recursive: true });
const css = await Bun.file("src/styles.css").text();
const start = css.indexOf("@media print");
const printCss = start >= 0 ? css.slice(start) : "";

const cases = BUILTIN_TEMPLATES.flatMap((t) => [
  { id: t.id, config: t.config, data: generated },
  { id: `${t.id}--imported`, config: t.config, data: imported },
]);

for (const c of cases) {
  const body = renderToStaticMarkup(<ResumePreview data={c.data} config={c.config} />);
  const html = `<!doctype html><html><head><meta charset="utf-8"><style>body{margin:0}${printCss}</style></head><body><div class="no-print">dashboard chrome that must not appear in the PDF</div>${body}</body></html>`;
  writeFileSync(`${OUT}/html/${c.id}.html`, html);
}

writeFileSync(`${OUT}/cases.json`, JSON.stringify(cases.map((c) => c.id), null, 2));
console.log(`rendered ${cases.length} fixtures to ${OUT}/html`);
