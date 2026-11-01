/**
 * Pure partner/reseller money math. Shared by the admin UI, partner dashboard
 * and tests. The database functions recompute the same values server-side;
 * these helpers are for display and validation only — never authoritative.
 */

export function costPerCredit(priceInr: number, credits: number): number {
  if (!Number.isFinite(priceInr) || !Number.isFinite(credits) || credits <= 0) return 0;
  return round2(priceInr / credits);
}

export function grossMargin(sellingPrice: number, wholesaleCost: number): number {
  return round2(sellingPrice - wholesaleCost);
}

/** Owner share of the partner's gross margin, e.g. 10% of ₹14 = ₹1.40. */
export function ownerShare(sellingPrice: number, wholesaleCost: number, sharePercent: number): number {
  const margin = grossMargin(sellingPrice, wholesaleCost);
  if (margin <= 0 || sharePercent <= 0) return 0;
  return round2((margin * sharePercent) / 100);
}

export function partnerRetainedMargin(
  sellingPrice: number,
  wholesaleCost: number,
  sharePercent: number,
): number {
  return round2(grossMargin(sellingPrice, wholesaleCost) - ownerShare(sellingPrice, wholesaleCost, sharePercent));
}

export type PriceValidation =
  | { ok: true }
  | { ok: false; reason: "below_min" | "above_max" | "invalid" };

export function validateSellingPrice(
  price: number,
  minPrice: number,
  maxPrice: number,
): PriceValidation {
  if (!Number.isFinite(price) || price <= 0) return { ok: false, reason: "invalid" };
  if (price < minPrice) return { ok: false, reason: "below_min" };
  if (price > maxPrice) return { ok: false, reason: "above_max" };
  return { ok: true };
}

/**
 * Commercial invoice totals for an unregistered supplier: subtotal equals
 * total payable; no GST line is ever added.
 */
export function invoiceTotals(unitPrice: number, credits: number): { subtotal: number; total: number } {
  const subtotal = round2(unitPrice * credits);
  return { subtotal, total: subtotal };
}

export const UNREGISTERED_SUPPLIER_NOTE =
  "Supplier is not registered under GST. GST has not been charged.";

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
