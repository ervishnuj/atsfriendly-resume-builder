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

- [ ] Add truthful, validated optimization and before/after scoring within the existing generation allowance
- [ ] Explain supported matches, underrepresented evidence, potential gaps, and changes in the result
- [ ] Add synthetic regression tests and verify without making paid AI requests
