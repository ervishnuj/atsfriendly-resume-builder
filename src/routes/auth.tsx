import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Sign in — ATS Resume Builder" },
      {
        name: "description",
        content:
          "Sign in with Google to build ATS-optimized resumes and sync your profile across devices.",
      },
      { property: "og:title", content: "Sign in — ATS Resume Builder" },
      {
        property: "og:description",
        content: "Sign in with Google to access your ATS Resume Builder profile.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/builder", replace: true });
    });
  }, [navigate]);

  const signIn = async () => {
    setError(null);
    setLoading(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      setError(result.error.message ?? "Sign-in failed. Please try again.");
      setLoading(false);
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/builder", replace: true });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
      <Card className="w-full max-w-sm p-8 text-center">
        <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <FileText className="h-6 w-6" />
        </div>
        <h1 className="text-xl font-semibold tracking-tight">Sign in to continue</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Your resume profile is saved to your account and synced across devices.
        </p>
        <Button onClick={signIn} disabled={loading} className="mt-6 w-full gap-2">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Continue with Google
        </Button>
        {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
      </Card>
    </div>
  );
}
