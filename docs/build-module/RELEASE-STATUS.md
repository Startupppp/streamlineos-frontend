# Build Module Release Status

**Updated:** 2026-09-25
**Authority:** This is the single release-status document for the Build module. Product contracts remain in the numbered specifications; future competitive work remains in `06-prioritized-backlog.md`.

## Scope

- The authenticated route manifest contains 65 canonical Build pages, all marked `KEEP`.
- The complete Build route census contains 74 routes: 65 authenticated pages and nine portal/public collaboration routes.
- PM Workspace is retired from the UI, API, contracts, permissions, routes, source tree, and production database. Organization is the tenancy boundary; products and projects are the working scopes.
- `/build/[projectId]/intake`, `/forms`, and `/triage` remain separate canonical jobs.

## Seven-phase position

| Phase | Current state | Evidence |
|---|---|---|
| 0. Baseline and control | Complete | Route manifest, route census, this status document, and the durable page specifications are reconciled. |
| 1. Data and security foundation | Complete for the current release | Sprint/Cycle and QA Bug contraction is applied; authorization census is `VULNERABLE=0`, `NEEDS-REVIEW=0`. |
| 2. Core daily workflow | Complete for the current release | My Work, Inbox, All Work, Backlog, Cycles, Triage, Forms, bulk actions, URL state, and focus refresh are implemented and focused-tested. |
| 3. Planning and product management | Complete for the current release | Roadmap, Goals, Programs, Portfolios, Managed Products, Releases, Milestones, Reports, Analytics, and Workload parent routes passed authenticated browser verification. |
| 4. Collaboration and external workflows | Complete for the current release | Client Portal, client access, change requests, Feedbucket, forms, approvals, updates, chat, and meetings parent routes passed authenticated browser verification. |
| 5. Execution and governance | Complete for the current release | QA, incidents, risks, decisions, automations, webhooks, files, wiki, whiteboard, workflow settings, project settings, and integrations parent routes passed authenticated browser verification. |
| 6. Performance and UX hardening | Complete for Build-owned release work | Build cache focus sync, mobile overflow, ticket-detail drawer behavior, contract parsing, route access, feature cycles, and workspace-removal checks are verified. |
| 7. Release verification | Complete for the current release | Backend and migrations are live. Frontend Build release merge `67cf4342f` is in `origin/main`; production Vercel deployed containing commit `c7f810a9e`, and authenticated production smoke passed for Build home, project issues, and ticket detail. |

"Complete for the current release" does not mean the aspirational P1/P2 competitor backlog is finished. Those future product investments remain explicitly listed in `06-prioritized-backlog.md`.

## Backend and authorization

- Backend release commit `f139e315f` is contained in backend `origin/main`, deployed, and healthy at `https://api.streamlineos.in/health`.
- The current authorization census covers 49 controllers and 325 handlers:
  - `VULNERABLE=0`
  - `NEEDS-REVIEW=0`
  - `CLOSED=42`
  - `VERIFIED=283`
- The generated Markdown and JSON census artifacts in `backend-docs/` match backend `origin/main`.
- The focused backend integration matrix passed 41 suites and 482 tests. Backend typecheck, build, permission-key validation, route-budget self-test, feature-cycle scan, and migration-discipline checks passed.

## Production migrations

- Production ledger: 948 applied rows against 943 journal entries.
- Watermark: `1803000010701`.
- Pending migrations: zero.
- Five known orphan rows remain below the watermark; none is pending or unreachable.
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
- Build-owned unsafe assertion findings: zero. The assertion gate still reports unrelated pre-existing Inventory, HR, Wiki, editor, and infrastructure debt.
- Build-owned gated-read findings: zero. The gate still reports two unrelated HR recruitment reads.
- The dead-code classifier reports no Build deletion candidate. Its current dead files are in Knowledge Base, outside this release.

## Browser verification

The candidate was exercised through a real authenticated browser against the production API.

- Desktop parent-route matrix passed for every org-scoped and project-scoped Build parent page.
- Data-backed detail routes `/build/6/cycles/10` and `/build/6/tickets/BQS-1` passed.
- Mobile checks passed at 375 x 812 for Build home, My Work, All Work, Command Center, Issues, Backlog, Reports, Access, ticket detail, Client Portal, project settings, Forms, and Incidents.
- Issues actions no longer clip at 375 px.
- Ticket properties start closed on mobile, open only on explicit action, and expose a visible close control.
- Programs and My Work preserve deep-linked URL state.
- Returning focus to the Build tab triggers the scoped active-query refresh path without losing URL state.
- Current browser console errors: none on the verified production routes.
- Workspace text is absent; the remaining `All of Build / Organization` selector is intentional organization scope, not a module-level workspace.
- Authenticated production-domain smoke passed on `/build`, `/build/6/issues`, and `/build/6/tickets/BQS-1` on 2026-09-25.
- Each production smoke route rendered its expected data-backed UI with zero fresh console errors and no document-level horizontal overflow.

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

- Frontend Build release merge `67cf4342f` is contained in `origin/main`.
- `Vercel - streamlineos-frontend`, the production project, reported `Deployment has completed` for `c7f810a9e`, which contains the Build release merge.
- The production-domain unauthenticated `/build` smoke passed with the expected sign-in redirect and no console errors.
- The authenticated production-domain smoke passed for `/build`, `/build/6/issues`, and `/build/6/tickets/BQS-1` with no fresh console errors.

## Acceptance criteria

- [x] Canonical route inventory and physical pages agree.
- [x] PM Workspace is absent from source, bundles, APIs, and production storage.
- [x] Build authorization census is `VULNERABLE=0` and `NEEDS-REVIEW=0`.
- [x] Production migration ledger has zero pending migrations.
- [x] Frontend and backend focused tests and typechecks pass.
- [x] Authenticated desktop and mobile browser matrices pass locally against the production API.
- [x] Frontend candidate is merged into `origin/main`.
- [x] Vercel reports a successful deployment for that commit.
- [x] Production-domain Build smoke passes without current console errors.
