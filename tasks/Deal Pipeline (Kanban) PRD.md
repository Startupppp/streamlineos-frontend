**\*\*PRODUCT REQUIREMENTS DOCUMENT\*\***

Deal Pipeline (Kanban)

**\*\*Project:\*\*** Vaivamm Capital CRM  
**\*\*Version:\*\*** 1.0  
**\*\*Date:\*\*** April 11, 2026  
**\*\*Author:\*\*** Tarun (Product Owner)  
**\*\*Status:\*\*** Draft

**\# 1\. Overview & Objective**  
A visual board to track financial opportunities as they move through the sales stages, providing clarity on revenue forecasting.

**\# 2\. Current Flow Analysis**  
List-based deal views make it difficult to visualize bottlenecks or total pipeline value at a glance.

**\# 3\. Proposed Enhanced Flow**  
A Kanban board with drag-and-drop functionality. Moving cards updates the deal stage automatically and calculates the weighted value.

**\# 4\. Feature Specifications**  
\- Customizable columns (stages).  
\- Drag-and-drop interface.  
\- Deal cards showing value, expected close date, and assigned rep.

**\# 5\. Database Schema Changes**  
\`deal\_stages\` table (Customizable stages per org).  
\`deals\` table (Weighted probability calculation).

**\# 6\. API Endpoints**  
\- \`PATCH /api/deals/:id/stage\`  
\- \`GET /api/pipeline\` (Grouped by stage)

**\# 7\. UI/UX Wireframe Descriptions**  
Horizontal scrolling board. Each column header displays total $ value. Cards are color-coded based on health (e.g., slipping close dates turn amber).

**\# 8\. Roles & Permissions**  
Sales Reps: Move assigned deals.  
Sales Director: Edit pipeline stages globally.

**\# 9\. Edge Cases & Error Handling**  
Skipping critical stages (e.g., from Discovery to Won) triggers a prompt requiring mandatory fields (like contract upload).

**\# 10\. Technical Implementation Notes**  
Use \`dnd-kit\` for React drag-and-drop. Optimistic UI updates on card drop.

**\# 11\. Success Metrics**  
\- 100% of reps utilizing the board daily.  
\- 0 deals remaining stagnant without system alerts.

**\# 12\. Timeline & Milestones**  
API updates: 3 days. UI components and Drag/Drop: 1 week. Total \~1.5 weeks.


---

## Status: SUBSTANTIALLY COMPLETE

## Checklist

### Database
- [x] `crm_deals` table — `id, orgId, stage, value, expectedCloseDate, assigneeId, probability`
- [x] `deal_activities` — activity log per deal
- [x] `deal_approvals` — approval workflow table
- [x] `deal_meetings` — linked meetings
- [ ] `deal_stages` table — customizable stages per org (currently enum-based)
- [ ] `deals.stageChangedAt` — timestamp for funnel reporting
- [ ] `deals.healthStatus` — computed: HEALTHY / AT_RISK / STALE (based on close date proximity)
- [ ] Index on `expectedCloseDate` for time-based dashboard queries

### API
- [x] `GET /api/crm/deals` — deals list
- [x] `POST /api/crm/deals` — create deal
- [x] `PATCH /api/crm/deals/[dealId]/stage` — stage update (drag-and-drop)
- [x] `GET /api/crm/deals/aging` — stagnant deals report
- [x] `GET /api/crm/deals/win-loss` — win/loss analysis
- [x] `GET /api/crm/deals/approvals` — approval queue
- [ ] `GET /api/deals/pipeline` — grouped by stage with column $totals + weighted values
- [ ] `POST /api/crm/deals/[dealId]/approve` — approve/reject deal
- [ ] Stage skip validation endpoint — checks required fields before allowing stage jump
- [ ] Ably/WebSocket publish on stage change for real-time board updates

### Frontend
- [x] `app/(dashboard)/crm/deals/page.tsx` — Kanban pipeline with DnD
- [x] `app/(dashboard)/crm/deals/[dealId]/page.tsx` — deal detail
- [x] `app/(dashboard)/crm/deals/aging/page.tsx` — aging report
- [x] `app/(dashboard)/crm/deals/win-loss/page.tsx` — win/loss analysis
- [x] `app/(dashboard)/crm/deals/approvals/page.tsx` — approvals queue
- [ ] Column header $-totals — sum of deal values per stage displayed at top
- [ ] Color-coded health indicators on cards (green/amber/red by close date proximity)
- [ ] Stage-skip prompt modal — lists missing required fields before skipping
- [ ] Deal card quick actions: Edit value, Change assignee, Log call — on hover
- [ ] "Won" confetti animation when deal is moved to WON stage
- [ ] Column value toggle: show deal count vs total value
- [ ] Deal filters: by rep, by value range, by close date range, by tag
- [ ] Collapse/expand columns to declutter board

### New Features (Extended)
- [ ] **Custom pipeline stages** — Admin can add/rename/reorder stages in settings
- [ ] **Stage probability** — each stage has a win probability %; weighted pipeline value = value × probability
- [ ] **Deal forecasting widget** — expected revenue this month from open deals × probability
- [ ] **Deal templates** — pre-fill common deal structures (e.g., Standard Retainer)
- [ ] **Deal tags** — colour tags for categorization
- [ ] **AI deal prediction** — "Predict Deal" button calls `/api/ai/predict-deal` → shows win probability + recommendation
- [ ] **Deal cloning** — duplicate a deal to quickly create similar opportunity
- [ ] **Deal linking** — link multiple contacts to one deal
- [ ] **Product/service line items** — add line items to a deal with quantity × price
- [ ] **Deal PDF proposal generator** — generate proposal PDF from deal data

### Verification
- [ ] Drag-and-drop stage change: optimistic update + server confirm
- [ ] Concurrent drag test: second write rejected, board reverts
- [ ] `pnpm build` passes

---

## Implementation Plan

### Phase 1 — Custom Stages & DB (3 days)
1. `deal_stages` table: `id, orgId, name, probability, order, color, isDefault`
2. Migration to convert current enum stages → FK to `deal_stages`
3. Settings page: `/crm/settings/stages` — CRUD for pipeline stages
4. Add `stageChangedAt`, `healthStatus` columns

### Phase 2 — Board Enhancements (3 days)
1. Column $-total aggregation in `/api/deals/pipeline` response
2. Health badge computed client-side: red if `expectedCloseDate < today`, amber if `< today + 7d`
3. Stage-skip modal: define required fields per stage in `deal_stages.requiredFields JSON`
4. Real-time board via Ably `org:{orgId}:deals` channel

### Phase 3 — New Deal Features (4 days)
1. Deal line items table + UI (quantity × price = subtotal)
2. AI Deal Prediction: button → `/api/ai/predict-deal` → confidence score card
3. Deal PDF proposal: `puppeteer` or `jspdf` render template → download
4. Deal cloning endpoint + button

### Phase 4 — Forecasting (2 days)
1. Weighted pipeline value: sum(value × probability / 100) per month
2. Forecast widget on Sales Dashboard showing expected vs quota
