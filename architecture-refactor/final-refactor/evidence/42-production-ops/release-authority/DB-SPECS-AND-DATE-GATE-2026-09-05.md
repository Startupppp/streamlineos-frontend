# db-spec repair, the Date-in-sql gate, and two read-cost defects — 2026-09-05

Backend commits `2c756d48a`, `bb4dd4b63`, `e7f5854d0`, `50118928d`.
Measured against `scratch_verify_0905` (Neon, journal head 691/691, seeded).
Backend typecheck (`tsconfig.test.json`) exit 0 at each commit.

## 1. The db-specs gate: 8 failing suites, 46/46 green

Every failure was in the *test*, not in the code under test. Three of the eight were
worse than failing.

| Suite | Before | After | Cause |
|---|---|---|---|
| `chat-presence-conflict-target` | 3 failed | 6/6 | RLS on a discovery read |
| `chat-send-conflict-target` | 4 failed | 7/7 | RLS on a discovery read |
| `chat-read-path-hardening` | 2 failed | 12/12 | RLS on a discovery read |
| `hr-dashboard-attendance-grain` | 0/2 | 2/2 | fixture org no seeder creates |
| `hr-import-attendance-idempotency` | 0/2 | 2/2 | fixture org no seeder creates |
| `hr-analytics-plus-department-filter` | **9/9 vacuous** | 9/9 biting | fixture org no seeder creates |
| `journal-completeness` | 3 timed out | 3/3 | 4,200 round trips |
| `workflow-publish-lost-update` | 3 failed | 5/5 | **accused correct code** |

Not repaired: `crm-permissions-reach-somebody`. CRM is out of release scope under
PRD-C157, so it is reported rather than fixed.

### `kbprobe-a` — an organisation that exists nowhere

Three HR specs opened with `const ORG_ID = "kbprobe-a"`. That string appears in those
three files and **nowhere else in the repository** — no seeder, no migration, no fixture
builds it. It was an org on one developer's database.

Two of the three threw on every other machine. The third is the one worth reading twice:
`hr-analytics-plus-department-filter` asserts *"the call resolves"* and *"the filtered page
is empty"*, and a **non-existent org satisfies both for free**. It reported green while
proving nothing about the filter it exists to pin, which is why it never appeared on any
failure list.

The fixture is now built rather than looked up (`test/helpers/probe-org.ts`).
`buildAttendanceAnalytics` divides by active members, so the org must hold exactly one for
the arithmetic to be exact; the seeded scratch org holds 25+.

Two facts the database supplied rather than the code:

* `organizations.owner_membership_id` is NOT NULL and references a membership that
  references the organisation. `fk_organizations_owner_membership` is DEFERRABLE INITIALLY
  DEFERRED precisely so the cycle closes inside one transaction — the same technique
  `seed-scratch-e2e.mjs` uses.
* Teardown may **not** delete the membership. `trg_guard_owner_membership` raises
  *"Cannot delete the owner membership. Transfer ownership first."* It resolves the pointer
  **from the organisation row**, so deleting the organisation first stands the guard down and
  `ON DELETE CASCADE` takes the membership. Disabling the trigger would have worked and would
  have made every probe teardown a place where an ownership invariant is quietly suspended.

For the third spec, `ORG_ID` moves to the seeded reference tenant and a floor is added: at
least 2 of the 4 drilldown metrics must carry rows before the filter assertions count.
Bite-proved by pointing `SEED_ORG_ID` back at `kbprobe-a` — the floor fails while the other
8 tests stay green, which is exactly the finding. A floor rather than a per-metric
requirement because `attrition` and `cases` have no seeded rows today, and failing on that
would report a seed gap as a filter regression.

### `workflow-publish-lost-update` — a test accusing working code

The suite ran two "concurrent" publishes with `sql.begin` twice on **one** postgres.js
instance. Measured against Neon, they do not overlap:

```
A: read version=3        # one shared client, max: 4
A: update returned 1 row(s)
B: read version=4        # B never started until A committed
B: update returned 1 row(s)
won: [ true, true ]      final version: 5
```

Two *sequential* publishes both win legitimately — and the suite reported that as the lost
update it was written to catch, against a service whose compare-and-set
(`workflows-crud.service.ts:238`) is correct. The identical statements on two separate
connections:

```
B: read version=3        # one connection each
A: read version=3
B: update returned 1 row(s)
A: update returned 0 row(s)
won: [ false, true ]     final version: 4
```

Each racer now gets its own connection, and the suite **asserts the interleaving it depends
on** (`both editors read the same version`) rather than assuming it. A concurrency test that
cannot show it achieved concurrency proves nothing in either direction. The bite-proof case
needed the same fix for the opposite reason: in series the id-only predicate *also* produces
two winners, so it had been passing for the reverse of its intended reason. Stable across
3 consecutive runs, 5/5.

### `journal-completeness` — the fixture could not finish

Not a logic failure. It planted 100 run employees and 1,300 line items one `tx.execute` at a
time: **1,400 sequential round trips per test, 4,200 across the suite**, at roughly 450 ms
each against a Neon branch in another region. All three tests hit the 180 s cap having
planted nothing.

Replaced with `generate_series` for the employees and a `CROSS JOIN` against the component
list for their line items — same rows, same `profileIds[i % n]` assignment, same
`EXPECTED_LINE_ITEMS` check afterwards. **180,000 ms of timeout to roughly 3,000 ms per
test. No timeout was raised.**

## 2. `check:date-in-sql-template` replaces `check:date-in-sql`

A JS `Date` interpolated into a drizzle ``sql`…` `` template is a **runtime crash**, not a
type error, and is invisible to `tsc`. Verified through the real drizzle + postgres-js stack
against a live Neon branch — not the driver's own template, which serialises Dates fine and
is what produced a false all-clear once before:

```
RAW Date: THREW  -> Failed query: select ... where created_at < $1
RAW Date: cause  -> The "string" argument must be of type string or an
                    instance of Buffer or ArrayBuffer. Received an instance of Date
ISO+cast: OK
```

`check:date-in-sql` (added the same day, `011d817ce`) is a textual scan whose own header
declares the trade: *"PRECISION OVER RECALL … at the cost of missing some inferred-type
cases."* Almost every real site **is** an inferred-type case — `const now = new Date()`,
`const lease = leaseExpiry(...)`, a narrowed cursor field — because nobody annotates a local
as `: Date`.

Measured, not argued. With three of the fixes below reverted, the textual gate printed
**`check:date-in-sql PASSED`** over three live crash sites. The type-directed replacement
finds those three *and* re-finds the two chat sites `011d817ce` fixed, proved by reverting
that fix and watching the new gate name both lines.

The weaker gate was deleted rather than kept alongside: two gates for one rule, where one
reports green over the same code, is worse than one gate. Its anti-vacuity floors were
ported across — below 1,000 files or 50 templates it exits **2 INCONCLUSIVE**, because a
collector that stops matching reports the one outcome indistinguishable from success.

Nine further crash sites fixed, each invisible to every static check:

| Site | Blast radius |
|---|---|
| `hr-timeline` `afterPosition` | every employment-timeline page past page 1 |
| `documents` list cursor | every document-list page past page 1 |
| `hr-benefits` `checkEnrollmentWindowOpen` | the enrollment-window gate itself |
| `engagement-badges` `employeeOfMonth` | — |
| `incentives` `thisMonth` aggregate | — |
| `crm import-pump` claim lease | CRM, out of scope; one-line crash fix |

Sweep now **6,023 files / 3,168 templates / 0 hits**. Self-test asserts both directions: a
bare `Date` and `Date | null` are caught; `.toISOString()`, a string, a number and every
drizzle `SQL`/`Column` wrapper are not. Wired into `ci.yml`; `check-gate-wiring` green at
**102 gates**.

## 3. Two read-cost defects (PRD-C142)

### Two budgets had never measured, on any database

`leave-requests-mine` and `attendance-mine` both died on

```
bind message supplies 1 parameters, but prepared statement "" requires 2
```

`runBudget` binds `rowCountSql` with `[orgId]` alone while both reference `$2`. Neither has
ever produced a measurement — **including on the production-shaped seed PRD-C142 is judged
on**. The gate reported them among twenty breaches, which reads as two budgets over ceiling
rather than two budgets that never ran.

Fixed with an optional `rowCountParams` hook so the seed floor is counted at the **same
scope** the measured query uses — not by dropping the membership filter, which would have
widened the count to the whole org and let the budget clear its floor on rows the query
cannot return. The validator now rejects the shape at load time instead of deferring it to
bind time.

This was invisible because `perf-seed-forward-window.db.spec.ts` ran `budget.sql` and never
`budget.rowCountSql`. That arm is now closed.

### Coverage counted budgets that never ran

The coverage line counted a `seed-too-small` budget as *"produced a non-empty measurement"*:
on the reference profile those land as outcome `fail`, and `measured` filtered only on
`pass|fail` minus vacuous. `runBudget` returns **before** the `EXPLAIN` loop, so those
budgets measured nothing at all.

On the scratch branch the reported figure moves **down**, 70/75 (93.3%) → **55/75 (73.3%)**
— 15 budgets were being counted for a query they never ran. The manifest's own 63/300 is
unaffected; it already separates `seed-too-small` from measured.

**No ceiling, floor, threshold, denominator or allowlist was changed anywhere in this
document.** Every number that moved, moved because the measurement was corrected.
