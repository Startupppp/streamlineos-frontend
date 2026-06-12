# Pass 8 — CASL everywhere (client done, server proof-of-concept)

## TL;DR

Migrated every client-side permission/role condition to CASL. Added a server-side CASL helper so API routes can do the same without re-fetching permissions. Migrated one server route as proof. Removed the now-unused `hasPermission`/`hasAnyPermission`/`hasAllPermissions` methods. tsc clean.

The remaining ~100 `isAdminOrOwner(session.user.role)` server-side call-sites are mechanical migrations that each need a per-route judgment on which CASL permission to check — that's a Pass 9 pass, not a bulk sed-replace.

---

## Shipped

### Client side — all permission/role conditions through CASL

| File | Before | After |
|---|---|---|
| `components/rbac/permission-gate.tsx` | `usePermissions().hasPermission(...)` etc. | `useAbility().can(action, subject)` |
| `components/layout/app-sidebar.tsx` | `permissions.includes("settings:manage")` + `role === "OWNER"` | `ability.can("manage", "settings")` (covers super-admins via `can("manage", "all")` AND anyone with the explicit permission) |
| `components/shared/dashboard-gate.tsx` | already on CASL from Pass 7 | unchanged |

### Server side — CASL available, one proof migrated

| File | Change |
|---|---|
| `types/next-auth.d.ts` | `Session.permissions?: string[]` added |
| `lib/auth.ts` | Session callback now exposes `session.permissions` (already in JWT cache) |
| `lib/abilities-server.ts` | **NEW** — `getSessionAbility()` reads `session.permissions` and returns the CASL Ability. No DB hit; reuses the same Redis-cached permissions the JWT already loaded. |
| `app/api/dashboard/pending-approvals/route.ts` | `isAdminOrOwner(session.user.role)` → `ability.can("approve", "hr:leaves")` (proof of pattern) |

### Cleaned up

| File | Change |
|---|---|
| `lib/rbac/hooks.ts` | Removed unused `hasPermission` / `hasAnyPermission` / `hasAllPermissions` methods (no remaining consumers). `usePermissions()` now only exposes `{ permissions, isLoading }` — kept because `app-sidebar.tsx` + `command-palette.tsx` still pass the raw array to `getNavGroupsForUser`. |

---

## Patterns now in place

### Client-side gate
```tsx
import { useAbility } from "@/lib/abilities-context";
const ability = useAbility();
if (ability.can("approve", "hr:leaves")) { ... }

// Or with the Can component:
<Can I="approve" a="hr:leaves">
  <Button>Approve</Button>
</Can>
```

### Server-side gate (API routes)
```ts
import { getSessionAbility } from "@/lib/abilities-server";

export async function POST() {
  return withAuth(async (session) => {
    const ability = await getSessionAbility();
    if (!ability.can("approve", "hr:leaves")) return err("Forbidden", 403);
    // ...
  });
}
```

### Server-side gate (server actions)
Same pattern — `getSessionAbility()` works in any server context that can call `auth()`.

### Plan-gating (orthogonal to RBAC)
```tsx
import { useFeature } from "@/lib/billing/use-feature";
const { enabled, requiredPlan } = useFeature("ai.lead-scoring");
```

---

## Build state

- `pnpm exec tsc --noEmit` — clean for all my changes (one pre-existing `scripts/seed-demo.ts` `INTERVIEWING` typo unrelated)
- Nothing committed (per rule)
- `.env` untouched (per rule)
- Auth pages untouched (per rule)

---

## Deferred — Pass 9 mechanical migration

~100 server-side `isAdminOrOwner(session.user.role)` call-sites + a smaller number of `role === "HR"` / `role === "CEO"` direct role checks. Each needs a per-route judgment:

| Module | Likely target CASL check |
|---|---|
| `app/api/hr/expenses/**` | `ability.can("approve", "hr:expenses")` |
| `app/api/hr/leaves/**` | `ability.can("approve", "hr:leaves")` |
| `app/api/hr/payrolls/**` | `ability.can("approve", "hr:payroll")` |
| `app/api/hr/documents/**` | `ability.can("manage", "hr:documents")` |
| `app/api/hr/recruitment/**` | per-route (some are `manage`, some are `view`) |
| `app/api/projects/**` | `ability.can("manage", "projects")` or per-action |
| `app/api/organization/**` | `ability.can("manage", "settings")` |
| `app/api/settings/**` | `ability.can("manage", "settings")` |

I deliberately did not bulk-sed these because:
- The current `isAdminOrOwner` check is `["OWNER","CEO","HR","ADMIN"]` — coarse-grained
- Each route's *actual* permission requirement is more specific (e.g. expense routes want `approve`, not generic admin)
- A bulk replacement would either over-restrict (only super admins) or under-restrict (anyone with any HR permission)

Estimated ~6–8 hours of focused per-route work for Pass 9. Each route is ~2-3 lines, but needs reading to pick the right verb/subject.

### Also still TBD from Pass 5
- Decide on the `ADMIN` role: is it real or dead? Affects all the `role === "ADMIN"` checks scattered around.

---

## Files touched this pass

### Added
- `lib/abilities-server.ts`

### Modified
- `components/rbac/permission-gate.tsx` — full CASL rewrite
- `components/layout/app-sidebar.tsx` — `permissions.includes` → `ability.can`
- `types/next-auth.d.ts` — `session.permissions`
- `lib/auth.ts` — exposes `session.permissions`
- `lib/rbac/hooks.ts` — trimmed to `{ permissions, isLoading }`
- `app/api/dashboard/pending-approvals/route.ts` — server CASL proof

### Not modified (intentional)
- The ~100 server-side `isAdminOrOwner(session.user.role)` call-sites — Pass 9
- `lib/rbac/middleware.ts` `checkPermission` — kept as the canonical DB-lookup path used by `/api/rbac/role-permissions/route.ts` for fresh checks
- `usePermissions()`-via-`permissions` consumers in sidebar + command palette — these need the raw array for `getNavGroupsForUser`, which is fine

---

## Verification

```bash
pnpm exec tsc --noEmit                                       # clean
grep -rE "hasPermission|hasAnyPermission|hasAllPermissions" components/ features/ app/ --include="*.tsx" --include="*.ts" | grep -v "lib/rbac/middleware.ts" | grep -v "app/(dashboard)/settings/permissions/page.tsx"   # empty (only the unrelated middleware factory + local var remain)
grep -rE "useAbility\\(" components/ lib/ --include="*.tsx"  # multiple hits — CASL is the pattern now
```
