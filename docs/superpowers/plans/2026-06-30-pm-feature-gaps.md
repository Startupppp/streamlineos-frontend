# Project Management Feature Gaps — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement all features from the Projects PRD (76 files) that are missing from the existing codebase, and polish existing ones.

**Architecture:** The backend is NestJS (streamlineos-api), DB is Drizzle+Neon. Frontend is Next.js App Router with TanStack Query. All business logic lives in the backend. Frontend calls backend APIs via `apiClient`.

**Tech Stack:** Next.js 14, TypeScript, Tailwind CSS, shadcn/ui, Framer Motion, TanStack Query, Drizzle ORM, NestJS, PostgreSQL

---

## Audit: What Exists vs PRD

### Already Implemented ✅
- Projects CRUD (`/projects`, `/projects/[projectId]`)
- Board view (Kanban), List view, Table view, Calendar view, Gantt view
- Sprints (create, start, complete, burndown, velocity charts)
- Backlog with bulk operations
- Epics page
- Timeline page
- Milestones page
- Analytics page (project stats, charts)
- Reports page (burndown, burnup, CFD, critical path)
- Project Settings (info, members, danger zone)
- Templates
- Whiteboard
- Wiki/Pages
- Budget
- Cycles (iterations)
- Modules
- Intake
- My Tickets
- Saved Views
- Resource Allocation
- Ticket Detail (header, sidebar, subtasks, relations/dependencies, time tracker, watchers, activity feed, comments, attachments)
- Timesheets

### MISSING from PRD ❌

1. **Checklists (PRD 014)** — No schema, API, or UI
2. **Custom Fields (PRD 018)** — No schema, API, or UI for tickets
3. **Workload View (PRD 027)** — Not in ViewSwitcher
4. **Portfolio View (PRD 028)** — Not implemented
5. **Releases (PRD 034-035)** — No schema, API, route, or sidebar entry

---

## Task 1: Backend — Checklists Schema + API

**Files:**
- Modify: `backend/src/db/schema/projects/tasks.ts`
- Create: `backend/src/modules/projects/dto/checklist.schemas.ts`
- Modify: `backend/src/modules/projects/projects-ticket-subresources.service.ts`
- Modify: `backend/src/modules/projects/projects-tickets.controller.ts`

- [ ] Add `ticket_checklists` table (id, ticketId, orgId, title, createdAt)
- [ ] Add `ticket_checklist_items` table (id, checklistId, text, isCompleted, assigneeId, dueDate, order, createdAt)
- [ ] Add Zod schemas for checklist CRUD
- [ ] Add service methods: createChecklist, getChecklists, updateChecklist, deleteChecklist, createItem, updateItem, deleteItem
- [ ] Add controller routes: GET/POST/PATCH/DELETE `/projects/:id/tickets/:tid/checklists` and `/items`
- [ ] Run `pnpm -C backend db:generate`

## Task 2: Backend — Custom Fields Schema + API

**Files:**
- Modify: `backend/src/db/schema/projects/tasks.ts`
- Create: `backend/src/modules/projects/dto/custom-fields.schemas.ts`
- Create: `backend/src/modules/projects/projects-custom-fields.service.ts`
- Create: `backend/src/modules/projects/projects-custom-fields.controller.ts`
- Modify: `backend/src/modules/projects/projects.module.ts`

- [ ] Add `project_custom_fields` table (id, projectId, orgId, name, type, options, required, position)
- [ ] Add `ticket_custom_field_values` table (id, ticketId, fieldId, value, createdAt, updatedAt)
- [ ] Add Zod schemas for custom fields CRUD
- [ ] Add service + controller
- [ ] Run `pnpm -C backend db:generate`

## Task 3: Backend — Releases Schema + API

**Files:**
- Modify: `backend/src/db/schema/projects/tasks.ts`
- Create: `backend/src/modules/projects/dto/releases.schemas.ts`
- Create: `backend/src/modules/projects/projects-releases.service.ts`
- Create: `backend/src/modules/projects/projects-releases.controller.ts`

- [ ] Add `project_releases` table (id, projectId, orgId, name, version, description, status, releaseDate, createdAt, updatedAt)
- [ ] Add `release_tickets` join table
- [ ] Add service + controller
- [ ] Run `pnpm -C backend db:generate`

## Task 4: Frontend — Checklists in Ticket Detail

**Files:**
- Create: `frontend/components/projects/ticket-details/ticket-checklists.tsx`
- Create: `frontend/hooks/api/projects/checklists.ts`
- Modify: `frontend/components/projects/ticket-details/ticket-details-dialog.tsx`
- Modify: `frontend/types/projects.ts`

- [ ] Create TanStack Query hooks for checklists
- [ ] Create TicketChecklists component with add/edit/delete checklist and items
- [ ] Add progress indicator (N/M completed)
- [ ] Add to ticket-details-dialog between subtasks and attachments

## Task 5: Frontend — Custom Fields in Ticket Detail + Project Settings

**Files:**
- Create: `frontend/components/projects/ticket-details/ticket-custom-fields.tsx`
- Create: `frontend/hooks/api/projects/custom-fields.ts`
- Modify: `frontend/components/projects/ticket-details/ticket-details-dialog.tsx`
- Modify: `frontend/app/(authenticated)/projects/[projectId]/settings/page.tsx`

- [ ] Create TanStack Query hooks for custom fields
- [ ] Create TicketCustomFields component
- [ ] Add to ticket-details-dialog
- [ ] Add custom fields management section to project settings page

## Task 6: Frontend — Releases Page

**Files:**
- Create: `frontend/app/(authenticated)/projects/[projectId]/releases/page.tsx`
- Create: `frontend/app/(authenticated)/projects/[projectId]/releases/loading.tsx`
- Create: `frontend/hooks/api/projects/releases.ts`
- Modify: `frontend/components/layout/project-sidebar.tsx`
- Modify: `frontend/types/projects.ts`

- [ ] Create releases page with create/edit/delete releases
- [ ] Show release status (Draft, Released, Archived)
- [ ] Link tickets to releases
- [ ] Add releases to project sidebar (Tracking section)

## Task 7: Frontend — Workload View

**Files:**
- Create: `frontend/components/projects/workload-view.tsx`
- Modify: `frontend/components/projects/view-switcher.tsx`
- Modify: `frontend/app/(authenticated)/projects/[projectId]/page.tsx`
- Modify: `frontend/hooks/api/projects/advanced.ts`

- [ ] Create WorkloadView component showing team capacity grid
- [ ] Show members as rows, days as columns
- [ ] Color-code by utilization (under/at/over capacity)
- [ ] Add "workload" to ViewSwitcher
- [ ] Wire up to existing project data

## Task 8: Frontend — Portfolio View

**Files:**
- Create: `frontend/app/(authenticated)/projects/portfolio/page.tsx`
- Create: `frontend/app/(authenticated)/projects/portfolio/loading.tsx`
- Modify: `frontend/components/layout/sidebar/sidebar-nav-items.ts`

- [ ] Create portfolio page at `/projects/portfolio`
- [ ] Show multi-project health dashboard
- [ ] Cards for each project with: health indicator, progress bar, budget, risks, milestones
- [ ] Add to workspace navigation under "Projects & Time"

---

## Summary

| # | Feature | Backend | Frontend |
|---|---------|---------|---------|
| 1 | Checklists | New tables + API | New component in ticket detail |
| 2 | Custom Fields | New tables + API | Component in ticket detail + settings |
| 3 | Releases | New tables + API | New page + sidebar |
| 4 | Workload View | Reuse project data | New view component |
| 5 | Portfolio View | Reuse projects API | New workspace page |
