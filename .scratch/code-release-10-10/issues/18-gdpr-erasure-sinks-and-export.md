# 18 — Finish GDPR erasure sinks and prove subject export is exhaustive and resumable

**What to build:** Database PII erasure and session revocation are already implemented. The remaining sinks are object storage, search and vector indexes, derived projections, caches and supported adapters — plus the export side, which must never silently cap.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] Erasure is idempotent, tenant-scoped in SQL, audited and legal-hold-blocking across every remaining sink; immutable and legal-hold records are preserved rather than deleted.
- [ ] Every drain uses a keyset cursor rather than a fixed limit. A bare limit reports a prolific subject as fully erased while leaving their chunks and embeddings behind — this exact defect has already occurred twice here.
- [ ] Subject export is exhaustive and resumable with no silent caps and no skipped in-scope source.
- [ ] Correction is implemented as correction. Export, deletion and anonymization are not substitutes for rectification.
- [ ] Authentication-linked fields require a verification challenge rather than a blind update.
- [ ] Document, payroll, export, purge and retention workflows are each proven never to silently skip or truncate growing work.
- [ ] Object-storage deletion removes the object, not only the database row — an orphaned object with a public URL survives the record that pointed at it.
