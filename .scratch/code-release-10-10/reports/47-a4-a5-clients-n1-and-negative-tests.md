# 47 — A-4, A-5 and A-14/A-15 for `GET /clients`: three register items closed

Three items the residual-risk register filed as ASSIGNABLE, each verified free before it was
started. Backend repo. Commits `5bdacef8`, `15c4d926`, `90e2d097`.

| item | ticket | what it asked for | state now |
|---|---|---|---|
| **A-4** | 21 · box 2 | batch `clients/client-accounts.service.ts:483` | **done**, measured on four tenants |
| **A-5** | 36 · box 7 | the three in-scope negative tests | **done**, all three bite-proved |
| **A-14 / A-15** | 22 · boxes 1, 2 | `dbCallBasis` + `measuredDbCalls` for one owned route | **done for `GET /clients`**, 1 of 82 |

---

## 1. A-4 — `reassignAccounts` issued one UPDATE per assignee

### What it was

`ClientAccountsService.backfillCrmAssignments` spread every unassigned client account across the
CS members holding `support:tickets:manage`, then wrote the result as:

```ts
await Promise.all(
  Object.entries(assignments).map(([assigneeId, ids]) =>
    this.db.update(clientAccounts)
      .set({ assignedCrmId: assigneeId, updatedAt: now })
      .where(and(eq(clientAccounts.orgId, orgId), inArray(clientAccounts.id, ids))),
  ),
);
```

Every account carries a **different** `assigned_crm_id`, so `inArray` can only batch the accounts
that happen to share an assignee. The round trips grew with the number of distinct assignees —
which on this codebase is the number of CS members, capped at the `limit: 500` on
`membersWithPermission`.

### What it is now

One `bulkUpdateFromValues` keyed on `id` with `assigned_crm_id` per row and `touch: ["updated_at"]`
— the batched form `db-call-count-classification.json` had already written down. `bulk-update.ts`
makes the tenant predicate mandatory, refuses a repeated key rather than applying one arbitrary
assignee, and chunks at `BULK_UPDATE_CHUNK = 500`.

### Measured — statement counts, on a production-shaped seed, as the app role

`scratch_t21_clients`, a copy of `scratch_perf_seed` at journal head (the route writes, so it was
not measured on the seed itself). `streamline_app`, `rolbypassrls = false`, RLS live, tenant GUC
set, Redis null. Counted with `countDbCalls` (`QueryTelemetryTracker` over
`instrumentPostgresClient`) around the real service. Pre-fix numbers taken from a hermetic
`git archive 5bdacef8^` tree against a freshly recreated copy, so both shapes met the identical
starting state.

| tenant | share | CS members | accounts assigned | **before** | **after** |
|---|---|---|---|---|---|
| `…0001` | 89.93% | 500 | 1,600 | **505** | **9** |
| `…0003` | 9.00% | 60 | 160 | **65** | **6** |
| `…0002` | 0.90% | 8 | 16 | **13** | **6** |
| `…0004` | 0.18% | 5 | 3 | **8** | **6** |

The model is exact in both directions. Before: `1 backfill insert + 2 probes + (distinct
assignees) + 2 read`. After: `1 + 2 + ceil(accounts / 500) + 2`. **56× fewer statements on the
majority tenant.** Steady state — every request after the first — is **5** on all four tenants
under both shapes, because the assignment branch is skipped once nothing is unassigned.

### Measured — buffers, which is the number that survives a warm cache

`EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)` over every statement of each shape, summed, inside a
rolled-back transaction, as `streamline_app` with the tenant GUC. `VACUUM ANALYZE client_accounts`
before each tenant. Blocks are `Shared Hit + Shared Read`.

| tenant | share | rows | **old blocks** (n stmts) | **new blocks** (n stmts) | Δ |
|---|---|---|---|---|---|
| `…0001` | 89.93% | 1,600 | **41,958** (500) | **32,936** (4) | −21.5% |
| `…0003` | 9.00% | 160 | **3,752** (60) | **2,881** (1) | −23.2% |
| `…0002` | 0.90% | 16 | **138** (8) | **76** (1) | −44.9% |
| `…0004` | 0.18% | 3 | **41** (3) | **24** (1) | −41.5% |

**The sign does not reverse on any tenant**, which is the check this release added after a
candidate index measured identical to head on all four. The buffer win is smaller than the
statement win, and that is the honest shape of it: a batched `UPDATE … FROM (VALUES …)` still
touches the same heap pages and the same index. The 21% it does save is the per-statement
index-descent and RLS-predicate overhead that 500 separate statements pay 500 times.

### Proved

- `src/db/__tests__/db-call-count-contract.spec.ts` gains `ClientAccountsService.runCrmAssignments`,
  two cases in the file's established shape: statement count **equal at 1 and 50 rows**,
  `countOf("update") === 0`, `countOf("execute") === 1`, and all five assignees present in the
  bindings of the **one** statement. Asserting equality across N rather than a small absolute
  number is what says the count does not grow with the data.
- Bite-proved hermetically. `git archive HEAD` into a temp dir, the new spec copied in over the
  **pre-fix** service, node_modules symlinked; nothing planted in the shared tree. Both new cases
  **fail** there and pass against the fixed service. A throwaway probe in the same tree printed the
  pre-fix counts quoted above (`rows=1 statements=6 updates=1`, `rows=50 statements=10 updates=5`).
- `pnpm check:db-call-count` → **exit 0**, ACTIONABLE **40 → 39 files**. The verdict moved
  `ACTIONABLE → N+1-FIXED` in the same commit as the code, because the gate's stale-verdict check
  exits 1 on a verdict the detector no longer matches — it did, and this is what turned it green.
- `pnpm typecheck` → exit 0. `pnpm check:spec-typecheck` → exit 0.

---

## 2. A-5 — the three in-scope negative tests

Ticket 36 box 7 names its own concrete remainder and then records *"Not run: no negative test was
written this pass."* All three are written. The ledger proves each cast is declared, local, carries
a written invariant and cannot grow; it does **not** prove the invariant. Each cast's claim is now
pinned by an observable consequence of the claim being **true**, so breaking the claim goes red.

### `src/common/observability/tracing.ts:93` — an **arity** claim

`match as unknown as [string, string, string, string]`. The failure mode is silent: drop a capture
group and `match` is still an array, the destructure still succeeds, and the missing element
arrives as `undefined` wearing the type `string`. So each group is pinned by a consequence of its
own presence rather than by counting elements the cast has already lied about.

- **Group 4** — `…-03` and `…-ff` must sample, `…-02` and `…-fe` must not. Lose the group and
  `flags` is `undefined`, `Number.parseInt(undefined, 16)` is `NaN`, `NaN & 1` is `0`, and **every
  trace silently reads as unsampled**.
- **Groups 2 and 3** — the ids come back as themselves with their exact hex shape. Lose either and
  the all-zero guard stops rejecting (`String(undefined)` does not match `/^0+$/`), so an invalid
  header is **accepted carrying nothing**.
- A 13-header corpus: whatever is fed in, an accepted result never contains `undefined`.
- The null-check that **precedes** the cast is pinned separately; remove it and every malformed
  header throws a TypeError into the request instead of declining to join a trace.

### `src/modules/platform/operator-session.guard.ts:46` — a **degradation** claim

`(req as unknown as { route?: { path?: string } }).route?.path ?? req.url`. Every shape tested is
one the cast's own type asserts cannot happen, which is the point: the cast is a promise about a
property TypeScript is not checking. A guard that throws on a differently-shaped request fails
**closed** on an operator route, which reads as a revoked grant rather than as a bug.

Absent key · empty object · `null` · a string · a number · an object whose `path` is not a string
— all degrade to `req.url`, all still call `authorizeRequest` with the right user, org and scope.
The route-template case is kept as the **control**, so the fallback assertions cannot pass
vacuously on a guard that ignored `req.route` entirely.

### `src/db/query-telemetry.ts:137,152,156` — a **reachability** claim

`(raw/proxy as unknown as Thenable)`. Three sites, one ledger entry.

- `.catch()` re-enters the **proxy's own** `then` (site 152), so a rejection settles exactly once —
  one error span, one statement.
- `.finally()` runs on both outcomes and still counts one statement each.
- The same pending query consumed twice counts **once**.
- The claim's blast radius, pinned: nothing in `wrap` checks the target is thenable before the cast
  dereferences `.then` — the check is the driver contract, not a branch. A non-thenable target
  fails **loudly** with a `TypeError` naming `then` and records **nothing**. A telemetry seam that
  counted a phantom successful statement here would be worse than one that threw, because every
  downstream call-count budget would inherit it.
- Properties that merely resemble `then` (`thenable`, `then2`) pass through untouched.

### Bite-proved, hermetically

`git archive HEAD` into a temp dir, the three specs copied in, sources at HEAD. **Control: 59/59
pass.** Six defects planted one at a time, in the temp tree only:

| planted defect | tests that go red |
|---|---|
| drop the 4th capture group | 3 (incl. `group 4 is really read`) |
| drop `if (!match) return null` | 3 (incl. `null-checks before the cast`) |
| drop `?? req.url` | 4 (all four fallback cases) |
| route `.catch` at `raw` instead of the proxy | 1 |
| remove the settle-once guard | 1 |
| record on wrap instead of on settle | 9 |

`pnpm check:type-assertions` → **exit 0**, 3,574 application files, 26 `as unknown as` in 16 files,
18 external / 8 narrow-me, escapes 0/0/0/0. Ledger counts unchanged — a negative test does not move
them, which is the correct outcome.

### What this does NOT close

Box 7 stays open, and the register is right about why. **R-8** (13 `narrow-me` sites) is unaffected
on purpose: their recorded remedy is to *delete* the cast, and a negative test on one would certify
a cast the ledger says must not exist. **R-8b** (17 of the 20 `external` sites) is unaffected: other
lanes' harnesses, the Drizzle-instantiation seam where the invariant is compile-time and no runtime
test can reach it, and one vendored file. **3 of 20 external sites now carry a negative test.**

---

## 3. A-14 / A-15 for `GET /clients` — one route, counted and measured

`GET /clients` was one of the 56 `default-ceiling` entries: `maxDbCalls: 10`, `measuredDbCalls:
null`. It is the only route in this territory.

**A-14, the call path, read statement by statement out of `getClientAccounts`:** the read itself is
**2** — one relational `findMany` over `client_accounts` with the `salesRep`/`assignedCrm` column
joins, and one `count()` over the same predicate, issued together in a `Promise.all`. The handler
also runs `tryBackfill`, which `registerAfterCommit` defers past commit but still inside the
request: `backfillConvertedLeadsToClientAccounts` is 1 `execute`, `backfillCrmAssignments` is 2
selects plus `ceil(unassigned / 500)` bulk updates, both skipped once nothing is unassigned.
`resolveClientsReadScope` and `membersWithPermission` are access reads, not counted — the
convention `GET /dashboard/personal` set.

**A-15, measured** with `countDbCalls`, same database/role/GUC as §1:

| branch | `…0001` 89.93% | `…0003` 9.00% | `…0002` 0.90% | `…0004` 0.18% |
|---|---|---|---|---|
| steady state | **5** | **5** | **5** | **5** |
| cold (first request) | 9 | 6 | 6 | 6 |

`measuredDbCalls: 5` — the per-request cost, identical on all four tenants. The cold branch is
recorded in `dbCallMeasurement.coldBranch` and **deliberately not** recorded as the measurement:
its chunk term grows with the number of unassigned accounts, so a ratchet placed on it would be
data-dependent. **The ceiling stays at 10 and was not tightened to the counted 5, for the same
reason** — tightening would declare a ceiling the cold path can exceed on data alone. Zero `max*`
keys changed; `git diff | grep '^[-+].*"max'` returns 0.

`pnpm check:route-budgets`: `DbCalls` **2/82 → 3/82**, basis **12 counted → 13**, `55 default`,
measured ceilings **386/570 (67.7%) → 387/570 (67.9%)**. Still exit 1 on the same two pre-existing
breaches (`GET /calendar/events` buffer blocks, `GET /cron/storage-sweep` downstream calls) —
neither is this route, and neither moved. `--self-test` exit 0.

**`measuredBatchSize` / `measuredDurationMs` stay 0/12 and were not touched.** They are not
reachable from any instrument in this territory: they need the batch runners themselves to emit
`{batchSize, durationMs}`. Owner remains the cron/worker owner — `src/modules/cron/**` and the
outbox drain, both forbidden here.

---

## 4. Findings raised, not fixed — all outside this territory

1. **`clients-list` measures a different table from the route it is linked to.** The read-cost
   budget's SQL is `SELECT id, name, status, account_manager_id … FROM clients`. `GET /clients`
   runs `ClientAccountsService.getClientAccounts`, which reads **`client_accounts`** (different
   table, different columns — `client_name`, `assigned_crm_id`). This is the same defect shape as
   the eight caught in 22c and the `GET /calendar/events` relink in 22d.
   The mislink is what hides it: **`client_accounts` holds 0 rows on `scratch_perf_seed` at head**,
   while `clients` holds 25 on the majority tenant and 0 on the other three — so the budget reports
   `resultRows: 25, tenantRows: 25` and clears the vacuous guard while measuring a query the route
   does not issue. `GET /clients`' recorded `measuredBufferBlocks: 4` therefore describes the wrong
   statement. Owner: the read-cost / perf-harness owner (`src/scripts/read-cost-budgets.mjs`).
2. **`GET /clients` does unbounded write work inside a user-facing GET.** `tryBackfill` inserts a
   client account for every converted lead and then assigns every unassigned one, on the read path,
   behind a 60-second Redis lock that is absent whenever Redis is. On the 89.93% tenant that was
   1,600 inserts and 1,600 assignments on one request; it is bounded only by the tenant's data.
   The batching in §1 makes it 4 statements instead of 500, but the right home for it is a worker,
   not a `@Get()`. Owner: clients/CRM product owner. Note the route also carries
   `@Deprecated({ sunset: "2026-10-25", link: "/crm/organizations" })`.
3. **`bulkUpdateFromValues` is `ceil(n / 500)` statements, not one.** Every note in this release
   that describes it as "one statement" is right about the shape and wrong about the count above
   500 rows. It is bounded per row, which is what §5.1 asks for; it is not constant. Worth a
   one-line correction wherever the phrase appears.
4. **`GET /clients` has no `assertNoDbCallRegression` ratchet, and cannot get one from here.**
   `measuredDbCalls: 5` is now recorded but nothing enforces it: the only vehicle is
   `test/perf/route-db-call-budget.e2e-spec.ts`, which is another lane's territory this session.
   Adding it is three lines beside the two `GET /notifications` cases. Owner: perf-harness owner.

## 5. Databases used

`scratch_t21_clients` — created here with `createdb -O neondb_owner -T scratch_perf_seed`, at
journal head, dropped and recreated between the pre-fix and post-fix runs so both met the same
starting state. Nothing was written to `scratch_perf_seed`, which was read only for the row counts
in §4. No `scratch_boot_*`, no `scratch_perf_seed_stale_20260902`, no `scratch_t23_http` was
touched. `scratch_t21_clients` is left in place; it is disposable.
