# Session 01 — HR Authority Actor Contraction

## Objective

Reduce the remaining HR authority-bearing legacy user relationships to zero. At session start, re-run `pnpm -C backend scan:legacy-actors`; the expected current HR count is approximately 99, but the scanner output is authoritative.

## Ownership

`backend/src/db/schema/hr/**`, `backend/src/modules/hr/**`, their migrations, DTOs, focused tests, events, cache invalidation, and HR authenticated frontend contracts when an API response changes.

Do not edit Build, Support, Payroll, Common, KB, CRM, Inventory, public landing files, or broad scanner tooling.

## Required implementation pattern

For every actionable field:

1. Prove it is authority-bearing using `ACTOR-CLASSIFICATION.md` and real reader/writer sites.
2. Expand with a canonical `organization_members.id` reference and tenant composite FK.
3. Backfill in deterministic, resumable batches on `(org_id, legacy_user_id)`, preferring an active membership. Fail with an unmappable/cross-tenant count; never guess.
4. Move every reader, writer, uniqueness key, visibility predicate, event payload, cache key, direct grant, and revocation cleanup to membership identity.
5. Preserve only historical display through a membership-to-user projection; do not retain legacy authority columns for display convenience.
6. Add zero-use tests/search proof, validate FKs, build tenant-leading indexes for real access patterns, then drop legacy columns in a journalled migration.

## Work batches

- [ ] Group fields by shared HR service/schema seam; target 8–15 fields per migration batch.
- [ ] Implement each batch fully before beginning another.
- [ ] Add negative tests for account-only actors, cross-org membership, revocation, duplicate membership mapping, and unmappable backfill.
- [ ] Update frontend types/hooks only where the public contract truly changes.
- [ ] Do not classify authority fields as display-only merely to reduce the scanner.

## Exit criteria

- [ ] `scan:legacy-actors` reports `hr actionable=0`.
- [ ] Every new migration is journalled, ordered, replayable, and has a truthful rollback/irreversible declaration.
- [ ] No legacy HR actor field remains in an authorization predicate, writer, uniqueness constraint, cache key, or revocation path.
- [ ] All focused HR tests and both typechecks pass.

## Required commands

```powershell
pnpm -C backend scan:legacy-actors
pnpm -C backend check:migration-discipline
pnpm -C backend check:migration-chain
pnpm -C backend db:migrate
pnpm -C backend check:migration-ledger
pnpm -C backend typecheck
pnpm -C backend check:spec-typecheck
pnpm -C frontend type-check
```

## Execution record — 2026-09-01

- [x] Baseline scanner rerun; the live scanner output is authoritative.
- [x] HR actor schema seams were moved to membership references; historical user identifiers remain display projections where required.
- [x] Raw-SQL `employee_career_plans.user_id` and `employee_career_plans.mentor_id` have a journalled migration containing deterministic tenant-scoped membership backfills and composite membership FKs.
- [x] Unmappable actor rows fail closed; membership indexes and FK validation are included in the migration.
- [x] Migration prefix collisions and unjournalled HR/support artifacts from parallel work were removed; the HR migrations are ordered after the current journal watermark.
- [x] HR-owned type errors in the cases inbox and document service were corrected (`sql`/`or` imports and nullable target-user narrowing).

Evidence:

- `pnpm -C backend scan:legacy-actors` reports `hr` absent from actionable modules, i.e. `hr actionable=0`.
- `pnpm -C backend check:migration-discipline` passes.
- `pnpm -C backend check:migration-chain` passes.

The remaining required backend type/spec checks cannot be certified from this shared worktree: the current run reports pre-existing/out-of-scope Build, Support, Common, AI, and Timesheets type errors caused by concurrent non-HR schema changes. `db:migrate` failed while applying the pending shared migration queue before reaching the HR migrations; `check:migration-ledger` still passes with seven migrations pending. `pnpm -C frontend type-check` passed. No HR success is claimed for the failed/pending gates.
