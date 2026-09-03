-- =====================================================================================
-- PRD-C162 provider drills — executable against the REAL head schema.
--
-- Everything runs inside ONE transaction that ends in ROLLBACK, so the database is
-- byte-identical afterwards. Fixture ids are prefixed drill-c162- so a stray row is
-- unmistakable.
--
-- Run:  psql "postgresql://tarunchintakunta@localhost:5432/scratch_head_1010" \
--         -v ON_ERROR_STOP=1 -f provider-drills.sql
--
-- Each drill prints an EXPECT line and then the observed value. The final SELECTs
-- after ROLLBACK prove nothing was left behind.
-- =====================================================================================

\set ON_ERROR_STOP on
\timing off

BEGIN;
SET CONSTRAINTS ALL DEFERRED;

-- -------------------------------------------------------------------------------------
-- Fixture: two tenants, each with a razorpay provider row and a test webhook endpoint.
-- -------------------------------------------------------------------------------------
INSERT INTO users (id, email) VALUES
  ('drill-c162-user-a', 'drill-c162-a@example.invalid'),
  ('drill-c162-user-b', 'drill-c162-b@example.invalid');

INSERT INTO organizations (id, name, slug, owner_membership_id) VALUES
  ('drill-c162-org-a', 'Drill Org A', 'drill-c162-org-a', 900000001),
  ('drill-c162-org-b', 'Drill Org B', 'drill-c162-org-b', 900000002);

INSERT INTO organization_members (id, user_id, org_id) OVERRIDING SYSTEM VALUE VALUES
  (900000001, 'drill-c162-user-a', 'drill-c162-org-a'),
  (900000002, 'drill-c162-user-b', 'drill-c162-org-b');

INSERT INTO payment_providers (id, org_id, provider_key, display_name) OVERRIDING SYSTEM VALUE VALUES
  (900000001, 'drill-c162-org-a', 'razorpay', 'Razorpay (drill A)'),
  (900000002, 'drill-c162-org-b', 'razorpay', 'Razorpay (drill B)');

INSERT INTO payment_webhook_endpoints (id, org_id, provider_id, environment, url)
OVERRIDING SYSTEM VALUE VALUES
  (900000001, 'drill-c162-org-a', 900000001, 'test', 'https://drill.invalid/webhooks/payments/razorpay/test/drill-c162-org-a');

\echo ''
\echo '### DRILL 1 — PAYMENT REPLAY. Same provider_event_id delivered twice is a no-op.'
\echo '### The app writes ON CONFLICT DO NOTHING against uq_payment_webhook_events_provider_env_event'
\echo '### (payment-webhook-receiver.service.ts:245-252) and returns {ok:true,duplicate:true} when'
\echo '### RETURNING yields no row. This runs that exact insert against the live constraint.'
\echo 'EXPECT: first delivery -> 1 row returned'

INSERT INTO payment_webhook_events
  (org_id, provider_id, environment, provider_event_id, event_type, signature_valid,
   processing_status, idempotency_key, payload_redacted, processed_at)
VALUES
  ('drill-c162-org-a', 900000001, 'test', 'pay_drill_replay_001', 'payment.captured', true,
   'processed', 'pay_drill_replay_001', '{"payment":{"id":"pay_drill_replay_001","status":"captured"}}'::jsonb, now())
ON CONFLICT (provider_id, environment, provider_event_id) DO NOTHING
RETURNING 'first-delivery-inserted' AS observed, id;

\echo 'EXPECT: replayed delivery -> 0 rows returned (the fence bit)'

INSERT INTO payment_webhook_events
  (org_id, provider_id, environment, provider_event_id, event_type, signature_valid,
   processing_status, idempotency_key, payload_redacted, processed_at)
VALUES
  ('drill-c162-org-a', 900000001, 'test', 'pay_drill_replay_001', 'payment.captured', true,
   'processed', 'pay_drill_replay_001', '{"payment":{"id":"pay_drill_replay_001","status":"captured"}}'::jsonb, now())
ON CONFLICT (provider_id, environment, provider_event_id) DO NOTHING
RETURNING 'replay-inserted-THIS-IS-A-FAILURE' AS observed, id;

\echo 'EXPECT: exactly 1 stored row for that event id'
SELECT count(*) AS stored_rows_for_replayed_event
FROM payment_webhook_events
WHERE provider_id = 900000001 AND environment = 'test' AND provider_event_id = 'pay_drill_replay_001';

\echo ''
\echo '### DRILL 1b — the fence is scoped per (provider, environment). A test-mode event id'
\echo '### must not silently swallow the live-mode event of the same name.'
\echo 'EXPECT: 1 row (live is a distinct fence slot)'
INSERT INTO payment_webhook_events
  (org_id, provider_id, environment, provider_event_id, event_type, signature_valid,
   processing_status, idempotency_key, payload_redacted, processed_at)
VALUES
  ('drill-c162-org-a', 900000001, 'live', 'pay_drill_replay_001', 'payment.captured', true,
   'processed', 'pay_drill_replay_001', '{}'::jsonb, now())
ON CONFLICT (provider_id, environment, provider_event_id) DO NOTHING
RETURNING 'live-env-inserted' AS observed, environment;

\echo ''
\echo '### DRILL 1c — CROSS-TENANT REPLAY. Tenant B replaying tenant A''s event id lands on'
\echo '### a different provider_id, so the DB fence does NOT block it. The tenant check that'
\echo '### does block it is in the application: provider-event-ledger / billing-webhook.handler'
\echo '### logs "event id already recorded against another tenant". This drill shows the DB'
\echo '### layer alone is not the tenant fence.'
\echo 'EXPECT: 1 row inserted under org-b (DB fence is per provider, not global)'
INSERT INTO payment_webhook_events
  (org_id, provider_id, environment, provider_event_id, event_type, signature_valid,
   processing_status, idempotency_key, payload_redacted, processed_at)
VALUES
  ('drill-c162-org-b', 900000002, 'test', 'pay_drill_replay_001', 'payment.captured', true,
   'processed', 'pay_drill_replay_001', '{}'::jsonb, now())
ON CONFLICT (provider_id, environment, provider_event_id) DO NOTHING
RETURNING 'cross-tenant-inserted' AS observed, org_id;

\echo ''
\echo '### DRILL 2 — PAYMENT FORGERY. A bad HMAC makes the receiver call'
\echo '### recordSignatureFailure() (payment-webhook-receiver.service.ts:191-198), which flips'
\echo '### the endpoint to status=failing / failure_reason=Invalid signature and returns 401'
\echo '### BEFORE any ledger insert. This drill writes that exact end state and then runs the'
\echo '### VERBATIM predicate from src/scripts/alert-sig-failures.mjs against it.'

UPDATE payment_webhook_endpoints
SET status = 'failing', last_failure_at = now(), failure_reason = 'Invalid signature'
WHERE id = 900000001;

\echo 'EXPECT: alert-sig-failures predicate returns 1 row -> fired=true, exit 1'
SELECT
  pwe.org_id,
  pp.provider_key,
  pwe.environment,
  pwe.status,
  pwe.last_failure_at,
  pwe.failure_reason
FROM payment_webhook_endpoints pwe
JOIN payment_providers pp ON pp.id = pwe.provider_id
WHERE pwe.status = 'failing'
  AND pwe.last_failure_at > NOW() - (24 * INTERVAL '1 hour')
ORDER BY pwe.last_failure_at DESC;

\echo 'EXPECT: 0 rows once the failure ages out of the 24h window (the alert clears, no flap)'
UPDATE payment_webhook_endpoints SET last_failure_at = now() - INTERVAL '30 hours' WHERE id = 900000001;
SELECT count(*) AS rows_outside_window
FROM payment_webhook_endpoints pwe
JOIN payment_providers pp ON pp.id = pwe.provider_id
WHERE pwe.status = 'failing'
  AND pwe.last_failure_at > NOW() - (24 * INTERVAL '1 hour');

\echo ''
\echo '### DRILL 3 — EMAIL SUPPRESSION. A provider bounce webhook writes the suppression row'
\echo '### (email-webhook.service.ts:66-73 -> EmailSuppressionService.suppress). Every outbound'
\echo '### email passes EmailOutboxService.applySuppression, whose predicate is reproduced'
\echo '### verbatim below from email-suppression.service.ts:42-54.'

INSERT INTO email_suppressions (email, org_id, channel, reason, source, evidence)
VALUES ('bounced@example.invalid', NULL, 'EMAIL', 'HARD_BOUNCE', 'PROVIDER_WEBHOOK',
        '{"provider":"resend","type":"email.bounced"}'::jsonb)
ON CONFLICT (email, channel) WHERE org_id IS NULL DO NOTHING
RETURNING 'bounce-suppression-written' AS observed, email, reason;

\echo 'EXPECT: 0 rows — a redelivered bounce is idempotent, not a second suppression row'
INSERT INTO email_suppressions (email, org_id, channel, reason, source, evidence)
VALUES ('bounced@example.invalid', NULL, 'EMAIL', 'HARD_BOUNCE', 'PROVIDER_WEBHOOK',
        '{"provider":"resend","type":"email.bounced"}'::jsonb)
ON CONFLICT (email, channel) WHERE org_id IS NULL DO NOTHING
RETURNING 'redelivered-bounce-duplicated-THIS-IS-A-FAILURE' AS observed;

-- an already-expired suppression, and a tenant-scoped one for another org
INSERT INTO email_suppressions (email, org_id, channel, reason, source, expires_at)
VALUES ('expired@example.invalid', NULL, 'EMAIL', 'UNSUBSCRIBE', 'USER', now() - INTERVAL '1 day');
INSERT INTO email_suppressions (email, org_id, channel, reason, source)
VALUES ('org-b-only@example.invalid', 'drill-c162-org-b', 'EMAIL', 'COMPLAINT', 'PROVIDER_WEBHOOK');

\echo 'EXPECT: findSuppressed(org-a) returns ONLY bounced@example.invalid.'
\echo '        clean@ is deliverable; expired@ has aged out; org-b-only@ belongs to another tenant.'
SELECT email AS suppressed_for_org_a
FROM email_suppressions
WHERE email IN ('bounced@example.invalid','clean@example.invalid','expired@example.invalid','org-b-only@example.invalid')
  AND channel = 'EMAIL'
  AND (expires_at IS NULL OR expires_at > now())
  AND (org_id IS NULL OR org_id = 'drill-c162-org-a')
ORDER BY email;

\echo 'EXPECT: findSuppressed(org-b) additionally returns org-b-only@example.invalid'
SELECT email AS suppressed_for_org_b
FROM email_suppressions
WHERE email IN ('bounced@example.invalid','clean@example.invalid','expired@example.invalid','org-b-only@example.invalid')
  AND channel = 'EMAIL'
  AND (expires_at IS NULL OR expires_at > now())
  AND (org_id IS NULL OR org_id = 'drill-c162-org-b')
ORDER BY email;

\echo ''
\echo '### DRILL 4 — RETRY EXHAUSTION / DEAD LETTER. OUTBOX_MAX_RETRIES = 8'
\echo '### (outbox-envelope.ts:8). outbox-publisher.service.ts:208-233 flips the row to'
\echo '### delivery_state=DEAD + dead_lettered_at once shouldDeadLetter(retryCount) is true.'
\echo '### This writes retry_count=8/DEAD and one still-retrying row at 7, then runs the'
\echo '### VERBATIM predicate from src/scripts/alert-dead-outbox.mjs.'

INSERT INTO outbox_events
  (event_id, organization_id, aggregate_type, aggregate_id, aggregate_version, event_type,
   payload, occurred_at, delivery_state, retry_count, last_error, dead_lettered_at)
VALUES
  ('drill-c162-evt-dead', 'drill-c162-org-a', 'email', 'drill-1', 1, 'invitation.created',
   '{"drill":true}'::jsonb, now(), 'DEAD', 8, 'provider outage: ECONNREFUSED', now()),
  ('drill-c162-evt-retrying', 'drill-c162-org-a', 'email', 'drill-2', 1, 'invitation.created',
   '{"drill":true}'::jsonb, now(), 'PENDING', 7, 'provider outage: ECONNREFUSED', NULL);

\echo 'EXPECT: exactly 1 DEAD row -> alert-dead-outbox fires. The retry_count=7 row is still'
\echo '        being retried and must NOT appear.'
SELECT organization_id AS org_id, event_type, dead_lettered_at, last_error, retry_count
FROM outbox_events
WHERE delivery_state = 'DEAD'
  AND dead_lettered_at > NOW() - (24 * INTERVAL '1 hour')
ORDER BY dead_lettered_at DESC
LIMIT 50;

\echo ''
\echo '### DRILL 5 — PUSH / EMAIL CHANNEL RETRY EXHAUSTION. notification_deliveries carries'
\echo '### its own ceiling (max_attempts, default 5). Rows at the ceiling go status=DEAD and'
\echo '### are picked up by the VERBATIM predicate from src/scripts/alert-dead-delivery.mjs.'

INSERT INTO notification_deliveries
  (org_id, user_id, event_key, channel, status, attempt_count, max_attempts,
   failed_at, failure_message, idempotency_key)
VALUES
  ('drill-c162-org-a', 'drill-c162-user-a', 'chat.message', 'PUSH', 'DEAD', 5, 5,
   now(), 'web-push: provider unreachable after 5 attempts', 'drill-c162-push-dead'),
  ('drill-c162-org-a', 'drill-c162-user-a', 'invitation.created', 'EMAIL', 'DEAD', 5, 5,
   now(), 'resend: 503 after 5 attempts', 'drill-c162-email-dead'),
  ('drill-c162-org-a', 'drill-c162-user-a', 'chat.message', 'PUSH', 'PENDING', 3, 5,
   NULL, NULL, 'drill-c162-push-retrying');

\echo 'EXPECT: 2 DEAD rows (one PUSH, one EMAIL). The PENDING attempt 3/5 must NOT appear.'
SELECT org_id, event_key, channel, failed_at, failure_message, attempt_count
FROM notification_deliveries
WHERE status = 'DEAD'
  AND failed_at > NOW() - (24 * INTERVAL '1 hour')
ORDER BY failed_at DESC
LIMIT 50;

\echo ''
\echo '### DRILL 6 — RECOVERY. After the provider comes back, the same rows transition to a'
\echo '### healthy end state and every alert predicate clears. This is the recovery half of'
\echo '### the outage scenario: proving the alert de-asserts is as important as proving it fires.'

UPDATE payment_webhook_endpoints
SET status = 'verified', last_verified_at = now(), failure_reason = NULL, last_failure_at = NULL
WHERE id = 900000001;
UPDATE outbox_events
SET delivery_state = 'DELIVERED', published_at = now(), dead_lettered_at = NULL, last_error = NULL
WHERE event_id IN ('drill-c162-evt-dead','drill-c162-evt-retrying');
UPDATE notification_deliveries
SET status = 'SENT', sent_at = now(), failed_at = NULL, failure_message = NULL
WHERE idempotency_key LIKE 'drill-c162-%';

\echo 'EXPECT: all three post-recovery counts are 0 — every alert clears.'
SELECT
  (SELECT count(*) FROM payment_webhook_endpoints pwe
     WHERE pwe.status = 'failing' AND pwe.last_failure_at > NOW() - INTERVAL '24 hours')
    AS sig_failure_alert_rows,
  (SELECT count(*) FROM outbox_events
     WHERE delivery_state = 'DEAD' AND dead_lettered_at > NOW() - INTERVAL '24 hours')
    AS dead_outbox_alert_rows,
  (SELECT count(*) FROM notification_deliveries
     WHERE status = 'DEAD' AND failed_at > NOW() - INTERVAL '24 hours')
    AS dead_delivery_alert_rows;

ROLLBACK;

\echo ''
\echo '### POST-ROLLBACK — the database must be exactly as it was.'
\echo 'EXPECT: every count is 0.'
SELECT
  (SELECT count(*) FROM organizations WHERE id LIKE 'drill-c162-%')            AS orgs_left,
  (SELECT count(*) FROM payment_webhook_events WHERE provider_event_id LIKE 'pay_drill_%') AS webhook_events_left,
  (SELECT count(*) FROM email_suppressions WHERE email LIKE '%@example.invalid')  AS suppressions_left,
  (SELECT count(*) FROM outbox_events WHERE event_id LIKE 'drill-c162-%')      AS outbox_left,
  (SELECT count(*) FROM notification_deliveries WHERE idempotency_key LIKE 'drill-c162-%') AS deliveries_left;
