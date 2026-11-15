import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function PageHeading({ eyebrow, title, description, actions }: { eyebrow?: string; title: string; description?: string; actions?: ReactNode }) {
  return <div className="flex flex-wrap items-end justify-between gap-5 border-b border-border pb-7">
    <div className="min-w-0 max-w-2xl">{eyebrow && <p className="mb-2 text-xs font-semibold uppercase text-primary">{eyebrow}</p>}<h1 className="text-3xl font-semibold leading-tight sm:text-4xl">{title}</h1>{description && <p className="mt-3 leading-relaxed text-muted-foreground">{description}</p>}</div>
    {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
  </div>;
}

export function MetricCard({ icon: Icon, label, value, detail, tone = "primary" }: { icon: LucideIcon; label: string; value: ReactNode; detail?: string; tone?: "primary" | "ai" | "success" }) {
  return <Card className="min-w-0 p-5"><div className="flex items-start justify-between gap-3"><p className="text-sm font-medium text-muted-foreground">{label}</p><span className={`grid h-9 w-9 shrink-0 place-items-center rounded-md ${tone === "ai" ? "bg-ai-soft text-ai" : tone === "success" ? "bg-success-soft text-success-foreground" : "bg-accent text-primary"}`}><Icon className="h-4 w-4" /></span></div><p className="mt-4 break-words text-3xl font-semibold tabular-nums">{value}</p>{detail && <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{detail}</p>}</Card>;
}

export function EmptyState({ icon: Icon, title, description, actions }: { icon: LucideIcon; title: string; description: string; actions?: ReactNode }) {
  return <div className="flex flex-col items-center px-4 py-12 text-center"><span className="grid h-12 w-12 place-items-center rounded-lg bg-accent text-primary"><Icon className="h-6 w-6" /></span><h2 className="mt-4 text-lg font-semibold">{title}</h2><p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">{description}</p>{actions && <div className="mt-5 flex flex-wrap justify-center gap-2">{actions}</div>}</div>;
}

export function StatusBadge({ status, children }: { status: string; children: ReactNode }) {
  const variant = ["SUCCESS", "OFFER_RECEIVED", "OFFER", "RESOLVED"].includes(status) ? "success" : ["FAILED", "REJECTED"].includes(status) ? "destructive" : ["PENDING", "ASSESSMENT", "NO_RESPONSE"].includes(status) ? "warning" : ["INTERVIEW_SCHEDULED", "INTERVIEW_COMPLETED"].includes(status) ? "ai" : "secondary";
  return <Badge variant={variant}>{children}</Badge>;
}