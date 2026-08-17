import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import type { PaymentGateStatus } from "@/lib/billing-shared";
import { Check, Crown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PricingCards } from "@/components/PricingCards";
import { PaymentGateBanner } from "@/components/PaymentGateBanner";
import { readPaymentGate, clearPaymentGate } from "@/lib/payment-gate-state";
import { listPlans, getCurrentSubscription } from "@/lib/billing.functions";

export const Route = createFileRoute("/_authenticated/payment/")({
  head: () => ({
    meta: [
      { title: "Plans & Pricing — ATS Resume Builder" },
      {
        name: "description",
        content:
          "Choose the ₹29 Single Resume, ₹99 7-Day Job Pass or ₹249 30-Day Pro Pass to unlock AI resume generation and PDF downloads.",
      },
      { property: "og:title", content: "Plans & Pricing — ATS Resume Builder" },
      {
        property: "og:description",
        content: "One-time and time-based plans for the ATS Resume Builder, paid over UPI.",
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
  const isAdmin = subscription?.admin === true;
  const [gateStatus, setGateStatus] = useState<PaymentGateStatus | null>(null);

  // Keep the reason the user landed here visible across the redirect/reload.
  useEffect(() => {
    setGateStatus(readPaymentGate(user.id)?.status ?? null);
  }, [user.id]);

  useEffect(() => {
    if (subscription?.active === true) {
      clearPaymentGate(user.id);
      setGateStatus(null);
    } else if (subscription && subscription.active === false) {
      setGateStatus(subscription.paymentStatus ?? "NO_PAYMENT");
    }
  }, [subscription, user.id]);

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
        {!isAdmin && !subscription?.active && gateStatus && (
          <PaymentGateBanner status={gateStatus} className="mb-6" />
        )}
        {isAdmin && (
          <Card className="mb-6 border-amber-300/60 bg-amber-50 p-6 dark:bg-amber-950/20">
            <Badge className="gap-1 bg-amber-100 text-amber-900 hover:bg-amber-100">
              <Crown className="h-3.5 w-3.5" /> Admin account
            </Badge>
            <h2 className="mt-3 text-xl font-semibold">
              You have unlimited free access to all Resume Builder features.
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              No subscription is required. The plans below are what regular users see.
            </p>
            <Button asChild className="mt-4">
              <Link to="/builder">Go to builder</Link>
            </Button>
          </Card>
        )}
        {!isAdmin && subscription?.active && (
          <Badge className="mb-6 gap-1 bg-emerald-100 text-emerald-800 hover:bg-emerald-100">
            <Crown className="h-3.5 w-3.5" /> {subscription.planName} active ·{" "}
            {subscription.creditsRemaining !== null
              ? `${subscription.creditsRemaining} PDF download left`
              : `expires in ${subscription.daysRemaining} days`}
          </Badge>
        )}
        {isAdmin && (
          <p className="mb-4 text-sm font-medium text-muted-foreground">Plans for regular users</p>
        )}
        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <PricingCards
            plans={plans}
            renderCta={(plan) =>
              isAdmin ? (
                <Button className="w-full gap-1" variant="outline" disabled>
                  <Check className="h-4 w-4" /> Unlimited Access
                </Button>
              ) : (
                <Button
                  asChild
                  className={`w-full ${plan.highlight ? "bg-gradient-brand text-brand-foreground" : ""}`}
                  variant={plan.highlight ? "default" : "outline"}
                >
                  <Link to="/payment/checkout/$planId" params={{ planId: plan.id }}>
                    Pay ₹{plan.price} with UPI
                  </Link>
                </Button>
              )
            }
          />
        )}
        <p className="mt-8 text-sm text-muted-foreground">
          Payments are made over UPI. Submit your UTR reference after paying — your plan is
          activated once the payment is verified, and every payment status is shown on your
          subscription page.
        </p>
      </main>
    </div>
  );
}