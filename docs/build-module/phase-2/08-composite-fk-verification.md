# P0 #8 — live composite-FK verification via `pg_constraint.confdelsetcols`

Workstream C, Phase 2. Static work only: no database of any kind is reachable, and
the only Postgres this machine can see is production Aurora. Nothing below
connected to anything.

| Half | Status |
| --- | --- |
| Corpus resolution of all 286 keys | **DONE** — 286/286, verified by running |
| The verification SQL | **WRITTEN** — not executed, no database |
| The cross-tenant delete proof | **WRITTEN** — not executed, no database |
| Live catalog agreement | **BLOCKED** — 0 of 286 verified against a catalog |

---

## 1. Claim verification

Every number recounted from source. Commands are in §7.

| # | Claim (PHASE-1-STATUS.md) | Verdict | Evidence |
| --- | --- | --- | --- |
| 1 | "286 total composite constraints need `confdelsetcols` verification" | **TRUE** | 286 exactly. `deriveSetNullDeclarations(schema)` yields 606 declared SET NULL keys, 286 of which `requiresColumnList`. `src/db/schema/set-null-column-lists.ts:51` |
| 2 | A previous session "statically verified 246 of the 286" | **TRUE but understated** | 246 was the `installed` count. It excluded 33 `swept` keys that the sweep's own fixpoint *determines*, and 3 keys the corpus installs under a different name. The corpus actually settles 282. |
| 3 | Backend commit `425df08df` | **FALSE** — no such revision | The real merge is `425df08dd` (`425df08dd6f958472d88472795d543d63ff107ee`), "Merge build/final-o-p08: statically verify 246 of the 286 SET NULL column lists". One transposed character. |
| 4 | 1142 repairs `fk_job_requisitions_headcount_org` to `ON DELETE SET NULL (headcount_id)` | **TRUE** | `migrations/1142_fix_requisition_headcount_fk_set_null.sql:16-22` |
| 5 | 1128a created a bare `ON DELETE SET NULL` on a composite FK whose `org_id` is NOT NULL | **TRUE** | `migrations/1128a_requisition_headcount_link.sql:4` installs it bare over `(org_id, headcount_id)`; `src/db/schema/hr/requisitions.ts:7` has `orgId … .notNull()`, `:30` has `headcountId` nullable. 1128a is journal array position 889, *after* the last sweep at 639, so nothing repairs it but 1142. |
| 6 | "Nothing static can read `confdelsetcols`; requires live database" | **MISLEADING** | True of the *live catalog*. False as written: the intended column list is ordinary text in `migrations/*.sql`, and a gate that reads it has existed since `425df08dd`. Phase 1 states the blocker without stating that most of it was already closed. |
| 7 | Gates `check:set-null-column-lists` and `check:composite-fk-set-null` exist with passing self-tests | **TRUE but incomplete** | Both pass (14 and 7). Phase 1 omits the **third** gate, `check:set-null-migration-text`, which is the one doing the static work. `package.json:397-399` |
| 8 | Audit at `backend/docs/composite-fk-set-null-audit-2026-09-09.md` | **TRUE** | 150 lines. Its census (50 genuinely broken, 3 false positives from ignoring `confdelsetcols`) is the origin of the rule this workstream verifies. |

### How 286 was recounted

Not by scanning text. The population is derived from the Drizzle object graph, so
a commented-out or dead `ADD CONSTRAINT` cannot inflate it:

```
node -r ts-node/register/transpile-only src/scripts/check-set-null-column-lists.ts --self-test
node -r ts-node/register/transpile-only src/scripts/check-set-null-migration-text.ts
```

The second prints `keys requiring a column list 286`.

Shape of the 286, recounted independently and asserted in the new spec:

- **arity 2 on 286 of 286.** No higher-arity key requires a column list.
- **exactly one nullable member on 286 of 286.** So the required list is always a
  single column and is fully determined by the declaration.
- **member 0 is always the tenant column** — `org_id` on 281, `organization_id` on 5.
- **the tenant column is in no required list**, 286 of 286.
- spread: 177 child tables; `public` 231, `build` 53, `build_events` 2.

This shape is what makes shape-(c) corruption (nulling the *wrong nullable*
column) structurally impossible: there is no other nullable member to name.

### CRLF

The coordinator's CRLF warning does not reach these numbers. The population comes
from the object graph, not text; and the corpus parser normalises `\r\n` before a
character-scanner strips comments — it never uses `/--.*$/`. Proved empirically:
a commented-out `ADD CONSTRAINT` on a CRLF line does not appear in
`parseInstalls`. Pinned by two tests in the new spec.

---

## 2. Gap inventory — the real residual

Phase 1 inherited "40 of 286 unverified". That number was a name-matching
artifact plus an unclaimed proof. After the gate extension in §5 the corpus
resolves **286 of 286**:

```
installed 246 · installed-alias 3 · swept 33 · swept-indeterminate 0
bare 2 · drift 0 · not-set-null 2 · dropped 0 · untraceable 0
```

**282 proven correct by the corpus** (246 + 3 + 33). The remaining 4 are not
unverified — they are *verified to be something other than a correct SET NULL*:

| Constraint | Table | Parent | Required list | What the corpus actually installs | Why static work cannot "fix" it |
| --- | --- | --- | --- | --- | --- |
| `fk_inv_sales_orders_channel_id_org` | `public.inv_sales_orders` | `inv_channels` | `(channel_id)` | bare `ON DELETE SET NULL`, `0580a_inventory_channel_pools` (journal 806) | Statically **proven defective**. Installed after the last sweep (639), guard does not fire. Needs a repair migration, which cannot be verified without a database. |
| `fk_inv_stock_adjustments_scrap_location_id_org` | `public.inv_stock_adjustments` | `inv_locations` | `(scrap_location_id)` | bare `ON DELETE SET NULL`, `0545a_stock_write_off` (journal 787) | Same. |
| `fk_calendar_events_linked_lead_party_id` | `public.calendar_events` | party map | `(linked_lead_party_id)` | `NO ACTION`, `0662a` | Deliberate erasure-path choice; `src/db/schema` was never updated. A declaration/corpus divergence, not a `confdelsetcols` gap — `confdeltype` is `'a'`, so the column list is irrelevant. |
| `fk_payroll_run_employees_org_worker` | `public.payroll_run_employees` | worker subject | `(worker_id)` | `RESTRICT`, `0392` (journal 119) | Same class. `confdeltype` is `'r'`. |

**The genuine residual is therefore not a subset of the 286. It is all 286.**
Every verdict above is about the *migration corpus*, and the corpus is not the
database. Statically unknowable, by construction:

- whether a migration was **applied** — 1142 is journalled and unapplied;
- whether a migration was **partially executed** (`migration-applied-but-partially-executed`);
- whether a constraint was **altered out of band** — 0619 records this happening;
- and per Workstream D, `_chain.sha256.json` holds 685 entries and does **not**
  seal 1141 or 1142, so neither is hash-protected against edit.

So: **282 of 286 are proven correct in the corpus; 0 of 286 are verified against
any catalog.** Item 3 is what closes the second number, and only a database can
run it.

### The three keys the corpus installs under a different name

These are why "untraceable/dropped" was never a real gap. The declaration derives
one name; the corpus installs the same `(table, referencing columns)` key under
another.

| Declared name | Installed as | By | List |
| --- | --- | --- | --- |
| `managed_products_org_id_owner_membership_id_organization_members_org_id_id_fk` (77 bytes) | `fk_managed_products_owner_membership` | `0764_managed_products_owner_fk_set_null` | `(owner_membership_id)` |
| `fk_invitations_org_inviter_membership` | `fk_invitations_inviter_membership_id_org` | `0965_ar02_canonical_tenant_fks_3` | `(inviter_membership_id)` |
| `fk_invitations_org_accepted_membership` | `fk_invitations_accepted_membership_id_org` | `0965_ar02_canonical_tenant_fks_3` | `(accepted_membership_id)` |

The `managed_products` name is 77 bytes; Postgres truncates at 63, and **neither
the full nor the truncated form appears in any `.sql`** — only in
`migrations/meta/*_snapshot.json`. The two `invitations` names were dropped by
`0982_ar02_drop_live_duplicate_composites`, whose own header says it is "keeping
the member that carries the referential action" — that member is 0965's, still
standing, with the right list.

This is also **a live blind spot in the catalog half**, unchanged by this work:
`check-set-null-column-lists.ts:304` does `if (row === undefined) continue;` and
keys on `fk.getName()`. Even *with* a database, the `managed_products` key is
silently skipped. Recorded, not fixed — fixing it belongs to that gate's owner.

---

## 3. The verification query

`backend/docs/phase-2/sql/c-confdelsetcols-01-verify.sql`.

One row per `contype='f' AND confdeltype='n'` constraint, with `confdelsetcols`
resolved through `pg_attribute` to names, and a `verdict` column of `PASS`/`FAIL`
with `FAIL` rows sorted first. It opens with a `DO` guard that raises if the
catalog reports fewer than 100 SET NULL keys (an empty database must not read as
clean) or if `server_version_num < 150000` (`confdelsetcols` does not exist
before PG 15).

The three checks, each emitted as its own boolean column:

- **`check_a_list_is_exactly_intended`** — the effective set-null column set
  equals the key's nullable-member set exactly, in both directions
  (`<@` twice, so ordering cannot mask a difference). "Effective" is
  `coalesce(confdelsetcols_names, key_columns)`: a NULL column list means
  Postgres nulls the whole key, which is the defect, so it must be folded in
  rather than skipped.
- **`check_b_every_named_column_nullable`** — the effective set is contained in
  the nullable-member set. Catches both the bare form and a list that names a
  NOT NULL column.
- **`check_c_tenant_excluded_and_not_null`** — the tenant column (`org_id` or
  `organization_id`) is absent from the effective set **and** is still
  `attnotnull`. Emits `true` when the key has no tenant member, so arity-1 keys
  are not failed for a condition that does not apply to them.

`failure_reason` names which of the three failed and what it means at delete
time. The query deliberately does **not** filter to composite keys: an arity-1
SET NULL over a NOT NULL column is the same defect (the 2026-09-09 audit found 7
of them), and a `WHERE array_length(conkey,1) > 1` is exactly the mistake that
audit documents. Filter on the emitted `arity` column if you want only composites.

It never touches `information_schema.referential_constraints.delete_rule`, which
answers "SET NULL" for the correct and the broken form alike.

### Companion: tenant pairing

`backend/docs/phase-2/sql/c-confdelsetcols-02-tenant-pairing.sql` proves the
structural half of tenant safety without any data. It walks `conkey[i]` against
`confkey[i]` positionally and asserts that each child tenant column is matched
against the parent tenant column and is NOT NULL. A key that passes cannot reach
across tenants at all: a parent row in org B can never satisfy a child key in
org A, whatever the delete action does.

---

## 4. No-cross-tenant-delete proof plan

`backend/docs/phase-2/sql/c-confdelsetcols-03-cross-tenant-delete-proof.sql`.
Single `BEGIN; … ROLLBACK;` — the pattern the repo already uses for migration
verification. No `COMMIT` appears at any nesting level; that is asserted by a
test.

Exercised on `fk_job_requisitions_headcount_org`, migration 1142's key.

1. **Precondition.** Read `confdelsetcols` for the constraint and `RAISE
   EXCEPTION` unless it is exactly `{headcount_id}`. A run against a database
   where 1142 is unapplied fails loudly instead of proving something about
   1128a's form by accident.
2. **Precondition.** Query `information_schema.columns` for NOT NULL columns
   without defaults across the three tables touched, and raise listing any the
   script does not supply. Since this cannot be run here, it must fail with an
   actionable message rather than a bare 23502.
3. **Fixture.** Reuse the two lowest-id existing organizations if present,
   otherwise insert two. Then a `headcount_requests` parent and a
   `job_requisitions` child in each of tenant A and tenant B.
4. **Negative.** Attempt to insert a `job_requisitions` row in **org B** pointing
   at **org A's** parent id. The composite FK must reject it with
   `foreign_key_violation`. If it succeeds, the key is not tenant-scoped and the
   proof raises `CROSS-TENANT FAILURE`. This is the strongest assertion in the
   file: it shows the cross-tenant state the delete would have to damage cannot
   be constructed in the first place.
5. **Act.** `DELETE` the org A parent.
6. **Assert**, each with its own `RAISE EXCEPTION`:
   - org A child's `headcount_id` is now NULL — the action fired;
   - org A child's `org_id` is unchanged — the column list protected the tenant column;
   - org B child's `headcount_id` is unchanged;
   - org B child's `org_id` is unchanged;
   - org B's parent row still exists.
7. `ROLLBACK`.

`SET LOCAL row_security = off` is required so the proof can observe both tenants;
run it as the table owner or a `BYPASSRLS` role. `lock_timeout` and
`statement_timeout` are bounded.

### Companion: the bare-form regression

`backend/docs/phase-2/sql/c-confdelsetcols-04-bare-form-regression.sql` restores
1128a's bare form inside a rolled-back transaction and asserts the parent delete
raises `not_null_violation` (23502). This proves 1142 is load-bearing rather than
cosmetic. A test asserts the restored DDL has the same parsed shape as 1128a's
actual statement, so the regression cannot drift from the thing it reproduces.

---

## 5. Static extension — what was actually closeable

Phase 1's premise is that the residual is unverifiable. Two thirds of it was
merely unverified. Both closures extend `check-set-null-migration-text.ts`; no
parallel gate was written.

### (a) The sweep's fixpoint *determines* the list, it does not merely repair it

33 keys were installed bare before `0992_set_null_referential_actions_repair`
(journal 639) and marked `swept` — accounted for, but counted as unproven.

`0992` ends by counting, over `pg_constraint`, every SET NULL constraint with a
NOT NULL column in `COALESCE(con.confdelsetcols, con.conkey)` and raising if any
remain. For a key `(tenant NOT NULL, pointer NULL)`:

- if `confdelsetcols` were NULL, the predicate falls back to `conkey`, which
  contains the NOT NULL tenant column — the assertion would have raised.
  Therefore `confdelsetcols IS NOT NULL`.
- Postgres's grammar forbids an empty column list, so it is non-empty.
- the assertion excludes the tenant column, so it is contained in `{pointer}`.

Non-empty and contained in a singleton means **equal to it**. The list is pinned,
not bounded — conditional only on 0992 having been applied, which is the same
condition every `installed` verdict already carries.

That argument needs exactly one nullable member. The gate now checks that rather
than assuming it: a swept key with two or more nullable members gets the new
verdict `swept-indeterminate` and is printed under NOT PROVEN. Currently 0, and a
self-test and a spec test both hold it at 0, so if a future key breaks the
precondition the gate says so instead of quietly counting it clean.

### (b) Structural identity resolves the names the corpus never uses

The gate matched constraints by name, with a 63-byte truncation fallback. Three
keys have no name in the corpus at all (§2). The gate now also builds a
`(relation, referencing columns) → names` index and, **only** when the declared
name is left with nothing standing (never traced, or traced and dropped), looks
for a constraint on the identical column tuple.

Deliberately conservative:

- it is never tried when the declared name *is* standing, so it cannot override a
  real verdict;
- it requires exactly **one** surviving candidate. Two standing constraints on
  one column tuple is a genuine duplicate condition, and guessing a winner there
  would be worse than reporting the key unresolved;
- a resolved-but-bare alias is reported `bare`, not laundered into a pass;
- a dropped key with no surviving sibling stays `dropped`.

New verdict `installed-alias`, printed with the name and migration that actually
installs it, so the resolution is auditable rather than silent.

### Result

`untraceable 0`, `dropped 0`, `swept-indeterminate 0`, `resolved to an install
286`. Self-tests went 40 → 60, all green.

### What could NOT be closed statically

- Applied-ness, partial execution, out-of-band `ALTER`. No file can answer these.
- The 2 known-bare defects: statically *proven wrong*, but the repair migration
  cannot be verified without a database and 1142 is itself still unapplied.
- The `check-set-null-column-lists.ts:304` blind spot: it keys on the untruncated
  derived name, so `build.managed_products` is skipped even with a database. Not
  this workstream's file to change; recorded here.

---

## 6. Staging runbook

Requires a **non-production PostgreSQL 15 or later**, bootstrapped and migrated
to journal head. None exists on this machine. Variable names below were read out
of the scripts, not guessed.

| Variable | Read by | Line |
| --- | --- | --- |
| `SET_NULL_GATE_DATABASE_URL` | `src/scripts/check-set-null-column-lists.ts` | `:48` |
| `SET_NULL_GATE_DATABASE_URL` | `src/db/schema/set-null-column-lists.db.spec.ts` | `:31` |
| `DATABASE_URL` or `APP_DATABASE_URL` | `src/scripts/check-composite-fk-set-null.mjs` | `:121` |
| `STREAMLINE_ALLOW_PARTIAL_GATES` | `check-set-null-column-lists.ts`, downgrades INCONCLUSIVE to PARTIAL | `:49` |

`check-set-null-migration-text.ts` reads **no** database variable at all — the
only occurrence of `SET_NULL_GATE_DATABASE_URL` in it is prose at `:958`. (This
corrects the coordinator's note, which listed it as a reader.)

```bash
cd backend
export STAGING_URL='postgresql://user:pass@staging-host:5432/streamline'

# 1. gate self-tests first: a gate that resolves nothing reports zero vacuously
node -r ts-node/register/transpile-only src/scripts/check-set-null-migration-text.ts --self-test
node -r ts-node/register/transpile-only src/scripts/check-set-null-column-lists.ts --self-test
node src/scripts/check-composite-fk-set-null.mjs --self-test

# 2. catalog half of the column-list gate
SET_NULL_GATE_DATABASE_URL="$STAGING_URL" \
  node -r ts-node/register/transpile-only src/scripts/check-set-null-column-lists.ts

# 3. the NOT NULL / SET NULL gate
DATABASE_URL="$STAGING_URL" node src/scripts/check-composite-fk-set-null.mjs

# 4. item 3 of this document
psql "$STAGING_URL" -v ON_ERROR_STOP=1 -f docs/phase-2/sql/c-confdelsetcols-01-verify.sql
psql "$STAGING_URL" -v ON_ERROR_STOP=1 -f docs/phase-2/sql/c-confdelsetcols-02-tenant-pairing.sql

# 5. item 4 of this document (self-rolling-back)
psql "$STAGING_URL" -v ON_ERROR_STOP=1 -f docs/phase-2/sql/c-confdelsetcols-03-cross-tenant-delete-proof.sql
psql "$STAGING_URL" -v ON_ERROR_STOP=1 -f docs/phase-2/sql/c-confdelsetcols-04-bare-form-regression.sql
```

Notes that will bite otherwise:

- Steps 4 and 5 assume **1142 is applied**. Step 5 refuses to run otherwise, with
  a message naming 1142. Apply with `APPLY_ONE_DATABASE_URL` via
  `src/scripts/apply-journalled-migration.mjs`.
- Step 5 needs the table owner or a `BYPASSRLS` role; `SET LOCAL row_security =
  off` is in the script and will error for an unprivileged role.
- Step 4's `DO` guard raises on an empty or pre-PG15 database rather than
  printing an empty, clean-looking result.
- `psql -v ON_ERROR_STOP=1` is required, or a raised exception scrolls past with
  exit code 0.
- **Do not** point any of these at `.env`, `.env.production`, or
  `--env-file`. `check:migration-chain`, `check:migration-ledger`,
  `migration:proof` and `migration:proof:focused` load `.env` automatically and
  will reach production.

The unblock path already exists in CI: `.github/workflows/db-gates.yml:157` runs
the catalog half against a `pgvector/pgvector:pg16` service with
`SET_NULL_GATE_DATABASE_URL: postgres://ci:ci@127.0.0.1:5432/ci`. Steps 4 and 5
can be added to the same job with no new infrastructure.

---

## 7. What ran

All in `D:/projects/personal/slos-be-phase-2-data`. No database was contacted.

| Command | Result | Exit |
| --- | --- | --- |
| `check-set-null-migration-text.ts --self-test` | `60 passed` (was 40) | 0 |
| `check-set-null-migration-text.ts` | `286` resolved of `286`; `0 new` | 0 |
| `check-set-null-column-lists.ts --self-test` | `14 passed` | 0 |
| `check-composite-fk-set-null.mjs --self-test` | `7/7 passed` | 0 |
| `jest --runInBand src/db/schema/phase-2/composite-fk-confdelsetcols.spec.ts` | `1 suite, 58 tests passed` | 0 |
| `eslint` on both changed files | clean | 0 |
| `tsc --noEmit -p tsconfig.build.json` | clean | 0 |
| `tsc --noEmit -p tsconfig.test.json` | clean | 0 |

`check-composite-fk-set-null.mjs --self-test` returns at line 119, before the
`postgres(url)` call at line 133; this worktree also has no `.env`, so its
`dotenv.config()` loads nothing. Verified by reading before running.

### Mutation proof

The spec was proved to bite, then reverted byte-exactly (`md5sum -c` OK,
`git status` clean): changing `con.confdeltype = 'n'` to `'a'` in the
verification SQL produced
`× the verification query selects on the SET NULL delete action only`,
`Tests: 1 failed`.

The gate extension is likewise proved by its own before/after: prior to it the
same corpus reported `untraceable 1`, `dropped 2`; the three spec tests asserting
`[]` for those verdicts would have failed.

### Files

| File | Lines | Change |
| --- | --- | --- |
| `backend/src/scripts/check-set-null-migration-text.ts` | 971 → 1,332 (+370/−9) | extended (§5) |
| `backend/src/db/schema/phase-2/composite-fk-confdelsetcols.spec.ts` | 485 | new, 58 tests |
| `backend/docs/phase-2/sql/c-confdelsetcols-01-verify.sql` | 166 | new |
| `backend/docs/phase-2/sql/c-confdelsetcols-02-tenant-pairing.sql` | 81 | new |
| `backend/docs/phase-2/sql/c-confdelsetcols-03-cross-tenant-delete-proof.sql` | 155 | new |
| `backend/docs/phase-2/sql/c-confdelsetcols-04-bare-form-regression.sql` | 59 | new |
| `docs/build-module/phase-2/08-composite-fk-verification.md` | 418 | new |

Neither changed file carries a code comment. Reasoning that was load-bearing
lives in `it(...)` and self-test assertion strings — the sweep-determinism
argument, the 77-byte-name resolution, 0982's "keeping the member that carries
the referential action", and the parenthesis-counting rationale are all readable
from test output. Everything else is in this document.

The spec lives at `src/db/schema/phase-2/`, **not** `test/phase-2/`: backend jest
`roots` are `src`, `evals`, `test/security`, `test/perf`, so a spec under
`test/phase-2/` matches zero suites and reports success while running nothing.
Confirmed by probe — `jest --listTests` on a file there returned empty. Shared
jest config was not edited.

---

## 8. Evidence classification

- **Verified by running:** every count in §1 and §2; all four self-tests; the 58
  spec tests; both typechecks; eslint; the mutation proof; the CRLF behaviour;
  the journal positions of 1128a (889), 1142 (902), 0764 (458), 0965, 0982, and
  the sweeps (465, 639); the resolution of all three aliased keys.
- **Verified by reading:** 1128a's and 1142's DDL; 0982's header rationale;
  0965's canonical installs; that `check-composite-fk-set-null --self-test` opens
  no connection; that `check-set-null-migration-text.ts` reads no database
  variable; the env var names in §6; `check-set-null-column-lists.ts:304`.
- **Not verified — blocked:** every claim about the live catalog, including
  whether any of the 286 column lists is actually installed. Items 3 and 4 are
  written and untested.
