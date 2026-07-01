# Deleted legacy PM stub docs

This folder previously contained many “Projects Product Bible” stub outlines that drifted from the implementation-grade canonical PRD.

**Canonical source of truth:** `PRD-project-management.md`

## Deleted files and where they’re covered

- `005_Project_Templates.md` — `PRD-project-management.md` §14.22 (`/projects/templates`)
- `006_Project_Settings.md` — `PRD-project-management.md` §14.3 (`/projects/[projectId]/settings`)
- `007_Project_Members.md` — `PRD-project-management.md` §8.1 (`project_members`) + §9 (backend API contract)
- `008_Project_Permissions.md` — `PRD-project-management.md` §7 (module gating + RBAC)
- `009_Project_Statuses.md` — `PRD-project-management.md` §4.3 (status enums) + §14.3 (settings corrections)
- `010_Project_Labels.md` — `PRD-project-management.md` §8.1 (`ticket_labels`) + §9 (labels endpoints) + §14.3 (settings labels section)

- `013_Subtasks.md` — `PRD-project-management.md` §14.4 (Ticket details Sheet: `TicketSubtasks`)
- `014_Checklists.md` — `PRD-project-management.md` §14.4 (Ticket details Sheet: `TicketChecklists`)
- `015_Task_Dependencies.md` — `PRD-project-management.md` §4.3 (`WorkItemRelationType`) + §8.1 (`ticket_relations`) + §14.4 (`TicketRelations`)
- `016_Recurring_Tasks.md` — covered generally by `PRD-project-management.md` §14.20 (automations) + core ticket flows (§14.4–§14.6)
- `017_Task_Templates.md` — covered generally by `PRD-project-management.md` §14.22 (templates) + ticket flows (§14.4)
- `018_Task_Custom_Fields.md` — `PRD-project-management.md` §14.3 (settings custom fields) + §14.4 (`TicketCustomFields`)
- `019_Time_Tracking.md` — `PRD-project-management.md` §7.2 (project modules: `timeTracking`) + §14.4 (`TicketTimeTracker`)
- `020_Task_Priorities.md` — `PRD-project-management.md` §4.3 (`TicketPriority`)

- `022_List_View.md` — `PRD-project-management.md` §14.2 (view switcher includes `list`)
- `025_Timeline_View.md` — `PRD-project-management.md` §14.8 (`/projects/[projectId]/timeline`)
- `026_Gantt_View.md` — `PRD-project-management.md` §14.2 (view switcher includes `gantt`) + §14.0 (lazy-load heavy views)
- `027_Workload_View.md` — `PRD-project-management.md` §14.2 (view switcher includes `workload`)
- `028_Portfolio_View.md` — `PRD-project-management.md` §14.23 (`/projects/portfolio`)

- `029_Sprints.md` — `PRD-project-management.md` §14.6 (`/projects/[projectId]/sprints`)
- `030_Backlog.md` — `PRD-project-management.md` §14.5 (`/projects/[projectId]/backlog`)
- `031_Epics.md` — `PRD-project-management.md` §14.7 (`/projects/[projectId]/epics`)
- `032_User_Stories.md` — covered generally by `PRD-project-management.md` §1 (planning) + §14.5–§14.6 (backlog/sprints)
- `033_Bug_Tracking.md` — covered generally by core ticket + backlog flows (`PRD-project-management.md` §14.4–§14.5)
- `034_Releases.md` — covered generally by `PRD-project-management.md` §14.9 (cycles) + §14.11 (milestones) + §14.8 (timeline)
- `035_Versions.md` — covered generally by `PRD-project-management.md` §11 (audit/events) + §14.4 (`TicketActivityLog`)

- `038_Attachments.md` — `PRD-project-management.md` §8.1 (`ticket_attachments`) + §9 (attachments endpoints) + §14.4 (ticket details)
- `039_Activity_Feed.md` — `PRD-project-management.md` §14.4 (`ActivityFeed`) + §11 (audit/activity expectations)
- `040_Documents.md` — covered generally by `PRD-project-management.md` §14.12 (project pages/wiki) + §8.1 (attachments)
- `041_Whiteboards.md` — `PRD-project-management.md` §14.18 (`/projects/[projectId]/whiteboard`)
- `042_Timesheets.md` — covered generally by `PRD-project-management.md` §7.2 (timeTracking module) + §14.4 (time tracking UI)

- `043_Resource_Planning.md` — `PRD-project-management.md` §14.25 (`/projects/resource-allocation`)
- `044_Capacity_Planning.md` — covered generally by `PRD-project-management.md` §14.2 (workload view) + §14.25 (resource allocation)
- `045_Team_Workload.md` — covered generally by `PRD-project-management.md` §14.2 (workload view) + §14.25 (resource allocation)

- `046_Workflow_Automation.md` — `PRD-project-management.md` §14.20 (`/projects/[projectId]/automations`)
- `048_Recurring_Automation_Rules.md` — `PRD-project-management.md` §14.20 (`/projects/[projectId]/automations`)

- `049_AI_Project_Manager.md` — `PRD-project-management.md` §3 (non-goals: AI PM features are “future”)
- `050_AI_Task_Generator.md` — `PRD-project-management.md` §3 (non-goals: AI PM features are “future”)
- `051_AI_Sprint_Planner.md` — `PRD-project-management.md` §3 (non-goals: AI PM features are “future”)
- `052_AI_Risk_Detection.md` — `PRD-project-management.md` §3 (non-goals: AI PM features are “future”)
- `053_AI_Project_Summaries.md` — `PRD-project-management.md` §3 (non-goals: AI PM features are “future”)

- `054_Dashboards_And_Reports.md` — `PRD-project-management.md` §14.16 (analytics) + §14.19 (agile reports)
- `055_Burndown_Charts.md` — `PRD-project-management.md` §14.19 (agile reports) + §14.6 (sprint context)
- `056_Burnup_Charts.md` — `PRD-project-management.md` §14.19 (agile reports)
- `057_Velocity_Reports.md` — `PRD-project-management.md` §14.19 (agile reports) + §14.6 (sprint context)
- `058_Cycle_Time_Analytics.md` — `PRD-project-management.md` §14.16 (analytics) + §14.19 (agile reports)
- `059_Lead_Time_Analytics.md` — `PRD-project-management.md` §14.16 (analytics) + §14.19 (agile reports)

- `060_Import_Export.md` — covered generally by `PRD-project-management.md` §9 (backend API contract) + §7.3 (permission keys include `export`)
- `061_Public_API.md` — `PRD-project-management.md` §9 (backend API contract)
- `062_Webhooks.md` — `PRD-project-management.md` §14.21 (`/projects/[projectId]/webhooks`)

- `065_Mobile_Experience.md` — covered generally by `PRD-project-management.md` §14.0 (global UX + accessibility requirements)
- `066_Offline_Mode.md` — covered generally by `PRD-project-management.md` §14.26 (chat acceptance: offline queue continues to work)

- `067_Database_Architecture.md` — covered generally by `PRD-project-management.md` §8 (data model) + §12 (tenant isolation + OWASP posture)
- `068_API_Architecture.md` — covered generally by `PRD-project-management.md` §9 (API contract) + §12 (security)
- `071_Drizzle_Schema.md` — covered generally by `PRD-project-management.md` §8 (data model; backend-owned)
- `072_Database_Migrations.md` — covered generally by `PRD-project-management.md` §0 (backend owns schema/migrations) + §8 (data model)

- `073_Testing_Strategy.md` — `PRD-project-management.md` §15 (test plan)
- `075_Future_Roadmap.md` — covered generally by `PRD-project-management.md` §14.24 (`/projects/roadmap`) + §3 (non-goals/future)
- `076_Production_Readiness_Checklist.md` — covered generally by `PRD-project-management.md` §2.2 (engineering outcomes) + §14.0 (global requirements) + §15 (test plan)

