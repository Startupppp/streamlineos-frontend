# Current-product implementation backlog

**Status:** Open, source-specific work inherited from the former HRMS execution pack.  
**Authority:** The domain, page, experience, and release PRDs in this folder define the target behavior. This file records distinct work needed to migrate the current product toward it.  
**Completion rule:** A checked code path alone does not close a journey. Close each item with the named code, contract, browser, database, or release evidence in the [release PRD](./06a-operations-release-evidence-prd.md).

The former `HRM-*` identifiers in parentheses are provenance, not a second requirement register. One item below owns each repeated cross-file theme. Conditional additions require the page and ownership audit first. Recruiter workflows remain outside this suite.

### Code-backed items removed from the open queue

These earlier unchecked items asked for a page or module that now exists in source. Their end-to-end behavior is covered by the broader open journeys and release gates below.

| Former request | Current source evidence |
|---|---|
| Manager team page (`HRM-02-005`, `HRM-10-001`) | `frontend/app/(authenticated)/me/team/page.tsx` |
| Payroll setup page (`HRM-12-001`, page portion only) | `frontend/app/(authenticated)/payroll/setup/page.tsx` plus loading and error boundaries |
| Reporting-manager policy, correction, bulk change, and onboarding UI (`HRM-15` implementation phases) | [11 Reporting managers](./11-reporting-manager-prd.md) lists the code-presence findings and remaining acceptance proof |

## Product ownership and routes

- [ ] Publish the current People/Directory/Organization write-path and EmploymentFacts join table; migrate remaining duplicate employee writes and reads to their chosen owners, then retire compatibility writes with telemetry and a rollback plan. (HRM-00-D01, HRM-08-001–003, 007–008, 017–018)
- [ ] Inventory HR, Directory, `/me`, and Payroll route links from navigation, hubs, notifications, search, and cards; repair stale destinations, including `/recruitment`, holiday configuration, employee details, and onboarding. (HRM-01-001, 003–008, HRM-08-010)
- [ ] Reconcile the current `/hr/service-delivery` implementation with the canonical service-request and restricted-case destinations in [04 Service](./04-employee-manager-service-prd.md), then remove obsolete routes and links with redirect and browser evidence. (HRM-00-D05, HRM-02-012)
- [ ] Reconcile Devices and Biometric under the `/hr/time-clocks` page contract; remove duplicate primary navigation without losing either operation. (HRM-00-D06, HRM-03-005)
- [ ] Give retained detail and execution routes permission-aware back destinations; restore list query state; prove browser Back, dirty-form protection, opener focus, and denial/error/not-found handling. (HRM-01-009–016, HRM-12-004–005)
- [ ] Generate a current route and page census against [07a Manifest](./07a-page-permission-manifest-prd.md); classify each route keep, merge, remove, add, or intentional deep link, with no orphan customer page or broken primary link. (HRM-01-017–022, HRM-02-001, 017–022)
- [ ] Resolve conditional page gaps from the census: employee self-edit, manager team roster, attendance calendar, review-cycle detail, notification and leave settings, and document/holiday configuration. Add only missing jobs; reuse existing canonical views. (HRM-02-003, 005, 007–015)
- [ ] Update `frontend/PAGES.md` and route tests for every moved, added, or removed page, including Payroll and WFH/WFO. (HRM-01-019–020, HRM-02-018, HRM-12-037, HRM-13-032)

## Access, collections, and actions

- [ ] Reconcile every HR and Payroll navigation permission with the backend and frontend catalogs, role and data scope, paid entitlements, and a real authorized destination; test HR admin, scoped manager, employee, and unentitled views. (HRM-03-001–003, 006–008, 012–013, HRM-12-008–009)
- [ ] Adopt shared navigation, collection, and surface primitives on employee, asset, expense, and case pages; remove wrappers only after their behavior is preserved. (HRM-03-009–011)
- [ ] Use server-owned search, filters, sort, and cursor pagination with a bounded page size on employee, leave, attendance, WFH, case, document, asset, expense, Directory, and Payroll collections; reject malformed filters and enforce scope before filtering or export. (HRM-04-001–007, 012–014, HRM-07-001–002, 008–010, HRM-12-010–012, 020, HRM-13-011–014)
- [ ] Make supported view modes and saved views real: attendance calendar, leave/team calendar source, location holidays, and governed employee/leave saved filters with URL restoration. (HRM-04-008–011, 015–017)
- [ ] Add authorized row and card actions, confirmation and event propagation, then deliver employee, leave, attendance, service-case, document, and payroll bulk operations with preview, per-row results, and an async job path for large batches. (HRM-05-001–010, HRM-12-014–015)
- [ ] Prove bulk APIs reject cross-tenant IDs and unauthorized approvals; exercise partial failure and retries in browser and API tests. (HRM-05-011–013, HRM-11-014)

## Forms, data, and performance

- [ ] Audit required/optional labels and align shared Zod schemas, backend DTOs, field errors, and unsaved-change handling across employee/onboarding, leave/WFH, attendance, shifts, expense, travel, documents, holidays, assets, cases, goals, benefits, exit, Directory, and HR settings forms. (HRM-06-001–002, 004–028, HRM-12-017–019, HRM-13-017–019)
- [ ] Remove legacy validation and unused request paths only after the canonical form/API contract and focused missing-field tests pass. (HRM-06-003, 029)
- [ ] Centralize HR and Payroll cache keys and invalidation for onboarding, changes, termination, time decisions, payouts, and permission changes; prove no stale or duplicate read after mutation. (HRM-07-003–005, 016–019, 025, HRM-12-021, HRM-13-020)
- [ ] Bound specialized reads for skills, expert search, org chart, dashboards, exports, and payroll input rebuild; remove N+1 and unbounded population fetches. (HRM-07-006, 012–014, 020, 026, HRM-12-022)
- [ ] Publish ownership and paging strategy for each retained collection; verify indexes and `EXPLAIN ANALYZE` on representative employee and pay-run volumes in a named disposable database. (HRM-04-018, HRM-07-011, 015, 021–024, HRM-12-025)
- [ ] Keep the migration journal and SQL-managed/Drizzle ownership explicit; replay only in a named disposable environment with rollback evidence. (HRM-07-022–023)
- [ ] Reconcile calendar feeds for approved WFH, leave, holidays, birthdays, probation, and payroll dates with Calendar ownership and access scope. (HRM-08-013, HRM-10-010, HRM-13-022)
- [ ] Prove cross-module handoffs for accepted hire to onboarding, employee exit to FnF, and approved time to payroll without competing mutation owners. (HRM-08-009, 012, 019, HRM-12-006, 024, 026–027)

## Workforce and Payroll specifics

- [ ] Normalize WFH/WFO `workLocation` across attendance write/read/export, leave request and policy, calendar, and approved pay input; migrate any older competing representation safely. (HRM-00-D04, HRM-13-001–002, 016–021, 024)
- [ ] Complete multi-day WFH conflict checks, geofence recovery, manager approval, and WFH bulk decision with policy-based errors, bounded lists, and tenant-safe APIs. (HRM-13-007–009, 015, 030)
- [ ] Add optional planned WFO/WFH roster display only after the shift/attendance ownership and payroll implications are defined. (HRM-13-025–026)
- [ ] Make Payroll setup discoverable, align sidebar order and run/employee/payslip navigation, and give run and salary pages loading, error, back, status, and accessibility states. (HRM-12-001, 007, 028–030)
- [ ] Wire the run-employee response contract to its hook, authorize payslip download at the data layer, and keep HR FnF initiation distinct from Payroll settlement. (HRM-12-013, 023, 027)

## Experience and release proof

- [ ] Replace hard-coded HR surface colors and inconsistent overlays with shared tokens; inspect dense tables, filters, cards, dialogs, loading, empty, error, status, focus, and compact layouts in light and dark modes. (HRM-09-001–014)
- [ ] Test core employee, manager, HR, Payroll, and Finance journeys at 375, 768, and 1280 px with keyboard and screen reader paths; record accessibility findings and fixes. (HRM-09-015–017)
- [ ] Prototype permission-safe employee-card links to collaboration tools and a people/document/case command search; validate task completion and leakage boundaries before adding these P2 entry points. (HRM-10-006–007)
- [ ] Prototype provenance-visible AI drafts for policy, handoff, and manager preparation plus a side-effect-free HR automation preview; require human review, access checks, and evaluation evidence before release. (HRM-10-008–009)
- [ ] Attach a fixed frontend/backend revision pair, named environment, entitlement, browser/API/DB/provider results, permission parity, builds, cycle checks, monitoring, rollback, and signoffs to the release evidence register. (HRM-11-001–025)
- [ ] Prove WFH request through approval, attendance, calendar, and payroll input; prove WFO check-in through history, team filter, and export; include cross-tenant denial. (HRM-13-003–004, 027–029)
- [ ] Prove Payroll setup through salary, inputs, run, payslip, payout, and accounting; prove HR exit through FnF settlement; verify manager `/payroll/team` scope and cross-tenant isolation. (HRM-12-031–035)

The [experience PRD](./07b-experience-content-quality-prd.md), [page manifest](./07a-page-permission-manifest-prd.md), and [release evidence PRD](./06a-operations-release-evidence-prd.md) own the shared acceptance standard. These implementation tasks stay open until the linked evidence is attached.
