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
- Immediate code-level criteria still open: **94**.
- Deferred production/compliance criteria still open: **34**.
- The 94 immediate criteria are acceptance checks, not 94 confirmed defects; fresh execution may close a criterion without a code change when its implementation already passes.

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

## Immediate code-level release candidate

### 1. One-commit release verification

- [ ] Fix seeded E2E harness failures, including organization placement/control-plane state and schema/fixture drift.
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

### 6. Organization and module RBAC

- [ ] Test organization owner/admin/member, module owner/admin/member, custom roles, direct grants and DataScope on every read and mutation path.
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

### 9. Upload, compression and file lifecycle

- [ ] Detect file identity from content, not filename alone, and enforce allowlists plus per-file/request/user/organization quotas.
- [ ] Stream or multipart-upload without buffering entire files in application memory; abort and clean abandoned uploads.
- [ ] Compute integrity checksums and make upload, scan, transform and finalization retries idempotent.
- [ ] Fail closed into tenant-scoped quarantine until malware scanning succeeds; implement authorized release, rejection, retention, deletion and audit transitions.
- [ ] Compress eligible image/text/document derivatives asynchronously; do not blindly recompress video, archives, encrypted or already-compressed formats.
- [ ] Preserve originals only where product/retention rules require; generate bounded previews/thumbnails asynchronously and strip unsafe metadata where applicable.
- [ ] Use tenant-scoped object keys and short-lived signed URLs; re-authorize every download instead of treating an identifier as authority.

### 10. Module release matrix

- [ ] Organization/Settings: verify hierarchy scope, organization switching, owner protection, custom roles, module access administration and authorization-backed navigation/actions.
- [ ] Home: verify each widget is permission-scoped, privacy-safe, bounded and independently failure-isolated; a failed widget cannot fail or leak the dashboard.
- [ ] HRMS/Payroll: verify self-service versus administration, sensitive projections, approvals, payroll locking/reconciliation, payslips, immutable history, bounded exports and idempotency.
- [ ] Build/PM/Workflows: verify membership, ticket/board cursors, schedules, secrets, workflow versions, retries, cancellation, approvals, idempotency and consumers.
- [ ] Billing/Payments/Accounting: verify webhook replay safety, entitlements, seats/proration, usage, tax/currency, invoice immutability, journal consistency, async exports/reminders and DLQ recovery.
- [ ] Chat: verify channel/thread authorization, ordering, duplicate-safe delivery, fanout, reconnect/offline recovery, reactions, unread/read state, token revocation and bounded history/export.
- [ ] Inbox/mail/Notifications: verify unified bounded contracts, duplicate-safe delivery, authorization-safe realtime, unread counters, templates, localization, suppression/unsubscribe, retry/DLQ and replay safety.
- [ ] Calendar: verify RRULE, exceptions, timezone/DST, attendee privacy, free/busy/conflicts, reminder replacement/deduplication, sync adapters and exports.
- [ ] Knowledge/Wiki/Chatbot: verify revisions, ingestion retry/idempotency, files, malware gate, ACL inside keyword/vector retrieval, citations, purge/reindex and corpus latency.
- [ ] Frontend: verify responsive 375/768/1280 layouts, keyboard/screen-reader use, all UI states, route/action parity, bundles, authenticated rendering and SEO without changing landing animations.

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

