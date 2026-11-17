import { createFileRoute, Link } from "@tanstack/react-router";
import { PublicPage, useSignedIn } from "@/components/landing/PublicPage";
import { Button } from "@/components/ui/button";

const TITLE = "AI Resume Builder for Job-Specific Resumes | TheResumeRocket";
const DESCRIPTION = "Create an ATS-friendly resume from your real profile, tailor it to a job description, review the evidence and export PDF or DOCX with TheResumeRocket.";
const URL = "https://theresumerocket.com/ai-resume-builder";
export const Route = createFileRoute("/ai-resume-builder")({
  head: () => ({ meta: [
    { title: TITLE }, { name: "description", content: DESCRIPTION },
    { property: "og:title", content: TITLE }, { property: "og:description", content: DESCRIPTION },
    { property: "og:type", content: "website" }, { property: "og:url", content: URL },
    { name: "twitter:card", content: "summary_large_image" },
  ], links: [{ rel: "canonical", href: URL }] }),
  component: BuilderOverview,
});

function BuilderOverview() {
  const signedIn = useSignedIn();
  return <PublicPage title="AI Resume Builder" intro="Build a job-specific resume from the skills, experience and projects you can genuinely support.">
    <div className="flex flex-wrap gap-3"><Button asChild><Link to={signedIn ? "/builder" : "/login"}>Create my resume</Link></Button><Button variant="outline" asChild><Link to="/ats-checker">Check an existing resume free</Link></Button></div>
    <section><h2 className="text-xl font-semibold">Start with your actual profile</h2><p className="mt-3 text-muted-foreground">Sign in to enter your contact details, summary, skills, experience, projects and education, or import an existing resume. Review extracted fields before generation. Resume import is parsed in your browser; account-based generation uses the supplied profile rather than a second file-storage path.</p></section>
    <section><h2 className="text-xl font-semibold">Tailor evidence to one job description</h2><p className="mt-3 text-muted-foreground">Add a target job description to identify relevant requirements and prioritise source-backed skills and bullets. Rewriting can improve wording and order; it must not invent employment, qualifications, dates, results or tools. Skills you are learning stay labelled as learning evidence, and projects remain projects.</p><p className="mt-3 text-muted-foreground">A stronger deterministic score is not proof that an employer will shortlist you. Review both job alignment and readability, then check every generated statement against your own background.</p></section>
    <section><h2 className="text-xl font-semibold">Review, choose a template and export</h2><p className="mt-3 text-muted-foreground">Inspect the generated resume, choose one of the <Link to="/resume-templates" className="text-primary underline">available ATS-friendly templates</Link> and review the A4 preview. PDF uses selectable browser-native print output; DOCX is an editable document. Follow the employer's requested file type and review the downloaded copy.</p></section>
    <section><h2 className="text-xl font-semibold">Free checking and account-based generation are separate</h2><p className="mt-3 text-muted-foreground">The <Link to="/ats-checker" className="text-primary underline">public ATS checker</Link> needs no signup. AI generation and exports use your account's current plan and available allowances. Individual daily AI ceilings are 10 resume generations and 30 analyses, with cooldowns; these are safety ceilings, not a promise that every plan includes those quantities. Partner wallets have their own availability rules.</p><p className="mt-3 text-muted-foreground">See <Link to="/pricing" className="text-primary underline">current configured prices and plan details</Link> and your account's displayed allowances before purchasing. Payments are verified through the existing UPI process; no unlimited usage or automatic renewal is promised here.</p></section>
    <section><h2 className="text-xl font-semibold">Practical resume guidance</h2><p className="mt-3 text-muted-foreground">Start with the <Link to="/guides/$slug" params={{ slug: "ats-resume-format" }} className="text-primary underline">format and date guide</Link>, <Link to="/guides/$slug" params={{ slug: "ats-keywords" }} className="text-primary underline">truthful keyword-matching guide</Link> or <Link to="/guides" className="text-primary underline">role-specific resume guides</Link>. Keep the source profile accurate and review completed learning evidence before adding it.</p></section>
  </PublicPage>;
}