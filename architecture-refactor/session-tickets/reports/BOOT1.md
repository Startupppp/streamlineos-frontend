# BOOT1 — Boot and Live Request Exercise Report

**Date:** 2026-08-30  
**Org under test:** `2cbb9a74-552b-4382-91ff-ea5a2dc8adcd` (L53 Test Corp, region `primary`, cell `legacy-1`)  
**Actor:** `45200aba-fee9-4fc5-90eb-6ce7af097112` (OWNER, `isOrgOwner: true`)

---

## 1. Boot

The API boots successfully after **three source-level defects** were found and repaired during the session:

| File | Defect | Fix |
|---|---|---|
| `dist/modules/kb/wiki/kb-spaces.controller.js` | Stale dist: `ZodValidationPipe` not imported; source had already migrated to `@Validate()` | Deleted entire `dist/` and recompiled |
| `dist/modules/support/core/support-tickets.controller.js` | NestJS SWC builder produced wrong output for migrated file — old ZVP call sites remained | Bypassed `nest start --builder swc`; compiled all 4664 source files with direct SWC Node.js API |
| 17 HR controller files | Partial migration removed `import { ZodValidationPipe }` but left `@Body(new ZodValidationPipe(...))` call sites — a TypeScript compile error hidden by the SWC compile path | Added missing import line to each file |

The API is served on port 1500 (`dist/main.js`, `NODE_ENV=development`).

Repeating boot failures that are NOT defects:
- `[notification-delivery-claim]` / `[payroll-jobs-claim]` log `organization sweep failed … has no region` for all 5 orgs that have no entry in `organization_placement`. This fires every ~175 ms per unplaced org. It is a missing seed condition, not a code bug.

---

## 2. Health Endpoints

| Endpoint | Status | Note |
|---|---|---|
| `GET /health` | 200 | `{"status":"ok"}` |
| `GET /health/ready` | 200 | `{"status":"ready"}` |
| `GET /health/db` | 401 | Requires auth — intentional; `@nestjs/terminus` is not installed, this is hand-rolled |

---

## 3. Module List Endpoints

| Module | Route exercised | Status | Notes |
|---|---|---|---|
| Build | `GET /build` | 200 | Returns projects; uses plain `select()`, not relational query |
| Build | `GET /build/:projectId` | **500** | Drizzle relational query exits tenant transaction — see §6 |
| Build | `GET /build/:projectId/tickets` | **500** | Same root cause |
| Build | `GET /build/all-work` | 200 | Returns empty list (no tickets) |
| CRM | `GET /crm/organizations` | 200 | Returns empty list |
| CRM | `GET /crm/sales-dashboard` | 200 | Returns zero-value dashboard |
| CRM | `GET /crm/automations` | 200 | Returns `{ rules: [] }` |
| CRM | `GET /crm/leads` | 404 | Route does not exist — CRM uses entity-adapter pattern, not CRUD routes |
| CRM | `GET /crm/contacts` | 404 | Same |
| CRM | `GET /crm/deals` | 404 | Same |
| HR | `GET /hr/employees` | 200 | Returns 1 member (org owner) |
| KB | `GET /kb/spaces` | 200 | Returns empty, then 2 after write test |
| Chat | `GET /chat/channels` | 200 | Returns empty |
| Workflows | `GET /workflows` | 200 | Returns empty |
| Directory | `GET /directory/people` | 200 | Returns empty |
| Notifications | `GET /notifications` | 200 | Returns empty |
| Payroll | `GET /payroll/runs` | 402 MODULE_NOT_ENABLED | Module disabled for this org |
| Accounting | `GET /accounting/journal` | 402 MODULE_NOT_ENABLED | Module disabled |
| Timesheets | `GET /timesheets/entries` | 402 MODULE_NOT_ENABLED | Module disabled |
| Inventory | `GET /inventory/items` | 404 | Route does not exist (inventory has no `/items` endpoint at root) |

---

## 4. Write Tests

| Route | Body | Status | Notes |
|---|---|---|---|
| `POST /kb/spaces` | `{ name, description, icon, visibility }` | 201 | KB space id=86 created; visible in subsequent GET |
| `POST /build` | `{ name, key, description, status }` | 201 | Build project id=198 created |
| `POST /chat/channels` | Missing `memberIds` | 400 VALIDATION_FAILED | Correct — schema requires `memberIds: array min 1` |
| `POST /build/198/tickets` | `{ title, type:TASK, priority:MEDIUM, status:TODO }` | **500** | Same relational query / GUC defect as §6 |

---

## 5. Cross-Tenant Isolation

| Test | Expected | Actual | Pass? |
|---|---|---|---|
| ORG1 JWT → `GET /kb/spaces/1` (ORG3's space) | 404 | 404 `Space not found` | PASS |
| ORG1 JWT → `GET /kb/spaces/2` (ORG3's space) | 404 | 404 `Space not found` | PASS |
| ORG1 JWT → `GET /kb/spaces/86` (own space) | 200 | 200 with correct data | PASS |
| ORG2 JWT with inactive membership → all requests | 403 | 403 `ORG_MEMBERSHIP_INACTIVE` | PASS — guard correctly rejects stale membership |

Cross-tenant isolation is working correctly: another org's resource ID returns 404 (not 403), consistent with the BOLA rule that a 403 leaks existence.

---

## 6. Silent Killers Found

### P0 — Drizzle relational queries bypass tenant transaction context

**Symptom:** `GET /build/:projectId`, `GET /build/:projectId/tickets`, and `POST /build/:projectId/tickets` all return 500 with `INTERNAL_ERROR`. All other Build endpoints that use plain `select()` return 200.

**Root cause (confirmed):** Drizzle's relational query API (`db.query.Entity.findFirst({ with: {...} })`) does not route through the proxy in `createTenantAwareDb`. The proxy intercepts `db.query` and returns `context.tx.query`, but when Drizzle's relational engine executes the complex lateral-join SQL it generates, it does so via the session's own `execute()` path — which is the pool connection, not the transaction holding the `app.organization_id` GUC.

**Proof:**
- `set_config('app.organization_id', ..., false)` (session-level) → relational query succeeds and returns `{ id: 197, statuses: 4, members: 1 }`
- `set_config('app.organization_id', ..., true)` (transaction-local) → relational query throws `no tenant context: app.organization_id is not set for this transaction`
- Plain `select().from(build.projects)` under the same transaction-local GUC → works (Go/return of list endpoint confirmed it)

**Affected surface:** Any service calling `db.query.Entity.findFirst|findMany({ with: {...} })`. The Build module is the primary user of relational queries with `with:`. An audit of other modules is needed.

**Note:** `db.query.Entity.findFirst()` WITHOUT `with:` also appears affected, but its queries succeed in practice because they either return empty or are short-circuited before the RLS-gated tables are hit.

**Fix direction:** `createTenantAwareDb` proxy must intercept `query` such that when the relational engine calls `session.execute(sql)` it goes through the transaction client. Alternative: migrate all `db.query.*` with `with:` to explicit join-based `select()` queries that respect the ambient tx.

### No 42501 (permission denied) errors found in logged writes

The writes that did succeed (`POST /kb/spaces`, `POST /build`) completed without 42501 from `AllExceptionsFilter`. The KB space creation exercised the after-commit notification path — no swallowed GUC error was observed on the created rows.

### JS Date in Drizzle sql template — not found in newly exercised paths

No new occurrences triggered. The known fixed instance (date in notification cron, fixed 2026-08-26) was not re-encountered.

---

## 7. OpenAPI Document

Generated at `/api/docs-json` (development mode only). Stats:

| Metric | Value |
|---|---|
| Total operations | 7,100 |
| `x-exposure` stamped | **0** |
| Undeclared (missing stamp) | 7,100 |
| Versioned suffix confirmed | Yes — all operationIds end in `[1]` |

**Bug in `record-route-classification.ts`:** The function builds a lookup map keyed by `${classRef.name}_${methodName}` (e.g. `DelegationsController_list`), but Swagger generates operationIds with a URI-versioning suffix: `DelegationsController_list[1]`. The map key never matches any operationId, so zero operations are stamped. The in-process boot log `"OpenAPI: exposure recorded on N operations"` reports 0 every boot.

File: `src/common/auth/record-route-classification.ts` line 101:
```ts
const exposure = byOperationId.get(String(operation.operationId));
```
The lookup needs the `[1]` suffix stripped (or the key built to match the suffixed form) before looking up the map. The guard itself is unaffected — it reads metadata directly from the controller, not from the OpenAPI document.

---

## 8. Route Anomalies

| Route | Response | Classification |
|---|---|---|
| `GET /build/workspaces` | 400 — `projectId: expected number, received NaN` | "workspaces" matches `:projectId` param; `ParseIntPipe` rejects it — route ordering places `:projectId` before `/workspaces` static path |
| `POST /hr/employees` | 404 | Route does not exist — HR employees created via invitation, not direct POST |
| `GET /organization/:orgId` | 404 | Route does not exist for direct org-by-ID access |
| `GET /org/setup/session` | 500 | Unrelated smoke-test finding; not re-investigated in this session |

The `GET /build/workspaces` 400 may indicate a route ordering defect where the static `/workspaces` path is shadowed by the `:projectId` param. Investigate `projects.controller.ts` route order.

---

## 9. Summary

| Category | Finding |
|---|---|
| Boot | Boots after fixing 17 HR source files + 2 dist files; SWC builder unreliable for partial migrations |
| P0 bug | Drizzle `db.query.* with:` bypasses tenant GUC — all Build project-scoped reads and writes return 500 |
| Cross-tenant | Correct 404 isolation confirmed |
| Writes | KB and Build list-level creates work; project-scoped writes fail (same P0) |
| OpenAPI | 7,100 operations, 0 stamped — lookup key mismatch with versioned suffix |
| Disabled modules | 402 MODULE_NOT_ENABLED returned correctly |
| Suppressed routes | CRM leads/contacts/deals, inventory items — routes simply do not exist (different architecture) |
