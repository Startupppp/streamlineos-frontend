# StreamlineOS — Access Control Architecture (RBAC + Entitlements)
## End-to-end, dynamic, future-proof. Paste into Claude Code.

> **Status:** Implementation spec with real code. **Stack:** Next.js App Router, TypeScript (strict), Drizzle + Neon Postgres, Redis, TanStack Query, shadcn/ui.
> **Goal:** one access system that covers (a) dynamic custom roles, (b) granular permissions, (c) per-module + per-tier **upgrade-gating**, (d) per-seat licensing, (e) resource-scoped grants, (f) data-row scope (own/team/all) — enforced server-side, cached, and bug-resistant by design.

---

## 0. Mental model (read this first)

Access = **Entitlement ∩ Seat ∩ Permission**. All three must pass. They are orthogonal — conflating them is the #1 source of the bugs you have today.

```
┌─────────────────────────────────────────────────────────────────────┐
│ 1. ENTITLEMENT  (commercial, per-ORG)   "Did the org pay for this?"   │
│    • module on/off        → org_modules                                │
│    • tier (free→ent)       → org_modules.tier   (your "upgrade based") │
│    • limits/quotas         → org_limits         (LIMIT_REACHED → upsell)│
├─────────────────────────────────────────────────────────────────────┤
│ 2. SEAT  (commercial, per-USER)         "Is this user licensed?"      │
│    • per-module seat        → user_seats                               │
├─────────────────────────────────────────────────────────────────────┤
│ 3. PERMISSION  (authorization, RBAC)    "Is this user allowed?"       │
│    • dynamic roles (per org)→ roles, role_permissions                  │
│    • global assignment      → user_roles, group_roles                  │
│    • resource-scoped grant  → resource_grants (e.g. Editor on Space X) │
│    • data-row scope         → role_permissions.scope (own/team/all)    │
└─────────────────────────────────────────────────────────────────────┘
                              ▼
                    authorize(ctx, { permission, resource? })
                  → { allow, reason?, scope, upgrade? }   (ONE chokepoint)
```

**Why this is reliable & future-proof (design → failure it prevents):**
- **Deny-by-default** → no accidental access; absence = denial.
- **Grant-only (no explicit-deny rows)** → eliminates allow/deny precedence confusion (a classic RBAC bug class). "Can do everything except X" = simply don't grant X.
- **One `authorize()` chokepoint** → no scattered, drifting checks.
- **Permissions = data synced from a code catalog** → adding a feature = catalog entry + migration; the engine never changes. FK integrity via a synced `permissions` table.
- **Entitlement-aware authorization** → you can't be granted a permission for a module the org doesn't own; checks short-circuit with a precise upgrade reason.
- **Versioned cache** (`access_versions`) → permission/role edits bump a version → caches bust atomically → **never** serve stale permissions.
- **Structured deny reasons** (`NO_MODULE` / `PLAN_UPGRADE` / `SEAT_REQUIRED` / `LIMIT_REACHED` / `FORBIDDEN` / `NOT_FOUND`) → UI shows the right upsell; resource-not-visible returns **404** (no enumeration leak).
- **Resource-scoped grants are generic** (`resource_grants` over any `resource_type`) → KB spaces, projects, deals, etc. all reuse it.
- **Matrix tests** lock the behavior.

---

## 1. File map (what Claude Code creates)

```
db/schema/
  access.ts              # permissions, roles, role_permissions, user_roles, group_roles,
                         # resource_grants, access_versions
  entitlements.ts        # org_modules, user_seats, org_limits
lib/auth/
  catalog.ts             # MODULES, PERMISSIONS (code = source of truth), TIERS, LIMITS, role templates
  types.ts               # Tier, DataScope, DenyReason, AuthContext, AuthResult, EffectivePermissions
  context.ts             # getAuthContext() from session  (request-cached)
  entitlements.ts        # orgModule(), userHasSeat(), checkLimit()  (cached)
  resolve.ts             # resolveUserPermissions()  (the RBAC computation, cached)
  cache.ts               # Redis get/set + version keys + invalidation + request memo
  authorize.ts          # authorize(), requirePermission(), accessibleResourceIds(), getDataScope()
  scope.ts               # applyScope() — builds Drizzle WHERE for own/team/all
  errors.ts              # AccessError → HTTP status mapping
  audit.ts               # audit sensitive checks/denials
  invalidate.ts          # bumpPermissionsVersion(), bumpEntitlementsVersion() + helpers
lib/api/
  route.ts               # withAuth() route-handler wrapper
  access.ts              # TanStack Query hooks (client bootstrap)
app/api/me/access/route.ts          # returns the user's resolved access for UI gating
components/auth/
  can.tsx                # <Can/>, useCan()
  require-module.tsx     # <RequireModule/> with upgrade fallback
app/(app)/settings/roles/           # dynamic roles admin (list / editor / assignments)
db/seed/access.seed.ts              # sync catalog → permissions table + seed system roles
__tests__/auth/                     # matrix + unit tests
```

---

## 2. Schema (Drizzle)

> All tables org-scoped. Enable nothing special here (pgvector etc. is the KB module). Use the repo's existing `organizations`, `users`, `teams`, `departments`, `team_members`, `department_members` tables — referenced, not redefined.

### 2.1 `db/schema/access.ts`
```ts
import {
  pgTable, pgEnum, uuid, text, boolean, integer, timestamp, jsonb, uniqueIndex, index,
} from 'drizzle-orm/pg-core';
import { organizations, users } from './core'; // adjust import to repo

export const tierEnum = pgEnum('tier', ['free', 'starter', 'pro', 'enterprise']);
export const dataScopeEnum = pgEnum('data_scope', ['all', 'team', 'own', 'none']);
export const principalTypeEnum = pgEnum('principal_type', ['user', 'team', 'department']);

// ── Permission catalog (synced FROM lib/auth/catalog.ts at deploy; code is source of truth) ──
export const permissions = pgTable('permissions', {
  key: text('key').primaryKey(),                 // e.g. "kb.article.publish"
  module: text('module').notNull(),              // "kb"
  resource: text('resource').notNull(),          // "article"
  action: text('action').notNull(),              // "publish"
  label: text('label').notNull(),
  description: text('description'),
  scopable: boolean('scopable').notNull().default(false),     // supports own/team/all
  requiresSeat: boolean('requires_seat').notNull().default(true),
  minTier: tierEnum('min_tier'),                 // null = any tier
  isDangerous: boolean('is_dangerous').notNull().default(false), // extra audit
});

// ── Roles (per-org; system roles are seeded + cloneable; custom roles are admin-created) ──
export const roles = pgTable('roles', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  key: text('key'),                              // stable key for system roles ("kb_editor"); null for custom
  name: text('name').notNull(),
  description: text('description'),
  isSystem: boolean('is_system').notNull().default(false),  // seeded template; core perms locked
  isDefault: boolean('is_default').notNull().default(false),// auto-assigned to new members
  parentRoleId: uuid('parent_role_id'),          // optional inheritance (cycle-checked in app)
  createdBy: uuid('created_by').references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  orgIdx: index('roles_org_idx').on(t.orgId),
  uqKey: uniqueIndex('roles_org_key_uq').on(t.orgId, t.key), // null keys allowed multiple times in PG
}));

export const rolePermissions = pgTable('role_permissions', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id').notNull(),
  roleId: uuid('role_id').notNull().references(() => roles.id, { onDelete: 'cascade' }),
  permissionKey: text('permission_key').notNull().references(() => permissions.key),
  scope: dataScopeEnum('scope').notNull().default('all'), // only meaningful if permission.scopable
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  uq: uniqueIndex('role_perm_uq').on(t.roleId, t.permissionKey),
  roleIdx: index('role_perm_role_idx').on(t.roleId),
}));

// ── Global (org-wide) assignments ──
export const userRoles = pgTable('user_roles', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id').notNull(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  roleId: uuid('role_id').notNull().references(() => roles.id, { onDelete: 'cascade' }),
  assignedBy: uuid('assigned_by').references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  uq: uniqueIndex('user_role_uq').on(t.orgId, t.userId, t.roleId),
  userIdx: index('user_role_user_idx').on(t.orgId, t.userId),
}));

export const groupRoles = pgTable('group_roles', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id').notNull(),
  groupType: principalTypeEnum('group_type').notNull(), // 'team' | 'department'
  groupId: uuid('group_id').notNull(),
  roleId: uuid('role_id').notNull().references(() => roles.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  uq: uniqueIndex('group_role_uq').on(t.orgId, t.groupType, t.groupId, t.roleId),
  grpIdx: index('group_role_grp_idx').on(t.orgId, t.groupType, t.groupId),
}));

// ── Resource-scoped grants (generic; replaces per-module permission tables like kb_space_permissions) ──
export const resourceGrants = pgTable('resource_grants', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id').notNull(),
  resourceType: text('resource_type').notNull(),  // 'kb_space' | 'project' | 'deal_pipeline' | ...
  resourceId: uuid('resource_id').notNull(),
  principalType: principalTypeEnum('principal_type').notNull(),
  principalId: uuid('principal_id').notNull(),
  roleId: uuid('role_id').notNull().references(() => roles.id, { onDelete: 'cascade' }),
  createdBy: uuid('created_by').references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  uq: uniqueIndex('resource_grant_uq')
    .on(t.orgId, t.resourceType, t.resourceId, t.principalType, t.principalId, t.roleId),
  byResource: index('resource_grant_res_idx').on(t.orgId, t.resourceType, t.resourceId),
  byPrincipal: index('resource_grant_principal_idx').on(t.orgId, t.principalType, t.principalId),
}));

// ── Cache-busting versions (bump on any change → all caches for the org invalidate) ──
export const accessVersions = pgTable('access_versions', {
  orgId: uuid('org_id').primaryKey().references(() => organizations.id, { onDelete: 'cascade' }),
  permissionsVersion: integer('permissions_version').notNull().default(1),
  entitlementsVersion: integer('entitlements_version').notNull().default(1),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
```

### 2.2 `db/schema/entitlements.ts`
```ts
import { pgTable, pgEnum, uuid, text, integer, timestamp, uniqueIndex, index } from 'drizzle-orm/pg-core';
import { tierEnum } from './access';
import { organizations, users } from './core';

export const moduleStatusEnum = pgEnum('module_status', ['active', 'trial', 'suspended', 'canceled']);
export const seatStatusEnum = pgEnum('seat_status', ['active', 'suspended']);

export const orgModules = pgTable('org_modules', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  moduleKey: text('module_key').notNull(),       // 'crm' | 'hr' | 'knowledge_base' | ...
  tier: tierEnum('tier').notNull().default('starter'),
  status: moduleStatusEnum('status').notNull().default('active'),
  seatLimit: integer('seat_limit'),              // null = unlimited (or governed by org_limits)
  trialEndsAt: timestamp('trial_ends_at', { withTimezone: true }),
  currentPeriodEnd: timestamp('current_period_end', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({ uq: uniqueIndex('org_module_uq').on(t.orgId, t.moduleKey) }));

export const userSeats = pgTable('user_seats', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id').notNull(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  moduleKey: text('module_key').notNull(),
  status: seatStatusEnum('status').notNull().default('active'),
  assignedBy: uuid('assigned_by').references(() => users.id),
  assignedAt: timestamp('assigned_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  uq: uniqueIndex('user_seat_uq').on(t.orgId, t.userId, t.moduleKey),
  byModule: index('user_seat_module_idx').on(t.orgId, t.moduleKey),
}));

export const orgLimits = pgTable('org_limits', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id').notNull(),
  limitKey: text('limit_key').notNull(),         // 'kb.spaces' | 'crm.contacts' | 'seats.hr' | ...
  limitValue: integer('limit_value'),            // null = unlimited; overrides tier default
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({ uq: uniqueIndex('org_limit_uq').on(t.orgId, t.limitKey) }));
```
> **AI credits** (`ai_credit_balance`, `ai_credit_ledger`) are the shared primitive from the KB PRD — reused, not redefined. Billing/Razorpay writes these entitlement tables; the access engine only reads them.

---

## 3. The catalog — `lib/auth/catalog.ts` (source of truth)

> Adding a feature = add a line here + run the sync seed + a migration if you add limit/tier rows. The engine code below never changes.

```ts
export const MODULES = [
  'platform', 'crm', 'hr', 'accounting', 'inventory', 'projects', 'helpdesk', 'knowledge_base', 'ai',
] as const;
export type ModuleKey = (typeof MODULES)[number];

export const TIERS = ['free', 'starter', 'pro', 'enterprise'] as const;
export type Tier = (typeof TIERS)[number];
export const tierRank = (t: Tier): number => TIERS.indexOf(t);

export interface PermissionDef {
  module: ModuleKey;
  resource: string;
  action: string;
  label: string;
  description?: string;
  scopable?: boolean;       // permission supports own/team/all row scope
  requiresSeat?: boolean;   // default true; settings/admin perms set false
  minTier?: Tier;           // gate this action behind a tier ("upgrade based")
  dangerous?: boolean;      // delete/billing/role-management → always audited
}

// Helper to keep keys + defs in lockstep and DRY.
const p = (key: string, def: PermissionDef) => [key, def] as const;

export const PERMISSIONS = Object.fromEntries([
  // ── platform / admin (no module/seat gate; platform.* always evaluated as org-internal) ──
  p('platform.org.manage',      { module: 'platform', resource: 'org', action: 'manage', label: 'Manage organization', requiresSeat: false, dangerous: true }),
  p('platform.member.manage',   { module: 'platform', resource: 'member', action: 'manage', label: 'Manage members & seats', requiresSeat: false, dangerous: true }),
  p('platform.role.manage',     { module: 'platform', resource: 'role', action: 'manage', label: 'Manage roles & permissions', requiresSeat: false, dangerous: true }),
  p('platform.billing.manage',  { module: 'platform', resource: 'billing', action: 'manage', label: 'Manage billing & plan', requiresSeat: false, dangerous: true }),
  p('platform.audit.read',      { module: 'platform', resource: 'audit', action: 'read', label: 'View audit log', requiresSeat: false }),

  // ── knowledge base (full set from the KB PRD) ──
  p('kb.space.read',            { module: 'knowledge_base', resource: 'space', action: 'read', label: 'View KB spaces' }),
  p('kb.space.create',          { module: 'knowledge_base', resource: 'space', action: 'create', label: 'Create spaces' }),
  p('kb.space.update',          { module: 'knowledge_base', resource: 'space', action: 'update', label: 'Edit spaces' }),
  p('kb.space.delete',          { module: 'knowledge_base', resource: 'space', action: 'delete', label: 'Delete spaces', dangerous: true }),
  p('kb.space.manage_permissions', { module: 'knowledge_base', resource: 'space', action: 'manage_permissions', label: 'Manage space access' }),
  p('kb.article.read',          { module: 'knowledge_base', resource: 'article', action: 'read', label: 'Read articles', scopable: true }),
  p('kb.article.create',        { module: 'knowledge_base', resource: 'article', action: 'create', label: 'Create articles' }),
  p('kb.article.update',        { module: 'knowledge_base', resource: 'article', action: 'update', label: 'Edit articles', scopable: true }),
  p('kb.article.delete',        { module: 'knowledge_base', resource: 'article', action: 'delete', label: 'Delete articles', dangerous: true }),
  p('kb.article.publish',       { module: 'knowledge_base', resource: 'article', action: 'publish', label: 'Publish articles' }),
  p('kb.article.verify',        { module: 'knowledge_base', resource: 'article', action: 'verify', label: 'Verify articles' }),
  p('kb.ai.use',                { module: 'knowledge_base', resource: 'ai', action: 'use', label: 'Use KB AI' }),
  p('kb.analytics.view',        { module: 'knowledge_base', resource: 'analytics', action: 'view', label: 'View KB analytics', requiresSeat: false, minTier: 'pro' }),
  p('kb.helpcenter.manage',     { module: 'knowledge_base', resource: 'helpcenter', action: 'manage', label: 'Manage public help center', requiresSeat: false }),

  // ── CRM (example of scopable data perms) ──
  p('crm.lead.read',            { module: 'crm', resource: 'lead', action: 'read', label: 'View leads', scopable: true }),
  p('crm.lead.create',          { module: 'crm', resource: 'lead', action: 'create', label: 'Create leads' }),
  p('crm.lead.update',          { module: 'crm', resource: 'lead', action: 'update', label: 'Edit leads', scopable: true }),
  p('crm.deal.read',            { module: 'crm', resource: 'deal', action: 'read', label: 'View deals', scopable: true }),
  p('crm.deal.approve',         { module: 'crm', resource: 'deal', action: 'approve', label: 'Approve deals', minTier: 'pro' }),

  // ── HR (largest module — abbreviated; follow the same pattern for the full surface) ──
  p('hr.employee.read',         { module: 'hr', resource: 'employee', action: 'read', label: 'View employees', scopable: true }),
  p('hr.payroll.run',           { module: 'hr', resource: 'payroll', action: 'run', label: 'Run payroll', dangerous: true, minTier: 'pro' }),

  // ...repeat for accounting, inventory, projects, helpdesk, ai...
]) as Record<string, PermissionDef>;

export type PermissionKey = keyof typeof PERMISSIONS;
export const ALL_PERMISSION_KEYS = Object.keys(PERMISSIONS) as PermissionKey[];

// ── Limits: tier defaults (overridable per-org via org_limits) ──
export const LIMIT_DEFAULTS: Record<string, Partial<Record<Tier, number | null>>> = {
  'kb.spaces':       { free: 1, starter: 5, pro: 50, enterprise: null },
  'crm.contacts':    { free: 100, starter: 2_000, pro: 50_000, enterprise: null },
  'projects.active': { free: 2, starter: 20, pro: 200, enterprise: null },
};

// ── System role templates (seeded into each org; cloneable) ──
export interface RoleTemplate {
  key: string;
  name: string;
  description: string;
  isDefault?: boolean;
  permissions: Array<{ key: string; scope?: 'all' | 'team' | 'own' }>; // 'key' may be a wildcard
}

export const ROLE_TEMPLATES: RoleTemplate[] = [
  {
    key: 'owner', name: 'Owner', description: 'Full control of the organization.',
    permissions: [{ key: '*' }], // expands to ALL org permissions (not platform-staff scope)
  },
  {
    key: 'admin', name: 'Administrator', description: 'Manage members, roles, and all modules.',
    permissions: [
      { key: 'platform.member.manage' }, { key: 'platform.role.manage' }, { key: 'platform.audit.read' },
      { key: 'crm.*' }, { key: 'hr.*' }, { key: 'accounting.*' }, { key: 'inventory.*' },
      { key: 'projects.*' }, { key: 'helpdesk.*' }, { key: 'knowledge_base.*' }, { key: 'ai.*' },
    ],
  },
  {
    key: 'member', name: 'Member', description: 'Standard access to assigned modules.', isDefault: true,
    permissions: [
      { key: 'kb.article.read' }, { key: 'kb.ai.use' },
      { key: 'crm.lead.read', scope: 'own' }, { key: 'crm.deal.read', scope: 'team' },
    ],
  },
  // module-scoped system roles (used for resource_grants on KB spaces, projects, etc.)
  { key: 'kb_admin',  name: 'KB Admin',  description: 'Full KB control.',           permissions: [{ key: 'knowledge_base.*' }] },
  { key: 'kb_editor', name: 'KB Editor', description: 'Publish & verify articles.',  permissions: [
    { key: 'kb.space.read' }, { key: 'kb.article.read' }, { key: 'kb.article.create' },
    { key: 'kb.article.update' }, { key: 'kb.article.publish' }, { key: 'kb.article.verify' }, { key: 'kb.ai.use' },
  ]},
  { key: 'kb_author', name: 'KB Author', description: 'Write & edit articles.',      permissions: [
    { key: 'kb.space.read' }, { key: 'kb.article.read' }, { key: 'kb.article.create' }, { key: 'kb.article.update' }, { key: 'kb.ai.use' },
  ]},
  { key: 'kb_viewer', name: 'KB Viewer', description: 'Read-only.',                  permissions: [{ key: 'kb.space.read' }, { key: 'kb.article.read' }, { key: 'kb.ai.use' }] },
];
```

---

## 4. Types — `lib/auth/types.ts`
```ts
import type { ModuleKey, PermissionKey, Tier } from './catalog';

export type DataScope = 'all' | 'team' | 'own' | 'none';
export type PrincipalType = 'user' | 'team' | 'department';

export type DenyReason =
  | 'UNAUTHENTICATED' | 'NO_MODULE' | 'PLAN_UPGRADE' | 'SEAT_REQUIRED'
  | 'LIMIT_REACHED' | 'FORBIDDEN' | 'NOT_FOUND';

export interface AuthContext {
  orgId: string;
  userId: string;
  isSuperAdmin: boolean;   // StreamlineOS platform staff, cross-org — use very sparingly
  isOrgOwner: boolean;     // derived from holding the seeded "owner" role
  teamIds: string[];
  departmentIds: string[];
}

export interface ResourceRef { type: string; id: string; }

export interface UpgradeInfo { module: ModuleKey; requiredTier?: Tier; limitKey?: string; current?: number; limit?: number; }

export interface AuthResult {
  allow: boolean;
  reason?: DenyReason;
  scope: DataScope;        // effective row scope (for list filtering); 'none' when denied
  upgrade?: UpgradeInfo;   // present when reason is NO_MODULE | PLAN_UPGRADE | LIMIT_REACHED
}

export interface EffectivePermissions {
  version: number;
  global: Map<PermissionKey, DataScope>;                                   // org-wide perms → best scope
  scoped: Map<string, Map<string, Map<PermissionKey, DataScope>>>;         // type → id → perm → scope
  roleIds: string[];
}
```

---

## 5. Context — `lib/auth/context.ts`
```ts
import { cache } from 'react';                 // per-request memoization (App Router)
import { getSession } from '@/lib/auth/session'; // existing session util
import { db } from '@/db';
import { eq, and } from 'drizzle-orm';
import { teamMembers, departmentMembers, userRoles, roles } from '@/db/schema';
import type { AuthContext } from './types';

export const getAuthContext = cache(async (): Promise<AuthContext | null> => {
  const session = await getSession();
  if (!session?.user?.id || !session.activeOrgId) return null;
  const { id: userId } = session.user;
  const orgId = session.activeOrgId;

  const [teams, depts, ownerRows] = await Promise.all([
    db.select({ id: teamMembers.teamId }).from(teamMembers)
      .where(and(eq(teamMembers.orgId, orgId), eq(teamMembers.userId, userId))),
    db.select({ id: departmentMembers.departmentId }).from(departmentMembers)
      .where(and(eq(departmentMembers.orgId, orgId), eq(departmentMembers.userId, userId))),
    db.select({ key: roles.key }).from(userRoles)
      .innerJoin(roles, eq(roles.id, userRoles.roleId))
      .where(and(eq(userRoles.orgId, orgId), eq(userRoles.userId, userId), eq(roles.key, 'owner'))),
  ]);

  return {
    orgId, userId,
    isSuperAdmin: session.user.isPlatformStaff === true,
    isOrgOwner: ownerRows.length > 0,
    teamIds: teams.map((t) => t.id),
    departmentIds: depts.map((d) => d.id),
  };
});
```

---

## 6. Cache & versions — `lib/auth/cache.ts`
```ts
import { cache } from 'react';
import { redis } from '@/lib/redis';
import { db } from '@/db';
import { eq } from 'drizzle-orm';
import { accessVersions } from '@/db/schema';

const PERM_TTL = 600;   // seconds; version key makes staleness impossible, TTL is just GC
const ENT_TTL = 300;

// Versions: read once per request, then reuse. Bumping the row (see invalidate.ts) busts everything.
export const getVersions = cache(async (orgId: string) => {
  const row = (await db.select().from(accessVersions).where(eq(accessVersions.orgId, orgId)).limit(1))[0];
  if (row) return { perm: row.permissionsVersion, ent: row.entitlementsVersion };
  await db.insert(accessVersions).values({ orgId }).onConflictDoNothing();
  return { perm: 1, ent: 1 };
});

export const permKey = (orgId: string, userId: string, v: number) => `perm:${orgId}:${userId}:v${v}`;
export const entKey  = (orgId: string, v: number, suffix: string) => `ent:${orgId}:v${v}:${suffix}`;

export async function cacheGetJson<T>(key: string): Promise<T | null> {
  const raw = await redis.get(key);
  return raw ? (JSON.parse(raw) as T) : null;
}
export async function cacheSetJson(key: string, value: unknown, ttl: number): Promise<void> {
  await redis.set(key, JSON.stringify(value), 'EX', ttl);
}
export const PERM_CACHE_TTL = PERM_TTL;
export const ENT_CACHE_TTL = ENT_TTL;
```

`lib/auth/invalidate.ts`
```ts
import { db } from '@/db';
import { sql, eq } from 'drizzle-orm';
import { accessVersions } from '@/db/schema';

// Call inside the SAME transaction as any role/permission/assignment/grant change.
export async function bumpPermissionsVersion(tx: typeof db, orgId: string): Promise<void> {
  await tx.insert(accessVersions).values({ orgId, permissionsVersion: 2 })
    .onConflictDoUpdate({
      target: accessVersions.orgId,
      set: { permissionsVersion: sql`${accessVersions.permissionsVersion} + 1`, updatedAt: sql`now()` },
    });
}
// Call when modules/seats/limits change (billing webhooks, seat assignment).
export async function bumpEntitlementsVersion(tx: typeof db, orgId: string): Promise<void> {
  await tx.insert(accessVersions).values({ orgId, entitlementsVersion: 2 })
    .onConflictDoUpdate({
      target: accessVersions.orgId,
      set: { entitlementsVersion: sql`${accessVersions.entitlementsVersion} + 1`, updatedAt: sql`now()` },
    });
}
```
> **Rule:** every mutation to `roles / role_permissions / user_roles / group_roles / resource_grants` calls `bumpPermissionsVersion` in the same transaction. Every mutation to `org_modules / user_seats / org_limits` calls `bumpEntitlementsVersion`. This is the single discipline that makes stale-permission bugs impossible. (Org-wide bump is intentional: always correct; per-user optimization is a later refinement.)

---

## 7. Entitlements — `lib/auth/entitlements.ts`
```ts
import { db } from '@/db';
import { and, eq } from 'drizzle-orm';
import { orgModules, userSeats, orgLimits } from '@/db/schema';
import { getVersions, entKey, cacheGetJson, cacheSetJson, ENT_CACHE_TTL } from './cache';
import { LIMIT_DEFAULTS, tierRank, type ModuleKey, type Tier } from './catalog';

export interface ModuleState { active: boolean; tier: Tier; }

export async function orgModule(orgId: string, moduleKey: ModuleKey): Promise<ModuleState | null> {
  const { ent } = await getVersions(orgId);
  const key = entKey(orgId, ent, `mod:${moduleKey}`);
  const hit = await cacheGetJson<ModuleState | { _null: true }>(key);
  if (hit) return '_null' in hit ? null : hit;

  const row = (await db.select().from(orgModules)
    .where(and(eq(orgModules.orgId, orgId), eq(orgModules.moduleKey, moduleKey))).limit(1))[0];
  const result: ModuleState | null = row
    ? { active: row.status === 'active' || row.status === 'trial', tier: row.tier }
    : null;
  await cacheSetJson(key, result ?? { _null: true }, ENT_CACHE_TTL);
  return result;
}

export async function userHasSeat(orgId: string, userId: string, moduleKey: ModuleKey): Promise<boolean> {
  const { ent } = await getVersions(orgId);
  const key = entKey(orgId, ent, `seat:${userId}:${moduleKey}`);
  const hit = await cacheGetJson<{ v: boolean }>(key);
  if (hit) return hit.v;

  const row = (await db.select({ id: userSeats.id }).from(userSeats)
    .where(and(eq(userSeats.orgId, orgId), eq(userSeats.userId, userId),
               eq(userSeats.moduleKey, moduleKey), eq(userSeats.status, 'active'))).limit(1))[0];
  const v = Boolean(row);
  await cacheSetJson(key, { v }, ENT_CACHE_TTL);
  return v;
}

export async function getLimit(orgId: string, limitKey: string, tier: Tier): Promise<number | null> {
  const override = (await db.select().from(orgLimits)
    .where(and(eq(orgLimits.orgId, orgId), eq(orgLimits.limitKey, limitKey))).limit(1))[0];
  if (override) return override.limitValue; // null = unlimited
  const def = LIMIT_DEFAULTS[limitKey];
  return def ? (def[tier] ?? null) : null;
}

export async function checkLimit(
  orgId: string, limitKey: string, tier: Tier, currentCount: number,
): Promise<{ ok: boolean; limit: number | null }> {
  const limit = await getLimit(orgId, limitKey, tier);
  return { ok: limit === null || currentCount < limit, limit };
}

export { tierRank };
```

---

## 8. Resolve effective permissions — `lib/auth/resolve.ts`
```ts
import { cache } from 'react';
import { db } from '@/db';
import { and, eq, inArray, or } from 'drizzle-orm';
import {
  userRoles, groupRoles, rolePermissions, roles, resourceGrants,
} from '@/db/schema';
import { getVersions, permKey, cacheGetJson, cacheSetJson, PERM_CACHE_TTL } from './cache';
import { ALL_PERMISSION_KEYS, type PermissionKey } from './catalog';
import type { AuthContext, DataScope, EffectivePermissions } from './types';

const SCOPE_RANK: Record<DataScope, number> = { none: 0, own: 1, team: 2, all: 3 };
const broadest = (a: DataScope | undefined, b: DataScope): DataScope =>
  (a && SCOPE_RANK[a] >= SCOPE_RANK[b] ? a : b);

// Expand a stored pattern ('*', 'crm.*', 'crm.lead.*', or an exact key) into concrete catalog keys.
export function expandPermission(pattern: string): PermissionKey[] {
  if (pattern === '*') return ALL_PERMISSION_KEYS;
  if (pattern.endsWith('.*')) {
    const prefix = pattern.slice(0, -1); // keep trailing dot → 'crm.' / 'crm.lead.'
    return ALL_PERMISSION_KEYS.filter((k) => k.startsWith(prefix));
  }
  return ALL_PERMISSION_KEYS.includes(pattern as PermissionKey) ? [pattern as PermissionKey] : [];
}

// Resolve a set of role ids → flat permission→scope map (with optional parent inheritance).
async function permsForRoles(
  roleIds: string[],
  defaultScope?: (key: PermissionKey) => DataScope,
): Promise<Map<PermissionKey, DataScope>> {
  const out = new Map<PermissionKey, DataScope>();
  if (roleIds.length === 0) return out;

  // optional inheritance: expand roleIds to include ancestors (cycle-safe, depth-capped)
  const expanded = await expandRoleAncestors(roleIds);

  const rows = await db.select({ permissionKey: rolePermissions.permissionKey, scope: rolePermissions.scope })
    .from(rolePermissions).where(inArray(rolePermissions.roleId, expanded));

  for (const r of rows) {
    for (const key of expandPermission(r.permissionKey)) {
      const scope = (r.scope as DataScope) ?? 'all';
      out.set(key, broadest(out.get(key), scope));
    }
  }
  return out;
}

async function expandRoleAncestors(roleIds: string[]): Promise<string[]> {
  const seen = new Set(roleIds);
  let frontier = roleIds;
  for (let depth = 0; depth < 8 && frontier.length; depth++) { // depth cap = cycle/abuse guard
    const parents = await db.select({ id: roles.id, parent: roles.parentRoleId })
      .from(roles).where(inArray(roles.id, frontier));
    frontier = parents.map((p) => p.parent).filter((x): x is string => !!x && !seen.has(x));
    frontier.forEach((id) => seen.add(id));
  }
  return [...seen];
}

async function computeEffective(ctx: AuthContext, version: number): Promise<EffectivePermissions> {
  // 1) global role ids: direct + via teams/departments
  const principalConds = [eq(userRoles.userId, ctx.userId)];
  const [direct, viaGroups] = await Promise.all([
    db.select({ roleId: userRoles.roleId }).from(userRoles)
      .where(and(eq(userRoles.orgId, ctx.orgId), ...principalConds)),
    (ctx.teamIds.length || ctx.departmentIds.length)
      ? db.select({ roleId: groupRoles.roleId }).from(groupRoles).where(and(
          eq(groupRoles.orgId, ctx.orgId),
          or(
            ctx.teamIds.length ? and(eq(groupRoles.groupType, 'team'), inArray(groupRoles.groupId, ctx.teamIds)) : undefined,
            ctx.departmentIds.length ? and(eq(groupRoles.groupType, 'department'), inArray(groupRoles.groupId, ctx.departmentIds)) : undefined,
          ),
        ))
      : Promise.resolve([] as { roleId: string }[]),
  ]);
  const globalRoleIds = [...new Set([...direct, ...viaGroups].map((r) => r.roleId))];
  const global = await permsForRoles(globalRoleIds);

  // 2) resource-scoped grants: rows matching user OR their teams/departments
  const grantRows = await db.select({
    type: resourceGrants.resourceType, id: resourceGrants.resourceId, roleId: resourceGrants.roleId,
  }).from(resourceGrants).where(and(
    eq(resourceGrants.orgId, ctx.orgId),
    or(
      and(eq(resourceGrants.principalType, 'user'), eq(resourceGrants.principalId, ctx.userId)),
      ctx.teamIds.length ? and(eq(resourceGrants.principalType, 'team'), inArray(resourceGrants.principalId, ctx.teamIds)) : undefined,
      ctx.departmentIds.length ? and(eq(resourceGrants.principalType, 'department'), inArray(resourceGrants.principalId, ctx.departmentIds)) : undefined,
    ),
  ));

  // group grants by (type,id) then resolve their roles' perms
  const scoped: EffectivePermissions['scoped'] = new Map();
  const byResource = new Map<string, { type: string; id: string; roleIds: Set<string> }>();
  for (const g of grantRows) {
    const k = `${g.type}:${g.id}`;
    if (!byResource.has(k)) byResource.set(k, { type: g.type, id: g.id, roleIds: new Set() });
    byResource.get(k)!.roleIds.add(g.roleId);
  }
  for (const { type, id, roleIds } of byResource.values()) {
    const perms = await permsForRoles([...roleIds]);
    if (!scoped.has(type)) scoped.set(type, new Map());
    scoped.get(type)!.set(id, perms);
  }

  return { version, global, scoped, roleIds: globalRoleIds };
}

// Public, cached resolver. Request-memoized + Redis (busts on version bump).
export const resolveUserPermissions = cache(async (ctx: AuthContext): Promise<EffectivePermissions> => {
  const { perm } = await getVersions(ctx.orgId);
  const key = permKey(ctx.orgId, ctx.userId, perm);

  const cached = await cacheGetJson<SerializedPerms>(key);
  if (cached) return deserialize(cached);

  const eff = await computeEffective(ctx, perm);
  await cacheSetJson(key, serialize(eff), PERM_CACHE_TTL);
  return eff;
});

// ── (de)serialization for Redis (Maps aren't JSON) ──
interface SerializedPerms {
  version: number; roleIds: string[];
  global: [PermissionKey, DataScope][];
  scoped: [string, [string, [PermissionKey, DataScope][]][]][];
}
function serialize(e: EffectivePermissions): SerializedPerms {
  return {
    version: e.version, roleIds: e.roleIds,
    global: [...e.global],
    scoped: [...e.scoped].map(([t, m]) => [t, [...m].map(([id, pm]) => [id, [...pm]])]),
  };
}
function deserialize(s: SerializedPerms): EffectivePermissions {
  const scoped = new Map(s.scoped.map(([t, arr]) =>
    [t, new Map(arr.map(([id, pm]) => [id, new Map(pm)]))]));
  return { version: s.version, roleIds: s.roleIds, global: new Map(s.global), scoped };
}
```

---

## 9. The chokepoint — `lib/auth/authorize.ts`
```ts
import { PERMISSIONS, type ModuleKey, type PermissionKey } from './catalog';
import { resolveUserPermissions } from './resolve';
import { orgModule, userHasSeat, checkLimit, tierRank } from './entitlements';
import { auditDeny, auditDangerousAllow } from './audit';
import type { AuthContext, AuthResult, DataScope, ResourceRef } from './types';

const deny = (reason: AuthResult['reason'], upgrade?: AuthResult['upgrade']): AuthResult =>
  ({ allow: false, reason, scope: 'none', upgrade });

export interface AuthorizeReq { permission: PermissionKey; resource?: ResourceRef; }

export async function authorize(ctx: AuthContext | null, req: AuthorizeReq): Promise<AuthResult> {
  if (!ctx) return deny('UNAUTHENTICATED');
  const def = PERMISSIONS[req.permission];
  if (!def) return deny('FORBIDDEN'); // unknown permission key = fail closed

  // Platform staff bypass (cross-org support) — audited, never silent.
  if (ctx.isSuperAdmin) { void auditDangerousAllow(ctx, req, 'super_admin'); return { allow: true, scope: 'all' }; }

  const moduleKey = def.module as ModuleKey;

  // ── Layer 1: entitlement (skip for platform.* which is org-internal admin) ──
  if (moduleKey !== 'platform') {
    const mod = await orgModule(ctx.orgId, moduleKey);
    if (!mod?.active) return deny('NO_MODULE', { module: moduleKey });
    if (def.minTier && tierRank(mod.tier) < tierRank(def.minTier)) {
      return deny('PLAN_UPGRADE', { module: moduleKey, requiredTier: def.minTier });
    }
    // ── Layer 2: seat ──
    if (def.requiresSeat !== false && !(await userHasSeat(ctx.orgId, ctx.userId, moduleKey))) {
      return deny('SEAT_REQUIRED', { module: moduleKey });
    }
  }

  // ── Layer 3: permission ──
  const perms = await resolveUserPermissions(ctx);
  const globalScope = perms.global.get(req.permission);
  if (globalScope) {
    if (def.dangerous) void auditDangerousAllow(ctx, req, 'global');
    return { allow: true, scope: def.scopable ? globalScope : 'all' };
  }
  if (req.resource) {
    const scopedScope = perms.scoped.get(req.resource.type)?.get(req.resource.id)?.get(req.permission);
    if (scopedScope) {
      if (def.dangerous) void auditDangerousAllow(ctx, req, 'resource_grant');
      return { allow: true, scope: def.scopable ? scopedScope : 'all' };
    }
  }

  void auditDeny(ctx, req, 'FORBIDDEN');
  return deny('FORBIDDEN');
}

// Throwing variant for route handlers / server actions.
import { AccessError } from './errors';
export async function requirePermission(ctx: AuthContext | null, req: AuthorizeReq): Promise<DataScope> {
  const r = await authorize(ctx, req);
  if (!r.allow) throw new AccessError(r.reason ?? 'FORBIDDEN', r.upgrade);
  return r.scope;
}

// For LIST queries spanning resources: which resource ids can the user touch with this permission?
export async function accessibleResourceIds(
  ctx: AuthContext, permission: PermissionKey, resourceType: string,
): Promise<{ all: true } | { all: false; ids: string[] }> {
  const perms = await resolveUserPermissions(ctx);
  if (perms.global.has(permission)) return { all: true };
  const ids: string[] = [];
  const byId = perms.scoped.get(resourceType);
  if (byId) for (const [id, pm] of byId) if (pm.has(permission)) ids.push(id);
  return { all: false, ids };
}

// Convenience: row-scope for own/team/all filtering of a globally-held permission.
export async function getDataScope(ctx: AuthContext, permission: PermissionKey): Promise<DataScope> {
  const perms = await resolveUserPermissions(ctx);
  return perms.global.get(permission) ?? 'none';
}

// Limit gate (numeric quotas → upgrade).
export async function requireLimit(ctx: AuthContext, limitKey: string, moduleKey: ModuleKey, current: number) {
  const mod = await orgModule(ctx.orgId, moduleKey);
  const tier = mod?.tier ?? 'free';
  const { ok, limit } = await checkLimit(ctx.orgId, limitKey, tier, current);
  if (!ok) throw new AccessError('LIMIT_REACHED', { module: moduleKey, limitKey, current, limit: limit ?? undefined });
}
```

`lib/auth/errors.ts`
```ts
import type { DenyReason, UpgradeInfo } from './types';

const STATUS: Record<DenyReason, number> = {
  UNAUTHENTICATED: 401, NO_MODULE: 402, PLAN_UPGRADE: 402, SEAT_REQUIRED: 402,
  LIMIT_REACHED: 402, FORBIDDEN: 403, NOT_FOUND: 404,
};

export class AccessError extends Error {
  constructor(public reason: DenyReason, public upgrade?: UpgradeInfo) {
    super(reason);
    this.name = 'AccessError';
  }
  get status(): number { return STATUS[this.reason]; }
  toBody() { return { error: { code: this.reason, message: this.reason, upgrade: this.upgrade } }; }
}
```

---

## 10. Data-row scope helper — `lib/auth/scope.ts`
```ts
import { and, eq, inArray, sql, type SQL } from 'drizzle-orm';
import type { PgColumn } from 'drizzle-orm/pg-core';
import type { AuthContext, DataScope } from './types';

interface ScopeColumns { ownerColumn: PgColumn; teamColumn?: PgColumn; }

// Returns a WHERE fragment to AND into a list query, based on the effective scope.
export function applyScope(scope: DataScope, ctx: AuthContext, cols: ScopeColumns): SQL {
  switch (scope) {
    case 'all':  return sql`true`;
    case 'own':  return eq(cols.ownerColumn, ctx.userId);
    case 'team': {
      const byOwner = eq(cols.ownerColumn, ctx.userId);
      if (cols.teamColumn && ctx.teamIds.length) {
        return sql`(${byOwner} OR ${inArray(cols.teamColumn, ctx.teamIds)})`;
      }
      return byOwner; // no team column/membership → degrade to own (never widen)
    }
    case 'none':
    default:     return sql`false`;
  }
}
```
**Usage in a service (no N+1, scope applied in SQL):**
```ts
// lib/services/crm/deals.ts
import { db } from '@/db';
import { and, eq } from 'drizzle-orm';
import { deals } from '@/db/schema';
import { getAuthContext } from '@/lib/auth/context';
import { requirePermission } from '@/lib/auth/authorize';
import { applyScope } from '@/lib/auth/scope';

export async function listDeals(filters: { stage?: string; limit: number; cursor?: string }) {
  const ctx = await getAuthContext();
  const scope = await requirePermission(ctx, { permission: 'crm.deal.read' }); // throws if denied
  const where = and(
    eq(deals.orgId, ctx!.orgId),
    applyScope(scope, ctx!, { ownerColumn: deals.ownerId, teamColumn: deals.teamId }),
    filters.stage ? eq(deals.stage, filters.stage) : undefined,
  );
  return db.select(/* only needed columns */).from(deals).where(where).limit(filters.limit);
}
```

---

## 11. Route + server-action wrappers — `lib/api/route.ts`
```ts
import { NextRequest, NextResponse } from 'next/server';
import { ZodSchema } from 'zod';
import { getAuthContext } from '@/lib/auth/context';
import { requirePermission, type AuthorizeReq } from '@/lib/auth/authorize';
import { AccessError } from '@/lib/auth/errors';
import type { AuthContext } from '@/lib/auth/types';

interface Handler<TBody> {
  (args: { ctx: AuthContext; body: TBody; params: Record<string, string>; req: NextRequest }): Promise<NextResponse>;
}

export function withAuth<TBody = unknown>(opts: {
  permission?: AuthorizeReq['permission'];
  resourceParam?: { type: string; key: string }; // e.g. { type:'kb_space', key:'spaceId' } → instance check
  body?: ZodSchema<TBody>;
}, handler: Handler<TBody>) {
  return async (req: NextRequest, context: { params: Promise<Record<string, string>> }) => {
    try {
      const ctx = await getAuthContext();
      if (!ctx) throw new AccessError('UNAUTHENTICATED');
      const params = await context.params;

      let body = undefined as TBody;
      if (opts.body && req.method !== 'GET') {
        const json = await req.json().catch(() => ({}));
        const parsed = opts.body.safeParse(json);
        if (!parsed.success) {
          return NextResponse.json({ error: { code: 'VALIDATION', details: parsed.error.flatten() } }, { status: 400 });
        }
        body = parsed.data;
      }

      if (opts.permission) {
        const resource = opts.resourceParam
          ? { type: opts.resourceParam.type, id: params[opts.resourceParam.key] }
          : undefined;
        await requirePermission(ctx, { permission: opts.permission, resource });
      }

      return await handler({ ctx, body, params, req });
    } catch (e) {
      if (e instanceof AccessError) return NextResponse.json(e.toBody(), { status: e.status });
      console.error(e); // replace with repo logger
      return NextResponse.json({ error: { code: 'INTERNAL' } }, { status: 500 });
    }
  };
}
```
**Example route — `app/api/kb/spaces/[spaceSlug]/articles/route.ts`:**
```ts
import { z } from 'zod';
import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/api/route';
import { createArticle } from '@/lib/services/kb/articles';

const Body = z.object({ title: z.string().min(1), spaceId: z.string().uuid(), collectionId: z.string().uuid().nullable() });

export const POST = withAuth(
  { permission: 'kb.article.create', body: Body, resourceParam: { type: 'kb_space', key: 'spaceId' } },
  async ({ ctx, body }) => NextResponse.json(await createArticle(ctx, body), { status: 201 }),
);
```
**Server action pattern:**
```ts
'use server';
import { getAuthContext } from '@/lib/auth/context';
import { requirePermission } from '@/lib/auth/authorize';
import { AccessError } from '@/lib/auth/errors';

export async function publishArticle(articleId: string) {
  const ctx = await getAuthContext();
  try {
    await requirePermission(ctx, { permission: 'kb.article.publish' });
    // ...domain logic...
    return { ok: true as const };
  } catch (e) {
    if (e instanceof AccessError) return { ok: false as const, reason: e.reason, upgrade: e.upgrade };
    throw e;
  }
}
```

**Middleware (`middleware.ts`) — redirect/UX gating ONLY (never the security boundary):**
```ts
// Coarse: is there a session + active org? Send unauthenticated users to /signin,
// and role-home redirects (owner → /owner, employee → /app). Do NOT do permission checks here;
// every handler/action re-verifies via requirePermission. (Per CLAUDE.md.)
```

---

## 12. Client bootstrap — `app/api/me/access/route.ts`
```ts
import { NextResponse } from 'next/server';
import { getAuthContext } from '@/lib/auth/context';
import { resolveUserPermissions } from '@/lib/auth/resolve';
import { orgModule } from '@/lib/auth/entitlements';
import { MODULES, PERMISSIONS, type PermissionKey } from '@/lib/auth/catalog';

export async function GET() {
  const ctx = await getAuthContext();
  if (!ctx) return NextResponse.json({ error: { code: 'UNAUTHENTICATED' } }, { status: 401 });

  const perms = await resolveUserPermissions(ctx);
  const modules = Object.fromEntries(await Promise.all(
    MODULES.filter((m) => m !== 'platform').map(async (m) => [m, await orgModule(ctx.orgId, m)]),
  ));

  // Send only what the UI needs to gate: global permission keys + module/tier state.
  // (Resource-scoped grants are NOT bulk-shipped; per-resource UI checks call useCan with a resource.)
  return NextResponse.json({
    userId: ctx.userId, orgId: ctx.orgId, isOrgOwner: ctx.isOrgOwner,
    permissions: [...perms.global.keys()] as PermissionKey[],
    scopes: Object.fromEntries(perms.global),
    modules, // { crm: { active, tier } | null, ... }
    version: perms.version,
  });
}
```

`lib/api/access.ts` (TanStack Query)
```ts
import { useQuery } from '@tanstack/react-query';

export interface AccessState {
  userId: string; orgId: string; isOrgOwner: boolean;
  permissions: string[]; scopes: Record<string, 'all'|'team'|'own'>;
  modules: Record<string, { active: boolean; tier: string } | null>; version: number;
}
export const accessKeys = { me: ['access', 'me'] as const };

export function useAccess() {
  return useQuery<AccessState>({
    queryKey: accessKeys.me,
    queryFn: async () => {
      const res = await fetch('/api/me/access');
      if (!res.ok) throw new Error('access');
      return res.json();
    },
    staleTime: 5 * 60_000,
  });
}
```
> Invalidate `accessKeys.me` after the current user's role/seat changes (and on org switch). Server is always authoritative; the client copy is for hiding/disabling UI only.

---

## 13. Client components — `components/auth/can.tsx`
```tsx
'use client';
import { ReactNode } from 'react';
import { useAccess } from '@/lib/api/access';

export function useCan(permission: string): boolean {
  const { data } = useAccess();
  return data?.permissions.includes(permission) ?? false;
}

export function Can({ permission, children, fallback = null }: {
  permission: string; children: ReactNode; fallback?: ReactNode;
}) {
  return useCan(permission) ? <>{children}</> : <>{fallback}</>;
}
```
`components/auth/require-module.tsx`
```tsx
'use client';
import { ReactNode } from 'react';
import { useAccess } from '@/lib/api/access';
import { UpgradePrompt } from './upgrade-prompt'; // small component: "Add the X module" / "Upgrade to Pro"

export function RequireModule({ module, minTier, children }: {
  module: string; minTier?: string; children: ReactNode;
}) {
  const { data, isLoading } = useAccess();
  if (isLoading) return null;
  const state = data?.modules[module];
  const TIER_RANK = ['free', 'starter', 'pro', 'enterprise'];
  if (!state?.active) return <UpgradePrompt module={module} reason="NO_MODULE" />;
  if (minTier && TIER_RANK.indexOf(state.tier) < TIER_RANK.indexOf(minTier)) {
    return <UpgradePrompt module={module} reason="PLAN_UPGRADE" requiredTier={minTier} />;
  }
  return <>{children}</>;
}
```
**Usage:** wrap KB feature buttons in `<Can permission="kb.article.publish">`, wrap the whole module page in `<RequireModule module="knowledge_base">`, and disable (not hide) upgrade-gated actions with an `<UpgradePrompt/>` tooltip. **Reminder:** these are UX only; the server enforces.

---

## 14. Dynamic roles admin — `app/(app)/settings/roles`

> The UI that makes roles *dynamic*. Permission to use it: `platform.role.manage`. Surfaces follow `CLAUDE.md` (small form → Dialog, large/multi-section → Sheet; tokens only; full empty/loading/error states).

**Pages:**
- **Roles list** `/settings/roles` — table: name, type (System/Custom), members count, updated. Actions: New role (Dialog: name + description + "clone from" select), Edit (→ editor), Clone, Delete (Dialog confirm; blocked if assigned → offer reassignment). System roles: editable permissions optional, but cannot be deleted and cannot drop their `*` if it's "owner".
- **Role editor** `/settings/roles/[roleId]` — the **permission matrix**: grouped by **module → resource → actions** (checkbox grid), built from the `permissions` table. For `scopable` permissions, a scope selector (All / Team / Own) per row. **Entitlement-aware:** permissions whose module the org lacks, or whose `min_tier` exceeds the org tier, render **locked** with an "Upgrade to grant" hint — you can't grant what the org can't use. Bulk: "select all in module", presets from `ROLE_TEMPLATES`.
- **Assignments** `/settings/roles/[roleId]/members` — assign role to **users** (`user_roles`) and **groups** (`group_roles`, team/department picker). Show effective member list (direct + via group).
- **Resource grants** are managed *in the resource's own UI* (e.g. KB → Space → Manage access Sheet writes `resource_grants` with `resourceType='kb_space'`), not here.

**Mutation contract (every write bumps the version in-transaction):**
```ts
// lib/services/access/roles.ts
import { db } from '@/db';
import { roles, rolePermissions } from '@/db/schema';
import { bumpPermissionsVersion } from '@/lib/auth/invalidate';
import { eq, and } from 'drizzle-orm';

export async function setRolePermissions(
  ctx: AuthContext, roleId: string, items: { key: string; scope?: 'all'|'team'|'own' }[],
) {
  // server-side: requirePermission(ctx, { permission: 'platform.role.manage' }) BEFORE this
  // validate keys ⊆ catalog; reject keys for modules the org lacks / above tier
  await db.transaction(async (tx) => {
    const role = (await tx.select().from(roles).where(and(eq(roles.id, roleId), eq(roles.orgId, ctx.orgId))).limit(1))[0];
    if (!role) throw new AccessError('NOT_FOUND');
    if (role.isSystem && role.key === 'owner') { /* guard: must keep '*' */ }
    await tx.delete(rolePermissions).where(eq(rolePermissions.roleId, roleId));
    if (items.length) {
      await tx.insert(rolePermissions).values(items.map((i) => ({
        orgId: ctx.orgId, roleId, permissionKey: i.key, scope: i.scope ?? 'all',
      })));
    }
    await bumpPermissionsVersion(tx, ctx.orgId); // ← critical
  });
}
```
**Guardrails (enforce server-side):**
- Can't delete a role with members → require reassignment first (or cascade with explicit confirm).
- Can't remove the last user holding `owner`/`platform.role.manage` (org lockout protection).
- Can't grant a permission for a module the org doesn't have or above its tier.
- System role keys are immutable; "owner" must retain `*`.

---

## 15. Seeding & sync — `db/seed/access.seed.ts`
```ts
import { db } from '@/db';
import { permissions, roles, rolePermissions } from '@/db/schema';
import { PERMISSIONS, ROLE_TEMPLATES } from '@/lib/auth/catalog';
import { sql } from 'drizzle-orm';

// 1) Sync code catalog → permissions table (idempotent; run on every deploy/migration).
export async function syncPermissionCatalog() {
  const rows = Object.entries(PERMISSIONS).map(([key, d]) => ({
    key, module: d.module, resource: d.resource, action: d.action, label: d.label,
    description: d.description ?? null, scopable: d.scopable ?? false,
    requiresSeat: d.requiresSeat ?? true, minTier: d.minTier ?? null, isDangerous: d.dangerous ?? false,
  }));
  await db.insert(permissions).values(rows).onConflictDoUpdate({
    target: permissions.key,
    set: { module: sql`excluded.module`, resource: sql`excluded.resource`, action: sql`excluded.action`,
           label: sql`excluded.label`, description: sql`excluded.description`, scopable: sql`excluded.scopable`,
           requiresSeat: sql`excluded.requires_seat`, minTier: sql`excluded.min_tier`, isDangerous: sql`excluded.is_dangerous` },
  });
  // Optional: delete permissions table rows no longer in the catalog (after confirming no FKs reference them).
}

// 2) Seed system roles for a NEW org (call from org-creation flow).
export async function seedOrgRoles(orgId: string, createdBy: string) {
  await db.transaction(async (tx) => {
    for (const tpl of ROLE_TEMPLATES) {
      const [role] = await tx.insert(roles).values({
        orgId, key: tpl.key, name: tpl.name, description: tpl.description,
        isSystem: true, isDefault: tpl.isDefault ?? false, createdBy,
      }).returning();
      if (tpl.permissions.length) {
        await tx.insert(rolePermissions).values(tpl.permissions.map((perm) => ({
          orgId, roleId: role.id, permissionKey: perm.key, scope: perm.scope ?? 'all',
        })));
      }
    }
    // version row starts at 1 via default
  });
}
```
> `rolePermissions.permissionKey` for wildcard templates stores the **pattern** (`'crm.*'`, `'*'`); patterns are expanded at resolution (§8). To keep the FK valid for patterns, either (a) allow patterns to bypass the FK by storing them in a separate `role_permission_patterns` table, or (b) seed pattern sentinels into `permissions`. **Recommended:** a tiny companion table `role_permission_patterns(role_id, pattern, scope)` for wildcards; concrete keys go in `role_permissions` with the FK. The resolver reads both. (Cleanest: keeps referential integrity for explicit grants while supporting wildcards.)

---

## 16. Testing — make it provably correct (`__tests__/auth/`)

**A) Matrix test (the core guarantee).** Table-driven: given an org/user/role/entitlement/resource setup → expected result.
```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { authorize } from '@/lib/auth/authorize';

const cases: Array<{
  name: string; setup: () => Promise<{ ctx: any; req: any }>; expect: { allow: boolean; reason?: string; scope?: string };
}> = [
  { name: 'no module → NO_MODULE', /* org without KB module */ expect: { allow: false, reason: 'NO_MODULE' } },
  { name: 'module ok, no seat → SEAT_REQUIRED', expect: { allow: false, reason: 'SEAT_REQUIRED' } },
  { name: 'seat + viewer role → read allow scope all', expect: { allow: true, scope: 'all' } },
  { name: 'author role lacks publish → FORBIDDEN', expect: { allow: false, reason: 'FORBIDDEN' } },
  { name: 'editor via resource_grant on Space X → publish allow', /* req.resource = space X */ expect: { allow: true } },
  { name: 'editor grant on Space X → publish DENY on Space Y', expect: { allow: false, reason: 'FORBIDDEN' } },
  { name: 'crm.deal.read scope=team → returns team scope', expect: { allow: true, scope: 'team' } },
  { name: 'min_tier pro on starter → PLAN_UPGRADE', expect: { allow: false, reason: 'PLAN_UPGRADE' } },
  { name: 'owner role (*) → allow everything', expect: { allow: true } },
];

describe('authorize matrix', () => {
  for (const c of cases) it(c.name, async () => {
    const { ctx, req } = await c.setup();
    const r = await authorize(ctx, req);
    expect(r.allow).toBe(c.expect.allow);
    if (c.expect.reason) expect(r.reason).toBe(c.expect.reason);
    if (c.expect.scope) expect(r.scope).toBe(c.expect.scope);
  });
});
```
**B) Unit tests:** `expandPermission` (wildcards), `applyScope` (own/team/all/none SQL), `broadest` scope merge, parent-role cycle cap, serialize/deserialize round-trip.
**C) Invalidation test:** resolve → grant a role in a tx that bumps version → resolve again → new permission present (no stale).
**D) Leak test:** denied resource read returns 404-mapped (`NOT_FOUND`) when appropriate, not 403, for resource-not-visible cases.

---

## 17. Operational rules (the discipline that keeps it bug-free)

1. **Every** protected handler/action goes through `requirePermission` / `withAuth`. No ad-hoc `if (user.role === ...)` anywhere. Add a lint rule / code-review checklist.
2. **Every** write to roles/role_permissions/user_roles/group_roles/resource_grants → `bumpPermissionsVersion` **in the same transaction**. Every write to org_modules/user_seats/org_limits → `bumpEntitlementsVersion`.
3. **List queries** filter by `accessibleResourceIds` (resource-scoped modules) and/or `applyScope` (own/team/all). Never return rows then filter in JS.
4. **New feature** = add to `PERMISSIONS` (+ limits/tier rows if needed) → run `syncPermissionCatalog` → done. Never edit the engine.
5. **New module** = add to `MODULES`, add an `org_modules` row provisioning path, seed module system roles. Engine unchanged.
6. **Denials carry a reason**; UI maps `NO_MODULE`/`PLAN_UPGRADE`/`LIMIT_REACHED` → upsell, `SEAT_REQUIRED` → request-a-seat, `FORBIDDEN` → quiet hide/disable, `NOT_FOUND` → 404.
7. **Audit** every `dangerous` allow and every deny on dangerous perms (`audit.ts` → existing audit log).
8. **Cache keys include the version**; never delete keys manually for correctness — bump the version. TTL is only GC.

---

## 18. Reconciliation with the KB PRD
- The KB PRD's `kb_space_permissions` is **replaced** by generic `resource_grants` with `resourceType='kb_space'`. The KB "Manage access" Sheet writes `resource_grants` (+ `bumpPermissionsVersion`). The KB `accessibleSpaceIds(user)` = `accessibleResourceIds(ctx, 'kb.article.read', 'kb_space')`.
- KB's three gates (module/seat/permission) are exactly Layers 1–3 here. The KB `requireModule`/`requireSeat`/`requirePermission` are the functions in this doc.
- KB system roles (`kb_admin/editor/author/viewer`) are the seeded `ROLE_TEMPLATES` here, used as the `roleId` in KB space `resource_grants`.

---

## 19. Open choices (defaults picked; confirm/override)
1. **Cache invalidation granularity:** default **org-wide version bump** on any access change (always correct; simplest). If you have orgs with 5k+ members and very frequent role edits, switch to **per-user version** (`access_versions` gains a `user_versions jsonb` or a `user_access_versions` table). *(Default chosen.)*
2. **Wildcard storage:** default **companion `role_permission_patterns` table** for `*`/`module.*` so explicit grants keep a real FK. Alternative: store patterns inline and drop the FK. *(Companion table recommended.)*
3. **Explicit deny rules:** **not included** (grant-only) to stay bug-resistant. Add later only if a concrete "allow-all-except" need appears that composition can't express. *(Excluded by default.)*
4. **Role inheritance (`parentRoleId`):** included but optional; depth-capped + cycle-guarded. If you don't want it, drop the column and `expandRoleAncestors`. *(Included.)*
5. **Seat exemption for admins:** handled via `requiresSeat:false` on settings/manage permissions (not via role special-casing). Confirm this matches billing intent (i.e., configuring a module shouldn't consume a content seat). *(Default chosen.)*
