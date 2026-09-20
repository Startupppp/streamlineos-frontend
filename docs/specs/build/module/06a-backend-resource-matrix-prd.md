# BLD-06A — Backend Resource, Query, Cache, and Schema Matrix PRD

> Acceptance reference only. Dispatch and status live in
> [`Build execution`](../README.md); do not assign
> or tick a checkbox in this file directly.

## Purpose

BLD-06 defines global backend rules. This matrix ensures every current Build
controller/resource has an explicit database-call, pagination, transaction,
cache, schema, scale, and verification owner.

Before implementation, each row must record:

- exact handlers and request/response schemas;
- route/module/permission/data-scope classification;
- cold/warm query count and `EXPLAIN (ANALYZE, BUFFERS)` for primary shapes;
- maximum rows/bytes and pagination strategy;
- tables, tenant-safe FKs, checks, unique constraints, and indexes;
- mutation transaction, idempotency, optimistic concurrency, audit, and outbox;
- client/server cache keys, TTL, writers, post-commit invalidation, and failure;
- unit, controller e2e, database isolation, load, and browser consumers.

No cache is required merely because a resource is listed. A measured indexed
query is preferred when invalidation or access shaping makes cache unsafe.

## Core Projects and Tickets

| Resource · controller | Read/query and pagination contract | Write, schema, cache, and scale contract |
|---|---|---|
| Projects · `core/projects.controller.ts` | Org/workspace/product/team/customer/status/health search at DB layer; projected directory; stable cursor or justified offset; no global-users projection | Project create idempotent and plan-limited; tenant FKs/default workflow provision atomic; directory/scope/overview caches patched; archive/restore and relation indexes measured |
| Project detail · `core/projects-by-id.controller.ts` | Route project identity plus data scope; detail projection excludes independently paged work; no all-tickets embed | Update uses version; move/archive transactional; exact detail/directories/scope invalidation; project composite identity/FKs |
| Project resources · `core/project-resources.controller.ts` | Statuses, labels, modules, iterations, roster options are bounded or paginated; option projection only | Add/remove/reorder validates project and dependencies; invalidate option/filter/board keys; per-project limits and stable IDs |
| Tickets · `core/projects-tickets.controller.ts` | Project/list/all-work/search/detail/count/export share predicate; cursor fingerprint; parent project match; comments/activity not unbounded in detail | Create/update/rank/delete/bulk idempotent/versioned; status/WIP/rank/activity/outbox atomic; ticket checks/FKs/indexes; patch filtered lists/counts/analytics |
| Ticket comments · `core/projects-ticket-comments.controller.ts` | Reverse cursor; projected actor/body/reactions; target ticket/project/scope match | Create/edit/delete/reaction idempotent where applicable; sanitized/versioned; comment count/detail/activity caches patch; mention outbox after commit |
| Ticket associations · `core/projects-ticket-associations.controller.ts` | Assignees/watchers/labels/relations/attachments independently bounded; no per-ticket N+1 | Relation cycle, membership, project compatibility and self-subscribe identity validated; transaction + exact invalidation |
| Ticket checklists · `core/projects-ticket-checklists.controller.ts` | Ordered bounded items with explicit per-ticket limit | Create/update/reorder/delete versioned; completion activity atomic; unique order/tenant FK; detail cache patch |
| Workspace members · `core/projects-workspace-members.controller.ts` | Paginated member search and effective access; no unprojected users | Add/remove/role change protects last owner and self-escalation; access version invalidates nav/query caches |
| Custom fields · `core/projects-custom-fields.controller.ts` | Bounded definitions/options; typed value filters use indexed storage; archived options readable | Type/option/default/required migrations previewed and transactional; invalidate forms/views/filters; value FKs/checks |
| Templates · `core/projects-templates.controller.ts` | Search/type/category/visibility/status with cursor; version/usage projected | Create/version/apply/archive idempotent; apply compatibility mapping transaction; invalidate template directory only |
| Customers · `core/projects-customers.controller.ts` | CRM-backed server search and paged project relations; no copied customer directory | Link/unlink validates CRM + project scope; relation unique tenant FK; project/customer/portal cache patch |
| Budget · `core/projects-budget.controller.ts` | Period/category summary plus paged source lines; accounting/timesheet data permission projected | Budget/forecast versioned; decimal/range checks; ledger remains Accounting-owned; sensitive cache scoped and never authoritative |
| Releases · `core/projects-releases.controller.ts` | Search/status/date/client visibility with cursor; linked work separately paged | Create/update/status/publish/archive transactional; publication snapshot/outbox; release/milestone/project indexes and portal cache version |
| Roadmap · `core/projects-roadmap.controller.ts` | Product/project/date/status/dependency filters; windowed timeline; source links | Reorder/link/update versioned; product roadmap canonical; public/client publication cache invalidation |
| Reports · `core/projects-reports.controller.ts` | Date/filter-aware grouped aggregates; bounded time buckets; accessible evidence endpoint | Cache key includes org/project/access/filter/report revision; every ticket/time/iteration writer bumps revision after commit; no stale permission cache |
| Webhooks · `core/projects-webhooks.controller.ts` | Paged endpoints and delivery history; secret never returned | SSRF-safe URL validation, encrypted secret, signing, idempotent delivery, retry/backoff/dead-letter; rotate/disable audit; no provider call in transaction |
| Automations · `core/projects-automations.controller.ts` | Paged rules and run history; typed trigger/condition/action graph | Dry run; loop/rate/budget guard; idempotent execution/outbox; enable/archive versioned; exact rule/run invalidation |

## Organization, Scope, and Planning

| Resource · controller | Read/query and pagination contract | Write, schema, cache, and scale contract |
|---|---|---|
| Scope directory · `scope-directory/scope-directory.controller.ts` | Backend paged search across authorized workspaces/products/projects; rank exact/prefix/fuzzy; cancellable; no fixed first-50 local filter | Read-only cache includes org/actor/access version/query/cursor; rename/move/archive/revoke invalidates; late tenant response discarded |
| PM workspaces · `pm-workspaces/pm-workspaces.controller.ts` | Search/owner/status/member/has-record filters; projected counts; cursor | Create/update/move/archive/versioned; memberships and links tenant FKs; scope catalog/list invalidation |
| Managed products · `managed-products/managed-products.controller.ts` | Workspace/owner/lifecycle/health filters; paged directory/detail relations and bounded roll-ups | Create/update/link/move/archive transactional; memberships and project links authorized both sides; roadmap/goal/feedback/cache invalidation |
| Teams · `teams/teams.controller.ts` | Search/lead/member/workspace/status filters; paged roster/project relations | Create/update/member/link/archive protects access; Directory IDs tenant safe; team/filter/scope invalidation |
| Programs · `portfolios/programs.controller.ts` | Search/owner/status/health/portfolio/date; paged links and bounded roll-up | Create/update/link/archive versioned; relation unique/FKs; program/portfolio/overview invalidation |
| Portfolios · `portfolios/portfolios.controller.ts` | Directory/detail with paged children and permission-filtered aggregates | Create/update/link/archive versioned; financial/goal sources linked; exact directory/detail invalidation |
| Iterations · `execution/iterations.controller.ts` | Canonical cycle search/state/date with cursor; detail issues/events independently paged | Create/start/complete/carry-over idempotent transaction + outbox; active/date rules; migrate duplicate Sprint model and invalidate boards/reports |
| Execution workspace · `execution/workspace.controller.ts` | Explicitly document owned execution summary/query; all child lists bounded | No parallel project/workspace entity owner; writes route to canonical services; cache/invalidation owner named |
| Timesheets · `execution/timesheets.controller.ts` | Actor/project/ticket/date/status cursor; data scope for rates/approvals; no unbounded export | Token-derived actor for self log; approval separation/idempotency; Timesheets canonical; cache key writer matrix and period invalidation |
| Whiteboard sharing · `execution/whiteboard-sharing.controller.ts` | Share metadata excludes private canvas until valid token/grant; history bounded | Opaque hashed token, expiry/revoke, field projection, audit; public cache share-versioned and purged immediately |

## Collaboration, Intake, and Delivery Evidence

| Resource · controller | Read/query and pagination contract | Write, schema, cache, and scale contract |
|---|---|---|
| Updates · `updates/updates.controller.ts` | Project/audience/health/author/date/stale cursor; portal projection separate | Create/edit/publish/archive versioned/idempotent; cadence/owner/reminders/subscriptions; client approval/outbox; patch overview/feed/portal |
| Files · `files/files.controller.ts` | Project relation list cursor; metadata projected; signed URL only after source ACL | Files owner handles upload/scan/retention; link/rename/delete idempotent; exact file/detail/portal invalidation |
| Comment drafts · `comment-drafts/comment-drafts.controller.ts` | Actor/org/scope/record lookup only; bounded recent list | Upsert/delete versioned; expiry/orphan cleanup; no shared cache or cross-actor read |
| Forms · `forms/forms.controller.ts` | Project forms cursor; detail version; fields/options bounded | Builder version/dirty conflict; publish immutable schema; logic validation; list/detail/public-form cache version |
| Form submissions · `forms/submissions.controller.ts` | Form/project/status/assignee/source/date cursor; PII projection | Public submit rate-limited/idempotent; triage/map/accept transaction; retention/export audit; no raw project identity authority |
| Meetings · `meetings/meetings.controller.ts` | Project/date/status/organizer/attendee cursor; detail agenda/minutes bounded | Meetings/Calendar canonical; create/link/update/cancel idempotent; attendee/project ACL; meeting/list/calendar invalidation |
| Meeting actions · `meetings/action-items.controller.ts` | Meeting/project/owner/status/due cursor | Convert/link ticket idempotently; completion versioned; meeting/ticket/activity cache patch |
| Approvals · `approvals/approvals.controller.ts` | Org/project/mine/requester/approver/status/expiry cursor; target ACL | Request/decide/delegate/cancel idempotent transaction + audit/outbox; badge/list/source invalidation |
| Change requests · `client-portal/change-requests.controller.ts` | Internal and portal projections separate; status/impact/date cursor | Create/decide/withdraw state machine with grant/permission; project relation; portal/list cache patch |
| Client visibility · `client-portal/client-visibility.controller.ts` | Exact internal preview of external projection; fields/resources deny-by-default | Publish/unpublish/select content versioned and audited; grant/publication version invalidates portal immediately |
| Client portal · `client-portal/client-portal.controller.ts` | Portal identity + explicit grant on every list/detail/file/request; cursor | Portal action identity derived from portal token; idempotent requests; never employee cache/permission substitute |

## Quality and Governance

| Resource · controller | Read/query and pagination contract | Write, schema, cache, and scale contract |
|---|---|---|
| Test suites · `qa/test-suites.controller.ts` | Project search/status cursor; case counts grouped | Create/update/archive versioned; project FK; QA directory invalidation |
| Test cases · `qa/test-cases.controller.ts` | Suite/status/priority/assignee/release cursor; steps bounded | Create/update/reorder/import/archive validates ordered steps; exact QA/cache patch |
| Test runs · `qa/test-runs.controller.ts` | Run list cursor; run cases/results independently cursor/virtualized | Create/result/complete idempotent/versioned; evidence relation; progress atomic; QA/report invalidation |
| Bugs · `qa/bugs.controller.ts` | Transitional BUG projection must join canonical ticket without duplicate lifecycle queries | Migrate to ticket mutation; preserve QA evidence; delete parallel status/assignee/priority writes and schema after reconciliation |
| Risks · `governance/risks.controller.ts` | Owner/category/probability/impact/status/review-date cursor | Create/update/review/close versioned; range/check constraints; governance/overview invalidation |
| Decisions · `governance/decisions.controller.ts` | Owner/status/category/date/superseded cursor; evidence links bounded | Versioned or immutable history; supersession cycle check; activity/audit atomic |
| Incidents · `incidents/incidents.controller.ts` | Severity/status/commander/service/date cursor; timeline/actions independently paged | Declare/update/event/resolve idempotent state machine; outbox after commit; incident/overview cache patch |
| Workflow · `workflow/workflow.controller.ts` | Bounded states/transitions with stable IDs and effective role requirements | Status/transition/default/WIP migration transactional; referenced-state dependency report; invalidate tickets/views/automation/reports |

## Agent Signals

| Resource · controller | Read/query and pagination contract | Write, schema, cache, and scale contract |
|---|---|---|
| Agent Pulse · `agent-pulse/agent-pulse.controller.ts` | Scope-aware proposals/failures/completions; actor/project/product/workspace binding; cursor and accurate badge | AI gateway owns runs/usage; approve reauthorizes/version checks; badge/list scoped cache; revocation expires proposals |
| Approvals inbox · `approvals/approvals-inbox.controller.ts` | Org/mine/requested/delegated count and list share one predicate; cursor | No write owner here; mutations stay on approvals; badge cache patches with decisions |
| Cycles · `execution/cycles.controller.ts` | Canonical Cycle list/detail after Sprint cutover; cursor | Create/start/complete/carry-over idempotent; migrate Sprint callers |
| Sprints · `execution/sprints.controller.ts` | Transitional Sprint list only until Cycle cutover | Block new unique behavior; delete after reference map |
| Epics · `execution/epics.controller.ts` | Ticket-type EPIC projection; cursor | Canonical ticket mutations only; no second epic table |
| Modules · `execution/modules.controller.ts` | Project modules bounded/paginated | Create/update/archive versioned; option cache invalidation |
| Milestones · `execution/milestones.controller.ts` | Project date/status cursor | Create/update/complete versioned; progress source-linked |
| Intake · `execution/intake.controller.ts` | Transitional authenticated intake | Migrate to Forms + Triage; retain provenance |
| Views · `execution/views.controller.ts` | Saved-view list/cursor | Create/share/archive permissioned; Issues remains daily owner |
| Workspace views · `execution/workspace-views.controller.ts` | Workspace-scoped saved views | Same saved-view owner; no duplicate schema |
| Whiteboards · `execution/whiteboards.controller.ts` | Project board metadata; history bounded | Autosave/conflict/share versioned; public share separate |
| Whiteboards hub · `execution/whiteboards-hub.controller.ts` | Transitional hub only if more than one board exists | Do not invent an org whiteboard directory while one board per project |
| Public whiteboard links · `execution/public-whiteboard-links.controller.ts` | Token-based read/update only | Rate limit; hashed token; no employee cache |
| Billing summary · `execution/billing-summary.controller.ts` | Permission-projected period summary | Timesheets owner; deny when membership absent; exact cache writer |
| Time entries · `execution/time-entries.controller.ts` | Actor/project/ticket/date cursor | Route through Timesheets commands; no parallel business rules |
| Ticket time entries · `execution/ticket-time-entries.controller.ts` | Ticket-scoped time cursor | Same Timesheets owner; project/ticket match |

Git webhook ingress is owned by Integrations
(`modules/integrations/git/integrations-git.controller.ts`), not one of the
59 Build controllers. BLD-00 D12 and BLD-07-033 close advertised-provider,
durable-receipt, and secret-storage defects against that owner.

## Schema File Accountability

The implementation audit must cover every file under
`backend/src/db/schema/build/`, including:

- namespace/index/barrel and relations;
- core, members, teams, workspaces, workspace/product memberships;
- ticket core/collaboration/releases/integrations/counters;
- activity, reporting, sprint events, updates, attachments, drafts;
- roadmap, goals, feedback, releases, approvals, workflow, automations/webhooks;
- portfolios, meetings, forms, QA, governance, incidents, changes, whiteboards,
  Git, and client portal relations.

- [ ] **BLD-06A-001** the generated controller census and this matrix contain
  the same 59 current controllers and 313 operations, with zero blank
  auth/parent/schema/bound/idempotency fields.
- [ ] **BLD-06A-002** every Build schema table maps to a live service owner or
  a proven migration/removal plan.
- [ ] **BLD-06A-003** query-count and plan evidence is recorded per endpoint
  against production-shaped data, not an empty database.
- [ ] **BLD-06A-004** every cache has a complete writer matrix; uncached
  resources record the measured reason.
- [ ] **BLD-06A-005** every mutation records transaction, idempotency,
  concurrency, audit, outbox, invalidation, and retry behavior.
- [ ] **BLD-06A-006** controller e2e covers auth, module, permission, data scope,
  wrong parent, cross tenant, validation, pagination, conflict, and retry.
- [ ] **BLD-06A-007** architecture, type, build, migration-integrity,
  route-classification, permission, cycle, and focused load gates pass.
