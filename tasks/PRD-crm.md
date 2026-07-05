# StreamlineOS PRD (v1 · Implementation‑Grade)
## CRM (Leads · Deals · Contacts · Companies · Clients/Accounts · Activities · Tasks · Calendar · Reports · Settings)

**Owner (PM)**: StreamlineOS Platform  
**Owner (Eng)**: CRM / Sales / Customer Executive  
**Status**: Implementation-ready (frontend grounded; backend contract specified from current client usage)  
**Last updated**: 2026-07-01  
**Scope**: Frontend `frontend/` + Backend `streamlineos-api` (NestJS; separate repo)

---

## 0) Canonical implementation prompt (paste into Claude Code)

> Implement StreamlineOS CRM end-to-end: lead pipeline, lead detail + timeline, deal pipeline + detail, quotes (currently embedded on deal), contacts + companies, client accounts (success/onboarding/renewals), activities, tasks, CRM calendar, analytics/reports exports, and CRM settings (assignment rules, scoring rules, SLA policies, email templates, products, custom fields, automations, audit log). Treat `CLAUDE.md` as constitution. Follow strict workflow: for any page touched: AUDIT → PLAN → wait for confirmation → implement → run build+lint+typecheck → update `PAGES.md`.
>
> Hard boundaries: backend owns all business logic + DB schema + migrations; frontend is UI + TanStack Query hooks only. Do **not** add frontend `app/api/**` business endpoints (auth-bridge only). Strict TypeScript (no `any`, no casting hacks, no `@ts-ignore`, avoid non-null assertion abuse), no anonymous event handlers, no code comments, delete dead code.
>
> UX standards: `PRD-ui-ux-system.md` is the source of truth. Match `/signin` + `/signup` density and interaction states; every page must have loading/empty/error states; accessible keyboard navigation; no scroll bugs; avoid double-padding in Sheets.

---

## 1) Vision (why this exists)

StreamlineOS CRM is the tenant-safe, RBAC-gated, audit-ready system of record for customer acquisition and revenue operations:

- **Lead capture → qualification → conversion** into accounts/opportunities.
- **Deal pipeline** to closure, with forecasting, aging, win/loss, and approvals.
- **Relationship management** via contacts + companies and cross-entity activities/timeline.
- **Operational excellence** through assignment rules, scoring, SLAs, templates, and automations.

This must ship without violating the repo’s backend/frontend boundary: **all business rules and persistence are NestJS-only**, while the Next.js repo owns UI and TanStack Query hooks.

---

## 2) What must be true after shipping (outcomes)

### 2.1 User outcomes
- Sales teams can manage leads in `/crm/leads` (kanban/table/funnel), convert leads, and immediately see resulting downstream entities (client accounts, linked deals).
- Reps can manage deals in `/crm/deals` (table/kanban), update stages safely (with optimistic UI), and review forecasts/aging/win-loss reports.
- Teams can collaborate around relationships: contacts and companies show a clear identity header + related context + activity/timeline.
- Activities, tasks, and calendar provide a single place to plan and execute follow-ups tied to CRM entities.
- Admins can configure assignment, scoring, SLAs, templates, products, custom fields, automations, and audit logs (all changes audited).

### 2.2 Engineering outcomes
- **Tenant isolation + BOLA-safe object checks** on every CRM read/write (org + object access asserted in backend service/DAL).
- **Stable API error envelope + codes** (UI must not parse error strings).
- **Correct cache invalidation** for all CRM mutations (no stale lists/detail drift).
- Every significant mutation emits **audit events** and, where applicable, **activity/timeline events**.
- Reliability practices are in place for ingest/webhooks/automations: idempotency, retries, DLQ, and observability.

---

## 3) Competitive baseline + StreamlineOS differentiation

### 3.1 Competitor parity (HubSpot / Pipedrive / Salesforce SMB)
StreamlineOS CRM must cover table-stakes:
- **Leads**: pipeline views (kanban/table), status transitions, assignment, bulk update/delete, duplicate detection + merge, source attribution analytics, SLA alerting.
- **Deals**: pipeline, stage transitions (won/lost reasons), forecasting, aging, win/loss analysis, approvals.
- **Contacts + Companies**: CRUD, quick actions, related entities, notes, timeline/activity.
- **Activities + Tasks**: log calls/emails/meetings and track follow-ups by due date buckets.
- **Templates**: reusable email templates with variables and preview.
- **Scoring + Assignment rules**: configurable rules that drive prioritization and routing.
- **Reporting**: summary dashboards and export for operational sharing.
- **Audit**: immutable audit log with filters and export.

### 3.2 StreamlineOS differentiation (why choose us)
Differentiation should leverage cross-module strengths already present in this repo:
- **Deal → Project handoff**: Deal detail supports “Create Project” (`frontend/app/(authenticated)/crm/deals/[dealId]/page.tsx` uses `POST /projects/from-deal`). This is a real “revenue-to-delivery” bridge that most CRMs bolt on.
- **Unified execution layer**: CRM has first-class Tasks (`/crm/tasks`), Activities (`/crm/activities`), and a CRM-specific Calendar (`/crm/calendar`) tied to the same org member identity used elsewhere.
- **AI as a workflow accelerator (not a gimmick)**:
  - Smart search route exists (`/crm/leads/smart-search` via `useNLSearch`).
  - Contact enrichment exists (`/crm/contacts` → `POST /ai/enrich-lead`).
- **Module gating**: CRM should degrade gracefully (module disabled states) using the existing module system; competitors typically gate by plan but not at runtime per org toggles.

---

## 4) Ground truth from this repo (observed)

> This PRD is intentionally grounded in **real routes**, **feature components**, **hooks**, and **types** in `frontend/`. Where a “page” is requested but not implemented as a route yet (notably Quotes), the PRD specifies how to complete it **using existing hooks/types**.

### 4.1 Existing route surface (canonical)
From `PAGES.md` + `frontend/app/(authenticated)/crm/**`:

- CRM hub
  - `/crm` → `frontend/app/(authenticated)/crm/page.tsx`
- Leads
  - `/crm/leads` → `frontend/app/(authenticated)/crm/leads/page.tsx`
  - `/crm/leads/[leadId]` → `frontend/app/(authenticated)/crm/leads/[leadId]/page.tsx`
  - `/crm/leads/distribute` → `frontend/app/(authenticated)/crm/leads/distribute/page.tsx`
  - `/crm/leads/smart-search` → `frontend/app/(authenticated)/crm/leads/smart-search/page.tsx`
  - `/crm/leads/duplicates` → `frontend/app/(authenticated)/crm/leads/duplicates/page.tsx`
  - `/crm/leads/source-report` → `frontend/app/(authenticated)/crm/leads/source-report/page.tsx`
- Deals
  - `/crm/deals` → `frontend/app/(authenticated)/crm/deals/page.tsx`
  - `/crm/deals/[dealId]` → `frontend/app/(authenticated)/crm/deals/[dealId]/page.tsx`
  - `/crm/deals/forecast` → `frontend/app/(authenticated)/crm/deals/forecast/page.tsx`
  - `/crm/deals/aging` → `frontend/app/(authenticated)/crm/deals/aging/page.tsx`
  - `/crm/deals/win-loss` → `frontend/app/(authenticated)/crm/deals/win-loss/page.tsx`
  - `/crm/deals/approvals` → `frontend/app/(authenticated)/crm/deals/approvals/page.tsx`
- Contacts
  - `/crm/contacts` → `frontend/app/(authenticated)/crm/contacts/page.tsx`
  - `/crm/contacts/[contactId]` → `frontend/app/(authenticated)/crm/contacts/[contactId]/page.tsx`
- Companies (represents organizations/accounts)
  - `/crm/companies` → `frontend/app/(authenticated)/crm/companies/page.tsx`
  - `/crm/companies/[companyId]` → `frontend/app/(authenticated)/crm/companies/[companyId]/page.tsx`
- Activities / Tasks / Calendar
  - `/crm/activities` → `frontend/app/(authenticated)/crm/activities/page.tsx`
  - `/crm/tasks` → `frontend/app/(authenticated)/crm/tasks/page.tsx`
  - `/crm/calendar` → `frontend/app/(authenticated)/crm/calendar/page.tsx`
- Analytics / Reports
  - `/crm/analytics` → `frontend/app/(authenticated)/crm/analytics/page.tsx`
  - `/crm/reports` → `frontend/app/(authenticated)/crm/reports/page.tsx`
- CRM settings
  - `/crm/settings/assignment-rules` → `frontend/app/(authenticated)/crm/settings/assignment-rules/page.tsx`
  - `/crm/settings/scoring-rules` → `frontend/app/(authenticated)/crm/settings/scoring-rules/page.tsx`
  - `/crm/settings/sla` → `frontend/app/(authenticated)/crm/settings/sla/page.tsx`
  - `/crm/settings/email-templates` → `frontend/app/(authenticated)/crm/settings/email-templates/page.tsx`
  - `/crm/settings/products` → `frontend/app/(authenticated)/crm/settings/products/page.tsx`
  - `/crm/settings/custom-fields` → `frontend/app/(authenticated)/crm/settings/custom-fields/page.tsx`
  - `/crm/settings/automations` → `frontend/app/(authenticated)/crm/settings/automations/page.tsx`
  - `/crm/settings/audit-log` → `frontend/app/(authenticated)/crm/settings/audit-log/page.tsx`

### 4.2 Quotes (current UI reality)
There is **no** `/crm/quotes` route under `frontend/app/(authenticated)/crm/` today. Quotes are currently implemented as a **section inside Deal Detail**:
- `frontend/features/crm/deals/deal-quotes-section.tsx`
- Data hooks: `frontend/hooks/api/crm/quotes.ts`
- Types: `frontend/types/crm/quotes.ts`

This PRD includes:
- **Current-state spec** (quotes inside deal detail), and
- **Completion spec** (add `/crm/quotes` + `/crm/quotes/[quoteId]`) using the existing hooks/types without inventing a parallel model.

### 4.3 Clients / Accounts (current UI reality)
The repo already has a **client accounts domain contract** (types + hooks), but there is **no** `/crm/clients` route under `frontend/app/(authenticated)/crm/` today.

Existing contracts:
- Hooks: `frontend/hooks/api/crm/clients.ts` (calls `/clients/*`, `/csat/*`, and some customer-executive endpoints)
- Types: `frontend/types/crm/clients.ts`
- Permission keys exist in the CRM catalog: `crm:clients:read|update` (`frontend/lib/rbac/permissions/crm.ts`)

This PRD includes a **completion spec** to add:
- `/crm/clients` (accounts list)
- `/crm/clients/[clientId]` (account detail: timeline/activities/opportunities/onboarding)
while reusing the existing hooks/types (no parallel “account” model).

### 4.3 Key frontend feature components (reuse-first)
This is the “building blocks” list for CRM.

- CRM hub
  - `frontend/features/crm/shared/crm-pipeline-mini.tsx`
  - `frontend/features/crm/shared/crm-recent-activity.tsx`
- Leads
  - `frontend/features/crm/leads/leads-toolbar.tsx`
  - `frontend/features/crm/leads/leads-kanban.tsx`
  - `frontend/features/crm/leads/lead-table-view.tsx`
  - `frontend/features/crm/leads/leads-funnel-view.tsx`
  - Lead detail components: `frontend/features/crm/leads/detail/*`
- Deals
  - `frontend/features/crm/deals/deal-table-view.tsx`
  - `frontend/features/crm/deals/deal-side-panel.tsx`
  - `frontend/features/crm/deals/deals-create-sheet.tsx`
  - Deal detail components: `frontend/features/crm/deals/detail/*`
  - Quote section: `frontend/features/crm/deals/deal-quotes-section.tsx`
- Contacts
  - `frontend/features/crm/contacts/create-contact-dialog.tsx`
  - `frontend/features/crm/contacts/edit-contact-sheet.tsx`
  - Contact detail components: `frontend/features/crm/contacts/detail/*`
- Companies
  - Create: `frontend/features/crm/companies/create-org-dialog.tsx`
  - Detail: `frontend/features/crm/companies/detail/*`
- Activities / Tasks / Calendar
  - Activities: `frontend/features/crm/activities/*`
  - Tasks: `frontend/features/crm/tasks/*`
  - CRM calendar: `frontend/features/crm/calendar/*`

### 4.4 Key hooks + types (contract surface)
The frontend’s current data contract is expressed by these hooks/types:

- Leads: `frontend/hooks/api/leads.ts` + `frontend/types/leads.ts`
- Deals: `frontend/hooks/api/crm/deals.ts` + `frontend/types/crm/deals.ts`
- Contacts: `frontend/hooks/api/crm/contacts.ts` + `frontend/types/crm/contacts.ts`
- Companies (organizations): `frontend/hooks/api/crm/organizations.ts` + `frontend/types/crm/contacts.ts` (org types live alongside contacts)
- Quotes: `frontend/hooks/api/crm/quotes.ts` + `frontend/types/crm/quotes.ts`
- CRM settings: `frontend/hooks/api/crm-settings.ts`
- CRM automations: `frontend/app/(authenticated)/crm/settings/automations/page.tsx` uses `/crm/automations` directly via `apiClient`.
- Audit log: `frontend/app/(authenticated)/crm/settings/audit-log/page.tsx` uses `/crm/audit-logs` via `apiClient`.
- RBAC keys catalog (frontend): `frontend/lib/rbac/permissions/crm.ts`

---

## 5) Personas

- **Sales Rep**: manages personal leads/deals, logs activities, schedules meetings, uses templates, stays on top of follow-ups.
- **Sales Manager**: monitors team performance, distribution/assignment, SLA breaches, forecasting, approvals.
- **RevOps / Admin**: configures assignment rules, scoring, templates, SLAs, products, custom fields, automations; audits changes.
- **Customer Executive / CSM**: (overlaps with Clients domain) manages account health, renewal stages, opportunities; needs visibility into upstream lead/deal context.

---

## 6) Information architecture (IA) + navigation rules

### 6.1 CRM home as command center
`/crm` (hub) must remain the launchpad with quick navigation tiles and high-signal KPIs:
- implemented in `frontend/app/(authenticated)/crm/page.tsx` via:
  - `useLeadStats()` (`frontend/hooks/api/leads.ts`)
  - `useDealStats()` (`frontend/hooks/api/crm/deals.ts`)
  - `useDeals({ limit: 6 })` for recent activity
  - tasks due via `useTasks({ status: "pending", limit: 1 })`

### 6.2 Deep-linking rules (shareability)
Deep links must work consistently across list/detail:
- Lead: `/crm/leads/[leadId]`
- Deal: `/crm/deals/[dealId]`
- Contact: `/crm/contacts/[contactId]`
- Company: `/crm/companies/[companyId]`
- CRM “report views” must be URL-driven for filters when applicable (period, search, view toggles already use `searchParams` patterns).

---

## 7) Module gating + RBAC (mandatory)

### 7.1 Org module gating
CRM must be gated through the existing module system (backend is source of truth; frontend is UX).
- When CRM module is disabled:
  - hide CRM in nav
  - block `/crm/*` with a friendly “module disabled” state and a CTA to `/settings/modules` for users with `settings:manage`.

### 7.2 Permission keys (frontend catalog; backend enforces)
Frontend catalog exists at `frontend/lib/rbac/permissions/crm.ts`.

At minimum, backend must expose and enforce canonical keys for:
- leads: `crm:leads:view|create|update|assign|delete`
- reports: `crm:reports:view|export`
- targets: `crm:targets:view|manage` (types exist, route TBD)
- clients/accounts: `crm:clients:read|update` (client account hooks exist; CRM routes TBD)

**Hard rule**: permissions are resolved in backend on every request; frontend checks are advisory UX only.

---

## 8) Data model (backend; tenant-scoped) + indexes

> Names are indicative; actual table names must follow `streamlineos-api` conventions. Shapes must satisfy the frontend types in `frontend/types/leads.ts` and `frontend/types/crm/*`.

### 8.1 Core CRM tables

- Leads
  - `crm_leads`
    - aligns to `Lead` (`frontend/types/leads.ts`)
    - key fields: `org_id`, `name`, `email`, `phone`, `status`, `priority`, `source`, `score`, `assigned_to_id`, `sla_deadline`, `company`, `city`, `potential_value`, `investment_interest`, `qualification_notes`, `custom_fields`, timestamps
  - `crm_lead_activities`
    - aligns to `LeadActivity` (`frontend/types/leads.ts`)
  - `crm_lead_import_batches` (optional but supported by type)

- Deals
  - `crm_deals`
    - aligns to `Deal` (`frontend/types/crm/deals.ts`)
    - includes `lead_id` and optional `client_id`
  - `crm_deal_activities`
    - aligns to `DealActivity`
  - `crm_deal_meetings`
    - aligns to `DealMeeting`
  - `crm_deal_approvals`
    - aligns to `DealApproval` shape in `frontend/hooks/api/crm/deals.ts`

- Contacts
  - `crm_contacts`
    - aligns to `Contact` (`frontend/types/crm/contacts.ts`)
    - includes optional links: `organization_id`, `lead_id`, `deal_id`, `owner_id`, `tags`, `custom_fields`

- Companies / Organizations
  - `crm_organizations`
    - aligns to `CrmOrganization` + hierarchy/rollup/timeline types (`frontend/types/crm/contacts.ts`)
    - includes `parent_id` for hierarchy

- Quotes
  - `crm_quotes`
    - aligns to `Quote` (`frontend/types/crm/quotes.ts`)
    - key fields: `deal_id?`, `client_id?`, `quote_number`, `status`, money totals, timestamps (`sent_at`, `accepted_at`, `rejected_at`, `valid_until`)
  - `crm_quote_line_items`
    - aligns to `QuoteLineItem`

### 8.2 Settings tables
- Assignment rules
  - `crm_assignment_rules` (priority-ordered, active flag, conditions JSON)
- Scoring rules
  - `crm_scoring_rules` (field/op/value/points)
- SLA policies
  - `crm_sla_policies` + supporting derived metrics/report materialization as needed
- Email templates
  - `crm_email_templates` (name, subject, body)
- Products
  - `crm_products` (catalog) aligns to `Product` (`frontend/types/crm/products.ts`)
- Automations
  - `crm_automation_rules` + `crm_automation_runs` (run history)
- Audit logs
  - `crm_audit_logs` aligns to `AuditLogEntry` in `/crm/settings/audit-log`

### 8.3 Indexing (non-negotiable)
All tables are tenant-scoped; **every index must lead with** `org_id`.

Minimum indexes:
- `crm_leads`
  - `(org_id, status, updated_at DESC)`
  - `(org_id, assigned_to_id, status, updated_at DESC)`
  - `(org_id, source, created_at DESC)`
  - `(org_id, score DESC, created_at DESC)`
  - unique dedupe helpers (optional): `(org_id, lower(email))` where email is not null; `(org_id, phone)` where phone is not null
- `crm_deals`
  - `(org_id, stage, updated_at DESC)`
  - `(org_id, assigned_to_id, stage, updated_at DESC)`
  - `(org_id, expected_close_date)`
- `crm_contacts`
  - `(org_id, created_at DESC)`
  - `(org_id, organization_id)`
  - `(org_id, lower(email))` where not null
- `crm_organizations`
  - `(org_id, created_at DESC)`
  - `(org_id, parent_id)` for hierarchy traversal
- `crm_quotes`
  - `(org_id, deal_id, created_at DESC)`
  - unique quote number: `(org_id, quote_number)`
- Audit logs
  - `(org_id, created_at DESC)`
  - `(org_id, entity_type, created_at DESC)`
  - `(org_id, actor_id, created_at DESC)`

---

## 9) Backend API contract (NestJS-only) — endpoints + error model

### 9.1 Error envelope (standard)
All non-2xx responses:

```json
{
  "error": {
    "code": "CRM_FORBIDDEN",
    "message": "Human readable, safe for UI",
    "details": { "field": "optional" },
    "requestId": "trace id"
  }
}
```

Rules:
- `code` is stable and drives UI; **never** branch on `message`.
- `requestId` is propagated to logs/traces (and returned in headers if available).

### 9.2 Observed frontend endpoints (must remain supported)
These are directly called today by the frontend hooks/pages:

- Leads (`frontend/hooks/api/leads.ts`)
  - `GET /leads`
  - `POST /leads`
  - `GET /leads/:id`
  - `PATCH /leads/:id`
  - `PATCH /leads/:id/status`
  - `PATCH /leads/:id/assign`
  - `PATCH /leads/:id/self-assign`
  - `POST /leads/:id/activities`
  - `GET /leads/:id/timeline`
  - `GET /leads/board`
  - `GET /leads/stats`
  - `GET /leads/sla-alerts`
  - `GET /leads/analytics`
  - `PATCH /leads/bulk` + `DELETE /leads/bulk`
  - `GET /leads/duplicates` + `POST /leads/merge`
  - `POST /leads/import`
  - `POST /leads/distribute`
  - `GET /leads/source-report`
  - `GET /leads/sales-leaderboard`
  - `GET /leads/sales-team-capacity`
  - `GET /leads/:id/score-explanation`

- Deals (`frontend/hooks/api/crm/deals.ts`)
  - `GET /deals`
  - `POST /deals`
  - `GET /deals/:id`
  - `PATCH /deals/:id` (also used for stage change with optional `version`)
  - `DELETE /deals/:id`
  - `POST /deals/:id/clone`
  - `GET /deals/stats`
  - `GET /deals/forecast`
  - `GET /deals/win-loss`
  - `GET /deals/aging`
  - `GET /deals/approvals`
  - `POST /deals/approvals`
  - `GET /deals/:id/activities` + `POST /deals/:id/activities`
  - `GET /deals/:id/meetings` + `POST /deals/:id/meetings` + `DELETE /deals/:id/meetings/:meetingId`

- Contacts (`frontend/hooks/api/crm/contacts.ts`)
  - `GET /contacts`
  - `POST /contacts`
  - `GET /contacts/:id`
  - `PATCH /contacts/:id`
  - `DELETE /contacts/:id`

- Companies / Orgs (`frontend/hooks/api/crm/organizations.ts`)
  - `GET /crm/organizations`
  - `POST /crm/organizations`
  - `GET /crm/organizations/:id`
  - `PATCH /crm/organizations/:id`
  - `DELETE /crm/organizations/:id`
  - `GET /crm/organizations/:id/hierarchy`
  - `GET /crm/organizations/:id/roll-up`
  - `GET /crm/organizations/:id/timeline`
  - `GET /crm/organizations/:id/related-leads`
  - `GET /crm/people-slugs`
  - `GET /crm/people/:slug`

- Quotes (`frontend/hooks/api/crm/quotes.ts`)
  - `GET /crm/deals/:dealId/quotes`
  - `POST /crm/quotes`
  - `PATCH /crm/quotes/:id`
  - `PATCH /crm/quotes/:id/status`
  - `DELETE /crm/quotes/:id`

- CRM settings (`frontend/hooks/api/crm-settings.ts`)
  - `GET /crm/assignment-rules` + `POST /crm/assignment-rules` + `PATCH /crm/assignment-rules/:id` + `DELETE /crm/assignment-rules/:id` + `PATCH /crm/assignment-rules/reorder`
  - `GET /crm/scoring-rules` + `POST /crm/scoring-rules` + `PATCH /crm/scoring-rules/:id` + `DELETE /crm/scoring-rules/:id`
  - `GET /crm/email-templates` + `POST /crm/email-templates` + `PATCH /crm/email-templates/:id` + `DELETE /crm/email-templates/:id`
  - `GET /crm/sla/policies` + `POST /crm/sla/policies` + `PATCH /crm/sla/policies/:id` + `DELETE /crm/sla/policies/:id`
  - `GET /crm/sla/report`
  - `GET /crm/sla/breached`

- Products (`frontend/hooks/api/crm/products.ts`, used by `/crm/settings/products`)
  - `GET /crm/products` + `POST /crm/products` + `PATCH /crm/products/:id` + `DELETE /crm/products/:id`

- Automations (`/crm/settings/automations`)
  - `GET /crm/automations` + `POST /crm/automations` + `PATCH /crm/automations/:id` + `DELETE /crm/automations/:id`

- Audit logs (`/crm/settings/audit-log`)
  - `GET /crm/audit-logs`

### 9.3 Security invariants (backend)
Every endpoint taking an id must:
- verify session
- verify org/tenant match
- verify object-level access (BOLA-safe)
- verify permission key(s) as needed

High-risk endpoints (must be locked down):
- lead merge (`POST /leads/merge`)
- deal approvals (`POST /deals/approvals`)
- settings endpoints (`/crm/*-rules`, templates, SLA, products, automations)
- audit logs export (see §11)

---

## 10) TanStack Query + caching + invalidation requirements (frontend)

### 10.1 Stale times (observed pattern)
Most CRM hooks already use `staleTime: 2 * 60_000` and some reports use longer (`useDealForecast` 5min). This is a good baseline:
- Highly interactive (leads board, deal pipeline): 2min staleTime, mutate invalidation required
- Reports (aging, forecast): 5min staleTime + optional refetchInterval (aging uses 5min)
- Audit logs: 30s staleTime (already in `/crm/settings/audit-log`)

### 10.2 Invalidation map (must be consistent)
Examples (non-exhaustive):
- Lead status change (`PATCH /leads/:id/status`):
  - invalidate `queryKeys.leads.board()`, `queryKeys.leads.detail(id)`, `queryKeys.leads.list(...)`, `queryKeys.leads.timeline(id)`
  - if status becomes `CONVERTED`: invalidate `queryKeys.clients.all` (already implemented in `useUpdateLeadStatus`)
- Deal stage change (`PATCH /deals/:id`):
  - invalidate `queryKeys.deals.all`, `queryKeys.deals.detail(id)`, `queryKeys.deals.stats()`, `queryKeys.deals.forecast()`, `queryKeys.deals.winLoss()`
  - optimistic update exists in `useUpdateDealStage` and must remain correct
- Quote mutation:
  - invalidate `["quotes","deal",dealId]` (already implemented in `frontend/hooks/api/crm/quotes.ts`)
- Settings mutations:
  - must invalidate relevant `queryKeys.crmSettings.*` and not rely on manual refresh

---

## 11) Audit events + observability (mandatory)

### 11.1 Audit log requirements (already has a UI)
Audit log UI exists at `/crm/settings/audit-log` (`frontend/app/(authenticated)/crm/settings/audit-log/page.tsx`) with:
- filters: `entityType`, `action`, date range, search
- stable action set includes: `created|updated|deleted|archived|restored|assigned|unassigned|status_changed|stage_changed|converted|merged|exported|imported`

Backend must emit audit rows for:
- lead: create/update/delete/assign/unassign/status change/convert/merge/import/export
- deal: create/update/delete/assign/stage change/won/lost/clone/approval approve+reject
- contact: create/update/delete
- company: create/update/delete/hierarchy link parent/change parent
- quote: create/update/delete/status changes/sent/accepted/rejected/expired
- settings: assignment/scoring/SLA/templates/products/custom fields/automations changes
- automation: rule created/toggled/deleted and run outcomes (success/failure)

### 11.2 Metrics (minimum)
- API latency p50/p95/p99 by endpoint group: leads/deals/contacts/orgs/settings/audit
- win/loss summary counts and trend
- SLA compliance rate + breach counts
- assignment automation success/failure rates
- duplicate detection scan counts + merge actions

### 11.3 Tracing/logging
- Every request attaches a `requestId` surfaced to clients.
- Audit/event writes and async pipelines must include `requestId` and `orgId` for correlation.

---

## 12) Reliability: ingest, automations, and webhooks

### 12.1 Idempotency + transactions
Mutations that can be retried by clients must accept `Idempotency-Key`:
- lead import (`POST /leads/import`)
- lead distribution (`POST /leads/distribute`)
- deal approvals (`POST /deals/approvals`)
- automations creation and manual re-runs (if added)

Multi-write operations must be transactional:
- lead convert creates/updates multiple entities (lead + client account + optional deal) as seen in `/crm/leads` behavior (`frontend/app/(authenticated)/crm/leads/page.tsx` can create a deal during conversion).

### 12.2 Automations execution model
Automations UI exists at `/crm/settings/automations` and expects:
- triggers: `lead.created`, `lead.status_changed`, `lead.score_changed`, `lead.assigned`, `deal.stage_changed`, `task.overdue`
- actions: `send_email`, `assign_to`, `update_field`, `create_task`, `send_notification`, `add_tag`

Backend requirements:
- run in a job queue (bounded retries, exponential backoff)
- persist run history (`executionCount`, `lastRunAt` are in the UI model)
- poison messages go to DLQ with replay tooling

### 12.3 Webhooks/ingest (required for enterprise readiness)
Even if UI doesn’t exist yet, the backend must have a stable event model for external integration:
- outbound: webhooks for lead/deal/contact/quote changes
- inbound: (future) web form lead capture and email ingest must be tenant-safe, validated, rate-limited, idempotent

---

## 13) Click-by-click specs (core pages)

> Specs below use the repo’s UI primitives and patterns; UI/UX reference is `PRD-ui-ux-system.md`. Every page must have loading/empty/error states as already implemented in most routes.

### 13.1 `/crm` — CRM hub
**Implemented in**: `frontend/app/(authenticated)/crm/page.tsx`

Click-by-click:
- User opens `/crm`.
- Page loads KPIs and recent activity using existing hooks:
  - lead stats via `useLeadStats()` (`frontend/hooks/api/leads.ts`)
  - deal stats via `useDealStats()` (`frontend/hooks/api/crm/deals.ts`)
  - recent deals via `useDeals({ limit: 6 })` (for `CrmRecentActivity`)
  - win/loss via `useWinLossAnalysis()`
  - tasks due via `useTasks({ status: "pending", limit: 1 })`
- If any critical source fails: show an in-page error panel with Retry (already implemented).
- User clicks a nav tile (Leads/Contacts/Companies/Deals/Activities/Calendar/Tasks/Reports) → navigates to the respective route.

Acceptance:
- Retry only refetches what failed; page does not crash on partial data.

### 13.2 `/crm/leads` — Lead pipeline (table/kanban/funnel)
**Implemented in**: `frontend/app/(authenticated)/crm/leads/page.tsx`

Click-by-click:
- User opens `/crm/leads`.
- Default view uses `useLeadsFilters()` + debounced search.
- User switches views:
  - Table → `LeadTableView` (`frontend/features/crm/leads/lead-table-view.tsx`)
  - Kanban → `LeadsKanban` (drag/drop stage change)
  - Funnel → `LeadsFunnelView`
- Create lead:
  - Click “Create Lead” (`CreateLeadSheet`)
  - Submit → `useCreateLead` (`POST /leads`)
  - On success: toast + close sheet + invalidate `queryKeys.leads.all`
- Status move:
  - Kanban drag drop or status dropdown triggers `useUpdateLeadStatus` (`PATCH /leads/:id/status`)
  - Must enforce expectedStatus (optimistic + conflict-safe)
- Convert lead:
  - Conversion flow triggers `PATCH /leads/:id/status` to `CONVERTED`
  - If “Create deal” is selected: additionally `useCreateDeal` (`POST /deals`) (already supported in page logic)
- Bulk update/delete:
  - Table selection → `useBulkUpdateLeads` / `useBulkDeleteLeads`

Acceptance:
- Dragging between columns updates UI optimistically and reconciles on error.
- Conversion invalidates clients/accounts caches (already in hook).

### 13.3 Lead detail — `/crm/leads/[leadId]`
**Implemented in**: `frontend/app/(authenticated)/crm/leads/[leadId]/page.tsx`

Click-by-click:
- User navigates from pipeline or direct URL.
- Page fetches:
  - lead detail via `useLeadDetail(leadId)` (`GET /leads/:id`)
  - timeline via `useLeadTimeline(leadId, 50)` (`GET /leads/:id/timeline`)
- Header supports:
  - status change (`useUpdateLeadStatus` with expectedStatus)
  - edit toggle (react-hook-form + zod)
- Quick actions:
  - Add note / log call / draft email / create task
  - Notes/emails/calls log via `useLogLeadActivity` (`POST /leads/:id/activities`)
  - Task creation uses shared tasks API (`useCreateTask` from `frontend/hooks/api/tasks.ts`)
- Sidebar shows timeline and qualification/attachments panels (feature components under `frontend/features/crm/leads/detail/*`)

Acceptance:
- Not-found and error states do not leak data; safe copy and a clear back CTA exist (already implemented).

### 13.4 `/crm/deals` — Deals pipeline (table/kanban)
**Implemented in**: `frontend/app/(authenticated)/crm/deals/page.tsx`

Click-by-click:
- User opens `/crm/deals`.
- Page fetches deals via `useDeals()` and renders:
  - Table view: `DealTableView`
  - Kanban: drag/drop with stage change + “stage skip” confirmation where needed
- Create deal:
  - “New Deal” opens `DealsCreateSheet` → `useCreateDeal` (`POST /deals`)
- Stage change:
  - In table or kanban triggers `useUpdateDealStage` (`PATCH /deals/:id` with optional `version`)
  - Moving to `WON|LOST` opens win/loss dialog and optionally triggers confetti
- Delete deal:
  - Confirm dialog → `useDeleteDeal` (`DELETE /deals/:id`)
- Forecast CTA:
  - “Forecast” button links to `/crm/deals/forecast`

Acceptance:
- Stage changes invalidate stats/forecast/win-loss and reconcile optimistic UI.

### 13.5 Deal detail — `/crm/deals/[dealId]` (includes Quotes)
**Implemented in**: `frontend/app/(authenticated)/crm/deals/[dealId]/page.tsx`

Click-by-click:
- User opens deal detail.
- Page fetches:
  - deal via `useDealDetail`
  - activities via `useDealActivities`
  - meetings via `useDealMeetings`
- Actions:
  - Edit toggles `DealEditForm`
  - Mark won/lost updates stage
  - Clone creates a new deal and navigates to it (`POST /deals/:id/clone`)
  - “Create Project” uses `POST /projects/from-deal` and navigates to `/projects/[projectId]` (real bridge)
- Quotes section:
  - Renders `DealQuotesSection` (`frontend/features/crm/deals/deal-quotes-section.tsx`)
  - Fetches via `useDealQuotes(dealId)` (`GET /crm/deals/:dealId/quotes`)
  - New quote creates a draft via `useCreateQuote` (`POST /crm/quotes`)
  - Status updates via `PATCH /crm/quotes/:id/status`
  - Delete via `DELETE /crm/quotes/:id`

Acceptance:
- Quotes mutations only invalidate quotes-by-deal cache; deal page remains responsive.

### 13.6 Quotes (completion spec) — `/crm/quotes` and `/crm/quotes/[quoteId]` (to add)
**Current state**: quotes exist only inside deal detail (see §4.2).

To complete CRM parity, add routes using existing hook/types:
- `/crm/quotes`: list/search/filter by status/deal/client; export
- `/crm/quotes/[quoteId]`: quote detail + line items + totals, status transitions, send/accept/reject, PDF generation (stub exists in UI as “coming soon”)

Backend contract needed (additive; keep existing deal-quotes endpoint):
- `GET /crm/quotes` (filters: `status`, `dealId`, `clientId`, `search`, pagination)
- `GET /crm/quotes/:id` (include `lineItems`)
- Optional: `POST /crm/quotes/:id/send` (sets `sentAt`, transitions status, emits audit)
- Optional: `GET /crm/quotes/:id/pdf` (stream pdf)

Frontend must reuse:
- Types: `frontend/types/crm/quotes.ts`
- Mutations: `frontend/hooks/api/crm/quotes.ts` (extend if needed, do not create parallel quote logic)

### 13.7 `/crm/contacts` + `/crm/contacts/[contactId]`
**Implemented in**:
- list: `frontend/app/(authenticated)/crm/contacts/page.tsx`
- detail: `frontend/app/(authenticated)/crm/contacts/[contactId]/page.tsx`

Click-by-click (list):
- Search is debounced and only queries when query length is 0 or ≥3.
- View toggle: table vs card.
- Create: `CreateContactDialog`
- Edit: `EditContactSheet`
- Delete: confirm dialog → `useDeleteContact`
- AI enrich: per-row action calls `POST /ai/enrich-lead` and shows toast (no persistence yet).

Click-by-click (detail):
- Actions: log activity, edit, delete
- Timeline/notes/related deals components render entity context and enable tasks/email/call dialogs.

### 13.8 `/crm/companies` + `/crm/companies/[companyId]` (organizations/accounts)
**Implemented in**:
- list: `frontend/app/(authenticated)/crm/companies/page.tsx` (uses `useCrmOrganizations`)
- detail: `frontend/app/(authenticated)/crm/companies/[companyId]/page.tsx` (org rollup, hierarchy, timeline, related leads)

Click-by-click:
- List supports search + pagination + create (`CreateOrgDialog`).
- Detail supports:
  - link/change parent (`LinkParentDialog`)
  - show rollup metrics, timeline, notes, hierarchy, related leads
  - delete with confirm

### 13.9 `/crm/analytics` + `/crm/reports`
**Implemented in**:
- analytics: `frontend/app/(authenticated)/crm/analytics/page.tsx`
- reports: `frontend/app/(authenticated)/crm/reports/page.tsx` (includes Excel export via dynamic `exceljs`)

Click-by-click:
- User chooses a period (week/month/quarter/year).
- Page recalculates date range and refetches analytics hooks.
- Reports export:
  - Click “Export” → generate workbook in browser (already implemented)
  - Backend involvement is not required for export generation today, but backend must still enforce permissions for underlying data endpoints.

### 13.10 `/crm/activities` + `/crm/tasks` + `/crm/calendar`
**Implemented in**:
- activities: `frontend/app/(authenticated)/crm/activities/page.tsx` using `useCrmActivities` + `useLogCrmActivity`
- tasks: `frontend/app/(authenticated)/crm/tasks/page.tsx` using `useTasks` + `useCompleteTask` + `useDeleteTask`
- calendar: `frontend/app/(authenticated)/crm/calendar/page.tsx` using `useCalendarEvents`/connections/org members, filtered to CRM entity types

Acceptance:
- Every logged activity/task/event must be attributable to an entity (`LEAD|DEAL|CONTACT`) and should emit audit events for visibility.

### 13.11 `/crm/leads/distribute` — Lead distribution
**Implemented in**: `frontend/app/(authenticated)/crm/leads/distribute/page.tsx`

Click-by-click:
- User opens `/crm/leads/distribute`.
- Page loads up to 100 leads by status (default `NEW`) using `useLeads({ status, search, sortBy:"createdAt", sortOrder:"desc", limit:100 })`.
- User uploads a CSV:
  - Click “Upload CSV” → `CsvUploadDialog` (`frontend/features/crm/leads/csv-upload-dialog.tsx`)
  - On success: invalidate `queryKeys.leads.all`
- User selects leads:
  - Toggle row checkboxes or “select all” header checkbox.
  - “Distribute (N)” becomes enabled when \(N>0\).
- User clicks “Distribute (N)”:
  - Opens `LeadDistributionDialog` (`frontend/features/crm/leads/lead-distribution-dialog.tsx`), which must call `POST /leads/distribute`.
  - On success: selection clears and list refetches.

Acceptance:
- Distribution is idempotent (backend) and does not double-assign on retry.
- Result summary (absent count/names, per-rep distribution) is returned from backend (matches `DistributeResult` in `frontend/types/leads.ts`) and shown in UI.

### 13.12 `/crm/leads/smart-search` — AI lead search
**Implemented in**: `frontend/app/(authenticated)/crm/leads/smart-search/page.tsx`

Click-by-click:
- User opens `/crm/leads/smart-search`.
- User enters a natural-language query and clicks “Search”:
  - Calls `useNLSearch()` (`frontend/hooks/api/ai`), returns:
    - interpreted filters (rendered as “Interpreted as:” badges)
    - matching leads (table links to `/crm/leads/[leadId]`)
- User can click preset example queries to auto-run.
- User can clear results.

Acceptance:
- Backend is responsible for filtering logic; frontend treats the response as untrusted data and renders it safely (no HTML injection).
- Rate-limit and meter AI usage server-side (deny-by-default, tenant-safe).

### 13.13 `/crm/leads/duplicates` — Duplicate detection + merge
**Implemented in**: `frontend/app/(authenticated)/crm/leads/duplicates/page.tsx`

Click-by-click:
- User opens `/crm/leads/duplicates`.
- Page loads groups via `useDuplicateLeads()` (`frontend/hooks/api/crm/leads.ts`) calling `GET /leads/duplicates`.
- For each group:
  - Shows match reasons + score
  - “Remove duplicate” opens confirm dialog → calls `useMergeLead()` (`POST /leads/merge`).
- User can refresh (refetch).

Acceptance:
- Merge is tenant-safe (cannot merge across orgs) and emits audit events (`merged`).
- Winner/loser selection is explicit and deterministic (backend enforces; UI must not guess).

### 13.14 `/crm/leads/source-report` — Lead source analytics
**Implemented in**: `frontend/app/(authenticated)/crm/leads/source-report/page.tsx`

Click-by-click:
- User opens `/crm/leads/source-report`.
- Page loads data via `useLeadSourceReport()` (`frontend/hooks/api/crm/leads.ts`) calling `GET /leads/source-report`.
- User sees:
  - Stat cards (total leads, sources tracked, total converted, best conversion)
  - Per-source bar breakdown (count, converted, conversionRate, totalValue)
- Errors show a retry CTA.

Acceptance:
- Report endpoint is paginated/aggregated server-side; no “download all leads” patterns.
- Export (future) must require `crm:reports:export`.

### 13.15 `/crm/deals/forecast` — Forecast
**Implemented in**: `frontend/app/(authenticated)/crm/deals/forecast/page.tsx`

Click-by-click:
- User opens `/crm/deals/forecast`.
- Page loads deals via `useDeals({ limit: 200 })` and filters to open deals (`stage !== "LOST"`).
- If no open deals: empty state with CTA back to `/crm/deals`.
- Otherwise renders:
  - `DealForecastSummary`
  - `DealForecastChart`
  - `DealCloseDateList`

Acceptance:
- Forecast computations are consistent with backend definitions (if backend offers `/deals/forecast`, prefer it over client-side recomputation for correctness at scale).

### 13.16 `/crm/deals/aging` — Aging report
**Implemented in**: `frontend/app/(authenticated)/crm/deals/aging/page.tsx`

Click-by-click:
- User opens `/crm/deals/aging`.
- Page loads via `useDealAging()` (`frontend/hooks/api/crm/deals.ts`) calling `GET /deals/aging` with `staleTime: 5min` and `refetchInterval: 5min`.
- Table lists deals by days-in-stage, severity chips, and link-outs back to `/crm/deals/[dealId]`.

Acceptance:
- Aging is computed server-side (avoid pulling “all deals” just to compute age).
- Thresholds must be centrally defined in backend (UI can colorize).

### 13.17 `/crm/deals/win-loss` — Win/loss analysis
**Implemented in**: `frontend/app/(authenticated)/crm/deals/win-loss/page.tsx`

Click-by-click:
- User opens `/crm/deals/win-loss`.
- Page loads via `useWinLossAnalysis()` calling `GET /deals/win-loss`.
- If no closed deals: empty state.
- Otherwise shows summary + lost reasons distribution.

Acceptance:
- Lost reason taxonomy should be configurable (future), but backend must normalize/aggregate consistently (no free-text-only analytics).

### 13.18 `/crm/deals/approvals` — Deal approvals
**Implemented in**: `frontend/app/(authenticated)/crm/deals/approvals/page.tsx`

Click-by-click:
- User opens `/crm/deals/approvals`.
- Default filter is pending approvals.
- User approves/rejects:
  - Approve: confirm dialog → `useResolveDealApproval` posts `{ approvalId, action:"approve" }`
  - Reject: confirm dialog requires reason → posts `{ approvalId, action:"reject", rejectionReason }`
- Success toasts and list refetch.

Acceptance:
- Backend enforces permissions (approval actions are privileged) and emits audit events (approved/rejected).
- Approval decision is idempotent (retries won’t double-apply).

### 13.19 CRM settings pages
All are implemented as routes and must remain:
- Assignment rules: `/crm/settings/assignment-rules` (priority ordering + reorder endpoint)
- Scoring rules: `/crm/settings/scoring-rules` (includes live preview of score based on sample lead)
- SLA policies: `/crm/settings/sla` (policies + report + breached leads)
- Email templates: `/crm/settings/email-templates` (variables + preview interpolation)
- Products: `/crm/settings/products` (catalog CRUD)
- Custom fields: `/crm/settings/custom-fields` (uses `/settings/custom-fields` endpoints via `frontend/hooks/api/crm/activities.ts` which is a custom-fields hook despite its filename)
- Automations: `/crm/settings/automations` (rules CRUD + toggle)
- Audit log: `/crm/settings/audit-log` (filters + pagination + export)

Acceptance:
- Every settings mutation emits an audit entry (`entityType="settings"` or specific entityType) and is RBAC-gated.

### 13.20 Clients / Accounts (completion spec) — `/crm/clients` + `/crm/clients/[clientId]` (to add)
**Current state**: contract exists, route is missing (see §4.3).

Add routes using existing hooks/types:
- `/crm/clients` list page
  - Use `useClientAccounts(filters)` (`frontend/hooks/api/crm/clients.ts`) calling `GET /clients`.
  - Filters: status, search, pagination (matches `ClientAccountFilters`).
  - Row click navigates to `/crm/clients/[clientId]`.
- `/crm/clients/[clientId]` detail page
  - Use `useClientAccount(id)` (`GET /clients/:id`) for summary + recent activities.
  - Use `useClientTimeline(id)` for timeline (`GET /clients/:id/timeline`).
  - Use `useClientOpportunities(id)` + create/update/delete opportunity hooks (`/clients/opportunities`).
  - Use onboarding flows:
    - `useOnboardingTemplates()` + `useClientOnboardingItems(clientId)`
    - `useCreateOnboardingItem()` / `useToggleOnboardingItem()` / `useDeleteOnboardingItem()`
  - Renewal management:
    - `useUpdateRenewal()` (patch renewal stage/date/notes) and `useRenewalAccounts()` for lists (if surfaced).
  - CSAT:
    - `useCsatSurveys()` + `useCsatSurveyResponses(surveyId)`; creation/updates/deletes via hooks in `clients.ts` calling `/csat/*`.

Backend requirements:
- Ensure `/clients/*` and `/csat/*` are tenant-scoped and RBAC gated under CRM module (`crm:clients:read|update`, plus CSAT permissions if separated).

---

## 14) Test plan (backend e2e + frontend smoke)

### 14.1 Backend e2e (minimum)
- Tenant isolation: user A cannot read/write B’s leads/deals/contacts/quotes/orgs.
- RBAC allow/deny for:
  - lead status change/assign/bulk delete
  - deal approval approve/reject
  - settings mutations (assignment/scoring/SLA/templates/products/automations)
  - audit logs read/export
- Concurrency: lead status expectedStatus conflict returns 409; deal stage `version` conflict returns 409.
- Duplicate merge: cannot merge across org, emits audit, preserves “winner” record integrity.
- Automations: trigger → run → action execution; failures retry and land in DLQ.

### 14.2 Frontend smoke (minimum)
- `/crm`: loads KPIs and navigation tiles
- `/crm/leads`: create lead, drag status, convert lead (and optional deal creation)
- `/crm/leads/duplicates`: merge flow works
- `/crm/deals`: create deal, move stage, mark won/lost
- `/crm/deals/[dealId]`: create quote, update quote status, delete quote
- `/crm/contacts`: create/edit/delete, AI enrich toast
- `/crm/companies`: create org, open detail, link parent, delete
- `/crm/reports`: export workbook
- `/crm/settings/*`: create/update/delete rules/templates/policies/products; audit log shows resulting entries

---

## 15) “Top gaps / drift” checklist (for cleanup and roadmap)

- **Quotes pages**: hooks/types exist; UI exists inside deal detail; route pages `/crm/quotes` + `/crm/quotes/[quoteId]` are not present (additive completion).
- **Route naming drift vs historical notes**: organizations are implemented as `/crm/companies`, not `/crm/organizations` routes, but backend endpoints still use `/crm/organizations` (keep or standardize; avoid breaking current UI).
- **API prefix inconsistency**: some domains use `/leads`, `/deals`, `/contacts`, `/clients` while others use `/crm/*`. Standardization should be done with backward-compatible aliases to avoid breaking existing frontend hooks.

