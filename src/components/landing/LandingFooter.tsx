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
              { label: "Resume Builder", href: "#top" },
              { label: "ATS Checker", href: "#ats-checker" },
              { label: "Skill Gap Analyzer", href: "#features" },
              { label: "Resume Templates", href: "#features" },
              { label: "Pricing", href: "#pricing" },
            ]}
          />
          <FooterCol
            title="Resources"
            items={[
              { label: "Resume Tips", href: "#how-it-works" },
              { label: "ATS Guide", href: "#ats-checker" },
              { label: "Career Resources", href: "#features" },
              { label: "FAQ", href: "#faq" },
            ]}
          />
          <FooterCol
            title="Company"
            items={[
              { label: "About", href: "#top" },
              { label: "Contact", href: "#faq" },
              { label: "Privacy Policy", href: "#faq" },
              { label: "Terms", href: "#faq" },
              { label: "Refund Policy", href: "#faq" },
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
                    <Link to="/auth" className="transition-colors hover:text-foreground">
                      Login
                    </Link>
                  </li>
                  <li>
                    <Link to="/auth" className="transition-colors hover:text-foreground">
                      Register
                    </Link>
                  </li>
                  <li>
                    <Link to="/auth" className="transition-colors hover:text-foreground">
                      Dashboard
                    </Link>
                  </li>
                </>
              )}
            </ul>
          </div>
        </div>

        <p className="mt-12 border-t border-border pt-6 text-xs text-muted-foreground">
          © 2026 AI Resume Builder. All rights reserved.
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
  items: { label: string; href: string }[];
}) {
  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-widest text-foreground">{title}</h3>
      <ul className="mt-4 space-y-2.5 text-sm text-muted-foreground">
        {items.map((i) => (
          <li key={i.label}>
            <a href={i.href} className="transition-colors hover:text-foreground">
              {i.label}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}