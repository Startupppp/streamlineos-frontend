# 05b — Referential-action P0 repair

Session S2 · 2026-09-02 · executed against local PostgreSQL 18.4, database `scratch_boot_c` only.
`scratch_boot_a` and `scratch_boot_b` were never opened. Nothing was run against the configured
`DATABASE_URL`. No git command was run.

Ticket 05 derived its findings from the declaration and a migration replay, with no live catalog.
This ticket had one: `scratch_boot_c` was at head (637/637) when it started. **Every claim below
was executed and its output read.**

---

## What the live catalog actually held

The audit predicted 12 defective `SET NULL` foreign keys. The catalog held **9**. The generalised
predicate — any `confdeltype='n'` foreign key whose effective set-null column set
(`COALESCE(confdelsetcols, conkey)`) contains an `attnotnull` column — returned exactly:

| shape | count | constraints |
|---|---|---|
| composite, no column list, `org_id` NOT NULL | 7 | `invitations.fk_invitations_org_revoked_by_membership`, `hr_case_notes.fk_hr_case_notes_author_actor`, `hr_benefit_enrollments.fk_hr_benefit_enrollments_user_membership`, `hr_dependents.fk_hr_dependents_user_membership`, `hr_insurance_claims.fk_hr_insurance_claims_user_membership`, `hr_insurance_claims.fk_hr_insurance_claims_decider_membership`, `hr_travel_visit_logs.fk_hr_travel_visit_logs_user_membership` |
| column list naming a NOT NULL column | 1 | `support_tickets.fk_support_tickets_created_actor` |
| single column, NOT NULL | 1 | `hr_safety_incidents_reported_by_users_id_fk` |

**Correction to the audit (P0-2).** It listed four single-column offenders. Only
`hr_safety_incidents.reported_by` exists as a constraint. `hr_disciplinary_actions.issued_by`,
`hr_emergency_events.created_by` and `hr_simulations.created_by` are declared in Drizzle as
`.references(() => users.id, { onDelete: "set null" }).notNull()` but **no foreign key for them
exists in the database** — the migration chain never created one. Declaration-only, so they could
never have raised `23502`; they would have been created broken by the first `db:push`. All four
declarations are fixed regardless.

---

## The failures, reproduced on the live database

Each ran inside a transaction that was rolled back, against real `organizations` /
`organization_members` / `users` rows.

**1 — `support_tickets` (the stale-column-list trap, P0-1).** `0865` wrote the column list
correctly; `0916:92` then made `created_by_membership_id` non-nullable and turned the fix into the
bug. Deleting the membership:

```
ERROR:  null value in column "created_by_membership_id" of relation "support_tickets" violates not-null constraint
CONTEXT:  SQL statement "UPDATE ONLY "public"."support_tickets" SET "created_by_membership_id" = NULL
          WHERE $1 OPERATOR(pg_catalog.=) "org_id" AND $2 OPERATOR(pg_catalog.=) "created_by_membership_id""
```

**2 — `invitations` (composite, no column list).** Postgres nulls *every* member, `org_id`
included:

```
ERROR:  null value in column "org_id" of relation "invitations" violates not-null constraint
CONTEXT:  SQL statement "UPDATE ONLY "public"."invitations" SET "org_id" = NULL, "revoked_by_membership_id" = NULL …"
```

`hr_dependents` produced the identical error on `org_id`.

**3 — `hr_safety_incidents` (single column).** Deleting the reporting user:

```
ERROR:  null value in column "reported_by" of relation "hr_safety_incidents" violates not-null constraint
CONTEXT:  SQL statement "UPDATE ONLY "public"."hr_safety_incidents" SET "reported_by" = NULL WHERE …"
```

**4 — `coupons.code` (P1-6).** Org A creates `SUMMER25`; org B, a different tenant:

```
ERROR:  duplicate key value violates unique constraint "coupons_code_unique"
DETAIL:  Key (code)=(SUMMER25) already exists.
```

---

## The fix, and the same shapes after it

`migrations/0992_set_null_referential_actions_repair.sql` — two explicit repairs plus a sweep that
re-derives every column list from `pg_attribute` **at run time**, so no list in the file can go
stale the way `0865`'s did. It ends fail-closed on the generalised predicate, which also covers the
stale-list shape `0770` could not see.

`support_tickets.fk_support_tickets_created_actor` and `hr_safety_incidents_reported_by_users_id_fk`
have **no nullable member at all**, so no column list can rescue them and the action itself had to
change. Both became `NO ACTION` — the ruling `0839` already applied to `calendar_events`. For
`support_tickets` this is not a preference: `0916` dropped the legacy `created_by` user column, so
`created_by_membership_id` is the only creator identity the row has, and nulling it would erase the
author rather than preserve them. `NO ACTION` trades an unhandleable `23502` for a `23503` the
departure path can classify and explain; the delete was already impossible either way.

After the migration, on a database cold-built from zero:

```
1. DELETE membership → ERROR: update or delete on table "organization_members" violates foreign key
   constraint "fk_support_tickets_created_actor" on table "support_tickets"      (23503, actionable)
2. DELETE membership → DELETE 1;  invitation row survives:
      id       |  org_id  | revoked_by_membership_id
   t05b-inv    | t05b-org |            (null)              ← org_id intact, pointer cleared
   hr_dependents → DELETE 1
3. DELETE user     → ERROR: … violates foreign key constraint
   "hr_safety_incidents_reported_by_users_id_fk"                                 (23503, actionable)
4. org B creates SUMMER25 → INSERT 0 1
```

Residual count of the generalised predicate on the cold-built database: **0**
(796 `SET NULL` foreign keys, 522 composite, 472 carrying an explicit column list).

`migrations/0993_coupons_tenant_scoped_code_unique.sql` replaces the global `UNIQUE(code)` with
`uniq_coupons_platform_code (code) WHERE org_id IS NULL` and
`uniq_coupons_org_code (org_id, code) WHERE org_id IS NOT NULL`. Both new rules are strictly weaker
than the one dropped, so on any database still holding `coupons_code_unique` a collision is not
representable; the pre-pass exists for a database that lost it some other way (a `db:push` against a
dev database, a partial rollback) and **resolves** collisions rather than aborting — lowest `id` in
each group keeps the code, the rest are suffixed with their own id and deactivated. Both intended
uniqueness rules still bite: two platform coupons sharing a code raise `23505` on
`uniq_coupons_platform_code`, two coupons in the same org on `uniq_coupons_org_code`.

---

## The recurrence, and why the declaration cannot be the answer

The audit's P0-3 asserted that `drizzle-kit push`/`generate` would revert a database-side fix.
**That half is false, and I can show why.** `drizzle-kit` 0.31.10 reads the delete action from
`information_schema.referential_constraints.delete_rule`, and the string `confdelsetcols` appears
nowhere in either `drizzle-kit` or `drizzle-orm` 0.45.2. On the live catalog:

| constraint | catalog definition | `delete_rule` |
|---|---|---|
| `fk_support_tickets_assignee_actor` | `… SET NULL (assignee_membership_id)` | `SET NULL` |
| `fk_invitations_org_revoked_by_membership` | `… SET NULL` (no list) | `SET NULL` |

drizzle-kit cannot tell the correct form from the broken one, so it produces no diff and reverts
nothing. The other half of P0-3 is real and worse: `ON DELETE SET NULL (cols)` is **inexpressible**
in `UpdateDeleteAction`, so a `db:push` against an empty database creates the broken form, and the
schema file silently misstates what 256 composite foreign keys do.

So the declaration is made to carry the *rule* instead of the DDL:

- `src/db/schema/set-null-column-lists.ts` derives, from the Drizzle schema itself, the column list
  every `SET NULL` foreign key must carry (its nullable members) and the set that has no nullable
  member at all — plus the two catalog queries, lifted from `0770` and generalised.
- `src/db/schema/set-null-column-lists.db.spec.ts` binds the two. It reports 588 declared `SET NULL`
  foreign keys, **256 of which require a column list**, and 0 with no nullable member.

---

## The gate (item 4) — and what still needs to wrap it

I may not edit `check-*.mjs`, so the gate is an executable spec in two halves:

**Declaration half — runs in the default hermetic `jest`, no database.** Fails if any `SET NULL`
foreign key is declared with every member non-nullable. This is the shape Drizzle *can* express and
get wrong, caught at schema-edit time before a migration is written.

**Catalog half — guarded by `SET_NULL_GATE_DATABASE_URL`, skipped without it.** Runs the `0770`
predicate, generalised to cover the stale-list shape, and additionally compares each constraint's
`confdelsetcols` against the nullability the declaration implies.

Both halves were proven to bite, not just to pass:

| negative proof | result |
|---|---|
| restored `onDelete: "set null"` on `hr_safety_incidents.reportedBy` | FAIL — `hr_safety_incidents.hr_safety_incidents_reported_by_users_id_fk (reported_by)` |
| stripped the column list from `fk_invitations_org_revoked_by_membership` in the catalog | FAIL — both catalog tests: `catalog nulls [org_id, revoked_by_membership_id], declaration implies [revoked_by_membership_id]` |

Both were then restored and all 5 tests pass against the cold-built database.

**Recommendation for the gate owner (ticket 35):** a permanent `check:set-null-column-lists` script
should wrap `UNREACHABLE_SET_NULL_QUERY` and `SET_NULL_COLUMN_SETS_QUERY` from
`src/db/schema/set-null-column-lists.ts` — they are exported for exactly that, so the script and the
spec cannot drift. The declaration half needs no database and could run in every CI job; the catalog
half needs a bootstrapped target. This class has now been introduced three times after being swept
once, and until that script exists the only thing standing between the next `hr_*` actor migration
and another `23502` is a spec somebody has to remember to point at a database.

---

## Departure-path classification (item 2)

`src/modules/organization/core/org-member-departure.service.ts` (the brief's path omitted `core/`;
this is the one file in `modules/organization/**` this ticket owns — everything else there is
ticket 19's). It caught only `23503`/`23001`, so all nine defects above reached the client as a 500.

`departureBlockMessage(err)` now classifies `23502` as well, naming the table and column from the
error's own fields. Executed directly:

```
23502 → "a related record requires the membership and cannot release it (support_tickets.created_by_membership_id)"
23503 → "a related record still references the membership (constraint: fk_support_tickets_created_actor)"
23001 → "a related record still references the membership (constraint: fk_x)"
Error("boom") → null   (rethrown, still a 500 — an unrelated failure must not become a 400)
```

Both `removeMember` and `leaveOrg` share it, so they cannot drift apart. The two `(err as {...})`
assertions were replaced by a `Reflect.get` narrowing guard. After `0992` this branch should never
fire; it exists so the next time it does, the failure is legible.

---

## Gates

Run from `streamlineos-backend`, exit codes read.

| gate | result |
|---|---|
| `check:migration-discipline` | **exit 0**, 639 SQL files, 0 new violations *(see caveat)* |
| `check:migration-chain` (vs cold-built `scratch_boot_c`) | **exit 0**, watermark `1803000010089`, no issues *(see caveat)* |
| `check:drop-column-safety` | **exit 0**, 639 migrations, 126 dropped columns, 348 schema files |
| `check:migration-rollback` | **exit 0**, 639 scanned, all type-name checks passed |
| `check:restrict-fks` | **exit 0**, 345 schema files |
| cold bootstrap from zero (`db-bootstrap.mjs`, dropped + recreated `scratch_boot_c`) | **exit 0**, `RESULT: REACHED_HEAD 639/639` |
| `tsc --noEmit -p tsconfig.json` | **exit 0, 0 errors** |
| `jest src/db/schema/set-null-column-lists.db.spec.ts` + `SET_NULL_GATE_DATABASE_URL` | 5 passed |
| `jest src/modules/organization/core src/db/schema` | 35 suites, 315 passed |
| `jest src/modules/billing/core/coupon-* billing.service src/modules/support` | 41 suites, 410 passed |
| `eslint` on all 8 changed files | 0 errors (2 pre-existing unused-import warnings) |
| rollback round-trip: `0993.down` → `0992.down` → `0992` → `0993` | executed; residual defects 9 after down, **0** after re-apply, gate spec 5/5 |

**Caveat, honestly stated — and it is a territory collision.** Both migration gates passed at
639/639 while I was the only agent adding migrations, and every number above was read at that
point. As I finished, another agent (the `s08` prefix — ticket 03's tenant-relationships/indexes
work) began writing migrations of its own. Three are now on disk and unjournalled:

```
0994_s08_rls_for_unpoliced_inventory_tables
0995_s08_credit_note_tenant_foreign_keys
0996_s08_leading_tenant_indexes
```

`check:migration-discipline` now exits 1 with one `[no-journal]` violation and
`check:migration-chain` now exits 1 with three `(a) UNJOURNALLED` issues. **All four are that
agent's, none are mine.** Its journal `when` values must exceed `1803000010089`, which mine occupy
at idx 769/770. The orchestrator should re-run both gates after that agent journals its files, and
should note that `BE/migrations/` was assigned to this ticket exclusively but is being written by
at least two agents.

Journal: 639 entries, `when` strictly increasing, mine at idx 769 (`1803000010088`) and 770
(`1803000010089`) — both above the applied watermark and above 2027-02-19.

---

## Files changed

```
streamlineos-backend/migrations/0992_set_null_referential_actions_repair.sql                    (new)
streamlineos-backend/migrations/0993_coupons_tenant_scoped_code_unique.sql                      (new)
streamlineos-backend/migrations/rollback/0992_set_null_referential_actions_repair.down.sql      (new)
streamlineos-backend/migrations/rollback/0993_coupons_tenant_scoped_code_unique.down.sql        (new)
streamlineos-backend/migrations/meta/_journal.json                                              (2 entries appended)
streamlineos-backend/src/db/schema/set-null-column-lists.ts                                     (new)
streamlineos-backend/src/db/schema/set-null-column-lists.db.spec.ts                             (new)
streamlineos-backend/src/db/schema/support/tickets.ts                                           (fk_support_tickets_created_actor → NO ACTION)
streamlineos-backend/src/db/schema/hr/safety.ts                                                 (reportedBy: drop set null)
streamlineos-backend/src/db/schema/hr/cases.ts                                                  (issuedBy: drop set null)
streamlineos-backend/src/db/schema/hr/enterprise-ops.ts                                         (createdBy ×2: drop set null)
streamlineos-backend/src/db/schema/common/subscriptions.ts                                      (coupons.code: global unique → two partial uniques)
streamlineos-backend/src/modules/organization/core/org-member-departure.service.ts              (23502 classification)
```

---

## Handed to other owners

1. **P0 — `BillingCoupons.validate()` is now ambiguous, and it is in ticket-19/billing territory.**
   `src/modules/billing/core/billing-coupons.ts:73-79` looks a coupon up by
   `code = ? AND is_active AND (org_id IS NULL OR org_id = ?)` with `findFirst` and **no
   `orderBy`**. Before `0993` the global unique made at most one row match. Now a tenant can create
   a coupon whose code collides with a platform coupon, and two rows match — `findFirst` picks one
   arbitrarily. This is not cross-tenant (a tenant only ever sees its own row or the platform one),
   but it is non-deterministic. The fix is one line at that call site: order tenant-owned before
   platform (`ORDER BY (org_id IS NULL)`). `evaluate()` and redemption both key on `coupon_id` and
   are unaffected. I did not edit it — `modules/billing` is not my territory.

2. **`MEMBERSHIP_ARTIFACTS` needs a ruling for `support_tickets.created_by_membership_id`**
   (`src/modules/organization/core/membership-artifacts.ts:1643`, ticket 19). The existing
   `support_tickets` entry is keyed by `assignee_membership_id` with `onRemoval: "set-null"`, which
   is still true. The creator pointer is now `NO ACTION` and blocks removal, exactly as
   `calendar_events` does after `0839`, and needs its own `blocks-removal` entry. `check:restrict-fks`
   does **not** catch this: it matches only `.onDelete("restrict")`, never a bare `foreignKey({})`,
   so a NO ACTION blocker is invisible to it. That regex gap is a second finding for the gate owner.

3. **Declaration-vs-catalog drift, not fixed here.** `hr_disciplinary_actions.issued_by`,
   `hr_emergency_events.created_by` and `hr_simulations.created_by` declare a foreign key to
   `users(id)` that does not exist in the database. Creating three new foreign keys is a decision
   for ticket 06/08, not a referential-action repair.

4. **Three `s08_*` migrations are on disk unjournalled** (`0994`, `0995`, `0996`) and are the sole
   cause of the current `check:migration-discipline` and `check:migration-chain` failures. Not mine
   — see the caveat under Gates.

5. **Ticket 05's P0-3 reversion claim should be struck** from any downstream document: drizzle-kit
   cannot see `confdelsetcols` and therefore cannot revert a column list. The recurrence risk is
   real; the reversion risk is not.
