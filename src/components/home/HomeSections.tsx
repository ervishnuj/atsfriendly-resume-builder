import { Link } from "@tanstack/react-router";
import {
  ArrowRight, BriefcaseBusiness, CheckCircle2, ClipboardList, Code2, FileDown, FileSearch, FileText,
  GraduationCap, KanbanSquare, Lightbulb, Repeat, ScanSearch, ShieldCheck, Sparkles, Target, Upload, Wand2, XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const primaryBtn = "bg-primary text-primary-foreground shadow-soft hover:bg-primary/90";

export function HomeHero({ buildTo }: { buildTo: string }) {
  return (
    <section className="border-b border-border bg-background">
      <div className="mx-auto grid max-w-6xl items-center gap-9 px-5 py-12 lg:grid-cols-[1.1fr_0.9fr] lg:py-16">
        <div className="min-w-0">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card/70 px-3 py-1 text-xs font-medium text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-brand" /> Free ATS checker + job-specific resumes
          </span>
          <h1 className="mt-5 text-4xl font-bold leading-[1.1] tracking-tight sm:text-5xl">
            Build a Resume That Matches Your <span className="text-primary">Dream Job.</span>
          </h1>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground">
            Check your resume against job descriptions, discover relevant missing keywords and create a job-specific resume with TheResumeRocket.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg" className={primaryBtn}>
              <Link to="/ats-checker">Check My Resume Free <ArrowRight className="ml-1 h-4 w-4" /></Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to={buildTo}>Create My Resume</Link>
            </Button>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">Start with our free ATS checker. No signup required.</p>
        </div>
        <SamplePreview />
      </div>
    </section>
  );
}

function SamplePreview() {
  return (
    <Card className="min-w-0 p-5 shadow-glow sm:p-6" aria-label="TheResumeRocket · Sample report with fictional data">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold">TheResumeRocket · Sample report</p>
        <span className="rounded-full bg-brand-soft px-2.5 py-0.5 text-[11px] font-medium text-brand">Demonstration data</span>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <Score label="ATS readiness estimate" value={78} />
        <Score label="Job match estimate" value={64} />
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <KeywordList title="Matched keywords" items={["Java", "Spring Boot", "REST APIs", "MySQL"]} ok />
        <KeywordList title="Relevant missing" items={["Docker", "Microservices", "JUnit"]} />
      </div>
      <div className="mt-4 rounded-lg border border-border bg-muted/40 p-3 text-xs">
        <p className="font-semibold">Suggestion</p>
        <p className="mt-1 text-muted-foreground">Mention JUnit only if you have actually written tests with it — e.g. in a project.</p>
      </div>
      <div className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
        <div className="rounded-lg border border-border p-3">
          <p className="font-semibold text-muted-foreground">Before</p>
          <p className="mt-1">Worked on backend code.</p>
        </div>
        <div className="rounded-lg border border-border bg-brand-soft/60 p-3">
          <p className="font-semibold text-brand">After</p>
          <p className="mt-1">Built REST APIs in Java and Spring Boot for an order-tracking module.</p>
        </div>
      </div>
      <p className="mt-3 text-[11px] text-muted-foreground">Illustration only. Real scores depend on your resume and job description.</p>
    </Card>
  );
}

function Score({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border p-3">
      <p className="text-[11px] font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-bold text-brand">{value}<span className="text-sm">/100</span></p>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-gradient-brand" style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

function KeywordList({ title, items, ok }: { title: string; items: string[]; ok?: boolean }) {
  const Icon = ok ? CheckCircle2 : XCircle;
  return (
    <div className="rounded-lg border border-border p-3">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{title}</p>
      <ul className="mt-2 flex flex-wrap gap-1.5">
        {items.map((k) => (
          <li key={k} className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-xs">
            <Icon className={`h-3 w-3 ${ok ? "text-emerald-brand" : "text-muted-foreground"}`} /> {k}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Heading({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <>
      <h2 className="text-3xl font-bold tracking-tight">{title}</h2>
      {subtitle && <p className="mt-3 max-w-2xl text-muted-foreground">{subtitle}</p>}
    </>
  );
}

export function HomeWorkflow() {
  const steps = [
    { icon: Upload, t: "Upload Your Resume", d: "Upload a PDF or DOCX file, or paste your resume text." },
    { icon: ClipboardList, t: "Add Your Target Job Description", d: "Paste the job you want so your resume is compared with that specific role." },
    { icon: Wand2, t: "Improve and Generate", d: "See relevant keyword gaps and suggestions, then create a job-specific resume." },
  ];
  return (
    <section id="how-it-works" className="border-y border-border bg-muted/30">
      <div className="mx-auto max-w-6xl px-5 py-16 lg:py-20">
        <Heading title="How It Works in 3 Steps" />
        <ol className="mt-10 grid gap-5 md:grid-cols-3">
          {steps.map((s, i) => (
            <li key={s.t}>
              <Card className="h-full p-6 shadow-soft">
                <div className="flex items-center gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-lg bg-brand-soft text-brand"><s.icon className="h-5 w-5" /></span>
                  <span className="text-sm font-bold text-brand">Step {i + 1}</span>
                </div>
                <h3 className="mt-4 text-lg font-semibold">{s.t}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{s.d}</p>
              </Card>
            </li>
          ))}
        </ol>
        <Button asChild size="lg" className={`mt-9 ${primaryBtn}`}>
          <Link to="/ats-checker">Check My Resume Free</Link>
        </Button>
      </div>
    </section>
  );
}

export function HomeFeatures() {
  const features = [
    { icon: ScanSearch, t: "Free ATS Resume Checker", d: "No signup. Upload PDF/DOCX or paste text." },
    { icon: Target, t: "Job Description Matching", d: "Compare your resume with a specific job." },
    { icon: FileSearch, t: "Relevant Keyword Analysis", d: "Focuses on skills the job actually asks for." },
    { icon: XCircle, t: "Missing Keyword Identification", d: "Shows which requirements your resume doesn't mention." },
    { icon: Sparkles, t: "AI Resume Optimization", d: "Rewrites your content using only your real profile." },
    { icon: Lightbulb, t: "Skill Gap Analysis", d: "Find genuine gaps and save a learning plan." },
    { icon: FileText, t: "Job-Specific Resume Generation", d: "One tailored resume for each job you apply to." },
    { icon: FileDown, t: "PDF and DOCX Export", d: "Download ATS-friendly PDF or editable Word files." },
    { icon: KanbanSquare, t: "Job Application Tracker", d: "Track where you applied and which resume you used." },
  ];
  return (
    <section id="features" className="mx-auto max-w-6xl px-5 py-16 lg:py-20">
      <Heading title="Everything You Need for Job-Specific Applications"  />
      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((f) => (
          <Card key={f.t} className="p-5 shadow-soft">
            <span className="grid h-10 w-10 place-items-center rounded-lg bg-brand-soft text-brand"><f.icon className="h-5 w-5" /></span>
            <h3 className="mt-4 font-semibold">{f.t}</h3>
            <p className="mt-1.5 text-sm text-muted-foreground">{f.d}</p>
          </Card>
        ))}
      </div>
    </section>
  );
}

export function HomeAudiences() {
  const groups = [
    { icon: GraduationCap, t: "Freshers", items: ["Create a professional first resume.", "Understand relevant skills and keywords in job descriptions.", "Identify areas that need improvement."] },
    { icon: BriefcaseBusiness, t: "Experienced Professionals", items: ["Tailor resumes for different job roles.", "Highlight relevant experience and skills.", "Improve job-specific keyword relevance."] },
    { icon: Code2, t: "Software Developers", items: ["Spot technical keywords like Java, Spring Boot, SQL, REST APIs or React — only those in the job description.", "Highlight genuine project experience.", "Never add technologies you haven't used."] },
    { icon: Repeat, t: "Career Switchers", items: ["Identify transferable skills.", "Understand job requirements.", "Find genuine skill gaps and learning opportunities."] },
  ];
  return (
    <section className="border-y border-border bg-muted/30">
      <div className="mx-auto max-w-6xl px-5 py-16 lg:py-20">
        <Heading title="Built for Every Stage of Your Career" subtitle="We never recommend inventing experience, certifications or skills." />
        <div className="mt-10 grid gap-5 sm:grid-cols-2">
          {groups.map((g) => (
            <Card key={g.t} className="p-6 shadow-soft">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-lg bg-brand-soft text-brand"><g.icon className="h-5 w-5" /></span>
                <h3 className="text-lg font-semibold">{g.t}</h3>
              </div>
              <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                {g.items.map((i) => (
                  <li key={i} className="flex gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-brand" /> {i}</li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

export function HomeCheckerPromo() {
  return (
    <section id="ats-checker" className="mx-auto max-w-6xl px-5 py-16 lg:py-20">
      <div className="border-y border-border bg-accent/50 px-5 py-10 sm:px-8">
        <h2 className="text-3xl font-bold tracking-tight">Not Sure Whether Your Resume Is ATS-Friendly?</h2>
        <p className="mt-4 max-w-2xl text-muted-foreground">
          Upload your resume or paste your resume text, add a target job description and see areas where your resume can improve.
        </p>
        <ul className="mt-6 grid gap-3 text-sm sm:grid-cols-3">
          {[
            "No signup required for the public checker.",
            "Accepts PDF, DOCX or pasted text. Files are read in your browser.",
            "Scores are estimates, not a guarantee of selection or interview calls.",
          ].map((t) => (
            <li key={t} className="flex gap-2"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-brand" /> {t}</li>
          ))}
        </ul>
        <p className="mt-5 text-xs text-muted-foreground">
          AI resume generation and account-based analyses need a free account and have their own usage allowances.
        </p>
        <Button asChild size="lg" className={`mt-7 ${primaryBtn}`}>
          <Link to="/ats-checker">Try the Free ATS Checker</Link>
        </Button>
      </div>
    </section>
  );
}

export function HomeTrust() {
  const points = [
    ["Why tailoring matters", "Each job asks for different skills. A resume matched to the job description shows recruiters the relevant evidence first."],
    ["Keyword stuffing doesn't help", "Repeating keywords without context reads poorly to people and adds no real evidence of your skills."],
    ["Your experience must be genuine", "We only use the skills and experience you provide. Gaps are shown to you — never filled with made-up claims."],
    ["ATS scores are estimates", "Every employer's system is different. Our scores are guidance, not a prediction of selection."],
    ["How your data is handled", "The public checker reads files in your browser. Saved profiles are private to your account, and you can download or delete your data anytime."],
  ];
  return (
    <section className="border-y border-border bg-muted/30">
      <div className="mx-auto max-w-6xl px-5 py-16 lg:py-20">
        <Heading title="Honest by Design" />
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {points.map(([t, d]) => (
            <Card key={t} className="p-5 shadow-soft">
              <h3 className="font-semibold">{t}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{d}</p>
            </Card>
          ))}
        </div>
        <nav className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm font-medium" aria-label="Policies">
          <Link to="/privacy" className="text-brand hover:underline">Privacy Policy</Link>
          <Link to="/terms" className="text-brand hover:underline">Terms and Conditions</Link>
          <Link to="/contact" className="text-brand hover:underline">Contact / Support</Link>
          <Link to="/about" className="text-brand hover:underline">About TheResumeRocket</Link>
        </nav>
      </div>
    </section>
  );
}
