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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  getMyPartnerPackages,
  requestPackagePurchase,
  getMyPartnerInvoices,
} from "@/lib/partners.functions";
import { formatINR, formatDate } from "@/lib/billing-shared";
import { costPerCredit } from "@/lib/partner-math";

export const Route = createFileRoute("/_authenticated/partner/credits")({
  head: () => ({
    meta: [
      { title: "Buy Credits — Partner — ATS Resume Builder" },
      { name: "description", content: "Prepaid reseller credit packages and your invoices." },
      { property: "og:title", content: "Buy Credits — Partner" },
      { property: "og:description", content: "Prepaid reseller credit packages and your invoices." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PartnerCredits,
});

const statusColor: Record<string, string> = {
  paid: "bg-success-soft text-success-foreground",
  pending: "bg-warning-soft text-warning-foreground",
  cancelled: "bg-muted text-muted-foreground",
};

function PartnerCredits() {
  const { user } = Route.useRouteContext();
  const queryClient = useQueryClient();
  const listPackages = useServerFn(getMyPartnerPackages);
  const purchase = useServerFn(requestPackagePurchase);
  const listInvoices = useServerFn(getMyPartnerInvoices);

  const [selected, setSelected] = useState<{ id: string; name: string; priceInr: number } | null>(null);
  const [reference, setReference] = useState("");
  const [busy, setBusy] = useState(false);

  const { data: packages, isLoading, error } = useQuery({
    queryKey: ["partner-packages", user.id],
    queryFn: () => listPackages(),
    retry: false,
  });
  const { data: invoices } = useQuery({
    queryKey: ["partner-invoices", user.id],
    queryFn: () => listInvoices(),
    retry: false,
  });

  const submitPurchase = async () => {
    if (!selected) return;
    setBusy(true);
    try {
      const result = await purchase({
        data: {
          packageId: selected.id,
          paymentReference: reference.trim(),
          idempotencyKey: crypto.randomUUID(),
        },
      });
      toast.success(
        `Invoice ${result.invoiceNumber} created for ${formatINR(result.total)}. Credits are added after payment verification.`,
      );
      setSelected(null);
      setReference("");
      await queryClient.invalidateQueries({ queryKey: ["partner-invoices"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Purchase failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-muted/30">
      <Toaster richColors position="top-right" />
      <header className="border-b border-border bg-background">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-6 py-4">
          <h1 className="text-lg font-semibold tracking-tight">Buy Credits</h1>
          <Button asChild variant="outline" size="sm">
            <Link to="/partner/dashboard">Dashboard</Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-6 px-6 py-8">
        {isLoading && (
          <div className="flex justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {error && (
          <Card className="mx-auto max-w-md p-8 text-center">
            <h2 className="text-xl font-semibold">No partner account linked</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Credit packages are only available to linked partner accounts.
            </p>
            <Button asChild className="mt-4">
              <Link to="/partner/dashboard">Partner dashboard</Link>
            </Button>
          </Card>
        )}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {(packages ?? []).map((p) => (
            <Card key={p.id} className="flex flex-col p-5">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold">{p.name}</h2>
                {p.negotiated && <Badge variant="secondary">Your price</Badge>}
              </div>
              <p className="mt-2 text-3xl font-semibold">{formatINR(p.priceInr)}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {p.credits} credits · {formatINR(costPerCredit(p.priceInr, p.credits))} per credit
              </p>
              {p.negotiated && (
                <p className="mt-1 text-xs text-muted-foreground line-through">{formatINR(p.basePriceInr)}</p>
              )}
              <Button className="mt-4" onClick={() => setSelected({ id: p.id, name: p.name, priceInr: p.priceInr })}>
                Buy {p.name}
              </Button>
            </Card>
          ))}
        </div>

        <Card className="p-6">
          <h2 className="text-base font-semibold">Your invoices</h2>
          <div className="mt-4 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Package</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">View</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(invoices ?? []).length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-sm text-muted-foreground">
                      No invoices yet.
                    </TableCell>
                  </TableRow>
                )}
                {(invoices ?? []).map((inv) => (
                  <TableRow key={inv.id}>
                    <TableCell>
                      <div className="font-mono text-xs">{inv.invoiceNumber}</div>
                      <div className="text-xs text-muted-foreground">{formatDate(inv.createdAt)}</div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {inv.packageName} · {inv.credits} credits
                    </TableCell>
                    <TableCell>{formatINR(inv.total)}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={statusColor[inv.paymentStatus] ?? ""}>
                        {inv.paymentStatus}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button asChild size="sm" variant="outline">
                        <Link to="/partner/invoice/$id" params={{ id: inv.id }}>
                          Open
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      </main>

      <Dialog open={selected !== null} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Buy {selected?.name}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Total payable: <strong>{selected ? formatINR(selected.priceInr) : ""}</strong>. Pay using the
            business's usual payment channel, then enter the payment reference below. Credits are added to
            your wallet after the administrator verifies the payment.
          </p>
          <div>
            <Label htmlFor="pay-ref">Payment reference (UPI ref / transaction ID)</Label>
            <Input
              id="pay-ref"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="e.g. 4231 5678 9012"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelected(null)} disabled={busy}>
              Cancel
            </Button>
            <Button onClick={submitPurchase} disabled={busy}>
              {busy && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
              Submit for verification
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
