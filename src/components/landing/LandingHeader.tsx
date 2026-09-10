import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Menu, X } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

const NAV = [
  { label: "Home", href: "/#top" },
  { label: "Features", href: "/#features" },
  { label: "How It Works", href: "/how-it-works" },
  { label: "ATS Checker", href: "/ats-checker" },
  { label: "Guides", href: "/guides" },
  { label: "Blog", href: "/blog" },
  { label: "Pricing", href: "/#pricing" },
  { label: "FAQ", href: "/#faq" },
];

export function LandingHeader({ signedIn }: { signedIn: boolean }) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  async function signOut() {
    await supabase.auth.signOut();
    setOpen(false);
    navigate({ to: "/", replace: true });
  }

  return (
    <header className="sticky top-0 z-50 border-b border-border/70 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto grid max-w-6xl grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-5 py-3 lg:flex lg:justify-between">
        <Link to="/" aria-label="Resume Rocket home" className="flex min-w-0 items-center">
          <BrandLogo className="h-8 sm:h-10" />
        </Link>

        <nav className="hidden items-center gap-1 lg:flex">
          {NAV.map((n) => (
            <a
              key={n.label}
              href={n.href}
              className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              {n.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-2 lg:flex">
          {signedIn ? (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link to="/builder">Dashboard</Link>
              </Button>
              <Button asChild variant="ghost" size="sm">
                <Link to="/subscription">Subscription</Link>
              </Button>
              <Button asChild variant="ghost" size="sm">
                <Link to="/tracker">Tracker</Link>
              </Button>
              <Button size="sm" variant="outline" onClick={signOut}>
                Logout
              </Button>
              <Button asChild size="sm" className="bg-gradient-brand text-brand-foreground hover:opacity-90">
                <Link to="/builder">Build My Resume</Link>
              </Button>
            </>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link to="/login">Login</Link>
              </Button>
              <Button asChild size="sm" className="bg-gradient-brand text-brand-foreground hover:opacity-90">
                <Link to="/login">Build My Resume</Link>
              </Button>
            </>
          )}
        </div>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-border lg:hidden"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        <div className="border-t border-border bg-background lg:hidden">
          <nav className="mx-auto flex max-w-6xl flex-col px-5 py-3">
            {NAV.map((n) => (
              <a
                key={n.label}
                href={n.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-2 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                {n.label}
              </a>
            ))}
            <div className="mt-3 flex flex-col gap-2 border-t border-border pt-3">
              {signedIn ? (
                <>
                  <Button asChild variant="outline" onClick={() => setOpen(false)}>
                    <Link to="/builder">Dashboard</Link>
                  </Button>
                  <Button asChild variant="outline" onClick={() => setOpen(false)}>
                    <Link to="/subscription">Subscription</Link>
                  </Button>
                  <Button asChild variant="outline" onClick={() => setOpen(false)}>
                    <Link to="/tracker">Tracker</Link>
                  </Button>
                  <Button variant="ghost" onClick={signOut}>
                    Logout
                  </Button>
                  <Button asChild className="bg-gradient-brand text-brand-foreground" onClick={() => setOpen(false)}>
                    <Link to="/builder">Build My Resume</Link>
                  </Button>
                </>
              ) : (
                <>
                  <Button asChild variant="outline" onClick={() => setOpen(false)}>
                    <Link to="/login">Login</Link>
                  </Button>
                  <Button asChild className="bg-gradient-brand text-brand-foreground" onClick={() => setOpen(false)}>
                    <Link to="/login">Build My Resume</Link>
                  </Button>
                </>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
