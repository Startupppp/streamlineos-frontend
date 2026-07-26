---
wave: 8
title: PM Hierarchy — managed_products + product_management_members rename
status: DESIGN (not yet executing)
depends_on: waves 0–7 stable; refactoring-hrms Projects Members/Teams work landed
date: 2026-07-26
author: architecture review
---

# Wave 8 — Product Management Hierarchy Design

> **Prerequisite.** Waves 0–7 must be stable and the in-flight Projects Members/Teams work
> on branch `refactoring-hrms` must be committed/merged before ANY schema change in this wave
> (see §6 — collision risk). This doc is analysis + design only; zero source files are modified.

---

## 1. Existing table inventory (verified from repo)

### `backend/src/db/schema/project-teams.ts`

| Table | PK type | Key columns | Notes |
|-------|---------|-------------|-------|
| `project_teams` | `integer` (`generatedAlwaysAsIdentity`) | `org_id text NOT NULL`, `name`, `key`, `icon`, `color`, `is_private`, `deleted_at` | Delivery Teams — org-scoped; `UNIQUE(org_id, key)`. |
| `project_team_members` | `integer` (`generatedAlwaysAsIdentity`) | `org_id`, `team_id → project_teams`, `user_id → users`, `role text DEFAULT 'member'`, `joined_at` | M:N users↔teams; `UNIQUE(team_id, user_id)`. |
| `project_workspace_members` | `integer` (`generatedAlwaysAsIdentity`) | `org_id`, `user_id → users`, `role text DEFAULT 'member'`, `added_at` | **THE RENAME TARGET** — PM module access roster. `UNIQUE(org_id, user_id)`. |
| `project_team_assignments` | `integer` (`generatedAlwaysAsIdentity`) | `org_id`, `project_id → projects`, `team_id → project_teams`, `added_at` | M:N projects↔teams; `UNIQUE(project_id, team_id)`. |

### `backend/src/db/schema/projects/core.ts`

| Table | PK type | Key columns | Notes |
|-------|---------|-------------|-------|
| `projects` | `serial` | `org_id`, `name`, `key`, `manager_id`, `start_date`, `end_date`, `status`, `deal_id → deals`, `budget`, `settings jsonb` | Core delivery unit; `UNIQUE(org_id, key)`. **No `managed_product_id` column today.** |
| `sprints` | `serial` | `org_id`, `project_id`, `name`, `status` | Sprint container. |
| `modules` | `serial` | `org_id`, `project_id`, `name`, `status`, `lead_id` | Project-level module grouping. |

### `backend/src/db/schema/projects/portfolios.ts`

| Table | PK type | Key columns | Notes |
|-------|---------|-------------|-------|
| `project_portfolios` | `serial` | `org_id`, `name`, `owner_id`, `status`, `health`, `strategic_goal`, `deleted_at` | Portfolio container. |
| `project_programs` | `serial` | `org_id`, `portfolio_id → project_portfolios`, `name`, `status`, `health`, `deleted_at` | Program layer inside a portfolio. |
| `portfolio_projects` | `serial` | `org_id`, `portfolio_id`, `project_id → projects` | M:N portfolio↔projects; `UNIQUE(portfolio_id, project_id)`. |
| `program_projects` | `serial` | `org_id`, `program_id`, `project_id → projects` | M:N program↔projects; `UNIQUE(program_id, project_id)`. |

### `backend/src/modules/projects-teams/` (service layer — in-flight on `refactoring-hrms`)

`TeamsService` / `TeamsController` implement full CRUD for `project_teams`, `project_team_members`, and
`project_team_assignments`. It imports `projectWorkspaceMembers` as a dependency (workspace-member
check during team-member add). This is **the in-flight work that must land first** (§6).

### `backend/src/modules/projects/projects-workspace-members.{service,controller}.ts`

`ProjectsWorkspaceMembersService` — list, add, remove for `project_workspace_members`. Joins to
`users` for display. API: `GET/POST /projects/members`, `DELETE /projects/members/:userId`.

---

## 2. Target hierarchy (NO pm_workspaces container)

```
Organization
└── Product Management   (module, org-scoped, no extra container table)
    ├── Product Management Members   (access roster — renamed from project_workspace_members)
    ├── Managed Products             (NEW table: managed_products)
    │   └── Projects (optional link: projects.managed_product_id)
    ├── Delivery Teams               (existing: project_teams / project_team_assignments)
    └── Portfolios / Programs        (existing: project_portfolios / project_programs)
```

**What this design does NOT add:** there is no `pm_workspaces`, `pm_containers`, or any extra
container table between Organization and these entities. Product Management hangs directly off
`org_id`. Every entity below is already org-scoped or will be org-scoped through its new FK.

---

## 3. Change 1 — rename `project_workspace_members` → `product_management_members`

### 3.1 Why rename

`project_workspace_members` embeds the banned "workspace" term (§0 firm rule). More importantly the
name is semantically wrong: the table is not a per-project roster and not a "workspace" (there is
no workspace container). It is the org-level roster of users granted access to the Product
Management module — an **access grant over an Organization Membership**.

### 3.2 Expand → contract rename plan (NOT big-bang)

Big-bang renames on a table with live reads/writes risk downtime. The safe path:

**Step A — expand (shadow/alias read parity)**

```sql
-- Migration: create the new table as an identical structure
CREATE TABLE product_management_members (
  id          integer      PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  org_id      text         NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id     text         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role        text         NOT NULL DEFAULT 'member',
  added_at    timestamptz  NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX uniq_pm_members_org_user
  ON product_management_members(org_id, user_id);
CREATE INDEX idx_pm_members_org
  ON product_management_members(org_id);

-- Backfill all existing rows
INSERT INTO product_management_members (org_id, user_id, role, added_at)
SELECT org_id, user_id, role, added_at
FROM project_workspace_members
ON CONFLICT (org_id, user_id) DO NOTHING;
```

A **sync trigger** on `project_workspace_members` keeps both tables consistent during the
overlap period (dual-write window):

```sql
CREATE OR REPLACE FUNCTION sync_pm_members_insert() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO product_management_members(org_id, user_id, role, added_at)
  VALUES (NEW.org_id, NEW.user_id, NEW.role, NEW.added_at)
  ON CONFLICT (org_id, user_id) DO UPDATE SET role = EXCLUDED.role;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_sync_pm_members_insert
  AFTER INSERT OR UPDATE ON project_workspace_members
  FOR EACH ROW EXECUTE FUNCTION sync_pm_members_insert();

CREATE OR REPLACE FUNCTION sync_pm_members_delete() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  DELETE FROM product_management_members
  WHERE org_id = OLD.org_id AND user_id = OLD.user_id;
  RETURN OLD;
END;
$$;

CREATE TRIGGER trg_sync_pm_members_delete
  AFTER DELETE ON project_workspace_members
  FOR EACH ROW EXECUTE FUNCTION sync_pm_members_delete();
```

**Step B — tolerant backend (dual-read)**

Update `ProjectsWorkspaceMembersService` to read from `product_management_members` while
writing to BOTH tables (the trigger handles the backward copy). Run in parallel with Step A
behind a feature flag.

**Step C — switch all writes to the new table**

Update service to write to `product_management_members` only. The sync trigger now runs
BACKWARD (new → old) — update it accordingly so legacy readers of `project_workspace_members`
still see current data during the final overlap window.

**Step D — observe two releases, then contract**

Once no service reads `project_workspace_members`, drop the triggers and the old table in a
final migration. Drop the compat triggers.

**Step E — Drizzle schema**

After Step C flip, update `backend/src/db/schema/project-teams.ts`:

```ts
// REMOVE:
export const projectWorkspaceMembers = pgTable("project_workspace_members", { … });

// ADD (in same file or in a new product-management/ folder per Wave 4 reorg):
export const productManagementMembers = pgTable(
  "product_management_members",
  {
    id:      integer("id").primaryKey().generatedAlwaysAsIdentity(),
    orgId:   text("org_id")
               .references(() => organizations.id, { onDelete: "cascade" })
               .notNull(),
    userId:  text("user_id")
               .references(() => users.id, { onDelete: "cascade" })
               .notNull(),
    role:    text("role").notNull().default("member"),
    addedAt: timestamp("added_at").defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("uniq_pm_members_org_user").on(t.orgId, t.userId),
    index("idx_pm_members_org").on(t.orgId),
  ],
);
```

### 3.3 Backend rename map

| Old symbol | New symbol | File |
|-----------|-----------|------|
| `projectWorkspaceMembers` (Drizzle table) | `productManagementMembers` | `db/schema/project-teams.ts` → move to `product-management/` in Wave 4 reorg |
| `ProjectsWorkspaceMembersService` | `ProductManagementMembersService` | `modules/projects/projects-workspace-members.service.ts` → new module path |
| `ProjectsWorkspaceMembersController` | `ProductManagementMembersController` | same file → new module path |
| `dto/projects-workspace-members.schemas.ts` | `dto/pm-members.schemas.ts` | |
| `AddWorkspaceMemberInput` / `ListWorkspaceMembersInput` | `AddPmMemberInput` / `ListPmMembersInput` | |
| API route `GET /projects/members` | **keep the existing route path** during overlap; add alias `GET /pm/members` | rename is Wave 11 (full `projects → product-management` rename) |

### 3.4 Frontend rename map

| Old file / symbol | New file / symbol |
|------------------|------------------|
| `frontend/hooks/api/projects/workspace-members.ts` | `frontend/hooks/api/projects/pm-members.ts` |
| `useProjectWorkspaceMembers` | `usePmMembers` |
| `useAddProjectWorkspaceMember` | `useAddPmMember` |
| `useRemoveProjectWorkspaceMember` | `useRemovePmMember` |
| `ProjectWorkspaceMember` (interface) | `PmMember` |
| `WorkspaceMembersResponse` | `PmMembersResponse` |
| `WORKSPACE_MEMBERS_BASE` query key | `PM_MEMBERS_BASE` |
| `projectWorkspaceMembersQueryKeys` | `pmMembersQueryKeys` |
| `frontend/features/projects/teams/workspace-member-picker.tsx` | `pm-member-picker.tsx` |
| `WorkspaceMemberPicker` (component) | `PmMemberPicker` |

Files that import the old hook and need updating (all on the frontend):
- `frontend/features/projects/teams/team-home-page.tsx`
- `frontend/features/projects/members/members-page.tsx`
- `frontend/features/projects/settings/project-members-section.tsx`
- `frontend/components/members/member-picker.tsx`
- `frontend/hooks/api/projects/projects.ts` (any `workspaceMembers` query key reference)
- `frontend/app/(authenticated)/projects/members/error.tsx` ("workspace members" copy string)

---

## 4. Change 2 — new `managed_products` table

### 4.1 Rationale

A **Managed Product** is the enduring, named thing a team builds or maintains over time (a
product, platform, service, or business capability). A Project is the time-bounded initiative
that advances work on a Managed Product. A Delivery Team typically owns one or more Managed
Products and runs Projects against them.

This concept does not exist in the schema today. `projects.name` is reused as the "product"
label when no grouping exists above the project, leading to duplication: teams create one
project per product and treat the project as if it never ends.

### 4.2 Drizzle sketch

```ts
// backend/src/db/schema/product-management/managed-products.ts
// (file location assumes Wave 4 schema-folder reorg has landed; if it has not,
//  place next to project-teams.ts and move in Wave 4)

import {
  pgTable,
  pgEnum,
  integer,
  text,
  boolean,
  timestamp,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { organizations } from "../common/tenancy";   // or "../auth" before Wave 4 reorg
import { users } from "../common/identity";           // or "../auth"

export const managedProductStatusEnum = pgEnum("managed_product_status", [
  "active",
  "deprecated",
  "archived",
]);

export const managedProducts = pgTable(
  "managed_products",
  {
    managedProductId: integer("managed_product_id")
      .primaryKey()
      .generatedAlwaysAsIdentity(),
    orgId: text("org_id")
      .references(() => organizations.id, { onDelete: "cascade" })
      .notNull(),
    name: text("name").notNull(),
    description: text("description"),
    key: text("key").notNull(),           // short identifier, e.g. "PLAT", "APP"
    icon: text("icon"),
    color: text("color"),
    ownerId: text("owner_id")             // PM lead / product owner
      .references(() => users.id, { onDelete: "set null" }),
    status: managedProductStatusEnum("status").notNull().default("active"),
    isPrivate: boolean("is_private").notNull().default(false),
    createdBy: text("created_by")
      .references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
    deletedAt: timestamp("deleted_at"),
  },
  (t) => [
    // tenant-composite unique key (§19 — unique per org, never globally unique)
    uniqueIndex("uniq_managed_products_org_key").on(t.orgId, t.key),
    index("idx_managed_products_org_status").on(t.orgId, t.status),
    index("idx_managed_products_owner").on(t.ownerId),
  ],
);
```

**PK discipline (§0 firm rule):** the PK column is named `managed_product_id`, not bare `id`.
The FK from `projects` will be named `managed_product_id` — descriptive end-to-end.

### 4.3 OPTIONAL link: `projects.managed_product_id`

A project may belong to at most one Managed Product. The link is **nullable/optional** — an
org that does not use Managed Products simply leaves it null.

```ts
// ADDITIVE migration on projects table:
// ALTER TABLE projects ADD COLUMN managed_product_id integer
//   REFERENCES managed_products(managed_product_id) ON DELETE SET NULL;
// CREATE INDEX idx_projects_managed_product ON projects(managed_product_id);
```

Drizzle core schema update (`backend/src/db/schema/projects/core.ts`):

```ts
// Add inside the projects pgTable columns object:
managedProductId: integer("managed_product_id")
  .references(() => managedProducts.managedProductId, { onDelete: "set null" }),

// Add to the index array:
index("idx_projects_managed_product").on(table.managedProductId),
```

This is a **purely additive, non-breaking** migration (nullable column, no constraint on
existing rows). It can ship independently of the workspace-member rename in Step A above.

### 4.4 Service sketch (backend)

```ts
// backend/src/modules/product-management/managed-products.service.ts

async createManagedProduct(orgId: string, input: CreateManagedProductInput) {
  // 1. assertWithinLimit(orgId, LimitKey.MANAGED_PRODUCTS)  ← add a plan limit
  // 2. insert with composite-unique guard → catch 23505 → ConflictException
  // 3. audit
}

async listManagedProducts(orgId: string, query: ListManagedProductsInput) {
  // paginated, org-scoped, soft-delete filtered
  // returns { data, pagination }
}

async linkProjectToProduct(orgId: string, managedProductId: number, projectId: number) {
  // verify both belong to org (BOLA re-assert on both)
  // UPDATE projects SET managed_product_id = $1 WHERE org_id = $2 AND project_id = $3
}
```

RBAC key (add to `permissions.constants.ts`):

```
"projects:managed_products:view"
"projects:managed_products:create"
"projects:managed_products:update"
"projects:managed_products:delete"
```

> These live under the `projects:` namespace today; in Wave 11 they migrate to
> `product-management:managed_products:*` with dual-grant overlap.

### 4.5 Frontend surface

New pages/components (minimal, reuse existing PM shell):

| Route | Component | Notes |
|-------|-----------|-------|
| `/projects/products` (today) → `/pm/products` (Wave 11) | `features/projects/managed-products/managed-products-page.tsx` | List + create. Reuse `PageWrapper`, `StatCardGrid`, `DataTable`. |
| `/projects/products/[managedProductId]` | `features/projects/managed-products/managed-product-detail-page.tsx` | Detail: linked projects list, team assignments, activity. |

New TanStack Query hook file: `frontend/hooks/api/projects/managed-products.ts`
- `useManagedProducts(params?, options?)` — `GET /projects/products`
- `useCreateManagedProduct()` — `POST /projects/products`
- `useLinkProjectToProduct()` — `PATCH /projects/:projectId/managed-product`

On the project creation/edit form, add an **optional** "Managed Product" select backed by
`useManagedProducts`. Not required; shown only when the org has at least one managed product.

---

## 5. Full PM hierarchy — composite FK rules

Following §4 ID convention (tenant-composite descriptive FKs), the Wave 8 schema enforces:

```
organizations(organization_id text PK)
  └── managed_products(managed_product_id int, org_id text NOT NULL FK)
        └── projects(project_id int, org_id text NOT NULL FK,
                      managed_product_id int NULL FK)  ← optional link
  └── project_portfolios(id int, org_id text NOT NULL FK)
        └── project_programs(id int, org_id text NOT NULL FK,
                               portfolio_id int FK)
  └── project_teams(id int, org_id text NOT NULL FK)
        ├── project_team_members(id int, org_id text NOT NULL FK, team_id FK, user_id FK)
        └── project_team_assignments(id int, org_id text NOT NULL FK,
                                       project_id FK, team_id FK)
  └── product_management_members(id int, org_id text NOT NULL FK, user_id FK)
                    ↑ renamed from project_workspace_members
```

**Cross-entity invariants enforced by composite FKs (post Wave 7 matrix):**

- A `project_team_assignment` row is only valid when both `project.org_id` and `team.org_id`
  equal the assignment's `org_id` — cross-tenant assignment is impossible.
- A `projects.managed_product_id` reference requires the product row to have the same `org_id`
  as the project — to be enforced via a trigger or a `(org_id, managed_product_id)` composite FK
  once `managed_products` carries a `UNIQUE(org_id, managed_product_id)` constraint.
  Drizzle does not yet expose `composite FK` syntax natively; use a `CHECK` constraint or
  enforce in the service layer until it does.

---

## 6. Collision risk — `refactoring-hrms` in-flight work

### What is in-flight

Branch `refactoring-hrms` contains uncommitted (or at least un-merged-to-main) work on:

1. **`backend/src/modules/projects-teams/`** — `TeamsService`, `TeamsController`,
   `dto/teams.schemas.ts`. This module already imports `projectWorkspaceMembers` for
   workspace-member eligibility checks when adding team members.
2. **`backend/src/modules/projects/projects-workspace-members.{service,controller}.ts`** — the
   legacy workspace-members service is still live and in use.
3. Any schema migrations touching `project_team_assignments` or `project_team_members`.

### Collision vectors

| Risk | Effect if Wave 8 starts before in-flight lands |
|------|------------------------------------------------|
| Rename `projectWorkspaceMembers` → `productManagementMembers` in schema | `TeamsService` still imports `projectWorkspaceMembers` — build fails on merge |
| Drop `project_workspace_members` table (Step D contract) | `TeamsService` queries it — runtime 500 |
| Add `managed_products` table + FK on `projects` | No direct conflict, but a concurrent migration on `projects` (e.g. adding a teams-FK column) → sequential migration ordering required |
| Rename frontend `workspace-members.ts` hook | Any in-flight frontend code that imports it breaks on merge |

### Required gate before Wave 8

1. `refactoring-hrms` Projects Members/Teams work is committed and merged to `main` (or the
   working branch).
2. `TeamsService` no longer imports `projectWorkspaceMembers` directly — it should import the
   new `productManagementMembers` Drizzle table after the rename. If the in-flight code still
   uses the old symbol, update it as part of the same Wave 8 PR that does the schema rename.
3. All three backend files that currently reference `projectWorkspaceMembers` are updated in
   the same atomic commit: `teams.service.ts`, `projects-workspace-members.service.ts`, and
   `projects.module.ts`.
4. The migration journal (Wave 0 gate) is reconciled — no pending un-numbered or un-pushed
   migrations — before the additive `managed_products` migration is generated.

---

## 7. Frontend — "workspace" wording to strip from PM UI

### Files containing the banned term that need renaming/rewriting

| File | "workspace" occurrences | Action |
|------|------------------------|--------|
| `frontend/hooks/api/projects/workspace-members.ts` | entire file name + all symbols | Rename to `pm-members.ts`; rename all exported symbols (§3.4) |
| `frontend/features/projects/teams/workspace-member-picker.tsx` | file name + component name | Rename to `pm-member-picker.tsx`; rename `WorkspaceMemberPicker` → `PmMemberPicker` |
| `frontend/features/projects/members/members-page.tsx` | import path + "workspace members" fallback copy | Update import; change "workspace members" copy to "Product Management members" |
| `frontend/features/projects/teams/team-home-page.tsx` | `WorkspaceMemberPicker` import | Update import to `PmMemberPicker` |
| `frontend/features/projects/settings/project-members-section.tsx` | `useProjectWorkspaceMembers` import | Update import |
| `frontend/components/members/member-picker.tsx` | `workspaceMembers` reference | Update |
| `frontend/hooks/api/projects/projects.ts` | `workspaceMembers` query key | Update to `pmMembers` |
| `frontend/app/(authenticated)/projects/members/error.tsx` | "workspace members" copy string | Change to "Product Management members" |
| `frontend/app/(authenticated)/projects/all/page.tsx` | check for "workspace" copy | Update if present |
| `frontend/app/(authenticated)/projects/all/loading.tsx` | check for "workspace" copy | Update if present |

### Query key migration

```ts
// OLD — scattered string in workspace-members.ts
const WORKSPACE_MEMBERS_BASE = ["streamlineos", "projects", "workspaceMembers"] as const;

// NEW — pm-members.ts
const PM_MEMBERS_BASE = ["streamlineos", "projects", "pmMembers"] as const;
```

Invalidation calls in `useAddPmMember` / `useRemovePmMember` must reference the new key.
Any call site that does `queryClient.invalidateQueries({ queryKey: [..., "workspaceMembers"] })`
must be updated.

### Managed Products navigation entry

Add "Products" to the PM sidebar nav group (in whatever nav-group file drives
`/projects/**` sidebar entries). Gate the nav item with
`useCan("projects:managed_products:view")` per §11.

---

## 8. RBAC additions required

Add to `backend/src/modules/rbac/permissions.constants.ts`:

```ts
// Managed Products
"projects:managed_products:view",
"projects:managed_products:create",
"projects:managed_products:update",
"projects:managed_products:delete",

// PM member management (already partially present as projects:members:* —
// verify exact existing keys and add missing ones)
"projects:members:view",    // already exists — keep
"projects:members:manage",  // add if not present: covers add/remove PM members
```

Add `projects:managed_products:view` + `create` to `ROLE_DEFAULT_PERMISSIONS` for
`PROJECT_MANAGER` and `PRODUCT_MANAGEMENT_ADMIN` roles.

---

## 9. Migration sequencing summary

```
Step 0  Prerequisite gate (§6): in-flight Teams work merged; journal reconciled.

Step 1  [ADDITIVE — no breaking change]
        Generate + run: CREATE TABLE managed_products (…)
        Generate + run: ALTER TABLE projects ADD COLUMN managed_product_id int NULL FK

Step 2  [BACKEND] Add ManagedProductsService + ManagedProductsController
        RBAC: add permission keys + role defaults
        API: GET/POST /projects/products, PATCH /projects/:projectId/managed-product

Step 3  [FRONTEND] Add useManagedProducts hook + ManagedProductsPage + detail page
        Add optional "Managed Product" picker to project form

Step 4  [EXPAND — rename, shadow copy]
        Generate + run: CREATE TABLE product_management_members (identical structure)
        Backfill from project_workspace_members
        Install sync triggers (old → new)

Step 5  [BACKEND] Update service/controller to READ from product_management_members
        Keep writes going to BOTH via trigger; deploy behind feature flag

Step 6  [BACKEND] Switch WRITES to product_management_members
        Update sync trigger direction (new → old) for backward compat

Step 7  [FRONTEND] Rename hook file + all symbols (§3.4 / §7)
        Update all import sites

Step 8  [OBSERVE] Two clean release cycles with zero reads/writes to old table.

Step 9  [CONTRACT]
        Generate + run: DROP TRIGGER(s); DROP TABLE project_workspace_members;
        Remove Drizzle export for old table; run build + lint + types.
```

Each step is a separate migration file named and committed individually. No step skips the
`pnpm -C backend db:generate` → `db:migrate` CI path (no `db:push` in production per Wave 0).

---

## 10. Definition of done for Wave 8

- [ ] `refactoring-hrms` Projects Members/Teams work landed on main before this wave starts.
- [ ] `managed_products` table exists; `projects.managed_product_id` nullable FK exists.
- [ ] `UNIQUE(org_id, key)` on `managed_products` (tenant-composite, per §19).
- [ ] `product_management_members` table exists; `project_workspace_members` table dropped.
- [ ] All backend symbols and DTO names use new names; no `workspace` in any PM symbol.
- [ ] All frontend files in §7 updated; no `workspace` in any PM file name or component name.
- [ ] RBAC keys for `managed_products:*` in permissions catalog + role defaults.
- [ ] `useManagedProducts` hook gated: `enabled: useCan("projects:managed_products:view")`.
- [ ] PM sidebar shows "Products" nav item, gated by permission.
- [ ] `GET /projects/products` returns paginated `{ data, pagination }` envelope (not unbounded).
- [ ] Build ✓ lint ✓ types ✓ after every step.
- [ ] E2E: cross-tenant isolation (Org A cannot see Org B's managed products).
- [ ] E2E: BOLA re-asserted in `ManagedProductsService.linkProjectToProduct`.
- [ ] No file over 500 lines created (service + controller split if needed).
- [ ] `PAGES.md` updated with new pages.
