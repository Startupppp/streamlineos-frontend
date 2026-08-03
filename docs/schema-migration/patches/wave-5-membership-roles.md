---
type: wave-5 patch spec
status: DRAFT
date: 2026-07-26
covers: 5-B (table), 5-C (dual-write), 5-D (backfill), 5-G (legacyRoleSlug removal), 5-H (organizationMembers.role routing)
source-files:
  - backend/src/db/schema/access.ts
  - backend/src/modules/access/access.service.ts (ACTIVE EDIT — present as reviewable patch only)
  - backend/src/db/schema/auth.ts
  - backend/src/modules/rbac/permissions.constants.ts
  - docs/schema-migration/wave-5-execution-plan.md
---

# Wave 5 — Membership Roles: Patch Spec

Concrete implementation spec for steps 5-B through 5-H of the Wave 5 RBAC correctness
program. The wave-5-execution-plan.md is the authority on sequencing and exit gates; this
file provides the exact Drizzle definitions, migration SQL, backfill query, and reviewable
code patches needed to implement those steps.

---

## 1 — `membership_role_assignments`: Drizzle definition

### Prerequisite confirmed

`organization_members` has `uniqueIndex("uniq_org_members_org_id").on(table.orgId, table.id)`
(verified at `backend/src/db/schema/auth.ts` line 84). Composite FK is unblocked.

The `roles` table already carries `isSystem: boolean("is_system").default(false).notNull()`
(auth.ts line 289) — step 5-L's `is_system` column is already present; no additional
migration needed for that column.

### Drizzle schema addition

Add to `backend/src/db/schema/access.ts` after the `userRoles` table definition:

```ts
// --- Step 5-B: membership-keyed role assignments ---
// Composite FK to organization_members(org_id, id) is declared in raw migration SQL below;
// Drizzle does not emit multi-column FK syntax natively.
export const membershipRoleAssignments = pgTable(
  "membership_role_assignments",
  {
    id: serial("id").primaryKey(),
    orgId: text("org_id").notNull(),
    membershipId: integer("membership_id").notNull(),
    roleId: integer("role_id")
      .references(() => roles.id, { onDelete: "cascade" })
      .notNull(),
    assignedByMembershipId: integer("assigned_by_membership_id"),
    expiresAt: timestamp("expires_at"),
    reason: text("reason"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("uniq_mra_org_membership_role").on(t.orgId, t.membershipId, t.roleId),
    index("idx_mra_org_membership").on(t.orgId, t.membershipId),
    index("idx_mra_org_role").on(t.orgId, t.roleId),
    index("idx_mra_expires").on(t.orgId, t.expiresAt),
  ],
);

export const membershipRoleAssignmentsRelations = relations(
  membershipRoleAssignments,
  ({ one }) => ({
    role: one(roles, {
      fields: [membershipRoleAssignments.roleId],
      references: [roles.id],
    }),
  }),
);

export type MembershipRoleAssignment = typeof membershipRoleAssignments.$inferSelect;
export type NewMembershipRoleAssignment = typeof membershipRoleAssignments.$inferInsert;
```

### Generated migration SQL (`wave-5b-membership-role-assignments.sql`)

Drizzle cannot emit composite FKs — this migration must be written by hand and committed
alongside `db:generate` output. Keep both in sync: the Drizzle definition owns the
indexes; this file owns the FKs.

```sql
-- wave-5b-membership-role-assignments.sql
-- Additive only. Existing user_roles untouched. Safe to roll back with DROP TABLE.

CREATE TABLE IF NOT EXISTS membership_role_assignments (
  id                        SERIAL PRIMARY KEY,
  org_id                    TEXT    NOT NULL,
  membership_id             INTEGER NOT NULL,
  role_id                   INTEGER NOT NULL,
  assigned_by_membership_id INTEGER,
  expires_at                TIMESTAMPTZ,
  reason                    TEXT,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),

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

-- Uniqueness: one role per membership per org (prevents duplicate grants)
CREATE UNIQUE INDEX IF NOT EXISTS uniq_mra_org_membership_role
  ON membership_role_assignments (org_id, membership_id, role_id);

-- Hot read path: resolve all roles for one membership
CREATE INDEX IF NOT EXISTS idx_mra_org_membership
  ON membership_role_assignments (org_id, membership_id);

-- For role-fan-out (e.g. "who has role X in this org?")
CREATE INDEX IF NOT EXISTS idx_mra_org_role
  ON membership_role_assignments (org_id, role_id);

-- Partial index: expiry sweep ignores non-expiring rows
CREATE INDEX IF NOT EXISTS idx_mra_expires
  ON membership_role_assignments (org_id, expires_at)
  WHERE expires_at IS NOT NULL;
```

**Rollback:** `DROP TABLE IF EXISTS membership_role_assignments;` — safe, no reads yet.

---

## 2 — Dual-write + backfill SQL (steps 5-C and 5-D)

### 5-C: Dual-write patch (RbacService)

All role assignment writes currently target `user_roles`. After 5-B is deployed, extend
`RbacService.assignRole` (and its remove/update-expiry counterparts) to write both tables
atomically. The patch below is self-contained; apply it to whichever method names match
after reading the actual file.

```ts
// BEFORE (inside the transaction that writes user_roles):
await tx.insert(userRoles).values({
  orgId,
  userId: targetUserId,
  roleId,
  assignedBy: actorUserId,
  expiresAt,
  reason,
}).onConflictDoNothing();

await bumpPermissionsVersion(tx, orgId);

// AFTER (same transaction, add the membership-keyed mirror):
await tx.insert(userRoles).values({
  orgId,
  userId: targetUserId,
  roleId,
  assignedBy: actorUserId,
  expiresAt,
  reason,
}).onConflictDoNothing();

// Resolve membership IDs for both parties in parallel.
const [targetMemberRow, actorMemberRow] = await Promise.all([
  tx
    .select({ membershipId: organizationMembers.id })
    .from(organizationMembers)
    .where(
      and(
        eq(organizationMembers.orgId, orgId),
        eq(organizationMembers.userId, targetUserId),
      ),
    )
    .then((rows) => rows[0] ?? null),
  tx
    .select({ membershipId: organizationMembers.id })
    .from(organizationMembers)
    .where(
      and(
        eq(organizationMembers.orgId, orgId),
        eq(organizationMembers.userId, actorUserId),
      ),
    )
    .then((rows) => rows[0] ?? null),
]);

if (targetMemberRow) {
  // Target has a membership row — write the typed assignment.
  await tx
    .insert(membershipRoleAssignments)
    .values({
      orgId,
      membershipId: targetMemberRow.membershipId,
      roleId,
      assignedByMembershipId: actorMemberRow?.membershipId ?? null,
      expiresAt,
      reason,
    })
    .onConflictDoNothing();
} else {
  // No membership row (orphan data). Log and proceed; backfill will quarantine.
  logger.warn("rbac.dual-write: target user has no organization_members row", {
    orgId,
    targetUserId,
    roleId,
  });
}

await bumpPermissionsVersion(tx, orgId);
```

Apply the mirror pattern symmetrically to `removeRole` (DELETE from both) and
`updateRoleExpiry` (UPDATE both). Always wrap in the same transaction.

### 5-D: Backfill query (`wave-5d-backfill-mra.sql`)

Run AFTER 5-C is deployed and stable. Run in batches — 1 000 `user_roles.id` rows per
pass — with a checkpoint cursor. Fully idempotent (`ON CONFLICT DO NOTHING`).

```sql
-- wave-5d-backfill-mra.sql
-- Run as a background worker, not in a request thread.
-- Batch: WHERE ur.id > :last_processed_id ORDER BY ur.id LIMIT 1000

INSERT INTO membership_role_assignments
  (org_id, membership_id, role_id, assigned_by_membership_id, expires_at, reason, created_at)
SELECT
  ur.org_id,
  om.id                AS membership_id,
  ur.role_id,
  om_assigner.id       AS assigned_by_membership_id,
  ur.expires_at,
  ur.reason,
  ur.created_at
FROM user_roles ur
INNER JOIN organization_members om
  ON  om.org_id  = ur.org_id
  AND om.user_id = ur.user_id
LEFT JOIN organization_members om_assigner
  ON  om_assigner.org_id  = ur.org_id
  AND om_assigner.user_id = ur.assigned_by
ON CONFLICT (org_id, membership_id, role_id) DO NOTHING;

-- Quarantine: user_roles rows with no organization_members match (orphan data).
-- Write to a quarantine table for operator review before 5-G lands.
CREATE TABLE IF NOT EXISTS _quarantine_user_roles_no_membership (
  user_roles_id   INTEGER PRIMARY KEY,
  org_id          TEXT    NOT NULL,
  user_id         TEXT    NOT NULL,
  role_id         INTEGER NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL
);

INSERT INTO _quarantine_user_roles_no_membership
  (user_roles_id, org_id, user_id, role_id, created_at)
SELECT ur.id, ur.org_id, ur.user_id, ur.role_id, ur.created_at
FROM user_roles ur
LEFT JOIN organization_members om
  ON  om.org_id  = ur.org_id
  AND om.user_id = ur.user_id
WHERE om.id IS NULL
ON CONFLICT (user_roles_id) DO NOTHING;
```

**Checksum reconciliation** (run after backfill completes):

```sql
-- Eligible rows (have a membership match):
SELECT COUNT(*) AS eligible
FROM user_roles ur
INNER JOIN organization_members om
  ON om.org_id = ur.org_id AND om.user_id = ur.user_id;

-- Rows actually in the new table:
SELECT COUNT(*) AS inserted FROM membership_role_assignments;

-- Difference = quarantined orphans + in-flight dual-writes (both acceptable).
-- Zero new inserts on a second run = backfill is complete.
```

**Safety check before 5-G** — run this query; it must return zero rows before the
`legacyRoleSlug` block is removed:

```sql
-- Active members with users.role set but no membership_role_assignments row.
-- These users would lose all permissions if the fallback is removed.
SELECT
  om.org_id,
  om.user_id,
  u.role AS legacy_role
FROM organization_members om
JOIN users u ON u.id = om.user_id
LEFT JOIN membership_role_assignments mra
  ON  mra.org_id      = om.org_id
  AND mra.membership_id = om.id
WHERE om.status = 'ACTIVE'
  AND mra.id    IS NULL
  AND u.role    IS NOT NULL
  AND u.role    <> ''
ORDER BY om.org_id, om.user_id;
```

---

## 3 — `legacyRoleSlug` removal: reviewable patch on `access.service.ts`

> **OWNER IS ACTIVELY EDITING THIS FILE.** Present this section as a reviewable diff
> only. Do not apply it until (a) step 5-F is live for two releases, (b) the telemetry
> counter `rbac.legacy_user_role_fallback_hit` has been zero for two consecutive
> releases, and (c) the 5-D safety check above returns zero rows.

### Phase 1 — instrument first (apply now, while 5-F shadow runs)

In `computeUserPermissions`, wrap the existing fallback block with a counter and warning
so zero-hit confirmation is measurable:

```ts
// access.service.ts — inside computeUserPermissions, around lines 359–374
// BEFORE (current code):
let legacyRoleSlug: string | null = null;
if (!hasDirectRoles) {
  const user = await this.db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { role: true },
  });
  const slug = user?.role;
  if (slug) {
    const roleRow = await this.db.query.roles.findFirst({
      where: and(eq(roles.slug, slug), eq(roles.orgId, orgId)),
      columns: { id: true },
    });
    if (roleRow) roleIds.add(roleRow.id);
    else legacyRoleSlug = slug;
  }
}

// AFTER (instrument; do not yet remove):
let legacyRoleSlug: string | null = null;
if (!hasDirectRoles) {
  const user = await this.db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { role: true },
  });
  const slug = user?.role;
  if (slug) {
    // Step 5-G instrumentation: count fallback hits to gate removal.
    logger.warn("wave5-legacy-role-fallback", { orgId, userId, legacyRoleSlug: slug });
    metrics.increment("rbac.legacy_user_role_fallback_hit", { orgId });

    const roleRow = await this.db.query.roles.findFirst({
      where: and(eq(roles.slug, slug), eq(roles.orgId, orgId)),
      columns: { id: true },
    });
    if (roleRow) roleIds.add(roleRow.id);
    else legacyRoleSlug = slug;
  }
}
```

### Phase 2 — removal (after telemetry gate passes)

Delete the instrumented block and the downstream consumer. Net diff against the current
file:

```diff
-    let legacyRoleSlug: string | null = null;
-    if (!hasDirectRoles) {
-      const user = await this.db.query.users.findFirst({
-        where: eq(users.id, userId),
-        columns: { role: true },
-      });
-      const slug = user?.role;
-      if (slug) {
-        logger.warn("wave5-legacy-role-fallback", { orgId, userId, legacyRoleSlug: slug });
-        metrics.increment("rbac.legacy_user_role_fallback_hit", { orgId });
-        const roleRow = await this.db.query.roles.findFirst({
-          where: and(eq(roles.slug, slug), eq(roles.orgId, orgId)),
-          columns: { id: true },
-        });
-        if (roleRow) roleIds.add(roleRow.id);
-        else legacyRoleSlug = slug;
-      }
-    }
```

```diff
-    if (legacyRoleSlug) {
-      const defaults = ROLE_DEFAULT_PERMISSIONS[legacyRoleSlug] ?? [];
-      for (const key of defaults) merge(key, "all");
-    }
-
```

Also remove the now-unused `users` import from the Drizzle destructure at the top of the
file (line 15: `users`) **only if** `users` is not referenced anywhere else in the file
after this removal — verify with a grep before removing.

### What this removal closes

`users.role` is a **global column** not scoped to any org. Its use as a per-org RBAC
source is a multi-tenancy defect: a user's global `users.role = "HR_ADMIN"` grants HR
permissions in every org they belong to, regardless of which org explicitly assigned that
role. Once every active member has a `membership_role_assignments` row (verified by the
safety query above), this path fires for zero users and is safe to delete.

---

## 4 — 11 services to convert from `organizationMembers.role` routing (step 5-H)

These call sites bypass RBAC by querying the `role` column on `organization_members`
directly. Replace each with a permission-keyed membership query against
`membership_role_assignments` (after 5-F) or `user_roles` (during the dual-write window).

### Permission mapping

| Legacy `organizationMembers.role` value | Context | Replacement permission key |
|-----------------------------------------|---------|---------------------------|
| `"HR"` | Leave approvals / notifications | `hr:leaves:approve` |
| `"HR"` | Employee lifecycle management | `hr:employees:manage` |
| `"HR"` | Recruitment pipeline | `hr:recruitment:manage` |
| `"HR"` | Helpdesk ticket routing | `hr:helpdesk:manage` |
| `"HR"` (via `HR_NOTIFY_ROLES`) | Exit / offboarding notifications | `hr:exit:manage` |
| `"HR"` (via `HR_NOTIFY_ROLES`) | Onboarding notifications | `hr:onboarding:manage` |
| `"FINANCE"` | Expense approvals | `hr:expenses:approve` |
| `"FINANCE"` (via `hr-workflow-engine`) | Workflow stage FINANCE approver | `hr:payroll:approve` |

Map each call site individually — do not assume one permission covers all "HR" uses.

### Replacement query pattern

```ts
// BEFORE (any of the 11 call sites):
const hrMembers = await this.db
  .select({ userId: organizationMembers.userId })
  .from(organizationMembers)
  .where(
    and(
      eq(organizationMembers.orgId, orgId),
      eq(organizationMembers.role, "HR"),
    ),
  );

// AFTER (post 5-F; uses membership_role_assignments):
// Step 1: resolve role IDs that carry the target permission in this org.
const qualifyingRoleIds = await this.db
  .select({ roleId: rolePermissionGrants.roleId })
  .from(rolePermissionGrants)
  .where(
    and(
      eq(rolePermissionGrants.orgId, orgId),
      eq(rolePermissionGrants.permissionKey, "hr:leaves:approve"), // <-- per call site
    ),
  )
  .then((rows) => rows.map((r) => r.roleId));

if (qualifyingRoleIds.length === 0) {
  // No role in this org grants the permission — no eligible approvers.
  return [];
}

// Step 2: resolve members who hold any of those roles and are not expired.
const hrMembers = await this.db
  .select({ userId: organizationMembers.userId })
  .from(membershipRoleAssignments)
  .innerJoin(
    organizationMembers,
    and(
      eq(membershipRoleAssignments.orgId, organizationMembers.orgId),
      eq(membershipRoleAssignments.membershipId, organizationMembers.id),
    ),
  )
  .where(
    and(
      eq(membershipRoleAssignments.orgId, orgId),
      inArray(membershipRoleAssignments.roleId, qualifyingRoleIds),
      eq(organizationMembers.status, "ACTIVE"),
      or(
        isNull(membershipRoleAssignments.expiresAt),
        gt(membershipRoleAssignments.expiresAt, new Date()),
      ),
    ),
  );
```

### Call site inventory (from wave-5-execution-plan.md §5-H, verified)

| # | File | Line(s) | Legacy value | Replacement permission |
|---|------|---------|-------------|----------------------|
| 1 | `cron-recruitment.service.ts` | 231 | `"HR"` | `hr:recruitment:manage` |
| 2 | `hr-workflow-instances.service.ts` | 215 | `"HR"` | `hr:workflows:approve` |
| 3 | `hr-workflow-instances.service.ts` | 217 | `"FINANCE"` | `hr:payroll:approve` |
| 4 | `hr-workflow-engine.service.ts` | 259 | `"HR"` | `hr:workflows:approve` |
| 5 | `hr-workflow-engine.service.ts` | 267 | `"FINANCE"` | `hr:payroll:approve` |
| 6 | `hr-workflow-engine.service.ts` | 278 | `"HR"` | `hr:workflows:approve` |
| 7 | `expenses-write.service.ts` | 368 | `"HR"` | `hr:expenses:approve` |
| 8 | `clients/client-accounts.service.ts` | 210 | `"HR"` | `hr:employees:manage` |
| 9 | `hr-helpdesk.service.ts` | 322 | `"HR"` | `hr:helpdesk:manage` |
| 10 | `leaves-write.service.ts` | 744 | `"HR"` | `hr:leaves:approve` |
| 11 | `exit-write.service.ts` | 349 | `HR_NOTIFY_ROLES` array | `hr:exit:manage` |
| 12 | `onboarding.service.ts` | 811 | `HR_NOTIFY_ROLES` array | `hr:onboarding:manage` |
| 13 | `hr-time/leaves-page.service.ts` | 129 | `targetRoles` array | `hr:leaves:approve` |

Note: the execution plan lists 10 call sites; a recount from the verified file paths
yields 13 (the workflow engine has 3 independent queries). Each must be its own PR/commit
so diffs stay reviewable. Use a feature flag per file during the first release to keep the
legacy read as a fallback while monitoring.

### `hr:recruitment:manage` — missing from catalog

`hr:recruitment:manage` is not present in `HR_PERMISSIONS` in `permissions.constants.ts`
(as of the read above — the array ends at `hr:export:manage`). Before fixing call site 1,
add the key:

```ts
// Add to HR_PERMISSIONS in permissions.constants.ts:
{
  name: "hr:recruitment:manage",
  resource: "hr:recruitment",
  action: "manage",
  description: "Manage recruitment pipelines and job postings",
},
```

Then add it to `ROLE_DEFAULT_PERMISSIONS` for `HR_ADMIN` and call
`bumpPermissionsVersion` in the same transaction. Verify the key does not already exist
under a different name before adding (grep for `"hr:recruitment"` in the file first).

### `hr:onboarding:manage` — verify catalog entry

`hr:onboarding:manage` appears in `permissions.constants.ts` (confirmed: `hr:onboarding:manage`
at the HR_PERMISSIONS array). No addition needed for that key.

---

## 5 — Gate summary and rollback policy

| Step | Gate | Rollback |
|------|------|---------|
| 5-B (table) | Migration applies; previous app version starts; table empty | `DROP TABLE membership_role_assignments;` |
| 5-C (dual-write) | New assignment appears in both tables; remove deletes from both | Remove MRA insert/delete from RbacService; user_roles path unaffected |
| 5-D (backfill) | Safety query returns 0 rows; second backfill run = 0 new inserts; quarantine reviewed | Delete MRA rows by created_at window; re-run is idempotent |
| 5-F (read switch — not this file) | p95 `/me/access` within 10% baseline; all guarded endpoints pass smoke | Revert computeUserPermissions join; dual-write continues |
| 5-G (legacyRoleSlug removal) | `rbac.legacy_user_role_fallback_hit` = 0 for 2 releases; safety query = 0 rows | Revert deletion; backfill is idempotent so re-run restores any gap |
| 5-H (routing removal) | Grep for `organizationMembers.role` returns 0 auth-routing uses; notification tests pass | Revert each service file independently; no schema change |

---

## Riskiest item: step 5-G (`users.role` removal)

This is the highest-risk retirement in Wave 5. Key facts:

- `users.role` is **global** — it is not scoped to an org. A user with `users.role = "HR_ADMIN"`
  currently receives HR permissions in every org they belong to via the fallback. Removing
  the fallback closes a multi-tenancy defect while also potentially locking out any active
  member whose backfill was incomplete.

- The safety mechanism has three layers: (a) telemetry instrumentation fires for every
  fallback hit — zero for two releases means no live user relies on it; (b) the
  pre-removal safety query verifies zero active members lack an MRA row; (c) the backfill
  is idempotent — re-running it is always safe and restores any gap.

- Recommended deployment order: canary 1% of orgs (smallest orgs first) → monitor 48 h →
  full rollout. Revert is a code-only change with no schema consequence.

**Do not proceed to 5-G until all three of these are true simultaneously:**
1. `rbac.legacy_user_role_fallback_hit` counter = 0 for two complete release cycles.
2. The safety query returns exactly 0 rows.
3. The 5-D backfill re-run confirms 0 new insertions.
