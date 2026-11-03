import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  adminListPartnerInvoices,
  adminVerifyPartnerInvoice,
  adminGetTaxSettings,
  adminUpdateTaxSettings,
  adminGetPartnerSettings,
  adminUpdatePartnerSettings,
} from "@/lib/partners.functions";
import { amIAdmin } from "@/lib/billing.functions";
import { formatINR, formatDate } from "@/lib/billing-shared";

export const Route = createFileRoute("/_authenticated/admin/partner-billing")({
  head: () => ({
    meta: [
      { title: "Admin · Partner Billing — ATS Resume Builder" },
      { name: "description", content: "Verify partner invoices and manage tax and pricing settings." },
      { property: "og:title", content: "Admin · Partner Billing" },
      { property: "og:description", content: "Verify partner invoices and manage tax and pricing settings." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminPartnerBilling,
});

const statusColor: Record<string, string> = {
  paid: "bg-emerald-100 text-emerald-800",
  pending: "bg-amber-100 text-amber-900",
  cancelled: "bg-muted text-muted-foreground",
};

function AdminPartnerBilling() {
  const { user } = Route.useRouteContext();
  const queryClient = useQueryClient();
  const checkAdmin = useServerFn(amIAdmin);
  const listInvoices = useServerFn(adminListPartnerInvoices);
  const verifyInvoice = useServerFn(adminVerifyPartnerInvoice);
  const getTax = useServerFn(adminGetTaxSettings);
  const saveTax = useServerFn(adminUpdateTaxSettings);
  const getSettings = useServerFn(adminGetPartnerSettings);
  const saveSettings = useServerFn(adminUpdatePartnerSettings);

  const [busyId, setBusyId] = useState<string | null>(null);
  const [taxForm, setTaxForm] = useState({
    businessName: "TheResumeRocket",
    businessContact: "",
    businessAddress: "",
    gstin: "",
    confirmGstRegistered: false,
  });
  const [settingsForm, setSettingsForm] = useState({
    ownerSharePercent: "10",
    minSellingPrice: "39",
    maxSellingPrice: "99",
    estimatedGenerationCost: "0",
  });

  const { data: admin, isLoading: checking } = useQuery({
    queryKey: ["am-i-admin", user.id],
    queryFn: () => checkAdmin(),
  });
  const { data: invoices, isLoading } = useQuery({
    queryKey: ["admin-partner-invoices"],
    queryFn: () => listInvoices(),
    enabled: admin?.isAdmin === true,
  });
  const { data: tax } = useQuery({
    queryKey: ["admin-tax-settings"],
    queryFn: () => getTax(),
    enabled: admin?.isAdmin === true,
  });
  const { data: partnerSettings } = useQuery({
    queryKey: ["admin-partner-settings"],
    queryFn: () => getSettings(),
    enabled: admin?.isAdmin === true,
  });

  useEffect(() => {
    if (tax) {
      setTaxForm({
        businessName: tax.businessName,
        businessContact: tax.businessContact,
        businessAddress: tax.businessAddress,
        gstin: tax.gstin ?? "",
        confirmGstRegistered: tax.gstRegistered,
      });
    }
  }, [tax]);

  useEffect(() => {
    if (partnerSettings) {
      setSettingsForm({
        ownerSharePercent: String(partnerSettings.ownerSharePercent),
        minSellingPrice: String(partnerSettings.minSellingPrice),
        maxSellingPrice: String(partnerSettings.maxSellingPrice),
        estimatedGenerationCost: String(partnerSettings.estimatedGenerationCost),
      });
    }
  }, [partnerSettings]);

  const verify = async (invoiceId: string) => {
    setBusyId(invoiceId);
    try {
      await verifyInvoice({ data: { invoiceId } });
      await queryClient.invalidateQueries({ queryKey: ["admin-partner-invoices"] });
      toast.success("Payment verified — credits added to the partner wallet.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Verification failed");
    } finally {
      setBusyId(null);
    }
  };

  const submitTax = async () => {
    try {
      const result = await saveTax({
        data: {
          businessName: taxForm.businessName,
          businessContact: taxForm.businessContact,
          businessAddress: taxForm.businessAddress,
          gstin: taxForm.gstin.trim() === "" ? null : taxForm.gstin.trim(),
          confirmGstRegistered: taxForm.confirmGstRegistered,
        },
      });
      await queryClient.invalidateQueries({ queryKey: ["admin-tax-settings"] });
      toast.success(
        result.gstRegistered
          ? "Settings saved. GST collection remains off until a verified configuration is added."
          : "Settings saved. The business remains in unregistered-supplier mode — no GST is charged.",
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    }
  };

  const submitSettings = async () => {
    const share = Number(settingsForm.ownerSharePercent);
    const min = Number(settingsForm.minSellingPrice);
    const max = Number(settingsForm.maxSellingPrice);
    const cost = Number(settingsForm.estimatedGenerationCost);
    if (![share, min, max, cost].every(Number.isFinite)) {
      toast.error("Enter valid numbers for all settings.");
      return;
    }
    try {
      await saveSettings({
        data: { ownerSharePercent: share, minSellingPrice: min, maxSellingPrice: max, estimatedGenerationCost: cost },
      });
      await queryClient.invalidateQueries({ queryKey: ["admin-partner-settings"] });
      toast.success("Partner settings saved.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
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

  return (
    <div className="min-h-screen bg-muted/30">
      <Toaster richColors position="top-right" />
      <header className="border-b border-border bg-background">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-6 py-4">
          <h1 className="text-lg font-semibold tracking-tight">Admin · Partner Billing</h1>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm">
              <Link to="/admin/partners">Partners</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link to="/admin/partner-packages">Packages</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link to="/admin/partner-reports">Reports</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-6 px-6 py-8">
        <Card className="p-6">
          <h2 className="text-base font-semibold">Partner invoices</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Credits are added to a partner's wallet only after you verify payment.
          </p>
          <div className="mt-4 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Partner</TableHead>
                  <TableHead>Package</TableHead>
                  <TableHead>Total</TableHead>
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
                {!isLoading && (invoices ?? []).length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-sm text-muted-foreground">
                      No partner invoices yet.
                    </TableCell>
                  </TableRow>
                )}
                {(invoices ?? []).map((inv) => (
                  <TableRow key={inv.id}>
                    <TableCell>
                      <div className="font-mono text-xs">{inv.invoiceNumber}</div>
                      <div className="text-xs text-muted-foreground">{formatDate(inv.createdAt)}</div>
                    </TableCell>
                    <TableCell className="text-sm">{inv.partnerName}</TableCell>
                    <TableCell className="text-sm">
                      {inv.packageName} · {inv.credits} credits
                    </TableCell>
                    <TableCell>{formatINR(inv.total)}</TableCell>
                    <TableCell className="font-mono text-xs">{inv.paymentReference ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={statusColor[inv.paymentStatus] ?? ""}>
                        {inv.paymentStatus}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button asChild size="sm" variant="outline">
                          <Link to="/partner/invoice/$id" params={{ id: inv.id }}>
                            View
                          </Link>
                        </Button>
                        {inv.paymentStatus === "pending" && (
                          <Button size="sm" disabled={busyId === inv.id} onClick={() => verify(inv.id)}>
                            {busyId === inv.id && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
                            Verify payment
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="text-base font-semibold">Tax & business settings</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            The business is currently <strong>not registered under GST</strong>. Invoices are ordinary
            commercial invoices and never show a GST amount or GSTIN.
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="t-name">Business name on invoices</Label>
              <Input
                id="t-name"
                value={taxForm.businessName}
                onChange={(e) => setTaxForm({ ...taxForm, businessName: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="t-contact">Business contact details</Label>
              <Input
                id="t-contact"
                value={taxForm.businessContact}
                onChange={(e) => setTaxForm({ ...taxForm, businessContact: e.target.value })}
                placeholder="Email / phone shown on invoices"
              />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="t-address">Business address</Label>
              <Input
                id="t-address"
                value={taxForm.businessAddress}
                onChange={(e) => setTaxForm({ ...taxForm, businessAddress: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="t-gstin">GSTIN (only after real registration)</Label>
              <Input
                id="t-gstin"
                value={taxForm.gstin}
                onChange={(e) => setTaxForm({ ...taxForm, gstin: e.target.value })}
                placeholder="Leave empty while unregistered"
              />
            </div>
            <div className="flex items-end gap-2 pb-1">
              <Checkbox
                id="t-confirm"
                checked={taxForm.confirmGstRegistered}
                onCheckedChange={(v) => setTaxForm({ ...taxForm, confirmGstRegistered: v === true })}
              />
              <Label htmlFor="t-confirm" className="text-sm font-normal">
                I confirm the business is registered under GST and the GSTIN above is valid
              </Label>
            </div>
          </div>
          <Button className="mt-4" onClick={submitTax}>
            Save tax settings
          </Button>
        </Card>

        <Card className="p-6">
          <h2 className="text-base font-semibold">Partner pricing rules</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-4">
            <div>
              <Label htmlFor="s-share">Owner share of partner margin (%)</Label>
              <Input
                id="s-share"
                type="number"
                min={0}
                max={100}
                value={settingsForm.ownerSharePercent}
                onChange={(e) => setSettingsForm({ ...settingsForm, ownerSharePercent: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="s-min">Min customer price (₹)</Label>
              <Input
                id="s-min"
                type="number"
                min={1}
                value={settingsForm.minSellingPrice}
                onChange={(e) => setSettingsForm({ ...settingsForm, minSellingPrice: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="s-max">Max customer price (₹)</Label>
              <Input
                id="s-max"
                type="number"
                min={1}
                value={settingsForm.maxSellingPrice}
                onChange={(e) => setSettingsForm({ ...settingsForm, maxSellingPrice: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="s-cost">Estimated generation cost (₹/resume)</Label>
              <Input
                id="s-cost"
                type="number"
                min={0}
                value={settingsForm.estimatedGenerationCost}
                onChange={(e) => setSettingsForm({ ...settingsForm, estimatedGenerationCost: e.target.value })}
              />
            </div>
          </div>
          <Button className="mt-4" onClick={submitSettings}>
            Save pricing rules
          </Button>
        </Card>
      </main>
    </div>
  );
}
