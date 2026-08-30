# L85 — Inventory Isolation Spec Repair

**Date:** 2026-08-30
**Suites:** inv-stock-shipments-returns-isolation, inv-products-warehouses-vendors-isolation, inv-engine-misc-isolation
**Final counts:** 3 suites passing, 66 tests passing, 0 failing.

---

## Per-suite findings

### inv-products-warehouses-vendors-isolation.spec.ts

**Was:** 2 failed (InvWarehousesService both DENY and CONTROL), 6 passed.
**Root cause:** double, not service.

`makeQueryDb` stopped the fluent chain at `where()` by using `jest.fn().mockResolvedValue(rows)`. `where()` returned a Promise; the service then called `.orderBy()` on that Promise → `TypeError: orderBy is not a function`.

**Diagnosis held:** confirmed exactly as described.

**Fix:** Rewrote `makeQueryDb` to use the same `makeChain()` pattern as `makeDb` in the other files. `rootChain.where` now returns the chain (which carries `orderBy`, `limit`, `offset`, and a `then` handler). `selectWhere` is captured as `rootChain.where as jest.Mock`.

**No real isolation hole.** `InvWarehousesService.queryWarehouses` correctly leads with `eq(invWarehouses.orgId, orgId)`.

---

### inv-stock-shipments-returns-isolation.spec.ts

**Was:** 2 failed (LoadsService DENY, PackagesService DENY), 18 passed.
**Root cause:** double intercepting the wrong seam, not a service isolation hole.

Both `LoadsService.list` and `PackagesService.list` are wrapped in `this.cache.cachedVersioned(...)` and use `db.select().from().where().orderBy().limit().offset()` — the select chain seam. The tests asserted `findMany.mock.calls[0]?.[0]?.where`, which is always `undefined` because `findMany` is never called by these methods.

The cache double correctly calls the factory (`cachedVersioned: jest.fn().mockImplementation(async (_ns, _h, fn) => fn())`), so the database IS hit.

**Diagnosis held:** confirmed — service uses select chain, not `findMany`.

**Fix:** Changed both DENY tests to destructure `selectWhere` from `makeDb` instead of `findMany`, and assert `selectWhere.mock.calls[0]?.[0]` directly (the condition passed to `where()`, which is the Drizzle `and(eq(invLoads.orgId, orgId), ...)` expression).

**No real isolation hole.** Both services lead their conditions with `eq(invLoads.orgId, orgId)` / `eq(invPackages.orgId, orgId)`.

---

### inv-engine-misc-isolation.spec.ts

**Was:** 0 tests, suite failed to load.
**Root cause:** Two wrong import paths.

`AiGatewayService` was imported from `../../common/ai/ai-gateway.service` (path does not exist). Correct path: `../ai/core/gateway/ai-gateway.service`. `AiConfirmationService` from `../../common/ai/ai-confirmation.service` → correct: `../ai/confirmation/ai-confirmation.service`.

After fixing the imports the suite loaded and ran, revealing 9 additional failures hidden by the load error:

| Service | Failure | Cause | Fix |
|---|---|---|---|
| NumberSequenceService (both) | `returning is not a function` after `.where()` | `makeDb` update chain: `where()` resolved directly, no `.returning()` | Added `where() → { returning: fn(rows), then: ... }` to update chain |
| NumberSequenceService DENY | service throws on empty `returning()` | DENY test used `makeDb([])` — no sequence row for `returning()` to yield | Changed to `makeDb([{ prefix: "PO", nextNumber: 2, padding: 5 }])` |
| WebhooksService DENY | `sqlValues(arg?.where)` got `[undefined]` | `WebhooksService.list` uses select chain, not `findMany` | Switched to `selectWhere` |
| InvBarcodeService (both) | `result.product` is `undefined` | Service returns discriminated union `{ type: "product" \| "not_found" \| ... }`, no `.product` field | Changed assertions to `result.type === "not_found"` / `"product"` |
| ExportService (both) | `received value must have a length property` | `list()` returns `{ items, total, page, totalPages }`, not an array | Changed to `result.items.toHaveLength(...)` |
| ImportService (both) | same shape mismatch | same | same |

**Diagnosis held** for the described 4 original failures. The 9 additional failures were pre-existing and hidden by the import error.

**No real isolation hole found.** All services correctly scope their primary query to the requesting `orgId`. Isolation is structural — tenant id flows from the method parameter into the leading `eq(table.orgId, orgId)` predicate in every case.

---

## DENY-bite proof

In `inv-engine-misc-isolation.spec.ts`, replaced `const selectWhere = rootChain.where as jest.Mock` with `const selectWhere = jest.fn()` in the double (not in source). This makes `selectWhere.mock.calls[0]` always `undefined`, so `sqlValues(undefined)` = `[undefined]`, and all `toContain(ATTACKER)` assertions fail. Result: 7 DENY tests failed. Reverted immediately after confirming.

---

## Validation

- `inv-stock-shipments-returns-isolation.spec.ts`: 20 passed, 0 failed.
- `inv-products-warehouses-vendors-isolation.spec.ts`: 8 passed, 0 failed.
- `inv-engine-misc-isolation.spec.ts`: 38 passed, 0 failed.
- `NODE_OPTIONS=--max-old-space-size=8192 pnpm typecheck`: clean (no errors).
- Lint/tests not run (not requested).
