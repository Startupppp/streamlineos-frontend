# P8 Production Evidence — Operator-Blocked Rows

**Lane:** P8 (documentation only)
**Date:** 2026-08-31
**Source reviewed:** PRD-IN-SCOPE.md §28, PRD1-reconciliation.md, L31-operator-evidence-report.md, S7-LIVE-DEV-EVIDENCE.md, CELL-RUNBOOK.md, RUNBOOKS.md, COMPLIANCE-WORKFLOWS.md, runbooks/RB-01 through RB-07

Runbooks RB-01 through RB-07 already exist at `architecture-refactor/runbooks/`. This document does not duplicate them. It enumerates every Bucket D row, maps each to its runbook(s), states what evidence closes it and what partial proof already exists, then produces an operator dependency checklist.

---

## 1. All 15 Bucket D rows

| # | PRD §28 location | Row summary | Runbook(s) |
|---|---|---|---|
| D01 | §28.2a P1 contracts | Separate code proof from infrastructure proof | RB-01 through RB-07 |
| D02 | §28.2a P1 contracts | Resolve operator/compliance decisions (export, erasure, retention, legal-hold) | RB-08 (this document §4) |
| D03 | §28.10 Billing | Exercise billing during placement change, provider outage, Redis outage, webhook redelivery | RB-09 (this document §4) |
| D04 | §28.14 Notifications | Configure durable alerting for queue age, pending intents, dead letters | RB-06 |
| D05 | §28.16 Security | Configure `ALERT_WEBHOOK_URL`, `APP_RELEASE` and live production log stream | RB-06 |
| D06 | §28.16 Security | Send test alerts through every on-call destination and record acknowledgement | RB-06 |
| D07 | §28.16 Security | Complete export, retention, legal-hold and erasure drills | RB-08 (this document §4) |
| D08 | §28.16 Cell | Provision independently isolated cell compute, cache, object storage, search, realtime, worker, monitoring | RB-01 |
| D09 | §28.16 Cell | Provision PITR/backup frequency meeting 5-minute RPO | RB-02 |
| D10 | §28.16 Cell | Provision physical read replica and prove behavior under real lag | RB-03 |
| D11 | §28.16 Cell | Re-run all 14 workload objectives with production-shaped data | RB-05 |
| D12 | §28.16 Cell | Meet every latency objective with 40% sustained headroom | RB-05 |
| D13 | §28.16 Cell | Measure and approve per-cell cost and saturation forecast | RB-07 |
| D14 | §28.16 Cell | Record operator-owned blockers as blockers (meta-rule) | — (satisfied by this document) |
| D15 | §28.16 Query cost | Seed or obtain production-shaped data | RB-05 precondition |

---

## 2. Row-by-row analysis

### D01 — Separate code proof from infrastructure proof

**PRD row:** §28.2a — "Separate code proof from infrastructure proof. Provision or deliver an operator-owned runbook for independent cells, physical replica, PITR restore, production-shaped load/headroom, cost, live alert delivery and acknowledgement."

**What closes it:** RB-01 through RB-07 each closed, with evidence artifacts committed to `architecture-refactor/runbooks/evidence/`.

**Why it cannot come from this workstation:** All seven runbooks require external infrastructure — a second Neon project, an Upstash Redis instance, a Cloudflare R2 bucket, an Ably application, a load-test destination, billing credentials. None exist in the development environment.

**Partial proof already committed:**
- Self-tests for all seven scripts pass: `cell:isolation:self-test`, `cell:backup:self-test`, `cell:degraded:self-test`, load-driver tests (S7-LIVE-DEV-EVIDENCE.md §Reproducible checks).
- The tooling structure is correct and the guards can fail — proved by neutering each self-test and confirming the expected failure appears.
- `cell:isolation` already reports `ISOLATED` for the cell database and `NAMESPACED` for Redis, R2, realtime, worker, and monitoring — naming exactly what to provision to reach `ISOLATED`.

**Where the partial proof stops:** The scripts report NAMESPACED not ISOLATED; the second Neon compute endpoint does not exist; no production log stream is configured.

**Acceptance criterion:** `cell:isolation --region=cell-2` reports `ISOLATED` for all seven categories; evidence file committed.

---

### D02 / D07 — Compliance: export, erasure, retention, legal-hold

**PRD rows:** §28.2a — "Resolve operator/compliance decisions explicitly" and §28.16 Security — "Complete export, retention, legal-hold and erasure drills with disposable data and auditable cleanup."

**What closes it:** A real end-to-end exercise that (a) produces an actual data export file, (b) physically purges object-storage content under an org prefix, and (c) physically deletes tenant data rows — not just marks them `statusV2=PURGED`.

**Why it cannot come from this workstation:** Three things are missing from the code, not just infrastructure:
1. No export worker exists. `hr_data_requests` tracks requests; nothing produces a data file.
2. `organization-purge-adapters.ts` `object_storage` adapter returns `FAILED ("not yet implemented")`.
3. The `database_rows` adapter marks `statusV2=PURGED` but does not cascade-delete.

Until these code gaps are filled by another lane, no operator action can close this row.

**Partial proof already committed:**
- `compliance-drill.mjs --dry-run` exits 0, produces 7 audit rows, and reports its own gaps honestly (COMPLIANCE-WORKFLOWS.md).
- The audit model (legal-hold blocks erasure, retention policy lifecycle, org purge scheduling) is correct.

**Where the partial proof stops:** Dry-run. No file produced, no storage purge, no physical row deletion.

**Acceptance criterion (for operator, after code gaps are filled):**
1. Run `node backend/src/scripts/compliance-drill.mjs --execute` against a disposable org with real object-storage credentials.
2. Confirm the export file appears at the expected signed URL.
3. Confirm `object_storage` adapter reports `DONE` (not `FAILED`).
4. Confirm the `database_rows` adapter's physical deletion ran: `SELECT COUNT(*) FROM <tenant_table> WHERE org_id = '<drill-org-id>'` returns 0.
5. Capture the full output to `architecture-refactor/runbooks/evidence/RB-08-compliance-<date>.txt` and commit.

**Code gaps that must be fixed first (not this lane):**
- Export worker that writes to object storage and updates `hr_data_requests.status = 'COMPLETE'` with a signed URL.
- `PURGE_ADAPTER_REGISTRY.object_storage` implementation calling `StorageService.purgeOrgPrefix(orgId)`.
- Physical row deletion loop in the `database_rows` adapter.
- Operator access design: time-bound session, approval record, content-blind role, row-level audit trail (design is in OPERATOR-EVIDENCE.md).

---

### D03 — Billing under cell failure and provider outage

**PRD row:** §28.10 — "Exercise billing/payment behavior during placement change, provider outage, Redis outage and webhook redelivery."

**What closes it:** A live test that (a) places an org in cell-2, (b) takes cell-2's Redis offline, (c) fires a payment webhook, and (d) proves the webhook is persisted via the provider-event ledger, deduplicated on replay, and the entitlement cache serves from the local snapshot without a provider call.

**Why it cannot come from this workstation:** Requires a real second cell (different Neon project, different Redis instance), a real payment provider webhook delivery (Stripe/Razorpay test mode), and the ability to deliberately disrupt cell-2's Redis connection — none of which exist in the development environment.

**Partial proof already committed:**
- `billing/core/provider-event-ledger.ts` three-state webhook ledger exists and is verified in code (PRD1-reconciliation §28.10).
- Unit tests for webhook idempotency exist; they do not exercise multi-cell infrastructure.

**Where the partial proof stops:** Unit-level. No multi-cell infrastructure, no real provider test-mode webhook delivery.

**Acceptance criterion (runbook RB-09):**
1. Cell-2 is provisioned and an org is placed in it via `pnpm -C backend cell:place-org --region=cell-2 --kind=internal`.
2. Configure a Stripe/Razorpay test-mode webhook endpoint pointing to the cell-2 API.
3. Trigger a test payment event from the provider dashboard.
4. Confirm `SELECT delivery_state FROM provider_event_ledger WHERE provider_event_id = '<id>'` = `'DELIVERED'`.
5. Simulate Redis failure by setting `REGION_CELL_2_UPSTASH_REDIS_REST_URL` to an invalid value; replay the same webhook.
6. Confirm the ledger still records `'DELIVERED'` (deduplication) and the entitlement read does not call the provider: check logs for no outbound provider request.
7. Restore Redis; confirm entitlement cache repopulates on next request.
8. Record full output to `architecture-refactor/runbooks/evidence/RB-09-billing-cell-failure-<date>.txt`.

---

### D04 / D05 / D06 — Alert configuration and live delivery

**PRD rows:** §28.14 — "Configure durable alerting for queue age, pending intents, dead letters..." and §28.16 Security — "Configure `ALERT_WEBHOOK_URL`, `APP_RELEASE` and a live production log stream" / "Send test alerts through every on-call destination and record acknowledgement."

**What closes them:** `ALERT_WEBHOOK_URL` set to a real webhook receiver (Slack/PagerDuty/Opsgenie); `APP_RELEASE` set to the current deployed release identifier; `APP_LOG_STREAM=true`; each alert script exits 0 and the on-call channel shows the notification; an operator acknowledges each alert type.

**Why it cannot come from this workstation:** `ALERT_WEBHOOK_URL` is not in `.env`; no production log stream is configured; alert scripts have no receiver to deliver to.

**Partial proof already committed:**
- Alert scripts exist and self-test: `alert-dispatch.mjs`, `alert-dead-outbox.mjs`, `alert-dead-delivery.mjs`, `alert-sig-failures.mjs`, `alert-tenant-ctx-errors.mjs`, `alert-p95.mjs`, `alert-seam-latency.mjs`, `alert-tenant-cost.mjs`.
- RUNBOOKS.md covers each alert type with first-three-checks and resolution confirmation.
- RB-06 documents the exact operator steps.

**Where the partial proof stops:** Scripts exit 0 in self-test mode; no real webhook delivery has occurred.

**Acceptance criterion:** Follow RB-06. Confirm each on-call destination shows the test message within 60 seconds; record the message ID/timestamp as acknowledgement evidence.

---

### D08 — Independent cell isolation

**PRD row:** §28.16 Cell — "Provision independently isolated cell compute, cache, object storage, search, realtime, worker and monitoring resources; namespace-only separation does not pass."

**What closes it:** `pnpm -C backend cell:isolation --region=cell-2` reports `ISOLATED` (not `NAMESPACED`) for every resource category.

**Why it cannot come from this workstation:** Current state is `SHARED` (compute — same Neon project as `neondb`) and `NAMESPACED` (Redis, R2, realtime, worker, monitoring). Closing each requires provisioning a separate resource — a second Neon project, a second Upstash instance, a second R2 bucket, a second Ably application, a dedicated worker process.

**Partial proof already committed:**
- Database: already `ISOLATED` — cell-2 has its own logical database, migration chain, and RLS on the `NOBYPASSRLS` role.
- Compute: `SHARED (unavoidable today)` — same Neon compute endpoint. CELL-RUNBOOK.md §Compute documents the exact provisioning steps.
- Redis: `NAMESPACED` — key prefix separation is in place; a second Upstash instance closes this.
- R2: `NAMESPACED` — path prefix is in place; a dedicated bucket closes this.
- Realtime: `NAMESPACED` — Ably channel prefix is in place; a second Ably app closes this.
- Worker: `NAMESPACED` — cron lease key includes cell ID; a per-cell worker process closes this.
- Monitoring: `NAMESPACED` — log lines carry `cellId`; a per-cell log stream closes this.

**Acceptance criterion:** Follow RB-01. All seven resource categories report `ISOLATED`.

---

### D09 — PITR / backup at 5-minute RPO

**PRD row:** §28.16 Cell — "Provision PITR/backup frequency that meets the five-minute operational RPO."

**What closes it:** Neon PITR enabled on the production branch; `history_retention_seconds >= 86400`; a restore drill proves the last restorable point is never more than 5 minutes old.

**Why it cannot come from this workstation:** Neon PITR requires a Neon Pro plan and a `NEON_API_KEY`. The current drill evidence (`S7-LIVE-DEV-EVIDENCE.md`) shows `rpo_operational_seconds: 21600` (6 hours) — the backup interval, not PITR. The gap: `REGIONAL_DISASTER` RPO is unverified because no `NEON_API_KEY` and no scripted branch-restore exercise exist.

**Partial proof already committed:**
- `cell:backup` and `cell:backup:self-test` pass (RB-02).
- The restore cycle (backup → drop → rebuild → restore → verify) completes with `integrity.ok: true` for `CELL_DB_FAILURE`.
- `rto_met: true` (1175s vs 3600s target) for logical restore.

**Where the partial proof stops:** RPO is 6 hours (not 5 minutes) because no automated backup schedule exists. `REGIONAL_DISASTER` (Neon PITR) is unverified.

**Acceptance criterion:** Follow RB-02. Neon API response shows `history_retention_seconds >= 86400`; restore drill confirms last restorable point is within 5 minutes.

---

### D10 — Physical read replica

**PRD row:** §28.16 Cell — "Provision a physical read replica and prove replica-safe versus primary-required workload behavior under real lag."

**What closes it:** `DB_REPLICA_URL` set to a real Neon read replica; `pnpm -C backend cell:replica` runs against the live replica and confirms replica-safe queries route correctly and that read-after-write paths use primary.

**Why it cannot come from this workstation:** `DB_REPLICA_URL` is absent from `.env` (S7-LIVE-DEV-EVIDENCE.md §Credential capability). No Neon read replica is provisioned.

**Partial proof already committed:**
- `src/db/replica-router.ts` selects the replica connection when `DB_REPLICA_URL` is set.
- Pool-selection unit tests pass.
- Lag-simulation tests exist but are skipped with a comment: "pending Neon replica provisioning."

**Where the partial proof stops:** Routing code is correct; no replica exists to route to.

**Acceptance criterion:** Follow RB-03. Provision the replica via the Neon console; set `DB_REPLICA_URL`; confirm lag-simulation tests un-skip and pass; confirm read-after-write paths use primary under artificial lag.

---

### D11 / D12 — Workload objectives and latency headroom

**PRD rows:** §28.16 Cell — "Re-run all 14 workload objectives with production-shaped data" and "Meet every latency objective with at least 40% sustained-resource headroom."

**What closes them:** `pnpm -C backend cell:load` reports all 14 objectives MET with declared geography/device/network/cache conditions; headroom (1 − p95/target) ≥ 0.40 for every objective.

**Why it cannot come from this workstation:** The load driver is currently running from a development workstation over the public internet, not colocated with the cell. No production-shaped dataset exists (D15). The current evidence (`S7-LIVE-DEV-EVIDENCE.md`): 10,677 requests at 66.73 req/s; several objectives are `NOT_DRIVEN` with `reason` fields stating what would be needed.

**Partial proof already committed:**
- Load-driver self-tests: 14/14 PASS — the driver correctly interpolates percentiles, handles empty samples, and refuses to divide by zero.
- Every PRD latency objective is listed, each either driven or has a written `NOT_DRIVEN` reason.
- Capacity history: 3 entries; cost history: 8 entries.

**Where the partial proof stops:** `NOT_DRIVEN` objectives need a real colocated deployment; headroom cannot be measured from a public internet runner.

**Acceptance criterion:** Follow RB-05. A colocated load runner within the same region as the cell produces all 14 objectives MET with p95 headroom ≥ 40%.

---

### D13 — Per-cell cost and saturation forecast

**PRD row:** §28.16 Cell — "Measure and approve per-cell cost, cost per active organization/member/message/job and saturation forecast."

**What closes it:** Dollar-denominated unit-cost evidence derived from real vendor invoices; at least 3 cost-history entries separated by 24 hours; an owner's written approval of the per-cell saturation forecast.

**Why it cannot come from this workstation:** Vendor rate variables are absent from `.env` (S7-LIVE-DEV-EVIDENCE.md: `NEON_COMPUTE_RATE_USD_PER_HOUR`, `CLOUDFLARE_R2_STORAGE_RATE_USD_PER_GB_MONTH`, etc. all missing). Unit-cost tooling self-test passes but reports dimensionless numbers, not dollars.

**Partial proof already committed:**
- Cost-history: 8 entries exist in the capacity tracker.
- Unit-cost tooling self-test: `SELF-TEST PASS: anomaly detector fired on 500-cost outlier`.
- Capacity tooling self-test: `SELF-TEST PASS: breach detected`.

**Where the partial proof stops:** Entries are dimensionless (no vendor rates); the forecast cannot be approved without dollar figures.

**Acceptance criterion:** Follow RB-07. Set all vendor rate env vars from real invoices; run `cell:cost`; commit the dollar-denominated cost report to `architecture-refactor/runbooks/evidence/RB-07-cost-<date>.txt`; get written cost-owner approval.

---

### D14 — Record operator blockers as blockers (meta-rule)

**PRD row:** §28.16 Cell — "Record operator-owned blockers as blockers; never convert missing infrastructure into a passing code-only claim."

**What closes it:** This document, and the commitment that no Bucket D row will be ticked before its runbook evidence file is committed.

**Partial proof:** This document is the artifact. Every D row above names the specific gap, the partial proof boundary, and the acceptance criterion. No row is ticked.

---

### D15 — Production-shaped data

**PRD row:** §28.16 Query cost — "Seed or obtain production-shaped data for the blocked read-budget criterion."

**What closes it:** A dataset with organization, membership, and tenant data at the scale declared in the workload PRD; `EXPLAIN (ANALYZE, BUFFERS)` run as `streamline_app` with the tenant GUC set, against that dataset, showing the targeted indexes are used.

**Why it cannot come from this workstation:** The development database has empty or sparsely seeded tenant tables. `db:check-read-budgets:self-test` fails with `relation "chat_messages" does not exist` in the dev DB (L31 report). Building a production-shaped dataset requires representative seed scripts (not yet written) or a sanitized production snapshot (requires operator approval and a privacy review).

**Partial proof already committed:**
- Performance baselines committed (`db8eb6725`) but not as role-specific measurement on a shaped dataset.
- `read-cell-logs.mjs` and `check-read-budgets.mjs` exist and self-test.

**Where the partial proof stops:** Self-test only; no shaped data exists to measure against.

**Acceptance criterion:** A seed script or operator-approved snapshot populates at least 10,000 organizations, 100,000 memberships, and 1,000,000 rows per high-volume table; `pnpm -C backend db:check-read-budgets` exits 0 against that dataset with all planned queries using the declared indexes.

---

## 3. What partial proof is already in place

| D# | Code / tooling complete | Self-test passes | Infrastructure provisioned | Live evidence |
|---|---|---|---|---|
| D01 | Yes (7 scripts) | Yes | No | No |
| D02 | Partial (audit model only) | Dry-run only | No | No |
| D03 | Yes (ledger code) | Unit tests only | No | No |
| D04/05/06 | Yes (8 alert scripts) | Yes | No | No |
| D08 | Database only | Yes | Database only | No |
| D09 | Logical backup only | Yes | No Neon PITR | Logical: RTO met, RPO missed |
| D10 | Routing code | Pool-level only | No replica | No |
| D11/12 | Load driver | Yes (14/14) | No colocated run | Partial: 3 entries, public-internet run |
| D13 | Unit-cost script | Yes | No vendor rates | 8 dimensionless entries |
| D14 | This document | — | — | This document |
| D15 | Read-budget script | Partial (fails in dev) | No shaped data | No |

---

## 4. New runbook stubs — RB-08 and RB-09

These two rows are not covered by the existing RB-01 through RB-07.

### RB-08 — Compliance drill end-to-end

**Preconditions:**
1. Code gaps filled: export worker, `StorageService.purgeOrgPrefix`, and physical row deletion in the `database_rows` adapter (currently product-blocked, not operator-blocked).
2. Object storage credentials set in `.env`: `R2_BUCKET_NAME`, `R2_ENDPOINT`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`.
3. `COMPLIANCE_DRILL_ORG_PREFIX=drill-` set so the drill org is clearly synthetic.
4. Operator has `platform-operator` role with time-bound session and approval record (design in OPERATOR-EVIDENCE.md).

**Steps:**
```bash
cd backend
node src/scripts/compliance-drill.mjs --execute
```

**Expected output:**
```
Step 0 — synthetic org created
Step 1 — export request submitted
Step 2 — legal hold placed
Step 3 — erasure rejected (hold active)  ✓
Step 4 — legal hold released
Step 5 — retention policy applied
Step 6 — erasure request accepted
Step 7 — org purge scheduled → object_storage DONE, database_rows DONE
7 audit rows present.
COMPLIANCE DRILL PASSED
```

**Acceptance criterion:** All 7 audit rows present, `object_storage DONE`, `database_rows DONE`, export file retrievable via signed URL, `SELECT COUNT(*) FROM any_tenant_table WHERE org_id = '<drill-org>'` returns 0 after physical deletion.

**Evidence recording:** `architecture-refactor/runbooks/evidence/RB-08-compliance-<date>.txt`.

---

### RB-09 — Billing under cell failure and provider outage

**Preconditions:**
1. Cell-2 is provisioned and has passed RB-01 (isolated compute, Redis, R2).
2. An org is placed in cell-2: `pnpm -C backend cell:place-org --region=cell-2 --kind=internal`.
3. A Stripe or Razorpay test-mode webhook endpoint is configured pointing at the cell-2 API.
4. `STRIPE_WEBHOOK_SECRET` (or equivalent) is set in the cell-2 environment.

**Steps:**
```bash
# 1. Trigger a test payment event from provider dashboard (Stripe → Webhooks → Send test event)
# 2. Confirm delivery:
psql $REGION_CELL_2_APP_DATABASE_URL -c \
  "SELECT provider_event_id, delivery_state FROM provider_event_ledger ORDER BY created_at DESC LIMIT 5"
# Expected: delivery_state = 'DELIVERED'

# 3. Simulate Redis failure:
# Temporarily set REGION_CELL_2_UPSTASH_REDIS_REST_URL to an invalid value in the cell-2 process env.
# Replay the same webhook from the provider dashboard.
# Confirm: delivery_state remains 'DELIVERED' (deduplication); no outbound provider call in logs.

# 4. Simulate provider outage:
# In Stripe test mode, disable the webhook endpoint; fire a new payment event through Stripe CLI:
stripe trigger payment_intent.succeeded
# Confirm the event is queued in the outbox and retried on re-enable.
psql $REGION_CELL_2_APP_DATABASE_URL -c \
  "SELECT delivery_state, retry_count FROM provider_event_ledger WHERE delivery_state = 'PENDING' LIMIT 5"

# 5. Restore Redis. Confirm entitlement cache repopulates on next /billing/entitlements request.
# Check logs: no outbound call to the payment provider on entitlement read.
```

**Expected output:** Ledger shows `DELIVERED`, duplicate is rejected, entitlement read served from local cache.

**Acceptance criterion:** Zero double-charges (idempotency key reuse returns `DELIVERED` on replay), entitlement served locally without provider call, outage-queued event delivers after re-enable.

**Evidence recording:** `architecture-refactor/runbooks/evidence/RB-09-billing-cell-failure-<date>.txt`.

---

## 5. Operator dependency checklist

Work top to bottom. A later step cannot be executed without the earlier one.

| # | Dependency on | Action | Runbook |
|---|---|---|---|
| 1 | Nothing | Create second Neon project for cell-2 compute | CELL-RUNBOOK.md §Compute |
| 2 | Nothing | Create second Upstash Redis instance | CELL-RUNBOOK.md §Redis |
| 3 | Nothing | Create dedicated R2 bucket for cell-2 | CELL-RUNBOOK.md §Object storage |
| 4 | Nothing | Create second Ably application for cell-2 | CELL-RUNBOOK.md §Realtime |
| 5 | Nothing | Enable Neon PITR on the production branch | RB-02 §Step 1 |
| 6 | Nothing | Provision Neon read replica; set `DB_REPLICA_URL` | RB-03 |
| 7 | Nothing | Set `ALERT_WEBHOOK_URL`, `APP_RELEASE`, `APP_LOG_STREAM=true` | RB-06 |
| 8 | Nothing | Set vendor rate env vars from real invoices | RB-07 |
| 9 | 1–4 set in `.env.cell-2` | Bootstrap cell-2 schema: `pnpm -C backend cell:bootstrap --region=cell-2` | CELL-RUNBOOK.md §Build |
| 10 | 9 | Run isolation check: `pnpm -C backend cell:isolation --region=cell-2` → all ISOLATED | RB-01 |
| 11 | 5 | Run PITR drill: insert sentinel, branch-restore, verify sentinel present | RB-02 §Step 2 |
| 12 | 6 | Run replica lag tests; confirm read-after-write uses primary | RB-03 |
| 13 | 10 | Place a test org in cell-2; run cell degraded drill | CELL-RUNBOOK.md §Degraded |
| 14 | 7 | Send test alerts through each on-call destination; record acknowledgement | RB-06 |
| 15 | 8 | Produce dollar-denominated cost report; get cost-owner approval | RB-07 |
| 16 | Code gaps filled (export worker, storage purge, physical delete) | Run compliance drill: `compliance-drill.mjs --execute` | RB-08 |
| 17 | 10, production-shaped data | Run load driver colocated with cell; confirm 14 objectives MET with ≥40% headroom | RB-05 |
| 18 | 10, 13, real payment webhook | Run billing cell-failure drill | RB-09 |
| 19 | 14–18 | Record full recovery drill with `pnpm -C backend cell:drill` | RB-04 |
| 20 | All above | Commit all evidence files to `architecture-refactor/runbooks/evidence/` | — |

**Code prerequisites (must be fixed by another lane before operator can act):**
- `backend/src/db/schema/hr/offboarding.ts:9` — imports `./hiring` which does not exist; blocks 4 TypeScript self-tests.
- Export worker that writes a data file to object storage.
- `StorageService.purgeOrgPrefix(orgId)` implementation.
- Physical row deletion in the `database_rows` compliance adapter.
- Operator access design: time-bound session, approval record, content-blind role, row-level audit trail.
