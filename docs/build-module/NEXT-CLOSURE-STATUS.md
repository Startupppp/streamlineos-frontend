> **HISTORICAL — point-in-time record, 2026-09-22**
> The environment facts inside this document (commit SHAs, worktree paths, migration states, gate results, blocker states) are point-in-time and no longer current. For current release status see [RELEASE-STATUS.md](./RELEASE-STATUS.md).

---

# Next closure — status ledger

Coordinator-owned. Agents never edit this file.

**Session:** 2026-09-22
**Branch:** `build/next-build-closure` (root and backend), not yet merged
**Worktrees:** `D:/projects/personal/slos-next-closure` (+ `/backend`), `node_modules` junctioned, no install
**Control:** `D:/projects/personal/slos-baseline-be`, a detached read-only backend worktree at `main`.
Baseline measurements are in `NEXT-CLOSURE-BASELINE.md`, captured before any agent edit.

`DONE` = code, tests and gates complete and verified here.
`READY_FOR_CODEX_BROWSER_QA` = code complete; Codex must verify in a real browser. **Claude opened no
browser, took no screenshot, and verified no UI this session.**
`BLOCKED` = cannot proceed without something this environment does not have, with the exact condition named.

## Status

| Task | Status | Commits | Evidence | Browser |
|---|---|---|---|---|
| Sprint/Cycle — application cutover | **DONE** | `c41e87988`, `32dbe982d`, `88411bc74`, `b93f10501` | Zero non-schema backend reads or writes of `tickets.sprint_id`; invariant spec 18 tests, allowlist empty, mutation-proven | READY_FOR_CODEX_BROWSER_QA |
| Sprint/Cycle — legacy writer freeze | **DONE** | `c41e87988` | `createSprint` throws `GoneException`; `sprint-create-frozen.spec.ts` 5 tests, mutant 3 fail | n/a |
| Sprint/Cycle — contraction (phases 04/05) | **BLOCKED** | — | Migrations already authored at `migrations/sql/a-sprint-cycle-04-detach.sql` and `-05-drop.sql` | n/a |
| QA Bug — application cutover | **DONE** | `0c532e4bd`, `450065946`, `2d34fef8d` | Bugs resolve through `tickets` + `work_item_qa_details`; 13 suites / 388 tests | READY_FOR_CODEX_BROWSER_QA |
| QA Bug — legacy writer unreachable | **DONE** | `2d34fef8d` | `legacy-bug-writer-unreachable.spec.ts` 4 tests; mutant 2 fail | n/a |
| QA Bug — contraction (freeze/drop) | **BLOCKED** | — | `b-qa-bug-04-contract-freeze.sql`, `-05-contract-drop.sql` already authored | n/a |
| Change Request fields and filters | **DONE (code)** / **BLOCKED (deploy)** | `0057090e5`, `2533787e5` | 37 backend + 23 frontend tests; `check:list-projections` FAIL→PASS | BLOCKED on 1149 |
| Workload real capacity | **DONE** | `8535cc4d6`, `075038ae8`, `99353bb9f`, `7770cb7e3` | Endpoint + hook + page wired; 13 capacity tests; cross-tenant negative + positive control | READY_FOR_CODEX_BROWSER_QA |
| Inbox project filtering | **DONE** | `8535cc4d6`, `075038ae8`, `d05f49c51` | End to end; cache-key probe added; migration 1151 indexes it | READY_FOR_CODEX_BROWSER_QA |
| Offline drafts and reconnect | **DONE** | `075038ae8`, `7770cb7e3` | Last-write-wins per ticket; 10 tests | READY_FOR_CODEX_BROWSER_QA |
| Feedbucket mobile + dialog a11y | **DONE** | `075038ae8` | Focus trap, backdrop, launcher hidden at mobile width; 4 focus tests | READY_FOR_CODEX_BROWSER_QA |
| Timesheets tenant isolation | **DONE** | `8535cc4d6` | `check:tenant-isolation` 4 → 2 uncovered | n/a |
| Authorization census | **DONE** | `260e4e24f` | `VULNERABLE = 0`; gate FAIL→PASS | n/a |
| Freelancer quote→payment traceability | **PARTIAL** | `0057090e5` | Migration 1150 adds the invoice→timesheet pointer but **no code uses it yet** | n/a |
| Import/export architecture | **DESIGN ONLY** | `6f1d3329a` | `lane-4-import-export.md`; nothing implemented | n/a |

## Gate results — branch vs the measured `main` control

Every `pre-existing` claim below was reproduced on an untouched checkout. None is taken on trust.

| Gate | `main` | Branch | Verdict |
|---|---|---|---|
| `check:route-census` | PASS 88/79/0 | **PASS 88/79/0** | unchanged — no route added, removed or renamed |
| `check:build-execution-plan` | PASS | **PASS** | — |
| Frontend `type-check` | PASS | **PASS (0 errors)** | — |
| Frontend `type-check:specs` | 1 error | **0 errors** | improved |
| Backend `typecheck` | 1 error | **1 error** | parity (the pre-existing `manager-home.service.ts`) |
| Backend `typecheck:test` | 2 errors | **2 errors** | parity |
| `check:over-300` | 568 | **568** | parity |
| `check:dead-code` (FE) | PASS | **PASS** | — |
| `check:type-assertions` (FE) | 4 / 30 / 1 / 27 | **identical** | pre-existing |
| `check:permission-binding` | 12 mismatches | **12** | parity |
| `check:permission-catalog` | FAIL | **PASS after regen** | **CRLF artifact — see below** |
| `check:list-projections` | **FAIL** | **PASS** | fixed |
| `check:tenant-isolation` | 4 uncovered | **2 uncovered** | improved |
| `check:build-authz-census` | STALE | **PASS**, `VULNERABLE = 0` | improved |
| `check:migration-chain / -discipline / -rollback / -immutability` | PASS | **PASS** with 3 new migrations | — |
| `check:tenant-indexes` | 1 (`impersonation_sessions`) | **1** | pre-existing, outside Build |
| `check:dead-code` (BE) | 192 no-importer | **192** | pre-existing |
| `check:type-assertions` (BE) | 21 double casts | **21** | pre-existing |
| `check:unbounded-reads` | 3 | **3** | pre-existing; the new capacity reads are bounded, not suppressed |
| `check:test-integrity` | 1 unregistered | **1, identical entry** | pre-existing |
| `check:file-sizes` | FAIL | FAIL | pre-existing, CRM/Inventory informational |
| Frontend focused suites | — | **229 suites / 1705 tests pass** | — |
| Backend focused suites | 12 fail / 52 tests | **12 fail / 52 tests, same suites** | **zero new** |
| `git diff --check` | — | clean | — |

### Backend test failures — all twelve reproduce on the control

10 in `src/modules/ai/core` (chat-assistant and gateway) and 2 in `src/modules/timesheets/core`.
Running the identical set on `slos-baseline-be` gives **the same 10 suites and 50 failing tests** in
`ai/core`, plus the same 2 timesheets suites. Branch total 52 = 50 + 2. Nothing this session broke.

### `check:permission-catalog` is not detecting drift

After `pnpm generate:permission-catalog` the gate passes and `git diff` is **empty**. The regenerated file
and `main`'s are the **same git blob** (`bddf8207dc2ddfaa714d6cd73e9706cee20b996d`) while on-disk size
differs — **24762 bytes vs 25606** — an 844-byte CR delta. The generator writes LF; a Windows checkout holds
CRLF. It therefore fails on any fresh Windows checkout regardless of content. Same class as the
`check:build-execution-plan` CRLF artifact recorded in the prior session. No file was committed, because no
content changed.

### `check:contract-parity` could not be measured on the branch

The gate builds a cache entry under `node_modules/.cache/contract-parity`, and because the worktree's
`node_modules` is **junctioned to the main checkout**, the generated entry resolves imports back to `main`'s
source tree. It fails with `No matching export ... for "workloadCapacityContract"` — an artifact of the
junction, not a parity finding. Clearing the cache does not help; it regenerates in the same place.
Measured cleanly on `main` instead: **FAIL, 6 new required fields** — pre-existing.
**Unblock:** run it from a checkout with its own installed `node_modules`, or after merge.

## What the review caught that the agents' own suites did not

Recorded because each is a failure mode, not a one-off.

**The capacity feature was inert.** `capacity.lib.ts` had zero importers, no controller exposed it, and
`capacityByMemberId` was an optional prop no caller passed — so Workload still counted tickets while 35
tests passed over a correct pure function wired to nothing.

**A half-renamed AI action.** `work-actions-tools.ts` was changed to propose `ticket.moveToCycle` while
`build-confirm-actions.ts`, `ask-os-tool-registry.ts` and four specs still named `ticket.moveToSprint`. A
user would have confirmed a move that no handler executed. The agent reported "113/113 passing" without
running the suite that asserts the old name.

**`sprintId: null` shipped as "backward compatibility."** The work-row mapping replaced the value with
`null` while keeping the nullable field. A Zod contract that accepts `null` cannot tell you the value
stopped arriving. Meeting agenda generation filters `t.sprintId === sprint.id`, so agendas would have come
back silently empty. Now derived from `cycles.legacy_sprint_id`.

**A backend build broken across three files.** Backend `typecheck` went 1 → 8: `projects-ai.service.ts`
used `sprints` after the import was removed, and `TicketSnapshot` / `TicketChanges` still declared a
`sprintId` nothing supplied. Four consecutive agent reports said "all passing" because each ran only the
suites it had touched. A cutover changes callers you never open.

**A grep-shaped blind spot in the invariant itself.** The detach spec scanned for `tickets.sprintId` and
reported an empty allowlist while three files selected the column through Drizzle's relational API as
`sprintId: true`. The agent found this itself; the spec now scans both forms and one benign Zod `.pick()`
site is named with its reason.

**A new authorization finding.** `useWorkloadCapacity` fetched for every viewer. A denied user's 403
surfaced as `isPending` with nothing fetching — indistinguishable from a finished empty read, so the screen
said "none yet" to someone who was refused. `check:permission-binding` reported 1 on the branch and 0 on
`main`; now back to parity.

**A gate moved the right way while a new entry slipped in behind it.** `check:tenant-isolation` went 4 → 3,
not 4 → 2, because the new `workload-capacity.service.ts` took a freed slot. Check a gate's membership, not
only its count.

**"Pre-existing" used without a control.** Three failures were reported as pre-existing and unrelated; they
had been caused by another agent minutes earlier — two required keys added to `changeRequestRowContract`
without updating its fixtures. In a shared worktree, a failure you did not cause is often one another agent
caused seconds ago.

**An inflated gate claim.** `check:list-projections` failing on `main` was reported as 19 missing columns.
The original code used `...crColumns`, a spread that already projected every column; the gate's AST parser
cannot see through a `SpreadAssignment`. Real hardening, but it fixed no user-visible defect and `deletedAt`
was never missing.

## What was NOT rebuilt

Both cutover migration plans already existed, fully authored with rollbacks and spec coverage, at
`backend/migrations/sql/a-sprint-cycle-01..05` and `b-qa-bug-01..05`. Phases 01–03 (Sprint/Cycle) and 01–02
(QA Bug) are **already committed to production** behind snapshot
`streamlineos-pre-build-p0-20260922085750`. One agent wrote duplicate migrations `1145`/`1146` before this
was discovered; they were deleted. The existing ones are strictly better — phase 04 refuses to run unless
every `tickets.sprint_id` value is archived, and phase 05 copies `build.sprints` before dropping it.

No route was added, removed or renamed. No completed surface was rebuilt.

## Migrations written this session — none applied

| File | Effect | Code depends on it? | Status |
|---|---|---|---|
| `1149_change_requests_client_visible_release_id.sql` | Adds `client_visible`, `release_id`, partial indexes, `NOT VALID` FK | **YES — hard dependency** | **BLOCKED** |
| `1150_invoice_items_timesheet_entry_ref.sql` | Adds `invoice_items.timesheet_entry_id` | No — inert | BLOCKED |
| `1151_notifications_metadata_project_id_index.sql` | Expression index on `(org_id, membership_id, (metadata->>'projectId'))` | No — filter works unindexed | BLOCKED |

Each has a `.down.sql` rollback; 1149 also has `migrations/sql/1149-verify.sql`, six read-only postcondition
queries. All four migration gates pass with the journal entries added.

**1149 is a merge-and-deploy blocker.** `change-requests.service.ts` reads both new columns on every list,
create and update. Deployed before 1149 applies, every Change Requests request raises PostgreSQL `42703`
and the page is a hard 500.

## Blockers

| # | Blocker | Impact | Exact unblock condition | Owner |
|---|---|---|---|---|
| 1 | ~~Migration 1149 not applied~~ | **RESOLVED 2026-09-22.** Owner authorized production execution. 1149, 1150 and 1151 all applied behind snapshot `pre-1149-20260922132524`; ledger 908/908, 0 pending, both foreign keys validated. 1150 was corrected before applying — it declared a single-column FK to `timesheets(id)` that would have permitted a cross-tenant reference. See `P0-PRODUCTION-EXECUTION-1149-1151.md` | **done** |
| 2 | No non-production PostgreSQL | No `*.db.spec.ts` or `*.e2e-spec.ts` ran; `check:composite-fk-set-null` and `check:tenant-relationships` cannot report at all  (`check:composite-fk-set-null` was since run against production under owner authorization and **passes**: 816 live SET NULL keys, 0 that would null a NOT NULL column) | Provision PostgreSQL 15+, apply the chain, set `DATABASE_URL` in a worktree that is not the main checkout. **Neither `.env` nor `.env.production` may be used — both resolve to the same production RDS host, re-verified this session** | Repo owner |
| 3 | Sprint/Cycle phase 04 cannot run | Dropping `tickets.sprint_id` today would break ~52 call sites with `42703` | **81 non-test `sprintId` references across 45 frontend files** must be cut over, and `hooks/api/build/build-tickets-core-schema.ts:24` must stop projecting it. Backend is clear. `a-sprint-cycle-04-detach.sql`'s guard is a **data** check and cannot detect code | Next session |
| 4 | Sprint/Cycle phase 05 cannot run | `sprints` table still read | `sprints.service.ts` `listSprints` still selects from the frozen `sprints` table | Next session |
| 5 | QA Bug contract-freeze not run | `build.bugs` still writable | `b-qa-bug-03-verify.sql` must return zero for all 14 checks against production, then `b-qa-bug-04-contract-freeze.sql` applied. Requires blocker 2 or explicit production authorization | Repo owner |
| 6 | `check:contract-parity` unmeasurable in a junctioned worktree | Cannot prove zero new parity findings pre-merge | Run from a checkout with its own `node_modules`, or after merge on `main`. `main` baseline is FAIL with 6 new required fields | Coordinator, post-merge |
| 7 | Browser verification | No UI claim can be made | Codex executes `NEXT-CLOSURE-BROWSER-QA.md`. Sections 1 and 2 need blocker 1 cleared first | Codex |
| 8 | CI cannot run | No independent gate replay | GitHub Actions billing lapsed ~2026-09-10; `ci.yml` and `db-gates.yml` fail with 0 steps and no logs. A red workflow is not a code defect | Repo owner |
| 9 | Freelancer quote→payment | Traceability is partial | Migration 1150 adds the pointer; `backend/src/db/schema/crm/invoicing.ts` and the invoicing service must populate `invoice_items.timesheet_entry_id` | Next session |

## Rules enforced

- No production database contacted. No migration applied. `.env` absent from both worktrees throughout.
- No `git reset`, `checkout`, `clean` or `stash`. Agents ran no git at all; the coordinator made every commit.
- `main` was never modified. All work is on `build/next-build-closure` in both repos.
- No code comments, TODO comments, JSDoc or commented-out code added. Reasons are carried in test names.
- Four agents, disjoint file ownership. Shared files — route manifest, permission registry, migration
  journal, generated artifacts, status ledgers — coordinator-only. One journal edit by an agent was caught,
  inspected and kept because it was well-formed and uncontended.
- Typechecks run serially, never concurrently, and never while an agent was running jest in the same repo.
- Every failure classified `code` / `test` / `environment` / `pre-existing`, with each `pre-existing` claim
  reproduced on an untouched control checkout.
- Agents reported `READY_FOR_REVIEW`; only the coordinator marked `DONE`, and every load-bearing claim was
  re-verified here rather than accepted.
- No browser opened, no screenshot taken, no UI verification claimed.

---

# Appendix — prior session ledger (2026-09-22, branch `build/phase-4-close`)

Preserved verbatim. That session's work is merged into `main` and is the baseline this one builds on.


Coordinator-owned. Workers never edit this file.

**Session:** 2026-09-22
**Branch:** `build/phase-4-close` (root and backend), merged to `main` in both repos
**Worktree:** `D:/projects/personal/slos-phase-4-close` (+ `/backend`), `node_modules` junctioned, no install

`DONE` = code and automated tests complete and verified here.
`READY_FOR_CODEX_BROWSER_QA` = code complete; Codex must verify the UI in a real browser. Claude opened no browser this session.
`PARTIAL_BROWSER_PASS` = the component-level real-browser checks passed, while authenticated or data-dependent checks remain blocked on the documented non-production database requirement.

## Status

| Task | Status | Commit | Tests | Browser status | Blocker |
|---|---|---|---|---|---|
| P4-10 — roadmap/feedback `status` in server schemas | DONE | `b85b0110b` → merge `c6cc31231` | 14/14 in `build-roadmap-response.spec.ts`; 288/288 backend focused | READY_FOR_CODEX_BROWSER_QA | none — published contract verified to carry `status`, see below |
| P4-10a — response/filter enum drift protection | DONE | `b85b0110b` | 2 drift tests compare filter `.options` to pgEnum `enumValues` | n/a | none |
| P4-17 — grant mutation response / client Zod parity | DONE (already closed) | landed earlier in `6de3fa51c` | 6 existing tests cover absent / present / null contacts | READY_FOR_CODEX_BROWSER_QA | none |
| P4-18 — revoke-grant cache invalidation | DONE | `66e257dc0` → merge `d589996f6` | 13/13 `hooks/api/portal-access`; mutation-proven red | READY_FOR_CODEX_BROWSER_QA | none |
| Phase B — Phase 3 workflow integration | DONE (already merged) | `ade105b12`, merged before this session | 220 suites / 1558 tests pass on merged main | READY_FOR_CODEX_BROWSER_QA | none |
| Phase B follow-up — FE-77 import in `use-my-work-bulk.ts` | DONE | `871103532` → merge `1ee2ca90c` | 166/166 across 22 suites | n/a | none |
| Phase B follow-up — two code comments in `use-my-work-data.ts` | DONE | `871103532` | 3 legacy-cycle tests carry the reason; mutation-proven | n/a | none |
| Phase B follow-up — inner `Promise.all` in All Work chunking | DONE | `871103532` | 4 new tests; 3 fail against the reverted mutant | READY_FOR_CODEX_BROWSER_QA | none |
| Phase B follow-up — Inbox `view` change does not reset cursor | DONE | `871103532` | 2 new tests; 1 fails against the reverted mutant | READY_FOR_CODEX_BROWSER_QA | none |
| Phase B follow-up — All Work selection for List/Board | DONE | `2d3b41ed5`, `cfd4b1afd` → merge `ebe2cd0b7` | 1420 tests / 186 suites green; board navigation guard mutation-proven | READY_FOR_CODEX_BROWSER_QA | none |
| Phase B follow-up — Inbox `type` dropdown | DONE | `2d3b41ed5`, `cfd4b1afd` → merge `ebe2cd0b7` | 105 inbox tests; invalid-category drop mutation-proven | READY_FOR_CODEX_BROWSER_QA | none |
| Phase B follow-up — physical removal of old redirect routes | DONE | `1d07fadad` | Route census: 88 routes, 79 pages, 0 weak cold-load gates; route and redirect tests pass | READY_FOR_CODEX_BROWSER_QA | `/build/goal` and `/build/pm-workspaces` page trees were removed; config redirects preserve deep links |
| Phase C — static integration verification | DONE | — | see table below | n/a | none |
| Phase D — Codex browser QA handoff | DONE | — | 22/22 real-Chrome viewport cells pass | PARTIAL_BROWSER_PASS | Component overflow, focus and SVG paint pass; authenticated/data-dependent checks are blocked without non-production PostgreSQL. See `CODEX-BROWSER-QA-RESULTS.md` |

## The three Phase 4 findings were already implemented — the gap was coverage

All three were recorded `IN PROGRESS` in `PHASE-4-STATUS.md`, but their implementations had landed. That ledger is stale; this file supersedes those three rows.

**P4-17 was genuinely closed already.** `portal-access-schema.ts:67-68` reads `.nullable().optional().transform((v) => v ?? null)`. Verified field-by-field against the backend `grantRowSchema` (`backend/src/modules/portal/access/dto/portal-access-response.schemas.ts:59-77`): 15 fields, all mapped. `contactFirstName` / `contactLastName` are genuinely absent from the mutation response and present only on `grantListItemSchema`, which is exactly what the `.optional()` handles. Six existing tests cover absent, present and explicitly-null. No change made.

**P4-18's implementation was closed; its test was inert.** `grants.ts:91` already invalidated `portal.all`. But `grants-revoke.test.ts` imported only `directoryAndOwnershipQueryKeys` and never `./grants` — it asserted that `portal.projects()` is prefixed by `portal.all` and similar key-shape facts. It could not observe the hook at all, so deleting the invalidation left all four tests green. That is a test documenting an intention, not pinning a behaviour.

Replaced with four tests that render `useRevokeGrant` against a real `createAppQueryClient`, seed the portal projection, run the mutation and assert `isInvalidated` flips. Each is guarded by a `toBe(false)` pre-assertion so it cannot pass vacuously. The three key-shape assertions were kept but renamed to say plainly that they do not execute the hook.

Mutation proof, reproduced by the coordinator rather than taken from the worker's report:

| Step | Result |
|---|---|
| Baseline | 13/13 pass |
| Mutant — `portal.all` invalidation line removed from `grants.ts` | **2 failed / 11 passed** |
| Restored — `grants.ts` byte-identical to `main` | 13/13 pass |

`invalidateQueries` was kept over `removeQueries` deliberately. It marks the query stale synchronously and refetches mounted observers; `removeQueries` would blank the admin's view to a spinner for no security gain, since the guest's server-side access is already revoked when the mutation resolves.

**P4-10's schema fix was closed; its coverage stopped at the row.** `status` is present at `build-roadmap-response.schemas.ts:11` and `:44`, and all 7 roadmap/feedback response routes carry `@ResponseSchema`. But a `z.object()` silently strips unknown keys on decode, so a row-level test does not prove the page wrapper preserves the field. Added envelope tests for `roadmapPageSchema` and `cursorPageSchema(feedbackPostSchema)`, mutation-proven red by swapping the item schema for a bare `{ id }`.

Also added drift protection: both list filter schemas hardcode their status literals rather than importing the pgEnum. The values match today; two tests now assert each filter's `.options` equals `enumValues` exactly, so a future divergence fails instead of shipping. Cross-repo parity was confirmed read-only — the frontend's `roadmap-schema.ts` enum sets match both pgEnums element for element.

## Phase C — static integration verification

Run serially in the worktree after syncing `main` (which had advanced 8 commits mid-session). Two 10 GB typechecks do not fit in available RAM, and parallel gate runs corrupt fixture-planting gates.

| Check | Command | Result | Classification |
|---|---|---|---|
| Route census | `pnpm check:route-census` | **PASS** — 97 Build routes, 88 pages, 0 weak cold-load gates | — |
| Build execution plan | `pnpm check:build-execution-plan` | FAIL in worktree, **PASS on `main`** | **environment** |
| Frontend typecheck | `pnpm typecheck:web` | **PASS (exit 0)** | — |
| Frontend spec typecheck | `pnpm type-check:specs` | 1 error, reproduces identically on `main` | **pre-existing** |
| Backend typecheck | `pnpm typecheck` | **PASS (exit 0)** | — |
| Backend spec typecheck | `pnpm typecheck:test` | 1 error, reproduces identically on `main` | **pre-existing** |
| Contract vendor | `pnpm check:contract-vendor` | **PASS** — sha256 `43b58720` matches backend artifact | — |
| Contract parity | `pnpm check:contract-parity` | **4 findings; 4 on `main`** — zero new | **pre-existing** |
| Frontend focused | `pnpm exec jest features/build lib/build features/portal features/portal-access hooks/api/portal-access hooks/api/portal hooks/api/build` | **220 suites, 1558 tests, all pass** | — |
| Backend focused | `pnpm exec jest src/modules/portal src/modules/build/core/dto src/modules/feedbucket src/modules/build/client-portal src/modules/build/managed-products` (db/e2e excluded) | **33 suites, 288 tests, all pass** | — |
| Whitespace | `git diff --check` over this session's commits | clean | — |

### The two non-green results, proven not assumed

**`check:build-execution-plan` is a CRLF artifact, not a regression.** It fails only in a freshly checked-out Windows worktree. `git hash-object` is identical in both trees (`4a1d1b8d2624a8ca247e1771d1afa3a0d6ba87e2`) while on-disk size differs by exactly the CR bytes — **17009 on `main` vs 17326 in the worktree**. The checker asserts a literal containing `\n`. Same diagnosis Phase 3 recorded.

**Both spec typecheck errors are pre-existing**, each reproduced on the untouched `main` checkout:
- `features/build/backlog/project-backlog-page.test.tsx(22,54)` TS2556 — a zero-arg `jest.fn()` spread.
- `src/modules/portal/client/portal-client-submit-cr.spec.ts(87,61)` TS2502 — `tx` referenced in its own type annotation, the known circular-drizzle-condition shape.

Guarded against a vacuous pass: `tsc --listFilesOnly` resolves **6187** files for the frontend spec program and both new spec files are in their respective programs, so the clean result over them is a real green, not an unresolved file.

## Phase B — Phase 3 was already merged

`git rev-list --left-right --count main...build/phase-3-workflows` returns `9  0`. Zero commits on the branch are absent from `main`; Phase 3 landed as `ade105b12` in a prior session. **There was nothing to merge.** The review that was to precede the merge was run after the fact instead; its findings are recorded in `PHASE-3-STATUS.md`.

Nine of nine review items came back CLEAN or CONCERN except code comments. No unrelated files, no migration or schema touched, manifest consistent at 88 with resolvable targets, all redirects placed after `enforceRouteAccess` with byte-identical literals and no loop, all new routes resolving to a real permission decision rather than `unknown`.

## Phase 3 follow-ups — closed 2026-09-22

Branch `build/phase-3-followups`, commit `871103532`, merged as `1ee2ca90c`.

**The All Work chunk fix was the one with teeth.** The outer per-project fan-out already used
`Promise.allSettled`, but the intra-project chunk loop used `Promise.all`. Selecting more than 100 tickets from
one project and having chunk 2 fail after chunk 1 committed rejected the whole project: it landed in `failed`,
its `projects.tickets({ projectId })` cache was never invalidated, and the rows chunk 1 had genuinely committed
read stale until `staleTime` elapsed. The per-project call now settles each chunk, sums what committed,
invalidates that project when anything did, and still reports the failed chunk with 409 kept distinct from a
generic error.

**The FE-77 import fix exposed a coupled test.** Changing `use-my-work-bulk.ts` to import `isApiError` from its
owner `@/lib/api-envelope` broke two tests, because the suite mocked `isApiError` on `@/lib/api-client` and gave
`api-envelope` only `lazyContract`. The test had been written against the violation. The mock moved to the
owning module; both tests pass without weakening an assertion.

**The removed comments were replaced by tests, not deleted outright.** The legacy `cycle` deep-link fallback now
has three tests — normalises `cycle` to `cycleId`, prefers an explicit `cycleId` when both are present, and
sends neither when absent — so the reasoning survives somewhere it can fail.

Mutation proof for all three behavioural changes, run here:

| Mutant | Result |
|---|---|
| `Promise.allSettled` → `Promise.all` in the chunk loop | **3 of 4 new tests fail** |
| `view` re-excluded from the Inbox `filterChanged` guard | **1 new test fails** |
| legacy `cycle` fallback disabled | **1 new test fails** |
| all three restored | **166/166 pass, 22 suites** |

The fourth All Work test asserts that a failed chunk is still surfaced, which holds under both implementations —
kept deliberately as the positive pair to the three that bite.

Verification after the merge: `features/build` + `lib/build` → **177 suites, 1307 tests, all pass**;
`pnpm type-check` exit 0; eslint clean on all four touched files; `type-check:specs` shows only the one
pre-existing `project-backlog-page.test.tsx` error; route census still 97/88/0.

## The OpenAPI blocker was not real, and the way it was concluded is the lesson

`PHASE-4-STATUS.md` recorded `openapi.json not regenerated` as a standing blocker: the roadmap/feedback `status`
fix was said to be correct in source but absent from the published artifact, so the generated client could not
read the field. This session repeated that claim, on the strength of the vendored copy's file mtime
(2026-09-21 22:17) predating backend commit `32f0e070b`.

**Both were wrong. The committed artifact already carried `status`, and had for some time.**

Verified by reading the artifact rather than reasoning about its timestamp:

| Route | Published `status` enum |
|---|---|
| `GET /build/roadmap` | `["planned","in_progress","completed","cancelled"]` |
| `GET /build/feedback` | `["open","planned","in_progress","completed","declined"]` |
| `PATCH /build/roadmap/{itemId}` | same as roadmap |
| `PATCH /build/feedback/{postId}` | same as feedback |

A regeneration was run to settle it, with placeholder env and **no** `--env-file` flag, so nothing contacted any
database — the placeholder `DATABASE_URL` pointed at `127.0.0.1:1`, which would have failed instantly had a
connection been attempted. `src/scripts/openapi-env.ts` requires only that the variable be non-empty and says so
in its own header.

The regenerated artifact is **byte-identical to the committed one**: same sha256 (`0f621e4e…`), same 68,224,720
bytes, 0 paths added, 0 removed, 0 operations changed. Git reported it as modified only because the generator
writes LF where the Windows working copy holds CRLF — the same class of artifact as the execution-plan gate. The
regenerated file was discarded rather than committed, since a 68 MB line-ending-only diff is pure noise.

**The 30 path-parameter rewrites no longer exist either.** That was the stated reason to keep regeneration out of
Phase 4. A direct comparison of every `in: path` parameter across all 2959 paths returns **0 changed**. Whatever
staleness existed then has since been reconciled on `main`.

Two lessons worth keeping. A file's mtime is not evidence about its contents — the artifact was right there and
could have been read at any point. And a blocker is a claim: this one survived two phases without anyone testing
it, which is the same failure the BLD-003 ledger already recorded about a "needs a scratch database" blocker that
also turned out to be false.

## The last two follow-ups, and the regression that nearly shipped with them

Merged as `ebe2cd0b7`. Two workers ran in parallel on disjoint files; the coordinator reviewed, corrected and
committed.

**Board selection was delivered as a regression and had to be rebuilt.** The first implementation gave
`KanbanBoard` a `selection` prop and made `handleSelect` toggle selection *instead of* navigating whenever that
prop was present. Because All Work always passes it, the effect was that **clicking a card on the Board could no
longer open the ticket** — the feature traded away the surface's primary action. The worker recorded it as
intentional, having taken the shortcut because `KanbanTicketCard` sat outside its ownership.

Rebuilt so selection is additive: card click navigates exactly as before, and selection is a checkbox on the
card mirroring the existing `list-view-item` idiom. `selection` is threaded through
`KanbanBoardColumn` → `KanbanVirtualTicketList` → `KanbanTicketCard` rather than intercepted at the top. Pinned
by `kanban-card-selection.test.tsx`, whose first test is named for the invariant: reintroducing the regression
fails exactly that test and nothing else.

The reason this slipped through the worker's own suite is worth recording: its tests mocked `KanbanBoard`
wholesale and asserted only that props were threaded. Prop-threading assertions cannot see behaviour, so a suite
built entirely from them will pass whatever the component does with those props.

**Three further corrections before merge**, each caught by a gate run against a main-checkout control:

- `type-check:specs` showed 10 errors against main's 9. The extra one was a `require("react")` inside a hoisted
  `jest.mock` factory shadowing the typed import, making `createContext<T>()` an untyped call. Fixed with a
  `mock`-prefixed import, which `babel-plugin-jest-hoist` permits. Back to 9, same two files as main.
- `check:type-assertions` flagged two new assertions in `use-inbox-url-state.ts`. Removed rather than
  allowlisted — `.some()` and `.find()` replace the casts — and the category guard now has one definition that
  `inbox-filter-bar.tsx` imports instead of duplicating.
- `check:over-300` rose 569 → 570 because the new category tests pushed `inbox-list-bounded.test.tsx` to 338
  lines. The ratchet may only shrink, so the suite was split into a shared harness plus two files of 233 and
  118 lines: 17 tests before, 17 after, count back to 569.

Final state on the merged branch: `pnpm type-check` 0 errors, `type-check:specs` 9 (main's baseline, zero new),
eslint clean on every touched source file, `check:over-300` 569, route census 88 routes / 79 pages / 0 weak
cold-load gates, and **1420 tests across 186 suites** in `features/build`, `lib/build` and
`hooks/api/notifications`.

The six `text-[11px]` eslint errors in `kanban-ticket-card.tsx` and `kanban-board-column.tsx` are pre-existing —
identical counts on the untouched main checkout, and this change added none.

## Blockers

| Blocker | Impact | Exact unblock condition |
|---|---|---|
| No non-production PostgreSQL 15+ | No `*.db.spec.ts` or `*.e2e-spec.ts` can run. Every fix this session is covered by specs that need no database. | Provision Postgres 15+, apply the chain, set `DATABASE_URL` in the worktree. **`.env` and `.env.production` both resolve to production RDS** — neither may be used. |
| No running application stack | No authenticated end-to-end browser journey. | The database blocker, plus a seeded disposable tenant and a frontend built against the local API with `API_INTERNAL_URL` set. |
| ~~`openapi.json` not regenerated~~ | **RETIRED 2026-09-22 — the premise was false.** See "The OpenAPI blocker was not real" below. | n/a |

## Rules enforced

- No production database contacted. No migration written, edited or applied.
- No destructive git commands, no `git stash`. Workers ran no git at all; the coordinator performed every commit and merge.
- No code comments, TODO comments, JSDoc or commented-out code added.
- Three workers maximum, strictly disjoint file ownership, one shared branch.
- Gates run serially; typechecks never concurrent.
- Every failure classified `code` / `test` / `environment` / `pre-existing`, each `pre-existing` claim reproduced on the untouched `main` checkout.
- Workers reported `READY_FOR_REVIEW`; only the coordinator marked `DONE`, and every worker claim load-bearing enough to matter was re-verified here rather than accepted.
- No browser opened, no screenshot taken, no UI verification claimed.
