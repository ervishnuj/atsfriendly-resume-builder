import { createFileRoute, Link, notFound, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LandingHeader } from "@/components/landing/LandingHeader";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { GUIDES, getGuide, resolveGuideSlug } from "@/lib/guides";
import { supabase } from "@/integrations/supabase/client";
import { Clock } from "lucide-react";

const BASE = "https://theresumerocket.com";

export const Route = createFileRoute("/guides/$slug")({
  loader: ({ params }) => {
    const guide = getGuide(params.slug);
    if (!guide) throw notFound();
    return { guide };
  },
  head: ({ params, loaderData }) => {
    const url = `${BASE}/guides/${params.slug}`;
    if (!loaderData) {
      return {
        meta: [{ title: "Guide unavailable — Resume Rocket" }, { name: "robots", content: "noindex" }],
      };
    }
    const { guide } = loaderData;
    return {
      meta: [
        { title: guide.metaTitle },
        { name: "description", content: guide.description },
        { property: "og:title", content: guide.metaTitle },
        { property: "og:description", content: guide.description },
        { property: "og:type", content: "article" },
        { property: "og:url", content: url },
        { name: "twitter:card", content: "summary_large_image" },
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Article",
            headline: guide.title,
            description: guide.description,
            url,
            author: { "@type": "Organization", name: "Resume Rocket" },
            publisher: { "@type": "Organization", name: "Resume Rocket" },
          }),
        },
      ],
    };
  },
  notFoundComponent: GuideNotFound,
  component: GuidePage,
});

function useSignedIn() {
  const [signedIn, setSignedIn] = useState(false);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSignedIn(Boolean(data.session)));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSignedIn(Boolean(s)));
    return () => data.subscription.unsubscribe();
  }, []);
  return signedIn;
}

function GuideNotFound() {
  const signedIn = useSignedIn();
  return (
    <div className="min-h-screen bg-background">
      <LandingHeader signedIn={signedIn} />
      <main className="mx-auto max-w-3xl px-5 py-20 text-center">
        <h1 className="text-2xl font-bold tracking-tight">That guide does not exist</h1>
        <p className="mt-3 text-muted-foreground">It may have been renamed or removed.</p>
        <Button asChild className="mt-6">
          <Link to="/guides">Browse all guides</Link>
        </Button>
      </main>
      <LandingFooter signedIn={signedIn} />
    </div>
  );
}

function GuidePage() {
  const { guide } = Route.useLoaderData();
  const signedIn = useSignedIn();
  const others = GUIDES.filter((g) => g.slug !== guide.slug);

  return (
    <div className="min-h-screen bg-background">
      <LandingHeader signedIn={signedIn} />
      <main className="mx-auto max-w-3xl px-5 py-14">
        <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
          <Link to="/guides" className="hover:text-foreground hover:underline">
            Guides
          </Link>
        </nav>

        <h1 className="mt-3 text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
          {guide.title}
        </h1>
        <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Clock className="h-3.5 w-3.5" /> {guide.readingMinutes} min read · Updated {guide.updated}
        </p>
        <p className="mt-5 text-base text-muted-foreground">{guide.intro}</p>

        <article className="mt-10 space-y-10">
          {guide.sections.map((s) => (
            <section key={s.heading}>
              <h2 className="text-xl font-semibold tracking-tight">{s.heading}</h2>
              {s.paragraphs?.map((p, i) => (
                <p key={i} className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  {p}
                </p>
              ))}
              {s.bullets && (
                <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm text-muted-foreground">
                  {s.bullets.map((b, i) => (
                    <li key={i}>{b}</li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </article>

        <Card className="mt-10 p-5">
          <h2 className="text-base font-semibold">Key takeaways</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            {guide.takeaways.map((t, i) => (
              <li key={i}>{t}</li>
            ))}
          </ul>
        </Card>

        <Card className="mt-4 flex flex-col items-start gap-3 bg-muted/40 p-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            Check your resume against a real job description — free, instant, no sign-up.
          </p>
          <Button asChild className="bg-gradient-brand text-brand-foreground">
            <Link to="/ats-checker">Run the ATS check</Link>
          </Button>
        </Card>

        <section className="mt-12">
          <h2 className="text-xl font-semibold tracking-tight">Keep reading</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {others.map((g) => (
              <li key={g.slug}>
                <Link
                  to="/guides/$slug"
                  params={{ slug: g.slug }}
                  className="text-foreground hover:underline"
                >
                  {g.title}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </main>
      <LandingFooter signedIn={signedIn} />
    </div>
  );
}
