-- Backfill org_modules from organizations.enabled_modules
--
-- Purpose: make org_modules the sole authority for module enablement.
--          ModuleGuard now queries org_modules directly instead of reading
--          the stale JWT-projected enabled_modules array.
--
-- Safety:  idempotent — ON CONFLICT DO NOTHING; safe to run multiple times.
--
-- Key mapping (organizations.enabled_modules UPPERCASE → org_modules.module_key lowercase):
--   PROJECTS  → build   (legacy projection; superseded by BUILD after the module rename)
--   BUILD     → build
--   HR        → hr
--   CRM       → crm
--   INVENTORY → inventory
--   FINANCE   → accounting
--   HELPDESK  → support
--   SURVEYS   → surveys
--   PAYROLL   → payroll
--   SIGN      → sign
--   KB        → kb      (core module, always-on, but backfilled for completeness)
--
-- Run this BEFORE deploying the updated ModuleGuard so every org that was
-- using the legacy JWT projection has a matching org_modules row.

INSERT INTO org_modules (id, org_id, module_key, enabled, enabled_at, enabled_by)
SELECT
  gen_random_uuid(),
  o.id            AS org_id,
  map.module_key,
  true            AS enabled,
  NOW()           AS enabled_at,
  NULL            AS enabled_by
FROM organizations o
CROSS JOIN LATERAL UNNEST(COALESCE(o.enabled_modules, '{}')) AS raw_key
JOIN (VALUES
  ('PROJECTS',  'build'),
  ('BUILD',     'build'),
  ('HR',        'hr'),
  ('CRM',       'crm'),
  ('INVENTORY', 'inventory'),
  ('FINANCE',   'accounting'),
  ('HELPDESK',  'support'),
  ('SURVEYS',   'surveys'),
  ('PAYROLL',   'payroll'),
  ('SIGN',      'sign'),
  ('KB',        'kb')
) AS map(legacy_key, module_key) ON map.legacy_key = raw_key
ON CONFLICT ON CONSTRAINT org_modules_unique_idx DO NOTHING;
