set -u
DB="$1"; BE="$2"
cleanup() {
  psql "$DB" -q -c "DELETE FROM payment_webhook_endpoints WHERE id = 900000777;" \
              -c "DELETE FROM payment_providers WHERE id = 900000777;" \
              -c "DELETE FROM organizations WHERE id = 'drill-c162-sig-e2e';" \
              -c "DELETE FROM organization_members WHERE id = 900000777;" \
              -c "DELETE FROM users WHERE id = 'drill-c162-sig-user';" >/dev/null 2>&1
}
trap cleanup EXIT INT TERM
echo "### BEFORE: alert must be quiet"
( cd "$BE" && DATABASE_URL="$DB" node src/scripts/alert-sig-failures.mjs 2>/dev/null ); echo "EXIT_BEFORE=$?"
echo ""
echo "### Committing ONE endpoint in the exact state a forged HMAC leaves it in"
psql "$DB" -q -v ON_ERROR_STOP=1 <<'SQL'
BEGIN;
SET CONSTRAINTS ALL DEFERRED;
INSERT INTO users (id, email) VALUES ('drill-c162-sig-user','drill-c162-sig@example.invalid');
INSERT INTO organizations (id, name, slug, owner_membership_id)
  VALUES ('drill-c162-sig-e2e','C162 Sig Drill','drill-c162-sig-e2e', 900000777);
INSERT INTO organization_members (id, user_id, org_id) OVERRIDING SYSTEM VALUE
  VALUES (900000777,'drill-c162-sig-user','drill-c162-sig-e2e');
INSERT INTO payment_providers (id, org_id, provider_key, display_name) OVERRIDING SYSTEM VALUE
  VALUES (900000777,'drill-c162-sig-e2e','razorpay','Razorpay (C162 forgery drill)');
INSERT INTO payment_webhook_endpoints (id, org_id, provider_id, environment, url, status, last_failure_at, failure_reason)
  OVERRIDING SYSTEM VALUE
  VALUES (900000777,'drill-c162-sig-e2e',900000777,'live','https://drill.invalid/hook','failing', now(), 'Invalid signature');
COMMIT;
SQL
echo ""
echo "### AFTER: alert must FIRE and exit 1"
( cd "$BE" && DATABASE_URL="$DB" node src/scripts/alert-sig-failures.mjs 2>/dev/null ); echo "EXIT_AFTER=$?"
echo ""
echo "### RECOVERY: endpoint re-verifies after the correct secret is restored"
psql "$DB" -q -c "UPDATE payment_webhook_endpoints SET status='verified', last_verified_at=now(), last_failure_at=NULL, failure_reason=NULL WHERE id=900000777;"
( cd "$BE" && DATABASE_URL="$DB" node src/scripts/alert-sig-failures.mjs 2>/dev/null ); echo "EXIT_RECOVERED=$?"
echo ""
cleanup
trap - EXIT
echo "### CLEANED UP — residual rows:"
psql "$DB" -Atc "select (select count(*) from payment_webhook_endpoints where id=900000777)||' endpoints, '||(select count(*) from payment_providers where id=900000777)||' providers, '||(select count(*) from organizations where id='drill-c162-sig-e2e')||' orgs'"
