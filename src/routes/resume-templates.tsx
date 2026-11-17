import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PublicPage, useSignedIn } from "@/components/landing/PublicPage";
import { ResumePreview } from "@/components/ResumePreview";
import { BUILTIN_TEMPLATES } from "@/lib/resume-templates";
import type { OptimizedResume } from "@/lib/resume.functions";

const TITLE = "ATS-Friendly Resume Templates | TheResumeRocket";
const DESCRIPTION = "Preview the six ATS-friendly resume templates available in TheResumeRocket and open your chosen design in the Resume Builder.";
const PAGE_URL = "https://theresumerocket.com/resume-templates";

export const Route = createFileRoute("/resume-templates")({
  head: () => ({ meta: [
    { title: TITLE }, { name: "description", content: DESCRIPTION }, { property: "og:title", content: TITLE },
    { property: "og:description", content: DESCRIPTION }, { property: "og:type", content: "website" },
    { property: "og:url", content: PAGE_URL }, { name: "twitter:card", content: "summary_large_image" },
  ], links: [{ rel: "canonical", href: PAGE_URL }] }),
  component: ResumeTemplatesPage,
});

const SAMPLE: OptimizedResume = {
  atsScore: 86, matchingKeywords: [], missingKeywords: [],
  optimizedProfile: {
    personal: { fullName: "Ananya Sharma", title: "Product Analyst", email: "ananya@example.com", phone: "+91 90000 00000", linkedin: "linkedin.com/in/ananya", github: "", portfolio: "", summary: "Product analyst experienced in translating customer and business needs into measurable product improvements." },
    skills: [{ category: "Core Skills", items: ["Product analytics", "SQL", "Research", "Reporting"] }],
    experience: [{ title: "Product Analyst", company: "Fintech Labs", dateRange: "2022 – Present", bullets: ["Built reporting workflows that improved decision speed for product teams.", "Partnered with stakeholders to define and track measurable outcomes."] }],
    education: [{ degree: "B.E.", major: "Computer Science", institution: "Visvesvaraya Technological University", year: "2022", score: "" }],
  },
};

const BEST_FOR: Record<string, string> = {
  "ats-classic": "Most roles and traditional industries",
  "modern-ats": "Product, operations and modern business roles",
  "minimal-ats": "Early-career applicants and concise resumes",
  "technical-developer": "Software, data and engineering roles",
  executive: "Senior leadership and management roles",
  "clean-professional": "Consulting, finance and client-facing roles",
};

function ResumeTemplatesPage() {
  const signedIn = useSignedIn();
  return (
    <PublicPage title="ATS-Friendly Resume Templates" intro="Choose a professional resume template designed to keep your experience clear, readable, and ATS-friendly.">
      <p className="text-sm leading-relaxed text-muted-foreground">These are the actual six templates available in the builder. Every preview uses selectable text and a single-column structure. Choose one here, then select the same named template in the builder's Template Studio before exporting.</p>
      <div className="grid gap-6 md:grid-cols-2">
        {BUILTIN_TEMPLATES.map((template) => (
          <Card key={template.id} className="overflow-hidden">
            <div className="h-80 overflow-hidden border-b border-border bg-muted/40 p-4" aria-label={`${template.name} preview`}>
              <div className="origin-top-left scale-[0.34] sm:scale-[0.38]">
                <ResumePreview data={SAMPLE} config={template.config} printable={false} decorativeHeading />
              </div>
            </div>
            <div className="p-5">
              <h2 className="text-lg font-semibold">{template.name}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{template.description.replace("Recommended · ", "")}</p>
              <p className="mt-3 text-sm"><span className="font-medium">Best suited for:</span> <span className="text-muted-foreground">{BEST_FOR[template.id]}</span></p>
              <Button asChild className="mt-5 w-full">
                <Link to={signedIn ? "/builder" : "/login"}>{signedIn ? "Use This Template" : "Build Resume"}</Link>
              </Button>
            </div>
          </Card>
        ))}
      </div>
      <p className="text-sm text-muted-foreground">All previews use fictional demonstration data, not customer resumes or verified achievements.</p>
      <p className="text-sm text-muted-foreground">The template changes presentation only. Always review the content and run the ATS check against the target job description before applying.</p>
    </PublicPage>
  );
}