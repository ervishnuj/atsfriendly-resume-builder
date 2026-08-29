import { useMemo, useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, FileScan, Lock, ShieldCheck, XCircle, Zap } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";
import { Button } from "@/components/ui/button";
import { containsTerm, normalizeTerm, scoreBand } from "@/lib/ats-scoring";

const BASE_URL = "https://theresumerocket.com";

export const Route = createFileRoute("/ats-checker")({
  head: () => ({
    meta: [
      { title: "Free ATS Resume Checker — Scan Your Resume Score | Resume Rocket" },
      {
        name: "description",
        content:
          "Free ATS resume scanner: paste your resume and a job description to instantly see your ATS match score, missing keywords, and how to fix them. No signup required.",
      },
      { property: "og:title", content: "Free ATS Resume Checker — Resume Rocket" },
      {
        property: "og:description",
        content:
          "Instantly scan your resume against any job description. Get your ATS match score and the exact keywords recruiters' software looks for.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: `${BASE_URL}/ats-checker` },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: `${BASE_URL}/ats-checker` }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebApplication",
          name: "Resume Rocket Free ATS Resume Checker",
          url: `${BASE_URL}/ats-checker`,
          applicationCategory: "BusinessApplication",
          operatingSystem: "Web",
          offers: { "@type": "Offer", price: "0", priceCurrency: "INR" },
          description:
            "Free ATS resume scanner that scores your resume against a job description and lists missing keywords.",
        }),
      },
    ],
  }),
  component: AtsCheckerPage,
});

/* ---------------- Client-side keyword extraction ---------------- */

const WORD_STOPLIST = new Set([
  "the", "and", "for", "with", "you", "your", "our", "are", "will", "this", "that",
  "have", "has", "from", "into", "who", "what", "how", "when", "where", "why",
  "job", "role", "work", "team", "experience", "years", "year", "plus", "strong",
  "good", "excellent", "ability", "skills", "knowledge", "candidate", "must",
  "should", "etc", "using", "use", "used", "including", "include", "within",
  "across", "about", "their", "they", "them", "we", "our", "us", "all", "any",
  "new", "day", "per", "via", "not", "but", "can", "may", "more", "other",
  "such", "than", "then", "these", "those", "through", "well", "also", "over",
  "under", "between", "both", "each", "every", "own", "same", "very", "just",
  "like", "make", "made", "help", "take", "get", "ensure", "drive", "build",
  "join", "looking", "ideal", "related", "field", "degree", "preferred",
  "required", "requirements", "responsibilities", "qualifications", "description",
  "company", "position", "opportunity", "apply", "benefits", "salary",
]);

/** Extract the most meaningful unigram + bigram keywords from a job description. */
function extractJdKeywords(jd: string, max = 30): string[] {
  const normalized = ` ${jd.toLowerCase().replace(/[^a-z0-9+#./ -]/g, " ").replace(/\s+/g, " ")} `;
  const tokens = normalized.trim().split(" ").filter(Boolean);

  const freq = new Map<string, number>();
  const count = (term: string, weight: number) => {
    const t = normalizeTerm(term);
    if (!t || t.length < 3) return;
    freq.set(t, (freq.get(t) ?? 0) + weight);
  };

  for (let i = 0; i < tokens.length; i++) {
    const w = tokens[i];
    if (!WORD_STOPLIST.has(w) && !/^\d+$/.test(w)) count(w, 1);
    const next = tokens[i + 1];
    if (next && !WORD_STOPLIST.has(w) && !WORD_STOPLIST.has(next)) {
      count(`${w} ${next}`, 2.2); // bigrams like "machine learning" rank higher
    }
  }

  // Drop unigrams already covered by a retained bigram, rank by frequency.
  const sorted = [...freq.entries()].sort((a, b) => b[1] - a[1]);
  const out: string[] = [];
  const bigramWords = new Set<string>();
  for (const [term] of sorted) {
    if (out.length >= max) break;
    if (term.includes(" ")) {
      out.push(term);
      term.split(" ").forEach((w) => bigramWords.add(w));
    } else if (!bigramWords.has(term)) {
      out.push(term);
    }
  }
  return out;
}

/* ---------------- Page ---------------- */

function AtsCheckerPage() {
  const [resumeText, setResumeText] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [scanned, setScanned] = useState(false);

  const result = useMemo(() => {
    if (!scanned) return null;
    const keywords = extractJdKeywords(jobDescription);
    const resumeNorm = ` ${resumeText.toLowerCase().replace(/[^a-z0-9+#./ -]/g, " ").replace(/\s+/g, " ")} `;
    const matched = keywords.filter((k) => containsTerm(resumeNorm, k));
    const missing = keywords.filter((k) => !containsTerm(resumeNorm, k));
    const score =
      keywords.length === 0 ? 0 : Math.round((matched.length / keywords.length) * 100);
    return { keywords, matched, missing, score, band: scoreBand(score) };
  }, [scanned, resumeText, jobDescription]);

  const canScan = resumeText.trim().length >= 100 && jobDescription.trim().length >= 100;

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="sticky top-0 z-50 border-b border-border/70 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3">
          <Link to="/" aria-label="Resume Rocket home" className="flex items-center">
            <BrandLogo className="h-8 sm:h-10" />
          </Link>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link to="/pricing">Pricing</Link>
            </Button>
            <Button asChild size="sm" className="bg-gradient-brand text-brand-foreground hover:opacity-90">
              <Link to="/login">Build My Resume</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-12">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Free ATS Resume Checker
          </h1>
          <p className="mt-3 text-muted-foreground">
            Paste your resume and the job description below. Our scanner checks your resume
            the same way applicant tracking systems do — keyword by keyword — and shows
            exactly what to fix. Free, instant, and private: nothing leaves your browser.
          </p>
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          <div>
            <label htmlFor="resume-text" className="mb-2 block text-sm font-semibold">
              Your resume text
            </label>
            <textarea
              id="resume-text"
              value={resumeText}
              onChange={(e) => {
                setResumeText(e.target.value);
                setScanned(false);
              }}
              placeholder="Paste the full text of your resume here…"
              className="h-64 w-full rounded-xl border border-border bg-card p-4 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label htmlFor="jd-text" className="mb-2 block text-sm font-semibold">
              Job description
            </label>
            <textarea
              id="jd-text"
              value={jobDescription}
              onChange={(e) => {
                setJobDescription(e.target.value);
                setScanned(false);
              }}
              placeholder="Paste the job description you are applying for…"
              className="h-64 w-full rounded-xl border border-border bg-card p-4 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>

        <div className="mt-6 text-center">
          <Button
            size="lg"
            disabled={!canScan}
            onClick={() => setScanned(true)}
            className="bg-gradient-brand text-brand-foreground hover:opacity-90"
          >
            <FileScan className="mr-2 h-4 w-4" />
            Scan My Resume — Free
          </Button>
          {!canScan && (
            <p className="mt-2 text-xs text-muted-foreground">
              Paste at least 100 characters in both fields to run the scan.
            </p>
          )}
        </div>

        {result && (
          <section aria-live="polite" className="mx-auto mt-12 max-w-3xl">
            <div className="rounded-2xl border border-border bg-card p-8 text-center">
              <p className="text-sm font-medium text-muted-foreground">Your ATS Match Score</p>
              <p className="mt-2 text-6xl font-bold tabular-nums">{result.score}</p>
              <p className="mt-1 text-lg font-semibold">{result.band}</p>
              <p className="mt-2 text-sm text-muted-foreground">
                {result.matched.length} of {result.keywords.length} important keywords found.
              </p>
            </div>

            <div className="mt-6 grid gap-6 sm:grid-cols-2">
              <div className="rounded-xl border border-border bg-card p-5">
                <h2 className="flex items-center gap-2 text-sm font-semibold">
                  <CheckCircle2 className="h-4 w-4 text-green-600" /> Matched keywords
                </h2>
                <ul className="mt-3 flex flex-wrap gap-2">
                  {result.matched.length === 0 && (
                    <li className="text-sm text-muted-foreground">No matches yet.</li>
                  )}
                  {result.matched.map((k) => (
                    <li
                      key={k}
                      className="rounded-full bg-green-500/10 px-3 py-1 text-xs font-medium text-green-700 dark:text-green-400"
                    >
                      {k}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-xl border border-border bg-card p-5">
                <h2 className="flex items-center gap-2 text-sm font-semibold">
                  <XCircle className="h-4 w-4 text-red-500" /> Missing keywords
                </h2>
                <ul className="mt-3 flex flex-wrap gap-2">
                  {result.missing.length === 0 && (
                    <li className="text-sm text-muted-foreground">
                      Great — no major keywords missing.
                    </li>
                  )}
                  {result.missing.map((k) => (
                    <li
                      key={k}
                      className="rounded-full bg-red-500/10 px-3 py-1 text-xs font-medium text-red-600 dark:text-red-400"
                    >
                      {k}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="mt-8 rounded-2xl border border-brand/30 bg-brand/5 p-8 text-center">
              <h2 className="text-xl font-bold">Want a higher score — automatically?</h2>
              <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">
                Resume Rocket's AI builder rewrites your resume around the job description,
                weaving in the missing keywords naturally while keeping it ATS-parseable.
              </p>
              <Button asChild size="lg" className="mt-4 bg-gradient-brand text-brand-foreground hover:opacity-90">
                <Link to="/register">Fix My Resume with AI</Link>
              </Button>
            </div>
          </section>
        )}

        <section className="mx-auto mt-16 grid max-w-4xl gap-6 sm:grid-cols-3">
          <TrustCard
            icon={<Lock className="h-5 w-5" />}
            title="100% Private"
            text="This free scan runs entirely in your browser. Your resume text is never uploaded or stored."
          />
          <TrustCard
            icon={<Zap className="h-5 w-5" />}
            title="Instant Results"
            text="The same deterministic keyword engine that powers our builder — no waiting, no signup."
          />
          <TrustCard
            icon={<ShieldCheck className="h-5 w-5" />}
            title="Recruiter-Grade"
            text="Matches how real ATS software tokenizes and filters resumes, including Java vs JavaScript pitfalls."
          />
        </section>

        <section className="mx-auto mt-16 max-w-3xl">
          <h2 className="text-2xl font-bold">How the free ATS scan works</h2>
          <ol className="mt-4 list-decimal space-y-2 pl-6 text-sm text-muted-foreground">
            <li>We extract the most important skills and keywords from the job description.</li>
            <li>Your resume is normalized the same way ATS software parses it.</li>
            <li>
              Each keyword is checked on word boundaries — so &quot;Java&quot; never counts as
              &quot;JavaScript&quot;.
            </li>
            <li>You get a match score plus the exact missing keywords to add.</li>
          </ol>
        </section>
      </main>

      <footer className="border-t border-border bg-muted/30">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-5 py-8 sm:flex-row">
          <p className="text-xs text-muted-foreground">© 2026 Resume Rocket. All rights reserved.</p>
          <nav className="flex gap-4 text-xs text-muted-foreground">
            <Link to="/" className="hover:text-foreground">Home</Link>
            <Link to="/pricing" className="hover:text-foreground">Pricing</Link>
            <Link to="/login" className="hover:text-foreground">Login</Link>
            <Link to="/register" className="hover:text-foreground">Register</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}

function TrustCard({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 text-center">
      <div className="mx-auto grid h-10 w-10 place-items-center rounded-full bg-brand/10 text-brand">
        {icon}
      </div>
      <h2 className="mt-3 text-sm font-semibold">{title}</h2>
      <p className="mt-1 text-xs text-muted-foreground">{text}</p>
    </div>
  );
}
