# 18 — Architecture work-package registry

Status: Planned execution authority  
Architecture source: [deep-module reconciliation](../architecture/08-deep-module-reconciliation.md)

## 1. How to use this registry

Claim one package in [WORK-CLAIMS.md](./WORK-CLAIMS.md). Reinspect the listed source anchors and expand exact paths before editing. The file groups below describe ownership, not permission to change every matching file. Generated files change through their source generator.

`Parallel after` means the packages may run at the same time only after the named prerequisite interfaces are merged and their primary paths do not overlap.

### Mandatory dependency order

Work must proceed in this eight-step sequence. A step cannot start until the preceding step's interfaces are merged and gate-passing in WORK-CLAIMS.

1. **Authority** — module access, standing, entitlement (`ARCH-01-MODULE-ACCESS`)
2. **Contracts** — versioned wire contracts and generated client (`ARCH-06-WIRE-CONTRACTS`)
3. **Commands** — project provision, ticket command, activation, portal (`ARCH-03A`, `ARCH-03B`, `ARCH-14`, `ARCH-17`)
4. **Capture** — forms, feedbucket, triage, intake convergence (`ARCH-04-REQUEST-CONVERGENCE`)
5. **Effects** — outbox runtime, automation, webhook, notification, import (`ARCH-15-EFFECT-RUNTIME`)
6. **Relationships** — planning graph, collaboration, Timesheets seam (`ARCH-11`, `ARCH-12`, `ARCH-02`)
7. **Projections** — collection queries, metrics, analytics (`ARCH-07-COLLECTION-QUERIES`, `ARCH-13-METRICS-PROJECTIONS`)
8. **Experience** — frontend workflows, capability settings, evidence cleanup (`ARCH-09`, `ARCH-16`, `ARCH-10`)

Packages within the same step may run in parallel when their primary source paths are disjoint. The WORK-CLAIMS submitter must cite which step is complete before starting the next. Parallel packages at the same step must document their non-overlapping file boundaries in WORK-CLAIMS before editing.

(BT-69a12d33aab2, added 2026-10-04)

### Current high-risk source anchors

These paths were present at snapshot `a5b8347fb`. They are starting points, not a complete caller census and not proof of runtime behavior.

| Concern | Current source anchors to inspect before proposing files |
|---|---|
| Module access and entitlement | `backend/src/modules/module-access/module-access.helpers.ts`, `module-standing.ts`, `module-standing-mutations.service.ts`, `module-access-flat-members.service.ts`, group/permission-grant writers and tests own the positive standing surface; `backend/src/modules/access/access.service.ts`, `entitlements.service.ts`, `user-module-access.service.ts` and tests resolve effective grants and per-user deny; `backend/src/common/rbac/access-mutation-commit.ts`; organization invitation implementations; `backend/src/db/schema/common/access*.ts` and invitation/member tables |
| Project reachability/provision | `backend/src/modules/build/core/project-crud/project-access.ts`, `projects-provision.service.ts`, `projects-templates.service.ts`, `backend/src/modules/build/core/projects.module.ts` |
| Ticket commands | `backend/src/modules/build/core/tickets/apply-ticket-change.ts`, `build-ticket-creation.service.ts`, `projects-tickets-create.service.ts`, update/delete/restore/transfer/rank services and `projects-tickets.controller.ts` |
| Ticket collaboration/links | `projects-ticket-comments.controller.ts` and service, `projects-ticket-associations.controller.ts`, watcher/relation/link/label/checklist services; `backend/src/db/schema/build/ticket-collaboration.ts` and `ticket-core.ts` |
| Client visibility/portal | `backend/src/modules/build/client-portal/client-visibility.service.ts`, `portal-projection.ts`, `portal-projection.service.ts`; portal-access grant/invitation/membership schemas |
| Intake/Forms/Feedbucket | `backend/src/modules/build/forms/**`, legacy Intake paths under `execution/`, Feedbucket controllers/services/schema; `frontend/features/build/intake/**`, `triage/**`, `feedbucket/**`, `frontend/hooks/api/feedbucket/**`, `frontend/feedbucket-widget/**` |
| Timesheets duplication | `backend/src/modules/build/execution/timesheets.controller.ts`, `timesheets.service.ts`, `timesheets-scope.ts`, Timesheet DTOs; `frontend/hooks/api/build/time-entries.ts`, `time-entry-schema.ts`, and `features/build/ticket-details/ticket-time-tracker.tsx` |
| Activation | `backend/src/modules/organization/setup/org.controller.ts`, `org-setup.service.ts`, query/resolver/internals/DTOs; `frontend/app/org-setup/**`, `frontend/features/org-setup/**`, `frontend/hooks/api/org-setup*.ts` |
| Effects | `backend/src/common/outbox/**`, Build automation runner/actions/history, project webhook dispatch/service/controller, notification/agent/import consumers and module registration |
| Routes/navigation/frontend contracts | `frontend/lib/build/build-route-manifest.ts`, `build-nav-model.ts`, navigation helpers, `frontend/lib/query-keys/build-work.ts`, domain hooks under `frontend/hooks/api/build/`, generated contract sources and response parsers |
| Build schema | `backend/src/db/schema/build/index.ts`, `core.ts`, `ticket-core.ts`, `ticket-collaboration.ts`, `forms.ts`, `managed-products.ts`, `roadmap.ts`, `goals.ts`, `portfolios.ts`, `meetings.ts`, `qa.ts`, `approvals.ts`, `governance.ts`, `incidents.ts`, `ticket-integrations.ts`, and migrations that touch them |

Before deletion or a new schema/interface, run `rg` across the full repository for routes, operation IDs, symbols, table/column names, permission keys, query keys, event names, and legacy identifiers. The exact inventory belongs in the active claim and handoff.

## 2. Authority and contract packages

| Package | Primary seam and outcome | Primary source families | Forbidden duplication | Depends on | Done when |
|---|---|---|---|---|---|
| `ARCH-01-MODULE-ACCESS` | one Module Access assignment/revocation interface | `backend/src/modules/module-access/*` positive standing writers; `backend/src/modules/access/*` effective resolver/deny; entitlement/invitation/Build membership callers; permission catalog; access cache revision | feature-local standing writers; client as org member | none | invite/direct/group assignment and all-source revoke converge; role matrix and immediate bounded revocation proven |
| `ARCH-16-CAPABILITY-SETTINGS` | settings precedence and route/nav capability registry | Build route manifest, nav model, access/settings query modules, project overrides | separate route permission maps or feature-specific precedence | `ARCH-01-MODULE-ACCESS` | route/nav/deep-link/plan/permission parity and revisioned settings pass |
| `ARCH-06-WIRE-CONTRACTS` | one versioned operation registry and generated client | backend DTO/Zod/OpenAPI registry; frontend generated contracts and response parsers | hand-written duplicate wire interfaces | `ARCH-01-MODULE-ACCESS` for protected operation metadata | all handlers including restore registered; generated diff is clean |
| `ARCH-05-FILE-IDENTITY` | Files owns bytes; Build owns typed relations | Files interface; Build attachment endpoints/schemas; upload UI; signed URLs | trusted caller URL or record-local storage lifecycle | `ARCH-01-MODULE-ACCESS`, project/record reach | internal/client upload-download-revoke and scan states pass |
| `ARCH-08-IDENTITY-RECONCILIATION` | canonical assignee, BUG, client, Workstream, and time identities after production cardinality/usage audit | Build schema/migrations; compatibility adapters; mapping tables | dual writes without compare/recovery | `ARCH-06-WIRE-CONTRACTS`; package-specific owners | measured cardinality and callers; parity/backfill report clean; old IDs resolve; duplicate writer blocked |

## 3. Command and activation packages

| Package | Primary seam and outcome | Primary source families | Caller adoption | Depends on | Done when |
|---|---|---|---|---|---|
| `ARCH-03A-PROJECT-PROVISION` | one idempotent project provision interface | project create/template/import/onboarding implementations and schema | ordinary create, template apply, import, onboarding, AI | `ARCH-01-MODULE-ACCESS`, `ARCH-06-WIRE-CONTRACTS`, `ARCH-05-FILE-IDENTITY` | quota/default/key/member/client/outbox behavior identical; retry resumes |
| `ARCH-03B-TICKET-COMMAND` | every Ticket mutation crosses one interface | `apply-ticket-change.ts`; create/delete/restore/transfer/rank/bulk adapters; ticket schemas | board/list/detail, intake, QA, meeting actions, portal, import, automation, AI | `ARCH-01-MODULE-ACCESS`, `ARCH-06-WIRE-CONTRACTS`, `ARCH-05-FILE-IDENTITY` | adapter census zero bypasses; CAS/idempotency/audit/cache/outbox parity passes |
| `ARCH-14-ACTIVATION` | resumable Workspace -> Products -> People provisioning | org setup session/controller/UI; module adapters; invitations; activation run tables | signup redirects, module setup, template/custom-field drafts, People batch | `ARCH-01-MODULE-ACCESS`, `ARCH-03A-PROJECT-PROVISION`, `ARCH-06-WIRE-CONTRACTS` | six journeys, five-input Build path, multi-module preview, resume/retry, deterministic destination |
| `ARCH-17-CLIENT-PORTAL-ACCESS` | one project-scoped external client invitation, grant, acceptance, publication, and revocation lifecycle | PortalAccess activation command, portal invitation/auth, project-client grants, Build client visibility projection, internal invitation UI, and external portal reads | legacy contact-only invite and separate grant calls remain compatibility paths until one-command parity is proven | `ARCH-01-MODULE-ACCESS`, `ARCH-05-FILE-IDENTITY`, `ARCH-06-WIRE-CONTRACTS`, `ARCH-15-EFFECT-RUNTIME` | atomic activation, single-use accept, published-project gate, field/file scope, revoke/expiry, retry, tenant and browser evidence pass |

## 4. Capture and collaboration packages

| Package | Primary seam and outcome | Primary source families | Must retain | Depends on | Done when |
|---|---|---|---|---|---|
| `ARCH-04-REQUEST-CONVERGENCE` | Forms/Feedbucket capture, Triage processing, Intake projection, canonical conversion | form/submission, Feedbucket widget/submissions, legacy intake/workspace, triage routes/features | immutable submissions, widget capture, old IDs/deep links | `ARCH-03A-PROJECT-PROVISION`, `ARCH-03B-TICKET-COMMAND`, `ARCH-05-FILE-IDENTITY`, `ARCH-15-EFFECT-RUNTIME` | duplicate/accept/decline/assign/convert replay safely; source evidence unchanged |
| `ARCH-12-COLLABORATION` | shared comment/mention/reaction/activity/subscription delivery while domain content stays local | ticket comments, shared actor/link/activity/notification adapters, portal collaboration | domain content and domain visibility rules | `ARCH-01-MODULE-ACCESS`, `ARCH-05-FILE-IDENTITY`, `ARCH-15-EFFECT-RUNTIME` | edit/delete/restore/moderation, dedupe, revocation, client projection pass |
| `ARCH-11-PLANNING-GRAPH` | typed planning edges across products/projects/goals/roadmaps/portfolios/programs/milestones/releases/outcomes | link schemas, planning query modules, scoped route callers | each aggregate’s lifecycle owner | `ARCH-01-MODULE-ACCESS`, `ARCH-06-WIRE-CONTRACTS` | link vocabulary, cycle/scope rules, history, authorized projections pass |

## 5. Effect, query, and experience packages

| Package | Primary seam and outcome | Primary source families | Parallel after | Depends on | Done when |
|---|---|---|---|---|---|
| `ARCH-15-EFFECT-RUNTIME` | one outbox-first execution runtime | outbox/inbox, automation runs, webhooks, agents, imports, notifications, callbacks, AI execution | domain trigger/action adapters | `ARCH-01-MODULE-ACCESS`, `ARCH-06-WIRE-CONTRACTS` | leases/retry/DLQ/idempotency/secret/quota/permission/telemetry gates pass |
| `ARCH-07-COLLECTION-QUERIES` | bounded authorized projection families | list/search/filter/count/export query modules and controller adapters | independent record families | `ARCH-01-MODULE-ACCESS`, `ARCH-06-WIRE-CONTRACTS` | unbounded/N+1/list-projection/filter/cursor/query-plan gates pass |
| `ARCH-13-METRICS-PROJECTIONS` | versioned formulas and shared materialized projections | dashboard/report/workload/health/quality/client analytics implementations | independent formula families | `ARCH-07-COLLECTION-QUERIES`, `ARCH-11-PLANNING-GRAPH`, owning source adapters | dashboard/report/export/AI equivalence and freshness/drill-down pass |
| `ARCH-09-FRONTEND-WORKFLOWS` | thin routes and workflow modules using canonical hooks/contracts | Build app routes, features, hooks, query keys, UI kit wrappers | separate route groups after interfaces merge | `ARCH-06-WIRE-CONTRACTS`, `ARCH-07-COLLECTION-QUERIES`, `ARCH-16-CAPABILITY-SETTINGS` | import, bundle, hook, query, responsive, history, a11y, browser gates pass |
| `ARCH-10-EVIDENCE-CLEANUP` | source/evidence/replacement/rollback proof before deletion | gate scripts, audit docs, cleanup plans, compatibility census | all packages as reviewer work | package being cleaned | every deletion has current caller census, replacement proof, recovery, and separate evidence classes |
| `ARCH-02-TIMESHEETS-SEAM` | remove Build time-ledger ownership while preserving context | Build time controllers/services/hooks/keys/permissions and Timesheets adapters/projections | UI adapter work after interface merges | `ARCH-01-MODULE-ACCESS`, `ARCH-06-WIRE-CONTRACTS`, `ARCH-07-COLLECTION-QUERIES`, Timesheets owner | time parity, permission migration, zero Build ledger writes, later column-removal gate |

## 6. Product-surface ownership register

Every surface below is part of the Build specification. A route or source anchor is **Current unverified** until runtime evidence closes it.

| Area | Canonical owner and implementation rule | Principal packages |
|---|---|---|
| Home and personal work | personalized authorized projections; dashboards own no records | `ARCH-07-COLLECTION-QUERIES`, `ARCH-13-METRICS-PROJECTIONS`, `ARCH-09-FRONTEND-WORKFLOWS` |
| Project management | Project is delivery context; each subdomain retains one command and query owner | `ARCH-03A-PROJECT-PROVISION`, `ARCH-07-COLLECTION-QUERIES` |
| Execution and delivery | Ticket changes use Ticket Command; planning links use typed relationships | `ARCH-03B-TICKET-COMMAND`, `ARCH-11-PLANNING-GRAPH` |
| Intake and requests | Forms capture, Triage processes, Intake projects, commands convert | `ARCH-04-REQUEST-CONVERGENCE` |
| Feedbucket | capture adapter retains evidence; processing appears in Intake Bug reports | `ARCH-04-REQUEST-CONVERGENCE`, `ARCH-05-FILE-IDENTITY` |
| Forms and automations | versioned form definition/submission; effects use runtime | `ARCH-04-REQUEST-CONVERGENCE`, `ARCH-15-EFFECT-RUNTIME` |
| Wiki and knowledge | Wiki owns versioned content; collaboration/files use shared interfaces | `ARCH-12-COLLABORATION`, `ARCH-05-FILE-IDENTITY` |
| Managed products and discovery | Product owns evidence/opportunity/prioritization/outcome; delivery uses typed links | `ARCH-11-PLANNING-GRAPH`, `ARCH-13-METRICS-PROJECTIONS` |
| Portfolios and programs | distinct planning records over one relationship graph; no copied progress | `ARCH-11-PLANNING-GRAPH`, `ARCH-13-METRICS-PROJECTIONS` |
| Roadmaps and planning | scope owners retain commands; shared graph/projections serve views | `ARCH-11-PLANNING-GRAPH`, `ARCH-13-METRICS-PROJECTIONS` |
| Goals and outcomes | one goal identity and versioned outcome projection | `ARCH-11-PLANNING-GRAPH`, `ARCH-13-METRICS-PROJECTIONS` |
| Client delivery and portal | grant selects client-safe fields/actions; portal owns no Build record | `ARCH-01-MODULE-ACCESS`, `ARCH-05-FILE-IDENTITY`, `ARCH-12-COLLABORATION` |
| Collaboration | domain content local; delivery/links/files/activity shared | `ARCH-12-COLLABORATION`, `ARCH-15-EFFECT-RUNTIME` |
| Quality and QA | QA owns definitions/runs/results; defects are BUG Tickets; releases link evidence | `ARCH-03B-TICKET-COMMAND`, `ARCH-08-IDENTITY-RECONCILIATION`, `ARCH-11-PLANNING-GRAPH` |
| Reporting and analytics | one metric catalog and projection pipeline | `ARCH-07-COLLECTION-QUERIES`, `ARCH-13-METRICS-PROJECTIONS` |
| Workload and resources | assignment/schedule projections; Timesheets supplies actuals | `ARCH-02-TIMESHEETS-SEAM`, `ARCH-13-METRICS-PROJECTIONS` |
| Timesheets | canonical Timesheets ledger with Build contextual adapter | `ARCH-02-TIMESHEETS-SEAM` |
| Approvals and budgets | reusable approval lifecycle; project budget hands financial action to Accounting | `ARCH-07-COLLECTION-QUERIES`, `ARCH-13-METRICS-PROJECTIONS`, `ARCH-15-EFFECT-RUNTIME` |
| Risks and decisions | durable domain records with shared actor/link/comment/audit interfaces | `ARCH-11-PLANNING-GRAPH`, `ARCH-12-COLLABORATION` |
| Meetings and communication | Meeting owns agenda/notes/attendance/decisions; actions create Tickets through command | `ARCH-03B-TICKET-COMMAND`, `ARCH-12-COLLABORATION` |
| Files and attachments | Files owns bytes/scanning/retention/signed access; Build owns relations | `ARCH-05-FILE-IDENTITY` |
| Project settings | versioned project overrides resolved by owning settings interfaces | `ARCH-16-CAPABILITY-SETTINGS` |
| Build-wide settings | module policy between organization defaults and project overrides | `ARCH-01-MODULE-ACCESS`, `ARCH-16-CAPABILITY-SETTINGS` |
| Onboarding and activation | one resumable orchestrator coordinates owner modules | `ARCH-14-ACTIVATION` |
| Integrations and extensibility | one effect runtime; domain adapters define meaning | `ARCH-15-EFFECT-RUNTIME` |
| Shared Build infrastructure | small stable contract/filter/query-key/error interfaces; business rules remain local | `ARCH-06-WIRE-CONTRACTS`, `ARCH-07-COLLECTION-QUERIES`, `ARCH-09-FRONTEND-WORKFLOWS`, `ARCH-16-CAPABILITY-SETTINGS` |

## 7. Route and naming constraints

- `/build` is the authorized personalized entry and defaults to Command Center.
- Projects receives a dedicated destination when its route package is implemented.
- Assigned and Drafts are sections of My Work, not separate canonical destinations.
- Intake contains a Bug reports view; old Feedbucket links map explicitly to records.
- Triage remains a focused processing mode.
- UI says Workstream while compatible `/modules` URLs and storage identity remain.
- Build Calendar shows work dates; Home owns meetings and external calendar actions.
- Briefs, Assets, and Content Pipeline are configured views of canonical records.
- Advanced tools appear under searchable More; hiding them preserves records and deep links.
- Desktop collection clicks open a split pane when context should remain; canonical URL, browser history, modifier click, refresh, full-page direct link, and mobile page behavior remain defined in the route/screen specifications.

## Delivery checklist

Track completion in the [requirement ledger](REQUIREMENT-LEDGER.md) and [work claims](WORK-CLAIMS.md). An unchecked item stays open until evidence is recorded on the current branch.

- [x] Map 16 accepted architecture decisions, 17 packages, 26 product areas, access layers, and route/naming constraints to owners; see the dated [cross-check](../audit/comprehensive-recheck-2026-10-02.md) at source revision `a5b8347fb`.
- [ ] Refresh every source anchor and package owner against the implementation revision before parallel edits; record owner changes in [WORK-CLAIMS.md](WORK-CLAIMS.md).
- [ ] Complete package-specific API, schema, permission, cache, event, migration, and compatibility gates before dependent packages consume the interface.
- [ ] Verify every one of the 26 areas adopts or explicitly defers the [universal behavior matrix](19-complete-surface-behavior-matrix.md) with screen and runtime evidence.
- [ ] Preserve route aliases and naming constraints through deep-link, browser history, modifier-click, refresh, mobile, and authorization tests.
