# 09 — Staging verification of migrations 1141 and 1142

Workstream D, Build Phase 2. Written 2026-09-22.

Scope: make `1141_projects_pm_workspace_optional` and
`1142_fix_requisition_headcount_fk_set_null` staging-ready and fully specified,
prove statically everything that can be proved without a database, and name the
residual database-blocked items with their exact environment variables.

**There is no staging database on this machine.** Port 5432 is closed, there are
no Postgres binaries, no Docker, no WSL distro, and no Neon credentials. The only
reachable Postgres is production Aurora RDS. Nothing in this document was run
against a database, and no step below should be run against production.

---

## 1. Verification table

Claims are from `docs/build-module/PHASE-1-STATUS.md` lines 194-220. Verdicts are
mine, from source, not from the doc.

| # | Claim | Verdict | Evidence |
|---|---|---|---|
| 1 | 1141 SQL is exactly `ALTER TABLE "build"."projects" ALTER COLUMN "pm_workspace_id" DROP NOT NULL;` | **TRUE** | `backend/migrations/1141_projects_pm_workspace_optional.sql:3`. The file is three lines: `SET lock_timeout`, breakpoint, the ALTER. |
| 2 | 1141 has a lock timeout (BE-64) | **TRUE** | `1141_projects_pm_workspace_optional.sql:1` — `SET lock_timeout = '5s';` |
| 3 | 1141 is catalog-only, no table rewrite | **TRUE** | `DROP NOT NULL` clears `pg_attribute.attnotnull` only. The file contains no DML, no `SET DATA TYPE`, no `VACUUM FULL`. Asserted by spec test *"contains no table rewrite verbs so the change stays catalog-only"*. |
| 4 | 1141 journal idx=1029, when=1803000010410 | **TRUE** | `backend/migrations/meta/_journal.json`, entry `{idx:1029, when:1803000010410, tag:"1141_projects_pm_workspace_optional", breakpoints:true, version:"7"}`. |
| 5 | 1141 rollback uses the mandated two-step NOT NULL path (BE-63) | **TRUE** | `backend/migrations/rollback/1141_projects_pm_workspace_optional.down.sql` — adds `chk_projects_pm_workspace_id_not_null … NOT VALID`, `VALIDATE`s it, then `SET NOT NULL`, then drops the scaffolding. Order asserted by spec. |
| 6 | Schema drift: DB enforces NOT NULL, contract is nullable | **PARTIAL — and the stated blast radius is WRONG** | See §2. The contract really is nullable/optional, but the claim "writes omitting field will raise 23502" does not hold. |
| 7 | 1142 repairs `fk_job_requisitions_headcount_org` to `ON DELETE SET NULL (headcount_id)` | **TRUE** | `backend/migrations/1142_fix_requisition_headcount_fk_set_null.sql` — drop, then re-add with `ON DELETE SET NULL ("headcount_id")`. |
| 8 | 1142 has a lock timeout | **TRUE** | `1142_fix_requisition_headcount_fk_set_null.sql:2` — `SET lock_timeout = '5s';` |
| 9 | 1142 has the NOT VALID → VALIDATE split (BE-62) | **TRUE** | Constraint added `NOT VALID`; `ALTER TABLE "job_requisitions" VALIDATE CONSTRAINT …` is a separate statement after a breakpoint. 4 statements total. |
| 10 | 1142 journal idx=1030, when=1803000010420 | **TRUE** | `_journal.json`. 1030 is also the maximum idx, so 1142 is the journal head. |
| 11 | 1142 rollback restores the broken form | **TRUE** | `backend/migrations/rollback/1142_fix_requisition_headcount_fk_set_null.down.sql` re-adds a bare `ON DELETE SET NULL` with no column list. See §5 for what that means operationally. |
| 12 | 903 SQL files ↔ 903 journal entries | **TRUE** | Counted: 903 `.sql` files in `backend/migrations`, 903 `entries` in `_journal.json`. |
| 13 | Zero duplicate idx, zero unjournalled files, zero fileless entries | **TRUE** | Set difference in both directions is empty; `idx` and `tag` are both unique across 903 entries. |
| 14 | Only 1 `when` non-increase (0619/0271a), 0 when sorted by idx | **TRUE** | Array order has exactly one drop: `0271a_waitlist_admission` (1803000010178) → `0619_chain_creates_what_production_has` (1787895425277). Sorted by idx there are zero. |
| 15 | Duplicate `1090` numeric prefix is pre-existing and adjudicated | **TRUE** | `check:migration-discipline` passes with 0 new violations and explicitly enforces duplicate numeric prefixes against a baseline. |
| 16 | No PostgreSQL minimum version is declared anywhere | **TRUE** | `backend/package.json` `engines` is `{"node":">=22"}` only. No `docker-compose.yml`, no boot assertion. |
| 17 | 1142's syntax requires PG15 | **TRUE** | `ON DELETE SET NULL (<cols>)` is PostgreSQL 15+. |
| 18 | That syntax "exists in ~100 sealed migrations back to 0265" | **FALSE on the date, TRUE on the count** | The earliest *real DDL* use is `0578_tenant_fks_public_c.sql:1030`, not 0265. `0265_party_association_columns.sql:43` mentions the syntax only inside a `--` comment. Real-DDL file count is **96**, not 99. See §4. |
| 19 | CI uses `pgvector/pgvector:pg16` | **TRUE** | `backend/.github/workflows/db-gates.yml:77`. |
| 20 | Both migrations' hashes are pinned by a sealed chain hash file | **FALSE** | `backend/migrations/meta/_chain.sha256.json` holds 685 entries and contains **neither** 1141 nor 1142. The immutability gate does not pin them. See §3. |

### Additional findings not in the doc

| Finding | Evidence |
|---|---|
| **The Phase 1 runbook's own recommended commands are unsafe on this machine.** `pnpm check:migration-chain`, `pnpm check:migration-ledger`, `pnpm migration:proof` and `pnpm migration:proof:focused` all run `node --env-file-if-exists=.env`, and the repo `.env` points at production Aurora. Following the Phase 1 advice verbatim connects to production. | `backend/package.json` scripts; `src/scripts/verify-migration-chain.mjs:180` and `src/scripts/check-migration-ledger.mjs:118` both read plain `process.env.DATABASE_URL`. |
| `db:apply-one` is worse: it uses `--env-file=.env`, not the `-if-exists` form. | `backend/package.json`, `db:apply-one`. |
| **`jest-e2e.json` and `jest-db.json` do not exist** in this worktree or in the main repo checkout, are not tracked by git, and are not gitignored (`git check-ignore` exits 1). Four scripts — `test:e2e`, `test:e2e:ci`, `test:e2e:support`, `test:db-specs` — therefore crash rather than skip. | `ls jest*.json` finds nothing; `git ls-files` lists none. |
| **The JS-regex CRLF trap is live in this migration corpus.** Migration files use CRLF. A comment stripper written as `line.replace(/--.*$/, "")` silently strips nothing, because JS `.` does not match `\r` and `$` then cannot anchor. This produced a wrong first pass of the PostgreSQL floor scan in this very workstream before it was caught. | 1142 has 23 CR and 23 LF. Corrected stripper uses `/--[^\n]*/` after normalising `\r\n`. |
| The Drizzle declaration for the 1142 constraint is a bare `.onDelete("set null")`, which looks like drift but is not. | `backend/src/db/schema/hr/requisitions.ts:37`. `src/db/schema/set-null-column-lists.ts` *derives* the required column list from nullability rather than reading a hand-maintained list, so `fk_job_requisitions_headcount_org` is covered automatically and resolves to `setNullColumns = ["headcount_id"]`. |

---

## 2. The schema drift claim, re-characterised

The doc says: *"Database still enforces NOT NULL; OpenAPI contract now nullable.
Writes omitting field will raise 23502 until applied."*

**The contract half is true.**

- `backend/src/db/schema/build/core.ts:46` — `pmWorkspaceId: text("pm_workspace_id")`, with no `.notNull()`. Drizzle already models the column as nullable.
- `backend/src/modules/build/core/dto/build-core-response.schemas.ts:258` — `pmWorkspaceId: z.string().nullable()` on `projectListItemSchema`. Reads tolerate NULL.
- `backend/src/modules/build/core/dto/project-core.schemas.ts:89` — `pmWorkspaceId: z.string().optional()` on `createProjectSchema`. A create request may omit the field.

**The blast-radius half is false.** No HTTP write path can insert NULL:

- `backend/src/modules/build/pm-workspaces/pm-workspaces.service.ts:221` —
  `resolveWorkspaceIdForWrite(orgId, requested): Promise<string>`. When the input
  is `undefined` it returns `resolveDefaultWorkspaceId(orgId)`.
- `pm-workspaces.service.ts:196` — `resolveDefaultWorkspaceId(orgId): Promise<string>`
  calls `ensureDefaultWorkspace`, which provisions the workspace if absent.
- All three insert sites receive that non-null string:
  `projects-provision.service.ts:106`, `projects-provision.service.ts:209`,
  `projects-templates.service.ts:158`.

So the return type is `Promise<string>`, never `string | null`. Omitting
`pmWorkspaceId` from a create request yields the org's default workspace id, not
NULL. **A 23502 on `build.projects.pm_workspace_id` is not reachable through the
API.** It is reachable only by a direct SQL insert, a seed script, or a fixture
that bypasses the service layer.

Note also that `build-core-response.schemas.ts:230` (`pmWorkspaceId: z.string()`,
not nullable) is *not* a drift: it belongs to `workspaceMemberRowSchema`, which
projects `pm_workspace_memberships`, a different table whose column is genuinely
`notNull()` (`pm-workspace-memberships.ts:21`).

### Is the drift claim now stale?

The coordinator reports the production migration ledger reconciled at 903/903
with 0 pending. If that is accurate, 1141 and 1142 are **already applied in
production**, and the premise "database still enforces NOT NULL" is stale —
the database and the contract now agree and there is no drift at all.

**I cannot settle this without a database.** Both readings are consistent with
everything I can see statically. Resolving it requires exactly one query, listed
in §7 as the first database-blocked item.

Either way the operational risk is nil: if applied, contract and catalog agree;
if unapplied, the only path that could trip 23502 is not reachable from the API.

---

## 3. Preflight gate

Everything in this section that does not need a database has been run. Results
are in §6.

**P1 — journal head matches the file set.** 903 `.sql` files, 903 journal
entries, empty set-difference both ways, `idx` and `tag` both unique, 1142 is the
maximum idx. Covered by the spec, and independently by
`check:migration-discipline` (checks 6 and its journal checks).

**P2 — file hashes match the sealed chain hash file.** *This cannot pass as
stated, and the reason is a finding, not a failure.*
`backend/migrations/meta/_chain.sha256.json` contains 685 entries and lists
neither 1141 nor 1142. New migrations are not sealed until a seal run adds them,
so `check:migration-immutability` — which passes — says nothing whatsoever about
these two files. Substitute pin: the spec records the exact bytes.

```
1141_projects_pm_workspace_optional          a65318a8013ed2c733be1c6af0f8529fe43b7d09d7667e71a0e6ce0aa3951042
1142_fix_requisition_headcount_fk_set_null   96f76c745ff077deafac70f5e5960cefc38f2c136f709b8890a904ca07e26ba3
```

These are sha256 over the full file bytes, which is exactly what the appliers
record in `drizzle.__drizzle_migrations.hash`
(`src/scripts/run-pending-migrations.mjs:72`,
`src/scripts/apply-journalled-migration.mjs`). Any out-of-band edit changes the
hash and fails the spec.

**P3 — predecessor ordering.** `1140_exit_checklist_ownership` (idx 1028,
when 1803000010400) < 1141 (idx 1029, when 1803000010410) < 1142 (idx 1030,
when 1803000010420). `when` is strictly increasing across all 903 entries when
sorted by idx.

**P4 — discipline, immutability, rollback, watermark-free gates green.** All four
run without any database and all four pass. See §6.

**P5 — 1142 shape.** Lock timeout present, `NOT VALID` precedes `VALIDATE`,
the SET NULL column list names only `headcount_id`, exactly 4 statements.

---

## 4. The real PostgreSQL floor

**Floor: PostgreSQL 15.** The "PostgreSQL 15+" requirement stands unchanged —
nothing in the 903-migration chain uses PG16, PG17 or PG18-only syntax.

Method: read all 903 files, normalise `\r\n`, strip `/* */` blocks and `--` to
end-of-line with `[^\n]*` rather than `.*$`, then match version-gated syntax
against the stripped text. The naive `.*$` stripper strips nothing on CRLF files
and inflates every count.

| Feature | Min PG | Real-DDL files | Earliest |
|---|---|---|---|
| `NULLS NOT DISTINCT` | **15** | 5 | `0220_autonomy_switches.sql:50` |
| `ON DELETE SET NULL (cols)` | **15** | 96 | `0578_tenant_fks_public_c.sql:1030` |
| `GENERATED ALWAYS AS (…) STORED` | 12 | 2 | `0016_volatile_nicolaos.sql` |
| `gen_random_uuid()` core | 13 | 29 | `0000_light_vance_astro.sql` |
| `CREATE OR REPLACE TRIGGER`, `date_bin` | 14 | 0 | — |
| `ANY_VALUE`, `SYSTEM_USER`, `pg_stat_io` | 16 | 0 | — |
| `JSON_TABLE`, `JSON_VALUE/QUERY/EXISTS`, `MERGE`, `AT LOCAL` | 17 | 0 | — |
| `uuidv7()`, `NOT ENFORCED`, `VIRTUAL` generated, `RETURNING OLD/NEW` | 18 | 0 | — |

The floor is set by `NULLS NOT DISTINCT` at **0220**, which is *earlier* in the
chain than any SET NULL column list. So PG15 was already required 358 migrations
before 1142; 1142 does not raise the floor.

Apparent PG16/17/18 hits are all false positives from unstripped prose:

- "MERGE" — 18 files, every one the English word in comments about the party
  merge domain (`0209_party_roles_and_merges.sql` and neighbours). Zero
  `MERGE INTO` statements.
- "NOT ENFORCED" — the only surviving hit is a string literal inside
  `RAISE EXCEPTION '0799: … reaction uniqueness not enforced'`
  (`0799_chat_actor_backfill_validate.sql:218`).
- "AT LOCAL" — prose in a `0426_notification_timestamptz.sql` comment.

Extensions required beyond core: `btree_gist` (4 files) and `pg_trgm` (2 files),
both contrib. The CI image `pgvector/pgvector:pg16` satisfies PG15+ and carries
pgvector.

**Recommendation:** declare the floor. There is currently no `engines.db`, no
compose file and no boot assertion, so nothing stops someone pointing the chain
at PG14, where 101 migrations fail on syntax.

---

## 5. Rollback verification plan

The executable proof is
`backend/docs/phase-2/sql/d-1141-1142-rolled-back-proof.sql`. Every block is
`BEGIN … ROLLBACK`, so a clean run mutates nothing. Run it only against a
non-production PostgreSQL 15+ database carrying the chain through 1140.

| Block | Proves | Pass criterion |
|---|---|---|
| 1 | 1141 forward clears `attnotnull` | `1141 FORWARD OK` notice |
| 2 | 1141 forward then its rollback restores NOT NULL and leaves no scaffolding | `1141 REVERSE OK` notice |
| 3 | 1142 forward sets `confdelsetcols` to exactly `headcount_id` and validates | `1142 FORWARD OK` notice |
| 4 | With 1142 applied, deleting a `headcount_requests` parent nulls the child pointer instead of raising 23502 | `1142 BEHAVIOUR OK` notice |
| 5 | Control: with the pre-repair bare SET NULL, the same delete *does* raise 23502 | `PRE-REPAIR CONTROL OK` notice |

Block 5 is the control that stops block 4 being vacuous. If block 5 reports
`PRE-REPAIR CONTROL FAILED`, the premise of 1142 does not hold on that target and
the repair should be re-argued before shipping.

Blocks 4 and 5 report SKIPPED when no `job_requisitions` row references a
`headcount_requests` row. A skip is **not** a pass — plant a fixture pair and
re-run, or the behavioural half of the proof has not happened.

### What each rollback actually leaves behind

**1141 rollback** restores the pre-migration state exactly: `pm_workspace_id`
is `NOT NULL` again and the scaffolding check constraint is dropped. The two-step
path exists so the full-table validation scan runs under `SHARE UPDATE EXCLUSIVE`
(via `VALIDATE CONSTRAINT`) rather than holding `ACCESS EXCLUSIVE` for the
duration of a bare `SET NOT NULL`. **It is not unconditionally safe**: if any row
acquired a NULL `pm_workspace_id` while 1141 was in effect, `VALIDATE CONSTRAINT`
fails and the rollback aborts. Before rolling back, run:

```sql
SELECT count(*) FROM build.projects WHERE pm_workspace_id IS NULL;
```

A non-zero count must be backfilled first. The rollback has no backfill step.

**1142 rollback deliberately reinstates a defect.** It re-adds
`fk_job_requisitions_headcount_org` with a bare `ON DELETE SET NULL` and no
column list. Because `org_id` is `NOT NULL`, Postgres will then try to write NULL
into `org_id` on any parent delete, so:

> **Once 1142 is rolled back, every `DELETE FROM headcount_requests` that has a
> referencing `job_requisitions` row raises 23502 again.** HR headcount deletion
> is broken for as long as that state persists.

Operationally this means 1142's rollback is a *transitional* step only — use it
to unwind a failed deploy, then either re-apply 1142 or roll forward. Do not
leave it in place, and do not treat "rollback succeeded" as "system healthy".
The rollback file's own header says as much. There is no data-loss risk either
way; the risk is a re-broken delete path.

Note the asymmetry: 1141 is genuinely reversible, 1142 is reversible only into a
known-bad state. If both need unwinding, unwind 1142 last and re-apply it first.

---

## 6. Static proof run

Every command below was actually run in
`D:\projects\personal\slos-be-phase-2-data`. Exit codes are real.

| Gate | Command | Exit | Result |
|---|---|---|---|
| Discipline self-test | `node src/scripts/check-migration-discipline.mjs --self-test` | 0 | **PASS** — 27 passed, 0 failed |
| Discipline | `node src/scripts/check-migration-discipline.mjs` | 0 | **PASS** — 903 files, 0 new violations. Emits the expected `[journal-order]` note for 0619. |
| Immutability self-test | `node src/scripts/check-migration-immutability.mjs --self-test` | 0 | **PASS** — 13 passed |
| Immutability | `node src/scripts/check-migration-immutability.mjs` | 0 | **PASS** — every sealed migration still builds the same database. Does **not** cover 1141/1142 (§3, P2). |
| Rollback self-test | `node src/scripts/check-migration-rollback.mjs --self-test` | 0 | **PASS** — 9 passed, 0 failed |
| Rollback | `node src/scripts/check-migration-rollback.mjs` | 0 | **PASS** — 903 scanned; compliance required above prefix 839, so both 1141 and 1142 are in scope and both have `.down.sql` |
| Watermark-free self-test | `node src/scripts/check-watermark-free-appliers.mjs --self-test` | 0 | **PASS** — 10 checks, both directions bite |
| Watermark-free | `node src/scripts/check-watermark-free-appliers.mjs` | 0 | **PASS** — 5 appliers iterate the journal and guard double application; none selects by watermark |
| SET NULL text self-test | `node -r ts-node/register/transpile-only src/scripts/check-set-null-migration-text.ts --self-test` | 0 | **PASS** — 57 passed |
| SET NULL text | `node -r ts-node/register/transpile-only src/scripts/check-set-null-migration-text.ts` | 0 | **PASS** — 246 composite SET NULL keys installed with a column list, 2 known bare, **0 new**. Sees 1142's repair. |
| Chain self-test | `node src/scripts/verify-migration-chain.mjs --self-test` | 0 | **PASS** — 24 passed, 0 failed |
| Ledger self-test | `node src/scripts/check-migration-ledger.mjs --self-test` | 0 | **PASS** |
| Composite FK self-test | `node src/scripts/check-composite-fk-set-null.mjs --self-test` | 0 | **PASS** — 7/7 |
| Preflight spec | `node ./node_modules/jest/bin/jest.js --runInBand src/db/schema/phase-2/migration-1141-1142-preflight.spec.ts` | 0 | **PASS** — 1 suite, 32 tests, 32 passed |

**INCONCLUSIVE for lack of a database target** (not run, not failed):

| Gate | Needs |
|---|---|
| `verify-migration-chain.mjs` full run | `DATABASE_URL` |
| `check-migration-ledger.mjs` full run | `DATABASE_URL` |
| `migration-proof.mjs`, `migration-proof-focused.mjs` | `DATABASE_URL` |
| `check-set-null-column-lists.ts` catalog half | `SET_NULL_GATE_DATABASE_URL` |
| `check-composite-fk-set-null.mjs` full run | `DATABASE_URL` or `APP_DATABASE_URL` |
| `replay-chain-cold.mjs` | `COLD_DATABASE_URL` |
| `set-null-column-lists.db.spec.ts` | `SET_NULL_GATE_DATABASE_URL` |

One note on safety: the worktree `D:\projects\personal\slos-be-phase-2-data`
contains only `.env.example`, no `.env`. `check-composite-fk-set-null.mjs:36`
calls `dotenv.config({ path: <backendRoot>/.env })` and reported "injected env (0)".
That absence is the only thing making the `--env-file-if-exists` scripts inert
here — it is not a designed guard, and it does not hold in the main checkout,
where `backend/.env` does exist and points at production.

---

## 7. Staging runbook

### 7.0 Provision the target

Not done — provisioning cloud infrastructure is out of scope for this
workstream. What is needed: **one PostgreSQL 15 or newer database**, non-production,
reachable from the operator's machine, with the `btree_gist` and `pg_trgm`
extensions available. PG16 matches CI. It must carry the migration chain through
`1140_exit_checklist_ownership` before step 4.

### 7.1 Environment variables, read from source

Do not guess these — the repo uses a different variable per gate.

| Variable | Read by | Purpose |
|---|---|---|
| `APPLY_ONE_DATABASE_URL` | `src/scripts/apply-journalled-migration.mjs:56` | **Preferred** target for applying one journalled migration. Wins over `DIRECT_DATABASE_URL` and `DATABASE_URL`, so aiming the applier never requires touching `.env`. |
| `DIRECT_DATABASE_URL` | same, line 58 | Second precedence. |
| `DATABASE_URL` | same, line 60 | Last resort. Pooler hosts are rewritten `-pooler.` → `.` |
| `APPLY_ONE_ALLOW_REMOTE` | same, line 39/105 | Must be exactly `"1"` to allow a non-loopback target. Anything else, including `"true"`, still refuses. |
| `SET_NULL_GATE_DATABASE_URL` | `src/scripts/check-set-null-column-lists.ts:48`, `src/db/schema/set-null-column-lists.db.spec.ts:31` | Catalog half of the SET NULL gate — the only thing that can read `confdelsetcols`. |
| `COLD_DATABASE_URL` | `src/scripts/replay-chain-cold.mjs:35` | Cold full-chain replay. |
| `SCRATCH_URL` | `src/scripts/reset-scratch-db.mjs:28` | Scratch reset. `assertScratchTarget` requires the **database name** to contain `scratch`; it refuses `neondb`. |
| `ALLOW_PRODUCTION_MIGRATION` | `src/scripts/run-pending-migrations.mjs:25` | Production safety interlock on the bulk applier. Leave unset. |

Also verified, for whoever boots the app against staging:
`src/config/env.validation.ts` requires `APP_DATABASE_URL` to (a) use a
**different** username from `DATABASE_URL`, (b) share the same `host:port/path`,
and (c) have a username equal to `APP_DB_ROLE` (default `streamline_app`).
Violate any of those and the app refuses to boot.

### 7.2 The four commands you must not run

`pnpm check:migration-chain`, `pnpm check:migration-ledger`,
`pnpm migration:proof`, `pnpm migration:proof:focused` and `pnpm db:apply-one`
all load `.env` automatically, and `.env` is production. The Phase 1 runbook
recommends the first and the third; **that advice is unsafe as written.** Invoke
the scripts directly with an explicit variable instead, as below.

### 7.3 Ordered steps

Every step states the variable it reads and its pass criterion.

**Step 1 — static preflight, no database.**

```bash
cd /d/projects/personal/slos-be-phase-2-data
node src/scripts/check-migration-discipline.mjs
node src/scripts/check-migration-immutability.mjs
node src/scripts/check-migration-rollback.mjs
node src/scripts/check-watermark-free-appliers.mjs
node --max-old-space-size=4096 -r ts-node/register/transpile-only \
  src/scripts/check-set-null-migration-text.ts
node ./node_modules/jest/bin/jest.js --runInBand \
  src/db/schema/phase-2/migration-1141-1142-preflight.spec.ts
```

Reads: nothing. Pass: every command exits 0; discipline reports `0 new violations`;
SET NULL text reports `0 new`; the spec reports `1 suite, 32 tests, 32 passed`.
A spec run reporting `0 total` is a failure, not a pass.

**Step 2 — point at staging and confirm the target.**

```bash
export APPLY_ONE_DATABASE_URL='postgresql://…/streamlineos_staging'
```

Pass: the URL's database name is not production and not `neondb`. If the host is
not loopback you must also `export APPLY_ONE_ALLOW_REMOTE=1`, and you should
re-read the host aloud before doing so.

**Step 3 — confirm the chain is at 1140 and the pair is pending.**

```bash
node src/scripts/apply-journalled-migration.mjs \
  --tag=1141_projects_pm_workspace_optional --dry-run
node src/scripts/apply-journalled-migration.mjs \
  --tag=1142_fix_requisition_headcount_fk_set_null --dry-run
```

Reads: `APPLY_ONE_DATABASE_URL`. The script prints `target host:port/database` —
never the URL — then lists the statements without executing them. Pass: the
printed target is the staging database, 1141 shows 2 statements and 1142 shows 4,
and neither prints `ALREADY APPLIED`. `ALREADY APPLIED` means the ledger already
holds that file's sha256 and the rest of this runbook is a no-op.

**Step 4 — rolled-back proof, before applying anything.**

```bash
psql "$APPLY_ONE_DATABASE_URL" -v ON_ERROR_STOP=1 \
  -f docs/phase-2/sql/d-1141-1142-rolled-back-proof.sql
```

Pass: exit 0, and all five blocks report `OK`. A `SKIPPED` in blocks 4 or 5 means
fixtures are missing — plant them and re-run. A `PRE-REPAIR CONTROL FAILED` in
block 5 stops the deploy.

**Step 5 — apply, in order.**

```bash
node src/scripts/apply-journalled-migration.mjs \
  --tag=1141_projects_pm_workspace_optional
node src/scripts/apply-journalled-migration.mjs \
  --tag=1142_fix_requisition_headcount_fk_set_null
```

Reads: `APPLY_ONE_DATABASE_URL` (+ `APPLY_ONE_ALLOW_REMOTE` if remote). Order is
mandatory: 1141 is idx 1029, 1142 is idx 1030. Pass: each prints
`applying <tag>: N statement(s)` and exits 0. The applier wraps the statements in
a transaction and inserts the ledger row in the same transaction, so a mid-way
failure leaves no partial state. Do **not** pass `--skip-existing`; it exists for
reconciling schema-ahead-of-bookkeeping, which is not this situation.

**Step 6 — postconditions.**

```bash
psql "$APPLY_ONE_DATABASE_URL" -v ON_ERROR_STOP=1 \
  -f docs/phase-2/sql/d-1141-1142-postconditions.sql
```

Pass: postconditions 1-4 all report `PASS`; postcondition 5 reports 903;
postcondition 6 returns **zero rows**.

**Step 7 — catalog gate, the only thing that can read `confdelsetcols`.**

```bash
SET_NULL_GATE_DATABASE_URL="$APPLY_ONE_DATABASE_URL" \
  node --max-old-space-size=4096 -r ts-node/register/transpile-only \
  src/scripts/check-set-null-column-lists.ts
```

Reads: `SET_NULL_GATE_DATABASE_URL`. Pass: exit 0 with no violations. This is the
step that converts the text-level claim into a catalog-level fact.

**Step 8 — chain and ledger, with an explicit variable.**

```bash
DATABASE_URL="$APPLY_ONE_DATABASE_URL" node src/scripts/verify-migration-chain.mjs
DATABASE_URL="$APPLY_ONE_DATABASE_URL" node src/scripts/check-migration-ledger.mjs
```

Reads: `DATABASE_URL`, set inline for this command only. Never export it, and
never use the `pnpm` aliases. Pass: both exit 0; the ledger reports 903 applied
with 0 pending.

### 7.4 Rollback path

```bash
psql "$APPLY_ONE_DATABASE_URL" -c \
  'SELECT count(*) FROM build.projects WHERE pm_workspace_id IS NULL;'
psql "$APPLY_ONE_DATABASE_URL" -v ON_ERROR_STOP=1 \
  -f migrations/rollback/1142_fix_requisition_headcount_fk_set_null.down.sql
psql "$APPLY_ONE_DATABASE_URL" -v ON_ERROR_STOP=1 \
  -f migrations/rollback/1141_projects_pm_workspace_optional.down.sql
```

The count must be 0 before the 1141 rollback or `VALIDATE CONSTRAINT` aborts.
Unwind 1142 last, re-apply it first. Neither `.down.sql` removes its ledger row —
that is a manual `DELETE FROM drizzle.__drizzle_migrations WHERE hash = …` using
the hashes in §3, and forgetting it makes the migration look applied when it is
not. Re-read §5 on the state the 1142 rollback leaves behind.

---

## 8. What remains database-blocked

Nothing below can be closed on this machine. Each is listed with the exact
variable that unblocks it.

1. **Is 1141 already applied?** One query settles whether the §2 drift claim is
   live or stale:
   `SELECT attnotnull FROM pg_attribute … WHERE attname='pm_workspace_id'`.
   Needs any read-only connection to the target.
2. **`confdelsetcols` for `fk_job_requisitions_headcount_org`.** No static check
   can read it; the text gate says so itself. Needs
   `SET_NULL_GATE_DATABASE_URL`.
3. **Behavioural proof that the parent delete no longer raises 23502**, and its
   pre-repair control. Blocks 4 and 5 of the proof file. Needs
   `APPLY_ONE_DATABASE_URL` plus a fixture pair.
4. **Ledger depth and pending count** on the target. Needs `DATABASE_URL` set
   inline for `check-migration-ledger.mjs`.
5. **Chain reachability from cold.** Needs `COLD_DATABASE_URL` for
   `replay-chain-cold.mjs`.
6. **Actual lock behaviour under concurrency.** The `5s` lock timeout is present
   in the text but has never been exercised against a table with live traffic.
7. **Whether `VALIDATE CONSTRAINT` in 1142 completes inside the timeout** on a
   production-sized `job_requisitions`. Row count is unknown without a database.

---

## 9. Files produced by this workstream

| Path | Lines |
|---|---|
| `slos-phase-2-data/docs/build-module/phase-2/09-migration-1141-1142-staging.md` | this file |
| `slos-be-phase-2-data/src/db/schema/phase-2/migration-1141-1142-preflight.spec.ts` | 249 |
| `slos-be-phase-2-data/docs/phase-2/sql/d-1141-1142-rolled-back-proof.sql` | 213 |
| `slos-be-phase-2-data/docs/phase-2/sql/d-1141-1142-postconditions.sql` | 79 |

No sealed file was modified: `1141_*.sql`, `1142_*.sql` and
`migrations/meta/_journal.json` are untouched.
