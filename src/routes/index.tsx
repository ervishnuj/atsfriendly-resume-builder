import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, Sparkles, Download, Loader2 } from "lucide-react";
import { ProfileForm, emptyProfile, type Profile } from "@/components/ProfileForm";
import { ResumePreview } from "@/components/ResumePreview";
import { AtsScoreBadge } from "@/components/AtsScoreBadge";
import { generateResume } from "@/lib/resume.functions";
import type { OptimizedResume } from "@/lib/resume.functions";

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
        content:
          "Generate ATS-optimized resumes tailored to any job description in seconds.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  const [profile, setProfile] = useState<Profile>(emptyProfile);
  const [jd, setJd] = useState("");
  const [result, setResult] = useState<OptimizedResume | null>(null);
  const [loading, setLoading] = useState(false);
  const run = useServerFn(generateResume);

  const handleGenerate = async () => {
    if (!jd.trim()) {
      toast.error("Please paste the target Job Description first.");
      return;
    }
    if (!profile.personal.fullName.trim()) {
      toast.error("Please add your full name.");
      return;
    }
    setLoading(true);
    try {
      const res = await run({ data: { profile, jobDescription: jd } });
      setResult(res);
      toast.success(`Resume generated · ATS Score ${res.atsScore}/100`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => window.print();

  return (
    <div className="min-h-screen bg-muted/30">
      <Toaster richColors position="top-right" />
      <header className="border-b border-border bg-background print:hidden">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4 px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-semibold tracking-tight">
                ATS Resume Builder
              </h1>
              <p className="text-xs text-muted-foreground">
                AI-tailored resumes for any job description
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={handleGenerate}
              disabled={loading}
              className="gap-2"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              {loading ? "Generating..." : "Generate Resume"}
            </Button>
            <Button
              variant="outline"
              onClick={handleDownload}
              disabled={!result}
              className="gap-2"
            >
              <Download className="h-4 w-4" /> Download PDF
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-[1600px] grid-cols-1 gap-6 px-6 py-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] print:block print:p-0">
        <section className="space-y-4 print:hidden">
          <Card className="p-4">
            <h2 className="mb-2 text-sm font-semibold">Target Job Description</h2>
            <Textarea
              rows={8}
              value={jd}
              onChange={(e) => setJd(e.target.value)}
              placeholder="Paste the full job description here — the AI will extract keywords and requirements..."
            />
          </Card>
          <Card className="p-4">
            <h2 className="mb-3 text-sm font-semibold">Your Profile</h2>
            <ProfileForm profile={profile} setProfile={setProfile} />
          </Card>
        </section>

        <section className="space-y-4">
          {result && (
            <Card className="p-5 print:hidden">
              <AtsScoreBadge score={result.atsScore} />
              <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <div className="mb-1 text-xs font-medium text-muted-foreground">
                    Matching Keywords ({result.matchingKeywords.length})
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {result.matchingKeywords.map((k) => (
                      <Badge
                        key={k}
                        variant="secondary"
                        className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-900/40 dark:text-emerald-200"
                      >
                        {k}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="mb-1 text-xs font-medium text-muted-foreground">
                    Missing Keywords ({result.missingKeywords.length})
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {result.missingKeywords.map((k) => (
                      <Badge
                        key={k}
                        variant="secondary"
                        className="bg-rose-100 text-rose-800 hover:bg-rose-100 dark:bg-rose-900/40 dark:text-rose-200"
                      >
                        {k}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          )}

          <div className="print:m-0">
            {result ? (
              <ResumePreview data={result} />
            ) : (
              <Card className="flex min-h-[600px] items-center justify-center p-8 text-center print:hidden">
                <div className="max-w-sm">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                    <Sparkles className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-base font-semibold">
                    Your optimized resume will appear here
                  </h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Fill in your profile, paste a target job description, then
                    click <span className="font-medium">Generate Resume</span> to
                    see your ATS score and tailored resume.
                  </p>
                </div>
              </Card>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
