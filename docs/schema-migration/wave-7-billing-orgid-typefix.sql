-- wave-7-billing-orgid-typefix.sql
-- Idempotent: fix billing tables that stored org_id / user_id as integer
-- while organizations.id and users.id are text.
-- First purges pre-existing orphan rows (integer-era junk whose id maps to no
-- text UUID and would otherwise violate the new FKs), then converts + adds FKs.
-- Guards make every step safe on both integer and already-text columns.

BEGIN;

-- ─── Purge orphaned rows (pre-existing integer-era junk) ────────────────────
-- A NULL FK value is valid, so only rows with a NON-NULL id that resolves to no
-- organization/user are removed. No-op on empty tables and on clean re-runs.

DELETE FROM billing_profiles
  WHERE org_id IS NOT NULL AND org_id::text NOT IN (SELECT id FROM organizations);

DELETE FROM app_installations
  WHERE (org_id IS NOT NULL AND org_id::text NOT IN (SELECT id FROM organizations))
     OR (installed_by IS NOT NULL AND installed_by::text NOT IN (SELECT id FROM users));

DELETE FROM affiliates
  WHERE (org_id IS NOT NULL AND org_id::text NOT IN (SELECT id FROM organizations))
     OR (user_id IS NOT NULL AND user_id::text NOT IN (SELECT id FROM users));

DELETE FROM affiliate_commissions
  WHERE referred_org_id IS NOT NULL
    AND referred_org_id::text NOT IN (SELECT id FROM organizations);

DELETE FROM referrals
  WHERE (referrer_org_id IS NOT NULL AND referrer_org_id::text NOT IN (SELECT id FROM organizations))
     OR (referrer_user_id IS NOT NULL AND referrer_user_id::text NOT IN (SELECT id FROM users))
     OR (referred_org_id IS NOT NULL AND referred_org_id::text NOT IN (SELECT id FROM organizations));

DELETE FROM revenue_events
  WHERE org_id IS NOT NULL AND org_id::text NOT IN (SELECT id FROM organizations);

-- ─── billing_profiles.org_id ────────────────────────────────────────────────

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'billing_profiles'
      AND column_name = 'org_id'
      AND data_type   = 'integer'
  ) THEN
    ALTER TABLE billing_profiles ALTER COLUMN org_id TYPE text USING org_id::text;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'billing_profiles_org_id_organizations_fk'
  ) THEN
    ALTER TABLE billing_profiles
      ADD CONSTRAINT billing_profiles_org_id_organizations_fk
      FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE;
  END IF;
END$$;

CREATE UNIQUE INDEX IF NOT EXISTS billing_profiles_org_idx ON billing_profiles(org_id);

-- ─── app_installations.org_id ───────────────────────────────────────────────

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'app_installations'
      AND column_name = 'org_id'
      AND data_type   = 'integer'
  ) THEN
    ALTER TABLE app_installations ALTER COLUMN org_id TYPE text USING org_id::text;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'app_installations_org_id_organizations_fk'
  ) THEN
    ALTER TABLE app_installations
      ADD CONSTRAINT app_installations_org_id_organizations_fk
      FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE;
  END IF;
END$$;

-- ─── app_installations.installed_by ─────────────────────────────────────────

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'app_installations'
      AND column_name = 'installed_by'
      AND data_type   = 'integer'
  ) THEN
    ALTER TABLE app_installations ALTER COLUMN installed_by TYPE text USING installed_by::text;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'app_installations_installed_by_users_fk'
  ) THEN
    ALTER TABLE app_installations
      ADD CONSTRAINT app_installations_installed_by_users_fk
      FOREIGN KEY (installed_by) REFERENCES users(id) ON DELETE CASCADE;
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS app_installations_org_idx     ON app_installations(org_id);
CREATE INDEX IF NOT EXISTS app_installations_org_app_idx ON app_installations(org_id, app_id);

-- ─── affiliates.org_id ──────────────────────────────────────────────────────

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'affiliates'
      AND column_name = 'org_id'
      AND data_type   = 'integer'
  ) THEN
    ALTER TABLE affiliates ALTER COLUMN org_id TYPE text USING org_id::text;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'affiliates_org_id_organizations_fk'
  ) THEN
    ALTER TABLE affiliates
      ADD CONSTRAINT affiliates_org_id_organizations_fk
      FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE;
  END IF;
END$$;

-- ─── affiliates.user_id ─────────────────────────────────────────────────────

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'affiliates'
      AND column_name = 'user_id'
      AND data_type   = 'integer'
  ) THEN
    ALTER TABLE affiliates ALTER COLUMN user_id TYPE text USING user_id::text;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'affiliates_user_id_users_fk'
  ) THEN
    ALTER TABLE affiliates
      ADD CONSTRAINT affiliates_user_id_users_fk
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS affiliates_user_idx ON affiliates(user_id);
CREATE INDEX IF NOT EXISTS affiliates_code_idx ON affiliates(referral_code);

-- ─── affiliate_commissions.referred_org_id ──────────────────────────────────

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'affiliate_commissions'
      AND column_name = 'referred_org_id'
      AND data_type   = 'integer'
  ) THEN
    ALTER TABLE affiliate_commissions ALTER COLUMN referred_org_id TYPE text USING referred_org_id::text;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'affiliate_commissions_referred_org_id_organizations_fk'
  ) THEN
    ALTER TABLE affiliate_commissions
      ADD CONSTRAINT affiliate_commissions_referred_org_id_organizations_fk
      FOREIGN KEY (referred_org_id) REFERENCES organizations(id) ON DELETE CASCADE;
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS affiliate_commissions_affiliate_idx ON affiliate_commissions(affiliate_id);
CREATE INDEX IF NOT EXISTS affiliate_commissions_status_idx    ON affiliate_commissions(status);

-- ─── referrals.referrer_org_id ──────────────────────────────────────────────

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'referrals'
      AND column_name = 'referrer_org_id'
      AND data_type   = 'integer'
  ) THEN
    ALTER TABLE referrals ALTER COLUMN referrer_org_id TYPE text USING referrer_org_id::text;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'referrals_referrer_org_id_organizations_fk'
  ) THEN
    ALTER TABLE referrals
      ADD CONSTRAINT referrals_referrer_org_id_organizations_fk
      FOREIGN KEY (referrer_org_id) REFERENCES organizations(id) ON DELETE CASCADE;
  END IF;
END$$;

-- ─── referrals.referrer_user_id ─────────────────────────────────────────────

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'referrals'
      AND column_name = 'referrer_user_id'
      AND data_type   = 'integer'
  ) THEN
    ALTER TABLE referrals ALTER COLUMN referrer_user_id TYPE text USING referrer_user_id::text;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'referrals_referrer_user_id_users_fk'
  ) THEN
    ALTER TABLE referrals
      ADD CONSTRAINT referrals_referrer_user_id_users_fk
      FOREIGN KEY (referrer_user_id) REFERENCES users(id) ON DELETE CASCADE;
  END IF;
END$$;

-- ─── referrals.referred_org_id ──────────────────────────────────────────────

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'referrals'
      AND column_name = 'referred_org_id'
      AND data_type   = 'integer'
  ) THEN
    ALTER TABLE referrals ALTER COLUMN referred_org_id TYPE text USING referred_org_id::text;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'referrals_referred_org_id_organizations_fk'
  ) THEN
    ALTER TABLE referrals
      ADD CONSTRAINT referrals_referred_org_id_organizations_fk
      FOREIGN KEY (referred_org_id) REFERENCES organizations(id) ON DELETE CASCADE;
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS referrals_referrer_idx ON referrals(referrer_org_id);
CREATE INDEX IF NOT EXISTS referrals_code_idx     ON referrals(referral_code);
CREATE INDEX IF NOT EXISTS referrals_email_idx    ON referrals(referred_email);

-- ─── revenue_events.org_id ──────────────────────────────────────────────────

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'revenue_events'
      AND column_name = 'org_id'
      AND data_type   = 'integer'
  ) THEN
    ALTER TABLE revenue_events ALTER COLUMN org_id TYPE text USING org_id::text;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'revenue_events_org_id_organizations_fk'
  ) THEN
    ALTER TABLE revenue_events
      ADD CONSTRAINT revenue_events_org_id_organizations_fk
      FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE;
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS revenue_events_type_idx    ON revenue_events(type);
CREATE INDEX IF NOT EXISTS revenue_events_created_idx ON revenue_events(created_at);
CREATE INDEX IF NOT EXISTS revenue_events_org_idx     ON revenue_events(org_id);

COMMIT;
