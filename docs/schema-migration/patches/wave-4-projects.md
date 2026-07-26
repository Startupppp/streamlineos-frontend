---
type: wave-4 patch spec (projects)
status: DRAFT
date: 2026-07-26
---

# Wave 4 — Projects/PM Domain: Tenant-Safe FK Patch Spec

> Implementation-ready patch spec. Each section follows the order:
> **(A) Drizzle before → after diff · (B) Generated SQL (NOT VALID → VALIDATE) · (C) Backfill / quarantine query.**
>
> Tables are ordered by dependency: candidate keys first (A), then junction tables that require
> those keys (B), then tables with bare/missing org FK (C), then the two special-case hotfixes (D).
>
> **Wave 7 note — `pm_workspaces` / `pm_workspace_memberships` / `pm_workspace_id` composite FKs:**
> The three bare `pm_workspace_id text` columns on `projects`, `project_teams`, and
> `project_workspace_members` (Part B of the matrix) plus the `pm_workspace_memberships →
> organization_members` composite FK gap are deferred to **Wave 7** — the user owns those tables
> actively and the `pm_workspaces` anchor constraint must land first (Wave 7-A). This spec
> mentions them here for completeness but provides NO implementation detail; do not touch those
> columns in this wave.

---

## DEPENDENCY ORDER OVERVIEW

```
Step 1 (§1–§3)  — add UNIQUE(org_id, id) candidate keys to projects, tickets, sprints
                   (parent tables that every junction below references)
Step 2 (§4–§10) — add org_id + composite FK to the 10 junction tables that are missing org_id
Step 3 (§11)    — project_automations: add .references() on existing org_id col
Step 4 (§12)    — ticket_comment_reactions: add .references() on existing org_id + add composite FK
```

All FKs are added `NOT VALID` first, then `VALIDATE` in a separate transaction.

---

## PART A — CANDIDATE KEY CONSTRAINTS (parent tables)

These three `UNIQUE(org_id, id)` constraints must exist **before** any composite FK below can be
declared. They are the targets of every composite FK in Parts B–D.

### §1 — `projects`: add UNIQUE(org_id, id)

**Current state (core.ts lines 66–72):**
```ts
(table) => [
  uniqueIndex("uniq_projects_org_key").on(table.orgId, table.key),
  index("idx_projects_org_status").on(table.orgId, table.status),
  index("idx_projects_manager").on(table.managerId),
  index("idx_projects_deal").on(table.dealId),
  index("idx_projects_managed_product").on(table.managedProductId),
],
```

**After (add one constraint):**
```ts
(table) => [
  uniqueIndex("uniq_projects_org_key").on(table.orgId, table.key),
  uniqueIndex("uniq_projects_org_id").on(table.orgId, table.id), // NEW
  index("idx_projects_org_status").on(table.orgId, table.status),
  index("idx_projects_manager").on(table.managerId),
  index("idx_projects_deal").on(table.dealId),
  index("idx_projects_managed_product").on(table.managedProductId),
],
```

**Generated SQL:**
```sql
-- Step A: build concurrently (no lock on large table)
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS uniq_projects_org_id
  ON projects (org_id, id);

-- Step B: promote to constraint (fast — index already exists)
ALTER TABLE projects
  ADD CONSTRAINT uniq_projects_org_id
  UNIQUE USING INDEX uniq_projects_org_id;
```

**Backfill / quarantine:**
```sql
-- Verify no duplicates exist (should be 0 — PK guarantees id uniqueness)
SELECT org_id, id, COUNT(*) FROM projects GROUP BY org_id, id HAVING COUNT(*) > 1;
-- Expected: 0 rows. If any appear, those rows are corrupt — quarantine by setting
-- deletedAt = now() before adding the constraint.
```

---

### §2 — `tickets`: add UNIQUE(org_id, id)

**Current state (tasks.ts lines 54–67):**
```ts
(t) => [
  foreignKey({ columns: [t.epicId], foreignColumns: [t.id] }).onDelete("set null"),
  foreignKey({ columns: [t.parentTicketId], foreignColumns: [t.id] }).onDelete("set null"),
  uniqueIndex("uniq_tickets_project_number").on(t.projectId, t.ticketNumber),
  index("idx_tickets_project_status").on(t.projectId, t.status),
  // ...
],
```

**After (add one entry):**
```ts
(t) => [
  foreignKey({ columns: [t.epicId], foreignColumns: [t.id] }).onDelete("set null"),
  foreignKey({ columns: [t.parentTicketId], foreignColumns: [t.id] }).onDelete("set null"),
  uniqueIndex("uniq_tickets_project_number").on(t.projectId, t.ticketNumber),
  uniqueIndex("uniq_tickets_org_id").on(t.orgId, t.id), // NEW
  index("idx_tickets_project_status").on(t.projectId, t.status),
  // ... rest unchanged
],
```

**Generated SQL:**
```sql
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS uniq_tickets_org_id
  ON tickets (org_id, id);

ALTER TABLE tickets
  ADD CONSTRAINT uniq_tickets_org_id
  UNIQUE USING INDEX uniq_tickets_org_id;
```

**Backfill / quarantine:**
```sql
SELECT org_id, id, COUNT(*) FROM tickets GROUP BY org_id, id HAVING COUNT(*) > 1;
-- Expected: 0 rows (PK guarantee). Zero action required.
```

---

### §3 — `sprints`: add UNIQUE(org_id, id)

**Current state (core.ts lines 96–98):**
```ts
(table) => [
  index("idx_sprints_project_status").on(table.projectId, table.status),
],
```

**After:**
```ts
(table) => [
  uniqueIndex("uniq_sprints_org_id").on(table.orgId, table.id), // NEW
  index("idx_sprints_project_status").on(table.projectId, table.status),
],
```

**Generated SQL:**
```sql
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS uniq_sprints_org_id
  ON sprints (org_id, id);

ALTER TABLE sprints
  ADD CONSTRAINT uniq_sprints_org_id
  UNIQUE USING INDEX uniq_sprints_org_id;
```

**Backfill / quarantine:**
```sql
SELECT org_id, id, COUNT(*) FROM sprints GROUP BY org_id, id HAVING COUNT(*) > 1;
-- Expected: 0 rows.
```

---

## PART B — JUNCTION TABLES MISSING `org_id` (10 tables)

Each table needs: (1) `org_id text NOT NULL` column added, (2) backfill from the parent row,
(3) NOT NULL constraint applied after backfill, (4) composite FK declared.

The composite FK targets the parent's new `UNIQUE(org_id, id)` constraint from Part A (or the
existing org anchor on `ticket_checklists` / `project_releases` / `ticket_labels`).

> **Migration pattern for all 10 tables:**
> ```sql
> -- 1. Add nullable first (zero-downtime)
> ALTER TABLE <t> ADD COLUMN IF NOT EXISTS org_id text;
> -- 2. Backfill
> UPDATE <t> SET org_id = (SELECT org_id FROM <parent> WHERE <parent>.id = <t>.<parent_id>);
> -- 3. Enforce NOT NULL
> ALTER TABLE <t> ALTER COLUMN org_id SET NOT NULL;
> -- 4. Index
> CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_<t>_org ON <t> (org_id);
> -- 5. FK (NOT VALID — no full scan at deploy time)
> ALTER TABLE <t> ADD CONSTRAINT fk_<t>_org
>   FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE NOT VALID;
> -- 6. Composite FK (NOT VALID)
> ALTER TABLE <t> ADD CONSTRAINT fk_<t>_org_<parent_id>
>   FOREIGN KEY (org_id, <parent_id>) REFERENCES <parent>(org_id, id) NOT VALID;
> -- 7. Validate (separate maintenance window)
> ALTER TABLE <t> VALIDATE CONSTRAINT fk_<t>_org;
> ALTER TABLE <t> VALIDATE CONSTRAINT fk_<t>_org_<parent_id>;
> ```

---

### §4 — `ticket_assignees`: add org_id + composite FK → tickets

**Current state (tasks.ts lines 70–79):**
```ts
export const ticketAssignees = pgTable("ticket_assignees", {
  id: serial("id").primaryKey(),
  ticketId: integer("ticket_id").references(() => tickets.id, { onDelete: "cascade" }).notNull(),
  userId: text("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  assignedAt: timestamp("assigned_at").defaultNow().notNull(),
  assignedBy: text("assigned_by").references(() => users.id, { onDelete: "set null" }),
}, (table) => [
  uniqueIndex("uniq_ticket_assignees_ticket_user").on(table.ticketId, table.userId),
  index("idx_ticket_assignees_user_id").on(table.userId),
]);
```

**After:**
```ts
export const ticketAssignees = pgTable("ticket_assignees", {
  id: serial("id").primaryKey(),
  orgId: text("org_id")                                   // ADD
    .references(() => organizations.id, { onDelete: "cascade" }) // ADD
    .notNull(),                                            // ADD (post-backfill)
  ticketId: integer("ticket_id").references(() => tickets.id, { onDelete: "cascade" }).notNull(),
  userId: text("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  assignedAt: timestamp("assigned_at").defaultNow().notNull(),
  assignedBy: text("assigned_by").references(() => users.id, { onDelete: "set null" }),
}, (table) => [
  uniqueIndex("uniq_ticket_assignees_ticket_user").on(table.ticketId, table.userId),
  index("idx_ticket_assignees_user_id").on(table.userId),
  index("idx_ticket_assignees_org").on(table.orgId),      // ADD
  foreignKey({                                             // ADD
    name: "fk_ticket_assignees_org_ticket",
    columns: [table.orgId, table.ticketId],
    foreignColumns: [tickets.orgId, tickets.id],
  }),
]);
```

**Generated SQL:**
```sql
-- A: add column nullable
ALTER TABLE ticket_assignees ADD COLUMN IF NOT EXISTS org_id text;

-- B: backfill from tickets
UPDATE ticket_assignees ta
SET org_id = t.org_id
FROM tickets t
WHERE t.id = ta.ticket_id;

-- C: quarantine rows with no parent (should be 0 given existing bare FK)
SELECT ta.id FROM ticket_assignees ta
LEFT JOIN tickets t ON t.id = ta.ticket_id
WHERE ta.org_id IS NULL;
-- If any: DELETE FROM ticket_assignees WHERE id IN (...);

-- D: enforce NOT NULL
ALTER TABLE ticket_assignees ALTER COLUMN org_id SET NOT NULL;

-- E: bare org FK (NOT VALID)
ALTER TABLE ticket_assignees ADD CONSTRAINT fk_ticket_assignees_org
  FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE NOT VALID;

-- F: composite FK (NOT VALID) — requires §2 constraint to exist first
ALTER TABLE ticket_assignees ADD CONSTRAINT fk_ticket_assignees_org_ticket
  FOREIGN KEY (org_id, ticket_id) REFERENCES tickets(org_id, id) NOT VALID;

-- G: index
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ticket_assignees_org
  ON ticket_assignees (org_id);

-- H: validate (separate window)
ALTER TABLE ticket_assignees VALIDATE CONSTRAINT fk_ticket_assignees_org;
ALTER TABLE ticket_assignees VALIDATE CONSTRAINT fk_ticket_assignees_org_ticket;
```

**Backfill / quarantine:**
```sql
-- Orphaned rows (ticket deleted without cascade — should be 0):
SELECT COUNT(*) FROM ticket_assignees WHERE org_id IS NULL;
```

---

### §5 — `ticket_label_mappings`: add org_id + composite FK → tickets

**Current state (tasks.ts lines 121–128):**
```ts
export const ticketLabelMappings = pgTable("ticket_label_mappings", {
  id: serial("id").primaryKey(),
  ticketId: integer("ticket_id").references(() => tickets.id, { onDelete: "cascade" }).notNull(),
  labelId: integer("label_id").references(() => ticketLabels.id, { onDelete: "cascade" }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("uniq_ticket_label_mappings_ticket_label").on(table.ticketId, table.labelId),
]);
```

**After:**
```ts
export const ticketLabelMappings = pgTable("ticket_label_mappings", {
  id: serial("id").primaryKey(),
  orgId: text("org_id")                                   // ADD
    .references(() => organizations.id, { onDelete: "cascade" })
    .notNull(),
  ticketId: integer("ticket_id").references(() => tickets.id, { onDelete: "cascade" }).notNull(),
  labelId: integer("label_id").references(() => ticketLabels.id, { onDelete: "cascade" }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("uniq_ticket_label_mappings_ticket_label").on(table.ticketId, table.labelId),
  index("idx_ticket_label_mappings_org").on(table.orgId), // ADD
  foreignKey({                                             // ADD
    name: "fk_ticket_label_mappings_org_ticket",
    columns: [table.orgId, table.ticketId],
    foreignColumns: [tickets.orgId, tickets.id],
  }),
]);
```

**Generated SQL:**
```sql
ALTER TABLE ticket_label_mappings ADD COLUMN IF NOT EXISTS org_id text;

UPDATE ticket_label_mappings tlm
SET org_id = t.org_id
FROM tickets t
WHERE t.id = tlm.ticket_id;

ALTER TABLE ticket_label_mappings ALTER COLUMN org_id SET NOT NULL;

ALTER TABLE ticket_label_mappings ADD CONSTRAINT fk_ticket_label_mappings_org
  FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE NOT VALID;

ALTER TABLE ticket_label_mappings ADD CONSTRAINT fk_ticket_label_mappings_org_ticket
  FOREIGN KEY (org_id, ticket_id) REFERENCES tickets(org_id, id) NOT VALID;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ticket_label_mappings_org
  ON ticket_label_mappings (org_id);

ALTER TABLE ticket_label_mappings VALIDATE CONSTRAINT fk_ticket_label_mappings_org;
ALTER TABLE ticket_label_mappings VALIDATE CONSTRAINT fk_ticket_label_mappings_org_ticket;
```

**Backfill / quarantine:**
```sql
-- Verify all rows got org_id
SELECT COUNT(*) FROM ticket_label_mappings WHERE org_id IS NULL;
-- Cross-org integrity check (label must belong to same org as ticket)
SELECT COUNT(*) FROM ticket_label_mappings tlm
JOIN tickets t ON t.id = tlm.ticket_id
JOIN ticket_labels tl ON tl.id = tlm.label_id
WHERE t.org_id != tl.org_id;
-- If > 0: these are cross-org mapping bugs — DELETE those rows before adding composite FK.
```

---

### §6 — `ticket_watchers`: add org_id + composite FK → tickets

**Current state (tasks.ts lines 130–138):**
```ts
export const ticketWatchers = pgTable("ticket_watchers", {
  id: serial("id").primaryKey(),
  ticketId: integer("ticket_id").references(() => tickets.id, { onDelete: "cascade" }).notNull(),
  userId: text("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("uniq_ticket_watcher").on(table.ticketId, table.userId),
  index("idx_ticket_watchers_user").on(table.userId),
]);
```

**After:**
```ts
export const ticketWatchers = pgTable("ticket_watchers", {
  id: serial("id").primaryKey(),
  orgId: text("org_id")
    .references(() => organizations.id, { onDelete: "cascade" })
    .notNull(),
  ticketId: integer("ticket_id").references(() => tickets.id, { onDelete: "cascade" }).notNull(),
  userId: text("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("uniq_ticket_watcher").on(table.ticketId, table.userId),
  index("idx_ticket_watchers_user").on(table.userId),
  index("idx_ticket_watchers_org").on(table.orgId),
  foreignKey({
    name: "fk_ticket_watchers_org_ticket",
    columns: [table.orgId, table.ticketId],
    foreignColumns: [tickets.orgId, tickets.id],
  }),
]);
```

**Generated SQL:**
```sql
ALTER TABLE ticket_watchers ADD COLUMN IF NOT EXISTS org_id text;

UPDATE ticket_watchers tw
SET org_id = t.org_id
FROM tickets t
WHERE t.id = tw.ticket_id;

ALTER TABLE ticket_watchers ALTER COLUMN org_id SET NOT NULL;

ALTER TABLE ticket_watchers ADD CONSTRAINT fk_ticket_watchers_org
  FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE NOT VALID;

ALTER TABLE ticket_watchers ADD CONSTRAINT fk_ticket_watchers_org_ticket
  FOREIGN KEY (org_id, ticket_id) REFERENCES tickets(org_id, id) NOT VALID;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ticket_watchers_org
  ON ticket_watchers (org_id);

ALTER TABLE ticket_watchers VALIDATE CONSTRAINT fk_ticket_watchers_org;
ALTER TABLE ticket_watchers VALIDATE CONSTRAINT fk_ticket_watchers_org_ticket;
```

**Backfill / quarantine:**
```sql
SELECT COUNT(*) FROM ticket_watchers WHERE org_id IS NULL;
```

---

### §7 — `work_item_relations`: add org_id + composite FKs → tickets (both sides)

**Current state (tasks.ts lines 140–150):**
```ts
export const workItemRelations = pgTable("work_item_relations", {
  id: serial("id").primaryKey(),
  workItemId: integer("work_item_id").references(() => tickets.id, { onDelete: "cascade" }).notNull(),
  relatedWorkItemId: integer("related_work_item_id").references(() => tickets.id, { onDelete: "cascade" }).notNull(),
  relationType: workItemRelationTypeEnum("relation_type").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("uniq_work_item_relation").on(table.workItemId, table.relatedWorkItemId),
  index("idx_work_item_relations_item").on(table.workItemId),
  index("idx_work_item_relations_related").on(table.relatedWorkItemId),
]);
```

> **Special case:** This table has NO `org_id` at all. Both `work_item_id` and `related_work_item_id`
> reference `tickets(id)`. The composite FK uses `work_item_id` as the tenant anchor side.
> Cross-org relations (work_item from org A, related_work_item from org B) are a security bug —
> the quarantine query below must run first.

**After:**
```ts
export const workItemRelations = pgTable("work_item_relations", {
  id: serial("id").primaryKey(),
  orgId: text("org_id")
    .references(() => organizations.id, { onDelete: "cascade" })
    .notNull(),
  workItemId: integer("work_item_id").references(() => tickets.id, { onDelete: "cascade" }).notNull(),
  relatedWorkItemId: integer("related_work_item_id").references(() => tickets.id, { onDelete: "cascade" }).notNull(),
  relationType: workItemRelationTypeEnum("relation_type").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("uniq_work_item_relation").on(table.workItemId, table.relatedWorkItemId),
  index("idx_work_item_relations_item").on(table.workItemId),
  index("idx_work_item_relations_related").on(table.relatedWorkItemId),
  index("idx_work_item_relations_org").on(table.orgId),
  foreignKey({
    name: "fk_work_item_relations_org_work_item",
    columns: [table.orgId, table.workItemId],
    foreignColumns: [tickets.orgId, tickets.id],
  }),
]);
```

**Generated SQL:**
```sql
ALTER TABLE work_item_relations ADD COLUMN IF NOT EXISTS org_id text;

-- Backfill from the left-side ticket
UPDATE work_item_relations wir
SET org_id = t.org_id
FROM tickets t
WHERE t.id = wir.work_item_id;

-- Quarantine cross-org relations (SECURITY BUG — delete before proceeding)
DELETE FROM work_item_relations
WHERE id IN (
  SELECT wir.id FROM work_item_relations wir
  JOIN tickets t1 ON t1.id = wir.work_item_id
  JOIN tickets t2 ON t2.id = wir.related_work_item_id
  WHERE t1.org_id != t2.org_id
);

-- Quarantine rows still null after backfill (orphaned — deleted tickets)
DELETE FROM work_item_relations WHERE org_id IS NULL;

ALTER TABLE work_item_relations ALTER COLUMN org_id SET NOT NULL;

ALTER TABLE work_item_relations ADD CONSTRAINT fk_work_item_relations_org
  FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE NOT VALID;

ALTER TABLE work_item_relations ADD CONSTRAINT fk_work_item_relations_org_work_item
  FOREIGN KEY (org_id, work_item_id) REFERENCES tickets(org_id, id) NOT VALID;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_work_item_relations_org
  ON work_item_relations (org_id);

ALTER TABLE work_item_relations VALIDATE CONSTRAINT fk_work_item_relations_org;
ALTER TABLE work_item_relations VALIDATE CONSTRAINT fk_work_item_relations_org_work_item;
```

**Backfill / quarantine (run BEFORE migration):**
```sql
-- Count cross-org relations (must be 0 before adding composite FK)
SELECT COUNT(*) FROM work_item_relations wir
JOIN tickets t1 ON t1.id = wir.work_item_id
JOIN tickets t2 ON t2.id = wir.related_work_item_id
WHERE t1.org_id != t2.org_id;
```

---

### §8 — `ticket_checklist_items`: add org_id + composite FK → ticket_checklists

**Current state (tasks.ts lines 163–174):**
```ts
export const ticketChecklistItems = pgTable("ticket_checklist_items", {
  id: serial("id").primaryKey(),
  checklistId: integer("checklist_id").references(() => ticketChecklists.id, { onDelete: "cascade" }).notNull(),
  text: text("text").notNull(),
  isCompleted: boolean("is_completed").default(false).notNull(),
  assigneeId: text("assignee_id").references(() => users.id, { onDelete: "set null" }),
  dueDate: date("due_date"),
  order: integer("order").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_ticket_checklist_items_checklist").on(table.checklistId),
]);
```

> **Pre-requisite:** `ticket_checklists` already has `org_id` and `unique(org_id, id)` must be
> added to it as a candidate key before this composite FK can be declared. Apply the same
> `CREATE UNIQUE INDEX CONCURRENTLY / ALTER TABLE ... UNIQUE USING INDEX` pattern on
> `ticket_checklists(org_id, id)` in the same migration batch before step F below.

**After:**
```ts
export const ticketChecklistItems = pgTable("ticket_checklist_items", {
  id: serial("id").primaryKey(),
  orgId: text("org_id")
    .references(() => organizations.id, { onDelete: "cascade" })
    .notNull(),
  checklistId: integer("checklist_id").references(() => ticketChecklists.id, { onDelete: "cascade" }).notNull(),
  text: text("text").notNull(),
  isCompleted: boolean("is_completed").default(false).notNull(),
  assigneeId: text("assignee_id").references(() => users.id, { onDelete: "set null" }),
  dueDate: date("due_date"),
  order: integer("order").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_ticket_checklist_items_checklist").on(table.checklistId),
  index("idx_ticket_checklist_items_org").on(table.orgId),
  foreignKey({
    name: "fk_ticket_checklist_items_org_checklist",
    columns: [table.orgId, table.checklistId],
    foreignColumns: [ticketChecklists.orgId, ticketChecklists.id],
  }),
]);
```

**Generated SQL (including parent candidate key):**
```sql
-- 0. Add candidate key on ticket_checklists first
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS uniq_ticket_checklists_org_id
  ON ticket_checklists (org_id, id);
ALTER TABLE ticket_checklists
  ADD CONSTRAINT uniq_ticket_checklists_org_id
  UNIQUE USING INDEX uniq_ticket_checklists_org_id;

-- 1–7: standard pattern
ALTER TABLE ticket_checklist_items ADD COLUMN IF NOT EXISTS org_id text;

UPDATE ticket_checklist_items tci
SET org_id = tc.org_id
FROM ticket_checklists tc
WHERE tc.id = tci.checklist_id;

ALTER TABLE ticket_checklist_items ALTER COLUMN org_id SET NOT NULL;

ALTER TABLE ticket_checklist_items ADD CONSTRAINT fk_ticket_checklist_items_org
  FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE NOT VALID;

ALTER TABLE ticket_checklist_items ADD CONSTRAINT fk_ticket_checklist_items_org_checklist
  FOREIGN KEY (org_id, checklist_id) REFERENCES ticket_checklists(org_id, id) NOT VALID;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ticket_checklist_items_org
  ON ticket_checklist_items (org_id);

ALTER TABLE ticket_checklist_items VALIDATE CONSTRAINT fk_ticket_checklist_items_org;
ALTER TABLE ticket_checklist_items VALIDATE CONSTRAINT fk_ticket_checklist_items_org_checklist;
```

**Backfill / quarantine:**
```sql
SELECT COUNT(*) FROM ticket_checklist_items WHERE org_id IS NULL;
```

---

### §9 — `ticket_custom_field_values`: add org_id + composite FK → tickets

**Current state (tasks.ts lines 191–201):**
```ts
export const ticketCustomFieldValues = pgTable("ticket_custom_field_values", {
  id: serial("id").primaryKey(),
  ticketId: integer("ticket_id").references(() => tickets.id, { onDelete: "cascade" }).notNull(),
  fieldId: integer("field_id").references(() => projectCustomFields.id, { onDelete: "cascade" }).notNull(),
  value: text("value"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull().$onUpdate(() => new Date()),
}, (table) => [
  uniqueIndex("uniq_ticket_custom_field_values").on(table.ticketId, table.fieldId),
  index("idx_ticket_custom_field_values_ticket").on(table.ticketId),
]);
```

**After:**
```ts
export const ticketCustomFieldValues = pgTable("ticket_custom_field_values", {
  id: serial("id").primaryKey(),
  orgId: text("org_id")
    .references(() => organizations.id, { onDelete: "cascade" })
    .notNull(),
  ticketId: integer("ticket_id").references(() => tickets.id, { onDelete: "cascade" }).notNull(),
  fieldId: integer("field_id").references(() => projectCustomFields.id, { onDelete: "cascade" }).notNull(),
  value: text("value"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull().$onUpdate(() => new Date()),
}, (table) => [
  uniqueIndex("uniq_ticket_custom_field_values").on(table.ticketId, table.fieldId),
  index("idx_ticket_custom_field_values_ticket").on(table.ticketId),
  index("idx_ticket_custom_field_values_org").on(table.orgId),
  foreignKey({
    name: "fk_ticket_custom_field_values_org_ticket",
    columns: [table.orgId, table.ticketId],
    foreignColumns: [tickets.orgId, tickets.id],
  }),
]);
```

**Generated SQL:**
```sql
ALTER TABLE ticket_custom_field_values ADD COLUMN IF NOT EXISTS org_id text;

UPDATE ticket_custom_field_values tcfv
SET org_id = t.org_id
FROM tickets t
WHERE t.id = tcfv.ticket_id;

ALTER TABLE ticket_custom_field_values ALTER COLUMN org_id SET NOT NULL;

ALTER TABLE ticket_custom_field_values ADD CONSTRAINT fk_ticket_custom_field_values_org
  FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE NOT VALID;

ALTER TABLE ticket_custom_field_values ADD CONSTRAINT fk_ticket_custom_field_values_org_ticket
  FOREIGN KEY (org_id, ticket_id) REFERENCES tickets(org_id, id) NOT VALID;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ticket_custom_field_values_org
  ON ticket_custom_field_values (org_id);

ALTER TABLE ticket_custom_field_values VALIDATE CONSTRAINT fk_ticket_custom_field_values_org;
ALTER TABLE ticket_custom_field_values VALIDATE CONSTRAINT fk_ticket_custom_field_values_org_ticket;
```

**Backfill / quarantine:**
```sql
-- Cross-org values (field belongs to different org than ticket — should not exist)
SELECT COUNT(*) FROM ticket_custom_field_values tcfv
JOIN tickets t ON t.id = tcfv.ticket_id
JOIN project_custom_fields pcf ON pcf.id = tcfv.field_id
WHERE t.org_id != pcf.org_id;
-- DELETE any cross-org rows before migrating.
```

---

### §10 — `release_tickets`: add org_id + composite FK → project_releases

**Current state (tasks.ts lines 220–228):**
```ts
export const releaseTickets = pgTable("release_tickets", {
  id: serial("id").primaryKey(),
  releaseId: integer("release_id").references(() => projectReleases.id, { onDelete: "cascade" }).notNull(),
  ticketId: integer("ticket_id").references(() => tickets.id, { onDelete: "cascade" }).notNull(),
  addedAt: timestamp("added_at").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("uniq_release_tickets").on(table.releaseId, table.ticketId),
  index("idx_release_tickets_release").on(table.releaseId),
]);
```

> **Pre-requisite:** `project_releases` already has `org_id`. Add `UNIQUE(org_id, id)` candidate
> key on `project_releases` before declaring the composite FK below.

**After:**
```ts
export const releaseTickets = pgTable("release_tickets", {
  id: serial("id").primaryKey(),
  orgId: text("org_id")
    .references(() => organizations.id, { onDelete: "cascade" })
    .notNull(),
  releaseId: integer("release_id").references(() => projectReleases.id, { onDelete: "cascade" }).notNull(),
  ticketId: integer("ticket_id").references(() => tickets.id, { onDelete: "cascade" }).notNull(),
  addedAt: timestamp("added_at").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("uniq_release_tickets").on(table.releaseId, table.ticketId),
  index("idx_release_tickets_release").on(table.releaseId),
  index("idx_release_tickets_org").on(table.orgId),
  foreignKey({
    name: "fk_release_tickets_org_release",
    columns: [table.orgId, table.releaseId],
    foreignColumns: [projectReleases.orgId, projectReleases.id],
  }),
]);
```

**Generated SQL:**
```sql
-- 0. Candidate key on project_releases
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS uniq_project_releases_org_id
  ON project_releases (org_id, id);
ALTER TABLE project_releases
  ADD CONSTRAINT uniq_project_releases_org_id
  UNIQUE USING INDEX uniq_project_releases_org_id;

-- 1–7: standard pattern
ALTER TABLE release_tickets ADD COLUMN IF NOT EXISTS org_id text;

UPDATE release_tickets rt
SET org_id = pr.org_id
FROM project_releases pr
WHERE pr.id = rt.release_id;

ALTER TABLE release_tickets ALTER COLUMN org_id SET NOT NULL;

ALTER TABLE release_tickets ADD CONSTRAINT fk_release_tickets_org
  FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE NOT VALID;

ALTER TABLE release_tickets ADD CONSTRAINT fk_release_tickets_org_release
  FOREIGN KEY (org_id, release_id) REFERENCES project_releases(org_id, id) NOT VALID;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_release_tickets_org
  ON release_tickets (org_id);

ALTER TABLE release_tickets VALIDATE CONSTRAINT fk_release_tickets_org;
ALTER TABLE release_tickets VALIDATE CONSTRAINT fk_release_tickets_org_release;
```

**Backfill / quarantine:**
```sql
-- Tickets in wrong-org releases
SELECT COUNT(*) FROM release_tickets rt
JOIN project_releases pr ON pr.id = rt.release_id
JOIN tickets t ON t.id = rt.ticket_id
WHERE pr.org_id != t.org_id;
-- DELETE cross-org rows.
```

---

### §11 — `ticket_related_links`: add org_id + composite FK → tickets

**Current state (tasks.ts lines 274–283):**
```ts
export const ticketRelatedLinks = pgTable("ticket_related_links", {
  id: serial("id").primaryKey(),
  ticketId: integer("ticket_id").references(() => tickets.id, { onDelete: "cascade" }).notNull(),
  url: text("url").notNull(),
  label: text("label"),
  createdBy: text("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_ticket_related_links_ticket").on(table.ticketId),
]);
```

**After:**
```ts
export const ticketRelatedLinks = pgTable("ticket_related_links", {
  id: serial("id").primaryKey(),
  orgId: text("org_id")
    .references(() => organizations.id, { onDelete: "cascade" })
    .notNull(),
  ticketId: integer("ticket_id").references(() => tickets.id, { onDelete: "cascade" }).notNull(),
  url: text("url").notNull(),
  label: text("label"),
  createdBy: text("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_ticket_related_links_ticket").on(table.ticketId),
  index("idx_ticket_related_links_org").on(table.orgId),
  foreignKey({
    name: "fk_ticket_related_links_org_ticket",
    columns: [table.orgId, table.ticketId],
    foreignColumns: [tickets.orgId, tickets.id],
  }),
]);
```

**Generated SQL:**
```sql
ALTER TABLE ticket_related_links ADD COLUMN IF NOT EXISTS org_id text;

UPDATE ticket_related_links trl
SET org_id = t.org_id
FROM tickets t
WHERE t.id = trl.ticket_id;

ALTER TABLE ticket_related_links ALTER COLUMN org_id SET NOT NULL;

ALTER TABLE ticket_related_links ADD CONSTRAINT fk_ticket_related_links_org
  FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE NOT VALID;

ALTER TABLE ticket_related_links ADD CONSTRAINT fk_ticket_related_links_org_ticket
  FOREIGN KEY (org_id, ticket_id) REFERENCES tickets(org_id, id) NOT VALID;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ticket_related_links_org
  ON ticket_related_links (org_id);

ALTER TABLE ticket_related_links VALIDATE CONSTRAINT fk_ticket_related_links_org;
ALTER TABLE ticket_related_links VALIDATE CONSTRAINT fk_ticket_related_links_org_ticket;
```

**Backfill / quarantine:**
```sql
SELECT COUNT(*) FROM ticket_related_links WHERE org_id IS NULL;
```

---

### §12 — `project_template_tickets`: add org_id + composite FK → project_templates

**Current state (core.ts lines 233–251):**
```ts
export const projectTemplateTickets = pgTable("project_template_tickets", {
  id: serial("id").primaryKey(),
  templateId: integer("template_id").notNull()
    .references(() => projectTemplates.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  type: text("type").default("TASK").notNull(),
  priority: text("priority").default("MEDIUM").notNull(),
  estimatedHours: decimal("estimated_hours", { precision: 8, scale: 2 }),
  order: integer("order").notNull().default(0),
  phase: text("phase"),
}, (table) => [
  index("idx_project_template_tickets_template").on(table.templateId),
]);
```

> **Pre-requisite:** `project_templates` already has `org_id`. Add `UNIQUE(org_id, id)` candidate
> key on `project_templates` before declaring the composite FK.

**After:**
```ts
export const projectTemplateTickets = pgTable("project_template_tickets", {
  id: serial("id").primaryKey(),
  orgId: text("org_id")
    .references(() => organizations.id, { onDelete: "cascade" })
    .notNull(),
  templateId: integer("template_id").notNull()
    .references(() => projectTemplates.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  type: text("type").default("TASK").notNull(),
  priority: text("priority").default("MEDIUM").notNull(),
  estimatedHours: decimal("estimated_hours", { precision: 8, scale: 2 }),
  order: integer("order").notNull().default(0),
  phase: text("phase"),
}, (table) => [
  index("idx_project_template_tickets_template").on(table.templateId),
  index("idx_project_template_tickets_org").on(table.orgId),
  foreignKey({
    name: "fk_project_template_tickets_org_template",
    columns: [table.orgId, table.templateId],
    foreignColumns: [projectTemplates.orgId, projectTemplates.id],
  }),
]);
```

**Generated SQL:**
```sql
-- 0. Candidate key on project_templates
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS uniq_project_templates_org_id
  ON project_templates (org_id, id);
ALTER TABLE project_templates
  ADD CONSTRAINT uniq_project_templates_org_id
  UNIQUE USING INDEX uniq_project_templates_org_id;

-- 1–7: standard pattern
ALTER TABLE project_template_tickets ADD COLUMN IF NOT EXISTS org_id text;

UPDATE project_template_tickets ptt
SET org_id = pt.org_id
FROM project_templates pt
WHERE pt.id = ptt.template_id;

ALTER TABLE project_template_tickets ALTER COLUMN org_id SET NOT NULL;

ALTER TABLE project_template_tickets ADD CONSTRAINT fk_project_template_tickets_org
  FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE NOT VALID;

ALTER TABLE project_template_tickets ADD CONSTRAINT fk_project_template_tickets_org_template
  FOREIGN KEY (org_id, template_id) REFERENCES project_templates(org_id, id) NOT VALID;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_project_template_tickets_org
  ON project_template_tickets (org_id);

ALTER TABLE project_template_tickets VALIDATE CONSTRAINT fk_project_template_tickets_org;
ALTER TABLE project_template_tickets VALIDATE CONSTRAINT fk_project_template_tickets_org_template;
```

**Backfill / quarantine:**
```sql
SELECT COUNT(*) FROM project_template_tickets WHERE org_id IS NULL;
```

---

### §13 — `project_members`: add org_id + composite FK → projects

**Current state (members.ts lines 26–36):**
```ts
export const projectMembers = pgTable("project_members", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => projects.id, { onDelete: "cascade" }).notNull(),
  userId: text("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  role: text("role").default("CONTRIBUTOR").notNull(),
  hourlyRate: decimal("hourly_rate", { precision: 10, scale: 2 }).default("0").notNull(),
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("uniq_project_members_project_user").on(table.projectId, table.userId),
  index("idx_project_members_user").on(table.userId),
]);
```

**After:**
```ts
export const projectMembers = pgTable("project_members", {
  id: serial("id").primaryKey(),
  orgId: text("org_id")
    .references(() => organizations.id, { onDelete: "cascade" })
    .notNull(),
  projectId: integer("project_id").references(() => projects.id, { onDelete: "cascade" }).notNull(),
  userId: text("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  role: text("role").default("CONTRIBUTOR").notNull(),
  hourlyRate: decimal("hourly_rate", { precision: 10, scale: 2 }).default("0").notNull(),
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("uniq_project_members_project_user").on(table.projectId, table.userId),
  index("idx_project_members_user").on(table.userId),
  index("idx_project_members_org").on(table.orgId),
  foreignKey({
    name: "fk_project_members_org_project",
    columns: [table.orgId, table.projectId],
    foreignColumns: [projects.orgId, projects.id],
  }),
]);
```

**Generated SQL:**
```sql
ALTER TABLE project_members ADD COLUMN IF NOT EXISTS org_id text;

UPDATE project_members pm
SET org_id = p.org_id
FROM projects p
WHERE p.id = pm.project_id;

ALTER TABLE project_members ALTER COLUMN org_id SET NOT NULL;

ALTER TABLE project_members ADD CONSTRAINT fk_project_members_org
  FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE NOT VALID;

ALTER TABLE project_members ADD CONSTRAINT fk_project_members_org_project
  FOREIGN KEY (org_id, project_id) REFERENCES projects(org_id, id) NOT VALID;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_project_members_org
  ON project_members (org_id);

ALTER TABLE project_members VALIDATE CONSTRAINT fk_project_members_org;
ALTER TABLE project_members VALIDATE CONSTRAINT fk_project_members_org_project;
```

**Backfill / quarantine:**
```sql
SELECT COUNT(*) FROM project_members WHERE org_id IS NULL;
```

---

## PART C — BARE / MISSING ANCHOR FKs (no structural org_id column changes needed)

### §14 — `project_automations`: wire org_id to organizations

**Problem:** `orgId: text("org_id").notNull()` exists but has NO `.references()`. This is a bare
text column with no FK enforcement — any string can be inserted without checking it is a real org.

**Current state (tasks.ts lines 285–307):**
```ts
orgId: text("org_id").notNull(),
// no .references() call
```

**After:**
```ts
orgId: text("org_id")
  .references(() => organizations.id, { onDelete: "cascade" })
  .notNull(),
```

**Generated SQL:**
```sql
-- Quarantine dangling org_ids first
SELECT pa.id, pa.org_id FROM project_automations pa
LEFT JOIN organizations o ON o.id = pa.org_id
WHERE o.id IS NULL;
-- DELETE FROM project_automations WHERE id IN (...);

ALTER TABLE project_automations ADD CONSTRAINT fk_project_automations_org
  FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE NOT VALID;

ALTER TABLE project_automations VALIDATE CONSTRAINT fk_project_automations_org;
```

**Backfill / quarantine:**
```sql
-- Rows with non-existent org (must be 0 before ADD CONSTRAINT)
SELECT COUNT(*) FROM project_automations pa
LEFT JOIN organizations o ON o.id = pa.org_id
WHERE o.id IS NULL;
```

---

### §15 — `ticket_comment_reactions`: wire org_id + add composite FK → ticket_comments

**Problem:** `orgId: text("org_id").notNull()` and `userId: text("user_id").notNull()` both exist
with NO `.references()`. Neither org nor user is FK-enforced. Additionally, no composite FK ties
`(org_id, comment_id)` to `ticket_comments(org_id, id)`.

**Current state (tasks.ts lines 262–272):**
```ts
export const ticketCommentReactions = pgTable("ticket_comment_reactions", {
  id: serial("id").primaryKey(),
  commentId: integer("comment_id").notNull().references(() => ticketComments.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull(),
  orgId: text("org_id").notNull(),
  emoji: varchar("emoji", { length: 20 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex("uq_comment_reaction_user_emoji").on(t.commentId, t.userId, t.emoji),
  index("idx_comment_reactions_comment_id").on(t.commentId),
]);
```

> **Pre-requisite:** `ticket_comments` already has `org_id`. Add `UNIQUE(org_id, id)` candidate
> key on `ticket_comments` before declaring the composite FK.

**After:**
```ts
export const ticketCommentReactions = pgTable("ticket_comment_reactions", {
  id: serial("id").primaryKey(),
  orgId: text("org_id")
    .references(() => organizations.id, { onDelete: "cascade" }) // ADD .references()
    .notNull(),
  commentId: integer("comment_id").notNull()
    .references(() => ticketComments.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .references(() => users.id, { onDelete: "cascade" })         // ADD .references()
    .notNull(),
  emoji: varchar("emoji", { length: 20 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex("uq_comment_reaction_user_emoji").on(t.commentId, t.userId, t.emoji),
  index("idx_comment_reactions_comment_id").on(t.commentId),
  index("idx_comment_reactions_org").on(t.orgId),               // ADD
  foreignKey({                                                    // ADD
    name: "fk_comment_reactions_org_comment",
    columns: [t.orgId, t.commentId],
    foreignColumns: [ticketComments.orgId, ticketComments.id],
  }),
]);
```

**Generated SQL:**
```sql
-- 0. Candidate key on ticket_comments
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS uniq_ticket_comments_org_id
  ON ticket_comments (org_id, id);
ALTER TABLE ticket_comments
  ADD CONSTRAINT uniq_ticket_comments_org_id
  UNIQUE USING INDEX uniq_ticket_comments_org_id;

-- 1. Quarantine dangling org_ids
SELECT tcr.id FROM ticket_comment_reactions tcr
LEFT JOIN organizations o ON o.id = tcr.org_id
WHERE o.id IS NULL;
-- DELETE those rows.

-- 2. Quarantine dangling user_ids
SELECT tcr.id FROM ticket_comment_reactions tcr
LEFT JOIN users u ON u.id = tcr.user_id
WHERE u.id IS NULL;
-- DELETE those rows.

-- 3. Wire bare FKs
ALTER TABLE ticket_comment_reactions ADD CONSTRAINT fk_comment_reactions_org
  FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE NOT VALID;

ALTER TABLE ticket_comment_reactions ADD CONSTRAINT fk_comment_reactions_user
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE NOT VALID;

-- 4. Composite FK
ALTER TABLE ticket_comment_reactions ADD CONSTRAINT fk_comment_reactions_org_comment
  FOREIGN KEY (org_id, comment_id) REFERENCES ticket_comments(org_id, id) NOT VALID;

-- 5. Index
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_comment_reactions_org
  ON ticket_comment_reactions (org_id);

-- 6. Validate
ALTER TABLE ticket_comment_reactions VALIDATE CONSTRAINT fk_comment_reactions_org;
ALTER TABLE ticket_comment_reactions VALIDATE CONSTRAINT fk_comment_reactions_user;
ALTER TABLE ticket_comment_reactions VALIDATE CONSTRAINT fk_comment_reactions_org_comment;
```

**Backfill / quarantine:**
```sql
-- Reactions whose org_id doesn't match the comment's org (cross-tenant bug)
SELECT COUNT(*) FROM ticket_comment_reactions tcr
JOIN ticket_comments tc ON tc.id = tcr.comment_id
WHERE tc.org_id != tcr.org_id;
-- DELETE cross-org rows.
```

---

## PART D — WAVE 7 DEFERRED (mention only)

The following items are **Wave 7** and must NOT be touched in this wave:

| Column(s) | Table | Reason deferred |
|---|---|---|
| `pm_workspace_id text` (no FK) | `projects` | Wave 7-D — depends on `pm_workspaces.UNIQUE(org_id, pm_workspace_id)` landing in Wave 7-A |
| `pm_workspace_id text` (no FK) | `project_teams` | Same as above |
| `pm_workspace_id text` (no FK) | `project_workspace_members` | Same; also pending retire-vs-continue decision |
| `pm_workspace_id text` (no FK) | `managed_products` | Same |
| `(org_id, organization_membership_id)` composite FK | `pm_workspace_memberships` | Needs `organization_members.UNIQUE(org_id, id)` — Wave 7-A |

These columns are safe to leave as bare `text` until Wave 7. Do not add FKs or migrate them here.

---

## EXECUTION CHECKLIST

Run in this order within a single Drizzle migration file (separate `db:generate` → `db:push`):

```
[ ] §1  — uniq_projects_org_id       (CREATE UNIQUE INDEX CONCURRENTLY + UNIQUE USING INDEX)
[ ] §2  — uniq_tickets_org_id        (same pattern)
[ ] §3  — uniq_sprints_org_id        (same pattern)
[ ] §4  — ticket_assignees           (ADD COLUMN + backfill + NOT NULL + FKs + index)
[ ] §5  — ticket_label_mappings      (same)
[ ] §6  — ticket_watchers            (same)
[ ] §7  — work_item_relations        (same + cross-org quarantine FIRST)
[ ] §8  — uniq_ticket_checklists_org_id + ticket_checklist_items
[ ] §9  — ticket_custom_field_values
[ ] §10 — uniq_project_releases_org_id + release_tickets
[ ] §11 — ticket_related_links
[ ] §12 — uniq_project_templates_org_id + project_template_tickets
[ ] §13 — project_members
[ ] §14 — project_automations bare org FK
[ ] §15 — uniq_ticket_comments_org_id + ticket_comment_reactions (org + user FKs + composite)
[ ]  —— SEPARATE MAINTENANCE WINDOW ——
[ ] VALIDATE all NOT VALID constraints (one ALTER per constraint, run during low traffic)
```

> All `CREATE INDEX CONCURRENTLY` statements must run OUTSIDE a transaction block.
> All `ADD CONSTRAINT ... NOT VALID` statements run inside the migration transaction.
> All `VALIDATE CONSTRAINT` statements run in a separate maintenance-window transaction.

---

## SUMMARY

| Section | Table | Change type | Pre-requisite candidate key |
|---|---|---|---|
| §1 | `projects` | + `UNIQUE(org_id, id)` | — |
| §2 | `tickets` | + `UNIQUE(org_id, id)` | — |
| §3 | `sprints` | + `UNIQUE(org_id, id)` | — |
| §4 | `ticket_assignees` | + `org_id` col + composite FK → tickets | §2 |
| §5 | `ticket_label_mappings` | + `org_id` col + composite FK → tickets | §2 |
| §6 | `ticket_watchers` | + `org_id` col + composite FK → tickets | §2 |
| §7 | `work_item_relations` | + `org_id` col + composite FK → tickets | §2 |
| §8 | `ticket_checklist_items` | + `org_id` col + composite FK → ticket_checklists | candidate key on `ticket_checklists` |
| §9 | `ticket_custom_field_values` | + `org_id` col + composite FK → tickets | §2 |
| §10 | `release_tickets` | + `org_id` col + composite FK → project_releases | candidate key on `project_releases` |
| §11 | `ticket_related_links` | + `org_id` col + composite FK → tickets | §2 |
| §12 | `project_template_tickets` | + `org_id` col + composite FK → project_templates | candidate key on `project_templates` |
| §13 | `project_members` | + `org_id` col + composite FK → projects | §1 |
| §14 | `project_automations` | wire bare `org_id` → `.references(organizations)` | — |
| §15 | `ticket_comment_reactions` | wire bare `org_id` + `user_id` FKs + composite FK → ticket_comments | candidate key on `ticket_comments` |

**Total tables modified: 15 (3 candidate keys + 10 junction org_id additions + 2 bare FK hotfixes)**
