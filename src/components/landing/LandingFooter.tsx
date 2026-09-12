import { Link } from "@tanstack/react-router";
import { BrandLogo } from "@/components/BrandLogo";

export function LandingFooter({ signedIn }: { signedIn: boolean }) {
  return (
    <footer className="border-t border-border bg-muted/30">
      <div className="mx-auto max-w-6xl px-5 py-14">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-5">
          <div className="lg:col-span-1">
            <BrandLogo className="h-9" />
            <p className="mt-3 text-sm text-muted-foreground">
              ATS-friendly resumes tailored to the job description you are applying for.
            </p>
          </div>

          <FooterCol
            title="Product"
            items={[
              { label: "Resume Builder", to: signedIn ? "/builder" : "/login" },
              { label: "ATS Checker", to: "/ats-checker" },
              { label: "Skill Gap Analyzer", to: signedIn ? "/builder" : "/login", hash: "skill-gap-analyzer" },
              { label: "Resume Templates", to: "/resume-templates" },
              { label: "Pricing", to: "/pricing" },
            ]}
          />
          <FooterCol
            title="Resources"
            items={[
              { label: "How to Use TheResumeRocket", to: "/how-it-works" },
              { label: "Blog", to: "/blog" },
              { label: "Resume Tips", to: "/resume-tips" },
              { label: "ATS Guide", to: "/guides/$slug", params: { slug: "ats-resume-format" } },
              { label: "Why ATS rejects resumes", to: "/blog/$slug", params: { slug: "why-ats-rejects-resumes" } },
              { label: "FAQ", to: "/faq" },
            ]}
          />
          <FooterCol
            title="Company"
            items={[
              { label: "About", to: "/about" },
              { label: "Contact", to: "/contact" },
              { label: "Privacy Policy", to: "/privacy" },
              { label: "Terms", to: "/terms" },
              { label: "Refund Policy", to: "/refund-policy" },
            ]}
          />

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-widest text-foreground">
              Account
            </h3>
            <ul className="mt-4 space-y-2.5 text-sm text-muted-foreground">
              {signedIn ? (
                <>
                  <li>
                    <Link to="/builder" className="transition-colors hover:text-foreground">
                      Dashboard
                    </Link>
                  </li>
                  <li>
                    <Link to="/builder" className="transition-colors hover:text-foreground">
                      My Resume
                    </Link>
                  </li>
                  <li>
                    <Link to="/subscription" className="transition-colors hover:text-foreground">
                      Subscription
                    </Link>
                  </li>
                </>
              ) : (
                <>
                  <li>
                    <Link to="/login" className="transition-colors hover:text-foreground">
                      Login
                    </Link>
                  </li>
                  <li>
                    <Link to="/register" className="transition-colors hover:text-foreground">
                      Register
                    </Link>
                  </li>
                  <li>
                    <Link to="/pricing" className="transition-colors hover:text-foreground">
                      Pricing
                    </Link>
                  </li>
                </>
              )}
            </ul>
          </div>
        </div>

        <p className="mt-12 border-t border-border pt-6 text-xs text-muted-foreground">
          © 2026 TheResumeRocket. All rights reserved.
        </p>
      </div>
    </footer>
  );
}

function FooterCol({
  title,
  items,
}: {
  title: string;
  items: Array<{
    label: string;
    to: string;
    hash?: string;
    params?: Record<string, string>;
  }>;
}) {
  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-widest text-foreground">{title}</h3>
      <ul className="mt-4 space-y-2.5 text-sm text-muted-foreground">
        {items.map((i) => (
          <li key={i.label}>
            <Link
              to={i.to}
              hash={i.hash}
              params={i.params}
              className="transition-colors hover:text-foreground"
            >
              {i.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}