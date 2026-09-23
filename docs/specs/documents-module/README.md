# Documents Module Completion Program

## Purpose

This directory is the implementation tracker for bringing the Documents product
(Knowledge / Wiki / Ask KB) to a release-ready standard. It covers route
integrity, page keep/merge/remove/add disposition, sidebar IA, discovery
(search, filters, views, pagination), card and bulk actions, forms and
validation, API / database / cache performance, architecture boundaries, visual
hierarchy, and competitor differentiation.

Writing these PRDs does not mark any implementation item complete.

## Product Boundary

**In scope**

- `/knowledge`, `/knowledge/chat`, `/knowledge/wiki/**`
- Public `/wiki/[shareToken]`
- `/kb` and `/docs` compatibility aliases
- Backend `/kb/**`, `/public/wiki/**`, and KB retention/indexing jobs
- `kb_pages`, spaces, comments, versions, templates, reviews, sources, chat,
  analytics, import/export, page links, public shares, and retrieval
- `/build/[projectId]/wiki/**` as a project-scoped adapter over `kb_pages`
- Migration from legacy `kb_articles` to `kb_pages`
- Support research briefs when their route owner must move into Documents
- Help-centre CMS (`/support/kb/**`, public `/help/[orgId]/**`) as a linked
  Documents surface until article → page cutover

**Out of scope**

- `/me/documents` and onboarding documents — universal Home self-service (HR)
- `/hr/documents/**`, HR templates, HR document types, and HR review queues
- Accounting bills, invoices, vouchers, and their attachments
- SignOS envelope documents and signing templates
- Generic blob storage beyond reusable upload, scanning, and signed-URL infra
- Support ticket workflows except their handoff into knowledge pages

HR file-library defects stay in
[`docs/specs/hrms-module/`](../hrms-module/README.md) (14c library/review,
14a `/me/documents`). Do not open a second Documents tracker for
`/hr/documents`. P0 HR handoff: `HRM-14C-DOC-001`–`004`, `HRM-14A-DOC-001`.

**Catalog precision:** the **role-editor** grant list
(`frontend/lib/rbac/permissions/kb.ts`) lags backend. The `PermissionKey`
union / `permission-catalog.json` already knows page keys. DOC-07-032
fixes the role-editor file, not the union.

These domains may reuse editor, upload, and display primitives. They must not
merge into one business model because each contains a file or the word
“document.”

## Source Snapshot

Baseline audited on 2026-09-19 against:

- `frontend/app/(authenticated)/knowledge/**`
- `frontend/features/wiki/**`
- `frontend/hooks/api/kb/**`
- `frontend/lib/knowledge-routes.ts`
- `frontend/lib/rbac/permissions/kb.ts`
- `backend/src/modules/kb/**`
- `backend/src/db/schema/kb/**`
- `backend/src/modules/rbac/permissions/kb.ts`
- `frontend/PAGES.md` and root `PAGES.md`

Unchecked items are requirements, not claims that functionality is absent.
Current-source findings identify defects already proven in code. Every item
must be rechecked at implementation time because the working tree is active.

## Recheck Verdict

The Documents module is **not complete**.

Confirmed open defects include: root `PAGES.md` lists routes that 404;
`/knowledge-base` has no redirect; mobile wiki has no sidebar; sidebar shows
admin destinations without permission gates; Shared/My pages use the wrong
query; list pages lack search/filters; no bulk actions exist; frontend
permission catalog is missing 13 backend keys; page ACL ignores space
membership; sources and analytics are org-wide; most forms skip Zod and
EntityForm shells; sheet/dialog tokens match the page canvas in light mode.

Static proof does not certify browser behavior, query plans, migrations, or a
deployed customer journey. Those checks remain open.

## Completion Authority

This README is the parent tracker. A child PRD remains authoritative for its
own acceptance items. A parent checkbox may be checked only when:

1. every required child item is checked;
2. the child file records exact source, test, browser, database, or deployed
   evidence;
3. unresolved external checks remain visibly open;
4. `frontend/PAGES.md` and root `PAGES.md` reflect the shipped route set; and
5. the final release PRD accepts the integrated frontend/backend revision pair.

Passing types, mocks, or unit tests alone does not close a customer journey.

## Product Contracts

- **Universal surface, scoped records.** Every active member can reach Ask KB
  and Wiki reading. Authoring, governance, analytics, import, export, settings,
  and AI stay action- and record-authorized.
- **One content truth.** `kb_pages` is the canonical knowledge record. Files
  support pages; pages are not a file manager.
- **No false destinations.** Navigation only exposes real routes the actor can
  use. Browser Back stays browser Back; product Back uses a safe parent href.
- **Filters are server-enforced and URL-shareable.** Client-side slices of a
  capped tree are not a filter.
- **Forms validate twice.** Identical business rules at Zod form schema and
  API DTO. Optional UI labels must match server requiredness.
- **Surfaces differentiate.** Page canvas, card, sheet, and dialog use distinct
  token stacks so overlays are never the same color as their parent.
- **Authorize at the data layer.** Sidebar and `useCan` are advisory.
- **Bounded reads.** Default page size ≤ 100. Cursor pagination for every
  unbounded collection. No silent 500/2000 caps without a completion path.
- **Spaces archive/restore.** Never hard-delete a space with a customer control.

## Request Traceability

| # | User request | Owner |
|---|---|---|
| 1 | 404s, back arrows, broken navigation | DOC-01, DOC-02 |
| 2 | Efficient filters, schema, missing filters | DOC-04, DOC-07 |
| 3 | Page keep / remove / add and missing actions | DOC-02, DOC-14 |
| 4 | Sidebar items and reusable components | DOC-03, DOC-09 |
| 5 | Card actions, configurable vs locked, views | DOC-05, DOC-14 |
| 6 | Where pagination stays / goes | DOC-04 |
| 7 | Inefficient DB, missing cache/invalidation | DOC-07 |
| 8 | Missing bulk actions, fully functional | DOC-05, DOC-07 |
| 9 | Every form’s validation rules | DOC-06 |
| 10 | Architectural mistakes and fixes | DOC-00, DOC-08 |
| 11 | Where search should filter | DOC-04 |
| 12 | Canvas / card / sheet / dialog colors | DOC-09 |
| 13 | Optional label vs required field | DOC-06 |
| 14 | Missing Zod (frontend and API) | DOC-06, DOC-07 |
| 15 | Dynamic / dependent filters | DOC-04 |
| 16 | Competitor pages, APIs, UX (Notion and peers) | DOC-10 |
| 17 | Added: ACL, a11y, concurrency, migration, observability | DOC-08, DOC-11 |

## Workstreams

- [ ] [DOC-00 — Normative product and architecture decisions](./00-product-decisions-prd.md)
- [ ] [DOC-01 — Route and navigation integrity](./01-route-navigation-prd.md)
- [ ] [DOC-02 — Page inventory (keep / merge / remove / add)](./02-page-inventory-prd.md)
- [ ] [DOC-03 — Sidebar information architecture and reuse](./03-sidebar-ia-prd.md)
- [ ] [DOC-04 — Search, filters, views, and pagination](./04-discovery-filters-views-prd.md)
- [ ] [DOC-05 — Cards, row actions, and bulk actions](./05-cards-bulk-actions-prd.md)
- [ ] [DOC-06 — Forms, Zod, and API validation](./06-forms-validation-prd.md)
- [ ] [DOC-07 — API, database, cache, and performance](./07-data-performance-prd.md)
- [ ] [DOC-08 — Architecture and cross-module boundaries](./08-architecture-prd.md)
- [ ] [DOC-09 — Visual hierarchy, tokens, and accessibility](./09-visual-hierarchy-prd.md)
- [ ] [DOC-10 — Competitor baseline and differentiation](./10-competitor-parity-prd.md)
- [ ] [DOC-11 — Release verification and rollout](./11-release-verification-prd.md)
- [ ] [DOC-14 — Exhaustive page catalog](./14-page-catalog-prd.md)

Parent **DOC-00** is checked when D01–D22 are recorded. Implementation
acceptance items inside that file remain open until evidenced. The program is
complete only when DOC-00 through DOC-14 parent items are checked.

Unqualified requirements are P0. Requirements labeled P1 do not block the P0
release; they block the full-program parent. P2 is a future option until
separately approved. DOC-11 records both decisions.

## Delivery Order

### Phase 0 — Lock Product and Data Decisions

- [ ] **DOC-00-001** Confirm D01–D22 in DOC-00. Page disposition tables stay
      in DOC-02 / DOC-14 for execution.

### Phase 1 — Repair Reachability and Contracts

- [ ] **DOC-00-002** Complete DOC-01 route integrity, back behavior, and
      loading/error coverage.
- [ ] **DOC-00-003** Complete page moves, removals, and additions from DOC-02.
- [ ] **DOC-00-004** Complete sidebar IA from DOC-03.
- [ ] **DOC-00-005** Complete form/API validation from DOC-06 and list/cache
      caps from DOC-07.

### Phase 2 — Complete Customer Workflows

- [ ] **DOC-00-006** Complete discovery, views, and pagination from DOC-04.
- [ ] **DOC-00-007** Complete card and bulk actions from DOC-05.
- [ ] **DOC-00-008** Complete architecture migrations that unblock workflows
      from DOC-08.

### Phase 3 — Product Quality and Release

- [ ] **DOC-00-009** Complete visual and accessibility acceptance from DOC-09.
- [ ] **DOC-00-010** Close the selected competitor baseline from DOC-10.
- [ ] **DOC-00-011** Complete DOC-11 against one reviewed frontend/backend
      revision pair, including DOC-14 row evidence.

## Evidence Levels

- **Source proof** — confirms wiring, ownership, or a static defect.
- **Unit/contract proof** — confirms a bounded behavior with controlled data.
- **Database proof** — confirms authorization, constraints, and transaction
  behavior in a named disposable environment.
- **Browser proof** — confirms routing, keyboard, responsive layout, focus,
  overlays, and customer-visible states.
- **Deployed proof** — confirms migrations, providers, observability, rollback,
  and production-like performance.

Each checked item must name the evidence level. Inference must be labelled as
inference.

## Program Definition of Done

- [ ] No Documents navigation, card, table row, citation, command, or back
      action reaches a missing or semantically wrong destination.
- [ ] Every retained page has an owner, required customer job, permission,
      loading/error/empty/denied state, bounded collection strategy, and
      primary action.
- [ ] Every filter is URL-shareable, server-enforced, permission-safe, and
      truthful for the full result set.
- [ ] Every mutation validates the same business contract at form, API, and
      database boundaries without parallel schemas drifting.
- [ ] Bulk and retry behavior cannot silently lose, duplicate, or partially
      misrepresent knowledge work.
- [ ] Query plans, cache writers, invalidation, and cross-tenant isolation are
      proven with realistic org sizes.
- [ ] Member, author, knowledge-manager, project-contributor, and public-reader
      journeys pass for the retained surfaces.
- [ ] Relevant focused tests, type checks, builds, cycle gates, browser checks,
      migrations, rollback, and monitoring evidence are recorded in DOC-11.

## Related Programs

- HRMS — `docs/specs/hrms-module/` (pattern reference; `/me/documents` stays
  there).
- Build — `docs/specs/build/module/` (project wiki is an adapter, not a second
  knowledge product).
- Unified page state — `docs/specs/2026-09-16-unified-page-state-design.md`.

## Evidence Log

Add one entry when a parent PRD closes:

`YYYY-MM-DD — DOC-0X — frontend/backend revisions — source anchors — exact
commands/results — browser/database evidence — residual limitations`
