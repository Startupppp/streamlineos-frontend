# Claude Execution Guide: Complete the HRMS + Payroll Architecture Requirements

**Entry point:** Use this file when asked to implement the 24 October architecture HTML or FR-ARCH requirements.  
**Date:** 2026-10-24  
**Authority:** [PRD 16](./16-architecture-hardening-prd.md) owns 40 requirements and 158 atomic acceptance criteria; [00a](./00a-suite-domain-contracts-prd.md), [00c](./00c-requirement-tier-traceability-prd.md) and [06a](./06a-operations-release-evidence-prd.md) retain business/tier/release authority.

## 1. Read in this order

1. Read this guide, the [preserved HTML](./architecture-review/2026-10-24-architecture-review.html), PRD 16 index/target design and [execution ledger](./architecture-review/execution-ledger.json). The [HTML-to-PRD map](./architecture-review/html-prd-coverage.json) retains all 268 semantic report points, including evidence and caveats.
2. Read current applicable frontend/backend CLAUDE.md, CONTEXT.md and accepted ADRs in docs/docs/adr. Locate a missing root instruction file rather than inventing its rules. Record the actual frontend/root and backend Git revisions separately.
3. Read 00a/00c/06a and the exact owner sections and current source/tests for the next ready child. Historical line numbers and audit source hashes are starting evidence, not proof current code still has a defect.
4. Run the coverage checker self-test and normal mode, then the suite checker self-test and normal mode. A document failure is repaired before source requirements can be silently omitted.
5. Before page, navigation or RBAC work, read PRDs 07/07a and [18](./18-self-service-page-ui-backend-prd.md), [19](./19-hr-administration-page-ui-backend-prd.md), [20](./20-payroll-page-ui-backend-prd.md), [21](./21-supporting-page-route-disposition-prd.md) and [22](./22-current-route-disposition-prd.md). Treat HRMS and Payroll as independent parent modules, with separate submodule, action, scope and field grants. Reconcile every existing route disposition and every canonical page's UI/backend item.
6. Use the [local ticket queue](./tickets/) in numeric dependency order. Update each checkbox only when its matching ledger AC has evidence; mark a ticket completed only when its stated completion gate passes. These are local files, not GitHub issues.

`node scripts/check-hrms-architecture-coverage.mjs --self-test`

`node scripts/check-hrms-architecture-coverage.mjs`

`node scripts/check-hrms-execution-plan.mjs --self-test`

`node scripts/check-hrms-execution-plan.mjs`

`node scripts/check-hrms-architecture-tickets.mjs`

`node scripts/check-hrms-page-contracts.mjs`

## 2. Coordinator and leaf authority

An instruction to implement this plan authorizes reversible local implementation and focused tests within its requirements. This guide itself is documentation, not authorization to deploy, move real money, file returns, change production access or make an employment decision. The coordinator may inspect Git, reserve exact child paths, update the architecture ledger and route/contract documentation, and run applicable DB/browser checks in an authorized test environment. The browserless leaf restrictions in agent-runbook.md apply to assigned leaves, not to the coordinator of this whole architecture plan. Routine safe scope refinement does not require another user confirmation. A conflict that changes business ownership, tier, supported country/provider or irreversible external state is reported with the exact governing rule and a concrete proposed decision.

Preserve unrelated current changes. Do not commit or push unrelated work. Serialize shared schema journals, module wiring, permission catalogs, contract artifacts and query factories; separate worktrees do not make a conflicting shared contract independent. Dispatch subagents only when the user or an applicable skill explicitly authorizes delegation.

## 3. AP-00 baseline and current-state audit

Generate current route/page/API/table/form/query-key/cache-writer/event-consumer inventories for the enabled HRMS/Payroll paths and direct consumers. Each row names owner, actor, entitlement, permission, scope/field policy, schema, cursor/filter, current command/read path, cache effects, source facts, transition and recovery, related FR/AC and source disposition. Use complete/partial/conflicting/missing/duplicate/removal-candidate as source findings, not as release status.

Reproduce each confirmed finding or prove it was fixed. For a resolved item, preserve the new contract and attach appropriate current evidence; no artificial diff is needed. Treat money helper probes as helper behavior, concurrency as a risk until a race test, and attrition scope as conditional until catalog reachability is proven. Audit tests and old PASS results are not copied into the new acceptance rows. Record historical gate scope: the request-drift command checked Timesheets, response parity used origin/main and had unrelated Chat failures, and static cache/bounds checks did not establish semantic correctness.

Create exact child records in execution-ledger.json before source edits. A child owns one observable outcome or inseparable transaction, not an entire program or folder. Record child ID, program, FR/AC IDs, dependencies, exact writeSet, exact testSet (or explicit low-impact test exemption), source revisions, reservation state, reproduction and verification command plan. Enumerate future files explicitly; source-path lists in PRD 16 are discovery anchors, not blanket write reservations.

AP-00 publishes its baseline/child-planning readiness artifact early. FR-ARCH-039/040 remain cross-cutting and some criteria close only at final reconciliation. A published program readiness milestone is not program/requirement PASS. Dependent programs require the predecessor interface/readiness artifact, not premature closure of every release-evidence criterion; this prevents a circular dependency through final governance checks.

## 4. Dependency programs

These are ordering and ownership groups, not dispatchable code tasks. Split each into exact children after current-state audit. Planning, test design and migration risk review can start early; dependent source adoption follows a published readiness contract. AP-01 is the first security/correctness implementation after AP-00. AP-14 can run release aggregation only after all required prior evidence is complete.

| Program | Outcome | Readiness dependencies | Requirements |
|---|---|---|---|
| AP-00 | Baseline, coverage and child planning | None | FR-ARCH-039, FR-ARCH-040 |
| AP-01 | Insights authorization, filters and AskOS identifier | AP-00 | FR-ARCH-001, FR-ARCH-002, FR-ARCH-003 |
| AP-02 | Sensitive reach and access lifecycle | AP-00 | FR-ARCH-004, FR-ARCH-005 |
| AP-03 | Identity, Employment Facts and eligibility | AP-00 | FR-ARCH-006, FR-ARCH-007 |
| AP-04 | Wire contracts and frozen-source validation | AP-03 | FR-ARCH-008, FR-ARCH-009, FR-ARCH-010 |
| AP-05 | Input-period transitions, values and time | AP-04 | FR-ARCH-011, FR-ARCH-012, FR-ARCH-013, FR-ARCH-014 |
| AP-06 | Payout reconciliation and protected run transitions | AP-05 | FR-ARCH-015, FR-ARCH-016, FR-ARCH-017 |
| AP-07 | Durable source handoffs and accounting | AP-04, AP-05 | FR-ARCH-018, FR-ARCH-019, FR-ARCH-020 |
| AP-08 | Calendar, governed metrics and AskOS | AP-01, AP-02, AP-03, AP-07 | FR-ARCH-021, FR-ARCH-022, FR-ARCH-023 |
| AP-09 | Backend/client cache and hydration | AP-01, AP-02, AP-04 | FR-ARCH-024, FR-ARCH-025, FR-ARCH-026 |
| AP-10 | Action Center, mutation and navigation state | AP-05, AP-09 | FR-ARCH-027, FR-ARCH-028, FR-ARCH-029 |
| AP-11 | Query completeness and module locality | AP-02, AP-03, AP-04 | FR-ARCH-030, FR-ARCH-037 |
| AP-12 | Publication, exports, retention and delivery | AP-02, AP-03, AP-04 | FR-ARCH-031, FR-ARCH-032, FR-ARCH-033 |
| AP-13 | Operations, full task UX and migration evidence | AP-06, AP-07, AP-08, AP-09, AP-10, AP-11, AP-12 | FR-ARCH-034, FR-ARCH-035, FR-ARCH-036 |
| AP-14 | Fixed-revision release acceptance | AP-13 | FR-ARCH-038 |

## 5. Per-child implementation loop

1. **Reserve and revalidate.** Check current source/revisions, exact paths, actor and contract. End this step when the defect or missing capability and required behavior are demonstrated, or a no-change evidence path is recorded.
2. **Reproduce through the interface.** Test denied/malformed/stale/duplicate/failure behavior before successful behavior. State the expected persisted/visible result. Mock tests prove only their own interface behavior; real transaction/RLS/query-plan criteria use PostgreSQL under the application role and tenant GUC.
3. **Implement with one owner.** Follow PRD 16 target design and existing domain/state contracts. Strict schemas, version checks, tenant/object/field scope, idempotency, atomic audit/outbox intent, exact values and explicit recovery move together when the transaction requires them. Apply the deletion test to shallow forwarding modules; do not add generic repositories or hypothetical adapters.
4. **Integrate consumers.** Update every applicable route, query option, cache writer, Calendar/chart/AskOS projection, export and notification consumer of the changed fact. Preserve differing salary/sensitive permissions. Use the HTML coverage map to find sibling obligations.
5. **Verify proportionately.** Run the exact focused tests and required applicable gates, self-test first where provided. Resolve relevant failures; record unrelated failures separately. Run broader checks when a shared contract/new failure warrants them. Capture command, exit, assertions, revisions, dataset and artifact. Browser evidence covers the complete task at all required widths/themes/accessibility modes; provider evidence remains separate.
6. **Reconcile and resume.** Inspect the exact diff, zero-caller proof for deletion, schema migration and current contracts. Update only actual ledger progress. Release reservations and take the next ready open child. A blocked DB/provider/human tier leaves that criterion open while independent implementation continues.

A limited test-environment retry may use workspace-local temporary Jest caches when sandbox TEMP transform rename fails. Clean only the verified cache path you created. Read the actual package scripts; use direct installed binaries if the package runner fails. Record environment failures without turning an unrun check into PASS.

## 6. Evidence schema and status transitions

Each criterion uses exactly one status: NOT_STARTED, DESIGNED, IMPLEMENTED_UNVERIFIED, PASS, FAIL or WAIVED. NOT_STARTED means no completed work; DESIGNED has a concrete current contract; IMPLEMENTED_UNVERIFIED means source exists but some required evidence is missing; FAIL records a tested wrong result. PASS requires every required evidence level. A temporary blocker is recorded in notes with owner, dependency and next action, not hidden as PASS.

Each executed evidence entry contains: id; level (source/unit/contract/database/browser/provider/human as applicable); status PASS or FAIL; fixed revision; environment; dataset; expected; actual; artifact; reviewer; timestamp; and command plus exitCode for machine-executed evidence. Include sourceHashes for changed critical files and named backend/frontend/rule/provider versions in the revision/artifact record. Human evidence uses a named signed review artifact. Real provider evidence is required before a P1 partner rail is enabled; it does not block the already-specified P0 manual fallback when its own controls pass.

Required evidence levels are planned on each acceptance row. Refine to child-specific tests without weakening the governing evidence requirement. If a level is genuinely inapplicable, record and approve the exact applicability decision under existing domain/release rules; preserve it as a permitted waiver rather than silently deleting a required level. WAIVED requires reason, approvedBy, approvalArtifact, expiresAt, compensatingControl and affectedIds. The agent cannot manufacture an approval or self-waive a security/payment gate.

The checker compares ledger ownership, program and required evidence levels with PRD 16, so editing the ledger alone cannot weaken the contract. For each evidence level, the latest recorded execution must pass; a newer failure invalidates an older pass until a successful rerun. Conflicting results at the same timestamp remain a failure. Preserve failed runs in the history. Implementation aggregation also requires passing local source/unit/contract evidence where the criterion requires it, even when database/browser/provider/human verification remains open.

Program readiness is an earlier interface-publication milestone. Set readiness.status=PUBLISHED only with a concrete artifact and fixed revision; never use that to close unmet criteria. A requirement/program/release roll-up derives from its child acceptance statuses, so a parent cannot be declared complete while a child is open, failed or stale.

## 7. Completion and resume protocol

Run document coverage after every relevant document/HTML change. Run implementation mode for code-complete aggregation, and release mode only for full evidence aggregation:

`node scripts/check-hrms-architecture-coverage.mjs --implementation`

`node scripts/check-hrms-architecture-coverage.mjs --release`

Implementation and release modes remain failing while required criteria lack their evidence. A documentation-only pass does not establish implementation completion. At end of a session, list each advanced AC, exact changed/deleted files, command outputs/exits, evidence levels, fixed revisions, unresolved blockers, readiness milestones and next ready child. On resume, reload this guide and ledger, revalidate changed source and continue; do not restart completed evidence or skip open requirements because the HTML looked finished.

## 8. Copy this implementation prompt to Claude

```text
Implement the complete HRMS + Payroll architecture plan in this repository.
Start with docs/specs/hrms-payroll-reform/17-claude-architecture-execution.md.
Follow its read order, current repo instructions and dependency programs.
Work the local docs/specs/hrms-payroll-reform/tickets/ queue in dependency order,
updating checked items only with the matching execution-ledger evidence.
For every page, implement the UI item and backend item in PRDs 18, 19, 20 and 21;
reconcile all 124 current routes through PRD 22 before removal or redirect.
Enforce separate HRMS and Payroll parent-module RBAC in sidebar, palette,
direct URLs, APIs, exports, cache, charts, Calendar and AskOS.
Treat 16-architecture-hardening-prd.md as the additive requirement source,
architecture-review/2026-10-24-architecture-review.html as the preserved visual/source review,
html-prd-coverage.json as the no-omission map, and execution-ledger.json as the single status record.
Audit current code before changing it, create exact child write/test reservations,
and implement the first ready open child, starting with the analytics read defects.
Continue through all ready work; do not stop after making a plan or folder skeleton.
Preserve unrelated changes and existing Calendar, identity-cache and payout/accounting protections.
For every AC, attach actual evidence at the required level. Keep unmet database,
browser, provider, legal or human evidence open and continue independent work.
Run both documentation validators, implementation mode and release mode at the appropriate milestones.
Run the local ticket and page-contract validators after related changes.
Report every remaining open criterion and its exact blocker; never mark the whole plan complete
while a required child is open. Reconcile every HTML source unit and all 158 AC rows before final closure.
```
