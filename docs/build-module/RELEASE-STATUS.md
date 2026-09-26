# Build Module Release Status

**Updated:** 2026-09-26
**Authority:** This is the single release-status document for the Build module. Product contracts remain in the numbered specifications; future competitive work remains in `06-prioritized-backlog.md`.

This document tracks the current production-release checklist, not total Build
product completion. The full normative PRD remains open: the current source
tree contains 39 checked and 619 unchecked acceptance boxes across the Build
module and sidebar PRDs (658 total, counted directly from the current PRD tree). Do not report this release checklist as full PRD
completion; use `docs/specs/build/module/README.md` and its child PRDs for the
complete product definition of done.

## Checkout reconciliation

The working checkout is ahead of the configured remote on more than one repository;
this is not deployment evidence. The current local Build evidence includes backend
commits `121c1727e` and `bb1f175fb`, plus frontend commits `6ffc21b48`,
`cae206a6c`, and `b41041440`.
The frontend and backend branches also contain unrelated Knowledge Base work that
must remain separate. Treat a Build commit as deployed only after the deployment
identity is read from the running service. Older commit hashes elsewhere in this
document are retained as historical evidence for the release they describe and do
not prove that the current checkout is deployed.

## Scope

- The authenticated route manifest contains 74 canonical Build pages, all marked `KEEP`.
- The complete Build route census contains 83 routes: 74 authenticated pages and nine portal/public collaboration routes.
- The normative route-count prose is reconciled to that generated census; the older 93/84 figures were stale authored counts, not additional live pages.
- PM Workspace is retired from the UI, API, contracts, permissions, routes, source tree, and production database. Organization is the tenancy boundary; products and projects are the working scopes.
- `/build/[projectId]/intake`, `/forms`, and `/triage` remain separate canonical jobs.

## Seven-phase position

| Phase | Current state | Evidence |
|---|---|---|
| 0. Baseline and control | Complete | Route manifest, route census, this status document, and the durable page specifications are reconciled. |
| 1. Data and security foundation | Partially verified | Sprint/Cycle and QA Bug contraction is present; authorization census is `VULNERABLE=0`, `NEEDS-REVIEW=0`. The live ledger reports 967 applied rows, 967 journal entries, and zero pending migrations; its integrity check still fails on five unrelated orphaned HR rows (`1187`–`1191`) below the watermark. Build migration `1197` is applied and verified on production RDS. |
| 2. Core daily workflow | Complete for the current release | My Work, Inbox, All Work, Backlog, Cycles, Triage, Forms, bulk actions, URL state, and focus refresh are implemented and focused-tested. |
| 3. Planning and product management | Complete for the current release | Roadmap, Goals, Programs, Portfolios, Managed Products, Releases, Milestones, Reports, Analytics, and Workload parent routes passed authenticated browser verification. |
| 4. Collaboration and external workflows | Complete for the current release | Client Portal, client access, change requests, Feedbucket, forms, approvals, updates, chat, and meetings parent routes passed authenticated browser verification. |
| 5. Execution and governance | Complete for the current release | QA, incidents, risks, decisions, automations, webhooks, files, wiki, whiteboard, workflow settings, project settings, and integrations parent routes passed authenticated browser verification. |
| 6. Performance and UX hardening | Partially verified | Fresh build `egn5C-y4teNVJ5D_PFOui` measured all 13 declared route bundles with zero pending measurements and confirmed seven first-load JS breaches, including `/build/inbox` at 610,731 bytes and `/build/my-work` at 645,663 bytes against the 524,288-byte ceiling. Chromium responsive UI coverage passed 31/31 gallery checks at 375px, 768px, and 1280px; the latest rerun is hydration-clean after the SearchInput boundary fix. |
| 7. Release verification | Partially verified | Authenticated production smoke passed for the ticket-detail route observed in this audit. Migration `1197` is verified; the live migration ledger has zero pending rows but still fails its orphan-row integrity gate, and current deployment identity and the full browser matrix remain open. |

"Complete for the current release" does not mean the aspirational P1/P2 competitor backlog is finished. Those future product investments remain explicitly listed in `06-prioritized-backlog.md`.

## Backend and authorization

- Backend release commit `b5a2553c1` is contained in backend `origin/main`; the health endpoint responds 200 at `https://api.streamlineos.in/health`. The latest analytics, project-bound workflow-read, bounded ticket-detail relation, checklist-item read, malformed ticket-filter, bounded-search validation, filtered column-count, portfolio-search, malformed collection-cursor, tenant-scoped goal-owner projection, and authorization-evidence refresh fixes are pushed and await the normal deployment rollout.
- The current authorization census covers 49 controllers and 325 handlers:
  - `VULNERABLE=0`
  - `NEEDS-REVIEW=0`
  - `CLOSED=42`
  - `VERIFIED=283`
- The generated Markdown and JSON census artifacts in the backend `docs/build-module/` match the current local backend Build source; remote deployment parity remains open.
- The Build backend matrix passed 231 suites and 2,301 tests after refreshing authorization evidence and cursor-pagination expectations. Backend typecheck, build, permission-key validation, route-budget self-test, feature-cycle scan, and migration-discipline checks remain separately tracked.
- Fresh P1-4 handoff verification passed 4 focused suites and 48 tests across quote lifecycle, quote tenant isolation, signed-envelope completion, and deal-linked project provisioning. The authenticated browser handoff remains open because this environment has no configured E2E tenant/session fixture.

## Production migrations

- The production ledger was queried through the backend IAM-aware migration client on 2026-09-25.
- Migration `1197_build_cycle_permissions.sql` is applied on production RDS; its journal hash is present exactly once. The live ledger check on 2026-09-25 reported 967 applied rows against 967 journal entries and zero pending migrations, but failed the integrity gate on five unrelated orphaned HR rows (`1187`–`1191`) below the watermark.
- Build migration `1204_build_feedback_account_snapshots.sql` is applied to production RDS; `build.feedback_posts.account_tier_snapshot`, its tenant-scoped partial index, and the exact journal hash were read back after commit.
- Production-shaped Build read-cost verification is now IAM-aware and green on 2026-09-26: `db:check-read-budgets:build` measured all 6 declared Build budgets with 100% non-empty coverage and 0 failures; `db:check-build-reads` also passed, with high-selectivity sequential scans reported as warnings rather than index defects.
- Build deal-to-project provisioning now returns the existing organization-scoped project for a CRM deal on retry; backend commit `ad0044c83` and its focused tenant-isolation suite prevent duplicate project creation. Quote detail now exposes project and invoice destinations, and project-scoped My Time now filters entries and defaults the log-time sheet from `?projectId=`. Authenticated browser evidence for the quote actions and the full quote-to-sign-to-time-to-invoice-to-payment handoff remains open under P1-4.
- Production contains canonical `build:cycles:view` and `build:cycles:manage` permissions, and the legacy sprint permission rows are absent.
- The general migration runner reports a large mixed-module backlog because production is not at the current repository journal state. It was not replayed; unrelated HR, CRM, billing, and platform migrations were deliberately left untouched.
- Canonical Build search migrations are:
  - `1185_roadmap_search_id_probe`
  - `1186_project_programs_list_indexes`
- Production originally recorded the same migration bytes under historical names `1177` and `1178`; their hashes match the canonical files.
- Snapshot `streamlineos-pre-build-1177-1178-20260924-1` was available before application.
- All 11 expected indexes and both search functions exist. Both functions are `SECURITY DEFINER`, executable by `streamline_app`, and tenant-scoped through `app.current_org_id()`.
- The production cross-tenant probe returned zero rows.

## Frontend verification

Current release-candidate checks:

- `pnpm type-check`: pass.
- `pnpm type-check:specs`: pass.
- `pnpm build`: pass; all 482 application routes completed production compilation and page generation.
- The canonical Windows `pnpm build` invocation now uses Node's cross-platform memory flag in frontend commit `c2ae44ac4`; it completed successfully with all 482 generated pages after the script fix.
- Focused affected-surface matrix: 15 suites, 192 tests passed.
- Build-only Jest matrix: 188 suites and 1,424 tests pass after aligning the portfolio detail assertion with the shared cursor paginator.
- Workflow assertion-cleanup matrix: nine suites, 94 tests passed.
- `check:pm-workspace-removal`: pass across source and built chunks.
- `check:gate-wiring`: pass; the PM Workspace-removal gate is now invoked by the frontend CI gates job.
- `check:route-access-contract`: pass.
- Build import/export command hooks are classified with their declared permissions; focused import/export suites pass 22/22 and `pnpm type-check:specs` passes after correcting the public Form, Intake, Roadmap, Updates, and Whiteboard test contracts. The remaining 23 `check:command-catalog` findings are outside Build.
- `check-build-execution-plan.mjs` and `frontend pnpm run check:prd-traceability` pass; the restored control plan is present and 103 owned acceptance checkboxes map to 10 criterion sections. These structural checks do not close the remaining product acceptance criteria.
- `check:feature-cycles`: pass across 46 features and 5,700 resolved imports.
- Focused ESLint: zero errors.
- A fresh frontend `pnpm run type-check` rerun on 2026-09-25 is currently red on concurrent Knowledge Base work, not Build code: `features/wiki/components/knowledge-analytics-page.tsx` has four `InfiniteData` narrowing errors plus two implicit-any errors, and `hooks/api/kb/analytics.ts` has a missing `KbGapRelatedPageRow` export and missing `queryKeys.gapRelatedPages`. Preserve those unrelated edits for their owning session; this is not current Build evidence.
- Fresh static gate rerun passed: route-access contract (215 permission keys), feature-cycle scan (46 features / 3,883 files), PM Workspace removal (1,989 source files / 3,641 chunks), route thinness (595 authenticated modules, zero in-scope thick), and permission binding (2,620 Build-relevant bindings with no Build-owned mismatch).
- Fresh production build `egn5C-y4teNVJ5D_PFOui` completed successfully with 483 generated pages and a green frontend typecheck. Its route-bundle measurement covered 13 routes with zero pending measurements and still reports seven first-load JS budget breaches; the gate fails with the breaches visible rather than treating them as inconclusive. Current Build values are `/build/inbox` 610,731 bytes and `/build/my-work` 645,663 bytes against the 524,288-byte default ceiling.
- Playwright `e2e/build-list-responsive.spec.ts`: 31/31 Chromium checks passed at 375px, 768px, and 1280px, covering overflow, focus return, filter drawers, pagination reachability, responsive cards/tables, loading, and empty states. The latest rerun is hydration-clean.
- `git diff --check`: pass.
- Latest frontend Build navigation, filtered board-count, malformed-filter normalization, portfolio-search, Command Center title consistency, retry-refresh, stale-detail recovery, expected missing-record telemetry, invalid project-id rejection, dirty-navigation protection, scope-switch stale-data fixes, project-scoped ticket-detail cache identity, cross-tab access/entitlement freshness hardening, and the All Work navigation typecheck fix are on `origin/main` at the current release commit:
  backlog, My Work, draft, and keyboard shortcut navigation now use the shared
  dirty-state guard; focused regressions pass.
- The Build view switcher now routes Calendar to the unified `/calendar` surface
  with `source=build` and `projectId`, and the local Build calendar renderer was
  removed. Direct `/build/:projectId/issues?view=calendar` links are normalized
  to the same canonical route; focused URL-state and view-render tests pass.
- The `/sprints` consolidation was completed without losing planning capability:
  canonical `/build/:projectId/cycles` now owns backlog-to-cycle planning,
  unfinished-ticket handling during completion, and the velocity panel. The
  removed sprint route remains absent; the restored cycle workflow passed 12
  cycles-page tests and local browser verification.
- Build programmatic navigation now passes through the dirty-state leave guard
  for user-triggered redirects across cycle detail, project lists, triage,
  feedback submissions, Gantt, and the restored board navigation paths. The
  focused guard matrix passes 47 tests.
- Build-owned browser test fixtures were split out of the scope-directory and
  scope-browser suites; both remain below the 500-line review gate. The current
  frontend release commits are `daa52469a`, `b6e5753e4`, and `8c4b7ed8a` on
  `origin/main`.
- Build-owned unsafe assertion findings: zero. The assertion gate still reports unrelated pre-existing Inventory, HR, Wiki, editor, and infrastructure debt.
- The Build status-contrast sweep is pushed in frontend commit `e9ee068e6`; the follow-up Kanban WIP badge coverage fix is pushed in `ca1d40463`. The current Build-owned token audit has 164 strong text-token usages and 46 remaining intentional icon-only/non-text usages. The focused accessibility matrix passes 9/9 tests, the Kanban and saved-view matrix passes 10/10 tests, and the full frontend type-check remains green.
- The project Saved Views settings page now uses the existing views API and mutation hooks with loading, empty, error, permission, create, rename, pin, delete, and navigation handling. Its focused page and saved-view suites pass 6/6 tests; local browser verification of `/build/6/settings/views` rendered the page and opened the Create View dialog with no console errors.
- Project layout regression coverage now verifies missing projects become the not-found boundary, forbidden projects become the access-denied boundary, and backend-unreachable responses become the recoverable unavailable state; the focused suite passes 5/5 tests.
- Two nested Build surfaces that could previously fall through to empty-looking content now resolve access explicitly before rendering: affected tickets on change requests and roadmap delivery progress. The denial audit reports no newly added Build-owned findings; focused change-request and roadmap state suites pass 17/17 tests.
- Project Workflow now resolves through the shared `PageState` boundary with an explicit `build:workflow:view` permission, preserving loading, empty, error, and ready states. Its focused state suite passes 3/3 tests, and local browser verification of `/build/6/settings/workflow` rendered statuses, WIP controls, and transitions with no console errors. URL-backed workflow filters and keyboard navigation remain open because this page is configuration, not a filterable work list.
- Workflow transitions and the organization-level All Work saved-view menu now independently refuse to render while their `build:workflow:view` or `build:view` access state is denied/loading; the focused Workflow and All Work suites pass 7/7, and both stale Build entries were removed from the denial exception ledger.
- Ticket detail checklists, relations, and watchers now resolve `build:tickets:view` explicitly before rendering loading, error, or empty content, so a denied ticket cannot appear empty; the focused ticket-detail suites pass 11/11 and the local browser verification of `/build/6/tickets/BQS-2` rendered all three surfaces without a visible runtime error.
- Project Automations now resolves `build:view` before rendering its empty state, matching the permission that gates `useAutomations`; its focused page suite passes 3/3 and local browser verification of `/build/6/settings/automations` rendered the real empty state without a visible runtime error.
- Project creation's template step now distinguishes denied template access from an empty template catalog while keeping Blank Project available; the focused project-create guard suite passes 4/4 and TypeScript passes.
- All six project report sections now resolve `build:view` before rendering chart-empty states; the focused reports suite passes 14/14 and local browser verification of `/build/6/reports` rendered the Agile Reports tabs, charts, and legitimate empty states without a visible runtime error.
- Project custom fields, organization labels, and project member roles now resolve `build:view` before rendering their loading, error, or empty states; the focused custom-field and label suites pass 27/27, TypeScript passes, and local browser verification of `/build/6/settings/fields` rendered the settings surface without a visible runtime error.
- Project Webhooks and their delivery panel now resolve the `build:manage` read contract before rendering configuration or delivery-empty states; the focused webhook suite passes 9/9, TypeScript passes, and local browser verification of `/build/6/settings/integrations/webhooks` rendered the configured empty state without a visible runtime error.
- The QA test-case sheet and whiteboard share dialog now resolve their parent read permissions before rendering nested empty states; focused QA and whiteboard suites pass 21/21, TypeScript passes, and local browser verification of `/build/6/qa` and `/build/6/whiteboard` rendered their authenticated empty states without visible runtime errors.
- The project board and Gantt view now resolve `build:view` before rendering their work-empty states; the focused Gantt row suite passes 14/14, TypeScript passes, and local browser verification of `/build/6/issues` plus `/build/6/issues?view=gantt` rendered the board and Timeline view with real project controls and no visible runtime errors.
- Build-owned gated-read findings: zero. The gate still reports two unrelated HR recruitment reads.
- The org-wide executive-brief Build health summary now computes its five scalar outputs in one tenant-scoped SQL aggregate, and resource-allocation user hydration is explicitly capped to the cursor page in backend commits `121c1727e` and `bb1f175fb`. Focused analytics and executive-brief coverage passes 32/32. On 2026-09-26, the canonical `db:check-read-budgets:build` command measured both production-shaped analytics reads under `streamline_app` with tenant RLS active: `build-org-project-health-summary` (56 cold shared-hit blocks, p95 1.522ms) and `build-resource-allocation` (60 cold shared-hit blocks, p95 0.725ms), alongside the four existing Build budgets; 6/6 non-empty and 0 failures.
- The dead-code classifier reports no Build deletion candidate. Its current dead files are in Knowledge Base, outside this release.
- Filtered column-count reads now accept and apply the same validated board filter contract as board rows, including search, status, priority, assignee, labels, cycle, module, epic, and due-date filters. Explicit zero aggregates remain zero instead of falling back to loaded-row counts. Focused backend aggregate/schema tests pass 34/34; focused frontend filter/board/count tests pass 33/33.
- Build list queries no longer retain previous project rows while a new project scope is loading; focused scope-switch coverage passes 8/8.
- Ticket version conflicts expose a reapply action, offline draft mutations drain on reconnect, and the Build cache sync refreshes active queries on focus/visibility and across tabs; the focused recovery matrix passes 20/20 tests.
- Successful role, membership, user-module-access, module-member, module-group, and module-grant mutations now emit the organization-scoped access invalidation signal so sibling tabs cannot retain stale permission state; the cross-tab and optimistic-access suites pass 10/10. The broader Build cache-writer matrix remains open.
- Approval inbox and project approval lists now return validated cursor pages and the two approval screens load subsequent pages without the previous first-100-row ceiling; focused approval suites pass 15/15.
- Project Forms now return a validated cursor page, preserve legacy array responses during rollout, and load subsequent pages in the UI; focused Forms verification passes 24 tests across frontend and backend.
- Form submissions now use the same validated timestamp/id cursor page, and the submissions tab can load subsequent records while accepting the legacy array response during rollout.
- Project Incidents now return a validated detected-at/ID cursor page, and the incident list loads subsequent records while accepting the legacy array response during rollout.
- Project Modules now return a validated name/ID cursor page; the Modules page loads subsequent records while embedded selectors continue to normalize the page contract to their existing array API.

## Browser verification

The candidate was exercised through a real authenticated browser against the production API.

- The current audit verified the authenticated production ticket route `/build/6/tickets/BQS-2` in the real browser.
- The authenticated production desktop sweep covered the 74 canonical org/project pages in parallel batches on 2026-09-25. Managed-product roadmap, portfolio detail, team detail, project Meeting detail, and QA Run detail with fixture ID `1` now render their recoverable states without console errors. The full matrix remains open for mobile coverage and deployment-identity evidence.
- The mobile matrix remains open.
- Issues actions no longer clip at 375 px.
- Ticket properties start closed on mobile, open only on explicit action, and expose a visible close control.
- Programs and My Work preserve deep-linked URL state.
- Returning focus to the Build tab triggers the scoped active-query refresh path without losing URL state.
- Current browser console errors: none on the verified production routes.
- Workspace text is absent; the remaining `All of Build / Organization` selector is intentional organization scope, not a module-level workspace.
- Earlier smoke evidence for `/build`, `/build/6/issues`, and `/build/6/tickets/BQS-1` is retained as historical evidence; it is not a substitute for the current full matrix.
- The current browser observation rendered `/build/6/tickets/BQS-2` with ticket data and no visible error state.
- The development-only Build list gallery reran 31/31 checks at 375px, 768px, and 1280px without the earlier React hydration warning.
- The local browser direct link `/build/6/issues?view=calendar` normalized to the unified `/calendar?projectId=6` surface after the Calendar source deep-link handler ran, with no console errors.
- Focused backend schema evidence covers oversized direct URL searches: project Issues, All Work, and organization ticket search reject terms over 200 characters and trim valid terms.
- Local port `1000` browser checks also rendered `/build/my-work`,
  `/build/inbox?view=drafts`, `/build/6/backlog`, and
  `/build/command-center` without a visible runtime error; the canonical
  page heading is `Command Center`.
- The 65-route local matrix included Projects, Command Center, My Work, Inbox,
  All Work, Goals, Managed Products, Portfolios, Programs, Roadmap, Teams,
  Templates, Approvals, Build settings, and all 40 project routes under
  `/build/6`, without a visible runtime-error or failed-load surface.
- Local port `1000` view-switcher verification routed `/build/6/issues` to
  `/calendar?q=login&status=TODO&cycle=7&projectId=6&source=build`; the unified
  Calendar surface rendered with no browser console errors.
- A mismatched project ticket URL `/build/5/tickets/BQS-2` resolved to the
  unavailable-scope state and Page Not Found surface without exposing ticket
  data or crashing the shell.
- Both the local port `1000` candidate and production `/build/command-center`
  render the canonical `Command Center` heading; the production smoke for that
  route is current, while the complete production matrix remains open.
- Local port `1000` malformed enum deep links such as
  `/build/6/issues?priority=NOT_A_PRIORITY&type=NOT_A_TYPE` now remove the
  invalid parameters and remain on the Issues page without an error state.
- The shared ticket-filter path used by Backlog also drops malformed enum
  values before building its request; its focused regression is included in
  the current frontend test matrix.
- Local port `1000` remains the browser verification target for the current
  candidate; production behavior for the new filtered aggregate endpoint stays
  pending until the backend deployment containing its release commit is observed.

Some detail pages have no production fixture rows for forms, incidents, meetings, QA runs, wiki pages, goals, portfolios, managed products, or teams. Their authenticated parent empty states passed; no production business data was created solely for testing.

## External repository debt

These failures are measured and are not Build-owned:

- `check:gated-reads`: two HR recruitment routes are unresolved.
- `check:named-handlers`: one Wiki closure remains.
- `check:type-assertions`: Inventory, HR, Wiki, editor, and infrastructure findings remain; no Build offender remains.
- `check:dead-code`: two Knowledge Base files and new HR/KB classifications remain.
- Backend test typecheck, unbounded-read, and rollback gates contain unrelated HR, KB, accounting, timesheet, and ATS debt recorded in the backend release evidence.
- Deployment-source gap: `.github/workflows/frontend.yml` in `Startupppp/Streamlineos` is CI-only and contains no deployment job. Production frontend assets therefore come from an external deployment source that is not represented in this repository; its commit/build identity must be recorded before production verification can be authoritative.

## Release actions

Completed:

- Frontend `origin/main` contains the current release commit (Command Center route labeling is consistent with its canonical route and page retry refreshes its server-derived summaries; portfolio search is sent as the server-side `q` parameter; stale detail reads remain recoverable; expected 404 rejections are excluded from global browser error reporting; invalid project IDs fail before prefetch; dirty navigation is guarded; project list queries do not retain previous-scope rows; ticket-detail caches include project and ticket identity; access and entitlement reads refresh on focus/reconnect and entitlement invalidation is organization-scoped; All Work navigation passes the full frontend typecheck; the prior malformed-filter and board-count fixes remain in the same release line).
- Access and entitlement queries now refresh on focus/reconnect, and organization-scoped storage listeners invalidate entitlement reads in another tab; focused cross-tab and billing regressions pass.
- The Build scope-directory test factory now models each real infinite-query page-param type without assertions; the test file is 483 lines and its 24-test matrix plus the full frontend typecheck pass.
- Backend `origin/main` contains `b5a2553c1`, including the Build portfolio cursor validation, tenant-scoped goal-owner projection, refreshed authorization census, and migration-discipline baseline fixes.
- The portfolio list UI renders its loading and empty states locally on port `1000`; authenticated production verification of `/build/portfolios?q=platform` now reaches the server-filtered empty state without a runtime error.
- Portfolio and managed-product list services now reject malformed cursors with a bounded `400`; the local UI remains stable against the currently deployed older API, which still treats that input as the first page.
- Goal list and detail responses now resolve owner membership IDs to tenant-scoped user projections in one batch for collections, avoiding the previous always-unassigned response.
- The production-domain unauthenticated `/build` smoke passed with the expected sign-in redirect and no console errors.
- The current browser observation passed for `/build/6/tickets/BQS-2`; the corrected stale-detail routes were rechecked after rollout and are clean. The desktop matrix is exercised, but the release pass remains open until mobile coverage and deployment identity are recorded.
- Local port `1000` browser verification rendered `/build/6/cycles` with real
  upcoming cycle rows, no console errors, a Velocity empty state, and the
  planning sheet showing the backlog and cycle regions after opening `Plan
  work` from the cycle actions menu.
- Production `/build/portfolios?q=platform`, `/build/managed-products`, `/build/goals`, and `/build/command-center` were rechecked in the real browser without visible errors.
- Local port `1000` browser verification rechecked `/build/inbox?view=drafts` and `/build/command-center`; both rendered their canonical headings without visible runtime errors.
- Local port `1000` browser verification rechecked `/build/6/issues`; the project scope, canonical sidebar routes, board columns, WIP counts, and real QA tickets rendered in the authenticated UI.
- On 2026-09-26, a fresh local port `1000` responsive sweep covered `/build`, `/build/inbox`, `/build/my-work`, `/build/6/issues`, and `/build/6/tickets/BQS-2` at 375x844 and 1280x900. Each route rendered its authenticated surface without a visible runtime-error state, and the browser reported zero console errors. This is additional sampled evidence, not a replacement for the full 83-route production matrix.
- On 2026-09-26, a fresh authenticated production browser check rendered `/build/command-center`, `/build/inbox`, `/build/6/issues`, and `/build/managed-products`. Command Center showed live project and issue shortcuts, Inbox showed its notification tabs and caught-up state, Issues showed the Build QA Sandbox board with real tickets and board controls, and Managed Products showed its permission-safe empty state. No visible runtime-error surface appeared; this is representative evidence, not a replacement for the full 83-route production matrix.
- The same production browser session also rendered `/build/portfolios`, `/build/programs`, `/build/teams`, `/build/6/cycles`, and `/build/6/reports`; each showed its canonical heading, expected organization/project scope, and page controls or recoverable loading/empty states without a visible runtime-error surface. This expands the current production sample to 9 Build routes, but does not close the full 83-route matrix.
- The first production navigation to `/build/6/files` briefly exposed an intermediate `All Projects`/`Board` shell before hydration; after the real browser settled, the route rendered the canonical `Files` heading, `Project files and documents` subtitle, `Upload file` action, and the `No files yet` empty state. Local and settled production output now agree; deployment identity remains open, but this route is no longer a confirmed source/deployment mismatch.
- An earlier production batch briefly exposed a `Board` shell at `/build/6/intake`; a fresh settled recheck on 2026-09-26 now renders the canonical `Intake` heading, `Collect and triage incoming requests from your team or clients`, Pending/Accepted/Declined/All tabs, `Copy Form URL`, `New Item`, and the safe `No pending items` state. The transient observation remains historical; settled production and local output now agree for this route.
- A settled production browser batch also rendered `/build/6/decisions`, `/build/6/epics`, `/build/6/feedbucket`, `/build/6/meetings`, and `/build/6/qa/runs/1` with their canonical Decisions Log, Epics, Feedback, Meetings, and Test Run surfaces. Empty, loading, and detail states were visible without a runtime-error surface.
- Production `/build/6/settings/access` and `/build/6/settings/fields` returned the generic Page Not Found surface, while local port `1000` rendered the valid Access page with member roles/roster and the Custom Fields page with search and Add Custom Field controls. Both route files exist in the current source; these are deployment-parity failures until the production frontend rolls forward.
- Inbox pagination deep links are now functional: `useInboxUrlState` validates positive numeric cursors, `InboxPage` passes the cursor into `useInfiniteNotifications`, and the first request starts at that cursor without leaking the UI-only `initialCursor` field to the API. The focused URL/query suites pass 35/35; local browser checks of `/build/inbox?cursor=42` and `/build/inbox?cursor=not-a-cursor` both render `Inbox` with zero console errors.
- An attempted All Work `productId`/`teamId` contract was verified against the running backend and withdrawn from the frontend send-path because the deployed API currently rejects both fields with `400 VALIDATION_FAILED`. Local backend schema/query support remains unshipped and must be deployed with an explicit backend release before the URL filters can be enabled safely.
- My Work now treats `relation` as the canonical URL key, preserves legacy `tab` links, maps the documented `watching` relation to the existing subscribed scope, and exposes real `relation=overdue` and `relation=due-soon` tabs. Local backend work now also supports tenant-scoped `mentioned`, `blocked`, and `recently-completed` predicates; recently completed uses the existing seven-day convention and a status-change activity event. These contracts remain deployment-gated because the configured production API has not rolled them out. Focused frontend coverage includes overdue and seven-day due-soon; frontend relation rollout and production evidence remain open.

## Acceptance criteria

- [x] Canonical route inventory and physical pages agree.
- [x] PM Workspace is absent from source, bundles, APIs, and production storage.
- [x] Build authorization census is `VULNERABLE=0` and `NEEDS-REVIEW=0`.
- [ ] Production migration ledger has zero pending migrations and includes migration `1197` (1197 is complete; the unrelated mixed-module backlog remains).
- [x] Frontend and backend focused tests and typechecks pass.
- [ ] Authenticated desktop and mobile browser matrices pass for the full Build route census against the production API.
- [x] Frontend candidate is merged into `origin/main`.
- [ ] Deployment status for the latest frontend and backend commits is verified.
- [x] Production-domain Build smoke passes without current console errors.
