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

- [ ] Measure first: read `kb-article-restriction-predicate.ts` and record exactly which ACL facts
      it decides that `KnowledgeAuthorizationService` does not, with `file:line`.
- [ ] Fold the article-restriction arm into the seam, **or** scope it out explicitly with a written
      justification in this file naming what it governs and why it cannot be unified. Folding is
      the preferred outcome. A justification must be specific — "legacy" is not a reason.
- [ ] After folding: prove by grep that no caller outside `core/authorization/` builds a page or
      article access predicate. Record the search and its zero result.
- [ ] `retrieval/kb-page-access.util.ts` via `wiki/kb-object-access.ts` is the one production
      caller surviving by deliberate deferral. Close it or re-justify it here.
- [ ] Property test the predicate with `fast-check`: generate actors, pages, grants, space
      memberships, project memberships, visibility and token states, and assert the invariants —
      deny by default; a revoked grant never grants; cross-tenant never resolves; hidden and
      missing are indistinguishable; the 8-step evaluation order is respected.
- [ ] A fuzz run that finds no counterexample over a large sample is the evidence — record the
      seed, the number of runs, and the shrunk counterexample for any bug it does find.
- [ ] Fail-closed test: with the ACL cache unavailable, access is denied, never retained.
- [ ] Seed `kb_page_grants` to realistic cardinality with `[e2e]`-prefixed fixtures, re-take
      `EXPLAIN (ANALYZE, BUFFERS)` as `streamline_app` with the tenant GUC set, and record whether
      the index still serves the query at population. Delete the fixtures afterwards and confirm
      the delete. **`kb_pages` ids 4, 5, 6, 7, 14, 15, 16, 17 must not be touched.**
- [ ] If the plan degrades at cardinality, fix the index in `1210` and re-measure. If it holds,
      say so plainly and close the acceptance.
- [ ] Route denial is 403/NoPermission; hidden or missing records are an indistinguishable 404.
      Prove it on the grant routes with a negative/positive pair.
- [ ] Every new test verified to fail against the unfixed code and pass against the fixed code.
- [ ] `pnpm typecheck` and `pnpm typecheck:test` (backend, under the lock) clean for your files.

## Handoffs

_(append `HANDOFF: <file> — owned by SESSION-0N — <exact change needed>`)_

## Evidence

_(record command output, file:line, EXPLAIN plans and fuzz seeds here as you close each box)_
