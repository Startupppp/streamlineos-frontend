# Build Kill List

Reconciled 2026-09-22; re-checked 2026-09-23 after the Sprint/Cycle and QA Bug contractions were applied to production. Rows marked *historical*
record why a decision was taken; the condition they describe no longer holds and must not be
re-quoted as current.

| Delete/refuse | User job replacement | Evidence/rationale |
|---|---|---|
| PM Workspace (routes, permissions, tables) | Organization directly owns Products, Projects, Teams, Programs, Portfolios; a project without a product is an organization-level project | **EXECUTED.** Migration `1159_build_remove_pm_workspaces` drops `build.pm_workspaces`, `build.pm_workspace_memberships`, and every `pm_workspace_id` column; `build.project_workspace_members` is renamed to `build.build_members` (workspace relationship dropped, roster job kept). All `/build/workspaces*` endpoints, workspace permission keys, and physical workspace routes are deleted. Redirects preserve old deep links. |
| Standalone Drafts page | Recover drafts in Inbox | `/build/drafts` duplicates personal notification work. **Executed** — see below |
| Sprint route/model | Plan timeboxed work through Cycles | **EXECUTED 2026-09-22.** The routes are frozen with `GoneException`, `build.sprints` is dropped and archived, and `sprintId` was removed from the published contract. *Historical:* the production sidebar once pointed at a broken `/sprints`; that has not been true since the nav was pinned to `${basePath}/cycles` |
| Separate QA Bug lifecycle | Track defects as `WorkItem.type=BUG` with QA evidence | **EXECUTED 2026-09-22.** `build.bugs` and `test_run_results.linked_bug_id` are dropped; defects live on `tickets` + `work_item_qa_details`. Note the consolidation moved **zero** rows — the table was already empty |
| Project Analytics page | Understand delivery through Reports Overview | *Historical:* `/analytics` once rendered “Board” in production. It now renders its own `ProjectAnalyticsPage`, so the surviving rationale is duplication of report metrics, not a wrong-surface defect |
| Project Timeline page | See issues by time through Issues `view=timeline` | Same entities and filters; separate route fragments saved views |
| Project Saved Views page | Create/manage views inside Issues; administer in Settings | A view is configuration of Issues, not a destination |
| Project My Tickets page | Filter global My Work by project | Personal work has one cross-project owner |
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
| 2026-09-23 | `app/(authenticated)/build/[projectId]/timeline/` and `features/build/timeline/` | `/build/[projectId]/issues?view=timeline` | `next.config.ts` redirect |
| 2026-09-23 | `app/(authenticated)/build/[projectId]/bugs/` and `features/build/bugs/{bugs-page,bug-sheet,bug-schema}` | `/build/[projectId]/issues?type=BUG` | `next.config.ts` redirect |
| 2026-09-23 | `app/(authenticated)/build/[projectId]/analytics/` and `features/build/analytics/project-analytics-page` | `/build/[projectId]/reports?tab=overview` | `next.config.ts` redirect |
| 2026-09-23 | `app/(authenticated)/build/[projectId]/views/` and `features/build/views/views-page` | `/build/[projectId]/issues` | `next.config.ts` redirect |
| 2026-09-23 | `app/(authenticated)/build/[projectId]/ai/` and the 12 assistant-only files in `features/build/ai/` | `/build/command-center?projectId=…` | `next.config.ts` redirect |
| 2026-09-23 | `app/(authenticated)/build/customers/` and `features/build/customers/` | `/crm` | `next.config.ts` redirect |
| 2026-09-23 | `app/(authenticated)/build/workspaces/page.tsx` and the whole `workspaces/[pmWorkspaceId]/` tree (`page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`, and nested `overview`, `all-work`, `goals`, `products`, `roadmap`, `teams`) | `/build`, `/build/command-center`, `/build/all-work`, `/build/goals`, `/build/managed-products`, `/build/roadmap`, `/build/teams` (job split across these; no single replacement page) | `next.config.ts` redirects, one per source path; `/build/pm-workspaces` now redirects straight to `/build` instead of to the deleted `/build/workspaces` |

The 2026-09-22 rename of `/build/pm-workspaces` to `/build/workspaces` (row above) was superseded the next day: `/build/workspaces` itself is now deleted, not a live target. Read the 2026-09-23 row as authoritative for where each job lives today.

Six of the nine routes already had a `next.config.ts` redirect **and** a
redirect-only `page.tsx`. Configuration redirects are checked before the
filesystem, so those page files could never execute. The other three had their
redirect migrated into `next.config.ts` before the page was deleted, so no deep
link changed behaviour. **No redirect-only Build page remains**, and
`frontend/lib/build/build-redirect-route-removal.test.ts` keeps it that way.

The three `MOVE` rows whose targets had no page on disk — `/build/goal`,
`/build/goal/[goalId]` and `/build/pm-workspaces` — were executed on 2026-09-22
as directory renames. A rename moves the job rather than deleting it, so no
replacement had to be built first. `/build/workspaces` was, at that time, the
index above `/build/workspaces/[pmWorkspaceId]`, matching the
`portfolios`/`teams`/`managed-products` list-plus-detail shape. **That shape no
longer exists** — PM Workspace was removed entirely on 2026-09-23 (row above),
and `/build/pm-workspaces` now redirects straight to `/build`.

Every planned duplicate-route removal in this list is executed. Project Intake is not a removal candidate: it is the canonical request queue, while Forms owns definitions and Triage owns broader evidence classification.

Two notes on the executed rows, because both departed from the wording above:

- **The timeline deep link is `?view=timeline`, not `?layout=timeline`.** No
  `layout` parameter ever existed in the code; the shipped vocabulary was
  `?view=` with a `gantt` value. The value was renamed to `timeline` so the URL
  matches the product word. `parseViewType` still accepts `gantt`, so saved
  views and bookmarks predating the rename keep working.
- **Saved views still persist `layoutType: "gantt"`.** That column is a
  PostgreSQL enum (`viewLayoutEnum`) and the API's write schema is
  `z.enum(["board","list","table","calendar","gantt"])`, so `"timeline"` cannot
  be stored without a backend migration. `toSavedViewLayout` /
  `fromSavedViewLayout` (`frontend/lib/build/view-types.ts`) map across that
  boundary, and `view-types.test.ts` pins the round trip.

Re-verified 2026-09-24: `frontend/lib/build/build-route-manifest.ts` holds exactly **65 entries, all `KEEP`**, and `app/(authenticated)/build` contains exactly 65 `page.tsx` files. `build-route-manifest.test.ts` pins the manifest and disk tree in both directions.

The `/build/[projectId]/views` note that used to sit here is resolved: the executed
target is `/build/[projectId]/issues`, and the "plus Settings" half was never built
because it was a proposal rather than a recorded decision.

Sequencing, owners and acceptance criteria for these seven are P1-1 in
[`06-prioritized-backlog.md`](./06-prioritized-backlog.md).

## Refused work

Not pages — *work items* that are duplicate, obsolete or speculative. Each is recorded so it is
not picked up again. Retired 2026-09-22 during backlog reconciliation.

| Refused work | Why | Evidence |
|---|---|---|
| Re-authoring the Sprint/Cycle or QA Bug cutover migrations | The contraction already exists with rollback and invariant coverage; duplicate migration tags would create a second history for the same data transition | `backend/migrations/sql/a-sprint-cycle-*`, `backend/migrations/sql/b-qa-bug-*`, and [MIGRATION-RUNBOOK.md](./MIGRATION-RUNBOOK.md) |
| Chasing generated-file line-ending drift as a product defect | A generated blob that differs only by checkout line endings contains no semantic change; compare blobs or normalized output before editing generated artifacts | Generator commands in the relevant package scripts |
| Internally-simulated escrow or a held client balance | Holding client money against a database column is a regulated activity being imitated with a number. If payment protection is wanted, integrate a provider that actually holds the funds | [`08-build-os-flowcharts.md`](./08-build-os-flowcharts.md) P2 |
| Monolithic "consolidate Sprint/Cycle" and "consolidate QA Bug" backlog items | Both were single 8–15 d entries that hid the fact that the irreversible half depends on a deployment. They are replaced by staged tasks whose order is enforced | [`06-prioritized-backlog.md`](./06-prioritized-backlog.md) stages A–E |
| A second frontend `sprintId` compatibility shim | A contract that accepts `null` cannot tell whether the value stopped arriving; meeting agendas can silently return empty | `frontend/features/build/meetings/generate-agenda.ts` and the Cycle-only schemas |

## Acceptance criteria

- [ ] Every killed page has a migration target and caller census.
- [ ] Redirects are temporary, observable, and removed after deep-link migration.
- [ ] No removed surface retains a parallel schema, permission, cache key, or endpoint family.
- [ ] Product copy does not advertise removed or unimplemented capabilities.
