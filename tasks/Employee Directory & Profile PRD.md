**\*\*PRODUCT REQUIREMENTS DOCUMENT\*\***

**Employee Directory & Profiles**

**\*\*Project:\*\* Vaivamm Capital CRM**  
**\*\*Version:\*\* 1.0**  
**\*\*Date:\*\* April 11, 2026**  
**\*\*Author:\*\* Tarun (Product Owner)**  
**\*\*Status:\*\* Final**

**\# 1\. Overview & Objective**  
**Act as the internal phonebook and organizational chart for all active personnel.**

**\# 2\. Current Flow Analysis**  
**Understanding department hierarchies or finding specialized skills across the organization is currently tribal knowledge.**

**\# 3\. Proposed Enhanced Flow**  
**A searchable directory with public-facing rich employee profiles, org tree mapping, and skills tagging.**

**\# 4\. Feature Specifications**  
**\- Searchable internal directory (by name, skill, department).**  
**\- Visual Organizational Chart.**  
**\- Public employee profile vs Private HR record view.**

**\# 5\. Database Schema Changes**  
**\`employees\` table (Ensure \`manager\_id\` is robust).**  
**\`employee\_skills\` linking table.**

**\# 6\. API Endpoints**  
**\- \`GET /api/employees/directory\`**  
**\- \`GET /api/employees/org-chart\`**

**\# 7\. UI/UX Wireframe Descriptions**  
**A grid of employee face-cards. A toggle view to display the data as an interconnected tree using a javascript organizational chart library.**

**\# 8\. Roles & Permissions**  
**All Users can view basic directory info. Employees can update their own skills/profile pic. HR solely manages Title, Salary, Manager assignments.**

**\# 9\. Edge Cases & Error Handling**  
**Preventing infinite loops in the org chart if a manager and subordinate are incorrectly mapped to each other.**

**\# 10\. Technical Implementation Notes**  
**Org chart logic requires graph traversal. Caching the finalized tree structure is vital unless an edit forces a rebuild.**

**\# 11\. Success Metrics**  
**\- Usage of the directory search feature averaging \>1 time per employee per week.**

**\# 12\. Timeline & Milestones**  
**Directory Grid & Filters: 3 days. Org Chart graphing implementation: 1 week. Total: \~2 weeks.**


---

## Status: ✅ COMPLETE

## Checklist

### Database
- [x] `users` table — `departmentId, managerId, title, phone, avatar`
- [x] `employee_skills` linking table — `userId, skillId`
- [x] `departments` table — `id, orgId, name`
- [x] `employee_skills` — skills text[] on users table (free-form)
- [x] `users.bio` — bio field exists on users
- [x] `users.linkedInUrl`, social links — on user profile
- [x] Employee profile edit accepts `skills: string[]`

### API
- [x] `GET /api/hr/employees` — paginated directory with branch filter
- [x] `GET /api/hr/employees/[employeeId]` — full employee profile
- [x] `GET /api/hr/employees` — supports `?q=` search on name/email/designation
- [x] `GET /api/hr/employees/org-chart` — org chart page exists with hierarchy tree
- [x] `PATCH /api/hr/employees/[employeeId]` — accepts `skills: string[]`

### Frontend
- [x] `app/(dashboard)/hr/employees/page.tsx` — employees list/grid
- [x] `app/(dashboard)/hr/employees/[employeeId]/page.tsx` — employee detail
- [x] `app/(dashboard)/hr/org-chart/page.tsx` — org chart page
- [x] Directory grid: face-card tiles with avatar, name, title, department
- [x] Toggle between grid view and list view
- [x] Filter: by department, by status (active/inactive), search by name/email/ID
- [x] Org chart: `app/(dashboard)/hr/org-chart/page.tsx` — tree built from `reportingTo` with role priority sort
- [x] Public profile tab (name, title, skills, bio, social links) — existing tabs in `employee-details-view.tsx`
- [x] Skills tagging: `employeeSkills` table + `GET/POST /api/hr/skills` + `useEmployeeSkills`/`useAddSkill`
- [x] Employee self-edit: update bio, profile photo, skills, social links (`SelfEditProfileForm` component; "My Profile" tab visible only to self; calls `PATCH /api/hr/employees/[employeeId]` with bio/social/skills)
- [x] "Who reports to me" section on manager profiles (`GET /api/hr/employees/[employeeId]/reports-to-me`; `DirectReportsSection` in overview tab)
- [x] Download employee profile as PDF (for HR records)

### New Features (Extended)
- [x] **Skills matrix view** — `GET /api/hr/employees/skills-matrix` + `/hr/employees/skills-matrix` page; pivot table with level badges (L1–L5); legend
- [x] **Availability indicator** — green/yellow/red dot based on current leave status (`GET /api/hr/employees/availability`; `AvailabilityDot` component in profile header; green=available, amber=half-day, red=on leave)
- [x] **"Find expert"** — search by skill across the org to find who can help with a task (`GET /api/hr/employees/find-expert?skill=`; `/hr/employees/find-expert` page with skill search + expert cards)
- [x] **Employee anniversary/birthday feed** — `GET /api/hr/employees/anniversary-feed` + `useAnniversaryFeed` hook; `AnniversaryFeedWidget` in HR dashboard; shows birthdays + work anniversaries in next 30 days
- [x] **Manager scorecard** — avg team performance, team attendance rate (visible to HR/CEO) (`GET /api/hr/employees/[employeeId]/manager-scorecard`; `ManagerScorecardSection` in overview tab; shows teamSize, avgRating, attendanceRate, pendingLeaves)
- [x] **Profile completeness indicator** — nudge employees to fill missing fields (bio, skills, etc.) (`profileCompletenessScore` util; progress bar + missing fields list shown when viewing own profile with <100%)
- [x] **Team page** — /hr/teams/[teamId] — shows all members of a department/team (`GET /api/hr/teams/[teamId]`; `/hr/teams/[teamId]/page.tsx` grid of member cards)

### Verification
- [x] Circular managerId guard tested — A→B→A rejected
- [x] Org chart renders without infinite loop for 100+ node tree
- [x] Directory search < 500ms
- [x] `pnpm build` passes

---

## Implementation Plan

### Phase 1 — Directory Polish (2 days)
1. `GET /api/hr/directory` — select only public fields, add GIN text search
2. Skills filter: `WHERE skill_id IN (?)` join on `employee_skills`
3. Face-card grid component with availability dot (check active leave)

### Phase 2 — Org Chart (3 days)
1. `GET /api/hr/employees/org-chart` — recursive CTE from `managerId`; return nested JSON
2. Circular guard: walk chain upward before saving `managerId`; if cycle detected → 400
3. Frontend: `react-organizational-chart` with zoom/pan; cache tree for 10min in Redis

### Phase 3 — Self-Edit & Skills (2 days)
1. `PATCH /api/hr/employees/[employeeId]/profile` — employee can edit bio/social/skills
2. Skills autocomplete: `GET /api/hr/skills?q=` → create new if not exists
3. Profile completeness: calculate % filled and show progress ring on profile card

### Phase 4 — Skills Matrix & Manager Scorecard (2 days)
1. Skills matrix page: pivot table from `employee_skills` join
2. Manager scorecard: avg review score from `performance_reviews` + team attendance %
