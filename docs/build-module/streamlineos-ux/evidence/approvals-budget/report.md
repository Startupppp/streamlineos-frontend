# Completeness Wave — Approvals and Budget

Date: 2026-09-30 (UTC+05:30)  
Account/org visible in UI: `PXC-Design-A-20260930`  
Project URL supplied: `https://www.streamlineos.in/build/47`  
Scope observed in project sidebar: `PXC-Project-Alpha` (Project)

## Status

- **VERIFIED — project Approvals:** `https://www.streamlineos.in/build/47/approvals`
- **VERIFIED — project Budget:** `https://www.streamlineos.in/build/47/budget`
- **VERIFIED — organization Approvals:** `https://www.streamlineos.in/build/approvals`
- **BLOCKED / UNTESTED — organization Budget:** no org Budget surface exposed. It is absent from organization More tools; direct `https://www.streamlineos.in/build/budget` rendered **Page Not Found**. More-tools searches tried: `Budget`, `Cost`, `Timesheet` (each returned “No matching tools”).

## Discovery via More tools

### Project scope
At the project `/build/47` scope, More tools search/menu exposed:

- Approvals — `https://www.streamlineos.in/build/47/approvals`
- Budget — `https://www.streamlineos.in/build/47/budget`

### Organization scope
Switched only the Build scope to organization `All of Build` (org header remained `PXC-Design-A-20260930`). Organization More tools exposed Approvals at `https://www.streamlineos.in/build/approvals`; it exposed no Budget or similarly named cost/timesheet tool.

## UI evidence and UX notes

### Project Approvals — empty state
- Heading: **Approvals**; supporting text: “Review and manage approval requests for this project”.
- Empty state: **No approvals yet** — “Use approvals to get sign-off on tasks, milestones, and releases before they ship.”
- CTA: **Request approval** menu with **Request task approval**, **Request release approval**, and **Request milestone approval**.
- Filters visible: Status, Type, Approver.
  - Status options: All statuses, Pending, Requested, Approved, Rejected, Changes Requested, Escalated, Cancelled.
  - Type options: All types, Task, Milestone, Budget, Release, Change Request, Document, Timesheet Entry, Client Approval.
  - Approver options present: All approvers, PXC Designer A, PXC Test Member.
- Request form is clear and cancellable: Entity Type (Task default), task search, Title, Approver, Reason / Notes (optional), Due Date (optional), Approval Level (Level 1 — Standard default), **Cancel**, **Submit Request**.
- Opened the request form only to inspect it, then cancelled. No approval was submitted or created.

### Organization Approvals — empty state
- Heading: **Approvals**; supporting text: “Approvals waiting for your decision across all projects”.
- Filters/controls: Search approvals, Status, Type, Pick a date range.
- Summary counters: Pending **0**, Overdue **0**.
- Empty state: **No approvals waiting** — “You have no pending approvals across your projects.”

### Project Budget — empty state
- Heading: **Budget**; supporting text: “Planned budget vs actual cost from billable timesheets”.
- Summary cards: Planned Budget **₹0** / **Not set**; Actual Cost **₹0** / **0.0 billable hours**; Remaining **₹0** / **Available**.
- Empty state: **No billable time logged** — “Log billable hours to track costs against this project's budget.”
- CTA: **Set Budget** opens inline editor with **Planned budget in rupees** (default `0`), **Save**, and **Cancel**.
- Opened the editor only to inspect it, then cancelled. No budget value was saved.

## Evidence files

- `approvals-empty.webp` — project Approvals empty state and filters
- `approvals-request-form.webp` — cancellable Request Approval form
- `org-approvals-empty.webp` — organization Approvals empty state, search/filters, counters
- `budget-empty.webp` — project Budget empty state and summary cards
- `budget-edit-form.webp` — cancellable Set Budget editor
- `org-more-tools.webp` — organization More tools list (no Budget)
- `org-budget-search-none.webp` — organization More tools search `Budget` showing “No matching tools”

No OTP, sign-out, membership/role, Client Access, delete, or payment/spend flow was entered.
