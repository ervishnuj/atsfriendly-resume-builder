import { useState } from "react";
import { Link, useNavigate, useLocation } from "@tanstack/react-router";
import { Menu, X } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { clearBrowserUserData } from "@/lib/profile-storage";

const NAV = [
  { label: "Home", href: "/" },
  { label: "Free ATS Checker", href: "/ats-checker" },
  { label: "Resume Builder", href: "/builder" },
  { label: "Features", href: "/#features" },
  { label: "Pricing", href: "/pricing" },
  { label: "Guides", href: "/guides" },
];

export function LandingHeader({ signedIn }: { signedIn: boolean }) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const pathname = useLocation({ select: location => location.pathname });

  async function signOut() {
    await supabase.auth.signOut();
    clearBrowserUserData();
    setOpen(false);
    navigate({ to: "/", replace: true });
  }

  return (
    <header className="sticky top-0 z-50 border-b border-border/70 bg-card/95 backdrop-blur-xl">
      <div className="mx-auto grid max-w-7xl grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 xl:flex xl:justify-between">
        <Link to="/" aria-label="Resume Rocket home" className="flex min-w-0 items-center">
          <BrandLogo className="h-8 sm:h-10" />
        </Link>

        <nav aria-label="Main navigation" className="hidden items-center gap-1 xl:flex">
          {NAV.map((n) => (
            <a
              key={n.label}
              href={n.href}
              aria-current={pathname === n.href ? "page" : undefined}
              className={`rounded-md px-2 py-2 text-sm font-medium transition-colors ${pathname === n.href ? "bg-accent text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
            >
              {n.label}
            </a>
          ))}
        </nav>

        <div className="col-start-2 row-start-1 flex items-center gap-2">
          <Button asChild variant="ghost" size="sm" className="hidden xl:inline-flex">
            <Link to={signedIn ? "/dashboard" : "/login"}>{signedIn ? "Dashboard" : "Login"}</Link>
          </Button>
          <Button asChild size="sm" className="hidden sm:inline-flex">
            <Link to="/ats-checker">Check My Resume Free</Link>
          </Button>
          <Button type="button" variant="outline" size="icon" onClick={() => setOpen(v => !v)} aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open} aria-controls="mobile-navigation" className="xl:hidden">
            {open ? <X /> : <Menu />}
          </Button>
        </div>
      </div>

      {open && (
        <div className="border-t border-border bg-background xl:hidden">
          <nav id="mobile-navigation" aria-label="Mobile navigation" className="mx-auto flex max-w-7xl flex-col px-5 py-3">
            {NAV.map((n) => (
              <a
                key={n.label}
                href={n.href}
                onClick={() => setOpen(false)}
                aria-current={pathname === n.href ? "page" : undefined}
                className={`rounded-md px-2 py-3 text-sm font-medium ${pathname === n.href ? "bg-accent text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
              >
                {n.label}
              </a>
            ))}
            <div className="mt-3 flex flex-col gap-2 border-t border-border pt-3">
              {signedIn ? (
                <>
                  <Button asChild variant="outline" onClick={() => setOpen(false)}>
                    <Link to="/dashboard">Dashboard</Link>
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
                  <Button asChild className="bg-primary text-primary-foreground" onClick={() => setOpen(false)}>
                    <Link to="/builder">Create My Resume</Link>
                  </Button>
                </>
              ) : (
                <>
                  <Button asChild variant="outline" onClick={() => setOpen(false)}>
                    <Link to="/login">Login</Link>
                  </Button>
                  <Button asChild className="bg-primary text-primary-foreground" onClick={() => setOpen(false)}>
                    <Link to="/login">Create My Resume</Link>
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
