import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getMyPartnerDashboard, setMySellingPrice } from "@/lib/partners.functions";
import { formatINR, formatDate } from "@/lib/billing-shared";
import { grossMargin, ownerShare, partnerRetainedMargin, validateSellingPrice } from "@/lib/partner-math";

export const Route = createFileRoute("/_authenticated/partner/dashboard")({
  head: () => ({
    meta: [
      { title: "Partner Dashboard — ATS Resume Builder" },
      { name: "description", content: "Your reseller credits, usage, sales and margins." },
      { property: "og:title", content: "Partner Dashboard" },
      { property: "og:description", content: "Your reseller credits, usage, sales and margins." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PartnerDashboard,
});

function PartnerDashboard() {
  const { user } = Route.useRouteContext();
  const queryClient = useQueryClient();
  const getDashboard = useServerFn(getMyPartnerDashboard);
  const savePrice = useServerFn(setMySellingPrice);
  const [priceInput, setPriceInput] = useState("");
  const [savingPrice, setSavingPrice] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ["partner-dashboard", user.id],
    queryFn: () => getDashboard(),
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6">
        <Card className="max-w-md p-8 text-center">
          <h1 className="text-xl font-semibold">No partner account linked</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            This login is not linked to a partner account. If you recently joined as a partner,
            ask the administrator to create your partner profile with this login's email address.
          </p>
          <Button asChild className="mt-4">
            <Link to="/builder">Back to builder</Link>
          </Button>
        </Card>
      </div>
    );
  }

  const { partner, usage, wallet, totals, settings, recentTransactions } = data;
  const remainingToday = Math.max(usage.dailyLimit - usage.usedToday, 0);
  const usedPct = usage.dailyLimit > 0 ? Math.min((usage.usedToday / usage.dailyLimit) * 100, 100) : 0;

  const previewPrice = priceInput.trim() === "" ? null : Number(priceInput);
  const priceCheck =
    previewPrice === null
      ? null
      : validateSellingPrice(previewPrice, settings.minSellingPrice, settings.maxSellingPrice);
  const marginPreview =
    previewPrice !== null && priceCheck?.ok
      ? {
          margin: grossMargin(previewPrice, wallet.avgCostPerCredit),
          share: ownerShare(previewPrice, wallet.avgCostPerCredit, settings.ownerSharePercent),
          retained: partnerRetainedMargin(previewPrice, wallet.avgCostPerCredit, settings.ownerSharePercent),
        }
      : null;

  const submitPrice = async () => {
    if (previewPrice === null || !priceCheck?.ok) return;
    setSavingPrice(true);
    try {
      await savePrice({ data: { price: previewPrice } });
      await queryClient.invalidateQueries({ queryKey: ["partner-dashboard"] });
      toast.success("Customer price saved.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSavingPrice(false);
    }
  };

  return (
    <div className="min-h-screen bg-muted/30">
      <Toaster richColors position="top-right" />
      <header className="border-b border-border bg-background">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-6 py-4">
          <div>
            <h1 className="text-lg font-semibold tracking-tight">{partner.businessName}</h1>
            <p className="text-xs text-muted-foreground">
              Partner code <span className="font-mono">{partner.partnerCode}</span>
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm">
              <Link to="/partner/credits">Buy credits</Link>
            </Button>
            <Button asChild variant="ghost" size="sm">
              <Link to="/builder">Builder</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-6 px-6 py-8">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Prepaid credits left</p>
            <p className="mt-1 text-2xl font-semibold">{usage.balance}</p>
            <p className="text-xs text-muted-foreground">
              {wallet.lifetimePurchased} purchased · {wallet.lifetimeConsumed} used
            </p>
          </Card>
          <Card className="p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Used today</p>
            <p className="mt-1 text-2xl font-semibold">
              {usage.usedToday} <span className="text-base font-normal text-muted-foreground">/ {usage.dailyLimit}</span>
            </p>
            <Progress value={usedPct} className="mt-2 h-2" />
            <p className="mt-1 text-xs text-muted-foreground">{remainingToday} remaining today (resets at midnight IST)</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Resumes generated</p>
            <p className="mt-1 text-2xl font-semibold">{totals.resumesGenerated}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Revenue from your customers</p>
            <p className="mt-1 text-2xl font-semibold">{formatINR(totals.revenue)}</p>
          </Card>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Card className="p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Your gross margin</p>
            <p className="mt-1 text-xl font-semibold">{formatINR(totals.grossMargin)}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Owner share ({settings.ownerSharePercent}%)
            </p>
            <p className="mt-1 text-xl font-semibold">{formatINR(totals.ownerShare)}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Your retained margin</p>
            <p className="mt-1 text-xl font-semibold">{formatINR(totals.grossMargin - totals.ownerShare)}</p>
          </Card>
        </div>

        <Card className="p-6">
          <h2 className="text-base font-semibold">Your customer price</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Current price:{" "}
            <strong>{partner.sellingPrice === null ? "Not set" : formatINR(partner.sellingPrice)}</strong> per
            resume. Allowed range: {formatINR(settings.minSellingPrice)} – {formatINR(settings.maxSellingPrice)}.
          </p>
          <div className="mt-4 flex flex-wrap items-end gap-3">
            <div>
              <Label htmlFor="sell-price">New price (₹)</Label>
              <Input
                id="sell-price"
                type="number"
                min={settings.minSellingPrice}
                max={settings.maxSellingPrice}
                value={priceInput}
                onChange={(e) => setPriceInput(e.target.value)}
                placeholder={`${settings.minSellingPrice}–${settings.maxSellingPrice}`}
                className="w-40"
              />
            </div>
            <Button onClick={submitPrice} disabled={savingPrice || previewPrice === null || !priceCheck?.ok}>
              {savingPrice && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
              Save price
            </Button>
          </div>
          {previewPrice !== null && priceCheck && !priceCheck.ok && (
            <p className="mt-2 text-sm text-destructive">
              Price must be between {formatINR(settings.minSellingPrice)} and {formatINR(settings.maxSellingPrice)}.
            </p>
          )}
          {marginPreview && (
            <div className="mt-4 rounded-md border border-border bg-muted/40 p-4 text-sm">
              <p className="font-medium">Estimated margin per resume (before costs you incur locally):</p>
              <ul className="mt-2 space-y-1 text-muted-foreground">
                <li>Your wholesale cost per credit: {formatINR(wallet.avgCostPerCredit)}</li>
                <li>Gross margin: {formatINR(marginPreview.margin)}</li>
                <li>
                  Owner share ({settings.ownerSharePercent}%): {formatINR(marginPreview.share)}
                </li>
                <li>
                  <strong className="text-foreground">You keep: {formatINR(marginPreview.retained)}</strong>
                </li>
              </ul>
              <p className="mt-2 text-xs text-muted-foreground">
                This is an estimate based on your last purchase price, not a guaranteed profit.
              </p>
            </div>
          )}
        </Card>

        <Card className="p-6">
          <h2 className="text-base font-semibold">Recent transactions</h2>
          <div className="mt-4 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Credits</TableHead>
                  <TableHead>Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentTransactions.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-sm text-muted-foreground">
                      No transactions yet. Buy a credit package to get started.
                    </TableCell>
                  </TableRow>
                )}
                {recentTransactions.map((t, i) => (
                  <TableRow key={`${t.createdAt}-${i}`}>
                    <TableCell className="text-sm">{formatDate(t.createdAt)}</TableCell>
                    <TableCell className="capitalize">{t.kind}</TableCell>
                    <TableCell>{t.credits > 0 ? `+${t.credits}` : t.credits}</TableCell>
                    <TableCell>{t.amountInr === null ? "—" : formatINR(t.amountInr)}</TableCell>
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
