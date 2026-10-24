# People + Payroll Architecture Hardening PRD

**Status:** Normative implementation addendum; all code acceptance starts NOT_STARTED.  
**Date:** 2026-10-24  
**Scope:** HRMS and India-first Payroll; controls apply at the first tier where a capability is enabled.  
**Owner:** People Architecture with the fact-owning domain named below.  
**Parents:** [Domain contracts](./00a-suite-domain-contracts-prd.md), [tier register](./00c-requirement-tier-traceability-prd.md), and [release evidence](./06a-operations-release-evidence-prd.md).

## 1. Authority and complete source coverage

This addendum turns the [preserved visual review](./architecture-review/2026-10-24-architecture-review.html) into executable requirements. The complete HTML is retained, including all eleven candidates, twenty-four corner-case records, ten executed-check records, before/after diagrams, contract/file/route proposals, source hashes, and explicit uncertainty. [HTML coverage](./architecture-review/html-prd-coverage.json) maps every annotated semantic point to the requirements below; source/evidence/reference points remain preserved without becoming invented product features.

PRD 00a governs domain names and one mutable-fact owner. Existing owner PRDs govern business behavior; this file solely owns additive FR-ARCH identifiers. P0 controls apply to enabled P0 journeys; P1 provider/advanced features and P3 country packs retain their existing tier. Documenting a control does not promote an entire later-tier feature to P0. PRD 06a minimums, including new-request revocation within 60 seconds, remain binding. The [Claude execution guide](./17-claude-architecture-execution.md) specifies the order and resumable process.

The dated audit found source defects and risks; it did not certify live production exploitation, legal compliance, provider operation or database/browser behavior. Ninety-eight historical focused tests passed without covering every new defect. These passes are audit evidence only. The [execution ledger](./architecture-review/execution-ledger.json) contains the single status row for each of the 158 acceptance criteria. None is pre-closed by documentation or old audit tests.

## 2. Target design contract

- Directory owns person/membership identity; Core HR owns worker/engagement/employment business facts under 00a. Publish current writers and a staged migration; table folder placement is not a second business owner.
- Workforce owns approved time packages. Payroll owns frozen cross-source input and immutable results; calculation consumes a validated generation, with exact values and explicit eligibility.
- Calendar owns events and receives visibility-safe source projections. Charts, exports and AskOS consume owner-authorized facts with period, scope, coverage and provenance.
- Existing backend parent/core, DTO, direct Drizzle and ScopedRead patterns remain. Preserve AuthContext and accepted ADRs 0004/0005/0006. New modules earn their seam through hidden behavior and real adapter variation.
- Backend cache keys carry tenant/access-shape/filter/version dimensions. Authenticated frontend key arrays remain tenant-neutral behind org/user-scoped QueryClient hashing; preserve access-version semantics.
- Thin route files gate access; domain query options own key/fetch/contract/staleTime and shared SSR/infinite envelopes. Page/task modules handle intentional access/loading/error/partial/empty/conflict states.
- Keep current URLs unless a separately validated disposition migrates callers. Strict versioned schemas, safe error envelopes, command idempotency and expected versions form one published interface.

## 3. Requirement index

| ID | Requirement | Business owner PRD | Program |
|---|---|---|---|
| FR-ARCH-001 | Authorize payroll aggregates before response and cache fill | [06-platform-intelligence-compliance-prd.md](./06-platform-intelligence-compliance-prd.md) | AP-01 |
| FR-ARCH-002 | Apply declared metric filters, periods and run-status semantics | [06-platform-intelligence-compliance-prd.md](./06-platform-intelligence-compliance-prd.md) | AP-01 |
| FR-ARCH-003 | Use canonical department identifiers in AskOS | [06-platform-intelligence-compliance-prd.md](./06-platform-intelligence-compliance-prd.md) | AP-01 |
| FR-ARCH-004 | Restore the ScopedRead sensitive-data seam | [01-core-hr-lifecycle-prd.md](./01-core-hr-lifecycle-prd.md) | AP-02 |
| FR-ARCH-005 | Enforce access revocation and actor lifecycle across surfaces | [06-platform-intelligence-compliance-prd.md](./06-platform-intelligence-compliance-prd.md) | AP-02 |
| FR-ARCH-006 | Publish one identity mapping and effective Employment Facts interface | [01-core-hr-lifecycle-prd.md](./01-core-hr-lifecycle-prd.md) | AP-03 |
| FR-ARCH-007 | Make payroll eligibility explicit for workers and employments | [05-india-payroll-prd.md](./05-india-payroll-prd.md) | AP-03 |
| FR-ARCH-008 | Unify versioned schemas and current wire contracts | [06-platform-intelligence-compliance-prd.md](./06-platform-intelligence-compliance-prd.md) | AP-04 |
| FR-ARCH-009 | Version and validate every frozen snapshot section | [05-india-payroll-prd.md](./05-india-payroll-prd.md) | AP-04 |
| FR-ARCH-010 | Prove snapshot completeness and source provenance | [02-workforce-management-prd.md](./02-workforce-management-prd.md) | AP-04 |
| FR-ARCH-011 | Make HR input-period build, lock and unlock atomic and versioned | [05b-india-payroll-controls-edge-cases-prd.md](./05b-india-payroll-controls-edge-cases-prd.md) | AP-05 |
| FR-ARCH-012 | Preserve locked history and route late changes through correction | [05b-india-payroll-controls-edge-cases-prd.md](./05b-india-payroll-controls-edge-cases-prd.md) | AP-05 |
| FR-ARCH-013 | Use validated exact payroll money, rates and rounding | [05b-india-payroll-controls-edge-cases-prd.md](./05b-india-payroll-controls-edge-cases-prd.md) | AP-05 |
| FR-ARCH-014 | Define business dates and approved time quantities | [02-workforce-management-prd.md](./02-workforce-management-prd.md) | AP-05 |
| FR-ARCH-015 | Reconcile bank-return files idempotently with per-row outcomes | [05-india-payroll-prd.md](./05-india-payroll-prd.md) | AP-06 |
| FR-ARCH-016 | Represent payment unknown, partial, return and reconciliation honestly | [05b-india-payroll-controls-edge-cases-prd.md](./05b-india-payroll-controls-edge-cases-prd.md) | AP-06 |
| FR-ARCH-017 | Preserve payout coverage, run transitions and stale-approval controls | [05c-payroll-statutory-transition-tables-prd.md](./05c-payroll-statutory-transition-tables-prd.md) | AP-06 |
| FR-ARCH-018 | Make leave-to-payroll and downstream projection intent durable | [02-workforce-management-prd.md](./02-workforce-management-prd.md) | AP-07 |
| FR-ARCH-019 | Make accepted-hire onboarding and BGV handoff repairable | [01-core-hr-lifecycle-prd.md](./01-core-hr-lifecycle-prd.md) | AP-07 |
| FR-ARCH-020 | Preserve the Payroll-to-Accounting posting seam | [05-india-payroll-prd.md](./05-india-payroll-prd.md) | AP-07 |
| FR-ARCH-021 | Keep Calendar projections visibility-safe and failure-aware | [02-workforce-management-prd.md](./02-workforce-management-prd.md) | AP-08 |
| FR-ARCH-022 | Deepen governed insights for charts, reports and drill-through | [06-platform-intelligence-compliance-prd.md](./06-platform-intelligence-compliance-prd.md) | AP-08 |
| FR-ARCH-023 | Ground AskOS in owner reads, effective policies and current authority | [06-platform-intelligence-compliance-prd.md](./06-platform-intelligence-compliance-prd.md) | AP-08 |
| FR-ARCH-024 | Own backend cache freshness and access-shaped keys | [06-platform-intelligence-compliance-prd.md](./06-platform-intelligence-compliance-prd.md) | AP-09 |
| FR-ARCH-025 | Preserve client cache identity and centralize query options | [07-pages-navigation-roles-prd.md](./07-pages-navigation-roles-prd.md) | AP-09 |
| FR-ARCH-026 | Share employee prefetch and infinite-list identity | [07-pages-navigation-roles-prd.md](./07-pages-navigation-roles-prd.md) | AP-09 |
| FR-ARCH-027 | Concentrate Action Center source behavior | [04-employee-manager-service-prd.md](./04-employee-manager-service-prd.md) | AP-10 |
| FR-ARCH-028 | Keep mutation outcomes, conflicts and cache effects local | [07-pages-navigation-roles-prd.md](./07-pages-navigation-roles-prd.md) | AP-10 |
| FR-ARCH-029 | Keep shareable filters and navigation state consistent | [07b-experience-content-quality-prd.md](./07b-experience-content-quality-prd.md) | AP-10 |
| FR-ARCH-030 | Bound and project queries without truncating business completion | [07-data-performance-prd.md](./07-data-performance-prd.md) | AP-11 |
| FR-ARCH-031 | Make document publication and cleanup recoverable | [05-india-payroll-prd.md](./05-india-payroll-prd.md) | AP-12 |
| FR-ARCH-032 | Validate downloads and reauthorize export lifecycle | [06-platform-intelligence-compliance-prd.md](./06-platform-intelligence-compliance-prd.md) | AP-12 |
| FR-ARCH-033 | Cover governed retention and accountless document delivery | [05-india-payroll-prd.md](./05-india-payroll-prd.md) | AP-12 |
| FR-ARCH-034 | Instrument recovery, projection lag and operational controls | [06a-operations-release-evidence-prd.md](./06a-operations-release-evidence-prd.md) | AP-13 |
| FR-ARCH-035 | Prove full task states, responsive and accessible journeys | [07b-experience-content-quality-prd.md](./07b-experience-content-quality-prd.md) | AP-13 |
| FR-ARCH-036 | Migrate by expand, reconcile, enforce and retire | [09-implementation-migration-cockpit-prd.md](./09-implementation-migration-cockpit-prd.md) | AP-13 |
| FR-ARCH-037 | Keep file locality and deep modules aligned with current standards | [08-architecture-prd.md](./08-architecture-prd.md) | AP-11 |
| FR-ARCH-038 | Require complete fixed-revision release and capability evidence | [06a-operations-release-evidence-prd.md](./06a-operations-release-evidence-prd.md) | AP-14 |
| FR-ARCH-039 | Make audit coverage, gate scope and source revision checkable | [06a-operations-release-evidence-prd.md](./06a-operations-release-evidence-prd.md) | AP-00 |
| FR-ARCH-040 | Provide a resumable Claude execution and evidence contract | [06a-operations-release-evidence-prd.md](./06a-operations-release-evidence-prd.md) | AP-00 |

## 4. Atomic acceptance criteria

Every criterion below is independently addressable. Implementation must attach evidence at all listed levels; the ledger, rather than a duplicate checkbox in a domain document, owns status. Source paths are observed starting points, not an exclusive future write reservation. AP-00 resolves current exact files and tests before dispatch.

### FR-ARCH-001: Authorize payroll aggregates before response and cache fill

**Owner:** [06-platform-intelligence-compliance-prd.md](./06-platform-intelligence-compliance-prd.md). **Program:** AP-01. **Tier:** P0 for enabled P0 paths; same controls at first enabled tier for later capabilities. **Required evidence:** source, contract, database.

**Current source:** `backend/src/modules/hr/analytics-plus/hr-analytics-plus.controller.ts`; `backend/src/modules/hr/analytics-plus/hr-command-center-analytics.service.ts`; `backend/src/modules/hr/analytics-plus/hr-analytics-plus.service.ts`.

- **AC-ARCH-001-01:** Seed analytics-only and salary/payroll own, team, all and none actors. Analytics-only responses contain no payroll amount in the command center, exports, cached projection or AskOS. Omission versus null is declared consistently in backend and frontend schemas.
- **AC-ARCH-001-02:** Organization-wide payroll totals require authorized organization-wide salary/payroll scope; Map.has(permission) alone is insufficient. Unsupported scope combinations deny or return an explicitly authorized projection.
- **AC-ARCH-001-03:** Authorization precedes query and cache fill. Test sequential differently scoped actors, permission changes and cache hits; no earlier actor's amount appears in a later response.
- **AC-ARCH-001-04:** Preserve the independent dedicated payroll-cost job and existing backend tenant/object enforcement; changing card visibility cannot satisfy this requirement.

### FR-ARCH-002: Apply declared metric filters, periods and run-status semantics

**Owner:** [06-platform-intelligence-compliance-prd.md](./06-platform-intelligence-compliance-prd.md). **Program:** AP-01. **Tier:** P0 for enabled P0 paths; same controls at first enabled tier for later capabilities. **Required evidence:** contract, database, browser.

**Current source:** `backend/src/modules/hr/analytics-plus/hr-command-center-analytics.service.ts`; `backend/src/modules/hr/analytics-plus/hr-analytics-plus-trends.ts`; `frontend/features/hr/analytics/analytics-page-client.tsx`.

- **AC-ARCH-002-01:** With disjoint department A/B fixtures, each returned metric and drill-through applies the declared department/entity predicate. Unknown or unauthorized department never silently falls back to organization-wide data.
- **AC-ARCH-002-02:** Each metric declares grain, business meaning, period, as-of time, source version, unit/currency, coverage and sensitivity. Define contributing locked/paid run statuses and correction/supplemental treatment; drafts/reopened runs cannot accidentally double-count cost.
- **AC-ARCH-002-03:** Month/quarter/year selection changes every metric it claims to control. Fixed-window metrics label their own period explicitly; KPI, chart, export, drill-through and AskOS agree.
- **AC-ARCH-002-04:** Cache keys encode actual filters and authorized shape, and relevant source writes invalidate those namespaces. Test historical/future periods, missing data versus zero and partial coverage.

### FR-ARCH-003: Use canonical department identifiers in AskOS

**Owner:** [06-platform-intelligence-compliance-prd.md](./06-platform-intelligence-compliance-prd.md). **Program:** AP-01. **Tier:** P0 for enabled P0 paths; same controls at first enabled tier for later capabilities. **Required evidence:** unit, contract, database.

**Current source:** `backend/src/modules/ai/core/tools/hr-copilot-tools.ts`; `backend/src/modules/hr/analytics-plus/dto/hr-analytics-plus.schemas.ts`; `backend/src/db/schema/hr/core-people.ts`.

- **AC-ARCH-003-01:** AskOS department inputs use the current canonical org-unit identifier schema, consistent with HR routes and the text department column; remove the numeric-only mismatch without coercing unrelated IDs.
- **AC-ARCH-003-02:** Validate tenant and object access before executing a filtered read. Reject malformed IDs and foreign/out-of-scope departments with the established safe error semantics.
- **AC-ARCH-003-03:** An AskOS department headcount equals the authorized HR metric for the same fixture, date and department. Include a database/contract case for the real identifier type.

### FR-ARCH-004: Restore the ScopedRead sensitive-data seam

**Owner:** [01-core-hr-lifecycle-prd.md](./01-core-hr-lifecycle-prd.md). **Program:** AP-02. **Tier:** P0 for enabled P0 paths; same controls at first enabled tier for later capabilities. **Required evidence:** source, contract, database.

**Current source:** `backend/src/modules/hr/core/hr-sensitive.service.ts`; `backend/src/modules/hr/core/sensitive-reach.ts`; `backend/src/modules/hr/directory/background-verification.service.ts`; `backend/src/modules/hr/forms/hr-forms-submissions.service.ts`.

- **AC-ARCH-004-01:** Resolve and spend tenant plus supported data scope through ScopedRead in the five reported raw-DataScope sites; backend scope gate passes without expanding its escape allowlist to hide these sites.
- **AC-ARCH-004-02:** Remove default-unrestricted authority from sensitive owner reads. Define own/team/all/none only where the permission catalog supports them; team never becomes unrestricted through a generic boolean helper.
- **AC-ARCH-004-03:** Profile, background verification, template, form, export, search, notification and AI projections apply the same sensitive reach and redaction decision. Denial does not masquerade as an empty-success read.
- **AC-ARCH-004-04:** Preserve ADR-0004 request-local auth facts, ADR-0005 ScopedRead composition and ADR-0006 DI wiring. Test archived/deleted subjects, accountless workers and cross-tenant record IDs.

### FR-ARCH-005: Enforce access revocation and actor lifecycle across surfaces

**Owner:** [06-platform-intelligence-compliance-prd.md](./06-platform-intelligence-compliance-prd.md). **Program:** AP-02. **Tier:** P0 for enabled P0 paths; same controls at first enabled tier for later capabilities. **Required evidence:** contract, database, browser.

**Current source:** `frontend/hooks/api/access.ts`; `frontend/hooks/api/authorized-mutation.ts`; `frontend/components/providers/query-provider.tsx`; `backend/src/modules/access/access.service.ts`.

- **AC-ARCH-005-01:** Server reauthorizes every protected request/command, including after a permission change while a dialog or tab is open. Cached client permission is advisory.
- **AC-ARCH-005-02:** Meet the existing PRD 06a new-request revocation target of at most 60 seconds or stricter governing policy; measure it. Do not replace it with the frontend access query's five-minute staleTime.
- **AC-ARCH-005-03:** On observed revocation, organization/user change, logout or employment termination, protected browser rows, exports and derived views disappear or resolve to denial. Late responses cannot repopulate a prior actor's cache.
- **AC-ARCH-005-04:** Test owner without employee membership, delegated/adviser access expiry, stale approval, open file link and cross-tab invalidation. Preserve the existing org/user client remount and logout/switch clear paths.

### FR-ARCH-006: Publish one identity mapping and effective Employment Facts interface

**Owner:** [01-core-hr-lifecycle-prd.md](./01-core-hr-lifecycle-prd.md). **Program:** AP-03. **Tier:** P0 for enabled P0 paths; same controls at first enabled tier for later capabilities. **Required evidence:** source, contract, database.

**Current source:** `backend/src/db/schema/directory/workers.ts`; `backend/src/db/schema/hr/core-people.ts`; `backend/src/modules/directory/employment-facts.service.ts`; `backend/src/modules/hr/core/person-employment-sync.service.ts`.

- **AC-ARCH-006-01:** Publish the current read/write ownership and ID mapping for person, membership, worker, engagement, employment, position and payroll profile. Treat IDs as distinct; record source owner/version, effective interval and reconciliation state.
- **AC-ARCH-006-02:** Directory owns person/membership identity; the normative 00a Core HR ownership of worker/engagement/employment business facts governs. Existing Directory table location or legacy migration facade does not authorize a second independent writer.
- **AC-ARCH-006-03:** Use the owner Employment Facts interface rather than new ad-hoc joins or cross-module table writes. General facts exclude restricted salary/bank/tax/medical/case data.
- **AC-ARCH-006-04:** Reconcile concurrent employments, transfer, rehire, changed email, archived membership and historical payroll references before enforcing cutover constraints. Reconcile HR terms into CONTEXT.md during implementation using the domain-modeling skill.

### FR-ARCH-007: Make payroll eligibility explicit for workers and employments

**Owner:** [05-india-payroll-prd.md](./05-india-payroll-prd.md). **Program:** AP-03. **Tier:** P0 for enabled P0 paths; same controls at first enabled tier for later capabilities. **Required evidence:** contract, database.

**Current source:** `backend/src/modules/hr/payroll-inputs/payroll-inputs-build.service.ts`; `backend/src/modules/payroll/lib/payroll-subject.ts`; `backend/src/modules/payroll/runs/payee-eligibility.service.ts`.

- **AC-ARCH-007-01:** Eligibility comes from the declared employment/pay-group/legal-entity scope and effective period, not every active organization membership. Missing employment never silently defaults to ACTIVE.
- **AC-ARCH-007-02:** Produce a complete included/excluded subject list with reasons and an owner for repair. A safety cap fails visibly or pages to completion; it never creates a partial payroll snapshot.
- **AC-ARCH-007-03:** Preserve accountless worker payees and distinguish userId, workerId, employmentId and payrollProfileId through input, payout and document delivery.
- **AC-ARCH-007-04:** Test joiner/leaver boundaries, suspended/archived worker, concurrent employments, contractor exclusion and rehire without duplicate payee identity.

### FR-ARCH-008: Unify versioned schemas and current wire contracts

**Owner:** [06-platform-intelligence-compliance-prd.md](./06-platform-intelligence-compliance-prd.md). **Program:** AP-04. **Tier:** P0 for enabled P0 paths; same controls at first enabled tier for later capabilities. **Required evidence:** source, unit, contract.

**Current source:** `backend/src/modules/hr/core/dto/hr-core.schemas.ts`; `backend/src/modules/hr/payroll-inputs/dto`; `frontend/contracts/README.md`; `frontend/hooks/api/hr`; `frontend/hooks/api/payroll`.

- **AC-ARCH-008-01:** Owner DTO folders contain strict Zod body/query/params and declared response schemas; infer types rather than maintaining conflicting parallel payload types. Public projections are explicit and permissioned.
- **AC-ARCH-008-02:** Generate and vendor OpenAPI/enums/permission artifacts through existing tooling. Pin local, remote and deployed contract revisions separately; a matching local artifact is not deployed parity proof.
- **AC-ARCH-008-03:** Reconcile HR/payroll request and response drift by endpoint, including nullability, unknown enums, dates, money strings and 204. The Timesheets-only request-drift gate is not HR coverage.
- **AC-ARCH-008-04:** Keep current routes while migrating callers unless an explicit route disposition authorizes removal. Route params use the actual entity ID; preserve 400/402/403/404/409/429 semantics and safe correlation IDs.

### FR-ARCH-009: Version and validate every frozen snapshot section

**Owner:** [05-india-payroll-prd.md](./05-india-payroll-prd.md). **Program:** AP-04. **Tier:** P0 for enabled P0 paths; same controls at first enabled tier for later capabilities. **Required evidence:** unit, contract, database.

**Current source:** `backend/src/db/schema/payroll/input-capture.ts`; `backend/src/modules/hr/payroll-inputs/payroll-inputs-build.service.ts`; `backend/src/modules/payroll/runs/lib/input-puller.ts`.

- **AC-ARCH-009-01:** Define one strict versioned discriminated section contract for the eight current sections and any approved extension, including typed source references, exact quantities and source versions. Validate before persistence and consumption.
- **AC-ARCH-009-02:** Employment Facts, Time Input Package, Approved Reimbursement, compensation and deduction inputs have explicit producer/consumer ownership, watermark/checksum, effective time and supersession semantics.
- **AC-ARCH-009-03:** Payroll reads locked input through the owning interface; generic record casts, malformed-payload skipping and ambiguous numeric defaults cannot bypass validation.
- **AC-ARCH-009-04:** Support declared old schema versions through explicit migration/read adapters; unsupported or corrupt locked versions produce a repairable blocker, not live-source substitution.

### FR-ARCH-010: Prove snapshot completeness and source provenance

**Owner:** [02-workforce-management-prd.md](./02-workforce-management-prd.md). **Program:** AP-04. **Tier:** P0 for enabled P0 paths; same controls at first enabled tier for later capabilities. **Required evidence:** unit, contract, database.

**Current source:** `backend/src/modules/hr/payroll-inputs/payroll-inputs-build.service.ts`; `backend/src/modules/hr/payroll-inputs/payroll-input-snapshots.service.ts`; `backend/src/modules/payroll/runs/lib/input-puller.ts`.

- **AC-ARCH-010-01:** For every eligible employment, validate required sections, uniqueness, referenced owner versions, quantity consistency and checksum before lock/calculation. Name each missing or invalid section and responsible repair owner.
- **AC-ARCH-010-02:** Represent absent/unavailable attendance distinctly from measured zero attendance and an approved zero-pay result. A missing source cannot become full month, zero deduction or ACTIVE employment by fallback.
- **AC-ARCH-010-03:** Persist the eligibility set, capture watermark, generation and source reference manifest. Prove a source row consumed twice cannot duplicate a reimbursement, loan recovery or time quantity.
- **AC-ARCH-010-04:** Rebuild comparison exposes late facts and source changes; a valid frozen generation reproduces the same calculated input package.

### FR-ARCH-011: Make HR input-period build, lock and unlock atomic and versioned

**Owner:** [05b-india-payroll-controls-edge-cases-prd.md](./05b-india-payroll-controls-edge-cases-prd.md). **Program:** AP-05. **Tier:** P0 for enabled P0 paths; same controls at first enabled tier for later capabilities. **Required evidence:** unit, contract, database.

**Current source:** `backend/src/modules/hr/payroll-inputs/payroll-inputs.service.ts`; `backend/src/modules/hr/payroll-inputs/payroll-inputs-build.service.ts`; `backend/src/modules/hr/payroll-inputs/__tests__/payroll-inputs-lock-atomicity.spec.ts`.

- **AC-ARCH-011-01:** Commands include expected version/generation and idempotency. State changes compare-and-set expected status/version in the transaction; losing commands return 409/current state with no partial effect.
- **AC-ARCH-011-02:** Build into a new generation; an old or delayed builder cannot replace a newer or locked generation. Claim/lease/fencing and crash recovery are explicit where work spans transactions.
- **AC-ARCH-011-03:** Lock checks complete validated generation and freezes source records atomically. Preserve current rollback-on-freeze-failure behavior; audit/outbox intent is committed with the outcome.
- **AC-ARCH-011-04:** Use competing real PostgreSQL transactions for build/build, build/lock and lock/unlock; prove one coherent winner and immutable prior generation. Query-chain mocks alone cannot close this criterion.

### FR-ARCH-012: Preserve locked history and route late changes through correction

**Owner:** [05b-india-payroll-controls-edge-cases-prd.md](./05b-india-payroll-controls-edge-cases-prd.md). **Program:** AP-05. **Tier:** P0 for enabled P0 paths; same controls at first enabled tier for later capabilities. **Required evidence:** contract, database.

**Current source:** `backend/src/modules/hr/payroll-inputs/payroll-inputs.service.ts`; `backend/src/modules/payroll/payout/locking.service.ts`; `backend/src/db/schema/payroll/run-events.ts`.

- **AC-ARCH-012-01:** Late attendance/leave/compensation/claim changes identify the affected generation and run. Locked/paid/closed facts stay immutable; revisions create linked adjustments, reversals or superseding publications.
- **AC-ARCH-012-02:** Unlock/reopen cannot imply reversal of an external payment, filing, posted journal or issued document. Apply the existing 00b/05c transition contracts and correction lineage.
- **AC-ARCH-012-03:** Test backdated salary, cancelled paid leave, corrected claim, rescinded hire and exited worker after cutoff; readiness and audit expose the unresolved impact.
- **AC-ARCH-012-04:** Preserve existing Payroll run lock/reversal CAS and PAID/CLOSED rejection rules rather than replacing them with generic status updates.

### FR-ARCH-013: Use validated exact payroll money, rates and rounding

**Owner:** [05b-india-payroll-controls-edge-cases-prd.md](./05b-india-payroll-controls-edge-cases-prd.md). **Program:** AP-05. **Tier:** P0 for enabled P0 paths; same controls at first enabled tier for later capabilities. **Required evidence:** unit, contract, database, human.

**Current source:** `backend/src/modules/payroll/runs/lib/money.ts`; `backend/src/modules/hr/payroll-inputs/payroll-inputs-build.service.ts`.

- **AC-ARCH-013-01:** Money parsing rejects junk suffixes, NaN/Infinity, out-of-range values and unsafe totals; money/rates/time have distinct units and wire schemas. Use exact decimal or bounded minor-unit arithmetic with an explicit currency scale.
- **AC-ARCH-013-02:** Specify tie, negative, percentage, proration, intermediate and final rounding rules through signed fixtures. Include 1.005 versus 100.005 and negative half-paise; do not infer a legal rounding policy from Math.round.
- **AC-ARCH-013-03:** Line totals reconcile to employee, run, payout, statutory and journal control totals; repeated frozen calculations are identical at scale.
- **AC-ARCH-013-04:** Record helper counterexamples as helper-level evidence only until caller input reachability and actual payroll impact are reproduced. Preserve working ordinary-case fixtures while adding missing classes.

### FR-ARCH-014: Define business dates and approved time quantities

**Owner:** [02-workforce-management-prd.md](./02-workforce-management-prd.md). **Program:** AP-05. **Tier:** P0 for enabled P0 paths; same controls at first enabled tier for later capabilities. **Required evidence:** unit, contract, database.

**Current source:** `backend/src/db/schema/hr/attendance-event-store.ts`; `backend/src/modules/hr/time`; `backend/src/modules/payroll/runs/lib/money.ts`.

- **AC-ARCH-014-01:** Time packages state timezone, local business date, calendar, policy version and quantity units. Preserve event history and correction links rather than overwriting source events.
- **AC-ARCH-014-02:** Test overnight shifts, DST transitions, leap years, half/hourly leave, holiday/weekend treatment, overlapping events and timezone changes at effective-date boundaries.
- **AC-ARCH-014-03:** Approved WFH/WFO, leave, overtime and regularization produce traceable pay quantities exactly once; contradictory or incomplete events become exceptions.
- **AC-ARCH-014-04:** Negative/invalid durations and double-counted leave/absence/half-day quantities fail validation before freeze; source availability failure is distinct from zero hours.

### FR-ARCH-015: Reconcile bank-return files idempotently with per-row outcomes

**Owner:** [05-india-payroll-prd.md](./05-india-payroll-prd.md). **Program:** AP-06. **Tier:** P0 for enabled P0 paths; same controls at first enabled tier for later capabilities. **Required evidence:** unit, contract, database.

**Current source:** `backend/src/modules/payroll/payout/batch-status.service.ts`; `backend/src/modules/payroll/payout/lib/bank-return.ts`.

- **AC-ARCH-015-01:** Preflight complete file format and item resolution before mutation, including duplicate PAID/FAILED, contradictory outcomes, itemId/userId disagreement and worker-only payees. Quarantine ambiguous rows.
- **AC-ARCH-015-02:** Persist an idempotent outcome receipt keyed to batch/item/source return identity; same-file or repeated-file replay returns the same applied/duplicate/conflict classification without repeated events.
- **AC-ARCH-015-03:** If application is intentionally partial, expose durable per-row applied/rejected/unresolved state and resumable continuation. A later row error cannot present earlier committed work as wholly unapplied.
- **AC-ARCH-015-04:** Keep format parsing as an adapter behind one payout reconciliation module. Test interruption after row N, concurrent import, unknown item, malformed bytes and duplicate/conflicting return references.

### FR-ARCH-016: Represent payment unknown, partial, return and reconciliation honestly

**Owner:** [05b-india-payroll-controls-edge-cases-prd.md](./05b-india-payroll-controls-edge-cases-prd.md). **Program:** AP-06. **Tier:** P0 for enabled P0 paths; same controls at first enabled tier for later capabilities. **Required evidence:** unit, contract, database.

**Current source:** `backend/src/modules/payroll/payout/batch-status.service.ts`; `backend/src/modules/payroll/payout/lib/bank-return.ts`; `backend/src/db/schema/payroll/payout.ts`.

- **AC-ARCH-016-01:** Document existing manual bank-file/advice/CSV capability and unresolved SENT behavior. Distinguish requested, sent, unknown/unresolved, failed, returned and paid outcomes semantically; preserve existing supported states where an adapter translation suffices.
- **AC-ARCH-016-02:** Timeout or missing acknowledgment never becomes successful payment or immediate retry. Reconcile status before reissue and preserve beneficiary version, amount, reference and idempotency.
- **AC-ARCH-016-03:** Direct provider rail is P1/partner-dependent: before enabling it, prove signed callbacks, out-of-order replay, inquiry, partial failure and returned-payment recovery using mock plus provider sandbox evidence.
- **AC-ARCH-016-04:** P0 manual fallback records evidence and unresolved items without claiming automatic bank connectivity or settlement. Never downgrade existing payment controls because a partner is unavailable.

### FR-ARCH-017: Preserve payout coverage, run transitions and stale-approval controls

**Owner:** [05c-payroll-statutory-transition-tables-prd.md](./05c-payroll-statutory-transition-tables-prd.md). **Program:** AP-06. **Tier:** P0 for enabled P0 paths; same controls at first enabled tier for later capabilities. **Required evidence:** unit, contract, database, browser.

**Current source:** `backend/src/modules/payroll/payout/locking.service.ts`; `backend/src/modules/payroll/payout/lib/payout-run-completion.ts`; `frontend/hooks/api/payroll/approvals.ts`; `frontend/features/payroll/payout/run-stage-actions/approval-stage-panel.tsx`.

- **AC-ARCH-017-01:** Preserve live-payee uniqueness, batch replay protection, full paid-coverage completion, held/failed payee treatment and existing lock/reversal compare-and-set.
- **AC-ARCH-017-02:** Approve/reject/pay commands recheck current actor, maker/checker, run/result/stage version and guard state. Duplicate/stale/concurrent actions yield a stable idempotent result or 409 and current state.
- **AC-ARCH-017-03:** An open approval dialog or cached stage cannot authorize a changed amount after preview or a revoked actor. Exact run/stage views recover from conflict without false success.
- **AC-ARCH-017-04:** Test zero eligible payees, partial paid coverage, duplicate batch, approval/rejection race, stale bulk decision and paid/closed reversal rejection through the owning interface.

### FR-ARCH-018: Make leave-to-payroll and downstream projection intent durable

**Owner:** [02-workforce-management-prd.md](./02-workforce-management-prd.md). **Program:** AP-07. **Tier:** P0 for enabled P0 paths; same controls at first enabled tier for later capabilities. **Required evidence:** unit, contract, database.

**Current source:** `backend/src/modules/hr/time/leave-decision-effects.service.ts`; `backend/src/modules/notifications/notification-dispatch.service.ts`; `backend/src/modules/hr/payroll-inputs/payroll-inputs.service.ts`.

- **AC-ARCH-018-01:** Commit approved/cancelled/corrected time fact and required downstream intent together where acknowledged crash-loss matters. Use existing outbox/inbox infrastructure with schema version, source version, actor authority and correlation.
- **AC-ARCH-018-02:** Idempotent payroll consumers update open input projections once; frozen generations receive explicit late-change/correction state. Retry, dead-letter, lag and reconciliation have an owner.
- **AC-ARCH-018-03:** Test source commit then process crash, duplicate/out-of-order delivery, delayed consumer, cancellation and frozen-period correction. Logged fire-and-forget completion is insufficient.
- **AC-ARCH-018-04:** Preserve durable notification behavior and owner-specific cache/Calendar invalidation; transaction-scoped handles cannot escape into deferred work.

### FR-ARCH-019: Make accepted-hire onboarding and BGV handoff repairable

**Owner:** [01-core-hr-lifecycle-prd.md](./01-core-hr-lifecycle-prd.md). **Program:** AP-07. **Tier:** P0 for enabled P0 paths; same controls at first enabled tier for later capabilities. **Required evidence:** contract, database, browser.

**Current source:** `backend/src/modules/hr/recruitment/recruitment-hire-completion.ts`; `backend/src/modules/hr/recruitment/recruitment-offer-acceptance.service.ts`; `backend/src/modules/hr/recruitment/recruitment-onboarding-start.service.ts`.

- **AC-ARCH-019-01:** Version the AcceptedHire position/worker/employment mapping with idempotency, acknowledgment/reject, update/rescind and reconciliation. Recruitment owns pipeline/offer; HR owns accepted-hire lifecycle.
- **AC-ARCH-019-02:** Distinguish external hire.handoff webhook publication from internal onboarding/BGV completion. Deferred failures expose retryable/repairable state, not an implied successful onboarding.
- **AC-ARCH-019-03:** Use stable source identities rather than email-only matching as the final authority; no prejoining employment or admission conflict has a named repair path.
- **AC-ARCH-019-04:** Test duplicate acceptance, rescind, worker without login, changed email, missing prejoining employment and crash between hire commit and onboarding/BGV start.

### FR-ARCH-020: Preserve the Payroll-to-Accounting posting seam

**Owner:** [05-india-payroll-prd.md](./05-india-payroll-prd.md). **Program:** AP-07. **Tier:** P0 for enabled P0 paths; same controls at first enabled tier for later capabilities. **Required evidence:** unit, contract, database.

**Current source:** `backend/src/modules/payroll/payroll-posting.service.ts`; `backend/src/modules/payroll/payout/payroll-payout-posting-intent.consumer.ts`.

- **AC-ARCH-020-01:** Payroll sends balanced versioned journal intent to Accounting through the existing posting command and idempotent consumer; it does not create a competing direct journal write path.
- **AC-ARCH-020-02:** Test commit-before-consumer crash, duplicate delivery, rejection, timeout, reversal/replacement and reconciliation of posted status.
- **AC-ARCH-020-03:** Net pay, payout ledger, employer liabilities and journal control totals tie to immutable run facts; posting success remains distinct from payout and filing success.

### FR-ARCH-021: Keep Calendar projections visibility-safe and failure-aware

**Owner:** [02-workforce-management-prd.md](./02-workforce-management-prd.md). **Program:** AP-08. **Tier:** P0 for enabled P0 paths; same controls at first enabled tier for later capabilities. **Required evidence:** unit, contract, database, browser.

**Current source:** `backend/src/modules/hr/hr-calendar-sources.ts`; `backend/src/modules/hr/hr-calendar-source.ts`; `backend/src/modules/calendar/calendar-availability.service.ts`; `frontend/features/calendar/use-hr-calendar-events.ts`.

- **AC-ARCH-021-01:** Retain registered HR Calendar source adapters; publish bounded source-id/version event projections with safe label, timezone, status, visibility and canonical deep link.
- **AC-ARCH-021-02:** Colleague leave reason and restricted HR/pay fields never leak into events, availability, notifications or cached views. Permission changes and cancellation update/remove projections safely.
- **AC-ARCH-021-03:** Approved leave blocks availability; failed/unreadable source yields explicit unknown/failed coverage, not free time. Preserve existing privacy/failure behavior and focused tests.
- **AC-ARCH-021-04:** Move HR window query ownership into the domain query module; test window splitting, exclusive all-day end, DST/overnight, disabled source, delayed version, out-of-order cancellation and bounded cross-zone reads.

### FR-ARCH-022: Deepen governed insights for charts, reports and drill-through

**Owner:** [06-platform-intelligence-compliance-prd.md](./06-platform-intelligence-compliance-prd.md). **Program:** AP-08. **Tier:** P0 for enabled P0 paths; same controls at first enabled tier for later capabilities. **Required evidence:** contract, database, browser.

**Current source:** `frontend/hooks/api/hr/analytics.ts`; `frontend/hooks/api/hr/analytics-schema.ts`; `frontend/features/hr/analytics`.

- **AC-ARCH-022-01:** One owner module defines each metric and exposes typed period/scope/unit/coverage/source-version projection. Charts render that meaning; client code and AskOS do not rederive financial or headcount policy.
- **AC-ARCH-022-02:** Use metric-specific drill-through schemas rather than unbounded generic records. Drill/export use the same cohort predicate, field sensitivity, grain and source snapshot as the summary.
- **AC-ARCH-022-03:** Test stale/unavailable versus zero, small cohort privacy, inconsistent periods, selected department and changed source status. Preserve signed metric definitions and totals.
- **AC-ARCH-022-04:** Prefer existing authorized read modules; introduce an adapter seam only for real caller/transport variation and retain the interface as the test surface.

### FR-ARCH-023: Ground AskOS in owner reads, effective policies and current authority

**Owner:** [06-platform-intelligence-compliance-prd.md](./06-platform-intelligence-compliance-prd.md). **Program:** AP-08. **Tier:** P0 for enabled P0 paths; same controls at first enabled tier for later capabilities. **Required evidence:** unit, contract, database, human.

**Current source:** `backend/src/modules/ai/core/tools/hr-copilot-tools.ts`; `backend/src/modules/ai/core/tools/self-hr-tools.ts`; `backend/src/modules/ai/core/tools/self-payroll-tools.ts`; `backend/src/modules/ai/core/tools/ops-copilot-tools.ts`; `backend/src/modules/ai/core/registry/ask-os-tool-registry.ts`.

- **AC-ARCH-023-01:** AskOS tools call actor-scoped owner read interfaces instead of duplicating HR/payroll SQL semantics. Apply tenant/object/field access in retrieval before provider use; AI does not decide authorization.
- **AC-ARCH-023-02:** Use only effective applicable policy versions; disclose incomplete/top-N retrieval and cite the specific sources used for each supported claim. A newest-ten policy list and citations to every supplied item do not establish completeness.
- **AC-ARCH-023-03:** Preserve bounded prompts, gateway-failure/no-fabrication behavior, atomic credit reserve/refund and read-only draft tools. High-impact actions use explicit human approval through the owning command.
- **AC-ARCH-023-04:** Treat attrition scope inconsistency as conditional while analytics is non-scopable; verify catalog/legacy grants before changing severity. Test denied content, revoked actor, empty corpus, stale policy, incorrect ID, uncertain answer and provenance.

### FR-ARCH-024: Own backend cache freshness and access-shaped keys

**Owner:** [06-platform-intelligence-compliance-prd.md](./06-platform-intelligence-compliance-prd.md). **Program:** AP-09. **Tier:** P0 for enabled P0 paths; same controls at first enabled tier for later capabilities. **Required evidence:** unit, contract, database.

**Current source:** `backend/src/common/cache/cache.service.ts`; `backend/src/common/cache/cache-invalidation-hr.ts`; `backend/src/modules/hr/analytics-plus`.

- **AC-ARCH-024-01:** Use existing versioned namespaces; keys include tenant plus actor/scope/permission version when response shape varies by authority, and every filter/period/source variant.
- **AC-ARCH-024-02:** Publish and test a writer-to-read invalidation matrix for employment, pay, time, claims, policies, projections and insights. A passing key-shape gate does not prove filter correctness or writer completeness.
- **AC-ARCH-024-03:** Handle cache fill racing a source mutation, invalidation failure, Redis outage and unknown generation without serving another actor's or materially stale protected result.
- **AC-ARCH-024-04:** Keep database authority and request-local AuthContext distinct from shared cache. No new request-path wildcard scan or cross-tenant shared result.

### FR-ARCH-025: Preserve client cache identity and centralize query options

**Owner:** [07-pages-navigation-roles-prd.md](./07-pages-navigation-roles-prd.md). **Program:** AP-09. **Tier:** P0 for enabled P0 paths; same controls at first enabled tier for later capabilities. **Required evidence:** unit, contract, browser.

**Current source:** `frontend/components/providers/query-provider.tsx`; `frontend/lib/query-scope.ts`; `frontend/lib/query-keys/human-resources.ts`; `frontend/lib/query-keys/payroll.ts`; `frontend/hooks/common/auth-hooks.ts`.

- **AC-ARCH-025-01:** Use sanctioned QueryClient factories and org/user-scoped hash. Authenticated key arrays stay tenant-neutral; preserve access-version semantics before removing existing dimensions. Public-tenant exceptions require explicit evidence.
- **AC-ARCH-025-02:** Entity query options co-locate key, fetch, contract, staleTime and abort handling; every response-shaping filter and entity identity is represented and normalized.
- **AC-ARCH-025-03:** Reads gate on current permission/module state; test denied/loading distinctions, focus/reconnect, org switch, logout, revoked access and late-response cache isolation.
- **AC-ARCH-025-04:** Move broad HR/payroll barrel imports to owning entity modules without creating forwarding-only files; query-scope rule violations are resolved within the authorized affected paths, and unrelated failures remain separately recorded.

### FR-ARCH-026: Share employee prefetch and infinite-list identity

**Owner:** [07-pages-navigation-roles-prd.md](./07-pages-navigation-roles-prd.md). **Program:** AP-09. **Tier:** P0 for enabled P0 paths; same controls at first enabled tier for later capabilities. **Required evidence:** unit, contract, browser.

**Current source:** `frontend/lib/prefetch/hr-people.ts`; `frontend/hooks/api/hr/employee-list.ts`; `frontend/features/hr/employees/employees-list-page.tsx`.

- **AC-ARCH-026-01:** Server prefetch and rendered infinite read share the same key, normalized filters, page envelope and initialPageParam through one query-options interface.
- **AC-ARCH-026-02:** Keep server permission and internal prefetch gates before protected reads. A denied initial page never preloads protected collection data.
- **AC-ARCH-026-03:** Authorized default and filtered initial loads have one necessary employee-list request, proven with browser/network or an equivalent instrumented runtime test; source key equality alone does not prove request count. Pass normalized URL searchParams into server prefetch, and reserve the employee route, shared query options and instrumented request-count test together.
- **AC-ARCH-026-04:** Cover empty, next cursor, cancelled navigation, org switch and filter changes without stale first-page reuse or duplicate records.

### FR-ARCH-027: Concentrate Action Center source behavior

**Owner:** [04-employee-manager-service-prd.md](./04-employee-manager-service-prd.md). **Program:** AP-10. **Tier:** P0 for enabled P0 paths; same controls at first enabled tier for later capabilities. **Required evidence:** unit, contract, browser.

**Current source:** `frontend/features/hr/action-center/use-action-center-queue.ts`; `frontend/features/hr/action-center/use-action-center-decisions.ts`; `frontend/features/hr/action-center/action-center-queue.tsx`.

- **AC-ARCH-027-01:** Each of the five actual queue sources owns read, permission, normalized item, decision and cache effect; the queue interface composes source states and payroll cutoff without duplicating domain writes.
- **AC-ARCH-027-02:** Represent partial outage, denied source, unassigned approver, reassignment/delegation and stale cutoff honestly; source denial never means the complete queue is empty.
- **AC-ARCH-027-03:** Bulk decisions return per-item success/conflict/failure and retry safely. Reopened or changed records with the same ID reappear; mounted dismissed-ID state cannot hide a new actionable version.
- **AC-ARCH-027-04:** Keep source-specific validation/self-approval rules and test stale item, rejection reason, partial bulk, reopened request and exact badge/list reconciliation. Extract adapters only when they absorb real scattered behavior.

### FR-ARCH-028: Keep mutation outcomes, conflicts and cache effects local

**Owner:** [07-pages-navigation-roles-prd.md](./07-pages-navigation-roles-prd.md). **Program:** AP-10. **Tier:** P0 for enabled P0 paths; same controls at first enabled tier for later capabilities. **Required evidence:** unit, contract, browser.

**Current source:** `frontend/hooks/api/payroll/runs.ts`; `frontend/hooks/api/payroll/employees.ts`; `frontend/hooks/api/payroll/approvals.ts`; `frontend/features/hr/action-center/use-action-center-decisions.ts`.

- **AC-ARCH-028-01:** Mutation responses patch exact detail/list rows where sufficient; mark non-computable aggregates stale with targeted keys and refetchType none according to current frontend rules.
- **AC-ARCH-028-02:** Define optimistic rollback for reversible edits and server-confirmed states for financial approvals, payment, posting and filing. Pending/accepted/paid/published remain distinct.
- **AC-ARCH-028-03:** Reject stale command versions and reconcile current row/stage without broad refetch storms or false success. Remove deleted detail safely and preserve caller mutation options.
- **AC-ARCH-028-04:** Test paginated filtered caches, concurrent edits, rejected optimistic write, duplicate command, aggregate freshness and badge reconciliation across HR/Payroll views.

### FR-ARCH-029: Keep shareable filters and navigation state consistent

**Owner:** [07b-experience-content-quality-prd.md](./07b-experience-content-quality-prd.md). **Program:** AP-10. **Tier:** P0 for enabled P0 paths; same controls at first enabled tier for later capabilities. **Required evidence:** unit, browser.

**Current source:** `frontend/features/hr/employees/use-employee-list-url-state.ts`; `frontend/features/payroll/employees/employees-list-page.tsx`; `frontend/components/layout/sidebar`.

- **AC-ARCH-029-01:** URL state owns shareable filter/sort/view/page/cursor; change filter and reset pagination in the same URL update. Refresh/back/deep link restores the intended view.
- **AC-ARCH-029-02:** Use stable keyset ordering and explicit filtered-empty versus initial-empty states. Action Center ephemeral state cannot conceal later authoritative changes.
- **AC-ARCH-029-03:** Keep desktop/mobile/sidebar/command navigation on the same audience/permission model; owner simplification preserves specialist routes and canonical Payroll reimbursement ownership.
- **AC-ARCH-029-04:** Verify deleted duplicate pages have migrated callers and distinct remaining jobs remain discoverable; no new compatibility alias or broad page deletion without route migration evidence.

### FR-ARCH-030: Bound and project queries without truncating business completion

**Owner:** [07-data-performance-prd.md](./07-data-performance-prd.md). **Program:** AP-11. **Tier:** P0 for enabled P0 paths; same controls at first enabled tier for later capabilities. **Required evidence:** source, contract, database.

**Current source:** `backend/src/modules/hr/hr-read-limits.ts`; `backend/src/modules/hr/directory/background-verification.service.ts`; `backend/src/modules/hr/forms/hr-forms-submissions.service.ts`; `backend/src/modules/payroll/lib/query-bounds.ts`.

- **AC-ARCH-030-01:** Controller operations use explicit projections, tenant+ScopedRead predicates and deterministic cursor contracts capped at 100 where paginated. Internal full-job scans page or fail explicitly; a limit alone cannot silently omit workers or results.
- **AC-ARCH-030-02:** Test stable tie-breaks, limit+1/hasMore, tampered cursor, changed filters and totals from the same predicate; no fabricated total on a keyset response.
- **AC-ARCH-030-03:** Use bounded batch reads rather than N+1 joins; benchmark realistic tenant volumes under the application DB role with tenant GUC, not a bypass-RLS owner.
- **AC-ARCH-030-04:** Publish EXPLAIN buffer/query-count evidence and selective indexes including tenant key. Composite tenant FKs and existing RLS must be verified and preserved, not assumed absent or replaced.

### FR-ARCH-031: Make document publication and cleanup recoverable

**Owner:** [05-india-payroll-prd.md](./05-india-payroll-prd.md). **Program:** AP-12. **Tier:** P0 for enabled P0 paths; same controls at first enabled tier for later capabilities. **Required evidence:** unit, contract, database.

**Current source:** `backend/src/modules/payroll/filings/form16-documents.service.ts`.

- **AC-ARCH-031-01:** Stage uploaded objects and commit the document version/pointer with owner metadata; failed DB replacement cannot leave an untracked permanent object.
- **AC-ARCH-031-02:** Deletion of the prior object after a successful replacement is replayable cleanup; cleanup failure does not ambiguously report the committed replacement as wholly failed.
- **AC-ARCH-031-03:** Retain publication/version history, source evidence and legal-hold references; published, delivered and paid/officially-issued are separate outcomes.
- **AC-ARCH-031-04:** Test failure before/after upload, DB rollback, duplicate request, old-object delete retry, orphan sweep and correction without breaking prior issued references.

### FR-ARCH-032: Validate downloads and reauthorize export lifecycle

**Owner:** [06-platform-intelligence-compliance-prd.md](./06-platform-intelligence-compliance-prd.md). **Program:** AP-12. **Tier:** P0 for enabled P0 paths; same controls at first enabled tier for later capabilities. **Required evidence:** unit, contract, browser.

**Current source:** `frontend/hooks/api/payroll/form16.ts`; `frontend/features/payroll/ess/components/ess-payslips-section.tsx`; `frontend/lib/download-blob.ts`; `frontend/hooks/api/hr/__tests__/export-job-download-guard.test.tsx`; `backend/src/modules/hr/import/hr-export-jobs.service.ts`.

- **AC-ARCH-032-01:** One document-download module owns safe filename, expected type/signature, nonempty valid content and object-URL disposal. Reject 200 HTML, empty/truncated PDF and mismatched content rather than saving it as a payslip/tax PDF.
- **AC-ARCH-032-02:** Preserve CSV job content guards; apply appropriate CSV formula escaping and encoding rules for exported untrusted cells.
- **AC-ARCH-032-03:** Export creation, background execution and download recheck job owner/current tenant/scope/permission, signed-link expiry and audit. A revoked requester cannot download an earlier authorized job.
- **AC-ARCH-032-04:** Test denied/expired/error blob, cross-org stored job, scope downgrade, interrupted/resumed export, filename and cleanup behavior through the download/export interface.

### FR-ARCH-033: Cover governed retention and accountless document delivery

**Owner:** [05-india-payroll-prd.md](./05-india-payroll-prd.md), with Core HR and Privacy as supporting owners. **Program:** AP-12. **Tier:** P0 for enabled P0 paths; same controls at first enabled tier for later capabilities. **Required evidence:** contract, database, human.

**Current source:** `backend/src/modules/payroll/filings/form16-documents.service.ts`; `backend/src/modules/cron/cron-hr-retention-documents.ts`; `backend/src/modules/payroll/lib/payroll-subject.ts`.

- **AC-ARCH-033-01:** Inventory every governed HR/payroll document class, version, retention policy, legal hold and privacy/export/deletion obligation; assess tax-document coverage explicitly rather than assuming the generic HR sweep covers it. Payroll owns pay/tax-document versions and delivery; Core HR owns HR-record retention execution, and Privacy governs approved retention/hold rules. Record one mutable owner per document class, with no second writer.
- **AC-ARCH-033-02:** Worker-only payees receive audited assisted document delivery or a clear supported/unsupported repair state; membership-only self-service does not silently strand their documents.
- **AC-ARCH-033-03:** Legal holds prevent premature object/record purge; deletion and backup/restore references reconcile. Audit omits full secrets and unnecessary sensitive values.
- **AC-ARCH-033-04:** Require named privacy/payroll/legal review for retention and delivery rules; source gaps are not themselves a finding of legal noncompliance.

### FR-ARCH-034: Instrument recovery, projection lag and operational controls

**Owner:** [06a-operations-release-evidence-prd.md](./06a-operations-release-evidence-prd.md). **Program:** AP-13. **Tier:** P0 for enabled P0 paths; same controls at first enabled tier for later capabilities. **Required evidence:** contract, database, human.

**Current source:** `backend/src/common/cache/cache.service.ts`; `backend/src/modules/hr/payroll-inputs`; `backend/src/modules/payroll/payout`.

- **AC-ARCH-034-01:** Trace correlation and durable command/event/generation IDs across source, consumer, calculation, payout, journal and document publication without logging raw sensitive payloads.
- **AC-ARCH-034-02:** Expose and alert on projection lag, failed namespace invalidation, outbox backlog/dead letter, import row conflict, unknown provider state and orphan cleanup; name support owner and reconciliation action.
- **AC-ARCH-034-03:** Verify existing PRD06a availability, latency, scale, unknown-state alert and RPO/RTO/restore gates at fixed revisions. Audit report proposed numbers cannot weaken normative targets.
- **AC-ARCH-034-04:** Run restore and replay drills with source checksum/control totals and reconcile external actions after restore; evidence includes environment, dataset, timestamps and observer.

### FR-ARCH-035: Prove full task states, responsive and accessible journeys

**Owner:** [07b-experience-content-quality-prd.md](./07b-experience-content-quality-prd.md). **Program:** AP-13. **Tier:** P0 for enabled P0 paths; same controls at first enabled tier for later capabilities. **Required evidence:** unit, browser, human.

**Current source:** `frontend/features/hr/action-center`; `frontend/features/hr/analytics`; `frontend/features/payroll/readiness`; `frontend/features/payroll/payout`.

- **AC-ARCH-035-01:** Every affected task resolves access-loading, disabled module, denied, initial/filtered empty, loading, error/retry, partial, stale/conflict and successful populated states through shared page/state primitives.
- **AC-ARCH-035-02:** Test complete Action Center, onboarding-to-first-pay, payroll close/correction and document retrieval at 375/768/1280, light/dark, keyboard and screen reader; small-card axe tests do not close whole-journey evidence.
- **AC-ARCH-035-03:** Use semantic tokens, labelled icon controls, focus restoration, meaningful status language and accessible table/chart equivalents. Keep numeric quantities and sensitive masking understandable.
- **AC-ARCH-035-04:** Test slow/aborted network, history/back, open dialog revocation, bulk partial result and reopened record. Record actual WCAG/task-study evidence and recovery outcome.

### FR-ARCH-036: Migrate by expand, reconcile, enforce and retire

**Owner:** [09-implementation-migration-cockpit-prd.md](./09-implementation-migration-cockpit-prd.md). **Program:** AP-13. **Tier:** P0 for enabled P0 paths; same controls at first enabled tier for later capabilities. **Required evidence:** source, contract, database, human.

**Current source:** `backend/src/db/schema/hr`; `backend/src/db/schema/payroll`; `backend/migrations`; `docs/specs/hrms-payroll-reform/08-architecture-prd.md`.

- **AC-ARCH-036-01:** Record exact table/route/caller/write ownership and migration dependencies before cutover. Expand with versions/mappings/receipts, backfill resumably and quarantine ambiguous records.
- **AC-ARCH-036-02:** Keep one write owner; use dual/shadow reads to compare complete outputs and access projections, then enforce tenant FKs/uniqueness/interval/completeness constraints after reconciliation.
- **AC-ARCH-036-03:** Cut over consumers with rollback/forward-correction plan, current-versus-old schema compatibility and control totals. Immutable payroll history and source lineage remain available.
- **AC-ARCH-036-04:** Retire old routes/callers/aliases/files only with zero-caller and migration evidence; preserve open legacy acceptance work. Rehearse empty-DB and existing-data migrations and restore.

### FR-ARCH-037: Keep file locality and deep modules aligned with current standards

**Owner:** [08-architecture-prd.md](./08-architecture-prd.md). **Program:** AP-11. **Tier:** P0 for enabled P0 paths; same controls at first enabled tier for later capabilities. **Required evidence:** source, unit, contract.

**Current source:** `backend/CLAUDE.md`; `frontend/CLAUDE.md`; `frontend/hooks/api/hr/index.ts`; `frontend/hooks/api/payroll/index.ts`.

- **AC-ARCH-037-01:** Use current backend parent/core and domain dto layout, controller-to-owning-module-to-Drizzle pattern, explicit cross-owner interfaces and thin frontend routes. Do not add a generic repository or a second mutable People store.
- **AC-ARCH-037-02:** Apply the deletion test to barrels, forwarding modules and extracted helpers: retain a seam when it hides real behavior or actual variation; removing it must not scatter authorization or calculation policy.
- **AC-ARCH-037-03:** In-process computation is tested directly through its interface. Database races use an isolated PostgreSQL fixture under application role; query-chain mocks are not that fixture. External dependencies use production/test adapters and sandbox evidence.
- **AC-ARCH-037-04:** Concentrate change and verification with the owner for locality and caller benefit for leverage; file count/line ratios do not establish depth. Replace shallow tests only after their behavioral scenarios survive at the owner interface.

### FR-ARCH-038: Require complete fixed-revision release and capability evidence

**Owner:** [06a-operations-release-evidence-prd.md](./06a-operations-release-evidence-prd.md). **Program:** AP-14. **Tier:** P0 for enabled P0 paths; same controls at first enabled tier for later capabilities. **Required evidence:** source, contract, database, browser, human.

**Current source:** `docs/specs/hrms-payroll-reform/06a-operations-release-evidence-prd.md`; `docs/specs/hrms-payroll-reform/05a-india-payroll-statutory-prd.md`.

- **AC-ARCH-038-01:** Publish supported countries/establishments/workforce/locale/plan/provider delivery matrix with native, connected, customer-operated, managed, partner, beta or unavailable labels; additional native country packs remain P3.
- **AC-ARCH-038-02:** Keep export preparation, filing submission, authority acknowledgment, payment, reconciliation and official document issuance distinct. Current export-only/manual code cannot be described as automatic filing or bank settlement.
- **AC-ARCH-038-03:** Complete two representative reconciled payroll parallel cycles, signed calculation/rule fixtures, migration/restore, security, accessibility, load and applicable provider evidence before live cutover.
- **AC-ARCH-038-04:** Require actual fixed backend/frontend/rule/provider revision, dataset, expected/actual, reviewer and residual decisions per criterion. Unknown external outcomes never become PASS from source or mocks.

### FR-ARCH-039: Make audit coverage, gate scope and source revision checkable

**Owner:** [06a-operations-release-evidence-prd.md](./06a-operations-release-evidence-prd.md). **Program:** AP-00. **Tier:** P0 for enabled P0 paths; same controls at first enabled tier for later capabilities. **Required evidence:** source, unit.

**Current source:** `scripts/check-hrms-architecture-coverage.mjs`; `scripts/check-hrms-execution-plan.mjs`; `docs/specs/hrms-payroll-reform/architecture-review`.

- **AC-ARCH-039-01:** Preserve the complete annotated HTML report and map every semantic source unit to one or more FR-ARCH requirements or historical-evidence/reference disposition. Validator fails on missing/duplicate source units, source drift, unknown IDs and unmapped requirements.
- **AC-ARCH-039-02:** Record static gate self-tests and real invocation scope/results separately. Cache-shape/bounds passes do not prove semantics; Timesheets request drift does not prove HR; unrelated chat parity failures stay outside the HR defect list.
- **AC-ARCH-039-03:** Record backend and frontend revisions plus hashes for audit-critical source. Revalidate a changed/resolved finding before implementing; preserve dated audit evidence rather than pretending it is current release proof.
- **AC-ARCH-039-04:** Run the coverage validator's negative self-tests, documentation validation, implementation-readiness and release modes. A documentation PASS leaves open code/database/browser/provider evidence visibly open.

### FR-ARCH-040: Provide a resumable Claude execution and evidence contract

**Owner:** [06a-operations-release-evidence-prd.md](./06a-operations-release-evidence-prd.md). **Program:** AP-00. **Tier:** P0 for enabled P0 paths; same controls at first enabled tier for later capabilities. **Required evidence:** source, unit.

**Current source:** `docs/specs/hrms-payroll-reform/17-claude-architecture-execution.md`; `docs/specs/hrms-payroll-reform/architecture-review/execution-ledger.json`.

- **AC-ARCH-040-01:** Every FR-ARCH acceptance criterion has a stable AC ID, responsible owner, dependency packet, planned test/evidence levels and one authoritative status row; all implementation rows start NOT_STARTED.
- **AC-ARCH-040-02:** Claude resumes the first ready open child after re-reading current source, uses exact reserved write/test paths, handles negative cases before success, and continues independent work when one evidence tier is blocked.
- **AC-ARCH-040-03:** Only actual applicable evidence can advance a criterion. PASS requires all required evidence tiers; WAIVED requires existing authorized owner approval, expiry and compensating control. Documentation status is not implementation status.
- **AC-ARCH-040-04:** The handoff includes changed/deleted files, reproductions, executed commands and exits, fixed revisions, unresolved criteria and next ready child. All source units and criteria reconcile at completion; no parent closes while a child is open.

## 5. Definition of complete

A requirement closes only when all its ledger criteria pass at the required evidence levels or have a permitted, approved, unexpired waiver. Every criterion records backend/frontend/rule/provider revision as applicable, environment/dataset, expected and actual outcome, command/exit/artifact and reviewer. An unexecuted DB/browser/provider/human check remains open even when source and mocks pass. Release mode additionally requires the unchanged capability/priority and domain invariants in 00a, 00c, 05a, 05c, 06a and 07c.

Run `node scripts/check-hrms-architecture-coverage.mjs --self-test`, then the command without flags for document coverage. `--implementation` and `--release` intentionally fail while required code/evidence remains open. A green document check never certifies implementation.
