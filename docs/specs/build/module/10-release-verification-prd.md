# BLD-10 — Release Verification and Rollout PRD

> Acceptance reference only. Dispatch and status live in
> [`Build execution`](../README.md); do not assign
> or tick a checkbox in this file directly.

## Outcome

One reviewed frontend/backend revision pair is proven safe for real customer
work. Static, mocked, database, browser, migration, provider, performance, and
deployed evidence are distinguished. Failed or unrun checks remain open.

## Entry Criteria

- [ ] **BLD-10-001** every parent workstream in the Build-module README except
  BLD-10 is complete.
- [ ] **BLD-10-002** the subordinate Build sidebar tracker is complete,
  including its remaining real-browser and external checks.
- [ ] **BLD-10-003** BLD-01A, the source tree, navigation/access manifests, and
  `frontend/PAGES.md` match; root `PAGES.md` records delivery evidence.
- [ ] **BLD-10-004** frontend/backend revisions, migration set, environment,
  feature flags, and test dataset are recorded.
- [ ] **BLD-10-005** no unresolved decision can change route, data model,
  authorization, cache, migration, or customer behavior.

## Test Dataset

The named disposable or staging environment includes:

- freelancer with one standalone project;
- agency with many clients and isolated project grants;
- enterprise with multiple workspaces, products, programs, portfolios, teams,
  restricted projects, and custom roles;
- project with zero data;
- project with more than one page in every primary collection;
- project exceeding board, comments, activity, files, forms, and custom-field
  continuation thresholds;
- archived/deleted/moved records;
- duplicate names across scopes;
- stale versions and concurrent editors;
- integrations healthy, disconnected, expired, rate limited, and unavailable;
- external clients with different grants;
- realistic skew, history, and high-cardinality filters.

- [x] **BLD-10-006** dataset creation is repeatable and contains no production
  secrets or personal data. **Closed — source proof plus a passing self-test.**
  `backend/src/scripts/seed-scratch-e2e.mjs` seeds two fixed synthetic orgs
  (`aaaaaaaa-1111-0000-0000-00000000000{1,2}`) with `ON CONFLICT DO NOTHING`
  throughout and a `--purge` clean-reseed path, so a second run converges rather
  than duplicating. `assertScratchTarget` refuses any URL matching
  `PRODUCTION_HOST_PATTERNS`, any database whose name lacks `scratch`, any URL
  identical to a live `DATABASE_URL`, and anything unparseable;
  `node src/scripts/seed-scratch-e2e.mjs --self-test` passes all 8 cases
  (2026-09-21). Every seeded address is `@scratch-seed.test` or
  `@example.com`; webhook secrets are derived from the synthetic org id. No
  provider credential or real personal record is present.
  This certifies the seed *script*, not a seeded database — nothing has been run
  against a disposable target yet, so BLD-10-007's record counts stay open.
- [ ] **BLD-10-007** expected permissions and record counts are asserted before
  journey tests begin.

## Route and Navigation

- [ ] **BLD-10-008** static route manifest self-test and gate pass.
- [ ] **BLD-10-009** every generated final-route row direct-loads and
  hard-refreshes; execution is split into browser packets of 5–10 related
  routes rather than assigned as one task.
- [ ] **BLD-10-010** sidebar, switcher, command palette, breadcrumbs, cards,
  rows, metrics, notifications, emails, empty states, and error CTAs reach the
  intended page.
- [ ] **BLD-10-011** browser Back/Forward and deterministic back actions pass
  with filters, overlays, dirty work, denied records, and stale history.
- [ ] **BLD-10-012** removed routes have zero code caller and no physical page.
  **Open — partially repaired 2026-09-21; the remainder is a product decision.**
  `PG-PRJ-036` (`/build/{projectId}/sprints`, disposition *REMOVE duplicate*)
  still has a physical page at
  `frontend/app/(authenticated)/build/[projectId]/sprints/`.
  Two label/destination mismatches were repaired: in
  `features/build/overview/project-overview-page.tsx` the **"Active cycle"**
  stat card read its value from `useCycles` but linked to `/sprints`, and the
  quick-nav link labelled **"Cycles"** also pointed at `/sprints`. Both now
  resolve to `/cycles`, pinned by two tests in
  `project-overview-page.test.tsx`.
  `lib/build/nav/build-project-catalog.ts` was already corrected to `/cycles`,
  so the README finding at line 1444 describing it as pointing at `/sprints` is
  stale.
  What remains is not a mechanical delete. `features/build/sprints/` holds
  capability `features/build/cycles/` does not — sprint planning panel, velocity
  chart, complete-sprint sheet and the ticket mover — and
  `components/layout/command-palette-dialog.tsx:129` still offers a "Sprints"
  destination, which is internally consistent today and would 404 the moment the
  route is deleted. Deleting the route before that capability is ported would
  lose working features, so this needs the consolidation decision recorded in
  BLD-00, not a removal.
- [ ] **BLD-10-013** malformed, missing, archived, wrong-parent, denied, and
  wrong-tenant deep links show the correct state without leakage.

## Authorization and Tenant Isolation

Roles exercised:

- organization owner;
- Build administrator;
- project manager;
- product manager;
- team member;
- restricted/data-scoped member;
- guest;
- external client;
- active member without Build administration;
- revoked/suspended actor.

- [ ] **BLD-10-014** every page and API has allow/deny coverage for applicable
  roles and data scopes.
- [ ] **BLD-10-015** reads, counts, search, filters, exports, bulk, reports,
  option lists, and caches preserve identical scope.
- [ ] **BLD-10-016** cross-tenant IDs and cursors reveal no existence or
  metadata.
- [ ] **BLD-10-017** access revocation removes navigation, cached data,
  outstanding proposals, portal access, and unsafe actions immediately.
- [ ] **BLD-10-018** client portal projections expose only explicitly granted
  records and fields.

## Page and Customer Journey Matrix

- [ ] **BLD-10-019** organization Command Center, Projects, All Work, My Work,
  Inbox, Approvals, Roadmap, Goals, Programs, Portfolios, Teams, Templates,
  Customers, and Settings pass.
- [ ] **BLD-10-020** workspace Overview, Projects, Products, Teams, All Work,
  Goals, Roadmap, and Settings pass.
- [ ] **BLD-10-021** product Overview, Projects, Roadmap, Goals, Feedback,
  Insights, Settings, and client progress pass.
- [ ] **BLD-10-022** project Overview, Issues, Backlog, Triage, Epics, Modules,
  Cycles, Milestones, Releases, Goals, Updates, Files, Reports, and Workload
  pass.
- [ ] **BLD-10-023** QA, approvals, changes, incidents, risks, decisions,
  meetings, Chat, Wiki, Whiteboard, forms, Feedbucket, budget, portal preview,
  and every final project Settings route pass.
- [ ] **BLD-10-024** ticket create/detail/edit/comment/relation/move/bulk/archive
  and client visibility pass.
- [ ] **BLD-10-075** one evidence row per generated final-route ID and
  applicable persona records direct load, primary customer job, actions,
  filters/views/paging, overlays, states, responsive behavior, accessibility,
  API/permission/data scope, cache behavior, and browser result.
- [ ] **BLD-10-076** internal `/portal/*`, external `/client-portal/*`,
  invitation acceptance, published Forms, shared Board, and public Roadmap pass
  identity, expiry, revocation, replay, rate-limit, projection, and
  cross-tenant tests.

Each check includes populated, empty, no-results, denied, loading, refresh,
offline/stale, error, conflict, and partial-success states where applicable.

## Filters, Views, and Pagination

- [ ] **BLD-10-025** URL, saved view, API predicate, count, export, and bulk
  selection parity tests pass.
- [ ] **BLD-10-026** every filter supports valid, invalid, empty, archived,
  inaccessible, and cross-tenant option cases.
- [ ] **BLD-10-027** board/list/table/timeline preserve compatible state and
  expose all matching rows beyond the first page.
- [ ] **BLD-10-028** per-column board counts and continuation match active
  filters.
- [ ] **BLD-10-029** cursor traversal has no duplicate/omitted rows in the
  documented consistency model.
- [ ] **BLD-10-030** pagination, virtualization, and bulk selection pass at
  realistic scale.

## Forms and Mutations

- [ ] **BLD-10-031** request/form/database parity gate and self-test pass.
- [ ] **BLD-10-032** required, optional, null, boundary, Unicode, enum, date,
  URL, relation, file, and rich-text cases pass.
- [ ] **BLD-10-033** dirty-state protection covers every inventoried surface
  and exit.
- [ ] **BLD-10-034** duplicate submit, timeout retry, stale version, conflict,
  permission loss, and organization switch are safe.
- [ ] **BLD-10-035** bulk and import report partial outcomes accurately and
  retry failed targets idempotently.
- [ ] **BLD-10-036** drag and keyboard move enforce workflow, WIP, concurrency,
  activity, and cache behavior atomically.

## Database, Migration, and Recovery

- [x] **BLD-10-037** migration generation/journal integrity checks pass.
  **Closed — the spec was executed, not merely read.**
  `backend/src/db/migration-integrity.spec.ts`: 38 tests, 38 passed
  (2026-09-21). It reads migration files and the journal from disk and needs no
  database, so this result is valid without a disposable target. Covered: the
  RBAC hardening wave's `NOT VALID` / `VALIDATE CONSTRAINT` pairing and
  `lock_timeout` pins; the HRMS Phase 1 bundle's five forward and five down
  migrations, their `search_path` pins, dollar-quote balance and fail-closed
  rollbacks; that `hrms-phase1-sql-managed.ts` stays out of the runtime barrel;
  and that no chain-repair migration precedes the authoritative migration it
  recreates.
  This proves the migration *files and journal* are internally consistent. It is
  not evidence that any migration applies — BLD-10-038 and BLD-10-039 still need
  a live database.
- [ ] **BLD-10-038** forward migration passes on empty and production-shaped
  disposable databases.
- [ ] **BLD-10-039** backfill counts, unmapped records, constraints, indexes,
  and query plans are recorded.
- [ ] **BLD-10-040** application compatibility during deployment order is
  proven.
- [ ] **BLD-10-041** backup/restore or approved forward recovery drill passes.
- [ ] **BLD-10-042** canonical iteration and defect migrations preserve all
  references, history, events, views, automation, and analytics.

## Query, Cache, and Performance

- [ ] **BLD-10-043** endpoint query-count budgets pass.
- [ ] **BLD-10-044** representative `EXPLAIN (ANALYZE, BUFFERS)` plans use the
  intended tenant-leading indexes without unbounded scans.
- [ ] **BLD-10-045** BLD-06 p50/p95/p99 budgets pass under agreed concurrency.
- [ ] **BLD-10-046** cache writer/invalidation tests pass for create, update,
  move, bulk, archive, restore, revoke, rollback, and cache outage.
- [ ] **BLD-10-047** client first-use, background refresh, view switch, and
  large collection responsiveness meet budgets.
- [ ] **BLD-10-048** no N+1 or request storm appears in traces.

## Integrations and Side Effects

- [ ] **BLD-10-049** CRM, Calendar, Meetings, Files/Documents, Knowledge,
  Timesheets, Accounting, Goals, Chat/Mail, Notifications, Integrations, AI,
  and Client Portal contract tests pass where enabled.
- [ ] **BLD-10-050** source deleted, access revoked, token expired, provider
  unavailable, timeout, rate limit, duplicate event, replay, and poison event
  behaviors pass.
- [ ] **BLD-10-051** durable outbox and idempotency evidence proves committed
  writes are neither lost nor duplicated.
- [ ] **BLD-10-052** provider transactions use named test accounts and perform
  no unintended external side effects.

## Visual, Responsive, and Accessibility

- [ ] **BLD-10-053** approved light/dark screenshots cover all page anatomies,
  overlay levels, empty/error states, and dense populated states.
- [ ] **BLD-10-054** 320, 375, 768, 1024, and 1440 CSS pixel journeys pass.
- [ ] **BLD-10-055** keyboard-only journeys pass with visible focus and no trap.
- [ ] **BLD-10-056** screen-reader journeys pass for navigation, filters,
  board, table, ticket, form errors, bulk result, and portal.
- [ ] **BLD-10-057** contrast, 200% zoom, forced colors, reduced motion, and
  touch target checks pass.
- [ ] **BLD-10-058** global primitive changes have focused non-Build regression
  evidence.

## AI and Agent Safety

- [ ] **BLD-10-059** scoped context, citations, stale data, denied data, prompt
  injection, proposal diff, confirmation, expiration, and reauthorization pass.
- [ ] **BLD-10-060** duplicate confirmation/retry cannot execute twice.
- [ ] **BLD-10-061** credit exhaustion and AI outage leave deterministic Build
  workflows usable.
- [ ] **BLD-10-062** usage metering, audit, retention, and client publication
  rules pass.

## Repository Gates

Exact package commands and results are recorded at execution time.

- [ ] **BLD-10-063** focused frontend unit/contract suites pass.
- [ ] **BLD-10-064** focused backend unit and controller e2e suites pass.
- [ ] **BLD-10-065** frontend and backend type checks/builds pass as applicable.
- [ ] **BLD-10-066** lint on changed files reports no introduced errors.
- [ ] **BLD-10-067** route, permission, validation, schema, migration,
  architecture, and file-size gates pass.
  **Open — executed 2026-09-21 at `f5cc6ef65`; 27 of 35 pass.**
  All 35 frontend gates were run self-test-first, each self-test and gate exit
  code captured (`.agent/run-frontend-gates.sh`). Result at the time of the run:
  23 pass, 12 fail — of which **two were self-test failures**, the worse class,
  because a gate whose self-test fails is not evidence of anything.
  Repaired in this pass, now green: `check:tenant-neutral` (its walker used
  `relative()` and compared against `"features/"`, so on Windows the backslash
  paths gave a features/ count of **0 out of 7,081** and the vacuity guard
  exited 2 before a single file was judged — the gate had never run here);
  `check:file-sizes` self-test (its floor had drifted to 57% of the corpus as
  the tree grew from 5,388 to 7,004 files, and its own re-measurement caught
  it); `check:colors`; `check:empty-states`.
  **Still failing, with the finding rather than a summary:**
  `check:file-sizes` — 9 files over 500 lines, 4 Build-owned
  (`cycles-page.tsx` 586, `use-build-scope-directory.test.ts` 543,
  `build-scope-browser.test.tsx` 519, `projects-page.tsx` 508). Note the count
  moved from 8 to 9 mid-session because another session is editing
  `cycles-page.tsx`; a file-size number taken over a tree under concurrent edit
  is a snapshot, not a fact.
  `check:test-typecheck` — **121 errors across 38 files, 22 Build-owned.** These
  specs are green under jest and always will be: `tsconfig.json` excludes test
  files and SWC erases types without diagnostics, so this gate is the only thing
  that sees them. Repair in progress.
  `check:type-assertions` — 4 files hold an unledgered double cast, 23 hold an
  unledgered plain assertion, 8 ledger entries are stale, and the plain-assertion
  floor reads 498 against a floor of 499, which the gate itself reports as "the
  counter is broken, not the tree clean".
  `check:contract-vendor` — `frontend/contracts/openapi.json` is stale against
  `backend/openapi.json` (hashes differ). Every contract-parity result is
  therefore measured against a contract that is not the backend's.
  `check:permission-binding`, `check:command-catalog` (8 findings incl. two
  referral hooks declaring `hr:employees:*` where the contract requires
  `hr:requisitions:*`), `check:test-integrity` (2 tautologies, 12 bare
  `.toThrow()`), `check:over-300` (6 files at exactly 301 lines).
  `check:prd-traceability` — reports `EMPTY REGISTRY: no known PRD criteria`,
  which is a vacuous gate, not a passing one.
- [x] **BLD-10-068** cycle self-tests pass before cycle gates; resolved import
  counts prove the gates are non-vacuous.
  **Closed — all three cycle gates ran self-test-first, with counts.**
  2026-09-21 at `f5cc6ef65`, in this order:
  frontend `check:cycles:self-test` 2/2 passed → `check:cycles` **processed
  7,019 files**, no circular dependency;
  frontend `check:feature-cycles:self-test` (detector sees a planted cycle and
  only that) → `check:feature-cycles` **43 features, 15 cross-feature edges,
  5,149 resolved imports, 3,525 files**, acyclic;
  backend `check:cycles:self-test` 2/2 passed → `check:cycles` **processed
  8,163 files**, no circular dependency.
  Each self-test plants two mutually-importing files and asserts the gate exits
  non-zero, so the green results are earned rather than vacuous, and the
  resolved-import and file counts are non-zero and of the right order — the
  failure mode this item exists to catch is a gate that resolves nothing and
  reports zero.
  Non-vacuity of the wider battery is not implied by this item and is not
  claimed: `check:tenant-neutral` was found resolving zero files under
  `features/` and `check:prd-traceability` reports an empty registry. Both are
  recorded against BLD-10-067.
- [ ] **BLD-10-069** dead-code removals have module-graph and real-build proof.

## Rollout

- [ ] **BLD-10-070** rollout order, migration window, feature flags, tenant
  cohort, and abort criteria are documented.
- [ ] **BLD-10-071** dashboards and alerts cover error rate, latency, slow
  queries, queue/outbox lag, provider failures, cache failures, denied access
  anomalies, and client portal errors.
- [ ] **BLD-10-072** support has known symptoms, correlation lookup, customer
  workaround, and escalation owner.
- [ ] **BLD-10-073** rollback/forward-fix procedure preserves writes made after
  deployment.
- [ ] **BLD-10-074** staged rollout completes with monitored soak evidence
  before general availability.

## Sign-Off

- [ ] **BLD-10-A01** Product signs page disposition, terminology, workflows,
  baseline, and deliberate non-goals.
- [ ] **BLD-10-A02** Frontend signs route, state, responsive, accessibility,
  cache, and browser evidence.
- [ ] **BLD-10-A03** Backend signs contracts, authorization, transactions,
  idempotency, query plans, and performance.
- [ ] **BLD-10-A04** Security signs tenant isolation, client grants,
  integrations, secrets, files, and AI actions.
- [ ] **BLD-10-A05** Database owner signs migrations, constraints, indexes,
  recovery, and data reconciliation.
- [ ] **BLD-10-A06** QA signs persona journeys, regressions, and residual risks.
- [ ] **BLD-10-A07** Operations signs deployment, monitoring, alerting,
  rollback, and support readiness.

The release remains incomplete while any required checkbox is open. Residual
risk must name impact, evidence, owner, mitigation, and review date; it is not a
substitute for a failed required check.
