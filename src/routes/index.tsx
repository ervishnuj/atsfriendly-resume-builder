import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FileText, Sparkles, ShieldCheck, Gauge, Lock } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ATS Resume Builder — AI-Optimized Resumes for 90+ ATS Score" },
      {
        name: "description",
        content:
          "Save your profile once with AES-256 encryption, paste any job description, and generate a tailored ATS-friendly resume with match score and PDF export.",
      },
      { property: "og:title", content: "ATS Resume Builder — AI-Optimized Resumes" },
      {
        property: "og:description",
        content:
          "Encrypted profile storage, AI keyword analysis, ATS match score and one-click PDF resumes.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b border-border bg-background">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <FileText className="h-5 w-5" />
            </div>
            <span className="font-semibold tracking-tight">ATS Resume Builder</span>
          </div>
          <Button asChild size="sm">
            <Link to="/auth">Sign in</Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-16">
        <section className="mx-auto max-w-3xl text-center">
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
            Tailored, ATS-optimized resumes in one click
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Store your profile once — encrypted with AES-256 — then paste any job description and
            get a rewritten resume, keyword analysis and an ATS match score.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button asChild size="lg" className="gap-2">
              <Link to="/auth">
                <Sparkles className="h-4 w-4" /> Get started free
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/auth">I already have an account</Link>
            </Button>
          </div>
        </section>

        <section className="mt-16 grid gap-4 sm:grid-cols-3">
          <Feature
            icon={<Lock className="h-5 w-5 text-primary" />}
            title="Encrypted storage"
            body="Personal info, skills, experience and education are encrypted field-by-field before they ever hit the database."
          />
          <Feature
            icon={<Gauge className="h-5 w-5 text-primary" />}
            title="90+ ATS targeting"
            body="Bullets are rewritten with the X-Y-Z method and job-description keywords, never fabricated."
          />
          <Feature
            icon={<ShieldCheck className="h-5 w-5 text-primary" />}
            title="Plans & fair usage"
            body="Free daily generations for everyone, with unlimited access on an active subscription."
          />
        </section>
      </main>
    </div>
  );
}

function Feature({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <Card className="p-5">
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
        {icon}
      </div>
      <h2 className="text-base font-semibold">{title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{body}</p>
    </Card>
  );
}
