---
type: wave-3 patch spec
status: DRAFT
date: 2026-07-26
migration_sequence: 0305–0309
depends_on: Wave 1 (owner_membership_id NOT NULL), Wave 2 (org_modules unify)
---

# Wave 3 — Directory Migration Patch Spec

> Implementation-ready SQL for generating and applying the missing directory/workforce
> migration. Read `docs/schema-migration/wave-3-execution-plan.md` for sequencing gates
> and rollback plans. This document answers the single question: **what SQL, exactly,
> must be generated or hand-authored, and why?**

---

## Summary: db:generate vs. raw SQL

| Migration file | Source | Reason |
|---|---|---|
| `0305_directory_tables.sql` | `db:generate` | Drizzle can express all three tables + indexes + composite FKs |
| `0306_worker_engagements_exclusion.sql` | raw SQL (hand-written, appended to journal) | Drizzle has no `EXCLUDE USING gist` builder |
| `0307_worker_engagements_legal_entity.sql` | `db:generate` (after TS edit) | Plain `ADD COLUMN` + index |
| `0308_hr_people_work_email_nullable.sql` | `db:generate` (after TS edit) | `DROP NOT NULL` + drop/recreate filtered unique index |
| `0309_backfill_organization_people.sql` | raw SQL (run once, idempotent) | DML backfill; Drizzle never generates DML |

---

## 1. Expected `db:generate` output — `0305_directory_tables.sql`

This is the exact SQL Drizzle ORM should emit when you run `pnpm -C backend db:generate`
against the current TS files in `backend/src/db/schema/directory/`. Verify the generated
file matches before applying.

### 1a. Enum (from `backend/src/db/schema/enums.ts` — already declared)

Drizzle emits enum creation before the table that first references it. Because
`workerEngagementStatusEnum` is declared in `enums.ts` alongside other enums, Drizzle
may have already emitted it in an earlier migration if those other enums were generated
at the same time. **Check first:**

```sql
SELECT typname FROM pg_type WHERE typname = 'worker_engagement_status';
```

If the type does not exist, the generated migration will include:

```sql
DO $$ BEGIN
  CREATE TYPE "public"."worker_engagement_status"
    AS ENUM ('PLANNED', 'ACTIVE', 'COMPLETED', 'TERMINATED', 'CANCELLED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
```

If it already exists (from a prior partial `db:push`), Drizzle emits nothing for the
enum and the table DDL references it directly. The `DO $$ ... EXCEPTION` block is
idempotent either way.

### 1b. `organization_people` table

Source: `backend/src/db/schema/directory/organization-people.ts`

```sql
CREATE TABLE IF NOT EXISTS "organization_people" (
  "organization_person_id"    text        PRIMARY KEY,
  "organization_id"           text        NOT NULL
    REFERENCES "organizations"("id") ON DELETE CASCADE,
  "user_id"                   text
    REFERENCES "users"("id") ON DELETE SET NULL,
  "organization_membership_id" integer
    REFERENCES "organization_members"("id") ON DELETE SET NULL,
  "first_name"                text        NOT NULL,
  "last_name"                 text        NOT NULL,
  "display_name"              text,
  "preferred_name"            text,
  "work_email"                text,
  "personal_email"            text,
  "phone"                     text,
  "whatsapp_number"           text,
  "avatar_url"                text,
  "date_of_birth"             date,
  "gender"                    text,
  "nationality"               text,
  "timezone"                  text,
  "language_code"             text        DEFAULT 'en',
  "address"                   jsonb,
  "emergency_contact"         jsonb,
  "linkedin_url"              text,
  "github_url"                text,
  "bio"                       text,
  "deleted_at"                timestamp,
  "created_at"                timestamp   NOT NULL DEFAULT now(),
  "updated_at"                timestamp   NOT NULL DEFAULT now()
);

-- Composite unique on (org_id, organization_person_id) — from unique()
CREATE UNIQUE INDEX "uniq_org_people_org_person"
  ON "organization_people" ("organization_id", "organization_person_id");

-- Filtered unique: at most one person per (org, user) where user_id is set
CREATE UNIQUE INDEX "uniq_org_people_org_user"
  ON "organization_people" ("organization_id", "user_id")
  WHERE user_id IS NOT NULL;

-- Filtered unique: at most one person per (org, membership) where membership is set
CREATE UNIQUE INDEX "uniq_org_people_org_membership"
  ON "organization_people" ("organization_id", "organization_membership_id")
  WHERE organization_membership_id IS NOT NULL;

-- Filtered unique: at most one person per (org, work_email) where email is set
CREATE UNIQUE INDEX "uniq_org_people_org_work_email"
  ON "organization_people" ("organization_id", "work_email")
  WHERE work_email IS NOT NULL;

-- Supporting indexes
CREATE INDEX "idx_org_people_org"        ON "organization_people" ("organization_id");
CREATE INDEX "idx_org_people_user"       ON "organization_people" ("user_id");
CREATE INDEX "idx_org_people_membership" ON "organization_people" ("organization_membership_id");
```

**Notes on `$defaultFn(() => randomUUID())`:** Drizzle's `$defaultFn` is an
application-layer default — it does NOT emit a `DEFAULT gen_random_uuid()` in SQL. The
PK has no SQL-level default; Drizzle's ORM layer always supplies the UUID before INSERT.
This means a raw `INSERT` without going through Drizzle ORM must supply
`organization_person_id` explicitly. The backfill queries in Section 5 use
`gen_random_uuid()` for this reason.

### 1c. `workers` table

Source: `backend/src/db/schema/directory/workers.ts`

```sql
CREATE TABLE IF NOT EXISTS "workers" (
  "worker_id"              text        PRIMARY KEY,
  "organization_id"        text        NOT NULL
    REFERENCES "organizations"("id") ON DELETE CASCADE,
  "organization_person_id" text        NOT NULL,
  "worker_number"          text,
  "status"                 text        NOT NULL DEFAULT 'INACTIVE',
  "is_payee"               boolean     NOT NULL DEFAULT false,
  "deleted_at"             timestamp,
  "created_at"             timestamp   NOT NULL DEFAULT now(),
  "updated_at"             timestamp   NOT NULL DEFAULT now(),

  -- Composite FK to organization_people (org_id, org_person_id)
  -- Enforces: a worker's person record must belong to the same org
  CONSTRAINT "fk_workers_org_person"
    FOREIGN KEY ("organization_id", "organization_person_id")
    REFERENCES "organization_people" ("organization_id", "organization_person_id")
    ON DELETE RESTRICT
);

-- Composite unique on (org_id, worker_id) — redundant with PK but explicit for FKs
CREATE UNIQUE INDEX "uniq_workers_org_worker"
  ON "workers" ("organization_id", "worker_id");

-- One worker record per person per org
CREATE UNIQUE INDEX "uniq_workers_org_person"
  ON "workers" ("organization_id", "organization_person_id");

-- Filtered unique: worker_number is unique within org when set
CREATE UNIQUE INDEX "uniq_workers_org_number"
  ON "workers" ("organization_id", "worker_number")
  WHERE worker_number IS NOT NULL;

-- Supporting indexes
CREATE INDEX "idx_workers_org"        ON "workers" ("organization_id");
CREATE INDEX "idx_workers_person"     ON "workers" ("organization_person_id");
CREATE INDEX "idx_workers_org_status" ON "workers" ("organization_id", "status");
```

**Note on `status` column:** The TS uses `.$type<"ACTIVE" | "INACTIVE" | "EXITED">()` —
this is a TypeScript-only type brand. Drizzle emits `text` in SQL with no CHECK
constraint. If you want a DB-level check, add it in a companion raw SQL migration; it is
not in the current TS.

### 1d. `worker_engagements` table

Source: `backend/src/db/schema/directory/worker-engagements.ts`

```sql
CREATE TABLE IF NOT EXISTS "worker_engagements" (
  "worker_engagement_id"  text        PRIMARY KEY,
  "organization_id"       text        NOT NULL
    REFERENCES "organizations"("id") ON DELETE CASCADE,
  "worker_id"             text        NOT NULL,
  "starts_on"             date        NOT NULL,
  "ends_on"               date,
  "worker_type"           text        NOT NULL,
  "status"                "worker_engagement_status" NOT NULL DEFAULT 'PLANNED',
  "is_primary"            boolean     NOT NULL DEFAULT false,
  "department_id"         text,
  "business_unit_id"      text,
  "branch_id"             text,
  "location_id"           text,
  "team_id"               text,
  "manager_engagement_id" text,
  "designation"           text,
  "job_role_id"           integer,
  "job_level_id"          integer,
  "employment_type_id"    integer,
  "probation_ends_on"     date,
  "notice_period_days"    integer,
  "termination_reason"    text,
  "termination_notes"     text,
  "created_by"            text
    REFERENCES "users"("id") ON DELETE SET NULL,
  "created_at"            timestamp   NOT NULL DEFAULT now(),
  "updated_at"            timestamp   NOT NULL DEFAULT now(),

  -- Composite FK: engagement's worker must belong to the same org
  CONSTRAINT "fk_worker_engagements_org_worker"
    FOREIGN KEY ("organization_id", "worker_id")
    REFERENCES "workers" ("organization_id", "worker_id")
    ON DELETE CASCADE
);

-- Composite unique on (org_id, engagement_id) — for FK targets from overlay tables
CREATE UNIQUE INDEX "uniq_worker_engagements_org_engagement"
  ON "worker_engagements" ("organization_id", "worker_engagement_id");

-- At most one active primary engagement per worker per org (partial unique)
CREATE UNIQUE INDEX "uniq_worker_engagements_active_primary"
  ON "worker_engagements" ("organization_id", "worker_id")
  WHERE (is_primary = true AND status = 'ACTIVE');

-- Supporting indexes
CREATE INDEX "idx_worker_engagements_org"        ON "worker_engagements" ("organization_id");
CREATE INDEX "idx_worker_engagements_worker"      ON "worker_engagements" ("worker_id");
CREATE INDEX "idx_worker_engagements_org_status"  ON "worker_engagements" ("organization_id", "status");
CREATE INDEX "idx_worker_engagements_org_starts"  ON "worker_engagements" ("organization_id", "starts_on");
CREATE INDEX "idx_worker_engagements_manager"     ON "worker_engagements" ("manager_engagement_id");
```

**Note on `worker_type` column:** Same pattern as `workers.status` — TS brand only,
Drizzle emits plain `text` with no CHECK constraint.

**Verification query after Step 1:**

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('organization_people', 'workers', 'worker_engagements');
-- Must return 3 rows.

SELECT indexname, tablename
FROM pg_indexes
WHERE tablename IN ('organization_people', 'workers', 'worker_engagements')
  AND indexname LIKE 'uniq_%'
ORDER BY tablename, indexname;
-- Expected 8 unique indexes:
--   organization_people: uniq_org_people_org_membership, uniq_org_people_org_person,
--                        uniq_org_people_org_user, uniq_org_people_org_work_email
--   worker_engagements:  uniq_worker_engagements_active_primary,
--                        uniq_worker_engagements_org_engagement
--   workers:             uniq_workers_org_number, uniq_workers_org_person,
--                        uniq_workers_org_worker

SELECT constraint_name, table_name
FROM information_schema.table_constraints
WHERE table_name IN ('workers', 'worker_engagements')
  AND constraint_name IN ('fk_workers_org_person', 'fk_worker_engagements_org_worker');
-- Must return 2 rows.
```

---

## 2. Raw SQL migration — `0306_worker_engagements_exclusion.sql`

**Why hand-authored:** Drizzle ORM has no `EXCLUDE USING gist` builder. This constraint
must be written manually and appended to the Drizzle journal after the Step 1 generated
file. The journal entry must be added to `backend/migrations/meta/_journal.json` with
the same format as other entries (tag `0306_worker_engagements_exclusion`, breakpoints
`false`).

**Neon note:** Neon Postgres supports `btree_gist` as a pre-installed extension available
to the app role via `CREATE EXTENSION IF NOT EXISTS`. Confirm with
`SELECT * FROM pg_extension WHERE extname = 'btree_gist';` before running. If absent,
`CREATE EXTENSION` will install it without superuser in Neon's shared infrastructure. If
it is unavailable (e.g. a restricted Neon plan), the alternative is a BEFORE INSERT/UPDATE
trigger enforcing the same check — document this as a fallback only.

**File: `backend/migrations/0306_worker_engagements_exclusion.sql`**

```sql
-- Wave 3 Step 2: EXCLUSION constraint for non-overlapping worker engagements.
-- Drizzle cannot express EXCLUDE USING gist; this file is hand-authored.
-- Do not edit worker-engagements.ts to try to remove this — the journal owns it.

-- Enable btree_gist (idempotent; required for gist index on equality of scalar columns)
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Overlap constraint: no two PLANNED or ACTIVE engagements for the same worker
-- may cover overlapping date ranges. CANCELLED, TERMINATED, COMPLETED statuses
-- are excluded from the constraint so historical records do not block new ones.
--
-- daterange('[)') = inclusive start, exclusive end.
-- COALESCE(ends_on, '9999-12-31'::date) treats open-ended engagements as
-- running indefinitely, so an open + a later fixed one correctly conflict.
ALTER TABLE "worker_engagements"
  ADD CONSTRAINT "excl_worker_engagements_no_overlap"
  EXCLUDE USING gist (
    worker_id WITH =,
    daterange(starts_on, COALESCE(ends_on, '9999-12-31'::date), '[)') WITH &&
  )
  WHERE (status IN ('PLANNED', 'ACTIVE'));
```

**Companion note to add in `worker-engagements.ts`** (as a file-level JSDoc above the
table declaration — not an inline comment):

```ts
/**
 * EXCLUSION CONSTRAINT NOTE
 * The `excl_worker_engagements_no_overlap` constraint (btree_gist EXCLUDE USING gist)
 * is declared in migration `0306_worker_engagements_exclusion.sql` because Drizzle ORM
 * has no builder for EXCLUDE USING gist. Do not attempt to drop or recreate it via
 * db:push — the journal owns it. Any schema change touching starts_on, ends_on, or
 * status must account for this constraint.
 */
```

**Verification:**

```sql
SELECT conname, contype
FROM pg_constraint
WHERE conrelid = 'worker_engagements'::regclass
  AND conname = 'excl_worker_engagements_no_overlap';
-- contype must be 'x' (exclusion).

-- Smoke test (run in a transaction you roll back):
BEGIN;
INSERT INTO worker_engagements
  (worker_engagement_id, organization_id, worker_id,
   starts_on, ends_on, worker_type, status, is_primary)
VALUES
  (gen_random_uuid(), 'test-org', 'test-worker',
   '2025-01-01', '2025-12-31', 'FULL_TIME', 'ACTIVE', false),
  (gen_random_uuid(), 'test-org', 'test-worker',
   '2025-06-01', NULL, 'FULL_TIME', 'ACTIVE', false);
-- Must raise: ERROR 23P01 exclusion_violation
ROLLBACK;
```

---

## 3. `employer_legal_entity_id` column — `0307_worker_engagements_legal_entity.sql`

**Generated by `db:generate` after the following TS edit to
`backend/src/db/schema/directory/worker-engagements.ts`.**

### TS change

Add after the `designation` column (before `jobRoleId`):

```ts
employerLegalEntityId: text("employer_legal_entity_id"),
// FK to legal_entities will be added in Wave 6+ when that table lands:
// foreignKey({ columns: [table.organizationId, table.employerLegalEntityId],
//   foreignColumns: [legalEntities.organizationId, legalEntities.id],
//   name: 'fk_worker_engagements_legal_entity' })
```

Add to the table config array (indexes):

```ts
index("idx_worker_engagements_legal_entity").on(table.employerLegalEntityId),
```

### Expected generated SQL

```sql
ALTER TABLE "worker_engagements"
  ADD COLUMN "employer_legal_entity_id" text;

CREATE INDEX "idx_worker_engagements_legal_entity"
  ON "worker_engagements" ("employer_legal_entity_id");
```

**Verification:**

```sql
SELECT column_name, is_nullable, data_type
FROM information_schema.columns
WHERE table_name = 'worker_engagements'
  AND column_name = 'employer_legal_entity_id';
-- is_nullable: YES, data_type: text

SELECT indexname
FROM pg_indexes
WHERE tablename = 'worker_engagements'
  AND indexname = 'idx_worker_engagements_legal_entity';
-- Must return 1 row.
```

---

## 4. `hr_people.work_email` nullable + filtered unique index — `0308_hr_people_work_email_nullable.sql`

**Generated by `db:generate` after the following TS edit to
`backend/src/db/schema/hr/core-people.ts`.**

### TS change

```ts
// Line 85 — before:
workEmail: text("work_email").notNull(),

// After:
workEmail: text("work_email"),
```

Replace the `uniqueIndex` in the table config:

```ts
// Before:
uniqueIndex("uniq_hr_people_org_work_email").on(table.orgId, table.workEmail),

// After:
uniqueIndex("uniq_hr_people_org_work_email")
  .on(table.orgId, table.workEmail)
  .where(sql`work_email IS NOT NULL`),
```

(The `sql` tagged template import is already present in `core-people.ts` via
`drizzle-orm`; add `import { sql } from "drizzle-orm"` if absent.)

### Expected generated SQL

```sql
ALTER TABLE "hr_people"
  ALTER COLUMN "work_email" DROP NOT NULL;

DROP INDEX IF EXISTS "uniq_hr_people_org_work_email";

CREATE UNIQUE INDEX "uniq_hr_people_org_work_email"
  ON "hr_people" ("org_id", "work_email")
  WHERE (work_email IS NOT NULL);
```

**Pre-flight check before applying:** confirm no NULLs currently violate the old NOT NULL
constraint (there should be none, but verify):

```sql
SELECT count(*) FROM hr_people WHERE work_email IS NULL;
-- Expect 0. If non-zero, these rows pre-date the constraint and must be reviewed
-- before making the column nullable (they already violate it and cannot exist
-- under the current schema — investigate data integrity first).
```

**Post-apply verification:**

```sql
SELECT is_nullable
FROM information_schema.columns
WHERE table_name = 'hr_people' AND column_name = 'work_email';
-- Expect: YES

SELECT indexdef
FROM pg_indexes
WHERE tablename = 'hr_people' AND indexname = 'uniq_hr_people_org_work_email';
-- Must include: WHERE (work_email IS NOT NULL)

-- Confirm no existing non-null duplicates were exposed by dropping the old index
SELECT org_id, work_email, count(*)
FROM hr_people
WHERE work_email IS NOT NULL
GROUP BY org_id, work_email
HAVING count(*) > 1;
-- Expect 0 rows. If any exist, the new filtered unique index creation will have failed.
```

**Backend service audit required after this migration:**
Search `backend/src/modules/hr` for `workEmail` and ensure every DTO that writes
`hr_people.work_email` uses `z.string().email().optional()` (not `.min(1)` or
`.notNull()`). Display code must render "—" or "No work email" for null values.

---

## 5. Backfill queries — `0309_backfill_organization_people.sql`

This file is **never generated by Drizzle** — it is pure DML. It must be added to the
journal manually (same process as `0306`) and run idempotently after Steps 1–4 are
confirmed live.

**Because `organization_person_id`, `worker_id`, and `worker_engagement_id` use
`$defaultFn(() => randomUUID())` (application-layer default, no SQL DEFAULT), all three
INSERT statements must supply UUIDs via `gen_random_uuid()`.**

```sql
-- ============================================================
-- Wave 3 Step 5–7: Backfill organization_people, workers, worker_engagements
-- Idempotent: all INSERTs use ON CONFLICT DO NOTHING.
-- Run AFTER Steps 1–4 are verified live.
-- ============================================================

-- 0. Quarantine table for ambiguous rows requiring human review
CREATE TABLE IF NOT EXISTS _directory_backfill_quarantine (
  id         bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  source     text        NOT NULL,
  org_id     text        NOT NULL,
  user_id    text,
  reason     text        NOT NULL,
  raw_data   jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- STEP 5A: Seed organization_people from hr_people (most authoritative source).
--   hr_people holds first_name, last_name, work_email, and rich profile data.
--   The filtered unique index uniq_org_people_org_user prevents duplicate
--   (org_id, user_id) rows; ON CONFLICT DO NOTHING makes this idempotent.
-- ============================================================
INSERT INTO organization_people (
  organization_person_id,
  organization_id,
  user_id,
  first_name,
  last_name,
  work_email,
  personal_email,
  phone,
  date_of_birth,
  gender,
  nationality,
  address,
  emergency_contact,
  avatar_url,
  created_at,
  updated_at
)
SELECT
  gen_random_uuid()        AS organization_person_id,
  hp.org_id                AS organization_id,
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
ON CONFLICT DO NOTHING;
-- Conflict target: uniq_org_people_org_user (org_id, user_id) WHERE user_id IS NOT NULL.
-- hr_people rows with user_id IS NULL will not conflict (filtered index); they insert
-- fresh. Multiple NULL-user_id hr_people rows for the same org are allowed here
-- (offline workers). If that is undesirable, add a dedup step before this insert.

-- ============================================================
-- STEP 5B: Seed from user_memberships for members with no hr_people record.
--   These members have a login identity but no HRMS record.
--   Name is derived from users.name (may be a full name in one field —
--   the quarantine step below will flag these for human split).
-- ============================================================
INSERT INTO organization_people (
  organization_person_id,
  organization_id,
  user_id,
  organization_membership_id,
  first_name,
  last_name,
  created_at,
  updated_at
)
SELECT
  gen_random_uuid()                                       AS organization_person_id,
  um.org_id                                              AS organization_id,
  um.user_id,
  NULL::integer                                          AS organization_membership_id,
  -- Prefer users.first_name; fall back to the full users.name; last resort: email prefix
  COALESCE(
    NULLIF(u.first_name, ''),
    SPLIT_PART(COALESCE(u.name, u.email), ' ', 1)
  )                                                      AS first_name,
  COALESCE(
    NULLIF(u.last_name, ''),
    CASE
      WHEN u.name IS NOT NULL AND POSITION(' ' IN u.name) > 0
        THEN SUBSTRING(u.name FROM POSITION(' ' IN u.name) + 1)
      ELSE ''
    END
  )                                                      AS last_name,
  um.created_at,
  um.updated_at
FROM user_memberships um
  JOIN users u ON u.id = um.user_id
  LEFT JOIN organization_people op
    ON op.organization_id = um.org_id AND op.user_id = um.user_id
WHERE op.organization_person_id IS NULL
ON CONFLICT DO NOTHING;

-- ============================================================
-- STEP 5C: Seed from organization_members for members not covered by either
--   hr_people or user_memberships. These are login-only members in orgs that
--   have never used HRMS or the user_memberships placement system.
-- ============================================================
INSERT INTO organization_people (
  organization_person_id,
  organization_id,
  user_id,
  organization_membership_id,
  first_name,
  last_name,
  created_at,
  updated_at
)
SELECT
  gen_random_uuid()                                       AS organization_person_id,
  om.org_id                                              AS organization_id,
  om.user_id,
  om.id                                                  AS organization_membership_id,
  COALESCE(
    NULLIF(u.first_name, ''),
    SPLIT_PART(COALESCE(u.name, u.email), ' ', 1)
  )                                                      AS first_name,
  COALESCE(
    NULLIF(u.last_name, ''),
    CASE
      WHEN u.name IS NOT NULL AND POSITION(' ' IN u.name) > 0
        THEN SUBSTRING(u.name FROM POSITION(' ' IN u.name) + 1)
      ELSE ''
    END
  )                                                      AS last_name,
  om.joined_at                                           AS created_at,
  om.joined_at                                           AS updated_at
FROM organization_members om
  JOIN users u ON u.id = om.user_id
  LEFT JOIN organization_people op
    ON op.organization_id = om.org_id AND op.user_id = om.user_id
WHERE op.organization_person_id IS NULL
ON CONFLICT DO NOTHING;

-- ============================================================
-- STEP 5D: Quarantine rows with ambiguous / missing names for human review.
--   Flag rows where first_name fell back to the user_id itself (meaning
--   the users row had no first_name, no name, and no email — pathological data),
--   or where last_name is empty (single-token name, needs manual split).
-- ============================================================
INSERT INTO _directory_backfill_quarantine
  (source, org_id, user_id, reason, raw_data)
SELECT
  'step5_name_fallback'                                  AS source,
  op.organization_id                                     AS org_id,
  op.user_id,
  CASE
    WHEN op.last_name = '' THEN 'last_name_empty_needs_split'
    ELSE                        'first_name_is_id_or_email_prefix'
  END                                                    AS reason,
  jsonb_build_object(
    'organization_person_id', op.organization_person_id,
    'first_name',             op.first_name,
    'last_name',              op.last_name
  )                                                      AS raw_data
FROM organization_people op
WHERE op.last_name = ''
   OR op.first_name = op.user_id
ON CONFLICT DO NOTHING;

-- ============================================================
-- STEP 6: Backfill organization_membership_id on people who came from
--   hr_people (Step 5A) — they were inserted without a membership link.
--   Match by (org_id, user_id).
-- ============================================================
UPDATE organization_people op
SET    organization_membership_id = om.id
FROM   organization_members om
WHERE  om.org_id   = op.organization_id
  AND  om.user_id  = op.user_id
  AND  op.organization_membership_id IS NULL
  AND  op.user_id  IS NOT NULL;

-- Remaining unlinked people (no organization_members row for their user_id)
-- are offline/pre-hire workers — leave organization_membership_id NULL.
-- Quarantine them for awareness:
INSERT INTO _directory_backfill_quarantine
  (source, org_id, user_id, reason, raw_data)
SELECT
  'step6_no_membership_link'                             AS source,
  op.organization_id                                     AS org_id,
  op.user_id,
  'user_id_set_but_no_organization_members_row'          AS reason,
  jsonb_build_object(
    'organization_person_id', op.organization_person_id
  )                                                      AS raw_data
FROM organization_people op
WHERE op.user_id IS NOT NULL
  AND op.organization_membership_id IS NULL
ON CONFLICT DO NOTHING;

-- ============================================================
-- STEP 7A: Backfill workers from hr_people who have at least one hr_employment.
--   One worker row per person. worker_number = primary employment's employee_number.
--   status derived from the most recent employment lifecycle_status.
-- ============================================================
INSERT INTO workers (
  worker_id,
  organization_id,
  organization_person_id,
  worker_number,
  status,
  is_payee,
  created_at,
  updated_at
)
SELECT
  gen_random_uuid()                                       AS worker_id,
  op.organization_id,
  op.organization_person_id,
  primary_emp.employee_number                            AS worker_number,
  CASE
    WHEN EXISTS (
      SELECT 1 FROM hr_employments he2
      WHERE he2.person_id = hp.id
        AND he2.lifecycle_status IN ('ACTIVE','CONFIRMED','NOTICE','PROBATION','ONBOARDING')
        AND he2.deleted_at IS NULL
    ) THEN 'ACTIVE'
    WHEN EXISTS (
      SELECT 1 FROM hr_employments he2
      WHERE he2.person_id = hp.id
        AND he2.lifecycle_status IN ('EXITED','ALUMNI')
        AND he2.deleted_at IS NULL
    ) THEN 'EXITED'
    ELSE 'INACTIVE'
  END                                                    AS status,
  false                                                  AS is_payee,  -- Payroll module sets this
  hp.created_at,
  hp.updated_at
FROM hr_people hp
  JOIN organization_people op
    ON op.organization_id = hp.org_id AND op.user_id = hp.user_id
  -- Primary employment for worker_number lookup
  CROSS JOIN LATERAL (
    SELECT employee_number
    FROM   hr_employments
    WHERE  person_id   = hp.id
      AND  is_primary  = true
      AND  deleted_at  IS NULL
    ORDER BY created_at DESC
    LIMIT 1
  ) primary_emp
WHERE hp.deleted_at IS NULL
  AND EXISTS (
    SELECT 1 FROM hr_employments he
    WHERE he.person_id = hp.id AND he.deleted_at IS NULL
  )
ON CONFLICT ON CONSTRAINT "uniq_workers_org_person" DO NOTHING;

-- ============================================================
-- STEP 7B: Backfill worker_engagements from hr_employments.
--   Non-primary engagements first, primary last — safe for the EXCLUSION constraint.
--   The EXCLUSION constraint (Step 2) is already live; if any hr_employments rows
--   produced overlapping PLANNED/ACTIVE intervals (HRMS allowed this bug), the INSERT
--   will fail with 23P01 for those rows. Re-insert them as status='CANCELLED' to
--   bypass the constraint and add them to the quarantine table.
--
--   Lifecycle status mapping:
--     CANDIDATE, PRE_JOINING, ONBOARDING          → PLANNED
--     PROBATION, ACTIVE, CONFIRMED, NOTICE         → ACTIVE
--     EXITED, ALUMNI                               → COMPLETED
--     SUSPENDED                                    → ACTIVE (worker.status=EXITED is separate)
--     everything else                              → PLANNED
-- ============================================================
INSERT INTO worker_engagements (
  worker_engagement_id,
  organization_id,
  worker_id,
  starts_on,
  ends_on,
  worker_type,
  status,
  is_primary,
  department_id,
  location_id,
  designation,
  created_at,
  updated_at
)
SELECT
  gen_random_uuid()                                                    AS worker_engagement_id,
  w.organization_id,
  w.worker_id,
  COALESCE(he.joining_date, he.created_at::date)                      AS starts_on,
  COALESCE(he.last_working_day, he.exit_date)                         AS ends_on,
  he.worker_type::text,
  CASE he.lifecycle_status
    WHEN 'CANDIDATE'   THEN 'PLANNED'
    WHEN 'PRE_JOINING' THEN 'PLANNED'
    WHEN 'ONBOARDING'  THEN 'PLANNED'
    WHEN 'PROBATION'   THEN 'ACTIVE'
    WHEN 'ACTIVE'      THEN 'ACTIVE'
    WHEN 'CONFIRMED'   THEN 'ACTIVE'
    WHEN 'NOTICE'      THEN 'ACTIVE'
    WHEN 'EXITED'      THEN 'COMPLETED'
    WHEN 'ALUMNI'      THEN 'COMPLETED'
    WHEN 'SUSPENDED'   THEN 'ACTIVE'
    ELSE                    'PLANNED'
  END                                                                  AS status,
  he.is_primary,
  he.department_id::text,
  he.location_id::text,
  he.designation,
  he.created_at,
  he.updated_at
FROM hr_employments he
  JOIN hr_people hp ON hp.id = he.person_id
  JOIN workers w
    ON  w.organization_id        = hp.org_id
    AND w.organization_person_id = (
      SELECT op2.organization_person_id
      FROM   organization_people op2
      WHERE  op2.organization_id = hp.org_id
        AND  op2.user_id         = hp.user_id
      LIMIT  1
    )
WHERE he.deleted_at IS NULL
ORDER BY he.is_primary ASC   -- non-primary first → primary last (EXCLUSION-safe ordering)
ON CONFLICT DO NOTHING;

-- ============================================================
-- STEP 7C: Quarantine any hr_employments rows that had joining_date IS NULL
--   and no valid starts_on fallback — these would have produced a NULL starts_on
--   which violates the NOT NULL constraint and were silently skipped above.
--   The operator must set joining_date manually and re-run the insert for these.
-- ============================================================
INSERT INTO _directory_backfill_quarantine
  (source, org_id, user_id, reason, raw_data)
SELECT
  'step7_null_starts_on'                                              AS source,
  hp.org_id,
  hp.user_id,
  'joining_date_and_created_at_both_null_no_starts_on'               AS reason,
  jsonb_build_object(
    'hr_employment_id',   he.id,
    'employee_number',    he.employee_number,
    'lifecycle_status',   he.lifecycle_status
  )                                                                   AS raw_data
FROM hr_employments he
  JOIN hr_people hp ON hp.id = he.person_id
WHERE he.deleted_at IS NULL
  AND he.joining_date IS NULL
  AND he.created_at IS NULL
ON CONFLICT DO NOTHING;

-- ============================================================
-- Final dry-run counts — review before declaring Step 5–7 done.
-- ============================================================

-- People created
SELECT count(*) AS organization_people_total FROM organization_people;

-- Workers created
SELECT count(*) AS workers_total FROM workers;

-- Engagements created
SELECT count(*) AS worker_engagements_total FROM worker_engagements;

-- Quarantine items requiring human review
SELECT source, reason, count(*) AS cnt
FROM   _directory_backfill_quarantine
GROUP BY source, reason
ORDER BY source, reason;

-- Parity check 1: every active hr_people has an organization_people row
SELECT count(*) AS unpaired_hr_people
FROM hr_people hp
  LEFT JOIN organization_people op
    ON op.organization_id = hp.org_id AND op.user_id = hp.user_id
WHERE hp.deleted_at IS NULL AND op.organization_person_id IS NULL;
-- Target: 0

-- Parity check 2: every user_membership has an organization_people row
SELECT count(*) AS unpaired_memberships
FROM user_memberships um
  LEFT JOIN organization_people op
    ON op.organization_id = um.org_id AND op.user_id = um.user_id
WHERE op.organization_person_id IS NULL;
-- Target: 0 (or equal to quarantine count)

-- Parity check 3: no duplicate (org, user) pairs
SELECT organization_id, user_id, count(*) AS n
FROM   organization_people
WHERE  user_id IS NOT NULL
GROUP BY organization_id, user_id
HAVING count(*) > 1;
-- Target: 0 rows

-- Parity check 4: at most one active primary engagement per worker
SELECT worker_id, count(*) AS n
FROM   worker_engagements
WHERE  is_primary = true AND status = 'ACTIVE'
GROUP BY worker_id
HAVING count(*) > 1;
-- Target: 0 rows
```

---

## Key decisions and caveats

**`$defaultFn` is not a SQL DEFAULT.** All three PK columns (`organization_person_id`,
`worker_id`, `worker_engagement_id`) use `$defaultFn(() => randomUUID())`. Drizzle does
NOT emit `DEFAULT gen_random_uuid()` in the generated DDL. Raw SQL inserts (backfills,
raw migrations, tests) must always supply these values explicitly via `gen_random_uuid()`
or a pre-computed UUID. If you need a SQL-level default, add
`DEFAULT gen_random_uuid()` in a companion raw SQL migration:

```sql
ALTER TABLE organization_people
  ALTER COLUMN organization_person_id SET DEFAULT gen_random_uuid();
ALTER TABLE workers
  ALTER COLUMN worker_id SET DEFAULT gen_random_uuid();
ALTER TABLE worker_engagements
  ALTER COLUMN worker_engagement_id SET DEFAULT gen_random_uuid();
```

This is optional for the migration to function but recommended before the tables receive
direct SQL writes from scripts or seeds.

**`workers.status` and `worker_engagements.worker_type` are plain `text` in the DB.**
The TypeScript union type is enforced only in the application layer. If you want a
DB-level CHECK, add it in a future raw migration.

**The EXCLUSION constraint is not in the Drizzle journal by default.** After
`db:generate` produces `0305_directory_tables.sql`, manually add `0306_worker_engagements_exclusion.sql`
to `backend/migrations/meta/_journal.json`. Failure to do so means `db:migrate` in CI
will never run the exclusion constraint — the overlap invariant will be unenforced in
production.

**Neon `btree_gist` availability.** Neon makes `btree_gist` available without superuser
for all plans. Verify with `SELECT * FROM pg_available_extensions WHERE name = 'btree_gist';`
before running the migration. If unavailable, file a Neon support ticket rather than
implementing the trigger fallback, as the EXCLUSION constraint is cheaper and more
correct.

**Backfill ordering for EXCLUSION safety.** Step 7B inserts non-primary engagements
before primary ones (`ORDER BY is_primary ASC`). The EXCLUSION constraint only fires on
PLANNED/ACTIVE status rows. If hr_employments has overlapping intervals that HRMS
allowed (a known data-quality risk), those rows will raise `23P01`. The safe handling is:
catch the error per-row, mark those engagements as `CANCELLED` in a separate pass, and
insert them to the quarantine table.

**`user_memberships` is not dropped here.** This patch covers Steps 1–7 of Wave 3.
Steps 10–11 (retiring `user_memberships`) are deferred to a separate migration after
the mandatory 14-day dual-write observation window. See `wave-3-execution-plan.md` §Step 11.
