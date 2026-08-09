import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Check, Crown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { listPlans, getCurrentSubscription } from "@/lib/billing.functions";
import { formatINR } from "@/lib/billing-shared";

export const Route = createFileRoute("/_authenticated/payment/")({
  head: () => ({
    meta: [
      { title: "Plans & Pricing — ATS Resume Builder" },
      {
        name: "description",
        content: "Choose a daily, monthly or yearly plan to unlock AI resume generation and PDF downloads.",
      },
      { property: "og:title", content: "Plans & Pricing — ATS Resume Builder" },
      {
        property: "og:description",
        content: "Daily, monthly and yearly subscription plans for the ATS Resume Builder.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PlansPage,
});

function PlansPage() {
  const { user } = Route.useRouteContext();
  const fetchPlans = useServerFn(listPlans);
  const fetchSub = useServerFn(getCurrentSubscription);
  const { data: plans, isLoading } = useQuery({ queryKey: ["plans"], queryFn: () => fetchPlans() });
  const { data: subscription } = useQuery({
    queryKey: ["subscription", user.id],
    queryFn: () => fetchSub(),
  });

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b border-border bg-background">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <h1 className="text-lg font-semibold tracking-tight">Choose your plan</h1>
          <div className="flex gap-2">
            <Button asChild variant="ghost">
              <Link to="/subscription">My subscription</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/builder">Back to builder</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-10">
        {subscription?.active && (
          <Badge className="mb-6 gap-1 bg-emerald-100 text-emerald-800 hover:bg-emerald-100">
            <Crown className="h-3.5 w-3.5" /> {subscription.planName} active · renews/expires in{" "}
            {subscription.daysRemaining} days
          </Badge>
        )}
        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-3">
            {(plans ?? []).map((plan) => (
              <Card key={plan.id} className="flex flex-col p-6">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  {plan.planName}
                </h2>
                <p className="mt-3 text-3xl font-semibold">{formatINR(plan.price)}</p>
                <p className="text-sm text-muted-foreground">
                  for {plan.durationDays} day{plan.durationDays > 1 ? "s" : ""}
                </p>
                <ul className="mt-5 space-y-2 text-sm">
                  {["Unlimited ATS resume generation", "PDF download", "Keyword match analysis"].map(
                    (feature) => (
                      <li key={feature} className="flex items-start gap-2">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                        <span>{feature}</span>
                      </li>
                    ),
                  )}
                </ul>
                {plan.description && (
                  <p className="mt-4 text-sm text-muted-foreground">{plan.description}</p>
                )}
                <Button asChild className="mt-6">
                  <Link to="/payment/checkout/$planId" params={{ planId: plan.id }}>
                    Pay with UPI
                  </Link>
                </Button>
              </Card>
            ))}
          </div>
        )}
        <p className="mt-8 text-sm text-muted-foreground">
          Payments are made over UPI and verified by our team, usually within a few hours. You will
          see the status of every payment on your subscription page.
        </p>
      </main>
    </div>
  );
}