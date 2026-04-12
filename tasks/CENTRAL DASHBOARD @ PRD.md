**1\.**       **PRODUCT REQUIREMENTS DOCUMENT @ Project: Vaivamm Capital CRM — Central Dashboard Version: 1.0 Date: April 11, 2026 Author: Tarun (Product Owner) Status: Draft**

**Table of Contents**

1. Overview & Objective  
2. Current Flow Analysis  
3. Proposed Enhanced Flow  
4. Feature Specifications  
5. Database Schema Changes  
6. API Endpoints  
7. UI/UX Wireframe Descriptions  
8. Roles & Permissions  
9. Edge Cases & Error Handling  
10. Technical Implementation Notes  
11. Success Metrics  
12. Timeline & Milestones

---

**1\. Overview & Objective**

**1.1 Background**

While the Sales Dashboard addresses CRM financials, the dashboard directory represents the global homepage experienced by users upon login, specifically tailored to their overall operational role combining elements from HR, Timesheets, Projects, and Sales.

**1.2 Objective**

Provide a unified morning briefing screen tailored heavily to the user's role (e.g., an Admin sees company health, a standard employee sees their tasks and unread chats).

**2\. Current Flow Analysis**

**2.1 Current Process**

Users log in and must navigate across 4-5 different modules to understand their daily priorities.

**3\. Proposed Enhanced Flow**

**3.1 Role-Dependent Dashboard Layout**

The generic homepage /dashboard queries the user context. If user \== Employee: Load My Tasks, My Timesheet Status, Recent Chats. If user \== Admin/Exec: Load Global Revenues, Leaves Today, Project Health Scores.

**4\. Feature Specifications**

**4.1 Modular Widget Architecture**

The UI is composed of React Server Components acting as separate widgets that load asynchronously.

**4.2 "To-Do" Aggregator Board**

Pulls tasks from projects module where assigneeId \= current user and sorts them by nearest dueDate.

**4.3 Company Announcements Bullhorn**

A text widget where Admins can post global sticky notes for all staff to read upon login (e.g., "Office closed Friday due to holiday").

**5\. Database Schema Changes**

**5.1 New Tables**

announcements

| Column | Type | Description |
| :---- | :---- | :---- |
| id | serial | PK |
| authorId | text | Creator |
| content | text | Message body |
| expiresAt | date | Auto-hiding date |

**6\. API Endpoints**

| Method | Endpoint | Description | Auth |
| :---- | :---- | :---- | :---- |
| GET | /api/dashboard/personal | Fetches My Tasks, Timesheet Status | Employee |
| POST | /api/dashboard/announcements | Posts global bulletin | Admin |

**7\. UI/UX Wireframe Descriptions**

* **Masonry Grid Layout:** A responsive masonry layout containing widgets.  
* **Top Bar:** Warm personalized greeting (e.g., "Good morning, Tarun. You have 3 pending tasks today.")  
* **Widgets:**  
  * *My Tasks Container* (Scrollable list with checkboxes).  
  * *Company News* (Yellow sticky note style).  
  * *Timesheet Status* (Big Red/Green block indicating if this week is submitted).

**8\. Roles & Permissions**

| Permission | Admin | Manager | Employee |
| :---- | :---- | :---- | :---- |
| Post Announcements | ✓ | ✘ | ✘ |
| View Global Insights | ✓ | ✓ (Limited) | ✘ |
| View Personal Tasks | ✓ | ✓ | ✓ |

**9\. Edge Cases & Error Handling**

* **Slow Queries:** Because the dashboard aggregates data from across the entire CRM, one slow module (like Deals calculation) should not prevent the rest of the dashboard from loading. Suspense boundaries in React are heavily required.

**10\. Technical Implementation Notes**

* Using Next.js React.Suspense boundaries around each widget heavily. The "My Tasks" widget can load independently of the "Company Announcements" widget, ensuring the fastest time to First Contentful Paint.

**11\. Success Metrics**

* Initial dashboard load under 800ms.  
* Increase in daily active engagement on tasks directly from the home screen.

**12\. Timeline & Milestones**

* **Phase 1:** API Aggregation layers per role (4 Days)  
* **Phase 2:** Announcements DB logic (1 Day)  
* **Phase 3:** Suspense boundary UI widget development (1 Week)  
* **Estimated Total: 2 Weeks**


---

## Status: ✅ COMPLETE

## Checklist

### Backend
- [x] `app/api/dashboard/` routes exist — personal + team metrics
- [x] `announcements` table — `drizzle/0056_announcements.sql` — `id, orgId, authorId, content, isPinned, expiresAt, createdAt`
- [x] `POST /api/dashboard/announcements` — create announcement (Admin only)
- [x] `GET /api/dashboard/announcements` — fetch active (not expired) announcements for org
- [x] `DELETE /api/dashboard/announcements/[id]` — delete (Admin only)
- [x] `GET /api/dashboard/personal` — returns: my tasks (due today/overdue), timesheet status this week, unread chat count, leave balance
- [x] `GET /api/dashboard/executive` — returns: MRR, headcount, leads this week, pipeline value, open roles count
- [x] `GET /api/dashboard/manager` — returns: team tasks summary, team attendance today, pending approvals count
- [x] Redis caching for executive metrics (TTL 300s)
- [x] `GET /api/dashboard/stats`, `/role-stats`, `/today-activities`, `/birthdays`, `/leaves-today`, `/upcoming-leaves`, `/upcoming-holidays`, `/pending-requests`, `/pending-approvals`, `/team-attendance`

### Frontend — Layout
- [x] `app/(dashboard)/dashboard/page.tsx` — rewritten with role-based widget grid
- [x] Role-based widget rendering: CEO/Admin → executive widgets; Manager → team widgets; Employee → personal widgets
- [x] React Suspense boundaries per widget (each loads independently)
- [x] Personalized greeting with first name
- [x] `lib/api/hooks/dashboard.ts` — 20+ typed hooks for all dashboard data

### Widgets — Employee View
- [x] **My Tasks widget** — `components/dashboard/widgets/my-tasks-widget.tsx`
- [x] **Timesheet Status widget** — `components/dashboard/widgets/timesheet-widget.tsx`
- [x] **Leave Balance widget** — `components/dashboard/widgets/leave-balance-widget.tsx`
- [x] **My Upcoming Events widget** — `components/dashboard/widgets/upcoming-events-widget.tsx`

### Widgets — Manager View
- [x] **Team Attendance widget** — `components/dashboard/widgets/team-attendance-widget.tsx`
- [x] **Pending Approvals widget** — `components/dashboard/widgets/pending-approvals-widget.tsx`

### Widgets — Admin/CEO View
- [x] **Executive KPI widget** — `components/dashboard/widgets/executive-kpi-widget.tsx` (MRR, headcount, leads, pipeline)
- [x] **Project Health widget** — `components/dashboard/widgets/project-health-widget.tsx`
- [x] **Company Announcements widget** — `components/dashboard/widgets/announcements-widget.tsx`
- [x] **Quick Actions bar** — `components/dashboard/widgets/quick-actions-widget.tsx`

### New Features (Extended)
- [x] **Recent Activity feed** — `app/api/dashboard/recent-activity/` route + widget in dashboard page
- [x] **Birthday/Anniversary widget** — `app/api/dashboard/birthdays/` + rendered in dashboard
- [x] **Widget skeleton** — `components/dashboard/widgets/widget-skeleton.tsx`
- [x] **Pinnable widgets** — DEFERRED (future enhancement) — drag/reorder with `@dnd-kit/sortable` (future enhancement)
- [x] **System Notifications bell** — popover preview — `components/layout/notification-bell.tsx` with unread count badge, popover list, mark-read, clear all

### Verification
- [x] `pnpm tsc --noEmit` — zero errors
- [x] `pnpm build` — passes
- [x] `pnpm db:migrate` — migration 0056 applied

---

## Implementation Plan

### Phase 1 — DB & API Aggregation (4 days)
1. Migration: `announcements` table
2. `server/queries/dashboard.ts` — write role-aware query functions
3. `/api/dashboard/personal`, `/executive`, `/manager` routes using `withAuth` role check
4. Redis cache for executive metrics with `CACHE_KEYS.executiveDashboard`

### Phase 2 — Announcements (1 day)
1. API routes for announcements (CRUD, `expiresAt` filter)
2. Frontend: Admin can create/pin/delete announcements; all users see them on dashboard

### Phase 3 — Widget UI (1 week)
1. `components/dashboard/widgets/` directory — one component per widget
2. `DashboardGrid` — renders correct widget set based on `session.user.role`
3. Wrap every widget in `<Suspense fallback={<WidgetSkeleton />}>`
4. Masonry grid with `@tanstack/react-virtual` or CSS grid areas

### Phase 4 — Personalization (2 days)
1. `user_preferences.dashboardLayout` JSON column — store widget order
2. Drag-to-reorder with `@dnd-kit/sortable`; persist on drop
3. Quick Actions toolbar (role-dependent shortcuts)
