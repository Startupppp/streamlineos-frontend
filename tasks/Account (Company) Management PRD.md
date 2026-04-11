**\*\*PRODUCT REQUIREMENTS DOCUMENT\*\***

**Account (Company) Management**

**\*\*Project:\*\* Vaivamm Capital CRM**  
**\*\*Version:\*\* 1.0**  
**\*\*Date:\*\* April 11, 2026**  
**\*\*Author:\*\* Tarun (Product Owner)**  
**\*\*Status:\*\* Draft**

**\# 1\. Overview & Objective**  
**Manage B2B relationships by grouping contacts and deals under corporate entities (Accounts), giving an aggregated view of account health.**

**\# 2\. Current Flow Analysis**  
**Deal-centric approach obscures how many different deals are running with the same corporate client.**

**\# 3\. Proposed Enhanced Flow**  
**Company profiles aggregate all associated contacts, deals, and notes. Added support for Parent/Child organizational hierarchies.**

**\# 4\. Feature Specifications**  
**\- Corporate entity tracking (Revenue, Industry).**  
**\- Parent-subsidiary nesting.**  
**\- Aggregated financial view of Account.**

**\# 5\. Database Schema Changes**  
**\`accounts\` table (\`parent\_id\` for hierarchy mapping).**

**\# 6\. API Endpoints**  
**\- \`GET /api/accounts/:id/hierarchy\`**  
**\- \`GET /api/accounts/:id/roll-up\`**

**\# 7\. UI/UX Wireframe Descriptions**  
**Account detail page showing cards for "Total Revenue Generated", "Open Deals", and a hierarchical tree visualization for parent/child branches.**

**\# 8\. Roles & Permissions**  
**Account Managers have prime edit privileges; global read access.**

**\# 9\. Edge Cases & Error Handling**  
**Circular dependencies in parent/child mapping must be rejected strictly at the DB query level.**

**\# 10\. Technical Implementation Notes**  
**Use recursive CTEs in PostgreSQL to fetch full hierarchical trees efficiently.**

**\# 11\. Success Metrics**  
**\- 100% of deals connected to an Account.**

**\# 12\. Timeline & Milestones**  
**Backend recursive query setup: 4 days. UI Hierarchy Tree: 1 week. Total \~1.5 weeks.**


---

## Status: IN PROGRESS

## Checklist

### Backend
- [x] `crm_companies` table exists in DB schema with org scoping
- [x] `app/api/crm/accounts/route.ts` — CRUD endpoint exists
- [ ] `parent_id` column on accounts for parent/subsidiary hierarchy
- [ ] `GET /api/accounts/:id/hierarchy` — recursive CTE query for full tree
- [ ] `GET /api/accounts/:id/roll-up` — aggregated revenue/deals from child accounts
- [ ] Circular parent reference guard at DB/API level
- [ ] Composite index on `(orgId, parentId)` for hierarchy queries

### Frontend
- [x] `app/(dashboard)/crm/organizations/page.tsx` — organizations list page exists
- [ ] Parent/child tree visualization component (use `react-organizational-chart` or D3)
- [ ] Account detail page with: Total Revenue Generated, Open Deals, child accounts cards
- [ ] Breadcrumb showing hierarchy path (Parent → Child → Grand-child)
- [ ] "Link Parent Account" selector with circular-dependency validation

### Integration
- [ ] All deals linked to an account (account picker on deal create/edit form)
- [ ] Contact cards inside account profile show all linked contacts
- [ ] 100% of deals connected to an Account metric on dashboard

### Verification
- [ ] Circular dependency rejected at API — tested with unit test
- [ ] `pnpm build` passes
- [ ] `pnpm lint` passes

---

## Implementation Plan

### Phase 1 — DB & API (4 days)
1. Add `parentId` FK to `crm_companies` table — new migration `drizzle/0026_account_hierarchy.sql`
2. Write `server/queries/crm-accounts.ts`:
   - `getAccountHierarchy(orgId, accountId)` — recursive CTE (`WITH RECURSIVE`)
   - `getAccountRollup(orgId, accountId)` — aggregate deals + revenue from self + all descendants
3. Add circular reference guard: before saving `parentId`, walk the chain upward; if `accountId` appears → 400 error
4. Add routes: `GET /api/crm/accounts/[accountId]/hierarchy` and `/roll-up`

### Phase 2 — Account Detail UI (3 days)
1. Create `app/(dashboard)/crm/accounts/[accountId]/page.tsx`
2. Stat cards: Total Revenue, Open Deals count, Contacts count
3. Hierarchy tree: Use `react-organizational-chart` — render read-only tree from API
4. Child accounts table: Name, Revenue, Open Deals columns

### Phase 3 — Deal & Contact Linking (3 days)
1. Add `accountId` picker to deal create/edit form
2. Add `accountId` picker to contact create/edit form  
3. Accounts list page: Add search + filter by industry/revenue tier

### Phase 4 — QA (1 day)
1. Test circular-parent rejection
2. Test rollup aggregation with nested hierarchy
3. Confirm `pnpm build` clean
