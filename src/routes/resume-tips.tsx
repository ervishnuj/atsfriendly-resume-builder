import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { PublicPage, PolicySection, Bullets } from "@/components/landing/PublicPage";

const TITLE = "Resume Tips for ATS & Job Applications | TheResumeRocket";
const DESCRIPTION = "Practical resume tips for structure, summaries, skills, experience, projects, education, ATS-friendly formatting and job-specific tailoring.";
const PAGE_URL = "https://theresumerocket.com/resume-tips";

export const Route = createFileRoute("/resume-tips")({
  head: () => ({ meta: [
    { title: TITLE }, { name: "description", content: DESCRIPTION }, { property: "og:title", content: TITLE },
    { property: "og:description", content: DESCRIPTION }, { property: "og:type", content: "article" },
    { property: "og:url", content: PAGE_URL }, { name: "twitter:card", content: "summary_large_image" },
  ], links: [{ rel: "canonical", href: PAGE_URL }] }),
  component: ResumeTipsPage,
});

function ResumeTipsPage() {
  return (
    <PublicPage eyebrow="Practical resume guidance" title="Resume Tips for ATS and Job Applications" intro="Build a truthful, readable resume that makes the evidence for your fit easy to find — for software and people alike.">
      <PolicySection heading="Start with a clear structure"><Bullets items={[
        "Use standard headings: Summary, Skills, Experience, Education, Projects and Certifications.",
        "Keep contact details in plain text at the top of the page.",
        "Put the sections most relevant to the role first, while keeping experience chronological within its section.",
        "Aim for one or two focused pages rather than filling space with unrelated detail.",
      ]} /></PolicySection>
      <PolicySection heading="Write a specific professional summary"><p>Use two to four lines to state your role, relevant experience, strongest domain knowledge and the value you have delivered. Replace broad claims such as “hard-working team player” with evidence that relates to the target role.</p></PolicySection>
      <PolicySection heading="Build a useful skills section"><p>Group real skills into readable categories and use the terminology in the job description when it truthfully describes your ability. A keyword belongs on the resume only if you can explain or demonstrate it.</p></PolicySection>
      <PolicySection heading="Turn experience into evidence"><Bullets items={[
        "Start bullets with a clear action and describe what you changed, built, analyzed or delivered.",
        "Add scope or a measured result when you can verify it.",
        "Show the relevant tools in context instead of listing them without evidence.",
        "Prioritize accomplishments connected to the target job's responsibilities.",
      ]} /></PolicySection>
      <PolicySection heading="Use projects strategically"><p>Projects are especially valuable for students, career changers and technical applicants. Include the problem, your contribution, the tools used and the outcome. Do not present tutorials or team work as solely your own.</p></PolicySection>
      <PolicySection heading="Education and certifications"><p>Use the full institution, qualification and completion year. List current, verifiable certifications relevant to the role; remove expired or unrelated credentials that distract from stronger evidence.</p></PolicySection>
      <PolicySection heading="Keep formatting ATS-friendly"><Bullets items={[
        "Choose a single-column layout and familiar fonts.",
        "Avoid text boxes, skill bars, decorative icons and important information in headers or footers.",
        "Keep dates consistent and use text that can be selected after exporting to PDF.",
        "Use PDF unless the employer specifically asks for DOCX; TheResumeRocket supports both.",
      ]} /></PolicySection>
      <PolicySection heading="Tailor for each job description"><p>Read the role's requirements and responsibilities, then move the most relevant truthful evidence higher and mirror the employer's vocabulary naturally. TheResumeRocket can show matches and gaps, but you must decide which edits accurately reflect your experience.</p></PolicySection>
      <PolicySection heading="Common mistakes"><Bullets items={[
        "Sending one generic resume to very different roles.",
        "Stuffing keywords without evidence or adding skills you do not have.",
        "Using vague bullets that describe duties but not outcomes.",
        "Leaving inconsistent dates, spelling mistakes or old contact details.",
        "Trusting generated text without checking every fact.",
      ]} /></PolicySection>
      <div className="flex flex-wrap gap-3"><Button asChild><Link to="/ats-checker">Check an existing resume</Link></Button><Button asChild variant="outline"><Link to="/guides">Read detailed guides</Link></Button></div>
    </PublicPage>
  );
}