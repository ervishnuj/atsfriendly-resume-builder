import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { PricingCards } from "@/components/PricingCards";
import { LandingHeader } from "@/components/landing/LandingHeader";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { listPlans } from "@/lib/billing.functions";
import { supabase } from "@/integrations/supabase/client";

const TITLE = "Pricing | AI Resume Builder";
const DESCRIPTION =
  "Simple pricing for ATS-friendly resumes: ₹29 for a single resume PDF, ₹99 for a 7-Day Job Pass or ₹249 for a 30-Day Pro Pass. Pay securely over UPI.";
const PAGE_URL = "https://theresumerocket.com/pricing";

const PLAN_MARKUP = [
  {
    name: "Single Resume",
    description: "One AI-generated, ATS-optimized resume with PDF download..",
    price: "39",
  },
  {
    name: "7-Day Job Pass",
    description: "Up to 10 new AI resumes per day, unlimited edits and downloads for 7 days.",
    price: "149",
  },
  {
    name: "30-Day Pro Pass",
    description: "Up to 5 new AI resumes per day, unlimited edits and downloads for 30 days.",
    price: "399",
  },
];

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:url", content: PAGE_URL },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: PAGE_URL }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@graph": PLAN_MARKUP.map((plan) => ({
            "@type": "Product",
            name: plan.name,
            description: plan.description,
            brand: { "@type": "Brand", name: "Resume Rocket" },
            offers: {
              "@type": "Offer",
              price: plan.price,
              priceCurrency: "INR",
              availability: "https://schema.org/InStock",
              url: PAGE_URL,
            },
          })),
        }),
      },
    ],
  }),
  component: PricingPage,
});

function PricingPage() {
  const [signedIn, setSignedIn] = useState(false);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSignedIn(Boolean(data.session)));
    const { data } = supabase.auth.onAuthStateChange((_e, session) => setSignedIn(Boolean(session)));
    return () => data.subscription.unsubscribe();
  }, []);

  const fetchPlans = useServerFn(listPlans);
  const { data: plans, isLoading } = useQuery({
    queryKey: ["public-plans"],
    queryFn: () => fetchPlans(),
    retry: 3,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 5000),
    throwOnError: false,
  });

  return (
    <div className="min-h-screen bg-background">
      <LandingHeader signedIn={signedIn} />
      <main className="mx-auto max-w-6xl px-5 py-16 lg:py-20">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Simple, Transparent Pricing</h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          Pay only for what you need. No auto-renewals, no hidden charges — secure UPI payments in Indian Rupees.
        </p>
        <p className="mt-4 max-w-3xl rounded-lg border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
          <strong className="font-semibold text-foreground">AI Generation Limit:</strong> Each account can generate up
          to 10 new AI resumes per day. Existing resumes can be edited and downloaded according to your plan. Every new
          account also includes one free resume PDF download.
        </p>
        <div className="mt-12">
          <PricingCards
            plans={plans}
            loading={isLoading}
            renderCta={(plan) => (
              <Button
                asChild
                className={`w-full ${plan.highlight ? "bg-gradient-brand text-brand-foreground" : ""}`}
                variant={plan.highlight ? "default" : "outline"}
              >
                {signedIn ? (
                  <Link to="/payment/checkout/$planId" params={{ planId: plan.id }}>
                    Pay ₹{plan.price} with UPI
                  </Link>
                ) : (
                  <Link to="/login">Pay ₹{plan.price} with UPI</Link>
                )}
              </Button>
            )}
          />
        </div>
      </main>
      <LandingFooter signedIn={signedIn} />
    </div>
  );
}
