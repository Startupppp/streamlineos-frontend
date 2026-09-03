# UNSIGNED decision record — deploy safety residual risk (PRD-C176, PRD-C177)

**Status: DRAFT. NOT SIGNED. NOT APPROVED.**

Every field below is filled from measured evidence so a named human has only to review and
sign. The signature blocks are deliberately empty. An agent authored this; an agent must not
sign it, and this file is not an approval until a person fills in the blocks below and the
record is moved into `architecture-refactor/decisions/` by a human.

It is placed here rather than in `architecture-refactor/decisions/` because the agent that
wrote it was scoped to this evidence directory only.

---

## 1. What is being decided

Whether to accept the residual deploy-safety risk in `release/code-10-10-v2`, given that the
code-level mechanisms for PRD-C176 and PRD-C177 have been exercised locally under induced
failure, but no deployed environment exists on which to prove them end to end.

## 2. What was proven, and how

See `README.md` in this directory. Summary of the load-bearing results:

- A worker killed mid-lease strands no work: the outbox event and the workflow run are both
  reclaimed once the lease expires, and neither can be claimed twice while a lease is live.
  Measured against the real schema under RLS as the non-owner application role.
- The outbox publisher's terminal writes are fenced on the lease: a killed worker that wakes
  up updates zero rows, while the current lease-holder still completes normally.
- Graceful shutdown drains: on a live SIGTERM, readiness reported 503 immediately, ordinary
  traffic was served for the entire 3000ms settling window, new work was refused with
  `Retry-After: 5` only afterwards, liveness never failed, a request held in flight across
  the drain was answered, and the process exited only after the drain hook completed.
- A canary rollout aborted on a real measured p99 regression (+8450.2% against a 20% threshold).
- Kill switches are honoured on the live read path, with platform precedence over tenant
  switches, tenant isolation enforced by RLS, and service restored when switched back on.
- Rolling schema and API compatibility are gated: 677 migrations under expand/contract
  discipline with rollback declarations, and 102 published operations with no narrowing.

## 3. Residual risk being accepted

| # | Risk | Severity | Why it cannot be closed here |
|---|---|---|---|
| R1 | A workflow run's terminal write is not fenced on its lease (`common/workflow/workflow-store.ts:132-161`). A worker whose step outruns the 5-minute lease can overwrite the state of the worker that legitimately reclaimed the run — writing COMPLETED over a failure, resetting the attempt counter, or returning a live run to PENDING for a third worker. Demonstrated: `raw/lease-recovery-drill.txt`, last line. | High | This is a code defect, not an environment gap. It should be fixed rather than accepted. If it is accepted for this release, the accepting party must say so explicitly below. |
| R2 | `checkCompatibility` (`common/placement/canary-rollout.ts:40-58`) — the rolling N-1 compatibility check — has no caller outside its own unit spec, and the rollout runner hardcodes `minSchemaVersion: 1` / `minEventVersion: 1`. No runtime source of deployed schema/event versions exists. | Medium | Needs both a version registry and a deployed multi-version fleet to be meaningful. |
| R3 | The `feature_flags` table has governance columns and a passing governance gate, but no reader anywhere in the backend. It cannot serve as a runtime kill switch today. | Medium | Code gap; the only working switches are the DB-backed autonomy switches and boot-time `*_WORKER_ENABLED` environment variables. |
| R4 | Rolling deploy of two application versions against one database, canary abort of a real deployment, rollback and forward-fix of a real release, and behaviour under autoscaling are unproven. | High | No deployed environment exists. Requires two replicas behind a load balancer. |
| R5 | No operator runbook exists for rolling deploy, canary abort, kill-switch activation or draining. RB-09 covers migration rollback only. | Medium | Authoring is cheap; approving the procedure is a human decision. |
| R6 | `*_WORKER_ENABLED` switches are read once at `onModuleInit`. Flipping one requires a restart, so they are release-time switches, not incident-time kill switches. | Low | Design decision to confirm or change. |

## 4. Conditions this acceptance depends on

To be completed by the accepting party. Suggested, from the evidence:

- [ ] R1 is fixed before release, or an explicit exception is recorded with a named owner and date.
- [ ] R4 is retired by a rolling-deploy drill in the first deployed environment, before any
      production traffic, with the result captured under `evidence/42-production-ops/`.
- [ ] An operator runbook for rolling deploy, canary abort and kill switches (R5) exists
      before the first production deploy.

## 5. Signatures

None of these may be filled in by an automated agent.

| Role | Name | Decision | Date | Signature |
|---|---|---|---|---|
| Operations owner (accepts R4, R5, R6) | | | | |
| Engineering owner (accepts or rejects R1, R2, R3) | | | | |
| Release authority (PRD-C176, PRD-C177 sign-off) | | | | |

**Until all three rows are filled by the named individuals, PRD-C176 and PRD-C177 are NOT
signed off and this record confers no approval.**

## 6. Provenance

- Evidence: this directory, captured 2026-09-03.
- Repos: `streamlineos-backend` and `streamlineos-frontend`, branch `release/code-10-10-v2`.
- Databases: `scratch_head_1010` (local, 677/677 migrations), owner and non-owner roles.
- Author: automated audit agent. No human reviewed the evidence at the time of writing.
