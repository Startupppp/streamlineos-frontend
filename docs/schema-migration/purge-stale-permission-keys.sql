-- purge-stale-permission-keys.sql
-- Removes 7 permission keys from the `permissions` catalog and all associated
-- `role_permission_grants` rows.  These keys exist in the DB but no longer exist
-- in the code catalog, causing PermissionCatalogSyncService to warn on every boot.
--
-- Classification:
--   RENAMED (1):
--     hr:workforce:view         — superseded by workforce:workers:view.
--                                 grant-directory-keys.sql already added the
--                                 replacement grants but never deleted the old
--                                 permission row or its grants.
--   DELETED FEATURES (6):
--     blog:categories:manage
--     blog:posts:manage
--     branch:manage_targets
--     surveys:settings:manage
--     surveys:templates:manage
--     workflows:templates:manage
--
-- None of these keys is enforced anywhere in the deployed code.  There is no
-- regression risk from their removal.
--
-- PREREQUISITES:
--   1. Deploy the backend build that removed these keys from the code catalog.
--      This script only reconciles the DB to match — it must run AFTER the
--      current backend is deployed, not before.
--   2. Run grant-directory-keys.sql (operator step 5) BEFORE this script so
--      that replacement workforce:workers:view grants are in place before the
--      old hr:workforce:view grants are removed.
--
-- SAFE TO RE-RUN — DELETE … WHERE … IN (…) is a no-op when the rows are absent.
--
-- Run via:
--   psql "$DATABASE_URL" -f docs/schema-migration/purge-stale-permission-keys.sql

-- ─────────────────────────────────────────────────────────────────────────────
-- DRY-RUN PREVIEW — Step 1 of 2
-- Uncomment and execute OUTSIDE a transaction (before running the script below)
-- to confirm how many grant rows will be removed per key.
-- ─────────────────────────────────────────────────────────────────────────────
-- SELECT permission_key,
--        count(*) AS grant_rows
-- FROM   role_permission_grants
-- WHERE  permission_key IN (
--          'hr:workforce:view',
--          'blog:categories:manage',
--          'blog:posts:manage',
--          'branch:manage_targets',
--          'surveys:settings:manage',
--          'surveys:templates:manage',
--          'workflows:templates:manage'
--        )
-- GROUP  BY permission_key
-- ORDER  BY permission_key;

-- ─────────────────────────────────────────────────────────────────────────────
-- DRY-RUN PREVIEW — Step 2 of 2
-- Uncomment and execute OUTSIDE a transaction to confirm which permission rows
-- currently exist and will be deleted from the catalog.
-- ─────────────────────────────────────────────────────────────────────────────
-- SELECT name
-- FROM   permissions
-- WHERE  name IN (
--          'hr:workforce:view',
--          'blog:categories:manage',
--          'blog:posts:manage',
--          'branch:manage_targets',
--          'surveys:settings:manage',
--          'surveys:templates:manage',
--          'workflows:templates:manage'
--        )
-- ORDER  BY name;

BEGIN;

-- 1. Delete role_permission_grants for all 7 keys EXPLICITLY.
--    The permission_key column carries an FK to permissions.name ON DELETE CASCADE,
--    so deleting the permissions rows (Step 2) would cascade and remove these rows
--    automatically.  We delete them here first anyway to make the blast radius
--    reviewable as a distinct, auditable step rather than hiding it inside an
--    implicit cascade.  An operator can verify the row count from the dry-run
--    preview above before the permissions rows themselves are removed.
DELETE FROM role_permission_grants
WHERE  permission_key IN (
         'hr:workforce:view',
         'blog:categories:manage',
         'blog:posts:manage',
         'branch:manage_targets',
         'surveys:settings:manage',
         'surveys:templates:manage',
         'workflows:templates:manage'
       );

-- 2. Delete the 7 stale permission rows from the catalog.
--    After Step 1 there are no child grant rows remaining for these keys.
--    The DELETE is still idempotent — it is a no-op when the rows are absent.
DELETE FROM permissions
WHERE  name IN (
         'hr:workforce:view',
         'blog:categories:manage',
         'blog:posts:manage',
         'branch:manage_targets',
         'surveys:settings:manage',
         'surveys:templates:manage',
         'workflows:templates:manage'
       );

-- 3. Bump access_versions.permissions_version for every org so that the Redis
--    RBAC cache is invalidated and all active sessions pick up the change on
--    their next request (CLAUDE.md §21: every grant mutation must bump the
--    version in the same transaction).
--    The upsert is safe on a fresh DB with no organisations — the SELECT
--    returns zero rows and the statement is a no-op.
INSERT INTO access_versions (org_id, permissions_version, updated_at)
SELECT id, 1, now()
FROM   organizations
ON CONFLICT (org_id) DO UPDATE
  SET permissions_version = access_versions.permissions_version + 1,
      updated_at          = now();

COMMIT;
