import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Crown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getCurrentSubscription, getPaymentHistory } from "@/lib/billing.functions";
import { formatINR, formatDate } from "@/lib/billing-shared";

export const Route = createFileRoute("/_authenticated/subscription")({
  head: () => ({
    meta: [
      { title: "My Subscription — ATS Resume Builder" },
      {
        name: "description",
        content: "View your active plan, validity dates and complete UPI payment history.",
      },
      { property: "og:title", content: "My Subscription — ATS Resume Builder" },
      { property: "og:description", content: "Your plan status and payment history." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SubscriptionPage,
});

const statusColor: Record<string, string> = {
  SUCCESS: "bg-emerald-100 text-emerald-800",
  PENDING: "bg-amber-100 text-amber-900",
  CREATED: "bg-muted text-muted-foreground",
  FAILED: "bg-destructive/10 text-destructive",
  REFUNDED: "bg-blue-100 text-blue-800",
};

function SubscriptionPage() {
  const fetchSub = useServerFn(getCurrentSubscription);
  const fetchPayments = useServerFn(getPaymentHistory);
  const { data: subscription, isLoading } = useQuery({
    queryKey: ["subscription"],
    queryFn: () => fetchSub(),
  });
  const { data: payments } = useQuery({ queryKey: ["payments"], queryFn: () => fetchPayments() });

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b border-border bg-background">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <h1 className="text-lg font-semibold tracking-tight">My subscription</h1>
          <div className="flex gap-2">
            <Button asChild variant="outline">
              <Link to="/payment">Plans</Link>
            </Button>
            <Button asChild variant="ghost">
              <Link to="/builder">Back to builder</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-6 px-6 py-10">
        <Card className="p-6">
          {isLoading ? (
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          ) : subscription?.active ? (
            <div className="space-y-2">
              <Badge className="gap-1 bg-emerald-100 text-emerald-800 hover:bg-emerald-100">
                <Crown className="h-3.5 w-3.5" /> Active
              </Badge>
              <h2 className="text-2xl font-semibold">{subscription.planName}</h2>
              <p className="text-sm text-muted-foreground">
                Valid {formatDate(subscription.startDate)} → {formatDate(subscription.endDate)} ·{" "}
                {subscription.daysRemaining} day{subscription.daysRemaining === 1 ? "" : "s"} remaining
              </p>
              <Button asChild variant="outline" className="mt-3">
                <Link to="/payment">Renew or upgrade</Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <h2 className="text-xl font-semibold">No active subscription</h2>
              <p className="text-sm text-muted-foreground">
                Resume generation and PDF downloads need an active plan.
              </p>
              <Button asChild>
                <Link to="/payment">View plans</Link>
              </Button>
            </div>
          )}
        </Card>

        <Card className="p-6">
          <h2 className="text-sm font-semibold">Payment history</h2>
          <div className="mt-4 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(payments ?? []).length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-sm text-muted-foreground">
                      No payments yet.
                    </TableCell>
                  </TableRow>
                )}
                {(payments ?? []).map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>{formatDate(p.date)}</TableCell>
                    <TableCell>{p.plan}</TableCell>
                    <TableCell>{formatINR(p.amount)}</TableCell>
                    <TableCell>{p.paymentMethod}</TableCell>
                    <TableCell className="font-mono text-xs">{p.upiReference ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={statusColor[p.status] ?? ""}>
                        {p.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      </main>
    </div>
  );
}