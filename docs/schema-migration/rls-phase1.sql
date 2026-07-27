-- =============================================================================
-- RLS PHASE 1 — Shadow / Prepare
-- Safe to execute in staging only; GATE 0.5 must pass before any prod run.
-- See rls-rollout-plan.md for pre-conditions and rollback procedure.
--
-- What this script does:
--   1. Creates (or replaces) the three fail-closed GUC helper functions.
--   2. Creates AS RESTRICTIVE policies on three VERIFIED pilot tables.
--   3. Enables RLS (ENABLE, NOT FORCE) on those three tables.
--
-- FORCE is intentionally deferred to Phase 2 so the table-owner role
-- (streamline_migrator) still bypasses, allowing migration scripts to run
-- unaffected while we shadow-observe the app role's behaviour.
--
-- Pilot tables chosen (all VERIFIED, text org_id, Template A / INTERNAL):
--   • access_versions   — RBAC version counter; very low write traffic; safe to break visibly
--   • org_modules       — per-org module flags; low write; critical enough to spot policy miss fast
--   • group_roles       — RBAC group→role assignments; low traffic; critical for permission checks
-- =============================================================================

SET statement_timeout = '30s';

-- ---------------------------------------------------------------------------
-- 1. Fail-closed GUC helpers (idempotent — safe to re-run)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION rls_org_id()
  RETURNS text
  LANGUAGE sql
  STABLE
  PARALLEL SAFE
AS $$
  SELECT NULLIF(TRIM(current_setting('app.organization_id', true)), '')
$$;

CREATE OR REPLACE FUNCTION rls_membership_id()
  RETURNS text
  LANGUAGE sql
  STABLE
  PARALLEL SAFE
AS $$
  SELECT NULLIF(TRIM(current_setting('app.organization_membership_id', true)), '')
$$;

CREATE OR REPLACE FUNCTION rls_audience()
  RETURNS text
  LANGUAGE sql
  STABLE
  PARALLEL SAFE
AS $$
  SELECT NULLIF(TRIM(current_setting('app.audience', true)), '')
$$;

-- ---------------------------------------------------------------------------
-- 2. Pilot table: access_versions
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS rls_tenant ON access_versions;

CREATE POLICY rls_tenant ON access_versions
  AS RESTRICTIVE
  FOR ALL
  TO streamline_app
  USING  (org_id = rls_org_id() AND rls_audience() = 'INTERNAL')
  WITH CHECK (org_id = rls_org_id() AND rls_audience() = 'INTERNAL');

ALTER TABLE access_versions ENABLE ROW LEVEL SECURITY;
-- FORCE deferred to Phase 2

-- ---------------------------------------------------------------------------
-- 3. Pilot table: org_modules
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS rls_tenant ON org_modules;

CREATE POLICY rls_tenant ON org_modules
  AS RESTRICTIVE
  FOR ALL
  TO streamline_app
  USING  (org_id = rls_org_id() AND rls_audience() = 'INTERNAL')
  WITH CHECK (org_id = rls_org_id() AND rls_audience() = 'INTERNAL');

ALTER TABLE org_modules ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 4. Pilot table: group_roles
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS rls_tenant ON group_roles;

CREATE POLICY rls_tenant ON group_roles
  AS RESTRICTIVE
  FOR ALL
  TO streamline_app
  USING  (org_id = rls_org_id() AND rls_audience() = 'INTERNAL')
  WITH CHECK (org_id = rls_org_id() AND rls_audience() = 'INTERNAL');

ALTER TABLE group_roles ENABLE ROW LEVEL SECURITY;
