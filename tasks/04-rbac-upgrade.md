# Task 04: RBAC System Upgrade

## Priority: 🟠 HIGH

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

**Acceptance Criteria**:
- All roles type-safe
- Branch-scoped users only see their branch data
- Permission-level checks on mutations
- Middleware dynamically handles route access
