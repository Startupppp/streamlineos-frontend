# Task 18: Multi-Tenant & Entity Management

## Priority: HIGH | Effort: 5-6 days | Dependencies: Task 04 (RBAC) | Status: NOT STARTED

---

## PRD

### Problem Statement
The application needs proper multi-entity support for investment platform:
1. **No entity switcher**: Users managing multiple branches/funds can't switch context
2. **No branch data isolation**: Branch managers can potentially access other branches' data
3. **No fund/entity hierarchy**: No parent-child relationship between entities
4. **No entity-specific settings**: All branches share same configuration
5. **No cross-entity reporting**: Can't compare performance across branches/funds
6. **No entity onboarding**: No flow for setting up new branches/funds
7. **Branch table exists** but isn't fully integrated into data access layer

### Goals
- Implement entity context switcher in topbar/sidebar
- Enforce data isolation per branch/fund/entity at the database query level
- Build entity management UI (create, edit, deactivate branches/funds)
- Add entity-specific settings (timezone, currency, fiscal year)
- Enable cross-entity reporting for CEO/admin roles
- Add entity hierarchy (parent org → fund → branch)

### Non-Goals
- Multi-database architecture (single DB with row-level filtering)
- PostgreSQL Row-Level Security policies (application-level enforcement)
- White-label per entity (same UI for all)
- Separate billing per entity

### Success Criteria
- Entity switcher allows users to switch context
- Queries automatically filter by selected entity
- Branch managers see only their branch data
- CEO/admin can view cross-entity aggregated data
- New entities can be created through UI
- Entity-specific settings applied correctly

---

## Rules to Follow

1. **Entity Context Required**: Every authenticated request must have entity context
2. **Query Filter Mandatory**: Every DB query that returns entity data MUST filter by entity
3. **Entity Passed via Context**: Use React Context (client) and middleware (server) to propagate entity
4. **Default Entity**: User's primary branch is default entity on login
5. **Entity Access Check**: User must be member of entity to access its data
6. **Audit Entity Context**: Every audit log entry includes entity context

---

## Implementation Steps

### Step 1: Database Schema

**Enhance existing branches table**:
```ts
// Already has: id, orgId, code, name, city, state, country, branchManagerId, branchHrId, status
// Add:
parentId: text("parent_id").references(() => branches.id), // for hierarchy
settings: jsonb("settings"), // timezone, currency, fiscal year, etc.
type: text("type").default("branch").notNull(), // "headquarters", "branch", "fund", "entity"
```

**New table: entity_members**
```ts
export const entityMembers = pgTable("entity_members", {
  id: text("id").primaryKey(),
  entityId: text("entity_id").notNull().references(() => branches.id),
  userId: text("user_id").notNull().references(() => users.id),
  role: text("role").notNull(), // role within this entity
  isPrimary: boolean("is_primary").default(false).notNull(),
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("uniq_entity_member").on(table.entityId, table.userId),
]);
```

### Step 2: Entity Context Provider

**File**: `components/providers/entity-provider.tsx` (NEW)
```tsx
"use client";

interface EntityContextType {
  currentEntityId: string | null;
  currentEntity: Branch | null;
  entities: Branch[];
  switchEntity: (entityId: string) => void;
  isGlobalScope: boolean; // CEO/admin viewing all entities
}

const EntityContext = createContext<EntityContextType>(/* ... */);

function EntityProvider({ children, userEntities, defaultEntityId }) {
  // State: currentEntityId
  // Persist selection in localStorage
  // Pass through context
}

function useEntity() {
  return useContext(EntityContext);
}
```

### Step 3: Entity Switcher Component

**File**: `components/layout/entity-switcher.tsx` (NEW)

**Design**:
```
┌─────────────────────────────┐
│ 🏢 Mumbai Branch         ▼ │
├─────────────────────────────┤
│ ● Mumbai Branch (current)   │
│ ○ Delhi Branch              │
│ ○ Bangalore Branch          │
│ ──────────────────────────  │
│ ○ All Entities (CEO only)   │
│ ──────────────────────────  │
│ + Add New Entity            │
└─────────────────────────────┘
```

**Placement**: Top of sidebar, below logo/brand header

### Step 4: Server-Side Entity Enforcement

**File**: `server/api/middleware/entity-scope.ts` (NEW or update from Task 04)
```ts
// Add entity context to tRPC context
const entityScopeMiddleware = t.middleware(async ({ ctx, next }) => {
  const entityId = ctx.headers.get("x-entity-id");

  // Verify user has access to this entity
  if (entityId) {
    const membership = await db.query.entityMembers.findFirst({
      where: and(
        eq(entityMembers.userId, ctx.user.id),
        eq(entityMembers.entityId, entityId),
      ),
    });
    if (!membership && !isGlobalRole(ctx.user.role)) {
      throw new TRPCError({ code: "FORBIDDEN" });
    }
  }

  return next({
    ctx: {
      ...ctx,
      entityId: isGlobalRole(ctx.user.role) ? entityId : ctx.user.branchId,
      isGlobalScope: isGlobalRole(ctx.user.role) && !entityId,
    },
  });
});
```

### Step 5: Update All Queries to Filter by Entity

For every tRPC query that returns entity-scoped data:
```ts
// Before
where: eq(leads.orgId, ctx.orgId)

// After
where: and(
  eq(leads.orgId, ctx.orgId),
  ctx.entityId ? eq(leads.branchId, ctx.entityId) : undefined, // null = all entities
)
```

**Queries to update**:
- All lead queries
- All deal queries
- All employee queries
- All attendance queries
- All expense queries
- All leave queries
- All target queries
- All client account queries
- Dashboard stat queries

### Step 6: Entity Management Pages

**Files**:
- `app/(dashboard)/settings/entities/page.tsx` - Entity list (CEO/admin only)
- `app/(dashboard)/settings/entities/[id]/page.tsx` - Entity detail/settings
- `app/(dashboard)/settings/entities/new/page.tsx` - Create entity form

**Entity settings form**:
- Name, code, type (branch/fund/entity)
- Address (city, state, country, pincode)
- Contact (phone, email)
- Manager assignment
- HR assignment
- Timezone
- Currency
- Fiscal year start
- Status (active/inactive)

### Step 7: Cross-Entity Reporting (CEO Dashboard)

**For CEO/admin viewing "All Entities"**:
- Dashboard shows aggregated metrics across all entities
- Charts show entity comparison (bar chart: leads per branch, revenue per branch)
- Drill-down: click entity to filter to that entity's data
- Entity performance leaderboard

---

## Checklist

- [ ] Add `parentId`, `settings`, `type` to branches table migration
- [ ] Create `entity_members` table migration
- [ ] Create `EntityProvider` context provider
- [ ] Create `EntitySwitcher` dropdown component
- [ ] Add entity switcher to sidebar
- [ ] Create server-side entity scope middleware
- [ ] Update ALL lead queries with entity filter
- [ ] Update ALL deal queries with entity filter
- [ ] Update ALL employee queries with entity filter
- [ ] Update ALL attendance queries with entity filter
- [ ] Update ALL expense queries with entity filter
- [ ] Update ALL leave queries with entity filter
- [ ] Update ALL target queries with entity filter
- [ ] Update ALL dashboard stat queries with entity filter
- [ ] Build entity management pages (list, detail, create)
- [ ] Build entity settings form
- [ ] Add cross-entity comparison to CEO dashboard
- [ ] Pass entity context in all tRPC calls
- [ ] Store selected entity in localStorage
- [ ] Test: Branch manager can only see their branch data
- [ ] Test: CEO can switch between entities and view all
- [ ] Test: Entity switcher persists selection across page navigations
- [ ] `pnpm build` passes

---

## Acceptance Criteria

1. Entity switcher visible in sidebar for users with multiple entities
2. Switching entity immediately filters all data on current page
3. Branch manager cannot access other branches' data via API
4. CEO can view aggregated data across all entities
5. New entities can be created through settings UI
6. Entity settings (timezone, currency) applied to data display
7. Entity context persists across page navigations (localStorage)

---

## Testing Plan

1. **Isolation**: Login as Branch A manager, verify cannot see Branch B leads via API
2. **Switching**: Switch entity, verify dashboard stats change
3. **Global View**: Login as CEO, select "All Entities", verify aggregated data
4. **Persistence**: Switch entity, navigate to another page, verify entity remains selected
5. **Access Check**: Try to access entity user is not member of, verify 403
6. **Entity CRUD**: Create new entity, assign manager, verify entity appears in switcher
