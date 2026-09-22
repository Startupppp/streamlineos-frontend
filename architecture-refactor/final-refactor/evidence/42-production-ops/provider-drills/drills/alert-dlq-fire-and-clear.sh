set -u
DB="$1"; BE="$2"
cleanup() {
  psql "$DB" -q -c "DELETE FROM outbox_events WHERE event_id LIKE 'drill-c162-dlq-%';" \
              -c "DELETE FROM notification_deliveries WHERE idempotency_key LIKE 'drill-c162-dlq-%';" \
              -c "DELETE FROM organization_members WHERE id = 900000778;" \
              -c "DELETE FROM organizations WHERE id = 'drill-c162-dlq-e2e';" \
              -c "DELETE FROM users WHERE id = 'drill-c162-dlq-user';" >/dev/null 2>&1
}
trap cleanup EXIT INT TERM
run() { ( cd "$BE" && DATABASE_URL="$DB" node "src/scripts/$1" 2>/dev/null ); echo "EXIT=$?"; }

echo "### BEFORE — both DLQ alerts quiet"
echo "-- alert-dead-outbox";   run alert-dead-outbox.mjs
echo "-- alert-dead-delivery"; run alert-dead-delivery.mjs
echo ""
echo "### Committing retry-EXHAUSTED rows: outbox retry_count=8 (OUTBOX_MAX_RETRIES) -> DEAD,"
echo "### and notification_deliveries attempt_count=5/max_attempts=5 -> DEAD on PUSH and EMAIL."
echo "### One outbox row at retry_count=7 and one delivery at 3/5 are still retrying and must NOT fire."
psql "$DB" -q -v ON_ERROR_STOP=1 <<'SQL'
BEGIN;
SET CONSTRAINTS ALL DEFERRED;
INSERT INTO users (id, email) VALUES ('drill-c162-dlq-user','drill-c162-dlq@example.invalid');
INSERT INTO organizations (id, name, slug, owner_membership_id)
  VALUES ('drill-c162-dlq-e2e','C162 DLQ Drill','drill-c162-dlq-e2e', 900000778);
INSERT INTO organization_members (id, user_id, org_id) OVERRIDING SYSTEM VALUE
  VALUES (900000778,'drill-c162-dlq-user','drill-c162-dlq-e2e');
INSERT INTO outbox_events
  (event_id, organization_id, aggregate_type, aggregate_id, aggregate_version, event_type,
   payload, occurred_at, delivery_state, retry_count, last_error, dead_lettered_at)
VALUES
  ('drill-c162-dlq-dead','drill-c162-dlq-e2e','email','d1',1,'invitation.created',
   '{"drill":true}'::jsonb, now(),'DEAD',8,'email provider outage: 503 x8', now()),
  ('drill-c162-dlq-retrying','drill-c162-dlq-e2e','email','d2',1,'invitation.created',
   '{"drill":true}'::jsonb, now(),'PENDING',7,'email provider outage: 503 x7', NULL);
INSERT INTO notification_deliveries
  (org_id, user_id, event_key, channel, status, attempt_count, max_attempts, failed_at, failure_message, idempotency_key)
VALUES
  ('drill-c162-dlq-e2e','drill-c162-dlq-user','chat.message','PUSH','DEAD',5,5, now(),'web-push unreachable after 5 attempts','drill-c162-dlq-push'),
  ('drill-c162-dlq-e2e','drill-c162-dlq-user','invitation.created','EMAIL','DEAD',5,5, now(),'resend 503 after 5 attempts','drill-c162-dlq-email'),
  ('drill-c162-dlq-e2e','drill-c162-dlq-user','chat.message','PUSH','PENDING',3,5, NULL, NULL,'drill-c162-dlq-push-retrying');
COMMIT;
SQL
echo ""
echo "### AFTER — both DLQ alerts must FIRE with exit 1"
echo "-- alert-dead-outbox";   run alert-dead-outbox.mjs
echo "-- alert-dead-delivery"; run alert-dead-delivery.mjs
echo ""
echo "### RECOVERY — provider returns, operator redrives; both alerts must clear"
psql "$DB" -q -c "UPDATE outbox_events SET delivery_state='DELIVERED', published_at=now(), dead_lettered_at=NULL, last_error=NULL WHERE event_id LIKE 'drill-c162-dlq-%';" \
             -c "UPDATE notification_deliveries SET status='SENT', sent_at=now(), failed_at=NULL, failure_message=NULL WHERE idempotency_key LIKE 'drill-c162-dlq-%';"
echo "-- alert-dead-outbox";   run alert-dead-outbox.mjs
echo "-- alert-dead-delivery"; run alert-dead-delivery.mjs
echo ""
cleanup
trap - EXIT
echo "### CLEANED UP — residual rows:"
psql "$DB" -Atc "select (select count(*) from outbox_events where event_id like 'drill-c162-dlq-%')||' outbox, '||(select count(*) from notification_deliveries where idempotency_key like 'drill-c162-dlq-%')||' deliveries, '||(select count(*) from organizations where id='drill-c162-dlq-e2e')||' orgs'"
