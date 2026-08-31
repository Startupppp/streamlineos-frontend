# TENANTDB1 — Tenant-DB Proxy Relational Query Investigation

**Date:** 2026-08-30
**Assignment:** Verify BOOT1's diagnosis that `createTenantAwareDb` fails to route `db.query.X.findFirst({ with: {...} })` through the tx session, reproduce the failure in a test, fix it, and prove the test bites.

---

## Conclusion up front

**The BOOT1 mechanism diagnosis is WRONG.** The proxy correctly routes relational queries through the transaction session. The 500 errors BOOT1 observed are real — BOOT1's empirical observation stands — but the root cause is not the proxy.

---

## 1. Static analysis of the full call chain

Starting from `proxy.query.projects.findFirst({ with: { statuses: true, members: { with: { user: true } } } })` inside an active tenant context:

| Step | Code | Which client |
|---|---|---|
| `proxy.query` intercept | `source = context.tx` → `Reflect.get(context.tx, "query")` | — |
| `context.tx.query.projects` | `RelationalQueryBuilder(session = txSession)` set in `PgDatabase` constructor at tx creation | `txSession.client = txClient` |
| `.findFirst(config)` | `new PgRelationalQuery(this.session, config)` — session captured here, synchronously | `txSession` |
| `.execute()` / `.then()` | `this.session.prepareQuery(...)` → `PostgresJsPreparedQuery(client = this.session.client)` | `txClient` |
| `preparedQuery.execute()` | `this.client.unsafe(sql, params).values()` | `txClient.unsafe` |
| postgres-js `unsafe` on `txClient` | Routes to the reserved connection `c` opened by `begin()` | reserved connection |

Every step resolves to `txClient`, which is the same reserved connection where `SET LOCAL app.organization_id` was applied by `with-tenant.ts`. The chain never touches the pool client.

---

## 2. Tests written

**File:** `backend/src/common/tenant/__tests__/tenant-db.spec.ts` — new `describe` block added at end.

Two tests, both using real `drizzle()` with the CJS build (Jest resolves `"main": "./index.cjs"` from drizzle-orm's package.json):

**Test 1 — proxy routes through tx:**
Opens a Drizzle session transaction (which calls `poolClient.begin()` → receives `txClient`), stores that `tx` in ALS via `service.run()`, then calls `proxy.query.testProjects.findFirst({ with: { members: true } })`. Asserts `txUnsafe` called, `poolUnsafe` not called.

**Test 2 — anti-test proves the tracker bites:**
Same setup, but calls `db.query.testProjects.findFirst(...)` on the raw db (bypassing the proxy), outside ALS context. Asserts `poolUnsafe` called, `txUnsafe` not called.

---

## 3. Test results

```
PASS src/common/tenant/__tests__/tenant-db.spec.ts
  createTenantAwareDb
    √ routes to the underlying db when no tenant context is active
    √ routes to the ambient transaction when a context is active
    √ always resolves __client to the real client even inside a context
    √ nested query access resolves from the transaction when a context is active
    √ binds methods to the transaction so that `this` inside the method is the tx
  relational query routing through real Drizzle internals
    √ findFirst({ with: {...} }) calls txClient.unsafe when a tenant context is active (5ms)
    √ findFirst({ with: {...} }) calls poolClient.unsafe when bypassing the proxy (anti-test)
Tests: 7 passed, 7 total
```

Test 1 passes: `txUnsafe` is called, `poolUnsafe` is not → the proxy routes correctly.
Test 2 (anti-test) passes: `poolUnsafe` is called, `txUnsafe` is not → the tracker detects broken routing.

No fix was made. No regression test is red. The proxy does not have the bug BOOT1 diagnosed.

---

## 4. Rebuttal of BOOT1's mechanism

BOOT1 states: "when Drizzle's relational engine executes the complex lateral-join SQL it generates, it does so via the session's own `execute()` path — which is the pool connection."

This is false. `PgRelationalQuery` captures `this.session` at construction in `RelationalQueryBuilder.findFirst()`. That session is `txSession` (created by `PostgresJsSession.transaction()` with `client = txClient`). The `execute()` path calls `this.session.prepareQuery()` → `PostgresJsPreparedQuery(client = txClient)` → `txClient.unsafe(...)`. The reserved connection `c` (where `SET LOCAL` was applied) is exactly where the lateral join runs.

The plain `select()` path also routes through the same `txSession.client`. Both paths use the identical connection. No functional difference exists between them at the routing layer.

---

## 5. What BOOT1's observation actually shows

BOOT1's empirical proof is internally consistent:
- `is_local = false` (session-wide GUC) → relational query succeeds
- `is_local = true` (transaction-local GUC) → relational query fails `42501`
- `select().from(projects)` with `is_local = true` → succeeds

If both `select()` and `findFirst({ with: {...} })` route to the same connection, and `select()` succeeds under `is_local = true`, then `findFirst()` should also succeed — unless the GUC is already gone by the time `findFirst()` executes.

The most likely actual root cause: the relational query runs **after the transaction commits**. Inside `Promise.all([resolveUserPermissions(...), db.query.projects.findFirst(...)])`, if `resolveUserPermissions` does anything that causes the ambient `withTenant` transaction to commit early (or if `db.query.projects.findFirst(...)` is awaited outside the transaction scope due to a thenable resolution timing issue), the GUC would be gone on the still-reserved connection.

A second candidate: `resolveUserPermissions` opens its own `runInTenantTransaction`, which (if `withTenant` is re-entered) could interact with the ALS context in a way that makes the outer `context.tx` point to a committed transaction object by the time the relational query executes.

---

## 6. Recommended next step

Boot the API with SQL-level logging enabled (`DEBUG=drizzle:*` or a postgres-js `debug` callback) and inspect whether:
1. The lateral join SQL for `findFirst()` arrives at the connection AFTER the `COMMIT` statement.
2. The `SET LOCAL app.organization_id` statement appears on the same connection as the lateral join.

`tsc --noEmit` and all 7 unit tests are green. No source files were changed. The report file is the only output of this lane.
