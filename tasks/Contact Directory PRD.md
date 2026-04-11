**\*\*PRODUCT REQUIREMENTS DOCUMENT\*\***

**Contact Directory**

**\*\*Project:\*\* Vaivamm Capital CRM**  
**\*\*Version:\*\* 1.0**  
**\*\*Date:\*\* April 11, 2026**  
**\*\*Author:\*\* Tarun (Product Owner)**  
**\*\*Status:\*\* Draft**

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

## Status: IN PROGRESS

## Checklist

### Database
- [x] `contacts` table — `id, orgId, name, email, phone, companyId, lastContactedDate`
- [ ] `contacts.linkedInUrl`, `twitterUrl`, `websiteUrl` — social profile columns
- [ ] GIN full-text index on `(name, email, phone)` for fast search
- [ ] `contact_interaction_history` table — log of all touchpoints (call/email/meeting)
- [ ] `contacts.tags` — text array for categorization

### API
- [x] `GET /api/crm/contacts` — basic list (via `crm-contacts.ts` queries)
- [ ] `GET /api/contacts/search?q=` — full-text search with debounce (GIN index)
- [ ] `GET /api/contacts/[contactId]` — full contact profile with interaction history
- [ ] `GET /api/contacts/[contactId]/history` — paginated interaction timeline
- [ ] `POST /api/contacts/[contactId]/history` — log touchpoint manually
- [ ] `GET /api/contacts/export` — download as vCard (`.vcf`) or CSV
- [ ] `POST /api/contacts/import` — bulk import from CSV
- [ ] `GET /api/contacts/[contactId]/deals` — deals linked to this contact
- [ ] `GET /api/contacts/[contactId]/linked-company` — parent account info

### Frontend
- [x] `app/(dashboard)/crm/contacts/page.tsx` — contacts list page exists
- [ ] Split-pane UI: left = searchable list; right = contact detail (no full-page navigation)
- [ ] Debounced search input (300ms) wired to `/api/contacts/search?q=`
- [ ] Contact rich profile: avatar, social links, interaction history timeline
- [ ] "Link to Company" selector (account picker)
- [ ] "Link to Deal" action on contact profile
- [ ] vCard export button (downloads `.vcf` file)
- [ ] Bulk import modal with CSV drag-and-drop + field mapping
- [ ] Filter chips: by company, by tag, by last contacted (< 7 days, > 30 days)
- [ ] Contact tags — add/remove inline

### New Features (Extended)
- [ ] **Duplicate detection** — warn if email already exists when creating contact
- [ ] **Merge contacts** — combine two duplicate contact records
- [ ] **Contact enrichment** — "Enrich" button calls `/api/ai/enrich-lead` to fill missing fields
- [ ] **Activity reminder** — "No contact in 30+ days" badge on stale contacts
- [ ] **Shared contacts** — mark contacts visible to all reps vs private
- [ ] **Call log shortcut** — one-click "Log Call" from contact card
- [ ] **Send email from profile** — quick email compose using CRM email templates

### Verification
- [ ] Search returns results in < 1 second for 10,000+ contacts
- [ ] vCard export opens correctly in phone contacts app
- [ ] `pnpm build` passes

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
