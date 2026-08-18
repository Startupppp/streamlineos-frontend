# HRMS / Payroll / Recruitment refactor state

Updated: 2026-08-18

Current module: **HRMS core**

Current phase: **Phase 7 local integration and cleanup; Phase 1 clone rehearsal and production activation remain gated**

Gate: **The eight design decisions are approved for authoring only. Do not execute the SQL bundle, create production partitions, backfill, switch a tenant profile, or change production data until a disposable production-size clone passes the full rehearsal and the exact hash-bound production manifest receives separate approval.**

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
- All eight `HRMS-P1-APPROVAL-2026-08-11-v1` decisions were approved on 2026-08-11, authorizing additive source, migration, rollback, verification, partition-planning, and backfill-authoring work. This approval did not authorize database execution.

## Scope

Included: employee/person/employment master, directory/workforce bridge, organization hierarchy, attendance, leave, employment documents, and onboarding/lifecycle paths that mutate core employment records.

Excluded this session: Payroll calculations, Recruitment/ATS internals, performance, benefits, engagement and unrelated HR areas.

## Findings status

`TASKS.md` is the authoritative per-finding ledger. There are no unclassified
`[ ]` items. Two source-level delivery gaps remain explicit rather than being
overclaimed: termination email needs tenant-scoped outbox deduplication plus an
atomic claim/lease and completion transition, and onboarding reminders need a
durable resumable job/status boundary instead of processing every keyset page in
one HTTP request.

Locally verified complete (`[x]`):

- Tooling: `BASE-006`.
- API/correctness: `API-002`, `API-005`, `API-007` through `API-009`,
  `API-012`, `API-013`, `API-015`, `API-016`, `API-018`.
- Access/security: `SEC-041`, `SEC-042`, `SEC-061` through `SEC-066`.
- Cost/UI: `COST-031`, `COST-035` through `COST-039`, `COST-061` through
  `COST-065`, `UI-001` through `UI-015`, and `UI-CONTRACT`.
- Cleanup decisions: `DEAD-001`, `DEAD-002`, the unreferenced ability helper,
  and the obsolete general-profile bank component.

Implemented locally but still requiring clone/deployment/adoption evidence
(`[~]`): `BASE-004`, `BASE-007`, all schema findings `SCH-001..016`,
`API-001`, `API-003`, `API-004`, `API-006`, `API-010`, `API-011`,
`API-014`, `API-017`, `SEC-001`, `SEC-003..007`, `SEC-030..040`,
`SEC-043..046`, `SEC-060`, `COST-001..007`, `COST-030`, `COST-032..034`,
and `COST-060`.

External evidence/authority gates (`[!]`): `BASE-001..003`, `BASE-005`,
managed-KMS `SEC-002`, production-size metrics/E2E, signed reconciliation,
exact manifests, and clone forward/rollback/restore rehearsal. These cannot be
completed safely from the live primary or by source changes alone.

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
- Frontend focused validation passed for the changed slices and the full frontend
  type-check passed on the integrated tree; the earlier Phase 0 coverage figure
  remains the comparison baseline.
- Backend hot-service tests: 8 suites / 80 tests passed; representative-file coverage 52.55% statements, 35.20% branches, 53.90% functions, 55.02% lines.
- Backend lifecycle chunk: 7 suites / 31 tests passed; 1 suite / 2 tests failed because its mock lacks the production transaction API.
- Broad backend scoped suite timed out after 604 seconds.
- Knip production cycle and unused-production checks passed in both repositories. Madge is unavailable and was not added.

## Phase 1 implementation validation

- Backend `pnpm typecheck` passed after the final rollback/reapply integration.
- The SQL-managed migration integrity suite passed 35/35, including fail-closed down ordering, durable `ROLLED_BACK` transitions, reapplication safety, SQL/source column order, function search paths, privilege checks, and rollback refusal guards.
- The schema-bundle rollback/ledger/catalog suites passed 6 suites / 28 tests in the final agent run; an independent root rerun of ledger/executor passed 2 suites / 10 tests.
- The partition manifest, dependency, options, lifecycle, and exact-set suites passed 5 suites / 43 tests in the final root runs. The signed leave-opening verifier previously passed 4 suites / 22 tests.
- `knip --production --cycles` and the production files/exports/types check passed after all final files landed. No new production file is orphaned and no import cycle was reported.
- Every newly added TypeScript file is at or below the 300-line target. `git diff --check` is clean apart from expected Windows line-ending notices.
- A focused `--detectOpenHandles` cursor run passed without a detected handle.
  Some broad forced-exit suites still report the repository teardown warning;
  no HRMS-owned test process was left running.
- No migration, partition, backfill, tenant-profile transition, or other database mutation was executed.

## Clone rehearsal readiness check (2026-08-12)

- `pnpm hrms:schema-bundle` completed in database-free dry-run mode with `databaseAccessed: false`; its root identity and all five forward/down hashes exactly match the frozen identities below.
- The partition planner completed a database-free dry run for all nine approved families. It produced 96 deterministic operations: four August-November 2026 range leaves for each of the four range families and all 16 fixed hash leaves for each of the five hash families. It correctly reported that manifest scope, database identity, and attendance security were not verified.
- No disposable/local database target is configured in this worktree or the primary workspace. Every discovered configured database URL is remote; no credential or URL value was printed and no connection was opened.
- No exact forward, rollback, partition, or signed leave-opening approval manifest is present. The repository contains only their strict schemas and verifiers. These artifacts cannot be truthfully generated until the clone database name, roles, server/root identity, approval IDs/expiry, exact applied-operation identities, historical partition months, tenant cohort, and two-reviewer signed leave-opening classifications are supplied.
- Database-free refusal probes passed: schema apply without a manifest returned `RUNNER_APPLY_MANIFEST_REQUIRED`; partition apply without a manifest returned a sanitized failure; and the leave-opening verifier rejected `--apply` with `LEAVE_OPENING_APPLY_UNAVAILABLE`.
- A combined six-suite schema-runner Jest command reached its bounded 60-second timeout without output. Its exact three-process Jest chain was terminated and verified absent; it is not counted as a pass or failure. The earlier isolated 6-suite / 28-test pass remains the latest completed runner evidence.
- Result: static readiness is complete, but database rehearsal remains correctly blocked. A remote URL—especially the live primary—is not an acceptable substitute for the separately authorized disposable production-size clone.

## Phase 2 API/security implementation status

- `SEC-030` is implemented in source: employee employment GET is now read-only, returns not found instead of materializing a global user, and the explicit legacy sync/backfill boundary refuses any user without an active membership in the target organization.
- `SEC-031` is implemented in source for the audited employee-master read surfaces: list/detail, employment, timeline, history, reports-to-me, manager-scorecard, profile PDF, legacy HR people/employments, directory, org chart/team membership, celebrations, availability, expert search, and skills matrix now resolve scope through `AccessService` and apply it in the repository predicate. Actor and scope are included in affected cache keys, and out-of-scope target IDs resolve as not found rather than revealing record existence.
- The ordinary-view DTO portion of `SEC-032` is implemented in source: employee list/detail, profile PDF, and legacy HR people reads no longer select or serialize salary, bank/tax values, date of birth, personal email, address, or emergency-contact data. The general employee PATCH contract strictly rejects salary, tax ID, and bank details; post-onboarding edits use the separately permissioned and access-audited sensitive endpoint, and salary editing remains available in that permission-gated UI. Managed-KMS storage and the broader public/private table split remain open under `SEC-002`, `SEC-003`, and the approved Batch D gate.
- `SEC-033` is implemented in source for employee profile updates: the bespoke session-claim helper was removed, non-self mutations now use the database-resolved `AccessService` manage scope in the tenant membership predicate, and an out-of-scope employee is not distinguished from a missing employee.
- `SEC-034` is implemented in existing-schema-compatible source: legacy employment and workforce engagement writes validate active tenant people, org-unit kind/status, manager engagement, job role, and job level references before persistence; the dangling numeric employment-type path now fails closed in favor of `workerType`. Employee custom-field value reads/writes require an in-scope tenant employment, field IDs must belong to the same tenant/entity, duplicate IDs are rejected, and employee/department reference values are tenant validated. `DirectoryService` was split into 323-line people and 484-line workforce services without a module import cycle.
- `SEC-035` is implemented in source for onboarding documents: cross-user upload and review now require an active target-organization membership plus the caller's database-resolved onboarding scope, document/audit writes are atomic, tenant status is derived from latest tenant document facts instead of global `users`, and submission automation is registered only after the request transaction commits. The unused persistent-file detail path was removed after a repository-wide zero-reference check.
- `SEC-036` is implemented in source for completed terminations: the workflow archives only the affected organization membership through `OrgMembershipService`, preserves the global account and sibling-organization sessions, and performs the tenant lifecycle change inside the existing transaction boundary.
- `SEC-037` is implemented in source for experience letters: generation now begins from a target-organization membership, requires an organization-scoped Workforce or legacy HR employment, uses only tenant employment dates/designations, and never resolves an arbitrary global user directly. The cohesive generator was extracted so `exit.service.ts` remains below the 500-line cap and its query uses only columns available before the pending Phase 1 migration.
- `SEC-038` is implemented in source and UI for onboarding task ownership: ordinary employees can mutate only their own `NEW_HIRE` tasks; `MANAGER`, `IT`, and HR administrative task actions require the corresponding `AccessService` capability and employee scope. Updates use an organization-scoped compare-and-set transaction, completion side effects wait for commit and reopen an explicit tenant transaction, the API returns a server-derived `canComplete`, and both onboarding task views hide mutation controls when it is false. New template input accepts only the four supported owner roles.
- `SEC-040` is implemented in source and UI: leave requests no longer accept a client-selected approver, the backend chooses an active in-scope approver from current database permissions, and the form explains the assigned approver or the missing-configuration blocker. Comp-off is now a separate `hr:leaves:manage` command that validates the active target membership, serializes the current-year balance update, records the ledger entry, and writes a critical audit event. Leave approval predicates bind assignment and DataScope in both reads and writes. Leave-type administration was extracted into a cohesive service so the main leave service is below the 500-line hard cap.
- `SEC-043` is implemented in source: attendance summaries enter through an authenticated scoped service boundary, resolve current database attendance scope, and restrict stable active-member pagination to own/team/all rows in SQL. A view-only employee retains only self-service visibility, and stale owner token claims or a malformed permission catalog cannot widen access.
- `SEC-044` is implemented in source and UI: attendance email reports require `hr:attendance:manage`, use the database-resolved attendance scope, accept at most 10 unique active-organization recipients and 31 past-or-present days, aggregate and cap the employee result set, and are limited to five requests per user per hour. The critical request audit contains counts/scope rather than recipient addresses, and delivery uses the existing durable retry outbox instead of synchronous provider calls. Unauthorized users do not render the report action; the dialog accurately presents one private-recipient list and queued-delivery status.
- `SEC-045` is implemented in source for resignation completion: asset-recovery and access-revocation check failures now fail closed with actionable service-unavailable responses. Proceeding requires the existing explicit override flag, a nonblank reason, and a successfully persisted audit record that distinguishes a pending dependency from an unavailable verification service.
- `SEC-046` is implemented for the audited HRMS mutation boundary: employee/directory/workforce, leave/work-log, employment-document, termination, and organization-hierarchy mutations now await `AuditService.logCritical`, so an audit failure prevents the request transaction from committing. Best-effort telemetry is explicitly noncritical and registers an after-commit hook that writes in a fresh tenant context, avoiding both rolled-back false events and reuse of a closed request transaction. A source invariant prevents these HRMS mutation services from regressing to fire-and-forget audit calls.
- The unreferenced `ability.helpers.ts` and general-profile `bank-details-section.tsx` files were deleted only after repository-wide reference checks. Leave-type administration and termination communications were extracted along actual responsibility boundaries; every changed production TypeScript/TSX file is now below the 500-line hard cap. Production Knip files/exports/types and cycle checks pass in both repositories.
- Focused API/security validation passed the current authorization/schema suite 8/8 and canonical-read suite 1/1; the preceding employee read slice passed 4 suites / 12 tests. New legacy-core scope/DTO coverage passed 4/4 and directory/cache scope coverage passed 5/5. Lifecycle validation also covers onboarding document scope/atomicity/after-commit dispatch (5/5), onboarding task ownership/concurrency/after-commit dispatch (5/5), task-card action visibility (2/2), tenant-only termination (the full 5-test legacy file passed in three bounded describe-block runs), tenant-scoped experience letters (2/2), fail-closed completion gates (4/4), and completion-guard integration/final review (3/3). Leave authority passed 5 focused suites / 20 tests plus 2 legacy suites / 8 tests; attendance-summary scope passed 2 suites / 9 tests. Tenant/type reference validation passed 8/8, the legacy HR core scope suite passed 4/4, and the complete directory behavior suite passed 38/38 after service extraction. Attendance report validation/scope/outbox coverage passed 2 suites / 13 tests, the rate-limit service passed 4/4, and the frontend permission invariant passed 9/9. Durable audit dispatch/invariants passed 2 suites / 21 tests; affected directory, employee, leave, hierarchy, lifecycle, and journey regressions passed 58 additional tests. Full backend and frontend type-checks, targeted ESLint, production Knip unused-file/export/type checks, production cycle checks, the 500-line cap scan, and diff checks pass. Jest still emits the known worker/open-handle warning after successful isolated runs. No connected browser was available for the final signed-in visual click-through.
- These findings remain product-open until clone/tenant integration tests, deployment, and accepted reconciliation evidence pass. No database write or tenant-profile transition was performed.

## Frozen Phase 1 SQL identities

| Batch | Forward SHA-256 | Down SHA-256 |
|---|---|---|
| `0000_hrms_profiles_workforce` | `21852bf4d000b442f1b0f2f5616642dfa114c72931332709cfe5069b4fc0baae` | `b706aa658247ab4b7899bcfc88f561cfdbb91e20c83f604c8e62b05ced228f81` |
| `0001_hrms_effective_history` | `d4f4cd48eef84722c587e0b0501683425e9db5d4b76eb5b2d8b21df03d013e52` | `2100c408768aeab681eb5e6d440c398370b91c4bf922a3a53bd17501e5d3e356` |
| `0002_hrms_leave_ledger` | `a982c0de3e69af35eb4fab2270ba2303f2cb7638d9c2937aec33a60725dc6f31` | `52971bd14b6e04a6f141e8e1edf84566812d4933c719e52ba207a5f95e159159` |
| `0003_hrms_attendance_events` | `738a718b03f1a951451ffd08e283e26786881a8126e0575b37dc9392cb81db66` | `106edc94e409149778baea3c6d80c57e859ebed903f9b62921eda5d9ec640c79` |
| `0004_hrms_hierarchy_audit` | `4704fd8db0f2b575fd8bc54d4736e47a87d173466e0cade624e659ea9d80d17b` | `0bdc891116df59ba616ab7a3201b665b57d911e0bb6d6ab110146d913e86b57c` |

These hashes identify the authored files only. They are not a production approval manifest or a digital signature.

## Approved architectural decisions

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

1. Add tenant-scoped email-outbox deduplication, atomic claim/lease semantics, and
   a truthful termination delivery completion transition; do not mark delivery
   `SENT` merely because it was queued.
2. Move onboarding reminder pagination behind a durable resumable job/worker and
   bounded status endpoint, preserving tenant attribution and idempotency.
3. Obtain a disposable production-size clone or point-in-time branch and separately authorize the rehearsal; never substitute the live primary.
4. Build separate exact forward, rollback, partition, and leave-opening manifests for that clone. Bind the target database/roles, frozen file hashes, per-file applied-operation identities, approval IDs, expiry, and initial cohort.
5. Rehearse forward, catalog verification, partition routing, signed leave-opening verification, atomic reverse-suffix rollback, reapplication, refusal paths, RLS, roles, restore, and resume behavior.
6. Present the rehearsal evidence, exact production manifests, backup/restore evidence, and initial tenant cohort for a separate production-execution decision. Do not expand into Payroll or Recruitment or activate canonical APIs while these HRMS-core gates remain open.

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
- `backend/migrations/pending/hrms-phase1/`
- `backend/src/db/schema/hrms-phase1-sql-managed.ts`
- `backend/src/scripts/hrms-schema-bundle/`
- `backend/src/scripts/hrms-partition-planner/`
- `backend/src/scripts/hrms-leave-opening-backfill/`

Production mutation status: **none**.
