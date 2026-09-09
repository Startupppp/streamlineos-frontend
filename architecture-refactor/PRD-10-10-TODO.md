# StreamlineOS final 10/10 completion PRD

Status: **superseded** — retained as cross-program history
Last reconciled: 2026-09-01  
Scope: all platform domains except CRM and Inventory

**Current task authority: [`prd/README.md`](prd/README.md).** It routes module-owned files that parallel
agents can execute independently. [PRD-10-10-CODE-RELEASE-TODO.md](PRD-10-10-CODE-RELEASE-TODO.md)
retains the `PRD-C001`–`PRD-C195` requirements vocabulary and historical evidence.

This file's former claim to be "the only architecture/refactor TODO list", and its instruction not to
create session tickets, is withdrawn: the release program is *built* on 36 per-ticket files under
`.scratch/code-release-10-10-v2/issues/`, which the traceability gate requires and pins at exactly 36. The
instruction and the program contradicted each other, and the program is the one with a gate.

Nothing here is deleted. Its "Verified complete — preserve these results" block is recorded nowhere else
and must be consolidated into the authoritative checklist before this file is retired. Read its counts as
of 2026-09-01, not as current: it records 585 migrations against a head that is now 697.

## Reality and release standard

The core architecture is substantially implemented. The remaining work is concentrated in release verification, production-shaped performance proof, deployed infrastructure, privacy/compliance execution, and accountable approvals.

“Bug free” cannot be guaranteed honestly. The release condition is instead: no known P0/P1 defect, required automated and deployed checks pass at one recorded commit, rollback/recovery is proven, SLOs have measured headroom, and residual risks have named owners.

Local mocks and self-tests prove implementation behavior only. They never prove production cells, replicas, PITR, provider outages, alert delivery, legal compliance, or human approval.

## Product constraints

- Do not change public landing-page visuals or animations.
- CRM and Inventory implementation, migrations and acceptance evidence are excluded.
- Preserve [PRD-IN-SCOPE.md](PRD-IN-SCOPE.md) unless a concrete scale, correctness, security or operability failure requires a change.
- Never solve a growing workflow with silent truncation. Use keyset pagination, resumable batches, streams or queues.
- Tenant-owned relationships, queries, cache keys, events and search ACLs must preserve organization scope.
- Never mark deletion, dead code or schema removal complete from text search alone.
- Keep task ownership in the module files routed by `prd/README.md`; do not create ad hoc session backlogs.

## Verified complete — preserve these results

- [x] Organization and module RBAC architecture: owner/admin/member standing, custom permissions, DataScope application, owner protection, module access, tenant isolation and revocation primitives.
- [x] Legacy actor contraction: 434 organizational fields scanned; 318 historical/display-only; 116 excluded CRM/Inventory; 0 actionable.
- [x] Invitation tenant-composite membership constraints, Calendar attendee normalization and Chat durable token revocation/retry behavior.
- [x] Membership-FK removal-policy, owner-authority, permission-catalog, record-access, module-gate and tenant-index gates.
- [x] Cursor migration and bounded-read implementation: 0 actionable offsets, 0 actionable unbounded reads, 0 unordered paging and 0 unclassified paths across 2,107 service files.
- [x] Migration ledger and structure: 585/585 applied in the configured database; 0 pending/orphan/duplicate/unreachable; chain, discipline, rollback and drop-column gates pass locally.
- [x] Backend production and spec-inclusive type-checks pass.
- [x] Frontend type-check passes.
- [x] Backend and frontend import graphs have no circular dependencies.
- [x] Backend hard file-size gate passes: 3,392 files, 12 documented exceptions.
- [x] Frontend dead-code/capability gate reports 0 DEAD, 0 WIRE and 0 UNCLASSIFIED; deferred capabilities have owners and a 2026-10-01 review date.
- [x] OpenAPI structural coverage: 3,583/3,583 operations; 1,363/1,363 mutating request bodies; operation IDs and freshness pass at the recorded audit workspace.
- [x] Cache invalidation, outbox consumer, idempotency, feature-flag, mock-surface, route classification and navigation-permission gates pass.
- [x] Billing/payment provider abstraction, webhook idempotency, entitlements, seats/proration ledgers, immutable invoices and transactional outbox exist.
- [x] Core seams exist for Home, Settings, HRMS, Payroll, Build, Accounting, Chat, Calendar, Notifications, Knowledge/Wiki/Chatbot, Workflows and Inbox/mail.

## Remaining work — execute in this order

### 1. Code and release verification

- [ ] Fix the remaining seeded E2E environment/harness failures, including organization placement/control-plane state and schema/fixture drift.
- [ ] Run representative disposable-database E2E for Organization/RBAC, Home, Settings, HRMS, Payroll, Build, Billing, Accounting, Chat, Calendar, Notifications, Knowledge, Workflows and Inbox/mail.
- [ ] Record every E2E command, environment identity, release SHA, dataset shape, pass/fail/skip counts and failure artifact.
- [ ] Run live provider/cache outage scenarios: duplicate, delayed, out-of-order and forged payment webhooks; proration/seat placement failure; Redis loss; Ably/email/push outage; retry exhaustion; cancellation; DLQ and recovery.
- [ ] Run authenticated accessibility and visual checks at 375, 768 and 1280 px in light, dark and system themes.
- [ ] Produce production/reference-device Web Vitals evidence. Current local results breach mobile LCP/INP/FCP/TTFB and desktop INP/FCP/TTFB budgets.
- [ ] If the frozen landing animation budget prevents the accepted mobile INP target, obtain dated Product acceptance; do not alter landing visuals or animations.
- [ ] Implement and verify the complete upload lifecycle: malware scan, fail-closed behavior, quarantine, retention, authorized release, rejection, deletion and audit trail.
- [ ] Run backend build/type-check, spec type-check, frontend type-check, OpenAPI freshness, import-cycle, file-size, dead-code, tenant-isolation, RLS, permission, cache, outbox, idempotency and migration gates at one recorded commit.
- [ ] Resolve every remaining code-level P0/P1 finding and record lower-severity residual risks with owner and deadline.

### 1A. Security, API and supply-chain verification

- [ ] Run cross-tenant BOLA/IDOR tests against reads, writes, exports, files, search, realtime channels, background jobs and public/share-token routes; client-side hiding never counts as authorization.
- [ ] Verify authentication and account-recovery abuse cases: session fixation, token replay, revoked membership, organization switching, invitation takeover, password reset, MFA/recovery, brute force and credential stuffing.
- [ ] Verify CSRF, stored/reflected XSS, SSRF, SQL injection, unsafe redirects, path traversal, CORS, CSP, security headers, request-size limits and rate limits against the deployed edge and application.
- [ ] Verify TLS, encryption at rest, secret isolation, log/trace redaction, credential rotation and signing/encryption-key rotation without cross-tenant cache or session leakage.
- [ ] Run dependency vulnerability, license and SBOM gates at the release commit; resolve or explicitly approve every reachable critical/high vulnerability and prohibited license.
- [ ] Reconcile the OpenAPI contract with frontend callers and any external consumers. Prove operation IDs, REST versioning, pagination/filter/sort/error contracts and backward compatibility for the supported upgrade window.
- [ ] Prove no dead, duplicated or overlapping endpoint, validator, schema, hook, cache-key factory, worker or UI surface remains in scope; deletion requires dependency-graph and build evidence.
- [ ] Verify module folder ownership and import direction remain coherent: domain modules expose small interfaces, internal implementation stays local, shared modules do not depend on features, and no new oversized mixed-responsibility file is accepted.

### 2. Production-shaped query and capacity evidence

- [ ] Restore a reproducible in-scope seed dataset for HRMS, Payroll, Build, Home, Chat, Calendar, Notifications, Knowledge and Accounting.
- [ ] Fix the current evidence failure: 43 read budgets are below minimum seed size and 27 are skipped because fixtures are absent. CRM and Inventory rows do not count toward acceptance.
- [ ] Run every in-scope read budget as the `streamline_app` role with `EXPLAIN (ANALYZE, BUFFERS)`.
- [ ] Retain row counts, plans, buffers, duration, indexes used, thresholds and proof that no required indexed path performs a full tenant/table scan.
- [ ] Exercise expensive reminder, export, fanout, unread, free/busy, recurrence, search/vector and dashboard paths.
- [ ] Run request-transaction load with realistic concurrency and record connection-pool saturation, queue age, memory, CPU, replica lag/fallback and error rate.
- [ ] Prove declared SLOs with at least 40% sustained capacity headroom and acceptable burst behavior.
- [ ] Verify cache keys include tenant, subject and permission dimensions where applicable; prove mutation invalidation, revocation invalidation, TTL correctness, stampede protection and fail-safe Redis degradation without cross-org leakage.
- [ ] Verify every growing list has a validated hard limit, deterministic order, unique tie-breaker, signed scope-bound cursor, filter/sort contract and no fetch-then-filter/count or per-row query expansion.

### 2A. Domain-specific release matrix

- [ ] Organization/Settings/RBAC: prove owner transfer, last-owner protection, admin/member/custom-role behavior, module owner/admin/member behavior, direct grants, descendant protection, organization switching and immediate revocation across backend and frontend routes.
- [ ] Home: prove every section is permission-scoped, privacy-safe, independently failure-isolated and bounded; one failing widget must not fail or leak the whole dashboard.
- [ ] HRMS and Payroll: prove self-service versus administrative scope, sensitive projection controls, approval routing, payroll locking/reconciliation, payslip publication, immutable financial history, export bounds and retry/idempotency.
- [ ] Build/PM and Workflows: prove project/workspace membership, ticket and board cursor stability, workflow schedules/secrets/versioning, retries, cancellation, approvals, idempotency and event-consumer behavior.
- [ ] Billing/Payments/Accounting: run real provider-sandbox webhook replay, outage and proration/seat-placement tests; prove entitlement caching, usage metering, tax/currency rules, invoice immutability, journal consistency, asynchronous exports/reminders and DLQ recovery.
- [ ] Chat/Inbox/Notifications: prove tenant/channel/thread authorization, ordering guarantees, duplicate-safe at-least-once delivery, fanout, reconnect/offline recovery, unread/read-state correctness without scans, revocation of issued realtime tokens and bounded history/export.
- [ ] Email and alerts: prove templates, localization, bounce/complaint/suppression handling, retry/DLQ, unsubscribe/consent behavior, provider failover policy, deliverability observability and no duplicate user-facing mail on replay.
- [ ] Calendar: prove RFC-compliant RRULE parsing, exceptions, timezone/DST boundaries, attendee privacy, free/busy and conflict correctness, reminder replacement/deduplication, provider synchronization and export limits.
- [ ] Knowledge/Wiki/Chatbot: prove revisions/version history, ingestion retry/idempotency, file lifecycle, malware gate, permissioned keyword/vector retrieval with ACL enforcement inside retrieval, citation/source integrity, deletion/purge/reindex and realistic-corpus latency.
- [ ] Frontend: prove responsive behavior, keyboard/screen-reader use, loading/empty/error/permission states, server-side pagination/filtering, route/action permission parity, bundle budgets, authenticated rendering performance and public-page SEO metadata.

### 3. Migration and database reproducibility

- [ ] Apply all journaled migrations to disposable staging and record zero pending/orphan/duplicate/unreachable entries there.
- [ ] Cold-bootstrap an empty database through migration head.
- [ ] Upgrade from the supported previous watermark and exercise interruption/retry.
- [ ] Exercise rollback or documented forward-fix using [RB-09](runbooks/RB-09-migration-rollback.md).
- [ ] Compare cold-bootstrap and upgraded catalogs: tables, columns, constraints, indexes, policies, functions, triggers and extensions must match.
- [ ] Retain environment identity, release SHA, command output, catalog diff and artifact hashes.

### 4. Production infrastructure and operations

- [ ] Provision independent per-cell database, Redis/cache, queue/workers, realtime/provider, search/vector, object storage and monitoring resources.
- [ ] Prove credentials, routing, jobs, cache namespaces and data cannot cross cells using [RB-01](runbooks/RB-01-cell-isolation.md) and [RB-08](runbooks/RB-08-cell-resource-accounts.md).
- [ ] Provision a physical read replica; measure lag and prove safe primary fallback using [RB-03](runbooks/RB-03-read-replica.md).
- [ ] Configure five-minute-or-better PITR/RPO and run restore, regional recovery and organization-relocation drills using [RB-02](runbooks/RB-02-pitr-backup.md) and [RB-04](runbooks/RB-04-recovery-drill.md).
- [ ] Run production-shaped load across every in-scope domain using [RB-05](runbooks/RB-05-production-load.md).
- [ ] Prove no tenant leakage, no dropped durable work, acceptable replica behavior, SLO compliance and at least 40% headroom.
- [ ] Measure and approve per-cell and per-active-tenant cost using invoice-derived rates and [RB-07](runbooks/RB-07-per-cell-cost.md).
- [ ] Configure production logs, traces and release metadata.
- [ ] Test live queue-age, DLQ, provider-failure, tenant-context, latency and recovery alerts; record human acknowledgement using [RB-06](runbooks/RB-06-live-alert-delivery.md).
- [ ] Capture passing RB-01 through RB-08 manifests under [production evidence](final-refactor/evidence/42-production-ops/README.md). The current evidence gate fails because no deployed manifests exist.
- [ ] Redact credentials and personal data; retain environment, region, cell, topology hash, release SHA, operator, timestamps, command/exit code and SHA-256 for every artifact.

### 4A. Deployment, rollback and incident readiness

- [ ] Prove backward-compatible application/database deployment across the supported rolling window; old and new application versions must coexist safely during migration.
- [ ] Run canary deployment with automated SLO/error-budget checks, tenant-isolation checks and abort thresholds before broad rollout.
- [ ] Verify feature flags, provider kill switches, queue pause/resume, degraded-mode behavior and rollback/forward-fix procedures under an induced failure.
- [ ] Verify health/readiness probes, graceful shutdown, connection draining, worker lease recovery and no duplicate/lost durable work during deploys and autoscaling.
- [ ] Publish current on-call ownership, escalation paths, incident severity definitions, customer/status communication procedure and post-incident review process.
- [ ] Prove backup artifacts are encrypted, access-controlled, restorable and periodically tested; document key ownership and rotation responsibilities.

### 5. Privacy, compliance and operator access

#### Operator access

- [ ] Approve eligible operator roles, mandatory reason/ticket, two-person approval, no self-approval, maximum duration, pending-grant expiry, organization/scope binding, tenant notification, immutable per-request audit, revocation, emergency handling and review cadence.
- [ ] Verify deployed customer-data and billing routes reject expired, revoked, wrong-organization, wrong-scope, unauthorized-role, concurrent-approval and audit-failure cases.
- [ ] Record named Product and Security decisions using [RB-10](runbooks/RB-10-privacy-compliance-decisions.md).

#### Data map and policy decisions

- [ ] Obtain named Privacy/DPO approval for identity/authentication, employment/payroll, communication, attendance, documents, recruitment, financial, audit/operator, AI and integration data.
- [ ] Record purpose, lawful basis, special-category basis, subjects, processors, location, retention, owner and deletion/archive behavior in [DATA-CATALOGUE.md](DATA-CATALOGUE.md).
- [ ] Decide whether PII is permitted in `audit_logs.metadata`; prefer stable references or irreversible hashes unless explicitly approved.
- [ ] Approve residency, international transfers, subprocessors/DPAs/SCCs, breach notification, payroll/tax jurisdictions and controller/processor responsibilities.
- [ ] Approve the AI/integration policy: providers/regions, PII minimization, retention, deletion and customer disclosure.

#### Subject rights and deletion

- [ ] Implement and deploy correction/rectification; do not claim correction when the system only exports, deletes or anonymizes.
- [ ] Make subject export exhaustive and resumable, or obtain accountable approval for every excluded source. A capped/truncated export fails.
- [ ] Run access/export, correction, portability, erasure, legal-hold, ownership-transfer, cross-tenant denial and repeat-request idempotency drills against disposable deployed data.
- [ ] Prove physical deletion or approved immutable retention for organization-owned database rows.
- [ ] Prove object-storage enumeration, failed-key retry, provider-version behavior and post-delete absence.
- [ ] Prove deletion or approved non-applicability for search/vector indexes, projections, caches, analytics, email, AI, integrations and downstream providers.
- [ ] Prove backup/PITR aging and restore-time deletion behavior.

#### Audit and retention

- [ ] Deploy migration `0930` in the target environment and verify the `audit_logs` append-only trigger as the application role. `UPDATE`/`DELETE` denial without the enabled trigger does not close the gate.
- [ ] Resolve retention for the four currently uncovered high-growth tables: `helpdesk_tickets`, `performance_reviews`, `mail_message_metadata` and `announcements`.
- [ ] Add approved bounded-retention or KEEP-FOREVER decisions and workers where required, then rerun `check:retention-coverage` to zero uncovered tables.
- [ ] Verify deployed retention workers are scheduled, bounded/resumable, audited, retryable and alerted on failure.
- [ ] Run retention and legal-hold conflict drills; immutable financial, payroll and audit obligations must be retained or reversed, never silently deleted.
- [ ] Prove no document/payroll policy or export/purge workflow silently skips or truncates work.

#### Approval and evidence

- [ ] Record Product, Security, Privacy/DPO, Operations, Legal and Finance approver name, role, decision, scope, rationale, date, review/expiry date, evidence and residual-risk disposition using [the decision template](decisions/README.md).
- [ ] Track every rejected or conditional risk with owner, mitigation and deadline. P0/P1 risk requires release-authority disposition and cannot be waived by the implementer.
- [ ] Store one redacted, hashed evidence bundle for deployed privacy drills.
- [ ] Close every P0/P1 privacy, security and compliance finding.

## Final release gate

All boxes below must be complete at the same release candidate:

- [ ] Every unchecked item above is complete with fresh evidence.
- [ ] CRM and Inventory remain explicitly excluded rather than counted as complete.
- [ ] All code, contract, schema, migration and focused test gates pass at one recorded commit.
- [ ] Representative E2E and outage/replay matrices pass in identified environments.
- [ ] Clean bootstrap and supported upgrade produce the same expected database catalog.
- [ ] Production evidence proves isolated cells, replica/PITR recovery, SLOs, 40% headroom, approved unit cost, live alerts and human acknowledgement.
- [ ] Privacy drills and required Product/Security/DPO/Operations/Legal/Finance approvals are recorded.
- [ ] No unresolved P0/P1 finding remains.
- [ ] Release authority records the commit, environment, evidence locations, accepted residual risks and approval date.

Until this gate is complete, report code implementation, production readiness and compliance readiness separately. Do not average them into a misleading “10/10”.
