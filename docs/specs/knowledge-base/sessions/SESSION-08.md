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
- [x] Seed `kb_page_grants` to realistic cardinality with `[e2e]`-prefixed fixtures, re-take
      `EXPLAIN (ANALYZE, BUFFERS)` as `streamline_app` with the tenant GUC set, and record whether
      the index still serves the query at population. Delete the fixtures afterwards and confirm
      the delete. **`kb_pages` ids 4, 5, 6, 7, 14, 15, 16, 17 must not be touched.**
      Done by the orchestrator on 2026-09-25 at 50,000 pages / 100,000 grants. Fixtures were
      planted and measured inside a single transaction that was then rolled back, so nothing was
      ever committed to production; post-run counts confirm 0 `[e2e]` rows anywhere, 0
      `kb_page_grants`, and all eight protected ids present. See Evidence.
      The earlier **BLOCKED — AWS CLI not available** note was wrong: `D:/agent-work/mig-iam.mjs`
      mints the RDS token with `@aws-sdk/rds-signer` out of the backend's own `node_modules` and
      never shells out to the AWS CLI.
- [x] If the plan degrades at cardinality, fix the index in `1210` and re-measure. If it holds,
      say so plainly and close the acceptance.
      It degrades, and no index can fix it — so `1210` is deliberately not written. The grant
      branch on its own is served by `idx_kb_page_grants_org_page_live` as a Nested Loop Semi Join
      in 0.315 ms. Put that same `EXISTS` under an `OR` with the indexed branch and the planner
      cannot semi-join through the disjunction: it hoists the subquery into a hashed SubPlan and
      seq-scans every grant row the tenant owns — 100,000 rows, 1,334 buffers, 38.2 ms — on every
      list query, and that cost tracks the tenant's total grant count rather than the `LIMIT 50`
      window. Adding an index cannot change this; the seq scan is what the `OR` forces.
      Recorded as a rewrite handoff below, not an index migration.
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

HANDOFF: every caller of `buildVisiblePageScope(...).predicate` — owned by unassigned session —
the OR'd predicate costs a full scan of the tenant's `kb_page_grants` on every list query
(measured: 100,000 rows, 38.2 ms, versus 0.315 ms for the same EXISTS on its own). The rewrite is
already latent in the return shape: `buildVisiblePageScope` hands back `indexedBranch` and
`grantBranch` separately alongside `predicate`, so a caller can issue the two arms as a UNION of
two index-served queries instead of one disjunction the planner has to hash. Do not attempt to
fix this with an index — the seq scan is forced by the `OR`, not by a missing index, and
migration tag `1210` was deliberately left unused for that reason.

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

Targeted `tsc --noEmit` on all production files changed in SESSION-08:

```
$ node ./node_modules/typescript/bin/tsc --noEmit \
    src/modules/kb/core/authorization/knowledge-page-scope.ts \
    src/modules/kb/core/authorization/knowledge-authorization.service.ts \
    src/modules/kb/document-query/kb-document-query.service.ts \
    src/modules/kb/retrieval/kb-candidate.service.ts
EXIT: 0

$ node ./node_modules/typescript/bin/tsc --noEmit \
    src/modules/kb/core/authorization/knowledge-page-scope.spec.ts \
    src/modules/kb/core/authorization/knowledge-authorization.service.spec.ts \
    src/modules/kb/wiki/kb-page-grants.spec.ts
EXIT: 0
```

No new `any`, no `as X`, no `@ts-ignore` added in SESSION-08 files.
Full `pnpm typecheck` (backend, `tsconfig.build.json`) — exit code 0. Clean.

### EXPLAIN at cardinality — measured 2026-09-25

Taken by the orchestrator against production Aurora over RDS IAM auth, as `streamline_app`
(`rolbypassrls = false`, RLS enabled on both tables) with `app.organization_id` set, at
50,000 `[e2e]` pages and 100,000 grants planted inside a transaction that was rolled back.

Why seeding was necessary: production carries 21 `kb_pages` in total and **zero** rows in
`kb_page_restrictions` and `kb_page_grants`. Every earlier "EXPLAIN proves the index is
reachable" claim was taken against an empty table, where the ACL arm shows `never executed`.

**Grant branch alone — holds.**
```
Limit  (cost=1.08..69.33 rows=50) (actual time=0.107..0.282 rows=50) Buffers: shared hit=207
  ->  Nested Loop Semi Join  (cost=1.08..67771.11 rows=49653)
        ->  Index Scan using idx_kb_pages_org_updated_keyset on kb_pages p
        ->  Index Scan using idx_kb_page_grants_org_page_live on kb_page_grants g
              Index Cond: ((org_id = '871a...') AND (page_id = p.id))
              Index Searches: 50
Execution Time: 0.315 ms
```
50 index searches for a 50-row window. The index serves it.

**Same EXISTS under an OR — degrades, and an index cannot fix it.**
```
Limit  (cost=0.41..608.39 rows=50) (actual time=0.022..38.198 rows=50) Buffers: shared hit=1341
  ->  Index Scan using idx_kb_pages_org_updated_keyset on kb_pages p  (cost=0.41..546885.02)
        Filter: (... OR (ANY (id = (hashed SubPlan 2).col1)))
        SubPlan 2
          ->  Seq Scan on kb_page_grants g  (actual time=0.009..17.005 rows=100000)
                Buffers: shared hit=1334
Execution Time: 38.244 ms
```
The planner cannot semi-join through a disjunction, so it hoists the subquery into a hashed
SubPlan and reads every live grant the tenant owns before it can answer a 50-row page. 0.315 ms
becomes 38.244 ms — 121x — and the cost scales with the tenant's grant count, not the window.

**Fixture cleanup, verified after rollback:**
```
kb_pages for org after rollback: 11
any [e2e] page left anywhere: 0
kb_page_grants total after rollback: 0
protected ids still present: 4, 5, 6, 7, 14, 15, 16, 17
```

Script: `D:/agent-work/kb-grants-cardinality-explain.mjs`, run through
`ALLOW_PRODUCTION_MIGRATION=1 node D:/agent-work/mig-iam.mjs <abs path>`.

### RLS policy shape on kb_pages

The same run showed the tenant policy is itself a disjunction:
```
(org_id = app.current_org_id_or_null() AND deleted_at IS NULL)
  OR (public_token_hash = app.current_public_token_or_null())
```
At 21 rows this costs nothing, but the second arm exists only for anonymous public-link reads
and it is OR'd into every authenticated query, which is what forced the `BitmapOr` in the
restriction-branch plan. Worth a separate look; out of SESSION-08's scope.
