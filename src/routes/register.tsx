import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { track } from "@/lib/analytics-events";
import { useEffect, useState, type FormEvent } from "react";
import { CheckCircle2, Eye, EyeOff, Loader2 } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

const TITLE = "Create Account | AI Resume Builder";
const DESCRIPTION =
  "Create your AI Resume Builder account and start generating ATS-friendly resumes tailored to each job description.";

export const Route = createFileRoute("/register")({
  ssr: false,
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: RegisterPage,
});

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Errors = Partial<Record<"fullName" | "email" | "password" | "confirm", string>>;

function RegisterPage() {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmSent, setConfirmSent] = useState(false);
  const [errors, setErrors] = useState<Errors>({});

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/builder", replace: true });
    });
  }, [navigate]);

  const validate = (): Errors => {
    const e: Errors = {};
    if (fullName.trim().length < 2) e.fullName = "Please enter your full name.";
    if (!EMAIL_RE.test(email.trim())) e.email = "Please enter a valid email address.";
    if (password.length < 8) e.password = "Password must be at least 8 characters.";
    else if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password))
      e.password = "Password must include at least one letter and one number.";
    if (confirm !== password) e.confirm = "Passwords do not match.";
    return e;
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    const next = validate();
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setLoading(true);
    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: window.location.origin,
          data: { full_name: fullName.trim() },
        },
      });
      if (signUpError) {
        setError(
          /already registered|already exists/i.test(signUpError.message)
            ? "An account with this email already exists. Please sign in instead."
            : signUpError.message,
        );
        return;
      }
      track("SIGNUP_COMPLETED");
      if (data.session) {
        navigate({ to: "/builder", replace: true });
        return;
      }
      setConfirmSent(true);
    } catch {
      setError("Unable to connect to the server. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-5 py-12">
      <Card className="w-full max-w-md border-t-4 border-t-primary p-6 sm:p-8">
        <Link to="/">
          <BrandLogo className="mx-auto h-10" />
        </Link>

        {confirmSent ? (
          <div className="mt-8 text-center">
            <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-brand" />
            <h1 className="mt-4 text-xl font-semibold">Confirm your email</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              We sent a confirmation link to <span className="font-medium">{email}</span>. Click it
              to activate your account, then sign in.
            </p>
            <Button asChild className="mt-6 w-full">
              <Link to="/login">Go to login</Link>
            </Button>
          </div>
        ) : (
          <>
            <h1 className="mt-6 text-2xl font-semibold tracking-tight">Create Your Resume Profile</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Your profile stays private to your account.
            </p>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
              <div>
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  value={fullName}
                  autoComplete="name"
                  onChange={(e) => setFullName(e.target.value)}
                  className="mt-1.5"
                />
                {errors.fullName && (
                  <p className="mt-1 text-xs text-destructive">{errors.fullName}</p>
                )}
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1.5"
                />
                {errors.email && <p className="mt-1 text-xs text-destructive">{errors.email}</p>}
              </div>
              <div>
                <Label htmlFor="password">Password</Label>
                <div className="relative mt-1.5">
                  <Input
                    id="password"
                    type={show ? "text" : "password"}
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShow((v) => !v)}
                    className="absolute inset-y-0 right-0 text-muted-foreground"
                    aria-label={show ? "Hide password" : "Show password"}
                  >
                    {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                {errors.password && (
                  <p className="mt-1 text-xs text-destructive">{errors.password}</p>
                )}
              </div>
              <div>
                <Label htmlFor="confirm">Confirm Password</Label>
                <Input
                  id="confirm"
                  type={show ? "text" : "password"}
                  autoComplete="new-password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className="mt-1.5"
                />
                {errors.confirm && <p className="mt-1 text-xs text-destructive">{errors.confirm}</p>}
              </div>

              {error && (
                <p role="alert" className="rounded-md bg-destructive/10 p-2.5 text-sm text-destructive">
                  {error}
                </p>
              )}

              <Button type="submit" disabled={loading} className="w-full gap-2">
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                {loading ? "Creating account..." : "Create Account"}
              </Button>
            </form>

            <p className="mt-5 text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link to="/login" className="inline-flex min-h-11 items-center px-1 font-medium text-brand hover:underline">
                Login
              </Link>
            </p>
          </>
        )}
      </Card>
    </div>
  );
}
