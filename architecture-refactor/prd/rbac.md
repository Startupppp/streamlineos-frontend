# RBAC and tenant isolation

The scoped code-level RBAC gates and tests are green. No confirmed implementation gap remains.

## RBAC-001 — Run the final executable tenant-isolation sweep
Status: FINAL-INTEGRATION
Maps to: PRD-C043, PRD-C044, PRD-C045, PRD-C046
Parallel group: 4
Depends on: CHAT-001, CHAT-002, ARCH-001
Owner: security release agent

Scope: Run permission, scope, record authorization, tenant-relationship, migration, and cross-tenant negative suites against the final backend revision.

Completion: All executable checks pass at one recorded backend revision with zero actionable tenant findings.

## RBAC-002 — Capture deployed revocation and isolation proof
Status: BLOCKED-EXTERNAL
Maps to: PRD-C162, PRD-C185
Parallel group: 3
Depends on: RBAC-001
Owner: security operator

Scope: Exercise deployed role revocation, session invalidation, cross-tenant denial, and audit visibility.

Completion: Deployed evidence records principals, tenant boundaries, timestamps, expected denials, and audit events without exposing secrets.

