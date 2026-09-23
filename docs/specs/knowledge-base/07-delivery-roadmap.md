# Step 7 — Delivery Roadmap, Release Gates, and Verification

## Delivery rule

Correctness precedes scale optimization; scale proof precedes infrastructure expansion; measured customer need precedes feature breadth. Work is delivered as vertical slices with browser, interface, database, authorization, and operations evidence together.

## Phase 0 — Baseline and observability (1–2 weeks)

### Deliver

- Lock route/page catalog and feature flags.
- Capture production-like cardinalities, route traffic, slow queries, queue age, index lag, search quality, AI cost, and current error codes.
- Define SLOs/error budgets and a per-tenant planning/cost dashboard.
- Add CI parity for permission catalog and Knowledge route catalog.
- Add live browser fixtures for populated/empty/denied/error states.

### Gate

- No unknown page, permission key, job consumer, or source-of-truth model.
- Load dataset and cost model approved.
- Current P0 leak and data-loss tests are red and reproducible before fixes.

## Phase 1 — Access and data correctness (2–4 weeks)

### Deliver

- Canonical `KnowledgeAuthorization` interface on page/list/search/Ask/citation/review/analytics/source/link/export paths.
- Page share grants and correct My/Shared list semantics.
- Space access on create/move/list/detail.
- Route denial vs hidden-record behavior.
- ACL/content revisions in caches and index projection.
- Cross-tenant, revocation, and stale-index tests.

### Gate

- Zero unauthorized title, snippet, count, attachment, or citation disclosure in the full test matrix.
- Revocation SLI meets budget.
- Frontend/backend permission names match.
- Security review signs the canonical predicate and public-token behavior.

## Phase 2 — Scalable collections and full search (3–5 weeks)

### Deliver

- `GET /kb/pages` with list projection, filters, facets, stable cursor.
- Lazy tree children endpoint.
- Cursor contracts for spaces, reviews, trash, templates, sources, import/export jobs, versions, and conversations.
- Full Search page and Quick find handoff.
- Server page/member counts for spaces.
- Query indexes with `EXPLAIN` evidence.
- Cache key/writer matrix and failure-mode tests.

### Gate

- No silent caps or browser filtering over the tenant tree.
- 10k/100k-item browser and query tests meet p95 budgets.
- Minority-tenant lexical/vector recall suite passes agreed threshold.
- Cache failure preserves correctness and stays within database protection limits.

## Phase 3 — Page and library experience (3–5 weeks)

### Deliver

- Page card/row action descriptor model.
- Mobile Wiki drawer, mobile collection cards, metadata/comments sheets.
- Page trust header: owner, status, access, verified/review state, updated actor/time.
- History diff/restore, offline/save/conflict recovery.
- Search/filter/view controls on Home/My/Shared/Spaces.
- Space archive/restore and member UI.
- Trash table and bulk restore/purge.
- Complete loading/error/empty/filtered-empty/denied states.

### Gate

- Keyboard, screen reader, 375 px, 200% zoom, reduced motion, and localization stress pass.
- Content restore and conflict drills pass without lost edits.
- No action is context-menu-only or desktop-only.
- Browser evidence exists for every page/state in the catalog.

## Phase 4 — Governance loop (4–6 weeks)

### Deliver

- Review queue URL filters, overdue, assignment, bulk decisions.
- Content Health page with explainable signals.
- Ask/Search gap capture and assign/resolve flow.
- Permission-safe analytics and actionable drill-down.
- Notifications for direct share, ownership/review assignment, and mentions.
- Research Briefs moved under Knowledge with durable citations.

### Gate

- Every health signal links to evidence and an allowed repair.
- No auto-publish/access change by AI.
- Analytics minimum-cohort and ACL leak tests pass.
- Health backlog and successful-resolution metrics are measurable.

## Phase 5 — Async scale, cost, and disaster recovery (parallel after Phase 1, gate before large launch)

### Deliver

- Dedicated queue lanes, per-tenant concurrency, admission control, retry/DLQ/lease recovery.
- Interactive index and access-revocation freshness SLOs.
- Batched, content-hash-deduplicated embedding with budgets and lexical fallback.
- Public-page CDN invalidation by token/page revision.
- Resumable purge ledger across all stores.
- Replica consistency classification and lag failover.
- Backup restore, tenant export/delete, reindex, and cell-move drills.

### Gate

- Load/soak tests at the planning envelope or the next measured 10× horizon.
- RPO/RTO drill meets target.
- Queue age and cost remain bounded under a large-tenant import and provider outage.
- The system sheds bulk/AI load before interactive page work.

## Phase 6 — Consolidation and deletion (after parity windows)

### Deliver

- `/ask` redirect and duplicate removal.
- Research-brief route cleanup.
- Remove tree-as-list and client cap/filter code.
- Complete help-centre migration plan; remove `kb_articles` runtime only after parity/cutover proof.
- Remove stale endpoints, hooks, schemas, keys, events, and tests claimed by no product page.

### Gate

- Caller census, telemetry window, build/test/cycle/unused checks pass.
- Migration reconciliation and rollback drill pass.
- No public URL, citation, export, or attachment regression.

## Workstream ownership

| Workstream | Accountable role | Consulted |
|---|---|---|
| Product jobs, scope, metrics | Product manager | Design, Support, Sales, Security |
| IA, interaction, accessibility | Product design | Frontend, accessibility reviewer |
| Authorization/data model | Backend architect | Security, DBA, frontend |
| Search/retrieval quality | Search/AI owner | Product, Security, Support |
| Reliability/cost | Platform/SRE | Backend, Finance, Security |
| Migration/removal | Module owner | DBA, Support, customer success |
| Release evidence | QA/release owner | all workstreams |

One named directly responsible individual is assigned per ticket; role labels above are not substitutes.

## Acceptance evidence bundle per slice

Each completed slice includes:

1. Product requirement and out-of-scope statement.
2. Interface/schema examples and compatibility notes.
3. Authorization matrix and tenant/revocation tests.
4. Database plan/index evidence and query count.
5. Cache/event/job writer matrix.
6. Unit, contract, integration, and browser test results.
7. Accessibility and responsive evidence.
8. SLI dashboard or synthetic proof.
9. Migration, rollback, and cleanup steps.
10. Cost impact at current, 10×, and planning-envelope load.

## Release checklist

- [ ] Every current/additional route is in `00-current-state-audit.md` and its page contract.
- [ ] P0 customer jobs work without AI.
- [ ] Detail, list, search, Ask, citations, analytics, exports, attachments, and notifications share authorization semantics.
- [ ] Every collection is bounded and signals `hasMore`.
- [ ] Expected revision protects content writes; idempotency protects retriable creates/bulk.
- [ ] Revocation, restore, purge, queue replay, cache failure, replica lag, and provider outage drills pass.
- [ ] Search relevance and citation correctness meet offline thresholds.
- [ ] All page states pass keyboard/screen-reader/mobile review.
- [ ] SLOs, alerts, runbooks, and cost limits are live before rollout.
- [ ] Canary rollout has stop/rollback thresholds.
- [ ] Superseded code is removed only after the evidence in `06-code-removal-and-reuse.md`.

## Stop-the-line conditions

- Any cross-tenant or hidden-record metadata disclosure.
- Lost edit or revision overwrite.
- A destructive bulk command without per-record authorization and idempotency.
- A page/list endpoint with an unbounded query or silent cap.
- Search/Ask serving stale authorized content after the hard revocation bound.
- A migration without reconciliation and rollback.
- Background work exhausting interactive database connections.
- AI spending without tenant budget, timeout, concurrency, and deterministic fallback.

## Post-launch evaluation (30/60/90 days)

### 30 days

- Fix top zero-result and unsupported-answer causes.
- Review permission denials, blank/error pages, slow queries, index lag, and queue failures.
- Remove unused starter templates and noisy notifications based on data.

### 60 days

- Evaluate owner/verification coverage and health remediation time.
- Re-rank roadmap based on successful resolution, not feature clicks.
- Revisit vector/search topology only if latency, recall, or cost thresholds failed.

### 90 days

- Decide whether P2 Evidence Trail, Answer-to-Fix, Knowledge Packets, or canonical excerpts has the strongest measured customer pull.
- Decide whether any module needs extraction or tenant-cell activation from observed pressure.
- Delete remaining legacy paths whose parity window and telemetry gates have closed.

## Ticket slicing rule

Do not create tickets called “build backend,” “improve UI,” or “scale Knowledge.” A valid ticket is one verifiable vertical outcome, for example:

> “Shared with me returns only active explicit grants, supports cursor paging, removes revoked results from Search and Ask within 60 seconds, and exposes sharer/access metadata in card and mobile states.”

That slice contains UI, interface, schema, authorization, indexing/cache invalidation, tests, telemetry, migration, and rollout together.
