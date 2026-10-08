# Knowledge Base — Open Tasks

**Status:** canonical incomplete-work queue

**Consolidated:** 2026-10-09 from the former `docs/specs/knowledge-base` and `docs/specs/documents-module` trackers.

**Open items:** 318. Completed checklist entries and duplicate parent/workstream checkboxes were intentionally omitted.

## How to use this file

- This is the only actionable checklist for the Knowledge / Wiki / Ask KB program.
- An unchecked item is an unverified requirement, not proof that its implementation is absent. Measure before building.
- Check an item only after its full claim is implemented and supported by the relevant source, focused-test, browser, database, role/tenant, deployment, and operational evidence.
- Keep compound requirements open until every clause is proven. Record evidence directly below the item before checking it.
- `NEEDS-DECISION` means product or architecture authority is still required. Do not infer the decision.
- Historical source names and line numbers below identify where an item came from before consolidation; use Git history when deeper context is needed.

## Completion evidence template

```text
Evidence:
- Revision(s):
- Source anchors:
- Exact commands and results:
- Browser / database / role / tenant proof:
- Deployment / operations proof:
- Residual limitations:
```

## 00-product-decisions-prd.md

Former source: `docs/specs/documents-module/00-product-decisions-prd.md`

### D01 — One Content Truth: `kb_pages`

- [ ] **KB-OPEN-001** **DOC-00-D01-A** no new wiki write path creates `kb_articles`; migration preview/run remains the only article → page bridge.
  - Origin: `docs/specs/documents-module/00-product-decisions-prd.md:24`

### D02 — Documents Product Is Ask KB + Wiki

- [ ] **KB-OPEN-002** **DOC-00-D02-A** product sidebar exposes Ask KB, Wiki, and (when permitted) Help centre; no third unlabeled “Documents” hub.
  - Origin: `docs/specs/documents-module/00-product-decisions-prd.md:38`

### D03 — My Pages vs Shared vs Private Visibility

- [ ] **KB-OPEN-003** **DOC-00-D03-A** both lists are server-filtered, ACL-correct, and labelled My pages / Shared with me.
  - Origin: `docs/specs/documents-module/00-product-decisions-prd.md:56`

### D04 — Recents, Favorites, and Settings Are Not Routes

- [ ] **KB-OPEN-004** **DOC-00-D04-A** root `PAGES.md` matches `frontend/PAGES.md`; `/knowledge-base` redirects.
  - Origin: `docs/specs/documents-module/00-product-decisions-prd.md:69`

### D05 — Full Search Is a First-Class Page

- [ ] **KB-OPEN-005** **DOC-00-D05-A** search route exists, is reachable from Quick find, and never client-filters a tree dump.
  - Origin: `docs/specs/documents-module/00-product-decisions-prd.md:82`

### D06 — Spaces Archive; They Do Not Hard-Delete

- [ ] **KB-OPEN-006** **DOC-00-D06-A** space card Delete is gone; archive/restore is the only lifecycle control.
  - Origin: `docs/specs/documents-module/00-product-decisions-prd.md:95`

### D07 — Help Centre Stays Until Cutover; Research Briefs Move

- [ ] **KB-OPEN-007** **DOC-00-D07-A** research briefs have one canonical URL; help-centre dual-run is documented in DOC-08 / DOC-11.
  - Origin: `docs/specs/documents-module/00-product-decisions-prd.md:109`

### D09 — Filters, Search, and Views Are Server Contracts

- [ ] **KB-OPEN-008** **DOC-00-D09-A** no list page filters a paged or capped tree in the browser and presents it as the full set.
  - Origin: `docs/specs/documents-module/00-product-decisions-prd.md:145`

### D10 — Frontend Permission Catalog Matches Backend

- [ ] **KB-OPEN-009** **DOC-00-D10-A** CI drift test fails if the two catalogs diverge.
  - Origin: `docs/specs/documents-module/00-product-decisions-prd.md:159`

### D11 — Page ACL Includes Space Membership

- [ ] **KB-OPEN-010** **DOC-00-D11-A** a member outside a restricted space cannot list, open, search, or retrieve its pages.
  - Origin: `docs/specs/documents-module/00-product-decisions-prd.md:171`

### D12 — Overlay Surfaces Are Visually Distinct

- [ ] **KB-OPEN-011** **DOC-00-D12-A** light and dark themes distinguish canvas, card, and overlay at 375 / 768 / 1280.
  - Origin: `docs/specs/documents-module/00-product-decisions-prd.md:190`

### D13 — Bulk Actions Are Real Mutations

- [ ] **KB-OPEN-012** **DOC-00-D13-A** no silent all-or-nothing bulk; UI shows a result summary.
  - Origin: `docs/specs/documents-module/00-product-decisions-prd.md:203`

### D14 — Content Management and Ask Insights Are P1

- [ ] **KB-OPEN-013** **DOC-00-D14-A** P0 release does not claim Notion/Confluence parity beyond the P0 table in DOC-10.
  - Origin: `docs/specs/documents-module/00-product-decisions-prd.md:218`

### D15 — Universal Read, Gated Authoring

- [ ] **KB-OPEN-014** **DOC-00-D15-A** sidebar and route-access tests assert the matrix in DOC-03.
  - Origin: `docs/specs/documents-module/00-product-decisions-prd.md:231`

### D16 — Deterministic Product Back

- [ ] **KB-OPEN-015** **DOC-00-D16-A** every detail route in DOC-14 names its `backHref`.
  - Origin: `docs/specs/documents-module/00-product-decisions-prd.md:245`

### D17 — Universal Read Drops `RequireModule` on Read Surfaces

- [ ] **KB-OPEN-016** **DOC-00-D17-A** read `page.tsx` files no longer wrap `RequireModule`; tests assert an active member with KB module off can still open Wiki Home and a permitted page.
  - Origin: `docs/specs/documents-module/00-product-decisions-prd.md:260`

### D18 — Record ACL Denial Is 404; Route Denial Is NoPermission

- [ ] **KB-OPEN-017** **DOC-00-D18-A** get-by-id and not-found tests: other-tenant and same-tenant-hidden ids both 404; admin route without key is 403 UI.
  - Origin: `docs/specs/documents-module/00-product-decisions-prd.md:275`

### D19 — Reviews Use Derived Overdue, Not Persisted Expired

- [ ] **KB-OPEN-018** **DOC-00-D19-A** Reviews Select includes Overdue; no `expired` status written to the database.
  - Origin: `docs/specs/documents-module/00-product-decisions-prd.md:287`

### D20 — Analytics Uses Canonical Visibility

- [ ] **KB-OPEN-019** **DOC-00-D20-A** overview/gaps leak no title outside ACL; Insights query uses `gapKind`.
  - Origin: `docs/specs/documents-module/00-product-decisions-prd.md:302`

### D21 — `/ask` Is Not a Product

- [ ] **KB-OPEN-020** **DOC-00-D21-A** `/ask` redirects; grep shows no Ask panel import outside `features/wiki`.
  - Origin: `docs/specs/documents-module/00-product-decisions-prd.md:313`

### D22 — Drafts, Tokens, Notifications, Owner Key

- [ ] **KB-OPEN-021** **DOC-00-D22-A** no page body in Web Storage; owner mutate gated on manage; P0 public tests are valid vs revoked only.
  - Origin: `docs/specs/documents-module/00-product-decisions-prd.md:331`

## 01-route-navigation-prd.md

Former source: `docs/specs/documents-module/01-route-navigation-prd.md`

### Acceptance

- [ ] **KB-OPEN-022** Zero navigation, card, citation, or empty-state link reaches a missing file route.
  - Origin: `docs/specs/documents-module/01-route-navigation-prd.md:124`
- [ ] **KB-OPEN-023** Every detail page has a deterministic `backHref` from the table above.
  - Origin: `docs/specs/documents-module/01-route-navigation-prd.md:126`
- [ ] **KB-OPEN-024** Denied admin URLs render `NoPermissionState`, not 404 or empty success.
  - Origin: `docs/specs/documents-module/01-route-navigation-prd.md:127`
- [ ] **KB-OPEN-025** `frontend/PAGES.md` and root `PAGES.md` agree with the shipped tree.
  - Origin: `docs/specs/documents-module/01-route-navigation-prd.md:128`

### Loading / Error Coverage

- [ ] **KB-OPEN-026** **DOC-01-001** Add `/knowledge-base` → `/knowledge/wiki` in `frontend/next.config.ts`. Verify `/kb` and `/docs` still redirect.
  - Origin: `docs/specs/documents-module/01-route-navigation-prd.md:83`
- [ ] **KB-OPEN-027** **DOC-01-002** Rewrite root `PAGES.md:470-472` to match `frontend/PAGES.md`. Remove `/recent`, `/favorites`, `/settings` as routes. Document `/knowledge` redirect and `/kb` / `/docs`.
  - Origin: `docs/specs/documents-module/01-route-navigation-prd.md:85`
- [ ] **KB-OPEN-028** **DOC-01-003** Add `/knowledge` and alias rows to `frontend/PAGES.md`.
  - Origin: `docs/specs/documents-module/01-route-navigation-prd.md:88`
- [ ] **KB-OPEN-029** **DOC-01-004** Grep both repos for `knowledge/wiki/recent`, `favorites`, `settings`, `knowledge-base` hrefs after the redirect lands. Zero stale callers except the redirect and this PRD.
  - Origin: `docs/specs/documents-module/01-route-navigation-prd.md:89`
- [ ] **KB-OPEN-030** **DOC-01-005** Mobile wiki Drawer (DOC-03) so Library / Manage / Trash / Quick find are reachable below `md`.
  - Origin: `docs/specs/documents-module/01-route-navigation-prd.md:92`
- [ ] **KB-OPEN-031** **DOC-01-006** Permission-filter every wiki nav item (DOC-03). No Templates / Import / Spaces list / Trash link without the matching key.
  - Origin: `docs/specs/documents-module/01-route-navigation-prd.md:94`
- [ ] **KB-OPEN-032** **DOC-01-007** Align Trash: members who can view deleted pages they own may open Trash; purge/empty requires `kb:pages:purge`. Route access must not 403 a restore-capable author.
  - Origin: `docs/specs/documents-module/01-route-navigation-prd.md:96`
- [ ] **KB-OPEN-033** **DOC-01-008** Replace Reviews / Import / Shared / Private / Spaces denied-as-empty with `NoPermissionState` or `ErrorState` + retry.
  - Origin: `docs/specs/documents-module/01-route-navigation-prd.md:99`
- [ ] **KB-OPEN-034** **DOC-01-009** Add Help centre to Documents product nav (`kb:articles:view`). Add research-briefs child or the moved P1 route.
  - Origin: `docs/specs/documents-module/01-route-navigation-prd.md:101`
- [ ] **KB-OPEN-035** **DOC-01-010** Build wiki home: `backHref` to the project overview when `projectId` is set.
  - Origin: `docs/specs/documents-module/01-route-navigation-prd.md:103`
- [ ] **KB-OPEN-036** **DOC-01-011** Full search route `/knowledge/wiki/search` (DOC-02, DOC-04) with `backHref` to Wiki Home.
  - Origin: `docs/specs/documents-module/01-route-navigation-prd.md:105`
- [ ] **KB-OPEN-037** **DOC-01-012** Browser proof: every KEEP/ADD path in DOC-02 at 375 / 768 / 1280, including aliases, a bogus `pageId`, a denied admin URL, and browser Back from history → page → wiki.
  - Origin: `docs/specs/documents-module/01-route-navigation-prd.md:107`
- [ ] **KB-OPEN-038** **DOC-01-013** Redirect `/ask` → `/knowledge/chat`; delete the orphan page after callers move (D21).
  - Origin: `docs/specs/documents-module/01-route-navigation-prd.md:110`
- [ ] **KB-OPEN-039** **DOC-01-014** `notFound()` on non-finite `spaceId` / `pageId` / `briefId`.
  - Origin: `docs/specs/documents-module/01-route-navigation-prd.md:112`
- [ ] **KB-OPEN-040** **DOC-01-015** `KbPageNotFound` off-ramps are Wiki Home only (D18).
  - Origin: `docs/specs/documents-module/01-route-navigation-prd.md:114`
- [ ] **KB-OPEN-041** **DOC-01-016** Space detail backHref respects `kb:spaces:view`.
  - Origin: `docs/specs/documents-module/01-route-navigation-prd.md:115`
- [ ] **KB-OPEN-042** **DOC-01-017** Share popover does not copy a `/wiki/` URL without a token.
  - Origin: `docs/specs/documents-module/01-route-navigation-prd.md:116`
- [ ] **KB-OPEN-043** **DOC-01-018** Drop `RequireModule` on read surfaces (D17).
  - Origin: `docs/specs/documents-module/01-route-navigation-prd.md:118`
- [ ] **KB-OPEN-044** **DOC-01-019** Add `/build/[projectId]/wiki/[pageId]/history` so project chrome is preserved.
  - Origin: `docs/specs/documents-module/01-route-navigation-prd.md:119`

## 02-page-inventory-prd.md

Former source: `docs/specs/documents-module/02-page-inventory-prd.md`

### Acceptance

- [ ] **KB-OPEN-045** Disposition table accounts for every current `page.tsx` under `knowledge/**`, `kb/`, `docs/`, `wiki/[shareToken]`, `build/[projectId]/wiki/**`, and `support/kb/**`.
  - Origin: `docs/specs/documents-module/02-page-inventory-prd.md:165`
- [ ] **KB-OPEN-046** Every KEEP/ADD has a DOC-14 catalog row.
  - Origin: `docs/specs/documents-module/02-page-inventory-prd.md:168`
- [ ] **KB-OPEN-047** DO NOT CREATE routes are absent from nav, PAGES, and tests.
  - Origin: `docs/specs/documents-module/02-page-inventory-prd.md:169`

### Page Anatomy Contract (every KEEP / ADD)

- [ ] **KB-OPEN-048** **DOC-02-001** every KEEP and ADD page has a matching DOC-14 row.
  - Origin: `docs/specs/documents-module/02-page-inventory-prd.md:38`

### Todos

- [ ] **KB-OPEN-049** **DOC-02-002** Relabel Private → My pages in sidebar, `PageWrapper` title, empty states, and `frontend/PAGES.md`.
  - Origin: `docs/specs/documents-module/02-page-inventory-prd.md:150`
- [ ] **KB-OPEN-050** **DOC-02-003** Implement `/knowledge/wiki/search` (P0) per DOC-04 / DOC-14.
  - Origin: `docs/specs/documents-module/02-page-inventory-prd.md:152`
- [ ] **KB-OPEN-051** **DOC-02-004** Implement `/knowledge/wiki/manage` (P1) per DOC-10 / DOC-14.
  - Origin: `docs/specs/documents-module/02-page-inventory-prd.md:153`
- [ ] **KB-OPEN-052** **DOC-02-005** Move research briefs (P1) and delete Support routes after callers migrate. No dual URLs.
  - Origin: `docs/specs/documents-module/02-page-inventory-prd.md:154`
- [ ] **KB-OPEN-053** **DOC-02-006** Add Help centre to Documents nav (DOC-01-009) without merging article and page models (D01).
  - Origin: `docs/specs/documents-module/02-page-inventory-prd.md:156`
- [ ] **KB-OPEN-054** **DOC-02-007** Confirm zero callers before any REMOVE. Prove with knip plus `next build` / `nest build` for side-effect imports.
  - Origin: `docs/specs/documents-module/02-page-inventory-prd.md:158`
- [ ] **KB-OPEN-055** **DOC-02-008** Update `frontend/PAGES.md` only after each route’s measured behavior is true.
  - Origin: `docs/specs/documents-module/02-page-inventory-prd.md:160`

## 03-sidebar-ia-prd.md

Former source: `docs/specs/documents-module/03-sidebar-ia-prd.md`

### Acceptance

- [ ] **KB-OPEN-056** No nav link predicts Access Denied.
  - Origin: `docs/specs/documents-module/03-sidebar-ia-prd.md:147`
- [ ] **KB-OPEN-057** Mobile and desktop expose the same permitted destinations.
  - Origin: `docs/specs/documents-module/03-sidebar-ia-prd.md:148`
- [ ] **KB-OPEN-058** No new sidebar primitive that duplicates `Drawer` / `PageWrapper` / filter constants.
  - Origin: `docs/specs/documents-module/03-sidebar-ia-prd.md:149`

### Todos

- [ ] **KB-OPEN-059** **DOC-03-001** Single destination factory consumed by `WikiSidebarNav`, mobile Drawer, product sidebar (Documents group), and command-palette Documents section. No parallel arrays.
  - Origin: `docs/specs/documents-module/03-sidebar-ia-prd.md:127`
- [ ] **KB-OPEN-060** **DOC-03-002** Gate every Manage / Library admin item on the exact key. Hide an empty Manage group.
  - Origin: `docs/specs/documents-module/03-sidebar-ia-prd.md:130`
- [ ] **KB-OPEN-061** **DOC-03-003** Relabel Private → My pages, Shared → Shared with me.
  - Origin: `docs/specs/documents-module/03-sidebar-ia-prd.md:132`
- [ ] **KB-OPEN-062** **DOC-03-004** Gate New page on `kb:pages:create`. Hide collapsed and expanded create chrome when denied.
  - Origin: `docs/specs/documents-module/03-sidebar-ia-prd.md:133`
- [ ] **KB-OPEN-063** **DOC-03-005** Mobile Drawer mirroring the desktop rail, including Quick find and Trash.
  - Origin: `docs/specs/documents-module/03-sidebar-ia-prd.md:135`
- [ ] **KB-OPEN-064** **DOC-03-006** Add Help centre (and briefs, while they live under Support) to the Documents product group.
  - Origin: `docs/specs/documents-module/03-sidebar-ia-prd.md:137`
- [ ] **KB-OPEN-065** **DOC-03-007** `sidebar-permission-coverage` (or wiki-specific sibling) fails if a non-universal wiki destination lacks `requiredPermission`.
  - Origin: `docs/specs/documents-module/03-sidebar-ia-prd.md:139`
- [ ] **KB-OPEN-066** **DOC-03-008** Browser proof: member with only page view sees Ask KB, Wiki, My pages, Shared, Quick find, Trash (own deletes only); manager sees Manage items; mobile can reach every permitted item.
  - Origin: `docs/specs/documents-module/03-sidebar-ia-prd.md:141`

## 04-discovery-filters-views-prd.md

Former source: `docs/specs/documents-module/04-discovery-filters-views-prd.md`

### Acceptance

- [ ] **KB-OPEN-067** No list page client-filters a capped tree and calls it the result set.
  - Origin: `docs/specs/documents-module/04-discovery-filters-views-prd.md:163`
- [ ] **KB-OPEN-068** Every P0 filter is URL-shareable and server-enforced.
  - Origin: `docs/specs/documents-module/04-discovery-filters-views-prd.md:164`
- [ ] **KB-OPEN-069** Every unbounded collection has a completion path (`hasMore` or a documented section cap).
  - Origin: `docs/specs/documents-module/04-discovery-filters-views-prd.md:165`

### Todos

- [ ] **KB-OPEN-070** **DOC-04-001** `GET /kb/pages` (or equivalent) list contract: `q`, `status`, `spaceId`, `ownerMembershipId`, `sharedWithMe`, `deleted`, `cursor`, `limit`, projected columns, `hasMore`. Stop using the tree as a list API.
  - Origin: `docs/specs/documents-module/04-discovery-filters-views-prd.md:134`
- [ ] **KB-OPEN-071** **DOC-04-002** Wiki Home, My pages, Shared, Spaces, Trash, Templates gain `FILTER_TOOLBAR_ROW` + URL state.
  - Origin: `docs/specs/documents-module/04-discovery-filters-views-prd.md:138`
- [ ] **KB-OPEN-072** **DOC-04-003** Reviews filters in URL; add derived **overdue** (D19); pass `pagination` into `DataTable`.
  - Origin: `docs/specs/documents-module/04-discovery-filters-views-prd.md:140`
- [ ] **KB-OPEN-073** **DOC-04-013** Replace mention typeahead’s full `/chat/users` dump with a bounded people search.
  - Origin: `docs/specs/documents-module/04-discovery-filters-views-prd.md:142`
- [ ] **KB-OPEN-074** **DOC-04-004** Analytics date range + optional `spaceId` wired to existing DTO.
  - Origin: `docs/specs/documents-module/04-discovery-filters-views-prd.md:144`
- [ ] **KB-OPEN-075** **DOC-04-005** Full search page + Quick find “View all results.”
  - Origin: `docs/specs/documents-module/04-discovery-filters-views-prd.md:146`
- [ ] **KB-OPEN-076** **DOC-04-006** Replace silent caps with cursor + `hasMore` UI on trash, reviews, templates, jobs, spaces.
  - Origin: `docs/specs/documents-module/04-discovery-filters-views-prd.md:147`
- [ ] **KB-OPEN-077** **DOC-04-007** Tree: truncation signal + lazy children; never claim the 2000th node is the end without saying so.
  - Origin: `docs/specs/documents-module/04-discovery-filters-views-prd.md:149`
- [ ] **KB-OPEN-078** **DOC-04-008** Import history: delete client-side page slice; use server cursor.
  - Origin: `docs/specs/documents-module/04-discovery-filters-views-prd.md:151`
- [ ] **KB-OPEN-079** **DOC-04-009** View toggle where DOC-14 allows more than one view.
  - Origin: `docs/specs/documents-module/04-discovery-filters-views-prd.md:153`
- [ ] **KB-OPEN-080** **DOC-04-010** Facet/options endpoint for space and owner (can ship enums-only in P0).
  - Origin: `docs/specs/documents-module/04-discovery-filters-views-prd.md:154`
- [ ] **KB-OPEN-081** **DOC-04-011** Indexes for list sorts: `(org_id, updated_at desc, id desc)` and `(org_id, space_id)` on `kb_pages` (DOC-07).
  - Origin: `docs/specs/documents-module/04-discovery-filters-views-prd.md:156`
- [ ] **KB-OPEN-082** **DOC-04-012** Tests: filter + page reset; ACL hides unauthorized facet values; changing space clears an inaccessible owner.
  - Origin: `docs/specs/documents-module/04-discovery-filters-views-prd.md:158`

## 05-cards-bulk-actions-prd.md

Former source: `docs/specs/documents-module/05-cards-bulk-actions-prd.md`

### Acceptance

- [ ] **KB-OPEN-083** A member without update never sees edit/delete/move on a card.
  - Origin: `docs/specs/documents-module/05-cards-bulk-actions-prd.md:166`
- [ ] **KB-OPEN-084** Bulk of 3 allowed + 2 denied pages reports 3/2 and mutates only the 3.
  - Origin: `docs/specs/documents-module/05-cards-bulk-actions-prd.md:167`
- [ ] **KB-OPEN-085** Space archive never hard-deletes.
  - Origin: `docs/specs/documents-module/05-cards-bulk-actions-prd.md:168`

### Todos

- [ ] **KB-OPEN-086** **DOC-05-001** Extend `WikiPageCard` with a permission-filtered `•••` menu (favorite, copy link, share, duplicate, move, archive, delete). Actions sit **outside** the card `<Link>`.
  - Origin: `docs/specs/documents-module/05-cards-bulk-actions-prd.md:144`
- [ ] **KB-OPEN-087** **DOC-05-002** Show status / verified / private badges on Home and My pages cards, not only Shared.
  - Origin: `docs/specs/documents-module/05-cards-bulk-actions-prd.md:147`
- [ ] **KB-OPEN-088** **DOC-05-003** Tree favorite is a toggle; fix `isFavorite`.
  - Origin: `docs/specs/documents-module/05-cards-bulk-actions-prd.md:149`
- [ ] **KB-OPEN-089** **DOC-05-004** Gate toolbar Move on `kb:pages:update`, Export on `kb:pages:export`.
  - Origin: `docs/specs/documents-module/05-cards-bulk-actions-prd.md:150`
- [ ] **KB-OPEN-090** **DOC-05-005** Space card: stop nesting buttons in `<Link>`; replace Delete with archive/restore (D06).
  - Origin: `docs/specs/documents-module/05-cards-bulk-actions-prd.md:152`
- [ ] **KB-OPEN-091** **DOC-05-006** Trash → `DataTable` + `selection` + `mobileCard` + bulk restore / purge.
  - Origin: `docs/specs/documents-module/05-cards-bulk-actions-prd.md:154`
- [ ] **KB-OPEN-092** **DOC-05-007** Reviews `selection` + bulk approve/reject with note/ reason validation (DOC-06).
  - Origin: `docs/specs/documents-module/05-cards-bulk-actions-prd.md:156`
- [ ] **KB-OPEN-093** **DOC-05-008** Backend `POST /kb/pages/bulk` (and reviews sibling) with e2e allow / deny / partial / cross-tenant tests.
  - Origin: `docs/specs/documents-module/05-cards-bulk-actions-prd.md:158`
- [ ] **KB-OPEN-094** **DOC-05-009** Full search selection uses the same bulk endpoint.
  - Origin: `docs/specs/documents-module/05-cards-bulk-actions-prd.md:160`
- [ ] **KB-OPEN-095** **DOC-05-010** `rounded-xl` + `CONTENT_PANEL_SOLID` on page and space cards (DOC-09).
  - Origin: `docs/specs/documents-module/05-cards-bulk-actions-prd.md:161`

## 06-forms-validation-prd.md

Former source: `docs/specs/documents-module/06-forms-validation-prd.md`

### Acceptance

- [ ] **KB-OPEN-096** Grep of `frontend/features/wiki` finds no mutation form without a sibling schema.
  - Origin: `docs/specs/documents-module/06-forms-validation-prd.md:231`
- [ ] **KB-OPEN-097** A required field never renders without `*`.
  - Origin: `docs/specs/documents-module/06-forms-validation-prd.md:233`
- [ ] **KB-OPEN-098** Frontend and backend min/max/enum match for every row in this matrix.
  - Origin: `docs/specs/documents-module/06-forms-validation-prd.md:234`

### Todos

- [ ] **KB-OPEN-099** **DOC-06-001** Rewrite `spaces-page-schema.ts` to the matrix; use `EntityFormSheet`; reset on open/id change; labels with `*`.
  - Origin: `docs/specs/documents-module/06-forms-validation-prd.md:209`
- [ ] **KB-OPEN-100** **DOC-06-002** Import paste: `*-schema.ts`, `Title *`, target space/ parent, duplicate policy.
  - Origin: `docs/specs/documents-module/06-forms-validation-prd.md:211`
- [ ] **KB-OPEN-101** **DOC-06-003** Align note max with API (200,000); add optional space.
  - Origin: `docs/specs/documents-module/06-forms-validation-prd.md:213`
- [ ] **KB-OPEN-102** **DOC-06-004** Move dialog Zod + descendant error from API.
  - Origin: `docs/specs/documents-module/06-forms-validation-prd.md:214`
- [ ] **KB-OPEN-103** **DOC-06-005** Metadata sheet: sibling schema, `ownerMembershipId`, interval 1–365, `kb:pages:update` gate.
  - Origin: `docs/specs/documents-module/06-forms-validation-prd.md:215`
- [ ] **KB-OPEN-104** **DOC-06-006** Review dialogs via `EntityFormDialog` + Zod max 2,000.
  - Origin: `docs/specs/documents-module/06-forms-validation-prd.md:217`
- [ ] **KB-OPEN-105** **DOC-06-007** Template save, comments, conversation rename, tree rename, record links, retention — each a `*-schema.ts` + matching DTO.
  - Origin: `docs/specs/documents-module/06-forms-validation-prd.md:218`
- [ ] **KB-OPEN-106** **DOC-06-008** Strip `chatHistoryRetentionDays` from the FE settings contract.
  - Origin: `docs/specs/documents-module/06-forms-validation-prd.md:220`
- [ ] **KB-OPEN-107** **DOC-06-009** Contract tests: required field 400; optional empty accepted; label/required mismatch fixture; unknown field rejected.
  - Origin: `docs/specs/documents-module/06-forms-validation-prd.md:222`
- [ ] **KB-OPEN-108** **DOC-06-010** UnsavedChangesDialog on space, metadata, import draft, and comment compose when dirty.
  - Origin: `docs/specs/documents-module/06-forms-validation-prd.md:224`
- [ ] **KB-OPEN-109** **DOC-06-011** Direct-share grant schema + API (target membership, access enum, revoke) matching D03.
  - Origin: `docs/specs/documents-module/06-forms-validation-prd.md:226`

## 07-data-performance-prd.md

Former source: `docs/specs/documents-module/07-data-performance-prd.md`

### Acceptance

- [ ] **KB-OPEN-110** Cross-tenant and missing-space-membership denies on list, get, search, ask citation, analytics title, and bulk.
  - Origin: `docs/specs/documents-module/07-data-performance-prd.md:173`
- [ ] **KB-OPEN-111** Named EXPLAIN evidence for DOC-07-021–025.
  - Origin: `docs/specs/documents-module/07-data-performance-prd.md:175`
- [ ] **KB-OPEN-112** Cache matrix rows have a test or a recorded failure behavior.
  - Origin: `docs/specs/documents-module/07-data-performance-prd.md:176`

### API Work Items (every list/mutation) / Analytics / settings / search

- [ ] **KB-OPEN-113** **DOC-07-017** Analytics: apply canonical visibility on **existing** overview/gaps endpoints (D20). Accept `from`/`to`/`spaceId`. Split page vs leftover article metrics. Reuse or delete overview `trustScore` — do not add a second score. Insights filter `gapKind=ai_no_context`.
  - Origin: `docs/specs/documents-module/07-data-performance-prd.md:80`
- [ ] **KB-OPEN-114** **DOC-07-035** Space list `articleCount` today counts `kb_articles` (`kb-spaces.service.ts:86-97`). Switch to `kb_pages` (or a combined field named honestly). Stop scanning the full page tree on the client (`spaces-page.tsx:35-44`).
  - Origin: `docs/specs/documents-module/07-data-performance-prd.md:85`
- [ ] **KB-OPEN-115** **DOC-07-019** Unify or document `/kb/pages/search` vs `/kb/search`. Wiki full search uses pages search + facets. Help-centre deflection keeps unified search. Align permission keys.
  - Origin: `docs/specs/documents-module/07-data-performance-prd.md:97`

### API Work Items (every list/mutation) / Help centre (dual-run)

- [ ] **KB-OPEN-116** **DOC-07-020** Confirm `GET /kb/articles` applies space + DataScope + restriction predicate on every list path. Fix any skip with a deny test.
  - Origin: `docs/specs/documents-module/07-data-performance-prd.md:103`

### API Work Items (every list/mutation) / Pages

- [ ] **KB-OPEN-117** **DOC-07-001** Add `GET /kb/pages` list (DOC-04-001) with DataScope + `pageVisibleTo` + **space accessibility**. Project `KB_PAGE_LIST_COLUMNS` only.
  - Origin: `docs/specs/documents-module/07-data-performance-prd.md:38`
- [ ] **KB-OPEN-118** **DOC-07-002** Apply space membership inside `pageVisibleTo` (or a single `KbAccessService` used by pages and articles).
  - Origin: `docs/specs/documents-module/07-data-performance-prd.md:41`
- [ ] **KB-OPEN-119** **DOC-07-003** `POST/PATCH /kb/pages` calls `assertSpaceAccessible` when `spaceId` is set.
  - Origin: `docs/specs/documents-module/07-data-performance-prd.md:43`
- [ ] **KB-OPEN-120** **DOC-07-004** `POST /kb/pages/bulk` (DOC-05-008) — max 100 ids, per-id ACL, partial results.
  - Origin: `docs/specs/documents-module/07-data-performance-prd.md:45`
- [ ] **KB-OPEN-121** **DOC-07-005** Tree: lazy children endpoint or `parentId` + cursor; stop silent 2000.
  - Origin: `docs/specs/documents-module/07-data-performance-prd.md:47`
- [ ] **KB-OPEN-122** **DOC-07-006** Trash / search list: cursor, `hasMore`, no silent 100.
  - Origin: `docs/specs/documents-module/07-data-performance-prd.md:49`
- [ ] **KB-OPEN-123** **DOC-07-007** Shared-with-me filter uses share grants, not `createdById <> me`. Add the grant table/query if missing.
  - Origin: `docs/specs/documents-module/07-data-performance-prd.md:50`

### API Work Items (every list/mutation) / Reviews / links / templates / jobs

- [ ] **KB-OPEN-124** **DOC-07-013** Review list joins `pageVisibleTo` like `listDue`. Create review calls `assertPageAccessible`. Cursor pagination.
  - Origin: `docs/specs/documents-module/07-data-performance-prd.md:71`
- [ ] **KB-OPEN-125** **DOC-07-014** Record-link delete loads the source page and `assertPageAccessible`.
  - Origin: `docs/specs/documents-module/07-data-performance-prd.md:73`
- [ ] **KB-OPEN-126** **DOC-07-015** Templates list cursor; drop silent 200.
  - Origin: `docs/specs/documents-module/07-data-performance-prd.md:75`
- [ ] **KB-OPEN-127** **DOC-07-016** Import/export job lists cursor; drop client slice.
  - Origin: `docs/specs/documents-module/07-data-performance-prd.md:76`

### API Work Items (every list/mutation) / Sources / retrieval

- [ ] **KB-OPEN-128** **DOC-07-011** `GET /kb/sources?spaceId=&cursor=` filtered by accessible spaces + creator. Index `(org_id, created_at DESC, id DESC)` and keep `(org_id, space_id)`.
  - Origin: `docs/specs/documents-module/07-data-performance-prd.md:63`
- [ ] **KB-OPEN-129** **DOC-07-012** Ask / page-AI / article-AI / research-brief enqueue require `kb:ai:generate` **and** the read key.
  - Origin: `docs/specs/documents-module/07-data-performance-prd.md:66`

### API Work Items (every list/mutation) / Spaces / members

- [ ] **KB-OPEN-130** **DOC-07-008** `GET /kb/spaces` cursor + `q` + audience; archive status. Cap default 50.
  - Origin: `docs/specs/documents-module/07-data-performance-prd.md:55`
- [ ] **KB-OPEN-131** **DOC-07-009** Archive/restore mutations (no customer hard delete).
  - Origin: `docs/specs/documents-module/07-data-performance-prd.md:57`
- [ ] **KB-OPEN-132** **DOC-07-010** Wire space-members hooks; members list cursor 50; `assertSpaceAccessible` + `kb:spaces:manage`.
  - Origin: `docs/specs/documents-module/07-data-performance-prd.md:58`

### Cache / Invalidation Matrix

- [ ] **KB-OPEN-133** **DOC-07-026** Invalidate `pagesSearch` / unified search on create, rename, delete, visibility, restore, import, migration.
  - Origin: `docs/specs/documents-module/07-data-performance-prd.md:143`
- [ ] **KB-OPEN-134** **DOC-07-027** Include permission version + space membership version in `aclVersion`, not only space ids.
  - Origin: `docs/specs/documents-module/07-data-performance-prd.md:145`
- [ ] **KB-OPEN-135** **DOC-07-028** Space archive/delete invalidates page tree and lists.
  - Origin: `docs/specs/documents-module/07-data-performance-prd.md:147`
- [ ] **KB-OPEN-136** **DOC-07-029** Publish/verify invalidates analytics overview.
  - Origin: `docs/specs/documents-module/07-data-performance-prd.md:148`
- [ ] **KB-OPEN-137** **DOC-07-030** Migration run invalidates wiki **and** support KB keys.
  - Origin: `docs/specs/documents-module/07-data-performance-prd.md:149`
- [ ] **KB-OPEN-138** **DOC-07-031** Writer-matrix tests: scope change, revoked access, rollback, cache unavailable (fail open to network, never stale-allow a revoked page).
  - Origin: `docs/specs/documents-module/07-data-performance-prd.md:150`

### Indexes (close only with EXPLAIN)

- [ ] **KB-OPEN-139** **DOC-07-021** `kb_pages (org_id, updated_at DESC, id DESC)` including `deleted_at` strategy used by the list (partial where needed).
  - Origin: `docs/specs/documents-module/07-data-performance-prd.md:111`
- [ ] **KB-OPEN-140** **DOC-07-022** `kb_pages (org_id, space_id)` (partial `deleted_at is null` if that is the live list).
  - Origin: `docs/specs/documents-module/07-data-performance-prd.md:113`
- [ ] **KB-OPEN-141** **DOC-07-023** Share-grant table indexes leading `org_id` + `membership_id` (after D03 schema).
  - Origin: `docs/specs/documents-module/07-data-performance-prd.md:115`
- [ ] **KB-OPEN-142** **DOC-07-024** `kb_sources (org_id, created_at DESC, id DESC)`.
  - Origin: `docs/specs/documents-module/07-data-performance-prd.md:117`
- [ ] **KB-OPEN-143** **DOC-07-025** Review list index already `(org_id, status, due)` — prove the new visibility join still uses it.
  - Origin: `docs/specs/documents-module/07-data-performance-prd.md:118`

### Permission Catalog

- [ ] **KB-OPEN-144** **DOC-07-032** Copy the missing 13 keys into `frontend/lib/rbac/permissions/kb.ts` (`scopable` flags included).
  - Origin: `docs/specs/documents-module/07-data-performance-prd.md:156`
- [ ] **KB-OPEN-145** **DOC-07-033** CI test: frontend KB names === backend KB names.
  - Origin: `docs/specs/documents-module/07-data-performance-prd.md:158`

### Query Budget

- [ ] **KB-OPEN-146** **DOC-07-034** Rewrite analytics page-stat query if EXPLAIN shows join fan-out.
  - Origin: `docs/specs/documents-module/07-data-performance-prd.md:168`

## 08-architecture-prd.md

Former source: `docs/specs/documents-module/08-architecture-prd.md`

### Acceptance

- [ ] **KB-OPEN-147** One ACL function on every page read path.
  - Origin: `docs/specs/documents-module/08-architecture-prd.md:113`
- [ ] **KB-OPEN-148** One permission catalog pair.
  - Origin: `docs/specs/documents-module/08-architecture-prd.md:114`
- [ ] **KB-OPEN-149** Zero cycles.
  - Origin: `docs/specs/documents-module/08-architecture-prd.md:115`
- [ ] **KB-OPEN-150** Dual-run rules have a cutover owner in DOC-11.
  - Origin: `docs/specs/documents-module/08-architecture-prd.md:116`

### Todos

- [ ] **KB-OPEN-151** **DOC-08-001** Route all page visibility through `KbAccessService` (space + visibility + project + creator + share grant).
  - Origin: `docs/specs/documents-module/08-architecture-prd.md:82`
- [ ] **KB-OPEN-152** **DOC-08-002** Add page-share schema + service used by Shared with me and the Share popover (people, not only visibility enum).
  - Origin: `docs/specs/documents-module/08-architecture-prd.md:84`
- [ ] **KB-OPEN-153** **DOC-08-003** Fix Support gap-draft URL/id mismatch (article vs page).
  - Origin: `docs/specs/documents-module/08-architecture-prd.md:86`
- [ ] **KB-OPEN-154** **DOC-08-004** Deprecate or auth-hide unwired tag / translation / verification endpoints until a page consumes them.
  - Origin: `docs/specs/documents-module/08-architecture-prd.md:87`
- [ ] **KB-OPEN-155** **DOC-08-005** Document citation URL mapping for mixed retrieval.
  - Origin: `docs/specs/documents-module/08-architecture-prd.md:89`
- [ ] **KB-OPEN-156** **DOC-08-006** `pnpm check:cycles` + `:self-test` both repos after the access-service move.
  - Origin: `docs/specs/documents-module/08-architecture-prd.md:90`
- [ ] **KB-OPEN-157** **DOC-08-007** Knip + build before deleting any schema file (`kb_articles` stays until cutover even if knip yells).
  - Origin: `docs/specs/documents-module/08-architecture-prd.md:92`
- [ ] **KB-OPEN-158** **DOC-08-009** Drop `RequireModule` on read surfaces (D17).
  - Origin: `docs/specs/documents-module/08-architecture-prd.md:104`
- [ ] **KB-OPEN-159** **DOC-08-010** Record ACL 404 vs route `NoPermissionState` (D18).
  - Origin: `docs/specs/documents-module/08-architecture-prd.md:105`
- [ ] **KB-OPEN-160** **DOC-08-011** Audit events (append-only) for: visibility, public token rotate/revoke, share grant CRUD, publish/archive, lock, verify, review decide, space archive/members, import/export, purge, migration. Event, actor, tenant, subject, before/after.
  - Origin: `docs/specs/documents-module/08-architecture-prd.md:106`

## 09-visual-hierarchy-prd.md

Former source: `docs/specs/documents-module/09-visual-hierarchy-prd.md`

### Acceptance

- [ ] **KB-OPEN-161** A screenshot (or recorded browser check) shows canvas ≠ card ≠ sheet in light mode.
  - Origin: `docs/specs/documents-module/09-visual-hierarchy-prd.md:119`
- [ ] **KB-OPEN-162** Mobile can open nav, search, metadata, and comments without the desktop rail or `xl` panel.
  - Origin: `docs/specs/documents-module/09-visual-hierarchy-prd.md:121`
- [ ] **KB-OPEN-163** No AP-7 page spinner remains under `features/wiki`.
  - Origin: `docs/specs/documents-module/09-visual-hierarchy-prd.md:123`

### Todos

- [ ] **KB-OPEN-164** **DOC-09-001** Change shared `SheetContent` / `DialogContent` default from `bg-background` to `bg-popover` (repo-wide; verify HR/Build overlays still contrast).
  - Origin: `docs/specs/documents-module/09-visual-hierarchy-prd.md:100`
- [ ] **KB-OPEN-165** **DOC-09-002** Stop overriding metadata sheet chrome back to `bg-background`.
  - Origin: `docs/specs/documents-module/09-visual-hierarchy-prd.md:103`
- [ ] **KB-OPEN-166** **DOC-09-003** Wiki rail `bg-card`; editor sticky opaque; Ask KB composer distinct from thread.
  - Origin: `docs/specs/documents-module/09-visual-hierarchy-prd.md:105`
- [ ] **KB-OPEN-167** **DOC-09-004** `WikiPageCard` `rounded-xl` + `CONTENT_PANEL_SOLID`.
  - Origin: `docs/specs/documents-module/09-visual-hierarchy-prd.md:107`
- [ ] **KB-OPEN-168** **DOC-09-005** Mobile metadata Drawer/Sheet; analytics `mobileCard` or stacked rows; no 7-col overflow.
  - Origin: `docs/specs/documents-module/09-visual-hierarchy-prd.md:108`
- [ ] **KB-OPEN-169** **DOC-09-006** Replace Ask KB page spinner with chat skeletons.
  - Origin: `docs/specs/documents-module/09-visual-hierarchy-prd.md:110`
- [ ] **KB-OPEN-170** **DOC-09-007** Error retry + `NoPermissionState` sweep (DOC-01-008).
  - Origin: `docs/specs/documents-module/09-visual-hierarchy-prd.md:111`
- [ ] **KB-OPEN-171** **DOC-09-008** Expand axe coverage: wiki home, page editor, sidebar, search, trash table, one sheet.
  - Origin: `docs/specs/documents-module/09-visual-hierarchy-prd.md:112`
- [ ] **KB-OPEN-172** **DOC-09-009** Browser proof light/dark at 375/768/1280 for Home, page, Share popover, metadata sheet, Confirm delete, mobile Drawer.
  - Origin: `docs/specs/documents-module/09-visual-hierarchy-prd.md:114`

## 10-competitor-parity-prd.md

Former source: `docs/specs/documents-module/10-competitor-parity-prd.md`

### Acceptance

- [ ] **KB-OPEN-173** P0 column “Add” is evidenced in DOC-11.
  - Origin: `docs/specs/documents-module/10-competitor-parity-prd.md:142`
- [ ] **KB-OPEN-174** No P2 surface shipped as if it were P0.
  - Origin: `docs/specs/documents-module/10-competitor-parity-prd.md:143`

### Todos

- [ ] **KB-OPEN-175** **DOC-10-001** P0 table is the release bar; do not slip P2 databases into P0.
  - Origin: `docs/specs/documents-module/10-competitor-parity-prd.md:131`
- [ ] **KB-OPEN-176** **DOC-10-002** Implement search, shares, card menus, trash table, mobile nav, overlay tokens, space archive (owners: DOC-01–09).
  - Origin: `docs/specs/documents-module/10-competitor-parity-prd.md:133`
- [ ] **KB-OPEN-177** **DOC-10-003** P1 Manage + Ask Insights + members + briefs move — separate launch after P0 evidence.
  - Origin: `docs/specs/documents-module/10-competitor-parity-prd.md:135`
- [ ] **KB-OPEN-178** **DOC-10-004** Record any newly requested Notion/Coda feature as P2 in this file before building it.
  - Origin: `docs/specs/documents-module/10-competitor-parity-prd.md:137`

## 11-release-verification-prd.md

Former source: `docs/specs/documents-module/11-release-verification-prd.md`

### Checks / Browser

- [ ] **KB-OPEN-179** **DOC-11-007** Authenticated non-empty org, 375/768/1280, light/dark, journeys 1–9. Record what was not run.
  - Origin: `docs/specs/documents-module/11-release-verification-prd.md:66`
- [ ] **KB-OPEN-180** **DOC-11-008** Axe on Home, editor, search, trash, one sheet.
  - Origin: `docs/specs/documents-module/11-release-verification-prd.md:68`

### Checks / Cutover (articles → pages) — separate gate

- [ ] **KB-OPEN-181** **DOC-11-011** Migration preview/run on disposable data; citation URLs; support gap flow writes pages; `/support/kb` deleted only after zero article writes; public `/help` re-pointed or kept as a renderer.
  - Origin: `docs/specs/documents-module/11-release-verification-prd.md:92`

### Checks / Database

- [ ] **KB-OPEN-182** **DOC-11-005** EXPLAIN (ANALYZE, BUFFERS) for list, search FTS, sources, reviews join — recorded in DOC-07 evidence.
  - Origin: `docs/specs/documents-module/11-release-verification-prd.md:59`
- [ ] **KB-OPEN-183** **DOC-11-006** Share-grant and space-archive migrations applied on the named disposable env; rollback script reviewed.
  - Origin: `docs/specs/documents-module/11-release-verification-prd.md:61`

### Checks / Disaster recovery (P0 product, not only migration)

- [ ] **KB-OPEN-184** **DOC-11-012** Restore drill: database + object storage for page media/sources; pages render; signed URLs re-issue; search index rebuild job run; attachments consistent with DB rows.
  - Origin: `docs/specs/documents-module/11-release-verification-prd.md:82`
- [ ] **KB-OPEN-185** **DOC-11-013** Retention matrix recorded: conversations, `kb_events`, import/export artifacts, sources, public tokens, audit rows, in-memory drafts. Default, hard bound, deletion/anonymize, legal-hold, owning job. Trash retention stays 1–365 days.
  - Origin: `docs/specs/documents-module/11-release-verification-prd.md:85`

### Checks / Docs / catalog

- [ ] **KB-OPEN-186** **DOC-11-009** `frontend/PAGES.md` + root `PAGES.md` match shipped routes. DOC-14 rows checked with evidence level.
  - Origin: `docs/specs/documents-module/11-release-verification-prd.md:72`
- [ ] **KB-OPEN-187** **DOC-11-010** Residual risks listed (silent tree more-than-200, leftover articles, P1 Manage unshipped, etc.).
  - Origin: `docs/specs/documents-module/11-release-verification-prd.md:74`

### Checks / Types / contracts / cycles

- [ ] **KB-OPEN-188** **DOC-11-001** Focused frontend tests for wiki nav, shares, search URL, bulk partial, form requiredness.
  - Origin: `docs/specs/documents-module/11-release-verification-prd.md:50`
- [ ] **KB-OPEN-189** **DOC-11-002** Backend e2e: allow/deny/cross-tenant on list, get, search, ask citation, bulk, sources, analytics titles.
  - Origin: `docs/specs/documents-module/11-release-verification-prd.md:52`
- [ ] **KB-OPEN-190** **DOC-11-003** `pnpm check:cycles` + `:self-test` both repos.
  - Origin: `docs/specs/documents-module/11-release-verification-prd.md:54`
- [ ] **KB-OPEN-191** **DOC-11-004** Permission-catalog drift test green.
  - Origin: `docs/specs/documents-module/11-release-verification-prd.md:55`

### P1 Journeys (full program, not P0)

- [ ] **KB-OPEN-192** **DOC-11-P1-A** Content management health presets + bulk owner/verify.
  - Origin: `docs/specs/documents-module/11-release-verification-prd.md:37`
- [ ] **KB-OPEN-193** **DOC-11-P1-B** Ask Insights assign/dismiss/solve (`gapKind=ai_no_context`).
  - Origin: `docs/specs/documents-module/11-release-verification-prd.md:38`
- [ ] **KB-OPEN-194** **DOC-11-P1-C** Research briefs under `/knowledge/wiki/research-briefs`.
  - Origin: `docs/specs/documents-module/11-release-verification-prd.md:39`
- [ ] **KB-OPEN-195** **DOC-11-P1-D** Space members sheet.
  - Origin: `docs/specs/documents-module/11-release-verification-prd.md:40`
- [ ] **KB-OPEN-196** **DOC-11-P1-E** Review overdue SLA (derived overdue + notify).
  - Origin: `docs/specs/documents-module/11-release-verification-prd.md:41`
- [ ] **KB-OPEN-197** **DOC-11-P1-F** Share/comment/review notifications (D22).
  - Origin: `docs/specs/documents-module/11-release-verification-prd.md:42`
- [ ] **KB-OPEN-198** **DOC-11-P1-G** HTML/ZIP import completeness.
  - Origin: `docs/specs/documents-module/11-release-verification-prd.md:43`
- [ ] **KB-OPEN-199** **DOC-11-P1-H** Public helpful/not-helpful.
  - Origin: `docs/specs/documents-module/11-release-verification-prd.md:44`

## 14-page-catalog-prd.md

Former source: `docs/specs/documents-module/14-page-catalog-prd.md`

### Catalog Completeness

- [ ] **KB-OPEN-200** **DOC-14-001** Every `page.tsx` under the in-scope trees appears above (KEEP / ADD / MOVE / BOUNDARY).
  - Origin: `docs/specs/documents-module/14-page-catalog-prd.md:398`
- [ ] **KB-OPEN-201** **DOC-14-002** Each KEEP/ADD row has browser evidence at 375/768/1280 before DOC-11 P0 (P1 rows excepted).
  - Origin: `docs/specs/documents-module/14-page-catalog-prd.md:400`

### DOC-14-A — Ask KB `/knowledge/chat`

- [ ] **KB-OPEN-202** **DOC-14-A-001** AI permission + source ACL + composer contrast + skeletons (DOC-07-012, DOC-09-006).
  - Origin: `docs/specs/documents-module/14-page-catalog-prd.md:29`

### DOC-14-B — Wiki Home `/knowledge/wiki`

- [ ] **KB-OPEN-203** **DOC-14-B-001** Stop rendering “All pages” from the raw tree.
  - Origin: `docs/specs/documents-module/14-page-catalog-prd.md:50`
- [ ] **KB-OPEN-204** **DOC-14-B-002** Filter toolbar + card menu + badges.
  - Origin: `docs/specs/documents-module/14-page-catalog-prd.md:51`

### DOC-14-C — My pages `/knowledge/wiki/private`

- [ ] **KB-OPEN-205** **DOC-14-C-001** Replace `visibility === "private"` client filter.
  - Origin: `docs/specs/documents-module/14-page-catalog-prd.md:69`

### DOC-14-D — Shared with me `/knowledge/wiki/shared`

- [ ] **KB-OPEN-206** **DOC-14-D-001** Replace `createdById !== myId`. Needs share grants (DOC-08-002).
  - Origin: `docs/specs/documents-module/14-page-catalog-prd.md:87`

### DOC-14-E — Spaces list `/knowledge/wiki/spaces`

- [ ] **KB-OPEN-207** **DOC-14-E-001** Archive lifecycle + search + pagination + a11y.
  - Origin: `docs/specs/documents-module/14-page-catalog-prd.md:107`

### DOC-14-F — Space detail `/knowledge/wiki/spaces/[spaceId]`

- [ ] **KB-OPEN-208** **DOC-14-F-001** In-space search + members sheet + ErrorState retry.
  - Origin: `docs/specs/documents-module/14-page-catalog-prd.md:125`

### DOC-14-G — Page `/knowledge/wiki/doc/[pageId]`

- [ ] **KB-OPEN-209** **DOC-14-G-001** Gate Move/Export; mobile metadata; owner membership id; required/optional labels on metadata.
  - Origin: `docs/specs/documents-module/14-page-catalog-prd.md:145`

### DOC-14-H — History `/knowledge/wiki/doc/[pageId]/history`

- [ ] **KB-OPEN-210** **DOC-14-H-001** Confirm restore uses `LoadingButton` + revision guard.
  - Origin: `docs/specs/documents-module/14-page-catalog-prd.md:161`

### DOC-14-I — Templates `/knowledge/wiki/templates`

- [ ] **KB-OPEN-211** **DOC-14-I-001** Search + cursor + split permission (starters vs manage).
  - Origin: `docs/specs/documents-module/14-page-catalog-prd.md:181`

### DOC-14-J — Reviews `/knowledge/wiki/reviews`

- [ ] **KB-OPEN-212** **DOC-14-J-001** URL filters, derived overdue, pagination, bulk, denied UX.
  - Origin: `docs/specs/documents-module/14-page-catalog-prd.md:202`

### DOC-14-K — Import & Export `/knowledge/wiki/import`

- [ ] **KB-OPEN-213** **DOC-14-K-001** Tab permission split + Zod paste + server job pager.
  - Origin: `docs/specs/documents-module/14-page-catalog-prd.md:221`

### DOC-14-L — Analytics `/knowledge/wiki/analytics`

- [ ] **KB-OPEN-214** **DOC-14-L-001** Range + space ACL + pagination + `formatShortDate`.
  - Origin: `docs/specs/documents-module/14-page-catalog-prd.md:239`

### DOC-14-M — Trash `/knowledge/wiki/trash`

- [ ] **KB-OPEN-215** **DOC-14-M-001** Table + bulk + search + honest pager + Zod retention.
  - Origin: `docs/specs/documents-module/14-page-catalog-prd.md:258`

### DOC-14-N — Full search `/knowledge/wiki/search` **ADD P0**

- [ ] **KB-OPEN-216** **DOC-14-N-001** Route, page, facets, bulk, Quick find link.
  - Origin: `docs/specs/documents-module/14-page-catalog-prd.md:277`

### DOC-14-O — Content management `/knowledge/wiki/manage` **ADD P1**

- [ ] **KB-OPEN-217** **DOC-14-O-001** Ship only after P0 list/bulk APIs exist.
  - Origin: `docs/specs/documents-module/14-page-catalog-prd.md:296`

### DOC-14-P — Research briefs **ADD/MOVE P1**

- [ ] **KB-OPEN-218** **DOC-14-P-001** Move + nav + delete old routes.
  - Origin: `docs/specs/documents-module/14-page-catalog-prd.md:312`

### DOC-14-Q — Build wiki

- [ ] **KB-OPEN-219** **DOC-14-Q-001** Project ACL on every list/get; no org-wide leak.
  - Origin: `docs/specs/documents-module/14-page-catalog-prd.md:323`
- [ ] **KB-OPEN-220** **DOC-14-Q-002** Home back control when `projectId` set.
  - Origin: `docs/specs/documents-module/14-page-catalog-prd.md:324`

### DOC-14-Q addendum — project history

- [ ] **KB-OPEN-221** **DOC-14-Q-003** `/build/[projectId]/wiki/[pageId]/history` exists (DOC-01-019).
  - Origin: `docs/specs/documents-module/14-page-catalog-prd.md:384`

### DOC-14-R — Help centre (dual-run)

- [ ] **KB-OPEN-222** **DOC-14-R-001** Nav discoverability (DOC-01-009).
  - Origin: `docs/specs/documents-module/14-page-catalog-prd.md:336`
- [ ] **KB-OPEN-223** **DOC-14-R-002** Citation URLs never point a page id at `/support/kb` or an article id at `/knowledge/wiki/doc/`.
  - Origin: `docs/specs/documents-module/14-page-catalog-prd.md:337`

### DOC-14-S — Public wiki `/wiki/[shareToken]`

- [ ] **KB-OPEN-224** **DOC-14-S-001** Token invalid = 404; no private chrome leak.
  - Origin: `docs/specs/documents-module/14-page-catalog-prd.md:352`

### DOC-14-T — Aliases

- [ ] **KB-OPEN-225** **DOC-14-T-001** `/knowledge-base` and `/ask` redirects exist.
  - Origin: `docs/specs/documents-module/14-page-catalog-prd.md:365`

### DOC-14-V — Ask KB sources (sheet, not a route)

- [ ] **KB-OPEN-226** **DOC-14-V-001** Sources sheet uses space-scoped API; note form matches DOC-06.
  - Origin: `docs/specs/documents-module/14-page-catalog-prd.md:379`

## 06-code-removal-and-reuse.md

Former source: `docs/specs/knowledge-base/06-code-removal-and-reuse.md`

### Deletion blockers — source rechecked September 27

- [ ] **KB-OPEN-227** Retain the S15 contradiction/evidence requirement until a reachable, bounded, permission-safe producer and discovery-to-inbox test exist, or the product owner explicitly defers that preset. Test new evidence, tenant isolation, dismissal and resolution; a test that seeds a health row proves only its consumer. **STANDING 2026-09-27:** this box closes on one of two events, neither of which has occurred — no producer has shipped, and no deferral has been recorded. It is correctly open and must not be ticked to reduce a count.
  - Origin: `docs/specs/knowledge-base/06-code-removal-and-reuse.md:33`

## 07-delivery-roadmap.md

Former source: `docs/specs/knowledge-base/07-delivery-roadmap.md`

### Release checklist

- [ ] **KB-OPEN-228** Every current/additional route is in `00-current-state-audit.md` and its page contract. **REFUTED 2026-09-27, census now corrected:** three shipped routes were absent from it entirely (`/knowledge/wiki/company-documents` and its `[linkedDocumentId]` detail, `/support/knowledge-gaps`); research briefs shipped at `/knowledge/research-briefs`, not the `/knowledge/wiki/research-briefs` the census specified; and `/knowledge/wiki/search` and `/knowledge/wiki/manage` were still recorded as observed 404s though both now exist. The census rows are fixed; the page contracts for the newly-listed routes are still missing, so this box stays open.
  - Origin: `docs/specs/knowledge-base/07-delivery-roadmap.md:175`
- [ ] **KB-OPEN-229** P0 customer jobs work without AI.
  - Origin: `docs/specs/knowledge-base/07-delivery-roadmap.md:176`
- [ ] **KB-OPEN-230** Detail, list, search, Ask, citations, analytics, exports, attachments, and notifications share authorization semantics.
  - Origin: `docs/specs/knowledge-base/07-delivery-roadmap.md:177`
- [ ] **KB-OPEN-231** Every collection is bounded and signals `hasMore`.
  - Origin: `docs/specs/knowledge-base/07-delivery-roadmap.md:178`
- [ ] **KB-OPEN-232** Expected revision protects content writes; idempotency protects retriable creates/bulk.
  - Origin: `docs/specs/knowledge-base/07-delivery-roadmap.md:179`
- [ ] **KB-OPEN-233** Revocation, restore, purge, queue replay, cache failure, replica lag, and provider outage drills pass. **BLOCKED 2026-09-27:** production is the only database; there is no non-production PostgreSQL to drill against, and a restore/failover rehearsal against production is prohibited. Revocation and cache-failure are unit-testable and partly covered; restore, replica lag and queue replay are not.
  - Origin: `docs/specs/knowledge-base/07-delivery-roadmap.md:180`
- [ ] **KB-OPEN-234** Search relevance and citation correctness meet offline thresholds. **BLOCKED 2026-09-27:** no labelled relevance set exists. Needs a judged query/answer corpus before a threshold means anything; a number without one is unfalsifiable.
  - Origin: `docs/specs/knowledge-base/07-delivery-roadmap.md:181`
- [ ] **KB-OPEN-235** All page states pass keyboard/screen-reader/mobile review. **BLOCKED 2026-09-27:** browser verification is out of scope for these sessions, and jsdom cannot observe focus order, screen-reader output or 375 px layout. Missing accessible descriptions were fixed on nine overlays from source, which is not the same as passing this review.
  - Origin: `docs/specs/knowledge-base/07-delivery-roadmap.md:182`
- [ ] **KB-OPEN-236** SLOs, alerts, runbooks, and cost limits are live before rollout. **BLOCKED 2026-09-27:** requires the deployed environment and an alerting backend; not assertable from this repository.
  - Origin: `docs/specs/knowledge-base/07-delivery-roadmap.md:183`
- [ ] **KB-OPEN-237** Canary rollout has stop/rollback thresholds. **BLOCKED 2026-09-27:** no canary mechanism exists — Railway ships every backend push to production directly. This gate needs a deploy pipeline first.
  - Origin: `docs/specs/knowledge-base/07-delivery-roadmap.md:184`
- [ ] **KB-OPEN-238** Superseded code is removed only after the evidence in `06-code-removal-and-reuse.md`.
  - Origin: `docs/specs/knowledge-base/07-delivery-roadmap.md:185`

## 08-architecture-review-validation-2026-09-27.md

Former source: `docs/specs/knowledge-base/08-architecture-review-validation-2026-09-27.md`

### Actionable TODOs / AV-01 — P0: finish retrieval extraction and restore meaningful tests

- [ ] **KB-OPEN-239** Update production injection, imports, return types and tests to the final retrieval interface. The first audit run had **3 failing suites / 7 failing tests**: embedding TTL, search connection release, passage ACL fence. A later rerun after concurrent edits passed TTL, connection release and retrieval orchestration, but **the passage ACL fence still failed 2 tests** calling a removed method. Run affected Ask/search callers, a Nest registration/DI smoke test and both typechecks after the editing session settles. Do not silence failures or recreate pass-through wrappers to satisfy stale mocks. **The failure list is stale, re-measured 2026-09-27.** `npx jest "kb-query-embedding-ttl|kb-search-connection-release|kb-search-acl-revision-passage-fence|kb-retrieval-facade-reports-channel-failure"` → 4 suites, 20 tests, 0 failing. The "passage ACL fence still failing" state was an intermediate artifact of concurrent editing, not a defect. Production injection now calls the outcome-returning methods; no pass-through wrapper was recreated. Whole module: `npx jest src/modules/kb/` → 282 suites, 2512 tests, 0 failing. **Remaining clauses: the Nest registration/DI smoke test and both typechecks have not been run on this revision** — the box stays open until they are.
  - Origin: `docs/specs/knowledge-base/08-architecture-review-validation-2026-09-27.md:88`

### Actionable TODOs / AV-02 — P0: make container policy consistent and test actual disclosure

- [ ] **KB-OPEN-240** Apply the agreed private-space/project rule to creator, owner, explicit member/role grant and ordinary visibility branches, with any privileged exception explicit. Cover restricted-space grant-only pages and revocation through detail, collection, FTS, vector candidates, prompt passages, citations, attachment download and export. Current SQL property tests are useful but insufficient; execute representative rows under the application DB role. Never authorize prompt content merely because its citation is hidden later. **PARTLY — the rule is now applied; the real-row half is not.** A live gap was found and closed 2026-09-27: `buildIndexedBranch` carried two standalone container clauses added by `fe3d30809` — space membership and project membership — with **no visibility restriction at all**, so every member of a space or project could see `visibility = 'private'` pages inside it. Both now require `visibility IN ('org','public')` (`core/authorization/knowledge-page-scope.ts:115,121`). The creator, owner and created-by-membership clauses are unconditional and the explicit grant arm is a separate branch, so an author still reaches their own private page and a grantee still reaches a granted one — the tightening removes only access derived from container membership. 9 new tests in `knowledge-page-scope.spec.ts`; suite 98 passing. **Open clause: "execute representative rows under the application DB role"** — still unproven. SQL-shape tests cannot stand in for it, and the owner has authorized planting `[e2e]` fixtures inside a rolled-back production transaction to get it.
  - Origin: `docs/specs/knowledge-base/08-architecture-review-validation-2026-09-27.md:93`

### Actionable TODOs / AV-03 — P1: complete the write interface and atomicity proof

- [ ] **KB-OPEN-241** Make a page-change operation own or explicitly require the expected revision, revision increment, audit and outbox in the same transaction. Current `commitPageChange` accepts revisions already calculated by callers and does not write an audit. Replace constructor-injection-only coverage with behavioral checks for create, duplicate, move, restore, import, status/publication, support authoring and empty-content updates. Prove transaction rollback leaves neither a mutation nor an index event, and engagement does not reindex. **PARTLY 2026-09-27.** One real defect found and fixed: the owner-change audit in `wiki/kb-pages.service.ts` ran as `audit.log` (best-effort, fire-and-forget) *outside* the `db.transaction` callback, so a crash between commit and dispatch dropped the audit record silently. It now runs `await this.audit.logCritical(...)` inside the transaction, which is what `common/audit/audit.service.ts:76` says transactional and security audit must use. The stale double in `kb-page-owner-change.spec.ts` declared only `log`; its two negative assertions would have passed vacuously against a method the service no longer calls, so they were re-pointed and a positive control added. New behavioural coverage in `wiki/kb-page-commit-atomicity.spec.ts` (7 tests). The "no provider call holds the transaction open" clause is CONFIRMED: `commitPageChange` defers notifications through `registerAfterCommit`, and `KbPageWriterService` has no embedding, AI or object-store dependency. **Open clauses.** Seven other callers still write no audit at all — `kb-page-status.service.ts` (publish / archive / unarchive), `kb-page-public.service.ts` (setVisibility), `kb-page-tree.service.ts` (move / restore) and `kb-page-versions.service.ts` (restoreVersion). Consolidating them into `commitPageChange` needs an action string threaded through `CommitPageChangeInput`, which every caller must supply. The rollback proof ("neither a mutation nor an index event") is also not yet written.
  - Origin: `docs/specs/knowledge-base/08-architecture-review-validation-2026-09-27.md:98`

### Actionable TODOs / AV-04 — P1: preserve retrieval scope, provenance and failure state

- [ ] **KB-OPEN-242** **PARTLY — ACL revisions done; provider provenance is genuinely absent and cannot be fixed from inside KB.** Persist actual source content/ACL revisions and provider context provenance. **ACL revisions — the claim is stale.** ~~`buildAskSourceRecords` and the original `buildSourceRecords` write `aclRevision: null`.~~ `buildSourceRecords` **does not exist** anywhere in the repo. `buildAskSourceRecords` (`kb-ask-context.ts:61-85`) writes `aclRevision: item.aclRevision ?? null` for `top` items, and the retrieval query really does project it (`kb-search-retrieval.service.ts:250-261`, `aclRevision: kbPages.aclRevision`). `null` for the `sources` and `linked` arms is **correct, not a gap**: `kb_sources` has no `acl_revision` column at all (`db/schema/kb/sources.ts` — verified, no revision column), and linked company documents have no ACL-revision concept. **The `sourceIdsWithRevisions` criticism no longer holds.** `kb-ask-acl-revision.spec.ts` (8 tests) asserts the persisted entry carries the real revision end to end, proves the SQL projection by walking `queryChunks` rather than touching `Column.table` (which would pass vacuously), and pairs the page/article positives with deliberate-null negatives for the source and document arms. **Mutation-tested:** reverting `item.aclRevision ?? null` to `null` fails 5 of 8 — the 3 survivors are exactly the null arms that do not depend on the threading, which is the right signature. **Provider provenance — a real gap, and a live always-null read.** `kb_ai_interactions` has a `provider` column (`db/schema/kb/ai-interactions.ts:42`) that **nothing ever writes**, and `kb-research-brief.handler.ts:117` **selects it**, so every research brief reports `provider: null` forever, indistinguishable from "no provider". It breaks no contract — both schemas declare it `z.string().nullable()` (`kb-retrieval-response.schemas.ts:111`, frontend `kb-research-schema.ts:20`) — and no UI renders it. **A correction to note:** joining `ai_usage_logs` on `gatewayCorrelationId` does **not** recover it — that table has no provider column either (`db/schema/common/ai-usage.ts:4-19`). The provider name is stored nowhere in the database. `model` **is** written (`kb-ask.service.ts:343`), so the provider is inferable from the model string but not recorded. **Why this stays open:** the value does not exist at the KB call site — `AiUsageMeta` (`modules/ai/gateway/ai-gateway.types.ts:9-16`) carries `model` and costs, no provider. Populating it means changing the AI module, which another session owns. **Not attempted.** The two honest options for whoever owns it: add `provider` to `AiUsageMeta` and write it, or drop the column and the always-null field from the brief response.
  - Origin: `docs/specs/knowledge-base/08-architecture-review-validation-2026-09-27.md:131`

### Actionable TODOs / AV-05 — P1: correct embedding-cache isolation and cost behavior

- [ ] **KB-OPEN-243** **PARTLY — the cross-tenant half is fixed and shipped; the metering half needs the AI module.** Replace the global key with the tenant/provider/model/dimension/preprocessing/input contract above. **Tenant separation — was genuinely broken, now fixed.** `CACHE_KEYS.kbQueryEmbedding` was `kb:qembed:${model}:${queryHash}` — no `orgId`, while every neighbouring key in the same file carries one (`search:${orgId}:${userId}:${hash}` two lines above it). That is a direct **BE-123** violation ("never share a cached result across tenants"). Now `kb:qembed:${orgId}:${model}:${queryHash}` (`common/cache/cache-keys.ts:78-79`, `kb-embedding-cache.ts:23-28`). Only one call site existed, so the arity change is contained. **Why it mattered beyond tidiness.** `embedOrDegrade` calls `embedQueryWithCredit` **only on a miss** (`kb-embedding-cache.ts:30-40`), and `/kb/search` carries no credit or rate-limit guard of its own — `kb-search.controller.ts:27-31` is `@RequirePermission("kb:articles:view")` and nothing else. So a cache hit skipped **three** things at once: the credit reservation, the per-org concurrency limiter (`ai-gateway.service.ts:119-123`), and the usage-log row. With a global key and a `CACHE_TTL.WEEK`, one org's paid embedding served every other org's identical query for a week, and an org with exhausted credits kept getting semantic search for any warmed query. **Severity, stated honestly:** this is metering and tenant coupling, **not** content exposure. The cached value is a vector derived purely from the caller's own query string and the model; it encodes nothing about any other tenant's documents. The one information channel it did open was a weak timing oracle — a hit returns fast — letting a tenant infer that *somebody* on the platform had searched a given phrase. Both close with the key change. **Tests:** `kb-embedding-cache-tenant-isolation.spec.ts` (3). Written failing-first: 2 failed, 1 passed before the fix — and the one that passed was the **control**, which pins that a same-org repeat query is still served from cache, so the fix cannot degenerate into simply disabling caching. All 3 pass now; `src/common/cache` stays green at 9 suites / 263 tests. **Still open, and not attempted here:** "meter actual provider work once and report cache hits separately; prove budget checks still apply." There is no check-only entry point — `charge: false` still runs the provider call (`ai-gateway-runner-call.ts:179`), so a cache-hit budget check needs a new capability in `modules/ai`, which another session owns. Also untested here: case-sensitivity, cache outage, model change, expiry, concurrent misses. `normalizeEmbeddableQuery` lowercases and collapses whitespace (`kb-embedding-cache.ts:11-13`) and is used for the key but **not** for the provider input, so key and provider normalization are not identical — the audit's point stands and is unaddressed.
  - Origin: `docs/specs/knowledge-base/08-architecture-review-validation-2026-09-27.md:165`

### Actionable TODOs / AV-06 — P1: finish measured query and search-quality evidence

- [ ] **KB-OPEN-244** Capture before/after app-role `EXPLAIN (ANALYZE, BUFFERS)` for collection UNION, full search, chunk semi-joins, facets and health queries. Use representative rows and grant density, including grant-only and restricted-space tenants; include query count, buffers, rows scanned, p95/p99 and minority-tenant retrieval recall. The historical 50k-page/100k-grant bad-plan record is useful but does not close the rewritten query. Use an isolated load environment; rollback fixtures in production still consume locks, WAL, CPU and storage and are not free.
  - Origin: `docs/specs/knowledge-base/08-architecture-review-validation-2026-09-27.md:200`
- [ ] **KB-OPEN-245** **PARTLY — the snippet fetch is fixed; the keyset cutover is deliberately NOT done, and should not be done without its client.** Convert or explicitly time-bound the remaining `/kb/search` offset/count implementation and its whole-`contentText` fetch for snippets. **Fixed — the whole-`contentText` fetch, which was the real cost.** The rows query selected the entire `contentText` column for up to 50 rows purely to build a 160-character snippet, so every search shipped full TOASTed page bodies across the connection to Node and threw almost all of it away. Now `left(contentText, KB_SNIPPET_CONTENT_CAP)` in SQL, capped at 500 — 3× the snippet length, so no snippet is truncated. `buildSnippet`, the response contract and every ACL/org predicate are untouched. `kb-search-snippet-bound.spec.ts` asserts the rendered projection contains `left(`, with a control showing a raw column reference renders without it. Mutation-tested: reverting the projection fails it alone, 1 of 2. **Already fine — the offset.** `.offset()` is bounded at parse time by `KB_SEARCH_MAX_PAGE = 200` × `pageSize ≤ 50`, so the worst case is offset 9,950, and `kb-search-paging-bounds.spec.ts` already covers it. No change needed; the audit's concern does not apply to this endpoint as configured. **Deliberately NOT done — the keyset cutover.** `/kb/search` returns `total`, `page`, `pageSize` and `totalPages`; the frontend parses all four through `kbSearchResponseContract` and `useKbSearch` renders numbered pagination from them. Removing the total to produce a keyset would be a pagination cutover shipped without its client — the exact regression FE-125 and BE-25 exist to prevent — and the page would lose its pager the moment the backend deployed. **The sequence, for whoever picks this up:** (1) add a cursor to the response *alongside* `total`, a backward-compatible extension; (2) move `useKbSearch` to `useInfiniteQuery` with `getNextPageParam` and ship it; (3) only then retire `total` and `totalPages`. Steps 1 and 3 without 2 is the regression. **Also still open:** the `COUNT(*)` over the full match set on every search, which the keyset work would remove; it is the remaining unbounded piece of this endpoint.
  - Origin: `docs/specs/knowledge-base/08-architecture-review-validation-2026-09-27.md:201`

### Actionable TODOs / AV-07 — P0/P1: purge must respect holds and finish outside request occupancy

- [ ] **KB-OPEN-246** **P1:** Finish durable bounded purge commands, per-store retry and backpressure. Trace request transaction exit through blob/cache work; prove there is no nested second borrow or connection held during outbound I/O. Run a ten-concurrent-purge/provider-brown-out test against a small pool with interactive traffic and cancellation. Do not infer end-to-end safety from helper tests alone.
  - Origin: `docs/specs/knowledge-base/08-architecture-review-validation-2026-09-27.md:266`

### Actionable TODOs / AV-08 — P1: finish useful module interfaces, not mechanical file splits

- [ ] **KB-OPEN-247** Inventory remaining external table reads and give billing/lifecycle needs explicit bounded interfaces or documented privileged exceptions. Keep distinct authenticated, public, maintenance and linked-HR access contracts. Centralize variant selection without erasing HR/source/attachment identity. Replace `KbDocumentQueryService` leading-wildcard scans with indexed lexical retrieval; bound the merged result, escape search syntax consistently, and preserve the acyclic dependency graph.
  - Origin: `docs/specs/knowledge-base/08-architecture-review-validation-2026-09-27.md:270`

### Actionable TODOs / AV-09 — P1: retire only proven duplicates and keep needed UI

- [ ] **KB-OPEN-248** Record retained owner, route contract and callers for each R1-C10 candidate, including public/API consumers and scheduled jobs. Preserve grants/member management, useful verification and required redirects. Verify deregistered routes have no promised consumers, then remove dead controller/service/schema/test files together. Review current help-centre ownership and module registration after the concurrent changes; no wholesale deletion from the old 54-route count.
  - Origin: `docs/specs/knowledge-base/08-architecture-review-validation-2026-09-27.md:291`

### Actionable TODOs / AV-10 — P1: contracts and reachable UI

- [ ] **KB-OPEN-249** Verify each migrated envelope through the real HTTP parser and query hook, not a hook mock that already returns an array. Include from-ticket create success/idempotent retry, grants create/list parity, export history and each response projection. Update `selectFlatPages` documentation to describe its actual selected result, and retain raw page metadata where needed.
  - Origin: `docs/specs/knowledge-base/08-architecture-review-validation-2026-09-27.md:314`

### Actionable TODOs / AV-11 — P1: operational proof and truthful metrics

- [ ] **KB-OPEN-250** Record current read/write/search/Ask and all indexing-path instrumentation, redaction coverage, query/connection budgets, revocation lag, purge backlog, KB cost and operator alert delivery. Existing Ask/search/index metrics do not prove every required dimension or a live dashboard. Do not emit a guessed cache/replica result as observed telemetry.
  - Origin: `docs/specs/knowledge-base/08-architecture-review-validation-2026-09-27.md:370`
- [ ] **KB-OPEN-251** Run restore/reindex/tenant export-delete drills and load/soak at measured current traffic and 10×, then the agreed capacity envelope in isolation. Publish p95/p99, failure rate, queue recovery, pool headroom, RPO/RTO and cost per successful resolution. Keep replica, CDN, partition/cell/external-search expansion deferred until measured triggers and deployment prerequisites exist.
  - Origin: `docs/specs/knowledge-base/08-architecture-review-validation-2026-09-27.md:371`

### Actionable TODOs / AV-12 — P1: bound the PII decision and reconcile terminology

- [ ] **KB-OPEN-252** Amend ADR-0001's broad PostgreSQL claims while retaining the chosen application scan; document runtime/migration privileges and the controlled direct-write scan or quarantine path. Test every scanned field on every legitimate writer, plus linked-document revocation. Treat prompt-injection defenses separately from PII regexes. Reconcile the glossary with AV-02 and AV-04; a citation policy must never widen provider disclosure. This document supplies the corrected KB decision; the owning HR/backend ADR still needs its corresponding edit. **PARTLY 2026-09-27 — the ADR is amended.** `backend/docs/adr/0001-no-db-trigger-for-scanned-document-field-pii-guard.md`, four changes. One of its claims was simply false: "`SET ROLE` defeats role-based checks for the same reason" — `SET ROLE` requires a granted membership, not a catalog builtin, so the escalation runs the other way (`streamline_admin` can assume `streamline_app`, not the reverse). The runtime/migration privilege split is now explicit — `APP_DATABASE_URL` → `streamline_app`, RLS-bound, no BYPASSRLS; `DATABASE_URL` → `streamline_admin`, BYPASSRLS, migrations only — together with the fact that production Aurora is the only Postgres environment. A new paragraph records that `app.current_org_id()` is not leakproof, that this kills GIN/trigram and expression indexes under RLS, that `LEAKPROOF` cannot be declared on Aurora, and that a missing GRANT and a missing RLS policy both surface as `42501`. The controlled direct-write / quarantine path is documented in Consequences. **Open clauses: "test every scanned field on every legitimate writer, plus linked-document revocation" is not done, and the owning HR/backend ADR has not had its corresponding edit.** The box stays open on those two.
  - Origin: `docs/specs/knowledge-base/08-architecture-review-validation-2026-09-27.md:375`

### Actionable TODOs / AV-14 — P1: authorization cache and effective test coverage

- [ ] **KB-OPEN-253** Finish the consumer census of the ten security suites cited by R1, with at least one route-to-query or DB-backed counterexample for each security invariant. Test rollback, lost invalidation and revocation races. Centralize cache namespaces and ensure fingerprints distinguish user identity, principal kind/ceiling and relevant policy revisions before using them for result caches; `permissionFingerprintOf` currently includes membership/roles/containers but omits some of those dimensions. Cache failure may fall back to an authoritative read; it must never preserve revoked access.
  - Origin: `docs/specs/knowledge-base/08-architecture-review-validation-2026-09-27.md:403`

### Actionable TODOs / AV-16 — P1: verify public-response and attachment revocation by layer

- [ ] **KB-OPEN-254** Record browser, Next fetch, backend, CDN and object-origin policy separately. `KbPublicPagesController.getPublicMedia` validates the token/key and then redirects to `NEXT_PUBLIC_R2_PUBLIC_URL/fileKey`. Verify whether a previously obtained destination remains readable after token revocation, attachment unlink or page deletion; source inspection alone does not establish the deployed origin policy. If it does, replace unrestricted destinations with an authorization-preserving delivery contract, with an explicit maximum exposure window, and test replay, cached redirects, key ownership and revocation. Do not close S17's attachment/public-grant or CDN checks based only on broker authorization or ETag presence.
  - Origin: `docs/specs/knowledge-base/08-architecture-review-validation-2026-09-27.md:437`

### Actionable TODOs / AV-17 — P1: finish browser and deployment verification for KB routes

- [ ] **KB-OPEN-255** Deploy the current backend contract/query fixes, then retest every authenticated Knowledge Base route against that deployed artifact with browser console/network capture. The local browser pass found and locally mitigated the legacy gaps-array response, a citation-reuse 500 caused by malformed JSON citations, and a deployed 404 for `/kb/wiki/content-health/trend`; none can be checked as complete until the deployed API returns the documented contracts and the routes render without error-boundary or console failures. Record the deployment revision, migration state and focused test commands before checking any compound route acceptance item.
  - Origin: `docs/specs/knowledge-base/08-architecture-review-validation-2026-09-27.md:441`

## REQUIREMENT-LEDGER.md

Former source: `docs/specs/knowledge-base/REQUIREMENT-LEDGER.md`

### Cross-cutting invariants

- [ ] **KB-OPEN-256** **BLOCKED:** Authorization fails closed; cache unavailability cannot retain revoked access. AV-02/14 open per audit: container policy and cache-revocation proofs require a live environment and revocation timing measurement not available here.
  - Origin: `docs/specs/knowledge-base/REQUIREMENT-LEDGER.md:376`
- [ ] **KB-OPEN-257** **BLOCKED:** URL carries `q`, filters, sort, view, cursor; selection, drafts, menus, and dialogs stay local. AV-10: requires browser verification of URL state across all surfaces. Cannot verify from source alone.
  - Origin: `docs/specs/knowledge-base/REQUIREMENT-LEDGER.md:394`
- [ ] **KB-OPEN-258** Every state implemented: loading, ready, first empty, filtered empty, error with retry + request id, denied — plus saving/saved/offline/conflict/stale-access/restore on editing surfaces. **2026-09-27 audit:** AV-10: final route/browser state evidence remains open.
  - Origin: `docs/specs/knowledge-base/REQUIREMENT-LEDGER.md:396`
- [ ] **KB-OPEN-259** Every desktop capability has a mobile (375 px) and keyboard-accessible path; no action is context-menu-only. **2026-09-27 audit:** AV-10: accessibility warning and real mobile/keyboard proof remain open.
  - Origin: `docs/specs/knowledge-base/REQUIREMENT-LEDGER.md:398`

### Open regression introduced by the canonical seam — read cost

- [ ] **KB-OPEN-260** **BLOCKED:** Decide whether standing may be cached in `CacheService`. Caution: `permissionsVersion` in the key covers role and permission mutations (BE-114), but a **page-grant or space-membership change does not bump it**, so a cached standing could outlive a revocation. The existing 60 s accessible-spaces cache already carries this exposure. Do not add caching to the authorization path until revocation can actually be tested. Revocation timing cannot be measured without a live environment. Decision deferred.
  - Origin: `docs/specs/knowledge-base/REQUIREMENT-LEDGER.md:1392`

### Slices / S02 — My pages

- [ ] **KB-OPEN-261** **BLOCKED:** Browser evidence for all six states AV-10: browser/Playwright verification required. No capture stack available in this session.
  - Origin: `docs/specs/knowledge-base/REQUIREMENT-LEDGER.md:574`

### Slices / S03 — Shared with me

- [ ] **KB-OPEN-262** **BLOCKED:** Revocation propagation test against the documented bound p95 < 15 s / hard bound 60 s requires a live environment with real grant revocations and timing measurement.
  - Origin: `docs/specs/knowledge-base/REQUIREMENT-LEDGER.md:604`

### Slices / S05 — Full Search (new route, P0)

- [ ] **KB-OPEN-263** **BLOCKED:** All six states + keyboard navigation evidence AV-10: browser verification required. No capture stack in this session.
  - Origin: `docs/specs/knowledge-base/REQUIREMENT-LEDGER.md:723`

### Slices / S07 — Spaces + Space detail

- [ ] **KB-OPEN-264** **BLOCKED (browser rendering only):** Members sheet; owner; last updated; manager health summary **2026-09-27 partial proof:** `features/wiki/components/space-members-sheet.tsx` exists and referenced from `space-detail-page.tsx` (members sheet + owner + last updated confirmed). **2026-09-28 — the manager health summary was not missing, it was reporting the wrong numbers. Two defects found and fixed; only browser rendering is left.** `space-manager-health-summary.tsx` exists and is rendered from `space-detail-page.tsx:269`, gated on `kb:spaces:manage`. So "BLOCKED on browser verification" was hiding the fact that its *data* had never been checked, and both counts were wrong: *Archived pages inflated the overdue count.* Both count queries filtered `deleted_at IS NULL` and nothing else. Archiving is not deletion here — an archived page keeps its `next_review_at` — so every archived page with a past review date was reported to a space manager as overdue for review forever, with no action available to clear it. Both queries now exclude `status = 'archived'`. *A page whose verification was invalidated by an edit was reported as healthy.* This is the deeper one and it reaches further than this box. Editing a verified page sets `trust_state = 'unverified'` (`wiki/kb-pages.service.ts:347` via `shouldResetTrust`) and clears **neither** `verified_until` **nor** `next_review_at`. The overdue count tested `next_review_at < now()` alone, so between the edit and the old window's expiry the page counted as neither overdue nor unverified: trust had been explicitly withdrawn and every review surface said the space was clean. **The fix is one shared predicate, because the two review surfaces had diverged.** `core/kb-page-trust-predicates.ts` gained `isReviewDue()` and `hasReviewCommitment()`, now used by both the space health counts and `help-centre/kb-verification.service.ts`, which had grown four hand-rolled branches. Due-ness is `next_review_at <= now() OR (NOT isVerifiedNow() AND hasReviewCommitment())`. The scheduled-date comparison is deliberately kept as a **separate top-level disjunct**: for support articles `verified_until` and `next_review_at` are written independently (`articleVerifiedUntil(verifiedAt)` takes no interval, `articleNextReviewAt` does), so an article can be inside an open verification window with its scheduled review already past — folding that into the negation would have silently dropped those articles, the same narrowing caught in `f5340ca15`. A previous verification counts as a commitment on its own, so an article verified with no cadence still becomes due when its window lapses. The new predicate is a strict superset of all four branches it replaced. `pagesWithReviewPolicy` moved to `hasReviewCommitment()` too, which matters because the component returns `null` when that count is zero: with the denominator testing `next_review_at IS NOT NULL` and the numerator testing due-ness, a space could have overdue pages and still render nothing. Due ⊆ commitment now holds by construction and is asserted. **Proven against real Postgres, not against rendered SQL.** A predicate over three nullable columns cannot be settled by reading its text, so `core/kb-page-review-due.db.spec.ts` seeds all seven trust states into local `replay2` and asserts the exact due set — 5 tests, passing. Mutation: restoring the old four-branch predicate fails exactly the two tests covering the edited-page state while the other three stay green, so the suite isolates the state that was missed rather than merely re-stating the implementation. `next_review_at` also stopped being compared against the app server's `new Date()` and now uses SQL `now()`, removing app-vs-database clock skew from a due-ness decision. 178 suites, 1622 tests green across `help-centre`, `wiki` and `core`. **Remaining:** that the two stat cards actually render for a manager and hide for a non-manager. Presentation only.
  - Origin: `docs/specs/knowledge-base/REQUIREMENT-LEDGER.md:767`
- [ ] **KB-OPEN-265** **BLOCKED:** Archive/restore replacing customer-facing hard delete; restore idempotent Backend archive/restore endpoints exist (`spaces/:spaceId/archive`, `spaces/:spaceId/restore` per fourth pass). UI behavior requires browser.
  - Origin: `docs/specs/knowledge-base/REQUIREMENT-LEDGER.md:776`
- [ ] **KB-OPEN-266** **BLOCKED:** Space detail: breadcrumb, audience/access badge, in-space search, status/owner filters, create-in-space, lazy hierarchy, review-policy summary, inaccessible vs not-found recovery `/knowledge/wiki/spaces/[spaceId]` route exists. AV-10: full acceptance requires browser. Lazy hierarchy is unbuilt (12th pass).
  - Origin: `docs/specs/knowledge-base/REQUIREMENT-LEDGER.md:780`
- [ ] **KB-OPEN-267** **BLOCKED:** Every child request carries `spaceId`, tenant, parent/cursor, current access Cannot verify request payload composition without browser/network inspection.
  - Origin: `docs/specs/knowledge-base/REQUIREMENT-LEDGER.md:782`

### Slices / S08 — Page document

- [ ] **KB-OPEN-268** **BLOCKED:** Read/edit modes by permission AV-10: browser verification required.
  - Origin: `docs/specs/knowledge-base/REQUIREMENT-LEDGER.md:793`
- [ ] **KB-OPEN-269** **BLOCKED:** Trust header: owner, status, visibility, verification, next review, updated-by/time AV-10: browser verification required. Backend fields are present on `kb_pages`.
  - Origin: `docs/specs/knowledge-base/REQUIREMENT-LEDGER.md:795`
- [ ] **KB-OPEN-270** **BLOCKED:** Slash/insert menu, link preview, heading outline, anchored comments, citation blocks AV-10: browser/editor behavior. Anchored comments exist (`1216_kb_page_comment_anchor.sql`); others require editor interaction.
  - Origin: `docs/specs/knowledge-base/REQUIREMENT-LEDGER.md:799`
- [ ] **KB-OPEN-271** **BLOCKED:** Mobile metadata/comments sheets AV-10: browser verification at 375px required.
  - Origin: `docs/specs/knowledge-base/REQUIREMENT-LEDGER.md:801`
- [ ] **KB-OPEN-272** **BLOCKED:** In-memory or tenant-scoped server draft; connectivity + save timestamps; field-level conflict comparison; retry AV-03/10: writer atomicity and full UI proof open. `features/wiki/components/use-page-autosave.ts` exists; server draft and conflict UI require browser.
  - Origin: `docs/specs/knowledge-base/REQUIREMENT-LEDGER.md:803`
- [ ] **KB-OPEN-273** **BLOCKED:** AI actions show sources and produce a preview/diff before applying `features/wiki/components/kb-page-ai-actions.tsx` exists; source display and diff preview require browser.
  - Origin: `docs/specs/knowledge-base/REQUIREMENT-LEDGER.md:805`

### Slices / S09 — History

- [ ] **KB-OPEN-274** **REFUTED 2026-09-27:** Restore preview + confirmation; deep link to a version; audit entry Restore with audit entry: CONFIRMED — `kb-page-versions.service.ts:142` writes to `kb_version_restore_audit` (migration 1207). **Deep link (`?version=`) absent**: grep across `frontend/` finds no `?version=` URL parameter usage in the history page. **Restore preview**: BLOCKED (browser). This box requires both — marked refuted for the deep-link requirement.
  - Origin: `docs/specs/knowledge-base/REQUIREMENT-LEDGER.md:826`

### Slices / S10 — Reviews

- [ ] **KB-OPEN-275** **BLOCKED:** Search; URL filters for status/type/reviewer/due/space; sortable due date; cursor AV-10: URL filter behavior requires browser. `reviews-filters.tsx` and `reviews-page-filters.test.tsx` exist; full acceptance requires browser.
  - Origin: `docs/specs/knowledge-base/REQUIREMENT-LEDGER.md:841`
- [ ] **KB-OPEN-276** **BLOCKED:** Page trust context; optional approval note; required rejection reason AV-10: browser/form behavior required.
  - Origin: `docs/specs/knowledge-base/REQUIREMENT-LEDGER.md:843`
- [ ] **KB-OPEN-277** **BLOCKED:** Mobile cards; assignment notifications AV-10: browser verification required.
  - Origin: `docs/specs/knowledge-base/REQUIREMENT-LEDGER.md:847`

### Slices / S11 — Trash

- [ ] **KB-OPEN-278** **BLOCKED:** Table + mobile cards; search; deleted-by/date/space filters; cursor AV-10: browser verification required. `features/wiki/components/trash-page.test.tsx` exists; full acceptance requires browser.
  - Origin: `docs/specs/knowledge-base/REQUIREMENT-LEDGER.md:858`
- [ ] **KB-OPEN-279** **BLOCKED:** Remove the silent 100-row cap and card-only layout AV-07: bounded-query evidence does not fully prove the cap removal. Requires running the endpoint against a large dataset.
  - Origin: `docs/specs/knowledge-base/REQUIREMENT-LEDGER.md:860`
- [ ] **KB-OPEN-280** **BLOCKED:** Restore repairs tree/search/index links idempotently AV-07: end-to-end drain proof open. Requires running the restore flow against a real dataset.
  - Origin: `docs/specs/knowledge-base/REQUIREMENT-LEDGER.md:864`

### Slices / S12 — Templates

- [ ] **KB-OPEN-281** **BLOCKED:** URL `tab`, `q`, category/use-case filters; preview; expected output AV-10: browser verification required. `features/wiki/components/templates-page.tsx` exists.
  - Origin: `docs/specs/knowledge-base/REQUIREMENT-LEDGER.md:883`
- [ ] **KB-OPEN-282** **BLOCKED:** Using a template goes through the same page-create command and returns an editable page `kb-page-template-usage.spec.ts` exists; requires running the spec and tracing the create flow to confirm.
  - Origin: `docs/specs/knowledge-base/REQUIREMENT-LEDGER.md:889`

### Slices / S13 — Import & Export

- [ ] **KB-OPEN-283** **BLOCKED:** Separately gated import/export tabs AV-10: browser verification required.
  - Origin: `docs/specs/knowledge-base/REQUIREMENT-LEDGER.md:900`
- [ ] **KB-OPEN-284** **BLOCKED:** Format/size validation and help; title, target space/parent, default visibility, duplicate policy AV-10: browser/form behavior required.
  - Origin: `docs/specs/knowledge-base/REQUIREMENT-LEDGER.md:902`
- [ ] **KB-OPEN-285** **BLOCKED:** Dry-run summary; progress; per-item errors; retry; cancel before processing AV-10: browser required. `features/wiki/components/import-dry-run-card.tsx` exists.
  - Origin: `docs/specs/knowledge-base/REQUIREMENT-LEDGER.md:904`
- [ ] **KB-OPEN-286** **BLOCKED:** Uploads scanned; jobs idempotent; partial import reports created/skipped/failed and resumes without duplicates Requires running an import job against real data. Backend `kb-import-export.controller.ts` uses `@Idempotent`.
  - Origin: `docs/specs/knowledge-base/REQUIREMENT-LEDGER.md:908`

### Slices / S14 — Analytics

- [ ] **KB-OPEN-287** **BLOCKED:** Successful resolution, zero-result queries, unsupported Ask queries, citation reuse, stale high-use pages, review SLA, public deflection AV-10: browser verification with real data required. Backend analytics controller exists.
  - Origin: `docs/specs/knowledge-base/REQUIREMENT-LEDGER.md:921`
- [ ] **KB-OPEN-288** **BLOCKED:** Paginated drill-down; assign/dismiss/create-fix actions for gaps AV-10: browser required. Note: 13th pass found only `KbAnalyticsController` in `help-centre/` is reachable; `KbWikiAnalyticsController` registered but unreachable from any frontend page.
  - Origin: `docs/specs/knowledge-base/REQUIREMENT-LEDGER.md:923`
- [ ] **KB-OPEN-289** **BLOCKED:** Minimum-cohort privacy thresholds; aggregates cannot reveal a hidden page via count or label AV-02: requires live data verification.
  - Origin: `docs/specs/knowledge-base/REQUIREMENT-LEDGER.md:925`
- [ ] **KB-OPEN-290** **BLOCKED:** Remove vanity totals, raw org-wide titles, duplicate trust scores, charts without table alternatives AV-10: requires inspecting the deployed analytics UI.
  - Origin: `docs/specs/knowledge-base/REQUIREMENT-LEDGER.md:927`
- [ ] **KB-OPEN-291** **BLOCKED:** Skeleton/error/no-data states AV-10: browser verification required.
  - Origin: `docs/specs/knowledge-base/REQUIREMENT-LEDGER.md:929`

### Slices / S15 — Content Health (`/knowledge/wiki/manage`)

- [ ] **KB-OPEN-292** **BLOCKED:** Filters; owner/due; reason/explanation; bulk repair; dismiss/snooze with reason; before/after health trend Dismiss/snooze: CONFIRMED in service code (lines 152-181). Bulk repair and health trend: BLOCKED (browser/DB).
  - Origin: `docs/specs/knowledge-base/REQUIREMENT-LEDGER.md:944`
- [ ] **KB-OPEN-293** **BLOCKED:** Every item links to evidence and an allowed repair; no automated fix publishes without a human AV-10: browser verification required.
  - Origin: `docs/specs/knowledge-base/REQUIREMENT-LEDGER.md:946`

### Slices / S16 — Ask KB

- [ ] **KB-OPEN-294** Source scope sheet (pages/files/notes, space, owner, status, verified-only) visible and editable before send **2026-09-27 audit:** AV-04: selected scope must constrain every retrieval channel. **2026-09-28 — the AV-04 clause was a real defect and is fixed; the box stays open on two missing scope dimensions and the sheet itself.** *Clause closed (`242250c42`).* Ask has two retrieval channels and the scope bound only one. All four accepted scope fields reach a SQL predicate on the KB channel; the linked-company-documents channel takes nothing but the question text, so a question scoped to one space — or asked with `verifiedOnly` on — still pulled HR company documents from outside the scope into the answer context and cited them. Fixed fail-closed: a channel that cannot express a scope is not consulted while that scope is set, which is `kbScopeExcludesLinkedDocuments(input)` in `kb-ask-context.ts`, consulted by `gatherContext` so `ask` and `streamAsk` are covered by one change. Four negatives, one per field, plus one control proving the channel IS reachable through the same harness — removing the predicate fails all four and leaves the control green, so no negative passes on an unreachable channel. *Open, found while verifying the above:* `askSchema` accepts `spaceId`, `sourceIds`, `pageIds` and `verifiedOnly` under `.strict()`. It has **no `owner` and no `status` field**, so two of the six scope dimensions this box names cannot be expressed by a caller at all — the sheet could render them and `.strict()` would reject the request. `kb_pages` carries `owner_membership_id` and `status`, so this is a contract and predicate gap, not a schema one. Not browser-blocked; deferred only because the retrieval predicate files are held by another lane. *Separate defect found while checking whether a `status` scope would widen disclosure — fixed (`c72d6fc84`).* It would not have, because Ask's page candidate queries filtered status **not at all**, while the query that consumes their output filters `ne(status, 'archived')` (`kb-search-retrieval.service.ts:304`). The candidate query is the one carrying `.limit(pool)`, so archived pages were ranked, took candidate slots and were then discarded downstream: a filter-after-limit recall hole in which Ask answers "no context" over a knowledge base that had the answer. Both article candidate paths were already published-only; only the two page paths were missing it. Set to not-archived rather than published-only, matching the wiki search surface (`kb-search.service.ts:120`), since drafts are legitimately visible to a reader who can see them. *Browser-gated remainder:* the sheet being visible and editable before send is frontend presentation and needs a real browser.
  - Origin: `docs/specs/knowledge-base/REQUIREMENT-LEDGER.md:963`
- [ ] **KB-OPEN-295** **BLOCKED:** Answer parts: citations, source passage, freshness, verification, disagreement, insufficient evidence AV-04: UI field-level verification requires browser. Citations exist in the response schema; the rest (freshness, disagreement, insufficient-evidence labels) are frontend presentation. BLOCKED.
  - Origin: `docs/specs/knowledge-base/REQUIREMENT-LEDGER.md:970`
- [ ] **KB-OPEN-296** **BLOCKED:** Streaming stop/retry, network recovery, copy, helpful/unhelpful, report wrong/stale, create knowledge gap `POST /kb/ask/stream` exists at `kb-ask.controller.ts:134`. `POST /kb/ask/knowledge-gap` at line 217. Stop/retry/copy and UI recovery require browser. BLOCKED.
  - Origin: `docs/specs/knowledge-base/REQUIREMENT-LEDGER.md:972`
- [ ] **KB-OPEN-297** **BLOCKED:** Provider context contains only authorized passages; document content is data, never instruction AV-04: prompt injection protection verification requires running the AI path in a live environment. BLOCKED.
  - Origin: `docs/specs/knowledge-base/REQUIREMENT-LEDGER.md:984`
- [ ] **KB-OPEN-298** **BLOCKED:** Remove confidence percentages, uncited prose, hidden auto-selected sources, drafts in browser storage AV-04: browser UI verification required. BLOCKED.
  - Origin: `docs/specs/knowledge-base/REQUIREMENT-LEDGER.md:990`

### Slices / S17 — Public page

- [ ] **KB-OPEN-299** **BLOCKED:** Accessible reading typography; brand-light header; last updated; optional helpful feedback Browser verification required. BLOCKED.
  - Origin: `docs/specs/knowledge-base/REQUIREMENT-LEDGER.md:1009`
- [ ] **KB-OPEN-300** Cache headers keyed by token revision; rotation/revocation purges CDN/cache — AV-16 distinguishes frontend no-store from backend public/no-cache and requires per-layer revocation proof. **2026-09-27 partial proof:** Cache headers confirmed at `backend/src/modules/kb/wiki/kb-public-pages.controller.ts:48-49` — ETag keyed by `"${page.updatedAt.getTime()}-${publicTokenRevision}"`, `Cache-Control: public, no-cache`. Per-layer CDN revocation replay: **BLOCKED** (requires live CDN environment). **2026-09-28 — the frontend layer AV-16 asks to distinguish is now proven and pinned; only the CDN replay is still live-blocked.** `lib/public-fetch.ts` has two helpers and the difference is load-bearing: `publicGet` sends `next: { revalidate: PUBLIC_REVALIDATE_SECS }`, `publicGetNoStore` sends `cache: "no-store"`. The share page `app/(public)/wiki/[shareToken]/page.tsx` reads through the no-store helper and also declares `export const dynamic = "force-dynamic"`, so neither the Next data cache nor the full route cache retains a token-bound response — which is what makes the backend's `public, no-cache` the only caching layer in play, exactly the split AV-16 names. Nothing asserted any of this: `public-fetch.test.ts` covered auth, 404, errors, timeout and success and never once looked at the cache mode, so switching the share page to the revalidating helper would have served a revoked token's page from the data cache for the whole revalidate window with every gate green. Three tests now pin it, the middle one asserting `publicGet` does *not* set no-store so the first cannot pass for every public read. 13 tests, up from 10. **Remaining:** replaying a rotated token against a real CDN edge. That is the one layer source cannot settle.
  - Origin: `docs/specs/knowledge-base/REQUIREMENT-LEDGER.md:1015`
- [ ] **KB-OPEN-301** Page and attachment access bound to the same public grant — AV-16 requires replay testing of the object URL returned by the media broker after revocation. **2026-09-27 partial proof:** `validatePublicAttachment` at `backend/src/modules/kb/wiki/kb-page-public.service.ts` validates the token then checks the attachment belongs to that page. **2026-09-28 — the replay test was live-blocked, but source already settled its outcome, and the answer was that revocation did not work. Backend half FIXED; two frontend holes of the same class recorded below.** *The grant check itself was sound.* Predicate-for-predicate, the attachment path's page lookup matches the page read path: same token hash, `visibility = 'public'`, `status = 'published'`, `deleted_at IS NULL`, with tenant and page-id binding added for the attachment row. `publicTokenRevision` is absent from both and that is correct rather than an omission — `publicTokenColumnsFor` (`kb-page-share-visibility.ts:14`) **nulls `public_token_hash`** whenever visibility leaves `public`, and there is no path that bumps the revision while leaving the hash intact, so a nulled hash already matches no row. The revision is an ETag input, not a security predicate. *And one line later the controller gave all of that away.* `kb-public-pages.controller.ts` ended in `res.redirect(302, \`${r2Base}/${fileKey}\`)` — an unsigned, permanent object URL on the public R2 bucket, built from `NEXT_PUBLIC_R2_PUBLIC_URL`, the same variable used for email logos and feedbucket assets. Once a client followed that redirect it held a URL with no expiry, no signature and no reference to the share token. Revoking the share blocked *future* broker calls and did nothing about every URL already handed out. That is precisely what AV-16's replay test was written to detect, and it needed no live CDN to establish. A second consequence was skipped silently: `StorageService.getFileUrl` runs `assertKeySignable`, which consults the malware quarantine on every path — "an infected object has no authorised reader". Redirecting straight at the bucket bypassed that gate, so the public share surface was the one download path in the product serving unscanned objects. **Fixed.** `validatePublicAttachment` now returns `{ fileKey, orgId }` and the broker issues a signed URL through the canonical seam — `getFileUrl(orgId, fileKey, KB_PUBLIC_MEDIA_URL_TTL_SECONDS, undefined, { preauthorized: true })`, TTL 300s as a named constant (BE-131). `preauthorized` is what lets the share token stand in for a session while keeping the quarantine check in force. `StorageModule` is `@Global()`, so this added no module import and no cycle. Five tests pin it and all five fail under mutation back to a permanent URL, with the twelve surrounding tests staying green: the redirect target is the signed URL, the TTL is bounded, the org signed against is the page's tenant rather than anything derived from the client-supplied key, the call is marked preauthorized, and the key signed is the one the database returned rather than the client's. 118 suites, 913 tests in `wiki`; 292 suites, 2,702 tests across `kb`. **Still open — two frontend holes of the same class, recorded rather than changed because both risk breaking a live public surface:** 1. **The cover image never goes through the broker at all.** `app/(public)/wiki/[shareToken]/page.tsx:25-35` emits `backgroundImage: url(${coverImage})` directly, and the rewrite only walks `data.content`. If `coverImage` holds an object URL, revoking the share does not revoke the cover, unconditionally and today. The obvious fix — route it through `rewritePublicMediaUrls` — is **not safe without checking one thing first**: `recordAttachment` (`kb-media.service.ts:188`) accepts `pageId: number | null`, while `validatePublicAttachment` requires `pageId = page.id`, so a cover uploaded before the page existed would 404 through the broker and blank every such cover. 2. **The content rewrite silently no-ops when the base URL is unset.** `page.tsx:72-73` falls back to `data.content` untouched when `NEXT_PUBLIC_R2_PUBLIC_URL` is absent, serving raw object URLs straight to the client. Previously the backend degraded the same way, so the two were at least consistent; after the backend fix the frontend is the only side that still depends on that variable for a security-relevant decision.
  - Origin: `docs/specs/knowledge-base/REQUIREMENT-LEDGER.md:1019`

### Slices / S19 — Research Briefs

- [ ] **KB-OPEN-302** **BLOCKED (browser reopen only):** Completion durable if the browser closes **2026-09-27 partial proof:** Server-side durability: result stored at `backend/src/modules/kb/research/kb-research-brief.handler.ts:68-78`. Client poll wired: `frontend/hooks/api/kb/research-briefs.ts` (`refetchInterval`). **2026-09-28 — the recovery decision is now proven; only the remount itself needs a browser.** "Client poll wired" was recorded from the existence of a `refetchInterval`, and nothing asserted what it decides. The decision is the whole of the recovery behaviour: reopening the page remounts the query, the fetch returns the brief's current status, and whether the work resumes depends entirely on that status→interval mapping. It was an inline closure, so it could not be exercised without rendering. Extracted as `researchBriefPollInterval(status)` beside its threshold constant (BE-131) and pinned by 7 tests: polls while `queued` or `running` — the two states a reopened page lands in when the job outlived the closed browser — and stops on `completed` and `failed`. Two of those tests are the ones that matter beyond restating the code: a total-coverage check over the contract's four statuses, so adding a lifecycle state cannot silently fall through to "never poll"; and an exact-set assertion that precisely `queued` and `running` are pollable. Behaviour was deliberately preserved on the undefined branch and it is worth recording why: an unresolved or errored query leaves `data` undefined, and returning an interval there would turn a 403 into an unbounded three-second retry loop. It returns `false`, as before, and a test names that reason. **Remaining:** that remounting after a real browser close refetches and re-enters the polling state. That is framework behaviour at an integration seam, not a decision this codebase makes.
  - Origin: `docs/specs/knowledge-base/REQUIREMENT-LEDGER.md:1059`

### Slices / S20 — `/ask` removal, redirects, aliases

- [ ] **KB-OPEN-303** **BLOCKED (telemetry half only):** `/knowledge` redirect behavior verified with telemetry and entitlement Telemetry verification requires a live environment. BLOCKED. **2026-09-28 — the entitlement half needed no live environment and is verified.** The redirect is not a `next.config.ts` rule, which matters: a config redirect runs at the edge before any application code and *structurally cannot* consult entitlement. This one is an app route. `app/(authenticated)/knowledge/page.tsx` is five lines — `redirect("/knowledge/chat")` — and is unconditional by design. Entitlement is enforced at the destination: `app/(authenticated)/knowledge/chat/page.tsx` awaits `requireSession()` and wraps its content in `<RequireModule module="kb">`, so an unentitled caller is redirected and then meets the module-unavailable state rather than the surface. That is the correct arrangement — gating the redirect itself would leak whether the module exists. Checked against the known trap that `next.config.ts` shadows app-route redirects: the config's two `/knowledge/*` entries are `wiki/pages/:pageId` → `wiki/doc/:pageId` and its `/history` sibling, neither of which matches `/knowledge`, so nothing shadows this route. **Still blocked, and only this:** that the redirect *emits* telemetry. There is no emission on the redirect path at all, and confirming an operator can see it needs a live stream.
  - Origin: `docs/specs/knowledge-base/REQUIREMENT-LEDGER.md:1074`

### Slices / S21 — `kb_articles` cutover + destructive contraction

- [ ] **KB-OPEN-304** **BLOCKED:** Pre-flight: resolve exact table/route/cache/index/blob targets and write them into this ledger before any destructive statement Operational step; requires migration execution context. BLOCKED.
  - Origin: `docs/specs/knowledge-base/REQUIREMENT-LEDGER.md:1109`
- [ ] **KB-OPEN-305** **BLOCKED:** Pre-flight: RDS snapshot taken and id recorded here Operational step; requires production database access. BLOCKED.
  - Origin: `docs/specs/knowledge-base/REQUIREMENT-LEDGER.md:1111`
- [ ] **KB-OPEN-306** **BLOCKED:** Per-record reconciliation of status, slug, redirects, comments, attachments, versions, translations, public URL, citations Operational step; requires production data. BLOCKED.
  - Origin: `docs/specs/knowledge-base/REQUIREMENT-LEDGER.md:1113`
- [ ] **KB-OPEN-307** **BLOCKED:** Watermark, checksum/counts, exceptions, retries, rollback window recorded Operational step; requires running migration and recording results. BLOCKED.
  - Origin: `docs/specs/knowledge-base/REQUIREMENT-LEDGER.md:1115`
- [ ] **KB-OPEN-308** **BLOCKED:** Freeze legacy writes → final delta → switch readers → invalidate both cache namespaces Operational deployment step. BLOCKED.
  - Origin: `docs/specs/knowledge-base/REQUIREMENT-LEDGER.md:1117`
- [ ] **KB-OPEN-309** **BLOCKED:** Remove the article↔page bridge runtime only after 100% migration + signed reconciliation Operational step; gate is S01–S20 all VERIFIED + signed reconciliation. BLOCKED.
  - Origin: `docs/specs/knowledge-base/REQUIREMENT-LEDGER.md:1119`
- [ ] **KB-OPEN-310** **BLOCKED:** Contraction migration tested for interruption and resumption Operational step; requires running the migration in a test environment. BLOCKED.
  - Origin: `docs/specs/knowledge-base/REQUIREMENT-LEDGER.md:1137`
- [ ] **KB-OPEN-311** **BLOCKED:** Rollback metadata provided even though the data migration is intentionally irreversible Operational step; rollback metadata can only be recorded after the migration is drafted and run. BLOCKED.
  - Origin: `docs/specs/knowledge-base/REQUIREMENT-LEDGER.md:1139`
- [ ] **KB-OPEN-312** **BLOCKED:** Retain historical migrations needed to build from supported baselines, audit records, and promised compatibility redirects Operational/archive decision; requires migration ledger audit against baseline requirements. BLOCKED.
  - Origin: `docs/specs/knowledge-base/REQUIREMENT-LEDGER.md:1141`

### Slices / S22 — Async scale, cost, disaster recovery

- [ ] **KB-OPEN-313** **Public-page CDN invalidation by token/page revision.** Not built, and not fabricated: **2026-09-27 audit:** AV-11: conditional/deferred for no-store endpoint; not implemented CDN behavior. there is no CDN in front of this endpoint, the frontend route is `force-dynamic` with `cache: "no-store"`, and `kb_pages.content_revision` is available whenever one is introduced. What *was* fixed here is a real defect in the same area — see "Unsharing a page did not revoke its link" — plus the duplicate origin read below.
  - Origin: `docs/specs/knowledge-base/REQUIREMENT-LEDGER.md:1181`
- [ ] **KB-OPEN-314** **Replica consistency classification and lag failover.** **2026-09-28 — this box's own evidence was wrong on three counts, and correcting it changes what is actually left.** *"Zero injection sites" is false.* `db/drizzle.module.ts:115` injects `REPLICA_ROUTER`, and `:126` calls `this.replicaRouter.route("search-freshness")`. One site, not zero. *"No lag probe exists anywhere" is false.* `db/replica-lag-probe.ts:19` `PostgresReplicaLagProbe` reads `pg_last_xact_replay_timestamp()`, compares against a 5 s `DEFAULT_MAX_LAG_MS`, and fails closed on a non-replica, a non-finite lag or a thrown query. *"`isReplicaHealthy` is hardcoded `true`" is false.* It is a constructor-selected probe. `drizzle.module.ts:97-99` picks `PostgresReplicaLagProbe` when `replicaConnectionString` is set and `NullReplicaHealthProbe` when it is not — and the Null probe returning `true` with no replica configured is correct, because `route()` returns the primary in that case anyway. **What is genuinely still open, stated accurately:** no *application read path* routes through the router. The single `route()` call is a boot-time diagnostic that logs which pool `search-freshness` would resolve to; no KB read, search or Ask query consults it. So classification exists and is unused. **And the residue is smaller than "needs a replica endpoint".** With `replicaConnectionString` absent, `route()` returns the primary, so wiring a read path through the router is behaviour-neutral today and becomes live the moment `DB_REPLICA_URL` is set. That wiring is not KB-owned — it sits in `db/drizzle.module.ts` and the tenant-transaction machinery shared by every module — so it is recorded here rather than done here. Only the *failover measurement* genuinely needs a replica.
  - Origin: `docs/specs/knowledge-base/REQUIREMENT-LEDGER.md:1187`
- [ ] **KB-OPEN-315** Drills: backup restore, tenant export/delete, reindex, cell-move — **needs a live environment.** No local Postgres, no capture stack, PITR window 1 day.
  - Origin: `docs/specs/knowledge-base/REQUIREMENT-LEDGER.md:1211`
- [ ] **KB-OPEN-316** Load/soak at current, 10×, and the planning envelope — **needs a live environment.**
  - Origin: `docs/specs/knowledge-base/REQUIREMENT-LEDGER.md:1213`
- [ ] **KB-OPEN-317** Conditional stages (partitioning, cells, service extraction, external search) stay **unactivated**. No trigger was measured, because measuring one needs the environment above. Recorded as unmeasured rather than as "not triggered" — those are different claims. **2026-09-27 audit:** Absence confirmed by codebase search — no partitioning migration, no cell-move service, no external search integration found in `backend/src/modules/kb/`. No positive file pointer exists for a claim of absence. **BLOCKED** pending an explicit architecture doc or deactivation flag.
  - Origin: `docs/specs/knowledge-base/REQUIREMENT-LEDGER.md:1214`

### Slices / S23 — Observability

- [ ] **KB-OPEN-318** Drill-verified. Nothing here has fired against a live stream. The self-test proves the predicate matches a line the emitter really produces — it does not prove an operator is paged.
  - Origin: `docs/specs/knowledge-base/REQUIREMENT-LEDGER.md:1322`
