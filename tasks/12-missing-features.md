# Task 12: Missing Features for Investment Platform

## Priority: 🟢 FUTURE (After core fixes)

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

**Acceptance Criteria**:
- Each feature module has complete CRUD
- Navigation integrated into sidebar
- RBAC applied (only authorized roles see each module)
- Loading/error/empty states implemented
- Mobile responsive
