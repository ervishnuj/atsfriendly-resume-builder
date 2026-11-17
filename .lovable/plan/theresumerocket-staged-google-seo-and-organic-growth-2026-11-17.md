# TheResumeRocket — staged Google SEO and organic growth

## Objective and safeguards
Improve relevant organic discovery and checker usage, with no ranking guarantees, paid promotion, fake reviews/backlinks, mass-generated pages or changes to authentication, scoring, exports, credits, pricing or payments. Preserve the recent visual redesign and every working public URL. New content will be available for review in preview; publishing remains a separate explicit decision.

## Audit findings
### Verified Google evidence
Read from **Vishnu's Google Search Console**, using its exact verified `https://theresumerocket.com/` property:
- **16 October–12 November 2026:** 116 impressions, 0 clicks, 0% CTR, average position 27.47. These are search impressions, not visits or customers.
- Homepage: **submitted and indexed**, Google-selected canonical matches the homepage.
- ATS format guide: **submitted and indexed**, canonical matches. Recent visible queries include “ats format” and “ats friendly date format”; query-level evidence is sparse and positions mostly 54–98. It does not support claiming first-page traction.
- Free checker: **discovered, currently not indexed**. Google lists the sitemap as its discovery source; inspection provides no fetch or exclusion diagnosis.
- Login: **excluded by noindex**, confirming the earlier exclusion is being processed. Historical performance rows do not mean it is currently indexed.
- Sitemap: 22 submitted URLs, 0 warnings, 0 errors. Deprecated indexed-count fields are ignored. This is not a complete inventory of Google's index.

### Technical/content evidence
- Fresh foundations scan: all nine checks pass. Existing stored full-content/metadata scans are stale and are not treated as current findings.
- All 22 published sitemap URLs returned 200, with self-canonicals and no missing image alt attributes in the inspected HTML. Homepage/checker each have one H1. Sitemap has no `lastmod`; keep it omitted unless a genuine page-specific timestamp exists.
- Template gallery emits seven H1s because embedded resume names are H1s. Fix only non-print gallery semantics, preserving actual resume/export typography.
- Public homepage title omits the distinctive TheResumeRocket brand and understates the free checker.
- `/builder` is an authenticated workspace, not a public SEO landing page. Its initial published HTML has generic root metadata without a robots exclusion; audit all protected pages' initial responses and add a narrow private-page exclusion without exposing profiles or changing sign-in.
- Existing format/keyword/rejection content contains unsupported universal claims: “most rejections,” parsing “every time,” fixed keyword-coverage thresholds and absolute ATS behaviour. Replace these with accurate, qualified guidance and clearly fictional examples.
- The three existing guides and five blog articles already cover several requested intents. Improve them rather than duplicating them.
- No trustworthy organic signup/paid attribution is established by current content-free event counts. Report unavailable conversions honestly; do not add invasive tracking or a new reporting database.
- Single published response samples took approximately 0.11–0.78 seconds; these are HTTP response timings, **not** Core Web Vitals or field performance.

## Keyword-to-page mapping
Semrush **India** estimates, sampled during this audit:

| Page | Primary intent / keyword | Supporting queries | Evidence and action |
|---|---|---|---|
| `/` | TheResumeRocket product overview | free checker, job-specific resume creation | Brand/product overview; link to the distinct tool pages rather than competing with them |
| `/ats-checker` | free ATS resume checker | online checker, job-description match, score estimate, relevant missing keywords | ~6,600 searches/month, difficulty 58/100; competitive, retain the functioning tool as the main experience |
| Proposed `/ai-resume-builder` | AI resume builder | ATS-friendly/job-specific builder, resume optimization | ~12,100/month, difficulty 86/100; truthful product overview, not a claim of easy rankings |
| `/guides/ats-resume-format` | ATS resume format | ATS-friendly dates, selectable PDF, headings | ~1,300/month, difficulty 54/100; indexed existing page gets priority |
| `/guides/ats-keywords` | truthful job-description keyword matching | find relevant missing keywords, keyword relevance | Existing guide; exact demand/difficulty not yet researched |
| `/blog/tailor-resume-in-20-minutes` | how to tailor a resume | job-specific summary and bullets | Existing workflow article; keep distinct from keyword extraction |
| `/guides/resume-mistakes` | practical resume mistakes | formatting, dates, evidence, proofreading | Existing practical checklist |
| `/blog/why-ats-rejects-resumes` | screening/rejection explanations | readability, eligibility, recruiter criteria | Existing diagnostic article; avoid duplicating the mistakes checklist |
| `/resume-templates` | ATS-friendly resume templates | readable template selection | Existing real template gallery |
| Proposed `/guides/java-developer-resume` | Java developer resume | fresher projects, Spring Boot evidence, testing | ~720/month, difficulty 12/100; more focused opportunity, still competitive |
| Proposed `/guides/backend-developer-resume` | backend developer resume | API/data/testing examples | Related-term demand ~210/month; difficulty unknown until separately researched |
| Proposed fresher/full-stack/software-engineer/experienced guides | each audience's specific resume structure | relevant evidence, projects, seniority | Research exact India demand/intent first; unknown is not zero. Publish only genuinely distinct useful content |

Semrush competitors for checker include ResumeGenius, ResumeGo, Jobalytics and ATSFriendly; for Java examples include ResumeWorded, Naukri, BeamJobs and Enhancv. Reviewed search-page content also shows JavaTechOnline and Internshala answering structure, skills and project-evidence questions. Differentiate with truthful project-to-keyword examples and a working local checker, not copied content or unsupported employer claims.

## Stage 1 — existing-page corrections
1. Apply the supplied branded homepage title and clear description; retain its approved H1 and layout.
2. Improve checker headings and concise supporting editorial content **below the tool**: estimates, extraction limits, relevant keywords, formatting checks and privacy. No mandatory signup or published user results.
3. Correct unsupported guide/blog claims, prioritising the indexed ATS format/date guide. Improve examples, related questions, descriptions and contextual links.
4. Audit every content page's unique title/description/social metadata and self-canonical; fix actual gaps rather than rewrite all pages indiscriminately. Remove stale pricing references from protected page descriptions instead of changing money rules.
5. Correct gallery heading hierarchy with a preview-only option; keep printable resume rendering unchanged.
6. Ensure initial private-page responses carry noindex while preserving guards, public pages and crawler permissions.

## Stage 2 — public builder overview and reviewed role content
1. Add `/ai-resume-builder`, keeping `/builder` protected and unchanged. Explain actual profile/import, job-specific generation, review, PDF/DOCX exports and configured plans/usage. Link to the working builder and pricing; no invented free/unlimited benefits.
2. Research remaining exact role keywords and current competing pages, then draft the requested six distinct guides. Start with Java and freshers; backend/full-stack/software-engineer/experienced guides must each contain different structures, evidence examples and mistakes, not title-swapped text.
3. Label sample candidates/projects as fictional. Separate training and personal projects from employment; never encourage adding unearned skills or invented metrics.
4. Link new guides from the existing guide index and relevant articles/tools; avoid orphan pages and keyword cannibalisation.

## Stage 3 — structured data, discovery and verification
- Keep existing valid Organization/WebSite/WebApplication/Article data; align brand names and factual descriptions. Add BreadcrumbList where visible breadcrumbs support it. No new FAQPage, review ratings, addresses or unsupported awards.
- Preserve the existing sitemap implementation; add only canonical public pages actually created. Keep login/register/workspace/partner/admin/API routes excluded; retain robots blocks. Do not invent update timestamps.
- Validate JSON-LD parsing, types, URLs and truthful fields; report eligibility separately from syntax. Google's live Rich Results Test remains a manual external check when not available through tools.
- Check public page responses, aliases/404s, internal links, canonical uniqueness, metadata and mobile widths. Re-run the complete regression suite and synthetic checker PDF/DOCX/paste flow without paid AI or financial operations.
- Measure desktop/mobile lab LCP/CLS and representative interaction timing; identify genuine bottlenecks before changing loading. Do not label synthetic timing as field INP or guaranteed CWV compliance.
- Record source changes versus published-state evidence separately. After an explicitly approved publish, recheck changed live pages and submit the sitemap once if its contents changed. Google URL Inspection API only reads indexed versions; manual indexing requests must use Google's interface.

## Deliverables and 30/60/90-day roadmap
Deliver a report and keyword map with exact observation periods, implemented changes, page inventory, tests, performance measurements, remaining manual actions and limitations.
- **Days 1–30:** review/publish corrected existing content, request checker indexing manually, validate discovery, share one useful fictional-example post through owned channels.
- **Days 31–60:** publish reviewed Java/fresher content, then research-backed role guides; compare same-length Search Console periods and improve relevant high-impression/low-CTR pages when enough evidence exists.
- **Days 61–90:** refine pages from actual query evidence and user feedback; approach placement cells, training institutes and relevant developer communities for optional editorial resource links using the existing outreach research. Recheck rules/contact details; no mass outreach, promised backlinks or automatic posting.
- Separate Search Console visibility from measured product visits/conversions. Report organic conversions as unavailable until a valid privacy-safe attribution source is established; no invented business results.

## Technical boundaries
Reuse TanStack route metadata and existing content/renderers. New content has leaf metadata and typed navigation; preserve route aliases and protected layout. Read Worker/server guidance before changing server-rendered exclusions or sitemap handling. No new database schema, paid APIs, scheduled SEO dashboard, auth replacement or entitlement path. A saved SEO measurement report satisfies this brief's dashboard section without creating another app inside the resume builder.

**Approval covers staged preview implementation, not publishing, paid promotion, real AI/credit tests or external outreach.**