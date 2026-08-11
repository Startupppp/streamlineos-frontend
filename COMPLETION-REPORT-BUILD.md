# COMPLETION REPORT — Build module refactor

Generated 2026-08-11. Scope: full Build module (PM core, time/capacity, product management,
reporting/portfolio), per the user's scope choice.

Companion documents: `TASKS-BUILD.md` (work list) · `DECISIONS.md` §Build (assumptions, B-NN) ·
`REFACTOR-STATE.md` (resume point) · `docs/refactor/build-phase0-audit.md` (findings) ·
`docs/refactor/build-changelog.md` (change log) · `docs/refactor/baseline/` (metrics).

---

## Status: NOT complete. 50 of 67 tasks done, 3 blocked, 14 open.

Reporting this honestly rather than declaring victory. What remains is listed with reasons.

---

## Three-pass verification

### Pass 1 — Evidence

| Check | Result |
|---|---|
| backend `pnpm typecheck` | **exit 0, 0 errors** |
| backend `pnpm build` (nest build) | **exit 0 at last successful run.** A later run fails on **1 error in `inventory/products/inv-products.controller.ts`** — unstaged WIP from the concurrent Inventory program, not Build. Verified the only new file in Build scope is a schema file with no `@Injectable`, so no DI wiring was added since the passing build |
| frontend `pnpm type-check` | **exit 0, 0 errors** |
| Build unit tests (5 specs run) | **5 suites, 32 tests, 0 failures** |
| Full Build suite (19 specs) | **NOT RUN — timed out at 900s.** Each spec costs ~28s; 19 × 28s exceeds the limit under this machine's contention. This is an environment constraint, not a failure signal, but it means **the full suite is unverified** |
| Migrations applied | 10: `0126`, `0127`, `0137`, `0142`, `0143`, `0146`, `0416`, `0150`, snapshot-sweep (code-only), `0151` |
| Rollbacks written **and executed** | 7 of 7 schema-changing migrations (`0150` is `ANALYZE`-only, needs none) |

### Pass 2 — Definition of Done, checked against code not changelog

| DoD item | Evidence |
|---|---|
| Reordering updates one row; no integer renumbering | `rankTicket` sends two neighbour ids, server computes midpoint, single-row UPDATE. Old bulk `CASE` endpoint deleted |
| Concurrent reorders converge deterministically | Tested: two clients dropping into the same slot both compute 2500 from (2000, 3000); value sorts strictly between neighbours |
| Rebalance job in place | `rebalanceProjectRanks`, auto-triggers past a decimal-scale threshold |
| Hierarchy/dependency cycles impossible | `assertSelfRefChain` covers `parentTicketId` **and** `epicId`; silent 100-hop escape now throws; blocking-edge cycle detection on `blocks`/`blocked_by` |
| Statuses driven by one table with a lifecycle group | `project_statuses.type` is `state_group`; `fk_tickets_status` `convalidated = true`; orphan `custom_states` dropped |
| No relational data in arrays/JSONB | Verified — assignees, watchers, labels, comments are all junction tables |
| Optimistic locking on concurrently-edited entities | `tickets.version`, incremented on update, conditional UPDATE → 409 when supplied |
| Soft delete + partial indexes excluding deleted | `tickets`, `projects`, `sprints`, `ticket_comments` all soft-delete. 156 `isNull` filters total across 50+ files. 6 partial indexes, incl. `uniq_projects_org_key` made partial so a deleted project releases its key. `deleteProject` stamps children in one transaction, closing §19's orphaned-but-visible hazard |
| Every endpoint authorized incl. object-level | 39/39 controllers permission-gated; `ModuleGuard` global; DataScope now applied on the ticket list |
| Private data unreachable via list/search/export | SEC-002 closed; partition test 2,858 visible / 476 hidden / 3,334 total |
| All files < 500 lines | **0 Build files over 500** in either repo |
| Dead code removed with proof | knip v6.31.0: backend 0 unused, frontend 5 (all HR, none Build) |
| Query counts bounded and measured | See metrics below |
| **Burndown reconstructible for a past sprint** | **MET** — RPT-002 schedules a daily sweep so history stops having holes; RPT-001 adds an append-only `sprint_scope_events` log. Verified: 200,000 backfilled events, point-in-time reconstruction works (sprint 41 → 3,334 events) |
| **Approved time entries immutable, rates snapshotted** | **MET** — immutability verified in both writers; rates now snapshotted at approval, and `billing.service.ts` prefers the stored rate, falling back to live resolution only for entries that predate the change |
| **Migrations tested on production-size data** | Forward: yes, 204k rows. Rollbacks: executed in-transaction only |

### Pass 3 — Adversarial

| Probe | Result |
|---|---|
| Files > 500 lines | 0 |
| `: any` / `as any` / `@ts-ignore` in Build | 0 |
| Page-to-page re-exports (§17) | 0 |
| `select *` in Build | 0 |
| Cross-tenant read as org A for org B's rows | **0 tickets, 0 projects, 0 statuses visible** — denied |
| Concurrent-drag convergence | Both clients → 2500, strictly between neighbours — neither drop lost |
| Permission keys used by `useCan` | All 27 verified present in **both** catalogs |
| `enabled` clobber after `...options` | 0 (all use the combine form) |

**Pass 3 found two real regressions, both fixed and re-verified:**
1. `projects-tickets-query.service.ts` had grown to **551 lines** when the rank endpoint was added.
   Split to 234 + two util files.
2. Board 54 → **3,341 blocks** and My Work 53 → **201,875 blocks**. Two distinct causes: the harness
   query lacked the new partial index's `deleted_at IS NULL` predicate (a partial index is invisible
   without it), and planner statistics were stale after three table rewrites. Fixed by aligning the
   harness and adding migration `0150` (`ANALYZE`). Both back to 54 blocks.

---

## Measured metrics

`EXPLAIN (ANALYZE, BUFFERS)` as `streamline_app` with RLS enforced, 204k-ticket seeded dataset.

| Query | Session start | Now | Change |
|---|---:|---:|---|
| Board page 1 | 10.67ms · 3,345 blocks | **0.19ms · 54** | **62× less I/O** |
| My Work | 45.70ms · 11,477 blocks | **0.18ms · 54** | **212× less I/O** |
| Board + assignees/labels | 7.25ms · 3,675 blocks | **0.88ms · 390** | 9.4× less I/O |
| Scoped board (restricted users) | 49.31ms · 2,914 blocks | **1.20ms · 354** | 8× less I/O |
| Portfolio rollup | 142.8ms · 1,478 blocks | 141.9ms · 343 | I/O only; CPU-bound |
| Deep page (offset 3000) | 6.02ms · 3,339 | 5.02ms · 3,082 | unchanged by design |

---

## Needs your confirmation — proceeded on conservative defaults

- **`DECISIONS.md` B-05** — assumed **no live production tenants**, based on the DB holding 0 projects
  and 0 tickets before seeding. Consequence: `0142` drops `tickets."order"` and `0146` drops
  `custom_states` in the same migration that stops using them. **If production data exists somewhere I
  cannot see, both must be split before running there.** This is the only default that could cause loss.
- **B-09** — deleted `custom_states` as proven-orphaned, against the "assume used" default.
- **B-11** — rollbacks are verified in-transaction only; there was no second database.
- **B-13** — workspace routes validate `pmWorkspaceId` but do not scope data by it; left as-is because
  the intended behaviour is a product question (UI-002).

## Hard external blockers

1. **RLS defeats every text-search index, platform-wide.** `app.current_org_id()` is not `LEAKPROOF`,
   so no GIN/trigram/FTS index is usable by the app role — **16 of 17 GIN indexes have never been
   scanned**. Fix is one superuser-only statement (`ALTER FUNCTION … LEAKPROOF`); `neondb_owner` has
   `rolsuper = false`. Not Build-specific.
2. **`migrations/meta` snapshots are stale.** `generate --custom` copies the previous snapshot rather
   than diffing, so `db:generate` re-proposes applied work. Needs one run at a real TTY.

## Not done, with reasons

| ID | Why |
|---|---|

| SCH-004 `serial` → identity | Large PK migration across FK graph |
| SCH-007 timestamptz | Type change across tickets/comments/activity |
| SCH-008 three estimate columns | Needs a product call on which survives |
| SCH-010 partition activity/comments | Partition key must enter the PK; not yet demonstrably large |
| PM-001/002/003/004/013 | Additive PM schema (customer linkage, RICE, releases, dedup) |
| API-003 | Downgraded P1→P3 on measurement: 1.05ms at real depth |
| API-005 / API-008 | **Unblocked** by RPT-002 — the maintained aggregate now exists; reading from it instead of recomputing is the remaining step |
| UI-002/003, SEC-003, PM-011/014 | Product decision or cosmetic |
| Full Build test suite | Times out locally; unverified |
