# Partner / Reseller Module — Implementation Plan

Adds a prepaid partner (reseller) system to TheResumeRocket: admin-managed partners, credit packages, daily limits, partner pricing, a 10% owner margin share, GST-aware unregistered-supplier billing, and PDF commercial invoices. Existing individual plans, entitlements, and the AI credit system are untouched.

## Hard constraints (from the brief)

- No GST ever charged, calculated, or displayed while unregistered. No GSTIN shown, no "GST Tax Invoice" labels, no input-tax-credit claims. Every invoice carries: "Supplier is not registered under GST. GST has not been charged."
- GST registered mode is admin-gated: filling a GSTIN field never activates it; requires explicit admin confirmation.
- One credit = one successful paid generation. Failed generations, previews, edits, and retries consume nothing. Deductions are idempotent and race-safe, enforced in the database (not the client).
- Default daily limit: 30 successful generations per partner per calendar day, reset in Asia/Kolkata.
- Owner share = 10% of partner gross margin (selling price − wholesale credit price), recorded as a separate ledger entry, only on successful sales, never auto-collected.
- Pending payments and uncollected commissions are never counted as realized revenue.
- No real AI calls or credit consumption during development/testing — all acceptance tests use synthetic data and the database functions directly.

## Database changes (one migration)

New tables (all in `public`, each with GRANTs + RLS in the same migration):

- `partners` — business name, contact person, phone, email, location, category (coaching_centre, browsing_centre, xerox_printing, job_consultancy, training_institute, other), unique partner_code, status (active/inactive/suspended), daily_credit_limit (default 30), linked user_id, timestamps.
- `partner_packages` — name, credits, price_inr, cost_per_credit (derived), active, sort_order. Seeded with Trial 30/₹750, Starter 100/₹2,300, Growth 300/₹6,600, Pro 600/₹12,000.
- `partner_package_prices` — partner-specific negotiated price overrides (admin-set only).
- `partner_credit_wallets` — one row per partner: prepaid balance, lifetime purchased, lifetime consumed.
- `partner_credit_transactions` — append-only ledger: purchase, consumption, refund/adjustment; idempotency key per operation.
- `partner_daily_usage` — partner_id + usage_date (Asia/Kolkata) + count; enforced by the consume function.
- `partner_sales` — one row per successful customer generation: partner_id, selling price, wholesale cost, gross margin, owner share, attribution source, client_request_id (idempotent).
- `partner_commission_ledger` — owner-share entries, settlement status, month.
- `partner_invoices` — invoice number, partner, package, credits, unit price, subtotal, total, payment status (pending/paid only after verification), payment reference.
- `business_tax_settings` — singleton row: gst_registered (default false), gstin (nullable), gst_collection_enabled (default false), business contact details for invoices.

Extend `app_role` enum with `partner`. Reuse existing `has_role()` pattern.

Security-definer DB functions (all race-safe, server-side only):

- `partner_consume_credit(_partner_id, _request_id)` — atomic: checks partner active, wallet balance > 0, daily usage < limit (IST date), inserts sale + transaction + daily usage in one transaction; returns structured result; duplicate `_request_id` returns the original result without double-deducting.
- `partner_release_credit(_partner_id, _request_id)` — reverses a consumption when generation fails (mirrors the existing AI failure-release pattern).
- `partner_purchase_package(...)` — admin-verified credit top-up + transaction + invoice.
- `record_partner_sale(...)` — computes margin and owner share from stored prices, writes sale + commission ledger entries.

RLS: partners read only their own rows (wallet, transactions, sales, invoices, usage); no partner writes except through the definer functions; admins manage everything via existing `has_role(auth.uid(), 'admin')`.

## Implementation stages

**Stage 1 — Schema + admin partner management**
Migration above; admin routes: Partner Management (create/edit/activate/suspend, set daily limit), Packages (create/edit/activate, negotiated prices, purchase history).

**Stage 2 — Partner accounts, wallet, credit enforcement**
Partner role assignment; server functions (`requireSupabaseAuth` + partner role check); Buy Credits flow (admin-verified, like existing UPI payment verification); credit consumption wired into the generation path only for partner-attributed generations.

**Stage 3 — Partner dashboard**
Credits total/used today/remaining today/remaining prepaid, total resumes, revenue, margin, owner share, recent transactions, date filters, package-wise history. Mobile-responsive, matching existing design.

**Stage 4 — Customer pricing + margin calculator**
Admin min/max selling price rules; partner sets selling price (₹39/₹49/₹59/custom within bounds); margin preview labeled as estimate, never guaranteed profit.

**Stage 5 — Commission ledger + settlement reports**
10% configurable share; monthly partner-wise settlement reports; no auto-deduction.

**Stage 6 — Invoices + tax settings**
Commercial invoice/receipt PDF (browser print, like existing PDF export); unregistered-supplier note; no GST fields; admin tax settings page with confirmation-gated registered mode (registered mode stores config but stays inert until verified — no GST math shipped).

**Stage 7 — Referral attribution**
Partner code + referral link; attribution recorded at generation; locked after paid generation (admin-only change); partner data isolation verified.

**Stage 8 — Admin reports**
Active partners, credits sold/consumed, revenue collected vs outstanding, estimated generation cost (configurable), gross profit, partner margins, owner share, pending payments, daily/monthly usage — with realized vs pending clearly separated.

## Testing approach

- Extend the existing vitest suite: margin math, 10% share math, package cost-per-credit, invoice totals without GST, price-bound validation.
- SQL-level tests of `partner_consume_credit` via synthetic partner rows: 30 allowed, 31st blocked, duplicate request_id not double-deducted, failed generation releases credit, IST date reset, two-partner isolation.
- Playwright: admin creates partner/package; partner dashboard renders; invoices show the unregistered note and no GSTIN.
- All synthetic data removed afterward. No real AI generations, no real payments, no production data touched.

## Explicitly out of scope

- Automatic commission collection/deduction (reporting only, per brief).
- GST calculation logic (unregistered mode only; registered mode is a config placeholder).
- Any change to individual customer plans, pricing (₹39/₹149/₹399), or entitlements.

## Suggested sequencing

Stages 1–2 first (schema + enforcement are the riskiest), then 3–5 (dashboard, pricing, commission), then 6–8 (invoices, referral, reports). I'll report after each stage with tests run and limitations.
