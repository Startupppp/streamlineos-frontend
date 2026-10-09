# BLD-02E — Project Delivery Page Contracts PRD

> Acceptance reference only. Dispatch and status live in
> [`Build execution`](../README.md); do not assign
> or tick a checkbox in this file directly.

## Purpose

This file defines the complete UI, discovery, overlay, data, cache, and scale
contract for core project delivery and collaboration routes in the 2026-09-19
source tree. It inherits BLD-03 through BLD-08.

## Core Work Pages

| Route · disposition | Required components | Filters, views, paging | Actions, overlays, backend/data contract |
|---|---|---|---|
| `/build/{projectId}` · KEEP Overview | Project identity/health; current iteration; issue status buckets; next milestone/release; recent update; blockers/risks; client-progress preview; quick links | Time window only; no generic view switcher; bounded panels with exact source links | Post Update sheet; edit/open settings; quick create ticket; all KPIs from bounded permission-scoped summary and reconcile to source; freshness shown |
| `/build/{projectId}/issues` · KEEP canonical explorer | Ticket toolbar; filter chips; saved-view menu; board/list/table body; column/display manager; bulk bar; create trigger; loaded/total semantics | Full ticket filter set; stable sort/group; board/list/table and integrated Timeline where approved; cursor/per-column continuation; virtualization | Create/Edit Ticket sheet; save/share view sheet; display popover; card/row actions; bulk overlays; canonical ticket/list/count/export/bulk predicate and query keys |
| `/build/{projectId}/tickets/{ticketKey}` · KEEP detail | Header/key/status; property panel; description; relations/dependencies; subtasks/checklists; files/links; time; comments/activity; client preview | Subresource filters where useful; comments/activity cursor independently; no page layout switcher | Inline scalar edit; relation/member/label popovers; rich edit sheet; archive/delete confirmation; route project/key match; optimistic version; bounded subresources; cache patch detail + collections |
| `/build/{projectId}/my-tickets` · CONSOLIDATE to scoped My Work | Transitional reuse of canonical ticket toolbar/body with visible project + actor scope | Assigned/reported/created/subscribed; common ticket filters; board/list/table; cursor, never client filtering of a board cap | Same actions as Issues; token-derived actor; replacement `/build/my-work?projectId=...` must reach all rows before route deletion |
| `/build/{projectId}/backlog` · KEEP | Ranked unscheduled list; hierarchy; estimate/readiness/dependency signals; target iteration lanes; selection/bulk bar | Search; status/category, priority, type, assignee, label, estimate state, readiness, dependency, stale, module/epic; list + planning lanes; cursor | Inline rank/estimate/priority; plan-to-iteration sheet; split ticket; bulk plan; rank/assignment transactional with version/WIP checks |
| `/build/{projectId}/triage` · KEEP | Intake queue; source/provenance; missing fields; duplicate candidate; age/SLA; preview; selection | Search; source, age, missing field, duplicate, owner, type, priority, customer, submitted date; list/table; cursor | Accept/classify sheet; merge duplicate dialog; reject/close confirmation with reason; create/link ticket idempotently and retain source |
| `/build/{projectId}/epics` · KEEP projection | Epic cards/table; progress; owner; child counts; dates; dependency/health; issue drill-down | Search; owner, status, health, date, module, iteration, label; board/list/table or timeline only if useful; cursor | Create/Edit Epic sheet using canonical ticket mutation; link/unlink children; archive confirmation; no second epic data model |
| `/build/{projectId}/modules` · KEEP | Module cards/table; lead; status/health; progress; dates; issue/epic/release links | Search; lead, status, health, date, iteration, release; cards/table; server paging | Create/Edit Module sheet; link work dialog; archive confirmation; progress grouped from canonical work; option cache invalidated |
| `/build/{projectId}/cycles` · KEEP canonical iteration | Planned/active/completed sections; goal; dates; scope/progress/velocity/carry-over; list/card | Search; state, date, owner where supported; list/cards; cursor for history | Create/Edit Cycle sheet; plan/start/complete sheets; archive confirmation; one canonical iteration API/table after Sprint migration |
| `/build/{projectId}/cycles/{cycleId}` · KEEP | Goal/status header; progress/KPIs; scoped issues; events; blockers; carry-over; retrospective metrics | Common ticket filters scoped to cycle; list/board; issue cursor and event cursor | Edit/start/complete; add/remove work; completion impact sheet; project/cycle match; transactional completion + outbox; detail/list/report caches patch |
| `/build/{projectId}/sprints` · REMOVE after canonical migration | Transitional migration status and no new unique component contract | Existing Sprint filters/views must map to Cycle; no dual saved filters | Block new duplicate behavior; migrate create/edit/plan/start/complete/history; delete table/API/hooks/route/permission after reconciliation |
| `/build/{projectId}/timeline` · CONSOLIDATE into Issues Timeline | Date grid; issue rows; milestones/releases; dependencies; unscheduled lane; zoom | Ticket filters plus date window, milestone, release, dependency, unscheduled; windowed timeline; virtual rows | Drag date/dependency with keyboard alternative; edit sheet; same ticket query/mutation owner; delete route after Issues layout parity |
| `/build/{projectId}/views` · CONSOLIDATE into Issues menu/settings | Transitional saved-view table with owner/visibility/default/layout | Search; owner, private/shared/default, layout, archived; table; cursor if unbounded | Create/Edit/Duplicate/Share/Archive sheets; manage inside Issues; delete standalone route after admin parity |

## Delivery Planning and Communication

| Route · disposition | Required components | Filters, views, paging | Actions, overlays, backend/data contract |
|---|---|---|---|
| `/build/{projectId}/milestones` · KEEP | Milestone timeline/list; date/status/owner; progress; dependencies; release links | Search; owner, status, health, date, release, overdue; timeline/list/table; cursor | Create/Edit sheet; link work dialog; complete/reopen/archive confirmation; progress source-linked and indexed by project/date |
| `/build/{projectId}/releases` · KEEP | Release list/timeline; version/status/date/owner; linked milestones/issues; approvals; notes; client publication | Search; owner, status, health, date, milestone, client-visible; list/table/timeline; cursor | Create/Edit Release sheet; generate/edit notes; approval sheet; publish/unpublish confirmation; publication snapshot/cache version |
| `/build/{projectId}/goals` · ADD Goals projection | Goal tree/list; progress/health; owners; key results; linked issues/releases; check-in freshness | Search; owner, status, health, parent, timebox, due date; tree/list/table; cursor | Create/link/check-in sheets through Goals owner; close/archive confirmation; project scope authorized by Goals; no parallel Build goal storage |
| `/build/{projectId}/updates` · KEEP | Update composer; health selector; accomplishments/blockers/next steps; cadence/owner/reminders/subscriptions; freshness and stale signal; audience/client visibility; update feed | Author, health, audience, date, stale/fresh; newest sort; list; cursor | Create/Edit Update sheet with dirty guard; cadence/reminder settings; subscribe; approve/publish dialog; archive confirmation; idempotent post; feed/overview/portal cache patch |
| `/build/{projectId}/files` · KEEP contextual Files projection | Folder/breadcrumb or grouped list; upload dropzone; name/type/size/uploader/date/link/client visibility | Search; type, uploader, linked record, date, client visibility; grid/list/table as owner supports; cursor | Upload sheet/dropzone; rename/move/link/share; delete confirmation; Files/Documents owns binary, scan, retention, signed URL; Build stores relations |
| `/build/{projectId}/workload` · KEEP | Capacity timeline/table; person/team rows; allocation/availability; over-capacity; source legend | Person/team, date, project/module/iteration, capacity source, allocation status; workload timeline/table; windowed + virtual | Reassign/reschedule sheet; open source time/calendar; no local capacity overwrite unless owned; aggregated indexed query with sensitive fields gated |

## Project Collaboration

| Route · disposition | Required components | Filters, views, paging | Actions, overlays, backend/data contract |
|---|---|---|---|
| `/build/{projectId}/chat` · KEEP contextual Chat | Channel header; message list/composer; threads/reactions/files/mentions as Chat supports; member/info panel; mobile info sheet | Message search/filter only through Chat owner; reverse cursor/infinite history; no Build view switcher | Create/link channel confirmation; info sheet; leave/archive confirmations; Chat ACL/realtime owner; Build stores entity link only; nonblank loading/error states required |
| `/build/{projectId}/wiki` · KEEP contextual KB | Project page tree/grid; recent/favorites only if project scoped; page cards; search; create action | Project KB search; page tree; favorites/recent; bounded tree plus cursor search; grid/list only if KB supports | Create Page action opens canonical editor/detail; KB permissions/module gate; no org-wide recent data on project page; Build stores project relation only |
| `/build/{projectId}/wiki/{pageId}` · KEEP | Canonical document editor/viewer; breadcrumbs/tree; comments/history/share controls per KB owner | In-document search/history paging; no Build filters | Edit/autosave; share dialog; archive/restore confirmation; project/page relation and KB ACL both checked; dirty/autosave recovery proven |
| `/build/{projectId}/whiteboard` · KEEP one project board | Collaborative canvas; toolbar; linked work; participants; save/sync state; share status | Canvas search/zoom only; no list filters; board history bounded | Autosave; insert/link ticket popover; share dialog; clear/archive confirmation; realtime conflict/recovery; project access + public share projection |
| `/build/{projectId}/meetings` · KEEP contextual Meetings | Meeting table/list; date/status/organizer/attendees; action/decision counts; source calendar link | Search; organizer/attendee, date, status, has actions/decisions; list/table; cursor | Schedule/link meeting sheet; cancel confirmation; Meetings/Calendar owns event; Build relations and action conversion idempotent |
| `/build/{projectId}/meetings/{meetingId}` · KEEP | Header/time/attendees; agenda/minutes; linked issues; decisions; action items; recordings/files per grant | Action status/owner filters; activity cursor; no layout switcher | Edit notes with dirty/autosave; create/link action sheet; cancel/delete confirmation; meeting/project match and source ACL enforced |

## Completion Checks

- [ ] **BLD-02E-001** every current core delivery/collaboration route appears
  once and every proposed removal names its replacement.
- [ ] **BLD-02E-002** every page explicitly defines components, fields,
  filters, views, pagination, actions, overlay type, confirmation, API owner,
  cache behavior, and scale contract.
- [ ] **BLD-02E-003** ticket projections reuse canonical ticket queries and
  mutations; no Epic/My Tickets/Timeline page owns parallel business logic.
- [ ] **BLD-02E-004** Chat, KB, Files, Meetings, Calendar, and Whiteboard source
  ACLs are rechecked and not inferred from project visibility.
- [ ] **BLD-02E-005** populated multi-page browser journeys prove no silent
  truncation, blank loading, wrong back destination, or lost dirty work.
