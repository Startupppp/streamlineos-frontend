-- backfill-branch-hr-org-unit-members.sql
-- Backfill org_unit_members rows for BRANCH org-units whose metadata stores an
-- hrContactUserId.  The bug: BranchesService.update() never called
-- syncOrgUnitPlacement for the HR contact, so branches whose HR contact was
-- set or changed via an UPDATE have no corresponding membership row (the
-- create() path was correct and already wrote those rows).
--
-- SAFE TO RUN MULTIPLE TIMES: the INSERT uses ON CONFLICT DO NOTHING against
-- the unique index uniq_org_unit_members_unit_user (org_unit_id, user_id).
--
-- Run AFTER deploying the fixed BranchesService.
-- Run inside a transaction so a mid-script failure leaves no partial state.
--
-- Prerequisites:
--   - The org_unit_members table exists.
--   - The unique index uniq_org_unit_members_unit_user (org_unit_id, user_id)
--     exists (created by the Drizzle migration that added org_unit_members).
--
-- After running, no cache invalidation is required — the RBAC / placement
-- cache is keyed on org_unit_members rows read at request time.

BEGIN;

-- Dry-run: rows that would be inserted.
-- Uncomment this SELECT and run it first to verify the scope before executing.
--
-- SELECT
--   ou.id          AS branch_id,
--   ou.org_id,
--   ou.name        AS branch_name,
--   ou.metadata->>'hrContactUserId' AS hr_user_id
-- FROM org_units ou
-- WHERE ou.kind = 'BRANCH'
--   AND ou.deleted_at IS NULL
--   AND ou.metadata->>'hrContactUserId' IS NOT NULL
--   AND ou.metadata->>'hrContactUserId' <> ''
--   AND EXISTS (
--     SELECT 1 FROM users u WHERE u.id = ou.metadata->>'hrContactUserId'
--   )
--   AND NOT EXISTS (
--     SELECT 1 FROM org_unit_members oum
--     WHERE oum.org_unit_id = ou.id
--       AND oum.user_id     = ou.metadata->>'hrContactUserId'
--   );

INSERT INTO org_unit_members (id, org_id, org_unit_id, user_id, role, created_at)
SELECT
  gen_random_uuid(),
  ou.org_id,
  ou.id,
  ou.metadata->>'hrContactUserId',
  'member',
  now()
FROM org_units ou
WHERE ou.kind     = 'BRANCH'
  AND ou.deleted_at IS NULL
  AND ou.metadata->>'hrContactUserId' IS NOT NULL
  AND ou.metadata->>'hrContactUserId' <> ''
  AND EXISTS (
    SELECT 1 FROM users u WHERE u.id = ou.metadata->>'hrContactUserId'
  )
ON CONFLICT DO NOTHING;

-- Dry-run: users whose branch_id is missing or points at the wrong branch.
-- Uncomment to preview before executing.
--
-- SELECT
--   u.id           AS user_id,
--   u.branch_id    AS current_branch_id,
--   ou.id          AS correct_branch_id,
--   ou.name        AS branch_name
-- FROM org_units ou
-- JOIN users u ON u.id = ou.metadata->>'hrContactUserId'
-- WHERE ou.kind     = 'BRANCH'
--   AND ou.deleted_at IS NULL
--   AND ou.metadata->>'hrContactUserId' IS NOT NULL
--   AND ou.metadata->>'hrContactUserId' <> ''
--   AND (u.branch_id IS NULL OR u.branch_id <> ou.id);

UPDATE users u
SET    branch_id  = ou.id
FROM   org_units ou
WHERE  ou.kind     = 'BRANCH'
  AND  ou.deleted_at IS NULL
  AND  ou.metadata->>'hrContactUserId' IS NOT NULL
  AND  ou.metadata->>'hrContactUserId' <> ''
  AND  ou.metadata->>'hrContactUserId' = u.id
  AND  (u.branch_id IS NULL OR u.branch_id <> ou.id);

COMMIT;
