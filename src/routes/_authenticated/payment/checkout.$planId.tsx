import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { Loader2, QrCode, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { listPlans, getUpiConfig, submitUpiPayment } from "@/lib/billing.functions";
import { formatINR } from "@/lib/billing-shared";

export const Route = createFileRoute("/_authenticated/payment/checkout/$planId")({
  head: () => ({
    meta: [
      { title: "UPI Checkout — ATS Resume Builder" },
      {
        name: "description",
        content: "Pay for your ATS Resume Builder subscription over UPI and submit your transaction reference.",
      },
      { property: "og:title", content: "UPI Checkout — ATS Resume Builder" },
      { property: "og:description", content: "Complete your subscription payment over UPI." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CheckoutPage,
});

function CheckoutPage() {
  const { planId } = useParams({ from: "/_authenticated/payment/checkout/$planId" });
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fetchPlans = useServerFn(listPlans);
  const fetchUpi = useServerFn(getUpiConfig);
  const submit = useServerFn(submitUpiPayment);
  const [reference, setReference] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const { data: plans } = useQuery({ queryKey: ["plans"], queryFn: () => fetchPlans() });
  const { data: upi, isLoading } = useQuery({ queryKey: ["upi-config"], queryFn: () => fetchUpi() });
  const plan = plans?.find((p) => p.id === planId);

  const handleSubmit = async () => {
    if (reference.trim().length < 6) {
      toast.error("Enter the UPI transaction reference (at least 6 characters).");
      return;
    }
    setSubmitting(true);
    try {
      await submit({ data: { planId, upiReference: reference.trim() } });
      await queryClient.invalidateQueries({ queryKey: ["subscription"] });
      await queryClient.invalidateQueries({ queryKey: ["payments"] });
      toast.success("Payment submitted — awaiting verification.");
      void navigate({ to: "/subscription" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not submit payment");
    } finally {
      setSubmitting(false);
    }
  };

  const upiLink = upi
    ? `upi://pay?pa=${encodeURIComponent(upi.upiId)}&pn=${encodeURIComponent(upi.displayName || "ATS Resume Builder")}&am=${plan?.price ?? ""}&cu=INR`
    : "";

  return (
    <div className="min-h-screen bg-muted/30">
      <Toaster richColors position="top-right" />
      <header className="border-b border-border bg-background">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <h1 className="text-lg font-semibold tracking-tight">Complete your payment</h1>
          <Button asChild variant="outline">
            <Link to="/payment">Back to plans</Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-10">
        <Card className="p-6">
          {plan ? (
            <div className="flex items-baseline justify-between border-b border-border pb-4">
              <div>
                <p className="text-sm text-muted-foreground">Selected plan</p>
                <p className="text-lg font-semibold">{plan.planName}</p>
              </div>
              <p className="text-2xl font-semibold">{formatINR(plan.price)}</p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Loading plan…</p>
          )}

          <div className="mt-6 grid gap-6 sm:grid-cols-2">
            <div>
              <h2 className="text-sm font-semibold">Scan to pay</h2>
              {isLoading ? (
                <Loader2 className="mt-4 h-5 w-5 animate-spin text-muted-foreground" />
              ) : upi?.qrUrl ? (
                <img
                  src={upi.qrUrl}
                  alt="UPI QR code for subscription payment"
                  className="mt-3 w-48 rounded-md border border-border bg-background p-2"
                />
              ) : (
                <div className="mt-3 flex h-48 w-48 flex-col items-center justify-center gap-2 rounded-md border border-dashed border-border text-center text-xs text-muted-foreground">
                  <QrCode className="h-6 w-6" />
                  QR code not configured yet
                </div>
              )}
            </div>

            <div className="space-y-3">
              <div>
                <p className="text-sm font-semibold">UPI ID</p>
                <div className="mt-1 flex items-center gap-2">
                  <code className="rounded bg-muted px-2 py-1 text-sm">{upi?.upiId ?? "—"}</code>
                  {upi?.upiId && (
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        void navigator.clipboard.writeText(upi.upiId);
                        toast.success("UPI ID copied");
                      }}
                      aria-label="Copy UPI ID"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
              {upi?.upiId && plan && (
                <Button asChild variant="outline" className="w-full sm:hidden">
                  <a href={upiLink}>Open UPI app</a>
                </Button>
              )}
              <p className="text-sm text-muted-foreground">
                {upi?.instructions ||
                  "Pay the exact plan amount to the UPI ID above, then paste the transaction reference below. We verify manually and activate your plan."}
              </p>
            </div>
          </div>

          <div className="mt-8 border-t border-border pt-6">
            <Label htmlFor="upi-ref">UPI transaction reference / UTR</Label>
            <Input
              id="upi-ref"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="e.g. 402312345678"
              className="mt-2"
            />
            <Button onClick={handleSubmit} disabled={submitting || !plan} className="mt-4 gap-2">
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Submit payment for verification
            </Button>
          </div>
        </Card>
      </main>
    </div>
  );
}