# Task 04: RBAC System Upgrade

## Priority: HIGH | Effort: 3-4 days | Dependencies: Task 06 (Redis for caching) | Status: NOT STARTED

---

## PRD

### Problem Statement
1. Route-level RBAC only — middleware blocks routes but mutations/queries don't check permissions granularly
2. No entity-scoping — Branch A users can see Branch B data (CRITICAL security issue)
3. Role names are magic strings (`"CEO"`, `"HR"`, `"SALES"`) throughout codebase
4. `permissions` and `rolePermissions` tables exist but aren't enforced in tRPC procedures
5. No permission-based UI gating (only role-based sidebar filtering)
6. `rolePermissions.role` is TEXT, not FK to roles table

### Goals
- Type-safe role and permission constants
- Permission checks at procedure level for every mutation
- Branch/entity data isolation for all queries
- Reusable `<PermissionGate>` component for UI
- Cache permissions in Redis for performance

### Non-Goals
- Changing role names
- Adding new roles
- PostgreSQL row-level security (application-level enforcement)

### Success Criteria
- Every tRPC mutation checks user permissions
- Branch users can only see their branch's data
- Permission checks add <5ms latency (cached)
- Zero unauthorized access possible through API

## Rules to Follow

1. **Principle of Least Privilege**: Default deny, grant explicitly
2. **Permission Format**: `resource:action` (e.g., `leads:create`, `payroll:approve`)
3. **Check at Every Layer**: Middleware (route), tRPC (procedure), UI (component)
4. **Cache Permissions**: Redis with 600s TTL, invalidate on role change
5. **Audit Everything**: Every permission-denied event must be logged
6. **No Hardcoded Roles**: Use constants file, never inline role strings

---

### 4.1 Create Type-Safe Role Constants

**File**: `lib/rbac/roles.ts`

Replace string literals with a centralized const object:
```typescript
export const ROLES = {
  SUPER_ADMIN: "SUPER_ADMIN",
  FUND_ADMINISTRATOR: "FUND_ADMINISTRATOR",
  PORTFOLIO_MANAGER: "PORTFOLIO_MANAGER",
  DEAL_SOURCING_LEAD: "DEAL_SOURCING_LEAD",
  INVESTOR_RELATIONS: "INVESTOR_RELATIONS",
  BIZ_DEV_MANAGER: "BIZ_DEV_MANAGER",
  MARKETING: "MARKETING",
  COMPLIANCE_OFFICER: "COMPLIANCE_OFFICER",
  ANALYST: "ANALYST",
  PEOPLE_OPS: "PEOPLE_OPS",
  EXECUTIVE: "EXECUTIVE",
  BRANCH_MANAGER: "BRANCH_MANAGER",
  BRANCH_HR: "BRANCH_HR",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];
```

⚠️ **Migration path**: If keeping old roles, create an alias map.

---

### 4.2 Permission-Based Mutation Guards

**Current**: tRPC middleware only checks role.

**Fix**: Add permission check to every mutation:
```typescript
const requirePermission = (permission: string) =>
  t.middleware(async ({ ctx, next }) => {
    const hasPermission = await checkUserPermission(
      ctx.session.userId,
      ctx.session.orgId,
      permission
    );
    if (!hasPermission) {
      throw new TRPCError({ code: "FORBIDDEN" });
    }
    return next();
  });
```

---

### 4.3 Entity-Scoped Access (Branch Isolation)

**Problem**: BRANCH_MANAGER and BRANCH_HR should only see data for their branch.

**Fix**: Add branch filtering middleware:
```typescript
const branchScopeMiddleware = t.middleware(async ({ ctx, next }) => {
  const role = ctx.session.user.role;
  if (role === "BRANCH_MANAGER" || role === "BRANCH_HR") {
    // Get user's branch
    const user = await db.query.users.findFirst({
      where: eq(users.id, ctx.session.userId),
      columns: { branchId: true },
    });
    return next({ ctx: { ...ctx, branchId: user?.branchId } });
  }
  return next({ ctx: { ...ctx, branchId: null } }); // null = all branches
});
```

---

### 4.4 Middleware Route Map Cleanup

**File**: `middleware.ts`

**Current**: 100+ lines of role-to-route mapping.

**Fix**: Generate from permissions config. Dynamic route protection.

---

## Checklist

- [ ] Create `lib/constants/permissions.ts` with all permission constants
- [ ] Update `lib/constants/roles.ts` with type-safe role constants
- [ ] Create `lib/constants/role-permissions-map.ts` with default mappings
- [ ] Create `server/api/middleware/permission-check.ts`
- [ ] Create `server/api/middleware/entity-scope.ts` (branch isolation)
- [ ] Update `components/rbac/permission-gate.tsx` with permission-based checks
- [ ] Create `usePermissions()` hook for client-side checks
- [ ] Add Redis caching for permissions (requires Task 06)
- [ ] Add `requirePermission()` to ALL CRM mutations
- [ ] Add `requirePermission()` to ALL HR mutations
- [ ] Add `requirePermission()` to ALL Project mutations
- [ ] Add `requirePermission()` to ALL Settings mutations
- [ ] Add entity-scoping filter to ALL list queries
- [ ] Update middleware.ts to use role constants (no magic strings)
- [ ] Fix `rolePermissions.role` FK (depends on Task 02)
- [ ] Wrap sensitive UI elements with `<PermissionGate>`
- [ ] Add permission-denied audit logging
- [ ] Replace all inline role string checks with constants
- [ ] `pnpm build` passes

## Acceptance Criteria

1. Every tRPC mutation has a permission check
2. Branch users can only see their branch's data (verified via API test)
3. Permission cache hits >90% (verified via Redis monitor)
4. `<PermissionGate>` wraps create/edit/delete buttons
5. Permission denied attempts logged in audit_logs
6. No magic role strings remain in codebase
7. All roles type-safe using constants

## Testing Plan

1. Login as SALES, try to access HR API, verify 403
2. Login as Branch A manager, verify only Branch A leads visible
3. Login as SALES, verify "Invite Member" button hidden
4. Check permission, update role, verify Redis cache invalidated
5. Trigger forbidden action, verify audit log entry created
6. Search codebase for magic role strings, verify zero remain
