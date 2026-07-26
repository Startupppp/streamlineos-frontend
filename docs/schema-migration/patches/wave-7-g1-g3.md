---
type: wave-7 G1+G3 patch spec
status: DRAFT
date: 2026-07-26
covers: ADR gaps G3 (journal pm_workspaces migration) + G1 (composite membership FK)
authority: wave-0-pm-reconciliation-adr.md §3.3, §4 rows G1+G3
next-migration-idx: 21
suggested-tag: 0305_pm_workspaces_g1_g3
---

# Wave 7 — G3 + G1 patch spec (reviewable, not applied)

Both gaps are unblocked simultaneously and collapse into **one `db:generate` pass** producing
**one migration file**. Apply G3 (table DDL) and G1 (composite FK) together. The backfill DML
from `wave-7-pm-workspaces.sql` §§3–6 is hand-appended into the same migration file after
generation. Do not apply this patch to the main Neon database — branch-verify first.

---

## Pre-flight verification (run before touching any file)

```sql
-- 1. Confirm uniq_org_members_org_id exists and covers (org_id, id):
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'organization_members'
  AND indexname = 'uniq_org_members_org_id';
-- Expected: one row, indexdef contains "UNIQUE" and columns "org_id, id"

-- 2. Confirm pm_workspaces does NOT yet exist in this Neon branch:
SELECT to_regclass('public.pm_workspaces');
-- Expected: NULL (table not yet created on branch)

-- 3. Confirm pm_workspace_memberships does NOT yet exist:
SELECT to_regclass('public.pm_workspace_memberships');
-- Expected: NULL

-- If either table already exists (wave-7-pm-workspaces.sql was applied out-of-band),
-- see "Side-channel SQL absorption" section below.
```

---

## G3 — Generate + journal the Drizzle migration

### What this closes

The Drizzle schema files `backend/src/db/schema/projects/pm-workspaces.ts` and
`backend/src/db/schema/projects/pm-workspace-memberships.ts` exist in the repo but have
**never been run through `db:generate`**. The migration journal has no record of these tables.
`wave-7-pm-workspaces.sql` applied the DDL as a side-channel script. This gap means:

- `db:generate` currently sees both tables as a pending diff.
- Without a journal entry, `db:migrate` will re-create the tables on any fresh branch.
- Future `db:generate` calls will accumulate drift.

### Exact schema that `db:generate` will see

**`pm_workspaces`** (from `backend/src/db/schema/projects/pm-workspaces.ts` as-is):

```sql
CREATE TABLE "pm_workspaces" (
  "pm_workspace_id" text PRIMARY KEY,
  "org_id"          text NOT NULL,
  "name"            text NOT NULL,
  "slug"            text NOT NULL,
  "is_default"      boolean NOT NULL DEFAULT false,
  "status"          text NOT NULL DEFAULT 'active',
  "deleted_at"      timestamp,
  "created_at"      timestamp NOT NULL DEFAULT now(),
  "updated_at"      timestamp NOT NULL DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "pm_workspaces"
  ADD CONSTRAINT "pm_workspaces_org_id_organizations_id_fk"
  FOREIGN KEY ("org_id")
  REFERENCES "public"."organizations"("id")
  ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "pm_workspaces"
  ADD CONSTRAINT "uniq_pm_workspaces_org_workspace"
  UNIQUE ("org_id", "pm_workspace_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_pm_workspaces_org_default"
  ON "pm_workspaces" ("org_id")
  WHERE is_default = true;
--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_pm_workspaces_org_slug"
  ON "pm_workspaces" ("org_id", "slug");
--> statement-breakpoint
CREATE INDEX "idx_pm_workspaces_org"
  ON "pm_workspaces" ("org_id");
```

Notes on the generated form:
- Drizzle emits the column `$defaultFn(() => randomUUID())` as no SQL default (it is
  application-side only); the `pm_workspace_id` column will appear as `text PRIMARY KEY`
  with no `DEFAULT` clause. That is correct — the service layer supplies the UUID.
- `status text NOT NULL DEFAULT 'active'` matches `.default("active").notNull()`.
- The `unique("uniq_pm_workspaces_org_workspace")` in the table config array emits as
  an `ALTER TABLE … ADD CONSTRAINT … UNIQUE` (named constraint), not a `CREATE UNIQUE INDEX`.
- The two `uniqueIndex` calls emit as `CREATE UNIQUE INDEX` statements.

**`pm_workspace_memberships`** (from `backend/src/db/schema/projects/pm-workspace-memberships.ts`
**after the G1 edit described below** — generate both tables in one pass):

```sql
CREATE TABLE "pm_workspace_memberships" (
  "pm_workspace_membership_id" text PRIMARY KEY,
  "org_id"                     text NOT NULL,
  "pm_workspace_id"            text NOT NULL,
  "organization_membership_id" integer NOT NULL,
  "role"                       text NOT NULL DEFAULT 'member',
  "added_at"                   timestamp NOT NULL DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "pm_workspace_memberships"
  ADD CONSTRAINT "pm_workspace_memberships_org_id_organizations_id_fk"
  FOREIGN KEY ("org_id")
  REFERENCES "public"."organizations"("id")
  ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "pm_workspace_memberships"
  ADD CONSTRAINT "fk_pm_ws_members_org_workspace"
  FOREIGN KEY ("org_id", "pm_workspace_id")
  REFERENCES "public"."pm_workspaces"("org_id", "pm_workspace_id")
  ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "pm_workspace_memberships"
  ADD CONSTRAINT "fk_pm_ws_members_org_membership"
  FOREIGN KEY ("org_id", "organization_membership_id")
  REFERENCES "public"."organization_members"("org_id", "id")
  ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "pm_workspace_memberships"
  ADD CONSTRAINT "uniq_pm_ws_members_org_ws_member"
  UNIQUE ("org_id", "pm_workspace_id", "organization_membership_id");
--> statement-breakpoint
CREATE INDEX "idx_pm_ws_members_org_ws"
  ON "pm_workspace_memberships" ("org_id", "pm_workspace_id");
--> statement-breakpoint
CREATE INDEX "idx_pm_ws_members_membership"
  ON "pm_workspace_memberships" ("organization_membership_id");
```

Notes:
- The **G1 edit is a prerequisite to generating this block** — the inline
  `.references(() => organizationMembers.id, { onDelete: "cascade" })` on
  `organizationMembershipId` must be removed and replaced with the table-level
  `foreignKey()` block (see G1 section below) **before** running `db:generate`.
  Running generate before the G1 edit will produce a single-column FK named
  `pm_workspace_memberships_organization_membership_id_organization_members_id_fk`
  instead of the composite `fk_pm_ws_members_org_membership`.
- The `fk_pm_ws_members_org_workspace` constraint references `pm_workspaces(org_id,
  pm_workspace_id)` — Drizzle will emit this as the named composite FK targeting the
  `uniq_pm_workspaces_org_workspace` candidate key.
- The `fk_pm_ws_members_org_membership` composite FK targets
  `organization_members(org_id, id)`, backed by `uniq_org_members_org_id` (verified
  present, `auth.ts` line 84).

### Side-channel SQL absorption

`wave-7-pm-workspaces.sql` was applied (or staged) on the branch via `docs/schema-migration/`.
Its §1 and §2 create the same tables and constraints that `db:generate` will produce. Two
scenarios and their resolution:

**Scenario A — tables do NOT yet exist on the Neon branch (normal path):**

Run `db:generate` (after the G1 edit). Apply the generated migration with `db:migrate`. The
generated DDL covers §1 and §2 of the SQL file. Hand-append the backfill DML from §§3–6
directly inside the generated migration file (between the `---> statement-breakpoint` DDL
and a closing comment), before committing the migration to git. This keeps backfill and DDL
in one atomic `db:migrate` run.

**Scenario B — tables already exist on the Neon branch (SQL applied out-of-band):**

Drizzle's `db:generate` will still produce the same DDL (it reads the Drizzle schema, not
the live DB). The migration will fail at `CREATE TABLE` because the tables already exist.
Resolution:

1. Run `db:generate` to produce the migration file.
2. Wrap the `CREATE TABLE` statements with `IF NOT EXISTS` guards manually, OR resolve the
   Drizzle snapshot by running `db:generate --custom` (no-op migration) and manually editing
   the generated SQL to match the live state.
3. The constraint `IF NOT EXISTS` guards used in `wave-7-pm-workspaces.sql` §§1–2 can be
   reused verbatim here for idempotency.
4. Apply with `db:migrate`. After successful migration, run `db:generate` again — it must
   produce zero pending changes.

In both scenarios, the §§3–6 backfill DML from `wave-7-pm-workspaces.sql` is absorbed into
the migration file as a hand-authored block. The SQL file is then retired (kept in
`docs/schema-migration/` as a historical reference, but marked as absorbed).

### Backfill block to append (hand-authored, not generated)

Append this block at the end of the generated migration file, after all `---> statement-breakpoint`
DDL and before the final blank line:

```sql
-- =============================================================================
-- Hand-authored backfill — not generated by db:generate (DML, not DDL).
-- Absorbed from docs/schema-migration/wave-7-pm-workspaces.sql §§3–6.
-- =============================================================================

-- §3. Nullable pm_workspace_id on PM children (additive, idempotent):
ALTER TABLE projects ADD COLUMN IF NOT EXISTS pm_workspace_id text;
ALTER TABLE managed_products ADD COLUMN IF NOT EXISTS pm_workspace_id text;
ALTER TABLE project_teams ADD COLUMN IF NOT EXISTS pm_workspace_id text;
ALTER TABLE project_workspace_members ADD COLUMN IF NOT EXISTS pm_workspace_id text;

-- §4. Provision exactly one default PM Workspace per eligible org (idempotent):
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

-- §5. Backfill pm_workspace_id on PM children to their org's default workspace:
UPDATE projects p
  SET pm_workspace_id = w.pm_workspace_id
  FROM pm_workspaces w
  WHERE w.org_id = p.org_id AND w.is_default = true AND p.pm_workspace_id IS NULL;

UPDATE managed_products m
  SET pm_workspace_id = w.pm_workspace_id
  FROM pm_workspaces w
  WHERE w.org_id = m.org_id AND w.is_default = true AND m.pm_workspace_id IS NULL;

UPDATE project_teams t
  SET pm_workspace_id = w.pm_workspace_id
  FROM pm_workspaces w
  WHERE w.org_id = t.org_id AND w.is_default = true AND t.pm_workspace_id IS NULL;

UPDATE project_workspace_members pwm
  SET pm_workspace_id = w.pm_workspace_id
  FROM pm_workspaces w
  WHERE w.org_id = pwm.org_id AND w.is_default = true AND pwm.pm_workspace_id IS NULL;

-- §6. Backfill pm_workspace_memberships from the legacy org roster:
INSERT INTO pm_workspace_memberships
  (pm_workspace_membership_id, org_id, pm_workspace_id, organization_membership_id, role)
SELECT
  gen_random_uuid()::text,
  pwm.org_id,
  w.pm_workspace_id,
  om.id,
  'member'
FROM project_workspace_members pwm
JOIN pm_workspaces w
  ON w.org_id = pwm.org_id AND w.is_default = true
JOIN organization_members om
  ON om.org_id = pwm.org_id AND om.user_id = pwm.user_id
ON CONFLICT (org_id, pm_workspace_id, organization_membership_id) DO NOTHING;

-- Rows in project_workspace_members with no matching organization_members row
-- (user left or was never a full member) are silently excluded from the backfill.
-- Run the following to count dropped rows post-migration and review if non-zero:
--   SELECT count(*) FROM project_workspace_members pwm
--   WHERE NOT EXISTS (
--     SELECT 1 FROM organization_members om
--     WHERE om.org_id = pwm.org_id AND om.user_id = pwm.user_id
--   );
```

### Post-migration validation for G3

```sql
-- All eligible orgs have exactly one default workspace:
SELECT count(*) FROM pm_workspaces WHERE is_default = true;
-- Must equal the count from the provisioning SELECT above.

-- No PM children left without a workspace (for eligible orgs):
SELECT count(*) FROM projects WHERE pm_workspace_id IS NULL;
SELECT count(*) FROM managed_products WHERE pm_workspace_id IS NULL;
SELECT count(*) FROM project_teams WHERE pm_workspace_id IS NULL;

-- Zero pending Drizzle diff:
-- pnpm -C backend db:generate   → must output "No schema changes detected"
```

---

## G1 — Composite FK on `pm_workspace_memberships.organization_membership_id`

### Unblocked confirmation

`organization_members` has `uniqueIndex("uniq_org_members_org_id").on(table.orgId, table.id)`
(verified: `backend/src/db/schema/auth.ts` line 84). A named `uniqueIndex` in Drizzle compiles
to a `CREATE UNIQUE INDEX` statement — this is the candidate key that backs the composite FK.
Postgres allows a composite FK to reference a `UNIQUE INDEX` (not only a `UNIQUE` constraint),
so this key is a valid FK target. **G1 is unblocked with zero prerequisite work.**

### Current state of `pm-workspace-memberships.ts` (the problem)

`organizationMembershipId` currently carries an inline `.references()`:

```ts
organizationMembershipId: integer("organization_membership_id")
  .references(() => organizationMembers.id, { onDelete: "cascade" })
  .notNull(),
```

This generates a **single-column** FK:

```
pm_workspace_memberships_organization_membership_id_organization_members_id_fk
  FOREIGN KEY (organization_membership_id) → organization_members(id)
```

That FK allows a membership row where `org_id = "org-A"` to reference an
`organization_members.id` that belongs to `"org-B"` — a cross-tenant membership is not
rejected at the DB layer. ADR §3.3 requires the composite reference to make cross-tenant
access structurally impossible.

### Drizzle schema change (exact before → after)

**File:** `backend/src/db/schema/projects/pm-workspace-memberships.ts`

**Before** (column definition, lines 29–31):

```ts
organizationMembershipId: integer("organization_membership_id")
  .references(() => organizationMembers.id, { onDelete: "cascade" })
  .notNull(),
```

**After** (remove the inline `.references()` — leave only `.notNull()`):

```ts
organizationMembershipId: integer("organization_membership_id")
  .notNull(),
```

**Before** (table config array, lines 46–50 — existing composite FK block, keep as-is):

```ts
foreignKey({
  columns: [t.orgId, t.pmWorkspaceId],
  foreignColumns: [pmWorkspaces.orgId, pmWorkspaces.pmWorkspaceId],
  name: "fk_pm_ws_members_org_workspace",
}).onDelete("cascade"),
```

**After** (add a second `foreignKey` entry immediately after the first, inside the same
table config array):

```ts
foreignKey({
  columns: [t.orgId, t.pmWorkspaceId],
  foreignColumns: [pmWorkspaces.orgId, pmWorkspaces.pmWorkspaceId],
  name: "fk_pm_ws_members_org_workspace",
}).onDelete("cascade"),
foreignKey({
  columns: [t.orgId, t.organizationMembershipId],
  foreignColumns: [organizationMembers.orgId, organizationMembers.id],
  name: "fk_pm_ws_members_org_membership",
}).onDelete("cascade"),
```

The full table config array after the edit:

```ts
(t) => [
  unique("uniq_pm_ws_members_org_ws_member").on(
    t.orgId,
    t.pmWorkspaceId,
    t.organizationMembershipId,
  ),
  index("idx_pm_ws_members_org_ws").on(t.orgId, t.pmWorkspaceId),
  index("idx_pm_ws_members_membership").on(t.organizationMembershipId),
  foreignKey({
    columns: [t.orgId, t.pmWorkspaceId],
    foreignColumns: [pmWorkspaces.orgId, pmWorkspaces.pmWorkspaceId],
    name: "fk_pm_ws_members_org_workspace",
  }).onDelete("cascade"),
  foreignKey({
    columns: [t.orgId, t.organizationMembershipId],
    foreignColumns: [organizationMembers.orgId, organizationMembers.id],
    name: "fk_pm_ws_members_org_membership",
  }).onDelete("cascade"),
]
```

### Generated SQL for G1 (emitted inside the same migration file as G3)

Because the table is being created fresh (G3), the FK is emitted in the initial `CREATE TABLE`
pass as an `ALTER TABLE … ADD CONSTRAINT` after the `CREATE TABLE`. There is no separate
DROP+ADD of the old FK — the table does not exist yet, so there is no old FK to drop.

For the **Scenario B** case (table already exists on branch), the generated SQL for G1 alone
would be:

```sql
-- Drop the single-column FK (auto-named by Drizzle):
ALTER TABLE "pm_workspace_memberships"
  DROP CONSTRAINT IF EXISTS
  "pm_workspace_memberships_organization_membership_id_organization_members_id_fk";
--> statement-breakpoint

-- Add the composite FK (uses the candidate key uniq_org_members_org_id):
ALTER TABLE "pm_workspace_memberships"
  ADD CONSTRAINT "fk_pm_ws_members_org_membership"
  FOREIGN KEY ("org_id", "organization_membership_id")
  REFERENCES "public"."organization_members"("org_id", "id")
  ON DELETE cascade ON UPDATE no action;
```

This is what `db:generate` would produce as a standalone diff if the table already existed
with the old single-column FK in place. In Scenario A (fresh CREATE TABLE), there is no DROP
step — the `ADD CONSTRAINT "fk_pm_ws_members_org_membership"` appears alongside the other
post-CREATE FK constraints.

### Tenant-isolation invariant enforced after G1

Before G1: a `pm_workspace_memberships` row with `org_id = "org-A"` and
`organization_membership_id = 99` would succeed even if membership 99 belonged to `"org-B"`.
The single-column FK only checked that `id = 99` existed in `organization_members`.

After G1: the composite FK `(org_id, organization_membership_id) → organization_members(org_id, id)`
requires that a row with `(org_id = "org-A", id = 99)` exists in `organization_members`. If
membership 99 belongs to `"org-B"`, the insert is rejected. Cross-tenant membership is
structurally impossible at the DB layer.

### Post-migration validation for G1

```sql
-- Confirm the composite FK exists with the correct name:
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'pm_workspace_memberships'::regclass
  AND conname = 'fk_pm_ws_members_org_membership';
-- Expected: one row; constraintdef shows FOREIGN KEY (org_id, organization_membership_id)
--           REFERENCES organization_members(org_id, id) ON DELETE CASCADE

-- Confirm the old single-column FK is gone:
SELECT conname
FROM pg_constraint
WHERE conrelid = 'pm_workspace_memberships'::regclass
  AND conname LIKE '%organization_membership_id_organization_members%';
-- Expected: zero rows

-- Cross-tenant rejection test (run in a transaction, then ROLLBACK):
BEGIN;
INSERT INTO pm_workspace_memberships
  (pm_workspace_membership_id, org_id, pm_workspace_id, organization_membership_id, role)
VALUES
  (gen_random_uuid()::text,
   'org-A',                -- pick a real org-A id from your branch
   (SELECT pm_workspace_id FROM pm_workspaces WHERE org_id = 'org-A' AND is_default LIMIT 1),
   (SELECT id FROM organization_members WHERE org_id = 'org-B' LIMIT 1),  -- deliberately wrong org
   'member');
-- Expected: ERROR: insert or update on table "pm_workspace_memberships" violates foreign key constraint
ROLLBACK;
```

---

## Execution order (both gaps in one pass)

```
1. Apply G1 Drizzle edit to pm-workspace-memberships.ts   (READ-ONLY guard: user must apply)
2. pnpm -C backend db:generate                             (produces 0305_pm_workspaces_g1_g3.sql)
3. Hand-append backfill DML block (§§3–6) to the generated file
4. pnpm -C backend db:migrate                              (on Neon branch)
5. Run validation queries (G3 + G1 sections above)
6. pnpm -C backend db:generate                             (must output: no changes)
7. pnpm -C backend tsc --noEmit                            (must pass clean)
8. pnpm -C backend lint                                    (must pass clean)
9. Mark wave-7-pm-workspaces.sql as absorbed in its header comment
```

Steps 3 and 4 require that the Drizzle snapshot JSON (`migrations/meta/*.json`) is updated
by `db:generate` to reflect the new schema state — do not manually edit the snapshot.

---

## What this patch does NOT cover

- G2 (NOT NULL + composite FK on `pm_workspace_id` for PM children) — blocked on Step 1 backfill landing + G4 provisioning hook.
- G4 (`setModuleEnabled` provisioning hook in `entitlements.service.ts`) — blocked on G3 landing.
- G5, G6 — downstream of G2/G4.
- The `wave-7-composite-fk-matrix.md` W7-A through W7-H track — parallel, not a prerequisite here.

---

## Files changed by this patch

| File | Change |
|---|---|
| `backend/src/db/schema/projects/pm-workspace-memberships.ts` | G1 edit: remove inline `.references()` on `organizationMembershipId`; add `foreignKey({ columns: [t.orgId, t.organizationMembershipId], … name: "fk_pm_ws_members_org_membership" }).onDelete("cascade")` to table config. |
| `backend/migrations/0305_pm_workspaces_g1_g3.sql` | Generated by `db:generate` + hand-appended backfill block §§3–6. |
| `backend/migrations/meta/_journal.json` | Updated by `db:generate` — entry `{ idx: 21, tag: "0305_pm_workspaces_g1_g3", … }`. |
| `backend/migrations/meta/0305_snapshot.json` | Generated by `db:generate`. |
| `docs/schema-migration/wave-7-pm-workspaces.sql` | Mark header: `-- STATUS: ABSORBED into migration 0305_pm_workspaces_g1_g3. Retained for reference.` |
