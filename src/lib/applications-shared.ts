/** Client-safe contract for the Job Application Tracker. */

/**
 * Every status the database accepts. Legacy values (SAVED, INTERVIEW,
 * TECHNICAL_ROUND, HR_ROUND) remain valid so existing records keep working,
 * but new selectors only offer TRACKER_STATUSES.
 */
export const APPLICATION_STATUSES = [
  "RESUME_GENERATED",
  "READY_TO_APPLY",
  "APPLIED",
  "ASSESSMENT",
  "INTERVIEW_SCHEDULED",
  "INTERVIEW_COMPLETED",
  "OFFER",
  "REJECTED",
  "WITHDRAWN",
  "NO_RESPONSE",
  "SAVED",
  "INTERVIEW",
  "TECHNICAL_ROUND",
  "HR_ROUND",
] as const;

export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

/** Statuses offered in pickers, in pipeline order. */
export const TRACKER_STATUSES = [
  "RESUME_GENERATED",
  "READY_TO_APPLY",
  "APPLIED",
  "ASSESSMENT",
  "INTERVIEW_SCHEDULED",
  "INTERVIEW_COMPLETED",
  "OFFER",
  "REJECTED",
  "WITHDRAWN",
  "NO_RESPONSE",
] as const satisfies readonly ApplicationStatus[];

export const APPLICATION_STATUS_LABELS: Record<ApplicationStatus, string> = {
  RESUME_GENERATED: "Resume Generated",
  READY_TO_APPLY: "Ready to Apply",
  APPLIED: "Applied",
  ASSESSMENT: "Assessment",
  INTERVIEW_SCHEDULED: "Interview Scheduled",
  INTERVIEW_COMPLETED: "Interview Completed",
  OFFER: "Offer Received",
  REJECTED: "Rejected",
  WITHDRAWN: "Withdrawn",
  NO_RESPONSE: "No Response",
  SAVED: "Saved (not applied)",
  INTERVIEW: "Interview",
  TECHNICAL_ROUND: "Technical Round",
  HR_ROUND: "HR Round",
};

/** Statuses meaning the candidate actually submitted an application. */
export const SUBMITTED_STATUSES: readonly ApplicationStatus[] = [
  "APPLIED",
  "ASSESSMENT",
  "INTERVIEW_SCHEDULED",
  "INTERVIEW_COMPLETED",
  "INTERVIEW",
  "TECHNICAL_ROUND",
  "HR_ROUND",
  "OFFER",
  "REJECTED",
  "NO_RESPONSE",
];

const INTERVIEW_STATUSES: readonly ApplicationStatus[] = [
  "INTERVIEW_SCHEDULED",
  "INTERVIEW_COMPLETED",
  "INTERVIEW",
  "TECHNICAL_ROUND",
  "HR_ROUND",
];

export const isSubmitted = (s: ApplicationStatus) => SUBMITTED_STATUSES.includes(s);

export const APPLICATION_PLATFORMS = [
  "LINKEDIN",
  "INDEED",
  "NAUKRI",
  "CAREERS_SITE",
  "REFERRAL",
  "EMAIL",
  "WALK_IN",
  "OTHER",
  "CUSTOM",
] as const;
export type ApplicationPlatform = (typeof APPLICATION_PLATFORMS)[number];

export const PLATFORM_LABELS: Record<ApplicationPlatform, string> = {
  LINKEDIN: "LinkedIn",
  INDEED: "Indeed",
  NAUKRI: "Naukri",
  CAREERS_SITE: "Company Careers Website",
  REFERRAL: "Referral",
  EMAIL: "Email",
  WALK_IN: "Walk-in",
  OTHER: "Other",
  CUSTOM: "Custom",
};

export const needsCustomPlatform = (p: string) => p === "OTHER" || p === "CUSTOM";

/** Filter chips. "OTHER_CUSTOM" groups Other, Custom and Walk-in. */
export const PLATFORM_FILTERS = [
  "LINKEDIN",
  "INDEED",
  "NAUKRI",
  "CAREERS_SITE",
  "REFERRAL",
  "EMAIL",
  "OTHER_CUSTOM",
] as const;
export type PlatformFilter = (typeof PLATFORM_FILTERS)[number];
export const PLATFORM_FILTER_LABELS: Record<PlatformFilter, string> = {
  LINKEDIN: "LinkedIn",
  INDEED: "Indeed",
  NAUKRI: "Naukri",
  CAREERS_SITE: "Careers Website",
  REFERRAL: "Referral",
  EMAIL: "Email",
  OTHER_CUSTOM: "Other / Custom",
};

export type StatusChange = { status: ApplicationStatus; at: string };

export type JobApplication = {
  id: string;
  company: string;
  jobTitle: string;
  jobDescription: string;
  appliedAt: string | null;
  resumeVersionId: string | null;
  jobUrl: string;
  location: string;
  salary: string;
  status: ApplicationStatus;
  platform: string;
  customPlatform: string;
  statusHistory: StatusChange[];
  notes: string;
  createdAt: string;
  updatedAt: string;
};

export function platformLabel(app: Pick<JobApplication, "platform" | "customPlatform">): string {
  if (needsCustomPlatform(app.platform) && app.customPlatform.trim()) return app.customPlatform.trim();
  return PLATFORM_LABELS[app.platform as ApplicationPlatform] ?? "Not set";
}

export type ApplicationStats = {
  total: number;
  resumesGenerated: number;
  applied: number;
  interviews: number;
  offers: number;
  rejected: number;
  noResponse: number;
  responseRate: number;
};

/** Stats are derived client-side from the user's own list — no extra query. */
export function computeApplicationStats(apps: JobApplication[]): ApplicationStats {
  const submitted = apps.filter((a) => isSubmitted(a.status));
  const responded = submitted.filter((a) => a.status !== "APPLIED" && a.status !== "NO_RESPONSE");
  return {
    total: apps.length,
    resumesGenerated: apps.filter((a) => a.resumeVersionId || a.status === "RESUME_GENERATED").length,
    applied: submitted.length,
    interviews: apps.filter((a) => INTERVIEW_STATUSES.includes(a.status)).length,
    offers: apps.filter((a) => a.status === "OFFER").length,
    rejected: apps.filter((a) => a.status === "REJECTED").length,
    noResponse: apps.filter((a) => a.status === "NO_RESPONSE").length,
    responseRate: submitted.length > 0 ? Math.round((responded.length / submitted.length) * 100) : 0,
  };
}

/** Local calendar date as YYYY-MM-DD (never shifted through UTC). */
export function localDateString(d: Date = new Date()): string {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

function shiftDays(ymd: string, days: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  return localDateString(new Date(y, m - 1, d + days));
}

/** The date a record is tracked under: user-selected date, else creation day. */
export function trackedDate(app: Pick<JobApplication, "appliedAt" | "createdAt">): string {
  return app.appliedAt ?? localDateString(new Date(app.createdAt));
}

export type DateRange = "all" | "today" | "7d" | "30d" | "custom";

export type ApplicationFilters = {
  search?: string;
  platforms?: PlatformFilter[];
  statuses?: ApplicationStatus[];
  range?: DateRange;
  from?: string;
  to?: string;
  sort?: "newest" | "oldest" | "updated";
};

function matchesPlatform(app: JobApplication, filters: PlatformFilter[]): boolean {
  if (filters.length === 0) return true;
  return filters.some((f) =>
    f === "OTHER_CUSTOM"
      ? ["OTHER", "CUSTOM", "WALK_IN"].includes(app.platform)
      : app.platform === f,
  );
}

export function filterApplications(
  apps: JobApplication[],
  f: ApplicationFilters,
  today: string = localDateString(),
): JobApplication[] {
  const q = (f.search ?? "").trim().toLowerCase();
  let from: string | undefined;
  let to: string | undefined;
  if (f.range === "today") from = to = today;
  else if (f.range === "7d") (from = shiftDays(today, -6)), (to = today);
  else if (f.range === "30d") (from = shiftDays(today, -29)), (to = today);
  else if (f.range === "custom") (from = f.from || undefined), (to = f.to || undefined);

  const out = apps.filter((a) => {
    if (q && !`${a.company} ${a.jobTitle}`.toLowerCase().includes(q)) return false;
    if (!matchesPlatform(a, f.platforms ?? [])) return false;
    if (f.statuses?.length && !f.statuses.includes(a.status)) return false;
    const d = trackedDate(a);
    if (from && d < from) return false;
    if (to && d > to) return false;
    return true;
  });
  const sort = f.sort ?? "newest";
  return out.sort((a, b) => {
    if (sort === "updated") return b.updatedAt.localeCompare(a.updatedAt);
    const cmp = trackedDate(a).localeCompare(trackedDate(b)) || a.createdAt.localeCompare(b.createdAt);
    return sort === "oldest" ? cmp : -cmp;
  });
}

/** Submitted applications per month (YYYY-MM), newest month first. */
export function monthlySummary(apps: JobApplication[]): { month: string; submitted: number; total: number }[] {
  const map = new Map<string, { submitted: number; total: number }>();
  for (const a of apps) {
    const month = trackedDate(a).slice(0, 7);
    const row = map.get(month) ?? { submitted: 0, total: 0 };
    row.total += 1;
    if (isSubmitted(a.status)) row.submitted += 1;
    map.set(month, row);
  }
  return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0])).map(([month, v]) => ({ month, ...v }));
}

export function platformBreakdown(apps: JobApplication[]): { label: string; count: number }[] {
  const map = new Map<string, number>();
  for (const a of apps) {
    const label = a.platform ? platformLabel(a) : "Not set";
    map.set(label, (map.get(label) ?? 0) + 1);
  }
  return [...map.entries()].sort((a, b) => b[1] - a[1]).map(([label, count]) => ({ label, count }));
}

/** Maps a database row (snake_case) to the client DTO. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapApplicationRow(row: any): JobApplication {
  const history = Array.isArray(row.status_history) ? row.status_history : [];
  return {
    id: row.id,
    company: row.company ?? "",
    jobTitle: row.job_title ?? "",
    jobDescription: row.job_description ?? "",
    appliedAt: row.applied_at ?? null,
    resumeVersionId: row.resume_version_id ?? null,
    jobUrl: row.job_url ?? "",
    location: row.location ?? "",
    salary: row.salary ?? "",
    status: (row.status ?? "SAVED") as ApplicationStatus,
    platform: row.platform ?? "",
    customPlatform: row.custom_platform ?? "",
    statusHistory: history
      .filter((h: unknown) => h && typeof h === "object" && "status" in (h as object))
      .map((h: { status: ApplicationStatus; at: string }) => ({ status: h.status, at: h.at })),
    notes: row.notes ?? "",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
