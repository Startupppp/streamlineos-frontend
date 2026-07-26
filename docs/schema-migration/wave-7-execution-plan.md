---
wave: 7
type: execution plan
status: DRAFT
date: 2026-07-26
governs: Product Management hierarchy — closes ADR gaps G1–G6 from wave-0-pm-reconciliation-adr.md
rides-on: commit 08b07dc (pm_workspaces + pm_workspace_memberships schema + wave-7-pm-workspaces.sql)
---

# Wave 7 — Product Management hierarchy: execution plan

> **Authority.** `wave-0-pm-reconciliation-adr.md` is the single source of truth for every
> decision in this plan. Where this document is silent, the ADR decides. Where they conflict,
> the ADR wins.
>
> **Scope discipline.** This plan closes ADR gaps G1–G6 and the related legacy-backfill work
> for `project_workspace_members`. It does NOT rename `project_workspace_members` to
> `product_management_members` (that wave-8 target is dropped per ADR §3.6 and contradiction
> decision C2). It does NOT restructure the broader Wave-7 composite-FK rollout
> (`wave-7-composite-fk-matrix.md` W7-A through W7-H) — that is a separate, parallel track.
>
> **In-flight guard.** The user is actively coding PM schema. READ-ONLY on all source files
> during plan execution. Every schema change in this plan goes through `db:generate` +
> `db:migrate` (never `db:push`, never hand-run SQL against main). The existing
> `wave-7-pm-workspaces.sql` is the reference for the already-landed SQL backfill; the
> Drizzle-generated migration must match it or supersede it.

---

## Current state (verified 2026-07-26 against actual files)

| File | What exists | What is missing |
|---|---|---|
| `projects/pm-workspaces.ts` | Table `pm_workspaces` with PK, `org_id → organizations.id`, `name`, `slug`, `is_default`, `status`, `deleted_at`, timestamps. Candidate key `UNIQUE(org_id, pm_workspace_id)`. Partial-unique index on `(org_id) WHERE is_default = true`. Slug unique index. | No generated migration yet (schema-only). |
| `projects/pm-workspace-memberships.ts` | Table `pm_workspace_memberships` with PK, `org_id → organizations.id` (single-col), `pm_workspace_id` (text, no FK on its own), `organization_membership_id → organization_members.id` (single-col), `role`, `added_at`. Composite FK `(org_id, pm_workspace_id) → pm_workspaces(org_id, pm_workspace_id)` present. Unique `(org_id, pm_workspace_id, organization_membership_id)`. | **G1: missing composite FK `(org_id, organization_membership_id) → organization_members(org_id, id)`.** The single-col FK alone is insufficient per ADR §3.3. Candidate key `uniq_org_members_org_id` ON `organization_members(org_id, id)` already exists → this gap is unblocked NOW. |
| `projects/core.ts` — `projects` | Has `pm_workspace_id text` (nullable, no FK). | **G2: no composite FK; still nullable.** Must become NOT NULL + composite FK after backfill. |
| `project-teams.ts` — `project_teams` | Has `pm_workspace_id text` (nullable, no FK). | **G2 (same).** |
| `project-teams.ts` — `project_workspace_members` | Has `pm_workspace_id text` (nullable, added by `wave-7-pm-workspaces.sql`). | Legacy roster — needs backfill into `pm_workspace_memberships`, then becomes read-only compat. |
| `projects/managed-products.ts` | Has `pm_workspace_id text` (nullable, no FK). `serial` PK (not identity). No strategy/roadmap fields. No composite FK. | **G2 + G5.** |
| `portal-access/project-client-grants.ts` | Has `pm_workspace_id text` (nullable, no FK). Uses `organization_id` column name (not `org_id`) — note this in the FK migration. Composite FK `(organization_id, portal_membership_id, party_contact_id) → portal_memberships` and `(organization_id, party_contact_id) → party_contacts` already present. | **G2** for the workspace FK; column name is `organization_id`, not `org_id`. |
| `access/entitlements.service.ts` — `setModuleEnabled` | Handles plan-lock check, `org_modules` upsert, `organizations.enabled_modules` array update. Transactional. | **G4: no PM-workspace provisioning call.** On `projects` enable, must idempotently create the default PM Workspace inside the same transaction. |
| `wave-7-pm-workspaces.sql` | Additive SQL for table creation, backfill provisioning, roster backfill. Already executed or staged on branch. | Must be converted to / reconciled with a proper Drizzle-journaled migration so the schema diff is zero after `db:generate`. |

---

## Step sequence

Steps are ordered by the expand → backfill → constrain discipline. Steps 1 and 2 are
**unblocked NOW**. Steps 3–7 are Wave 7 execution items that must run after Step 3's backfill
lands.

---

### Step 1 — Generate + journal the Drizzle migration (closes G3)

**Gate:** unblocked now.

**What:** Run `pnpm -C backend db:generate` against the current schema to produce the official
Drizzle migration file that journals `pm_workspaces` and `pm_workspace_memberships`.
Reconcile the output against `wave-7-pm-workspaces.sql` — the SQL file is the reference for
the backfill sections (§§4–6 of that file), which Drizzle does not generate automatically.

**Migration sketch:**

The generated migration will include DDL for `pm_workspaces` and `pm_workspace_memberships`
matching the Drizzle schema files. After generation, append the backfill DML from
`wave-7-pm-workspaces.sql` §§3–6 as a hand-authored block inside the same migration file,
separated by a comment banner:

```sql
-- === hand-authored backfill (not generated) ===
-- §3. Nullable pm_workspace_id columns on PM children (already additive/idempotent)
-- §4. Default PM Workspace provisioning for eligible orgs
-- §5. Backfill pm_workspace_id on projects / managed_products / project_teams / project_workspace_members
-- §6. Backfill pm_workspace_memberships from project_workspace_members roster
```

If `db:generate` produces a diff that conflicts with the already-executed `wave-7-pm-workspaces.sql`
(i.e., tables already exist on the branch), apply with `--custom` flag or manually resolve
the snapshot JSON so the journal records the landed state correctly.

**Validation:**
- `pnpm -C backend db:migrate` completes without error on the Neon branch.
- `pnpm -C backend db:generate` after migration produces an empty diff (zero pending changes).
- `SELECT count(*) FROM pm_workspaces WHERE is_default = true` equals the count of eligible orgs.
- `SELECT count(*) FROM projects WHERE pm_workspace_id IS NULL` equals zero for eligible orgs.

**Rollback:** The tables are additive. Rollback drops `pm_workspace_memberships` then
`pm_workspaces` (in FK order). Nullable `pm_workspace_id` columns on PM children have no FK
yet — rollback is `ALTER TABLE x DROP COLUMN pm_workspace_id`.

---

### Step 2 — Composite FK on pm_workspace_memberships.organization_membership_id (closes G1)

**Gate:** unblocked now — `uniq_org_members_org_id UNIQUE(org_id, id)` already exists on
`organization_members` (verified in `auth.ts` line 84). No Wave 4 prerequisite needed.

**What:** Replace the current single-column `organization_membership_id → organization_members.id`
reference in `pm-workspace-memberships.ts` with a composite FK
`(org_id, organization_membership_id) → organization_members(org_id, id)`.

**Schema change (backend/src/db/schema/projects/pm-workspace-memberships.ts):**

Remove the `.references(() => organizationMembers.id, { onDelete: "cascade" })` from the
`organizationMembershipId` column definition (Drizzle requires the FK be declared in the
table-level `foreignKey()` block for composites, not inline on the column).

Add a second `foreignKey` entry in the table config array:

```ts
foreignKey({
  columns: [t.orgId, t.organizationMembershipId],
  foreignColumns: [organizationMembers.orgId, organizationMembers.id],
  name: "fk_pm_ws_members_org_membership",
}).onDelete("cascade"),
```

Keep the existing `fk_pm_ws_members_org_workspace` composite FK as-is.

**Migration sketch (generated by db:generate):**

```sql
-- Drop old single-col FK
ALTER TABLE pm_workspace_memberships
  DROP CONSTRAINT IF EXISTS pm_workspace_memberships_organization_membership_id_organization_members_id_fk;

-- Add composite FK (candidate key uniq_org_members_org_id already present)
ALTER TABLE pm_workspace_memberships
  ADD CONSTRAINT fk_pm_ws_members_org_membership
  FOREIGN KEY (org_id, organization_membership_id)
  REFERENCES organization_members (org_id, id)
  ON DELETE CASCADE;
```

**Validation:**
- `pnpm -C backend db:generate` produces exactly the DROP + ADD above.
- `pnpm -C backend db:migrate` succeeds on branch.
- Cross-tenant membership attempt (org_id mismatch) rejected at the DB layer.

**Rollback:** Re-add the single-column `organization_membership_id → organization_members.id`
FK and drop the composite.

---

### Step 3 — Provisioning hook in setModuleEnabled (closes G4)

**Gate:** Step 1 (migration journaled) must be done first — the service needs the
`pm_workspaces` table to exist and the schema import to be available.

**What:** When `moduleKey === "projects"` and `enabled === true`, the `setModuleEnabled`
transaction must idempotently create the default PM Workspace for the org **before the
transaction commits**. When `enabled === false`, no workspace is created or destroyed (PM
data is retained per ADR §3.4 + plan §6 module-disable lifecycle rule).

**Service change (backend/src/modules/access/entitlements.service.ts):**

Inside the `await this.db.transaction(async (tx) => { ... })` block, after the `org_modules`
upsert, add the provisioning block:

```ts
if (moduleKey === "projects" && enabled) {
  // Idempotent: re-read the default row if it already exists (retry-safe).
  const existing = await tx.query.pmWorkspaces.findFirst({
    where: and(
      eq(pmWorkspaces.orgId, orgId),
      eq(pmWorkspaces.isDefault, true),
    ),
  });
  if (!existing) {
    await tx.insert(pmWorkspaces).values({
      orgId,
      name: "Default Workspace",
      slug: "default",
      isDefault: true,
      status: "active",
    });
  }
}
```

Import `pmWorkspaces` from the schema barrel. Import `and`, `eq` from `drizzle-orm`.
No new service dependency needed — the `db` is already injected.

**No migration required for this step** — it is a service-layer change only.

**Backfill migration (separate migration file, runs once):**

The `wave-7-pm-workspaces.sql` §4 already covers the historical backfill. Verify it is
included in Step 1's migration. If it was not (because the SQL file was applied out-of-band),
generate a dedicated backfill migration:

```sql
-- Provision default workspace for all eligible orgs not yet covered.
INSERT INTO pm_workspaces (pm_workspace_id, org_id, name, slug, is_default, status)
SELECT gen_random_uuid()::text, o.id, 'Default Workspace', 'default', true, 'active'
FROM organizations o
WHERE NOT EXISTS (
    SELECT 1 FROM pm_workspaces w WHERE w.org_id = o.id AND w.is_default = true
  )
  AND (
    EXISTS (SELECT 1 FROM projects p WHERE p.org_id = o.id)
    OR EXISTS (SELECT 1 FROM managed_products m WHERE m.org_id = o.id)
    OR EXISTS (SELECT 1 FROM project_workspace_members pwm WHERE pwm.org_id = o.id)
    OR ('PROJECTS' = ANY(COALESCE(o.enabled_modules, '{}')))
  );
```

**Validation:**
- Enabling the `projects` module for a new org creates exactly one `pm_workspaces` row with
  `is_default = true`.
- Re-enabling (retry) does not create a second row (partial-unique index enforces this at DB level).
- Disabling the module leaves the workspace row intact.
- `SELECT count(*) FROM pm_workspaces WHERE is_default = true` equals eligible-org count.

**Rollback:** Remove the provisioning block from `setModuleEnabled`. The workspace rows
already created are harmless (additive data); they can be cleaned up in a maintenance script
if needed.

---

### Step 4 — Legacy roster backfill: project_workspace_members → pm_workspace_memberships (ADR §3.6)

**Gate:** Step 1 (migration journaled, roster backfill SQL is part of it) + Step 3
(default workspace exists for every eligible org).

**Note:** This is the formal verification and journaling step. The SQL backfill was already
drafted in `wave-7-pm-workspaces.sql` §6 and must be included in the Step 1 migration.
This step confirms correctness and handles dropped rows.

**What:**

1. For each row in `project_workspace_members` where the user has an active
   `organization_members` row for the same org, insert a `pm_workspace_memberships` row
   under that org's default workspace.
2. Rows whose `user_id` has no active `organization_members.id` for that org are dropped
   (the user has left or was never a full member). Log dropped rows to a repair table or
   application log before discarding.

**Migration sketch:**

```sql
-- Log dropped rows for operator review (additive repair table, not a permanent schema concern).
CREATE TABLE IF NOT EXISTS _pm_ws_member_backfill_drops (
  org_id text,
  user_id text,
  legacy_role text,
  reason text,
  logged_at timestamp DEFAULT now()
);

INSERT INTO _pm_ws_member_backfill_drops (org_id, user_id, legacy_role, reason)
SELECT pwm.org_id, pwm.user_id, pwm.role, 'no_active_org_membership'
FROM project_workspace_members pwm
WHERE NOT EXISTS (
  SELECT 1 FROM organization_members om
  WHERE om.org_id = pwm.org_id AND om.user_id = pwm.user_id
);

-- Backfill resolved rows into pm_workspace_memberships.
INSERT INTO pm_workspace_memberships
  (pm_workspace_membership_id, org_id, pm_workspace_id, organization_membership_id, role)
SELECT
  gen_random_uuid()::text,
  pwm.org_id,
  w.pm_workspace_id,
  om.id,
  COALESCE(pwm.role, 'member')
FROM project_workspace_members pwm
JOIN pm_workspaces w ON w.org_id = pwm.org_id AND w.is_default = true
JOIN organization_members om ON om.org_id = pwm.org_id AND om.user_id = pwm.user_id
ON CONFLICT (org_id, pm_workspace_id, organization_membership_id) DO NOTHING;
```

**Validation:**
- `SELECT count(*) FROM _pm_ws_member_backfill_drops` — review; zero is expected if all
  legacy workspace members have active org memberships.
- `SELECT count(*) FROM pm_workspace_memberships` covers all previously-active PM workspace
  users.
- The `project_workspace_members` table is NOT dropped; it stays as a compatibility read source
  during the transition period and is NOT renamed (ADR C2 decision is final).

**Rollback:** The `pm_workspace_memberships` rows are additive. Truncating the table returns
to the pre-backfill state; the repair log table can be dropped separately.

---

### Step 5 — NOT NULL + composite FK on pm_workspace_id for PM children (closes G2)

**Gate:** Step 1 (backfill SQL landed — `pm_workspace_id` populated on all eligible rows),
Step 3 (default workspace exists for every eligible org). Verify zero NULL `pm_workspace_id`
rows on each child table for eligible orgs before applying NOT NULL.

**What:** For each of the four PM child tables, add:
1. `NOT NULL` constraint on `pm_workspace_id`.
2. Composite FK `(org_id, pm_workspace_id) → pm_workspaces(org_id, pm_workspace_id)`.

**Tables and column-name notes:**

| Table | `org_id` column | Notes |
|---|---|---|
| `projects` | `org_id` | `serial` PK; `pm_workspace_id` already added |
| `project_teams` | `org_id` | `identity` PK; `pm_workspace_id` already added |
| `managed_products` | `org_id` | `serial` PK; `pm_workspace_id` already added |
| `project_client_grants` | **`organization_id`** | Column name differs — use `organization_id` in the FK |

**Schema changes (Drizzle):**

For `projects/core.ts` — update `pmWorkspaceId`:

```ts
pmWorkspaceId: text("pm_workspace_id").notNull(),
```

Add to the table config array:

```ts
foreignKey({
  columns: [table.orgId, table.pmWorkspaceId],
  foreignColumns: [pmWorkspaces.orgId, pmWorkspaces.pmWorkspaceId],
  name: "fk_projects_org_workspace",
}).onDelete("restrict"),
```

Apply the same pattern to `project-teams.ts` (`project_teams`):

```ts
foreignKey({
  columns: [t.orgId, t.pmWorkspaceId],
  foreignColumns: [pmWorkspaces.orgId, pmWorkspaces.pmWorkspaceId],
  name: "fk_project_teams_org_workspace",
}).onDelete("restrict"),
```

For `projects/managed-products.ts`:

```ts
foreignKey({
  columns: [table.orgId, table.pmWorkspaceId],
  foreignColumns: [pmWorkspaces.orgId, pmWorkspaces.pmWorkspaceId],
  name: "fk_managed_products_org_workspace",
}).onDelete("restrict"),
```

For `portal-access/project-client-grants.ts` (note: column is `organizationId`):

```ts
foreignKey({
  columns: [table.organizationId, table.pmWorkspaceId],
  foreignColumns: [pmWorkspaces.orgId, pmWorkspaces.pmWorkspaceId],
  name: "fk_project_client_grants_org_workspace",
}).onDelete("restrict"),
```

**Migration sketch (generated + validated before apply):**

```sql
-- Pre-flight check: ensure no NULLs remain. Run before adding NOT NULL.
-- SELECT count(*) FROM projects WHERE pm_workspace_id IS NULL;
-- SELECT count(*) FROM project_teams WHERE pm_workspace_id IS NULL;
-- SELECT count(*) FROM managed_products WHERE pm_workspace_id IS NULL;
-- SELECT count(*) FROM project_client_grants WHERE pm_workspace_id IS NULL;

ALTER TABLE projects ALTER COLUMN pm_workspace_id SET NOT NULL;
ALTER TABLE projects ADD CONSTRAINT fk_projects_org_workspace
  FOREIGN KEY (org_id, pm_workspace_id)
  REFERENCES pm_workspaces (org_id, pm_workspace_id) ON DELETE RESTRICT;

ALTER TABLE project_teams ALTER COLUMN pm_workspace_id SET NOT NULL;
ALTER TABLE project_teams ADD CONSTRAINT fk_project_teams_org_workspace
  FOREIGN KEY (org_id, pm_workspace_id)
  REFERENCES pm_workspaces (org_id, pm_workspace_id) ON DELETE RESTRICT;

ALTER TABLE managed_products ALTER COLUMN pm_workspace_id SET NOT NULL;
ALTER TABLE managed_products ADD CONSTRAINT fk_managed_products_org_workspace
  FOREIGN KEY (org_id, pm_workspace_id)
  REFERENCES pm_workspaces (org_id, pm_workspace_id) ON DELETE RESTRICT;

ALTER TABLE project_client_grants ALTER COLUMN pm_workspace_id SET NOT NULL;
ALTER TABLE project_client_grants ADD CONSTRAINT fk_project_client_grants_org_workspace
  FOREIGN KEY (organization_id, pm_workspace_id)
  REFERENCES pm_workspaces (org_id, pm_workspace_id) ON DELETE RESTRICT;
```

**On DELETE RESTRICT (not CASCADE):** A PM Workspace delete must not silently cascade and
delete every project under it. The workspace archive/delete service must validate zero active
projects/teams/managed-products before proceeding (or soft-delete via `deleted_at`).

**Validation:**
- `db:generate` produces exactly the four `ALTER TABLE` pairs.
- `db:migrate` succeeds on branch (pre-flight NULLs must be zero).
- INSERT test: a project with a mismatched `pm_workspace_id` (different org) is rejected.
- INSERT test: a project with a NULL `pm_workspace_id` is rejected.

**Rollback:** Drop the four FKs; set columns back to nullable. Data is not affected.

---

### Step 6 — Managed Products: strategy/roadmap fields + workspace composite FK (closes G5)

**Gate:** Step 5 must be done first (workspace composite FK on `managed_products` is part of
Step 5; this step adds the G5 strategy/roadmap fields on top).

**What:** `managed_products` currently holds only `name`, `key`, `description`, `status`,
`ownerId`, `pm_workspace_id`, timestamps. It is missing the PM strategy/roadmap fields
required for a Managed Product to own its strategy and outcomes domain (ADR §3.1 + plan §6).

**Schema additions to `projects/managed-products.ts`:**

```ts
// Strategy fields
vision: text("vision"),
missionStatement: text("mission_statement"),
targetCustomer: text("target_customer"),
differentiators: text("differentiators"),
// Roadmap pointers (lightweight; full roadmap rows live in projects/roadmap.ts)
currentPhase: text("current_phase"),
targetLaunchDate: timestamp("target_launch_date"),
// Outcomes tracking
successMetrics: jsonb("success_metrics")
  .$type<Array<{ metric: string; target: string; unit?: string }>>(),
// Owner reference upgrade: keep ownerId but also track as organization membership
ownerMembershipId: integer("owner_membership_id")
  .references(() => organizationMembers.id, { onDelete: "set null" }),
```

The `serial` PK on `managed_products` (`managed_product_id`) is a pre-existing schema choice.
Do not change PK type in this step — that is a separate ID-transition entry (wave-0 matrix).

**Also add the candidate key** needed for composite-FK targeting by child tables (e.g. roadmap
rows, strategy records):

```ts
unique("uniq_managed_products_org_id").on(table.orgId, table.managedProductId),
```

**Migration sketch:**

```sql
ALTER TABLE managed_products
  ADD COLUMN IF NOT EXISTS vision text,
  ADD COLUMN IF NOT EXISTS mission_statement text,
  ADD COLUMN IF NOT EXISTS target_customer text,
  ADD COLUMN IF NOT EXISTS differentiators text,
  ADD COLUMN IF NOT EXISTS current_phase text,
  ADD COLUMN IF NOT EXISTS target_launch_date timestamp,
  ADD COLUMN IF NOT EXISTS success_metrics jsonb,
  ADD COLUMN IF NOT EXISTS owner_membership_id integer
    REFERENCES organization_members(id) ON DELETE SET NULL;

ALTER TABLE managed_products
  ADD CONSTRAINT uniq_managed_products_org_id UNIQUE (org_id, managed_product_id);
```

**Note on child strategy/roadmap tables:** `projects/roadmap.ts` already exists as a sibling
schema file. Review whether its `roadmap_items` table should gain a `(org_id, managed_product_id)`
composite FK to `managed_products(org_id, managed_product_id)` — if roadmap items reference
a Managed Product, this is the correct FK shape. That is a Wave 7-D (Projects cluster) item
and can ride as a sub-task of this step.

**Validation:**
- `db:generate` produces the ALTER TABLE + ADD CONSTRAINT.
- `db:migrate` succeeds.
- Verify new columns accept values and are nullable (additive, no data impact).
- Candidate key prevents duplicate `(org_id, managed_product_id)` pairs.

**Rollback:** Drop the new columns and constraint. Existing data is not affected.

---

### Step 7 — Delivery Team / Project membership proves active PM Workspace Membership (closes G6)

**Gate:** Step 4 (pm_workspace_memberships backfill complete) + Step 5 (workspace FKs on
project_teams and projects are NOT NULL + composite). This step is the hardest constraint
to enforce and uses a deferred approach.

**What:** The ADR §3.3 requirement is: "A Delivery Team membership or Project membership/grant
additionally proves its principal has an active PM Workspace Membership in the same
Organization/workspace through a composite FK or deferred constraint backed by a candidate key."

This means every `project_team_members` row and every `project_members` row that refers to a
PM workspace participant must have a corresponding active `pm_workspace_memberships` row.

**Current reality (verified):**

- `project_team_members` references `project_teams.id` + `users.id` (raw user ID — no org
  membership FK). There is no `pm_workspace_id` on `project_team_members` yet.
- `project_members` references `projects.id` + `users.id` (raw user ID — no org membership FK).

**Two-sub-step approach:**

**7a — Add workspace context to team/project membership rows (schema + backfill):**

Add `pm_workspace_id text` and `organization_membership_id integer` to both
`project_team_members` and `project_members` (nullable first, backfill, then constrain):

```ts
// project_team_members additions
pmWorkspaceId: text("pm_workspace_id"),
organizationMembershipId: integer("organization_membership_id")
  .references(() => organizationMembers.id, { onDelete: "cascade" }),
```

Backfill `pm_workspace_id` from the parent `project_teams.pm_workspace_id`; backfill
`organization_membership_id` by resolving `user_id → organization_members.id` for that org.

```sql
UPDATE project_team_members ptm
SET
  pm_workspace_id = pt.pm_workspace_id,
  organization_membership_id = om.id
FROM project_teams pt
JOIN organization_members om ON om.org_id = pt.org_id AND om.user_id = ptm.user_id
WHERE pt.id = ptm.team_id
  AND ptm.pm_workspace_id IS NULL;

UPDATE project_members pm
SET
  pm_workspace_id = p.pm_workspace_id,
  organization_membership_id = om.id
FROM projects p
JOIN organization_members om ON om.org_id = p.org_id AND om.user_id = pm.user_id
WHERE p.id = pm.project_id
  AND pm.pm_workspace_id IS NULL;
```

Log any rows where `user_id` has no matching `organization_members` row (same drop/log
pattern as Step 4).

**7b — Deferred composite FK to pm_workspace_memberships (constrain phase):**

After backfill, add the candidate key on `pm_workspace_memberships` needed as a FK target:

```sql
ALTER TABLE pm_workspace_memberships
  ADD CONSTRAINT uniq_pm_ws_members_org_ws_member_id
  UNIQUE (org_id, pm_workspace_id, organization_membership_id);
-- (This unique constraint already exists by a different name: uniq_pm_ws_members_org_ws_member)
-- Verify the name; if the 3-col unique is already present, it already serves as FK target.
```

Then add the deferred composite FKs on the membership tables:

```sql
-- project_team_members: prove active PM Workspace Membership
ALTER TABLE project_team_members
  ADD CONSTRAINT fk_ptm_pm_ws_membership
  FOREIGN KEY (org_id, pm_workspace_id, organization_membership_id)
  REFERENCES pm_workspace_memberships (org_id, pm_workspace_id, organization_membership_id)
  DEFERRABLE INITIALLY DEFERRED;

-- project_members: prove active PM Workspace Membership
ALTER TABLE project_members
  ADD CONSTRAINT fk_pm_pm_ws_membership
  FOREIGN KEY (org_id, pm_workspace_id, organization_membership_id)
  REFERENCES pm_workspace_memberships (org_id, pm_workspace_id, organization_membership_id)
  DEFERRABLE INITIALLY DEFERRED;
```

**Why DEFERRABLE INITIALLY DEFERRED:** When adding a team/project member, the service may
create the PM Workspace Membership and the team membership in the same transaction (in that
order). A deferred FK allows both writes to succeed within the transaction and validates at
commit time, preventing a chicken-and-egg ordering problem while still enforcing the
constraint before the transaction commits.

**Service-layer enforcement (backend guard — do not skip):**

Even with the deferred FK, the `ProjectsWorkspaceMembersService` and any team/project
membership write service must:
1. Verify the caller/target principal has an active `pm_workspace_memberships` row for the
   relevant workspace before inserting a team/project member.
2. Return a 409 with a descriptive message if not ("User must be a PM Workspace Member first").
3. Revoking a PM Workspace Membership: call `bumpPermissionsVersion` and verify no
   active team/project memberships exist for that principal, or cascade-revoke them in the
   same transaction.

**Validation:**
- INSERT a `project_team_members` row for a user with no `pm_workspace_memberships` row in
  that workspace: transaction must fail at commit with a FK violation.
- INSERT with a valid `pm_workspace_memberships` row: succeeds.
- Revoking `pm_workspace_memberships` row where team/project memberships exist: fails with
  FK violation (restrict); service-layer must revoke downstreams first.

**Rollback:** Drop the two deferred FKs and the `pm_workspace_id` / `organization_membership_id`
columns added in 7a. Step 7b can be rolled back independently of 7a.

---

## Gap status and blocking matrix

| ADR Gap | Step | Blocked on | Status |
|---|---|---|---|
| G3 — no generated migration | Step 1 | Nothing — unblocked NOW | Unblocked |
| G1 — single-col membership FK | Step 2 | Nothing — `uniq_org_members_org_id` exists NOW | Unblocked |
| G4 — provisioning not wired | Step 3 | Step 1 (schema available) | Blocked on Step 1 |
| ADR §3.6 — roster backfill | Step 4 | Steps 1 + 3 | Blocked on Steps 1 + 3 |
| G2 — pm_workspace_id NOT NULL + composite FKs | Step 5 | Steps 1 + 3 (backfill done) | Blocked on Steps 1 + 3 |
| G5 — managed_products strategy fields + candidate key | Step 6 | Step 5 (workspace FK first) | Blocked on Step 5 |
| G6 — team/project membership proves PM WS membership | Step 7 | Steps 4 + 5 | Blocked on Steps 4 + 5 |

**Wave 4 dependency check:** G1 (Step 2) was erroneously noted in one matrix as "blocked on
Wave 4." It is NOT blocked on Wave 4. The candidate key `uniq_org_members_org_id` on
`organization_members(org_id, id)` already exists (verified in `auth.ts` line 84). G2/G5/G6
are NOT blocked on Wave 4 either — they reference only `pm_workspaces`, which is already a
landed schema with the correct candidate key. Wave 4 (broad composite-FK rollout across
~205 tables) is a parallel track; none of Wave 7's PM work depends on it.

---

## Migration order summary (dependency graph)

```
Step 1 (G3 — generate migration)
  └── Step 2 (G1 — composite membership FK)   [can run in parallel with Step 1]
  └── Step 3 (G4 — provisioning hook)
        └── Step 4 (roster backfill)
              └── Step 5 (G2 — NOT NULL + composite FKs on children)
                    └── Step 6 (G5 — managed_products fields + candidate key)
                    └── Step 7 (G6 — team/project membership deferred FKs)
```

Steps 1 and 2 can be done in the same `db:generate` pass (one migration file handles both
the table creation and the composite FK fix on the memberships table).

---

## Commands reference

```bash
# Generate migration (from repo root, backend dir)
pnpm -C backend db:generate

# Apply to Neon branch
pnpm -C backend db:migrate

# Verify zero pending diff after migration
pnpm -C backend db:generate   # should produce "no changes"

# TypeScript compile check after schema edits
pnpm -C backend tsc --noEmit

# Lint
pnpm -C backend lint
```

Never run `db:push` against anything but a local/branch dev database. Never apply
`db:migrate` against the main Neon database without a branch verification pass first.

---

## Definition of done (Wave 7 PM hierarchy)

- [ ] G3 closed: journaled Drizzle migration for `pm_workspaces` + `pm_workspace_memberships`.
- [ ] G1 closed: composite FK `(org_id, organization_membership_id) → organization_members(org_id, id)` on `pm_workspace_memberships`.
- [ ] G4 closed: `setModuleEnabled("projects", true)` transactionally provisions the default PM Workspace.
- [ ] ADR §3.6: `project_workspace_members` roster backfilled into `pm_workspace_memberships` under the default workspace; dropped rows logged.
- [ ] G2 closed: `pm_workspace_id NOT NULL` + composite FK `(org_id, pm_workspace_id) → pm_workspaces(org_id, pm_workspace_id)` on `projects`, `project_teams`, `managed_products`, `project_client_grants`.
- [ ] G5 closed: `managed_products` gains strategy/roadmap fields + candidate key `UNIQUE(org_id, managed_product_id)`.
- [ ] G6 closed: `project_team_members` and `project_members` gain `pm_workspace_id` + `organization_membership_id`; deferred composite FK proves active PM Workspace Membership at commit.
- [ ] `db:generate` after all steps produces an empty diff.
- [ ] TypeScript compile clean (`pnpm -C backend tsc --noEmit`).
- [ ] Lint clean.
- [ ] `PAGES.md` updated with Wave 7 PM hierarchy status.
