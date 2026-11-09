# Partner / Reseller Module — Roadmap

- [x] Security checks available with owner's admin session: settings forms/read functions, admin invoice suspension exception, suspended dashboard, valid/invalid QR uploads; temporary invoices, partners and uploads removed.
- [ ] Remaining security verification: suspended non-admin invoice denial and partner settings restrictions need a user-selected non-admin account; direct admin settings reads returned no rows (owner has no admin-role row), and incomplete PNG headers were accepted. Testing only; no security code changed.

- [x] Stage 1: DB schema (10 tables, partner role, credit functions, RLS) + admin Partner Management & Packages routes
- [x] Stage 2: Partner accounts (email-claim linking), wallet, credit enforcement DB functions (server-only execute)
- [x] Stage 3: Partner dashboard (credits, daily usage, revenue, margin, transactions)
- [x] Stage 4: Customer pricing + margin calculator (admin min/max ₹39–₹99, estimate labeling)
- [x] Stage 5: Commission ledger + monthly settlement (manual settle, no auto-deduction)
- [x] Stage 6: Commercial invoices (print/PDF, unregistered-supplier note, no GST) + tax settings with confirmation gate
- [x] Stage 7: Referral capture (?ref=CODE stored 30 days, link shown on partner dashboard)
- [x] Stage 8: Admin reports (realized vs pending revenue, credits sold/consumed, margins, commissions)
- [x] Tests: 8 vitest math tests, SQL acceptance tests (30/31 limit, idempotency, release, isolation, suspend, purchase), Playwright admin+partner flows
- [ ] Remaining: wire partner_consume_credit into the live AI generation path for partner-attributed generations (deferred to protect the existing AI credit system); date-range filters on partner dashboard; partner verify-invoice UI test needs a second auth account
