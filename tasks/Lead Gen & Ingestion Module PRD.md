**\*\*PRODUCT REQUIREMENTS DOCUMENT\*\***

Lead Gen & Ingestion Module

**\*\*Project:\*\*** Vaivamm Capital CRM  
**\*\*Version:\*\*** 1.0  
**\*\*Date:\*\*** April 11, 2026  
**\*\*Author:\*\*** Tarun (Product Owner)  
**\*\*Status:\*\*** Draft

**\# 1\. Overview & Objective**  
Capture top-of-funnel prospects, track source attribution, and efficiently ingest leads from multiple channels. The goal is to eliminate manual entry errors and ensure zero lead leakage.

**\# 2\. Current Flow Analysis**  
Currently, leads are often tracked in spreadsheets or require manual data entry upon receiving an email.

**\# 3\. Proposed Enhanced Flow**  
Automated webhooks and webform integrations will feed directly into the CRM. Duplicates are auto-merged based on email/phone.

**\# 4\. Feature Specifications**  
\- Auto-capture from Webforms and Landing pages.  
\- CSV Bulk Import with field mapping.  
\- Auto-assignment rules (e.g., Round Robin, Geographic).

**\# 5\. Database Schema Changes**  
\`leads\` table (Add \`source\`, \`campaign\_id\`, \`utm\_parameters\`)  
\`lead\_assignments\` table (Rule mapping)

**\# 6\. API Endpoints**  
\- \`POST /api/leads/ingest\` (External webhook)  
\- \`POST /api/leads/bulk-import\`  
\- \`GET /api/leads\` (With filtering)

**\# 7\. UI/UX Wireframe Descriptions**  
A kanban-like holding area or grid view. "New Leads" brightly flagged. Import wizard modal with drag-and-drop CSV capability.

**\# 8\. Roles & Permissions**  
\- Marketing: Create/Import Leads.  
\- SDRs: Read/Update assigned leads.  
\- Admin: Full access.

**\# 9\. Edge Cases & Error Handling**  
Duplicate incoming emails must append as a note to the existing lead rather than creating a new record.

**\# 10\. Technical Implementation Notes**  
Use serverless functions/queues (like BullMQ) for processing large CSV uploads to avoid blocking the main thread.

**\# 11\. Success Metrics**  
\- 100% of website forms mapping to CRM within 5 seconds.  
\- 50% reduction in duplicate records.

**\# 12\. Timeline & Milestones**  
Backend integration: 1 week; UI/Wizard: 1 week. Total \~2 weeks.


---

## Status: SUBSTANTIALLY COMPLETE

## Checklist

### Database
- [x] `leads` table — `source, priority, score, assigneeId, orgId, deletedAt`
- [x] `lead_assignment_rules` — auto-assignment configuration
- [x] `lead_scoring_rules` — rule-based scoring configuration
- [ ] `leads.campaignId` — FK to `crm_campaigns` for attribution
- [ ] `leads.utmParameters` — JSONB for UTM data
- [ ] `leads.importBatchId` — link bulk-imported leads to a batch
- [ ] `lead_import_batches` table — `id, orgId, filename, status, totalRows, imported, failed, errors`
- [ ] `lead_assignment_rule_logs` — log of which rule was applied to which lead

### API
- [x] `GET /api/leads` — list with filters
- [x] `POST /api/leads` — create + AI score + SLA + assignment rules
- [x] `POST /api/leads/import` — CSV bulk import route exists
- [x] `GET /api/leads/distribute` — distribution management page
- [x] `GET /api/crm/duplicates` — duplicate detection
- [ ] `POST /api/leads/import` — full implementation: parse CSV, validate headers, map fields, queue via Inngest for large files
- [ ] `GET /api/leads/import/[batchId]/status` — track import progress
- [ ] `POST /api/leads/ingest` — public webhook endpoint for external systems
- [ ] `POST /api/leads/merge` — merge two duplicate leads preserving history
- [ ] `GET /api/leads/assignment-rules` — list rules (page exists, verify API)
- [ ] `POST /api/leads/assignment-rules` — create rule
- [ ] Round-robin assignment logic: track last assigned rep; rotate on each new lead
- [ ] Geographic assignment: match `lead.city/state` to rep's territory in `territories` table

### Frontend
- [x] `app/(dashboard)/crm/leads/page.tsx` — leads kanban + table
- [x] `app/(dashboard)/crm/leads/distribute/page.tsx` — distribution management
- [x] `app/(dashboard)/crm/leads/duplicates/page.tsx` — duplicate management
- [x] `app/(dashboard)/crm/settings/assignment-rules/page.tsx` — assignment rules
- [x] `app/(dashboard)/crm/settings/scoring-rules/page.tsx` — scoring rules
- [ ] Import wizard modal: drag-and-drop CSV → column mapping → preview → import
- [ ] Import progress: live status with `importedCount/totalRows` progress bar
- [ ] Import errors: downloadable error report CSV (rows that failed + reason)
- [ ] Duplicate merge UI: side-by-side field comparison; choose winning value per field
- [ ] Assignment rules builder: rule conditions (source = X, priority = HIGH) → action (assign to Y / round-robin)
- [ ] "New Lead" indicator: badge on kanban column for leads created in last 24h
- [ ] Lead source analytics chart: bar chart of leads per source

### New Features (Extended)
- [ ] **Webhooks for lead ingestion** — external tools can POST to `/api/leads/ingest` with API key auth
- [ ] **Google Sheets import** — paste sheet URL → auto-fetch and map columns
- [ ] **Zapier/Make webhook endpoint** — accept lead payloads from automation platforms
- [ ] **Lead scoring explainer** — tooltip on score badge shows which rules fired and their weights
- [ ] **SLA countdown** — timer on lead card showing hours until SLA breach
- [ ] **Lead temperature tracking** — COLD/WARM/HOT based on activity recency; auto-update
- [ ] **Re-engagement campaigns** — auto-flag leads idle > 30 days for re-engagement

### Verification
- [ ] CSV import with 1000 rows completes without timeout (Inngest background job)
- [ ] Duplicate detection fires on email/phone match
- [ ] Round-robin assignment distributes leads evenly across reps
- [ ] `pnpm build` passes

---

## Implementation Plan

### Phase 1 — Import Wizard (4 days)
1. Import wizard modal: `components/crm/lead-import-wizard.tsx`
   - Step 1: Upload CSV (drag-drop with `react-dropzone`)
   - Step 2: Map columns (auto-detect common column names)
   - Step 3: Preview first 5 rows
   - Step 4: Confirm → POST to `/api/leads/import`
2. Backend: parse CSV with `papaparse`; validate required fields; queue rows via Inngest
3. `lead_import_batches` table to track progress
4. Error report: failed rows downloaded as CSV

### Phase 2 — Assignment Rules (3 days)
1. Rule builder UI: conditions (field + operator + value) + action (specific rep / round-robin / territory)
2. `server/lib/lead-triggers.ts` — enhance `evaluateAssignmentRules` with round-robin state in Redis
3. Territory-based routing: match lead location to `territories.states[]` array

### Phase 3 — Webhook Ingestion (2 days)
1. `POST /api/leads/ingest` — validate API key → create lead → trigger assignment + scoring
2. Webhook signature verification header
3. Payload normalization: accept both flat JSON and nested contact objects

### Phase 4 — Dedup & Merge (2 days)
1. Duplicate merge endpoint: combine `lead_activities`, `lead_notes`; soft-delete loser
2. Merge UI: split-pane comparison with field-level winner selection
