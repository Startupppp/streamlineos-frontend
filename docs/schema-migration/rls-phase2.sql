-- =============================================================================
-- RLS PHASE 2 — Pilot ENFORCE
-- Pre-conditions (ALL must be met before executing):
--   1. GATE 0.5 PASSED: Neon support confirmed transaction-pooling mode and
--      set_config(..., true) is transaction-local (POOL-01 closed).
--   2. withTenant() wired into ALL request paths in the NestJS app; no query
--      runs outside a tenant transaction (see rls-rollout-plan.md §4).
--   3. Negative tests NT-01 through NT-10 (wave-0-rls-matrix.md Part 6)
--      passed against the Neon pooler endpoint using streamline_app role.
--   4. Shadow-observe period (Phase 1 ENABLE) ran for ≥7 days including at
--      least one peak-traffic window with zero unexpected 0-row results.
--
-- What this script does:
--   1. Grants the app role the minimum required table privileges.
--   2. Applies FORCE ROW LEVEL SECURITY on the three pilot tables.
-- =============================================================================

SET statement_timeout = '30s';

-- ---------------------------------------------------------------------------
-- 1. App-role grants for pilot tables
-- ---------------------------------------------------------------------------

GRANT USAGE ON SCHEMA public TO streamline_app;

GRANT SELECT, INSERT, UPDATE, DELETE ON access_versions TO streamline_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON org_modules      TO streamline_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON group_roles      TO streamline_app;

-- ---------------------------------------------------------------------------
-- 2. FORCE RLS on pilot tables
-- After FORCE, the table owner (streamline_migrator) is also subject to the
-- policy unless it temporarily DROPs the policy or uses a BYPASSRLS superuser.
-- ---------------------------------------------------------------------------

ALTER TABLE access_versions FORCE ROW LEVEL SECURITY;
ALTER TABLE org_modules     FORCE ROW LEVEL SECURITY;
ALTER TABLE group_roles     FORCE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 3. Verification queries (run manually as streamline_app after executing above)
--    Replace :org_a and :org_b with real org IDs from a test environment.
-- ---------------------------------------------------------------------------

-- (a) GUC set → only own-org rows visible
-- SET ROLE streamline_app;
-- SELECT set_config('app.organization_id', ':org_a', true),
--        set_config('app.audience',         'INTERNAL', true);
-- SELECT count(*) FROM org_modules WHERE org_id = ':org_a';
-- Expected: matches the known module-count for org_a (>0 if modules enabled).
-- SELECT count(*) FROM org_modules WHERE org_id = ':org_b';
-- Expected: 0  (cross-org read is invisible, not an error)

-- (b) GUC unset → zero rows
-- SET ROLE streamline_app;
-- SELECT count(*) FROM org_modules;
-- Expected: 0

-- (c) Mismatched org_id in INSERT is rejected by WITH CHECK
-- SET ROLE streamline_app;
-- SELECT set_config('app.organization_id', ':org_a', true),
--        set_config('app.audience',         'INTERNAL', true);
-- INSERT INTO org_modules (id, org_id, module_key)
--   VALUES (gen_random_uuid(), ':org_b', 'TEST_CROSS_TENANT');
-- Expected: INSERT 0 (no error raised, but 0 rows inserted — WITH CHECK fails silently
--           for RESTRICTIVE policies; verify with SELECT count(*) that the row is absent)

-- Rollback (if FORCE causes regressions):
-- ALTER TABLE access_versions NO FORCE ROW LEVEL SECURITY;
-- ALTER TABLE org_modules     NO FORCE ROW LEVEL SECURITY;
-- ALTER TABLE group_roles     NO FORCE ROW LEVEL SECURITY;
-- DROP POLICY IF EXISTS rls_tenant ON access_versions;
-- DROP POLICY IF EXISTS rls_tenant ON org_modules;
-- DROP POLICY IF EXISTS rls_tenant ON group_roles;
-- ALTER TABLE access_versions DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE org_modules     DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE group_roles     DISABLE ROW LEVEL SECURITY;
