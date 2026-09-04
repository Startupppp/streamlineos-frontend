# 34: Production operations, alerts and cost

**What to build:** Production logs, traces, alerts, acknowledgements, rollout safety, capacity headroom, on-call ownership, and unit cost are measured and approved.

**Blocked by:** 31 — One-commit code-release verification; 33 — Cell isolation, replicas and recovery

**Status:** ready-for-agent

**Source:** `architecture-refactor/PRD-10-10-CODE-RELEASE-TODO.md`

**Human/deployment gate:** D06-D07 in `architecture-refactor/decisions/CODE-RELEASE-HUMAN-INPUTS.md`.

## Acceptance criteria

- [x] **PRD-C010** — **Uploads/operator cutover:** complete v2 ticket 21's code lifecycle and v2 ticket 34's deployed private-bucket/backfill evidence before cutover.
- [x] **PRD-C165** — Produce production-build/reference-device Web Vitals evidence; obtain Product acceptance if frozen landing animation prevents its agreed target.
- [x] **PRD-C166** — Run realistic load and capture pools, queues, CPU, memory, errors, replica behavior and sustained/burst capacity.
- [x] **PRD-C167** — Prove declared SLOs with at least 40% capacity headroom.
- [x] **PRD-C172** — Measure/approve per-cell and active-tenant cost using [RB-07](runbooks/RB-07-per-cell-cost.md).
- [x] **PRD-C173** — Configure production logs, traces and release metadata with redaction.
- [x] **PRD-C174** — Test live alerts and human acknowledgement using [RB-06](runbooks/RB-06-live-alert-delivery.md).
- [x] **PRD-C175** — Capture passing RB-01â€“RB-08 manifests under [production evidence](final-refactor/evidence/42-production-ops/README.md) with identity, topology, SHA, operator, timestamps, exit code and hashes.
- [x] **PRD-C176** — Prove rolling compatibility, canary aborts, kill switches, degraded modes and rollback/forward-fix under induced failure.
- [x] **PRD-C177** — Verify probes, graceful shutdown, draining, worker lease recovery and duplicate/loss safety during deployment/autoscaling.
- [x] **PRD-C178** — Publish on-call ownership, escalation, incident severity, customer/status communication and post-incident review procedures.

## Completion evidence

- Record applicable frontend/root and backend commit SHAs, commands, pass/fail/skip counts, and artifact locations.
- Update the source PRD checkbox states and the traceability manifest in the same completion commit.
