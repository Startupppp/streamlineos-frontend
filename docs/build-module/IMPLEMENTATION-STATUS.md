# Build Implementation Status

Coordinator-owned. Workers never edit this file. `DONE` requires: PR merged into the integration branch, acceptance criteria checked, targeted tests pass, integration checks pass, no unresolved P0/P1 review finding.

States: `TODO` · `IN_PROGRESS` · `BLOCKED` · `READY_FOR_REVIEW` · `DONE`

Integration branch: `build/integration` (not yet created — awaiting approval)

## A new worktree cannot run any check

`git worktree add` does not create `node_modules`, and the playbook's launch sequence never installs. A freshly cut worktree fails every gate with `'jest' is not recognized` — which reads like a broken harness rather than a missing install.

Add to the launch sequence, per worktree and per repo:

```bash
pnpm -C <worktree>/frontend install --prefer-offline
```

The integration worktree needs it most: it is the permanent verification point, so without it no merge can be integration-checked.

## The repository is two repositories

`backend/` is a **separate git repository** — its own `.git`, its own remote (`Startupppp/streamlineos-backend`), not a submodule of the root and not tracked by it. The playbook's launch sequence does not account for this.

Consequence: `git worktree add` on the root repo produces a tree containing `frontend/`, `docs/` and `scripts/` but **no `backend/` at all**. The three worker worktrees created on 2026-09-21 are frontend-only. A backend slice needs a worktree cut inside the backend repo:

```bash
git -C backend worktree add ../../streamlineos-be-worker-N -b <branch> origin/main
```

Revised rule: a slice is either frontend-owned or backend-owned, never both, and its worktree is cut in the matching repo. A slice needing both is two slices with a declared dependency.

The two repos are versioned independently, so "the branch is current" must be checked in whichever repo the slice touches.

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
| BLD-001 | Build route manifest + census test | 00, 01, 99-kill-list | build/p0-route-manifest | worker-1 | **DONE** | `1387f724c` → merge `1323e2b07` | See verification block. 2026-09-21 |

### BLD-001 — round 2: APPROVE, merged, DONE withheld

Commit `1387f724c` merged into `build/integration` as `1323e2b07`. Integration then merged `origin/main` (`40ddb4718`): clean, 0 behind, 4 ahead.

Both round-1 findings fixed. Entry type is now a Zod discriminated union — `KEEP` requires `target: null`, `CONSOLIDATE | MOVE | DELETE` require `z.string().min(1)`. Because `BUILD_ROUTE_MANIFEST` is typed `readonly BuildRouteManifestEntry[]` via `z.infer`, the compiler enforces the pairing on the real data; the five added schema tests cover the negatives plus the empty-string case TypeScript cannot see. Final spread: 64 KEEP / 9 CONSOLIDATE / 9 MOVE / 1 DELETE. P3 fixed — the test now anchors to `__dirname`, not `process.cwd()`.

Coordinator-verified, not taken from the report:

- 9/9 tests pass; the run was executed here, not quoted.
- All 9 CONSOLIDATE targets resolve to routes that exist today. All 9 MOVE targets are future paths that do not — correct, since a move has not happened yet.
- `/build/access` and `/build/members` share the target `/build/settings/access`. Checked against `01-ia-navigation.md:66,155,172`, which assigns both to that path with an identical user job. A deliberate merge, not a defect.
- `/build/goals` and `/build/workspaces` do not exist on disk; `/build/goal` and `/build/pm-workspaces` do. The MOVE entries are renames. Consistent.

**Why DONE is withheld:** `type-check:specs` exits 2 and the pre-existing attribution is still unmeasured. Worker-2 and a peer session were both active, and two 10 GB typechecks do not fit in ~11 GB free (BE-139 / FE-121). Run it on a quiet machine against `origin/main` and this branch, compare, then mark DONE.

Verified independently, not taken from the worker's report. Commit `5f9cd4cce` adds exactly two files (167 lines), working tree clean.

**What holds up.** The test is not vacuous and not circular: a hand-written manifest is compared against a `readdirSync` walk of disk, in both directions, with a length guard that stops an emptied list passing. Test names carry the reason, so no comment is needed. No `any`, no `as X`, no `@ts-ignore`; `RouteDecision` derives from `z.infer`. Decision spread is real — 65 KEEP, 9 CONSOLIDATE, 9 MOVE.

**P1 — a disposition without a target cannot drive the work it exists for.** The entry type is `{ route, decision }`. It can record that `/build/[projectId]/analytics` is CONSOLIDATE but not that it folds into Reports. `99-kill-list.md` requires "every killed page has a migration target and caller census", and `00-overview.md` names each target explicitly (Analytics→Reports, Drafts→Inbox, My Tickets→My Work, Timeline and saved views→Issues, AI runs→Command Center). Without a `target` field the manifest cannot drive a redirect, a caller census, or that acceptance criterion. Needs `target: string | null`, required whenever the decision is CONSOLIDATE or MOVE.

**P2 — `DELETE` is declared and never used.** Zero of 83 entries carry it, while `99-kill-list.md` lists twelve surfaces to remove. Either the kill-list surfaces are DELETE and the manifest is wrong, or CONSOLIDATE subsumes them and DELETE should leave the enum. Decide and make the enum honest.

**Coordinator error, not worker error.** The dispatch prompt cited only `01-ia-navigation.md`. `99-kill-list.md` is a separate authority and the worker never saw it. Both findings trace to that omission.

**P3 — test couples to the jest working directory.** `resolve(process.cwd(), "app", "(authenticated)")` passes only because jest runs from `frontend/`. Not blocking; note it.

**Unverified.** `type-check:specs` exits 2 on this branch. The worker attributes it to pre-existing failures in `hooks/api/` and `features/portal-access/`. The commit adds two new files and modifies nothing else, so it cannot be the cause — but this is reasoning, not measurement. Confirm at integration time on a quiet machine; two concurrent 10 GB typechecks do not fit in available RAM.
| BLD-002 | Deduplicate URL-state into one hook; add FE-86 pagination reset | 03, 04 | build/p0-url-state | worker-2 | **DONE** | `83fb73b93` → merge `fc744da8f` | See verification block. 2026-09-21 |

### Integration verification — BLD-001 and BLD-002, 2026-09-21

Run by the coordinator on `build/integration` after both merges and a re-sync to `origin/main` (0 behind, 8 ahead).

| Check | Command | Result |
|---|---|---|
| Affected tests | `pnpm test -- lib/build/build-route-manifest url-state use-leads-filters use-expense-filters` | **58/58 pass, 4 suites** |
| Spec typecheck | `pnpm type-check:specs` | **exit 0, clean** |

The typecheck result needs its history stated, because both workers reported the opposite. Each measured `type-check:specs` on a worktree cut from the older `origin/main` and reported 82 pre-existing errors. On merged integration it passes clean — the peer commits pulled in during re-sync fixed them, one of which is literally `fix(gates): stop type-check:specs from dying before it reports`. The workers were not wrong; their base was stale.

Guarded against a vacuous pass, since a gate resolving nothing reports zero:

- `tsc --listFilesOnly` resolves **6,068 files**, 10 of them from these two slices.
- `tsconfig.specs.json` sets `incremental: false`, so no stale `tsbuildinfo` can false-pass.

Neither slice adds a type error, proven by a green run over files that were demonstrably in the program — not by attributing failures to someone else.

### BLD-002 — round 2: APPROVE, merged

Both findings fixed. Two regression test files added (384 lines, 37 tests); suite is now 49/49, run here rather than quoted. Merged as `fc744da8f`; integration then merged `origin/main` again — clean, 0 behind, 8 ahead.

The added tests have real bite, which is the thing worth checking:

- The P2 contract test seeds `tab=overview`, calls `resetFilters()` and asserts `tab` survives. That fails against the original fresh-`URLSearchParams` implementation, so it genuinely pins the semantic change instead of describing it.
- Conditional rules are positive/negative paired — "omits page when page is 1" beside "serializes page when greater than 1" — per FE-122.
- Every assertion checks `mockReplace` was called before reading params, so none can pass vacuously on a no-op.

The worker acknowledged the `git stash` violation explicitly and did not repeat it; stash list is empty and all worktrees are clean.

**Corrected:** an `(fn as VoidFunction)` cast in the new expense test initially read as a hard-zero violation. It is not — `scripts/check-type-assertions.mjs:114` sets `SKIP_FILE = /(\.spec\.tsx?|\.test\.tsx?|\.d\.ts)$/`, deliberately excluding spec files. The rule does not reach test code.

### BLD-002 — round 1 findings, for the record

Coordinator-verified: commit `c7031a561`, four files, 216 insertions, tree clean, no banned constructs. Suite run here — 12/12 pass.

**What holds up.** `useUrlFilters` owns the clone-patch-`router.replace` mechanism in one place. `parseEnum<T extends readonly string[]>` narrows through the tuple the union derives from, so `?view=nonsense` cannot escape the union without a cast. The `pageParam` injection is correct, and its tests are a genuine positive/negative pair including "does not reset when the update explicitly sets the page".

**P1 — 111 lines of live production code refactored with no regression detector.** Neither `use-leads-filters.ts` nor `use-expense-filters.ts` has a test file, before or after. All 12 tests cover the new hook in isolation. "Both public return shapes are unchanged" is an assertion with nothing to falsify it, on two hooks backing live CRM leads and HR expenses surfaces. A test per hook pinning its exact param keys and conditional rules is required.

**P2 — an undocumented semantic change.** The original `syncFiltersToUrl` built `new URLSearchParams()` from scratch, dropping any param outside the expense list; the migration clones and patches, so unrelated params survive. Equivalent on the expenses page today, which carries no other params. The worker classed it "a minor behavior improvement (not a regression)" — a unilateral change in a migration required to be behavior-preserving. Keeping the new behavior, but it must be pinned by a test rather than left as a note.

**Process violation — `git stash`, banned by name.** Used to confirm the pre-existing `type-check:specs` count. No damage: stash list empty, all three worktrees clean. In a tree where sessions share worktrees, a stash can wipe another session's tracked edits. The integration worktree already sits at `origin/main` and can serve as the clean baseline without touching anyone's work.

**Recorded, no action:** `pageParam` has zero production consumers — both hooks call `useUrlFilters()` with no options. Correct for a foundation slice, since the Build pages needing FE-86 do not exist yet. Logged so a later slice wires it instead of letting the option rot.

### BLD-002 — re-scoped before dispatch

The slice was written as "establish a shared URL-state contract," which assumes none exists. Five pieces already do:

| File | Lines | Role |
|---|---|---|
| `hooks/common/use-expense-filters.ts` | 273 | per-domain filter hook |
| `hooks/common/use-leads-filters.ts` | 147 | second, independent implementation of the same mechanism |
| `lib/route-search-params.ts` | 12 | server-side mirror of `useSearchParams` |
| `lib/list-pagination.ts` | 28 | |
| `hooks/common/use-query-param-open.ts` | 38 | |

Dispatching the original scope would have produced a *third* duplicate of the same `update()`/`router.replace` mechanism — the FE-59 defect the rule exists to prevent. Two consumers already exist, so the shared hook is overdue rather than speculative.

Re-scoped to: extract one generic hook, migrate both existing consumers behaviour-preservingly, and add the one behaviour neither has — **filter change resets pagination** (FE-86). Neither existing hook implements it because neither has a page param; Build pages do.
| BLD-003 | `projects.pmWorkspaceId` nullable migration plan | 02 | — | — | BLOCKED | | See below |

### BLD-003 — UNBLOCKED, awaiting go-ahead

The peer finished: `db1fd36bd`, "fix(migrations): restore three journal entries that merges dropped". `backend/migrations/` is clean and the repo is level with `origin/main`. That commit message is itself worth noting — journal entries were lost by a merge and needed restoring, so BE-58 desync is a live, recurring failure mode here, not a theoretical one.

**Slot facts:** next journal `idx` is 1029, next `when` must exceed 1803000010400, next filename is `1141_`. `DROP NOT NULL` precedent exists in `0842`, `1110` and `1137`.

**What the schema inspection changed about this slice.** `src/db/schema/build/core.ts:46` is `pmWorkspaceId: text("pm_workspace_id").notNull()`, as the audit says. What the audit does not say is that the column sits inside a **composite foreign key** (`:80-84`):

```
fk_projects_org_pm_workspace: [org_id, pm_workspace_id] → pmWorkspaces[org_id, pm_workspace_id]
```

Three consequences:

1. Under Postgres's default `MATCH SIMPLE`, a NULL in `pm_workspace_id` makes the whole composite FK unenforced for that row. That is precisely the wanted behaviour — a workspace-less project — but it must be a stated intent, not an accident.
2. Tenant safety is not weakened: `org_id` carries its own FK to `organizations` independently (`:32`), so a workspace-less project is still bound to its tenant.
3. This FK declares no `onDelete`, so the widening introduces no `SET NULL` hazard. Its siblings do — `fk_projects_org_product` and `fk_projects_deal_id_org` use `.onDelete("set null")` on composite keys whose first column is the NOT NULL `org_id`. A composite `SET NULL` without a column list nulls *every* column, which `org_id` rejects. Pre-existing, outside this slice, recorded as a lead.

**Rollback honesty.** A widening migration's rollback cannot always succeed: once a workspace-less project exists, `SET NOT NULL` fails. The rollback must re-tighten via `CHECK (col IS NOT NULL) NOT VALID` → `VALIDATE` → `SET NOT NULL` → drop the CHECK (BE-63), and must state that it fails by design while null rows exist.

**Why this is not delegated.** `migration:proof` and `check:migration-chain` both run `--env-file-if-exists=.env`, and `.env` points at production, where the ledger is near-empty and a replay would attempt ~1,105 migrations. The coordinator authors this slice and runs no database command.

A peer session is mid-edit on the migration chain right now:

- staged rename `migrations/1135_employee_support_queues.sql` → `migrations/1137_employee_support_queues.sql`, resolving a numbering collision with `1135_crm_mailbox_sync_org_resolver.sql`
- unstaged `migrations/meta/_journal.json`, adding idx 1026/1027/1028 for tags `1136_timesheets_approval_routing`, `1137_employee_support_queues`, `1140_exit_checklist_ownership`

The work is coherent and all three `.sql` files exist. It is simply not finished. Authoring a fourth migration against a journal whose last three entries are uncommitted produces an `idx` collision and a desynced journal — the exact failure BE-58/BE-59 exist to prevent, and the playbook's "a migration conflicts" stop condition.

No file under `backend/` was touched by this session.

## Wave 1 — max three concurrent workers

| ID | Slice | Spec | Branch | Owner | Status | PR | Verification |
|---|---|---|---|---|---|---|---|
| BLD-010 | Cycles/workload route canonicalization + caller census | 01, 10-project-cycles, 10-project-workload | build/p1-cycles-workload | worker | TODO | | |
| BLD-011 | Page-state reliability: **teams only** | 10-teams | build/p1-teams-page-state | worker | TODO | | Scope cut 4 pages → 1, see below |
| BLD-012 | My Work / Inbox consolidation | 10-my-work, 10-inbox, 10-drafts | build/p1-my-work-inbox | worker | TODO | | |

## Verified-stale backlog premises

Recorded so no worker re-implements finished work.

| Backlog item | Doc claim | Tree state on 2026-09-21 |
|---|---|---|
| P0 #1 | Sidebar links Cycles to `/build/1/sprints`, which has no page | Already fixed. No `app/**/sprints/` directory exists; `lib/build/nav/build-project-catalog.ts:78` emits `${basePath}/cycles`; pinned by `lib/build/build-project-catalog.test.ts:58`. Only the permission key `build:sprints:view` retains the old word, which BE-31 requires. BLD-010 verifies and closes, it does not implement. |
| P0 #5 / production finding "several list pages remained on skeletons" | `/build/managed-products`, `/build/portfolios`, `/build/programs`, `/build/teams` obscure empty/error/slow | Three of four are already fully compliant: `portfolios-page.tsx:151`, `programs-page.tsx:148` and `managed-products-page.tsx:310` each call `usePageState` with `permission`, `isLoading`, `isError`, **`error`** and `isEmpty`. Only teams is outstanding. |

### BLD-011 — scope cut from four pages to one

`features/build/teams/teams-list-page.tsx` (371 lines) is the only survivor, and the defect is sharper than "stuck on a skeleton". Line 299 resolves page state through a hand-rolled boolean chain:

```tsx
{isLoading ? <DataTableSkeleton/> : isError ? <ErrorState/> : <EmptyState/>}
```

Three named violations, all in that one expression:

- **FE-40** — page state resolves through a boolean, not `<PageState resolution={usePageState(...)}>`. This is AP-6 verbatim.
- **FE-41** — `error` is destructured at line 98 and then never used for state. Every 402 renders as a generic failure, discarding the backend's upgrade path (BE-23).
- **FE-47 / FE-49** — there is no denial branch. A disabled Query v5 read is `isPending: true, isFetching: false`, so `isLoading` is false and a denied user falls through to `EmptyState`. Denial renders as an empty list.

Controls are already correctly gated on `useCan` (lines 87-88, FE-44). The fix is the read path only.

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

**Overtaken twice during this session.** A peer session committed those six deletions as `b3eb8b2a4` and swept this ledger's 67-line first draft into that unrelated commit. It then went further: `5f566ae32` ("docs: update API contracts and implementation status documentation to resolve discrepancies with live code") committed **and pushed** the entire BLD-000 rewrite of `03-api-contracts.md`, which had been deliberately left uncommitted. That work is now on `origin/main` under another session's authorship.

Nothing was lost — the local ledger retains every finding written after the push. But the instruction "leave it uncommitted" is not enforceable in this tree. Anything left in the working directory will be committed and published by a peer, usually under an unrelated message. Treat the working tree as shared and publish deliberately, or not at all.

Two further consequences stand:

- `main` is now 1 commit ahead of `origin/main` and `b3eb8b2a4` is unpushed. The four worktrees were cut from `origin/main` (`5ea6a805e`), so they do **not** contain this file.
- This tree has an active concurrent committer. Every session must stage by explicit pathspec. `git add -A` here commits another session's in-progress work under the wrong message.

No worker may run `git add -A`, `git stash`, `git checkout`, `git reset` or `git clean` — by name. A worker that believes it needs one must stop and report instead.

`main` is 2 commits behind `origin/main` and 0 ahead. Do not `git pull --ff-only` on `main` while the deletions are pending; branch from `origin/main` directly.
