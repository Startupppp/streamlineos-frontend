# StreamlineOS final 10/10 completion PRD

Status: active â€” single authoritative backlog
Last reconciled: 2026-09-01
Immediate target: code-level release candidate
Deferred target: deployed production and compliance evidence
Scope: all platform domains except CRM and Inventory

This is the only architecture/refactor TODO list. Do not create session tickets, duplicate PRDs or additional architecture scorecards. Update a checkbox only from current source and reproducible evidence at one recorded commit. Git history is the archive.

## Release model

The immediate target is **code-level 10/10**: no known code-level P0/P1 defect and every immediate criterion below passes at one commit. It covers schema, migrations, database queries, NestJS, Zod, OpenAPI, RBAC, caching, workers, uploads, Next.js, TanStack Query, UI states, accessibility and cross-layer contracts.

It does not claim cloud isolation, physical replicas, PITR, regional recovery, live monitoring, real-provider availability, legal compliance or human approval. Those are retained under **Deferred production-readiness evidence** and scored separately.

â€œBug freeâ€ cannot be guaranteed. The release standard is zero known P0/P1 defects, passing reproducible gates and explicitly owned residual risks.

Current reconciliation count:

- Verified completed invariants: **15**.
- Immediate code-level criteria still open: **273**.
- Deferred production/compliance criteria still open: **34**.
- The 273 immediate criteria are acceptance checks, not 273 confirmed defects; fresh execution may close a criterion without a code change when its implementation already passes.

## Product constraints

- Do not change public landing-page visuals or animations.
- CRM and Inventory code, migrations and acceptance evidence are excluded.
- Home is the universal shell and composition module. Chat, Calendar, Inbox and Notifications appear through Home but retain independent schema, authorization, caching, workers and implementation behind small interfaces.
- Preserve [PRD-IN-SCOPE.md](PRD-IN-SCOPE.md) unless a concrete scale, correctness, security or operability failure requires change.
- Never solve growing work with silent truncation. Use keyset pagination, resumable batches, streams or queues.
- Every tenant relationship, query, cache key, event, object key and search ACL preserves organization scope.
- Never delete code or schema from text search alone. Require dependency evidence plus build/typecheck and migration-integrity proof.
- Do not recreate `luna-10-10-sessions` or split this backlog.

## Verified complete â€” preserve and re-run at final head

- [x] Organization/module RBAC architecture: owner/admin/member standing, custom permissions, DataScope, owner protection, module access, tenant isolation and revocation primitives.
- [x] Legacy actor contraction: 434 organizational fields scanned; 318 display-only; 116 CRM/Inventory excluded; 0 actionable.
- [x] Invitation tenant-composite membership constraints, Calendar attendee normalization and Chat durable token revocation/retry behavior.
- [x] Membership-FK removal-policy, owner-authority, permission-catalog, record-access, module-gate and tenant-index gates.
- [x] Cursor migration and bounded-read implementation: 0 actionable offsets, unbounded reads, unordered paging or unclassified paths across 2,107 service files.
- [x] Migration ledger baseline: 585/585 applied; zero pending, orphan, duplicate or unreachable entries; structural gates pass locally.
- [x] Backend production and spec-inclusive typechecks pass at the recorded audit workspace.
- [x] Frontend typecheck passes at the recorded audit workspace.
- [x] Backend and frontend import graphs have no circular dependencies.
- [x] Backend hard file-size gate passes: 3,392 files with 12 documented exceptions.
- [x] Frontend capability gate reports zero DEAD, WIRE or UNCLASSIFIED entries; deferred capabilities have owners and a review date.
- [x] OpenAPI structural baseline: 3,583/3,583 operations and 1,363/1,363 mutating bodies covered.
- [x] Cache invalidation, outbox-consumer, idempotency, feature-flag, mock-surface, route-classification and navigation gates exist and passed at the audit workspace.
- [x] Billing provider abstraction, webhook idempotency, entitlements, seat/proration ledgers, immutable invoices and transactional outbox exist.
- [x] Core module seams exist for Home, Settings, HRMS, Payroll, Build, Accounting, Chat, Calendar, Notifications, Knowledge/Wiki/Chatbot, Workflows and Inbox/mail.

## Current-source delta audit — 2026-09-01

### VERIFIED DONE

- KEEP the centralized deterministic authorization module, Home section-failure isolation, Billing ledgers/provider adapter, Calendar recurrence/attendee/reminder implementation, notification outbox, tenant-scoped Query cache and unified Inbox/Mail split. Current gates still protect their interfaces; cosmetic replacement would add risk without preventing a concrete failure.
- Static gates pass for 3,572/3,572 classified routes, 624 used permission keys, 895/895 declared tenant-isolation paths, 742/742 tenant-indexed tables, 3,583/3,583 OpenAPI operations, 1,363/1,363 mutating bodies, zero actionable bounded-read findings and zero unregistered emitted outbox events.

### REGRESSED

- Home section execution proof regressed: `backend/src/modules/dashboard/dashboard-section-isolation.spec.ts` has eight failures because `DashboardPersonalService.getPersonalDashboard` added an organization-membership lookup that its database adapter does not implement. Repair the test adapter and preserve the negative-query/failure-isolation assertions; do not weaken or delete them.
- Backend spec-inclusive typecheck regressed with seven current errors in `billing/core/revenue-analytics.service.spec.ts`, `organization/core/lifecycle/organization-purge-adapters.spec.ts`, `platform/platform-operator-access-policy.spec.ts` and `platform/platform-operator-access.spec.ts`; production backend and frontend typechecks still pass.
- The PRD previously named runtime custom roles, contradicting [PRD-IN-SCOPE.md](PRD-IN-SCOPE.md), `backend/CLAUDE.md` and the implemented six-standing authority model. The checklist below now requires fixed templates plus per-person grants instead of a second authority model.

### STILL PENDING

- Production-shaped read-cost evidence, cold bootstrap/catalog parity, runtime cross-tenant execution and the four retention decisions remain open under their existing criteria; they are not duplicated below.
- Payroll finalization still calls Accounting posting through a nested top-level transaction, so an Accounting journal can commit while the Payroll lock rolls back.

### NEW

- Current source proves additional release blockers in token-signing authority, tenant-composite foreign keys, Home access locality, TanStack cancellation/query-key/cache-shape correctness, frontend command authorization, Chat scale/concurrency, Calendar synchronization durability, Knowledge comment/review ACLs and durable notification fanout. Their exact acceptance criteria are added to the owning sections below.

## Immediate code-level release candidate

### 1. One-commit release verification

- [ ] Fix seeded E2E harness failures, including organization placement/control-plane state and schema/fixture drift.
- [ ] Repair all seven current spec-inclusive type errors without casts or exclusions, then make `pnpm -C backend check:spec-typecheck` pass at the same commit as production typechecks.
- [ ] Run disposable-database E2E for Organization/RBAC, Home, Settings, HRMS, Payroll, Build, Billing, Payments, Accounting, Chat, Calendar, Notifications, Knowledge, Workflows and Inbox/mail.
- [ ] Record each command, release SHA, database identity, dataset shape, pass/fail/skip counts and failure artifacts.
- [ ] At the same commit run backend build/typecheck, spec typecheck, frontend typecheck, OpenAPI freshness, cycle, file-size, dead-code, tenant-isolation, RLS, permission, cache, outbox, idempotency, migration, vulnerability, license and SBOM gates.
- [ ] Run deterministic container/fake failure tests for duplicate/delayed/out-of-order/forged payment events, seat/proration failure, Redis loss, realtime/email/push failure, retry exhaustion, cancellation, DLQ and recovery.
- [ ] Resolve every code-level P0/P1 finding and assign owner/deadline to accepted lower-severity residual risks.

### 2. Module and folder architecture

- [ ] Verify backend/frontend folders follow domain ownership and kebab-case rules; shared modules never import feature modules.
- [ ] Prove domain modules expose small, stable interfaces and keep implementation local; remove shallow pass-through layers that add no behavior.
- [ ] Prove Home only composes universal experiences; Chat, Calendar, Inbox and Notifications retain independent business implementation.
- [ ] Re-run file-size ratchets and split every unjustified mixed-responsibility file over 500 lines without cosmetic fragmentation.
- [ ] Prove zero circular imports, forbidden new `forwardRef`, barrel self-imports and erased Nest injection tokens.
- [ ] Prove every active Nest module is registered and every frontend route has one canonical owner; remove obsolete routes rather than preserving hidden duplicates.
- [ ] Prove no dead or duplicated endpoint, schema, type, validator, hook, query key, worker, page or UI element using dependency graphs plus build/typecheck evidence.
- [ ] Keep authenticated `app/**/page.tsx` and `layout.tsx` files as thin route modules for metadata, parameters, server authorization and composition; move state, forms, queries and mutations behind feature-owned interfaces and gate route-file size/import direction without changing landing visuals or animations.

### 3. TypeScript, Zod and cross-layer contracts

- [ ] Prove strict TypeScript with no new `any`, suppression directives, unsafe double casts, non-null assertion abuse or parallel hand-written types that drift from schemas.
- [ ] Validate every untrusted body, parameter, query, environment value, upload manifest and external response through established Zod boundaries.
- [ ] Keep Zod schemas in module DTO/schema files, derive types with `z.infer`, reject protected/client-supplied actor and tenant fields and enforce unknown-key policy.
- [ ] Reconcile backend Zod/OpenAPI contracts with frontend request/response types, hooks, forms and rendered error states.
- [ ] Verify operation IDs, REST versioning, status/error envelopes, idempotency headers, cursor/filter/sort contracts and backward compatibility.
- [ ] Prove controllers remain thin, business rules stay backend-side and no frontend `app/api` or client module contains business/database logic.

### 4. Database schema and migration quality

- [ ] Audit every in-scope tenant table for non-null `org_id`, tenant-leading index, explicit tenant path and composite tenant-safe relationships where required.
- [ ] Audit primary-key strategy, tenant-scoped uniqueness, FK indexes, named constraints, referential actions, checks, money units, timestamps and audit columns.
- [ ] Verify normalized lifecycle and relationship tables; remove actionable JSON arrays/polymorphic authority relationships and avoid EAV unless an approved custom-field seam requires it.
- [ ] Verify soft-delete/archive policy and every active readâ€™s deleted/archived predicate; use partial indexes where the access pattern requires them.
- [ ] Verify cross-tenant composite FKs for membership/authority-sensitive relations and prevent orphaned visible children.
- [ ] Add a `pg_catalog`-backed tenant-relationship gate that inventories every FK whose parent and child are tenant-owned, explicitly excludes CRM/Inventory and approved global relations, and reports zero actionable single-column tenant relationships.
- [ ] Repair every actionable in-scope relationship with `(org_id, child_id) -> (org_id, id)`, supporting uniqueness/indexes, `NOT VALID` then `VALIDATE` migration sequencing and cross-tenant insertion tests; explicitly cover Build ticket hierarchy/recurrence/release/feedback/product/work-item/workflow/sprint-event relations and Billing subscription/proration/invoice/credit-note relations.
- [ ] Reconcile Drizzle declarations, migration snapshots and the live catalog so each tenant relationship has one canonical composite constraint; remove redundant single-column constraints only after dependency proof, cold bootstrap and upgraded-catalog parity.
- [ ] Verify high-growth append-only tables have justified retention/partition decisions and indexes matched to real access patterns.
- [ ] Remove obsolete schema only with symbol, raw table-name, FK, migration, barrel and integrity-spec evidence.
- [ ] Cold-bootstrap an empty database to migration head and record zero pending, orphan, duplicate or unreachable migrations.
- [ ] Upgrade from the supported previous watermark, exercise interruption/retry and the documented rollback/forward-fix path using [RB-09](runbooks/RB-09-migration-rollback.md).
- [ ] Compare cold-bootstrap and upgraded catalogs: tables, columns, constraints, indexes, policies, functions, triggers and extensions must match.
- [ ] Verify migration `0930` enables the `audit_logs` append-only trigger and rejects application-role mutation in the disposable database.
- [ ] Retain release SHA, commands, database identity, catalog diff and artifact hashes.

### 5. Query, pagination and cache correctness

- [ ] Restore a reproducible production-shaped in-scope seed dataset for HRMS, Payroll, Build, Home, Chat, Calendar, Notifications, Knowledge and Accounting.
- [ ] Fix the evidence gap: 43 read budgets are below minimum seed size and 27 are skipped; CRM/Inventory rows do not count.
- [ ] Run each in-scope budget as `streamline_app` with `EXPLAIN (ANALYZE, BUFFERS)` and retain rows, buffers, duration, indexes and thresholds.
- [ ] Prove explicit projections, tenant-leading/access-pattern indexes and no required full tenant/table scan or avoidable sort.
- [ ] Exercise reminder, export, fanout, unread, free/busy, recurrence, search/vector and dashboard queries against seeded data.
- [ ] Verify every growing list has a hard limit, deterministic order, unique tie-breaker, signed scope-bound cursor and consistent filters/sorts.
- [ ] Prove no `SELECT *`, fetch-then-filter/count, N+1/per-row expansion or unbounded export/sweep remains.
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

- [ ] Test the six fixed standings — organization owner/admin/member and module owner/admin/member — plus fixed role templates, per-person grants, delegations and DataScope on every read and mutation path; prove no arbitrary custom-role creation interface exists.
- [ ] Test owner transfer, last-owner protection, administrative descendant protection, organization switching and cross-organization denial.
- [ ] Prove authorization at the data/query implementation so a missing controller/frontend check cannot expose a record.
- [ ] Prove frontend routes, navigation, TanStack queries and action buttons match backend effective permissions without treating hiding as security.
- [ ] Prove membership/permission revocation invalidates authorization caches, sessions and issued realtime credentials within the declared consistency contract.
- [ ] Run BOLA/IDOR tests for reads, writes, bulk actions, files, exports, search/vector, realtime, jobs and public/share-token paths; cross-tenant misses return 404.

### 7. NestJS route and worker behavior

- [ ] Verify every route is classified public, universal, permissioned or explicitly authorized inside its implementation; no undeclared route exists.
- [ ] Verify every privileged operation applies module, permission, tenant, record and DataScope checks at the correct seam.
- [ ] Verify writes are transactional, idempotent and safe under concurrent retry; side effects use after-commit/outbox behavior and never a dead request transaction.
- [ ] Verify background sweeps iterate tenant context explicitly, use bounded/resumable leases and expose retry/DLQ/cancellation states.
- [ ] Verify minimal response projections, serialization/redaction, generic errors, resource limits and stable HTTP semantics.
- [ ] Reconcile OpenAPI exposure, request, response, 4xx schema and operation metadata with active controllers and consumers.
- [ ] Prohibit fire-and-forget `NotificationDispatchService.emit` calls: transactional callers must await durable intent persistence or write the outbox row in their mutation transaction; enforce this with a static gate and crash/retry tests.

#### 7.1 Optimized route and transport contract

- [ ] Keep one canonical route per product operation; remove dead, versionless, duplicated and overlapping routes after caller/dependency proof.
- [ ] Define route budgets for database calls, downstream calls, application latency, response bytes and memory; record p50/p95/p99 at the release commit.
- [ ] Design routes around one user intent rather than forcing avoidable request waterfalls, while keeping unrelated domain implementation out of oversized mega-responses.
- [ ] Keep Home aggregation bounded and parallel with independent section results; one slow source must not delay or fail every section.
- [ ] Return explicit DTO projections and omit unused nested relations, internal columns, secrets and repeated denormalized payloads.
- [ ] Require bounded cursor/filter/sort contracts on collections and bounded `ids`/item counts on bulk routes; reject oversized requests before database work.
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
- [ ] Verify request cancellation, stale/gc policy, retry policy, refetch behavior and deduplication do not amplify load or replay unsafe writes.
- [ ] Verify server-prefetch/hydration and client keys match exactly with no cross-user or cross-organization cached payload.
- [ ] Verify cursor pagination does not duplicate/skip records and changing filter/sort resets pagination correctly.
- [ ] Verify loading, background-refresh, empty, partial-error, full-error, offline, permission-denied and revoked-access states.
- [ ] Prove frontend types and runtime parsing cannot silently accept a backend contract change.
- [ ] Pass TanStack `QueryFunctionContext.signal` through every cancellable read to `apiClient`; enforce zero unclassified reads and test navigation, search, range-change and organization-switch cancellation.
- [ ] Enforce canonical query-key factories for authenticated data: zero ad-hoc array keys or local key factories, no redundant tenant argument where the scoped Query hash already owns tenant/user identity, and exact invalidation tests for every mutation.
- [ ] Build a controller-to-hook command catalog: every non-universal mutation uses the exact backend permission through the authorized-mutation module, every universal/self exception is explicit, and zero commands are unclassified; test revocation before and during a mutation.
- [ ] Provide one typed optimistic patch/rollback implementation per cache shape, including `InfiniteData`; update list/detail/count variants atomically and prove concurrent realtime delivery cannot corrupt or overwrite optimistic state.

### 9. Upload, compression and file lifecycle

- [ ] Detect file identity from content, not filename alone, and enforce allowlists plus per-file/request/user/organization quotas.
- [ ] Stream or multipart-upload without buffering entire files in application memory; abort and clean abandoned uploads.
- [ ] Compute integrity checksums and make upload, scan, transform and finalization retries idempotent.
- [ ] Fail closed into tenant-scoped quarantine until malware scanning succeeds; implement authorized release, rejection, retention, deletion and audit transitions.
- [ ] Compress eligible image/text/document derivatives asynchronously; do not blindly recompress video, archives, encrypted or already-compressed formats.
- [ ] Preserve originals only where product/retention rules require; generate bounded previews/thumbnails asynchronously and strip unsafe metadata where applicable.
- [ ] Use tenant-scoped object keys and short-lived signed URLs; re-authorize every download instead of treating an identifier as authority.

### 10. Module release matrix

Architecture verdict before execution:

- **KEEP** the current top-level ownership of Organization/RBAC, Home/Dashboard, Settings, HR, Payroll, Build, Billing, Accounting, Chat, Calendar, Mail/Inbox, Notifications and Knowledge.
- **KEEP** Home as a composition module for universal surfaces. It may call other modules through small interfaces but must not own their tables, authorization policies, cache namespaces, workers or business implementation.
- **REFACTOR** a module only when the audit identifies a concrete correctness, security, scale, testability or operability failure. Do not split or rename modules for style.
- Every module verdict must be recorded as KEEP, REFACTOR or REMOVE with source paths, failure prevented and verification. An unchecked module has not yet earned 10/10.

Mandatory folder/file evidence for **every** module below:

- [ ] Inventory its backend module folders, controllers, implementations, DTO/Zod schemas, database schema files, migrations, workers, cache keys, event consumers, frontend routes, components, hooks, TanStack keys, tests, fixtures and operational scripts.
- [ ] Verify every folder/file has one canonical domain owner, kebab-case naming, correct import direction and no parallel legacy/duplicate location.
- [ ] Classify every inventoried file as KEEP, REFACTOR or REMOVE; name the concrete failure prevented for each REFACTOR/REMOVE verdict.
- [ ] Verify each file has one cohesive responsibility, stays within size policy or a documented exception, exposes the smallest useful interface and contains no pass-through/dead/commented/debug implementation.
- [ ] Prove removals and moves with dependency-graph, dynamic/side-effect import, route registration, raw table-name/FK, build/typecheck and relevant migration-integrity evidence.
- [ ] Record the final module folder tree and public interfaces so future work cannot recreate retired paths, duplicated schemas, hooks, query keys or endpoints.

#### 10.1 Authentication, identity, sessions and organization

- [ ] Architecture/schema: verify global identity is separated from tenant membership; organization, invitation, membership, session and organization-switch relationships have correct keys, uniqueness, lifecycle and revocation data.
- [ ] Token authority: remove `BACKEND_JWT_SECRET` and bearer-token signing from `frontend/lib/auth.ts`; only an isolated backend issuer may mint short-lived issuer/audience-bound access tokens, while frontend/edge runtimes receive no signing authority.
- [ ] Token verification: use asymmetric verification or an equivalently isolated signing authority with key identifiers, rotation overlap and revocation; test wrong issuer/audience/key, expiry, replay, altered user, altered organization and a compromised frontend runtime that possesses no signing key.
- [ ] Routes/contracts: verify signup, login, logout, refresh, recovery, MFA, invitation and organization switching use Zod/OpenAPI contracts and never trust client actor/current-org fields.
- [ ] Authorization/security: test account enumeration, fixation/replay, lockout, invitation takeover, revoked membership, cross-org switching and last-owner/owner-transfer invariants.
- [ ] Queries/cache: verify bounded membership/session reads, required indexes and immediate invalidation of session, effective-access and organization caches.
- [ ] Frontend/TanStack/tests: verify workspace/onboarding gates, organization switch state, query-key tenant isolation, auth error states and allow/deny/cross-tenant E2E.

#### 10.2 Organization RBAC and module RBAC

- [ ] Architecture/schema: verify permission catalog, six fixed standings, fixed role templates, per-person grants, delegations, scopes and assignments remain normalized and tenant-correlated; customization must not create a seventh standing or parallel authority source.
- [ ] Routes/contracts: verify role/grant/module-access CRUD has strict Zod contracts, stable OpenAPI, idempotent mutations and exhaustive owner/descendant protections.
- [ ] Authorization/cache: prove data-layer enforcement, deny-by-default classification and revocation invalidation without a database round trip per permission check.
- [ ] Queries/performance: verify effective-permission resolution is batched/cached, scope expansion is bounded and indexes cover subject, role, permission, module and tenant access paths.
- [ ] Frontend/TanStack/tests: verify routes, navigation, queries and buttons consume one effective-access contract and test org/module owner, admin, member, fixed template, per-person grant, delegation and revocation cases.

#### 10.3 Home and dashboard composition

- [ ] Architecture/schema: prove Home owns composition/preferences only and does not duplicate Chat, Calendar, Inbox or Notification domain tables or implementation.
- [ ] Access locality: replace the drifting backend/frontend Home section registries with one generated or contract-checked authoritative section manifest that matches each live controller route, module requirement, permission and cache namespace; deletion of either duplicate must not spread access logic across callers.
- [ ] Routes/contracts: define a bounded per-section dashboard contract with independent success/error metadata and permission-safe projections.
- [ ] Authorization/privacy: derive each section from caller identity and effective access; prove calendar, people, payroll and communication data cannot leak through summaries/counts.
- [ ] Queries/cache: verify parallel bounded aggregation, no N+1/fetch-all behavior, per-section cache ownership and mutation invalidation from source modules.
- [ ] Query efficiency: resolve the caller's organization membership once in `DashboardPersonalService`, reuse it across enabled sections, preserve calendar visibility predicates and record a maximum database-call count per Home request.
- [ ] Frontend/TanStack/tests: verify independent Suspense/error/loading/empty states, stable query keys, partial failure isolation, responsive rendering and widget-level allow/deny E2E.
- [ ] Repair the eight failing Home section-isolation tests at current head and add a regression test proving the membership lookup cannot bypass disabled-section query suppression or turn one section failure into a full Home failure.
- [ ] Reuse one request-local `/me/access` result for authenticated-layout MFA/route decisions and TanStack hydration; prove exactly one backend access call per navigation instead of `getServerAccess` plus `prefetchAccess` duplication.

#### 10.4 Settings and module-access administration

- [ ] Architecture/schema: prove global settings contain organization configuration/access governance only while operational and module-owned settings remain with their modules.
- [ ] Routes/contracts: verify organization profile, hierarchy, security, members, roles, module access and billing settings expose canonical non-duplicated routes and strict contracts.
- [ ] Authorization: test owner/admin/member visibility and mutations, last-owner protection, hierarchy scope, module owner administration and record-level denial.
- [ ] Queries/cache: verify bounded settings reads, tenant-leading indexes and invalidation of organization, hierarchy, access, navigation and entitlement caches.
- [ ] Frontend/TanStack/tests: verify canonical routes, form-schema parity, dirty/error/conflict states, permission-backed navigation and mutation invalidation.

#### 10.5 Directory, Me and universal self-service

- [ ] Architecture/schema: preserve one organization-person identity with membership, worker and employment facets; resolve subjects through the person seam without cross-tenant inference.
- [ ] Routes/contracts: use `/me/*` for self operations, derive subject from authentication and separate directory projections from sensitive HR/payroll projections.
- [ ] Authorization/privacy: prove universal member access only to allowed self-service/directory records and separate HR/payroll administrative widening through DataScope.
- [ ] Queries/cache: verify minimal projections, bounded directory search, tenant-safe person resolution and invalidation across membership/worker/employment changes.
- [ ] Frontend/TanStack/tests: verify self and administration keys never collide, universal navigation survives disabled paid modules and cross-person/cross-org denial tests pass.

#### 10.6 HRMS

- [ ] Architecture/schema: audit people/employment, leave, attendance, recruitment, onboarding, performance, benefits, documents and approval lifecycles for normalized tenant-safe relations and justified table ownership.
- [ ] Routes/contracts: verify resource-specific controllers, strict Zod/OpenAPI contracts, self versus administration routes, bounded bulk operations and no client actor/current-org fields.
- [ ] Authorization/privacy: test own/team/department/branch/org DataScope, sensitive projection controls, candidate/employee separation, approvals and cross-tenant record denial.
- [ ] Queries/cache/workers: verify cursors, filters, exports, leave balances, attendance and review paths; tenant-leading indexes; cache invalidation; bounded reminders/imports/exports.
- [ ] Frontend/TanStack/tests: verify canonical HR routes, form parity, self/admin separation, all UI states, responsive tables/forms and full CRUD/approval/cross-tenant E2E.
- [ ] Classify every HR mutation hook as universal/self or permissioned; route non-universal leave, attendance, recruitment, onboarding, performance, benefits and document commands through the exact authorized-mutation interface and prove in-flight revocation behavior.

#### 10.7 Payroll

- [ ] Architecture/schema: verify payroll runs, components, assignments, calculations, payslips, taxes, deductions and payment/reconciliation history are normalized, tenant-safe and immutable where financial.
- [ ] Routes/contracts: verify calculation, lock, approve, publish, reverse and export operations use strict schemas, idempotency and explicit state transitions.
- [ ] Authorization/privacy: test payroll owner/admin/member, approver, self-payslip, separation-of-duties, sensitive projections and every mutation hook.
- [ ] Queries/cache/workers: verify bounded run/item reads, indexed employee/period/status paths, no N+1 calculations, asynchronous exports and correct invalidation after lock/publish/reversal.
- [ ] Frontend/TanStack/tests: verify run-state UI, conflict/retry/partial failure, permission gates, secure downloads and calculation/locking/reconciliation E2E.
- [ ] Make Payroll finalization and Accounting posting crash-consistent: either pass the active transaction through the posting seam or commit an idempotent posting intent atomically and consume it durably; prove outer rollback cannot leave a journal and retry cannot duplicate one.

#### 10.8 Build/PM

- [ ] Architecture/schema: keep project and product entities distinct inside Build; verify workspaces, projects, products, tickets, boards, sprints, roadmaps, OKRs, feedback and QA relations.
- [ ] Routes/contracts: verify canonical `/build` resources, strict schemas, stable cursors/filter/sort contracts, idempotent mutations and bounded bulk operations.
- [ ] Authorization: test workspace/project/product membership, module roles, record scope, private resources, watchers/assignees and cross-tenant identifiers.
- [ ] Queries/cache/events: verify board/backlog/search plans, ordering tie-breakers, counters, cache invalidation and duplicate-safe activity/notification events.
- [ ] Frontend/TanStack/tests: verify drag/reorder concurrency, optimistic rollback, filter/cursor reset, route/action parity, responsive boards and CRUD/cross-scope E2E.
- [ ] Replace `Promise.all` per-row custom-state reorder calls with one bounded bulk command whose backend update is transactional, idempotent and expected-version protected; return stable conflict semantics and roll back the complete optimistic order on failure.
- [ ] Remove local Build query-key factories such as `stateKeys`; all Build reads/mutations must use the canonical factory and exact invalidation prefixes.

#### 10.9 Workflows and automation

- [ ] Architecture/schema: verify definitions, immutable versions, triggers, schedules, secrets references, runs, steps, approvals and execution attempts are normalized and tenant-safe.
- [ ] Routes/contracts: verify create/version/publish/pause/run/cancel/retry/approve operations have strict schemas, idempotency and explicit state transitions.
- [ ] Authorization/security: test authoring versus execution/approval permissions, secret non-disclosure, module/record scope and cross-tenant trigger targets.
- [ ] Queries/cache/workers: verify leases, concurrency limits, retries/backoff, cancellation, DLQ, schedule deduplication, bounded histories and consumer registration.
- [ ] Frontend/TanStack/tests: verify editor/run-history state, version conflicts, permission gates, polling/subscription cleanup and deterministic execution/recovery tests.

#### 10.10 Billing, subscriptions and payments

- [ ] Architecture/schema: verify plans, subscriptions, entitlements, placements/seats, usage, payment events, invoices, adjustments, tax/currency and outbox ledgers with immutable financial history.
- [ ] Routes/contracts: verify checkout/change/cancel, billing profile, invoices, usage and AI-credit routes are canonical, strictly validated, idempotent and provider-neutral.
- [ ] Authorization/security: test billing owner/admin/member access, provider signature verification, replay/forgery, tenant ownership, entitlement gates and sensitive redaction.
- [ ] Queries/cache/workers: verify local entitlement resolution, seat/proration concurrency, usage aggregation, webhook dedupe, retries/DLQ and invalidation without provider calls per request.
- [ ] Frontend/TanStack/tests: verify the two canonical Settings billing pages, plan/seat/usage/invoice states, mutation invalidation and deterministic outage/replay/proration E2E.
- [ ] Keep provider-specific identifiers, verification fields, route names and SDK behavior behind the Billing adapter seam; frontend callers consume provider-neutral checkout-session/confirmation contracts and a second adapter contract test requires no caller change.
- [ ] Route every non-universal subscription/payment mutation through the exact billing/payment permission interface; billing remains non-delegable and tests cover owner/admin/member denial plus revocation during checkout confirmation.

#### 10.11 Accounting and finance

- [ ] Architecture/schema: verify accounts, journals/entries, expenses, reimbursements, invoices, payments, reconciliation and immutable reversal relationships balance and preserve tenant scope.
- [ ] Routes/contracts: verify posting, approval, reimbursement, reconciliation, reversal, export and reminder operations use strict schemas, idempotency and valid financial state transitions.
- [ ] Authorization: test finance roles, approver separation, record/DataScope, employee self-expense access, immutable posted records and cross-tenant denial.
- [ ] Queries/cache/workers: verify ledger/report/export plans, bounded reminder sweeps, asynchronous resumable exports, retries/cancellation/DLQ and derived-balance invalidation.
- [ ] Frontend/TanStack/tests: verify monetary precision, approval/reversal conflicts, report cursors, export job state and balanced-journal/cross-tenant E2E.

#### 10.12 Chat

- [ ] Architecture/schema: verify channels, memberships, messages, threads, reactions, attachments, receipts/read cursors and durable events are normalized with tenant/channel composite integrity.
- [ ] Routes/contracts: verify channel/message/thread/reaction/read/history/export routes use strict schemas, bounded cursors, server-derived actors and idempotent client message keys.
- [ ] Authorization: test channel membership, private/direct conversations, thread inheritance, every mutation hook, attachment access and immediate issued-token revocation.
- [ ] Queries/cache/realtime: verify stable message ordering, indexed history/thread/reaction/unread paths, no unread scans, duplicate-safe fanout, reconnect/offline recovery and safe cache invalidation.
- [ ] Frontend/TanStack/tests: verify infinite-query cursor merge, optimistic send/reaction rollback, dedupe, unread state, reconnect, permission removal, responsive/a11y behavior and concurrency E2E.
- [ ] Replace `ChatChannelsService.listMemberChannels`' unbounded membership read and fixed 100-channel truncation with stable tenant/member-scoped keyset pagination and a continuation cursor; add a scanner regression fixture for a user in more than 100 channels.
- [ ] Make huddle attendee creation and notification fanout bounded, resumable and queue-backed with recipient checkpoints and tenant concurrency limits; the start request must not retain all members or launch per-member provider calls.
- [ ] Enforce one active huddle per `(org_id, channel_id)` and serialize participant-cap admission atomically; prove concurrent start/join requests cannot create duplicate huddles or exceed plan/settings caps.
- [ ] Require active channel-membership assertion before mark-read, mark-unread, mute and unmute read or mutate channel state; inaccessible private channels return 404 and denial tests exercise revoked/non-member callers.
- [ ] Replace per-visible-tab 15-second presence heartbeats with connection-driven presence or one browser leader/lease plus jitter, backoff, offline/visibility behavior and a bounded fallback; prove multitab/reconnect load budgets.

#### 10.13 Calendar

- [ ] Architecture/schema: verify calendars/sources, events, attendees, recurrence rules, exceptions, reminders and synchronization state are normalized with tenant-safe attendee relations.
- [ ] Routes/contracts: verify event/series/occurrence, RSVP, free-busy, conflict, reminder and export routes use strict schemas, bounded ranges/cursors and a standard RRULE library.
- [ ] Authorization/privacy: test calendar/source visibility, attendee privacy, own/shared/admin operations, private events, cross-tenant IDs and every mutation hook.
- [ ] Queries/cache/workers: verify timezone/DST, recurrence expansion limits, free-busy/conflict indexes, reminder replacement/deduplication, sync retries and range/source cache invalidation.
- [ ] Frontend/TanStack/tests: verify one `/calendar`, source toggles, timezone display, series-versus-instance edits, cursor/range keys and DST/exception/conflict/reminder E2E.
- [ ] Persist create/update/delete provider-sync intent atomically with local event changes and expose idempotent lease, retry/backoff, cancellation and terminal synchronization state; transient provider or process failure must not leave permanent local/external divergence.
- [ ] Consolidate Calendar member list/search behind one permission-gated lookup interface; both paths require `directory:people:view` and test missing, granted and revoked access.

#### 10.14 Inbox and mail

- [ ] Architecture/schema: verify accounts/conversations/messages/participants/labels, metadata, delivery/sync cursors and attachments have normalized tenant/account ownership.
- [ ] Routes/contracts: define one bounded Inbox contract for list/thread/search/read/label/archive/send/reply/attachment operations with strict schemas and provider-neutral adapters.
- [ ] Authorization/security: test account ownership/delegation, recipient/attachment access, HTML sanitization, unsafe links/content and cross-tenant conversation/message IDs.
- [ ] Queries/cache/workers: verify indexed conversation ordering/search/unread, incremental sync, idempotent send/receive, bounce/retry/DLQ and invalidation of list/thread/count keys.
- [ ] Frontend/TanStack/tests: verify infinite lists, thread hydration, optimistic read/label rollback, compose/send states, offline/reconnect, sanitization and account-revocation E2E.

#### 10.15 Notifications, email and push

- [ ] Architecture/schema: verify notifications, recipients, preferences, templates, delivery attempts, provider events, read state and dedupe keys are normalized and tenant-safe.
- [ ] Routes/contracts: verify list/read/read-all/preferences and administrative template/test routes are strictly validated, bounded and idempotent.
- [ ] Authorization/privacy: test recipient-only reads/mutations, administrative template scope, sensitive payload minimization, tenant-safe realtime channels and unsubscribe/consent rules.
- [ ] Queries/cache/workers: verify indexed unread counts without scans, at-least-once duplicate-safe dispatch, outbox consumers, retry/backoff/DLQ, bounce/complaint/suppression and provider adapter failure.
- [ ] Frontend/TanStack/tests: verify notification/count key consistency, optimistic read rollback, realtime dedupe, preference forms, accessibility and replay/revocation/cross-tenant E2E.
- [ ] Repair mark-read, mark-all and bulk-read optimistic updates to patch `InfiniteData<Notification[]>` page-by-page rather than treating the cache as `Notification[]`; atomically preserve rollback snapshots and unread counts under concurrent realtime events.
- [ ] Replace growing per-recipient transactions and in-memory recipient maps with cursor-resumable bulk persistence, checkpoints, tenant concurrency/backpressure and duplicate-safe provider delivery; no worker invocation may retain or dispatch the complete recipient set.

#### 10.16 Knowledge Base, Wiki and Chatbot

- [ ] Architecture/schema: verify spaces, memberships, documents/pages, immutable revisions, attachments, ingestion jobs, chunks/embeddings and deletion/reindex state have tenant-composite integrity.
- [ ] Routes/contracts: verify CRUD, revision, publish/archive, search, ingestion, reindex, export and chatbot routes use strict schemas, bounded work and idempotency.
- [ ] Authorization/privacy: test org/user content, space/audience/record ACLs, draft/published visibility, attachment access and ACL enforcement inside keyword/vector retrieval before model context.
- [ ] Queries/cache/workers: verify revision/search plans, ingestion leases/retries/DLQ, chunk dedupe, permission-aware cache keys, purge/reindex and realistic-corpus latency.
- [ ] Frontend/TanStack/tests: verify editor/revision conflicts, search cursors, permission changes, citations/source integrity, ingestion states and ACL/purge/reindex E2E.
- [ ] Apply the direct article visibility predicate to Help Centre comment list/create/update/delete/resolve, carry caller context to the data seam, select explicit fields and keyset-page comment threads.
- [ ] Re-authorize parent-page visibility and action authority inside every Wiki comment mutation; remove controller-supplied authorization booleans and test access revocation between read and mutation.
- [ ] Apply reviewer/requester scope plus page ACLs to freshness-review due lists and replace the silent 100-row cap with stable cursor pagination so restricted titles/identities do not leak and due work is not lost.

#### 10.17 Shared storage, search, realtime and integration adapters

- [ ] Architecture/schema: verify shared modules expose narrow interfaces and do not absorb feature authorization or business rules; integration credentials remain server-side and tenant-bound.
- [ ] Routes/contracts: verify upload/download/search/token/integration callbacks validate input, authenticate provider callbacks and never expose provider secrets or internal object keys.
- [ ] Authorization/security: prove callers supply an authorization context that shared adapters cannot bypass; test SSRF, malicious files, token replay and cross-tenant resources.
- [ ] Queries/cache/workers: verify bounded search, tenant/ACL predicates, backpressure, retries/DLQ, idempotent callbacks, cache namespaces and resource cleanup.
- [ ] Consumers/tests: verify every produced event has a registered consumer or explicit terminal sink and exercise adapter fakes plus cross-module contract tests.
- [ ] Repair every current `void NotificationDispatchService.emit(...)` caller in Organization, Build and Knowledge so intent persistence is awaited or written in the caller transaction; prove commit/rollback/crash behavior and prohibit future fire-and-forget calls statically.

#### 10.18 Frontend system-wide release

- [ ] Architecture: verify route groups and feature folders mirror ownership, shared UI stays domain-neutral and no business/database implementation exists in the frontend.
- [ ] TanStack/contracts: verify query-key factories, parsing, invalidation, hydration, cancellation, retry, optimistic concurrency and pagination rules across every module above.
- [ ] RBAC/UI: verify authenticated layout, route/action parity, module navigation, permission changes and organization switching without flashes of unauthorized content.
- [ ] UX/accessibility: verify loading/empty/error/offline/permission states, keyboard/screen reader, focus, contrast and responsive 375/768/1280 behavior.
- [ ] Performance/SEO/tests: verify bundle boundaries, lazy loading, rendering/Web Vitals budgets and public metadata without changing landing visuals/animations; run representative browser E2E.

### 11. Application security and privacy implementation

- [ ] Test session fixation/replay, revoked membership, invitations, password reset, MFA/recovery, brute force and credential stuffing behavior.
- [ ] Test code-level CSRF, XSS, SSRF, SQL injection, unsafe redirect, path traversal, CORS/CSP/headers, payload limits and rate limits.
- [ ] Verify secret/PII redaction, secure cookies/sessions, generic auth failures and signing/encryption-key rotation behavior.
- [ ] Implement correction/rectification rather than treating export, deletion or anonymization as correction.
- [ ] Make subject export exhaustive and resumable with no silent caps or skipped in-scope sources.
- [ ] Implement idempotent tenant-scoped erasure for database, object storage, search/vector, projections, caches and supported adapters while preserving immutable/legal-hold records.
- [ ] Resolve retention for `helpdesk_tickets`, `performance_reviews`, `mail_message_metadata` and `announcements` with bounded policy or explicit KEEP-FOREVER configuration.
- [ ] Prove retention workers are code-scheduled, bounded/resumable, idempotent, audited, retryable and emit failure events.
- [ ] Prove document, payroll, export, purge and retention workflows never silently skip or truncate growing work.

### 12. Light-speed performance and AI

The defaults below are code-release budgets on a production build with the documented seeded dataset. A module may use a stricter budget. A looser exception requires measured evidence, a concrete reason, an owner and an expiry date; budgets may never be silently increased to make a gate pass.

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
- [ ] Prove TanStack Query deduplicates concurrent callers, cancels abandoned reads, avoids retry storms, retains useful previous pages and invalidates only affected tenant/module keys.
- [ ] Virtualize or incrementally render large chat, calendar, inbox, notification, directory, HR and Build collections while preserving accessibility and cursor correctness.
- [ ] Optimize images, fonts and eligible static assets, use HTTP compression for text responses and keep upload/media transformations asynchronous.
- [ ] Measure memory, render count, long tasks and hydration mismatches on representative Home/module journeys; eliminate avoidable rerenders and main-thread blocking.

#### 12.3 AI gateway, retrieval and streaming

- [ ] Route every AI feature through one backend AI gateway with small model/provider interfaces, centralized timeouts, usage accounting, policy, redaction and observable error modes; no frontend direct-provider calls.
- [ ] Keep AI out of authentication and authorization decisions; deterministic RBAC and tenant/record ACL checks must finish before retrieval or provider invocation.
- [ ] Reserve token-metered credits atomically before paid calls, settle actual input/output usage in milli-credits and refund only according to the documented failure contract.
- [ ] Bound prompts, history, retrieved chunks, tool iterations, output tokens, concurrency and per-tenant/user rate; reject or summarize oversized context rather than consuming unbounded memory/cost.
- [ ] Enforce tenant, subject, permission, document lifecycle and record ACL predicates inside keyword/vector retrieval before any chunk reaches the model.
- [ ] Batch and deduplicate parsing, chunking and embeddings; make ingestion resumable/idempotent with leases, retries, cancellation, DLQ, progress and deletion/reindex propagation.
- [ ] Stream text/tool progress to the client rather than buffering a complete answer; target application overhead before provider dispatch at p95 ≤ 250 ms and first visible streamed state within 100 ms.
- [ ] Record provider time-to-first-token separately and target end-to-end p95 ≤ 2 s where the selected model/provider supports it; provider-bound exceptions belong in deferred evidence, not hidden in application latency.
- [ ] Propagate client aborts, enforce deadlines and circuit breakers, and retry only replay-safe pre-stream operations; never duplicate a paid request or continue spending after cancellation.
- [ ] Cache only explicitly cacheable AI artifacts using tenant, subject/ACL version, model, prompt/version, source revision and policy dimensions; invalidate on permission, content, model or prompt change.
- [ ] Defend against prompt injection, unsafe tool arguments, SSRF and data exfiltration with allowlisted tools, validated arguments, output schemas, content controls and least-privilege execution.
- [ ] Validate structured outputs, preserve citation/source integrity and show a safe partial/error state when the model, retrieval, tool or stream fails.
- [ ] Verify AI frontend states for credit exhaustion, queueing, streaming, cancellation, retry, partial output, citation loading, provider failure and permission revocation without duplicate requests.
- [ ] Emit tenant-safe metrics for queue time, application overhead, provider latency, time-to-first-token, tokens, credits/cost, cache hit, cancellation, retry and failure without logging prompts or sensitive content.
- [ ] Run deterministic AI gateway/retrieval/stream tests plus representative provider-sandbox tests when credentials are available; prove identical authorization for direct document reads and AI-assisted retrieval.

## Immediate code-level final gate

- [ ] Every unchecked item under **Immediate code-level release candidate** is complete with fresh evidence.
- [ ] CRM/Inventory remain excluded and public landing visuals/animations remain unchanged.
- [ ] Backend/frontend builds, typechecks, focused tests, disposable E2E and architecture gates pass at one commit.
- [ ] Empty bootstrap and supported upgrade produce the same expected database catalog.
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
