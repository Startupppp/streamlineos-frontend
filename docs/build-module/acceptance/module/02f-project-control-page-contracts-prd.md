# BLD-02F — Project Quality, Governance, Analytics, and Settings Page Contracts

> Acceptance reference only. Dispatch and status live in
> [`Build execution`](../README.md); do not assign
> or tick a checkbox in this file directly.

## Purpose

This file defines the complete contract for the remaining current project
routes: intake, quality, governance, approvals, analytics, client publication,
automation, and settings. It also identifies which current pages must merge so
the product does not preserve duplicate work models.

## Intake, Feedback, and Forms

| Route · disposition | Components, filters, views, paging | Actions and overlays | Backend, cache, schema, and safety |
|---|---|---|---|
| `/build/{projectId}/intake` · CONSOLIDATE into Forms + Triage | Submission queue with source/provenance, status, age, owner, missing fields, duplicate state; search; pending/accepted/declined/duplicate; source/date/owner; list/table; cursor | Publish/configure default form in Form builder; accept/classify sheet carrying all mapped fields; merge dialog; decline confirmation with reason | One submission model and triage mutation; current accept form values must reach API; opaque public token replaces raw project ID; migrate history then delete route |
| `/build/{projectId}/forms` · KEEP | Form table/cards; published/draft/closed; response counts; owner; updated time; search/type/status/owner/date; table/cards; cursor | Create Form sheet then full builder; duplicate; publish/unpublish confirmation; archive/restore confirmation | Versioned form schema and publication; list projected/bounded; response count grouped; exact list/detail invalidation |
| `/build/{projectId}/forms/{formId}` · KEEP | Builder, preview, publish state, conditional logic, submissions tab, automation/mapping, version/history | Add/reorder/configure field panels; preview dialog; publish confirmation; submission status/assignee/date filters with cursor; export async | Project/form match; logic cycle/type validation; immutable submission snapshot; respondent ACL/PII retention; builder dirty-state and concurrency |
| `/build/{projectId}/feedbucket` · KEEP specialized evidence intake | Widget/config card; submission queue; screenshot/recording/source/customer/browser metadata; search/status/date/assignee/linked/duplicate; list/table; cursor | Widget setup sheet; copy embed; triage/merge/link/create-ticket sheet; disable/delete confirmation | Feedbucket module gate and project filter; signed media; retention and storage deletion distinction; badge/list cache patch |
| `/build/{projectId}/feedbucket/{submissionId}` · KEEP | Evidence viewer; metadata; customer/source; comments/history; linked roadmap/ticket; media gallery | Assign/classify; link/create ticket; merge dialog; per-media delete confirmation; submission delete/archive confirmation | Project/submission match; media ACL/signed URL; soft submission deletion versus storage deletion explicit and audited |

## QA and Defects

| Route · disposition | Components, filters, views, paging | Actions and overlays | Backend, cache, schema, and safety |
|---|---|---|---|
| `/build/{projectId}/qa` · KEEP | Tabs for suites/cases/runs/coverage/defect projection; search; suite/status/priority/assignee/release/environment/automation/link state; table/list; cursor | Create/Edit Case sheet; create Run sheet; bulk assign/tag/archive; import preview; destructive confirmation | QA records tenant/project scoped; cases/runs/results independently bounded; coverage grouped; no per-row queries; canonical BUG link |
| `/build/{projectId}/qa/runs/{runId}` · KEEP execution | Run header/progress; case navigator; current step/expected result; pass/fail/block; evidence/attachments; linked bug | Status/assignee/result filters; virtual/cursor case list; resume state; add evidence; create/link BUG sheet; abort/complete confirmation | Project/run match; result write idempotent/versioned; offline/retry semantics; completion atomic; evidence Files-owned |
| `/build/{projectId}/bugs` · CONSOLIDATE to ticket type `BUG` | Transitional table maps QA evidence and canonical ticket fields; search/status/severity/priority/assignee/run/release/date; table; cursor | Create opens Ticket sheet with BUG type and QA relation; link existing; no independent status/assignee edit; migrate/archive confirmation | One work-item lifecycle; QA extension stores only evidence; migrate references/activity/client links then delete duplicate mutations/route/table |

## Approvals and Governance

| Route · disposition | Components, filters, views, paging | Actions and overlays | Backend, cache, schema, and safety |
|---|---|---|---|
| `/build/{projectId}/approvals` · KEEP | Project request queue; requester/approver/type/source/status/SLA/expiry/history; search/mine/status/type/actor/date; list/table; cursor | Request sheet; decide dialog with comment; delegate dialog; cancel/revoke confirmation; compatible bulk decision | Target access rechecked; decision transactional/idempotent/audited; project/org inbox/detail caches patch |
| `/build/{projectId}/change-requests` · KEEP | Change table/board only if real state flow; impact/scope/requester/approvers/decision/linked work | Search; status, impact, requester, approver, date, release/client visibility; cursor | Create/Edit sheet; impact preview; approve/reject dialog; withdraw confirmation | State machine, approval, project relation, and affected-record snapshot transactional; client projection explicit |
| `/build/{projectId}/risks` · KEEP | Risk register/table; probability/impact/exposure; owner; mitigation; review date; status; heat map with text equivalent | Search; owner, category, probability, impact, exposure, status, overdue review; table + heat map; cursor | Create/Edit Risk sheet; review/update; accept/close/archive confirmation | Range/check constraints; exposure formula canonical; review/activity bounded; no color-only state |
| `/build/{projectId}/decisions` · KEEP | Decision log; context/options/outcome/owner/status/effective date; linked records; supersession | Search; owner, status, category, date, superseded, linked type; list/table; cursor | Create/Edit Decision sheet; link evidence; supersede/void confirmation | Immutable decision history or versioning; relation cycle/supersession check; project ACL and audit |
| `/build/{projectId}/incidents` · KEEP | Incident table; severity/status/commander/start/duration/service/release; active banner | Search; severity, status, commander, service, release, date; list/table; cursor | Declare Incident sheet; assign/escalate; resolve confirmation; archive | Atomic state/timeline/outbox; no hidden severity widening; incident counts/overview cache patch |
| `/build/{projectId}/incidents/{incidentId}` · KEEP execution | Command header; timeline; responders; communications; affected releases/issues; actions; files; postmortem | Timeline/event type/actor; action status/owner; independent cursors | Edit status/severity; add event/update; action sheet; resolve/reopen; publish postmortem confirmation | Project/incident match; append-only event semantics; integration/provider effects after commit; sensitive communications projected |

## Analytics, Budget, and Reporting

| Route · disposition | Components, filters, views, paging | Actions and overlays | Backend, cache, schema, and safety |
|---|---|---|---|
| `/build/{projectId}/analytics` · CONSOLIDATE as Reports Overview | KPI strip; state/priority/volume/assignee/cycle/estimate charts; each chart has text summary and source drill-down | Date window, team/assignee, type/priority/status, canonical iteration; dashboard only; evidence table cursors | Export/share only when authorized; no CRUD overlays | Aggregate endpoint accepts date/filter contract; permission-scoped grouped queries; cache key includes access/filter/revision; replace Sprint labels |
| `/build/{projectId}/reports` · KEEP with Overview tab | Report navigation: overview, velocity, burnup, cumulative flow, cycle/lead time, critical path; definitions/freshness/source drill-down | Date range, canonical iteration, team/assignee, type/priority/status; chart + accessible table; bounded series and cursor evidence | Export async; save report view; no mutation | Separate bounded aggregate contracts or measured combined request; report cache revision invalidated after committed writers; no latest-100 hard-coded Sprint semantics |
| `/build/{projectId}/budget` · KEEP | Budget/forecast/actual/variance KPIs; category/period table; approved time/cost source; trend | Period, category, owner, cost type, currency where supported; table/chart; server paging for transactions | Edit budget sheet; forecast adjustment; export; lock/reopen confirmation | Accounting/Timesheets authoritative for actuals/rates; sensitive permission; decimal precision/checks; financial cache never authorizes writes |

## Client Publication and AI

| Route · disposition | Components, filters, views, paging | Actions and overlays | Backend, cache, schema, and safety |
|---|---|---|---|
| `/build/{projectId}/client-portal` · KEEP operational preview, move config | Preview-as-client; publish status; approved sections; updates/releases/milestones/roadmap/files/change requests; grant selector | Client grant, section, date/status where collections; preview layout mirrors portal; child cursor | Publish/unpublish confirmation; select content sheet; grant management links to Settings; copy client link | Exact portal projection endpoint; project feature flag enforced backend; grant/version cache; internal fields impossible to select |
| `/build/{projectId}/ai` · CONSOLIDATE into contextual agent + durable run owner | Transitional conversation/proposal/history; citations; scope/freshness; cost; run status | Run/status/date/agent filter if durable history; cursor; no decorative views | Prompt composer; proposal diff sheet; approve/edit/reject; cancel run confirmation | AI gateway usage contract; project ACL for context and action; proposal version/expiry/idempotency; deterministic Build remains without AI |

## Automation and Settings

| Route · disposition | Components, filters, views, paging | Actions and overlays | Backend, cache, schema, and safety |
|---|---|---|---|
| `/build/{projectId}/automations` · MOVE to Settings | Rule table/cards; enabled/error; trigger/conditions/actions; owner; last run/failure; search/status/trigger/action/owner; table; cursor | Create/Edit Automation sheet or full builder; dry run; duplicate; enable/disable/archive confirmation; run-history sheet | Strict typed rule graph; loop/rate/budget guard; execution idempotent/outbox; provider after commit; rule/run caches separated |
| `/build/{projectId}/webhooks` · MOVE to Settings Integrations | Endpoint table; events; status; signing-secret age; last delivery; failure rate | Search; enabled/error, event, date; table; cursor; delivery history cursor | Create/Edit sheet; test action; rotate secret one-time dialog; disable/delete confirmation; replay delivery | HTTPS/SSRF validation; encrypted secret; signed/versioned payload; retry/backoff/dedup/dead-letter; no token returned after create |
| `/build/{projectId}/workflow` · MOVE to Settings Workflow | Status columns/list; stable category/identity; transitions matrix; WIP/required fields; preview | Status category/active/archived; transition role; table/graph only when accessible; bounded config | Add/Edit/Order Status sheet; transition sheet; simulation; archive/migrate status confirmation | Stable IDs, tenant/project FKs, acyclic/default/completed rules; transactional migration; invalidate filters/views/boards/automation |
| `/build/{projectId}/settings` · KEEP landing/sections | General, access, workflow, views, fields/labels, iterations, automations, integrations, portal, agents, archive/retention; inheritance/version | No generic views; member/relation selectors paginated; section search optional | Explicit Save + dirty guard; section-specific sheets; transfer/archive/restore/destructive dependency confirmations | One schema/API owner per section; optimistic version; exact invalidation; settings route permissions match backend; no operational queue embedded |

## Final Project Settings Routes

| Route · disposition | Components, filters, views, paging | Actions and overlays | Backend, cache, schema, and safety |
|---|---|---|---|
| `/build/{projectId}/settings/access` · ADD | Members/guests, role/scope/access source, invitation/expiry/review; search/role/state/source; table; server paging | Add/Edit Access sheet; resend; transfer ownership dialog; revoke confirmation; bulk review outcomes | Directory + Build access owner; last-owner/self-escalation and project relation checks transactional; access-version invalidates all affected data |
| `/build/{projectId}/settings/workflow` · ADD target | Status/category/order/default/completed state, transition matrix, WIP and required fields; bounded config | Add/Edit/Reorder Status sheet; transition sheet; role simulation; archive/migrate confirmation | Stable IDs; versioned workflow; migration atomic; invalidate issue filters, boards, views, automations, imports, and reports |
| `/build/{projectId}/settings/views` · ADD administration only | Shared/default saved views, owner, visibility, layout, archived; search/owner/layout/state; table; cursor | Rename, share, set default, transfer, archive/restore; delete confirmation only under retention | Saved-view owner; private views excluded; field/layout migration version; daily create/edit remains in Issues |
| `/build/{projectId}/settings/fields` · ADD | Custom fields, options, labels, usage/dependency counts; search/type/active/archived; table; server paging where unbounded | Add/Edit Field sheet; option manager; reorder; archive/migrate confirmation | Typed value storage and indexes; immutable incompatible type; transactional default/required migration; invalidate filters/forms/views |
| `/build/{projectId}/settings/iterations` · ADD | Cycle cadence, active-overlap rule, completion/carry-over, display label, defaults | Explicit Save; preview next boundaries; terminology change confirmation when customer-facing text changes | Canonical Cycle schema only; versioned project policy; exact nav/filter/report invalidation; no Sprint identity |
| `/build/{projectId}/settings/automations` · ADD target | Rule table/cards, enabled/error, trigger/conditions/actions, owner, last run/failure; search/status/trigger/action/owner; cursor | Create/Edit builder; dry run; duplicate; enable/disable/archive confirmation; run-history sheet | Typed rule graph; loop/rate/budget guard; idempotent outbox execution; configuration and run caches separated |
| `/build/{projectId}/settings/integrations` · ADD | Connection/repository/account mappings, health, scopes, sync freshness; provider/status/repository; list; server paging | Connect/configure sheet through backend integration flow; test/resync; disconnect confirmation | Integrations/Composio owns credentials; Build stores IDs/mappings; provider effects after commit; grant/revoke invalidation immediate |
| `/build/{projectId}/settings/integrations/webhooks` · ADD target | Endpoints/events/status/signing-secret age; delivery health and history; search/state/event/date; cursored table/history | Create/Edit sheet; test; rotate-secret one-time dialog; disable/delete confirmation; replay delivery | HTTPS/SSRF validation; encrypted secret; signed payload; retry/dedup/dead-letter; secret never returned again |
| `/build/{projectId}/settings/portal` · ADD | Publication state, sections/field allowlist, client grants, defaults, expiry/review; search client/status/expiry; paged grants | Preview as selected client; edit grant sheet; publish/unpublish; resend invitation; revoke confirmation | Deny-by-default projection and explicit grants; versioned publication; immediate revoke/unpublish purge; no internal field selectable |
| `/build/{projectId}/settings/agents` · ADD | Allowed agents/tools/actions, approval thresholds, budgets, data sources, retention; no run queue | Explicit Save; proposal simulation; policy reset confirmation | Server policy owner; permission/cost checks at execution; versioned policy and audit; Command Center owns runs |
| `/build/{projectId}/settings/agents/credentials` · ADD | Credential list with prefix, creator, scope, created/last-used/expiry/revoked; search/state/creator; cursor | Create sheet; secret shown once; copy acknowledgement; rotate/revoke confirmation | Hashed/encrypted secret policy; least scope; expiry/rate/audit; no token in caches/logs/client after creation |
| `/build/{projectId}/settings/retention` · ADD | Archive state, retention windows, export/recovery, transfer and dependency summary | Archive/restore, transfer ownership, retention change and eligible purge confirmations with exact impact | Project lifecycle transaction; dependencies enumerated; provider/file effects durable; permanent purge only through approved retention job |

## Completion Checks

- [ ] **BLD-02F-001** every current quality/governance/analytics/configuration
  route appears exactly once with current and target ownership.
- [ ] **BLD-02F-002** Intake/Forms/Triage, BUG/QA/Ticket,
  Analytics/Reports, AI/Agent, and operational/Settings duplication has a
  migration decision, not permanent parallel logic.
- [ ] **BLD-02F-003** every collection names filters, views, pagination,
  actions, overlay type, confirmation, endpoint/schema, cache, and scale rule.
- [ ] **BLD-02F-004** every detail/execution page validates its project-parent
  identity and independently bounds child collections.
- [ ] **BLD-02F-005** source, database, contract, browser, accessibility,
  performance, and cross-tenant evidence closes each row.
- [ ] **BLD-02F-006** all final Settings paths in BLD-01A have a physical page,
  exact route-access rule, section permission, dirty-state owner, schema/API
  owner, inheritance/version contract, and no embedded operational queue.
