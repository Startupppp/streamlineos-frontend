---
wave: 0
type: composite-FK matrix (CRM + Projects/PM + Support + KB + Chat + Signos + Surveys + Blog + Automation + Timesheets + misc)
status: DRAFT
date: 2026-07-26
author: generated via full schema read (all files inspected)
---

# Wave 0 — Composite-FK Gate Matrix: CRM, Projects/PM, Support, KB, Chat, Signos, Surveys, Blog, Automation, Timesheets + misc

> Companion to `wave-7-composite-fk-matrix.md` which covers HR/payroll/inventory/finance/access and
> lists the 11 already-compliant tables. This document covers every remaining domain not in that
> file. Do NOT duplicate the 11 compliant rows from that document.
>
> **Reading the columns**
> - **org_id?** — present and non-nullable = ✔ | nullable = ~ | absent = ✗
> - **ID type** — child PK type as declared in Drizzle
> - **Target type** — what the composite FK target needs (must match child org_id type = `text`)
> - **Type match** — child `org_id text` == `organizations.id text`: ✔ | type mismatch: ❌
> - **Parent UNIQUE(org_id, id)?** — does the intended parent table already have a `unique(org_id, id)` constraint (not just an index) so it can be the target of a composite FK?
> - **Composite FK needed** — the `foreignKey({ columns:[orgId,parentId], foreignColumns:[parent.orgId, parent.id] })` declaration that is MISSING today
> - **Repair sketch** — what to do before adding the FK (data audit / quarantine approach)
> - **Wave** — which W7-* rollout wave this belongs to (from `wave-7-composite-fk-matrix.md`)

---

## STANDARD DISCLAIMER

The parent `UNIQUE(org_id, id)` column in this table refers to the **candidate key constraint** needed on the parent table before the FK can be declared, not on the child itself. In nearly every case below this constraint does NOT currently exist — `wave-7-composite-fk-matrix.md` §W7-HOTFIX through W7-H covers adding them in dependency order. Until the parent constraint lands, the composite FK declaration is "blocked" even if the child schema is otherwise ready.

---

## PART A — PM WORKSPACE CLUSTER (new tables: pm_workspaces / pm_workspace_memberships)

The wave-7 doc already records these two tables as **"(A) Compliant today"**. This section confirms and expands the record.

| Child table | Child col(s) | Parent → key | org_id? | Existing ID type | Target type | Type match | Parent UNIQUE(org_id,id)? | Composite FK declared? | Nullability | Repair / quarantine | Wave | Validation state |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `pm_workspaces` | `org_id` | `organizations(id)` | ✔ NOT NULL | `text` | `text` | ✔ | N/A (anchor) | N/A — direct bare `.references()` to anchor | NOT NULL | — | W7-A | ✔ confirmed |
| `pm_workspace_memberships` | `org_id, pm_workspace_id` | `pm_workspaces(org_id, pm_workspace_id)` | ✔ NOT NULL | `text` | `text` | ✔ | ✔ `unique("uniq_pm_workspaces_org_workspace")` | ✔ `foreignKey("fk_pm_ws_members_org_workspace")` | NOT NULL | — | W7-A | ✔ confirmed |
| `pm_workspace_memberships` | `organization_membership_id` | `organization_members(id)` | ✔ (via orgId) | `integer` | `integer` | ⚠ BARE single-col FK only | ✗ no `unique(org_id, id)` on `organization_members` yet | ✗ **GAP: no composite FK (org_id, organization_membership_id) → organization_members(org_id, id)** | NOT NULL | Must add `unique(org_id, id)` to `organization_members` first (Wave 1), then widen to composite | W7-A | ❌ OPEN — composite FK to org_members missing |

**Special attention note (per prompt):** `pm_workspace_memberships.organization_membership_id` references `organizationMembers.id` as a bare single-column FK (`integer`). `organization_members` does NOT have a `unique(org_id, id)` constraint today, so the composite FK `(org_id, organization_membership_id) → organization_members(org_id, id)` CANNOT be declared until Wave 1 adds that constraint. This is a confirmed gap.

---

## PART B — pm_workspace_id BARE TEXT COLUMNS (no FK anywhere)

These columns were added during the PM Workspace backfill. They hold the workspace id as bare `text` with no FK constraint, no composite key target, and no DB-enforced referential integrity.

| Table | Column | Current definition | Gap | Required action | Wave |
|---|---|---|---|---|---|
| `projects` | `pm_workspace_id` | `text("pm_workspace_id")` — no `.references()`, no FK | No FK to `pm_workspaces` | After `pm_workspaces.unique(org_id, pm_workspace_id)` exists: add `foreignKey({columns:[orgId, pmWorkspaceId], foreignColumns:[pmWorkspaces.orgId, pmWorkspaces.pmWorkspaceId]}).onDelete("set null")` | W7-D |
| `project_teams` | `pm_workspace_id` | `text("pm_workspace_id")` — no `.references()`, no FK | No FK to `pm_workspaces` | Same as above | W7-D |
| `project_workspace_members` | `pm_workspace_id` | `text("pm_workspace_id")` — no `.references()`, no FK | No FK to `pm_workspaces` — this table is effectively the OLD workspace-member table pending replacement by `pm_workspace_memberships` | Decide: if this table is retired (superseded by `pm_workspace_memberships`), DROP it; otherwise add composite FK and add `org_id` to the unique index | W7-D |
| `managed_products` | `pm_workspace_id` | `text("pm_workspace_id")` — no `.references()`, no FK | No FK to `pm_workspaces` | Add composite FK post-backfill | W7-D |

**Note on `project_workspace_members`:** This table (`project-teams.ts`) has `unique(org_id, userId)` but `pm_workspace_id` is nullable text with no FK. It appears to be the pre-migration "workspace member" table that `pm_workspace_memberships` is intended to replace. Confirm retirement vs. continuation before adding any FKs.

---

## PART C — PROJECTS / PM CLUSTER (all tables in `projects/` subdirectory + `project-teams.ts`)

### C1 — Core delivery tables

| Child table | Child col | Parent → key | org_id? | Child PK type | Type match | Parent UNIQUE(org_id,id)? | Composite FK today? | Nullability | Wave |
|---|---|---|---|---|---|---|---|---|---|
| `projects` | `org_id` → `organizations` | anchor | ✔ NOT NULL | `serial` (int) | ✔ org_id text | N/A | N/A | NOT NULL | W7-D |
| `projects` | `deal_id` → `deals(id)` | `deals` | ✔ (via org_id) | `integer` | ✔ | ✗ no `unique(org_id, id)` on `deals` | ✗ MISSING | NULL | W7-D |
| `projects` | `managed_product_id` → `managed_products(id)` | `managed_products` | ✔ | `integer` | ✔ | ✗ no `unique(org_id, managed_product_id)` on `managed_products` | ✗ MISSING | NULL | W7-D |
| `sprints` | `org_id` → `organizations` | anchor | ✔ NOT NULL | `serial` | ✔ | N/A | N/A | NOT NULL | W7-D |
| `sprints` | `project_id` → `projects(id)` | `projects` | ✔ | `integer` | ✔ | ✗ no `unique(org_id, id)` on `projects` yet | ✗ MISSING | NOT NULL | W7-D |
| `custom_states` | `org_id` → `organizations` | anchor | ✔ NOT NULL | `serial` | ✔ | N/A | N/A | NOT NULL | W7-D |
| `custom_states` | `project_id` → `projects(id)` | `projects` | ✔ | `integer` | ✔ | ✗ | ✗ MISSING | NOT NULL | W7-D |
| `cycles` | `org_id` | anchor | ✔ | `serial` | ✔ | N/A | N/A | NOT NULL | W7-D |
| `cycles` | `project_id` → `projects(id)` | `projects` | ✔ | `integer` | ✔ | ✗ | ✗ MISSING | NOT NULL | W7-D |
| `modules` | `org_id` | anchor | ✔ | `serial` | ✔ | N/A | N/A | NOT NULL | W7-D |
| `modules` | `project_id` → `projects(id)` | `projects` | ✔ | `integer` | ✔ | ✗ | ✗ MISSING | NOT NULL | W7-D |
| `reports` | `org_id` | anchor | ✔ | `serial` | ✔ | N/A | N/A | NOT NULL | — (no parent resource beyond org) |
| `project_templates` | `org_id` | anchor | ✔ | `serial` | ✔ | N/A | N/A | NOT NULL | W7-D |
| `project_template_tickets` | `template_id` → `project_templates(id)` | `project_templates` | ✗ no org_id col | `serial` | ✗ org_id missing | ✗ | ✗ MISSING | NOT NULL | W7-D — **must add org_id first** |

### C2 — Members / statuses / views / intake / pages / milestones (`projects/members.ts`)

| Child table | Child col | Parent → key | org_id? | Child PK type | Type match | Parent UNIQUE? | Composite FK today? | Nullability | Wave |
|---|---|---|---|---|---|---|---|---|---|
| `project_statuses` | `org_id` | anchor | ✔ | `serial` | ✔ | N/A | N/A | NOT NULL | W7-D |
| `project_statuses` | `project_id` → `projects(id)` | `projects` | ✔ | `integer` | ✔ | ✗ | ✗ MISSING | NOT NULL | W7-D |
| `project_members` | `project_id` → `projects(id)` | `projects` | ✗ no org_id col | `serial` | ✗ org_id missing | ✗ | ✗ MISSING | NOT NULL | W7-D — **must add org_id first** |
| `project_views` | `org_id` | anchor | ✔ | `serial` | ✔ | N/A | N/A | NOT NULL | W7-D |
| `project_views` | `project_id` → `projects(id)` | `projects` | ✔ | `integer` | ✔ | ✗ | ✗ MISSING | NULL | W7-D |
| `intake_items` | `org_id` | anchor | ✔ | `serial` | ✔ | N/A | N/A | NOT NULL | W7-D |
| `intake_items` | `project_id` → `projects(id)` | `projects` | ✔ | `integer` | ✔ | ✗ | ✗ MISSING | NOT NULL | W7-D |
| `pages` | `org_id` | anchor | ✔ | `serial` | ✔ | N/A | N/A | NOT NULL | W7-D |
| `pages` | `project_id` → `projects(id)` | `projects` | ✔ | `integer` | ✔ | ✗ | ✗ MISSING | NOT NULL | W7-D |
| `project_milestones` | `org_id` | anchor | ✔ | `serial` | ✔ | N/A | N/A | NOT NULL | W7-D |
| `project_milestones` | `project_id` → `projects(id)` | `projects` | ✔ | `integer` | ✔ | ✗ | ✗ MISSING | NOT NULL | W7-D |

### C3 — Tickets and sub-resources (`projects/tasks.ts`)

| Child table | Child col | Parent → key | org_id? | Type match | Parent UNIQUE? | Composite FK today? | Nullability | Wave |
|---|---|---|---|---|---|---|---|---|
| `tickets` | `org_id` | anchor | ✔ | ✔ | N/A | N/A | NOT NULL | W7-D |
| `tickets` | `project_id` → `projects(id)` | `projects` | ✔ | ✔ | ✗ | ✗ MISSING | NULL | W7-D |
| `tickets` | `sprint_id` → `sprints(id)` | `sprints` | ✔ | ✔ | ✗ no `unique(org_id, id)` on sprints | ✗ MISSING | NULL | W7-D |
| `tickets` | `state_id` → `custom_states(id)` | `custom_states` | ✔ | ✔ | ✗ | ✗ MISSING | NULL | W7-D |
| `tickets` | `module_id` → `modules(id)` | `modules` | ✔ | ✔ | ✗ | ✗ MISSING | NULL | W7-D |
| `tickets` | `cycle_id` → `cycles(id)` | `cycles` | ✔ | ✔ | ✗ | ✗ MISSING | NULL | W7-D |
| `tickets` | `customer_id` → `crm_organizations(id)` | `crm_organizations` | ✔ (via org_id) | ✔ | ✗ | ✗ MISSING | NULL | W7-D/C |
| `ticket_assignees` | `ticket_id` → `tickets(id)` | `tickets` | ✗ no org_id | ✗ org_id missing | ✗ | ✗ MISSING | NOT NULL | W7-D — **must add org_id** |
| `ticket_comments` | `org_id` | anchor | ✔ | ✔ | N/A | N/A | NOT NULL | W7-D |
| `ticket_comments` | `ticket_id` → `tickets(id)` | `tickets` | ✔ | ✔ | ✗ | ✗ MISSING | NOT NULL | W7-D |
| `ticket_attachments` | `org_id` | anchor | ✔ | ✔ | N/A | N/A | NOT NULL | W7-D |
| `ticket_attachments` | `ticket_id` → `tickets(id)` | `tickets` | ✔ | ✔ | ✗ | ✗ MISSING | NOT NULL | W7-D |
| `ticket_labels` | `org_id` | anchor | ✔ | ✔ | N/A | N/A | NOT NULL | W7-D |
| `ticket_label_mappings` | `ticket_id` → `tickets(id)` | `tickets` | ✗ no org_id | ✗ org_id missing | ✗ | ✗ MISSING | NOT NULL | W7-D — **must add org_id** |
| `ticket_label_mappings` | `label_id` → `ticket_labels(id)` | `ticket_labels` | ✗ | ✗ | ✗ | ✗ MISSING | NOT NULL | W7-D |
| `ticket_watchers` | `ticket_id` → `tickets(id)` | `tickets` | ✗ no org_id | ✗ org_id missing | ✗ | ✗ MISSING | NOT NULL | W7-D — **must add org_id** |
| `work_item_relations` | `work_item_id` → `tickets(id)` | `tickets` | ✗ no org_id | ✗ org_id missing | ✗ | ✗ MISSING | NOT NULL | W7-D — **must add org_id** |
| `ticket_checklists` | `org_id` | anchor | ✔ | ✔ | N/A | N/A | NOT NULL | W7-D |
| `ticket_checklists` | `ticket_id` → `tickets(id)` | `tickets` | ✔ | ✔ | ✗ | ✗ MISSING | NOT NULL | W7-D |
| `ticket_checklist_items` | `checklist_id` → `ticket_checklists(id)` | `ticket_checklists` | ✗ no org_id | ✗ org_id missing | ✗ | ✗ MISSING | NOT NULL | W7-D — **must add org_id** |
| `project_custom_fields` | `org_id` | anchor | ✔ | ✔ | N/A | N/A | NOT NULL | W7-D |
| `project_custom_fields` | `project_id` → `projects(id)` | `projects` | ✔ | ✔ | ✗ | ✗ MISSING | NOT NULL | W7-D |
| `ticket_custom_field_values` | `ticket_id` → `tickets(id)` | `tickets` | ✗ no org_id | ✗ org_id missing | ✗ | ✗ MISSING | NOT NULL | W7-D — **must add org_id** |
| `project_releases` | `org_id` | anchor | ✔ | ✔ | N/A | N/A | NOT NULL | W7-D |
| `project_releases` | `project_id` → `projects(id)` | `projects` | ✔ | ✔ | ✗ | ✗ MISSING | NOT NULL | W7-D |
| `release_tickets` | `release_id` → `project_releases(id)` | `project_releases` | ✗ no org_id | ✗ org_id missing | ✗ | ✗ MISSING | NOT NULL | W7-D — **must add org_id** |
| `project_webhooks` | `org_id` | anchor | ✔ | ✔ | N/A | N/A | NOT NULL | W7-D |
| `project_webhooks` | `project_id` → `projects(id)` | `projects` | ✔ | ✔ | ✗ | ✗ MISSING | NOT NULL | W7-D |
| `webhook_deliveries` | `webhook_id` → `project_webhooks(id)` | `project_webhooks` | ✗ no org_id | ✗ org_id missing | ✗ | ✗ MISSING | NOT NULL | W7-D — **must add org_id** |
| `ticket_comment_reactions` | `comment_id` → `ticket_comments(id)` | `ticket_comments` | ✔ (present, no .references()) | ✔ | ✗ | ✗ MISSING **and no .references() on org_id** — wave-7 flags this as "missing FK entirely" | NOT NULL | W7-D — W7-HOTFIX for missing org FK |
| `ticket_related_links` | `ticket_id` → `tickets(id)` | `tickets` | ✗ no org_id | ✗ org_id missing | ✗ | ✗ MISSING | NOT NULL | W7-D — **must add org_id** |
| `project_automations` | `org_id` (no .references()) | anchor | ✔ (no FK!) | ✔ | N/A | N/A | NOT NULL | **W7-HOTFIX: add .references(organizations.id)** |

### C4 — Activity log (`projects/activity.ts`)

| Child table | Child col | Parent → key | org_id? | Type match | Parent UNIQUE? | Composite FK today? | Nullability | Wave |
|---|---|---|---|---|---|---|---|---|
| `ticket_activity_log` | `org_id` | anchor | ✔ | ✔ | N/A | N/A | NOT NULL | W7-D |
| `ticket_activity_log` | `ticket_id` → `tickets(id)` | `tickets` | ✔ | ✔ | ✗ | ✗ MISSING | NOT NULL | W7-D |
| `ticket_comment_mentions` | `org_id` | anchor | ✔ | ✔ | N/A | N/A | NOT NULL | W7-D |
| `ticket_comment_mentions` | `comment_id` → `ticket_comments(id)` | `ticket_comments` | ✔ | ✔ | ✗ | ✗ MISSING | NOT NULL | W7-D |

### C5 — Approvals, governance, whiteboards, git, meetings, QA, bugs, change requests, incidents, forms (`projects/` sub-files)

| Child table | Child col | Parent → key | org_id? | Type match | Parent UNIQUE? | Composite FK today? | Nullability | Wave |
|---|---|---|---|---|---|---|---|---|
| `project_approvals` | `org_id` | anchor | ✔ | ✔ | N/A | N/A | NOT NULL | W7-D |
| `project_approvals` | `project_id` → `projects(id)` | `projects` | ✔ | ✔ | ✗ | ✗ MISSING | NOT NULL | W7-D |
| `project_risks` | `org_id` | anchor | ✔ | ✔ | N/A | N/A | NOT NULL | W7-D |
| `project_risks` | `project_id` → `projects(id)` | `projects` | ✔ | ✔ | ✗ | ✗ MISSING | NOT NULL | W7-D |
| `project_decisions` | `org_id` | anchor | ✔ | ✔ | N/A | N/A | NOT NULL | W7-D |
| `project_decisions` | `project_id` → `projects(id)` | `projects` | ✔ | ✔ | ✗ | ✗ MISSING | NOT NULL | W7-D |
| `project_whiteboards` | `org_id` | anchor | ✔ | ✔ | N/A | N/A | NOT NULL | W7-D |
| `project_whiteboards` | `project_id` → `projects(id)` | `projects` | ✔ | ✔ | ✗ | ✗ MISSING | NOT NULL | W7-D |
| `project_whiteboard_shares` | `org_id` | anchor | ✔ | ✔ | N/A | N/A | NOT NULL | W7-D |
| `project_whiteboard_shares` | `whiteboard_id` → `project_whiteboards(id)` | `project_whiteboards` | ✔ | ✔ | ✗ | ✗ MISSING | NOT NULL | W7-D |
| `git_connections` | `org_id` | anchor | ✔ | ✔ | N/A | N/A | NOT NULL | W7-D |
| `git_connections` | `project_id` → `projects(id)` | `projects` | ✔ | ✔ | ✗ | ✗ MISSING | NULL | W7-D |
| `git_ticket_links` | `org_id` | anchor | ✔ | ✔ | N/A | N/A | NOT NULL | W7-D |
| `git_ticket_links` | `ticket_id` → `tickets(id)` | `tickets` | ✔ | ✔ | ✗ | ✗ MISSING | NOT NULL | W7-D |
| `git_ticket_links` | `connection_id` → `git_connections(id)` | `git_connections` | ✔ | ✔ | ✗ | ✗ MISSING | NULL | W7-D |
| `project_meetings` | `org_id` | anchor | ✔ | ✔ | N/A | N/A | NOT NULL | W7-D |
| `project_meetings` | `project_id` → `projects(id)` | `projects` | ✔ | ✔ | ✗ | ✗ MISSING | NOT NULL | W7-D |
| `project_meetings` | `sprint_id` → `sprints(id)` | `sprints` | ✔ | ✔ | ✗ | ✗ MISSING | NULL | W7-D |
| `meeting_attendees` | `org_id` | anchor | ✔ | ✔ | N/A | N/A | NOT NULL | W7-D |
| `meeting_attendees` | `meeting_id` → `project_meetings(id)` | `project_meetings` | ✔ | ✔ | ✗ | ✗ MISSING | NOT NULL | W7-D |
| `meeting_action_items` | `org_id` | anchor | ✔ | ✔ | N/A | N/A | NOT NULL | W7-D |
| `meeting_action_items` | `meeting_id` → `project_meetings(id)` | `project_meetings` | ✔ | ✔ | ✗ | ✗ MISSING | NOT NULL | W7-D |
| `meeting_action_items` | `project_id` → `projects(id)` | `projects` | ✔ | ✔ | ✗ | ✗ MISSING | NOT NULL | W7-D |
| `meeting_standup_entries` | `org_id` | anchor | ✔ | ✔ | N/A | N/A | NOT NULL | W7-D |
| `meeting_standup_entries` | `meeting_id` → `project_meetings(id)` | `project_meetings` | ✔ | ✔ | ✗ | ✗ MISSING | NOT NULL | W7-D |
| `test_suites` | `org_id` | anchor | ✔ | ✔ | N/A | N/A | NOT NULL | W7-D |
| `test_suites` | `project_id` → `projects(id)` | `projects` | ✔ | ✔ | ✗ | ✗ MISSING | NOT NULL | W7-D |
| `test_cases` | `org_id` | anchor | ✔ | ✔ | N/A | N/A | NOT NULL | W7-D |
| `test_cases` | `project_id` → `projects(id)` | `projects` | ✔ | ✔ | ✗ | ✗ MISSING | NOT NULL | W7-D |
| `test_cases` | `suite_id` → `test_suites(id)` | `test_suites` | ✔ | ✔ | ✗ | ✗ MISSING | NULL | W7-D |
| `test_runs` | `org_id` | anchor | ✔ | ✔ | N/A | N/A | NOT NULL | W7-D |
| `test_runs` | `project_id` → `projects(id)` | `projects` | ✔ | ✔ | ✗ | ✗ MISSING | NOT NULL | W7-D |
| `test_runs` | `sprint_id` → `sprints(id)` | `sprints` | ✔ | ✔ | ✗ | ✗ MISSING | NULL | W7-D |
| `test_runs` | `release_id` → `project_releases(id)` | `project_releases` | ✔ | ✔ | ✗ | ✗ MISSING | NULL | W7-D |
| `test_run_results` | `org_id` | anchor | ✔ | ✔ | N/A | N/A | NOT NULL | W7-D |
| `test_run_results` | `project_id` → `projects(id)` | `projects` | ✔ | ✔ | ✗ | ✗ MISSING | NOT NULL | W7-D |
| `test_run_results` | `run_id` → `test_runs(id)` | `test_runs` | ✔ | ✔ | ✗ | ✗ MISSING | NOT NULL | W7-D |
| `test_run_results` | `test_case_id` → `test_cases(id)` | `test_cases` | ✔ | ✔ | ✗ | ✗ MISSING | NOT NULL | W7-D |
| `bugs` | `org_id` | anchor | ✔ | ✔ | N/A | N/A | NOT NULL | W7-D |
| `bugs` | `project_id` → `projects(id)` | `projects` | ✔ | ✔ | ✗ | ✗ MISSING | NOT NULL | W7-D |
| `change_requests` | `org_id` | anchor | ✔ | ✔ | N/A | N/A | NOT NULL | W7-D |
| `change_requests` | `project_id` → `projects(id)` | `projects` | ✔ | ✔ | ✗ | ✗ MISSING | NOT NULL | W7-D |
| `project_incidents` | `org_id` | anchor | ✔ | ✔ | N/A | N/A | NOT NULL | W7-D |
| `project_incidents` | `project_id` → `projects(id)` | `projects` | ✔ | ✔ | ✗ | ✗ MISSING | NOT NULL | W7-D |
| `incident_updates` | `org_id` | anchor | ✔ | ✔ | N/A | N/A | NOT NULL | W7-D |
| `incident_updates` | `incident_id` → `project_incidents(id)` | `project_incidents` | ✔ | ✔ | ✗ | ✗ MISSING | NOT NULL | W7-D |
| `project_forms` | `org_id` | anchor | ✔ | ✔ | N/A | N/A | NOT NULL | W7-D |
| `project_forms` | `project_id` → `projects(id)` | `projects` | ✔ | ✔ | ✗ | ✗ MISSING | NOT NULL | W7-D |
| `form_submissions` | `org_id` | anchor | ✔ | ✔ | N/A | N/A | NOT NULL | W7-D |
| `form_submissions` | `form_id` → `project_forms(id)` | `project_forms` | ✔ | ✔ | ✗ | ✗ MISSING | NOT NULL | W7-D |
| `form_submissions` | `project_id` → `projects(id)` | `projects` | ✔ | ✔ | ✗ | ✗ MISSING | NOT NULL | W7-D |
| `workflow_transitions` | `org_id` | anchor | ✔ | ✔ | N/A | N/A | NOT NULL | W7-D |
| `workflow_transitions` | `project_id` → `projects(id)` | `projects` | ✔ | ✔ | ✗ | ✗ MISSING | NOT NULL | W7-D |
| `workflow_transitions` | `from_status_id` / `to_status_id` → `project_statuses(id)` | `project_statuses` | ✔ | ✔ | ✗ | ✗ MISSING | NULL/NOT NULL | W7-D |

### C6 — OKR Goals (`projects/goals.ts`)

| Child table | Child col | Parent → key | org_id? | Type match | Parent UNIQUE? | Composite FK today? | Nullability | Wave |
|---|---|---|---|---|---|---|---|---|
| `okr_goals` | `org_id` | anchor | ✔ | ✔ | N/A | N/A | NOT NULL | W7-D |
| `okr_goals` | `project_id` → `projects(id)` | `projects` | ✔ | ✔ | ✗ | ✗ MISSING | NULL | W7-D |
| `okr_key_results` | `org_id` | anchor | ✔ | ✔ | N/A | N/A | NOT NULL | W7-D |
| `okr_key_results` | `goal_id` → `okr_goals(id)` | `okr_goals` | ✔ | ✔ | ✗ | ✗ MISSING | NOT NULL | W7-D |
| `okr_updates` | `org_id` | anchor | ✔ | ✔ | N/A | N/A | NOT NULL | W7-D |
| `okr_updates` | `goal_id` → `okr_goals(id)` | `okr_goals` | ✔ | ✔ | ✗ | ✗ MISSING | NOT NULL | W7-D |
| `okr_links` | `org_id` | anchor | ✔ | ✔ | N/A | N/A | NOT NULL | W7-D |
| `okr_links` | `goal_id` → `okr_goals(id)` | `okr_goals` | ✔ | ✔ | ✗ | ✗ MISSING | NOT NULL | W7-D |

### C7 — Roadmap / Feedback / Changelog (`projects/roadmap.ts`)

| Child table | Child col | Parent → key | org_id? | Type match | Parent UNIQUE? | Composite FK today? | Wave |
|---|---|---|---|---|---|---|---|
| `roadmap_items` | `org_id` | anchor | ✔ | ✔ | N/A | N/A | W7-D |
| `roadmap_votes` | `org_id` | anchor | ✔ | ✔ | N/A | N/A | W7-D |
| `roadmap_votes` | `roadmap_item_id` → `roadmap_items(id)` | `roadmap_items` | ✔ | ✔ | ✗ | ✗ MISSING | W7-D |
| `feedback_posts` | `org_id` | anchor | ✔ | ✔ | N/A | N/A | W7-D |
| `feedback_votes` | `org_id` | anchor | ✔ | ✔ | N/A | N/A | W7-D |
| `feedback_votes` | `feedback_post_id` → `feedback_posts(id)` | `feedback_posts` | ✔ | ✔ | ✗ | ✗ MISSING | W7-D |
| `changelog_entries` | `org_id` | anchor | ✔ | ✔ | N/A | N/A | W7-D |

### C8 — Reporting (`projects/reporting.ts`)

| Child table | Child col | Parent → key | org_id? | Type match | Parent UNIQUE? | Composite FK today? | Wave |
|---|---|---|---|---|---|---|---|
| `project_daily_snapshots` | `org_id` | anchor | ✔ | ✔ | N/A | N/A | W7-D |
| `project_daily_snapshots` | `project_id` → `projects(id)` | `projects` | ✔ | ✔ | ✗ | ✗ MISSING | W7-D |

### C9 — Portfolios (`projects/portfolios.ts`)

| Child table | Child col | Parent → key | org_id? | Type match | Parent UNIQUE? | Composite FK today? | Wave |
|---|---|---|---|---|---|---|---|
| `project_portfolios` | `org_id` | anchor | ✔ | ✔ | N/A | N/A | W7-D |
| `project_programs` | `org_id` | anchor | ✔ | ✔ | N/A | N/A | W7-D |
| `project_programs` | `portfolio_id` → `project_portfolios(id)` | `project_portfolios` | ✔ | ✔ | ✗ | ✗ MISSING | NULL | W7-D |
| `portfolio_projects` | `org_id` | anchor | ✔ | ✔ | N/A | N/A | W7-D |
| `portfolio_projects` | `portfolio_id` → `project_portfolios(id)` | `project_portfolios` | ✔ | ✔ | ✗ | ✗ MISSING | NOT NULL | W7-D |
| `portfolio_projects` | `project_id` → `projects(id)` | `projects` | ✔ | ✔ | ✗ | ✗ MISSING | NOT NULL | W7-D |
| `program_projects` | `org_id` | anchor | ✔ | ✔ | N/A | N/A | W7-D |
| `program_projects` | `program_id` → `project_programs(id)` | `project_programs` | ✔ | ✔ | ✗ | ✗ MISSING | NOT NULL | W7-D |
| `program_projects` | `project_id` → `projects(id)` | `projects` | ✔ | ✔ | ✗ | ✗ MISSING | NOT NULL | W7-D |

### C10 — Project Teams (`project-teams.ts`)

| Child table | Child col | Parent → key | org_id? | Type match | Parent UNIQUE? | Composite FK today? | Wave |
|---|---|---|---|---|---|---|---|
| `project_teams` | `org_id` | anchor | ✔ | ✔ | N/A | N/A | W7-D |
| `project_team_members` | `org_id` | anchor | ✔ | ✔ | N/A | N/A | W7-D |
| `project_team_members` | `team_id` → `project_teams(id)` | `project_teams` | ✔ | ✔ | ✗ no `unique(org_id, id)` on `project_teams` | ✗ MISSING | NOT NULL | W7-D |
| `project_workspace_members` | `org_id` | anchor | ✔ | ✔ | N/A | N/A | W7-D |
| `project_team_assignments` | `org_id` | anchor | ✔ | ✔ | N/A | N/A | W7-D |
| `project_team_assignments` | `project_id` → `projects(id)` | `projects` | ✔ | ✔ | ✗ | ✗ MISSING | NOT NULL | W7-D |
| `project_team_assignments` | `team_id` → `project_teams(id)` | `project_teams` | ✔ | ✔ | ✗ | ✗ MISSING | NOT NULL | W7-D |

---

## PART D — CRM CLUSTER

> Wave-7 doc (W7-C) covers this cluster. The table below records the FK gaps found in the actual schema files.

### D1 — Campaigns / Leads (crm/campaigns.ts, crm/leads.ts)

| Child table | Child col | Parent → key | org_id? | Type match | Parent UNIQUE? | Composite FK today? | Nullability | Wave |
|---|---|---|---|---|---|---|---|---|
| `crm_campaigns` | `org_id` | anchor | ✔ | ✔ | N/A | N/A | NOT NULL | W7-C |
| `crm_leads` | `org_id` | anchor | ✔ | ✔ | N/A | N/A | NOT NULL | W7-C |
| `crm_leads` | `campaign_id` → `crm_campaigns(id)` | `crm_campaigns` | ✔ | ✔ | ✗ | ✗ MISSING | NULL | W7-C |
| `leads` | `org_id` | anchor | ✔ | ✔ | N/A | N/A | NOT NULL | W7-C |
| `leads` | `campaign_id` → `crm_campaigns(id)` | `crm_campaigns` | ✔ | ✔ | ✗ | ✗ MISSING | NULL | W7-C |
| `lead_activities` | `org_id` | anchor | ✔ | ✔ | N/A | N/A | NOT NULL | W7-C |
| `lead_activities` | `lead_id` → `leads(id)` | `leads` | ✔ | ✔ | ✗ | ✗ MISSING | NOT NULL | W7-C |
| `lead_notes` | `org_id` | anchor | ✔ | ✔ | N/A | N/A | NOT NULL | W7-C |
| `lead_notes` | `lead_id` → `leads(id)` | `leads` | ✔ | ✔ | ✗ | ✗ MISSING | NOT NULL | W7-C |
| `lead_tasks` | `org_id` | anchor | ✔ | ✔ | N/A | N/A | NOT NULL | W7-C |
| `lead_tasks` | `lead_id` → `leads(id)` | `leads` | ✔ | ✔ | ✗ | ✗ MISSING | NOT NULL | W7-C |
| `lead_emails` | `org_id` | anchor | ✔ | ✔ | N/A | N/A | NOT NULL | W7-C |
| `lead_emails` | `lead_id` → `leads(id)` | `leads` | ✔ | ✔ | ✗ | ✗ MISSING | NOT NULL | W7-C |
| `lead_scoring_rules` | `org_id` | anchor | ✔ | ✔ | N/A | N/A | NOT NULL | W7-C |
| `lead_assignment_rules` | `org_id` | anchor | ✔ | ✔ | N/A | N/A | NOT NULL | W7-C |
| `lead_import_batches` | `org_id` | anchor | ✔ | ✔ | N/A | N/A | NOT NULL | W7-C |
| `web_lead_forms` | `org_id` | anchor | ✔ | ✔ | N/A | N/A | NOT NULL | W7-C |

### D2 — Contacts / Clients / Accounts (crm/contacts.ts)

| Child table | Child col | Parent → key | org_id? | Type match | Parent UNIQUE? | Composite FK today? | Wave |
|---|---|---|---|---|---|---|---|
| `branches` | `org_id` | anchor | ✔ | ✔ | N/A | N/A | W7-C |
| `clients` | `org_id` | anchor | ✔ | ✔ | N/A | N/A | W7-C |
| `clients` | `lead_id` → `leads(id)` | `leads` | ✔ | ✔ | ✗ | ✗ MISSING | W7-C |
| `client_accounts` | `org_id` | anchor | ✔ | ✔ | N/A | N/A | W7-C |
| `client_accounts` | `branch_id` → `branches(id)` | `branches` | ✔ | ✔ | ✗ | ✗ MISSING | W7-C |
| `client_accounts` | `lead_id` → `leads(id)` | `leads` | ✔ | ✔ | ✗ | ✗ MISSING | W7-C |
| `client_account_activities` | `client_account_id` → `client_accounts(id)` | `client_accounts` | ✗ no org_id | ✗ | ✗ | ✗ MISSING | W7-C — **must add org_id** |
| `crm_organizations` | `org_id` | anchor | ✔ | ✔ | N/A | N/A | W7-C |
| `contacts` | `org_id` | anchor | ✔ | ✔ | N/A | N/A | W7-C |
| `contacts` | `organization_id` → `crm_organizations(id)` | `crm_organizations` | ✔ | ✔ | ✗ | ✗ MISSING | W7-C |
| `client_opportunities` | `org_id` | anchor | ✔ | ✔ | N/A | N/A | W7-C |
| `client_opportunities` | `client_id` → `clients(id)` | `clients` | ✔ | ✔ | ✗ | ✗ MISSING | W7-C |
| `client_onboarding_templates` | `org_id` | anchor | ✔ | ✔ | N/A | N/A | W7-C |
| `client_onboarding_items` | `org_id` | anchor | ✔ | ✔ | N/A | N/A | W7-C |
| `client_onboarding_items` | `client_id` → `clients(id)` | `clients` | ✔ | ✔ | ✗ | ✗ MISSING | W7-C |
| `csat_surveys` | `org_id` | anchor | ✔ | ✔ | N/A | N/A | W7-C |
| `csat_surveys` | `client_id` → `clients(id)` | `clients` | ✔ | ✔ | ✗ | ✗ MISSING | W7-C |
| `csat_responses` | `org_id` | anchor | ✔ | ✔ | N/A | N/A | W7-C |
| `csat_responses` | `survey_id` → `csat_surveys(id)` | `csat_surveys` | ✔ | ✔ | ✗ | ✗ MISSING | W7-C |

### D3 — Deals (`crm/deals.ts`)

| Child table | Child col | Parent → key | org_id? | Type match | Parent UNIQUE? | Composite FK today? | Wave |
|---|---|---|---|---|---|---|---|
| `deals` | `org_id` | anchor | ✔ | ✔ | N/A | N/A | W7-C |
| `deals` | `lead_id` → `leads(id)` | `leads` | ✔ | ✔ | ✗ | ✗ MISSING | W7-C |
| `deals` | `client_id` → `clients(id)` | `clients` | ✔ | ✔ | ✗ | ✗ MISSING | W7-C |
| `deal_activities` | `org_id` | anchor | ✔ | ✔ | N/A | N/A | W7-C |
| `deal_activities` | `deal_id` → `deals(id)` | `deals` | ✔ | ✔ | ✗ | ✗ MISSING | W7-C |
| `deal_meetings` | `org_id` | anchor | ✔ | ✔ | N/A | N/A | W7-C |
| `deal_meetings` | `deal_id` → `deals(id)` | `deals` | ✔ | ✔ | ✗ | ✗ MISSING | W7-C |

### D4 — Invoices / Payments / Quotes / Support Tickets (`crm/billing.ts`)

| Child table | Child col | Parent → key | org_id? | Type match | Parent UNIQUE? | Composite FK today? | Gap notes | Wave |
|---|---|---|---|---|---|---|---|---|
| `invoices` | `org_id` | anchor | ✔ | ✔ | N/A | N/A | | W7-C |
| `invoices` | `client_id` → `clients(id)` | `clients` | ✔ | ✔ | ✗ | ✗ MISSING | | W7-C |
| `invoices` | `project_id` → `projects(id)` | `projects` | ✔ | ✔ | ✗ | ✗ MISSING | | W7-C |
| `invoice_items` | `invoice_id` → `invoices(id)` | `invoices` | ✗ no org_id | ✗ | ✗ | ✗ MISSING | **must add org_id** | W7-C |
| `payments` | `org_id` | anchor | ✔ | ✔ | N/A | N/A | | W7-C |
| `payments` | `invoice_id` → `invoices(id)` | `invoices` | ✔ | ✔ | ✗ | ✗ MISSING | | W7-C |
| `purchase_bills` | `org_id` | anchor | ✔ | ✔ | N/A | N/A | | W7-C |
| `purchase_bills` | `vendor_id` → `clients(id)` | `clients` | ✔ | ✔ | ✗ | ✗ MISSING | | W7-C |
| `purchase_bill_items` | `bill_id` → `purchase_bills(id)` | `purchase_bills` | ✗ no org_id | ✗ | ✗ | ✗ MISSING | **must add org_id** | W7-C |
| `vendor_payments` | `org_id` | anchor | ✔ | ✔ | N/A | N/A | | W7-C |
| `vendor_payments` | `bill_id` → `purchase_bills(id)` | `purchase_bills` | ✔ | ✔ | ✗ | ✗ MISSING | | W7-C |
| `support_tickets` | `org_id` | anchor | ✔ | ✔ | N/A | N/A | | W7-C |
| `support_tickets` | `client_id` → `clients(id)` | `clients` | ✔ | ✔ | ✗ | ✗ MISSING | | W7-C |
| `support_ticket_messages` | `ticket_id` → `support_tickets(id)` | `support_tickets` | ✗ no org_id | ✗ | ✗ | ✗ MISSING | **must add org_id** | W7-C |
| `quotes` | `org_id` | anchor | ✔ | ✔ | N/A | N/A | | W7-C |
| `quotes` | `deal_id` → `deals(id)` | `deals` | ✔ | ✔ | ✗ | ✗ MISSING | | W7-C |
| `quotes` | `client_id` → `client_accounts(id)` | `client_accounts` | ✔ | ✔ | ✗ | ✗ MISSING | | W7-C |
| `quote_line_items` | `quote_id` → `quotes(id)` | `quotes` | ✗ no org_id | ✗ | ✗ | ✗ MISSING | **must add org_id** | W7-C |

---

## PART E — SUPPORT MODULE (`support/` subdirectory)

### E1 — Workspace / queues / views / watchers / tags

| Child table | Child col | Parent → key | org_id? | Type match | Parent UNIQUE? | Composite FK today? | Wave |
|---|---|---|---|---|---|---|---|
| `support_queues` | `org_id` | anchor | ✔ | ✔ | N/A | N/A | W7-G |
| `support_saved_views` | `org_id` | anchor | ✔ | ✔ | N/A | N/A | W7-G |
| `support_ticket_watchers` | `org_id` | anchor | ✔ | ✔ | N/A | N/A | W7-G |
| `support_ticket_watchers` | `ticket_id` → `support_tickets(id)` | `support_tickets` | ✔ | ✔ | ✗ | ✗ MISSING | W7-G |
| `support_tags` | `org_id` | anchor | ✔ | ✔ | N/A | N/A | W7-G |
| `support_ticket_tags` | `ticket_id` → `support_tickets(id)` | `support_tickets` | ✗ no org_id | ✗ | ✗ | ✗ MISSING — **must add org_id** | W7-G |
| `support_ticket_links` | `org_id` | anchor | ✔ | ✔ | N/A | N/A | W7-G |
| `support_ticket_links` | `ticket_id` → `support_tickets(id)` | `support_tickets` | ✔ | ✔ | ✗ | ✗ MISSING | W7-G |

### E2 — SLA / business hours / channels

| Child table | Child col | Parent → key | org_id? | Type match | Composite FK? | Wave |
|---|---|---|---|---|---|---|
| `support_business_hours` | `org_id` | anchor | ✔ | ✔ | N/A | W7-G |
| `support_sla_policies` | `org_id` | anchor | ✔ | ✔ | N/A | W7-G |
| `support_sla_policies` | `business_hours_id` | `support_business_hours` | ✔ | ✔ | ✗ bare int FK only, no composite | W7-G |
| `support_channels` | `org_id` | anchor | ✔ | ✔ | N/A | W7-G |

### E3 — Activity / CSAT / AI

| Child table | Child col | Parent → key | org_id? | Type match | Composite FK? | Wave |
|---|---|---|---|---|---|---|
| `support_ticket_activity` | `org_id` | anchor | ✔ | ✔ | N/A | W7-G |
| `support_ticket_activity` | `support_ticket_id` → `support_tickets(id)` | `support_tickets` | ✔ | ✔ | ✗ MISSING | W7-G |
| `support_csat_requests` | `org_id` | anchor | ✔ | ✔ | N/A | W7-G |
| `support_csat_requests` | `ticket_id` → `support_tickets(id)` | `support_tickets` | ✔ | ✔ | ✗ MISSING | W7-G |
| `support_ai_suggestions` | `org_id` | anchor | ✔ | ✔ | N/A | W7-G |
| `support_ai_suggestions` | `ticket_id` → `support_tickets(id)` | `support_tickets` | ✔ | ✔ | ✗ MISSING | W7-G |
| `support_ai_settings` | `org_id` | anchor | ✔ | ✔ | N/A | W7-G |
| `support_ticket_embeddings` | `org_id` | anchor | ✔ | ✔ | N/A | W7-G |
| `support_ticket_embeddings` | `ticket_id` → `support_tickets(id)` | `support_tickets` | ✔ | ✔ | ✗ MISSING | W7-G |

### E4 — Agent routing / macros / productivity

| Child table | Child col | Parent → key | org_id? | Composite FK? | Wave |
|---|---|---|---|---|---|
| `support_agent_skills` | `org_id` | anchor | ✔ | N/A | W7-G |
| `support_agent_availability` | `org_id` | anchor | ✔ | N/A | W7-G |
| `support_vip_clients` | `org_id` | anchor | ✔ | N/A | W7-G |
| `support_vip_clients` | `client_id` → `clients(id)` | `clients` | ✔ | ✗ MISSING | W7-G |
| `support_macros` | `org_id` | anchor | ✔ | N/A | W7-G |
| `support_routing_rules` | `org_id` | anchor | ✔ | N/A | W7-G |
| `support_message_mentions` | `org_id` | anchor | ✔ | N/A | W7-G |
| `support_message_mentions` | `message_id` → `support_ticket_messages(id)` | `support_ticket_messages` | ✔ | ✗ MISSING | W7-G |
| `support_ticket_drafts` | `org_id` | anchor | ✔ | N/A | W7-G |
| `support_ticket_drafts` | `ticket_id` → `support_tickets(id)` | `support_tickets` | ✔ | ✗ MISSING | W7-G |
| `support_knowledge_gaps` | `org_id` | anchor | ✔ | N/A | W7-G |

---

## PART F — KB MODULE (`support/kb.ts` + `kb/` subdirectory)

### F1 — Support KB (legacy article system, `support/kb.ts`)

| Child table | Child col | Parent → key | org_id? | Type match | Parent UNIQUE? | Composite FK? | Wave |
|---|---|---|---|---|---|---|---|
| `kb_categories` | `org_id` | anchor | ✔ | ✔ | N/A | N/A | W7-G |
| `kb_articles` | `org_id` | anchor | ✔ | ✔ | N/A | N/A | W7-G |
| `kb_articles` | `category_id` → `kb_categories(id)` | `kb_categories` | ✔ | ✔ | ✗ | ✗ MISSING | W7-G |
| `kb_article_feedback` | `org_id` | anchor | ✔ | ✔ | N/A | N/A | W7-G |
| `kb_article_feedback` | `article_id` → `kb_articles(id)` | `kb_articles` | ✔ | ✔ | ✗ | ✗ MISSING | W7-G |
| `kb_article_chunks` | `org_id` | anchor | ✔ | ✔ | N/A | N/A | W7-G |
| `kb_article_chunks` | `article_id` → `kb_articles(id)` | `kb_articles` | ✔ | ✔ | ✗ | ✗ MISSING | W7-G |
| `kb_article_chunks` | `page_id` → `kb_pages(id)` | `kb_pages` | ✔ | ✔ | ✗ | ✗ MISSING | W7-G |
| `kb_article_chunks` | `attachment_id` → `kb_article_attachments(id)` | `kb_article_attachments` | ✔ | ✔ | ✗ | ✗ MISSING | W7-G |
| `kb_article_chunks` | `source_id` → `kb_sources(id)` | `kb_sources` | ✔ | ✔ | ✗ | ✗ MISSING | W7-G |

### F2 — Plate KB (new page system, `kb/` subdirectory)

| Child table | Child col | Parent → key | org_id? | Type match | Parent UNIQUE? | Composite FK? | Wave |
|---|---|---|---|---|---|---|---|
| `kb_spaces` | `org_id` | anchor | ✔ | ✔ | N/A | N/A | W7-G |
| `kb_space_members` | `org_id` | anchor | ✔ | ✔ | N/A | N/A | W7-G |
| `kb_space_members` | `space_id` → `kb_spaces(id)` | `kb_spaces` | ✔ | ✔ | ✗ | ✗ MISSING | W7-G |
| `kb_pages` | `org_id` | anchor | ✔ | ✔ | N/A | N/A | W7-G |
| `kb_pages` | `space_id` → `kb_spaces(id)` | `kb_spaces` | ✔ | ✔ | ✗ | ✗ MISSING | W7-G |
| `kb_pages` | `project_id` → `projects(id)` | `projects` | ✔ | ✔ | ✗ | ✗ MISSING | W7-G |
| `kb_page_favorites` | `org_id` | anchor | ✔ | ✔ | N/A | N/A | W7-G |
| `kb_page_favorites` | `page_id` → `kb_pages(id)` | `kb_pages` | ✔ | ✔ | ✗ | ✗ MISSING | W7-G |
| `kb_page_visits` | `org_id` | anchor | ✔ | ✔ | N/A | N/A | W7-G |
| `kb_page_visits` | `page_id` → `kb_pages(id)` | `kb_pages` | ✔ | ✔ | ✗ | ✗ MISSING | W7-G |
| `kb_page_links` | `org_id` | anchor | ✔ | ✔ | N/A | N/A | W7-G |
| `kb_page_links` | `source_page_id` → `kb_pages(id)` | `kb_pages` | ✔ | ✔ | ✗ | ✗ MISSING | W7-G |
| `kb_page_versions` | `org_id` | anchor | ✔ | ✔ | N/A | N/A | W7-G |
| `kb_page_versions` | `page_id` → `kb_pages(id)` | `kb_pages` | ✔ | ✔ | ✗ | ✗ MISSING | W7-G |
| `kb_page_comments` | `org_id` | anchor | ✔ | ✔ | N/A | N/A | W7-G |
| `kb_page_comments` | `page_id` → `kb_pages(id)` | `kb_pages` | ✔ | ✔ | ✗ | ✗ MISSING | W7-G |
| `kb_page_templates` | `org_id` | anchor | ✔ | ✔ | N/A | N/A | W7-G |
| `kb_page_reviews` | `org_id` | anchor | ✔ | ✔ | N/A | N/A | W7-G |
| `kb_page_reviews` | `page_id` → `kb_pages(id)` | `kb_pages` | ✔ | ✔ | ✗ | ✗ MISSING | W7-G |
| `kb_import_jobs` | `org_id` | anchor | ✔ | ✔ | N/A | N/A | W7-G |
| `kb_export_jobs` | `org_id` | anchor | ✔ | ✔ | N/A | N/A | W7-G |
| `kb_sources` | `org_id` | anchor | ✔ | ✔ | N/A | N/A | W7-G |
| `kb_sources` | `space_id` → `kb_spaces(id)` | `kb_spaces` | ✔ | ✔ | ✗ | ✗ MISSING | W7-G |
| `kb_tags` | `org_id` | anchor | ✔ | ✔ | N/A | N/A | W7-G |
| `kb_article_tags` | `article_id` → `kb_articles(id)` | `kb_articles` | ✗ no org_id | ✗ | ✗ | ✗ MISSING — **must add org_id** | W7-G |
| `kb_article_versions` | `org_id` | anchor | ✔ | ✔ | N/A | N/A | W7-G |
| `kb_article_versions` | `article_id` → `kb_articles(id)` | `kb_articles` | ✔ | ✔ | ✗ | ✗ MISSING | W7-G |
| `kb_article_restrictions` | `org_id` | anchor | ✔ | ✔ | N/A | N/A | W7-G |
| `kb_article_restrictions` | `article_id` → `kb_articles(id)` | `kb_articles` | ✔ | ✔ | ✗ | ✗ MISSING | W7-G |
| `kb_article_comments` | `org_id` | anchor | ✔ | ✔ | N/A | N/A | W7-G |
| `kb_article_comments` | `article_id` → `kb_articles(id)` | `kb_articles` | ✔ | ✔ | ✗ | ✗ MISSING | W7-G |
| `kb_events` | `org_id` | anchor | ✔ | ✔ | N/A | N/A | W7-G |
| `kb_events` | `article_id` → `kb_articles(id)` | `kb_articles` | ✔ | ✔ | ✗ | ✗ MISSING | W7-G |
| `kb_chat_conversations` | `org_id` | anchor | ✔ | ✔ | N/A | N/A | W7-G |
| `kb_chat_messages` | `org_id` | anchor | ✔ | ✔ | N/A | N/A | W7-G |
| `kb_chat_messages` | `conversation_id` → `kb_chat_conversations(id)` | `kb_chat_conversations` | ✔ | ✔ | ✗ | ✗ MISSING | W7-G |
| `tenant_ai_credits` | `org_id` | anchor unique | ✔ | ✔ | N/A | N/A | W7-G |
| `tenant_ai_credit_transactions` | `org_id` | anchor | ✔ | ✔ | N/A | N/A | W7-G |
| `kb_research_briefs` | `org_id` | anchor | ✔ | ✔ | N/A | N/A | W7-G |
| `kb_research_briefs` | `space_id` | ⚠ bare `integer` field, NO `.references()` declared | ✔ | ✔ | ✗ | **Missing .references() entirely** | W7-G — W7-HOTFIX for missing reference |

---

## PART G — CHAT MODULE (`chat.ts`)

| Child table | Child col | Parent → key | org_id? | Type match | Parent UNIQUE? | Composite FK? | Wave |
|---|---|---|---|---|---|---|---|
| `chat_channels` | `org_id` | anchor | ✔ | ✔ | N/A | N/A | W7-G |
| `chat_channels` | `linked_deal_id` → `deals(id)` | `deals` | ✔ | ✔ | ✗ | ✗ MISSING | W7-G |
| `chat_channel_members` | `channel_id` → `chat_channels(id)` | `chat_channels` | ✗ no org_id | ✗ | ✗ | ✗ MISSING — **must add org_id** | W7-G |
| `chat_messages` | `channel_id` → `chat_channels(id)` | `chat_channels` | ✗ no org_id | ✗ | ✗ | ✗ MISSING — **must add org_id** | W7-G |
| `chat_attachments` | `message_id` → `chat_messages(id)` | `chat_messages` | ✗ no org_id | ✗ | ✗ | ✗ MISSING — **must add org_id** | W7-G |
| `chat_user_presence` | `org_id` | anchor | ✔ | ✔ | N/A | N/A | W7-G |
| `chat_pinned_messages` | `channel_id` → `chat_channels(id)` | `chat_channels` | ✗ no org_id | ✗ | ✗ | ✗ MISSING — **must add org_id** | W7-G |
| `chat_saved_messages` | `message_id` → `chat_messages(id)` | `chat_messages` | ✗ no org_id | ✗ | ✗ | ✗ MISSING — **must add org_id** | W7-G |
| `chat_reply_reminders` | `org_id` | anchor | ✔ | ✔ | N/A | N/A | W7-G |
| `chat_reply_reminders` | `channel_id` → `chat_channels(id)` | `chat_channels` | ✔ | ✔ | ✗ | ✗ MISSING | W7-G |
| `chat_huddles` | `channel_id` → `chat_channels(id)` | `chat_channels` | ✗ no org_id | ✗ | ✗ | ✗ MISSING — **must add org_id** | W7-G |
| `chat_huddle_participants` | `huddle_id` → `chat_huddles(id)` | `chat_huddles` | ✗ no org_id | ✗ | ✗ | ✗ MISSING — **must add org_id** | W7-G |
| `chat_channel_invite_links` | `channel_id` → `chat_channels(id)` | `chat_channels` | ✗ no org_id | ✗ | ✗ | ✗ MISSING — **must add org_id** | W7-G |
| `chat_org_settings` | `org_id` | anchor unique | ✔ | ✔ | N/A | N/A | W7-G |

**Chat is particularly weak:** 8 of 14 tables are missing `org_id` entirely, meaning they inherit only a single-column FK through the channel hierarchy. Every single such table is missing org_id AND the composite FK.

---

## PART H — SIGNOS MODULE (`signos/`)

| Child table | Child col | Parent → key | org_id? | Type match | Parent UNIQUE? | Composite FK today? | Wave |
|---|---|---|---|---|---|---|---|
| `sign_templates` | `org_id` | anchor | ✔ | ✔ | N/A | N/A | W7-G |
| `sign_watermark_policies` | `org_id` | anchor | ✔ | ✔ | N/A | N/A | W7-G |
| `sign_org_settings` | `org_id` | anchor unique | ✔ | ✔ | N/A | N/A | W7-G |
| `sign_public_forms` | `org_id` | anchor | ✔ | ✔ | N/A | N/A | W7-G |
| `sign_public_forms` | `template_id` → `sign_templates(id)` | `sign_templates` | ✔ | ✔ | ✗ | ✗ MISSING | W7-G |
| `sign_envelopes` | `org_id` | anchor | ✔ | ✔ | N/A | N/A | W7-G |
| `sign_envelopes` | `template_id` → `sign_templates(id)` | `sign_templates` | ✔ | ✔ | ✗ | ✗ MISSING | W7-G |
| `sign_envelopes` | `watermark_policy_id` → `sign_watermark_policies(id)` | `sign_watermark_policies` | ✔ | ✔ | ✗ | ✗ MISSING | W7-G |
| `sign_envelopes` | `public_form_id` → `sign_public_forms(id)` | `sign_public_forms` | ✔ | ✔ | ✗ | ✗ MISSING | W7-G |
| `sign_documents` | `org_id` | anchor | ✔ | ✔ | N/A | N/A | W7-G |
| `sign_documents` | `envelope_id` → `sign_envelopes(id)` | `sign_envelopes` | ✔ | ✔ | ✗ | ✗ MISSING | W7-G |
| `sign_recipients` | `org_id` | anchor | ✔ | ✔ | N/A | N/A | W7-G |
| `sign_recipients` | `envelope_id` → `sign_envelopes(id)` | `sign_envelopes` | ✔ | ✔ | ✗ | ✗ MISSING | W7-G |
| `sign_fields` | `org_id` | anchor | ✔ | ✔ | N/A | N/A | W7-G |
| `sign_fields` | `envelope_id` → `sign_envelopes(id)` | `sign_envelopes` | ✔ | ✔ | ✗ | ✗ MISSING | W7-G |
| `sign_fields` | `document_id` → `sign_documents(id)` | `sign_documents` | ✔ | ✔ | ✗ | ✗ MISSING | W7-G |
| `sign_fields` | `recipient_id` → `sign_recipients(id)` | `sign_recipients` | ✔ | ✔ | ✗ | ✗ MISSING | W7-G |
| `sign_audit_events` | `org_id` | anchor | ✔ | ✔ | N/A | N/A | W7-G |
| `sign_audit_events` | `envelope_id` → `sign_envelopes(id)` | `sign_envelopes` | ✔ | ✔ | ✗ | ✗ MISSING | W7-G |
| `sign_audit_events` | `recipient_id` → `sign_recipients(id)` | `sign_recipients` | ✔ | ✔ | ✗ | ✗ MISSING | W7-G |
| `sign_certificates` | `org_id` | anchor | ✔ | ✔ | N/A | N/A | W7-G |
| `sign_certificates` | `envelope_id` → `sign_envelopes(id)` | `sign_envelopes` | ✔ | ✔ | ✗ | ✗ MISSING | W7-G |
| `sign_signature_assets` | `org_id` | anchor | ✔ | ✔ | N/A | N/A | W7-G |
| `sign_signature_assets` | `envelope_id` → `sign_envelopes(id)` | `sign_envelopes` | ✔ | ✔ | ✗ | ✗ MISSING | W7-G |
| `sign_signature_assets` | `recipient_id` → `sign_recipients(id)` | `sign_recipients` | ✔ | ✔ | ✗ | ✗ MISSING | W7-G |
| `sign_bulk_send_jobs` | `org_id` | anchor | ✔ | ✔ | N/A | N/A | W7-G |
| `sign_bulk_send_jobs` | `template_id` → `sign_templates(id)` | `sign_templates` | ✔ | ✔ | ✗ | ✗ MISSING | W7-G |
| `sign_bulk_send_rows` | `job_id` → `sign_bulk_send_jobs(id)` | `sign_bulk_send_jobs` | ✗ no org_id | ✗ | ✗ | ✗ MISSING — **must add org_id** | W7-G |
| `sign_bulk_send_rows` | `envelope_id` → `sign_envelopes(id)` | `sign_envelopes` | ✗ | ✗ | ✗ | ✗ MISSING | W7-G |

---

## PART I — SURVEYS MODULE (`surveys/`)

| Child table | Child col | Parent → key | org_id? | Type match | Parent UNIQUE? | Composite FK? | Wave |
|---|---|---|---|---|---|---|---|
| `survey_forms` | `org_id` | anchor | ✔ | ✔ | N/A | N/A | W7-G |
| `survey_versions` | `org_id` | anchor | ✔ | ✔ | N/A | N/A | W7-G |
| `survey_versions` | `survey_id` → `survey_forms(id)` | `survey_forms` | ✔ | ✔ | ✗ | ✗ MISSING | W7-G |
| `survey_sections` | `org_id` | anchor | ✔ | ✔ | N/A | N/A | W7-G |
| `survey_sections` | `survey_id` → `survey_forms(id)` | `survey_forms` | ✔ | ✔ | ✗ | ✗ MISSING | W7-G |
| `survey_sections` | `version_id` → `survey_versions(id)` | `survey_versions` | ✔ | ✔ | ✗ | ✗ MISSING | W7-G |
| `survey_questions` | `org_id` | anchor | ✔ | ✔ | N/A | N/A | W7-G |
| `survey_questions` | `survey_id` → `survey_forms(id)` | `survey_forms` | ✔ | ✔ | ✗ | ✗ MISSING | W7-G |
| `survey_questions` | `version_id` → `survey_versions(id)` | `survey_versions` | ✔ | ✔ | ✗ | ✗ MISSING | W7-G |
| `survey_questions` | `section_id` → `survey_sections(id)` | `survey_sections` | ✔ | ✔ | ✗ | ✗ MISSING | W7-G |
| `survey_question_choices` | `org_id` | anchor | ✔ | ✔ | N/A | N/A | W7-G |
| `survey_question_choices` | `question_id` → `survey_questions(id)` | `survey_questions` | ✔ | ✔ | ✗ | ✗ MISSING | W7-G |
| `survey_logic_rules` | `org_id` | anchor | ✔ | ✔ | N/A | N/A | W7-G |
| `survey_logic_rules` | `survey_id` → `survey_forms(id)` | `survey_forms` | ✔ | ✔ | ✗ | ✗ MISSING | W7-G |
| `survey_logic_rules` | `version_id` → `survey_versions(id)` | `survey_versions` | ✔ | ✔ | ✗ | ✗ MISSING | W7-G |
| `survey_logic_rules` | `source_question_id` → `survey_questions(id)` | `survey_questions` | ✔ | ✔ | ✗ | ✗ MISSING | W7-G |
| `survey_collectors` | `org_id` | anchor | ✔ | ✔ | N/A | N/A | W7-G |
| `survey_collectors` | `survey_id` → `survey_forms(id)` | `survey_forms` | ✔ | ✔ | ✗ | ✗ MISSING | W7-G |
| `survey_participants` | `org_id` | anchor | ✔ | ✔ | N/A | N/A | W7-G |
| `survey_participants` | `survey_id` → `survey_forms(id)` | `survey_forms` | ✔ | ✔ | ✗ | ✗ MISSING | W7-G |
| `survey_participants` | `collector_id` → `survey_collectors(id)` | `survey_collectors` | ✔ | ✔ | ✗ | ✗ MISSING | W7-G |
| `survey_participants` | `contact_id` → `contacts(id)` | `contacts` | ✔ | ✔ | ✗ | ✗ MISSING | W7-G |
| `survey_participants` | `lead_id` → `leads(id)` | `leads` | ✔ | ✔ | ✗ | ✗ MISSING | W7-G |
| `survey_participants` | `client_id` → `client_accounts(id)` | `client_accounts` | ✔ | ✔ | ✗ | ✗ MISSING | W7-G |
| `survey_response_sessions` | `org_id` | anchor | ✔ | ✔ | N/A | N/A | W7-G |
| `survey_response_sessions` | `survey_id` → `survey_forms(id)` | `survey_forms` | ✔ | ✔ | ✗ | ✗ MISSING | W7-G |
| `survey_response_sessions` | `version_id` → `survey_versions(id)` | `survey_versions` | ✔ | ✔ | ✗ | ✗ MISSING | W7-G |
| `survey_response_sessions` | `collector_id` → `survey_collectors(id)` | `survey_collectors` | ✔ | ✔ | ✗ | ✗ MISSING | W7-G |
| `survey_response_sessions` | `participant_id` → `survey_participants(id)` | `survey_participants` | ✔ | ✔ | ✗ | ✗ MISSING | W7-G |
| `survey_answers` | `org_id` | anchor | ✔ | ✔ | N/A | N/A | W7-G |
| `survey_answers` | `session_id` → `survey_response_sessions(id)` | `survey_response_sessions` | ✔ | ✔ | ✗ | ✗ MISSING | W7-G |
| `survey_answers` | `survey_id` → `survey_forms(id)` | `survey_forms` | ✔ | ✔ | ✗ | ✗ MISSING | W7-G |
| `survey_answers` | `question_id` → `survey_questions(id)` | `survey_questions` | ✔ | ✔ | ✗ | ✗ MISSING | W7-G |

---

## PART J — BLOG (`blog.ts`)

Blog is a **global/platform-level** domain — posts are public marketing content with no `org_id`. All FKs are global-scope internal references. This entire domain is **EXEMPT** from composite-FK requirements.

| Table | Tenant-scoped? | Reason | Action |
|---|---|---|---|
| `blog_authors` | ✗ | Global platform content | EXEMPT |
| `blog_categories` | ✗ | Global platform content | EXEMPT |
| `blog_posts` | ✗ | Global platform content | EXEMPT |

---

## PART K — AUTOMATION (`automation/rules.ts`)

| Child table | Child col | Parent → key | org_id? | Type match | Composite FK? | Wave |
|---|---|---|---|---|---|---|
| `automation_rules` | `org_id` | anchor | ✔ | ✔ | N/A | W7-H |
| `automation_runs` | `org_id` | anchor | ✔ | ✔ | N/A | W7-H |
| `automation_runs` | `rule_id` → `automation_rules(id)` | `automation_rules` | ✔ | ✔ | ✗ MISSING | W7-H |

---

## PART L — TIMESHEETS (`timesheets/`)

> Timesheets audit doc (`timesheets-audit-2026-07.md`) covers this cluster. Recorded here for completeness.

| Child table | Child col | Parent → key | org_id? | Type match | Composite FK? | Wave |
|---|---|---|---|---|---|---|
| `timesheet_periods` | `org_id` | anchor | ✔ | ✔ | N/A | W7-G |
| `timesheet_entries` | `org_id` | anchor | ✔ | ✔ | N/A | W7-G |
| `timesheet_entries` | `period_id` → `timesheet_periods(id)` | `timesheet_periods` | ✔ | ✔ | ✗ MISSING | W7-G |
| `timesheet_entries` | `project_id` → `projects(id)` | `projects` | ✔ | ✔ | ✗ MISSING | W7-G |
| `timesheet_entries` | `ticket_id` → `tickets(id)` | `tickets` | ✔ | ✔ | ✗ MISSING | W7-G |
| `timesheet_budgets` | `org_id` | anchor | ✔ | ✔ | N/A | W7-G |
| `timesheet_budgets` | `project_id` → `projects(id)` | `projects` | ✔ | ✔ | ✗ MISSING | W7-G |
| `timesheet_rates` | `org_id` | anchor | ✔ | ✔ | N/A | W7-G |
| `timesheet_exports` | `org_id` | anchor | ✔ | ✔ | N/A | W7-G |
| `timesheet_settings` | `org_id` | anchor unique | ✔ | ✔ | N/A | W7-G |
| `timesheet_timer` | `org_id` | anchor | ✔ | ✔ | N/A | W7-G |
| `timesheet_audit` | `org_id` | anchor | ✔ | ✔ | N/A | W7-G |

---

## PART M — PARTY / DIRECTORY / PORTAL-ACCESS (already confirmed compliant in wave-7 doc)

Per `wave-7-composite-fk-matrix.md` Section (A), these are the 11 already-compliant tables. Recorded here for cross-reference only.

| Table | Status | Composite FK declared? |
|---|---|---|
| `organization_people` | ✔ compliant | N/A (direct org FK) |
| `workers` | ✔ compliant | ✔ composite → `organization_people` |
| `worker_engagements` | ✔ compliant | ✔ composite → `workers` |
| `business_parties` | ✔ compliant | direct org FK |
| `party_contacts` | ✔ compliant | ✔ composite → `business_parties` |
| `party_addresses` | ✔ compliant | ✔ composite → `business_parties` |
| `portal_memberships` | ✔ compliant | ✔ composite → `party_contacts` |
| `portal_invitations` | ✔ compliant | ✔ composite → `portal_memberships` + `party_contacts` |
| `project_client_grants` | ✔ compliant | ✔ 3-col composite → `portal_memberships` + `party_contacts` |
| `pm_workspaces` | ✔ compliant | direct org FK + candidate `unique(org_id, pm_workspace_id)` |
| `pm_workspace_memberships` | ✔ partial (workspace FK ✔, org_members FK ✗) | workspace composite ✔; org_members composite ❌ GAP |

---

## SUMMARY: Gaps requiring schema additions BEFORE composite FKs

The following are tables where **`org_id` is entirely absent** (not just missing the composite FK):

| Table | Domain | Must add org_id first |
|---|---|---|
| `project_template_tickets` | Projects | ✔ |
| `project_members` | Projects | ✔ |
| `ticket_assignees` | Projects | ✔ |
| `ticket_label_mappings` | Projects | ✔ |
| `ticket_watchers` | Projects | ✔ |
| `work_item_relations` | Projects | ✔ |
| `ticket_checklist_items` | Projects | ✔ |
| `ticket_custom_field_values` | Projects | ✔ |
| `release_tickets` | Projects | ✔ |
| `webhook_deliveries` | Projects | ✔ |
| `ticket_related_links` | Projects | ✔ |
| `client_account_activities` | CRM | ✔ |
| `invoice_items` | CRM | ✔ |
| `purchase_bill_items` | CRM | ✔ |
| `support_ticket_messages` | CRM/Support | ✔ |
| `quote_line_items` | CRM | ✔ |
| `support_ticket_tags` | Support | ✔ |
| `kb_article_tags` | KB | ✔ |
| `chat_channel_members` | Chat | ✔ |
| `chat_messages` | Chat | ✔ |
| `chat_attachments` | Chat | ✔ |
| `chat_pinned_messages` | Chat | ✔ |
| `chat_saved_messages` | Chat | ✔ |
| `chat_huddles` | Chat | ✔ |
| `chat_huddle_participants` | Chat | ✔ |
| `chat_channel_invite_links` | Chat | ✔ |
| `sign_bulk_send_rows` | Signos | ✔ |

## HOTFIX-class items found in this scan (no `.references()` at all)

| Table | Column | Issue |
|---|---|---|
| `project_automations` | `org_id` | `text("org_id").notNull()` with NO `.references()` — wave-7 doc already flags this |
| `ticket_comment_reactions` | `org_id` | `text("org_id").notNull()` with NO `.references()` — wave-7 doc already flags this |
| `kb_research_briefs` | `space_id` | bare `integer("space_id")` with NO `.references()` to `kb_spaces` |

---

## Counts

| Category | Count |
|---|---|
| Tables with composite FK fully declared (this domain) | 3 (`pm_workspaces` → org anchor; `pm_workspace_memberships` → workspace; already counted in wave-7) |
| Tables needing org_id added before any FK work | 27 |
| Tables needing composite FKs declared (org_id present, FK single-col only) | ~175 |
| W7-HOTFIX items (missing .references() entirely) | 3 additional (beyond the 4 in wave-7) |
| Blog tables EXEMPT (global platform content) | 3 |
| Timesheets tables (referenced from separate audit doc) | ~12 |
