import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
import { UploadResumeDialog } from "@/components/UploadResumeDialog";
import { AiInsightsPanel } from "@/components/AiInsightsPanel";
import { LearningPlanPanel } from "@/components/LearningPlanPanel";
import { addLearningPlans } from "@/lib/learning-plans.functions";
import { TemplateStudio } from "@/components/TemplateStudio";
import { ATS_CLASSIC, BUILTIN_TEMPLATES, atsWarnings, type TemplateConfig } from "@/lib/resume-templates";
import { buildResumeDocx } from "@/lib/resume-docx";
import type { ProfileImportIssue } from "@/lib/profile-io";
import { analyzeAtsScore, generateResume, getMyAiUsage } from "@/lib/resume.functions";
import type { OptimizedResume, AtsAnalysis } from "@/lib/resume.functions";
import { auditResumeReadability, explainScoreTarget, validateOptimizedProfile } from "@/lib/resume-optimization";
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
import { listResumeVersions, saveResumeVersion } from "@/lib/versions.functions";
import { createJobApplication } from "@/lib/applications.functions";
import { ApplicationDetailsDialog, blankApplicationDraft, type ApplicationDraft } from "@/components/ApplicationDetailsDialog";

export const Route = createFileRoute("/_authenticated/builder")({
  head: () => ({
    meta: [
      { title: "Job-Specific Resume Optimizer — Resume Rocket" },
      {
        name: "description",
        content:
          "Optimize a resume for a specific job using your supplied evidence, explainable ATS scores and truthful learning labels.",
      },
      { property: "og:title", content: "Job-Specific Resume Optimizer — Resume Rocket" },
      {
        property: "og:description",
        content: "Tailor verified experience to a job and review honest ATS readiness and match scores with Resume Rocket.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  validateSearch: (search: Record<string, unknown>): { version?: string } =>
    typeof search.version === "string" && /^[0-9a-f-]{36}$/i.test(search.version) ? { version: search.version } : {},
  component: Index,
});

function Index() {
  const { user } = Route.useRouteContext();
  const userId = user.id;
  const [profile, setProfile] = useState<Profile>(emptyProfile);
  const [jd, setJd] = useState("");
  const [result, setResult] = useState<OptimizedResume | null>(null);
  const { version: versionParam } = Route.useSearch();
  const saveVersion = useServerFn(saveResumeVersion);
  const fetchVersions = useServerFn(listResumeVersions);
  const createApplication = useServerFn(createJobApplication);
  const [trackOpen, setTrackOpen] = useState(false);
  const [trackSaving, setTrackSaving] = useState(false);
  const [trackDraft, setTrackDraft] = useState<ApplicationDraft>(blankApplicationDraft());
  const [trackedResultKey, setTrackedResultKey] = useState<string | null>(null);
  // One tracker save per generated resume: the key is reused on retries so the
  // server returns the existing record instead of creating a duplicate.
  const trackKeyRef = useRef<string>("");
  const savedVersionRef = useRef<{ key: string; id: string } | null>(null);
  const [currentResumeText, setCurrentResumeText] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingScore, setCheckingScore] = useState(false);
  const [recheckedAnalysis, setRecheckedAnalysis] = useState<AtsAnalysis | null>(null);
  const [scorePending, setScorePending] = useState(false);
  const [editingResume, setEditingResume] = useState(false);
  const [resumeDraft, setResumeDraft] = useState<OptimizedResume["optimizedProfile"] | null>(null);
  const [hydratedUserId, setHydratedUserId] = useState<string | null>(null);
  const [savedLocally, setSavedLocally] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [importIssues, setImportIssues] = useState<ProfileImportIssue[]>([]);
  const jdRef = useRef<HTMLTextAreaElement>(null);
  const run = useServerFn(generateResume);
  const recheck = useServerFn(analyzeAtsScore);
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
  const [pdfConfirmationOpen, setPdfConfirmationOpen] = useState(false);
  const [pdfMode, setPdfMode] = useState(false);
  const [mobileStep, setMobileStep] = useState<"job" | "profile" | "resume">("job");
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
    setRecheckedAnalysis(null);
    setScorePending(false);
    setEditingResume(false);
    setResumeDraft(null);
    setCurrentResumeText("");
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

  const addPlans = useServerFn(addLearningPlans);
  const saveLearningPlan = async () => {
    const steps = result?.optimization?.learningRoadmap ?? [];
    if (!steps.length) return;
    try {
      const { added } = await addPlans({ data: { jobTitle: result?.ats?.jobTitle ?? "", items: steps.map((s) => ({ skill: s.skill, priority: s.priority, why: s.why })) } });
      await queryClient.invalidateQueries({ queryKey: ["learning-plans", userId] });
      toast.success(added ? `Added ${added} skill${added > 1 ? "s" : ""} to your learning plan.` : "These skills are already in your learning plan.");
      if (window.matchMedia("(min-width: 1024px)").matches) {
        document.getElementById("learning-plan")?.scrollIntoView({ behavior: "smooth" });
      } else {
        setMobileStep("profile");
        requestAnimationFrame(() => requestAnimationFrame(() => document.getElementById("learning-plan")?.scrollIntoView({ behavior: "smooth" })));
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save your learning plan.");
    }
  };

  const handleClearProfile = async () => {
    await clearRemote().catch(() => undefined);
    setProfile(emptyProfile);
    setCurrentResumeText("");
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
    setCurrentResumeText("");
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

  const handleImportProfile = (imported: Profile, issues: ProfileImportIssue[] = [], originalText?: string) => {
    setProfile(imported);
    setCurrentResumeText(originalText ?? "");
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

  const openTrackerDialog = () => {
    if (!trackKeyRef.current) trackKeyRef.current = crypto.randomUUID();
    setTrackDraft((d) => ({ ...d, jobDescription: d.jobDescription || jd, jobTitle: d.jobTitle || result?.ats?.jobTitle || "" }));
    setTrackOpen(true);
  };

  const handleTrackSave = async (draft: ApplicationDraft) => {
    if (!result || trackSaving) return;
    setTrackSaving(true);
    const key = trackKeyRef.current || (trackKeyRef.current = crypto.randomUUID());
    try {
      let versionId = savedVersionRef.current?.key === key ? savedVersionRef.current.id : null;
      if (!versionId) {
        const saved = await saveVersion({ data: { company: draft.company.trim(), jobTitle: draft.jobTitle.trim(), jobDescription: draft.jobDescription, atsScore: Math.round(result.atsScore), matchScore: result.atsMatchScore == null ? null : Math.round(result.atsMatchScore), templateId, resume: result, templateConfig } });
        versionId = saved.id;
        savedVersionRef.current = { key, id: saved.id };
      }
      await createApplication({ data: { company: draft.company.trim(), jobTitle: draft.jobTitle.trim(), jobDescription: draft.jobDescription, appliedAt: draft.appliedAt, resumeVersionId: versionId, jobUrl: draft.jobUrl.trim(), location: "", salary: "", platform: draft.platform, customPlatform: draft.customPlatform.trim(), status: draft.status, notes: draft.notes, clientRequestId: key } });
      setTrackedResultKey(key);
      setTrackOpen(false);
      await queryClient.invalidateQueries({ queryKey: ["job-applications", userId] });
      await queryClient.invalidateQueries({ queryKey: ["resume-versions", userId] });
      toast.success("Saved to your Job Application Tracker.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save to the tracker. Please try again.");
    } finally {
      setTrackSaving(false);
    }
  };

  // Open a saved resume version from the tracker (?version=<id>).
  useEffect(() => {
    if (!versionParam) return;
    let cancelled = false;
    void fetchVersions().then((versions) => {
      const v = versions.find((x) => x.id === versionParam);
      if (cancelled) return;
      if (!v) { toast.error("That resume version is no longer available."); return; }
      setResult(v.resume);
      if (v.templateConfig) setTemplateConfig(v.templateConfig);
      setJd((cur) => cur || v.jobDescription);
      trackKeyRef.current = `version-${v.id}`;
      setTrackedResultKey(`version-${v.id}`);
      setMobileStep("resume");
    }).catch(() => toast.error("Could not open that resume version."));
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [versionParam]);

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
    setScorePending(false);
    setRecheckedAnalysis(null);
    setEditingResume(false);
    setResumeDraft(null);
    const requestId = newGenerationRequestId();
    try {
      const res = await run({ data: { profile, jobDescription: jd, requestId, currentResumeText: currentResumeText || undefined } });
      setResult(res.resume);
      setMobileStep("resume");
      trackKeyRef.current = crypto.randomUUID();
      savedVersionRef.current = null;
      setTrackDraft({ ...blankApplicationDraft(), jobTitle: res.resume.ats?.jobTitle ?? "", jobDescription: jd });
      setTrackOpen(true);
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

  const handleRecheck = async () => {
    if (!result || checkingScore || editingResume) return;
    setCheckingScore(true);
    try {
      const checked = await recheck({ data: { profile: result.optimizedProfile, jobDescription: jd, requestId: newGenerationRequestId() } });
      setRecheckedAnalysis(checked);
      setScorePending(false);
      await queryClient.invalidateQueries({ queryKey: ["ai-usage", userId] });
      toast.success("Alignment re-checked against the current resume.");
    } catch (err) {
      toast.error(err instanceof Error ? parseAiLimitError(err.message)?.message ?? err.message : "Could not re-check the score.");
    } finally {
      setCheckingScore(false);
    }
  };

  const saveResumeDraft = () => {
    if (!result || !resumeDraft) return;
    const checked = validateOptimizedProfile(profile, resumeDraft);
    if (checked.personal.summary !== resumeDraft.personal.summary || checked.experience.some((entry, i) => entry.bullets.some((bullet, j) => bullet !== resumeDraft.experience[i]?.bullets[j]))) {
      toast.warning("Some edits add information not verified in its source. Update your profile first, or rephrase using supplied facts.");
      return;
    }
    setResult({ ...result, optimizedProfile: checked });
    setRecheckedAnalysis(null);
    setScorePending(true);
    setResumeDraft(null);
    setEditingResume(false);
    toast.success("Resume wording saved. Re-check the score after your edits.");
  };

  const handleDownload = async () => {
    if (downloading) return;
    setPdfConfirmationOpen(false);
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
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-3 px-4 py-3 sm:gap-4 sm:px-6 sm:py-4">
          <div className="flex items-center gap-2">
            <BrandLogo className="h-9 sm:h-10" />
            <div className="hidden sm:block">
<h1 className="sr-only">Create Your ATS-Friendly Resume</h1>
              <p className="text-xs text-muted-foreground">AI-tailored resumes for any job description</p>
            </div>
          </div>
          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto [&>a]:min-h-11 [&>button]:min-h-11 sm:[&>a]:min-h-0 sm:[&>button]:min-h-0">
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
              {loading ? "Optimizing your resume..." : "Optimize My Resume"}
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
              onClick={() => setPdfConfirmationOpen(true)}
              disabled={!result || downloading}
              className="gap-2"
            >
              {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              {downloading ? "Preparing PDF..." : "Download PDF"}
            </Button>
            <AlertDialog open={pdfConfirmationOpen} onOpenChange={setPdfConfirmationOpen}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Open the PDF print dialog?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Continue only when you are ready to save the PDF. Your included download is used
                    when the print dialog opens because browsers do not report whether Save or Cancel
                    was selected.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Not yet</AlertDialogCancel>
                  <AlertDialogAction onClick={() => void handleDownload()}>
                    Continue to PDF
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
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

      {loading && <div role="status" aria-live="polite" className="mx-auto max-w-[1600px] px-4 pt-5 sm:px-6 print:hidden"><div className="flex items-center gap-3 border-b border-border pb-4 text-sm"><Loader2 className="h-4 w-4 animate-spin text-primary" /><span>Analyzing the role and your profile, optimizing verified content, then validating and scoring the finished resume…</span></div></div>}
      <nav aria-label="Resume steps" className="sticky top-0 z-30 border-b border-border bg-background/95 px-3 py-2 backdrop-blur lg:hidden print:hidden">
        <ol className="grid grid-cols-3 gap-1">
          {([["job", "1. Job"], ["profile", "2. Profile"], ["resume", "3. Resume"]] as const).map(([id, label]) => (
            <li key={id}>
              <button
                type="button"
                onClick={() => { setMobileStep(id); window.scrollTo({ top: 0 }); }}
                aria-current={mobileStep === id ? "step" : undefined}
                className={`min-h-11 w-full rounded-lg px-2 text-sm font-medium transition-colors ${mobileStep === id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
              >
                {label}
              </button>
            </li>
          ))}
        </ol>
      </nav>
      <main className="mx-auto grid max-w-[1600px] grid-cols-1 gap-6 px-3 py-4 sm:px-6 sm:py-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] print:block print:p-0">
        <section className={`space-y-4 print:hidden ${mobileStep === "resume" ? "hidden lg:block" : ""}`}>
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
          <Card className={`p-4 ${mobileStep !== "job" ? "hidden lg:block" : ""}`}>
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
          <Button type="button" className="h-11 w-full lg:hidden" hidden={mobileStep !== "job"} onClick={() => { setMobileStep("profile"); window.scrollTo({ top: 0 }); }}>
            Next: your profile
          </Button>
          <Card id="profile-card" className={`p-4 ${mobileStep !== "profile" ? "hidden lg:block" : ""}`}>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
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
            <div className="mb-4 flex flex-col gap-2 sm:flex-row">
              <UploadResumeDialog currentProfile={profile} onApply={handleImportProfile} />
              <Button
                variant="outline"
                className="h-auto min-h-20 flex-1 items-start justify-start gap-3 whitespace-normal p-3 text-left"
                onClick={() => setProfileOpen(true)}
              >
                <FileText className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                <span>
                  <span className="block font-semibold">Create Resume Manually</span>
                  <span className="mt-1 block text-xs font-normal text-muted-foreground">Enter your profile details manually.</span>
                </span>
              </Button>
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
          <LearningPlanPanel userId={userId} onAddToProfile={(apply) => setProfile((p) => apply(p) as Profile)} />
          <div className={mobileStep !== "profile" ? "hidden lg:block" : ""}>
          <AiInsightsPanel
            profile={profile}
            jobDescription={jd}
            onSubscriptionRequired={() => void navigate({ to: "/payment" })}
          />
          </div>
          <Button type="button" variant="outline" className="h-11 w-full lg:hidden" hidden={mobileStep !== "profile"} onClick={() => { setMobileStep("resume"); window.scrollTo({ top: 0 }); }}>
            Next: see your resume
          </Button>
        </section>

        <section className={`space-y-4 ${mobileStep !== "resume" ? "hidden lg:block print:block" : ""}`}>
          <TemplateStudio
            data={result}
            templateId={templateId}
            config={templateConfig}
            onSelect={handleSelectTemplate}
          />
          {result && (
            <Card className="p-5 print:hidden">
              {result.optimization && (
                <div className="mb-5 space-y-5 border-b border-border pb-5">
                   <h2 className="text-base font-semibold">Resume optimization complete</h2>
                   <ol className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground" aria-label="Completed optimization steps">
                     <li>✓ Role requirements compared</li><li>✓ Profile evidence verified</li><li>✓ Resume wording optimized</li><li>✓ Readability reviewed</li><li>✓ Final alignment calculated</li>
                   </ol>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <AtsScoreBadge score={result.optimization.profileFit} title="Profile ↔ JD fit" unit="%" caption="Verified background; rewriting does not change this score" />
                    <AtsScoreBadge score={result.optimization.currentAlignment} title="Current resume ↔ JD" unit="%" caption="Before optimization" />
                     {scorePending ? <div role="status" className="border border-border p-3 text-sm text-muted-foreground">Alignment score pending re-check after edits.</div> : <AtsScoreBadge score={recheckedAnalysis?.atsMatchScore ?? result.atsMatchScore ?? 0} title="Optimized resume ↔ JD" unit="%" caption={recheckedAnalysis ? "Re-checked after your edits; not an external ATS score" : "Calculated after final validation; not an external ATS score"} />}
                  </div>
                  {!scorePending && (recheckedAnalysis ?? result.ats) && <div className="space-y-2 border-l-2 border-primary pl-3 text-xs" aria-label="95 score target review">
                    <h3 className="text-sm font-semibold">ATS gap review</h3>
                    <p className="text-muted-foreground">Scores are Resume Rocket estimates, not guarantees from an employer’s ATS. Readiness includes job relevance, not just formatting. No score or legal outcome is guaranteed; review all claims before sharing.</p>
                    {([['ATS readiness', 'readiness'], ['Job match', 'match']] as const).map(([label, key]) => {
                      const analysis = recheckedAnalysis ?? result.ats;
                      if (!analysis) return null;
                      const items = explainScoreTarget(analysis)[key];
                      return <div key={key}><p className="font-medium">{label}: {(key === 'readiness' ? analysis.atsScore : analysis.atsMatchScore) >= 95 ? '95+ achieved in this estimate' : 'Below 95 — evidence or review needed'}</p>{items.length > 0 && <ul className="mt-1 list-disc space-y-1 pl-4 text-muted-foreground">{items.map((item) => <li key={item}>{item}</li>)}</ul>}</div>;
                    })}
                  </div>}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <h3 className="text-sm font-semibold">What changed?</h3>
                      <ul className="mt-2 space-y-2 text-sm">
                        {result.optimization.changes.map(({ change, why }, index) => (
                          <li key={`${change}-${index}`}><span className="font-medium">{change}</span><p className="text-xs text-muted-foreground">{why}</p></li>
                        ))}
                      </ul>
                    </div>
                    <div className="space-y-3 text-sm">
                      {([
                        ["Strong matches in the original resume", result.optimization.requirements.strong],
                        ["Originally underrepresented or qualified evidence", result.optimization.requirements.underrepresented],
                        ["Gaps in the supplied profile", result.optimization.requirements.potentialGaps],
                      ] as const).map(([label, terms]) => (
                        <div key={label}><h3 className="font-semibold">{label}</h3><p className="text-muted-foreground">{terms.length ? terms.join(", ") : "None identified"}</p></div>
                      ))}
                      {result.optimization.requirements.potentialGaps.length > 0 && <p className="text-xs text-muted-foreground">Not found in the provided profile/resume. Add only if you have real experience.</p>}
                    </div>
                  </div>
                   {result.optimization.requirements.details && <div><h3 className="text-sm font-semibold">Requirement evidence</h3><div className="mt-2 grid gap-2 sm:grid-cols-2">{result.optimization.requirements.details.map((item) => <div key={item.term} className="border-l-2 border-border pl-3 text-xs"><p className="font-semibold">{item.term} · {({ verifiedExperience: "Verified experience", verifiedSkill: "Verified skill", projectExposure: "Project-based exposure", currentlyLearning: "Currently learning", currentlyTraining: "Currently training", potentialGap: "Potential gap", notRelevant: "Not relevant" } as const)[item.status]}{item.secondary ? ` + ${item.secondary === "currentlyLearning" ? "currently learning" : "currently training"}` : ""}</p><p className="mt-1 text-muted-foreground">Evidence: {item.evidence}</p><p className="mt-1 text-muted-foreground">Resume treatment: {item.treatment}</p></div>)}</div></div>}
                  {!scorePending && <div><h3 className="text-sm font-semibold">Remaining gaps after optimization</h3>{(recheckedAnalysis ? [...explainScoreTarget(recheckedAnalysis).readiness, ...explainScoreTarget(recheckedAnalysis).match] : result.optimization.improvements).length > 0 ? <ul className="mt-1 list-disc pl-5 text-xs text-muted-foreground">{(recheckedAnalysis ? [...explainScoreTarget(recheckedAnalysis).readiness, ...explainScoreTarget(recheckedAnalysis).match] : result.optimization.improvements).map((tip, i) => <li key={i}>{tip}</li>)}</ul> : <p className="mt-1 text-xs text-muted-foreground">No additional score-gap guidance identified; verify every claim before sharing.</p>}</div>}
                   {result.optimization.learningRoadmap && result.optimization.learningRoadmap.length > 0 && <div><div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-sm font-semibold">Suggested learning path</h3><Button variant="outline" size="sm" onClick={() => void saveLearningPlan()}>Save to my learning plan</Button></div><div className="mt-2 grid gap-3 sm:grid-cols-2">{result.optimization.learningRoadmap.map((step) => <div key={step.skill} className="border-l-2 border-border pl-3 text-xs"><p className="font-semibold">{step.skill} · {step.priority} priority</p><p className="mt-1 text-muted-foreground">{step.why}</p><p className="mt-1">{step.learning}</p><p className="mt-1">{step.practice}</p></div>)}</div></div>}
                   <div className="text-xs"><h3 className="text-sm font-semibold">Readability review</h3><p className="mt-1 text-muted-foreground">{result.optimization.readability?.fixed.length ? `${result.optimization.readability.fixed.length} formatting issue(s) corrected automatically.` : "No fixable formatting issues detected."} Review the remaining items before sharing.</p>{[...auditResumeReadability(result.optimizedProfile).map((item) => item.message), ...atsWarnings(templateConfig)].length > 0 ? <ul className="mt-2 list-disc pl-5 text-muted-foreground">{[...auditResumeReadability(result.optimizedProfile).map((item) => item.message), ...atsWarnings(templateConfig)].map((item, i) => <li key={i}>{item}</li>)}</ul> : <p className="mt-1 text-muted-foreground">No detectable content or layout issues remain.</p>}</div>
                   <p className="text-xs text-muted-foreground">The job description, source profile and {currentResumeText ? "imported resume" : "current profile resume"} were compared; verified content was prioritized, readability checked and the final alignment calculated. PDF and DOCX depend on your chosen layout and should be reviewed before sharing.</p>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" onClick={() => document.getElementById("resume-print-area")?.scrollIntoView({ behavior: "smooth" })}>Review resume</Button>
                    <Button variant="outline" size="sm" onClick={() => { setProfileOpen(true); if (window.matchMedia("(min-width: 1024px)").matches) { document.getElementById("jd-heading")?.scrollIntoView({ behavior: "smooth" }); } else { setMobileStep("profile"); requestAnimationFrame(() => requestAnimationFrame(() => document.getElementById("profile-card")?.scrollIntoView({ behavior: "smooth" }))); } }}>Edit source profile</Button>
                     <Button variant="outline" size="sm" onClick={() => { setEditingResume((value) => !value); setResumeDraft(editingResume ? null : structuredClone(result.optimizedProfile)); }}>{editingResume ? "Cancel edits" : "Edit resume"}</Button>
                    <Button variant="outline" size="sm" onClick={() => setPdfConfirmationOpen(true)}>Download PDF</Button>
                    {trackedResultKey !== trackKeyRef.current || !trackKeyRef.current ? (
                      <Button variant="outline" size="sm" onClick={openTrackerDialog}>Add to tracker</Button>
                    ) : (
                      <Button asChild variant="outline" size="sm"><Link to="/tracker">View in tracker</Link></Button>
                    )}
                     <Button variant="outline" size="sm" onClick={() => void handleExportDocx()} disabled={exportingDocx}>Export DOCX</Button>
                      <Button variant="outline" size="sm" onClick={() => void handleRecheck()} disabled={checkingScore || editingResume}>{checkingScore ? "Re-checking…" : "Re-check score"}</Button>
                  </div>
                   {editingResume && resumeDraft && <div className="space-y-3 border-t border-border pt-4"><h3 className="text-sm font-semibold">Edit verified wording</h3><p className="text-xs text-muted-foreground">Edits can rephrase supplied facts only. A re-check uses one analysis allowance; scores remain from the last completed check until then.</p><label className="block text-xs font-medium">Summary<Textarea className="mt-1" value={resumeDraft.personal.summary} onChange={(event) => setResumeDraft((draft) => draft ? { ...draft, personal: { ...draft.personal, summary: event.target.value } } : draft)} /></label>{resumeDraft.experience.map((entry, i) => <div key={`${entry.title}-${entry.company}-${i}`} className="space-y-2"><p className="text-xs font-semibold">{entry.title || entry.company}</p>{entry.bullets.map((bullet, j) => <label key={j} className="block text-xs">Bullet {j + 1}<Textarea className="mt-1" value={bullet} onChange={(event) => setResumeDraft((draft) => draft ? { ...draft, experience: draft.experience.map((item, index) => index === i ? { ...item, bullets: item.bullets.map((text, bulletIndex) => bulletIndex === j ? event.target.value : text) } : item) } : draft)} /></label>)}</div>)}<Button size="sm" onClick={saveResumeDraft}>Save verified edits</Button>{auditResumeReadability(resumeDraft).length > 0 && <p className="text-xs text-muted-foreground">Review remaining missing details in your source profile before sharing.</p>}</div>}
                </div>
              )}
              {scorePending ? <p role="status" className="text-sm text-muted-foreground">ATS scores and keyword breakdown are pending re-check. Your edited resume remains available to review and export.</p> : <><div className="grid gap-4 sm:grid-cols-2">
                <AtsScoreBadge
                  score={recheckedAnalysis?.atsScore ?? result.atsScore}
                  title="ATS Score"
                  caption="Overall ATS-readiness of your resume"
                />
                {typeof (recheckedAnalysis?.atsMatchScore ?? result.atsMatchScore) === "number" && (
                  <AtsScoreBadge
                    score={recheckedAnalysis?.atsMatchScore ?? result.atsMatchScore ?? 0}
                    title="ATS Match Score"
                    unit="%"
                    caption="How closely this resume matches the job description"
                  />
                )}
              </div>
              {result.ats && (
                <div className="mt-4">
                  <AtsBreakdownPanel breakdown={recheckedAnalysis?.breakdown ?? result.ats.breakdown} matchBreakdown={recheckedAnalysis?.matchBreakdown ?? result.ats.matchBreakdown} />
                </div>
              )}
              <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <div className="mb-1 text-xs font-medium text-muted-foreground">
                    Matching Keywords ({(recheckedAnalysis?.matchedKeywords ?? result.matchingKeywords).length})
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {(recheckedAnalysis?.matchedKeywords ?? result.matchingKeywords).map((k) => (
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
                    Missing Keywords ({(recheckedAnalysis?.missingKeywords ?? result.missingKeywords).length})
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {(recheckedAnalysis?.missingKeywords ?? result.missingKeywords).map((k) => (
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
              </div></>}
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
                  <div className="overflow-x-auto rounded-lg bg-muted/40 p-2 sm:p-4">
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
      <ApplicationDetailsDialog
        open={trackOpen}
        onOpenChange={(o) => { if (!trackSaving) setTrackOpen(o); }}
        initial={trackDraft}
        title="Save Job Application Details?"
        description="Your resume is ready either way. Saving adds it to your tracker; generating a resume does not mean you've applied."
        saveLabel="Save to Tracker"
        cancelLabel="Skip for Now"
        saving={trackSaving}
        onSave={(d) => { setTrackDraft(d); void handleTrackSave(d); }}
      />
      <div className="print:hidden">
        <LandingFooter signedIn />
      </div>
    </div>
  );
}
