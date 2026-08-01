import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, Sparkles, Download, Loader2, CheckCircle2, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { ProfileForm, emptyProfile, type Profile } from "@/components/ProfileForm";
import { ResumePreview } from "@/components/ResumePreview";
import { AtsScoreBadge } from "@/components/AtsScoreBadge";
import { ImportProfileDialog } from "@/components/ImportProfileDialog";
import { generateResume } from "@/lib/resume.functions";
import type { OptimizedResume } from "@/lib/resume.functions";

const STORAGE_KEY = "ats-resume-builder:profile";

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
  const [hydrated, setHydrated] = useState(false);
  const [savedLocally, setSavedLocally] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const jdRef = useRef<HTMLTextAreaElement>(null);
  const run = useServerFn(generateResume);

  // Hydrate from localStorage on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Profile;
        setProfile(parsed);
        setSavedLocally(true);
        setProfileOpen(false);
        // Focus JD for returning users
        setTimeout(() => jdRef.current?.focus(), 50);
      } else {
        setProfileOpen(true);
        toast.info("Fill in your profile once — we'll remember it for next time.");
      }
    } catch {
      // ignore
    }
    setHydrated(true);
  }, []);

  // Auto-save profile on change (after hydration)
  useEffect(() => {
    if (!hydrated) return;
    try {
      const isEmpty =
        !profile.personal.fullName.trim() &&
        !profile.personal.email.trim() &&
        profile.experience.every((e) => !e.title && !e.company);
      if (isEmpty) {
        setSavedLocally(false);
        return;
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
      setSavedLocally(true);
    } catch {
      // ignore quota errors
    }
  }, [profile, hydrated]);

  const handleClearProfile = () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
    setProfile(emptyProfile);
    setSavedLocally(false);
    setProfileOpen(true);
    toast.success("Stored profile cleared.");
  };

  const handleImportProfile = (imported: Profile) => {
    setProfile(imported);
    setProfileOpen(true);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(imported));
      setSavedLocally(true);
    } catch {
      // ignore
    }
    toast.success("Profile imported and saved locally.");
  };

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
            {savedLocally && (
              <Badge
                variant="secondary"
                className="hidden gap-1 bg-emerald-100 text-emerald-800 hover:bg-emerald-100 sm:inline-flex dark:bg-emerald-900/40 dark:text-emerald-200"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                Profile Saved Locally
              </Badge>
            )}
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
              {loading ? "Generating..." : "Generate ATS Resume"}
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
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-sm font-semibold">Target Job Description</h2>
              <span className="text-xs text-muted-foreground">Primary input</span>
            </div>
            <Textarea
              ref={jdRef}
              rows={8}
              value={jd}
              onChange={(e) => setJd(e.target.value)}
              placeholder="Paste the full job description here — the AI will extract keywords and requirements..."
              autoFocus={savedLocally}
            />
          </Card>
          <Card className="p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold">Your Profile</h2>
                {savedLocally && (
                  <Badge
                    variant="secondary"
                    className="gap-1 bg-emerald-100 text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-900/40 dark:text-emerald-200"
                  >
                    <CheckCircle2 className="h-3 w-3" />
                    Saved
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-1">
                <ImportProfileDialog onImport={handleImportProfile} />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setProfileOpen((v) => !v)}
                  className="gap-1"
                >
                  {profileOpen ? (
                    <>
                      <ChevronUp className="h-4 w-4" /> Collapse
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-4 w-4" /> Edit
                    </>
                  )}
                </Button>
                {savedLocally && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClearProfile}
                    className="gap-1 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" /> Clear
                  </Button>
                )}
              </div>
            </div>
            {profileOpen ? (
              <ProfileForm profile={profile} setProfile={setProfile} />
            ) : (
              <p className="text-xs text-muted-foreground">
                Your profile is stored locally and will be used automatically.
                Click <span className="font-medium">Edit</span> to update it.
              </p>
            )}
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
