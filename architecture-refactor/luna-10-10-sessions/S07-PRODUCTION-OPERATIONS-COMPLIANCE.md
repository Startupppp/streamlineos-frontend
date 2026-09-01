# Session 07 — Production Operations, Privacy, and Compliance Evidence

## Objective

Close the non-code release gates with reproducible evidence. A self-test proves that a guard can fail; it does not prove that production infrastructure is configured. Never simulate production evidence or record an approval without a named approver.

**Status snapshot:** 2026-09-01. Code-side runbooks, the GDPR export worker, subject-storage purge, retention sweep, and dual-control operator grant lifecycle are present and self-tested. The release remains **BLOCKED** by missing production evidence, named approvals, incomplete purge/retention coverage, and infrastructure gaps below.

## Scope and evidence rules

This session owns infrastructure/runbooks/CI configuration, production deployment evidence, alert destinations, load and cost reports, disaster-recovery drills, and security/privacy approval records. It does not own CRM, Inventory, or code assigned exclusively to Sessions 01–06.

For every runtime claim, record the environment, region, release SHA, topology manifest hash, cell, dataset, operator, exact command, exit code, UTC timestamp, artifact path, and SHA-256. Redact credentials, tokens, raw PII, and customer content. A blocked item stays unchecked: code-ready, self-test-passed, and runbook-exists are not production-verified.

## Required evidence and current verdict

| Gate | Current verdict | Closure condition |
|---|---|---|
| Independent cells: database, cache, object storage, search/vector, realtime, workers, monitoring | **BLOCKED — operator** | Provision separate resources and run bootstrap, schema comparison, isolation, and admission for every production cell. Namespace prefixes alone do not pass. |
| Physical read replica, DB_REPLICA_URL, routing, lag and failover | **BLOCKED — operator** | Provision a real replica, configure DB_REPLICA_URL, run replica routing/isolation, measure lag, and observe primary fallback under induced failure. |
| PITR/RPO, restore, regional recovery and cell relocation | **PARTIAL** | Logical/Neon branch restore is code-ready and has fixture coverage; rerun against final migration/RLS baseline and exercise regional recovery and relocation with measured RPO/RTO. |
| Production-shaped load, 40% sustained headroom, burst, cost per cell | **BLOCKED — operator** | Run colocated load/headroom/burst tests and publish invoice-derived unit-cost evidence. |
| Live alert transport, release metadata, delivery and human acknowledgement | **BLOCKED — operator** | Configure ALERT_WEBHOOK_URL and APP_RELEASE, send a real test event, retain the nonce/receipt, and record on-call acknowledgement. |
| Corpus ingestion, search ACL/vector behavior, retention/purge/reindex | **PARTIAL** | Run realistic authorized/unauthorized tenant cases and retain ingestion, ACL, vector, reindex, purge, and retention evidence. |
| GDPR export and erasure, legal hold, physical object purge, retention | **PARTIAL — coverage and infrastructure** | Export worker, subject-storage purge, object-key enumeration/deletion, legal-hold checks, and HR retention sweep exist. The export is not exhaustive; physical organization-row deletion, several purge adapters, document/payroll retention, and live disposable-tenant evidence remain open. |
| Break-glass, dual control, grant duration, audit review | **PARTIAL — approval and request-surface gaps** | The service enforces a four-hour maximum, second-person approval, expiry/revocation, tenant scope, and audit writes. Obtain named Product/Security approval and verify eligible-role, per-request audit, notification, and review controls. |
| Data inventory, lawful purpose, residency, transfers, subprocessors, retention | **BLOCKED — approval** | Record DPO/legal decisions and named policy owners before release. |

## Verification commands

Run from the repository root and capture exact output:

```powershell
pnpm -C backend cell:bootstrap --region=cell-2
pnpm -C backend cell:compare-schema --region=cell-2
pnpm -C backend cell:isolation --region=cell-2
pnpm -C backend cell:admission
pnpm -C backend cell:replica
pnpm -C backend cell:isolation:replica
pnpm -C backend drill:pitr
pnpm -C backend cell:drill
pnpm -C backend load:drive
pnpm -C backend cell:load
pnpm -C backend cell:unit-cost
pnpm -C backend alert:test-event
pnpm -C backend check:alert-ack
pnpm -C backend drill:export <subject-email>
pnpm -C backend drill:erasure <subject-email>
pnpm -C backend drill:legal-hold <subject-email> <org-id>
pnpm -C backend compliance:drill
```

Commands requiring unavailable credentials or infrastructure are recorded as blocked, never replaced with fixtures.

## Repository verification snapshot

Run on 2026-09-01 from `backend/`. These prove code behavior only:

| Check | Result | Limitation |
|---|---|---|
| `cell:isolation:self-test` | **PASS** | Fixture guard; no isolated production cell. |
| `cell:replica:self-test` | **PASS — 16 cases** | Live checks skipped because DB_REPLICA_URL is absent. |
| `drill:pitr:self-test` | **PASS** | Restore assertions only; not regional recovery. |
| `cell:load:self-test` | **PASS (negative fixture)** | Correctly rejects 39% headroom; no production load report. |
| `cell:unit-cost:self-test` | **PASS** | Anomaly detector fixture only. |
| `alert:dispatch:self-test` and `check:alert-system` | **PASS** | No live receipt or human acknowledgement. |
| `check:retention-coverage:self-test` | **PASS** | Classifier fixture; document/payroll coverage remains incomplete. |
| `drill:erasure:self-test` | **PASS** | FK-ordering fixture; no destructive erasure. |

The transcript must be copied to immutable evidence artifacts with release SHA, topology hash, environment, UTC timestamp, and SHA-256 before production checkboxes are closed.

## External blocker and approval register

| ID | Owner | Exact action | Evidence/hash | UTC timestamp | Result | Sign-off |
|---|---|---|---|---|---|---|
| B01 | Platform ops / DBA | Provision isolated cell resources and run isolation/admission | TBD | TBD | **OPEN** | TBD |
| B02 | Platform DBA | Provision replica, configure DB_REPLICA_URL, measure lag/failover | TBD | TBD | **OPEN** | TBD |
| B03 | Platform ops / SRE | Run PITR, regional recovery, and relocation on final topology | TBD | TBD | **OPEN** | TBD |
| B04 | SRE / performance owner | Run colocated load/headroom/burst and publish report | TBD | TBD | **OPEN** | TBD |
| B05 | Platform ops / finance | Supply invoice-derived rates and three ≥24-hour samples | TBD | TBD | **OPEN** | TBD |
| B06 | SRE / on-call owner | Configure live alert delivery and human acknowledgement | TBD | TBD | **OPEN** | TBD |
| B07 | Privacy / platform engineering | Complete exhaustive export, physical purge, object purge, and retention coverage | TBD | TBD | **OPEN** | TBD |
| B08 | Product + Security | Approve and enforce operator-access policy and review controls | TBD | TBD | **OPEN** | TBD |
| B09 | DPO / legal | Approve inventory, lawful purpose, retention, residency, transfers, subprocessors | TBD | TBD | **OPEN** | TBD |

## Exit criteria

- [x] This document defines scope, status semantics, commands, thresholds, artifacts, owners, and blockers.
- [ ] Every required production artifact is attached, reproducible, safely redacted, and hashed.
- [ ] Every infrastructure blocker is closed or explicitly accepted by the accountable release authority.
- [ ] Every required approval names an accountable approver, role, scope, and review date.
- [ ] Status/evidence documents contain only current verified numbers and clearly labelled blocked/partial results.
- [ ] Exhaustive export, physical database erasure, object-storage purge, retention sweep, and operator-access enforcement are implemented and verified.
- [ ] Final release review has no unresolved P0/P1 operational or compliance finding and records residual risk.

## Current-session todo reconciliation

This is the authoritative stop condition. Only behavior actually exercised by repository self-tests is checked; production, destructive-operation, and approval items remain unchecked until evidence rules are met.

- [x] Evidence contract and fail-closed commands documented.
- [x] Repository self-tests for isolation, replica predicates, PITR assertions, load guard, cost guard, alert dispatch, retention classification, and FK ordering completed.
- [ ] Production cells provisioned and admitted with non-vacuous isolation evidence.
- [ ] Replica, recovery/relocation, colocated load/headroom/burst, live alert acknowledgement, and invoice-derived cost evidence attached.
- [ ] Exhaustive GDPR export, physical database purge, complete retention coverage, and required external purge systems implemented and verified.
- [ ] Operator-access policy accepted by named Product/Security approvers with route enforcement and review evidence.
- [ ] DPO/legal approvals recorded.
- [ ] Final P0/P1 review and release-authority decision recorded.

**Session verdict: INCOMPLETE / RELEASE BLOCKED.** The checked repository items are complete, but the mandatory unchecked items cannot be truthfully closed from this workspace alone.
