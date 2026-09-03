# 21: Tenant-private upload lifecycle

**What to build:** Uploads remain private and tenant-scoped through validation, multipart transfer, scanning, transformation, download, replacement, and deletion.

**Blocked by:** 02 — Schema and executable-key minimization; 04 — API, Zod and OpenAPI contracts; 05 — Authentication, Organization, RBAC and Settings

**Status:** ready-for-agent

**Source:** `architecture-refactor/PRD-10-10-CODE-RELEASE-TODO.md`

## Acceptance criteria

- [ ] **PRD-C010** — **Uploads/operator cutover:** complete v2 ticket 21's code lifecycle and v2 ticket 34's deployed private-bucket/backfill evidence before cutover.
- [ ] **PRD-C103** — Enforce one tenant-private upload interface for attachments and documents: validate declared size and magic-byte MIME, sanitize names, use organization-scoped object keys, idempotent multipart completion, malware quarantine, authorization recheck before short-lived download URLs and asynchronous compression/preview/transcoding with bounded jobs. Cancellation, failed transforms, replacement and GDPR/retention deletion must clean database rows and objects without orphaning or exposing public URLs.
- [ ] **PRD-C104** — Make every architecture/release gate bite-proven with a known-bad fixture or mutation that fails for the intended reason. Critical tests must exercise transaction callbacks, authorization deny/cross-tenant paths, retries and failure branches; zero silently skipped/quarantined tests, vacuous mocks, swallowed promise failures or baselines raised merely to turn a regression green.

## Completion evidence

- Record applicable frontend/root and backend commit SHAs, commands, pass/fail/skip counts, and artifact locations.
- Update the source PRD checkbox states and the traceability manifest in the same completion commit.

