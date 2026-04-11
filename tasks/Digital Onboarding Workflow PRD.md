**\*\*PRODUCT REQUIREMENTS DOCUMENT\*\***

**Digital Onboarding Workflow**

**\*\*Project:\*\* Vaivamm Capital CRM**  
**\*\*Version:\*\* 1.0**  
**\*\*Date:\*\* April 11, 2026**  
**\*\*Author:\*\* Tarun (Product Owner)**  
**\*\*Status:\*\* Draft**

**\# 1\. Overview & Objective**  
**Automate new-hire induction flows ensuring compliance, hardware access, and general training are completed systematically.**

**\# 2\. Current Flow Analysis**  
**IT and HR manually coordinate via chat to get new hires access, leading to day-1 operational delays.**

**\# 3\. Proposed Enhanced Flow**  
**A checklist-driven system where a candidate marked 'Hired' triggers sub-tasks for IT, HR, and the Employee individually.**

**\# 4\. Feature Specifications**  
**\- Auto-generation of departmental onboarding checklists.**  
**\- Document repository for company policies (e-signatures).**  
**\- Progress bar tracking for the new hire.**

**\# 5\. Database Schema Changes**  
**\`onboarding\_templates\` table.**  
**\`onboarding\_tasks\` table mapped to users.**

**\# 6\. API Endpoints**  
**\- \`POST /api/onboarding/initiate\`**  
**\- \`PATCH /api/onboarding/tasks/:taskId\`**

**\# 7\. UI/UX Wireframe Descriptions**  
**New Hires see a friendly, gamified checklist ("Your First Day\!"). Admins see an "Onboarding Status Tracker" listing who is stalled.**

**\# 8\. Roles & Permissions**  
**New Hires can check off self-tasks. IT and HR verify system provisioning steps.**

**\# 9\. Edge Cases & Error Handling**  
**If an employee start date shifts, all dependent due dates must automatically shift proportionally.**

**\# 10\. Technical Implementation Notes**  
**Integration with DocuSign or a lightweight internal PDF signing library to enforce legally binding policy agreements.**

**\# 11\. Success Metrics**  
**\- Reduce day-1 friction, ensuring 100% system access on employee start dates.**

**\# 12\. Timeline & Milestones**  
**Task list generation engine: 1 week. E-sign integrations: 1 week. Total: \~2 weeks.**


---

## Status: IN PROGRESS

## Checklist

### Database
- [x] `onboarding_steps` — onboarding task templates
- [x] `onboarding_documents` — documents linked to onboarding
- [ ] `onboarding_templates` table — pre-defined checklist templates per department
- [ ] `onboarding_tasks` table — per-employee onboarding task instances (`userId, templateStepId, status, dueDate, completedAt, completedBy`)
- [ ] `onboarding_tasks.ownerRole` — who completes this task (NEW_HIRE / IT / HR / MANAGER)
- [ ] `onboarding_tasks.dependencies` — task must wait until another is complete
- [ ] Date shift logic: if `users.startDate` changes, shift all dependent `dueDate` fields

### API
- [x] `app/(dashboard)/hr/onboarding/page.tsx` — onboarding page exists
- [ ] `POST /api/onboarding/initiate` — trigger onboarding for a user: create tasks from template, notify IT/HR/Manager via notifications
- [ ] `GET /api/onboarding/[userId]` — employee's personal checklist
- [ ] `PATCH /api/onboarding/tasks/[taskId]` — mark task complete (with `completedBy` tracking)
- [ ] `GET /api/onboarding/status` — HR admin view: all in-progress onboardings with % complete
- [ ] `GET /api/onboarding/templates` — list department templates
- [ ] `POST /api/onboarding/templates` — create template with steps
- [ ] Start date shift: `PATCH /api/hr/employees/[employeeId]` — if `startDate` changes, recalculate all task `dueDate` values
- [ ] Inngest trigger: when employee `status = ACTIVE` → auto-initiate onboarding for their department

### Frontend
- [x] `app/(dashboard)/hr/onboarding/page.tsx` — onboarding management
- [ ] New hire onboarding page: gamified progress checklist ("Your First Day!")
- [ ] Progress bar: `completedTasks / totalTasks * 100%` with color (red < 50%, yellow, green 100%)
- [ ] Task card: title, description, owner badge (NEW_HIRE / IT / HR), status toggle
- [ ] Task due dates shown: overdue in red
- [ ] HR admin tracker: table of all active onboardings — Employee, Start Date, % Complete, Stalled indicator
- [ ] "Stalled" badge: if no tasks completed in 48h
- [ ] Template builder: drag-and-drop reorder tasks; set owner role + due offset (e.g., +2 days from start)
- [ ] Document sign-off: task type = SIGN_DOCUMENT; opens PDF viewer with e-signature CTA
- [ ] Onboarding completion celebration: confetti + "You're all set!" screen

### New Features (Extended)
- [ ] **IT provisioning tasks** — auto-create Jira/GitHub ticket or send IT email when "Setup laptop" task triggered
- [ ] **E-signature integration** — DocuSign or Documenso for NDA/policy sign-off
- [ ] **Video introduction** — new hire records a short intro video; visible to team
- [ ] **Buddy system** — assign an onboarding buddy; buddy gets notification tasks too
- [ ] **Onboarding survey** — 30-day post-join survey automatically triggered
- [ ] **Offboarding workflow** — mirror flow for exits: return assets, revoke access, FnF settlement
- [ ] **Department-specific templates** — Sales template vs Engineering template vs HR template
- [ ] **Compliance checklist** — mandatory compliance items (POSH training, code of conduct acknowledgement)

### Verification
- [ ] Onboarding initiates automatically when employee marked ACTIVE
- [ ] Date shift: changing startDate recalculates all task dueDates proportionally
- [ ] IT/HR/Manager receive notifications when their tasks are assigned
- [ ] `pnpm build` passes

---

## Implementation Plan

### Phase 1 — DB & Initiation Flow (3 days)
1. Migration: `onboarding_templates` + `onboarding_tasks` tables
2. `POST /api/onboarding/initiate` — instantiate template tasks for employee; set dueDates based on startDate
3. Inngest trigger: on `users.status` → ACTIVE event → call initiate
4. Notifications: IT/HR/Manager receive in-app + email notification for assigned tasks

### Phase 2 — Employee Checklist UI (3 days)
1. New hire personal view: gamified checklist with progress ring
2. Task card: icon per owner role, due date, expand for description
3. `PATCH /api/onboarding/tasks/[taskId]` — mark complete with audit
4. Completion celebration: `canvas-confetti` on 100%

### Phase 3 — HR Admin Tracker (2 days)
1. HR overview table: all active onboardings with status % + stalled indicator
2. Stalled detection: `WHERE last_completed_at < NOW() - INTERVAL '48 hours' AND pct < 100`
3. Click row → drill into employee's checklist

### Phase 4 — Templates & E-sign (3 days)
1. Template builder UI: drag-reorder steps; set role + due offset
2. Document signing task: link to `onboarding_documents`; mark complete after signature webhook
3. Offboarding mirror: reuse same engine with `type = OFFBOARDING` tasks
