# L82 — Accounting Isolation Fixes Report

Date: 2026-08-30

## Summary

All 5 target suites fixed and passing. No real isolation holes found — all failures were broken doubles. Typecheck clean.

---

## Per-suite findings

### 1. accounting-gl-tenant-isolation.spec.ts — BROKEN DOUBLE

**Final count:** 4/4 passing

**Root causes (all doubles):**

- `makeSelectDb` made `where` a terminal mock (`mockResolvedValue`). The service chains `.where().orderBy().offset().limit()` — calling `.orderBy()` on a Promise threw `TypeError`. Fixed by making `where` return the builder (`mockReturnValue(builder)`) and making the builder itself thenable (`then: (resolve) => resolve(rows)`) so any chain that terminates with the builder still resolves correctly. Added `offset` to the chain builder and `execute` to the db mock.

- `deleteTemplate` DENY and CONTROL tests used `db.select` / `db.update` mocks, but the real service does only `db.delete().where().returning()` — no select or update. Rewrote both tests to mock `db.delete` with a `where` chain. DENY: returns `[]` → no deleted row → NotFoundException. CONTROL: returns `[{id:55}]` → resolves.

**No real isolation hole.** The service uses `and(eq(id, templateId), eq(orgId, orgId))` in the delete `WHERE` clause, ensuring a cross-org delete misses and throws NotFoundException.

**DENY bites proof:** Temporarily changed the DENY double to return `[{id:55}]` (simulating a delete that found a row for the attacker) — test failed. Restored.

---

### 2. accounting-core-tenant-isolation.spec.ts — BROKEN DOUBLE

**Final count:** 5/5 passing

**Root causes (all doubles):**

- Same `makeSelectDb` chain issue as GL. Applied same thenable-builder fix; also added `cachedVersioned` to the db mock (services like `balanceSheet` pass through a versioned cache wrapper, not `cached`).

- `gstr1` DENY assertion checked `result.rows` but the service returns `{ from, to, b2b, b2c, grandTotal }` — no `rows` field. Changed assertion to `expect(result.grandTotal.invoices).toBe(0)`, which correctly expresses "no invoices leaked for attacker org."

**No real isolation hole.**

---

### 3. accounting-settings-services-tenant-isolation.spec.ts — BROKEN DOUBLE

**Final count:** 6/6 passing

**Root causes (all doubles):**

- Same `makeSelectDb` chain issue — `where` was terminal, `.limit()` called on a Promise threw. Applied thenable-builder fix. Also added `insert` stub to `makeSelectDb` so `getOrCreateSettings` can complete (it inserts defaults when no settings found; returning `[]` from the stub yields `created = undefined`, satisfying `expect(result).toBeUndefined()`).

- `getOpeningBalance` DENY asserted `expect(result).toBeNull()` but the service returns `{ posted: false, entry: null }`. Changed assertions to `expect(result.posted).toBe(false)` and `expect(result.entry).toBeNull()`.

**No real isolation hole.**

---

### 4. invoices-tenant-isolation.spec.ts — BROKEN DOUBLE

**Final count:** 2/2 passing

**Root cause (double):** `InvoicesService.list` returns `{ items, total, page, totalPages }` but both test assertions checked `result.invoices` — a field that does not exist. Changed to `result.items`.

**No real isolation hole.** The service passes `where: and(...conditions)` with `eq(invoices.orgId, orgId)` as the first condition to `findMany`. The `sqlValues(call?.where)` assertion verifies the attacker's orgId is in that predicate.

**DENY bites proof:** Changed DENY double's `findMany` to return `[INVOICE_ROW]` (simulating a cross-tenant data leak) — `toHaveLength(0)` failed. Restored.

---

### 5. deal-closed-consumer-tenant-isolation.spec.ts — BROKEN DOUBLE

**Final count:** 2/2 passing

**Root causes (all doubles):**

- `makeMocks` db had only `select` and `transaction`. The service's first action is `new InboxConsumer(this.db).claim(...)`, which calls `db.insert(inboxRecords).values().onConflictDoNothing().returning()`. Without `insert`, the service threw `TypeError` before reaching any isolation-relevant code. Added `insert` (returns `[{id:1}]` to simulate a successful claim) and `update` stubs to the db mock.

- Both test payloads used `dealId: "deal-1"` (string) and omitted required schema fields (`orgId`, `dealValue`, `closedAt`). The `dealClosedPayloadSchema` requires `dealId: z.number()`, so `safeParse` failed, and the service logged a FAILED status and returned early — `db.select` was never called. Fixed payloads to satisfy the schema. DENY test now exercises the actual isolation path (no mappings → no SO created → `db.transaction` not called). CONTROL test now reaches `db.select` for mappings.

**No real isolation hole.** The service scopes both the mappings query and the SO creation to `event.organizationId`, never accepting a caller-supplied orgId.

---

## Security findings

None. All failures were broken doubles. No service was found to be missing an org predicate, returning 403 where 404 is required, or leaking cross-tenant data.

## Typecheck

`NODE_OPTIONS=--max-old-space-size=8192 pnpm typecheck` — clean, no errors.

## DENY bites proofs

- **GL / deleteTemplate DENY**: changed double to return `[{id:55}]` → suite failed (`rejects.toThrow(NotFoundException)` flipped to resolved). Restored.
- **Invoices DENY**: changed double's `findMany` to return `[INVOICE_ROW]` → suite failed (`toHaveLength(0)` flipped to 1). Restored.
