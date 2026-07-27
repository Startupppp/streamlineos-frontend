-- Operator migration: DROP 5 dead tables (code: 2026-07-27)
-- These 5 tables had ZERO references anywhere — no service/controller/query, no raw SQL,
-- no FK from any other table, no Drizzle relation. Their schema definitions were removed
-- from backend/src/db/schema (typecheck stayed green, proving no code path used them).
--
-- DESTRUCTIVE (drops the tables + any rows). All 5 are unused, but confirm they are empty
-- in your environment before running if you want to be cautious:
--   SELECT 'service_accounts' t, count(*) FROM service_accounts
--   UNION ALL SELECT 'allowance_types', count(*) FROM allowance_types
--   UNION ALL SELECT 'course_enrollments', count(*) FROM course_enrollments
--   UNION ALL SELECT 'training_attendance', count(*) FROM training_attendance
--   UNION ALL SELECT 'payroll_statutory_rule_sets', count(*) FROM payroll_statutory_rule_sets;
--
-- Idempotent (IF EXISTS). RESTRICT (default) — they are leaf tables with no inbound FKs,
-- so no CASCADE is needed; if a drop is unexpectedly blocked, STOP and investigate.
BEGIN;

DROP TABLE IF EXISTS service_accounts;
DROP TABLE IF EXISTS allowance_types;

-- payroll_statutory_rule_sets: DELIBERATELY NOT DROPPED (verified 2026-07-27).
-- It is code-dead (zero references) BUT NOT data-empty: it holds 8 seeded
-- system-default Indian statutory rule sets (PF, ESI, PT, LWF, TDS, GRATUITY, HRA,
-- MIN_WAGE; FY2025-04; is_system_default=true, org_id NULL/global). That is
-- intentional compliance reference data for a payroll-statutory feature, so dropping
-- it would destroy seeded configuration. Code-dead != safe-to-drop.
-- Re-evaluate only after confirming the statutory-rules feature is abandoned.
-- DROP TABLE IF EXISTS payroll_statutory_rule_sets;

-- Abandoned HR Learning + Training feature cluster (schema-only, no controller/service).
-- Drop children before parents. course_enrollments -> courses -> course_categories;
-- training_attendance -> training_programs.
DROP TABLE IF EXISTS course_enrollments;
DROP TABLE IF EXISTS courses;
DROP TABLE IF EXISTS course_categories;
DROP TABLE IF EXISTS training_attendance;
DROP TABLE IF EXISTS training_programs;

-- Orphaned RBAC grants for the removed hr:learning feature (keys removed from the catalog).
DELETE FROM role_permission_grants WHERE permission_key LIKE 'hr:learning:%';

COMMIT;
