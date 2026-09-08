import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { LandingHeader } from "@/components/landing/LandingHeader";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { supabase } from "@/integrations/supabase/client";
import {
  ArrowRight,
  BookOpen,
  ChevronDown,
  ClipboardList,
  Download,
  FileSearch,
  FileText,
  Gauge,
  LayoutTemplate,
  ListChecks,
  Repeat,
  Sparkles,
  Target,
  Upload,
  UserRound,
} from "lucide-react";

const TITLE = "How to Use TheResumeRocket | ATS Resume & Job-Specific Resume Guide";
const DESCRIPTION =
  "Learn how to check your ATS score, check an existing resume against a Job Description, identify skill gaps, build a job-specific resume, optimize it with AI, download your resume, and track applications using TheResumeRocket.";
const PAGE_URL = "https://theresumerocket.com/how-it-works";

const CARDS: { id: string; n: number; title: string; icon: typeof Gauge; blurb: string }[] = [
  { id: "ats-score", n: 1, title: "Check Your ATS Score", icon: Gauge, blurb: "Free checker, no sign-up." },
  { id: "existing-resume", n: 2, title: "Check Your Existing Resume", icon: FileSearch, blurb: "Upload a PDF or DOCX and score it." },
  { id: "job-description", n: 3, title: "Understand Your Job Description", icon: Target, blurb: "The primary input for everything." },
  { id: "build", n: 4, title: "Build Your Resume", icon: Sparkles, blurb: "The end-to-end builder flow." },
  { id: "profile", n: 5, title: "Add / Import Your Profile", icon: UserRound, blurb: "Every field explained." },
  { id: "templates", n: 6, title: "Choose a Resume Template", icon: LayoutTemplate, blurb: "Six built-in layouts + custom." },
  { id: "ai-analysis", n: 7, title: "Use AI Analysis", icon: ListChecks, blurb: "ATS, existing resume, gaps, cover letter." },
  { id: "generate", n: 8, title: "Generate Your AI Resume", icon: Sparkles, blurb: "What the AI does — and does not do." },
  { id: "review", n: 9, title: "Review & Edit", icon: ClipboardList, blurb: "Verification checklist." },
  { id: "recheck", n: 10, title: "Check ATS Score Again", icon: Repeat, blurb: "Compare before and after." },
  { id: "download", n: 11, title: "Download Your Resume", icon: Download, blurb: "PDF and DOCX." },
  { id: "tracker", n: 12, title: "Track Your Applications", icon: FileText, blurb: "Keep every application in one place." },
];

export const Route = createFileRoute("/how-it-works")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "article" },
      { property: "og:url", content: PAGE_URL },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: PAGE_URL }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "HowTo",
          name: "How to Use TheResumeRocket",
          description: DESCRIPTION,
          url: PAGE_URL,
          step: CARDS.map((c, i) => ({
            "@type": "HowToStep",
            position: i + 1,
            name: c.title,
            url: `${PAGE_URL}#${c.id}`,
          })),
        }),
      },
    ],
  }),
  component: HowItWorksPage,
});

function HowItWorksPage() {
  const [signedIn, setSignedIn] = useState(false);
  const [navOpen, setNavOpen] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSignedIn(Boolean(data.session)));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSignedIn(Boolean(s)));
    return () => data.subscription.unsubscribe();
  }, []);

  const buildTo = signedIn ? "/builder" : "/login";

  return (
    <div className="min-h-screen bg-background">
      <LandingHeader signedIn={signedIn} />

      <main className="mx-auto max-w-6xl px-5 py-14">
        <div className="max-w-3xl">
          <Badge variant="secondary" className="mb-3 gap-1">
            <BookOpen className="h-3.5 w-3.5" /> Step-by-step guide
          </Badge>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            How to Use TheResumeRocket
          </h1>
          <p className="mt-3 text-lg text-muted-foreground">
            Create a job-specific, ATS-friendly resume step by step.
          </p>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            TheResumeRocket helps you compare your resume with a specific Job Description, identify
            relevant skills and gaps, improve your resume, and create a job-specific ATS-friendly
            resume.
          </p>
          <p className="mt-3 text-sm font-medium">One Job Description. One Tailored Resume.</p>
        </div>

        {/* Start here */}
        <section className="mt-8" aria-label="Start here">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
            Start Here
          </h2>
          <div className="mt-3 flex flex-wrap gap-3">
            <Button asChild className="bg-gradient-brand text-brand-foreground">
              <Link to="/ats-checker">Check ATS Score</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to={buildTo}>Build My Resume</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to={signedIn ? "/tracker" : "/login"}>Track Applications</Link>
            </Button>
          </div>
        </section>

        <div className="mt-10 grid gap-10 lg:grid-cols-[240px_minmax(0,1fr)]">
          {/* TOC */}
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <button
              type="button"
              onClick={() => setNavOpen((v) => !v)}
              aria-expanded={navOpen}
              className="flex w-full items-center justify-between rounded-lg border border-border px-3 py-2 text-sm font-medium lg:hidden"
            >
              Guide contents
              <ChevronDown className={`h-4 w-4 transition-transform ${navOpen ? "rotate-180" : ""}`} />
            </button>
            <nav
              aria-label="Guide contents"
              className={`${navOpen ? "block" : "hidden"} mt-2 lg:mt-0 lg:block`}
            >
              <ol className="space-y-1 text-sm">
                {CARDS.map((c) => (
                  <li key={c.id}>
                    <a
                      href={`#${c.id}`}
                      onClick={() => setNavOpen(false)}
                      className="block rounded-md px-2 py-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    >
                      {c.n}. {c.title}
                    </a>
                  </li>
                ))}
                <li>
                  <a
                    href="#workflow"
                    onClick={() => setNavOpen(false)}
                    className="block rounded-md px-2 py-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    Recommended workflow
                  </a>
                </li>
                <li>
                  <a
                    href="#faq"
                    onClick={() => setNavOpen(false)}
                    className="block rounded-md px-2 py-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    FAQ
                  </a>
                </li>
              </ol>
            </nav>
          </aside>

          <div className="min-w-0">
            {/* Guide cards */}
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {CARDS.map((c) => (
                <a key={c.id} href={`#${c.id}`} className="group">
                  <Card className="flex h-full items-start gap-3 p-4 transition-colors group-hover:border-primary/40 group-hover:bg-muted/40">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-muted">
                      <c.icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold leading-snug">
                        {c.n}. {c.title}
                      </span>
                      <span className="mt-0.5 block text-xs text-muted-foreground">{c.blurb}</span>
                    </span>
                  </Card>
                </a>
              ))}
            </div>

            {/* 1 */}
            <Section id="ats-score" heading="1. How to Check Your ATS Score">
              <P>
                ATS stands for Applicant Tracking System. Many companies use ATS software to scan
                resumes for relevant skills, keywords, experience, and formatting before recruiters
                review them.
              </P>
              <P>The ATS Checker on TheResumeRocket compares:</P>
              <Bullets
                items={[
                  "Resume content",
                  "Job Description requirements",
                  "Relevant keywords",
                  "Skills",
                  "Experience",
                  "Resume/JD alignment",
                  "Basic formatting and structure signals",
                ]}
              />
              <Note>
                An ATS score is an alignment signal. It does not guarantee an interview or a job.
              </Note>

              <Step n="Step 1" title="Open the ATS Checker">
                <P>
                  On the Home page, click <B>Check My Free ATS Score</B>. You can also reach it any
                  time from <B>ATS Checker</B> in the site navigation.
                </P>
                <Button asChild size="sm" variant="outline" className="mt-2 gap-1">
                  <Link to="/ats-checker">
                    Open the ATS Checker <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </Button>
              </Step>

              <Step n="Step 2" title="Paste your resume">
                <P>
                  In the <B>Your resume text</B> box, paste the complete text of your resume. Include:
                </P>
                <Bullets
                  items={[
                    "Name",
                    "Professional Summary",
                    "Skills",
                    "Experience",
                    "Projects",
                    "Education",
                    "Certifications",
                  ]}
                />
                <P>
                  For best results, paste the complete resume text rather than only the skills
                  section.
                </P>
              </Step>

              <Step n="Step 3" title="Paste the job description">
                <P>
                  In the <B>Target job description</B> box, paste the complete Job Description for the
                  job you want to apply for. Include:
                </P>
                <Bullets
                  items={[
                    "Job title",
                    "Responsibilities",
                    "Required skills",
                    "Preferred skills",
                    "Experience requirements",
                    "Education requirements",
                    "Tools",
                    "Technologies",
                  ]}
                />
                <P>Do not paste only the job title.</P>
              </Step>

              <Step n="Step 4" title="Check the ATS score">
                <P>
                  Click <B>Check ATS score</B>. The system analyzes the relationship between your
                  resume and the target Job Description, then shows:
                </P>
                <Bullets
                  items={[
                    "ATS Match Score",
                    "Matched keywords",
                    "Missing keywords",
                    "Relevant skills",
                    "Areas that need improvement",
                    "Resume/JD alignment breakdown",
                  ]}
                />
                <Note>
                  Adding every missing keyword does not automatically improve your resume. Add only
                  what genuinely reflects your experience.
                </Note>
              </Step>

              <Step n="Step 5" title="Understand the score">
                <P>The checker uses these bands, exactly as implemented in the application:</P>
                <Bullets
                  items={[
                    "90 and above — Excellent Match",
                    "75–89 — Strong Match",
                    "60–74 — Moderate Match",
                    "40–59 — Needs Improvement",
                    "Below 40 — Poor Match",
                  ]}
                />
              </Step>

              <Flow
                title="Flow A — ATS Checker"
                steps={[
                  "Home",
                  "Check My Free ATS Score",
                  "ATS Checker",
                  "Paste Resume Text",
                  "Paste Job Description",
                  "Check ATS Score",
                  "View match, missing keywords and improvement areas",
                ]}
              />

              <Cta
                question="Want to create a job-specific resume?"
                label="Build My Resume"
                to={buildTo}
              />
              <NextStep to="#existing-resume" label="Next: check your existing resume" />
            </Section>

            {/* 2 */}
            <Section id="existing-resume" heading="2. How to Check Your Existing Resume">
              <P>
                Use this when you already have a resume and want to evaluate it against a specific
                Job Description. The order matters: add the Job Description first, then upload the
                resume.
              </P>

              <Step n="Step 1" title="Add your Target Job Description">
                <P>
                  Open the Resume Builder and paste the complete Job Description into the{" "}
                  <B>Target Job Description</B> box. The Job Description is required because your
                  existing resume needs to be evaluated against a specific job.
                </P>
                <Bullets
                  items={[
                    "Job title",
                    "Responsibilities",
                    "Required skills",
                    "Preferred skills",
                    "Experience requirements",
                    "Education requirements",
                    "Tools",
                    "Technologies",
                    "Domain requirements",
                  ]}
                />
                <P>Use the complete Job Description whenever possible.</P>
              </Step>

              <Step n="Step 2" title="Click Check Existing Resume">
                <P>
                  In the <B>AI Analysis</B> card, click <B>Check Existing Resume</B>. Add your Target
                  Job Description first, then click Check Existing Resume — the button asks you for
                  the Job Description if it is empty.
                </P>
              </Step>

              <Step n="Step 3" title="Upload your existing resume">
                <P>
                  A file picker opens. The application supports <B>PDF</B> and <B>DOCX</B> files up to
                  5 MB. Scanned or image-only PDFs cannot be read, because the text is extracted from
                  the document itself.
                </P>
                <P>
                  The file stays on your device: the text is extracted in your browser and only that
                  text is sent for analysis.
                </P>
              </Step>

              <Step n="Step 4" title="Analyze the resume against the JD">
                <P>The analysis shows you:</P>
                <Bullets
                  items={[
                    "ATS Score and ATS Match Score",
                    "Matched skills and keywords",
                    "Missing keywords",
                    "Relevant skills",
                    "Potential skill gaps",
                    "Relevant experience",
                    "Areas that need improvement",
                    "Resume-to-JD alignment breakdown",
                  ]}
                />
              </Step>

              <Step n="Step 5" title="Understand the results">
                <P>
                  Review the analysis to understand what your existing resume already covers and what
                  areas may need improvement for this specific Job Description. Use it to improve
                  relevant content, strengthen experience descriptions, highlight genuinely relevant
                  skills, and improve resume/JD alignment before generating a job-specific resume.
                </P>
                <Note>
                  Never add a skill you do not genuinely have. The purpose of Check Existing Resume is
                  to identify relevance and improvement opportunities — not to create fake
                  qualifications.
                </Note>
              </Step>

              <Flow
                title="Flow B — Check Existing Resume"
                steps={[
                  "Home",
                  "Build My Resume",
                  "Resume Builder",
                  "Paste Target Job Description",
                  "Click Check Existing Resume",
                  "Upload Existing Resume (PDF or DOCX)",
                  "Analyze Resume vs JD",
                  "Review ATS Score & Gaps",
                  "Improve / Generate Tailored Resume",
                  "Review & Edit",
                  "Check ATS Score Again",
                  "Download PDF / Export DOCX",
                ]}
              />

              <Cta question="Ready to improve your resume?" label="Build My Resume" to={buildTo} />
              <NextStep to="#job-description" label="Next: your target job description" />
            </Section>

            {/* 3 (JD) */}
            <Section id="job-description" heading="3. How to Add Your Target Job Description">
              <P>
                The Job Description is the primary input for creating a job-specific resume. It tells
                the AI what the employer is actually looking for.
              </P>
              <P>Paste the complete posting, including:</P>
              <Bullets
                items={[
                  "Responsibilities",
                  "Required skills",
                  "Preferred skills",
                  "Experience requirements",
                  "Education requirements",
                  "Tools",
                  "Technologies",
                  "Domain requirements",
                ]}
              />
              <P>
                Do not paste only the job title. Use the complete Job Description whenever possible —
                the AI extracts the relevant requirements from it.
              </P>
              <NextStep to="#build" label="Next: build your resume" />
            </Section>

            {/* 4 build */}
            <Section id="build" heading="4. How to Build an ATS-Friendly Resume">
              <P>
                The Resume Builder uses your profile information and the target Job Description to
                create a job-specific resume.
              </P>
              <Flow
                title="Flow C — Build a tailored resume"
                steps={[
                  "Home",
                  "Build My Resume",
                  "Resume Builder",
                  "Paste Target Job Description",
                  "Add / Import Profile",
                  "Choose Resume Template",
                  "Use AI Analysis if required",
                  "Generate ATS Resume",
                  "Review & Edit",
                  "Check ATS Score",
                  "Download PDF / Export DOCX",
                ]}
              />
              <P>
                Start from the Home page and click <B>Build My Resume</B>. If you are signed in this
                opens the builder directly; otherwise you are asked to sign in first. Signed-in users
                can also open the builder from the header and generate with the{" "}
                <B>Generate ATS Resume</B> button.
              </P>
              <Cta question="Ready to start?" label="Build My Resume" to={buildTo} />
              <NextStep to="#profile" label="Next: your profile" />
            </Section>

            {/* 5 profile */}
            <Section id="profile" heading="5. How to Add or Import Your Profile">
              <DefList
                items={[
                  ["Full Name", "Enter your professional name exactly as you want it to appear on your resume."],
                  ["Professional Title", "Enter the title that best represents your actual experience — for example Software Engineer, PLC Automation Engineer, or Full Stack Developer. Do not claim experience you do not have."],
                  ["Email", "Use a professional email address."],
                  ["Phone", "Add a reachable professional phone number."],
                  ["LinkedIn URL", "Add your LinkedIn profile URL."],
                  ["GitHub URL", "Add your GitHub profile if it contains relevant projects or contributions."],
                  ["Portfolio / Website", "Add your portfolio or personal website if relevant."],
                  ["Short Summary", "Your professional summary: experience, key skills, domain and professional value. The AI may improve the wording based on the target JD, but the content stays grounded in your actual profile."],
                ]}
              />
              <P>
                You also add <B>Skills</B> (grouped by category), <B>Experience</B> (title, company,
                date range and one achievement per line), <B>Projects</B>, <B>Education</B> and{" "}
                <B>Certifications</B>.
              </P>
              <SubHeading>Import</SubHeading>
              <P>
                The <B>Import</B> option in the builder loads a previously exported profile file
                (JSON or plain text). Imported values are validated and any problem fields are
                highlighted in the form. Always verify imported information for accuracy before
                generating the final resume.
              </P>
              <SubHeading>Edit</SubHeading>
              <P>
                Use the profile form to update any information before generating the resume. Your
                profile is saved to your account so it is there next time.
              </P>
              <NextStep to="#templates" label="Next: choose a template" />
            </Section>

            {/* 6 templates */}
            <Section id="templates" heading="6. How to Choose a Resume Template">
              <P>
                The selected template controls the visual structure and formatting of your generated
                resume.
              </P>
              <DefList
                items={[
                  ["Professional ATS Classic", "Recommended for compact corporate-style resumes and ATS-friendly structure."],
                  ["Modern ATS", "Clean modern structure with clear headings and spacing."],
                  ["Minimal ATS", "Simple layout with minimal visual distractions."],
                  ["Technical Developer", "Designed for technical/engineering profiles and skill-focused resumes."],
                  ["Executive", "Suitable for senior professionals with a stronger emphasis on leadership and experience."],
                  ["Clean Professional", "Balanced professional layout with subtle visual hierarchy."],
                ]}
              />
              <Note>No template guarantees a higher ATS score.</Note>
              <SubHeading>Custom templates</SubHeading>
              <P>
                Click <B>Create Custom Template</B> to open the custom template builder. You can
                adjust settings such as font family, sizes, colours and spacing, see a live preview,
                and click <B>Save Template</B> to store it under <B>My Custom Templates</B> for reuse.
                Saved custom templates can be edited or deleted later. Cancelling the builder discards
                unsaved changes.
              </P>
              <NextStep to="#ai-analysis" label="Next: AI analysis" />
            </Section>

            {/* 7 AI analysis */}
            <Section id="ai-analysis" heading="7. How AI Analysis Works">
              <P>
                The <B>AI Analysis</B> card in the builder has four actions. All of them need a target
                Job Description and your full name in the profile first.
              </P>
              <SubHeading>ATS Score</SubHeading>
              <P>
                Compares your profile-based resume against the target JD so you can see how closely it
                aligns with the job requirements, with matched and missing keywords and a score
                breakdown.
              </P>
              <SubHeading>Check Existing Resume</SubHeading>
              <P>Use this when you already have a resume file. The order is:</P>
              <Bullets
                items={[
                  "Paste the Target Job Description",
                  "Click Check Existing Resume",
                  "Upload the existing resume (PDF or DOCX)",
                  "The resume is analyzed against the JD",
                  "Review the ATS score and the gaps",
                ]}
              />
              <SubHeading>Skill Gap</SubHeading>
              <P>
                Identifies skills or requirements mentioned in the target JD that may not be
                sufficiently represented in your profile or resume.
              </P>
              <Note>Only add a skill to your resume if you genuinely have that skill or experience.</Note>
              <SubHeading>Cover Letter</SubHeading>
              <P>
                Generates a job-specific cover letter from your profile and the target Job
                Description, which you can copy from the panel.
              </P>
              <NextStep to="#generate" label="Next: generate your resume" />
            </Section>

            {/* 8 generate */}
            <Section id="generate" heading="8. How to Generate Your Job-Specific Resume">
              <P>
                After entering your Job Description and profile information, click{" "}
                <B>Generate ATS Resume</B> in the builder header. The AI then:
              </P>
              <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-sm text-muted-foreground">
                <li>Reads and understands the Job Description</li>
                <li>Identifies the relevant requirements</li>
                <li>Matches those requirements with your actual profile</li>
                <li>Prioritises the relevant skills</li>
                <li>Creates job-specific professional content</li>
                <li>Improves experience descriptions for relevance</li>
                <li>Creates action-oriented bullet points</li>
                <li>Creates a professional summary</li>
                <li>Keeps all content grounded in your actual experience</li>
              </ol>
              <Note>
                The AI must never invent employment, skills, certifications, projects, achievements,
                technologies, responsibilities or experience you do not actually have. Job-specific
                optimization means improving relevance and wording — not creating fake experience.
              </Note>
              <NextStep to="#review" label="Next: review and edit" />
            </Section>

            {/* 9 review */}
            <Section id="review" heading="9. How to Review and Edit Your Resume">
              <P>AI-generated content should always be reviewed before downloading.</P>
              <Bullets
                items={[
                  "Check your name",
                  "Check email and phone",
                  "Check LinkedIn/GitHub URLs",
                  "Verify job titles",
                  "Verify companies",
                  "Verify dates",
                  "Verify skills",
                  "Verify projects",
                  "Verify education",
                  "Verify certifications",
                  "Remove anything inaccurate",
                  "Check formatting in the preview",
                  "Check spelling and grammar",
                ]}
              />
              <P>
                AI helps with optimization, but the final resume should always be verified by the
                candidate.
              </P>
              <NextStep to="#recheck" label="Next: re-check your ATS score" />
            </Section>

            {/* 10 recheck */}
            <Section id="recheck" heading="10. How to Re-check Your ATS Score">
              <Flow
                title="Improve and re-check"
                steps={[
                  "Original Resume",
                  "ATS Analysis",
                  "Identify gaps",
                  "Optimize Resume",
                  "Generate Tailored Resume",
                  "ATS Analysis Again",
                  "Compare Improvement",
                ]}
              />
              <P>
                Checking the score again helps you understand whether the updated resume is better
                aligned with the target JD.
              </P>
              <Note>
                An improved ATS score does not guarantee an interview. It indicates stronger alignment
                with the analyzed Job Description.
              </Note>
              <Button asChild size="sm" variant="outline" className="mt-2 gap-1">
                <Link to="/ats-checker">
                  Check My ATS Score <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
              <NextStep to="#download" label="Next: download your resume" />
            </Section>

            {/* 11 download */}
            <Section id="download" heading="11. How to Download Your Resume">
              <P>
                Once a resume is generated, the builder header offers <B>Download PDF</B> and{" "}
                <B>Export DOCX</B>.
              </P>
              <DefList
                items={[
                  ["Download PDF", "Use PDF when you want a ready-to-submit resume with consistent formatting."],
                  ["Export DOCX", "Use DOCX when you need an editable document."],
                ]}
              />
              <NextStep to="#tracker" label="Next: track your applications" />
            </Section>

            {/* 12 tracker */}
            <Section id="tracker" heading="12. How to Track Your Job Applications">
              <P>
                Use the Tracker to keep track of the jobs you have applied to so you don't lose track
                of applications. Each entry supports:
              </P>
              <Bullets
                items={[
                  "Job title (required)",
                  "Company",
                  "Application date",
                  "Status — Saved, Applied, Assessment, Interview, Technical Round, HR Round, Offer, Rejected, Withdrawn",
                  "Location",
                  "Salary / CTC",
                  "Job URL",
                  "Resume used — link a resume version you generated",
                  "Job description",
                  "Notes",
                ]}
              />
              <Button asChild size="sm" variant="outline" className="mt-3 gap-1">
                <Link to={signedIn ? "/tracker" : "/login"}>
                  Open Application Tracker <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            </Section>

            {/* Workflow */}
            <Section id="workflow" heading="TheResumeRocket Recommended Workflow">
              <Flow
                title="Flow D — Complete application"
                steps={[
                  "Step 1 — Find a Job",
                  "Step 2 — Copy the Complete Job Description",
                  "Step 3 — Check Your Existing Resume",
                  "Step 4 — Understand Matched Skills & Gaps",
                  "Step 5 — Build a Job-Specific Resume",
                  "Step 6 — Review AI-Generated Content",
                  "Step 7 — Check ATS Match Again",
                  "Step 8 — Download PDF / Export DOCX",
                  "Step 9 — Apply",
                  "Step 10 — Track Your Application",
                ]}
              />
              <P>
                Don't create one generic resume and send it everywhere. Use the Job Description to
                understand what matters for each application and tailor your resume accordingly.
              </P>
            </Section>

            {/* Privacy */}
            <Section id="privacy" heading="Privacy and what happens to your data">
              <Bullets
                items={[
                  "The free ATS Checker scores your text entirely in your browser — the resume and job description you paste there are not uploaded or stored.",
                  "In the builder, PDF/DOCX files you upload for Check Existing Resume are read in your browser; only the extracted text is sent for analysis, and the file itself is never stored.",
                  "Your profile, generated resumes and tracker entries are saved to your account so you can return to them, and are only accessible to you.",
                  "AI analysis and resume generation run on the server using the Gemini API, so the text you submit for those actions leaves your browser.",
                ]}
              />
            </Section>

            {/* FAQ */}
            <section id="faq" className="scroll-mt-24 pt-12">
              <h2 className="text-xl font-semibold tracking-tight">Frequently Asked Questions</h2>
              <Accordion type="single" collapsible className="mt-3">
                {FAQ.map((f, i) => (
                  <AccordionItem key={f.q} value={`faq-${i}`}>
                    <AccordionTrigger className="text-left text-sm">{f.q}</AccordionTrigger>
                    <AccordionContent className="text-sm text-muted-foreground">{f.a}</AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </section>

            {/* Final CTA */}
            <Card className="mt-12 flex flex-col items-start gap-4 bg-muted/40 p-6">
              <div>
                <h2 className="text-lg font-semibold">
                  Ready to create a better job-specific resume?
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Start with your Job Description and let TheResumeRocket help you understand what
                  matters.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button asChild className="bg-gradient-brand text-brand-foreground">
                  <Link to="/ats-checker">Check My Free ATS Score</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link to={buildTo}>Build My Resume</Link>
                </Button>
              </div>
            </Card>

            <p className="mt-8 text-sm">
              <Link to="/guides" className="text-muted-foreground hover:text-foreground hover:underline">
                ← Back to Guides
              </Link>
            </p>
          </div>
        </div>
      </main>

      <LandingFooter signedIn={signedIn} />
    </div>
  );
}

const FAQ: { q: string; a: string }[] = [
  {
    q: "What is an ATS?",
    a: "An Applicant Tracking System is software many companies use to scan and organise resumes for skills, keywords, experience and formatting before a recruiter reads them.",
  },
  {
    q: "How does TheResumeRocket calculate the ATS match?",
    a: "Scoring is deterministic: your resume text is compared with the job description for keyword and skill coverage, requirement and responsibility alignment, and basic structure/formatting signals. The breakdown panel shows how each part contributed.",
  },
  {
    q: "Should I paste the complete Job Description?",
    a: "Yes. Pasting only the job title gives the analysis almost nothing to work with. Include responsibilities, required and preferred skills, experience, education, tools and technologies.",
  },
  {
    q: "Should I customize my resume for every job?",
    a: "That is the intended use: one Job Description, one tailored resume. Different roles emphasise different requirements.",
  },
  {
    q: "How do I check my existing resume?",
    a: "In the Resume Builder, paste the Target Job Description, then click Check Existing Resume in the AI Analysis card and upload your PDF or DOCX resume.",
  },
  {
    q: "Should I add the JD before uploading my existing resume?",
    a: "Yes. The Job Description is required first — the upload button asks for it before it will analyze anything, because the resume is scored against that specific job.",
  },
  {
    q: "What should I do if a skill is missing?",
    a: "If you genuinely have the skill, make sure it appears in your profile with real supporting experience. If you do not have it, treat it as a learning goal — do not add it to your resume.",
  },
  {
    q: "Can AI add skills I don't have?",
    a: "No. The generator is instructed to stay grounded in the profile you provide. It rewrites and prioritises your real experience; it does not invent employment, skills, certifications or achievements.",
  },
  {
    q: "Which resume template should I choose?",
    a: "All six built-in templates are ATS-friendly layouts. Pick the one that fits your profile — Technical Developer for engineering roles, Executive for senior roles, Professional ATS Classic for compact corporate resumes. No template guarantees a higher score.",
  },
  {
    q: "Should I review the AI-generated resume?",
    a: "Always. Verify names, contact details, titles, companies, dates, skills, projects, education and certifications before you download.",
  },
  {
    q: "Does a higher ATS score guarantee an interview?",
    a: "No. It indicates stronger alignment with the job description you analyzed. Hiring decisions depend on many other factors.",
  },
  {
    q: "Can I edit my resume after generation?",
    a: "Yes. Update your profile or job description in the builder and generate again; the preview updates with the new content.",
  },
  { q: "Can I download my resume as PDF?", a: "Yes, using the Download PDF button in the builder once a resume has been generated." },
  { q: "Can I export my resume as DOCX?", a: "Yes, using the Export DOCX button in the builder once a resume has been generated." },
  {
    q: "Can I track my job applications?",
    a: "Yes. The Tracker stores job title, company, application date, status, location, salary/CTC, job URL, the resume version you used, the job description and your notes.",
  },
];

/* ---------- small presentational helpers ---------- */

function Section({ id, heading, children }: { id: string; heading: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24 pt-12">
      <h2 className="text-xl font-semibold tracking-tight">{heading}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{children}</p>;
}

function B({ children }: { children: React.ReactNode }) {
  return <span className="font-medium text-foreground">{children}</span>;
}

function SubHeading({ children }: { children: React.ReactNode }) {
  return <h3 className="mt-6 text-sm font-semibold">{children}</h3>;
}

function Bullets({ items }: { items: string[] }) {
  return (
    <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm text-muted-foreground">
      {items.map((i) => (
        <li key={i}>{i}</li>
      ))}
    </ul>
  );
}

function DefList({ items }: { items: [string, string][] }) {
  return (
    <dl className="mt-3 space-y-3">
      {items.map(([term, desc]) => (
        <div key={term}>
          <dt className="text-sm font-medium">{term}</dt>
          <dd className="text-sm text-muted-foreground">{desc}</dd>
        </div>
      ))}
    </dl>
  );
}

function Note({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-3 rounded-lg border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
      {children}
    </p>
  );
}

function Step({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return (
    <Card className="mt-4 p-4">
      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{n}</p>
      <h3 className="mt-1 text-sm font-semibold">{title}</h3>
      {children}
    </Card>
  );
}

function Flow({ title, steps }: { title: string; steps: string[] }) {
  return (
    <Card className="mt-5 p-4">
      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{title}</p>
      <ol className="mt-3 space-y-1.5">
        {steps.map((s, i) => (
          <li key={s} className="flex items-start gap-2 text-sm">
            <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-muted text-[11px] font-semibold">
              {i + 1}
            </span>
            <span className="text-muted-foreground">{s}</span>
          </li>
        ))}
      </ol>
    </Card>
  );
}

function Cta({ question, label, to }: { question: string; label: string; to: string }) {
  return (
    <Card className="mt-5 flex flex-col items-start gap-3 bg-muted/40 p-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-muted-foreground">{question}</p>
      <Button asChild className="bg-gradient-brand text-brand-foreground">
        <Link to={to}>{label}</Link>
      </Button>
    </Card>
  );
}

function NextStep({ to, label }: { to: string; label: string }) {
  return (
    <p className="mt-4 text-sm">
      <a href={to} className="inline-flex items-center gap-1 font-medium hover:underline">
        {label} <ArrowRight className="h-3.5 w-3.5" />
      </a>
    </p>
  );
}
