**\*\*PRODUCT REQUIREMENTS DOCUMENT\*\***

**Employee Directory & Profiles**

**\*\*Project:\*\* Vaivamm Capital CRM**  
**\*\*Version:\*\* 1.0**  
**\*\*Date:\*\* April 11, 2026**  
**\*\*Author:\*\* Tarun (Product Owner)**  
**\*\*Status:\*\* Draft**

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

## Status: SUBSTANTIALLY COMPLETE

## Checklist

### Database
- [x] `users` table — `departmentId, managerId, title, phone, avatar`
- [x] `employee_skills` linking table — `userId, skillId`
- [x] `departments` table — `id, orgId, name`
- [ ] `employee_skills` — ensure `skill` text column (not just FK) for free-form tags
- [ ] `users.bio` — short profile bio text
- [ ] `users.linkedInUrl`, `githubUrl`, `twitterUrl` — social links on profile
- [ ] `users.pronouns` — optional display preference

### API
- [x] `GET /api/hr/employees` — paginated directory with branch filter
- [x] `GET /api/hr/employees/[employeeId]` — full employee profile
- [ ] `GET /api/hr/directory` — lightweight public-facing roster (name, title, dept, avatar only)
- [ ] `GET /api/hr/employees/org-chart` — hierarchical tree for org chart rendering
- [ ] `GET /api/hr/employees/search?q=&skill=&department=` — combined search/filter
- [ ] `PATCH /api/hr/employees/[employeeId]/skills` — employee updates own skills
- [ ] `PATCH /api/hr/employees/[employeeId]/profile` — employee updates bio/social/pronouns
- [ ] Circular management guard: prevent A → B → A cycles in `managerId` chain

### Frontend
- [x] `app/(dashboard)/hr/employees/page.tsx` — employees list/grid
- [x] `app/(dashboard)/hr/employees/[employeeId]/page.tsx` — employee detail
- [x] `app/(dashboard)/hr/org-chart/page.tsx` — org chart page
- [ ] Directory grid: face-card tiles with avatar, name, title, department
- [ ] Toggle between grid view and list view
- [ ] Filter: by department, by location, by skill tag, by direct reports only
- [ ] Org chart: rendered with `react-organizational-chart` or `d3-org-chart`; zoom + pan
- [ ] Public profile tab (name, title, skills, bio, social links) vs Private HR tab (salary, warnings, docs)
- [ ] Employee self-edit: update bio, profile photo, skills, social links
- [ ] Skills tagging: autocomplete from existing skills + create new
- [ ] "Who reports to me" section on manager profiles
- [ ] Download employee profile as PDF (for HR records)

### New Features (Extended)
- [ ] **Skills matrix view** — table: employees × skills; shows who has what across the org
- [ ] **Availability indicator** — green/yellow/red dot based on current leave status
- [ ] **"Find expert"** — search by skill across the org to find who can help with a task
- [ ] **Employee anniversary/birthday feed** — upcoming milestones in the next 30 days
- [ ] **Manager scorecard** — avg team performance, team attendance rate (visible to HR/CEO)
- [ ] **Profile completeness indicator** — nudge employees to fill missing fields (bio, skills, etc.)
- [ ] **Team page** — /hr/teams/[teamId] — shows all members of a department/team

### Verification
- [ ] Circular managerId guard tested — A→B→A rejected
- [ ] Org chart renders without infinite loop for 100+ node tree
- [ ] Directory search < 500ms
- [ ] `pnpm build` passes

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
