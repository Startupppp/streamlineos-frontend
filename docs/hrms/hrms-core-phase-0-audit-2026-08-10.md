# HRMS core architecture review - Phase 0 audit

Date: 2026-08-10

Status: **GATED - awaiting approval; no application code or migration has been written**

Frontend baseline: `799134fd36dd6ea7baa73f676fe8a3eb86bcf0ab`

Backend baseline: `66bad4e14f7b80556b3b14ede2e883150edbc89d`

## Executive outcome

HRMS core is not ready for a table-by-table refactor. The first Phase 1 decision must establish one canonical workforce subject because three active models are currently written and read in parallel:

1. global account fields on `users`;
2. shared directory/workforce records in `organization_people`, `workers`, and `worker_engagements`;
3. HR records in `hr_people` and `hr_employments`.

The live read-only reconciliation already found one directory worker with no canonical HR person/employment, all five stored leave balances differing from the empty ledger-derived balance, and three global user rows containing tax or bank data. No row was changed and no identity or field value was exposed.

The most urgent risks are not cosmetic: an employee GET can materialize an arbitrary global user into the caller's tenant, termination can disable a user across every tenant, ordinary employee-view responses serialize salary/private data, tenant-owned relationships lack composite tenant FKs, leave and attendance transitions race, and frontend HR caches are not tenant-scoped.

**Stop condition:** this document completes Phase 0 only. Phase 1 must first present the canonical model and expand-contract migration plan, then stop again for approval before implementation.

## Filled context

| Context item | Verified answer |
|---|---|
| Current module | HRMS core only: employee/person/employment, org structure, attendance, leave, employment documents, and lifecycle/onboarding paths that mutate these records |
| Backend paths | `backend/src/modules/hr/{core,directory,time,lifecycle,onboarding,config}`, `backend/src/modules/directory`, `backend/src/modules/organization/hierarchy` |
| Frontend paths | `frontend/app/(authenticated)/{hr,me,directory,settings/directory,settings/organization}` plus corresponding feature/hook roots |
| Schema paths | `backend/src/db/schema/{hr,directory,common}` |
| Stack | NestJS 11.1.18, Next.js 16.3.0, React 19.2.0, Drizzle 0.45.2, PostgreSQL, TanStack Query 5.90.12, Zod 4.1.13 |
| Migration tooling | Drizzle `db:generate` then `db:migrate`; `db:push` is guarded and forbidden outside local development (`backend/package.json:15-17`, `backend/scripts/guard-db-push.mjs:12-23`) |
| Migration strategy | Live tenants: expand-contract only; forward migration, rollback, backfill, validation and deploy order required |
| Redis | Yes, Upstash when configured; null/no-cache fallback (`backend/src/common/cache/cache.module.ts:10-13`) |
| Job queue | No BullMQ. A PostgreSQL `payroll_jobs` table and polling worker exist (`backend/src/db/schema/payroll/entities-periods.ts:164-198`, `backend/src/modules/payroll/jobs/payroll-jobs-worker.service.ts:31-77`) |
| Tests | Backend Jest unit/e2e; frontend Jest/jsdom. No enforced coverage threshold |
| Live production tenants | Yes; production URL was used only for bounded, aggregate, explicit read-only audit transactions |
| Payroll output trusted | **No**. Existing payroll figures must not become golden baselines; statutory arithmetic needs a discrepancy report and approval in the later Payroll module session |

The older `docs/hrms/00-05` material was reviewed as prior art. This audit uses the current commits and current production metadata; where facts differ, this dated audit is authoritative for the new gated programme.

## Scope boundaries

Included: employee master, directory/workforce bridge, canonical HR person/employment, hierarchy, attendance, leave, documents, onboarding and offboarding writes that change core employment state.

Excluded for this session: payroll calculation/refactor, Recruitment/ATS internals, performance, benefits, engagement, and unrelated HR features. HR dashboard calls into ATS were inventoried only as a coupling/cost finding.

## Audit method and production safety

- Three parallel read-only audits covered schema, backend/API/security/caching, and frontend/routes/personas/UI.
- Production SQL used one connection with `BEGIN ... READ ONLY`, short statement/lock timeouts, an audit-specific `application_name`, aggregate/metadata output only, and `ROLLBACK`.
- No production writes, migrations, application edits, API calls, emails, jobs, or external messages were made.
- No PII values, tenant identifiers, emails, or record IDs are included in the artifacts.
- Knip production cycle checks passed in both repositories. Madge is not installed, so it was not silently added. Knip reported no unused production files/exports/types.

## Inventory

The exhaustive catalogs are separate appendices:

- [Database inventory](./hrms-core-phase-0-db-inventory-2026-08-10.md): all 45 in-scope live tables, every column, row counts, relation sizes, and RLS policy inventory.
- [Index inventory](./hrms-core-phase-0-index-inventory-2026-08-10.md): all 195 in-scope indexes with size, cumulative scan count and live definition.
- [Code inventory](./hrms-core-phase-0-code-inventory-2026-08-10.md): 50 controller files, 84 service files, 25 contract files, 23 schema sources, 50 route pages, 182 production feature files, 23 hook/query-key files, and 41 focused test files.

## Baseline

### Database and workload observability

| ID | Baseline fact | Evidence / result |
|---|---|---|
| BASE-001 | Live DB is not a production-size performance fixture | PostgreSQL 18.4; 5 organizations, 7 users, 8 memberships; database size 83,976,192 bytes. Most HR tables are empty. Numeric scale conclusions are blocked. |
| BASE-002 | Historical heavy-query and endpoint percentile data are unavailable | `pg_stat_statements` is not installed and no general endpoint/DB p50/p95 instrumentation was found. Do not fabricate p50/p95 or “top 10 heaviest” rankings. |
| BASE-003 | Current index statistics are non-representative | 195 indexes, 1,925,120 bytes total; 109 zero-scan indexes, 1,056,768 bytes. Stats reset is null and most tables are empty, so zero scans are not deletion proof. |
| BASE-004 | Current RLS is broad but not forced | All 45 audited tables have RLS enabled and at least one policy; none uses FORCE RLS. Composite tenant FKs are still required because RLS cannot validate relationship ownership. |
| BASE-005 | Runtime page request counts are not instrumented | Static initial-render lower bounds are recorded below; actual cache hits, payload bytes, DB time and p50/p95 need runtime instrumentation. |
| BASE-006 | Frontend coverage collection is broken | Jest coverage loads `@babel/core@8.0.1` through the permissive `>=7.29.6` range while `babel-plugin-istanbul@6.1.1` requires Babel 7 (`frontend/package.json:135`, `frontend/pnpm-lock.yaml:30,438`). Result is 0/0, not a coverage percentage. |
| BASE-007 | Broad backend feedback is too slow and one lifecycle fixture is stale | Broad scoped Jest timed out at 604 seconds. A focused lifecycle chunk had 7/8 suites pass; `exit-write.service.spec.ts` failed 2 tests because its DB mock lacks the production `transaction()` API used at `exit-write.service.ts:316`. |

Database cumulative activity: 1,164,080 commits, 1,370 rollbacks, 183,418 blocks read, 44,563,344 cache hits, 296,002,843 tuples returned, 26,877,547 fetched, 601,835 inserted, 302,367 updated, and 146,664 deleted. With no stats-reset timestamp, these are context only.

Largest/non-empty audited tables are still tiny: `org_units` 49 rows/114,688 total bytes; `leave_types` 10/65,536; `leave_balances` 5/81,920; `organization_people` 3/163,840; `worker_engagements` 2/163,840; `workers` 1/147,456; `attendance` 1/81,920. Per-table numbers are in the DB appendix.

### Live integrity preflight

| Check | Aggregate result | Interpretation |
|---|---:|---|
| Directory accounts with a worker but no HR person/employment | 1 | Confirms model drift already exists |
| HR employment with no directory worker | 0 | No current reverse mismatch, but HR tables are empty |
| Duplicate account-linked people / multiple primary employments | 0 | Safe only for current tiny dataset |
| Cross-tenant/orphan membership, placement, manager and HR-person edges | 0 | Current checked edges are clean; broader FK preflight still required |
| Leave balance vs ledger discrepancies | 5 | Every stored balance differs because ledger has no rows; opening-balance provenance must be classified before cutover |
| Duplicate ledger source events | 0 | Ledger is empty |
| Duplicate/open attendance sessions | 0 / 0 | One historical attendance row exists; concurrency invariant remains absent |
| Global users containing tax or bank data | 3 | Confirms sensitive employment data remains on the global account model |
| HR sensitive rows containing unencrypted bank JSON | 0 | HR sensitive table is empty; design defect still exists |

### Representative query plans

These are source-matched critical paths, not empirically ranked “heaviest” queries. Each ran separately with `EXPLAIN (ANALYZE, BUFFERS, TIMING OFF)` in a read-only transaction.

| Query shape | Planning ms | Execution ms | Rows | Shared hit/read | Structural observation | Source evidence |
|---|---:|---:|---:|---:|---|---|
| Employee first page | 0.516 | 0.174 | 4 | 25/0 | Exact broad projection and sort remain | `backend/src/modules/hr/directory/employees.service.ts:68-128` |
| Employee wildcard search count | 0.369 | 0.157 | 1 aggregate | 26/0 | Six leading-wildcard predicates plus exact count | `employees.service.ts:79-101,129-133` |
| Canonical primary employment | 0.372 | 0.089 | 0 | 13/0 | Empty canonical tables make latency meaningless | `employee-mutations.service.ts:96-126` |
| Full organization tree source | 0.268 | 0.145 | 15 | 13/0 | Full tenant read; sequential scan selected on tiny data | `org-hierarchy.service.ts:434-444` |
| Monthly attendance batch | 0.663 | 1.114 | 1 | 16/1 | Uses attendance/member indexes; only probe with one physical read | `attendance-summary.service.ts:63-103` |
| Annual attendance heatmap | 0.321 | 0.150 | 1 | 13/0 | Indexed range plus group/sort | `attendance-read.service.ts:201-229` |
| Pending leave with relations | 0.907 | 0.111 | 0 | 16/0 | 500-row cap; empty table | `leaves.service.ts:40-61,121-149` |
| Leave analytics by department | 0.647 | 0.119 | 0 | 13/0 | Join shape can multiply users in several units | `leaves.service.ts:236-260` |
| Onboarding document summary | 0.616 | 0.171 | 1 | 17/0 | `DISTINCT ON` latest-version sort remains | `onboarding-views.service.ts:31-100` |
| Employment timeline audit branch | 8.937 | 0.104 | 0 | 15/0 | Deep prefix-limit/sort shape remains; empty table | `hr-timeline.service.ts:30-72` |

### Static initial page-request lower bounds

Shared shell/session/access queries are excluded. TanStack duplicate keys are treated as deduplicated.

| Route | Persona/job | Route gate | Initial feature queries | Evidence |
|---|---|---|---:|---|
| `/hr` | HR operations | None at page | >=16 distinct, 20 mounts | `frontend/features/hr/hub/hr-hub-page.tsx:114-118`, `hr-hub-queues.tsx:28-33`, `hr-hub-recruitment.tsx:54-60` |
| `/hr/employees` | HR admin/scoped manager | `hr:employees:view` | >=3 admin, >=2 otherwise | `employees-list-page.tsx:154-166` |
| `/hr/employees/[id]` | HR admin/scoped viewer | `hr:employees:view` | >=4 client + 1 server | `employee-details-view.tsx:50-53` |
| `/directory` | Granted company lookup | `directory:people:view` | >=1 | `people-directory-page.tsx:119-137` |
| `/hr/attendance` | HR/team manager | None at page | >=6 admin, >=3 personal | `attendance-content.tsx:25-36`, `check-in-button.tsx:127-132` |
| `/me/attendance` | Any employee | `self:attendance` | >=2 | `my-attendance-page.tsx:95-103` |
| `/hr/leaves` | HR/manager | self or HR view | >=5 admin, >=2 self | `leaves-wfh-content.tsx:103-135` |
| `/hr/onboarding` | HR/recruiter | None at page | >=2 | `frontend/app/(authenticated)/hr/onboarding/page.tsx:160-191,232-234` |
| `/hr/documents` | Document admin/reviewer | `hr:documents:view` | >=6 | `documents-page.tsx:60,81-86,235-236` |
| `/settings/organization/structure` | Org owner/admin | `settings:view` | >=2 | `organization-structure-page.tsx:178-183` |

`/hr/org-chart` issues only one request but fetches and recursively renders the full workforce (`frontend/hooks/api/hr/employees.ts:166-172`; `frontend/app/(authenticated)/hr/org-chart/page.tsx:252-371`). Request count alone understates its cost.

### Test baseline

- Frontend ordinary scoped run: 5 suites, 17 tests passed in 4.6 seconds; forced-exit/open-handle warning. Coverage instrumentation failed (BASE-006).
- Backend representative production-service run: 8 suites, 80 tests passed. Coverage over eight selected hot services: statements 52.55%, branches 35.20%, functions 53.90%, lines 55.02%. This is representative-file coverage, not module-wide coverage.
- Backend lifecycle/time/onboarding chunk: 7 suites/31 tests passed and 1 suite/2 tests failed due the stale transaction mock in BASE-007.
- A separate lifecycle “transition matrix” spec defines its own matrix in the test and covered 0/800 collected production statements (`backend/src/modules/hr/core/__tests__/employment-lifecycle-transitions.spec.ts:6-21`). It does not protect the production transition implementation.
- Both test commands required `--forceExit`, indicating unresolved open handles.

## Schema findings

| ID | Evidence | Problem and impact | Severity | Phase 1 direction | Migration risk |
|---|---|---|---|---|---|
| SCH-001 | `backend/src/db/schema/common/auth.ts:103-150`; `hr/core-people.ts:67-175`; `directory/*.ts`; `backend/src/modules/payroll/lib/payroll-run-payee.ts:96-141` | Three active employee models drift and payroll falls back across them. | Critical | Designate one tenant-scoped workforce subject; expand-contract compatibility only. | Very high |
| SCH-002 | `organization.ts:48-55,86-92`; `worker-engagements.ts:45-54`; `core-people.ts:105-140,177-239` | Most tenant-owned edges are single-column/raw IDs, permitting cross-tenant or dangling relationships. | Critical | Composite tenant candidate keys/FKs after integrity preflight. | High |
| SCH-003 | `leaves.ts:17-29`; `leave-ledger.ts:43-77`; `leaves-approval.service.ts:209-213,323-327` | Mutable leave counter remains a source of truth beside the ledger. | Critical | Ledger authoritative; balance becomes rebuildable projection. | High |
| SCH-004 | `leave-ledger.ts:59-76`; `cron-leave.service.ts:100-107,151-157` | Ledger lacks source/idempotency/reversal uniqueness. | High | Immutable event key and original-entry reversal link. | Medium |
| SCH-005 | `attendance.ts:6-26`; `attendance-clock.service.ts:96-149,201-292` | Mutable attendance sessions and JSON breaks allow lost updates/duplicate open sessions. | Critical | Append-only punch/break events plus open-session invariant. | High |
| SCH-006 | `core-people.ts:165-166`; `documents.ts:44`; `offboarding.ts:107,238,244` | Filtered relational data is stored in arrays/JSON. | High | Normalize child/link tables with tenant FKs and auditability. | Medium-high |
| SCH-007 | `attendance.ts:11-12,21`; `biometric.ts:13,26,30`; `shifts.ts:28-29,43-44`; `leave-policies.ts:19-20` | Events use timestamp-without-time-zone and business dates appear as text/timestamp. | High | Per-column date vs timestamptz plan using org-timezone evidence. | High |
| SCH-008 | `organization.ts:47,57,92`; `workers.ts:27-30`; `attendance.ts:13`; `leaves.ts:39,46,66`; `offboarding.ts:88,102-104` | Many status/type fields have no DB enum/check; TypeScript typing does not constrain PostgreSQL. | High | DB enum, named check or lookup per stability needs. | Medium |
| SCH-009 | `core-people.ts:96-135`; `offboarding.ts:115-131`; `attendance.ts:22-26` | Missing active account-person, one-primary-employment, document slug and open-session uniqueness. | High | Deduplicate then add partial/composite uniqueness. | High |
| SCH-010 | `core-people.ts:110-124,196-240`; `hr-employments.service.ts:160-173` | Placement/designation can bypass effective-dated history, so past state is not reproducible. | Critical | Effective-dated assignments; current fields become projections. | High |
| SCH-011 | Directory, HR person/employment, attendance, leave, onboarding and lifecycle schemas | Concurrently edited aggregates have no version column. | High | Add non-null versions and conditional updates. | Medium |
| SCH-012 | `organization-people.ts:61-66`; `worker-engagements.ts:19-67`; `attendance.ts:6-26`; `leaves.ts:6-29` | Soft-delete and actor/audit conventions are inconsistent. | High | Aggregate-specific lifecycle/actor policy; never soft-delete append-only events mechanically. | Medium |
| SCH-013 | `core-people.ts:68,104,138,178,197,224`; `attendance.ts:7,29,43`; `leave-ledger.ts:46` | Hot/long-lived tables use 32-bit serial IDs. | High | Staged bigint identity or UUID decision per aggregate. | Very high |
| SCH-014 | `organization.ts:48-50,67-73` | Hierarchy is adjacency-only; descendant reads require recursion/full loads. | Medium-high | Benchmark; likely tenant-scoped closure table because reads dominate moves. | Medium-high |
| SCH-015 | `common/auth.ts:60-70`; `hr/attendance.ts:28-40`; `biometric.ts:4-35`; `enterprise-comp.ts:40-110` | Two holiday models and two clock-device families are active. | High | Choose canonical stores and migrate via adapters after consumer proof. | High |
| SCH-016 | `core-people.ts:111-112`; migrations `0347_fk_repairs.sql:79-96`, `0330_worker_engagement_overlap.sql:30-44`, `0379_effective_dating_convention.sql:24-72` | Drizzle declarations omit live SQL-only constraints, risking schema drift. | High | Constraint registry/schema-vs-live CI; preserve existing exclusions. | Medium |

## API findings

| ID | Endpoint/evidence | Problem | Queries/request or risk | Severity | Fix |
|---|---|---|---|---|---|
| API-001 | Employee, people, worker and hierarchy lists; e.g. `employees.service.ts:79-134` | Offset pagination/exact counts or silent hard caps do not meet scale target. | Usually >=2 plus permission lookup | High | Keyset/cursor, bounded contracts, optional/estimated counts. |
| API-002 | `employee-mutations.service.ts:185-202,239-300` | Manager cycle check is N+1; joining-date “old” value is read after update so due-date delta is zero. | O(depth) | High | Recursive/closure query and capture prior row before update. |
| API-003 | `person-employment-sync.service.ts:53-215`; onboarding sync paths | Legacy user/membership, canonical workforce, audit and onboarding writes span transactions. | Partial state on failure | Critical | One authoritative command or durable outbox saga. |
| API-004 | `attendance-clock.service.ts:96-149,256-295` | Absent-row lock does not serialize check-ins; break JSON is read-modify-write. | Race/lost updates | Critical | Partial unique open session plus transactional state transition. |
| API-005 | `attendance-regularization.service.ts:45-103,133-264` | Duplicate checks and approval transitions race; workflow errors are swallowed; totals are not recomputed before payroll input rebuild. | Partial/inconsistent state | Critical | Conditional transactional state machine and durable workflow outbox. |
| API-006 | `leaves-write.service.ts:51-218`; `leaves-approval.service.ts:159-442` | Leave/balance transitions lack locks/version predicates and can double-deduct or approve after cancel. | Concurrency corruption | Critical | Ledger-source transaction and expected-state updates. |
| API-007 | `leaves-page.service.ts` page-data path | GET creates missing balances and silently returns newest 200 requests. | Write-on-read; hidden history | High | Read-only GET, explicit initialization, cursor history. |
| API-008 | `hr-effective-changes.service.ts:28-214` | Client supplies old value; approve/apply are not conditional; apply-due is unbounded serial work. | Mutable compensation/history | Critical | Server snapshot, conditional transition, bounded idempotent jobs. |
| API-009 | `onboarding.service.ts:190-535`; `onboarding-admin.service.ts:17-99`; `onboarding-task.service.ts:98-170` | Initiation/task creation/submit invariants are non-atomic; failures are swallowed. | Duplicate/incomplete onboarding | Critical | Transactional state machine, uniqueness and outbox. |
| API-010 | `onboarding-views.service.ts:223-275,336-367` | Document version uses application `max+1`; audit/status writes are separate. | Race/partial state | High | Locked/generated version and one conditional transaction. |
| API-011 | `termination.service.ts:445-510`; `exit-write.service.ts:175-365` | Lifecycle transitions read then write unconditionally and update incompatible identity models. | Wrong terminal state | Critical | One canonical employment lifecycle state machine. |
| API-012 | `probation.service.ts:30-245` | Unbounded due list, duplicate workflow, concurrent extension and split confirm writes. | Duplicate/overwritten review | High | Bounded job, uniqueness, versioning and transaction. |
| API-013 | `directory.service.ts:45-66,636-659`; `termination.service.ts:425-441` | Error envelopes vary and provider error text may leak. | UX/security inconsistency | Medium | One error envelope/code mapper; internal detail only in logs. |
| API-014 | No throttle/idempotency matches; bulk/backfill/report/reminder controllers | Bulk, report and apply-due work is synchronous, retry-unsafe and unthrottled. | Timeout/duplicate side effects | High | Queue, idempotency key, status endpoint and rate limit. |
| API-015 | `org-hierarchy.service.ts:136-138,190-192,242-357` | Dependency check and archive/delete are separate; dependencies can appear between them. | TOCTOU integrity break | High | Transaction plus row/advisory lock and DB restrictions. |
| API-016 | `hr-timeline.service.ts:30-128` | Page N fetches offset+limit from three tables then merges; total is bounded/incorrect. | Three increasingly deep reads | High | Unified event projection or independent cursors. |
| API-017 | `directory.service.ts:559-610,672-697`; `worker-engagements.ts:45-54` | Engagement edit/terminate has no version and accepts unvalidated tenant references. | Cross-tenant/race risk | High | Tenant reference validation and conditional versioned transition. |
| API-018 | `attendance.schemas.ts:3-16`; attendance check-in path | Client chooses business `localDate` without proving org-local current date. | Off-by-one/fraud risk | High | Derive org business date server-side; correction via regularization. |

## Security and privacy findings

| ID | Evidence | Confirmed problem | Severity | Fix |
|---|---|---|---|---|
| SEC-001 | `backend/src/db/schema/directory/organization-people.ts:25-29`; `worker-engagements.ts:45-54`; `hr/core-people.ts:105-140` | Tenant ownership is not enforced across relational edges; RLS cannot validate the referenced parent. | Critical | Composite tenant FKs after privileged read-only preflight. |
| SEC-002 | `core-people.ts:144-155`; `onboarding-details.service.ts:229-253`; `hr-sensitive.service.ts:125-163` | Bank/UAN/ESI details are plaintext JSON while other sensitive values are encrypted. | Critical | Field encryption with key version/rotation and masked derivatives. |
| SEC-003 | `common/auth.ts:103-137`; `organization-people.ts:30-60` | Global auth/directory rows mix salary, tax, bank, emergency and private PII with common identity. | Critical | Identity-only user; split public, private and sensitive tables/policies. |
| SEC-004 | Cascades in `core-people.ts:69-70,105-106,139-140`; `attendance.ts:8-9`; `documents.ts:27-29` | Deleting identity/person/org can erase statutory and employment history. | Critical | Retain/pseudonymize facts; restrict cascade deletion. |
| SEC-005 | `core-audit.ts:13-32`; `offboarding.ts:171-182` | Audit tables are mutable/cascade-owned and can disappear. | High | Append-only DB permissions/triggers and separate retention. |
| SEC-006 | `rosters.ts:20-32`; `offboarding.ts:83-93`; RLS selector `0378_rls_remaining_tenant_tables.sql:15-28` | Child tables without tenant ID cannot receive the standard direct tenant RLS policy. | Critical | Add tenant key, composite parent FK and tenant-leading index. |
| SEC-007 | `attendance.ts:16-20` | Precise geolocation PII is embedded in hot attendance rows without retention policy. | High | Separate protected evidence, minimize precision, audit access and expire data. |
| SEC-030 | `hr-employee-subroutes.controller.ts:25-32`; `person-employment-sync.service.ts:218-256` | GET accepts any global user ID and materializes that identity into caller tenant on miss. | Critical | Remove write-on-read; require org membership and DataScope; explicit backfill job only. |
| SEC-031 | `employees.controller.ts:180-220`; `hr-people.controller.ts:45-72`; `hr-employments.controller.ts:38-57` | Scopable employee-view routes omit object-level DataScope checks. | Critical | Resolve one AccessService DataScope and enforce it in repository predicates. |
| SEC-032 | `employees.service.ts:103-156`; `employee-mutations.service.ts:57-164`; `hr-people.service.ts:66-75` | Ordinary employee-view responses include salary and broad private person data. | High | Explicit safe DTO; sensitive endpoint/permission and view audit. |
| SEC-033 | `hr/directory/ability.helpers.ts:3-4`; `employee-mutations.service.ts:173-176` | Bespoke/stale claim permission check bypasses AccessService. | High | Use AccessService exclusively. |
| SEC-034 | `hr-employments.service.ts:93-174`; `hr-custom-fields.service.ts:129-210`; `directory.service.ts:574-600` | Referenced employee/org-unit/custom-field IDs are not tenant/type validated. | Critical | Load each reference by org+id+kind and add composite FKs. |
| SEC-035 | `onboarding-views.service.ts:191-253,336-416` | Arbitrary target user upload/review and global-user recalculation lack membership/scope enforcement. | Critical | Membership/DataScope validation and one tenant transaction. |
| SEC-036 | `termination.service.ts:445-485` | Tenant termination sets global `users.isActive=false` and revokes all sessions. | Critical | Transition tenant employment/membership only; org-aware session refresh. |
| SEC-037 | `exit.service.ts:287-295,342-350` | Experience letter copies arbitrary global user data without tenant membership proof. | Critical | Resolve authorized org-scoped employment. |
| SEC-038 | `onboarding-task.service.ts:57-95` | Subject employee can complete HR/manager/IT-owned tasks; `ownerRole` is ignored. | Critical | Persona/action gate through AccessService. |
| SEC-039 | `hr-sensitive.service.ts:13-25`; `onboarding-views.service.ts:141-176` | Bank data is raw and document responses expose persistent URLs without access audit. | High | Encrypt fields; short-lived tenant URLs; audit view/export. |
| SEC-040 | `leaves.schemas.ts:36-65`; `leaves.service.ts:526-579` | Client chooses approver; comp-off can target arbitrary user under create permission. | Critical | Derive/validate approver and separate admin grant authority. |
| SEC-041 | `hr-org-catalog.controller.ts:90-253`; `org-hierarchy.service.ts:242-357` | Duplicate team/location write APIs use different permissions and bypass dependency/audit/cache behavior. | High | Retire/delegate duplicate writes after consumer proof. |
| SEC-042 | Module guards on hierarchy/leave/onboarding/document controllers | HR entitlement is inconsistent; generic settings hierarchy is HR-gated while some HR routes are not. | High | Central route ownership: HR data needs HR; settings hierarchy does not. |
| SEC-043 | `attendance-summary.controller.ts:12-39` and service selection path | Scoped viewer can request arbitrary/all employee attendance because DataScope is not applied. | Critical | Apply attendance scope to employee selection. |
| SEC-044 | `attendance.schemas.ts:67-79`; report endpoint | Unbounded recipients/date range, synchronous send, no rate limit/export audit. | High | Bound, authorize, queue, rate-limit and audit. |
| SEC-045 | `exit-write.service.ts:192-239` | Asset/identity dependency failures become false and exit completion fails open. | Critical | Fail closed; audited explicit override only. |
| SEC-046 | `backend/src/common/audit/audit.service.ts:30-33`; mutation examples `directory.service.ts:195-206` | Critical audit writes are fire-and-forget and can be lost after transaction/ALS teardown. | High | Await or after-commit outbox in explicit tenant context. |
| SEC-060 | `frontend/app/(authenticated)/hr/employees/[employeeId]/page.tsx:12-28`; `edit-employee-form.tsx:25-46` | Full sensitive employee DTO reaches the client before tabs are hidden. | Critical | Split DTO/endpoints; never serialize sensitive data into base page. |
| SEC-061 | `frontend/lib/query-keys.ts:1-18,1432-1458,2013-2026`; logout paths `auth-hooks.ts:94-109` | HR/directory keys omit tenant; logout/401 does not clear QueryClient, risking cross-user/tenant cache bleed. | Critical | Tenant-first keys and cache clear on every logout, 401 and org switch. |
| SEC-062 | Ungated routes including `hr/attendance/page.tsx:1-37`, `hr/onboarding/page.tsx:160-180`, `hr/org-chart/page.tsx:1-5` | Many admin pages lack exact server route gates and issue predictable forbidden calls. | High | Exact server route gate; backend remains authoritative. |
| SEC-063 | `document-row-actions.tsx:38,108-159`; `templates-list-page.tsx:243-377` | Document mutation controls are not consistently permission-hidden. | High | One backend-derived capability model for every action. |
| SEC-064 | `person-detail-page.tsx:248-250,292-300,525-579` | Member invitation uses broad settings manage rather than canonical owner/admin/module capability. | High | Backend-derived `canManageMembers` capability. |
| SEC-065 | Ungated HR hooks, e.g. `comp-off.ts:11-15`, `overtime.ts:32-40`, `onboarding.ts:32-54` | Unauthorized direct routes still fire avoidable 403 queries. | Medium | Exact `enabled: useCan(...)` at hook boundary. |
| SEC-066 | `sidebar-nav-items.ts:2907-2915` | Empty enabled-module list means “all enabled,” exposing all product navigation during empty/error states. | High | Explicit loading/loaded/error entitlement state; loaded empty means none. |

## UI findings

| ID | Route/component evidence | Problem | Severity | Fix |
|---|---|---|---|---|
| UI-001 | `sidebar-nav-items.ts:285-288,335-347` | Self permissions expose HR-admin routes instead of canonical `/me/*`. | High | Admin `/hr/*` uses HR permissions; shared self UI under `/me/*`. |
| UI-002 | `org-hub-client.tsx:13-158`; canonical hierarchy archive flow `business-units-page.tsx:312-348` | Competing org surfaces: legacy hard delete without confirmation vs canonical archive/restore/dependency UX. | Critical | One canonical hierarchy; retain HR-only role/level catalogs separately. |
| UI-003 | `documents-page.tsx:81-133,207-216` | Current-page filtering/statistics are presented as library-wide; quota is hardcoded. | High | Server filter/aggregates/quota. |
| UI-004 | `document-row-actions.tsx:64-67,150-158`; `rich-documents-section.tsx:70-99` | Document delete has no shared confirmation. | High | Shared confirmation naming retention consequence and retry error. |
| UI-005 | `hooks/api/hr/employees.ts:166-172`; `hr/org-chart/page.tsx:252-371` | Full workforce is transferred/rendered/exported client-side. | High | Lazy children, progressive expansion, virtualization, queued export. |
| UI-006 | Hierarchy selectors `branches-page.tsx:328-331`, `departments-page.tsx:248-253`, `teams-page.tsx:269-286` | First-100 selectors hide valid managers/parents. | High | Server-search cursor combobox. |
| UI-007 | `daily-history-table.tsx:167-230`; `team-attendance-card.tsx:132-308` | Errors become empty states and custom paging diverges. | Medium | Shared ErrorState/getErrorMessage and pagination. |
| UI-008 | `employees-list-page.tsx:342-351`; leave-policy/holiday/comp-off pages | Loading/error/empty patterns are inconsistent or missing. | Medium | One shared list-state contract. |
| UI-009 | Document route gates vs actions: `document-types/page.tsx:5`, `document-types-page.tsx:109` | Actions use employee-manage instead of exact document permission. | High | Align action and backend permission. |
| UI-010 | `hooks/api/hr/document-types.ts:32-78`; duplicate data layer `document-types-page.tsx:53-107` | Two cache/query implementations drift. | Medium | Central hook only. |
| UI-011 | `org-hub-client.tsx:77-99` | Fixed tabs have no 375px overflow alternative. | Medium | Responsive select/scrollable accessible tabs. |
| UI-012 | `document-row-actions.tsx:83-87` | Hover-only actions are invisible on keyboard focus. | Medium | `focus-within` visibility and accessible names. |
| UI-013 | Nav `sidebar-nav-items.ts:2819-2822`; route `me/documents/page.tsx:5` | Visible My Documents link lacks exact route permission. | High | Apply `self:onboarding-docs` to central nav. |
| UI-014 | `sidebar-nav-items.ts:285-288`; `hr/onboarding/my-tasks/page.tsx:100-105` | Personal tasks are tied to attendance permission and admin route. | High | Canonical self onboarding permission/route. |
| UI-015 | `sidebar-nav-items.ts` 2,963 lines; hierarchy pages 533-787 lines | Several files exceed 500-line hard cap; central nav is a regression hotspot. | Medium | Split feature/config leaves while retaining one permission-derived nav model. |

## Cost findings

Numeric savings cannot be estimated honestly until representative data and p95 instrumentation exist. “High” below means the code shape scales with tenant/history size; it is not a fabricated currency claim.

| ID | Evidence | Current cost driver | Fix | Estimated direction |
|---|---|---|---|---|
| COST-001 | `directory.service.ts:109-112,383-386`; `organization-people.ts:68-84` | Leading-wildcard four-column directory search without matching search index. | Tenant-scoped trigram/search vector plus cursor. | High read CPU reduction at scale; unquantified |
| COST-002 | Non-partitioned attendance, biometric log, leave ledger and audit schemas | Append/history tables grow in one heap/index set. | Threshold-led time partitioning with tenant/time keys. | High long-term vacuum/index benefit |
| COST-003 | `attendance-clock.service.ts:203-292` | JSON break arrays rewrite whole values/dead tuples. | Append-only normalized events. | Lower write amplification |
| COST-004 | `sync-canonical-employment-fields.ts:11-46`; payroll fallback | Triple model duplicates storage, indexes, writes and joins. | One canonical subject plus compatibility projection. | High complexity/write saving |
| COST-005 | `core-audit.ts:25-31`; `hr-audit.service.ts:40-59` | Audit query sorts and exact-counts without ordered composite. | `(org_id,created_at desc)`/entity composite and cursor. | High p95 benefit at volume |
| COST-006 | `organization.ts:38-75` | Adjacency tree requires recursion/full load. | Benchmarked closure/path strategy. | Indexed descendant reads |
| COST-007 | Duplicate holiday/device schemas | Same concepts incur parallel storage/config/support cost. | Canonical store and adapters. | Moderate write/ops reduction |
| COST-030 | Employee/directory/hierarchy lists | Offset scans and exact count every page. | Cursor and omit/cache counts. | High at large offsets |
| COST-031 | Attendance summary policy loops | At least two policy lookups per employee. | Batch policy assignments/config. | Removes O(N) query amplification |
| COST-032 | `person-employment-sync.service.ts:259-295`; bulk onboarding | Sequential multi-query workflows per member. | Queued bounded batches and prefetched references. | High throughput improvement |
| COST-033 | Onboarding reminders/attendance email report | Unbounded selection plus external call per user. | Queued idempotent batches/caps. | Lower timeout/retry cost |
| COST-034 | `org-hierarchy.service.ts:407-444` | Full tenant tree and counts in application memory. | SQL aggregates and versioned cached tree/subtree. | High for large orgs |
| COST-035 | `hr-timeline.service.ts:30-128` | Three increasingly deep prefix reads per page. | Unified indexed event projection/cursors. | High deep-page reduction |
| COST-036 | `onboarding-views.service.ts:370-416` | Reloads all document versions on each mutation. | Latest-state window/distinct query or projection. | High historical-read reduction |
| COST-037 | Org chart, skills, probation services | Full/hard-capped lists load thousands then truncate. | Cursor search/lazy views. | Lower payload/memory |
| COST-038 | Employee cache invalidation paths | Onboard/update/termination do not invalidate all employee/directory projections. | Explicit mutation-to-key matrix/versioned namespace. | Correctness first; fewer forced refreshes |
| COST-039 | Skills/directory large ID materialization | 2,000-5,000 ID arrays and wildcard search. | Direct join, cursor, query-matched search index. | High memory/CPU reduction |
| COST-060 | `export-employees.ts:8-38` | Browser makes up to 50 sequential calls and silently caps 5,000 rows. | Audited queued server export. | Major network/UX saving |
| COST-061 | HR hub components | >=16 distinct initial feature requests. | Screen-shaped composed endpoint. | Major latency/connection reduction |
| COST-062 | Documents landing components | Several lists and fixed 100-row inputs; client aggregates. | Composed summary and async selectors. | High payload/query reduction |
| COST-063 | Full org chart | One request transfers/render entire workforce. | Lazy hierarchy and background export. | Major payload/DOM reduction |
| COST-064 | Ungated hooks from SEC-065 | Predictable unauthorized API/DB calls. | Permission-gated query enablement. | Eliminates useless 403 work |
| COST-065 | Hierarchy first-100 option loads | Repeated incomplete option queries. | Fetch on open/search with cursor. | Lower read and correct selection |

## Dead code

| ID | Path/candidate | Evidence | Decision |
|---|---|---|---|
| DEAD-001 | Duplicate `/hr/org` team/location writes | Both `hr-org-catalog.controller.ts` and canonical hierarchy have active frontend/service consumers. Knip reported no unused production files/exports/types. | **Not dead; do not delete.** Consolidation requires a consumer/deprecation plan. |
| DEAD-002 | Duplicate holiday and device table families | Both families have runtime service consumers. | **Not dead; do not delete.** Treat as expand-contract consolidation candidates. |

No table, column, endpoint or component is approved for deletion in Phase 0.

## Route - sidebar - persona matrix

`C` means explicit permission plus object/data scope. `Admin` means organization/module administration. Detail/editor routes are intentionally not standalone sidebar entries.

| Routes | Sidebar | HR admin | Manager | Employee | Finance | Recruiter |
|---|---|---:|---:|---:|---:|---:|
| `/hr/employees`, find-expert, skills-matrix, org-chart | Parent/children | Yes | C | No | C | C |
| `/hr/employees/[id]` | Detail | Yes | C | No | C | C |
| `/hr/positions` | Child | C | No | No | No | C |
| `/hr/onboarding`, detail, probation | Parent/detail | Yes | C | No | No | C |
| `/hr/onboarding/my-tasks` | Child | No | No | Move to `/me/*` | No | No |
| `/hr/org` | Child | Yes | C | No | No | No |
| Attendance admin routes (attendance/shifts/rosters/overtime/geofence/biometric/devices) | Parent/children | Yes | C | No | No | No |
| `/hr/work-logs` | Child | Yes | C | Move self flow to `/me/*` | No | No |
| Leave admin routes | Parent/children | Yes | C | Move self flow to `/me/*` | No | No |
| Documents/review/types | Parent/children | Yes | C | No | No | C |
| Document editor/template routes | Detail | Yes | C | No | No | C |
| `/me/attendance`, `/me/time-off`, `/me/documents` | Home | Yes | Yes | Yes | Yes | Yes |
| `/directory`, person detail | Home/detail | Yes | C | C | C | Yes |
| `/directory/workers` | Home | Yes | C | No | C | Yes |
| `/settings/directory`, detail | Settings/detail | Admin | No | No | No | No |
| `/settings/organization/*` | Settings | Admin | No | No | No | No |

Navigation is centralized through `frontend/components/layout/sidebar/sidebar-nav-items.ts:2441-2515` and reused by desktop, mobile, product switcher and command palette. That is architecturally correct; the central permission/entitlement rules are not.

## Prioritized fix order

1. Close immediate cross-tenant/global-account risks: SEC-030, SEC-036, SEC-037, SEC-045.
2. Define one AccessService DataScope repository boundary for every employee/attendance/document/leave object: SEC-031, SEC-033, SEC-035, SEC-038, SEC-040, SEC-043.
3. Designate the canonical workforce subject and reconcile SCH-001 before ordinary schema cleanup.
4. Split sensitive DTO/storage and make audit durable: SEC-002, SEC-003, SEC-005, SEC-032, SEC-039, SEC-046, SEC-060.
5. Preflight and add composite tenant paths/FKs: SCH-002, SEC-001, SEC-006, SEC-034.
6. Make leave ledger authoritative/idempotent, but only after classifying the five live discrepancies: SCH-003, SCH-004, API-006.
7. Introduce append-only attendance events/open-session uniqueness and transactional regularization: SCH-005, API-004, API-005.
8. Consolidate the duplicate org write path and make dependency archive atomic: UI-002, SEC-041, API-015.
9. Correct module/route/nav/query/action permissions and tenant-scoped client cache: SEC-042, SEC-061 through SEC-066, UI-001, UI-009, UI-013, UI-014.
10. Add effective dating, versioning, temporal corrections and missing uniqueness: SCH-007 through SCH-011.
11. Replace offset/unbounded/chatty/read-all paths and queued exports: API-001, API-014, API-016, COST-030 through COST-065.
12. Only after consumer proof, normalize relational JSON and consolidate duplicate holiday/device models; delete nothing merely because it looks duplicated.

## Worse than expected / changes to the plan

1. **Triple employee model is active, not residual.** Payroll reads both current families. Phase 1 must start with a canonical-subject decision and discrepancy contract, not isolated table cleanup.
2. **Global account state is still changed by tenant employment workflows.** This is incompatible with multi-tenant employment and is an immediate security/correctness priority.
3. **A GET has a cross-tenant write side effect.** It can read an arbitrary global user and create tenant records; this should be fixed before broad refactoring.
4. **All five live leave balances lack matching ledger history.** The ledger cannot simply replace the counter without approved opening-balance classification/backfill.
5. **Frontend hiding is masking server over-disclosure.** Sensitive data is already serialized; a UI-only fix cannot close it.
6. **The live DB is too small for the requested scale baseline.** Before Phase 1 performance/index claims, use an anonymized production-size fixture or generated representative dataset in a disposable branch/read replica.
7. **Payroll output is explicitly untrusted.** When Payroll begins, statutory rules and salary structure arithmetic must be verified before any golden baseline; no silent figure changes.

## Phase 0 artifacts and change log

| Artifact | Purpose | Findings closed |
|---|---|---|
| This audit | Evidence-backed current-state report and prioritization | Phase 0 reporting only; no product finding is closed |
| DB inventory plus linked column/index appendices | Full table/column/index/RLS/count/size baseline | Inventory deliverable only |
| Index inventory appendix | Full live index/size/scan/definition baseline | Inventory deliverable only |
| Code inventory appendix | Full screened controller/service/route/component/hook/test catalog | Inventory deliverable only |
| `REFACTOR-STATE.md` | Resume point and gates | Process-state deliverable only |

No migration, rollback, backfill or deploy-order script exists in Phase 0 because schema implementation is not authorized. Phase 1 must propose all four and stop for approval before applying them.

## Approval requested

Approve this Phase 0 audit to begin **Phase 1 design only** for HRMS core. The next deliverable will:

- compare canonical workforce-subject options and recommend one;
- present the target schema and relationship boundaries;
- provide production-safe expand-contract migrations, backfills, validation/rollback and deploy order;
- classify the live triple-model and leave-ledger discrepancies without changing data;
- stop again for approval before any schema or production mutation.
