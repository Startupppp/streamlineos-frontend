-- READ ONLY: legacy users -> canonical HR parity preflight.
-- Run before any R-11 backfill. Every mismatch count for an approved mapping
-- must be zero before switching that field's reads. This script changes no data.

-- Structural readiness: one active person and at most one active primary
-- employment for every active organization membership.
WITH membership_canonical AS (
  SELECT
    om.org_id,
    om.user_id,
    count(DISTINCT hp.id) FILTER (WHERE hp.deleted_at IS NULL) AS people_count,
    count(DISTINCT he.id) FILTER (
      WHERE he.deleted_at IS NULL AND he.is_primary = true
    ) AS primary_employment_count
  FROM organization_members om
  LEFT JOIN hr_people hp
    ON hp.org_id = om.org_id AND hp.user_id = om.user_id
  LEFT JOIN hr_employments he
    ON he.org_id = om.org_id AND he.person_id = hp.id
  WHERE om.status = 'ACTIVE'
  GROUP BY om.org_id, om.user_id
)
SELECT
  count(*) FILTER (WHERE people_count = 0) AS missing_people,
  count(*) FILTER (WHERE people_count > 1) AS duplicate_people,
  count(*) FILTER (WHERE primary_employment_count = 0) AS missing_primary_employments,
  count(*) FILTER (WHERE primary_employment_count > 1) AS duplicate_primary_employments
FROM membership_canonical;

-- Approved non-sensitive mappings. NULL is treated as a value so a partially
-- populated canonical row cannot be mistaken for parity.
WITH canonical AS (
  SELECT om.org_id, u.*, hp.id AS person_id,
    hp.first_name AS hp_first_name, hp.last_name AS hp_last_name,
    hp.work_email AS hp_work_email, hp.phone AS hp_phone,
    hp.date_of_birth AS hp_date_of_birth, hp.gender AS hp_gender,
    he.id AS employment_id, he.employee_number, he.designation AS he_designation,
    he.joining_date AS he_joining_date, he.department_id
  FROM organization_members om
  JOIN users u ON u.id = om.user_id
  LEFT JOIN hr_people hp
    ON hp.org_id = om.org_id AND hp.user_id = om.user_id AND hp.deleted_at IS NULL
  LEFT JOIN hr_employments he
    ON he.org_id = om.org_id AND he.person_id = hp.id
   AND he.is_primary = true AND he.deleted_at IS NULL
  WHERE om.status = 'ACTIVE'
)
SELECT field, count(*) AS mismatch_rows
FROM canonical c
CROSS JOIN LATERAL (VALUES
  ('first_name', c.first_name IS DISTINCT FROM c.hp_first_name),
  ('last_name', c.last_name IS DISTINCT FROM c.hp_last_name),
  ('work_email_ci', lower(c.email) IS DISTINCT FROM lower(c.hp_work_email)),
  ('phone', c.phone IS DISTINCT FROM c.hp_phone),
  ('date_of_birth', c.date_of_birth IS DISTINCT FROM c.hp_date_of_birth),
  ('gender', c.gender::text IS DISTINCT FROM c.hp_gender),
  ('employee_number', c.employee_id IS DISTINCT FROM c.employee_number),
  ('designation', c.designation IS DISTINCT FROM c.he_designation),
  ('joining_date', c.joining_date IS DISTINCT FROM c.he_joining_date),
  ('department_id', c.org_department_id IS DISTINCT FROM c.department_id)
) mismatch(field, differs)
WHERE mismatch.differs
GROUP BY field
ORDER BY field;

-- Approved sensitive mappings. Salary conversion is exact cents from the
-- legacy monthly decimal; it does not infer a currency other than the canonical
-- row's explicit/default currency.
WITH canonical AS (
  SELECT om.org_id, om.user_id, u.monthly_salary, u.tax_id,
    he.id AS employment_id, sf.salary_amount_cents, sf.salary_frequency,
    sf.tax_id AS canonical_tax_id
  FROM organization_members om
  JOIN users u ON u.id = om.user_id
  LEFT JOIN hr_people hp
    ON hp.org_id = om.org_id AND hp.user_id = om.user_id AND hp.deleted_at IS NULL
  LEFT JOIN hr_employments he
    ON he.org_id = om.org_id AND he.person_id = hp.id
   AND he.is_primary = true AND he.deleted_at IS NULL
  LEFT JOIN hr_employee_sensitive_fields sf
    ON sf.org_id = om.org_id AND sf.employment_id = he.id
  WHERE om.status = 'ACTIVE'
)
SELECT
  count(*) FILTER (
    WHERE monthly_salary IS NOT NULL AND employment_id IS NULL
  ) AS salary_missing_employment,
  count(*) FILTER (
    WHERE monthly_salary IS NOT NULL
      AND round(monthly_salary * 100) IS DISTINCT FROM salary_amount_cents::numeric
  ) AS salary_mismatches,
  count(*) FILTER (
    WHERE monthly_salary IS NOT NULL AND salary_frequency IS DISTINCT FROM 'MONTHLY'
  ) AS salary_frequency_mismatches,
  count(*) FILTER (
    WHERE tax_id IS DISTINCT FROM canonical_tax_id
  ) AS tax_id_mismatches
FROM canonical;

-- Deliberately unresolved mappings. These counts size the work but authorize no
-- backfill: users.bank_details is TEXT while canonical bank_details is typed
-- JSONB; reporting_to must resolve to an employment in the same org; branch_id
-- does not prove whether it means employment.location_id; lifecycle/onboarding
-- values need an approved state-transition mapping.
SELECT
  count(*) FILTER (WHERE bank_details IS NOT NULL) AS legacy_bank_details_rows,
  count(*) FILTER (WHERE reporting_to IS NOT NULL) AS legacy_reporting_rows,
  count(*) FILTER (WHERE branch_id IS NOT NULL) AS legacy_branch_rows,
  count(*) FILTER (WHERE emergency_contact IS NOT NULL) AS legacy_emergency_contact_rows,
  count(*) FILTER (
    WHERE user_status IS NOT NULL OR onboarding_doc_status IS NOT NULL
      OR onboarding_completed_at IS NOT NULL
  ) AS legacy_lifecycle_or_onboarding_rows
FROM users;
