import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { Loader2, MailCheck } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

const TITLE = "Reset Password | AI Resume Builder";
const DESCRIPTION = "Reset the password for your AI Resume Builder account.";

export const Route = createFileRoute("/forgot-password")({
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
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("Please enter a valid email address.");
      return;
    }
    setError(null);
    setLoading(true);
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (resetError) {
      setError("Unable to send the reset link right now. Please try again.");
      return;
    }
    setSent(true);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-5 py-12">
      <Card className="w-full max-w-md p-8">
        <Link to="/">
          <BrandLogo className="mx-auto h-10" />
        </Link>
        {sent ? (
          <div className="mt-8 text-center">
            <MailCheck className="mx-auto h-10 w-10 text-emerald-brand" />
            <h1 className="mt-4 text-xl font-semibold">Check your inbox</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              If an account exists for {email}, we've sent a password reset link.
            </p>
            <Button asChild variant="outline" className="mt-6 w-full">
              <Link to="/login">Back to login</Link>
            </Button>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-6 space-y-4" noValidate>
            <h1 className="text-2xl font-semibold tracking-tight">Forgot your password?</h1>
            <p className="text-sm text-muted-foreground">
              Enter your email and we'll send you a reset link.
            </p>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1.5"
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" disabled={loading} className="w-full gap-2">
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {loading ? "Sending..." : "Send reset link"}
            </Button>
            <Button asChild variant="ghost" className="w-full">
              <Link to="/login">Back to login</Link>
            </Button>
          </form>
        )}
      </Card>
    </div>
  );
}
