/** Client-safe contract for the Job Application Tracker. */

export const APPLICATION_STATUSES = [
  "SAVED",
  "APPLIED",
  "ASSESSMENT",
  "INTERVIEW",
  "TECHNICAL_ROUND",
  "HR_ROUND",
  "OFFER",
  "REJECTED",
  "WITHDRAWN",
] as const;

export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

export const APPLICATION_STATUS_LABELS: Record<ApplicationStatus, string> = {
  SAVED: "Saved",
  APPLIED: "Applied",
  ASSESSMENT: "Assessment",
  INTERVIEW: "Interview",
  TECHNICAL_ROUND: "Technical Round",
  HR_ROUND: "HR Round",
  OFFER: "Offer",
  REJECTED: "Rejected",
  WITHDRAWN: "Withdrawn",
};

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
  notes: string;
  createdAt: string;
  updatedAt: string;
};

export type ApplicationStats = {
  total: number;
  applied: number;
  interviews: number;
  offers: number;
  rejected: number;
  responseRate: number;
};

/** Stats are derived client-side from the user's own list — no extra query. */
export function computeApplicationStats(apps: JobApplication[]): ApplicationStats {
  const total = apps.length;
  const applied = apps.filter((a) => a.status !== "SAVED").length;
  const interviews = apps.filter((a) =>
    ["INTERVIEW", "TECHNICAL_ROUND", "HR_ROUND", "OFFER"].includes(a.status),
  ).length;
  const offers = apps.filter((a) => a.status === "OFFER").length;
  const rejected = apps.filter((a) => a.status === "REJECTED").length;
  const responded = apps.filter((a) =>
    ["ASSESSMENT", "INTERVIEW", "TECHNICAL_ROUND", "HR_ROUND", "OFFER", "REJECTED"].includes(
      a.status,
    ),
  ).length;
  return {
    total,
    applied,
    interviews,
    offers,
    rejected,
    responseRate: applied > 0 ? Math.round((responded / applied) * 100) : 0,
  };
}

/** Maps a database row (snake_case) to the client DTO. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapApplicationRow(row: any): JobApplication {
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
    notes: row.notes ?? "",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
