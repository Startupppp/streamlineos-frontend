# 07 — Directory and HRMS (PRD-C118 / PRD-C119) — second-pass audit

**Heads measured.** backend `45f8a2e99` (`release/code-10-10-v2`; moved from `2f37e1bb0` mid-audit —
every finding below re-verified at `45f8a2e99`), frontend `7469d2789` (`release/code-10-10-v2`).
Databases: `scratch_head_1010` (owner + `streamline_app` non-owner), `scratch_cold_1010`.

**Relationship to the prior report** (`reports/07-directory-hrms.md`, 283 lines). Its three closed
items were re-verified and all three still hold at head — see §1. This pass does **not** repeat its
`/me/*` impersonation sweep, its `@RequireModule` sweep or its cache-namespace scan. It pushes into
what its Status line marked NOT RUN: employee-lifecycle schema, bounded/indexed reads, async
import/export, TanStack keys, frontend states, folder cohesion, responsive accessibility, and
allow/deny E2E — the last of which I **did** run (363/363), see §4.

**READ-ONLY.** No repository file was edited. This report is the only write.

---

## 1. Prior report's closed items — re-verified at head

| claim | how re-verified | verdict |
|---|---|---|
| the two `@RequireModule("hr")` on `self:onboarding-tasks` routes are gone | `grep -n RequireModule src/modules/hr/onboarding/core/onboarding.controller.ts` → no match | **HOLDS** |
| `upsertRosterEntry` no longer 42P10s | `EXPLAIN INSERT … ON CONFLICT (org_id, roster_id, user_membership_id, date)` as `streamline_app` (`rolbypassrls=false`) on `scratch_head_1010` → `Conflict Arbiter Indexes: uniq_roster_entries_org_roster_membership_date`. The old 3-column target still errors 42P10 in the same session — the fix is the index, not a coincidence. | **HOLDS, measured** |
| 1052's objects are in both scratch catalogs | `pg_indexes` on `roster_entries`: `uniq_roster_entries_org_roster_membership_date` + `idx_roster_entries_org_user_membership_date` present in **both** head and cold; `pg_constraint`: `fk_roster_entries_user_actor` `convalidated=t` | **HOLDS** |
| journal entry for 1052 exists | `migrations/meta/_journal.json:4734` | **HOLDS** |
| the two dead cache bumps are still open (reported, not fixed) | `employee-onboarding.service.ts:433,434`; the only other mention of `hr:salary-bands` is a `cache.del` at `hr-salary-structures.service.ts:87`; `hr:dashboard:payroll-summary` has no reader anywhere | **STILL OPEN** |
| the ignored `departmentId` filters are still open | `hr-analytics-plus.service.ts:51-57` (leave-trends), `:84-89` (compliance-gaps) | **STILL OPEN — and there is a third the prior pass missed**, see F7 |

Gate re-runs at head, all EXIT=0: `check:cache-invalidation`, `check:module-gate`,
`check:module-entitlement`, `check:route-classification`, `check:conflict-targets`
(0 ratcheted), `check:migration-ledger`.

---

## 2. Corpus read — with numbers

### Backend (`src/modules/hr/` + `src/modules/directory/`)

| dimension | count | how |
|---|---|---|
| `.ts` files | **766** (540 non-spec, 226 spec) | recursive walk |
| `@Controller` decorators / controller files | **126 / 125** | AST-ish walk |
| HTTP handlers | **935** — GET 410 · POST 291 · PATCH 149 · DELETE 79 · PUT 6 | decorator scan |
| operations under `/hr` or `/directory` in `openapi.json` | **930** across **644** distinct paths (of 3,642 total operations) | `openapi.json` |
| HR schema files / tables | **69 files / 234 tables** | `pgTable(` scan |
| declared `index()` / `uniqueIndex()` / `foreignKey()` | **416 / 67 / 291** | same |
| declared HR tables **absent from the live catalog** | **16** | `comm -23` declared vs `pg_class` on `scratch_head_1010` (944 tables) |
| `.from(<table>)` read sites | **781**; **146** with no `.limit()`; **87** of those return rows | chain walk to statement end |
| org-only unbounded row reads (`.select()` chains) | **3** | aggregate-aware re-scan, ×3 passes |
| `db.query.*.findMany` sites | **94**; **1** org-only with no `limit` | brace-matched scan |
| joins | **328**; **169** with no org predicate *in the join condition* | chain walk |
| `db.transaction(` blocks / `withTenant(` blocks | **71 / 3** | brace-matched |
| …of which hold a provider-shaped call (mail/storage/AI/dispatch/fetch) | **0** | pattern scan inside the block |
| `applyScope()` sites | **41**, across 17 distinct owner columns, every one a user column | grep + context |
| `@NoTenantTransaction()` in HR/directory | **0** | grep |
| self-service handlers (`/me`, `/mine`, or a `self:*` key) | **19**; 1 module-gated (correctly — `hr:workflows:view`, not a universal key), 1 `@Universal()` | decorator-aware sweep |
| HR/directory `*.e2e-spec.ts` | **9**, enumerating **326** route tuples | find + regex |

### Frontend (`frontend/`)

| dimension | count |
|---|---|
| route `page.tsx` under `hr/` + `directory/` | **138** (+ 96 `loading.tsx`, **47** `error.tsx` under `hr/`) |
| `features/hr` files | **581** (570 non-test); `features/directory` 19; `employee-onboarding` 18; `employee-self-service` 5 |
| `hooks/api/hr` files | **99** (90 non-test); `hooks/api/directory` 6 |
| hook functions carrying a `queryKey` | **263** across 98 files |
| HR query-key registry | `lib/query-keys/human-resources.ts` 473 lines, 229 key entries |
| components consuming query state | **332** — 332 with a loading branch, **290** with an explicit error branch |
| shared-primitive use in HR | `EmptyState` 176 files · `DataTable` 72 files · raw `<table>` **1** |
| a11y test files repo-wide | **23** — **0** covering HR / Directory / Me / self-service |
| HR test files (`features/hr` + `hooks/api/hr`) | **20** |

### Commands run (literal, with exit codes)

| command | exit | number |
|---|---|---|
| `pnpm check:unbounded-reads` | 0 | 2301 service files / 74 modules; 750 unbounded found; **ACTIONABLE 3** |
| `pnpm check:hr-pagination` | 0 | 194 HR service files; 35 known violations vs baseline 60 |
| `pnpm check:tenant-indexes` | 0 | 347 schema files, **840/840** tenant tables lead with the tenant column |
| `pnpm check:tenant-relationships` (owner URL) | 0 | 214 single-col FKs, **0 actionable** |
| `pnpm check:declaration-column-drift` (owner URL) | 0 | 873 declared tables / 10,611 columns; `declared-but-absent tables 0` ← see **F8** |
| `pnpm check:scope-application` | 0 | 150 scope resolutions, **150** applied |
| `pnpm check:record-access` | 0 | 591 record reads, 1 named purge skip |
| `pnpm check:idempotent-commands` | 0 | every in-scope mutating handler carries `@Idempotent` |
| `pnpm check:n1-growing-loops:list` | 0 | 97 growing sites / 73 files (ratchet 102); **7 in HR** |
| `pnpm check:tenant-isolation` | 0 | 931/931 tenant-owned services have a declared isolation test (static only) |
| `pnpm check:vacuous-assertions` | 0 | 1997 spec files, 15,333 callbacks, 57,849 `expect()` |
| `pnpm check:hr-table-freeze` | 0 | 234/234 HR tables approved |
| `pnpm check:file-sizes` (backend) | **1** | red for `src/scripts/check-referential-action-drift.ts` — **not HR** (cross-territory, same file the prior report flagged) |
| FE `check:query-scope` / `check:query-signal` | 0 / 0 | 5360 files / 1056 queryFn blocks across 426 files — 0 violations |
| FE `check:permission-binding` | 0 | **2384** bindings checked; 0 unaccounted |
| FE `check:route-access-contract` | 0 | 204 permission keys, 633 `x-permission` entries |
| FE `check:empty-states` / `check:icon-labels` | 0 / 0 | 3854 files each |
| FE `check:file-sizes` / `check:over-300` | 0 / 0 | 5351 files ≤500 lines; 515/5346 over 300 (baseline 516) |
| `jest --runInBand --testPathPattern="modules/(directory\|hr/(import\|payroll-inputs\|directory\|core))/"` | 0 | **63 suites / 403 tests, all pass** |
| `jest --config jest-e2e.json` on the 9 HR/directory e2e specs, with a minted `AUTH_SIGNING_KEYS` | 0 | **9 suites / 363 tests, all pass** |
| FE `jest` on the 3 shared a11y primitives | 0 | 3 suites / 56 tests pass |

---

## 3. PRD-C118 — Directory / Me, dimension by dimension

> *"Reconstruct current-head Directory/Me evidence across canonical ownership,
> self-versus-administrative authorization, tenant-scoped schema and indexes, bounded search/list
> projections, privacy-safe caching, TanStack keys, responsive accessibility and
> allow/deny/cross-tenant E2E."*

**Status: PARTIALLY MET.** Six of eight dimensions are met or near-met; two carry findings.

**1. Canonical ownership — MET.** There is one canonical person spine and every hop is
tenant-composite, verified against `pg_constraint` on `scratch_head_1010`:

```
organization_people(organization_id, organization_person_id)      ← canonical person
  ↖ hr_people(org_id, organization_person_id)          fk_hr_people_org_person   ON DELETE RESTRICT
      ↖ hr_employments(org_id, person_id)              fk_hr_employments_org_person  CASCADE
  ↖ workers(organization_id, organization_person_id)   fk_workers_org_person     RESTRICT
      ↖ worker_engagements(organization_id, worker_id) fk_worker_engagements_org_worker  CASCADE
```

`src/modules/directory/person-seam.ts` resolves a `PersonSubject` through exactly three named paths
(`membership` / `payee-worker` / `person-record`) and returns a single `ResolvedPerson`. This is a
replacement seam, not a parallel model. **But the uniqueness invariants that make the spine
single-valued are missing on the `hr_people` / `hr_employments` legs — see F2, which I reproduced
against the live catalog.**

**2. Self-versus-administrative authorization — MET** (closed by the prior report; re-swept here).
19 self-service handlers in HR/directory at head; exactly one carries a module gate
(`GET /hr/workflows/delegations/mine`, `@RequireModule("hr")` + `@RequirePermission("hr:workflows:view")`)
and that pairing is coherent — `hr:workflows:view` is not in `UNIVERSAL_MEMBER_PERMISSION_GRANTS`
(`src/modules/rbac/permissions/role-defaults.ts:3-9`), so the gate is not doing the work a universal
key would have made inert. The two defects the prior pass fixed have not regressed.

**3. Tenant-scoped schema and indexes — MET, with one gate-reach caveat.**
`check:tenant-indexes` compares 840 tenant tables and finds a leading tenant-column index on 840.
`check:tenant-relationships` against the live catalog finds 0 actionable single-column tenant FKs
out of 214. Zero `@NoTenantTransaction()` in HR/directory means every HR handler runs inside
`withTenant`, so the **169 joins that carry no org predicate in the join condition** are backstopped
by RLS (`relrowsecurity = t` confirmed on `attendance`, `hr_people`, `hr_employments`,
`organization_members`, `org_units`, `org_unit_members`, `organization_people`, `workers`,
`worker_engagements`, `leave_requests`, `onboarding_documents`, `hr_import_*`, `hr_export_jobs`).
`users` is the one RLS-**disabled** table these joins touch; I walked all **25** `from(users)` sites
in HR/directory and every one of the 13 lacking an org predicate is bounded by an id set that came
from an org-scoped read or is the actor's own id — **no leak found**. Caveat: **F8**, 16 declared HR
tables the drift gates never compare.

**4. Bounded search / list projections — MET.** `GET /hr/employees` is keyset-paginated
(`limit + 1`, cursor `(lower(name), users.id)`, `employee-list-cursor.ts`) with a projected select —
no `SELECT *`. Search is bounded twice over: `app.search_hr_person_ids(q, cap+1)` is a
`STABLE SECURITY DEFINER` SQL function pinned to `hp.org_id = app.current_org_id()` with
`SET search_path` — it fails closed when no tenant context is set — and above `EMPLOYEE_SEARCH_CAP`
the service falls back to org-scoped `ILIKE`s. Trigram GIN indexes back that fallback
(`idx_users_name_trgm`, `idx_users_email_trgm`, `idx_users_first_name_trgm`, and four on
`organization_people`). One gap: `users.last_name` is ILIKE'd in the fallback with **no** trgm index
(F13). Only **3** org-only unbounded `.select()` reads and **1** org-only unbounded `findMany`
remain in the whole 875-site read corpus.
**NOT MEASURED: read cost.** Both scratch DBs hold 0 rows in `organization_members`, `users`,
`attendance`, `hr_people`, `hr_employments`, `leave_requests`, so `EXPLAIN (ANALYZE, BUFFERS)`
produces no usable plan. The measurement that would close this is
`pnpm db:check-hr-reads` (`src/scripts/check-hr-list-read-cost.mjs`) against a seeded tenant.

**5. Privacy-safe caching — MET.** `EmployeesService.listEmployees` keys on
`hrEmployeesListNamespace(orgId)` + `cursor:${userId}:${scope}:${cursor}:${limit}:${search}:${departmentId}:${isActive}:${role}`
(`employees.service.ts:69`) — org, actor, DataScope and every filter are all in the key. The prior
report's 46-site scan stands.

**6. TanStack keys — MET.** Tenant isolation is structural, not per-hook: the app's single
`QueryClient` sets `queryKeyHashFn: scopedQueryKeyHashFn(authenticatedScope(orgId, userId))`
(`lib/query-scope.ts`), so every key is hashed under `authenticated:<org>:<user>` and the provider
remounts on `key={scope}`. `check:query-scope` (5360 files) finds no `new QueryClient()` or
`queryKeyHashFn` outside the three sanctioned factories and no inline key literal bypassing the
factory. I then diffed all **263** HR/directory hook functions carrying a `queryKey` against the
arguments their `queryFn` sends: **no key omits a filter dimension its request carries.** One
cosmetic collision: `queryKeys.hr.leaveCalendar(month ?? 0, year ?? 0)`
(`hooks/api/hr/dashboard.ts`) maps `undefined` and `0` to the same key — neither is a valid month or
year in this API, so it cannot collide in practice.

**7. Responsive accessibility — PARTIALLY MET.** The shared primitives are sound and HR uses them:
176 HR files render `EmptyState`, 72 use `DataTable`, exactly **one** hand-rolls a `<table>`, zero
raw `<table>` outside it, and `check:icon-labels` (3854 files) finds no icon-only button without an
accessible name. `components/ui/sheet.tsx` defaults to `w-full max-w-full` at mobile. The three
shared a11y suites pass (56 tests). **But: of 23 a11y test files in the repo, none covers HR,
Directory, Me or employee self-service** — the largest feature area in the app (570 non-test files,
138 route pages) has zero a11y coverage while payroll, settings, mail, calendar, build,
notifications, support-inbox, org-RBAC and modules each have one. Two concrete defects: F14, F15.
**NOT MEASURED: viewport rendering.** No browser was driven; F15 is a CSS-cascade reading, not a
rendered measurement.

**8. Allow/deny/cross-tenant E2E — PARTIALLY MET; allow/deny MEASURED HERE.**
I ran all 9 HR/directory e2e suites at head: **363/363 tests pass, 9 suites, exit 0.** They needed
`AUTH_SIGNING_KEYS`, which is absent from `.env` (`test/helpers/sign-token.ts:44` throws
`"AUTH_SIGNING_KEYS must be set for e2e tests — the guard no longer accepts HS256"`); I minted a
throwaway Ed25519 JWK for the run — see §6.
What that proves and does not:
- **Proves ALLOW/DENY at the guard chain.** 326 route tuples get a 401-without-token assertion
  (≈35% of the 930 HR/directory operations in the contract), plus 17 hand-written 403 assertions
  and one 402.
- **Does not prove cross-tenant isolation.** `test/helpers/e2e-app.ts:33-40` states the design
  outright: the guards' three collaborators are doubled and *no database is used*, because every
  401/402/403 is thrown before the handler. No row ever exists, so no cross-tenant read is exercised.
- The spec that carries the cross-tenant name, `src/modules/hr/hr-cross-tenant-404.spec.ts`,
  **cannot detect a dropped tenant predicate** — see F10.

---

## 4. PRD-C119 — HRMS, dimension by dimension

> *"Reconstruct current-head HRMS evidence across employee lifecycle schema, tenant-composite
> integrity, module/record/DataScope authorization, bounded indexed queries, async imports/exports,
> cache invalidation, frontend states, folder cohesion and representative HR workflows."*

**Status: PARTIALLY MET.** Five dimensions met, four carry findings.

**1. Employee lifecycle schema — PARTIALLY MET.** 234 HR tables, all approved by
`check:hr-table-freeze`. The lifecycle spine (`hr_people` → `hr_employments` → `terminations` /
`resignations` / `hr_probation_reviews` / `onboarding_*`) is composite-FK'd throughout, and
`hr_employments` carries `uniq_hr_employments_org_emp_num`, `uniq_hr_employments_org_id` and
`uniq_hr_employments_org_id_person`. **Two invariants are missing and both are reachable** — F2.
Sixteen declared tables are not in the catalog and not in the schema barrel — F8.

**2. Tenant-composite integrity — MET** (advanced by the prior report on `roster_entries`; the FK/
index/unique triple is present and validated in both scratch DBs). One residual: `leave_balances`'
natural key `uniq_leave_balances_user_type_year (user_id, leave_type_id, year)` omits `org_id`
(F12). It is not a leak — `leave_type_id` is an org-scoped serial, so two orgs cannot produce the
same tuple — but it is the one HR natural key that does not lead with the tenant column, and
`hr-import-commit.service.ts:182` upserts against it.

**3. Module / record / DataScope authorization — MET.** `check:scope-application` resolves 150
DataScopes and finds a predicate for all 150. All **41** `applyScope()` sites in HR/directory name a
user-owning column. `check:record-access` confirms all 591 record reads exclude soft-deleted rows,
with one named purge exception outside HR. `check:module-gate`, `check:module-entitlement` and
`check:route-classification` all EXIT=0. Frontend: `check:permission-binding` checks **2384**
bindings with 0 unaccounted; the only HR-touching divergences are two documented accounting hooks
reading `GET /hr/expenses/page-data`, already reasoned in the gate's own allowlist.

**4. Bounded indexed queries — NOT MET.** See F9: the gate that certifies this reports
`unbounded reads: ACTIONABLE 3` and exits 0 **while 77 HR files carry a passing verdict whose own
note says they still need keyset migration.** `check:hr-pagination` cannot help — it only detects
offset pagination and hard-coded limits in the 101-500 range (`check-hr-pagination-gate.mjs:31-39`);
a **missing** `.limit()` is outside its detector entirely, and it still sits at 35 known violations
against a baseline of 60.

**5. Async imports/exports — SPLIT: export MET, import NOT MET.**
*Export is well built.* `HrExportWorkerService` polls per-org through `forEachOrg` with a rotating
claim cursor and `CLAIM_LIMIT = 2`; `HrExportFileService.generate` streams keyset batches to a
`0o600` temp file, applies `applyScope` inside each per-batch `withTenant`, and — critically —
performs `storage.uploadFileStream` **outside** any transaction, then unlinks in `finally`. Job
completion, audit and artifact deletion are each their own tenant transaction. Zero provider calls
inside any of HR's 71 `db.transaction` blocks or 3 `withTenant` blocks.
*Import is not async at all.* `POST /hr/import/jobs/:jobId/commit` runs the whole job synchronously
inside **one** `this.db.transaction` with 2–3 round trips per row and no total-row cap
(`hr-import.service.ts:178-213`) — 2 of HR's 7 growing-loop sites. Worse, its per-row error handler
cannot run — F3, reproduced. And `commitAttendance`'s duplicate guard is dead — F5.

**6. Cache invalidation — PARTIALLY MET.** `check:cache-invalidation` EXIT=0. The two dead bumps and
the unreached `getAnniversaryFeed` cache from the prior report are all still present at head (F11,
F16), and there is a **third** silently-ignored `departmentId` (F7).

**7. Frontend states — MET.** This is the codebase's strongest HR answer. `lib/query-error-policy.ts`
makes `throwOnError: readErrorReachesBoundary` the default for every read, so a failed read holding
no data reaches the route error boundary instead of rendering as `?? []`. **Zero** HR/directory
hooks opt out via `INLINE_READ_ERROR` or `throwOnError: false`. 47 `error.tsx` files sit under
`app/(authenticated)/hr/`, one of them at the `hr/` segment root, with `(authenticated)/error.tsx`
above them; 96 `loading.tsx`. The 42 HR components that render a loading branch with no error branch
are therefore **not** the "500 looks like no data" shape — the boundary catches them.
`check:empty-states` finds no hand-rolled empty state in 3854 files.

**8. Folder cohesion — MET.** Backend: the largest HR/directory non-spec file is 499 lines
(`hr-calendar-source.ts`); **no HR file breaches the 500-line ceiling**; 69 exceed 300.
Frontend: `check:file-sizes` passes with 5351 files all ≤500 and **zero registered exceptions**;
the largest HR file is 488 lines. The backend `check:file-sizes` red is a stale line count on
`src/scripts/check-referential-action-drift.ts` — cross-territory, unchanged from the prior report.

**9. Representative HR workflows — PARTIALLY MET.** 63 targeted unit suites / 403 tests and 9 e2e
suites / 363 tests all pass at head. But none of them exercises the three defects below: no spec
touches `PayrollInputsBuildService`'s money arithmetic (F1 — and F17 explains why the spec that
names it cannot), none asserts one-primary-employment (F2), none asserts attendance day-vs-session
semantics (F4). **NOT RUN: a seeded workflow E2E.** `pnpm test:e2e:seeded`
(`jest-e2e-seeded.json`, 12 GB heap) is what would exercise hire → onboard → attendance → leave →
exit against real rows; it is outside the laptop budget for this wave.

---

## 5. Findings

| # | sev | file:line | summary |
|---|---|---|---|
| F1 | **P0** | `streamlineos-backend/src/modules/hr/payroll-inputs/payroll-inputs-build.service.ts:360` | Payroll input snapshot sums rupees and cents into one `totalAmount` |
| F2 | **P1** | `streamlineos-backend/src/modules/hr/core/hr-employments.service.ts:205` | No "one live primary employment per person" / "one live person per user" index; the directory join fans out |
| F3 | **P1** | `streamlineos-backend/src/modules/hr/import/hr-import.service.ts:204` | Per-row error handler runs on an aborted transaction → 500 and total rollback |
| F4 | **P1** | `streamlineos-backend/src/modules/hr/lifecycle/hr-dashboard-attendance.ts:152` | Attendance rate counts sessions, not days; can exceed 100% and zeroes absenteeism |
| F5 | **P1** | `streamlineos-backend/src/modules/hr/import/hr-import-commit.service.ts:222` | `onConflictDoNothing()` has no reachable arbiter → attendance re-import silently duplicates |
| F6 | **P1** | `streamlineos-backend/src/modules/hr/payroll-inputs/payroll-inputs-build.service.ts:58` | Payroll input build caps members at 1000 with no paging and no signal |
| F7 | **P1** | `streamlineos-backend/src/modules/hr/analytics-plus/hr-analytics-plus.service.ts:95` | A third `departmentId` filter is accepted, cached on, and discarded (`getDrilldown`) |
| F8 | P2 | `streamlineos-backend/src/db/schema/hr/index.ts:1` | 16 declared HR tables are outside the schema barrel; drift gates report `declared-but-absent 0` |
| F9 | P2 | `streamlineos-backend/src/scripts/baselines/unbounded-reads-classification.json:1` | 77 HR files hold a passing verdict whose own note says they are unmigrated |
| F10 | P2 | `streamlineos-backend/src/modules/hr/hr-cross-tenant-404.spec.ts:16` | The cross-tenant spec never inspects the `where()` argument |
| F11 | P2 | `streamlineos-backend/src/modules/hr/directory/employee-onboarding.service.ts:433` | Two cache invalidations pin namespaces nothing reads (carried from the prior report) |
| F12 | P2 | `streamlineos-backend/src/modules/hr/import/hr-import-commit.service.ts:182` | `leave_balances` upsert arbiter is the one HR natural key that omits `org_id` |
| F13 | P2 | `streamlineos-backend/src/modules/hr/directory/employees.service.ts:329` | Search fallback ILIKEs `users.last_name`, the one name column with no trigram index |
| F14 | P2 | `streamlineos-frontend/frontend/features/hr/employees/skills-matrix-page.tsx:138` | Skills matrix table: no `scope`, truncated headers, `title`-only cell labels |
| F15 | P2 | `streamlineos-frontend/frontend/features/hr/feedback/cycles-tab.tsx:229` | 4 HR sheets set an unconditional `w-[NNNpx]`; `sm:max-w-sm` clamps them to 384px |
| F16 | P2 | `streamlineos-backend/src/modules/hr/directory/celebrations.service.ts:47` | `getAnniversaryFeed` cache is reached by no invalidation (carried from the prior report) |
| F17 | P2 | `streamlineos-backend/src/modules/hr/payroll-inputs/__tests__/payroll-inputs.spec.ts:329` | The spec re-implements the helpers under test locally; the money path is untested |

### F1 — P0 — rupees added to cents in the payroll input snapshot

`src/modules/hr/payroll-inputs/payroll-inputs-build.service.ts:360-362`:

```ts
totalAmount:
  reimbs.reduce((sum, r) => sum + parseFloat(r.amount ?? "0"), 0) +   // reimbursements.amount :: numeric  → RUPEES
  benefitClaims.reduce((sum, c) => sum + c.amountCents, 0),           // hr_insurance_claims.amount_cents :: integer → CENTS
```

Units verified against the live catalog on `scratch_head_1010`:
`reimbursements.amount :: numeric`, `hr_insurance_claims.amount_cents :: integer`
(declared `integer("amount_cents").notNull()` at `src/db/schema/hr/benefits.ts:203,247`).

Line **353** compounds it: `amount: String(c.amountCents)` puts a cents value into the `amount`
field of the same `items[]` array whose reimbursement entries carry rupee strings, so a consumer
summing `items[].amount` reproduces the error independently.

**Failure scenario.** An employee has one approved reimbursement of ₹500.00 and one approved
insurance claim of ₹300.00 (`amount_cents = 30000`). `totalAmount` computes `500 + 30000 = 30500`.
The correct value is `800` (rupees) or `80000` (cents). The claim leg is inflated 100×; the row is
inflated ~38×. This is not a display value — `buildSnapshot("reimbursement", reimbursementPayload, …)`
at `:415` persists it into `hr_payroll_input_snapshots`, the frozen input a payroll run consumes.
The `deduction` payload two lines down does it correctly, keeping `totalMonthlyEmi` (rupees) and
`totalRepaymentCents` (cents) in separately named fields — so the convention exists and this one
site violates it.

**Proposed fix.** Normalise to minor units at the boundary and rename the field:
`totalAmountCents = reimbs.reduce((s, r) => s + Math.round(parseFloat(r.amount ?? "0") * 100), 0) +
benefitClaims.reduce((s, c) => s + c.amountCents, 0)`, and emit each item's amount as
`amountCents` so the array is single-unit. Add a spec that builds one reimbursement and one claim
and asserts the total — see F17 for why the existing spec would not have caught this.

### F2 — P1 — the directory join can return one employee three times

Two invariants the canonical spine relies on are not enforced by any index:

- `hr_people` has `uniq_hr_people_org_person_link (org_id, organization_person_id) WHERE
  organization_person_id IS NOT NULL` — and `organization_person_id` **is nullable**
  (`information_schema.columns`), so two live rows for the same `(org_id, user_id)` are permitted.
  There is no `(org_id, user_id)` unique index.
- `hr_employments` has **no** partial unique on `(org_id, person_id) WHERE is_primary AND deleted_at
  IS NULL`, while `is_primary` **defaults to `true`** (`column_default = true`). The canonical twin
  `worker_engagements` *does* carry `uniq_worker_engagements_active_primary (organization_id,
  worker_id) WHERE is_primary = true AND status = 'ACTIVE'` — the invariant is intended, just
  unenforced on the legacy leg.

**Reproduced**, owner role, `scratch_head_1010`, inside a rolled-back transaction:

```
PROBE1 duplicate hr_people rows for one user:              2
PROBE2 duplicate live PRIMARY employments for one person:  2
PROBE3 directory rows returned for ONE member:             3
```

PROBE3 is the exact join shape of `GET /hr/employees`
(`organization_members ⋈ users ⟕ hr_people[live, by user] ⟕ hr_employments[primary, live]`).

**Failure scenario, single request, no race needed.** `HrEmploymentsService.create`
(`hr-employments.service.ts:205-236`) checks uniqueness on `employeeNumber` only, and its
`.values({...})` **omits `isPrimary`**, so the column default makes it primary. `POST /hr/employments`
(`hr-employments.controller.ts:84`, `hr:employees:manage`) for a person who already has a primary
employment, with a fresh employee number, produces two live primaries. `GET /hr/employees` then
returns that employee twice (`employees.service.ts:150-178` — no `DISTINCT`, no `groupBy`), the
keyset cursor `(lower(name), users.id)` sees a duplicated tuple so the page is short by one real
employee, and every `count()`-based headcount is +1. A concurrent race reaches the same state
through `person-employment-sync.service.ts:144-151`, whose check-then-insert has no lock.
`livePersonOfUser` / `primaryEmploymentOfPerson` are used at **138 call sites across 33 files**,
including `rbac/roles-query.service.ts`, `dashboard/*`, `gdpr/gdpr-rectification.service.ts` and
`users/organization-users.reader.ts` — the blast radius is repo-wide, not HR-local.

**Proposed fix.** Two partial unique indexes, both `org_id`-leading per backend CLAUDE.md §7:
`CREATE UNIQUE INDEX uniq_hr_employments_org_person_primary ON hr_employments (org_id, person_id)
WHERE is_primary AND deleted_at IS NULL;` and
`CREATE UNIQUE INDEX uniq_hr_people_org_user_live ON hr_people (org_id, user_id)
WHERE user_id IS NOT NULL AND deleted_at IS NULL;`
Both need a duplicate-detecting `DO` block that **refuses** rather than de-duplicates — choosing
which employment survives is an HR decision a migration must not make silently — following 1052's
precedent in the same folder.

### F3 — P1 — the import's per-row error handler cannot run

`src/modules/hr/import/hr-import.service.ts:195-208`, inside the single job-wide
`this.db.transaction` opened at `:178`:

```ts
try {
  const ref = await this.commitService.commitRow(tx, orgId, job.entity, row.payload);
  …
} catch (err) {
  await tx.update(hrImportRows).set({ status: "error", error: message }).where(eq(hrImportRows.id, row.id));
}
```

`commitRow` issues its statements on `tx` directly — there is no savepoint. When it fails with a
*SQL* error rather than a JS throw, Postgres puts the transaction in the aborted state and every
subsequent statement on it is rejected.

**Reproduced** on `scratch_head_1010`:

```
INSERT (duplicate)  → ERROR: duplicate key value violates unique constraint
UPDATE (the catch)  → ERROR: current transaction is aborted, commands ignored until end of transaction block
SELECT              → ERROR: current transaction is aborted, commands ignored until end of transaction block
```

**Failure scenario.** A 5,000-row employee import where row 4,900 trips a constraint or a check.
`commitRow` throws a driver error; the catch's `UPDATE` throws `25P02`; that escapes `commitAll`;
the transaction rolls back. `POST /hr/import/jobs/:jobId/commit` answers 500. **Zero rows are
committed and zero rows are marked errored**, so the operator sees a failed job with no per-row
diagnosis and no partial progress — after the server held one transaction open across ~15,000
round trips. (JS-thrown errors — `"No user found for email …"` — do not poison the transaction, so
the handler works for those; that is why this survives the suite.)

**Proposed fix.** Wrap each row in its own savepoint — `await tx.transaction(async (rowTx) => …)`,
which Drizzle emits as `SAVEPOINT` / `ROLLBACK TO SAVEPOINT` — and mark the error on the outer `tx`
after the rollback. Independently, move the commit off the request thread onto the same
`forEachOrg` + claim-cursor worker shape the export already uses, and cap total rows.

### F4 — P1 — attendance rate counts sessions, not days

`src/modules/hr/lifecycle/hr-dashboard-attendance.ts:150-153`:

```ts
const totalPresentLogs = Number(monthlyAttendance[0]?.count ?? 0);   // count() of attendance ROWS
const expectedLogs     = totalEmployees * workingDaysSoFar;
const attendancePct    = Math.round((totalPresentLogs / expectedLogs) * 100);
const absenteeismPct   = 100 - attendancePct;
```

`attendance` is a **session** table, not a day table. `AttendanceClockService.clockIn`
(`attendance-clock.service.ts:151-201`) explicitly permits re-clocking: it blocks only an *open*
session, applies a `minReclockInMinutes` cooldown against the latest *closed* session, then
`INSERT`s a **new row**. The catalog agrees — the only unique indexes on `attendance` are
`attendance_pkey (id)` and `uniq_attendance_org_id (org_id, id)`, both on a generated serial.

**Failure scenario.** An org whose employees clock out for lunch and back in produces 2 attendance
rows per person per day. Over a 20-working-day month with 50 employees, `totalPresentLogs = 2000`
against `expectedLogs = 1000` → `attendancePct = 200`. `absenteeismPct = 100 - 200 = -100`, which
`Math.max(0, …)` at `:160` silently reports as **0% absenteeism**. The same `count()` shape drives
`lateArrivals`, `overtimeInstances` and the per-department `presentCount` at `:130`, each compared
against a per-day `expectedCount: workingDaysSoFar`.

**Proposed fix.** Count distinct business days:
`countDistinct(sql\`(${attendance.userId}, ${attendance.date})\`)` — or an
`EXISTS`-per-(user, date) subquery — for every ratio that divides by `workingDaysSoFar`.

### F5 — P1 — the attendance import's duplicate guard is dead code

`src/modules/hr/import/hr-import-commit.service.ts:212-225` inserts into `attendance` with
`.onConflictDoNothing()` and then `if (!rec) throw new Error(\`Attendance for … already exists\`)`.
The insert never supplies `id`, and the only unique indexes on `attendance` are on that generated
serial (see F4) — **so no conflict can ever occur**, `rec` is always defined, and the duplicate
error is unreachable.

**Failure scenario.** An operator re-runs the same attendance CSV (a common correction workflow, and
the reason `POST /hr/import/jobs/:jobId/rollback` exists). Every row inserts a second time. The job
reports full success. Downstream, F4's `count()`-based attendance rate doubles for the affected
period, and `PayrollInputsBuildService`'s attendance summary sees each day twice.

**Proposed fix.** Decide the grain first. If attendance is genuinely sessioned, remove the
`onConflictDoNothing()` and the dead throw, and give the *import* an explicit idempotency key on
`hr_import_rows` so a re-run is a no-op. If an imported row is meant to be one day, add
`uniq_attendance_org_user_date (org_id, user_id, date) WHERE <import-sourced>` and target it — but
that constraint would break the clock path, so the first option is the likely one.

### F6 — P1 — payroll input build silently truncates at 1000 members

`payroll-inputs-build.service.ts:47-60` selects the org's active members with `.limit(1000)` and no
cursor, then `if (members.length === 0) return;` — there is no `=== 1000` check, no warning, and no
second page. Five sibling reads in the same function carry the same 1000-row cap.

**Failure scenario.** An org with 1,400 active employees runs the monthly payroll input build.
Snapshots are written for 1,000 of them; the other 400 get **no** `employee_master`, `compensation`,
`attendance`, `leave`, `overtime`, `reimbursement`, `deduction` or `lifecycle` row for the period.
Whether those 400 are missed is decided by whatever order Postgres returns without an `ORDER BY` —
so it can differ between runs of the same period.

**Proposed fix.** Page the member scan with the keyset the rest of HR uses, or at minimum add an
`ORDER BY` plus a hard failure when the page fills, so truncation is loud. This file lives in HR
(`src/modules/hr/payroll-inputs/`) but feeds payroll — ticket 08 should be told.

### F7 — P1 — a third `departmentId` filter is accepted and discarded

The prior report found two. There is a third, and it is worse because it is a paginated drilldown:

```ts
// hr-analytics-plus.service.ts:95
getDrilldown(orgId: string, metric: string, page: number, limit: number, _?: string) {
  return fetchDrilldownPage(this.db, orgId, metric, page, limit);   // the 5th arg is discarded
}
```

`hr-analytics-plus.controller.ts:113-124` passes `query.departmentId` into that `_`. The frontend
`useHrDrilldown` (`hooks/api/hr/analytics.ts`) sends `departmentId` **and** puts it in the query key,
so the client believes it is filtering. Full set at head — three routes, all accepting the
parameter, all keying the cache on it, none applying it:

| route | service | line |
|---|---|---|
| `GET /hr/analytics-plus/leave-trends` | `getLeaveTrends` | `:51` |
| `GET /hr/analytics-plus/compliance-gaps` | `getComplianceGaps` | `:84` |
| `GET /hr/analytics-plus/drilldown` | `getDrilldown` | `:95` |

**Failure scenario.** An HR manager filters the compliance-gaps drilldown to Engineering and gets
the whole org back, paginated — the page-1 rows may be entirely other departments. It over-returns
rather than crossing a permission boundary (these handlers apply no DataScope and serve org-wide
aggregates to everyone holding `hr:analytics:read`), so it is a correctness and trust defect, not a
leak. `getAttrition` at `:43` shows the correct shape one function above.

**Proposed fix.** Thread `departmentId` into `fetchLeaveTrends`, `fetchComplianceGaps` and
`fetchDrilldownPage` as a conditional `eq(hrEmployments.departmentId, …)`; or, if the joins cannot
support it, remove the parameter from the DTOs and the hooks so the contract stops promising it.

### F8 — P2 — 16 declared HR tables the drift gates never compare

`check:declaration-column-drift` prints `Declared tables 873 · declared-but-absent tables 0` and
exits 0. Its corpus is the schema barrel. Nine files under `src/db/schema/hr/` are **not exported
from `src/db/schema/hr/index.ts`**, so their 16 tables are in neither the gate's declared set nor
the catalog:

```
attendance_correction_links      attendance_daily_projections    attendance_event_evidence
attendance_event_locators        attendance_events               attendance_evidence_legal_holds
attendance_session_projections   hr_audit_event_sources          hr_audit_events
hr_employment_legacy_map         hr_person_legacy_map            hr_workforce_reconciliation_items
worker_leave_balance_projections worker_leave_entry_locators     worker_leave_ledger_entries
worker_leave_reversal_links
```

`comm -23` of the 234 declared HR tables against `pg_class` on `scratch_head_1010` (944 tables,
journal head 677/677).

**This is not currently an outage**, and I want to be precise about why: the one live consumer,
`AttendanceEventWriterService`, guards every use behind `isCompatibilityRelationAvailable` /
`areCompatibilityRelationsAvailable` (`src/common/db/expand-contract-compat.ts`) and its gating
table `hrms_migration_profiles` is *also* absent, so `prepareCommand` returns `null` at
`attendance-event-writer.service.ts:76` and the legacy path runs. It fails closed by design.

**Failure scenario if the state changes.** The moment `hrms_migration_profiles` lands and an org's
`attendance_write_mode` is set to `DUAL`, `requireCanonicalRelations` finds `attendance_events`
missing and every clock-in answers `503 HRMS_ATTENDANCE_CANONICAL_NOT_READY`. Nothing in CI would
have warned, because the gate that would — `check:declaration-column-drift` — cannot see these
tables at all.

**Proposed fix.** Either export the nine files from the HR barrel (making the drift gates compare
them and turn red until the migrations land), or move them to a clearly-named
`schema/hr/_pending/` folder and have the gate assert that folder's tables are *deliberately*
absent. Silence is the wrong third option.

### F9 — P2 — 77 HR files hold a passing verdict that contradicts their own note

`src/scripts/baselines/unbounded-reads-classification.json` — the `unbounded` category holds 581
entries. **80** carry the note
`"HR lane — deadline 2026-12-31; needs keyset migration paired with frontend caller"`, and **all 80
are HR/directory**. Their verdicts:

| verdict | count | meaning to the gate |
|---|---|---|
| `BOUNDED` | 76 | passes |
| `FALSE-POSITIVE` | 1 | passes |
| `ACTIONABLE` | 2 | counted |
| `AGGREGATE` | 1 | passes |

So **77 files are labelled with a verdict that means "not a problem" while the note attached to that
same verdict says the problem is real and scheduled.** `check:unbounded-reads` then prints
`unbounded reads: ACTIONABLE 3` and `OK — no gate violations`. A reader of the gate output has no
way to learn that 77 HR files are deferred debt.

The `FALSE-POSITIVE` one is demonstrably wrong. `/hr/recruitment/recruitment-candidate-ops.service.ts`
is classified `FALSE-POSITIVE` with that note, and at `:45`:

```ts
async bulkImport(orgId: string, input: BulkImportInput) {
  const existingCandidates = await this.db.query.candidates.findMany({
    where: eq(candidates.orgId, orgId),      // org-only, no limit, no cursor
    columns: { email: true },
  });
  const existingEmails = new Set(existingCandidates.map((c) => c.email.toLowerCase()));
```

**Failure scenario.** An agency tenant with 200,000 candidates uploads a 50-row CSV. The handler
reads all 200,000 emails into a JS `Set` on the request thread before touching a single input row.
This is the only org-only unbounded `findMany` in HR (of 94 `findMany` sites) and one of only 4
org-only unbounded reads total (3 `.select()` chains: `onboarding-views.service.ts:76`,
`attendance.service.ts:166`, `directory-identity.service.ts:250`).

**Proposed fix.** Two separate things. (a) Fix the read: probe the incoming emails with
`inArray(candidates.email, rows.map(r => r.email.toLowerCase()))`, bounded by the request. (b) Fix
the ledger: rename the deferral verdict to something that does not read as a pass — `DEFERRED`, with
the gate printing `DEFERRED n (deadline …)` alongside `ACTIONABLE`, and failing once a deadline
passes. `BOUNDED` must mean bounded.

### F10 — P2 — the cross-tenant spec cannot fail if the tenant predicate is deleted

`src/modules/hr/hr-cross-tenant-404.spec.ts` (176 lines, 9 services, 18 tests) builds its doubles
like this (`:16-27`):

```ts
function updateDb(rows: Row[]): Db {
  const returning = jest.fn().mockResolvedValue(rows);
  const where     = jest.fn().mockReturnValue({ returning });   // ← argument ignored
  const set       = jest.fn().mockReturnValue({ where });
  return { update: jest.fn().mockReturnValue({ set }) } as unknown as Db;
}
```

`where` returns the same stub for any argument, and `grep -c "where.mock.calls|toHaveBeenCalledWith"`
over the file returns **0** — no assertion ever inspects the predicate. Each test picks its own
fixture: `updateDb([])` "refuses", `updateDb([{id:1}])` "succeeds". The org id passed to the service
never reaches anything that could branch on it.

**Failure scenario.** Delete `eq(hrPolicies.orgId, orgId)` from `HrPoliciesService.archive` and all
18 tests still pass, and `check:tenant-isolation` still reports 931/931 (it is static — its own
output says so). The spec proves "empty result → `NotFoundException`", which is worth having, but it
is named and counted as cross-tenant evidence it does not provide.

**Proposed fix.** Assert the predicate, not just the shape: capture `where.mock.calls[0][0]` and
assert the serialised SQL contains the org column bound to the caller's org — the mechanism
`chat-send-conflict-target.db.spec.ts` uses for a related class. Or promote these nine to
`test:e2e:seeded` where two real orgs exist.

### F11 / F16 — P2 — three cache sites carried forward from the prior report

Re-verified present at `45f8a2e99`:
- `employee-onboarding.service.ts:433` bumps `hr:salary-bands:${orgId}` — no reader in the repo.
- `employee-onboarding.service.ts:434` bumps `hr:dashboard:payroll-summary:${orgId}` — no reader.
- `celebrations.service.ts:47` caches `hr:anniversary-feed:${orgId}:${actorUserId}:${scope}:${today}`
  via plain `cached()`; none of the four invalidations in `employee-onboarding.service.ts:429-435`
  reaches it. It is correctly permission-aware (actor + DataScope in the key) and self-expires
  daily, so this is staleness for at most a day, not a leak.

**Failure scenario (F16).** An employee's date of birth or joining date is corrected at 09:00; the
anniversary feed keeps showing the old celebration to every viewer until midnight.
**Proposed fix.** Move `getAnniversaryFeed` to `cachedVersionedForOrg` under the `hr:celebrations`
namespace the bumps already target; delete the two dead bumps once a module-graph proof exists
(the prior report's reservation about `knip` being misconfigured here still stands).

### F12 — P2 — the one HR natural key that does not lead with `org_id`

`hr-import-commit.service.ts:182` upserts `leave_balances` with
`target: [userId, leaveTypeId, year]`, arbitrated by
`uniq_leave_balances_user_type_year (user_id, leave_type_id, year)` — verified inferable, so this is
not a 42P10. It is the only HR natural key with no `org_id`. It is **not** a cross-tenant collision
today because `leave_type_id` is an org-scoped serial and two orgs cannot share one; and
`leave_balances` is RLS-enabled. But `retention.service.ts:456` shows the repo supports a user in
multiple orgs, so the key's safety rests on a second table's id-allocation policy rather than on the
key itself, and the index cannot supply the RLS policy qual for planning (backend CLAUDE.md §7).
**Proposed fix.** Add `uniq_leave_balances_org_user_type_year (org_id, user_id, leave_type_id, year)`
and widen the `onConflictDoUpdate` target to match it exactly — the same shape as 1052.

### F13 — P2 — the search fallback ILIKEs the one unindexed name column

`employees.service.ts:326-332`: above `EMPLOYEE_SEARCH_CAP`, the search falls back to
`ilike(users.name) OR ilike(users.email) OR ilike(users.firstName) OR ilike(users.lastName) OR …`.
`pg_indexes` on `users` has `idx_users_name_trgm`, `idx_users_email_trgm`, `idx_users_first_name_trgm`
— and **nothing on `last_name`**. `pg_trgm` is installed.
**Failure scenario.** A common surname on a large tenant takes the fallback branch; three of the
four disjuncts use the GIN index and the fourth forces a scan of `users`, which is the global,
RLS-disabled table shared by every tenant.
**Proposed fix.** `CREATE INDEX idx_users_last_name_trgm ON users USING gin (last_name gin_trgm_ops);`
— one line, matching the three that already exist.

### F14 — P2 — the skills matrix is the one hand-rolled table, and it is not labelled

`features/hr/employees/skills-matrix-page.tsx:138-186` — the only raw `<table>` in 526 HR/directory
`.tsx` files (every other table goes through `DataTable`, which passes the shared a11y suite).
Three concrete gaps: no `scope="col"` / `scope="row"` on any `<th>`, so header-cell association is
left to browser heuristics; in `compact` mode the column header's entire accessible name is
`skill.substring(0, 6)` plus an ellipsis (`:150`), with the full name only in a `title` attribute;
and each cell's proficiency label lives only in `title={\`${skill}: ${LEVEL_LABELS[level]}\`}` on a
`<span>` (`:180`), which is mouse-hover-only and not exposed to keyboard or screen-reader users.
**Failure scenario.** A screen-reader user on the skills matrix hears column headers as
"Kuberne…", "TypeSc…" and hears cell values as bare digits with no skill or level attached.
**Proposed fix.** Add `scope="col"`/`scope="row"`, a `<caption class="sr-only">`, and move the
`title` text into an `aria-label` (or a visually-hidden `<span>`) on both the header and the cell.

### F15 — P2 — four HR sheets ask for a width they never get

`components/ui/sheet.tsx:83` gives `SheetContent side="right"` the classes
`w-full max-w-full … sm:w-3/4 sm:max-w-sm`. Four HR call sites override the width with an
unconditional fixed value:

```
features/hr/feedback/cycles-tab.tsx:229               w-[480px]
features/hr/kpis/competency-frameworks-tab.tsx:224    w-[480px]
features/hr/kpis/kpi-library-tab.tsx:191              w-[420px]
features/hr/goals/create-goal-sheet.tsx:84            w-[420px]
```

These are 4 of the 5 instances of this anti-pattern in the whole frontend (the fifth is CRM, out of
scope, and it at least scopes the wide value with `sm:`). `cn` is `twMerge(clsx(...))`
(`lib/utils.ts`), so the caller's `w-[480px]` displaces the base `w-full`, but `max-w-full` survives
(different utility group) and clamps the element — which is `fixed inset-y-0 right-0`, so its
containing block is the viewport — to `100vw`. **There is therefore no mobile overflow.** What does
happen: at ≥640px the untouched `sm:max-w-sm` (24rem = 384px) wins over `max-w-full` in the cascade,
so a sheet written to be 480px renders at **384px** and the author's intent silently does not occur.
The correct pattern is in the same repo at `features/hr/recruitment/kanban/candidate-sheet.tsx:61`:
`w-full sm:max-w-[520px]`.
**NOT VISUALLY VERIFIED** — this is a reading of the compiled cascade, not a rendered measurement;
a browser at 375px and 1280px would settle it in a minute.
**Proposed fix.** Replace `w-[NNNpx]` with `w-full sm:max-w-[NNNpx]` at all four sites.

### F17 — P2 — the spec named for the payroll input build tests a local copy

`src/modules/hr/payroll-inputs/__tests__/payroll-inputs.spec.ts` (357 lines, 18 `expect()` calls)
imports `PayrollInputsBuildService` only as a DI token to mock. Its last three tests declare
`periodBounds` and `nextMonthKey` **inside the test file** (`:316-321`, `:346-350`) and assert
against those copies, and `it("generates 8 snapshot sections per employee")` at `:329` asserts that
a locally-declared 8-element array has 8 elements and 8 distinct values. None of it can fail if the
service changes. `check:vacuous-assertions` passes (1997 spec files, 15,333 callbacks, 57,849
`expect()`, 7 registered sites) because this shape — a spec re-implementing its subject — is outside
its four detectors (`no_assertion`, `tautology`, `cond_assert`, `early_return`).
**Failure scenario.** F1 is a one-line arithmetic defect in a file this spec is named after, and the
spec is green.
**Proposed fix.** Delete the local re-implementations and import the real helpers; add a
`buildSnapshots` case with one reimbursement and one insurance claim asserting the `reimbursement`
section's total. Separately, consider a `check:vacuous-assertions` detector for "spec file declares
a function whose name matches an export of the module under test".

---

## 6. What head already gets right

Reported because it is load-bearing, and because "no finding" and "not looked at" print identically.

1. **Every HR handler runs under RLS.** Zero `@NoTenantTransaction()` in 766 HR/directory files, so
   the 169 joins with no explicit org predicate are backstopped by a live tenant policy. I checked
   `relrowsecurity` on all 15 HR tables those joins touch.
2. **No provider call inside a database transaction.** 71 `db.transaction` blocks and 3 `withTenant`
   blocks in HR/directory, scanned for mail/storage/AI/dispatch/`fetch`/`axios` — zero hits. The
   export worker is the model: `storage.uploadFileStream` sits between two tenant transactions, and
   the temp file is unlinked in `finally`.
3. **Failed reads cannot render as empty states.** `readErrorReachesBoundary` is the default
   `throwOnError` for every query in the app, and **zero** HR hooks opt out. 47 route-level
   `error.tsx` under `hr/`. The named failure shape is structurally closed here.
4. **Query keys are tenant-hashed centrally.** `scopedQueryKeyHashFn(authenticatedScope(orgId, userId))`
   on the one sanctioned `QueryClient`, enforced by `check:query-scope` over 5360 files. No HR key
   can leak across org or user even if it forgets a dimension.
5. **The employee list cache key carries actor and DataScope**, not just org
   (`employees.service.ts:69`).
6. **Employee search is bounded and indexed**, through a `SECURITY DEFINER` function pinned to
   `app.current_org_id()` that fails closed with no tenant context, plus 7 trigram GIN indexes.
7. **No floating-point money in HR.** Zero `real(`/`doublePrecision(` in `src/db/schema/hr/` or
   `schema/directory/`; every compensation column is `decimal(p, 2)`. The one money defect (F1) is a
   unit mix, not a float.
8. **The canonical person spine is composite-keyed at every hop**, with `ON DELETE RESTRICT` on both
   links into `organization_people`.
9. **HR folder cohesion is clean on both sides** — no backend HR file over 500 lines (max 499), no
   frontend file over 500 with zero registered exceptions (max 488).
10. **The export path is a correct async job**: per-org claim rotation, stale reclaim, expiry sweep,
    keyset batches, per-batch DataScope, artifact cleanup on both failure and lost-race completion.
11. **`check:idempotent-commands` is clean** — every in-scope mutating HR handler carries
    `@Idempotent`; the six skips are Inventory, Payroll and Platform.
12. **`check:conflict-targets` reports 0 ratcheted** at head — the prior report's `KNOWN_OPEN`
    emptying held, and no new uninferable `ON CONFLICT` has landed in HR.

---

## 7. Blocked on infrastructure — named precisely

1. **Read-cost measurement for HR list projections (C118).** `scratch_head_1010` and
   `scratch_cold_1010` are schema-only — `SELECT count(*)` returns 0 on `organization_members`,
   `users`, `attendance`, `hr_people`, `hr_employments`, `onboarding_documents`, `leave_requests`.
   `EXPLAIN (ANALYZE, BUFFERS)` on an empty table reports a seq scan regardless of index quality, so
   any number I produced would be noise. **What would measure it:** `pnpm db:check-hr-reads`
   (`src/scripts/check-hr-list-read-cost.mjs`) and `pnpm db:check-read-budgets` against a tenant
   seeded to a realistic headcount, paired with `pnpm seed:scratch-e2e`.
2. **Seeded cross-tenant and workflow E2E (C118, C119).** `pnpm test:e2e:seeded`
   (`jest-e2e-seeded.json`) wants a 12 GB heap and a non-owner `APP_DATABASE_URL`; the log from the
   guard-chain run confirms the default connection is `neondb_owner`, which has `BYPASSRLS` and
   would report a boundary the running service does not have
   (`ERROR [Drizzle] RLS is enabled but "neondb_owner" has BYPASSRLS, so every tenant policy is inert`).
   Out of the 15-core / 24 GB budget with 26 agents running. **This is the only thing that can close
   the cross-tenant half of C118 and the "representative HR workflows" half of C119.**
3. **`AUTH_SIGNING_KEYS` is absent from the backend `.env`.** Every 403-deny e2e assertion fails
   locally on a fresh checkout with
   `"AUTH_SIGNING_KEYS must be set for e2e tests — the guard no longer accepts HS256"`
   (`test/helpers/sign-token.ts:44`). I unblocked it by minting a throwaway Ed25519 JWK into the
   process environment for the run — **no file was written and no key was committed** — which is how
   §4's 363/363 was obtained. Worth adding a documented dev-only key or a generator to
   `.env.example`, because without it the deny suite silently cannot run.
4. **Rendered viewport verification (C118 responsive).** No browser was driven; F15 is a cascade
   reading. Chrome at 375px and 1280px on `/hr/goals`, `/hr/kpis`, `/hr/feedback` would settle it.
5. **`jest --config jest-e2e.json` picks up other agents' worktrees.** `testPathIgnorePatterns` is
   `["seeded-e2e-spec", "node_modules", "dist"]` — it does not exclude `.claude/worktrees/`, so a
   pattern-matched run collected 3 copies of the same suite and reported 2 failures from
   `.claude/worktrees/bold-napier-7a4a41/`. My 363/363 was scoped with an absolute-path pattern.
   Harness issue, not a code defect, but it will produce confusing CI-vs-local diffs.

---

## 8. Verdict

**PRD-C118 — PARTIALLY MET.** Canonical ownership, self-vs-administrative authorization,
tenant-scoped schema/indexes, bounded search/list projections, privacy-safe caching and TanStack
keys are all met with evidence. Responsive accessibility is partially met — the primitives are
sound and HR uses them, but HR has zero a11y tests and carries F14/F15. Allow/deny E2E is **met and
measured here** (9 suites / 363 tests); cross-tenant E2E is **not met** — the suite is DB-less by
design and the spec named for it (F10) cannot detect a dropped predicate.

**PRD-C119 — NOT MET.** Blocked by F1 (P0, money into a payroll snapshot) and six P1s. Lifecycle
schema is missing two enforceable invariants that I reproduced (F2); the import path is synchronous,
unbounded, cannot record per-row errors (F3) and silently duplicates attendance (F5); the attendance
rate is computed on the wrong grain (F4); the payroll input build truncates at 1000 (F6); a third
documented filter is discarded (F7). Bounded-indexed-queries is not met and its gate says otherwise
(F9). Cache invalidation, frontend states and folder cohesion are met. Representative HR workflows
are unproven at the data level pending seeded E2E.
