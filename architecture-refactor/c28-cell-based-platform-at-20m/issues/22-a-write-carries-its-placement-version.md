# 22 — Every write carries its placement version and dies without the fence

**What to build:** Placement is a lease, not a lookup. A write carries the placement version it was routed under, and the cell accepts it only while it holds the matching write fence. A router working from stale information fails a request; it cannot create two writable copies of one organization.

**Blocked by:** [20 — Placement is a record, not a column](20-placement-is-a-record.md)

**Status:** done

**Grounding (2026-08-28, evidence not instruction — re-read at source):** this is what makes ticket 28's relocation safe, and it has to exist before the relocation does. `withTenant` (`backend/src/common/tenant/with-tenant.ts`) is the single place a tenant transaction opens and where the regional connection is already chosen — deliberately, so a caller cannot forget — which makes it the one place the fence check belongs. Note the Neon constraint already recorded in this repo: the pooler drops startup parameters, so only `SET LOCAL` inside the transaction works for per-transaction settings.

## Acceptance criteria

- [x] Every tenant write transaction carries the placement version it was routed under, set inside the transaction rather than as a connection parameter.

  `withTenant` adds `set_config('app.placement_version', …, true)` and `set_config('app.cell_id', …, true)` to the statement that already sets the tenant GUCs — the same `is_local => true` mechanism `resolveTransactionGuards` uses, chosen because the Neon pooler drops startup parameters. Asserted by *"carries the placement version inside the transaction, not as a connection parameter"*, which checks both the emitted SQL and the bound parameter.

- [x] The cell verifies it holds the matching write fence before the transaction commits; a mismatch aborts rather than warns.

  The fence probe is **folded into the existing GUC statement**, so it costs zero extra round trips: one correlated `SELECT count(*) FROM organization_placement WHERE organization_id = … AND placement_version = … AND write_fence_token = … AND status = 'ACTIVE' AND lease_expires_at > now()`. It runs on the **regional (cell) connection** the write is about to use, inside the transaction, and a mismatch throws before `fn(tx)` — so the transaction rolls back rather than logging.

  Run against the **live Neon database**, not a double — the probe SQL exactly as `withTenant` emits it:

  ```
  probe org: b680eca0-226f-4114-aa14-5b3516c8d633 v1 cell=legacy-1
  FENCE HELD (matching version+token): 1 => expect 1
  FENCE HELD (stale router):           0 => expect 0
  ```

  The raw SQL is also pinned to the schema so a column typo cannot reach runtime: `placement-schema-contract.spec.ts` parses the identifiers out of `with-tenant.ts` itself (stripping `${…}` interpolations) and asserts every one is a real column on `organizationPlacement`. Restating the column list instead would have passed a substring check even for `write_fence_tokens`; feeding the parser that typo yields `unknown identifiers found: [ 'write_fence_tokens' ]`.

- [x] Losing the fence stops source writes before any target write begins — the ordering is the property, and it is what makes rollback possible in ticket 28.

  *"refuses before the body runs, so a stale router never produces a partial write"* asserts `bodiesRun === 0` on refusal. `decidePlacement` additionally refuses every write for a `MOVING` placement before the transaction is even opened.

- [x] A stale router produces a clean, retryable failure with explicit retry information, never a partial write and never a silent success.

  `WriteFenceLostError` is an `HttpException` → **503** with `{ code: "PLACEMENT_FENCE_LOST", details: { retryable: true, retryAfterMs, cellId, placementVersion } }`, which `AllExceptionsFilter` passes straight through as the API envelope. Asserted in *"reports the failure as retryable with explicit retry information"*.

- [x] The check is in `withTenant`, not at its callers; a fourth caller added later inherits it.

  Placement resolution and the fence both live inside `withTenant`, for the reason its own comment already gave about region resolution. `runInTenantTransaction`, `runInNewTenantTransaction`, `forEachOrg` and `TenantContextInterceptor` all inherit it with no call-site change.

- [x] A race test drives two concurrent writers under different placement versions and proves exactly one commits.

  ```
  PASS src/common/tenant/__tests__/with-tenant-fence.spec.ts
    the write fence in withTenant
      √ carries the placement version inside the transaction, not as a connection parameter (8 ms)
      √ sets the cell id alongside it, so a query can tell which cell it is running in (1 ms)
      √ aborts a write whose placement version the cell no longer fences (1 ms)
      √ refuses before the body runs, so a stale router never produces a partial write (1 ms)
      √ reports the failure as retryable with explicit retry information (1 ms)
      √ does not fence a read, so the read path costs nothing extra (1 ms)
      √ still carries the placement version on a read, so the GUC is always present
      √ adds no fence probe when placement carries no fence, which is the unit-test path (1 ms)
    two concurrent writers under different placement versions
      √ commits exactly one of them (2 ms)
      √ lets the loser through once the cell's own fence advances to its version (1 ms)
  Tests: 10 passed, 10 total
  ```

  The cell's fence state is held by the test double, which answers the probe from its own state — so the stale writer is refused by the *mechanism*, not by the test. The double parses the real emitted SQL through `PgDialect.sqlToQuery` (`JSON.stringify` on a Drizzle condition throws).

  **Proof the guard bites** — neutering `const held = …` to `const held = true` *inside the test double* (never the source; a concurrent session would stage that) fails exactly the five fence assertions and nothing else:

  ```
  × aborts a write whose placement version the cell no longer fences (2 ms)
  × refuses before the body runs, so a stale router never produces a partial write (1 ms)
  × reports the failure as retryable with explicit retry information (2 ms)
  × commits exactly one of them (2 ms)
  × lets the loser through once the cell's own fence advances to its version
  Tests: 5 failed, 5 passed, 10 total
  ```

## Todo

- [x] Fence-check cost: **zero extra round trips.** Folded into the `SELECT set_config(...)` statement `withTenant` already issues, so a write pays one indexed primary-key lookup inside a statement it was sending anyway. The in-process placement cache (10 min) backs the routing half and is strictly shorter than the fence lease (24 h, renewed at 6 h remaining), so a cached placement cannot outlive its fence.
- [x] **Reads are not fenced.** Recorded decision: authorization, ownership, billing, quotas and read-after-write already go to the primary, so fencing reads doubles the cost of the overwhelming majority of traffic for no property gained. Placement *status* still gates reads — `FAILED` and unknown refuse them; `MOVING` and `READ_ONLY` serve them. `TenantContextInterceptor` derives the intent from the HTTP method and treats an **unrecognised** method as a write, so guessing never skips the fence. Pinned by *"does not fence a read"* and *"still carries the placement version on a read"*.
- [x] `SET LOCAL` semantics via `set_config(…, true)`; no `connection`-level option is used.
- [x] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md)

---

PRD: [`c28 — Organization-routed cells for 20M+ users`](../prd.md) · Candidate index: [`../README.md`](../README.md)
