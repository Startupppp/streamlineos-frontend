# 03 — ACL revisions reindex before stale chunks win

**Status:** in-progress — narrowing/ACL-metadata-update/revision-bump paths verified; widening-queues-refresh semantics and cross-tenant/removed-member test coverage remain open

## Acceptance criteria

- [x] Every visibility, space, audience, project or membership change increments an ACL revision. — page visibility: `kb-pages.service.ts:185` (`update`), `:470` (`setVisibility`); article: `kb-articles.service.ts:259`; space audience/`isPublicHelpCenter`: `kb-spaces.service.ts:182,186`; member add/remove: `kb-members.service.ts:91-99` (`bumpSpaceAclRevision`, called at `:86,135`).
- [x] Retrieval requires the active ACL revision. — `kb-search.service.ts:293` (article vector branch), `:364` (page vector branch): `(chunk.aclRevision IS NULL OR chunk.aclRevision = parent.aclRevision)` join condition, verified directly.
- [x] Narrowing access is effective immediately without waiting for re-embedding. — the join above excludes any chunk whose `aclRevision` no longer matches the parent's current revision; a narrowing write bumps the parent's revision synchronously, so the next retrieval excludes the stale chunk immediately.
- [ ] Widening access queues ACL refresh and affects recall only after the new revision activates. — not independently verified; the ACL-only fast path (next criterion) updates chunk metadata synchronously rather than queuing, so a widening change also appears to take effect immediately rather than being queued. Whether this matters in practice depends on whether "queued" was meant as a correctness requirement or a cost-deferral one — flagged rather than assumed.
- [x] ACL-only changes update chunk metadata without paying for a new embedding. — `kb-indexing.service.ts:238-260`: when `contentHash` is unchanged but ACL metadata (`visibility`/`projectId`/`createdById`/`aclRevision`) differs, only a metadata `UPDATE` runs — no embedding call in that branch.
- [ ] Cross-tenant and removed-member cases are covered. — not covered by a test in this batch; the `orgId` predicate is present on every query touched, but no dedicated cross-tenant/removed-member regression test was added.
