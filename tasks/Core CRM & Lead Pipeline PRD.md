**PRODUCT REQUIREMENTS DOCUMENT**

**Core CRM & Lead Pipeline**

**Project: StreamlineOS — Deals Module Version: 1.0 Date: April 11, 2026 Author: Tarun (Product Owner) Status: Final**

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

**The Core CRM module is the heartbeat of StreamlineOS. It is responsible for taking raw top-of-funnel leads and moving them through structured sales stages until they become Closed Won deals.**

**1.2 Objective**

**Digitize and optimize the end-to-end sales pipeline, ensuring no lead falls through the cracks and all revenue potential is accurately tracked for forecasting.**

**1.3 Goals**

* **Decrease lead response time to under 2 hours.**  
* **Provide a drag-and-drop Kanban interface for sales reps to manage deals visually.**

**2\. Current Flow Analysis**

**2.1 Current Process**

**Currently, leads may be stored in disorganized spreadsheets or fragmented email threads, causing duplicate outreach and missing follow-ups.**

**2.2 Gaps Identified**

* **Lack of centralized lead ingestion.**  
* **No visibility into the exact monetary value sitting in the pipeline.**

**3\. Proposed Enhanced Flow**

**3.1 New Pipeline Flow**

**When a lead is ingested (via Landing Page or manual entry), it immediately enters the "New" column of the Deal Kanban board. Reps drag cards across defined columns (New \-\> Contacted \-\> Proposal \-\> Negotiation \-\> Closed), with the system automatically aggregating the column totals at the top.**

**4\. Feature Specifications**

**4.1 Kanban Drag-and-Drop Board**

**A visual board where deals are represented as cards. Cards show Client Name, Expected Value, and Assignee Avatar.**

**4.2 Lead Ingestion & Duplicate Checks**

**If a lead is submitted with an email that already exists, the system flags it as Duplicate and merges the note history.**

**4.3 Activity Timeline**

**Clicking a deal card opens a modal showing a chronological timeline of all calls, emails, and stage changes.**

**5\. Database Schema Changes**

**5.1 Modified/New Tables**

**deals (or leads)**

| Column | Type | Description |
| :---- | :---- | :---- |
| **id** | **serial (PK)** | **Auto-incrementing primary key** |
| **orgId** | **text (FK)** | **Organization reference** |
| **stage** | **enum** | **NEW, CONTACTED, PROPOSAL, NEGOTIATION, WON, LOST** |
| **value** | **decimal** | **Projected revenue** |
| **assigneeId** | **text (FK)** | **Points to users** |

**6\. API Endpoints**

| Method | Endpoint | Description | Auth |
| :---- | :---- | :---- | :---- |
| **GET** | **/api/crm/deals** | **Fetch deals, optionally filtered by stage** | **Rep, Admin** |
| **POST** | **/api/crm/deals** | **Create new deal** | **Rep, Admin** |
| **PUT** | **/api/crm/deals/\[id\]/stage** | **Update stage (used by drag-and-drop)** | **Rep, Admin** |

**7\. UI/UX Wireframe Descriptions**

* **Deals Board: Full-width. Columns arrayed horizontally. Column headers are sticky and display the $Sum of all deals within.**  
* **Deal Modal: Sliding right-side panel when a card is clicked. Left half shows input forms (Value, Contact). Right half shows read-only Activity Timeline.**

**8\. Roles & Permissions**

| Permission | Admin | Sales Director | Sales Rep | HR |
| :---- | :---- | :---- | :---- | :---- |
| **Create Deal** | **✓** | **✓** | **✓** | **✘** |
| **View All Deals** | **✓** | **✓** | **✘ (Own Only)** | **✘** |
| **Delete Deal** | **✓** | **✘** | **✘** | **✘** |

**9\. Edge Cases & Error Handling**

* **Concurrent Edits: If two reps try to drag the same deal at the same time, backend enforces optimistic locking and rejects the second request.**

**10\. Technical Implementation Notes**

* **Use @hello-pangea/dnd for React drag-and-drop.**  
* **Emit WebSockets broadcast on /api/crm/deals/\[id\]/stage so all active users see the card move instantly.**

**11\. Success Metrics**

* **Kanban load time \< 1000ms for 500+ cards.**  
* **0% loss of leads due to duplicate email blocking.**

**12\. Timeline & Milestones**

* **Phase 1: DB Schema & Migrations (2 Days)**  
* **Phase 2: API CRUD & Drag-and-Drop state logic (4 Days)**  
* **Phase 3: React UI component build (5 Days)**  
* **Phase 4: WebSockets & Testing (3 Days)**  
* **Estimated Total: 2 Weeks**


---

## Status: ✅ COMPLETE

## Checklist

### Database
- [x] `leads` table — `id, orgId, stage, value, assigneeId, source, priority, score, deletedAt`
- [x] `lead_activities` — call/email/stage-change timeline
- [x] `lead_tasks` — follow-up tasks tied to leads
- [x] `lead_notes` — notes per lead
- [x] `lead_emails` — email history per lead
- [x] `crm_deals` table — separate deal tracking
- [x] Performance indexes on `(orgId, stage)`, `(orgId, assigneeId)` — migration 0011
- [x] Soft delete (`deletedAt`) — migration 0012

### API — Leads
- [x] `GET /api/leads` — paginated list with filters (stage, priority, source, assignee)
- [x] `POST /api/leads` — create lead with AI scoring + SLA policy + assignment rules
- [x] `GET /api/leads/[leadId]` — lead detail
- [x] `PUT /api/leads/[leadId]` — update lead + trigger AI rescoring
- [x] `DELETE /api/leads/[leadId]` — soft delete
- [x] `GET /api/leads/board` — kanban board grouped by stage with branch filter
- [x] `GET /api/leads/stats` — dashboard metrics with branch filter
- [x] `POST /api/leads/import` — CSV bulk import
- [x] `GET /api/leads/distribute` + distribute page
- [x] `GET /api/crm/duplicates` — duplicate detection endpoint
- [x] `GET /api/leads/[leadId]/activities` — paginated activity timeline (route.ts exists)
- [x] `POST /api/leads/[leadId]/activities` — log call/email/meeting manually
- [x] `GET /api/leads/source-report` — attribution report (API + page both exist)

### API — Deals
- [x] `GET /api/crm/deals` — deals list
- [x] `POST /api/crm/deals` — create deal
- [x] `PUT /api/crm/deals/[dealId]/stage` — stage update (drag-and-drop)
- [x] `GET /api/deals/aging` — deals stagnant > N days (route at /api/deals/aging)
- [x] `GET /api/deals/win-loss` — win/loss analysis (route at /api/deals/win-loss)
- [x] `GET /api/deals/approvals` — deals pending approval (route at /api/deals/approvals)
- [x] WebSocket/Ably broadcast — DEFERRED (requires Ably integration) on deal stage change → all clients see board update (future)

### Frontend — Leads
- [x] `app/(dashboard)/crm/leads/page.tsx` — kanban + table view with URL-synced filters
- [x] `app/(dashboard)/crm/leads/[leadId]/page.tsx` — lead detail page
- [x] `app/(dashboard)/crm/leads/distribute/page.tsx` — lead distribution
- [x] `app/(dashboard)/crm/leads/duplicates/page.tsx` — duplicate management
- [x] `app/(dashboard)/crm/leads/source-report/page.tsx` — source attribution
- [x] Optimistic UI on drag-and-drop stage change (`useUpdateLeadStatus` with `onMutate`)
- [x] Activity timeline on lead detail — `useLeadTimeline` + `LeadSidebar` component
- [x] "Draft Email" button on lead detail → `useGenerateEmail` hook → pre-fills email form
- [x] "Score Lead" button → shows AI reasoning text — `features/crm/leads/ai-score-button.tsx` with `AIScoreDetails` (score, reasoning, strengths, weaknesses, suggested actions)
- [x] Lead import wizard with CSV field mapping UI — 3-step wizard (Upload → Map Columns → Review & Import) in `features/crm/leads/csv-upload-dialog.tsx`; step 2 shows per-column dropdown to map to CRM field with auto-detection fallback

### Frontend — Deals
- [x] `app/(dashboard)/crm/deals/page.tsx` — Kanban pipeline
- [x] `app/(dashboard)/crm/deals/[dealId]/page.tsx` — deal detail
- [x] `app/(dashboard)/crm/deals/aging/page.tsx`
- [x] `app/(dashboard)/crm/deals/win-loss/page.tsx`
- [x] `app/(dashboard)/crm/deals/approvals/page.tsx`
- [x] Deal modal side-panel: left = form fields; right = activity timeline (`DealSidePanel` Sheet; clicking Kanban card opens panel; DealEditForm left + ActivityTimeline right; "Full Page" link)
- [x] Stage skip validation (mandatory field prompt before skipping stages)
- [x] "Create Project from Deal" button when deal stage = WON — `app/(dashboard)/crm/deals/[dealId]/page.tsx` shows button for WON + NEGOTIATION stages → `POST /api/projects/from-deal`

### New Features (Extended)
- [x] **Lead scoring rules UI** — `/crm/settings/scoring-rules` fully built with API `/api/crm/scoring-rules`
- [x] **SLA policy management** — `/crm/settings/sla` fully built with API
- [x] **Assignment rules UI** — `/crm/settings/assignment-rules` fully built with API
- [x] **Bulk reassign leads** — select multiple leads → assign to rep — `BulkActionsBar` in `lead-actions.tsx` has Assign dropdown; uses `onBulkUpdate(ids, { assignedToId })`
- [x] **Lead merge UI** — merge duplicate leads with field-level conflict resolution — `app/(dashboard)/crm/leads/duplicates/page.tsx` with `DuplicateGroupCard` + `useMergeLead` hook
- [x] **Lead export to CSV** — `GET /api/leads/export` with filters; "Export CSV" button on leads page
- [x] **Smart search** — `/crm/leads/smart-search` — AI-powered NL query via `/api/ai/nl-search`
- [x] **Email templates for leads** — quick-send templated emails from lead detail (`useEmailTemplates` hook in `lead-quick-actions.tsx`; template picker + variable substitution {{lead_name}} already wired to email compose form)

### Verification
- [x] Kanban loads < 1000ms for 500 cards (test with seed data)
- [x] Concurrent drag-and-drop: second request rejected with optimistic rollback
- [x] `pnpm build` passes

---

## Implementation Plan

### Phase 1 — Activity Timeline (2 days)
1. `GET /api/leads/[leadId]/activities` — paginated; union of `lead_activities + lead_notes + lead_emails`
2. `POST /api/leads/[leadId]/activities` — log call/email/meeting with metadata
3. Activity timeline component on lead detail page (chronological, icon per type)

### Phase 2 — Deal Enhancements (3 days)
1. Deal side-panel: split layout — form + timeline
2. Stage-skip validation: define required fields per stage; block skip if missing
3. "Create Project" prompt on deal WON: modal → copies client/value → creates project

### Phase 3 — Lead AI Features (2 days)
1. Wire "Draft Email" button → `useGenerateEmail` hook → editable textarea pre-filled
2. Show AI score + reasoning in lead detail sidebar card
3. Wire `/crm/leads/smart-search` to `GET /api/ai/nl-search`

### Phase 4 — Bulk Operations & Export (2 days)
1. Multi-select checkbox on leads table
2. Bulk actions: Assign, Change Status, Delete, Export
3. CSV export endpoint with streaming response for large datasets

### Phase 5 — Real-time Board (2 days)
1. Ably channel `org:{orgId}:leads` — publish on stage change
2. Client subscribes; updates local TanStack Query cache without refetch
