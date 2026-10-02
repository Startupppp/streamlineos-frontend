# 06 — Domain model and database schema

Status: Current unverified schema inventory plus Planned normalization

## Canonical schema

Build uses PostgreSQL schema `build`, declared in `backend/src/db/schema/build/namespaces.ts` and exported through `backend/src/db/schema/build/index.ts`. The current snapshot contains 86 `build.table` declarations across 38 schema files. Migrations, not runtime synchronization, are the only production schema change mechanism.

## Core current entities

| Entity | Current table/source | Purpose and owner | Scope/lifecycle/index requirements |
|---|---|---|---|
| Project | `build.projects`, `schema/build/core.ts` | Build delivery boundary | `org_id` tenant scope; active/archive via status and `deleted_at`; unique active `(org_id,key)`; indexes lead with org. |
| Project status | `build.project_statuses`, `core.ts` | Project workflow state referenced by Tickets | Project scoped; stable identity; deletion blocked or migrated while referenced. |
| Cycle | `build.cycles`, `core.ts` | Iteration identity regardless of display label | Project/org scope; date/status constraints; overlapping policy owned by Cycle command. |
| Workstream | `build.modules`, `core.ts` | Project work grouping; UI label Workstream | Keep compatible table/API identity until migration decision. |
| Ticket | `build.tickets`, `ticket-core.ts` | Canonical work item | Org/project/status FKs, type/priority/rank, revision/CAS, archive, hierarchy, tenant-leading list indexes. |
| Ticket relation | `build.work_item_relations`, `ticket-core.ts` | Typed dependency/relationship | Both ends in same tenant; no self-edge; unique typed edge; cycle prevention where relation requires DAG. |
| Assignee/label/watcher/checklist/custom value | `ticket-collaboration.ts` | Ticket collaboration data | Composite tenant/project ownership; soft delete/history where user-visible. |
| Project member/view/intake/milestone/page | `members.ts` | Project access/configured views/intake/planning/legacy page | Access and lifecycle vary; do not treat all as Tickets. |
| Build member/team | `teams.ts` | Module role plus team grouping/assignment | Build member is distinct from project membership; unique active org/member binding. |
| Release | `ticket-releases.ts` | Project release and Ticket membership | Release lifecycle plus unique membership; publish emits durable event. |
| Approval | `approvals.ts` | Build approval request/decision | Versioned state transition; requester and decider audit. |
| Change request | `change-requests.ts` | Controlled scope/change decision | `DRAFT → SUBMITTED → APPROVED|REJECTED`; affected Tickets in child table. |
| Risk/decision | `governance.ts` | Project governance registers | Project/org scope, owner/status, archive/audit. |
| QA | `qa.ts` | Suites, cases, runs/results, Ticket QA/bug mapping | Immutable run evidence after completion; cross-project links denied. |
| Incident | `incidents.ts` | Incident, updates, decisions, follow-ups | Severity/state timestamps, append-oriented timeline, retention policy. |
| Form/submission | `forms.ts` | Intake definition and captured response | Form version frozen into submission; sensitive field classification. |
| Product/roadmap/feedback/changelog | `managed-products.ts`, `roadmap.ts`, `goals.ts` | Discovery, planning, and outcome trace | Product/org scope; prioritization inputs versioned and attributable. |
| Portfolio/program links | `portfolios.ts` | Cross-project planning containers | Tenant-consistent join tables; unique active membership. |
| Meeting/action item/standup | `meetings.ts` | Delivery meeting records | Project scope; attendee access; action items link to canonical Ticket where promoted. |
| Automation/run/action | `ticket-integrations.ts`, `automation-runs.ts` | Rule definition and observable execution | Versioned rule; immutable run/action attempt log; loop/depth guards. |
| Webhook | `ticket-integrations.ts` plus common outbox | Customer delivery configuration | Secret reference, never plaintext response; attempts in durable delivery infrastructure. |
| Portal grant | current client-portal schema/service anchors | External Project access | Explicit capabilities, `ACTIVE`, `expires_at`, revocation; no org membership side effect. |
| Comment draft | `comment-drafts.ts` | Actor-private unsent draft | Unique actor/ticket, encrypted/sensitive treatment, delete after submit/retention. |

## Required invariant for new or changed tables

```text
tenant-owned mutable record
- id: existing approved identity type; do not change type casually
- org_id: required tenant scope
- project_id/product_id: required where the domain is scoped there
- version: bigint, required, default 1 for collaborative CAS
- created_at/updated_at: timestamptz, required
- created_by/updated_by: actor identity where meaningful
- deleted_at/archived_at: lifecycle timestamp when history/restoration matters
- unique constraints start with org_id
- high-use indexes start with org_id, then scope/status/sort columns
- child-to-parent references include tenant consistency, preferably composite FK
```

Use UTC timestamps; display timezone comes from the actor. Money is integer minor units plus ISO currency; existing decimal money fields are compatibility inputs, not a pattern for new ledger data. JSONB is limited to versioned configuration/snapshots whose fields do not need relational filtering or constraints.

## Planned normalized additions

Before adding a table, search current schema and migrations. Accepted target concepts that may need additions or adapters include durable onboarding sessions/children, dashboard layouts/versions/widgets, saved filter expressions, idempotency records, import jobs/row outcomes, cross-module record references, client-grant capability sets, and product evidence/opportunity/outcome links. Exact target shapes are in the architecture and onboarding documents. Each migration must identify why an existing table cannot represent the concept.

## Derived data that must not be authoritative

Board column counts, burndown/burnup, velocity, workload totals, overdue flags, client-facing progress, time totals, invoice/payment status, unread counts, dashboard widget values, and AI summaries are projections. Persist only a rebuildable projection with `source_revision` and `computed_at` when performance needs it. Source modules remain authoritative.

## Retention/privacy

Free-text descriptions, comments, form answers, client messages, AI context, and file metadata may contain confidential data. Audit logs store identifiers and changed field names, not unrestricted before/after bodies. Grant tokens, webhook secrets, provider tokens, and signed URLs are credentials; store hashes or secret references and never log them.

## Delivery checklist

Track completion in the [requirement ledger](REQUIREMENT-LEDGER.md) and [work claims](WORK-CLAIMS.md). An unchecked item stays open until evidence is recorded on the current branch.

- [ ] Reconcile every accepted entity and field with current schema and migrations; document owner, tenant key, lifecycle, unique constraint, foreign key, and compatibility source.
- [ ] Specify additive migrations and bounded backfills only for concepts current tables cannot represent, including onboarding, dashboard versions, saved filters, idempotency, import outcomes, cross-module references, and discovery links.
- [ ] Verify composite tenant indexes and query plans on the target database for project, ticket, intake, access, dashboard, report, and client projections; record actual cardinality and latency evidence.
- [ ] Keep derived totals rebuildable with source revision and computation time; prove permission changes invalidate or deny stale projections.
- [ ] Review retention and logs for free text, AI context, file metadata, hashes, secrets, signed URLs, and per-tenant deletion or recovery behavior.
