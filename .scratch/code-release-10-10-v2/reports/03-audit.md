# v2 ticket 03 — Migration baseline and catalog parity — AUDIT at current head

Read-only audit. No repository file was edited, no migration was applied, no shared database was
mutated except by `verify:membership-revocation`, which seeds and deletes its own fixture org.
Every number below came from a command I ran and read. Where I did not measure something I say
NOT MEASURED and name the blocker.

This audit **verifies the prior report** (`reports/03-migration-baseline-catalog-parity.md`) and
then pushes past it. The prior report's Status line closed C055/C056 and left C053/C060 partial and
C054 not attempted.

---

## 0. Release identity (PRD-C056 raw material)

| | |
|---|---|
| backend repo | `/Users/tarunchintakunta/Personal/streamline/streamlineos-backend` |
| backend branch | `release/code-10-10-v2` |
| backend SHA at start of audit | `2f37e1bb035006e5c03680497298ad62031e79d6` |
| backend SHA at end of audit | `138709f35befcd558c86ab04f65edf8344f6a545` |
| `migrations/` + `src/db/schema/` diff between those two SHAs | **empty** — every catalog measurement below is valid for both |
| frontend SHA | `7469d27895add587f9427e7c50c457f56e0048bf` (branch `release/code-10-10-v2`, 54 dirty files — no frontend evidence is used in this ticket) |
| journal entries | **677** (`0000_light_vance_astro` … `1053_t03_inv_user_warehouse_grant_cascade`) |
| journal head `when` | `1803000010128`; last idx `809` |
| `_journal.json` sha256 | `a441443df45db38bd0b00361529368f0d04288eb8fe6930f5ead761fbe634ae8` (unchanged from prior report) |
| journal integrity | 677/677 files present, 0 orphaned `.sql`, 0 duplicate `idx`, `when` strictly increasing |
| chain digest at **committed HEAD** | `80840c7e98c0a869483392e0a204294b6ca6f1e5c55d85e2346443a9ae4c1f30` |
| chain digest of the **working tree** | `c39063671ab02af88f7996bde0eeb18ef6676273aba7bc9d8070ad1813557b27` |
| server | PostgreSQL 18.4 (Homebrew), `localhost:5432`, role `tarunchintakunta` |

**The prior report's chain digest reproduces exactly at committed HEAD.** Its stated recipe
("sha256 over `tag:sha256(file)`, journal order") is under-specified — the naive concatenation gives
`e9163848…`; the value it publishes is the newline-joined form **with a trailing newline**. I
recovered the recipe by trying four variants and matching. That the digest reproduces is the strong
result: `git diff 65a7328..HEAD -- migrations/` is empty, so the three bootstraps and the interrupted
bootstrap in the prior report measured **byte-identical migration content to committed HEAD**.

**The working tree does NOT match committed HEAD** — see Finding F1.

### Databases measured

| database | oid | size | ledger | provenance |
|---|---|---|---|---|
| `scratch_head_1010` | 7722177 | 107 MB | `__drizzle_migrations` 677 | orchestrator's clean `db-bootstrap.mjs` |
| `scratch_cold_1010` | 7785725 | 106 MB | `__replay` 677 | orchestrator's `replay-chain-cold.mjs` |
| `scratch_t03v2_ir` | — | 106 MB | `__drizzle_migrations` 677 | prior audit's **SIGKILL×4 interrupted-then-resumed** bootstrap |
| `scratch_t03v2_c1` | — | 106 MB | `__drizzle_migrations` 677 | prior audit's clean bootstrap #1 |
| `scratch_gates_cold` / `scratch_gates_head` | — | 106 MB / 1730 MB | `__replay` 672 / `__drizzle_migrations` 672 | the targets `.env.gates` names — see Finding F2 |

---

## 1. What I read, with numbers

**Catalog corpus (`scratch_head_1010`, journal head 677/677):**
1,027 tables · 13,536 columns · 14,037 constraints · 4,764 indexes · 983 RLS-enabled relations ·
983 policies · 468 functions · 169 triggers · 5 extensions · 2,325 enum labels · 771 sequences ·
0 views · 944 `public` tables.

**Foreign-key corpus:** 3,199 live foreign keys — 1,522 composite, 1,677 single-column.
449 reference `organization_members`. 988 single-column FKs point at `organizations`, 451 at `users`.

**Declaration corpus:** 896 `pgTable` declarations under `src/db/schema/**` (directory walk);
**873** of them reachable from the `src/db/schema` barrel. 2,288 declared foreign keys, 924 named,
771 carrying an explicit `.onDelete()`. 1,165 declared unique objects, 1,101 of them TOTAL with a
resolvable column list. 1 `pgTable` declared outside `src/db/schema`
(`src/modules/storage/file-quarantine.service.ts:16`).

**Migration corpus:** 677 `.sql` files, 188 rollback files (185 tracked in git, 3 untracked).

**ON CONFLICT corpus:** 362 `onConflict*` call sites; 159 with an explicit target; **158 resolved to
a (table, columns) pair and checked one by one against the live catalog** (I dumped them with a
scratchpad script that reuses the gate's own `collectSites` + table registry; the gate itself never
opens a database).

**Gates run:** 22 gate/verifier invocations against the databases above (every exit code in §7).

---

## 2. Per-criterion assessment

### PRD-C001 — complete ticket 02's reachability/canonical-key/safe-deletion, then ticket 03's parity evidence
**Status: partially-met (unchanged).** Ticket 03's half is now **fully** produced at head (§C055/C056
below, plus the new evidence in §3). Ticket 02's cross-repository reachability and canonical-key
half is not this ticket's work and I found no evidence it landed: `reports/02-inventory/` is an
**empty directory** and there is no `reports/02-*.md`. C001 remains blocked on ticket 02, exactly as
the prior report said.

### PRD-C053 — reconcile Drizzle declarations, migration snapshots and the live catalog; one canonical composite constraint per tenant relationship; remove redundant single-column constraints only after dependency proof
**Status: partially-met.** The prior report's reconciliation holds at head, and I found three
further, previously-unreported classes of declaration-vs-catalog disagreement.

Verified still true at head:
- `verify:membership-revocation` — **exit 0**, `Removal artifacts: PASS · No inheritance: PASS ·
  Inventory vs FKs: PASS`. The 33 corrected rulings still agree with the catalog.
- `check:referential-action-drift` — **exit 0**, `Mismatches 62 hard + 1 weak · DESTRUCTIVE 27 ·
  PERMISSIVE 32 · BLOCKING 3 · ORPHANING 0 · Baseline 62 · new 0`. Identical to the prior
  measurement. The 13 that contradict an explicit `.onDelete()` are still open, still baselined,
  still not fixed. **The baseline is a ratchet, not an acceptance** — I agree with that framing.
- `check:declaration-column-drift` exit 0 (12,262 live columns, 873 tables compared, 105
  live-but-undeclared tables, 155 harmless undeclared columns, 22 trigger-supplied `org_id`).
- `check:declaration-constraint-drift` exit 0 (4,948 declared objects, 187 baselined absences,
  0 new). One number moved: **name drift 370 → 446** (+76) as other agents edited declarations;
  it is reported, never failed.

New at head, not in the prior report:

1. **A declared TOTAL unique index is PARTIAL in the catalog, and two production routes 42P10 on
   every call.** I swept all 1,101 declared TOTAL unique objects against `pg_index`:
   1,069 match a live total index, 22 sit on tables that do not exist, 7 are absent (4 real, 3 are
   my extraction's inability to name expression columns), and **3 exist only as a PARTIAL index**:
   `chat_user_presence`, `chat_reply_reminders`, `payroll_bank_batches`. Only `chat_user_presence`
   has a matching `ON CONFLICT` site, and its predicate column is `NOT NULL`, so the partial
   predicate is vacuous and the index should be total. **Bite-proven** (Finding F3).
2. **23 tables are declared in Drizzle and absent from the catalog, and both drift gates report
   "declared-but-absent tables 0"** because they enumerate the barrel, not the schema directory
   (Finding F4).
3. **11 relationships carry two identical single-column foreign keys** — same child, same parent,
   same column, same action. Both fire on every write (Finding F6).

Redundant single-column constraints — the number the criterion asks for and nobody has produced:
- 1,677 single-column FKs live at head.
- **153 are strictly superseded** — the same child→parent relationship is also enforced by a
  composite FK whose column set contains the single column. These are the removal candidates.
- **22 are exact duplicates** (11 pairs) — the safest sub-population.
- **0 have been removed.** The prior report's "no redundant single-column FK was removed —
  dependency proof was not established for any" is still true; I have now established the
  population and its size, which is the missing input to that proof.

### PRD-C054 — remove obsolete schema only with symbol, raw table-name, FK, migration, barrel and integrity-spec evidence
**Status: not-met as a removal, but the evidence the criterion demands is now produced.** The prior
report said "not attempted". I did the six-way enumeration.

**Population: the 105 live-but-undeclared non-partition tables** (plus 49 `notifications_*`
partitions, which are partitions of a declared parent and are not candidates). I computed this set
myself — live `pg_tables` minus the barrel's 873 declarations — and it matches the gate's reported
105 exactly.

Six-way evidence, measured for all 105:

| axis | how measured | result |
|---|---|---|
| **symbol** | `pgTable("<t>"` under `src/db/schema` | **0 of 105** |
| **raw table name** | `grep -rlw` over `src/**/*.ts`, non-spec, excluding `src/db/schema` | **1 of 105** (`file_quarantine_records`) |
| **FK** | inbound FK from a table *outside* the 105 | **4 of 105** |
| **migration** | creating migration by `CREATE TABLE` | **105 of 105** — every one exists |
| **barrel** | exported from `src/db/schema` | **0 of 105** |
| **integrity spec** | `grep -rlw` over `*.spec.ts` | **1 of 105** (`payroll_statutory_rule_sets`) |

The 4 with an outside inbound FK: `gl_accounts` ← `fin_reimbursement_batches`, `gl_journals` ←
`fin_reimbursement_batches`, `crm_outbound_messages` ← `autonomy_holds`, `inv_carton_types` ←
`inv_packages`.

Creating migration, grouped: **63 of 105 were created by a single file,
`0489_chain_creates_early.sql`** — one of the three reverse-generated-from-`pg_catalog` migrations
(`0489`, `0591b`, `0619`) the prior report identified. 30 by `0767b_inv_table_chain_repair`, 2 by
`0649b_inv_carton_shipment_chain_repair`, 4 by `0000_light_vance_astro`, and one each by
`0292`, `0628`, `0653`, `0669`, `0942`, `0961`.

**Classification — KEEP / REFACTOR / REMOVE:**

| n | group | class | reason |
|--:|---|---|---|
| 34 | `inv_*` | **OUT OF SCOPE** | Inventory is excluded from this release. Note only. |
| 18 | `crm_*` | **OUT OF SCOPE** | CRM is excluded from this release. Note only. |
| 8 | `customer_*`, `relationship_*` | **OUT OF SCOPE** | CRM-adjacent, all created by `0489`, 0 src refs. |
| 29 | `gl_*`, `ap_*`, `ar_*`, `bank_*`, `tax_*` **except** `gl_accounts`/`gl_journals` | **REMOVE candidate** | 0 symbol, 0 src ref, 0 spec, 0 barrel, 0 inbound FK from outside the cluster. Created by `0489`/`0591b`/`0619`. Nothing in the running service can reach them. |
| 2 | `gl_accounts`, `gl_journals` | **KEEP (blocked)** | `fin_reimbursement_batches.cash_account_id` and `.posted_journal_id` carry live FKs into them. **Dependency proof is negative** — they cannot be dropped until those two columns and their FKs go. Both columns are live-but-undeclared (`src/db/schema/accounting/finance-expenses.ts:10-28` declares neither), so no Drizzle code can ever populate them. |
| 1 | `multipart_upload_intents` | **REMOVE candidate** | created by `0942_storage_multipart_intents`, **zero references anywhere in `src/`**. (Caveat: `src/modules/storage/storage-multipart.service.ts` is being edited by another agent as I write; re-check before acting.) |
| 1 | `file_quarantine_records` | **KEEP** | declared inline at `src/modules/storage/file-quarantine.service.ts:16` — a `pgTable` living outside `src/db/schema`, which is why the drift gates cannot see it. The only such declaration in the repo. |
| 1 | `payroll_statutory_rule_sets` | **KEEP** | pinned by an integrity spec. |
| 3 | `communication_backfill_issues`, `kb_tenant_backfill_issues`, `subject_requests` | **KEEP** | backfill/DSR ledgers written by migrations (`0713` inserts into `communication_backfill_issues`). Dropping them destroys migration output. |
| 8 | `career_ladders`, `career_paths`, `employee_career_plans`, `learning_paths`, `autonomy_repairs`, `autonomy_repair_policies`, `subprocessors`, `subprocessor_subscribers` | **REFACTOR (decide)** | 0 symbol / 0 src ref / 0 spec, but 4 of them come from `0000` (original product intent) and `subprocessors` is a compliance artefact. Each needs a product ruling, not a mechanical deletion. |

**Nothing should be removed in this release from the 29 REMOVE candidates without one more step
this audit did not take: a `pg_stat_user_tables` / production row-count check.** All eight local
orgs are empty (`organizations` has 0 rows), so "no rows" here proves nothing about production.
That is the one piece of the six-way bar I could not supply. **NOT MEASURED: production row counts
for the 29 gl_/ap_/ar_/bank_/tax_ tables.** What would measure it: `SELECT relname, n_live_tup FROM
pg_stat_user_tables` on the production/Neon branch, plus a `pg_stat_statements` scan for those table
names.

### PRD-C055 — two clean bootstraps + one interrupted-then-resumed, at the same release commit, must match on tables, columns, constraints, indexes, policies, functions, triggers, extensions, enums and RLS state
**Status: MET.** I re-measured this myself rather than trusting the prior report, using
`compare-bootstraps.mjs` (which compares definitions — `pg_get_constraintdef`, `indexdef`, policy
`cmd`/`roles`/`qual`/`with_check`, function body digest, `pg_get_triggerdef`, `relrowsecurity` and
`relforcerowsecurity`, enum sort order — not names).

| pair | result |
|---|---|
| prior audit's **clean #1** (`scratch_t03v2_c1`) vs **today's independent clean bootstrap** (`scratch_head_1010`) | `SCHEMAS IDENTICAL differences=0`, 13/13 categories including the ledger |
| prior audit's **interrupted-then-resumed** (`scratch_t03v2_ir`, SIGKILL×4) vs **today's clean bootstrap** | `SCHEMAS IDENTICAL differences=0`, 13/13 categories including the ledger |
| **clean bootstrap** vs **cold replay by a different toolchain** (`scratch_cold_1010`) | 12/12 catalog categories PASS, `differences=1` — the sole difference is `migrationLedger A=677 B=-1`, because the cold tool's ledger is deliberately named `drizzle.__replay` |

All ten required classes plus sequences, views and the ledger:
tables 1027 · columns 13536 · constraints 14037 · indexes 4764 · policies 983 · functions 468 ·
triggers 169 · extensions 5 · enums 2325 · rlsState 983 · sequences 771 · views 0.

That is the criterion's exact demand, satisfied with an interrupted bootstrap I did not build,
compared against a clean bootstrap I did not build, at a migration content set that is
git-byte-identical to committed HEAD. **NOT MEASURED by me: a fresh interrupted-resume run at the
working-tree chain digest.** What would measure it: `pnpm bootstrap:interrupt-resume` against a new
scratch database (~10 min, one full 107 MB bootstrap); I judged it not worth the shared-laptop
budget because the only delta from the proven content is nine comment lines (Finding F1).

### PRD-C056 — retain release SHA, commands, database identity, journal hash/count, catalog diff, sanitized logs and artifact hashes
**Status: partially-met.** The *content* exists — §0 above, and the prior report. The **retention**
does not.

- The prior report's logs live at
  `/private/tmp/claude-501/-Users-tarunchintakunta-Personal-streamline/38e30866-b3de-489c-bab6-88ed65398eed/scratchpad/t03v2/`
  — 90 files, 1.1 MB. That is an **ephemeral per-session temp directory keyed by a session UUID**.
  It is cleared on reboot and cannot be rediscovered from anything committed. Nothing in either repo
  points at it.
- The chain digest published in the prior report is not reproducible from the recipe the report
  states; I had to guess the separator (§0).
- `check:migration-rollback` passes **only because of three untracked files** (Finding F5), so the
  evidence does not describe committed HEAD.

Artifact hashes (sha256, first 16) at the state I measured:

```
a441443df45db38b  migrations/meta/_journal.json
63b1e114626dc014  migrations/1052_t07_roster_entries_natural_key.sql   (worktree; HEAD is 2f5709e78dd9ac9c)
87116e834d40e7e6  src/db/schema/chat/chat-huddle-tables.ts
08305bc9854ea835  src/scripts/db-bootstrap.mjs
455d864f37b8010f  src/scripts/baselines/declaration-constraint-drift.json
444562122e3ff0f9  src/scripts/baselines/referential-action-drift.json
```

### PRD-C060 — each tenant-owned relationship uses the canonical composite organization-scoped key **and supporting index**; remove a redundant single-column FK only after all callers and migrations target the composite relationship
**Status: partially-met.** The composite-key half holds; the supporting-index half is unmeasured by
any gate and is not satisfied.

Composite-key half, verified at head:
- `check:tenant-relationships` **exit 0** — `Total single-col FKs 214 · EXCL CRM 79 · EXCL Inventory
  134 · EXCL platform-global 1 · Actionable 0`.
- `check:tenant-indexes` **exit 0** — 347 schema files, **840 tenant tables, 840 leading tenant
  indexes**.
- `pnpm db:verify-rls` **exit 0** — `RESULT: RLS VERIFIED`. Independently: **0 tables carrying an
  `org_id` column have RLS disabled**, across `public`, `build` and `build_events`.

Supporting-index half — the number nobody has produced:
- **654 of 1,522 composite foreign keys have no index (total or partial) whose leading columns
  match the FK's columns.** Postgres does not create one; every parent delete or key update probes
  the referencing side.
- Narrowed to the membership-revocation path this ticket already touched: of the **449** composite
  FKs referencing `organization_members`, **32 have no supporting index at all** — and all 32 are
  in-scope (none is `inv_*` or `crm_*`). Two are `ON DELETE CASCADE`
  (`build.pm_workspace_memberships`, `user_delegations`), three are `RESTRICT`
  (`module_ownerships`, `ownership_transfers` ×2), the rest `SET NULL`.
- **`check:tenant-indexes` cannot see this.** It asserts one leading-tenant-column index *per table*
  (840/840). It never asks whether a *relationship* has a supporting index. That is the reach gap.

Honesty on impact: because every one of those tables does have some `(org_id, …)` index, the RI
probe degrades to a per-tenant index scan, not a whole-table sequential scan. It is bounded by
tenant size, not table size. The worst shapes are the append-only logs —
`build_events.ticket_activity_log` has only `(org_id, id)` and `(org_id, ticket_id, id)`, and
`timesheet_audit_events` only `(org_id, …created_at…)`. **NOT MEASURED at scale**: all local
databases hold 0 rows, so `EXPLAIN` returns a degenerate plan. What would measure it: seed one org
to a realistic activity-log size on `scratch_perf_seed`, then
`EXPLAIN (ANALYZE, BUFFERS) DELETE FROM organization_members WHERE …`.

Redundant single-column FK removal: **still zero removed**, and correctly so. §C053 above supplies
the population (153 superseded, 22 exact duplicates) that a dependency proof needs.

---

## 3. Findings

| # | sev | file:line | summary |
|---|---|---|---|
| F3 | **P0** | `src/db/schema/chat/chat-huddle-tables.ts:27` | Declared TOTAL unique index is PARTIAL in the catalog; `POST /chat/presence/heartbeat` and the status route 42P10 on every call |
| F1 | **P1** | `src/scripts/db-bootstrap.mjs:149` | An applied migration edited in place is silently re-applied by `db:bootstrap` and silently skipped by `run-pending-migrations`; no gate detects the edit. It has already happened (`migrations/1052`) |
| F2 | **P1** | `.env.gates:62` | The gate databases the repo documents are 5 migrations behind head and carry an extension no migration installs; `check:referential-action-drift` flips exit 0 → exit 1 between them |
| F6 | **P1** | `src/db/schema/accounting/finance-expenses.ts:12` | 11 relationships carry two identical single-column foreign keys; both RI triggers fire on every write and every parent delete |
| F4 | **P2** | `src/scripts/check-declaration-column-drift.ts:88` | 23 declared tables are absent from the catalog while both drift gates report "declared-but-absent tables 0" |
| F5 | **P2** | `migrations/1049_t08_payroll_bank_batch_item_natural_key.sql:1` | `check:migration-rollback` passes only on untracked working-tree files; at committed HEAD it is exit 1 |
| F7 | **P2** | `src/scripts/check-tenant-indexes.mjs:1` | No gate asserts a supporting index per composite tenant relationship; 654 of 1,522 have none |
| F8 | **P2** | `src/scripts/check-conflict-target-inference.ts:47` | The ON CONFLICT gate never opens a database, so a declaration/catalog disagreement passes it — this is how F3 shipped |
| F9 | **P2** | `src/db/schema/accounting/finance-expenses.ts:10` | `fin_reimbursement_batches.posted_journal_id` / `.cash_account_id` are live, FK-constrained into `gl_journals`/`gl_accounts`, and undeclared — unreachable through Drizzle and blocking the gl_* removal |
| F10 | **P2** | `package.json:242` | `verify:membership-revocation` — the only check that compares `MEMBERSHIP_ARTIFACTS` intent against the catalog — is wired into 0 CI workflows |

### F3 — P0 — every chat presence write 42P10s at head

`src/db/schema/chat/chat-huddle-tables.ts:27`

```ts
uniqueIndex("uniq_chat_presence_org_membership").on(table.orgId, table.membershipId),
```

A **total** unique index. `migrations/0713_chat_presence_membership_backfill.sql:23` created it
**partial**:

```sql
CREATE UNIQUE INDEX IF NOT EXISTS uniq_chat_presence_org_membership
  ON chat_user_presence (org_id, membership_id)
  WHERE membership_id IS NOT NULL;
```

At the time, `membership_id` was mid-backfill and nullable. It is now **NOT NULL** in the catalog
(`pg_attribute.attnotnull = t`) and `.notNull()` in the declaration, so the predicate is vacuous —
the index should be total. Nothing widened it.

`src/modules/chat/chat-presence.service.ts:39` (in `heartbeat`) and `:71` (in `setStatus`) both do:

```ts
.onConflictDoUpdate({
  target: [chatUserPresence.orgId, chatUserPresence.membershipId],
  set: { … },
})
```

with **no `targetWhere`**. Postgres arbiter inference does not reason about `NOT NULL`; a bare
`ON CONFLICT (a, b)` cannot select a partial index.

**Bite proof, against `scratch_head_1010` at journal head, inside a rolled-back transaction:**

```
BEGIN
EXPLAIN INSERT INTO chat_user_presence (org_id, membership_id, status, last_seen_at)
VALUES ('o1', 1, 'ONLINE', now())
ON CONFLICT (org_id, membership_id) DO UPDATE SET status='ONLINE';
ERROR:  there is no unique or exclusion constraint matching the ON CONFLICT specification
ROLLBACK
```

Control, with the arbiter predicate — plans cleanly:

```
 Insert on chat_user_presence
   Conflict Resolution: UPDATE
   Conflict Arbiter Indexes: uniq_chat_presence_org_membership
```

**Failure scenario:** any authenticated user with an ACTIVE membership calls
`POST /chat/presence/heartbeat` (`src/modules/chat/chat-presence.controller.ts:37`) or the status
route (`:58`). `resolveMembershipId` returns a real id, the upsert runs, Postgres raises 42P10 at
plan time, the route 500s. Every tenant, every call, since `0713`. This is the same defect class as
commit `08b9274c4` ("every message send 500s at head — partial index, no arbiter predicate"), which
fixed `chat_messages` and did not touch presence.

**Proposed fix (pick one, deliberately):** the declaration is right and the catalog is wrong, so
write a migration that replaces the partial index with a total one —
`CREATE UNIQUE INDEX … ON chat_user_presence (org_id, membership_id);` then
`DROP INDEX uniq_chat_presence_org_membership;` and rename, guarded and `NOT VALID`-free since an
index needs no validation. The cheaper alternative — adding `targetWhere: sql\`membership_id IS NOT
NULL\`` at both call sites — leaves the declaration lying about the catalog and would need the
declaration changed to `.where(...)` too. Prefer widening the index.

### F1 — P1 — an applied migration can be edited in place and no gate notices

`src/scripts/db-bootstrap.mjs:149`

```js
const hash = sha256(content);
if (applied.has(hash)) { console.log(`SKIP  [${entry.tag}]`); succeeded++; continue; }
```

`db-bootstrap.mjs` decides what to skip by the migration file's **content hash**.
`src/scripts/run-pending-migrations.mjs:66` decides by **timestamp watermark**
(`journal.entries.filter((e) => e.when > watermark)`), then hash-skips inside that queue.
`check-migration-ledger.mjs`'s own docblock states the opposite of what the bootstrapper does:
*"Drizzle decides what to apply by TIMESTAMP, not by hash … Hash is deliberately NOT the join key."*

**Measured, at head:**
- `migrations/1052_t07_roster_entries_natural_key.sql` is modified in the working tree (a 9-line
  `-- @data-loss` comment block).
- Worktree sha256 `63b1e114626dc014…`; committed HEAD `2f5709e78dd9ac9c…`; the ledger row for that
  migration in `scratch_head_1010` holds `2f5709e78dd9ac9c…`.
- `check:migration-chain` **exit 0**. `check:migration-ledger` **exit 0** (677 vs 677, no orphan,
  no duplicate). `check:migration-discipline` **exit 0**. `check:baseline-integrity` **exit 0**.
  **Nothing sees it.**

**Failure scenario:** run `pnpm db:bootstrap` against any database already at head after any edit to
an applied migration. `applied.has(hash)` is false, so the migration's DDL and DML execute a second
time and a second ledger row is inserted with the same `created_at`. For 1052 that means re-running
`UPDATE roster_entries SET user_membership_id = NULL WHERE … NOT EXISTS (…)` — the statement the
uncommitted comment itself flags `@data-loss`. The run prints `RESULT: REACHED_HEAD 677/677` and
exits 0; the ledger then holds 678 rows and `check:migration-ledger` reports a DUPLICATE afterwards.
Meanwhile `run-pending-migrations.mjs` would never re-run it, so the two supported runners produce
different databases from the same journal.

**Blast radius if the edited migration is not idempotent** (measured over all 677, after stripping
`--` comment lines): 401 contain at least one statement not written to be re-runnable —
32 `CREATE TABLE` without `IF NOT EXISTS`, 30 `ADD COLUMN` without a guard, 51 `CREATE INDEX`
without a guard, 29 `CREATE TYPE`, 267 `ADD CONSTRAINT`, and 232 carrying bare DML
(137 `UPDATE`, 76 `INSERT`, 19 `DELETE`). Conservatively, **30 migrations contain an unguarded
`CREATE TABLE` with no `DO $$` block anywhere in the file** and would hard-fail 42P07 on a re-run;
**9 contain an unguarded `CREATE TYPE`** and would fail 42710.

**Proposed fix:** add a gate that pins applied-migration content. The ledger already stores the
sha256 of each file. A `check:migration-immutability` that reads
`drizzle.__drizzle_migrations (hash, created_at)`, joins to the journal on `created_at`, and fails
when the on-disk file's sha256 differs from the recorded hash would have caught 1052 the moment it
was edited, and is ~30 lines. Pair it with a repo-side manifest so the check also works with no
database (`migrations/meta/_chain.sha256`, regenerated only when a NEW entry is appended).

### F2 — P1 — the documented gate databases are not head, and flip a gate's verdict

`.env.gates:62` and following point five gate environment variables at `scratch_gates_cold` and one
at `scratch_gates_head`:

```
APP_DATABASE_URL                     -> scratch_gates_head
COLD_DATABASE_URL                    -> scratch_gates_cold
COLUMN_DRIFT_GATE_DATABASE_URL       -> scratch_gates_cold
CONSTRAINT_DRIFT_GATE_DATABASE_URL   -> scratch_gates_cold
SET_NULL_GATE_DATABASE_URL           -> scratch_gates_cold
TENANT_RELATIONSHIP_DB_URL           -> scratch_gates_cold
```

**Measured today:** `scratch_gates_head` ledger = **672** rows (journal is 677); `scratch_gates_cold`
`__replay` = **672** rows, last tag `1048_hr_people_org_person_link_unique`. Both carry
**`btree_gin 1.3`**, which no migration installs and which a clean bootstrap does not have.
`scratch_gates_head` also has 946 `public` tables vs 944 in a clean bootstrap.

`compare-bootstraps.mjs scratch_head_1010 vs scratch_gates_cold` → **`differences=95`**:
1 extra extension + its 87 functions, the ledger-name difference, and **3 foreign keys still holding
their pre-fix action** because migrations 1051 and 1053 were never applied there —
`fk_hr_mood_checkins_user_actor` (RESTRICT, should be SET NULL),
`fk_performance_reviews_reviewer_actor` (RESTRICT, should be SET NULL),
`fk_inv_user_wh_user_mbr` (SET NULL, should be CASCADE).

**Failure scenario, demonstrated:** the same gate, at the same head, gives two different verdicts.

```
REFERENTIAL_ACTION_GATE_DATABASE_URL=…/scratch_head_1010   -> Mismatches 62 · Baseline 62 · new 0 · exit 0
REFERENTIAL_ACTION_GATE_DATABASE_URL=…/scratch_gates_cold  -> Mismatches 65 · Baseline 62 · new 3 · exit 1
   FAIL — 3 foreign key(s) act differently from what the schema declares, and are not baselined
```

An agent following the repo's own documented gate environment sees a red gate and three phantom
findings that do not exist at head. The migration `0542_hr_employments_custom_field_gin_index.sql`
also reasons in its header from "this deployment does not install btree_gin", which is false on both
of these databases.

CI is **not** affected: `.github/workflows/db-gates.yml` builds its own database with
`pnpm db:bootstrap-role && pnpm db:bootstrap` and points every gate at it. This is a local
developer/agent hazard only.

**Proposed fix:** repoint `.env.gates` at `scratch_head_1010` / `scratch_cold_1010` (which are at
677/677 and carry no `btree_gin`), or rebuild `scratch_gates_head`/`scratch_gates_cold` from empty
with `db-bootstrap.mjs` and `replay-chain-cold.mjs` alone. Update the file's comment block, which
still describes journal 672.

### F6 — P1 — 11 relationships carry two identical foreign keys

Measured over all 1,677 single-column FKs: 22 constraints form 11 pairs where child, parent, column
and referential action are identical.

```
build.project_members        → organizations  project_members_org_id_fk[c] + project_members_org_id_organizations_id_fk[c]
build.project_template_tickets → organizations  project_template_tickets_org_id_fk[c] + …_organizations_id_fk[c]
exit_checklists              → organizations  exit_checklists_org_id_fk[c] + exit_checklists_org_id_organizations_id_fk[c]
feedback_cycle_responses     → organizations  feedback_cycle_responses_org_id_fk[c] + fk_feedback_cycle_responses_org[c]
fin_expense_policies         → organizations  fin_expense_policies_org_id_fkey[c] + …_organizations_id_fk[c]
fin_reimbursement_batches    → organizations  fin_reimbursement_batches_org_id_fkey[c] + …_organizations_id_fk[c]
fin_reimbursement_batches    → users          fin_reimbursement_batches_created_by_fkey[a] + …_created_by_users_id_fk[a]
fin_reimbursement_batches    → users          fin_reimbursement_batches_approved_by_fkey[a] + …_approved_by_users_id_fk[a]
invitation_events            → organizations  fk_invitation_events_org[c] + invitation_events_org_id_organizations_id_fk[c]
workflow_variables           → organizations  workflow_variables_org_id_fk[c] + …_organizations_id_fk[c]
workflow_versions            → organizations  workflow_versions_org_id_fk[c] + …_organizations_id_fk[c]
```

The naming is the tell: one name in each pair is Drizzle's auto-generated
`<table>_<col>_<parent>_id_fk`, the other is either Postgres' default `<table>_<col>_fkey` or a
hand-chosen `fk_*` — i.e. the declaration created one and a hand-written migration created the
other. This is direct corroboration for the prior report's systemic conclusion.

**Failure scenario:** every `INSERT` into `fin_reimbursement_batches` fires **four** redundant RI
lookups (two on `org_id`, two on `created_by`); every `DELETE FROM organizations` fires two identical
CASCADE passes over each of the nine duplicated child tables and takes two `ROW SHARE` locks where
one would do. No gate reports it: `check:declaration-constraint-drift` matches foreign keys **by
name only** and files the unexpected name under `live-but-undeclared` (1,187 objects), which it
reports and never fails.

**Proposed fix:** these are the one sub-population where the criterion's "dependency proof" is
trivial — the surviving constraint is definitionally identical, so no caller and no migration can
observe the drop. Write one migration that drops the eleven non-declared duplicates
(`*_fkey` / the hand-named one where the Drizzle name is the declared one), keeping whichever name
the declaration produces, plus a rollback file that recreates them.

### F4 — P2 — 23 declared tables do not exist, and both drift gates say "declared-but-absent tables 0"

The drift gates enumerate declarations from the **barrel** (`import * as schema from "../db/schema"`,
then `declaredTablesOf(schema)` — `src/scripts/check-declaration-column-drift.ts:83,88`). A directory
walk of `src/db/schema/**` finds **896** `pgTable` declarations; the barrel exposes **873**. The 23
difference are **all absent from the live catalog**:

```
attendance_correction_links      attendance_daily_projections    attendance_event_evidence
attendance_event_locators        attendance_events               attendance_evidence_legal_holds
attendance_session_projections   hr_audit_event_sources          hr_audit_events
hr_employment_legacy_map         hr_person_legacy_map            hr_workforce_reconciliation_items
hrms_migration_profile_events    hrms_migration_profiles         hrms_scope_versions
org_unit_closure                 worker_assignment_periods       worker_engagement_state_events
worker_leave_balance_projections worker_leave_entry_locators     worker_leave_ledger_entries
worker_leave_reversal_links      worker_reporting_lines
```

No journalled migration creates any of them; they exist only in `migrations/pending/hrms-phase1/`,
which is not in `_journal.json`. Each is referenced by 3–10 non-spec source files.

**This is not a P0**, and I checked rather than assumed. Every production entry point I traced is
guarded by a runtime relation probe:
`src/modules/hr/time/attendance-event-writer.service.ts:73` calls
`isCompatibilityRelationAvailable(transaction, "public.hrms_migration_profiles")` and returns `null`
when it is missing — and `hrms_migration_profiles` is one of the 23, so
`AttendanceClockService.checkIn/checkOut/toggleBreak` (reached from
`attendance.controller.ts:45/63/80` via `AttendanceService`) never touch
`attendance_event_locators`. `src/modules/organization/hierarchy/org-hierarchy-tree-source.service.ts:84`
guards `org_unit_closure` with `to_regclass(...) IS NOT NULL`.

**The finding is the gate's claim, not the code.** `check:declaration-column-drift` prints
`declared-but-absent tables 0` and `check:declaration-constraint-drift` prints
`declared-but-absent tables 0`, and a reader takes that to mean the declaration is fully realised.
23 declared tables are missing. `check:conflict-targets` walks the **directory**, sees these tables,
and resolves an arbiter against a table that does not exist — which is why it happily reports
`attendance_event_locators` as resolved at
`src/modules/hr/time/attendance-event-writer.service.ts:192`.

**Proposed fix:** make `declaredTablesOf` walk `src/db/schema/**` the way
`check-conflict-target-inference.ts:122-146` already does, then baseline the 23 explicitly as
"declared ahead of the chain, gated at runtime" rather than letting them vanish from the population.
An anti-vacuity floor (`declaredTables >= 890`) would stop the barrel silently shrinking again.

### F5 — P2 — the rollback gate passes only on untracked files

`check:migration-rollback` **exit 0** at the working tree, `677 migrations scanned, compliance
required for numeric prefix > 839`. Three of the files that satisfy it are **not in git**:

```
migrations/rollback/1049_t08_payroll_bank_batch_item_natural_key.down.sql   untracked
migrations/rollback/1050_t08_payroll_tds_ytd_run_in_natural_key.down.sql    untracked
migrations/rollback/1052_t07_roster_entries_natural_key.down.sql            untracked
```

(`git ls-files migrations/rollback` = 185; `ls` = 188.) 1052 is additionally satisfied by the
uncommitted `-- @data-loss` comment, which the gate accepts as an alternative
(`src/scripts/check-migration-rollback.mjs:96`).

**Failure scenario:** clone the repo at `138709f35`, run `pnpm check:migration-rollback` → exit 1
with 3 violations, which is exactly what the prior report measured. The release cannot demonstrate
its own gate from a clean checkout. Ownership is tickets 07 and 08, not this one, but it invalidates
C056's "reproducible evidence for the current-head bootstrap".

**Proposed fix:** commit the three rollback files (and the 1052 comment) as part of their owning
tickets' completion commits.

### F7 — P2 — no gate asserts a supporting index per composite tenant relationship

See §C060. 654 of 1,522 composite FKs have no matching index; 32 of the 449 membership FKs have
none at all. `check:tenant-indexes` (840/840) measures per-table leading-tenant indexes and cannot
see it.

**Proposed fix:** extend `check-tenant-indexes.mjs` with a second population — for every composite
FK whose leading column is the tenant column, require an index whose leading columns equal the FK's
column set (partial indexes count when the predicate is `col IS NOT NULL` on an FK member, which is
what the RI probe supplies). Baseline the current 654 as a ratchet; fail on the 655th.

### F8 — P2 — the ON CONFLICT gate never opens a database

`src/scripts/check-conflict-target-inference.ts` scans 362 call sites and resolves arbiters against
`getTableConfig(...)` — the **declaration**. It has no `process.env.*_DATABASE_URL` at all. I ran the
same resolution and then checked all **158** resolved targets against `pg_index` on
`scratch_head_1010`:

| outcome | n |
|---|---:|
| a live TOTAL unique index / constraint / PK covers the target | 142 |
| only a live PARTIAL unique index covers it, and the site supplies the predicate | 12 |
| only a live PARTIAL unique index covers it, and the site supplies **no** predicate | **3** — `chat-presence.service.ts:39`, `:71` (production, Finding F3) and `chat-send-conflict-target.db.spec.ts:144` (a deliberate negative fixture) |
| the target table does not exist at head | 1 — `attendance-event-writer.service.ts:192` (`attendance_event_locators`, gated, Finding F4) |

**Proposed fix:** give the gate an optional `CONFLICT_TARGET_GATE_DATABASE_URL` and, when set,
arbitrate against `pg_index` instead of the declaration, failing closed (exit 2) when it is unset in
CI. The `db-gates.yml` job already has a bootstrapped database on hand.

### F9 — P2 — two live, FK-constrained, undeclared columns block the gl_* removal

`pg_attribute` on `fin_reimbursement_batches` shows 15 columns; `src/db/schema/accounting/finance-expenses.ts:10-28`
declares 13. The two undeclared ones are `posted_journal_id text` and `cash_account_id text`, and
both carry live foreign keys:

```
fk_fin_reimbursement_batches_posted_journal_id_org  (org_id, posted_journal_id) -> gl_journals(org_id, id)  ON DELETE SET NULL (posted_journal_id)
fk_fin_reimbursement_batches_cash_account_id_org    (org_id, cash_account_id)   -> gl_accounts(org_id, id)  ON DELETE SET NULL (cash_account_id)
```

`check:declaration-column-drift` classifies them under "undeclared-but-harmless (nullable or
defaulted) 155 — reported, not failed", which is right for the write path (no 23502).

**Failure scenario:** `src/modules/finance/expenses/reimbursements.service.ts` cannot read or write
either column through Drizzle — the columns do not exist on the table object — so a reimbursement
batch can never record which GL journal it posted to. And `gl_journals`/`gl_accounts` cannot be
dropped under C054 while these FKs stand.

**Proposed fix:** a product decision for the accounting territory (ticket 11) — either declare the
two columns and wire the posting path, or drop the columns and their FKs in the same migration that
retires the gl_* kernel. Do not do either from this ticket.

### F10 — P2 — the only intent-vs-catalog check is in no CI workflow

`verify:membership-revocation` is the one thing that compares `MEMBERSHIP_ARTIFACTS`' declared
`onRemoval` intent against `pg_constraint`. Measured across `.github/workflows/**`: every other
ticket-03 gate is wired (`check:migration-chain`, `-ledger`, `-discipline`, `-rollback`,
`drop-column-safety`, `restrict-fks`, `tenant-indexes`, `baseline-integrity`, `conflict-targets`,
`db:verify-rls` in `ci.yml`; `declaration-column-drift`, `declaration-constraint-drift`,
`referential-action-drift`, `set-null-column-lists`, `tenant-relationships`, `replay-ledger`,
`migration-ledger` in `db-gates.yml`). `verify:membership-revocation` appears in **0** workflows —
only in `src/scripts/check-gate-wiring.mjs:102` as an ownership note.

The prior report recommended promoting it to `check:membership-artifact-actions`. That has not
happened. Meanwhile `check:restrict-fks` (which *is* wired) only asserts that a table named in
`MEMBERSHIP_ARTIFACTS` appears there *with any* `onRemoval` value — it can detect a missing ruling,
never a wrong one, exactly as the prior report established.

---

## 4. What head already gets right

- **Bootstrap determinism is real and now independently re-proved.** A clean bootstrap, a second
  clean bootstrap, a bootstrap SIGKILLed four times and resumed, and a cold replay by a different
  toolchain with its own ledger and its own statement splitter all produce the same catalog on
  1,027 tables / 13,536 columns / 14,037 constraints / 4,764 indexes / 983 policies / 468 functions /
  169 triggers / 5 extensions / 2,325 enum labels / 983 RLS states / 771 sequences.
  `differences=0` on the two comparisons where the ledger is comparable.
- **The journal is structurally sound**: 677/677 files present, no orphaned `.sql`, no duplicate
  `idx`, `when` strictly increasing, and `check:migration-chain` verifies the applied watermark is
  not ahead of the journal.
- **Tenant scoping holds at the catalog level.** 840/840 tenant tables lead with the tenant column.
  `Actionable 0` single-column tenant FKs. **0 tables carrying `org_id` have RLS disabled** — I
  checked that independently of `db:verify-rls`, and there is not one exception across `public`,
  `build` and `build_events`.
- **The membership-revocation repair from the prior ticket is durable.** Migrations 1051/1053 are
  in the catalog, `verify:membership-revocation` is exit 0, and the 33 corrected rulings still agree.
- **The new `check:referential-action-drift` gate is in CI** (`db-gates.yml:166`), self-tests 32/32,
  and reports 62 baselined / 0 new at head. The axis nothing measured is now measured.
- **`check:set-null-column-lists`** confirms all 805 catalog `SET NULL` constraints have a column
  list that matches the declaration, and all 276 declared ones that need a nullable member have one.
  The `ON DELETE SET NULL (col)` discipline is genuinely consistent.
- **The 23 declared-but-absent HRMS tables are correctly guarded in code.** Every production path I
  traced probes for the relation before touching it. The chain is ahead of the catalog on purpose,
  and the code knows.
- **`check:conflict-targets` carries anti-vacuity floors** (`MIN_TARGETED_SITES 100`,
  `MIN_RESOLVED_SITES 100`, `MIN_PARTIAL_INDEX_TARGETS 5`) and returns exit 2 rather than a false
  green when the scan collapses. More gates should look like that.

---

## 5. What is blocked on infrastructure

| item | blocker | what would measure it |
|---|---|---|
| Production row counts for the 29 `gl_*`/`ap_*`/`ar_*`/`bank_*`/`tax_*` REMOVE candidates | all local databases hold 0 rows in all 8 orgs; the shared Neon branch must not be probed destructively and I did not read it | `SELECT relname, n_live_tup FROM pg_stat_user_tables WHERE relname ~ '^(gl_|ap_|ar_|bank_|tax_)'` on the production branch, plus a `pg_stat_statements` scan for those names |
| Whether the 654 unsupported composite FKs cost anything at scale | every local database is empty, so `EXPLAIN` returns a degenerate plan | seed one org realistically on `scratch_perf_seed`, then `EXPLAIN (ANALYZE, BUFFERS) DELETE FROM organization_members WHERE org_id=… AND id=…` |
| A fresh interrupted-resume run at the **working-tree** chain digest | one full 107 MB / 677-migration bootstrap under a 26-agent laptop budget | `pnpm bootstrap:interrupt-resume` against a new scratch database (~10 min) |
| Behaviour of `ON DELETE SET NULL (col)` on Neon | measured only on local PostgreSQL 18.4; 805 catalog constraints already use the PG15+ form | run `check:set-null-column-lists` and `check:referential-action-drift` against a Neon branch at head |
| `check:alert-ack` | needs a real `ALERT_WEBHOOK_URL` and a human acknowledgement | out of this ticket's scope; noted for ticket 34 |

---

## 6. Answer to the prior report's open questions

- **`MEMBERSHIP_ARTIFACTS`: check it, do not generate it.** I agree with the prior report, and add
  the measurement that makes it urgent: the check exists (`verify:membership-revocation`) and runs in
  **0 CI workflows** while all sixteen of its siblings run in one. The recommendation is not blocked
  on design — it is blocked on one line in `ci.yml`.
- **Does the evidence support `drizzle-kit push` as the mechanism?** The prior report said "partly,
  and I will not overclaim". My duplicate-FK measurement (F6) sharpens it: eleven relationships hold
  a Drizzle-named constraint *and* a Postgres-default- or hand-named one for the same columns. That
  is two authorities writing the same relationship independently — a declaration path and a migration
  path — which is the same conclusion the prior report reached from a different direction
  ("the mechanism is the absence of a gate on this axis"), now with named constraint pairs.
- **`scratch_boot_b`** is still 8.7 MB / effectively empty, as the prior report found. Release v1's
  `02-bootstrap-parity.md` still cites it. `scratch_t03v2_c1/c2/ir/cold` and `scratch_head_1010` /
  `scratch_cold_1010` supersede it.

---

## 7. Every gate I ran, and its exit code

Against `scratch_head_1010` (clean bootstrap, 677/677) unless noted.

| command | env var used | exit | what it produced |
|---|---|---:|---|
| `check:migration-chain` | `DATABASE_URL` | **0** | `PASS migration chain verified`; watermark 1803000010128 |
| `check:migration-ledger` | `DATABASE_URL` | **0** | 677 applied vs 677 journal, 0 pending, no orphan/duplicate |
| `check:migration-discipline` | — | **0** | 677 files, 0 new violations |
| `check:migration-rollback` | — | **0** | 677 scanned — **but only on 3 untracked files**, F5 |
| `check:drop-column-safety` | — | **0** | 677 files, 126 dropped columns, 349 schema files |
| `check:restrict-fks` | — | **0** | 346 schema files (text-only; weaker than it reads) |
| `check:baseline-integrity` | — | **0** | 90 gate scripts, 142 registered numbers, 0 unregistered, 0 stale |
| `check:declaration-column-drift` | `COLUMN_DRIFT_GATE_DATABASE_URL` | **0** | 12,262 columns, 873 tables, 105 live-but-undeclared, 22 trigger-supplied |
| `check:declaration-constraint-drift` | `CONSTRAINT_DRIFT_GATE_DATABASE_URL` | **0** | 4,948 declared, 187 baselined, 0 new, name drift 446 |
| `check:referential-action-drift` | `REFERENTIAL_ACTION_GATE_DATABASE_URL` | **0** | 62 baselined, 0 new |
| `check:referential-action-drift` | *pointed at `scratch_gates_cold` per `.env.gates`* | **1** | **3 new findings** — F2 |
| `check:declaration-constraint-drift` | *pointed at `scratch_gates_cold`* | **0** | identical numbers (that gate does not read referential actions) |
| `check:set-null-column-lists` | `SET_NULL_GATE_DATABASE_URL` | **0** | 564 declared SET NULL FKs, 276 needing a column list, 805 catalog constraints |
| `check:tenant-relationships` | `TENANT_RELATIONSHIP_DB_URL` | **0** | 214 single-col FKs; 79 CRM + 134 Inventory + 1 platform-global excluded; Actionable 0 |
| `check:tenant-indexes` | — | **0** | 347 schema files, 840 tenant tables, 840 leading tenant indexes |
| `check:conflict-targets` | — | **0** | 362 scanned, 159 targeted, 158 resolved, 13 partial, 1 unresolved |
| `check:replay-ledger` | `COLD_DATABASE_URL` = `scratch_cold_1010` | **0** | 677/677 in `__replay`, 0 orphans, `LEDGER STATE: CLEAN` |
| `check:audit-log-privileges` | `APP_DATABASE_URL` (non-owner) | **0** | `updateRevoked:true deleteRevoked:true triggerPresent:true` |
| `check:module-lifecycle` | `APP_DATABASE_URL` (non-owner) | **0** | `ALL GATES PASSED (timesheets, 11 tables)` |
| `pnpm db:verify-rls` | `DATABASE_URL` | **0** | `RESULT: RLS VERIFIED` |
| `pnpm verify:membership-revocation` | `DATABASE_URL` | **0** | `Removal artifacts PASS · No inheritance PASS · Inventory vs FKs PASS` |
| `compare-bootstraps.mjs c1 vs head_1010` | — | **0** | `SCHEMAS IDENTICAL differences=0` |
| `compare-bootstraps.mjs ir vs head_1010` | — | **0** | `SCHEMAS IDENTICAL differences=0` |
| `compare-bootstraps.mjs head_1010 vs cold_1010` | — | 1 | 12/12 catalog PASS; `differences=1` = ledger name only |
| `compare-bootstraps.mjs head_1010 vs gates_cold` | — | 1 | `differences=95` — F2 |

Not run, deliberately: `pnpm build`, `next build`, `typecheck`, bare `jest` (laptop budget, per the
brief). `check:alert-ack` (needs a live webhook and a human ack).

---

## 8. Verdict

| criterion | verdict |
|---|---|
| PRD-C001 | partially-met — ticket 03's half done, ticket 02's half not mine and not done |
| PRD-C053 | partially-met — reconciliation holds; 62 referential-action mismatches still baselined; 153 superseded + 22 duplicate single-column FKs now enumerated, none removed; 3 new declaration/catalog disagreement classes found |
| PRD-C054 | not-met as a removal; the six-way evidence the criterion demands is now produced for all 105 candidates, with a KEEP/REFACTOR/REMOVE classification and one blocking dependency |
| PRD-C055 | **met** — re-measured first-hand, `differences=0` on both comparable pairs, including the interrupted-then-resumed bootstrap |
| PRD-C056 | partially-met — content produced and the prior digest reproduced; retention is an ephemeral temp directory and the rollback evidence depends on untracked files |
| PRD-C060 | partially-met — composite-key half holds (Actionable 0, 840/840); supporting-index half fails at 654/1,522 and no gate measures it |
