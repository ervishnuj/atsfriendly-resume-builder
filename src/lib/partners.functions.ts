import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { validateSellingPrice } from "./partner-math";

const CATEGORIES = [
  "coaching_centre",
  "browsing_centre",
  "xerox_printing",
  "job_consultancy",
  "training_institute",
  "other",
] as const;

const partnerInput = z.object({
  businessName: z.string().trim().min(2).max(120),
  contactPerson: z.string().trim().max(120).default(""),
  phone: z.string().trim().max(20).default(""),
  email: z.string().trim().email().max(200),
  location: z.string().trim().max(200).default(""),
  category: z.enum(CATEGORIES),
  dailyCreditLimit: z.number().int().min(1).max(1000).default(30),
});

const packageInput = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(2).max(60),
  credits: z.number().int().min(1).max(100000),
  priceInr: z.number().min(0).max(10000000),
  active: z.boolean().default(true),
  sortOrder: z.number().int().min(0).max(1000).default(0),
});

// ---------------------------------------------------------------------------
// Admin: partner management
// ---------------------------------------------------------------------------

export const adminListPartners = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { requireAdmin } = await import("./billing.server");
    await requireAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("partners")
      .select("*, partner_credit_wallets(balance, lifetime_purchased, lifetime_consumed)")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []).map((p) => ({
      id: p.id as string,
      userId: (p.user_id as string | null) ?? null,
      businessName: p.business_name as string,
      contactPerson: p.contact_person as string,
      phone: p.phone as string,
      email: p.email as string,
      location: p.location as string,
      category: p.category as string,
      partnerCode: p.partner_code as string,
      status: p.status as string,
      dailyCreditLimit: p.daily_credit_limit as number,
      sellingPrice: p.selling_price === null ? null : Number(p.selling_price),
      createdAt: p.created_at as string,
      wallet: Array.isArray(p.partner_credit_wallets) && p.partner_credit_wallets[0]
        ? {
            balance: Number(p.partner_credit_wallets[0].balance),
            lifetimePurchased: Number(p.partner_credit_wallets[0].lifetime_purchased),
            lifetimeConsumed: Number(p.partner_credit_wallets[0].lifetime_consumed),
          }
        : { balance: 0, lifetimePurchased: 0, lifetimeConsumed: 0 },
    }));
  });

export const adminCreatePartner = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(partnerInput)
  .handler(async ({ data, context }) => {
    const { requireAdmin } = await import("./billing.server");
    await requireAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { generatePartnerCode } = await import("./partners.server");

    let code = generatePartnerCode(data.businessName);
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const { data: created, error } = await supabaseAdmin
        .from("partners")
        .insert({
          business_name: data.businessName,
          contact_person: data.contactPerson,
          phone: data.phone,
          email: data.email,
          location: data.location,
          category: data.category,
          partner_code: code,
          daily_credit_limit: data.dailyCreditLimit,
        })
        .select("id, partner_code")
        .single();
      if (!error && created) {
        return { id: created.id as string, partnerCode: created.partner_code as string };
      }
      if (error && error.code !== "23505") throw new Error(error.message);
      code = generatePartnerCode(data.businessName);
    }
    throw new Error("Could not allocate a unique partner code. Please retry.");
  });

export const adminUpdatePartner = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    partnerInput.partial().extend({
      id: z.string().uuid(),
      status: z.enum(["active", "inactive", "suspended"]).optional(),
      sellingPrice: z.number().min(0).max(100000).nullable().optional(),
    }),
  )
  .handler(async ({ data, context }) => {
    const { requireAdmin } = await import("./billing.server");
    await requireAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    if (data.sellingPrice !== undefined && data.sellingPrice !== null) {
      const { data: settings } = await supabaseAdmin
        .from("partner_settings")
        .select("min_selling_price, max_selling_price")
        .eq("id", true)
        .maybeSingle();
      const min = Number(settings?.min_selling_price ?? 39);
      const max = Number(settings?.max_selling_price ?? 99);
      const check = validateSellingPrice(data.sellingPrice, min, max);
      if (!check.ok) {
        throw new Error(`Selling price must be between ₹${min} and ₹${max}.`);
      }
    }

    const update: Record<string, unknown> = {};
    if (data.businessName !== undefined) update.business_name = data.businessName;
    if (data.contactPerson !== undefined) update.contact_person = data.contactPerson;
    if (data.phone !== undefined) update.phone = data.phone;
    if (data.email !== undefined) update.email = data.email;
    if (data.location !== undefined) update.location = data.location;
    if (data.category !== undefined) update.category = data.category;
    if (data.dailyCreditLimit !== undefined) update.daily_credit_limit = data.dailyCreditLimit;
    if (data.status !== undefined) update.status = data.status;
    if (data.sellingPrice !== undefined) update.selling_price = data.sellingPrice;

    const { error } = await supabaseAdmin.from("partners").update(update).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------------------------------------------------------------------------
// Admin: packages
// ---------------------------------------------------------------------------

export const adminListPackages = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { requireAdmin } = await import("./billing.server");
    await requireAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("partner_packages")
      .select("*")
      .order("sort_order", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []).map((p) => ({
      id: p.id as string,
      name: p.name as string,
      credits: p.credits as number,
      priceInr: Number(p.price_inr),
      active: p.active as boolean,
      sortOrder: p.sort_order as number,
    }));
  });

export const adminSavePackage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(packageInput)
  .handler(async ({ data, context }) => {
    const { requireAdmin } = await import("./billing.server");
    await requireAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const row = {
      name: data.name,
      credits: data.credits,
      price_inr: data.priceInr,
      active: data.active,
      sort_order: data.sortOrder,
    };
    const q = data.id
      ? supabaseAdmin.from("partner_packages").update(row).eq("id", data.id)
      : supabaseAdmin.from("partner_packages").insert(row);
    const { error } = await q;
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminSetNegotiatedPrice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      partnerId: z.string().uuid(),
      packageId: z.string().uuid(),
      priceInr: z.number().min(0).max(10000000).nullable(),
    }),
  )
  .handler(async ({ data, context }) => {
    const { requireAdmin } = await import("./billing.server");
    await requireAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (data.priceInr === null) {
      const { error } = await supabaseAdmin
        .from("partner_package_prices")
        .delete()
        .eq("partner_id", data.partnerId)
        .eq("package_id", data.packageId);
      if (error) throw new Error(error.message);
      return { ok: true };
    }
    const { error } = await supabaseAdmin
      .from("partner_package_prices")
      .upsert(
        { partner_id: data.partnerId, package_id: data.packageId, price_inr: data.priceInr },
        { onConflict: "partner_id,package_id" },
      );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------------------------------------------------------------------------
// Admin: invoices, settings, reports
// ---------------------------------------------------------------------------

export const adminListPartnerInvoices = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { requireAdmin } = await import("./billing.server");
    await requireAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("partner_invoices")
      .select("*, partners(business_name, partner_code)")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return (data ?? []).map(mapInvoice);
  });

export const adminVerifyPartnerInvoice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ invoiceId: z.string().uuid() }))
  .handler(async ({ data, context }) => {
    const { requireAdmin } = await import("./billing.server");
    await requireAdmin(context.userId);
    // partner_verify_invoice re-checks the admin role via auth.uid() inside the
    // database function, so call it with the caller's own (RLS) client.
    const { data: ok, error } = await context.supabase.rpc("partner_verify_invoice" as never, {
      _invoice_id: data.invoiceId,
    } as never);
    if (error) throw new Error(error.message);
    if (!ok) throw new Error("Invoice not found or already processed.");
    return { ok: true };
  });

export const adminGetTaxSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { requireAdmin } = await import("./billing.server");
    await requireAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("business_tax_settings")
      .select("*")
      .eq("id", true)
      .maybeSingle();
    return {
      gstRegistered: Boolean(data?.gst_registered),
      gstin: (data?.gstin as string | null) ?? null,
      gstCollectionEnabled: Boolean(data?.gst_collection_enabled),
      businessName: (data?.business_name as string) ?? "TheResumeRocket",
      businessContact: (data?.business_contact as string) ?? "",
      businessAddress: (data?.business_address as string) ?? "",
    };
  });

export const adminUpdateTaxSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      businessName: z.string().trim().min(2).max(120),
      businessContact: z.string().trim().max(300),
      businessAddress: z.string().trim().max(500),
      gstin: z.string().trim().max(15).nullable(),
      // Switching to registered mode requires an explicit confirmation flag —
      // merely filling the GSTIN field never enables GST collection.
      confirmGstRegistered: z.boolean(),
    }),
  )
  .handler(async ({ data, context }) => {
    const { requireAdmin } = await import("./billing.server");
    await requireAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const gstRegistered = data.confirmGstRegistered && Boolean(data.gstin);
    const { error } = await supabaseAdmin
      .from("business_tax_settings")
      .update({
        business_name: data.businessName,
        business_contact: data.businessContact,
        business_address: data.businessAddress,
        gstin: data.gstin || null,
        gst_registered: gstRegistered,
        // GST collection stays disabled until a verified configuration exists;
        // this build ships unregistered-supplier mode only.
        gst_collection_enabled: false,
      })
      .eq("id", true);
    if (error) throw new Error(error.message);
    return { ok: true, gstRegistered };
  });

export const adminGetPartnerSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { requireAdmin } = await import("./billing.server");
    await requireAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("partner_settings")
      .select("*")
      .eq("id", true)
      .maybeSingle();
    return {
      ownerSharePercent: Number(data?.owner_share_percent ?? 10),
      minSellingPrice: Number(data?.min_selling_price ?? 39),
      maxSellingPrice: Number(data?.max_selling_price ?? 99),
      estimatedGenerationCost: Number(data?.estimated_generation_cost ?? 0),
    };
  });

export const adminUpdatePartnerSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      ownerSharePercent: z.number().min(0).max(100),
      minSellingPrice: z.number().min(1).max(100000),
      maxSellingPrice: z.number().min(1).max(100000),
      estimatedGenerationCost: z.number().min(0).max(100000),
    }),
  )
  .handler(async ({ data, context }) => {
    const { requireAdmin } = await import("./billing.server");
    await requireAdmin(context.userId);
    if (data.minSellingPrice > data.maxSellingPrice) {
      throw new Error("Minimum selling price cannot exceed the maximum.");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("partner_settings")
      .update({
        owner_share_percent: data.ownerSharePercent,
        min_selling_price: data.minSellingPrice,
        max_selling_price: data.maxSellingPrice,
        estimated_generation_cost: data.estimatedGenerationCost,
      })
      .eq("id", true);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminPartnerReports = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { requireAdmin } = await import("./billing.server");
    await requireAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [partners, sales, invoices, commissions, settings] = await Promise.all([
      supabaseAdmin.from("partners").select("id, status"),
      supabaseAdmin.from("partner_sales").select("partner_id, selling_price, wholesale_cost, gross_margin, owner_share, status"),
      supabaseAdmin.from("partner_invoices").select("partner_id, total, payment_status"),
      supabaseAdmin.from("partner_commission_ledger").select("partner_id, owner_share, status"),
      supabaseAdmin.from("partner_settings").select("estimated_generation_cost").eq("id", true).maybeSingle(),
    ]);

    const completedSales = (sales.data ?? []).filter((s) => s.status === "completed");
    const paidInvoices = (invoices.data ?? []).filter((i) => i.payment_status === "paid");
    const pendingInvoices = (invoices.data ?? []).filter((i) => i.payment_status === "pending");
    const pendingCommissions = (commissions.data ?? []).filter((c) => c.status === "pending");
    const estimatedCost = Number(settings.data?.estimated_generation_cost ?? 0);

    const sum = (rows: Array<Record<string, unknown>>, key: string) =>
      rows.reduce((acc, r) => acc + Number(r[key] ?? 0), 0);

    const revenueCollected = sum(paidInvoices, "total");
    const outstanding = sum(pendingInvoices, "total");
    const creditsConsumed = completedSales.length;
    const estimatedApiCost = creditsConsumed * estimatedCost;
    const commissionReceivable = sum(pendingCommissions, "owner_share");

    const perPartner = new Map<string, { sales: number; margin: number; share: number }>();
    for (const s of completedSales) {
      const pid = s.partner_id as string;
      const entry = perPartner.get(pid) ?? { sales: 0, margin: 0, share: 0 };
      entry.sales += 1;
      entry.margin += Number(s.gross_margin);
      entry.share += Number(s.owner_share);
      perPartner.set(pid, entry);
    }

    return {
      activePartners: (partners.data ?? []).filter((p) => p.status === "active").length,
      totalPartners: (partners.data ?? []).length,
      creditsSold: sum(paidInvoices, "total") > 0 ? undefined : undefined, // placeholder removed below
      creditsConsumed,
      revenueCollected,
      outstandingPayments: outstanding,
      estimatedApiCost,
      grossOwnerProfit: revenueCollected - estimatedApiCost,
      commissionReceivable,
      perPartner: [...perPartner.entries()].map(([partnerId, v]) => ({ partnerId, ...v })),
    };
  });

export const adminListCommissions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ month: z.string().regex(/^\d{4}-\d{2}$/).optional() }))
  .handler(async ({ data, context }) => {
    const { requireAdmin } = await import("./billing.server");
    await requireAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let q = supabaseAdmin
      .from("partner_commission_ledger")
      .select("*, partners(business_name, partner_code)")
      .order("created_at", { ascending: false })
      .limit(500);
    if (data.month) q = q.eq("settlement_month", `${data.month}-01`);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return (rows ?? []).map((r) => ({
      id: r.id as string,
      partnerId: r.partner_id as string,
      partnerName: (r.partners as { business_name?: string } | null)?.business_name ?? "—",
      partnerCode: (r.partners as { partner_code?: string } | null)?.partner_code ?? "—",
      ownerShare: Number(r.owner_share),
      sharePercent: Number(r.share_percent),
      settlementMonth: r.settlement_month as string,
      status: r.status as string,
      createdAt: r.created_at as string,
    }));
  });

export const adminSettleCommission = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data, context }) => {
    const { requireAdmin } = await import("./billing.server");
    await requireAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("partner_commission_ledger")
      .update({ status: "settled" })
      .eq("id", data.id)
      .eq("status", "pending");
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------------------------------------------------------------------------
// Partner-facing functions
// ---------------------------------------------------------------------------

export const getMyPartnerDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { requirePartner } = await import("./partners.server");
    const email = (context.claims?.email as string | undefined) ?? null;
    const partner = await requirePartner(context.userId, email);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [usage, wallet, sales, transactions, settings] = await Promise.all([
      supabaseAdmin.rpc("get_partner_usage" as never, { _partner_id: partner.id } as never),
      supabaseAdmin.from("partner_credit_wallets").select("*").eq("partner_id", partner.id).maybeSingle(),
      supabaseAdmin
        .from("partner_sales")
        .select("selling_price, wholesale_cost, gross_margin, owner_share, status, created_at")
        .eq("partner_id", partner.id)
        .order("created_at", { ascending: false })
        .limit(500),
      supabaseAdmin
        .from("partner_credit_transactions")
        .select("kind, credits, amount_inr, note, created_at")
        .eq("partner_id", partner.id)
        .order("created_at", { ascending: false })
        .limit(50),
      supabaseAdmin.from("partner_settings").select("*").eq("id", true).maybeSingle(),
    ]);

    const completed = (sales.data ?? []).filter((s) => s.status === "completed");
    const usageData = (usage.data ?? {}) as { used?: number; limit?: number; balance?: number };

    return {
      partner: {
        id: partner.id,
        businessName: partner.business_name,
        partnerCode: partner.partner_code,
        category: partner.category,
        status: partner.status,
        dailyCreditLimit: partner.daily_credit_limit,
        sellingPrice: partner.selling_price === null ? null : Number(partner.selling_price),
      },
      usage: {
        usedToday: Number(usageData.used ?? 0),
        dailyLimit: Number(usageData.limit ?? partner.daily_credit_limit),
        balance: Number(usageData.balance ?? 0),
      },
      wallet: wallet.data
        ? {
            balance: Number(wallet.data.balance),
            lifetimePurchased: Number(wallet.data.lifetime_purchased),
            lifetimeConsumed: Number(wallet.data.lifetime_consumed),
            avgCostPerCredit: Number(wallet.data.avg_cost_per_credit),
          }
        : { balance: 0, lifetimePurchased: 0, lifetimeConsumed: 0, avgCostPerCredit: 0 },
      totals: {
        resumesGenerated: completed.length,
        revenue: completed.reduce((a, s) => a + Number(s.selling_price), 0),
        grossMargin: completed.reduce((a, s) => a + Number(s.gross_margin), 0),
        ownerShare: completed.reduce((a, s) => a + Number(s.owner_share), 0),
      },
      settings: {
        ownerSharePercent: Number(settings.data?.owner_share_percent ?? 10),
        minSellingPrice: Number(settings.data?.min_selling_price ?? 39),
        maxSellingPrice: Number(settings.data?.max_selling_price ?? 99),
      },
      recentTransactions: (transactions.data ?? []).map((t) => ({
        kind: t.kind as string,
        credits: Number(t.credits),
        amountInr: t.amount_inr === null ? null : Number(t.amount_inr),
        note: t.note as string,
        createdAt: t.created_at as string,
      })),
    };
  });

export const getMyPartnerPackages = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { requirePartner } = await import("./partners.server");
    const email = (context.claims?.email as string | undefined) ?? null;
    const partner = await requirePartner(context.userId, email);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [packages, overrides] = await Promise.all([
      supabaseAdmin.from("partner_packages").select("*").eq("active", true).order("sort_order"),
      supabaseAdmin.from("partner_package_prices").select("*").eq("partner_id", partner.id),
    ]);
    const overrideMap = new Map((overrides.data ?? []).map((o) => [o.package_id as string, Number(o.price_inr)]));
    return (packages.data ?? []).map((p) => {
      const base = Number(p.price_inr);
      const negotiated = overrideMap.get(p.id as string) ?? null;
      return {
        id: p.id as string,
        name: p.name as string,
        credits: p.credits as number,
        priceInr: negotiated ?? base,
        basePriceInr: base,
        negotiated: negotiated !== null,
      };
    });
  });

export const requestPackagePurchase = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      packageId: z.string().uuid(),
      paymentReference: z.string().trim().max(80).default(""),
      idempotencyKey: z.string().trim().min(8).max(120),
    }),
  )
  .handler(async ({ data, context }) => {
    const { requirePartner } = await import("./partners.server");
    const email = (context.claims?.email as string | undefined) ?? null;
    const partner = await requirePartner(context.userId, email);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: result, error } = await supabaseAdmin.rpc("partner_record_purchase" as never, {
      _partner_id: partner.id,
      _package_id: data.packageId,
      _payment_reference: data.paymentReference || null,
      _idempotency_key: data.idempotencyKey,
    } as never);
    if (error) throw new Error(error.message);
    const r = result as { ok: boolean; code?: string; invoiceId?: string; invoiceNumber?: string; total?: number };
    if (!r.ok) throw new Error(`Purchase could not be recorded (${r.code ?? "unknown"}).`);
    return { invoiceId: r.invoiceId!, invoiceNumber: r.invoiceNumber!, total: Number(r.total ?? 0) };
  });

export const setMySellingPrice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ price: z.number().min(0).max(100000) }))
  .handler(async ({ data, context }) => {
    const { requirePartner } = await import("./partners.server");
    const email = (context.claims?.email as string | undefined) ?? null;
    const partner = await requirePartner(context.userId, email);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: settings } = await supabaseAdmin
      .from("partner_settings")
      .select("min_selling_price, max_selling_price")
      .eq("id", true)
      .maybeSingle();
    const min = Number(settings?.min_selling_price ?? 39);
    const max = Number(settings?.max_selling_price ?? 99);
    const check = validateSellingPrice(data.price, min, max);
    if (!check.ok) {
      throw new Error(`Your customer price must be between ₹${min} and ₹${max}.`);
    }
    const { error } = await supabaseAdmin
      .from("partners")
      .update({ selling_price: data.price })
      .eq("id", partner.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getMyPartnerInvoices = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { requirePartner } = await import("./partners.server");
    const email = (context.claims?.email as string | undefined) ?? null;
    const partner = await requirePartner(context.userId, email);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("partner_invoices")
      .select("*, partners(business_name, partner_code)")
      .eq("partner_id", partner.id)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []).map(mapInvoice);
  });

export const getPartnerInvoice = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ invoiceId: z.string().uuid() }))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { requireAdmin } = await import("./billing.server");
    const { getPartnerForUser } = await import("./partners.server");

    const { data: row, error } = await supabaseAdmin
      .from("partner_invoices")
      .select("*, partners(business_name, partner_code, contact_person, phone, email, location, user_id)")
      .eq("id", data.invoiceId)
      .maybeSingle();
    if (error || !row) throw new Error("Invoice not found.");

    const linkedUserId = (row.partners as { user_id?: string | null } | null)?.user_id ?? null;
    if (linkedUserId !== context.userId) {
      // Not the owning partner — only an admin may view it.
      await requireAdmin(context.userId);
    }

    const { data: tax } = await supabaseAdmin
      .from("business_tax_settings")
      .select("*")
      .eq("id", true)
      .maybeSingle();

    const p = row.partners as Record<string, unknown> | null;
    return {
      ...mapInvoice(row),
      partnerContact: {
        contactPerson: (p?.contact_person as string) ?? "",
        phone: (p?.phone as string) ?? "",
        email: (p?.email as string) ?? "",
        location: (p?.location as string) ?? "",
      },
      business: {
        name: (tax?.business_name as string) ?? "TheResumeRocket",
        contact: (tax?.business_contact as string) ?? "",
        address: (tax?.business_address as string) ?? "",
        gstRegistered: Boolean(tax?.gst_registered),
      },
    };
  });

// ---------------------------------------------------------------------------

function mapInvoice(row: Record<string, unknown>) {
  const partner = row.partners as { business_name?: string; partner_code?: string } | null;
  return {
    id: row.id as string,
    invoiceNumber: row.invoice_number as string,
    partnerId: row.partner_id as string,
    partnerName: partner?.business_name ?? "—",
    partnerCode: partner?.partner_code ?? "—",
    packageName: row.package_name as string,
    credits: Number(row.credits),
    unitPrice: Number(row.unit_price),
    subtotal: Number(row.subtotal),
    total: Number(row.total),
    paymentStatus: row.payment_status as string,
    paymentReference: (row.payment_reference as string | null) ?? null,
    paidAt: (row.paid_at as string | null) ?? null,
    createdAt: row.created_at as string,
  };
}
