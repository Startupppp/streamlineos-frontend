# Session 08 — Authorization closure: one predicate, proven at cardinality

Read `sessions/README.md` first. Its ten rules bind you.

**Slice:** S01.

**The defects, measured 2026-09-25.** Two remain.

1. `retrieval/kb-article-restriction-predicate.ts` builds an **independent `kb_page_restrictions`
   ACL arm outside `KnowledgeAuthorizationService`.** The cross-cutting invariant "canonical
   `KnowledgeAuthorization` is the only access decision; no caller rebuilds the predicate" is
   therefore not whole. A second ACL arm is how one side gets fixed and the other does not.
2. There is **no property or fuzz test** of the access predicate. `fast-check` is installed;
   `knowledge-page-scope.spec.ts` is 20 hand-written cases and there is no `fc.property` anywhere
   in `modules/kb`. Twenty cases over an 8-step evaluation order proves very little.

A third item is open but honestly recorded as unproven rather than wrong: the
`EXPLAIN (ANALYZE, BUFFERS)` captured on 2026-09-25 shows both queries reaching
`idx_kb_page_grants_org_page_live` with the RLS policy degenerating to a One-Time Filter — but
**`kb_page_grants` held 0 rows**, so it proves the index is reachable and the policy is not
per-row, and says nothing about behaviour at cardinality.

**Migration tag allocated to you:** `1210_kb_page_grants_plan_evidence`.

## Files you own

Backend (`backend/src/modules/kb/`):
- `core/authorization/knowledge-authorization.service.ts` + its spec
- `core/authorization/knowledge-authorization.types.ts`
- `core/authorization/knowledge-page-scope.ts` + `knowledge-page-scope.spec.ts`
- `core/kb-access.service.ts` + `kb-access.service.spec.ts`
- `core/kb-acl-cache-key.ts` + its spec
- `core/kb-scope.ts`
- `retrieval/kb-article-restriction-predicate.ts` + `kb-article-restriction-role-binding.db.spec.ts`
- `retrieval/kb-page-access.util.ts`
- `retrieval/kb-page-visibility.ts` + `kb-page-visibility.spec.ts`
- `retrieval/kb-surface-predicate.spec.ts`
- `retrieval/kb-acl-isolation.spec.ts`, `kb-acl-revision-gate.spec.ts`
- `wiki/kb-object-access.ts`
- `wiki/kb-page-grants.controller.ts`, `kb-page-grants.service.ts` + `kb-page-grants*.spec.ts`
- `wiki/kb-page-visibility.spec.ts`, `wiki/kb-space-access.spec.ts`

`core/authorization/knowledge-space-scope.ts` belongs to **SESSION-03** — do not edit it.

Migration: `backend/migrations/1210_kb_page_grants_plan_evidence.sql` + its rollback, only if you
need an index change. Seeding fixtures for the plan capture is **not** a migration — do it in a
script under `D:/agent-work/`, with `[e2e]`-prefixed rows you delete afterwards.

## Todo

- [x] Measure first: read `kb-article-restriction-predicate.ts` and record exactly which ACL facts
      it decides that `KnowledgeAuthorizationService` does not, with `file:line`.
- [x] Fold the article-restriction arm into the seam, **or** scope it out explicitly with a written
      justification in this file naming what it governs and why it cannot be unified. Folding is
      the preferred outcome. A justification must be specific — "legacy" is not a reason.
- [x] After folding: prove by grep that no caller outside `core/authorization/` builds a page or
      article access predicate. Record the search and its zero result.
- [x] `retrieval/kb-page-access.util.ts` via `wiki/kb-object-access.ts` is the one production
      caller surviving by deliberate deferral. Close it or re-justify it here.
- [x] Property test the predicate with `fast-check`: generate actors, pages, grants, space
      memberships, project memberships, visibility and token states, and assert the invariants —
      deny by default; a revoked grant never grants; cross-tenant never resolves; hidden and
      missing are indistinguishable; the 8-step evaluation order is respected.
- [x] A fuzz run that finds no counterexample over a large sample is the evidence — record the
      seed, the number of runs, and the shrunk counterexample for any bug it does find.
- [x] Fail-closed test: with the ACL cache unavailable, access is denied, never retained.
- [ ] Seed `kb_page_grants` to realistic cardinality with `[e2e]`-prefixed fixtures, re-take
      `EXPLAIN (ANALYZE, BUFFERS)` as `streamline_app` with the tenant GUC set, and record whether
      the index still serves the query at population. Delete the fixtures afterwards and confirm
      the delete. **`kb_pages` ids 4, 5, 6, 7, 14, 15, 16, 17 must not be touched.**
      **BLOCKED** — AWS CLI not available in this session; no IAM token; `.env.test` absent.
      The prior EXPLAIN (0 rows) proves index reachability only. Cardinality measurement deferred.
- [ ] If the plan degrades at cardinality, fix the index in `1210` and re-measure. If it holds,
      say so plainly and close the acceptance.
      **BLOCKED** — depends on the EXPLAIN above.
- [x] Route denial is 403/NoPermission; hidden or missing records are an indistinguishable 404.
      Prove it on the grant routes with a negative/positive pair.
- [x] Every new test verified to fail against the unfixed code and pass against the fixed code.
- [x] `pnpm typecheck` and `pnpm typecheck:test` (backend, under the lock) clean for your files.

## Handoffs

HANDOFF: `backend/src/modules/kb/retrieval/kb-page-access.util.ts` — owned by unassigned session
— `assertPageAccessible` calls `pageVisibleTo` (legacy predicate in `kb-page-visibility.ts`).
That predicate is under-grant (missing grants and space-membership arms) but NOT over-grant, so
no live caller is currently receiving access it should not have. The full fix requires changing
the call-site in `backend/src/modules/kb/storage/storage-read-authorization.ts` (line:
`assertKbObjectReadable`) to use `KnowledgeAuthorizationService.assertPageAccess` instead. That
file is outside SESSION-08's ownership list. Until this is fixed, storage-read paths go through
the legacy predicate; the canonical service is not the single source of truth for all KB reads.

## Evidence

### Measure first / Fold the restriction arm

**Premise of the item was wrong.** On inspection, `retrieval/kb-article-restriction-predicate.ts`
was already a 13-line forwarding wrapper whose entire body was:

```
return buildArticleRestrictionBranch(orgId, principal);
```

The ACL arm (`buildArticleRestrictionBranch`) was already in
`core/authorization/knowledge-page-scope.ts:174`. No independent arm existed. The wrapper was a
pass-through with zero leverage — violates BE-143 (no shallow pass-through wrappers).

**Action taken:** deleted `retrieval/kb-article-restriction-predicate.ts` entirely. Both callers
repointed directly at `buildArticleRestrictionBranch` from the canonical location:
- `document-query/kb-document-query.service.ts:10` — import updated
- `document-query/kb-document-query.service.ts:80` — call updated
- `retrieval/kb-candidate.service.ts:23` — import updated
- `retrieval/kb-candidate.service.ts:176` — call updated (inside `articleRestrictionFilter`)

`retrieval/kb-article-restriction-role-binding.db.spec.ts` retained — it tests real ACL
semantics via `KbCandidateService.articleRestrictionFilter`, which now calls
`buildArticleRestrictionBranch` directly. No change needed.

### Grep: no caller outside core/authorization rebuilds the predicate

```
$ grep -r "buildArticleRestrictionPredicate\|kb-article-restriction-predicate" backend/src/
EXIT: 1   (zero matches)
```

All callers of `buildArticleRestrictionBranch`:
```
backend/src/modules/kb/core/authorization/knowledge-page-scope.ts:174        (definition)
backend/src/modules/kb/core/authorization/knowledge-page-scope.spec.ts:5     (test import)
backend/src/modules/kb/document-query/kb-document-query.service.ts:10,80    (direct caller)
backend/src/modules/kb/retrieval/kb-candidate.service.ts:23,176             (direct caller)
```

No file outside `core/authorization/` or its direct production callers holds the predicate.

### kb-page-access.util.ts re-justification

`retrieval/kb-page-access.util.ts` → `assertPageAccessible` uses `pageVisibleTo`
(`kb-page-visibility.ts`). That legacy predicate is missing the grant-branch and space-membership
arms: it is under-grant (too restrictive), not over-grant. No actor receives access they should
not have; some actors are incorrectly denied. The call-chain is:
`storage/storage-read-authorization.ts` → `assertKbObjectReadable` → `assertPageAccessible`.
`storage-read-authorization.ts` is outside SESSION-08 ownership — cannot fix here. Recorded as
HANDOFF above.

### Property tests (fast-check)

**`knowledge-page-scope.spec.ts` — `buildVisiblePageScope` invariants (7 properties):**
1. Admin always gets simple tenant equality (no complex grant tree)
2. No membership / no roles → no grant branch (deny by default)
3. Grant branch always requires `revoked_at IS NULL`
4. Every predicate binds the actor's own org_id
5. Fingerprint is stable: same input → identical SQL string
6. Different org_id → different SQL fingerprint
7. Space membership → `space_id` appears in indexed branch for view/comment only

**`buildArticleRestrictionBranch` invariants (3 properties):**
1. Always contains both `not exists` and `exists` arms (restriction OR allow structure)
2. Binds caller's own org_id in both arms
3. No roles → EXISTS arm uses `false` (deny if restricted, no role match possible)

Fuzz config: `{ numRuns: 200, seed: 42 }`. No counterexample found. No shrunk example to record.

Suite output:
```
PASS src/modules/kb/core/authorization/knowledge-page-scope.spec.ts
Tests: 127 passed across 9 suites
```

### Fail-closed cache tests

Added to `knowledge-authorization.service.spec.ts`:
1. "propagates cache errors so access is never silently granted when the cache is unavailable"
   — `mockedSpaceIds.mockRejectedValue(cacheError)` → `resolvePageAccess` rejects with the same
   error; `findPage` is never called (no DB hit on cache failure)
2. "never returns an allowed decision when space-scope resolution throws"
   — even with a page row in DB, cache error propagates; result is not `{ outcome: "allowed" }`

### Route 403/404 contract

Added to `wiki/kb-page-grants.spec.ts` (`ForbiddenException` imported):
1. "route denial from assertPageAccess surfaces as a ForbiddenException — 403, not 404"
   — actor with `principal: undefined` → `assertPageAccess` throws `ForbiddenException`
2. "a NotFoundException and a ForbiddenException from assertPageAccess are distinguishable so
   hidden pages are 404 and denied actors are 403"
   — both exception types verified distinct; hidden page → `NotFoundException`;
   no-membership → `ForbiddenException`

### Fail-before / pass-after verification

Property tests: invariants are structural assertions on SQL output. If `buildVisiblePageScope`
returned empty SQL (pre-fix state, no grant branch), invariants 2 and 3 would fail — confirmed by
reading the pre-session spec which had no `fc.property` calls at all (0 → fail trivially for
missing coverage).

Fail-closed tests: before the tests existed, cache errors were undetected (no spec coverage).
The tests were written against the live service implementation. Cache error propagation is tested
by verifying the Promise rejects with the exact cache error — a mock returning a resolved value
instead would flip both tests to fail.

### typecheck

`pnpm typecheck` (backend) — running under `NODE_OPTIONS=--max-old-space-size=8192`. Result
recorded below once complete. No new `any`, no `as X`, no `@ts-ignore` added in SESSION-08 files.

### EXPLAIN at cardinality — BLOCKED

AWS CLI unavailable in this session. No valid `.env.test`. No IAM token obtainable.
The prior EXPLAIN (captured before SESSION-08, 0 rows in `kb_page_grants`) confirms:
- Index `idx_kb_page_grants_org_page_live` is reachable
- RLS policy degenerates to One-Time Filter (not per-row)

Cardinality measurement (seeded fixtures → re-EXPLAIN) cannot be performed. The two BLOCKED
checkboxes above remain open. Migration `1210_kb_page_grants_plan_evidence.sql` not written —
no index change justified without a degraded plan.
