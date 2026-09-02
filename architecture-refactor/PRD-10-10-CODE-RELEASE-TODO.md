# StreamlineOS code-release remaining-work PRD

Status: active — single authoritative backlog
Last reconciled: 2026-09-02 at root commit `10c06d01c`
Scope: all platform domains except CRM and Inventory

This file contains only remaining acceptance work. Completed checklist items and the temporary session documents were removed after current-source reconciliation; their evidence remains in Git history. A missing checkbox must never be interpreted as waived work: every removed checkbox was either previously evidenced or freshly re-verified below.

## Current completion

- Immediate acceptance criteria proven: **153 of 281 (54.4%)**.
- Immediate acceptance criteria still open: **128 of 281 (45.6%)**.
- Deferred production/compliance criteria still open: **34**.
- Code-level 10/10 is **not yet reached**. Module checklists are substantially ahead of cross-cutting integration, performance, privacy and final-release proof.

### Module checklist status

| Area | Proven | Open | Coverage |
|---|---:|---:|---:|
| Authentication/identity/organization | 5 | 2 | 71% |
| Organization and module RBAC | 3 | 2 | 60% |
| Home | 9 | 0 | 100% |
| Settings | 3 | 2 | 60% |
| Directory/Me | 5 | 0 | 100% |
| HRMS | 6 | 0 | 100% |
| Payroll | 3 | 3 | 50% |
| Build/PM | 7 | 0 | 100% |
| Workflows | 5 | 0 | 100% |
| Billing/payments | 7 | 0 | 100% |
| Accounting/finance | 5 | 0 | 100% |
| Chat | 10 | 0 | 100% |
| Calendar | 6 | 2 | 75% |
| Inbox/mail | 3 | 2 | 60% |
| Notifications | 7 | 1 | 88% |
| Knowledge/Wiki/Chatbot | 5 | 3 | 62% |
| Shared adapters | 6 | 0 | 100% |
| Frontend system-wide | 2 | 4 | 33% |

A 100% module row means its module-specific checklist is closed. It does not override open cross-cutting gates below.

## Fresh verification snapshot

Verified green on 2026-09-02:

- Backend hard size: 3,473 files scanned, all within 500 lines with 12 registered exceptions.
- Backend over-300 ratchet: 394/3,473, exactly the approved baseline.
- Frontend over-300 ratchet: 518/4,973, below the 519 baseline.
- Migration discipline, rollback, chain and ledger: 634/634 applied, zero pending/orphan/duplicate/unreachable entries.
- Tenant relationships: zero actionable in-scope single-column tenant FKs; CRM/Inventory reported separately.
- Tenant indexes: 745/745.
- RLS verification and retention coverage.
- Permission catalog: 3,115 usages, 627 unique keys, all valid in both catalogs.
- Route classification: 3,596 handlers, zero undeclared.
- OpenAPI coverage: 3,607/3,607 operations; 1,370/1,370 mutating request schemas.
- Bounded contracts, bulk-id limits, cache invalidation, idempotent commands, fire-and-forget notification checks and outbox consumers.
- Frontend client routes: 256/600, 48 below the ceiling.
- Query cancellation/scope and command catalog: 1,053 query functions with zero signal violations; 1,506 mutations with zero unclassified commands.
- Payroll database integration: 1 suite / 14 tests passed against the current database, closing the former unapplied-`0933` blocker.

Not rerun in this reconciliation because they are expensive final-integration gates: full backend/frontend builds, full typechecks, full Jest suites and complete disposable E2E. They remain open below.

## Current reproducible blockers

- Clean-bootstrap parity is not current. Existing evidence was captured at a 609-entry journal and failed catalog parity; the current chain has 634 entries. Re-run two clean bootstraps plus interrupted/resumed bootstrap and require exact catalog equality.
- Classify or repair two newly unclassified reads: `build/core/projects-search.service.ts` and `cron/cron-storage-sweep.service.ts`. The scanner reports zero actionable reads but remains red until both paths are classified from source evidence.
- Eliminate 36 actionable N+1 files / 42 loop-internal database call sites reported by `check:db-call-count`.
- Add executable cross-tenant negative tests for seven services: Accounting receivables, Build project work query, cron storage sweep, Dashboard project, Finance depreciation reverse, Support AI triage and Support KB-gap detection.
- Reconcile three new internal routes in the fail-closed contract registry: `GET /cron/storage-sweep`, `POST /cron/storage-sweep` and `POST /gdpr/erasure/{subjectId}`.
- Classify or remove six frontend exports reported by the dead-code gate: `parseApiResponse`, `ApiResponse` and four Chat realtime payload types.
- Repair or remove three live frontend controls whose backend operation does not exist: Chat presence status, invoice deletion and Support KB attachment download.
- Reduce the 114 authenticated thick route modules through domain-owned feature seams; do not raise the ratchet.
- Refresh and pass route-performance evidence. The committed bundle manifest still reports `/inbox` at 558,680 bytes against 524,288. Current Web Vitals evidence has six breaches: mobile INP/FCP/TTFB and desktop LCP/FCP/TTFB.
- Decide and implement Calendar provider drift conflict behavior: local wins, provider wins or user-visible conflict resolution.
- Finish AI gateway consistency: reserve/check credit before public KB embedding, route embedding through the gateway interface, stream non-chat AI surfaces and measure realistic-corpus retrieval latency.
- Finish GDPR correction and erasure across remaining database PII, Chat/AI content, search/vector indexes, projections, caches and supported adapters while preserving legal holds and immutable records.
- Add durable retry/DLQ semantics and bounded history for module Workflow step execution.
- Make retention execution self-monitoring: schedule or prove the external scheduler, add a dead-man signal and emit durable failure events. Decide retention for `notification_outbox` and `outbox_events`.
- Make Chat attachment storage private and backfill existing public attachment URLs to tenant-scoped object keys; current provider-response validation, tenant-fair delivery scheduling and offline Notification UI are already implemented.
- Reconcile the remaining nine baseline `src/common/** -> src/modules/**` imports by moving shared interfaces/types to neutral seams.
- Run dependency proof for the remaining dead backend exports/types before deletion; do not delete schema or side-effect imports from text search alone.

## Product constraints

- Do not change public landing-page visuals or animations.
- CRM and Inventory code, migrations and acceptance evidence are excluded.
- Home is the universal shell and composition module. Chat, Calendar, Inbox and Notifications appear through Home but retain independent schema, authorization, caching, workers and implementation behind small interfaces.
- Preserve [PRD-IN-SCOPE.md](PRD-IN-SCOPE.md) unless a concrete scale, correctness, security or operability failure requires change.
- Never solve growing work with silent truncation. Use keyset pagination, resumable batches, streams or queues.
- Every tenant relationship, query, cache key, event, object key and search ACL preserves organization scope.
- Never delete code or schema from text search alone. Require dependency evidence plus build/typecheck and migration-integrity proof.

## Approved implementation decisions — 2026-09-01

These decisions are final for this release and remove implementation alternatives from the checklist:

1. **RBAC:** exactly six fixed standings — organization owner/admin/member and module owner/admin/member. Capability customization uses fixed templates, per-person permission grants, delegations and DataScope. No runtime custom-role creation.
2. **Token authority:** the backend exposes an authenticated session-exchange interface and alone signs short-lived asymmetric JWTs. Frontend and edge runtimes contain no backend signing key.
3. **Payroll posting:** Payroll commits an idempotent Accounting-posting intent through the transactional outbox; Accounting consumes it asynchronously and idempotently. Brief `pending` state is accepted; lost or dangling journals are not.
4. **Calendar synchronization:** local Calendar state commits first with durable `pending` synchronization state. Provider synchronization runs asynchronously with `synced`/`failed` state, retry/backoff and user-visible recovery.
5. **Chat presence:** Ably connection presence is authoritative. One leader-elected browser heartbeat with jitter/backoff is permitted only as a bounded fallback.
6. **Knowledge comments:** authors may edit/delete their comments while they retain page visibility; page editors may resolve; KB administrators may moderate. Every action rechecks current page/article visibility at the data seam.
7. **Home contract:** the backend owns the authoritative Home section/access manifest. The frontend consumes a generated contract; hand-maintained parallel registries are prohibited.
8. **Billing providers:** frontend checkout is provider-neutral. Razorpay is the first adapter; a Stripe-ready contract test proves another adapter requires no Billing caller change.
9. **Migration policy:** staging and production contain no valuable data. Destructive migration rebasing, squashing and database recreation are authorized; no legacy watermark upgrade compatibility is required for this release. The new clean baseline must remain reproducible and interruption-safe.
10. **Deferred capabilities:** hooks, routes and UI that are outside the confirmed release scope are removed after dependency proof, not retained behind speculative flags.
11. **Release scope:** Home, Settings, Authentication/RBAC, HRMS, Payroll, Build, Billing/Payments/Accounting, Chat, Calendar, Inbox/Mail, Notifications, Knowledge/Wiki/Chatbot and Workflows. CRM and Inventory remain excluded.
12. **Compatibility:** internal frontend/backend routes, types and schemas may break during this coordinated refactor. Only published customer/integration contracts require backward compatibility or explicit versioned deprecation.

## Immediate code-level release candidate

### 1. One-commit release verification

- [ ] Run disposable-database E2E for Organization/RBAC, Home, Settings, HRMS, Payroll, Build, Billing, Payments, Accounting, Chat, Calendar, Notifications, Knowledge, Workflows and Inbox/mail.
- [ ] Record each command, release SHA, database identity, dataset shape, pass/fail/skip counts and failure artifacts.
- [ ] At the same commit run backend build/typecheck, spec typecheck, frontend typecheck, OpenAPI freshness, cycle, file-size, dead-code, tenant-isolation, RLS, permission, cache, outbox, idempotency, migration, vulnerability, license and SBOM gates.
- [ ] Resolve every code-level P0/P1 finding and assign owner/deadline to accepted lower-severity residual risks.

### 2. Module and folder architecture

- [ ] Prove domain modules expose small, stable interfaces and keep implementation local; remove shallow pass-through layers that add no behavior.
- [ ] Prove Home only composes universal experiences; Chat, Calendar, Inbox and Notifications retain independent business implementation.
- [ ] Prove zero circular imports, forbidden new `forwardRef`, barrel self-imports and erased Nest injection tokens.
- [ ] Prove every active Nest module is registered and every frontend route has one canonical owner; remove obsolete routes rather than preserving hidden duplicates.
- [ ] Keep authenticated `app/**/page.tsx` and `layout.tsx` files as thin route modules for metadata, parameters, server authorization and composition; move state, forms, queries and mutations behind feature-owned interfaces and gate route-file size/import direction without changing landing visuals or animations.

### 3. TypeScript, Zod and cross-layer contracts

- [ ] Prove strict TypeScript with no new `any`, suppression directives, unsafe double casts, non-null assertion abuse or parallel hand-written types that drift from schemas.
- [ ] Validate every untrusted body, parameter, query, environment value, upload manifest and external response through established Zod boundaries.
- [ ] Keep Zod schemas in module DTO/schema files, derive types with `z.infer`, reject protected/client-supplied actor and tenant fields and enforce unknown-key policy.
- [ ] Reconcile backend Zod/OpenAPI contracts with frontend request/response types, hooks, forms and rendered error states.
- [ ] Prove controllers remain thin, business rules stay backend-side and no frontend `app/api` or client module contains business/database logic.

### 4. Database schema and migration quality

- [ ] Audit primary-key strategy, tenant-scoped uniqueness, FK indexes, named constraints, referential actions, checks, money units, timestamps and audit columns.
- [ ] Verify normalized lifecycle and relationship tables; remove actionable JSON arrays/polymorphic authority relationships and avoid EAV unless an approved custom-field seam requires it.
- [ ] Verify soft-delete/archive policy and every active readâ€™s deleted/archived predicate; use partial indexes where the access pattern requires them.
- [ ] Reconcile Drizzle declarations, migration snapshots and the live catalog so each tenant relationship has one canonical composite constraint; remove redundant single-column constraints only after dependency proof, cold bootstrap and upgraded-catalog parity.
- [ ] Remove obsolete schema only with symbol, raw table-name, FK, migration, barrel and integrity-spec evidence.
- [ ] Establish a new clean migration baseline after authorized destructive rebase/squash, recreate disposable staging from zero and exercise interruption/retry plus rollback/forward-fix using [RB-09](runbooks/RB-09-migration-rollback.md); no legacy watermark upgrade is required.
- [ ] Compare two independent clean bootstraps and an interrupted-then-resumed bootstrap: tables, columns, constraints, indexes, policies, functions, triggers and extensions must match exactly.
- [ ] Retain release SHA, commands, database identity, catalog diff and artifact hashes.

### 5. Query, pagination and cache correctness

- [ ] Prove explicit projections, tenant-leading/access-pattern indexes and no required full tenant/table scan or avoidable sort.
- [ ] Exercise reminder, export, fanout, unread, free/busy, recurrence, search/vector and dashboard queries against seeded data.
- [ ] Verify cache keys include tenant, subject, permission and resource dimensions where applicable.
- [ ] Prove mutation/revocation invalidation, TTL/negative-cache policy, stampede protection and Redis degradation never leak data or preserve revoked access.

#### 5.1 Efficient database-call contract

- [ ] Record a maximum database-call count for every critical route and worker batch; fail regression tests when an implementation adds unexpected calls.
- [ ] Execute tenant-owned request work inside the minimum correct tenant transaction and reuse its handle; never open nested/per-row transactions or borrow a committed request transaction.
- [ ] Select named columns only and return minimal DTO projections; never hydrate full ORM rows, global users or large JSON/blob/vector fields for list/count/existence paths.
- [ ] Batch relationship, permission, unread, attachment, assignee and metadata lookups with joins, CTEs or bounded multi-key queries; forbid database/cache calls inside growing loops.
- [ ] Implement existence/authorization probes with tenant-correlated indexed predicates and `LIMIT 1`; do not fetch records or counts when only existence is required.
- [ ] Make exact totals opt-in and independently budgeted; cursor pages must not run an expensive `COUNT(*)` automatically on every request.
- [ ] Use bounded bulk insert/update/upsert operations and conflict-safe unique keys instead of one write per row; keep transactional batches below documented lock/payload limits.
- [ ] Verify concurrent counters, unread state, seats, balances, ordering and idempotency use atomic SQL/upsert/locking semantics without read-then-write races.
- [ ] Apply statement/query timeouts and cancellation propagation to interactive work; move reports, exports, reindexing and wide aggregates to resumable jobs.
- [ ] Measure connection acquisition, transaction duration and idle-in-transaction behavior; release connections before external provider calls or long CPU work.
- [ ] Benchmark under the application role with tenant context and RLS, never only as the database owner; plans must include real authorization predicates.
- [ ] Capture slow-query fingerprints, call counts, rows read/returned, buffers and lock waits in test evidence without logging sensitive bind values.

### 6. Organization and module RBAC

- [ ] Run BOLA/IDOR tests for reads, writes, bulk actions, files, exports, search/vector, realtime, jobs and public/share-token paths; cross-tenant misses return 404.

### 7. NestJS route and worker behavior

- [ ] Verify every route is classified public, universal, permissioned or explicitly authorized inside its implementation; no undeclared route exists.
- [ ] Verify every privileged operation applies module, permission, tenant, record and DataScope checks at the correct seam.
- [ ] Verify writes are transactional, idempotent and safe under concurrent retry; side effects use after-commit/outbox behavior and never a dead request transaction.
- [ ] Verify background sweeps iterate tenant context explicitly, use bounded/resumable leases and expose retry/DLQ/cancellation states.
- [ ] Verify minimal response projections, serialization/redaction, generic errors, resource limits and stable HTTP semantics.
- [ ] Reconcile OpenAPI exposure, request, response, 4xx schema and operation metadata with active controllers and consumers.

#### 7.1 Optimized route and transport contract

- [ ] Keep one canonical route per product operation; remove dead, versionless, duplicated and overlapping routes after caller/dependency proof.
- [ ] Define route budgets for database calls, downstream calls, application latency, response bytes and memory; record p50/p95/p99 at the release commit.
- [ ] Design routes around one user intent rather than forcing avoidable request waterfalls, while keeping unrelated domain implementation out of oversized mega-responses.
- [ ] Keep Home aggregation bounded and parallel with independent section results; one slow source must not delay or fail every section.
- [ ] Return explicit DTO projections and omit unused nested relations, internal columns, secrets and repeated denormalized payloads.
- [ ] Support conditional responses with version/ETag or `Last-Modified` where correctness permits; include tenant, permission and representation changes in the validator.
- [ ] Enable Brotli/gzip for eligible JSON/text/OpenAPI/static responses with minimum-size and already-compressed-content exclusions; never compress secrets in a cross-origin reflection context.
- [ ] Stream AI responses, downloads and large exports or return durable asynchronous jobs; do not buffer growing payloads in NestJS or Next.js memory.
- [ ] Propagate cancellation and deadlines through NestJS, database, cache and provider adapters; enforce upstream timeouts, concurrency limits and backpressure.
- [ ] Require idempotency and optimistic concurrency/version checks for replayable or conflict-prone mutations; return stable 409/412 semantics.
- [ ] Avoid serial downstream/provider calls when independent, cap parallel fanout and use batch adapters where providers support them.
- [ ] Verify frontend route loaders and TanStack consumers reuse/prefetch the canonical request instead of issuing duplicate server/client fetches.
- [ ] Keep response/error envelopes, pagination metadata and cache headers consistent across modules and prove frontend/OpenAPI contract compatibility.

### 8. TanStack Query and Next.js data layer

- [ ] Verify one hierarchical query-key factory per domain includes organization, subject, scope, filters, sort and cursor dimensions as applicable.
- [ ] Remove duplicated/ad-hoc string query keys and prove invalidation targets the correct prefix without flushing unrelated tenants/modules.
- [ ] Gate queries with effective access and required identifiers; disabled queries must not send unauthorized or malformed requests.
- [ ] Verify mutations invalidate or update every affected list/detail/count/dashboard key and roll back optimistic state safely on failure.
- [ ] Use optimistic updates only where concurrency semantics are defined; otherwise await the backend result and invalidate deterministically.
- [ ] Verify cursor pagination does not duplicate/skip records and changing filter/sort resets pagination correctly.
- [ ] Verify loading, background-refresh, empty, partial-error, full-error, offline, permission-denied and revoked-access states.
- [ ] Prove frontend types and runtime parsing cannot silently accept a backend contract change.
- [ ] Enforce canonical query-key factories for authenticated data: zero ad-hoc array keys or local key factories, no redundant tenant argument where the scoped Query hash already owns tenant/user identity, and exact invalidation tests for every mutation.

### 10. Module release matrix

- [ ] Inventory its backend module folders, controllers, implementations, DTO/Zod schemas, database schema files, migrations, workers, cache keys, event consumers, frontend routes, components, hooks, TanStack keys, tests, fixtures and operational scripts.
- [ ] Verify every folder/file has one canonical domain owner, kebab-case naming, correct import direction and no parallel legacy/duplicate location.
- [ ] Classify every inventoried file as KEEP, REFACTOR or REMOVE; name the concrete failure prevented for each REFACTOR/REMOVE verdict.
- [ ] Verify each file has one cohesive responsibility, stays within size policy or a documented exception, exposes the smallest useful interface and contains no pass-through/dead/commented/debug implementation.
- [ ] Prove removals and moves with dependency-graph, dynamic/side-effect import, route registration, raw table-name/FK, build/typecheck and relevant migration-integrity evidence.
- [ ] Record the final module folder tree and public interfaces so future work cannot recreate retired paths, duplicated schemas, hooks, query keys or endpoints.

#### 10.1 Authentication, identity, sessions and organization

- [ ] Queries/cache: verify bounded membership/session reads, required indexes and immediate invalidation of session, effective-access and organization caches.
- [ ] Frontend/TanStack/tests: verify workspace/onboarding gates, organization switch state, query-key tenant isolation, auth error states and allow/deny/cross-tenant E2E.

#### 10.2 Organization RBAC and module RBAC

- [ ] Routes/contracts: verify role/grant/module-access CRUD has strict Zod contracts, stable OpenAPI, idempotent mutations and exhaustive owner/descendant protections.
- [ ] Queries/performance: verify effective-permission resolution is batched/cached, scope expansion is bounded and indexes cover subject, role, permission, module and tenant access paths.

#### 10.4 Settings and module-access administration

- [ ] Architecture/schema: prove global settings contain organization configuration/access governance only while operational and module-owned settings remain with their modules.
- [ ] Queries/cache: verify bounded settings reads, tenant-leading indexes and invalidation of organization, hierarchy, access, navigation and entitlement caches.

#### 10.7 Payroll

- [ ] Architecture/schema: verify payroll runs, components, assignments, calculations, payslips, taxes, deductions and payment/reconciliation history are normalized, tenant-safe and immutable where financial.
- [ ] Queries/cache/workers: verify bounded run/item reads, indexed employee/period/status paths, no N+1 calculations, asynchronous exports and correct invalidation after lock/publish/reversal.
- [ ] Frontend/TanStack/tests: verify run-state UI, conflict/retry/partial failure, permission gates, secure downloads and calculation/locking/reconciliation E2E.

#### 10.13 Calendar

- [ ] Frontend/TanStack/tests: verify one `/calendar`, source toggles, timezone display, series-versus-instance edits, cursor/range keys and DST/exception/conflict/reminder E2E.
- [ ] Commit Calendar changes locally first with an atomic provider-sync intent and `pending` state; process create/update/delete asynchronously with idempotent lease, retry/backoff and cancellation, persist per-event monotonic operation/version ordering plus delete tombstones, discard stale jobs/webhooks, reconcile provider drift, expose `synced/failed` plus user retry, and prevent permanent local/external divergence.

#### 10.14 Inbox and mail

- [ ] Queries/cache/workers: verify indexed conversation ordering/search/unread, incremental sync, idempotent send/receive, bounce/retry/DLQ and invalidation of list/thread/count keys.
- [ ] Frontend/TanStack/tests: verify infinite lists, thread hydration, optimistic read/label rollback, compose/send states, offline/reconnect, sanitization and account-revocation E2E.

#### 10.15 Notifications, email and push

- [ ] Give the notification lifecycle mutations an `onError` and a rollback. `frontend/hooks/api/notifications-inbox.ts`

#### 10.16 Knowledge Base, Wiki and Chatbot

- [ ] Architecture/schema: verify spaces, memberships, documents/pages, immutable revisions, attachments, ingestion jobs, chunks/embeddings and deletion/reindex state have tenant-composite integrity.
- [ ] Queries/cache/workers: verify revision/search plans, ingestion leases/retries/DLQ, chunk dedupe, permission-aware cache keys, purge/reindex and realistic-corpus latency.
- [ ] Frontend/TanStack/tests: verify editor/revision conflicts, search cursors, permission changes, citations/source integrity, ingestion states and ACL/purge/reindex E2E.

#### 10.18 Frontend system-wide release

- [ ] TanStack/contracts: verify query-key factories, parsing, invalidation, hydration, cancellation, retry, optimistic concurrency and pagination rules across every module above.
- [ ] UX/accessibility: verify loading/empty/error/offline/permission states, keyboard/screen reader, focus, contrast and responsive 375/768/1280 behavior.
- [ ] Performance/SEO/tests: verify bundle boundaries, lazy loading, rendering/Web Vitals budgets and public metadata without changing landing visuals/animations; run representative browser E2E.
- [ ] Reduce authenticated client route modules below the current 304-page ceiling, never raise that ceiling, and move data/authorization/orchestration to server or feature seams while preserving interactive leaf components; public landing visuals and animations remain untouched.

### 11. Application security and privacy implementation

- [ ] Test session fixation/replay, revoked membership, invitations, password reset, MFA/recovery, brute force and credential stuffing behavior.
- [ ] Test code-level CSRF, XSS, SSRF, SQL injection, unsafe redirect, path traversal, CORS/CSP/headers, payload limits and rate limits.
- [ ] Verify secret/PII redaction, secure cookies/sessions, generic auth failures and signing/encryption-key rotation behavior.
- [ ] Implement correction/rectification rather than treating export, deletion or anonymization as correction.
- [ ] Make subject export exhaustive and resumable with no silent caps or skipped in-scope sources.
- [ ] Implement idempotent tenant-scoped erasure for database, object storage, search/vector, projections, caches and supported adapters while preserving immutable/legal-hold records.
- [ ] Prove retention workers are code-scheduled, bounded/resumable, idempotent, audited, retryable and emit failure events.
- [ ] Prove document, payroll, export, purge and retention workflows never silently skip or truncate growing work.

### 12. Light-speed performance and AI

#### 12.1 Backend, database and cache budgets

- [ ] Publish a benchmark manifest for every module: dataset size, concurrency, warm/cold state, machine/container limits, command, repetitions, p50/p95/p99, error rate and release SHA.
- [ ] Keep application-controlled overhead for ordinary authenticated reads/mutations at p95 ≤ 300 ms and approved complex aggregate/search operations at p95 ≤ 800 ms, excluding internet/provider time.
- [ ] Keep ordinary database statements at p95 ≤ 50 ms and explicitly approved complex statements at p95 ≤ 200 ms on the production-shaped seed; retain plans for every exception.
- [ ] Keep cache-hit application paths at p95 ≤ 100 ms while preserving authorization correctness; a cache miss or Redis outage must degrade safely without a request storm.
- [ ] Prove Home loads sections concurrently and independently, renders available sections without waiting for the slowest one and never starts an unbounded fanout.
- [ ] Prove Chat, Calendar, Inbox and Notifications list, unread/count, range/history and realtime-token paths meet their budgets without table scans, N+1 or per-item cache/database calls.
- [ ] Move compression, previews, malware scanning, exports, ingestion, reminders and other CPU/IO-heavy work off request threads; return a durable job/status contract promptly.
- [ ] Verify connection-pool, worker-concurrency, queue, provider and per-tenant limits apply backpressure instead of exhausting memory, sockets or database connections.
- [ ] Add automated performance-regression gates for declared critical paths; fail on statistically meaningful latency, query-count, buffer, payload or memory regression.

#### 12.2 Next.js, TanStack Query and perceived speed

- [ ] Meet Core Web Vitals targets on production builds for in-scope authenticated routes: LCP ≤ 2.5 s, INP ≤ 200 ms and CLS ≤ 0.1 at the defined reference viewport/device profile.
- [ ] Show navigation, skeleton, optimistic or queued feedback within 100 ms of user intent; never leave an action apparently unresponsive while work runs.
- [ ] Record route-level JavaScript, CSS, server payload, image/font and third-party budgets; lazy-load module editors, charts, calendars, chat media and AI interfaces not required for first render.
- [ ] Eliminate request waterfalls where dependencies are known, prefetch only likely/authorized routes and prevent speculative prefetch from leaking or overloading tenant data.
- [ ] Virtualize or incrementally render large chat, calendar, inbox, notification, directory, HR and Build collections while preserving accessibility and cursor correctness.
- [ ] Optimize images, fonts and eligible static assets, use HTTP compression for text responses and keep upload/media transformations asynchronous.
- [ ] Measure memory, render count, long tasks and hydration mismatches on representative Home/module journeys; eliminate avoidable rerenders and main-thread blocking.

#### 12.3 AI gateway, retrieval and streaming

- [ ] Route every AI feature through one backend AI gateway with small model/provider interfaces, centralized timeouts, usage accounting, policy, redaction and observable error modes; no frontend direct-provider calls.
- [ ] Keep AI out of authentication and authorization decisions; deterministic RBAC and tenant/record ACL checks must finish before retrieval or provider invocation.
- [ ] Reserve token-metered credits atomically before paid calls, settle actual input/output usage in milli-credits and refund only according to the documented failure contract.
- [ ] Bound prompts, history, retrieved chunks, tool iterations, output tokens, concurrency and per-tenant/user rate; reject or summarize oversized context rather than consuming unbounded memory/cost.
- [ ] Stream text/tool progress to the client rather than buffering a complete answer; target application overhead before provider dispatch at p95 ≤ 250 ms and first visible streamed state within 100 ms.
- [ ] Record provider time-to-first-token separately and target end-to-end p95 ≤ 2 s where the selected model/provider supports it; provider-bound exceptions belong in deferred evidence, not hidden in application latency.
- [ ] Propagate client aborts, enforce deadlines and circuit breakers, and retry only replay-safe pre-stream operations; never duplicate a paid request or continue spending after cancellation.
- [ ] Validate structured outputs, preserve citation/source integrity and show a safe partial/error state when the model, retrieval, tool or stream fails.
- [ ] Verify AI frontend states for credit exhaustion, queueing, streaming, cancellation, retry, partial output, citation loading, provider failure and permission revocation without duplicate requests.
- [ ] Emit tenant-safe metrics for queue time, application overhead, provider latency, time-to-first-token, tokens, credits/cost, cache hit, cancellation, retry and failure without logging prompts or sensitive content.

## Immediate code-level final gate

- [ ] Every unchecked item under **Immediate code-level release candidate** is complete with fresh evidence.
- [ ] CRM/Inventory remain excluded and public landing visuals/animations remain unchanged.
- [ ] Backend/frontend builds, typechecks, focused tests, disposable E2E and architecture gates pass at one commit.
- [ ] Two empty bootstraps and an interrupted-then-resumed bootstrap produce the same expected database catalog from the new authorized baseline; no legacy watermark upgrade claim is required.
- [ ] No unresolved code-level P0/P1 finding remains.
- [ ] Release authority records commit, evidence, accepted code-level residual risks and date.

Completing this gate permits the label **code-level 10/10 release candidate** only.

## Deferred production-readiness evidence

These are intentionally postponed until infrastructure, provider access and approvers are available. They are not immediate code-release blockers and cannot be completed from mocks.

### Deployed security, provider and performance

- [ ] Run real payment, realtime, email and push sandbox replay, forgery, outage, suppression, cancellation, retry-exhaustion and recovery scenarios.
- [ ] Verify deployed TLS, encryption at rest, infrastructure secret isolation and credential/key rotation.
- [ ] Verify deployed edge WAF/rate limits, CORS, CSP, headers, request limits and malicious traffic behavior.
- [ ] Produce production-build/reference-device Web Vitals evidence; obtain Product acceptance if frozen landing animation prevents its agreed target.
- [ ] Run realistic load and capture pools, queues, CPU, memory, errors, replica behavior and sustained/burst capacity.
- [ ] Prove declared SLOs with at least 40% capacity headroom.

### Cloud, recovery and operations

- [ ] Provision isolated per-cell database, cache, queue/workers, realtime/provider, search/vector, object storage and monitoring.
- [ ] Prove credentials, routing, jobs, namespaces and data cannot cross cells using [RB-01](runbooks/RB-01-cell-isolation.md) and [RB-08](runbooks/RB-08-cell-resource-accounts.md).
- [ ] Provision a physical replica and prove lag/fallback using [RB-03](runbooks/RB-03-read-replica.md).
- [ ] Configure five-minute-or-better PITR/RPO and run recovery/relocation drills using [RB-02](runbooks/RB-02-pitr-backup.md) and [RB-04](runbooks/RB-04-recovery-drill.md).
- [ ] Measure/approve per-cell and active-tenant cost using [RB-07](runbooks/RB-07-per-cell-cost.md).
- [ ] Configure production logs, traces and release metadata with redaction.
- [ ] Test live alerts and human acknowledgement using [RB-06](runbooks/RB-06-live-alert-delivery.md).
- [ ] Capture passing RB-01â€“RB-08 manifests under [production evidence](final-refactor/evidence/42-production-ops/README.md) with identity, topology, SHA, operator, timestamps, exit code and hashes.
- [ ] Prove rolling compatibility, canary aborts, kill switches, degraded modes and rollback/forward-fix under induced failure.
- [ ] Verify probes, graceful shutdown, draining, worker lease recovery and duplicate/loss safety during deployment/autoscaling.
- [ ] Publish on-call ownership, escalation, incident severity, customer/status communication and post-incident review procedures.
- [ ] Prove backups are encrypted, controlled, restorable and periodically tested with documented key ownership.

### Compliance and approvals

- [ ] Approve operator/break-glass roles, reason, two-person/no-self approval, duration, expiry, tenant scope, notification, immutable audit and revocation.
- [ ] Verify deployed sensitive routes reject expired, revoked, cross-tenant, wrong-scope, concurrent-approval and audit-failure cases.
- [ ] Obtain named Product, Security, Privacy/DPO, Operations, Legal and Finance decisions using [RB-10](runbooks/RB-10-privacy-compliance-decisions.md) and [the decision template](decisions/README.md).
- [ ] Complete [DATA-CATALOGUE.md](DATA-CATALOGUE.md) with purpose, lawful basis, subjects, processors, location, retention, owner and deletion behavior.
- [ ] Decide PII policy for audit metadata, residency/transfers, subprocessors, breach handling, payroll/tax jurisdiction and controller/processor duties.
- [ ] Approve AI/integration providers, regions, PII minimization, retention, deletion and disclosure.
- [ ] Run deployed export, correction, portability, erasure, legal-hold, transfer, cross-tenant and repeat-request drills.
- [ ] Prove deployed object/search/vector/cache/downstream deletion plus backup aging and restore-time deletion.
- [ ] Run retention/legal-hold drills and store a redacted, hashed evidence bundle.
- [ ] Close or formally disposition every production/security/privacy/compliance P0/P1 finding.

## Production-ready final gate

- [ ] Immediate code-level gate remains green at the deployed commit.
- [ ] Every deferred checkbox is complete with current evidence.
- [ ] Production evidence proves isolation, recovery, SLO/headroom, unit cost, live alerts and acknowledgement.
- [ ] Required Product, Security, Privacy/DPO, Operations, Legal and Finance approvals are recorded.
- [ ] No unresolved production/compliance P0/P1 finding remains.
- [ ] Release authority records commit, environment, evidence, accepted residual risks and date.

Only this final gate permits the label **production-proven 10/10**.
