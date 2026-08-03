# Projects Overhaul + Members/Teams — Consolidated Execution Plan
**Date:** 2026-07-25  
**Author:** AI plan synthesis  
**Scope:** 20 implementation specs across backend efficiency, schema, shared primitives, page structure/routing, data-layer & responsive, inline AI, and Members/Teams feature.

---

## A. Verdict Table

| Unit | Title (abbreviated) | Verdict |
|------|---------------------|---------|
| 01 | Paginate GET /projects/my-work | **ready** |
| 02 | Bound GET /projects/:id/tickets/export (cap 5000) | **ready** |
| 03 | Bound attachments in getTicket (cap 20 + count) | **ready** |
| 04 | Kill N+1 ancestor walks — recursive CTE | **ready** |
| 05 | dto/projects.schemas.ts split + member-role enum fix | **ready** |
| 06 | Split oversized backend projects-module files | **ready** |
| 07 | Additive index migration (project_statuses, tickets, etc.) | **ready** |
| 08 | Cross-tenant hardening: org_id on work_item_relations | **ready** |
| 09 | Add deleted_at soft-delete to tickets, projects, ticket_comments | **ready** |
| 10 | BoardCard + BoardColumn shared primitives | **ready** |
| 11 | Consolidate badges — PriorityBadge to shared | **ready** |
| 12 | Retire UserCombobox, extract MemberCommandList | **ready** |
| 13 | Delete dead routes + fix links (Projects module) | **disproven** |
| 14 | Add missing error.tsx and loading.tsx to all projects routes | **ready** |
| 15 | Page splits (oversized page/feature files) | **ready** |
| 16 | QueryClient defaults, debounced search, RBAC-gated queries | **needs-decision** |
| 17 | AiActionsMenu on ticket-detail and project-overview surfaces | **ready** |
| 18 | Teams-to-Project assignment junction (project_team_assignments schema) | **ready** |
| 19 | Teams API: assign/unassign, effective-roster, add-person-to-workspace | **needs-decision** |
| 20 | Teams frontend: members page, teams module, effective-roster surface | **needs-decision** |

**Summary:** 16 ready · 3 needs-decision · 1 disproven

---

## B. Disproven Flags

### Unit 13 — Delete dead routes + fix links (Projects module)
**Reason:** The audit claim that five pages are dead is only partially correct. Only **two** of the five named files are true dead redirect stubs:
- `[projectId]/workload/page.tsx` — redirects to `?view=workload` which is already the canonical URL used by `project-nav-config.ts` and `use-project-nav.ts`. No inbound links anywhere.
- `[projectId]/pages/page.tsx` — unconditionally calls `redirect('/knowledge')`. No inbound links.

The **other three must stay:**
- `projects/page.tsx` — legitimate re-export barrel (`export { default } from "./all/page"`) serving the `/projects` canonical route referenced by sidebar, project-switcher, and error views.
- `projects/customers/page.tsx` — wraps real `CustomerPage` feature, linked from sidebar nav.
- `projects/portfolios/page.tsx` — wraps real `PortfoliosPage`, linked from sidebar nav and `command-center-actions`.

**Verdict adjustment:** The unit is partially valid. Only the two redirect stubs should be deleted. The original spec's scope of 5 deletions is incorrect. Accepted scope: delete exactly 2 files.

---

## C. Open Questions Grouped

### C1. Members/Teams Design Decisions — CALL OUT TO USER FIRST

> **These three decisions block all of Slice 7 (Members/Teams). Answer before any implementation begins.**

**Q-MT-1: Team-to-project relationship model** (blocks Unit 18, 19, 20)
- Option **A — Implicit:** A team is "on a project" when any of its members are direct project members. No migration, no new routes, no explicit assignment. Current inferred behavior in `projects.service.ts`.
- Option **B — Explicit:** New `project_team_assignments` join table + assign/unassign routes + backend DTO. Allows assigning an entire team to a project in one action and querying "which teams are on project X?" independently of membership overlap. **Unit 18 fully specifies this path.**

Unit 18 is marked **ready** assuming Option B. If Option A is chosen, Unit 18 is unnecessary and Units 19–20 are greatly simplified.

**Q-MT-2: What does POST /projects/members (add-person-to-workspace) actually do?** (blocks Unit 19, 20)
- Option **A:** No-op / alias — all org members are already discoverable. Return 200/201 trivially.
- Option **B:** Add user to `userModuleAccess` table for the `projects` module (module-level access gate).
- Option **C:** Trigger an org-level invitation flow for a user not yet in the org (re-uses `useInviteUser`, shows email input instead of `MemberPicker`).
The current `GET /projects/members` delegates to `usersService.listUsers(orgId)` which lists all org members — there is no concept of a separate "projects workspace member." A decision here changes the frontend `AddWorkspaceMemberButton` implementation materially.

**Q-MT-3: Effective roster query strategy** (blocks Unit 19, 20)
- Option **A:** Client-side fan-out: `useProjectTeamAssignments(projectId)` + one `useProjectTeamMembers(teamId)` per assigned team in parallel. Simple, N+1 risk for projects with many teams.
- Option **B:** Single backend endpoint `GET /projects/:projectId/effective-roster` returning the UNION in one call (the SQL pattern is already specced in Unit 18's migration comment).
Option B is recommended to avoid the N+1 risk and is consistent with CLAUDE.md §11 "Never hydrate a collection through a parent-detail endpoint."

---

### C2. Export / Import

**Q-EX-1: CSV import strategy for tickets** (Unit 02)
The existing `POST /projects/:id/tickets/import` accepts a JSON body `{ rows: ImportTicketRow[] }`, not a raw CSV file. The spec's import UI in `ImportExportSettings` must either:
- **Path A:** Parse the uploaded CSV on the frontend (papaparse — confirm if already in deps with `grep -r papaparse frontend/package.json`) and POST the JSON body.
- **Path B:** Add a new backend endpoint `POST /projects/:id/tickets/import/csv` that accepts multipart CSV.
Path A is simpler. Confirm before implementing the import half of `ImportExportSettings`.

**Q-EX-2: SUBTASK exclusion from export** (Unit 02)
Should SUBTASK rows be excluded from ticket export by default? Re-importing them without their parent creates orphaned subtasks. If yes, add `.and(ne(tickets.type, 'SUBTASK'))` to the export where-clause.

**Q-EX-3: Export cap as plan-tier limit** (Unit 02)
Should the 5000-row export cap be a `PlanLimitsService` value (FREE=1000, PAID=5000, ENTERPRISE=unlimited) rather than a fixed constant? Given the existing `PlanLimitsService` pattern (CLAUDE.md §16), this is worth deciding before shipping.

---

### C3. Soft-Delete

**Q-SD-1: Restore/undelete path** (Unit 09)
Should there be a restore/undelete endpoint for projects and tickets? Restoring a project whose child tickets have number conflicts with live tickets requires a renumbering strategy. This is a product decision.

**Q-SD-2: Hard purge policy** (Unit 09)
Soft-deleted rows accumulate indefinitely. What is the retention window before a hard DELETE is safe (e.g. 30 days)? A background purge cron must be specced separately; without it tables grow unboundedly.

**Q-SD-3: Sprint/projectStatus/projectMember cascade** (Unit 09)
The current spec does NOT soft-delete sprints, `projectStatuses`, or `projectMembers` when a project is soft-deleted. They remain as orphaned-but-live rows. Is this acceptable, or should they also be tombstoned?

---

### C4. Schema / Migration

**Q-SCH-1: Unique index for project_team_assignments re-assignment** (Unit 18)
The unique index `uniq_project_team_assignments_org_proj_team` blocks re-assignment after soft-delete. Should the service use `INSERT ... ON CONFLICT DO UPDATE SET deleted_at = NULL` (upsert/restore) or should `unassignFromProject` be a hard DELETE (simpler, loses audit history)?

**Q-SCH-2: Roster endpoint location** (Unit 19)
Where should the effective roster live?
- `GET /projects/:projectId/roster` on `ProjectsByIdController` — most REST-correct.
- `GET /projects/teams/:teamId/roster` — returns members of a team that are on any project.
These answer different questions. Confirm the product use case.

---

### C5. Board Primitives

**Q-BP-1: KanbanColumnHeader custom header slot** (Unit 10)
The projects kanban column header has domain-specific features (rename-in-place, color picker, WIP limit indicator, drag handle for column reordering) not representable in `BoardColumnHeaderSlots`. Should `BoardColumn` expose a fully custom `headerSlot?: ReactNode` escape hatch, or should `KanbanColumnHeader` be refactored to map these into `header.dot`, `header.label`, `header.count`, `header.headerAction`, `header.dragHandleProps`? The spec assumes the latter minimal mapping.

**Q-BP-2: BoardColumn columnInnerRef typing** (Unit 10)
`@hello-pangea/dnd` types the Draggable inner ref as `(element?: HTMLElement | null) => void` (optional parameter). Confirm `columnInnerRef` should be typed to match exactly rather than the narrower `(el: HTMLElement | null) => void` to avoid strict-mode TS errors.

---

### C6. Query / Data Layer

**Q-QD-1: filter-command-menu.tsx ResponsivePopover migration** (Unit 16)
The `filter-command-menu.tsx` (659 lines) already achieves Drawer-on-mobile / Popover-on-desktop with swipe gestures, AnimatePresence step-slide, and a back-button header. Migrating to `ResponsivePopover` would be a cosmetic 3–4 line change to outermost wrappers while keeping all internal animation — is it worth doing, or should the file remain as-is?

---

## D. Slice 1 — Backend Efficiency

### Unit 01: Paginate GET /projects/my-work

**Files:**

| Path | Action | Change |
|------|--------|--------|
| `backend/src/modules/projects/dto/projects.schemas.ts` | modify | Add `myWorkQuerySchema` (page, limit ≤100, status csvArray) and `MyWorkQuery` type after `allWorkQuerySchema` block |
| `backend/src/modules/projects/projects-work-query.service.ts` | modify | Replace `getMyWork` hard-coded `.limit(100)` + raw array return with paginated envelope `{ data, total, page, limit, totalPages }` using `Promise.all` for data + count queries |
| `backend/src/modules/projects/projects-tickets.service.ts` | modify | Update `getMyWork` signature to accept `MyWorkQuery`, delegate to `workQuery.getMyWork` |
| `backend/src/modules/projects/projects-tickets.controller.ts` | modify | Accept `@Query(new ZodValidationPipe(myWorkQuerySchema))`, add `@RequirePermission("projects:tickets:view")` |
| `frontend/hooks/api/projects/my-work.ts` | delete | Dead file — `useMyWork()` imported nowhere |
| `frontend/types/projects/my-work.ts` | delete | `MyWorkItem` only imported by hook being deleted and `my-work-rows.tsx` |
| `frontend/features/projects/my-work/my-work-rows.tsx` | modify | Replace `MyWorkItem` import/type with `AllWorkTicket` (structurally compatible) |
| `frontend/features/projects/my-work/my-work-page.tsx` | modify | Add `useCan('projects:tickets:view')` gate, per-tab `useState` page, `TablePagination` below content column, reset pages on tab change |

**Reused primitives:** `TablePagination`, `useAllWork` / `PaginatedResponse<AllWorkTicket>`, `useCan`, `csvToStringArray`, `getAllWork` pagination pattern as reference.

**Migration SQL:** None.

**Acceptance:**
- `GET /projects/my-work?page=1&limit=50` returns `{ data, total, page, limit, totalPages }`.
- `?limit=101` returns 400.
- No `@RequirePermission` → 403.
- `canView=false` disables all four `useAllWork` calls.
- `TablePagination` renders and updates page state on click.
- TypeScript strict build passes; `MyWorkItem` and `useMyWork` fully removed.

**Risks:**
- `BucketSection` items type is `MyWorkItem[]`; must change to `AllWorkTicket[]` or TS errors.
- Bucket list after pagination shows only the current page's 50 tickets — product behavior change.
- `handleTabChange` must reset all four page states before `router.replace` or memos recompute with stale page.

---

### Unit 02: Bound GET /projects/:id/tickets/export (cap 5000)

**Files:**

| Path | Action | Change |
|------|--------|--------|
| `backend/src/modules/projects/projects-tickets-transfer.service.ts` | modify | Add `EXPORT_CAP = 5000`, change query to `.limit(5001)`, slice and return `{ rows, truncated, count }` |
| `backend/src/modules/projects/dto/projects.schemas.ts` | modify | Add `exportTicketRowSchema`, `exportTicketsResponseSchema` and exported types |
| `frontend/hooks/api/projects/import-export.ts` | modify | Update `ExportTicketsResponse` shape (`{ rows, truncated, count }`), add `gcTime: 0` |
| `frontend/lib/query-keys.ts` | modify | Add `ticketExport: (projectId) => [...base, 'projects', projectId, 'tickets', 'export']` |
| `frontend/features/projects/settings/import-export-settings.tsx` | create | ~80-line client component with export/import UI, inline CSV serialization, truncation warning toast |
| `frontend/app/(authenticated)/projects/[projectId]/settings/page.tsx` | modify | Add `'import-export'` to `SectionId`, nav item, and panel |

**Open questions before implementing import UI:** See Q-EX-1, Q-EX-2, Q-EX-3.

**Reused primitives:** `LoadingButton`, `apiClient.get()` / `apiClient.upload()`, `getErrorMessage`, `PmPanel`, `useAnimatedIcon`.

**Migration SQL:** None.

**Acceptance:**
- 5001-ticket project returns `truncated: true, count: 5000`.
- `EXPLAIN ANALYZE` shows `LIMIT 5001` in plan.
- Select projection has exactly 10 column refs, no `SELECT *`.
- Cross-tenant request returns 0 rows.
- Truncation toast fires alongside download (not instead of it).
- `gcTime: 0` prevents stale cached exports.

**Risks:**
- Old `ExportTicketRow.number` typed as `string` — now correctly `number` (integer column). Any future consumer expecting string will get TS error (feature, not bug).
- 5000 rows × ~300 bytes ≈ 1.5 MB in-memory JS string — acceptable but worth a comment.

---

### Unit 03: Bound attachments in getTicket (cap 20 + attachmentCount)

**Files:**

| Path | Action | Change |
|------|--------|--------|
| `backend/src/modules/projects/projects-tickets-read.service.ts` | modify | Add `limit: 20`, `orderBy: [desc(ticketAttachments.createdAt)]` to the `attachments` with-block; wrap ticket query in `Promise.all` alongside a `count()` query; return `{ ...ticket, attachmentCount }` |
| `frontend/types/projects/tasks.ts` | modify | Add `attachmentCount?: number` to `Ticket` interface |
| `frontend/features/projects/ticket-details/ticket-detail-main-section.tsx` | modify | After the attachment grid, add conditional "+N more attachments" note |

**Reused primitives:** `drizzle-orm count`, `desc`, `and`, `eq`, `ticketAttachments` table.

**Migration SQL:** None.

**Acceptance:**
- Response has ≤20 attachments, newest-first; `attachmentCount` equals actual total.
- `comments` still bounded at 50 (no change).
- `attachmentCount > attachments.length` renders "+N more" text.
- `useAddAttachment` invalidation correctly refreshes bounded list.

**Risks:**
- COUNT adds one extra DB round-trip per `getTicket`. Negligible at current load; can merge into window function later.
- `attachmentCount` is not in a Zod output schema (consistent with rest of projects module — no output schemas exist there).

---

### Unit 04: Kill N+1 ancestor walks — recursive CTE

**Files:**

| Path | Action | Change |
|------|--------|--------|
| `backend/src/modules/projects/projects-tickets.service.ts` | modify | Replace `assertValidParent` (while-loop, up to 100 queries) with `assertParentChainNoCycle(orgId, parentTicketId, projectId, forbiddenDescendantIds)` using single `WITH RECURSIVE` CTE; update `updateTicket` call site |
| `backend/src/modules/projects/projects-tickets-query.service.ts` | modify | Replace bulkUpdate ancestor walk (lines 219–249) with same CTE pattern; preserve the `selectedSet.has(parentTicketId)` self-reference guard |

**Reused primitives:** `db.execute(sql`...`)`, `sql` tagged template, `BadRequestException`, `NotFoundException`.

**Migration SQL:** None.

**Acceptance:**
- Unit tests: empty CTE rows → `BadRequestException('Parent ticket not found')`.
- Unit tests: depth-1 row wrong project → `'Parent must be in the same project'`.
- Unit tests: ancestor id in forbidden set → `'Cannot set parent: this would create a cycle'`.
- Unit tests: parentTicketId in forbiddenIds → throws immediately, no CTE issued.
- Integration: linear chain A→B→C, set C's parent to A — succeeds.
- Integration: descendant-as-parent — rejected.
- Query log confirms exactly ONE DB call per path (no while-loop iterations).

**Risks:**
- CTE returns `id`/`project_id` as `unknown`; `Number(r.id)` coercions guard against string-typed integers.
- Depth guard 100 preserved from original (pre-existing behavior).
- `createTicket` still does NOT call the cycle-guard — pre-existing gap, out of scope.

---

## Slice 2 — Schema

### Unit 05: dto/projects.schemas.ts split + member-role enum fix + listCustomStates projection

**Files:**

| Path | Action | Change |
|------|--------|--------|
| `backend/src/modules/projects/dto/projects.schemas.ts` | modify | Remove ticket/roadmap/template schemas; fix member-role enum to `["OWNER","ADMIN","CONTRIBUTOR"]`; add explicit `projectMemberRoleSchema` + `PROJECT_MEMBER_ROLES` const; export shared helpers `csvToStringArray`, `csvToIntArray` |
| `backend/src/modules/projects/dto/tickets.schemas.ts` | create | All ticket-domain schemas (recurrence, list/search/activity queries, create/update/bulk, comments, relations, watchers, labels, attachments, import, reactions) |
| `backend/src/modules/projects/dto/roadmap.schemas.ts` | create | Roadmap/feedback/changelog schemas |
| `backend/src/modules/projects/dto/templates.schemas.ts` | create | Template schemas + burnup/CFD analytics query schemas |
| All 24 backend importer files | modify | Update imports to new file paths (tickets.schemas, roadmap.schemas, templates.schemas) |
| `backend/src/modules/projects/projects-members.service.ts` | modify | Replace `listCustomStates` wildcard `.select()` with explicit 5-field projection (`id`, `name`, `color`, `type`, `order`) |
| `frontend/hooks/api/projects/projects.ts` | modify | Update `UpdateMemberRoleInput` to `"OWNER" | "ADMIN" | "CONTRIBUTOR"` |
| `frontend/features/projects/settings/project-members-section.tsx` | modify | Update `ProjectMemberRole` type and `ROLE_OPTIONS` (expose ADMIN/CONTRIBUTOR only; OWNER is read-only in picker) |

**Reused primitives:** `ZodValidationPipe`, `z.infer<typeof ...>` pattern, existing dto split pattern (e.g. `checklist.schemas.ts`, `releases.schemas.ts`).

**Migration SQL:** None.

**Acceptance:**
- `tsc --noEmit` passes on both repos with zero errors.
- `updateProjectMemberRoleSchema.parse({ role: 'MEMBER' })` throws `ZodError`.
- `updateProjectMemberRoleSchema.parse({ role: 'CONTRIBUTOR' })` succeeds.
- `GET /projects/:id/states` response objects contain only `id`, `name`, `color`, `type`, `order`.
- `projects.schemas.ts` drops below 200 lines.
- All 24 backend importers compile after import-path updates.

**Risks:**
- `projects-members.service.ts:81` checks `role === 'ADMIN'` for manage rights — OWNER holders cannot manage through that path. Verify if OWNER should also pass this guard (add `|| role === 'OWNER'`). Flagged but kept out of scope.
- `normalizeRole` in frontend previously mapped unknown → `'MEMBER'`; OWNER is now a valid display value with no picker option — ensure shadcn Select renders gracefully.

---

### Unit 06: Split oversized backend projects-module files

**Files:**

| Path | Action | Change |
|------|--------|--------|
| `backend/src/modules/projects/projects-tickets-create.service.ts` | create | Extract `createTicket`, `createFromFeedback`, `normalizeTicketType` from `projects-tickets.service.ts` (~310 lines) |
| `backend/src/modules/projects/tickets-helpers.ts` | modify | Add exported `syncTicketAssignees(db, ticketId, actorId, input)` (moved from private `syncAssignees`) |
| `backend/src/modules/projects/projects-tickets.service.ts` | modify | Keep thin delegations for `createTicket`/`createFromFeedback`; call `syncTicketAssignees` from helpers; inject `ProjectsTicketsCreateService` (~370 lines) |
| `backend/src/modules/projects/projects-ticket-links.service.ts` | create | Extract checklist CRUD + git-links + related-links from `projects-ticket-subresources.service.ts` (~245 lines) |
| `backend/src/modules/projects/projects-ticket-subresources.service.ts` | modify | Remove extracted methods, add thin delegations to `this.links.*` (~310 lines) |
| `backend/src/modules/projects/projects-labels-states.service.ts` | create | Extract label CRUD + custom-state CRUD from `projects-members.service.ts` (~255 lines) |
| `backend/src/modules/projects/projects-members.service.ts` | modify | Remove label/state methods; keep member CRUD + `assertCanManageProject` + `assertProjectAccess` (~245 lines) |
| `backend/src/modules/projects/projects.controller.ts` | modify | Add `ProjectsLabelsStatesService` injection; redirect 10 call sites from `this.members.*` to `this.labelsStates.*` |
| `backend/src/modules/projects/projects-ticket-subresources.controller.ts` | create | Extract 29 sub-resource route handlers from `projects-tickets.controller.ts` (~345 lines) |
| `backend/src/modules/projects/projects-tickets.controller.ts` | modify | Remove the 29 sub-resource handlers; retain cross-project + CRUD routes (~170 lines) |
| `backend/src/modules/projects/projects.service.ts` | modify | Extract `deleteProject` to `projects-provision.service.ts`; keep list/get/update (~470 lines) |
| `backend/src/modules/projects/projects-provision.service.ts` | modify | Add `deleteProject` method; inject `AccessService` |
| `backend/src/modules/projects/projects.module.ts` | modify | Add 3 providers + 1 controller; final: 24 providers, 12 controllers |

**Open question before implementing:** Should `ProjectsLabelsStatesService` duplicate `assertCanManageProject` privately (~28 lines, no dep) or inject `ProjectsMembersService` (DRY but adds a dep)? Recommendation: duplicate (stable short method, avoids circular dep risk).

**Reused primitives:** All existing services and infrastructure — no new external dependencies.

**Migration SQL:** None.

**Acceptance:**
- All five files reduced below 500 lines (targets: 370, 470, 310, 170, 245).
- `pnpm -C backend build` and `lint` pass with zero errors.
- All external consumers (`feedbucket-public.controller.ts`, `feedbucket-submissions.service.ts`, `integrations-git.service.ts`, `ai/chat-assistant.controller.ts`, `agent-access/agent.controller.ts`) resolve imports without change.
- `normalizeTicketType` exists only in `projects-tickets-create.service.ts`.
- `syncTicketAssignees` in `tickets-helpers.ts` produces identical behavior to former `syncAssignees`.

**Risks:**
- Circular dep risk: `ProjectsLabelsStatesService` injecting `ProjectsMembersService` — mitigated by duplication.
- `feedbucket-submissions.service.ts` injects `ProjectsTicketsService` by type — `createFromFeedback` delegation must remain a real method.
- `projects-provision.service.ts` gaining `AccessService` — verify `AccessModule` is in `ProjectsModule` imports.
- `syncTicketAssignees` moves to `tickets-helpers.ts` — `Db` type must be imported there.

---

### Unit 07: Additive index migration

**Files:**

| Path | Action | Change |
|------|--------|--------|
| `backend/src/db/schema/projects/members.ts` | modify | Add `idx_project_statuses_org_project` on `(orgId, projectId)`; add `idx_project_milestones_org_target_date` on `(orgId, targetDate)` |
| `backend/src/db/schema/projects/core.ts` | modify | Add `idx_custom_states_org_project` on `(orgId, projectId)` |
| `backend/src/db/schema/projects/tasks.ts` | modify | Add `idx_tickets_epic` on `epicId`; replace `idx_ticket_comments_ticket` with `idx_ticket_comments_ticket_created` on `(ticketId, createdAt DESC)` |

```sql
-- Migration: add composite and ordered indexes to projects schema
-- Applied via: pnpm -C backend db:generate && db:migrate

CREATE INDEX IF NOT EXISTS "idx_project_statuses_org_project"
  ON "project_statuses" ("org_id", "project_id");

CREATE INDEX IF NOT EXISTS "idx_custom_states_org_project"
  ON "custom_states" ("org_id", "project_id");

CREATE INDEX IF NOT EXISTS "idx_tickets_epic"
  ON "tickets" ("epic_id");

DROP INDEX IF EXISTS "idx_ticket_comments_ticket";
CREATE INDEX IF NOT EXISTS "idx_ticket_comments_ticket_created"
  ON "ticket_comments" ("ticket_id", "created_at" DESC);

CREATE INDEX IF NOT EXISTS "idx_project_milestones_org_target_date"
  ON "project_milestones" ("org_id", "target_date");
```

**Reused primitives:** `index()` from `drizzle-orm/pg-core`, `.desc()` column method (existing pattern in `blog.ts:82`).

**Acceptance:**
- `pnpm -C backend db:generate` produces the 5 DDL statements with no table-altering statements.
- `EXPLAIN (ANALYZE)` on comment fetch uses `idx_ticket_comments_ticket_created`.
- `EXPLAIN (ANALYZE)` on epic children uses `idx_tickets_epic`.
- `pnpm -C backend typecheck` passes.

**Risks:**
- Replacing `idx_ticket_comments_ticket` with composite: queries on `ticket_id` alone still use composite via partial scan — no regression.
- `epicId` is nullable; Postgres B-tree doesn't index NULLs; `WHERE epic_id IS NULL` won't use the index (acceptable).
- `DROP INDEX` takes `AccessShareLock` momentarily — harmless on low-traffic tables.

---

### Unit 08: Cross-tenant hardening

**Files:**

| Path | Action | Change |
|------|--------|--------|
| `backend/migrations/0300_cross_tenant_hardening.sql` | create | Full DDL (see below) |
| `backend/src/db/schema/projects/tasks.ts` | modify | Add `orgId` FK to `organizations.id` on `workItemRelations`; add FK constraints on `ticketCommentReactions.orgId` and `projectAutomations.orgId`; add composite index `idx_work_item_relations_org_item` |
| `backend/src/modules/projects/projects-ticket-subresources.service.ts` | modify | Add `orgId: u.orgId` to `addRelation` insert |

```sql
-- Migration 0300: cross-tenant hardening

-- 1. Add nullable org_id to work_item_relations
ALTER TABLE "work_item_relations"
  ADD COLUMN IF NOT EXISTS "org_id" text;

-- 2. Backfill in batches of 5,000
DO $$
DECLARE
  _batch int := 5000;
  _updated int;
BEGIN
  LOOP
    UPDATE "work_item_relations" wir
    SET    "org_id" = t."org_id"
    FROM   "tickets" t
    WHERE  wir."work_item_id" = t."id"
      AND  wir."org_id" IS NULL
    LIMIT  _batch;
    GET DIAGNOSTICS _updated = ROW_COUNT;
    EXIT WHEN _updated = 0;
    PERFORM pg_sleep(0.05);
  END LOOP;
END;
$$;

-- 3. Set NOT NULL
ALTER TABLE "work_item_relations"
  ALTER COLUMN "org_id" SET NOT NULL;

-- 4. Composite index (org_id, work_item_id)
CREATE INDEX IF NOT EXISTS "idx_work_item_relations_org_item"
  ON "work_item_relations" ("org_id", "work_item_id");

-- 5. FK: work_item_relations.org_id
ALTER TABLE "work_item_relations"
  ADD CONSTRAINT "fk_work_item_relations_org_id"
    FOREIGN KEY ("org_id") REFERENCES "organizations" ("id") ON DELETE CASCADE;

-- 6. FK: ticket_comment_reactions.org_id
ALTER TABLE "ticket_comment_reactions"
  ADD CONSTRAINT "fk_ticket_comment_reactions_org_id"
    FOREIGN KEY ("org_id") REFERENCES "organizations" ("id") ON DELETE CASCADE;

-- 7. FK: project_automations.org_id
ALTER TABLE "project_automations"
  ADD CONSTRAINT "fk_project_automations_org_id"
    FOREIGN KEY ("org_id") REFERENCES "organizations" ("id") ON DELETE CASCADE;
```

**Acceptance:**
- Migration applies cleanly.
- `SELECT count(*) FROM work_item_relations WHERE org_id IS NULL` returns 0 post-backfill.
- INSERT with non-existent org_id raises FK violation on all three tables.
- `POST /projects/:pid/tickets/:tid/relations` stores correct `org_id`.
- TS build passes.

**Risks:**
- LIMIT in DO $$ UPDATE — valid Postgres syntax but verify in dev before production.
- Service change MUST deploy before or simultaneously with step 3 (NOT NULL) to avoid constraint violations during overlap.
- `ON DELETE CASCADE` on `work_item_relations.org_id` — consistent with all other org_id FKs in schema.

---

### Unit 09: Soft-delete tickets, projects, ticket_comments

```sql
-- Migration: add soft-delete columns
ALTER TABLE projects       ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE tickets        ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE ticket_comments ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Partial indexes for live-only queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_projects_org_active
  ON projects (org_id) WHERE deleted_at IS NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tickets_org_project_active
  ON tickets (org_id, project_id) WHERE deleted_at IS NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ticket_comments_ticket_active
  ON ticket_comments (ticket_id) WHERE deleted_at IS NULL;
```

**Files (all modify — add `isNull(deleted_at)` guards):**

| Path | Change Summary |
|------|----------------|
| `backend/src/db/schema/projects/core.ts` | Add `deletedAt: timestamp('deleted_at')` to `projects`; partial index |
| `backend/src/db/schema/projects/tasks.ts` | Add `deletedAt` to `tickets` and `ticketComments`; partial indexes |
| `backend/src/modules/projects/projects.service.ts` | Replace hard-delete cascade with soft-delete transaction; add `isNull` guards to all queries |
| `backend/src/modules/projects/projects-tickets.service.ts` | Replace hard-delete with soft-delete; add `isNull` guards; preserve ticket-number MAX without filter |
| `backend/src/modules/projects/projects-ticket-comments.service.ts` | Replace hard-delete with `UPDATE SET deleted_at`; guard all lookups |
| `backend/src/modules/projects/projects-tickets-read.service.ts` | Add `isNull(tickets.deletedAt)` to `listTickets`, `getTicket`; add `where: isNull(...)` to `with.comments` block |
| `backend/src/modules/projects/projects-tickets-query.service.ts` | Guard WIP limit count, `bulkUpdate`, `reorder` |
| `backend/src/modules/projects/projects-work-query.service.ts` | Guard `searchOrgTickets`, `getMyWork`, `getAllWork`, also `isNull(projects.deletedAt)` |
| `backend/src/modules/projects/projects-analytics.service.ts` | Extend `orgFilter` with `isNull(tickets.deletedAt)`; guard project queries |
| `backend/src/modules/projects/projects-tickets-transfer.service.ts` | Guard `exportTickets`; do NOT filter deleted ticket numbers in MAX query |
| `backend/src/modules/projects/projects-ticket-subresources.service.ts` | Guard all `findFirst`/`findMany` on tickets and projects |
| `backend/src/modules/projects/projects-reports.service.ts` | Guard `requireProject` and all ticket aggregate queries |
| `backend/src/modules/projects/projects-budget.service.ts` | Guard project and ticket queries |
| `backend/src/modules/projects/projects-members.service.ts` | Guard all `db.query.projects.findFirst` calls |
| `backend/src/modules/projects/projects-email.service.ts` | Guard ticket `findFirst` calls |
| `backend/src/modules/projects/projects-releases.service.ts` | Guard project + ticket queries |
| `backend/src/modules/projects/projects-templates.service.ts` | Guard ticket `.from(tickets)` |
| `backend/src/modules/projects-execution/iterations.service.ts` | Guard all ticket + project queries |
| `backend/src/modules/dashboard/dashboard-project.service.ts` | Guard all project/ticket queries; guard `with.tickets` block in sprint detail |
| `backend/src/modules/search/search.service.ts` | Add `isNull(tickets.deletedAt)` and `isNull(projects.deletedAt)` |
| `backend/src/modules/agent-access/agent-access.service.ts` | Guard ticket + comment queries |
| `backend/src/modules/projects-client-portal/client-portal.service.ts` | Guard project + ticket queries |
| `backend/src/modules/cron/cron-projects.service.ts` | Guard recurring template query; do NOT filter MAX ticket number |
| `backend/src/modules/projects-execution/workspace.service.ts` | Guard project + ticket queries |
| `backend/src/modules/ai/services/projects-ai.service.ts` | Guard all project + ticket queries |
| `backend/src/modules/ai/projects-copilot-tools.ts` | Guard all 4 ticket queries |
| `backend/src/modules/ai/services/ticket-ai.service.ts` | Guard project + ticket queries |
| `backend/src/modules/timesheets-core/billing.service.ts` | Guard project query |
| `backend/src/modules/timesheets-core/periods.service.ts` | Guard project query |
| `backend/src/modules/timesheets-core/reports.service.ts` | Guard project query |

**Open questions before implementing:** Q-SD-1, Q-SD-2, Q-SD-3.

**Acceptance:**
- `GET /projects` returns only live projects.
- `GET /projects/:id` on soft-deleted project returns 404.
- `DELETE /projects/:id` sets `deleted_at` on project + all child tickets + their comments; no hard DELETEs.
- Ticket numbers in MAX() still count soft-deleted rows (numbers never reused).
- All analytics, WIP limits, AI, search exclude tombstoned rows.
- Three partial indexes exist after migration.

**Risks (critical):**
- **Drizzle `with:` blocks do NOT auto-filter** nested relations — every `with: { comments: {...} }` must explicitly add `where: isNull(ticketComments.deletedAt)`.
- **AI/search leakage:** all AI files must be patched before any AI endpoint is live.
- **Client portal visibility:** `isNull(projects.deletedAt)` must be added to `assertClientProject` and `listPortalProjects`.
- **`projects:delete` permission key** — verify it exists in `permissions.constants.ts` before relying on it.
- `CONCURRENTLY` indexes cannot run inside a transaction — use `db:migrate` (not `db:push`) in CI.

---

## Slice 3 — Shared Primitives

### Unit 10: BoardCard + BoardColumn shared primitives

**Files:**

| Path | Action | Change |
|------|--------|--------|
| `frontend/components/shared/board-card.tsx` | create | Slot-based `BoardCard` memo with `title`, `id`, `overflow`, `titlePrefix`, `body`, `badges`, `assignee`, `actions` slots; `isDragging` visual contract; `accentBorderClass` for CRM leads |
| `frontend/components/shared/board-column.tsx` | create | `BoardColumn` memo with `header` slots, `Droppable` body (`mode="standard"`); add `headerClassName` + `headerTextClassName` to `BoardColumnHeaderSlots` for HRMS gradient preservation |
| `frontend/features/projects/views/kanban-board-column.tsx` | modify | Adopt `BoardCard` in `KanbanTicketCard`; use `BoardColumn` for header+footer shell; keep `KanbanVirtualTicketList` with its own `Droppable(mode="virtual")` untouched |
| `frontend/features/crm/deals/deal-kanban-card.tsx` | modify | Replace `Card` shell with `BoardCard`; thread `isDragging` from Draggable snapshot |
| `frontend/features/crm/deals/kanban-column.tsx` | modify | Replace column shell with `BoardColumn` |
| `frontend/features/crm/leads/kanban-card.tsx` | modify | Replace outer `Card` with `BoardCard`; GripVertical as `overflow` with `dragHandleProps` |
| `frontend/features/hr/recruitment/kanban/candidate-card.tsx` | modify | Replace inner div with `BoardCard` |
| `frontend/components/hr/recruitment/pipeline-kanban.tsx` | modify | Use `BoardColumn`; pass `headerClassName` with gradient |

**Open questions:** Q-BP-1, Q-BP-2.

**Reused primitives:** `cn()`, `@hello-pangea/dnd Droppable/Draggable`, `react-window v2` (untouched), `AnimatedIconButton`, `SemanticBadge`, `StatusBadge`, `PriorityBadge`, `InlineType/Priority/Assignee` family, `formatINRCompact`.

**Migration SQL:** None.

**Acceptance:**
- `pnpm -C frontend typecheck` passes (no `any`/cast/`@ts-ignore`).
- Projects kanban DnD still works; VirtualDroppableShell not disturbed.
- CRM Deals, CRM Leads, HR recruitment DnD all work.
- HRMS gradient headers preserved via `headerClassName`.
- `accentBorderClass` renders 3px left border on leads cards.

**Risks:**
- Projects kanban must NOT use `BoardColumn` for its Droppable body — only for header+footer shell.
- `isDragging` must be threaded to `DealKanbanCard` from Draggable snapshot.
- GripVertical as `overflow` slot — remove absolute positioning from candidate-card.

---

### Unit 11: Consolidate badges — PriorityBadge to shared

**Files:**

| Path | Action | Change |
|------|--------|--------|
| `frontend/components/shared/priority-badge.tsx` | create | Copy of `features/projects/shared/priority-badge.tsx` (verbatim) |
| `frontend/features/projects/shared/priority-badge.tsx` | modify | Replace with re-export barrel |
| `frontend/components/shared/index.ts` | modify | Add `export { PriorityBadge }` |
| `frontend/components/ui/status-badge.tsx` | modify | Add 4 missing entries to `STATUS_VARIANT_MAP`: `WAITING`, `SCHEDULED`, `EXPIRED`, `ON_HOLD` |
| 9 PriorityBadge importers | modify | Update import path to `@/components/shared/priority-badge` |
| 17 call-site files with local `PRIORITY_COLORS`/`STATUS_COLORS` dicts | modify | Delete local dicts; replace inline rendering with `StatusBadge`/`SemanticBadge`/`PriorityBadge` |

**Exemptions (do NOT change):**
- `features/projects/analytics/project-stats.tsx` — hex strings for Recharts.
- `features/projects/my-work/grouping-sidebar.tsx` — `bg-*` dot indicators.
- `components/expenses/expense-export/pdf-renderer.tsx` — inline canvas style objects.
- HR headcount/positions tables — `BadgeVariant` strings (already correct pattern).

**Reused primitives:** `StatusBadge`, `SemanticBadge` (tone-based), `PriorityBadge`.

**Migration SQL:** None.

**Acceptance:**
- All 9 PriorityBadge importers compile against new path.
- Old path still resolves via re-export barrel.
- `StatusBadge` renders WAITING, SCHEDULED, EXPIRED, ON_HOLD.
- No local `PRIORITY_COLORS`/`STATUS_COLORS` dict remains in the 17 modified files.
- Dark-mode conformance preserved (SemanticBadge carries correct dark-mode classes).

**Risks:**
- Old path converted to re-export barrel rather than deleted — audit for removal once all imports updated.
- `SemanticBadge size='xs'` uses `text-[10px]` — verify visual match at each replacement site.
- `SUBMISSION_STATUS_COLORS` deletion from `field-type-meta.ts` must coordinate with `submissions-data-table.tsx` in same commit.

---

### Unit 12: Retire UserCombobox, extract MemberCommandList, dedup HelpdeskTicketRow

**Files:**

| Path | Action | Change |
|------|--------|--------|
| `frontend/components/members/member-picker.tsx` | modify | Export `MemberCommandList` sub-component; export `MemberOption` interface; replace two internal `CommandList` blocks with `<MemberCommandList>` |
| `frontend/features/projects/views/card-inline-fields.tsx` | modify | Replace hand-rolled `CommandList` in `InlineAssignee` with `<MemberCommandList>` |
| `frontend/features/hr/helpdesk/ticket-row.tsx` | create | Shared `HelpdeskTicketRow` with `showAuthor?: boolean` prop |
| `frontend/features/hr/helpdesk/my-tickets-tab.tsx` | modify | Remove local `TicketRow` + 3 color dicts; use `<HelpdeskTicketRow>` |
| `frontend/features/hr/helpdesk/queue-tab.tsx` | modify | Remove local `AdminTicketRow` + 3 color dicts; use `<HelpdeskTicketRow showAuthor>` |
| `frontend/components/ui/user-combobox.tsx` | delete | Pure forwarding shim (39 lines); no logic |
| 31 UserCombobox call-site files | modify | Replace import with `MemberPicker`; adapt `onChange` with `(v) => field.onChange(v ?? "")` pattern |

**Note:** `DataTablePagination` and `TablePagination` are NOT duplicates and must NOT be merged — they have incompatible prop interfaces (`limit` vs `pageSize`, `totalPages` computed vs derived).

**Reused primitives:** `MemberPicker`, `Command*` family, `hooks/api/hr/helpdesk.ts`, `TruncatedText`, `Badge`.

**Migration SQL:** None.

**Acceptance:**
- `grep -r 'user-combobox' frontend/` returns no hits.
- `grep -r 'UserCombobox' frontend/` returns no hits.
- `grep -r 'AdminTicketRow\|^function TicketRow' frontend/features/hr/helpdesk/` returns no hits.
- `MemberCommandList` exported from `member-picker.tsx`.
- `InlineAssignee` no longer contains a hand-written `CommandList` block.
- All 31 call sites compile with `MemberPicker`.

**Risks:**
- 31 call sites must all be updated atomically — partial migration breaks build.
- `MemberPicker.onChange` returns `string | null`; all `field.onChange: (v: string) => void` sites must use `v ?? ""` adapter.
- `showAuthor` defaults to `false` — `queue-tab.tsx` must pass `showAuthor` (boolean shorthand) to restore admin view.

---

## Slice 4 — Page Structure & Routing

### Unit 13 (Disproven — Partial): Delete dead routes

**Files (only these two):**

| Path | Action | Change |
|------|--------|--------|
| `frontend/app/(authenticated)/projects/[projectId]/workload/page.tsx` | delete | Redirect stub; canonical URL `?view=workload` used by `project-nav-config.ts` |
| `frontend/app/(authenticated)/projects/[projectId]/pages/page.tsx` | delete | Redirect stub to `/knowledge`; zero inbound links |

**Do NOT delete:** `projects/page.tsx`, `projects/customers/page.tsx`, `projects/portfolios/page.tsx`.

**Acceptance:**
- Workload nav item opens `?view=workload` without redirect loop.
- No user-visible link points to `/projects/[id]/pages`.
- `/projects`, `/projects/customers`, `/projects/portfolios` all render correctly.

---

### Unit 14: Add missing error.tsx and loading.tsx

**Files (35 new files):**

| Route | error.tsx | loading.tsx |
|-------|-----------|-------------|
| `[projectId]/automations/` | create | — |
| `[projectId]/budget/` | create | — |
| `[projectId]/client-portal/` | create | — |
| `[projectId]/cycles/[cycleId]/` | create | — |
| `[projectId]/feedbucket/` | create | — |
| `[projectId]/feedbucket/[submissionId]/` | create | create (loading already exists — verify) |
| `[projectId]/qa/runs/[runId]/` | create | — |
| `[projectId]/reports/` | create | — |
| `[projectId]/webhooks/` | create | — |
| `[projectId]/whiteboard/` | create | — |
| `[projectId]/wiki/` | create | — |
| `[projectId]/wiki/[pageId]/` | create | — |
| `[projectId]/workload/` | create | — |
| `[projectId]/triage/` | create | create |
| `projects/all/` | create | — |
| `projects/command-center/` | create | — |
| `projects/customers/` | create | create |
| `projects/drafts/` | create | create |
| `projects/goal/` | create | — |
| `projects/goal/[goalId]/` | create | create |
| `projects/inbox/` | create | create |
| `projects/portal/[projectId]/` | create | — |
| `projects/portfolios/[portfolioId]/` | create | — |
| `projects/roadmap/` | create | — |
| `projects/settings/integrations/` | create | — |
| `projects/templates/` | create | — |
| `projects/` (root) | — | create |
| `[projectId]/tickets/[ticketKey]/` | — | create |
| `projects/members/` | — | create |

**Pattern:**
- `error.tsx`: always `"use client"` + `RouteErrorBoundary` from `@/components/ui/route-error-boundary` with descriptive `title` and `fallbackMessage`.
- `loading.tsx`: server component + `PageWrapper` + skeletons matching the real page shape (`PmPageShell`, `PmPanel`, `PmSection`, `DataTableSkeleton`, `KanbanBoardSkeleton`, `Skeleton`).

**Note on `feedbucket/[submissionId]/loading.tsx`:** File already exists (scan shows `loading=Y`). Only create the `error.tsx`.

**Reused primitives:** `RouteErrorBoundary`, `PageWrapper`, `Skeleton`, `DataTableSkeleton`, `PmPageShell`/`PmPanel`/`PmSection`, `FILTER_TOOLBAR_ROW`.

**Migration SQL:** None.

**Acceptance:**
- Every directory with `page.tsx` under `projects/**` also has `error.tsx`.
- All `error.tsx` are `"use client"` modules importing `RouteErrorBoundary`.
- All `loading.tsx` are server components matching the page's visual shape.

---

## Slice 5 — Data-Layer & Responsive

### Unit 15: Page splits (oversized page/feature files)

**New files created:**

| File | Extracted From | Lines |
|------|----------------|-------|
| `features/projects/views/use-board-filters.ts` | `[projectId]/page.tsx` | ~120 |
| `features/projects/views/use-saved-view.ts` | `[projectId]/page.tsx` | ~110 |
| `features/projects/views/project-board-page.tsx` | `[projectId]/page.tsx` | ~300 |
| `features/projects/automations/automation-schemas.ts` | `automations/page.tsx` | ~40 |
| `features/projects/automations/automation-card.tsx` | `automations/page.tsx` | ~140 |
| `features/projects/webhooks/webhook-schemas.ts` | `webhooks/page.tsx` | ~30 |
| `features/projects/webhooks/webhook-card.tsx` | `webhooks/page.tsx` | ~200 |
| `features/projects/whiteboard/board-list-items.tsx` | `whiteboard/page.tsx` | ~110 |
| `features/projects/cycles/create-cycle-schema.ts` | `cycles/page.tsx` | ~50 |
| `features/projects/cycles/cycles-page-skeleton.tsx` | `cycles/page.tsx` | ~45 |
| `features/projects/intake/intake-schemas.ts` | `intake/page.tsx` | ~40 |
| `features/projects/intake/intake-accept-sheet.tsx` | `intake/page.tsx` | ~110 |
| `features/projects/intake/intake-decline-sheet.tsx` | `intake/page.tsx` | ~55 |
| `features/projects/modules/create-module-schema.ts` | `modules/page.tsx` | ~60 |
| `features/projects/modules/create-module-sheet.tsx` | `modules/page.tsx` | ~150 |
| `features/projects/project-list/project-sort-group.ts` | `all/page.tsx` | ~60 |
| `features/projects/project-list/project-list-skeletons.tsx` | `all/page.tsx` | ~70 |
| `features/projects/goals/goal-card.tsx` | `goal/page.tsx` | ~100 |
| `features/projects/goals/goal-detail-panels.tsx` | `goal/[goalId]/page.tsx` | ~130 |
| `features/projects/views/list-view-item.tsx` | `list-view.tsx` | ~280 |
| `features/projects/views/list-view-utils.ts` | `list-view.tsx` | ~80 |
| `features/projects/views/list-view-groups.tsx` | `list-view.tsx` | ~190 |
| `features/projects/views/kanban-board-utils.ts` | `kanban-board.tsx` | ~80 |
| `features/projects/views/kanban-swimlane-layout.tsx` | `kanban-board.tsx` | ~90 |
| `features/projects/shared/filter-trigger-button.tsx` | `filter-command-menu.tsx` | ~50 |
| `features/projects/shared/filter-mobile-search.tsx` | `filter-command-menu.tsx` | ~30 |
| `features/projects/shared/filter-category-list.tsx` | `filter-command-menu.tsx` | ~70 |
| `features/projects/shared/filter-mobile-drawer.tsx` | `filter-command-menu.tsx` | ~100 |

**All pages/files modified:** `[projectId]/page.tsx`, `automations/page.tsx`, `webhooks/page.tsx`, `whiteboard/page.tsx`, `cycles/page.tsx`, `intake/page.tsx`, `modules/page.tsx`, `all/page.tsx`, `goal/page.tsx`, `goal/[goalId]/page.tsx`, `list-view.tsx`, `kanban-board.tsx`, `filter-command-menu.tsx`.

**Reused primitives:** `PmPageShell`, `PmPanel`, `PmSection`, `pm-motion` tokens, all existing inline-field components, `AnimatedIconButton`, `LoadingButton`, `PageWrapper`, `EmptyState`, `StatCard`.

**Migration SQL:** None.

**Acceptance:**
- No new file exceeds 300 lines.
- All six view modes render identically post-split.
- `useBoardFilters` handles all 8 URL params correctly.
- All form flows (automations, webhooks, whiteboard, cycles, intake, modules) work end-to-end.
- Kanban flat board and swimlane DnD both function.
- Filter command menu desktop + mobile (swipe) both work.

**Risks:**
- `applyLocalPatch` used in `list-view.tsx:651` — confirm it is defined locally before moving to `list-view-utils.ts`.
- `KanbanSwimlaneLayout` needs `dragStartRef` typed to match `kanban-board-column.tsx`'s prop shape.
- `CategoryDefinition` type in `filter-category-list.tsx` must not conflict with existing export in `filter-command-menu.tsx` — rename to `FilterCategoryDefinition` if needed.
- `intake-accept-sheet.tsx` owns its own `useForm<AcceptForm>` — parent does not pass form down, only receives final values via `onSubmit`.

---

### Unit 16: QueryClient defaults, debounced search, RBAC-gated queries (needs-decision)

**Status: needs-decision on Q-QD-1 before filter-command-menu.tsx is touched.**

**Files:**

| Path | Action | Change |
|------|--------|--------|
| `frontend/components/providers/query-provider.tsx` | NO CHANGE | `refetchOnWindowFocus: true` already on line 17 |
| `frontend/features/projects/all-work/use-all-work-filters.ts` | modify | Add 300ms debounce via `useDebouncedValue`; separate `rawSearch` (input value) from `debouncedSearch` (API param); return `rawSearch` for input binding |
| `frontend/hooks/api/projects/projects.ts` | modify | Add `useCan('projects:view')` RBAC gate to `useProjects`, `useProject`, `useProjectMembers`, `useProjectLabels`; widen `Omit` to allow caller `enabled` AND-combined with permission |
| `frontend/hooks/api/projects/tickets.ts` | modify | Add `useCan('projects:tickets:view')` gate to `useTickets`, `useProjectBoardTickets`, `useTicket`, `useSubtasks`, `useTicketRelations` |
| `frontend/hooks/api/projects/all-work.ts` | modify | Add `useCan('projects:tickets:view')` gate to `useAllWork` and `useInfiniteAllWork`; add `useCrossProjectBulkUpdate` mutation with `queryKeys.projects.allWork()` invalidation |
| `frontend/features/projects/all-work/use-all-work-bulk.ts` | modify | Replace inline mutation with `useCrossProjectBulkUpdate` from hooks; remove direct `apiClient` import |
| `frontend/features/projects/shared/filter-command-menu.tsx` | CONDITIONAL | See Q-QD-1 — only modify if product decides cosmetic swap is worthwhile |
| `frontend/features/projects/goals/goal-filters-popover.tsx` | NO CHANGE | Already uses `ResponsivePopover` correctly |
| `frontend/features/projects/customers/customer-filter-popover.tsx` | NO CHANGE | Already uses `ResponsivePopover` correctly |

**Reused primitives:** `hooks/common/use-debounce.ts` (`useDebouncedValue` — already used in project-list), `useCan`, `queryKeys.projects.allWork()`, `ResponsivePopover`.

**Acceptance:**
- Sub-task (a): confirmed done (no change needed).
- Sub-task (b): network request does not fire until 300ms after last keystroke; input shows typed value immediately.
- Sub-task (c): user without `projects:view` — zero project/ticket queries fire.
- Sub-task (d): bulk update invalidates all `allWork` queries via key prefix; raw string literal removed from `use-all-work-bulk.ts`.
- Sub-task (e): goal filters and customer filters confirmed already correct.

**Risks:**
- `useCan()` initially returns `false` while access query loads — queries briefly disabled on first mount. Acceptable pattern; skeleton states must show while `enabled` is false.
- All-work search debouncing requires returning `rawSearch` and updating `TicketFilterBar`'s input `value` binding — must be done as a paired change.
- `useProject` and `useProjectMembers` currently exclude `enabled` from `Omit` — widening signature requires auditing all call sites.

---

## Slice 6 — Inline AI

### Unit 17: AiActionsMenu on ticket-detail and project-overview

**Files:**

| Path | Action | Change |
|------|--------|--------|
| `backend/src/modules/ai/services/ticket-ai.service.ts` | modify | Switch 6 methods to `invokeStructuredWithUsage`/`invokeTextWithUsage`; include `aiUsage` in all return objects |
| `backend/src/modules/ai/services/projects-ai.service.ts` | modify | Switch `summarize`, `detectRisks`, `draftClientUpdate`, `weeklyUpdate` to `*WithUsage`; include `aiUsage` in returns |
| `frontend/hooks/api/projects/ticket-ai.ts` | modify | Add `aiUsage?: AiUsageMeta | null` to all result interfaces |
| `frontend/types/projects/ai.ts` | modify | Add `aiUsage?: AiUsageMeta | null` to `ProjectSummaryResult`, `ProjectRisksResult`, `ClientUpdateResult`, `WeeklyUpdateResult`, `TicketHandoffResult` |
| `frontend/hooks/api/projects/ai.ts` | modify | Confirm result interfaces now carry `aiUsage` (flows through from `apiClient.post<T>`) |
| `frontend/features/projects/ai/project-ai-menu.tsx` | modify | Replace bespoke single-action `Sheet + LoadingButton` with `AiActionsMenu`; 4 actions: Summary, Risks, Draft client update, Draft status update; gate with `useCan('projects:ai:use')` |
| `frontend/features/projects/ticket-details/ticket-detail-page.tsx` | modify | Import `TicketAiMenu`; render in desktop actions slot and as mobile `DropdownMenu` submenu |
| `frontend/features/projects/ai/ticket-ai-menu.tsx` | modify | Thread `aiUsage` through 4 format helpers; add 5th action `summarize-comments` (disabled when `commentCount === 0`); add `commentCount` prop |

**Reused primitives:** `AiActionsMenu`, `AiAction`, `AiActionResult`, `AiUsageChip`, `AiActionResultBody`, `useCan('projects:ai:use')`, `TicketAiMenu`, all existing mutations.

**Migration SQL:** None.

**Acceptance:**
- Ticket detail shows AI button (desktop) / AI submenu entry (mobile) when `ticketId` resolved and `useCan('projects:ai:use')` true.
- All 4 project AI actions open Sheet with generated text + `AiUsageChip`.
- All 5 ticket AI actions work; `summarize-comments` disabled when no comments.
- HTTP 402 → quota state; 403 → denied state; network error → error state.
- `useCan('projects:ai:use') = false` → all menus render null.
- TS build passes; no `any`, no `!` assertions.

**Risks:**
- Switching to `*WithUsage` adds milliCredits computation per AI request — negligible but verify against p99 latency.
- `weeklyUpdate` always covers trailing 7 days (no date-range picker) — if date selection is desired, it is a separate task.
- Inline `AiFieldPopoverAction` / `AiFieldTrigger` in `ticket-detail-ai.tsx` remain (two paths to some actions) — acceptable for now; consolidation is a separate follow-up.

---

## Slice 7 — Members/Teams Feature

> **All units in this slice are blocked on Q-MT-1, Q-MT-2, and Q-MT-3. Do NOT implement until the user answers those three questions.**

### Unit 18: project_team_assignments schema + migration

**Status: ready (assumes Q-MT-1 → Option B — explicit join table)**

**Files:**

| Path | Action | Change |
|------|--------|--------|
| `backend/src/db/schema/project-teams.ts` | modify | Append `projectTeamAssignments` table (`id`, `orgId`, `projectId`, `teamId`, `assignedBy`, `assignedAt`, `deletedAt`); add composite unique index + 2 partial indexes; add Drizzle relations for all three tables |
| `backend/src/db/schema/projects/relations.ts` | modify | Add `teamAssignments: many(projectTeamAssignments)` to `projectsRelations` |
| `backend/src/modules/projects-teams/dto/teams.schemas.ts` | modify | Add `assignTeamToProjectSchema`, `listProjectTeamAssignmentsQuerySchema` and types |
| `backend/src/modules/projects-teams/teams.service.ts` | modify | Add `assignToProject`, `unassignFromProject`, `listProjectAssignments` methods |
| `backend/src/modules/projects-teams/teams.controller.ts` | modify | Add `GET :teamId/projects`, `POST :teamId/projects`, `DELETE :teamId/projects/:projectId` routes |
| `backend/migrations/0009_project_team_assignments.sql` | create | See below |

```sql
-- Migration 0009: project_team_assignments junction

CREATE TABLE IF NOT EXISTS "project_team_assignments" (
  "id"           integer       PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  "org_id"       text          NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "project_id"   integer       NOT NULL REFERENCES "projects"("id")      ON DELETE CASCADE,
  "team_id"      integer       NOT NULL REFERENCES "project_teams"("id") ON DELETE CASCADE,
  "assigned_by"  text          REFERENCES "users"("id") ON DELETE SET NULL,
  "assigned_at"  timestamptz   NOT NULL DEFAULT now(),
  "deleted_at"   timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS "uniq_project_team_assignments_org_proj_team"
  ON "project_team_assignments" ("org_id", "project_id", "team_id");

CREATE INDEX IF NOT EXISTS "idx_pta_org_project"
  ON "project_team_assignments" ("org_id", "project_id")
  WHERE "deleted_at" IS NULL;

CREATE INDEX IF NOT EXISTS "idx_pta_org_team"
  ON "project_team_assignments" ("org_id", "team_id")
  WHERE "deleted_at" IS NULL;

-- Effective roster reference query (no materialised view needed at MVP):
-- SELECT DISTINCT ON (u.id) u.id, u.first_name, u.last_name, u.email, u.image,
--   CASE WHEN pm.project_id IS NOT NULL THEN 'direct' ELSE 'team' END AS membership_source
-- FROM users u
-- LEFT JOIN project_members pm ON pm.user_id = u.id AND pm.project_id = :project_id
-- LEFT JOIN project_team_assignments pta ON pta.project_id = :project_id
--   AND pta.org_id = :org_id AND pta.deleted_at IS NULL
-- LEFT JOIN project_team_members ptm ON ptm.team_id = pta.team_id
--   AND ptm.org_id = :org_id AND ptm.user_id = u.id
-- WHERE (pm.project_id IS NOT NULL OR ptm.id IS NOT NULL)
-- ORDER BY u.id;
```

**Open questions:** Q-SCH-1 (upsert vs hard-delete on re-assignment), Q-SCH-2 (roster endpoint location).

**Reused primitives:** `TeamsService`, `TeamsController`, `teams.schemas.ts`, `AuditService`, `PermissionGuard`, `@RequirePermission('projects:teams:manage')`.

**Acceptance:**
- Migration applies cleanly.
- `POST /projects/teams/:teamId/projects` → 201, tenant-scoped.
- `DELETE /projects/teams/:teamId/projects/:projectId` → soft-deletes row; not returned in subsequent GET.
- All endpoints 403 without correct permission.
- No TypeScript errors; no `any`.
- `hr_teams` table untouched.

**Risks:**
- Unique index blocks re-assignment after soft-delete — fix with upsert (see Q-SCH-1).
- `projectMembers` has no `org_id` column — effective roster relies on project_id being already org-scoped (pre-existing design gap, not introduced here).
- Soft-delete vs hard-delete for `unassignFromProject` (see Q-SCH-1).

---

### Unit 19: Teams API (assign/unassign, effective-roster, add-person-to-workspace)

**Status: needs-decision — blocked on Q-MT-1, Q-MT-2, Q-SCH-2**

Teams CRUD + team-member CRUD are fully implemented. The missing pieces depend on product decisions:
- Assign/unassign team to project → blocked on Q-MT-1 (Unit 18 covers it if Option B chosen).
- Effective roster endpoint → blocked on Q-SCH-2 (which controller? which scope?).
- `POST /projects/members` → blocked on Q-MT-2 (what does it actually do?).

**Files (conditional on decisions):**

| Path | Action | Condition |
|------|--------|-----------|
| `backend/src/modules/projects-teams/teams.service.ts` | modify (add 4 methods) | Q-MT-1 = Option B |
| `backend/src/modules/projects-teams/teams.controller.ts` | modify (add 5 handlers) | Q-MT-1 = Option B |
| `backend/src/modules/projects/projects-workspace-members.controller.ts` | modify (add POST) | Q-MT-2 decision |
| `backend/src/modules/projects/dto/projects-workspace-members.schemas.ts` | modify (add schema) | Q-MT-2 decision |

---

### Unit 20: Teams frontend (members page, teams module, effective-roster surface)

**Status: needs-decision — blocked on Q-MT-1, Q-MT-2, Q-MT-3**

**Files (conditional on decisions):**

| Path | Action | Condition |
|------|--------|-----------|
| `frontend/features/projects/members/add-workspace-member-button.tsx` | create | Q-MT-2 decision |
| `frontend/hooks/api/projects/workspace-members.ts` | modify (add mutation) | Q-MT-2 decision |
| `frontend/features/projects/members/members-page.tsx` | modify | Q-MT-2 decision |
| `frontend/features/projects/teams/teams-list-page.tsx` | modify (optimistic updates) | Always ready |
| `frontend/features/projects/teams/team-home-page.tsx` | modify (optimistic updates) | Always ready |
| `frontend/types/projects/teams.ts` | modify (add interfaces) | Q-MT-1 = Option B |
| `frontend/hooks/api/projects/project-team-assignments.ts` | create | Q-MT-1 = Option B |
| `frontend/features/projects/settings/project-teams-section.tsx` | create | Q-MT-1 = Option B |
| `frontend/features/projects/settings/project-effective-roster.tsx` | create | Q-MT-3 decision |
| `frontend/app/(authenticated)/projects/[projectId]/settings/page.tsx` | modify (add Teams + Roster sections) | Q-MT-1/Q-MT-3 decisions |

**Reused primitives (when ready):** `DataTable`, `MemberPicker`, `PageWrapper`, `ResponsivePopover`, `LoadingButton`, `PmPageShell`/`PmPanel`/`PmSection`, `SemanticBadge`, `useProjectTeams`, `useProjectTeamMembers`, `useProjectMembers`, `useCan`, `useCanManageProject`.

---

## E. Implementation Order

```
Phase 1 (no dependencies, safe to parallelize):
  07 — Index migration (DB only, additive)
  08 — Cross-tenant hardening (DB + 1 service file)
  11 — Badge consolidation (pure frontend, no backend)
  12 — Retire UserCombobox + MemberCommandList (pure frontend)
  13 — Delete 2 dead route stubs (pure deletion)
  14 — Add error.tsx + loading.tsx files (pure creation)

Phase 2 (depends on Phase 1 infra):
  05 — dto/projects.schemas.ts split (backend refactor, unblocks 06)
  04 — Kill N+1 ancestor walks (backend, self-contained)
  03 — Bound attachments (backend + frontend type extension)

Phase 3 (depends on Phase 2):
  06 — Split oversized backend files (depends on 05 for schema split)
  01 — Paginate my-work (depends on dto split for myWorkQuerySchema)
  02 — Bound export (depends on dto split for exportTicketsResponseSchema)

Phase 4 (frontend structural — depends on Phase 2/3 backend):
  09 — Soft-delete (large; requires all Phase 2/3 backend files stable)
  10 — BoardCard + BoardColumn (pure frontend, parallel with 09)
  15 — Page splits (pure frontend, parallel with 09)

Phase 5 (depends on Phase 4):
  16 — Query defaults + RBAC gates + debounce (after Phase 4 hooks stable)
  17 — Inline AI (depends on 16 RBAC gates)

Phase 6 (requires user decisions Q-MT-1, Q-MT-2, Q-MT-3):
  18 — project_team_assignments schema + migration
  19 — Teams API
  20 — Teams frontend
```
