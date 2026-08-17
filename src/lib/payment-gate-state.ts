import type { PaymentGateStatus } from "./billing-shared";

/**
 * The last payment-gate outcome the user saw, persisted per account so it
 * survives redirects and full page reloads instead of vanishing with the toast.
 */
export type PersistedPaymentGate = {
  status: PaymentGateStatus;
  /** epoch ms of when the gate was last raised */
  at: number;
  /** true once the toast for this gate has been shown in the current tab */
  toastShown: boolean;
};

const KEY = "rr:payment-gate:";
/** Drop stale gates so an old notice doesn't haunt a much later session. */
const MAX_AGE_MS = 1000 * 60 * 60 * 24;

function storage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function readPaymentGate(userId: string): PersistedPaymentGate | null {
  const s = storage();
  if (!s) return null;
  try {
    const raw = s.getItem(KEY + userId);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedPaymentGate;
    if (!parsed?.status || typeof parsed.at !== "number") return null;
    if (Date.now() - parsed.at > MAX_AGE_MS) {
      s.removeItem(KEY + userId);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function savePaymentGate(
  userId: string,
  gate: Partial<PersistedPaymentGate> & { status: PaymentGateStatus },
): PersistedPaymentGate {
  const next: PersistedPaymentGate = {
    status: gate.status,
    at: gate.at ?? Date.now(),
    toastShown: gate.toastShown ?? false,
  };
  const s = storage();
  try {
    s?.setItem(KEY + userId, JSON.stringify(next));
  } catch {
    /* storage unavailable — the in-memory banner still renders */
  }
  return next;
}

export function clearPaymentGate(userId: string) {
  try {
    storage()?.removeItem(KEY + userId);
  } catch {
    /* ignore */
  }
}
