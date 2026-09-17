# Security, Privacy, and Data Integrity Hardening

## Scope
Preserve the current design, authentication, pricing, AI behavior, daily limits, entitlements, and RLS model while hardening sensitive storage, ownership, deletion, contact submissions, analytics, and disclosures. Validation will use synthetic/static tests only; no AI provider calls or production-record cleanup will run.

## Implementation

### 1. Encrypt saved resumes and stored job descriptions
- Add nullable encrypted payload columns for saved resume content and job descriptions while retaining existing plaintext columns temporarily for backward compatibility.
- Reuse the existing server-only AES-256-GCM implementation and `APP_ENCRYPTION_KEY`; extend it with record/user-bound authenticated context rather than creating a client-side or hardcoded key.
- Write all new/updated resume versions and application job descriptions encrypted, decrypt only inside authenticated server functions, and return the existing DTO shapes so the UI does not change.
- Support legacy rows through dual-read fallback and authenticated lazy migration: plaintext rows remain recoverable, and are encrypted plus cleared only when safely rewritten. No bulk production backfill or destructive cleanup will run during implementation.
- Replace permissive resume payload validation with bounded resume/template schemas.

### 2. Strengthen ownership and deletion controls
- Add composite same-owner database constraints for `job_applications → resume_versions` and `interview_preps → job_applications`, after the verified zero-violation precheck.
- Keep server-side ownership checks before create/update, in addition to RLS and database constraints.
- Expose existing owner-scoped resume-version, template, and tracker deletion actions in a compact account-data section; add owner-authorized AI-result deletion without duplicating existing functions.
- Preserve user-controlled application/JD deletion; no automatic deletion of active resumes or applications.

### 3. AI result privacy and retention
- Add deletion state/expiry metadata to AI request rows without changing `RESUME`/`ANALYSIS` counting, IST day boundaries, cooldowns, stale reservations, failure handling, or duplicate protection.
- Add a protected action that clears only the caller’s stored AI result bodies while preserving usage rows and counts.
- Keep successful-result caching for retained results. Deleted results will not be silently regenerated or consume another slot under the same request identity.
- Add a configurable retention-days setting in server configuration and cleanup support, but do not execute cleanup against production records during this work.

### 4. Minimize Gemini payloads
- Add operation-specific payload builders.
- Resume generation keeps the contact fields needed in the final resume.
- ATS, skill-gap, and interview operations exclude phone, email, and social/portfolio URLs while retaining skills, experience, education, summary/title, and JD context.
- Cover letters receive identity and relevant career context, excluding phone and social URLs unless required by output.
- LinkedIn optimization receives career content but not email, phone, or existing profile URLs.
- Uploaded-resume ATS remains text + JD because the uploaded document itself is the analysis input.
- Add pure tests for payload shapes; do not call Gemini.

### 5. Contact and analytics hardening
- Add a locked backend rate-limit table/function for contact submissions, keyed by a one-way server-side hash and callable only through trusted server code.
- Keep anonymous submissions. When a valid bearer token is present, derive and store `user_id` from verified authentication; never accept it from form input. Invalid supplied authentication will be rejected rather than treated as anonymous.
- Keep database-first save, then browser EmailJS notification, with the existing `VITE_EMAILJS_*` variables and no hardcoded credentials.
- Replace arbitrary analytics metadata with event-specific strict schemas that reject extra fields and PII-shaped keys/values while preserving current tracker status events.

### 6. Safer PDF entitlement flow
- Keep the server-authoritative entitlement consumption and shared PDF/DOCX entitlement rules.
- Add an explicit confirmation before a limited PDF entitlement is consumed, clearly stating that browsers cannot confirm whether Save was completed and cancellation after opening the print dialog may still use the entitlement.
- Consume immediately before opening the print dialog to prevent replay/exploitation; do not claim false completion. DOCX remains build-first, consume-second.

### 7. Complete account deletion
- Add an authenticated, idempotent server workflow using `context.userId` only.
- Preserve financial/audit rows by changing their auth-user references to nullable `ON DELETE SET NULL`; remove account linkage when the auth identity is deleted while retaining required transaction facts. Application/profile/resume/AI/analytics/role data will cascade or be deleted as appropriate.
- Add a destructive confirmation control to the existing subscription/account area.
- On success, clear query caches and all app-owned local/session storage, invalidate the session, and return to the public home page.
- Do not delete, reset, or alter payment, subscription, or credit records during development.

### 8. Legacy systems and disclosures
- Verify legacy usage symbols have no active call sites, then mark `app_users` counters, `consume_daily_quota`, `has_active_subscription`, and `transactions` compatibility paths as deprecated without dropping tables or data.
- Update the Privacy Policy to accurately describe encrypted saved resumes/JDs, minimized AI payloads, EmailJS contact processing, retention controls, AI-history deletion, and account deletion. Avoid unverifiable third-party retention claims.

## Database changes
- One additive/idempotent migration for encrypted columns, AI retention/deletion metadata, contact-rate-limit storage/RPC, same-owner constraints, and financial FK behavior required for safe account deletion.
- Preserve all existing RLS policies and grants; new contact-rate-limit storage will have RLS enabled, no browser policies, and service-role-only access.
- Apply the migration through the managed migration workflow. No truncation, bulk cleanup, or production data deletion.

## Verification
- Add pure tests for encryption round trips/context binding, minimized Gemini payloads, analytics schemas, and unchanged AI constants (10 RESUME/day, 30 ANALYSIS/day).
- Static/integration checks for owner filters, same-owner constraints, contact anonymous/authenticated paths, limiter behavior, AI-history deletion semantics, and account-deletion scoping using synthetic inputs only.
- Verify the account controls and PDF warning in the preview without triggering AI or consuming a download entitlement.
- Run the existing test suite, security lint/scan, and confirm the preview build is clean.

## Assumptions and limitations
- Existing plaintext sensitive rows are preserved through dual-read compatibility and migrate safely when their owner accesses/updates them; no unapproved bulk rewrite of production records will occur.
- Browser print APIs cannot prove that a PDF was saved. The implementation will prevent accidental pre-dialog consumption and disclose the cancellation limitation while retaining entitlement security.
- Financial records remain for audit/legal needs but lose their live account relationship after account deletion.
