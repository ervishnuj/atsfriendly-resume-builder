import { Check } from "lucide-react";

export function HeroResumeCard() {
  return (
    <div className="relative">
      <div aria-hidden className="absolute -inset-y-6 inset-x-0 rounded-[2rem] bg-gradient-brand opacity-15 blur-2xl lg:-inset-6" />
      <div className="relative animate-float rounded-2xl border border-border/70 bg-card p-6 shadow-soft">
        <div className="border-b border-border pb-4">
          <p className="text-lg font-semibold tracking-tight">Vigneshprabu</p>
          <p className="text-sm text-muted-foreground">Full Stack Engineer · Bengaluru</p>
        </div>

        <Block label="Professional Summary">
          <p className="text-xs leading-relaxed text-muted-foreground">
            Backend engineer with 3+ years building Java and Spring Boot services, delivering reliable APIs and
            measurable latency improvements.
          </p>
        </Block>

        <Block label="Technical Skills">
          <div className="flex flex-wrap gap-1.5">
            {["Java", "Spring Boot", "MySQL", "REST APIs", "Redis"].map((s) => (
              <span key={s} className="rounded-md bg-brand-soft px-2 py-0.5 text-[11px] font-medium text-brand">
                {s}
              </span>
            ))}
          </div>
        </Block>

        <Block label="Experience">
          <p className="text-xs font-semibold">Software Engineer · Google</p>
          <p className="text-[11px] text-muted-foreground">2023 — Present</p>
          <ul className="mt-1.5 space-y-1 text-[11px] text-muted-foreground">
            <li>• Reduced API response time by 38% by tuning query plans and caching.</li>
            <li>• Shipped payment reconciliation service processing 1.2M events monthly.</li>
          </ul>
        </Block>

        <Block label="Education">
          <p className="text-xs">B.E. Computer Science · Visvesvaraya Technological University · 2022</p>
        </Block>
      </div>

      <div className="mt-5 w-full sm:absolute sm:-bottom-8 sm:-left-10 sm:mt-0 sm:w-40 lg:-left-14 rounded-xl border border-border/70 bg-card/90 p-4 shadow-soft backdrop-blur-md">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">ATS Match</p>
        <p className="mt-0.5 text-3xl font-bold text-gradient-brand">92%</p>
        <ul className="mt-2 space-y-1">
          {["Keywords", "Skills", "Experience", "Formatting"].map((i) => (
            <li key={i} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <Check className="h-3 w-3 text-emerald-brand" /> {i}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function Block({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section className="mt-4">
      <h2 className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</h2>
      {children}
    </section>
  );
}
