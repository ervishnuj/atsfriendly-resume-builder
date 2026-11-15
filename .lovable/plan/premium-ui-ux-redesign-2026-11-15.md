# Premium UI/UX redesign

## Scope and safeguards
Refresh the existing application in controlled visual stages, not rebuild it. Keep all prices, configured plan benefits, authentication, permissions, database structure, AI prompts, scoring, credit deductions, payment verification, candidate data and PDF/DOCX export behaviour unchanged. Do not publish or change existing user data.

## 1. Shared design and navigation
- Apply the supplied royal-blue, violet, lavender, white and status colours through shared semantic tokens, with accessible foreground colours for status messages and appropriate dark equivalents.
- Load Inter and standardise headings, paragraph spacing, 44px touch controls, inputs, focus states, borders, restrained shadows and card corners.
- Add reusable page-heading, metric, status-badge and empty-state treatments rather than independently styling each screen.
- Simplify the public header to Home, Free ATS Checker, Resume Builder, Features, Pricing, Guides and Login/Dashboard. Use existing destinations, active states and an accessible collapsible mobile menu; keep the free checker action visible.
- Keep motion subtle and honour reduced-motion preferences. Leave printed resume typography and pagination isolated from application typography.

## 2. Homepage, public pages and pricing
- Replace the homepage headline and supporting copy with the supplied text: “Build a Resume That Matches Your Dream Job.” and “Check your resume against job descriptions, discover relevant missing keywords and create a job-specific resume with TheResumeRocket.”
- Use “Check My Resume Free” as the main action and “Create My Resume” as the secondary action.
- Retain the product demonstration with readiness and match estimates, matched/missing keywords and evidence-based suggestions; label all fictional results as demonstration data.
- Retain and visually refine the existing three-step workflow, feature sections, pricing, FAQs and trust information. Avoid unsupported outcome claims.
- Restyle login, signup, password pages, guides and other public pages through the shared design without changing how they work.
- Pricing cards continue to read configured plans and benefits; highlight only the existing configured highlighted plan, without claiming unverified popularity or inventing promotions.

## 3. ATS Checker and resume builder
- Give the checker a balanced upload/paste and job-description workspace, clear labels, extraction/analysis progress, existing retry/error messages, and readable result groups.
- Preserve drag-and-drop, browse, filename, replace/remove, extracted-text review and all existing file validation and keyword evidence details.
- Keep readiness separate from job match. Use semantic success/warning/error badges with descriptive text, not colour alone, and retain truthful suggestions and the tailored-resume next action.
- Introduce clear builder progress and section navigation for personal details, summary, skills, experience/projects, education, job description and preview/generation.
- **Existing-field constraint:** projects currently share the Experience / Projects fields. Keep this storage and classification intact; do not introduce a second project collection or relabel projects as employment. Present the summary separately using its existing field.
- Keep every existing builder field, import, learning plan, validation message, saved-progress path and resume-editing action available. Improve mobile navigation and the preview/export toolbar without altering generation or download charging.

## 4. Dashboard and signed-in pages
- The current `/dashboard` redirects to the builder. Replace it with an account-protected dashboard using existing authorized reads and keep the builder directly accessible.
- Show a welcome area, saved resume count and recent resumes, available allowances/credits, active subscription, tracker summary and quick actions using actual account data only.
- Show ATS history only where existing account-scoped reads expose it; otherwise show available analysis usage and links rather than create a new history service or fabricate records. Label capped list counts accurately.
- Refine tracker filters, dates, linked resumes, status badges and mobile application cards; retain all existing statuses and rules.
- Refresh account settings, partner dashboard and admin pages with the same visual treatments. Preserve existing role gates; ordinary users never receive partner/admin navigation or data.

## 5. Verification and completion report
- Run the existing full regression suite and inspect preview error signals.
- Test homepage/navigation, pricing, public checker pasted-text analysis, synthetic PDF/DOCX extraction and recoverable upload failures.
- Check layouts at desktop/tablet and 360px, 390px and 430px widths for overflow, text fit, touch targets, keyboard focus and reduced motion.
- Use the available authorized session for read-only dashboard, builder, tracker, account and admin checks. Do not create accounts, send reset emails, save production changes, delete data or verify payments as part of visual testing.
- Verify safe builder section navigation and preview controls without running paid AI or consuming download credits. Run existing export/generation regression tests; report live generation and entitlement-charging exports as unverified unless separately authorized.
- Partner-account end-to-end testing remains dependent on a user-selected suitable partner account; do not treat an admin session or mocked data as proof of partner access.
- Inspect page-specific titles/descriptions and retain canonical/noindex behaviour; add appropriate metadata to the new dashboard.
- Report pages updated, reusable treatments, actual test results and remaining visual or account-dependent verification gaps. Nothing is published automatically.

## Technical approach
Keep TanStack routes and existing protected data functions. Use shared CSS tokens and shadcn variants, frontend-only navigation state for the builder, and a protected dashboard route reusing existing reads. Do not edit generated clients/types or add migrations, dependencies for visual effects, new API endpoints or payment/AI integrations.