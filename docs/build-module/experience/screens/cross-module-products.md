# Cross-module product screen catalog

Status: planned contract; module ownership and current-state labels follow the canonical Build specification.

This file answers a recurring gap in screen reviews: Build may coordinate CRM, Timesheets, and Accounting, but it must not become a second CRM, time ledger, or accounting ledger. The pages below are the minimum owning-module surfaces that must exist for a coherent multi-product Streamline experience. Build opens them with a signed, scoped return context and displays only authorized projections.

## Shared contract for every module

Every index page has: page title, scope switcher, search, typed filters, saved views, sort, pagination or cursor loading, create action when permitted, empty/loading/error/denied states, bulk actions only when explicitly authorized, and a keyboard-accessible table/card alternative. Every detail page has: stable URL, summary header, status/lifecycle, related records, activity/audit where permitted, revision/conflict handling, and an explicit back/return target.

Every mutation uses a strict request schema, `Idempotency-Key`, expected revision when the record is revisioned, server-side authorization, transaction/outbox where cross-module events are emitted, and cache invalidation after commit. A hidden button is never an authorization control.

## CRM

### `/crm`

Landing redirects to the last authorized CRM view or `/crm/accounts`. Sidebar: Accounts, Contacts, Leads, Deals, Activities, Pipelines, Reports, Imports, Settings. A Build project/client link opens CRM with `originModule`, `originRecord`, and a safe return URL.

### `/crm/accounts` and `/crm/accounts/:accountId`

The index filters by owner, lifecycle, segment, source, activity date, deal stage, tag, region, and search. Cards/rows show account name, primary contact, owner, lifecycle, open-deal value, last activity, next activity, health, and linked projects. Clicking a row opens the account detail page; quick actions open a contact/deal/activity sheet. Detail tabs are Overview, Contacts, Deals, Activities, Files, Notes, Projects, and Audit. `Create project in Build` opens a preview sheet, then Build's project creation route; successful creation shows the reciprocal link and preserves the CRM return context.

### `/crm/contacts` and `/crm/contacts/:contactId`

Filters: account, owner, role, consent status, last touch, tags, and unassigned. Detail includes identity, consent, account relationships, interactions, deals, linked Build projects, and communication preferences. Sensitive fields are masked unless the permission allows them.

### `/crm/leads`, `/crm/deals`, `/crm/deals/:dealId`, `/crm/pipelines`

Leads support qualification, assignment, conversion, duplicate review, and source attribution. Deals support list, board, and forecast views; filters include pipeline, stage, owner, close period, amount, probability, account, and risk. Deal detail shows stage history, activities, proposal/scope, forecast, and `Create Build project` only after the configured conversion rule. Pipeline settings are admin-only and versioned; stage edits show impact before applying.

### `/crm/activities`, `/crm/imports`, `/crm/reports`, `/crm/settings`

Activities support due/overdue/owner/type filters and open the owning contact/account/deal. Imports are a durable job flow: upload → field mapping → duplicate preview → validation → commit → reconciliation report; raw files are not stored in onboarding drafts. Reports drill into the exact filtered records. Settings covers fields, pipelines, assignment rules, retention, integrations, and export permissions.

## Timesheets

### `/timesheets`

Landing redirects to the current user's week. Sidebar: My Week, Team Review, Projects, Rates, Policies, Reports, Exports, Settings. The page has week navigation, person/team/project/client filters, billable status, approval status, lock status, and saved views. Each day cell supports quick entry; clicking an entry opens an edit sheet, while `Open full record` opens the durable time-entry page.

### `/timesheets/entries/:entryId`

Shows person, date, duration, project, ticket, description, billable state, rate source, approval state, lock period, edits, and audit. Actions are Edit, Duplicate, Submit, Withdraw, and Open linked Build work subject to policy. A locked or approved entry cannot be silently changed; correction creates a revision or adjustment according to Timesheets policy.

### `/timesheets/review`

Manager/project-owner review filters by period, person, project, client, missing description, billable state, and exceptions. Rows support inspect, approve, reject with reason, request correction, and bulk approval only where policy permits. Approval changes return a durable status and invalidate Build budget projections.

### `/timesheets/projects`, `/timesheets/rates`, `/timesheets/policies`, `/timesheets/reports`, `/timesheets/exports`

Projects show tracked, billable, approved, unbilled, and variance totals with a Build link. Rates are effective-dated and permission-protected. Policies cover week start, rounding, overlap, approvals, lock periods, and corrections. Reports drill from totals to entries. Exports are asynchronous, scoped, audited, and revocable; payroll or accounting consumers receive declared projections, not arbitrary table reads.

## Accounting

### `/accounting`

Landing redirects to `/accounting/overview` or the last allowed financial surface. Sidebar: Overview, Customers, Estimates, Invoices, Payments, Expenses, Tax, Reconciliation, Reports, Integrations, Settings. Build's `Create estimate` or `Create invoice` opens a contextual Accounting draft with approved scope, client, currency, source links, and suggested lines; Accounting owns the final record.

### `/accounting/overview`

Shows receivables, overdue amount, cash collected, open estimates, unbilled approved work, tax reminders, and reconciliation exceptions. Every metric drills into a filtered source list. Currency and date scope are explicit; no metric silently combines currencies.

### `/accounting/customers`, `/accounting/estimates`, `/accounting/estimates/:id`

Customers are linked to CRM identities and show legal/billing data, tax identifiers, payment terms, and consented contacts. Estimates support draft, send, revise, accept, reject, expire, and convert-to-invoice. Detail shows source scope, line items, tax, discounts, totals, currency, terms, versions, delivery history, and audit. Sending or converting requires confirmation and Accounting permission.

### `/accounting/invoices`, `/accounting/invoices/:invoiceId`

Filters: customer, status, issue date, due date, currency, amount range, project, payment state, and aging bucket. Detail shows immutable numbered document version, lines, tax, payment terms, credits, delivery, source Build records, payment events, and reconciliation. `Mark paid` is unavailable unless supported by a reconciled payment action; a browser return from a gateway is not proof of payment.

### `/accounting/payments`, `/accounting/expenses`, `/accounting/reconciliation`, `/accounting/reports`, `/accounting/integrations`, `/accounting/settings`

Payments show gateway/bank/cash evidence, status, refunds, and invoice allocations. Expenses support receipt upload, category, tax, approval, and reconciliation. Reconciliation is a review queue with exact difference reasons and an auditable match/unmatch action. Reports include receivables, tax, profitability, and project commercial projections. Integrations own provider connections, webhook verification, retry/dead-letter handling, and disconnect impact. Settings covers legal entity, numbering, fiscal year, tax rules, currencies, approval policy, and payment destinations; destructive changes require strong confirmation.

## Context and return protocol

The handoff envelope contains `originModule`, `originRoute`, `originRecordId`, `returnQuery`, `returnAnchor`, `requestedAction`, `correlationId`, expiry, and a server-issued signature. The destination re-authorizes the user and ignores tampered or expired context. On success it returns the stable destination record and source projection version. On cancel it returns to the exact originating pane/list/filter. On denial it shows a neutral access result without leaking record existence. On failure it preserves a retryable draft without duplicate creation.

## Module API families

Each module must publish: `GET /module/navigation`, bounded collection queries with typed filter envelopes, `GET /module/:id`, mutation commands, `/preview` before consequential actions, `/jobs/:id` for async work, `/exports`, and `/audit`. Cross-module endpoints are projections or commands, never foreign-table joins in the Build UI. OpenAPI schemas, permission keys, event names, cache keys, error codes, and test fixtures are versioned together.

## Delivery checklist

Track completion in the [requirement ledger](../../implementation/REQUIREMENT-LEDGER.md) and [work claims](../../implementation/WORK-CLAIMS.md). An unchecked item stays open until evidence is recorded on the current branch.

- [ ] Reconcile CRM, Timesheets, and Accounting route families with their existing owning controllers/OpenAPI operations; do not create duplicate Build ledgers or foreign-table UI joins.
- [ ] Deliver CRM account/contact/lead/deal/activity indexes and details with the declared filters, stage history, consent masking, import reconciliation, and previewed Create Build project handoff.
- [ ] Deliver Timesheets My Week, entry detail, review, project/rate/policy/report/export surfaces with effective-dated rates, lock/approval rules, bounded queries, and Build ticket return.
- [ ] Deliver Accounting overview, customer, estimate, invoice, payment, expense, reconciliation, report, integration, and settings surfaces with currency-safe metrics and immutable numbered documents.
- [ ] Implement the signed, expiring origin/return envelope for Build→CRM/Timesheets/Accounting; reauthorize at destination and restore source pane/filter/anchor on cancel or completion.
- [ ] Use owning-module commands with strict Zod validation, expectedRevision, idempotency, durable jobs/outbox where needed, permission-scoped cache invalidation, and no payment-success claim before reconciliation.
- [ ] Verify cross-module deep links, mobile return, tampered/expired context, role/tenant/client denial, duplicate submit/import, invoice/time approval races, persisted audit, and source projection freshness.
