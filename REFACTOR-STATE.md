# HRMS / Payroll / Recruitment refactor state

Updated: 2026-08-11

Current module: **HRMS core**

Current phase: **Phase 1 schema proposal complete; awaiting user approval**

Gate: **Do not implement Phase 1 or change application/schema/production data until all eight proposal decisions are approved.**

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
- Phase 0 was approved on 2026-08-10, authorizing read-only Phase 1 design work.

## Scope

Included: employee/person/employment master, directory/workforce bridge, organization hierarchy, attendance, leave, employment documents, and onboarding/lifecycle paths that mutate core employment records.

Excluded this session: Payroll calculations, Recruitment/ATS internals, performance, benefits, engagement and unrelated HR areas.

## Findings status

Closed product findings: **none** (Phase 1 is proposal-only; implementation has not begun).

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
2. The current live source universe is 8 active memberships, 3 `organization_people`, 1 worker, 2 engagements, and 0 legacy HR people/employments. The current employee API treats active memberships as employees, but not every membership is necessarily a worker; every subject needs an explicit worker/access-only classification before cutover.
3. Tenant termination can disable the global account; an employee GET can materialize an arbitrary global user into the caller tenant.
4. Sensitive employee data is serialized before frontend hiding.
5. Frontend query keys are not consistently tenant-scoped and logout/401 does not clear all cached HR data.
6. Live data is far below the 10M/100M scale target, and `pg_stat_statements`/general p50/p95 instrumentation is absent.
7. The corrected live count is one worker with two engagements (one cancelled, one planned), not two workers; no legacy HR mirror exists.
8. The five live leave balances total 94.20 days and have no ledger/provenance rows, so they cannot be recalculated or discarded safely.
9. Live `roster_entries` and `onboarding_template_steps` already have tenant keys/RLS/composite FKs that Drizzle source omits. That portion of `SEC-006` is reclassified as `SCH-016` source/live drift; no duplicate live columns should be added.
10. The older `docs/hrms/04-schema-design.md` identity choice is superseded for HRMS core by the fresh three-model audit; its unrelated Payroll/Billing content remains prior art.
11. Recruitment offer handoff is an active direct writer to legacy HR people/employments; it must call the Workforce command boundary before any affected tenant can enter canonical mode.
12. Global `users` has no tenant key, so canonical tenant-employment facts must never be projected back into its legacy employment fields; those readers must migrate to tenant-scoped adapters.

## Baseline validation

- Production: 45 audited tables; counts/sizes/RLS are in the DB inventory, all 572 live columns are in two refreshed appendices, and all 195 indexes are in the index appendix.
- Representative production query plans: 10 read-only EXPLAIN ANALYZE probes captured; 0.089-1.114 ms on tiny data, not a scale result.
- Frontend focused tests: 5 suites / 17 tests passed; coverage collection is broken by Babel 8 vs Istanbul/Babel 7 compatibility.
- Backend hot-service tests: 8 suites / 80 tests passed; representative-file coverage 52.55% statements, 35.20% branches, 53.90% functions, 55.02% lines.
- Backend lifecycle chunk: 7 suites / 31 tests passed; 1 suite / 2 tests failed because its mock lacks the production transaction API.
- Broad backend scoped suite timed out after 604 seconds.
- Knip production cycle and unused-production checks passed in both repositories. Madge is unavailable and was not added.

## Proposed architectural decisions (awaiting approval)

Canonical approval contract `HRMS-P1-APPROVAL-2026-08-11-v1` requires all eight normative lines verbatim:

1. **Canonical workforce and legacy compatibility:** approve `organization_people → workers → worker_engagements` as the tenant workforce authority; keep `users` for global authentication and `organization_members` for tenant access/RBAC; retain `hr_people`, `hr_employments`, and finalized HR/Payroll/Recruitment legacy mappings only as one-way tenant-scoped compatibility until Payroll and Recruitment migrate and independent zero-reference proof passes.
2. **Effective workforce history:** approve effective-dated assignment/reporting periods and append-only engagement-state events, including interval-wide cycle prevention and deterministic legacy snapshots; retained current fields are compatibility projections.
3. **Leave ledger and legacy opening balances:** approve the immutable leave ledger as authority and preserve the five live balances as deterministic `UNVERIFIED_LEGACY` opening entries reconciling exactly to 94.20 days; do not recalculate or discard them.
4. **Attendance event model and evidence retention:** approve append-only attendance events and the privacy-first evidence policy: raw location off by default; opt-in encrypted coordinates rounded to at most four decimals for 30 days; longer retention only under a named two-person audited legal hold reviewed at least every 90 days; no bulk export by default.
5. **Hierarchy adjacency plus closure:** approve adjacency as direct-parent truth plus a rebuildable tenant-scoped closure projection for descendant scope.
6. **Private-data separation and managed-KMS envelope encryption:** approve the public/private/sensitive split and managed-KMS envelope encryption; Batch D remains blocked until a separate ADR names and rehearses provider, custody/IAM, tenant/key hierarchy, associated data, rotation/rewrap, recovery/restore, break-glass, deletion, and fail-closed outage behavior; no environment-key/application-keyring fallback is approved.
7. **Zero-error manual reconciliation governance:** approve zero unresolved classifications, mismatches, or PII-attribution items before cutover; no email auto-merge or error threshold; every manual classification or field-precedence decision requires two distinct `AccessService`-authorized reviewers—one organization data owner and one independent HR/security reviewer—using masked, audited PII review and a signed ID-only manifest.
8. **Migration profile plus mandatory API/security/cache/UI pre-canary gates:** approve the organization-sticky expand-contract state machine and require tenant integrity/RLS, object-level `AccessService`/DataScope, safe DTO and sensitive-access audit, tenant/actor/access/scope/profile/wire cache isolation and clearing, exact route/sidebar/action/hook permission, and responsive/accessibility gates before any canonical canary.

## Next action

Wait for explicit approval of all eight Phase 1 decisions. After approval:

1. Rebase/check the migration journal and show the exact additive first-wave SQL plus paired rollback before execution.
2. Rehearse forward/rollback/backfill on a point-in-time branch or anonymized representative dataset; never load-test the live primary.
3. Implement source/live parity, canonical links/maps, versions, contract profile, and new empty history tables in bounded batches.
4. Present dry-run results, restore evidence, and the intended production cohort before any production migration is run.
5. Keep contract/deletion behind a separate irreversible approval.

## Artifacts

- `docs/hrms/hrms-core-phase-0-audit-2026-08-10.md`
- `docs/hrms/hrms-core-phase-0-db-inventory-2026-08-10.md`
- `docs/hrms/hrms-core-phase-0-column-catalog-a-h-2026-08-11.md`
- `docs/hrms/hrms-core-phase-0-column-catalog-l-w-2026-08-11.md`
- `docs/hrms/hrms-core-phase-0-index-inventory-2026-08-10.md`
- `docs/hrms/hrms-core-phase-0-code-inventory-2026-08-10.md`
- `docs/hrms/hrms-core-phase-1-schema-proposal-2026-08-10.md`
- `docs/hrms/hrms-core-phase-1-expand-contract-plan-2026-08-10.md`
- `docs/hrms/hrms-core-phase-1-live-discrepancy-report-2026-08-10.md`

Production mutation status: **none**.
