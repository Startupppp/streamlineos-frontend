# StreamlineOS — Final 10/10 Completion PRD

**Status:** Authoritative remaining-work list

**Verified:** 2026-09-01
**Purpose:** Completing every applicable checkbox in this file, with the required evidence, is the final gate for a 10/10 rating across architecture, implementation, security, performance, maintainability, UX and operations.

This file supersedes older pending lists in reports, scorecards and session tickets. A completed item must not be reopened merely because an older document still describes it as pending. Reopen it only when current source or a current gate demonstrates a regression.

Excluded product domains are omitted completely. Shared platform work remains in scope only when it affects an included module or the deployability of the platform.

## 1. Completion rules

An item is complete only when all four conditions hold:

1. The implementation or explicit KEEP/NOT-IN-SCOPE decision is committed.
2. Tests prove the positive, negative and failure paths through the module's public interface.
3. The named verification gate passes from a clean checkout.
4. Runtime or production claims have real operational evidence; self-tests and runbooks alone do not count as production evidence.

Do not redesign a sound module for style. For every change, record the concrete failure it prevents. Prefer a deep module with a small interface and one load-bearing seam; do not add pass-through wrappers.

## 2. Verified baseline — do not report these as pending

The following were rechecked on 2026-09-01:

- Backend typecheck: PASS, zero errors.
- Frontend typecheck: PASS, zero errors.
- Migration ledger: 525/525 applied, zero pending, orphan, duplicate or unreachable entries.
- Tenant indexes: 731/731 tenant tables have a tenant-leading index declaration.
- Tenant isolation: 894/894 tenant-owned modules map to a negative test; execution evidence is 428 suites and 1,649 tests passing.
- Route classification: 3,558 handlers classified, zero undeclared.
- OpenAPI exposure: 3,569/3,569 operations classified.
- Error envelopes: 3,569/3,569 operations covered.
- Permission data scopes: 129/129 resolved scopes reach a query predicate.
- Module dependency injection: 216 modules and 1,640 classes checked, zero violations.
- Mock-surface gate: 3,123 doubles checked, zero phantom methods.
- Outbox consumer registry: every emitted event type has a registered consumer.
- Cache invalidation gate: zero documentation gaps.
- Dropped-column safety: 113 dropped columns checked, zero stale Drizzle declarations.
- Restrictive membership-FK gate: PASS.
- File-size gate and circular-dependency gates: PASS with only registered cohesive exceptions.
- Billing failure, replay, proration, invoice, entitlement and usage-metering tests: complete.
- Chat ordering, BOLA, fanout and reconnect evidence: complete.
- Calendar recurrence, DST, attendee, reminder and export evidence: complete.
- Notification/inbox delivery, deduplication, unread and cursor evidence: complete.
- Knowledge retrieval ACL, revision, ingestion and measured ANN evidence: complete.
- Home, Settings, HRMS, Payroll, Build/PM, Accounting and Workflows core module implementations: complete, subject to the cross-cutting items below.

## 3. P0 — Code, authority and data correctness

### 3.1 Finish organization actor contraction

Current evidence: `scan:legacy-actors:check` reports 617 organizational relationships globally; 501 are in included modules.

- [ ] Classify every included relationship as authority-bearing, historical-display-only, authentication identity or a genuine person/account bridge.
- [ ] Migrate every authority-bearing relationship to `organization_members.id` or the canonical organization-person seam.
- [ ] Add tenant-composite foreign keys and appropriate delete behavior.
- [ ] Backfill in bounded, resumable batches with unmappable, duplicate and cross-tenant reports.
- [ ] Update writers, readers, DTOs, validators, events, cache keys, search documents and membership-revocation cleanup.
- [ ] Preserve historical display without preserving current authority.
- [ ] Drop legacy compatibility columns only after runtime zero-use proof.
- [ ] Add explicit scanner allowlists for valid display/authentication relationships so the gate measures authority defects rather than demanding destructive cosmetic migrations.
- [ ] Require zero remaining actionable relationships in included modules.

Acceptance evidence:

- `pnpm -C backend scan:legacy-actors:check`
- `pnpm -C backend check:drop-column-safety`
- membership removal, departed-actor rendering and cross-tenant negative tests
- live catalog proof that each contracted column is absent

### 3.2 Close authorization proof gaps

- [ ] Add a table-driven self-escalation test: a principal cannot elevate their own organization or module role.
- [ ] Prove a module admin cannot grant equivalent/higher standing to a peer unless the authority matrix explicitly permits it.
- [ ] Prove membership, role and direct-grant revocation invalidates process-local and shared permission caches before the next protected request.
- [ ] Add service-principal/token scope-change audit evidence, expiry tests and last-used tracking tests.
- [ ] Keep canonical-owner-only ownership transfer structurally separate from ordinary admin permissions.

Acceptance evidence:

- organization owner/admin/member and module owner/admin/member mutation matrix
- custom-role, principal-group and direct-grant allow/deny tests
- cross-instance revocation test with a biting negative control

### 3.3 Complete object-storage erasure

- [ ] Add a deep `purgeOrgPrefix(orgId)` interface to the storage module.
- [ ] Resolve the organization's actual storage placement and prefix; never fall back to another region or bucket.
- [ ] Paginate object listing and batch deletion within provider limits.
- [ ] Make repeated execution idempotent and resumable.
- [ ] Return separate deleted, skipped and failed keys; never count a caught deletion error as success.
- [ ] Fix `GdprStoragePurgeService` so failed `deleteFile` calls remain failures.
- [ ] Respect active legal holds before listing or deleting bytes.
- [ ] Record a PII-safe audit event and durable completion/failure evidence.
- [ ] Run a disposable-data drill proving bytes are physically gone and a repeated purge is harmless.

Acceptance evidence:

- unit tests for pagination, partial failure, retry and placement isolation
- provider-adapter integration test
- legal-hold DENY test
- successful live disposable-data purge report

## 4. P0 — Query cost, pagination and API contracts

### 4.1 Eliminate baseline masking for database reads

Current evidence: `check:unbounded-reads` passes only because it matches a baseline of 128 offset paths and 1,180 unbounded-read candidates. A non-growing baseline is not zero-defect completion.

- [ ] Classify all 128 offset paths in included modules.
- [ ] Replace active large/high-growth lists with deterministic keyset cursors.
- [ ] For deliberately retained offset lists, prove a hard maximum page/depth and record a dated compatibility sunset.
- [ ] Classify all 1,180 unbounded-read candidates.
- [ ] Add an explicit bound, aggregate, stream/batch contract or reviewed false-positive exemption for every included candidate.
- [ ] Prohibit fetch-then-filter and fetch-then-count on tenant collections.
- [ ] Verify projections contain only fields needed by the caller.
- [ ] Add a gate that fails on any new offset/unbounded path and ratchets actionable included counts to zero.

Acceptance evidence:

- `pnpm -C backend check:unbounded-reads` reports zero actionable included violations
- stable-cursor duplicate/gap tests with tied sort values
- `EXPLAIN (ANALYZE, BUFFERS)` for high-growth paths as `streamline_app`

### 4.2 Finish production-shaped query evidence

- [ ] Exercise critical Home, HRMS, Payroll, Build/PM, Accounting, Chat, Calendar, Notifications and Knowledge paths with declared row distributions.
- [ ] Measure cold-cache and warm-cache behavior with tenant RLS enabled.
- [ ] Prove tenant-leading and sort-covering indexes are used where they are actually cheaper.
- [ ] Document planner-correct sequential scans rather than forcing indexes on small tables.
- [ ] Attach latency, buffer, row-estimate and query-count budgets to CI ratchets.
- [ ] Verify no N+1 query appears in list/detail fanout paths.

### 4.3 Close the two current OpenAPI gaps

Current evidence: request coverage is 1,360/1,361 and response coverage is 3,568/3,569.

- [ ] Mark `POST /accounting/reports/export/jobs/{jobId}/cancel` as an intentional bodyless action or give it an explicit body schema.
- [ ] Add a declared 2xx response contract for `GET /platform/visit`.
- [ ] Regenerate backend OpenAPI and re-vendor the exact contract to the frontend.
- [ ] Raise request and response contract gates to 100% applicable coverage without rounded percentages hiding a missing operation.

Acceptance evidence:

- `pnpm -C backend check:openapi-coverage` reports 1,361/1,361 and 3,569/3,569
- `pnpm -C backend openapi:check`
- frontend contract-vendor and contract-drift gates

### 4.4 Prove API and export cleanup

- [ ] Compare every controller route with OpenAPI, frontend callers, jobs, webhooks and external integrations.
- [ ] Consolidate genuinely overlapping routes behind one canonical interface.
- [ ] Preserve compatibility only through an explicit deprecated adapter with owner and removal date.
- [ ] Resolve the frontend dead-code report's 64 unproven exports/types in included modules using runtime evidence, graph proof and builds.
- [ ] Confirm mail and unified inbox are distinct product interfaces rather than duplicated routes.
- [ ] Confirm billing subscription routes have one canonical owner.

Acceptance evidence:

- zero dead files
- zero unowned/unproven included exports
- zero duplicate operation IDs and zero undocumented aliases
- backend and frontend production builds after deletion

## 5. P0 — Migration and recovery integrity

- [ ] Resolve the 135 non-fatal `42P01` migration-chain gaps instead of accepting them as historical noise.
- [ ] Repair the `0143` rollback type mismatch involving `timesheet_budget_status`.
- [ ] Require every new forward migration to have a truthful rollback or an explicit irreversible/data-loss declaration.
- [ ] Re-run cold bootstrap and upgrade-to-head after the fixes.
- [ ] Compare tables, columns, types, constraints, indexes, RLS policies and migration hashes between cold and upgraded databases.
- [ ] Re-run the rollback/recovery drill for all cutover migrations.
- [ ] Update the migration evidence to the final head; do not retain stale 515/515, 524/524 or other superseded counts.

Acceptance evidence:

- migration ledger has zero pending/orphan/duplicate/unreachable entries
- chain-gap count is zero for included/shared deployability
- cold and upgraded catalog comparison has zero unexplained differences
- rollback drill has zero unexplained failures

## 6. P1 — Async, email and external-provider reliability

- [ ] Introduce one shared outbound-provider seam with timeout, bounded retry, exponential backoff/jitter and circuit-breaker state.
- [ ] Apply it to payment, email, AI, search, webhook and storage adapters where calls can block a request or worker.
- [ ] Define which failures are retryable, terminal or dead-lettered per provider.
- [ ] Prove consumer idempotency beyond status checks using stable event/source keys.
- [ ] Document user-visible at-least-once semantics for messages, notifications, exports and external side effects.
- [ ] Re-check recipient authorization at delivery time for permission-sensitive email/notification deliveries.
- [ ] Add localized, versioned email templates with deterministic fallback.
- [ ] Retain the existing signed bounce/complaint handling and suppression evidence.
- [ ] Add domain-specific DLQ/replay tests and runbooks for billing, payroll, Build/PM, Chat, Calendar, Knowledge and Workflows.
- [ ] Define cancellation semantics for every long-running export/import/AI job; explicitly mark non-cancellable jobs.

## 7. P1 — Security, privacy and compliance

- [ ] Add field-level PII redaction tests for logs, traces, error envelopes and provider failure payloads.
- [ ] Approve and commit the data catalogue mapping personal-data class to purpose, lawful basis, retention period and owner.
- [ ] Approve residency, transfer and subprocessor decisions.
- [ ] Approve break-glass/operator access, dual approval, maximum duration and post-access review.
- [ ] Implement the operator-session guard that consumes approved grants and records every privileged action.
- [ ] Complete export, database erasure, object-storage erasure and legal-hold conflict drills as one end-to-end workflow.
- [ ] Verify immutable audit evidence cannot be edited or removed by tenant administrators.
- [ ] Define secret rotation ownership and evidence for provider, storage, database and signing credentials.

## 8. P1 — UX, accessibility, SEO and frontend performance

### 8.1 Responsive and accessibility proof

- [ ] Add automated accessibility testing with an established engine and keyboard-focused integration tests.
- [ ] Test included authenticated modules at 375px, 768px and 1280px.
- [ ] Verify navigation, dialogs, drawers, tables, kanban, calendars, notification drawers and chat sidebars are keyboard usable.
- [ ] Verify focus trapping/restoration, semantic labels, error announcements and destructive-action confirmation.
- [ ] Verify WCAG AA contrast and reduced-motion behavior.
- [ ] Verify localization, timezone and currency formatting at module interfaces.
- [ ] Record and fix module-specific responsive defects rather than declaring global component coverage sufficient.

Included sign-off surfaces: Organization/RBAC, Home, Settings, HRMS, Payroll, Build/PM, Billing, Accounting, Chat, Calendar, Notifications/Inbox, Knowledge/Wiki/Chatbot, Workflows, Mail and Support.

### 8.2 SEO and web performance

- [ ] Add `robots: { index: false, follow: false }` metadata to the authenticated layout; `robots.txt` alone is advisory.
- [ ] Verify canonical URLs, metadata, sitemap inclusion and structured data for every intentionally public page.
- [ ] Prove no tenant content reaches a public render or shared cache.
- [ ] Establish Core Web Vitals budgets for representative mobile and desktop profiles.
- [ ] Add Lighthouse/Web Vitals CI ratchets for LCP, INP and CLS.
- [ ] Measure route JavaScript, hydration cost, server response time and image/font behavior on the main public and authenticated shells.

## 9. P1 — Database growth and retention

- [ ] Identify every high-growth table: messages, notifications, audit logs, usage events, outbox/delivery rows, search chunks and activity history.
- [ ] Record a measured partition, archival or retention decision for each.
- [ ] Implement bounded retention workers with legal-hold exclusions and resumable cursors.
- [ ] Prove retention does not break immutable financial/payroll/audit obligations.
- [ ] Add real slow-query telemetry and alerts tied to named query/seam budgets.

## 10. P1 — Test and release engineering

- [ ] Run the dedicated backend e2e configuration against disposable infrastructure and record discovered, passed, failed and skipped suites.
- [ ] Ensure no e2e suite can exit zero after failing discovery or setup.
- [ ] Remove the deprecated `ts-jest` isolated-modules configuration warning.
- [ ] Add dependency vulnerability, license and supply-chain gates.
- [ ] Generate an SBOM and retain it with each release artifact.
- [ ] Produce reproducible backend/frontend artifacts with recorded hashes.
- [ ] Add environment-schema validation before boot and deployment.
- [ ] Require feature-flag owner and removal date.
- [ ] Add release notes, change owner, canary criteria, rollback criteria and post-release smoke verification.
- [ ] Wire schema/event compatibility checks into CI rather than leaving them as runbook-only commands.

## 11. P2 — Real production infrastructure and operability

Code self-tests and runbooks do not close this section.

- [ ] Provision independently isolated per-cell database, cache, object storage, search/vector, realtime, worker and monitoring resources.
- [ ] Provision a physical read replica and set `DB_REPLICA_URL`.
- [ ] Prove primary-required versus replica-safe routing under real lag and replica failure.
- [ ] Run all production-shaped workloads from a colocated runner.
- [ ] Prove at least 40% sustained capacity headroom and burst survival.
- [ ] Measure and approve per-cell database, cache, AI, storage, realtime, worker and egress cost.
- [ ] Configure `ALERT_WEBHOOK_URL`, `APP_RELEASE` and the production log stream.
- [ ] Send every critical alert through the real on-call destination and record human acknowledgement.
- [ ] Define an SLO, owner, alert and runbook for each included module and critical queue.
- [ ] Re-run PITR, regional recovery and cell-relocation drills against the final production topology.

## 12. Final module sign-off

After sections 3–11 are complete, run one final audit for each included module:

- [ ] Organization and organization/module RBAC
- [ ] Home
- [ ] Settings
- [ ] HRMS
- [ ] Payroll
- [ ] Build/PM
- [ ] Billing and Payments
- [ ] Accounting and Finance
- [ ] Chat
- [ ] Calendar
- [ ] Notifications and unified Inbox
- [ ] Knowledge Base, Wiki and Chatbot
- [ ] Workflows
- [ ] Mail
- [ ] Support
- [ ] Shared platform, API, storage, search, realtime and worker modules

Each sign-off must cover data model, authorization, CRUD lifecycle, list/search cost, caching/realtime, module interface and structure, UX/accessibility, security, operations and tests. A KEEP verdict is valid when evidence proves the existing design is sound.

## 13. Final 10/10 release gate

- [ ] Backend typecheck, build, unit, integration and e2e suites pass.
- [ ] Frontend typecheck, build, tests, accessibility and Web Vitals budgets pass.
- [ ] OpenAPI request, response, error, exposure, path and operation-ID coverage is 100% applicable.
- [ ] Organization/module/record authorization and tenant-isolation gates pass.
- [ ] Actor, unbounded-read, pagination, dead-code and migration actionable counts are zero.
- [ ] Cache, outbox, retry, DLQ, replay and provider-failure drills pass.
- [ ] Cold bootstrap, upgrade, rollback, PITR and relocation evidence matches the release head.
- [ ] Production load, replica, capacity, cost, alert acknowledgement and compliance evidence is attached.
- [ ] All human security, privacy, residency and operator decisions are approved.
- [ ] No P0/P1 or unexplained failing/skipped mandatory gate remains.

Only after every applicable checkbox above is complete may the platform be rated 10/10 across all aspects.
