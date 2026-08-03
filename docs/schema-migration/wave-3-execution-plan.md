---
wave: 3
type: execution plan
status: DRAFT
date: 2026-07-26
depends_on: Wave 1 complete (owner_membership_id NOT NULL), Wave 2 complete (org_modules sole read-authority)
blocks: Wave 5 (RBAC membership-principal migration), Wave 6 (Business Party)
---

# Wave 3 — Directory + Workforce seams: Execution Plan

> This document is a sequenced, gated execution plan only. No source files are modified
> here. Every step follows the pattern: **expand → tolerant backend → backfill →
> shadow-compare → cutover → contract**.
>
> Reading the full `docs/schema-change-plan.md §2` and `docs/schema-migration/wave-5-directory-workforce-design.md`
> is a prerequisite for any implementer picking up a step.

---

## Verified starting state (as of 2026-07-26)

| Fact | Verified |
|---|---|
| `organization_people`, `workers`, `worker_engagements` exist as Drizzle TS only — **zero SQL migration has been generated or run** | confirmed: no `organization_people` in any migration file under `backend/migrations/` |
| `workerEngagementStatusEnum` is declared in `backend/src/db/schema/enums.ts` and imported by `worker-engagements.ts` | confirmed |
| `worker_engagements` has a partial unique index for at-most-one active primary engagement — present in TS | confirmed: `uniq_worker_engagements_active_primary` |
| `worker_engagements` has **no** EXCLUSION constraint for overlapping intervals — the `btree_gist` / `EXCLUDE USING gist` constraint exists only in the design spec, not in the Drizzle TS | confirmed: absent from `worker-engagements.ts` |
| `worker_engagements` has **no** `employer_legal_entity_id` column | confirmed: absent from schema |
| `hr_people.work_email` is `NOT NULL` with a unique index on `(org_id, work_email)` | confirmed: `backend/src/db/schema/hr/core-people.ts` line 85 |
| `user_memberships` is an active read target in two live services: `user-profile.service.ts` (getMembership / updateMembership) and `notifications/broadcasts.service.ts` (audience resolution) | confirmed |
| `user_memberships` is referenced in `crm-automation-runner.service.ts` for membership validation | confirmed |
| `organization_people` cross-references `organizationMembers` from `auth.ts` via nullable integer FK | confirmed |
| The directory module (`directory.service.ts`, `directory.controller.ts`) is fully implemented but references tables that do not exist in the live DB | confirmed |

---

## Step map

```
Step 1  Generate + journal directory migration (DDL gate)
Step 2  Add btree_gist EXCLUSION constraint (raw SQL migration)
Step 3  Add employer_legal_entity_id to worker_engagements
Step 4  Fix hr_people.work_email NOT NULL
Step 5  Backfill organization_people from users / user_memberships / hr_people
Step 6  Link organization_members ↔ organization_people (backfill membership pointer)
Step 7  Backfill workers + worker_engagements from hr_employments
Step 8  Shadow-compare: verify directory rows vs. hr_people / user_memberships parity
Step 9  Read cutover — directory service as primary read for people / workers
Step 10 Read cutover — notifications + CRM automation off user_memberships
Step 11 Contract: retire user_memberships as placement authority
```

---

## Step 1 — Generate and journal the directory migration

**What this does.** Creates the three tables (`organization_people`, `workers`,
`worker_engagements`) and their `workerEngagementStatusEnum` in the live database for
the first time.

### Pre-condition gate

- Wave 1 is complete: `organizations.owner_membership_id NOT NULL` constraint is live.
- Wave 2 is complete: `org_modules` sole read-authority migration is applied.
- `pnpm -C backend db:push` (dev) and `pnpm -C backend db:migrate` (CI) both succeed
  on the current HEAD.
- All existing tests pass against the current schema.

### Action

```bash
# From the repo root — backend only
pnpm -C backend db:generate
# Review the generated SQL in backend/migrations/XXXX_directory_workforce.sql
# before running. Check it includes:
#   - CREATE TYPE worker_engagement_status IF NOT EXISTS
#   - CREATE TABLE organization_people (...)
#   - CREATE TABLE workers (...) with fk_workers_org_person composite FK
#   - CREATE TABLE worker_engagements (...) with fk_worker_engagements_org_worker FK
#   - All indexes listed in the Drizzle TS (idx_*, uniq_*)
pnpm -C backend db:push   # dev only
# CI path: pnpm -C backend db:migrate
```

### What to verify after running

```sql
-- All three tables exist
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('organization_people','workers','worker_engagements');
-- Expect 3 rows.

-- Enum exists
SELECT typname FROM pg_type WHERE typname = 'worker_engagement_status';

-- Candidate keys present
SELECT indexname FROM pg_indexes
WHERE tablename IN ('organization_people','workers','worker_engagements')
  AND indexname LIKE 'uniq_%'
ORDER BY tablename, indexname;
-- Must include uniq_workers_org_person, uniq_worker_engagements_active_primary, etc.

-- Composite FK on workers
SELECT constraint_name FROM information_schema.table_constraints
WHERE table_name = 'workers' AND constraint_name = 'fk_workers_org_person';

-- Composite FK on worker_engagements
SELECT constraint_name FROM information_schema.table_constraints
WHERE table_name = 'worker_engagements'
  AND constraint_name = 'fk_worker_engagements_org_worker';
```

### Rollback

Drop the three new tables and the enum. All pre-existing tables are untouched; no
backfill has run yet.

```sql
DROP TABLE IF EXISTS worker_engagements;
DROP TABLE IF EXISTS workers;
DROP TABLE IF EXISTS organization_people;
DROP TYPE IF EXISTS worker_engagement_status;
```

---

## Step 2 — Add the EXCLUSION constraint on worker_engagements (missing from TS)

**What this does.** Enforces the §2 invariant: no two non-cancelled / non-void
engagements for the same worker may have overlapping `[starts_on, ends_on)` intervals.
This is a database-level correctness guarantee that a partial unique index cannot
express. It requires the `btree_gist` extension.

**Why this is a raw SQL migration and not just a Drizzle TS change.** Drizzle does not
have a first-class `EXCLUDE USING gist` builder. The constraint must be authored in a
hand-written SQL migration appended to the journal after Step 1's generated file.

### Pre-condition gate

- Step 1 complete and validated.
- `worker_engagements` table is empty (just created — no data yet). This matters because
  adding an exclusion constraint to a table with existing data requires every existing
  row to satisfy it, or the constraint must be added `NOT VALID` and later `VALIDATE`d.
  For an empty table, neither concern applies.

### Migration sketch

File: `backend/migrations/XXXX_worker_engagements_exclusion.sql`

```sql
-- Enable btree_gist if not already present (idempotent, superuser required once)
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Exclusion constraint: no overlapping ACTIVE or PLANNED engagements per worker.
-- CANCELLED and TERMINATED statuses are excluded from the constraint so they
-- do not block a new engagement covering the same interval.
ALTER TABLE worker_engagements
  ADD CONSTRAINT excl_worker_engagements_no_overlap
  EXCLUDE USING gist (
    worker_id WITH =,
    daterange(starts_on, COALESCE(ends_on, '9999-12-31'::date), '[)') WITH &&
  )
  WHERE (status IN ('PLANNED', 'ACTIVE'));
```

> **Note on Drizzle TS parity.** Because Drizzle cannot express this constraint, the
> Drizzle schema TS file must carry a comment noting the raw-SQL companion migration.
> Add to `worker-engagements.ts` table config comments (not code comments — internal
> dev note in a jsdoc block):
>
> ```ts
> /**
>  * EXCLUSION CONSTRAINT NOTE: `excl_worker_engagements_no_overlap` is declared
>  * in migration XXXX_worker_engagements_exclusion.sql — Drizzle cannot express it.
>  * Do not attempt to remove it via `db:push`; the migration journal owns it.
>  */
> ```

### What to verify

```sql
SELECT conname, contype FROM pg_constraint
WHERE conrelid = 'worker_engagements'::regclass
  AND conname = 'excl_worker_engagements_no_overlap';
-- Expect contype = 'x' (exclusion)

-- Smoke test: inserting two overlapping ACTIVE engagements for the same worker
-- must raise error 23P01 (exclusion_violation). Run in a transaction you roll back.
BEGIN;
INSERT INTO worker_engagements
  (worker_engagement_id, organization_id, worker_id, starts_on, ends_on, worker_type, status, is_primary)
VALUES
  (gen_random_uuid(), '<test_org>', '<test_worker>', '2025-01-01', '2025-12-31', 'FULL_TIME', 'ACTIVE', false),
  (gen_random_uuid(), '<test_org>', '<test_worker>', '2025-06-01', NULL,         'FULL_TIME', 'ACTIVE', false);
-- Must fail with 23P01. If it succeeds the constraint is not effective.
ROLLBACK;
```

### Rollback

```sql
ALTER TABLE worker_engagements
  DROP CONSTRAINT IF EXISTS excl_worker_engagements_no_overlap;
```

---

## Step 3 — Add employer_legal_entity_id to worker_engagements

**What this does.** `worker_engagements` currently has no employer legal entity
reference. The §2 spec requires it: "Engagement employer legal entity, manager,
organization unit, location, and payroll/HR overlays must belong to the same
Organization through composite FKs." Until a `legal_entities` table exists, this lands
as a nullable `text` column holding a future FK target, with a comment.

### Pre-condition gate

- Step 2 complete.

### Drizzle TS change

In `backend/src/db/schema/directory/worker-engagements.ts`, add after `isPrimary`:

```ts
employerLegalEntityId: text("employer_legal_entity_id"),
// When the legal_entities table (Wave 6+) lands, add:
// foreignKey({ columns: [table.organizationId, table.employerLegalEntityId],
//   foreignColumns: [legalEntities.organizationId, legalEntities.id],
//   name: 'fk_worker_engagements_legal_entity' })
```

Also add the index entry:

```ts
index("idx_worker_engagements_legal_entity").on(table.employerLegalEntityId),
```

### Generate + apply

```bash
pnpm -C backend db:generate
# Verify the generated SQL is just an ALTER TABLE ... ADD COLUMN employer_legal_entity_id text
# and the new index. Nothing destructive.
pnpm -C backend db:push   # dev
```

### What to verify

```sql
SELECT column_name, is_nullable
FROM information_schema.columns
WHERE table_name = 'worker_engagements'
  AND column_name = 'employer_legal_entity_id';
-- Expect: is_nullable = 'YES'
```

### Rollback

```sql
ALTER TABLE worker_engagements DROP COLUMN IF EXISTS employer_legal_entity_id;
```

---

## Step 4 — Fix hr_people.work_email NOT NULL (blocking pre-hire / offline workers)

**What this does.** `hr_people.work_email` is `NOT NULL`. The §2 spec states:
"Pre-hires, offline workers and contractors remain valid without an application
membership" and "do not regress their nullable-login capability." A work email should
not be mandatory for a person record — a contractor, pre-hire, or external payee may
not have an org email yet.

The fix is additive: make the column nullable and drop the NOT NULL constraint. The
`uniqueIndex("uniq_hr_people_org_work_email")` already has no `WHERE work_email IS NOT NULL`
filter — that must be added in the same migration to prevent the unique index from
treating multiple NULL rows as conflicting (Postgres NULLs are distinct in unique
indexes but this is a correctness improvement).

### Pre-condition gate

- Step 1 is complete (confirms the migration journal process works).
- Grep confirms no code path inserts into `hr_people` with a guaranteed non-null
  `work_email` without also being able to omit it. The service layer must accept `null`.

### Drizzle TS change

In `backend/src/db/schema/hr/core-people.ts`:

```ts
// Before:
workEmail: text("work_email").notNull(),
// After:
workEmail: text("work_email"),
```

Unique index — replace the existing `uniqueIndex` with a filtered one:

```ts
// Before (implicit — no WHERE):
uniqueIndex("uniq_hr_people_org_work_email").on(table.orgId, table.workEmail),
// After:
uniqueIndex("uniq_hr_people_org_work_email")
  .on(table.orgId, table.workEmail)
  .where(sql`work_email IS NOT NULL`),
```

### Generate + apply

```bash
pnpm -C backend db:generate
# Generated SQL must contain:
#   ALTER TABLE hr_people ALTER COLUMN work_email DROP NOT NULL;
#   DROP INDEX uniq_hr_people_org_work_email;
#   CREATE UNIQUE INDEX uniq_hr_people_org_work_email
#     ON hr_people (org_id, work_email) WHERE work_email IS NOT NULL;
pnpm -C backend db:push   # dev
```

### Backend service audit

After the column is nullable, every service that reads or writes `hr_people.work_email`
must treat `null` gracefully. Search for `workEmail` in the hr module and ensure:

1. Create/update DTOs make `workEmail` optional (`z.string().email().optional()`).
2. No query filters on `work_email IS NOT NULL` implicitly by relying on NOT NULL.
3. Display layer shows "—" or "No work email" rather than crashing on null.

### What to verify

```sql
SELECT is_nullable FROM information_schema.columns
WHERE table_name = 'hr_people' AND column_name = 'work_email';
-- Expect: YES

SELECT indexdef FROM pg_indexes
WHERE tablename = 'hr_people' AND indexname = 'uniq_hr_people_org_work_email';
-- Must include: WHERE (work_email IS NOT NULL)

-- Confirm existing rows with non-null work_email are still unique per org
SELECT org_id, work_email, count(*)
FROM hr_people
WHERE work_email IS NOT NULL
GROUP BY org_id, work_email
HAVING count(*) > 1;
-- Expect 0 rows.
```

### Rollback

```sql
-- Only safe if no NULL work_email rows have been inserted.
UPDATE hr_people SET work_email = 'unknown_' || id::text || '@placeholder.invalid'
  WHERE work_email IS NULL;
ALTER TABLE hr_people ALTER COLUMN work_email SET NOT NULL;
DROP INDEX IF EXISTS uniq_hr_people_org_work_email;
CREATE UNIQUE INDEX uniq_hr_people_org_work_email ON hr_people (org_id, work_email);
```

---

## Step 5 — Backfill organization_people from users / user_memberships / hr_people

**What this does.** Creates `organization_people` rows for every person who has a
presence in the organization. Three sources are used in priority order:

1. **`hr_people`** — the most complete person record (has first/last name, contact data,
   avatar). These become canonical people entries.
2. **`user_memberships`** — members without an `hr_people` record (e.g., non-HR orgs).
   These members have a user identity and placement but no HRMS record.
3. **`organization_members`** — any member not covered by the above two (purely login
   members in orgs that have never touched HRMS or `user_memberships`).

**Ambiguity quarantine.** Where the same person appears in multiple sources with
conflicting data (e.g., two different `work_email` values for the same `user_id` across
`hr_people` and `organization_members`) the row is written to a `_directory_backfill_quarantine`
helper table for manual operator review rather than silently picking one.

### Pre-condition gate

- Steps 1–4 complete and validated.
- `organization_people` is empty (just created).
- A dry-run count query has been reviewed by the operator:

```sql
-- Source 1: hr_people rows
SELECT count(*) FROM hr_people WHERE deleted_at IS NULL;

-- Source 2: user_memberships with no matching hr_people
SELECT count(*) FROM user_memberships um
  LEFT JOIN hr_people hp ON hp.org_id = um.org_id AND hp.user_id = um.user_id
WHERE hp.id IS NULL;

-- Source 3: organization_members with no coverage from the above two
SELECT count(*) FROM organization_members om
  LEFT JOIN hr_people hp ON hp.org_id = om.org_id AND hp.user_id = om.user_id
  LEFT JOIN user_memberships um ON um.org_id = om.org_id AND um.user_id = om.user_id
WHERE hp.id IS NULL AND um.id IS NULL;
```

### Migration sketch (idempotent NestJS script or raw SQL, run once)

```sql
-- 0. Create quarantine table if not exists
CREATE TABLE IF NOT EXISTS _directory_backfill_quarantine (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  source      text NOT NULL,
  org_id      text NOT NULL,
  user_id     text,
  reason      text NOT NULL,
  raw_data    jsonb,
  created_at  timestamptz DEFAULT now()
);

-- 1. Insert from hr_people (most authoritative)
INSERT INTO organization_people (
  organization_id, user_id, first_name, last_name,
  work_email, personal_email, phone,
  date_of_birth, gender, nationality, address, emergency_contact,
  avatar_url, created_at, updated_at
)
SELECT
  hp.org_id,
  hp.user_id,
  hp.first_name,
  hp.last_name,
  hp.work_email,
  hp.personal_email,
  hp.phone,
  hp.date_of_birth,
  hp.gender,
  hp.nationality,
  hp.address,
  hp.emergency_contact,
  hp.avatar_url,
  hp.created_at,
  hp.updated_at
FROM hr_people hp
WHERE hp.deleted_at IS NULL
ON CONFLICT DO NOTHING;  -- uniq_org_people_org_user covers (org_id, user_id) where user_id IS NOT NULL

-- 2. Insert from user_memberships not already covered
INSERT INTO organization_people (
  organization_id, user_id, first_name, last_name, created_at, updated_at
)
SELECT
  um.org_id,
  um.user_id,
  COALESCE(u.name, u.email, um.user_id) AS first_name,
  ''                                     AS last_name,
  um.created_at,
  um.updated_at
FROM user_memberships um
  JOIN users u ON u.id = um.user_id
  LEFT JOIN organization_people op
    ON op.organization_id = um.org_id AND op.user_id = um.user_id
WHERE op.organization_person_id IS NULL
ON CONFLICT DO NOTHING;

-- 3. Insert from organization_members not covered by either source above
INSERT INTO organization_people (
  organization_id, user_id, first_name, last_name, created_at, updated_at
)
SELECT
  om.org_id,
  om.user_id,
  COALESCE(u.name, u.email, om.user_id) AS first_name,
  '' AS last_name,
  om.created_at,
  om.updated_at
FROM organization_members om
  JOIN users u ON u.id = om.user_id
  LEFT JOIN organization_people op
    ON op.organization_id = om.org_id AND op.user_id = om.user_id
WHERE op.organization_person_id IS NULL
ON CONFLICT DO NOTHING;

-- 4. Quarantine: flag any organization_people rows where first_name is the user_id
--    fallback (needs human review / re-import)
INSERT INTO _directory_backfill_quarantine (source, org_id, user_id, reason, raw_data)
SELECT
  'user_memberships_or_members_fallback',
  op.organization_id,
  op.user_id,
  'first_name_is_fallback_from_user_id_or_email',
  jsonb_build_object(
    'organization_person_id', op.organization_person_id,
    'first_name', op.first_name
  )
FROM organization_people op
WHERE op.first_name = op.user_id
   OR op.last_name = '';
```

### What to verify

```sql
-- Total people created
SELECT count(*) FROM organization_people;

-- Quarantine count
SELECT count(*) FROM _directory_backfill_quarantine;
-- Review these rows manually before proceeding.

-- No duplicate (org, user) pairs
SELECT organization_id, user_id, count(*)
FROM organization_people
WHERE user_id IS NOT NULL
GROUP BY organization_id, user_id
HAVING count(*) > 1;
-- Expect 0 rows.
```

### Rollback

```sql
TRUNCATE organization_people;
DROP TABLE IF EXISTS _directory_backfill_quarantine;
```

---

## Step 6 — Link organization_members ↔ organization_people (backfill membership pointer)

**What this does.** `organization_people.organization_membership_id` is a nullable
integer FK to `organization_members.id`. After Step 5, people created from
`organization_members` or `user_memberships` have no `organization_membership_id`.
This step backfills that link for every person whose `user_id` matches a membership in
the same org.

### Pre-condition gate

- Step 5 complete and the quarantine table has been reviewed.

### Migration sketch

```sql
UPDATE organization_people op
SET organization_membership_id = om.id
FROM organization_members om
WHERE om.org_id = op.organization_id
  AND om.user_id = op.user_id
  AND op.organization_membership_id IS NULL
  AND op.user_id IS NOT NULL;

-- Validate: every person with a user_id should now have a membership_id
SELECT count(*)
FROM organization_people
WHERE user_id IS NOT NULL
  AND organization_membership_id IS NULL;
-- Target: 0. If non-zero, quarantine those rows.
```

### Rollback

```sql
UPDATE organization_people SET organization_membership_id = NULL;
```

---

## Step 7 — Backfill workers + worker_engagements from hr_employments

**What this does.** Creates `workers` rows for every `hr_people` person who has an
`hr_employments` record, then creates `worker_engagements` rows from each employment.
This is the structural seam that allows HRMS to become an overlay on `workers` rather
than the only source of employment truth.

The mapping is:

| `hr_people` / `hr_employments` | `workers` / `worker_engagements` |
|---|---|
| `hr_people.id` → find `organization_people` by `(org_id, user_id)` | `workers.organization_person_id` |
| `hr_employments.employee_number` | `workers.worker_number` |
| `hr_employments.joining_date` | `worker_engagements.starts_on` |
| `hr_employments.last_working_day` or `exit_date` | `worker_engagements.ends_on` |
| `hr_employments.worker_type` | `worker_engagements.worker_type` |
| `hr_employments.lifecycle_status` | mapped → `worker_engagements.status` |
| `hr_employments.is_primary` | `worker_engagements.is_primary` |
| `hr_employments.designation` | `worker_engagements.designation` |
| `hr_employments.department_id` | `worker_engagements.department_id` |
| `hr_employments.location_id` | `worker_engagements.location_id` |

**Lifecycle status mapping** (`hr_employments.lifecycle_status` → `worker_engagements.status`):

| hr_employments | worker_engagements |
|---|---|
| `CANDIDATE`, `PRE_JOINING`, `ONBOARDING`, `PROBATION` | `PLANNED` |
| `ACTIVE`, `CONFIRMED`, `NOTICE` | `ACTIVE` |
| `EXITED`, `ALUMNI` | `COMPLETED` |
| `SUSPENDED` | `ACTIVE` (engagement continues; `SUSPENDED` worker status on `workers.status`) |

### Pre-condition gate

- Steps 5 and 6 complete.
- Step 2 (EXCLUSION constraint) is live. The backfill must not produce overlapping
  intervals; since `hr_employments` allows at most one active primary per person (by its
  own `uniq_hr_employments_org_emp_num`), this should be safe, but the insert order
  matters: insert non-primary rows first, primary row last.
- The operator has confirmed the dry-run counts:

```sql
SELECT count(*) FROM hr_employments he
  JOIN hr_people hp ON hp.id = he.person_id
  JOIN organization_people op ON op.organization_id = hp.org_id AND op.user_id = hp.user_id
WHERE he.deleted_at IS NULL;
-- This is the target row count for worker_engagements.
```

### Migration sketch (run in a transaction)

```sql
BEGIN;

-- 1. Create workers for all hr_people who have at least one employment
INSERT INTO workers (worker_id, organization_id, organization_person_id, worker_number, status, is_payee)
SELECT
  gen_random_uuid(),
  hp.org_id,
  op.organization_person_id,
  he_agg.employee_number,
  CASE
    WHEN EXISTS (
      SELECT 1 FROM hr_employments he2
      WHERE he2.person_id = hp.id AND he2.lifecycle_status IN ('ACTIVE','CONFIRMED','NOTICE','PROBATION','ONBOARDING')
    ) THEN 'ACTIVE'
    WHEN EXISTS (
      SELECT 1 FROM hr_employments he2
      WHERE he2.person_id = hp.id AND he2.lifecycle_status IN ('EXITED','ALUMNI')
    ) THEN 'EXITED'
    ELSE 'INACTIVE'
  END,
  false  -- is_payee: Payroll module will set this; not Wave 3's responsibility
FROM hr_people hp
  JOIN organization_people op
    ON op.organization_id = hp.org_id AND op.user_id = hp.user_id
  CROSS JOIN LATERAL (
    SELECT employee_number
    FROM hr_employments
    WHERE person_id = hp.id AND is_primary = true
    ORDER BY created_at DESC
    LIMIT 1
  ) he_agg
WHERE hp.deleted_at IS NULL
ON CONFLICT ON CONSTRAINT uniq_workers_org_person DO NOTHING;

-- 2. Create worker_engagements from hr_employments, non-primary first
INSERT INTO worker_engagements (
  worker_engagement_id, organization_id, worker_id,
  starts_on, ends_on, worker_type, status, is_primary,
  department_id, location_id, designation, created_at, updated_at
)
SELECT
  gen_random_uuid(),
  w.organization_id,
  w.worker_id,
  COALESCE(he.joining_date, he.created_at::date) AS starts_on,
  COALESCE(he.last_working_day, he.exit_date)    AS ends_on,
  he.worker_type::text,
  CASE he.lifecycle_status
    WHEN 'CANDIDATE'    THEN 'PLANNED'
    WHEN 'PRE_JOINING'  THEN 'PLANNED'
    WHEN 'ONBOARDING'   THEN 'PLANNED'
    WHEN 'PROBATION'    THEN 'ACTIVE'
    WHEN 'ACTIVE'       THEN 'ACTIVE'
    WHEN 'CONFIRMED'    THEN 'ACTIVE'
    WHEN 'NOTICE'       THEN 'ACTIVE'
    WHEN 'EXITED'       THEN 'COMPLETED'
    WHEN 'ALUMNI'       THEN 'COMPLETED'
    WHEN 'SUSPENDED'    THEN 'ACTIVE'
    ELSE 'PLANNED'
  END,
  he.is_primary,
  he.department_id::text,
  he.location_id::text,
  he.designation,
  he.created_at,
  he.updated_at
FROM hr_employments he
  JOIN hr_people hp ON hp.id = he.person_id
  JOIN workers w ON w.organization_id = hp.org_id
    AND w.organization_person_id = (
      SELECT organization_person_id FROM organization_people
      WHERE organization_id = hp.org_id AND user_id = hp.user_id
      LIMIT 1
    )
WHERE he.deleted_at IS NULL
ORDER BY he.is_primary ASC  -- non-primary first, primary last (EXCLUSION constraint safe)
ON CONFLICT DO NOTHING;

COMMIT;
```

### What to verify

```sql
-- Worker count matches hr_people-with-employments count
SELECT count(*) FROM workers;

-- Engagement count matches hr_employments count
SELECT count(*) FROM worker_engagements;

-- No constraint violations: exclusion constraint is live
-- (insert would have failed above if any overlapping rows were produced)

-- At most one active primary per worker
SELECT worker_id, count(*)
FROM worker_engagements
WHERE is_primary = true AND status = 'ACTIVE'
GROUP BY worker_id
HAVING count(*) > 1;
-- Expect 0 rows.
```

### Rollback

```sql
TRUNCATE worker_engagements;
TRUNCATE workers;
```

---

## Step 8 — Shadow-compare: verify directory parity vs. hr_people / user_memberships

**What this does.** Before any read cutover, verify the new directory rows are
numerically and structurally consistent with the old sources. This is a
non-destructive read-only audit step.

### Checks to run

```sql
-- 1. Every active hr_people row has a corresponding organization_people row
SELECT count(*) FROM hr_people hp
  LEFT JOIN organization_people op
    ON op.organization_id = hp.org_id AND op.user_id = hp.user_id
WHERE hp.deleted_at IS NULL AND op.organization_person_id IS NULL;
-- Target: 0

-- 2. Every user_memberships row has a corresponding organization_people row
SELECT count(*) FROM user_memberships um
  LEFT JOIN organization_people op
    ON op.organization_id = um.org_id AND op.user_id = um.user_id
WHERE op.organization_person_id IS NULL;
-- Target: 0 (or equal to the count of rows in the quarantine table)

-- 3. Every hr_employments row has a corresponding worker_engagement
SELECT count(*) FROM hr_employments he
  JOIN hr_people hp ON hp.id = he.person_id
  JOIN workers w ON w.organization_id = hp.org_id
    AND w.worker_id IS NOT NULL
  LEFT JOIN worker_engagements we
    ON we.worker_id = w.worker_id
    AND we.organization_id = hp.org_id
    AND we.starts_on = COALESCE(he.joining_date, he.created_at::date)
WHERE he.deleted_at IS NULL AND we.worker_engagement_id IS NULL;
-- Target: 0

-- 4. Name parity: spot-check 20 random people
SELECT
  op.first_name, op.last_name, op.work_email,
  hp.first_name AS hp_first, hp.last_name AS hp_last, hp.work_email AS hp_email
FROM organization_people op
  JOIN hr_people hp
    ON hp.org_id = op.organization_id AND hp.user_id = op.user_id
WHERE op.first_name <> hp.first_name OR op.last_name <> hp.last_name
LIMIT 20;
-- Review any rows returned for data quality.
```

**Gate:** all four checks must pass (0 rows for checks 1–3, operator-reviewed output
for check 4) before Step 9 proceeds.

---

## Step 9 — Read cutover: directory service as primary read for people / workers

**What this does.** The `DirectoryService` currently references tables that exist only
as Drizzle TS (pre-Step 1). After Step 1 the tables are live and after Steps 5–7 they
have data. This step formally makes the directory service the canonical read path for
people and workers inside the Directory module. No new code is written — the existing
service is already correct. The step is a deployment + smoke-test confirmation.

### Pre-condition gate

- Step 8: all parity checks pass.
- The backend is deployed with the directory tables live.

### Validation

```bash
# Hit the directory API as an admin user and confirm responses
GET /directory/people?orgId=<org_id>&page=1&limit=10
# Expect: 200, data array with real name rows, not empty

GET /directory/workers?orgId=<org_id>&page=1&limit=10
# Expect: 200, workers joined with person name rows

GET /directory/workers/<worker_id>/engagements
# Expect: 200, engagement rows matching hr_employments count
```

Feature flag: if the deployment uses a feature flag, set `DIRECTORY_READ_PRIMARY=true`
in the environment and confirm the `/directory/**` routes respond correctly before
removing the flag.

---

## Step 10 — Read cutover: notifications + CRM automation off user_memberships

**What this does.** Two services currently read `user_memberships` for org-membership
resolution:

1. `backend/src/modules/notifications/broadcasts.service.ts` — resolves `userId` lists
   for broadcast audiences (by-user, by-department, org-wide).
2. `backend/src/modules/crm-automation-studio/crm-automation-runner.service.ts` —
   validates that a target `userId` is a member of the org before assigning.

Both must be migrated to read from `organization_members` (the canonical membership
table) instead of `user_memberships`. `organization_people` is not used here because
these operations require a confirmed login identity, not just a directory person.

### Backend change plan

**`broadcasts.service.ts`**

Replace all `userMemberships` queries with `organizationMembers`:

```ts
// Before (resolveAudienceByUserIds):
.select({ userId: userMemberships.userId })
.from(userMemberships)
.where(and(eq(userMemberships.orgId, orgId), inArray(userMemberships.userId, ids)));

// After:
.select({ userId: organizationMembers.userId })
.from(organizationMembers)
.where(and(
  eq(organizationMembers.orgId, orgId),
  inArray(organizationMembers.userId, ids),
  eq(organizationMembers.status, 'ACTIVE'),  // only active members receive broadcasts
));
```

Department-scoped audience: `user_memberships.department_id` is an `integer` FK;
`organization_members` has no department. The correct target is `worker_engagements.department_id`
(via `workers` → `organization_people` → `organization_members`). Join path:

```sql
SELECT om.user_id
FROM organization_members om
  JOIN organization_people op
    ON op.organization_id = om.org_id AND op.organization_membership_id = om.id
  JOIN workers w ON w.organization_id = op.organization_id
    AND w.organization_person_id = op.organization_person_id
  JOIN worker_engagements we ON we.worker_id = w.worker_id
    AND we.organization_id = w.organization_id
    AND we.status = 'ACTIVE' AND we.is_primary = true
WHERE om.org_id = $orgId
  AND we.department_id = ANY($deptIds)
  AND om.status = 'ACTIVE';
```

Org-wide audience: replace `userMemberships` with `organizationMembers` filtered to
`status = 'ACTIVE'`.

**`crm-automation-runner.service.ts`**

Replace membership check:

```ts
// Before:
.select({ userId: userMemberships.userId })
.from(userMemberships)
.where(and(eq(userMemberships.orgId, orgId), eq(userMemberships.userId, targetUserId)))

// After:
.select({ userId: organizationMembers.userId })
.from(organizationMembers)
.where(and(
  eq(organizationMembers.orgId, orgId),
  eq(organizationMembers.userId, targetUserId),
  eq(organizationMembers.status, 'ACTIVE'),
))
```

### Pre-condition gate

- Step 9 complete (directory tables are live with data).
- The new join path for department-scoped audiences has been unit-tested with both
  empty and populated `worker_engagements` fixtures.
- No RBAC permission key changes required (these are internal service reads).

### What to verify

```bash
# Send a broadcast to a specific userId — confirm it resolves correctly
POST /notifications/broadcasts
{ "audience": { "userIds": ["<known_user_id>"] }, "message": "test", "orgId": "<org>" }
# Expect: notification delivered, no 500 errors in logs

# Department broadcast with a known department
POST /notifications/broadcasts
{ "audience": { "departmentIds": [<dept_id>] }, ... }
# Expect: members in that department receive the notification

# CRM automation: trigger an automation with an assign-to-user action
# Expect: the user lookup succeeds for an active member, fails for non-member
```

---

## Step 11 — Contract: retire user_memberships as placement authority

**What this does.** After Step 10, `user_memberships` is only written by
`user-profile.service.ts` (`getMembership` / `updateMembership`). The `getMembership`
endpoint is still surfaced to the UI (People → Membership tab). This is the riskiest
step because:

1. `user_memberships` stores placement fields (dept, BU, branch, team, manager) that
   have not yet been fully migrated to `worker_engagements`.
2. The `updateMembership` write path updates `user_memberships` — after retirement it
   must write to `worker_engagements` instead.
3. The `getMembership` read path returns placement data — after retirement it must read
   from `worker_engagements` joined through `workers` → `organization_people`.

### Phase A — Dual-write (tolerant backend)

Modify `user-profile.service.ts` `updateMembership` to write placement fields to
`worker_engagements` (the active primary engagement) in addition to (not instead of)
`user_memberships`. This gives a shadow-write parity period before the old table is
dropped.

Fields that map:

| `user_memberships` | `worker_engagements` |
|---|---|
| `department_id` (int) | `department_id` (text — cast to text) |
| `branch_id` (int) | `branch_id` (text — cast to text) |
| `business_unit_id` (text) | `business_unit_id` (text) |
| `team_id` (text) | `team_id` (text) |
| `manager_user_id` (text → users.id) | `manager_engagement_id` — requires resolving the manager's active primary engagement |

The `manager_user_id → manager_engagement_id` resolution requires a join:

```ts
const managerEngagement = await this.db
  .select({ workerEngagementId: workerEngagements.workerEngagementId })
  .from(workerEngagements)
  .innerJoin(workers, eq(workers.workerId, workerEngagements.workerId))
  .innerJoin(organizationPeople,
    and(
      eq(organizationPeople.organizationPersonId, workers.organizationPersonId),
      eq(organizationPeople.userId, data.managerUserId),
    ))
  .where(and(
    eq(workerEngagements.organizationId, orgId),
    eq(workerEngagements.status, 'ACTIVE'),
    eq(workerEngagements.isPrimary, true),
  ))
  .limit(1);
// Use null if no active engagement exists for the manager yet.
```

### Phase B — Read from worker_engagements (shadow-compare)

During the dual-write period, run a background reconciliation query to compare what
`getMembership` returns from `user_memberships` vs. what would be returned from
`worker_engagements`. Log discrepancies. Target: zero discrepancies before Phase C.

```sql
SELECT
  um.user_id,
  um.org_id,
  um.department_id::text AS um_dept,
  we.department_id        AS we_dept,
  um.business_unit_id    AS um_bu,
  we.business_unit_id    AS we_bu
FROM user_memberships um
  JOIN organization_people op ON op.organization_id = um.org_id AND op.user_id = um.user_id
  JOIN workers w ON w.organization_id = op.organization_id
    AND w.organization_person_id = op.organization_person_id
  JOIN worker_engagements we ON we.worker_id = w.worker_id
    AND we.status = 'ACTIVE' AND we.is_primary = true
WHERE um.department_id::text IS DISTINCT FROM we.department_id
   OR um.business_unit_id IS DISTINCT FROM we.business_unit_id
LIMIT 50;
```

### Phase C — Read cutover to worker_engagements

Modify `getMembership` in `user-profile.service.ts` to read from `worker_engagements`
(via `workers` → `organization_people`) as the primary source, with `user_memberships`
as a fallback for rows that have no worker record yet.

### Phase D — Drop user_memberships

**Gate (all must be true before dropping):**

1. `user_memberships` has received zero net-new writes for at least 14 calendar days
   (monitor via write counts in audit logs or a counter column).
2. The reconciliation query in Phase B returns 0 rows.
3. The CRM automation and notifications services are confirmed off `user_memberships`
   (Step 10).
4. No other module (confirmed by global grep) reads `user_memberships`.
5. A confirmed backup snapshot has been taken.

```bash
# Final grep before drop — must return zero backend TS files
grep -r "userMemberships\|user_memberships" backend/src --include="*.ts"
# Expected: 0 results (schema file excluded by soft-deletion)
```

```sql
-- Drop in a single transaction
BEGIN;
DROP TABLE user_memberships;
COMMIT;
```

Remove `user_memberships` from `backend/src/db/schema/user-management.ts` and
`backend/src/db/schema/index.ts`, then run `pnpm -C backend typecheck` to confirm
nothing references the removed export.

### Rollback (Phase D only)

```sql
-- Recreate table from the last migration snapshot.
-- All data is gone — requires restore from the Phase D pre-snapshot.
-- This is why the 14-day dual-write window and the backup gate are mandatory.
```

---

## Risk register

| Step | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| 1 | `workerEngagementStatusEnum` already declared as a Postgres type from an earlier partial push | Low | Medium | `db:generate` uses `IF NOT EXISTS`; check enum before running |
| 2 | `btree_gist` extension requires superuser — Neon does not grant superuser to app roles | Medium | High | Neon supports `btree_gist` via the platform; confirm with `\dx` before running; if unavailable, replace with a deferred trigger enforcing the same invariant |
| 4 | `hr_people.work_email` NOT NULL is relied on by a DTO that is not scanned | Medium | Low | Grep `workEmail` in `backend/src/modules/hr` before applying; fix any non-optional Zod schemas |
| 5 | Backfill produces wrong `first_name` for members whose name lives only in `users.name` as a full name (not split) | High | Low | The quarantine table captures these; human review step is mandatory |
| 7 | `joining_date` is NULL on some `hr_employments` rows (pre-hire candidates) — backfill uses `created_at::date` as fallback | Medium | Low | Acceptable; operator can correct individual rows after backfill |
| 7 | EXCLUSION constraint blocks backfill of overlapping historical engagements that HRMS allowed | Low | Medium | Insert non-primary engagements first; if constraint triggers, insert those rows as `CANCELLED` status to exclude them from the constraint WHERE clause |
| **11** | **`user_memberships` retirement is the riskiest step** — it is actively written by `user-profile.service.ts` and read by `broadcasts.service.ts` for audience resolution; dropping it prematurely breaks notifications for all orgs | **High** | **High** | The mandatory 14-day dual-write window, zero-discrepancy gate, grep verification, and pre-drop backup snapshot are non-negotiable; no exception to the Phase D gate checklist |

---

## Sequencing summary and time estimates

| Step | Description | Estimate | Blocks |
|---|---|---|---|
| 1 | Generate + apply directory migration | 1 hour | Steps 2–11 |
| 2 | EXCLUSION constraint migration | 2 hours | Step 7 |
| 3 | Add employer_legal_entity_id | 30 min | Wave 6 |
| 4 | Fix hr_people.work_email nullable | 1 hour | Step 5 |
| 5 | Backfill organization_people | 2–4 hours (includes quarantine review) | Steps 6–11 |
| 6 | Link organization_members ↔ organization_people | 1 hour | Step 9 |
| 7 | Backfill workers + worker_engagements | 2–4 hours | Steps 8–9 |
| 8 | Shadow-compare parity audit | 1 hour (read-only) | Step 9 |
| 9 | Directory service read cutover | 30 min (deploy + smoke) | Step 10 |
| 10 | notifications + CRM cutover off user_memberships | 3–5 hours (code + tests) | Step 11 |
| 11 | Retire user_memberships (four phases + 14-day gate) | 14+ days elapsed | Wave 5 |

**Total calendar time:** approximately 15–18 days, dominated by the mandatory dual-write
observation window in Step 11.

---

## Definition of done for Wave 3

- All three directory tables exist in the live DB with all indexes and constraints.
- The EXCLUSION constraint (`excl_worker_engagements_no_overlap`) is live and tested.
- `employer_legal_entity_id` column exists (nullable) on `worker_engagements`.
- `hr_people.work_email` is nullable with a filtered unique index.
- `organization_people`, `workers`, and `worker_engagements` are populated from
  existing sources with zero unresolved quarantine rows.
- `organization_members ↔ organization_people` link backfilled for all user-linked people.
- `notifications/broadcasts.service.ts` reads `organization_members` — confirmed by test.
- `crm-automation-runner.service.ts` reads `organization_members` — confirmed by test.
- `user_memberships` table is dropped and removed from the schema.
- `PAGES.md` updated: Wave 3 checked off.
- Build ✓ · Lint ✓ · Types ✓ · all pre-existing tests pass.
