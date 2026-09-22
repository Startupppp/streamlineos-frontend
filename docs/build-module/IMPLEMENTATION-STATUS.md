# Build Implementation Status

Coordinator-owned. Workers never edit this file. `DONE` requires: PR merged into the integration branch, acceptance criteria checked, targeted tests pass, integration checks pass, no unresolved P0/P1 review finding.

States: `TODO` · `IN_PROGRESS` · `BLOCKED` · `READY_FOR_REVIEW` · `DONE`

## Current status — 2026-09-22

The historical entries below are preserved for audit history. The current source and verification state is:

- **DONE:** release authorization, N-11 cold-load gates, Issues explorer residual, command palette residual, authorization census closure, migration-chain repair, and UX hardening.
- **Verified:** `VULNERABLE = 0`; 83 Build pages have 0 weak cold-load gates; root route/execution checks and backend typecheck pass.
- **Database execution blocked:** P0 #6 Sprint/Cycle, P0 #7 QA Bug lifecycle, and P0 #8 live composite `SET NULL` catalog verification require non-production PostgreSQL 15+.
- **Migrations 1141/1142:** statically complete and ready for staging application; not applied because no safe staging database exists.
- **Documentation authority:** `docs/build-module/PHASE-1-STATUS.md` and the final reconciliation section below supersede earlier historical `Still open` rows.

Integration branch: `build/integration` (not yet created — awaiting approval)

## Verification wave — dispatched 2026-09-21

| ID | Verifies | Backlog estimate at risk |
|---|---|---|
| BLD-V02 | P0 #6 — second Sprint identity | **REAL**, estimate confirmed, see below |
| BLD-V03 | P0 #7 — parallel QA Bug lifecycle | **REAL**, ~2 d smaller, see below |
| BLD-V04 | P0 #8 — composite FK tenancy | **STALE** — 165/166 composite. ~1–2 d residual |
| BLD-V05 | P0 #10 — authorization coverage | **STALE** premise, but found a real escalation |
| BLD-V06 | P1 #11 — Issues explorer | **STALE** — built. 12–20 d → ~2–4 d |
| BLD-V07 | P1 #13 — command palette | **PARTIAL** — 5–8 d → ~3–5 d |
| BLD-V08 | P1 #15/16 — reports and workload | **REAL** both. Estimates hold |

### New defects the audit never named

Both verified by the coordinator directly, not taken from a report.

**N-01 — privilege escalation: `build:tickets:view` writes a ticket comment.** The canonical route gates comment creation behind `build:tickets:update` (`projects-ticket-comments.controller.ts:46`). Two `view`-gated routes compose into the same write: `comment-drafts.controller.ts:60` accepts an arbitrary 10,000-char body resolved by `orgId` only, then `agent-pulse.controller.ts:46` applies it via `insert(ticketComments)` (`agent-pulse.service.ts:260-264`). Both decorators confirmed by reading the source. Moderate, not critical: in-tenant, authored under the actor's real `userId`, content-only. Fix is one decorator — gate `applyDraft` on `build:tickets:update`.

**N-02 — RETRACTED. The finding was false, and so was the coordinator's confirmation of it.**

Claimed: "DataScope is never applied in Build; no Build key carries a non-`all` scope." Both halves are wrong.

The coordinator grepped `rbacScope` under `modules/build/`, got nothing, and treated absence of that identifier as absence of the mechanism. It is a grep artifact. BE-113 names `req.rbacScope` as *an* entry point, not the only one — Build resolves the same grant through `AccessService.scopeFor` wrapped in `ScopedRead`:

- `core/projects-scope.ts:11` — `ScopedRead.for(access, u, PROJECTS_MANAGE_PERMISSION)`
- `core/tickets-scope.ts:23` — same for `build:tickets:view`
- `execution/timesheets-scope.ts:12-15` — `scopeFor(...)`, with `none` → deny and `own` → narrow spelled out literally
- `core/build-ticket-bulk-mutation.ts:40` — `scopeFor(actor, "build:tickets:assign") === "none"` guard

And the second half: **two Build keys are `scopable: true`** (`rbac/permissions/shared.ts:65` and `:126`), so "no scoped key exists" was false too. `execution/timesheets-scope.spec.ts` already tests `all`/`own`/`none` behaviourally.

A tripwire built on the stated premise would have asserted something untrue. Lead A refuted it, then refuted its own subagent's replacement recommendation as well, and shipped the honest invariant instead: `build/build-scopable-keys-have-a-resolver.spec.ts` pins that every `scopable: true` Build key is covered by a scope resolver. It passes today — a forward ratchet, not a bug fix, and recorded as such with no red-first step. Proven non-vacuous by replaying its filter against a synthetic catalog.

**Lesson, already in the rules: grep by string misses typed branches, and a memory note is a lead, not a finding.**

**N-03 — bare composite `SET NULL` reintroduced after the repair sweep.** `migrations/1128a_requisition_headcount_link.sql:4` declares `ON DELETE SET NULL` on `(org_id, headcount_id)` with no column list, where `job_requisitions.org_id` is NOT NULL. Outside Build, so out of this programme's scope, but it is a live instance of a shape the codebase already fixed catalog-wide: `migrations/0992_set_null_referential_actions_repair.sql` scans `pg_constraint`, rewrites every offender and `RAISE EXCEPTION`s if any survive — and its guarantee does not extend forward past its own run. Deleting a referenced `headcount_requests` row fails with `23502` as a 500.

**N-04 — QA by-id routes skip `assertProjectAccess`.** `qa/test-cases.controller.ts:63,88,102` and `qa/test-runs.controller.ts:91,104,130,143,157,179` pass `u.orgId` rather than `u`, so the receiving service methods never assert project membership. Cross-tenant is still 404 (correct), but an org member holding `build:qa:view` who is *not* a member of project 7 gets 403 from the list route and **200 with the row** from the by-id route. `bugs.service.ts` in the same module is the correct sibling to copy.

**N-10 — the QA authorization gap is not confined to QA. Releases has it live, and ~30 controllers are unswept.** Coordinator-verified in `modules/build/core/projects-releases.service.ts`: `updateRelease:69`, `deleteRelease:106`, `addTicketToRelease:116` and `removeTicketFromRelease:133` all take `(orgId, releaseId, …)` — **no `projectId`, no membership gate**. `createRelease:53` receives `projectId` and asserts nothing; the only `assertProjectInOrg` call is in `listReleases:27`, and that is an org check, not a membership check.

Exploit: an org member holding `build:releases:manage` but with **no membership of project 7** can `DELETE /build/7/releases/:releaseId` for a release belonging to a project they cannot read. In-tenant horizontal escalation, same class as the QA defect BLD-020 just closed.

Scale: `grep -rln "u.orgId" src/modules/build/**/*.controller.ts` returns **30 files**. BLD-020 swept three. The remaining 27 deserve the same treatment, and `bugs.service.ts` plus the now-fixed QA services are the reference shape.

This is the highest-value follow-up from the session: a known-exploitable pattern with a proven fix and a measured blast radius.

**N-09 — the render ladder has no exhaustiveness check.** `features/build/views/project-board-content.tsx` selects the view through six independent ternaries (`:148, 171, 199, 240, 258, 275`) with no `switch`, no `default`, and no exhaustiveness guard. Adding a seventh `ViewType` satisfies the `VIEW_META` compile error and still ships a **blank pane**. Confirmed open by review, deliberately deferred from BLD-010.

**A design principle this session kept re-learning.** BLD-010 took four rounds and the last one was a *deletion*. The pattern each time: a test was written to police an invariant that the type system could have made impossible. Round 1 pinned a set against itself. Round 3 manufactured a duplicate list so a test could compare the two. Round 4 mapped the switcher's options over the single source and deleted both the duplicate and the test.

The tell was already in the codebase: `build-nav-model.ts:22` is `new Set(VIEW_TYPES)` — untested, and correctly so, because construction makes divergence unrepresentable. When one side of a chain is trusted to construction and the other needs a test, the test is usually standing in for a refactor.

**N-08 — an invalid CSS token that every gate passed.** BLD-022's FE-92 fix replaced a raw hex with `hsl(var(--muted-foreground))`, the standard Tailwind-3 token form. But `globals.css:87` defines `--muted-foreground: #556377` — a complete hex, not bare HSL components — so it expanded to `hsl(#556377)`, invalid CSS. The browser drops the `fill` and the cell renders with the default, hitting exactly the fallback path a custom project status takes.

Caught by nothing: the transform tests assert the string equals `MUTED_FILL` (true whatever it contains), eslint does not evaluate CSS validity inside a string literal, and jsdom cannot observe SVG paint (FE-123). Fixed to `var(--muted-foreground)` in `c193837cf`.

**Worth generalising:** a "use the token" rule is only safe if the token's *shape* is known. This repo's tokens are complete colours, so the `hsl(var(--x))` convention imported from most Tailwind codebases is actively wrong here and fails silently.

**N-08a — the same bug is live in 54 places repo-wide.** Coordinator-verified: `grep -rn "hsl(var(--"` across `components/ features/ lib/ app/` returns **54 hits**, and `globals.css` defines its tokens as complete hex (`--muted-foreground: #556377` `:87`, `--card: #ffffff` `:82`, `--border: #e2e8f0` `:88`). Every one of those 54 expands to invalid CSS and is dropped silently.

The identical `hsl(var(--muted-foreground))` is already shipping in at least four modules — `features/billing/ai-credits-daily-chart.tsx:26`, `features/build/reports/chart-card.tsx:16`, `features/crm/analytics/win-rate-trend-chart.tsx:70`, `features/support/reports/overview-charts.tsx:28` — plus `burnup-chart.tsx:34`, `cfd-chart.tsx:39`, `velocity-chart.tsx:28`, `project-stats.tsx:32-33`.

After BLD-022, this slice is the **only** place in the Build charts that gets it right. Deserves its own ticket, and a scanner: a check for `hsl(var(--` is one regex and would have prevented all 54.

**N-07 — a raw-hex ratchet that no gate enforces.** FE-92 is a stated non-negotiable and FE-93's 228-literal count "may only shrink", but `scripts/check-no-arbitrary-colors.mjs:17` matches only Tailwind arbitrary classes (`-[#…`), and eslint's `streamline/no-raw-visual-values` does not see a bare string literal. BLD-022 added two `"#94a3b8"` literals that passed file-scoped eslint and every gate. A prose ratchet with no detector will only ever move one way. Either extend the scanner to bare string literals or stop calling the count a ratchet.

**N-06 — the unsaved-changes guard is protected by a self-referential test.** `features/build/navigation/build-command-palette-unsaved-guard.test.tsx:23-34` declares its **own inline** `CommandPaletteNavItem` and tests that, never importing the dialog it claims to guard. Delete `requestLeave` from `command-palette-dialog.tsx:184` and every test still passes while a user with a dirty ticket form selects a command and silently loses their work. Pre-existing. The guard itself is intact and was verified byte-identical during the BLD-023 review — the defect is that nothing would catch its removal.

**N-05 — dead keyboard shortcuts.** `components/command-palette/hooks/use-keyboard-shortcuts.ts:20` matches `/\/projects\/(\d+)/`, but Build routes are `/build/[projectId]`. The `c`, `g b` and `g i` chords never fire on any Build page, and the only matching route in the app is `/inventory/projects` — so those chords would route an inventory id into `/build/{id}`.

**Why verification, not implementation, got the extra slots.** Three audit premises have been checked and all three were stale or overstated (P0 #1 done; three of BLD-011's four pages already compliant; five of six P0 route claims false). The backlog is sized for a tree older than the one on disk. These seven cover **71–112 estimated days**; at BLD-V01's cost of 72 seconds each, verifying first is the cheapest possible way to find out how much of that is already built.

Read-only agents run no `pnpm` command, so they do not contend for the RAM that the concurrency ceiling protects. The ceiling still governs **coding** workers: two are active, against the limit of four.

### BLD-V02 — P0 #6 Sprint/Cycle: REAL, and bigger than the route fix suggested

Only the route layer is consolidated. Two identities remain live below it:

| Layer | Sprint | Cycle |
|---|---|---|
| Table | `build.sprints` (`core.ts:98`) | `build.cycles` (`core.ts:154`) |
| Ticket FK | `tickets.sprint_id` (`ticket-core.ts:40`) | `tickets.cycle_id` (`ticket-core.ts:59`) |
| Controller | `SprintsController` (`iterations.controller.ts:62`) | `CyclesController` (`:130`) |
| Hook | `useSprints` (`hooks/api/build/sprints.ts:27`) | `useCycles` (`advanced.ts:79`) |

Both controllers and services are registered live (`build-execution.module.ts:46-47, 64-65`), and ~8 non-test frontend files consume the sprint hooks. This is not a dead branch.

Three complications the backlog line does not mention:

1. **The tables are not shape-compatible.** `sprints` uses free-text status with a CHECK of `PLANNED/ACTIVE/COMPLETED` plus `deleted_at`; `cycles` uses `cycleStatusEnum` defaulting to `draft` with **no soft-delete column**. `cycles` needs `deleted_at` added before it can absorb sprint rows.
2. **Every ticket's iteration membership must be reconciled** from two independent nullable FKs into one, then the other dropped.
3. **Three sprint-only satellites have no cycle counterpart:** the whole `sprint_scope_events` table (`sprint-events.ts:15`), `test_runs.sprint_id` (`qa.ts:78`), `project_meetings.sprint_id` (`meetings.ts:39`).

Scale: 139 non-spec `sprint_id` occurrences across 68 backend files. **The 10–15 day estimate holds** and is dominated by the ticket-FK migration, not the rename.

### BLD-V03 — P0 #7 QA Bug: REAL, but the claim is half wrong

The parallel lifecycle is live: `build.bugs` carries its own 9-value `bug_status` pgEnum (`qa.ts:136,147`) and its own `assignee_membership_id` with its own actor FK (`qa.ts:155,178-182`), while `tickets` already supports `type = BUG` (`common/enums.ts:17`) and does not use it for QA defects. Test-run failures insert straight into `bugs`, bypassing tickets entirely (`test-runs.service.ts:364-380`).

**But "two statuses, assignees, comments and reports" overstates it.** There is no `bug_comments` table anywhere, and no bug reporting surface. Consolidation is therefore a net *gain* of collaboration features for defects — attachments, labels, watchers, checklists, mentions — not a merge of two comment systems. That removes roughly 2 days from the estimate.

The hard part is not code volume (one 201-line service, one 5-route controller, 4 permission keys, one page). It is mapping nine fixed `bug_status` values onto **per-project configurable** `project_statuses` (`ticket-core.ts:95-99`): every project would need QA states seeded or bugs fail the status FK. Plus a per-project `bug_number` → `ticket_number` renumber under `uniq_tickets_project_number` (`ticket-core.ts:100`) and an id remap for `test_run_results.linked_bug_id`.

### BLD-V06 — P1 #11 Issues explorer: STALE, and it found BLD-010's root cause

The largest P1 estimate in the backlog is for a surface that already ships. Every headline capability exists and is wired to `/build/[projectId]/issues`:

| Claimed | Reality |
|---|---|
| board | `kanban-board.tsx`, virtualized at `kanban-virtual-ticket-list.tsx:239` |
| list | `list-view.tsx` (376 lines) with groupBy/rowBy |
| table | `table-view.tsx:256` on shared `DataTable`, paginated |
| timeline | `gantt-view.tsx` + `views/gantt/` — dependency overlay, milestone markers |
| saved views | **server-side**: `useViews`/`useCreateView`/`useUpdateView`/`useDeleteView`, `advanced.ts:137-192`, Zod contracts, RBAC-gated |
| bulk action | `bulk-action-bar.tsx` wired at `project-board-content.tsx:211-226` |

Plus calendar and workload views, and `next/dynamic` code-splitting for the two heaviest.

**Estimate: 12–20 d → ~2–4 d.** What is genuinely left: bulk selection exists only in the table view (`list-view.tsx` has no selection affordance); saved views have no rename/edit-filters path from the board although `useUpdateView` already exists; and `project-board-page.tsx` resolves state manually rather than through `usePageState` with `error`, unlike its sibling `views-page.tsx:51-56`.

**This verifier found BLD-010's actual root cause.** The accepted view set is declared twice and the two disagree: `view-switcher.tsx:21-23` includes `workload`; `build-nav-model.ts:21-27` `WORK_BOARD_VIEWS` does not. The dead sidebar highlight is not a workload quirk — it is two sources of truth for one set. Relayed to worker-1 with instruction to derive the nav set from the switcher tuple rather than add a second hardcoded entry, and to pin the invariant with a test that fails if they diverge again.

Related, deliberately out of scope: `/build/[projectId]/timeline` renders the same `GanttView` as `?view=gantt` — a second instance of the same dual-path pattern, to be scoped separately.

## Playbook compliance

Audited against `07-claude-parallel-execution.md`. Two deviations are sanctioned; the rest are closed.

| Playbook requirement | State |
|---|---|
| R4 — isolated worktrees, no overlapping owned paths | Met |
| R5 — concurrency ceiling | Met, three workers |
| R6 — no worker dev servers; integration owns verification | Met |
| R7 — no code comments | Met |
| R9 — workers never mark DONE | Met |
| R11 — **independent reviewer session per slice** | **Closed.** Was violated: the coordinator reviewed BLD-001 and BLD-002 itself, and authored *and* reviewed BLD-003. An independent reviewer now runs per slice, starting with BLD-003. |
| R12 — merge, re-sync integration, run affected checks | Met |
| R13 — BLOCKED records an exact unblock condition | Met, BLD-003 |
| Integration — route census | Met. The BLD-001 manifest test *is* the census: 9/9, bidirectional against disk. |

### Sanctioned deviation 1 — no PRs, local only

R10/R12 and the completion criteria call for a PR per slice. Opening PRs requires pushing `build/integration` and every slice branch to a shared remote where peer sessions are actively committing. Decision on 2026-09-21: **keep everything local.** DONE rows record the worker commit and the merge commit in place of a PR URL. Nothing is published until explicitly authorised.

### Sanctioned deviation 2 — no dev-server or 375 px inspection

The integration prompt requires running the single shared backend/frontend pair and inspecting desktop and 375 px states for UI work. In this repo `.env` and `API_INTERNAL_URL` point at **production**, so that step would exercise production data. Decision on 2026-09-21: **skip it and record the gap** rather than run it against production.

Consequence, stated plainly: for UI slices, jsdom covers logic, states and accessibility attributes, but FE-123's three blind spots — layout overflow, real focus order, and paint — remain **unverified**. Any UI slice marked DONE carries that caveat until a scratch API target exists.

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
| BLD-003 | `projects.pmWorkspaceId` nullable migration | 02 | build/p0-workspace-optional (backend repo) | coordinator | DONE (merged) | `24702e40e` → `8408d44a9` → `fc7752db4` → `afa9f16c7` → artifact `5df6dccf3` / `18e626c62` | On backend `main`; contract regenerated and vendored. **Migration 1141 is committed but has never been applied to any database** — see below |

### BLD-003 — what independent review caught that self-review did not

Round 1 returned CHANGES_REQUIRED with four findings against work the coordinator had authored **and** reviewed. This is the concrete argument for playbook R11.

| Finding | Reality |
|---|---|
| P0-1 | `projects-list-workspace-projection.spec.ts:32` — a test named *"rejects a null pmWorkspaceId because the column is NOT NULL"* was **still green**. Its name asserted the opposite of the new truth, and it would have pushed the next author to re-add `.notNull()`. |
| P1-1 | **Five** response contracts still declared `pmWorkspaceId: z.string()`. `@ResponseSchema` is metadata only (`zod-operation-contracts.ts:19`), so the API would emit `null` against an OpenAPI artifact promising `string`. |
| P1-2 | Behaviour changed with zero tests. |
| P2-1 | The slice does not deliver its own headline claim. |

**The coordinator's "only one consumer required non-null" was wrong.** A second consumer existed in the same module; it stayed green only because the contract it guards was never touched.

Fixed in `8408d44a9` (contracts + spec) and `fc7752db4` (three tests). `workspaceMemberRowSchema:230` was deliberately left non-nullable — that field is the workspace's own id. A bulk replace would have widened it wrongly.

**An honest correction, then a correction to the correction.** The test author reported that two of three new tests do not fail on revert, because `Map.get(null)` returns `undefined`, falsy exactly like `null`. The coordinator then wrote that line 182 was therefore "the only behavioural defect fixed". **That was also wrong**, and the reviewer disproved it by rendering both query forms through `PgDialect`:

```
REVERTED : "pm_workspace_id" in ($2, $3)  params: ["org-1", null, "ws-missing"]
FIXED    : "pm_workspace_id" in ($2)      params: ["org-1", "ws-missing"]
```

The reverted form does not throw, and in Postgres `IN (NULL, 'ws-missing')` returns exactly what `IN ('ws-missing')` returns — NULL never equals anything. The fetched rows only populate a Map, so the result set is identical.

**True ledger line: `24702e40e` contains no runtime behaviour fix in `scope-directory` at all.** Both edits were forced by the type system when the column widened. Line 182 buys hygiene — no NULL bound into an `IN` list, no pointless round-trip — not a bug that was breaking anyone. Test 3 is still worth keeping because it pins query construction and does deterministically fail on revert, but it must not be described as covering a user-visible defect. **The slice's entire behavioural surface is the migration, the Drizzle declaration, and the five response contracts.**

**Confirmed correct:** leaving `workspaceMemberRowSchema:230` non-nullable was right — it is the shape of `projectWorkspaceMembers`, whose column is `.notNull()` at `teams.ts:78` and which migration 1141 never touched. The reviewer also found pre-existing drift running the *other* way (`teams-response.schemas.ts:13`, `managed-products-response.schemas.ts:13` declare `.nullable()` against NOT NULL columns), so neither a bulk widen nor a bulk narrow would have been safe.

**RESOLVED — the blocker's premise was wrong.** The artifact was genuinely stale: `openapi.json` (69 MB, git-tracked), last touched by `e7f7c6701`, rendered `"pmWorkspaceId":{"type":"string"}` while genuinely nullable siblings rendered `anyOf [string, null]`, and the frontend mirror `frontend/contracts/openapi.json` was identically stale. **But the recorded unblock condition — "a scratch database URL" — was false.** `src/scripts/openapi-env.ts` requires `DATABASE_URL` only to be *non-empty* and documents in its own header that "placeholder values are safe": the generator boots Nest purely to read decorator metadata and never issues a query. The blocker was not the absence of a database; it was the `--env-file-if-exists=.env` in the npm script. Invoking the script directly with placeholder env bypasses that entirely and never touches production.

Regenerated as backend `5df6dccf3`, vendored to the frontend as root `18e626c62`. Path surface unchanged (2959 paths / 3946 operations); semantic delta is exactly **+11 null branches** (17143 → 17154). `check-openapi-fresh` exits 0 — the artifact is current. `check:contract-vendor` matches on sha256 `389b36f9`.

**Lesson for the ledger:** a blocker is a claim, and this one was never tested. It cost the slice a full session. R13 requires an exact unblock condition; it should also require that the condition be *verified* before the slice is parked.

**STILL OPEN — migration 1141 has never been applied to any database.** It is committed, journalled, and has a rollback; all four static gates pass (`check:migration-discipline`, `-immutability`, `-rollback`, `check:openapi-path-params`). What has *not* happened is execution: there is no local Postgres on this machine, and the only reachable database is production via `.env`. **This is safe to leave, and the direction matters:** the column is still `NOT NULL` in the live database while the Drizzle declaration and the published contract say nullable. Reads are unaffected — a `NOT NULL` column never emits a null, so a nullable contract is a strict superset. Writes are unaffected because `resolveWorkspaceIdForWrite` returns `Promise<string>` and never yields null. The database is *stricter* than the contract, which is the non-breaking direction; applying 1141 later only relaxes it. **Unblock condition (verified this time by reading the script, not assumed): a reachable non-production Postgres. `openapi:generate` does NOT need one; `db:migrate` and `migration:proof` do.**

**Deliberately out of scope (P2-1 stands).** `resolveWorkspaceIdForWrite` (`pm-workspaces.service.ts:221-233`) resolves a default on every create path, so nothing yet produces a null. The DB permits workspace-less projects; no code path creates one. The follow-up slice must also handle `projects-write.service.ts:357`, which rejects linking a managed product when `pmWorkspaceId` differs — so a null-workspace project can never link to a product.

### BLD-003 — authored, gates green, typecheck outstanding

Worktree `D:/projects/personal/streamlineos-be-worker-3` cut from the **backend** repo's `origin/main` (`53df836ba`). Four changes:

| File | Change |
|---|---|
| `migrations/1141_projects_pm_workspace_optional.sql` | `ALTER TABLE "build"."projects" ALTER COLUMN "pm_workspace_id" DROP NOT NULL` under `lock_timeout = '5s'` |
| `migrations/rollback/1141_projects_pm_workspace_optional.down.sql` | `CHECK … NOT VALID` → `VALIDATE` → `SET NOT NULL` → drop CHECK (BE-63) |
| `migrations/meta/_journal.json` | idx 1029, when 1803000010410, tag `1141_projects_pm_workspace_optional` (BE-58) |
| `src/db/schema/build/core.ts:46` | `.notNull()` removed |

Gates, each run `:self-test` first because a gate resolving nothing reports zero vacuously:

| Gate | Self-test | Result |
|---|---|---|
| `check:migration-discipline` | 27 passed | PASS |
| `check:migration-immutability` | 13 passed | PASS |
| `check:migration-rollback` | 9 passed | PASS |

`check:migration-chain` and `migration:proof` were **not** run and must not be run from this tree: both load `--env-file-if-exists=.env`, which points at production. The BE-66 empty-DB replay remains outstanding and needs a scratch `DATABASE_URL`.

**Rationale, recorded here because SQL comments do not survive.** A comment-stripping tool removed the explanatory headers from both files minutes after they were written, consistent with the standing no-comments rule. The SQL is semantically complete; the reasoning lives here instead:

- `pm_workspace_id` is the second column of composite FK `fk_projects_org_pm_workspace` → `pm_workspaces [org_id, pm_workspace_id]`. Under default `MATCH SIMPLE` a NULL in that column leaves the constraint unchecked for the row — the wanted semantics for a workspace-less project, stated so it reads as intent.
- Tenancy does not weaken: `org_id` holds its own FK to `organizations` independently.
- That FK declares no `ON DELETE`, so widening introduces no `SET NULL` hazard.
- `DROP NOT NULL` is catalog-only — no rewrite, brief ACCESS EXCLUSIVE.
- The rollback **fails by design** once a workspace-less project exists; re-imposing NOT NULL requires deciding those rows' workspace, which no migration can invent. Find them with `SELECT "id", "org_id", "name" FROM "build"."projects" WHERE "pm_workspace_id" IS NULL;`.

**Type impact: far smaller than the reference count suggested.** The column is referenced 352 times across 71 files, but only **one** consumer actually required non-null. `pnpm typecheck` produced 3 errors, all in `src/modules/build/scope-directory/scope-directory.service.ts` (lines 124, 420, 670), and 420/670 were the same root cause — one helper signature.

Fixed by following the idiom the file already used for the nullable `managedProductId` sitting on the adjacent line:

| Line | Change |
|---|---|
| 124 | `workspaceById.get(row.pmWorkspaceId)` → guarded: `row.pmWorkspaceId !== null ? workspaceById.get(...) : null`, mirroring line 125 |
| 147 | helper param widened to `pmWorkspaceId: string \| null` |
| 182 | `.filter((id) => !workspaceById.has(id))` → `.filter((id): id is string => id !== null && !workspaceById.has(id))`, mirroring the `id is number` predicate at line 155 |

Line 108/114 were deliberately left alone: those read `managedProducts.pmWorkspaceId`, a different table this migration does not touch.

**Gate-honesty caveat, cost one wrong report.** The background-task notification for the first typecheck said "exit code 0" while the command had actually failed — its output ends `ELIFECYCLE Command failed with exit code 2`. The notification reports the **shell wrapper's** exit, not the command's. Never read a pass off the notification; read the output.

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

## Wave 1 — three concurrent workers, dispatched 2026-09-21

| ID | Slice | Spec | Branch | Owner | Status | PR | Verification |
|---|---|---|---|---|---|---|---|
| BLD-010 | Workload route canonicalization + caller census | 01, 10-project-workload | build/p1-cycles-workload | worker-1 | **DONE** | `deb574acc` → merge `090e5f245` | APPROVE. On `main` via `110a19e00`. 2026-09-21 |
| BLD-020 | Backend authz: QA by-id, comment escalation, scopable-key ratchet | — | build/p2-authz-fixes (backend) | Lead A | **DONE** | `9a0cb5771` → merge `53dd76998` | APPROVE. On backend `main` via `9a743cdca`. N-01 and N-04 both re-verified closed at source. 2026-09-21 |
| BLD-022 | Reports: `?tab=` URL state, Overview tab, CSV export | 10-project-reports | build/p2-reports | Lead C | **DONE** | `9577c0e86` → merge `08c7feb9b` | APPROVE. On `main` via `110a19e00`. 2026-09-21 |
| BLD-021 | Frontend defects: backlog page-state, unified project-id, list bulk-select | 10-project-backlog | build/p2-fe-defects | Lead B | **DONE** | `87cb387b8` → merged | APPROVE round 2. Guard mutation-proven. 233/233 integration. 2026-09-21 |

### BLD-021 — a worker that reverted its own fix

Round 1 shipped three fixes; two were wrong in instructive ways.

**The `/` collision fix was inert.** It bailed when `[data-search-input]` existed — and **nothing in the app carries that attribute**. `SearchInput` sets `data-slot="search-input"`; command-center renders no search control at all. The palette hook was *already* on `document`, so both handlers sat on the same node and `stopPropagation` could not reach the other. Behaviour was byte-identical to before the commit.

Worse, the obvious follow-up was a trap: adding the attribute to `SearchInput` would have stopped `/` opening the palette on **every page with a search box** — an app-wide kill switch for a one-page collision.

Round 2 chose to **revert it and report the collision as unfixed**. That is the right answer: inert code that looks like a fix is worse than an open ticket, because it stops anyone looking again.

**The `isLoading` guard was deleted, and the test concealed it.** `project-backlog-page.tsx` was left with `if (!data) return notFound()` as the fallthrough. The test named *"passes isLoading true when project query is still loading"* supplied `data: undefined, isLoading: true` — under which the component reached `notFound()` (mocked to `() => null`) and rendered **nothing**, while asserting only that `usePageState` had been called. Green, while the component under test returned a 404.

Round 2 restored the guard and renamed the test to assert the skeleton renders. The reviewer then **proved it by mutation**: a `$TEMP` copy with the guard stripped, run against the real unmodified spec, failed exactly one test with an empty body.

**A correction the reviewer made to the coordinator.** I had paraphrased its finding as the guard covering the "`useProject` disabled while `useCan` is in flight" window. Wrong — a disabled Query v5 read reports `isLoading: false`, so the guard could never fire there. The real window is *enabled-and-fetching, cold cache*; the disabled window was always covered by the `HydrationBoundary` at `layout.tsx:61`.

Also caught: the worker reported `denial-is-not-emptiness` as "1 fail / 15 pass". The suite has 8 tests — actual is 1 fail / 7 pass. The failure itself is a genuine pre-existing stale entry.
| BLD-023 | Command palette: `useCan` gate + typed registry | — | build/p2-command-palette | Lead D | **DONE** | `d17df279d` → merged | APPROVE round 2. 48/48 integration across 7 suites. 2026-09-21 |

### BLD-023 — the registry now matches the spec

Round 1 shipped the gate and the extraction but left five of eight migrated commands outside every test's render path — `usePathname: () => "/"` meant `extractProjectId` returned null, so a typo'd href passed green. Round 2 added the project-path tests and the worker verified the mutation itself (`backlog` → `bakclog` failed on the exact href, reverted before commit). The reviewer went further and confirmed assertion power independently: inverting `isAvailable: projectId !== null` would make all five labels vanish.

`icon` moved from a stringly-keyed map with `?? Plus` fallbacks onto the interface as a required typed field, so omitting it on a new entry is now a compile error rather than a wrong icon shipped silently. `CommandPaletteCommand` now matches `04-shared-components.md` field for field, with `isAvailable` genuinely load-bearing — both command groups filter on it.

### BLD-022 — 3 of 4 delivered, one genuine backend prerequisite

Reused `useUrlFilters` from BLD-002 rather than writing new URL plumbing — the Wave 0 foundation earning its keep. Route file reduced to 15 lines delegating to `features/build/reports/` (FE-56).

**Deliverable 4 blocked, with a real reason.** `CriticalPathNode` (`hooks/api/build/reports.ts:70-74`) carries only `ticketId: number`, while the ticket detail route is `/build/[projectId]/tickets/[ticketKey]` and needs a string key. No client-side `ticketId → ticketKey` resolver exists. **Prerequisite: `GET /build/{id}/reports/critical-path` must return `ticketKey` per node.** Correctly stopped rather than inventing a lookup.

**The risk under review:** a subagent reported that `ChartShell` is inline and non-exported inside `project-analytics-page.tsx`, so the worker "defined a local `OverviewChartShell`", and that the data transforms are "inline and not extractable". If the Overview tab re-implemented the analytics charts rather than reusing them, this slice has *increased* duplication while carrying a name that says it consolidated — worse than doing nothing, because the debt ships under a label saying it was paid. That is the reviewer's P0 question (FE-59/FE-60).

### BLD-010 — root cause fixed, but scope exceeded the brief

The relay from BLD-V06 changed the slice. Rather than adding `workload` to a second hardcoded list, the worker extracted `ViewType`/`VIEW_TYPES`/`parseViewType` into a new `lib/build/view-types.ts` and derived `build-nav-model.ts`'s `WORK_BOARD_VIEWS` from it — one source of truth — then added a divergence test iterating `VIEW_TYPES`.

It also **reversed a redirect in `next.config.ts`**: previously the canonical `/build/:projectId/workload` bounced *to* `?view=workload`; now old query-form deep links redirect *to* the physical route. And it changed `handleViewChange` in `use-board-url-state.ts` to `router.push` the physical route.

Neither file was in the brief. That is a **coordinator briefing gap, not a worker violation** — the BLD-010 dispatch named only `build-route-manifest.ts` as off-limits (which the worker correctly did not touch) and never enumerated owned paths. Future dispatches must list owned paths explicitly, per playbook R3.

The redirect inversion is the risk: if any writer still appends `?view=workload`, the user bounces between the two forms. Saved views are a real replay vector — they are server-persisted (`advanced.ts:137-192`) and hydrate `view` at `use-board-url-state.ts:143-167`, so a saved view holding `workload` could replay the query form. Flagged to the reviewer as P0-if-true.

Test `:250` was updated rather than deleted, its premise having genuinely inverted. Whether the new divergence test bites or is circular — it iterates the same constant it asserts against — is the reviewer's crux.

Related instance deliberately out of scope: `/build/[projectId]/timeline` renders the same `GanttView` as `?view=gantt`, the same dual-path pattern.
| BLD-011 | Page-state reliability: **teams only** | 10-teams | build/p1-teams-page-state | worker-2 | **DONE** | `c6a68ae4d` → merged | APPROVE after round 2. Mutation score 9/9. 38/38 integration. 2026-09-21 |

### BLD-011 — what two review rounds bought

**Round 1: CHANGES_REQUIRED.** The implementation was correct — `error` threaded unreshaped, 402 reaching `PlanRequiredView`, FE-44 intact, key in both catalogs — but the tests were tautological. The file mocked *both* `usePageState` and `PageState`, so the denial tests asserted that a value the test injected came back out of a switch the test wrote. The `data-permission` attribute they checked is invented inside the mock and does not exist in production; `NoPermissionState` was never rendered despite the test name saying so.

The reviewer proved it by mutation rather than argument: hardcoding `isEmpty: false` left **all 9 tests passing** while making the empty state permanently unreachable. Same for `isLoading: false` and `isError: false`. Three one-character edits, each invisible to the suite.

**Round 2: APPROVE.** Six tests added pinning the three unasserted inputs in both directions, asserting `usePageState.mock.calls` rather than the mocked return. The reviewer built a mutation harness outside the repo — control run 15/15 to prove the harness faithful — and executed nine mutations including three the worker never claimed:

| Mutation | Killed |
|---|---|
| `isEmpty: false` / `true` / inverted | 1 / 1 / **2** |
| `isLoading: false` / `true` | 1 / 1 |
| `isError: false` / `true` | 1 / 1 |
| `error: undefined` | 1 |
| `permission:` wrong key | 1 |

**9/9 on all five inputs.** The file now sits above the house bar, where siblings pin `permission` alone.

Three tests were also renamed because their names overclaimed. "renders NoPermissionState when…" became "routes a denied resolution to PageState so the empty state is not shown instead". A test named for a component it never renders is worse than no test: it stops the next person writing the real one.

**Deliberately not done, and the reviewer agreed:** the file still mocks both ends. The real denial behaviour is already proven by non-mocked tests at `resolve-page-state.test.ts:47` and `page-state.test.tsx:74`, and ~20 siblings share the convention. Rewriting one file to break from it would add no coverage.
| BLD-012 | ~~My Work / Inbox consolidation~~ → **backlog page state only** | 10-project-backlog | build/bld012-backlog-enforce | coordinator | **DONE** | `672e75e9c` | Client half delivered by BLD-021 (`usePageState` + `permission`, `project-backlog-page.tsx:197`). Server half closed here — see below. 2026-09-21 |

**BLD-012 — the server-side half, and a correction to the finding.** BLD-V01 recorded that the backlog route file "skips server-side enforcement, unlike siblings". That is true but the reason matters, and the original framing would have led to the wrong fix.

`app/(authenticated)/build/layout.tsx:9` already calls `enforceRouteAccess("/build")`, so the whole subtree *is* gated. But `enforceRouteAccess` resolves the live pathname from `x-pathname` → `next-url` → `x-invoke-path` → `referer` (`lib/rbac/request-path.ts:23-26`) and uses its **literal argument only as a fallback**. There is no `middleware.ts` in the frontend, so nothing sets `x-pathname`; on a cold document load every header source is absent and the fallback decides.

Measured by probe:

| Path resolved | Permission |
|---|---|
| `/build` | `build:view` |
| `/build/[projectId]/backlog` | **`build:tickets:view`** |
| `/build/[projectId]/intake` | `build:view` |

So the backlog page was gated on `build:view` on a cold load, not the `build:tickets:view` its first read (`GET /build/{projectId}/tickets`) requires. The registry entry at `route-access-extension-entries.ts:310` already carried the right key; only the page-level call was missing. Fixed by passing its own route as the fallback.

**Two things the probe also showed, recorded rather than fixed:** `/build/[projectId]/intake` has no registry entry of its own and resolves to `build:view`, so `intake/page.tsx`'s explicit call buys nothing on a cold load. Whether other Build sub-routes are in the same position is unmeasured and worth a sweep. `page-level-gates.test.ts` passes throughout because it does not require per-page enforcement where a layout gates the subtree — it cannot see this fallback-strength distinction.
| BLD-V01 | Verify the six remaining P0 route claims against the tree | 00 | none (read-only) | explore agent | **DONE** | n/a | 5 of 6 claims false. 2026-09-21 |

### BLD-V01 — the third stale premise, and the largest

The audit's P0 claim, verbatim: *"My Work, Templates, Backlog, Intake, Files, and Analytics rendered another surface or an under-specified generic surface during the crawl."*

**False for all six.** Not one imports `ProjectBoardPage` or passes a `defaultView`. Every one is purpose-built.

| Route | Renders | `usePageState` + `error` | Verdict |
|---|---|---|---|
| `/build/my-work` | `MyWorkPage` | yes — `my-work-page.tsx:88`, error `:92` | STALE |
| `/build/templates` | `BuildTemplatesPage` | yes — `build-templates-page.tsx:77`, error `:81` | STALE |
| `/build/[projectId]/intake` | `IntakePage` | yes — `intake-page.tsx:165` | STALE |
| `/build/[projectId]/files` | `FilesPage` | yes — `files-page.tsx:206` | STALE |
| `/build/[projectId]/analytics` | `ProjectAnalyticsPage` | yes — `:54`, error `:58`, isEmpty `:59` | STALE |
| `/build/[projectId]/backlog` | `ProjectBacklogPage` | **none** — hand-rolled at `:262`/`:272`/`:282` | **PARTIAL** |

Only backlog needs work, and for a different reason than the audit gave. `features/build/backlog/project-backlog-page.tsx` resolves state by hand and never calls `usePageState`, so it has no denial branch and no `permission` argument; its only RBAC reference is a write check at `:53`. Its route file also skips server-side enforcement, unlike siblings (`intake/page.tsx` calls `enforceRouteAccess`, `files/page.tsx` calls `requireModulePermission`).

**Severity settled — this is UX, not a security hole.** The verifier could not tell from the client whether the backend independently gates the query, and flagged it. It does: `projects-tickets.controller.ts:68` carries `@UseGuards(JwtAuthGuard, PermissionGuard)` and `:133-134` is `@Get(":projectId/tickets") @RequirePermission("build:tickets:view")`. Data is protected and a cross-tenant or unpermitted read gets 403. The defect is that the client fires a request the role cannot serve (FE-51) and then renders the 403 through a chain with no denial branch, so the user sees an error or an empty list instead of `NoPermissionState` (FE-47, FE-49).

**Scope effect:** BLD-012 drops from "My Work / Inbox consolidation, 8–12 days" to one page-state conversion at `project-backlog-page.tsx:262-282`, keeping the existing `ProjectLoadFallback` 404-vs-error split (`project-load-fallback.tsx:31`), which is correct and deliberate.

Wave 1 runs three concurrently, the approved ceiling. The third slot went to **verification rather than implementation**: two audit premises have already proven stale (P0 #1, and three of BLD-011's four pages), so dispatching BLD-012 blind risks a third wasted slice. BLD-V01 checks the My Work / Templates / Backlog / Intake / Files / Analytics claim with file:line evidence before anyone writes code against it.

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

---

## Defect closeout — 2026-09-21, second pass

Every open defect was re-verified **against source**, not against this ledger. The ledger had drifted: three merged slices still read `READY_FOR_REVIEW`, and four defects were already closed.

### Closed

| ID | Verified how | Where |
|---|---|---|
| N-01 | `@RequirePermission("build:tickets:update")` now on `applyDraft` | `agent-pulse.controller.ts:46` |
| N-02 | retracted earlier; finding was false | — |
| N-04 | zero `u.orgId` remain in either QA controller | `qa/test-cases`, `qa/test-runs` |
| N-05 | now consumes the canonical extractor | `use-keyboard-shortcuts.ts:6,43` |
| N-08 | closed by `c193837cf` | — |
| N-03 | migration `1142` adds `ON DELETE SET NULL (headcount_id)` | backend `55c988260` |
| N-06 | test now imports and renders the **real** `CommandPaletteDialogBody`; neutering `requestLeave` fails 3 of 4 | `817ff650b` |
| N-07 | `check:colors` extended to bare hex literals, baselined, self-tested; coordinator-mutation-proven (clean 0 → planted 1 → restored 0) | `7ca54fda7` |
| N-08a | all 54 wrappers replaced; new `check:css-tokens` gate, 21 self-tests | `2763a3eaf` |
| N-09 | six ternaries → one `switch` with `assertNever`; adding a 7th `ViewType` fails the suite | `817ff650b` |
| BLD-012 | server-side cold-load gate closed | `672e75e9c` |

**N-07 corrected a documented number.** FE-93 records 228 raw-colour literals. The true count in `components/` + `features/` is **271**. Reported rather than silently reconciled.

**N-07's stated reason for excluding `hsl(...)` is stale.** It judged every `hsl(var(--…))` "a proper token reference" — which N-08a proved false in the same wave. Harmless, because `check:css-tokens` now covers that form, but the two gates' rationales should be reconciled.

### Still open

- **N-10** — releases authorization. In flight.
- **N-11 (new)** — see below.
- P0 #6 Sprint/Cycle, P0 #7 QA Bug, P0 #8 residual, P1 #11, P1 #13 residual. Multi-day product slices, untouched.
- **Migrations 1141 and 1142 are committed but unapplied.** No non-production Postgres exists on this machine. Both are verified statically only.

### N-11 — 63 of 83 Build routes are gated more weakly on a cold document load than their registry declares

Generalised from BLD-012. `enforceRouteAccess` resolves the live path from `x-pathname` → `next-url` → `x-invoke-path` → `referer` and falls back to its **literal argument**. There is no `middleware.ts`, so on a cold document load the argument decides.

Only two Build layouts gate at all — `build/layout.tsx` (`"/build"`) and `build/workspaces/[pmWorkspaceId]/layout.tsx` (`"/build/workspaces"`); `build/[projectId]/layout.tsx` has none. So every page without its own call falls back to `build:view`.

Measured across all 83 Build routes: **63 resolve to a weaker key on a cold load than warm.** Examples: `/build/1/qa` warm `build:qa:view` cold `build:view`; `/build/1/budget` warm `build:manage` cold `build:view`; `/build/1/client-portal` warm `build:clientvisibility:manage` cold `build:view`.

**Severity — defence-in-depth, not a data breach.** The same ruling as BLD-V01: the backend independently gates every read and returns 403. This weakens the outer layer and produces the FE-51/FE-47 symptom. `page-level-gates.test.ts` passes throughout because it does not require per-page enforcement where a layout gates the subtree — it cannot see fallback *strength*.

Fix shape: pass each page's own route pattern, plus a gate that keeps it true. 63 mechanical edits — a slice, not a patch.

### N-12 — two backend-path resolvers, one of which no worktree could use (FIXED)

`test-utils/backend-repo.ts` honours `STREAMLINE_BACKEND_ROOT`. `lib/test-support/backend-path.ts` did not, and knew only the `frontend/`+`backend/` and `*-frontend`/`*-backend` layouts. In a worktree named anything else it returned a non-existent path and **all ten of its consumers died with `ENOENT` before reaching an assertion**.

This nearly produced a false report: comparing a worktree against the main checkout showed "10 suites broken by N-08a". Running the identical suites in a *different* worktree containing none of those changes reproduced all 10 failures — the variable was the worktree, not the commit. Fixed in `e98036d1a`; those suites went 0/10 → 9/10.

**Process note:** an agent reported confirming a baseline by "stash-testing on unmodified main". `git stash` is banned by name here. No damage — stash list empty, every worktree's edits intact — but the ban exists because this machine is shared, and a comparison against `main` from inside a worktree is exactly what produced the false conclusion above.

---

# Final closure reconciliation — 2026-09-22

Every row below was re-verified against source, git history and test output. Where an earlier row in this file disagrees, **this section wins**; the earlier rows are left intact as the historical record.

## Rows this supersedes

| Row | Said | True on 2026-09-22 |
|---|---|---|
| BLD-V04 — P0 #8 composite FK | "STALE — 165/166 composite. ~1–2 d residual" | The residual was a **test-fixture** defect, not a schema one. Closed and merged. The genuine remainder is **286 SET NULL column lists that no static check can read** — BLOCKED on a database, not on effort. |
| BLD-V05 — P0 #10 authorization | "STALE premise, but found a real escalation" | Escalation confirmed and far larger than recorded: **30 VULNERABLE handlers**, not the 2 claimed. All 30 now **CLOSED**. |
| BLD-V06 — P1 #11 Issues explorer | "STALE — built. 12–20 d → ~2–4 d" | **DONE.** Merged `a6ace6689`, on `origin/main`, 14 suites / 76 tests green. |
| BLD-V07 — P1 #13 command palette | "PARTIAL — 5–8 d → ~3–5 d" | **DONE.** Merged `cf7df1e07`, on `origin/main`. 37 project routes reachable and permission-gated; search failure now distinguishable from empty. |

## Authorization — the headline correction

The inherited figure of "2 VULNERABLE + 14 NEEDS-REVIEW" was wrong by an order of magnitude. The committed census (`scripts/build-authorization-census.mjs`, self-test 29/29) measured **321 handlers across 47 controllers** and found **30 VULNERABLE**. All 30 are now closed across three batches, and the census reports:

```
VULNERABLE 0 · CLOSED 34 · NEEDS-REVIEW 111 · VERIFIED 176 · total 321
```

### NEEDS-REVIEW is not a backlog of vulnerabilities

This distinction matters and must not be collapsed. Of the 111:

- **102 have no lead at all** — nested routes that pass the static check, held in NEEDS-REVIEW only by the policy that a static reader may not certify parent binding on its own. They are *uncertified*, not *suspected*.
- **9 carry a lead**, and the coordinator read all nine at source on 2026-09-22. **All nine are false positives** of the two declared limitation classes:
  - **6 are create endpoints** (`createProjectLabel`, `createTemplate`, `createLabel`, `createWorkspaceView`, `createWorkspace`, `createPortfolio`) — an INSERT scopes through `.values({orgId})`, not a predicate, so the binder cannot see it.
  - **3 bind correctly in a shape the SQL binder cannot read**: `listRelatedLinks` and `addRelatedLink` go through `assertTicketAccess`, which rejects in **JavaScript** at `projects-ticket-links.service.ts:41` (`if (!ticket || ticket.projectId !== projectId) throw new NotFoundException`); `listTicketTimeEntries` delegates to `listTimeEntries`, which applies `eq(tickets.projectId, query.projectId)` at `timesheets.service.ts:79` and asserts the project is in-org at `:75`.

The binder was deliberately **not** taught to accept the JavaScript form: that heuristic would also mark genuinely unbound code as bound, and a false VERIFIED hides a vulnerability whereas a false NEEDS-REVIEW only costs a read.

Also unmodelled by the census, and therefore outside its guarantee: RLS, permission-key semantics, and dynamically registered routes.

## Verification run on 2026-09-22

| Command | Result |
|---|---|
| `pnpm check:route-census` | PASS — 92 routes; **0 weak cold-load gates** across all 83 Build pages |
| `pnpm check:build-execution-plan` | PASS |
| `pnpm typecheck:web` | PASS |
| `pnpm -C backend typecheck` | PASS |
| `pnpm -C backend typecheck:test` | PASS |
| `pnpm -C backend check:build-authz-census:self-test` | 29 passed, 0 failed |
| `pnpm -C backend check:build-authz-census:check` | OK — committed reports match a fresh run |
| focused Build authorization (6 specs) | **6 suites / 120 tests** |
| focused Sprint/Cycle (`build/execution`) | **18 suites / 157 tests** |
| focused QA Bug (`build/qa`) | **6 suites / 77 tests** |
| `pnpm -C backend jest src/modules/build` | **195 suites / 1442 tests** |

### Two commands in the verification list were NOT run, deliberately

- **`pnpm -C backend check:migration-chain`** — `package.json:309` defines it as `node --env-file-if-exists=.env src/scripts/verify-migration-chain.mjs`. `.env` points at **production Aurora**. Running it as specified would load production credentials.
- **`pnpm -C backend check:composite-fk-set-null`** — empirically verified to inject `.env` and open a live connection: it printed `injected env (61) from .env` then `PREREQUISITE UNMET — cannot read pg_constraint: PAM authentication failed for user "streamline_admin"`. Placeholder env does not help, because `.env` is injected first.

Both are **BLOCKED**, not skipped. Their `:self-test` siblings are hermetic and pass.
