# 54 — Declared-vs-live constraint drift: the whole population, not just `hr_people`

**Question asked.** `uniq_hr_people_org_person_link` is declared in Drizzle and created
only by an un-journalled file. Find every other instance, at the level of unique
constraints, unique indexes, plain indexes, foreign keys and check constraints.

**Answer.** It is not the only instance — it is 1 of **189**, and 1 of the **66** whose
only SQL lives under `migrations/pending/`. It was, however, the only one with dead
conflict-handling behind it, which is why it is the one that was fixed here.

---

## Method, and what it misses

Live truth came from a scratch database bootstrapped from the journal and nothing else:

```
psql -d postgres -c "CREATE DATABASE scratch_declconstraint"
DATABASE_URL=<local scratch_declconstraint> node src/scripts/db-bootstrap.mjs
  -> RESULT: REACHED_HEAD 670/670  (14.7s), then 672/672 after 1047 and 1048 landed
```

Then `pg_index` + `pg_constraint` + `pg_class`, not SQL parsing — a migration can create
an object a later one drops, and only the catalog knows. Declared truth came from
`getTableConfig()` over the runtime barrel: **873 tables, 4,944 declared constraints and
indexes** (725 `unique()`, 1,855 `index()`/`uniqueIndex()`, 2,287 foreign keys, 77 checks).

Existing scratch databases were **not** used as the reference. `scratch_perf_seed` is 5
migrations behind; `scratch_t15f_follow` has all 670 applied **plus one migration
(`when` 1803000010106) that is not in the journal at all**, so it is not journal head.

### What this misses

- **Check-constraint expressions.** Matched by NAME only. Normalising a Drizzle SQL
  fragment against `pg_get_constraintdef` needs a SQL parser. A live check of the right
  name with the wrong predicate reads clean.
- **Expression indexes.** `indkey = 0` renders as `<expr>`, so
  `uniqueIndex().on(lower(work_email))` can only ever be matched by name, never by shape.
  One finding (`uniq_org_people_active_work_email_ci`) is in that class.
- **Partial predicates** are compared only as present/absent, never for equivalence.
- **Column ORDER inside a live index** is compared exactly, so a declared `(a,b)`
  answered by a live `(b,a)` reads as absent. One finding
  (`idx_hr_employments_org_person` vs live `uniq_hr_employments_org_id_person` on
  `(org_id,id,person_id)`) is in that class.
- **`ON DELETE`/`ON UPDATE` actions** are not compared. A live FK with the wrong action
  counts as present.
- **Nothing about production.** Every measurement is on a bootstrapped database. If the
  live estate has drifted further, this understates it.

### False-positive control — the numbers move a lot

The sibling column gate's first run was 23 findings of which 22 were false positives.
The same applies here; the raw scan and the controlled scan differ substantially.

| Control | What it caught |
|---|---|
| **A. Constraint/index equivalence** | Postgres implements `UNIQUE CONSTRAINT` with a same-named unique index; a bare `CREATE UNIQUE INDEX` leaves no `pg_constraint` row. `unique()` and `uniqueIndex()` must be one population matched against both catalogs. Comparing only `pg_constraint` reports **every** `uniqueIndex` as missing. |
| **B. Name reuse across an expand** | `idx_ai_chat_messages_org_user_id` is declared on `(org_id, user_membership_id, id)` while the live index of that NAME is still on the legacy `(org_id, user_id, id)`, and the declared columns are indexed as `idx_ai_chat_messages_org_user_membership_id`. Three tables (`ai_chat_messages`, `ai_chat_conversations`, `ai_action_proposals`) are in exactly this state. Name-only matching calls all three missing; **they are not**. |
| **C. Tenant-anchored composite FKs** | Migrations `1006`/`1024`/`1025` replaced single-column FKs with `(org_id, child_id) -> parent(org_id, id)`, which the declaration still writes as an inline `.references()` on the child column alone. **19 of 124** raw FK findings are this — a strictly stronger live constraint. |
| **D. Prefix coverage** | A declared index on `(org_id)` is answered by a live btree on `(org_id, status)`. Migration `0999` dropped 337 indexes on exactly that reasoning. |

After the controls: **189 findings**, of which **137 integrity** and **52 performance**.
446 name-drift, 38 partial-predicate and 1,188 undeclared observations are reported and
never failed.

---

## Where the 189 come from

Every finding was attributed by grepping its constraint name across `migrations/*.sql`
and `migrations/pending/**`:

| Source | Count | Meaning |
|---|---:|---|
| **No SQL anywhere** | **117** | Declared in Drizzle and never written as a migration at all. `drizzle-kit generate` is unusable on this schema, so a `.on()` added to a schema file simply never becomes DDL. |
| **`migrations/pending/` only** | **66** | The `hr_people` defect class, generalised. 55 from `hrms-phase1/0000`, `0001`, `0004`; 10 from `hrms-lifecycle-concurrency`; 1 from `hr-audit-cursor/0400`. |
| **Journalled, then gone** | **6** | Created by `0000` or `1041` and absent at head. |

By kind: 105 foreign keys · 52 indexes · 26 checks · 6 uniques.

---

## Ranked by consequence

### 1. `uniq_hr_people_org_person_link` — FIXED (migration `1048`)

The only finding with **dead conflict handling** behind it. Five sites branch on
`code === "23505" && constraint === "uniq_hr_people_org_person_link"`:
`hr-people.service.ts:172`, `recruitment-handoff.service.ts:141/164/179`,
`hr-import-commit.service.ts:142`. All five were unreachable.

Duplicates before creating it: measured on `scratch_perf_seed` (6,171 `hr_people` rows) —
**0 rows carry a non-null `organization_person_id` at all**, so 0 duplicates and the index
builds trivially there. That also means the seed proves nothing about a populated estate,
so `1048` **refuses rather than de-duplicates**: a `DO` block names the offending
`(org_id, organization_person_id)` pairs and aborts. Deleting one of two `hr_people` rows
is a data decision — `hr_employments` and `hr_probation_reviews` reference the survivor
through `(org_id, id)`.

Bite-proved on `scratch_declconstraint`:

```
duplicate insert -> ERROR: duplicate key value violates unique constraint
                    "uniq_hr_people_org_person_link"      <- the exact string the 5 handlers compare
two NULL links in the same org -> both accepted (the predicate excludes them)
pre-existing duplicates + the DO block -> ERROR: hr_people has 1 duplicated pair(s) … HINT: …
rollback/1048…down.sql -> index count 0; forward re-applied -> 1
```

### 2. Five remaining declared uniques — integrity, ranked

| Table | Declared | Live | Verdict |
|---|---|---|---|
| `organization_people` | `uniq_org_people_active_work_email_ci` on `(organization_id, lower(work_email)) WHERE work_email IS NOT NULL AND archived_at IS NULL AND deleted_at IS NULL` | `uniq_org_people_org_work_email` on `(organization_id, work_email) WHERE work_email IS NOT NULL` | **Real gap.** Live is case-SENSITIVE and does not exclude archived/deleted. `alice@x.com` and `Alice@x.com` both insert. |
| `hr_employments` | `uniq_hr_employments_org_engagement_link` on `(org_id, worker_engagement_id)` partial | nothing on `worker_engagement_id` | **Real gap**, same origin as `hr_people` (`hrms-phase1/0000`). No handler names it, which is why it ranks below `hr_people`. |
| `interview_scorecards` | `uniq_scorecard_interview_membership` on `(interview_id, interviewer_membership_id)` | `uniq_scorecard_interview_interviewer` on `(interview_id, interviewer_id)` | **Not an open hole today.** Uniqueness on (interview, person) IS enforced through the legacy `user_id`/`interviewer_id` pair, which the declaration also still names and which IS live. The membership half becomes the only guard when the legacy column contracts. |
| `interview_panel_members` | `uq_interview_panel_members_interview_membership` | `uq_interview_panel_members_interview_user` on `(interview_id, user_id)` | as above |
| `booking_link_interviewers` | `uq_booking_link_interviewers_link_membership` | `uq_booking_link_interviewers_link_user` | as above |
| `calibration_participants` | `uq_calibration_participants_session_membership` | `uq_calibration_participants_session_user` | as above |

None of the five has a 23505 handler naming it (grepped). The four hiring-interview ones
are the expand-half of a `user_id -> *_membership_id` expansion where the SQL was never
written — they appear in **no migration at all**, journalled or pending.

### 3. Foreign keys — 105, of which the sharp ones are the actor composites

`(org_id, *_membership_id) -> organization_members(org_id, id)`, ~25 of them across
`hr_people`, `hr_employments`, `attendance`, `onboarding_tasks`, `feedback_requests`,
`shift_swap_requests`, `roster_entries`, `overtime_requests`, `comp_off_balances`,
`org_units`, `interview_panel_members`, `booking_link_interviewers`,
`calibration_participants`. **An actor column with no FK can name a membership in
another tenant.** The remainder split into a `*_created_by -> users(id)` family (~15,
global identity, low consequence) and the `inv_*`/`crm_*` lot-and-serial family, which is
**out of release scope** and reported only.

### 4. Indexes — 52, performance only

51 of 52 have **no live index containing those columns in any order**. The
`worker_engagements` cluster (9), `workers` (3), `organization_people` (2), `hr_people`
(2) and `hr_employments` (5) all come from `hrms-phase1`. `idx_loans_org_status`,
`idx_bonuses_org_status`, `idx_fnf_settlements_org_status`, `idx_asset_returns_org_status`
appear in no SQL anywhere.

### 5. Checks — 26, and every one is enforceable in the service layer

`chk_*_row_version`, `chk_org_units_kind`, `chk_workers_status`,
`chk_worker_engagements_dates`, … 24 of 26 come from `hrms-phase1`. Lowest urgency, and
the class this method measures least well (name-only matching).

---

## Present-but-undeclared — 1,188, reported, never failed

Two large benign families: 91 `uniq_<table>_org_id` tenant anchors added by the composite-FK
wave, and 92 hashed actor indexes (`idx_hr_actor_*` from `0921`, `idx_s0N_hr_*` from the
S-series) whose names are derived from an md5, so no declaration can ever name them.

**A known false-positive class in this bucket that I did not remove**: the walker reads
only table-level `uniqueConstraints`, so a column-level `.unique()` (Drizzle names it
`<table>_<column>_unique`) is counted as undeclared. `organizations_slug_unique`,
`users_email_unique`, `permissions_name_unique` and ~30 others are that. The bucket never
fails the gate, so the inflation costs nothing but should not be quoted as a count.

The 12 genuinely interesting entries are live UNIQUE indexes with no constraint row and no
declaration — including `uniq_users_email_ci` (an expression index the declaration cannot
express), `uniq_kb_chunks_article_revision`, `uniq_inv_products_org_sku_live`. Each is
integrity the ORM does not know about, and a future `drop` of any of them looks free.

---

## What `migrations/pending/` should be

It should stay. The contract in the sub-READMEs is real: `hrms-phase1` and
`hrms-relational-normalization` are delivered by a hash-allowlisted bundle runner, not by
`drizzle-kit migrate`, and `src/db/migration-integrity.spec.ts` **asserts the five
`hrms-phase1` forward files never appear in `meta/_journal.json`**. Journalling them fails
that spec. "Move them up and register" is the wrong recommendation for 3 of the 6 bundles.

What is wrong is narrower and worth stating as a rule, which the top-level README now
does: **nothing under `migrations/pending/` may be the only creator of an object that
`src/db/schema/**` declares.** The declaration is a promise about the live database; 66 of
those promises are kept only by a bundle that has never run, on 15 tables that are all in
the runtime barrel. Two ways out, by table:

- in the runtime barrel → extract the object into its own journalled migration, the way
  `1048` extracted `uniq_hr_people_org_person_link` (the bundle keeps its copy;
  `IF NOT EXISTS` makes the pair idempotent);
- genuinely SQL-managed → move the table into `db/schema/hrms-phase1-sql-managed.ts`,
  which is deliberately outside the runtime barrel.

The top-level `README.md` table also listed 1 of 25 files. It now lists every bundle,
separating the four that are "move up and register" from the three the bundle runner owns.

---

## The gate

`pnpm check:declaration-constraint-drift` — worth building, and cheap: the whole input is a
15-second bootstrap plus two catalog queries. It is a **ratchet**, not a wall: 189 findings
are baselined in `src/scripts/baselines/declaration-constraint-drift.json` and it fails
only on a finding that is not there — i.e. a constraint added to the schema in this change
with no migration behind it. A gate that went red on day one over 189 pre-existing
findings would be muted within a week; this one is green today and bites tomorrow.

Split under CLAUDE.md §7 into `src/scripts/declaration-constraint-drift/{catalog,declared,compare,self-test}.ts`
plus a 233-line entry file; every file is under 300 lines and neither size gate lists any of
them.

**Bite-proved hermetically, both directions**, in a temp tree from `git archive HEAD`
(the shared working tree was never touched — `git status --short -- src/db/schema/` empty
throughout):

```
temp tree, clean                 -> EXIT 0   137 integrity (0 new) · 52 performance (0 new)
+ uniqueIndex("uniq_bite_planted_unique").on(orgId, userId)
+ index("idx_bite_planted_index").on(deletedAt)
temp tree, defects planted       -> EXIT 1   138 integrity (1 new) · 53 performance (1 new)
                                    INTEGRITY   public.hr_people.uniq_bite_planted_unique
                                    PERFORMANCE public.hr_people.idx_bite_planted_index
temp tree, defects removed       -> EXIT 0
```

`--self-test` carries 33 pure-function assertions, including the reduced `hr_people`
defect, migration `1048` clearing it, and **each false-positive control asserted in both
directions** — the downgrade fires with its cause present, and the same shape still fails
with the cause removed.

---

## Gates

| Command | Exit | Number |
|---|---:|---|
| `pnpm typecheck` | **0** | clean. First run was **2** — one error, mine: drizzle 0.45's `index.config.name` is `string \| undefined`, which `ts-node/transpile-only` never sees, so 33 green self-tests proved nothing about it. Fixed in `bfe8e3aa`. |
| `pnpm check:spec-typecheck` | **0** | spec-inclusive typecheck passed |
| `pnpm check:migration-rollback` | **0** | 672 migrations scanned |
| `pnpm check:migration-discipline` | **0** | |
| `pnpm check:migration-ledger` | **0** | 672 journal entries, 0 orphan/duplicate/unreachable |
| `pnpm check:declaration-column-drift` (against `scratch_declconstraint`) | **0** | no write- or read-blocking column drift |
| `pnpm check:declaration-constraint-drift` | **0** | 137 integrity (0 new) · 52 performance (0 new) · baseline 189 |
| `pnpm check:declaration-constraint-drift:self-test` | **0** | 33 passed |
| `pnpm check:type-assertions` | **0** | the new gate adds no cast |
| `jest --runInBand --testPathPattern="migration-integrity\|hr-people.service.spec\|postgres-error.spec"` | **0** | 3 suites, 48 tests |
| `pnpm check:file-sizes` | **1** | red on 5 pre-existing files, **none mine** |
| `pnpm check:over-300` | **1** | 403 files, 9 above baseline — the pre-existing count; my 5 files are all under 300 |
| `pnpm check:kebab-case` | **1** | red on `src/scripts/_interrupt-bootstrap.mjs` and `_run-bootstrap-scratch.mjs`, both another lane's untracked temp scripts |
| `pnpm check:dead-code` | **1** | stale verdict `src/common/tenant/tenant-context.ts:getTenantAbortSignal` — not mine |

## Commits (backend)

| SHA | What |
|---|---|
| `385fce41` | `1048_hr_people_org_person_link_unique.sql` + rollback + journal entry (idx 804, when 1803000010123) |
| `c4f5f2f3` | `check:declaration-constraint-drift` + baseline + package.json wiring |
| `e3724ce1` | split by responsibility under §7 |
| `411ac2fc` | `migrations/pending/README.md` — the rule and the inventory |
| `bfe8e3aa` | typecheck fix |

## Cross-territory findings, not fixed

- **Inventory (out of scope)**: ~30 declared FKs to `inv_lots(id)` / `inv_serial_numbers(id)`
  absent at head across `inv_stock_levels`, `inv_stock_transactions`, `inv_pick_list_lines`
  and others; `fk_inv_categories_parent` and `fk_inv_locations_parent` (self-referential
  hierarchy) likewise.
- **CRM (out of scope)**: `contacts_merged_into_id_contacts_id_fk` and
  `crm_organizations_merged_into_id_crm_organizations_id_fk` — the merge pointer has no FK;
  `quotes_pricebook_id_*`, `crm_validation_rules_pipeline_id_*`, `crm_sla_breach_log_*`.
- **`src/common/tenant/tenant-context.ts`** — `check:dead-code` has a stale verdict.
- **`src/scripts/_interrupt-bootstrap.mjs`, `src/scripts/_run-bootstrap-scratch.mjs`** —
  untracked temp scripts from another lane that keep `check:kebab-case` red.
- **`src/scripts/check-declaration-column-drift.ts`** at 534 lines is one of the 5 files
  keeping `check:file-sizes` red.
