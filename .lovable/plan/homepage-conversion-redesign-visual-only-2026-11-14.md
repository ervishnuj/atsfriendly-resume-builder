# Homepage conversion redesign (visual only)

Goal: turn visitors into free ATS Checker users, then guide them to job-specific resume generation. Only the homepage layout, wording and visuals change. Sign-in, payments, prices, plan limits, AI and database stay exactly as they are.

## Homepage sections, in order
1. **Hero** — "Your Resume Deserves More Than an ATS Rejection." with the subheading from your brief. Main button "Check My Resume Free" opens /ats-checker, second button "Build My Resume" opens the builder. Note underneath: "Start with our free ATS checker. No signup required." On the right, a small product preview card.
2. **Product preview (sample)** — ATS readiness score, job match score, matched and missing keywords, suggestions and one before/after bullet. Labelled "Fictional sample data" and drawn in code, with no screenshots or stock photos.
3. **3-step workflow** — Upload (PDF, DOCX or pasted text) → Add job description → Improve and generate, followed by a button.
4. **Feature cards** — only features that already work: free checker, job matching, keyword analysis, missing keywords, AI optimization, skill gap and learning plan, job-specific generation, PDF and DOCX export, job tracker.
5. **Who it helps** — freshers, experienced professionals, software developers and career switchers, each with an honest "no fabricated skills" note.
6. **Free checker promo** — "Not Sure Whether Your Resume Is ATS-Friendly?" with the free vs account explanation and a note that scores are estimates.
7. **Pricing summary** — Free / ₹39 / ₹149 / ₹399, using the real plan settings for limits, downloads and validity, and linking to the existing pricing page. The pricing page gets a clearer "What's free vs paid" block and stacks neatly on phones.
8. **Trust and transparency** — why tailoring matters, why keyword stuffing doesn't help, why your experience must be genuine, why scores are estimates, and how data is handled (based on the current privacy policy), with links to Privacy, Terms, Contact and About.
9. Keep the existing FAQ and final call to action.

## Look
A light background with blue as the main color and violet as a light accent, line icons, rounded cards with soft shadows and hardly any animation. Existing color tokens are adjusted, not replaced.

## Not included
- No fake reviews, user counts or success rates.
- No guarantees about interviews or passing the ATS.
- No popups.

## Checks after building
- Every homepage button goes to the right page.
- The checker works with an upload and with pasted text.
- The pages show correctly on a phone with no sideways scrolling.
- Title, description, canonical, social tags and sitemap are unchanged.
- Tests pass.
- Resume generation and payments are not run, because they use paid AI and real money.

## Technical notes
Edits src/routes/index.tsx (split into components under src/components/home/), src/routes/pricing.tsx and src/styles.css tokens. Prices come from the existing plan config. No schema, RLS or entitlement changes. The existing HOMEPAGE_VIEWED event is kept.
