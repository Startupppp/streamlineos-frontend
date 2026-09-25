# Build Module Release Status

**Updated:** 2026-09-25
**Authority:** This is the single release-status document for the Build module. Product contracts remain in the numbered specifications; future competitive work remains in `06-prioritized-backlog.md`.

This document tracks the current production-release checklist, not total Build
product completion. The full normative PRD remains open: the current source
tree contains 39 checked and 619 unchecked acceptance boxes across the Build
module and sidebar PRDs (658 total, counted directly from the current PRD tree). Do not report this release checklist as full PRD
completion; use `docs/specs/build/module/README.md` and its child PRDs for the
complete product definition of done.

## Scope

- The authenticated route manifest contains 65 canonical Build pages, all marked `KEEP`.
- The complete Build route census contains 74 routes: 65 authenticated pages and nine portal/public collaboration routes.
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
| 6. Performance and UX hardening | Partially verified | Build cache focus sync, mobile overflow, ticket-detail drawer behavior, contract parsing, route access, feature cycles, and workspace-removal checks are verified. Fresh build `pbXZoKVBF7wCmr_bCnlWo` measured all 13 declared route bundles and confirmed eight first-load JS breaches, including `/build/inbox` at 660,565 bytes and `/build/my-work` at 664,385 bytes against the 524,288-byte ceiling. The attempted Inbox lazy split regressed the existing render contract and was reverted. |
| 7. Release verification | Partially verified | Authenticated production smoke passed for the ticket-detail route observed in this audit. Migration `1197` is verified; the live migration ledger has zero pending rows but still fails its orphan-row integrity gate, and current deployment identity and the full browser matrix remain open. |

"Complete for the current release" does not mean the aspirational P1/P2 competitor backlog is finished. Those future product investments remain explicitly listed in `06-prioritized-backlog.md`.

## Backend and authorization

- Backend release commit `b5a2553c1` is contained in backend `origin/main`; the health endpoint responds 200 at `https://api.streamlineos.in/health`. The latest analytics, project-bound workflow-read, bounded ticket-detail relation, checklist-item read, malformed ticket-filter, bounded-search validation, filtered column-count, portfolio-search, malformed collection-cursor, tenant-scoped goal-owner projection, and authorization-evidence refresh fixes are pushed and await the normal deployment rollout.
- The current authorization census covers 49 controllers and 325 handlers:
  - `VULNERABLE=0`
  - `NEEDS-REVIEW=0`
  - `CLOSED=42`
  - `VERIFIED=283`
- The generated Markdown and JSON census artifacts in the backend `docs/build-module/` match backend `origin/main`.
- The focused backend integration matrix passed 41 suites and 482 tests. Backend typecheck, build, permission-key validation, route-budget self-test, feature-cycle scan, and migration-discipline checks passed.

## Production migrations

- The production ledger was queried through the backend IAM-aware migration client on 2026-09-25.
- Migration `1197_build_cycle_permissions.sql` is applied on production RDS; its journal hash is present exactly once. The live ledger check on 2026-09-25 reported 967 applied rows against 967 journal entries and zero pending migrations, but failed the integrity gate on five unrelated orphaned HR rows (`1187`–`1191`) below the watermark.
- Build migration `1204_build_feedback_account_snapshots.sql` is applied to production RDS; `build.feedback_posts.account_tier_snapshot`, its tenant-scoped partial index, and the exact journal hash were read back after commit.
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
- Workflow assertion-cleanup matrix: nine suites, 94 tests passed.
- `check:pm-workspace-removal`: pass across source and built chunks.
- `check:route-access-contract`: pass.
- `check:feature-cycles`: pass across 46 features and 5,700 resolved imports.
- Focused ESLint: zero errors.
- Fresh route-bundle measurement for build `pbXZoKVBF7wCmr_bCnlWo`: 13 routes measured, zero pending measurements, eight first-load JS budget breaches; the gate fails with the breaches visible rather than treating them as inconclusive.
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
- Build-owned gated-read findings: zero. The gate still reports two unrelated HR recruitment reads.
- The dead-code classifier reports no Build deletion candidate. Its current dead files are in Knowledge Base, outside this release.
- Filtered column-count reads now accept and apply the same validated board filter contract as board rows, including search, status, priority, assignee, labels, cycle, module, epic, and due-date filters. Explicit zero aggregates remain zero instead of falling back to loaded-row counts. Focused backend aggregate/schema tests pass 34/34; focused frontend filter/board/count tests pass 33/33.
- Build list queries no longer retain previous project rows while a new project scope is loading; focused scope-switch coverage passes 8/8.
- Ticket version conflicts expose a reapply action, offline draft mutations drain on reconnect, and the Build cache sync refreshes active queries on focus/visibility and across tabs; the focused recovery matrix passes 20/20 tests.
- Approval inbox and project approval lists now return validated cursor pages and the two approval screens load subsequent pages without the previous first-100-row ceiling; focused approval suites pass 15/15.
- Project Forms now return a validated cursor page, preserve legacy array responses during rollout, and load subsequent pages in the UI; focused Forms verification passes 24 tests across frontend and backend.
- Form submissions now use the same validated timestamp/id cursor page, and the submissions tab can load subsequent records while accepting the legacy array response during rollout.
- Project Incidents now return a validated detected-at/ID cursor page, and the incident list loads subsequent records while accepting the legacy array response during rollout.
- Project Modules now return a validated name/ID cursor page; the Modules page loads subsequent records while embedded selectors continue to normalize the page contract to their existing array API.

## Browser verification

The candidate was exercised through a real authenticated browser against the production API.

- The current audit verified the authenticated production ticket route `/build/6/tickets/BQS-2` in the real browser.
- The authenticated production desktop sweep covered the 65 canonical org/project pages in parallel batches on 2026-09-25. Managed-product roadmap, portfolio detail, team detail, project Meeting detail, and QA Run detail with fixture ID `1` now render their recoverable states without console errors. The full matrix remains open for mobile coverage and deployment-identity evidence.
- The mobile matrix remains open.
- Issues actions no longer clip at 375 px.
- Ticket properties start closed on mobile, open only on explicit action, and expose a visible close control.
- Programs and My Work preserve deep-linked URL state.
- Returning focus to the Build tab triggers the scoped active-query refresh path without losing URL state.
- Current browser console errors: none on the verified production routes.
- Workspace text is absent; the remaining `All of Build / Organization` selector is intentional organization scope, not a module-level workspace.
- Earlier smoke evidence for `/build`, `/build/6/issues`, and `/build/6/tickets/BQS-1` is retained as historical evidence; it is not a substitute for the current full matrix.
- The current browser observation rendered `/build/6/tickets/BQS-2` with ticket data and no visible error state.
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
