# 03 — ACL revisions reindex before stale chunks win

**Status:** ready-for-agent

## Acceptance criteria

- [ ] Every visibility, space, audience, project or membership change increments an ACL revision.
- [ ] Retrieval requires the active ACL revision.
- [ ] Narrowing access is effective immediately without waiting for re-embedding.
- [ ] Widening access queues ACL refresh and affects recall only after the new revision activates.
- [ ] ACL-only changes update chunk metadata without paying for a new embedding.
- [ ] Cross-tenant and removed-member cases are covered.
