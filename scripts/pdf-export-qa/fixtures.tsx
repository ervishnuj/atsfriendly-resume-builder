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

// Synthetic length cases exercise the actual renderer without AI or credits.
const lengthCases = [
  { id: "length-fresher", entries: 1, bullets: 2 },
  { id: "length-typical", entries: 3, bullets: 4 },
  { id: "length-experienced", entries: 7, bullets: 5 },
  { id: "length-long", entries: 9, bullets: 5 },
].map(({ id, entries, bullets }) => ({
  id,
  config: BUILTIN_TEMPLATES[0].config,
  data: {
    optimizedProfile: {
      ...generated.optimizedProfile,
      experience: Array.from({ length: entries }, (_, i) => ({
        company: i % 3 === 2 ? `Personal Project ${i + 1}` : `Example Company ${i + 1}`,
        title: "Senior Software Engineer",
        dateRange: "2021 - Present",
        bullets: Array.from({ length: bullets }, (_, j) =>
          `Built TypeScript service ${i + 1}.${j + 1} improving processing efficiency by 42% through query tuning and automated validation. Partnered with product teams to document reliable release procedures and monitor production quality.`,
        ),
      })),
    },
  },
}));
cases.push(...lengthCases);

for (const c of cases) {
  const body = renderToStaticMarkup(<ResumePreview data={c.data} config={c.config} />);
  const html = `<!doctype html><html><head><meta charset="utf-8"><style>body{margin:0}*{box-sizing:border-box}h1,h2,p,ul{margin:0} ${printCss}</style></head><body><header style="height:150px">dashboard chrome that must not appear in the PDF</header><main style="display:grid;padding:24px"><aside style="height:1600px">dashboard chrome</aside><div style="overflow:hidden"><div style="height:200px">dashboard chrome</div>${body}</div></main></body></html>`;
  writeFileSync(`${OUT}/html/${c.id}.html`, html);
}

writeFileSync(`${OUT}/cases.json`, JSON.stringify(cases.map((c) => c.id), null, 2));
console.log(`rendered ${cases.length} fixtures to ${OUT}/html`);
