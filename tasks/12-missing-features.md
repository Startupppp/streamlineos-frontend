# Task 12: Missing Features for Investment Platform

## Priority: FUTURE | Effort: 10+ days | Dependencies: Tasks 02, 04 | Status: NOT STARTED

---

## PRD

### Problem Statement
As an investment platform, several domain-specific features are missing:
1. No investor 360-degree view (complete profile with all interactions)
2. No compliance/legal module (regulatory filings, audits, document management)
3. No fund administration (capital calls, distributions, fund lifecycle)
4. No portfolio management (valuations, performance tracking, cap tables)
5. Reports module is basic (no investor reports, fund performance metrics)
6. Global search (Cmd+K) doesn't search across all entity types
7. Audit trail UI doesn't exist (table exists but no viewer)

### Goals
- Build investor 360-degree view with complete interaction history
- Create compliance module with document tracking
- Build fund administration with capital calls and distributions
- Create portfolio management with valuations
- Enhance reports with investment-specific analytics
- Enhance global search across all entities
- Build audit trail viewer page

### Non-Goals
- Replacing existing CRM features (enhance only)
- Building a trading platform
- Regulatory-specific compliance (generic framework)

### Success Criteria
- Investor profile shows complete 360-degree view
- Compliance module tracks documents and filings
- Fund lifecycle management from creation to close
- Portfolio performance tracked with IRR/MOIC
- Global search returns results from all entity types

---

### 12.1 Investor 360° View

**New page**: `app/(dashboard)/crm/leads/[id]/page.tsx` (enhance existing)

**Sections**:
- Profile header (name, contact, status, score, tags)
- Activity timeline (calls, emails, meetings, site visits)
- Notes tab
- Tasks/follow-ups tab
- Email history tab
- Documents tab
- Communications log
- Deal association
- Investment history (after conversion)

---

### 12.2 Compliance & Legal Module

**New pages**:
- `app/(dashboard)/compliance/page.tsx` — Dashboard
- `app/(dashboard)/compliance/documents/page.tsx` — Regulatory documents
- `app/(dashboard)/compliance/audits/page.tsx` — Audit logs + reports
- `app/(dashboard)/compliance/filings/page.tsx` — Regulatory filings tracker

**Tables needed**:
- `compliance_documents` (type, status, due_date, assigned_to)
- `regulatory_filings` (type, filing_date, status, regulator)
- `compliance_checklists` (items, completed_by, reviewed_by)

---

### 12.3 Fund Administration

**New pages**:
- `app/(dashboard)/funds/page.tsx` — Fund list
- `app/(dashboard)/funds/[id]/page.tsx` — Fund detail
- `app/(dashboard)/funds/capital-calls/page.tsx` — Capital call management
- `app/(dashboard)/funds/distributions/page.tsx` — Distribution tracking

**Tables needed**:
- `funds` (name, type, vintage_year, target_size, status)
- `fund_investors` (investor_id, commitment, called, distributed)
- `capital_calls` (fund_id, amount, due_date, status)
- `distributions` (fund_id, type, amount, date, status)

---

### 12.4 Portfolio Management

**New pages**:
- `app/(dashboard)/portfolio/page.tsx` — Portfolio overview
- `app/(dashboard)/portfolio/[id]/page.tsx` — Company detail
- `app/(dashboard)/portfolio/valuations/page.tsx` — Valuation tracking
- `app/(dashboard)/portfolio/exits/page.tsx` — Exit tracking

**Tables needed**:
- `portfolio_companies` (name, sector, entry_date, entry_valuation)
- `valuations` (company_id, date, method, fair_value, notes)
- `board_meetings` (company_id, date, attendees, minutes_url)
- `cap_table_entries` (company_id, investor, shares, percentage)

---

### 12.5 Reports Module Enhancement

**Current**: Basic reports page.

**Enrich with**:
- Investor report generator (quarterly letter)
- Fund performance report (IRR, MOIC, TVPI)
- Pipeline analytics (conversion rates, funnel charts)
- HR analytics (attrition, cost per hire, time to fill)
- Downloadable PDF reports
- Scheduled email delivery

---

### 12.6 Global Search (Cmd+K Enhancement)

**Current**: `components/layout/command-palette.tsx` exists

**Enhance**:
- Search across all entities (leads, deals, employees, tickets, documents)
- Recent items
- Quick actions (Create Lead, New Expense, Clock In)
- Keyboard shortcuts
- Fuzzy search with highlighting

---

### 12.7 Activity Log / Audit Trail UI

**New page**: `app/(dashboard)/settings/audit-log/page.tsx`

**Features**:
- Filterable by user, action, entity type, date range
- Detailed diff view for changes
- Export capability
- Built on existing `auditLogs` table

---

## Rules to Follow

1. **Schema First**: Define database tables before building UI
2. **RBAC from Day 1**: Every new module must have role-based access
3. **Reuse Existing Components**: Use DataTable, MetricCard, FilterBar from shared
4. **Feature-Based Structure**: Each module in `app/(dashboard)/{module}/`
5. **Loading/Error/Empty**: Every new page must have all three states
6. **Responsive**: Mobile-first design for all new pages

---

## Checklist

- [ ] Design investor 360-degree view page
- [ ] Enhance existing lead detail with full interaction timeline
- [ ] Create compliance module schema (documents, filings, checklists)
- [ ] Build compliance module pages (dashboard, documents, audits, filings)
- [ ] Create fund administration schema (funds, investors, capital calls, distributions)
- [ ] Build fund admin pages (fund list, detail, capital calls, distributions)
- [ ] Create portfolio management schema (companies, valuations, cap tables)
- [ ] Build portfolio pages (overview, company detail, valuations, exits)
- [ ] Enhance reports module with investment-specific analytics
- [ ] Add fund performance metrics (IRR, MOIC, TVPI)
- [ ] Enhance global search (Cmd+K) to search all entity types
- [ ] Build audit trail viewer page (`/settings/audit-log`)
- [ ] Add sidebar navigation for new modules
- [ ] Apply RBAC to all new modules
- [ ] Add loading/error/empty states to all new pages
- [ ] Test all new modules on mobile

## Acceptance Criteria

1. Each feature module has complete CRUD operations
2. Navigation integrated into sidebar with proper role filtering
3. RBAC applied (only authorized roles see each module)
4. Loading/error/empty states implemented for every page
5. Mobile responsive
6. All new tables have proper audit columns and indexes

## Testing Plan

1. **Investor 360**: View lead profile, verify all interactions displayed
2. **Compliance**: Create document, track filing, generate audit report
3. **Fund Admin**: Create fund, execute capital call, record distribution
4. **Portfolio**: Add company, create valuation, track performance metrics
5. **Reports**: Generate investor report, verify PDF output
6. **Search**: Use Cmd+K to search for lead, deal, employee, ticket
7. **Audit Trail**: View audit log, filter by user/action/date
