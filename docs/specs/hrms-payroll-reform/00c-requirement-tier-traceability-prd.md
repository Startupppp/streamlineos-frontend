# StreamlineOS People + Payroll Requirement Tier and Traceability PRD

**Status:** Normative scope register  
**Owner:** People Product Council + QA  
**Priority:** P0 governance  
**Parents:** [Suite PRD](./00-suite-product-prd.md) and
[Domain Contracts PRD](./00a-suite-domain-contracts-prd.md)

## 1. Purpose

This register assigns every requirement family a release tier. It prevents a
P0 team from omitting a requirement because a later-tier module shares its
page or primitive. Exact automated/manual test IDs are created during planning
and must populate the PRD 06a evidence ledger before implementation can pass a
release gate; this PRD does not invent test results.

Mixed means the requirement states its minimum P0 subset and later-tier depth.
Safety, privacy, authorization, audit, idempotency, and recovery clauses apply
at the earliest tier where a capability is enabled.
An ID can appear in more than one tier cell only when those cells name distinct
subsets of the same owner requirement; it never gains a second owner PRD.

## 2. Tier Register

| Owner PRD | P0 requirements | P1 requirements | P2/P3 requirements |
|---|---|---|---|
| 00 Suite | FR-SUITE-001–010 | — | Constraints still apply to P2/P3 |
| 01 Core | FR-CORE-001–006, 008–009, 011–032 | FR-CORE-007, 010, 033–036; configurable depth in 014 | P2 insights use P0 facts |
| 02 Workforce | FR-WFM-001–013, 016–025, 027, 030–034 | FR-WFM-014–015, 026; advanced 028–029 | P2 recommendations only |
| 03 Talent/Rewards | FR-TAL-001–008, 011, 027–032 | FR-TAL-009–010, 012–026, 033–039 | P2 matching/recommendations |
| 04 Experience/Service | FR-SVC-001–019, 021–027, 033–037, 042 | FR-SVC-020, 028–032, 043–044 | FR-SVC-038–041 |
| 05 Payroll | FR-PAY-001–030, 034–040 | FR-PAY-031–033; advanced portions of 027–028 | P2 explanations/anomalies |
| 05a Statutory | FR-STAT-001–028, 030–036, 038–041 | FR-STAT-029, 037; direct-provider/consolidation extensions | future country packs P3 |
| 05b Payroll Controls | FR-PCTL-001–043 | only explicitly named advanced tools | — |
| 05c Transitions | TR-PAY-* and TR-STAT-* IDs | country-pack ordering only | — |
| 06 Platform | FR-PLT-001–010, 016–025, 039–049 | FR-PLT-011–015, 026–030 | FR-PLT-031–038 |
| 07b Experience | FR-UX-001–020 for enabled P0 journeys | Same requirements for P1 surfaces and configuration depth | Same requirements for enabled P2/P3 surfaces |
| 09 Implementation | FR-IMP-001–006, 008, 010–011, 013–026, 028–039 | FR-IMP-007, 009, 012, 027 plus template/phased depth | advanced migration twin P2 |
| 16 Architecture | FR-ARCH-001–040 controls for enabled P0 journeys; 039–040 governance | Same controls when P1 capabilities are enabled; direct-provider extensions retain P1/partner scope | Same controls when P2/P3 capabilities are enabled; no new country commitment |

Additional tier rules:

- `FR-CORE-014`: fixed P0 lifecycle tasks; configurable journey designer P1.
- `FR-WFM-028–030`: P0 custody/exit subset; inventory, warranty, maintenance,
  procurement, repair, and depreciation depth P1.
- `FR-WFM-019–022`: P0 is the contract/safety subset when approved Build
  timesheets are an enabled payroll input; `/hr/work-logs` operations remain P1.
- `FR-PAY-027`: P0 approved/opening loan EMI/recovery; origination and
  schedule administration P1.
- `FR-PAY-028`: P0 approved award consumption/treatment; eligibility, budget,
  and program administration P1.
- `FR-STAT-011/037`: P0 artifact, status, manual official evidence, and
  correction; direct portal/provider orchestration P1/partner.
- Platform P0 includes fixed standard workflow/form/field/report primitives;
  visual builders, custom reporting, and customer-isolated sandbox are P1.
- Page shell availability does not promote every tab: the tab/action tier in
  PRDs 07/07a controls entitlement.

## 3. Acceptance and Evidence Families

| Requirement family | Required evidence before tier release |
|---|---|
| Domain invariant/effective date | service + database constraint tests; history fixture |
| Permission/privacy | tenant/object/DataScope/field/export/search/AI denial tests |
| State transition | every PRD 00b/05c row: success, denied, stale, duplicate, cancel/recover |
| Import/migration | schema/map/validation, row result, control total, retry, lineage, rollback/forward correction |
| Cross-domain contract | producer/consumer schema, replay, reject, update/rescind, timeout, reconciliation |
| Calculation/rule | signed input/expected-output fixture and version reproduction |
| Payout/filing/journal | intent, unknown/partial/return/reject, acknowledgment, duplicate prevention, reconciliation |
| Page | PRD 07a route permission plus loading/empty/error/denied/stale/conflict/accessibility tests |
| Experience/content | PRD 07b task study, predeclared outcome target, copy/state review, responsive/light/dark and WCAG 2.2 AA browser evidence |
| Critical journey and edge case | PRD 07c case ID, owning domain FR/TR, valid and negative fixtures, persisted/visible outcome, recovery, and fixed-revision browser evidence |
| Report/metric | totals, drill-through predicate, freshness, export, cohort privacy |
| Performance/recovery | PRD 06a fixed revision, dataset, sample protocol, RPO/RTO/restore evidence |
| AI | PRD 06a fixed evaluation set and threshold report |
| Manual/legal control | named role, exact evidence artifact, signer, environment, expiry/review date |

## 4. Evidence Row Contract

Before a requirement enters implementation-complete status, the ledger has:

`requirement ID/range · tier/subset · owner · dependency · route/API/event ·
permission/DataScope · test/evidence ID · fixed build/rule/provider version ·
environment/dataset · expected result · actual result · reviewer · status`

Statuses are `NOT_STARTED`, `DESIGNED`, `IMPLEMENTED_UNVERIFIED`, `PASS`,
`FAIL`, or `WAIVED`. Only `PASS` or a permitted unexpired `WAIVED` row may pass
a release gate. A parent range cannot be `PASS` while a child row is failing.

## 5. Change Control

- Adding/removing/changing a requirement updates this register, owning PRD,
  page manifest, contracts, tests, migration effect, and release evidence.
- A priority downgrade requires Product, Engineering, QA, and affected
  Payroll/Legal/Security owner approval plus dependency impact.
- A P1/P2 feature may not weaken a P0 invariant.
- Evidence from a different rule/provider/build revision is stale until
  compatibility is proven.

## 6. Acceptance Criteria

- [ ] Every FR/TR ID in the normative suite has exactly one owner PRD and a
      registered tier; mixed IDs state their distinct subset at each tier.
- [ ] Every mixed requirement states its P0 and later-tier behavior.
- [ ] Every P0/P1 FR has at least one planned evidence row before implementation begins.
- [ ] Every release has no missing, stale, failed, or impermissibly waived required row.
- [ ] Page, contract, transition, rule, and recovery evidence reconcile to one fixed revision.
