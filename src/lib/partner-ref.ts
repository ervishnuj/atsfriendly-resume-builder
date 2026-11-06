/**
 * Partner referral attribution. A partner's referral link is
 * `https://theresumerocket.com/?ref=<PARTNER-CODE>`. The code is captured into
 * localStorage on any page load and read back when a resume generation should
 * be attributed to a partner. Attribution is only recorded server-side; this
 * value is a hint, never proof.
 */

const KEY = "partner_ref";
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

type StoredRef = { code: string; at: number };

/** Call once on app boot: stores ?ref=CODE if present and well-formed. */
export function capturePartnerRef(): void {
  if (typeof window === "undefined") return;
  try {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("ref");
    if (!code) return;
    const cleaned = code.toUpperCase().trim();
    if (!/^[A-Z0-9-]{4,32}$/.test(cleaned)) return;
    const payload: StoredRef = { code: cleaned, at: Date.now() };
    window.localStorage.setItem(KEY, JSON.stringify(payload));
  } catch {
    // storage unavailable — attribution simply won't persist
  }
}

/** Returns the captured partner code, or null when absent/expired. */
export function getPartnerRef(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredRef;
    if (!parsed?.code || typeof parsed.at !== "number") return null;
    if (Date.now() - parsed.at > MAX_AGE_MS) {
      window.localStorage.removeItem(KEY);
      return null;
    }
    return parsed.code;
  } catch {
    return null;
  }
}

export function partnerReferralLink(code: string): string {
  const origin = typeof window === "undefined" ? "https://theresumerocket.com" : window.location.origin;
  return `${origin}/?ref=${encodeURIComponent(code)}`;
}
