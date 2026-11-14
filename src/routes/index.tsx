import { createFileRoute, Link } from "@tanstack/react-router";
import { track } from "@/lib/analytics-events";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { FileDown, ShieldCheck, Zap } from "lucide-react";
import { HomeAudiences, HomeCheckerPromo, HomeFeatures, HomeHero, HomeTrust, HomeWorkflow } from "@/components/home/HomeSections";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { supabase } from "@/integrations/supabase/client";
import { listPlans } from "@/lib/billing.functions";
import { LandingHeader } from "@/components/landing/LandingHeader";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { PricingCards } from "@/components/PricingCards";

const TITLE = "AI Resume Builder | ATS-Friendly Resume Generator";
const DESCRIPTION =
  "Create an ATS-friendly resume tailored to your job description with AI. Analyze your ATS score, identify skill gaps and download your professional resume.";
const URL = "https://theresumerocket.com/";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:url", content: URL },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESCRIPTION },
      { property: "og:image", content: "https://theresumerocket.com/og-image.jpg" },
      { name: "twitter:image", content: "https://theresumerocket.com/og-image.jpg" },
    ],
    links: [{ rel: "canonical", href: URL }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "WebSite",
              name: "Resume Rocket",
              alternateName: "ATS Resume Builder",
              url: URL,
              description: DESCRIPTION,
            },
            {
              "@type": "Organization",
              name: "Resume Rocket",
              url: URL,
              logo: "https://theresumerocket.com/favicon.png",
              description: "AI-powered ATS resume optimization: tailored resumes, ATS scoring and skill-gap analysis.",
            },
          ],
        }),
      },
    ],
  }),
  component: Landing,
});

function useSignedIn() {
  const [signedIn, setSignedIn] = useState(false);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSignedIn(Boolean(data.session)));
    const { data } = supabase.auth.onAuthStateChange((_e, session) => setSignedIn(Boolean(session)));
    return () => data.subscription.unsubscribe();
  }, []);
  return signedIn;
}

function Landing() {
  const signedIn = useSignedIn();
  useEffect(() => { track("HOMEPAGE_VIEWED"); }, []);
  const buildTo = signedIn ? "/builder" : "/login";
  const pricingTo = signedIn ? "/payment" : "/login";
  const fetchPlans = useServerFn(listPlans);
  const { data: plans } = useQuery({
    queryKey: ["public-plans"],
    queryFn: () => fetchPlans(),
    retry: 3,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 5000),
    throwOnError: false,
  });

  return (
    <div id="top" className="min-h-screen bg-background">
      <LandingHeader signedIn={signedIn} />

      <HomeHero buildTo={buildTo} />
      <HomeWorkflow />
      <HomeFeatures />
      <HomeAudiences />
      <HomeCheckerPromo />

      {/* PRICING */}
      <Section id="pricing" title="Simple, Transparent Pricing" subtitle="One-time UPI payments. Nothing renews automatically.">
        <div className="mb-8 grid gap-3 text-sm sm:grid-cols-2">
          <Card className="p-5 shadow-soft">
            <p className="font-semibold">Free — no account</p>
            <p className="mt-1 text-muted-foreground">Public ATS checker with PDF/DOCX upload or pasted text.</p>
          </Card>
          <Card className="p-5 shadow-soft">
            <p className="font-semibold">Free — with an account</p>
            <p className="mt-1 text-muted-foreground">One free resume PDF and one account-based ATS analysis. Paid plans add more.</p>
          </Card>
        </div>
        <PricingCards
          plans={plans}
          renderCta={(plan) => (
            <Button
              asChild
              className={`w-full ${plan.highlight ? "bg-gradient-brand text-brand-foreground" : ""}`}
              variant={plan.highlight ? "default" : "outline"}
            >
              <Link to={pricingTo}>Pay ₹{plan.price} with UPI</Link>
            </Button>
          )}
        />
        <p className="mt-4 text-sm text-muted-foreground">
          Payments are made by UPI and activated after verification.{" "}
          <Link to="/pricing" className="text-brand hover:underline">See full plan details</Link>
        </p>
      </Section>

      <HomeTrust />

      {/* FAQ */}
      <section id="faq" className="border-y border-border bg-muted/30">
        <div className="mx-auto max-w-3xl px-5 py-16 lg:py-20">
          <h2 className="text-3xl font-bold tracking-tight">Frequently asked questions</h2>
          <Accordion type="single" collapsible className="mt-8">
            {[
              [
                "Is there an automatic recurring charge?",
                "No. Every plan is a one-time payment — ₹39 for a Single Resume, ₹149 for 7 days of access or ₹399 for 30 days. Nothing renews automatically.",
              ],
              [
                "Will my resume be ATS-friendly?",
                "Our templates use clean, structured formatting designed for ATS readability. ATS results can vary depending on the employer's system and the specific job description.",
              ],
              [
                "Can I edit my resume after generating it?",
                "Yes. You can update your profile and generate a new resume for another job description.",
              ],
              [
                "Can I download my resume as PDF?",
                "Yes. Generated resumes can be exported as professionally formatted PDF files.",
              ],
              [
                "Can I identify missing skills?",
                "Yes. The Skill Gap Analyzer compares your profile against the job description and highlights skills you already have and areas you may need to improve.",
              ],
              [
                "Is ATS analysis free?",
                "Yes. The public ATS checker is free with no sign-up required: upload a PDF or DOCX resume, or paste its text, and add a job description. Account-based AI analysis has separate allowances: every account includes one free ATS analysis, and additional account-based analyses require an applicable paid plan.",
              ],
              [
                "How many AI resumes can I generate?",
                "Free users receive one free resume PDF. The Single Resume plan includes one AI-generated resume. The 7-Day and 30-Day plans include up to 5 new AI resume generations per day.",
              ],
              [
                "How many account-based ATS analyses are included?",
                "Free users receive one account-based ATS analysis. The 7-Day Job Pass includes up to 5 ATS analyses per day, while the 30-Day Pro Pass includes up to 10 ATS analyses per day. These allowances are separate from the free, no-sign-up public ATS checker.",
              ],
              [
                "Does a higher ATS score guarantee an interview?",
                "No. ATS analysis is a guidance tool that helps identify potential keyword, skill and formatting gaps. No score can guarantee an interview or job.",
              ],
              [
                "Does the AI invent skills?",
                "No. The product is designed to work from the candidate's actual profile and experience. Missing skills should be reported rather than fabricated.",
              ],
            ].map(([q, a], i) => (
              <AccordionItem key={q} value={`item-${i}`}>
                <AccordionTrigger className="text-left text-base font-medium">{q}</AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">{a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="mx-auto max-w-6xl px-5 py-16 lg:py-20">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-brand px-8 py-14 text-center text-brand-foreground shadow-glow">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Your Next Job Application Starts Here.</h2>
          <p className="mx-auto mt-4 max-w-xl text-brand-foreground/85">
            Build a professional, ATS-friendly resume tailored to the role you're targeting.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Button asChild size="lg" variant="secondary">
              <Link to={buildTo}>Build My Resume</Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-brand-foreground/40 bg-transparent text-brand-foreground hover:bg-brand-foreground/10 hover:text-brand-foreground"
            >
              <Link to="/ats-checker">Check My Resume Free</Link>
            </Button>
          </div>
          <div className="mt-8 flex flex-wrap justify-center gap-x-6 gap-y-2 text-xs text-brand-foreground/80">
            <span className="flex items-center gap-1.5">
              <Zap className="h-3.5 w-3.5" /> Instant PDF download
            </span>
            <span className="flex items-center gap-1.5">
              <FileDown className="h-3.5 w-3.5" /> ATS-friendly template
            </span>
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5" /> Secure UPI payments
            </span>
          </div>
        </div>
      </section>

      <LandingFooter signedIn={signedIn} />
    </div>
  );
}

function Section({
  id,
  title,
  subtitle,
  children,
}: {
  id?: string;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="mx-auto max-w-6xl px-5 py-16 lg:py-20">
      <h2 className="text-3xl font-bold tracking-tight">{title}</h2>
      {subtitle && <p className="mt-3 max-w-2xl text-muted-foreground">{subtitle}</p>}
      <div className="mt-10">{children}</div>
    </section>
  );
}
