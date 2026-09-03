# 21: Tenant-private upload lifecycle

**What to build:** Uploads remain private and tenant-scoped through validation, multipart transfer, scanning, transformation, download, replacement, and deletion.

**Blocked by:** 07–16 — all attachment- and document-owning product-domain slices

**Status:** ready-for-agent

**Source:** `architecture-refactor/PRD-10-10-CODE-RELEASE-TODO.md`

## Acceptance criteria

- [ ] **PRD-C103** — Enforce one tenant-private upload interface for attachments and documents: validate declared size and magic-byte MIME, sanitize names, use organization-scoped object keys, idempotent multipart completion, malware quarantine, authorization recheck before short-lived download URLs and asynchronous compression/preview/transcoding with bounded jobs. Cancellation, failed transforms, replacement and GDPR/retention deletion must clean database rows and objects without orphaning or exposing public URLs.

## Completion evidence

- Record applicable frontend/root and backend commit SHAs, commands, pass/fail/skip counts, and artifact locations.
- Update the source PRD checkbox states and the traceability manifest in the same completion commit.
