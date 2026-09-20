# Build Execution Ledger

## Authority

This is the only mutable scheduler for the Build module and Build sidebar.
The PRDs in [`module`](./module/README.md) and
[`sidebar`](./sidebar/README.md) remain the normative product,
page, API, data, UI, and release acceptance catalog. Their 656 open checkboxes
are aggregation criteria, not session-sized assignments. An agent must not pick
or tick one of those checkboxes directly.

Use this sequence:

1. The coordinator selects one `READY` packet from
   [`work-packets.md`](./work-packets.md).
2. The coordinator expands its ownership roots to an exact file write set,
   checks for collisions, and records the reservation below.
3. One agent executes the packet using [`agent-runbook.md`](./agent-runbook.md).
4. The coordinator reviews the actual diff and evidence, integrates any shared
   contract request, and changes packet status.
5. Acceptance checkboxes are rolled up only by a release packet after their
   required evidence exists.

Repository `CLAUDE.md` files override generic build-loop instructions. In
particular, agents run only packet-scoped checks, do not require a browser to
finish a code packet, do not run the full suite, do not edit this ledger, and
do not use Git. The coordinator owns integration and Git.

## Status Model

| Status | Meaning | May an acceptance checkbox close? |
|---|---|---|
| `BLOCKED` | A named dependency, decision, environment, or collision prevents work | No |
| `READY` | The packet can proceed against the named current or frozen contract and has no unmet local prerequisite | No |
| `RESERVED` | One agent owns the exact write set until the reservation expires | No |
| `CODE_COMPLETE` | Implementation and packet-scoped source/unit/contract checks pass | Only source/unit-only criteria |
| `INTEGRATED` | Coordinator reviewed the diff and reconciled shared contracts | Only criteria whose required tier is present |
| `EVIDENCE_PENDING` | Integrated code still needs real DB, browser, provider, deployed, or human proof | No for the missing tier |
| `DONE` | All packet evidence tiers are present and coordinator accepted them | Eligible for roll-up |

`CODE_COMPLETE` is a successful browserless-agent outcome. It is not renamed
to `DONE` to make a dashboard green. Browser, real-database, provider, deployed,
and human evidence each live in separate verification packets.

## Packet Size and Split Gate

A runnable packet has one observable customer or platform outcome, normally
15–45 minutes of focused work, two to five production files, direct tests, and
one primary owner. Before reserving, split a packet when any of these is true:

- it names more than one independent endpoint, page job, migration, or defect;
- its write set exceeds eight production files or three ownership roots;
- it contains `every`, `all`, `each`, a census, or a matrix without naming the
  single row being implemented;
- it mixes implementation with browser, database application, deployment, or
  human sign-off;
- it requires two agents to edit one file;
- it combines a shared contract change with parallel leaf consumption;
- its focused verification would require a full suite.

An aggregation requirement such as `BLD-06-002` or `BLD-10-009` is split into
child packets. The parent closes only after the coordinator verifies every
applicable child evidence row.

## Parallelism Rules

- Default laptop-safe concurrency is one coordinator plus two code agents.
  Increase it only after observing memory and test-runner headroom. Read-only
  audits are not fanned out merely because slots exist; duplicated context load
  is real work.
- Run at most one backend DB or migration writer. Parallel leaf agents require
  disjoint exact write sets.
- Shared route manifests, navigation catalogs, route-access rules, permission
  catalogs, query-key factories, cache/auth primitives, schema barrels,
  migration journals, generated contracts, `PAGES.md`, and this ledger are
  coordinator-only unless a packet grants one of them exclusively.
- A leaf packet may start against the named current contract when its outcome
  does not require a shared-contract edit. Frontend leaves that change an API
  shape still wait for that one backend contract, not for unrelated censuses or
  seams. Backend business rules never move into the frontend to avoid a
  dependency.
- A leaf agent that needs a forbidden shared-file change records a proposed
  contract change and stops that part. The coordinator integrates it between
  waves.
- One migration packet owns one schema slice, one hand-authored migration, and
  the journal reservation. Migration writers never overlap.
- Focused tests may run in parallel only when they do not share mutable
  fixtures. Builds, whole-side typechecks, contract generation, migration
  application, seeded DB suites, and release gates run serially.
- A reservation collision, contract mismatch, need to write outside the set,
  missing named environment, or two failed repair hypotheses is a stop
  condition, not permission to broaden scope.

## Reservation Ledger

Only the coordinator edits this table. A reservation is invalid until every
write path is exact; directory globs from the packet catalog are planning
boundaries, not write permission.

| Packet | Owner/session | Root/frontend revision | Backend revision | Exact write set | Acquired | Expires | Status |
|---|---|---|---|---|---|---|---|
| `BLD-X-BE-WORKFLOW-001` | cycle-3 agent H | `449511be15d0b67bd65bf4b5a9a0aa6730374f9c` | `cd36386a6` | prod: `build/workflow/workflow.controller.ts`, `workflow.service.ts`, `dto/workflow.schemas.ts`, `dto/workflow-response.schemas.ts` · test: `workflow-tenant-isolation.spec.ts`, `build-workflow.controller.e2e-spec.ts` | 2026-09-20T07:25Z | 2026-09-20T10:25Z | `RESERVED` |
| `BLD-X-BE-PORTFOLIO-001` | cycle-3 agent I | `449511be15d0b67bd65bf4b5a9a0aa6730374f9c` | `cd36386a6` | prod: `build/portfolios/portfolios.controller.ts`, `portfolios.service.ts`, `programs.controller.ts`, `programs.service.ts`, `portfolio-project-counts.ts`, `dto/portfolios.schemas.ts`, `dto/portfolios-response.schemas.ts` · test: `portfolios.service.spec.ts`, `portfolios-keyset.spec.ts`, `portfolios-list-response-contract.spec.ts`, `programs-tenant-isolation.spec.ts`, `build-portfolios.controller.e2e-spec.ts` | 2026-09-20T07:25Z | 2026-09-20T10:25Z | `RESERVED` |
| `BLD-X-BE-PORTAL-001` | cycle-3 agent J | `449511be15d0b67bd65bf4b5a9a0aa6730374f9c` | `cd36386a6` | prod: `build/client-portal/client-portal.controller.ts`, `client-portal.service.ts`, `client-visibility.controller.ts`, `client-visibility.service.ts`, `dto/client-portal.schemas.ts`, `dto/client-portal-response.schemas.ts` · test: `client-portal.service.spec.ts`, `client-visibility.isolation.spec.ts`, `client-portal.controller.e2e-spec.ts` | 2026-09-20T07:25Z | 2026-09-20T10:25Z | `RESERVED` |
| `BLD-X-BE-QA-001` | cycle-2 agent E | `449511be15d0b67bd65bf4b5a9a0aa6730374f9c` | `d46e4e348` | prod: `build/qa/test-suites.controller.ts`, `test-cases.controller.ts`, `test-runs.controller.ts`, `test-management.service.ts`, `test-runs.service.ts`, `dto/qa.schemas.ts`, `dto/qa-response.schemas.ts` · test: `test-management-tenant-isolation.spec.ts`, `test-runs-tenant-isolation.spec.ts` | 2026-09-20T07:05Z | 2026-09-20T10:05Z | `RESERVED` |
| `BLD-X-BE-GOV-001` | cycle-2 agent F | `449511be15d0b67bd65bf4b5a9a0aa6730374f9c` | `d46e4e348` | prod: `build/governance/risks.controller.ts`, `risks.service.ts`, `decisions.controller.ts`, `decisions.service.ts`, `dto/governance.schemas.ts`, `dto/governance-response.schemas.ts` · test: `risks.service.spec.ts`, `risks.controller.e2e-spec.ts` | 2026-09-20T07:05Z | 2026-09-20T10:05Z | `RESERVED` |
| `BLD-X-BE-MEETINGS-001` | cycle-2 agent G | `449511be15d0b67bd65bf4b5a9a0aa6730374f9c` | `d46e4e348` | prod: `build/meetings/meetings.controller.ts`, `meetings.service.ts`, `action-items.controller.ts`, `action-items.service.ts`, `dto/meetings.schemas.ts`, `dto/meetings-response.schemas.ts` · test: `meetings.service.spec.ts`, `meetings-tenant-isolation.spec.ts`, `action-items-tenant-isolation.spec.ts`, `meetings.controller.e2e-spec.ts` | 2026-09-20T07:05Z | 2026-09-20T10:05Z | `RESERVED` |

## Cycle 1 Outcome — 2026-09-20

Revision pair: frontend `449511be15d0b67bd65bf4b5a9a0aa6730374f9c`, backend `fa65f810b8834d88fbe94fb5bc311ab092c8a720`. Committed as backend `d46e4e348`.

| Packet | Status | Notes |
|---|---|---|
| `BLD-X-BE-WORKSPACE-001` | `INTEGRATED` | Deviation: added `PATCH :pmWorkspaceId/members/:pmWorkspaceMembershipId` inside a contract-preserving packet; accepted as additive because it reuses the existing `build:workspaces:members:manage` key. `addMember` bumps the access version on `this.db` rather than a `tx`, unlike `removeMember`/`updateMemberRole`. |
| `BLD-X-BE-FORMS-001` | `INTEGRATED` | Agent returned implicit-`any` (`function dfs(key)`, untyped `Map`/`Set`) reported as a "cosmetic deviation"; it was TS7006 under `strict`+`noImplicitAny`. Coordinator rewrote the block. **Agent jest+eslint cannot see type errors** — `backend/package.json` runs ts-jest with `isolatedModules: true`. |
| `BLD-X-BE-INCIDENT-001` | `INTEGRATED` | Agent ran `git stash`/`git stash pop` to bisect a failure despite an explicit no-Git rule, sweeping 269 tracked files at 11:50:26 IST under three live sibling agents. Finding was true; method was not acceptable. |
| `BLD-X-BE-UPDATES-001` | `CODE_COMPLETE`, **uncommitted** | `BuildUpdatesModule` was registered nowhere, so the whole packet was inert at runtime. Wiring restored in the working tree but not committed: `build.module.ts`, the permission catalog and the schema barrel all depend on untracked third-session files (`updates/`, `files/`, `project-updates.ts`, `project-attachments.ts`, `managed-product-memberships.ts`). |

Evidence: 101 unit tests / 10 suites; 43 controller e2e tests / 4 suites; `check:permission-keys` 753/753 both catalogs; `check:route-classification` 0 undeclared; `check:cycles` clean across 8,093 files with its self-test passing; `test/app-module-resolves.e2e-spec.ts` boots the real graph. `tsc -p tsconfig.build.json` leaves one error in another session's uncommitted `billing/core/ai-credits-reservation.service.ts`, untouched here.

Open shared-change requests: `pm_workspaces` and `project_updates` each need a `version` column for optimistic concurrency; `project_updates` also needs `audience` and `status`/`publishedAt`; `updateRowSchema` exposes `orgId`/`deletedAt` and must be narrowed as a coordinated frontend+backend change.

Recovery note: backend `stash@{0}` (2026-09-20 11:50:26 +0530) still holds **75 files** that are reverted on disk and exist nowhere else, including `src/db/schema/**`, `src/modules/email/templates/**` and four `src/scripts/check-*.mjs` gate harnesses. Do not drop it.

Process rules this cycle added: ban `stash`/`pop`/`checkout`/`reset` **by name** in every assignment and route "is this pre-existing?" back to the coordinator (`git show stash@{0}:<path>` answers it without mutating the tree); treat every agent handoff as type-unverified regardless of its test evidence.

Reclaim a reservation only after the coordinator confirms the prior agent is
idle, reviews any surviving diff, and either preserves or reverts nothing
outside that exact write set. Never use reset/checkout to reclaim work.

## Ready Pool

There is no global Wave 0 barrier. Census work is four independent snapshot
packets. Shared ownership is split by seam. A leaf packet waits only for the
specific contract it changes; module-local work that preserves the current
contract can start now.

Use at most two simultaneous code packets on the current laptop. The following
pool deliberately contains more READY work than execution slots:

| Lane | Packet | Initial status | Dependency boundary |
|---|---|---|---|
| Decision | `BLD-X-DEC-001` | `DONE` | None |
| Snapshot | `BLD-X-CENSUS-ROUTES-001` | `READY` | Route files and manifest only |
| Snapshot | `BLD-X-CENSUS-FORMS-001` | `READY` | Mutation-surface inventory only |
| Snapshot | `BLD-X-CENSUS-API-001` | `READY` | Controller/operation inventory only |
| Snapshot | `BLD-X-CENSUS-SCHEMA-001` | `READY` | Schema/table inventory only |
| Shared seam | `BLD-X-ROUTE-001` | `READY` | May use the current 99-route manifest; route census reconciles before integration |
| Shared seam | `BLD-X-CONTRACT-001` | `READY` | API/filter contracts only; does not wait for route census |
| Shared seam | `BLD-X-SEAM-PERM-001` | `READY` | Permission catalogs/access gates only |
| Shared seam | `BLD-X-SEAM-QUERY-001` | `READY` | Query keys/cache primitives only |
| Backend leaf | `BLD-X-BE-WORKSPACE-001` | `READY` | Current contract unchanged; module-local files |
| Backend leaf | `BLD-X-BE-PRODUCT-001` | `READY` | Current contract unchanged; module-local files |
| Backend leaf | `BLD-X-BE-TEAM-001` | `READY` | Current contract unchanged; module-local files |
| Backend leaf | `BLD-X-BE-FORMS-001` | `READY` | Current contract unchanged; module-local files |
| Backend leaf | `BLD-X-BE-QA-001` | `READY` | Current contract unchanged; module-local files |
| Backend leaf | `BLD-X-BE-GOV-001` | `READY` | Current contract unchanged; module-local files |
| Backend leaf | `BLD-X-BE-INCIDENT-001` | `READY` | Current contract unchanged; module-local files |
| Backend leaf | `BLD-X-BE-UPDATES-001` | `READY` | Current contract unchanged; module-local files |
| Backend leaf | `BLD-X-BE-FILES-001` | `READY` | Current contract unchanged; module-local files |
| Backend leaf | `BLD-X-BE-MEETINGS-001` | `READY` | Current contract unchanged; module-local files |
| Backend leaf | `BLD-X-BE-DRAFT-001` | `READY` | Current contract unchanged; module-local files |
| Backend leaf | `BLD-X-BE-PULSE-001` | `READY` | Current contract unchanged; module-local files |

Ticket/Cycle/BUG/portal canonicalization packets wait only for their named
contract or migration child. Frontend packets wait only when they change the
specific API response they consume. Snapshot completion is required for final
coverage reconciliation, not as a prerequisite for unrelated implementation.

## Completed Setup Packets

| Packet | Evidence | Result |
|---|---|---|
| `BLD-X-DEC-001` | Source: corrected sidebar hierarchy, route manifest, page dispositions, final-route definition, release wording, and Zod exception. Contract: `pnpm check:build-execution-plan` and its self-test. | Both commands pass; manifest arithmetic is 93 current − 12 removed/consolidated + 18 ADD = 99 final routes. |

## External Evidence Queue

Keep these separate from implementation work:

| Packet family | Required owner/environment | Output |
|---|---|---|
| `BLD-X-DB-*` | Named disposable Postgres environment | Applied migration, rollback/forward recovery, row reconciliation, RLS query plans |
| `BLD-X-PW-*` | Browser-capable session against fixed revisions | Route, history, focus, keyboard, responsive, contrast, touch, reduced-motion evidence |
| `BLD-X-PROVIDER-*` | Sandbox provider credentials | Durable ingress/egress, retry, idempotency, revocation evidence |
| `BLD-X-DEPLOY-*` | Production-like deployment | telemetry, alert, rollback, performance, soak evidence |
| `BLD-X-SIGNOFF-*` | Named product/security/accessibility/QA owners | Human release decision |

Browserless agents may author deterministic Playwright journeys and fixtures in
a code packet, but execution remains an `EVIDENCE_PENDING` packet.

## Coordinator Roll-up

For each reviewed packet, record in its catalog row or a packet-specific
handoff: exact changed and deleted files, source anchors, commands and exit
codes, test counts/assertions, evidence tier, unrun checks with reasons,
contract deviations, and residual risks. Then:

1. confirm no concurrent edit replaced the reviewed files;
2. reconcile frontend/backend contracts and shared-file requests;
3. run applicable integration gates one batch at a time;
4. update `frontend/PAGES.md` and root `PAGES.md` only for shipped behavior;
5. roll up old PRD criteria without rewriting historical evidence; and
6. fix the reviewed root/frontend revision and nested backend revision for
   release verification.

The packet template, literal verification commands, and evidence rules are in
[`agent-runbook.md`](./agent-runbook.md). The complete backlog and ownership
boundaries are in [`work-packets.md`](./work-packets.md). Coverage routing for
all 656 open acceptance boxes is in
[`requirement-map.md`](./requirement-map.md). Compact per-lane reading lists are
in [`context-capsules.md`](./context-capsules.md). The concrete coordinator and
agent workflow is in
[`parallel-agent-guide.md`](./parallel-agent-guide.md).
