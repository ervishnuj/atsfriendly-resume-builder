export type PlanStatus = "CREATED" | "PENDING" | "SUCCESS" | "FAILED" | "REFUNDED";

export const SUBSCRIPTION_REQUIRED = "SUBSCRIPTION_REQUIRED";

/** Client-facing gate codes for a user without an active entitlement. */
export type PaymentGateStatus =
  | "PAYMENT_PENDING"
  | "PAYMENT_FAILED"
  | "PAYMENT_CANCELED"
  | "NO_PAYMENT";

export type PaymentGateNotice = {
  status: PaymentGateStatus;
  tone: "info" | "warning" | "error";
  title: string;
  description: string;
  /** Whether the user should be sent to the pricing page automatically. */
  routeToPricing: boolean;
  actionLabel: string;
};

/** Map a raw payment row status to a client gate code. */
export function toPaymentGateStatus(raw: string | null | undefined): PaymentGateStatus {
  switch ((raw ?? "").toUpperCase()) {
    case "CREATED":
    case "PENDING":
      return "PAYMENT_PENDING";
    case "FAILED":
      return "PAYMENT_FAILED";
    case "CANCELLED":
    case "CANCELED":
    case "REFUNDED":
      return "PAYMENT_CANCELED";
    default:
      return "NO_PAYMENT";
  }
}

export function paymentGateNotice(status: PaymentGateStatus | undefined): PaymentGateNotice {
  switch (status) {
    case "PAYMENT_PENDING":
      return {
        status,
        tone: "info",
        title: "Payment awaiting verification",
        description:
          "We've received your UPI reference and are verifying it. This usually takes a few minutes — no need to pay again. You'll get access as soon as it's approved.",
        routeToPricing: false,
        actionLabel: "View payment status",
      };
    case "PAYMENT_FAILED":
      return {
        status,
        tone: "error",
        title: "Payment could not be verified",
        description:
          "Your last payment was marked failed. Check the note on your payment history, then retry with the correct UPI transaction reference.",
        routeToPricing: false,
        actionLabel: "Review and retry payment",
      };
    case "PAYMENT_CANCELED":
      return {
        status,
        tone: "warning",
        title: "Payment canceled or refunded",
        description:
          "Your last payment was canceled or refunded, so no plan is active. You can start a new purchase whenever you're ready.",
        routeToPricing: false,
        actionLabel: "Choose a plan",
      };
    default:
      return {
        status: "NO_PAYMENT",
        tone: "error",
        title: "An active plan is required",
        description: "Pick a plan to unlock AI resume generation and PDF downloads.",
        routeToPricing: true,
        actionLabel: "View plans",
      };
  }
}

export function formatINR(amount: number): string {
  return `₹${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(amount)}`;
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function daysRemaining(endDate: string): number {
  const ms = new Date(endDate).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / (24 * 60 * 60 * 1000)));
}