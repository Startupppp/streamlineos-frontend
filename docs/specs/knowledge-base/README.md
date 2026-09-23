# Knowledge Base Product and Scale Plan

**Status:** planning authority

**Audit date:** 2026-09-23

**Scope:** StreamlineOS `knowledge/**`, its project-wiki adapter, public-page renderer, and the backend modules that store, retrieve, govern, and index knowledge.

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
- Existing detailed contracts in [`../documents-module/README.md`](../documents-module/README.md). Those files remain the implementation-level source for their numbered acceptance items.
- First-party competitor sources in [`competitor-research.md`](competitor-research.md).

Live observations are labelled **Observed**. Source-only conclusions are labelled **Source**. Proposed behavior is labelled **Target**. This distinction prevents a source file from being mistaken for working browser behavior.

## Document map

| Step | Document | Decision owned |
|---:|---|---|
| 0 | [`00-current-state-audit.md`](00-current-state-audit.md) | Complete page census and current gaps |
| 1 | [`01-product-strategy.md`](01-product-strategy.md) | Customer needs, principles, metrics, feature priority |
| 2 | [`02-page-component-spec.md`](02-page-component-spec.md) | Page-by-page components, actions, states, and removals |
| 3 | [`03-information-architecture-and-design-system.md`](03-information-architecture-and-design-system.md) | Navigation, shared modules, accessibility, interaction rules |
| 4 | [`competitor-research.md`](competitor-research.md) | Primary-source market evidence |
| 5 | [`04-backend-scale-architecture.md`](04-backend-scale-architecture.md) | Low-cost million-user target architecture |
| 6 | [`05-data-api-search-security.md`](05-data-api-search-security.md) | Data, interface, search, ACL, cache, and retention contracts |
| 7 | [`06-code-removal-and-reuse.md`](06-code-removal-and-reuse.md) | Deletion, consolidation, and reuse plan |
| 8 | [`07-delivery-roadmap.md`](07-delivery-roadmap.md) | Sequencing, release gates, ownership, and proof |

## Product thesis

StreamlineOS Knowledge should be the trusted memory of work, not a generic document editor. Its defensible advantage is that pages, projects, support conversations, decisions, people, and operational records already share one tenant and permission model. The product wins when a user can:

- find a trustworthy answer quickly;
- see why the answer is trustworthy and what evidence supports it;
- turn a gap or conversation into governed knowledge without copying data;
- know who owns a page and when it must be reviewed;
- safely share knowledge without leaking a title, snippet, attachment, or citation;
- recover from mistakes through history, conflict handling, archive, and trash.

## Locked product decisions

1. `kb_pages` is the system of record for organization and project wiki pages.
2. Ask KB and Wiki are two entry points into one knowledge product.
3. “My pages” means pages owned by the current membership. “Shared with me” means explicit share grants. Neither is inferred in the browser.
4. Full search is a P0 page. Content health is a P1 workflow, not a dashboard of vanity metrics.
5. The project wiki is an adapter over the same page modules, not a second knowledge system.
6. PostgreSQL remains the transactional source. Redis is an optional acceleration layer; cache failure must not break correctness or preserve revoked access.
7. Indexing, imports, exports, AI, notifications, and analytics are asynchronous. Page reads and writes never wait for them.
8. Start with a modular monolith plus workers. Introduce tenant cells only when measured load or fault isolation requires them. Do not begin with microservices.
9. AI may suggest, summarize, classify, and answer. It may not silently publish, change access, approve a review, or overwrite a human edit.
10. No arbitrary databases, marketplace, or decorative view types until search, ownership, sharing, mobile, accessibility, and governance are complete.

## Release order

- **P0 — trustworthy core:** correct ownership/shares/ACL, full search, bounded lists, page actions, mobile navigation, honest states, restore/history, and production evidence.
- **P1 — governance loop:** health inventory, owners and review policies, Ask gap workflow, space membership, bulk repairs, and usage analytics.
- **P2 — differentiated intelligence:** evidence trails, answer-to-fix loop, workflow-aware knowledge capture, multilingual delivery, and optional collaboration enhancements after measured demand.
- **Rejected for now:** arbitrary page databases, board/calendar/timeline views of pages, autonomous publishing, duplicate wiki implementations, and feature-specific infrastructure that a shared module already provides.

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
