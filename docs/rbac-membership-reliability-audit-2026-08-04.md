# RBAC, membership, and invitation reliability audit — 2026-08-04

## Repository scope measured

The current source contains 741 non-exempt schema tables detected by the inventory script (703 tenant-scoped), 3,328 controller route decorators, 767 service files, and roughly 4,190 frontend TypeScript/TSX files. Fresh Knip and type checks cover the module graph and types, but they do not prove live database contents, query plans, runtime endpoint behavior, or extreme-scale SLOs. Completion is therefore tracked as explicit verified waves below rather than declared from a single static scan.

## Live read-only preflight — 2026-08-04

- All seven dead-schema candidates contain 0 rows.
- No external inbound FK blocks the drop; reported inbound FKs are only child-to-parent edges inside the LMS/training drop cluster.
- Orphaned `hr:learning:%` permission grants: 0.
- Cross-tenant rows across the five inspected RBAC role/group edges: 0.
- `payroll_statutory_rule_sets` currently contains 0 rows but remains preserved by explicit compliance-data policy; emptiness alone is not authorization to remove a future-facing statutory catalog.
- No destructive migration was applied. Canonical staged migrations `0394`/`0395` (RBAC tenant FKs) and guarded destructive migration `0396` (seven empty dead tables) are now journaled; backup/branch rehearsal and operator deployment remain required.

## Verified and fixed in this pass

- Invitation acceptance serializes seat consumption with a per-organization transaction advisory lock and runs the limit query in that transaction.
- Acceptance uses conflict-do-nothing and requires a returned membership id, preventing a concurrent membership writer from being mistaken for this request's insert.
- Active `ORG_ADMIN` resolves the full product permission catalog like the owner. Ownership lifecycle operations remain owner-only.
- Role-permission upsert targets the actual `(org_id, role_id, permission_key)` unique key.
- Focused invitation/state-machine/structural-role tests and backend typecheck pass.
- Module activation/deactivation now updates module and access caches optimistically without refreshing the NextAuth session or unmounting the authenticated shell.
- Shared authenticated loading gates retain already-rendered content during background refetches; the branded loading screen is reserved for the true initial load.
- Cache reads now coalesce same-process concurrent misses, and pattern invalidation deletes bounded scan batches instead of accumulating every matched key in memory.
- Accounting period generation uses one bulk insert instead of 12 round trips; close-checklist counts run concurrently.
- Fresh Knip analysis removed the confirmed orphan organization-switcher re-export, unused dashboard type, orphan payroll membership helper, five unused payroll/RBAC helpers, and obsolete raw SQL runner.
- Corrected the operator runbook: seven code-dead table candidates remain; `payroll_statutory_rule_sets` is retained because it contains statutory seed data.
- HR onboarding now serializes membership creation with the per-org quota lock and transaction-bound seat check for both existing and new identities.
- Invitation resend, cancellation, and role changes use conditional state claims with `RETURNING`, preventing concurrent acceptance or another transition from producing contradictory state/events.
- RBAC schema edges now declare composite tenant ownership for roles and principal groups. A read-only preflight was added for the staged `NOT VALID` production migration.
- Chat reply reminders batch recipient inserts in groups of 500 and no longer hydrate unused channel-member relations.
- Team data scope now requires `orgId` and tenant-correlates both peer membership and TEAM unit lookup across every production caller.
- Default chart provisioning uses one bulk insert, and journal posting loads only the distinct ledger codes referenced by the draft.
- Backend CI now provisions PostgreSQL 18, bootstraps migrations, and runs controller e2e specs separately from unit tests with serialized high-memory Jest execution.

## P0 — required before production scale claims

- [ ] Move org-specific employment/payroll fields off global `users` into canonical org-scoped records. Dual-write, backfill, compare, switch reads, then drop legacy columns.
- [x] Put HR onboarding, direct add, imports, and bulk jobs behind the same transaction quota lock and transaction-bound seat check. Initial organization-owner creation is part of organization provisioning and is not a seat-add flow.
- [ ] Rehearse and deploy `0394_rbac_composite_tenant_fks`, verify new-write enforcement, then deploy `0395_validate_rbac_composite_tenant_fks` and confirm all five constraints are validated. Drizzle declarations, zero-result preflight, and canonical migrations are complete; live DDL remains operator-gated.
- [ ] Enforce case-insensitive canonical email identity in PostgreSQL after resolving existing collisions.
- [ ] Make destructive user/member removal one locked transaction with explicit multi-org identity rules and durable session/cache revocation.
- [ ] Load-test production-like tenant skew and permission cardinality. Code review cannot prove ten-billion-user capacity.

## P1 — correctness and reliability

- [ ] Scope pending-invitation uniqueness to canonical email with `status = 'PENDING'`; retain terminal history and remove delete-before-create.
- [x] Make resend, cancel, and invitation-role changes status-conditional with `RETURNING`; losing-race tests cover all three.
- [ ] Move HR person/employment synchronization into onboarding's transaction or a durable idempotent outbox.
- [ ] Add explicit row-locked membership transitions for active, suspended, left, restored, and archived states.
- [ ] Make `module_ownerships` the sole lifecycle-owner source; reserve owner-role synchronization or rename assignable roles module admin.
- [ ] Cap permission cache lifetime at nearest role/delegation expiry and distribute cross-node version invalidation.
- [ ] Replace capped per-user invalidation fan-out with an org access/session version checked on protected requests.
- [ ] Fully implement `DataScope = team` or remove it from the role editor until it works.

## P2 — query and operating efficiency

- [ ] Batch bulk invitations: normalize/dedupe once, authorize once, set-read member state, reserve quota once, bulk-write events, and invalidate once.
- [ ] Fold invitation token/org/user/membership validation into fewer joined transactional reads while retaining the authoritative row lock.
- [ ] Batch module entitlement checks instead of awaiting one query per module.
- [ ] Use `UPDATE ... RETURNING` for employee linkage and project only response fields, never encrypted/sensitive columns.
- [ ] Replace reporting-chain O(depth) reads with a recursive CTE plus cycle protection.
- [ ] Verify indexes with `EXPLAIN (ANALYZE, BUFFERS)` and `pg_stat_user_indexes`. Candidates include invitation `(org_id, status, created_at DESC)`; likely redundant indexes include the extra users-email and owner lookup indexes.
- [ ] Finish replacing legacy request-path Redis pattern scans with versioned tenant/resource cache namespaces. `CacheService` and the migrated RBAC, membership, organization, HR, finance, CRM, inventory, and collaboration families now use O(1) namespace generation bumps; the remaining inventory families are tracked in `docs/schema-redesign/todo.md`.
- [x] Add a distributed cache-fill lease for cross-instance stampede protection. The Redis lease uses bounded waiting, `NX`/expiry acquisition, and token-checked release; process-local single-flight remains the first tier. TTL jitter/stale-while-revalidate can be added only where product staleness policy permits it.
- [ ] Batch chat reminder scheduling/worker hydration and delivery; use `FOR UPDATE SKIP LOCKED`, bounded concurrency, and bulk status updates.
- [ ] Batch contact import, default chart seeding, and other looped inserts; stream large CSV exports instead of loading a tenant into memory.
- [ ] Add cursor pagination to succession/community/member APIs and clamp every internal/external limit server-side.

## Schema removal gate

Do not call a table or column unnecessary until all pass:

1. Zero typed and raw SQL references, including scripts, workers, MCP, exports, and dynamic imports.
2. No FK, view, trigger, RLS policy, function, generated column, index, or external consumer depends on it.
3. Live row/value telemetry proves no required data.
4. Replacement dual-write, backfill, reconciliation, read cutover, and rollback window are complete.
5. A guarded journaled migration rebuilds from empty and succeeds on a production-size clone within lock budgets.

## Extreme-scale gate

Serial integer membership/role/grant identifiers cannot represent ten billion records. Before that order of scale, migrate high-cardinality identities to bigint or UUIDv7, shard/partition from measured access patterns, use pooling/read replicas, isolate append-only audit/event storage, and prove SLOs with load, soak, failover, hot-tenant, cache-loss, and migration tests. Scale is an evidence and infrastructure claim, not a code-style claim.
