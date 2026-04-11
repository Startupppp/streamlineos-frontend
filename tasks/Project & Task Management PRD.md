**PRODUCT REQUIREMENTS DOCUMENT**

**Project & Task Management**

**Project: Vaivamm Capital CRM — Projects Module Version: 1.0 Date: April 11, 2026 Author: Tarun (Product Owner) Status: Draft**

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

**Post-sale execution requires coordination. The projects directory dictates that Vaivamm needs an internal way to build, assign, and track deliverables once a deal is Closed Won.**

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

## Status: SUBSTANTIALLY COMPLETE

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
- [ ] `projects.dealId` FK verify: ensure deal-to-project link is saved on project creation
- [ ] `tickets.estimatedHours` — for capacity planning
- [ ] `tickets.completionPercentage` — derived field or stored for sub-task tracking
- [ ] `project_pages` — wiki/notes per project (already has `pages` route)

### API
- [x] `GET/POST /api/projects` — project list + create
- [x] `GET/PUT/DELETE /api/projects/[projectId]` — project detail
- [x] `GET/POST /api/projects/[projectId]/tickets` — tickets
- [x] `GET/POST /api/projects/[projectId]/sprints` — sprints
- [x] `GET /api/projects/[projectId]/analytics` — project analytics (page exists)
- [ ] `POST /api/projects/from-deal` — "Create Project from Deal" → copies client/value/contacts
- [ ] `DELETE /api/projects/[projectId]/members/[userId]` — auto-unassign from all tickets when removed from roster
- [ ] `GET /api/projects/[projectId]/timeline` — returns tasks with dates for Gantt (verify existing)
- [ ] `GET /api/projects/[projectId]/burndown` — sprint burndown chart data
- [ ] `GET /api/projects/[projectId]/velocity` — sprint velocity history
- [ ] Ticket deletion warning if it has dependents in `work_item_relations`
- [ ] Roster removal triggers ticket reassignment prompt

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
- [ ] "Create Project from Deal" button on deal detail (WON stage) → prefills project form
- [ ] Project progress bar: `completedTickets / totalTickets * 100`
- [ ] Sprint burndown chart (story points remaining per day)
- [ ] Sprint velocity chart (completed story points per sprint history)
- [ ] Ticket dependency visualization: blocked-by / blocks relationship in ticket detail
- [ ] Ticket bulk actions: multi-select → assign, change status, move to sprint
- [ ] Kanban board view for tickets (in addition to backlog list view)
- [ ] Time tracking UI on ticket: start/stop timer; log hours manually
- [ ] Project health score: computed from overdue tickets % + sprint velocity trend

### New Features (Extended)
- [ ] **Project templates** — pre-built templates (e.g., "Software Development", "Client Onboarding") with default phases/tasks
- [ ] **Milestone tracker** — major checkpoints with target dates; shown on Gantt as diamonds
- [ ] **Project budget tracking** — planned vs actual cost; linked to billable hours from timesheets
- [ ] **Client portal view** — read-only project dashboard shared with external client via secure link
- [ ] **Automated project reports** — weekly email digest of project status (Inngest scheduled)
- [ ] **Resource allocation view** — which team members are over/under allocated across all projects
- [ ] **Risk register** — log risks with probability × impact matrix
- [ ] **Meeting notes** — lightweight note-taking per sprint/project; stored in `project_pages`
- [ ] **GitHub/GitLab integration** — link commits/PRs to tickets via webhook

### Verification
- [ ] Roster removal auto-unassigns open tickets — tested
- [ ] Deal-to-project: all client fields copied correctly
- [ ] Gantt timeline renders correctly for 50+ tasks
- [ ] `pnpm build` passes

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
