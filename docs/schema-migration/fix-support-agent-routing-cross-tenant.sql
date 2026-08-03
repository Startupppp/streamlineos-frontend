-- Operator migration: make support agent-routing keys tenant-scoped (code: 2026-07-27)
--
-- DEFECT: two unique indexes in support/agent-routing.ts keyed on user_id WITHOUT org_id.
-- `users` is a GLOBAL table (no org_id) and `organization_members` is unique on the PAIR
-- (user_id, org_id), so one person can genuinely belong to several organizations.
--
--   1. support_agent_skills  uniqueIndex(user_id, skill)
--      One org registering agent X with skill "billing" blocks every OTHER org from
--      registering the same skill for that same person. Insert-time cross-tenant collision.
--
--   2. support_agent_availability  uniqueIndex(user_id)   <-- WORSE
--      Not merely a collision: the two orgs SHARE ONE ROW. An agent toggling themselves
--      unavailable in org A silently makes them unavailable in org B's ticket routing,
--      and org B's write overwrites org A's state. Shared mutable cross-tenant state.
--
-- The Drizzle schema has been updated to (org_id, user_id, skill) and (org_id, user_id).
-- Applied here without db:generate so unrelated in-flight schema work is not swept in.
--
-- SAFE TO RUN MULTIPLE TIMES (idempotent). Run in a transaction.
--
-- PRE-FLIGHT — availability is the risky one. Because the old index allowed only ONE row
-- per user globally, multi-org agents currently have a single shared row whose org_id is
-- whichever org wrote first. This migration does NOT invent per-org rows: after it runs,
-- the absent orgs simply have no row, which the table's documented opt-out model reads as
-- "available by default". Confirm that is acceptable before running:
--
--   SELECT a.user_id, a.org_id AS owning_org, count(m.org_id) AS total_orgs_for_user
--   FROM   support_agent_availability a
--   JOIN   organization_members m ON m.user_id = a.user_id
--   GROUP  BY a.user_id, a.org_id
--   HAVING count(m.org_id) > 1;
--
-- Any row returned is an agent whose availability was, until now, leaking across orgs.
--
-- Skills needs no such care: the composite index is strictly WIDER than the old one, so
-- every existing row remains valid.

BEGIN;

-- 1. support_agent_skills — create the wider tenant-scoped key first, then drop the old.
CREATE UNIQUE INDEX IF NOT EXISTS uniq_support_agent_skills_org_user_skill
  ON support_agent_skills (org_id, user_id, skill);

DROP INDEX IF EXISTS uniq_support_agent_skills_user_skill;

-- 2. support_agent_availability — same order, never leaving the table unprotected.
CREATE UNIQUE INDEX IF NOT EXISTS uniq_support_agent_availability_org_user
  ON support_agent_availability (org_id, user_id);

DROP INDEX IF EXISTS uniq_support_agent_availability_user;

COMMIT;

-- CODE DEPENDENCY (already shipped alongside this script, do not run this SQL against an
-- older deployment): SupportMacrosService.setAgentAvailability upserted with
-- ON CONFLICT (user_id). That no longer matches any unique constraint once the old index is
-- dropped and would raise "no unique or exclusion constraint matching the ON CONFLICT
-- specification". It now targets (org_id, user_id).
--
-- Note: uniq_support_agent_skills_org_id / uniq_support_agent_avail_org_id are the composite
-- tenant candidate keys from the Wave 4 hardening. They are NOT the business keys and are
-- intentionally left untouched.
