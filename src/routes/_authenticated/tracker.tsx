import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import {
  Briefcase,
  Loader2,
  Plus,
  Trash2,
  Pencil,
  ExternalLink,
  ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createJobApplication,
  deleteJobApplication,
  listJobApplications,
  updateJobApplication,
} from "@/lib/applications.functions";
import {
  APPLICATION_STATUSES,
  APPLICATION_STATUS_LABELS,
  computeApplicationStats,
  type ApplicationStatus,
  type JobApplication,
} from "@/lib/applications-shared";
import { listResumeVersions, type ResumeVersion } from "@/lib/versions.functions";
import { track } from "@/lib/analytics-events";
import { formatDate } from "@/lib/billing-shared";
import { LandingFooter } from "@/components/landing/LandingFooter";

export const Route = createFileRoute("/_authenticated/tracker")({
  head: () => ({
    meta: [
      { title: "Job Application Tracker — Resume Rocket" },
      {
        name: "description",
        content:
          "Track every job application in one place: status, resume used, interviews, offers and response rate.",
      },
      { property: "og:title", content: "Job Application Tracker — Resume Rocket" },
      {
        property: "og:description",
        content: "Track applications from saved to offer, linked to your job-specific resumes.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TrackerPage,
});

type Draft = {
  company: string;
  jobTitle: string;
  jobDescription: string;
  appliedAt: string;
  resumeVersionId: string;
  jobUrl: string;
  location: string;
  salary: string;
  status: ApplicationStatus;
  notes: string;
};

const emptyDraft: Draft = {
  company: "",
  jobTitle: "",
  jobDescription: "",
  appliedAt: "",
  resumeVersionId: "",
  jobUrl: "",
  location: "",
  salary: "",
  status: "SAVED",
  notes: "",
};

const STATUS_TONE: Record<ApplicationStatus, string> = {
  SAVED: "bg-muted text-muted-foreground",
  APPLIED: "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-200",
  ASSESSMENT: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-200",
  INTERVIEW: "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100",
  TECHNICAL_ROUND: "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100",
  HR_ROUND: "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100",
  OFFER: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200",
  REJECTED: "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-200",
  WITHDRAWN: "bg-muted text-muted-foreground",
};

function TrackerPage() {
  const { user } = Route.useRouteContext();
  const queryClient = useQueryClient();
  const fetchApps = useServerFn(listJobApplications);
  const fetchVersions = useServerFn(listResumeVersions);
  const createApp = useServerFn(createJobApplication);
  const updateApp = useServerFn(updateJobApplication);
  const deleteApp = useServerFn(deleteJobApplication);

  const { data: apps = [], isLoading } = useQuery({
    queryKey: ["job-applications", user.id],
    queryFn: () => fetchApps(),
  });
  const { data: versions = [] } = useQuery({
    queryKey: ["resume-versions", user.id],
    queryFn: () => fetchVersions(),
  });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<JobApplication | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const stats = computeApplicationStats(apps);
  const versionLabel = (v: ResumeVersion) =>
    `${v.jobTitle || "Untitled"}${v.company ? ` @ ${v.company}` : ""} · v${v.version}`;

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["job-applications", user.id] });

  const openNew = () => {
    setEditing(null);
    setDraft(emptyDraft);
    setDialogOpen(true);
  };

  const openEdit = (app: JobApplication) => {
    setEditing(app);
    setDraft({
      company: app.company,
      jobTitle: app.jobTitle,
      jobDescription: app.jobDescription,
      appliedAt: app.appliedAt ?? "",
      resumeVersionId: app.resumeVersionId ?? "",
      jobUrl: app.jobUrl,
      location: app.location,
      salary: app.salary,
      status: app.status,
      notes: app.notes,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!draft.jobTitle.trim()) {
      toast.error("Job title is required.");
      return;
    }
    setSaving(true);
    const payload = {
      company: draft.company.trim(),
      jobTitle: draft.jobTitle.trim(),
      jobDescription: draft.jobDescription,
      appliedAt: draft.appliedAt || null,
      resumeVersionId: draft.resumeVersionId || null,
      jobUrl: draft.jobUrl.trim(),
      location: draft.location.trim(),
      salary: draft.salary.trim(),
      status: draft.status,
      notes: draft.notes,
    };
    try {
      if (editing) {
        await updateApp({ data: { id: editing.id, updates: payload } });
        toast.success("Application updated.");
      } else {
        await createApp({ data: payload });
        track("APPLICATION_CREATED", { status: payload.status });
        toast.success("Application added.");
      }
      setDialogOpen(false);
      await invalidate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save the application.");
    } finally {
      setSaving(false);
    }
  };

  const handleStatus = async (app: JobApplication, status: ApplicationStatus) => {
    if (status === app.status || busyId) return;
    setBusyId(app.id);
    try {
      await updateApp({ data: { id: app.id, updates: { status } } });
      track("APPLICATION_STATUS_UPDATED", { from: app.status, to: status });
      await invalidate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update the status.");
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (app: JobApplication) => {
    if (busyId) return;
    setBusyId(app.id);
    try {
      await deleteApp({ data: { id: app.id } });
      toast.success("Application deleted.");
      await invalidate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete the application.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b border-border bg-background">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <div className="flex items-center gap-2">
            <Briefcase className="h-5 w-5 text-primary" />
            <h1 className="text-lg font-semibold tracking-tight">Job Application Tracker</h1>
            <Link
              to="/how-it-works"
              hash="tracker"
              className="text-xs text-muted-foreground hover:text-foreground hover:underline"
            >
              Learn how to track applications →
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm" className="gap-1">
              <Link to="/dashboard">
                <ArrowLeft className="h-4 w-4" /> Dashboard
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link to="/builder">Builder</Link>
            </Button>
            <Button size="sm" className="gap-1" onClick={openNew}>
              <Plus className="h-4 w-4" /> Add Application
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:px-6">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <Stat label="Total" value={stats.total} />
          <Stat label="Applied" value={stats.applied} />
          <Stat label="Interviews" value={stats.interviews} />
          <Stat label="Offers" value={stats.offers} />
          <Stat label="Rejected" value={stats.rejected} />
          <Stat label="Response rate" value={`${stats.responseRate}%`} />
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : apps.length === 0 ? (
          <Card className="p-8 text-center">
            <Briefcase className="mx-auto h-8 w-8 text-muted-foreground" />
            <h2 className="mt-3 text-base font-semibold">No applications yet</h2>
            <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
              Track every job you apply to — link the resume version you used and follow each
              application from saved to offer.
            </p>
            <Button className="mt-4 gap-1" onClick={openNew}>
              <Plus className="h-4 w-4" /> Add your first application
            </Button>
          </Card>
        ) : (
          <ul className="space-y-3">
            {apps.map((app) => (
              <li key={app.id}>
                <Card className="p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-sm font-semibold">{app.jobTitle}</h2>
                        <Badge variant="secondary" className={STATUS_TONE[app.status]}>
                          {APPLICATION_STATUS_LABELS[app.status]}
                        </Badge>
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {app.company || "Company not set"}
                        {app.location ? ` · ${app.location}` : ""}
                        {app.salary ? ` · ${app.salary}` : ""}
                        {app.appliedAt ? ` · Applied ${formatDate(app.appliedAt)}` : ""}
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                        {app.resumeVersionId && (
                          <span>
                            Resume:{" "}
                            {(() => {
                              const v = versions.find((x) => x.id === app.resumeVersionId);
                              return v ? versionLabel(v) : "Linked version";
                            })()}
                          </span>
                        )}
                        {app.jobUrl && (
                          <a
                            href={app.jobUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-primary hover:underline"
                          >
                            Job posting <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </div>
                      {app.notes && (
                        <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">
                          {app.notes}
                        </p>
                      )}
                    </div>
                    <div className="flex shrink-0 flex-wrap items-center gap-2">
                      <Select
                        value={app.status}
                        onValueChange={(v) => void handleStatus(app, v as ApplicationStatus)}
                        disabled={busyId === app.id}
                      >
                        <SelectTrigger
                          className="h-8 w-[150px] text-xs"
                          aria-label={`Update status for ${app.jobTitle}`}
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {APPLICATION_STATUSES.map((s) => (
                            <SelectItem key={s} value={s}>
                              {APPLICATION_STATUS_LABELS[s]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        variant="ghost"
                        size="sm"
                        aria-label={`Edit ${app.jobTitle}`}
                        onClick={() => openEdit(app)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        aria-label={`Delete ${app.jobTitle}`}
                        className="text-destructive hover:text-destructive"
                        disabled={busyId === app.id}
                        onClick={() => void handleDelete(app)}
                      >
                        {busyId === app.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </main>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit application" : "Add application"}</DialogTitle>
            <DialogDescription>
              Track a job from saved to offer. Only the job title is required.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="trk-title">Job title *</Label>
              <Input
                id="trk-title"
                value={draft.jobTitle}
                onChange={(e) => setDraft((d) => ({ ...d, jobTitle: e.target.value }))}
                placeholder="Java Backend Developer"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="trk-company">Company</Label>
              <Input
                id="trk-company"
                value={draft.company}
                onChange={(e) => setDraft((d) => ({ ...d, company: e.target.value }))}
                placeholder="Acme Corp"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="trk-date">Application date</Label>
              <Input
                id="trk-date"
                type="date"
                value={draft.appliedAt}
                onChange={(e) => setDraft((d) => ({ ...d, appliedAt: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="trk-status">Status</Label>
              <Select
                value={draft.status}
                onValueChange={(v) => setDraft((d) => ({ ...d, status: v as ApplicationStatus }))}
              >
                <SelectTrigger id="trk-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {APPLICATION_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {APPLICATION_STATUS_LABELS[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="trk-location">Location</Label>
              <Input
                id="trk-location"
                value={draft.location}
                onChange={(e) => setDraft((d) => ({ ...d, location: e.target.value }))}
                placeholder="Bengaluru / Remote"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="trk-salary">Salary / CTC</Label>
              <Input
                id="trk-salary"
                value={draft.salary}
                onChange={(e) => setDraft((d) => ({ ...d, salary: e.target.value }))}
                placeholder="₹12 LPA"
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="trk-url">Job URL</Label>
              <Input
                id="trk-url"
                type="url"
                value={draft.jobUrl}
                onChange={(e) => setDraft((d) => ({ ...d, jobUrl: e.target.value }))}
                placeholder="https://..."
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="trk-resume">Resume used</Label>
              <Select
                value={draft.resumeVersionId || "none"}
                onValueChange={(v) =>
                  setDraft((d) => ({ ...d, resumeVersionId: v === "none" ? "" : v }))
                }
              >
                <SelectTrigger id="trk-resume">
                  <SelectValue placeholder="Link a generated resume (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No resume linked</SelectItem>
                  {versions.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {versionLabel(v)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="trk-jd">Job description</Label>
              <Textarea
                id="trk-jd"
                rows={4}
                value={draft.jobDescription}
                onChange={(e) => setDraft((d) => ({ ...d, jobDescription: e.target.value }))}
                placeholder="Paste the job description to reuse it for analysis and interview prep…"
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="trk-notes">Notes</Label>
              <Textarea
                id="trk-notes"
                rows={2}
                value={draft.notes}
                onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))}
                placeholder="Referral contact, interview dates, follow-ups…"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={() => void handleSave()} disabled={saving} className="gap-1">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {editing ? "Save changes" : "Add application"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <LandingFooter signedIn />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <Card className="p-3 text-center">
      <p className="text-xl font-bold">{value}</p>
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
    </Card>
  );
}
