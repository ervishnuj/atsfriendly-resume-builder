import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowRight,
  Check,
  CheckCircle2,
  FileDown,
  Gauge,
  Layers,
  Lock,
  QrCode,
  ShieldCheck,
  Sparkles,
  Target,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { supabase } from "@/integrations/supabase/client";
import { listPlans } from "@/lib/billing.functions";
import { LandingHeader } from "@/components/landing/LandingHeader";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { HeroResumeCard } from "@/components/landing/HeroResumeCard";
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

      {/* HERO */}
      <section className="bg-hero-glow">
        <div className="mx-auto grid max-w-6xl items-center gap-14 px-5 py-16 lg:grid-cols-2 lg:py-24">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card/70 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur">
              <Sparkles className="h-3.5 w-3.5 text-brand" /> AI-powered resume optimization
            </span>
            <h1 className="mt-5 text-4xl font-bold leading-[1.1] tracking-tight sm:text-5xl">
              Build an <span className="text-gradient-brand">ATS-Friendly Resume</span> in Minutes.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground">
              Create a job-ready resume tailored to the job description using AI. Optimize keywords, improve your ATS
              match and download a professional resume in minutes.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button
                asChild
                size="lg"
                className="bg-gradient-brand text-brand-foreground shadow-glow transition-opacity hover:opacity-90"
              >
                <Link to={buildTo}>
                  Build My Resume <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to={buildTo}>Check My Free ATS Score</Link>
                <p className="mt-2 text-xs text-muted-foreground">Includes 1 free ATS analysis per account.</p>
              </Button>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">Starting from ₹39</p>

            <ul className="mt-8 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
              {[
                "⚡ Instant PDF Download",
                "📄 ATS-Friendly Templates",
                "🔒 Secure Payments",
                "🇮🇳 UPI Supported",
                "🤖 AI-Powered Optimization",
              ].map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
          </div>

          <div className="lg:pl-6">
            <HeroResumeCard />
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <Section
        id="features"
        title="Built for Better Job Applications."
        subtitle="Everything you need to create, optimize and improve your resume."
      >
        <div className="grid gap-5 md:grid-cols-2">
          <FeatureCard
            icon={Sparkles}
            title="Smart AI Resume Writer"
            description="Generate professional, job-specific resume content from your profile and the job description."
            bullets={[
              "Job-specific content",
              "Action-oriented bullet points",
              "Relevant keywords",
              "Professional summaries",
            ]}
            cta={{ label: "Create My Resume", to: buildTo }}
          />

          <FeatureCard
            icon={Gauge}
            title="ATS Score & Optimization"
            description="Analyze your resume against a job description and identify keywords, skills and areas that need improvement."
            cta={{ label: "Check My ATS Score", to: buildTo }}
          >
            <div className="rounded-xl border border-border bg-muted/40 p-4">
              <p className="text-sm font-semibold">
                ATS Match: <span className="text-gradient-brand">92%</span>
              </p>
              <ul className="mt-2 grid grid-cols-2 gap-1.5 text-xs text-muted-foreground">
                {["Keywords", "Skills", "Experience", "Formatting"].map((i) => (
                  <li key={i} className="flex items-center gap-1.5">
                    <Check className="h-3.5 w-3.5 text-emerald-brand" /> {i}
                  </li>
                ))}
              </ul>
            </div>
          </FeatureCard>

          <FeatureCard
            icon={Target}
            title="Skill Gap Analyzer"
            description="Every generated resume lists the job description keywords you already match and the ones missing from your profile, so you know what to improve before the interview."
            cta={{ label: "See My Keyword Gaps", to: buildTo }}
          >
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-border bg-emerald-soft/60 p-3">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Skills you have
                </p>
                <ul className="mt-1.5 space-y-1 text-xs">
                  {["Java", "Spring Boot", "MySQL"].map((s) => (
                    <li key={s}>✓ {s}</li>
                  ))}
                </ul>
              </div>
              <div className="rounded-xl border border-border bg-muted/40 p-3">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Skills you need
                </p>
                <ul className="mt-1.5 space-y-1 text-xs">
                  {["Kafka", "Docker", "AWS"].map((s) => (
                    <li key={s}>• {s}</li>
                  ))}
                </ul>
              </div>
            </div>
          </FeatureCard>

          <FeatureCard
            icon={Layers}
            title="Resume + Personal Portfolio"
            description="Your profile is stored securely in your account and turned into a polished, ATS-friendly resume. A shareable online portfolio is not available yet."
            badge="Portfolio coming soon"
            cta={{ label: "Build My Resume", to: buildTo }}
          />
        </div>
      </Section>

      {/* ATS CHECKER */}
      <section id="ats-checker" className="border-y border-border bg-muted/30">
        <div className="mx-auto max-w-6xl px-5 py-16 lg:py-20">
          <div className="grid items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]">
            <div>
              <h2 className="text-3xl font-bold tracking-tight">Check Your Resume Before You Apply</h2>
              <p className="mt-4 max-w-xl text-muted-foreground">
                Analyze your resume against a specific job description and identify potential keyword, skill and
                formatting gaps.
              </p>
              <p className="mt-3 text-sm text-muted-foreground">
                Your saved profile and the pasted job description are analyzed together — resume file upload is not
                supported yet.
              </p>
              <Button asChild size="lg" className="mt-7 bg-gradient-brand text-brand-foreground">
                <Link to={buildTo}>Check My ATS Score</Link>
              </Button>
            </div>
            <Card className="p-6 shadow-soft">
              <div className="flex items-baseline justify-between">
                <p className="text-sm font-semibold">Match report</p>
                <p className="text-3xl font-bold text-gradient-brand">92%</p>
                <p className="mt-2 text-[11px] text-muted-foreground">
                  Illustrative example — actual results vary by resume and job description.
                </p>
              </div>
              <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-muted">
                <div className="h-full w-[92%] rounded-full bg-gradient-brand" />
              </div>
              <div className="mt-5 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                {["Keywords matched", "Skills aligned", "Experience relevance", "Clean formatting"].map((i) => (
                  <span key={i} className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-brand" /> {i}
                  </span>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* WORKFLOW */}
      <Section
        title="One Job Description. One Tailored Resume."
        subtitle="From pasted JD to a downloadable, keyword-matched resume."
      >
        <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[
            "Paste Job Description",
            "Analyze Requirements",
            "Match Your Profile",
            "Generate Optimized Resume",
            "Check ATS Score",
            "Download PDF",
          ].map((step, i) => (
            <li
              key={step}
              className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 shadow-soft transition-transform hover:-translate-y-0.5"
            >
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-brand-soft text-sm font-bold text-brand">
                {i + 1}
              </span>
              <span className="min-w-0 text-sm font-medium">{step}</span>
            </li>
          ))}
        </ol>
        <div className="mt-8">
          <Button asChild size="lg" className="bg-gradient-brand text-brand-foreground">
            <Link to={buildTo}>Generate My Resume</Link>
          </Button>
        </div>
      </Section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" className="border-y border-border bg-muted/30">
        <div className="mx-auto max-w-6xl px-5 py-16 lg:py-20">
          <h2 className="text-3xl font-bold tracking-tight">Create Your Resume in 3 Simple Steps</h2>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {[
              {
                t: "Create Your Profile",
                d: "Add your experience, education, skills and professional links once.",
              },
              {
                t: "Add the Job Description",
                d: "Paste the job description for the role you want to apply for.",
              },
              {
                t: "Generate & Optimize",
                d: "Let AI tailor your resume, analyze the ATS match and identify missing skills.",
              },
            ].map((s, i) => (
              <Card key={s.t} className="p-6 shadow-soft">
                <span className="text-sm font-bold text-brand">Step {i + 1}</span>
                <h3 className="mt-2 text-lg font-semibold">{s.t}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{s.d}</p>
              </Card>
            ))}
          </div>
          <Button asChild size="lg" className="mt-9 bg-gradient-brand text-brand-foreground">
            <Link to={buildTo}>Start Building</Link>
          </Button>
        </div>
      </section>

      {/* PRICING */}
      <Section id="pricing" title="Simple, Transparent Pricing" subtitle="Choose the plan that works best for you.">
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
      </Section>

      {/* UPI */}
      <section className="border-y border-border bg-muted/30">
        <div className="mx-auto max-w-6xl px-5 py-16 lg:py-20">
          <div className="grid items-center gap-10 lg:grid-cols-2">
            <div>
              <h2 className="text-3xl font-bold tracking-tight">Pay Easily with UPI</h2>
              <p className="mt-4 max-w-lg text-muted-foreground">
                Secure INR payments for your Resume Builder subscription. Pay to our verified UPI ID or scan the QR code
                from any UPI app, then submit your UTR reference — access is activated as soon as the payment is
                verified.
              </p>
              <ul className="mt-6 flex flex-wrap gap-2 text-sm">
                {["UPI", "Google Pay", "PhonePe", "Paytm"].map((m) => (
                  <li key={m} className="rounded-lg border border-border bg-card px-3 py-1.5 font-medium">
                    {m}
                  </li>
                ))}
              </ul>
            </div>
            <Card className="flex items-center gap-5 p-6 shadow-soft">
              <span className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-brand-soft text-brand">
                <QrCode className="h-8 w-8" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold">Scan & Pay</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  The active UPI QR code and instructions are shown on the checkout page. Payments stay pending until
                  manually verified.
                </p>
                <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <Lock className="h-3.5 w-3.5" /> No card details stored
                  </span>
                  <span className="flex items-center gap-1.5">
                    <ShieldCheck className="h-3.5 w-3.5" /> Verified activation
                  </span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* COMPARISON */}
      <Section title="Why Choose Our AI Resume Builder?" subtitle="A quick look at how a JD-first workflow compares.">
        <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-soft">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="p-4 font-semibold">Feature</th>
                <th className="p-4 font-medium text-muted-foreground">Traditional Resume Tools</th>
                <th className="p-4 font-medium text-muted-foreground">Design Tools</th>
                <th className="p-4 font-semibold text-brand">Our AI Resume Builder</th>
              </tr>
            </thead>
            <tbody>
              {[
                ["ATS-Friendly Formatting", "Depends on template", "Depends on design"],
                ["JD-Based Resume", "Limited", "Limited"],
                ["ATS Analysis", "Depends on plan", "Limited"],
                ["Skill Gap Analysis", "Limited", "No"],
                ["AI Content Generation", "Depends on plan", "Limited"],
                ["UPI Support", "Depends on provider", "Depends on provider"],
                ["PDF Export", "✓", "✓"],
              ].map(([f, a, b]) => (
                <tr key={f} className="border-b border-border/70 last:border-0">
                  <td className="p-4 font-medium">{f}</td>
                  <td className="p-4 text-muted-foreground">{a}</td>
                  <td className="p-4 text-muted-foreground">{b}</td>
                  <td className="p-4">
                    <Check className="h-4 w-4 text-emerald-brand" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      {/* FAQ */}
      <section id="faq" className="border-y border-border bg-muted/30">
        <div className="mx-auto max-w-3xl px-5 py-16 lg:py-20">
          <h2 className="text-3xl font-bold tracking-tight">Frequently asked questions</h2>
          <Accordion type="single" collapsible className="mt-8">
            {[
              [
                "Is there an automatic recurring charge?",
                "No. Every plan is a one-time payment — ₹29 for a single resume PDF, ₹99 for 7 days of access or ₹249 for 30 days. Nothing renews automatically.",
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
              <Link to={buildTo}>Check ATS Score</Link>
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

function FeatureCard({
  icon: Icon,
  title,
  description,
  bullets,
  badge,
  cta,
  children,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  bullets?: string[];
  badge?: string;
  cta: { label: string; to: string };
  children?: React.ReactNode;
}) {
  return (
    <Card className="flex flex-col p-6 shadow-soft transition-transform hover:-translate-y-1">
      <div className="flex items-start justify-between gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand">
          <Icon className="h-5 w-5" />
        </span>
        {badge && (
          <span className="rounded-full border border-border px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
            {badge}
          </span>
        )}
      </div>
      <h3 className="mt-4 text-lg font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
      {bullets && (
        <ul className="mt-4 grid grid-cols-2 gap-1.5 text-sm text-muted-foreground">
          {bullets.map((b) => (
            <li key={b} className="flex items-center gap-1.5">
              <Check className="h-3.5 w-3.5 shrink-0 text-emerald-brand" /> {b}
            </li>
          ))}
        </ul>
      )}
      {children && <div className="mt-4">{children}</div>}
      <div className="mt-6 flex-1" />
      <Button asChild variant="outline" className="w-full sm:w-auto sm:self-start">
        <Link to={cta.to}>{cta.label}</Link>
      </Button>
    </Card>
  );
}
