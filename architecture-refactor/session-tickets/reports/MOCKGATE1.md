# MOCKGATE1 — Mock-Surface Gate: Builder-Chain False Positive Fix

## Summary

`pnpm check:mock-surface` exits 0 cleanly. The 6 original findings were eliminated by a structural scanner fix (4 of them) plus two genuine spec corrections (2 of them). The gate still bites on real phantoms; self-test extended from 7 to 9 assertions.

---

## Root Causes and Findings

### Cases 1–3 — Scanner false positives (factory-return picks up nested-function `return {}`)

**Files:**
- `src/modules/access/__tests__/home-surfaces-universal.spec.ts` → `AccessPermissionResolver` (`.innerJoin()`, `.where()`)
- `src/modules/autonomy/autonomy-hold.service.spec.ts` → `AutonomyHoldService` (`.where()`)
- `src/modules/rbac/__tests__/permission-delegability.spec.ts` → `PermissionCatalogSyncService` (`.onConflictDoNothing()`, `.onConflictDoUpdate()`)

**Mechanism:** The factory-return scanner pattern (`function makeFoo(): ClassName { ... }`) used a plain regex `/\breturn\s*\{/` to find the factory's return value. This found the *first* `return {` anywhere in the function body — including inside nested Drizzle builder callbacks like `from: (table) => { return { innerJoin: ..., where: ... }; }`. The builder methods from those inner `return {}` blocks were then attributed to the enclosing service class.

**Fix (scanner, structural):** Added `findTopLevelReturnBrace(funcBody)` — a character-level scanner that tracks `functionDepth` independently from `braceDepth`. A `{` that follows `=>` (trimming whitespace) or a `function(…)` keyword opens a nested function body and increments `functionDepth`. Only `return {` found at `functionDepth === 0` (i.e., in the factory's own execution context, not inside any callback) is used as the factory return value. Arrow functions using the `() => ({...})` form (parenthesised, no block brace) are correctly NOT counted as function bodies.

**Why it cannot mask a real phantom:** A genuine service mock returned directly (`return { realMethod: jest.fn() }`) is at `functionDepth === 0` and is still extracted. The only suppression is for `return {` blocks that are themselves the body of a callback passed into a builder method — and no real service is mocked that way.

### Case 4 — Genuine phantom in spec (`StockEngineBatchService.execute`)

**File:** `src/modules/inventory/inv-quality-counts-reports-isolation.spec.ts`

**Finding:** `{ provide: StockEngineBatchService, useValue: { execute: jest.fn() } }`. `StockEngineBatchService` has `executeMany` and `invalidateCaches`; it has no `execute`. `RecallsService` calls `this.engine.executeMany(...)`. The spec author appears to have copied the mock from `StockEngineService` (which does have `execute`) and used the wrong method name.

**Fix:** Changed both occurrences of `useValue: { execute: jest.fn() }` to `useValue: { executeMany: jest.fn().mockResolvedValue([]) }`.

### Bonus finding — Genuine phantom surfaced by the spec-count increase

`src/modules/rbac/roles-rbac-admin.controller.e2e-spec.ts` was committed after the original scan baseline and carries `{ provide: RolesService, useValue: { getSimulationTarget: ... } }`. `getSimulationTarget` lives on `RolesQueryService`, not `RolesService`; the controller calls `this.query.getSimulationTarget(...)`.

**Fix:** Moved `getSimulationTarget` to a new `{ provide: RolesQueryService, useValue: { getSimulationTarget: … } }` override; removed it from the `RolesService` override; added import for `RolesQueryService`.

---

## Files Changed

| File | Change |
|---|---|
| `backend/src/scripts/check-mock-surface.mjs` | Added `findTopLevelReturnBrace()`; updated factory-return logic; added self-tests 8 and 9 |
| `backend/src/modules/inventory/inv-quality-counts-reports-isolation.spec.ts` | `execute` → `executeMany` for `StockEngineBatchService` mock (2 occurrences) |
| `backend/src/modules/rbac/roles-rbac-admin.controller.e2e-spec.ts` | Moved `getSimulationTarget` from `RolesService` mock to new `RolesQueryService` mock; added import |

---

## Before / After

| | Before | After |
|---|---|---|
| `pnpm check:mock-surface` | Exit 1, 6 findings | Exit 0, 0 findings |
| `pnpm check:mock-surface:self-test` | Exit 0, 7 assertions | Exit 0, 9 assertions |

---

## Bite Proof (Both Directions)

**Direction 1 — gate bites on a real phantom:**
Added `phantomBiteTestMethod: jest.fn()` to the `AccessService` useValue mock in `permission.guard.spec.ts`. Gate exited 1 and named it:
```
[PHANTOM] .phantomBiteTestMethod() — exists on mock but NOT on the real class
  spec: src\modules\access\permission.guard.spec.ts
```
Removed the phantom; confirmed file is clean on re-read; gate returned to exit 0.

**Direction 2 — builder-chain methods are no longer false-positived:**
The 6 original findings (`.innerJoin`, `.where` ×2, `.onConflictDoNothing`, `.onConflictDoUpdate`, `.execute`) no longer appear. Self-test 8 asserts that `innerJoin`, `where`, `onConflictDoNothing`, and `onConflictDoUpdate` extracted from nested builder callbacks are not attributed to the enclosing service class. Self-test 9 asserts that a direct top-level `return { phantomOnlyOnMock: jest.fn() }` IS still detected.

---

## Self-Test Assertion Count: 9

Tests 1–7 (unchanged): basic key extraction, nested-key exclusion, single-line, class method extraction, full pipeline phantom detection, useValue-inline pattern, vacuity guard.

Test 8 (new): factory with Drizzle builder callbacks using nested `return {}` — confirms no builder methods leak into the factory class pair.

Test 9 (new): factory with a direct `return { phantomOnlyOnMock: ... }` at the top level — confirms the fix does not suppress real phantom detection (anti-vacuity for the new rule).
