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

## Status: IN PROGRESS

## Checklist

### Backend
- [x] `app/api/dashboard/` routes exist — personal + team metrics
- [ ] `announcements` table — `id, orgId, authorId, content, isPinned, expiresAt, createdAt`
- [ ] `POST /api/dashboard/announcements` — create announcement (Admin only)
- [ ] `GET /api/dashboard/announcements` — fetch active (not expired) announcements for org
- [ ] `DELETE /api/dashboard/announcements/[id]` — delete (Admin only)
- [ ] `GET /api/dashboard/personal` — returns: my tasks (due today/overdue), timesheet status this week, unread chat count, leave balance
- [ ] `GET /api/dashboard/executive` — returns: MRR, headcount, leads this week, pipeline value, open roles count
- [ ] `GET /api/dashboard/manager` — returns: team tasks summary, team attendance today, pending approvals count
- [ ] Redis caching for executive metrics (TTL 5 min); invalidate on hire/fire
- [ ] `GET /api/dashboard/quick-stats` — lightweight 4-card metrics per role

### Frontend — Layout
- [x] `app/(dashboard)/dashboard/page.tsx` — dashboard page exists
- [ ] Role-based widget rendering: Admin/CEO → executive widgets; Manager → team widgets; Employee → personal widgets
- [ ] Masonry/grid layout with React Suspense boundaries per widget (each loads independently)
- [ ] Personalized greeting: "Good morning, [First Name]. You have [N] pending tasks."
- [ ] Global date context pill (Today's date + day)

### Widgets — Employee View
- [ ] **My Tasks widget** — scrollable list from projects module (`assigneeId = me`, sorted by `dueDate`)
- [ ] **Timesheet Status widget** — big Red/Green block: "Week submitted" or "X hours missing"
- [ ] **Leave Balance widget** — remaining PTO days with mini donut chart
- [ ] **Unread Chats widget** — count + quick link to chat
- [ ] **My Upcoming Events widget** — next 3 calendar events

### Widgets — Manager View
- [ ] **Team Attendance widget** — who's in/out today
- [ ] **Pending Approvals widget** — leaves + expenses awaiting manager approval
- [ ] **Team Tasks widget** — overdue tasks across my team

### Widgets — Admin/CEO View
- [x] CEO dashboard partially exists at `/sales` with KPI cards
- [ ] **Revenue KPI card** — MRR, pipeline value, close rate
- [ ] **Headcount card** — total employees, open roles, hired this month
- [ ] **Lead Pipeline card** — new leads this week, conversion rate
- [ ] **Project Health card** — active projects, overdue tickets count
- [ ] **Company Announcements bullhorn** — sticky note widget with post/delete

### New Features (Extended)
- [ ] **Pinnable widgets** — users can drag/reorder their dashboard layout (store in `user_preferences`)
- [ ] **Quick Actions bar** — "Log Call", "Add Lead", "Request Leave" shortcut buttons
- [ ] **Recent Activity feed** — last 10 audit log entries across the org (Admin only)
- [ ] **Birthday/Anniversary widget** — upcoming celebrations in the next 7 days
- [ ] **System Notifications bell** — unread notification count with popover preview

### Verification
- [ ] Dashboard loads < 800ms (measure with Vercel Analytics or browser devtools)
- [ ] Each widget fails gracefully (Suspense boundary shows skeleton on error)
- [ ] `pnpm build` passes

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
