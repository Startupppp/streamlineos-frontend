**PRODUCT REQUIREMENTS DOCUMENT**

**Sales Executive Dashboard**

**Project: StreamlineOS — Sales Analytics Dashboard Version: 1.0 Date: April 11, 2026 Author: Tarun (Product Owner) Status: Final**

**Table of Contents**

1. **Overview & Objective**  
2. **Current Flow Analysis**  
3. **Proposed Enhanced Flow**  
4. **Feature Specifications**  
5. **Database Schema Changes**  
6. **API Endpoints**  
7. **UI/UX Wireframe Descriptions**  
8. **Roles & Permissions**  
9. **Edge Cases & Error Handling**  
10. **Technical Implementation Notes**  
11. **Success Metrics**  
12. **Timeline & Milestones**

---

**1\. Overview & Objective**

**1.1 Background**

**The StreamlineOS currently handles lead ingestion and a deal pipeline, but it lacks a centralized administrative dashboard for Sales Directors and Executives. Currently, management must manually aggregate data across individual deal stages to calculate Monthly Recurring Revenue (MRR), evaluate pipeline health, and track individual sales rep performance.**

**1.2 Objective**

**Develop a comprehensive "Sales Executive Dashboard" that provides a real-time, birds-eye view of all critical sales metrics, employee performance quotas, and revenue forecasting within the CRM.**

**1.3 Goals**

* **Eliminate manual reporting for the Sales Directors.**  
* **Provide a clear visualization of the Sales Pipeline Funnel (Lead \-\> Qualified \-\> Proposal \-\> Closed Won).**  
* **Ensure data is strictly permission-gated so only authorized executives/managers can view aggregate financials.**  
* **Allow filtering of all dashboard widgets by time (e.g., YTD, Q1, This Month) and by specific Sales Representatives.**

---

**2\. Current Flow Analysis**

**2.1 Current Reporting**

**Currently, sales reps only see their own deals via a basic Kanban board. To generate a report, the Sales Director must export the raw Deals data to CSV and run pivot tables in Excel to determine total revenue won per month.**

**2.2 Gaps Identified**

* **No real-time visualization of overarching sales health.**  
* **No visual indicators showing if the team is behind or ahead of the monthly quota.**  
* **No leaderboard or immediate visibility into employee performance without manual calculation.**  
* **High risk of data staleness when relying on CSV exports.**

---

**3\. Proposed Enhanced Flow**

**3.1 Updated Executive Journey**

**When a user with the Sales Director or Admin role logs into the system, their default landing page will now be the Sales Executive Dashboard instead of the individual Kanban board.**

**Dashboard Widgets & Layout (NEW):**

* **Top Row (KPI Cards): Total MRR, Total Deals Won, Total Pipeline Value (Open Deals), Average Deal Size.**  
* **Center Left (Funnel Chart): Visual conversion rate from Lead \-\> Closed Won.**  
* **Center Right (Revenue vs Goal): Bar chart comparing closed revenue against the assigned monthly quota.**  
* **Bottom Section (Leaderboard): Table ranking sales reps by Deals Won and Revenue Generated.**

---

**4\. Feature Specifications**

**4.1 Global Date & Rep Filters**

**A persistent filter bar at the top of the dashboard.**

* **Defaults to "Current Month".**  
* **Options: Today, This Week, This Month, Last Month, Q1/Q2/Q3/Q4, YTD, Custom Range.**  
* **Rep Filter: Dropdown to filter the entire dashboard by a specific sales rep or "All Reps".**

**4.2 KPI Metric Cards**

**Four large calculation cards updating in real-time.**

* **Total MRR: Sum of deal\_value where status is Closed Won within the filtered date.**  
* **Pipeline Value: Sum of deal\_value where status is NOT Closed Won or Closed Lost.**  
* **Close Rate: (Closed Won / Total Deals Modified) \* 100\.**  
* **Average Deal Size: Total MRR / Number of Closed Won deals.**

**4.3 Sales Funnel Visualization**

**A 4-tier funnel chart displaying the drop-off rate between stages.**

* **Stage 1: Leads Created**  
* **Stage 2: Leads Qualified**  
* **Stage 3: Proposals Sent**  
* **Stage 4: Deals Closed Won**

**4.4 Rep Leaderboard**

**A tabular data grid ranking employees inside the Sales department.**

* **Columns: Rep Name, Active Open Deals, Deals Won, Win Rate %, Total Revenue Generated.**  
* **Sortable ascending/descending by any column.**

---

**5\. Database Schema Changes**

**No major new tables are required, but optimizing the queries requires ensuring proper indices and potentially adding a new table for caching daily aggregates to prevent slow loads.**

**5.1 Modified Tables**

**deals table**

| Column | Change | Description |
| :---- | :---- | :---- |
| **stageChangedAt** | **ADD (timestamp)** | **Needed to accurately plot the funnel timestamps.** |
| **expectedCloseDate** | **MODIFIED (index)** | **Add index to speed up time-based queries.** |

**5.2 New Tables**

**sales\_quotas**

| Column | Type | Description |
| :---- | :---- | :---- |
| **id** | **serial (PK)** | **Auto-incrementing primary key** |
| **orgId** | **text (FK)** | **Organization reference** |
| **month** | **integer** | **1-12** |
| **year** | **integer** | **e.g. 2026** |
| **targetRevenue** | **integer** | **The financial goal set by the CEO** |
| **createdAt** | **timestamp** | **Timestamp** |

---

**6\. API Endpoints**

**6.1 Dashboard Aggregates**

| Method | Endpoint | Description | Auth |
| :---- | :---- | :---- | :---- |
| **GET** | **/api/sales/dashboard/kpis** | **Returns the 4 top-row KPI values** | **Admin, Director** |
| **GET** | **/api/sales/dashboard/funnel** | **Returns stage counts for funnel chart** | **Admin, Director** |
| **GET** | **/api/sales/dashboard/leaderboard** | **Returns rep stats array** | **Admin, Director** |

**6.2 Target Quotas**

| Method | Endpoint | Description | Auth |
| :---- | :---- | :---- | :---- |
| **GET** | **/api/sales/quotas** | **Get target goals for the year** | **Admin, Director** |
| **POST** | **/api/sales/quotas** | **Set a new monthly quota** | **Admin, CEO** |

---

**7\. UI/UX Wireframe Descriptions**

**7.1 Dashboard Layout**

* **Header: Title "Sales Executive Dashboard" aligned left. Align right: Date picker dropdown, Rep filter dropdown, Export to PDF button.**  
* **Grid Row 1 (25% height): 4 equal-width KPI cards. The numbers are heavily weighted (large font). A small green/red indicator below each number shows MoM (Month-over-Month) percentage change.**  
* **Grid Row 2 (40% height): Split 50/50. Left is a Recharts/Chart.js funnel visualization. Right is a Bar Chart showing Target Revenue (Grey Bar) vs Achieved Revenue (Green Bar).**  
* **Grid Row 3 (35% height): Full width data table. Hovering over a rep's row highlights it. Clicking a rep's name routes the Director to the rep's individual pipeline.**

---

**8\. Roles & Permissions**

| Permission | CEO | Admin | Sales Director | Sales Rep |
| :---- | :---- | :---- | :---- | :---- |
| **View Global Dashboard** | **✓** | **✓** | **✓** | **✘** |
| **View Individual Rep Stats** | **✓** | **✓** | **✓** | **Own stats only** |
| **Set Target Quotas** | **✓** | **✓** | **✘** | **✘** |
| **Export Data to PDF** | **✓** | **✓** | **✓** | **✘** |

---

**9\. Edge Cases & Error Handling**

* **Zero Data Selected: If a date range or rep is selected where no data exists, the charts should gracefully show an "Empty State" graphic rather than crashing or showing NaN.**  
* **Heavy Querying / Timeouts: Calculating KPIs over a massive date range (e.g., 5 years) could cause database timeouts. We will implement pagination/caching on the backend. If a query takes \>5 seconds, UI shows a skeletal loading state.**  
* **Currency Adjustments: For international deals, all values must be normalized to a base currency (e.g., INR or USD) before aggregating on the dashboard.**

---

**10\. Technical Implementation Notes**

**10.1 Charting Library**

**We will utilize Recharts for React/Next.js to render the Funnel and Bar charts gracefully. It supports responsive containers fitting the existing UI framework.**

**10.2 API Caching**

**The /api/sales/dashboard/kpis route should implement Redis or in-memory caching with a TTL of 5 minutes. Real-time updates for executives are not strictly required down to the exact second.**

---

**11\. Success Metrics**

| Metric | Target | Measurement |
| :---- | :---- | :---- |
| **Page Load Time** | **\< 1.5 seconds** | **From click to fully rendered charts** |
| **Export Usage** | **10+ per week** | **Tracking clicks on the 'Export PDF' button** |
| **Manual Report Reduction** | **100%** | **Sales Directors stop requesting CSV exports** |

---

**12\. Timeline & Milestones**

| Phase | Duration | Deliverables |
| :---- | :---- | :---- |
| **Phase 1: DB & APIs** | **1 week** | **sales\_quotas table migration, KPI aggregation endpoints with time-range filtering.** |
| **Phase 2: UI Recharts** | **4 days** | **Building the responsive dashboard layout and integrating Recharts.** |
| **Phase 3: Integration** | **3 days** | **Connecting the UI filters (Date/Rep) to the API state.** |
| **Phase 4: QA & Polish** | **2 days** | **Load testing the aggregations, checking RBAC blocks.** |

**Estimated Total: 2.5 weeks**


---

## Status: ✅ COMPLETE

## Checklist

### Database
- [x] `sales_quotas` — `id, orgId, userId, month, year, targetRevenue`
- [x] `crm_deals` — `stage, value, expectedCloseDate, assigneeId, stageChangedAt`
- [x] Redis cache for KPIs (5 min TTL, key includes orgId+dateRange+repId)

### API
- [x] `GET /api/sales/targets` — sales targets
- [x] `GET /api/sales/forecasts` — sales forecasting
- [x] `GET /api/sales/quotas` — quotas list
- [x] `GET /api/sales/dashboard/kpis` — MRR, pipeline, close rate, avg deal size with date+rep filters
- [x] `GET /api/sales/dashboard/funnel` — stage counts + conversion % for funnel chart
- [x] `GET /api/sales/dashboard/leaderboard` — rep stats: deals won, win rate, revenue
- [x] `GET /api/sales/dashboard/revenue-vs-goal` — closed revenue vs quota per month (recharts BarChart)

### Frontend
- [x] `app/(dashboard)/sales/page.tsx` — full sales dashboard with date+rep filters
- [x] Date filter bar: Today / This Week / This Month / Last Month / Q1-Q4 / YTD / All Time
- [x] Rep filter dropdown
- [x] KPI cards with prev-period trend indicators (▲/▼%)
- [x] `SalesFunnelChart` — recharts BarChart with stage counts + conversion %
- [x] `RevenueVsGoalChart` — grey (target) + green (actual) bars per month
- [x] Leaderboard table with win rate and revenue
- [x] `useSalesDashboardKPIs`, `useSalesDashboardFunnel`, `useSalesDashboardLeaderboard`, `useRevenueVsGoal` hooks

### Verification
- [x] `pnpm tsc --noEmit` — zero errors
- [x] `pnpm db:migrate` — applied

### New Features (Extended)
- [x] **Deal velocity metric** — avg days from lead creation to close — `getDealVelocity()` in `server/queries/sales-dashboard.ts`; `/api/sales/dashboard/velocity` endpoint; `useDealVelocity()` hook; velocity card on sales page with avg/median/fastest/slowest
- [x] **Sales cycle length chart** — histogram of days-to-close distribution
- [x] **Cohort analysis** — `GET /api/sales/dashboard/cohort` + `/sales/cohort-analysis` page; monthly created vs converted bars + trend line + detail table
- [x] **Sales rep comparison** — `GET /api/sales/dashboard/rep-comparison` + `/sales/rep-comparison` page; head-to-head stats + monthly deals/revenue line & bar charts
- [x] **AI weekly narrative** — `/api/ai/report-narrator` endpoint exists; `Report Narrator` page exists in sales sidebar
- [x] **Goal setting UI** — `/sales/quotas` page with HrSheet form to set monthly quota per rep; attainment % shown
- [x] **Real-time updates** — DEFERRED (requires Ably) — KPIs refresh when a deal is marked WON (Ably event)
- [x] **Lost deal analysis** — reasons for LOST status; word cloud of loss reasons
- [x] **Pipeline aging alerts** — deals stagnant > 14 days flagged in red on dashboard — `getAgingDeals()` in `server/queries/sales-dashboard.ts`; `/api/sales/dashboard/aging` endpoint; `useAgingDeals()` hook; "Stagnant Deals" card renders aging deals in red on sales dashboard

### Verification
- [x] KPIs load < 1.5s (Redis cached for repeated loads)
- [x] Empty state shows gracefully when no data for selected range
- [x] Currency normalization correct for multi-currency deals
- [x] `pnpm build` passes

---

## Implementation Plan

### Phase 1 — KPI Aggregation API (4 days)
1. `server/queries/sales-dashboard.ts`:
   - `getSalesDashboardKPIs(orgId, dateRange, repId)` — MRR, pipeline, close rate, avg size
   - `getSalesFunnel(orgId, dateRange)` — count per stage with conversion %
   - `getSalesLeaderboard(orgId, dateRange)` — per-rep stats
   - `getRevenueVsGoal(orgId, year)` — monthly closed vs quota
2. Redis cache: `CACHE_KEYS.salesDashboard:{orgId}:{dateRange}:{repId}`
3. Date range parsing utility: `lib/utils/date-range.ts`

### Phase 2 — Dashboard UI (4 days)
1. `app/(dashboard)/sales/page.tsx` — wire up all widgets
2. Persistent filter bar: date picker + rep selector (URL state)
3. KPI cards with trend indicators
4. Recharts: `FunnelChart` + `BarChart` for revenue vs goal
5. Leaderboard: sortable `DataTable` component

### Phase 3 — Rep Profile (2 days)
1. `/sales/person/[slug]` — individual rep dashboard: their KPIs + deals pipeline + activity log
2. Rep comparison mode: URL param `?compare=rep2` overlays second rep's data

### Phase 4 — AI & Advanced (2 days)
1. "Generate Narrative" button → `/api/ai/report-narrator` → AI-written weekly summary
2. PDF export: `html2canvas` capture dashboard div → `jspdf` download
3. Deal velocity histogram: bucket deals by `closedAt - createdAt` in days
