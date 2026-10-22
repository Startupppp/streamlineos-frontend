# HRMS Work Packet Catalog

## Dispatch Rule

Rows ending in `-*` are child factories. Before dispatch the coordinator picks
one inventory row, copies its exact acceptance text, enumerates exact production
and test files, and assigns a numbered child. A catalog row, domain, directory,
or old HRM checkbox is never dispatched directly.

Every code child has four local TODOs:

- [ ] add or preserve one focused failing reproduction;
- [ ] implement the single observable outcome inside the reserved files;
- [ ] cover applicable negative/race/permission/empty/error cases; and
- [ ] run the literal focused commands and return the runbook handoff.

Only the coordinator updates these boxes, the ledger, or old acceptance boxes.

## Independent Snapshot Packets

Snapshots write only their script/fixture/output. They may run together and do
not block contract-preserving leaf work.

| Packet | Output | Minimum row fields | Self-test mutations |
|---|---|---|---|
| `HRM-X-CENSUS-ROUTES-001` | Generated current/final route snapshot | stable ID, path, file, product owner, disposition, permission, callers, parent/back | add missing/duplicate/stale/dynamic route |
| `HRM-X-CENSUS-FORMS-001` | Mutation-surface snapshot | route, component, action, UI schema, API schema, endpoint, requiredness owner | unclassified form, duplicate schema, label mismatch |
| `HRM-X-CENSUS-API-001` | 169-controller operation snapshot | method/path, controller/service, permission, scope, request/response schema, pagination/cache/audit | unclassified operation, unparsed query, unbounded list |
| `HRM-X-CENSUS-SCHEMA-001` | 96-file table/relationship snapshot | table, owner, tenant key, temporal/soft-delete/RLS/index/retention/migration status | orphan table, missing tenant owner, duplicate write owner |
| `HRM-X-CENSUS-NAV-001` | Sidebar, hub, card, notification, breadcrumb destination snapshot | source, label, destination ID/path, gate, active-match rule | 404 target, ungated link, duplicate primary nav |

`HRM-X-CENSUS-ALL-001` is a release aggregation ID and is never assigned.
Inventory scripts must return non-zero for unowned rows and produce deterministic
sorted output. Baseline count drift is accepted only with a catalog/decision diff.

## Serialized Shared Seams

Only one child owns a seam at a time. Leaves consume published seams read-only.

| Packet | One seam | Exclusive planning boundary | Verifies |
|---|---|---|---|
| `HRM-X-SEAM-ROUTE-001` | stable route identity, access, breadcrumb/back/fallback contract | app route manifest, route-access bindings, nav destination resolver, route docs | direct load/refresh model, destination existence, parameter encoding |
| `HRM-X-SEAM-PERM-001` | D07 permission alias migration and role-pack parity | FE/BE permission catalogs, generators, alias telemetry | no orphan/unknown key; FE advisory matches BE authority |
| `HRM-X-SEAM-CONTRACT-001` | canonical filters, cursors, response/error envelopes | shared DTO/filter schemas and generated contract inputs | malformed values fail closed; cursor/sort stable |
| `HRM-X-SEAM-QUERY-001` | scoped query-key and invalidation primitives | shared query keys/cache writer registry | tenant/actor/scope/filter/version included; exact invalidation tests |
| `HRM-X-SEAM-UI-001` | semantic surfaces and shared collection/form/action primitives | global tokens and shared UI components | light/dark/HC states; a11y/static component tests |
| `HRM-X-SEAM-DB-001` | schema barrel, module registration, migration journal broker | named barrels/modules/journal only | dependency order, migration integrity, rollback metadata |
| `HRM-X-SEAM-EVENT-001` | durable HR event envelope/outbox consumers | event contract/registry/outbox primitive only | idempotency, versioning, retry/dead-letter behavior |

A shared seam is split when request/response, permission, and cache changes can
land independently. `HRM-X-SHARED-ALL-001` is aggregation only.

## Backend Operation Factories

Create one child per controller operation or inseparable transaction. A list
child owns request parsing, predicate, projection, cursor, and direct tests for
one resource; a mutation child owns validation, authorization, transaction,
idempotency/audit/event, and direct tests. It does not own shared catalogs or
schema barrels.

| Factory | Example single outcomes | Primary planning roots | Acceptance sources |
|---|---|---|---|
| `HRM-X-BE-PEOPLE-*` | employee list; employee detail; create employment; manager roster; timeline | `backend/src/modules/hr/**employee**`, people/employment services | HRM-02, 04, 06–08, 14a |
| `HRM-X-BE-DIRECTORY-*` | person search; worker engagement list/write; expert search | `backend/src/modules/directory/**` | D01, HRM-04, 07–08, 14a |
| `HRM-X-BE-ORG-*` | org neighborhood; department/team/location option list; effective assignment | HR org/organization bridge | D10, HRM-04, 07–08, 14a/14e |
| `HRM-X-BE-ATTENDANCE-*` | scoped logs; check-in/out; regularize; exception list | attendance/shift/device modules | D04/D06, HRM-04–08, 13, 14b |
| `HRM-X-BE-LEAVE-*` | my/team/admin list; request; decide; cancel; balance | leave/policy/holiday modules | D04/D13, HRM-04–08, 13, 14b |
| `HRM-X-BE-WFH-*` | request; decide; workLocation projection; calendar/payroll event | WFH/time-off + attendance bridge | HRM-13, 14b |
| `HRM-X-BE-CLOCK-*` | device registry; biometric event/reconcile feed | biometric/device modules | D06, HRM-04, 07, 14b |
| `HRM-X-BE-LIFECYCLE-*` | onboarding template/task; probation; transition; exit/FnF initiation | onboarding/probation/lifecycle/exit | D09, HRM-02, 06–08, 14a/14c |
| `HRM-X-BE-DOCUMENT-*` | employee docs; request/acknowledge; expiry query; retention action | HR documents/policies | HRM-04–08, 10, 14c/14d |
| `HRM-X-BE-CASE-*` | case list/detail/transition; helpdesk ticket; SLA queue | cases/helpdesk/service-delivery migration | D05, HRM-04–08, 14d |
| `HRM-X-BE-ASSET-*` | asset list/assign/return; maintenance/expiry | asset modules | HRM-04–08, 14d |
| `HRM-X-BE-EXPENSE-*` | expense/travel list; submit; decide; payroll fact | expense/travel modules | D09, HRM-04–08, 12, 14d/14f |
| `HRM-X-BE-PERFORMANCE-*` | goals/reviews/feedback/1:1s/cycles/calibration list or mutation | performance modules | HRM-04–08, 10, 14c |
| `HRM-X-BE-ENGAGEMENT-*` | survey/pulse/recognition/learning assignment/result | engagement/learning modules | HRM-02, 04–08, 10, 14c |
| `HRM-X-BE-REWARDS-*` | compensation band/change; benefit; equity grant view | compensation/benefits/equity | HRM-02, 06–10, 14c |
| `HRM-X-BE-GOVERNANCE-*` | audit, retention, legal hold, accommodation, compliance task | governance/compliance modules | HRM-02, 06–10, 14d |
| `HRM-X-BE-ANALYTICS-*` | scoped metric/drill; headcount/cost/attrition; report job | analytics/reports/workforce planning | HRM-02, 04, 07–10, 14d |
| `HRM-X-BE-SETTINGS-*` | one settings catalog list/write/version | HR settings modules | HRM-04, 06–09, 14e |
| `HRM-X-BE-PAYROLL-*` | setup; salary structures; inputs; run; reconcile; finalize; payout; payslip; bank/tax; FnF | `backend/src/modules/payroll/**` | D03/D09, HRM-06–08, 12, 14f |

Required negative cases per applicable child: wrong tenant; denied actor; stale
version; malformed query/body/params; deleted/archived relation; cursor tamper;
duplicate idempotency key; concurrent transition; partial provider failure;
empty page after mutation; and sensitive-field projection. Do not force
irrelevant cases into a child.

## Frontend Page Factories

One child owns one HRM-14 page row and one observable outcome. The route file
must remain thin; business UI lives in its feature owner. A page requiring both
a new API contract and UI is two packets with an explicit dependency.

| Factory | Single child examples | Planning boundary | Verify |
|---|---|---|---|
| `HRM-X-FE-ROUTE-*` | repair one 404/deep link/back/fallback | exact route, feature entry, direct route test | destination resolver + component tests; browser packet later |
| `HRM-X-FE-LIST-*` | server search/filter/sort/cursor on one page | page feature, one hook/client, direct tests | URL restoration, cancellation, error/empty, full-set semantics |
| `HRM-X-FE-VIEW-*` | one table/card/board/calendar toggle | exact page feature and view components | invalid view fallback, accessible equivalent, responsive test |
| `HRM-X-FE-DETAIL-*` | one detail header/actions/timeline state | exact detail feature and direct tests | loading/not-found/denied/deleted/version conflict |
| `HRM-X-FE-DASH-*` | one metric/queue/drill-through contract | one dashboard widget family | scoped filters, no fake totals, drill URL parity |
| `HRM-X-FE-SELF-*` | one `/me` job or manager-team outcome | exact self-service feature | self scope, module independence, mobile/a11y states |
| `HRM-X-FE-PAYROLL-*` | one `/payroll` page outcome | exact payroll page feature | permission, locked-period, amount/status semantics |
| `HRM-X-FE-SETTINGS-*` | one catalog/editor outcome | exact setting feature | version conflict, dependency warning, archive semantics |
| `HRM-X-FE-VISUAL-*` | one catalog page adopts surface tokens | exact page/local components; global tokens read-only | no arbitrary color, contrast/static a11y; browser packet later |

Page children must explicitly test missing ID, denied/no-existence leak, empty,
no-filter-results, API error/retry, stale navigation, and narrow viewport when
applicable. They do not claim real browser proof from jsdom.

## Form Child Factory

Name children `HRM-X-FE-FORM-<DOMAIN>-<ACTION>-NNN`. Each owns one mutation
surface, feature schema, field inventory row, and direct tests. It may consume a
published API schema; if parity requires a shared contract edit, request the
contract seam rather than cloning it.

Required child contract:

| Item | Required detail |
|---|---|
| Entry/exit | open trigger, close/back, dirty guard, success destination |
| Fields | required/conditional/optional, default, normalization, visibility |
| Validation | field, cross-field, temporal, money/timezone/file, server mapping |
| Concurrency | double submit, version conflict, idempotency |
| Accessibility | labels, descriptions, summary, focus-first-error, keyboard |
| Evidence | schema unit test, component submission test, API contract test owner |

Representative children: employee create/edit, employment change, onboarding,
leave/WFH request/decision, attendance regularization, device registration,
document upload/request, policy acknowledgement, case/ticket, asset assignment,
expense/travel, goal/review/feedback, compensation/benefit/equity, settings,
payroll setup/input/run/finalize/payout/FnF. The form census determines the full
set; this list is not a substitute.

## Bulk/Job Factories

Split UI selection, server mutation/job, and real scale evidence when they have
different owners.

| Packet | Outcome | Special invariant |
|---|---|---|
| `HRM-X-BULK-SELECT-*` | one page has explicit IDs vs all-matching selection | canonical filter fingerprint; selection reconciliation |
| `HRM-X-BULK-PREFLIGHT-*` | server returns eligible/ineligible reason counts | same permission/state predicate as execute |
| `HRM-X-BULK-EXECUTE-*` | one domain batch is idempotent with per-item result | safe retry; audit; transaction boundary documented |
| `HRM-X-JOB-IMPORT-*` | one import stages/validates/previews/commits | downloadable row errors; rollback/reconcile |
| `HRM-X-JOB-EXPORT-*` | one export uses scoped snapshot and expires | canonical filter; audit; signed download |

## Cutover and Cleanup Packets

Cleanup is never opportunistic. Each child names callers and deletion proof.

| Packet | Outcome | Blockers |
|---|---|---|
| `HRM-X-CUTOVER-PEOPLE-*` | one read/write moves from HR facade to Directory engagement SoR | reconciliation, event/cache consumers, rollback |
| `HRM-X-CUTOVER-SERVICE-DELIVERY-001` | unique data/actions migrate to Cases; old route deleted | zero callers and permission/data parity |
| `HRM-X-CUTOVER-REIMBURSEMENTS-001` | operations canonical at Payroll; HR route deleted | links/notifications/docs updated; no legacy redirect |
| `HRM-X-CUTOVER-ORG-001` | duplicate HR hierarchy writes stop; route becomes link/read-only then deletes | organization owner parity, zero write callers |
| `HRM-X-CUTOVER-COMPANY-SETTINGS-001` | settings hub links canonical organization page; shim deletes | zero inbound callers |
| `HRM-X-CUTOVER-SIMULATOR-001` | customer nav removed; internal gate or code deletion proven | usage/source graph and product decision |
| `HRM-X-CUTOVER-PERM-*` | one alias removed after role migration/telemetry window | FE/BE parity, no observed callers |

Deletion evidence includes source/reference scan, focused tests, route census,
build/cycle gate when relevant, data retention decision, and rollback. Never
delete data/schema solely because UI callers are absent.

## Gate Packets

Gates aggregate code evidence but do not implement product behavior.

| Packet | Required inputs | Runs |
|---|---|---|
| `HRM-X-GATE-ROUTE-001` | route/nav censuses + integrated route children | route-access/sidebar/link/static route checks |
| `HRM-X-GATE-FORM-001` | form census + integrated form children | schema parity, requiredness, focused component/API tests |
| `HRM-X-GATE-FILTER-001` | contract seam + list children | malformed/filter/cursor/export parity tests |
| `HRM-X-GATE-PERM-001` | permission seam + operation rows | catalog drift, denied/cross-tenant contract suites |
| `HRM-X-GATE-CACHE-001` | query seam + mutation/reader matrix | scoped key and exact invalidation tests |
| `HRM-X-GATE-ARCH-001` | cutovers/events/import graph | cycles, import direction, write-owner checks |
| `HRM-X-GATE-UI-001` | UI seam + visual leaves | color/token, labels, component a11y, static responsive checks |
| `HRM-X-GATE-TYPE-001` | reviewed integrated batch | one serialized frontend/backend typecheck/build as applicable |

## External Verification and Release

| Packet | Proof |
|---|---|
| `HRM-X-DB-ISOLATION-*` | tenant and record scope against named disposable DB; no existence leak |
| `HRM-X-DB-QUERY-*` | realistic distribution, explain plan, query/row/time budget for one operation |
| `HRM-X-DB-MIG-*` | apply, reconcile, rerun/idempotency, rollback/forward recovery |
| `HRM-X-PW-ROUTE-*` | direct load/refresh/history/back/deleted-entity for a small route batch |
| `HRM-X-PW-A11Y-*` | keyboard/focus/screen-reader/zoom/contrast/touch for a page batch |
| `HRM-X-PW-JOURNEY-*` | one employee/manager/HR/payroll/executive journey at fixed revisions |
| `HRM-X-PROVIDER-*` | sandbox payroll/benefits/device behavior and failure recovery |
| `HRM-X-DEPLOY-001` | telemetry, alert, performance, flag and rollback in production-like env |
| `HRM-X-SIGNOFF-001` | product + privacy/legal + payroll + security + accessibility decisions |
| `HRM-X-REL-001` | all applicable inventory rows/evidence tiers at one revision pair |

`HRM-X-REL-001` is the only packet that rolls old HRM acceptance checkboxes and
declares the program complete. Open provider/country-pack/non-goal work remains
explicitly deferred with owner and does not receive invented evidence.

## Literal Command Selection

The assignment lists existing commands, exact test paths, and expected
assertions. Preferred focused forms:

```text
pnpm -C frontend jest --runInBand --runTestsByPath <exact-test-files>
pnpm -C frontend eslint <exact-source-and-test-files>
pnpm -C backend test -- --runInBand --runTestsByPath <exact-test-files>
pnpm -C backend db:check-hr-reads
```

Do not paste a broad command if the agent is forbidden to run it. Whole-side
typechecks/builds and seeded DB checks are coordinator gate windows. If a named
script does not exist, creating its bounded implementation/self-test is a
separate packet, not an excuse to report an unrun command as passing.
