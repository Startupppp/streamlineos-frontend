# BLD-06B — Build Database Schema and Index Matrix PRD

> Acceptance reference only. Dispatch and status live in
> [`Build execution`](../README.md); do not assign
> or tick a checkbox in this file directly.

## Purpose

Every file in `backend/src/db/schema/build/` is accounted for here. This is not
permission to change or delete a table from filename inspection. Implementation
must trace migrations, raw SQL, barrels, relation configuration, services,
tests, foreign keys, and real data first.

## Invariants Applied to Every Tenant-Owned Table

- `org_id` is non-null and leads data-access indexes under tenant-scoped reads;
- parent/child foreign keys include tenant identity where the schema permits;
- project-owned references prove the same project when required;
- delete behavior is intentional and tested;
- active-record uniqueness handles soft delete explicitly;
- list predicates and stable sort tuple have measured covering indexes;
- mutable display names are not durable relation identity;
- enums/ranges/date order have database checks where locally enforceable;
- created/updated/deleted and actor membership columns follow one convention;
- every table has one live service owner, retention policy, data-scope rule,
  audit classification, migration history, and recovery plan.

## Schema Accountability Matrix

| Schema file | Canonical responsibility | Required schema/index/scale review |
|---|---|---|
| `namespaces.ts` | PostgreSQL Build namespace | Namespace creation and migration order; no duplicate schema owner |
| `index.ts` | sanctioned Build schema barrel | Exports each runtime-managed table once; no raw-SQL holding-table leakage or cycle |
| `tasks.ts` | task/ticket sub-barrel | Re-export only sanctioned ticket owners; no second symbol path or cycle |
| `relations.ts` | Drizzle relation graph | Every relation matches FK/nullability/delete behavior; no relation that broad-loads by default |
| `core.ts` | projects, statuses, duplicate Sprint/Cycle, modules, templates and core relations | **Done** — `pmWorkspaceId` and its FK are dropped per BLD-00 D01 (migration `1159_build_remove_pm_workspaces`), not made nullable; split-by-responsibility plan if safely possible; canonical iteration migration; tenant-leading indexes; status stable identity; project dates/lifecycle constraints |
| `ticket-core.ts` | canonical ticket/work relation fields | Project membership required or explicitly justified; same-project FKs for sprint/cycle/module/parent; migrate `customerId` from legacy `clients` to tenant-composite CRM/Party; numeric/date checks; filtered sort indexes; soft delete |
| `ticket-collaboration.ts` | comments, assignees/watchers, labels, relations/checklists as defined | Unique memberships/reactions; bounded history indexes; tenant/project compatibility; sanitization/retention |
| `ticket-releases.ts` | ticket-to-release/milestone delivery links | Tenant/project/release compatibility; unique active links; release/date query indexes |
| `ticket-integrations.ts` | external repository/provider ticket links | Integration connection ownership; tenant-safe external identity; dedupe; provider-delete behavior; no token columns |
| `ticket-counters.ts` | per-project human ticket numbering | Atomic allocation, tenant/project uniqueness, retry/concurrency behavior, no gaps claim unless guaranteed |
| `members.ts` | Build/project membership and role relations | Organization membership FK; last-owner/access-source rules; unique active membership; actor-search indexes |
| `teams.ts` | Build teams, team assignments, and the `build_members` org-level Build member roster (renamed from `project_workspace_members`; PM Workspace relationship dropped) | Directory identity references; project link uniqueness; lifecycle/archive indexes |
| `managed-products.ts` | product identity, lifecycle, product/project links as defined | Product/project separation; key/name uniqueness; owner/lifecycle/search indexes |
| `managed-product-memberships.ts` | product membership/access | Actor/source/role/expiry; tenant product FK; access-version invalidation writers |
| `roadmap.ts` | product outcome/roadmap records and links | Product canonical ownership; hierarchy/dependency cycle; rank/date/status indexes; publication fields |
| `goals.ts` | Build-related goal links or records | Reconcile with Goals module ownership; hierarchy cycle; metric precision; scope/link uniqueness |
| `feedback.ts` | product/customer feedback relations owned in Build | Product/source/customer tenant scope; merge/provenance; sentiment/theme not authoritative identity; retention/search indexes |
| `project-updates.ts` | structured project status updates | Author membership; audience/client visibility; reporting-period uniqueness where configured; project/date cursor |
| `project-attachments.ts` | project-to-file relation metadata | Files owner reference; no duplicate binary truth; tenant/project/file compatibility; signed URL absent from storage |
| `comment-drafts.ts` | actor-private recoverable drafts | Actor/org/scope/record composite identity; expiry index; content classification; orphan cleanup |
| `activity.ts` | project/ticket activity and audit-like feed | Distinguish product activity from security audit; immutable append; tenant/project/time cursor; retention/partition threshold |
| `reporting.ts` | report snapshots/aggregates if persisted | Source revision/freshness; rebuild/reconciliation; no stale authorization; date/scope indexes |
| `sprint-events.ts` | iteration event history | Migrate to canonical Cycle terminology/identity; append ordering; project/cycle/time index; retention |
| `approvals.ts` | approval request/decision/delegation | Target polymorphism integrity; requester/approver membership; state/expiry checks; decision uniqueness and audit |
| `workflow.ts` | states/transitions/rules | Stable state IDs; one initial/completed policy; transition uniqueness; no orphan references; WIP/rule checks |
| `meetings.ts` | Build meeting relation/extensions | Reconcile with Meetings/Calendar source; no duplicate event/attendee truth; project/source unique link |
| `forms.ts` | form definitions, versions, fields, submissions as defined | Versioned publish snapshot; typed values/options; conditional graph acyclic; PII retention; project/status/date indexes |
| `qa.ts` | suites/cases/runs/results and defect evidence | Canonical BUG relation; ordered step/result constraints; project/run/case compatibility; high-volume result indexes |
| `governance.ts` | risks and decisions | Probability/impact ranges; review dates; decision version/supersession integrity; project/status/date indexes |
| `incidents.ts` | incidents, timelines, responders/actions as defined | Severity/state checks; append-only timeline ordering; responder membership; project/status/time indexes |
| `change-requests.ts` | project/client change requests and decisions | Portal/internal identity separation; state transition checks; target/project/grant integrity; status/date cursor |
| `portfolios.ts` | portfolios, programs, and membership/link records | Hierarchy/link uniqueness; project/product scope compatibility; archive/status/health indexes |
| `whiteboards.ts` | project board metadata/share relation | Canvas storage owner; project identity; share token hash/version/expiry; no plaintext public token |
| `git.ts` | repository/provider mappings and delivery metadata | Integration connection reference only; org/project/repository uniqueness; external IDs bounded; advertised provider enum matches implemented parsers; webhook secrets encrypted/rotated by Integrations, never plaintext in Build |

## High-Volume Tables

Activity, comments, events, submissions, QA results, automation runs, webhook
deliveries, incident timelines, drafts, and ticket history require:

- explicit retention/archive policy;
- cursor indexes matching tenant + parent + time + ID;
- row-growth forecast and storage budget;
- partitioning only after measured threshold and operational plan;
- vacuum/analyze and index-bloat monitoring;
- asynchronous export and purge with audit;
- no cascade that can lock/delete an unbounded graph synchronously.

- [ ] **BLD-06B-001** table-by-table row counts, growth, largest tenant, index
  size, dead tuples, and query owners are recorded from a named environment.
- [ ] **BLD-06B-002** high-volume read/write plans pass at projected 12- and
  36-month scale.

## Migration Checklist Per Schema Change

- backward-compatible deployment order;
- named disposable database;
- preflight counts and invalid-row report;
- bounded/resumable backfill;
- dual-read/write only when necessary and removed after cutover;
- validation before `NOT NULL`, unique, check, or FK enforcement;
- lock duration and timeout budget;
- journal/migration integrity;
- post-migration counts and query plans;
- approved forward recovery or restore procedure.

- [ ] **BLD-06B-003** every proposed canonicalization has a field-level source
  to target map and unmappable-row policy.
- [ ] **BLD-06B-004** every index add/drop has measured before/after plans and
  write/storage impact.
- [ ] **BLD-06B-005** every FK/delete change has dependency counts and failure
  behavior before migration.

## Completion Checks

- [x] **BLD-06B-006** all current Build schema files appear exactly once in
  this matrix. **Closed — set equality measured 2026-09-21, re-measured
  2026-09-23 after PM Workspace removal.** `backend/src/db/schema/build/*.ts`
  held 36 files on 2026-09-21; `pm-workspaces.ts` and
  `pm-workspace-memberships.ts` are now deleted (migration
  `1159_build_remove_pm_workspaces`), leaving 34. This matrix names 34
  distinct `.ts` filenames. `comm` over both sorted sets returns empty in both
  directions (no file missing from the matrix, no matrix row naming an absent
  file), and no filename heads more than one table row.
  This certifies coverage of the matrix, not the correctness of any row's
  owner, index or retention claim.
- [ ] **BLD-06B-007** every table maps to exactly one canonical service/module
  owner and every owner has tenant/data-scope tests.
- [ ] **BLD-06B-008** no duplicate Sprint/Cycle, BUG/ticket, meeting/event,
  goal, file, customer, or integration truth remains unexplained.
- [ ] **BLD-06B-009** all changed constraints and indexes are proven in
  migrations and real database tests.
- [ ] **BLD-06B-010** schema barrel, migration-integrity, duplicate-FK,
  tenant-boundary, cycle, type, and backend build gates pass.
