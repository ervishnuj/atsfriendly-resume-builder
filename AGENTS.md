<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

Resume imports are parsed locally in the browser into existing profile fields, and ATS analysis strips contact identifiers before calling AI; this avoids uploading raw files or introducing a second profile storage path.

Job-specific optimization runs inside the existing guarded resume-generation function and validates generated fields against the original profile; this preserves one entitlement/usage path and prevents unverified identity, skills, roles, or dates from entering exports.

Learning/training evidence is classified from the candidate's supplied profile and weighted only in job-specific fit scoring; qualified skills remain labeled in the existing skills section so all exports stay truthful without changing the generic ATS checker or storage schema.

Learning plans are stored per account with deterministic milestones and no AI call; completed milestones reach the profile only through an explicit review step that adds labeled skills or personal projects, never employment.

Resume optimization keeps the source-backed candidate whenever a validated rewrite lowers either existing deterministic score; score-target guidance derives from the actual final breakdown, never a forced minimum or a changed scoring formula.

Generation prepares a deterministic evidence-backed skills inventory and ranks source bullets before rewriting; one-to-one bullet validation and inflection-only action alternatives preserve factual scope while permitting useful edits.

Optimization derives editing actions from the existing score breakdown and source-classified keyword gaps, then reports guidance from the final artifact; this targets real omissions without reusing stale recommendations or changing scoring formulas.

PDF export stays browser-native selectable HTML in normal print flow; PDF-only typography bounds and leaf-level pagination are shared with the A4 preview, leaving stored templates, DOCX, candidate data, and entitlements unchanged.

Public ATS file submission reuses browser-local extraction; contextual requirements and optional importance weights feed the existing scoring engine only in the public checker, preserving builder defaults without uploading files, persisting resume text, or adding AI requests.

Resume extraction uses the matching bundled PDF.js legacy reader/worker and stream getReader API, releases documents after every attempt, and distinguishes browser loading, password, malformed, image-only and empty-text errors so Safari without async stream iteration and repeated uploads remain supported without a second parser.

Guide and article renderers link existing contextual checker mentions using typed internal links, not injected HTML; this makes the tool discoverable while keeping editorial text safe.
- Job tracker reuses job_applications (platform, custom platform, DB-trigger status history, per-save idempotency key) and links resume_versions; a generated resume counts as applied only at Applied or later — keeps one tracker and honest counts.

Partner/reseller module: all money movement (credit consumption, release, purchase, invoice verification) runs through security-definer database functions (partner_consume_credit, partner_release_credit, partner_record_purchase, partner_verify_invoice) with advisory locks and idempotency keys — never trust client-submitted balances or prices. Partner accounts link to auth users by verified email on first dashboard visit (partners.user_id). Admin partner UIs live under src/routes/_authenticated/admin/partner-*.tsx, partner UIs under src/routes/_authenticated/partner/*. Shared money math is in src/lib/partner-math.ts (display/validation only; the database recomputes authoritatively).

Business and partner settings direct reads require the protected public.user_roles admin row, including for the existing owner; never widen SELECT to all authenticated users to repair missing admin assignments. Settings-access integration tests are read-only backend checks and must never mutate permissions or settings.
