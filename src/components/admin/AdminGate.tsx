import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { amIAdmin } from "@/lib/billing.functions";

/** UI gate only; every admin server function re-checks authorization. */
export function AdminGate({ userId, children }: { userId: string; children: ReactNode }) {
  const check = useServerFn(amIAdmin);
  const { data, isLoading } = useQuery({ queryKey: ["am-i-admin", userId], queryFn: () => check() });
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center" role="status" aria-label="Loading">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!data?.isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6">
        <Card className="max-w-md p-8 text-center">
          <h1 className="text-xl font-semibold">Admin access only</h1>
          <p className="mt-2 text-sm text-muted-foreground">This page is restricted to the application administrator.</p>
          <Button asChild className="mt-4"><Link to="/builder">Back to builder</Link></Button>
        </Card>
      </div>
    );
  }
  return <>{children}</>;
}

export function AdminNav() {
  const links = [
    { to: "/admin/monitoring", label: "Monitoring" },
    { to: "/admin/support", label: "Support" },
    { to: "/admin/payments", label: "Payments" },
    { to: "/admin/partners", label: "Partners" },
  ] as const;
  return (
    <nav aria-label="Admin" className="flex flex-wrap gap-2">
      {links.map((l) => (
        <Button key={l.to} asChild variant="outline" size="sm"><Link to={l.to}>{l.label}</Link></Button>
      ))}
    </nav>
  );
}
