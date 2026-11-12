# User data isolation, security and performance — staged plan

## What the inspection found (read-only, no changes made)
- Every personal table already restricts rows to the signed-in owner: profile (exactly one per account), resume versions, templates, applications, learning plans, interview preps, AI usage, analytics, payments, subscriptions, transactions, free allowance.
- Payments, subscriptions and transactions are read-only for users; only verified admins change them.
- Partner records are limited to the partner's own active account; admin access uses the protected roles table.
- The public ATS checker reads files in the browser and saves nothing, so no anonymous data can mix with accounts.
- Uploaded resumes are not stored as files; the only storage bucket (payment QR) is admin-only.
- Gaps: no automated two-account test for the main user data; some list pages load full history; a few history lookups lack a fast index (transactions, resume history by date, applications by date).

## Stage 1 — Two-account isolation tests (no data changes kept)
- Add a rollback-only database test using two synthetic users (A and B) covering profile, resume versions, applications (including linking B's resume to A's application), learning plans, interview preps, AI history, payments, subscriptions, transactions: read, insert-as-other-user, update, delete and ownership change all denied for B.
- Add server-side tests confirming record IDs from the browser are checked against the signed-in user.

## Stage 2 — Fix anything Stage 1 finds
- Tighten only the specific rule that fails; never weaken existing protections.

## Stage 3 — Performance
- Add indexes for owner + date lookups on resume history, applications and transactions.
- Limit resume history and tracker lists to recent records with "load more".
- Measure homepage, checker, login, builder and history load before and after in the browser and report real numbers.

## Stage 4 — Regression checks
- Run all existing tests, the public checker with PDF, DOCX, pasted text, corrupt and password-protected files, signed-in builder, tracker and mobile view.

## Not included / limits
- No real AI generation, payments or credit use; generation, PDF/DOCX export and credit deduction are checked with existing tests and mocks only.
- No changes to pricing, limits, entitlements, sign-in or the checker's analysis.
- A real two-person browser test needs a second real account; the database test uses synthetic users that are rolled back.
