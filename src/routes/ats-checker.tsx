import { createFileRoute, Link } from "@tanstack/react-router";
import { track } from "@/lib/analytics-events";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { LandingHeader } from "@/components/landing/LandingHeader";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { AtsBreakdownPanel } from "@/components/AtsBreakdown";
import { quickAtsCheck, type QuickAtsResult } from "@/lib/ats-quick";
import { normalizeTerm } from "@/lib/ats-scoring";
import { AtsResumeUpload } from "@/components/AtsResumeUpload";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { atsKeywordGuidance } from "@/lib/ats-keyword-guidance";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle2, ShieldCheck, Sparkles, XCircle, Loader2, Upload, ClipboardPaste } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const TITLE = "Free ATS Resume Checker & Score Scanner | Resume Rocket";
const DESCRIPTION =
  "Upload a PDF or DOCX resume, or paste text, for a free job-description match score and evidence-aware keyword guidance. Processed locally without sign-up.";
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

  const [mode, setMode] = useState("upload");
  const [uploadedText, setUploadedText] = useState("");
  const [extracting, setExtracting] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState("");
  const [guidance, setGuidance] = useState<ReturnType<typeof atsKeywordGuidance>>([]);
  const analysisRequest = useRef(0);
  const activeText = mode === "upload" ? uploadedText : resumeText;
  const invalidate = () => {
    analysisRequest.current += 1;
    setResult(null); setGuidance([]); setAnalyzing(false); setAnalysisError("");
  };
  const analyze = async () => {
    if (analyzing || extracting || !ready) return;
    const request = ++analysisRequest.current;
    track("CHECKER_STARTED");
    setAnalyzing(true);
    await new Promise(resolve => window.setTimeout(resolve, 40));
    if (request !== analysisRequest.current) return;
    try {
      const next = quickAtsCheck(activeText, jobDescription);
      setGuidance(atsKeywordGuidance(activeText, next)); setResult(next); track("ATS_CHECK_COMPLETED");
    } catch { setAnalysisError("Could not analyze this text. Check both inputs and try again."); }
    finally { if (request === analysisRequest.current) setAnalyzing(false); }
  };
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSignedIn(Boolean(data.session)));
    const { data } = supabase.auth.onAuthStateChange((_e, session) => setSignedIn(Boolean(session)));
    return () => data.subscription.unsubscribe();
  }, []);

  const ready = activeText.trim().length > 80 && jobDescription.trim().length > 80;
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
            Upload a PDF or DOCX resume, or paste its text, then add a target job description. Files and analysis stay in your browser; nothing is uploaded or stored.
          </p>
          <p className="mt-3 text-sm">
            <Link to="/how-it-works" hash="ats-score" className="font-medium hover:underline">
              Not sure what to paste? View the ATS Checker Guide →
            </Link>
          </p>
        </div>

        <h2 className="mt-12 text-xl font-semibold tracking-tight">Check Your Resume Against a Job Description</h2>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div className="min-w-0 border-t border-border py-4">
            <Tabs value={mode} onValueChange={value => { invalidate(); setMode(value); }}>
              <TabsList className="mb-4 grid h-auto w-full grid-cols-2">
                <TabsTrigger value="upload" className="min-h-11 gap-1 whitespace-normal"><Upload className="h-4 w-4 shrink-0" />Upload Resume</TabsTrigger>
                <TabsTrigger value="paste" className="min-h-11 gap-1 whitespace-normal"><ClipboardPaste className="h-4 w-4 shrink-0" />Paste Resume Text</TabsTrigger>
              </TabsList>
            </Tabs>
            <div hidden={mode !== "upload"}>
              <AtsResumeUpload onText={text => { invalidate(); setUploadedText(text); }} onBusy={setExtracting} />
              {uploadedText && <details className="mt-3"><summary className="cursor-pointer text-sm font-medium">Review extracted text</summary><Textarea aria-label="Extracted resume text" value={uploadedText} onChange={e => { invalidate(); setUploadedText(e.target.value); }} className="mt-2 min-h-48 text-sm" /></details>}
            </div>
            <div hidden={mode !== "paste"}>
              <label htmlFor="ats-resume" className="text-sm font-medium">Your resume text</label>
              <Textarea id="ats-resume" value={resumeText} onChange={e => { invalidate(); setResumeText(e.target.value); }} placeholder="Paste the full text of your resume here…" className="mt-2 min-h-[280px] text-sm" />
            </div>
          </div>
          <Card className="p-4">
            <label htmlFor="ats-jd" className="text-sm font-medium">Target job description</label>
            <Textarea
              id="ats-jd"
              value={jobDescription}
              onChange={(e) => { invalidate(); setJobDescription(e.target.value); }}
              placeholder="Paste the job description you are applying for…"
              className="mt-2 min-h-[280px] font-mono text-xs"
            />
          </Card>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button
            size="lg"
            disabled={!ready || extracting || analyzing}
            onClick={() => { void analyze(); }}
            className="gap-2"
          >
            {analyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} {analyzing ? "Analyzing…" : "Analyze Resume"}
          </Button>
          {!ready && (
            <span className="text-xs text-muted-foreground">
              Add a few lines of resume text and a job description to run the check.
            </span>
          )}
        </div>

        {analysisError && <p role="alert" className="mt-3 text-sm text-destructive">{analysisError}</p>}
        {result && (
          <TooltipProvider>
            <section className="mt-10" aria-live="polite">
              <h2 className="text-xl font-semibold tracking-tight">Your ATS results</h2>
              <p role="status" className="mt-2 text-sm text-primary">Analysis complete.</p>
              <p className="mt-1 text-xs text-muted-foreground">Resume Rocket estimates, not an employer ATS guarantee. Keyword presence alone does not verify a qualification.</p>
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
                  <div>
                    <h3 className="text-sm font-semibold">Suggested keywords & potential skill gaps</h3>
                    <div className="mt-2 divide-y divide-border">
                      {guidance.filter(item => item.status === "potentialGap" || item.status === "currentlyLearning" || item.status === "currentlyTraining" || result.missingKeywords.includes(item.term)).map(item => (
                        <div key={item.term} className="py-3 text-sm">
                          <p className="font-semibold">{item.term}</p>
                          <p className="mt-1 text-xs font-medium text-muted-foreground">{item.importance} · {item.category} · {item.label}</p>
                          {item.context && <p className="mt-1 break-words text-xs text-muted-foreground">Job description: “{item.context}”</p>}
                          {(item.status !== "potentialGap" || result.evidence[normalizeTerm(item.term)]) && <p className="mt-1 break-words text-xs text-muted-foreground">Supplied evidence: {item.evidence}</p>}
                          <p className="mt-1 text-muted-foreground">{item.action}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                  {result.recommendations.length > 0 && (
                    <div>
                      <h3 className="mb-2 text-sm font-semibold">How to improve</h3>
                      <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                        {result.recommendations.map((n, i) => <li key={i}>{n}</li>)}
                      </ul>
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">Job match weights: required/core skills 40 points, technical coverage 25, responsibilities 15, experience 10, education 5, title 5. Within technical coverage, explicit mandatory requirements carry weight 1, other relevant skills 0.75, and preferred skills 0.35. Generic phrases are excluded. Evidence of a keyword is not proof of proficiency.</p>
                </Card>
              </div>

              <Card className="mt-4 flex flex-col items-start gap-3 bg-muted/40 p-5 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-muted-foreground">
                  Tailor a finished resume using your real skills and supplied evidence, without adding unsupported qualifications.
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
            Employers use applicant tracking systems in different ways; there is no universal ATS score or pass threshold. This checker estimates job-description alignment and resume readiness using consistent rules. It extracts meaningful terms and phrases from the posting, looks for them in your resume with common variants (React / React.js, Node.js / Node, K8s / Kubernetes), and checks text structure, section headings, dates, and content length. It does not reproduce an employer’s screening decision or verify your qualifications.
          </p>
          <h3 className="mt-6 text-base font-semibold">How to interpret your job match score</h3>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            <li>75+ — strong keyword alignment in this checker, not a guarantee of passing employer screening.</li>
            <li>50–74 — partial match; add the missing required skills you genuinely have.</li>
            <li>Below 50 — limited alignment detected; review your supplied evidence and the role requirements before making changes.</li>
          </ul>
          <p className="mt-3 text-sm text-muted-foreground">The separate ATS readiness score reviews the extracted text, not every visual detail of your PDF or DOCX. Neither score guarantees an interview. Keep learning and training clearly labeled, and add missing keywords only when your real background supports them.</p>
        </section>
      </main>

      <LandingFooter signedIn={signedIn} />
    </div>
  );
}
