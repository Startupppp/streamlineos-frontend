# v2 ticket 03 — Migration baseline and catalog parity

Every number below came from a command I ran and read the output of. No connection string appears
in this file. No git write command was run; the SHA was read with `git rev-parse`.

## Release identity (PRD-C056)

| | |
|---|---|
| repo | `streamlineos-backend` |
| branch | `release/code-10-10-v2` |
| SHA at the final measurement | `65a7328718b85a06d7662789e14e440f1f40c539` |
| working tree | carries this release's uncommitted work from ~14 agents; the SHA alone does not describe what was measured |
| journal entries | **677** (`0000_light_vance_astro` … `1053_t03_inv_user_warehouse_grant_cascade`) |
| journal head `when` | `1803000010128` |
| `_journal.json` sha256 | `a441443df45db38bd0b00361529368f0d04288eb8fe6930f5ead761fbe634ae8` |
| chain digest (sha256 over `tag:sha256(file)`, journal order) | `80840c7e98c0a869483392e0a204294b6ca6f1e5c55d85e2346443a9ae4c1f30` |
| server | PostgreSQL 18.4 (Homebrew), `127.0.0.1:5432`, role `tarunchintakunta` |

The digest was captured immediately **before** and immediately **after** the three bootstraps and is
identical, so all three ran against the same chain. That check exists because the journal moved
under me twice during this ticket (672 → 674 → 677) as the payroll and HR agents landed migrations.

### Databases measured

| database | oid | size | how it was built | ledger |
|---|---|---|---|---|
| `scratch_t03v2_c1` | 7531484 | 106 MB | one-shot `db-bootstrap.mjs` from empty | 677 |
| `scratch_t03v2_c2` | 7531485 | 106 MB | one-shot `db-bootstrap.mjs` from empty | 677 |
| `scratch_t03v2_ir` | 7531486 | 106 MB | **SIGKILLed four times and resumed** | 677 |
| `scratch_t03v2_cold` | 7467954 | 106 MB | `replay-chain-cold.mjs` (different toolchain) | 677 |
| `scratch_t03v2_head` | 7404377 | 106 MB | one-shot clean bootstrap, gate target | 677 |

Nothing cited by another ticket was touched: `scratch_boot_b/c/d`, `scratch_perf_seed*`,
`scratch_gates_head`, `scratch_gates_cold` and every `cornerstone_*` are as I found them.
(`scratch_boot_b` was already **empty — 0 tables** when I arrived. Report 02 of release v1 cites it
as parity evidence. Not mine; flagged below.)

## PRD-C055 — three bootstraps compared. PASS, differences = 0

### The interrupted one, which did not exist before this ticket

New tool: `src/scripts/bootstrap-interrupt-resume.mjs` (`pnpm bootstrap:interrupt-resume`).
It spawns `db-bootstrap.mjs` as a child, follows its stdout, and sends **SIGKILL** the instant the
requested number of migrations has been acknowledged. SIGKILL, not SIGTERM — a signal the process
can unwind from proves nothing about a crash. Self-test 11/11, exit 0. It refuses a target whose
database name does not contain `scratch` (proved: exit 2 against `postgres`).

At each kill it measures three things **from `pg_catalog`, never from an exit code**:

```
--- interruption 1: SIGKILL after 120 acknowledged ---   in flight 0393_payroll_lifecycle_worker_subject
--- interruption 2: SIGKILL after 338 acknowledged ---   in flight 0617_cell_relocation_and_placement_decisions
--- interruption 3: SIGKILL after 551 acknowledged ---   in flight 0866_pay_support_actor_validate
--- interruption 4: SIGKILL after 664 acknowledged ---   in flight 1041_t22c_attendance_membership_history_index
    PASS  process died to the signal
    PASS  ledger rows == acknowledged migrations
    PASS  no backend left attached
    PASS  in-flight migration left nothing behind
--- resume ---            PASS exit 0 · PASS reached head 677/677 · PASS ledger == journal
                          PASS resume skipped exactly what survived the last kill
--- idempotency re-run — PASS re-run is a no-op (0 ok / 677 skip / exit 0)
RESULT: INTERRUPTED BOOTSTRAP REACHED HEAD  4 interruption(s), 0 invariant failures   exit 0
```

`ledger rows == acknowledged` is the invariant that catches a ledger row written before its own DDL
commits: a surplus row would appear here and nowhere else. `in-flight migration left nothing behind`
parses the killed migration's `.sql` for the tables it creates and columns it adds and asserts none
of them exist. Both held at all four kill points, and at three further kill points in an earlier run
at journal 672 (150/400/600) and a four-kill run at 674 (97/311/527/661) — **eleven real SIGKILLs
across three runs, zero invariant failures.**

### The catalog diff, all ten required classes plus three

`compare-bootstraps.mjs` compares DEFINITIONS, not names (`pg_get_constraintdef`, `indexdef`, policy
`cmd`/`roles`/`qual`/`with_check`, function body digest, `pg_get_triggerdef`, `relrowsecurity` **and**
`relforcerowsecurity`, enum sort order, column default/identity/generated/collation). Self-test 6/6.

| category | c1 vs c2 | c1 vs interrupted | c2 vs interrupted | count |
|---|---|---|---|---|
| tables | PASS | PASS | PASS | 1027 |
| columns | PASS | PASS | PASS | 13536 |
| constraints | PASS | PASS | PASS | 14037 |
| indexes | PASS | PASS | PASS | 4764 |
| policies | PASS | PASS | PASS | 983 |
| functions | PASS | PASS | PASS | 468 |
| triggers | PASS | PASS | PASS | 169 |
| extensions | PASS | PASS | PASS | 5 |
| enums | PASS | PASS | PASS | 2325 |
| **rlsState** | PASS | PASS | PASS | 983 |
| sequences | PASS | PASS | PASS | 771 |
| views | PASS | PASS | PASS | 0 |
| migrationLedger | PASS | PASS | PASS | 677 |

`RESULT: SCHEMAS IDENTICAL  differences=0` · exit 0 on all three pairs.

**Fourth, informational: a different toolchain.** `scratch_t03v2_cold` was built by
`replay-chain-cold.mjs`, which uses its own `drizzle.__replay` ledger and its own statement splitting.
Against `c1`: all twelve catalog categories PASS, `differences=1`, and the one difference is
`migrationLedger A=677 B=-1` — the comparator cannot read a ledger table that is deliberately named
something else. Two independent implementations of "apply the chain" produce the same catalog.

### A provisioning defect in the cited gate databases

`scratch_gates_head` and `scratch_gates_cold` — the targets in `.env.gates` for four drift gates —
both carry the extension **`btree_gin` 1.3**, which no migration creates and which a clean bootstrap
does not install. Comparing `scratch_t03v2_a` against `scratch_gates_cold` reports
`differences=89`: 1 extension and the 87 functions it brings, plus the ledger-name difference.

That is not cosmetic. Migration `0542_hr_employments_custom_field_gin_index.sql` says in its own
header: *"Leading a GIN index with org_id would require the btree_gin extension, **which this
deployment does not install**."* An index-strategy decision was reasoned from an assumption that is
false on the databases the gates measure. `scratch_gates_cold` also holds no
`drizzle.__drizzle_migrations`, so `check:migration-ledger` cannot be run against it at all.
**Recommendation:** repoint `.env.gates` at a bootstrap produced by `db-bootstrap.mjs` alone.

## PRD-C053 / PRD-C060 — the referential-action finding

### What the ~30 FK mismatches actually were

The brief framed `verify:membership-revocation`'s 33 failures as declaration-versus-migration drift.
**It is not.** I joined all 33 against the Drizzle declaration mechanically:

```
inventory-vs-catalog FAILs: 33 | also a Drizzle-vs-catalog mismatch: 0 | Drizzle AGREES with catalog: 33
```

For every one of the 33, the Drizzle declaration and `pg_constraint` agree. Spot-verified by hand:
`notification_preferences` declares `.onDelete("cascade")` at `db/schema/common/notifications.ts:186`,
migration `0901` creates CASCADE, the catalog holds `confdeltype='c'`. Only
`MEMBERSHIP_ARTIFACTS` said `set-null`, in prose that asserted a catalog state that never existed.

`MEMBERSHIP_ARTIFACTS` is read by **nothing in the runtime** — grep across `src/` returns
`verify-membership-revocation.ts`, `check-restrict-fks.mjs` and four spec files, and nothing else.
So 0839's claim that "calendar events are handled explicitly through MEMBERSHIP_ARTIFACTS instead"
describes a mechanism that does not exist.

### Classification, and what I changed

| direction | n | verdict | action taken |
|---|---:|---|---|
| inventory `set-null`, catalog `cascade` | 29 | catalog is right | inventory corrected to `cascade` |
| inventory `set-null`, catalog `RESTRICT` | 2 | **real bug** | **migration 1051** → `SET NULL (col)` |
| inventory `set-null`, catalog `NO ACTION` | 1 | deliberate, escalated | inventory corrected to `blocks-removal` |
| inventory `cascade`, catalog `set-null` | 1 | **real bug** | **migration 1053** → `CASCADE` |

The 29 are join / ACL / preference / per-user-state rows. `org_id` leads every one of those composite
keys and is NOT NULL, so a bare `ON DELETE SET NULL` would raise 23502 on every revoke rather than
orphaning anything — CASCADE is both what the database does and what is correct.

**Bite proof, not inference.** Seeded one org, two memberships, one `performance_reviews` row, one
`hr_mood_checkins` row and one `inv_user_warehouses` grant, then deleted the non-owner membership:

```
BEFORE (head 674):  ERROR: update or delete on table "organization_members" violates RESTRICT
                    setting of foreign key constraint "fk_performance_reviews_reviewer_actor"
                    AFTER victim_rows=1  reviewer_null=0  mood_null=0  grants_remaining=1
AFTER  (head 677):  AFTER victim_rows=0  reviewer_null=1  mood_null=1  grants_remaining=0
```

`verify:membership-revocation` went **exit 1 (33 FAIL) → exit 0 (0 FAIL)**.

### calendar_events — NOT changed, escalated

`fk_calendar_events_org_creator_membership` is NO ACTION and blocks a hard membership delete. That is
**deliberate**: `0831` made it `SET NULL (created_by_membership_id)`, and `0839` reverted it because
the column is NOT NULL — a column list restricts *which* columns are nulled, it does not make a NOT
NULL column nullable, so SET NULL there trades a recoverable 23001 for an unavoidable 23502. `0839`
is correct on that point. `calendar-departed-actor.spec.ts` pins all of it with three assertions
("departure must be a soft status change").

Fixing it needs `created_by_membership_id` to become nullable. That reverses a documented decision,
breaks a spec in the calendar territory, and is a product call about hard deletion and GDPR erasure —
not a reconciliation. **I corrected the inventory to `blocks-removal`, which is the truth, and left
the behaviour alone.** Soft revocation works today; a hard `DELETE FROM organization_members` for a
member who ever created a calendar event does not.

## Why `check:restrict-fks` and `check:set-null-column-lists` pass — measured, not guessed

They pass **correctly**. Each asks something strictly weaker than the question:

- **`check:restrict-fks`** never opens a database — no `postgres` import, no URL, pure text scan of
  `src/db/schema/**`. It finds FKs *declared* restrict/no-action and asserts the table appears in
  `MEMBERSHIP_ARTIFACTS` **with any `onRemoval` value** (`parseCoveredTables`). An entry declaring the
  exact opposite action satisfies it. It can detect a *missing* ruling, never a *wrong* one.
- **`check:set-null-column-lists`** is catalog-only: for FKs already `confdeltype='n'` it asks whether
  `confdelsetcols` is present. It never reads what was declared.
- **`check:declaration-constraint-drift`** compares declaration to catalog but on **existence only**,
  and its control C deliberately accepts any live FK to the same parent whose column list *contains*
  the declared one — exactly the composite-FK rewrite — comparing no action at all.

**Measured**: the strings `confdeltype` and `onDelete` appear **0 times** across all four files of
`src/scripts/declaration-constraint-drift/`. Nothing in the repo compared a referential action.

### New gate: `check:referential-action-drift`

`src/scripts/check-referential-action-drift.ts` (+ `:self-test`, `:baseline`). Self-test **32/32**,
exit 0, with bite proofs for every control. Against `scratch_t03v2_head`:

```
Schema source: 924 named foreign keys, 771 carrying an explicit .onDelete()
Declared foreign keys 2288 · Live 3199 · matched 2184 · unmatched declarations 104 (reported, never failed)
Mismatches 62 hard + 1 weak — DESTRUCTIVE 27 · PERMISSIVE 32 · BLOCKING 3 · ORPHANING 0
Of the 62: 13 CONTRADICT an explicit .onDelete(), 42 sit under a foreignKey() that stated nothing, 7 are auto-named
```

**62 foreign keys act differently from what the schema declares**, and the set is identical on my
clean bootstrap, my interrupted bootstrap and `scratch_gates_head` — a genuine disagreement, not a
provisioning artifact. Disjoint from `verify:membership-revocation`'s 33: that gate sees none of
these, and this gate sees none of those, because they compare different pairs of the three sources.

The 13 that contradict an **explicit** declaration are the real bugs:

| verdict | constraint | declared | live |
|---|---|---|---|
| DESTRUCTIVE | `hr_employments.fk_hr_employments_org_person` | restrict | **cascade** |
| DESTRUCTIVE | `project_members.fk_project_members_member_actor` | restrict | **cascade** |
| DESTRUCTIVE | `ticket_assignees.fk_ticket_assignees_member_actor` | restrict | **cascade** |
| DESTRUCTIVE | `worker_engagements.fk_worker_engagements_org_worker` | restrict | **cascade** |
| PERMISSIVE ×8 | `tickets` (assignee, reporter), `leave_requests` ×3, `helpdesk_tickets`, `project_approvals`, `wfh_requests` | restrict | set null |
| BLOCKING | `payroll_run_employees.fk_payroll_run_employees_org_worker` | set null | restrict |

Four places wrote `.onDelete("restrict")` precisely to stop a row being destroyed, and the database
CASCADEs. Deleting one `hr_people` row destroys its `hr_employments`. Eight more wrote `restrict` to
make a reference un-deletable and the database silently nulls it instead.

**Not fixed in this ticket.** Each needs a per-relationship product decision and most sit in other
territories (build, HR, payroll, support). Baselined at 62 so the gate is a working ratchet — it now
exits 0 and fails on the 63rd. **The baseline is a ratchet, not an acceptance.**

## The systemic conclusion the coordinator asked for

Four independent declaration-vs-catalog disagreements, found by four agents, in **three different
directions**, plus my 62:

| # | case | direction |
|---|---|---|
| 1 | `invoice_items.org_id` | in catalog (NOT NULL, RLS-policied), absent from declaration |
| 2 | `roster_entries` index + FK | declared, absent from catalog (now fixed by 1052) |
| 3 | the 33 membership FKs | declaration and catalog AGREE; the *inventory* was wrong |
| 4 | `inv_user_warehouses` FK | in a migration only, absent from the declaration |
| 5 | **62 FK ON DELETE actions** | declared action ≠ catalog action |

**Does the evidence support `drizzle-kit push` as the mechanism? Partly, and I will not overclaim.**
It is consistent with cases 1 and 4 — DDL that reached the database without passing through a
declaration is exactly what a `push` produces, and `0489`/`0591b`/`0619` being reverse-generated from
`pg_catalog` captured the result rather than the intent. But case 5's dominant sub-class is
**different and larger**: 42 of the 62 sit under a `foreignKey({...})` that simply never wrote an
`onDelete`, while a hand-authored migration set CASCADE. That is not a push; that is a convention in
which the migration is treated as the source of truth for referential actions and the declaration is
written for the type system only. `guard-db-generate.mjs` exists and `drizzle-kit generate` is
unusable here, so nothing was ever going to reconcile the two directions. **The mechanism is the
absence of a gate on this axis, not one bad tool run** — which is why the gate above is the fix.

## What `check:declaration-column-drift` and `check:declaration-constraint-drift` actually cover

**`check:declaration-column-drift`** — measured at head, exit 0:

```
Live columns 12262 · tables compared 873 · live-but-undeclared tables 105
Undeclared-but-harmless live columns (nullable or defaulted) 155 — reported, not failed
Undeclared live columns supplied by a BEFORE INSERT trigger 22 (of 149 such triggers) — reported, not failed
  public.invoice_items.org_id — supplied by BEFORE INSERT trigger trg_set_org_id — undeclared on purpose
```

**It does see `invoice_items.org_id`, by name, and downgrades it deliberately** — its docblock names
`invoice_items` as the worked example. The downgrade is right for the write path (the trigger supplies
the value, so no 23502). **The answer to "how many others": 22 tables in exactly that shape.** So it
is a convention, not a bug — but an undocumented one, and it has a cost the gate does not price: a
tenant column absent from the declaration cannot be selected through Drizzle's relational API or used
in an application-level tenant predicate, so `invoice_items` depends entirely on RLS plus a trigger,
and no gate asserts `trg_set_org_id` still exists on all 22.

**`check:declaration-constraint-drift`** — measured at head, exit 0:

```
Declared tables 873 · declared constraints/indexes 4948
Live indexes 4323 · live constraints 5494 · tables compared 873 · declared-but-absent tables 0
Reported, never failed — name drift 370 · partial-predicate mismatch 38 · live-but-undeclared 1187
Integrity findings 136 (0 new) · performance findings 51 (0 new) · baseline 187
```

Its reach, precisely:

- **Compares**: declared uniques (`unique()` + `uniqueIndex()`), declared plain indexes, declared
  foreign keys, declared checks — against `pg_index` and `pg_constraint` (excluding `contype='n'`).
- **On foreign keys and checks it matches by NAME ONLY.** No column list, no referential action, no
  `pg_get_constraintdef`. A live FK with the declared name satisfies it whatever it does.
- **Does not look at columns at all** (that is the sibling gate) — so case 1 is out of scope by design.
- **`live-but-undeclared` is 1,187 objects, reported and never failed** — case 4's shape.
- It currently exits **0 over 187 baselined findings** (104 foreign-key, 51 index, 26 check, 6 unique)
  that genuinely do not exist at head. Green means "no NEW absence", not "no absence".

So: it passed over case 1 because columns are not its population, over case 4 because
live-but-undeclared never fails, and over case 5 because it compares no action.

**Case 2 is different, and it is the sharper finding.** `roster_entries` was NOT invisible to this
gate — both objects were sitting IN its baseline the whole time:

```
- "foreign-key:public.roster_entries:fk_roster_entries_user_actor"
- "index:public.roster_entries:idx_roster_entries_org_user_membership_date"
```

(those two lines are the HR agent's diff removing them after migration 1052 created the objects).
The gate detected the drift, classified it INTEGRITY, and then **exited 0 because it was accepted**.
An agent running `check:declaration-constraint-drift` and reading `exit 0` would conclude the schema
was clean while 187 declared constraints and indexes did not exist — 104 of them foreign keys.

That is the more useful lesson than "the gate is too narrow". Its reach is genuinely narrower than
its name (no columns, no actions, name-only FK and CHECK matching), **but its louder failure mode is
that a green exit code means "no NEW absence", and nothing in the output line a reader skims says so.**
Both matter; only the second one is what actually misled people here.

## Recommendation on `MEMBERSHIP_ARTIFACTS` (asked for explicitly)

**Check it with a gate; do not generate it.** Generating it from the catalog would destroy the only
thing it is good for — recording *intent*, which is what surfaced the two RESTRICT bugs in the first
place. A generated inventory would have said "RESTRICT" and nobody would have asked why. But an
intent inventory nothing reads and nothing checks rots, and it rotted here into 33 false statements
including one that a migration comment then cited as a mechanism. The gate already exists in embryo:
`verify:membership-revocation`'s third half is exactly the check, and it is a `verify:` script that no
CI job runs. **Promote it to `check:membership-artifact-actions`, wire it into the gate list, and keep
the `reason` prose.** Two supporting facts: `membership-artifact-fk-coverage.spec.ts` already pins the
inventory-vs-declaration axis as a shrink-only list, and I shrank it 72 → 40 in this ticket.

## Gate results — every exit code I read, against `scratch_t03v2_head` (clean bootstrap, 677/677)

| command | exit | what it produced |
|---|---:|---|
| `check:migration-chain` | **0** | `PASS migration chain verified` |
| `check:migration-ledger` | **0** | 677 applied vs 677 journal, 0 pending, no orphan/duplicate |
| `check:migration-discipline` | **0** | clean |
| `check:migration-rollback` | **1** | 3 violations, **none mine** — 1049, 1050 (payroll), 1052 (HR) have no `.down.sql` and no `-- @irreversible`. My 1051 and 1053 both ship rollback files and pass. |
| `check:drop-column-safety` | **0** | clean |
| `check:declaration-column-drift` | **0** | 12,262 live columns; 22 trigger-supplied, 155 harmless |
| `check:declaration-constraint-drift` | **0** | 136 integrity + 51 performance, 0 new, baseline 187 |
| `check:tenant-relationships` | **0** | `Actionable 0` (79 CRM + 134 Inventory + 1 platform-global excluded) |
| `check:tenant-indexes` | **0** | 840 tenant tables, 840 leading tenant indexes |
| `check:restrict-fks` | **0** | clean (and see above for why that is weaker than it reads) |
| `check:set-null-column-lists` | **0** | clean |
| `check:replay-ledger` | **0** | against my fresh `scratch_t03v2_cold`: 677/677, `LEDGER STATE: CLEAN` |
| `check:baseline-integrity` | **0** | clean |
| `pnpm db:verify-rls` | **0** | `RESULT: RLS VERIFIED` |
| `pnpm verify:membership-revocation` | **0** | was exit 1 / 33 FAIL; now `Inventory vs FKs: PASS` |
| `check:referential-action-drift` (new) | **0** | 62 baselined, 0 new; **exit 1 before the baseline** |
| `check:referential-action-drift:self-test` | **0** | 32/32 |
| `bootstrap:interrupt-resume:self-test` | **0** | 11/11 |
| `compare-bootstraps.mjs --self-test` | **0** | 6/6 |
| `pnpm typecheck` | **0** | `tsc --noEmit -p tsconfig.build.json`, 8 GB heap |
| `jest` — 4 membership/calendar suites | **0** | 67 passed / 67 |

`check:replay-ledger` exited **1** against `.env.gates`' `scratch_gates_cold`, which is stranded at
journal 672 and 5 entries behind head. Not a chain defect — a stale evidence database.

## Files changed

```
migrations/1051_t03_membership_removal_restrict_to_set_null.sql          (new)  idx 807  when 1803000010126
migrations/1053_t03_inv_user_warehouse_grant_cascade.sql                 (new)  idx 809  when 1803000010128
migrations/rollback/1051_t03_membership_removal_restrict_to_set_null.down.sql   (new)
migrations/rollback/1053_t03_inv_user_warehouse_grant_cascade.down.sql          (new)
migrations/meta/_journal.json                                            (2 entries appended)
src/db/schema/hr/performance.ts                                          onDelete restrict -> set null
src/db/schema/hr/engagement-extras.ts                                    onDelete restrict -> set null
src/db/schema/inventory/warehouses.ts                                    declares fk_inv_user_wh_user_mbr (cascade)
src/modules/organization/core/membership-artifacts.ts                    33 rulings corrected + reasons rewritten
src/modules/organization/core/membership-artifact-fk-coverage.spec.ts    pinned list shrunk 72 -> 40
src/scripts/bootstrap-interrupt-resume.mjs                               (new)
src/scripts/check-referential-action-drift.ts                            (new)
src/scripts/baselines/referential-action-drift.json                      (new)
package.json                                                             +5 scripts
```

`src/scripts/` is shared with ticket 30: I **created** three files there and **edited none**.

### Artifact hashes (sha256, first 16)

```
src/scripts/bootstrap-interrupt-resume.mjs                       e3623490d84bfc60
src/scripts/check-referential-action-drift.ts                    92a1a34e0f5fe34a
migrations/1051_t03_membership_removal_restrict_to_set_null.sql  1223931dfe522295
migrations/1053_t03_inv_user_warehouse_grant_cascade.sql         fcbd818a9a69ef27
src/scripts/baselines/referential-action-drift.json              444562122e3ff0f9
migrations/meta/_journal.json                                    a441443df45db38b
```

Logs for every run: `…/scratchpad/t03v2/` (`f-boot-*.log`, `f-interrupt.log`, `f-cmp-*.log`,
`g-*.log`, `memrevoc*.log`, `refaction*.log`, `cold-replay.log`, `bite.sql`).

## Honest gaps

- **PRD-C054 (obsolete-schema removal) — nothing removed, and nothing should be.** The six-way
  evidence bar (symbol, raw table name, FK, migration, barrel, integrity spec) was not met for any
  candidate, and `declaration-constraint-drift` reports 1,187 live-but-undeclared objects, which is
  precisely the population where a deletion would be most tempting and least safe. Not attempted.
- **The 62 referential-action mismatches are baselined, not fixed.** 13 contradict an explicit
  declaration; 4 of those are DESTRUCTIVE. They need per-relationship product decisions in the build,
  HR, payroll and support territories.
- **`calendar_events` still blocks a hard membership delete.** Deliberate, spec-pinned, escalated.
- **The 22 trigger-supplied tenant columns have no gate on the trigger itself.** If `trg_set_org_id`
  were dropped, 22 tables would 23502 on insert and nothing static would notice.
- **Measured on local PostgreSQL 18.4, not Neon.** The `ON DELETE SET NULL (col)` form needs PG15+;
  488 constraints at head already use it, so it is established, but I did not run against Neon.
- **`scratch_boot_b` was already empty when I arrived** (0 tables), and release v1's report
  `02-bootstrap-parity.md` cites it as evidence. Someone reset it. My `scratch_t03v2_c1/c2/ir/cold`
  supersede it at a newer head.
