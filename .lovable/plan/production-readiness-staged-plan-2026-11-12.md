# Production readiness — staged plan

## Already in place (no rebuild)
- Owner-only data access, verified by 28 two-account checks and 28 partner checks.
- Payments: UPI with admin verification only; users cannot mark payments successful or change credits. Partner credits use locked, idempotent database functions and are separate from individual passes.
- AI limits, cooldowns, duplicate protection and charge-only-on-success.
- Contact form with rate limiting; ATS file type/size checks in the browser.
- Sitemap, robots, noindex on login/register, per-page titles.
- Account deletion keeping financial records; profile page; basic event tracking.

## Stage 1 — Account page and safety
- Account page: email, member since, password change (secure reset flow), active pass, credits left, payment history.
- "Download my data" (JSON of profile, resumes, applications, learning plans) and account deletion behind a typed confirmation.

## Stage 2 — Support and feedback
- Extend the contact form with categories (problem, feedback, wrong ATS suggestion, payment help, generation help) and a status (open, in progress, resolved).
- Admin support inbox to review, reply note and change status. No document uploads requested.

## Stage 3 — Admin monitoring
- Admin-only monitoring page with daily / monthly filters: registered users, active users, generations (success/failed), ATS analyses, payment failures, active partners, partner credit usage.
- Error log table (category, time, service, request ID, status) written by server code; never stores resume text, passwords or keys.
- Funnel report from existing events: visitor to checker, checker completion, checker to signup, signup to paid, generation success. Add missing events (checker started/completed, upload, pricing viewed, checkout started, tracker entry). Event data never includes resume or job description text.

## Stage 4 — Abuse limits
- Light per-visitor limit on the public checker's server-side parts only (no captcha); friendly limit messages.
- Mark dashboard, profile, payment, partner and admin pages noindex.

## Stage 5 — Reports and testing
- Write backup and recovery guide plus rollback notes for recent database changes (`/mnt/documents/production-readiness-report.md`).
- Rerun all tests, privacy checks, checker uploads, mobile and keyboard checks; report real results.

## Needs you
- App emails (payment confirmation, credit purchase, security notices) need an email sending domain set up first; sign-up and password-reset emails already work with the default sender. I will add these emails once the domain is set up.
- Backups: Lovable Cloud takes a daily backup kept about 14 days, but I can't see them. Please check More → Database → Manage → Backups.
- No automatic payment gateway exists (built-in payments aren't available for India), so "duplicate callback" tests do not apply; manual UPI verification is tested instead.
- Nothing is published, and no existing user data is changed.
