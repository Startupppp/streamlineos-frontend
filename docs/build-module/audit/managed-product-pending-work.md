# Managed-product pending work — 2026-10-10

Status: **open**. This is a scoped working register for `/build/managed-products` and its Overview, Feedback, Insights, Roadmap, Goals, and Linked Projects pages. It does not replace the canonical [Build TODO index](../implementation/TODO-INDEX.md), [requirement ledger](../implementation/REQUIREMENT-LEDGER.md), [work claims](../implementation/WORK-CLAIMS.md), or the seven unchecked [product-discovery delivery items](../experience/screens/product-discovery.md#delivery-checklist). A source-present control or a unit test does not close a persisted, authorization, browser, or release gate.

Documentation search found 57 Markdown files under `docs/build-module` with direct managed-product/product-page/feedback-to-outcome references. The core contracts linked below were read and crosswalked; a line-by-line disposition of every historical note and research file is still open. Do not describe this register as exhaustive until that reconciliation is complete.

## Source crosswalk and decision

- [Product-discovery screen contract](../experience/screens/product-discovery.md) defines the seven page behaviors, fields, flows, and acceptance cases.
- [Managed-product page matrix](../acceptance/module/02d-scope-public-page-contracts-prd.md#managed-product-pages), [cross-scope pages](../acceptance/module/02a-cross-scope-pages-prd.md#managed-product-scope), [route manifest](../acceptance/module/01a-canonical-route-manifest-prd.md#managed-product-routes), and [route/access matrix](../acceptance/module/01b-route-access-persona-matrix-prd.md) keep Overview and Insights as separate routes.
- [Screen data contracts](../architecture/screen-data-contracts.md), [architecture and cache](../architecture/07-architecture-data-api-cache-ai.md), [domain model](../implementation/06-domain-model-and-database-schema.md), and [API contracts](../implementation/07-api-and-backend-contracts.md) require attributable evidence, versioned links, bounded reads, and scoped authorization.
- [Shared screen contract](../experience/screens/shared-screen-contract.md), [filter system](../experience/06-ui-component-and-filter-system.md), [forms](../acceptance/module/05-forms-validation-prd.md), and [release verification](../acceptance/module/10-release-verification-prd.md) apply to every page below.
- [Current-state audit](managed-products-2026-10-10.md) records previous partial implementation and unverified gates. Historical notes and research are inputs, not current acceptance evidence.

Product decision confirmed by the user: keep Overview as a concise product summary and Insights as a source-linked analysis/deep-dive page. Do not redirect or merge the routes.

## Immediate fixes and their remaining proof

- [ ] Roadmap item create/edit offers a product-scoped delivery-project picker and submits the canonical `projectId` link. Source and a focused form test were added on 2026-10-10; still verify authorized persisted create, relink, unlink, progress calculation, empty/error states, keyboard selection, and 375/768/1280 layouts. Epic-level selection remains a separate task below.
- [ ] Overview gives a concise, navigable product pulse, with Insights kept as the deep dive. Source and focused tests were added on 2026-10-10, including partial-data retries so an Insights failure does not hide the product; still verify authenticated counts, source timestamps, and responsive rendering. These aggregate counts must never be represented as opportunity or outcome proof.

## Page-by-page open items

### Managed-products directory and Overview

- [ ] Directory: owner, lifecycle, health, team, segment, tag, linked-project, and archived filters with server-backed predicates, typed URL state, removable chips, Clear all, and filtered-empty explanation; verify owner/health/source freshness on cards and rows.
- [ ] Create/edit/archive/restore: revision and idempotency, field and scope authorization, conflict recovery, audited persisted state, and exact response-derived cache updates; no toast before a committed response.
- [ ] Overview: mission/audience/north-star and owner/lifecycle; distinct evidence strength, delivery progress, and measured outcomes with source links and freshness. Show missing evidence as unknown, not zero or success.
- [ ] Overview: bounded previews of themes, goals, initiatives, next release, decisions, linked-project contribution, and client-ready publication state, with direct navigation and safe return context.
- [ ] Overview filters for period, team/segment, and initiative state; verify aggregated values match the selected scope.

### Feedback

- [ ] Preserve raw submission text, widget/channel, customer/segment authorization, consent, provenance, duplicate source, and Intake conversion IDs; never lose originals on merge or routing.
- [ ] Add or verify capture, theme/sentiment tagging, deduplication, roadmap/opportunity linking, Intake routing, owner/state changes, and source-level drill-down with exact permissions.
- [ ] Complete source/customer/segment/theme/state/owner/date/duplicate filters and bounded pagination; show honest empty, filtered-empty, error, and denied states.

### Insights (deep dive)

- [ ] Model and expose actual opportunity/problem records linked to cited feedback, affected segment, owner, hypothesis, confidence, evidence age/freshness, score inputs, and outcome target. The current count dashboard is not a substitute.
- [ ] Implement evidence themes, opportunity comparison, trend summaries with source drill-down, and bounded evidence pagination. Label AI suggestions as suggestions with citations.
- [ ] RICE uses reach × impact × confidence ÷ effort with explicit period/units, confidence 0–1, effort > 0, unknown as Unscored; retain versioned score snapshots, an authorized override with reason, and audit.
- [ ] Add experiment and outcome-review schedule/results; reconcile post-release measured outcomes back to the opportunity, goal, and evidence without copying source records.
- [ ] Add date/source/segment/project/theme/owner/state/evidence-age/score/confidence filters where applicable; ensure every displayed aggregate is source-linked and permission-scoped.

### Roadmap

- [ ] Finish opportunity acceptance → canonical initiative/epic with decision and score snapshot, stated evidence, owner, goal, horizon, release, dependencies, and customer visibility.
- [ ] Add the epic-level delivery selector as well as project-level selection; make links explicit on cards/detail, validate reachability and same-product/project rules, and verify calculated ticket completion from authorized work only.
- [ ] Implement a real Now/Next/Later/timeline model and filters for horizon, team, goal, state, segment, confidence, and dates. The old decorative horizon control must not return without backend filtering.
- [ ] Add reprioritization, move, release/ticket links, public/client preview, publish/unpublish confirmation, and source-specific cache reconciliation.
- [ ] Verify ordered-list alternative on mobile, 375/768/1280 layout, keyboard access, and persisted create/edit/link/unlink/denial.

### Goals

- [ ] Keep the product tab as a scope over canonical goals. Verify create/link/unlink/check-in and outcome measurement; no duplicate Build goal table.
- [ ] Show product linkage, key-result progress/health, owner, parent/timebox, check-in freshness, linked initiative/project, and measurement source with drill-down.
- [ ] Finish scoped filters, pagination, conflict-safe updates, role/tenant denial, immediate response-derived cache reconciliation, and authenticated cold-load timing.

### Linked Projects

- [ ] Verify searchable link/move/unlink against both product and project authorization; unlink must not delete or archive the project. Show incompatibility before a move and preserve other-product relationships.
- [ ] Surface owner, health, dates, next milestone, contribution/progress, linked goal/initiative/release; complete server-backed health/status/owner/team/customer/date/contribution filters and bounded pagination.
- [ ] Prove persisted link/unlink and exact product/project/roadmap/rollup cache updates, negative cross-product/tenant tests, keyboard selection, and mobile link flow.

## Cross-surface completion gates

- [ ] Reconcile every relevant Build Markdown file, including historical research and evidence, to the canonical product-discovery requirements; record adopted, deferred, superseded, and still-open findings without silently dropping a source.
- [ ] Trace one persisted record end-to-end: feedback → evidence → opportunity → scored decision → roadmap → project/epic/ticket delivery → measured outcome review, with attribution and source-preserving IDs at each step.
- [ ] Enforce product audience/membership, project intersection, field policy, public/client-safe projection, and no cross-grant cache reuse on reads, selectors, mutations, exports, and deep links.
- [ ] Use `usePageState`/`PageState` with the actual error for loading, empty, filtered-empty, denied, error, and populated states; fill available space with the flex scroll chain. Current use of these primitives is source-present, not browser-verified.
- [ ] Ensure all filters have URL state and server semantics, responsive drawer/popover behavior, accessible labels/focus, and no decorative or nonfunctional controls.
- [ ] Patch mutation caches from responses; only mark server-derived aggregates stale without broad refetch. Verify create/update/delete/link/unlink across every cached list variant, detail, and cross-page summary.
- [ ] Run positive and negative backend/API tests, frontend focused and typecheck/lint gates, authenticated persistence and role/tenant browser scenarios, 375/768/1280 visual/keyboard QA, and deployment/operations checks. Record the current revision and evidence in the requirement ledger before checking any canonical item.

## Evidence boundary

The 2026-10-10 source/test work above is **partial**. No complete product-discovery checklist item is checked here. A local test pass is not database, browser, tenant, mobile, or deployment proof. The tracker must be updated as each exact scenario is verified; do not erase an open item because a similarly named component exists.

### Verification snapshot, 2026-10-10

- Focused frontend Jest: 4 suites, 42 tests passed (roadmap item form, delivery progress, managed-product Overview, goal form); an additional Overview loading-state test then passed in the Overview suite (18 tests). Focused roadmap backend Jest: 42 tests passed (project access and delivery signals). Temporary workspace Jest caches were removed after the runs.
- Frontend app TypeScript and touched-file ESLint passed. The full frontend specs TypeScript check remains red on six missing `speech` props in Ask OS chat-view tests, outside this product scope; the in-scope goal-form test mock was corrected and no longer appears in that error list.
- A pre-existing Next.js process is listening on local port 1000. The local backend was started and its `/health` endpoint returned HTTP 200 on port 1500. An unauthenticated request to the product roadmap route returned a 307 redirect; that is not a rendered-page check.
- Authenticated in-app browser verification is blocked by the computer-use bridge failing before browser access (`failed to write kernel assets`, OS error 3). The project picker, persisted project/epic linkage, cache behavior, and 375/768/1280 layouts remain open until that bridge or an equivalent authenticated test session works.
