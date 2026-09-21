# Build Implementation Status

Coordinator-owned. Workers never edit this file. `DONE` requires: PR merged into the integration branch, acceptance criteria checked, targeted tests pass, integration checks pass, no unresolved P0/P1 review finding.

States: `TODO` · `IN_PROGRESS` · `BLOCKED` · `READY_FOR_REVIEW` · `DONE`

Integration branch: `build/integration` (not yet created — awaiting approval)

## Machine budget

| Fact | Value | Consequence |
|---|---|---|
| Total RAM | 31.3 GB | Playbook tier: four workers |
| Free RAM at plan time | 11.1 GB | Approved tier: **three workers** |
| CPU | AMD Ryzen 5 5625U, 6 cores / 12 logical | Three workers + one integration session saturates it |
| `tsc` heap requirement | 10240 MB (BE-139) | Two concurrent typechecks exceed free RAM — serialize them |

## Wave 0 — serial foundation

| ID | Slice | Spec | Branch | Owner | Status | PR | Verification |
|---|---|---|---|---|---|---|---|
| BLD-000 | Reconcile `03-api-contracts.md` to the live envelope | 03 | (uncommitted on main) | coordinator | DONE | n/a | Six conflicts corrected against source; each live claim cites file:line. Doc-only, no code touched. 2026-09-21 |
| BLD-001 | Build route manifest + census test | 00, 01 | build/p0-route-manifest | worker | TODO | | |
| BLD-002 | Shared URL-state / filter / sort / cursor contract | 03, 04 | build/p0-url-state | worker | TODO | | |
| BLD-003 | `projects.pmWorkspaceId` nullable migration plan | 02 | build/p0-workspace-optional | worker | TODO | | |

## Wave 1 — max three concurrent workers

| ID | Slice | Spec | Branch | Owner | Status | PR | Verification |
|---|---|---|---|---|---|---|---|
| BLD-010 | Cycles/workload route canonicalization + caller census | 01, 10-project-cycles, 10-project-workload | build/p1-cycles-workload | worker | TODO | | |
| BLD-011 | Page-state reliability: managed-products, portfolios, programs, teams | 10-managed-products, 10-portfolios, 10-programs, 10-teams | build/p1-page-states | worker | TODO | | |
| BLD-012 | My Work / Inbox consolidation | 10-my-work, 10-inbox, 10-drafts | build/p1-my-work-inbox | worker | TODO | | |

## Verified-stale backlog premises

Recorded so no worker re-implements finished work.

| Backlog item | Doc claim | Tree state on 2026-09-21 |
|---|---|---|
| P0 #1 | Sidebar links Cycles to `/build/1/sprints`, which has no page | Already fixed. No `app/**/sprints/` directory exists; `lib/build/nav/build-project-catalog.ts:78` emits `${basePath}/cycles`; pinned by `lib/build/build-project-catalog.test.ts:58`. Only the permission key `build:sprints:view` retains the old word, which BE-31 requires. BLD-010 verifies and closes, it does not implement. |

## Spec conflicts found and resolved (BLD-000)

All six were doc-versus-code contradictions in `03-api-contracts.md`. In every case the live code won, because the envelope and pagination helpers are load-bearing for the existing frontend contracts (FE-27/FE-28).

| ID | Conflict | Resolution |
|---|---|---|
| BLD-000-a | Doc declared `ApiSuccess<T> = { data, meta }`. Live envelope is `{ success: true, data }` (BE-19, `response-transform.interceptor.ts:13`). | Doc corrected. |
| BLD-000-b | Doc nested errors as `{ error: { code, message, requestId } }`. Live envelope is flat `{ code, message, details?, correlationId? }` (BE-20, `all-exceptions.filter.ts:10`). | Doc corrected. |
| BLD-000-c | Doc required cursors to encode filters/sort/scope and to 400 on mismatch. `cursor.schema.ts:4-25` deliberately decided the opposite — position only, degrade to first page — with a written rationale. | Code kept, doc corrected, and the consequence made explicit: the server must re-apply the authorization predicate on every page. |
| BLD-000-d | Doc declared one `CursorPage` with a `pageInfo` key. Two shapes exist and neither uses `pageInfo`: `buildCursorPage` → `{ data, pagination: { limit, nextCursor, hasMore } }` (`cursor.ts:130`); `buildIdCursorPage` → flat `{ data, hasMore, nextCursor }` (`cursor.ts:187`). | Both documented with the rule for choosing. |
| BLD-000-e | Doc specified `sort=-updatedAt,title`. No endpoint implements it; `baseListQuerySchema:45` uses `sortField` + `sortDir`, with `withSortField([...])` constraining the enum. Doc also implied an over-large `limit` is rejected; it is clamped (`list-query.schema.ts:22`). | Doc corrected to the implemented form. |
| BLD-000-f | Doc listed `VALIDATION_ERROR`, `UNAUTHENTICATED`, `VERSION_CONFLICT`, `DEPENDENCY_UNAVAILABLE` as canonical codes. None exists anywhere in `backend/src`. The real Zod code is `VALIDATION_FAILED` (`all-exceptions.filter.ts:184`). | Live code list substituted; the four phantoms named as non-existent so no worker branches on them. |

`If-Match` optimistic concurrency was left in the doc but relabelled a **target**, not current behavior — no handler reads the header and `VERSION_CONFLICT` does not exist. Any slice needing it must ship header, version column, 409 and tests together.

## Working-tree hazard

Six tracked docs files are deleted and unstaged on `main`, from outside this session:

```
docs/inventory-ui-reference/README.md
docs/inventory-ui-reference/desktop-command-center.svg
docs/inventory-ui-reference/mobile-receiving.svg
docs/inventory-ui-reference/product-replenishment.svg
docs/refactor/baseline/baseline.json
docs/refactor/baseline/baseline.md
```

Decision on 2026-09-21: **leave them pending and cut worktrees from `origin/main`**, which is unaffected by `main`'s dirty state.

**Overtaken during this session.** A peer session committed those six deletions as `b3eb8b2a4` while planning was in progress, and its `git add -A` also swept this ledger's 67-line first draft into that unrelated commit. Nothing was lost. Two consequences stand:

- `main` is now 1 commit ahead of `origin/main` and `b3eb8b2a4` is unpushed. The four worktrees were cut from `origin/main` (`5ea6a805e`), so they do **not** contain this file.
- This tree has an active concurrent committer. Every session must stage by explicit pathspec. `git add -A` here commits another session's in-progress work under the wrong message.

No worker may run `git add -A`, `git stash`, `git checkout`, `git reset` or `git clean` — by name. A worker that believes it needs one must stop and report instead.

`main` is 2 commits behind `origin/main` and 0 ahead. Do not `git pull --ff-only` on `main` while the deletions are pending; branch from `origin/main` directly.
