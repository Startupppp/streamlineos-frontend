# Managed Product code audit — second pass, 2026-10-12

## Scope and decision rule

This is a current-code review of the product-owned Build area: product directory, overview, feedback, insights/discovery, goals, linked projects, roadmap, releases, settings, public product roadmap, and WOW/value reasons 71–76. Markdown checkboxes and status labels were ignored. The Markdown files were used only as the accepted behavior contract.

**Current result: substantially implemented, but not complete.** The first audit is superseded by this file. Current code now contains centralized product reach, the project/product junction table, directory projections and grid view, overview handoffs, opportunity cursor history and filters, outcome-review paging and measured fields, roadmap list/preview/publication, goal tree/list/table, customer-impact panels, settings tabs, and conflict-safe release edits. The remaining code gaps are below.

## Remaining implementation backlog

### P0 — authorization and data correctness

1. **Apply product reach to bulk product updates.** `POST /build/managed-products/bulk` checks only the global update permission and calls the service with `orgId`; it does not pass the actor or call `ManagedProductReachService`. The update predicate accepts every requested product ID in the organization. A restricted product member who holds the update permission can therefore submit IDs for products they cannot reach. Filter every ID through the same reach predicate used by the directory, return a per-ID denied/skipped result without leaking existence, and test a mixed reachable/unreachable batch. Evidence: `backend/src/modules/build/managed-products/managed-products.controller.ts:87-91`, `managed-products.service.ts:400-413`.

2. **Finish migration from the legacy single product foreign key to `project_managed_products`.** The junction table, backfill, secondary linking, primary selection, and linked-project service exist. Several product projections still read `projects.managedProductId`, so a project linked as secondary is omitted from product search, Insights counts, roadmap/project filters, work filters, Agent Pulse, and parts of the scope directory. Replace product-membership predicates with the junction relation; retain the singular field only as a clearly documented primary-product compatibility projection; add a regression fixture where one project belongs to product A and product B and appears correctly in both. Evidence: `backend/src/modules/build/managed-products/managed-product-list.service.ts:186`, `managed-product-insights-query.service.ts:79,118,155`, `core/project-crud/projects-query.service.ts:127`, `core/roadmap/projects-roadmap.service.ts:132`, `core/work-query/projects-work-filter.ts:165`, `agent-pulse/agent-pulse.service.ts:101-324`, `scope-directory/scope-directory.service.ts:244,340`.

3. **Make product-scoped Feedbucket reads and mutations consistently enforce product reach.** Product submission lists and product impact endpoints call `ManagedProductReachService`, but widget list/detail/update and submission detail/update/delete use organization-level endpoints. Product settings downloads the entire organization widget list and filters it in the browser. This exposes unrelated product widget metadata to a product-restricted actor who also has Feedbucket permission and makes direct-ID mutations depend on broad module permission rather than the product boundary. Add product-scoped widget and submission commands or make the owning widget/product reach part of every direct record authorization check. Evidence: `backend/src/modules/feedbucket/feedbucket.controller.ts:98-162`, `frontend/features/build/managed-products/product-settings-feedback-channels-section.tsx:18-25`.

### P1 — incomplete product workflows

4. **Complete settings pagination, error states, and action policy.** Product Projects requests `limit: 100`, renders no Next/Previous control and ignores query errors. Feedback Channels has the same missing error/retry state and filters an unbounded organization response locally. The accepted contract requires paginated relation selectors, and settings actions should use server-returned allowed actions rather than only broad `useCan` checks. Add cursor paging or searchable selectors, explicit retry states, and server-authoritative row actions. Evidence: `frontend/features/build/managed-products/product-settings-projects-section.tsx:28-64`, `product-settings-feedback-channels-section.tsx:18-36`.

5. **Implement true contains search for the product directory.** The contract says text contains. Current SQL matches only a start-of-name/start-of-key value or a prefix of a token in the name. A query inside a token, such as `lpha` for `Alpha`, does not match, and key tokens do not use full-text fallback. Use escaped `%query%` matching for name and key or formally narrow the contract and UI copy; retain stable keyset paging and add middle-of-name/key tests. Evidence: `backend/src/modules/build/managed-products/managed-product-list.service.ts:56-60,143-145`.

6. **Finish product Insights collection behavior.** The discovery filters now cover theme and score maximum, but theme, segment, owner, state, and confidence are still single selects while the accepted operators are `IN`. The higher-level Insights screen provides only a date range, KPI cards, and tables; it lacks the declared source/project/segment/theme filtering, trend charts with text summaries, evidence cursor, and asynchronous export. Implement the accepted filter envelope and bounded export, or explicitly reduce the accepted contract. Evidence: `frontend/features/build/managed-products/insights/use-opportunity-discovery-filters.ts:35-50`, `insights/opportunities-filter-bar.tsx:107-225`, `product-insights-page.tsx`, `product-insights-panels.tsx`. Contract: `docs/build-module/experience/screens/product-discovery.md:115-135`, `acceptance/module/02d-scope-public-page-contracts-prd.md:36`.

7. **Unify product releases with the canonical delivery release model and expose the new evidence fields.** Managed-product releases now store revision, owner, QA state and deployment evidence, but the product release form and list expose only name, version, status, date and description. Ticket membership, approvals, test runs and incidents belong to the separate canonical `projectReleases`/`releaseTickets` model. As a result, the product release page still cannot answer “what exactly ships?” or prove approval, QA and deployment from owning records. Define the relation between a product release and canonical project releases, show ticket membership and evidence, validate owner IDs, and avoid parallel release truth. Evidence: `frontend/features/build/managed-products/releases/product-release-form-schema.ts:3-9`, `product-release-form-fields.tsx`, `backend/src/db/schema/build/managed-products.ts:85-115`, `backend/src/db/schema/build/ticket-releases.ts:51-67`.

8. **Harden product roadmap publication identity and versioning.** Share tokens are random and revocable and the public route is rate-limited/noindex, but the raw bearer token is stored and indexed in the database. There is no expiry, token hash, or publication snapshot. `publicationVersion` is stored but not used when issuing, resolving, caching, or building the public projection; the token reads current live rows. Store only a token hash, support expiry/rotation, increment and enforce publication version, and build/cache a versioned allowlisted snapshot so preview and public output can be proven equivalent and unpublish purges the exact version. Evidence: `backend/src/db/schema/build/managed-products.ts:119-139`, `managed-product-share-token.service.ts:16-53`, `backend/src/modules/public/roadmap.service.ts:177-193`.

9. **Make last-owner and publication-impact protection transactional.** Membership removal counts rows and then deletes in separate statements outside a transaction, so two concurrent removals can both pass the `total > 1` check. It protects the last member, but does not protect the product's assigned `ownerMembershipId` or a last owner-role invariant. Archive/delete also does not evaluate active public tokens and client-visible roadmap impact transactionally. Lock or atomically predicate the membership change, enforce the owner rule, return a conflict with an impact projection, and test concurrent removals plus published-product archive/delete. Evidence: `backend/src/modules/build/managed-products/managed-product-members.service.ts:101-131`, `managed-products.service.ts:342-397`. Contract: `docs/build-module/acceptance/module/02d-scope-public-page-contracts-prd.md:37`.

10. **Complete reliable return context for product handoffs.** Product surfaces deep-link to projects, feedback, roadmap items, tickets and goals, but the links generally carry only filters/IDs. The accepted behavior requires the destination to restore the authorized origin query, scroll anchor and focus after a full-page handoff. Add a bounded return-context mechanism and browser tests for overview → feedback/project/goal, feedback → ticket/opportunity, and roadmap → ticket/project. Contract: `docs/build-module/experience/screens/product-discovery.md:43-49,71-77,127-131,183-189,211-217`.

### P2 — completion and release evidence

11. **Prove cache and invalidation isolation.** Product data crosses managed products, projects, goals, Feedbucket, roadmap, releases and public projections. Complete tests that cache entries include tenant, principal, product/grant and permission version, and that product membership removal cannot reuse previously cached detail, feedback, insights, selectors or public preview data.

12. **Run the full persisted product journey against a real database.** Verify create product → add restricted member → link one project to two products → capture/classify/deduplicate feedback → create/score/override opportunity → accept into roadmap/goal/project/release → attach release tickets and QA/approval/deployment evidence → deliver → record a measured outcome → publish/revoke roadmap. Assert IDs, junction rows, audits, revisions, retry idempotency, 409 behavior, cache refresh and denied cross-product/cross-tenant IDs.

13. **Complete browser acceptance at 375, 768 and 1280 px.** Cover populated, empty, filtered-empty, loading, error, denied, not-found and offline states on all nine product routes; keyboard navigation and focus restoration; three-page cursor navigation; dirty forms; failed mutation retention; public preview parity and revoked-token behavior.

14. **Validate operational readiness.** Replay migrations 1977–1990 on a production-like snapshot, verify junction backfill/constraints/RLS, inspect query plans for large product/project/feedback/opportunity/review lists, test concurrent primary-link/member/release/publication writes, and confirm deployed frontend/backend/schema revision parity and rollback.

15. **Demonstrate WOW/value reasons 71–76 with source records.** Code paths now exist for traceable feedback, customer impact, explainable RICE, durable opportunities, public roadmap and measured outcomes. Completion still requires one persisted demonstration per reason with authorized drill-down, freshness and source provenance. Competitive-superiority language additionally requires current customer/competitor evidence; code presence cannot prove that claim.

## Items from the first audit that are now code-complete

The second pass removed these from the implementation backlog because current source contains the required paths: centralized product reach for normal product endpoints; project/product junction and backfill foundation; cross-product evidence/goal/release validation; Insights project URLs; opportunity and linked-project cursor history; theme/score-max filters; outcome-review pagination/error handling and success-only close; authoritative roadmap preview; settings tabs; release revision/CAS and cursor direction; directory/grid, roadmap/list and goals/tree-list-table modes; overview link/post-update actions; customer-impact comparison; measured outcome fields; directory goal-health/allowed-actions/freshness projections; release owner/QA/deployment columns.

## Verification status

This result is based on current static source and migration inspection. Focused Jest execution was attempted twice, but the repository runner failed before test startup with `[ERROR] unable to open database file`; therefore no test suite is claimed as passing in this review. No authenticated browser or deployed-environment verification was performed.

The product-owned Build area should be called complete only after items 1–15 are resolved or explicitly removed from the accepted contract, and the runtime evidence in items 11–15 is recorded.

> The runner failure above did **not** reproduce on re-test: `npx jest --listTests` exits 0, and the managed-product suites run clean (backend 24 suites / 359 tests; frontend 59 suites / 656 tests). It was transient concurrent-jest noise. Items 11 and 12 are not runner-blocked.

## Resolution status — 2026-10-12 follow-up

Verified directly against the files and the database. Items marked *(other lane)* are reported by a concurrent session and were not independently re-verified here.

| # | State | Evidence |
|---|---|---|
| 1 | Closed earlier in program | bulk reach |
| 2 | Closed earlier in program | junction projections |
| 3 | Closed *(other lane)* + frontend half closed here | widget list now takes `managedProductId` server-side; the browser-side filter over the whole org list is gone |
| 4 | **Closed** | cursor paging + `ErrorState` with retry on both settings lists; row actions gate on server `allowedActions`; 26 tests |
| 5 | **Closed — contract met** | `strpos(lower(…))` matches mid-token, so "contains" holds. Cannot be indexed under RLS; see readiness D-1 |
| 6 | **Closed** | `source` + `project` on opportunities and evidence-themes, evidence cursor, async export table (1998), real trend chart with text summary |
| 7 | **Closed** | composite FK to `project_releases` (1996/1997), evidence/QA/owner surfaced, `qaState` tightened to the enum, `linkedRoadmapItemCount` no longer hardcoded at any site |
| 8 | **Closed** | token hashed both sides, expiry, archived/deleted products no longer serve public roadmaps; publication-version race fixed (readiness E-4) |
| 9 | **Concurrency half closed** | parent-row lock serializes the last-admin guard (readiness E-2). Publication-impact-on-archive half is *(other lane)* |
| 10 | *(other lane)* | return context |
| 11 | **Closed** | 18 tests over key dimensions, tenant/version isolation and live membership reads, each with a negative control. Finding: these six surfaces hold **no** response cache, so membership removal takes effect trivially |
| 12 | **Blocked on data, not code** | production holds 0 managed products, so the journey must seed everything; *(other lane)* |
| 13 | **Open — browser only** | 375/768/1280 across nine routes |
| 14 | **Closed** | `managed-product-operational-readiness-2026-10-12.md`; 4 defects found, 2 fixed, 2 accepted with reasons |
| 15 | **Partly not code-closeable** | value themes **72, 74 and 76** require customer and competitor evidence; no implementation can close them |

Migrations 1996, 1997 and 1998 are applied to production; ledger head `1803110800065`.

## Third-pass current-code recheck — 2026-10-12

This pass re-read the current implementation after the follow-up changes. It does not accept the resolution table above as proof. The following implementation work is still open.

### P0

1. **Enforce product reach for every direct Feedbucket widget mutation.** Widget list and detail reads are product-reach aware, and submission detail/update/delete now pass the actor. Widget update, delete, and key rotation still call service methods without the actor. The service consequently loads the existing widget without checking its product, and update checks only a newly supplied `managedProductId`. A restricted actor with the broad Feedbucket mutation permission can update, delete, or rotate the key of an inaccessible product widget by ID. Pass `CurrentUserContext` through all three methods, authorize the existing widget before mutation, authorize any new product before reassignment, and add negative tests for update-without-product-change, delete, rotate, and reassignment. Evidence: `backend/src/modules/feedbucket/feedbucket.controller.ts:147,158,172`; `backend/src/modules/feedbucket/feedbucket-widgets.service.ts:176-188,191-240`.

### P1

2. **Replace the hand-written Product Settings cursor state with cursor history.** Feedback Channels, Linked Projects, and Members increment `pageNumber` on Next but Previous always sets `cursor` to `null` and page 1. From page 3, Previous therefore jumps to page 1. Use the shared cursor pager or keep a cursor stack; reset it when the product/filter changes; test page 1 → 2 → 3 → 2 → 1. Evidence: `frontend/features/build/managed-products/product-settings-feedback-channels-section.tsx:21-42`; `product-settings-projects-section.tsx:32-60`; `product-settings-members-section.tsx:41-91`.

3. **Render Members query failures and retry.** `ProductSettingsMembersSection` reads only `data` and `isLoading`. A failed request falls through to an empty `members` array and renders “No members yet,” which falsely reports a valid empty state. Consume `isError`, `error`, and `refetch`; render `ErrorState`; suppress pagination while failed; test error and retry. Evidence: `frontend/features/build/managed-products/product-settings-members-section.tsx:44-46,115-152`.

4. **Expose the canonical project-release link and its evidence in the product UI.** The backend supports `projectReleaseId` and a detail response containing ticket, test-run, incident, and approval evidence. The frontend create/update input, form schema, form values, and submit payload omit `projectReleaseId`, and the release page has no detail query or evidence view. Users therefore cannot establish the canonical link from Manage Product or inspect the owning evidence that the backend can return. Add a reachable canonical-release selector limited to linked projects, persist/clear the relation, fetch release detail on drill-down, and show ticket membership, tests, incidents, and approval state. Evidence: `backend/src/modules/build/managed-products/managed-product-releases.service.ts`; `frontend/hooks/api/build/managed-product-releases.ts:18-46,85-172`; `frontend/features/build/managed-products/releases/product-release-form-schema.ts`; `product-release-form-sheet.tsx`.

5. **Either implement versioned roadmap snapshots or narrow the publication contract to a live share link.** Token hashing, expiry, revocation, serialized version increment, and active-product checks are implemented. `resolveToken` returns only organization and product IDs, while the public service rebuilds the board from current live rows. `publicationVersion` is metadata and does not identify an immutable projection or cache entry. If publishing is intended to freeze an approved version, store and serve an allowlisted snapshot keyed by publication version and test preview/public equivalence. If live updates are intended, change the accepted contract and product copy so version does not imply a snapshot. Evidence: `backend/src/modules/build/managed-products/managed-product-share-token.service.ts:88-116`; `backend/src/modules/public/roadmap.service.ts:178-208`.

### Completion evidence still required

6. **Browser acceptance remains open.** Run all nine product routes at 375, 768, and 1280 pixels with populated, empty, filtered-empty, loading, error, denied, and not-found states. Include keyboard/focus restoration, three-page cursor navigation, dirty forms, failed mutation retention, public preview behavior, and revoked/expired tokens.

7. **Persisted end-to-end product proof remains open.** Exercise the full product journey against a real database, including restricted membership, one project linked to two products, feedback through measured outcome, canonical release evidence, publication/revocation, audit rows, retries, conflicts, and cross-product/cross-tenant denial.

8. **WOW claims 71–76 still need source-backed demonstrations.** Code paths exist, but code alone does not prove customer value, freshness, competitive superiority, or adoption. Record one persisted, authorized drill-down demonstration per reason; support customer/competitor claims with current external evidence.

### Recheck verification

- Backend: 4 focused suites, 74 tests passed using a workspace Jest cache.
- Frontend: 4 focused suites, 61 tests passed using a workspace Jest cache.
- The default `pnpm exec jest` path still failed before test startup with `[ERROR] unable to open database file`; direct Jest execution with `--cacheDirectory` was used successfully.
- No authenticated browser, persisted database journey, or deployed-environment verification was performed in this pass.

**Current decision: Manage Product is substantially implemented but is not complete.** Completing items 1–5 closes the remaining source-visible implementation gaps found in this pass. Items 6–8 are the remaining proof required before calling the entire product-owned Build scope complete.

## Final consolidated current-code audit — supersedes all earlier lists

This section was produced after re-reading the current dirty worktree. During the review, several items from earlier passes were implemented: Feedbucket widget mutations now receive the actor, Product Settings uses cursor history and explicit error states, and the product release form/detail UI now supports canonical project releases and evidence. Those items are closed and are not part of the remaining list below.

### Remaining source-visible work

1. **Define and implement one product-roadmap publication model.** Product tokens are hashed, expirable, revocable and versioned, but `publicationVersion` does not select a stored snapshot. Token resolution returns only organization/product IDs and the public endpoint rebuilds from live rows. Separately, the preview sheet reads the organization-level publication endpoint while the product publication panels use the product-token endpoint. Choose one product contract: either immutable versioned snapshots or an explicitly live board. Make preview, open-public-page, rotate, revoke, cache identity and copy consistent with that contract.

2. **Finish read-error handling on secondary product surfaces.** Several reads consume only `data`/`isLoading` and convert failures into not-found, empty, or invisible content. Confirmed examples are Feedback detail, Opportunity Impact, Product Settings publication, Roadmap publication/preview, Roadmap initiative detail, duplicate search, linked-project Intake routing, Feedbucket collection, opportunity linking, and multiple filter/selector queries. Each needs an explicit error message and retry while retaining the current dialog/sheet state. A 403/404 must use the repo's non-leaking state rather than a false empty result.

3. **Make every relation picker complete for large organizations/products.** Several selectors fetch a single bounded page (`limit: 50` or `100`) and expose no Next, infinite loading or server search. This can omit valid members, product goals, linked projects, releases, teams, owners and roadmap candidates. Convert the Add Member, Link Goal, Route to Intake, Accept Opportunity, Schedule Outcome Review, release-project/release picker, roadmap filters and project-owner filters to searchable cursor selectors or complete infinite queries.

4. **Fix publication and focus timers.** Product publication copy feedback and roadmap pane focus restoration create `setTimeout` callbacks without cancellation. This violates FE-139 and can update state or focus an old element after unmount/navigation. Keep timer IDs in refs and clear them during cleanup, or use an existing safe clipboard/focus primitive.

5. **Remove accessibility warnings from product dialogs and sheets.** The full frontend suite passes but emits Radix warnings for missing descriptions on Opportunity Pane and Compare Drawer. Add visible or screen-reader descriptions and assert the accessible name/description relationship. Also remove the unwrapped React updates in Product Feedback tests so interaction tests reliably represent browser behavior.

6. **Make public-link recovery an explicit product experience.** Because only the hash is stored, the raw product URL is intentionally visible only at issue/rotation time. After reload, both publication panels can report “Published” but cannot open or copy the active link. Provide a deliberate recovery action such as “Rotate and copy new link,” expose issued/expiry/version metadata, and use one shared publication component so Settings and Roadmap cannot drift.

7. **Complete release evidence navigation and selector failure states.** Canonical project-release linking and the evidence sheet now exist. Finish it by handling linked-project and project-release query errors, paginating/searching both selectors, and making ticket/test/incident/approval evidence navigable to authorized owning records with return context. Keep inaccessible records redacted rather than silently omitted.

8. **Add regression coverage for the current security and paging repairs.** Add direct negative tests for inaccessible widget update/delete/key rotation/reassignment, three-page backward navigation for all three Product Settings lists, selector page boundaries, and read-error/retry states. Existing product-reach tests cover widget reads but do not prove every direct mutation path.

### Required completion evidence

9. **Run authenticated browser acceptance on every product route.** Cover directory, overview, feedback, insights/discovery, goals, projects, roadmap, releases and settings at 375/768/1280. Exercise loading, empty, filtered-empty, error, denied, not-found, offline, dirty forms, failed mutation retention, keyboard use, focus return, three-page navigation, deep links and public token expiry/revocation.

10. **Run the full persisted product lifecycle against a real database.** Create a product and restricted membership; link one project to two products; capture/classify/deduplicate feedback; create/score/override/accept an opportunity; link goal/roadmap/project/release; attach tickets, QA, tests, approval, incidents and deployment evidence; deliver and record the outcome; publish/rotate/revoke. Assert rows, junctions, revisions, idempotency, audit records, conflicts and cross-product/cross-tenant denial.

11. **Re-run the five server-listening authorization tests in an environment that permits loopback sockets.** The source-level backend suite completed 407 passing tests, but five RBAC HTTP tests could not bind/connect to `127.0.0.1` under the sandbox (`EACCES`). They are unverified, not failed product behavior.

12. **Prove production readiness for the exact deployed revision.** Confirm migration head, frontend/backend/schema parity, query plans with large product datasets, concurrent membership/primary-link/release/publication writes, rollback, monitoring and revoked-token behavior. Earlier notes or local migrations do not prove the currently deployed state.

13. **Demonstrate WOW reasons 71–76 with real source records.** Provide one authorized, persisted drill-down for feedback traceability, customer impact, explainable scoring, durable opportunity history, public roadmap and measured outcomes. Customer value, adoption and competitor-superiority claims require current customer/market evidence in addition to working code.

### Current verification snapshot

- Frontend managed-product scope: 65 suites / 722 tests passed. The run emitted accessibility and React `act` warnings described above.
- Backend managed-product and product-boundary scope: 28 suites / 407 tests passed; one HTTP authorization suite contained 5 environment-blocked tests because loopback connections were denied.
- No authenticated browser run, persisted end-to-end database run or deployed-environment verification was completed in this audit.

**Final completion rule:** items 1–8 are the remaining implementation/test work visible in current source. Items 9–13 are mandatory evidence gates. When all thirteen are closed against the same revision, the product-owned Build scope can be called complete without another discovery audit.
