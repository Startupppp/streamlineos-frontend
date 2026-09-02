# 07b — What the Drizzle schema declares versus what the database has

Extends tickets **07** and **08**/**08b**. Backend repo only. Territory: `src/db/schema/**`
(excluding `calendar/`, `mail/`, `kb/` and `kb_space_grants`), new migration files, this report.

Every number below was re-derived on **`scratch_t07b`**, a database built **cold from zero to
head** (`REACHED_HEAD 662/662`), by a parser and a set of `pg_catalog` queries written for this
pass. Report 08b's figures were treated as a lead and are corrected where they differ.
`scratch_perf_seed` was read, never written. `scratch_t08*`, `scratch_t09*`, `scratch_boot_*`,
`DATABASE_URL` and every `cornerstone_*` were untouched. No connection string appears here.

---

## 1. The question the ticket asked first: which gates could see any of this?

**Answer: for these two populations, three of the four relevant gates read `pg_catalog` and DO
see them; one reads the declarations and is blind; and none of them detects the defect this
ticket actually found.**

| gate | what it reads | sees the 150 undeclared tenant tables? |
|---|---|---|
| `check:tenant-indexes` (default) | `src/db/schema/**` declarations | **No.** Its 839/839 is 839 *declared* tenant tables. The 150 are not in the denominator. |
| `check:tenant-indexes --db` | `pg_class` / `pg_attribute` / `pg_index` | **Yes.** Its query enumerates every relation with an `org_id`/`organization_id` column regardless of declaration. |
| `check:tenant-relationships` (primary) | `pg_constraint` | **Yes**, for foreign keys that exist. |
| `check:tenant-relationships` (static fallback) | declarations | No — and it prints `FAIL — 627`, which is the documented fallback, not the gate's answer. |
| `check:tenant-isolation` | `src/modules/**/*.service.ts` + spec files | **Neither.** It never reads schema or catalog; it counts services without a cross-tenant negative test. It says nothing about any table, declared or not. |
| `db:verify-rls` | `pg_catalog` | **Yes.** |

So, precisely: **the "988/988" figure WAS measuring all 150** of these tables for the
leading-tenant-index property, and `db:verify-rls`'s answer covers them too — I confirmed
independently that all 101 non-partition undeclared tables have RLS enabled with at least one
policy (101/101, 0 with RLS off, 0 with zero policies). The **"839/839" figure was not**: it is
declaration-driven and the 150 are invisible to it. A green declaration-mode tenant gate is
therefore not evidence about an undeclared table, and a green catalog-mode one is.

### The gap none of them covers, which is where this ticket's work went

`check:tenant-relationships` classifies foreign keys **that exist** — it asks whether a live FK
is composite. A **declared** foreign key with **no constraint at all** is not a row it can
classify, so it is silent. Nothing else looks either. That blind spot is why five columns have
carried an impossible foreign-key declaration since migration `0000` without any gate noticing.

---

## 2. Population A — live tenant tables with no Drizzle declaration

`pg_catalog` at head: **988** relations carry `org_id` or `organization_id`. The Drizzle schema
declares **895** tables (parsed across 346 files, resolving `pgTable(...)` and
`<pgSchema>.table(...)`). **150** live tenant tables have no declaration.

| bucket | count | disposition |
|---|---:|---|
| `notifications_*` partition children | 49 | Correct as-is. Drizzle declares the partitioned parent; partitions are migration-managed. |
| Inventory (`inv_*`) | 34 | **Out of release scope.** Counted, not changed. |
| CRM (`crm_*`) | 18 | **Out of release scope.** Counted, not changed. |
| `gl_*` `ap_*` `ar_*` `bank_*` `tax_*` + `subprocessor_subscribers` | 31 | Dead on `main`. See below. |
| everything else | 18 | Dead on `main`, with one real finding. |
| **total** | **150** | |

**No table was declared, and that is the finding, not an omission.** 08b called this "the same
defect class as the 32, one order of magnitude larger". It is not the same defect class. The 32
were columns missing from tables the runtime reads; these are whole tables the runtime does not
read at all, and adding 101 `pgTable` declarations would add 101 dead exports.

### The 31-table accounting kernel is documented, and it is not a rewrite in flight

Migration `0591b_gl_ap_ar_bank_tax_chain_repair.sql` states the history in its own header:

> these 31 tables (`ap_*`, `ar_*`, `bank_*`, `gl_*`, `tax_*`, `subprocessor_subscribers`) and the
> 22 enum types they depend on were created on the live database via `drizzle-kit push` and never
> had a corresponding CREATE TABLE migration.

`0489` and `0591b` create them so a cold replay can enable RLS on them; the schema that produced
them was never on `main`. `main`'s accounting module runs on the *declared* tables:
`general-ledger.service.ts` imports `ledgerAccounts`, `journalEntries`, `journalLines` —
`ledger_accounts` / `journal_entries` / `journal_lines`, not `gl_*`. Declaring the kernel would
stand a second general ledger beside the live one.

### Deadness, proven with a validated scanner rather than a bare grep

The scan was validated in both directions before its output was used — the failure mode the brief
names, where a broken scan reports everything dead:

- positive controls (declared, known-live), runtime files excluding schema/scripts/specs:
  `organization_members` 360, `notifications` 246, `hr_people` 67, `payroll_runs` 38,
  `support_tickets` 37, `journal_entries` 29, `ledger_accounts` 26, `inv_stock_levels` 26.
- negative control `zzz_not_a_table_xyz`: 0.
- the kernel: `gl_journals` 0, `gl_journal_lines` 0, `ap_documents` 0, `ar_documents` 0,
  `bank_statements` 0, `tax_rates` 0, `tax_registrations` 0.

Of the 18 "everything else" tables, **17 have zero references anywhere in `src/` or `test/`**.
Five of them (`career_ladders`, `career_paths`, `employee_career_plans`, `learning_paths`,
`payroll_statutory_rule_sets`) appear only in historic `migrations/meta/*_snapshot.json` files,
which means they *were* declared once and the declaration was deleted while the table stayed.

The two apparent hits on `gl_accounts` and `tax_codes` are false positives and were checked, not
counted: `glAccountsQuerySchema` is a Zod DTO name, and `uniq_acc_tax_codes_org_code` is a
constraint-name string in an error branch — the live tax table is `acc_tax_codes`.

`pnpm exec knip --no-progress` — **not run**. Its subject is unused files and exports; none of
these 18 tables has a schema file to be unused, so it could not have answered the question. The
claim rests on the validated reference scan plus a real `nest build`-equivalent (`pnpm typecheck`,
exit 0) with all 101 still undeclared.

### The one real finding in that bucket

**`file_quarantine_records` is declared with `pgTable(...)` inside a service file** —
`src/modules/storage/file-quarantine.service.ts:16` — not under `src/db/schema/**`. It is live
(insert and select at lines 91–120). This violates backend CLAUDE.md §1 ("consumers import only
from the root barrel `db/schema`") and it is why the table reads as undeclared. Moving it needs an
edit to `src/modules/storage/`, outside this territory. **Handed on.**

**Before and after: 150 / 150.** Nothing in this population was changed.

---

## 3. Population B — declared `.references()` with no constraint in the catalog

1,385 `.references()` declarations parsed (`grep -c '\.references('` = 1,386, the difference being
one occurrence inside a comment — the parser was validated against that number). Cross-referenced
against all 3,133 live foreign keys:

| | at head | after |
|---|---:|---:|
| declared `.references()` | 1,385 | 1,379 (6 converted to composite `foreignKey()`) |
| backed by a live single-column FK | 1,265 | 1,273 |
| dead single, a live composite covers it | 19 | 19 (all CRM/inventory) |
| **neither — population B** | **101** | **87** |

08b reported 70. The difference is definitional, not a disagreement about the catalog: 08b
excluded the rows whose child table is not live. Split out:

| sub-population | at head | after | note |
|---|---:|---:|---|
| child table not live at all (`hrms-phase1-sql-managed`) | 23 | 23 | Unimported by design; the tables are raw-SQL-managed and not in the journal. Correct as-is. |
| legacy-actor columns → `users.id` | 19 | 17 | The contraction dropped the FK when the column became advisory beside a `*_membership_id`. Two of the 19 were not that at all — see below. |
| CRM / inventory | 47 | 47 | **Out of release scope.** Counted, not changed. |
| **in release scope** | **12** | **0** | All twelve enforced. |

### A parser bug worth naming, because it changed the answer

The first version of this parser reported 12 in-scope rows *including*
`autonomy_switches.autonomy_switch_id -> organizations.id`, which is nonsense — that column is a
UUID primary key. The property splitter was attributing a `.references()` to the preceding
property whenever a doc comment sat between them: a comment beginning with a capitalised word
consumed the "next property starts here" state. This is ticket 07 §0's finding recurring
(a column splitter "dropped 200 comment-prefixed columns"). Stripping comments string-safely
before parsing recovered **197 columns** (10,706 → 10,903) and corrected the population.

---

## 4. The five columns whose live type made the foreign key impossible

The most consequential finding, and it is not what the lead predicted. A sweep of all 10,903
declared columns against `pg_attribute` found **26** type-family mismatches. 21 are
`text("x").array()` against `text[]` and are correct. The remaining **5 are real, and all five are
in `src/db/schema/billing/billing.ts`**:

| column | declared | live | references |
|---|---|---|---|
| `referrals.referrer_org_id` | `text` | `integer` | `organizations.id` (`text`) |
| `referrals.referred_org_id` | `text` | `integer` | `organizations.id` (`text`) |
| `referrals.referrer_user_id` | `text` | `integer` | `users.id` (`text`) |
| `affiliate_commissions.referred_org_id` | `text` | `integer` | `organizations.id` (`text`) |
| `app_installations.installed_by` | `text` | `integer` | `users.id` (`text`) |

Migration `0000_light_vance_astro.sql` created them `integer`, back when organisation and user ids
were serial integers. Both id columns became `text` and every other table followed; these five did
not. **The foreign key is missing because an integer column cannot reference a text key** — the
declaration has been asking for something Postgres would refuse for the life of the repo. That is
also why 08b's classifier placed `affiliate_commissions.referred_org_id`, `referrals.*` and
`app_installations.installed_by` in the "looks like a real gap" list without a cause.

**It is a live run-time defect, not a documentation defect.** `ReferralService.createReferral`
(`referral.service.ts:16`) takes `referrerOrgId: string` and inserts it; `AffiliateService`
(`affiliate.service.ts:67`) does the same. Reproduced on a database at head **before** the fix:

```
INSERT INTO referrals (referrer_org_id, referrer_user_id, referred_email, referral_code)
  VALUES ('org_t07b_a', 'user_t07b_1', 'x@example.com', 'CODE1');
ERROR:  invalid input syntax for type integer: "org_t07b_a"     (22P02)
```

`referrals`, `affiliate_commissions` and `app_installations` hold **0 rows** on
`scratch_perf_seed`, `scratch_t09_final` and `scratch_boot_c` alike. That is what a write path
that has never once succeeded looks like.

Migration `1023` converts the five columns and adds the five foreign keys. **It deletes and
rewrites nothing.** If any database holds a row whose id cannot be resolved after the cast, the
migration RAISEs and names the table and the count. A migration must not quietly delete a
customer's rows to make its own constraint validate.

---

## 5. What was added, and why each shape

### 1023 — five foreign keys behind the type repair
`fk_referrals_referrer_org`, `fk_referrals_referred_org`, `fk_referrals_referrer_user`,
`fk_affiliate_commissions_referred_org`, `fk_app_installations_installed_by`, all
`ON DELETE CASCADE`, plus four supporting indexes (`referrals.referrer_org_id` already had one).
Single-column is the correct shape: `organizations` and `users` are not tenant-owned, so
`check:tenant-relationships` does not — and should not — ask for a composite.

### 1024 — three tenant anchors, one of which was a real orphan
`chat_message_reactions.org_id` and `build.project_ticket_counters.org_id` are covered
transitively today (both have a NOT NULL composite to a parent that cascades), so those two are
declaration repairs.

**`notifications.org_id` was not.** Its only tenant-bearing edge is
`fk_notifications_recipient_membership (org_id, membership_id) -> organization_members`, and
`membership_id` is **nullable**. Reproduced before the fix, on a database at head:

```
INSERT INTO notifications (org_id, membership_id, ...) VALUES ('org_p1', NULL, ...);
DELETE FROM organizations WHERE id = 'org_p1';
SELECT count(*) FROM notifications WHERE org_id = 'org_p1';   ->  1
```

One notification left pointing at an organisation that no longer exists. After `1024` that count
is 0. `notifications` is RANGE-partitioned; the constraint propagates to all **49** partitions,
verified in `pg_constraint` before the file was written and asserted by the migration itself.

### 1025 — six composite self/sibling foreign keys
`support_tickets.merged_into_ticket_id`, `payroll_policies.active_version_id`,
`payroll_runs.source_run_id`, `hr_policies.parent_policy_id`, `hr_templates.parent_template_id`,
`hr_automation_runs.triggered_by_run_id`.

Child and parent are tenant-owned on all six, so backend CLAUDE.md §3 makes the correct shape
`(org_id, col) -> (org_id, id)`, **not** the single-column form the declaration asked for. The
declaration was asking for the hole: a single-column pointer lets a row in org A name a parent in
org B. Every parent's `uniq_<table>_org_id UNIQUE (org_id, id)` anchor was read from
`pg_constraint` per table first. Each `ON DELETE SET NULL` carries an **explicit column list**
naming only the nullable pointer, because `org_id` is NOT NULL on all six and a bare composite
SET NULL would raise 23502 on every parent delete — 0770's defect, 0992's repair.

`pg_trigger` was checked on all six for the append-only guard that made migration `1009`
interesting. The only trigger on any of them is `trg_support_tickets_party`, which fires on
`UPDATE OF client_id` and is not reached by a SET NULL on `merged_into_ticket_id`.

### 1026 — `payroll_tds_ytd_ledger.run_id`, routed in by the coordinator
No foreign key at all. Added as the composite `(org_id, run_id) -> payroll_runs(org_id, id)`,
matching the eleven sibling keys that already point at `payroll_runs`, plus a partial index.

**`NO ACTION`, deliberately, and this is the load-bearing decision.** Migration `1030` put
`guard_paid_payroll_tds_ytd_row` on this table as a `BEFORE DELETE OR UPDATE` guard, and its
UPDATE branch lists `run_id` among the columns that may not change once
`payroll_run_is_paid_out(run_id)`. `ON DELETE SET NULL` is implemented as an UPDATE, so a SET NULL
here would raise 23514 the moment anyone deleted a paid run — the exact defect class `1009`
surfaced on `inv_stock_transactions.location_id`, except **introduced** rather than inherited.
CASCADE hits the same guard's DELETE branch. NO ACTION never touches the child row, and it states
the right rule anyway: a run whose withheld tax is on the year-to-date ledger is not deletable.

### A silent failure caught by reading the catalog rather than the migration's exit code
`1025`'s first run created `idx_payroll_runs_source_run` with `CREATE INDEX IF NOT EXISTS` — and a
declared index of that name already existed on `(source_run_id)`. `IF NOT EXISTS` matched the name,
did nothing, and reported success, leaving the new composite foreign key unindexed. Found by
querying `pg_index` after the run. The index is now `idx_payroll_runs_org_source_run`, and
**1023, 1025 and 1026 each assert their own indexes' column lists in a closing `DO $$` block**, so
the next collision fails loudly instead of silently.

---

## 6. Behavioural proof — 12 of 12, run rather than reasoned about

On the final cold-built `scratch_t07b`, one transaction, two organisations, rolled back.

| | assertion | |
|---|---|---|
| P1 | `referrals` accepts a text organisation id (was 22P02) | PASS |
| P2 | `affiliate_commissions` accepts a text organisation id | PASS |
| P3 | `app_installations` accepts a text user id | PASS |
| P4 | a nonexistent `referrer_org_id` is refused, 23503 | PASS |
| P6a | a **cross-tenant** `merged_into_ticket_id` is refused, 23503 | PASS |
| P6b | deleting the survivor NULLs the pointer and leaves `org_id` intact (the 23502 test) | PASS |
| P7a | a **cross-tenant** `parent_policy_id` is refused, 23503 | PASS |
| P7b | deleting the parent policy NULLs the pointer, `org_id` intact | PASS |
| P10 | a nonexistent payroll `run_id` on the TDS ledger is refused, 23503 | PASS |
| P11 | deleting a policy version NULLs `active_version_id`, `org_id` intact | PASS |
| P8 | **the organisation purge** — `SET app.organization_id`, `app.nullify_audit_logs_org_id(...)`, then `DELETE FROM organizations`, exactly what `cron-org-purge-worker.service.ts` issues — leaves 0 rows in `referrals`, `app_installations`, `notifications`, `support_tickets`, `hr_policies`, `payroll_tds_ytd_ledger` and `payroll_runs` | PASS |
| P9 | the second organisation's purge clears `affiliate_commissions` | PASS |

P8 is the one that matters: it is both the cascade proof for every new CASCADE and the proof that
`1026`'s NO ACTION does not block the purge (NO ACTION is checked at end of statement, and the
ledger rows and the runs go in the same cascade).

---

## 7. Gates — command, exit code, number

`--db` gates target `scratch_t07b`, cold-built from zero at the final head.

| command | exit | number |
|---|---:|---|
| `node src/scripts/db-bootstrap.mjs` (**cold from zero**, final head) | 0 | **REACHED_HEAD 662/662** |
| rollback round trip (3 down files, delete ledger rows, re-bootstrap) | 0 | FKs **3196 → 3133 → 3196**; `referrer_org_id` text → integer → text; REACHED_HEAD 662/662 |
| `pnpm typecheck` | **0** | **0 errors** |
| `pnpm check:migration-discipline` | 0 | 662 files, 0 new violations |
| `pnpm check:migration-chain` | 0 | chain verified, no issues |
| `pnpm check:migration-ledger` | 0 | 662 applied vs 662 journal, 0 orphan/duplicate/unreachable |
| `pnpm check:migration-rollback` | 0 | all rollback type-name checks passed |
| `pnpm check:tenant-indexes` (declaration) | 0 | **839 / 839** |
| `pnpm check:tenant-indexes --db` (pg_catalog) | 0 | **988 / 988** |
| `pnpm check:tenant-relationships` (pg_catalog) | 0 | **0 actionable**; 214 single-col FKs, 79 EXCL:CRM, 134 EXCL:Inventory, 1 EXCL:platform-global |
| `pnpm db:verify-rls` | 0 | RESULT: RLS VERIFIED |
| `pnpm check:set-null-column-lists` (both halves) | 0 | 561 declared / **274** needing a list (was 267) / 802 catalog; both halves OK |
| `pnpm check:drop-column-safety` | 0 | 662 files, 126 dropped columns, 0 still declared |
| `pnpm check:restrict-fks` | 0 | 345 schema files, clean |
| `pnpm check:hr-table-freeze` | 0 | 234 tables approved |
| `npx madge@8 --circular --extensions ts src` | 0 | **No circular dependency found** (5,507 files) |
| `psql -f proof.sql` | 0 | **12 / 12** |

### Re-run on the resumed pass, after 1027

The session was killed by an infrastructure watchdog mid-way through writing `1027`. Everything
above (1023-1026) was already committed and the journal was consistent. These are the gates re-run
after `1027` landed, on the resumed pass — command, exit code, number, each read rather than assumed.

| command | exit | number |
|---|---:|---|
| `pnpm typecheck` | **0** | **0 errors** (8 GB heap, through the mutex) |
| `pnpm check:migration-discipline` | 0 | **664** SQL files, **0** new violations |
| `pnpm check:migration-chain` | 0 | chain verified, no issues |
| `pnpm check:migration-ledger` | 0 | 664 journal entries, 0 orphan / duplicate / unreachable |
| `pnpm check:migration-rollback` | 0 | 664 scanned, all rollback type-name checks passed |
| `pnpm check:tenant-indexes` (declaration) | 0 | **839 / 839** |
| journal ↔ blob audit at HEAD (`git cat-file -e HEAD:migrations/<tag>.sql` for all 664) | 0 | **664 entries, 0 whose `.sql` is uncommitted** |
| journal invariants (`idx` unique, `when` strictly increasing) | — | 664 entries, **idx unique = true**, **0 `when` inversions**, max idx 796 |

`check:tenant-indexes --db`, `check:tenant-relationships`, `db:verify-rls`, `check:spec-typecheck`,
`check:set-null-column-lists`, `check:drop-column-safety`, `check:restrict-fks`,
`check:hr-table-freeze`, `madge --circular` and the 12-assertion `proof.sql` were **not re-run** on
the resumed pass. `1027` adds one partial index and one `index()` declaration and touches no
column, constraint, type or import, so none of their subjects changed — but not-re-run is not
passing, and it is recorded as not run.

### Red, and not mine — checked against `git status`, not assumed

- **`pnpm check:spec-typecheck` — exit 2, one error**:
  `src/modules/hr/config/hr-config-tenant-isolation.spec.ts(146,30): error TS2554: Expected 2
  arguments, but got 1.` That file is **clean at HEAD and I never opened it**; someone changed
  `HrNotificationPreferencesService.get`'s arity without updating its spec.
  `src/modules/hr/config/` is not this territory.
- **`pnpm check:tenant-isolation` — exit 1, one service**:
  `src/modules/organization/setup/org-setup-completed-consumer.service.ts` has no cross-tenant
  negative test. That file arrived in commit `f4c7bdf5` ("move org setup onto the outbox") and
  `src/modules/organizations/**` is explicitly outside this territory.

### One breakage that WAS mine, and how it was closed

Converting `payroll_policies.activeVersionId` from `.references((): AnyPgColumn => ...)` to a
composite `foreignKey({ foreignColumns: [payrollPolicyVersions...] })` removed the annotation that
breaks the `payroll_policies` ↔ `payroll_policy_versions` inference cycle. TypeScript raised
TS7022, the schema barrel's type collapsed to `any`, and the error fanned out to **201 errors**
across `hr/`, `chat/`, `inventory/`, `e-sign/` and `dashboard/` — red for every other agent, for a
reason none of them owned. Fixed by lifting the same documented escape hatch to the tuple a
composite key needs:

```ts
const activeVersionParentColumns = (): [AnyPgColumn, AnyPgColumn] => [
  payrollPolicyVersions.orgId,
  payrollPolicyVersions.id,
];
```

`pnpm typecheck` **201 errors → 0, exit 0**. The lesson generalises: `AnyPgColumn` on a mutually
referential table is load-bearing, and a "is this identifier referenced" scan will call it unused
because its only use is at a type position inside a callback.

---

## 8. Handed on

1. **`file_quarantine_records` is declared inside `src/modules/storage/file-quarantine.service.ts`**
   rather than under `src/db/schema/**`. Live table, live reads and writes, wrong home
   (backend CLAUDE.md §1). Outside this territory.
2. **`writeTdsYtdLedger` replaces where it should accumulate** — routed in again on the
   resumed pass and **again deliberately not taken**, now with the reasons measured against source.
   Full analysis and the exact hand-off in **§11**.
3. **The `dashboard-personal-my-tasks` read-cost breach** — routed as "1,801 rows against a 1,000
   budget"; the number is real but belongs to a different budget, and the index is right anyway.
   Measured and closed in **§9**. The budget itself stays vacuous — a seed defect in
   `src/scripts/`, handed on in §9.4.
4. **101 undeclared live tenant tables remain**, all classified in §2, none of them read by `main`.
   The 31-table `gl_*`/`ap_*`/`ar_*`/`bank_*`/`tax_*` kernel is a `drizzle-kit push` artefact
   documented in `0591b`'s own header, not an in-flight rewrite; declaring it would stand a second
   general ledger beside `ledger_accounts`/`journal_entries`/`journal_lines`.
5. **87 population-B rows remain**: 47 CRM/inventory (scope), 23 SQL-managed `hrms-phase1`
   (correct as-is), 17 legacy-actor `-> users.id` columns whose FK the contraction dropped on
   purpose — the declaration is what is stale there, and removing it is a contract decision rather
   than a cleanup.
6. **No gate detects a declared foreign key with no live constraint.** `check:tenant-relationships`
   classifies keys that exist. Closing that would be a new mode on an existing gate, and
   `src/scripts/check-*.mjs` is outside this territory.

---

## 9. The `dashboard-personal-my-tasks` index — measured, not assumed

**Routed in by the coordinator as "the `dashboard-personal-my-tasks` read-cost budget breaches at
1,801 rows scanned against 1,000". That framing is wrong in a way worth recording, and the index
underneath it is right.** Both halves were measured, not reasoned about.

### 9.1 What the harness actually reports at head

`scratch_t07c`, a `CREATE DATABASE … TEMPLATE scratch_perf_seed` copy made so the measurement could
write. 20,572 tickets across the four tenants (18,500 / 1,850 / 185 / 37 = 89.93 / 9.00 / 0.90 /
0.18 percent); `build.tickets`' index set is byte-identical to head-662's, checked with a `diff` of
`pg_indexes` against `scratch_t07b`. Probed as `streamline_app` (`rolbypassrls = false`) with
`app.organization_id` set, in **buffers**, warm (third of three samples), on **every** tenant.

```
APP_DATABASE_URL=…streamline_app…/scratch_t07c PGSSLMODE=disable SEED_ORG_ID=<tenant> \
  node src/scripts/run-read-cost-budgets.mjs --ids=dashboard-personal-my-tasks,dashboard-my-issues
```

| tenant | `dashboard-personal-my-tasks` | `dashboard-my-issues` |
|---|---|---|
| 89.93% | **FAIL — vacuous**, 0 rows, scan 0, 4 buffers | PASS, 10 rows, **scan 1801**, 261 buffers |
| 9.00% | **FAIL — vacuous**, 0 rows, scan 0 | PASS, 10 rows, scan 31, 40 buffers |
| 0.90% | **FAIL — vacuous**, 0 rows, scan 24 | PASS, 10 rows, scan 24, 175 buffers |
| 0.18% | FAIL — seed too small (37 < 50) | FAIL — seed too small |

Three corrections fall out:

1. **`dashboard-personal-my-tasks` does not breach `maxScanRows` at head.** It is still *vacuous* —
   `read-cost-budgets.mjs:1094` says so in its own comment: its predicate is the application's
   `'TODO','IN_PROGRESS','IN_REVIEW'` and the seed writes `'Todo','In Progress','In Review'`
   (18,642 / 645 / 643 / 642 rows), so it matches nothing. Its measured scan count is 0 or 24,
   under its 1,000 ceiling.
2. **The 1,801 is real but belongs to `dashboard-my-issues`** — the same query without the status
   filter — which declares **no** `maxScanRows` and passes its 2,000-buffer ceiling at 261. The
   1,000 in the routed claim is `dashboard-personal-my-tasks`'s ceiling. Two budgets were conflated.
3. The underlying plan defect is exactly as described, and it is worth fixing anyway, because both
   budgets are the same read and the vacuous one becomes the breaching one the moment the seed's
   status vocabulary is repaired.

The plan at the 89.93% tenant, at head:

```
Index Scan using idx_tickets_org_updated_live on tickets t (actual rows=10)
  Index Cond: (org_id = '…001')
  Filter: (assignee_membership_id = 3)
  Rows Removed by Filter: 1791
```

Ten rows returned, 1,791 discarded — 1,801 scanned. The minority tenants take
`idx_tickets_org_assignee_status` instead and scan 31 / 24 / 8. Same query, different index per
tenant: the skew that ticket 07 §4.3 was built to expose.

### 9.2 The measurement, both candidate shapes, all four tenants

Buffers, warm, index created and dropped around each column, `VACUUM ANALYZE build.tickets` after
every DDL. Column B is the shape the coordinator proposed; column C is what shipped.

`dashboard-my-issues` — the budget that returns rows on this seed:

| tenant | A: head | B: `(org, assignee, status, updated DESC)` | C: `(org, assignee, updated DESC)` |
|---|---:|---:|---:|
| 89.93% | 261 | 261 | **22** |
| 9.00% | 40 | 40 | **19** |
| 0.90% | 175 | 175 | **75** |
| 0.18% | 61 | 61 | **60** |

the same query with the status filter, using the seed's own vocabulary so it is not vacuous:

| tenant | A: head | B | C |
|---|---:|---:|---:|
| 89.93% | 252 | 252 | **13** |
| 9.00% | 34 | 34 | **13** |
| 0.90% | 31 | 31 | **15** |
| 0.18% | 10 | 10 | **10** |

Rows scanned on `build.tickets` at the majority tenant: **1,801 → 10**.

**Column B — the proposed shape — is identical to head on every tenant, to the buffer.** Not
"marginal": identical. The majority tenant declines it outright and keeps walking
`idx_tickets_org_updated_live`; the minority tenants adopt it and read exactly what they read
before. A `status` key sitting between the equality columns and the sort column means the index
cannot return rows already ordered by `updated_at`, so `LIMIT 10` cannot stop early. Dropping
`status` from the key is the whole fix; `status` becomes a recheck on the ten rows the index
already narrowed to.

**Column C is chosen on all four tenants and is never worse than head on any of them.** That is the
inverse of the pattern that made 0999's seven drops regressions, where the gain appeared only at
the large tenant and the minority tenants were flat — here the large tenant gains 11.9x
(my-issues) and 19.4x (my-tasks) and the minority tenants gain 2.1x-2.6x, with the 0.18% tenant
flat at 60/10 because it has 8 rows to look at.

It costs **440 kB against a 3,584 kB heap**, and is partial on `deleted_at IS NULL`.

Post-index harness run, same command, majority tenant:
`dashboard-my-issues` PASS, **22 buffers, scan 10** (was 261 / 1801).
`dashboard-personal-my-tasks` still FAIL-vacuous — an index cannot fix a predicate that matches
nothing.

### 9.3 Proofs on the migration itself

| step | exit | result |
|---|---:|---|
| `psql -1 -f migrations/1027_….sql` on a copy at head | 0 | index created, assertion passes |
| `psql -1 -f migrations/rollback/1027_….down.sql` | 0 | `pg_indexes` count 1 → 0 |
| re-apply, then apply a third time | 0, 0 | `IF NOT EXISTS` NOTICE, assertion still passes — idempotent |
| **negative test**: same name, wrong shape `(org_id, assignee_membership_id)`, then apply | **3** | `ERROR: 1027: … does not cover (org_id, assignee_membership_id, updated_at)` — the guard bites, which is 1025's silent `IF NOT EXISTS` collision caught in advance |
| `indexdef` read back from `pg_indexes` | — | `btree (org_id, assignee_membership_id, updated_at DESC) WHERE (deleted_at IS NULL)` |

### 9.4 Handed on from this measurement

`dashboard-personal-my-tasks` is a **vacuous budget**, and this index does not close it. The seed
writes title-case ticket statuses and the budget asserts the application's UPPER_SNAKE.
`read-cost-budgets.mjs:1094` is explicit that the seed is the side that deviates and that the
predicate must NOT be retuned to it — so the fix belongs in the seed script, in `src/scripts/`,
which is not this territory. Until then the budget's `maxScanRows: 1_000`, its
`forbid-seq-scan` assertion and its 2,000-buffer ceiling are all unenforced at every tenant.

---

## 10. Files changed

**Migrations (new, all committed):** `1023_t07b_billing_legacy_integer_id_columns.sql`,
`1024_t07b_tenant_anchor_foreign_keys.sql`,
`1025_t07b_composite_self_reference_foreign_keys.sql`,
`1026_t07b_payroll_tds_ytd_ledger_run_foreign_key.sql`,
`1027_t07b_dashboard_my_tasks_assignee_updated_index.sql`, and a `.down.sql` for each under
`migrations/rollback/`. `migrations/meta/_journal.json` gained five entries at
`idx` 791–794 and 796 / `when` 1803000010110–1803000010113 and 1803000010115 — appended in a single read-modify-write each
time, `idx` unique, `when` strictly increasing and above the 2027-02-19 watermark, and nothing
renumbered.

**Schema (`src/db/schema/**`):** `build/ticket-core.ts`, `billing/billing.ts`, `support/tickets.ts`,
`payroll/policies.ts`, `payroll/runs.ts`, `payroll/entities-periods.ts`, `hr/policy-engine.ts`,
`hr/template-engine.ts`, `hr/automation-engine.ts`.

**Not changed, deliberately:** no service or module file. Nothing under `calendar/`, `mail/`,
`kb/`, or the `kb_space_grants` declaration.

### A concurrency note worth recording

Two other agents journalled migrations into `_journal.json` during this pass. The one-shot
read-modify-write picked both up correctly: ticket 24's `1030` appeared between my two writes and
my entries landed above it, and ticket 29's removal of their own `1020` entry (their `.sql` was
never committed and has since been deleted) was preserved rather than reverted. `git diff` on the
journal was read before every write. Migration numbering started above `1022`, the highest present
at start, and nobody else's file was renamed.

---

## 11. Routed item B — the payroll TDS ledger. Re-examined, and deliberately NOT taken.

Routed in as: `payroll_tds_ytd_ledger.run_id` has no foreign key, and `writeTdsYtdLedger` replaces
where it should accumulate, erasing tax actually withheld on an adjustment run; the fix needs
`run_id` in the natural key coordinated with the service change, both halves or neither.

**Half one is already done and committed.** Migration `1026` (this ticket, previous pass) added
`fk_payroll_tds_ytd_ledger_run_id_org` as the composite `(org_id, run_id) -> payroll_runs(org_id,
id)` with `NO ACTION`. Read back from `pg_constraint`; the declaration is at
`src/db/schema/payroll/entities-periods.ts:275-280`.

**Half two is not taken, and the reason is not squeamishness about territory.** Four findings, each
checked against source rather than inferred:

1. **The destructive case the routing describes is already refused at the data layer.** Committed
   migration `1030_t24_payroll_tds_ytd_immutability.sql` puts
   `trg_guard_paid_payroll_tds_ytd_row` on this table — `BEFORE UPDATE OR DELETE`, raising 23514
   when `payroll_run_is_paid_out(OLD.run_id)` (status `PAID`, `PAYSLIPS_PUBLISHED` or `CLOSED`) and
   any of `taxable_income_paise`, `tds_paise`, `run_id` or the subject/period columns changes. The
   `ON CONFLICT DO UPDATE` at `locking.service.ts:259` and `:294` is exactly such an UPDATE. So tax
   that has actually been paid out and reported on a challan **cannot** be silently overwritten
   today; the second run's lock raises instead. 1030's own header works through this case at
   length and calls refusing it "the correct outcome for a financial record".
2. **The residual window is narrower than routed**: an earlier run in `LOCKED` but not yet `PAID`.
   There the guard stands aside by design (1030's first objection: `locking.service.ts` sets
   `status = 'LOCKED'` and upserts the ledger in the same transaction, so freezing on `LOCKED`
   would break ordinary re-locking), and a same-month `BONUS` / `OFF_CYCLE` / `CORRECTION` /
   `FINAL_SETTLEMENT` run does still replace rather than accumulate.
3. **"Add `run_id` to the natural key" is not sufficient as stated.** `run_id` is **nullable**
   (`integer("run_id")`, no `.notNull()`), and the two keys are *partial* unique indexes
   (`uniq_payroll_tds_ytd_user_period` `WHERE user_id IS NOT NULL`, and the `worker_id` twin). NULL
   never equals NULL in a unique index, so adding a nullable `run_id` to them de-duplicates
   nothing for any row that has one. Doing this correctly means `run_id NOT NULL` plus a backfill
   decision for pre-existing rows — and 1030's DELETE escape hatch is reasoned explicitly from
   "`run_id` -> no foreign key at all", which `1026` has since changed. That is a materially larger
   change than a key widening, on a table two committed migrations now constrain.
4. **The grain change has no reader to validate it against.** `grep -rn payrollTdsYtdLedger src/
   test/` returns **the writer and nothing else** — 11 hits, all in
   `payout/locking.service.ts`, plus the schema file. Nothing selects from this table. So there is
   no read path that says whether "accumulate" means one row per run summed at read time, or a
   single running total updated in place, or the regular run's figure superseded by the correction.
   Choosing between those is a payroll product decision about how a YTD tax record is
   represented — not a schema repair — and picking one unilaterally would fix the grain of a
   financial record before anything reads it.

On top of that, `1030`'s header states the follow-up is owned: *"making off-cycle runs accumulate
correctly needs run_id in the ledger's natural key … and is reported to ticket 24 as a follow-up
rather than smuggled in here."* Taking it here would put two owners on one financial table in the
same release, which is the failure this brief's territory rules exist to prevent.

**So it is recorded, not silently lost.** What a single owner holding both halves needs to do:

- decide the representation (one ledger row per run, summed on read; or one row per period,
  incremented) — a payroll product decision;
- `run_id` → `NOT NULL` with a backfill for existing rows, then widen both partial unique indexes
  to include it (`src/db/schema/payroll/entities-periods.ts` + a migration — this territory);
- move `onConflictDoUpdate`'s target to the new key at `locking.service.ts:259` and `:294`, and
  change the `set:` clause to match the chosen representation
  (`src/modules/payroll/payout/locking.service.ts` — not this territory);
- re-check `1030`'s guard: with `run_id` in the key the conflict branch can no longer change
  `run_id`, so the UPDATE branch is satisfied, but the DELETE escape hatch's "a deleted run leaves
  the row unfrozen" is now unreachable through `1026`'s `NO ACTION` FK and its comment is stale.

**Note the path in the routing is wrong**: `writeTdsYtdLedger` is at
`src/modules/payroll/payout/locking.service.ts:206`, with the two upserts at **:244** and **:277**.
There is no `src/modules/payroll/runs/locking.service.ts`.

**One consequence of `1026` checked and clear.** `1026`'s `NO ACTION` FK makes a `payroll_runs`
delete fail with 23503 while ledger rows reference it. The only `delete(payrollRuns)` in the repo
is the cleanup in `src/modules/payroll/__tests__/payroll-db-integration.e2e-spec.ts:118`, which
deletes runs before the ledger. It is safe because that spec reaches `LOCKED` by writing
`status` directly (`:361`), never through `LockingService.commitLock`, so it never creates a ledger
row. Organisation purge is covered by §6's P8.
