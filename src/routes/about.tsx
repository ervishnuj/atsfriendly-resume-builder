import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PublicPage, PolicySection, Bullets } from "@/components/landing/PublicPage";

const TITLE = "About TheResumeRocket | AI Resume & ATS Optimization";
const DESCRIPTION =
  "TheResumeRocket helps job seekers compare a resume against one job description, understand the match, find gaps and build a tailored, ATS-friendly resume.";
const PAGE_URL = "https://theresumerocket.com/about";

export const Route = createFileRoute("/about")({
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
  }),
  component: AboutPage,
});

const FLOW = [
  "Resume + Job Description",
  "Analyze",
  "Understand Match",
  "Identify Gaps",
  "Improve Resume",
  "Generate Tailored Resume",
  "Re-check ATS Match",
  "Apply",
];

function AboutPage() {
  return (
    <PublicPage
      eyebrow="One Job Description. One Tailored Resume."
      title="About TheResumeRocket"
      intro="TheResumeRocket is built to help job seekers create resumes that are more relevant to the jobs they apply for."
    >
      <PolicySection heading="Why it exists">
        <p>
          Most people send the same generic resume to every opening. Applicant tracking systems and
          recruiters, however, read each resume against one specific requisition. Instead of using
          the same resume everywhere, TheResumeRocket helps you compare your resume with a specific
          job description, understand what matches, identify potential gaps, and improve your resume
          for that opportunity.
        </p>
      </PolicySection>

      <PolicySection heading="The core workflow">
        <div className="grid gap-2 sm:grid-cols-2">
          {FLOW.map((step, i) => (
            <Card key={step} className="flex items-center gap-3 p-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-foreground">
                {i + 1}
              </span>
              <span className="text-sm font-medium text-foreground">{step}</span>
            </Card>
          ))}
        </div>
      </PolicySection>

      <PolicySection heading="What the product does">
        <Bullets
          items={[
            "A free ATS Checker that scores an existing resume against a job description in your browser.",
            "A rule-based, explainable scoring engine — every score comes with a breakdown you can act on.",
            "AI analysis that highlights matched skills and gaps from your own profile, without inventing experience.",
            "Tailored resume generation using six single-column, ATS-friendly templates plus custom template settings.",
            "PDF and DOCX export with an A4 page preview, and an application tracker for the roles you apply to.",
          ]}
        />
      </PolicySection>

      <PolicySection heading="What we do not claim">
        <p>
          We do not promise interviews, jobs, hiring outcomes, or that a resume will pass every
          applicant tracking system. Systems differ between employers, and hiring decisions depend
          on many factors outside a document. What the product can do is make your resume clearer,
          better structured and more relevant to the specific role you are applying for.
        </p>
      </PolicySection>

      <div className="flex flex-wrap gap-3">
        <Button asChild>
          <Link to="/ats-checker">Check your resume free</Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/how-it-works">See how it works</Link>
        </Button>
        <Button asChild variant="ghost">
          <Link to="/contact">Contact us</Link>
        </Button>
      </div>
    </PublicPage>
  );
}
