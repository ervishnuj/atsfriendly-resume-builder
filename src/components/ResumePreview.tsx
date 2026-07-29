import type { OptimizedResume } from "@/lib/resume.functions";
import { Mail, Phone, Linkedin, Github, Globe } from "lucide-react";

export function ResumePreview({ data }: { data: OptimizedResume }) {
  const p = data.optimizedProfile.personal;
  return (
    <div
      id="resume-print-area"
      className="mx-auto w-full max-w-[820px] bg-white p-10 text-[13px] leading-relaxed text-neutral-900 shadow-sm print:shadow-none"
      style={{ fontFamily: "Inter, Arial, sans-serif" }}
    >
      <header className="border-b border-neutral-300 pb-4">
        <h1 className="text-3xl font-bold tracking-tight">
          {p.fullName || "Your Name"}
        </h1>
        {p.title && (
          <p className="mt-1 text-base font-medium text-neutral-700">
            {p.title}
          </p>
        )}
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-neutral-700">
          {p.email && (
            <span className="inline-flex items-center gap-1">
              <Mail className="h-3 w-3" /> {p.email}
            </span>
          )}
          {p.phone && (
            <span className="inline-flex items-center gap-1">
              <Phone className="h-3 w-3" /> {p.phone}
            </span>
          )}
          {p.linkedin && (
            <span className="inline-flex items-center gap-1">
              <Linkedin className="h-3 w-3" /> {p.linkedin}
            </span>
          )}
          {p.github && (
            <span className="inline-flex items-center gap-1">
              <Github className="h-3 w-3" /> {p.github}
            </span>
          )}
          {p.portfolio && (
            <span className="inline-flex items-center gap-1">
              <Globe className="h-3 w-3" /> {p.portfolio}
            </span>
          )}
        </div>
      </header>

      {p.summary && (
        <Section title="Professional Summary">
          <p>{p.summary}</p>
        </Section>
      )}

      {data.optimizedProfile.skills.length > 0 && (
        <Section title="Skills">
          <div className="space-y-1">
            {data.optimizedProfile.skills.map((s, i) => (
              <div key={i}>
                <span className="font-semibold">{s.category}: </span>
                <span>{s.items.join(", ")}</span>
              </div>
            ))}
          </div>
        </Section>
      )}

      {data.optimizedProfile.experience.length > 0 && (
        <Section title="Experience & Projects">
          <div className="space-y-4">
            {data.optimizedProfile.experience.map((e, i) => (
              <div key={i}>
                <div className="flex items-baseline justify-between gap-2">
                  <div>
                    <div className="font-semibold">{e.title}</div>
                    <div className="text-neutral-700">{e.company}</div>
                  </div>
                  <div className="whitespace-nowrap text-xs text-neutral-600">
                    {e.dateRange}
                  </div>
                </div>
                <ul className="mt-2 list-disc space-y-1 pl-5">
                  {e.bullets.map((b, j) => (
                    <li key={j}>{b}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </Section>
      )}

      {data.optimizedProfile.education.length > 0 && (
        <Section title="Education">
          <div className="space-y-2">
            {data.optimizedProfile.education.map((ed, i) => (
              <div key={i} className="flex items-baseline justify-between gap-2">
                <div>
                  <div className="font-semibold">
                    {ed.degree}
                    {ed.major ? `, ${ed.major}` : ""}
                  </div>
                  <div className="text-neutral-700">{ed.institution}</div>
                </div>
                <div className="whitespace-nowrap text-xs text-neutral-600">
                  {ed.year}
                  {ed.score ? ` · ${ed.score}` : ""}
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-5">
      <h2 className="mb-2 border-b border-neutral-300 pb-1 text-sm font-bold uppercase tracking-wider text-neutral-800">
        {title}
      </h2>
      <div>{children}</div>
    </section>
  );
}