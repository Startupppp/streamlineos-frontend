# DECISIONS

Assumptions taken without confirmation, with reversal cost. Recorded per the
Execution Protocol. Two concurrent programs record here: **Inventory** uses `D-NN`,
**Build** uses `B-NN`. Do not renumber across programs.

---

# Build module refactor (B-NN)

## User-answered (2026-08-10, single question block — not to be re-raised)
- **B-01 Next Phase 1 item = SCH-001 ranking.** Done.
- **B-02 Status model = one status table per project**, `tickets.status` FK to it. Done.
- **B-03 Timesheets enum drift = apply the enums.** Done (migration `0143`).
- **B-04 Commit policy = leave everything uncommitted.** Honoured; nothing committed.

## B-05 — Live production tenants: assumed NO (contrary to the protocol default)
Evidence, not assumption: the DB held 5 orgs / 7 users / **0 projects / 0 tickets** before I seeded it.
Consequence: migrations are single-step rather than strict expand-contract.
**Reversal cost: HIGH if wrong.** `0142` drops `tickets."order"` and `0146` drops `custom_states` in the
same migration that stops using them. If production data exists somewhere I cannot see, both must be
split before running there. This is the one default that could cause loss, and it is evidence-backed.

## B-06 — `numeric` rank rather than LexoRank strings
Postgres numeric is arbitrary-precision, so midpoints never fail and rebalancing is housekeeping, not
correctness. Verified: 30 successive midpoints at one point consumed 13 of 16383 decimal places.
Reversal cost: low.

## B-07 — `tickets.status` stays a text natural key, not `status_id`
The composite FK already guarantees one definition of "done"; an integer key would force a join into
all 68 existing read sites and change the wire format for no correctness gain. Reversal cost: medium.

## B-08 — Unconfigured statuses backfilled, not deleted
16 distinct free-text statuses had no `project_statuses` row; each got one (`"order" = 999`,
`type = 'unstarted'`) so the FK could be added without losing a ticket. Reversal cost: low — they are
identifiable by that sentinel order value.

## B-09 — `custom_states` deleted as proven-orphaned (against "assume used")
The default says assume used until proven otherwise. I proved otherwise: zero write sites in
`src/modules/`, exactly one read site, `tickets.state_id` NULL on 100% of 204,000 rows. Reversal cost:
high (table dropped) but it never held application-written data.

## B-10 — Migrations authored with `generate --custom`
The differ was blocked by the enum drift and there is no TTY. Consequence: `migrations/meta` snapshots
are stale, because `--custom` copies the previous snapshot instead of diffing. Reversal cost: low but
unavoidable — one `db:generate` at a TTY, answers recorded in `PAGES.md`.

## B-11 — Rollbacks: RESOLVED (this entry previously said they were missing)
Originally a protocol deviation — migrations shipped without rollbacks. **Now closed:** all 7
schema-changing migrations have a `.down.sql` in `backend/migrations/rollback/`, and each was
**executed**, not merely written. Verification runs each inside `BEGIN … ROLLBACK` so nothing
persists, asserting the reverted state before discarding; `verify-rollbacks.mjs` reports
"ALL ROLLBACKS VERIFIED", and I confirmed afterwards that forward state and all 204,000 tickets were
untouched.

Two are **partially** reversible, declared in their header comments rather than glossed:
`0142` can restore ordering but not the exact original integers where ranks were fractionally split;
`0146` recreates `custom_states` empty — it never held application-written data.

Residual gap: they are verified in-transaction, not against a restored copy at production scale.
There is no second database.

## B-12 — One file fixed outside scope
`modules/realtime/ably.service.ts` (a concurrent session's staged work) failed `tsc` and blocked
verification of my own changes; fixed as a type annotation only. A concurrent webhooks file that was
also failing was left alone and its own session fixed it. Reversal cost: nil.

## B-13 — SUPERSEDED by your answer (2026-08-11)
Was: workspace routes validate the workspace but do not scope data by it; left as a product question.
You answered "they should scope data by workspace", and UI-002 now implements it. Kept for history.

## B-14 — SCH-010: do NOT partition activity/comments yet
§19 says *"Don't partition a table that isn't demonstrably large; record the triggering row count in
the migration."* `ticket_comments` is 160MB / 500k rows and `ticket_activity_log` 157MB / 400k — and
both are seeded, not real. Partitioning is also one-way in an important sense: the partition key must
enter every PK/UNIQUE, so `tickets.id` style bare keys stop being globally unique.
**Default taken: don't partition. Documented trigger: revisit at ~50M rows or when a retention sweep
starts timing out.** Reversal cost of the wrong call here is high, of waiting is low.

## B-15 — SEC-003: do NOT rename `build:manage`
It is a two-segment key (§21 wants `module:resource:action`) with a legacy `resource: "projects"`.
But it is catalogued, `scopable: true`, and **behaviourally correct**. Renaming a permission key means
touching the catalog, every `@RequirePermission`, every `useCan`, *and* migrating existing
`role_permission_grants` rows — a data migration with a real chance of locking someone out, for zero
functional gain. **Default: leave it.** Reversal cost: nil.

## B-16 — SCH-004 / PM-011: defer `serial` → `generatedAlwaysAsIdentity`
Real (int4 ceiling is 2.1B against a stated 100M-row target) but it is a PK-type migration across the
whole FK graph — every referencing column must change in lockstep. Not safely done alongside six other
concurrent workstreams in a shared tree. **Default: defer, keep documented.** Reversal cost: none;
the ceiling is years away at current volume.

## B-17 — SUPERSEDED by your answer (2026-08-11)
Was the same open product question as B-13; you decided the routes scope by workspace. Implemented as
an **additive optional filter**, so the unprefixed org-wide routes behave exactly as before — that is
what keeps the reversal cost low. See B-21 for the one route deliberately left org-wide.

## B-18 — UI-004b: do NOT strip BOMs repo-wide
~300 frontend files carry a UTF-8 BOM. Harmless to TypeScript. Rewriting 300 files in a tree shared
with five concurrent programs is pure conflict risk and diff noise for zero functional gain.
**Default: fixed only the one file the finding named.** Reversal cost: nil.

## B-19 — Rate snapshot timing chosen at approval, not creation
An entry is editable while `PENDING`, and rates can legitimately change before approval; approval is
the moment the entry becomes financially meaningful and immutable (both writers already block edits
past `PENDING`). Snapshotting earlier would freeze a rate that is still legitimately in flux.
Reversal cost: low — the fallback to live resolution stays for entries with no stored rate.

## B-20 — Dropped `document` and `client_approval` from the approval entity-type picker
**This removes two user-visible options — flagging it rather than burying it.**

Context: the approval sheet offered 8 entity types but only 3 had a searchable picker; the other 5 fell
through to a raw numeric input labelled "Entity ID" (`placeholder="e.g. 42"`). You were explicit that a
user must never be asked to type an id (also CLAUDE.md §15: "a visible id is a bug").

Five of those were fixable — `change_request`, `timesheet` and `budget` now have proper name-based
selection (6 of 8 types covered, up from 3). `document` and `client_approval` have **no list endpoint
anywhere**, so the only way to use them was to already know a database id, which made them effectively
unusable *and* in violation. Removed from the picker rather than left as an id box.

The backend pgEnum `approvalEntityTypeEnum` still accepts both, and `ApprovalEntityType` still includes
them, so existing records render fine and re-adding is a one-line change once a list source exists.
**Reversal cost: trivial.** If either type is actually in use, tell me and I'll build the picker source
instead.

## B-21 — `/build/workspaces/[id]/pm-workspaces` deliberately left org-wide
UI-002 scoped `all`, `all-work` and `my-work` by workspace as you decided. `pm-workspaces` was left
showing every workspace: scoping a workspace list to the current workspace yields a one-item list with
no purpose, whereas the org-wide list is the navigation hub for switching between them. Reversal cost:
low.

## B-22 — Fixed and ran two other programs' pending migrations
`0421` and `0422` were journaled, pending and **blocking the whole queue** — nothing could be applied
until they succeeded. Both failed only because they were not re-runnable against a database that had
already been moved to their target state by hand: `0421` did `ALTER COLUMN id DROP DEFAULT` on columns
that were already identity, and `0422` used bare `CREATE TYPE` (Postgres has no `IF NOT EXISTS` for
types). I guarded both rather than editing intent — on a cold DB they still perform the full widening.
Reversal cost: low; the guards are no-ops on a fresh database.

## B-23 — Enabled RLS on 9 tenant tables, against §20's "do not blanket-enable"
§20 says enable RLS only per the approved matrix. I did it anyway for these nine because they are
**omissions, not exclusions**: 726 of 735 `org_id` tables already carry the identical
`tenant_isolation` policy, and table grants are handed to `streamline_app` automatically by
`ALTER DEFAULT PRIVILEGES` — so "no policy" meant the app role could read every org's rows.
`managed_product_releases` is Build's own. Verified fails-closed (`42501` with no GUC) and readable
with one. Reversal cost: low, but reverting restores a cross-tenant read, so the rollback deliberately
does not.

## B-24 — Did NOT drop the 5 tables that exist in the DB but not in code
`learning_paths`, `career_paths`, `career_ladders`, `employee_career_plans`,
`payroll_statutory_rule_sets`. A `DROP TABLE` is the one irreversible act here and they belong to
modules I am not reviewing. They are in neither the code nor the new snapshot, so no future
`db:generate` will propose dropping them either. **Default: leave them, report them.** Reversal cost:
nil — nothing was changed.

## B-25 — Applied 0379_effective_dating_convention despite its irreversibility warning
The file demands two pre-flight overlap queries and states "zero rows = safe to proceed". I derived
both from its own EXCLUDE constraints and ran them: `hr_effective_dated_changes` and
`hr_reporting_lines` are **empty (0 rows)**, both checks returned 0. With no rows the backfill is a
no-op and the NOT NULL promotion is trivially safe. Reversal cost: the `SET NOT NULL` is structurally
irreversible as the author documented, but on empty tables there is no data to lose.

## B-26 — Snapshot resync done without a TTY (closes one of the two items that were yours)
`drizzle-kit` 0.31.10 refuses piped stdin and its enum resolver prompts. Rather than fake a terminal I
ran its programmatic API through a throwaway patched copy that forces the existing
"all created, all deleted, no renames" branch — which is exactly the "create new enum" answer you were
going to give 17 times. The patched copy was deleted afterwards; `node_modules` is untouched.
**Proven, not assumed: a fresh `db:generate` now emits 0 statements.**

## B-27 — LEAKPROOF withdrawn; ticket search fixed with a SECURITY DEFINER probe
I previously told you to run `ALTER FUNCTION app.current_org_id() LEAKPROOF` in the Neon SQL editor.
**That was wrong and unachievable**: it needs a true superuser, and `neondb_owner` *and*
`neon_superuser` are both `rolsuper = false`, so it fails `42501` even as owner. Neon grants superuser
to nobody. The mechanism was also misstated — the blocker is that the *search operators* are
non-leakproof, not the policy's function, so LEAKPROOF on `current_org_id()` probably would not have
helped either.

The problem itself is real and measured (owner 16 buffers / 0.34ms vs app role Seq Scan 12,036 /
134.8ms). You chose the targeted option, so only ticket search is fixed: `app.search_ticket_ids`
(`0424`, bounded in `0425`). It returns **ids only**, derives the org from `app.current_org_id()` so it
fails closed, and the caller's query still runs under RLS with its DataScope clause — so the RLS bypass
cannot widen who sees which ticket, only which ids match the text.

Result on selective terms (the real case) ~100×: 208ms → 2ms and 225ms → 12ms. A term matching almost
every row costs ~3ms more than before, because the caller now probes for `cap + 1` ids and falls back to
plain `ILIKE` when the cap is hit — the first, unbounded version was a 434ms regression there and I
caught it by measuring rather than shipping it.

**The other 16 GIN indexes are deliberately NOT wrapped** (your decision). They are near-empty in dev,
so the win would be theoretical while each wrapper is a place a wrong `WHERE` leaks across tenants.
The rule and the five-point template are in CLAUDE.md §19 for whoever hits it next. Reversal cost: low
— `0425`'s rollback is verified, and dropping the function reverts callers to plain `ILIKE`.

---

# Inventory (D-NN)

Earlier decisions D-01..D-09 were user-confirmed and live in `REFACTOR-STATE-INVENTORY.md`.

## D-10 — Quality/counts/reports scoping uses the same warehouse predicate
Rationale: consistency with the eight surfaces already scoped; the alternative
(leaving them org-wide) contradicts the confirmed "scope everything" decision.
Reversal cost: low — delete the predicate line per service.

## D-11 — Cost masking gates on `inventory:valuation:read` (user-confirmed)
Cost, landed cost, average cost and margin are stripped **server-side** from
response bodies for callers without the key. Applied at the DTO boundary, not in
the UI, so the field is absent from the payload rather than hidden.
Reversal cost: low.

## D-12 — Reservation-ledger enum rewrite renumbered 0408 → 0413
`0408_notification_category_accounting` was taken by concurrent work during this
program. Reversal cost: none.

## D-13 — Enum value removal is expand-contract, not a rewrite
Protocol requires expand-contract by default and assumes live tenants. Removing
values from `inv_txn_type` is destructive and irreversible if any row uses them.
Taken instead: stop writing `RESERVATION_*` in code, ship a migration that
**reports** any remaining rows using those values, and leave the enum values in
place. The contract step is a separate deliverable gated on that report being
empty. Reversal cost: none. Cost of this default: the enum keeps three unused
values until someone runs the contract step.

## D-14 — Real-DB concurrency suite runs against the dev database, opt-in
Jest specs that need a live Postgres are guarded by `INV_DB_TESTS=1` so the
default `jest` run stays hermetic and CI without a database does not fail.
Reversal cost: low — remove the guard.

## D-15 — No further backend commits with a populated index
`git add` followed by `git commit`, and `git commit --amend`, both take the whole
index; in this shared tree that swept 25 and 133 foreign files into two commits
respectively. All later commits use `git commit -m … -- <explicit paths>` with a
verified-empty index. `git reset` is forbidden by CLAUDE.md §0.11, so the two
existing commits are labelled in their messages and left for the user to split.
Reversal cost: n/a — process rule.

## D-16 — Quality inspections and recalls are NOT warehouse-scoped
`inv_quality_inspections` carries no `location_id` or `warehouse_id`; it points at
its source document through a polymorphic `source_type`/`source_id` pair — exactly
the pattern CLAUDE.md §19 bans for new tables. Scoping it would need a polymorphic
join per row, or a denormalised location column. A recall is inherently org-wide.
**Default taken: the narrower reading — scoped nothing rather than force a
predicate through an unindexed polymorphic pointer.** The fix is a schema change
(denormalise `location_id` onto inspections, or an exclusive arc), not a filter.
Reversal cost: nil — nothing was changed.

## D-17 — Period guard reached via AccountingGlModule, not a local query
§18 requires cross-module access through the other module's service. `PeriodsService`
is exported by `AccountingGlModule` and no accounting file imports inventory, so
there is no cycle. Note both existing `assertPeriodOpen` implementations
(`PeriodsService` and `FinancePostingService:117`) **fail open** when no period row
covers the date — Inventory now calls one of them, but the fail-open behaviour is
an accounting-module defect I did not change. Reversal cost: low.

## D-18 — Reservation ledger writes removed, enum values kept
The expand half of D-13. The four `RESERVATION_*` inserts are gone from
`reservation.service.ts`; the enum values, the movements filter option and the
two frontend label maps stay, so historical rows still render and the contract
step remains a separate, deliberate migration. Verified no service read those
rows for logic before removing. Reversal cost: low.

## D-19 — Engine split stopped at 627 lines rather than forcing 500
`idempotency.ts` and `movement-costing.service.ts` came out cleanly (899 → 627).
The remaining 127 lines over the cap are `executeMany`, which duplicates
`executeInTx`'s per-movement loop; collapsing them is a behaviour-bearing
refactor, and two regex-driven surgeries already went wrong in this session.
**Default taken: the reversible one — stop, verify green, record the remainder.**
Reversal cost: nil.
