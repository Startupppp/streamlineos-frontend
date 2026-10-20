# StreamlineOS 2026 Suite Competitor Analysis

**Research date:** 2026-10-20  
**Source policy:** Primary first-party product, documentation, support, and Microsoft Learn pages only. All sources were accessed on 2026-10-20.  
**Scope:** Odoo, Zoho One, Microsoft 365/Dynamics 365/Power Platform, Google Workspace, monday.com, ClickUp, Notion, HubSpot, Rippling, and Atlassian/Jira/Confluence.  
**Decision status:** Product strategy input. This document does not authorize deletion, migration, or a claim that an unverified module is production-ready.

## Executive conclusion

StreamlineOS should not compete by copying every screen in ten mature products. It should compete on **closed operating loops**: a customer, employee, project, file, support request, stock movement, approval, signature, and financial event remain connected from intake to outcome without CSV reconciliation or duplicate records.

The competitive set divides into four archetypes:

1. **Broad business operating suites:** Odoo and Zoho One. They set the breadth benchmark and are the most direct all-in-one competitors.
2. **Ecosystem platforms:** Microsoft and Google. They dominate productivity, files, spreadsheets, identity, email, and calendar; Microsoft also spans CRM/ERP and low-code.
3. **Work and knowledge systems:** monday.com, ClickUp, Notion, and Atlassian. They win through a small set of flexible work/content primitives rather than full back-office breadth.
4. **Deep systems of record:** HubSpot for the customer lifecycle and Rippling for the workforce lifecycle. They show that suite coherence comes from a trusted shared data model, not merely common navigation.

The recommended position is:

> **StreamlineOS is the operating layer for a growing company: customer commitments become staffed, documented, delivered, supported, signed, stocked, billed, and measured work on one permission-safe record graph.**

This requires depth in shared primitives and a few end-to-end workflows before more module breadth. Odoo's key lesson is not “build 80 apps”; it is that shared records, activities, documents, reporting, permissions, and automation make separate apps behave like one system. [O1][O2][O3][O4]

## Constraints inherited from existing StreamlineOS decisions

This analysis preserves the current Knowledge decisions while applying the newer Drive-first direction:

- `kb_pages` remains the system of record for organization and project Wiki pages until an approved migration replaces or wraps it. A new file/folder model must reference the existing page identity rather than create a second native-document editor or dual-write content store.
- Ask and Wiki/Docs remain two entry points to one knowledge product.
- “My pages/files” is ownership; “Shared with me” is an explicit grant. Neither is inferred in the browser.
- Search, authorization, versioning, audit, and AI citation checks remain canonical shared services.
- “Find before organize” still applies. Drive-first adds a familiar file/folder model; it does not make users maintain perfect folder trees before search works.
- AI may draft, classify, summarize, and propose actions. It may not silently publish, change access, approve, post financial entries, or alter payroll.
- No route, source, or stored record is deleted merely because Drive-first changes the primary navigation.
- The existing modular-monolith-plus-workers direction remains appropriate. Suite coherence does not require premature microservices.

## Competitive matrix: jobs and suite primitives

| Competitor | Primary job and strongest segment | Coherent suite primitive | Relevant native breadth | Spreadsheet posture | Strategic lesson for StreamlineOS |
|---|---|---|---|---|---|
| **Odoo** | Run most SMB/mid-market front- and back-office operations in one configurable ERP | Shared business models/records, chatter and activities, documents, reporting, access rules, and Studio automation | CRM, sales, projects, HR/payroll, helpdesk, documents, sign, accounting, inventory, manufacturing, website/commerce, automation [O1][O2][O3][O4][O10] | A native spreadsheet inside Documents can import XLSX/CSV and link live Odoo lists, pivots, charts, and financial data [O3][O5][O6] | Closest breadth benchmark. Copy the connected operating loops and live-data reporting concept, not its full app count or localization burden. |
| **Zoho One** | Give cost-conscious SMBs one commercial bundle for most departments | A portfolio of specialized apps under one admin, identity, integration, analytics, and automation umbrella | CRM, People, Projects/Sprints, Desk, Books, Inventory, Payroll, Sign, WorkDrive, office apps, Creator, Flow, RPA [Z1][Z2] | Zoho Sheet is a full collaborative spreadsheet with 350+ functions, pivots, charts, macros/VBA, locks, audit, versions, and Office import [Z3] | The direct bundle/pricing competitor. Breadth is credible, but app boundaries can still feel fragmented; StreamlineOS should make cross-module work feel native. |
| **Microsoft 365 + Dynamics 365 + Power Platform** | Standardize enterprise productivity and business operations on a governed ecosystem | Entra identity, Microsoft Graph, SharePoint/OneDrive, Dataverse environments, Power Platform, connectors, and admin/compliance controls | Office, email/calendar/chat/files, CRM, service, finance, supply chain, project operations, BI, low-code apps and automation [M1][M2][M3][M4] | Excel is the spreadsheet benchmark and works beside SharePoint/OneDrive, Power BI, Dataverse, and Dynamics | Integrate deeply rather than seek parity. Microsoft is strongest when an enterprise accepts its licensing, administration, and product boundaries. |
| **Google Workspace** | Create, communicate, schedule, and collaborate with minimal friction | Google identity plus Drive ACLs and cloud-native Docs/Sheets/Slides/Calendar; Apps Script/AppSheet extend workflows | Excellent productivity, files, forms, meetings, calendar, lightweight sites/tasks; limited native CRM/HR/ERP/support | Sheets is a first-class collaborative spreadsheet; AppSheet can turn Sheets, Excel, databases, and APIs into no-code apps [G1][G2][G3] | Benchmark collaboration simplicity, sharing, and Sheets UX. Integrate email/calendar/Drive; do not pretend Workspace alone is a business OS. |
| **monday.com** | Let operations, sales, product, service, and development teams configure visible workflows | Boards, items, columns, views, dashboards, automations, integrations, and connected workdocs | Work management, CRM, dev, service, forms, dashboards, docs; little native accounting, payroll, inventory, or HR system-of-record depth [MD1] | Boards are spreadsheet-like records; workdocs can embed live board data but are not an Excel-class calculation engine [MD2] | Strong benchmark for configurable workflows and packaged use cases on one platform. Guard against forcing every domain into a board. |
| **ClickUp** | Converge tasks, docs, chat, calendar, whiteboards, and team execution | Tasks are the connective tissue; custom fields, views, links, docs, dashboards, and automations surround them [C1][C2] | Deep work/project execution and collaboration; lightweight CRM/inventory patterns; no deep HR, payroll, accounting, or ERP | Table view offers spreadsheet/database-style editing and linked records, but not general spreadsheet fidelity [C2] | Benchmark the daily-work hub and connected Docs/Tasks experience. StreamlineOS should be deeper in systems of record and operating transactions. |
| **Notion** | Let knowledge teams shape docs, wikis, project databases, and lightweight workflows | Pages/blocks plus databases, properties, relations, views, templates, and automations | Excellent knowledge and adaptable project work; calendar/mail/search adjacencies; little transactional back-office depth [N1][N2][N3] | Tables and database formulas are not a true workbook or XLSX-compatible spreadsheet | Benchmark flexible composition, low-friction authoring, and connected search. Avoid making customers design their own ERP from generic databases. |
| **HubSpot** | Acquire, sell to, onboard, and support customers on one customer context | Smart CRM objects and timeline as the shared data layer across customer-facing Hubs | Marketing, sales, service, content, data, revenue/commerce; weak HR, payroll, inventory, general accounting, and internal project depth [H1][H2] | CRM tables, reporting, datasets, and exports rather than a native spreadsheet editor | Best lesson in focus: one authoritative customer record powers multiple specialist products and handoffs. |
| **Rippling** | Run the employee lifecycle across HR, payroll, IT, identity, devices, and spend | Employee/organization data graph, dynamic permissions/policies, Workflow Studio, Data Cloud, analytics, and integrations [R1][R2] | HRIS, recruiting, payroll, benefits, time, scheduling, IT identity/devices, cards/spend and custom apps; not a general CRM/project/docs/ERP suite | Analytics and custom apps use unified workforce data; no general collaborative spreadsheet editor | Benchmark cross-domain workflows driven by a canonical person record, especially hire/change/offboard. |
| **Atlassian/Jira/Confluence** | Plan and deliver software/product work, operate service management, and retain team knowledge | Jira work items, Confluence content, shared identity, automation, links, and the Teamwork Graph/Rovo layer | Product/dev/project, service/incident management, knowledge, discovery, video, search and agents; little CRM/HR/finance/ERP depth [A1][A2][A3] | Tables and marketplace integrations, not an Excel-class spreadsheet | Benchmark the issue-to-doc-to-service loop and purpose-built domain depth. Avoid Atlassian-level administration before StreamlineOS has equivalent demand. |

### What the matrix means

- **Odoo and Zoho One define breadth parity**, but breadth alone is not a moat.
- **Microsoft and Google own commodity productivity expectations**, especially email, calendar, files, meetings, and spreadsheets. Integration is more credible than replacement.
- **monday.com, ClickUp, Notion, and Atlassian define daily usability expectations** for flexible views, docs connected to work, automations, and fast collaboration.
- **HubSpot and Rippling define data-model coherence**: a trusted customer or employee record makes adjacent modules more valuable.
- StreamlineOS should therefore own the **cross-functional record graph and operating workflows**, while integrating mature commodity editors, regulated rails, and communication infrastructure.

## Target segments and personas

| Segment | Buyer and primary users | Main job to be done | Winning promise | Avoid promising initially |
|---|---|---|---|---|
| **10–50 person service SMB** | Founder/COO; sales, delivery, HR, finance generalists | Replace spreadsheets plus disconnected CRM, project, docs, support, and invoicing tools | One guided lead-to-delivery-to-cash flow with low administration | Enterprise ERP customization or multi-country payroll parity |
| **50–250 person agency/professional services firm** | COO, practice lead, project manager, account manager | Connect pipeline, scopes/signatures, staffing, projects, time, client support, and billing | One customer and engagement record from proposal through margin and renewal | Manufacturing-grade MRP |
| **50–500 person distribution/light-operations company** | Operations lead, inventory manager, finance lead | Turn orders into purchasing/stock movements, fulfillment, invoices, and support | Operational traceability without spreadsheet reconciliation | Advanced manufacturing until inventory/accounting depth is proven |
| **100–1,000 person SaaS/product company** | Product/engineering/CS/ops leaders | Connect customer evidence, roadmap, delivery, docs, incidents, support, and renewals | Ticket/feedback-to-release-to-customer loop with cited knowledge | Replacing Git hosting, CI, or a mature general ledger |
| **100–1,000 person multi-entity growing company** | HR/IT/finance administrators | Coordinate hire-to-productive and change/offboard workflows | One governed person record driving tasks, files, access, assets, time, and payroll handoff | Global payroll/tax filing without country-specific certification |

Cross-segment personas:

- **Owner/executive:** needs a trustworthy operating view, cash/risk visibility, and fewer tools—not more dashboards.
- **Operations administrator/process builder:** configures fields, forms, approvals, automations, policies, and templates without creating an ungovernable custom app.
- **Sales/account/customer-success user:** needs one customer timeline, next action, commitment, project status, support history, renewal, and commercial context.
- **Project/product/delivery lead:** converts commitments and evidence into planned, staffed, dependency-aware work with linked decisions and documents.
- **Employee/manager/HR operator:** manages employee data, requests, leave/time, onboarding, performance, documents, and payroll inputs with clear policy.
- **Support agent/knowledge owner:** resolves requests from current customer/product context and turns repeated gaps into reviewed knowledge or product work.
- **Inventory/finance/payroll specialist:** requires controlled periods, approvals, auditability, reconciliation, exports, and jurisdiction-safe behavior; attractive UI cannot substitute for correctness.
- **IT/security administrator:** needs identity lifecycle, least privilege, audit, retention, integrations, and revocation that propagate across every module.
- **External customer/vendor/candidate:** needs a narrow, secure portal for approvals, files, signatures, tickets, invoices, or requested information.

## The coherent primitive set

StreamlineOS should deepen these primitives instead of building each module as a separate mini-product:

1. **Tenant, identity, membership, group, role, and policy.**
2. **Party graph:** person, organization, employee, customer, vendor, contact, and their context-specific roles.
3. **Work graph:** request, task/work item, project, milestone, dependency, owner, status, priority, and outcome.
4. **Content graph:** file, folder, native document, native/bounded sheet, version, comment, citation, signature envelope, and canonical record link.
5. **Time:** event, schedule, availability, due date, time entry, attendance, leave, and period.
6. **Intake and decision:** form/submission, approval, review, exception, policy, notification, and external portal action.
7. **Event and automation:** typed domain event, trigger, condition, action, idempotency, human checkpoint, retry, and audit.
8. **Commercial/operational transaction:** product/service, quote/order, stock movement, invoice/bill, payment status, payroll input, and immutable ledger reference.
9. **Discovery and intelligence:** canonical search, saved view/report, permission-safe analytics, cited answer, and human-reviewed proposed action.

These are shared semantics, not a mandate for one generic database table. Financial postings, payroll results, files, and work items need domain-specific invariants while retaining stable cross-record references.

## Feature priority

### Release-blocking must-haves

No module should be marketed as part of the suite until its named job completes safely end to end.

1. **One identity and permission model:** consistent membership, groups, roles, field/action permissions, audit, session controls, and immediate authoritative revocation.
2. **Canonical records and links:** stable IDs; customer, employee, project, ticket, document, order, and transaction links without copying source data.
3. **Suite shell:** coherent navigation, global create/search, recents, inbox/attention queue, breadcrumbs, and role-specific home—not a second generic dashboard.
4. **Shared lifecycle behavior:** drafts, approvals, comments, mentions, notifications, versions, archive/trash, restore, export, retention, and honest error/denied/offline/conflict states.
5. **Three proven golden workflows:** lead-to-signed-project, hire-to-productive/payroll-handoff, and support-request-to-resolution/knowledge/product-work.
6. **Safe automation:** typed triggers/actions, conditions, approvals, idempotency, retries, partial failure visibility, audit, and a kill switch.
7. **Portable data:** documented APIs/webhooks, tenant export, bounded imports, CSV where appropriate, and migration tooling that reports unsupported fields.
8. **Drive-first Docs foundation:** first-class files/folders, My Files, Team Folders, explicit Shared with me, safe upload/preview/download, search, version restore, and inherited permissions.
9. **Real spreadsheet contract:** XLSX/CSV original bytes preserved; safe preview, indexing, share/version/audit parity, explicit supported fidelity, and one production open/edit path. No “Excel inside StreamlineOS” claim before round-trip tests pass.
10. **Operational correctness:** tenant isolation, canonical authorization on list/search/AI/export, transactional writes/outbox, observability, quotas, backup/restore, and no silent caps.

### Baseline/basic capabilities

- CRM: contacts/companies, pipeline, activities, email/calendar linkage, quote handoff, owner/history, imports, and reporting.
- HR: employee record, org structure, onboarding, leave/time/attendance inputs, documents, approvals, and payroll-provider handoff.
- Work: task/project hierarchy, assignees, dependencies, list/board/calendar/timeline where the job requires it, forms, time, guests, and templates.
- Docs: rich text, folders/files, comments, mentions, versions, sharing, search, templates, and contextual Ask with citations.
- Calendar: external calendar sync, shared schedules, scheduling links, work-item dates, reminders, and timezone-safe behavior.
- Support: omnichannel intake where supported, ticket ownership/status/SLA, customer context, knowledge suggestions, escalation, and feedback.
- Inventory/finance: products, orders, basic stock movements, invoicing/bills, approval and reconciliation handoffs, period-safe audit, and exports; do not claim a full localized ERP before it is one.
- Sign: envelope creation from a canonical file, signer state, reminders, final immutable artifact, evidence trail, and provider failure handling.
- Spreadsheet: tabs, values, basic formulas, formatting, sort/filter, freeze, comments/versioning, protected ranges, and CSV/XLSX interchange only if a native bounded sheet is selected; otherwise expose the provider contract honestly.

### Good-to-have after the core is credible

- Custom fields, validated custom objects, saved views, forms, dashboards, and reusable workflow templates within governance limits.
- Customer/vendor/employee portals with narrowly scoped actions.
- Resource/capacity planning, budgets, forecasts, utilization, and margin views.
- Multi-entity, multi-currency, localization packs, and country payroll integrations based on chosen markets.
- Data warehouse/BI connectors, sandbox environments, SCIM/SAML, audit export, DLP hooks, and configurable retention.
- Mobile/offline workflows for field work, inventory scans, approvals, and time capture.
- Additional Microsoft/Google/Slack/accounting/payroll/e-commerce connectors after the connector framework and deletion/revocation semantics are proven.
- Odoo-style live report blocks that insert an authorized saved list/pivot/chart into a sheet or document and refresh from source.

### WOW/differentiating capabilities

1. **Commitment-to-outcome graph:** open a customer promise and see the signed scope, project, staffing, decisions, documents, support risks, inventory dependencies, invoice state, and realized margin.
2. **Closed-loop customer evidence:** repeated support/CRM evidence becomes a reviewed product item; delivery updates the knowledge article and notifies only affected customers.
3. **Hire-to-productive orchestration:** an approved role opens recruiting/onboarding, provisions tasks/access/assets, schedules training, prepares payroll inputs, and proves every handoff.
4. **Cited operating answers:** ask “Which renewals are at risk because committed work is late?” and receive permission-safe evidence across CRM, projects, support, documents, and invoices.
5. **Actionable documents and sheets:** extract a reviewed table, contract clause, or live report into draft CRM/HR/project/finance actions with a visible diff and human approval.
6. **Change-impact preview:** before moving, restricting, archiving, or changing a shared record, show affected automations, documents, citations, portals, reports, and downstream owners.
7. **Exception-first operations:** prioritize missing approvals, contradictory data, stale knowledge, inventory risk, payroll anomalies, SLA risk, and failed integrations by impact and owner rather than showing vanity totals.

## Anti-features

1. **A generic “build anything” database as the primary product.** It makes customers design their own operating system and weakens domain correctness.
2. **A fake spreadsheet.** A decorative grid without import fidelity, formulas, permissions, versions, and an honest export contract will lose trust.
3. **Excel parity as an early goal.** Calculation engines, charts, pivots, collaboration, add-ins, macros, and file fidelity are a product category.
4. **Separate customer/person/file/automation models per module.** Shared navigation over duplicated data is not a suite.
5. **Permanent dual-write between old and new models.** Use a migration ledger, compatibility adapters, cutover, and deletion gates.
6. **One universal status or activity feed.** Domain lifecycles differ; attention should be role- and outcome-specific.
7. **Autonomous high-impact actions.** AI must not publish, alter access, sign, post journals, pay, change payroll, or move stock without deterministic authorization and required human approval.
8. **Unbounded workflow scripting for ordinary admins.** Prefer typed events/actions and governed extension points; arbitrary code creates security and support debt.
9. **A whiteboard, video meeting, chat, email host, tax engine, or payment rail built merely for suite completeness.** Integrate mature infrastructure unless a measured strategic advantage justifies ownership.
10. **Country-wide accounting/payroll claims based on generic fields.** Localization means tax rules, filings, audit, compliance updates, corrections, and certified operational proof.
11. **AI or dashboard theater.** Every answer needs evidence; every dashboard needs a decision and drill-down action.
12. **A connector marketplace before connector operations work.** Auth rotation, rate limits, replay, tombstones, ACL mapping, deletion, sync lag, and failure recovery come first.

## Odoo Spreadsheet analysis

Odoo Spreadsheet is strategically important because it is not merely an uploaded workbook:

- XLSX and CSV files can be uploaded in Documents and opened for editing in Odoo Spreadsheet. Odoo warns that the source file is sent to trash by default unless the user preserves it. [O6]
- Users can insert Odoo lists, pivot tables, charts, and financial data. Each inserted element creates a data source connected to the underlying Odoo model; data refreshes when the spreadsheet opens/reloads or when the user refreshes it. Multiple apps/models can feed one spreadsheet. [O5]
- Global filters act on underlying connected data rather than only visible cells. Supported filter types include date, relation, text, yes/no, selection, and numeric. [O7]
- It supports standard spreadsheet functions plus Odoo-specific functions for pivots and global filters. Odoo explicitly marks some Odoo functions as not Excel-compatible. [O8]
- Collaboration includes inherited or file-level permissions, comments/chatter, and automatic version history. Download to XLSX freezes dynamic Odoo values at export time. [O9]

### Why this works

The spreadsheet becomes a **composable reporting surface over the operational system of record**. A finance, sales, payroll, or project user can combine live model data, formulas, narrative, filters, and charts without first building a separate BI dashboard. That is a stronger job than “we support XLSX.”

### Risks StreamlineOS must address

- File access alone cannot grant access to every live source record. Every refresh, preview, export, AI read, and shared link must evaluate current source permissions.
- Exported workbooks cannot preserve proprietary live functions. Unsupported/dynamic cells must be frozen or clearly reported; silent semantic drift is unacceptable.
- A live report is not automatically a write-back form. StreamlineOS should not let cell edits bypass CRM, HR, inventory, payroll, or accounting validations.
- Spreadsheet copies can become shadow systems of record. Canonical data blocks should retain source IDs, refresh state, provenance, and “open source record” actions.
- Round-trip fidelity requires a representative workbook corpus, not a marketing checklist.

### Recommended StreamlineOS response

1. **Now:** treat XLSX/CSV as first-class Drive objects with original-byte preservation, preview, extraction, search, sharing, versions, retention, and audited open/download.
2. **Next:** integrate one production-grade editor path and build a provider-neutral saved-report/data-block contract. A data block holds source query, columns, filters, permission policy, revision, and refresh state.
3. **Later, only after demand:** offer a bounded native “Live Sheet” for core values/formulas, sort/filter, protected ranges, comments, and authorized StreamlineOS data blocks. Do not support macros or promise Excel parity.

## Reconciliation: old “no spreadsheets” language vs Drive-first

The repository does **not** contain a locked decision that all spreadsheets are forbidden. The older documents make three narrower statements:

- arbitrary relational databases inside pages are rejected;
- unbounded custom databases and formulas are an anti-feature;
- a spreadsheet/database runtime is a separate product and should not distract from trustworthy knowledge.

The 2026-10-20 Drive-first decision is newer and explicitly selects a shared document workspace with spreadsheet support. The compatible interpretation is:

- **Still rejected:** turning every page into an arbitrary database, building an unbounded formula/runtime platform, or claiming Excel parity.
- **Now required:** spreadsheets as first-class file objects with safe preview/search/share/version lifecycle and a real edit/open contract.
- **Conditionally allowed:** a bounded native sheet after provider integration and measured demand prove that native StreamlineOS data blocks create enough value.
- **Unchanged:** `kb_pages` remains canonical for existing Wiki pages during transition; My/Shared semantics, ACL checks, search, citations, retention, and no-deletion gates remain in force.

Thus Drive-first narrows and changes the previous scope guard; it does not justify a generic page database or an immediate spreadsheet-engine build.

## Build vs integrate

| Capability | Recommendation | Reason |
|---|---|---|
| Identity, tenancy, permission evaluation, audit, retention | **Build/own** | These govern every disclosure and mutation and are the trust boundary of the suite. |
| Canonical party/work/content links and cross-module record graph | **Build/own** | This is the primary differentiation and cannot be delegated without recreating silos. |
| CRM, projects/product work, support context, Docs metadata/lifecycle | **Build/own** | These are the daily operating loops where StreamlineOS can create native handoffs. |
| Typed event/automation/approval platform | **Build/own** | Cross-module workflows are the suite's coherence layer; provider connectors plug into it. |
| Search, permission-safe retrieval, citations, impact graph | **Build/own** | The same policy must govern UI, search, AI, exports, notifications, and portals. |
| Spreadsheet calculation/editor engine | **Integrate first** | Microsoft Excel or Google Sheets already define fidelity and collaboration expectations. Preserve originals and choose one provider after licensing/security validation. |
| StreamlineOS live saved-report/data-block semantics | **Build/own** | Odoo's advantage comes from live operational data, provenance, and filters—not generic cell editing. |
| Email, external calendar, meetings, chat | **Integrate** | Microsoft/Google/Slack already own identity, delivery, spam, calendaring, conferencing, and user habits. |
| E-sign trust infrastructure | **Hybrid** | Own the envelope workflow, record links, permissions, state, reminders, and immutable final artifact; integrate identity/certificate/legal evidence where required. |
| Payments, banking feeds, tax filing, payroll rails | **Integrate by country** | These are regulated, change frequently, and require operational networks and certifications. Own approvals, inputs, reconciliation state, and audit. |
| General ledger and inventory | **Strategic choice** | Build only for selected segments/localizations with accounting-grade invariants; otherwise integrate and own operational handoffs. Inventory can be native earlier if distribution is a target ICP. |
| AI models, OCR, document conversion, malware scanning | **Integrate engines; own policy/orchestration** | Provider capability is commodity; authorization, prompts, evidence, human review, cost, retention, and fallback are not. |
| BI/data warehouse | **Hybrid** | Own operational saved views and action-oriented metrics; integrate deep analytics/warehouse destinations. |

Preferred spreadsheet path: validate Microsoft 365 open/edit integration first for XLSX fidelity and enterprise adoption, with desktop-open as a safe fallback. Do not assume browser embedding or round-trip rights until commercial, licensing, and technical tests pass. Add Google Workspace only when target-customer demand justifies a second lifecycle and permission adapter.

## 0/1/2 roadmap

### 0 — Prove coherence and contracts

**Goal:** make the suite safe and understandable before expanding it.

- Approve the shared primitive catalog, record-link contract, ownership boundaries, event catalog, and canonical authorization interface.
- Define the three golden workflows and map every state, handoff, approval, failure, rollback, audit event, and owner.
- Establish one suite shell: global create/search, attention inbox, recents, contextual links, and role-aware navigation.
- Implement the Drive-first object/migration contract without deleting or dual-writing `kb_pages`; preserve explicit My/Shared semantics.
- Deliver spreadsheet-ready files: XLSX/CSV original preservation, safe preview/extraction, search, share/version/trash parity, and desktop/provider open.
- Inventory existing CRM/HR/Build/Support/finance/inventory/sign/payroll capabilities against marketed claims; hide or relabel incomplete claims rather than stub them.
- Baseline activation, multi-module use, duplicate-entry rate, workflow completion, permission incidents, latency, and support burden.

**Exit gate:** one pilot tenant completes each golden workflow without manual CSV reconciliation; every cross-module link is permission-safe, auditable, reversible where appropriate, and observable.

### 1 — Ship a credible connected suite

**Goal:** make selected ICPs able to run daily operations.

- Productionize lead-to-signed-project-to-invoice handoff, hire-to-productive/payroll handoff, and support-to-knowledge/product-resolution.
- Ship shared forms/intake, typed automation, approvals, notifications, external portal actions, and integration failure queues.
- Complete Drive-first My Files, Team Folders, Shared with me, search, versions, access inheritance, and record-linked documents.
- Select one spreadsheet provider path; ship saved report/data blocks, permission-safe refresh/export, and fidelity telemetry.
- Integrate Microsoft/Google email/calendar, one accounting/payment path, selected payroll localizations/providers, and e-sign evidence.
- Add action-oriented customer, workforce, project, support, inventory, and cash-risk views using canonical records—not replicated dashboards.
- Ship admin controls, API/webhooks, tenant export, connector monitoring, quotas, and tested recovery.

**Exit gate:** target customers use at least three modules weekly, golden-workflow completion is reliable, and integrations fail visibly without corrupting canonical state.

### 2 — Differentiate through operating intelligence

**Goal:** turn connected records into outcomes competitors cannot easily reproduce.

- Commitment-to-outcome graph, customer-evidence loop, hire-to-productive orchestration, and change-impact preview.
- Permission-safe cross-module cited answers with deterministic search/report fallback.
- Exception-first operating queues with accountable owners and measured resolution.
- Actionable extraction from documents/sheets into reviewable domain actions.
- Bounded native Live Sheet only if Phase 1 data proves recurring provider friction and enough demand for StreamlineOS-native live data blocks.
- Expand localizations, inventory/accounting depth, and ecosystem connectors only for segments that meet adoption and revenue gates.

**Exit gate:** differentiated workflows measurably reduce cycle time, re-entry, and unresolved exceptions without increasing permission, financial, or payroll incidents.

## Measurable outcomes and release gates

Targets below are proposed starting points; Phase 0 must establish baselines before contractual commitments.

| Outcome | Metric | Proposed gate |
|---|---|---|
| Fast activation | Median time from tenant creation to first completed golden workflow | ≤ 1 business day for guided pilots |
| Suite adoption | Activated organizations with weekly active use in 3+ modules by day 60 | ≥ 50% |
| Less reconciliation | Golden-workflow instances requiring manual CSV copy/re-entry | < 5% |
| Clean shared data | Duplicate canonical customer/employee/project records introduced by cross-module handoffs | < 1%; every duplicate is explainable and mergeable |
| Reliable automation | Successfully completed eligible automation runs, excluding user-correctable validation | ≥ 99.5%; no silent partial success |
| Safe access | Cross-tenant/unauthorized title, count, snippet, file, citation, export, or notification disclosure | Zero |
| Revocation | Authoritative detail access after revocation; search/Ask propagation | Immediate detail failure; existing hard bound ≤ 60 seconds |
| Knowledge value | Weekly successful knowledge resolutions | Retain as Docs north star; improve from measured baseline each release |
| Docs performance | Page read p95; list/search p95; Ask first-token p95 when provider healthy | Preserve existing targets: < 250 ms; < 500 ms; < 2.5 s |
| Spreadsheet safety | Supported-corpus import/export fidelity; original preservation; unsupported feature reporting | 100% originals preserved; ≥ 99% supported-cell equivalence; zero silent feature loss |
| Integration health | Interactive sync success and non-interactive sync freshness | ≥ 99.5%; p95 freshness < 5 minutes; failures visible with retry |
| Operating impact | Median cycle time for each golden workflow | ≥ 30% improvement versus the customer's measured prior process |
| Consolidation | Customers retiring or materially reducing use of overlapping tools by day 90 | Median ≥ 2 tools among successful pilots |
| Trustworthy AI | Displayed factual operating answers with current, openable citations | 100%; insufficient evidence shown instead of uncited claims |
| Cost discipline | Infrastructure/provider cost per weekly active organization and per successful AI answer | Within approved tenant budgets with deterministic fallback |

## First-party source register

All sources below were accessed on **2026-10-20**.

### Odoo

- **[O1]** Odoo CRM features: https://www.odoo.com/app/crm-features
- **[O2]** Odoo Project: https://www.odoo.com/app/project
- **[O3]** Odoo Documents: https://www.odoo.com/app/documents
- **[O4]** Odoo Studio: https://www.odoo.com/app/studio
- **[O5]** Odoo 19, insert and link Odoo data in Spreadsheet: https://www.odoo.com/documentation/19.0/applications/productivity/spreadsheet/insert.html
- **[O6]** Odoo 19, Spreadsheet get started/import: https://www.odoo.com/documentation/19.0/applications/productivity/spreadsheet/get_started.html
- **[O7]** Odoo 19, Spreadsheet global filters: https://www.odoo.com/documentation/19.0/applications/productivity/spreadsheet/work_with_data/global_filters.html
- **[O8]** Odoo 19, Spreadsheet formulas and functions: https://www.odoo.com/documentation/19.0/applications/productivity/spreadsheet/work_with_data/functions.html
- **[O9]** Odoo 19, Spreadsheet sharing and collaboration: https://www.odoo.com/documentation/19.0/applications/productivity/spreadsheet/share_collaborate.html
- **[O10]** Odoo Payroll: https://www.odoo.com/app/payroll

### Zoho

- **[Z1]** Zoho One operating system for business: https://www.zoho.com/one/
- **[Z2]** Zoho One product resources/application catalog: https://www.zoho.com/one/resources.html
- **[Z3]** Zoho Sheet features: https://www.zoho.com/sheet/features.html

### Microsoft

- **[M1]** Microsoft 365 for business: https://www.microsoft.com/en-us/microsoft-365/business
- **[M2]** Microsoft Dynamics 365: https://www.microsoft.com/en-us/dynamics-365
- **[M3]** Microsoft Power Platform: https://www.microsoft.com/en-us/power-platform
- **[M4]** Microsoft Learn, unified finance/operations and Power Platform environment: https://learn.microsoft.com/en-us/power-platform/admin/unified-experience/finance-operations-apps-overview

### Google

- **[G1]** Google Workspace applications/features: https://workspace.google.com/features/
- **[G2]** Google Sheets: https://workspace.google.com/products/sheets/
- **[G3]** Google Workspace Help, manage AppSheet: https://knowledge.workspace.google.com/admin/appsheet/manage-appsheet-in-your-organization

### monday.com

- **[MD1]** monday.com product portfolio: https://support.monday.com/hc/en-us/articles/4409505489554-Introduction-to-monday-com-s-products
- **[MD2]** monday workdocs: https://monday.com/w/workdocs

### ClickUp

- **[C1]** ClickUp product features: https://clickup.com/features
- **[C2]** ClickUp views and Table: https://clickup.com/features/views
- **[C3]** ClickUp Docs: https://clickup.com/features/docs

### Notion

- **[N1]** Notion projects: https://www.notion.com/product/projects
- **[N2]** Notion Enterprise Search: https://www.notion.com/help/enterprise-search
- **[N3]** Notion Calendar with Notion databases: https://www.notion.com/help/use-notion-calendar-with-notion

### HubSpot

- **[H1]** HubSpot Customer Platform: https://www.hubspot.com/products/customer-platform
- **[H2]** HubSpot Enterprise Customer Platform: https://www.hubspot.com/products/crm/enterprise

### Rippling

- **[R1]** Rippling product ecosystem: https://www.rippling.com/products
- **[R2]** Rippling platform: https://www.rippling.com/platform
- **[R3]** Rippling Recruiting and workforce lifecycle: https://www.rippling.com/products/hr/recruiting

### Atlassian

- **[A1]** Jira features: https://www.atlassian.com/software/jira/features
- **[A2]** Confluence features: https://www.atlassian.com/software/confluence/features
- **[A3]** Atlassian Rovo and Teamwork Graph context: https://www.atlassian.com/software/rovo
