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
