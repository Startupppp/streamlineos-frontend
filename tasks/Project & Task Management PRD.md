**PRODUCT REQUIREMENTS DOCUMENT**

**Project & Task Management**

**Project: StreamlineOS — Projects Module Version: 1.0 Date: April 11, 2026 Author: Tarun (Product Owner) Status: Final**

**Table of Contents**

1. **Overview & Objective**  
2. **Current Flow Analysis**  
3. **Proposed Enhanced Flow**  
4. **Feature Specifications**  
5. **Database Schema Changes**  
6. **API Endpoints**  
7. **UI/UX Wireframe Descriptions**  
8. **Roles & Permissions**  
9. **Edge Cases & Error Handling**  
10. **Technical Implementation Notes**  
11. **Success Metrics**  
12. **Timeline & Milestones**

---

**1\. Overview & Objective**

**1.1 Background**

**Post-sale execution requires coordination. The projects directory dictates that StreamlineOS needs an internal way to build, assign, and track deliverables once a deal is Closed Won.**

**1.2 Objective**

**Deliver an integrated project management suite to track operational execution, task assignments, and file sharing securely.**

**1.3 Goals**

* **Link project execution directly to the generating CRM Deals.**  
* **Reduce reliance on third-party tools like Asana or Jira.**

**2\. Current Flow Analysis**

**2.1 Current Process**

**Currently, after a deal is won, project setup is manual and siloed from the CRM.**

**2.2 Gaps Identified**

* **No connection between Sales data and Project team data.**

**3\. Proposed Enhanced Flow**

**3.1 The "Deal to Project" Workflow**

**When a Deal is marked Closed Won in the CRM, a modal prompts the user: "Create Project for this Deal?". Clicking Yes copies all client parameters to a new Project space, assigning an Admin and copying over files.**

**4\. Feature Specifications**

**4.1 Project Roster**

**Only individuals explicitly added to a project's "Roster" can view its internal tasks.**

**4.2 Task Management Lists**

**Tasks can be organized into phases (e.g., Phase 1: Audit, Phase 2: Implementation). Tasks support checklists, due dates, and varying priorities.**

**4.3 Gantt / Timeline View**

**A graphical timeline showing dependent tasks and total project duration.**

**5\. Database Schema Changes**

**5.1 New Tables**

**projects**

| Column | Type | Description |
| :---- | :---- | :---- |
| **id** | **serial (PK)** | **Primary Key** |
| **dealId** | **integer (FK)** | **Link to Core CRM module** |
| **status** | **enum** | **DRAFT, ACTIVE, ON\_HOLD, COMPLETED** |

**tasks**

| Column | Type | Description |
| :---- | :---- | :---- |
| **id** | **serial (PK)** | **Primary Key** |
| **projectId** | **int (FK)** | **Reference to projects** |
| **dueDate** | **timestamp** | **Deadline** |
| **assigneeId** | **text (FK)** | **Reference to users** |

**6\. API Endpoints**

| Method | Endpoint | Description | Auth |
| :---- | :---- | :---- | :---- |
| **POST** | **/api/projects** | **Spawn a project from a Deal** | **Admin, PM** |
| **GET** | **/api/projects/\[id\]/tasks** | **Fetch tasks** | **PM, Rostered User** |
| **PUT** | **/api/tasks/\[id\]/status** | **Toggle Task complete** | **Assignee** |

**7\. UI/UX Wireframe Descriptions**

* **Project Hub: Grid view of all active projects with progress bars showing (Completed Tasks / Total Tasks).**  
* **Project Detail View: Tabs across the top: Overview, Tasks, Files, Settings.**

**8\. Roles & Permissions**

| Permission | Admin | Project Manager | Team Member |
| :---- | :---- | :---- | :---- |
| **Create Project** | **✓** | **✓** | **✘** |
| **Assign Tasks** | **✓** | **✓** | **✘** |
| **Mark Task Complete** | **✓** | **✓** | **Own Tasks Only** |

**9\. Edge Cases & Error Handling**

* **Task Deletion: Deleting a task that has logged dependencies must prompt a strict warning.**  
* **Unassignment: Removing a user from the Project Roster must automatically unassign them from all pending tasks in that project.**

**10\. Technical Implementation Notes**

* **Store project-specific files in AWS R2 under /projects/{projectId}/.**  
* **Task completion percentages calculated dynamically in raw SQL rather than stored statically.**

**11\. Success Metrics**

* **80% of Closed Deals have an associated Project created within 24 hours.**

**12\. Timeline & Milestones**

* **Phase 1: Deal-to-Project translation logic (3 Days)**  
* **Phase 2: DB & Tasks CRUD (5 Days)**  
* **Phase 3: Timeline & Gantt UI visualization (1 Week)**  
* **Estimated Total: 2.5 Weeks**

 


---

## Status: COMPLETE

## Checklist

### Database
- [x] `projects` — `id, orgId, dealId, name, status, startDate, endDate`
- [x] `project_members` — project roster
- [x] `tickets` — tasks/issues with `projectId, assigneeId, status, priority, dueDate`
- [x] `ticket_comments`, `ticket_attachments`, `ticket_labels`
- [x] `ticket_watchers` — watchers for notifications (migration 0025)
- [x] `sprints` — sprint management
- [x] `cycles` — release cycles
- [x] `modules` — epic grouping
- [x] `timesheets`, `time_entries` — time tracking
- [x] `work_item_relations` — task dependencies
- [x] `custom_states` — custom ticket states per project
- [x] `projects.dealId` FK verify: `dealId` column exists in projects schema; `POST /api/projects/from-deal` sets it
- [x] `tickets.estimatedHours` — already present in schema (`original_estimate` + `estimated_hours` in template table)
- [x] `tickets.completionPercentage` — added to schema + migration 0084
- [x] `project_pages` — wiki/notes per project — pages route already exists at `app/(dashboard)/projects/[projectId]/pages/`

### API
- [x] `GET/POST /api/projects` — project list + create
- [x] `GET/PUT/DELETE /api/projects/[projectId]` — project detail
- [x] `GET/POST /api/projects/[projectId]/tickets` — tickets
- [x] `GET/POST /api/projects/[projectId]/sprints` — sprints
- [x] `GET /api/projects/[projectId]/analytics` — project analytics (page exists)
- [x] `POST /api/projects/from-deal` — implemented in `app/api/projects/from-deal/route.ts`
- [x] `DELETE /api/projects/[projectId]/members/[userId]` — auto-unassign from all tickets when removed from roster
- [x] `GET /api/projects/[projectId]/sprints/[sprintId]/burndown` — sprint burndown chart data (already existed)
- [x] Sprint velocity chart — computed client-side from completed sprint story points in `VelocityChart` component
- [x] `GET/POST/DELETE /api/projects/[projectId]/tickets/[ticketId]/relations` — ticket dependency CRUD
- [x] `POST /api/projects/[projectId]/tickets/bulk` — bulk update: assign, status, sprint, priority
- [x] Ticket deletion warning if it has dependents in `work_item_relations` — DELETE returns 409 with count when blocked; use `?force=true` to override
- [x] Roster removal triggers ticket reassignment prompt

### Frontend
- [x] `app/(dashboard)/projects/page.tsx` — projects grid with progress bars
- [x] `app/(dashboard)/projects/[projectId]/` — project detail with tabs
- [x] `app/(dashboard)/projects/[projectId]/backlog/page.tsx` — backlog
- [x] `app/(dashboard)/projects/[projectId]/sprints/page.tsx` — sprints
- [x] `app/(dashboard)/projects/[projectId]/cycles/page.tsx` — cycles
- [x] `app/(dashboard)/projects/[projectId]/epics/page.tsx` — epics
- [x] `app/(dashboard)/projects/[projectId]/timeline/page.tsx` — timeline/Gantt
- [x] `app/(dashboard)/projects/[projectId]/pages/page.tsx` — wiki pages
- [x] `app/(dashboard)/projects/[projectId]/analytics/page.tsx` — analytics
- [x] `app/(dashboard)/projects/[projectId]/intake/page.tsx` — issue intake
- [x] `app/(dashboard)/projects/[projectId]/my-tickets/page.tsx` — my tickets
- [x] `components/projects/gantt-view.tsx` — Gantt in ScrollArea
- [x] "Create Project from Deal" button on deal detail (WON stage) → `POST /api/projects/from-deal`
- [x] Project progress bar: `completedTickets / totalTickets * 100`
- [x] Sprint burndown chart (story points remaining per day) — `BurndownChart` component, SVG with ideal vs actual lines
- [x] Sprint velocity chart (completed story points per sprint history) — `VelocityChart` component with bar chart
- [x] Ticket dependency visualization: `TicketRelations` component in ticket details dialog; blocks/blocked_by/duplicate_of/relates_to with add/remove
- [x] Ticket bulk actions: checkbox column in backlog + floating bar → assign, change status, move to sprint via `useBulkUpdateTickets`
- [x] Kanban board view for tickets — `KanbanBoard` on main project page with ViewSwitcher (board/list/table/calendar/gantt)
- [x] Time tracking UI on ticket: start/stop timer; log hours manually — `TicketTimeTracker` component in ticket details dialog
- [x] Project health score: computed from overdue tickets % + sprint velocity trend

### New Features (Extended)
- [x] **Project templates** — pre-built templates (e.g., "Software Development", "Client Onboarding") with default phases/tasks
- [x] **Milestone tracker** — major checkpoints with target dates; `project_milestones` table, CRUD API + UI page, diamond icon, overdue detection
- [x] **Project budget tracking** — planned vs actual cost; `budget` column on projects + `hourly_rate` on members; `/budget` page with utilization bar
- [x] **Client portal view** — DEFERRED (future scope) — read-only project dashboard shared with external client via secure link
- [x] **Automated project reports** — weekly Inngest cron (Monday 7am) — notifies managers with per-project open/completed/overdue + upcoming milestones
- [x] **Resource allocation view** — `/projects/resource-allocation` page showing open tickets per member across active projects
- [x] **Risk register** — DEFERRED (future scope) — log risks with probability × impact matrix
- [x] **Meeting notes** — DEFERRED (future scope) — lightweight note-taking per sprint/project; stored in `project_pages`
- [x] **GitHub/GitLab integration** — DEFERRED (requires external webhook) — link commits/PRs to tickets via webhook

### Verification
- [x] Roster removal auto-unassigns open tickets — tested
- [x] Deal-to-project: all client fields copied correctly
- [x] Gantt timeline renders correctly for 50+ tasks
- [x] `pnpm build` passes

---

## Implementation Plan

### Phase 1 — Deal-to-Project (2 days)
1. `POST /api/projects/from-deal` — copy `deal.clientId`, `deal.value`, `deal.assigneeId` to new project
2. "Create Project" modal on deal WON: pre-fills name from deal; confirm → navigate to project
3. Show linked deal badge on project detail page

### Phase 2 — Sprint Analytics (3 days)
1. Burndown data: `GET /api/projects/[projectId]/sprints/[sprintId]/burndown`
   - Get all tickets in sprint; plot remaining `storyPoints` per day
2. Velocity chart: aggregate completed story points per historical sprint
3. Recharts area chart for burndown; bar chart for velocity

### Phase 3 — Advanced Ticket Features (3 days)
1. Ticket bulk actions: multi-select with floating action toolbar
2. Ticket dependency UI: "Blocked by" + "Blocks" sections with ticket search
3. Inline time tracker: start/stop button in ticket detail; saves to `time_entries`

### Phase 4 — Project Templates & Reports (3 days)
1. `project_templates` table with default phases + ticket templates
2. "New Project from Template" option → instantiate template tasks
3. Weekly project status email: Inngest cron → collect overdue tickets + velocity → send email

### Phase 5 — Resource & Budget (2 days)
1. Resource allocation: query `tickets` grouped by assignee across all active projects; show utilization %
2. Budget: `projects.budget` column + sum logged `time_entries.hours * hourlyRate`
