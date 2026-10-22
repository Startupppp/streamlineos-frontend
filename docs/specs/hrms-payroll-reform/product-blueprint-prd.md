# HRMS People Product Blueprint

> Normative acceptance reference only. Dispatch and status live in
> [README.md](./README.md). This document defines the product; it is not a
> session-sized implementation task.

## Product Outcome

StreamlineOS People is one coherent, privacy-safe system for an employee,
manager, HR operator, payroll operator, and executive to complete workforce
work without learning the underlying module boundaries. It supports a
freelancer or ten-person company without setup theatre and scales to a
multi-entity, multi-country enterprise without client-side filtering, duplicate
records, or role leakage.

Success means:

- no visible link, notification, breadcrumb, card, row action, or back action
  reaches a 404, wrong tenant, denied-but-leaking page, or dead end;
- one worker identity and effective-dated employment history drive HR, time,
  leave, payroll inputs, documents, performance, and workforce analytics;
- self-service remains simple while admin depth is progressively disclosed;
- search, filters, exports, bulk actions, and totals describe the full scoped
  result set, not only the rows currently loaded;
- forms communicate requiredness and validate the same contract in UI, API,
  service, and database layers;
- sensitive workforce data is purpose-limited, audited, retained, and revealed
  only to authorized actors; and
- browserless agents can implement and test bounded slices while separate
  packets supply browser, real-database, provider, and human evidence.

## Scope and Canonical Ownership

| Capability | Canonical surface | Contract |
|---|---|---|
| Employee self-service | `/me/*` | Available to active members; never requires HR-admin navigation |
| People operations | `/hr/*` | Other-person administration, scoped by permission and DataScope |
| Directory and membership | `/directory/*` and Administration Directory | Person/contact discovery and organization membership, not HR case data |
| Payroll administration | `/payroll/*` | Runs, salary structures, inputs, payouts, tax, bank, payslips, FnF settlement |
| Calendar | `/calendar` | HR contributes sources; there is no duplicate `/hr/calendar` |
| Recruitment | Recruitment product | Boundary only: approved hire handoff and headcount signals |

Locked decisions D01–D14 in [00-product-decisions-prd.md](./00-product-decisions-prd.md)
apply. In particular, Directory workers/engagements become the system of record
through a measured strangler; announcements remain Home-only; service delivery
merges into Cases; reimbursements operations live in Payroll; manager home is
`/me/team`; WFO/WFH are first-class; simulator is not customer navigation; and
company settings live in global organization settings.

## Personas and Default Jobs

| Persona | Default home | Primary jobs | Never expose by default |
|---|---|---|---|
| Employee/contractor | `/me` | profile, attendance, leave/WFH, expenses, documents, tasks, pay | HR administration, peer compensation, private cases |
| Manager | `/me/team` | roster, exceptions, approvals, goals, availability, quick contact | payroll runs, medical/accommodation detail, unscoped workforce |
| HR operator | `/hr` | employee lifecycle, policies, cases, documents, analytics, compliance | payroll mutations without Payroll permission |
| Payroll operator | `/payroll` | inputs, runs, reconciliation, payouts, payslips, statutory setup | unrelated HR case/document content |
| Executive | `/hr/analytics` | aggregates, headcount, cost, attrition, capacity | person-level sensitive detail without explicit drill permission |
| Auditor/legal | purpose-specific deep link | immutable evidence, retention/legal holds, export | operational mutation controls |
| Freelancer/small-company owner | `/hr` with simplified IA | people, time, leave, documents, pay setup | empty enterprise governance categories until enabled |

Impersonation/support access must display a persistent banner, reason, expiry,
and audit event. Delegates inherit only the delegated action and time window,
not the delegator's full role.

## Information Architecture and Sidebar

The sidebar is a stable map, not a page inventory. It exposes at most two
levels; deeper destinations live in hubs, tabs, search, and contextual actions.
Groups appear only when the actor has at least one accessible child.

| Group | Primary entries | Notes |
|---|---|---|
| Overview | HR Home, My work | Queue/metrics, no duplicate analytics dashboard |
| People | Employees, Org & directory, Lifecycle | Manager uses `/me/team`; org chart is a view/hub |
| Time | Attendance, Leave & WFH, Holidays, Time clocks | Devices and biometric events share `Time clocks` parent |
| Experience | Onboarding, Performance, Engagement, Learning | Hide disabled modules; surface pending work in My work |
| Operations | Cases, Helpdesk, Documents, Assets, Expenses & travel | Service delivery merges into Cases |
| Rewards | Compensation, Benefits, Equity, Payroll | Payroll entry deep-links to `/payroll`; do not duplicate its page tree |
| Insights | Workforce analytics, Reports | Saved reports and exports belong inside the hub |
| Settings | HR settings | Company settings links to `/settings/organization` |

Sidebar rules:

- selection derives from route identity and scope, never the last clicked item;
- expanded state may persist per user, but cannot make a hidden route reachable;
- direct load, refresh, deep link, new tab, browser Back/Forward, and deleted
  entity fallback all produce the same active item and breadcrumb;
- desktop collapse preserves tooltips and keyboard access; mobile uses a sheet
  with focus trap, Escape, route-change close, and 44px targets;
- search/command palette covers authorized destinations and entities; it is not
  a substitute for stable primary navigation;
- badges are bounded (`99+`), permission-safe, cached briefly, and never fetched
  once per nav item; and
- module-disabled and denied states are distinct. Disabled shows upgrade/admin
  guidance; denied reveals no sensitive record existence.

## Page Disposition and Anatomy

The per-route authority is HRM-14a–14g. Every current or proposed page has one
of: `KEEP`, `KEEP_WITH_REDESIGN`, `MERGE`, `MOVE`, `ADD`, `REMOVE`, `BOUNDARY`,
or `INTERNAL_ONLY`. A generated census must account for 162 authenticated page
files plus `/employee-onboarding`; counts change only with an approved catalog
diff.

Every retained list page includes: title and job statement; permission-aware
primary action; URL-backed search/filter/sort/view state; saved view when useful;
bounded server collection; selection/bulk state; loading/empty/no-results/error/
denied/module-disabled states; export when justified; responsive behavior; and
stable detail/back target. Every detail page includes identity, status, key
facts, contextual actions, activity/audit where appropriate, and not-found that
does not leak cross-tenant existence.

Remove or merge page-shaped duplication:

- merge `/hr/service-delivery` into Cases after data/link/permission parity;
- remove `/hr/reimbursements` after callers use `/payroll/reimbursements`;
- remove the `/hr/settings/company` shim after hubs link directly;
- make `/hr/org` read-only then remove duplicate hierarchy writes;
- remove `/hr/simulator` from customer surfaces (internal-admin gate or delete);
- keep Devices and Biometric events as distinct jobs under one nav parent; and
- keep Recruitment pages as a separately owned boundary, not HRMS leaf work.

Required additions include `/me/team`, policy acknowledgement self/admin
surfaces, honest import-job status where missing, HR notification preferences,
and any route explicitly marked `ADD` in HRM-14.

## Search, Filters, Views, and Pagination

### Search contract

- Search is scoped and server-side. It is ANDed with structured filters and ORs
  only across the documented searchable fields.
- Default debounce is 300ms, with abort/cancellation and stale-response
  protection. Enter may trigger exact employee code, ticket, or request IDs.
- Do not fire broad server search below two characters unless it is an exact-ID
  detector. Empty search omits the predicate.
- Normalize case, Unicode, whitespace, phone digits, and dates consistently;
  document accent/fuzzy behavior. Never search payroll IDs or sensitive document
  bodies through general people search.
- URL state is canonical for shareable page discovery. Back/Forward restores it;
  unknown values produce a field-level 400 or are removed explicitly, never
  silently broaden scope.

### Filter contract

Static enums are versioned Zod/API contracts. Dynamic options (department,
team, manager, location, policy, shift, leave type, assignee, category, custom
field) come from authorized, searchable, cursor-paginated option endpoints.
Archived values already selected remain visible/removable but cannot be newly
assigned. Options are dependent where needed (entity → location → department),
cancellable, cached by tenant/actor/scope/version/search, and invalidated by the
owning mutation.

Custom-field filters use typed operators, indexed normalized values, and field
visibility. A user who cannot see a field cannot infer its values or counts.
The same canonical filter AST drives list, count, export, bulk-all selection,
saved view, and analytics drill-through.

### View selection

| Work shape | Default | Allowed alternatives | Avoid |
|---|---|---|---|
| People/requests/payroll/audit | Table | compact list, cards for small self/manager sets | Kanban employees/payroll |
| Status workflow | Table | board for Cases/onboarding when transitions are real | decorative board |
| Time/availability | Table | calendar/timeline with accessible list equivalent | calendar-only interaction |
| Org structure | graph neighborhood | searchable directory/table fallback | loading entire company graph |
| Dashboards | aggregates + short queues | drill-through lists | paginated KPI cards |

### Pagination

Use keyset/cursor pagination for growing, reorderable collections. Default 25 or
50, maximum 100. Counts are optional but must use the same predicate. Offset/
page numbers are allowed only when customers need stable page jumps or a report
contract and the query cost is proven. Remove pagination from detail, wizard,
bounded settings (<30 with a hard server cap), calendar cells, and aggregate
widgets. Virtualization improves rendering but never replaces bounded reads.

## Cards, Rows, and Bulk Actions

Cards and rows share one action registry so permissions, disabled reasons,
optimistic behavior, telemetry, and menu order cannot drift.

Standard actions: open, edit, archive/restore, copy link, assign/reassign,
status transition, add note, view audit, export/download, and domain-specific
approve/reject/cancel/retry. Destructive actions require consequence text and
the appropriate confirmation; payroll finalization, termination, irreversible
deletion, legal-hold release, and payout are never configurable away.

Configurable per tenant/role: visible optional metadata, compact/dense display,
saved columns, default view, safe quick actions, workflow labels within allowed
states, and notification preference. Not configurable: authorization,
required audit, legal retention, financial invariants, tenant scope, validation,
idempotency, or disclosure of protected data.

Bulk actions require explicit selection semantics:

- `selected IDs` or `all matching canonical filter`, never ambiguous select-all;
- preflight returns eligible/ineligible counts and per-reason summaries;
- authorization and current-state validation rerun per record on the server;
- destructive/high-impact operations require confirmation and idempotency key;
- one transaction only when all-or-nothing is a true business invariant;
  otherwise return per-item success/failure with safe retry;
- selection clears or reconciles after filter/data changes; and
- large imports/exports/updates use a durable job with progress, cancellation
  rules, downloadable error rows, audit, and notification.

Minimum bulk backlog: leave/WFH decide, attendance regularize, employee status/
manager/department updates, document request/remind/archive, case assign/status,
asset assign/return, expense/travel decide, goal assign/status, and payroll input
validation/retry. Payout/finalize remains a controlled batch workflow, not a
generic checkbox action.

## Forms and Validation

One feature-owned Zod schema is the canonical boundary contract. The form uses
it through the resolver; the API parses query/params/body; services enforce
authorization and race-sensitive business invariants; the database enforces
uniqueness, references, ranges, and state integrity. Generated/shared types may
derive from the schema, but a client-only clone is forbidden.

Every field inventory states: label, help text, type, required/conditional/
optional state, default, normalization, constraints, permission/field visibility,
error copy, persistence owner, and audit sensitivity. An asterisk, `aria-required`,
schema optionality, API DTO, and DB nullability must agree. Hidden conditional
fields are cleared or deliberately retained by an explicit rule.

Universal validation:

- trim and normalize strings; reject whitespace-only values and unsafe markup;
- validate UUID/slug/enum/date/currency/timezone/locale/phone/email at boundary;
- use organization-local dates for policy days and instants for events;
- enforce start ≤ end, effective-date non-overlap, locked payroll period rules,
  employment/policy eligibility, and manager/org membership;
- amounts use currency-aware decimal precision, never floating-point money;
- files validate actual type, size, malware status, ownership, retention, and
  signed-access expiry; filenames are not trusted MIME proof;
- edits use version/ETag or equivalent conflict handling and preserve user input;
- submit is idempotent, double-click safe, accessible, and shows field plus
  summary errors; and
- server errors map to stable codes, never raw SQL/internal detail.

Domain matrices remain in HRM-06, HRM-12, HRM-13, and HRM-14. Missing schema or
API parsing is a separate form/operation child, not one “validate all forms” task.

## Data, API, Cache, and Architecture

### API/list contract

Every operation declares actor, tenant, DataScope, permission, request schema,
response projection, error codes, idempotency, audit event, cache writer, and
bounded read. Field selection is server-controlled; sensitive columns are not
fetched and then hidden. Mutations re-read authorization in the transaction.
Cross-tenant and unauthorized lookup use indistinguishable not-found behavior
where existence is sensitive.

Lists select only required columns, join once, batch relations, and avoid N+1.
List/count/export share a predicate builder. Sorts have stable unique tie-breaks.
Indexes lead with tenant/scope and support actual filter/sort combinations;
`EXPLAIN (ANALYZE, BUFFERS)` is recorded against realistic distributions.

### Cache contract

Keys include tenant, actor/role or visibility fingerprint, DataScope,
entitlement/config version, resource version, filters, sort, cursor, locale,
and projection as applicable. Private HR/payroll data never uses public/shared
cache semantics. One mutation-to-reader matrix identifies exact query keys,
dashboard metrics, option lists, calendar sources, payroll inputs, search index,
and exports affected. Prefer response patching plus narrow invalidation; broad
module invalidation is a measured fallback. Events/outbox make cross-module
effects durable and idempotent; stale data has a stated maximum age.

### System boundaries

- Directory person, organization member, worker engagement, employment facts,
  and payroll profile are distinct concepts with stable IDs and one write owner.
- Effective-dated employment, manager, org assignment, compensation, policy,
  tax, and work-location facts preserve history and future changes.
- HR emits durable domain events; Payroll, Calendar, Search, Notifications, and
  Analytics consume them idempotently instead of dual-writing each other's tables.
- Imports stage, validate, preview, commit, reconcile, and roll back; exports are
  auditable snapshots with expiry.
- Background jobs have dedupe keys, retry classes, dead-letter/replay, actor
  context, progress, cancellation semantics, and tenant-safe observability.
- Schema barrels, module registration, migration journal, permission catalogs,
  route manifests, and generated contracts each have a single serialized owner.

## Privacy, Security, Compliance, and Global Scale

Treat compensation, bank/tax, identity, health/accommodation, disciplinary,
case, and protected document data as field-classified. Require least privilege,
purpose-specific access, encryption, immutable audit, download watermarking
where policy requires it, retention/legal hold, subject export/correction flows,
and regional storage/processing controls. Analytics apply minimum cohort sizes
and suppress inference-prone slices.

Support concurrent/rehire engagements, contingent workers, multiple legal
entities, multiple managers, matrix teams, local calendars, time zones, locales,
currencies, names/addresses, right-to-work expiry, country policy packs, and
payroll-provider boundaries. Never encode one country's tax or weekend rules in
the global worker model.

Accessibility: WCAG 2.2 AA target, logical focus, screen-reader names/status,
keyboard parity, reduced motion, zoom/reflow, non-color-only state, and an
accessible alternative for graphs/calendars. Deskless/mobile flows prioritize
check-in, leave/WFH, approvals, documents, expenses, pay, and low-bandwidth
resilience; offline writes queue only where conflict and security rules are safe.

## Visual System

Use semantic tokens, never one-off colors. Required elevation stack:

| Surface | Role |
|---|---|
| `canvas` | app/page background |
| `surface` | default card/table/panel |
| `surface-subtle` | grouped rows, secondary regions |
| `surface-raised` | popover/dropdown/sheet |
| `surface-overlay` | dialog/command palette over scrim |

Each adjacent layer must remain distinguishable in light, dark, high-contrast,
hover, selected, disabled, and error states. Sheets/dialogs use border, shadow,
and scrim in addition to color. Status colors use semantic foreground/background/
border pairs and text/icons; charts use accessible palettes and legends. Dense
tables support pinned identity, column controls, responsive priority, and no
horizontal-scroll traps.

## Competitive Direction

The baseline is the connected suite expected from modern HR platforms: unified
core worker data, self-service, time/attendance/leave, payroll and benefits
connections, performance, compensation, workforce planning/analytics, employee
experience, compliance/localization, skills and internal mobility, and guided
automation. Parity is not a reason to duplicate pages.

Prioritize after integrity and privacy:

1. manager team home and one approvals inbox;
2. policy acknowledgement, document expiry, mobile approvals, org search/export;
3. skills profile, internal opportunities, headcount scenarios, compensation
   bands/calibration, engagement listening, and learning/compliance assignments;
4. permission-grounded HR assistance that drafts/explains/summarizes but requires
   human confirmation for employment, pay, access, or legal consequences; and
5. StreamlineOS differentiation: cross-work visibility into staffing, workload,
   delivery risk, calendar, chat, mail, and CRM through permission-safe deep
   links—not schema fusion.

Explicit non-goals: full ATS delivery in this program, country tax-engine
replacement without a country pack, benefits-carrier integration without a
partner contract, employee social feed, or generic device-management suite.

## Telemetry and Success Measures

Track route 404/wrong-destination rate, task completion, search success and
zero-results, filter latency, list p95/p99, query count/read rows, approval age,
bulk partial-failure/retry, form error and abandonment, stale-cache incidents,
permission denials/leak tests, payroll reconciliation, import error recovery,
mobile completion, accessibility defects, and support contacts. Segment by
persona, org size, entity/country, and device without capturing sensitive field
values.

Release SLOs and numeric budgets are fixed per packet/environment, not invented
after implementation. Any AI recommendation additionally tracks abstention,
human override, provenance, protected-class risk, and forbidden autonomous
actions.

## Definition of Product Complete

- Generated inventories account for every route, nav destination, mutation
  form, controller operation, and schema/table with an owner and packet.
- Every retained page satisfies its HRM-14 row and the shared contracts above.
- Removed/merged pages have zero callers, migration/reconciliation evidence,
  updated route docs, and intentional not-found behavior.
- Focused code tests, real-database proofs, browser journeys, provider checks,
  production-like performance/rollback, and required human sign-offs refer to
  one fixed frontend/backend revision pair.
- No acceptance checkbox is closed by narration; its evidence names source,
  command, result, environment, revision, and residual risk.
