# Step 0 — Current-State Page and Backend Audit

## Audit method

The audit combined three views:

- **Live:** visible headings, controls, links, empty/loading behavior, and route outcomes in the running product.
- **Source:** Next routes, React modules, hooks, Nest modules, schemas, queries, tests, queues, and cache infrastructure.
- **Contract:** the earlier `documents-module` PRDs, checked against the current live and source evidence.

No destructive action or content mutation was used. Dynamic routes without a valid record were assessed from source and are explicitly marked as such.

## Route census

| Route | Disposition | Evidence | Current good | Missing or incorrect | Priority |
|---|---|---|---|---|---:|
| `/knowledge` | KEEP redirect | Source | Single entry point | Verify redirect, telemetry, and entitlement behavior | P0 |
| `/knowledge/chat` | KEEP | Observed | Clear Ask value proposition, prompts, Conversations and Sources entry points | Conversation search, source filters, answer confidence/provenance, feedback, retry/cancel, no-answer recovery, stable citations, permission-expiry handling | P0/P1 |
| `/knowledge/wiki` | KEEP | Observed + Source | Wiki shell and New page exist; source has recents, favorites, roots | Live page was visually sparse; add search/filter/view controls, page menus, trust badges, bounded All pages, first-run guidance | P0 |
| `/knowledge/wiki/private` | KEEP, rename “My pages” | Observed + Source | Dedicated personal library surface | Current source filters `visibility=private`; target is server-side ownership. Add search, status/space filters, cursor paging, page actions | P0 |
| `/knowledge/wiki/shared` | KEEP | Observed + Source | Dedicated inbound-share surface | Current source treats “created by someone else” as shared. Add explicit grants, sharer/date/access fields, search/filter, retry/error state, cursor paging | P0 |
| `/knowledge/wiki/spaces` | KEEP | Observed + Source | Create/edit cards and empty state | Current source loads full page tree for counts and hard-deletes spaces. Add server counts, search, audience filter, cursor paging, members, archive/restore | P0 |
| `/knowledge/wiki/spaces/[spaceId]` | KEEP | Source | Page tree and audience badge | Add in-space search, status filter, create-in-space, members, archive, inaccessible/not-found distinction, lazy tree | P0/P1 |
| `/knowledge/wiki/templates` | KEEP | Observed | Useful starter set; Starters/Saved split | Add `q`, category/use-case filters, saved-template pagination, preview, permission split, last-used/owner for saved templates; do not add a marketplace | P1 |
| `/knowledge/wiki/reviews` | KEEP | Observed + Source | Queue table and Status/Type controls | Live surface remained in “Loading results…” during audit. Add retry/error, URL filters, `q`, overdue derivation, cursor paging, bulk approve/reject, decision reason, SLA/freshness context | P0/P1 |
| `/knowledge/wiki/import` | KEEP | Observed | Paste and file import, export, recent jobs | Add required title/target/duplicate policy, format/size validation, job progress/errors, retry, cursor jobs, independent import/export permissions | P0 |
| `/knowledge/wiki/analytics` | KEEP | Observed + Source | Dedicated destination and backend analytics | Live page exposed only a heading during audit. Add range/space filters, permission-safe metrics, result bounds, health/gap workflows, skeleton/error/no-data states; remove vanity metrics | P1 |
| `/knowledge/wiki/trash` | KEEP | Observed + Source | Retention explanation and setting | Add searchable table, deleted-by/date filters, cursor paging, selection, bulk restore/purge, purge impact, retention permission split | P0 |
| `/knowledge/wiki/doc/[pageId]` | KEEP | Observed page `34` + Source | Autosave state, draft marker, title/editor, cover/icon, rich formatting, undo/redo, AI, sharing, breadcrumbs | Add visible favorite/comments/info/history access, mobile metadata, backlinks/record links, trust/owner/review state, source-backed AI, offline/conflict recovery, granular action gates | P0/P1 |
| `/knowledge/wiki/doc/[pageId]/history` | KEEP | Observed heading + Source | Dedicated version destination | Add version list skeleton/error/empty, actor/time/change summary, diff, compare pair, guarded restore, current-version marker, cursor paging | P0 |
| `/knowledge/wiki/search` | ADD | Observed 404 | — | Full ACL-safe results, snippets, facets, filters, cursor, result actions, query URL, Quick find “View all” | P0 |
| `/knowledge/wiki/manage` | ADD | Observed 404 | — | Health inventory for stale, unowned, unverified, empty, overexposed, broken-link, and overdue-review pages; bulk repair | P1 |
| `/knowledge/wiki/research-briefs` | MOVE/ADD | Source | Backend capability exists under Support | Place list/detail with correct citation lifecycle under Knowledge; remove old owner after cutover | P1 |
| `/build/[projectId]/wiki` | KEEP adapter | Source | Reuses wiki home | Scope every list/search/create/read by project; project back path; no duplicate data or editor | P0 |
| `/build/[projectId]/wiki/[pageId]` | KEEP adapter | Source | Reuses document surface | Enforce project membership on every path; add history adapter | P0 |
| `/wiki/[shareToken]` | KEEP | Source | Public token renderer and rate limiting exist | Prove 404 for invalid/revoked, no sibling/title leakage, accessible typography, optional feedback; expiry/password only after demand | P0/P2 |
| `/support/kb/**` | DUAL-RUN then REMOVE/MIGRATE | Source | Existing help-centre CMS remains usable | Stop mixing article ids and page URLs; publish from pages or maintain explicit record kind until cutover | P1 |
| `/help/**` | KEEP renderer | Source | Public help job is distinct | Reuse published page projections only after migration; keep public cache and analytics separate | P1 |
| `/ask` | MERGE/REMOVE | Contract + Source | — | Redirect to `/knowledge/chat`, move callers, delete duplicate product surface | P0 |

## What already works well

- A coherent Wiki shell with Library, Manage, Quick find, and Trash.
- A mature document editor with autosave, formatting, page decoration, AI, share, and edit history infrastructure.
- Version rows, optimistic concurrency, idempotency support, outbox infrastructure, queues/workflows, replica routing, rate limiting, Redis-compatible caching, and tenant-aware tests already exist in the broader backend.
- Retrieval already combines keyword and vector candidates and degrades to keyword search when embeddings fail.
- The source contains extensive tenant-isolation, reindex, retention, deduplication, restore, and conflict tests.
- Project wiki already reuses the Wiki feature instead of introducing a second editor.

These are assets to deepen, not reasons to add another platform.

## Cross-page gaps

### Product correctness

1. Ownership and sharing semantics are wrong in the browser and lack a first-class page share-grant model.
2. A full search results page is absent; Quick find cannot carry discovery, filtering, and bulk actions.
3. Important list pages derive from the full tree, which is both semantically wrong and unbounded.
4. Several pages render generic empty states for network or authorization failures, making recovery and support difficult.
5. Content trust metadata exists in pieces but is not consistently visible at decision points: search, cards, Ask citations, and page headers.

### Interaction and accessibility

1. Mobile navigation and metadata access are incomplete.
2. Card actions are inconsistent; right-click/overflow actions and keyboard equivalents are not defined across libraries.
3. Filters do not consistently round-trip through the URL.
4. Destructive, access, approval, and publication actions need explicit confirmation and must not use optimistic success.
5. Tables require mobile-card alternatives, focus restoration, announced result counts, and non-color-only statuses.

### Backend and scale

1. Canonical page visibility is not uniformly applied to every list, review, analytics, source, link, and citation path.
2. Several lists use silent caps or lack cursor contracts.
3. Missing or mismatched composite indexes remain on high-cardinality access patterns.
4. Cache keys and invalidation do not yet cover every access, search, analytics, and migration writer.
5. Vector search uses a shared global HNSW structure with tenant filtering after candidate retrieval; this can lose recall for small tenants and become expensive at very large chunk counts.
6. Some asynchronous systems exist, but Knowledge needs explicit queue-age SLOs, admission control, per-tenant fairness, and cost budgets.
7. Dual `kb_pages`/`kb_articles` models create duplicated access, indexing, citation, and migration logic.

## Immediate release blockers

| Blocker | Why it blocks release | Proof required |
|---|---|---|
| Shared/My pages semantics | Users can see the wrong collection and may infer access incorrectly | First-class grant schema, server filters, cross-tenant and revocation tests |
| Canonical ACL parity | Search/Ask/analytics can expose metadata even if detail is protected | One authorization module used by every read projection; leak tests for title/snippet/citation/count |
| Unbounded or silent-capped collections | Data disappears or latency grows with tenant size | Cursor response with `hasMore`, indexes, 10k/100k-record test data |
| Missing full search | Core “find knowledge” job cannot be completed | Search route, facets, snippets, keyboard access, zero/partial/error states |
| Space hard-delete | Destructive behavior conflicts with recoverability | Archive/restore default; asynchronous purge after retention |
| Incomplete live states | Blank/indefinite pages look broken and hide errors | Browser evidence for loading, ready, empty, filtered-empty, error, denied, offline/conflict where applicable |

## Explicit assumptions to validate

- Capacity planning in the scale documents assumes 1,000,000 registered users, 100,000 daily active users, 10,000 requests/second peak across all tenants, 10 million pages, 200 million chunks, and 2 TB of stored attachments. These are planning envelopes, not current measurements.
- Most traffic is read-heavy. If edit concurrency becomes dominant, collaborative editing becomes a separate design decision.
- Tenant distribution is skewed. A few large tenants will dominate data and traffic, so per-tenant budgets and optional placement cells are required.
- PostgreSQL, object storage, Redis, and the existing durable workflow/outbox are preferred before adding new vendors.

## Audit follow-ups

- Capture valid live evidence for a populated space detail, a populated history, a shared page, an analytics result set, and a review decision.
- Record network/error codes for the Shared, Analytics, History, and document loads that returned sparse or indefinite content during the audit.
- Run the route census in CI so new Knowledge routes cannot appear without a catalog entry and disposition.
