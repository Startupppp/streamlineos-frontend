-- Operator data-migration: rename module key 'projects' → 'build'
-- Context: The projects module was renamed to Build (code: 2026-07-27).
--          This script updates the stored module keys in the DB to match.
--
-- SAFE TO RUN MULTIPLE TIMES (idempotent guards on every statement).
-- Run in a transaction. Run AFTER the new backend code is deployed.
-- IMPORTANT: bump permissions version for all affected orgs AFTER step (1).
--
-- 1. RBAC permission grants: 'projects:%' → 'build:%'
--    Only touches rows that still carry the old prefix (idempotent).
BEGIN;

UPDATE role_permission_grants
SET    permission_key = 'build:' || substr(permission_key, 10)
WHERE  permission_key LIKE 'projects:%'
  AND  permission_key NOT LIKE 'build:%';

-- 2. org_modules: module_key 'projects' → 'build'
--    Table: org_modules, column: module_key (varchar 64)
UPDATE org_modules
SET    module_key = 'build'
WHERE  module_key = 'projects';

-- 2b. organizations.enabled_modules: 'PROJECTS' → 'BUILD'  (CRITICAL)
--     SEPARATE vocabulary from org_modules — this text[] array (UPPERCASE) is projected into
--     the JWT and is what `@RequireModule` checks via module.guard.ts (case-insensitive compare).
--     Without this, `@RequireModule("build")` finds only 'PROJECTS' in the array and the Build
--     module gate — plus everything riding it (e.g. Timesheets) — fails for all non-owner users.
UPDATE organizations
SET    enabled_modules = array_replace(enabled_modules, 'PROJECTS', 'BUILD')
WHERE  'PROJECTS' = ANY(enabled_modules);

-- 3. user_module_access: module_key 'projects' → 'build'
--    Table: user_module_access, column: module_key
UPDATE user_module_access
SET    module_key = 'build'
WHERE  module_key = 'projects';

-- 4. onboarding checklists: module_key 'projects' → 'build'
--    VERIFIED 2026-07-27: the real table is `module_setup_checklists` (there is no
--    `module_checklist_progress`). Guarded by a table-existence check so this file stays
--    safe on any branch where either table is absent — an unguarded UPDATE against a
--    missing table aborts the whole transaction.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema = 'public' AND table_name = 'module_setup_checklists') THEN
    UPDATE module_setup_checklists SET module_key = 'build' WHERE module_key = 'projects';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema = 'public' AND table_name = 'module_checklist_progress') THEN
    EXECUTE $q$UPDATE module_checklist_progress SET module_key = 'build' WHERE module_key = 'projects'$q$;
  END IF;
END $$;

COMMIT;

-- 5. Bump permissions version for all orgs that had the projects module.
--    This invalidates the Redis RBAC cache so all sessions pick up the new
--    'build:*' keys immediately.
--    Run as a separate statement (bumpPermissionsVersion increments the
--    org's access_versions.version; the app reads it on next request).
--
--    Option A — call the app helper (recommended, runs in a transaction):
--      pnpm -C backend ts-node src/scripts/bump-all-permissions-versions.ts
--
--    Option B — raw SQL (if the helper script doesn't exist yet):
--      INSERT INTO access_versions (org_id, version)
--        SELECT id, 1
--        FROM   organizations
--        ON CONFLICT (org_id) DO UPDATE SET version = access_versions.version + 1;
--
-- Note: physical table names are UNCHANGED:
--   projects, tickets, sprints, cycles, managed_products,
--   project_teams, project_members, project_portfolios,
--   project_client_grants — all stay as-is.
