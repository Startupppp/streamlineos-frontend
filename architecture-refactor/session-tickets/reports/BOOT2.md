# BOOT2 — Boot and Live Request Exercise Report

**Date:** 2026-08-30
**Org under test:** `2cbb9a74-552b-4382-91ff-ea5a2dc8adcd` (L53 Test Corp)
**Actor:** `45200aba-fee9-4fc5-90eb-6ce7af097112` (OWNER, `isOrgOwner: true`)
**Files changed since BOOT1:** 244 source files newer than last dist compile

---

## 1. Pre-Boot Checks

**Unregistered injectables scan:** `injectables=1047 unreferencedOutsideOwnFile=0` — clean.

**Recompilation:** 244 source files were newer than the dist. Recompiled all 3,474 non-spec source files via `node @swc/cli/bin/swc.js src -d dist --config-file .swcrc` in 323ms. No compilation errors.

---

## 2. Boot Result

**BOOT: CLEAN** — no defects found or fixed during this session.

Key boot log entries:
- `RouteClassifierGuard: every route declares its exposure` — 0 undeclared routes
- `Nest application successfully started`
- `RLS enforced — connected as "streamline_app"`

Two recurring background sweep warnings (not defects, same as BOOT1):
- `[payroll-export-worker] organization sweep failed … has no region` (5 unplaced orgs, ~175ms cadence)
- `[expense-export-worker] organization sweep failed … has no region` (same orgs)

---

## 3. Health Endpoints

| Endpoint | Status | Note |
|---|---|---|
| `GET /health` | 200 | `{"status":"ok"}` |
| `GET /health/ready` | 200 | `{"status":"ready"}` |
| `GET /health/db` | 200 | `status=ok latency=114ms pool.waiting=0` |

`/health/db` requires `x-internal-secret` header (not Bearer token). Pool stats healthy: 5 connections, 0 waiting, 0 saturation events.

---

## 4. Module List Endpoints

| Module | Route exercised | Status | Notes |
|---|---|---|---|
| Build | `GET /build` | 200 | 1 project returned |
| Build | `GET /build/:projectId` (198) | **200 FIXED** | P0 from BOOT1 resolved — Drizzle relational query P0 fixed |
| Build | `GET /build/:projectId/tickets` (198) | **200 FIXED** | Same fix — returns paginated ticket list |
| Build | `GET /build/all-work` | 200 | Returns 2 items (includes BOOT2 ticket just created) |
| Build | `GET /build/roadmap` | 200 | Empty list (no roadmap items seeded) |
| CRM | `GET /crm/organizations` | 200 | Empty |
| CRM | `GET /crm/deals` | 404 | Route does not exist (entity-adapter pattern) |
| KB | `GET /kb/spaces` | 200 | 2 spaces (1 from BOOT1, 1 from BOOT2) |
| Chat | `GET /chat/channels` | 200 | Returns channels list |
| Workflows | `GET /workflows` | 200 | Empty |
| Directory | `GET /directory/people` | 200 | Empty (no seeded people) |
| Notifications | `GET /notifications` | 200 | Empty |
| Feedbucket | `GET /feedbucket/widgets` | 200 | Empty |
| Feedbucket | `GET /feedbucket/submissions` | 200 | Empty |
| Feedbucket | `GET /feedbucket/stats` | 200 | Returns stats |
| Settings | `GET /settings/permissions` | 200 | Permission catalog returned |
| Settings | `GET /settings/feature-flags` | 200 | Returns flags |
| Settings | `GET /settings/custom-fields` | 200 | Empty |
| Settings | `GET /settings/ai-usage` | 200 | Returns AI usage data |
| Mail | `GET /mail/accounts` | 200 | Empty |
| Mail | `GET /mail/messages` | 200 | Empty |
| Payroll | `GET /payroll/runs` | 402 MODULE_NOT_ENABLED | Module disabled for this org |
| Accounting | `GET /accounting/journal` | 402 MODULE_NOT_ENABLED | Module disabled |
| Timesheets | `GET /timesheets/entries` | 402 MODULE_NOT_ENABLED | Module disabled |
| Inventory | `GET /inventory/products` | 402 MODULE_NOT_ENABLED | Module disabled |
| Search | `GET /search?q=test` | 200 | Returns search results |
| Calendar | `GET /calendar/events?start=…&end=…` | 200 | Works with `start`/`end` params (not `startDate`/`endDate`) |
| HR | `GET /hr/employees` | 200 | Returns 0 employees (empty seeded org) |

---

## 5. Write Tests

| Route | Status | Notes |
|---|---|---|
| `POST /kb/spaces` | 201 | Space id=88 created |
| `POST /build/198/tickets` (without Idempotency-Key) | 400 BAD_REQUEST | Correct — Idempotency-Key is required |
| `POST /build/198/tickets` (with `Idempotency-Key: boot2-ticket-001`) | **200 OK** ticket id=44002 | **P0 FIXED** — was 500 in BOOT1 |

---

## 6. Cross-Tenant Isolation

| Test | Expected | Actual | Pass? |
|---|---|---|---|
| `GET /kb/spaces/1` (other org's space) | 404 | 404 `Space not found` | PASS |
| `GET /kb/spaces/2` (other org's space) | 404 | 404 `Space not found` | PASS |
| `GET /kb/spaces/88` (own space just created) | 200 | 200 with correct data | PASS |
| `GET /build/100` (project not in our org) | 404 | 404 `PROJECTS_NOT_FOUND` | PASS |

Cross-tenant isolation: 404 (never 403) for another org's resource IDs. Correct.

---

## 7. Cursor Pagination

| Route | nextCursor when empty | Structure |
|---|---|---|
| `GET /build/198/tickets?paging=cursor` | `null` (present in JSON, not absent) | `{ data, total, limit, nextCursor, hasMore }` |
| `GET /build/all-work` | ABSENT — page-based only | `{ data, total, page, limit, totalPages }` |
| `GET /build/roadmap` | ABSENT — page-based only | `{ data, pagination: { page, limit, total, totalPages } }` |

**Finding:** The `/build/:projectId/tickets` endpoint supports dual pagination via `?paging=cursor` or `?paging=page` (default). `nextCursor` is present and `null` (not absent) when the list is exhausted — correct.

`/build/all-work` and `/build/roadmap` do not support cursor pagination despite the mission noting cursor pagination was added. These endpoints use page-based pagination only. Not a regression from BOOT1 (both returned 200 then too), but cursor support is not present on those routes.

---

## 8. Resolved P0 from BOOT1

| Route | BOOT1 | BOOT2 | Fix confirmed |
|---|---|---|---|
| `GET /build/:projectId` | 500 INTERNAL_ERROR | 200 OK | YES |
| `GET /build/:projectId/tickets` | 500 INTERNAL_ERROR | 200 OK | YES |
| `POST /build/:projectId/tickets` | 500 INTERNAL_ERROR | 200 OK (with Idempotency-Key) | YES |

The Drizzle relational query / tenant GUC P0 is resolved. All three Build project-scoped endpoints now return correct data.

---

## 9. Silent Killer Checks

| Check | Result |
|---|---|
| 42501 errors after writes | None found in log |
| TypeErrors in log | None found |
| JS Date in Drizzle sql template | Not triggered |

No swallowed errors detected in the exercised paths.

---

## 10. Warnings Found (non-blocking)

| Warning | Severity | Note |
|---|---|---|
| `Unsupported route path: "/public/feedbucket/*"` | Low | Auto-converted to `/public/feedbucket/{*path}` on every boot — path-to-regexp v8 incompatibility. Fix: rename route to `/public/feedbucket/*path` |
| `Permission catalog has 41 retired key(s)` | Low | Cleanup disabled. Not actionable here |
| `GET /calendar/events` requires `start`/`end` params | Info | `startDate`/`endDate` not accepted; schema uses `start`/`end` |
| `GET /build/workspaces` → 400 VALIDATION_FAILED | Low | Route ordering: `/workspaces` static path shadowed by `:projectId` param — `ParseIntPipe` rejects "workspaces". Same as BOOT1 |

---

## 11. Summary

| Category | Finding |
|---|---|
| Boot | Clean — 3,474 files compiled, 0 DI errors, 0 unregistered injectables, 0 undeclared routes |
| P0s from BOOT1 | All three Build project-scoped endpoints fixed (200 instead of 500) |
| Cross-tenant isolation | Correct 404 isolation on all probes |
| Writes | KB space and Build ticket both succeed; ticket requires Idempotency-Key |
| Cursor pagination | `/build/:projectId/tickets?paging=cursor` works; `nextCursor` is `null` (not absent) when exhausted |
| Silent killers | No 42501, no TypeError, no swallowed errors |
| Disabled modules | 402 MODULE_NOT_ENABLED returned correctly for payroll, accounting, timesheets, inventory |
| Feedbucket | Routes work at `/feedbucket/widgets`, `/feedbucket/submissions`, `/feedbucket/stats` |
| Settings | All tested routes respond 200 |
| Route anomaly | `/public/feedbucket/*` warns on boot; `/build/workspaces` shadowed by `:projectId` (same as BOOT1) |
