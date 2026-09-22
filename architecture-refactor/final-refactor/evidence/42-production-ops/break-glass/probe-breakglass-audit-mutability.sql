-- C181 / C180 probe: is the break-glass audit trail (public.operator_access_log)
-- immutable for the running application role, the way public.audit_logs is?
-- Everything happens inside ONE transaction that is ROLLED BACK. Nothing persists.
\set ON_ERROR_STOP off
\echo '=== connected as ==='
SELECT current_user;

BEGIN;
SELECT set_config('app.organization_id', 'probe-org-c181', true);

INSERT INTO public.operator_access_grants
  (grant_id, operator_user_id, org_id, incident_ref, granted_by, scope, expires_at, status, approver_id)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'op-probe', 'probe-org-c181', 'INC-PROBE',
   'requester-probe', 'read_customer_data', now() + interval '1 hour', 'active', 'approver-probe');

INSERT INTO public.operator_access_log
  (log_id, grant_id, operator_user_id, org_id, action, detail, ip_address)
VALUES
  ('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111',
   'op-probe', 'probe-org-c181', 'operator.get./platform/operator/organizations/:orgId',
   '{"probe":true}'::jsonb, '10.0.0.1');

\echo ''
\echo '=== A. UPDATE the break-glass audit row as the app role ==='
SAVEPOINT s1;
UPDATE public.operator_access_log
   SET action = 'REWRITTEN-BY-APP-ROLE', ip_address = NULL
 WHERE log_id = '22222222-2222-2222-2222-222222222222';
SELECT action AS action_after_update, ip_address AS ip_after_update
  FROM public.operator_access_log
 WHERE log_id = '22222222-2222-2222-2222-222222222222';
RELEASE SAVEPOINT s1;

\echo ''
\echo '=== B. DELETE the break-glass audit row as the app role ==='
SAVEPOINT s2;
DELETE FROM public.operator_access_log
 WHERE log_id = '22222222-2222-2222-2222-222222222222';
SELECT count(*) AS breakglass_rows_remaining
  FROM public.operator_access_log
 WHERE log_id = '22222222-2222-2222-2222-222222222222';
RELEASE SAVEPOINT s2;

ROLLBACK;
\echo ''
\echo '=== transaction rolled back; nothing persisted ==='
