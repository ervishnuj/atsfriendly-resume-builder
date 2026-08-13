import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

const TITLE = "Login | AI Resume Builder";
const DESCRIPTION =
  "Sign in to your AI Resume Builder account to create ATS-friendly resumes tailored to any job description.";

export const Route = createFileRoute("/login")({
  ssr: false,
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LoginPage,
});

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<{ email?: string; password?: string }>({});

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/builder", replace: true });
    });
  }, [navigate]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    const errors: { email?: string; password?: string } = {};
    if (!EMAIL_RE.test(email.trim())) errors.email = "Please enter a valid email address.";
    if (!password) errors.password = "Please enter your password.";
    setFieldError(errors);
    if (Object.keys(errors).length > 0) return;

    setLoading(true);
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (signInError) {
        setError(
          /invalid login credentials/i.test(signInError.message)
            ? "Invalid email or password."
            : /confirm/i.test(signInError.message)
              ? "Please confirm your email address before signing in."
              : signInError.message,
        );
        return;
      }
      navigate({ to: "/builder", replace: true });
    } catch {
      setError("Unable to connect to the server. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  const signInWithGoogle = async () => {
    setError(null);
    setGoogleLoading(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      setError(result.error.message ?? "Unable to sign in right now. Please try again.");
      setGoogleLoading(false);
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/builder", replace: true });
  };

  return (
    <div className="grid min-h-screen bg-muted/30 lg:grid-cols-2">
      <section className="hidden flex-col justify-center bg-hero-glow px-12 py-16 lg:flex">
        <Link to="/">
          <BrandLogo className="h-11" />
        </Link>
        <h1 className="mt-10 max-w-md text-4xl font-bold leading-tight tracking-tight">
          Build a Resume That Gets Noticed.
        </h1>
        <p className="mt-4 max-w-md text-muted-foreground">
          Create an ATS-friendly resume tailored to your next opportunity.
        </p>
      </section>

      <section className="flex items-center justify-center px-5 py-12">
        <Card className="w-full max-w-md p-8">
          <div className="lg:hidden">
            <Link to="/">
              <BrandLogo className="mx-auto h-10" />
            </Link>
          </div>
          <h2 className="mt-6 text-2xl font-semibold tracking-tight lg:mt-0">Sign in</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Welcome back. Enter your details to continue.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1.5"
                aria-invalid={Boolean(fieldError.email)}
              />
              {fieldError.email && (
                <p className="mt-1 text-xs text-destructive">{fieldError.email}</p>
              )}
            </div>

            <div>
              <Label htmlFor="password">Password</Label>
              <div className="relative mt-1.5">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  aria-invalid={Boolean(fieldError.password)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted-foreground hover:text-foreground"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {fieldError.password && (
                <p className="mt-1 text-xs text-destructive">{fieldError.password}</p>
              )}
            </div>

            {error && (
              <p role="alert" className="rounded-md bg-destructive/10 p-2.5 text-sm text-destructive">
                {error}
              </p>
            )}

            <Button type="submit" disabled={loading} className="w-full gap-2">
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {loading ? "Signing in..." : "Login"}
            </Button>
          </form>

          <div className="mt-4 flex items-center justify-between text-sm">
            <Link to="/forgot-password" className="text-muted-foreground hover:text-foreground">
              Forgot Password
            </Link>
            <Link to="/register" className="font-medium text-brand hover:underline">
              Create Account
            </Link>
          </div>

          <div className="my-6 flex items-center gap-3 text-xs uppercase text-muted-foreground">
            <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
          </div>

          <Button
            variant="outline"
            className="w-full gap-2"
            onClick={signInWithGoogle}
            disabled={googleLoading}
          >
            {googleLoading && <Loader2 className="h-4 w-4 animate-spin" />}
            Continue with Google
          </Button>
        </Card>
      </section>
    </div>
  );
}
