# Upload Existing Resume safely

## Goal
Add a zero-credit way for signed-in users to import a PDF or DOCX resume, review and correct extracted details, and continue in the existing builder. Keep the current manual, ATS, generation, export, pricing, and authentication behavior unchanged.

## Implementation
1. **Verify current protections**
   - Record static evidence for encryption, legacy reads, owner-only operations, contact controls, analytics validation, account deletion, RLS assumptions, AI data minimization, and unchanged usage rules.
   - Fix only verified defects. The initial review found no security defect; it found missing automated regression coverage.

2. **Extract locally without storage or AI**
   - Reuse the existing in-browser PDF and DOCX readers and 5 MB limit.
   - Tighten file extension/MIME consistency checks and preserve friendly errors for empty, damaged, password-protected, scanned, or unsupported files.
   - Do not upload or permanently store the original file.

3. **Map text into the existing profile**
   - Add a deterministic parser for contact details and common resume headings.
   - Map supported details into the existing personal, skills, experience/projects, and education fields.
   - Preserve certifications, achievements, languages, and other recognized sections as clearly labeled editable entries within the existing supported fields rather than inventing values.
   - Leave uncertain fields blank and surface review notes.

4. **Review before applying**
   - Add a focused upload dialog with progress messages, clear errors, and a Try Again action.
   - Show “Review Your Resume Details” and the existing editable profile form before continuing.
   - When a profile already contains information, show differences and require an explicit choice: keep existing information or replace it with the reviewed extraction. Nothing is silently overwritten.

5. **Integrate with the current builder**
   - Add the requested upload/manual choice at the existing profile entry area.
   - Apply approved extracted data to the same profile state, storage, templates, editor, ATS, generation, PDF, and DOCX flows already used by manual creation.
   - Do not add database tables, storage buckets, server upload endpoints, or a second generation path.

6. **Validate without paid operations**
   - Add pure tests for parsing, merge/difference behavior, analytics rejection, payload minimization, and unchanged AI constants where practical.
   - Use synthetic PDF/DOCX fixtures to test extraction, review, editing, explicit replacement, errors, and the unchanged manual path.
   - Run type/static checks, the non-AI test suite, production build checks, database/security linting, and inspect preview diagnostics. Never invoke Gemini, reserve usage, consume download entitlements, or delete real data.

## Technical details
- The browser reads files using the existing `pdfjs-dist` and `mammoth` utilities.
- Parsed drafts use the existing `Profile` schema and `ProfileForm`; no new sensitive-data store is introduced.
- Existing operation-specific Gemini payload builders remain the only AI paths.
- RESUME stays 10/day and ANALYSIS stays 30/day with existing IST counting, cooldowns, duplicate caching, failure handling, reservations, and stale-request cleanup.
