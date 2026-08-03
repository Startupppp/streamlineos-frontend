-- =============================================================================
-- RLS PHASE 3 — Fleet Rollout (catalog-driven, idempotent)
-- Pre-conditions: Phase 2 FORCE stable on pilots; all verification tasks in
-- wave-0-rls-matrix.md Part 10 closed for the target wave group.
-- =============================================================================

SET statement_timeout = 0;

-- ---------------------------------------------------------------------------
-- Section A: Catalog-driven loop — all public tables with an org_id column
-- of type text or varchar (excludes integer org_id and tables with no org_id).
-- Applies Template A (INTERNAL audience) via AS RESTRICTIVE policy.
-- Skips tables listed in the exclusion set; those are handled separately below.
-- ---------------------------------------------------------------------------

DO $$
DECLARE
  rec record;
  excluded text[] := ARRAY[
    'users',
    'accounts',
    'sessions',
    'verification_tokens',
    'user_sessions',
    'mfa_backup_codes',
    'magic_link_tokens',
    'email_otp_codes',
    'user_api_tokens',
    'devices',
    'roles',
    'permissions',
    'marketplace_apps',
    'ai_credit_packs',
    'blog_posts',
    'blog_authors',
    'blog_categories',
    'user_preferences',
    'billing_profiles',
    'app_installations',
    'affiliates',
    'revenue_events',
    'referrals',
    'affiliate_commissions',
    'organizations',
    'indian_states',
    'notification_events',
    'feature_flags',
    'role_permissions',
    'journal_lines',
    'project_client_grants',
    'command_fences'
  ];
BEGIN
  FOR rec IN
    SELECT DISTINCT c.relname AS tbl
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
      AND n.nspname = 'public'
    JOIN pg_attribute a ON a.attrelid = c.oid
      AND a.attname = 'org_id'
      AND a.attnum > 0
      AND NOT a.attisdropped
    JOIN pg_type t ON t.oid = a.atttypid
      AND t.typname IN ('text', 'varchar', 'bpchar')
    WHERE c.relkind = 'r'
      AND c.relname != ALL(excluded)
    ORDER BY tbl
  LOOP
    EXECUTE format(
      'DROP POLICY IF EXISTS rls_tenant ON %I',
      rec.tbl
    );
    EXECUTE format(
      $p$
        CREATE POLICY rls_tenant ON %I
          AS RESTRICTIVE
          FOR ALL
          TO streamline_app
          USING  (org_id = rls_org_id() AND rls_audience() = 'INTERNAL')
          WITH CHECK (org_id = rls_org_id() AND rls_audience() = 'INTERNAL')
      $p$,
      rec.tbl
    );
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', rec.tbl);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY',  rec.tbl);
  END LOOP;
END;
$$;

-- ---------------------------------------------------------------------------
-- Section B: Broad app-role grant (run AFTER migrations complete)
-- Covers all tables created by migrations up to this point.
-- Re-run after each migration that adds a new table.
-- ---------------------------------------------------------------------------

GRANT USAGE ON SCHEMA public TO streamline_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO streamline_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO streamline_app;

-- ---------------------------------------------------------------------------
-- Section C: organizations (Template C — self-referential PK, dual audience)
-- The loop above skips this table because its tenant column is 'id', not 'org_id'.
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS rls_tenant ON organizations;

CREATE POLICY rls_tenant ON organizations
  AS RESTRICTIVE
  FOR ALL
  TO streamline_app
  USING  (id = rls_org_id() AND rls_audience() IN ('INTERNAL', 'PORTAL'))
  WITH CHECK (id = rls_org_id() AND rls_audience() IN ('INTERNAL', 'PORTAL'));

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations FORCE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- Section D: Tables using 'organization_id' column name (not 'org_id')
-- These are NOT picked up by the catalog loop.
-- Add further tables with this column name as they are discovered.
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS rls_tenant ON membership_role_assignments;

CREATE POLICY rls_tenant ON membership_role_assignments
  AS RESTRICTIVE
  FOR ALL
  TO streamline_app
  USING  (organization_id = rls_org_id() AND rls_audience() = 'INTERNAL')
  WITH CHECK (organization_id = rls_org_id() AND rls_audience() = 'INTERNAL');

ALTER TABLE membership_role_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE membership_role_assignments FORCE ROW LEVEL SECURITY;

-- command_fences uses 'organization_id'; audience may be INTERNAL or PORTAL
-- depending on the fence type.  Apply Template A for internal fences; verify
-- whether portal-audience rows exist before adding a second policy.

DROP POLICY IF EXISTS rls_tenant ON command_fences;

CREATE POLICY rls_tenant ON command_fences
  AS RESTRICTIVE
  FOR ALL
  TO streamline_app
  USING  (organization_id = rls_org_id() AND rls_audience() IN ('INTERNAL', 'PORTAL'))
  WITH CHECK (organization_id = rls_org_id() AND rls_audience() IN ('INTERNAL', 'PORTAL'));

ALTER TABLE command_fences ENABLE ROW LEVEL SECURITY;
ALTER TABLE command_fences FORCE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- Section E: Portal-audience table (Template B)
-- project_client_grants requires audience = PORTAL and a membership-id gate.
-- Confirm portal_membership_id column exists before running (task PM-01).
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS rls_tenant ON project_client_grants;

CREATE POLICY rls_tenant ON project_client_grants
  AS RESTRICTIVE
  FOR ALL
  TO streamline_app
  USING (
    org_id = rls_org_id()
    AND rls_audience() = 'PORTAL'
    AND portal_membership_id = rls_membership_id()
  )
  WITH CHECK (
    org_id = rls_org_id()
    AND rls_audience() = 'PORTAL'
    AND portal_membership_id = rls_membership_id()
  );

ALTER TABLE project_client_grants ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_client_grants FORCE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- Section F: Deferred — integer org_id tables (blocked until Wave 9 type fix)
-- billing_profiles, app_installations, affiliates, revenue_events, referrals
-- These tables carry integer org_id and cannot be directly compared to the
-- text value returned by rls_org_id() without a try-cast.
-- Rollout deferred; service-layer BOLA is the mandatory compensating control.
--
-- When the integer→text migration completes, re-run Section A; the loop will
-- pick them up automatically once their org_id column type is 'text'.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- Section G: Nullable-org tables (system rows with org_id IS NULL)
-- These need a permissive USING predicate: (org_id IS NULL OR org_id = rls_org_id())
-- WITH CHECK must stay strict (only insert own-org rows, never null).
-- Tables: feature_flags, notification_events (confirm column presence first).
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS rls_tenant ON feature_flags;

CREATE POLICY rls_tenant ON feature_flags
  AS RESTRICTIVE
  FOR ALL
  TO streamline_app
  USING  (org_id IS NULL OR (org_id = rls_org_id() AND rls_audience() = 'INTERNAL'))
  WITH CHECK (org_id = rls_org_id() AND rls_audience() = 'INTERNAL');

ALTER TABLE feature_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_flags FORCE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- Emergency fleet rollback (run as streamline_migrator or superuser):
--
-- DO $$
-- DECLARE rec record;
-- BEGIN
--   FOR rec IN
--     SELECT tablename FROM pg_policies WHERE policyname = 'rls_tenant'
--   LOOP
--     EXECUTE format('DROP POLICY IF EXISTS rls_tenant ON %I', rec.tablename);
--     EXECUTE format('ALTER TABLE %I NO FORCE ROW LEVEL SECURITY', rec.tablename);
--     EXECUTE format('ALTER TABLE %I DISABLE ROW LEVEL SECURITY', rec.tablename);
--   END LOOP;
-- END;
-- $$;
-- ---------------------------------------------------------------------------
