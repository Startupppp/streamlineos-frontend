# 08b — Closing ticket 08's two PARTIAL boxes

Follow-up to `reports/08-execute-schema-key-minimization.md`. Backend repo only.
Territory: `src/db/schema/**`, `migrations/**`, plus the minimum caller changes a
declaration change forces.

Scratch databases: **`scratch_t09`** (cold build at 651, then resumed to 652) and
**`scratch_t09_cold`** (an independent cold build from zero at the new head, 652/652,
then used for the rollback round-trip and every behavioural proof).
`scratch_t08*`, `scratch_t03`, `scratch_boot_*`, `scratch_perf_seed`, `scratch_ai_latency`,
`DATABASE_URL` and every `cornerstone_*` were left untouched. No connection string appears here.

---

## 0. What the numbers actually were

Ticket 08 handed on "32 undeclared tenant columns" and "171 single-column FKs beside a
composite twin". Re-derived from `pg_constraint` / `pg_attribute` on a freshly bootstrapped
`scratch_t09`, against a parser that resolves `build.table(...)` as well as `pgTable(...)`:

| | ticket 08 said | measured at head | after this pass |
|---|---:|---:|---:|
| live tenant column absent from the Drizzle declaration | 32 | **32** (confirmed exactly) | **22** |
| single-column FK sitting beside a live composite twin | 171 | **169** | **153** |
| total foreign keys | 3,150 | 3,150 | **3,134** |

The 169-vs-171 delta is a definition difference, not a disagreement about the catalog: I count a
pair only when the single-column FK's child column is *the same column* the composite carries
alongside the tenant column, and only when both constraints name the same parent. Every number
below comes from that definition, applied to a live catalog.

**A third population ticket 08 did not count, and it is the largest clean win.** Ticket 08 fixed
`support_ticket_tags`' "two dead `.references()` that migrations had already dropped from the
catalog" but never generalised it. Scanning all 1,393 declared `.references()` against the
catalog found **97 declarations with no live single-column FK at all**. Splitting those by whether
a composite twin covers the same relationship:

- **27 are dead declarations a composite already covers** — remove the declaration, no migration.
- **70 are a different defect**: a declared FK with neither a live single nor a live composite.
  Those are *not* redundant, they are missing, and removing the declaration would hide a gap.
  Classified in §5, not touched.

---

## 1. Scope actually executed

CRM and inventory are excluded from this release, and I applied that exclusion to **both** tasks,
because declaring a `notNull` `org_id` on a CRM or inventory table forces every one of its insert
sites — all of which live in CRM or inventory module code — to start passing `orgId`. There is no
version of task 1 for those 22 tables that does not edit their module code.

**HR has nothing to do for task 2, and that is a measured finding, not an omission.** The brief
expected "HR and accounting as the in-scope bulk". Against the catalog, `hr_*` has **130**
tenant→tenant foreign keys and `payroll_*` has **48**, and *every one of them is already
composite* — zero single-column FKs to a tenant parent in either prefix. HR converged before this
ticket. The task-2 bulk that remained outside CRM/inventory is accounting (7) plus one FK each in
support, billing, build, chat and surveys.

| population | total | in scope | executed | left (all CRM/inventory) |
|---|---:|---:|---:|---:|
| task 1 — undeclared tenant column | 32 | 10 | **10** | 22 |
| task 2A — dead `.references()`, composite covers | 27 | 17 | **17** | 10 |
| task 2B — live single-column FK beside a composite | 169 | 16 | **16** | 153 |

---

## 2. Task 1 — ten tenant columns declared

`hr_workflow_steps`, `email_sequence_steps`, `email_sequence_enrollments`,
`vendor_candidate_submissions`, `onboarding_template_steps`, `key_results`, `competencies`,
`hr_import_rows`, `support_ticket_messages`, `sign_bulk_send_rows`.

All ten already carried `org_id text NOT NULL`, an `org_id -> organizations` cascade, a
`uniq_<table>_org_id UNIQUE (org_id, id)` anchor and their composite parent FKs in the live
catalog — the declaration was the only thing lagging, so **no migration was needed for task 1**.
Each declaration now names `orgId`, the anchor, and every composite `pg_constraint` reports for
that table, including two the catalog carries with an explicit `ON DELETE SET NULL (col)` column
list (`vendor_candidate_submissions.job_posting_id`, `sign_bulk_send_rows.envelope_id`).

`check:tenant-indexes` declaration mode moved **829/829 → 839/839**, exit 0 both times: the ten
tables became visible as tenant tables and each already declares its leading tenant index.

### The callers, and why this is not cosmetic

All ten relied on the `set_org_id_from_parent` (`trg_set_org_id`) trigger to supply the tenant
from the parent FK. Twelve insert sites now pass `orgId` explicitly, so the write is tenant-scoped
in code rather than by trigger — and, more importantly, the composite FK now **rejects** a
cross-tenant parent id instead of silently writing the row into the parent's organisation.
Proven on `scratch_t09_cold`, not reasoned:

    INSERT INTO support_ticket_messages (org_id, ticket_id, body)
      VALUES ('org_m1', <a ticket owned by org_m2>, 'leak');
    -> T1 PASS: refused, 23503, by fk_support_ticket_messages_ticket_id_org

That path is reachable from `automation.service.ts`'s `support_internal_note` action, which takes
a ticket id from an automation payload. Before this change the trigger would have written the note
into the *other* organisation's ticket.

Two callers got their tenant filter as well as their tenant value, because the statement is the
same one and leaving it unscoped beside a newly-declared `org_id` would be worse than before:
`upsertSteps` in `hr-workflow-definitions.service.ts` and the step replacement in
`recruitment-automation.service.ts` now delete `WHERE org_id = ? AND <parent>_id = ?`.
A stale comment in `recruitment-automation.service.ts` asserting that
"`email_sequence_enrollments` has no `org_id`" was corrected rather than left to mislead; the
enumeration guard it documents is untouched.

---

## 3. Task 2 — migration 1006, sixteen redundant constraints

`migrations/1006_s09_drop_redundant_single_column_tenant_fks.sql`, rollback at
`migrations/rollback/1006_…down.sql`, journal `idx` 783 / `when` 1803000010102 (unique, strictly
increasing, above the 2027-02-19 watermark; no existing entry renumbered). Hand-authored;
`drizzle-kit generate` was not used. Modelled on 0995, which is the same repair for four
constraints.

**Every pair was verified LIVE in `pg_catalog`, table by table, before removal** — the composite
twin and its exact `pg_get_constraintdef` were read for all sixteen. None was removed on the
strength of a declaration or a report.

### Eight where the actions already matched — dropped outright

`credit_notes.client_id`, `fin_collection_activities.client_id`, `fin_payment_run_items.vendor_id`,
`fin_recurring_bill_templates.vendor_id`, `fin_recurring_invoice_templates.client_id`,
`vendor_credits.vendor_id`, `acc_fixed_assets.vendor_id` (all → `clients`), and
`support_tickets.client_id`. Single and composite were both NO ACTION, so parent-delete behaviour
after the drop is bit-identical.

### Eight where the actions diverged — the action was MOVED onto the composite first

This is the part that makes the removal safe rather than cosmetic. Dropping a `SET NULL` twin
while the composite says NO ACTION does not tidy anything: it converts "clear the pointer" into
`23503` on every parent delete. Dropping a `CASCADE` twin the same way turns a cascading delete
into a refusal.

| child | composite now carries |
|---|---|
| `support_vip_clients.client_id` → `clients` | `ON DELETE CASCADE` |
| `chat_channels.linked_deal_id` → `deals` | `ON DELETE SET NULL (linked_deal_id)` |
| `enterprise_quotes.deal_id` → `deals` | `ON DELETE SET NULL (deal_id)` |
| `enterprise_quotes.client_id` → `client_accounts` | `ON DELETE SET NULL (client_id)` |
| `build.projects.deal_id` → `deals` | `ON DELETE SET NULL (deal_id)` |
| `survey_participants.contact_id` → `contacts` | `ON DELETE SET NULL (contact_id)` |
| `survey_participants.lead_id` → `leads` | `ON DELETE SET NULL (lead_id)` |
| `survey_participants.client_id` → `client_accounts` | `ON DELETE SET NULL (client_id)` |

Every SET NULL composite carries an **explicit column list naming only the nullable pointer
column**. `org_id` is NOT NULL on all six tables, so a bare composite SET NULL would try to null
the tenant column and raise `23502` on every parent delete — ticket 03's defect, 0770's sweep and
0992's repair. `check:set-null-column-lists` catalog half confirms all 267 column lists match.

The migration ends with a `DO $$` block that RAISEs if any of the sixteen single-column names
survived, if any of the sixteen composites is missing, unvalidated, or is a SET NULL with either
no column list or a NOT NULL column in it.

---

## 4. Behavioural proof, including the org purge

Ticket 08's warning: 0445's `BEFORE DELETE` guards blocked `cron-org-purge-worker` because an
organisation purge reaches a child while its parent is still present, and it was found by running
the purge rather than by reading. **This migration adds and alters no trigger**, but the same
discipline applies to a referential action, so the purge was run.

Fixture on `scratch_t09_cold`: one organisation with a client, lead, client account, contact, deal
and a row in each of the sixteen affected tables. Five assertions, all PASS:

1. **A1** — `DELETE FROM deals` clears `chat_channels.linked_deal_id`, `enterprise_quotes.deal_id`
   and `build.projects.deal_id`, and leaves `org_id` intact. This is the assertion a bare
   composite SET NULL would fail with `23502`.
2. **A2** — deleting the contact, lead and client account clears all four
   `survey_participants` / `enterprise_quotes` pointers, tenant column intact.
3. **A3** — `DELETE FROM clients` still cascades `support_vip_clients` away, now through the
   composite. This is the assertion that fails if a `CASCADE` twin is dropped without moving it.
4. **A4** — inserting a *different organisation's* `client_id` into `support_vip_clients` is now
   refused with `23503`. Before the change the single-column FK accepted it.
5. **A5 — the organisation purge.** `SELECT app.nullify_audit_logs_org_id(...)` then
   `DELETE FROM organizations WHERE id = …`, exactly what `cron-org-purge-worker.service.ts:241`
   issues. It **cascades cleanly through all sixteen affected tables plus `build.projects`,
   0 rows left in each**. No `BEFORE DELETE` guard is reached and no referential action blocks it.

Plus the two task-1 assertions in §2 (T1 cross-tenant refusal, T2 explicit tenant stored).

**Rollback proven as a round trip, not just as a file that parses:**

    FKs at head                      3,134
    apply 1006 down                  3,150   (all 16 singles restored, 8 composites back to NO ACTION)
    delete the ledger row, re-apply  3,134   (REACHED_HEAD 652/652)

---

## 5. Gates — command, exit code, number

Target for every `--db` gate is `scratch_t09_cold`, the independent cold build.

| command | exit | number |
|---|---:|---|
| `node src/scripts/db-bootstrap.mjs` (`scratch_t09`, cold from zero) | 0 | REACHED_HEAD 651/651 |
| `node src/scripts/db-bootstrap.mjs` (`scratch_t09`, resume with 1006) | 0 | REACHED_HEAD 652/652 |
| `node src/scripts/db-bootstrap.mjs` (`scratch_t09_cold`, **cold from zero at the new head**) | 0 | REACHED_HEAD 652/652 |
| `node src/scripts/db-bootstrap.mjs` (`scratch_t09_cold`, re-apply after rollback) | 0 | REACHED_HEAD 652/652 |
| `pnpm check:migration-discipline` | 0 | 652 files, 0 new violations |
| `pnpm check:migration-chain` | 0 | chain verified, no issues; watermark 1803000010102 |
| `pnpm check:migration-ledger` | 0 | 652 applied vs 652 journal, 0 pending, no orphans |
| `pnpm check:migration-rollback` | 0 | 652 scanned, all type-name checks passed |
| `pnpm check:tenant-indexes` (declaration) | 0 | **839 / 839** (was 829/829) |
| `pnpm check:tenant-indexes --db` (pg_catalog) | 0 | 988 / 988 |
| `pnpm check:tenant-relationships` (pg_catalog) | 0 | **0 actionable**; 216 single-col FKs, 79 EXCL:CRM, 136 EXCL:Inventory, 1 EXCL:platform-global |
| `pnpm db:verify-rls` | 0 | RESULT: RLS VERIFIED |
| `pnpm check:drop-column-safety` | 0 | 652 files, 126 dropped columns, 0 still declared |
| `pnpm check:restrict-fks` | 0 | 345 schema files, clean |
| `pnpm check:set-null-column-lists` | 0 | 561 declared / **267** needing a list (was 258) / 796 catalog; both halves OK |
| `psql -f purge-proof.sql` (`scratch_t09_cold`) | 0 | **5 / 5** assertions incl. the org purge |
| `psql` cross-tenant message proof | 0 | 2 / 2 assertions |
| `jest --runInBand src/db/(fk-type-consistency\|migration-integrity\|tenant-relationship-integrity\|hr-relational-normalization)` | 0 | 4 suites, 48 passed, 1 skipped |
| `jest --runInBand "(automation\|hr/workflows\|hr/recruitment\|hr/onboarding\|hr/import\|hr/performance\|support/core\|e-sign\|surveys\|chat)"` | 0 | **175 suites, 1376 tests, 0 failing** |

`pnpm check:tenant-relationships` with no database URL still falls back to static parsing and
prints `FAIL — 627`. That is the documented fallback, not the gate's answer; ticket 08 already
flagged it and it is unchanged.

### Not green, and not mine — verified against `git status`, not assumed

Three other agents are editing this working tree concurrently. Everything below is in a file
**they** have modified and **I** have not:

- `pnpm typecheck` — **1 error**, `src/modules/finance/ap/payment-run-executor.service.ts(157,17):
  Cannot find name 'newStatus'`. That file is ` M` in `git status` and I never opened it. All
  **12** errors my own declaration changes produced were fixed; a mid-session run showed 9 further
  errors of the form `Property 'x' does not exist on type '{ id: number; }'` in
  `projects-write.service.ts`, `sign-envelope-validation.service.ts`,
  `recruitment-candidate-ai.service.ts` and `kb-pages.service.ts` — the query-path sibling's
  projection narrowing — and those had been fixed by the final run.
- `pnpm check:spec-typecheck` — **exit 2**, two errors, both foreign:
  `payment-run-executor.service.ts(157)` again, and
  `src/db/__tests__/db-call-count-contract.spec.ts(64,40)`, an **untracked new file** (`??`).
- `jest "(accounting|finance|billing|modules/build|…)"` — 265 of 270 suites pass. The 5 failures
  are all `src/modules/billing/core/**` ai-credits suites failing with
  `tx.select(...).from(...).where(...).orderBy is not a function`, against
  `ai-credits-reservation.service.ts` and `ai-credits.service.ts`, both ` M` by another agent.
  My only billing change is two `.references()` removed and two composite `foreignKey`
  declarations added on `enterprise_quotes`; neither can change a mock's method chain.
- `pnpm check:kebab-case` — exit 1 on `src/scripts/.tmp-dcc-lib.mjs`, another agent's temp file.

---

## 6. Files changed

**`src/db/schema/**` (territory):**
`hr/workflow-engine.ts`, `hr/hiring-pipeline.ts`, `hr/offboarding.ts`, `hr/performance.ts`,
`hr/kpis.ts`, `hr/import-jobs.ts`, `support/tickets.ts`, `support/support-productivity.ts`,
`support/agent-routing.ts`, `e-sign/bulk-send.ts`, `accounting/finance-ar-ap.ts`,
`accounting/finance-assets.ts`, `billing/billing.ts`, `build/core.ts`,
`chat/chat-channel-tables.ts`, `surveys/distribution.ts`.

**`migrations/**` (territory):** `1006_s09_drop_redundant_single_column_tenant_fks.sql`,
`rollback/1006_….down.sql`, `meta/_journal.json` (append-only, +1 entry, nothing renumbered).

**Callers — the minimum a `notNull` declaration forces, 9 files, flagged deliberately.**
Two are in `src/modules/support/**`, which another agent holds; both are a single added `orgId`:

- `src/modules/hr/workflows/hr-workflow-definitions.service.ts` — `upsertSteps` takes `orgId`
- `src/modules/hr/recruitment/recruitment-automation.service.ts` — 3 sites
- `src/modules/hr/recruitment/recruitment-vendor-sourcing.service.ts`
- `src/modules/hr/onboarding/core/onboarding-template.service.ts`
- `src/modules/hr/performance/kpis.service.ts`
- `src/modules/hr/performance/performance-goals.service.ts`
- `src/modules/hr/import/hr-import.service.ts`
- `src/modules/e-sign/sign-bulk-send.service.ts`
- `src/modules/support/core/support-ticket-messages.service.ts` — **other agent's territory**
- `src/modules/automation/automation.service.ts` — **support-adjacent**
- `src/scripts/seed-enterprise-workspace.ts`

---

## 7. Handed on

1. **22 undeclared tenant columns remain, all CRM (7) or inventory (15).** Named in report 08 §2.
   Each needs its module's insert sites to pass `orgId`; the shape is exactly the ten done here.
2. **153 single-column FKs beside a composite twin remain: CRM 53, inventory 76, and 24 on
   inventory tables that have no Drizzle declaration at all.** Zero remain outside CRM/inventory.
   Regenerate with the classifier described in §0; the 8-and-8 split (identical action vs. action
   moved onto the composite) is the template.
3. **70 declared `.references()` with neither a live single nor a live composite — a *missing*
   constraint, not a redundant one.** Do not "clean" these by deleting the declaration. Two kinds:
   - **62 actor columns** (`created_by`/`author_id`/`uploaded_by`/`user_id` → `users.id`) whose FK
     the legacy-actor contraction dropped when the column became advisory beside a
     `*_membership_id`. Almost certainly deliberate; the declaration is what is stale.
   - **8 that look like a real gap**, four of them tenant anchors:
     `project_ticket_counters.org_id`, `chat_message_reactions.org_id`,
     `affiliate_commissions.referred_org_id`, `referrals.referrer_org_id`/`referred_org_id`
     declare `-> organizations.id` with nothing in the catalog; plus
     `journal_lines.client_id`/`vendor_id` and `app_installations.installed_by`.
     Each is reached transitively by another cascade today, so the purge is safe, but the
     declaration is a promise the database does not keep.
4. **150 live tables carrying a tenant column have no Drizzle declaration at all** — the `gl_*`,
   `ap_*`, `ar_*`, `bank_*` and `tax_*` accounting kernel (30 tables, the `feat/accounting-module`
   rewrite that migrations create but `main`'s schema never declares), the 54 `notifications_*`
   partitions, and report 07's S07 set. `db.select()` cannot read an undeclared table at all;
   this is the same defect class as the 32, one order of magnitude larger.
5. **`hr_*` and `payroll_*` are fully converged for task 2** — 178 tenant→tenant FKs, all
   composite, zero single-column. Do not re-open them.

---

## 8. Routed in mid-session by the coordinator — three items, all in `migrations/`

### 8a. Migration `1007` — seven indexes `0999` dropped on structure alone

Ticket 20 re-measured `0999`'s 354 index drops on the seeded four-tenant database and found six
genuine regressions already applied. The diagnosis is the important part and it is right:
**prefix containment proves reachability, not cost.** A btree on `(org_id, a, b)` can answer every
predicate a btree on `(org_id)` can, so `0999` called the narrow one redundant — but the surviving
index is physically larger, and for the tenant holding most of the rows the planner costs it above
a sequential scan and takes the scan. `idx_contacts_name_email` is 1,968 kB against a 1,720 kB
heap: an index bigger than the table it indexes.

`1007` restores them. Buffers, dropped → restored, measured per tenant as `streamline_app` inside
a rolled-back transaction:

| table | index | buffers | survivor |
|---|---|---:|---|
| `contacts` | `idx_contacts_org` | 645 → 30 | `idx_contacts_name_email` |
| `inv_stock_levels` | `idx_inv_stock_org` | 609 → 39 | `uniq_inv_stock_levels_natural_key` |
| `hr_people` | `idx_hr_people_org` | 306 → 24 | `uniq_hr_people_org_id` |
| `chat_channel_members` | `idx_chat_channel_members_org` | 108 → 12 | `idx_chat_channel_members_org_membership` |
| `organization_people` | `idx_org_people_org` | 39 → 6 | `uniq_org_people_org_person` |
| `inv_locations` | `idx_inv_locations_org` | 18 → 4 | `uniq_inv_locations_org_id` |
| `inv_stock_transactions` | `idx_inv_txn_org_variant` | 30 → 12 | `idx_inv_txn_org_variant_type_created` |

**The seventh is mine, not ticket 20's, and it surfaced only on the re-run after the first six
were restored.** It is a different shape and is documented as such rather than lumped in: both
plans are index scans, so it is not a sequential-scan fallback but a leaf-density difference —
a 2-column btree against a 17 MB 4-column btree over a 28 MB heap. Flat on all three minority
tenants, like the other six.

`hr_people` already carries `idx_hr_people_org_live (org_id) WHERE deleted_at IS NULL`. A partial
index cannot serve a query that does not repeat its predicate, which is why the unconditional
index is still needed beside it.

All seven declarations were re-added to the schema files `0999` stripped them from, so the
declaration and the catalog agree again.

**The other 347 drops are deliberately NOT reverted**, and ticket 20's own honesty about why is
worth preserving: 7 are confirmed redundant and 319 are simply unqueried by this seed. That is an
absence of evidence, not evidence of safety.

    node test/perf/measure-index-redundancy.mjs --drops=<the 347 remaining>
      -> 347 candidates · 0 REGRESSION            (was 348 · 1, and 354 · 7 before 1007)
    node test/perf/measure-index-redundancy.mjs --self-test
      -> SELF-TEST PASSED — 13/13

### 8b. Migration `1009` — the FK-trigger cost on `inv_stock_transactions`

> **Numbering race, resolved.** Ticket 29 wrote `1009_t29_kb_space_grants_tenant_fk.sql` four
> minutes after my committed `1009_s09_…`, and `check:migration-discipline` went red on
> `[dup-prefix] 1009 is claimed by 2 files`. I began moving **my own** file to 1012 rather than
> renaming theirs mid-flight; the journal guard in my script fired before writing anything,
> because ticket 29 had already renumbered themselves to **1020/1021/1022**. My files are back at
> 1009 and the gate is **PASSED — 658 files, 0 new violations**. Nothing of theirs was touched;
> the only uncommitted change left in `_journal.json` is their three entries, which are theirs
> to commit.

This is the one place I crossed the CRM/inventory exclusion, deliberately and narrowly, because
the coordinator named the table and quantified the cost. It needed no inventory *service* code:
`src/db/schema/inventory/stock.ts` and `migrations/` are both this territory.

`inv_stock_transactions` carried **8** foreign keys where **6** are load-bearing — exactly the
8-vs-6 the coordinator measured. Two child columns are constrained twice against the same parent:

    product_variant_id -> inv_product_variants   single CASCADE  / composite NO ACTION
    location_id        -> inv_locations          single SET NULL / composite NO ACTION

Each FK is a row trigger and a `FOR KEY SHARE` lock on the parent, so a 1,000-row insert fired
8,000 invocations and took 8,000 parent locks where 6,000 suffice — 2,000 redundant of each per
1,000 rows, on inventory's hottest write path. Both actions were MOVED onto the composite, so
behaviour is identical; `location_id`'s composite carries `ON DELETE SET NULL (location_id)` with
an explicit list because `org_id` is `NOT NULL`. **8 → 6 FKs**; total FKs **3,134 → 3,132**.

Four assertions on `scratch_t09_final`, all PASS: variant delete still cascades the movement;
a cross-tenant `product_variant_id` is now refused with `23503`; the organisation purge still
leaves 0 rows; and the location delete behaves *identically to head*.

**A pre-existing defect this surfaced and deliberately did not silently resolve.**
`inv_stock_transactions` carries the `BEFORE UPDATE` guard `inv_stock_transactions_no_restatement()`,
which lists `location_id` among its append-only columns. `ON DELETE SET NULL` is implemented as an
UPDATE, so deleting an `inv_locations` row that any posted movement points at raises

    ERROR: inv_stock_transactions is append-only: location_id cannot be changed
           on posted movement <id>            (23514)

**Reproduced on a database WITHOUT `1009` — this is already true at head**, from the single-column
`ON DELETE SET NULL`. `1009` mirrors the existing action rather than quietly changing it, so it
introduces nothing and fixes nothing here. The organisation purge is unaffected because the guard
is UPDATE-only and the purge DELETEs the row. Resolving it means choosing between `RESTRICT`
(refuse the location delete honestly) and exempting `location_id` from the append-only set — an
inventory ledger decision, not a schema one. **Handed on.**

I did **not** extend this to the other 151 CRM/inventory pairs: the release exclusion stands, and
doing 2 of 153 on the coordinator's specific measurement is defensible where doing 100 arbitrarily
is not.

### 8c. Migration `1008` — hashing the legacy support inbound secrets

Ticket 15d's requirement, verbatim statement, data-only, no DDL. One idempotent `UPDATE` guarded
by `NOT LIKE 'sha256:%'` so a re-run cannot double-hash, with a `DO $$` block that RAISEs if any
plaintext row survives.

The digest matches the application byte for byte — checked, not assumed:
`digest('plaintext-secret-abc','sha256')` in SQL and `hashInboundSecret()` in
`support-inbound-secret.ts` both produce
`sha256:fa744572ad483175bb56860819028a072abb62ebdbc865350d36ab34ccdd1aee`.

Three assertions PASS: a legacy plaintext row is replaced by its digest; an already-`sha256:` row
is untouched (idempotent); a NULL secret stays NULL.

**Irreversible by design.** The down migration RAISEs rather than silently reverting nothing — a
SHA-256 digest is not invertible, and a no-op down that reported success would be worse than
failing. The operational undo is rotation through `PATCH /support/channels/:channelId` with
`rotateInboundSecret: true`, which 15d built for exactly this.

### 8d. Re-proof after all three

| command | exit | number |
|---|---:|---|
| `node src/scripts/db-bootstrap.mjs` (`scratch_t09_final`, **cold from zero**) | 0 | REACHED_HEAD 654/654, then 655/655 with `1009` |
| `pnpm typecheck` | 0 | **0 errors** (the sibling's `payment-run-executor` error was fixed meanwhile) |
| `pnpm check:spec-typecheck` | 0 | spec-inclusive typecheck passed |
| the 11 migration / tenant / RLS gates in §5, re-run at 655 | 0 | all exit 0; tenant-indexes 839/839 declaration, 988/988 catalog |
| `measure-index-redundancy.mjs` (347 candidates) | 0 | **0 REGRESSION** |
| `measure-index-redundancy.mjs --self-test` | 0 | 13/13 |
| `psql -f inv-proof.sql` (`scratch_t09_final`) | 0 | 4/4 |
| `psql` 1008 hashing proof | 0 | 3/3 |
| `jest --runInBand "(src/db/\|modules/support\|modules/inventory\|modules/directory\|modules/chat)"` | 0 | 137 suites, 1251 tests, 11 skipped |

Final counts across both passes: foreign keys **3,150 → 3,132**; undeclared tenant columns
**32 → 22**; single-column FKs beside a composite **169 → 151**; measured index regressions
**7 → 0**; journal **651 → 655** entries.
