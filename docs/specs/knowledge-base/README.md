# StreamlineOS Docs Product and Scale Plan

**Status:** [`2026-10-20-document-module-product-decision.md`](2026-10-20-document-module-product-decision.md) is the product authority; [`OPEN-TASKS.md`](OPEN-TASKS.md) is the only implementation checklist

**Latest product-direction update:** 2026-10-20. Latest architecture/completion audit: 2026-09-27. Original product/browser audit: 2026-09-23.

Start with [the document-module product decision](2026-10-20-document-module-product-decision.md) for scope, priorities, final information architecture, removals, and closed decisions. Use [the consolidated open-task queue](OPEN-TASKS.md) to resume implementation. It carries forward unchecked requirements from older trackers, but an inherited task must be reconciled with the current product decision before implementation. Checklist percentages are not release-readiness or capacity measurements.

**Completion gate:** mark `[x]` in `OPEN-TASKS.md` only after the code is implemented, the whole requirement is verified, and relevant tests pass with recorded evidence. Otherwise leave it open and distinguish missing implementation from verification pending. Historical source names in that file are provenance, not authority to recheck work automatically.

**Scope:** The StreamlineOS document/knowledge module: `knowledge/**`, its project adapter, public document renderer, and backend modules that store, retrieve, govern, and index documents. CRM, HR, payroll, accounting, calendar, and project feature strategy is out of scope.

## Outcome

This pack answers four questions:

1. What knowledge-base pages exist today, and what is actually present on each page?
2. What customer-required components and workflows are missing from each page?
3. What backend changes are required to serve millions of users reliably and economically?
4. What should be reused, removed, postponed, or deliberately not built?

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
| 1 | [`01-product-strategy.md`](01-product-strategy.md) | Customer needs, principles, metrics, feature priority |
| 2 | [`02-page-component-spec.md`](02-page-component-spec.md) | Page-by-page components, actions, states, and removals |
| 3 | [`03-information-architecture-and-design-system.md`](03-information-architecture-and-design-system.md) | Navigation, shared modules, accessibility, interaction rules |
| 4 | [`competitor-research.md`](competitor-research.md) | Original knowledge-product market evidence |
| 5 | [`04-backend-scale-architecture.md`](04-backend-scale-architecture.md) | Low-cost million-user target architecture |
| 6 | [`05-data-api-search-security.md`](05-data-api-search-security.md) | Data, interface, search, ACL, cache, and retention contracts |
| 7 | [`06-code-removal-and-reuse.md`](06-code-removal-and-reuse.md) | Deletion, consolidation, and reuse plan |
| 8 | [`OPEN-TASKS.md`](OPEN-TASKS.md) | Consolidated incomplete requirements, release gates, architecture corrections, provenance, and proof fields |
| Evidence | [`2026-10-20-drive-first-docs-competitor-analysis.md`](2026-10-20-drive-first-docs-competitor-analysis.md) | Historical research behind the Drive-first decision; not implementation authority |
| Archive | [`2026-10-20-streamlineos-suite-competitor-analysis.md`](2026-10-20-streamlineos-suite-competitor-analysis.md) | Suite-wide research outside the scope of this Docs plan |

## Product thesis

StreamlineOS Documents should be the trusted memory and working-file layer of the suite, not a generic editor or an Excel clone. Its defensible advantage is that files, pages, sheets, projects, support conversations, decisions, people, and operational records share one tenant and permission model. The product wins when a user can:

- organize and share durable files and folders;
- find a trustworthy answer quickly;
- see why the answer is trustworthy and what evidence supports it;
- turn a gap or conversation into governed knowledge without copying data;
- preserve and search uploaded spreadsheets, open supported workbooks through Microsoft 365, and later add read-only permission-safe live data blocks;
- know who owns a page and when it must be reviewed;
- safely share knowledge without leaking a title, snippet, attachment, or citation;
- recover from mistakes through history, conflict handling, archive, and trash.

## Locked product decisions

1. `kb_pages` remains canonical during migration. New file/folder contracts use compatibility adapters; permanent dual-write is prohibited.
2. Docs home is the default. Ask is contextual from Docs or a selected file/folder, not a competing primary destination.
3. “My files” means content owned by the current member. “Shared with me” means explicit grants. Neither is inferred in the browser.
4. Quick find is the single prominent search entry. Content health is a permission-gated workflow, not a primary destination.
5. The project wiki is an adapter over the same page modules, not a second knowledge system.
6. PostgreSQL remains the transactional source. Redis is an optional acceleration layer; cache failure must not break correctness or preserve revoked access.
7. Indexing, imports, exports, AI, notifications, and analytics are asynchronous. Page reads and writes never wait for them.
8. Start with a modular monolith plus workers. Introduce tenant cells only when measured load or fault isolation requires them. Do not begin with microservices.
9. AI may suggest, summarize, classify, and answer. It may not silently publish, change access, approve a review, or overwrite a human edit.
10. Organization-owned Team folders are the shared workspace. Linked records reference one document system rather than creating module-specific libraries.
11. Spreadsheet delivery is phased: XLSX/CSV lifecycle first, Microsoft 365 integration next, and read-only permission-aware live data blocks later. Excel parity is not planned.
12. Named guests are the external-sharing default. Public links require administrator opt-in, expiration, audit, and download policy.
13. Research Briefs, duplicate Search/Favorites links, Company Documents as a separate destination, and governance links for ordinary users are absent from daily navigation. Routes and data remain until retirement gates pass.

## Release order

- **P0 — focused, trustworthy core:** Docs home, My files, Shared with me, Team folders, Templates, Quick find, Trash, correct ownership/shares/ACL, XLSX/CSV upload and indexing, bounded lists, mobile navigation, restore/history, and production evidence.
- **P1 — office-ready and governed:** canonical file/folder contracts, inherited access, Microsoft 365 editing handoff, fidelity disclosure, health inventory, owners/reviews, and usage analytics.
- **P2 — differentiated intelligence:** cited Ask, permission-safe read-only live data blocks, smart filing, actionable extraction, semantic collections, trust signals, and change-impact preview.
- **Rejected for now:** Excel-complete parity, arbitrary page databases/app builders, board/calendar/timeline views of pages, autonomous publishing, duplicate wiki implementations, and feature-specific infrastructure that a shared module already provides.

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
