import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { getPartnerInvoice } from "@/lib/partners.functions";
import { formatINR, formatDate } from "@/lib/billing-shared";
import { UNREGISTERED_SUPPLIER_NOTE } from "@/lib/partner-math";

export const Route = createFileRoute("/_authenticated/partner/invoice/$id")({
  head: () => ({
    meta: [
      { title: "Commercial Invoice — ATS Resume Builder" },
      { name: "description", content: "Commercial invoice / payment receipt." },
      { property: "og:title", content: "Commercial Invoice" },
      { property: "og:description", content: "Commercial invoice / payment receipt." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PartnerInvoicePage,
});

function PartnerInvoicePage() {
  const { id } = Route.useParams();
  const getInvoice = useServerFn(getPartnerInvoice);
  const { data: inv, isLoading, error } = useQuery({
    queryKey: ["partner-invoice", id],
    queryFn: () => getInvoice({ data: { invoiceId: id } }),
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !inv) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6">
        <Card className="max-w-md p-8 text-center">
          <h1 className="text-xl font-semibold">Invoice not available</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            This invoice does not exist or is not linked to your account.
          </p>
          <Button asChild className="mt-4">
            <Link to="/partner/credits">Back to credits</Link>
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 py-8">
      <div className="mx-auto max-w-3xl px-6">
        <div className="mb-4 flex justify-end gap-2 print:hidden">
          <Button variant="outline" onClick={() => window.print()}>
            <Printer className="mr-1 h-4 w-4" /> Print / Save as PDF
          </Button>
        </div>

        <Card className="p-8 print:border-0 print:shadow-none">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold">{inv.business.name}</h1>
              {inv.business.contact && <p className="text-sm text-muted-foreground">{inv.business.contact}</p>}
              {inv.business.address && (
                <p className="text-sm text-muted-foreground">{inv.business.address}</p>
              )}
            </div>
            <div className="text-right">
              <h2 className="text-lg font-semibold">Commercial Invoice</h2>
              <p className="font-mono text-sm">{inv.invoiceNumber}</p>
              <p className="text-sm text-muted-foreground">{formatDate(inv.createdAt)}</p>
            </div>
          </div>

          <Separator className="my-6" />

          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Billed to</h3>
              <p className="mt-1 font-medium">{inv.partnerName}</p>
              {inv.partnerContact.contactPerson && <p className="text-sm">{inv.partnerContact.contactPerson}</p>}
              {inv.partnerContact.location && <p className="text-sm">{inv.partnerContact.location}</p>}
              {inv.partnerContact.email && <p className="text-sm">{inv.partnerContact.email}</p>}
              {inv.partnerContact.phone && <p className="text-sm">{inv.partnerContact.phone}</p>}
              <p className="mt-1 text-xs text-muted-foreground">Partner code: {inv.partnerCode}</p>
            </div>
            <div className="sm:text-right">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Payment</h3>
              <p className="mt-1 text-sm capitalize">Status: {inv.paymentStatus}</p>
              {inv.paymentReference && <p className="text-sm">Reference: {inv.paymentReference}</p>}
              {inv.paidAt && <p className="text-sm">Paid on: {formatDate(inv.paidAt)}</p>}
            </div>
          </div>

          <div className="mt-8 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="py-2 pr-4">Description</th>
                  <th className="py-2 pr-4 text-right">Credits</th>
                  <th className="py-2 pr-4 text-right">Unit price</th>
                  <th className="py-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-border">
                  <td className="py-3 pr-4">{inv.packageName} — prepaid resume generation credits</td>
                  <td className="py-3 pr-4 text-right">{inv.credits}</td>
                  <td className="py-3 pr-4 text-right">{formatINR(inv.unitPrice)}</td>
                  <td className="py-3 text-right">{formatINR(inv.subtotal)}</td>
                </tr>
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={3} className="py-2 pr-4 text-right text-muted-foreground">
                    Subtotal
                  </td>
                  <td className="py-2 text-right">{formatINR(inv.subtotal)}</td>
                </tr>
                <tr className="font-semibold">
                  <td colSpan={3} className="py-2 pr-4 text-right">
                    Total payable
                  </td>
                  <td className="py-2 text-right">{formatINR(inv.total)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          <p className="mt-8 rounded-md border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
            {UNREGISTERED_SUPPLIER_NOTE}
          </p>

          <p className="mt-4 text-xs text-muted-foreground">
            This is a commercial invoice / payment receipt, not a GST tax invoice. No input tax credit can be
            claimed against this document.
          </p>
        </Card>
      </div>
    </div>
  );
}
