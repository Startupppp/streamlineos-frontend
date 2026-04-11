**\*PRODUCT REQUIREMENTS DOCUMENT\*\***

**HR Admin Dashboard**

**\*\*Project:\*\* Vaivamm Capital CRM**  
**\*\*Version:\*\* 1.0**  
**\*\*Date:\*\* April 11, 2026**  
**\*\*Author:\*\* Tarun (Product Owner)**  
**\*\*Status:\*\* Draft**

**\# 1\. Overview & Objective**  
**Give HR executives a birds-eye view of staff composition, hiring bottlenecks, and overarching personnel health across the organization.**

**\# 2\. Current Flow Analysis**  
**HR data is segmented across disjointed payroll, attendance, and evaluation systems.**

**\# 3\. Proposed Enhanced Flow**  
**A centralized analytical dashboard presenting live metrics on headcount, diversity, active leaves, and open requisitions.**

**\# 4\. Feature Specifications**  
**\- Headcount breakdown by Department and Location.**  
**\- Summary of Active Leaves/Absences.**  
**\- Upcoming anniversaries and birthdays.**  
**\- Open Requisitions vs Time-to-Fill averages.**

**\# 5\. Database Schema Changes**  
**No new tables required. Data derived from aggregating \`employees\`, \`attendance\`, and \`jobs\` tables.**

**\# 6\. API Endpoints**  
**\- \`GET /api/hr/dashboard/metrics\`**  
**\- \`GET /api/hr/dashboard/headcount-trends\`**

**\# 7\. UI/UX Wireframe Descriptions**  
**Cards for quick stats (Total Headcount, Open Roles). A Donut chart for Department breakdown. A right-side panel scrolling upcoming birthdays/anniversaries.**

**\# 8\. Roles & Permissions**  
**Strictly limited to HR Managers and C-Level Executives to mask sensitive aggregate analytics from general staff.**

**\# 9\. Edge Cases & Error Handling**  
**Dashboard caching must invalidate instantly upon firing or hiring an employee to ensure executives aren't looking at stale active headcount.**

**\# 10\. Technical Implementation Notes**  
**Aggregations should be processed asynchronously or cached nightly using cron jobs if the employee size exceeds 1,000, preventing slow page loads.**

**\# 11\. Success Metrics**  
**\- 100% replacement of external HR reporting dashboards.**

**\# 12\. Timeline & Milestones**  
**API Aggregations: 1 week; UI Dashboard rendering: 1 week. Total: \~2 weeks.**


---

## Status: IN PROGRESS

## Checklist

### Database
- [x] All source tables exist: `users`, `attendance`, `leave_requests`, `job_postings`, `performance_reviews`
- [ ] `GET /api/hr/dashboard/metrics` — aggregate endpoint (headcount, leaves today, open roles, avg tenure)
- [ ] `GET /api/hr/dashboard/headcount-trends` — headcount per month for last 12 months
- [ ] `GET /api/hr/dashboard/upcoming-celebrations` — birthdays + work anniversaries next 30 days
- [ ] `GET /api/hr/dashboard/attrition-risk` — employees at risk (calls `/api/ai/attrition-risk`)
- [ ] Redis cache for HR metrics (TTL 10 min); invalidate on hire/fire/terminate event
- [ ] `users.hireDate` — used for tenure + anniversary calculations
- [ ] `users.dateOfBirth` — used for birthday widget

### API
- [x] `GET /api/hr/attendance` — attendance records
- [x] `GET /api/hr/employees` — employee list
- [ ] `GET /api/hr/dashboard/metrics` — unified metrics endpoint
- [ ] `GET /api/hr/dashboard/headcount-trends` — monthly headcount history
- [ ] `GET /api/hr/dashboard/department-breakdown` — headcount per department (donut chart data)
- [ ] `GET /api/hr/dashboard/leave-summary` — active leaves today, pending approvals count
- [ ] `GET /api/hr/dashboard/open-requisitions` — open job postings + avg days open
- [ ] `GET /api/hr/dashboard/upcoming-celebrations` — next 7 days birthdays/anniversaries

### Frontend
- [x] `app/(dashboard)/hr/page.tsx` — HR home page
- [x] `app/(dashboard)/hr/analytics/page.tsx` — HR analytics page
- [ ] Dashboard stat cards: Total Headcount, New Hires This Month, Attrition Rate, Open Roles
- [ ] Department breakdown donut chart (Recharts `PieChart`)
- [ ] Headcount trend line chart (last 12 months, Recharts `LineChart`)
- [ ] Active leaves today — list of who's OOO
- [ ] Pending approvals count (leaves + expenses) with quick-navigate link
- [ ] Upcoming anniversaries/birthdays sidebar panel (next 30 days, sorted by date)
- [ ] Open requisitions table: Job Title, Department, Days Open, Applications Count
- [ ] Attrition risk panel: top 5 at-risk employees with AI reasoning (from `/api/ai/attrition-risk`)

### New Features (Extended)
- [ ] **Diversity & Inclusion metrics** — gender breakdown, age distribution charts
- [ ] **Salary band heat map** — shows salary distribution across departments (CEO/HR only)
- [ ] **Time-to-fill report** — avg days from job posting to hire per department
- [ ] **eNPS score** — displayed on dashboard from latest pulse survey
- [ ] **Compliance tracker** — % of employees with up-to-date certifications/documents
- [ ] **Onboarding status widget** — how many new hires are in progress + completion %
- [ ] **Payroll summary card** — total salary outgo this month (Finance/CEO only)
- [ ] **Export HR report** — download full HR metrics as PDF/Excel

### Verification
- [ ] Cache invalidates when an employee is hired or terminated
- [ ] Dashboard renders within 1.5s with 500+ employees
- [ ] `pnpm build` passes

---

## Implementation Plan

### Phase 1 — Metrics API (4 days)
1. `server/queries/hr-dashboard.ts` with all aggregate queries
2. `GET /api/hr/dashboard/metrics` — returns single JSON object with all KPIs
3. `GET /api/hr/dashboard/headcount-trends` — GROUP BY month using `DATE_TRUNC`
4. Redis cache with `CACHE_KEYS.hrDashboard`; invalidate on hire/fire Inngest events

### Phase 2 — Core Widget UI (4 days)
1. `app/(dashboard)/hr/` — update page to load dashboard metrics
2. Stat cards: Headcount, New Hires, Attrition Rate, Open Roles
3. Recharts: Department donut + 12-month headcount line
4. Active leaves list + pending approvals counter

### Phase 3 — Celebrations & Attrition (2 days)
1. Upcoming celebrations API — filter `users WHERE EXTRACT(month FROM dateOfBirth) = current_month`
2. Right-side panel: birthday cards with avatar + days until
3. Attrition risk widget: call `/api/ai/attrition-risk` lazily; show top 5 with risk badge

### Phase 4 — Advanced Reports (2 days)
1. eNPS score from latest `enps_scores` record
2. Compliance tracker: % employees with `certifications.expiresAt > today`
3. Export: `lib/utils/hr-report-pdf.ts` using `jspdf` + autoTable
