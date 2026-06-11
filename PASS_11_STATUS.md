# Pass 11 — Truly dynamic RBAC + plan-module gating

## TL;DR

You called out (correctly) that my prior CASL setup still hardcoded `OWNER/CEO/CTO` as super-admin, defeating the "dynamic roles" goal. This pass rebuilds the foundation:

- **Platform admin** = email-list env var (`PLATFORM_ADMIN_EMAILS`) — for you.
- **Org owner** = first signup user of an org, flagged via new `organization_members.is_owner` column. Gets `manage:all` within their org.
- **Custom roles** = whatever the org owner defines in the `roles` table (already org-scoped).
- **Plan/module filter** = each plan enables a list of modules (HR, CRM, Projects, etc.); permissions outside enabled modules are dropped from the user's CASL ability before any check fires.

The phrase "OWNER is super-admin" no longer appears anywhere in the runtime auth path. `SYSTEM_ROLES` survives only as the **shape of the seed** for new-org default roles. Customers on HR-only or PM-only plans now actually get HR-only or PM-only abilities, regardless of what role names exist in their `roles` table.

tsc clean.

---

## Architecture

```
                                  ┌──────────────────────────┐
                                  │  PLATFORM_ADMIN_EMAILS   │
                                  │  (env var, you)          │
                                  └────────────┬─────────────┘
                                               │
JWT callback ──┬─ user.email ──→ isPlatformAdmin (bool)  ─┐
               │                                          │
               ├─ organization_members.is_owner ──────────┤
               │     (flagged on signup; backfill for     │
               │      existing orgs via script)           │
               │                                          ▼
               ├─ subscriptions.plan ──→ Plan (FREE/STARTER/PRO/ENT)
               │                                          │
               ├─ organizations.enabled_modules ──────────┤
               │     (per-org override; null = use plan)  ▼
               │                                  resolveEnabledModules(plan, override)
               │                                          │
               └─ getUserPermissions(uid,orgId) ─────────→│
                          (user_permissions + role_permissions
                           + roles.permissions JSONB +
                           ROLE_DEFAULT_PERMISSIONS fallback)
                                                          │
                                                          ▼
                       Session.permissions[] ─────→ defineAbilityFor()
                                                          │
                                          ┌───────────────┼───────────────┐
                                          │               │               │
                              isPlatformAdmin     isOrgOwner       permissions
                              || isOrgOwner       ↘             ↙   filtered by
                                          ↓                          enabledModules
                                  can("manage","all")                  ↓
                                          ↓                  can(action, "domain:resource")
                                          ↓                  for each surviving perm
                                          └─────────────CASL Ability────────────────┘
                                                          │
                                          ┌───────────────┼───────────────┐
                                          ▼               ▼               ▼
                              client:                server:           UI:
                              useAbility()           getSessionAbility()  <Can>
                              ability.can(...)       ability.can(...)
```

---

## What shipped

### Schema additions (`lib/db/schema/auth.ts`)
- `organization_members.is_owner: boolean default false notnull` + new index
- `organizations.enabled_modules: text[] (nullable)`

### Plan-module config (`lib/billing/plan-modules.ts`) — NEW
14 modules; `PLAN_MODULES` map per plan; `resolveEnabledModules(plan, orgOverride)`; `moduleFromPermission(perm)`.

### Session/JWT (`lib/auth.ts`, `types/next-auth.d.ts`)
- JWT callback now reads `is_owner`, `enabled_modules`, computes `isPlatformAdmin` from `PLATFORM_ADMIN_EMAILS` env
- Session exposes `session.user.isPlatformAdmin`, `session.user.isOrgOwner`, `session.enabledModules`
- Subscription read moved from `platform_subscriptions` (wrong table) → `subscriptions` (where signup actually writes)

### CASL ability (`lib/abilities.ts`)
```ts
if (isPlatformAdmin || isOrgOwner) can("manage", "all");
else for each perm in permissions:
       if module(perm) ∈ enabledModules: can(action, subject);
```

No more `isSuperAdminRole(role)`. **`SUPER_ADMIN_ROLES` and `isSuperAdminRole` are deleted from the codebase entirely.**

### Signup flow (`app/api/auth/signup/route.ts`)
- New org member is now flagged `is_owner: true`
- Default roles already seeded from `DEFAULT_ORG_ROLES` (pre-existing behaviour)

### Backfill (`scripts/backfill-org-owners.ts`) — NEW
Marks the earliest-joined member of every existing org as owner. Idempotent — skips orgs that already have an owner.

### checkPermission server middleware (`lib/rbac/middleware.ts`)
- Reads `email` + `isOrgOwner` from session
- Short-circuits on `isPlatformAdmin || isOrgOwner` (looks up `is_owner` from DB if not provided)
- No longer references `isSuperAdminRole`

### `server/queries/rbac.ts`
- `getUserPermissions` no longer adds all-permissions for super-admin role names — that's CASL's job now via the `manage:all` short-circuit

### All `isSuperAdminRole` consumers migrated
- `components/shared/dashboard-gate.tsx` — `session.user.isPlatformAdmin || isOrgOwner`
- `app/api/roles/route.ts`, `app/api/roles/[roleId]/route.ts`, `app/api/roles/templates/route.ts` — `ability.can("manage", "all")`
- `app/api/settings/users/[userId]/role/route.ts` — same

### ~25 `isAdmin = role === "OWNER" || ...` pages migrated
Across HR + dashboard pages, switched to `ability.can("manage", "hr:employees")` (or appropriate subject). See file list in `DYNAMIC_RBAC_TODO.md`.

### `lib/(dashboard)/layout.tsx`
Server-side `isAdminLike = session.user.isPlatformAdmin || isOrgOwner` instead of role-name match.

---

## Build state

- `pnpm exec tsc --noEmit` — clean
- Only the pre-existing `lib/db/schema/accounting.ts` dup (untracked, third-party WIP) still fails — not from any pass
- Nothing committed (per rule)
- `.env` untouched (per rule — but you DO need to add `PLATFORM_ADMIN_EMAILS=...` to `.env.local` for the platform-admin role to take effect)
- Auth pages untouched (per rule)

---

## Action items for you

1. **Add `PLATFORM_ADMIN_EMAILS=adityachalla01@gmail.com` to `.env.local`** (or whatever email you use)
2. **`pnpm drizzle-kit push`** to apply the schema additions
3. **`pnpm tsx scripts/backfill-org-owners.ts`** to mark existing orgs' owners
4. **Log out / log back in** (or Redis-flush the user-session cache) so users pick up the new flags
5. **Review the plan→modules map** in `lib/billing/plan-modules.ts` and adjust if my defaults don't match your pricing

Detailed checklist + open questions in **`DYNAMIC_RBAC_TODO.md`**.

---

## What's intentionally NOT done (and what to do about it)

### Phase 9 — visual hints for module-disabled permissions
The CASL filter already enforces module gating at runtime. The UI hint (greying out permissions in `/settings/roles` when the module isn't in the plan) is purely cosmetic — deferred ~30-LOC enhancement. See `DYNAMIC_RBAC_TODO.md` for the snippet to drop in when you're ready.

### Workflow-stage role checks
A few `role === "HR"` / `role === "SALES"` checks remain — these are *workflow stage* identifiers, not access gates (e.g., "render the HR-review tab or the CEO-review tab"). Listed explicitly in `DYNAMIC_RBAC_TODO.md` under "Workflow checks deliberately left as role-strings". You can re-model these later as ability-checks on specific permissions if you prefer, but they're not blocking the dynamic-RBAC promise.

---

## Open questions (still non-blocking, but answer when you can)

1. Plan→module mapping in `lib/billing/plan-modules.ts` — my defaults reasonable for your pricing?
2. Are there modules I missed in `MODULES` list?
3. STARTER plan: HR-only default OK, or should signup let users pick?
4. Per-org module override semantics in `organizations.enabled_modules` — null = plan default, array = explicit list. Good?

---

## End state

```bash
grep -rn "isSuperAdminRole\|SUPER_ADMIN_ROLES" app/ server/ lib/ components/ features/   # empty
grep -rn "role === \"OWNER\" \|\| role === \"CEO\"" app/ --include="*.tsx"                # 1 (workflow stage)
pnpm exec tsc --noEmit                                                                   # clean
```
