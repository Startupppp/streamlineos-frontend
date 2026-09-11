# Production operations and approvals

These tasks require deployed access, live providers, measured traffic, or named human decisions. Local agents may prepare commands and evidence templates, but must not mark them complete from mocks.

## OPS-001 — Execute live provider failure drills
Status: BLOCKED-EXTERNAL
Maps to: PRD-C162
Parallel group: 3
Depends on: none
Owner: production operator

Scope: Run bounded failure and recovery drills for payments, Ably/realtime, mail, storage/search, queues, and other release providers.

Completion: Each provider has timestamped detection, retry/recovery, reconciliation, and customer-impact evidence.

## OPS-002 — Prove alert delivery and incident routing
Status: BLOCKED-EXTERNAL
Maps to: PRD-C162, PRD-C190
Parallel group: 3
Depends on: none
Owner: on-call owner

Scope: Trigger release-critical alerts and verify delivery, escalation, runbook linkage, and acknowledgement.

Completion: Alert artifacts identify the signal, recipient, delivery time, acknowledgement, and recovery action.

## OPS-003 — Complete recovery, rollback and data-protection drills
Status: BLOCKED-EXTERNAL
Maps to: PRD-C162, PRD-C185
Parallel group: 3
Depends on: none
Owner: platform operator

Scope: Prove rollback, restore/PITR, retention, legal hold, erasure, and break-glass workflows in authorized environments.

Completion: Recorded drills meet the stated RTO/RPO and privacy controls, with residual risks assigned.

## OPS-004 — Record security, privacy and provider approvals
Status: BLOCKED-EXTERNAL
Maps to: PRD-C182, PRD-C185, PRD-C193
Parallel group: 3
Depends on: OPS-001, OPS-002, OPS-003
Owner: named approvers

Scope: Obtain the required security, privacy, legal/provider, Finance, and release-owner decisions.

Completion: The authority record contains each named decision, timestamp, scope, exceptions, and expiry or follow-up date.

