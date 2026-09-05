import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LandingHeader } from "@/components/landing/LandingHeader";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { BLOG_POSTS } from "@/lib/blog";
import { supabase } from "@/integrations/supabase/client";
import { Clock, Newspaper } from "lucide-react";

const TITLE = "Resume Rocket Blog — ATS Resume Tips That Work";
const DESCRIPTION =
  "Practical articles on beating applicant tracking systems: why resumes get rejected, tailoring to a job description, writing bullets that score, and career-change resumes.";
const PAGE_URL = "https://theresumerocket.com/blog";

export const Route = createFileRoute("/blog/")({
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
          "@type": "Blog",
          name: "Resume Rocket Blog",
          url: PAGE_URL,
          description: DESCRIPTION,
          blogPost: BLOG_POSTS.map((p) => ({
            "@type": "BlogPosting",
            headline: p.title,
            description: p.description,
            datePublished: p.publishedIso,
            url: `${PAGE_URL}/${p.slug}`,
          })),
        }),
      },
    ],
  }),
  component: BlogIndex,
});

function BlogIndex() {
  const [signedIn, setSignedIn] = useState(false);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSignedIn(Boolean(data.session)));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSignedIn(Boolean(s)));
    return () => data.subscription.unsubscribe();
  }, []);

  const [featured, ...rest] = BLOG_POSTS;

  return (
    <div className="min-h-screen bg-background">
      <LandingHeader signedIn={signedIn} />
      <main className="mx-auto max-w-6xl px-5 py-14">
        <div className="max-w-3xl">
          <Badge variant="secondary" className="mb-3 gap-1">
            <Newspaper className="h-3.5 w-3.5" /> Blog
          </Badge>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            ATS resume tips, written from real scoring data
          </h1>
          <p className="mt-3 text-muted-foreground">
            Articles on how applicant tracking systems read a resume, what actually moves a match
            score, and how to adapt your resume to each posting without rewriting it from scratch.
          </p>
        </div>

        {featured && (
          <Card className="mt-10 p-6">
            <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Latest · {featured.category}
            </span>
            <h2 className="mt-2 text-2xl font-semibold leading-snug tracking-tight">
              <Link to="/blog/$slug" params={{ slug: featured.slug }} className="hover:underline">
                {featured.title}
              </Link>
            </h2>
            <p className="mt-3 max-w-3xl text-sm text-muted-foreground">{featured.description}</p>
            <span className="mt-4 flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock className="h-3.5 w-3.5" /> {featured.readingMinutes} min read ·{" "}
              {featured.published}
            </span>
          </Card>
        )}

        <h2 className="mt-12 text-xl font-semibold tracking-tight">More articles</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {rest.map((p) => (
            <Card key={p.slug} className="flex flex-col p-5">
              <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                {p.category}
              </span>
              <h3 className="mt-2 text-base font-semibold leading-snug">
                <Link to="/blog/$slug" params={{ slug: p.slug }} className="hover:underline">
                  {p.title}
                </Link>
              </h3>
              <p className="mt-2 flex-1 text-sm text-muted-foreground">{p.description}</p>
              <span className="mt-4 flex items-center gap-1.5 text-xs text-muted-foreground">
                <Clock className="h-3.5 w-3.5" /> {p.readingMinutes} min read · {p.published}
              </span>
            </Card>
          ))}
        </div>

        <Card className="mt-10 flex flex-col items-start gap-3 bg-muted/40 p-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            Prefer step-by-step reference material? The guides cover formatting and keywords in
            depth.
          </p>
          <div className="flex gap-2">
            <Button asChild variant="outline">
              <Link to="/guides">Read the guides</Link>
            </Button>
            <Button asChild className="bg-gradient-brand text-brand-foreground">
              <Link to="/ats-checker">Free ATS check</Link>
            </Button>
          </div>
        </Card>
      </main>
      <LandingFooter signedIn={signedIn} />
    </div>
  );
}
