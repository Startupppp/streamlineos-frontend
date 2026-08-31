# Cold-path RLS gap — adjudication report

**Lane:** Q1 · **Date:** 2026-08-31

---

## Verdict

The original audit claim — "0591 cold-path RLS gap (122 accounting tables)" — was **valid when raised and is now CLOSED** for its stated scope. The fix is migration `0489_chain_creates_early.sql`, which lifts the table-creation DDL to before migration 0591 in the journal. All 80 tables in 0591 are confirmed created by migrations 0000, 0208, 0267, 0476, and 0489, each of which appears at an earlier array position than 0591 (array_pos 322–324).

**However, a new cold-path gap was introduced when seven missing journal entries were re-added.** One tenant table — `inv_compliance_documents` — is created by migration 0669 (array_pos 409) but the migrations that enable RLS on it (0666 at array_pos 407, 0677 at array_pos 390) both run *before* the table exists. On a cold build the bootstrap continues past each failed statement, creating the table without RLS or a policy. The live database shows this table as covered (817/817) because the live apply sequence was not cold; the gap is cold-path only.

---

## Evidence

### Part A — 0591 gap: root cause and fix

**Root cause (historical).** Migration 0591 (journal idx 323, array_pos 324) tried to `ENABLE ROW LEVEL SECURITY` on 80 tables. Many of those tables — `ap_allocations`, `ap_document_lines`, `gl_accounts`, `gl_journals`, `bank_statements`, etc. — were only created by migration 0619 (array_pos 340), which runs *after* 0591. On a cold build the bootstrap reported `chain_gaps=124` with every gap in 0591, while still reaching head (the custom bootstrap script continues past statement-level errors).

**Fix.** Migration `0489_chain_creates_early.sql` was inserted at array_pos 322, immediately before 0590 and 0591. It creates all 80 tables that 0591 references. Verified by grep against migrations 0000–0590:

| Table group | Creating migration |
|---|---|
| `acc_*`, `accounting_*`, `fin_*`, `clients`, `contacts`, `credit_notes`, `crm_organizations`, `journal_entries`, `journal_lines`, `leads`, `ledger_accounts`, `vendor_credits`, `workflow_steps` | `0000_light_vance_astro.sql` |
| `workflow_runs` | `0208_workflow_runtime.sql` |
| `record_layout_adjustments` | `0267_record_layout_adjustments.sql` |
| `notification_read_watermarks` | `0476_notification_read_watermark.sql` |
| `ap_*`, `ar_*`, `bank_*`, `gl_*`, `subprocessor_subscribers`, `tax_*` | `0489_chain_creates_early.sql` |

All 80 tables: CREATE TABLE confirmed in a migration numbered lower than 0591. None are missing.

**Verification.** PRD-IN-SCOPE.md §31 (updated 2026-08-30): cold bootstrap on a disposable Neon branch reached head at 387/387 with 864/864 tenant tables carrying RLS, and `check:migration-chain` passed. Issue 33 acceptance criterion for `differences=0` is ticked.

**The "122" figure.** The original ticket mischaracterised the gap as "122 accounting tables." The actual gaps were 124–130 statement failures in 0591, spread across accounting (31 tables), CRM (19 tables), customer lifecycle, subprocessors, and autonomy tables — CRM was the largest single family, not accounting. The number also shifted as the repair migrated: 130 → 124 → 0.

---

### Part B — New cold-path gap: `inv_compliance_documents`

**How it was introduced.** Seven journal entries that had been applied to the live database but never committed to the repository were re-added to `meta/_journal.json`. Among them: `0666_rls_missing_tables` (array_pos 407, idx 514, when 1798000013000) and `0669_chain_creates_inv_compliance_documents` (array_pos 409, idx 516, when 1798000015000). A third entry, `0677_rls_fix_guc_key` (array_pos 390, idx 393, when 1788091264000), was already present and runs before both.

**Cold-build sequence:**

| array_pos | Migration | Action on `inv_compliance_documents` | Result |
|---|---|---|---|
| 390 | 0677 | `DROP POLICY IF EXISTS` + `CREATE POLICY` | **FAILS** — table does not exist |
| 407 | 0666 | `ENABLE ROW LEVEL SECURITY` + `DROP POLICY` + `CREATE POLICY` | **FAILS** — table does not exist |
| 409 | 0669 | `CREATE TABLE IF NOT EXISTS inv_compliance_documents (...)` | **Creates table — no RLS, no policy** |

The bootstrap continues past each failing statement. Final state on a cold build: the table exists with `org_id NOT NULL`, grants from `ALTER DEFAULT PRIVILEGES` make it readable by `streamline_app`, but RLS is off and no policy exists. Any authenticated query can read every org's compliance documents.

**Scope.** 1 table. The live database has this table covered (0666 applied successfully there because the live sequence was not cold). `db:verify-rls` on the live database reports 817/817.

**Table schema (from 0669):**

```
inv_compliance_documents (
  id serial PRIMARY KEY,
  org_id text NOT NULL,
  kind text NOT NULL,
  source_type text NOT NULL,
  source_id text NOT NULL,
  document_number text NOT NULL,
  payload_hash text NOT NULL,
  ...
)
```

---

## Uncovered-on-cold table list

**Count: 1**

| Table | org_id? | Created by | RLS attempted by | Gap |
|---|---|---|---|---|
| `inv_compliance_documents` | NOT NULL | 0669 (array_pos 409) | 0666 (array_pos 407) — before table exists | RLS never enabled on cold build |

---

## Idempotent SQL (ready for orchestrator to number)

```sql
-- Repair: inv_compliance_documents — enable RLS after the table is created.
-- 0669 creates the table; 0666 and 0677 tried to protect it before it existed.
-- This migration is safe on the live database (ENABLE is a no-op when already on;
-- DROP POLICY IF EXISTS is a no-op when the policy exists; GRANT is idempotent).
-- On a cold build it fills the gap left by 0666 failing at array_pos 407.

SET lock_timeout = '5s';
--> statement-breakpoint
ALTER TABLE inv_compliance_documents ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON inv_compliance_documents;
--> statement-breakpoint
CREATE POLICY tenant_isolation ON inv_compliance_documents
  FOR ALL USING (org_id = app.current_org_id())
  WITH CHECK (org_id = app.current_org_id());
--> statement-breakpoint
REVOKE ALL ON inv_compliance_documents FROM PUBLIC;
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON inv_compliance_documents TO streamline_app;
```

**Placement:** journal array after 0669 (array_pos 409, when > 1798000015000). This migration must be numbered higher than 0669 so it appears later in the journal.

**Live-DB safety:** On the control plane, `inv_compliance_documents` already has RLS enabled (from 0666 which succeeded there). `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` is idempotent. `DROP POLICY IF EXISTS` is safe. `GRANT` is idempotent. `REVOKE ALL FROM PUBLIC` on a table that PUBLIC already has no explicit grants on is a no-op.

---

## Verification method — journal-only, no cold build required

Parse `meta/_journal.json` in array order. For each entry, read the corresponding `.sql` file. Maintain a set `created_tables`. For each `CREATE TABLE [IF NOT EXISTS] <name>` statement (with or without double-quotes), add `name` to `created_tables`. For each `ALTER TABLE <name> ENABLE ROW LEVEL SECURITY` statement, check `name` is already in `created_tables`. Report any violation as a cold-path gap.

Additionally, for every table in `created_tables` that has an `org_id` column in its DDL, verify that some later-or-same array-position migration emits `ENABLE ROW LEVEL SECURITY` for that table. Tables that are created but never protected are gaps. This scan works entirely from the committed migration files and catches the class of error found here without needing a live or cold database.

---

## Disposition of audit sub-claims

| Sub-claim | Verdict |
|---|---|
| "0591 cold-path gap exists" | CLOSED — fixed by 0489 |
| "122 accounting tables uncovered" | STALE LABEL — the count was 124–130 statement gaps (not tables), spread across accounting, CRM, and other domains; all closed |
| "Cold build would provision an unprotected cell" | WAS TRUE, NOW FALSE for the 0591 scope |
| New gap found: `inv_compliance_documents` | OPEN — introduced by the seven-entry re-add; 1 table uncovered on cold build |
