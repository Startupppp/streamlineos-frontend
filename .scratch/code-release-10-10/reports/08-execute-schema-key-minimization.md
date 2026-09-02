# 08 — Executing ticket 07's verdicts, and re-proving the database contract

Session S3 · 2026-09-02 · backend repo only. Territory: `src/db/schema/**`, `migrations/**`.
Every number below came from a command I ran and read. No connection string appears here.

Scratch databases: **`scratch_t08`** (cold build at 646, then resumed to 649) and
**`scratch_t08b`** (a second, independent cold build at the corrected head, 650/650).
`scratch_boot_a/b/c/d`, `scratch_t03`, `scratch_ai_latency`, `scratch_perf_seed`,
`DATABASE_URL` and every `cornerstone_*` were left alone; `scratch_boot_c` was read once,
read-only, to corroborate index names before `scratch_t08` existed.

---

## 0. What was already done before this session

A prior ticket-08 pass landed migrations **0994–1000** (committed in `a3bf8470` / `b43cbba5`)
and stripped the matching index declarations out of 144 schema files. Verifying against the
catalog rather than against the report changed three of the four items I was handed:

| Handed to me | What the catalog at head actually says |
|---|---|
| C. `app.search_kb_chunk_ids` still carries `AS MATERIALIZED` | **Already fixed.** `pg_get_functiondef` on `scratch_t08` (646 migrations) returns the body with no CTE. Migration **1000** removed the fence. Ticket 12 measured `scratch_ai_latency`, which holds **639** ledger rows — it predates 1000. Nothing to do. |
| S16 — 151 `ON DELETE CASCADE` → `organizations.id` with no leading index | **0 remain.** My first sweep said 1 (`autonomy_switches`), which was my own parser bug: a `pg_get_indexdef` column-list regex that stops at the first `)` mis-reads `(organization_id, kind) NULLS NOT DISTINCT`. Fixed the parser; the count is 0. |
| S23 — 63 enum types with no column | **3 remain**, exactly the three 0998 deliberately excluded (`crm_lead_status`, `hr_position_status` still have a live `pgEnum`; `task_type` is a live CRM string literal). Complete. |
| A. 7 tables missing a `uniqueIndex(orgId, id)` declaration | Confirmed and executed — see §1. |

The same parser bug had also hidden six prefix-redundant indexes from 0999. They are dropped
here (§3).

---

## 1. Handoff A — the seven missing tenant-anchor declarations

All seven carry `uniq_<table>_org_id (org_id, id)` in the live catalog as a **UNIQUE
constraint** (`pg_constraint.contype = 'u'`, created by 0999), so the declaration was the only
thing lagging and no migration was needed. Added one `unique("uniq_<table>_org_id").on(t.orgId, t.id)`
per table:

`crm_sla_breach_log`, `org_custom_domains`, `release_tickets`, `ticket_label_mappings`,
`ticket_related_links`, `webhook_deliveries`, `work_item_relations`.

    pnpm check:tenant-indexes     before  821 / 828  exit 1
                                  after   829 / 829  exit 0

(829 rather than 828 because `support_ticket_tags` becomes a tenant table once §2 declares its
`org_id`.) This closes the box ticket 03 had to leave PARTIAL.

---

## 2. Handoff B — three declaration/catalog drifts, and the 33 that stand behind them

### `support_ticket_tags` — fixed, and it is one of 33

The live table has `org_id text NOT NULL`, two composite FKs
(`(org_id, ticket_id) → support_tickets`, `(org_id, tag_id) → support_tags`) and
`idx_support_ticket_tags_org_ticket`. The Drizzle declaration had none of them, and still
declared two single-column `.references()` that migrations 0967/0968/0973 had already dropped
from the catalog. The declaration now matches `pg_constraint` exactly.

Its two insert sites relied on a database trigger to supply the tenant:
`set_org_id_from_parent` (`trg_set_org_id`) derives `org_id` from the parent FK when an insert
omits it. Both now pass `orgId` explicitly, so the write is tenant-scoped in code rather than
by trigger.

**That trigger is on 67 tables, and 32 of them still declare no tenant column at all.** This is
the general form of the handoff, not a one-off. A live tenant column absent from Drizzle is
invisible to every declaration-reading gate, and a service querying such a table cannot filter
by `org_id` — it is relying entirely on RLS. Fixing each one is a contract change in a module
I do not own (each insert site must start passing `orgId`), so the list is handed on:

- `assignment_rule_state` — src/db/schema/crm/leads.ts
- `client_account_activities` — src/db/schema/crm/contacts.ts
- `competencies` — src/db/schema/hr/kpis.ts
- `crm_sequence_steps` — src/db/schema/crm/automation-studio.ts
- `email_sequence_enrollments` — src/db/schema/hr/hiring-pipeline.ts
- `email_sequence_steps` — src/db/schema/hr/hiring-pipeline.ts
- `hr_import_rows` — src/db/schema/hr/import-jobs.ts
- `hr_workflow_steps` — src/db/schema/hr/workflow-engine.ts
- `inv_customer_return_lines` — src/db/schema/inventory/operations.ts
- `inv_cycle_count_lines` — src/db/schema/inventory/operations.ts
- `inv_grn_lines` — src/db/schema/inventory/purchase-orders.ts
- `inv_load_lines` — src/db/schema/inventory/shipping.ts
- `inv_package_lines` — src/db/schema/inventory/shipping.ts
- `inv_physical_audit_lines` — src/db/schema/inventory/operations.ts
- `inv_pick_list_lines` — src/db/schema/inventory/operations.ts
- `inv_po_lines` — src/db/schema/inventory/purchase-orders.ts
- `inv_quality_inspection_lines` — src/db/schema/inventory/quality.ts
- `inv_recall_lines` — src/db/schema/inventory/quality.ts
- `inv_shipment_lines` — src/db/schema/inventory/shipping.ts
- `inv_so_lines` — src/db/schema/inventory/sales-orders.ts
- `inv_stock_adjustment_lines` — src/db/schema/inventory/stock.ts
- `inv_stock_transfer_lines` — src/db/schema/inventory/stock.ts
- `inv_vendor_return_lines` — src/db/schema/inventory/operations.ts
- `invoice_items` — src/db/schema/crm/invoicing.ts
- `key_results` — src/db/schema/hr/performance.ts
- `onboarding_template_steps` — src/db/schema/hr/offboarding.ts
- `purchase_bill_items` — src/db/schema/crm/invoicing.ts
- `quote_line_items` — src/db/schema/crm/invoicing.ts
- `sign_bulk_send_rows` — src/db/schema/e-sign/bulk-send.ts
- `support_ticket_messages` — src/db/schema/support/tickets.ts
- `task_sequence_steps` — src/db/schema/crm/deals-tasks.ts
- `vendor_candidate_submissions` — src/db/schema/hr/hiring-pipeline.ts

### `communication_backfill_issues` — KEEP undeclared, SQL-managed

Created by 0628/0660 with `CREATE TABLE IF NOT EXISTS`, RLS on, leading tenant index from 0996,
and written **only by migrations** (0660, 0661, 0662, 0713). Its own
`COMMENT ON TABLE` says "Durable diagnostics for actor-to-membership contraction; rows are
reviewed before legacy columns are removed." Zero references in `src`. Same category as the
`hrms-phase1-sql-managed` set: being unimported is the design. Declaring it would put a
migration-owned diagnostics table under Drizzle for no consumer; dropping it would destroy the
evidence a later column drop depends on.

### `subprocessor_subscribers` — S07, reconcile-or-schedule

Created by 0489/0619 ("chain creates what production has"), RLS from 0591, leading tenant index
from 0996, zero references anywhere in `src`. Its sibling `subprocessors` **is** live
(`scan-legacy-org-actors.mjs:54,59` names `subprocessors.updated_by` as a platform-legal DPA
record), so this is the un-wired half of a sub-processor notification feature — a member of
report 07's 105-table S07 set. Not droppable (0619 exists to reproduce production shape), not
declarable in isolation. Scheduled, not guessed.

---

## 3. What the migrations do

Five hand-authored migrations, five rollbacks, five journal entries
(`idx` 778–782, `when` 1803000010097–…101, all above the 2027-02-19 watermark, unique, strictly
increasing; no existing entry was renumbered). `drizzle-kit generate` was not used.

### 1001 — payroll financial immutability (coordinator item 1)

Five `BEFORE UPDATE OR DELETE` row triggers in 0445's shape:
`payroll_journal_batches`, `payroll_journal_batch_lines`, `payroll_bank_batches`,
`payroll_bank_batch_items`, `payroll_filings`. Each names the columns carrying financial
substance and leaves the lifecycle columns writable — the permitted set was read out of the
services first (`journal-outbox.service.ts:290,395,431`; `batch-creator.service.ts:313`;
`batch-status.service.ts:114,164,212`; `filings.service.ts:385`), not guessed. Every column
reachable by an `ON DELETE SET NULL` foreign key is excluded on purpose: SET NULL is implemented
as an UPDATE, so guarding `run_id`, `entity_id`, `reversal_of_batch_id`, `created_by` or the
five `*_by_membership_id` columns would make deleting a member, a user, an entity or a period
fail against a posted batch.

**`payroll_tds_ytd_ledger` is deliberately excluded and that is a finding.** The obvious guard,
0445's own `payroll_run_is_locked(run_id)`, would break run locking:
`locking.service.ts` sets `payroll_runs.status = 'LOCKED'` at **:145** and then upserts the
ledger at **:244** and **:308** in the same transaction, so the run is already locked when the
`ON CONFLICT DO UPDATE` branch fires on a re-lock. Narrowing to PAID/PUBLISHED/CLOSED avoids that
but then blocks an adjustment run writing the same `(org, subject, fiscal_year, period_key)` key
after the regular run is paid. Which of those is correct is a payroll decision. **Open.**

### 1002 — payroll read-path indexes (coordinator item 2)

`payroll_run_employees (org_id, run_id, status)`, `payroll_runs (org_id, entity_id, month, id)`,
`payslip_publications (org_id, user_id, status)`. The first two strictly subsume
`idx_payroll_run_employees_org_run` and `idx_payroll_runs_org_entity`, which are dropped in the
same file so the prefix-redundancy count stays at zero.

### 1003 — residual duplicate keys (S14/S15 completion)

Nine tables carried **two** unique constraints over the identical `(tenant, id)` pair under two
names. The survivor in each pair is the one composite FKs already point at, read from
`pg_constraint.conindid` — 50 dependants for `business_parties`, 8 for `workers`, 3 each for
`party_contacts`/`custom_field_definitions`/`legal_entities`, 2 each for
`organization_people`/`portal_memberships`/`principal_groups`, 1 for `user_delegations`. The
dropped member has zero dependants in every case. Eight of the nine dropped members were
undeclared in Drizzle, which is why 0999's pass did not see them; `user_delegations` is the one
where the survivor was the undeclared member, so its declaration moved to
`uniq_user_delegations_org_id`.

Plus the six prefix-redundant indexes the fixed parser found: `(org_id, date)` against
`(org_id, date DESC, id DESC)` on `payments`, `vendor_payments`, `fin_exchange_rates`,
`fin_bank_transactions`, `fin_bank_transfers`, `fin_reconciliation_rules`. A btree scans in
both directions, so the wider index serves every predicate and ordering the narrower one can.

Nothing was dropped for looking unused. `pg_stat_user_indexes` on a bootstrapped database
measures the bootstrap; every row is either bit-identical to a survivor or answerable from a
wider one by definition of a btree.

### 1005 — P0: `feedbucket` has no `modules_catalog` row, so no organisation can be created

Handed up by ticket 19 mid-session and landed here because `migrations/` is this territory.
Commit `600b9b7c` registered `feedbucket` as `planGated: true, ladder: "delegable"`, which puts it
in `MODULE_ADMIN_MODULES`, so `seedSystemRolesForOrg` mints `FEEDBUCKET_MODULE_ADMIN` with
`roles.module_key = 'feedbucket'`. Migration 0634 gave that column a foreign key to
`modules_catalog.module_key` and no migration ever inserted the row, so the seeder raises `23503`
**inside `createOrganization`'s transaction** (`org-profile.service.ts:366`) and the whole
organisation rolls back.

Ticket 19's statement was used unchanged. Re-checked against the live catalog before landing: the
seven columns match `information_schema` exactly, `sort_order` 13 is free (`timesheets` holds 12,
`notifications` jumps to 90), `is_core` is false (feedbucket is not one of the nine platform-core
modules) and `is_paid_only` is false because that column marks the two paid-only modules
(`inventory`, `payroll`) rather than plan-gating — `support` and `surveys` are both
`planGated: true` and both sit at `is_paid_only = false`.

Proven two ways, not assumed:

    jest --testPathPattern="seeded-role-modules-are-catalogued"    exit 0, 2/2
      (the gate ticket 19 left deliberately RED on exactly this offender)

    INSERT INTO roles (org_id, name, slug, module_key, is_system)
      VALUES (..., 'FEEDBUCKET_MODULE_ADMIN', 'feedbucket', true);
    -> PASS: roles row with module_key=feedbucket accepted   (was 23503)

The rollback refuses to run while any `roles` row still points at the module, so reverting cannot
leave a dangling `module_key`.

### 1004 — forward correction to 0445: its guards block an organisation purge

Writing 1001 surfaced a live defect in applied history. `cron-org-purge-worker.service.ts:241`
deletes the organisation row and relies on `org_id ON DELETE CASCADE`;
`payroll_run_employees` and `payroll_line_items` are reached that way **while their
`payroll_runs` parent is still present**, so `payroll_run_is_locked(run_id)` is still true and
0445's `BEFORE DELETE` raises. Reproduced verbatim on `scratch_t08`:

    DELETE FROM organizations WHERE id = '<org with a PAID run>'
    ERROR:  payroll_run_employees row 2 is immutable while run 3 is locked
    CONTEXT:  PL/pgSQL function guard_locked_payroll_run_employee() line 5

0445's header claims safety because "a cascading delete of the run itself finds no row" — true of
a cascade *from the run*, false of a cascade from the organisation, which reaches child and run
as siblings. 1004 adds the organisation-presence test. UPDATE behaviour is unchanged (an update
always sees its organisation), so the locked-run rule is exactly as strict as before.

My first draft of 1001 had the same class of bug in two of its own guards and was caught the
same way, by the delete failing on a scratch database rather than by reasoning. The escape hatch
now covers every cascading parent.

---

## 4. Before / after

Measured on `scratch_t08` at 646 migrations, then on the independent cold build `scratch_t08b`
at 650. Both derived from `pg_index`/`pg_constraint`, not from a report.

| | before | after |
|---|---:|---:|
| indexes (`public` + `build` + `build_events`) | 4,745 | 4,731 |
| exact-duplicate index groups | 9 | **0** |
| prefix-redundant indexes | 6 | **0** |
| `ON DELETE CASCADE` → `organizations.id` with no leading index | 0 | 0 |
| enum types used by no column | 3 (intentional) | 3 (intentional) |
| foreign keys | 3,150 | **3,150** (none removed) |
| unique constraints | 959 (derived: 950 + the 9 dropped) | 950 (measured) |
| payroll tables with a DB-level immutability trigger | 2 | **7** |
| `modules_catalog` rows (`feedbucket` missing → present) | 19 | **20** |
| `check:tenant-indexes` declaration mode | 821 / 828 · exit 1 | **829 / 829 · exit 0** |
| `check:tenant-indexes --db` | 988 / 988 · exit 0 | 988 / 988 · exit 0 |
| journal entries | 646 | 651 |

---

## 5. Gates — command, exit code, number

Everything below was executed and its output read. `$SCR` is `scratch_t08b`.

| command | exit | number |
|---|---:|---|
| `node src/scripts/db-bootstrap.mjs` (`scratch_t08`, cold) | 0 | REACHED_HEAD 646/646, 1027 tables |
| `node src/scripts/db-bootstrap.mjs` (`scratch_t08`, resume) | 0 | REACHED_HEAD 649/649, 3 applied |
| `node src/scripts/db-bootstrap.mjs` (`scratch_t08b`, cold) | 0 | REACHED_HEAD 650/650, 1027 tables |
| `node src/scripts/db-bootstrap.mjs` (`scratch_t08b`, resume) | 0 | REACHED_HEAD 651/651 |
| `node src/scripts/db-bootstrap.mjs` (`scratch_t08c`, cold) | 0 | REACHED_HEAD 651/651 |
| `jest --testPathPattern="seeded-role-modules-are-catalogued"` | 0 | 2 / 2 — ticket 19's deliberately red gate is now green |
| `pnpm check:migration-discipline` | 0 | 651 files, 0 new violations |
| `pnpm check:migration-chain` | 0 | chain verified, no issues |
| `pnpm check:migration-ledger` | 0 | no orphan/duplicate/unreachable entries |
| `pnpm check:migration-rollback` | 0 | 651 scanned, all type-name checks passed |
| `pnpm check:tenant-indexes` | 0 | 829 / 829 |
| `pnpm check:tenant-indexes --db` | 0 | 988 / 988 (pg_catalog) |
| `pnpm check:tenant-relationships` (pg_catalog, $SCR) | 0 | zero actionable single-column tenant FKs |
| `pnpm db:verify-rls` | 0 | RESULT: RLS VERIFIED |
| `pnpm check:drop-column-safety` | 0 | 651 files, 126 dropped columns, 0 still declared |
| `pnpm check:restrict-fks` | 0 | clean |
| `pnpm check:set-null-column-lists` (`SET_NULL_GATE_DATABASE_URL=$SCR`) | 0 | 561 declared / 258 needing a list / 796 catalog, both halves OK |
| `pnpm check:openapi-coverage` | 0 | all coverage gates passed |
| `pnpm check:contract-breaking-change` | 0 | no breaking changes |
| `pnpm check:hr-table-freeze` | 0 | clean |
| `pnpm check:kebab-case` | 0 | clean |
| `pnpm typecheck` (through `heavy.sh`) | 0 | 0 errors |
| `pnpm check:spec-typecheck` (through `heavy.sh`) | 0 | spec-inclusive typecheck passed |
| `jest --runInBand --testPathPattern="migration-integrity\|schema-relations\|support-workspace\|automation\|payroll-transitions\|set-null-column-lists"` | 0 | 37 suites, 362 tests, 0 failing after the spec update in §7 |
| `psql -f trigger-proof.sql` (`scratch_t08b`) | 0 | 8 / 8 assertions |

**Not green, not mine:** `check:file-sizes` exits 1 on four files —
`ai-gateway-runner.helper.ts` (527), `cron-hr-retention.service.ts` (504),
`gdpr-subject-erasure.service.ts` (653), `storage.service.ts` (509). None is under
`src/db/schema` and none was touched here.

**Ticket 19's `check:migration-discipline` exit 1 was a race, not a defect.** It ran while `1001`
and `1002` existed on disk and their `_journal.json` entries had not yet been written, so it
correctly reported two `no-journal` violations against a half-written change. Re-run at rest:
**exit 0, 651 files, 0 new violations**, and `check:migration-chain` and `check:migration-ledger`
agree against `scratch_t08b`.

**One number needs its context:** `pnpm check:tenant-relationships` with **no** database URL
falls back to static parsing and prints `FAIL — 627`. That is the documented fallback mode, not
the gate's answer. Its primary pg_catalog mode against `scratch_t08b` is **exit 0, zero
actionable**; the same gate against `scratch_boot_c` (an older catalog) reports 4 — the credit-note
FKs migration 0995 fixed. My changes add and remove no foreign key, so the FK population is
identical before and after.

---

## 6. Behavioural proof of the triggers

Fixtures built on `scratch_t08b` (one org, a POSTED journal batch and line, a SENT bank batch
and item, a submitted filing), then dropped. All eight assertions passed:

1. rewriting `payroll_journal_batches.total_debits` on a POSTED batch — **blocked** (23514)
2. `status='REVERSED'` + `reversed_*` + `reconciliation_*` on the same batch — **accepted**
3. UPDATE and DELETE of `payroll_journal_batch_lines` under a posted batch — **both blocked**
4. rewriting `payroll_bank_batches.total_amount` after SENT — **blocked**; `file_key` + `status='PAID'` — **accepted**
5. rewriting `payroll_bank_batch_items.amount` — **blocked**; the paid transition (`status`, `paid_at`, `transaction_ref`) — **accepted**
6. rewriting `payroll_filings.payload` after submission — **blocked**; `acknowledgement_ref` + `status_label` — **accepted**
7. deleting an `organization_members` row that a POSTED batch's `posted_by_membership_id` points at — **accepted**, column set to NULL
8. `DELETE FROM organizations` — **cascades cleanly through all five new guarded tables and 0445's two**; 0 rows left in each

Assertion 8 is the one that failed before 1004 existed.

---

## 7. Files changed

Backend, `src/db/schema/**` (my territory):

- `build/ticket-releases.ts`, `build/ticket-collaboration.ts`, `build/ticket-integrations.ts`, `build/ticket-core.ts`, `crm/deals-territories.ts`, `common/auth.ts` — the seven anchor declarations
- `support/support-workspace.ts` — `support_ticket_tags` declaration now matches `pg_constraint`
- `common/auth-delegations.ts` — anchor renamed to the surviving constraint
- `payroll/runs.ts`, `payroll/payslip-publications.ts` — the three read-path indexes
- `crm/invoicing.ts`, `accounting/accounting-core.ts`, `accounting/finance-banking.ts` — six prefix-redundant index declarations removed

Backend, `migrations/**` (my territory): `1001`–`1004` + four `rollback/*.down.sql` +
`meta/_journal.json` (append-only, +28 lines, no existing entry renumbered).

**Outside my territory — three files, flagged deliberately.** Declaring `org_id` on
`support_ticket_tags` makes it required at the boundary, which is the point; leaving the callers
red was the alternative:

- `src/modules/support/core/support-workspace.service.ts` — `attachTag` passes `orgId`
- `src/modules/automation/automation.service.ts` — `support_add_tag` passes `orgId`
- `src/modules/automation/automation.service.spec.ts` — three assertions on the insert payload now expect `orgId`; the spec's own subject is cross-org tag isolation, so asserting the tenant is a strengthening

---

## 8. Ticket boxes

| box | state |
|---|---|
| 1 — removal evidence | closed. Every drop is a duplicate or strict-prefix relationship derived from `pg_index`/`pg_constraint`, with FK dependants counted from `conindid`. No index was dropped for looking unused. |
| 2 — schema-file deletion bar | closed vacuously and deliberately: **no schema file was deleted.** The `hrms-phase1-sql-managed` set and `communication_backfill_issues` were both re-confirmed as unimported-by-design. |
| 3 — redundant single-column FKs | **PARTIAL.** Done where the catalog had already converged: `support_ticket_tags`' two dead `.references()` are gone. The remaining **171** single-column FKs that sit beside a composite twin are listed in §9 and not executed — they span CRM, HR, inventory and accounting service code. |
| 4 — unused request/DTO/Zod fields as one contract change | **not in this territory.** No DTO or Zod schema was touched; `check:contract-breaking-change` and `check:openapi-coverage` are both exit 0. |
| 5 — removed field proven at the boundary | closed for the one field this ticket moved. `support_ticket_tags.orgId` is `notNull()`, so both insert sites are compile-enforced, not silently stripped — the opposite of the `addWatcher` defect. |
| 6 — regenerate, re-prove chain/ledger/bootstraps/catalog/RLS/indexes/OpenAPI | closed. §5. Two independent cold bootstraps, both REACHED_HEAD. |
| 7 — before/after counts, zero unclassified keys | closed for the mechanical families (§4): duplicates 9→0, prefix-redundant 6→0, S16 0, S23 3-intentional. **Not** zero unclassified overall: 171 overlapping FK pairs, 32 undeclared tenant columns and the 105-table S07 set remain classified-but-unexecuted. |

## 9. Handed on

0. **The other half of the feedbucket P0 is still open, outside this territory.** 1005 makes the
   organisation creatable. It does not decide whether `feedbucket` — `route: null`,
   `productKey: null` — should carry `ladder: "delegable"` at all, which is ticket 19's alternative
   fix and lives in `src/common/rbac/module-registry.ts`. Report 07's P12 separately records that
   `feedbucket` is plan-gated and billable but absent from `ORG_MODULE_KEYS`, so org setup still
   cannot enable it. Both are product decisions on the same module.
1. **32 tables with a live `org_id` the Drizzle declaration omits** (§2). Each needs its insert sites to pass `orgId`. Cross-module.
2. **171 single-column FKs beside a composite twin.** Regenerate with the `audit2.mjs` shape in this report; every one needs its `.references()` removed from a module-owned schema file and its delete action checked against the composite's.
3. **`payroll_tds_ytd_ledger` immutability** — needs a payroll decision on the adjustment-run path (§3).
4. **0445's defect is fixed forward by 1004**, but any *other* `BEFORE DELETE` guard added in future must carry the same organisation-presence escape hatch or it will break `cron-org-purge-worker`.
5. **`check:tenant-relationships` fallback mode** prints 627 when no DB URL is set, which reads as a hard failure in CI. Wiring `TENANT_RELATIONSHIP_DB_URL` to a bootstrapped scratch database would make the gate say what it means.
