import { Link } from "@tanstack/react-router";
import { AlertCircle, Clock, Info, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { paymentGateNotice, type PaymentGateStatus } from "@/lib/billing-shared";

type Props = {
  status: PaymentGateStatus;
  onDismiss?: () => void;
  className?: string;
};

/**
 * Persistent, page-level version of the payment gate toast so the user keeps
 * seeing what to do after a redirect or reload.
 */
export function PaymentGateBanner({ status, onDismiss, className }: Props) {
  const notice = paymentGateNotice(status);
  const tone =
    notice.tone === "info"
      ? "border-warning/40 bg-warning-soft dark:bg-warning-soft"
      : notice.tone === "warning"
        ? "border-primary/40 bg-accent dark:bg-accent"
        : "border-destructive/40 bg-destructive/5";
  const Icon = notice.tone === "info" ? Clock : notice.tone === "warning" ? Info : AlertCircle;

  return (
    <Card role="status" className={`flex items-start gap-3 p-4 ${tone} ${className ?? ""}`}>
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">{notice.title}</p>
        <p className="mt-1 text-sm text-muted-foreground">{notice.description}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button asChild size="sm" variant={notice.tone === "info" ? "outline" : "default"}>
            <Link to={notice.routeToPricing ? "/payment" : "/subscription"}>
              {notice.actionLabel}
            </Link>
          </Button>
          {!notice.routeToPricing && (
            <Button asChild size="sm" variant="ghost">
              <Link to="/payment">View plans</Link>
            </Button>
          )}
        </div>
      </div>
      {onDismiss && (
        <Button
          variant="ghost"
          size="sm"
          aria-label="Dismiss payment status"
          className="h-7 w-7 shrink-0 p-0"
          onClick={onDismiss}
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </Card>
  );
}
