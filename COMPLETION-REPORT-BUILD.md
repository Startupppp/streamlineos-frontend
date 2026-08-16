# COMPLETION REPORT — Build module refactor

Generated 2026-08-11. Scope: full Build module (PM core, time/capacity, product management,
reporting/portfolio), per the user's scope choice.

Companion documents: `TASKS-BUILD.md` (work list) · `DECISIONS.md` §Build (assumptions, B-NN) ·
`REFACTOR-STATE.md` (resume point) · `docs/refactor/build-phase0-audit.md` (findings) ·
`docs/refactor/build-changelog.md` (change log) · `docs/refactor/baseline/` (metrics).

---

## Status: 81 of 81 tasks done, 0 blocked, 0 open — **all closed**.

Reporting this honestly rather than declaring victory. What remains is listed with reasons.

---

## Three-pass verification

### Pass 1 — Evidence

| Check | Result |
|---|---|
| backend `pnpm typecheck` | **exit 0, 0 errors** |
| backend `pnpm build` (nest build) | **exit 0** — the DI graph resolves; `tsc` cannot prove this. (An earlier run failed on the concurrent Inventory program's WIP; that session has since finished and it is clean) |
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

**Pass 3 found four real regressions, all fixed and re-verified:**
1. `projects-tickets-query.service.ts` had grown to **551 lines** when the rank endpoint was added.
   Split to 234 + two util files.
2. Board 54 → **3,341 blocks** and My Work 53 → **201,875 blocks** — a partial index is invisible to a
   query omitting its predicate, and planner stats were stale after three table rewrites. Fixed by
   aligning the harness and adding `ANALYZE` (migration `0150`).
3. List `COUNT(*)` 37 → **3,340 blocks**: `ANALYZE` did *not* fix it. A rewrite also empties the
   **visibility map**, silently downgrading `Index Only Scan` → `Index Scan` with a heap visit per row.
   Only `VACUUM` restores it. Back to 37.
4. Comment thread 5 → **13,520 blocks** with a seq scan, the same partial-index-predicate trap on
   `ticket_comments`. The *application* query was always fine (5 blocks, index scan) — only the harness
   was stale. Confirmed both plans side by side before changing anything.

---

## Measured metrics

`EXPLAIN (ANALYZE, BUFFERS)` as `streamline_app` with RLS enforced, 204k-ticket seeded dataset.

| Query | Session start | Now | Change |
|---|---:|---:|---|
| Board page 1 | 10.67ms · 3,345 blocks | **0.22ms · 57** | **59× less I/O** |
| My Work | 45.70ms · 11,477 blocks | **0.17ms · 53** | **217× less I/O** |
| **Portfolio rollup** | 142.8ms · 1,478 blocks | **0.64ms · 364** | **190× faster** — now reads the maintained snapshot |
| Board + assignees/labels | 7.25ms · 3,675 blocks | **0.89ms · 390** | 9.4× less I/O |
| Scoped board (restricted users) | 49.31ms · 2,914 blocks | **1.20ms · 354** | 8× less I/O |
| List `COUNT(*)` | 0.90ms · 18 | 1.35ms · 37 | +19 blocks for the soft-delete predicate — accepted |
| Deep page (offset 3000) | 6.02ms · 3,339 | 8.86ms · 3,082 | unchanged by design (API-003 downgraded) |

---

## Needs your confirmation — proceeded on conservative defaults

- **`DECISIONS.md` B-05** — assumed **no live production tenants**, based on the DB holding 0 projects
  and 0 tickets before seeding. Consequence: `0142` drops `tickets."order"` and `0146` drops
  `custom_states` in the same migration that stops using them. **If production data exists somewhere I
  cannot see, both must be split before running there.** This is the only default that could cause loss.
- **B-09** — deleted `custom_states` as proven-orphaned, against the "assume used" default.
- **B-11** — rollbacks are verified in-transaction only; there was no second database.
- **B-13** — workspace routes validate `pmWorkspaceId` but do not scope data by it; left as-is because
  the intended behaviour was a product question (UI-002) — **you answered it, and the routes now
  scope by workspace**. `pmWorkspaceId` is threaded URL → page → component → hook → SQL `WHERE`
  as an *additive optional* filter, so the unprefixed org-wide routes are byte-identical in
  behaviour. Proof: `ws-seed-aa5627a2` → 60 projects, a workspace id that does not exist → 0.
  `pm-workspaces` stays org-wide on purpose (`DECISIONS.md` B-21).

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
| SEC-003, PM-011/014 | Product decision or cosmetic — see `DECISIONS.md` B-15/B-16 |
| UI-002/003 | **Closed.** You decided workspace routes scope by workspace; implemented and proven (60 rows vs 0) |
| Full Build test suite | Times out locally; unverified |

---

## Addendum — your two instructions from `code-review.txt`

### "never ask user to enter the id's"  ·  "don't use the id anywhere, show the proper name"

Audited every Build surface for an id that reaches the user. **One genuine violation**, and it was the
worst kind — not a displayed id but a *demanded* one:

`features/build/approvals/request-approval-sheet.tsx` offered 8 approval entity types. Three had a
searchable picker. The other five fell through to a raw number box labelled **"Entity ID"**,
`placeholder="e.g. 42"` — the user had to know a database primary key to file an approval.

| | before | after |
|---|---|---|
| name-based selection | 3 of 8 | **6 of 8** |
| raw id input | 5 types | **none** |

`change_request` and `timesheet` gained searchable pickers; `budget` auto-selects (one per project) and
renders a read-only name chip. `document` and `client_approval` were **removed** — no list endpoint
exists for either, so the only way to use them was to already know an id. Flagged as `DECISIONS.md`
B-20; the backend enum still accepts both, so re-adding is one line once a list source exists.

Everything else that looked like an id was a prop, an `htmlFor`, or a URL segment — not user-facing
text. No table cell, tooltip, export or activity line in Build renders an id.

---

## Migrations — run under standing authorization

You told me to run migrations without waiting, fix what breaks, and run it. Doing that surfaced three
defects that a code-level audit structurally could not find, because they are disagreements between the
database and the code rather than bugs in either.

### The database and the schema had genuinely diverged
`drizzle-kit generate` wanted to emit **1,849 statements including 48 `DROP TABLE ... CASCADE`** — but
that is snapshot-vs-code drift across five programs' work, not truth. Comparing the code-derived
snapshot against `pg_catalog` directly gave the real number: **14 objects**. That distinction is the
whole finding; applying the 1,849 would have been catastrophic.

### MIG-004 — a partially-executed migration, recorded as applied (P0)
`0352_custom_fields_consolidation` drops the old custom-field tables and recreates them. It got two
creates in and stopped:

| line | statement | in DB |
|---|---|---|
| 50 | `CREATE custom_field_definitions` | ✅ |
| 85 | `CREATE hr_employment_custom_field_values` | ✅ |
| 111 | `CREATE ticket_custom_field_values` | ❌ |
| 137 | `CREATE support_ticket_custom_field_values` | ❌ |

It was still written to `__drizzle_migrations`. Both tables are declared in schema and queried by
`build/core/projects-custom-fields.service.ts` and `support/core/support-custom-fields.service.ts`, so
**every ticket custom-field read and write in Build and Support has been failing** with "relation does
not exist". Recreated from that migration's own DDL; both read paths verified against the live DB.

### MIG-005 — nine tenant tables with no RLS at all (P0)
Including Build's `managed_product_releases`. Grants reach `streamline_app` automatically through
`ALTER DEFAULT PRIVILEGES`, so a table with RLS never enabled is readable **across every tenant**.
726 of 735 `org_id` tables already had the identical policy, which is what makes these omissions rather
than exclusions. Now proven fails-closed:

```
without tenant GUC : 42501 on all five probed tables
with tenant GUC    : query succeeds, 0 rows from other orgs
```

### Migrations that could never run
Three forward migrations existed on disk but were **absent from the journal**, so `db:migrate` would
never reach them — that is why `legal_entities` was missing. Journaled in dependency order and applied.
Separately, `0421`/`0422` were blocking the entire queue; drizzle-kit exits 1 while printing the error
*behind its own spinner*, which is why they had sat there. Both were non-idempotent against a database
already moved to their target state by hand; guarded and applied.

### Result

| | before | after |
|---|---|---|
| drift (tables/columns/enums/values) | 6 / 3 / 4 / 1 | **0 / 0 / 0 / 0** |
| tenant tables with no RLS | 9 | **0** |
| forward migrations that could never run | 3 | **0** |
| `db:generate` output | 1,849 stmts (48 `DROP TABLE`) | **0 stmts** |

Rollback for the repair migration was **executed**, not just written: applied inside a transaction,
asserted to remove all 5 tables and 3 columns, then discarded, with forward state re-confirmed intact.
18 `.down.sql` files were moved out of the forward migrations directory where a stray run would have
reversed live work.

---

## Correction — the LEAKPROOF fix I recommended does not exist

I told you to run `ALTER FUNCTION app.current_org_id() LEAKPROOF;` in the Neon SQL editor. **That was
wrong.** It requires a true superuser; on this project `neondb_owner` *and* `neon_superuser` are both
`rolsuper = false` (they carry only `BYPASSRLS`), and Neon grants superuser to nobody — which is exactly
the `42501` you hit. I had also mis-stated the mechanism: the blocker is that the **search operators**
are non-leakproof (`ts_match_vq`, `similarity_op`, `textlike`, `texticlike`), not the policy's function,
so marking `current_org_id()` leakproof probably would not have fixed it either.

The underlying problem is real, and now measured rather than asserted — `tickets`, 203k rows, identical
query and data, only the role differs:

| role | plan | buffers | time |
|---|---|---|---|
| `neondb_owner` (BYPASSRLS) | Bitmap Index Scan on `idx_tickets_title_trgm` | 16 | 0.34 ms |
| `streamline_app` (RLS active) | **Seq Scan**, 204,000 rows filtered | 12,036 | 134.8 ms |

### What replaced it

Per your "targeted" decision, ticket search only: `app.search_ticket_ids` (`0424`, bounded in `0425`).
A `SECURITY DEFINER` function owned by the BYPASSRLS role — Postgres never inlines those, so the body
runs outside the security barrier and the trigram index is usable again.

It is an **id probe, not a data path**, which is what keeps the bypass narrow:

- org comes from `app.current_org_id()`, never a parameter → fails closed `42501` with no GUC (verified)
- returns **ids only**, never row data
- the caller's real query still runs under RLS **and still applies the RBAC DataScope clause**, so this
  cannot widen who sees which ticket — only which ids match the text
- `REVOKE ALL … FROM PUBLIC`, `GRANT EXECUTE` to `streamline_app` alone

### The first version was a regression, and measuring caught it

Unbounded, it materialised every matching id. For a term matching almost the whole table that was
**434 ms against the old 1 ms**, because a seq scan under `LIMIT 20` stops as soon as it has 20 rows.
So the function takes a limit, the caller asks for `cap + 1`, and falling back to plain `ILIKE` when the
cap is hit puts both regimes on their good plan:

| term | matches | before | after |
|---|---|---|---|
| `ticket` | 200,000 | 1 ms | ~4 ms |
| `199999` | 1 | 208 ms | **~2 ms** |
| `Seed ticket 12345` | 11 | 225 ms | **~12 ms** |

Result sets proven identical to the old path (200,000 = 200,000 on the broad term). Rollback executed
in-transaction and discarded, forward state re-confirmed.

**The other 16 GIN indexes are deliberately not wrapped** — your decision, recorded as B-27. They are
near-empty in dev so the win is theoretical, while each wrapper is a place a wrong `WHERE` leaks across
tenants. The rule and the five-point template are now in `CLAUDE.md` §19 for whoever hits this next.

---

## Tests — the suite is green, and it was hiding two real failures

Previously reported as *not run* (900s timeout). That limit was ts-jest compile cost, which parallelises
across workers, so four bounded batches finish comfortably: **19/19 suites, 155 tests, 0 failures.**

| batch | suites | tests | time |
|---|---|---|---|
| approvals · client-portal · forms · governance · incidents | 5 | 37 | 114s |
| core | 6 | 47 | 102s |
| execution · managed-products · meetings | 5 | 48 | 123s |
| pm-workspaces · portfolios · qa | 3 | 23 | 36s |

Running it mattered — two suites were genuinely failing:

**`whiteboard-sharing` (4 tests) — pre-existing, not from this refactor.** `dbTransaction = jest.fn()`
was a bare mock that never invoked its callback, so `withPublicToken` resolved to `undefined` and every
success-path test degraded into the `NotFoundException` branch. The tell is that every test expecting a
*failure* passed and every test expecting *success* failed. This is the `db.transaction` spec-mock trap:
whoever wrapped the public-token paths in tenant context left the mock behind, and the share-link
**view-only enforcement** — a security control on a `@Public()` route — had no effective coverage.

**`portfolios` (1 test) — mine.** The snapshot-backed rollup (the ~190× win) adds a 4th `select()`
ending in `.groupBy()`, while the spec's chain helper stopped at `.limit()`. I pointed the mock at a
snapshot row rather than an empty array, so the test now exercises the new snapshot path instead of
silently falling through to the live-count fallback.

Both fixes are to test doubles; no production code changed. Typecheck clean.

---

## Final pass — the three deferred items, now closed

You said it is not complete until migrations, schema, APIs, UI/UX and scripts are all done. The three
remaining items were all "deferred by decision", so I re-examined the decisions rather than the tasks.

### SCH-004 / PM-011 — B-16's premise was wrong

B-16 deferred this as "a PK-type migration across the whole FK graph". It isn't. `serial` is an
`integer` column plus a `nextval` default, so converting to `GENERATED ALWAYS AS IDENTITY` changes the
default and ownership and **not the type** — none of the 240 inbound foreign keys are touched. That is
what made it safe to do in one catalog-driven migration (`0426`).

| check | result |
|---|---|
| PKs converted | **65 / 65** (`attidentity = 'a'`) |
| still `serial` | 0 |
| orphaned sequences | 0 (the 64 remaining are the *new* identity sequences — `deptype='i'`) |
| `tickets` rows | 204,000 intact |
| rollback | executed in-transaction, discarded, forward state re-confirmed |

Verified beforehand that nothing inserts an explicit id, since `GENERATED ALWAYS` forbids it — the only
literal `id:` inserts in Build are on `organizations`, whose PK is text.

**The int4 ceiling is deliberately still there** (B-28): widening to bigint *is* the 240-column lockstep
change, and at ~20× headroom against the stated target it is not worth doing next to five concurrent
workstreams. `0421` is the working template when a table gets close.

### PM-014 — `managed_product_id` → `id`, end to end

`RENAME COLUMN` is catalog-only, so the 4 inbound FKs followed with no rewrite. The child tables keep
their own `managed_product_id` FK column, which is correct — that names the relationship, not the key.
This changes the API response shape, so the frontend followed: `ManagedProduct.id` plus 4 call sites.

### PM-004 — feedback merge

The audit's stated symptom was wrong, and worth correcting: per-voter dedup already existed
(`uniq_feedback_votes_post_voter` + an IP variant) and the counter is only incremented inside the same
transaction that actually inserted a vote. Duplicates don't *inflate* votes — duplicate **posts** split
demand for one idea across several rows, so the board ranks on a number that understates it.

Shipped across the stack: `duplicate_of_id` self-FK + `merged_at` + partial index; a transactional
`mergeFeedback` that moves votes while skipping anyone who already voted on the canonical (respecting
**both** the voter_key and IP unique indexes), re-points existing duplicates, and recomputes both
counters; guards that reject self-merge, an already-merged source and a merged target so chains cannot
form; `POST /build/feedback/:postId/merge` under `build:roadmap:manage`; lists hide merged posts by
default; and a UI merge action opening a **searchable title picker** — never an id — with an amber
"Merged duplicate" badge.

Proven on live data rather than asserted:

```
before:  canonical = 1 vote   duplicate = 3 votes  (one voter had voted on both)
after :  canonical = 3 votes  duplicate = 0, duplicate_of_id set, merged_at set
```

3, not 4 — the shared voter is counted once. Plus 5 unit tests covering every guard.

## Definition of Done

| | |
|---|---|
| backend `typecheck` | 0 errors |
| backend `build` (nest) | exit 0 |
| frontend `type-check` | 0 errors |
| frontend `build` (next) | exit 0, 451 pages generated |
| Build test suite | **20 suites / 160 tests, 0 failures** |
| schema drift (code vs live DB) | **0 tables / 0 columns / 0 enums / 0 values** |
| `db:generate` | **0 statements** (snapshot resynced) |
| migrations pending | 0 |
| rollbacks | every new migration has one, each **executed** in-transaction |
| tasks | **76 / 76, 0 blocked, 0 open** |

Nothing is committed, per B-04.

---

## Definition-of-Done audit — checking every line found two live bugs

You told me to check the DoD point by point rather than declare completion. Verifying instead of
assuming found four gaps behind items I had already counted as done.

### SEC-005 — separation of duties was bypassable (live)

`timesheets/core` refuses self-approval through `canActOnPeriod` — *"You cannot approve or reject
your own timesheet"*. Build's `approveEntry`/`rejectEntry`, the **second writer on the same table**,
had no such check. Anyone holding `build:timesheets:manage` could approve their own entry by going
through the Build path. These rows carry `payrollStatus`, so they reach payroll.

Fixed by importing the existing, already-tested policy rather than writing the rule a second time —
duplicating it is how the two paths diverged in the first place. `approval-guard.ts` is a
dependency-free leaf, so no import cycle. 3 tests: self-approve rejected, self-reject rejected,
approving someone else still works.

### API-013 — the rebalance job never ran (live)

The DoD line "concurrent reorders converge; rebalance job in place" was satisfied on paper by code
that could not execute:

```ts
void rebalanceProjectRanks(db, orgId, projectId).catch(() => undefined);
```

It fires *after* the request transaction commits, so it used a pooled handle with no tenant GUC →
`42501` → swallowed by the empty catch. Silent, permanent, and exactly the failure mode that once
produced zero rows in `notifications` for the life of the product. Now `registerAfterCommit` →
`runInNewTenantTransaction`, with the failure logged rather than discarded.

### UI-005 — keyboard drag worked; the announcement didn't

`@hello-pangea/dnd` provides the keyboard equivalent natively — `tabIndex`, `aria-describedby`
carrying the instructions, and the key handler (Space lifts, arrows move, Escape cancels). So the
DoD item was *nearly* satisfied. But under virtualization `react-window` injects its own
`ariaAttributes`, and it was spread **after** `dragHandleProps`:

```
dragHandleProps = { role, aria-describedby, tabIndex, draggable, … }
ariaAttributes  = { aria-posinset, aria-setsize, role: "listitem" }   ← overwrites role
```

The keys kept working and the affordance stopped being announced — a regression that is invisible to
manual testing and only shows up to a screen-reader user. Fixed by ordering the spreads so the
library's role wins while `posinset`/`setsize` survive.

### TEST-001 — query-count assertions

The DoD requires board query counts *asserted*, not just bounded. `board-query-count.spec.ts` asserts
the count is **identical for 3 cards and for 500** — the property that actually prevents an N+1 — and
within a fixed budget.

### DOC-001..004

The four documents the DoD names, now written: `build-invalidation-matrix.md` (per-mutation, with
what is deliberately *not* invalidated and why), `build-custom-fields-strategy.md` (EAV chosen, both
alternatives rejected with reasons), `build-deploy-order.md` (backend-first, the one coupled pair,
the non-migration operator steps), `build-ui-contract.md` (including the load-bearing aria ordering).

### Verification after this pass

backend typecheck 0 · nest build exit 0 · frontend type-check 0 · next build exit 0 ·
**22 suites / 165 tests, 0 failures** · schema drift 0/0/0/0 · `db:generate` 0 statements.

One migration is pending that is **not mine**: `0429_digest_queue_broadcast_audience`, from the
notifications session. I left it — nothing of mine depends on it and it belongs to work in flight.
