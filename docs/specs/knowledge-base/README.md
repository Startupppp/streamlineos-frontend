# StreamlineOS Docs Product and Scale Plan

**Status:** [`2026-10-20-document-module-product-decision.md`](2026-10-20-document-module-product-decision.md) is the product authority; [`OPEN-TASKS.md`](OPEN-TASKS.md) is the only implementation checklist

**Latest product and documentation recheck:** 2026-10-20. Original architecture/completion audit: 2026-09-27. Original product/browser audit: 2026-09-23.

Start with [the document-module product decision](2026-10-20-document-module-product-decision.md) for scope, priorities, final information architecture, removals, and closed decisions. Use [the consolidated open-task queue](OPEN-TASKS.md) to resume implementation. It carries forward unchecked requirements from older trackers, but an inherited task must be reconciled with the current product decision before implementation. Checklist percentages are not release-readiness or capacity measurements.

**Completion gate:** mark `[x]` in `OPEN-TASKS.md` only after the code is implemented, the whole requirement is verified, and relevant tests pass with recorded evidence. Otherwise leave it open and distinguish missing implementation from verification pending. Historical source names in that file are provenance, not authority to recheck work automatically.

**Scope:** The StreamlineOS document/knowledge module: `knowledge/**`, its project adapter, public document renderer, and backend modules that store, retrieve, govern, and index documents. CRM, HR, payroll, accounting, calendar, and project feature strategy is out of scope.

## Outcome

This pack answers five questions:

1. What document surfaces exist today, and what is actually present on each?
2. What customer-required components and workflows are missing?
3. What backend changes are required to serve millions of users reliably and economically?
4. What should be reused, removed, postponed, or deliberately not built?
5. Which release, failure, authorization, file-fidelity, migration, accessibility, and operational edge cases must be proven?

This is a **plan**, not authorization to implement production changes. Product work is ordered by customer value, correctness, reliability, and cost. A competitor feature does not enter the roadmap unless it solves a named user job and has a measurable outcome.

## Evidence used

- Live browser audit of the localhost product on 2026-09-23, including all primary sidebar destinations and page `34`.
- Route and component census under `frontend/app/(authenticated)/knowledge` and `frontend/features/wiki`.
- Backend census under `backend/src/modules/kb` and `backend/src/db/schema/kb`.
- The former Documents Module implementation contracts, whose unchecked child requirements now live verbatim in [`OPEN-TASKS.md`](OPEN-TASKS.md). Git history retains their completed entries and surrounding historical prose.
- First-party competitor sources in [`competitor-research.md`](competitor-research.md).
- Consolidated primary-source decisions in [`2026-10-20-document-module-product-decision.md`](2026-10-20-document-module-product-decision.md).

Live observations are labelled **Observed**. Source-only conclusions are labelled **Source**. Proposed behavior is labelled **Target**. This distinction prevents a source file from being mistaken for working browser behavior.

## Document map

Use [`MASTER-IMPLEMENTATION-PROMPT.md`](MASTER-IMPLEMENTATION-PROMPT.md) when handing the complete program to an implementation agent. Use [`OPEN-TASKS.md`](OPEN-TASKS.md) as its sole resume/checklist authority.

| Step | Document | Decision owned |
|---:|---|---|
| Authority | [`2026-10-20-document-module-product-decision.md`](2026-10-20-document-module-product-decision.md) | Current scope, users, priorities, final IA, removals, delivery phases, and release gates |
| 0 | [`00-current-state-audit.md`](00-current-state-audit.md) | Complete page census and current gaps |
| 1 | [`01-product-strategy.md`](01-product-strategy.md) | Customer jobs, personas, principles, metrics, content rules, and feature decision test |
| 2 | [`02-page-component-spec.md`](02-page-component-spec.md) | Page-by-page components, actions, states, and removals |
| 3 | [`03-information-architecture-and-design-system.md`](03-information-architecture-and-design-system.md) | Navigation, shared modules, accessibility, interaction rules |
| 4 | [`competitor-research.md`](competitor-research.md) | Original knowledge-product market evidence |
| 5 | [`04-backend-scale-architecture.md`](04-backend-scale-architecture.md) | Low-cost million-user target architecture |
| 6 | [`05-data-api-search-security.md`](05-data-api-search-security.md) | Data, interface, search, ACL, cache, and retention contracts |
| 7 | [`06-code-removal-and-reuse.md`](06-code-removal-and-reuse.md) | Deletion, consolidation, and reuse plan |
| 8 | [`OPEN-TASKS.md`](OPEN-TASKS.md) | Consolidated incomplete requirements, release gates, architecture corrections, provenance, and proof fields |
| Operations | [`MIGRATION-RUNBOOK.md`](MIGRATION-RUNBOOK.md) | Historical migration evidence and current cutover cautions; not product scope |
| Operations | [`KB-OBSERVABILITY-RUNBOOK.md`](KB-OBSERVABILITY-RUNBOOK.md) | Knowledge alerts, containment, recovery, and verification |

The authority document is the only place that repeats the complete product thesis, Must/Basic/Good/WOW feature tiers, exclusions, edge-case checklist, current-vs-pending status, delivery phases, and closed product decisions. Supporting files must link to it instead of restating those decisions.

## Definition of done

A roadmap item is not complete because a screen renders. It is complete only when:

- its customer job and success metric are named;
- all loading, error, empty, filtered-empty, denied, offline, and conflict states are handled where applicable;
- server authorization is authoritative and has cross-tenant tests;
- collections are bounded and their indexes have `EXPLAIN (ANALYZE, BUFFERS)` evidence with production-like cardinality;
- cache keys and every writer/invalidation path are documented and tested;
- keyboard, screen-reader, 375 px mobile, high-density desktop, and reduced-motion checks pass;
- telemetry proves latency, error, freshness, queue age, and cost budgets;
- dead or superseded code is removed only after route, import, build, migration, and rollback evidence exists.
