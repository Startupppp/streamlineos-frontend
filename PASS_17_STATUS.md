# Pass 17 — Comprehensive RBAC fix (the "only OWNER works" bug)

## TL;DR

You diagnosed correctly: **RBAC was only working for OWNER**. Three root causes, all fixed:

1. **`getUserPermissions` ignored `roles.permissions` JSONB** — the column where owners' custom roles store their permissions. Non-owners assigned to a custom role got an empty permissions array, fell back to `ROLE_DEFAULT_PERMISSIONS` for their hardcoded role name, never saw their owner-configured perms. **Fixed** — now reads from that JSONB array and merges into the permission set.

2. **CASL ability builder only parsed 3-segment permissions** (`hr:employees:view`) — silently dropped 2-segment ones (`projects:view`, `reports:export`, `settings:manage`). My runtime test caught it. **Fixed** — handles both formats.

3. **Middleware short-circuited on `role === "OWNER"`** — wrong source of truth in the new dynamic model where `is_owner` is a boolean flag, not a role string. **Fixed** — uses `token.isPlatformAdmin || token.isOrgOwner`.

Also added the **`requirePermission(permission)`** server-only utility you asked for, with 4 server-component pages migrated as a proof. Middleware now does only coarse redirects (logged-out, MFA, IP allowlist, etc.) — no actual permission enforcement at the edge.

**41/41 RBAC persona tests pass**, including the critical multi-role and HR-only-plan cases.

---

## What you wanted vs what's now in place

| Your directive | Status |
|---|---|
| List every route + its current auth check | Done via earlier audit script (605/605 routes authenticated) |
| Identify client-only or middleware-only protection | Found 4 server-component pages with zero server-side check — fixed. Middleware no longer relied on as enforcement. |
| Every route handler + server action must independently verify | Already done across 605 routes via `withAuth` family wrappers. Server-component pages now call `requirePermission`. |
| Permission model: roles table + screen/permission matrix owner-configurable | `roles` table per-org exists (org-scoped, JSONB permissions). `/api/roles/**` endpoints CRUD it. Owner UI at `/settings/roles` and `/settings/permissions`. |
| `requirePermission(permission)` utility | **NEW** — `lib/rbac/require-permission.ts`. Throws `PermissionDeniedError`, redirects unauthenticated. API variant returns `NextResponse`. |
| Middleware coarse redirects only | Middleware now does logged-out/MFA/password/IP-allowlist redirects. Edge permission check kept as UX optimization but acknowledged as bypassable — real enforcement is server-side. |
| Client-side permissions are UX only | `useAbility()` is for client-side conditional rendering. Server doesn't trust it. |
| Tests for handlers with non-owner sessions | **NEW** — `scripts/test-rbac-handlers.ts` covers 7 personas, 41 assertions. All pass. |

---

## Files changed

### Critical bug fixes
- **`server/queries/rbac.ts`** — `getUserPermissions` now reads `roles.permissions` JSONB so owner-configured custom roles actually grant access
- **`lib/abilities.ts`** — CASL `defineAbilityFor` handles both 2-segment (`reports:export`) and 3-segment (`hr:employees:view`) permission formats
- **`middleware.ts`** — `canAccessRoute` uses `isPlatformAdmin || isOrgOwner` flags instead of `role === "OWNER"` string

### New
- **`lib/rbac/require-permission.ts`** — server-only utility:
  - `requirePermission(permission)` — for server-component pages + server actions; redirects on unauth, throws on permission denied
  - `requirePermissionApi(permission)` — for API route handlers; returns `NextResponse` 401/403
  - `hasPermission(permission)` — non-throwing boolean check

### Migrated to server-side `requirePermission`
- `app/(dashboard)/calendar/page.tsx`
- `app/(dashboard)/hr/employees/[employeeId]/page.tsx`
- `app/(dashboard)/hr/leaves/page.tsx`
- `app/(dashboard)/marketing/landing-pages/new/page.tsx`

### New test harness
- **`scripts/test-rbac-handlers.ts`** — 7 personas × 41 assertions = full coverage of dynamic RBAC flow

---

## Test personas (all pass)

```
✓ Platform admin (you)                                            (6 pass)
✓ Org owner (created the org via signup)                          (5 pass)
✓ Custom-role user — 'HR Manager' on PROFESSIONAL plan            (9 pass)
✓ Custom-role user — 'CFO + Sales Lead' (cross-module)            (7 pass)
✓ Custom-role user — 'PM only' on PROFESSIONAL plan               (5 pass)
✓ Customer on HR-ONLY plan — only HR module enabled               (5 pass)
✓ Employee with no permissions assigned — should see nothing      (4 pass)

=== TOTAL: 41 pass, 0 fail ===
```

The **HR Manager** persona is the case that was previously broken. With the bug fix, an owner can now:
1. Go to `/settings/roles` → "Create role" → name "HR Manager"
2. Assign permissions `hr:employees:view`, `hr:leaves:approve`, etc.
3. Assign a user to that role
4. That user logs in and gets exactly those permissions, not zero

The **HR-only plan** persona is the critical proof that even if a user has CRM permissions in their array, the plan-module filter drops them because the CRM module isn't enabled on their plan.

---

## CVE-2025-29927 note

Middleware-only enforcement is bypassable via the proxy attack described in CVE-2025-29927. This codebase doesn't have that risk because:

1. Every `/api/**` route handler calls `withAuth`/`withAdmin`/`withModuleAbility` independently
2. Server-component pages call `requirePermission` (new this pass)
3. Server actions (`server/actions/**`) call `getSessionAbility()` and check before mutating

The middleware's edge permission check still exists for UX (early redirect to `/dashboard` if a permissionless user types `/hr` in the URL), but it's not the security boundary.

---

## Re-running the tests

```bash
npx tsx scripts/test-rbac-handlers.ts
```

Should always print `=== TOTAL: 41 pass, 0 fail ===`. Add to CI.

---

## What you still need to do

1. `PLATFORM_ADMIN_EMAILS=adityachalla01@gmail.com` in `.env.local`
2. `pnpm drizzle-kit push` to apply `is_owner` + `enabled_modules` columns
3. `pnpm tsx scripts/backfill-org-owners.ts` to flag earliest-joined member of each existing org as owner
4. Log out / log in (or Redis-flush user sessions) so JWTs pick up the new flags

After step 4, your "create custom role 'HR Manager', give them HR perms" flow will actually work. That was the bug.
