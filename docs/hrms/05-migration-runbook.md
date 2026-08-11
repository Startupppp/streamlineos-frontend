# 05 — Migration Runbook (Batch 12)

> **Historical runbook; do not execute as current instructions (2026-08-10).** Its migration/journal status has changed since authorship. The current HRMS-core proposal is `hrms-core-phase-1-expand-contract-plan-2026-08-10.md`; exact SQL and current journal state must be regenerated and reviewed after approval.

**Status: historical snapshot; its journal/application statements must not be treated as current.**

Three migration pairs were authored for Batch 12 (legal entities + effective-dating). Each has a paired `.down.sql` — the first migrations in this repo to have one; 96 of the existing 101 have no rollback at all.

| Forward | Rollback | Depends on |
|---|---|---|
| `0379_legal_entities_create.sql` | `.down.sql` | — |
| `0379_payroll_entities_legal_entity_fk.sql` | `.down.sql` | legal entities created |
| `0379_effective_dating_convention.sql` | `.down.sql` | pre-flight passing |

---

## Why they are not journaled yet

`meta/_journal.json` currently has **104 entries**, last tag `0378_rls_remaining_tenant_tables` — added by a **concurrent session** that is mid-flight on RLS work. Appending entries to that file while another session is also appending is how a migration chain gets corrupted for both parties.

Journaling is therefore an **operator coordination step**, not a code change. Until it happens:

- `db:migrate` will not apply these files.
- A cold rebuild from an empty database will not reproduce them.
- **"Applied to the branch" would not equal "migrated."**

---

## Blocking pre-flight — run before the third migration

`0379_effective_dating_convention.sql` adds `EXCLUDE USING gist` non-overlap constraints. **An exclusion constraint fails outright if existing rows already overlap.** Both queries below must return **zero rows** first.

```sql
-- 1. hr_effective_dated_changes (applied rows only)
SELECT a.id AS row_a_id, b.id AS row_b_id, a.employment_id, a.change_type,
       a.effective_from AS a_from, a.effective_to AS a_to,
       b.effective_from AS b_from, b.effective_to AS b_to
FROM hr_effective_dated_changes a
JOIN hr_effective_dated_changes b
  ON a.employment_id = b.employment_id
 AND a.change_type   = b.change_type
 AND a.id < b.id
 AND a.status = 'applied' AND b.status = 'applied'
WHERE daterange(a.effective_from, COALESCE(a.effective_to, 'infinity'::date), '[)')
   && daterange(b.effective_from, COALESCE(b.effective_to, 'infinity'::date), '[)')
ORDER BY a.employment_id, a.change_type, a.effective_from;

-- 2. hr_reporting_lines (all rows)
SELECT a.id AS row_a_id, b.id AS row_b_id, a.employment_id, a.line_type,
       a.effective_from AS a_from, a.effective_to AS a_to,
       b.effective_from AS b_from, b.effective_to AS b_to
FROM hr_reporting_lines a
JOIN hr_reporting_lines b
  ON a.employment_id = b.employment_id
 AND a.line_type     = b.line_type
 AND a.id < b.id
WHERE daterange(a.effective_from, COALESCE(a.effective_to, 'infinity'::date), '[)')
   && daterange(b.effective_from, COALESCE(b.effective_to, 'infinity'::date), '[)')
ORDER BY a.employment_id, a.line_type, a.effective_from;
```

`COALESCE` is present because the NULL → `'infinity'` backfill has not run yet.

**If either returns rows, do not apply.** Overlapping effective-dated rows are a *data* defect — two salaries effective on the same day — and each must be resolved deliberately. The constraint is what makes that state impossible going forward; it cannot retroactively decide which row was correct.

---

## Application order

1. Coordinate with the concurrent session; confirm the journal is stable.
2. Journal the three migrations in dependency order.
3. `0379_legal_entities_create.sql` — pure expand, new table, no data dependency.
4. `0379_payroll_entities_legal_entity_fk.sql` — adds a **nullable** FK. Not `NOT NULL`; the duplicated `payrollEntities` columns are **not** dropped (that is a later contract step).
5. **Run both pre-flight queries. Zero rows required.**
6. `0379_effective_dating_convention.sql`.
7. Verify with row counts before and after; then test the rollback on a copy.

---

## Known inconsistency until step 6 runs

`hr/core-people.ts` now declares `effectiveTo` as `.notNull().default(sql\`'infinity'::date\`)` on both `hrEffectiveDatedChanges` and `hrReportingLines`, but the **database column is still nullable**. The TypeScript types therefore assert something not yet true.

Reads are unaffected (Drizzle does not enforce nullability at runtime), but any code newly written against these types may assume a non-null value that a legacy row does not have. Either apply the migration promptly or treat `effectiveTo` defensively until it lands.

---

## Reversibility

| Step | Reversible? |
|---|---|
| `CREATE TABLE legal_entities` | Yes — `DROP TABLE CASCADE` |
| Nullable `legal_entity_id` FK on `payroll_entities` | Yes |
| `EXCLUDE` constraints | Yes — `DROP CONSTRAINT` |
| `btree_gist` extension | Yes, but leave it |
| **`effective_to` NULL → `'infinity'` backfill + `SET NOT NULL`** | **Structurally yes, semantically no** — the down script restores nullability, but cannot distinguish rows that were originally NULL from rows the application legitimately set to `'infinity'` afterwards |

That last row is the only genuinely lossy step in Batch 12, and it is why the backfill and the `NOT NULL` promotion should land in the same maintenance window as the verification.
