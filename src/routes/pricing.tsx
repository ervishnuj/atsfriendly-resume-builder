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
  "Simple, one-time pricing for job-specific resume optimization: ₹39 to analyze, optimize and tailor your resume for one job, ₹149 for a 7-Day Job Pass, or ₹399 for a 30-Day Pro Pass. Match your resume with a Job Description, identify skill gaps, and download your tailored resume as PDF or DOCX.";
const PAGE_URL = "https://theresumerocket.com/pricing";

const PLAN_MARKUP = [
  {
    name: "Job-Specific Resume",
    description: "Analyze, optimize, and tailor your resume for one specific job opportunity.",
    price: "39",
  },
  {
    name: "7-Day Job Pass",
    description: "Tailor your resume for multiple jobs with AI analysis and up to 5 generations per day.",
    price: "149",
  },
  {
    name: "30-Day Pro Pass",
    description:
      "Everything you need for an active job search with AI resume optimization, unlimited edits, and downloads.",
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

        <h2 className="mt-12 text-xl font-semibold tracking-tight">Choose the plan that fits your job search</h2>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Every plan includes AI-optimized resumes tailored to the job description you paste in.
        </p>
        <p className="mt-4 max-w-3xl rounded-lg border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
          <strong className="font-semibold text-foreground">AI Usage Limits:</strong> Every account includes 1 free ATS
          analysis and 1 free resume PDF. Paid plans include daily AI resume generation and ATS analysis limits to keep
          the service reliable and affordable. Manual edits to existing resumes do not consume an AI generation.
        </p>
        <div className="mt-6">
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
