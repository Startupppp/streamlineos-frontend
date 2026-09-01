# Session 02 — Build, Support, and Common Actor Contraction

## Objective

Eliminate authority-bearing legacy actor fields owned by Build, Support, and Common. Rebaseline with `pnpm -C backend scan:legacy-actors`; the current expected counts are Build 17, Support 5, Common 11.

## Ownership

`backend/src/db/schema/build/**`, `backend/src/db/schema/support/**`, relevant Common schema, `backend/src/modules/build/**`, `backend/src/modules/support/**`, shared notification/organization actor seams only when directly required by a field in this session.

Do not edit HR, Payroll, KB, CRM, Inventory, public landing UI, or broad query scanners.

## Mandatory design requirements

- Use `organization_members.id` for current authority, not `users.id`.
- Every membership reference must use an `(org_id, membership_id)` foreign key where the table is tenant-scoped.
- Project/webhook/audit consumers must retain stable historical user display without regaining a user-id authority seam.
- Build webhook work must keep transactional outbox semantics: domain mutation and delivery intent commit together.
- Support drafts, macros, routing, AI, portal and saved views must fail closed for missing/revoked membership.

## Work

- [x] Batch 6–12 fields by service/schema ownership (Build, Support, Common ownership batches).
- [x] Backfill deterministically and report unmappable rows before dropping a field.
- [x] Convert active writers, conflict targets, indexes, SQL predicates, notifications, search docs, and cache keys.
- [x] Add and retain focused cross-tenant, revocation, nullable-identity, and duplicate-key coverage in the affected service/schema suites.
- [x] Drop only fields with zero-use proof.

## Exit criteria

- [x] Scanner reports Build, Support, and Common actionable counts of zero.
- [x] No Build/Support/Common authorization or mutation path reads legacy user actor columns.
- [ ] New migrations apply cleanly and migration ledger is consistent. `check:migration-ledger` and `check:migration-chain` pass; `db:migrate` remains blocked by pending concurrent-session migrations (0919/0920) in the shared ledger.
- [x] Backend typecheck and spec typecheck pass; focused service/controller test execution was attempted but did not complete within the available runtime.

## Required commands

```powershell
pnpm -C backend scan:legacy-actors
pnpm -C backend check:migration-discipline
pnpm -C backend db:migrate
pnpm -C backend check:migration-ledger
pnpm -C backend typecheck
pnpm -C backend check:spec-typecheck
```
