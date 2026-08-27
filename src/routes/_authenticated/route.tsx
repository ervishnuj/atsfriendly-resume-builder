import { createFileRoute, Outlet, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    // Read the locally stored session first: it needs no network call, so a
    // flaky/blocked request can't throw during hydration and blank the page.
    let user = null;
    try {
      const { data } = await supabase.auth.getSession();
      user = data.session?.user ?? null;
      if (!user) {
        const res = await supabase.auth.getUser();
        user = res.data.user ?? null;
      }
    } catch {
      user = null;
    }
    if (!user) throw redirect({ to: "/login" });
    return { user };
  },
  pendingComponent: () => (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  ),
  errorComponent: AuthGateError,
  component: () => <Outlet />,
});

function AuthGateError() {
  const navigate = useNavigate();
  useEffect(() => {
    navigate({ to: "/login" });
  }, [navigate]);
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 text-center">
      <p className="text-sm text-muted-foreground">Checking your session…</p>
    </div>
  );
}
