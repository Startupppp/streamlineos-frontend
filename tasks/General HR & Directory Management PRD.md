**PRODUCT REQUIREMENTS DOCUMENT**

General HR & Directory Management

**Project:** Vaivamm Capital CRM — HR Module **Version:** 1.0 **Date:** April 11, 2026 **Author:** Tarun (Product Owner) **Status:** Draft

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

While the onboarding workflow is handled separately, the central hr module serves as the primary system of record for active employee data, leave management, and organizational structure.

**1.2 Objective**

Centralize all personnel data into a master Employee Directory to simplify HR operations and team visibility.

**2\. Current Flow Analysis**

**2.1 Current Process**

Currently handled through disconnected spreadsheets and external leave request portals.

**2.2 Gaps Identified**

* No single source of truth for an employee's department, manager, or compensation tier.

**3\. Proposed Enhanced Flow**

**3.1 Unified Profile Approach**

Every user in the CRM gets an "Employee Profile". Employees can view an Org Chart and public profiles. HR can access a hidden dashboard tab on those profiles containing salary data, warnings, and document repositories.

**4\. Feature Specifications**

**4.1 Global Employee Directory**

Searchable database of all staff. Displays name, title, department, email, and internal phone extension.

**4.2 Leave / PTO Management**

Request portal where employees select date ranges and leave types (Sick, Vacation). Routes directly to their managerId for approval.

**4.3 Org Chart Visualizer**

Dynamically generated hierarchy tree derived from the managerId relations in the database.

**5\. Database Schema Changes**

**5.1 Modified/New Tables**

users (Modification)

| Column | Type | Description |
| :---- | :---- | :---- |
| departmentId | int (FK) | E.g. Sales, Tech |
| managerId | text (FK) | Reference back to users |
| ptoBalance | int | Allowed leave days remaining |

leave\_requests

| Column | Type | Description |
| :---- | :---- | :---- |
| userId | text (FK) | Requester |
| startDate | date | Start |
| endDate | date | End |
| status | enum | PENDING, APPROVED, DENIED |

**6\. API Endpoints**

| Method | Endpoint | Description | Auth |
| :---- | :---- | :---- | :---- |
| GET | /api/hr/directory | Non-sensitive roster data | All |
| POST | /api/hr/leaves | Submit PTO request | Employee |
| PUT | /api/hr/leaves/\[id\]/approve | Approve leave | Manager |

**7\. UI/UX Wireframe Descriptions**

* **Directory List:** Responsive card grid containing avatars. Clicking flips card to show contact details.  
* **Leave Request Modal:** Calendly-style date picker, reason text box, and dynamic calculation showing: "This will consume 3 of your remaining 10 PTO days."

**8\. Roles & Permissions**

| Permission | Admin / HR | Manager | Employee |
| :---- | :---- | :---- | :---- |
| View Compensation | ✓ | ✘ | Own Only |
| Approve Leaves | ✓ | ✓ (Own Team) | ✘ |
| Modify Org Structure | ✓ | ✘ | ✘ |

**9\. Edge Cases & Error Handling**

* **Negative PTO:** Block users from requesting more time off than their ptoBalance permits, unless explicitly overriden by HR.  
* **Circular Management:** DB constraint to prevent an employee from being set as the Line Manager of their own Line Manager (infinite loop).

**10\. Technical Implementation Notes**

* Use react-organizational-chart or custom D3.js to render the tree view efficiently.

**11\. Success Metrics**

* 100% of leave requests processed entirely in-system, nullifying email loops.

**12\. Timeline & Milestones**

* **Phase 1:** Directory & Profiles (4 Days)  
* **Phase 2:** Leave Logic & Workflows (1 Week)  
* **Phase 3:** Org Chart implementation (3 Days)  
* **Estimated Total: 2 Weeks**

 


---

## Status: SUBSTANTIALLY COMPLETE

## Checklist

### Database
- [x] `users` — `departmentId, managerId, ptoBalance`
- [x] `leave_requests` — `userId, startDate, endDate, status (PENDING/APPROVED/DENIED), leaveTypeId`
- [x] `leave_types` — configurable leave categories
- [x] `leave_balances` — per-user remaining balance per leave type
- [x] `departments`, `department_members`
- [ ] `leave_requests.managerComment` — text field for approval notes
- [ ] `leave_requests.coveringEmployeeId` — who covers during absence
- [ ] Negative PTO guard: block requests where `days > ptoBalance` (unless HR override)
- [ ] Circular management guard in `users.managerId`

### API
- [x] `GET /api/hr/employees` — directory listing
- [x] `POST /api/hr/leaves` — submit leave request
- [x] `PUT /api/hr/leaves` — update leave status (approve/reject)
- [ ] `GET /api/hr/directory` — public lightweight roster
- [ ] `GET /api/hr/leaves/my` — current user's leave history + balance
- [ ] `GET /api/hr/leaves/team` — manager sees team's pending leaves
- [ ] `GET /api/hr/leaves/calendar` — all approved leaves for calendar aggregation
- [ ] `PUT /api/hr/leaves/[leaveId]/approve` — manager approval
- [ ] `PUT /api/hr/leaves/[leaveId]/reject` — manager rejection with reason
- [ ] `GET /api/hr/leaves/balance` — remaining PTO per leave type
- [ ] `POST /api/hr/leaves/hr-override` — HR bypasses PTO balance limit
- [ ] Email notification on leave status change (via Inngest function)
- [ ] Inngest: monthly leave reset cron — already exists at `lib/inngest/functions/monthly-leave-reset.ts` ✅

### Frontend
- [x] `app/(dashboard)/hr/leaves/page.tsx` — leave management page
- [x] `app/(dashboard)/hr/employees/page.tsx` — employee directory
- [x] `app/(dashboard)/hr/org-chart/page.tsx` — org chart
- [ ] Leave request modal: date-range picker + leave type + reason + dynamic "X of Y PTO days remaining" preview
- [ ] Manager approval view: table of pending requests with Approve/Reject inline
- [ ] Leave calendar: mini-calendar showing who's OOO per day (color per team)
- [ ] Leave balance widget: donut chart of used/remaining by type
- [ ] Attendance heatmap: per-employee yearly attendance calendar (GitHub-style)
- [ ] HR override toggle: "Approve beyond balance" with mandatory justification note

### New Features (Extended)
- [ ] **Comp-off / compensatory leave** — auto-credit leave when employee works on holiday
- [ ] **Leave encashment** — convert unused PTO to monetary value at year-end
- [ ] **Half-day leave** — request only AM or PM
- [ ] **Leave policy by department** — different rules per department (e.g., Sales can't take leave during Q4 close)
- [ ] **Leave blackout dates** — Admin marks dates where no leave is allowed
- [ ] **Auto-forward pending requests** — if manager inactive > 48h, escalate to their manager
- [ ] **Leave analytics** — per-department leave utilization chart (HR Admin Dashboard)
- [ ] **WFH requests** — `wfh_requests` table exists; build approval flow same as leave
- [ ] **Holiday calendar** — `holidays` table; mark public + org-specific holidays

### Verification
- [ ] Negative PTO request blocked at API
- [ ] Circular managerId rejected
- [ ] Email sent on approval/rejection (Inngest trigger test)
- [ ] `pnpm build` passes

---

## Implementation Plan

### Phase 1 — Leave Flow Completion (3 days)
1. Add `managerComment`, `coveringEmployeeId` to `leave_requests`
2. `PUT /api/hr/leaves/[leaveId]/approve` + `/reject` — check requester's manager = caller
3. Negative PTO guard: query `leave_balances` before insert; throw 400 if insufficient
4. Inngest trigger on status change: send email via `lib/email-templates/hr.ts`

### Phase 2 — Manager View (2 days)
1. Team leave dashboard: `/hr/leaves?view=team` — filter by `managerId = me`
2. Bulk approve/reject: select multiple pending → action dropdown
3. Leave calendar: `/hr/leaves/calendar` — aggregate approved leaves into calendar events

### Phase 3 — Advanced Leave Features (3 days)
1. Half-day leave: add `isHalfDay` boolean + `halfDayPeriod` enum (AM/PM) to `leave_requests`
2. Leave blackout dates: `leave_blackout_dates` table; check on request submission
3. WFH approval flow: mirror leave flow but with `wfh_requests` table

### Phase 4 — Analytics (2 days)
1. Leave utilization chart: avg days taken per department per quarter
2. Leave patterns: heatmap showing peak OOO periods (useful for staffing)
