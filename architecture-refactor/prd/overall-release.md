# Overall release integration

Run these tasks only after their dependencies land. The release coordinator owns this file.

## REL-001 — Run one clean commit-pair release suite
Status: FINAL-INTEGRATION
Maps to: PRD-C018, PRD-C190, PRD-C191
Parallel group: 4
Depends on: ARCH-001, ARCH-002, CHAT-001, CHAT-002, CHAT-003, CHAT-004, BUILD-001, BUILD-002, DOC-001, DOC-002, DOC-003, RBAC-001
Owner: release coordinator

Scope: Run backend and frontend typecheck/build, unit and focused integration suites, architecture gates, contracts, migrations, and dead-code checks at one recorded root/backend pair.

Completion: A single release record captures revisions, commands, exit codes, totals, environment, and artifacts; all required checks are green.

## REL-002 — Reconcile backlog and publish the release verdict
Status: FINAL-INTEGRATION
Maps to: PRD-C017, PRD-C156, PRD-C193, PRD-C194, PRD-C195
Parallel group: 5
Depends on: REL-001, BILL-002, DOC-004, OPS-004, RBAC-002
Owner: release coordinator

Scope: Remove completed tasks from active lanes, link their durable evidence, enumerate external exceptions, and issue the final go/no-go decision.

Completion: The traceability gate passes, the active backlog contains only unresolved work, and the signed verdict names all accepted residual risks.
