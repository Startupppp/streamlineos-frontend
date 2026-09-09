# Architecture and performance

## ARCH-001 — Finish HR keyset pagination contraction
Status: READY
Maps to: PRD-C005
Parallel group: 1
Depends on: none
Owner: architecture agent

Scope: Resolve the remaining 35 known HR offset or overlarge-limit findings, with stable tenant-scoped keyset ordering and unique tie-breakers.

Completion: The unbounded-read gate reports zero actionable HR findings with a zero ratchet, and focused pagination tests pass.

## ARCH-002 — Bring authenticated mobile INP within budget
Status: READY
Maps to: PRD-C149, PRD-C190
Parallel group: 1
Depends on: none
Owner: performance agent

Scope: Diagnose and remove the interaction latency that produced 728 ms and 1,152 ms mobile INP readings.

Completion: A quiet-host authenticated capture is accepted by the measurement driver and reports mobile INP at or below 200 ms, with the raw artifact linked here.

