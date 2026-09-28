# 25 — Group the ticket concept into its own directory

**What to build:** Everything about a ticket lives in one place. Roughly 65 files concerning tickets — create, read, update, detail, transfer, bulk mutation, workflow, ranking, capacity, comments, checklists, links, relations — currently sit as flat peers among 227 files, so answering "how does ticket ranking work?" means scanning filenames for a prefix.

Move them under a named directory. Structure only; no logic changes.

**Blocked by:** 01 — Publish the Build core shared surface.

**Status:** done except the `core/` sibling reaches, which are ticket 01's seam work
(the cross-module callers are closed — see Remeasurement 2026-09-28)

- [x] Ticket files live under one named directory
- [x] Imports are updated; no file is orphaned
- [ ] Nothing outside the group reaches into it except through the shared surface
- [x] The import graph stays acyclic, per BE-10
- [x] Every route behaves identically and no logic changed
- [x] File names stay kebab-case, per BE-08

## What landed

Seventy-six files under `core/tickets/`, behind `core/tickets/index.ts`
exporting the 26 symbols the rest of the codebase consumes.
`projects.module.ts` takes its seventeen ticket controllers and services
from the barrel.

The move stranded every path that named the old location. Repointed: twenty
import specifiers in `agent-access`, `ai`, `cron`, `feedbucket` and
`integrations/git` — until those were fixed the backend did not compile at
all — and seventy-nine path strings across the gate scripts and ledgers
that key their verdicts by file, including the raw-row and
assertion-ceiling ledgers, the ticket-write ratchet, `authz-deny`,
`db-call-count`, `unbounded-reads`, `relation-key-reach` and the contract
registry generator. `check:ticket-write-module` and `check:authz-deny` are
green again.

## Why the third criterion is not ticked

Ten callers in `entity`, `execution`, `forms`, `import-export` and
`meetings` were converted to the barrel. Two groups still reach past it.

**Nine `core/` siblings cannot use the barrel without creating a cycle**,
so criterion 3 and criterion 4 are in direct tension here.
`core/tickets/*` imports thirteen distinct `core/` siblings — among them
`build-automation-runner.service`, `projects-activity.service`,
`projects-webhooks-dispatch.service` and `project-access`. Concretely:
`core/build-automation-actions.service.ts` reaches in for
`reserveTicketCapacity`; route that through the barrel and the chain
becomes barrel → `projects-tickets-create.service` →
`build-automation-runner.service` → `build-automation-actions.service`,
which is a cycle BE-10 forbids. The other eight are
`build-notification-context.service`, `build-project-aggregate-access`,
`projects-custom-fields.service`, `projects-custom-states.service`,
`projects-query.service`, `projects-releases.service`,
`projects-reports.service` and `projects-roadmap.service`. A group that
depends back on its own directory's peers cannot be entered only through
its front door; closing this properly means moving the shared pieces
(`project-access`, the activity and webhook seams) somewhere both sides can
depend on, which is ticket 01's job, not this one.

**Eleven files in other modules** still import individual ticket files —
`agent-access/agent.controller.ts`, three under `ai/core`,
`cron/cron-projects.service.ts`, five under `feedbucket`, and
`integrations/git/integrations-git.service.ts`. Converting them was not
done for two reasons. Those modules belong to other sessions, and the
compile-forced one-line repoint is already the minimum intrusion; a second
discretionary rewrite of eleven files across five modules is a merge
hazard, not an improvement. Separately, a cross-module barrel import pulls
all seventeen ticket controllers and services into that module's graph,
which is how a cycle gets introduced — the real seam for a cross-module
caller is DI through `ProjectsModule`, not a file path. The deep imports
predate this ticket.

## Defects found while verifying

Two the move introduced, both caught by `tsc` and neither by any test: the
barrel re-exported `TICKETS_PERMISSION` from `ticket-status.util`, which
does not export it, and the two key-route e2e specs resolved
`test/helpers/sign-token` one directory short because `test/` sits at the
repo root rather than under `src/`.

One the move exposed: both copies of
`ticket-event-delivery-identity.db.spec.ts` were tracked, and the surviving
one was the stale version asserting exactly-once delivery. The database
says otherwise — an `IN_FLIGHT` inbox row is reclaimable with no lease, so
`claim()` is at-least-once. The corrected spec now lives at the new path
and passes eight tests against local PostgreSQL 18.

Three unrelated suites were red and are now green: the cycle binding scan
read `projects-tickets-update.service.ts` for a guard that the write
consolidation had moved into `apply-ticket-change`, and four test modules
omitted two of `ProjectsTicketsQueryService`'s five constructor arguments,
so 28 tests — workflow fail-open enforcement and bulk fail-whole
authorization among them — errored before reaching an assertion.

## Premise correction 2026-09-27

The eleven files count is accurate for non-spec application code.
Remeasured: 11 non-spec files across agent-access (1), ai/core (3), cron (1),
feedbucket (5), integrations/git (1) — unchanged from the original count.
An additional 8 spec files in the same modules also import deep into
`core/tickets/`, not counted in the ticket's tally.

Criterion 3 (nothing outside the group reaches in except through the shared
surface) is now split in two:
- Sibling build submodules (`src/modules/build/**` outside `core/`): 0 violations,
  enforced going forward by `check:build-core-surface` (ticket 28, 2026-09-27).
- External modules (agent-access, ai/core, cron, feedbucket, integrations/git):
  11 non-spec callers remain, all in fenced territory belonging to other lanes.
  Criterion 3 stays unticked for this reason.

## Remeasurement 2026-09-28 — the external half is closed, the sibling half is not

Measured repo-wide over `src/` and `test/` (9,317 files, 807 specifiers aimed
into `build/core`), resolving every specifier against its importer:

- **External modules: 0.** All eleven non-spec callers, and the eight spec
  callers alongside them, now enter through a sanctioned barrel — `build/core`
  or `build/core/tickets`. Not one deep `from`-import into `core/tickets/`
  remains anywhere outside `build/core/`.
- **`core/` siblings: 25.** Unchanged in kind from the nine this ticket first
  recorded, and still under the same cycle tension. Among them
  `analytics/projects-reports.service.ts`, `automation/build-automation-actions.service.ts`,
  `custom-fields/projects-custom-fields.service.ts`,
  `custom-states/projects-custom-states.service.ts`,
  `members/projects-members.service.ts`,
  `notifications/build-notification-context.service.ts`,
  `project-crud/projects-query.service.ts`, `releases/projects-releases.service.ts`,
  `roadmap/projects-roadmap.service.ts` and `projects.module.ts`.
- Three `jest.mock` automocks name an implementation module deeply
  (`feedbucket/tests/` ×2, `build/execution/execution-cross-project-binding.spec.ts`).
  These are test-harness targets, not dependency edges: mocking a 26-export
  barrel would replace unrelated exports. They are left as they are.

**Criterion 3 stays unticked, and the reason is now the sibling half alone.**

This ticket's own first reason for not ticking it — nine `core/` siblings that
cannot reach the barrel without a cycle BE-10 forbids — is unchanged, and
closing it means moving the shared seams out to where both sides can depend on
them, which is ticket 01's job. The second reason, the external callers, is
fully closed.

The sibling half is not a harmless exemption. Ticket 27 found eight suites that
had been dead since `project-access` moved, every one of them an intra-`build`
deep reach that no gate could see. Deep paths inside the tree are exactly the
fragility this criterion exists to remove.

The closed half can no longer regress: `check:build-core-surface` now fences the
tickets group repo-wide rather than across `src/modules/build/**` only, and
resolves `jest.mock`, `require` and dynamic `import` specifiers as well as
`from`, failing any that points at nothing on disk. See ticket 27.

## Correction to "External modules: 0" — 2026-09-28 (Lane-Adj-A)

The remeasurement above claims "External modules: 0." One external non-spec caller was missed: `backend/src/modules/goals/goals.service.ts:25` imports `TicketVersionConflictException` directly from `../build/core/tickets/ticket-version-conflict.exception` rather than from the barrel. `TicketVersionConflictException` is exported from the barrel (`core/tickets/index.ts:22`), so the bypass is gratuitous — the file could route through the barrel. A second call site is the spec `goals-edit-tokens-and-rollup.spec.ts:7` (same import, same file).

Additionally `build/import-export/ticket-points-column.spec.ts:7` imports `queryTickets` from `../core/tickets/projects-tickets-read.query` — `queryTickets` is not in the barrel, so this import is forced. That file is in `build/import-export/`, outside `build/core/`.

Criterion 3 stays unticked. The sibling half (thirteen-plus non-spec imports across `analytics`, `automation`, `custom-fields`, `custom-states`, `members`, `notifications`, `project-crud`, `releases`, `roadmap`, `webhooks` and `projects.module.ts`) is the primary blocker; the `goals/` external bypass is an additional violation the gate (`check:build-core-surface`) should cover. What would settle it: zero results from `grep -r "from.*core/tickets/" backend/src --include="*.ts" -l` outside `build/core/tickets/` and `build/core/index.ts`.

## Closure of the external-half violations — 2026-09-28 (Lane-25)

The two external violations noted by Lane-Adj-A are now closed.

`goals.service.ts` was repointed to the barrel in an earlier lane. Lane-25
closes `build/import-export/ticket-points-column.spec.ts:7`: `queryTickets`
was added to `core/index.ts` (`export { queryTickets } from "./tickets/projects-tickets-read.query"`)
and the spec's import was changed from `"../core/tickets/projects-tickets-read.query"` to `"../core"`.
`queryTickets` imports only from `db/drizzle.module`, `drizzle-orm` and `db/schema`; no cycle risk.

Search run: `grep -rn "from.*['\"].*tickets/" src/modules/build/core --include="*.ts"` (excluding
`core/tickets/` and `core/index.ts`), and `node src/scripts/check-build-core-surface.mjs`.

Gate result after fix:
`OK — 314 sibling submodule file(s) scanned; 0 deep core imports.`
`OK — 9329 repo file(s) scanned, 822 specifier(s) aimed into build/core; 0 unresolved, 0 external reaches past the core/tickets barrel.`

`tsc -p tsconfig.json --noEmit` error count: 0. `tsc -p tsconfig.test.json --noEmit` error count: 0.
Build jest suite: 266 suites / 2470 tests, all passing (baseline unchanged).

**Remaining violations — `core/` siblings (not in gate scope, not in Lane-25 write territory):**
13 non-spec imports across `analytics/projects-reports.service.ts:18`,
`automation/build-automation-actions.service.ts:15`,
`custom-fields/projects-custom-fields.service.ts:14`,
`custom-states/projects-custom-states.service.ts:19–20`,
`members/projects-members.service.ts:48`,
`notifications/build-notification-context.service.ts:11`,
`project-crud/build-project-aggregate-access.ts:7`,
`project-crud/projects-query.service.ts:26`,
`projects.module.ts:62`,
`releases/projects-releases.service.ts:2`,
`roadmap/projects-roadmap.service.ts:2`,
`webhooks/projects-webhooks.service.ts:10`.
All are architectural blockers: either the importing file is itself exported from the barrel (routing
through it creates a direct `barrel → file → barrel` cycle), or the import chain forms the deeper
cycle the ticket has documented since the first write-up. Criterion 3 stays unticked.

## Verification

`tsc` reports zero unresolved modules. `check:module-di` finds every ticket
controller and service registered and reachable from `AppModule`; its eight
unregistered providers are all KB, expenses and billing. `check:cycles`
finds one cycle, in KB. `check:kebab-case` is clean. The Build backend suite
sits at 229 of 259 suites and 2314 of 2396 tests, unchanged by the barrel
conversion; the 82 failures are pre-existing and none is a module
resolution error — 68 are hand-rolled db doubles that lack a join the
service now issues, and 6 are fixtures missing the `version` field a peer
commit made required.
