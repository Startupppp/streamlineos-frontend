# Build Implementation Status

Coordinator-owned. Workers never edit this file. `DONE` requires: PR merged into the integration branch, acceptance criteria checked, targeted tests pass, integration checks pass, no unresolved P0/P1 review finding.

States: `TODO` · `IN_PROGRESS` · `BLOCKED` · `READY_FOR_REVIEW` · `DONE`

Integration branch: `build/integration` (not yet created — awaiting approval)

## Machine budget

| Fact | Value | Consequence |
|---|---|---|
| Total RAM | 31.3 GB | Playbook tier: four workers |
| Free RAM at plan time | 11.1 GB | Recommended tier: **three workers** |
| CPU | AMD Ryzen 5 5625U, 6 cores / 12 logical | Three workers + one integration session saturates it |
| `tsc` heap requirement | 10240 MB (BE-139) | Two concurrent typechecks exceed free RAM — serialize them |

## Wave 0 — serial foundation

| ID | Slice | Spec | Branch | Owner | Status | PR | Verification |
|---|---|---|---|---|---|---|---|
| BLD-000 | Reconcile `03-api-contracts.md` to the live envelope | 03 | build/integration | coordinator | TODO | | |
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

## Blockers on the specs themselves

| ID | Spec | Conflict | Resolution |
|---|---|---|---|
| BLD-000-a | `03-api-contracts.md:22` | Declares `ApiSuccess<T> = { data, meta }`. Live envelope is `{ success: true, data }` (BE-19, `common/interceptors/response-transform.interceptor.ts:13`). | Rewrite the doc to the live shape. |
| BLD-000-b | `03-api-contracts.md:28` | Declares errors nested as `{ error: { code, message, details, requestId } }`. Live envelope is flat `{ code, message, details?, correlationId? }` (BE-20, `common/http/all-exceptions.filter.ts:10`). | Rewrite the doc to the live shape. |
| BLD-000-c | `03-api-contracts.md:44-45` | Requires cursors to encode filters/sort/scope/access-revision and to 400 on a mismatch. `common/pagination/cursor.schema.ts:20` deliberately decided the opposite: the cursor encodes position only and degrades to the first page. | Keep the code. Rewrite the doc. |
| BLD-000-d | `03-api-contracts.md:23` | Declares one `CursorPage` shape. Two exist: `buildCursorPage` returns `{ data, pageInfo }` (`cursor.ts:164`), `buildIdCursorPage` returns flat `{ data, hasMore, nextCursor }` (`cursor.ts:208`). | Document both and name which endpoints use which. |

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

No worker may run `git add -A`, `stash`, `checkout`, `reset` or `clean`. Resolve the deletions before creating worktrees.

`main` is 2 commits behind `origin/main` and 0 ahead.
