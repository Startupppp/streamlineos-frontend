# TASKS — HRMS core

Updated: 2026-08-18

Legend: `[x]` verified complete · `[~]` implemented locally but still needs
clone/deployment/adoption evidence · `[!]` external evidence/authority gate ·
`[ ]` actionable in this worktree. Finding definitions and evidence are in
`AUDIT-HRMS.md` and its linked canonical audit.

## Phase 0 baseline and tooling

- [!] BASE-001 Obtain a disposable production-size clone; the live tiny dataset
  is not a scale fixture.
- [!] BASE-002 Capture representative query/endpoint p50/p95 and heavy-query
  history; the current environment has no historical instrumentation.
- [!] BASE-003 Re-capture index scan evidence on the production-size clone before
  dropping any index; current zero-scan statistics are not deletion proof.
- [~] BASE-004 Preserve tenant RLS and add relational tenant integrity; authored
  schema/catalog gates await clone verification.
- [!] BASE-005 Capture real request/query counts for ten screens in the clone/E2E
  environment; static lower bounds are already in the audit.
- [x] BASE-006 Frontend coverage collection is repaired without adding a
  dependency; the bounded list-pagination probe reports 100% statements,
  branches, functions and lines.
- [~] BASE-007 Keep verification bounded; stale lifecycle fixtures were repaired
  and a focused `--detectOpenHandles` run passed, while broad forced-exit runs
  can still emit the repository teardown warning.

## Phase 1 schema

- [~] SCH-001 Canonical tenant workforce and compatibility maps authored.
- [~] SCH-002 Composite tenant candidate keys/FKs authored.
- [~] SCH-003 Append-only leave authority and balance projection authored.
- [~] SCH-004 Permanent leave source/idempotency/reversal identity authored.
- [~] SCH-005 Append-only attendance event/session projection authored.
- [~] SCH-006 Six tenant-scoped child relations, deterministic backfill,
  exact-match compatibility reads/dual writes, verification and guarded
  rollback are authored; clone rehearsal and contract removal remain.
- [~] SCH-007 Date/timestamptz contracts authored for canonical facts.
- [~] SCH-008 DB checks/enums and additive legacy attendance, leave, and
  offboarding constraints are authored; clone migration validation remains.
- [~] SCH-009 Canonical uniqueness/open-state invariants authored.
- [~] SCH-010 Effective-dated assignment/reporting history authored.
- [~] SCH-011 Version columns and compare-and-set lifecycle writers are authored;
  clone migration validation and outbox-backed email completion remain.
- [~] SCH-012 Aggregate lifecycle/actor policies authored for canonical facts.
- [~] SCH-013 Bigint-safe canonical event identities authored; legacy PK contract
  is deferred until compatibility readers are removed.
- [~] SCH-014 Tenant hierarchy closure projection authored.
- [~] SCH-015 Canonical holiday/device choices and tenant-scoped compatibility
  adapters are implemented after consumer/FK proof; active legacy stores remain
  until link backfill, canary reconciliation and zero-reference proof.
- [~] SCH-016 SQL-managed catalog/source parity and migration integrity checks
  authored and locally verified.

## Phase 2 API and correctness

- [~] API-001 HR core lists default to bounded keyset cursors. The explicitly
  requested legacy `page=` compatibility branch remains until external-client
  deprecation evidence exists.
- [x] API-002 Manager validation is batched and employee updates preserve the
  pre-update joining date used by dependent lifecycle logic.
- [~] API-003 Canonical command/compatibility boundaries are authored; full
  dual-writer clone reconciliation remains.
- [~] API-004 Active check-in, checkout, and break writers serialize and append
  canonical events while preserving the legacy projection; projection removal
  waits for clone rehearsal and canonical adoption.
- [x] API-005 Attendance regularization uses conditional transactional state
  transitions and durable after-commit workflow dispatch.
- [~] API-006 Leave transitions are serialized and ledger-compatible; canonical
  ledger authority still requires the clone/deployment profile gate.
- [x] API-007 Leave-page reads are side-effect-free and bounded by stable cursor
  contracts.
- [x] API-008 Effective-change approval/apply is conditional, server-snapshotted
  and bounded.
- [x] API-009 Onboarding initiation, task and submit writes are atomic with
  durable after-commit dispatch.
- [~] API-010 Document mutation/audit atomicity and serialized generated-version
  allocation are implemented; clone migration verification remains.
- [~] API-011 Tenant-only termination, versioned lifecycle transitions, and
  completion guards are implemented; deduplicated outbox claim/completion and
  canonical lifecycle adoption remain.
- [x] API-012 Probation lists are cursor-bounded and review transitions serialize
  their aggregate updates.
- [x] API-013 HR failures use the common sanitized error envelope; provider and
  caught internal messages are not returned to clients.
- [~] API-014 Existing idempotency, rate-limit, outbox and durable-job primitives
  cover the audited bulk/report/apply commands; review-only export-job activation
  and environment workers remain deployment-gated.
- [x] API-015 Hierarchy dependency validation plus archive is one serialized
  command with shared invalidation.
- [x] API-016 Timeline pagination uses stable cross-source cursor ordering rather
  than offset-merging three unbounded prefixes.
- [~] API-017 Engagement tenant references are validated; conditional versioned
  edit/terminate remains.
- [x] API-018 Attendance business dates are derived from the organization
  timezone while event instants remain timestamps.

## Phase 4 security, privacy and access control

- [~] SEC-001 Composite tenant ownership constraints are authored; clone validate.
- [!] SEC-002 Managed-KMS encryption waits for the named custody/IAM/rotation/
  recovery ADR and clone rehearsal; no insecure fallback is permitted.
- [~] SEC-003 Canonical identity/public/private separation is authored; legacy
  plaintext compatibility remains until migration.
- [~] SEC-004 Canonical history uses restrictive retention semantics; legacy
  cascade removal remains contract-phase work.
- [~] SEC-005 Immutable canonical audit is authored; deploy/privilege-test on clone.
- [~] SEC-006 Tenant keys/composite paths are authored for the Phase 1 children;
  clone RLS verification remains.
- [~] SEC-007 Protected attendance evidence/retention/hold model is authored;
  KMS activation remains externally gated.
- [~] SEC-030 Arbitrary-user GET materialization removed.
- [~] SEC-031 Employee/directory/hierarchy reads enforce database DataScope.
- [~] SEC-032 Ordinary employee DTOs exclude salary/private fields; managed-KMS
  field storage remains under SEC-002/003.
- [~] SEC-033 Bespoke claim authorization removed from employee mutations.
- [~] SEC-034 Tenant/type reference validation implemented in active writers.
- [~] SEC-035 Onboarding document membership/scope/transaction boundary fixed.
- [~] SEC-036 Termination is tenant membership/employment scoped.
- [~] SEC-037 Experience letters require tenant employment evidence.
- [~] SEC-038 Onboarding task actions enforce owner persona and scope.
- [~] SEC-039 Persistent document access is tenant/scope protected, signed and
  access-audited; managed-KMS encryption activation remains under SEC-002.
- [~] SEC-040 Server-derived leave approver and separate comp-off authority fixed.
- [x] SEC-041 Hierarchy mutations use one canonical command/cache invalidation
  boundary; proven active legacy callers remain thin compatibility adapters.
- [x] SEC-042 HR entitlement and Settings hierarchy routes use the canonical
  module/permission ownership contract.
- [~] SEC-043 Attendance summary enforces database scope in SQL.
- [~] SEC-044 Attendance email report is bounded, queued, rate-limited and audited.
- [~] SEC-045 Exit dependency failures fail closed with audited override.
- [~] SEC-046 Critical HRMS mutation audit is awaited; best-effort telemetry is
  after-commit in a fresh tenant context.
- [~] SEC-060 Audited employee list/detail/page responses exclude sensitive
  fields and sensitive edits are separated; managed-KMS storage remains under
  `SEC-002`/`SEC-003`.
- [x] SEC-061 HR query keys include tenant/actor/access scope and cache clearing is
  enforced on logout, 401 and organization switch.
- [x] SEC-062 HR administration routes have exact server permission/module gates.
- [x] SEC-063 Document mutations are hidden by the exact backend capability and
  remain server-authorized.
- [x] SEC-064 Settings membership controls use the backend-derived canonical
  management capability instead of broad structural roles.
- [x] SEC-065 All 81 audited HR query hooks match their endpoint permission and
  module gates; denied/disabled runtime tests issue zero requests.
- [x] SEC-066 Module loading, failure and loaded-empty states fail closed across
  sidebar, dashboard and route navigation surfaces.

## Phase 3 caching and cost

- [~] COST-001 Directory search is tenant-scoped, bounded and matched to authored
  indexes; production-scale plan proof remains a clone metric gate.
- [~] COST-002 Partitioned canonical leave/attendance/audit parents and planner are
  authored; clone routing/rehearsal remains.
- [~] COST-003 Canonical attendance events and breaks have active dual writers;
  removal of retained legacy projections remains under API-004.
- [~] COST-004 Canonical workforce plus compatibility projection is authored.
- [~] COST-005 Canonical audit indexes and bounded cursor reader are authored and
  active; clone index-plan verification remains.
- [~] COST-006 Hierarchy closure has a profile-aware reader with adjacency shadow
  validation and safe fallback; clone activation and scale benchmark remain.
- [~] COST-007 Duplicate holiday/device reads use canonical-precedence adapters
  and biometric mirror links; physical removal remains contract-phase work.
- [~] COST-030 Employee/directory/hierarchy lists default to bounded cursors; the
  explicit legacy `page=` compatibility branch remains until deprecation proof.
- [x] COST-031 Attendance policy/config evaluation batches attribute and policy
  queries with fixed query-count tests.
- [~] COST-032 Workforce synchronization uses a fixed high-water mark, 100-row
  keyset batches and concurrency four; a durable queue is deferred because no
  approved HR queue substrate/dependency exists.
- [~] COST-033 Attendance email reporting caps and queues, and onboarding reminders
  keyset-batch recipients and outbox writes; a durable resumable reminder job and
  status endpoint remain so the HTTP request does not process every page.
- [~] COST-034 Hierarchy counts aggregate in SQL and tree/headcount reads use
  actor/scope-versioned tenant caches with post-commit invalidation; closure-table
  activation/benchmark waits for the Phase 1 deployment.
- [x] COST-035 Timeline reads use stable cursors and no deep prefix materialization.
- [x] COST-036 Onboarding document status uses latest-row query shapes instead of
  loading every historical version.
- [x] COST-037 Org chart, skills matrix and probation lists are cursor-bounded and
  lazy-loaded.
- [x] COST-038 The mutation-to-cache invalidation matrix is documented and its
  tenant/actor/versioned invalidations are implemented.
- [x] COST-039 Directory/skills queries no longer materialize large ID sets or use
  wildcard full-workforce scans.
- [~] COST-060 Employee export is an audited durable server job with private-object
  storage; its review-only migration and worker activation remain external gates.
- [x] COST-061 The HR hub uses one permission-derived snapshot request with
  per-section partial-success envelopes instead of many browser requests.
- [x] COST-062 Document landing uses server list/stat summaries and async employee
  selectors; independent rich-document/letter sections keep scoped caches.
- [x] COST-063 Organization chart branches are lazy cursor pages and do not build
  the full workforce tree in the browser.
- [x] COST-064 Permission/module-denied HR hooks issue zero network requests.
- [x] COST-065 Hierarchy parent selectors use debounced server cursor search and
  preserve out-of-page selections.

## Phase 5 UI/UX

- [x] UI-001 Employee self-service navigation is separated from HR administration.
- [x] UI-002 Hierarchy UX uses canonical archive/restore lifecycle actions instead
  of legacy hard delete.
- [x] UI-003 Document filtering, cursor pagination, statistics and quota are
  server-authoritative.
- [x] UI-004 Document removal uses the shared named confirmation and error flow.
- [x] UI-005 Org chart is branch-lazy and workforce export is a durable server job.
- [x] UI-006 Manager/parent inputs use shared server-search cursor selectors.
- [x] UI-007 Attendance lists use shared `ErrorState`, `getErrorMessage` and
  cursor controls.
- [x] UI-008 Included HRMS-core list screens use the shared loading/error/empty
  contract; unrelated HR products remain in their own module sessions.
- [x] UI-009 Document actions align with exact document permissions.
- [x] UI-010 Document types use one canonical query/cache data layer.
- [x] UI-011 HR organization tabs wrap responsively and remain usable at 375px.
- [x] UI-012 Document row actions are keyboard/focus visible.
- [x] UI-013 My Documents navigation uses the exact self permission.
- [x] UI-014 Personal onboarding tasks use the canonical self route/permission.
- [x] UI-015 HRMS-core, sidebar and shared touched production files are split by
  responsibility below 500 lines; Payroll input remains for the Payroll session.
- [x] UI-CONTRACT The HRMS UI contract and enforcement invariants are documented.

## Phase 7 cleanup and dead-code decisions

- [x] DEAD-001 Duplicate HR hierarchy APIs are active, not dead; retain until
  SEC-041 consumer migration proves removal safe.
- [x] DEAD-002 Duplicate holiday/device families are active, not dead; retain
  until SCH-015/COST-007 adapters and zero-reference proof exist.
- [x] Remove `ability.helpers.ts` only after production Knip/reference proof.
- [x] Remove the general-profile bank-details component only after reference proof.

## External completion gates

- [!] Clone forward/catalog/RLS/privilege/partition/backfill/rollback/reapply/
  restore rehearsal and accepted evidence.
- [!] Exact production manifests and separate target-bound execution decision.
- [!] Managed-KMS ADR and rehearsal before sensitive schema activation.
- [!] Two-person signed zero-error identity/PII and leave-opening classifications.
- [!] Production-size latency/query/storage metrics and signed-in critical-flow E2E.
