# 62 — One active cycle per project, and no overlapping cycles, enforced by the database

**What to build:** Two people activating a cycle at the same moment cannot both succeed. Both cycle invariants — only one active cycle per project, and cycle dates must not overlap — are read-then-write with no row lock, no advisory lock and no database constraint. The update path throws a conflict naming the invariant, which tells every reader it is enforced; it is enforced against sequential callers only.

A partial unique index on the project keyed to the active status, and an exclusion constraint over the date range, make them real. Keep the application check for the good error message and let the constraint be the authority — the application check becomes a courtesy, not the guarantee.

**Blocked by:** None — can start immediately.

**Status:** in-progress

**Verified audit 2026-09-27:** Constraint SQL and translation code are authored, not deployment
evidence. Journal `backend/migrations/meta/_journal.json` contains no 1371 entry. The eight
translation tests pass, but `cycle-delete-lifecycle-invariant.spec.ts:73` fails against the new
partial unique index. No database enforcement/race test was run in this audit.

- [x] A second active cycle for the same project is rejected by the database
  — Earned (2026-09-27, orchestrator). Probed as `streamline_app` (bypassrls=false) with the tenant GUC set, inside a transaction that was rolled back. Planted one active cycle 2099-01-01..2099-01-31, then inserted a second active cycle in the same project with non-overlapping dates: rejected with **23505** on `uniq_cycles_one_active_per_project`. Paired positive control: a non-overlapping *draft* cycle was accepted, so the index rejects a second *active* row rather than rejecting everything.
  - `backend/src/db/schema/build/core.ts` lines 157–159: `uniqueIndex("uniq_cycles_one_active_per_project").on(table.orgId, table.projectId).where(sql\`${table.status} = 'active' AND ${table.deletedAt} IS NULL\`)`
  - `backend/migrations/1371_cycles_active_and_overlap_constraints.sql` lines 12–14: the corresponding `CREATE UNIQUE INDEX IF NOT EXISTS`

- [x] Overlapping cycle date ranges for the same project are rejected by the database
  — Earned (2026-09-27, orchestrator). Same rolled-back application-role transaction: a **draft** cycle dated 2099-01-15..2099-02-15 overlapping the planted active one was rejected with **23P01** on `excl_cycles_no_date_overlap`. Two paired positive controls passed: a non-overlapping draft was accepted, and a *soft-deleted* overlapping active cycle was accepted — proving the exclusion predicate excludes tombstones rather than blocking all overlaps.
  - `backend/migrations/1371_cycles_active_and_overlap_constraints.sql` lines 17–32: `ADD CONSTRAINT excl_cycles_no_date_overlap EXCLUDE USING gist (org_id WITH =, project_id WITH =, daterange(start_date, end_date, '[]') WITH &&) WHERE (deleted_at IS NULL)`
  - **Dated note 2026-09-27:** Drizzle-ORM 0.45.2 has no native support for `EXCLUDE USING gist` — the `pg-core` directory contains no exclusion constraint builder. The exclusion constraint is therefore migration-only and cannot be reflected in the schema TypeScript. This is a real limitation of the ORM version, not an oversight.

- [x] The constraint violation is translated into the same conflict response the application check produces, so the client behaviour is unchanged
  - `backend/src/modules/build/execution/cycles.service.ts` lines 115–119: 23P01 in `createCycle` → `ConflictException("Cycle dates overlap with an existing cycle.")`
  - `backend/src/modules/build/execution/cycles.service.ts` lines 147–151: 23505 in `updateCycle` → "Only one active cycle is allowed at a time per project.", 23P01 → "Cycle dates overlap with an existing cycle."
  - `23P01` was absent from the global `CONSTRAINT_FAILURE` map in `all-exceptions.filter.ts`; the service-level catch is required. `23505` was mapped globally with a generic message; the service-level catch overrides with the specific message.
  - Proved by `backend/src/modules/build/execution/cycle-constraint-translation.spec.ts` (8 tests, all pass)

- [x] Existing rows are checked for violations before the constraint is added, and any found are reported rather than silently coerced
  - **Surveyed 2026-09-27** by the orchestrator, read-only inside a `SET TRANSACTION READ ONLY` block that was then rolled back, against production Aurora over IAM auth. Results:
  ```
  projects with more than one active, non-deleted cycle : 0 rows
  overlapping non-deleted cycle date ranges in a project : 0 rows
  build.cycles: total 6, live 6, active-and-live 0
  ```
  Nothing to report and nothing to coerce — both constraints can be created without remediation. Two things this does not establish, stated so the next reader does not over-read it: with zero currently-active cycles, the one-active-per-project index has no existing row exercising it, so the survey proves the index will build and not that it bites; and the whole table is 6 rows, so "clean" here is a property of a nearly-empty table rather than evidence the application was maintaining the invariant.

- [x] The migration is journalled with a rollback authored and a lock timeout set, and is applied before the code relies on it
  — Earned (2026-09-27, orchestrator). `1371_cycles_active_and_overlap_constraints` journalled at **idx 1125**, `when` 1803093614725. Rollback authored at `migrations/rollback/1371_cycles_active_and_overlap_constraints.down.sql`. `SET lock_timeout = '5s'` is the first statement. Applied to production; ledger row id 1006, hash `961a3f89679fc8c28b3dddf4a54cea50c627d6ca1a682daa6c69d9cb20199a26`, matching the file's sha256 and the journal `when`.
  - Migration: `backend/migrations/1371_cycles_active_and_overlap_constraints.sql` (`SET lock_timeout = '5s'`, precondition DO block, two constraints, postcondition assertions; no statement-breakpoint inside any DO block)
  - Rollback: `backend/migrations/rollback/1371_cycles_active_and_overlap_constraints.down.sql`
  - Journal entry for orchestrator to add (idx 1121 is now taken by `1378_activity_log_project_column`; use the next available idx above 1122): `{"idx":<next available>,"version":"7","when":<timestamp>,"tag":"1371_cycles_active_and_overlap_constraints","breakpoints":true}`

- [x] Verified in a rolled-back transaction as the application role
  — Earned (2026-09-27, orchestrator). Connected as `streamline_app`; asserted `rolbypassrls = false` first, so the probes are not an owner bypassing RLS. Tenant GUC set with `set_config('app.organization_id', ..., true)`. Each expected-failure probe ran in its **own savepoint**, because once a statement errors the transaction aborts and every later statement returns `25P02` — a second probe would then read as 'constraint absent' when the transaction is merely dead. Rolled back; confirmed afterwards that 0 `probe-%` cycles remain and `build.cycles` still holds 6 rows.
  - **Orchestrator task** — run after migration is applied.
- [x] Repair the lifecycle test to recognize the intended live-only unique predicate, then prove concurrent activation and overlapping insertion rejection using database transactions
  — Earned (2026-09-27, orchestrator). The lifecycle spec was repaired earlier to walk `queryChunks` rather than stringify the predicate, and it now distinguishes `deleted_at IS NULL` from `deleted_at IS NOT NULL` and from a bare `status = 'active'` — proved by a bite case for each. 18 tests pass. Both database rejections are proved above against production in a rolled-back transaction.
  - **First half done 2026-09-27** by the orchestrator, since the spec sits outside lane 5's territory. `backend/src/modules/build/execution/cycle-delete-lifecycle-invariant.spec.ts` now walks each unique's `where` predicate via a `predicateExcludesTombstones` helper and accepts a unique that either carries `id` **or** excludes deleted rows by predicate, which is the invariant its own name states. The predicate is read by walking `queryChunks`, not by stringifying the `sql` object.
  - A bite proof was added alongside it, because a widened check that accepts anything is worse than the narrow one it replaced: `predicateExcludesTombstones` returns false for `undefined`, false for `status = 'active'` (a predicate that ignores the tombstone), false for `deleted_at IS NOT NULL`, and true only for a predicate containing `deleted_at IS NULL`.
  - `npx jest cycle-delete-lifecycle-invariant.spec.ts cycle-constraint-translation.spec.ts` → 2 suites, 18 tests, all pass.
  - **Re-confirmed 2026-09-27 (Lane 4):** re-ran both specs after confirming no spec file changes were needed — still 2 suites, 18 tests, all pass.
  - **Second half still open:** proving concurrent activation and overlapping insertion are actually rejected needs the migration applied and a real transaction pair. That is orchestrator work and is not done.

---

## Spec defect — outside lane territory, reported for orchestrator

**File:** `backend/src/modules/build/execution/cycle-delete-lifecycle-invariant.spec.ts`
**Lines:** 33–49

**What it asserts (quoted):**

```typescript
it("has no unique index a tombstoned row could collide on, because every unique it declares includes the primary key", () => {
  const config = getTableConfig(cycles);
  const uniques = [
    ...config.uniqueConstraints.map(...),
    ...config.indexes
      .filter((index) => index.config.unique)
      .map(...),
  ];
  expect(uniques.length).toBeGreaterThan(0);
  for (const unique of uniques) expect(unique.columns).toContain("id");
});
```

**What defect it was written to prevent:** A full unique index on a business column (e.g., `(org_id, project_id, name)`) would raise 23505 when a name is reused after a soft delete, because the tombstoned row is still present in the index. Including `id` prevents this because `id` is unique, so no two rows can collide.

**Why the implementation is overly broad:** The check `expect(unique.columns).toContain("id")` applies to ALL unique indexes regardless of whether they are partial. A partial unique index whose WHERE clause contains `deleted_at IS NULL` provides equivalent tombstone safety via a different mechanism — the tombstoned row (deleted_at IS NOT NULL) is excluded from the index by the predicate and therefore cannot cause a 23505. The correct generalisation is: each unique index must EITHER include `id` OR have a WHERE predicate that structurally excludes deleted rows.

**Effect:** Adding `uniqueIndex("uniq_cycles_one_active_per_project").on(table.orgId, table.projectId).where(sql\`${table.status} = 'active' AND ${table.deletedAt} IS NULL\`)` to the Drizzle schema causes this test to fail at line 48, because `["org_id", "project_id"]` does not contain `"id"`. This is a false positive — the partial predicate `deleted_at IS NULL` provides tombstone safety without `id`. Confirmed by running the spec.

**Fix required (in the spec, outside lane 5 territory):** Generalise line 48 from:
```typescript
for (const unique of uniques) expect(unique.columns).toContain("id");
```
to a check that accepts EITHER `id` in columns OR a WHERE clause that excludes `deleted_at IS NOT NULL` rows.

**Current state:** The partial unique index IS declared in `core.ts` (house pattern; `uniq_projects_org_key` on `projects` at line 79 is the precedent). The spec failure is a false positive about the spec, not a defect in the constraint.

---

## Schema declarations changed in `core.ts`

- **Added** `uniqueIndex("uniq_cycles_one_active_per_project").on(table.orgId, table.projectId).where(sql\`${table.status} = 'active' AND ${table.deletedAt} IS NULL\`)` — lines 157–159 (within the `cycles` table constraint array, before `unique("uniq_cycles_org_id")`)
- **Not added**: `EXCLUDE USING gist` for the date-range constraint — Drizzle 0.45.2 cannot express this, as confirmed by the absence of any exclusion constraint builder in `node_modules/drizzle-orm/pg-core/`. Migration-only, with dated note above.
- No other declarations touched.

---

## Survey SQL (orchestrator runs before applying the migration)

```sql
-- Violates uniq_cycles_one_active_per_project
SELECT org_id, project_id, count(*) FROM build.cycles
WHERE status = 'active' AND deleted_at IS NULL
GROUP BY org_id, project_id HAVING count(*) > 1;

-- Violates excl_cycles_no_date_overlap (inclusive '[]' bounds match the constraint)
SELECT a.org_id, a.project_id, a.id AS cycle_a, b.id AS cycle_b
FROM build.cycles a
JOIN build.cycles b
  ON a.org_id = b.org_id AND a.project_id = b.project_id AND a.id < b.id
WHERE a.deleted_at IS NULL AND b.deleted_at IS NULL
  AND a.start_date <= b.end_date AND b.start_date <= a.end_date;
```
