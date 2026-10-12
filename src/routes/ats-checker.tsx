import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { LandingHeader } from "@/components/landing/LandingHeader";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { AtsBreakdownPanel } from "@/components/AtsBreakdown";
import { quickAtsCheck, type QuickAtsResult } from "@/lib/ats-quick";
import { normalizeTerm } from "@/lib/ats-scoring";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle2, ShieldCheck, Sparkles, XCircle, Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const TITLE = "Free ATS Resume Checker & Score Scanner | Resume Rocket";
const DESCRIPTION =
  "Paste your resume and a job description to get a free ATS score in seconds. See matched and missing keywords, formatting warnings and fixes — no sign-up, no upload.";
const PAGE_URL = "https://theresumerocket.com/ats-checker";

export const Route = createFileRoute("/ats-checker")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:url", content: PAGE_URL },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: PAGE_URL }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebApplication",
          name: "Free ATS Resume Checker",
          url: PAGE_URL,
          applicationCategory: "BusinessApplication",
          operatingSystem: "Any (web browser)",
          description: DESCRIPTION,
          offers: { "@type": "Offer", price: "0", priceCurrency: "INR" },
          provider: { "@type": "Organization", name: "Resume Rocket" },
        }),
      },
    ],
  }),
  component: AtsCheckerPage,
});

function AtsCheckerPage() {
  const [signedIn, setSignedIn] = useState(false);
  const [resumeText, setResumeText] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [result, setResult] = useState<QuickAtsResult | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSignedIn(Boolean(data.session)));
    const { data } = supabase.auth.onAuthStateChange((_e, session) => setSignedIn(Boolean(session)));
    return () => data.subscription.unsubscribe();
  }, []);

  const ready = resumeText.trim().length > 80 && jobDescription.trim().length > 80;
  const scoreColor = useMemo(() => {
    if (!result) return "";
    if (result.atsMatchScore >= 75) return "text-emerald-600";
    if (result.atsMatchScore >= 50) return "text-amber-600";
    return "text-rose-600";
  }, [result]);

  return (
    <div className="min-h-screen bg-background">
      <LandingHeader signedIn={signedIn} />

      <main className="mx-auto max-w-6xl px-5 py-14 lg:py-18">
        <div className="max-w-3xl">
          <Badge variant="secondary" className="mb-3 gap-1">
            <ShieldCheck className="h-3.5 w-3.5" /> Free · no sign-up · nothing leaves your browser
          </Badge>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Free ATS Resume Checker
          </h1>
          <p className="mt-3 text-muted-foreground">
            Paste your resume text and the job description you are targeting. You will get an instant
            ATS match score, the keywords the job asks for that your resume already covers, and the
            ones you are missing. The check runs entirely in your browser — nothing is uploaded or
            stored.
          </p>
          <p className="mt-3 text-sm">
            <Link to="/how-it-works" hash="ats-score" className="font-medium hover:underline">
              Not sure what to paste? View the ATS Checker Guide →
            </Link>
          </p>
        </div>

        <h2 className="mt-12 text-xl font-semibold tracking-tight">Scan your resume</h2>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <Card className="p-4">
            <label htmlFor="ats-resume" className="text-sm font-medium">Your resume text</label>
            <Textarea
              id="ats-resume"
              value={resumeText}
              onChange={(e) => setResumeText(e.target.value)}
              placeholder="Paste the full text of your resume here…"
              className="mt-2 min-h-[280px] font-mono text-xs"
            />
          </Card>
          <Card className="p-4">
            <label htmlFor="ats-jd" className="text-sm font-medium">Target job description</label>
            <Textarea
              id="ats-jd"
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              placeholder="Paste the job description you are applying for…"
              className="mt-2 min-h-[280px] font-mono text-xs"
            />
          </Card>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button
            size="lg"
            disabled={!ready}
            onClick={() => setResult(quickAtsCheck(resumeText, jobDescription))}
            className="gap-2"
          >
            <Sparkles className="h-4 w-4" /> Check ATS score
          </Button>
          {!ready && (
            <span className="text-xs text-muted-foreground">
              Paste at least a few lines in both boxes to run the check.
            </span>
          )}
        </div>

        {result && (
          <TooltipProvider>
            <section className="mt-10" aria-live="polite">
              <h2 className="text-xl font-semibold tracking-tight">Your ATS results</h2>
              <div className="mt-4 grid gap-4 lg:grid-cols-[240px_minmax(0,1fr)]">
                <div className="space-y-4">
                  <Card className="flex flex-col items-center justify-center p-6 text-center">
                    <div className={`text-5xl font-bold ${scoreColor}`}>{result.atsMatchScore}</div>
                    <div className="mt-1 text-sm font-medium">{result.band}</div>
                    <p className="mt-1 text-xs text-muted-foreground">Job match score /100</p>
                  </Card>
                  <Card className="flex flex-col items-center justify-center p-6 text-center">
                    <div className="text-3xl font-bold">{result.atsScore}</div>
                    <div className="mt-1 text-xs text-muted-foreground">ATS readiness score /100</div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {result.matchedKeywords.length} of {result.keywordsChecked} job keywords found ·{" "}
                      {result.wordCount} words
                    </p>
                  </Card>
                </div>

                <Card className="space-y-4 p-5">
                  <AtsBreakdownPanel breakdown={result.breakdown} matchBreakdown={result.matchBreakdown} />
                  <div>
                    <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Matched keywords ({result.matchedKeywords.length})
                    </h3>
                    <div className="flex flex-wrap gap-1">
                      {result.matchedKeywords.length ? (
                        result.matchedKeywords.map((k) => {
                          const snippet = result.evidence[normalizeTerm(k)];
                          return (
                            <Tooltip key={k}>
                              <TooltipTrigger asChild>
                                <Badge variant="secondary" className="cursor-help bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200">
                                  {k}
                                </Badge>
                              </TooltipTrigger>
                              <TooltipContent className="max-w-xs border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-100">
                                <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Found in resume:</p>
                                <p className="mt-1 text-xs italic leading-tight">{snippet || "Generic match"}</p>
                              </TooltipContent>
                            </Tooltip>
                          );
                        })
                      ) : (
                        <span className="text-xs text-muted-foreground">None yet.</span>
                      )}
                    </div>
                  </div>
                  <div>
                    <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
                      <XCircle className="h-4 w-4 text-rose-600" /> Missing keywords ({result.missingKeywords.length})
                    </h3>
                    <div className="flex flex-wrap gap-1">
                      {result.missingKeywords.length ? (
                        result.missingKeywords.map((k) => (
                          <Badge
                            key={k}
                            variant="secondary"
                            className={
                              result.missingRequiredKeywords.includes(k)
                                ? "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-200"
                                : "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200"
                            }
                          >
                            {k}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-xs text-muted-foreground">Nothing missing — great coverage.</span>
                      )}
                    </div>
                    {result.missingRequiredKeywords.length > 0 && (
                      <p className="mt-2 text-xs text-muted-foreground">Red = required by the posting, amber = preferred/technical.</p>
                    )}
                  </div>
                  {result.recommendations.length > 0 && (
                    <div>
                      <h3 className="mb-2 text-sm font-semibold">How to improve</h3>
                      <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                        {result.recommendations.map((n, i) => <li key={i}>{n}</li>)}
                      </ul>
                    </div>
                  )}
                </Card>
              </div>

              <Card className="mt-4 flex flex-col items-start gap-3 bg-muted/40 p-5 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-muted-foreground">
                  Want the missing keywords written into a finished, ATS-formatted resume? The AI builder rewrites your resume for this exact job description.
                </p>
                <Button asChild className="bg-gradient-brand text-brand-foreground">
                  <Link to={signedIn ? "/builder" : "/register"}>Build my tailored resume</Link>
                </Button>
              </Card>
            </section>
          </TooltipProvider>
        )}

        <section className="mt-16 max-w-3xl">
          <h2 className="text-xl font-semibold tracking-tight">How this ATS scanner works</h2>
          <p className="mt-3 text-sm text-muted-foreground">
            Applicant tracking systems rank your resume by how closely its text matches the requirements in the job posting. This checker pulls the most frequent meaningful terms and phrases out of the job description, then looks for each of them in your resume, allowing for common variants (React / React.js, Node.js / Node, K8s / Kubernetes). It also flags structural problems ATS parsers trip on: missing section headings, no dates, or a resume that is too thin.
          </p>
          <h3 className="mt-6 text-base font-semibold">What a good score looks like</h3>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            <li>75+ — strong alignment; you are likely to clear keyword screening.</li>
            <li>50–74 — partial match; add the missing required skills you genuinely have.</li>
            <li>Below 50 — the resume is not tailored to this posting yet.</li>
          </ol>
        </section>
      </main>

      <LandingFooter signedIn={signedIn} />
    </div>
  );
}
