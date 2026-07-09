# Project Status & Workflow Enforcement Fix — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the dual-status-system confusion and harden workflow transition enforcement so (a) the board's "Add column" actually persists and renders, (b) status options in quick-actions and filter-bar are dynamic, and (c) workflow transitions enforce WIP limits, required fields, allowed roles, and approval gates.

**Architecture:**
- The backend already has one canonical status table (`project_statuses`) and one set of CRUD endpoints (`/projects/:id/custom-states`) that hit it — the naming is inconsistent but the data layer is correct. The frontend hooks (`useCustomStates`) correctly call those endpoints.
- The root issue is: (1) `resolveValidTicketStatuses` short-circuits for canonical names and never looks up `project_statuses`, so new statuses are always "invalid"; (2) `statusConfig`, `STATUSES` const, and `ticket-filter-bar` are hardcoded; (3) `assertTransitionAllowed` swallows errors and only checks allowed (from,to) pairs — it never enforces WIP limits, required fields, allowed roles, or approval gates.
- The `wipLimit` column already exists on `project_statuses`; the `workflowTransitions` table already has `requiredFields`, `allowedRoles`, and `requiresApproval` columns. All enforcement just needs to be written.

**Tech Stack:** NestJS + Drizzle (backend), Next.js App Router + TanStack Query v5 (frontend), TypeScript strict, Zod validation, Sonner toasts.

---

## Runtime Status-Flow Map (verified)

| Step | Detail |
|------|--------|
| Column source | `getProject` → `with: { statuses: orderBy(order) }` from `project_statuses` table |
| Column key | `s.name` (the text name string, e.g. `"TODO"`, `"Ready to Prod"`) — NOT the integer `id` |
| Drag-drop writes | `destination.droppableId` = column `id` = status name string → sent as `item.status` in `PATCH /projects/:id/tickets/reorder` |
| Single-ticket update | `PATCH /projects/:id/tickets/:id` → `updateTicket` → `assertTransitionAllowed(orgId, projectId, oldStatus, newStatus)` |
| Reorder validation | `resolveValidTicketStatuses` — **BUG**: short-circuits when all statuses are canonical (`TODO` etc.), never checking `project_statuses`. Custom statuses pass only if at least one non-canonical status is in the batch |
| Permission for create/delete status | `projects:manage` (existing in catalog) |
| Permission for workflow | `projects:workflow:manage` (existing in catalog) |
| `wipLimits` prop on KanbanBoard | Passed as `wipLimits?: Record<string, number>` — but in the project page this prop is **never passed** (it's accepted but unused at call site) |

---

## FIX 1 — Status System (items A–F below)

### Task 1: Fix `resolveValidTicketStatuses` to always merge `project_statuses`

**Files:**
- Modify: `backend/src/modules/projects/ticket-status.util.ts`

The current short-circuit (`if (nonCanonical.length === 0) return CANONICAL_TICKET_STATUSES`) means custom statuses added to `project_statuses` are never in the valid set when all submitted statuses are canonical. The fix: always fetch project statuses and merge them — but keep the DB call optional when the project has zero custom statuses (performance). The correct fix is to remove the early-return and always union canonical + project-specific rows. The CANONICAL set still serves as a fallback so projects with no `project_statuses` rows keep working.

- [ ] **Step 1: Update `ticket-status.util.ts`**

Replace the entire file:

```typescript
import { and, eq } from "drizzle-orm";
import { projectStatuses } from "../../db/schema";
import type { Db } from "../../db/drizzle.module";

const CANONICAL_TICKET_STATUSES = new Set(["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"]);

export async function resolveValidTicketStatuses(
  db: Db,
  projectId: number,
  orgId: string,
  _statuses: string[],
): Promise<Set<string>> {
  const rows = await db
    .select({ name: projectStatuses.name })
    .from(projectStatuses)
    .where(and(eq(projectStatuses.projectId, projectId), eq(projectStatuses.orgId, orgId)));
  const result = new Set(CANONICAL_TICKET_STATUSES);
  for (const row of rows) result.add(row.name);
  return result;
}
```

- [ ] **Step 2: Run backend typecheck**

```bash
pnpm -C backend typecheck
```

Expected: 0 new errors from this file.

---

### Task 2: Fix `assertTransitionAllowed` — real enforcement with WIP limits, required fields, allowed roles, approval gate

**Files:**
- Modify: `backend/src/modules/projects/projects-tickets-query.service.ts`

The current implementation already does transition-existence checking but (a) swallows all non-BadRequest errors silently (fail-open for DB errors) and (b) does not check WIP limits, required fields, allowed roles, or requiresApproval. The fix replaces the single method with full enforcement. All rule errors throw `BadRequestException`. DB/unexpected errors are allowed to propagate (fail-closed on the specific rule). Rules with incomplete config are skipped (not applied), which is safe.

The `assertTransitionAllowed` signature must be extended to accept `userId`, `userProjectRole`, `ticketFields`, and `projectId` context for the new rule checks.

Callers (`updateTicket` in `projects-tickets.service.ts` and `reorder` in `projects-tickets-query.service.ts`) must be updated to pass the new args.

- [ ] **Step 1: Update `assertTransitionAllowed` signature and implementation**

In `backend/src/modules/projects/projects-tickets-query.service.ts`, replace the `assertTransitionAllowed` method (lines 27–51) with:

```typescript
async assertTransitionAllowed(
  orgId: string,
  projectId: number,
  fromText: string,
  toText: string,
  context: {
    userId: string;
    userProjectRole: string | null;
    isOrgOwner: boolean;
    isPlatformAdmin: boolean;
    ticketId: number;
  },
): Promise<void> {
  const transitions = await this.db
    .select({
      fromStatusId: workflowTransitions.fromStatusId,
      toStatusId: workflowTransitions.toStatusId,
      requiresApproval: workflowTransitions.requiresApproval,
      requiredFields: workflowTransitions.requiredFields,
      allowedRoles: workflowTransitions.allowedRoles,
    })
    .from(workflowTransitions)
    .where(and(eq(workflowTransitions.orgId, orgId), eq(workflowTransitions.projectId, projectId), isNull(workflowTransitions.deletedAt)));

  if (transitions.length === 0) return;

  const statuses = await this.db
    .select({ id: projectStatuses.id, name: projectStatuses.name, wipLimit: projectStatuses.wipLimit })
    .from(projectStatuses)
    .where(and(eq(projectStatuses.orgId, orgId), eq(projectStatuses.projectId, projectId)));

  const nameToId = new Map(statuses.map((s) => [s.name, s.id]));
  const idToStatus = new Map(statuses.map((s) => [s.id, s]));

  const resolvedFrom = nameToId.get(fromText);
  const resolvedTo = nameToId.get(toText);

  if (resolvedFrom === undefined || resolvedTo === undefined) return;

  const matchingTransitions = transitions.filter(
    (t) => t.toStatusId === resolvedTo && (t.fromStatusId === resolvedFrom || t.fromStatusId === null),
  );

  if (matchingTransitions.length === 0) {
    throw new BadRequestException(`Transition from '${fromText}' to '${toText}' is not allowed by this project's workflow.`);
  }

  const bypassPrivilege = context.isOrgOwner || context.isPlatformAdmin;

  for (const transition of matchingTransitions) {
    if (transition.requiresApproval && !bypassPrivilege) {
      throw new BadRequestException(
        `This transition requires approval before moving to '${toText}'. Submit an approval request first.`,
      );
    }

    if (Array.isArray(transition.allowedRoles) && transition.allowedRoles.length > 0 && !bypassPrivilege) {
      if (!context.userProjectRole || !transition.allowedRoles.includes(context.userProjectRole)) {
        throw new BadRequestException(
          `Your project role ('${context.userProjectRole ?? "unknown"}') is not allowed to make this transition.`,
        );
      }
    }

    if (Array.isArray(transition.requiredFields) && transition.requiredFields.length > 0) {
      const ticketRow = await this.db
        .select({
          assigneeId: tickets.assigneeId,
          dueDate: tickets.dueDate,
          priority: tickets.priority,
          points: tickets.points,
          epicId: tickets.epicId,
          sprintId: tickets.sprintId,
        })
        .from(tickets)
        .where(and(eq(tickets.id, context.ticketId), eq(tickets.orgId, orgId)))
        .limit(1);

      if (ticketRow.length > 0) {
        const row = ticketRow[0];
        const missing: string[] = [];
        for (const field of transition.requiredFields) {
          if (field === "assigneeId" && !row.assigneeId) missing.push(field);
          else if (field === "dueDate" && !row.dueDate) missing.push(field);
          else if (field === "priority" && !row.priority) missing.push(field);
          else if (field === "points" && (row.points === null || row.points === undefined)) missing.push(field);
          else if (field === "epicId" && !row.epicId) missing.push(field);
          else if (field === "sprintId" && !row.sprintId) missing.push(field);
        }
        if (missing.length > 0) {
          throw new BadRequestException(
            `Cannot move to '${toText}': the following fields are required: ${missing.join(", ")}.`,
          );
        }
      }
    }
  }

  const toStatus = idToStatus.get(resolvedTo);
  if (toStatus?.wipLimit != null) {
    const [countResult] = await this.db
      .select({ count: count() })
      .from(tickets)
      .where(
        and(
          eq(tickets.orgId, orgId),
          eq(tickets.projectId, projectId),
          eq(tickets.status, toText),
          ne(tickets.id, context.ticketId),
        ),
      );
    const currentCount = countResult?.count ?? 0;
    if (currentCount >= toStatus.wipLimit) {
      throw new BadRequestException(
        `Column '${toText}' has reached its WIP limit of ${toStatus.wipLimit}. Move or complete an existing ticket first.`,
      );
    }
  }
}
```

Note: You need to add these imports at the top of the file:
- `count` from `drizzle-orm` (add to the existing import line: `import { and, desc, eq, inArray, isNull, ne, or, sql, count } from "drizzle-orm";`)

- [ ] **Step 2: Update callers of `assertTransitionAllowed` in `projects-tickets-query.service.ts` (`reorder` method)**

The `reorder` method (line 78) calls `assertTransitionAllowed` but doesn't have user context (role, isOrgOwner, isPlatformAdmin). Update the `reorder` method signature to accept a `context` parameter and pass it through:

Replace the `reorder` method signature from:
```typescript
async reorder(orgId: string, projectId: number, body: ReorderInput) {
```
to:
```typescript
async reorder(
  orgId: string,
  projectId: number,
  body: ReorderInput,
  context: { userId: string; userProjectRole: string | null; isOrgOwner: boolean; isPlatformAdmin: boolean },
) {
```

In the body of `reorder`, update the `assertTransitionAllowed` call:
```typescript
await this.assertTransitionAllowed(orgId, projectId, prev, item.status, {
  userId: context.userId,
  userProjectRole: context.userProjectRole,
  isOrgOwner: context.isOrgOwner,
  isPlatformAdmin: context.isPlatformAdmin,
  ticketId: item.id,
});
```

- [ ] **Step 3: Update `updateTicket` in `projects-tickets.service.ts` to pass context**

In `projects-tickets.service.ts`, the call at line ~345 is:
```typescript
this.query.assertTransitionAllowed(orgId, before.projectId, before.status, input.status)
```

Replace with:
```typescript
this.query.assertTransitionAllowed(orgId, before.projectId, before.status, input.status, {
  userId: actingUserId,
  userProjectRole: await this.resolveProjectRole(orgId, actingUserId, before.projectId),
  isOrgOwner: false,
  isPlatformAdmin: false,
  ticketId: ticketId,
})
```

Add a private helper `resolveProjectRole` in `projects-tickets.service.ts`:

```typescript
private async resolveProjectRole(orgId: string, userId: string, projectId: number): Promise<string | null> {
  const perms = await this.access.resolveUserPermissions(orgId, userId);
  if (perms.has("projects:manage")) return "OWNER";
  const member = await this.db
    .select({ role: projectMembers.role })
    .from(projectMembers)
    .where(and(eq(projectMembers.projectId, projectId), eq(projectMembers.userId, userId)))
    .limit(1);
  return member[0]?.role ?? null;
}
```

Note: Add `projectMembers` to the import in `projects-tickets.service.ts` if not already imported (it is already imported per the file).

- [ ] **Step 4: Update the controller call to `reorder` to pass context**

Find `projects.controller.ts` — locate the `reorder` endpoint handler. It calls `this.queryService.reorder(...)`. Update it to pass the user context:

```typescript
const member = await this.db ...  // need to look up member role
```

Actually, the simpler approach: look up the member role in the query service itself (inside reorder), using the `userId` already provided in the context. The controller just needs to pass `req.user` fields.

In the reorder handler in `projects.controller.ts`, add `isOrgOwner` and `isPlatformAdmin` from `req.user` (the `CurrentUserContext`). Check the controller's existing `CurrentUserContext` interface for those fields.

First, read what fields `CurrentUserContext` has:

Look in `backend/src/common/auth/backend-claims.ts` for `isOrgOwner` and `isPlatformAdmin`. Use those. Pass to the reorder call:
```typescript
return this.queryService.reorder(u.orgId, projectId, body, {
  userId: u.userId,
  userProjectRole: null, // resolved inside reorder from DB
  isOrgOwner: u.isOrgOwner ?? false,
  isPlatformAdmin: u.isPlatformAdmin ?? false,
});
```

Then inside `reorder`, resolve the role from the DB using the `userId` + `projectId`:
```typescript
const memberRow = await this.db
  .select({ role: projectMembers.role })
  .from(projectMembers)
  .where(and(eq(projectMembers.projectId, projectId), eq(projectMembers.userId, context.userId)))
  .limit(1);
const userProjectRole = memberRow[0]?.role ?? null;
```

Then pass `userProjectRole` in the `assertTransitionAllowed` call.

- [ ] **Step 5: Run backend typecheck**

```bash
pnpm -C backend typecheck
```

Expected: 0 new errors. Fix any that appear before proceeding.

---

### Task 3: Fix `ProjectStatusRecord` type to include `type` and `wipLimit`

**Files:**
- Modify: `frontend/types/projects/projects.ts`

The `ProjectStatusRecord` interface is missing `type` and `wipLimit` which are returned by the backend. This causes type errors when accessing these fields on the frontend.

- [ ] **Step 1: Update `ProjectStatusRecord`**

In `frontend/types/projects/projects.ts`, replace:
```typescript
interface ProjectStatusRecord {
  id: number;
  orgId: string;
  projectId: number;
  name: string;
  order: number;
  color: string | null;
  createdAt: string | Date | null;
  updatedAt: string | Date | null;
}
```

With:
```typescript
export interface ProjectStatusRecord {
  id: number;
  orgId: string;
  projectId: number;
  name: string;
  order: number;
  color: string | null;
  type?: string | null;
  wipLimit?: number | null;
  createdAt: string | Date | null;
  updatedAt: string | Date | null;
}
```

(Also export it so it can be imported where needed.)

---

### Task 4: Make `statusConfig` dynamic — extend with project statuses at runtime

**Files:**
- Modify: `frontend/features/projects/shared/types.ts`

`statusConfig` must remain a static fallback for canonical statuses, but needs a helper that merges in project-specific statuses. Add `buildStatusConfig` and `getStatusEntry`.

- [ ] **Step 1: Add `buildStatusConfig` and `getStatusEntry` helpers to `types.ts`**

In `frontend/features/projects/shared/types.ts`, after the existing `statusConfig`, add:

```typescript
export interface StatusConfigEntry {
  label: string;
  dotColor: string;
  color?: string | null;
}

const TYPE_TO_DOT_COLOR: Record<string, string> = {
  unstarted: "bg-muted-foreground",
  started: "bg-blue-500",
  completed: "bg-green-500",
  cancelled: "bg-red-400",
};

export function buildStatusConfig(
  projectStatuses: Array<{ name: string; color: string | null; type?: string | null }>,
): Record<string, StatusConfigEntry> {
  const merged: Record<string, StatusConfigEntry> = { ...statusConfig };
  for (const s of projectStatuses) {
    merged[s.name] = {
      label: s.name.replace(/_/g, " "),
      dotColor: TYPE_TO_DOT_COLOR[s.type ?? "unstarted"] ?? "bg-muted-foreground",
      color: s.color,
    };
  }
  return merged;
}

export function getStatusEntry(
  config: Record<string, StatusConfigEntry>,
  key: string,
): StatusConfigEntry {
  return config[key] ?? { label: key.replace(/_/g, " "), dotColor: "bg-muted-foreground" };
}
```

---

### Task 5: Update `ticket-quick-actions.tsx` to use dynamic statuses

**Files:**
- Modify: `frontend/features/projects/views/ticket-quick-actions.tsx`

Remove the hardcoded `STATUSES` const. Accept `statuses` as a prop and derive the status list from it, falling back to the 4 canonical values.

- [ ] **Step 1: Update component props and remove hardcoded statuses**

In `frontend/features/projects/views/ticket-quick-actions.tsx`:

1. Remove the line: `const STATUSES = ["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"] as const;`

2. Import `buildStatusConfig`, `getStatusEntry`, `StatusConfigEntry` from `../shared/types`:
```typescript
import { statusConfig, priorityConfig, buildStatusConfig, getStatusEntry } from "../shared/types";
import type { ProjectStatusRecord } from "@/types/projects/projects";
```

3. Add `statuses` to the props interface:
```typescript
interface TicketQuickActionsProps {
  ticketId: number;
  projectId?: number;
  currentStatus: string;
  currentPriority?: string | null;
  currentAssigneeId?: string | null;
  className?: string;
  projectStatuses?: Array<{ name: string; color: string | null; type?: string | null }>;
}
```

4. Destructure `projectStatuses` in the function params.

5. Build a dynamic config and status list inside the component body (before return):
```typescript
const resolvedStatusConfig = projectStatuses && projectStatuses.length > 0
  ? buildStatusConfig(projectStatuses)
  : statusConfig;

const statusList = projectStatuses && projectStatuses.length > 0
  ? projectStatuses.map((s) => s.name)
  : (["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"] as const);
```

6. Replace the STATUSES.map in JSX with `statusList.map((status) => ...)` and use `getStatusEntry(resolvedStatusConfig, status)` for label and dot color.

---

### Task 6: Update `ticket-filter-bar.tsx` to accept and render dynamic statuses

**Files:**
- Modify: `frontend/features/projects/shared/ticket-filter-bar.tsx`

Remove the hardcoded `STATUSES` const. Accept an optional `statuses` prop.

- [ ] **Step 1: Update `TicketFilterBar` to accept `statuses` prop**

In `frontend/features/projects/shared/ticket-filter-bar.tsx`:

1. Remove: `const STATUSES = ["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"] as const;`

2. Add `statuses` to `TicketFilterBarProps`:
```typescript
interface TicketFilterBarProps {
  sprints?: { id: number; name: string }[];
  members?: {
    id: string;
    name: string | null;
    firstName: string | null;
    lastName: string | null;
  }[];
  statuses?: Array<{ name: string }>;
  showTypeFilter?: boolean;
  showSprintFilter?: boolean;
  showAssigneeFilter?: boolean;
  showDoneToggle?: boolean;
  hideCompleted?: boolean;
  onHideCompletedChange?: (checked: boolean) => void;
  doneCount?: number;
}
```

3. Destructure `statuses` in the function signature.

4. Add a derived status list inside the function body:
```typescript
const statusOptions = statuses && statuses.length > 0
  ? statuses.map((s) => s.name)
  : ["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"];
```

5. Replace the `{STATUSES.map(...)}` in JSX with:
```typescript
{statusOptions.map((s) => (
  <SelectItem key={s} value={s} className="text-xs">
    {s.replace(/_/g, " ")}
  </SelectItem>
))}
```

---

### Task 7: Pass `statuses` and `wipLimits` to the board from the project page

**Files:**
- Modify: `frontend/app/(authenticated)/projects/[projectId]/page.tsx`

The `statuses` prop is already extracted (lines 198–201). The `wipLimits` prop is accepted by `KanbanBoard` but never passed. Add it. Also pass `statuses` to `TicketFilterBar`.

- [ ] **Step 1: Build `wipLimits` from statuses and pass to KanbanBoard**

In `frontend/app/(authenticated)/projects/[projectId]/page.tsx`, after the `statuses` variable (line 201), add:

```typescript
const wipLimits = useMemo<Record<string, number>>(() => {
  if (!statuses) return {};
  const result: Record<string, number> = {};
  for (const s of statuses) {
    if (s.wipLimit != null) result[s.name] = s.wipLimit;
  }
  return result;
}, [statuses]);
```

Note: the `statuses` type cast on line 200 casts to `{ id: number; name: string; color: string | null; order: number }[]` which is missing `wipLimit`. Update the cast to include it:
```typescript
const statuses =
  data && "statuses" in data
    ? (data.statuses as { id: number; name: string; color: string | null; order: number; wipLimit?: number | null; type?: string | null }[])
    : undefined;
```

- [ ] **Step 2: Pass `wipLimits` to `KanbanBoard`**

In the JSX (around line 312), add `wipLimits={wipLimits}`:
```tsx
<KanbanBoard
  tickets={filteredTickets}
  projectId={projectId}
  projectKey={data.key}
  statuses={statuses}
  wipLimits={wipLimits}
  onTicketSelect={handleTicketSelect}
/>
```

- [ ] **Step 3: Pass `statuses` to `TicketFilterBar`**

Update the `TicketFilterBar` call to add the statuses prop:
```tsx
<TicketFilterBar
  members={members}
  statuses={statuses}
  showSprintFilter={false}
  showDoneToggle
  hideCompleted={hideCompleted}
  onHideCompletedChange={setHideCompleted}
  doneCount={doneCount}
/>
```

Also import `useMemo` — it's already imported.

- [ ] **Step 4: Pass `projectStatuses` to `TicketQuickActions`**

Find all usages of `TicketQuickActions` in the codebase (table view, list view, kanban card) and pass `projectStatuses={statuses}`. These components may be in `features/projects/views/`. For each call site where the surrounding component has access to the `statuses` array (either via prop or hook), pass it down.

Search: `grep -r "TicketQuickActions" frontend/features/projects/views/`

Then add `projectStatuses` to each call site.

---

### Task 8: Write migration `0193_seed_project_statuses.sql`

**Files:**
- Create: `backend/src/db/migrations/0193_seed_project_statuses.sql`

- [ ] **Step 1: Create the migration file**

```sql
-- Migration 0193: Seed default project_statuses for projects that have none
-- Also copies custom_states rows into project_statuses if not already present
-- Idempotent: uses WHERE NOT EXISTS throughout

INSERT INTO project_statuses (org_id, project_id, name, "order", color, type, created_at, updated_at)
SELECT
  p.org_id,
  p.id AS project_id,
  defaults.name,
  defaults.ord,
  defaults.color,
  defaults.type,
  NOW(),
  NOW()
FROM projects p
CROSS JOIN (VALUES
  ('TODO',        0, '#94a3b8', 'unstarted'),
  ('IN_PROGRESS', 1, '#3b82f6', 'started'),
  ('IN_REVIEW',   2, '#eab308', 'started'),
  ('DONE',        3, '#22c55e', 'completed')
) AS defaults(name, ord, color, type)
WHERE NOT EXISTS (
  SELECT 1
  FROM project_statuses ps
  WHERE ps.project_id = p.id
    AND ps.org_id = p.org_id
);

-- Copy custom_states rows into project_statuses for projects that have custom_states
-- but are missing equivalent project_statuses rows (best-effort, non-destructive)
INSERT INTO project_statuses (org_id, project_id, name, "order", color, type, created_at, updated_at)
SELECT
  cs.org_id,
  cs.project_id,
  cs.name,
  cs.sequence AS "order",
  cs.color,
  CASE cs.group
    WHEN 'backlog'    THEN 'unstarted'
    WHEN 'unstarted'  THEN 'unstarted'
    WHEN 'started'    THEN 'started'
    WHEN 'completed'  THEN 'completed'
    WHEN 'cancelled'  THEN 'cancelled'
    ELSE 'unstarted'
  END AS type,
  cs.created_at,
  NOW()
FROM custom_states cs
WHERE NOT EXISTS (
  SELECT 1
  FROM project_statuses ps
  WHERE ps.project_id = cs.project_id
    AND ps.org_id = cs.org_id
    AND LOWER(ps.name) = LOWER(cs.name)
);
```

---

### Task 9: Run frontend typecheck and fix any errors

- [ ] **Step 1: Run typecheck**

```bash
pnpm -C frontend typecheck
```

Fix all errors before proceeding. Common issues will be:
- `wipLimit` not in the statuses cast type (fixed in Task 7)
- `projectStatuses` prop not typed correctly in `TicketQuickActions` call sites
- `statuses` prop not in `TicketFilterBarProps` (fixed in Task 6)

---

## FIX 2 — Verify the `CurrentUserContext` fields for `isOrgOwner`/`isPlatformAdmin`

**Files:**
- Read: `backend/src/common/auth/backend-claims.ts`

Before writing Task 2 code, confirm the exact field names. The `req.user` object in NestJS may call them `isOrgOwner` and `isPlatformAdmin` or similar. Adjust the context object passed in Task 2 accordingly.

- [ ] **Step 1: Check `backend-claims.ts` for exact field names**

```bash
cat backend/src/common/auth/backend-claims.ts
```

Look for the `CurrentUserContext` or `JwtPayload` type. Use the exact field names from there when reading `req.user.isOrgOwner` and `req.user.isPlatformAdmin` in the controller.

---

## FIX 3 — Wire `reorder` context through from the controller

**Files:**
- Modify: `backend/src/modules/projects/projects.controller.ts`

Find the `reorder` controller method. It calls `this.queryService.reorder(...)`. Update it to pass user context.

- [ ] **Step 1: Update the reorder controller handler**

Find the line in `projects.controller.ts` that looks like:
```typescript
return this.queryService.reorder(u.orgId, projectId, body);
```

Replace with:
```typescript
return this.queryService.reorder(u.orgId, projectId, body, {
  userId: u.userId,
  userProjectRole: null,
  isOrgOwner: u.isOrgOwner ?? false,
  isPlatformAdmin: u.isPlatformAdmin ?? false,
});
```

The `userProjectRole: null` is fine because `reorder` will look it up from the DB internally (as designed in Task 2).

---

## Summary of Files Changed

**Backend:**
1. `backend/src/modules/projects/ticket-status.util.ts` — remove short-circuit; always fetch project_statuses
2. `backend/src/modules/projects/projects-tickets-query.service.ts` — full `assertTransitionAllowed` enforcement + `reorder` context param
3. `backend/src/modules/projects/projects-tickets.service.ts` — pass context to `assertTransitionAllowed`, add `resolveProjectRole`
4. `backend/src/modules/projects/projects.controller.ts` — pass context to `reorder`
5. `backend/src/db/migrations/0193_seed_project_statuses.sql` — seed default statuses + copy custom_states (NEW FILE)

**Frontend:**
6. `frontend/types/projects/projects.ts` — add `type` and `wipLimit` to `ProjectStatusRecord`, export it
7. `frontend/features/projects/shared/types.ts` — add `buildStatusConfig`, `getStatusEntry`, `StatusConfigEntry`
8. `frontend/features/projects/views/ticket-quick-actions.tsx` — dynamic status list from `projectStatuses` prop
9. `frontend/features/projects/shared/ticket-filter-bar.tsx` — dynamic status options from `statuses` prop
10. `frontend/app/(authenticated)/projects/[projectId]/page.tsx` — pass `wipLimits` to board, `statuses` to filter bar

---

## Do NOT Touch
- feedbucket code
- forms/intake code
- webhooks code
- comments code
- Any other feature module

---

## Verification Checklist
- [ ] `pnpm -C backend typecheck` — 0 errors
- [ ] `pnpm -C frontend typecheck` — 0 errors
- [ ] Adding a column via "Add column" on the board → re-renders without page reload
- [ ] New column persists after refresh (ticket can be dragged into it)
- [ ] Moving a ticket into a WIP-limited column when at limit → returns 400 with clear message
- [ ] Transition with `requiresApproval: true` → moving ticket blocked with clear message
- [ ] Status filter in filter-bar shows custom statuses
- [ ] Quick-actions status submenu shows custom statuses
