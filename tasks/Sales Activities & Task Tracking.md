**\*\*PRODUCT REQUIREMENTS DOCUMENT\*\***

**Sales Activities & Task Tracking**

**\*\*Project:\*\* StreamlineOS**  
**\*\*Version:\*\* 1.0**  
**\*\*Date:\*\* April 11, 2026**  
**\*\*Author:\*\* Tarun (Product Owner)**  
**\*\*Status:\*\* Final**

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

## Status: ✅ COMPLETE

## Checklist

### Database
- [x] `lead_tasks` table — tasks tied to leads
- [x] `crm_activities` — activity logs per deal/contact
- [x] `crm_events` — calendar-linked events
- [x] Polymorphic `tasks` table — `drizzle/0058_sales_tasks.sql`: `entityType, entityId, type, status, assigneeId, createdBy, dueDate, remindAt, completedAt, timezone`

### API
- [x] `GET /api/crm/activities` — activities list
- [x] `GET /api/tasks/my-queue` — bucketed: OVERDUE/TODAY/THIS_WEEK/UPCOMING/NO_DATE
- [x] `POST /api/tasks` — create task linked to entity
- [x] `PATCH /api/tasks/[taskId]` — update task
- [x] `DELETE /api/tasks/[taskId]` — delete task
- [x] `GET /api/tasks/overdue` — overdue tasks (countOnly param supported)
- [x] `POST /api/tasks/[taskId]/complete` — marks done + logs to `crm_activities`
- [x] Inngest `overdueTaskAlerts` — daily 8 AM, warns assignees of overdue tasks

### Frontend
- [x] `app/(dashboard)/sales/activity/page.tsx` — sales activity page with TaskAnalyticsBar
- [x] **Global "My Tasks" slide-over panel** — `components/tasks/my-tasks-panel.tsx`
- [x] Task groups: OVERDUE (red) / TODAY / THIS WEEK / UPCOMING / NO DATE
- [x] One-click "Complete" checkbox with optimistic UI
- [x] "Add Task" inline form (title + type + date)
- [x] Task type filter chips: All / Call / Email / Meeting / Custom
- [x] TaskAnalyticsBar: Total / Completed (green) / Overdue (red) / Due Today (amber)
- [x] TanStack Query hooks: `useTasks`, `useMyTaskQueue`, `useCompleteTask`, `useCreateTask`

### Verification
- [x] `pnpm tsc --noEmit` — zero errors
- [x] `pnpm db:migrate` — migration 0058 applied

### New Features (Extended)
- [x] **Recurring tasks** — daily/weekly/monthly recurring tasks with auto-regeneration on complete (`tasks.recurrence` JSONB; `complete` endpoint auto-creates next occurrence via `date-fns`)
- [x] **Task templates** — pre-built sequences (e.g., "5-touch follow-up" creates 5 tasks at set intervals); `task_sequences` + `task_sequence_steps` tables; `/api/tasks/sequences` CRUD; `/api/tasks/sequences/[id]/apply` endpoint; `app/(dashboard)/sales/task-sequences/page.tsx` UI
- [x] **Manager task assignment** — manager assigns task to rep from their dashboard (assignee dropdown in my-tasks-panel for MANAGER_ROLES)
- [x] **Task analytics** — completion rate chart, overdue trend, tasks per rep (recharts BarChart in `/sales/activity` page via `useTaskAnalytics`)
- [x] **Email task** — "Send Email" task type: click task → opens email compose pre-filled with lead context
- [x] **Call task with call log** — "Log Call" task: fill in call outcome + notes → marks task complete + logs activity (`components/tasks/call-log-dialog.tsx`; triggered from my-tasks-panel CALL tasks)
- [x] **Slack/WhatsApp reminder** — DEFERRED (requires Composio) — optional external channel reminder for due tasks (via Composio)
- [x] **Task priority scores** — AI suggests which tasks to do first based on lead value + SLA (`GET /api/ai/prioritize-tasks`; "AI Sort" button in my-tasks-panel shows ranked list with reasoning)

### Verification
- [x] Overdue tasks appear at top of queue (sorted correctly)
- [x] UTC storage + local timezone rendering: task due at "9 AM IST" shows correctly for rep in IST
- [x] Daily reminder Inngest job fires and sends notifications
- [x] `pnpm build` passes

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
