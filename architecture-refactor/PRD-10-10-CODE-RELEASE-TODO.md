# Code-release criterion registry

This compact registry provides stable identifiers for the active module backlog. It is not a task list and contains no status claims. Current work, ownership, dependencies and completion checks live only in [`prd/README.md`](prd/README.md).

Do not infer pending work from this file. A criterion may map to zero, one or several current tasks.

## Criteria

- **PRD-C001** — **Schema/contracts:** complete v2 ticket 02's cross-repository reachability, canonical-key and safe-deletion criteria, then v2 ticket 03's current-head catalog parity evidence.
- **PRD-C002** — **AI:** complete v2 ticket 17's streaming, cancellation, deadline, structured-output, citation, credit and frontend failure-state criteria.
- **PRD-C003** — **Authorization/security:** complete v2 ticket 22's live BOLA/IDOR, valid mutating-body, same-tenant control, abuse-protection and privacy criteria.
- **PRD-C004** — **Organization/RBAC/Settings:** complete v2 ticket 05's organization authority, module permission, owner/descendant protection, cache invalidation, contract and frontend criteria.
- **PRD-C005** — **Query/database cost:** complete v2 ticket 18's bounded projection, N+1, tenant-predicate, index, pagination, cache and invalidation criteria, then retain performance evidence in v2 ticket 29.
- **PRD-C006** — **Frontend speed:** complete v2 ticket 29's production-build Web Vitals, bundle, rendering and interaction budgets while preserving completed lazy-loading, virtualization and hydration gains.
- **PRD-C007** — **TanStack:** complete v2 ticket 19's permissioned-read, required-identifier, query-key, pagination, runtime parsing, cancellation, invalidation and optimistic-update criteria.
- **PRD-C008** — **Calendar/Inbox/Knowledge:** complete v2 tickets 13, 14 and 16 respectively, including provider drift, sync correctness, bounded read paths, ACL-aware retrieval and current performance evidence.
- **PRD-C009** — **UX/accessibility:** complete v2 ticket 20's in-scope responsive, keyboard, screen-reader, loading, empty, error, offline, permission and retry states.
- **PRD-C010** — **Uploads/operator cutover:** complete v2 ticket 21's code lifecycle and v2 ticket 34's deployed private-bucket/backfill evidence before cutover.
- **PRD-C011** — **Gate integrity:** complete v2 ticket 30's bite-proven architecture/release gates and portable verification harness.
- **PRD-C012** — **Repository hygiene/types:** complete the v2 tickets 24â€“27 expandâ€“migrateâ€“contract sequence for unused symbols, dead surface, unsafe assertions, dependency cycles and dependency proof.
- **PRD-C013** — **Handlers:** complete v2 ticket 28's named-handler, thin-entry-point, cohesion and justified file-size-exception criteria without meaningless wrapper chains.
- **PRD-C014** — **Current P0/P1 audit:** resolve or formally disposition Payroll financial-integrity gaps in v2 ticket 08, notification/email permission and delivery gaps in v2 ticket 15, security findings in v2 ticket 22, and every surviving P0/P1 before v2 ticket 31.
- **PRD-C015** — **Release harness:** complete v2 ticket 30 by removing absolute workstation paths and resolving both repositories from the workspace or explicit validated arguments on Windows, macOS and Linux.
- **PRD-C016** — **Final integration:** complete v2 ticket 31 at one clean frontend/backend commit pair, then v2 ticket 36's deployed release-authority record; interrupted, skipped and prerequisite-blocked gates never count as passing.
- **PRD-C017** — **PRD-to-ticket traceability:** complete v2 ticket 01 and keep its manifest fail-closed so every PRD criterion has exactly one ticket owner, ticket-only criteria are rejected and the restored module evidence cannot disappear again.
- **PRD-C018** — Run disposable-database E2E for Organization/RBAC, Home, Settings, HRMS, Payroll, Build, Billing, Payments, Accounting, Chat, Calendar, Notifications, Knowledge, Workflows and Inbox/mail.
- **PRD-C019** — Record each command, release SHA, database identity, dataset shape, pass/fail/skip counts and failure artifacts.
- **PRD-C020** — At the same commit run backend build/typecheck, spec typecheck, frontend typecheck, OpenAPI freshness, cycle, file-size, dead-code, tenant-isolation, RLS, permission, cache, outbox, idempotency, migration, vulnerability, license and SBOM gates.
- **PRD-C021** — Resolve every code-level P0/P1 finding and assign owner/deadline to accepted lower-severity residual risks.
- **PRD-C022** — Prove every active Nest module is registered and every frontend route has one canonical owner; remove obsolete routes rather than preserving hidden duplicates.
- **PRD-C023** — Run fail-closed dead-code analysis over the backend, frontend, shared packages, workers and scripts; require zero unclassified unused files, dependencies, exports and exported types in the in-scope code. CRM/Inventory and generated/vendor artifacts must be reported separately, not silently included or deleted.
- **PRD-C024** — Remove every in-scope compile-time and runtime dependency cycle across backend modules, frontend features, shared packages, barrels and NestJS DI. Replace cycles with correct ownership, dependency inversion or a neutral seam; do not hide them with `forwardRef`, lazy/dynamic imports, re-export indirection, duplicated types or an exception baseline. The cycle gate and a bite-proven self-test must report zero cycles.
- **PRD-C025** — Enable and enforce TypeScript/ESLint unused-symbol checks for imports, locals, parameters and private members. Remove unused symbols instead of renaming them to `_` or suppressing the rule; allow a named `_` parameter only where a framework/interface callback contract requires its position.
- **PRD-C026** — Remove unused imports, variables, parameters, functions, classes, constants, enums, types, interfaces, Zod schemas, DTOs, hooks, query keys, context values, feature flags and re-exports. An exported symbol is not considered used merely because a barrel exports it.
- **PRD-C027** — Remove unreachable branches, obsolete compatibility shims, commented-out implementation, debug logging, stale TODO scaffolding and constants that duplicate an authoritative enum/config/schema. Retain a compatibility path only with a named consumer, removal date and contract test.
- **PRD-C028** — Remove unused files and folders including abandoned routes, controllers, providers, modules, components, hooks, workers, jobs, adapters, tests, fixtures, mocks, scripts, assets and styles after proving that no static, dynamic, reflective, generated, CLI, package-script or side-effect entry point reaches them.
- **PRD-C029** — Remove unused runtime and development dependencies, package scripts, environment variables, configuration keys, feature flags and asset references; update lockfiles, deployment manifests, validation schemas and documentation in the same change.
- **PRD-C030** — Eliminate unsafe forced typing: no `as any`, `as unknown as T`, unjustified non-null assertions, `@ts-ignore`, `@ts-nocheck`, error-suppressing casts or broad index signatures used to bypass a contract. Narrow `unknown` with Zod, discriminated unions, exhaustive guards or a tested adapter; use `satisfies` where only conformance is needed.
- **PRD-C031** — Permit a type assertion only at a proven external/framework seam where TypeScript cannot express an already runtime-validated invariant. Each exception must be local, narrow, documented with the invariant and covered by a negative/runtime contract test; maintain a zero-growth, named exception ledger.
- **PRD-C032** — Replace duplicated or weakly owned constants with the canonical domain-owned schema/catalog only when at least two real callers share the invariant; do not create generic dumping-ground helpers or speculative seams. Apply the deletion test to pass-through wrappers and retain modules that provide real depth, policy or adaptation.
- **PRD-C033** — Reduce public interfaces and barrel surfaces to verified consumers. Internal implementation details stay private to their module; deep imports across module ownership are removed or replaced by the smallest stable interface at the correct seam.
- **PRD-C034** — Prove every deletion with import/dependency graph results plus checks for Nest metadata/DI, Next.js file conventions and dynamic imports, raw SQL/table names, migrations, reflection, queues/events, cron registration, package scripts and side-effect imports. Text search or a successful editor rename alone is insufficient evidence.
- **PRD-C035** — After each cleanup batch, run focused behavior tests and the affected package typecheck/build; at final integration run both dead-code gates and their self-tests so a broken or under-scanning analyzer cannot report a false green result.
- **PRD-C036** — Record before/after counts for unused files, exports/types, dependencies, suppressions, unsafe assertions and exceptions. Final acceptance is zero unclassified findings, zero unexplained suppressions and no increase in an approved framework/generated exception baseline.
- **PRD-C037** — Confirm the cleanup does not remove authorization, validation, cache invalidation, outbox/worker registration, observability, accessibility, SEO metadata or error/offline states merely because those paths are uncommon in local development.
- **PRD-C038** — Enforce a repository-wide default maximum of 500 physical lines for authored production, frontend, backend, shared-package, worker, script and test files (`.ts`, `.tsx`, `.js` and `.mjs`). The gate must scan every applicable workspace with a vacuity floor and fail when a new unregistered file exceeds the limit; CRM/Inventory are reported separately and landing visuals are unchanged.
- **PRD-C039** — Treat 300 lines as a review/refactoring target, not a reason for mechanical fragmentation. Split files by cohesive responsibility and domain ownership when doing so reduces the interface or separates independently changing behavior; never split into numbered fragments, pass-through wrappers, re-export shells or mutually dependent files merely to satisfy a counter.
- **PRD-C040** — Permit a file above 500 lines only for a generated/vendor artifact, declaration, immutable migration, cohesive declarative catalog or an implementation whose documented split alternatives would reduce locality or introduce a cycle. Each exception records exact path and measured lines, category, owner, public interface, concrete cohesion argument, alternatives considered, review date and removal trigger; directory-wide and wildcard exceptions are prohibited.
- **PRD-C041** — Make the exception registry fail closed: missing/stale paths, line counts, owners, interfaces, reasons or review dates fail; any file that falls to 500 lines or below automatically loses its exception. Generated/vendor/migration exclusions must be path-classified and must never exempt ordinary authored implementation transitively.
- **PRD-C042** — Review functions, classes, React components, hooks, forms, controllers and workers inside an allowed large file for mixed responsibilities, hidden state, duplicated validation/query logic and excessive public surface. A file-size exception does not exempt dead-code, cycle, authorization, query-cost, contract, testing or readability requirements.
- **PRD-C043** — Run the hard-size gate and bite-proven self-test for backend and frontend at the final commit, publish all over-300 and over-500 inventories, require zero unexplained violations and prove each extraction preserves behavior, import direction, DI registration, route ownership, caching and authorization.
- **PRD-C044** — Use named, typed handler functions for non-trivial UI events and form actions instead of embedding business logic, multi-step mutations or long anonymous closures in JSX. Names express the user intent (`handleSubmit`, `handleMemberRemove`, `handleRetrySync`), and handlers delegate validation/state-independent rules to domain-owned functions.
- **PRD-C045** — Keep NestJS controller handlers, queue/event consumers, cron entry points and server actions thin: validate and authorize at the correct seam, construct the command/query context, invoke one cohesive implementation and map its typed result/error. Do not duplicate business rules, database orchestration or response shaping across handlers.
- **PRD-C046** — Use named event handlers only; JSX event props must not contain inline arrow/function expressions. Do not create meaningless handler-to-handler chains: the named handler performs event orchestration and delegates reusable rules to explicitly named domain functions. Use `useCallback` only when referential identity affects memoization, subscription or effect correctness, and verify every dependency.
- **PRD-C047** — Prove strict TypeScript with no new `any`, suppression directives, unsafe double casts, non-null assertion abuse or parallel hand-written types that drift from schemas.
- **PRD-C048** — Validate every untrusted body, parameter, query, environment value, upload manifest and external response through established Zod boundaries.
- **PRD-C049** — Reconcile backend Zod/OpenAPI contracts with frontend request/response types, hooks, forms and rendered error states.
- **PRD-C050** — Audit primary-key strategy, tenant-scoped uniqueness, FK indexes, named constraints, referential actions, checks, money units, timestamps and audit columns.
- **PRD-C051** — Verify normalized lifecycle and relationship tables; remove actionable JSON arrays/polymorphic authority relationships and avoid EAV unless an approved custom-field seam requires it.
- **PRD-C052** — Verify soft-delete/archive policy and every active read's deleted/archived predicate; use partial indexes where the access pattern requires them.
- **PRD-C053** — Reconcile Drizzle declarations, migration snapshots and the live catalog so each tenant relationship has one canonical composite constraint; remove redundant single-column constraints only after dependency proof, cold bootstrap and current-catalog parity. Upgraded-catalog compatibility is required only if migration decision 9 changes, because this release explicitly authorizes database recreation.
- **PRD-C054** — Remove obsolete schema only with symbol, raw table-name, FK, migration, barrel and integrity-spec evidence.
- **PRD-C055** — Compare two independent clean bootstraps and an interrupted-then-resumed bootstrap at the same release commit: tables, columns, constraints, indexes, policies, functions, triggers, extensions, enums and RLS state must match exactly.
- **PRD-C056** — Retain release SHA, commands, database identity, journal hash/count, catalog diff, sanitized logs and artifact hashes for the current-head bootstrap and migration evidence.
- **PRD-C057** — Inventory and classify in-scope database columns, primary/foreign/unique/check constraints, indexes and JSONB keys plus executable code registries for routes, permissions, modules, events, commands, query/cache keys, configuration, environment variables, feature flags and translations. Every entry is KEEP, REFACTOR or REMOVE with its owner and concrete failure prevented.
- **PRD-C058** — Remove unused database columns and JSONB properties only after proving zero reads/writes through Drizzle, raw SQL, migrations, exports, search/vector ingestion, audit/retention jobs, analytics and external contracts. Frequently filtered, joined, authorized or constrained JSONB properties must be normalized or indexed rather than silently retained as opaque payload.
- **PRD-C059** — Detect redundant or overlapping foreign keys, unique constraints, checks and indexes using schema declarations, `pg_catalog`, representative `EXPLAIN (ANALYZE, BUFFERS)` plans and workload/index statistics. Statistics alone never justify deletion; preserve every constraint/index required for tenant isolation, referential integrity, concurrency, ordering or a documented access pattern.
- **PRD-C060** — Require each tenant-owned relationship to use the canonical composite organization-scoped key and supporting index. Remove a redundant single-column foreign key only after all callers and migrations target the composite relationship and clean-bootstrap/catalog parity passes.
- **PRD-C061** — Remove dead or duplicate code keys and aliases from permission catalogs, route/operation registries, module manifests, event/command catalogs, TanStack factories, cache namespaces, configuration schemas, feature flags and translation catalogs only after static and runtime registration/caller proof. Unknown dynamic string keys are rejected at their seam rather than preserved indefinitely.
- **PRD-C062** — Keep one typed, domain-owned factory/catalog for each surviving key family; prohibit ad-hoc string literals, parallel aliases and generic global dumping grounds. Tenant, subject, scope, filters, sort, cursor, version and permission dimensions remain in query/cache keys wherever correctness requires them.
- **PRD-C063** — Remove unused request/response/DTO/Zod fields and object properties across backend, OpenAPI, frontend hooks/forms and persisted events as one contract change. Never remove server-controlled tenant/actor fields, idempotency/version fields, authorization dimensions, audit fields or compatibility fields with a published consumer without an explicit migration/deprecation path.
- **PRD-C064** — After every key/schema cleanup, regenerate affected artifacts and prove migration chain/ledger, two clean bootstraps, catalog parity, tenant relationships/indexes/RLS, query plans, OpenAPI/contract compatibility, cache invalidation and focused behavior tests. Final acceptance is zero unclassified unnecessary keys and no orphaned schema/code reference.
- **PRD-C065** — Prove explicit projections, tenant-leading/access-pattern indexes and no required full tenant/table scan or avoidable sort.
- **PRD-C066** — Exercise reminder, export, fanout, unread, free/busy, recurrence, search/vector and dashboard queries against seeded data.
- **PRD-C067** — Verify cache keys include tenant, subject, permission and resource dimensions where applicable.
- **PRD-C068** — Prove mutation/revocation invalidation, TTL/negative-cache policy, stampede protection and Redis degradation never leak data or preserve revoked access.
- **PRD-C069** — Record a maximum database-call count for every critical route and worker batch; fail regression tests when an implementation adds unexpected calls.
- **PRD-C070** — Execute tenant-owned request work inside the minimum correct tenant transaction and reuse its handle; never open nested/per-row transactions or borrow a committed request transaction.
- **PRD-C071** — Select named columns only and return minimal DTO projections; never hydrate full ORM rows, global users or large JSON/blob/vector fields for list/count/existence paths.
- **PRD-C072** — Batch relationship, permission, unread, attachment, assignee and metadata lookups with joins, CTEs or bounded multi-key queries; forbid database/cache calls inside growing loops.
- **PRD-C073** — Implement existence/authorization probes with tenant-correlated indexed predicates and `LIMIT 1`; do not fetch records or counts when only existence is required.
- **PRD-C074** — Make exact totals opt-in and independently budgeted; cursor pages must not run an expensive `COUNT(*)` automatically on every request.
- **PRD-C075** — Use bounded bulk insert/update/upsert operations and conflict-safe unique keys instead of one write per row; keep transactional batches below documented lock/payload limits.
- **PRD-C076** — Verify concurrent counters, unread state, seats, balances, ordering and idempotency use atomic SQL/upsert/locking semantics without read-then-write races.
- **PRD-C077** — Apply statement/query timeouts and cancellation propagation to interactive work; move reports, exports, reindexing and wide aggregates to resumable jobs.
- **PRD-C078** — Measure connection acquisition, transaction duration and idle-in-transaction behavior; release connections before external provider calls or long CPU work.
- **PRD-C079** — Benchmark under the application role with tenant context and RLS, never only as the database owner; plans must include real authorization predicates.
- **PRD-C080** — Capture slow-query fingerprints, call counts, rows read/returned, buffers and lock waits in test evidence without logging sensitive bind values.
- **PRD-C081** — Run BOLA/IDOR tests for reads, writes, bulk actions, files, exports, search/vector, realtime, jobs and public/share-token paths; cross-tenant misses return 404.
- **PRD-C082** — Verify every privileged operation applies module, permission, tenant, record and DataScope checks at the correct seam.
- **PRD-C083** — Verify writes are transactional, idempotent and safe under concurrent retry; side effects use after-commit/outbox behavior and never a dead request transaction.
- **PRD-C084** — Verify minimal response projections, serialization/redaction, generic errors, resource limits and stable HTTP semantics.
- **PRD-C085** — Define route budgets for database calls, downstream calls, application latency, response bytes and memory; record p50/p95/p99 at the release commit.
- **PRD-C086** — Design routes around one user intent rather than forcing avoidable request waterfalls, while keeping unrelated domain implementation out of oversized mega-responses.
- **PRD-C087** — Keep Home aggregation bounded and parallel with independent section results; one slow source must not delay or fail every section.
- **PRD-C088** — Return explicit DTO projections and omit unused nested relations, internal columns, secrets and repeated denormalized payloads.
- **PRD-C089** — Enable Brotli/gzip for eligible JSON/text/OpenAPI/static responses with minimum-size and already-compressed-content exclusions; never compress secrets in a cross-origin reflection context.
- **PRD-C090** — Stream AI responses, downloads and large exports or return durable asynchronous jobs; do not buffer growing payloads in NestJS or Next.js memory.
- **PRD-C091** — Propagate cancellation and deadlines through NestJS, database, cache and provider adapters; enforce upstream timeouts, concurrency limits and backpressure.
- **PRD-C092** — Require idempotency and optimistic concurrency/version checks for replayable or conflict-prone mutations; return stable 409/412 semantics.
- **PRD-C093** — Avoid serial downstream/provider calls when independent, cap parallel fanout and use batch adapters where providers support them.
- **PRD-C094** — Verify frontend route loaders and TanStack consumers reuse/prefetch the canonical request instead of issuing duplicate server/client fetches.
- **PRD-C095** — Verify one hierarchical query-key factory per domain includes organization, subject, scope, filters, sort and cursor dimensions as applicable.
- **PRD-C096** — Gate queries with effective access and required identifiers; disabled queries must not send unauthorized or malformed requests.
- **PRD-C097** — Verify mutations invalidate or update every affected list/detail/count/dashboard key and roll back optimistic state safely on failure.
- **PRD-C098** — Use optimistic updates only where concurrency semantics are defined; otherwise await the backend result and invalidate deterministically.
- **PRD-C099** — Verify cursor pagination does not duplicate/skip records and changing filter/sort resets pagination correctly.
- **PRD-C100** — Verify loading, background-refresh, empty, partial-error, full-error, offline, permission-denied and revoked-access states.
- **PRD-C101** — Prove frontend types and runtime parsing cannot silently accept a backend contract change.
- **PRD-C102** — Emit structured, redacted and tenant-safe logs, metrics and distributed trace context across HTTP requests, database/cache/provider adapters, outbox publication, queue/event consumers, cron jobs and AI streams. Correlate one user intent through asynchronous work without logging secrets, tokens, prompts, file contents or sensitive bind values; classify expected domain failures separately from actionable faults.
- **PRD-C103** — Enforce one tenant-private upload interface for attachments and documents: validate declared size and magic-byte MIME, sanitize names, use organization-scoped object keys, idempotent multipart completion, malware quarantine, authorization recheck before short-lived download URLs and asynchronous compression/preview/transcoding with bounded jobs. Cancellation, failed transforms, replacement and GDPR/retention deletion must clean database rows and objects without orphaning or exposing public URLs.
- **PRD-C104** — Make every architecture/release gate bite-proven with a known-bad fixture or mutation that fails for the intended reason. Critical tests must exercise transaction callbacks, authorization deny/cross-tenant paths, retries and failure branches; zero silently skipped/quarantined tests, vacuous mocks, swallowed promise failures or baselines raised merely to turn a regression green.
- **PRD-C105** — Inventory its backend module folders, controllers, implementations, DTO/Zod schemas, database schema files, migrations, workers, cache keys, event consumers, frontend routes, components, hooks, TanStack keys, tests, fixtures and operational scripts.
- **PRD-C106** — Verify every folder/file has one canonical domain owner, kebab-case naming, correct import direction and no parallel legacy/duplicate location.
- **PRD-C107** — Classify every inventoried file as KEEP, REFACTOR or REMOVE; name the concrete failure prevented for each REFACTOR/REMOVE verdict.
- **PRD-C108** — Verify each file has one cohesive responsibility, stays within size policy or a documented exception, exposes the smallest useful interface and contains no pass-through/dead/commented/debug implementation.
- **PRD-C109** — Prove removals and moves with dependency-graph, dynamic/side-effect import, route registration, raw table-name/FK, build/typecheck and relevant migration-integrity evidence.
- **PRD-C110** — Record the final module folder tree and public interfaces so future work cannot recreate retired paths, duplicated schemas, hooks, query keys or endpoints.
- **PRD-C111** — Queries/cache: verify bounded membership/session reads, required indexes and immediate invalidation of session, effective-access and organization caches.
- **PRD-C112** — Frontend/TanStack/tests: verify workspace/onboarding gates, organization switch state, query-key tenant isolation, auth error states and allow/deny/cross-tenant E2E.
- **PRD-C113** — Routes/contracts: verify role/grant/module-access CRUD has strict Zod contracts, stable OpenAPI, idempotent mutations and exhaustive owner/descendant protections.
- **PRD-C114** — Queries/performance: verify effective-permission resolution is batched/cached, scope expansion is bounded and indexes cover subject, role, permission, module and tenant access paths.
- **PRD-C115** — Reconstruct current-head Home evidence across folder ownership, universal-versus-module composition, section-level authorization/privacy, bounded parallel queries, independent loading/error states, cache/query keys, responsive accessibility and representative E2E; classify every Home file KEEP, REFACTOR or REMOVE without changing public landing-page visuals or animations.
- **PRD-C116** — Architecture/schema: prove global settings contain organization configuration/access governance only while operational and module-owned settings remain with their modules.
- **PRD-C117** — Queries/cache: verify bounded settings reads, tenant-leading indexes and invalidation of organization, hierarchy, access, navigation and entitlement caches.
- **PRD-C118** — Reconstruct current-head Directory/Me evidence across canonical ownership, self-versus-administrative authorization, tenant-scoped schema and indexes, bounded search/list projections, privacy-safe caching, TanStack keys, responsive accessibility and allow/deny/cross-tenant E2E.
- **PRD-C119** — Reconstruct current-head HRMS evidence across employee lifecycle schema, tenant-composite integrity, module/record/DataScope authorization, bounded indexed queries, async imports/exports, cache invalidation, frontend states, folder cohesion and representative HR workflows.
- **PRD-C120** — Architecture/schema: verify payroll runs, components, assignments, calculations, payslips, taxes, deductions and payment/reconciliation history are normalized, tenant-safe and immutable where financial.
- **PRD-C121** — Queries/cache/workers: verify bounded run/item reads, indexed employee/period/status paths, no N+1 calculations, asynchronous exports and correct invalidation after lock/publish/reversal.
- **PRD-C122** — Frontend/TanStack/tests: verify run-state UI, conflict/retry/partial failure, permission gates, secure downloads and calculation/locking/reconciliation E2E.
- **PRD-C123** — Reconstruct current-head Build/PM evidence across workspace/project/ticket schema, tenant and record authorization, bounded boards/backlogs/search, cursor and cache contracts, async/realtime workflows, frontend states, folder cohesion and representative E2E.
- **PRD-C124** — Reconstruct current-head Workflow evidence across definition/version/execution schema, permission rung, bounded execution history, idempotent queue/outbox processing, retry/DLQ/cancellation, secrets/redaction, frontend states and representative E2E.
- **PRD-C125** — Reconstruct current-head Billing/Payments evidence across plans, subscriptions, entitlements, seats, proration, usage, immutable invoices, tax/currency, idempotent provider events, replay-safe webhooks, cached feature gates, authorization, frontend states and sandbox failure tests.
- **PRD-C126** — Reconstruct current-head Accounting/Finance evidence across immutable tenant-safe ledgers, normalized expenses and reconciliation, bounded indexed reads, queue-backed exports/reminders, idempotent consumers, retention, authorization, frontend states and production-shaped workflow tests.
- **PRD-C127** — Reconstruct current-head Chat evidence across channel/thread/member/message/reaction/attachment schema, tenant-composite integrity, channel and mutation authorization, scalable ordering/fanout/unread state, bounded history/search, cache/realtime invalidation, offline UI and representative E2E.
- **PRD-C128** — Frontend/TanStack/tests: verify one `/calendar`, source toggles, timezone display, series-versus-instance edits, cursor/range keys and DST/exception/conflict/reminder E2E.
- **PRD-C129** — Commit Calendar changes locally first with an atomic provider-sync intent and `pending` state; process create/update/delete asynchronously with idempotent lease, retry/backoff and cancellation, persist per-event monotonic operation/version ordering plus delete tombstones, discard stale jobs/webhooks, reconcile provider drift, expose `synced/failed` plus user retry, and prevent permanent local/external divergence.
- **PRD-C130** — Queries/cache/workers: verify indexed conversation ordering/search/unread, incremental sync, idempotent send/receive, bounce/retry/DLQ and invalidation of list/thread/count keys.
- **PRD-C131** — Frontend/TanStack/tests: verify infinite lists, thread hydration, optimistic read/label rollback, compose/send states, offline/reconnect, sanitization and account-revocation E2E.
- **PRD-C132** — Re-verify provider-response schemas, tenant-fair delivery/backpressure, consent and suppression enforcement, durable retry/DLQ behavior, offline/revocation UI and cross-tenant notification delivery E2E at the release commit.
- **PRD-C133** — Architecture/schema: verify spaces, memberships, documents/pages, immutable revisions, attachments, ingestion jobs, chunks/embeddings and deletion/reindex state have tenant-composite integrity.
- **PRD-C134** — Queries/cache/workers: verify revision/search plans, ingestion leases/retries/DLQ, chunk dedupe, permission-aware cache keys, purge/reindex and realistic-corpus latency.
- **PRD-C135** — Frontend/TanStack/tests: verify editor/revision conflicts, search cursors, permission changes, citations/source integrity, ingestion states and ACL/purge/reindex E2E.
- **PRD-C136** — Reconstruct current-head shared-adapter evidence across tenant-safe interfaces, bounded retries/timeouts/circuit breakers, idempotency, backpressure, schema-validated provider responses, cache/credential isolation, observability, failure-mode tests and removal of duplicate provider-specific policy from product modules.
- **PRD-C137** — TanStack/contracts: verify query-key factories, parsing, invalidation, hydration, cancellation, retry, optimistic concurrency and pagination rules across every module above.
- **PRD-C138** — UX/accessibility: verify loading/empty/error/offline/permission states, keyboard/screen reader, focus, contrast and responsive 375/768/1280 behavior.
- **PRD-C139** — Performance/SEO/tests: verify bundle boundaries, lazy loading, rendering/Web Vitals budgets and public metadata without changing landing visuals/animations; run representative browser E2E.
- **PRD-C140** — Publish a benchmark manifest for every module: dataset size, concurrency, warm/cold state, machine/container limits, command, repetitions, p50/p95/p99, error rate and release SHA.
- **PRD-C141** — Keep application-controlled overhead for ordinary authenticated reads/mutations at p95 â‰¤ 300 ms and approved complex aggregate/search operations at p95 â‰¤ 800 ms, excluding internet/provider time.
- **PRD-C142** — Keep ordinary database statements at p95 â‰¤ 50 ms and explicitly approved complex statements at p95 â‰¤ 200 ms on the production-shaped seed; retain plans for every exception.
- **PRD-C143** — Keep cache-hit application paths at p95 â‰¤ 100 ms while preserving authorization correctness; a cache miss or Redis outage must degrade safely without a request storm.
- **PRD-C144** — Prove Home loads sections concurrently and independently, renders available sections without waiting for the slowest one and never starts an unbounded fanout.
- **PRD-C145** — Prove Chat, Calendar, Inbox and Notifications list, unread/count, range/history and realtime-token paths meet their budgets without table scans, N+1 or per-item cache/database calls.
- **PRD-C146** — Move compression, previews, malware scanning, exports, ingestion, reminders and other CPU/IO-heavy work off request threads; return a durable job/status contract promptly.
- **PRD-C147** — Verify connection-pool, worker-concurrency, queue, provider and per-tenant limits apply backpressure instead of exhausting memory, sockets or database connections.
- **PRD-C148** — Add automated performance-regression gates for declared critical paths; fail on statistically meaningful latency, query-count, buffer, payload or memory regression.
- **PRD-C149** — Meet Core Web Vitals targets on production builds for in-scope authenticated routes: LCP â‰¤ 2.5 s, INP â‰¤ 200 ms and CLS â‰¤ 0.1 at the defined reference viewport/device profile.
- **PRD-C150** — Show navigation, skeleton, optimistic or queued feedback within 100 ms of user intent; never leave an action apparently unresponsive while work runs.
- **PRD-C151** — Record route-level JavaScript, CSS, server payload, image/font and third-party budgets; lazy-load module editors, charts, calendars, chat media and AI interfaces not required for first render.
- **PRD-C152** — Stream text/tool progress to the client rather than buffering a complete answer; target application overhead before provider dispatch at p95 â‰¤ 250 ms and first visible streamed state within 100 ms.
- **PRD-C153** — Propagate client aborts, enforce deadlines and circuit breakers, and retry only replay-safe pre-stream operations; never duplicate a paid request or continue spending after cancellation.
- **PRD-C154** — Validate structured outputs, preserve citation/source integrity and show a safe partial/error state when the model, retrieval, tool or stream fails.
- **PRD-C155** — Verify AI frontend states for credit exhaustion, queueing, streaming, cancellation, retry, partial output, citation loading, provider failure and permission revocation without duplicate requests.
- **PRD-C156** — Every unchecked item under **Immediate code-level release candidate** is complete with fresh evidence.
- **PRD-C157** — CRM/Inventory remain excluded and public landing visuals/animations remain unchanged.
- **PRD-C158** — Backend/frontend builds, typechecks, focused tests, disposable E2E and architecture gates pass at one commit.
- **PRD-C159** — Two empty bootstraps and an interrupted-then-resumed bootstrap produce the same expected database catalog from the new authorized baseline; no legacy watermark upgrade claim is required.
- **PRD-C160** — No unresolved code-level P0/P1 finding remains.
- **PRD-C161** — Release authority records commit, evidence, accepted code-level residual risks and date.
- **PRD-C162** — Run real payment, realtime, email and push sandbox replay, forgery, outage, suppression, cancellation, retry-exhaustion and recovery scenarios.
- **PRD-C163** — Verify deployed TLS, encryption at rest, infrastructure secret isolation and credential/key rotation.
- **PRD-C164** — Verify deployed edge WAF/rate limits, CORS, CSP, headers, request limits and malicious traffic behavior.
- **PRD-C165** — Produce production-build/reference-device Web Vitals evidence; obtain Product acceptance if frozen landing animation prevents its agreed target.
- **PRD-C166** — Run realistic load and capture pools, queues, CPU, memory, errors, replica behavior and sustained/burst capacity.
- **PRD-C167** — Prove declared SLOs with at least 40% capacity headroom.
- **PRD-C168** — Provision isolated per-cell database, cache, queue/workers, realtime/provider, search/vector, object storage and monitoring.
- **PRD-C169** — Prove credentials, routing, jobs, namespaces and data cannot cross cells using [RB-01](runbooks/RB-01-cell-isolation.md) and [RB-08](runbooks/RB-08-cell-resource-accounts.md).
- **PRD-C170** — Provision a physical replica and prove lag/fallback using [RB-03](runbooks/RB-03-read-replica.md).
- **PRD-C171** — Configure five-minute-or-better PITR/RPO and run recovery/relocation drills using [RB-02](runbooks/RB-02-pitr-backup.md) and [RB-04](runbooks/RB-04-recovery-drill.md).
- **PRD-C172** — Measure/approve per-cell and active-tenant cost using [RB-07](runbooks/RB-07-per-cell-cost.md).
- **PRD-C173** — Configure production logs, traces and release metadata with redaction.
- **PRD-C174** — Test live alerts and human acknowledgement using [RB-06](runbooks/RB-06-live-alert-delivery.md).
- **PRD-C175** — Capture passing RB-01-RB-08 manifests under [production evidence](final-refactor/evidence/42-production-ops/README.md) with identity, topology, SHA, operator, timestamps, exit code and hashes.
- **PRD-C176** — Prove rolling compatibility, canary aborts, kill switches, degraded modes and rollback/forward-fix under induced failure.
- **PRD-C177** — Verify probes, graceful shutdown, draining, worker lease recovery and duplicate/loss safety during deployment/autoscaling.
- **PRD-C178** — Publish on-call ownership, escalation, incident severity, customer/status communication and post-incident review procedures.
- **PRD-C179** — Prove backups are encrypted, controlled, restorable and periodically tested with documented key ownership.
- **PRD-C180** — Approve operator/break-glass roles, reason, two-person/no-self approval, duration, expiry, tenant scope, notification, immutable audit and revocation.
- **PRD-C181** — Verify deployed sensitive routes reject expired, revoked, cross-tenant, wrong-scope, concurrent-approval and audit-failure cases.
- **PRD-C182** — Obtain named Product, Security, Privacy/DPO, Operations, Legal and Finance decisions using [RB-10](runbooks/RB-10-privacy-compliance-decisions.md) and [the decision template](decisions/README.md).
- **PRD-C183** — Complete [DATA-CATALOGUE.md](DATA-CATALOGUE.md) with purpose, lawful basis, subjects, processors, location, retention, owner and deletion behavior.
- **PRD-C184** — Decide PII policy for audit metadata, residency/transfers, subprocessors, breach handling, payroll/tax jurisdiction and controller/processor duties.
- **PRD-C185** — Approve AI/integration providers, regions, PII minimization, retention, deletion and disclosure.
- **PRD-C186** — Run deployed export, correction, portability, erasure, legal-hold, transfer, cross-tenant and repeat-request drills.
- **PRD-C187** — Prove deployed object/search/vector/cache/downstream deletion plus backup aging and restore-time deletion.
- **PRD-C188** — Run retention/legal-hold drills and store a redacted, hashed evidence bundle.
- **PRD-C189** — Close or formally disposition every production/security/privacy/compliance P0/P1 finding.
- **PRD-C190** — Immediate code-level gate remains green at the deployed commit.
- **PRD-C191** — Every deferred checkbox is complete with current evidence.
- **PRD-C192** — Production evidence proves isolation, recovery, SLO/headroom, unit cost, live alerts and acknowledgement.
- **PRD-C193** — Required Product, Security, Privacy/DPO, Operations, Legal and Finance approvals are recorded.
- **PRD-C194** — No unresolved production/compliance P0/P1 finding remains.
- **PRD-C195** — Release authority records commit, environment, evidence, accepted residual risks and date.

---

## Post-certification delta checklist

Post-certification work is added only as one of four change classes: REGRESSION, NEW REQUIREMENT, NEWLY DISCOVERED RISK, PRODUCTION EVIDENCE. Each entry names the affected commit, reproduction/evidence, severity, owner and the concrete failure prevented. Do not create new PRD-C identifiers; the highest is PRD-C195 and the registry does not renumber.

---

### NEWLY DISCOVERED RISK — 2026-09-10

**Affected commit:** `db887baad` (baseline before AuthContext refactor)

**Finding:** `AccessPermissionResolver.getMembershipAccessState` (`modules/access/access-permission.resolver.ts:356-383`) queries `organizationMembers` alone and treats `status === "ACTIVE"` as active. It never checks `users.isActive`, `users.deletedAt`, or organization lifecycle — unlike `MembershipStateService.resolve` (`common/auth/membership-state.service.ts:81-139`), which joins all three.

In-request paths are covered: `JwtAuthGuard` checks liveness before the permission resolver is reached, so only background callers that never pass a guard are exposed. Two such callers exist:

- `HrExportWorkerService` (`modules/hr/import/hr-export-jobs.service.ts:224-233`) — `setInterval` poll; builds a hand-built `CurrentUserContext` from `organizationMembers` data without checking `users.isActive` or `users.deletedAt`.
- `workflow-runner.service.ts:264` — reached from a `@Public()` cron controller (`WorkflowsCronController`) that authenticates by cron secret only; calls `resolveUserPermissions` for a stored `triggeredBy` user without a prior liveness check.

**Concrete failure prevented:** A deactivated or deleted user's queued export or scheduled workflow continues to resolve permissions as if the account were live, allowing the job to complete and return data it should no longer be able to access.

**Severity:** P2 — authorization gap in background workers only; all in-request paths are protected by `JwtAuthGuard`.

**Owner:** active release backlog (`architecture-refactor/prd/README.md`). Needs its own audit; not folded into the completed AuthContext change.

**Accountable criterion: PRD-C082** — "Verify every privileged operation applies module, permission, tenant, record and DataScope checks at the correct seam." The gap is that background-worker permission resolution omits the user-liveness seam that `MembershipStateService.resolve` provides and that `JwtAuthGuard` enforces for in-request paths.
