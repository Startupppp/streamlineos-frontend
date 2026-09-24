# StreamlineOS Build: six isolated Claude implementation prompts

Generated from the current code on 2026-09-24.

Current evidence:

- Frontend/root `main` equals `origin/main` at `b17524c56a9d0c11626347d6cd7720602cdfe17e`.
- Backend working checkout is unsafe for parallel work: it is two commits ahead, eight commits behind `origin/main`, and contains six uncommitted notification-spec edits.
- Backend `origin/main` is `c30dd601003e16c3ba3844126e0eda3410592b07` and contains the Build release-cohesion fixes.
- There are 65 authenticated Build pages. Route, module-manifest, route-thinness, route-access, and PM Workspace removal gates pass on the frontend.
- PM Workspace is retired. It must not be restored as a route, entity, selector, permission, API, type, cache key, or UI concept.
- `/build` and `/build/6/backlog` render production-backed data locally with no browser console errors. Codex, not Claude, owns final browser verification.

Do not paste all six prompts into checkouts that share a working directory. Each prompt creates and uses unique worktrees. Prompts 1-6 produce reviewable commits and must not merge or push `main`. After all six finish, give the commit SHAs to Codex for ordered integration, migration reconciliation, and browser verification.

## Prompt 1: Phase 1 data, migrations, contracts, and security

```text
You are the Phase 1 data and security owner for the StreamlineOS Build module. Work autonomously. Do not ask questions. Use evidence from the current repository and choose the safest implementation consistent with existing patterns.

REPOSITORIES
- Frontend/root repository: D:\projects\personal\Streamlineos
- Backend repository: D:\projects\personal\Streamlineos\backend
- Never edit either existing checkout. The backend checkout is dirty and diverged.
- Fetch both repositories first.
- Create a backend worktree from backend origin/main at D:\projects\personal\slos-api-build-p1-foundation on branch claude/build-p1-foundation-20260924.
- Create a root worktree from root origin/main at D:\projects\personal\slos-build-p1-foundation on branch claude/build-p1-foundation-20260924.
- If either exact branch or path exists, add a numeric suffix. Never reuse or clean another worktree.

OWNERSHIP
You may edit only:
- backend/migrations/**
- backend/src/db/schema/build/**
- backend/src/modules/build/phase-2/**
- backend/src/scripts/check-migration-*.mjs
- backend/src/scripts/check-tenant-isolation-coverage.mjs only when the gate itself is demonstrably wrong
- backend/contracts/openapi.json and backend/contracts/api-contract-registry.json only through official generators
- focused Build isolation or migration tests needed for this lane
- root/frontend vendored API contracts only through the repository's official contract generation or copy command
Do not edit Build pages, feature components, navigation, hooks, package files, lockfiles, or docs.

NON-NEGOTIABLE RULES
- Do not merge or push main. Commit only to your branch and report SHA(s).
- Do not use browser automation. Codex owns all UI verification.
- Do not run whole-repository Jest, all frontend tests, all backend tests, full builds, or broad typechecks.
- Run only migration/contract/security gates and focused specs related to changed files.
- Do not add code comments, JSDoc, TODO, FIXME, explanatory block comments, or commented-out code.
- Do not hand-edit generated contracts. Use `pnpm registry:generate` and the official OpenAPI generator.
- Do not restore PM Workspace tombstones to runtime code. Retained `/build/workspaces*` registry records are compatibility tombstones and must remain non-runtime.
- Do not apply non-Build migrations. Do not touch pending Knowledge Base or AI migrations.
- Do not hide failures with baselines, exclusions, skipped tests, broad casts, `any`, lint disables, or weaker assertions.

CURRENT FACTS TO VERIFY FROM origin/main
- Release-cohesion commits including `ac32da27e`, `ce8bc7ad5`, `d4ac1d6df`, and the final migration-order repair are ancestors of backend origin/main.
- Build migrations 1141, 1142, 1164, 1165, 1166, and 1167 were previously applied to production.
- The current Build schema must contain no `pm_workspaces`, `pm_workspace_members`, `pm_workspace_id`, legacy `build.sprints`, legacy `build.bugs`, `tickets.sprint_id`, or `test_run_results.linked_bug_id` runtime declaration.
- Canonical entities are Cycle and Ticket with `type=BUG`.

TODO
1. Run `pnpm check:migration-discipline`, `pnpm check:migration-chain`, `pnpm check:migration-rollback`, `pnpm check:contract-registry`, `pnpm check:route-duplicates`, and `pnpm check:tenant-isolation` from the clean origin/main worktree.
2. Fix only Build-caused failures. Classify unrelated module failures in the final report and leave them untouched.
3. Verify journal entries and hashes for 1141, 1142, 1164-1167. Ensure there are no duplicate journal indices and no letter-suffix ordering defect involving the current 1172a/1173 chain.
4. Verify composite `(org_id, parent_id)` foreign keys and project-bound nested-resource constraints for all Build-owned child tables. Add a focused invariant test for any uncovered Build relation.
5. Verify every tenant-owned Build service has an executing cross-tenant negative test with a positive control. In particular verify `build-automation-actions.service.ts`; do not accept filename-only static coverage.
6. Regenerate the API contract registry if the official check reports missing Build endpoints. Confirm automation run history, change-request affected-ticket endpoints, incident decisions, and incident follow-ups are classified internal and permissioned.
7. Run read-only production ledger/catalog verification using the existing RDS tooling and configured credentials. Never print secrets. Confirm the six Build migration hashes and postconditions. If a listed Build migration is genuinely pending, create a fresh RDS snapshot, wait until it is available, apply only that exact journalled migration with the repository tool, and verify postconditions. Otherwise make no database mutation.
8. Search for legacy Sprint, Bug-table, and PM Workspace runtime references using `rg`. Historical migrations, rollback files, invariant fixtures, compatibility redirects, and contract tombstones are allowed only when tests prove their purpose.
9. Remove dead Phase 1 files, duplicate schema helpers, pass-through wrappers, unused types, and duplicate validators only inside the owned paths. Before deleting, prove no static import, dynamic import, Nest registration, string lookup, migration dependency, or test fixture needs them.
10. Keep validation canonical: reuse an existing schema when the shape is identical. Inline a one-use local type/helper instead of creating a separate file. Do not introduce a new service for delegation-only logic.

FOCUSED VERIFICATION ONLY
- The gates in TODO 1.
- Jest only for changed `backend/src/modules/build/phase-2/**`, changed Build schema invariants, and changed isolation specs, using exact test paths and at most two workers.
- `git diff --check` in both worktrees.
- Run ESLint only on changed TypeScript files when a scoped command is available.

DONE MEANS
- All Build-specific Phase 1 gates pass from clean origin/main-based worktrees.
- Production Build migration state is verified by hash and catalog postcondition.
- No legacy runtime model is reintroduced.
- No unrelated source or dirty checkout was touched.
- Commits contain only owned files.
- Final response lists commit SHA(s), changed files, deleted files with proof, focused commands and results, production migration actions or explicit no-op evidence, and unrelated failures left untouched.
```

## Prompt 2: Phase 2 core daily workflow

```text
You are the Phase 2 core workflow owner for the StreamlineOS Build module. Work autonomously and do not ask questions. Implement only this lane and preserve all behavior outside it.

SETUP
- Root repo: D:\projects\personal\Streamlineos
- Backend repo: D:\projects\personal\Streamlineos\backend
- Never edit the existing checkouts.
- Fetch both repositories.
- Create root worktree D:\projects\personal\slos-build-p2-workflow from root origin/main on claude/build-p2-workflow-20260924.
- Create backend worktree D:\projects\personal\slos-api-build-p2-workflow from backend origin/main on claude/build-p2-workflow-20260924.
- Add a numeric suffix if a path or branch exists.

OWNERSHIP
Frontend ownership is limited to:
- frontend/features/build/my-work/**
- frontend/features/build/all-work/**
- frontend/features/build/inbox/**
- frontend/features/build/backlog/**
- frontend/features/build/cycles/**
- frontend/features/build/views/**
- frontend/features/build/tickets/**
- frontend/features/build/ticket-details/**
- frontend/features/build/forms/**
- frontend/features/build/triage/**
- frontend/features/build/import-export/**
- corresponding frontend/hooks/api/build files only when exclusively used by these surfaces
Backend ownership is limited to existing ticket, work-query, cycle, forms, triage/intake, comment, relation, checklist, saved-view, bulk-mutation, and import/export services/controllers and their focused tests.
Forbidden: navigation, route manifest, `/intake` route deletion, managed products, roadmap, goals, portfolios, programs, reports, workload, client portal, Feedbucket, incidents, QA, automations, settings, migrations/meta/_journal.json, generated contracts, docs, package files, and lockfiles.

RULES
- Do not merge or push main. Commit and report SHA(s).
- No browser automation. Codex owns browser verification.
- No full test suite, full build, or whole-repo typecheck. Test only changed code and direct contracts.
- No new comments, JSDoc, TODO, FIXME, commented-out code, `any`, lint disables, or skipped tests.
- Do not create a separate type/helper/service file for one caller. Inline it. Reuse an existing shared primitive when it already fits.
- Delete dead or duplicate code only inside owned paths and only after proving no imports, dynamic loads, registry references, or runtime callers.
- PM Workspace must remain absent.

TODO
1. Audit every owned screen against its current page spec and actual implementation. Treat old status prose as historical; verify code before changing it.
2. Make My Work, All Work, Inbox/Drafts, Issues, Backlog, Cycles, Forms, and Triage preserve filters, grouping, sort, view, pagination cursor, and selected tab in URL query parameters where sharing the state is meaningful.
3. Use the existing shared URL-state primitives without editing their implementation. Remove local duplicate query parsing and duplicate serializers in owned paths.
4. Ensure all lists distinguish loading, empty, filtered-empty, retryable error, permission denied, missing project, and offline/conflict states. A missing project must recover to All Projects and must never crash the authenticated layout.
5. Complete keyboard behavior for row navigation, multi-select, bulk actions, board/list/table/timeline switching, and escape/focus restoration. Do not add hidden shortcuts that conflict with text inputs.
6. Verify bulk actions are bounded, preserve per-project authorization, report partial conflicts clearly, invalidate only affected query keys, and roll back optimistic state on failure.
7. Verify saved views round-trip all supported state. Keep the persisted database vocabulary `gantt` only at the storage boundary while the product/UI vocabulary remains `timeline`.
8. Verify Cycle is the only active iteration concept and Ticket `type=BUG` is the only active bug concept. Remove duplicate frontend Sprint/Bug compatibility logic in owned runtime code when no real caller remains.
9. Complete offline draft and reconnect behavior for ticket/comment edits. Surface version conflicts with refresh/retry/reapply choices; never silently overwrite newer server data.
10. Verify import/export supports CSV plus the currently implemented provider formats with preview, row validation, mapping, bounded writes, stable idempotency keys, atomic rollback, and an outcome report. Do not invent a provider adapter that has no implemented parser or API contract.
11. Remove dead components, duplicate formatters, duplicate status maps, one-use exported types, and pass-through hooks in owned paths. Prefer the canonical status/priority/assignee components already present.
12. Keep pages dense and operational. Do not redesign visual styling, navigation, or shared components in this lane.

FOCUSED VERIFICATION ONLY
- Run Jest by exact changed test paths for the owned feature folders and backend services.
- Run existing route/access/static gates only if a changed file participates in them.
- Run ESLint only on changed files.
- Run `git diff --check` in both worktrees.
- Do not run `pnpm test`, all Build tests, `pnpm build`, or broad typecheck.

DONE MEANS
- Every TODO is either implemented or proven already complete with exact file/test evidence.
- No owned screen loses an existing action or deep link.
- No unowned file changed.
- Final response gives commit SHA(s), file list, deletion proof, focused test results, and any genuine product blocker without modifying docs.
```

## Prompt 3: Phase 3 product planning and portfolio management

```text
You are the Phase 3 product-planning owner for StreamlineOS Build. Work autonomously. Do not ask questions and do not touch another lane.

SETUP
- Create fresh root and backend worktrees from their respective origin/main refs.
- Root: D:\projects\personal\slos-build-p3-planning on claude/build-p3-planning-20260924.
- Backend: D:\projects\personal\slos-api-build-p3-planning on claude/build-p3-planning-20260924.
- Add numeric suffixes if needed. Never edit D:\projects\personal\Streamlineos or its existing backend checkout.

OWNERSHIP
Frontend:
- frontend/features/build/managed-products/**
- frontend/features/build/roadmap/**
- frontend/features/build/goals/**
- frontend/features/build/programs/**
- frontend/features/build/portfolios/**
- frontend/features/build/releases/**
- frontend/features/build/milestones/**
- frontend/features/build/reports/**
- frontend/features/build/workload/**
- exclusive hooks for those domains
Backend:
- existing Build managed-product, roadmap, goal, program, portfolio, release, milestone, report, analytics, workload, allocation, velocity, and product-feedback code and focused tests
- Build schema files exclusively owned by these entities, but no journal edits
Forbidden: core issue workflow UI, collaboration, portal, Feedbucket, governance, incidents, QA, automations, navigation, shared UI primitives, generated contracts, docs, package files, lockfiles, and migration journal.

RULES
- Do not merge or push main. Commit and report SHA(s).
- No browser work; Codex owns UI verification.
- No full suites/builds/typechecks. Run focused tests for changed files only.
- No code comments, JSDoc, TODO, FIXME, commented-out code, broad casts, disabled rules, or skipped tests.
- Do not create thin wrappers or isolated type files for one consumer. Reuse or inline.
- Delete dead/duplicate code only within owned paths after a complete caller and registration census.
- Keep Portfolio and Program as distinct concepts: Portfolio owns investment/value grouping; Program owns coordinated delivery/governance. Make copy and data behavior reflect that distinction.

TODO
1. Verify and complete Roadmap, Goals, Programs, Portfolios, Managed Products, Product Feedback, Product Insights, Releases, Milestones, Reports, and Workload from current code, not historical checkbox claims.
2. Ensure every list has URL-backed filters/sort/grouping/view/cursor where shareable, using existing shared primitives without editing them.
3. Verify portfolios and programs have tenant-safe counts and joins with fully qualified SQL identifiers. Prevent ambiguous-column SQL such as unqualified `id` in correlated joins.
4. Complete product prioritization using existing roadmap/account/customer signals. Include CRM-sourced account tier and revenue only when the existing contract supplies them; show unknown rather than zero. Keep scoring deterministic, explainable, and testable.
5. Ensure feedback links to product, customer/account, project, ticket, and release through tenant-safe relations, with non-disclosure 404 behavior across organizations.
6. Complete outcome tracking from roadmap intent through release/milestone delivery and product insight. Do not duplicate project ticket storage.
7. Complete reports/workload pagination and disclosure: velocity must page or clearly state its cap; related links need a cursor beyond their bounded first page; org-wide allocation reads must be cursor-bounded.
8. Measure and reduce report cache invalidation breadth without permitting stale cross-tenant data. Keep query keys scoped by org and project; invalidate only affected reports.
9. Replace leading-wildcard roadmap search with the repository's supported indexed search pattern when evidence shows the current query cannot use an index. Add a focused query-shape/index-alignment test.
10. Implement save/compare/discard delivery scenarios only if the current model already exposes the required people, cost, dependency, and date inputs. Scenarios must never mutate live plans. If a required contract is absent, implement the smallest domain contract inside owned paths and leave migration SQL unjournalled for Phase 1/integration reconciliation.
11. Make Cycle deletion a soft-delete lifecycle only if current production semantics and relations support it; otherwise add a focused invariant proving why hard delete is still required and do not invent unsafe cascading behavior.
12. Remove duplicate selectors, local money/date formatters, duplicate response types, dead charts, unused services, and pass-through helpers in owned paths with caller proof.

FOCUSED VERIFICATION ONLY
- Exact Jest paths for changed frontend files and changed backend service/isolation/query-shape specs.
- Relevant list-projection, tenant-isolation, cache-key, and index-alignment checks only.
- Changed-file ESLint and `git diff --check`.
- No whole-repo commands.

DONE MEANS
- Owned planning workflows are complete, tenant-safe, deep-linkable, bounded, and honest about unknown data.
- Performance items P2-2, P2-4, P2-6, P2-8, related-link pagination, and any safe Cycle lifecycle work are resolved or disproved with focused executable evidence.
- Only owned files changed; final response lists commit SHA(s), deletions and proof, focused tests, and any unjournalled migration file for coordinator handling.
```

## Prompt 4: Phase 4 collaboration, clients, and freelancer flow

```text
You are the Phase 4 collaboration and external-workflow owner for StreamlineOS Build. Work autonomously without questions.

SETUP
- Create root worktree D:\projects\personal\slos-build-p4-collab from root origin/main on claude/build-p4-collab-20260924.
- Create backend worktree D:\projects\personal\slos-api-build-p4-collab from backend origin/main on claude/build-p4-collab-20260924.
- Fetch first, add a numeric suffix on collision, and never edit the current checkouts.

OWNERSHIP
Frontend:
- frontend/features/build/client-portal/**
- frontend/features/build/client-access/**
- frontend/features/build/change-requests/**
- frontend/features/build/feedbucket/**
- frontend/features/build/approvals/**
- frontend/features/build/updates/**
- frontend/features/build/chat/**
- frontend/features/build/meetings/**
- Build-owned public form/intake surfaces and exclusive hooks
- only the smallest existing CRM/Sign/Timesheets/Accounting action components needed for the guided freelancer handoff
Backend:
- backend/src/modules/build/client-portal/**
- existing Build Feedbucket, approval, update, chat, meeting, external access/grant, public form/intake code and focused tests
- smallest existing cross-module handoff services for CRM deal -> quote -> Sign envelope -> Build project -> approved time -> invoice -> payment
Forbidden: product planning, reports, core issue views, governance, incidents, QA, automations, global navigation, shared primitives, migration journal, generated contracts, docs, packages, and lockfiles.

RULES
- Do not merge or push main. Commit and report SHA(s).
- No browser automation. Codex performs all browser verification.
- Test changed code only. No full suites, builds, or broad typechecks.
- Add no comments, JSDoc, TODO, FIXME, commented-out code, lint suppression, `any`, or skipped tests.
- External users may read permitted records, comment where explicitly granted, and submit change requests. Do not grant general project edit rights.
- Use non-disclosure 404s for cross-tenant, cross-project, revoked, and expired grants.
- No duplicate customer database inside Build; CRM owns customer/account identity.

TODO
1. Verify and complete client portal, client grants/access, change requests, Feedbucket submissions, public forms/intake, approvals, updates, chat, and meetings.
2. Ensure grant creation, use, expiry, revocation, project binding, and audit events are tenant-safe. Expired or revoked grants must fail closed without exposing record existence.
3. Verify change-request affected-ticket links are composite-org/project safe, cursor-paginated, deduplicated, auditable, and reflected in frontend impact review.
4. Complete Feedbucket server-side filters for status, type, owner, linked state, duplicate state, date range, search, and cursor. Keep bulk actions bounded to 100, idempotent, permission checked, and explicit that selection is current-page only.
5. Ensure public form submission does not trust org/project ids from the body, rate-limits abuse, validates attachments, and produces a traceable intake/submission without giving public users internal access.
6. Verify comments, updates, chat, meeting notes, decisions, and action items preserve actor identity and project binding. A generated meeting agenda must use Cycle semantics and must not silently return empty because of retired Sprint fields.
7. Complete one guided freelancer handoff: CRM deal/customer -> quote -> Sign envelope -> Build project -> approved timesheet -> invoice -> payment receipt. Carry stable identities forward; never ask the user to retype data held by the previous record. Reuse existing modules rather than copying their entities into Build.
8. Make every handoff resumable and idempotent. If a downstream record exists, open it instead of creating a duplicate. Record audit/activity events for material transitions.
9. Ensure external/client pages have loading, empty, filtered-empty, error, expired/revoked, denied, and offline/retry states without leaking internal-only fields.
10. Remove dead controllers, duplicate DTOs, duplicate portal response types, pass-through services, unused hooks, and duplicate permission helpers only inside owned paths after proving all callers and Nest registrations.
11. Do not recreate the deleted `/build/customers` page. Any Build customer affordance must deep-link to the CRM-owned customer/account surface.

FOCUSED VERIFICATION ONLY
- Exact tests for changed components/services/controllers.
- Cross-tenant and cross-project negative tests plus positive controls for every changed external mutation.
- Focused idempotency, cursor, projection, and grant-expiry tests.
- Changed-file lint and `git diff --check`.
- No whole-repo commands.

DONE MEANS
- External workflows are least-privilege, resumable, auditable, and do not duplicate CRM/Sign/Timesheets/Accounting ownership.
- Final response lists commit SHA(s), owned files, deletion proof, focused tests, and any schema SQL left unjournalled for integration.
```

## Prompt 5: Phase 5 execution, quality, incidents, and governance

```text
You are the Phase 5 execution and governance owner for StreamlineOS Build. Work autonomously and do not ask questions.

SETUP
- Create root worktree D:\projects\personal\slos-build-p5-governance from root origin/main on claude/build-p5-governance-20260924.
- Create backend worktree D:\projects\personal\slos-api-build-p5-governance from backend origin/main on claude/build-p5-governance-20260924.
- Fetch first, add numeric suffixes on collision, and never touch existing checkouts.

OWNERSHIP
Frontend:
- frontend/features/build/qa/**
- frontend/features/build/incidents/**
- frontend/features/build/governance/**
- frontend/features/build/automations/**
- frontend/features/build/files/**
- frontend/features/build/wiki/**
- frontend/features/build/whiteboard/**
- frontend/features/build/settings/** excluding organization-level client access
- frontend/features/build/command-center/** only for AI proposal/run governance
- exclusive Build hooks for these domains
Backend:
- existing Build QA/test case/test run, incident, risk, decision, automation, webhook, file, wiki projection, whiteboard, workflow/project setting, retention/access, and AI proposal/run code and focused tests
Forbidden: daily issue UI, planning/product, client collaboration, Feedbucket, global navigation/route manifest, migrations journal, generated contracts, docs, package files, and lockfiles.

RULES
- Do not merge or push main. Commit and report SHA(s).
- No browser automation. Codex owns browser verification.
- No full suites/builds/typechecks; run focused tests only.
- No new comments, JSDoc, TODO, FIXME, commented-out code, `any`, disabled rules, or skipped tests.
- Ticket `type=BUG` is canonical. Do not restore a separate Bug entity/table/page.
- Build Wiki is a project-scoped projection of Knowledge-owned pages. Do not create parallel page storage.
- Reuse shared retention/legal-hold infrastructure. Do not create a Build-only policy engine.

TODO
1. Verify and complete QA, test cases, test runs, incidents, risks, decisions, automation settings and run history, webhooks, files, Wiki projection, whiteboard, workflow settings, project settings, integrations, retention, and access behavior.
2. Ensure QA evidence attaches to BUG tickets, test results, releases, and incidents without a legacy Bug identity. Preserve history after ticket closure or soft deletion.
3. Complete incident postmortem fields, decisions, follow-up actions, ownership, service/release correlation, and conversion of follow-ups into canonical tickets. Closing an incident must require or explicitly waive unresolved follow-ups according to existing policy.
4. Complete automation run history with action-level outcomes, bounded retries, loop protection, rate guards, idempotency, cancellation semantics, and readable failure reasons. Never execute arbitrary user code.
5. Complete AI proposals as proposals, not silent mutations: citations, proposed diff, affected records, budget/usage, approver, approval decision, durable run history, and rollback/compensation state. Respect organization AI opt-out and data classification.
6. Ensure webhooks verify signatures, enforce receipt replay protection, use bounded delivery retries/timeouts/circuit behavior, and never hold a database transaction open across network I/O.
7. Ensure Files and Wiki use tenant/project authorization, signed URL authorization, retention/legal hold, and audit events. Project Wiki must query Knowledge ownership through an existing supported relation.
8. Ensure Whiteboard sharing and public links expire, revoke, scope to one board/project, and do not reveal other project resources.
9. Complete project workflow/status/custom-field/integration settings with dependency checks before destructive changes, consistent permission denial, and conflict-safe updates.
10. Produce an audit-ready evidence export for incidents, approvals, client evidence, files, and relevant activity by composing existing export/retention/legal-hold services. Do not duplicate storage or bypass hold rules.
11. Remove dead QA/incident/automation controllers, duplicate services, duplicate DTO/schema shapes, one-use exported types, and pass-through wrappers inside owned paths only after import, route, module-registration, event-consumer, and reflection checks.

FOCUSED VERIFICATION ONLY
- Exact frontend and backend tests for changed files.
- Focused tenant isolation, signed URL, webhook durability, transaction-boundary, loop-guard, idempotency, retention, and AI opt-out checks relevant to edits.
- Changed-file lint and `git diff --check`.
- No entire Build suite or repository suite.

DONE MEANS
- Governance flows are canonical, tenant-safe, auditable, recoverable, and do not reintroduce retired models.
- Final response lists commit SHA(s), file ownership, deletion proof, focused test results, and any unjournalled migration SQL for integration.
```

## Prompt 6: Phase 6 shared UX, navigation, performance guardrails, and code hygiene

```text
You are the Phase 6 shared-foundation and hygiene owner for StreamlineOS Build. This lane exists to close shared code without editing domain files owned by Phases 2-5. Work autonomously and do not ask questions.

SETUP
- Create root worktree D:\projects\personal\slos-build-p6-shared from root origin/main on claude/build-p6-shared-20260924.
- Create backend worktree D:\projects\personal\slos-api-build-p6-shared from backend origin/main on claude/build-p6-shared-20260924 only if a backend shared gate needs a Build-specific fix.
- Fetch first, add numeric suffixes on collision, and never touch existing checkouts.

OWNERSHIP
Frontend only:
- frontend/features/build/shared/**
- frontend/features/build/navigation/**
- frontend/features/build/sidebar/**
- frontend/lib/build/**
- frontend/app/(authenticated)/build route modules only for route consolidation or thin wrappers
- frontend/scripts Build-specific gates and their self-tests
- Build-specific entries in existing dead-code verdict/baseline files only when evidence changes
Backend only:
- Build-specific shared cache/query-key utilities and Build-specific static gate code that is not domain-owned
Forbidden: domain feature directories owned by Phases 2-5, backend domain services/controllers, migrations, schema, generated contracts, docs, package files, lockfiles, and current checkouts.

RULES
- Do not merge or push main. Commit and report SHA(s).
- No browser automation. Codex owns desktop/mobile UI verification.
- No full suites, builds, or broad typechecks. Run focused tests and static gates only.
- No code comments, JSDoc, TODO, FIXME, commented-out code, `any`, lint disables, skipped tests, or decorative rewrites.
- Do not add a new shared abstraction unless at least two current callers use it and it removes real duplication.
- Do not move a one-use function/type/component into its own file. Inline it.
- Delete only with static imports, dynamic imports, registry/manifest, route, command-palette, and runtime string-caller proof.

TODO
1. Reconcile the route manifest against the 65 authenticated Build pages bidirectionally. Keep route modules thin and preserve permission gates.
2. Finish the only unresolved route consolidation: retire `/build/[projectId]/intake` only after proving `/forms` owns definitions and `/triage` owns submissions. Redirect old `/intake` deep links to `/triage`, preserve relevant query parameters, update all callers, then delete the old page/feature only if no unique job remains.
3. Keep PM Workspace completely absent. Preserve organization scope plus project/product scopes; do not recreate a module-level workspace layer.
4. Make sidebar, scope selector, command palette, quick create, and More tools use one route catalog and one permission source. Remove duplicate labels, route arrays, scope parsing, and redirect-only components.
5. Preserve scope recovery: deleted, inaccessible, archived, or missing projects must recover to All Projects without crashing the authenticated layout. Unsaved-change guards must work for sidebar, scope selector, and command palette navigation.
6. Ensure shared DataTable, filter bar, bulk bar, chips, pickers, dialog/sheet shells, empty/error/permission states, and keyboard helpers have stable APIs and at least two real Build consumers. Delete speculative components with no caller.
7. Add a visible `:focus-visible` treatment to the shared horizontally scrollable strips that are keyboard-focusable at 375px. Do not alter domain layout or add arbitrary colors.
8. Audit shared query keys, stale times, cancellation, optimistic rollback, and invalidation helpers. Keep org/project scope in every key. Remove the known dead `projects:analytics:*:*` invalidation family if no reader exists in current code.
9. Enforce bounded route bundles and avoid importing heavy editors/charts into global Build navigation. Lazy-load only where the existing framework pattern supports it.
10. Run the Build dead-code gate and classify only Build findings. Delete dead files/exports, duplicate functions/types/services, and pass-through wrappers in owned paths. Do not silence findings with KEEP/WIRE unless a real endpoint and near-term existing consumer prove it.
11. Ensure shared route/access/gated-read/module-manifest checks cover all 65 pages and fail when a page, permission, or manifest entry drifts.
12. Do not edit status docs. Produce evidence in the final response for the integration coordinator.

FOCUSED VERIFICATION ONLY
- `pnpm check:routes`
- `pnpm check:module-manifest`
- `pnpm check:route-thinness`
- `pnpm check:route-access-contract`
- `pnpm check:pm-workspace-removal`
- `pnpm check:dead-code`, but fix only Build-owned findings and report unrelated failures
- exact Jest paths for changed shared/navigation/manifest files
- changed-file ESLint and `git diff --check`
- Do not run full Jest, full build, or broad typecheck.

DONE MEANS
- Shared navigation and route ownership have one source of truth.
- `/intake` is safely consolidated or retained only with executable proof of a unique user job.
- Shared code has no proven dead/duplicate Build artifacts.
- The five focused route/access/removal gates pass.
- Final response lists commit SHA(s), all deletions with caller proof, focused test results, and unrelated failures left untouched.
```

## Integration rule

These branches are intentionally not self-merging. Merge them in this order after review: Phase 1, Phase 6, Phase 2, Phase 3, Phase 4, Phase 5. Rebase each branch on the newly integrated main before cherry-picking or merging it. Resolve generated contracts and migration journal only once, after all domain branches are present. Then Codex performs desktop and 375px browser verification and files defects back to the owning lane.
