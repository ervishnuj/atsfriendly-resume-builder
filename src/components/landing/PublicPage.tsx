import { useEffect, useState, type ReactNode } from "react";
import { LandingHeader } from "@/components/landing/LandingHeader";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { supabase } from "@/integrations/supabase/client";

export function useSignedIn() {
  const [signedIn, setSignedIn] = useState(false);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSignedIn(Boolean(data.session)));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSignedIn(Boolean(s)));
    return () => data.subscription.unsubscribe();
  }, []);
  return signedIn;
}

/** Shared shell for public informational pages — same header, footer and spacing. */
export function PublicPage({
  title,
  intro,
  eyebrow,
  children,
}: {
  title: string;
  intro?: string;
  eyebrow?: string;
  children: ReactNode;
}) {
  const signedIn = useSignedIn();
  return (
    <div className="min-h-screen bg-background">
      <LandingHeader signedIn={signedIn} />
      <main className="mx-auto w-full max-w-4xl px-5 py-12 lg:py-16">
        {eyebrow ? (
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1>
        {intro ? <p className="mt-4 text-base text-muted-foreground">{intro}</p> : null}
        <div className="mt-10 space-y-10">{children}</div>
      </main>
      <LandingFooter signedIn={signedIn} />
    </div>
  );
}

export function PolicySection({
  heading,
  children,
}: {
  heading: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-3">
      <h2 className="text-xl font-semibold tracking-tight">{heading}</h2>
      <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">{children}</div>
    </section>
  );
}

export function Bullets({ items }: { items: string[] }) {
  return (
    <ul className="ml-5 list-disc space-y-2">
      {items.map((i) => (
        <li key={i}>{i}</li>
      ))}
    </ul>
  );
}
