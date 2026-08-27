-- DO NOT DELETE. This file is read at test time.
--
-- `backend/src/db/hr-canonical-parity-preflight.spec.ts` reads this script by path and asserts its
-- contents. Removing it does not fail a build or a typecheck -- the suite fails to load, which
-- reads as an unrelated breakage.
--
-- This has now happened twice. A cleanup removed it, 945f79d76 restored it three days later with
-- the message "restore the two HR migration SQL scripts a cleanup removed", and f43d16b36
-- ("chore: remove obsolete SQL scripts and documentation files", 2026-08-25) removed it again. The
-- spec has been unable to run since. It is not obsolete; nothing referenced it because a `.sql`
-- read by `readFileSync` has no importer to find.
--
-- Before deleting anything here, grep the repo for the FILE NAME, not for symbols.

-- R-11 approved-field backfill. PostgreSQL psql script; DRY RUN by default.
-- Usage:
--   psql "$DATABASE_URL" -f hr-users-approved-backfill.sql
-- Apply only after reviewing dry-run output and taking a restorable backup:
--   psql -v apply=true "$DATABASE_URL" -f hr-users-approved-backfill.sql
--
-- Exact mappings only: designation, department, joining date, monthly salary
-- cents. Tax ID is intentionally excluded: application encryption/key handling
-- cannot be reproduced safely in SQL. Existing non-NULL canonical values are
-- never overwritten. Missing/ambiguous person or primary-employment rows skip.

\if :{?apply}
\else
  \set apply false
\endif

BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '15min';

-- Abort on ambiguous canonical ownership. Missing rows are reported/skipped.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM hr_people
    WHERE deleted_at IS NULL AND user_id IS NOT NULL
    GROUP BY org_id, user_id
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'Duplicate active hr_people rows; resolve before R-11 backfill';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM hr_employments
    WHERE deleted_at IS NULL AND is_primary = true
    GROUP BY org_id, person_id
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'Multiple active primary employments; resolve before R-11 backfill';
  END IF;
END $$;

-- Dry-run readiness summary.
WITH source_rows AS (
  SELECT om.org_id, u.id AS user_id, u.designation, u.org_department_id,
    u.joining_date, u.monthly_salary, hp.id AS person_id, he.id AS employment_id
  FROM organization_members om
  JOIN users u ON u.id = om.user_id
  LEFT JOIN hr_people hp
    ON hp.org_id = om.org_id AND hp.user_id = u.id AND hp.deleted_at IS NULL
  LEFT JOIN hr_employments he
    ON he.org_id = om.org_id AND he.person_id = hp.id
   AND he.is_primary = true AND he.deleted_at IS NULL
  WHERE om.status = 'ACTIVE'
)
SELECT
  count(*) AS active_members,
  count(*) FILTER (WHERE person_id IS NULL) AS skipped_missing_person,
  count(*) FILTER (WHERE person_id IS NOT NULL AND employment_id IS NULL) AS skipped_missing_employment,
  count(*) FILTER (WHERE monthly_salary IS NOT NULL AND
    (monthly_salary < 0 OR round(monthly_salary * 100) > 2147483647)) AS skipped_salary_out_of_range
FROM source_rows;

-- Fill only absent canonical employment values. Invalid/cross-tenant department
-- ids are skipped by the correlated org_units check.
WITH candidates AS (
  SELECT he.id, u.designation, u.joining_date,
    CASE WHEN EXISTS (
      SELECT 1 FROM org_units ou
      WHERE ou.id = u.org_department_id AND ou.org_id = he.org_id
        AND ou.kind = 'DEPARTMENT' AND ou.deleted_at IS NULL
    ) THEN u.org_department_id ELSE NULL END AS department_id
  FROM organization_members om
  JOIN users u ON u.id = om.user_id
  JOIN hr_people hp
    ON hp.org_id = om.org_id AND hp.user_id = u.id AND hp.deleted_at IS NULL
  JOIN hr_employments he
    ON he.org_id = om.org_id AND he.person_id = hp.id
   AND he.is_primary = true AND he.deleted_at IS NULL
  WHERE om.status = 'ACTIVE'
), changed AS (
  UPDATE hr_employments he
  SET designation = COALESCE(he.designation, c.designation),
      joining_date = COALESCE(he.joining_date, c.joining_date),
      department_id = COALESCE(he.department_id, c.department_id),
      updated_at = now()
  FROM candidates c
  WHERE he.id = c.id
    AND ((he.designation IS NULL AND c.designation IS NOT NULL)
      OR (he.joining_date IS NULL AND c.joining_date IS NOT NULL)
      OR (he.department_id IS NULL AND c.department_id IS NOT NULL))
  RETURNING he.id
)
SELECT 'employment_fill' AS action, id FROM changed ORDER BY id;

-- Create a sensitive row only for an exactly representable non-negative salary.
WITH candidates AS (
  SELECT om.org_id, he.id AS employment_id,
    round(u.monthly_salary * 100)::integer AS salary_amount_cents
  FROM organization_members om
  JOIN users u ON u.id = om.user_id
  JOIN hr_people hp
    ON hp.org_id = om.org_id AND hp.user_id = u.id AND hp.deleted_at IS NULL
  JOIN hr_employments he
    ON he.org_id = om.org_id AND he.person_id = hp.id
   AND he.is_primary = true AND he.deleted_at IS NULL
  WHERE om.status = 'ACTIVE' AND u.monthly_salary >= 0
    AND round(u.monthly_salary * 100) <= 2147483647
), inserted AS (
  INSERT INTO hr_employee_sensitive_fields
    (org_id, employment_id, salary_amount_cents, salary_currency, salary_frequency)
  SELECT org_id, employment_id, salary_amount_cents, 'INR', 'MONTHLY'
  FROM candidates
  ON CONFLICT (employment_id) DO NOTHING
  RETURNING id, employment_id
)
SELECT 'sensitive_insert' AS action, id, employment_id FROM inserted ORDER BY id;

-- Fill salary only when the sensitive row exists but the amount is absent.
WITH candidates AS (
  SELECT om.org_id, he.id AS employment_id,
    round(u.monthly_salary * 100)::integer AS salary_amount_cents
  FROM organization_members om
  JOIN users u ON u.id = om.user_id
  JOIN hr_people hp
    ON hp.org_id = om.org_id AND hp.user_id = u.id AND hp.deleted_at IS NULL
  JOIN hr_employments he
    ON he.org_id = om.org_id AND he.person_id = hp.id
   AND he.is_primary = true AND he.deleted_at IS NULL
  WHERE om.status = 'ACTIVE' AND u.monthly_salary >= 0
    AND round(u.monthly_salary * 100) <= 2147483647
), changed AS (
  UPDATE hr_employee_sensitive_fields sf
  SET salary_amount_cents = c.salary_amount_cents,
      salary_frequency = COALESCE(sf.salary_frequency, 'MONTHLY'),
      salary_currency = COALESCE(sf.salary_currency, 'INR'),
      updated_at = now()
  FROM candidates c
  WHERE sf.org_id = c.org_id AND sf.employment_id = c.employment_id
    AND sf.salary_amount_cents IS NULL
  RETURNING sf.id, sf.employment_id
)
SELECT 'sensitive_fill' AS action, id, employment_id FROM changed ORDER BY id;

\if :apply
  COMMIT;
  \echo 'R-11 approved-field backfill COMMITTED'
\else
  ROLLBACK;
  \echo 'R-11 DRY RUN rolled back; pass -v apply=true only after backup/rehearsal'
\endif

