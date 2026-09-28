# Build Kill List

Reconciled 2026-09-22; re-checked 2026-09-23 after the Sprint/Cycle and QA Bug contractions were applied to production. Rows marked *historical*
record why a decision was taken; the condition they describe no longer holds and must not be
re-quoted as current.

| Delete/refuse | User job replacement | Evidence/rationale |
|---|---|---|
| PM Workspace (routes, permissions, tables) | Organization directly owns Products, Projects, Teams, Programs, Portfolios; a project without a product is an organization-level project | **EXECUTED.** Migration `1159_build_remove_pm_workspaces` drops `build.pm_workspaces`, `build.pm_workspace_memberships`, and every `pm_workspace_id` column; `build.project_workspace_members` is renamed to `build.build_members` (workspace relationship dropped, roster job kept). All `/build/workspaces*` endpoints, workspace permission keys, and physical workspace routes are deleted. Redirects preserve old deep links. |
| Standalone Drafts page | Recover drafts in Inbox | `/build/drafts` duplicates personal notification work. **Executed** — see below |
| Sprint route/model | Plan timeboxed work through Cycles | **EXECUTED 2026-09-22.** The routes are frozen with `GoneException`, `build.sprints` is dropped and archived, and `sprintId` was removed from the published contract. *Historical:* the production sidebar once pointed at a broken `/sprints`; that has not been true since the nav was pinned to `${basePath}/cycles`. **Tombstone retained deliberately (2026-09-27):** the frozen `SprintsService` (41 lines, every method throws `GoneException(FROZEN)` with the message `"Sprints are frozen. Use /build/:projectId/cycles — Cycles are the only iteration identity."`), `SprintsController` (`iterations.controller.ts:73-147`), two request schemas (`createSprintSchema`, `updateSprintSchema`), three response schemas (`sprintListItemSchema`, `sprintRowSchema`, `sprintDetailSchema`), and `sprint-create-frozen.spec.ts` (116 lines) are kept because deleting them converts a 410 with a migration hint naming the replacement into a silent 404 for any third-party or agent-tool caller still holding an old path. First-party traffic is handled by the `next.config.ts:168-171` redirect; the tombstone handles the rest. The sprint permission key question is also resolved: migration `1197_build_cycle_permissions.sql` renamed `build:sprints:view/manage` to `build:cycles:view/manage` and rewrote all existing grants in place across `role_permission_grants`, `user_permission_grants`, `permission_supported_scopes`, and `user_delegation_permissions`. |
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

Re-verified 2026-09-28: `frontend/lib/build/build-route-manifest.ts` holds exactly **75 entries, all `KEEP`** (`grep -c 'decision: "KEEP"'` = 75), and `app/(authenticated)/build` contains exactly 75 `page.tsx` files (`find … -name page.tsx | wc -l` = 75). The 75th entry is `/build/[projectId]/wiki/[pageId]/history` (`build-route-manifest.ts:85`), added in commit `4fc204b21`. `build-route-manifest.test.ts` pins the manifest and disk tree in both directions.

**The count-ratchet defect recorded on 2026-09-27 is FIXED and that note was stale.** It said "the count ratchet at `build-route-manifest.test.ts:33-34` still reads `toHaveLength(74)` — it has not been updated to match the 75th entry and will fail." Measured 2026-09-28: the assertion is at `build-route-manifest.test.ts:34` (one line, not 33-34) and reads `expect(BUILD_ROUTE_MANIFEST).toHaveLength(75)`. Manifest, disk tree and ratchet all agree at 75. The earlier "65" and "74" counts are both historical.

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

- [x] Every killed page has a migration target and caller census. The executed-removals table above lists each removed path, its "Job preserved at" target, and its "Deep link preserved by" redirect. `frontend/lib/build/build-redirect-route-removal.test.ts` and `build-route-manifest.test.ts` enforce that no redirect-only page file remains and the manifest matches the disk. Both directions are pinned.
- [ ] Redirects are temporary, observable, and removed after deep-link migration. **2026-09-28 NOT EARNED. Re-derived independently this lane; the 28 figure holds, the line range and the supporting totals are corrected.**

  Re-measured, `frontend/next.config.ts`:

  | Measurement | Command | Value |
  |---|---|---|
  | Build redirect entries | `grep -c 'source: "/build' next.config.ts` | **28** |
  | Of those, `permanent: false` | `grep -A4 'source: "/build' next.config.ts \| grep -oE "permanent: (true\|false)" \| sort \| uniq -c` | **28 false, 0 true** |
  | Build entries' line range | first and last `source: "/build` hit | **142–288** |
  | Redirects array total | `source: "` entries between `redirects: async () => [` (`:83`) and its closing `],` (`:342`) | **51** |
  | `permanent: false` repo-wide | `grep -c "permanent: false" next.config.ts` | **44** |
  | `permanent: true` repo-wide | `grep -c "permanent: true" next.config.ts` | **7** |
  | `source: "` entries repo-wide | `grep -c 'source: "' next.config.ts` | **53** |

  **CONFIRMED:** the "74 Build redirect entries" figure was indeed an error conflating the route-manifest count with the redirect count. 28 is correct, and all 28 are `permanent: false`.

  **CORRECTED — line range 141–290 → 142–288.** The Build entries run from `:142` (`source: "/build/:projectId(\\d+)"`) to `:288` (`source: "/build/workspaces"`).

  **CORRECTED — the "44 total" figure needed an explanation it did not have.** 44 is the count of `permanent: false` *repo-wide*, not the redirect total. The redirects array holds **51** entries: 44 temporary + 7 permanent. The 53 repo-wide `source: "` hits exceed 51 because 2 belong to the `headers` array further down (`:384` and `:393`), which is not a redirect at all. So the correct reading is: **28 of 51 redirects are Build-owned, and every one of the 28 is temporary.** The remaining 23 redirects (16 temporary + 7 permanent) are other modules'.

  **CORRECTED — the sprints redirect citation elsewhere in this document.** The frozen-Sprint row above cites `next.config.ts:168-171`; the entry is actually at **`:197-201`** (`source: "/build/:projectId(\\d+)/sprints"` → `/build/:projectId/cycles`, `permanent: false`).

  **THE DECISION THE OWNER MUST MAKE, in one sentence:** whether a Build redirect's removal is scheduled by a mechanism or left to whoever next reads this file.

  - **(A) Automated expiry.** Annotate each redirect with an `expiresAt` and add a gate failing the build once one is past it without a removal ticket. Cost: a new gate plus its self-test, 28 annotations, and a policy for what "expired" means when deep links are still arriving — which nobody can answer, because **no redirect-hit telemetry exists**. See below; this is the blocker, and (A) built without it just moves guesswork behind a gate.
  - **(B) Manual review — RECOMMENDED for now.** Cost: zero. `permanent: false` sends `307`, which browsers do not cache, so a stale redirect costs one extra server hop per request and cannot poison a cache. 28 entries is a reviewable list. Escalate to (A) if the Build count grows past ~60, at which point the list stops being eyeballable.

  **THE UNMET HALF, stated plainly: "observable" is NOT satisfied, and that is a gap, not a decision.** The box asks for three properties. *Temporary* is satisfied — 28/28 `permanent: false`. *Removed after deep-link migration* is what the (A)/(B) decision above is about. **Observable is simply absent**: a `next.config.ts` redirect is resolved by the Next.js routing layer before any application code runs, so no redirect hit is logged, counted or reported anywhere. There is therefore no evidence on which to decide that a deep link has finished migrating — removal today would be a guess either way. **This is recorded as a missing capability, not as an accepted design.** Closing it means emitting a counter per redirect source (the routing layer is `proxy.ts` on the Node runtime, per FE-09, which is where such a counter could live) and letting it fall to zero before removing the entry. Until then, (B) is honest and (A) is premature.
- [ ] No removed surface retains a parallel schema, permission, cache key, or endpoint family. **2026-09-28 NOT EARNED. Every tombstone claim re-verified this lane and all hold; but the re-verification found two parallel survivals the previous entry missed, so "the only exception is deliberate" is no longer accurate.**

  **THE DELIBERATE EXCEPTION — re-verified, unchanged.** The Sprint endpoint family (`/build/:projectId/sprints`) is retained as a 410 tombstone. Measured on disk:

  | Claim | Verified |
  |---|---|
  | `SprintsService` is 41 lines, every method throws `GoneException` | `wc -l src/modules/build/execution/sprints.service.ts` → **41**; `grep -c GoneException` → **6** |
  | `SprintsController` in `iterations.controller.ts` | class at **`:76`**, body `:76-147` (the previous "73-147" counted from the decorator block) |
  | Two request schemas | `createSprintSchema` (`dto/iterations.schemas.ts:17`), `updateSprintSchema` (`:34`) |
  | Three response schemas | `sprintListItemSchema` (`dto/execution-response.schemas.ts:11`), `sprintRowSchema` (`:40`), `sprintDetailSchema` (`:172`) |
  | `sprint-create-frozen.spec.ts` is 116 lines | **116** |
  | No `build.sprints` table | zero hits for a `sprints` table in `backend/src/db/schema/build/` |
  | First-party traffic redirected | `frontend/next.config.ts:197-201`, `permanent: false` (the "168-171" citation above was stale) |

  So the tombstone retains no DB table, no permission key (1197 renamed `build:sprints:*` → `build:cycles:*`) and no cache key. What survives is an HTTP adapter returning an informative 410 instead of a silent 404. That remains the right call and remains deliberate.

  **TWO PARALLEL SURVIVALS THE PREVIOUS ENTRY DID NOT ACCOUNT FOR.** Both are in scope for this box's wording — it says schema, permission, cache key **or endpoint family** — and neither is a permission or a table, which is why a permissions-and-tables check missed them.

  1. **A persisted `modules.sprints` project-settings flag with no reader.** `backend/src/db/schema/build/core.ts:53` declares `sprints: boolean` inside the project `settings.modules` type. `backend/src/modules/build/core/dto/project-core.schemas.ts:20` accepts it as `z.boolean()` on the wire. `projects-provision.service.ts:102` and `:215` default it to `true` on every new project, and `projects-settings-iterations.service.ts:51` defaults it to `false` when settings are absent. **A grep of `backend/src/modules/build` for `modules.sprints` / `settings.modules` readers returns zero non-spec hits** — nothing reads the flag. The frontend writes it from the project-create wizard (`frontend/features/build/project-create/use-project-create.ts:29,:46,:75`) and renders it as a user-facing toggle labelled "Sprints" with the description "Agile sprint cycles" (`steps/step-toggles.tsx:19`), echoed on the review step (`steps/step-review.tsx:54`). This is a parallel *schema* survival for a removed surface: users are asked to enable a module that no longer exists, the answer is persisted, and nothing consumes it. Routed to the orchestrator.
  2. **Two automation/webhook trigger events with no producer.** `backend/src/modules/build/core/dto/automation.schemas.ts:32-33` still accepts `"sprint.started"` and `"sprint.completed"` as automation trigger events, and `backend/src/modules/notifications/notification-events-build.catalog.ts:29` and `:33` register `build.sprint.started` ("Sprint started") and `build.sprint.completed` ("Sprint completed") in the notification catalogue. **Neither has an emitter anywhere in the backend.** A grep for `build.sprint.` outside the catalogue returns three hits: `build-due-sweep.service.ts:166` emits `build.sprint.ending` (live), `iterations.controller.ts:93` is an `@Idempotent("build.sprint.create")` key on the frozen controller, and `execution-cross-project-binding.spec.ts:266` is a spec whose own name states the position — *"no sprint status change can emit `build.sprint.completed` any more, because the only producer of that event is frozen."* So a user can select two triggers and subscribe to two notifications that can never fire. Routed to the orchestrator.

  The live third event is worth noting as the contrast: `build.sprint.ending` has a real producer and its user-visible copy is already correct — `title: "Cycle ending tomorrow: <name>"`, `message: "You still have open tickets in this cycle."` (`build-due-sweep.service.ts:167-171`). Only the internal event key retains the old word, which is harmless. The catalogue label for it, however, still reads "Sprint ending soon" (`:30`) — see the product-copy box below.

  **NOT A REQUIREMENT:** the two survivals above are defects to remove, not sanctioned tombstones. The Sprint 410 adapter is the *only* deliberate retention on this list, and the reason it is deliberate is that deleting it converts an informative 410 into a silent 404 for third-party and agent-tool callers. No such argument applies to a settings flag nothing reads or to a trigger nothing emits — those cost a user a choice that does nothing.
- [ ] Product copy does not advertise removed or unimplemented capabilities. **2026-09-28 NOT EARNED. The previous entry proposed option (A) as the settling check and asserted its result without running it. This lane ran it. The asserted result was FALSE.**

  **CLAIM WITHDRAWN.** The previous entry's settling evidence read: "`grep -r "PM Workspace\|Sprint " frontend/features/ frontend/app/` returns no visible UI strings outside the tombstone and migration docs." Run this lane, the grep returns **72 hits for `\bSprint\b` and 4 for `PM Workspace`** across `frontend/features/` and `frontend/app/`; **65 of the sprint hits are in non-test files**, and a substantial number are user-visible strings. The check was the right check; it was recorded as passing without being executed.

  **PM Workspace — CLEAN.** All 4 hits are test *descriptions* asserting the removal, which is the correct place for the words to survive: `build-quick-create.test.tsx:157,:236`, `use-build-scope-directory.test.ts:312`, `use-build-list-url-state.test.ts:179`. Nothing user-visible.

  **Sprint — NOT CLEAN. User-visible product copy, by surface:**

  | Surface | Line | String |
  |---|---|---|
  | Project-create wizard, module toggles | `features/build/project-create/steps/step-toggles.tsx:19` | `label: "Sprints"`, `desc: "Agile sprint cycles"` |
  | Project-create wizard, review step | `features/build/project-create/steps/step-review.tsx:54` | `["Sprints", draft.modules.sprints]` |
  | Project-create wizard, project-type step | `features/build/project-create/steps/step-type.tsx:19` | `desc: "Sprints & velocity"` (Scrum Software) |
  | Project webhooks, event picker | `features/build/webhooks/project-webhooks-page.tsx:89,:90` | `label: "Sprint Started"`, `label: "Sprint Completed"` |
  | Project webhooks, section copy | `features/build/webhooks/project-webhooks-page.tsx:361` | `"Get notified in real-time when tickets, sprints, or members change."` |
  | Project settings, danger zone | `features/build/settings/danger-zone-section.tsx:38` | prose ending `"sprints, and associated data."` |
  | QA test-run sheet | `features/build/qa/test-run-sheet.tsx:149` | `placeholder="e.g. Sprint 12 Regression"` |
  | Whiteboard create dialog | `features/build/whiteboard/create-board-dialog.tsx:70` | `placeholder="e.g. Sprint brainstorm"` |
  | Dashboard section heading | `features/dashboard/dashboard-deferred-body.tsx:347` | `sectionLabel="Active sprint"` (renders `features/dashboard/sprint-card.tsx`) |
  | Notification preferences catalogue | `backend/.../notification-events-build.catalog.ts:29,:30,:33` | `"Sprint started"`, `"Sprint ending soon"`, `"Sprint completed"` |

  **These are not one class of problem — they are three, and they need different fixes:**

  1. **Copy that advertises a capability that cannot fire.** The two webhook trigger labels ("Sprint Started", "Sprint Completed") and the two notification catalogue entries `build.sprint.started` / `build.sprint.completed` name events with **no producer anywhere in the backend** — see the box above for the grep. A user can select them and subscribe to them and nothing will ever happen. This is the exact failure this box exists to prevent, and it is the only class that is a functional defect rather than a wording defect.
  2. **Copy that advertises a removed module.** The three project-create wizard strings offer a "Sprints" module whose persisted flag (`modules.sprints`) has zero readers — see the box above. The toggle works, the value is stored, and it controls nothing.
  3. **Stale vocabulary in otherwise-working copy.** The two placeholders, the danger-zone prose, the webhooks section description, the dashboard "Active sprint" heading, and the "Sprint ending soon" catalogue label all sit on live, functioning surfaces; only the word is wrong. `build.sprint.ending` in particular has a live producer whose own title and body already say "Cycle" — only the catalogue label lags.

  Two further hits are **design-system showcase filler**, not product copy: `features/build/settings/settings-gallery.tsx:43,:126` and `features/build/views/execution-core-gallery.tsx:33,:34,:129,:148` and `features/build/whiteboard/content-intake-gallery.tsx:53` render at `/design-system/settings`, `/design-system/execution-core` and `/design-system/content-intake` under `app/(public)/`. They are publicly reachable, so they are not invisible, but sample data in a component gallery advertises nothing. Lowest priority.

  All of the above are source files and out of this lane's write scope. Routed to the orchestrator.

  **THE DECISION THE OWNER MUST MAKE, in one sentence:** whether a grep for retired feature vocabulary becomes a gate, or stays a pre-ship checklist step.

  - **(A) Gate it.** A scan of UI string literals in `frontend/features/` and `frontend/app/` for a retired-vocabulary list. Cost: must distinguish a user-visible string literal from a test description, an event key, a sample-data name and a type identifier — this lane's raw grep produced 72 hits of which roughly 10 are the real finding, so a naive gate is ~85% noise and would need every one of the survivors allowlisted. Buildable, but only with an allowlist seeded from the classification above, and only after class 1 and class 2 are actually fixed — otherwise the gate's first act is to be switched off.
  - **(B) Pre-ship checklist step.** Cost: zero to build; the grep is seconds to run. This is what the previous entry chose, and the reason it failed is instructive: **the check was cheap and still was not run.** A checklist item that is recorded as passing without executing is worse than no item, because it manufactures evidence.
  - **(C) Accept the removal table as sufficient.** Cost: zero. Refuted by the measurement above — the removal table is complete and accurate about *routes*, and every one of the ten findings above survived it, because copy is not a route.

  **Recommended: fix classes 1 and 2 first, then (A) with an allowlist seeded from the table above.** Class 1 is a functional defect and should not wait for a gate decision. (C) is disproven. (B) alone is what produced the false claim this entry withdraws.

  **NOT A REQUIREMENT:** none of the ten findings is sanctioned. In particular the surviving internal event keys (`build.sprint.ending`, `sprint_changed`, `sprint.started`) are a separate question from the labels — a stored enum value or a historical activity type may reasonably keep its old name so existing rows stay readable, but the **label a user sees** may not. Where this document records a stale word as low priority, that is a ranking, not an exemption.
