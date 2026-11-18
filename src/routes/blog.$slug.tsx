import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LandingHeader } from "@/components/landing/LandingHeader";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { BLOG_POSTS, getBlogPost } from "@/lib/blog";
import { supabase } from "@/integrations/supabase/client";
import { Clock } from "lucide-react";

const BASE = "https://theresumerocket.com";

export const Route = createFileRoute("/blog/$slug")({
  loader: ({ params }) => {
    const post = getBlogPost(params.slug);
    if (!post) throw notFound();
    return { post };
  },
  head: ({ params, loaderData }) => {
    const url = `${BASE}/blog/${params.slug}`;
    if (!loaderData) {
      return {
        meta: [
          { title: "Article unavailable — Resume Rocket" },
          { name: "robots", content: "noindex" },
        ],
      };
    }
    const { post } = loaderData;
    return {
      meta: [
        { title: post.metaTitle },
        { name: "description", content: post.description },
        { property: "og:title", content: post.metaTitle },
        { property: "og:description", content: post.description },
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
            "@type": "BlogPosting",
            headline: post.title,
            description: post.description,
            datePublished: post.publishedIso,
            url,
            author: { "@type": "Organization", name: "TheResumeRocket" },
            publisher: { "@type": "Organization", name: "TheResumeRocket" },
            mainEntityOfPage: url,
          }),
        },
      ],
    };
  },
  notFoundComponent: PostNotFound,
  component: BlogPostPage,
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

function PostNotFound() {
  const signedIn = useSignedIn();
  return (
    <div className="min-h-screen bg-background">
      <LandingHeader signedIn={signedIn} />
      <main className="mx-auto max-w-3xl px-5 py-20 text-center">
        <h1 className="text-2xl font-bold tracking-tight">That article does not exist</h1>
        <p className="mt-3 text-muted-foreground">It may have been renamed or removed.</p>
        <Button asChild className="mt-6">
          <Link to="/blog">Browse all articles</Link>
        </Button>
      </main>
      <LandingFooter signedIn={signedIn} />
    </div>
  );
}

function BlogPostPage() {
  const { post } = Route.useLoaderData();
  const signedIn = useSignedIn();
  const others = BLOG_POSTS.filter((p) => p.slug !== post.slug).slice(0, 4);

  return (
    <div className="min-h-screen bg-background">
      <LandingHeader signedIn={signedIn} />
      <main className="mx-auto max-w-3xl px-5 py-14">
        <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
          <Link to="/blog" className="hover:text-foreground hover:underline">
            Blog
          </Link>
          <span className="px-1.5">/</span>
          <span>{post.category}</span>
        </nav>

        <h1 className="mt-3 text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
          {post.title}
        </h1>
        <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Clock className="h-3.5 w-3.5" /> {post.readingMinutes} min read · Published{" "}
          {post.published}
        </p>
        <p className="mt-5 text-base text-muted-foreground">{post.intro}</p>

        <article className="mt-10 space-y-10">
          {post.sections.map((s) => (
            <section key={s.heading}>
              <h2 className="text-xl font-semibold tracking-tight">{s.heading}</h2>
              {s.paragraphs?.map((p, i) => (
                <p key={i} className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  {p.split(/(free checker)/g).map((part, index) => part === "free checker"
                    ? <Link key={index} to="/ats-checker" className="text-primary underline underline-offset-4">free ATS resume checker</Link>
                    : part)}
                </p>
              ))}
              {s.bullets && (
                <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm text-muted-foreground">
                  {s.bullets.map((b, i) => (
                    <li key={i}>{b.split(/(free checker)/g).map((part, index) => part === "free checker"
                      ? <Link key={index} to="/ats-checker" className="text-primary underline underline-offset-4">free ATS resume checker</Link>
                      : part)}</li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </article>

        <Card className="mt-10 p-5">
          <h2 className="text-base font-semibold">Key takeaways</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            {post.takeaways.map((t, i) => (
              <li key={i}>{t}</li>
            ))}
          </ul>
        </Card>

        <Card className="mt-4 flex flex-col items-start gap-3 bg-muted/40 p-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            See how your resume scores against a real job description — free, instant, no sign-up.
          </p>
          <Button asChild className="bg-gradient-brand text-brand-foreground">
            <Link to="/ats-checker">Run the ATS check</Link>
          </Button>
        </Card>

        <section className="mt-12">
          <h2 className="text-xl font-semibold tracking-tight">Keep reading</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {others.map((p) => (
              <li key={p.slug}>
                <Link
                  to="/blog/$slug"
                  params={{ slug: p.slug }}
                  className="text-foreground hover:underline"
                >
                  {p.title}
                </Link>
              </li>
            ))}
            <li>
              <Link to="/guides" className="text-foreground hover:underline">
                All resume &amp; ATS guides
              </Link>
            </li>
          </ul>
        </section>
      </main>
      <LandingFooter signedIn={signedIn} />
    </div>
  );
}
