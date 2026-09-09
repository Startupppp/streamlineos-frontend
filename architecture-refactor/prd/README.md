# Active delivery backlog

Status: active 2026-09-09

This directory is the sole source of current pending work. The compact
[`PRD-10-10-CODE-RELEASE-TODO.md`](../PRD-10-10-CODE-RELEASE-TODO.md) provides
stable `PRD-C001`–`PRD-C195` identifiers and contains no task status.

Give each parallel agent one lane file. Agents edit only their assigned lane and
implementation files. They do not commit, rewrite another lane, or run the shared
final-integration tasks. The coordinating agent owns cross-lane dependency changes,
final gates, evidence reconciliation, and commits.

| Parallel lane | Backlog | Current state | May start |
| --- | --- | --- | --- |
| Architecture and performance | [architecture.md](architecture.md) | 2 ready | Now |
| Billing and payments | [billing-payments.md](billing-payments.md) | External proof only | When environment/approver exists |
| Chat | [chat.md](chat.md) | 3 ready | Now |
| Build/PM | [build.md](build.md) | 1 ready | Now |
| RBAC and tenant isolation | [rbac.md](rbac.md) | Final integration only | After lane work lands |
| Documents, KB and e-sign | [documents.md](documents.md) | 3 ready | Now |
| Production and approvals | [production-and-approvals.md](production-and-approvals.md) | Externally blocked | When deployed access/owners exist |
| Overall release | [overall-release.md](overall-release.md) | Final integration only | After all ready work lands |

Statuses are `READY`, `BLOCKED-EXTERNAL`, and `FINAL-INTEGRATION`. A task is removed
only after its completion evidence is linked from the lane file. Historical reports
are evidence, not backlogs.
