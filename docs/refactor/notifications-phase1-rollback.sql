-- Notifications Phase 1 rollback — reverse order.
-- Numbering note (2026-08-11): Inventory took 0409 mid-flight, so the shipped
-- Notifications migrations are 0408, 0410 and 0411; notification_outbox (written
-- below as "0409") moves to 0412 when it ships. Section headers below name the
-- change, not the final number, where those now differ.
-- Run only as a whole. Every statement is IF EXISTS so a partial forward run
-- rolls back cleanly. Safe because no migration in this batch carries data:
-- notification_preferences, notification_templates and outbox_events are empty,
-- and notifications/notification_deliveries/notification_queue hold 8 rows total.
--
-- After running, delete the 0408..0417 rows from drizzle.__drizzle_migrations
-- and remove the matching entries from migrations/meta/_journal.json, or the
-- next db:migrate will believe they are still applied.
--
-- NOT REVERSIBLE: the two ALTER TYPE ... ADD VALUE statements (0408, 0411).
-- PostgreSQL cannot drop an enum label. 'ACCOUNTING' and 'NO_ACCESS' remain as
-- unused members. They are additive and harmless; nothing reads them after the
-- code rollback. Dropping them would require recreating both enum types and
-- every column that uses them, which is a far larger risk than leaving them.

SET statement_timeout = 0;
SET lock_timeout = '5s';

-- 0417_push_subscription_hygiene
DROP INDEX IF EXISTS "idx_push_subs_org_user";
CREATE INDEX IF NOT EXISTS "idx_push_subs_user" ON "push_subscriptions" ("user_id");
DROP INDEX IF EXISTS "uniq_push_subscriptions_org_user_endpoint";
CREATE UNIQUE INDEX IF NOT EXISTS "push_subscriptions_endpoint_unique"
  ON "push_subscriptions" ("endpoint");
ALTER TABLE "push_subscriptions" DROP COLUMN IF EXISTS "updated_at";
ALTER TABLE "push_subscriptions" DROP COLUMN IF EXISTS "last_seen_at";

-- 0416_notification_pk_widening
-- Safe only while max(id) < 2147483647. Verified 2026-08-11: max ids are
-- notifications 10, notification_deliveries 5, notification_queue 2.
-- RE-VERIFY before running; a rollback after real traffic would truncate ids.
--
-- Five constraints depend on these columns, including two Wave-4 COMPOSITE
-- tenant FKs on (id, org_id) and one from notification_audit_logs. All must be
-- dropped before the type change and re-added after, or the ALTER fails.
ALTER TABLE "notification_audit_logs"  DROP CONSTRAINT IF EXISTS "fk_notification_audit_logs_notification";
ALTER TABLE "notification_queue"       DROP CONSTRAINT IF EXISTS "fk_notification_queue_delivery_id_org";
ALTER TABLE "notification_queue"       DROP CONSTRAINT IF EXISTS "notification_queue_delivery_id_notification_deliveries_id_fk";
ALTER TABLE "notification_deliveries"  DROP CONSTRAINT IF EXISTS "fk_notification_deliveries_notification_id_org";
ALTER TABLE "notification_deliveries"  DROP CONSTRAINT IF EXISTS "notification_deliveries_notification_id_notifications_id_fk";

-- Identity → serial, then bigint → integer.
ALTER TABLE "notifications"           ALTER COLUMN "id" DROP IDENTITY IF EXISTS;
ALTER TABLE "notification_deliveries" ALTER COLUMN "id" DROP IDENTITY IF EXISTS;
ALTER TABLE "notification_queue"      ALTER COLUMN "id" DROP IDENTITY IF EXISTS;

ALTER TABLE "notification_audit_logs" ALTER COLUMN "notification_id" TYPE integer;
ALTER TABLE "notification_queue"      ALTER COLUMN "id" TYPE integer,
                                      ALTER COLUMN "delivery_id" TYPE integer;
ALTER TABLE "notification_deliveries" ALTER COLUMN "id" TYPE integer,
                                      ALTER COLUMN "notification_id" TYPE integer;
ALTER TABLE "notifications"           ALTER COLUMN "id" TYPE integer;

CREATE SEQUENCE IF NOT EXISTS "notifications_id_seq"           OWNED BY "notifications"."id";
CREATE SEQUENCE IF NOT EXISTS "notification_deliveries_id_seq" OWNED BY "notification_deliveries"."id";
CREATE SEQUENCE IF NOT EXISTS "notification_queue_id_seq"      OWNED BY "notification_queue"."id";
SELECT setval('notifications_id_seq',           GREATEST(COALESCE((SELECT MAX(id) FROM "notifications"), 1), 1));
SELECT setval('notification_deliveries_id_seq', GREATEST(COALESCE((SELECT MAX(id) FROM "notification_deliveries"), 1), 1));
SELECT setval('notification_queue_id_seq',      GREATEST(COALESCE((SELECT MAX(id) FROM "notification_queue"), 1), 1));
ALTER TABLE "notifications"           ALTER COLUMN "id" SET DEFAULT nextval('notifications_id_seq');
ALTER TABLE "notification_deliveries" ALTER COLUMN "id" SET DEFAULT nextval('notification_deliveries_id_seq');
ALTER TABLE "notification_queue"      ALTER COLUMN "id" SET DEFAULT nextval('notification_queue_id_seq');

-- Re-add all five constraints. NOT VALID → VALIDATE keeps the lock window short (§19).
ALTER TABLE "notification_deliveries"
  ADD CONSTRAINT "notification_deliveries_notification_id_notifications_id_fk"
  FOREIGN KEY ("notification_id") REFERENCES "notifications"("id") NOT VALID;
ALTER TABLE "notification_deliveries"
  ADD CONSTRAINT "fk_notification_deliveries_notification_id_org"
  FOREIGN KEY ("notification_id","org_id") REFERENCES "notifications"("id","org_id") NOT VALID;
ALTER TABLE "notification_queue"
  ADD CONSTRAINT "notification_queue_delivery_id_notification_deliveries_id_fk"
  FOREIGN KEY ("delivery_id") REFERENCES "notification_deliveries"("id") NOT VALID;
ALTER TABLE "notification_queue"
  ADD CONSTRAINT "fk_notification_queue_delivery_id_org"
  FOREIGN KEY ("delivery_id","org_id") REFERENCES "notification_deliveries"("id","org_id") NOT VALID;
ALTER TABLE "notification_audit_logs"
  ADD CONSTRAINT "fk_notification_audit_logs_notification"
  FOREIGN KEY ("notification_id") REFERENCES "notifications"("id") NOT VALID;

ALTER TABLE "notification_deliveries" VALIDATE CONSTRAINT "notification_deliveries_notification_id_notifications_id_fk";
ALTER TABLE "notification_deliveries" VALIDATE CONSTRAINT "fk_notification_deliveries_notification_id_org";
ALTER TABLE "notification_queue"      VALIDATE CONSTRAINT "notification_queue_delivery_id_notification_deliveries_id_fk";
ALTER TABLE "notification_queue"      VALIDATE CONSTRAINT "fk_notification_queue_delivery_id_org";
ALTER TABLE "notification_audit_logs" VALIDATE CONSTRAINT "fk_notification_audit_logs_notification";

-- 0415_delivery_snapshot_and_cost
ALTER TABLE "notification_deliveries" DROP COLUMN IF EXISTS "expires_at";
ALTER TABLE "notification_deliveries" DROP COLUMN IF EXISTS "template_version";
ALTER TABLE "notification_deliveries" DROP COLUMN IF EXISTS "rendered_body";
ALTER TABLE "notification_deliveries" DROP COLUMN IF EXISTS "rendered_subject";

-- 0414_notification_events_global_unique
DROP INDEX IF EXISTS "uniq_notification_events_global_key";

-- 0413_notification_preference_rules
DROP INDEX IF EXISTS "uniq_notification_preference_rules_org_id";
DROP INDEX IF EXISTS "idx_notification_pref_rule_lookup";
DROP INDEX IF EXISTS "uniq_notification_pref_rule";
DROP TABLE IF EXISTS "notification_preference_rules";
-- Restore the (buggy) global unique on user_id and the quiet-hours timezone column.
-- Both are defects — restored only so rollback returns the exact prior schema.
DROP INDEX IF EXISTS "uniq_notification_preferences_org_user";
CREATE UNIQUE INDEX IF NOT EXISTS "notification_preferences_user_id_unique"
  ON "notification_preferences" ("user_id");
ALTER TABLE "notification_preferences"
  ADD COLUMN IF NOT EXISTS "quiet_hours_timezone" text DEFAULT 'UTC';

-- 0412_email_suppressions_and_consent
DROP INDEX IF EXISTS "uniq_notification_consents_org_id";
DROP INDEX IF EXISTS "uniq_notification_consents_current";
DROP TABLE IF EXISTS "notification_consent_events";
DROP TABLE IF EXISTS "notification_consents";
DROP INDEX IF EXISTS "uniq_email_suppressions_org";
DROP INDEX IF EXISTS "uniq_email_suppressions_global";
DROP TABLE IF EXISTS "email_suppressions";

-- 0411_suppression_reason_no_access  → see header: enum label cannot be dropped.

-- 0410_notification_visibility
ALTER TABLE "notification_events" DROP COLUMN IF EXISTS "visibility_resource_kind";

-- 0409_notification_outbox
DROP INDEX IF EXISTS "idx_notification_outbox_claim";
DROP INDEX IF EXISTS "uniq_notification_outbox_dedupe";
DROP INDEX IF EXISTS "uniq_notification_outbox_org_id";
DROP TABLE IF EXISTS "notification_outbox";

-- 0408_notification_category_accounting  → see header: enum label cannot be dropped.

-- Index restorations from section 8 (shipped inside 0416).
DROP INDEX IF EXISTS "idx_notifications_org_user_unread";
CREATE INDEX IF NOT EXISTS "idx_notifications_user_unread_created"
  ON "notifications" ("user_id", "is_read", "created_at");
CREATE INDEX IF NOT EXISTS "idx_notifications_priority" ON "notifications" ("priority");
