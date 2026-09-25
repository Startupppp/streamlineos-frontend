# Build Module Release Status

**Updated:** 2026-09-25
**Authority:** This is the single release-status document for the Build module. Product contracts remain in the numbered specifications; future competitive work remains in `06-prioritized-backlog.md`.

This document tracks the current production-release checklist, not total Build
product completion. The full normative PRD remains open: the current source
tree contains 36 checked and 618 unchecked acceptance boxes across the Build
module and sidebar PRDs. Do not report this release checklist as full PRD
completion; use `docs/specs/build/module/README.md` and its child PRDs for the
complete product definition of done.

## Scope

- The authenticated route manifest contains 65 canonical Build pages, all marked `KEEP`.
- The complete Build route census contains 74 routes: 65 authenticated pages and nine portal/public collaboration routes.
- PM Workspace is retired from the UI, API, contracts, permissions, routes, source tree, and production database. Organization is the tenancy boundary; products and projects are the working scopes.
- `/build/[projectId]/intake`, `/forms`, and `/triage` remain separate canonical jobs.

## Seven-phase position

| Phase | Current state | Evidence |
|---|---|---|
| 0. Baseline and control | Complete | Route manifest, route census, this status document, and the durable page specifications are reconciled. |
| 1. Data and security foundation | Partially verified | Sprint/Cycle and QA Bug contraction is present; authorization census is `VULNERABLE=0`, `NEEDS-REVIEW=0`. Build migration `1197` is applied and verified on production RDS; the mixed historical journal still has unrelated pending entries. |
| 2. Core daily workflow | Complete for the current release | My Work, Inbox, All Work, Backlog, Cycles, Triage, Forms, bulk actions, URL state, and focus refresh are implemented and focused-tested. |
| 3. Planning and product management | Complete for the current release | Roadmap, Goals, Programs, Portfolios, Managed Products, Releases, Milestones, Reports, Analytics, and Workload parent routes passed authenticated browser verification. |
| 4. Collaboration and external workflows | Complete for the current release | Client Portal, client access, change requests, Feedbucket, forms, approvals, updates, chat, and meetings parent routes passed authenticated browser verification. |
| 5. Execution and governance | Complete for the current release | QA, incidents, risks, decisions, automations, webhooks, files, wiki, whiteboard, workflow settings, project settings, and integrations parent routes passed authenticated browser verification. |
| 6. Performance and UX hardening | Complete for Build-owned release work | Build cache focus sync, mobile overflow, ticket-detail drawer behavior, contract parsing, route access, feature cycles, and workspace-removal checks are verified. |
| 7. Release verification | Partially verified | Authenticated production smoke passed for the ticket-detail route observed in this audit. Migration `1197` is verified; current deployment identity and the full browser matrix remain open. |

"Complete for the current release" does not mean the aspirational P1/P2 competitor backlog is finished. Those future product investments remain explicitly listed in `06-prioritized-backlog.md`.

## Backend and authorization

- Backend release commit `b358a2238` is contained in backend `origin/main`; the health endpoint responds 200 at `https://api.streamlineos.in/health`. The latest analytics, project-bound workflow-read, bounded ticket-detail relation, checklist-item read, malformed ticket-filter, and bounded-search validation fixes are pushed and await the normal deployment rollout.
- The current authorization census covers 49 controllers and 325 handlers:
  - `VULNERABLE=0`
  - `NEEDS-REVIEW=0`
  - `CLOSED=42`
  - `VERIFIED=283`
- The generated Markdown and JSON census artifacts in `backend-docs/` match backend `origin/main`.
- The focused backend integration matrix passed 41 suites and 482 tests. Backend typecheck, build, permission-key validation, route-budget self-test, feature-cycle scan, and migration-discipline checks passed.

## Production migrations

- The production ledger was queried through the backend IAM-aware migration client on 2026-09-25.
- Migration `1197_build_cycle_permissions.sql` is applied on production RDS; its journal hash is present exactly once.
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
- `pnpm build`: pass; all 480 application routes completed production compilation and page generation.
- Focused affected-surface matrix: 15 suites, 192 tests passed.
- Workflow assertion-cleanup matrix: nine suites, 94 tests passed.
- `check:pm-workspace-removal`: pass across source and built chunks.
- `check:route-access-contract`: pass.
- `check:feature-cycles`: pass across 46 features and 5,700 resolved imports.
- Focused ESLint: zero errors.
- `git diff --check`: pass.
- Latest frontend Build navigation fixes are on `origin/main` at `b2c605b69`:
  backlog, My Work, draft, and keyboard shortcut navigation now use the shared
  dirty-state guard; focused regressions pass.
- The Build view switcher now routes Calendar to the unified `/calendar` surface
  with `source=build` and `projectId`, and the local Build calendar renderer was
  removed. Direct `/build/:projectId/issues?view=calendar` links are normalized
  to the same canonical route; focused URL-state and view-render tests pass.
- Build-owned unsafe assertion findings: zero. The assertion gate still reports unrelated pre-existing Inventory, HR, Wiki, editor, and infrastructure debt.
- Build-owned gated-read findings: zero. The gate still reports two unrelated HR recruitment reads.
- The dead-code classifier reports no Build deletion candidate. Its current dead files are in Knowledge Base, outside this release.

## Browser verification

The candidate was exercised through a real authenticated browser against the production API.

- The current audit verified the authenticated production ticket route `/build/6/tickets/BQS-2` in the real browser.
- A complete org/project parent-route matrix and mobile matrix are not reverified in this audit.
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
  `/build/command-center` without a visible runtime error.
- Local port `1000` view-switcher verification routed `/build/6/issues` to
  `/calendar?q=login&status=TODO&cycle=7&projectId=6&source=build`; the unified
  Calendar surface rendered with no browser console errors.
- A mismatched project ticket URL `/build/5/tickets/BQS-2` resolved to the
  unavailable-scope state and Page Not Found surface without exposing ticket
  data or crashing the shell.

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

- Frontend `origin/main` currently contains the documented Build changes; the deployment identity for the latest commit was not queried in this audit.
- The production-domain unauthenticated `/build` smoke passed with the expected sign-in redirect and no console errors.
- The current browser observation passed for `/build/6/tickets/BQS-2`; the full production route matrix remains open.

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
