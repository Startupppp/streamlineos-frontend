# Pass 5 — RBAC role-system audit + surgical fix

## TL;DR

Removed one source of duplication in the RBAC layer: `SUPER_ADMIN_ROLES` and `isSuperAdmin` in `lib/constants/roles.ts` now re-export the canonical definitions from `lib/rbac/permissions.ts`. Zero behavioral change (both sides agreed on `["OWNER"]`). tsc clean. Surfaced a broader divergence between the two role systems for the next pass to decide on. Nothing else touched.

---

## Shipped

### Single source of truth for SUPER_ADMIN

**File:** `lib/constants/roles.ts`

Before:
```ts
export const SUPER_ADMIN_ROLES: readonly string[] = [ROLES.OWNER];
export function isSuperAdmin(role: string | undefined | null): boolean {
  return !!role && SUPER_ADMIN_ROLES.includes(role);
}
```

After:
```ts
import { SUPER_ADMIN_ROLES as CANONICAL_SUPER_ADMIN_ROLES, isSuperAdminRole } from "@/lib/rbac/permissions";

export const SUPER_ADMIN_ROLES: readonly string[] = CANONICAL_SUPER_ADMIN_ROLES;
export const isSuperAdmin = isSuperAdminRole;
```

All 7 consumers (`dashboard-gate.tsx`, `app/api/settings/users/[userId]/role/route.ts`, `app/api/roles/route.ts`, `app/api/roles/[roleId]/route.ts`, `app/api/roles/templates/route.ts`, plus 2 indirect callers) keep their imports — they now resolve to the canonical implementation.

`tsc --noEmit`: clean across the entire project.

---

## Surfaced: broader role-system divergence (deferred)

Two role enums exist with conflicting role lists:

| File | Role list | Notes |
|---|---|---|
| `lib/constants/roles.ts` | OWNER, CEO, HR, **ADMIN**, SALES, ENGINEERING, DESIGN, CUSTOMER_SUPPORT, VIDEO_EDITOR, DIGITAL_MARKETING, BLOG_EDITOR | Legacy. Includes `ADMIN`. |
| `lib/rbac/permissions.ts` | OWNER, CEO, **CTO**, HR, **PM**, **CORE**, SALES, CUSTOMER_SUPPORT, ENGINEERING, DESIGN, VIDEO_EDITOR, DIGITAL_MARKETING, BLOG_EDITOR, **BRANCH_MANAGER**, **BRANCH_HR** | Canonical (`SystemRole`). No `ADMIN`. |

### Stale `"ADMIN"` references that won't match any user role

Grep for `role === "ADMIN"` / `ROLES.ADMIN` finds **20+ call-sites** in:
- `app/api/dashboard/{announcements,branch-overview,executive}/route.ts`
- `app/api/onboarding/[userId]/route.ts`, `app/api/onboarding/tasks/[taskId]/route.ts`
- `app/api/hr/attendance/logs/route.ts`
- `app/(dashboard)/settings/organization/page.tsx`
- `components/dashboard/{announcements,quick-actions}-widget.tsx`
- `components/hr/request-wfh-dialog.tsx`
- `server/actions/{hr-actions,holiday-actions,leave-actions,project-actions,weekly-attendance-report,monthly-expense-report}.ts`
- `features/hr/recruitment/candidate-detail/vault-tab.tsx`
- `features/hr/{hr-dashboard-overview,dashboard/{salary-band-widget,payroll-summary-widget}}.tsx`
- `lib/api/helpers.ts`
- `lib/inngest/functions/leave-escalation.ts`

If `ADMIN` is no longer a valid role (as `SystemRole` implies), every one of those guards is silently dead — they look like authorization checks but never fire. If `ADMIN` IS still a real role, then the canonical `SystemRole` is incomplete and the permission system is broken for ADMIN users.

### Other phantom roles referenced but not registered

- `MANAGER` — `app/api/onboarding/tasks/[taskId]/route.ts:36`
- `FINANCE` — `features/hr/hr-dashboard-overview.tsx:399`, `features/hr/dashboard/payroll-summary-widget.tsx:10`
- `SALES_DIRECTOR`, `ENGINEERING_LEAD` — `components/tasks/my-tasks-panel.tsx:92`
- `HR_MANAGER` — `lib/inngest/functions/leave-escalation.ts:63`

Each of these is checked as a string against `user.role`, but none exist in `SYSTEM_ROLES`. Same dead-guard concern.

---

## Build state

- `pnpm exec tsc --noEmit` — clean
- Nothing committed (per rule)
- `.env` untouched (per rule)
- Auth pages untouched (per rule)

---

## Recommended Pass 6 — decide on the ADMIN role

Before going further on RBAC, the user needs to answer one question:

**Is `ADMIN` a real role users have, or is it dead?**

### If ADMIN is alive
1. Add `ADMIN` to `SYSTEM_ROLES` in `lib/rbac/permissions.ts` so it gets a permission default and shows up in the permission matrix
2. Add a `ROLE_LABELS.ADMIN` in `lib/rbac/roles.ts`
3. Audit `ROLE_DEFAULT_PERMISSIONS` — what should ADMIN have?

### If ADMIN is dead
1. Remove `ADMIN` from `lib/constants/roles.ts` `ROLES` enum
2. Replace `role === "ADMIN"` with the live equivalent in each call-site (likely fold into `CEO` / `HR` checks)
3. Remove `ADMIN` from `ADMIN_ROLES` / `EXPENSE_ADMIN_ROLES` arrays

Same decision needed for `MANAGER`, `FINANCE`, `SALES_DIRECTOR`, `ENGINEERING_LEAD`, `HR_MANAGER`.

### Then the consolidation
Replace `lib/constants/roles.ts` with thin re-exports of the canonical `lib/rbac/permissions.ts` symbols. Migrate 30+ consumers to import from `@/lib/rbac/permissions` directly. Delete the duplicate file.

Estimated ~4–6 hours of focused per-call-site review.

---

## Files touched this pass

### Modified
- `lib/constants/roles.ts` — `SUPER_ADMIN_ROLES` + `isSuperAdmin` now re-export from `lib/rbac/permissions`

### Audited, not modified
- `lib/rbac/permissions.ts`
- `lib/rbac/roles.ts`
- `components/shared/dashboard-gate.tsx`
- 30+ call-sites of `role === "ADMIN"` / `"MANAGER"` / `"FINANCE"` / etc.

---

## Verification

```bash
pnpm exec tsc --noEmit                           # clean
grep -rE "role === \"ADMIN\"|ROLES\\.ADMIN" app/ components/ features/ server/ lib/ --include="*.ts" --include="*.tsx"   # ~20 stale call-sites — Pass 6 decision
```
