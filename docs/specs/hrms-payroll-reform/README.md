# StreamlineOS People + Payroll product definition

**Status:** Target-state PRDs; requirements and release gates, not a statement of shipped functionality  
**Decision:** Global, country-neutral HR records; **India-first payroll**  
**Target customer:** Organizations with 5–2,000 workers, with a scale target of 10,000  
**Recruitment:** A separate product with a versioned hire and position handoff  
**Updated:** 2026-10-24

## Start here

For **Claude implementation of the architecture review**, start with
[17 Claude execution guide](./17-claude-architecture-execution.md), then
[16 Architecture hardening PRD](./16-architecture-hardening-prd.md).
The complete [HTML report](./architecture-review/2026-10-24-architecture-review.html)
is preserved here. Its [coverage map](./architecture-review/html-prd-coverage.json)
maps every semantic report point to requirements; the
[execution ledger](./architecture-review/execution-ledger.json) tracks 158
atomic acceptance criteria, initially NOT_STARTED. Run
`node scripts/check-hrms-architecture-coverage.mjs --self-test` and the command
without flags to check document completeness. Implementation/release modes
remain red until their actual evidence is supplied. The guide includes the
copyable implementation prompt, dependency programs and resume protocol.

For the confirmed **startup/SMB, India-first HRMS + Payroll** buyer, start with
the [24 October consolidated product offer and PRD](./2026-10-24-startup-smb-product-prd.md).
It lists basic, complete-suite, wow and future capabilities, a proposed simpler
sidebar, current-route preservation, delivery waves and acceptance measures.
The [23-vendor official-source review](./2026-10-24-competitor-evidence.md)
supplies dated evidence and availability caveats. These are a product proposal
and research refresh; the owner PRDs and tier register below remain the
business-rule and release authority. No implementation completeness is implied.

The [suite PRD](./00-suite-product-prd.md) states the customer, outcomes,
boundaries, and journeys. [Competitive coverage and release](./08-competitive-coverage-release-prd.md)
is the four-category portfolio decision. The domain PRDs specify what to build;
the [pages and permissions](./07-pages-navigation-roles-prd.md) and
[experience and content](./07b-experience-content-quality-prd.md) PRDs specify
how people use it. The [tier register](./00c-requirement-tier-traceability-prd.md)
and [release evidence](./06a-operations-release-evidence-prd.md) determine what
can be called complete.

| User's category | Suite tier | Meaning | Release treatment |
|---|---|---|---|
| Base features customers expect | P0 Foundation | End-to-end, safe HR and India payroll launch capability | Required before general availability |
| Features the product should have | P1 Complete Suite | Committed depth for the target customer | Ship in governed increments after P0 |
| Good to have in the future | P3 Future / Country Pack | Expansion into more countries, service models, and regulated partners | Research and extension contracts now; commit only with a validated market and delivery model |
| Wow features | P2 Differentiator | Measurably better cross-work, explainability, and guided decisions | Demonstrate a user outcome after underlying facts and controls pass |

Tier numbers express dependency and delivery order, not a claim that every
vendor has every P0 item or that a P2 idea is more valuable than a P3 idea.
**Partner-dependent** and **out of scope** are delivery labels, not hidden tiers.
Each in-scope requirement has exactly one domain owner; a shared page does not
change its owning business rules.

### Four-tier portfolio at a glance

This is a reading aid; the linked owner PRDs and tier register control exact
requirements and mixed P0/P1 subsets.

| Domain | Base: P0 | Should have: P1 | Future: P3 | Wow: P2 |
|---|---|---|---|---|
| Core HR | One effective-dated worker/employment record, onboarding, changes, policy and document evidence, exit | Advanced job architecture, mobility, probation, reorganizations | Country-specific employment packs after validation | Preview the payroll, access, work, and cost impact of a change |
| Workforce | Attendance, WFH/WFO, leave, shifts, overtime, approved pay inputs | Rosters, swaps, comp-off, device operations, asset depth | Certified device and local workforce integrations | Staff from work demand, skills, availability, and labor cost |
| Talent and rewards | Goals, reviews, feedback, salary history and compensation decisions | Skills, learning, succession, engagement, benefits, equity | Licensed market data, carrier and brokerage services | Explainable skills-to-work matching and development plans |
| Employee and manager service | Self-service, team home, approvals, requests, restricted cases | Journeys, omnichannel intake, specialist service depth | No committed P3 item; validate local needs | Permission-grounded answers and proactive exception resolution |
| Payroll | Complete, controlled India run through pay, statutory, accounting, and reconciliation | Group payroll, contractor pay, advanced corrections and provider connections | Additional native country packs, EOR/PEO and regulated partners | Source-level pay explanation, anomaly detection, cash/work cost insight |
| Platform and implementation | Access, audit, reports, integrations, guided migration and parallel-run gates | Builders, customer sandbox, planning, source adapters and phased cutover | Additional country compliance packs and regulated ecosystem | Safe simulations and a migration impact twin |

## PRD map

| Decision or job | Owner |
|---|---|
| Shared names, mutable fact ownership, and handoffs | [00a Domain contracts](./00a-suite-domain-contracts-prd.md) |
| Employment, approvals, time, and asset transitions | [00b Lifecycle transitions](./00b-lifecycle-transition-contracts-prd.md) |
| Worker record, organization assignment, onboarding, changes, exit | [01 Core HR](./01-core-hr-lifecycle-prd.md) |
| Attendance, WFH/WFO, leave, shifts, overtime, approved time inputs | [02 Workforce](./02-workforce-management-prd.md) |
| Goals, performance, skills, learning, compensation, benefits | [03 Talent and rewards](./03-talent-experience-rewards-prd.md) |
| Employee/manager work, approvals, HR requests and restricted cases | [04 Service](./04-employee-manager-service-prd.md) |
| India gross-to-net, pay runs, payout, payslip, FnF, accounting | [05 Payroll](./05-india-payroll-prd.md) |
| India rules, obligations, tax, forms, and legal evidence | [05a Statutory](./05a-india-payroll-statutory-prd.md) |
| Corrections, partial/unknown payment, deadlines, and control cases | [05b Controls](./05b-india-payroll-controls-edge-cases-prd.md) and [05c Transitions](./05c-payroll-statutory-transition-tables-prd.md) |
| Access, workflow, analytics, integrations, and safe intelligence | [06 Platform](./06-platform-intelligence-compliance-prd.md) |
| Operations, availability, recovery, and evidence | [06a Release evidence](./06a-operations-release-evidence-prd.md) |
| Navigation, route ownership, and per-page authorization | [07 Pages](./07-pages-navigation-roles-prd.md) and [07a Manifest](./07a-page-permission-manifest-prd.md) |
| Task flows, UI states, copy, visual quality, accessibility | [07b Experience and content](./07b-experience-content-quality-prd.md) |
| Cross-module journey failures, recovery, and edge-case acceptance | [07c Critical journeys and edge cases](./07c-critical-journeys-edge-cases-prd.md) |
| Capability priorities, waves, and launch claims | [08 Competitive coverage](./08-competitive-coverage-release-prd.md) |
| Customer setup, migration, parallel runs, and cutover | [09 Implementation cockpit](./09-implementation-migration-cockpit-prd.md) |
| Where the existing open implementation tasks live | [10 Gap routing map](./10-current-product-gaps-prd.md) |
| Reporting-manager code inventory and remaining acceptance source | [11 Manager evidence](./11-reporting-manager-prd.md) and [detailed manager PRD](./15-reporting-manager-onboarding-prd.md) |

The [competitor benchmark](./08a-competitor-benchmark-prd.md) and
[2026-10-22 primary-source research](./2026-10-22-market-benchmark.md)
are dated discovery evidence. Vendor public claims are neither hands-on quality
scores nor evidence that StreamlineOS has implemented a feature. This folder is
the single People + Payroll specification and open-work queue. Files from the
earlier HRMS execution pack that still have unfinished TODOs are preserved here.
The [gap routing map](./10-current-product-gaps-prd.md) points to those files
without copying their checklists. The [legacy execution ledger](./legacy-execution-ledger.md)
records its original packet process; current product scope and release gates are
owned by the newer suite PRDs above. **Do not delete a source file while any of
its TODOs are open.** Close items with their required evidence first; then
retire a file only when all of its TODOs are complete and any distinct PRD
prose has a verified successor.

## Build and release contract

1. Choose one customer job and its owning PRD. Record the requirement ID, tier,
   actor, authorization, page/API, source facts, transitions, and recovery.
2. Audit current code and behavior as **complete, partial, conflicting, missing,
   duplicate, or removal candidate**. Do not infer implementation from these
   PRDs or a vendor matrix.
3. Design and test the complete journey, including denied, stale, error,
   partial, and recovery states. Use the same canonical fact in self-service,
   operator pages, reports, exports, and payroll inputs.
4. Attach fixed-revision source, database, browser, provider, accessibility,
   legal, and operations evidence as applicable. A designed or coded item is
   not a passed release gate.
5. Publish only verified native, connected, customer-operated, managed,
   partner, beta, or unavailable claims for the named geography and package.

## Decisions still requiring evidence

| Decision | Accountable owner | Evidence needed before commitment |
|---|---|---|
| Initial UI languages, data regions, employee types, and exact customer-size slice | Product + Security/Privacy | Customer interviews, buyer demand, hosting and localization review |
| Indian establishment/state coverage and each active payroll rule/form version | Payroll + Legal | Official instruments, dated rule pack, signed fixtures and portal/provider review |
| Bank, tax, e-signature, time-clock, benefit, and filing partners | Product + Operations | Contract, geographic availability, sandbox failure/reconciliation proof |
| P1 order and P2 differentiation claims | Product + Design | Task-based research, baseline metrics, pilot outcomes, implementation cost |
| Sales packaging and market comparisons | Product Marketing + Legal | Cell-level current source, geography, plan, delivery model, reviewer |

These decisions do not block writing the PRDs. They block unsupported country,
availability, parity, or legal claims and are explicit release inputs.
