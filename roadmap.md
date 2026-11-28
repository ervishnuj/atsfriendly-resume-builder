# Project Roadmap

## Google sign-in repair
- [x] Refreshed the managed sign-in helper and added recoverable failure handling; checked the sole Google entry point and shared registration, homepage and protected-page session paths.
- [x] Passed 124 automated tests and browser checks for preview popup routing, cancellation, blocked popups and full-page routing; no account credentials or financial records touched.
- [x] Callback mismatch resolved (28 Nov): Google now accepts `https://atsfriendly-resume-builder.lovable.app/~oauth/callback` and shows its account sign-in screen on both live addresses.
- [ ] Owner to finish one real Google account sign-in to confirm the return into the app (requires the owner's Google login).

## Google SEO and organic growth
- [x] Read the supplied SEO brief, existing growth research, public routes and verified Search Console data.
- [x] Approved the prioritised implementation plan and keyword-to-page mapping.
- [x] Improved existing public metadata, factual guide content, internal links and private-page search exclusions without changing application behaviour.
- [x] Added a public builder overview and six evidence-led, unique role guides in preview; retained the protected builder URL.
- [x] Validated 29 public pages, sitemap, structured data parsing, synthetic PDF/DOCX/paste checks, lab performance and mobile layouts; 121 tests passed. Delivered the SEO report and keyword map.
- [ ] Publishing and any manual Google indexing request require the owner's explicit approval; no ranking guarantee or paid promotion.

## Premium UI/UX redesign
- [x] Approved the staged visual redesign plan.
- [x] Standardised shared colours, locally served typography, controls, navigation and public pages.
- [x] Improved checker and builder presentation without changing scoring, generation or export rules.
- [x] Presented existing account data in a protected dashboard; restyled tracker, account, partner and admin pages.
- [x] Verified desktop/tablet and 360px, 390px and 430px layouts, synthetic uploads, safe interactions and 119 regression tests; no publishing.
- [ ] Funded-partner and live generation/export/payment checks remain blocked on a user-selected partner account and explicit approval to spend credits or make financial changes; no such operations were attempted.

## Partner / Reseller Module

- [x] Verified seven partner financial read paths with 28 live RLS checks (two active identities, suspended identity, unrelated authenticated identity), plus four direct usage RPC denials; all synthetic database fixtures rolled back. Twelve actual-handler authorization tests and fifteen credit/math regressions passed; no production logic or permissions changed.
- [ ] Real signed-in partner browser verification remains blocked on user-selected active and suspended non-admin accounts; database role simulation and mocked handler tests do not constitute real-account end-to-end verification.

- [x] Connected signed-in partner resume generation to atomic success-only deductions and insufficient-credit handling; failures release availability without deductions. Unit/regression tests and rollback-only database tests passed; signed-in empty-wallet flow verified, with no paid AI or payments.

- [x] Restored the existing verified owner's settings access through the protected admin role; browser confirmed both direct settings reads and admin functions agree, and four read-only integration tests passed without widening settings policies.

- [x] Security checks available with owner's admin session: settings forms/read functions, admin invoice suspension exception, suspended dashboard, valid/invalid QR uploads; temporary invoices, partners and uploads removed.
- [ ] Remaining security verification: suspended non-admin invoice denial and signed-in partner settings rejection need a user-selected non-admin account; incomplete PNG headers were accepted and remain outside the settings-only fix. Non-admin settings role predicates and policies are verified.

- [x] Stage 1: DB schema (10 tables, partner role, credit functions, RLS) + admin Partner Management & Packages routes
- [x] Stage 2: Partner accounts (email-claim linking), wallet, credit enforcement DB functions (server-only execute)
- [x] Stage 3: Partner dashboard (credits, daily usage, revenue, margin, transactions)
- [x] Stage 4: Customer pricing + margin calculator (admin min/max ₹39–₹99, estimate labeling)
- [x] Stage 5: Commission ledger + monthly settlement (manual settle, no auto-deduction)
- [x] Stage 6: Commercial invoices (print/PDF, unregistered-supplier note, no GST) + tax settings with confirmation gate
- [x] Stage 7: Referral capture (?ref=CODE stored 30 days, link shown on partner dashboard)
- [x] Stage 8: Admin reports (realized vs pending revenue, credits sold/consumed, margins, commissions)
- [x] Tests: 8 vitest math tests, SQL acceptance tests (30/31 limit, idempotency, release, isolation, suspend, purchase), Playwright admin+partner flows
- [ ] Remaining verification: successful live AI generation intentionally untested to avoid paid AI; partner verify-invoice UI and earlier non-admin security checks need a user-selected second account. Date-range filters are outside the current request.
