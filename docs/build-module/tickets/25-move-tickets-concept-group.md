# 25 — Group the ticket concept into its own directory

**What to build:** Everything about a ticket lives in one place. Roughly 65 files concerning tickets — create, read, update, detail, transfer, bulk mutation, workflow, ranking, capacity, comments, checklists, links, relations — currently sit as flat peers among 227 files, so answering "how does ticket ranking work?" means scanning filenames for a prefix.

Move them under a named directory. Structure only; no logic changes.

**Blocked by:** 01 — Publish the Build core shared surface.

**Status:** done except the cross-module callers

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
