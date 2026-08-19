import { cn } from "@/lib/utils";
import { scoreBand } from "@/lib/ats-scoring";

export function AtsScoreBadge({
  score,
  title = "ATS Score",
  caption = "Overall ATS-readiness of your resume",
  unit = "/ 100",
}: {
  score: number;
  title?: string;
  caption?: string;
  unit?: string;
}) {
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, score));
  const offset = circumference - (clamped / 100) * circumference;
  const color =
    clamped >= 90
      ? "stroke-emerald-500"
      : clamped >= 60
        ? "stroke-amber-500"
        : "stroke-rose-500";
  const label = scoreBand(clamped);

  return (
    <div className="flex items-center gap-4">
      <div className="relative h-32 w-32">
        <svg className="h-32 w-32 -rotate-90" viewBox="0 0 120 120">
          <circle
            cx="60"
            cy="60"
            r={radius}
            className="fill-none stroke-muted"
            strokeWidth="10"
          />
          <circle
            cx="60"
            cy="60"
            r={radius}
            className={cn("fill-none transition-all duration-700", color)}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold text-foreground">{clamped}</span>
          <span className="text-xs text-muted-foreground">{unit}</span>
        </div>
      </div>
      <div>
        <div className="text-sm font-medium text-muted-foreground">
          {title}
        </div>
        <div className="text-lg font-semibold text-foreground">{label}</div>
        <div className="mt-1 text-xs text-muted-foreground">{caption}</div>
      </div>
    </div>
  );
}