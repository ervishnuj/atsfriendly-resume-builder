import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { FileText, Sparkles, ShieldCheck, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ATS Resume Builder — AI-Optimized Resumes for 90+ ATS Score" },
      {
        name: "description",
        content:
          "Paste a job description and generate a tailored, ATS-friendly resume with an AI match score, keyword analysis, and one-click PDF download.",
      },
      { property: "og:title", content: "ATS Resume Builder" },
      {
        property: "og:description",
        content: "Generate ATS-optimized resumes tailored to any job description in seconds.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

function Landing() {
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/builder", replace: true });
    });
  }, [navigate]);

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b border-border bg-background">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <FileText className="h-5 w-5" />
            </div>
            <span className="text-lg font-semibold tracking-tight">ATS Resume Builder</span>
          </div>
          <Button asChild>
            <Link to="/auth">Sign in</Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-16">
        <h1 className="max-w-2xl text-4xl font-semibold tracking-tight">
          AI-tailored resumes that clear the ATS
        </h1>
        <p className="mt-4 max-w-xl text-muted-foreground">
          Save your profile once, paste any job description, and get a rewritten,
          keyword-matched resume with an ATS score you can download as a clean PDF.
        </p>
        <Button asChild size="lg" className="mt-8">
          <Link to="/auth">Get started with Google</Link>
        </Button>

        <div className="mt-14 grid gap-4 sm:grid-cols-3">
          {[
            { icon: Sparkles, title: "90+ ATS targeting", body: "Bullets rewritten with the X-Y-Z method against the job description." },
            { icon: ShieldCheck, title: "Synced profile", body: "Your details are encrypted and saved to your account." },
            { icon: Download, title: "One-click PDF", body: "Clean, single-column A4 layout built for parsers." },
          ].map(({ icon: Icon, title, body }) => (
            <Card key={title} className="p-5">
              <Icon className="h-5 w-5 text-primary" />
              <h2 className="mt-3 text-sm font-semibold">{title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{body}</p>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}
