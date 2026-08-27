# 03 — ACL revisions reindex before stale chunks win

**Status:** in-progress — widening-queues-refresh semantics unresolved; product decision needed; all other criteria done

**Audit note (2026-08-26):** Five of six criteria verified at named lines. The widening-queue item cannot be resolved without a product decision: immediate widening is already implemented and safe (it only widens, never leaks); the criterion may express a desired cost-deferral pattern rather than a security requirement. If deferral is not required, this criterion becomes a false premise and can be struck.

## Acceptance criteria

- [x] Every visibility, space, audience, project or membership change increments an ACL revision. — page visibility: `kb-pages.service.ts:185` (`update`), `:470` (`setVisibility`); article: `kb-articles.service.ts:259`; space audience/`isPublicHelpCenter`: `kb-spaces.service.ts:182,186`; member add/remove: `kb-members.service.ts:91-99` (`bumpSpaceAclRevision`, called at `:86,135`).
- [x] Retrieval requires the active ACL revision. — `kb-search.service.ts:293` (article vector branch), `:364` (page vector branch): `(chunk.aclRevision IS NULL OR chunk.aclRevision = parent.aclRevision)` join condition, verified directly.
- [x] Narrowing access is effective immediately without waiting for re-embedding. — the join above excludes any chunk whose `aclRevision` no longer matches the parent's current revision; a narrowing write bumps the parent's revision synchronously, so the next retrieval excludes the stale chunk immediately.
- [ ] Widening access queues ACL refresh and affects recall only after the new revision activates. — the ACL-only fast path (`kb-indexing.service.ts:238-260`) synchronously updates `aclRevision` in chunk metadata when content is unchanged, so widening takes effect immediately too. The criterion implies queuing for deferral; the implementation makes widening instant without queuing. Whether the product requires deferral (a cost-control concern) or whether immediate widening is acceptable must be decided — if deferral is required, the fast path must write a reindex task instead of updating the chunk directly. Genuinely open pending product decision.
- [x] ACL-only changes update chunk metadata without paying for a new embedding. — `kb-indexing.service.ts:238-260`: when `contentHash` is unchanged but ACL metadata (`visibility`/`projectId`/`createdById`/`aclRevision`) differs, only a metadata `UPDATE` runs — no embedding call in that branch.
- [x] Cross-tenant and removed-member cases are covered. — `kb-acl-isolation.spec.ts`: two `retrieveTopSources` / `retrieveTopArticles` cross-tenant isolation tests; two `KbMembersService.remove` tests asserting `aclRevision` is bumped on both `kbPages` and `kbArticles` for member and admin removals.
