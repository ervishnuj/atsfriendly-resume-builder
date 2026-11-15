import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Briefcase,
  Loader2,
  Plus,
  Trash2,
  Pencil,
  ExternalLink,
  ArrowLeft,
  CheckCircle2,
  FileText,
  Search,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
import {
  createJobApplication,
  deleteJobApplication,
  listJobApplications,
  updateJobApplication,
} from "@/lib/applications.functions";
import {
  APPLICATION_STATUS_LABELS,
  PLATFORM_FILTERS,
  PLATFORM_FILTER_LABELS,
  TRACKER_STATUSES,
  computeApplicationStats,
  filterApplications,
  isSubmitted,
  monthlySummary,
  platformBreakdown,
  platformLabel,
  trackedDate,
  type ApplicationStatus,
  type DateRange,
  type JobApplication,
  type PlatformFilter,
} from "@/lib/applications-shared";
import { listResumeVersions, type ResumeVersion } from "@/lib/versions.functions";
import { track } from "@/lib/analytics-events";
import { formatDate } from "@/lib/billing-shared";
import { PageHeading, StatusBadge } from "@/components/ui/page-patterns";
import { LandingFooter } from "@/components/landing/LandingFooter";
import {
  ApplicationDetailsDialog,
  blankApplicationDraft,
  type ApplicationDraft,
} from "@/components/ApplicationDetailsDialog";

export const Route = createFileRoute("/_authenticated/tracker")({
  head: () => ({
    meta: [
      { title: "Job Application Tracker — Resume Rocket" },
      {
        name: "description",
        content:
          "Track every job application in one place: platform, status, resume used, interviews, offers and responses.",
      },
      { property: "og:title", content: "Job Application Tracker — Resume Rocket" },
      {
        property: "og:description",
        content: "Track applications from resume generated to offer, linked to your job-specific resumes.",
      },
      { property: "og:type", content: "website" },
      { name: "robots", content: "noindex" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TrackerPage,
});

function toDraft(app: JobApplication): ApplicationDraft {
  return {
    company: app.company,
    jobTitle: app.jobTitle,
    appliedAt: trackedDate(app),
    platform: (app.platform as ApplicationDraft["platform"]) || "",
    customPlatform: app.customPlatform,
    jobDescription: app.jobDescription,
    jobUrl: app.jobUrl,
    status: app.status,
    notes: app.notes,
    location: app.location,
    salary: app.salary,
    resumeVersionId: app.resumeVersionId ?? "",
  };
}

function TrackerPage() {
  const { user } = Route.useRouteContext();
  const queryClient = useQueryClient();
  const fetchApps = useServerFn(listJobApplications);
  const fetchVersions = useServerFn(listResumeVersions);
  const createApp = useServerFn(createJobApplication);
  const updateApp = useServerFn(updateJobApplication);
  const deleteApp = useServerFn(deleteJobApplication);

  const { data: apps = [], isLoading, isError, refetch } = useQuery({
    queryKey: ["job-applications", user.id],
    queryFn: () => fetchApps(),
  });
  const { data: versions = [] } = useQuery({
    queryKey: ["resume-versions", user.id],
    queryFn: () => fetchVersions(),
  });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<JobApplication | null>(null);
  const [initialDraft, setInitialDraft] = useState<ApplicationDraft>(blankApplicationDraft());
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<JobApplication | null>(null);
  const [requestId, setRequestId] = useState(() => crypto.randomUUID());

  const [search, setSearch] = useState("");
  const [platforms, setPlatforms] = useState<PlatformFilter[]>([]);
  const [statusFilter, setStatusFilter] = useState<ApplicationStatus | "all">("all");
  const [range, setRange] = useState<DateRange>("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [sort, setSort] = useState<"newest" | "oldest" | "updated">("newest");

  const stats = computeApplicationStats(apps);
  const visible = useMemo(
    () =>
      filterApplications(apps, {
        search,
        platforms,
        statuses: statusFilter === "all" ? [] : [statusFilter],
        range,
        from,
        to,
        sort,
      }),
    [apps, search, platforms, statusFilter, range, from, to, sort],
  );
  const months = monthlySummary(apps).slice(0, 6);
  const byPlatform = platformBreakdown(apps);
  const filtersActive = search || platforms.length || statusFilter !== "all" || range !== "all";

  const versionLabel = (v: ResumeVersion) =>
    `${v.jobTitle || "Untitled"}${v.company ? ` @ ${v.company}` : ""} · v${v.version}`;

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["job-applications", user.id] });

  const openNew = () => {
    setEditing(null);
    setInitialDraft({ ...blankApplicationDraft(), status: "APPLIED" });
    setRequestId(crypto.randomUUID());
    setDialogOpen(true);
  };

  const openEdit = (app: JobApplication) => {
    setEditing(app);
    setInitialDraft(toDraft(app));
    setDialogOpen(true);
  };

  const handleSave = async (draft: ApplicationDraft) => {
    if (saving) return;
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
      platform: draft.platform,
      customPlatform: draft.customPlatform.trim(),
      status: draft.status,
      notes: draft.notes,
    };
    try {
      if (editing) {
        await updateApp({ data: { id: editing.id, updates: payload } });
        toast.success("Application updated.");
      } else {
        await createApp({ data: { ...payload, clientRequestId: requestId } });
        track("APPLICATION_CREATED", { status: payload.status });
        toast.success("Application added.");
      }
      setDialogOpen(false);
      await invalidate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save the application. Please try again.");
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
      toast.success(`Status changed to ${APPLICATION_STATUS_LABELS[status]}.`);
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
      setConfirmDelete(null);
    }
  };

  const togglePlatform = (p: PlatformFilter) =>
    setPlatforms((cur) => (cur.includes(p) ? cur.filter((x) => x !== p) : [...cur, p]));

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b border-border bg-background">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <Briefcase className="h-5 w-5 text-primary" />
            <h1 className="text-lg font-semibold tracking-tight">Job Application Tracker</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button asChild variant="ghost" size="sm" className="min-h-11 gap-1 sm:min-h-0">
              <Link to="/dashboard">
                <ArrowLeft className="h-4 w-4" /> Dashboard
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="min-h-11 sm:min-h-0">
              <Link to="/builder">Builder</Link>
            </Button>
            <Button size="sm" className="min-h-11 gap-1 sm:min-h-0" onClick={openNew}>
              <Plus className="h-4 w-4" /> Add Application
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:px-6">
        <PageHeading eyebrow="Your job search" title="Every application. One place." description="Follow your applications from a tailored resume to the next interview." />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
          <Stat label="Total" value={stats.total} />
          <Stat label="Resumes generated" value={stats.resumesGenerated} />
          <Stat label="Applied" value={stats.applied} />
          <Stat label="Interviews" value={stats.interviews} />
          <Stat label="Offers" value={stats.offers} />
          <Stat label="Rejected" value={stats.rejected} />
          <Stat label="No response" value={stats.noResponse} />
        </div>
        <p className="-mt-3 text-xs text-muted-foreground">
          "Applied" counts only entries marked Applied or a later stage — a generated resume alone is not counted as an application.
        </p>

        {apps.length > 0 && (
          <div className="grid gap-3 md:grid-cols-2">
            <Card className="p-4">
              <h2 className="text-sm font-semibold">Monthly summary</h2>
              <ul className="mt-2 space-y-1 text-sm">
                {months.map((m) => (
                  <li key={m.month} className="flex justify-between gap-2">
                    <span>{new Date(`${m.month}-01T00:00:00`).toLocaleDateString(undefined, { month: "long", year: "numeric" })}</span>
                    <span className="text-muted-foreground">{m.submitted} applied · {m.total} tracked</span>
                  </li>
                ))}
              </ul>
            </Card>
            <Card className="p-4">
              <h2 className="text-sm font-semibold">By platform</h2>
              <ul className="mt-2 space-y-1 text-sm">
                {byPlatform.map((p) => (
                  <li key={p.label} className="flex justify-between gap-2">
                    <span className="truncate">{p.label}</span>
                    <span className="text-muted-foreground">{p.count}</span>
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        )}

        {apps.length > 0 && (
          <Card className="space-y-3 p-4">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                aria-label="Search by company or job role"
                className="h-11 pl-9 sm:h-10"
                placeholder="Search company or job role"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by platform">
              {PLATFORM_FILTERS.map((p) => {
                const on = platforms.includes(p);
                return (
                  <Button
                    key={p}
                    type="button"
                    size="sm"
                    variant={on ? "default" : "outline"}
                    aria-pressed={on}
                    className="min-h-11 rounded-full sm:min-h-0"
                    onClick={() => togglePlatform(p)}
                  >
                    {PLATFORM_FILTER_LABELS[p]}
                  </Button>
                );
              })}
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1">
                <Label htmlFor="flt-range" className="text-xs">Application date</Label>
                <Select value={range} onValueChange={(v) => setRange(v as DateRange)}>
                  <SelectTrigger id="flt-range" className="h-11 sm:h-10"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Any date</SelectItem>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="7d">Last 7 days</SelectItem>
                    <SelectItem value="30d">Last 30 days</SelectItem>
                    <SelectItem value="custom">Custom range</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="flt-status" className="text-xs">Status</Label>
                <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as ApplicationStatus | "all")}>
                  <SelectTrigger id="flt-status" className="h-11 sm:h-10"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    {TRACKER_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>{APPLICATION_STATUS_LABELS[s]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="flt-sort" className="text-xs">Sort</Label>
                <Select value={sort} onValueChange={(v) => setSort(v as typeof sort)}>
                  <SelectTrigger id="flt-sort" className="h-11 sm:h-10"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">Newest application date</SelectItem>
                    <SelectItem value="oldest">Oldest application date</SelectItem>
                    <SelectItem value="updated">Recently updated</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {range === "custom" && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="flt-from" className="text-xs">From</Label>
                  <Input id="flt-from" type="date" className="h-11 sm:h-10" value={from} onChange={(e) => setFrom(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="flt-to" className="text-xs">To</Label>
                  <Input id="flt-to" type="date" className="h-11 sm:h-10" value={to} onChange={(e) => setTo(e.target.value)} />
                </div>
              </div>
            )}
          </Card>
        )}

        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : isError ? (
          <Card className="p-8 text-center">
            <p className="text-sm text-muted-foreground">Your applications couldn't be loaded.</p>
            <Button className="mt-3" variant="outline" onClick={() => void refetch()}>Try again</Button>
          </Card>
        ) : apps.length === 0 ? (
          <Card className="p-8 text-center">
            <Briefcase className="mx-auto h-8 w-8 text-muted-foreground" />
            <h2 className="mt-3 text-base font-semibold">No applications yet</h2>
            <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
              Generate a job-specific resume and save the job details, or add an application you made elsewhere. Mark it Applied once you actually submit it.
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <Button asChild className="min-h-11 gap-1">
                <Link to="/builder"><Sparkles className="h-4 w-4" /> Generate Resume and Track Application</Link>
              </Button>
              <Button variant="outline" className="min-h-11 gap-1" onClick={openNew}>
                <Plus className="h-4 w-4" /> Add manually
              </Button>
            </div>
          </Card>
        ) : visible.length === 0 ? (
          <Card className="p-8 text-center text-sm text-muted-foreground">
            No applications match these filters.
            {filtersActive && (
              <Button variant="link" onClick={() => { setSearch(""); setPlatforms([]); setStatusFilter("all"); setRange("all"); }}>Clear filters</Button>
            )}
          </Card>
        ) : (
          <ul className="space-y-3" aria-label="Applications">
            {visible.map((app) => {
              const version = app.resumeVersionId ? versions.find((x) => x.id === app.resumeVersionId) : undefined;
              return (
                <li key={app.id} data-testid="application-row">
                  <Card className="p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="text-sm font-semibold">{app.jobTitle}</h2>
                          <StatusBadge status={app.status}>
                            {APPLICATION_STATUS_LABELS[app.status]}
                          </StatusBadge>
                        </div>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {app.company || "Company not set"} · {platformLabel(app)} · {formatDate(trackedDate(app))}
                          {app.location ? ` · ${app.location}` : ""}
                        </p>
                        <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                          {app.resumeVersionId && (
                            <Link
                              to="/builder"
                              search={{ version: app.resumeVersionId }}
                              className="inline-flex min-h-8 items-center gap-1 text-primary hover:underline"
                            >
                              <FileText className="h-3 w-3" />
                              {version ? versionLabel(version) : "Linked resume"}
                            </Link>
                          )}
                          {app.jobUrl && (
                            <a href={app.jobUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-8 items-center gap-1 text-primary hover:underline">
                              Job posting <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                          <span>Updated {formatDate(app.updatedAt)}</span>
                        </div>
                        {app.statusHistory.length > 0 && (
                          <ol className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground" aria-label="Status timeline">
                            {app.statusHistory.map((h, i) => (
                              <li key={`${h.status}-${i}`}>
                                {i > 0 && "→ "}
                                {APPLICATION_STATUS_LABELS[h.status] ?? h.status} ({formatDate(h.at)})
                              </li>
                            ))}
                          </ol>
                        )}
                        {app.notes && <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{app.notes}</p>}
                      </div>
                      <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:shrink-0">
                        {!isSubmitted(app.status) && app.status !== "WITHDRAWN" && (
                          <Button size="sm" className="min-h-11 gap-1 sm:min-h-0" disabled={busyId === app.id} onClick={() => void handleStatus(app, "APPLIED")}>
                            <CheckCircle2 className="h-4 w-4" /> Mark as Applied
                          </Button>
                        )}
                        <Select value={app.status} onValueChange={(v) => void handleStatus(app, v as ApplicationStatus)} disabled={busyId === app.id}>
                          <SelectTrigger className="h-11 w-[170px] text-xs sm:h-8" aria-label={`Update status for ${app.jobTitle}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {(TRACKER_STATUSES as readonly ApplicationStatus[]).concat(TRACKER_STATUSES.includes(app.status as never) ? [] : [app.status]).map((s) => (
                              <SelectItem key={s} value={s}>{APPLICATION_STATUS_LABELS[s]}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button variant="ghost" size="sm" className="min-h-11 sm:min-h-0" aria-label={`Edit ${app.jobTitle}`} onClick={() => openEdit(app)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" aria-label={`Delete ${app.jobTitle}`} className="min-h-11 text-destructive hover:text-destructive sm:min-h-0" disabled={busyId === app.id} onClick={() => setConfirmDelete(app)}>
                          {busyId === app.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                  </Card>
                </li>
              );
            })}
          </ul>
        )}
      </main>

      <ApplicationDetailsDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        initial={initialDraft}
        title={editing ? "Edit application" : "Add application"}
        description="Company, role and date are required. Mark it Applied only after you submit it."
        saveLabel={editing ? "Save changes" : "Add application"}
        cancelLabel="Cancel"
        saving={saving}
        onSave={(d) => void handleSave(d)}
        showLocationSalary
        extra={(draft, set) => (
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="app-resume">Resume used</Label>
            <Select value={draft.resumeVersionId || "none"} onValueChange={(v) => set({ resumeVersionId: v === "none" ? "" : v })}>
              <SelectTrigger id="app-resume" className="h-11 sm:h-10"><SelectValue placeholder="Link a generated resume (optional)" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No resume linked</SelectItem>
                {versions.map((v) => (
                  <SelectItem key={v.id} value={v.id}>{versionLabel(v)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      />

      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this application?</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDelete ? `${confirmDelete.jobTitle} at ${confirmDelete.company || "this company"}` : ""} will be removed from your tracker. The linked resume version is kept.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => confirmDelete && void handleDelete(confirmDelete)}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <LandingFooter signedIn />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <Card className="p-3 text-center">
      <p className="text-xl font-bold">{value}</p>
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
    </Card>
  );
}
