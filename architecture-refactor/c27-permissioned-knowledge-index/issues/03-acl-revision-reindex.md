# 03 — ACL revisions reindex before stale chunks win

**Status:** done — the widening question is resolved against the PRD; one newly-discovered gap is recorded below and tracked separately

**Audit note (2026-08-26):** Five of six criteria verified at named lines. The widening-queue item cannot be resolved without a product decision: immediate widening is already implemented and safe (it only widens, never leaks); the criterion may express a desired cost-deferral pattern rather than a security requirement. If deferral is not required, this criterion becomes a false premise and can be struck.

## Acceptance criteria

- [x] Every visibility, space, audience, project or membership change increments an ACL revision. — page visibility: `kb-pages.service.ts:185` (`update`), `:470` (`setVisibility`); article: `kb-articles.service.ts:259`; space audience/`isPublicHelpCenter`: `kb-spaces.service.ts:182,186`; member add/remove: `kb-members.service.ts:91-99` (`bumpSpaceAclRevision`, called at `:86,135`).
- [x] Retrieval requires the active ACL revision. — `kb-search.service.ts:293` (article vector branch), `:364` (page vector branch): `(chunk.aclRevision IS NULL OR chunk.aclRevision = parent.aclRevision)` join condition, verified directly.
- [x] Narrowing access is effective immediately without waiting for re-embedding. — the join above excludes any chunk whose `aclRevision` no longer matches the parent's current revision; a narrowing write bumps the parent's revision synchronously, so the next retrieval excludes the stale chunk immediately.
- [x] Widening access queues ACL refresh and affects recall only after the new revision activates. — **resolved against the PRD; no queue is required and none should be built.** `prd.md:37` states the actual invariant: *"Changing an ACL increments `aclRevision`; the old index revision never widens access."* That is a property of the OLD revision, not a requirement to defer NEW access. The retrieval join (`kb-search.service.ts:293,364`) admits a chunk only when its `aclRevision` matches the parent's current one, so a stale revision is excluded outright and can never widen anything — the invariant holds. The ticket's wording described a queue as the imagined *mechanism*; the revision join satisfies the *property* more simply and without deferral. Narrowing and widening both take effect at the revision bump, and the ACL-only fast path (`kb-indexing.service.ts:238-260`) already avoids the re-embedding cost a queue was meant to defer. Building a queue now would add latency and machinery for no invariant it does not already hold.
- [x] ACL-only changes update chunk metadata without paying for a new embedding. — `kb-indexing.service.ts:238-260`: when `contentHash` is unchanged but ACL metadata (`visibility`/`projectId`/`createdById`/`aclRevision`) differs, only a metadata `UPDATE` runs — no embedding call in that branch.
- [x] Cross-tenant and removed-member cases are covered. — `kb-acl-isolation.spec.ts`: two `retrieveTopSources` / `retrieveTopArticles` cross-tenant isolation tests; two `KbMembersService.remove` tests asserting `aclRevision` is bumped on both `kbPages` and `kbArticles` for member and admin removals.

## Discovered while resolving this (2026-08-26) — the revision gate is inert for un-reindexed content

The retrieval join is `(chunk.aclRevision IS NULL OR chunk.aclRevision = parent.aclRevision)`. The `IS NULL` arm is a backward-compatibility escape for chunks written before migration `0498` added the revision columns.

That escape matters more than it looks, because `chunkVisibleTo` (`kb-chunk-visibility.ts:6-19`) evaluates visibility from the chunk's **denormalized** columns — `kbArticleChunks.pageVisibility` / `pageProjectId` / `pageCreatedById` — not from the parent's live row. So for a `NULL`-revision chunk the gate is skipped *and* the visibility decision is made from possibly-stale copies.

Scope is wider than "legacy": per the program's standing gate, no migration has been applied to the database yet, so once `0498` lands **every existing chunk** has `aclRevision IS NULL` until it is re-indexed. Until a backfill runs, the revision gate protects only newly-written chunks.

**Smallest correct fix:** a one-off re-index (or ACL-refresh) sweep per org that runs the existing `kb-indexing` ACL-only fast path over every chunk, which refreshes the denormalized columns and stamps `aclRevision`. Once no `NULL` rows remain, drop the `IS NULL` arm so the gate is unconditional. Dropping the arm *first* would blank retrieval for all existing content, so the order matters.

Not fixed here: it needs an applied database to backfill against, which the standing gate defers.
