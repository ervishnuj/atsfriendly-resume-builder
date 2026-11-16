import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { adminListPayments, adminUpdatePayment, amIAdmin } from "@/lib/billing.functions";
import { formatINR, formatDate } from "@/lib/billing-shared";

export const Route = createFileRoute("/_authenticated/admin/payments")({
  head: () => ({
    meta: [
      { title: "Admin · Payments — ATS Resume Builder" },
      { name: "description", content: "Verify UPI payments and manage subscriptions." },
      { property: "og:title", content: "Admin · Payments" },
      { property: "og:description", content: "Verify UPI payments and manage subscriptions." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminPayments,
});

const statusColor: Record<string, string> = {
  SUCCESS: "bg-success-soft text-success-foreground",
  PENDING: "bg-warning-soft text-warning-foreground",
  CREATED: "bg-muted text-muted-foreground",
  FAILED: "bg-destructive/10 text-destructive",
  REFUNDED: "bg-accent text-primary",
};

function AdminPayments() {
  const { user } = Route.useRouteContext();
  const queryClient = useQueryClient();
  const checkAdmin = useServerFn(amIAdmin);
  const list = useServerFn(adminListPayments);
  const update = useServerFn(adminUpdatePayment);
  const [status, setStatus] = useState("PENDING");
  const [search, setSearch] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const { data: admin, isLoading: checking } = useQuery({
    queryKey: ["am-i-admin", user.id],
    queryFn: () => checkAdmin(),
  });
  const { data, isLoading } = useQuery({
    queryKey: ["admin-payments", user.id, status],
    queryFn: () => list({ data: { status: status as never, planName: "ALL" } }),
    enabled: admin?.isAdmin === true,
  });

  const act = async (paymentId: string, next: "SUCCESS" | "FAILED" | "REFUNDED") => {
    setBusyId(paymentId);
    try {
      await update({ data: { paymentId, status: next } });
      await queryClient.invalidateQueries({ queryKey: ["admin-payments"] });
      toast.success(
        next === "SUCCESS" ? "Payment approved and subscription activated." : `Payment marked ${next}.`,
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Action failed");
    } finally {
      setBusyId(null);
    }
  };

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!admin?.isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6">
        <Card className="max-w-md p-8 text-center">
          <h1 className="text-xl font-semibold">Admin access only</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            This dashboard is restricted to the application administrator.
          </p>
          <Button asChild className="mt-4">
            <Link to="/builder">Back to builder</Link>
          </Button>
        </Card>
      </div>
    );
  }

  const rows = (data?.payments ?? []).filter((p) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      p.email.toLowerCase().includes(q) ||
      (p.reference ?? "").toLowerCase().includes(q) ||
      p.plan.toLowerCase().includes(q)
    );
  });

  const stats = data?.stats;

  return (
    <div className="min-h-screen bg-muted/30">
      <Toaster richColors position="top-right" />
      <header className="border-b border-border bg-background">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <h1 className="text-lg font-semibold tracking-tight">Admin · Payments</h1>
          <div className="flex gap-2">
            <Button asChild variant="outline">
              <Link to="/admin/upi-config">UPI settings</Link>
            </Button>
            <Button asChild variant="ghost">
              <Link to="/builder">Builder</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-6 px-6 py-8">
        <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {[
            { label: "Total revenue", value: stats ? formatINR(stats.totalRevenue) : "—" },
            { label: "Successful", value: stats?.success ?? "—" },
            { label: "Pending", value: stats?.pending ?? "—" },
            { label: "Active subs", value: stats?.activeSubscriptions ?? "—" },
            { label: "Expired subs", value: stats?.expiredSubscriptions ?? "—" },
          ].map((s) => (
            <Card key={s.label} className="p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">{s.label}</p>
              <p className="mt-1 text-2xl font-semibold">{s.value}</p>
            </Card>
          ))}
        </div>

        <Card className="p-6">
          <div className="flex flex-wrap items-center gap-3">
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {["ALL", "PENDING", "SUCCESS", "FAILED", "REFUNDED", "CREATED"].map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search email, reference or plan"
              className="max-w-xs"
            />
          </div>

          <div className="mt-5 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && (
                  <TableRow>
                    <TableCell colSpan={7}>
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                )}
                {!isLoading && rows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-sm text-muted-foreground">
                      No payments match this filter.
                    </TableCell>
                  </TableRow>
                )}
                {rows.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>{formatDate(p.date)}</TableCell>
                    <TableCell className="text-sm">{p.email}</TableCell>
                    <TableCell>{p.plan}</TableCell>
                    <TableCell>{formatINR(p.amount)}</TableCell>
                    <TableCell className="font-mono text-xs">{p.reference ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={statusColor[p.status] ?? ""}>
                        {p.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          disabled={busyId === p.id || p.status === "SUCCESS"}
                          onClick={() => act(p.id, "SUCCESS")}
                        >
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busyId === p.id || p.status === "FAILED"}
                          onClick={() => act(p.id, "FAILED")}
                        >
                          Reject
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={busyId === p.id || p.status !== "SUCCESS"}
                          onClick={() => act(p.id, "REFUNDED")}
                        >
                          Refund
                        </Button>
                      </div>
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