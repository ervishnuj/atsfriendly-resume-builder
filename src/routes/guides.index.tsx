import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LandingHeader } from "@/components/landing/LandingHeader";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { GUIDES } from "@/lib/guides";
import { supabase } from "@/integrations/supabase/client";
import { BookOpen, Clock } from "lucide-react";

const TITLE = "Resume & ATS Guides — Formatting, Keywords, Fixes | Resume Rocket";
const DESCRIPTION =
  "Free, practical guides on ATS resume formatting, keyword matching from job descriptions, and the resume mistakes that cost interviews.";
const PAGE_URL = "https://theresumerocket.com/guides";

export const Route = createFileRoute("/guides/")({
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
          "@type": "ItemList",
          name: "Resume and ATS guides",
          url: PAGE_URL,
          itemListElement: GUIDES.map((g, i) => ({
            "@type": "ListItem",
            position: i + 1,
            url: `${PAGE_URL}/${g.slug}`,
            name: g.title,
          })),
        }),
      },
    ],
  }),
  component: GuidesIndex,
});

function GuidesIndex() {
  const [signedIn, setSignedIn] = useState(false);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSignedIn(Boolean(data.session)));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSignedIn(Boolean(s)));
    return () => data.subscription.unsubscribe();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <LandingHeader signedIn={signedIn} />
      <main className="mx-auto max-w-6xl px-5 py-14">
        <div className="max-w-3xl">
          <Badge variant="secondary" className="mb-3 gap-1">
            <BookOpen className="h-3.5 w-3.5" /> Free guides
          </Badge>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Resume &amp; ATS guides
          </h1>
          <p className="mt-3 text-muted-foreground">
            Short, specific write-ups on the things that actually decide whether your resume gets
            read: how applicant tracking systems parse a document, how to pull keywords out of a job
            posting, and the mistakes that quietly filter strong candidates out.
          </p>
        </div>

        <h2 className="mt-12 text-xl font-semibold tracking-tight">All guides</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {GUIDES.map((g) => (
            <Card key={g.slug} className="flex flex-col p-5">
              <h3 className="text-base font-semibold leading-snug">
                <Link to="/guides/$slug" params={{ slug: g.slug }} className="hover:underline">
                  {g.title}
                </Link>
              </h3>
              <p className="mt-2 flex-1 text-sm text-muted-foreground">{g.description}</p>
              <span className="mt-4 flex items-center gap-1.5 text-xs text-muted-foreground">
                <Clock className="h-3.5 w-3.5" /> {g.readingMinutes} min read · Updated {g.updated}
              </span>
            </Card>
          ))}
        </div>

        <Card className="mt-10 flex flex-col items-start gap-3 bg-muted/40 p-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            Want to see how your current resume scores against a specific job posting?
          </p>
          <Button asChild className="bg-gradient-brand text-brand-foreground">
            <Link to="/ats-checker">Run the free ATS check</Link>
          </Button>
        </Card>
      </main>
      <LandingFooter signedIn={signedIn} />
    </div>
  );
}
