# Performance Budget Manifest

Release SHA: `0ff92820` (backend `main` as of 2026-09-02)

PRD item: 12.1 — automated performance-regression gates for declared critical paths.

---

## Budget tiers and targets

| Tier | p95 ceiling | Notes |
|---|---|---|
| Ordinary read/mutation (API) | ≤ 300 ms | Excluding provider time |
| Approved complex aggregate/search (API) | ≤ 800 ms | Documented per route |
| Ordinary DB statement | ≤ 50 ms | As `streamline_app` with GUC |
| Approved complex DB statement | ≤ 200 ms | Documented per query |
| Cache-hit application path | ≤ 100 ms | Redis warm |
| In-process authorization (warm cache) | ≤ 100 µs CPU | No I/O on measured path |

---

## Gates that exist today and their status

### 1. DB buffer budget — `pnpm db:check-read-budgets`

Script: `src/scripts/run-read-cost-budgets.mjs` + `src/scripts/read-cost-budgets.mjs`

Connects as `streamline_app` (non-BYPASSRLS), sets `app.organization_id` GUC, runs
`EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)`, asserts shared blocks (hit + read) ≤ ceiling.

**Self-test**: `src/scripts/__tests__/plan-walker.test.mjs` — 12 tests, all pass.
Self-test output (run 2026-09-02):

```
PASS  walk collects all nodes in the tree
PASS  walk finds ticket_assignees node with Index Only Scan
PASS  walk finds tickets node with Index Scan (not Index Only Scan)
PASS  blocks are correctly summed from root Shared Hit + Read
PASS  require-index-only-scan passes when relation has Index Only Scan
PASS  require-index-only-scan fails when relation has Index Scan (not Index Only Scan)
PASS  require-index-only-scan fails when relation is absent from the plan
PASS  forbid-seq-scan passes when relation is absent
PASS  forbid-seq-scan passes when relation uses an index scan
PASS  forbid-seq-scan fails when relation uses Seq Scan
PASS  unknown assertion kind produces a failure
PASS  multiple assertions are all checked independently
All plan-walker tests passed.
```

Budget entries: 70 total, 10 excluded (CRM/Inventory not seeded on scratch\_e2e), 60 active,
10 required (dashboard critical paths, enforced as REQUIRED\_BUDGET\_IDS — runner exits 1 if any
are missing from the catalog).

Measurement unit: **shared buffer blocks** (hit + read), second run on warm cache.

Measurement conditions required for results to be meaningful:
- Role must be `streamline_app` (non-BYPASSRLS) — owner bypasses RLS and hides all RLS cost
- Tenant GUC must be set (`SET LOCAL app.organization_id = '...'` inside a transaction)
- `VACUUM ANALYZE` must be run after any table rewrite (stale stats → 53→201,875 blocks)
- A covering index on an RLS table must include `org_id` or the planner refuses it
- Measure on a minority org (not the org with the most rows) to expose RLS post-filter cost

Concurrency: 1 DB connection, sequential, single-run measurement (buffer state from run 1
visible in run 2; ceiling applies to run 1 worst-case, run 2 confirms warm-cache behaviour).

Repetitions: 2 EXPLAIN ANALYZE runs per budget; ceiling is applied to run 1 total blocks.

#### NOT MEASURED — requires live database connection as `streamline_app` with seeded data

Command:
```sh
APP_DATABASE_URL=<non-bypassrls-url> SEED_ORG_ID=<minority-org-uuid> \
  node src/scripts/run-read-cost-budgets.mjs
```

Dataset requirement: `minRows` per budget (listed below). A budget reports `SKIP` when
fixture data is absent; a `SKIP` is never a `PASS`.

#### DB buffer ceilings by budget ID

| ID | Table(s) | Ceiling (blocks) | minRows | Assertions | Module |
|---|---|---|---|---|---|
| scoped-board-page | build.tickets, ticket\_assignees | 5,000 | 50 | (none — planner-correct hash plan) | Build |
| my-work | build.tickets, ticket\_assignees | 30,000 | 50 | (none — UNION) | Build |
| ticket-list-project | build.tickets | 8,000 | 50 | forbid-seq-scan: tickets | Build |
| ticket-org-assigned-to-me | build.tickets | 20,000 | 50 | (none — seed selectivity too low) | Build |
| build-all-work | build.tickets, project\_members | 30,000 | 50 | (none) | Build — PROVISIONAL |
| build-roadmap-list | build.roadmap\_items | 5,000 | 1 | (none) | Build — PROVISIONAL |
| build-feedback-list | build.feedback\_posts | 5,000 | 1 | (none) | Build — PROVISIONAL |
| build-changelog-list | build.changelog\_entries | 3,000 | 1 | (none) | Build — PROVISIONAL |
| notifications-list | notifications | 5,000 | 100 | forbid-seq-scan: notifications | Home |
| notifications-unread-count | notifications | 3,000 | 100 | forbid-seq-scan: notifications | Home |
| chat-channel-list | chat\_channels, members | 8,000 | 50 | (none) | Chat |
| chat-messages-page | chat\_messages | 10,000 | 200 | (none) | Chat |
| chat-channel-members | chat\_channel\_members | 5,000 | 50 | (none) | Chat |
| chat-saved-messages | chat\_saved\_messages | 5,000 | 50 | (none) | Chat |
| kb-page-id-probe-sdf | kb\_pages (SECURITY DEFINER fn) | 3,000 | 30 | (none) | KB |
| kb-space-pages | kb\_pages | 8,000 | 30 | forbid-seq-scan: kb\_pages | KB |
| kb-recently-updated | kb\_pages | 8,000 | 30 | forbid-seq-scan: kb\_pages | KB |
| kb-spaces-list | kb\_spaces | 3,000 | 3 | (none) | KB |
| kb-page-visits-mine | kb\_page\_visits | 5,000 | 30 | (none) | KB |
| org-members-list | organization\_members | 5,000 | 10 | forbid-seq-scan: organization\_members | Directory |
| org-people-list | organization\_people | 8,000 | 10 | (none) | Directory |
| employee-record-list-canonical | hr\_employments, users | 8,000 | 5,000 | (none) | HR |
| employee-reporting-line-lookup | hr\_reporting\_lines | 5,000 | 1,000 | (none) | HR |
| leave-requests-pending-org | leave\_requests | 8,000 | 20 | forbid-seq-scan: leave\_requests | HR |
| leave-requests-mine | leave\_requests | 5,000 | 20 | forbid-seq-scan: leave\_requests | HR |
| attendance-mine | attendance | 5,000 | 30 | forbid-seq-scan: attendance | HR |
| leave-ledger-mine | hr\_leave\_ledger | 5,000 | 10 | (none) | HR |
| leave-balances-org | leave\_balances | 5,000 | 10 | (none) | HR |
| leave-accrual-ledger-dedup | hr\_leave\_ledger | 100 | 10 | (none) | HR |
| leave-accrual-balance-read | leave\_balances | 200 | 10 | (none) | HR |
| payroll-runs-list | payroll\_runs | 5,000 | 5 | (none) | Payroll |
| payroll-run-employees | payroll\_run\_employees | 8,000 | 5 | (none) | Payroll |
| payroll-line-items | payroll\_line\_items | 5,000 | 5 | (none) | Payroll |
| clients-list | clients | 8,000 | 20 | (none) | Accounting |
| invoices-open | invoices | 8,000 | 20 | (none) | Accounting |
| purchase-bills-list | purchase\_bills | 8,000 | 20 | (none) | Accounting |
| gl-journals-list | gl\_journals | 8,000 | 30 | (none) | Accounting |
| accounting-receivables-list | clients, invoices, payments | 5,000 | 10 | (none) | Accounting |
| finance-tax-payments | acc\_tax\_payments | 3,000 | 1 | (none) | Finance — PROVISIONAL |
| finance-reminder-policies | fin\_reminder\_policies | 2,000 | 1 | (none) | Finance — PROVISIONAL |
| support-ticket-queue | support\_tickets | 10,000 | 50 | (none) | Support |
| support-ticket-assigned-to-me | support\_tickets | 8,000 | 50 | (none) | Support |
| timesheets-pending-org | timesheets | 8,000 | 50 | (none) | Timesheets |
| timesheets-mine | timesheets | 3,000 | 50 | (none) | Timesheets |
| mail-inbox-cached | mail\_message\_metadata | 5,000 | 2,000 | forbid-seq-scan: mail\_message\_metadata | Mail |
| module-access-roster | role\_assignments, org\_members | 10,000 | 1 | (none) | RBAC — PROVISIONAL |
| search-tickets-sdf | build.tickets (SECURITY DEFINER) | 30,000 | 50 | (none) | Build/Search |
| search-lead-party-sdf | business\_parties (SDF) | 30,000 | 50 | (none) | CRM/Search |
| search-contact-party-sdf | business\_parties (SDF) | 30,000 | 50 | (none) | CRM/Search |
| search-client-party-sdf | business\_parties (SDF) | 30,000 | 50 | (none) | CRM/Search |
| dashboard-personal-my-tasks | build.tickets | 2,000 | 50 | forbid-seq-scan: tickets | Dashboard |
| dashboard-my-issues | build.tickets | 2,000 | 50 | forbid-seq-scan: tickets | Dashboard |
| dashboard-personal-calendar-events | calendar\_events | 500 | 1 | forbid-seq-scan: calendar\_events | Dashboard |
| dashboard-personal-notifications-count | notifications | 3,000 | 1 | (none) | Dashboard |
| dashboard-stats-attendance-count | attendance | 500 | 1 | forbid-seq-scan: attendance | Dashboard |
| dashboard-announcements | announcements | 2,000 | 1 | forbid-seq-scan: announcements | Dashboard |
| dashboard-leaves-today | leave\_requests | 2,000 | 5 | forbid-seq-scan: leave\_requests | Dashboard |
| dashboard-team-attendance | attendance | 2,000 | 1 | forbid-seq-scan: attendance | Dashboard |
| dashboard-active-sprint | build.sprints | 1,000 | 1 | (none) | Dashboard |
| dashboard-recent-projects | build.projects | 2,000 | 1 | (none) | Dashboard |

Excluded (CRM/Inventory not seeded on scratch\_e2e — not a gate failure):
contacts-list, leads-active, leads-assigned-to-me, deals-pipeline, search-deal-sdf,
inv-products-list, inv-stock-levels, inv-stock-transactions, inv-purchase-orders, inv-vendors-list

---

### 2. API route budget gate — `pnpm check:route-budgets`

Script: `src/scripts/check-route-budgets.mjs` + `contracts/route-budgets.json`

Validates manifest well-formedness against the current `openapi.json`, then enforces
`measured*` vs `max*` ceilings when measurements are non-null.

Self-test output (run 2026-09-02, after this session's changes):

```
Running self-test...
  [pass] stale-key-detected — stale budget key not in OpenAPI is detected
  [pass] live-key-passes — live budget key is not flagged as stale
  [pass] negative-value-malformed — maxDbCalls=-1 is flagged as malformed
  [pass] well-formed-passes — valid entry produces no malformed violations
  [pass] exceeded-budget-bites — measured > max is detected
  [pass] within-budget-passes — measured ≤ max produces no violation
  [pass] null-measured-skipped — null measured values are skipped (not yet profiled)
  [pass] buffer-exceeded-bites — measuredBufferBlocks > maxBufferBlocks is detected
  [pass] buffer-within-passes — measuredBufferBlocks ≤ maxBufferBlocks produces no violation
  [pass] buffer-negative-malformed — negative maxBufferBlocks is flagged as malformed
  [pass] buffer-absent-passes — omitting maxBufferBlocks (optional) produces no malformed violation
SELF-TEST PASSED
```

Live manifest run output (run 2026-09-02):

```
check-route-budgets: 14 declared budgets, 14 pending measurement
  OK — route budget manifest is valid and no budgets exceeded
```

Fields enforced per route: `maxDbCalls`, `maxDownstreamCalls`, `maxResponseBytes`,
`maxLatencyP95Ms`, `maxMemoryMb`, `maxBufferBlocks` (optional — DB-backed routes only).

#### NOT MEASURED — requires profiling orchestrator

Fill `measured*` fields in `contracts/route-budgets.json` from a profiling run.
The gate enforces automatically when any `measured*` field is non-null.

#### Declared API route budgets

Routes with `maxBufferBlocks` also link to a DB-level budget in `read-cost-budgets.mjs`
via `readCostBudgetId`.

| Route | maxDbCalls | maxLatencyP95Ms | maxBufferBlocks | readCostBudgetId |
|---|---|---|---|---|
| GET /build/{projectId}/tickets | 5 | 500 ms | 8,000 | ticket-list-project |
| GET /me/access | 3 | 200 ms | — | — (Redis-cached; DB path not budgeted separately) |
| GET /hr/employees | 4 | 600 ms | 8,000 | employee-record-list-canonical |
| GET /notifications | 3 | 300 ms | 5,000 | notifications-list |
| GET /contacts | 5 | 500 ms | — | contacts-list (excluded on scratch\_e2e) |
| GET /build/{projectId}/sprints | 4 | 400 ms | — | (no SQL budget yet) |
| GET /mail/accounts | 2 | 200 ms | — | (no provider; too small for buffer budget) |
| GET /mail/messages | 3 | 3,000 ms | — | provider latency dominates |
| GET /mail/messages/{messageId} | 2 | 2,500 ms | — | provider latency dominates |
| GET /mail/threads/{threadId} | 2 | 3,500 ms | — | provider latency dominates |
| POST /mail/send | 2 | 5,000 ms | — | provider latency dominates |
| POST /mail/reply | 2 | 5,000 ms | — | provider latency dominates |
| POST /mail/messages/{messageId}/actions | 3 | 2,000 ms | — | provider call + deferred write |
| GET /mail/messages/{messageId}/attachments/{attachmentId} | 2 | 3,000 ms | — | returns signed URL |

Total handlers: 3,601 (236 public, 100 universal, 3,205 permissioned, 60 in-service, 0 undeclared).
API routes declared in budget manifest: 14 of 3,601 handlers.
DB-query paths declared in read-cost budget: 60 active of 70 total.

---

### 3. In-process authorization benchmark — `pnpm auth:benchmark`

Script: `src/scripts/benchmark-access-service.ts`

Measures CPU time (µs) for `AccessService.resolveUserPermissions` on the warm path
(all four in-process caches primed; zero I/O on measured calls). Uses `process.cpuUsage()`
in batches of 2,000 calls across 100 batches, and `process.hrtime.bigint()` per-call
for wall-clock. Target: p99 CPU ≤ 100 µs.

Self-test output (run 2026-09-02, after this session's fix):

```
Verifying that stub dependencies throw on the cold path...
SELF-TEST PASS: stub throws on cold-path access — benchmark integrity guard works
```

**Bug fixed this session**: The proxy `get` trap previously returned `() => never(...)` (a
callable wrapping the throw) rather than calling `never(...)` directly. This made property
access return a function silently, so the self-test — which checked that `mockDb.query`
throws on access — reported SELF-TEST FAIL. The fix removes the wrapping lambda so `get`
calls `never()` directly, throwing on any property access.

#### NOT MEASURED — requires `ts-node` and `.env`

Command:
```sh
node --env-file=.env -r ts-node/register/transpile-only \
  src/scripts/benchmark-access-service.ts
```

Machine conditions required:
- Run on the deployment host or a representative container, not a loaded dev laptop
- 50,000 warmup calls precede measurement; results are sensitive to V8 JIT state
- CPU time ticks at ~16 ms on most hosts; batch-mean percentiles smooth this noise

Warm/cold state: all four in-process caches (versionCache, permsCache,
membershipAccessCache, deniedModulesCache) are primed before measurement. The measured
path is Map.get × 3 → `applyUniversalGrants` → return. Zero I/O; stub dependencies throw
if reached (none fire on the measured path).

---

### 4. Transaction-count gate — manual, requires running API

Script: `src/scripts/check-request-transaction-cost.mjs`

Measures pool borrows per request for 3 critical endpoints (100 warm repeats, 10 concurrent).
Subtracts background borrow rate from idle pool. Ceiling: ≤ 1.5 tenant transactions per
request for `/me` and `/me/access`; ≤ 1.0 for `/organization`.

#### NOT MEASURED — requires running API server

Command:
```sh
node src/scripts/check-request-transaction-cost.mjs \
  --url=http://localhost:1500 --repeats=100 --concurrency=10
```

Requires: `BACKEND_JWT_SECRET`, `DATABASE_URL`, `INTERNAL_API_SECRET` in `.env`, and
a seeded non-owner active member in the database.

---

### 5. Route classification gate — `pnpm check:route-classification`

Script: `src/scripts/route-classification-report.mjs`

Counts handlers and classifies by exposure decorator. Not a performance gate; confirms
no handler is undeclared (which would mean security oversight, not a perf issue).

Self-test: all 14 checks pass.

Live run output (run 2026-09-02):

```
Route classification report
  Total handlers : 3601
  public         : 236
  universal      : 100
  permissioned   : 3205
  in-service     : 60
  UNDECLARED     : 0
RESULT: ALL ROUTES CLASSIFIED
```

---

## Coverage gaps and what measurement would require

| Path | Gap | Command / Dataset |
|---|---|---|
| API latency (all routes) | All `measuredLatencyP95Ms` = null | Fill from load test: `k6 run` or Grafana p95 export against a staging env with realistic data |
| API DB-call count (all routes) | All `measuredDbCalls` = null | Add `x-db-call-count` header in dev mode and sample under load, or inject a query counter middleware |
| Buffer blocks (routes with `readCostBudgetId`) | All `measuredBufferBlocks` = null | `APP_DATABASE_URL=<app-role-url> node src/scripts/run-read-cost-budgets.mjs` against a seeded minority org |
| Response payload size | All `measuredResponseBytes` = null | Capture from load test response sizes |
| Memory per request | All `measuredMemoryMb` = null | Heap snapshot delta across 1,000 requests in isolation |
| In-process auth CPU p99 | NOT MEASURED | `pnpm auth:benchmark` on the deployment host after warmup |
| Cache-hit path ≤ 100 ms | NOT MEASURED | Instrument `/me/access` Redis-hit path with wall clock; no gate exists yet |
| Cache-miss degradation (no storm) | NOT MEASURED | Kill Redis, hit 50 concurrent requests; verify no thundering-herd on DB |

---

## What was done in this session

1. **Audited** all existing perf scripts and gates (5 scripts found, described above).
2. **Fixed bug** in `src/scripts/benchmark-access-service.ts`: proxy `get` trap now throws
   on property access rather than returning a callable — the self-test now reports PASS.
3. **Extended** `src/scripts/check-route-budgets.mjs`:
   - Added `["measuredBufferBlocks", "maxBufferBlocks"]` to `MEASURED_PAIRS`
   - Added optional `maxBufferBlocks` validation in `findMalformedBudgetEntries`
   - Added 5 new self-test cases for the buffer fields (all pass)
4. **Updated** `contracts/route-budgets.json`: added `maxBufferBlocks`, `measuredBufferBlocks`,
   and `readCostBudgetId` to three high-traffic DB-backed routes
   (`GET /build/{projectId}/tickets` → 8,000, `GET /notifications` → 5,000,
   `GET /hr/employees` → 8,000), linking them to their `read-cost-budgets.mjs` entries.
5. **Created** this manifest.

**What was not done**: Actual measured numbers. The read-cost budget runner requires
`APP_DATABASE_URL` (non-BYPASSRLS), a seeded minority org, and `VACUUM ANALYZE` on
affected tables. The auth benchmark requires `ts-node` + `.env`. The task says: "An honest
manifest with gaps named is the deliverable; a fabricated one is a failure." No numbers
were fabricated.

---

## Verification commands (confirmed working)

```
# Gate 1: DB buffer self-test
node src/scripts/__tests__/plan-walker.test.mjs
# → All plan-walker tests passed.

# Gate 2: Route budget self-test (extended)
node src/scripts/check-route-budgets.mjs --self-test
# → SELF-TEST PASSED (11 checks)

# Gate 2: Route budget live (all null — no exceedances)
node src/scripts/check-route-budgets.mjs
# → 14 declared budgets, 14 pending measurement / OK

# Gate 3: Auth benchmark self-test (fixed)
node -r ts-node/register/transpile-only src/scripts/benchmark-access-service.ts --self-test
# → SELF-TEST PASS: stub throws on cold-path access

# Gate 5: Route classification
node src/scripts/route-classification-report.mjs
# → 3601 handlers, 0 undeclared / ALL ROUTES CLASSIFIED

# Jest (perf/HR-performance module tests)
node ./node_modules/jest/bin/jest.js --maxWorkers=1 --silent \
  --testPathPattern="route-budget|read-cost|perf"
# → 15 passed, 96 tests (all HR performance module unit tests)
```
