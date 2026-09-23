# Step 6 — Code Removal, Consolidation, and Reuse Plan

## Goal

Reduce concepts and duplicate implementations before adding infrastructure. Deletion follows dependency and migration proof; this file does not authorize dropping data or routes immediately.

## Removal candidates

| Candidate | Why unnecessary/risky | Replacement | Safe removal gate |
|---|---|---|---|
| Standalone `/ask` product surface | Duplicates Ask KB chrome and behavior | Redirect to `/knowledge/chat` | Route/caller census, redirect test, analytics comparison, then delete page/imports |
| Browser `visibility=private` filter for Private page | Wrong product semantics and downloads tree | `GET /kb/pages?owner=me` | Server contract + UI migration + ownership tests |
| Browser `createdById != me` filter for Shared | Treats org-visible pages as shares | First-class grants + `sharedWithMe=1` | Grant backfill/migration, revocation tests, parity report |
| Full `useKbPagesTree` for home, spaces counts, My/Shared lists | Unbounded and duplicates list behavior | Page list projections + lazy children | All consumers migrated; query budget and UI tests |
| Customer-facing hard delete of a space | Irreversible and costly synchronous fan-out | Archive/restore + retained purge workflow | Lifecycle migration, archive UI, purge drill |
| Support-owned research brief pages | Wrong module owner and duplicate navigation | Knowledge list/detail | Links/callers migrated, permissions and history preserved |
| Support gap flow that creates an article but links a page URL | Mixed record identity can open the wrong route | Typed citation/record reference or page draft | Data repair, route mapping tests |
| `kb_articles` as an organization-wiki model | Duplicates page ACL, search, versions, citations | `kb_pages`; article model temporary for help centre only | Full help-centre migration, public/help parity, rollback window, backup |
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
