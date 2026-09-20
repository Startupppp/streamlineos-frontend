# HRM-07 — API, Database, Cache, and Performance PRD

> Acceptance reference only. Dispatch and status live in [README.md](./README.md).

## Outcome

Every HRMS read and write is necessary, projected, indexed, bounded, authorized
at the data layer, and backed by an explicit cache writer/invalidation matrix.
Slow lists and stale dashboards are treated as defects.

## Ownership Boundary

Owns query shape, indexes, pagination caps, cache keys, invalidation, and N+1
elimination for HRMS-scoped APIs. Filter semantics are HRM-04. Architecture
dual-model decisions are HRM-08.

## Current Source Findings

- `boundHrReadLimit` / `DEFAULT_HR_READ_LIMIT = 100` and
  `hr-unbounded-read-batch-s02.spec.ts` already track many caps.
- Violations: `GET /hr/directory` `.limit(1000)`; team leaves `TEAM_LEAVES_CAP =
  500`.
- Cache: `hr:employees:list:{orgId}` invalidated on onboard; `hr:directory`
  versioned cache has **no invalidate found**; dashboard diversity / time-to-fill
  / attendance-analytics keys missing from shared invalidate helpers.
- Terminate/onboard invalidate only a subset (analytics, metrics, headcount,
  celebrations).
- Leave team queries use wide `with:` relations.
- ~147 GETs without nearby `@Validate` (list hygiene).
- SQL-managed attendance/leave ledger tables in `hrms-phase1-sql-managed.ts`
  must not be knip-deleted.

## Read Performance Rules

1. Every list: `org_id` leading predicate + permission scope compose.
2. Select only columns the contract returns — no `SELECT *`, no unprojected
   global `users`.
3. Cap ≤ 100; keyset cursor; stable sort tie-breaker on primary key.
4. Collapse N+1 into join or `IN` batch.
5. Aggregations for dashboards use SQL aggregates, not load-all-then-count.
6. Search uses indexed columns / trigram only where migration exists; otherwise
   prefix search on normalized columns.
7. Delete queries whose results nothing reads.

## Priority API Remediation Backlog

### P0 — correctness / stale data / unbounded reads

- [ ] **HRM-07-001** Cap `GET /hr/directory` to ≤100 + cursor; add query Zod;
  invalidate `hr:directory` on membership and org structure changes.
- [ ] **HRM-07-002** Lower team leaves cap to 100; add cursor + status/date/type
  filters; narrow `with:` projections.
- [ ] **HRM-07-003** Implement `invalidateHrOrgCaches(orgId)` covering employees
  list, directory, celebrations, analytics, all dashboard metric keys, leave
  analytics namespace.
- [ ] **HRM-07-004** Move all HR dashboard cache key strings into `CACHE_KEYS`.
- [ ] **HRM-07-005** Onboard, bulk onboard, terminate, leave decision, **WFH
  approve/reject**, hire transfer all call the shared invalidator.
- [ ] **HRM-07-006** Audit dashboard metrics for DataScope vs intentional
  org-wide `hr:analytics:read`.

### P1 — contract / filter / validate

- [ ] **HRM-07-007** Add query Validate to leave types, balance, this-week,
  celebrations, anniversary-feed, org catalog lists, benefits windows.
- [ ] **HRM-07-008** Employee list: server filters managerId, locationId,
  employmentStatus, hiredAfter/Before, skillId with indexes.
- [ ] **HRM-07-009** Attendance team logs: consistent department + date range
  indexes.
- [ ] **HRM-07-010** Cases / helpdesk / documents / assets / expenses list
  endpoints: confirm projection + cursor + scope; fix any full-table scans.

### P2 — deeper performance

- [ ] **HRM-07-011** Explain-analyze employees search+dept on disposable DB with
  ≥10k people; add composite indexes as needed.
- [ ] **HRM-07-012** Skills-matrix and find-expert: bound reads; no unbounded
  skill join explosion.
- [ ] **HRM-07-013** Org chart: neighborhood query by parentId; forbid loading
  entire org in one response.
- [ ] **HRM-07-014** Continue S02 unbounded-read suite until zero intentional
  exceptions remain (document any remaining with owner).

## Cache Writer Matrix (required)

For each cache entry document:

| Field | Content |
|-------|---------|
| Resource | e.g. employees list page |
| Tenant | orgId |
| Actor / scope | scope hash or “org-wide analytics” |
| Response shaping | filters, cursor |
| Authority / version | permission version if used |
| TTL / cardinality | |
| Writers | services that set |
| Post-commit invalidation | exact keys/namespaces |
| Failure behavior | serve stale vs miss |
| Cross-tab | frontend query keys |

- [ ] **HRM-07-015** publish matrix rows for employees list, directory,
  dashboard metrics, leave analytics, celebrations.
- [ ] **HRM-07-016** frontend query keys mirror invalidation: mutations patch or
  invalidate the narrowest prefix; never blanket `hr` root.
- [ ] **HRM-07-017** tests: revoke access / change org / terminate employee →
  stale list cannot show the record after invalidation path.

## Frontend Data Hooks

- [ ] **HRM-07-018** each collection hook uses stable query keys including org,
  filters, cursor.
- [ ] **HRM-07-019** no duplicate HTTP for data another live query already
  returns (hub vs page).
- [ ] **HRM-07-020** exports use server export jobs for large sets — never
  client-download of all pages in a loop without a job.

## Schema / Index Checklist

- [ ] **HRM-07-021** verify composite indexes for employees (org_id, department,
  active), leave_requests (org_id, status, dates), attendance (org_id, date,
  employee), documents (org_id, type, status), cases (org_id, status, assignee).
- [ ] **HRM-07-022** document SQL-managed vs Drizzle tables; never delete
  `hrms-phase1-sql-managed` holding barrel via knip alone.
- [ ] **HRM-07-023** journaled migrations only in named disposable environments.

## Acceptance Checks

- [ ] **HRM-07-024** database proof for P0 endpoints under realistic volume.
- [ ] **HRM-07-025** unit/contract proof for invalidation helper coverage.
- [ ] **HRM-07-026** no new unbounded `findMany` without limit in HR modules
  (CI grep or suite).
