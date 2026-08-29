import type { ReactNode } from "react";
import { Check } from "lucide-react";
import { Card } from "@/components/ui/card";
import { formatINR } from "@/lib/billing-shared";
import type { Plan } from "@/lib/billing.functions";

export function planValidityLabel(plan: Plan) {
  if (plan.planType === "ONE_TIME") return "One-time payment for one job-specific resume";
  return `Valid for ${plan.durationDays} day${plan.durationDays === 1 ? "" : "s"}`;
}

export function PricingCards({
  plans,
  renderCta,
  loading,
}: {
  plans: Plan[] | undefined;
  renderCta: (plan: Plan) => ReactNode;
  loading?: boolean;
}) {
  if (loading || !plans) {
    return <p className="text-sm text-muted-foreground">Loading plans…</p>;
  }

  return (
    <div className="grid gap-6 md:grid-cols-3">
      {plans.map((plan) => (
        <Card
          key={plan.id}
          className={`relative flex flex-col rounded-2xl p-6 shadow-soft transition-transform duration-200 hover:-translate-y-1 hover:shadow-lg ${
            plan.highlight ? "border-brand ring-2 ring-brand md:-mt-3 md:pb-9" : ""
          }`}
        >
          {plan.highlight && (
            <span className="absolute -top-3 left-6 rounded-full bg-gradient-brand px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-brand-foreground">
              Most Popular
            </span>
          )}
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">{plan.planName}</h2>
          <p className="mt-3 text-4xl font-bold tracking-tight">{formatINR(plan.price)}</p>
          <p className="mt-1 text-sm text-muted-foreground">{planValidityLabel(plan)}</p>
          <ul className="mt-5 flex-1 space-y-2.5 text-sm">
            {plan.features.map((f) => (
              <li key={f} className="flex items-start gap-2">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-brand" />
                <span>{f}</span>
              </li>
            ))}
          </ul>
          <div className="mt-6">{renderCta(plan)}</div>
        </Card>
      ))}
    </div>
  );
}
