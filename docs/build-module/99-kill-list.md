# Build Kill List

Reconciled 2026-09-22; re-checked 2026-09-23 after the Sprint/Cycle and QA Bug contractions were applied to production. Rows marked *historical*
record why a decision was taken; the condition they describe no longer holds and must not be
re-quoted as current.

| Delete/refuse | User job replacement | Evidence/rationale |
|---|---|---|
| Standalone Drafts page | Recover drafts in Inbox | `/build/drafts` duplicates personal notification work. **Executed** — see below |
| Sprint route/model | Plan timeboxed work through Cycles | **EXECUTED 2026-09-22.** The routes are frozen with `GoneException`, `build.sprints` is dropped and archived, and `sprintId` was removed from the published contract. *Historical:* the production sidebar once pointed at a broken `/sprints`; that has not been true since the nav was pinned to `${basePath}/cycles` |
| Separate QA Bug lifecycle | Track defects as `WorkItem.type=BUG` with QA evidence | **EXECUTED 2026-09-22.** `build.bugs` and `test_run_results.linked_bug_id` are dropped; defects live on `tickets` + `work_item_qa_details`. Note the consolidation moved **zero** rows — the table was already empty |
| Project Analytics page | Understand delivery through Reports Overview | *Historical:* `/analytics` once rendered “Board” in production. It now renders its own `ProjectAnalyticsPage`, so the surviving rationale is duplication of report metrics, not a wrong-surface defect |
| Project Timeline page | See issues by time through Issues `layout=timeline` | Same entities and filters; separate route fragments saved views |
| Project Saved Views page | Create/manage views inside Issues; administer in Settings | A view is configuration of Issues, not a destination |
| Project My Tickets page | Filter global My Work by project | Personal work has one cross-project owner |
| Authenticated Intake page | Configure Forms and process submissions in Triage | Avoids duplicate submission state and conversion logic |
| Standalone Bugs page | Issues filtered to BUG | Canonical work item owns lifecycle |
| Standalone AI page | Contextual assistant plus Command Center runs | A chat landing page without durable action ownership is noise |
| Operational Automations/Webhooks/Workflow pages | Configure under Project Settings | They are configuration, not daily navigation |
| Build-owned Library | Use Knowledge Library with project-filtered Wiki projection | `frontend/features/wiki/components/wiki-sidebar-nav.tsx` owns Library |
| Project Activity hub | Recent activity on Overview; full activity on each record | Avoids another unbounded feed |
| Governance hub | Direct Risks, Decisions, Approvals, Changes, Incidents | A hub adds navigation without a distinct user job |
| Project Calendar | Use global Calendar with Build source filters | Calendar owns events and scheduling |
| Build customer master | Link to CRM customers/deals | CRM owns identity and lifecycle |
| Build time-entry master | Link to Timesheets | Timesheets owns entries, rates, approval, payroll effects |
| Decorative AI summaries without citations/freshness | Durable cited proposal or no AI | Trust beats novelty |
| Unlimited custom statuses/fields/views | Bounded, archived, governed configuration | Prevents unusable filters and schema/query explosion |

## Executed removals

Physical pages removed from disk, with the user job preserved at the target.
Full dependency census in
[`DEAD-BUILD-SURFACE-INVENTORY.md`](./DEAD-BUILD-SURFACE-INVENTORY.md).

| Date | Removed | Job preserved at | Deep link preserved by |
|---|---|---|---|
| 2026-09-22 | `app/(authenticated)/build/access/page.tsx` | `/build/settings/access` | `next.config.ts` redirect |
| 2026-09-22 | `app/(authenticated)/build/members/page.tsx`, `error.tsx` | `/build/settings/access` | `next.config.ts` redirect |
| 2026-09-22 | `app/(authenticated)/build/client-access/page.tsx`, `loading.tsx` | `/build/settings/client-access` | `next.config.ts` redirect |
| 2026-09-22 | `app/(authenticated)/build/[projectId]/workflow/page.tsx`, `error.tsx`, `loading.tsx` | `/build/[projectId]/settings/workflow` | `next.config.ts` redirect |
| 2026-09-22 | `app/(authenticated)/build/[projectId]/automations/page.tsx`, `loading.tsx` | `/build/[projectId]/settings/automations` | `next.config.ts` redirect |
| 2026-09-22 | `app/(authenticated)/build/[projectId]/webhooks/page.tsx`, `loading.tsx` | `/build/[projectId]/settings/integrations/webhooks` | `next.config.ts` redirect |
| 2026-09-22 | `app/(authenticated)/build/drafts/page.tsx` | `/build/inbox?view=drafts` | redirect **moved into** `next.config.ts` |
| 2026-09-22 | `app/(authenticated)/build/[projectId]/my-tickets/` | `/build/my-work?projectId=…` | redirect **moved into** `next.config.ts` |
| 2026-09-22 | `app/(authenticated)/build/workspaces/[pmWorkspaceId]/my-work/page.tsx` | `/build/my-work?pmWorkspaceId=…` | redirect **moved into** `next.config.ts` |
| 2026-09-22 | `features/build/my-tickets/{my-tickets-page,my-tickets-view-body,my-tickets-skeleton,my-tickets-view}` and tests | `/build/my-work` | a11y coverage repointed at `AllWorkListSkeleton` |
| 2026-09-22 | `features/build/drafts/comment-drafts-page.tsx` and its test | `/build/inbox?view=drafts` | drafts composed inside the Inbox |
| 2026-09-22 | `app/(authenticated)/build/goal/` (renamed) | `/build/goals` | `next.config.ts` redirect |
| 2026-09-22 | `app/(authenticated)/build/goal/[goalId]/` (renamed) | `/build/goals/[goalId]` | `next.config.ts` redirect |
| 2026-09-22 | `app/(authenticated)/build/pm-workspaces/` (renamed) | `/build/workspaces` | `next.config.ts` redirect |

Six of the nine routes already had a `next.config.ts` redirect **and** a
redirect-only `page.tsx`. Configuration redirects are checked before the
filesystem, so those page files could never execute. The other three had their
redirect migrated into `next.config.ts` before the page was deleted, so no deep
link changed behaviour. **No redirect-only Build page remains**, and
`frontend/lib/build/build-redirect-route-removal.test.ts` keeps it that way.

The three `MOVE` rows whose targets had no page on disk — `/build/goal`,
`/build/goal/[goalId]` and `/build/pm-workspaces` — were executed on 2026-09-22
as directory renames. A rename moves the job rather than deleting it, so no
replacement had to be built first. `/build/workspaces` is now the index above
the existing `/build/workspaces/[pmWorkspaceId]`, matching the
`portfolios`/`teams`/`managed-products` list-plus-detail shape.

Still not executed, and why — each is a kill-list entry whose replacement does
not exist yet, so removing the page would delete the job rather than move it:

| Route | Replacement it needs first |
|---|---|
| `/build/[projectId]/timeline` | `layout=timeline` on `/build/[projectId]/issues` |
| `/build/[projectId]/bugs` | `type=BUG` filtering on `/build/[projectId]/issues` |
| `/build/[projectId]/analytics` | `tab=overview` on `/build/[projectId]/reports` |
| `/build/[projectId]/views` | saved-view management inside Issues plus Settings |
| `/build/[projectId]/intake` | the Forms-definitions / Triage-submissions split |
| `/build/[projectId]/ai` | `projectId=` run history on `/build/command-center` |
| `/build/customers` | the CRM customer linkage `/crm` owns |

Each keeps its page, its sidebar destination and its route-access gate until the
target behaviour ships. The route manifest records the intended target for all
seven, so the disposition is not lost.

Re-verified 2026-09-22: `frontend/lib/build/build-route-manifest.ts` holds exactly **79 entries,
7 of them non-KEEP** — 6 `CONSOLIDATE` and 1 `DELETE` — matching the seven rows above
one for one, and `app/(authenticated)/build` contains exactly 79 `page.tsx` files.

Two replacement descriptions above are broader than the manifest target and should not be read
as authority:

- `/build/[projectId]/views` — the manifest target is `/build/[projectId]/issues`. "Plus Settings" is a proposal, not a recorded decision.
- `/build/[projectId]/intake` — the manifest target is `/build/[projectId]/forms`, with no Triage half. The Forms-definitions / Triage-submissions split is an **open question**, not a decision; see [`99-open-questions.md`](./99-open-questions.md).

Sequencing, owners and acceptance criteria for these seven are P1-1 in
[`06-prioritized-backlog.md`](./06-prioritized-backlog.md).

## Refused work

Not pages — *work items* that are duplicate, obsolete or speculative. Each is recorded so it is
not picked up again. Retired 2026-09-22 during backlog reconciliation.

| Refused work | Why | Evidence |
|---|---|---|
| Re-authoring the Sprint/Cycle or QA Bug cutover migrations | Both plans already exist, fully authored with rollbacks and spec coverage, and phases 01–03 / 01–02 are applied to production. One agent wrote duplicate migrations `1145`/`1146` before this was discovered; they were deleted | 18 files in `backend/migrations/sql/` matching `a-sprint-cycle-*` and `b-qa-bug-*`; `NEXT-CLOSURE-STATUS.md:138-147` |
| Chasing `check:permission-catalog` and `check:build-execution-plan` failures on a fresh Windows checkout | The generator writes LF, a Windows checkout holds CRLF, and the regenerated file is the **same git blob** as `main`'s. The gate fails on line endings regardless of content. Fixing "the drift" changes nothing | `NEXT-CLOSURE-STATUS.md:73-80`; blob `bddf8207dc2ddfaa714d6cd73e9706cee20b996d`, 24762 vs 25606 bytes |
| Internally-simulated escrow or a held client balance | Holding client money against a database column is a regulated activity being imitated with a number. If payment protection is wanted, integrate a provider that actually holds the funds | [`08-build-os-flowcharts.md`](./08-build-os-flowcharts.md) P2 |
| Monolithic "consolidate Sprint/Cycle" and "consolidate QA Bug" backlog items | Both were single 8–15 d entries that hid the fact that the irreversible half depends on a deployment. They are replaced by staged tasks whose order is enforced | [`06-prioritized-backlog.md`](./06-prioritized-backlog.md) stages A–E |
| A second frontend `sprintId` compatibility shim | `sprintId: null` already shipped once as "backward compatibility". A contract that accepts `null` cannot tell you the value stopped arriving; meeting agendas would have silently come back empty | `NEXT-CLOSURE-STATUS.md:104-107`; `frontend/features/build/meetings/generate-agenda.ts` |

## Acceptance criteria

- [ ] Every killed page has a migration target and caller census.
- [ ] Redirects are temporary, observable, and removed after deep-link migration.
- [ ] No removed surface retains a parallel schema, permission, cache key, or endpoint family.
- [ ] Product copy does not advertise removed or unimplemented capabilities.
