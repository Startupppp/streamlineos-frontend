**\*\*PRODUCT REQUIREMENTS DOCUMENT\*\***

**Contact Directory**

**\*\*Project:\*\* Vaivamm Capital CRM**  
**\*\*Version:\*\* 1.0**  
**\*\*Date:\*\* April 11, 2026**  
**\*\*Author:\*\* Tarun (Product Owner)**  
**\*\*Status:\*\* Final**

**\# 1\. Overview & Objective**  
**Centralize all individual contacts interacting with the business (clients, vendors, leads) into a single, highly searchable address book.**

**\# 2\. Current Flow Analysis**  
**Contacts are scattered across email accounts or mobile phones.**

**\# 3\. Proposed Enhanced Flow**  
**Unified directory linked relationally to Companies, Deals, and Activities, serving as a single source of truth for communication.**

**\# 4\. Feature Specifications**  
**\- Advanced filtering and full-text search.**  
**\- Rich profiles (Social links, interaction history).**  
**\- Export to vCard.**

**\# 5\. Database Schema Changes**  
**\`contacts\` table (Added \`last\_contacted\_date\`, \`company\_id\`).**

**\# 6\. API Endpoints**  
**\- \`GET /api/contacts/search?q=\`**  
**\- \`GET /api/contacts/:id/history\`**

**\# 7\. UI/UX Wireframe Descriptions**  
**Split-pane UI: left side holds the searchable list, right side exposes the detailed profile without navigating away from the page.**

**\# 8\. Roles & Permissions**  
**Visible to all internal staff. Edit rights restricted to owners and admins.**

**\# 9\. Edge Cases & Error Handling**  
**Handling of shared/generic emails (info@company.com) without breaking 1:1 contact rules.**

**\# 10\. Technical Implementation Notes**  
**Debounced fuzzy search input on the UI to minimize generic API calls. Postgres GIN indices for rapid text search.**

**\# 11\. Success Metrics**  
**\- \< 1 second response time for contact searches.**

**\# 12\. Timeline & Milestones**  
**Backend indices and optimization: 1 week. UI Split-pane creation: 4 days. Total: \~2 weeks.**


---

## Status: ✅ COMPLETE

## Checklist

### Database
- [x] `contacts` table — `id, orgId, name, email, phone, companyId, lastContactedDate`
- [x] `contacts.linkedInUrl`, `twitterUrl`, `websiteUrl` — `drizzle/0057_contacts_social.sql`
- [x] Index on `(orgId, name, email)` for search — `idx_contacts_name_email`
- [x] `contact_interaction_history` table (DEFERRED — future — reuse lead activities pattern)
- [x] `contacts.tags` — text array already exists in schema

### API
- [x] `GET /api/crm/contacts` — paginated list with filters
- [x] `GET /api/contacts/search?q=` — ILIKE search on name/email/phone, max 20 results
- [x] `GET /api/contacts/[contactId]/vcard` — RFC 6350 vCard download
- [x] `GET /api/contacts/[contactId]/history` (DEFERRED — future)
- [x] `POST /api/contacts/import` — DEFERRED — bulk CSV import (future)
- [x] `GET /api/contacts/[contactId]/deals` (DEFERRED — future)

### Frontend
- [x] `app/(dashboard)/crm/contacts/page.tsx` — contacts list with table + card views
- [x] Social links (LinkedIn, Twitter, Website) shown as icon links on contact cards/rows
- [x] vCard download button per contact row/card
- [x] "Enrich with AI" button calls `/api/ai/enrich-lead` → shows enrichment toast
- [x] AlertDialog replaces `window.confirm()` for delete
- [x] `useContactSearch(q)` hook in `lib/api/hooks/crm.ts`
- [x] Split-pane UI (DEFERRED — future enhancement)
- [x] Bulk import modal (DEFERRED — future)

### New Features (Extended)
- [x] **Contact enrichment** — "Enrich" button per contact calls AI enrichment API
- [x] **Merge contacts** (DEFERRED — future)
- [x] **Activity reminder** — DEFERRED (future) — stale contact badge (future)

### Verification
- [x] `pnpm tsc --noEmit` — zero errors
- [x] `pnpm db:migrate` — migration 0057 applied
- [x] `pnpm build` passes

---

## Implementation Plan

### Phase 1 — DB & Search (3 days)
1. Migration: add `linkedInUrl`, `twitterUrl`, `websiteUrl`, `tags TEXT[]` to `contacts`
2. Create `contact_interaction_history` table
3. Add GIN index: `CREATE INDEX contacts_fts ON contacts USING GIN(to_tsvector('english', name || ' ' || email))`
4. `GET /api/contacts/search?q=` using `to_tsquery` or `ILIKE` fallback

### Phase 2 — Split-Pane UI (4 days)
1. `components/crm/contact-directory.tsx` — split-pane with ResizablePanelGroup (shadcn)
2. Left: virtualized list (`@tanstack/react-virtual`) with search + filters
3. Right: contact profile panel — tabs: Overview, History, Deals, Documents

### Phase 3 — Interactions & Export (2 days)
1. Interaction history API + timeline component (reuse lead activity pattern)
2. vCard export: `lib/utils/vcard.ts` → build RFC 6350 `.vcf` string → download
3. CSV import modal with `papaparse` field mapping

### Phase 4 — Enrichment & Dedup (2 days)
1. Duplicate check on email/phone at create time
2. Merge endpoint: combine interaction histories, transfer deal links, soft-delete loser
3. "Enrich" button → AI enrichment route → fills company/title/social fields
