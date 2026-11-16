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
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  adminPartnerReports,
  adminListCommissions,
  adminSettleCommission,
  adminListPartners,
} from "@/lib/partners.functions";
import { amIAdmin } from "@/lib/billing.functions";
import { formatINR, formatDate } from "@/lib/billing-shared";

export const Route = createFileRoute("/_authenticated/admin/partner-reports")({
  head: () => ({
    meta: [
      { title: "Admin · Partner Reports — ATS Resume Builder" },
      { name: "description", content: "Partner revenue, credit usage and commission settlement reports." },
      { property: "og:title", content: "Admin · Partner Reports" },
      { property: "og:description", content: "Partner revenue, credit usage and commission settlement reports." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminPartnerReports,
});

function AdminPartnerReports() {
  const { user } = Route.useRouteContext();
  const queryClient = useQueryClient();
  const checkAdmin = useServerFn(amIAdmin);
  const getReports = useServerFn(adminPartnerReports);
  const listCommissions = useServerFn(adminListCommissions);
  const settle = useServerFn(adminSettleCommission);
  const listPartners = useServerFn(adminListPartners);
  const [month, setMonth] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const { data: admin, isLoading: checking } = useQuery({
    queryKey: ["am-i-admin", user.id],
    queryFn: () => checkAdmin(),
  });
  const { data: reports, isLoading } = useQuery({
    queryKey: ["admin-partner-reports"],
    queryFn: () => getReports(),
    enabled: admin?.isAdmin === true,
  });
  const { data: commissions } = useQuery({
    queryKey: ["admin-commissions", month],
    queryFn: () => listCommissions({ data: { month: month || undefined } }),
    enabled: admin?.isAdmin === true,
  });
  const { data: partners } = useQuery({
    queryKey: ["admin-partners", user.id],
    queryFn: () => listPartners(),
    enabled: admin?.isAdmin === true,
  });

  const partnerName = (id: string) =>
    (partners ?? []).find((p) => p.id === id)?.businessName ?? id.slice(0, 8);

  const settleRow = async (id: string) => {
    setBusyId(id);
    try {
      await settle({ data: { id } });
      await queryClient.invalidateQueries({ queryKey: ["admin-commissions"] });
      toast.success("Commission marked as settled.");
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
          <Button asChild className="mt-4">
            <Link to="/builder">Back to builder</Link>
          </Button>
        </Card>
      </div>
    );
  }

  const stats = reports
    ? [
        { label: "Active partners", value: `${reports.activePartners} / ${reports.totalPartners}` },
        { label: "Credits sold (paid)", value: reports.creditsSold },
        { label: "Credits consumed", value: reports.creditsConsumed },
        { label: "Revenue collected", value: formatINR(reports.revenueCollected) },
        { label: "Outstanding payments", value: formatINR(reports.outstandingPayments) },
        { label: "Estimated generation cost", value: formatINR(reports.estimatedApiCost) },
        { label: "Gross owner profit (est.)", value: formatINR(reports.grossOwnerProfit) },
        { label: "Commission receivable", value: formatINR(reports.commissionReceivable) },
      ]
    : [];

  return (
    <div className="min-h-screen bg-muted/30">
      <Toaster richColors position="top-right" />
      <header className="border-b border-border bg-background">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-6 py-4">
          <h1 className="text-lg font-semibold tracking-tight">Admin · Partner Reports</h1>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm">
              <Link to="/admin/partners">Partners</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link to="/admin/partner-packages">Packages</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link to="/admin/partner-billing">Billing</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-6 px-6 py-8">
        <p className="text-sm text-muted-foreground">
          Revenue collected counts only verified payments. Outstanding payments and unsettled
          commissions are shown separately and are never treated as realized revenue.
        </p>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {isLoading && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
          {stats.map((s) => (
            <Card key={s.label} className="p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">{s.label}</p>
              <p className="mt-1 text-2xl font-semibold">{s.value}</p>
            </Card>
          ))}
        </div>

        <Card className="p-6">
          <h2 className="text-base font-semibold">Partner-wise margins</h2>
          <div className="mt-4 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Partner</TableHead>
                  <TableHead>Resumes sold</TableHead>
                  <TableHead>Gross margin</TableHead>
                  <TableHead>Owner share</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(reports?.perPartner ?? []).length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-sm text-muted-foreground">
                      No completed partner sales yet.
                    </TableCell>
                  </TableRow>
                )}
                {(reports?.perPartner ?? []).map((row) => (
                  <TableRow key={row.partnerId}>
                    <TableCell className="font-medium">{partnerName(row.partnerId)}</TableCell>
                    <TableCell>{row.sales}</TableCell>
                    <TableCell>{formatINR(row.margin)}</TableCell>
                    <TableCell>{formatINR(row.share)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold">Commission ledger</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Owner share per sold resume. Settlement is manual — nothing is auto-deducted.
              </p>
            </div>
            <div>
              <Label htmlFor="c-month" className="text-xs">
                Settlement month
              </Label>
              <Input
                id="c-month"
                type="month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="w-44"
              />
            </div>
          </div>
          <div className="mt-4 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Partner</TableHead>
                  <TableHead>Share</TableHead>
                  <TableHead>Month</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(commissions ?? []).length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-sm text-muted-foreground">
                      No commission entries for this filter.
                    </TableCell>
                  </TableRow>
                )}
                {(commissions ?? []).map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="text-sm">{formatDate(c.createdAt)}</TableCell>
                    <TableCell className="text-sm">{c.partnerName}</TableCell>
                    <TableCell>
                      {formatINR(c.ownerShare)} <span className="text-xs text-muted-foreground">({c.sharePercent}%)</span>
                    </TableCell>
                    <TableCell className="text-sm">{c.settlementMonth.slice(0, 7)}</TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={
                          c.status === "settled"
                            ? "bg-success-soft text-success-foreground"
                            : c.status === "voided"
                              ? "bg-muted text-muted-foreground"
                              : "bg-warning-soft text-warning-foreground"
                        }
                      >
                        {c.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {c.status === "pending" && (
                        <Button size="sm" variant="outline" disabled={busyId === c.id} onClick={() => settleRow(c.id)}>
                          Mark settled
                        </Button>
                      )}
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
