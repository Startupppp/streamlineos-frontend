# Step 6 — Code Removal, Consolidation, and Reuse Plan

> **Supporting cleanup plan:** [`2026-10-20-document-module-product-decision.md`](2026-10-20-document-module-product-decision.md) owns current removals. No route or stored data is deleted until its migration, retention, authorization, deep-link, usage, and rollback gates pass.

## September 27 review disposition

R1's historical count of 54 routes without frontend callers is a candidate list, not deletion approval or a current count. The AV-08/09/10 items in [OPEN-TASKS.md](OPEN-TASKS.md) govern cleanup:

- Retain page-grant and space-member management: both now have mounted UI and serve required workflows.
- Keep Support as the help-centre workflow adapter and KB as content/authorization/indexing owner. Duplicate controller deregistration has started; finish external/API caller and compatibility checks before deleting code.
- Keep a small query module when it hides bounded authorized reads and prevents a dependency cycle. Replace duplicated predicates/unindexed scans before removing the module itself.
- Retire wrappers only when they add no policy, type restriction, projection, lifecycle or error behavior. Do not replace a useful seam with direct table imports.
- Preserve purpose-specific response projections. Shared primitives must not turn metadata queries into full-document loads or expose private fields publicly.
- Re-measure the current tree: other sessions are changing it. Remove obsolete implementations and tests only after replacement callers and regression evidence exist.

## Goal

Reduce concepts and duplicate implementations before adding infrastructure. Deletion follows dependency and migration proof; this file does not authorize dropping data or routes immediately.

## Help Centre route and caller census — October 16, 2026

The current application stores both Wiki pages and Help Centre articles in `kb_pages`. `content_type = 'support_article'` identifies an article. Its `slug` is the public Help Centre address, while `public_slug` belongs to Wiki sharing. Internal Support article links carry the numeric page ID. The Wiki page route and search exclude support articles, so an article ID is not interchangeable with a Wiki document link. This is a source and first-party caller census, not deployed usage or external-consumer evidence.

| Registered owner and route family | Current first-party callers or dependency | Decision for this review |
|---|---|---|
| `SupportModule`: `SupportKbController`, `/support/kb/categories` and `/support/kb/articles` CRUD | `/support/kb` manager and `/support/kb/[articleId]` editor use `frontend/hooks/api/support/kb.ts`; the editor owns article publishing fields. | Retain. API paths under `/support/kb/articles/` are fetch targets, not browser page routes. |
| `SupportModule`: `SupportKbEngagementController`, `/support/kb/articles/:articleId/{feedback,comments,attachments,index-status,reindex}` and `/support/kb/ask` | Help Centre editor panels use `kb-comments.ts`, `kb-attachments.ts`, `kb-rag.ts`; Support Ask components use the Ask hook. | Retain while those surfaces and external API contracts remain. |
| `KbHelpCentreModule`: `KbFromTicketController`, `/kb/articles/from-ticket/:ticketId` | Support ticket deflection panel calls `frontend/hooks/api/kb/from-ticket.ts`; `KbFromTicketService` uses `KbArticlesService` and `KbArticleQueryService`. Support gap drafting also injects `KbArticlesService`. | Retain service exports and route; controller deregistration elsewhere did not remove these writes. |
| `KbHelpCentreModule`: `KbAnalyticsController`, `/kb/analytics/*`, and `KbAiFeedbackController`, `/kb/ai/feedback` | KB analytics hooks feed the Support KB Analytics tab and Knowledge surfaces; Ask feedback calls the registered feedback route. | Retain. A missing consumer for one analytics subroute does not retire the controller. |
| `KbHelpCentreModule`: `KbArticleAiController`, `/kb/articles/:articleId/ai/*`, and `KbWidgetController`, `/public/kb/widget/:orgId[/script]` | The Support article editor mounts `KbArticleAiActions`, which calls `streamKbDocAi` with `scope: "articles"`; its path template reaches the registered article AI streaming routes. No first-party widget caller was found; its script is an external embed surface. | Retain article AI. Keep widget pending external-client inventory, route telemetry, compatibility decision and replacement proof. |
| `PublicModule`: `/public/kb`, `/public/kb/:slug`, `/public/kb/:slug/feedback` | `/help/[orgId]` and `/help/[orgId]/[articleSlug]` render the public Help Centre; `KbService` delegates article reads to `kb-public-documents.ts`, which selects published public support articles by tenant and article slug. | Retain public URL and feedback compatibility. Do not substitute the Wiki `public_slug` or share token. |
| `KbHelpCentreModule`: article, category, comment, authoring and verification controllers formerly declared in source but absent from its `controllers` array — **deleted 2026-10-21** | `kb-help-centre-retired-controllers.spec.ts` now asserts no registered route serves `/kb/articles/*` (excluding `/from-ticket` and `/ai/`), `/kb/categories`, `/kb/comments`, `/kb/ai/draft|improve|summarize`, or `/kb/verification`. Services with live callers (`KbArticlesService`, `KbFromTicketService`) were retained; `KbArticleQueryService.findFromTicketDraft` was moved to `KbArticlesService` before deleting the query service. | Deleted: 5 controllers, 4 services, 3 DTO files, 4 e2e specs, 10 unit specs; cleaned 8 dead schemas from `kb-helpcenter-response.schemas.ts`, 2 type aliases from `kb.schemas.ts`, stale baseline entries in `unbounded-reads-*.json` and `db-call-count-classification.json`, and one stale bypass entry in `check-placement-bypass.mjs`. Gate: `check:dead-code` reduced from 63 → 51 unclassified findings (12 removed). |

`KbHelpCentreModule` is imported by `KbModule`; `SupportModule` imports `KbModule` and registers the Support controllers. The public module is registered separately. The two bad first-party article links found in this pass now use `/support/kb/{articleId}`: the knowledge-gap draft card and Support AI suggestion payload. A code search found no other browser navigation that passes an article slug to `/support/kb/[articleId]`; the remaining `/support/kb/articles/*` strings in frontend hooks are API calls. This does not establish zero external clients or traffic.

The architectural default is to retain Support as the article workflow adapter and KB as the content, authorization and indexing owner over the shared page identity. A final product decision must say whether Support keeps that adapter or moves to a KB-owned editor. Before removing a route or bridge, record external/API clients and scheduled consumers, reconcile every article's status, slug, redirect, category, comments, attachments, versions, translations and citation links, prove public/help and internal role parity, observe usage through the agreed window, and rehearse rollback from a verified backup. No controller, table or migration is removed by this census.

## Deletion blockers — source rechecked September 27

Per the owner's instruction, this section records only unsafe or not-yet-approved removals, not a log of safe cleanup. R1's "no consumer" claims must not be used to delete these current paths. Paths below are relative to the repository root.

| Do not delete now | Why removal is unsafe | Required condition before removal |
|---|---|---|
| `backend/src/modules/kb/wiki/kb-page-grants.controller.ts`, its service, and `frontend/features/wiki/components/page-grants-sheet.tsx` | `page-share-popover.tsx` dynamically mounts the sheet. The sheet calls `useKbPageGrants`, `useCreateKbPageGrant` and `useRevokeKbPageGrant`; the controller is registered in `wiki/kb-wiki.module.ts`. Removing this slice removes live sharing/revocation management, not dead code. | Preserve the workflow through a tested replacement and migrate its real callers first. Do not remove persisted grants as part of code cleanup. |
| `backend/src/modules/kb/wiki/kb-members.controller.ts`, its service, and `frontend/features/wiki/components/space-members-sheet.tsx` | Both `spaces-page.tsx` and `space-detail-page.tsx` mount the sheet. It calls `useAddKbSpaceMember` and `useRemoveKbSpaceMember`; the controller remains registered. A failing page-test mock does not make this feature unused. | Keep membership management and its authorization/revocation behavior. Migrate and test both mounted consumers before removing any implementation. |
| `backend/src/modules/kb/document-query/kb-document-query.module.ts` and `kb-document-query.service.ts` | `ai/core/ai.module.ts` imports the module, and `ai/core/tools/self-digest-tools.ts` injects the service and invokes `searchDocuments`. Its small size is not evidence that it is dead. Removing it alone breaks an active tool dependency; bypassing it with direct table access discards its authorization responsibility. | Replace the interface at the caller, preserve authorized bounded search and prove Nest dependency registration remains acyclic. The query-quality issues remain work to fix, not justification for deleting the live feature. |
| `backend/src/modules/kb/help-centre/kb-articles.service.ts` | `support/kb-gap/support-kb-gap.service.ts` injects `KbArticlesService` and calls `create` when creating a knowledge draft. Deregistering duplicate controllers does not make their shared service dead. | Migrate Support gap creation to an equivalent tested content-write interface before removal; preserve identity, audit and indexing behavior. |
| Remaining externally exposed KB controllers proposed for deletion solely because no frontend import was found | An API consumer, background job or integration need not import frontend code. The old 54-route count is neither a current census nor a compatibility decision. | Require route ownership, registration/caller inventory, an agreed compatibility policy and observed usage evidence. Until that evidence exists, classify removal as pending rather than safe. |
| Historical migrations, rollback/reconciliation records, and security regression tests as a blanket "old article" cleanup | Supported database baselines and recovery may still depend on migration history. Replaced function names do not make their security invariants obsolete. | Retain required migration history. Move security assertions to the live replacement and demonstrate that violating the invariant fails the test before deleting superseded tests. Never delete tests merely to turn a failing suite green. |

The old uncalled `kb-content-health-scanner.service.ts` was removed, but the current `KbContradictionScannerService` is registered by `KbHelpCentreModule` and invoked through `cron-kb.service.ts` and the retention scheduler's `kb-contradiction-scan` job. Content Health reads its tenant-scoped contradictory-claim items. This source route does not prove deployed worker execution, real database throughput or browser inbox discovery; those gates remain in [OPEN-TASKS.md](OPEN-TASKS.md).

The remaining S15 contradiction/evidence gates are tracked in [OPEN-TASKS.md](OPEN-TASKS.md). The source path now has a bounded producer and focused discovery-to-inbox coverage. Deployed worker execution, real database behavior and browser discovery remain open.

The earlier `self-digest-tools.spec.ts`, `knowledge-page-scope.spec.ts` and `kb-content-health-s15.spec.ts` run passed 3 suites and 102 tests; that run predates the current producer and is not its runtime proof. This section does not authorize deleting or restoring source files, changing schema/data, or marking implementation requirements complete.

## Removal candidates

| Candidate | Why unnecessary/risky | Replacement | Safe removal gate |
|---|---|---|---|
| Standalone `/ask` product surface | Duplicates contextual Ask documents chrome and behavior | Redirect to `/knowledge/chat` | Route/caller census, redirect test, analytics comparison, then delete page/imports |
| Historical browser `visibility=private` filter for Private page — removed | It used wrong ownership semantics | Current page collection uses `owner=me` | Keep ownership/visibility regression tests; remaining work is uploaded-file parity, not restoring the old filter |
| Historical browser `createdById != me` filter for Shared — removed | It treated org-visible pages as explicit shares | Current page collection uses grant-backed `sharedWithMe=1` | Keep grant/revocation regression tests; remaining work is file parity, sharer identity, reason, and expiry |
| Full `useKbPagesTree` for home, spaces counts, My/Shared lists | Unbounded and duplicates list behavior | Page list projections + lazy children | All consumers migrated; query budget and UI tests |
| Customer-facing hard delete of a space | Irreversible and costly synchronous fan-out | Archive/restore + retained purge workflow | Lifecycle migration, archive UI, purge drill |
| Research Briefs in daily navigation | Separate research workflow distracts from Drive-first Docs | Retain route/data as compatibility or a separately approved add-on; no daily-nav entry | Separate add-on or retirement decision, usage/caller census, migration, retention, permissions, deep links, and rollback evidence |
| Support gap flow that creates an article but links a page URL | The first-party draft card formerly sent a support article to the Wiki document route; it now links `/support/kb/{articleId}`. Stored or external links may still carry the old route. | Retain a typed article/page reference and the Support editor route | Deployed link telemetry, stored-link reconciliation and role/browser parity before retiring compatibility. |
| Historical `kb_articles` organization-wiki model | The current schema and runtime use `kb_pages` with `support_article`; migration history and public Help Centre compatibility still matter. | Retain the shared page record and purpose-specific Support/Public projections | Verify migrated row and dependent-data reconciliation, public/help parity, rollback window and backup before deleting historical recovery paths. |
| Old article-to-page bridge fields and conversion code | Permanent dual-run tax after cutover | Migration ledger retained; runtime bridge removed | 100% migrated + reconciliation + signed cutover |
| Duplicate page search and unified search behavior | Two rankings, filters, ACL paths, invalidation rules | One `KnowledgeIndex` interface with purpose adapters | Offline relevance and API compatibility evidence |
| Persisted review `expired` status | Drifts from time | Derived overdue | Migration, query/index changes, contract tests |
| Client slicing of jobs/templates/trash/reviews | Silent data loss | Server cursor | Endpoint/UI migration |
| Page body in browser Web Storage, if any path remains | Tenant/logout/revocation leak | In-memory or tenant-scoped encrypted server draft | Static scan + logout/org-switch/revocation tests |
| Unused tags/translations/verification endpoints | Attack/support surface without a product page | Hide/deprecate until claimed by a roadmap item | Route telemetry, caller census, compatibility notice |
| Thin wrappers that only rename shared props | More interfaces without leverage | Direct shared module or meaningful adapter | Deletion test + import/build tests |

## Code to retain and deepen

| Asset | Why retain | Deepening work |
|---|---|---|
| `features/wiki` | Correct cross-route UI owner | Organization/project adapters, shared action model, state modules |
| Page revisions and conflict guard | Core correctness | Append-only restore, diff UX, concurrency/load proof |
| Transactional outbox/workflow | Reliable async foundation | Knowledge event catalog, lane fairness, age SLO, replay tooling |
| Tenant transaction/placement infrastructure | Strong scale and isolation base | Canonical authorization use, cell migration drills |
| Redis-compatible cache/rate limiting | Useful optional accelerator | Versioned KB keys, writer matrix, stampede and degraded mode |
| Replica routing | Cost-effective reads | Explicit consistency classification and lag fallback |
| Object storage/media paths | Avoid duplicate blob platform | KB authorization adapter, scan/finalize/purge ledger |
| Keyword + vector retrieval | Correct hybrid direction | Partitioning/recall evaluation, current ACL recheck, shared projections |
| Project wiki route | Good adapter pattern | Pass project scope through every list/search/create/read/history path |
| Existing `PageState`, tables, forms, pickers | Reusable UX infrastructure | Consistent error/request id, mobile variants, accessibility |

## Target module dependency direction

```text
Routes/controllers
    ↓
Knowledge application modules
    ├─ Content
    ├─ Collection
    ├─ Governance
    ├─ Answer
    └─ Publishing
    ↓
Authorization + domain model
    ↓
Adapters
    ├─ PostgreSQL
    ├─ Search/index
    ├─ Cache
    ├─ Object storage
    ├─ Workflow/outbox
    └─ AI provider
```

Routes and UI never import provider implementations. Build and Support can import Knowledge interfaces or render adapters; Knowledge does not import their page routes or domain implementations.

## Consolidation sequence

### 1. Inventory and freeze

- Generate route, controller, schema, query-key, and event-consumer inventories.
- Mark dual-run code with owner, purpose, and deletion gate.
- Reject new Wiki writes to `kb_articles`.
- Add CI checks that frontend/backend KB permission keys and route catalogs match.

### 2. Introduce canonical interfaces

- Central `KnowledgeAuthorization` used by page, search, reviews, links, sources, analytics, export, Ask, and citations.
- Canonical page list and cursor contract.
- Typed record/citation key: `page`, `article`, or `source` plus id and revision.
- One action descriptor model in the frontend.

### 3. Replace callers

- Move Home/My/Shared/Spaces/Reviews/Trash/Templates/Jobs from tree or client caps to list endpoints.
- Move project wiki through scope adapters.
- Move research briefs and gap-draft links.
- Align search and Ask on the same authorized result projection.

### 4. Migrate data

- Backfill owner memberships and explicit grants from trustworthy existing facts only. Do not invent a grant for every page created by another user.
- Migrate help-centre articles only with per-record reconciliation of status, slug, redirects, comments, attachments, versions, translations, public URL, and citations.
- Record watermark, checksum/counts, exceptions, retries, and rollback window.

### 5. Observe and delete

- Compare legacy/new reads in shadow mode where safe.
- Freeze legacy writes, run final delta, switch readers, invalidate both cache namespaces.
- Retain reversible backups and a migration ledger.
- Remove routes, services, schemas, hooks, query keys, tests, and migrations only after caller/build/runtime proof.

## Proof required before deletion

- `rg`/dependency graph shows zero callers, including dynamic import and Nest module registration.
- Frontend build, backend build, typecheck, tests, cycle check, and unused-export check pass.
- Production telemetry shows zero legacy route/writer use for the agreed window.
- Data reconciliation proves counts and content/attachment/version checksums or documents exceptions.
- Search, citations, public URLs, redirects, and exports resolve the new record kind.
- Backup/restore and rollback procedure was rehearsed.
- Cache keys, consumers, cron/workflow handlers, alerts, dashboards, runbooks, and permissions were updated.

## Do not remove

- Historical migrations required to build a database from supported baselines.
- Audit records and signed migration/reseal ledgers.
- Compatibility redirects explicitly promised to users.
- Help-centre model before public publishing and URL parity are proven.
- Deterministic lexical search when semantic/AI works.

## Complexity budget

Any added module must pass the deletion test: if removing it merely deletes pass-through code, it was shallow. A new adapter requires a real varying implementation or an immediate test adapter. Avoid repositories or managers that only mirror one ORM call without hiding authorization, pagination, caching, transactions, or invariants.
