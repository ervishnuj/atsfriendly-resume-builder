import { beforeEach, describe, expect, it, vi } from "vitest";

// Exercise the real read handlers and partner resolver, with synthetic rows.
// Database policies are separately exercised by scripts/partner-access-qa.sql.
const state = vi.hoisted(() => ({
  rows: {} as Record<string, Array<Record<string, any>>>,
  reads: [] as Array<{ table: string; filters: Array<[string, unknown]> }>,
  userReads: [] as string[],
  rpc: vi.fn(),
  requireAdmin: vi.fn(),
  activatePaymentSubscription: vi.fn(),
}));
vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => {
    const builder = {
      middleware: () => builder,
      inputValidator: () => builder,
      handler: (handler: unknown) => handler,
    };
    return builder;
  },
}));
vi.mock("@/integrations/supabase/auth-middleware", () => ({ requireSupabaseAuth: {} }));
vi.mock("./billing.server", () => ({
  requireAdmin: state.requireAdmin,
  activatePaymentSubscription: state.activatePaymentSubscription,
}));
vi.mock("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: {
    rpc: state.rpc,
    from: (table: string) => {
      const filters: Array<[string, unknown]> = [];
      const read = { table, filters };
      state.reads.push(read);
      const result = () => ({ data: (state.rows[table] ?? []).filter(row => filters.every(([key, value]) => row[key] === value)), error: null });
      const query = {
        select: () => query,
        eq: (key: string, value: unknown) => { filters.push([key, value]); return query; },
        is: (key: string, value: unknown) => { filters.push([key, value]); return query; },
        order: () => query,
        limit: () => query,
        maybeSingle: async () => ({ data: result().data[0] ?? null, error: null }),
        then: (resolve: (result: unknown) => unknown) => Promise.resolve(result()).then(resolve),
      };
      return query;
    },
  },
}));
import { adminUpdatePayment } from "./billing.functions";
import { getMyPartnerDashboard, getMyPartnerInvoices, getMyPartnerPackages, getPartnerInvoice } from "./partners.functions";

const userClient = {
  from: (table: string) => {
    state.userReads.push(table);
    const query = {
      select: () => query,
      eq: () => query,
      maybeSingle: async () => ({ data: null, error: null }),
    };
    return query;
  },
};
type Handler = (input: { context: { userId: string; claims: { email: null }; supabase: typeof userClient }; data?: { invoiceId: string } }) => Promise<any>;
function call(fn: unknown, userId: string, invoiceId?: string) {
  return (fn as Handler)({ context: { userId, claims: { email: null }, supabase: userClient }, data: invoiceId ? { invoiceId } : undefined });
}
function callAdminPayment(userId: string, paymentId: string) {
  return (adminUpdatePayment as unknown as Handler)({
    context: { userId, claims: { email: null }, supabase: userClient },
    data: { paymentId, status: "SUCCESS", note: "Verified" } as unknown as { invoiceId: string },
  });
}

beforeEach(() => {
  state.reads = [];
  state.userReads = [];
  state.rpc.mockReset();
  state.requireAdmin.mockReset();
  state.requireAdmin.mockRejectedValue(new Error("Forbidden"));
  state.activatePaymentSubscription.mockReset();
  const partners = [
    { id: "A", user_id: "user-A", status: "active", business_name: "Partner A", daily_credit_limit: 30 },
    { id: "B", user_id: "user-B", status: "active", business_name: "Partner B", daily_credit_limit: 30 },
    { id: "S", user_id: "user-S", status: "suspended", business_name: "Partner S", daily_credit_limit: 30 },
  ];
  state.rows = {
    partners,
    partner_credit_wallets: partners.map(p => ({ partner_id: p.id, balance: p.id === "A" ? 17 : 28 })),
    partner_sales: partners.map(p => ({ partner_id: p.id, selling_price: 39, wholesale_cost: 25, gross_margin: 14, owner_share: 1.4, status: "completed" })),
    partner_credit_transactions: partners.map(p => ({ partner_id: p.id, kind: "adjustment", credits: 17, note: p.id })),
    partner_invoices: partners.map(p => ({ id: `invoice-${p.id}`, partner_id: p.id, invoice_number: `INV-${p.id}`, partners: p })),
    partner_packages: [{ id: "package", name: "Trial", credits: 30, price_inr: 750, active: true }],
    partner_package_prices: partners.map((p, i) => ({ partner_id: p.id, package_id: "package", price_inr: 700 + i * 10 })),
    partner_settings: [{ id: true }],
    business_tax_settings: [{ id: true }],
  };
  state.rpc.mockImplementation(async (_name: string, args: { _partner_id: string }) => ({ data: { balance: args._partner_id === "A" ? 17 : 28, used: 2, limit: 30 }, error: null }));
});

describe("partner read handler authorization", () => {
  for (const partnerId of ["A", "B"]) {
    it(`active partner ${partnerId} reads only their own dashboard balances, usage, history and sales`, async () => {
      const result = await call(getMyPartnerDashboard, `user-${partnerId}`);
      expect(result.linked).toBe(true);
      expect(result.partner.id).toBe(partnerId);
      expect(result.wallet.balance).toBe(partnerId === "A" ? 17 : 28);
      expect(result.usage.usedToday).toBe(2);
      expect(result.recentTransactions.map((t: { note: string }) => t.note)).toEqual([partnerId]);
      expect(result.totals.resumesGenerated).toBe(1);
      expect(state.rpc).toHaveBeenCalledWith("get_partner_usage", { _partner_id: partnerId });
      for (const table of ["partner_credit_wallets", "partner_sales", "partner_credit_transactions"]) {
        expect(state.reads.find(r => r.table === table)?.filters).toContainEqual(["partner_id", partnerId]);
      }
    });
    it(`active partner ${partnerId} sees only their invoices and special price`, async () => {
      expect((await call(getMyPartnerInvoices, `user-${partnerId}`)).map((r: { partnerId: string }) => r.partnerId)).toEqual([partnerId]);
      expect((await call(getMyPartnerPackages, `user-${partnerId}`))[0].priceInr).toBe(partnerId === "A" ? 700 : 710);
      expect((await call(getPartnerInvoice, `user-${partnerId}`, `invoice-${partnerId}`)).partnerId).toBe(partnerId);
    });
    it(`active partner ${partnerId} cannot bypass admin-only business settings`, async () => {
      const invoice = await call(getPartnerInvoice, `user-${partnerId}`, `invoice-${partnerId}`);
      expect(invoice.business).toEqual({ name: "TheResumeRocket", contact: "", address: "", gstRegistered: false });
      expect(state.reads.some(r => r.table === "business_tax_settings")).toBe(false);
      expect(state.userReads).toContain("business_tax_settings");
    });
    it(`active partner ${partnerId} cannot open another partner's invoice by ID`, async () => {
      await expect(call(getPartnerInvoice, `user-${partnerId}`, `invoice-${partnerId === "A" ? "B" : "A"}`)).rejects.toThrow("Forbidden");
    });
  }
  for (const userId of ["user-S", "unrelated-user"]) {
    it(`${userId} receives no dashboard financial data`, async () => {
      const result = await call(getMyPartnerDashboard, userId);
      expect(result).toMatchObject({ linked: false });
      expect(result.wallet).toBeUndefined();
      expect(state.reads.every(r => r.table === "partners")).toBe(true);
      expect(state.rpc).not.toHaveBeenCalled();
    });
    it(`${userId} cannot list invoices or special prices`, async () => {
      await expect(call(getMyPartnerInvoices, userId)).rejects.toBeInstanceOf(Response);
      await expect(call(getMyPartnerPackages, userId)).rejects.toBeInstanceOf(Response);
      expect(state.reads.every(r => r.table === "partners")).toBe(true);
    });
    it(`${userId} cannot open any partner invoice`, async () => {
      for (const id of ["invoice-A", "invoice-B", "invoice-S"]) {
        await expect(call(getPartnerInvoice, userId, id)).rejects.toThrow("Forbidden");
      }
      expect(state.reads.some(r => r.table === "business_tax_settings")).toBe(false);
    });
  }
});

describe("payment review authorization", () => {
  it("an administrator cannot approve their own pending payment", async () => {
    state.requireAdmin.mockResolvedValue({ isAdmin: true, email: "admin@example.com" });
    state.rows.payments = [{ id: "payment-self", user_id: "admin-user", status: "PENDING" }];
    await expect(callAdminPayment("admin-user", "payment-self")).rejects.toThrow(
      "Administrators cannot approve their own payments.",
    );
    expect(state.activatePaymentSubscription).not.toHaveBeenCalled();
  });

  it("an administrator can approve another customer's pending payment", async () => {
    state.requireAdmin.mockResolvedValue({ isAdmin: true, email: "admin@example.com" });
    state.rows.payments = [{ id: "payment-customer", user_id: "customer-user", status: "PENDING" }];
    await expect(callAdminPayment("admin-user", "payment-customer")).resolves.toEqual({ ok: true });
    expect(state.activatePaymentSubscription).toHaveBeenCalledWith("payment-customer", "Verified");
  });
});
