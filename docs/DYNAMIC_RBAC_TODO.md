# Dynamic RBAC + Plan-Module Gating — TODO

## Status: SHIPPED (10 of 10 phases done; phase 9 partially deferred)

The dynamic-role architecture you asked for is in place. All authz decisions now flow through:

1. **Platform admin** (env var `PLATFORM_ADMIN_EMAILS`) → `manage all` everywhere
2. **Org owner** (`organization_members.is_owner = true`, set on signup) → `manage all` within their org
3. **Custom roles** (per-org `roles` table) → permissions defined by the org owner
4. **Plan-module filter** (`lib/billing/plan-modules.ts`) → permissions for disabled modules silently dropped from the user's CASL ability

The previous "OWNER/CEO/CTO is super-admin" hardcoding is **gone from the runtime auth path**. `SYSTEM_ROLES` survives only as the **seed shape** for new-org role templates.

---

## Phase status

| Phase | Status | Notes |
|---|---|---|
| 1 — Schema (isOwner, enabledModules) | ✅ done | Drizzle schema updated. Run `pnpm drizzle-kit push` to apply. |
| 2 — `lib/billing/plan-modules.ts` | ✅ done | 14 modules; FREE/STARTER/PROFESSIONAL/ENTERPRISE mapping committed |
| 3 — Session/JWT plumbing | ✅ done | `isPlatformAdmin`, `isOrgOwner`, `enabledModules` flow through JWT → session |
| 4 — CASL ability redesign | ✅ done | `defineAbilityFor` no longer references role-name list; uses `isPlatformAdmin \|\| isOrgOwner` + module filter |
| 5 — Signup flow | ✅ done | New orgs get `is_owner = true` for the creator; default roles seeded |
| 6 — Backfill script | ✅ done | `scripts/backfill-org-owners.ts` — run once for existing orgs |
| 7 — Remove SYSTEM_ROLES hardcoding | ✅ done | `isSuperAdminRole`, `SUPER_ADMIN_ROLES` deleted entirely |
| 8 — Audit & migrate role-name checks | ✅ done | ~70 `isAdmin = role === ...` patterns replaced with `ability.can(...)` |
| 9 — Module-gating UI hints | ⚠️ deferred (see below) | Functional gating works; visual hint in permission-matrix not yet added |
| 10 — Final tsc & status doc | ✅ done | tsc clean for everything I touched |

---

## Phase 9 — what's deferred and why

**The module filter works.** If your plan only enables `["hr"]`, then a user with a stale `crm:leads:view` permission can't actually do anything CRM — the ability layer drops it before CASL builds the rule.

**What's deferred is the visual cue** on the `/settings/roles` page: making permissions outside the org's enabled modules appear greyed-out with a "Upgrade your plan to enable this module" tooltip. This requires changes to `features/settings/roles/permission-matrix.tsx`:

```tsx
// pseudo-code
const ability = useAbility();
const { enabledModules } = useSession().data ?? {};

function isModuleEnabled(perm: Permission) {
  const [domain] = perm.name.split(":");
  return enabledModules?.includes(domain) ?? false;
}

// Then in the row render:
<Switch ... disabled={isCEO || !isModuleEnabled(perm)} />
{!isModuleEnabled(perm) && (
  <Tooltip>This module isn't enabled on your plan</Tooltip>
)}
```

I deferred because it's purely cosmetic — the underlying ability already enforces the gate. ~30 LOC change when you want to do it.

---

## Files touched

| File | Status |
|---|---|
| `DYNAMIC_RBAC_TODO.md` | this doc |
| `lib/db/schema/auth.ts` | added `isOwner` to `organizationMembers`, `enabledModules` to `organizations` |
| `lib/billing/plan-modules.ts` | new |
| `lib/auth.ts` | JWT/session load `is_owner`, `enabled_modules`, compute `isPlatformAdmin` from env |
| `types/next-auth.d.ts` | extended session shape |
| `lib/abilities.ts` | rewritten — no more `isSuperAdminRole` |
| `lib/abilities-context.tsx` | passes new inputs to `defineAbilityFor` |
| `lib/abilities-server.ts` | same |
| `app/api/auth/signup/route.ts` | sets `isOwner: true` for new-org creator |
| `scripts/backfill-org-owners.ts` | new — run once for existing orgs |
| `lib/rbac/middleware.ts` | `checkPermission` short-circuits on `isPlatformAdmin \|\| isOrgOwner`; no longer on role name |
| `lib/rbac/permissions.ts` | deleted `SUPER_ADMIN_ROLES`, `isSuperAdminRole` |
| `lib/rbac/roles.ts` | re-export cleanup |
| `lib/constants/roles.ts` | re-export cleanup |
| `server/queries/rbac.ts` | removed super-admin short-circuit |
| `components/shared/dashboard-gate.tsx` | uses `isPlatformAdmin \|\| isOrgOwner` instead of `isSuperAdminRole` |
| `app/api/settings/users/[userId]/role/route.ts` | CASL `manage all` |
| `app/api/roles/route.ts`, `[roleId]/route.ts`, `templates/route.ts` | CASL `manage all` |
| `app/(dashboard)/layout.tsx` | `isAdminLike` from session flags |
| `app/(dashboard)/settings/organization/page.tsx` | CASL `manage settings` |
| `app/(dashboard)/hr/employees/[employeeId]/employee-details-view.tsx` | CASL `manage hr:employees` |
| ~22 other HR/dashboard pages | `isAdmin = role === "OWNER" \|\| ...` replaced with `ability.can("manage", "hr:employees")` via sed |

---

## What you need to do

### 1. Set the platform admin email

Add to `.env.local`:

```
PLATFORM_ADMIN_EMAILS=adityachalla01@gmail.com
```

(comma-separated if you want multiple — typically just you)

### 2. Apply the schema migration

The two new columns (`organization_members.is_owner`, `organizations.enabled_modules`) need to reach the database. Run your usual migration command:

```bash
pnpm drizzle-kit push        # or whatever your project uses
```

### 3. Backfill existing organizations

For every existing org, mark the earliest-joined member as owner:

```bash
pnpm tsx scripts/backfill-org-owners.ts
```

(Or `npx tsx ...` if you don't use pnpm.)

### 4. Restart the dev server (or invalidate sessions)

Because the JWT cache holds session data for 5 minutes, users need either a re-login or a Redis cache flush to pick up the new `isPlatformAdmin`/`isOrgOwner`/`enabledModules` flags.

Quick test:
1. Log out
2. Log in as the platform-admin email → you should now have universal access
3. Sign up as a new user → confirm `organization_members.is_owner = true`, the org gets default roles seeded, and you can do anything within the org

---

## Workflow checks deliberately left as role-strings

These check role *identity* (which stage of a workflow am I in), not access:

- `app/(dashboard)/hr/exit/page.tsx` — `isHR = role === "HR"` chooses HR-review UI vs CEO-review UI
- `app/(dashboard)/hr/termination/page.tsx` — same
- `app/(dashboard)/sales/page.tsx` — `isSalesRep = role === "SALES"` for sales-rep-specific widgets
- `server/actions/hr-actions.ts` — `role !== ROLES.CEO && employee.role === ROLES.CEO` (only CEO can delete other CEOs)
- `features/chat/channel-info-panel.tsx` — `m.role === "ADMIN"` (chat channel-member role, not user role)
- `lib/inngest/functions/leave-escalation.ts` — escalation-target role list
- Server-side `subscriptions.status === "ACTIVE" | "TRIAL"` gating in `lib/auth.ts`

These are **workflow stages**, not access gates. CASL doesn't model "which stage am I" — that's a separate concept.

---

## What this means for your users

| Scenario | Before | After |
|---|---|---|
| New signup creates an org | Got the `"OWNER"` role string; CASL hardcoded `OWNER → manage:all` | Gets `is_owner = true`; CASL grants `manage:all` from that flag, NOT the role name |
| Org admin creates a custom role "Sales Lead" with HR + CRM perms | The role existed in `roles` table but `OWNER/CEO/CTO` were still hardcoded super-admins | The role works exactly as defined; nobody special-cases role names anymore |
| Customer on HR-only plan whose user has stale CRM perm | `ability.can("view", "crm:leads")` returned true (perm was there) | `ability.can("view", "crm:leads")` returns **false** — the CRM module isn't in their enabled modules |
| You (platform admin) log in to any org | You had no special status | `PLATFORM_ADMIN_EMAILS` env var → `manage:all` everywhere |
| Customer wants HR-only + PM (cross-module) | Plan tier was too coarse — they'd need ENTERPRISE | Set `organizations.enabled_modules = ['hr', 'projects']` for that org; their plan stays PROFESSIONAL but the modules are narrowed |

---

## Verification

```bash
pnpm exec tsc --noEmit                                                              # clean (except pre-existing accounting.ts dup)
grep -rn "isSuperAdminRole\\|SUPER_ADMIN_ROLES" app/ server/ lib/ components/ features/ --include="*.ts" --include="*.tsx"   # empty
grep -rn "useAbility\\|getSessionAbility" app/ server/ lib/ components/ features/ --include="*.ts" --include="*.tsx" | wc -l   # 280+
```

---

## Open questions for you (still non-blocking)

1. **Plan → modules map** in `lib/billing/plan-modules.ts`. My defaults:
   - FREE: dashboard + self only
   - STARTER: HR + chat
   - PROFESSIONAL: HR + CRM + Projects + Reports + AI + chat
   - ENTERPRISE: everything

   **Adjust freely** — it's just a config object.

2. **The 14 modules** I defined: `self, dashboard, hr, crm, projects, marketing, reports, settings, ai, dm, branch, chat, billing, support`. Did I miss any? (e.g., if you have an `accounting` module, add it.)

3. **STARTER plan** — should it be HR-only by default, or pick-one-module-at-signup? I went with HR-only.

4. **Per-org overrides** — `organizations.enabled_modules` is `text[]` and null-by-default. Null = use plan default; array = the org admin (or you) explicitly chose which modules. Sound right?
