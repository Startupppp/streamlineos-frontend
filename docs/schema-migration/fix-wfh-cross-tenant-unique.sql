-- Operator migration: make the WFH-request business key tenant-scoped (code: 2026-07-27)
--
-- DEFECT: wfh_requests carried `uniqueIndex("uniq_wfh_requests_user_date").on(userId, date)`.
-- `users` is a GLOBAL table (no org_id) and `organization_members` is unique on the PAIR
-- (user_id, org_id) — so one person can genuinely belong to several organizations. The old
-- index therefore let one org's WFH request for a given person+date block EVERY other org
-- from recording a WFH request for that same person on that same date, surfacing as a raw
-- 23505. That is a cross-tenant denial of service, and violates the rule that any
-- "unique per org" business key must be a composite uniqueIndex leading with org_id.
--
-- The Drizzle schema (backend/src/db/schema/hr/attendance.ts) has been updated to
-- `uniqueIndex("uniq_wfh_requests_org_user_date").on(orgId, userId, date)`. This script
-- applies the same change to a live database without a full db:generate, which is currently
-- unsafe to run because unrelated schema work is in flight.
--
-- SAFE TO RUN MULTIPLE TIMES (idempotent guards on every statement). Run in a transaction.
--
-- PRE-FLIGHT — this must return ZERO rows before the new index can be created. It finds
-- (org_id, user_id, date) triples that are duplicated, which can only exist if the old
-- index was previously dropped. If it returns rows, resolve those duplicates first.
--   SELECT org_id, user_id, date, count(*)
--   FROM   wfh_requests
--   GROUP  BY org_id, user_id, date
--   HAVING count(*) > 1;

BEGIN;

-- 1. Create the tenant-scoped business key first, so the table is never left unprotected.
CREATE UNIQUE INDEX IF NOT EXISTS uniq_wfh_requests_org_user_date
  ON wfh_requests (org_id, user_id, date);

-- 2. Drop the over-broad global key only after the replacement exists.
DROP INDEX IF EXISTS uniq_wfh_requests_user_date;

COMMIT;

-- Note: uniq_wfh_requests_org_id (org_id, id) is the composite tenant candidate key from the
-- Wave 4 hardening pass. It is NOT the business key and is intentionally left untouched.
