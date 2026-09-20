# Build Work Packet Catalog

## How to Use This Catalog

Each row is one packet candidate, not a reservation. The ownership column is a
planning boundary. Before dispatch, the coordinator enumerates the exact files
inside that boundary, completes the assignment contract in
[`agent-runbook.md`](./agent-runbook.md), and records the exact reservation in
the ledger. If the enumerated packet exceeds the split gate, create numbered
children such as `BLD-X-BE-TICKET-LIST-001A` and `001B`; never send the broad
parent to an agent.

Every implementation packet uses four local TODOs:

- [ ] add or preserve the focused failing reproduction;
- [ ] implement the single outcome inside the exact write set;
- [ ] cover the packet's applicable negative cases; and
- [ ] run the literal focused commands and return the evidence handoff.

Only the coordinator changes these boxes or old PRD acceptance boxes.

## Frozen Decision Corrections

`BLD-X-DEC-001` records these corrections before code fan-out:

1. PM Workspace linkage remains optional. Standalone projects are first-class
   and appear in the organization view; a null workspace is not invalid data.
   The contrary sentence in BSN-02 is superseded.
2. `BLD-01M-*` remains the stable acceptance namespace for the BLD-01A
   manifest. Renaming it would break evidence links.
3. `/build/settings/integrations` is `KEEP_WITH_EXPANDED_ANATOMY`, not a move.
4. `/build/{projectId}/client-portal` remains the operational editor/preview.
   Configuration moves to `/build/{projectId}/settings/portal`; this is
   `KEEP_ROUTE_MOVE_CONFIG`, not a route split.
5. `/build/{projectId}/intake` consolidates to two exact existing owners:
   `/build/{projectId}/forms` for definitions/publishing and
   `/build/{projectId}/triage` for submissions. The intake route is deleted
   only after both destinations have parity and zero inbound references.
6. Zod schemas live in owned schema files except the constitution's explicit
   trivial single-field guard exception. A feature PRD does not override that
   exception.
7. The generated final-route set includes retained routes, move targets, and
   ADD routes; it excludes removed and consolidated source routes. Under the
   current manifest it has 99 page routes. A generated census, not this number,
   is authoritative after any approved route decision changes.

## Bootstrap Lanes — Parallel Snapshots and Independent Seams

The old monolithic census and shared packet are aggregation IDs only. They are
never dispatched. Their children below have disjoint outputs and can run in
parallel without modifying product code.

| Packet | Outcome | Backlinks | Exclusive planning boundary | Verification |
|---|---|---|---|---|
| `BLD-X-DEC-001` | The seven corrections above are reflected without rewriting historical evidence | BLD-00 D01–D12; BLD-01A; BLD-02B/C; BLD-05 | Build decision/manifest text only | Link/ID scan; no contradictory disposition strings |
| `BLD-X-CENSUS-ROUTES-001` | Current and final routes, callers, stable IDs, and dispositions have one generated snapshot | BLD-01M-001/002 | route census script + route snapshot fixture only | Self-test adds missing, duplicate, stale, and bare-param routes |
| `BLD-X-CENSUS-FORMS-001` | Mutation components and the 52 declared form rows have one generated snapshot | BLD-05A-001 | form census script + form snapshot fixture only | Self-test adds unclassified and duplicate schema owners |
| `BLD-X-CENSUS-API-001` | Build controllers and operations have one generated snapshot | BLD-06A-001 | controller census script + API snapshot fixture only | Self-test adds an unclassified operation |
| `BLD-X-CENSUS-SCHEMA-001` | Build schema files and tables have one generated snapshot | BLD-06B-006 | schema census script + schema snapshot fixture only | Self-test adds an unowned table/schema file |
| `BLD-X-CENSUS-001` | Aggregates the four snapshots; never assigned | all four census criteria | no product files | all four child checks pass |
| `BLD-X-ROUTE-001` | Route seam maps stable ID, path, owner, permission, callers, and deterministic back target | BLD-01; BLD-01B; BLD-01M; BSN-01 | route manifest/access/navigation contract files only | route/access self-tests then gates |
| `BLD-X-CONTRACT-001` | API/filter seam freezes request, response, filter, cursor, and error vocabulary | BLD-03; BLD-05; BLD-05A; BLD-06-005..013 | shared API/filter contract files only | contract drift/response/schema tests |
| `BLD-X-SEAM-PERM-001` | Permission keys and access bindings have one exclusive owner | BLD-01B; BLD-06 auth | backend/frontend permission catalogs and access binding gates only | permission self-tests then gates |
| `BLD-X-SEAM-QUERY-001` | Query keys, scope hashing, and cache-writer primitives have one exclusive owner | BLD-03/06 cache criteria | query-key/cache primitive files only | query-scope/signal and cache tests |
| `BLD-X-SEAM-DB-001` | Schema barrels, module registration, and migration journal changes are brokered serially | BLD-06B; BLD-07 | schema barrels, module registration, journal only | migration/cycle/DI gates |
| `BLD-X-SEAM-UI-001` | Surface tokens, overlay primitives, and shared collection anatomy have one exclusive owner | BLD-08 | global token and shared UI primitive files only | color/a11y/static primitive tests |
| `BLD-X-SHARED-001` | Aggregates the four shared seams; never assigned | cross-cutting criteria | no product files | relevant seam checks pass |

Snapshots do not block unrelated implementation. A seam blocks only a leaf
that changes that seam. Module-local leaves preserving current public contracts
are immediately eligible for reservation.

## Parallel Backend Vertical Slices

These packets may run in parallel only when their exact file lists and schema
owners do not overlap. Each endpoint packet owns its DTO/schema, controller,
service method, and direct unit/controller tests. Permission catalogs, module
registration, schema barrels, migration journal, and generated contracts stay
with their shared seam. Contract-preserving module-local packets are READY
without waiting for all snapshot or shared-seam packets.

| Packet | Single outcome | Primary ownership root | Acceptance backlinks |
|---|---|---|---|
| `BLD-X-BE-PROJECT-DIR-001` | Project directory search/filter/sort/cursor/count use one tenant-scoped predicate and projection | `backend/src/modules/build/core/projects-query*`, `projects-search*`, direct DTO/specs | BLD-02C Projects; BLD-03 collection rules; BLD-06 query/cache |
| `BLD-X-BE-PROJECT-WRITE-001` | Create/update/archive/restore preserves optional workspace and product links transactionally | `backend/src/modules/build/core/projects-write*`, `projects-provision*`, direct DTO/specs | D01; BLD-02A-011..017; BLD-05 project forms |
| `BLD-X-BE-WORKSPACE-001` | Workspace list/detail/membership endpoints are scoped, bounded, and conflict-safe | `backend/src/modules/build/pm-workspaces/**` | BSN-01/02; BLD-02D workspace rows; BLD-06A workspace row |
| `BLD-X-BE-PRODUCT-001` | Managed-product list/detail/membership endpoints are scoped, bounded, and conflict-safe | `backend/src/modules/build/managed-products/**` | BSN-01/02; BLD-02D product rows; BLD-06A product row |
| `BLD-X-BE-TEAM-001` | Team/member/project endpoints use workspace-aware scope and stable pagination | `backend/src/modules/build/teams/**` | BLD-02C Teams; BLD-03; BLD-06A team rows |
| `BLD-X-BE-SCOPE-DIR-001` | Scope directory search/resolve/star/recent returns authorized hierarchy without first-page filtering | `backend/src/modules/build/scope-directory/**` | BSN-02; BLD-06A scope-directory row |
| `BLD-X-BE-TICKET-LIST-001` | Issue list/table search, filters, sort, totals, and cursors share one bounded predicate | `projects-tickets-query*`, `projects-tickets-read*`, `projects-work-query*`, direct specs | BLD-03; BLD-04 card/list; BLD-06 board/list design |
| `BLD-X-BE-TICKET-DETAIL-001` | Ticket detail and each bounded subresource enforce tenant, project, and record scope | `projects-tickets-detail*`, `projects-ticket-subresources*`, direct DTO/specs | BLD-02E Ticket; BLD-04 detail; BLD-06-002 |
| `BLD-X-BE-TICKET-WRITE-001` | Create/update/transfer/reorder is versioned, idempotent, and rank-safe | `projects-tickets-create*`, `projects-tickets-update*`, `projects-tickets-transfer*`, rank helpers/specs | BLD-04 actions/drag; BLD-05 ticket validation; BLD-06 writes |
| `BLD-X-BE-BULK-001` | Bulk selection token and mutations return truthful per-item outcomes without cross-project partial lies | `build-ticket-bulk-mutation*`, `build-ticket-batch-workflow*`, direct specs | BLD-04 bulk matrix; BLD-06 idempotency/cache |
| `BLD-X-BE-WORKFLOW-001` | Workflow states/transitions/completed-category/WIP migrations are transactional and dependency-aware | `backend/src/modules/build/workflow/**` | BLD-04 workflow settings; BLD-06A Workflow |
| `BLD-X-BE-ITERATION-001` | Cycle is the only canonical iteration API and Sprint callers have a migration map | `backend/src/modules/build/execution/*sprint*`, `*cycle*`, iteration DTO/specs | D03; BLD-02E Cycles; BLD-07 iteration |
| `BLD-X-BE-PLANNING-001` | Epics/modules/milestones/releases expose bounded project-scoped projections | exact `execution/epics*`, `modules*`, and core release/milestone files chosen at reservation | BLD-02E planning rows; BLD-06A planning rows |
| `BLD-X-BE-FORMS-001` | Form builder/publish/version contracts validate conditional structure and dirty-version conflicts | `backend/src/modules/build/forms/forms*` plus DTO/direct specs | D08; BLD-02F Forms; BLD-05 |
| `BLD-X-BE-SUBMISSIONS-001` | Public/internal submissions are rate-limited, idempotent, PII-scoped, and triageable | `backend/src/modules/build/forms/submissions*` plus DTO/direct specs | BLD-02D public form; BLD-02F triage; BLD-06A submissions |
| `BLD-X-BE-QA-001` | Suites/cases/runs/results are project-bound, bounded, and preserve evidence | `backend/src/modules/build/qa/test-*` plus QA DTO/direct specs | BLD-02F QA; BLD-06A QA |
| `BLD-X-BE-BUG-001` | BUG uses canonical ticket lifecycle while QA evidence remains linked | `backend/src/modules/build/qa/bugs*` and exact ticket adapter files | D04; BLD-04; BLD-07 defect ownership |
| `BLD-X-BE-GOV-001` | Risks and decisions enforce ranges, versioning, and project scope | `backend/src/modules/build/governance/**` | BLD-02F governance; BLD-06A |
| `BLD-X-BE-INCIDENT-001` | Incident state/timeline/actions are idempotent, bounded, and after-commit safe | `backend/src/modules/build/incidents/**` | BLD-02F incidents; BLD-06A |
| `BLD-X-BE-APPROVAL-001` | Approval read/decide/delegate/cancel rechecks target access and updates one badge predicate | `backend/src/modules/build/approvals/**` | BLD-02C/F approvals; BLD-06A |
| `BLD-X-BE-UPDATES-001` | Project updates support versioned audience publication and exact portal invalidation | `backend/src/modules/build/updates/**` | BSN-01-024; BLD-02E Updates; BLD-06A |
| `BLD-X-BE-FILES-001` | Project file relations defer binary/scan/retention truth to Files and enforce source ACL | `backend/src/modules/build/files/**` | BSN-01-024; BLD-02E Files; BLD-06A |
| `BLD-X-BE-MEETINGS-001` | Meeting projection and action-item conversion preserve Meetings/Calendar ownership | `backend/src/modules/build/meetings/**` | BLD-02E Meetings; BLD-07 integrations |
| `BLD-X-BE-PORTAL-001` | Internal preview and external portal use separate identities and deny-by-default projections | `backend/src/modules/build/client-portal/client-*` plus DTO/direct specs | D10; BLD-02D portal; BLD-06A |
| `BLD-X-BE-CHANGE-001` | Change requests enforce grant/project scope and one versioned state machine | `backend/src/modules/build/client-portal/change-*` plus DTO/direct specs | BLD-02F change requests; BLD-06A |
| `BLD-X-BE-DRAFT-001` | Comment drafts are actor-private, expiring, recoverable, and orphan-cleaned | `backend/src/modules/build/comment-drafts/**` | D02; BSN-03; BLD-02C Drafts |
| `BLD-X-BE-PULSE-001` | Agent Pulse proposals bind exact scope, reauthorize approval, and meter AI usage | `backend/src/modules/build/agent-pulse/**` | BSN-03; BLD-07 agent contract |
| `BLD-X-BE-PORTFOLIO-001` | Portfolio/program hierarchy and project counts are bounded and tenant-safe | `backend/src/modules/build/portfolios/**` | BLD-02C portfolio/program pages |
| `BLD-X-BE-REPORT-001` | Reports own analytics and reconcile each metric to a bounded source query | exact `projects-reports*`, `projects-analytics*`, report DTO/specs | D09; BLD-02F reports; BLD-06 budgets |
| `BLD-X-BE-WHITEBOARD-001` | Project whiteboard autosave/share tokens are versioned, hashed, expiring, and revocable | exact `execution/whiteboard*` files | D11; BLD-02E Whiteboard |
| `BLD-X-BE-TIMESHEET-001` | Build time entries route through Timesheets rules and cannot self-approve or fail open | exact `execution/timesheet*` files | D11; BLD-07 Timesheets |

## Database and Migration Authoring, Serial

Create one numbered child per schema/migration; never dispatch this table row as
a combined assignment.

| Packet family | One-child outcome | Exclusive ownership | Backlinks |
|---|---|---|---|
| `BLD-X-MIG-WORKSPACE-*` | One optional-workspace or workspace-index migration is authored and statically verified | one schema file, one migration, journal reservation | D01; BSN-01/02; BLD-06B core/workspaces |
| `BLD-X-MIG-CYCLE-*` | One field/table/reference step moves Sprint to Cycle without dual truth | one schema slice, one migration, journal reservation | D03; BLD-06B core/sprint-events |
| `BLD-X-MIG-BUG-*` | One field/table/reference step moves BUG lifecycle to tickets and preserves QA evidence | one schema slice, one migration, journal reservation | D04; BLD-06B qa/ticket-core |
| `BLD-X-MIG-PORTAL-*` | One grant/projection step removes legacy portal authority | one schema slice, one migration, journal reservation | D10; BLD-00-015; BLD-06B change/portal |
| `BLD-X-MIG-RELATION-*` | One missing tenant/parent FK, check, or measured index is added safely | one schema file, one migration, journal reservation | BLD-06B row-specific criterion |

Authoring can reach `CODE_COMPLETE`; application and plans are separate
`BLD-X-DB-*` packets in a named disposable database.

## Parallel Frontend Leaf Slices

Frontend packets own route/page, feature component, local schema/hook, and
direct tests for one page job. They do not edit shared navigation, route
access, permissions, query keys, global tokens, or `PAGES.md`.

| Packet | Single outcome | Primary ownership root | Acceptance backlinks |
|---|---|---|---|
| `BLD-X-FE-ORG-PROJECTS-001` | `/build` is the truthful project directory with complete states/actions | route plus `features/build/project-list/**` | PG-ORG-001; BLD-02C Projects; BLD-08 anatomy |
| `BLD-X-FE-COMMAND-001` | Command Center panels, counts, links, and proposals reconcile to sources | route plus `features/build/command-center/**` | PG-ORG-006; BLD-02C; BLD-07 agent UX |
| `BLD-X-FE-ALLWORK-001` | All Work renders full-result filters and board/list/table layouts | route plus `features/build/all-work/**` | PG-ORG-003; BLD-03; BLD-04 |
| `BLD-X-FE-MYWORK-001` | My Work derives actor identity and supports narrowing without widening scope | route plus `features/build/my-work/**` | PG-ORG-014/WS-004/PRJ-029; BLD-02C/D/E |
| `BLD-X-FE-INBOX-001` | Inbox owns unread/resolved/snoozed and Drafts views with truthful badge behavior | route plus `features/build/inbox/**`, exact drafts consumer files | PG-ORG-008/011; D02; BSN-03 |
| `BLD-X-FE-ORG-GOV-001` | Approvals/customers/portfolios/programs/goals each retain one canonical page job | create a child per route/feature root before dispatch | PG-ORG-004/007/009/010/016/017/018 |
| `BLD-X-FE-WORKSPACE-001` | One workspace route child handles Overview, Projects, All Work, Products, Teams, Goals, or Roadmap | one exact workspace route plus one feature owner | PG-WS-001..008; BSN-01/02; BLD-02D |
| `BLD-X-FE-PRODUCT-001` | One product route child handles Overview, Feedback, Goals, Insights, Projects, Roadmap, or Settings | one exact product route plus one feature owner | PG-PROD-001..006; PG-ADD-005; BLD-02D |
| `BLD-X-FE-ISSUES-001` | Issues owns board/list/table/timeline/saved-view behavior without hidden first-page filtering | route plus `features/build/tickets/**` and exact view consumer files | PG-PRJ-024/038/041; BLD-03/04 |
| `BLD-X-FE-TICKET-001` | Ticket detail/card exposes the configured field/action contract and bounded subresources | ticket route plus `features/build/ticket-details/**` | PG-PRJ-037; BLD-04; BLD-05 |
| `BLD-X-FE-DELIVERY-001` | One child page covers Overview, Backlog, Cycles, Epics, Milestones, Modules, Releases, Triage, Updates, or Workload | one exact route plus matching feature root | BLD-02E page row |
| `BLD-X-FE-COLLAB-001` | One child page covers Chat, Files, Meetings, Wiki, or Whiteboard as a source-owned projection | one exact route plus matching feature root | BLD-02E collaboration row; BLD-07 |
| `BLD-X-FE-INTAKE-001` | Forms, builder, published form, Feedbucket, and Triage have distinct jobs and safe states | split by exact route/feature root | D08; BLD-02D/F |
| `BLD-X-FE-QUALITY-001` | One child page covers QA, run detail, incidents, risks, decisions, change requests, or approvals | one exact route plus matching feature root | BLD-02F row |
| `BLD-X-FE-REPORT-001` | Reports owns analytics; Budget remains operationally distinct | reports or budget exact route/feature root | PG-PRJ-003/007/033; D09 |
| `BLD-X-FE-PORTAL-001` | Operational portal editor, employee preview, external portal, invite, board, form, and roadmap are identity-safe | split by one exact route family before dispatch | PG-PORTAL/PUBLIC; D10; BLD-02D |
| `BLD-X-FE-SETTINGS-001` | One settings child implements General, Access, Workflow, Views, Fields, Iterations, Automations, Integrations, Portal, Agents, Credentials, or Retention | one exact settings route plus feature root | PG-ADD-001..018; BLD-02B/F |
| `BLD-X-FE-FORM-001` | One mutation surface has correct required labels, Zod/API parity, error placement, dirty behavior, and focus | one BLD-05A row's component/schema/hook/tests | BLD-05; one BLD-05A row |
| `BLD-X-FE-VISUAL-001` | One page anatomy consumes surface/elevation tokens and passes static a11y/state tests | one exact page/feature; tokens read-only | BLD-08 row; page contract row |

Rows containing “one child” are mandatory packet factories. The coordinator
creates a suffixed child for one route and enumerates its files; the parent is
never assignable.

## Parallel Sidebar Leaf Slices

The sidebar owns shell presentation only. Page implementation, route existence,
domain APIs, database/cache behavior, broad responsive/a11y, and integrated
release remain with Build packets.

| Packet | Single outcome | Primary ownership root | Backlinks |
|---|---|---|---|
| `BLD-X-SB-NAV-001` | Sidebar consumes the frozen scope/catalog model and selects the correct Overview | `frontend/features/build/navigation/**`, exact sidebar slot tests | BSN-01; BLD-X-ROUTE-001 |
| `BLD-X-SB-DIR-001` | Scope browser displays authorized hierarchy/search/stars/recents with keyboard model hooks | exact scope-browser components and local tests | BSN-02; BLD-X-BE-SCOPE-DIR-001 |
| `BLD-X-SB-ACTIONS-001` | Quick Create and More Tools expose only scope-valid actions and enforce the pin ceiling | exact contextual-action/pin components and tests | BSN-03 quick-create/tools |
| `BLD-X-SB-SIGNALS-001` | Inbox and Agent Pulse badges/links are scoped, quiet at zero, and failure-safe | exact sidebar signal components/hooks/tests | BSN-03 signal criteria |
| `BLD-X-SB-LIFECYCLE-001` | Scope changes preserve dirty-work interception and deterministic authorized fallback | exact scope-switch/dirty/fallback files/tests | BSN-04; BLD-01-021..024; BLD-05 dirty states |
| `BLD-X-SB-OFFLINE-001` | Sidebar labels stale data, preserves the last safe location, and blocks unsafe writes | exact sidebar offline/error-state files/tests | BSN-04-A10; BLD-08 state rules |

## Shared Gates and Cleanup, Serial by Owner

| Packet | Outcome | Backlinks |
|---|---|---|
| `BLD-X-GATE-ROUTE-001` | Generated route/caller/access manifest rejects missing, stale, duplicate, bare-param, and semantically wrong destinations | BLD-01-A01/A02; BLD-01M-004..006 |
| `BLD-X-GATE-PERM-001` | Backend/frontend permission catalogs, route gates, nav visibility, and data-scope bindings agree | BLD-01B; BLD-06 auth acceptance |
| `BLD-X-GATE-FILTER-001` | List/count/export/bulk/saved-view predicates and cursor fingerprints cannot drift | BLD-03 acceptance; BLD-06 board query |
| `BLD-X-GATE-FORM-001` | Mutation census and request/response/schema ownership detect missing or duplicate validation | BLD-05/05A acceptance |
| `BLD-X-GATE-CACHE-001` | Every changed cache has one writer matrix and narrow tested invalidation/patch behavior | BLD-06 cache acceptance |
| `BLD-X-GATE-ARCH-001` | Import direction, cycles, file-size, dead-code, and duplicate-owner gates are non-vacuous | BLD-07 architecture; BLD-10 repository gates |
| `BLD-X-CUTOVER-ROUTE-*` | One moved/consolidated route is deleted after zero inbound callers and destination parity | one BLD-01A MOVE/CONSOLIDATE row |
| `BLD-X-CUTOVER-DOMAIN-*` | One duplicate Sprint/BUG/intake/report owner is deleted after data/caller/build proof | D03/D04/D08/D09 |

Create one cleanup child per route or domain owner. A child owns its exact route
files and caller edits; shared caller catalogs remain with their gate owner.

## External Verification and Release

| Packet family | Single child scope | Required evidence |
|---|---|---|
| `BLD-X-DB-MIG-*` | Apply one authored migration and reconcile/rollback it | named disposable DB |
| `BLD-X-DB-QUERY-*` | Measure one endpoint/query family with production-shaped data and RLS role | plans, buffers, row counts, query count |
| `BLD-X-PW-ROUTE-*` | Crawl 5–10 related final routes for direct load, hard refresh, back/forward, links, and 404/denial | browser |
| `BLD-X-PW-A11Y-*` | Verify one page family at 375/768/1280, keyboard, focus, touch, zoom, forced colors, reduced motion, screen reader | browser/accessibility tooling |
| `BLD-X-PW-LIFECYCLE-*` | Verify one dirty, offline, rapid-switch, cross-tab, or revocation journey | browser with controlled network/session |
| `BLD-X-PROVIDER-*` | Verify one advertised provider's durable receipt, retry, secret ownership, and revocation | sandbox provider |
| `BLD-X-DEPLOY-*` | Verify one migration/telemetry/alert/rollback/soak concern | production-like deployment |
| `BLD-X-REL-001` | Review one fixed root/frontend and backend revision pair, aggregate all evidence, and decide release | every preceding required packet |

`BLD-X-PW-ROUTE-*` replaces impossible boxes such as “every retained page
direct-loads” with generated route batches. `BLD-X-DB-QUERY-*` replaces
“every API is optimized” with one measurable resource family per packet.

## Coverage Rule

No old requirement is discarded. The old PRDs retain all product detail. A
packet links to every acceptance criterion it advances; an acceptance criterion
may link to many packets. Universal criteria close from generated inventories:

- route and page criteria: one row per generated final-route ID;
- form criteria: one row per BLD-05A mutation surface;
- API criteria: one row per generated controller operation;
- schema criteria: one row per table/schema owner;
- UI criteria: one row per applicable page anatomy/state;
- release criteria: one row per required route/persona/evidence-tier tuple.

The coordinator rejects a roll-up when the generated inventory has an unmapped
row, a packet has no acceptance backlink, or the same exclusive owner is
claimed by two active packets.
