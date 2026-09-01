# OPERATOR-EVIDENCE.md

Operator-evidence index for the StreamlineOS architecture refactor.
Each row is either **PASS (with evidence)** or **OPEN — operator-blocked**.

A self-test passing proves the **guard is correct and can fail**: it is NOT evidence that the production infrastructure exists. These are deliberately separate columns.

Last updated: 2026-09-01

---

## Evidence index

| # | Item | Guard self-test | Infrastructure | Status | Runbook |
|---|---|---|---|---|---|
| 1 | Independent cell isolation — separate compute, cache, object storage, search, realtime, worker and monitoring per cell (namespace-only separation does not pass) | PASS 2026-08-30 | Not provisioned | **OPEN — operator-blocked** | [RB-01](runbooks/RB-01-cell-isolation.md) |
| 2 | PITR / backup frequency meeting the five-minute operational RPO | PASS 2026-08-30 | Not confirmed | **OPEN — operator-blocked** | [RB-02](runbooks/RB-02-pitr-backup.md) |
| 3 | Physical read replica — provisioned, lag measured, replica-safe vs primary-required paths proved under real lag | PASS 2026-08-31 (self-test: 16 cases — prereq detection, endpoint distinction, RLS classification, watermark alignment, lag classification, LSN distance classification) | Not provisioned — `DB_REPLICA_URL` absent; script exits 2 (prerequisite missing) rather than 0 | **OPEN — operator-blocked** | [RB-03](runbooks/RB-03-read-replica.md) |
| 4 | Recovery drill — measured RPO and RTO | PASS 2026-08-30 (structure + result shape verified) | Not drilled | **OPEN — operator-blocked** | [RB-04](runbooks/RB-04-recovery-drill.md) |
| 5 | Production-shaped load — all 14 workload objectives with declared geography/device/network/cache, ≥40% headroom, burst survived | PASS 2026-08-30 (guard detects BREACHED and NOT_DRIVEN) | Not run on live infra | **OPEN — operator-blocked** | [RB-05](runbooks/RB-05-production-load.md) |
| 6 | Live alert delivery + acknowledgement — `ALERT_WEBHOOK_URL`, `APP_RELEASE`, production log stream; test event through every on-call destination; human ACK recorded | PASS 2026-08-31 (12 alert self-tests pass: 11 delivery/dispatch probes + `check-alert-ack` which verifies the detection of unacknowledged state) | `ALERT_WEBHOOK_URL` not configured; no operator has run the interactive drill and confirmed a nonce | **OPEN — operator-blocked** | [RB-06](runbooks/RB-06-live-alert-delivery.md) |
| 7 | Per-cell cost — cost per active org/member/message/job; saturation forecast; trended daily across releases | PASS 2026-08-30 (anomaly detector fires, breach detected) | No trend data; live infra needed | **OPEN — operator-blocked** | [RB-07](runbooks/RB-07-per-cell-cost.md) |
| 8 | Compliance drill — GDPR export, deletion, retention and legal-hold end to end with disposable data | VERIFIED 2026-09-01 (all 4 drills executed against live DB: export PASS, erasure PASS, legal-hold 8/8 PASS, compliance audit 7 rows present) | Export worker and storage purge not built — code gaps remain | **OPEN — code gaps remain** | See [Compliance gaps](#compliance-gaps) |

| 9 | Break-glass / operator-access policy — time-bound, dual-approved, reasoned, audited | Code gaps: `OperatorSessionGuard` + `OperatorAuditInterceptor` not built | DB schema only (migration 0747) | **OPEN — code gaps + AWAITING APPROVAL** | [RB-10 §1](runbooks/RB-10-privacy-compliance-decisions.md) |
| 10 | Data inventory, lawful purpose, retention owner and residency policy | No automated enforcement | No retention-sweep worker | **AWAITING OPERATOR APPROVAL** | [RB-10 §2–3](runbooks/RB-10-privacy-compliance-decisions.md) |
| 11 | Regional transfer and subprocessor decisions | No SCCs or subprocessor list in-product | Subprocessors active: Neon/Upstash/R2/Resend/Ably/OpenAI/Composio | **AWAITING OPERATOR APPROVAL** | [RB-10 §4](runbooks/RB-10-privacy-compliance-decisions.md) |

**7 of 11 rows are OPEN — operator-blocked. 0 rows are PASS. 1 row (compliance, #8) is OPEN with code gaps. 3 rows (#9–11) require operator policy decisions before code can close them.**

Production readiness is below 10/10 until all rows are executed and evidence is filed.

---

## Self-test summary (2026-08-30)

These self-tests prove the guards are structurally correct. They are NOT production evidence.

### PASS

| Script | Command | Result |
|---|---|---|
| cell:backup | `node src/scripts/cell-backup.mjs --self-test` | PASS: parents precede children and the cycle is reported |
| cell:isolation | `node src/scripts/verify-cell-isolation.mjs --self-test` | PASS: shared database reported as failure; NAMESPACED is a recognised verdict |
| cell:compare-schema | `node src/scripts/compare-cell-schema.mjs --self-test` | PASS: missing and unexpected objects both reported |
| cell:capacity | `node src/scripts/run-cell-capacity.mjs --self-test` | PASS: breach detected — guard can fail |
| cell:unit-cost | `node src/scripts/run-cell-unit-cost.mjs --self-test` | PASS: anomaly detector fired on 500-cost outlier |
| cell:drill | `node src/scripts/run-recovery-drill.mjs --self-test` | PASS: drill script structure and result shape correct |
| cell:relocate | `node src/scripts/relocate-org.mjs --self-test` | PASS: illegal transition rejected, post-flip rollback rejected |
| cell:relocate-data | `node -r ts-node/register/transpile-only src/scripts/relocate-org-data.ts --self-test` | PASS: routing state excluded, uncovered table reported, post-flip rollback refused |
| cell:rollout | `node -r ts-node/register/transpile-only src/scripts/run-cell-rollout.ts --self-test` | PASS: healthy canary DEPLOY (p99=1395ms), regressed canary ROLLBACK (p99=2701ms, +93.6%) |
| cell:relay | `node -r ts-node/register/transpile-only src/scripts/verify-cross-cell-relay.ts --self-test` | PASS: cross-cell-local event refused with CrossCellEventRefusedError |
| cell:chain-repair | `node src/scripts/generate-chain-repair.mjs --self-test` | PASS: source-only table emitted as repair SQL, identical catalogs emit nothing |
| load:drive | `node src/scripts/run-load-driver.mjs --self-test` | PASS: BREACHED and NOT_DRIVEN reported correctly |
| browser:measure | `node src/scripts/browser-driver.mjs --self-test` | PASS: 3 navigations, min TTFB=1.4ms — driver can measure |
| failure-drill | `node src/scripts/failure-drill.mjs --self-test` | PASS: all 5 drills present, dry-run enforced, cache-loss blocked, bad-release blocked |
| alert:dispatch | `node src/scripts/alert-dispatch.mjs --self-test` | PASS: dedup, suppress, delivery, owner/runbook/alertId in body |
| alert:dead-outbox | `node src/scripts/alert-dead-outbox.mjs --self-test` | PASS: fires on dead row, clears on stale |
| alert:dead-delivery | `node src/scripts/alert-dead-delivery.mjs --self-test` | PASS: fires on dead row, clears on stale |
| alert:sig-failures | `node src/scripts/alert-sig-failures.mjs --self-test` | PASS: fires on failing endpoint, clears on stale |
| alert:tenant-ctx-errors | `node src/scripts/alert-tenant-ctx-errors.mjs --self-test` | PASS: 2 matched, correct correlationId/orgId/route |
| alert:p95 | `node src/scripts/alert-p95.mjs --self-test` | PASS: stale excluded, IDs collapsed, p95/p99 computed correctly |
| alert:seam-latency | `node src/scripts/alert-seam-latency.mjs --self-test` | PASS: db.query.execute breached, cache.roundtrip not |
| alert:queue-age | `node src/scripts/alert-queue-age.mjs --self-test` | PASS: fresh clear, stale age breaches, high retry fires |
| alert:pool-saturation | `node src/scripts/alert-pool-saturation.mjs --self-test` | PASS: p95 breach fires, saturation warn fires |
| alert:tenant-cost | `node src/scripts/alert-tenant-cost.mjs --self-test` | PASS: noisy org detected, normal orgs clear |
| check:alert-ack | `node src/scripts/check-alert-ack.mjs --self-test` | PASS (2026-08-31): 6 cases — missing file detected, fresh ACK passes, false/null acked fails with UNACKNOWLEDGED, stale ACK fails, state file round-trip. Live check exits 2 (ALERT_WEBHOOK_URL not set) |
| cell:replica | `node src/scripts/verify-replica-routing.mjs --self-test` | PASS (2026-08-31): 16 cases — prereq detection (both vars), distinct endpoint, same endpoint rejected, RLS 42501/wrong-state/no-error, watermark match/drift, lag classification (not-a-replica/within/exceeds), LSN distance (not-receiving/within/exceeds). Live check exits 2 (DB_REPLICA_URL not set) |
| check:migration-chain | `node src/scripts/verify-migration-chain.mjs --self-test` | PASS: 10 cases — unjournalled, duplicate prefix, timestamp regression, orphan, watermark, gaps |
| check:route-classification | `node src/scripts/route-classification-report.mjs --self-test` | PASS: all 14 classification cases correct |
| check:permission-keys | `node src/scripts/check-permission-keys.mjs --self-test` | PASS: all 18 cases correct including ghost-key detection |
| check:tenant-indexes | `node src/scripts/check-tenant-indexes.mjs --self-test` | PASS: all 15 cases — leading index, trailing fail, no-index fail |
| check:scope-application | `node src/scripts/check-scope-application.mjs --self-test` | PASS: all 12 cases correct |
| check:record-access | `node src/scripts/check-record-access.mjs --self-test` | PASS: all 11 cases correct |
| check:module-entitlement | `node src/scripts/check-module-entitlement.mjs --self-test` | PASS: all 6 cases correct |
| check:module-lifecycle | `node src/scripts/check-module-lifecycle.mjs --self-test` | PASS: all 20 cases correct |
| check:idempotent-commands | `node src/scripts/check-idempotent-commands.mjs --self-test` | PASS: all 6 cases correct |
| check:tenant-isolation | `node src/scripts/check-tenant-isolation-coverage.mjs --self-test` | PASS: all 7 cases correct |
| check:log-secrets | `node src/scripts/check-log-secrets.mjs --self-test` | PASS: all 10 cases correct |
| check:outbox-consumers | `node src/scripts/check-outbox-consumers.mjs --self-test` | PASS: orphan detection identifies 1 violation |
| check:placement-bypass | `node src/scripts/check-placement-bypass.mjs --self-test` | PASS: all 29 cases correct |
| check:owner-authority | `node src/scripts/check-owner-authority.mjs --self-test` | PASS: fabrication, gate, shortcut and elevation correctly distinguished |
| verify:rbac-integrity | `node src/scripts/verify-rbac-referential-integrity.mjs --self-test` | PASS: namespace folding and verdict classification correct |
| scan:legacy-actors | `node src/scripts/scan-legacy-org-actors.mjs --self-test` | PASS: 563 FKs found, all known examples verified |
| check:navigation-permissions | `node src/scripts/check-navigation-permissions.mjs --self-test` | PASS: all 19 cases correct |
| compliance:drill (dry-run) | `node --env-file-if-exists=.env src/scripts/compliance-drill.mjs` | PASS 2026-09-01: 7 audit rows created, all required actions present; 3 code gaps reported honestly |
| drill:export | `node --env-file-if-exists=.env src/scripts/drill-export.mjs <email>` | PASS 2026-09-01: subject found, export INSERT dry-run succeeded, 202 storage-key columns found, cross-tenant 0 rows, in-tenant 1 row |
| drill:erasure (dry-run) | `node --env-file-if-exists=.env src/scripts/drill-erasure.mjs <non-owner-email>` | PASS 2026-09-01: 633 FK tables enumerated from pg_catalog, 469 deletion-ordered, 0 residual rows in rolled-back tx |
| drill:legal-hold | `node --env-file-if-exists=.env src/scripts/drill-legal-hold.mjs <email> <org-id>` | PASS 2026-09-01: 8/8 — hold placed, erasure blocked, retention blocked, org-hold placed, both released, erasure unblocked |

### FAIL (cannot run self-test)

| Script | Command | Failure | Root cause |
|---|---|---|---|
| db:check-read-budgets | `node src/scripts/run-read-cost-budgets.mjs --self-test` | `relation "chat_messages" does not exist` | Missing table in DB (chat schema not yet applied to dev DB) — out of ownership |
| openapi:check | `node -r ts-node/register/transpile-only src/scripts/check-openapi-fresh.ts --self-test` | `Cannot find module './hiring'` | `backend/src/db/schema/hr/offboarding.ts` imports `./hiring` which does not exist — out of ownership |
| cell:admission | `node -r ts-node/register/transpile-only src/scripts/verify-cell-admission.ts --self-test` | `Cannot find module './hiring'` | Same root cause |
| cell:degraded | `node -r ts-node/register/transpile-only src/scripts/verify-cell-degraded-control-plane.ts --self-test` | `Cannot find module './hiring'` | Same root cause |
| auth:benchmark | `node -r ts-node/register/transpile-only src/scripts/benchmark-access-service.ts --self-test` | `Cannot find module './hiring'` | Same root cause |

---

## Compliance gaps

`compliance:drill` runs end to end and exits 0. The drill itself confirms: audit log rows are written for all 6 required actions (export request, legal hold placed, erasure rejected while held, hold released, retention policy, org purge scheduled). The dry-run rolls back cleanly. **However, the drill itself documents three gaps that it cannot close:**

### Gap 1 — Export worker not implemented

**What exists:** `hr_data_requests` tracks export requests with a `type=export`, `status=pending` row. The audit log confirms the request was received.

**What is missing:** No worker processes the request and produces an actual data file. There is no job queue consumer, no data serialisation pipeline, no secure download URL, and no delivery mechanism for the exported file.

**Required interface (for another lane to build):**
```
Module: backend/src/modules/compliance/ (or backend/src/modules/hr/data-requests/)
Worker: ExportDataRequestWorker
  - Triggered by: outbox event "hr_data_request.created" where type="export"
  - Input: { orgId, subjectUserId, requestId, requestedBy }
  - Steps:
      1. Collect all tenant-owned data for subjectUserId:
         - hr_people, hr_employments, organization_members, audit_logs, hr_data_requests
         - chat_messages (where sender or participant)
         - notifications, user_permission_grants
      2. Serialize to JSON or CSV archive.
      3. Upload to object storage at: orgs/{orgId}/exports/{requestId}/data-export-{timestamp}.zip
      4. Generate a signed download URL (TTL: 7 days).
      5. Update hr_data_requests SET status='completed', file_url=<signed-url>, completed_at=now().
      6. Write audit_log: action="hr_data_request.completed".
      7. Notify requestedBy via notification system.
  - Error path: SET status='failed', write audit_log: action="hr_data_request.failed".
  - The worker must run inside forEachOrg context (no ambient tenant GUC from cron).
```

### Gap 2 — Object storage purge not implemented

**What exists:** `PURGE_ADAPTER_REGISTRY.object_storage` returns `{ status: "FAILED", message: "not yet implemented, manual cleanup required" }`. The org is marked `PURGE_SCHEDULED` in the database.

**What is missing:** No code physically removes the organization's object storage objects.

**Required interface (for another lane to build):**
```
Module: backend/src/modules/storage/ (StorageService or a dedicated PurgeService)
Method: purgeOrgPrefix(orgId: string): Promise<{ deletedCount: number; errors: string[] }>
  - List all objects under prefix: orgs/{orgId}/
  - Batch-delete in chunks of 1000 (S3/R2 batch delete API).
  - List objects under prefix: chat-attachments/{orgId}/
  - Batch-delete.
  - Continue until ListObjectsV2 returns isTruncated=false.
  - Write audit_log: action="storage.org_prefix_purged", metadata: { deletedCount, orgId }.
  - Return { deletedCount, errors }.

Integration point:
  - Called by the org purge saga after database_rows adapter marks statusV2=PURGED.
  - Must succeed before the purge job records completion.
  - Error must halt the saga and alert (do not silently skip storage on error).
```

### Gap 3 — Database rows adapter does not cascade-delete

**What exists:** The `database_rows` adapter marks `organizations.status_v2 = 'PURGED'`. This is a soft flag only.

**What is missing:** Physical deletion of tenant-owned rows across all tables for the organization. Soft-marking is not erasure under GDPR.

**Required design (for another lane to build):**

Physical deletion must follow the `purge-user.mjs` pattern: derive deletion order from `pg_catalog` (951 NO ACTION FKs), delete leaf tables first, then work up the dependency chain. The org deletion order is:
1. All leaf tables with `org_id FK → organizations` and no outgoing FKs.
2. Mid-level tables in dependency order.
3. `organization_members`, `organization_people`, `org_modules`, etc.
4. `organizations` row last.

The deletion must be batched (1000 rows per transaction) and logged. It must not run inside a single long transaction (lock contention). Use `forEachOrg`-style iteration with the tenant GUC set per batch.

---

## Operator access design

**PRD §20 requirement:** "Operator/support access is time-bound, approved, reasoned and audited."

**AWAITING OPERATOR APPROVAL — see [RB-10](runbooks/RB-10-privacy-compliance-decisions.md) §1 for
the decision-ready document with concrete options and a recommended default.**

**Current state (2026-09-01):**
- Migration `0747` applied: `platform_operator_access_grants` table exists with `approver_id != granted_by` DB CHECK (convalidated).
- `assertGrant` in `backend/src/modules/platform/` checks `status = 'active'`.
- No HTTP-layer enforcement: `OperatorSessionGuard`, `OperatorAuditInterceptor` and `OperatorAccessService` are not built.
- No content-blind default: a platform operator JWT can read any route their role permits.

**Implementation files needed (for another lane, after policy decision):**
- `backend/src/modules/platform/operator-access.service.ts` — session creation, approval, expiry
- `backend/src/db/schema/common/platform-operator.ts` — `platform_operator_access_requests` table
- `backend/src/common/auth/operator-session.guard.ts` — enforces time-bound + content-blind
- `backend/src/common/interceptors/operator-audit.interceptor.ts` — writes audit row on every operator request

---

## OUT-OF-OWNERSHIP

| Issue | File | Change needed |
|---|---|---|
| `./hiring` module missing from HR schema | `backend/src/db/schema/hr/offboarding.ts:9` | Create `backend/src/db/schema/hr/hiring.ts` or fix the import; blocks 4 TypeScript-based self-tests and the full OpenAPI check |
| `chat_messages` table missing from dev DB | DB schema state | Apply the chat schema migration to the development database; blocks `db:check-read-budgets:self-test` |
| Export worker not implemented | `backend/src/modules/compliance/` (does not exist yet) | Build the export data request worker per the interface specified above |
| Storage purge not implemented | `backend/src/modules/storage/` | Add `purgeOrgPrefix` method per the interface specified above |
| Database rows adapter does not delete | Org purge saga | Implement physical batch deletion in dependency order |
| Operator access design | `backend/src/modules/platform/` | Build operator-access service, schema, guard and audit interceptor |
