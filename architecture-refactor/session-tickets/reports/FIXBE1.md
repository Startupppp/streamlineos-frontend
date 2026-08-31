# FIXBE1 — Backend Accounting Spec Fixes

**Result: 3 suites / 14 tests — all PASS**

```
PASS src/modules/accounting/posting/finance-posting-read-after-write.spec.ts (7.024 s)
PASS src/modules/accounting/gl/accounting-gl-tenant-isolation.spec.ts
PASS src/modules/accounting/gl/recurring-journals-list-total.spec.ts

Test Suites: 3 passed, 3 total
Tests:       14 passed, 14 total
Time:        9.069 s
```

---

## 1. `accounting-gl-tenant-isolation.spec.ts`

**Root cause:** `GlQuery = z.infer<typeof glQuerySchema>` where `glQuerySchema` has `format: z.enum(["json", "csv"]).default("json")`. The `.default()` makes `format` required in the output type; the two call sites passed `{from, to, page, pageSize}` without it.

**Fix:** Added `format: "json"` to both `getGeneralLedger` call sites (attacker case and control case).

**Files changed:** `src/modules/accounting/gl/accounting-gl-tenant-isolation.spec.ts`

---

## 2. `recurring-journals-list-total.spec.ts`

**Root cause:** The spec was written for cursor-based pagination (`.data`, `.hasMore`, `.nextCursor`) but `listTemplates` returns `buildListResponse(...)` which is `ListResponse<T>`:

```ts
interface ListResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
```

Two additional bugs in the mock:
- The mock chain was `where → orderBy → limit` but the service calls `.offset()` before `.limit()`, causing a TypeError at runtime (calling `undefined(n)`).
- The mock rows (from `makeTemplate`) lacked the `total` field that `resolveWindowedTotal` reads from `rows[0].total`, so the windowed count returned `NaN`.

**Fixes:**
- `buildService` now adds `.offset()` to the mock chain returning `{ limit }`.
- `buildService` wraps each row with `total: String(rows.length)` for `resolveWindowedTotal`.
- `limit` mock now uses `mockImplementation((n) => Promise.resolve(rowsWithTotal.slice(0, n)))` so it correctly respects the page size (test 2: 11 rows, limit 10 → 10 items returned).
- Assertions replaced:
  - `.data` → `.items`
  - `.hasMore === false` → `result.page >= result.totalPages` + `result.totalPages === 1`
  - `.hasMore === true` + `.nextCursor === 10` → `result.page < result.totalPages` + `result.totalPages === 2`
  - `.hasMore === false` (empty) → `result.totalPages === 0`

**Files changed:** `src/modules/accounting/gl/recurring-journals-list-total.spec.ts`

---

## 3. `finance-posting-read-after-write.spec.ts`

**Root cause:** `ProfitLossQuery = z.infer<typeof profitLossQuerySchema>` where `profitLossQuerySchema` has `from: isoDate.optional(), to: isoDate.optional()` — both fields are `string | undefined`. The spec declared `const range = { from: new Date(...), to: new Date(...) }` passing `Date` objects where `string` is required.

**Fix:** Changed `range` to `{ from: "2024-01-01", to: "2024-01-31" }`.

**Date-in-sql hazard:** `computeProfitLoss` uses `from` and `to` as strings passed to Drizzle ORM conditions (`gte(journalEntries.entryDate, fromStr)`) — not inside a raw `` sql`...` `` template — so no live Date-in-sql-template hazard in the service. The bug was entirely in the spec.

**Files changed:** `src/modules/accounting/posting/finance-posting-read-after-write.spec.ts`
