-- Script to fix orphaned data before schema migration
-- Run this before running: pnpm db:push
-- This removes records that reference non-existent organizations

-- Step 1: Create a default organization if none exists (optional - uncomment if needed)
-- INSERT INTO organizations (id, name, slug, created_at, updated_at) 
-- VALUES ('default-org', 'Default Organization', 'default-org', NOW(), NOW())
-- ON CONFLICT (id) DO NOTHING;

-- Step 2: Delete orphaned records from all tables
-- This will remove any records that reference organizations that don't exist

-- Delete from leave-related tables
DELETE FROM leave_requests WHERE org_id NOT IN (SELECT id FROM organizations);
DELETE FROM leave_balances WHERE org_id NOT IN (SELECT id FROM organizations);
DELETE FROM leave_types WHERE org_id NOT IN (SELECT id FROM organizations);

-- Delete from other tables with org_id foreign keys
DELETE FROM departments WHERE org_id NOT IN (SELECT id FROM organizations);
DELETE FROM projects WHERE org_id NOT IN (SELECT id FROM organizations);
DELETE FROM tickets WHERE org_id NOT IN (SELECT id FROM organizations);
DELETE FROM attendance WHERE org_id NOT IN (SELECT id FROM organizations);
DELETE FROM payrolls WHERE org_id NOT IN (SELECT id FROM organizations);
DELETE FROM salary_structures WHERE org_id NOT IN (SELECT id FROM organizations);
DELETE FROM expenses WHERE org_id NOT IN (SELECT id FROM organizations);
DELETE FROM assets WHERE org_id NOT IN (SELECT id FROM organizations);
DELETE FROM documents WHERE org_id NOT IN (SELECT id FROM organizations);
DELETE FROM performance_reviews WHERE org_id NOT IN (SELECT id FROM organizations);
DELETE FROM goals WHERE org_id NOT IN (SELECT id FROM organizations);
DELETE FROM helpdesk_tickets WHERE org_id NOT IN (SELECT id FROM organizations);
DELETE FROM user_permissions WHERE org_id NOT IN (SELECT id FROM organizations);

-- Handle role_permissions separately (org_id can be NULL)
DELETE FROM role_permissions WHERE org_id IS NOT NULL AND org_id NOT IN (SELECT id FROM organizations);

-- Verify cleanup
SELECT 
    'leave_types' as table_name, 
    COUNT(*) as orphaned_count 
FROM leave_types 
WHERE org_id NOT IN (SELECT id FROM organizations)
UNION ALL
SELECT 
    'leave_balances' as table_name, 
    COUNT(*) as orphaned_count 
FROM leave_balances 
WHERE org_id NOT IN (SELECT id FROM organizations)
UNION ALL
SELECT 
    'leave_requests' as table_name, 
    COUNT(*) as orphaned_count 
FROM leave_requests 
WHERE org_id NOT IN (SELECT id FROM organizations);
