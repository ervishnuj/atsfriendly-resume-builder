import { ATS_MAX, MATCH_MAX, type AtsBreakdown as Breakdown, type AtsMatchBreakdown } from "@/lib/ats-scoring";

const ATS_LABELS: Record<keyof Breakdown, string> = {
  structure: "Structure",
  contact: "Contact information",
  sections: "Sections",
  keywords: "Keyword optimization",
  jobRelevance: "Job relevance",
  experience: "Experience quality",
  formatting: "Formatting",
};

const MATCH_LABELS: Record<keyof AtsMatchBreakdown, string> = {
  requiredSkills: "Required skills",
  technicalKeywords: "Technical keywords",
  responsibilities: "Responsibilities",
  experience: "Experience",
  education: "Education",
  jobTitle: "Job title",
};

function Rows({ entries }: { entries: [string, number, number][] }) {
  return (
    <ul className="space-y-1.5">
      {entries.map(([label, value, max]) => (
        <li key={label} className="text-xs">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">{label}</span>
            <span className="font-medium text-foreground">
              {value}/{max}
            </span>
          </div>
          <div className="mt-1 h-1.5 w-full rounded-full bg-muted">
            <div
              className="h-1.5 rounded-full bg-primary"
              style={{ width: `${Math.max(0, Math.min(100, (value / max) * 100))}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Transparent, deterministic score breakdown for both metrics. */
export function AtsBreakdownPanel({
  breakdown,
  matchBreakdown,
}: {
  breakdown?: Breakdown;
  matchBreakdown?: AtsMatchBreakdown;
}) {
  if (!breakdown && !matchBreakdown) return null;
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {breakdown && (
        <div>
          <div className="mb-2 text-xs font-semibold text-foreground">ATS Score breakdown</div>
          <Rows
            entries={(Object.keys(ATS_LABELS) as (keyof Breakdown)[]).map((k) => [
              ATS_LABELS[k],
              breakdown[k],
              ATS_MAX[k],
            ])}
          />
        </div>
      )}
      {matchBreakdown && (
        <div>
          <div className="mb-2 text-xs font-semibold text-foreground">ATS Match Score breakdown</div>
          <Rows
            entries={(Object.keys(MATCH_LABELS) as (keyof AtsMatchBreakdown)[]).map((k) => [
              MATCH_LABELS[k],
              matchBreakdown[k],
              MATCH_MAX[k],
            ])}
          />
        </div>
      )}
    </div>
  );
}
