# Session 07 — Production Operations, Privacy, and Compliance Evidence

## Objective

Close the non-code release gates with reproducible evidence. A self-test proves that a guard can fail; it does not prove that production infrastructure is configured. Never simulate production evidence or record an approval without a named approver.

**Status snapshot:** 2026-09-01. Code-side runbooks and verification scripts are substantially ready. The release remains **BLOCKED** by the operator actions below and by unresolved compliance implementation gaps.

## Ownership and boundaries

This session owns infrastructure/runbooks/CI configuration, production deployment evidence, alert destinations, load and cost reports, disaster-recovery drills, and security/privacy approval records.

It does not own CRM, Inventory, public landing routes/components/providers/animation, or code work assigned exclusively to Sessions 01–06. Record cross-session findings in the owning session's handoff table; do not weaken a scanner, baseline, classification, or gate to obtain a pass.

## Evidence rules

- Use production or a disposable production-shaped environment for runtime claims; name the environment, region, release, commit, dataset, and operator.
- Store command output, dashboard export, or immutable artifact under the referenced evidence path. Include a SHA-256 hash for exported artifacts and a UTC timestamp.
- Redact credentials, tokens, raw PII, and customer content. A redacted screenshot is acceptable only when the underlying export is retained securely and its hash is recorded.
- Every approval names the approver, role, decision, scope, expiry/review date, and linked policy or ticket.
- A blocked item stays unchecked. “Code-ready”, “self-test passed”, or “runbook exists” is not “production verified”.

## Required evidence and current verdict

| Gate | Current verdict | Evidence / closure condition |
|---|---|---|
| Independent cells: database, cache, object storage, search/vector, realtime, workers, monitoring | **BLOCKED — operator** | `PRODUCTION-OPERATIONS-STATUS.md` §1; provision separate resources, then run `cell:bootstrap`, `cell:compare-schema`, `cell:isolation`, and `cell:admission`. Namespace prefixes alone do not pass. |
| Physical read replica, `DB_REPLICA_URL`, routing, lag and failover | **BLOCKED — operator** | `backend/docs/RB-REPLICA-ROUTING.md`; provision a real replica, set `DB_REPLICA_URL`, run `pnpm -C backend cell:replica` and `pnpm -C backend cell:isolation:replica`, then run lag tests. |
| PITR/RPO, restore, regional recovery and cell relocation | **PARTIAL** | PITR branch drill passed 2026-08-31 and logical RTO was 19.6 minutes. Re-run after the current migration/RLS baseline, then exercise regional recovery and relocation against final topology. |
| Production-shaped load, 40% sustained headroom, burst, cost per cell | **BLOCKED — operator** | `WORKLOAD-RESULTS.md` is non-colocated; run `load:drive`, `cell:load`, and the 100 req/s burst from a colocated deployment and publish a new report. |
| Live alert transport, release metadata, log stream, delivery and human acknowledgement | **BLOCKED — operator** | Predicates and local transport are verified. Configure `ALERT_WEBHOOK_URL` and `APP_RELEASE`, run `alert:test-event`, retain the nonce, and record human acknowledgement. |
| Corpus ingestion, search ACL/vector behavior, retention/purge/reindex | **PARTIAL** | Run against a realistic corpus with authorized and unauthorized tenants. Record ingestion, ACL, vector, reindex, purge, and retention results; fail closed for missing ACL revisions. |
| GDPR export and erasure, legal hold, physical object purge, retention | **PARTIAL — code gaps** | Live export/erasure/legal-hold/compliance drills passed 2026-09-01, but the export worker, physical-delete adapter, object-storage purge adapter, and retention worker are incomplete. |
| Break-glass, dual control, grant duration, audit review | **BLOCKED — code + approval** | `runbooks/RB-10-privacy-compliance-decisions.md` §1; implement/enforce the design, then obtain named product/security approval. |
| Data inventory, lawful purpose, residency, transfers, subprocessors, retention | **BLOCKED — approval** | `RB-10-privacy-compliance-decisions.md` §§2–4; record decisions and policy owners before release. |

## Acceptance thresholds and topology binding

Each report must identify the versioned topology manifest hash, deployed release SHA, cell, region, dataset, and configuration. The runbook named in the table is the authority for the threshold; if two documents disagree, stop and record the discrepancy rather than choosing a favorable value.

| Control | Minimum acceptance |
|---|---|
| Cell isolation | Every required resource reports `ISOLATED`; `SHARED`, `NAMESPACED`, empty-schema, cross-cell visibility, or watermark mismatch fails. |
| Replica | Distinct endpoint, app-role/RLS checks pass, migration watermarks match, lag stays within the active RB-03 threshold, and primary fallback is observed under induced replica failure. |
| Recovery | Record measured RPO and RTO separately. A restore drill is not regional recovery; regional recovery requires deployment repointing, traffic cutover, health verification, and post-cutover RLS/migration checks. |
| Load | All 14 workload objectives are driven from the declared colocated geography and the cell retains at least 40% sustained resource headroom; the burst does not shed authentication or billing-ledger traffic. |
| Alerts | Real production destination receives the event with release/cell/org/request correlation metadata; an on-call human acknowledges the recorded nonce within the runbook SLA. |
| Privacy | Positive and negative tenant/ACL cases pass; post-export/erasure scans find zero unauthorized residual rows or objects; legal hold blocks erasure/retention until released; every action is auditable. |

## Verification commands

Run from the repository root and capture the exact command, exit code, environment, release SHA, and artifact hash.

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

Commands requiring unavailable credentials or infrastructure must be recorded as blocked; do not replace them with a fixture and claim completion. Before destructive erasure, use the dry-run, verify the subject and legal-hold state, and obtain the required approval.

## External blocker and approval register

One row is required for every item that cannot be closed from repository evidence. The owner completes the row; the session author does not fabricate values.

| ID | Owner | Environment / scope | Exact action | Evidence URL or artifact hash | UTC timestamp | Result | Sign-off identity |
|---|---|---|---|---|---|---|---|
| B01 | Platform ops / DBA | Cell 2 and dependent resources | Provision isolated compute, Redis, object storage, search/vector, realtime, workers, and monitoring; run isolation/admission | TBD | TBD | **OPEN** | TBD |
| B02 | Platform DBA | Cell 2 database | Provision replica, set `DB_REPLICA_URL`, run routing/isolation, measure lag, exercise fallback | TBD | TBD | **OPEN** | TBD |
| B03 | Platform ops / SRE | Final topology and recovery region | Re-run PITR, regional recovery, and relocation; record measured RPO/RTO and RLS/migration checks | TBD | TBD | **OPEN** | TBD |
| B04 | SRE / performance owner | Colocated cell deployment | Run load/headroom/burst and publish immutable report | TBD | TBD | **OPEN** | TBD |
| B05 | Platform ops / finance | Billing period and cell set | Supply invoice-derived rates, run unit-cost report, collect 3 samples ≥24h apart, approve forecast | TBD | TBD | **OPEN** | TBD |
| B06 | SRE / on-call owner | Production alert destination | Set webhook/release metadata, send test event, retain receipt and human ACK | TBD | TBD | **OPEN** | TBD |
| B07 | Privacy / platform engineering | Disposable compliance tenant | Implement and run export worker, physical deletion, object-prefix purge, and retention sweep | TBD | TBD | **OPEN** | TBD |
| B08 | Product + Security | Operator access | Approve and enforce duration, dual control, reason/ticket, content-blind default, audit and review | TBD | TBD | **OPEN** | TBD |
| B09 | DPO / legal | Product data and regions | Approve inventory, lawful purpose, retention owners, residency, transfer mechanism, subprocessors | TBD | TBD | **OPEN** | TBD |

## Required artifact set

- `PRODUCTION-OPERATIONS-STATUS.md`, `RUNTIME-EVIDENCE.md`, and `OPERATOR-EVIDENCE.md`, updated with only current verified numbers.
- Cell bootstrap/schema/isolation/admission output for every production cell, including migration watermark and non-vacuous schema checks.
- Replica routing, lag/failover, PITR, regional recovery, relocation, colocated workload/headroom/burst, and invoice-derived cost reports.
- Alert delivery metadata, destination receipt, acknowledgement record, and release metadata.
- Corpus ACL/vector/reindex/retention results and GDPR export, erasure, legal-hold, physical purge, and retention records.
- Named approval records for break-glass, dual control, retention, residency, transfers, subprocessors, and lawful purpose.

## Exit criteria

- [x] This document is a complete evidence contract: scope, status semantics, commands, thresholds, artifacts, owners, and blockers are defined.
- [ ] Every required production artifact is attached, reproducible, safely redacted, and hashed where applicable.
- [ ] Every infrastructure blocker is closed or explicitly accepted by the accountable release authority; no mandatory gate is unexplained.
- [ ] Every approval has an accountable product, security, privacy/DPO, operations, or finance approver as appropriate.
- [ ] `PRODUCTION-OPERATIONS-STATUS.md`, `RUNTIME-EVIDENCE.md`, and this PRD contain only current verified numbers and clearly labelled blocked/partial results.
- [ ] Export worker, physical database erasure, object-storage purge, retention sweep, and operator-access enforcement are implemented and verified or remain explicitly release-blocking.
- [ ] Final release review has no unresolved P0/P1 operational or compliance finding and records residual risk for every non-P0/P1 item.

## References

- `architecture-refactor/PRODUCTION-OPERATIONS-STATUS.md`
- `architecture-refactor/OPERATOR-EVIDENCE.md`
- `architecture-refactor/RUNTIME-EVIDENCE.md`
- `architecture-refactor/c28-cell-based-platform-at-20m/CELL-RUNBOOK.md`
- `architecture-refactor/runbooks/RB-02-pitr-backup.md`
- `architecture-refactor/runbooks/RB-03-read-replica.md`
- `architecture-refactor/runbooks/RB-04-recovery-drill.md`
- `architecture-refactor/runbooks/RB-05-production-load.md`
- `architecture-refactor/runbooks/RB-06-live-alert-delivery.md`
- `architecture-refactor/runbooks/RB-07-per-cell-cost.md`
- `architecture-refactor/runbooks/RB-10-privacy-compliance-decisions.md`
