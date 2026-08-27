import { createFileRoute, Outlet, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    // Read the locally stored session first: it needs no network call, so a
    // flaky/blocked request can't throw during hydration and blank the page.
    // The auth storage can also stall inside the editor preview iframe, so the
    // lookup is capped and falls back to the raw stored session.
    let user = null;
    try {
      const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), 2500));
      const session = await Promise.race([
        supabase.auth.getSession().then((r) => r.data.session ?? null),
        timeout,
      ]);
      user = session?.user ?? readStoredUser();
    } catch {
      user = readStoredUser();
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
