import { createFileRoute, Link } from "@tanstack/react-router";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { PublicPage } from "@/components/landing/PublicPage";
import { FAQ_GROUPS } from "@/lib/faq";

const TITLE = "TheResumeRocket FAQ | ATS Resume Questions";
const DESCRIPTION = "Answers about ATS scores, job-description matching, skill gaps, AI resumes, templates, downloads, pricing, payments, privacy and refunds.";
const PAGE_URL = "https://theresumerocket.com/faq";

export const Route = createFileRoute("/faq")({
  head: () => ({ meta: [
    { title: TITLE }, { name: "description", content: DESCRIPTION }, { property: "og:title", content: TITLE },
    { property: "og:description", content: DESCRIPTION }, { property: "og:type", content: "website" },
    { property: "og:url", content: PAGE_URL }, { name: "twitter:card", content: "summary_large_image" },
  ], links: [{ rel: "canonical", href: PAGE_URL }] }),
  component: FaqPage,
});

function FaqPage() {
  return (
    <PublicPage title="Frequently Asked Questions" intro="Straight answers about TheResumeRocket's ATS score, resume builder, AI features, templates, downloads, payments and privacy.">
      {FAQ_GROUPS.map((group, gi) => (
        <section key={group.title}>
          <h2 className="text-xl font-semibold tracking-tight">{group.title}</h2>
          <Accordion type="single" collapsible className="mt-3">
            {group.items.map((item, ii) => (
              <AccordionItem key={item.question} value={`${gi}-${ii}`}>
                <AccordionTrigger className="text-left">{item.question}</AccordionTrigger>
                <AccordionContent className="leading-relaxed text-muted-foreground">{item.answer}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </section>
      ))}
      <div className="border-t border-border pt-8"><h2 className="text-xl font-semibold">Still need help?</h2><p className="mt-2 text-sm text-muted-foreground">Send the team the details and choose the category that best fits your question.</p><Button asChild className="mt-4"><Link to="/contact">Contact TheResumeRocket</Link></Button></div>
    </PublicPage>
  );
}