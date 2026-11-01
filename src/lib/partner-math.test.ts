import { describe, expect, it } from "vitest";
import {
  costPerCredit,
  grossMargin,
  invoiceTotals,
  ownerShare,
  partnerRetainedMargin,
  validateSellingPrice,
} from "./partner-math";

describe("partner package cost per credit", () => {
  it("matches the published package rates", () => {
    expect(costPerCredit(750, 30)).toBe(25);
    expect(costPerCredit(2300, 100)).toBe(23);
    expect(costPerCredit(6600, 300)).toBe(22);
    expect(costPerCredit(12000, 600)).toBe(20);
  });

  it("returns 0 for invalid input", () => {
    expect(costPerCredit(100, 0)).toBe(0);
    expect(costPerCredit(Number.NaN, 10)).toBe(0);
  });
});

describe("partner margin and owner share", () => {
  it("computes the brief's worked example exactly", () => {
    // wholesale ₹25, selling ₹39 → margin ₹14, owner share ₹1.40, retained ₹12.60
    expect(grossMargin(39, 25)).toBe(14);
    expect(ownerShare(39, 25, 10)).toBe(1.4);
    expect(partnerRetainedMargin(39, 25, 10)).toBe(12.6);
  });

  it("never takes a share of a zero or negative margin", () => {
    expect(ownerShare(20, 25, 10)).toBe(0);
    expect(ownerShare(25, 25, 10)).toBe(0);
  });

  it("respects a configurable share percent", () => {
    expect(ownerShare(59, 20, 15)).toBe(5.85);
  });
});

describe("selling price bounds", () => {
  it("accepts prices inside the admin range", () => {
    expect(validateSellingPrice(39, 39, 99)).toEqual({ ok: true });
    expect(validateSellingPrice(49, 39, 99)).toEqual({ ok: true });
    expect(validateSellingPrice(99, 39, 99)).toEqual({ ok: true });
  });

  it("rejects prices outside the admin range", () => {
    expect(validateSellingPrice(30, 39, 99)).toEqual({ ok: false, reason: "below_min" });
    expect(validateSellingPrice(100, 39, 99)).toEqual({ ok: false, reason: "above_max" });
    expect(validateSellingPrice(Number.NaN, 39, 99)).toEqual({ ok: false, reason: "invalid" });
  });
});

describe("unregistered-supplier invoices", () => {
  it("never adds a GST amount: subtotal equals total payable", () => {
    const { subtotal, total } = invoiceTotals(25, 30);
    expect(subtotal).toBe(750);
    expect(total).toBe(750);
  });
});
