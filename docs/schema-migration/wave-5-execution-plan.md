---
wave: 5
type: execution plan
status: DRAFT
date: 2026-07-26
author: platform-arch
references:
  - docs/schema-change-plan.md §5 (RBAC hierarchy, scopes, auth pipeline)
  - docs/schema-change-plan.md §9 Wave 5 (RBAC correctness releases)
  - backend/src/db/schema/access.ts
  - backend/src/db/schema/auth.ts (organization_members, user_delegations)
  - backend/src/modules/access/access.service.ts
  - backend/src/modules/access/apply-scope.ts
  - backend/src/modules/module-access/module-access.controller.ts
  - backend/src/modules/rbac/permissions.constants.ts
---

# Wave 5 — RBAC Correctness: Execution Plan

## Overview

Wave 5 migrates the authorization layer from global-user-ID-keyed role storage to
membership-ID-keyed role storage, removes every legacy role fallback from the hot
permission-resolution path, introduces an explicit DENY model, de-polymorphizes the
`resource_grants` table, locks `team` scope at write time rather than silently
degrading at read time, adds server-filtered discovery endpoints, and closes the
`ModuleAccessController` authorization gap.

**Prerequisite gates (from Wave 0–4).**
Do not advance any step in this wave until:
- Wave 0: composite-FK matrix approved; `organization_members.UNIQUE(org_id, id)` candidate
  key confirmed present (`uniq_org_members_org_id` — verified in schema).
- Wave 1: `organizations.owner_membership_id NOT NULL` and deferred FK live (transfer path
  correct); `organization_members.status` lifecycle enforced.
- Wave 4: tenant-composite FK hardening at the DB layer is underway; `user_roles` backfill
  from membership ID is safe to run.

**In-progress constraint (do not conflict).**
`AccessService.computeUserPermissions` is actively being wired for delegation via
`isActiveDelegation` / `userDelegations`. Steps below treat delegation as already wired
and build gating/validation on top — never re-implement the delegation read path.

---

## Step index

| # | Item | Risk |
|---|------|------|
| 5-A | Active-membership gate + expiry + revocation versions | Low |
| 5-B | `membership_role_assignments` table — expand | Medium |
| 5-C | Dual-write: `user_roles` + `membership_role_assignments` | Medium |
| 5-D | Backfill `user_roles` → `membership_role_assignments` | Medium |
| 5-E | Shadow-compare role resolution paths | Medium |
| 5-F | Switch reads to `membership_role_assignments` | Medium |
| 5-G | Retire `users.role` fallback in `computeUserPermissions` | High |
| 5-H | Retire `organizationMembers.role` routing in service layer | High |
| 5-I | Explicit DENY model — expand + precedence | Medium |
| 5-J | De-polymorphize `resource_grants` | Medium |
| 5-K | `team` scope: fail-at-write validation | Low |
| 5-L | Immutable system roles + Module Admin RBAC screen guard | Low |
| 5-M | Server-filtered discovery endpoints + PermissionKey codegen | Low |
| 5-N | Add `PermissionGuard` + `@RequirePermission` to `ModuleAccessController` | Low |

---

## 5-A — Active-membership gate + expiry + revocation versions

### Current state (verified)

`computeUserPermissions` already calls `evaluateMembershipGate` which checks
`member.status === "ACTIVE"`. `resolveUserPermissions` is keyed by `(orgId, userId,
permissionsVersion)`. However:

- `userRoles.expiresAt` is never checked during permission resolution — an expired role
  assignment continues to grant permissions.
- The `accessVersions.permissionsVersion` bump does not fire on membership
  suspend/leave transitions (only on role/grant mutations).

### Changes

**Migration sketch (`wave-5a-membership-expiry.sql`).**
None required — columns exist. This is a pure backend code fix.

**Backend changes.**

1. In `access.service.ts` `computeUserPermissions`, filter `userRoles` by expiry:
   ```ts
   // Add to the userRoles select WHERE clause:
   and(
     eq(userRoles.orgId, orgId),
     eq(userRoles.userId, userId),
     or(isNull(userRoles.expiresAt), gt(userRoles.expiresAt, new Date())),
   )
   ```

2. In `organization.service.ts` (or wherever suspend/leave transitions are written), call
   `bumpPermissionsVersion(tx, orgId)` inside the same transaction that changes
   `organization_members.status`.

3. Extend `CACHE_KEYS.accessPerms` to incorporate the membership epoch (or rely on the
   existing `permissionsVersion` bump from step 2 above — the version bump already
   invalidates the entire org's cached permissions, which is sufficient).

### Gate

- Unit test: an expired `userRoles` row grants no permissions.
- Unit test: suspending a member bumps the version and the next resolution returns `{}`.
- Smoke: confirm `resolveUserPermissions` returns empty map for a suspended ACTIVE-suspended member.

### Rollback

Code-only change. Revert the expiry filter and the version-bump call. No schema rollback needed.

---

## 5-B — Expand: `membership_role_assignments` table

### Current state (verified)

`user_roles` references `users.id` (`text`) not `organization_members.id` (`serial`).
`organization_members` already has `UNIQUE (org_id, id)` (`uniq_org_members_org_id`).
No `membership_role_assignments` table exists yet.

### Migration sketch

```sql
-- wave-5b-membership-role-assignments.sql
-- Additive only; existing user_roles untouched.

CREATE TABLE membership_role_assignments (
  id          SERIAL PRIMARY KEY,
  org_id      TEXT    NOT NULL,
  membership_id INTEGER NOT NULL,
  role_id     INTEGER NOT NULL,
  assigned_by_membership_id INTEGER,
  expires_at  TIMESTAMPTZ,
  reason      TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT fk_mra_org_membership
    FOREIGN KEY (org_id, membership_id)
    REFERENCES organization_members (org_id, id)
    ON DELETE CASCADE
    DEFERRABLE INITIALLY DEFERRED,

  CONSTRAINT fk_mra_role
    FOREIGN KEY (role_id)
    REFERENCES roles (id)
    ON DELETE CASCADE,

  CONSTRAINT fk_mra_assigner
    FOREIGN KEY (org_id, assigned_by_membership_id)
    REFERENCES organization_members (org_id, id)
    ON DELETE SET NULL
    DEFERRABLE INITIALLY DEFERRED
);

CREATE UNIQUE INDEX uniq_mra_org_membership_role
  ON membership_role_assignments (org_id, membership_id, role_id);

CREATE INDEX idx_mra_org_membership
  ON membership_role_assignments (org_id, membership_id);

CREATE INDEX idx_mra_org_role
  ON membership_role_assignments (org_id, role_id);

CREATE INDEX idx_mra_expires
  ON membership_role_assignments (org_id, expires_at)
  WHERE expires_at IS NOT NULL;
```

**Drizzle schema (`backend/src/db/schema/access.ts` addition).**

```ts
import { organizationMembers, roles } from "./auth";

export const membershipRoleAssignments = pgTable(
  "membership_role_assignments",
  {
    id: serial("id").primaryKey(),
    orgId: text("org_id").notNull(),
    membershipId: integer("membership_id").notNull(),
    roleId: integer("role_id").references(() => roles.id, { onDelete: "cascade" }).notNull(),
    assignedByMembershipId: integer("assigned_by_membership_id"),
    expiresAt: timestamp("expires_at"),
    reason: text("reason"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("uniq_mra_org_membership_role").on(t.orgId, t.membershipId, t.roleId),
    index("idx_mra_org_membership").on(t.orgId, t.membershipId),
    index("idx_mra_org_role").on(t.orgId, t.roleId),
  ],
);
```

Note: composite FK to `organization_members(org_id, id)` is declared in raw SQL (Drizzle
does not yet emit composite FK syntax natively); the migration SQL above is the authority.

### Gate

- Migration applies from the reconciled baseline without error.
- Previous app version still starts (the table is additive; nothing reads it yet).
- `membership_role_assignments` is empty. `user_roles` unchanged.

### Rollback

`DROP TABLE IF EXISTS membership_role_assignments;` — safe, no data yet.

---

## 5-C — Dual-write: new assignments go to both tables

### Current state

All role-assignment writes target `user_roles` (in `rbac.service.ts` or equivalent). No
writes yet touch `membership_role_assignments`.

### Backend changes

In `RbacService.assignRole` (or equivalent), after writing to `user_roles`, resolve the
`organization_members.id` for `(orgId, userId)` and insert the same assignment into
`membership_role_assignments`, all inside the same transaction. Also resolve the assigning
user's membership ID for `assignedByMembershipId`.

```ts
// Pseudocode inside the same db.transaction(tx => { ... }):
const [memberRow] = await tx
  .select({ membershipId: organizationMembers.id })
  .from(organizationMembers)
  .where(and(eq(organizationMembers.orgId, orgId), eq(organizationMembers.userId, targetUserId)));

if (!memberRow) throw new NotFoundException("Target is not a member of this organization");

const [actorRow] = await tx
  .select({ membershipId: organizationMembers.id })
  .from(organizationMembers)
  .where(and(eq(organizationMembers.orgId, orgId), eq(organizationMembers.userId, actorUserId)));

await tx.insert(membershipRoleAssignments).values({
  orgId,
  membershipId: memberRow.membershipId,
  roleId,
  assignedByMembershipId: actorRow?.membershipId ?? null,
  expiresAt,
  reason,
}).onConflictDoNothing();

// Also write user_roles as before (legacy dual-write).
await tx.insert(userRoles).values({ orgId, userId: targetUserId, roleId, assignedBy: actorUserId, expiresAt, reason })
  .onConflictDoNothing();

await bumpPermissionsVersion(tx, orgId);
```

Similarly, `removeRole` and `updateRoleExpiry` must mirror to both tables in the same
transaction. If `organization_members` row is missing, the dual-write can skip the
`membership_role_assignments` insert (log a warning) — this is a tolerated inconsistency
during the dual-write period only, resolved by the backfill in 5-D.

### Gate

- A new role assignment creates a row in both `user_roles` and
  `membership_role_assignments`.
- A role removal removes from both tables.
- Legacy app version (reading only `user_roles`) still works.

### Rollback

Remove the `membership_role_assignments` insert/delete side of dual-write. The `user_roles`
path is unaffected.

---

## 5-D — Backfill: `user_roles` → `membership_role_assignments`

### When to run

After 5-C is deployed and stable. Run as a background worker, not in a request thread.

### Backfill query

```sql
-- wave-5d-backfill-mra.sql
-- Idempotent: ON CONFLICT DO NOTHING.

INSERT INTO membership_role_assignments
  (org_id, membership_id, role_id, assigned_by_membership_id, expires_at, reason, created_at)
SELECT
  ur.org_id,
  om.id              AS membership_id,
  ur.role_id,
  om_assigner.id     AS assigned_by_membership_id,
  ur.expires_at,
  ur.reason,
  ur.created_at
FROM user_roles ur
INNER JOIN organization_members om
  ON om.org_id = ur.org_id AND om.user_id = ur.user_id
LEFT JOIN organization_members om_assigner
  ON om_assigner.org_id = ur.org_id AND om_assigner.user_id = ur.assigned_by
ON CONFLICT (org_id, membership_id, role_id) DO NOTHING;
```

Run in batches (1 000 rows at a time, one `org_id` per transaction pass) to avoid
long-running transactions. Record the last processed `user_roles.id` as a checkpoint.

**Quarantine rows** where `om.id IS NULL` (a `user_roles` row for a user who has no
`organization_members` row for that org — orphan data, likely from a hard-delete or
pre-migration inconsistency). Write these to a `_quarantine_user_roles_no_membership`
table for operator review.

**Checksum reconciliation.** After backfill:

```sql
-- Count rows that should have matched:
SELECT COUNT(*) FROM user_roles ur
INNER JOIN organization_members om
  ON om.org_id = ur.org_id AND om.user_id = ur.user_id;

-- Compare to:
SELECT COUNT(*) FROM membership_role_assignments;
-- Difference = quarantined orphans (acceptable) + in-flight dual-writes.
```

### Gate

- All eligible `user_roles` rows have a matching `membership_role_assignments` row.
- Quarantine table reviewed; zero unexplained orphans.
- Backfill is re-runnable (idempotent) and produces zero new inserts on second run.
- Telemetry counter: `mra_backfill_rows_inserted`, `mra_backfill_orphans`.

### Rollback

Delete all `membership_role_assignments` rows inserted by the backfill (identifiable by
`created_at` range during the run window, or by checking against `user_roles`). Dual-write
continues populating only new rows, so legacy reads are unaffected.

---

## 5-E — Shadow-compare role resolution paths

Before switching reads, run both resolution paths in parallel and log mismatches.

### Implementation

In `computeUserPermissions`, after computing `result` via the legacy `userRoles` path, add
a non-blocking shadow call that resolves via `membershipRoleAssignments` (same algorithm,
different join), then compare. Emit a structured log event on mismatch:

```ts
const shadow = await this.computeViaNewPath(orgId, userId);
const legacy = result; // already computed above
const mismatches = detectMismatch(legacy, shadow);
if (mismatches.length > 0) {
  logger.warn("wave5-shadow-mismatch", { orgId, userId, mismatches });
  metrics.increment("rbac.shadow_mismatch");
}
```

Run for at least **7 consecutive days including a peak traffic day** with zero unexplained
mismatches before proceeding to 5-F.

### Gate

- `rbac.shadow_mismatch` counter = 0 for 7 consecutive days.
- Any mismatch investigated and resolved before cutover.

### Rollback

Remove shadow call. No schema change.

---

## 5-F — Switch reads: `computeUserPermissions` uses `membership_role_assignments`

### When to run

After 5-E shadow gate passes.

### Backend changes

In `computeUserPermissions`, replace the `userRoles` join with a join on
`membership_role_assignments` using the current user's `organization_members.id`:

```ts
const memberRow = await this.db.query.organizationMembers.findFirst({
  where: and(eq(organizationMembers.userId, userId), eq(organizationMembers.orgId, orgId)),
  columns: { id: true, isOwner: true, status: true },
});
// ... gate check ...

const assignmentRows = await this.db
  .select({ roleId: membershipRoleAssignments.roleId })
  .from(membershipRoleAssignments)
  .where(
    and(
      eq(membershipRoleAssignments.orgId, orgId),
      eq(membershipRoleAssignments.membershipId, memberRow.id),
      or(isNull(membershipRoleAssignments.expiresAt), gt(membershipRoleAssignments.expiresAt, new Date())),
    ),
  );
```

Keep `userRoles` dual-write live until 5-G (legacy fallback retirement).

Keep `userPermissions` (direct user permission grants) reads — those are separate from
role assignments and migrate in a future slice.

### Gate

- All guarded endpoints pass smoke tests.
- p95 latency for `GET /me/access` does not regress by more than 10%.
- Error rate within baseline.
- Legacy `user_roles` table still populated (dual-write active); no data loss.

### Rollback

Revert `computeUserPermissions` to the `userRoles` join. Dual-write continues. No schema change.

---

## 5-G — Retire `users.role` fallback in `computeUserPermissions`

### Current state (verified)

Lines 359–428 of `access.service.ts` include a `legacyRoleSlug` fallback: when a user has
no direct role assignments in `userRoles` (now `membershipRoleAssignments` after 5-F), the
code reads `users.role`, resolves a role row with that slug, and if that fails, reads
`ROLE_DEFAULT_PERMISSIONS[slug]` directly. This is a multi-tenant authorization bypass —
`users.role` is a global column not scoped to an org.

### When to remove

After 5-F has been live for at least two releases **and** telemetry shows `legacyRoleSlug`
path fires zero times for two consecutive releases. Instrument this first:

```ts
if (legacyRoleSlug) {
  metrics.increment("rbac.legacy_user_role_fallback_hit", { orgId });
  logger.warn("wave5-legacy-role-fallback", { orgId, userId, legacyRoleSlug });
  // ... existing code for now ...
}
```

### Backend changes (removal)

Delete the following block entirely from `computeUserPermissions`:

```ts
let legacyRoleSlug: string | null = null;
if (!hasDirectRoles) {
  const user = await this.db.query.users.findFirst({ ... });
  const slug = user?.role;
  if (slug) { ... }
}
// ... and the final if (legacyRoleSlug) { ... } block
```

Any user who previously relied on `users.role` for RBAC must have had their role
backfilled into `membership_role_assignments` by 5-D. The backfill script
(`wave-5d-backfill-mra.sql`) must be re-run and verified at zero-mismatch before this
removal lands.

### Gate

- `rbac.legacy_user_role_fallback_hit` counter = 0 for two consecutive releases.
- Backfill re-run confirms zero new insertions (all users already have `membership_role_assignments` rows).
- Privilege-escalation test: a user whose `users.role = "ADMIN"` but has no explicit RBAC
  assignment gets 403 on a guarded endpoint.
- Cross-tenant test: user in Org A cannot access Org B's data regardless of `users.role`.

### Rollback

Revert the deletion. Because the backfill is idempotent, re-running it restores any missing
rows if they somehow vanished.

This is the **riskiest retirement** in Wave 5. See the Risk section at the bottom.

---

## 5-H — Retire `organizationMembers.role` raw-role routing in service layer

### Current state (verified)

Multiple services bypass RBAC by querying `organizationMembers.role` directly to find
"HR" or "FINANCE" users for workflow routing, notification fan-out, and approvals. Files
confirmed:

- `cron-recruitment.service.ts:231` — `role = "HR"`
- `hr-workflow-instances.service.ts:215,217` — `role = "HR"`, `role = "FINANCE"`
- `hr-workflow-engine.service.ts:259,267,278` — `role = "HR"`, `role = "FINANCE"`
- `expenses-write.service.ts:368` — `role = "HR"`
- `clients/client-accounts.service.ts:210` — `role = "HR"`
- `hr-helpdesk.service.ts:322` — `role = "HR"`
- `leaves-write.service.ts:744` — `role = "HR"`
- `exit-write.service.ts:349` — `inArray(role, HR_NOTIFY_ROLES)`
- `onboarding.service.ts:811` — `inArray(role, HR_NOTIFY_ROLES)`
- `hr-time/leaves-page.service.ts:129` — `inArray(role, targetRoles)`

Note: `api-tokens` was already fixed (commit c14ea9a).

### Replacement approach

Replace raw-role lookups with permission-based membership resolution. For each call site,
the correct replacement is to query members who have the relevant RBAC permission rather
than the legacy role string.

**Pattern (per call site).**
```ts
// BEFORE:
const hrMembers = await db
  .select({ userId: organizationMembers.userId })
  .from(organizationMembers)
  .where(and(eq(organizationMembers.orgId, orgId), eq(organizationMembers.role, "HR")));

// AFTER: query userRoles (or membershipRoleAssignments after 5-F) joined to
// role_permission_grants for the specific permission that qualifies a user as an "HR approver".
// The canonical permission is hr:leaves:approve (or hr:employees:manage for general HR).
const hrRoleIds = await db
  .select({ roleId: rolePermissionGrants.roleId })
  .from(rolePermissionGrants)
  .where(
    and(
      eq(rolePermissionGrants.orgId, orgId),
      eq(rolePermissionGrants.permissionKey, "hr:leaves:approve"),
    )
  );

const hrMembers = await db
  .select({ userId: membershipRoleAssignments.orgId }) // join to org_members
  .from(membershipRoleAssignments)
  .innerJoin(organizationMembers, ...)
  .where(
    and(
      eq(membershipRoleAssignments.orgId, orgId),
      inArray(membershipRoleAssignments.roleId, hrRoleIds.map(r => r.roleId)),
      or(isNull(membershipRoleAssignments.expiresAt), gt(membershipRoleAssignments.expiresAt, new Date())),
    )
  );
```

**Permission-to-legacy-role mapping for workflow routing.**

| Legacy `organizationMembers.role` | Replacement permission key |
|-----------------------------------|---------------------------|
| `"HR"` (approvals / notifications) | `hr:leaves:approve` |
| `"HR"` (employee management) | `hr:employees:manage` |
| `"FINANCE"` (expense approvals) | `hr:payroll:approve` |
| `"HR"` (recruitment) | `hr:recruitment:manage` |

Each call site must be mapped individually — do not assume a single permission covers all
"HR" uses.

### Sequencing

This can proceed in parallel with 5-G. Sequence each file as its own commit to keep diffs
reviewable. Retire `organizationMembers.role` column as a routing concern only after all
call sites are updated and two releases have passed with zero references to the column in
hot paths. The column itself may remain as a display field longer (see Wave 9).

### Gate

- Grep for `organizationMembers.role` in services returns zero authorization/routing uses.
- Notification fan-out tests: suspending a member's HR role stops them receiving HR
  approval notifications.
- No regression in leave approval / expense approval / workflow routing flows.

### Rollback

Revert each service file individually. No schema change.

---

## 5-I — Explicit DENY model

### Current state (verified)

No deny rows exist. `resolveUserPermissions` has a `getUserDeniedModules` call which
removes all permissions for denied modules, but there is no per-permission or per-resource
deny concept.

### Design

Introduce an `access_denies` table supporting three deny granularities:

```sql
-- wave-5i-access-denies.sql

CREATE TYPE deny_scope_type AS ENUM ('org', 'module', 'permission');

CREATE TABLE access_denies (
  id            SERIAL PRIMARY KEY,
  org_id        TEXT NOT NULL,
  deny_scope    deny_scope_type NOT NULL,
  -- 'org' level: all permissions for this membership; target_key = NULL
  -- 'module' level: all permissions in a module; target_key = module name
  -- 'permission' level: one specific permission; target_key = permission key
  target_key    TEXT,
  membership_id INTEGER NOT NULL,
  reason        TEXT,
  issued_by_membership_id INTEGER,
  expires_at    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at    TIMESTAMPTZ,

  CONSTRAINT fk_deny_org_membership
    FOREIGN KEY (org_id, membership_id)
    REFERENCES organization_members (org_id, id)
    ON DELETE CASCADE
    DEFERRABLE INITIALLY DEFERRED,

  CONSTRAINT fk_deny_issuer
    FOREIGN KEY (org_id, issued_by_membership_id)
    REFERENCES organization_members (org_id, id)
    ON DELETE SET NULL
    DEFERRABLE INITIALLY DEFERRED
);

CREATE UNIQUE INDEX uniq_access_denies_active
  ON access_denies (org_id, membership_id, deny_scope, COALESCE(target_key, ''))
  WHERE revoked_at IS NULL;

CREATE INDEX idx_access_denies_org_membership
  ON access_denies (org_id, membership_id)
  WHERE revoked_at IS NULL;
```

**Drizzle schema addition (`access.ts`).**

```ts
export const denyScope = pgEnum("deny_scope_type", ["org", "module", "permission"]);

export const accessDenies = pgTable("access_denies", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").notNull(),
  denyScope: denyScope("deny_scope").notNull(),
  targetKey: text("target_key"),
  membershipId: integer("membership_id").notNull(),
  reason: text("reason"),
  issuedByMembershipId: integer("issued_by_membership_id"),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  revokedAt: timestamp("revoked_at"),
}, (t) => [
  index("idx_access_denies_org_membership").on(t.orgId, t.membershipId),
]);
```

**Precedence rule (deterministic, no exceptions for tenant principals).**
An applicable deny wins over every ordinary allow: role grant, group role, delegation,
or typed resource grant. The evaluation order in `resolveUserPermissions`:

1. Compute merged allow map (existing logic).
2. Load active, non-expired, non-revoked `access_denies` for `(orgId, membershipId)`.
3. For each deny row:
   - `deny_scope = 'org'`: delete all keys from the result map.
   - `deny_scope = 'module'`: delete all keys whose module prefix matches `target_key`.
   - `deny_scope = 'permission'`: delete the exact `target_key`.
4. Return the pruned map.

The existing `getUserDeniedModules` module-level deny (via `userModuleAccess`) is a
per-module disable, not an explicit deny on a principal — it remains separate and
continues to apply after the new deny evaluation.

**Emergency recovery** is a time-bounded, audited control-plane operation (issued by a
Platform Admin) that produces a temporary org-level deny override for recovery access
only. It does not add a bypass flag to the tenant permission pipeline.

### Gate

- A `deny_scope = 'permission'` row blocks the named permission even when a role grants it.
- A `deny_scope = 'module'` row blocks all permissions in that module.
- An expired deny row has no effect.
- A revoked deny row has no effect.
- `bumpPermissionsVersion` is called when a deny is issued or revoked.

### Rollback

No rows in `access_denies` yet (table is additive). `DROP TABLE access_denies;` if needed.
Remove the deny-evaluation block from `computeUserPermissions`.

---

## 5-J — De-polymorphize `resource_grants`

### Current state (verified)

`resource_grants` (`backend/src/db/schema/access.ts` lines 133–160) uses varchar
`resource_type` and `resource_id` columns — polymorphic design that cannot enforce FK
integrity or tenant-composite constraints. No typed per-resource tables exist yet.

There is no `resource-grants` backend module (glob returned empty). The `resource_grants`
table is present in the schema but the application code consuming it is unknown from a
quick read — a full audit is required before migration.

### Expand phase

1. Audit every read/write of `resource_grants` in the codebase.
2. For each distinct `resource_type` value found in production data, create a typed table.

**Canonical first target: PM project grants.**

```sql
-- wave-5j-project-access-grants.sql
-- Typed replacement for resource_grants WHERE resource_type = 'project'

CREATE TABLE project_access_grants (
  id            SERIAL PRIMARY KEY,
  org_id        TEXT NOT NULL,
  project_id    INTEGER NOT NULL,
  membership_id INTEGER NOT NULL,
  permission_key TEXT NOT NULL,
  granted_by_membership_id INTEGER,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT fk_pag_project
    FOREIGN KEY (org_id, project_id)
    REFERENCES projects (org_id, id)
    ON DELETE CASCADE
    DEFERRABLE INITIALLY DEFERRED,

  CONSTRAINT fk_pag_membership
    FOREIGN KEY (org_id, membership_id)
    REFERENCES organization_members (org_id, id)
    ON DELETE CASCADE
    DEFERRABLE INITIALLY DEFERRED
);

CREATE UNIQUE INDEX uniq_pag_org_project_member_key
  ON project_access_grants (org_id, project_id, membership_id, permission_key);

CREATE INDEX idx_pag_org_project
  ON project_access_grants (org_id, project_id);

CREATE INDEX idx_pag_org_membership
  ON project_access_grants (org_id, membership_id);
```

For each additional `resource_type`, create a similarly typed table following the same
pattern (composite FKs to parent resource + membership, named uniqueness constraint,
leading org_id index).

### Dual-write and backfill

After typed tables exist, dual-write new grants to both `resource_grants` and the typed
table. Backfill existing rows from `resource_grants` into typed tables (idempotent,
`ON CONFLICT DO NOTHING`). Shadow-compare reads for 7 days. Switch reads. Retire writes
to `resource_grants` for migrated resource types.

### Gate

- No cross-tenant row can be inserted into a typed grant table (FK enforcement).
- `resource_grants` reads for migrated resource types return zero rows (all migrated).
- `resource_grants` table may remain for unmigrated types; it is not dropped in Wave 5.

### Rollback

Typed tables are additive. Remove dual-write code. No `resource_grants` data is deleted
until Wave 9 contract-and-retirement.

---

## 5-K — `team` scope: fail-at-write validation

### Current state (verified)

`apply-scope.ts` line 22–25: when `scope === "team"` and no `teamColumn`/`teamIds` are
provided, it returns `sql\`false\`` (fail closed). This was updated from the previous silent
`own` degradation. However, the problem is earlier: `team` can still be *assigned* in
`role_permission_grants.scope` even when no domain has a real team adapter. The fail-closed
read-time behavior is correct; the write-time gate is missing.

### Backend changes

In `RbacService` (or wherever `rolePermissionGrants` upserts happen), add a validator:

```ts
const TEAM_ENABLED_DOMAINS: ReadonlySet<string> = new Set([
  // Empty initially. Add 'hr' once HrTeamAdapter is implemented.
  // Add 'projects' once PmDeliveryTeamAdapter is implemented.
]);

function assertScopeSupported(permissionKey: string, scope: DataScope): void {
  if (scope !== "team") return;
  const module = moduleOf(permissionKey);
  if (!TEAM_ENABLED_DOMAINS.has(module)) {
    throw new BadRequestException(
      `team scope is not yet available for module "${module}". ` +
      `Use "own" or "all" until a team adapter is implemented for this domain.`
    );
  }
}
```

Call `assertScopeSupported(permissionKey, scope)` before every `rolePermissionGrants`
insert or upsert.

Also add a startup validation that reads existing `role_permission_grants` rows with
`scope = 'team'` and logs a warning for each whose module is not in `TEAM_ENABLED_DOMAINS`.
These are legacy rows; they fail closed at read time (already correct) but should be
cleaned up.

**Adding a domain's team adapter (future).**
When a domain implements a real `TeamScopeAdapter` (typed team source, effective dates,
SQL predicate, index, negative tests), add its module key to `TEAM_ENABLED_DOMAINS` in the
same PR that ships the adapter. Only then will `team` scope assignment be permitted for
that domain.

### Gate

- Attempting to save `scope = "team"` for any permission not in `TEAM_ENABLED_DOMAINS`
  returns 400.
- Existing `scope = "team"` rows in unenabled domains still fail closed at read time
  (sql`false`) — no regression.
- Adding `'hr'` to `TEAM_ENABLED_DOMAINS` before the adapter exists must be blocked by code
  review (the set is a named constant in a guarded file).

### Rollback

Remove `assertScopeSupported` call. No schema change.

---

## 5-L — Immutable system roles + Module Admin RBAC screen guard

### Current state

Module Admin roles (`HR_ADMIN`, `CRM_ADMIN`, `INVENTORY_ADMIN`, `PRODUCT_MANAGEMENT_ADMIN`,
`MEMBER`) were added to the schema in a prior session (referenced in
`schema-change-plan.md` "in-progress" note). `ModuleAccessService.assertModuleAccess`
enforces owner/org-admin/module-admin access service-side.

### Backend changes

1. Mark system roles as immutable in `roles` table by adding an `is_system BOOLEAN NOT NULL
   DEFAULT false` column (migration). Set `is_system = true` for all roles seeded by
   `backfill-rbac-access.ts`. In `RbacService`, reject any attempt to mutate a system
   role's `name`, `slug`, `module`, `is_system`, or its permission set (only a Platform
   Admin override can touch system roles).

   ```sql
   -- wave-5l-roles-is-system.sql
   ALTER TABLE roles ADD COLUMN is_system BOOLEAN NOT NULL DEFAULT false;
   UPDATE roles SET is_system = true WHERE slug IN (
     'ORG_ADMIN', 'HR_ADMIN', 'CRM_ADMIN', 'INVENTORY_ADMIN',
     'PRODUCT_MANAGEMENT_ADMIN', 'MEMBER'
   );
   ```

2. Module Admin may assign roles only with rank < Module Admin for its own module. Enforce
   in `ModuleAccessService.setRolePermissions` (already calls `assertPermissionsGrantable`).
   Verify the `toGrantableSet` path in `grantability.ts` correctly excludes permissions
   outside the caller's module when the caller is a Module Admin.

3. Verify `assertModuleAccess` throws 403 (not 404) when the caller is authenticated but
   not an owner/org-admin/that-module-admin, and that `listCatalog`, `listRoles`, and
   `setPermissions` all call it before any data read.

### Gate

- A Module Admin for HR cannot mutate CRM roles.
- An `is_system = true` role cannot be renamed, deleted, or have its permission namespace
  changed through the RBAC API.
- A user with no Module Admin role gets 403 on `GET /module-access/:moduleKey/catalog`.

### Rollback

Revert the `is_system` column addition SQL. Behavioral changes (guard assertions) can be
reverted independently.

---

## 5-M — Server-filtered discovery endpoints + PermissionKey union codegen

### Current state

`GET /me/access` returns the caller's effective permissions. There is no endpoint exposing:
- the **grantable subset** (permissions the caller may assign to others)
- **assignable role ranks** (which system/custom roles the caller may assign)
- **eligible members** (who in the org can receive a role assignment from this caller)

The frontend maintains a hand-typed `PermissionKey` union type that drifts from the backend
catalog in `permissions.constants.ts`.

### Backend: discovery endpoints

Add to `AccessController` (or a new `DiscoveryController`):

```ts
@Get("discovery/grantable-permissions")
@UseGuards(JwtAuthGuard, PermissionGuard)
@RequirePermission("settings:rbac:manage")
async grantablePermissions(@CurrentUser() u: CurrentUserContext) {
  return this.access.getGrantablePermissions(u);
}

@Get("discovery/assignable-roles")
@UseGuards(JwtAuthGuard, PermissionGuard)
@RequirePermission("settings:rbac:manage")
async assignableRoles(@CurrentUser() u: CurrentUserContext) {
  return this.access.getAssignableRoles(u);
}

@Get("discovery/eligible-members")
@UseGuards(JwtAuthGuard, PermissionGuard)
@RequirePermission("settings:members:view")
async eligibleMembers(@CurrentUser() u: CurrentUserContext, @Query() q: EligibleMembersQuery) {
  return this.access.getEligibleMembers(u, q);
}
```

`getGrantablePermissions` reads from `PERMISSIONS` filtered to the caller's grantable set
(owner → all; org-admin → all non-owner; module-admin → its module's catalog; others → empty).
Returns only catalog-registered keys, never raw DB permission strings.

### Frontend: PermissionKey codegen

Add a build-time script (`scripts/generate-permission-keys.ts`) that:
1. Reads `PERMISSIONS` from `backend/src/modules/rbac/permissions.constants.ts`.
2. Emits `frontend/types/generated/permission-keys.ts` with:
   ```ts
   export const PERMISSION_KEYS = [...] as const;
   export type PermissionKey = typeof PERMISSION_KEYS[number];
   ```
3. Runs as part of `pnpm build` pre-step (or `pnpm generate:permissions`).
4. The frontend's `useCan("...")` argument is typed against this generated union.

Any new permission key added to the backend catalog automatically appears in the generated
type. Any typo in a `useCan(...)` call fails at compile time.

### Gate

- `GET /discovery/grantable-permissions` returns an empty array for a functional role user,
  the module's catalog for a Module Admin, and the full catalog for an org admin.
- Codegen script runs without error. Generated file has the same key count as
  `PERMISSIONS.length`.
- Frontend TypeScript build fails if a `useCan(...)` call uses an unregistered key.

### Rollback

Remove the new endpoints. Remove the codegen script. No schema change.

---

## 5-N — Add `PermissionGuard` + `@RequirePermission` to `ModuleAccessController`

### Current state (verified)

`ModuleAccessController` (`module-access.controller.ts`) uses `@UseGuards(JwtAuthGuard)` only.
The comment on line 16 reads: "Authorization is dynamic on the route moduleKey and is
asserted inside the service (owner / org-admin / that module's admin)". While
`ModuleAccessService.assertModuleAccess` does throw 403 correctly, the guard layer is
bypassed — PermissionGuard never runs, so the request audit trail does not record an RBAC
check and the standard guard pipeline is incomplete.

### Backend changes

The challenge: `@RequirePermission` is a static decorator, but the required permission is
dynamic (`{moduleKey}:access:view` or `{moduleKey}:access:manage`). The correct pattern for
this controller is a **dynamic permission resolver** rather than a static decorator.

Two options (choose based on existing patterns in the codebase):

**Option A (preferred if `DynamicPermissionGuard` exists or can be added).** Create
`DynamicPermissionGuard` that reads a `permissionFactory` metadata key and calls it with
the route params to produce the permission string, then evaluates it via `PermissionGuard`
logic. Decorate each handler:

```ts
@UseGuards(JwtAuthGuard, DynamicPermissionGuard)
@DynamicPermission((params: ModuleKeyParam) => `${params.moduleKey}:access:view`)
@Get(":moduleKey/catalog")
catalog(...) { ... }
```

**Option B (simpler, no new guard needed).** Keep `JwtAuthGuard` only at the class level
and add `@RequirePermission("settings:rbac:manage")` as a coarse org-admin gate that the
service refines. This is weaker (Module Admins must also pass `settings:rbac:manage`, which
they currently may not have) and requires a permission catalog change to add
`{module}:access:view` keys.

Given that `ModuleAccessService.assertModuleAccess` already enforces the dynamic module
check correctly with proper 403 throws, and adding a new guard infrastructure is non-trivial:

**Chosen approach for Wave 5:** Add catalog entries for `{moduleKey}:access:view` and
`{moduleKey}:access:manage` to `permissions.constants.ts`, grant them to the respective
Module Admin roles in `ROLE_DEFAULT_PERMISSIONS`, and keep the service-layer dynamic check.
Document in the controller comment that the service assertion is the authoritative gate and
the guard deviation is intentional and tracked (linked to this plan). Schedule the
`DynamicPermissionGuard` implementation for Wave 8 alongside the full Administration UX.

The critical near-term fix: ensure `assertModuleAccess` is called at the top of every
service method (currently only `listCatalog`, `listRoles`, `setPermissions` — verify
`listCatalog` calls it and is not short-circuitable). Add a startup self-test that hits
each route with an unauthenticated request and confirms 401, not 200.

### Gate

- An unauthenticated request to `GET /module-access/hr/catalog` returns 401.
- A functional-role user (no Module Admin or Org Admin) returns 403.
- A HR_ADMIN user returns 200 for `/module-access/hr/catalog` and 403 for
  `/module-access/crm/catalog`.

### Rollback

No schema change. Revert catalog additions in `permissions.constants.ts` if needed.

---

## Step sequencing and dependency graph

```
5-A  ──────────────────────────────────────────────────────── independent; run immediately
5-B  ──────────────────────────────────────────────────────── independent; run after Wave 4 gate
5-C  depends on: 5-B deployed
5-D  depends on: 5-C stable (dual-write proven)
5-E  depends on: 5-D zero-mismatch backfill
5-F  depends on: 5-E 7-day shadow gate
5-G  depends on: 5-F live for 2 releases, telemetry = 0
5-H  can run in parallel with 5-C through 5-G; each file is an independent commit
5-I  independent; can run after 5-B (needs membership_id concept)
5-J  independent; run after 5-B; audits resource_grants first
5-K  independent; run after 5-A (conceptually aligned, no code dependency)
5-L  independent; run after 5-B (needs is_system column)
5-M  independent; can run now (endpoints are additive)
5-N  independent; can run now (no schema change)
```

**Recommended parallel lanes.**

| Lane 1 (membership cutover) | Lane 2 (legacy removal) | Lane 3 (new capabilities) |
|-----------------------------|------------------------|--------------------------|
| 5-B → 5-C → 5-D → 5-E → 5-F | 5-A, then 5-G after 5-F, 5-H in parallel | 5-I, 5-J, 5-K, 5-L, 5-M, 5-N |

---

## Wave 5 exit gates (all must pass before Wave 6 begins)

1. `membershipRoleAssignments` is the sole read path in `computeUserPermissions`; `user_roles`
   is dual-written only and no longer read for permission resolution.
2. `legacyRoleSlug` block deleted; `rbac.legacy_user_role_fallback_hit` counter = 0 for 2 releases.
3. `organizationMembers.role` not used for authorization routing in any service; grep confirms
   zero authorization-routing references.
4. `access_denies` table live; deny precedence tested (deny overrides role grant).
5. `project_access_grants` (or equivalent typed table) live for at least one resource type;
   `resource_grants` for that resource type receives no new writes.
6. `assertScopeSupported` blocks `team` assignment for all modules without an adapter;
   existing `team` rows fail closed.
7. `is_system = true` roles cannot be mutated via RBAC API.
8. Discovery endpoints return caller-grantable subsets only.
9. PermissionKey codegen integrated into frontend build.
10. `ModuleAccessController` service-layer gate confirmed; `{module}:access:view/manage`
    keys in the permission catalog.
11. Privilege-escalation test suite passes: Module Admin cannot escalate to org-wide
    permissions; cross-tenant IDs rejected; expired/revoked roles have no effect.
12. `rbac.shadow_mismatch` counter = 0 for 7 days (or was = 0 before 5-F cutover).
13. p95 `GET /me/access` latency within 10% of pre-Wave-5 baseline.

---

## Risk register

| Risk | Severity | Item | Mitigation |
|------|----------|------|------------|
| **User with no `org_members` row has `user_roles` rows** | High | 5-D | Quarantine table + operator review before 5-G lands |
| **`users.role` removal locks out a user who was never backfilled** | High | 5-G | Telemetry gate (zero hits for 2 releases); re-run backfill; canary 1% of orgs first |
| **HR workflow stops finding approvers after 5-H** | High | 5-H | Per-file integration tests for each service; roll out one file at a time; keep legacy read behind a feature flag during the first release |
| **`team` scope deny breaks existing role configs** | Medium | 5-K | Startup warning scan; clean up legacy rows before write-gate goes live |
| **`access_denies` deny precedence is wrong under delegation** | Medium | 5-I | Explicit test: deny row + active delegation → deny wins |
| **`resource_grants` consumers unknown** | Medium | 5-J | Full code audit before any typed-table migration begins |
| **Codegen PermissionKey breaks frontend build** | Low | 5-M | Codegen runs in CI; fails build loudly; existing keys stay stable |

### The riskiest step: 5-G (`users.role` removal)

`users.role` is a global column (not scoped to any org). Its use as a per-org authorization
source is a multi-tenancy defect: the same user logging into Org A and Org B gets the same
permissions in both because `users.role` is a single global value. However, at the time of
removal, any user whose only RBAC entry was via `users.role` fallback will lose all
permissions. The backfill in 5-D copies `users.role` → `ROLE_DEFAULT_PERMISSIONS` →
`membership_role_assignments`, but only where the role slug resolves to a known role in
the org. If an org was created before the role row was seeded, the backfill may produce
zero rows for that user. The telemetry gate (zero hits for 2 releases) is the primary
safety mechanism. A manual verification query before 5-G:

```sql
-- Users who would lose all permissions if users.role fallback is removed.
SELECT ur.org_id, ur.user_id, u.role AS legacy_role
FROM organization_members om
JOIN users u ON u.id = om.user_id
LEFT JOIN membership_role_assignments mra
  ON mra.org_id = om.org_id AND mra.membership_id = om.id
WHERE om.status = 'ACTIVE'
  AND mra.id IS NULL  -- no membership_role_assignments row
  AND u.role IS NOT NULL AND u.role <> ''
ORDER BY ur.org_id, ur.user_id;
```

Zero rows = safe to remove. Any rows = backfill gap; investigate and re-run before
proceeding.

---

## Compatibility and rollback policy

- Every schema change in Wave 5 is **additive** until the retirement phase (5-G, 5-H).
- The previous deployed version must remain functional during each step.
- Rollback is a **forward-repair** preference: revert the code change, leave the additive
  schema in place, and repair data rather than running destructive down migrations.
- `userRoles` is not dropped in Wave 5. Its retirement (`DROP TABLE user_roles`) is a Wave 9
  contract step, gated on 30 days of zero reads and two releases.
- The `organizationMembers.role` column is not dropped in Wave 5 (it is still used for
  display and may be used by HR module non-RBAC paths). Column drop is also Wave 9.
