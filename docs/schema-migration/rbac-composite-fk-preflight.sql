-- Read-only preflight for composite RBAC tenant foreign keys.
-- Every count must be zero before adding/validating the corresponding FK.

SELECT 'role_assignments.role' AS edge, count(*) AS cross_tenant_rows
FROM role_assignments e
JOIN roles r ON r.id = e.role_id
WHERE r.org_id <> e.org_id
UNION ALL
SELECT 'role_permission_grants.role', count(*)
FROM role_permission_grants e
JOIN roles r ON r.id = e.role_id
WHERE r.org_id <> e.org_id
UNION ALL
SELECT 'principal_group_members.group', count(*)
FROM principal_group_members e
JOIN principal_groups g ON g.id = e.principal_group_id
WHERE g.org_id <> e.org_id
UNION ALL
SELECT 'group_role_assignments.group', count(*)
FROM group_role_assignments e
JOIN principal_groups g ON g.id = e.principal_group_id
WHERE g.org_id <> e.org_id
UNION ALL
SELECT 'group_role_assignments.role', count(*)
FROM group_role_assignments e
JOIN roles r ON r.id = e.role_id
WHERE r.org_id <> e.org_id;

-- Also prove there are no orphaned single-column references before replacing them.
SELECT 'role_assignments.role_orphan' AS edge, count(*) AS orphan_rows
FROM role_assignments e LEFT JOIN roles r ON r.id = e.role_id
WHERE r.id IS NULL
UNION ALL
SELECT 'role_permission_grants.role_orphan', count(*)
FROM role_permission_grants e LEFT JOIN roles r ON r.id = e.role_id
WHERE r.id IS NULL
UNION ALL
SELECT 'principal_group_members.group_orphan', count(*)
FROM principal_group_members e LEFT JOIN principal_groups g ON g.id = e.principal_group_id
WHERE g.id IS NULL
UNION ALL
SELECT 'group_role_assignments.group_orphan', count(*)
FROM group_role_assignments e LEFT JOIN principal_groups g ON g.id = e.principal_group_id
WHERE g.id IS NULL
UNION ALL
SELECT 'group_role_assignments.role_orphan', count(*)
FROM group_role_assignments e LEFT JOIN roles r ON r.id = e.role_id
WHERE r.id IS NULL;

-- Deployment sequence after zero-result preflight:
-- 1. Create/attach UNIQUE (org_id, id) constraints on roles and principal_groups.
-- 2. ADD each composite FK NOT VALID with a short lock_timeout.
-- 3. VALIDATE each constraint in a separate migration/transaction.
-- 4. Remove redundant single-column FKs only after validation and rollback window.
