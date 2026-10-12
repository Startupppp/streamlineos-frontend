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
