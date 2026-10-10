# Security hardening roadmap

- [x] Add backward-compatible encrypted storage and strict resume validation
- [x] Add same-owner database and server checks
- [x] Add AI history retention/deletion controls without changing usage limits
- [x] Minimize operation-specific Gemini payloads
- [x] Add contact rate limiting and verified optional user linking
- [x] Restrict analytics metadata by event
- [x] Add honest PDF entitlement confirmation
- [x] Add account/data deletion controls with financial record retention
- [x] Mark legacy usage paths deprecated and update privacy disclosures
- [x] Apply migration and verify tests, security, and preview build

# Upload existing resume

- [x] Add deterministic PDF/DOCX-to-profile parsing with no AI calls
- [x] Add upload, progress, error, review, and edit experience
- [x] Require explicit keep/replace/difference choice for existing profiles
- [x] Connect reviewed data to the existing builder without changing manual flow
- [x] Add synthetic parser/security regression tests
- [x] Verify build, non-AI flows, security, limits, and diagnostics

# Job-specific resume optimization

- [x] Add truthful, validated optimization and before/after scoring within the existing generation allowance
- [x] Explain supported matches, underrepresented evidence, potential gaps, and changes in the result
- [x] Add synthetic regression tests and verify without making paid AI requests
- [x] Complete readability audit, auto-repair and final re-validation with factual review prompts
- [x] Add learning roadmap, final result review/edit/re-check and honest progress feedback
- [x] Test synthetic project, fresher, gap, and formatting scenarios without paid AI

# Learning and training-aware resume optimization

- [x] Classify JD skills by verified work, project, skill, learning, training, or gap using source evidence
- [x] Preserve truthful labels in generated resume and explain each requirement
- [x] Apply partial fit weighting for learning/training without changing generic ATS checks
- [x] Test synthetic statuses, existing-resume comparisons, and export content without paid AI or credits

# Updateable learning plans

- [x] Save job-skill gaps as private learning plans with milestones
- [x] Update milestone status and notes; review before adding evidence to profile
- [x] Synthetic tests without AI or credits

# Honest high-score optimization

- [x] Prioritize verified JD evidence and keep the stronger validated resume without changing scoring formulas
- [x] Explain score shortfalls and preserve qualifications, facts, billing and usage limits
- [x] Verify 38 synthetic regression tests, clean preview build and signed-in builder; no paid AI calls or credits
- [ ] Live generated-result verification — blocked by the requirement not to make paid AI calls during testing

# Automatic alignment quality

- [x] Surface source-backed work, project and study skills; prioritize relevant bullets
- [x] Improve constrained rewriting and final evidence validation without changing score weights; fix action-verb detection after bullet markers
- [x] Test complete generation with mocked AI across multiple profiles and job descriptions
- [ ] Verify final safeguards for short skill names and metric association
- [ ] Live AI output-quality verification — blocked by the requirement not to make paid AI calls during testing
