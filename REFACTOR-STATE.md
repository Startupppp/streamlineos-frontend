# HRMS / Payroll / Recruitment refactor state

Updated: 2026-08-10

Current module: **HRMS core**

Current phase: **Phase 0 audit complete; awaiting user approval**

Gate: **Do not start Phase 1 or change application/schema/production data until approval.**

## Worktrees and baselines

- Frontend/root worktree: `D:\projects\personal\Streamlineos\.claude\worktrees\hrms-core-review`
- Frontend branch: `hrms-core-architecture-review`
- Frontend baseline: `799134fd36dd6ea7baa73f676fe8a3eb86bcf0ab`
- Backend worktree: `D:\projects\personal\Streamlineos\.claude\worktrees\hrms-core-review\backend`
- Backend branch: `hrms-core-architecture-review`
- Backend baseline: `66bad4e14f7b80556b3b14ede2e883150edbc89d`

## User decisions recorded

- Start with HRMS core and finish each module before the next.
- Use isolated worktrees and parallel read-only audit agents.
- Live production tenants exist; every future migration must be expand-contract.
- Production DB access was authorized, but Phase 0 remained explicitly read-only.
- Current payroll output is **not trusted**. Do not lock it into golden tests. The Payroll phase must first verify statutory/salary arithmetic, issue a discrepancy report, and obtain approval.
- No new dependencies without approval; no AI features.

## Scope

Included: employee/person/employment master, directory/workforce bridge, organization hierarchy, attendance, leave, employment documents, and onboarding/lifecycle paths that mutate core employment records.

Excluded this session: Payroll calculations, Recruitment/ATS internals, performance, benefits, engagement and unrelated HR areas.

## Findings status

Closed product findings: **none** (Phase 0 is audit-only).

Open findings:

- Schema: `SCH-001` through `SCH-016`
- API/correctness: `API-001` through `API-018`
- Security/privacy: `SEC-001` through `SEC-007`, `SEC-030` through `SEC-046`, `SEC-060` through `SEC-066`
- UI/UX: `UI-001` through `UI-015`
- Cost/performance: `COST-001` through `COST-007`, `COST-030` through `COST-039`, `COST-060` through `COST-065`
- Baseline/tooling: `BASE-001` through `BASE-007`
- Dead-code candidates: `DEAD-001`, `DEAD-002` are explicitly **not proven dead** and must not be deleted.

## Plan-changing facts

1. Three active employee models exist: global `users`, directory/workforce records, and HR people/employments.
2. Live read-only reconciliation found one worker missing canonical HR records, five leave-balance/ledger discrepancies, and three global user rows with tax or bank data.
3. Tenant termination can disable the global account; an employee GET can materialize an arbitrary global user into the caller tenant.
4. Sensitive employee data is serialized before frontend hiding.
5. Frontend query keys are not consistently tenant-scoped and logout/401 does not clear all cached HR data.
6. Live data is far below the 10M/100M scale target, and `pg_stat_statements`/general p50/p95 instrumentation is absent.

## Baseline validation

- Production: 45 audited tables; full counts/sizes/columns/RLS captured in the DB inventory appendix and all 195 indexes in the index appendix.
- Representative production query plans: 10 read-only EXPLAIN ANALYZE probes captured; 0.089-1.114 ms on tiny data, not a scale result.
- Frontend focused tests: 5 suites / 17 tests passed; coverage collection is broken by Babel 8 vs Istanbul/Babel 7 compatibility.
- Backend hot-service tests: 8 suites / 80 tests passed; representative-file coverage 52.55% statements, 35.20% branches, 53.90% functions, 55.02% lines.
- Backend lifecycle chunk: 7 suites / 31 tests passed; 1 suite / 2 tests failed because its mock lacks the production transaction API.
- Broad backend scoped suite timed out after 604 seconds.
- Knip production cycle and unused-production checks passed in both repositories. Madge is unavailable and was not added.

## Decisions still required

Phase 1 must compare and recommend a canonical workforce subject. The leading option from Phase 0 is the tenant-scoped directory model (`organization_people` -> `workers` -> effective-dated `worker_engagements`) with HR sensitive/history extensions, but this is **not approved yet** because payroll and lifecycle currently read/write competing models.

Phase 1 must also classify opening leave balances and triple-model mismatches before any backfill or constraint is applied.

## Next action

Wait for explicit approval of the Phase 0 audit. After approval:

1. Produce the HRMS-core Phase 1 target schema and canonical-subject decision.
2. Produce forward migration, rollback, backfill, validation queries and deploy order using expand-contract.
3. Use a production branch/read replica or anonymized representative dataset for scale tests; do not load-test the live primary.
4. Stop again for approval before implementing or running any schema/data change.

## Artifacts

- `docs/hrms/hrms-core-phase-0-audit-2026-08-10.md`
- `docs/hrms/hrms-core-phase-0-db-inventory-2026-08-10.md`
- `docs/hrms/hrms-core-phase-0-index-inventory-2026-08-10.md`
- `docs/hrms/hrms-core-phase-0-code-inventory-2026-08-10.md`

Production mutation status: **none**.
