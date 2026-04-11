**\*\*PRODUCT REQUIREMENTS DOCUMENT\*\***

**Sales Activities & Task Tracking**

**\*\*Project:\*\* Vaivamm Capital CRM**  
**\*\*Version:\*\* 1.0**  
**\*\*Date:\*\* April 11, 2026**  
**\*\*Author:\*\* Tarun (Product Owner)**  
**\*\*Status:\*\* Draft**

**\# 1\. Overview & Objective**  
**Orchestrate daily to-dos—calls, emails, and meetings—required to nurture leads and close deals.**

**\# 2\. Current Flow Analysis**  
**Reps rely on external calendars or sticky notes to remember follow-ups, leading to dropped leads.**

**\# 3\. Proposed Enhanced Flow**  
**Task queues within the CRM prompt reps regarding who to call next, automatically logging when a task is completed.**

**\# 4\. Feature Specifications**  
**\- Due date reminders and overdue alerts.**  
**\- Task categorization (Call, Email, Meeting, Custom).**  
**\- Sync to external calendars.**

**\# 5\. Database Schema Changes**  
**\`tasks\` table tied polymorphismically to leads, deals, or contacts (\`entity\_type\`, \`entity\_id\`).**

**\# 6\. API Endpoints**  
**\- \`POST /api/tasks\`**  
**\- \`GET /api/tasks/my-queue\`**

**\# 7\. UI/UX Wireframe Descriptions**  
**A global "My Tasks" slide-over panel accessible from anywhere in the CRM, prioritized by urgency (Red \= Overdue).**

**\# 8\. Roles & Permissions**  
**Users manage their own tasks. Managers can assign tasks downward.**

**\# 9\. Edge Cases & Error Handling**  
**Handling Timezone differences between the rep and the client when setting follow-up alarms.**

**\# 10\. Technical Implementation Notes**  
**Store all task due dates in UTC. Format to local time exclusively on the frontend component load.**

**\# 11\. Success Metrics**  
**\- Decrease in overdue tasks by 40% in month 1\.**

**\# 12\. Timeline & Milestones**  
**Core CRUD: 3 days. Global UI integration: 5 days. Total \~1.5 weeks.**


---

## Status: IN PROGRESS

## Checklist

### Database
- [x] `lead_tasks` table — tasks tied to leads
- [x] `crm_activities` — activity logs per deal/contact
- [x] `crm_events` — calendar-linked events
- [ ] Polymorphic `tasks` table: `entityType (LEAD/DEAL/CONTACT/PROJECT), entityId, type (CALL/EMAIL/MEETING/CUSTOM), dueDate, status, assigneeId, notes`
- [ ] `tasks.timezone` — store rep's timezone at creation (for local-time reminders)
- [ ] `tasks.completedAt` — when task was checked off
- [ ] `tasks.remindAt` — optional reminder timestamp

### API
- [x] `GET /api/crm/activities` — activities list (via crm routes)
- [ ] `GET /api/tasks/my-queue` — current user's tasks sorted by urgency (overdue first, then by dueDate)
- [ ] `POST /api/tasks` — create task linked to entity
- [ ] `PATCH /api/tasks/[taskId]` — update task (status, dueDate, notes)
- [ ] `DELETE /api/tasks/[taskId]` — delete task
- [ ] `GET /api/tasks/overdue` — tasks past dueDate, not completed
- [ ] Inngest scheduled job: daily reminder at 8 AM → send email/notification for tasks due today
- [ ] Inngest: overdue alert → notify assignee + manager for tasks > 24h overdue
- [ ] `POST /api/tasks/[taskId]/complete` — mark done + log to activity timeline

### Frontend
- [x] `app/(dashboard)/sales/activity/page.tsx` — sales activity page
- [ ] **Global "My Tasks" slide-over panel** — accessible via floating button or header icon from any page
- [ ] Task list inside panel: grouped by OVERDUE (red), TODAY, THIS WEEK, UPCOMING
- [ ] Task card: entity link (click to navigate to lead/deal), type icon (📞/📧/🤝), due date, status
- [ ] One-click "Complete" checkbox on each task card
- [ ] "Add Task" button in panel → quick-create form (entity search + type + due date)
- [ ] Task type filter chips: All / Call / Email / Meeting / Custom
- [ ] Task creation from lead detail and deal detail pages (inline)
- [ ] Overdue badge on nav item: red dot showing count of overdue tasks
- [ ] Calendar view: tasks plotted on calendar (uses `/calendar` page)
- [ ] Google Calendar sync: export task due dates as `.ics` events

### New Features (Extended)
- [ ] **Recurring tasks** — daily/weekly/monthly recurring tasks with auto-regeneration on complete
- [ ] **Task templates** — pre-built sequences (e.g., "5-touch follow-up" creates 5 tasks at set intervals)
- [ ] **Manager task assignment** — manager assigns task to rep from their dashboard
- [ ] **Task analytics** — completion rate chart, overdue trend, tasks per rep
- [ ] **Email task** — "Send Email" task type: click task → opens email compose pre-filled with lead context
- [ ] **Call task with call log** — "Log Call" task: fill in call outcome + notes → marks task complete + logs activity
- [ ] **Slack/WhatsApp reminder** — optional external channel reminder for due tasks (via Composio)
- [ ] **Task priority scores** — AI suggests which tasks to do first based on lead value + SLA

### Verification
- [ ] Overdue tasks appear at top of queue (sorted correctly)
- [ ] UTC storage + local timezone rendering: task due at "9 AM IST" shows correctly for rep in IST
- [ ] Daily reminder Inngest job fires and sends notifications
- [ ] `pnpm build` passes

---

## Implementation Plan

### Phase 1 — Unified Tasks Table & API (3 days)
1. Migration: `tasks` table with polymorphic entity reference + reminder support
2. `GET /api/tasks/my-queue` with priority sort: overdue → today → this week
3. `POST/PATCH/DELETE /api/tasks` CRUD
4. `POST /api/tasks/[taskId]/complete` → marks done + writes to `crm_activities`

### Phase 2 — Global Slide-Over (3 days)
1. `components/tasks/my-tasks-panel.tsx` — Radix Sheet anchored to right
2. Open/close via global keyboard shortcut `T` or header button
3. Grouped sections: OVERDUE / TODAY / THIS WEEK / UPCOMING
4. Inline complete checkbox with optimistic UI

### Phase 3 — Reminders & Automations (2 days)
1. Inngest `daily-task-reminders`: 8 AM cron → query tasks due today → send notifications
2. Inngest `overdue-task-alerts`: hourly check → tasks > 24h overdue → notify assignee + manager
3. Overdue count badge: TanStack Query polls `/api/tasks/overdue/count` every 5 min

### Phase 4 — Advanced Features (2 days)
1. Recurring tasks: `tasks.recurrence` JSONB (frequency + interval); on complete → auto-create next
2. Task sequences/templates: pre-defined task chains; apply to any lead
3. Task analytics page: `/sales/activity` — completion rate + overdue trend + tasks per rep charts
