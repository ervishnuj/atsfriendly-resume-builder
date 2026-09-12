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
import {
  Sparkles,
  Download,
  Loader2,
  CheckCircle2,
  Trash2,
  ChevronDown,
  ChevronUp,
  Crown,
  ShieldCheck,
  FileText,
} from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";
import { ProfileForm, emptyProfile, type Profile } from "@/components/ProfileForm";
import { ResumePreview } from "@/components/ResumePreview";
import { PdfPagePreview } from "@/components/PdfPagePreview";
import { AtsScoreBadge } from "@/components/AtsScoreBadge";
import { AtsBreakdownPanel } from "@/components/AtsBreakdown";
import { ImportProfileDialog } from "@/components/ImportProfileDialog";
import { AiInsightsPanel } from "@/components/AiInsightsPanel";
import { TemplateStudio } from "@/components/TemplateStudio";
import { ATS_CLASSIC, BUILTIN_TEMPLATES, type TemplateConfig } from "@/lib/resume-templates";
import { buildResumeDocx } from "@/lib/resume-docx";
import type { ProfileImportIssue } from "@/lib/profile-io";
import { generateResume, getMyAiUsage } from "@/lib/resume.functions";
import type { OptimizedResume } from "@/lib/resume.functions";
import { newGenerationRequestId, parseAiLimitError } from "@/lib/ai-limits";
import { getMyProfile, saveMyProfile, clearMyProfile } from "@/lib/profile-sync.functions";
import { getCurrentSubscription, amIAdmin, consumeDownloadEntitlement } from "@/lib/billing.functions";
import { daysRemaining, paymentGateNotice, type PaymentGateStatus } from "@/lib/billing-shared";
import { readPaymentGate, savePaymentGate, clearPaymentGate } from "@/lib/payment-gate-state";
import { PaymentGateBanner } from "@/components/PaymentGateBanner";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { supabase } from "@/integrations/supabase/client";
import { LogOut } from "lucide-react";

import { clearBrowserUserData } from "@/lib/profile-storage";

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
        content: "Generate ATS-optimized resumes tailored to any job description in seconds.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  const { user } = Route.useRouteContext();
  const userId = user.id;
  const [profile, setProfile] = useState<Profile>(emptyProfile);
  const [jd, setJd] = useState("");
  const [result, setResult] = useState<OptimizedResume | null>(null);
  const [loading, setLoading] = useState(false);
  const [hydratedUserId, setHydratedUserId] = useState<string | null>(null);
  const [savedLocally, setSavedLocally] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [importIssues, setImportIssues] = useState<ProfileImportIssue[]>([]);
  const jdRef = useRef<HTMLTextAreaElement>(null);
  const run = useServerFn(generateResume);
  const fetchAiUsage = useServerFn(getMyAiUsage);
  const loadRemote = useServerFn(getMyProfile);
  const saveRemote = useServerFn(saveMyProfile);
  const clearRemote = useServerFn(clearMyProfile);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fetchSubscription = useServerFn(getCurrentSubscription);
  const fetchAdmin = useServerFn(amIAdmin);
  const consumeDownload = useServerFn(consumeDownloadEntitlement);
  const [downloading, setDownloading] = useState(false);
  const [pdfMode, setPdfMode] = useState(false);
  const [gateStatus, setGateStatus] = useState<PaymentGateStatus | null>(null);
  const [templateId, setTemplateId] = useState<string>("ats-classic");
  const [templateConfig, setTemplateConfig] = useState<TemplateConfig>(ATS_CLASSIC);
  const [exportingDocx, setExportingDocx] = useState(false);
  const { data: subscription } = useQuery({
    queryKey: ["subscription", userId],
    queryFn: () => fetchSubscription(),
  });
  const { data: admin } = useQuery({ queryKey: ["am-i-admin", userId], queryFn: () => fetchAdmin() });
  const { data: aiUsage } = useQuery({
    queryKey: ["ai-usage", userId],
    queryFn: () => fetchAiUsage(),
  });
  const resumeUsage = aiUsage?.resume ?? null;
  const dailyLimitReached = resumeUsage ? resumeUsage.remaining <= 0 : false;
  const isAdminAccess = subscription?.admin === true;
  const isSubscribed = subscription?.active === true;

  /** Remember the last chosen template per account; new users get ATS Classic. */
  useEffect(() => {
    setTemplateId("ats-classic");
    setTemplateConfig(ATS_CLASSIC);
    try {
      const raw = window.localStorage.getItem(`resume-template:${userId}`);
      if (!raw) return;
      const saved = JSON.parse(raw) as { id: string; config: TemplateConfig };
      const builtin = BUILTIN_TEMPLATES.find((t) => t.id === saved.id);
      setTemplateId(saved.id);
      setTemplateConfig(builtin ? builtin.config : saved.config);
    } catch {
      /* ignore malformed storage */
    }
  }, [userId]);

  const handleSelectTemplate = (id: string, config: TemplateConfig) => {
    setTemplateId(id);
    setTemplateConfig(config);
    if (id !== "custom:draft") {
      try {
        window.localStorage.setItem(`resume-template:${userId}`, JSON.stringify({ id, config }));
      } catch {
        /* storage unavailable */
      }
    }
  };

  const handleExportDocx = async () => {
    if (!result || exportingDocx) return;
    setExportingDocx(true);
    try {
      // Build the file FIRST so a failed export never spends a credit, then
      // apply the same paid gate as the PDF.
      const blob = await buildResumeDocx(result, templateConfig);
      const entitlement = await consumeDownload();
      await queryClient.invalidateQueries({ queryKey: ["subscription", userId] });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${(result.optimizedProfile.personal.fullName || "resume").replace(/\s+/g, "_")}.docx`;
      a.click();
      URL.revokeObjectURL(url);
      const usedFree = "free" in entitlement && entitlement.free === true;
      toast.success(
        entitlement.unlimited
          ? "DOCX exported using your selected template."
          : usedFree
            ? "DOCX exported · this was your one free resume download."
            : entitlement.creditsRemaining && entitlement.creditsRemaining > 0
              ? `DOCX exported · ${entitlement.creditsRemaining} download left on your Single Resume purchase.`
              : "DOCX exported · this was the download included in your Single Resume purchase.",
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not export DOCX.";
      if (msg.includes("SUBSCRIPTION_REQUIRED")) {
        const fresh = await queryClient.fetchQuery({
          queryKey: ["subscription", userId],
          queryFn: () => fetchSubscription(),
        });
        notifyPaymentGate(fresh && fresh.active === false ? fresh.paymentStatus : undefined);
      } else {
        toast.error(msg);
      }
    } finally {
      setExportingDocx(false);
    }
  };

  /** Show the toast at most once per tab, but keep the banner until resolved. */
  const showGateToast = (status: PaymentGateStatus) => {
    const notice = paymentGateNotice(status);
    const show = notice.tone === "error" ? toast.error : notice.tone === "warning" ? toast.warning : toast.info;
    show(notice.title, {
      description: notice.description,
      duration: 8000,
      action: {
        label: notice.actionLabel,
        onClick: () => void navigate({ to: notice.routeToPricing ? "/payment" : "/subscription" }),
      },
    });
  };

  /** Explain what the user should do next instead of silently bouncing to pricing. */
  const notifyPaymentGate = (status: PaymentGateStatus | undefined) => {
    const resolved = status ?? "NO_PAYMENT";
    const notice = paymentGateNotice(resolved);
    setGateStatus(resolved);
    savePaymentGate(userId, { status: resolved, toastShown: true });
    showGateToast(resolved);
    if (notice.routeToPricing) void navigate({ to: "/payment" });
  };

  // Restore the last gate the user hit so a redirect or reload doesn't wipe it.
  useEffect(() => {
    const stored = readPaymentGate(userId);
    if (!stored) return;
    setGateStatus(stored.status);
    if (!stored.toastShown) {
      showGateToast(stored.status);
      savePaymentGate(userId, { status: stored.status, at: stored.at, toastShown: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // Once access is granted (or the server reports a different state) the gate clears.
  useEffect(() => {
    if (!subscription) return;
    if (subscription.active === true) {
      clearPaymentGate(userId);
      setGateStatus(null);
      return;
    }
    const fresh = subscription.paymentStatus ?? "NO_PAYMENT";
    setGateStatus((prev) => {
      if (prev === fresh) return prev;
      savePaymentGate(userId, { status: fresh, toastShown: true });
      return fresh;
    });
  }, [subscription, userId]);

  // Hydrate strictly from the signed-in account. Nothing is read from this
  // browser, so a new login always starts with an empty profile.
  useEffect(() => {
    let cancelled = false;
    // Blank the previous identity immediately. This also prevents the old
    // profile from being autosaved while the new identity is hydrating.
    setHydratedUserId(null);
    setProfile(emptyProfile);
    setJd("");
    setResult(null);
    setSavedLocally(false);
    setImportIssues([]);
    // Drop any profile data cached by older versions of the app.
    clearBrowserUserData();

    const apply = (merged: Profile | null) => {
      if (cancelled) return;
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
            : null,
        ),
      )
      .catch(() => apply(null))
      .finally(() => {
        if (!cancelled) setHydratedUserId(userId);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // Auto-save profile on change (after hydration) to the signed-in account only.
  useEffect(() => {
    if (hydratedUserId !== userId) return;
    const isEmpty =
      !profile.personal.fullName.trim() &&
      !profile.personal.email.trim() &&
      profile.experience.every((e) => !e.title && !e.company);
    if (isEmpty) {
      setSavedLocally(false);
      return;
    }
    if (!isSubscribed) {
      // Details are only persisted to the account for paid, signed-in users.
      setSavedLocally(false);
      return;
    }
    const t = setTimeout(() => {
      void saveRemote({ data: { profile } })
        .then(() => setSavedLocally(true))
        .catch(() => undefined);
    }, 800);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    // saveRemote is a framework hook result; userId scopes the persisted value.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile, hydratedUserId, userId, isSubscribed]);

  const handleClearProfile = async () => {
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
    // Drop every cached profile so the next account starts clean.
    clearBrowserUserData();
    setProfile(emptyProfile);
    setResult(null);
    setJd("");
    await supabase.auth.signOut();
    navigate({ to: "/login", replace: true });
  };

  const focusField = (path: string) => {
    const el = document.getElementById(`field-${path}`);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    (el as HTMLElement).focus({ preventScroll: true });
  };

  const handleImportProfile = (imported: Profile, issues: ProfileImportIssue[] = []) => {
    setProfile(imported);
    setProfileOpen(true);
    setImportIssues(issues);
    if (issues.length > 0) {
      toast.warning(`Imported with ${issues.length} field${issues.length > 1 ? "s" : ""} to fix — highlighted below.`);
      setTimeout(() => focusField(issues[0].path), 120);
    } else {
      toast.success(
        isSubscribed
          ? "Profile imported and saved to your account."
          : "Profile imported. Subscribe to save it to your account.",
      );
    }
  };

  const handleGenerate = async () => {
    if (!isSubscribed) {
      // Never send a paying user back to pricing on stale client state —
      // re-read the entitlement from the server first.
      const fresh = await queryClient.fetchQuery({
        queryKey: ["subscription", userId],
        queryFn: () => fetchSubscription(),
      });
      if (!(fresh?.active === true)) {
        notifyPaymentGate(fresh && fresh.active === false ? fresh.paymentStatus : undefined);
        return;
      }
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
    const requestId = newGenerationRequestId();
    try {
      const res = await run({ data: { profile, jobDescription: jd, requestId } });
      setResult(res.resume);
      await queryClient.invalidateQueries({ queryKey: ["ai-usage", userId] });
      toast.success(
        `Resume generated · ATS Score ${res.resume.atsScore}/100 · ${res.usage.remaining} of ${res.usage.limit} AI generations left today`,
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      const limit = parseAiLimitError(msg);
      if (limit) {
        // A usage limit is NOT a payment problem — never route the user to pricing.
        await queryClient.invalidateQueries({ queryKey: ["ai-usage", userId] });
        toast.warning(limit.message);
      } else if (msg.includes("SUBSCRIPTION_REQUIRED")) {
        const fresh = await queryClient.fetchQuery({
          queryKey: ["subscription", userId],
          queryFn: () => fetchSubscription(),
        });
        notifyPaymentGate(fresh && fresh.active === false ? fresh.paymentStatus : undefined);
      } else {
        toast.error(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (downloading) return;
    setDownloading(true);
    try {
      // The server decides — a one-time Single Resume purchase spends its PDF credit here.
      const entitlement = await consumeDownload();
      await queryClient.invalidateQueries({ queryKey: ["subscription", userId] });
      if (!entitlement.unlimited) {
        const usedFree = "free" in entitlement && entitlement.free === true;
        toast.success(
          usedFree
            ? "PDF unlocked · this was your one free resume download. Further downloads need a plan."
            : entitlement.creditsRemaining && entitlement.creditsRemaining > 0
              ? `PDF unlocked · ${entitlement.creditsRemaining} download left on your Single Resume purchase.`
              : "PDF unlocked · this was the download included in your Single Resume purchase.",
        );
      }
      window.print();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not start the download.";
      if (msg.includes("SUBSCRIPTION_REQUIRED")) {
        const fresh = await queryClient.fetchQuery({
          queryKey: ["subscription", userId],
          queryFn: () => fetchSubscription(),
        });
        notifyPaymentGate(fresh && fresh.active === false ? fresh.paymentStatus : undefined);
      } else {
        toast.error(msg);
      }
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="min-h-screen bg-muted/30">
      <Toaster richColors position="top-right" />
      <header className="border-b border-border bg-background print:hidden">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4 px-6 py-4">
          <div className="flex items-center gap-2">
            <BrandLogo className="h-9 sm:h-10" />
            <div className="hidden sm:block">
<h1 className="sr-only">Create Your ATS-Friendly Resume</h1>
              <p className="text-xs text-muted-foreground">AI-tailored resumes for any job description</p>
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
                  {subscription.admin
                    ? "Admin · Unlimited access"
                    : subscription.active
                      ? subscription.creditsRemaining !== null
                        ? `${subscription.planName} · ${subscription.creditsRemaining} PDF left`
                        : `${subscription.planName} · ${daysRemaining(subscription.endDate)}d left`
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
                Profile Saved To Account
              </Badge>
            )}
            <Button asChild variant="ghost" size="sm">
              <Link to="/">Home</Link>
            </Button>
            <Button onClick={handleGenerate} disabled={loading || dailyLimitReached} className="gap-2">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {loading ? "Generating..." : "Generate ATS Resume"}
            </Button>
            {resumeUsage && (
              <Badge variant="secondary" className="hidden gap-1 sm:inline-flex">
                AI resumes today {resumeUsage.used} / {resumeUsage.limit}
              </Badge>
            )}
            <Button asChild variant="ghost" size="sm">
              <Link to="/tracker">Tracker</Link>
            </Button>
            <Button
              variant="outline"
              onClick={() => void handleDownload()}
              disabled={!result || downloading}
              className="gap-2"
            >
              {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              {downloading ? "Preparing PDF..." : "Download PDF"}
            </Button>
            <Button
              variant="outline"
              onClick={() => void handleExportDocx()}
              disabled={!result || exportingDocx}
              className="gap-2 print:hidden"
            >
              {exportingDocx ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
              Export DOCX
            </Button>

            <Button variant="ghost" onClick={handleSignOut} className="gap-2 print:hidden">
              <LogOut className="h-4 w-4" /> Sign out
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-[1600px] grid-cols-1 gap-6 px-6 py-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] print:block print:p-0">
        <section className="space-y-4 print:hidden">
          {!isSubscribed && !isAdminAccess && gateStatus && (
            <PaymentGateBanner
              status={gateStatus}
              onDismiss={() => {
                setGateStatus(null);
                clearPaymentGate(userId);
              }}
            />
          )}
          {dailyLimitReached && (
            <Card role="status" className="border-amber-300/60 bg-amber-50 p-4 dark:bg-amber-950/20">
              <p className="text-sm font-semibold">Your plan is still active — the limit resets at midnight IST.</p>
              <p className="mt-1 text-sm text-muted-foreground">
                You have used {resumeUsage?.used ?? 0} of {resumeUsage?.limit ?? 5} AI resume generations today. Your
                plan is still active — the limit resets at midnight IST. You can still view, edit and download your
                existing resumes.
              </p>
            </Card>
          )}
          <Card className="p-4">
            <div className="mb-2 flex items-center justify-between">
              <h2 id="jd-heading" className="text-sm font-semibold">
                Target Job Description
              </h2>
              <span className="text-xs text-muted-foreground">Primary input</span>
            </div>
            <p className="mb-2 text-xs">
              <Link to="/how-it-works" hash="build" className="text-muted-foreground hover:text-foreground hover:underline">
                New here? View the Resume Builder Guide →
              </Link>
            </p>
            <Textarea
              ref={jdRef}
              id="job-description"
              aria-label="Target job description"
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
                <Button variant="ghost" size="sm" onClick={() => setProfileOpen((v) => !v)} className="gap-1">
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
                  <div role="alert" className="mb-3 rounded-md border border-destructive/40 bg-destructive/5 p-3">
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
                            <span className="font-semibold">{issue.field}:</span> {issue.message}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <ProfileForm
                  profile={profile}
                  setProfile={setProfile}
                  fieldErrors={Object.fromEntries(importIssues.map((i) => [i.path, i.message]))}
                />
              </>
            ) : (
              <p className="text-xs text-muted-foreground">
                Your profile is stored privately in your account and will be used automatically. Click{" "}
                <span className="font-medium">Edit</span> to update it.
              </p>
            )}
          </Card>
          <AiInsightsPanel
            profile={profile}
            jobDescription={jd}
            onSubscriptionRequired={() => void navigate({ to: "/payment" })}
          />
        </section>

        <section className="space-y-4">
          <TemplateStudio
            data={result}
            templateId={templateId}
            config={templateConfig}
            onSelect={handleSelectTemplate}
          />
          {result && (
            <Card className="p-5 print:hidden">
              <div className="grid gap-4 sm:grid-cols-2">
                <AtsScoreBadge
                  score={result.atsScore}
                  title="ATS Score"
                  caption="Overall ATS-readiness of your resume"
                />
                {typeof result.atsMatchScore === "number" && (
                  <AtsScoreBadge
                    score={result.atsMatchScore}
                    title="ATS Match Score"
                    unit="%"
                    caption="How closely this resume matches the job description"
                  />
                )}
              </div>
              {result.ats && (
                <div className="mt-4">
                  <AtsBreakdownPanel breakdown={result.ats.breakdown} matchBreakdown={result.ats.matchBreakdown} />
                </div>
              )}
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
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2 print:hidden">
                  <div className="text-xs text-muted-foreground">
                    {pdfMode
                      ? "PDF preview · exact A4 pages, margins and page breaks"
                      : "Continuous preview"}
                  </div>
                  <div className="inline-flex rounded-md border border-border p-0.5">
                    <Button
                      type="button"
                      size="sm"
                      variant={pdfMode ? "ghost" : "secondary"}
                      className="h-7 px-3 text-xs"
                      onClick={() => setPdfMode(false)}
                    >
                      Continuous
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={pdfMode ? "secondary" : "ghost"}
                      className="h-7 gap-1 px-3 text-xs"
                      onClick={() => setPdfMode(true)}
                    >
                      <FileText className="h-3.5 w-3.5" /> PDF preview
                    </Button>
                  </div>
                </div>
                {pdfMode && (
                  <div className="overflow-x-auto rounded-lg bg-muted/40 p-4">
                    <PdfPagePreview data={result} config={templateConfig} />
                  </div>
                )}
                <div
                  className={
                    pdfMode
                      ? "hidden print:block"
                      : "overflow-x-auto print:overflow-visible"
                  }
                >
                  <ResumePreview data={result} config={templateConfig} />
                </div>
              </div>
            ) : (

              <Card className="flex min-h-[600px] items-center justify-center p-8 text-center print:hidden">
                <div className="max-w-sm">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                    <Sparkles className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-base font-semibold">Your optimized resume will appear here</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Fill in your profile, paste a target job description, then click{" "}
                    <span className="font-medium">Generate Resume</span> to see your ATS score and tailored resume.
                  </p>
                </div>
              </Card>
            )}
          </div>
        </section>
      </main>
      <div className="print:hidden">
        <LandingFooter signedIn />
      </div>
    </div>
  );
}
