-- Wave 0 (T0.4) — reconciliation / orphan-detection harness.
-- ALL read-only SELECTs. Run against any environment BEFORE Wave 1/7 constraints are added.
-- Share the counts back (especially §3 multi-owner / ownerless — direct input to the Wave 1
-- owner-pointer bootstrap). Canonical tenant key: organizations.id = text.

------------------------------------------------------------------------------------------------
-- §1. billing.ts integer org_id vs text organizations.id  (VERIFIED DEFECT — Wave 7 T7.2)
--     If organizations.id values are non-numeric, EVERY row here is effectively orphaned.
------------------------------------------------------------------------------------------------
SELECT 'billing_profiles' AS tbl, count(*) AS rows,
       count(*) FILTER (WHERE bp.org_id::text NOT IN (SELECT o.id FROM organizations o)) AS orphaned
FROM billing_profiles bp
UNION ALL
SELECT 'app_installations', count(*),
       count(*) FILTER (WHERE ai.org_id::text NOT IN (SELECT o.id FROM organizations o))
FROM app_installations ai
UNION ALL
SELECT 'affiliates', count(*),
       count(*) FILTER (WHERE af.org_id::text NOT IN (SELECT o.id FROM organizations o))
FROM affiliates af
UNION ALL
SELECT 'revenue_events', count(*),
       count(*) FILTER (WHERE re.org_id::text NOT IN (SELECT o.id FROM organizations o))
FROM revenue_events re;

------------------------------------------------------------------------------------------------
-- §2. org_modules rows with no matching organization (varchar(36) org_id, no FK — Wave 3/7)
------------------------------------------------------------------------------------------------
SELECT count(*) AS org_modules_total,
       count(*) FILTER (WHERE om.org_id NOT IN (SELECT o.id FROM organizations o)) AS orphaned
FROM org_modules om;

-- Divergence between the org_modules authority and the organizations.enabled_modules mirror.
SELECT o.id AS organization_id,
       array(SELECT om.module_key FROM org_modules om
             WHERE om.org_id = o.id AND om.enabled ORDER BY 1) AS org_modules_enabled,
       coalesce(o.enabled_modules, '{}') AS mirror_enabled_modules
FROM organizations o
WHERE array(SELECT om.module_key FROM org_modules om
            WHERE om.org_id = o.id AND om.enabled ORDER BY 1)
      IS DISTINCT FROM (SELECT array(SELECT unnest(coalesce(o.enabled_modules,'{}')) ORDER BY 1));

------------------------------------------------------------------------------------------------
-- §3. OWNERSHIP — Wave 1 bootstrap input.  organization_members.is_owner is the only signal today.
------------------------------------------------------------------------------------------------
-- Organizations with NO owner (bootstrap must repair).
SELECT count(*) AS orgs_without_owner
FROM organizations o
WHERE NOT EXISTS (
  SELECT 1 FROM organization_members m
  WHERE m.org_id = o.id AND m.is_owner = true
);

-- Organizations with MORE THAN ONE owner (bootstrap must pick one deterministically).
SELECT m.org_id AS organization_id, count(*) AS owner_count
FROM organization_members m
WHERE m.is_owner = true
GROUP BY m.org_id
HAVING count(*) > 1
ORDER BY owner_count DESC;

------------------------------------------------------------------------------------------------
-- §4. MEMBERSHIP integrity — cross-tenant / dangling references.
------------------------------------------------------------------------------------------------
SELECT 'members -> missing org'  AS check, count(*) AS rows
FROM organization_members m WHERE m.org_id NOT IN (SELECT id FROM organizations)
UNION ALL
SELECT 'members -> missing user', count(*)
FROM organization_members m WHERE m.user_id NOT IN (SELECT id FROM users)
UNION ALL
SELECT 'duplicate (user,org) memberships', count(*)
FROM (SELECT user_id, org_id FROM organization_members
      GROUP BY user_id, org_id HAVING count(*) > 1) d;

------------------------------------------------------------------------------------------------
-- §5. user_memberships vs organization_members — the duplicate-membership question (Wave 5).
------------------------------------------------------------------------------------------------
SELECT 'user_memberships without a matching organization_members' AS check, count(*) AS rows
FROM user_memberships um
WHERE NOT EXISTS (
  SELECT 1 FROM organization_members m
  WHERE m.org_id = um.org_id AND m.user_id = um.user_id
);

------------------------------------------------------------------------------------------------
-- §6. INVITATIONS — plaintext token + implicit status (Wave 4 hardening input).
------------------------------------------------------------------------------------------------
SELECT count(*) AS invitations_total,
       count(*) FILTER (WHERE accepted_at IS NULL) AS pending,
       count(*) FILTER (WHERE accepted_at IS NULL AND expires_at < now()) AS pending_but_expired
FROM invitations;

------------------------------------------------------------------------------------------------
-- §7. users legacy hierarchy IDs (Wave 4 collapse input).
------------------------------------------------------------------------------------------------
SELECT count(*) FILTER (WHERE department_id IS NOT NULL)     AS legacy_department_id_int,
       count(*) FILTER (WHERE org_department_id IS NOT NULL) AS new_org_department_id_text,
       count(*) FILTER (WHERE branch_id IS NOT NULL)         AS legacy_branch_id_int
FROM users;
