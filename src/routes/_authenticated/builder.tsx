import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, Sparkles, Download, Loader2, CheckCircle2, Trash2, ChevronDown, ChevronUp, Crown, ShieldCheck } from "lucide-react";
import { ProfileForm, emptyProfile, type Profile } from "@/components/ProfileForm";
import { ResumePreview } from "@/components/ResumePreview";
import { AtsScoreBadge } from "@/components/AtsScoreBadge";
import { ImportProfileDialog } from "@/components/ImportProfileDialog";
import type { ProfileImportIssue } from "@/lib/profile-io";
import { generateResume } from "@/lib/resume.functions";
import type { OptimizedResume } from "@/lib/resume.functions";
import { getMyProfile, saveMyProfile, clearMyProfile } from "@/lib/profile-sync.functions";
import { getCurrentSubscription, amIAdmin } from "@/lib/billing.functions";
import { daysRemaining } from "@/lib/billing-shared";
import { supabase } from "@/integrations/supabase/client";
import { LogOut } from "lucide-react";

const STORAGE_KEY = "ats-resume-builder:profile";

export const Route = createFileRoute("/_authenticated/builder")({
  head: () => ({
    meta: [
      { title: "Resume Builder — ATS Resume Builder" },
      {
        name: "description",
        content:
          "Paste a job description and generate a tailored, ATS-friendly resume with an AI match score, keyword analysis, and one-click PDF download.",
      },
      { property: "og:title", content: "Resume Builder — ATS Resume Builder" },
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
  const [importIssues, setImportIssues] = useState<ProfileImportIssue[]>([]);
  const jdRef = useRef<HTMLTextAreaElement>(null);
  const run = useServerFn(generateResume);
  const loadRemote = useServerFn(getMyProfile);
  const saveRemote = useServerFn(saveMyProfile);
  const clearRemote = useServerFn(clearMyProfile);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fetchSubscription = useServerFn(getCurrentSubscription);
  const fetchAdmin = useServerFn(amIAdmin);
  const { data: subscription } = useQuery({
    queryKey: ["subscription"],
    queryFn: () => fetchSubscription(),
  });
  const { data: admin } = useQuery({ queryKey: ["am-i-admin"], queryFn: () => fetchAdmin() });
  const isSubscribed = subscription?.active === true;

  // Hydrate from the account first, falling back to localStorage
  useEffect(() => {
    let cancelled = false;
    const localProfile = (() => {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? (JSON.parse(raw) as Profile) : null;
      } catch {
        return null;
      }
    })();

    const apply = (merged: Profile | null) => {
      if (merged) {
        setProfile(merged);
        setSavedLocally(true);
        setProfileOpen(false);
        setTimeout(() => jdRef.current?.focus(), 50);
      } else {
        setProfileOpen(true);
        toast.info("Fill in your profile once — we'll remember it for next time.");
      }
    };

    loadRemote()
      .then((remote) =>
        apply(
          remote
            ? {
                personal: remote.personal ?? emptyProfile.personal,
                skills: remote.skills ?? emptyProfile.skills,
                experience: remote.experience ?? emptyProfile.experience,
                education: remote.education ?? emptyProfile.education,
              }
            : localProfile,
        ),
      )
      .catch(() => apply(localProfile))
      .finally(() => {
        if (!cancelled) setHydrated(true);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-save profile on change (after hydration): localStorage + account
  useEffect(() => {
    if (!hydrated) return;
    const isEmpty =
      !profile.personal.fullName.trim() &&
      !profile.personal.email.trim() &&
      profile.experience.every((e) => !e.title && !e.company);
    try {
      if (isEmpty) {
        setSavedLocally(false);
      } else {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
        setSavedLocally(true);
      }
    } catch {
      // ignore quota errors
    }
    if (isEmpty) return;
    const t = setTimeout(() => {
      void saveRemote({ data: { profile } }).catch(() => undefined);
    }, 800);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile, hydrated]);

  const handleClearProfile = async () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
    await clearRemote().catch(() => undefined);
    setProfile(emptyProfile);
    setSavedLocally(false);
    setProfileOpen(true);
    setImportIssues([]);
    toast.success("Stored profile cleared.");
  };

  const handleSignOut = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  const focusField = (path: string) => {
    const el = document.getElementById(`field-${path}`);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    (el as HTMLElement).focus({ preventScroll: true });
  };

  const handleImportProfile = (
    imported: Profile,
    issues: ProfileImportIssue[] = [],
  ) => {
    setProfile(imported);
    setProfileOpen(true);
    setImportIssues(issues);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(imported));
      setSavedLocally(true);
    } catch {
      // ignore
    }
    if (issues.length > 0) {
      toast.warning(
        `Imported with ${issues.length} field${issues.length > 1 ? "s" : ""} to fix — highlighted below.`,
      );
      setTimeout(() => focusField(issues[0].path), 120);
    } else {
      toast.success("Profile imported and saved locally.");
    }
  };

  const handleGenerate = async () => {
    if (!isSubscribed) {
      toast.error("An active subscription is required to generate resumes.");
      void navigate({ to: "/payment" });
      return;
    }
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
      if (msg.includes("SUBSCRIPTION_REQUIRED")) {
        toast.error("Your subscription has expired. Please renew to continue.");
        void navigate({ to: "/payment" });
      } else {
        toast.error(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!isSubscribed) {
      toast.error("PDF download is a premium feature. Please subscribe.");
      void navigate({ to: "/payment" });
      return;
    }
    window.print();
  };

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
            {subscription && (
              <Link to="/subscription">
                <Badge
                  variant="secondary"
                  className={
                    isSubscribed
                      ? "hidden gap-1 bg-amber-100 text-amber-900 hover:bg-amber-100 sm:inline-flex dark:bg-amber-900/40 dark:text-amber-100"
                      : "hidden gap-1 sm:inline-flex"
                  }
                >
                  <Crown className="h-3.5 w-3.5" />
                  {subscription.active
                    ? `${subscription.planName} · ${daysRemaining(subscription.endDate)}d left`
                    : "No active plan"}
                </Badge>
              </Link>
            )}
            {admin?.isAdmin && (
              <Button asChild variant="ghost" size="sm" className="gap-1">
                <Link to="/admin/payments">
                  <ShieldCheck className="h-4 w-4" /> Admin
                </Link>
              </Button>
            )}
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
            <Button variant="ghost" onClick={handleSignOut} className="gap-2 print:hidden">
              <LogOut className="h-4 w-4" /> Sign out
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
              <>
                {importIssues.length > 0 && (
                  <div
                    role="alert"
                    className="mb-3 rounded-md border border-destructive/40 bg-destructive/5 p-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium text-destructive">
                        {importIssues.length} imported field
                        {importIssues.length > 1 ? "s need" : " needs"} attention
                      </p>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-xs text-destructive hover:text-destructive"
                        onClick={() => setImportIssues([])}
                      >
                        Dismiss
                      </Button>
                    </div>
                    <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto text-xs">
                      {importIssues.map((issue, i) => (
                        <li key={`${issue.path}-${i}`}>
                          <button
                            type="button"
                            onClick={() => focusField(issue.path)}
                            className="text-left text-destructive underline-offset-2 hover:underline"
                          >
                            <span className="font-semibold">{issue.field}:</span>{" "}
                            {issue.message}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <ProfileForm
                  profile={profile}
                  setProfile={setProfile}
                  fieldErrors={Object.fromEntries(
                    importIssues.map((i) => [i.path, i.message]),
                  )}
                />
              </>
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
