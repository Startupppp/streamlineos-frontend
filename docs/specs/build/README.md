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
- Observed 2026-09-21 on the 32 GB laptop: two code agents running focused jest
  left 16.5 GB free, so cycle 14 raised the ceiling to **three code agents plus
  one read-only auditor**. The auditor runs no jest, tsc or build, so it costs
  context rather than memory. The memory hogs are `type-check` (8 GB heap) and
  `next build`; both stay coordinator-only and serial, and never overlap a
  code agent's jest run.
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
| `BLD-X-SB-ACTIONS-001` | cycle-14 agent CA | `e18077a30` | `374afd27a` | prod: none changed · test: `build-quick-create.test.tsx`, `build-more-tools-menu.test.tsx`, `use-build-nav-preferences.test.ts` | 2026-09-21T08:35Z | 2026-09-21T11:35Z | `INTEGRATED (cycle 14)` |
| `BLD-X-FE-QUALITY-001b` | cycle-17 agent FA | `e18077a30` | `374afd27a` | prod: `features/build/incidents/incidents-page.tsx`, `incident-detail-page.tsx`, `sla.ts` · test: `incidents-page.test.tsx`, new `incident-detail-page.test.tsx` | 2026-09-21T13:20Z | 2026-09-21T16:20Z | `INTEGRATED (cycle 17)` |
| `BLD-X-FE-ORG-GOV-001a` | cycle-17 agent FB | `e18077a30` | `374afd27a` | prod: `features/build/goals/goals-page.tsx`, `goal-detail-page.tsx` · test: `goals-page.test.tsx`, `goal-detail-page.test.tsx` | 2026-09-21T13:20Z | 2026-09-21T16:20Z | `INTEGRATED (cycle 17)` |
| `BLD-X-SB-LIFECYCLE-001` | cycle-16 agent EB | `e18077a30` | `374afd27a` | prod: `features/build/navigation/build-scope-recovery.tsx`, `use-build-scope-recovery.ts`, `lib/build/build-scope-fallback.ts` · test: `build-scope-recovery.test.tsx`, new `lib/build/build-scope-fallback.test.ts` | 2026-09-21T12:55Z | 2026-09-21T15:55Z | `INTEGRATED (cycle 16)` |
| `BLD-X-FE-QUALITY-001a-ii` | cycle-16 agent EC | `e18077a30` | `374afd27a` | prod: `features/build/governance/risk-form-sheet.tsx`, `decision-form-sheet.tsx`, `types/projects/governance.ts` · test: new `governance-clear-optional-field.test.tsx` | 2026-09-21T12:55Z | 2026-09-21T15:55Z | `INTEGRATED (cycle 16)` |
| `BLD-X-FE-QUALITY-001a-i` | cycle-16 agent EA | `e18077a30` | `374afd27a` | prod: `features/build/governance/risks-page.tsx`, `hooks/api/build/governance-schema.ts` · test: new `risks-page-aggregates.test.tsx`, new `governance-contract.test.ts` | 2026-09-21T12:40Z | 2026-09-21T15:40Z | `INTEGRATED (cycle 16)` |
| `BLD-X-SB-NAV-001` | cycle-15 agent DB | `e18077a30` | `374afd27a` | prod: `lib/build/build-scope.ts`, `features/build/navigation/use-reconciled-build-scopes.ts`, `use-build-scope-directory.ts`, `lib/build/nav/build-project-catalog.ts` · test: `lib/build/build-scope.test.ts`, `build-project-catalog.test.ts` | 2026-09-21T12:25Z | 2026-09-21T15:25Z | `INTEGRATED (cycle 15)` |
| `BLD-X-SB-CAPABILITY-001` | cycle-15 agent DA | `e18077a30` | `374afd27a` | prod: `features/build/navigation/use-build-nav-model.ts` · test: `use-build-nav-model.test.tsx`, new `lib/build/build-nav-catalog-route-files.test.ts` | 2026-09-21T12:10Z | 2026-09-21T15:10Z | `INTEGRATED (cycle 15)` |
| `BLD-X-FE-ALLWORK-001` | cycle-14 agent CB | `e18077a30` | `374afd27a` | prod: `all-work-page.tsx`, `use-all-work-filters.ts`, `all-work-board-section.tsx`, `all-work-list-section.tsx` · test: `all-work-access-gate.test.tsx`, new `all-work-filters.test.ts` | 2026-09-21T08:35Z | 2026-09-21T11:35Z | `INTEGRATED (cycle 14)` |
| `BLD-X-FE-INBOX-001` | cycle-14 agent CC | `e18077a30` | `374afd27a` | prod: `features/build/inbox/inbox-page.tsx`, `inbox-list.tsx`, `inbox-notification-item.tsx`, `inbox-preview-pane.tsx`, `inbox-render-window.ts`, `inbox-ticket-preview.tsx`, `parse-inbox-ticket-link.ts` · test: `inbox-badge-invalidation.test.ts`, `inbox-list-bounded.test.tsx`, `inbox-notification-item.test.tsx`, `parse-inbox-ticket-link.test.ts`, new `inbox-page.test.tsx` | 2026-09-21T08:55Z | 2026-09-21T11:55Z | `RESERVED` |
| `BLD-X-SB-SIGNALS-001` | cycle-13 agent BA | `400e17647` | `1e8df44cc` | prod: `features/build/navigation/build-agent-pulse.tsx`, `build-nav-link.tsx`, `hooks/api/build/approvals.ts` (dead `signalBuildInboxInvalidation` + its `storage` listener only) · test: `build-agent-pulse.test.tsx`, `build-inbox-badge-cross-tab.test.tsx`, `build-nav-link-badge-a11y.test.tsx`, `hooks/api/build/approvals-badge.test.ts` | 2026-09-21T06:20Z | 2026-09-21T09:20Z | `INTEGRATED (cycle 13)` |
| `BLD-X-SB-DIR-001` | cycle-13 agent BB | `400e17647` | `1e8df44cc` | prod: `features/build/navigation/build-scope-browser.tsx`, `build-scope-row.tsx`, `build-scope-tree.ts`, `use-build-scope-directory.ts` · test: `build-scope-browser.test.tsx`, `build-scope-row.test.tsx`, `build-scope-tree.test.ts`, `use-build-scope-directory.test.ts` | 2026-09-21T06:20Z | 2026-09-21T09:20Z | `INTEGRATED (cycle 13)` |
| `BLD-X-SEAM-UI-PAGESTATE-001` | cycle-13 coordinator | `400e17647` | `1e8df44cc` | prod: `features/build/templates/build-templates-page.tsx` · test: new `components/shared/page-state-misuse.test.ts` | 2026-09-21T06:20Z | 2026-09-21T09:20Z | `INTEGRATED (cycle 13)` |
| `BLD-X-FE-COLLAB-001a` | cycle-12 agent AA | `e24231ac4` | `1e8df44cc` | prod: `features/build/files/files-page.tsx`, `features/build/meetings/meetings-list-page.tsx`, `features/build/meetings/meeting-detail-page.tsx` · test: `files/files-page.test.tsx`, new `meetings/meetings-list-page.test.tsx`, new `meetings/meeting-detail-page.test.tsx` | 2026-09-20T18:05Z | 2026-09-20T21:05Z | `INTEGRATED (cycle 12)` |
| `BLD-X-FE-COMMAND-001` | cycle-12 agent AB | `e24231ac4` | `1e8df44cc` | prod: `features/build/command-center/command-center-page.tsx`, `command-center-my-issues-panel.tsx`, `command-center-projects-panel.tsx`, `command-center-rows.tsx`, `command-center-utils.ts`, `command-center-jump-links.tsx` · test: `command-center-projects-stat.test.ts`, new `command-center-page.test.tsx` | 2026-09-20T18:05Z | 2026-09-20T21:05Z | `INTEGRATED (cycle 12)` |
| `BLD-X-FE-FORM-001` | cycle-12 agent AC | `e24231ac4` | `1e8df44cc` | prod: `features/build/pm-workspaces/pm-workspace-form-sheet.tsx`, new `features/build/pm-workspaces/pm-workspace-form-schema.ts` · test: new `pm-workspaces/pm-workspace-form-sheet.test.tsx` | 2026-09-20T18:05Z | 2026-09-20T21:05Z | `INTEGRATED (cycle 12)` |
| `BLD-X-FE-INTAKE-001` | cycle-12 agent AD | `e24231ac4` | `1e8df44cc` | prod: `features/build/forms/forms-list-page.tsx`, `features/build/forms/form-detail-page.tsx`, `features/build/forms/components/form-submissions-tab.tsx`, `features/build/triage/triage-page.tsx` · test: new `forms/forms-list-page.test.tsx`, new `triage/triage-page.test.tsx` | 2026-09-20T18:05Z | 2026-09-20T21:05Z | `INTEGRATED (cycle 12)` |
| `BLD-X-FE-PORTAL-001` | cycle-12 agent AE | `e24231ac4` | `1e8df44cc` | prod: `features/build/client-portal/portal-dashboard-page.tsx`, `portal-list-page.tsx`, `client-visibility-page.tsx`, `features/portal-access/client-access-page.tsx` · test: `client-portal/portal-separation.test.tsx`, new `client-portal/portal-list-page.test.tsx`, new `portal-access/client-access-page.test.tsx` | 2026-09-20T18:05Z | 2026-09-20T21:05Z | `INTEGRATED (cycle 12)` |
| `BLD-X-BE-SUBMISSIONS-001` | cycle-6 agent R | `1b311a280` | `f1915defd` | prod: `build/forms/submissions.controller.ts`, `submissions.service.ts`, `dto/forms.schemas.ts` (submission exports only), `dto/forms-response.schemas.ts` (submission exports only) · test: `submissions.service.spec.ts`, `submissions-tenant-isolation.spec.ts`, new `forms/*.spec.ts` | 2026-09-20T14:10Z | 2026-09-20T17:10Z | `RESOLVED (cycle 6)` |
| `BLD-X-BE-BUG-001` | cycle-6 agent S | `1b311a280` | `f1915defd` | prod: `build/qa/bugs.controller.ts`, `bugs.service.ts`, `dto/bugs.schemas.ts` · test: `bugs.service.spec.ts`, `bugs.controller.e2e-spec.ts`, new `qa/*.spec.ts` | 2026-09-20T14:10Z | 2026-09-20T17:10Z | `INTEGRATED (cycle 6)` |
| `BLD-X-BE-CHANGE-001` | cycle-6 agent T | `1b311a280` | `f1915defd` | prod: `build/client-portal/change-requests.controller.ts`, `change-requests.service.ts`, `dto/change-requests.schemas.ts`, `dto/change-requests-response.schemas.ts` · test: `change-requests.isolation.spec.ts`, new `client-portal/change-*.spec.ts` | 2026-09-20T14:10Z | 2026-09-20T17:10Z | `INTEGRATED (cycle 6)` |
| `BLD-X-BE-TIMESHEET-001` | cycle-6 agent U | `1b311a280` | `f1915defd` | prod: `build/execution/timesheets.controller.ts`, `timesheets.service.ts`, `timesheets-pagination.ts`, `timesheets-scope.ts`, `dto/timesheets.schemas.ts`, `dto/timesheets-response.schemas.ts` · test: `timesheets-cursor.spec.ts`, `timesheet-self-approval.spec.ts`, `timesheets-scope.spec.ts`, `timesheets-scope.e2e-spec.ts`, `timesheets-tenant-isolation.spec.ts`, new `execution/timesheet*.spec.ts` | 2026-09-20T14:10Z | 2026-09-20T17:10Z | `INTEGRATED (cycle 6)` |
| `BLD-X-BE-WHITEBOARD-001` | cycle-6 agent V | `1b311a280` | `f1915defd` | prod: `build/execution/whiteboards.service.ts`, `whiteboard-access.ts`, `whiteboard-board-helpers.ts`, `whiteboard-sharing.controller.ts`, `whiteboard-sharing.service.ts` · test: `whiteboard-access.spec.ts`, `whiteboard-sharing.service.spec.ts`, `whiteboard-sharing-tenant-isolation.spec.ts`, `whiteboards-tenant-isolation.spec.ts`, new `execution/whiteboard*.spec.ts` | 2026-09-20T14:10Z | 2026-09-20T17:10Z | `INTEGRATED (cycle 6)` |
| `BLD-X-BE-APPROVAL-001` | cycle-5 agent N | `449511be15d0b67bd65bf4b5a9a0aa6730374f9c` | `bbf4fd71d` | prod: `build/approvals/approvals.controller.ts`, `approvals.service.ts`, `approvals-read.service.ts`, `approval-lookup.ts`, `build-approvals-inbox.service.ts`, `build-inbox-count.service.ts`, `dto/approvals.schemas.ts`, `dto/approvals-response.schemas.ts` · test: `approvals.service.spec.ts`, `approvals.controller.e2e-spec.ts`, `build-approvals-inbox.isolation.spec.ts`, `build-inbox-count.spec.ts` | 2026-09-20T10:05Z | 2026-09-20T13:05Z | `INTEGRATED` |
| `BLD-X-BE-DRAFT-001` | cycle-5 agent O | `449511be15d0b67bd65bf4b5a9a0aa6730374f9c` | `bbf4fd71d` | prod: `build/comment-drafts/comment-drafts.controller.ts`, `comment-drafts.service.ts`, `comment-draft-generator.service.ts`, `comment-drafts.constants.ts`, `dto/comment-drafts.schemas.ts`, `dto/comment-drafts-response.schemas.ts` · test: `comment-drafts.isolation.spec.ts`, `comment-draft-generator.service.spec.ts`, `comment-drafts.controller.e2e-spec.ts` | 2026-09-20T10:05Z | 2026-09-20T13:05Z | `INTEGRATED` |
| `BLD-X-BE-FILES-001` | cycle-5 agent P | `449511be15d0b67bd65bf4b5a9a0aa6730374f9c` | `bbf4fd71d` | prod: `build/files/files.controller.ts`, `files.service.ts`, `dto/files.schemas.ts`, `dto/files-response.schemas.ts` · test: `files.service.spec.ts`, `files.controller.e2e-spec.ts` | 2026-09-20T10:05Z | 2026-09-20T13:05Z | `INTEGRATED` |
| `BLD-X-BE-SCOPE-DIR-001` | cycle-5 agent Q | `449511be15d0b67bd65bf4b5a9a0aa6730374f9c` | `bbf4fd71d` | prod: `build/scope-directory/scope-directory.controller.ts`, `scope-directory.service.ts`, `dto/scope-directory.schemas.ts` · test: `scope-directory.service.spec.ts`, `scope-directory-membership-gate.spec.ts`, `__tests__/scope-directory-spec-helpers.ts` | 2026-09-20T10:05Z | 2026-09-20T13:05Z | `EVIDENCE_PENDING` |
| `BLD-X-BE-PRODUCT-001` | cycle-4 agent K | `449511be15d0b67bd65bf4b5a9a0aa6730374f9c` | `d27f57cc3` | prod: `build/managed-products/managed-products.controller.ts`, `managed-products.service.ts`, `dto/managed-products.schemas.ts`, `dto/managed-products-response.schemas.ts` · test: `managed-products.service.spec.ts`, `managed-products-keyset.spec.ts`, `managed-products-workspace-membership.spec.ts`, `managed-products.controller.e2e-spec.ts`, `managed-products-insights.e2e-spec.ts` | 2026-09-20T09:10Z | 2026-09-20T12:10Z | `INTEGRATED (cycle 4)` |
| `BLD-X-BE-TEAM-001` | cycle-4 agent L | `449511be15d0b67bd65bf4b5a9a0aa6730374f9c` | `d27f57cc3` | prod: `build/teams/teams.controller.ts`, `teams.service.ts`, `team-members.service.ts`, `team-projects.service.ts`, `dto/teams.schemas.ts`, `dto/teams-response.schemas.ts` · test: `teams-tenant-isolation.spec.ts`, `teams-keyset.spec.ts`, `team-members.isolation.spec.ts`, `team-projects.isolation.spec.ts`, `team-members-keyset.spec.ts`, `teams-workspace-membership.spec.ts` | 2026-09-20T09:10Z | 2026-09-20T12:10Z | `INTEGRATED (cycle 4)` |
| `BLD-X-BE-PULSE-001` | cycle-4 agent M | `449511be15d0b67bd65bf4b5a9a0aa6730374f9c` | `d27f57cc3` | prod: `build/agent-pulse/agent-pulse.controller.ts`, `agent-pulse.service.ts`, `dto/agent-pulse.schema.ts` · test: `agent-pulse.service.spec.ts` | 2026-09-20T09:10Z | 2026-09-20T12:10Z | `INTEGRATED (cycle 4)` |
| `BLD-X-BE-WORKFLOW-001` | cycle-3 agent H | `449511be15d0b67bd65bf4b5a9a0aa6730374f9c` | `cd36386a6` | prod: `build/workflow/workflow.controller.ts`, `workflow.service.ts`, `dto/workflow.schemas.ts`, `dto/workflow-response.schemas.ts` · test: `workflow-tenant-isolation.spec.ts`, `build-workflow.controller.e2e-spec.ts` | 2026-09-20T07:25Z | 2026-09-20T10:25Z | `INTEGRATED (cycle 3)` |
| `BLD-X-BE-PORTFOLIO-001` | cycle-3 agent I | `449511be15d0b67bd65bf4b5a9a0aa6730374f9c` | `cd36386a6` | prod: `build/portfolios/portfolios.controller.ts`, `portfolios.service.ts`, `programs.controller.ts`, `programs.service.ts`, `portfolio-project-counts.ts`, `dto/portfolios.schemas.ts`, `dto/portfolios-response.schemas.ts` · test: `portfolios.service.spec.ts`, `portfolios-keyset.spec.ts`, `portfolios-list-response-contract.spec.ts`, `programs-tenant-isolation.spec.ts`, `build-portfolios.controller.e2e-spec.ts` | 2026-09-20T07:25Z | 2026-09-20T10:25Z | `INTEGRATED (cycle 3)` |
| `BLD-X-BE-PORTAL-001` | cycle-3 agent J | `449511be15d0b67bd65bf4b5a9a0aa6730374f9c` | `cd36386a6` | prod: `build/client-portal/client-portal.controller.ts`, `client-portal.service.ts`, `client-visibility.controller.ts`, `client-visibility.service.ts`, `dto/client-portal.schemas.ts`, `dto/client-portal-response.schemas.ts` · test: `client-portal.service.spec.ts`, `client-visibility.isolation.spec.ts`, `client-portal.controller.e2e-spec.ts` | 2026-09-20T07:25Z | 2026-09-20T10:25Z | `INTEGRATED (cycle 3)` |
| `BLD-X-BE-QA-001` | cycle-2 agent E | `449511be15d0b67bd65bf4b5a9a0aa6730374f9c` | `d46e4e348` | prod: `build/qa/test-suites.controller.ts`, `test-cases.controller.ts`, `test-runs.controller.ts`, `test-management.service.ts`, `test-runs.service.ts`, `dto/qa.schemas.ts`, `dto/qa-response.schemas.ts` · test: `test-management-tenant-isolation.spec.ts`, `test-runs-tenant-isolation.spec.ts` | 2026-09-20T07:05Z | 2026-09-20T10:05Z | `INTEGRATED (cycle 2)` |
| `BLD-X-BE-GOV-001` | cycle-2 agent F | `449511be15d0b67bd65bf4b5a9a0aa6730374f9c` | `d46e4e348` | prod: `build/governance/risks.controller.ts`, `risks.service.ts`, `decisions.controller.ts`, `decisions.service.ts`, `dto/governance.schemas.ts`, `dto/governance-response.schemas.ts` · test: `risks.service.spec.ts`, `risks.controller.e2e-spec.ts` | 2026-09-20T07:05Z | 2026-09-20T10:05Z | `INTEGRATED (cycle 2)` |
| `BLD-X-BE-MEETINGS-001` | cycle-2 agent G | `449511be15d0b67bd65bf4b5a9a0aa6730374f9c` | `d46e4e348` | prod: `build/meetings/meetings.controller.ts`, `meetings.service.ts`, `action-items.controller.ts`, `action-items.service.ts`, `dto/meetings.schemas.ts`, `dto/meetings-response.schemas.ts` · test: `meetings.service.spec.ts`, `meetings-tenant-isolation.spec.ts`, `action-items-tenant-isolation.spec.ts`, `meetings.controller.e2e-spec.ts` | 2026-09-20T07:05Z | 2026-09-20T10:05Z | `INTEGRATED (cycle 2)` |

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

## Cycles 2–4 Outcome — 2026-09-20

Frontend revision `449511be15d0b67bd65bf4b5a9a0aa6730374f9c` throughout.

| Cycle | Backend commit | Packets | Status |
|---|---|---|---|
| 2 | `cd36386a6` | `BLD-X-BE-QA-001`, `BLD-X-BE-GOV-001`, `BLD-X-BE-MEETINGS-001` | `INTEGRATED` |
| 3 | `cccf06090` | `BLD-X-BE-WORKFLOW-001`, `BLD-X-BE-PORTFOLIO-001`, `BLD-X-BE-PORTAL-001` | `INTEGRATED` |
| 4 | `151789113` | `BLD-X-BE-PRODUCT-001`, `BLD-X-BE-TEAM-001`, `BLD-X-BE-PULSE-001` | `INTEGRATED` |

Cycle 4 evidence: 93 unit tests / 11 suites; 15 controller e2e / 2 suites;
`tsc -p tsconfig.build.json` reports zero errors under `modules/build/` (the two
remaining errors are another session's `src/scripts/seed-permissions.ts` and
`src/test/db-spec-crm-fixture.ts`, both clean at HEAD and untouched here).

Defects worth carrying forward:

- **A green `*e2e-spec` proves auth wiring only.** `managed-products-insights`
  returned 500 on every call — its mocked service shape had drifted from
  `managedProductInsightsSchema`, raising a `ResponseContractViolation` — while
  its test passed, because the test asserted only `not.toBe(401)`/`not.toBe(403)`
  and 500 is neither. **139 such assertions across 52 spec files** remain; each
  can hide a live 500. Sweeping them is packet `BLD-X-BE-E2E-STATUS-001`.
- **Agent Pulse trusted stored scope.** Apply-time now re-authorizes against org,
  membership and draft ownership and rejects drafts whose ticket was since
  deleted, rather than replaying the authorization captured when the AI proposed
  the write.
- **A correlated count without `org_id` is a cross-tenant leak.** `teams`
  counted members on `teamId` alone; member add accepted membership of any
  workspace rather than the team's own.
- **A soft-delete check missing from an UPDATE `WHERE` is a TOCTOU**, not a
  cosmetic omission — `managed-products` could overwrite a concurrently deleted
  row.

Convention conflict to settle: specs use `as unknown as Db` **1,810 times across
953 files**. §6 forbids the cast; §12 defers to the established pattern. Agents
hit this contradiction every cycle. It needs one ruling, either a sanctioned
test-double helper or an explicit spec-only exception.

Migration journal note: `migrations/meta/_journal.json` carries an uncommitted
idx 1011 (`1123_ai_action_proposals_rls`) owned by another session. The batched
Build migration packet cannot reserve the journal until that entry lands.

## Cycle 13 — 2026-09-21 — the sidebar signal lane, and a gate agents can actually run

Two packets at bounded concurrency (`BLD-X-SB-SIGNALS-001`, `BLD-X-SB-DIR-001`) plus
one coordinator seam. Both agents reported honestly and neither needed rework — the
first cycle this session where that held.

**`BLD-X-SEAM-UI-PAGESTATE-001` — the root cause of cycle 12's two red packets.**
`frontend/package.json` runs ts-jest with `isolatedModules: true` and eslint is not
type-aware, so a missing required prop is invisible to **every check an agent is
allowed to run**; only the coordinator's 8 GB `type-check` sees it. New gate
`check:page-state-usage` (+ `:self-test`, wired into `frontend.yml`) statically rejects
a self-closing `<PageState />` in under a second. Proven non-vacuous twice: the
self-test plants one violation among three near-miss fixtures (children present, JSX
nested in an attribute expression, a different tag sharing the prefix), and the
detector was run against the pre-fix committed `build-templates-page.tsx`, reporting
the real defect at `:133`. `check:gate-wiring` now reports **41 gates, all invoked by a
reachable run step**.

**Correction to cycle 12's framing:** `loading={null}` is **not** a defect. 29 call
sites use it, including `cycles-page.tsx`, the example `frontend/CLAUDE.md` names. It
is the house pattern; sweeping it would churn working code.

- **`SIGNALS` confirmed cycle 10's dead-code lead and handled a tool disagreement
  correctly.** `signalBuildInboxInvalidation`, `BUILD_INBOX_INVALIDATION_KEY` and the
  `storage` listener are deleted. **knip called the symbol *used*** — because the only
  consumer was its own test, and knip counts test files. The agent reported the
  disagreement rather than resolving it silently in either direction. Production
  invalidation is `useNotificationEvents` (`layout-client.tsx:49`) →
  `invalidateNotificationInbox`, whose 3-element `unreadCount()` key prefix-matches the
  badge's 4-element `unreadCount("build")` — which only works because cycle 10 removed
  `exact: true`. The removal is pinned by a test asserting the legacy storage key no
  longer invalidates.
- **`SIGNALS` changed no production code in two of its three owned files** and said so,
  rather than manufacturing work: BSN-03's scope, quiet-at-zero, failure-safe and
  accessible-name criteria were already met.
- **`DIR` found two real defects and refuted three of its four assigned reproductions.**
  Search results rendered `itemRole="treeitem"` inside a `role="listbox"` container, and
  search mode had no load-more control, so a truncated first page read as the whole
  result set. Denied-access gating, filter-empty vs data-empty copy, and cross-org
  `localStorage` scoping were already correct, each with a source anchor.

Verification: typecheck **0 errors attributable to this work**; 46 + 109 tests across 8
suites; `check:feature-cycles` PASS non-vacuous (5,031 resolved imports); denial ratchet
5/5; `check:page-state-usage` green.

**`check:import-direction` is GREEN at 0/0, first time this program** — a concurrent
session moved `build-dirty-state-context` to `components/shared/dirty-state-context`
and repointed all 58 importers, including this session's committed `pm-workspace-form-sheet`.
Verified by source: zero references to the old path or `useRegisterBuildDirtyState` survive.

Two hazards that cost real time and will recur:

- **A deleted file leaves `tsconfig.tsbuildinfo` stale**, and the next `type-check`
  false-passes against it. Delete it before any typecheck that follows another session's
  file move.
- **`rg` without `--glob '!*.tsbuildinfo'` matches the build cache**, returning a 1.7 MB
  line and hiding the real answer.

## Cycle 12 — 2026-09-21 — the last five frontend lanes, and the gate agents could not run

`BLD-X-FE-COLLAB-001a`, `-COMMAND-001`, `-FORM-001`, `-INTAKE-001`, `-PORTAL-001` —
the five packets never dispatched. All five landed in commit `400e17647`, which a
concurrent session created with a broad `git add`; nothing was lost, and that
session also closed the three loose ratchet entries this one deliberately left it.

Denial ratchet **319 → 308**. Eight entries came off here (meetings-list, the four
forms/triage surfaces, the three portal surfaces); the concurrent session removed
change-requests, intake and templates.

**Two of five packets self-reported green while red.** `INTAKE` returned "6/6 tests
pass, ESLint clean" with **four `TS2741`s** in its own files — `<PageState … />`
rendered self-closing, and `children` is required. `PORTAL` reported CODE_COMPLETE
with four real defects. Neither agent was careless: `frontend/package.json` runs
ts-jest with `isolatedModules: true`, and eslint is not type-aware, so **no check an
agent is allowed to run can see a missing prop**. The coordinator's `type-check` is
the only gate that sees it, and it costs 8 GB and several minutes — which is why it
runs once per wave, not once per packet.

That is now fixed rather than described. **`check:page-state-usage`** (+ `:self-test`,
wired into `frontend.yml`, `check:gate-wiring` green at 41 gates) statically rejects a
self-closing `<PageState />` in under a second, so an agent can run it on its own write
set. Proven non-vacuous twice: its self-test plants a violation among three near-miss
fixtures (children present, JSX nested in an attribute expression, a different tag
sharing the prefix), and the detector was run against the pre-fix committed
`build-templates-page.tsx`, where it reported the real defect at `:133`.

**Four of five agents produced a broken `PageState` call from one brief — in three
different ways, and the differences mattered.** A guard excluding `ready`+`empty`+`loading`
makes `{null}` children unreachable and is safe (COLLAB, portal-list, templates).
A guard excluding only `ready`+`loading` renders a **blank page** on `empty`
(COMMAND, PORTAL — both fixed). Omitting children entirely is a red build (INTAKE,
templates). Blanket-fixing all four would have churned working code; only the second
shape is a live bug. Note `loading={null}` itself is **not** a defect — 29 call sites
use it, including `cycles-page.tsx`, which `frontend/CLAUDE.md` names as the canonical
example. It is the house pattern.

Findings worth carrying:

- **`BLD-X-FE-FORM-001` refuted its own premise correctly.** `pm_workspaces.status` is
  `text` + a CHECK constraint, not a pgEnum, so the frontend `z.enum` matched; the agent
  reported "already correct" rather than inventing a defect. It also kept
  `useRegisterBuildDirtyState` while adding `useUnsavedChangesGuard` — dropping it would
  have passed every test and silently broken sidebar scope-switch interception.
- **`PORTAL` introduced a regression while fixing AP-10**: hoisting `useRevokeGrant` to
  page level forced `useRevokeGrant(revokeTarget?.projectClientGrantId ?? "")`, a sentinel
  that would POST `/portal-access/grants//revoke`, prevented only by an `open={!!target}`
  guard. Fixed by mounting a target-scoped component that owns the hook with a real id.
- **`PORTAL` also dropped one branch of an OR**: `isError = isErrorOverview || isErrorCrs`
  while passing only `overviewError`, so a 402 from the change-requests query alone was
  unclassifiable — the exact bug the packet existed to remove, on the other branch.
- `portal-separation.test.tsx` contained an assertion that *encoded* the bug
  (`getByText(/No projects/i)` for a denied user). Strengthened, and disclosed.
- **Intake→forms/triage parity gaps (D08 cutover blocker, none blocking this cycle):**
  accept-with-assignment and decline-with-reason belong to Triage, which currently flips
  to `IN_PROGRESS`/`CANCELLED` with no metadata; per-form public URL belongs to Forms;
  duplicate-marking and the Pending/Accepted/Declined tabs need confirming against
  backlog/board before being rebuilt.
- `ApiError` is defined in `lib/api-envelope.ts` and re-exported from `lib/api-client.ts:383`,
  while `frontend/CLAUDE.md` §4 and §15 both name `api-client.ts` as owner. Two import paths
  for one symbol (§4 drift). Not fixed; outside every reserved write set.

## Cycle 11 — 2026-09-20 — a whole defect class, and one gate becomes one

Packets `BLD-X-FE-PRODUCT-001`, `-WORKSPACE-001`, `-TICKET-001`, `-DELIVERY-001`
plus the four pages cycle 9 had already repaired. Commits `3e5cdb720`,
`164ebe551`, `f1093f6f3`, and — see below — part of `4263ed551`.

**A 402 was rendering as "Something went wrong" on at least fourteen pages.**
`ModuleGuard` (`common/rbac/module.guard.ts:37`) and `PermissionGuard`
(`modules/access/permission.guard.ts:59`) both throw `ModuleDisabledException`
(`common/http/api-exceptions.ts:42`): HTTP **402**, `code:
"MODULE_NOT_ENABLED"`, `details: { moduleKey, reason, upgradePath }` where
`reason` is `not-in-plan` | `org-disabled` | `user-denied`. **The backend was
already sending the upgrade path.** Every page branching on raw `isError` threw
it away and told a paying customer their software was broken rather than that
their plan did not include it. Verified against backend source, not inferred
from a report.

The fix is one argument: `usePageState({ permission, isLoading, isError,
error })`. Omit `error` and `pageStateFromError` never runs — all 402/403
classification is silently off and the page still compiles and still passes its
tests. That is the trap to watch for in review.

**`resolveGate` is deleted.** It and `resolvePageState` decided the same thing
in the same order; the second also classifies errors and module availability, so
every page written against the first had the 402 bug **by construction**. The
denial ratchet's own docstring had named `<PageState resolution={usePageState(...)}>`
as the canonical fix since 2026-08-27 — cycle 9 grew the minority pattern
instead, twelve consumers to the canonical thirty-eight. The three ordering
assertions `gate.test.ts` alone held moved to `resolve-page-state.test.ts`;
`accessState` and its two tests stay. Swapping the error and empty branches
fails the ported assertion.

Ratchet **340 → 331**. Nine surfaces converted: portfolios, programs,
pm-workspaces, portfolio-detail, cycles, cycle-detail, releases, milestones,
sprints.

**Two agent claims did not survive checking.**

- `BLD-X-FE-WORKSPACE-001` reported `pnpm type-check` clean. **It was failing.**
  `portfolios-page.tsx` called `usePageState` with `isEmpty: displayed.length
  === 0` *above* the `const displayed` it reads — a temporal-dead-zone crash on
  every render. A packet that self-reports a green gate can still be red.
- The same packet reported the frontend `PERMISSIONS` array as "missing 8
  entries". It is a subset **by design**: `catalog-sync.test.ts` asserts array ⊆
  union and union ≡ backend, and deliberately never backend ⊆ array. Ten of ten
  pass. This is the third time it has been raised, once as a CI checker that
  would have failed the build on 195 false positives.

**`BLD-X-FE-DELIVERY-001` introduced the defect the codebase documents against.**
It guarded five pages with `useCan(...)` + `if (!canView) return
<NoPermissionState/>`. `useCan` returns `false` while the access snapshot is in
flight, so that renders "Access Restricted" to a *permitted* user until their
rights arrive — the docstring directly above `useCanState` in `hooks/api/access.ts`
says exactly this. It also skipped the 402 item, which was first in its brief.
All five rewritten onto `usePageState`; their four specs now drive denial from
the access snapshot rather than a stubbed boolean, so the gate decision is no
longer mocked out. `cycles-page.test.tsx` carries the two tests that prove both
halves: the skeleton shows while access is in flight, and a 402 renders a link
to `/settings/billing`.

**A concurrent session committed two of these packets mid-flight.** `4263ed551`
ran a broad `git add` that swept the TICKET and DELIVERY agents' in-progress
edits into it alongside unrelated work, so that packet's history sits under
someone else's message. Nothing was lost. Worse, the same commit added
permission handling to `cycles-page.tsx` with a **second** `import { useCan }`
34 lines below the existing one — `TS2300`, build red at HEAD, fixed in
`164ebe551`. Both sessions were independently doing permission work on the same
five files. **Reserve a file in the indexed lane before editing it.**

Verification: 343 tests / 32 suites across the touched areas, `pnpm type-check`
clean, denial ratchet green at 331. `check:import-direction` remains **red at
HEAD and not from this work** — 3 violations, `components/layout/*` importing
`@/features/build/navigation/build-dirty-state-context` against a baseline of 0.
The honest fix moves that context to a neutral home, but **58 files import it**,
spanning nearly every remaining packet's write set, so it needs a dedicated pass
once the packets land rather than a collision with five live agents.

Two backend findings recorded, not fixed: managed-product search covers `name`
only (`managed-products.service.ts:60`), so searching by product key returns
nothing — and that predicate is a leading-wildcard `ILIKE`, which backend §3
bans outright. The correct fix needs a trigram index and therefore a migration,
which is blocked on a disposable Postgres; patching the frontend alone would
deepen a banned pattern.

## Cycle 10 — 2026-09-20 — three coordinator-owned shared-file fixes

Findings the cycle-9 ALLWORK and INBOX agents surfaced and correctly declined to
fix, because each lives in a file outside any one packet's write set. Commit
`380268681`.

- **Every module's unread badge was stale for five minutes.**
  `invalidateNotificationInbox` passed `exact: true` on
  `notifications.unreadCount()`, a **three**-element key. The Build sidebar badge
  reads `unreadCount("build")`, **four** elements. `exact: true` matches only the
  literal key, never a longer key it merely prefixes — so no inbox action
  (mark-read, mark-all-read, bulk, archive, pin, snooze) ever told the badge it
  was stale. It carries `staleTime: 5 * 60_000` and `refetchOnWindowFocus:
  false`, so it sat wrong until that elapsed. Dropping `exact` fixes every
  module-scoped badge at once; a third test pins that the wider match does not
  reach `notifications.preferences()`.
- **`ticketContext` was stripped from every notification row.** The backend
  declares it required-and-nullable on `notificationListResponseSchema` and
  always emits it; `notificationItemContract` omitted the field, so Zod dropped
  it silently and `inbox-notification-item.tsx:59` fell back to whatever the URL
  yielded — losing priority, status, type and assignee on every row. The
  hand-written `NotificationTicketContext` also declared `status` and `type`
  non-nullable where the backend declares both nullable; the component already
  handled `null`, so only the type was wrong.
- **Bulk "Set Status" could not reach an org's own workflow states.** The menu
  hardcoded `TODO / IN_PROGRESS / IN_REVIEW / DONE`. The contrary claim in the
  ALLWORK report — that an unknown status is *silently applied* — is **false**:
  `build-ticket-batch-workflow.ts:14` throws
  `ProjectsInvalidTicketStatusException`. The real defect is the inverse, and
  worse for the customer: an org on custom states cannot bulk-set any of them.
  All three callers already held the correct list and simply never passed it, so
  `statuses` is a **required** prop — a caller cannot forget it. The fallback to
  the legacy four lived privately inside `TicketFilterBar`; it is now
  `resolveStatusOptions` in `features/build/shared/types.ts`, beside the
  `statusConfig` that defines those four, and both components read it.

Verification: 43 suites / 214 tests across `notifications`, `inbox`,
`ticket-filter-bar`, `bulk-action`, `all-work`, `board-content` and
`action-visibility`. Both shared-file fixes were mutation-checked — reverting
`exact: true` and the `ticketContext` field fails 6 of those 7 new assertions,
the survivor being the one that asserts the *absence* of over-invalidation.
`pnpm type-check` clean. `pnpm type-check:specs` 99 errors, all pre-existing and
none in a touched file. `check:cycles` and `check:feature-cycles` pass.

Two open items this cycle did not take:

- **`check:import-direction` is RED at `HEAD` and not from this work** — 3
  violations, all `components/layout/*` importing
  `@/features/build/navigation/build-dirty-state-context` (baseline 0).
- **The Build inbox cross-tab refresh has never run.**
  `signalBuildInboxInvalidation` (`hooks/api/build/approvals.ts:40`) has no
  production caller — only its own test — so the `storage` listener beside it is
  registered on every Build page and never fires. It is also redundant:
  `useNotificationEvents()` mounts once per tab in
  `app/(authenticated)/layout-client.tsx`, so each tab already invalidates from
  its own stream. Left for the packet that owns `navigation/`, rather than
  deleted from under it.

## Cycle 9 Outcome — 2026-09-20 — the frontend lane opens

Four frontend packets, run two at a time on disjoint write sets. Every agent
finding was re-derived from source before acceptance, and every fix was
mutation-verified by the coordinator, not only by its author.

| Packet | Status | Result |
|---|---|---|
| `BLD-X-FE-MYWORK-001` | `INTEGRATED` | `dueDateFrom`/`dueDateTo` were already in `MY_WORK_FILTER_PARAMS`, so a due-date range rendered an active chip, switched the page to filtered empty-state messaging and armed Clear — while `buildAllWorkFilters` never forwarded either param. **The chip lied; the list stayed unfiltered.** Scope-widening was checked and honestly refuted: all four tabs pin `scope` to `mine`/`created`/`subscribed`, each bound server-side to the JWT `userId`, so `assigneeId` can only narrow |
| `BLD-X-FE-REPORT-001` | `INTEGRATED` | Analytics **denial rendered as emptiness** — `useProjectAnalytics` disables its query without `build:view`, so a denied user got `isLoading:false, isError:false, data:undefined` and read "No analytics yet". Also deleted `reports-schema`'s unimported `analyticsContract`, a second export of a name `workspace-schema` already owns |
| `BLD-X-FE-ORG-PROJECTS-001` | `INTEGRATED` | Three filter defects, one fatal — see below |
| `BLD-X-FE-REPORT-001b` (Budget) | `INTEGRATED` | Same denial-reads-as-data gap: denied users saw ₹0 stat cards and "Not set". Contracts, money-as-cents conversion and all three permission keys verified clean |

**The project directory's Status filter returned 400 for the whole page.** It
offered `PLANNING` and `ON_HOLD`; `project_status` is a pgEnum of
`ACTIVE`/`COMPLETED`/`ARCHIVED` and the list query parses `status` through
`z.enum`, so selecting either failed validation. Worse, `filterStatus` came
straight from `searchParams.get()` unvalidated, so any hand-typed value did the
same — the menu was only one way in. The Health filter was inert **twice
over**: its values (`healthy`/`critical`) are not the ones the service computes
(`on_track`/`at_risk`/`off_track`), and `visibleProjects` never applied
`activeFilters.health` at all. "Order by: Created" had no branch in
`sortProjects` and no `createdAt` on the row, so it silently left the list
unsorted.

The agent fixed Health's values but left `ProjectActiveFilters.status` and
`.health` typed as bare `string` — **which is why the wrong literals compiled**.
Narrowing both to the real unions immediately failed the typecheck at the
producers and exposed the unvalidated URL parameters. They are now parsed with
the idiom already three lines above them (`VIEW_MODES.find(...)`), so an
impossible value cannot compile into the request.

**The denial-reads-as-emptiness pattern is systemic, not incidental.** Four
instances in four pages, all the same shape: a hook gates itself with
`enabled: canX`, and a disabled TanStack Query v5 read reports
`isLoading: false` (disabled ⇒ `isFetching: false` ⇒ `isPending && isFetching`
is false). Any page that branches only on `isLoading`/`isError` therefore shows
its *empty* state to a *denied* user — on `/build` that meant inviting an
unauthorized user to "Create your first project". Fixed with
`useCanState` + `resolveGate` + `NoPermissionState`; treat the hook's own
`enabled` boolean as request suppression only, never as the render gate.

Two defects found in review that no agent reported:

- **`projects-analytics.service.ts` sent SUM aggregates to the client as
  strings.** `sql<number>` is a type annotation, not a coercion: `SUM` over the
  `integer` `storyPoints` column returns `bigint` and `SUM` over the
  `decimal(6,2)` `hours` column returns `numeric`, and postgres-js hands back
  both as strings. `cycleVelocity` and `estimateVsActual` are returned raw and
  the frontend contract types them `z.number()`, so `applyContract` threw for
  any project with a completed cycle or a logged timesheet. The health-score
  maths already wrapped these in `Number()`, so **the server-side arithmetic was
  right while the payload was wrong** — which is why it survived review twice.
  Three sites fixed with `.mapWith(Number)`; the correct idiom was already in
  `projects-velocity-report.ts` in the same module.
- **The frontend did not compile at `HEAD`.** `features/calendar/event-create-form.tsx`
  had an unclosed `<div>` (`TS17008` at 131:16, committed in `2e1661dc0`), so
  every frontend typecheck aborted and no packet could be verified at all.
  Fixing the parse then surfaced a second error the syntax error had masked:
  `useCallback` was referenced but never imported, since line 3 is a
  default-only `import React from "react"`. Nothing in CI builds the frontend
  on the way in, or neither would have landed.

Evidence: frontend `tsc --noEmit` **10 → 7 errors, none in any file this cycle
touched** (the remaining 7 are another session's in-flight `features/hr/**`
work, independently reported by a second agent). Backend
`tsc -p tsconfig.json --noEmit` **111, unchanged**. Project-list 5 suites / 10
tests; analytics 3 suites / 8; my-work 2 suites / 6; budget 4; backend
coercion 4 with a deliberate control case. Commits `5703c266d`, `5ffbc3755`,
`7ad4ecb82`, `3765557b3`, `4e6f93c01`, `afe2e025f`, `02a4a187c`.

A note on testing coercion without a database: the obvious test — grepping the
source for `mapWith` — passes vacuously. The spec instead captures the Drizzle
select object and asserts its decoder maps `"40"` to `40`, with a fourth case
proving an absent decoder leaves the string. Stripping all three calls fails
exactly three of four.

## The Controller E2E Tier Was Writing To Production — 2026-09-20

Found while sizing `BLD-X-BE-E2E-STATUS-001`, whose whole method is *run the spec
and read the real status*.

`jest-e2e.json` sets `setupFiles: ["dotenv/config", …]`, so the tier loads
`backend/.env`. Both `DATABASE_URL` and `APP_DATABASE_URL` there resolve to
`streamlineos-instance-1.c94aokgu6g21.ap-south-1.rds.amazonaws.com:5432/streamlineos`
— **the production instance.** `createE2eApp` (`test/helpers/e2e-app.ts:482`)
then calls `seedOrg`, which INSERTs `organizations.id = 'org_1'`, the user
`org_1__seed_owner` (`org_1@seed.invalid`) and an owner membership.

Measured, not inferred: pointed at an unroutable loopback address, **all 19
`src/modules/build/**` e2e specs fail**, every one of them inside `seedOrg`.
None is fully mocked. So every green e2e figure cited in cycles 1–8 — 43 tests /
4 suites, `bugs.controller.e2e-spec.ts` 34/34, 60 / 3 suites — was obtained by
connecting to and seeding production.

`src/test/jest-e2e-setup.ts` now calls `assertE2eDatabaseApproved`, added to the
existing `src/test/db-spec-guard.ts` so there is one host allowlist rather than
two. It refuses any non-loopback host and names every offending variable without
echoing the password. Verified three ways: it stops a real run against the
ambient `.env`; a loopback target passes the guard and proceeds to the seed; and
CI's `test:e2e:ci` job uses `postgres://ci:ci@127.0.0.1:5432/ci`, so it stays
green. Six spec cases, `tsc -p tsconfig.json --noEmit` still 111 errors with none
in the touched files. Commit `5703c266d`.

Two consequences for scheduling:

- `BLD-X-BE-E2E-STATUS-001` is **`BLOCKED`, not `READY`.** It cannot be executed
  from source alone — an exact status asserted without running the endpoint is a
  guess, and a wrong exact assertion is worse than the weak one it replaces.
- This machine has **no local Postgres and no Docker** (ports 5432/5433/54320 all
  refuse; no service, no binaries). The database tier is genuinely unavailable,
  which blocks this sweep and migration `1128` alike.

**Needs a decision:** whether `org_1` and its seed rows are still present in
production and should be removed. Nothing here queried production to find out.

## Cycle 8 Outcome — 2026-09-20

The last two `build/core/` packets, run as two concurrent agents on disjoint
files. **This closes the Build backend core lane.**

| Packet | Status | Result |
|---|---|---|
| `BLD-X-BE-REPORT-001` | `INTEGRATED` | Three agent findings, two more found in review — see below |
| `BLD-X-BE-BULK-001` | `INTEGRATED` | **No live defect.** The bulk surface is bounded (1–100), authorized through `authorizeTicketMutation`, advisory-locked, and its reads are scoped to `orgId + projectId` with a count check, so a foreign ticket id 404s. Contracts, DTO fields and transition prefetch all check out |

Reporting carried the cycle's real defects, and they are the kind static
checks cannot see — **wrong numbers**:

- `getOrgProjectHealthSummary` joined tickets to cycles with **no
  `deleted_at` filter**, so every soft-deleted ticket inflated org-wide
  completed points. 40 live + 20 deleted points reported as 60.
- `assigneeCompletion` counted only `tickets.assignee_membership_id`, so
  anyone assigned through `ticket_assignees` — the standard multi-assign path,
  honoured by notifications and workload — showed `0 / 0` against real work.
  Now a `UNION` of both sources with `COUNT(DISTINCT ticket_id)`.
- `resourceAllocation` merged the two assignment sources with
  `Math.max(existing, incoming)`. That avoids double-counting the overlap by
  **undercounting everything that does not overlap**: 3 primary-only + 5
  co-assigned in one project reported as **5 open, not 8**. Replaced by the
  same `UNION` + `COUNT(DISTINCT)`, which also dropped a round trip and a join
  edge missing `org_id`. The agent reported this and declined to fix it as
  "a large concurrent change"; the file was already open and it is the same
  defect class as the fix beside it.
- `resourceAllocationItemSchema` declared five all-optional keys
  (`userId`, `name`, `projectId`, `projectName`, `assignedTickets`) that the
  service never emits, and survived only because of `.passthrough()`. Removing
  that passthrough — the obvious cleanup — would have blanked the chart.

**Two agent tests were named for behavior they did not check.** The cycleStats
test claimed to pin "soft-deleted tickets never inflate cycle velocity"; the
soft-delete guard was removed and **the test still passed**, because it only
ever asserted the `org_id` half. The `assigneeCompletion` test named
`ticket_assignees` while asserting only an org parameter. A correct fix under a
test that does not cover it is worse than no test: the defect reads as
protected. Both now assert what their names claim, re-verified by mutation.

The BULK agent's headline "defect" was honestly qualified in its own body and
is **not** one: `validateBatchTransition` passed `rows.length` with all row ids
excluded where it meant `changed.length` with only the changing ids excluded.
Traced through `reserveTicketCapacity`'s SQL, the two are arithmetically
identical — the join counts only tickets already at the target status, so
excluding a changing id subtracts nothing. Kept as a contract correction, not
counted as a customer-visible fix. Its real value was coverage:
`build-ticket-batch-workflow.ts` had **no spec at all**, and the invariants
harness was missing a `sprints` mock, so any test touching `sprintId` would
have died on a `TypeError` instead of reaching the rejection it meant to prove.

Evidence: `tsc -p tsconfig.build.json --noEmit` **exit 0**;
`tsc -p tsconfig.json --noEmit` **111 errors**, none in any file this cycle
touched; `pnpm check:cycles` clean over 8,137 files; analytics 13/13, reports
contract 4/4, bulk packet 29/29 across four suites. Every fix mutation-tested.

## Cycle 7 Outcome — 2026-09-20

Six packets under `build/core/` and `build/execution/`, each holding an
exclusive file reservation; agents wrote fixes and specs, the coordinator
reviewed the diffs and owned every commit. **No finding was accepted from its
report** — each was re-derived from source, and each fix was verified by
reverting it and confirming its test fails. One agent under-reported: it
described a one-line N+1 fix, and the diff also carried an unreported
behavioral change to reported workload.

| Packet | Status | Result |
|---|---|---|
| `BLD-X-BE-PROJECT-DIR-001` | `INTEGRATED` | `getProject`'s team-member join had drifted to a single-column `teamId` predicate, dropping `orgId` — a cross-tenant join edge |
| `BLD-X-BE-PROJECT-WRITE-001` | `INTEGRATED` | `updateProject` answered `403` for a project outside the org, an existence oracle; now `404`. `clientMembershipId: input.clientId ? undefined : undefined` — a **dead write**: client assignment was silently discarded and `200` returned |
| `BLD-X-BE-TICKET-LIST-001` | `INTEGRATED` | `getAllWork` resolved `assigneeId` through a correlated subquery **per row**; replaced by the join already present. `getPersonTicketStats` counted only primary assignees while its own tool description claims exact counts — `ticketAssignees` co-assignees were invisible |
| `BLD-X-BE-TICKET-DETAIL-001` | `INTEGRATED` | `epicRowSchema` omitted `assignee`, so the contract **stripped it from every epic row** and every epic rendered unassigned |
| `BLD-X-BE-TICKET-WRITE-001` | `INTEGRATED` | `beforeAssigneeId` was a hardcoded `null`, so **every** automation and notification saw the ticket as previously unassigned. Ancestry validation ran unserialized — two concurrent reparents could each pass and commit a cycle |
| `BLD-X-BE-ITERATION-001` | `INTEGRATED` | `createCycle` omitted `assertProjectInOrg` (its sibling had it) — a foreign `projectId` reached the `INSERT`. `removeWatcher` deleted with **no tenant predicate and no ownership check** |

Two response contracts described shapes their services never return.
`ticketRelationSchema` served both `addRelation` (a raw row) and
`listRelations` (a projection), fitting neither, and omitted `relationType`,
which the insert always returns; split into two schemas. `gitLinkSchema`
required four fields the projection does not select and named the link column
`repoUrl` where the row carries `url`. Both drift at consumption, not as a
`500`: the interceptor passes the payload through in prod, and the frontend's
`parseApiResponse` fails closed — a blank screen, not an error.

**The params gate went repo-wide with a null result.** `modules/build/**` →
all of `modules/**`: **598 controllers, 1,849 parameterised routes, 0
violations**. The 15 known defects were Build-local; `payroll/runs/:runId`,
`surveys/:surveyId`, `chat/channels/:channelId` and
`hr/recruitment/candidates/:candidateId` nest identically and are clean. Proven
non-vacuous against **real payroll source** — removing `runId` from
`runAndExceptionIdParams` made the gate name both affected routes and exit 1.
Two capability gaps closed: `.extend()`/`.merge()` chains were invisible to it
(feedbucket's `submissionMediaParams` was the live instance), and the
four-regex timesheets exclusion was a pure hole — with it emptied the scan is
still clean, so it hid six routes for nothing. Now wired into CI.

Evidence: `tsc -p tsconfig.build.json --noEmit` **exit 0**;
`tsc -p tsconfig.json --noEmit` **119 errors, down from 125** — the six cleared
were this work's, including two of the coordinator's own regressions from the
cycle-6 public-forms consolidation (a stale constructor arity and a
self-referential mock) that **passed jest the whole time**, since ts-jest's
`isolatedModules` means jest never type-checks. `pnpm check:cycles` clean over
8,135 files. Six new spec files, all mutation-verified.

Two process traps worth pinning. A `String.replace` revert hit the **first**
matching occurrence — an already-correct join — instead of the line under test;
the spec passed and read as vacuous. **A mis-aimed revert and a genuinely
vacuous test produce the identical signal.** Separately, a multi-line revert
written with `\n` silently matched nothing against this repo's CRLF files, and
9/9 passed. Both now require an explicit "did the replace apply?" guard.

Awaiting a decision, not fixed:

- `getTicket` relies on DataScope alone while `deleteTicket`, `updateTicket`
  and the list all require project membership — **a ticket the list hides is
  readable by id.** Tightening it breaks cross-project ticket links.
- `updateEpicSchema` accepts `assigneeId` (a string userId) but the column is
  `assigneeMembershipId` (integer); Drizzle drops the unknown key, returns
  `200`, and the assignee never changes.
- `pnpm check:gate-wiring` was **already exit 1** before this cycle. Four
  package scripts no CI job invokes: `verify:auth-races`,
  `verify:otp-delivery`, `verify:identity-journey`, `check:list-projections`.
  The last passes but cannot resolve 13 endpoints, so wiring it as-is enforces
  less than it appears to.

## Cycle 6 Outcome — 2026-09-20

All five agents were killed when the session's process exited; four had already
written to disk, one (`TIMESHEET`) had written nothing and was redispatched.
No agent returned an evidence report, so every outcome below was derived by the
coordinator from the committed diff, not from an agent's claim.

Their work was swept into `bec45096e` by a third actor (empty `Co-Authored-By`
trailer) under a message naming only submissions. Content verified intact.

| Packet | Status | Result |
|---|---|---|
| `BLD-X-BE-BUG-001` | `INTEGRATED` | `.strict()` `bugIdParams` omitted `projectId` → **400 on every** bug read/update/delete. BOLA on all three (no `assertProjectAccess`). `assigneeId` was written to the `assigneeMembershipId` column — a user id into a membership column |
| `BLD-X-BE-WHITEBOARD-001` | `INTEGRATED` | **Share tokens were stored in plaintext.** Now SHA-256 at rest, lookup by hash, raw token returned once at creation; token removed from a read projection; `isNull(deletedAt)` added to the token lookup |
| `BLD-X-BE-CHANGE-001` | `INTEGRATED` | BOLA on get/update/delete; explicit `ALLOWED_TRANSITIONS` state machine replacing unguarded status writes; keyset cursor |
| `BLD-X-BE-TIMESHEET-001` | `INTEGRATED` | **Fail-open approval.** `canActOnPeriod` gated self-approval on `actor.membershipId !== null`, so an agent-token / system-job / account-only principal skipped the check, was not privileged, and fell through to `allowed: true` whenever no approver was assigned. Fixed at the shared guard — `modules/timesheets` `approvals.service` and `approvals-bulk.service` pass a nullable membership too, so all four call sites were exposed. Also: `isNull(voidedAt)` was missing from every read and from the update/delete/approve/reject `WHERE`; billing-summary moved to `cachedVersioned` with matching `invalidateNamespace`. **`timesheets-scope.e2e-spec.ts` needs `RBAC_E2E_DATABASE_URL` and DID NOT RUN** |
| `BLD-X-GATE-PARAMS-001` | `INTEGRATED` | Eleven more `.strict()` params schemas across nine controllers, plus the gate — see below |
| `BLD-X-BE-SUBMISSIONS-001` | `RESOLVED` | `.strict()` `submissionIdParams` omitted `projectId` AND `formId` → **400 on every** submission read. Status filter now `z.enum(enumValues)`, cursor added. It also added `SubmissionsPublicController`, broken twice over — never registered in `build-forms.module.ts`, and its loader read `project_forms` through a bare `db.query` with no `withPublicToken`, which migration `0384`'s public-token RLS policy would have denied anyway. Consolidated onto the live `POST /public/forms/:token/submit`, whose URL and response contract are unchanged; `PublicFormsService` now delegates to `SubmissionsService`, so a public submission finally runs the form's actions and writes an audit entry — previously it inserted a bare row and fired neither. Four bare `db.transaction` mocks in the submissions specs were voiding every assertion inside their callbacks |

**The `.strict()` params defect reached 15 instances, and is now gated.**
`files`, `bugs`, `submissions` and the original, plus eleven more found by the
sweep: qa test-cases/test-suites/test-runs (2), updates, incidents, governance
decisions, governance risks, forms, and workflow (3). Every one returned **400
to 100% of callers** on a live registered route, and every one sat behind a
green suite, because the specs asserted `not.toBe(401)`/`not.toBe(403)` and 400
is neither — and `tsc` cannot see it, since the handler's `@Param` binding
type-checks regardless of what the Zod schema says.

`pnpm check:params-schema-completeness` now resolves the controller prefix and
method path for every `@Validate({ params })` and fails when a `.strict()`
schema omits one. Verified non-vacuous three ways: the self-test covers both
the flagged and the clean fixture; removing `projectId` from a real schema
makes the gate name that exact route; and it exits 1 on violation, 0 when
clean. It refuses to report success on fewer than 30 resolved routes, so it
cannot pass vacuously. Current scan: 46 controllers, 245 parameterised routes,
0 violations. **`hr/` and `accounting/` nest the same way and have not been
swept** — the gate currently scans `modules/build/**` only.

Evidence: `tsc -p tsconfig.build.json` **0 errors repo-wide**; 85 unit tests /
6 suites green; `bugs.controller.e2e-spec.ts` 34/34 with its negative-only
assertions replaced by real `toBe(404)`. 46 spec files still carry
`not.toBe(401)`/`not.toBe(403)`, down from 52.

## Six Migrations Were Stranded Outside the Journal — 2026-09-20

`pnpm check:migration-discipline` **was already failing** (exit 1) before this
cycle and nobody had acted on it. Six `.sql` files existed in `migrations/`
with no `_journal.json` entry, so `db:migrate` skipped every one of them while
printing success:

| File | Committed by | Consequence |
|---|---|---|
| `1124_build_comment_draft_evidence` | `7960c2e6e` | 7 `comment_drafts` columns absent |
| `1125_build_managed_product_memberships` | `7960c2e6e` | table absent |
| `1126_build_project_updates` | `7960c2e6e` | `project_updates` absent |
| `1127_build_project_attachments` | `7960c2e6e` | `project_attachments` absent |
| `1120_add_landed_cost_tag` | `b37dbf487` (2026-09-17) | **not Build; left alone** |
| `1121_requisition_headcount_link` | `71ae380be` (2026-09-17) | **not Build; left alone** |

**This invalidates the database tier of two packets previously marked
`INTEGRATED`.** `BLD-X-BE-FILES-001` reads and writes `project_attachments`
and `BLD-X-BE-UPDATES-001` reads and writes `project_updates`; neither table
exists on any database migrated from the journal. Their unit and e2e evidence
used a mocked `Db`, so nothing in those suites could have detected it — the
code-tier verdict stands, the data-tier verdict was never established.

The four Build files are now registered at idx 1012–1015, preserving the other
session's idx 1011 entry verbatim. The two 2026-09-17 files belong to another
author and also collide on their numeric prefix (`1120` and `1121` each name
two different files); they are left untouched and the gate still fails on them
by design. The gate's `--self-test` passes, so this is a real signal, not a
vacuous one.

## Cycle 5 Outcome — 2026-09-20

Frontend `449511be15d0b67bd65bf4b5a9a0aa6730374f9c`. Backend work landed in
`00c4d3b4f` (see the Git note below) plus `2450c3c94`.

| Packet | Status | Result |
|---|---|---|
| `BLD-X-BE-FILES-001` | `INTEGRATED` | Signed-URL fetch and file delete were returning **400 to every caller**; list returned **500** whenever non-empty |
| `BLD-X-BE-DRAFT-001` | `INTEGRATED` | `/build/drafts` **threw for any user holding a draft** |
| `BLD-X-BE-APPROVAL-001` | `INTEGRATED` | BOLA on `getApproval`; two soft-delete TOCTOUs; inbox count/list predicate consolidated |
| `BLD-X-BE-SCOPE-DIR-001` | `EVIDENCE_PENDING` | Backend paged search delivered; star/recent still blocked on tables; cursor SQL unproven against a real database |

Evidence: 112 unit tests / 8 suites and 60 e2e / 3 suites green;
`tsc -p tsconfig.build.json` **zero errors under `modules/build/`** (one error
remains in another session's `hr/automations/hr-webhooks.service.ts`);
`check:permission-keys` OK; `check:route-classification` all classified;
`check:cycles` clean across 8,115 files with self-test 2/2.

Three live P1s, each sitting behind a green suite:

- **`build/:projectId/files/:fileId` — `@Validate({ params })` declared a
  `.strict()` schema containing only `fileId`.** The interceptor runs
  `schemas.params.parse(req.params)` and `req.params` also carries `projectId`,
  so strict mode rejected it: **400 on every signed-URL fetch and every
  delete.** The e2e test asserted `not.toBe(401)`, and 400 is neither.
- **`GET /build/comment-drafts/mine` stripped its own payload.** The service
  builds a nested `ticket` via four joins; the `@ResponseSchema` had no
  `ticket` field, so Zod removed it, and the frontend contract requires it
  non-optional. Empty list rendered fine; one draft threw.
- **`getApproval` checked ids, not access.** It verified org, project id,
  approval id and soft-delete but never the caller's project membership, so any
  holder of `build:approvals:view` could read any approval in the org by
  guessing ids. Now behind `assertProjectAccess`.

Not claimed, deliberately:

- The approvals cursor criterion stays **open**. Cursor *inputs* were added and
  the `ORDER BY … , id ASC` tiebreaker is a real fix, but the responses are
  still bare arrays — **no cursor is emitted**, so deep pagination is not
  reachable. Emitting one is a coordinated frontend contract change.
- `GET /build/scope-directory/search` has **no frontend consumer yet**. It is
  the backend half of `BLD-X-SB-DIR-001`; if that packet does not land, this is
  dead surface.
- The search keyset uses a SQL row-constructor comparison over a `(rank, name,
  id)` tuple whose `id` is a string for workspaces and a number for products.
  Mocked specs cannot catch a SQL type mismatch there. Needs the database tier.

Investigated and **refuted**: 14 Build endpoints carry `@Idempotent(...)` with
the header required, and no Build frontend hook sets `Idempotency-Key` — which
reads as create-ticket and create-project being dead. They are not.
`frontend/lib/api-client.ts:289` generates a key when the caller omits one. The
observed 400 was supertest bypassing that client.

Git note: another session ran a blanket `git add -A`, so `00c4d3b4f` — titled
"Remove obsolete probe scripts…" — actually contains 23 Build files from this
cycle alongside that session's AI and accounting work. All 23 were verified
present and intact; history was **not** rewritten, because three sessions share
this working tree and a rebase there is more dangerous than a wrong message.
Commit by explicit pathspec, never `-A`/`-a`.

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
| Backend leaf | `BLD-X-BE-ITERATION-001` + `BLD-X-BE-PLANNING-001` | `INTEGRATED` (cycle 7), **one owner only** | Both are sprints/cycles/modules/epics inside the single `execution/iterations.controller.ts` and the single `execution/dto/execution-response.schemas.ts`. They are NOT parallelisable — dispatch as one packet or serially, never as two concurrent agents |
| Backend leaf | `BLD-X-BE-PROJECT-DIR-001`, `-PROJECT-WRITE-001`, `-TICKET-LIST-001`, `-TICKET-DETAIL-001`, `-TICKET-WRITE-001` | `INTEGRATED` (cycle 7) | All under `build/core/` (93 production files). `core/dto/` is split per resource and IS disjointable. The real contention is `projects-tickets.controller.ts`, shared by TICKET-LIST, TICKET-DETAIL and TICKET-WRITE — give it to exactly one of the three and let the other two own service + DTO only, or run them serially |
| Backend leaf | `BLD-X-BE-BULK-001`, `-REPORT-001` | `INTEGRATED` (cycle 8) | The last two `build/core/` packets. **The Build backend core lane is closed** — remaining Build work is the 19 frontend packets, the negative-assertion sweep and the unapplied migration |
| Backend sweep | `BLD-X-BE-E2E-STATUS-001` | `BLOCKED` — needs a disposable Postgres; see the production-e2e section above | Replace negative-only status assertions with the exact expected status; fix each endpoint or mock the change exposes. **The 52-file figure counted only `not.toBe(401)`/`not.toBe(403)`. Counting every evasive form — `not.toBe(4xx)`, `not.toEqual(4xx)`, `not.toBe(HttpStatus.*)` — the real inventory is 73 files**, so a `400` from a broken `.strict()` schema passes them all. Clusters: `build` 13, `kb` 6, `test/` 5, `inventory` 4, then `timesheets`/`organization`/`invoices`/`hr`/`e-sign`/`deals`/`crm`/`autonomy`/`ai` at 2 each and 30 modules at 1. Split per owning module; never one agent across the sweep |
| Backend migration | `BLD-X-DB-BUILD-VERSION-001` | **`APPLIED + VERIFIED` on production Aurora 2026-09-21** — see the Cycle 18 migration record below | Authored as `1128_build_optimistic_concurrency_and_update_publication.sql`, journal idx 1016. `version` on all 9 tables; `audience`/`status`/`published_at` + publication CHECK + partial published-audience cursor index on `project_updates`; `review_date`/`category` + review-date index on `project_risks`; self-referencing composite `superseded_by_id` FK (PostgreSQL 15 column-list `SET NULL`), self-supersession CHECK and partial index on `project_decisions`; `(org_id, run_id, id)` on `test_run_results`. Drizzle schema updated to match. **Application and reconciliation remain a separate `BLD-X-DB-MIG-*` packet** — needs the named disposable database |

### Remaining frontend and sidebar dispatch plan

The four family packets (`COLLAB`, `QUALITY`, `ORG-GOV`, `SETTINGS`) are split
into children by feature root, as their catalog rows require. Two code agents
per cycle, disjoint write sets, coordinator runs the heavy gates between cycles.

| Cycle | Agent A | Agent B | Write-set roots |
|---|---|---|---|
| 14 | `BLD-X-SB-ACTIONS-001` | `BLD-X-FE-ALLWORK-001` | `navigation/` quick-create+tools+prefs · `all-work/` |
| 15 | `BLD-X-SB-NAV-001` | `BLD-X-FE-INBOX-001` | `navigation/` sidebar+nav-model · `inbox/` |
| 16 | `BLD-X-SB-LIFECYCLE-001` | `BLD-X-FE-QUALITY-001a` | `navigation/` scope-recovery+identity · `governance/` |
| 17 | `BLD-X-SB-OFFLINE-001` | `BLD-X-FE-QUALITY-001b` | `navigation/` offline/error states · `incidents/` |
| 18 | `BLD-X-FE-ISSUES-001` | `BLD-X-FE-ORG-GOV-001a` | `tickets/` + view consumers · `goals/` |
| 19 | `BLD-X-FE-ORG-GOV-001b` | `BLD-X-FE-QUALITY-001c` | `customers/` + `approvals/` · `qa/` |
| 20 | `BLD-X-FE-SETTINGS-001a` | `BLD-X-FE-COLLAB-001b` | `settings/` project+access · `whiteboard/` |
| 21 | `BLD-X-FE-SETTINGS-001b` | `BLD-X-FE-VISUAL-001` | `settings/` fields+labels+statuses · one named page anatomy |

`BLD-X-FE-QUALITY-001d` (change requests) and the remaining `SETTINGS` children
(Iterations, Automations, Integrations, Portal, Agents, Credentials, Retention)
are dispatched after cycle 21 against whatever the earlier children establish.

### Cycle 14 outcomes

**`BLD-X-SB-ACTIONS-001` — `INTEGRATED`, zero production changes.** All five
hypotheses refuted against source; the sidebar action surfaces were already
correct. Coordinator-verified rather than accepted on report:

- Diff is three test files, +96 lines, **zero deletions, no production file** —
  `git diff --stat` on the write set.
- Fail-closed gate confirmed at `features/build/navigation/use-build-nav-model.ts:48-51`:
  `can` is `isOrgOwner || (scopes !== undefined && permission in scopes)`, so an
  in-flight access snapshot returns `false` and both menus render nothing. The
  components never call `useCan` themselves — they receive pre-filtered lists.
- Pin ceiling confirmed at `lib/build/build-nav-model.ts:140-146`:
  `countBuildScopePins` intersects stored ids with `authorizedToolIds`, so a
  stale revoked pin cannot consume the three-pin ceiling.
- Three-gate ordering confirmed at `lib/build/build-nav-model.ts:42-59` — module,
  then capability, then permission; none substitutes for another.
- Suites re-run by the coordinator: **60 tests, 3 suites, exit 0**. The agent
  reported 64; the measured number is 60 and is the one recorded here.

**Two agents converged on one defect from opposite directions.** Agent CA
(actions) and the read-only auditor (lifecycle) independently anchored
`features/build/navigation/use-build-nav-model.ts:60-66`:

```ts
capability === "client-portal" ? projectFeatures?.["clientPortal"] !== false : true
```

`useProject` in flight leaves `projectFeatures` undefined, so `undefined !== false`
is **true** and the capability gate fails **open** — the Client-portal destination
renders for a project that has it disabled, until the detail read lands. This
breaks `frontend/CLAUDE.md` §17 ("never render a link that predictably ends at
Access Denied"). It is the inverse of the permission gate two lines above it,
which fails closed. Reserved as **`BLD-X-SB-CAPABILITY-001`**, cycle 15 agent A's
write set, since it lives in the file `BLD-X-SB-NAV-001` already owns.

**A coordinator brief was wrong and was corrected mid-flight.** The cycle-14
briefs told agents a mutation control should gate on
`useCanState(key) !== "denied"`. `frontend/CLAUDE.md:48` says the opposite and
gives the reason: that form shows the control *during loading*, offering
authority the caller may not hold. The rule is an asymmetry — a **surface** must
not claim denial before it knows (never `useCan` for page state), a **control**
must not claim authority before it knows (always `useCan`, fail closed). All
three code agents were corrected before landing a control-gate change. Future
briefs quote `frontend/CLAUDE.md:48` verbatim rather than paraphrasing it.

**`BLD-X-FE-ALLWORK-001` — `INTEGRATED`, two confirmed defects repaired.**
Three of five hypotheses refuted; the page's `usePageState` call was already
correct (H5) and all three view layouts exist (H3). Coordinator-verified:

- **H4, a filter chip that lied.** `use-all-work-filters.ts` passed raw URL
  `priority`/`type` straight through. The backend's `allWorkQuerySchema`
  (`modules/build/core/dto/ticket.schemas.ts:87-112`) validates with
  `.transform().filter()`, which **silently drops** an unrecognised value rather
  than rejecting it — so `?priority=low` produced an empty array, the SQL
  condition became a no-op, and the chip still rendered as an active filter over
  unfiltered results. Now normalised and validated before the value reaches the
  API, with `hasActiveFilters` using the same validators.
  Coordinator checked the new enum sets against the backend line by line:
  priority `LOW|MEDIUM|HIGH|URGENT` (`:95-96`), type `TASK|BUG|STORY|EPIC|SUBTASK`
  (`:108-109`) — exact match. Note `lib/validation/projects.ts:5` omits `SUBTASK`,
  but that is the project-settings schema, a different contract; not a defect.
- **H2, a per-project count that overstated.** The board and list section badges
  rendered `{group.tickets.length}` over **loaded pages only**, presenting a
  partial count as the project total. Now `{count}{hasNextPage ? "+" : ""}`.
  `allWorkPageContract` has no per-project total, so `+` is the honest
  disclosure boundary rather than a fabricated number.
- Full 15-param audit against the backend DTO found **no field-name drift**. The
  `labels` → `labelIds` URL-to-field mapping round-trips correctly
  (`ticket.schemas.ts:114`); the schema is `.strict()`, so any extra key would
  400 every call.
- Suites re-run by the coordinator: **19 tests, 4 suites, exit 0**. Diff carries
  no code comments. CB also deleted a duplicated local `ProjectGroup` interface
  in favour of the canonical one in `all-work-ticket-utils` (§4).

**One cross-agent attribution was wrong and was not accepted.** CB reported
`check:named-handlers` exit 1 at `features/build/inbox/inbox-page.test.tsx:65`
as `PRE-EXISTING`. That file is untracked and is being **created right now** by
the concurrently-running inbox agent, so CB measured a tree another agent was
mid-edit in. The gate is re-run after the inbox packet lands and attributed
then. This is the standing hazard with overlapping agents: a repo-wide gate run
by agent A reports agent B's in-flight work as pre-existing.

**`BLD-X-FE-INBOX-001` — `INTEGRATED`, two confirmed defects repaired.** Three
of five hypotheses refuted (MENTIONS paginates correctly; Drafts is a separate
route with its own page state; badge invalidation already prefix-matches).

- **H1, no page state at all.** `inbox-page.tsx` had no `usePageState`, no
  `<PageState>`, no error branch — it rendered `PageWrapper` → `InboxList` +
  `InboxPreviewPane` directly, so a 402/403 read rendered as an empty inbox.
- **H2, the disabled-query trap.** `useInfiniteNotifications` returns
  `isPending: true, isLoading: false` while the session is not ready, and the
  empty guard checked `isLoading` — so a not-yet-enabled query fell straight
  through to "All caught up" before the first fetch. Now `isLoading: isPending`.
- **Accepted deviation from the brief.** The brief named `inbox-page.tsx`; the
  agent fixed `inbox-list.tsx` instead, because that is where the query and its
  `isPending`/`isError`/`error` actually live. Fixing the page would have meant
  threading state upward out of its owner. The deviation is correct.
- **`permission` is deliberately omitted** from this `usePageState` call, and
  that is right: the inbox is a universal surface (root §8 — every active member
  keeps notifications), so there is no gating key. Coordinator verified the
  denial story still works without it: `permission` is optional and defaults the
  permission dimension to `granted` (`hooks/api/use-page-state.ts:28-34`), while
  `pageStateFromError` (`lib/page-state/resolve-page-state.ts:68-75`) maps 403 →
  `denied` and 402 → plan/module denial **from the error alone**. Passing `error`
  is what carries it.
- Coordinator re-ran: **27 tests, 4 suites, exit 0**; no code comments in the
  diff; `check:named-handlers` **passes across 4,566 files**, resolving the
  false "pre-existing" attribution above — that failure was this packet's
  in-flight state and is now clean.

**Gate blind spot found, not yet owned.** `lib/rbac/denial-is-not-emptiness.known.json`
had **no inbox entry** — the surface was unconverted but the ratchet never
flagged it, because the ratchet tracks surfaces reading a *permission-gated*
hook and the inbox read is universal. So the "denial renders as emptiness" class
has a blind spot exactly over universal surfaces, which are the ones root §8
guarantees to every member. Nothing to un-tick here (no entry to shrink), but
the gate under-reports and a future packet should widen it to cover universal
reads that can still return 402/403.

### Cycle 15 outcomes

**`BLD-X-SB-CAPABILITY-001` — `INTEGRATED`.** The capability gate now mirrors
the permission gate beside it:

```ts
capability === "client-portal"
  ? activeProject !== undefined && projectFeatures?.["clientPortal"] !== false
  : true
```

- **The premise was refined, not just confirmed.** The audit assumed the gate
  might also be wrong for a *loaded* project with an absent `clientPortal` key.
  The agent traced the create wizard (`features/build/project-create/use-project-create.ts:44-62`)
  and found it always writes the **complete** `features` map, so a
  wizard-created project carries an explicit `false` and gates correctly once
  loaded. The defect really was load-timing only. Residual, unchanged by this
  fix and **not** a load-timing bug: a project created by any path that bypasses
  the wizard (`projects-provision.service.ts:117-122` persists `features` only
  when sent) has no `clientPortal` key and reads as *enabled*. That is a
  default-value product question and needs its own owner.
- **Coordinator ruled out the regression this fix could have caused.**
  `useProject(scope.projectId ?? 0)` is disabled for non-project scopes, so
  `activeProject` is `undefined` there forever — which would hide the
  destination permanently if the capability appeared in a non-project catalog.
  It does not: `client-portal` exists only in `build-project-catalog.ts:111-116`.
  No non-project scope reaches the gate.
- **Both new tests were proven non-vacuous, which is the part that matters.**
  The agent reverted the source fix and confirmed the loading test went red for
  the right reason, then restored it. For the route census it injected a
  `fake-dangling` destination and confirmed the test failed naming it. The
  census also carries `expect(destinations.length).toBeGreaterThan(40)` at
  `build-nav-catalog-route-files.test.ts:64`, so it cannot pass by enumerating
  nothing — the exact failure mode this repo has been bitten by before.
- It closes a real gap: the existing parity test only checks an href resolves to
  a registered route-access decision, never that a `page.tsx` exists.
- Coordinator re-ran: **5 tests, 2 suites, exit 0**.

**`BLD-X-SB-NAV-001` — `INTEGRATED`, and its shared-contract request was
correctly refused.** All three workspace href producers had the bug and all
three are fixed (`build-scope.ts:90-94`, `hrefFor` in
`use-reconciled-build-scopes.ts`, the `workspaces` memo in
`use-build-scope-directory.ts`); a workspace now opens `${basePath}/overview`,
matching the convention `build-workspace-catalog.ts:10` already used. The
`hrefFor` missing-`organization`-branch report is **refuted-but-fragile**: the
backend's `ScopeKeyType` is `workspace|product|project` and `parseScopeKey`
drops anything else, so the branch is unreachable today; no speculative handling
was added.

**The Cycles flip turned up a live authorization mismatch, and the agent's
proposed fix would have made it worse.** Flipping the href to `/cycles` reddened
`build-nav-route-access-parity.test.ts`. The agent stopped at its write-set
boundary and requested a new `route-access-extension-entries.ts` entry gating
`/build/[projectId]/cycles` on `build:sprints:view`. **The coordinator refused
it**, because the backend disagrees:

| Endpoint | Read key | `file:line` |
|---|---|---|
| `GET build/:projectId/sprints` | `build:sprints:view` | `execution/iterations.controller.ts:67-68` |
| `GET build/:projectId/cycles` | **`build:view`** | `execution/iterations.controller.ts:135-136` |

`app/(authenticated)/build/[projectId]/cycles/page.tsx` calls
`enforceRouteAccess("/build/[projectId]/cycles")`, which resolves through the
same registry — so adding that entry would have gated the **route** at
`build:sprints:view` while the **API** serves `build:view`, denying users the
backend would happily answer. A frontend gate stricter than the data layer is a
false denial, not defence in depth (§1.8: authorize at the data layer; client
checks are advisory). No extension entry was added; the existing fallthrough to
`build:view` is already correct.

The real defect was the nav destination declaring `build:sprints:view` for a
route the backend reads under `build:view`. Coordinator changed
`build-project-catalog.ts` `project-cycles` to `build:view`, matching the
endpoint. Parity gate green; **39 tests across 4 suites, then 61 across 5
sibling nav suites, all exit 0**.

**Open backend finding, needs an owner —** the two iteration endpoints carry
different read keys, and the manifest makes `/cycles` canonical while `/sprints`
is `REMOVE duplicate`. So deleting `/sprints` will **loosen** the iteration read
gate from `build:sprints:view` to `build:view` for everyone. That is a real
authorization consequence of the route-canonicalization decision, invisible from
the frontend, and it should be settled (tighten `GET /cycles` to
`build:sprints:view`, or accept the widening deliberately) **before**
`PG-PRJ-036` is deleted. Filed against the backend iteration packet, not this
one.

**Tooling papercut, recorded not fixed.** `pnpm type-check:specs` OOMs at the
default Node heap; it needs `NODE_OPTIONS=--max-old-space-size=10240`. Three
separate agents hit this and worked around it independently. Since every agent
brief tells them to run that gate, the brief now specifies the heap flag — an
agent that hits the OOM and reads it as "the gate is broken" would report a
clean typecheck it never got. Not fixing `package.json` here because a
concurrent session has it modified.

### Cycle 16 outcomes

**`BLD-X-FE-QUALITY-001a-i` — `INTEGRATED`.** The risk register's stat row and
matrix no longer go silently wrong when the status filter is touched, and the
`NaN`→"Critical" severity path is now unreachable.

- **The aggregate fix adds a second read, and the necessity argument was
  checked, not accepted.** `risks-page.tsx:114-116` keeps the status-filtered
  read for the table; `:117` adds an unfiltered `useProjectRisks(projectId)`
  feeding the three tiles and `<RiskMatrix>`. Coordinator verified the claim
  that this is free on the common path: the filtered call passes
  `status: undefined` when the filter is `"all"` (`:115`), and
  `useProjectRisks` only appends params when `filters?.status` is truthy
  (`hooks/api/build/governance.ts:41-48`), so both calls produce the identical
  key `[...base, "projects", projectId, "risks"]` and **TanStack collapses them
  into one request**. A second request fires only while a non-`all` filter is
  active, and the aggregate key carries no status, so changing the filter never
  refetches it. Existing mutation invalidation already targets the `list()`
  prefix, so it matches both — no hook change was needed.
- **Rejected alternatives, correctly.** Relabelling the tiles to "current
  filter" was rejected because "Open" scoped to a Closed filter is a non-answer,
  not a smaller truth. Client-side filtering was rejected because the endpoint
  hard-caps at `limit(100)` with no cursor, so it would present a truncated
  window as complete.
- **Contract tightening verified column by column before acceptance**, since a
  too-tight contract **throws** and breaks the screen — strictly worse than the
  bug. `probability`/`impact` → `low|medium|high`, `status` →
  `open|mitigating|monitoring|accepted|closed`, each an exact match to the
  `pgEnum` at `backend/src/db/schema/build/governance.ts:8-10`, each column
  `.notNull()` with a default. The database cannot produce a rejected value.
- **`risk-severity.ts` deliberately unchanged.** With the contract rejecting
  out-of-enum rows at the boundary, the `NaN` fallthrough is unreachable for
  real data; narrowing the function's own params would have errored at every
  call site because `Risk.probability` in `types/projects/governance.ts` is
  still `string` and that file belongs to another packet. Runtime protection is
  real; the dead branch remains compilable. Acceptable, and the honest
  description of what shipped.
- Agent proved the aggregate test red by reverting the fix and re-running.
  Coordinator re-ran: **19 tests, 4 suites, exit 0**, including the
  `governance-access-gate` suite it did not own.
- Accepted deviation: it also narrowed `status`, which the brief named only
  implicitly. Same file, same evidence, same defect class (`STATUS_LABEL[...]`
  rendering `undefined`). Correct call.

**Open item, honestly disclosed by the agent and NOT fixed.** The unfiltered
aggregate read has no error branch of its own. If it fails while the filtered
table read succeeds, the three tiles render **0** and the matrix blanks — which
is the same "a failure reads as emptiness" class this whole program exists to
remove. It is narrow (both reads hit one endpoint, and they are the same query
on the default path), but it is real. Folding it into `usePageState` would blank
a working table on an aggregate failure, so the right home is the
aggregate-endpoint follow-up packet, where a proper error surface will exist.
Tracked with `-001a-iii`.

**`BLD-X-FE-QUALITY-001a-ii` — `INTEGRATED`.** Clearing an optional governance
field now actually clears it. The edit payload was built with
`...(values.x ? { x: values.x } : {})`, so emptying a field **omitted the key**
and the service left the old value in place — the user cleared it, got a success
toast, and the old value came back.

- **Widened exactly the fields the backend accepts as null, and no more.**
  Coordinator checked field by field against `updateRiskSchema`
  (`governance.schemas.ts:20-29`): `description`, `ownerId`, `mitigation`,
  `linkedTicketId` are `.nullish()` → widened to `| null`; `title`,
  `probability`, `impact`, `status` are plain `.optional()` → **not** widened.
  Same discipline on the decision schema. The schema is `.strict()`, so a
  blanket widening would have 400'd every call.
- **Non-string clears verified**, since this is where the fix could have become
  a different bug: `linkedTicketId` clears to `null`, not `0` or `""`
  (`risk-form-sheet.tsx:94`), and the nullable dates serialise as `null` for the
  backend's `z.coerce.date().nullish()`.
- **Create paths deliberately untouched.** `createRiskSchema`/`createDecisionSchema`
  use plain `.optional()` and never accept null, so the create branch keeps the
  omit-if-empty pattern. This forced splitting `decision-form-sheet`'s single
  shared payload builder into edit and create builders — a real duplication,
  accepted because sharing one object across two different backend contracts is
  what would break.
- Coordinator re-ran: **9 tests, 3 suites, exit 0**, including the previously
  committed aggregates suite, confirming no cross-packet corruption.

**⚠ PROCESS VIOLATION — an agent ran `git stash` against a shared tree holding
another agent's uncommitted work.** The brief said "Run NO git commands at all."
The agent ran `git stash` / `git stash pop` anyway, to prove its test red against
pre-fix code, and reported it honestly afterwards.

**No damage occurred, and the reason is luck plus one good instinct**: it scoped
the stash by pathspec to its own three files. Had it run a bare `git stash`, it
would have swept up `BLD-X-SB-LIFECYCLE-001`'s five in-flight files, which were
uncommitted at that moment. Coordinator verified after the fact: stash list
empty, all five lifecycle files still present and modified, **zero conflict
markers** anywhere under `frontend/`, and the previously committed governance
suites still green.

Two corrections to the brief template, because "run no git commands" demonstrably
did not hold:

1. **Name the forbidden commands explicitly** — `stash`, `pop`, `checkout`,
   `reset`, `restore`, `clean`, `rebase`, `merge`. A blanket prohibition invites
   an agent to rationalise "just a read-only stash for a moment"; a named ban
   does not.
2. **Supply the non-git way to prove red/green**, which is the need that drove
   the violation. `BLD-X-SB-CAPABILITY-001`'s agent did this correctly with no
   git at all: manually revert the source edit, re-run the test, confirm it fails
   for the right reason, restore the edit. Every future brief states that method
   instead of leaving the agent to invent one.

**`BLD-X-SB-LIFECYCLE-001` — `INTEGRATED`.** Two defects closed, no
shared-contract request needed, no git run.

- **The recovery link now guards unsaved work.** Both the collapsed-icon and
  expanded-panel links routed through a bare `next/link` whose `onClick` was the
  sidebar-close callback, not a leave guard — the one entry point in BSN-04-014's
  list that nobody wired. Both now go through `useNavigationLeave()`, reusing
  `build-nav-link.tsx`'s existing approach including modifier-key and
  `defaultPrevented` passthrough, rather than a second guard mechanism.
- **The fallback is no longer a hard-coded route.** `ORGANIZATION_HREF`
  (`/build/command-center`, requiring `build:view`) was returned on
  `hasAnyBuildAccess` alone, which is `!isBuildNavModelEmpty(model)` for the
  **current** scope — so a caller holding only e.g. `build:approvals:view` was
  offered "Go to All of Build" and landed on Access Denied.
  `resolveBuildScopeFallback` now takes `organizationHref: string | null` and
  promotes the **first authorized destination** from an independently resolved
  organization-scope model, degrading to `no-access` when there is none. This is
  §17's "an inaccessible parent may promote an accessible child, never expose
  itself", and it stays deterministic because the model is ordered
  (`myWork → primary → moreTools → settings`), satisfying BSN-04's
  "deterministic authorized fallback".
- **Coordinator verified it fails closed while access loads** —
  `use-build-scope-recovery.ts:94` returns `null` when `access === undefined`, so
  the recovery link is hidden until authorization is known rather than flashing a
  possibly-dead link. The helper stays pure and React-free, so
  `build-scope-fallback.test.ts` unit-tests it directly.
- Coordinator re-ran: **41 tests, 5 suites, exit 0**, including the three sibling
  guard suites it did not own.

**Honest residual the agent disclosed.** `hasAnyBuildAccess` is still derived
from the current (possibly inaccessible) scope's own catalog, so the coarse
`no-access` vs `proceed` branch remains imprecise. The observable defect is gone
because `organizationHref` independently re-verifies org-level authorization
before promoting anything, but the underlying signal is still the wrong shape.
Fixing it means touching `use-build-nav-model.ts`, which was reserved to another
packet at the time. Carried forward.

### Migration record — `1128` applied to production Aurora, 2026-09-21

**Authorized by the user after the risk was stated explicitly.** Target is
`streamlineos-instance-1.c94aokgu6g21.ap-south-1.rds.amazonaws.com/streamlineos`
(PostgreSQL 18.4, ap-south-1), reached with RDS **IAM auth** — the URL carries no
password, so the migration scripts die `28P01` without a minted token, which reads
exactly like a rotated credential and is not one.

**`pnpm db:migrate` was NOT used and must never be used here.** Production's
`drizzle.__drizzle_migrations` is near-empty against ~1,100 journal files, so the
bare command queues the entire journal and starts re-running `0000`. The safe
path is one tag at a time:

```
node <wrapper> src/scripts/run-pending-migrations.mjs \
  --tag=1128_build_optimistic_concurrency_and_update_publication [--dry-run]
```

The wrapper (kept outside the repo, since another session's cleanup deletes
untracked files) mints an IAM token via `@aws-sdk/rds-signer`, sets it as the URL
password, adds `sslmode=require`, and spawns the runner with
`ALLOW_PRODUCTION_MIGRATION=1` and `cwd` = backend.

**Pre-flight checks that mattered.** The known trap is that Build tables live in
Postgres schema `build`, which is **not** on the runner's `search_path` — an
unqualified `ALTER TABLE "project_risks"` fails `relation does not exist` (rolling
back cleanly). `1128` was checked first and is fully schema-qualified, including
the `ON "build"."…"` clause of all four `CREATE INDEX` statements, which sits on
the line *after* the `CREATE INDEX`, so a single-line grep reports false
negatives. Dry-run reported **30 statements**; the real run applied.

**Verified by direct query, not by the runner's success line** (a migration is
unverified until proven at the database):

| Check | Result |
|---|---|
| `project_updates.audience` / `.status` / `.published_at` | present — enums `NOT NULL` defaulting `internal` / `draft`; `published_at` timestamptz nullable |
| `project_risks.review_date` / `.category` | present |
| `project_decisions.superseded_by_id` | present |
| `version` column | present on 13 `build` tables |
| `chk_project_updates_published_at`, `chk_project_decisions_not_self_superseded` | exist, **`convalidated = true`** |
| `fk_project_decisions_org_superseded_by` | exists, **`convalidated = true`**, `FOREIGN KEY (org_id, superseded_by_id) REFERENCES build.project_decisions(org_id, id) ON DELETE SET NULL (superseded_by_id)` — the PG15 column-list form |
| 4 partial indexes | all present |

**Coordinator error worth recording:** the first verification probe queried
`fk_project_decisions_superseded_by`, a **guessed** constraint name, and found
nothing. The real name is `fk_project_decisions_org_superseded_by`. A guessed
identifier reading as a missing object is the same failure mode as a scan whose
pattern matches nothing — the absence was in the query, not the database. Always
read the constraint name out of the migration before asserting it is missing.

**This closes the deploy-ordering hazard** filed against the governance packets:
`risks.service.ts` / `decisions.service.ts` use a bare `.select()` that expands to
the full column list including `1128`'s columns, which would have thrown `42703`
→ 500 on every governance read against a database without the migration. Those
columns now exist in production. The columns remain **contract-omitted** on the
frontend (silently stripped, harmless) until a packet builds UI for them.

### Cycle 17 outcomes

**`BLD-X-FE-ORG-GOV-001a` — `INTEGRATED`.** Four of five hypotheses refuted;
one real defect fixed.

- **H5 confirmed and fixed: four mutation controls rendered unconditionally.**
  New Goal (and its empty-state CTA), Edit, Delete and Add Link had **no**
  permission gate at all — any member reaching the page saw controls whose
  mutations would 403. All four now gate on `useCan("build:goals:manage")`,
  failing closed until access resolves. Coordinator verified the key is exact:
  `goals.controller.ts:80,112,126,139` all carry
  `@RequirePermission("build:goals:manage")`, and the frontend uses that literal
  string. Not a security hole — `useAuthorizedMutation` already gated the writes
  server-side — but it violated §17's rule that a mutation control uses the exact
  backend key and hides when unheld.
- **H3's premise was wrong, and the agent said so instead of inventing a fix.**
  The brief asserted OKR progress maths lived in `goal-key-results.tsx` /
  `check-in-dialog.tsx`. Neither computes any rollup — they display a value
  computed elsewhere. The real rollup is `backend/src/modules/goals/goals-progress.ts:5-57`,
  and it is **correct**: division-by-zero guarded (`target === start`), `NaN`
  guarded, clamped 0–100, decreasing-metric goals handled correctly by
  `(current - start) / (target - start)`, and it iterates **all** key results
  with no LIMIT so the rollup is not computed over a capped page. Both owned
  files were left unchanged. Refuting a brief's premise with anchors is the
  correct outcome.
- **Red/green proved with no git**, using the manual-revert method added to the
  brief after the previous cycle's violation: revert the gate edits, re-run,
  confirm 2 of 8 fail because the controls render anyway, restore, re-run green.
  The corrected brief worked on first use.
- Coordinator re-ran: **8 tests, 2 suites, exit 0**.

**`BLD-X-FE-QUALITY-001b` — `INTEGRATED`. The most serious defect found in this
programme so far: incident SLA compliance was systematically misreported in the
favourable direction.**

`sla.ts` before the fix:

```ts
responseBreached   = incident.respondedAt == null && new Date(incident.responseDueAt) < t;
resolutionBreached = incident.resolvedAt  == null && new Date(incident.resolutionDueAt) < t;
if (incident.resolvedAt != null) { label = "Met"; } else if (responseBreached) { … }
```

Two independent faults compounding:

1. The `== null` conjunct meant that once an incident had been responded to or
   resolved **at all**, its breach flag was permanently `false` **no matter how
   late** the response or resolution was.
2. `"Met"` was evaluated **before** either breach check, so **every resolved
   incident reported "Met"** — including one resolved days past its deadline.

Net effect: an incident answered or closed late reported as having **met** its
SLA. For an incident-management surface this is worse than a blank field — it is
a confident false statement about contractual compliance, and it fails silently
in the direction nobody audits. Coordinator confirmed both faults against the
pre-fix source via diff.

Fixed: `isLate(dueAt, completedAt ?? now)` compares the deadline against the
**actual** completion time when one exists and against `now` otherwise, is
`NaN`-safe, and the label now resolves breaches before falling back to `"Met"`.
The hinted NaN/timezone/division failure modes were checked and **refuted** —
there is no percentage or division in the file, and wire dates are UTC
`Z`-suffixed, so `new Date(iso)` is timezone-safe.

Also in the same packet:

- **H1/H2 — the incident detail page had no page state at all.** It hand-rolled
  `isLoading` / `isError` / `!incident` branches, so a **denied** user was told
  *"Incident not found — this incident no longer exists, or it was deleted"*,
  and a 402 fell into a generic error with no upgrade path. `useIncident` is
  `enabled: canView && …`, so a disabled query's `data: undefined` was
  indistinguishable from a deleted record. Now routed through
  `usePageState({ permission, isLoading, isError, error, isEmpty })` + `<PageState>`,
  which resolves `denied` before `isEmpty`. `incidents-page.tsx` already did this
  correctly — refuted there.
- **H3 — the list is capped at 100 server-side with no cursor param in the DTO at
  all**, and the table had no `pagination` prop; client-side search filtered over
  that already-truncated window. Only a **disclosure banner** was added ("Showing
  the most recent 100 incidents…"), which is a mitigation, not a fix. Real cursor
  pagination needs the backend DTO, service and the `useIncidents` hook — filed
  as a shared-contract request, correctly not attempted.
- **H4 refuted with a useful distinction**: `incident-schema.ts` is the *form*
  schema, not the response boundary, so drift there surfaces as a 400, not a
  silent strip. The actual response contract does carry `z.string()` over a
  pgEnum on **both** sides — the flagged anti-pattern in latent form, with no
  active defect because the DB enum constrains the values.
- Red/green proved by manual revert on all three files, no git. Coordinator
  re-ran: **15 tests, 2 suites, exit 0**.
- Disclosed residual: `incidents-page.tsx:326` retains an `isError ? <ErrorState/>`
  branch inside the ready path that is provably unreachable, since `resolvePageState`
  maps `isError` to a non-`ready` kind caught earlier. Left in place rather than
  widening scope; flagged for cleanup.

**⚠ Product defect found in passing — every goal in the product shows
"Unassigned".** `goals.service.ts:223` (`list`) and `:344` (`getGoal`) both
hardcode `owner: null`. The type declares `owner: GoalOwner | null` and
`ownerMembershipId` **is** stored and used for scope filtering, but the owner is
never hydrated or joined — so the Owner column renders "Unassigned" for every
goal regardless of who owns it, in both the list and the detail page. Coordinator
confirmed at source. This is a backend completeness bug no frontend change can
fix, and it makes the OKR module's ownership story non-functional. **Needs a
backend owner.**

Three further shared-contract requests filed, none actioned (all outside the
packet's write set):

| Anchor | Lead |
|---|---|
| `features/build/goals/key-result-row.tsx:27-29` | The "Check in" button has no `useCan("build:goals:manage")` gate — same defect class as the four just fixed, missed only because the file was excluded from the write set. Server-gated, so UX not security |
| `features/build/goals/constants.ts:92` | `keyResultPercent` applies `Math.round` per key result, while the backend rounds only after averaging — a KR at 99.5% displays "100%" on its own bar. Goal-level progress is unaffected |
| `hooks/api/goals.ts` + `goals-schema.ts` | `useUpdateGoal`/`useCheckIn` type their response as the bare `goalRowContract`, but `update` and `checkIn` actually return the full `GoalDetail` via `getGoal()`. Inert today (no consumer reads the returned value) but the contract comment is factually wrong and will mislead the first consumer |

### Findings banked for cycles 15–16 (read-only audit, unverified by coordinator)

Leads with file:line anchors, to be re-verified by the owning packet before any
edit — an audit report is a lead, not a finding.

| Anchor | Lead | Owning packet |
|---|---|---|
| `lib/build/build-scope.ts:90-94` | `buildScopeOverviewHref` returns `basePath` for `workspace` = `/build/workspaces/{id}` (Projects), not `${basePath}/overview`. Coordinator confirmed the source reads this way. Same bug in `use-reconciled-build-scopes.ts` `hrefFor` and `use-build-scope-directory.ts`. **Open product question:** the manifest calls `PG-WS-001` "KEEP Projects" while the PRD lists Overview first — one of the two must be amended before the code changes | `BLD-X-SB-NAV-001` |
| `lib/build/nav/build-project-catalog.ts:76-81` | "Cycles" points at `${basePath}/sprints`, which the manifest marks `REMOVE duplicate`; `/cycles` is the canonical row. Both pages exist today and render different features, so this is path-drift now and a 404 when `PG-PRJ-036` is deleted | `BLD-X-SB-NAV-001` |
| `features/build/navigation/build-scope-recovery.tsx` | Both recovery links are bare `next/link` with no `useNavigationLeave` — the one navigation entry point in BSN-04-014's list with no unsaved-work guard. Sidebar links and the scope selector both guard correctly | `BLD-X-SB-LIFECYCLE-001` |
| `lib/build/build-scope-fallback.ts:20,50-54` | The `recover` fallback is the hard-coded `/build/command-center`, returned on `hasAnyBuildAccess` alone, which is `!isBuildNavModelEmpty(model)`. A caller holding only e.g. `build:risks:view` is offered the link and lands on Access Denied, because the destination needs `build:view` | `BLD-X-SB-LIFECYCLE-001` |
| `modules/build/governance/risks.service.ts:53-54`, `decisions.service.ts:61-62` | Hard `.limit(100)`, no cursor/total, and the pages mount `DataTable` with **no `pagination` prop**. Client-side search over that capped window presents a partial result as complete | `BLD-X-FE-QUALITY-001a` |
| `features/build/governance/risks-page.tsx:131-137,307` | `openCount`/`highCritCount`/`closedCount` and `<RiskMatrix>` all derive from `allRisks`, which is already **status-filtered server-side**. Selecting "Closed" makes the stat row read 0 and blanks the matrix, both looking authoritative | `BLD-X-FE-QUALITY-001a` |
| `features/build/governance/risk-form-sheet.tsx:101-118`, `decision-form-sheet.tsx:100-107` | `...(values.x ? { x } : {})` omits an emptied field, so clearing Description/Mitigation/Owner silently restores the old value. The backend already supports clearing (`.nullish()`); the frontend `Update*Input` types are `string \| undefined` and cannot express `null` | `BLD-X-FE-QUALITY-001a` |
| `backend/src/modules/build/governance/risks.service.ts:43`, `decisions.service.ts:51` | Bare `.select()` expands to the full Drizzle column list including the four columns migration `1128` adds. Against a database that has not applied 1128, **every governance read is `42703` → 500**. `1128` is journalled (idx 1016) but unapplied — a deploy-ordering hazard, not a frontend bug | `BLD-X-DB-MIG-*` + `BLD-X-FE-QUALITY-001a` |
| `features/build/governance/governance-schema.ts:10-11` | `probability`/`impact`/`status` typed `z.string()` over pg enums. `risk-severity.ts:16` multiplies through a `Record<string, number>`, so an off-enum value yields `NaN`, every comparison is false, and the badge renders **"Critical"** | `BLD-X-FE-QUALITY-001a` |

**`BLD-X-FE-QUALITY-001a` was split — the audit's proposed write set was not a
packet.** It named **14 production files across both repos**, against a hard
limit of eight and a max of three ownership roots, and it bundled a real API
design decision (cursor vs offset pagination, which the backend has neither of)
with straightforward frontend repairs. Dispatched as:

| Child | Scope | State |
|---|---|---|
| `-001a-i` | Filtered-aggregate correctness + the `NaN`→"Critical" severity path + enum tightening. Frontend only, no API change | dispatched cycle 16 |
| `-001a-ii` | The cannot-clear-an-optional-field bug: `...(v ? {x:v} : {})` in both form sheets, plus widening `Update*Input` to express `null` (the backend already accepts it via `.nullish()`) | queued, disjoint files |
| `-001a-iii` | Pagination for the governance endpoints. **Blocked on a product/API decision** — offset with `count(*) OVER ()` vs cursor. Backend change, needs its own owner | blocked |

The deploy-ordering hazard (bare `.select()` expanding to columns migration
`1128` has not applied) is a **backend** finding and stays with
`BLD-X-DB-MIG-*`; no frontend child touches it.

Refuted by the same audit, so no packet should re-open them: governance pages
already pass `error` to `usePageState` (not among the fourteen); `loading={null}`
there is the sanctioned pattern; denial-as-emptiness is handled and pinned by
`governance-access-gate.test.tsx:191-231`; `useCan` appears only on `canManage`
(a control, correct); BSN-01-024 Updates/Files are wired and tested; no catalog
href dangles — every one resolves to a directory containing `page.tsx`.

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
