# 33 — One tenant-private upload interface covering the whole file lifecycle

**What to build:** A single upload seam for attachments and documents that validates, quarantines, scopes and expires — and cleans up completely on cancellation, failure, replacement and erasure.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] Declared size and magic-byte MIME are validated; names are sanitized; object keys are organization-scoped.
- [ ] Multipart completion is idempotent; a retried completion does not duplicate or orphan.
- [ ] Malware quarantine runs before the object becomes reachable.
- [ ] Authorization is rechecked immediately before minting a short-lived download URL, not only at list time.
- [ ] Compression, preview and transcoding run asynchronously as bounded jobs, off the request thread.
- [ ] Cancellation, failed transforms, replacement and GDPR/retention deletion each clean both the database row and the object, with no orphan and no surviving public URL.
- [ ] No upload path mints a permanent public URL. Verify existing stored URLs, not just the code that creates new ones — a backfill is part of this ticket if any remain.
- [ ] Cross-tenant file keys are rejected at the seam rather than trusted from the client.
