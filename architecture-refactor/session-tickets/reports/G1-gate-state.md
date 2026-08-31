# G1 Gate State — 2026-08-30

Lane G1 — honest current state of every `check:*`, `verify:*`, `scan:*`, `db:check-*` and `audit:*` gate in the repo. Backend gates run from `backend/`; frontend gates from `frontend/`. Gates that require a live DB and no `.env` or that run a full test suite are marked NOT RUN.

---

## Summary Table

| # | Command | Exit | Headline | PASS/FAIL | TRUSTWORTHY |
|---|---------|------|----------|-----------|-------------|
| B1 | `check:cycles` (backend) | 0 | 4611 files, 0 circular deps | PASS | TRUSTWORTHY |
| B2 | `check:route-classification` | 0 | 3534 handlers, 0 undeclared | PASS | TRUSTWORTHY |
| B3 | `check:permission-keys` | 0 | 690 keys, all resolved | PASS | TRUSTWORTHY |
| B4 | `check:navigation-permissions` | 0 | 438 nav gates, all named | PASS | TRUSTWORTHY |
| B5 | `check:tenant-indexes` | 0 | 722 tenant tables, all have leading index | PASS | TRUSTWORTHY |
| B6 | `check:scope-application` | 0 | 122 scopes, all applied | PASS | TRUSTWORTHY |
| B7 | `check:record-access` | 0 | 560 reads, all guard soft-delete | PASS | TRUSTWORTHY |
| B8 | `check:module-entitlement` | 0 | timesheets pilot passes | PASS | NARROW — timesheets only |
| B9 | `check:module-lifecycle` | 0 | all 4 DB gates pass, 11 timesheets tables | PASS | NARROW — timesheets only |
| B10 | `check:idempotent-commands` | 0 | 9 in-scope handlers, all @Idempotent | PASS | TRUSTWORTHY |
| B11 | `check:tenant-isolation` | 0 | 818/818 services mapped (STATIC ONLY) | PASS | UNSOUND — see §1 |
| B12 | `check:log-secrets` | 0 | no secret logging, all TIERS keys present | PASS | TRUSTWORTHY |
| B13 | `check:outbox-consumers` | 1 | 4 orphaned inventory events | FAIL | TRUSTWORTHY |
| B14 | `check:placement-bypass` | 0 | 86 bypasses, all allowlisted | PASS | TRUSTWORTHY |
| B15 | `check:owner-authority` | 0 | 9 owner-only ops, all enforced | PASS | TRUSTWORTHY |
| B16 | `check:migration-chain` | 0 | chain verified, no issues | PASS | TRUSTWORTHY |
| B17 | `db:check-read-budgets:self-test` | 0 | breach detected — guard can fail | PASS | TRUSTWORTHY |
| B18 | `scan:legacy-actors` | 0 | 553 org FKs scanned | PASS | UNSOUND — see §2 |
| B19 | `scan:legacy-actors:check` | 0 | ratchet 553/555 (2 migrated) | PASS | UNSOUND — see §2 |
| B20 | `verify:rbac-integrity:self-test` | 0 | 10/10 checks pass | PASS | TRUSTWORTHY |
| B21 | `db:check-build-reads` | NOT RUN | requires DB + `.env` | — | — |
| B22 | `db:check-read-budgets` | NOT RUN | requires DB + `.env` | — | — |
| B23 | `db:check-request-txn` | NOT RUN | requires DB + `.env` | — | — |
| B24 | `verify:chat-mentions` | NOT RUN | requires DB + `.env` | — | — |
| B25 | `verify:multi-org-employment` | NOT RUN | requires DB + `.env` | — | — |
| B26 | `verify:rbac-integrity` | NOT RUN | requires DB + `.env` | — | — |
| B27 | `verify:membership-revocation` | NOT RUN | requires DB + `.env` | — | — |
| B28 | `openapi:check` | NOT RUN | builds full API (>3 min) | — | — |
| B29 | `check:tenant-isolation:run` | NOT RUN | runs full jest suite (>3 min) | — | — |
| F1 | `check:cycles` (frontend) | 0 | 4740 files, 0 circular deps | PASS | TRUSTWORTHY |
| F2 | `verify:server-data-seam` | 0 | 5 authenticated + 6 public routes verified | PASS | NARROW — see §3 |
| F3 | `check:colors` | 0 | no arbitrary hex classes | PASS | TRUSTWORTHY |
| F4 | `check:effect-fetches` | 0 | no useEffect-driven API fetches | PASS | TRUSTWORTHY |
| F5 | `check:routes` | 0 | no business route handlers | PASS | TRUSTWORTHY |
| F6 | `check:formatters` | 0 | no local Intl.NumberFormat formatters | PASS | TRUSTWORTHY |
| F7 | `check:empty-states` | 0 | no hand-rolled empty states | PASS | TRUSTWORTHY |
| F8 | `check:icon-labels` | 0 | no unlabeled icon buttons | PASS | TRUSTWORTHY |
| F9 | `check:query-scope` | 0 | no scope violations | PASS | TRUSTWORTHY |
| F10 | `check:dead-code` | 0 | 0 dead files, within baseline | PASS | TRUSTWORTHY |
| F11 | `check:route-access-contract` | 0 | 197 nav keys, all in contract | PASS | UNSOUND — see §4 |
| F12 | `check:contract-vendor` | 1 | vendored contract is STALE | FAIL | TRUSTWORTHY |
| F13 | `check:contract-drift` | 0 | no new timesheets drift | PASS | NARROW — timesheets only |
| F14 | `check:module-manifest` | 0 | manifest consistent | PASS | TRUSTWORTHY |
| F15 | `check:client-pages` | 0 | 259/259, within ceiling | PASS | TRUSTWORTHY |

**Counts:** 35 gates ran · 32 passed · 2 failed · 9 NOT RUN · 4 UNSOUND

---

## Unsound Gates

### §1 — `check:tenant-isolation` (B11): exists ≠ executes

**What it claims:** "every enumerated tenant-owned service maps to at least one isolation test" (100%).

**The flaw:** The gate itself prints `NOTE: this gate is static. It matches a spec file that names the service and does not run it, so a spec that throws before its first expectation still counts here.` A spec file that crashes in its `describe` block, or whose `it("hides rows from a different org")` body is a stub, satisfies this gate. The gate counts 818/818 and exits 0 even when many suites fail.

**Offending logic:** `src/scripts/check-tenant-isolation-coverage.mjs:107–124`. `hasIsolationTest` returns `true` the moment an isolation-pattern word appears in a spec that names the service class, without ever executing the spec.

**Known positive it misses:** MEMORY.md records "check:tenant-isolation matches a spec file that names a service; it read 100% while 28 suites were failing." The execution gate `check:tenant-isolation:run` (jest) is the proof — but it runs the full suite and is not run here per lane rules.

**Smallest fix:** Replace the static name-match with an assertion that the spec's last run exit code was 0 (requires a run-artifact), or promote the `:run` variant to a required CI gate alongside the static one. The static gate should re-label itself explicitly as "file coverage, not execution coverage" in its exit message (it already does this in the body — but exits 0 which CI treats as a green check).

---

### §2 — `scan:legacy-actors` / `scan:legacy-actors:check` (B18, B19): Drizzle-only scan misses raw-SQL FKs

**What it claims:** scans every `users.id` FK in the codebase and reports 553 organizational ones, with a ratchet that allows progress to be tracked.

**The flaw:** The scanner reads only `export const ... = pgTable(` declarations in `src/db/schema/`. Raw SQL migrations (hand-written `.sql` files applied via `db:apply-one` or custom journal entries) introduce `REFERENCES users(id)` columns that never appear in a Drizzle schema file. The scanner's `USERS_ID_REF` regex runs only against `pgTable` call bodies.

**Offending logic:** `src/scripts/scan-legacy-org-actors.mjs:102–104`:
```js
const tableDecl = /export\s+const\s+([A-Za-z_$][A-Za-z0-9_$]*)\s*=\s*pgTable\(/g;
for (const tableMatch of src.matchAll(tableDecl)) { ... }
```

**Known positive it misses:** MEMORY.md "Legacy actor ratchet undercounts — scanner reads pgTable() declarations, so ~121 raw-SQL users.id FKs are invisible; 555 reported vs 665 in pg_catalog." The ratchet baseline was set at 555 (now 553 after 2 migrations). The remaining ~112 raw-SQL FKs are not in the baseline and never counted. A migration effort that converts all Drizzle-declared FKs still cannot reach 0 on the `:check` gate because those 112 are invisible.

**Smallest fix:** The `--catalog` flag (`scan:legacy-actors:catalog`) already reads from `pg_catalog` and would give the true count. Replace the `:check` ratchet baseline with the catalog count (currently ~665), or add a second ratchet line that uses the catalog number so both dimensions are tracked.

---

### §3 — `verify:server-data-seam` (F2): 5-route sample in a 600-route app

**What it claims:** "server-data seam verified: 5 authenticated routes, 6 public routes."

**The flaw:** The gate hard-codes exactly 5 authenticated routes (directory workers, settings roles, payroll runs, HR assets, HR documents) and 6 public routes. There are 598 `page.tsx` files in the frontend; the remaining 587 authenticated routes are unchecked. A route that fetches before `requirePermission`, or that uses `serverGet` without `HydrationBoundary`, is invisible to this gate.

**Offending logic:** `frontend/scripts/verify-server-data-seam.mjs:12–52` — the `authenticatedRoutes` and `publicRoutes` arrays are fixed constants.

**This is intentional scope (not a latent bug today),** but it means the gate is narrow evidence, not broad coverage. A new route added without the seam pattern is not caught.

**Smallest fix:** Extend the checker to walk all `app/(authenticated)/**/page.tsx` files and assert each either uses the `requirePermission` + prefetch + `HydrationBoundary` pattern or is explicitly allowlisted. The existing structural checks per route are the right model; they just need to be applied universally.

---

### §4 — `check:route-access-contract` (F11): validates against a stale vendored contract

**What it claims:** "every route-access permission names an endpoint in the generated contract" (197 keys checked, all pass).

**The flaw:** The gate reads `frontend/contracts/openapi.json`, which `check:contract-vendor` (F12) confirmed is STALE — its SHA-256 does not match `backend/openapi.json`. If an endpoint was deleted from the backend but its permission key is still used in navigation, the stale contract still contains the old key and the gate passes even though the backend no longer enforces that key. The deletion scenario is the false-pass path.

**Offending logic:** `frontend/scripts/check-route-access-contract.mjs:7` — `const CONTRACT = join(FRONTEND_ROOT, "contracts", "openapi.json");`. No freshness check against the live backend contract before running.

**Known positive it may miss:** Any permission key that has been removed or renamed in the backend since the last `openapi:generate` + vendoring. The stale contract retains deleted keys, so nav entries for those routes pass silently.

**Smallest fix:** Before running the key validation, assert that `sha256(frontend/contracts/openapi.json) === sha256(backend/openapi.json)` (the same check `check:contract-vendor` performs) and fail with a message to re-vendor if they diverge. Alternatively, make the two gates a single ordered step in CI so stale → contract-drift → route-access-contract cannot run out of sequence.

---

## Real Defect Found: `check:outbox-consumers` FAIL (B13)

Four inventory outbox event types are emitted but have no registered consumer. These events fire on normal inventory operations (GRN receipt, SO fulfillment, shipment dispatch, stock adjustment) and are silently dropped:

- `inventory.purchase_order.received` — `modules/inventory/purchase-orders/grn.service.ts`
- `inventory.sales_order.fulfilled` — `modules/inventory/sales-orders/so-fulfillment.service.ts`
- `inventory.shipment.dispatched` — `modules/inventory/shipments/shipments.service.ts`
- `inventory.stock.adjusted` — `modules/inventory/stock/inv-stock-adjustments.service.ts`

The gate mechanism is trustworthy: it scans all TS files for `OutboxWriter.emit(…, { eventType: "…" })` calls and `registry.register({ eventType: "…" })` calls, builds two sets, and diffs them. The self-test confirmed it detects real orphans.

## Real Defect Found: `check:contract-vendor` FAIL (F12)

`frontend/contracts/openapi.json` does not match `backend/openapi.json`. The contract must be re-vendored before `check:route-access-contract` (F11) is meaningful again.

Fix:
```bash
pnpm --filter streamlineos-api openapi:generate
cp backend/openapi.json frontend/contracts/openapi.json
```
