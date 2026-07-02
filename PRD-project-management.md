# StreamlineOS PRD (v1 · Implementation‑Grade)
## Project Management Platform (Projects · Tickets · Collaboration · Chat + Calendar Integrations)

**Owner (PM)**: StreamlineOS Platform  
**Owner (Eng)**: Projects / Collaboration  
**Status**: Implementation-ready (frontend grounded; backend contract specified from current client usage)  
**Last updated**: 2026-07-01  
**Scope**: Frontend `frontend/` + Backend `streamlineos-api` (NestJS; separate repo)

## UI/UX source of truth

- **Source of truth**: `PRD-ui-ux-system.md`
- **Canonical UI references**: `/signin` and `/signup`

---

## 0) Canonical implementation prompt (paste into Claude Code)

> Implement StreamlineOS Project Management end-to-end: Projects + Tickets + Comments + Views + Settings + Integrations with Chat and Calendar. Treat `CLAUDE.md` as constitution. Follow the strict workflow: for any page touched: AUDIT → PLAN → wait for confirmation → implement → run build+lint+typecheck → update `PAGES.md`.  
>
> Hard boundaries: backend owns all business logic + DB schema + migrations; frontend is UI + TanStack Query hooks only. Do **not** add frontend `app/api/**` business endpoints (auth-bridge only). Strict TypeScript (no `any`, no casting hacks, no `@ts-ignore`, avoid non-null assertion abuse), no anonymous event handlers, no code comments, delete dead code.  
>
> Must-haves from user pain:  
> - On `/projects`, users can **edit + delete/archive** projects directly (not only via settings).  
> - In `/chat`, users can **tag/mention a ticket**, **change ticket status from chat**, and **share a comment permalink** that unfurls nicely.  
> - In `/calendar`, users can **attach/link tickets to calendar events** and **create tickets from calendar**.  
>
> UX standards: match `/signin` + `/signup` density and interaction states; every page must have loading/empty/error states; accessible keyboard navigation; no scroll bugs; avoid double-padding in Sheets.

---

## 1) Vision (why this exists)

StreamlineOS Projects is a tenant-safe, RBAC-gated work management system built for small-to-mid teams but engineered for enterprise governance. It must unify:
- planning (backlog/sprints/epics),
- execution (board/list/table/calendar/gantt/workload),
- collaboration (comments/mentions/reactions/watchers),
- communication (chat references + actions),
- scheduling (calendar linkage),
- accountability (audit log + activity history),
without violating the repo’s backend/frontend boundary.

---

## 2) What must be true after shipping (outcomes)

### 2.1 User outcomes
- A user can create a project, invite members, create tickets, and complete a first sprint without leaving Projects.
- Chat conversations can reference work items accurately: ticket mention, preview, and status updates.
- A calendar event can be linked to a ticket (and vice versa), enabling contextual navigation.
- Comment permalinks are shareable and deep-link to the exact discussion context.

### 2.2 Engineering outcomes
- All PM data is tenant-scoped at the backend data layer (BOLA-safe).
- Query keys and invalidation are correct and consistent; no cache drift across views.
- Every state mutation produces audit + activity events and triggers the correct notifications.
- API error envelope uses stable codes (no brittle string parsing).

### 2.3 Competitive baseline (parity vs Linear/Jira/Asana/ClickUp/Notion Projects)

StreamlineOS Projects must meet the “table stakes” these platforms set. The goal is **no obvious missing core capability** for day‑to‑day execution.

Must-have product features:
- **Project CRUD**: create, update, archive/restore, delete; member management; templates.
- **Workflow/status config**: project-scoped states and transitions; default statuses; state groups.
- **Issue types**: at minimum task/bug/feature (align with existing `type` field; do not invent enums lightly).
- **Labels/tags**: org-level labels plus project usage; color; add/remove on tickets.
- **Custom fields**: typed fields, required flags, and per-project configuration; visible in list/table.
- **Assignees + watchers**: assign/unassign, self-assign, watchers for notifications.
- **Due dates + time planning**: due date, start date; optional effort/points; calendar visibility.
- **Sprints + epics**: planning constructs with rollups and status transitions.
- **Comments + mentions + reactions**: threaded replies, @mentions, emoji reactions, edit/delete (permission-gated).
- **Attachments**: upload/link, file metadata, permission-gated access.
- **Search**: fast ticket search by key/number/title; supports chat/calendar pickers.
- **Filters + sorting**: status/assignee/label/date ranges; URL persisted; bulk operations where appropriate.
- **Saved views**: shareable filters/layout presets; pinning.
- **Notifications**: event-driven + scheduled reminders (due soon/overdue) with preferences.
- **Audit logs**: immutable audit trail for all privileged mutations.
- **Integrations**: at minimum chat + calendar linkage; webhook surface for project events.

Must-have platform/enterprise features:
- **RBAC + module gating**: deny-by-default, backend enforced, tenant safe.
- **Tenant isolation**: every read/write scoped at data layer; cross-tenant protection tests.
- **Export**: audit log export and (future) project/ticket export.
- **API keys (future)**: key issuance + scoped permissions + audit.

### 2.4 StreamlineOS differentiation (why choose us)

StreamlineOS must be competitive not only on parity, but on **cross-module leverage** that the top platforms either bolt on or price separately.

- **Module-based pricing + module gating**
  - Projects is a paid module gated by org settings; project submodules (`sprints`, `epics`, `timeTracking`, `wiki`) are also gated (§7).
  - The experience must degrade gracefully: “module disabled” states, not broken routes.
- **Deep integrations (built-in, not add-ons)**
  - **Chat → ticket actions**: mention tickets and change ticket status from chat with proper RBAC and audit (§13.1–§13.2).
  - **Calendar ↔ tickets**: link/unlink and create tickets from calendar flows (§13.4).
  - **Automation engine**: project automations route exists; must plug into the global automation system (`/projects/[projectId]/automations`).
  - **Offline chat queue**: chat remains usable offline; entity references must be durable and replayable (metadata, not regex-parsed text).
- **Enterprise readiness**
  - **Audit + RBAC everywhere**: every privileged action audited; permission changes are respected mid-session.
  - **Audit export (future)**: export by date range, actor, and entity.
  - **Permission simulation (future)**: admin can simulate another role/user to validate access before applying changes.
  - **API keys (future)**: scoped keys for integrations; rate-limited; audited.

---

## 3) Non-goals

- Replacing the existing chat transport (Ably + polling fallback remains).
- Rewriting Calendar UI; we extend `frontend/features/calendar/*` to support work-item linking.
- Shipping AI PM features (the `tasks/pm/049..053` outlines remain “future”).

---

## 4) Ground truth from this repo (observed)

### 4.1 Existing route surface (must remain canonical)
From `PAGES.md` and `frontend/app/`:
- Projects
  - `/projects` (list)
  - `/projects/[projectId]` (board with `view=` switcher: board/list/table/calendar/gantt/workload)
  - `/projects/[projectId]/backlog`
  - `/projects/[projectId]/sprints`
  - `/projects/[projectId]/timeline`
  - `/projects/[projectId]/epics`
  - `/projects/[projectId]/cycles`
  - `/projects/[projectId]/modules`
  - `/projects/[projectId]/milestones`
  - `/projects/[projectId]/pages`
  - `/projects/[projectId]/views`
  - `/projects/[projectId]/intake`
  - `/projects/[projectId]/my-tickets`
  - `/projects/[projectId]/analytics`
  - `/projects/[projectId]/budget`
  - `/projects/[projectId]/settings`
  - `/projects/[projectId]/whiteboard`
  - `/projects/[projectId]/reports`
  - `/projects/[projectId]/automations`
  - `/projects/[projectId]/webhooks`
  - plus: `/projects/templates`, `/projects/portfolio`, `/projects/roadmap`, `/projects/resource-allocation`
- Collaboration
  - `/chat` (channels + messages + threads + link preview)
  - `/calendar` (Big Calendar UI + event create/edit + RSVP + export)
  - `/settings/integrations/calendar` (connections)

### 4.2 Existing key UI components (reuse-first)
- Projects list
  - `frontend/features/projects/project-list/new-project-dialog.tsx`
  - `frontend/features/projects/project-list/project-card.tsx`
  - `frontend/features/projects/project-list/project-list-row.tsx`
  - `frontend/features/projects/project-list/project-filter-bar.tsx`
- Project board + tickets
  - `frontend/app/(authenticated)/projects/[projectId]/page.tsx` (view switcher + ticket filter bar + ticket sheet routing via `?ticket=`)
  - `frontend/features/projects/views/*` (kanban/list/table/calendar/gantt/workload)
  - `frontend/features/projects/ticket-details/ticket-details-dialog.tsx` (Sheet)
  - `frontend/features/projects/ticket-details/activity-feed.tsx` (comments + reactions + mentions UI)
  - `frontend/features/projects/comments/mention-textarea.tsx`
- Chat
  - `frontend/features/chat/message-input.tsx` (attachments + emoji + **user mentions only**)
  - `frontend/features/chat/chat-bubble.tsx` (copy message link already exists)
  - `frontend/hooks/api/chat.ts` (`metadata` field exists on Message; `useEntityChannel` exists)
  - `frontend/hooks/api/chat.ts` includes `useLinkPreview(url)` → `GET /chat/link-preview`
- Calendar
  - `frontend/features/calendar/calendar-view.tsx` (Big calendar wrapper)
  - `frontend/features/calendar/event-create-dialog.tsx` / `event-detail-sheet.tsx`
  - Calendar event payload already supports `entityType` + `entityId` (but UI doesn’t expose it yet)

### 4.3 Existing types that constrain the PRD (do not invent new enums lightly)
From `frontend/types/projects/shared.ts`:
- `ProjectStatusValue`: `"ACTIVE" | "COMPLETED" | "ARCHIVED"`
- `TicketStatus`: `"TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE"`
- `TicketPriority`: `"LOW" | "MEDIUM" | "HIGH" | "URGENT"`
- `WorkItemRelationType`: `"blocks" | "blocked_by" | "duplicate_of" | "relates_to"`
- Many PM entities already exist in types: comments, attachments, watchers, custom fields, intake, views.

---

## 5) Personas

- **Org Owner / Admin**: creates projects, manages members, deletes projects, configures workflows.
- **Project Manager**: manages backlog/sprints/epics, assigns work, monitors progress.
- **Contributor**: executes tickets, updates status, comments, links calendar events.
- **Viewer / Stakeholder**: reads project state, views reports, follows tickets, participates in chat without privileged actions.

---

## 6) Information architecture (IA) & navigation rules

### 6.1 Primary navigation
- Projects entry: `/projects`
- Inside a project, board is the default: `/projects/[projectId]`
- Subsections are route-based (not tabs inside one mega page) per existing route map.

### 6.2 Deep-linking rules (must support sharing)
- **Project**: `/projects/[projectId]`
- **Ticket**: `/projects/[projectId]?ticket=[ticketId]` (existing pattern; TicketDetailsDialog opens)
- **Ticket comment permalink** (new, required): `/projects/[projectId]?ticket=[ticketId]&comment=[commentId]`
  - Opening this URL must: open TicketDetailsDialog and scroll/highlight the specific comment (and its parent if it is a reply).
- **Chat message permalink** (already exists in UI): `/chat?...&message=[messageId]` (exact params to be standardized; currently ChatBubble adds `?message=` to the current URL)
- **Chat → ticket**: clicking a ticket mention in chat opens TicketDetailsDialog in the correct project context (see §13.2).

---

## 7) Module gating + RBAC (mandatory)

### 7.1 Org module gating
Use the existing org module system (`/settings/modules`, `useModuleEnabled(...)`, `RequireModule`) to gate the Projects module globally:
- Module key: `projects` (confirm against actual module catalog in backend; frontend must treat module as remote truth)
- If disabled: hide Projects in navigation, block `/projects/*` routes with a friendly “module disabled” state and a link to `/settings/modules` when user has `settings:manage`.

### 7.2 Project-level modules (already present in create flow)
`NewProjectDialog` collects project settings modules:
- `sprints`, `epics`, `timeTracking`, `wiki`
Rules:
- Each project route must check the per-project module flag:
  - `/sprints`: requires `project.settings.modules.sprints === true`
  - `/epics`: requires `epics`
  - `/pages`: requires `wiki`
  - time tracking UI in ticket details: requires `timeTracking`
- When disabled, render a full-height empty state: “This module is turned off for this project” + CTA “Manage modules” → `/projects/[projectId]/modules` (permission-gated).

### 7.3 Permission keys (backend source of truth; frontend uses `useCan`)
The repo uses multiple permission formats today (example: `useCan("projects:delete")` exists). Standardize PM permissions to the canonical 3‑segment format going forward:
- `projects:projects:view|create|update|delete`
- `projects:tickets:view|create|update|delete|assign|export`
- `projects:comments:create|update|delete|react`
- `projects:settings:update`
- `projects:sprints:*`, `projects:epics:*`, `projects:views:*`, `projects:intake:*`, `projects:reports:view`, `projects:automation:*`, `projects:webhooks:manage`
Chat integration permissions:
- `chat:messages:create` (ticket mentions)
- `chat:actions:execute` (status change from chat; constrained by ticket permissions)
Calendar integration permissions:
- `calendar:events:update` (link/unlink ticket)
- `projects:tickets:update` (create ticket from calendar; link ticket)

**Hard rule**: permissions are resolved in backend on every request; frontend gating is UX only.

### 7.4 RBAC access invariants (fix the “created project but no access” bug)

**Observed broken behavior (from current frontend wiring)**
- Project is created via `NewProjectDialog` (`frontend/features/projects/project-list/new-project-dialog.tsx`) calling `useCreateProject()` → `POST /projects`.
- The create payload defaults to `memberIds: []` unless the user explicitly adds members.
- Clicking a project in the list navigates to `/projects/[projectId]`.
- The project route is server-gated in `frontend/app/(authenticated)/projects/[projectId]/layout.tsx`:
  - it calls `GET /projects/:projectId` via `serverApiClient`
  - **any non-2xx** currently falls into a catch and renders `AccessDeniedView` (“You’re not invited to this project”)

**Likely root cause**
- Backend `POST /projects` is not guaranteeing that the creator becomes a project member (and/or the list endpoint can return projects the user can’t open).
- Result: user sees the new project in `/projects` but `GET /projects/:id` returns 403 and the route shows “no access.”

**Non-negotiable invariants (backend behavior)**
- **Invariant A — creator always has access immediately**
  - After `POST /projects` returns 201, the same actor must be able to `GET /projects/:projectId` successfully **without any client refresh**.
- **Invariant B — creator is a member, even when `memberIds` is empty**
  - `POST /projects` must **always** create a `project_members` row for the actor (role: “owner/admin”).
  - If `memberIds` includes other users, create their membership rows too; **never** interpret `memberIds` as “replace members” for a new project.
- **Invariant C — list/detail authorization must be consistent**
  - `GET /projects` must not return projects the user cannot open unless the user is privileged (org owner / platform admin).
  - `GET /projects/:id` and `GET /projects` must apply the **same** tenant + object-level access rules.
- **Invariant D — transactional + idempotent create**
  - Create project + creator membership + optional invited members must be in **one DB transaction**.
  - Accept an `Idempotency-Key` for `POST /projects` (keyed by org + actor) to prevent duplicate projects on retries.
- **Invariant E — stable error codes + debug details**
  - If `GET /projects/:id` is denied, return 403 with `code: PROJECTS_FORBIDDEN_PROJECT` and `details.reason`:
    - `reason: "NOT_A_MEMBER" | "MISSING_PERMISSION" | "MODULE_DISABLED" | "SUSPENDED" | "ORG_MISMATCH"`
    - include `details.projectId`, `details.orgId`, `details.requiredPermission` (if applicable)

**Frontend requirements (UX only; backend remains authoritative)**
- After create success:
  - close the sheet, show toast, **navigate to** `/projects/[projectId]` using the id returned from `POST /projects`
  - show route-level loading skeleton while `/projects/[projectId]` server layout fetches the project
- If `/projects/[projectId]` returns 403/404:
  - render an explicit “Access denied” vs “Not found” message based on stable error code (not generic catch-all)
  - include a secondary hint: “If you just created this project, it may take a moment to provision access. Retry once.” (but do not hide real denials)

### 7.5 Audit log requirements for authorization failures (mandatory)

Audit logs must cover **denied access** as first-class security events (not only successful mutations).
- Emit `project.access_denied` when a user receives 403 for `GET /projects/:projectId` or any project-scoped route.
  - **fields**: `actorUserId`, `orgId`, `projectId`, `requiredPermission?`, `reason`, `requestId`, `path`, `method`
  - **privacy**: do not leak project name/metadata to the actor in the response if they lack access; audit log is internal only
- Emit `ticket.access_denied` and `comment.access_denied` similarly for ticket/comment endpoints.
- Any RBAC change that affects access (role grants, member add/remove) must emit:
  - `project.member_added|project.member_removed|project.member_role_updated`
  - and must bump permission/version caches per RBAC engine rules (backend `AccessService.bumpPermissionsVersion` when applicable).

---

## 8) Data model (backend; tenant-scoped)

> This is a conceptual model; names should match the backend repo conventions, but shapes must satisfy current frontend types (`frontend/types/projects/*` and `frontend/types/chat.ts`, `frontend/hooks/api/calendar.ts`).

### 8.1 Core tables
- `projects`
  - `id`, `org_id`, `key`, `name`, `description`, `status` (`ACTIVE|COMPLETED|ARCHIVED`), `settings` (JSON: modules flags), `manager_id`, `start_date`, `end_date`, `created_at`, `updated_at`, `deleted_at?`
- `project_members`
  - `id`, `project_id`, `org_id`, `user_id`, `role`, `joined_at`
- `tickets`
  - `id`, `org_id`, `project_id`, `ticket_number` (per project), `sequence_id` (optional), `title`, `description`, `type`, `status`, `priority`, `assignee_id`, `reporter_id`, `points/story_points`, `order`, `start_date`, `due_date`, `module_id`, `cycle_id`, `sprint_id`, `epic_id`, `parent_ticket_id`, `created_at`, `updated_at`, `deleted_at?`
- `ticket_comments`
  - `id`, `org_id`, `ticket_id`, `user_id`, `content`, `parent_comment_id`, `created_at`, `updated_at`, `deleted_at?`
- `ticket_comment_reactions`
  - `id`, `org_id`, `comment_id`, `user_id`, `emoji`, `created_at`
- `ticket_attachments`
  - `id`, `org_id`, `ticket_id`, `file_url`, `file_key`, `file_name`, `file_size`, `mime_type`, `uploaded_by`, `created_at`
- `ticket_watchers`
  - `id`, `org_id`, `ticket_id`, `user_id`, `created_at`
- `ticket_labels` (org‑level)
  - `id`, `org_id`, `name`, `color`, `created_at`
- `ticket_label_mappings`
  - `id`, `org_id`, `ticket_id`, `label_id`, `created_at`
- `ticket_relations`
  - `id`, `org_id`, `ticket_id`, `related_ticket_id`, `relation_type`, `created_at`

### 8.2 Planning tables (existing routes require these)
- `sprints` (project-scoped; `PLANNED|ACTIVE|COMPLETED`)
- `project_statuses` / `custom_states` (project-scoped; supports `StateGroup`)
- `cycles`, `modules`, `milestones`
- `project_views` (saved filters; layout type)
- `intake_requests`

### 8.3 Chat linkage tables (new)
We need a durable link between chat messages and work items without parsing plain text.
- `chat_message_entities`
  - `id`, `org_id`, `message_id`, `entity_type` (`ticket|comment|project`), `entity_id` (string), `created_at`
Notes:
- This should populate `Message.metadata` (already exists) so the UI can render mentions and action controls.

### 8.4 Calendar linkage (already partially modeled)
Calendar payload already has:
- `entity_type?: string | null`
- `entity_id?: string | null`
We standardize:
- `entity_type = "ticket"` and `entity_id = String(ticketId)` for linked ticket.

---

## 9) Backend API contract (NestJS) — required endpoints + error model

> The frontend already calls many endpoints; this section formalizes them and adds missing ones for the must-haves.

### 9.1 Error envelope (standard)
All non-2xx responses:

```json
{
  "error": {
    "code": "PROJECTS_FORBIDDEN",
    "message": "Human readable, safe for UI",
    "details": { "field": "optional" },
    "requestId": "trace id"
  }
}
```

Rules:
- `code` is stable; UI uses codes, not message substring parsing.
- `requestId` is propagated to logs/traces.

### 9.1.1 Error taxonomy (codes)

> The UI must map these codes to friendly copy + correct CTA. Do not branch on raw `message` text.

Auth/session:
- `AUTH_UNAUTHENTICATED` (401): needs login
- `AUTH_FORBIDDEN` (403): lacks permission

Projects:
- `PROJECTS_NOT_FOUND` (404)
- `PROJECTS_FORBIDDEN_PROJECT` (403)
- `PROJECTS_INVALID_PROJECT_ID` (400)
- `PROJECTS_PROJECT_KEY_CONFLICT` (409)
- `PROJECTS_PROJECT_DELETE_BLOCKED` (409): requires reassignment or has constraints

Tickets:
- `PROJECTS_TICKET_NOT_FOUND` (404)
- `PROJECTS_FORBIDDEN_TICKET` (403)
- `PROJECTS_INVALID_TICKET_STATUS` (400)
- `PROJECTS_TICKET_CONFLICT` (409): stale update / optimistic lock

Comments:
- `PROJECTS_COMMENT_NOT_FOUND` (404)
- `PROJECTS_FORBIDDEN_COMMENT` (403)

Chat actions:
- `CHAT_ACTION_FORBIDDEN` (403)
- `CHAT_ACTION_TICKET_STATUS_FAILED` (409/422): backend refused transition

Calendar:
- `CALENDAR_EVENT_NOT_EDITABLE` (422): non-`source:"event"` item
- `CALENDAR_LINK_FORBIDDEN` (403)

### 9.2 Projects
Existing (inferred from hooks):
- `GET /projects` (supports `page`, `limit`, `search`, `status`)
- `POST /projects`
- `GET /projects/:projectId`
- `PATCH /projects/:projectId`
- `DELETE /projects/:projectId`
- `GET /projects/:projectId/members`
- `POST /projects/:projectId/members`
- `DELETE /projects/:projectId/members` (body includes `userId`)
- `GET /projects/labels` (org labels)
- `GET /projects/:projectId/labels` (project-specific view of org labels, if applicable)

Missing (must add):
- `PATCH /projects/:projectId/archive` and `/restore` OR encode via `PATCH status=ARCHIVED` (decide one; keep idempotent)
- `GET /projects/:projectId/permissions` (optional, for UI to display allowed actions without overfetching `/me/access`)

### 9.3 Tickets
Existing (inferred from hooks):
- `GET /projects/:projectId/tickets` (paged, filterable)
- `POST /projects/:projectId/tickets`
- `GET /projects/:projectId/tickets/:ticketId`
- `PATCH /projects/:projectId/tickets/:ticketId`
- `DELETE /projects/:projectId/tickets/:ticketId`
- `PATCH /projects/:projectId/tickets/reorder` (bulk move)
- `POST /projects/:projectId/tickets/bulk` (bulk update)
- `GET /projects/:projectId/tickets/:ticketId/subtasks`
- Labels:
  - `POST /projects/:projectId/tickets/:ticketId/labels`
  - `DELETE /projects/:projectId/tickets/:ticketId/labels/:labelId`
- Comments:
  - `POST /projects/:projectId/tickets/:ticketId/comments`
- Attachments:
  - `POST /projects/:projectId/tickets/:ticketId/attachments`
- Relations:
  - `GET /projects/:projectId/tickets/:ticketId/relations`
  - `POST /projects/:projectId/tickets/:ticketId/relations`
  - `DELETE /projects/:projectId/tickets/:ticketId/relations?relatedId=...`

Missing (must add):
- `GET /projects/:projectId/tickets/:ticketId/comments/:commentId` (for comment permalink unfurl + deep link hydration)
- `GET /projects/search/tickets?q=...` (org-scoped search endpoint for chat/calendar pickers)

### 9.4 Ticket activity history (existing UI expects it)
- `GET /projects/:projectId/tickets/:ticketId/activity`
  - returns entries with `action`, `label`, `fromValue`, `toValue`, `user`, `createdAt`

### 9.5 Chat integration (existing + new)
Existing:
- `GET /chat/channels`
- `GET /chat/channels/:channelId`
- `GET /chat/channels/:channelId/messages` (+ cursor)
- `POST /chat/channels/:channelId/messages` (supports `metadata`)
- `GET /chat/link-preview?url=...`

Missing (must add):
- `POST /chat/channels/:channelId/messages` must accept structured entity refs:
  - `metadata.entities: [{ type: "ticket", id: "123", projectId: 45 }]`
  - `metadata.entities: [{ type: "comment", id: "999", ticketId: 123, projectId: 45 }]`
- `POST /chat/actions/ticket-status`
  - body: `{ channelId, ticketId, projectId, nextStatus }`
  - behavior:
    - validates permission `projects:tickets:update` for that ticket (BOLA)
    - updates ticket status
    - emits a chat “action message” (or attaches `actionStatus` to an existing message)
    - emits audit + ticket activity event

### 9.6 Calendar integration (existing + new)
Existing:
- `GET /calendar/events?start=...&end=...` returns mixed sources, including `source: "task"` already supported by type.
- `POST /calendar/events` accepts `entityType/entityId` (already in type) but UI does not send it yet.
- `PUT /calendar/events/:id` for edits.

Missing (must add):
- Ensure `/calendar/events` includes ticket due dates as `source: "task"` and sets:
  - `entityType="ticket"`, `entityId=String(ticketId)`
  - `title` includes ticket key: `${project.key}-${ticket.ticketNumber}: ${ticket.title}`

---

## 10) TanStack Query + caching + invalidation requirements (frontend)

### 10.1 Query keys must include params (avoid cache poisoning)
Observed issue: `useProjects(filters)` currently uses `queryKeys.projects.list()` without the `filters`. Fix spec:
- `queryKeys.projects.list(filters?)` must include `filters` in the key.

### 10.2 Calibrated stale times
Defaults:
- Projects list: `staleTime: 60_000`, `refetchInterval: 30_000` only if we need live updates (otherwise prefer manual refresh)
- Project detail (board): `staleTime: 30_000`
- Ticket detail: `staleTime: 15_000` (interactive)
- Ticket activity: `staleTime: 30_000`
- Calendar events: `staleTime: 120_000` (already)
- Chat link preview: `staleTime: 10min` (already)

### 10.3 Invalidation map (must be consistent)
When a ticket changes (status/title/assignee/dates/labels/comments):
- invalidate:
  - `queryKeys.projects.ticket(ticketId)`
  - `queryKeys.projects.tickets({ projectId, ...activeFilters })` (prefix invalidation)
  - `queryKeys.projects.detail(projectId)` when board page derives tickets from project detail
  - `queryKeys.projectReports.all` when reports depend on tickets
  - calendar events range keys if due dates are shown in calendar feed

When a comment is added:
- invalidate ticket detail
- add ticket activity entry (backend) and ensure activity hook invalidates or streams

---

## 11) Observability + audit (mandatory)

### 11.1 Audit events (immutable)
Emit audit log rows for:
- `project.created|updated|archived|deleted`
- `project.member_added|member_removed|member_role_updated`
- `ticket.created|updated|deleted|status_changed|assigned|unassigned|label_added|label_removed|due_date_changed`
- `ticket.comment_created|comment_replied|comment_deleted`
- `chat.ticket_mentioned|chat.ticket_status_changed`
- `calendar.event_linked_ticket|event_unlinked_ticket|ticket_created_from_calendar`

### 11.2 Metrics
- API latency per endpoint (p50/p95/p99)
- ticket status transition counts
- chat action execution success/failure count
- calendar link/unlink counts

### 11.3 Tracing
Trace IDs surfaced to clients as `requestId` in error envelopes and response headers.

### 11.4 Notifications + reminders (scheduling)

**Principles**
- Notifications are side effects of backend events; frontend never schedules reminders itself.
- “Due soon / overdue” is computed on a backend schedule (cron/queue) and produces notifications idempotently.

**Immediate notifications**
- Ticket assigned to you
- You were mentioned in a ticket comment
- Ticket status changed (watchers + assignee + reporter)
- Comment reply to your comment
- Chat action executed on your ticket (status changed from chat)

**Scheduled notifications**
- Ticket due in 24h (or org-configured window)
- Ticket overdue (daily digest)

**Channels**
- In-app (mandatory)
- Email (optional; respect user prefs)

**Audit**
- Every notification emitted has an audit event referencing source entity.

### 11.5 Ops dashboards (production readiness)

Dashboards should be built around the actual business risks:
- **Projects health**
  - project create/update/delete/archive rate
  - ticket create/update/delete rate
  - ticket status transitions (counts by status pair)
- **Integrations health**
  - chat action execution: success/error by code
  - calendar link/unlink success/error by code
- **Performance**
  - p50/p95/p99 latency per endpoint family (`/projects/*`, `/chat/*`, `/calendar/*`)
  - DB query latency (top N slow queries) and error rate
- **Reliability**
  - 4xx/5xx rate by endpoint and error code
  - retries and timeouts (especially search + chat actions)

### 11.6 Alerts (minimum set)

Alerts must be actionable and tied to user-facing impact:
- **High error rate**: sustained 5xx rate above threshold for `/projects/*`, `/chat/actions/*`, `/calendar/*`.
- **Latency regression**: p95 latency regression above threshold for list/search endpoints.
- **Queue backlog / stuck jobs**: notifications/reminders pipeline lag, or repeated failures (see DLQ).
- **Rate limit spikes**: unusual spikes on search endpoints (possible abuse or client bug).

### 11.7 Queues, retries, and DLQ (required for side-effects)

All async side-effects (notifications/reminders, webhook delivery, calendar aggregation jobs if any) must:
- be **idempotent** (safe retries),
- have bounded retries with exponential backoff,
- emit structured failure events,
- and route poison messages into a **DLQ** with visibility and replay tooling.

---

## 12) Security (OWASP + tenant isolation)

### 12.1 BOLA (object-level checks)
Every endpoint taking `projectId`, `ticketId`, `commentId`, `eventId` must:
- verify session
- verify org/tenant match
- verify user has permission *for that object* (not just module access)

### 12.2 Data minimization
Ticket detail endpoints return only required fields; avoid returning full user objects unless needed.

### 12.3 Rate limiting & abuse controls
- Search endpoints (ticket search for chat/calendar) rate limited.
- Chat action endpoints rate limited per user per channel.

---

## 13) Integrations (must-haves)

## 13.1 Chat: ticket mention/tagging (must-have)

### UX
- In `MessageInput`, typing `#` opens an “Insert ticket” picker (like user mentions).
- Search supports: `PROJ-123`, `#123`, or title keywords.
- Selecting a ticket inserts a stable token into text, e.g. `PROJ-123` (derived from `project.key` + `ticket.ticketNumber`).
- Message also stores structured metadata:
  - `metadata.entities += { type:"ticket", id:String(ticketId), projectId }`

### Rendering
- In `ChatBubble`, detect ticket entities from metadata and render them as a pill/card:
  - shows key, title, status badge, priority badge
  - click → open ticket (navigates to `/projects/[projectId]?ticket=[ticketId]`)
- If user pastes a ticket URL, treat it the same as selecting from picker (parse + attach metadata).

### States
- If user lacks access to ticket: render “Restricted ticket” pill (no title), clicking shows a toast and does not navigate.

## 13.2 Chat: change ticket status from chat (must-have)

### UX
- Ticket pill includes a status dropdown when:
  - user has `projects:tickets:update`
  - and ticket is not archived/locked
- Selecting a new status:
  - optimistically updates the pill UI
  - calls `POST /chat/actions/ticket-status`
  - on failure: reverts UI and shows a toast with error code mapping
- System message posted to channel:
  - “Alice moved PROJ-123 from TODO → IN_PROGRESS”
  - This must include metadata to re-open ticket.

## 13.3 Chat: share comment URL (must-have)

### Comment permalink UX (Projects)
- In `ActivityFeed`, each comment and reply has a “Copy link” action:
  - copies `/projects/[projectId]?ticket=[ticketId]&comment=[commentId]`
  - When opened, TicketDetailsDialog scrolls/highlights the comment.

### Chat unfurl
- When a message contains a comment permalink:
  - unfurl preview card showing:
    - ticket key + title
    - comment author + relative time
    - comment excerpt (first ~140 chars)
  - click takes you to the permalink and opens the ticket sheet to that comment.

## 13.4 Calendar: link tickets to events + create ticket (must-have)

### Link/unlink ticket
- In `EventCreateDialog`:
  - add a “Linked work item” section with a ticket search picker.
  - selecting a ticket sets `entityType="ticket"`, `entityId=String(ticketId)` in payload.
- In `EventDetailSheet`:
  - if event has `entityType="ticket"`, show a “Linked ticket” card with click → open ticket.
  - show an “Unlink” action (permission-gated).

### Create ticket from calendar
Two entry points:
- In calendar header “Add” dropdown:
  - “Add event” (existing)
  - “Add ticket due date” (new) → opens a TicketCreate sheet with due date prefilled, optional auto-link to a new calendar event.
- On slot select:
  - if user selects a time slot, offer a split button or follow-up dialog: create Event vs Ticket.

---

## 14A) Click-by-click interaction specs (must-have flows)

> These flows are intentionally **over-specified** so implementation can be done without ambiguity. Each flow includes: entry points, click-by-click steps, redirects/URLs, UI states, permissions/denials, edge cases, and where the behavior lives (frontend vs backend).

### 14A.1 `/projects` — Edit / archive / delete project inline (must-have)

**Entry points**
- `/projects` grid cards (`frontend/features/projects/project-list/project-card.tsx`)
- `/projects` list rows (`frontend/features/projects/project-list/project-list-row.tsx`)

**Click-by-click**
- User hovers a card/row → sees an overflow “…” button (kebab).
- User clicks “…” → a dropdown opens with:
  - **Edit project**
  - **Archive project** / **Restore project** (label depends on current status)
  - **Delete project…** (destructive; gated)
- User clicks **Edit project**
  - A right-side Sheet opens (small form → Dialog; multi-section form → Sheet; this is a Sheet because it mirrors project settings + member selection).
  - Fields: name, description, status (ACTIVE/COMPLETED/ARCHIVED), optional members selector.
  - User clicks **Save**
    - button becomes disabled and shows “Saving…”
    - mutation runs
    - on success: sheet closes, toast “Project updated”, list item updates in-place without a full route reload
    - on failure: keep sheet open, show toast with stable error code mapping, preserve input
- User clicks **Archive project**
  - Confirm dialog appears (“Archive project?”) with copy “You can restore later.”
  - Confirm runs `PATCH /projects/:id` (status=ARCHIVED) or archive endpoint (§9.2 decision).
  - On success: toast, list item badge updates to ARCHIVED; item remains visible if filter allows.
- User clicks **Delete project…**
  - Confirm dialog appears with “Type project key to confirm” (optional but recommended).
  - Confirm runs `DELETE /projects/:id`.
  - On success: toast, item is removed from list; if the user is currently on `/projects` (they are), no redirect needed.

**Redirect behavior**
- No redirect for edit/archive/delete (stay on `/projects`).
- If user clicks the card/row itself (not the overflow menu), navigate to `/projects/[projectId]`.

**States**
- Loading: use existing skeleton layout on initial page load.
- Mutation pending:
  - disable only the acted-upon row/card controls (avoid freezing whole page)
  - show spinner in the menu item or in the dialog confirm CTA
- Error:
  - show toast; do not silently swallow
  - if 403, hide the action on next render (refresh access state per §18.2)

**Permissions / denial UX**
- **Backend** enforces:
  - edit/archive: `projects:projects:update`
  - delete: `projects:projects:delete` (or backward-compatible alias for existing `projects:delete` until migration finishes)
- **Frontend**:
  - hide menu items if `useCan(...)` denies
  - if the user clicks via stale UI (permission changed mid-session), backend 403 must show toast and then UI should refresh access state and remove the action.

**Edge cases**
- Deleting a project that still has open tickets may be blocked:
  - backend returns `PROJECTS_PROJECT_DELETE_BLOCKED` (409)
  - UI shows a dialog explaining the constraint + CTA to open `/projects/[projectId]/settings` or an admin-only cleanup flow

**Where the behavior lives**
- **Frontend UI**: `project-card.tsx`, `project-list-row.tsx`, new “edit project” sheet under `frontend/features/projects/project-list/`
- **Frontend data**: `useUpdateProject`, `useDeleteProject` in `frontend/hooks/api/projects/projects.ts`
- **Backend**: `PATCH /projects/:id`, `DELETE /projects/:id` (RBAC + tenant + object checks; audit events)

### 14A.2 `/chat` — Ticket tagging from chat input (must-have)

**Entry points**
- Message composer in `frontend/features/chat/message-input.tsx`

**Click-by-click**
- User types `#` in the message textarea.
  - A “Tickets” picker popover opens (same placement behavior as the existing @mentions popover).
  - Picker shows a search input (optional) and results list.
- User types additional characters (e.g. `#PROJ-12`, `#123`, `#login bug`)
  - The picker debounces network calls (300ms) and updates results.
- User navigates results with arrow keys and presses Enter OR clicks a result.
  - The UI inserts a **ticket token** into the textarea at the caret:
    - displayed string uses stable identity `${project.key}-${ticket.ticketNumber}`
  - The send payload must also include structured metadata:
    - `metadata.entities += { type:"ticket", id:String(ticketId), projectId }`
- User presses Backspace directly after a token
  - the whole token is removed as one unit (no partial token corruption)
- User sends the message
  - optimistic message render is shown immediately
  - on success: message is persisted with metadata
  - on failure: optimistic message is rolled back (existing `useSendMessage` behavior)

**Redirect behavior**
- No redirects on send.
- Clicking a rendered ticket pill in chat navigates to `/projects/[projectId]?ticket=[ticketId]` (see §6.2).

**States**
- Picker loading: show inline spinner + “Searching tickets…”
- Picker empty: “No matching tickets”
- Error: “Can’t search tickets right now” with “Retry”

**Permissions / denial UX**
- Searching and inserting:
  - if user lacks `projects:tickets:view`, the picker must not show ticket titles; show a single disabled row “You don’t have access to tickets.”
- Rendering:
  - if user lacks access to the referenced ticket (403 on hydration/unfurl), render “Restricted ticket” pill and prevent navigation.

**Edge cases**
- Offline: typing `#` still opens the picker but shows “Offline” and no results; user can still send plain text.
- Stale ticket: if ticket is deleted, pill renders “Ticket deleted” with no navigation.

**Where the behavior lives**
- **Frontend UI**: `frontend/features/chat/message-input.tsx` (new `#` trigger), `frontend/features/chat/chat-bubble.tsx` (render pill)
- **Frontend data**: new ticket search hook under `frontend/hooks/api/projects/` calling `GET /projects/search/tickets`
- **Backend**: `GET /projects/search/tickets` (RBAC + tenant safe; rate limited; paginated)

### 14A.3 `/chat` — Change ticket status from a chat ticket pill (must-have)

**Entry points**
- Ticket pill rendered inside `frontend/features/chat/chat-bubble.tsx`

**Click-by-click**
- User clicks the status badge/dropdown on a ticket pill.
  - Dropdown opens with the canonical statuses (`TODO`, `IN_PROGRESS`, `IN_REVIEW`, `DONE`) in order.
  - Current status is selected/checked.
- User selects a new status.
  - UI immediately updates the pill status optimistically and shows a subtle “Saving…” indicator.
  - Client calls `POST /chat/actions/ticket-status` with `{ channelId, projectId, ticketId, nextStatus }`.
- Success:
  - pill stays updated
  - a system message appears in the channel:
    - “Alice moved PROJ-123 from TODO → IN_PROGRESS”
    - system message includes metadata entities so it can be clicked like a ticket mention
- Failure:
  - pill status reverts to previous status
  - toast shows a stable error mapping:
    - 403 → “You don’t have permission to update this ticket.”
    - 409/422 → “This status change is not allowed.”

**Redirect behavior**
- None.

**States**
- Pending: disable the dropdown until request finishes; avoid double-submit.

**Permissions / denial UX**
- Backend checks **both**:
  - chat action permission (`chat:actions:execute`)
  - ticket update permission on the target ticket (`projects:tickets:update`) (BOLA-safe)
- Frontend hides the control when `useCan("projects:tickets:update")` denies; but backend remains authoritative.

**Where the behavior lives**
- **Frontend UI**: `chat-bubble.tsx` (status dropdown on pill)
- **Frontend data**: a new mutation hook under `frontend/hooks/api/chat.ts` (or a dedicated `frontend/hooks/api/chat-actions.ts`) calling `POST /chat/actions/ticket-status`
- **Backend**: `POST /chat/actions/ticket-status` + emits audit + ticket activity + optional chat system message

### 14A.4 `/projects/[projectId]` — Comment permalinks + deep-link open (must-have)

**Entry points**
- Ticket details sheet activity section: `frontend/features/projects/ticket-details/activity-feed.tsx`

**Click-by-click**
- User hovers a comment (top-level or reply).
  - A small actions row appears (at minimum: “Copy link”).
- User clicks **Copy link**
  - app copies: `/projects/[projectId]?ticket=[ticketId]&comment=[commentId]`
  - toast “Link copied”
- Another user opens the link:
  - `/projects/[projectId]` loads
  - TicketDetailsDialog opens automatically (because `?ticket=` is present)
  - The activity feed scrolls to the specific comment and highlights it for ~2s

**Redirect behavior**
- Direct navigation to the permalink URL must be supported.
- Opening the ticket sheet must not cause a full route redirect; it is URL-param driven.

**States**
- If ticket loads but comment id is missing:
  - show an inline “Comment not found” banner inside the sheet (ticket still usable)
- If user lacks ticket access:
  - show a stable forbidden UI (403 code), no comment content leakage

**Permissions / denial UX**
- Copy link is allowed for any user who can view the ticket/comment.
- If viewer lacks access, the deep link must resolve to:
  - either `/access-denied?...` (server-side `requirePermission`) or
  - a safe “restricted” state inside the ticket sheet (client-side), depending on how the route is gated.

**Where the behavior lives**
- **Frontend UI**: `activity-feed.tsx` adds “Copy link” per comment; `ticket-details-dialog.tsx` handles scroll/highlight
- **Frontend routing**: `frontend/app/(authenticated)/projects/[projectId]/page.tsx` reads `comment` param and passes it down
- **Backend**: optional `GET /projects/:projectId/tickets/:ticketId/comments/:commentId` (for unfurl/hydration; see §9.3)

### 14A.5 `/calendar` — Link / unlink a ticket to a calendar event (must-have)

**Entry points**
- Create/edit event sheet: `frontend/features/calendar/event-create-dialog.tsx`
- Event detail sheet: `frontend/features/calendar/event-detail-sheet.tsx`

**Click-by-click (link on create/edit)**
- User opens “New Calendar Event”.
- User finds “Linked work item” section and clicks “Link a ticket”.
- Ticket picker opens (same search UX as chat ticket picker, shared component is recommended).
- User selects a ticket:
  - form shows a linked-ticket card: key, title, status
  - event payload includes `entityType="ticket"`, `entityId=String(ticketId)`
- User clicks “Create Event” / “Save Changes”.
  - Pending state disables CTA and shows “Creating…” / “Saving…”
  - Success closes sheet and refreshes calendar view

**Click-by-click (unlink in detail)**
- User opens event detail.
- If the event is linked, a “Linked ticket” card is shown:
  - click opens `/projects/[projectId]?ticket=[ticketId]`
  - “Unlink” button removes the link (permission gated)
- Unlink:
  - confirm dialog (“Unlink ticket?”)
  - pending disables unlink button
  - success updates event detail view and emits audit

**Permissions / denial UX**
- Backend enforces `calendar:events:update` and ticket visibility for linking.
- If the user can view calendar event but not the ticket:
  - show “Restricted ticket” card without title; no navigation

**Where the behavior lives**
- **Frontend UI**: `event-create-dialog.tsx` and `event-detail-sheet.tsx`
- **Frontend data**: `useCreateCalendarEvent` / `useUpdateCalendarEvent` hooks (extend payload to include entity fields)
- **Backend**: calendar create/update endpoints persist `entityType/entityId`; emits audit events `calendar.event_linked_ticket|event_unlinked_ticket`

### 14A.6 `/calendar` — Create a ticket from calendar (must-have)

**Entry points**
- Calendar header “Add” dropdown (in `frontend/features/calendar/calendar-view.tsx`)
- Slot select flow (user drags/selects time range on the calendar)

**Click-by-click**
- User picks “Add ticket due date”.
- A “Create Ticket” Sheet opens:
  - required: project selector, title
  - prefilled: due date/time derived from selected calendar slot (or today if header action)
  - optional: also create a calendar event (toggle) and link it to the ticket
- User clicks “Create ticket”
  - pending disables CTA and shows “Creating…”
  - on success:
    - toast “Ticket created”
    - if “also create event” is enabled, calendar refreshes and shows the event
    - redirect behavior:
      - default: open the ticket sheet directly in its project context:
        - navigate to `/projects/[projectId]?ticket=[ticketId]`

**Permissions / denial UX**
- Requires `projects:tickets:create`.
- If denied, show toast and keep user on calendar.

**Where the behavior lives**
- **Frontend UI**: calendar view adds entry points; reuse ticket create dialog pattern (`CreateTicketDialog`) where possible
- **Frontend data**: `POST /projects/:projectId/tickets` mutation + optional calendar create mutation
- **Backend**: ticket create endpoint is authoritative; emits audit + activity; optional event create persists link

## 14) Page-by-page PRD (click-by-click, states, acceptance)

> For every page: implement loading/empty/error states, keyboard accessibility, and ensure main content scrolls without shell scroll.

### 14.0 Global UX + accessibility requirements (applies to every route)

Loading/empty/error:
- Loading state must match final layout (skeletons, not spinners).
- Empty states fill the content area and include a primary CTA.
- Error states show a human message + retry button.

Keyboard + a11y:
- Every interactive icon button must have `aria-label`.
- Menus, dialogs, and sheets must be fully navigable by keyboard (Tab/Shift+Tab, Esc closes, Enter activates).
- Mention/ticket pickers must use `role="listbox"` and `role="option"` semantics (like existing `MentionTextarea`).

Performance:
- Lazy-load large client components (whiteboard, gantt, heavy charts).
- Avoid N+1 fetch waterfalls in server components; initiate parallel backend calls where needed.

Security (frontend posture):
- UI gating is advisory; never assume hidden button == secure action.
- Treat all route params and query params as untrusted input.

### 14.1 `/projects` — Projects list

**Purpose**
- Discover, filter, create, and manage projects quickly.

**Entry points**
- Sidebar “Projects”
- Global search results (future)

**Primary components (existing)**
- `PageWrapper` with `NewProjectDialog` action
- `ProjectFilterBar` (search/status/view)
- `ProjectCard` (grid) / `ProjectListRow` (list)
- `ProjectsEmptyState`, `EmptyState`, `ErrorState`, skeletons

**Must-add components**
- Project row/card actions menu (kebab/overflow)
  - **Edit** (opens a Sheet using existing `updateProjectSettingsInputSchema` and `useUpdateProject`)
  - **Archive** (sets status=ARCHIVED via update)
  - **Delete** (only when permitted; uses existing `useDeleteProject`)

**Click-by-click**
- Click “New Project” → Sheet opens (`NewProjectDialog`) → fill fields → click “Create Project”.
  - **Frontend**: calls `useCreateProject().mutateAsync(...)`.
  - **Backend**: `POST /projects` creates the project **and** creator membership in a single transaction (§7.4).
  - **Loading state**: CTA becomes disabled + label “Creating…”, toast shows “Creating project…”.
  - **Success**:
    - close sheet + reset form
    - show toast “Project created successfully”
    - **redirect** to `/projects/[projectId]` (id from response)
    - **list refresh**: invalidate projects list cache so `/projects` shows the new project if the user navigates back
  - **Error**:
    - show toast with stable error mapping (`PROJECTS_PROJECT_KEY_CONFLICT`, `AUTH_FORBIDDEN`, etc.)
    - keep sheet open and preserve user input
- Hover a project card/row → show overflow menu → choose Edit → update name/description/status → Save → toast → card updates without full reload.
- Choose Delete → confirm dialog → on success remove from list and show toast.

**Keyboard**
- Search input focuses with `/` (optional) or tab navigation; Enter applies search.
- Overflow menu reachable via Tab; actions use Enter/Space.

**States**
- Loading: existing skeletons.
- Empty (no projects): `ProjectsEmptyState` with CTA “Create Project”.
- Empty (filtered): existing `EmptyState` with “Clear all filters”.
- Error: `ErrorState` with retry.

**Acceptance criteria**
- User can edit/delete/archive from this page without navigating to settings.
- Filters persist in URL.
- All actions enforce RBAC (buttons hidden/disabled in UI; backend enforces).

### 14.2 `/projects/[projectId]` — Project board (view switcher)

**Purpose**
- Execute work across multiple views; open ticket details as Sheet via URL param.

**Existing behavior**
- `?ticket=` opens `TicketDetailsDialog`.
- `ViewSwitcher` toggles: `board|list|table|calendar|gantt|workload`.

**Must-add**
- Ticket mention key must be stable in UI: display `${project.key}-${ticket.ticketNumber}` consistently (already done in kanban card).
- Shareable ticket permalink button in ticket header (optional; must not conflict with comment permalink).

**Acceptance**
- Switching views preserves filters and selected ticket where appropriate.
- URL-driven selection is stable (refresh keeps the ticket open).

### 14.3 `/projects/[projectId]/settings` — Project settings

**Existing**
- Form-based update using `react-hook-form` + Zod schema
- Labels, statuses, custom fields sections
- Danger zone delete gated by `useCan("projects:delete")`

**Corrections required**
- Standardize status options to the canonical enum: `ACTIVE|COMPLETED|ARCHIVED` (already).
- Ensure permissions key format is consistent; if backend uses 3-segment keys, migrate `projects:delete` to `projects:projects:delete` (backward-compatible alias).

**Acceptance**
- Settings changes reflect in `/projects` list and `/projects/[projectId]` header without stale cache.

### 14.4 `/projects/[projectId]` — Ticket details (Sheet) (must be complete)

**Purpose**
- View and edit a ticket without losing board context.

**Entry points**
- Clicking a ticket card/row/calendar item opens `/projects/[projectId]?ticket=[ticketId]` (existing).
- Chat ticket mention pill (new) opens the same route.

**Primary components (existing)**
- `TicketDetailsDialog` (Sheet)
  - `TicketHeader` (id + status + priority + delete)
  - `TicketSidebar` (assignee, sprint, etc.)
  - `TicketSubtasks`, `TicketChecklists`, `TicketCustomFields`, `TicketRelations`, `TicketTimeTracker`, `WatcherList`
  - `ActivityFeed` (comments)
  - `TicketActivityLog` (history)

**Must-add**
- Ticket permalink actions in header:
  - Copy ticket link: `/projects/[projectId]?ticket=[ticketId]`
  - Copy comment link (delegated to comments; see §13.3)
- Comment deep-link support:
  - if URL includes `comment=[commentId]`, TicketDetailsDialog must scroll and highlight the comment; if it’s a reply, scroll to the reply but keep its parent visible.

**States**
- Loading state exists.
- Restricted access state currently parses error strings; replace with error codes (`PROJECTS_FORBIDDEN_TICKET`) and render the same UX.

**Acceptance**
- Comment permalinks are stable and shareable.
- Ticket can be updated without losing current board filters.

### 14.5 `/projects/[projectId]/backlog` — Backlog grooming

**Purpose**
- Triage incoming tickets, prioritize, assign, and move into sprints/cycles/modules.

**Entry points**
- Project sidebar: Backlog
- From intake accept flow → “Open in backlog”

**Core interactions (click-by-click)**
- Create ticket → defaults status `TODO`, appears at top with correct ordering.
- Drag/drop ordering (if supported) or “Move to top/bottom”.
- Bulk select:
  - change status
  - assign user
  - set sprint
  - set priority
- Convert ticket → epic/subtask (if supported by backend)

**States**
- Loading skeleton list (no spinners).
- Empty: “No backlog items” + CTA “Create ticket”.
- Error: retry.

**Acceptance**
- Bulk actions are permission-gated and update all cached views (board/list/table + reports).
- Paginated list caps at 100/page.

### 14.6 `/projects/[projectId]/sprints` — Sprint planning & execution

**Purpose**
- Create/manage sprints; plan backlog into sprint; run sprint with progress indicators.

**Module gate**
- Requires `project.settings.modules.sprints === true`.

**Core interactions**
- Create sprint (Dialog/Sheet depending on form size; reuse existing patterns like `EntityFormSheet` used elsewhere in projects feature).
- Start sprint (only one active sprint per project).
- Complete sprint:
  - requires selecting destination for incomplete tickets (next sprint or backlog).
- View sprint burndown/velocity (where implemented).

**Acceptance**
- Sprint status transitions emit audit events and update reports.
- Starting/completing a sprint is idempotent with `Idempotency-Key`.

### 14.7 `/projects/[projectId]/epics` — Epics

**Purpose**
- Track large initiatives; link tickets to epics; roll up progress.

**Module gate**
- Requires `project.settings.modules.epics === true`.

**Core interactions**
- Create epic → choose name/description/owner/dates.
- Epic detail panel shows linked tickets; add/remove links.

**Acceptance**
- Epic progress is computed server-side (done/total) and cached.

### 14.8 `/projects/[projectId]/timeline` — Timeline (roadmap inside project)

**Purpose**
- Visualize time-bounded work (epics/milestones/tickets) in a timeline.

**Core interactions**
- Adjust date range; zoom levels.
- Drag ticket/epic dates (requires `projects:tickets:update` / `projects:epics:update`).

**Acceptance**
- Date edits update calendar feed when due dates change.

### 14.9 `/projects/[projectId]/cycles` — Cycles (release cycles / iterations)

**Purpose**
- Group work items into cycles (distinct from sprints; supports “draft/active/completed”).

**Core interactions**
- Create cycle, set start/end, move tickets into cycle.

### 14.10 `/projects/[projectId]/modules` — Project modules (project-level gating UI)

**Purpose**
- Enable/disable project modules captured in `ProjectSettings.modules`.

**Core interactions**
- Toggle module switches with immediate feedback.
- Disabled module routes show a friendly empty state (no 404s).

**Acceptance**
- Toggling module invalidates project detail cache and re-renders nav/links consistently.

### 14.11 `/projects/[projectId]/milestones` — Milestones

**Purpose**
- Track key dates and deliverables; optionally tie to tickets/epics.

**Core interactions**
- Create milestone with date + description.
- Link tickets; show rollups.

### 14.12 `/projects/[projectId]/pages` — Project wiki/pages

**Purpose**
- Lightweight wiki for project docs.

**Module gate**
- Requires `project.settings.modules.wiki === true`.

**Core interactions**
- Create page (hierarchical), edit content, pin page.
- Public visibility toggle (must be permission gated and safe).

### 14.13 `/projects/[projectId]/views` — Saved views

**Purpose**
- Save and share filters/grouping/layout presets.

**Core interactions**
- “Save current view” from board page:
  - captures filters + groupBy + orderBy + layoutType
  - optionally pin to top
- Apply a saved view navigates back to `/projects/[projectId]` with URL params representing that view.

### 14.14 `/projects/[projectId]/intake` — Intake

**Purpose**
- Manage inbound work requests (manual/web/email sources).

**Core interactions**
- Accept intake:
  - creates a ticket
  - links `intake.linkedWorkItemId`
  - optionally opens ticket sheet immediately
- Decline intake with reason; mark duplicate and link to an existing ticket.

### 14.15 `/projects/[projectId]/my-tickets` — My tickets

**Purpose**
- Personal work queue scoped to this project.

**Core interactions**
- Change status/priority, quick assign to self, open ticket sheet.

### 14.16 `/projects/[projectId]/analytics` — Analytics

**Purpose**
- Read-only insight: status distribution, priority breakdown, assignee completion, volume over time, velocity by cycle.

**Acceptance**
- Charts must tolerate missing data and render meaningful empty states.

### 14.17 `/projects/[projectId]/budget` — Budget

**Purpose**
- Track a project budget reference; show simple summary + history.

### 14.18 `/projects/[projectId]/whiteboard` — Whiteboard

**Purpose**
- Visual collaboration canvas (existing page).

**Acceptance**
- Large client bundle must be lazy-loaded; page has a fast skeleton.

### 14.19 `/projects/[projectId]/reports` — Agile reports

**Purpose**
- Velocity, burnup, cumulative flow, lead/cycle time (as implemented).

### 14.20 `/projects/[projectId]/automations` — Project automations

**Purpose**
- Configure project-specific triggers and actions (ties into global automation engine).

### 14.21 `/projects/[projectId]/webhooks` — Webhooks

**Purpose**
- Configure outbound webhooks for project events.

### 14.22 `/projects/templates` — Project templates

**Purpose**
- Create projects from templates (predefined modules/statuses/labels/custom fields).

### 14.23 `/projects/portfolio` — Portfolio

**Purpose**
- Multi-project overview; cross-project search and status.

### 14.24 `/projects/roadmap` — Roadmap (org-level)

**Purpose**
- Organize roadmap items with feedback/voting (existing route in `PAGES.md`).

### 14.25 `/projects/resource-allocation` — Resource allocation

**Purpose**
- High-level resource planning / allocation view across projects.

### 14.26 `/chat` — Chat (integration surface)

**Purpose**
- Team comms with persistent work references and actions.

**Must-add**
- Ticket mention picker (`#`) + metadata entities
- Ticket pill rendering + status action control (permission gated)
- Comment permalink unfurl

**Acceptance**
- Offline queue continues to work with mention metadata.

### 14.27 `/calendar` — Calendar (integration surface)

**Purpose**
- Scheduling with linked work items.

**Must-add**
- Link/unlink ticket in event create/edit/detail
- Create ticket from calendar flows

**Acceptance**
- Linked ticket is navigable from calendar event detail sheet.

---

## 15) Test plan (backend e2e + frontend smoke)

### 15.1 Backend e2e (minimum)
- Projects CRUD with tenant isolation (A cannot read B’s project).
- Ticket CRUD + status transitions; ensure ticketNumber uniqueness per project.
- Comment permalink endpoint allow/deny.
- Chat action endpoint: status update allow/deny, writes correct audit + activity.
- Calendar link/unlink ticket allow/deny.

### 15.2 Frontend smoke (minimum)
- `/projects` list: create/edit/delete flows.
- Ticket mention in chat: insert, render pill, click navigates.
- Ticket status change in chat: optimistic UI + revert on failure.
- Comment permalink: copy link, open link, highlight comment.
- Calendar: link ticket to event, open linked ticket from event detail.

---

## 16) “Top missing/broken features” checklist (implementation priorities)

This section is kept short intentionally; the detailed requirements are in the page + integration sections above.
- `/projects` lacks edit/delete/archive actions inline (see §14.1).
- `useProjects(filters)` does not include `filters` in its query key (cache drift risk; see §10.1).
- Ticket identity is inconsistent: ticket header shows `#123` while board cards show `PROJ-123` (see §14.4).
- Ticket details access restriction currently relies on brittle string matching (see §14.4 + §9.1.1).
- Chat has user mentions but no **ticket mentions** (see §13.1).
- Chat cannot execute **ticket status changes** (see §13.2).
- Projects comments have no **permalink** support, making sharing impossible (see §6.2 + §13.3).
- Chat unfurl only supports generic URLs; internal project/comment permalinks need first-class previews (see §13.3).
- Calendar UI does not expose event `entityType/entityId` linking (see §13.4 + §14.27).
- “Create ticket from calendar” flow does not exist (see §13.4 + §14.27).
- Backend does not expose an org-scoped ticket search endpoint required by chat/calendar pickers (see §9.3).
- Permission key format is inconsistent (`projects:delete` vs 3-segment keys) (see §7.3).
- **RBAC bug**: user can create a project but `GET /projects/:id` returns 403 (“not invited”) due to missing creator membership / inconsistent list-detail auth (see §7.4–§7.5).
- Notifications/reminders are underspecified in legacy docs; must be event-driven + scheduled backend jobs (see §11.4).
- Calendar feed supports `source:"task"` in types but may not actually include ticket due dates yet (see §9.6).
- No canonical mapping exists between chat messages and work entities (metadata exists but is untyped) (see §8.3 + §13).

### 16.1 End-to-end feature completeness checklist (page-by-page)

This is the **competitive “ship bar”**. Each route must be CRUD-complete for its scope and not regress under RBAC/module gating.

- **`/projects`**
  - [ ] Create project (exists)
  - [ ] Edit project inline (missing; must add Sheet)
  - [ ] Archive/restore project (missing or not first-class; must add action)
  - [ ] Delete project inline (missing; must add confirm + mutation)
  - [ ] Filters persisted in URL (required)
- **`/projects/[projectId]` + views**
  - [ ] View switcher stable with URL (exists; must keep filters stable)
  - [ ] Ticket deep-link open via `?ticket=` (exists)
  - [ ] Ticket identity consistent as `PROJ-123` everywhere (inconsistent today)
- **Ticket details Sheet**
  - [ ] Ticket update flows invalidate all relevant views (required)
  - [ ] Comment permalink deep-link via `&comment=` (missing)
  - [ ] “Restricted ticket” UX based on stable error codes (currently brittle)
- **Comments**
  - [ ] Create/edit/delete/reply (exists partially; ensure perm-gated completeness)
  - [ ] Mentions + reactions (exists; ensure server persistence and notifications)
  - [ ] Permalinks + copy link action (missing)
- **Chat (`/chat`)**
  - [ ] Ticket mention picker (`#`) writes structured metadata (missing)
  - [ ] Ticket pill renders from metadata (missing)
  - [ ] Status change action from chat with optimistic UI + revert (missing)
  - [ ] Comment permalink unfurl (missing)
  - [ ] Offline queue preserves entity refs (required)
- **Calendar (`/calendar`)**
  - [ ] Link/unlink ticket on event create/edit/detail (missing)
  - [ ] Open linked ticket from event detail (missing)
  - [ ] Create ticket from calendar flows (missing)
  - [ ] Ticket due dates appear as `source:"task"` (must verify backend behavior)
- **Project settings (`/projects/[projectId]/settings`)**
  - [ ] Workflow/status config stable and persisted (required)
  - [ ] Custom fields reflected in table/list and ticket detail (required)
  - [ ] Danger zone delete remains permission-gated (exists)
- **Saved views (`/projects/[projectId]/views`)**
  - [ ] Save/apply/share a view with URL persistence (required)
  - [ ] RBAC: shared views don’t leak data across users/roles (required)

### 16.2 Explicit acceptance criteria (non-negotiable)

These are the competitive “must work” flows that gate production readiness:

- **Edit/delete projects on `/projects`**
  - Edit is available from each project row/card via an overflow menu; updates name/description/status; success updates the list without full reload.
  - Delete is available when permitted, shows a confirm dialog, and removes the project from the list on success.
  - Archive/restore is available and visibly changes project status; archived projects cannot be mutated in ways the backend forbids.
- **Chat ticket mention + status change**
  - Typing `#` opens a ticket picker, selecting a ticket inserts a stable display token and stores `metadata.entities`.
  - Referenced tickets render as a structured pill; clicking navigates to `/projects/[projectId]?ticket=[ticketId]`.
  - Status can be changed from chat only when user has permission; optimistic UI reverts on failure and surfaces stable error codes.
- **Comment permalinks**
  - Every comment/reply has “Copy link” that copies `/projects/[projectId]?ticket=[ticketId]&comment=[commentId]`.
  - Opening the permalink opens the TicketDetails Sheet and scrolls/highlights the comment reliably.
  - Chat unfurl for the permalink shows ticket key/title + comment author/time + excerpt and navigates to the permalink.
- **Calendar linking**
  - Event create/edit allows selecting a ticket to link via `entityType/entityId`.
  - Event detail shows the linked ticket and supports unlink when permitted.
  - Linked ticket click opens the ticket in its project context.

---

## 17) Implementation map (what to change where)

> This is intentionally file- and component-specific so it can be handed to an agent without guessing repo structure.

### 17.1 Frontend — Projects

- **Project list edit/delete**
  - Update `frontend/features/projects/project-list/project-card.tsx` and `project-list-row.tsx` to include an overflow actions menu.
  - Reuse `useUpdateProject()` and `useDeleteProject()` from `frontend/hooks/api/projects/projects.ts`.
  - Add a small “Edit project” Sheet component under `frontend/features/projects/project-list/` (kebab-case filename) that uses `updateProjectSettingsInputSchema` and mirrors the `/projects/[projectId]/settings` form shape.

- **Comment permalinks**
  - Update `frontend/features/projects/ticket-details/activity-feed.tsx` to add “Copy link” actions per comment/reply.
  - Update `frontend/app/(authenticated)/projects/[projectId]/page.tsx` to read `comment` searchParam and pass it into `TicketDetailsDialog`.
  - Update `frontend/features/projects/ticket-details/ticket-details-dialog.tsx` to scroll/highlight comment when `commentId` is provided.

### 17.2 Frontend — Chat

- **Ticket mention picker**
  - Update `frontend/features/chat/message-input.tsx` and `message-panel.tsx` to support `#` trigger (parallel to existing `@` mentions).
  - Add a reusable picker component under `frontend/features/chat/` (new file) that uses an org-scoped ticket search hook.
  - Extend message metadata typing in `frontend/types/chat.ts` (or `frontend/features/chat/chat-types.ts`) so `metadata` can represent `{ entities: [...] }` safely.

- **Ticket pill + status action**
  - Update `frontend/features/chat/chat-bubble.tsx` to render referenced tickets/comments from metadata as structured UI.
  - Status dropdown must be gated by both chat permission and ticket update permission.

- **Unfurl internal permalinks**
  - Extend link preview handling so project/ticket/comment permalinks render richer cards than generic external URL previews.

### 17.3 Frontend — Calendar

- **Link/unlink ticket**
  - Update `frontend/features/calendar/event-create-dialog.tsx` to include a ticket selector and send `entityType/entityId`.
  - Update `frontend/features/calendar/event-detail-sheet.tsx` to render linked ticket card and unlink action.

- **Create ticket from calendar**
  - Add an “Add ticket” entry point in `frontend/features/calendar/calendar-view.tsx` (header dropdown or slot flow).

### 17.4 Frontend — Hooks

- Add `useTicketSearch(q)` under `frontend/hooks/api/projects/` (new file) using `apiClient.get("/projects/search/tickets", { q })`.
- Fix query keys:
  - update `queryKeys.projects.list(filters?)` shape (or add `queryKeys.projects.list(filters)` factory) and update `useProjects` accordingly.

### 17.5 Backend (`streamlineos-api`) — required work

- Add/verify endpoints listed in §9, especially:
  - ticket search for pickers
  - comment lookup for permalinks
  - chat action endpoint for ticket status transitions
  - calendar feed “task” items for due dates
- Ensure all are tenant-scoped and permission-guarded (BOLA-safe).

### 17.6 Implementation order (aligned with `tasks/pm/074` + production readiness)

`tasks/pm/074_Claude_Code_Implementation.md` is deprecated and points here + `CLAUDE.md`. Use this order to stay mergeable and production-ready:

- **Phase A — Backend foundations (parity + security)**
  - Add/verify missing endpoints in §9 (ticket search, comment lookup, chat action, calendar “task” feed).
  - Enforce tenant + object authorization on every read/write; standardize stable error codes.
  - Emit audit/activity events and wire notification side-effects (idempotent, queued where needed).
- **Phase B — Frontend data correctness**
  - Fix query keys + invalidation correctness (§10.1–§10.3).
  - Type message metadata entities safely; avoid string parsing as the source of truth.
- **Phase C — Competitive must-haves (end-to-end UX)**
  - `/projects`: edit/archive/delete inline (§14.1, §16.2).
  - Ticket Sheet: comment permalinks + deep-link highlight (§13.3, §14.4).
  - Chat: ticket mention + pill + status action + internal unfurls (§13.1–§13.3).
  - Calendar: link/unlink + create ticket from calendar (§13.4, §14.27).
- **Phase D — Hardening + ops**
  - Edge cases (§18), rate limits (§12.3), DLQ + alerts/dashboards (§11.5–§11.7).
- **Phase E — Verification gates**
  - Backend e2e + frontend smoke tests (§15), then build/lint/types, then update `PAGES.md` per `CLAUDE.md`.

---

## 18) Non-negotiable edge cases (must be handled explicitly)

These edge cases are where competitors are “boring and reliable.” StreamlineOS must match that reliability bar.

### 18.1 Concurrency conflicts + stale updates
- Ticket and project updates must reject stale writes with `409` (`PROJECTS_TICKET_CONFLICT`, etc.).
- The frontend must surface a clear “This changed elsewhere” state with:
  - **Refresh** (refetch latest),
  - optional **re-apply** flow for edits where safe.

### 18.2 Permission changes mid-session
- If permissions change server-side, the next protected request must return `403` with a stable code.
- The UI must respond by refreshing access state (via the existing access hooks) and disabling/hiding actions without requiring a hard reload.

### 18.3 Deleted / archived entities and deep links
- Deep links to deleted tickets/comments must render a non-crashing “Not found” state in the Sheet and offer navigation back to the project.
- Archived projects must:
  - remain readable (if permitted),
  - and block forbidden mutations with stable errors (no partial silent failures).

### 18.4 Offline + unreliable networks
- Chat offline queue must preserve entity references via metadata and reconcile safely on reconnect.
- Mutations across Projects/Calendar must show retry affordances; never leave the UI in a permanently “optimistic but wrong” state after failure.

### 18.5 Timezones and date semantics
- Ticket due dates and calendar event times must be unambiguous:
  - store and transfer timestamps as UTC,
  - render in user locale,
  - treat all‑day vs timed events explicitly (no implicit midnight bugs),
  - ensure “due today” correctness across timezones.

### 18.6 Large org scale
- All list endpoints paginated (hard cap 100).
- Search endpoints must be indexed and rate limited; UIs should debounce and avoid overfetch.
- Views that render large ticket sets must virtualize or progressively render to avoid UI lockups.

