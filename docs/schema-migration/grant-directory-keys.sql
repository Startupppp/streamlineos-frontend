-- grant-directory-keys.sql
-- Backfill directory:* and workforce:* grants for roles whose members previously
-- accessed the /directory endpoints via hr:employees:* grants.
--
-- Run ONCE after deploying the updated permission catalog (which now contains the
-- directory:people:* and workforce:workers:* keys in the permissions table).
--
-- The permission_key FK references permissions.name, so the permission rows must
-- exist in the permissions table before running this script (they are seeded by
-- the RBAC backfill script: pnpm -C backend backfill:rbac).
--
-- After running this script, bump access_versions so cached permission sets are
-- invalidated:
--
--   UPDATE access_versions SET permissions_version = permissions_version + 1, updated_at = now();
--
-- Or scope to specific affected orgs:
--
--   UPDATE access_versions
--   SET    permissions_version = permissions_version + 1,
--          updated_at          = now()
--   WHERE  org_id IN (
--     SELECT DISTINCT org_id FROM role_permission_grants
--     WHERE  permission_key IN ('hr:employees:view', 'hr:employees:create',
--                               'hr:employees:update', 'hr:employees:delete')
--   );

INSERT INTO role_permission_grants (org_id, role_id, permission_key, scope, created_at)
SELECT rpg.org_id, rpg.role_id, 'directory:people:view', 'all', now()
FROM   role_permission_grants rpg
WHERE  rpg.permission_key = 'hr:employees:view'
ON CONFLICT DO NOTHING;

INSERT INTO role_permission_grants (org_id, role_id, permission_key, scope, created_at)
SELECT rpg.org_id, rpg.role_id, 'directory:people:create', 'all', now()
FROM   role_permission_grants rpg
WHERE  rpg.permission_key = 'hr:employees:create'
ON CONFLICT DO NOTHING;

INSERT INTO role_permission_grants (org_id, role_id, permission_key, scope, created_at)
SELECT rpg.org_id, rpg.role_id, 'directory:people:update', 'all', now()
FROM   role_permission_grants rpg
WHERE  rpg.permission_key = 'hr:employees:update'
ON CONFLICT DO NOTHING;

INSERT INTO role_permission_grants (org_id, role_id, permission_key, scope, created_at)
SELECT rpg.org_id, rpg.role_id, 'directory:people:delete', 'all', now()
FROM   role_permission_grants rpg
WHERE  rpg.permission_key = 'hr:employees:delete'
ON CONFLICT DO NOTHING;

INSERT INTO role_permission_grants (org_id, role_id, permission_key, scope, created_at)
SELECT rpg.org_id, rpg.role_id, 'workforce:workers:view', 'all', now()
FROM   role_permission_grants rpg
WHERE  rpg.permission_key = 'hr:employees:view'
ON CONFLICT DO NOTHING;

INSERT INTO role_permission_grants (org_id, role_id, permission_key, scope, created_at)
SELECT rpg.org_id, rpg.role_id, 'workforce:workers:manage', 'all', now()
FROM   role_permission_grants rpg
WHERE  rpg.permission_key = 'hr:employees:manage'
ON CONFLICT DO NOTHING;

INSERT INTO role_permission_grants (org_id, role_id, permission_key, scope, created_at)
SELECT rpg.org_id, rpg.role_id, 'workforce:workers:terminate', 'all', now()
FROM   role_permission_grants rpg
WHERE  rpg.permission_key = 'hr:employees:manage'
ON CONFLICT DO NOTHING;
