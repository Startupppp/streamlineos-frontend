# DOC-04 — Search, Filters, Views, and Pagination

## Outcome

Every collection is discoverable with truthful server-side search and filters,
the right view, and an honest pagination story. Silent caps and client-side
slices of a 2000-node tree are defects.

## Current Source Findings

| Defect | Evidence |
|---|---|
| List pages have no search | Home, My pages, Shared, Spaces, Trash, Templates |
| Shared / My pages filter the full tree in the browser | `shared-page.tsx:64-66`, `private-page.tsx:15-17` |
| Reviews filters are local state, not URL | `reviews-page.tsx:250-251` |
| Reviews UI uses `expired`; product is derived **overdue** (D19) | `reviews-page.tsx:52-57` vs `:396-401` |
| Analytics `from`/`to` supported by API, unused in UI | `kb-analytics.schemas.ts:3-6` vs `knowledge-analytics-page.tsx:171-177` |
| Tree silently capped at 2000 | `kb-page-tree.service.ts:34, 104-107` |
| Trash / reviews / templates / jobs silently capped | 100 / 100 / 200 / 100 |
| Spaces list unbounded | `kb-spaces.service.ts:71-85` |
| Import history: fetch 100, client-slice 10 | `import-history-section.tsx:51-62` |
| Quick find has no “View all results” | `quick-find-dialog.tsx:98-101` |
| No view toggle anywhere | Card / tree / table are hard-wired per page |
| No saved views | Templates “Saved” tab ≠ saved filters |
| Dynamic filters missing | Space → pages, status → subtype, date → granularity |

## Search — Where It Filters

Search is **not** one global box. Each surface searches a named field set.

| Surface | Fields searched | Server? | Notes |
|---|---|---|---|
| Quick find | Page `fts` (title + `contentText`) | Yes | Prefix `to_tsquery`, max 20, `hasMore` |
| Full search page (ADD) | Title, content, optional filters below | Yes | Continuation of Quick find |
| Wiki Home | Title (and later owner/status via filters) | Yes | New list endpoint, not tree-slice |
| My pages | Title | Yes | `ownerMembershipId = me` |
| Shared with me | Title | Yes | Explicit share grant |
| Spaces list | Space name, description | Yes | |
| Space detail | Page title inside that `spaceId` | Yes | Dependent: space is fixed |
| Trash | Title | Yes | Deleted-only |
| Templates | Template title | Yes | Tab (starters/saved) is a filter |
| Reviews | Page title | Yes | Plus status/type |
| Content management (P1) | Title, owner, status | Yes | Health presets |
| Ask KB composer | Retrieval over ACL-visible chunks | Yes | Not a list filter |
| Ask KB conversation panel | Conversation title | Client OK | Already-loaded pages only |
| Help-centre `/kb/search` | Articles + pages + sources | Yes | Support deflection; do not hide as wiki search |
| Mentions in editor | User name/email | Server preferred | Today fetches all `/chat/users` then client-filters (`page-document.tsx:49-61`) — replace with a bounded people search |
| Analytics tables | No free-text in P0 | — | Date range is the filter |

Do **not** search: version snapshots as first-class hits (history stays on the
page), import job payloads, raw source binaries.

## Filter Matrix

Every filter is a URL query param, debounced search ≥300ms, and resets the
cursor/page. Sentinel “all” **removes** the param.

| Page | Required filters (P0) | Dynamic / dependent | P1 |
|---|---|---|---|
| Wiki Home | `q`, `status`, `spaceId` | Status options from page status enum; space options from accessible spaces | `ownerMembershipId`, `verified` |
| My pages | `q`, `status`, `spaceId` | Same | visibility |
| Shared | `q`, `status`, `access` | access = view / comment / edit if shares store it | sharedBy |
| Spaces | `q`, `audience` | — | archived (default hide) |
| Space detail | `q`, `status` | spaceId locked from route | owner |
| Trash | `q`, `deletedBy`, date range | deletedBy from visible actors on the page | — |
| Reviews | `status` (`pending\|approved\|rejected\|overdue`), `type`, `q` | `overdue` is derived (D19); type options unchanged | reviewer, due (P1 SLA) |
| Templates | `tab`, `q` | — | category |
| Import | `tab`, job `status` | export tab only if `kb:pages:export` | — |
| Analytics | `from`, `to`, `spaceId` | space options = accessible; granularity week/month from range length | — |
| Full search | `q` (required), `spaceId`, `status`, `contentType`, `owner` | Facet counts for the current `q` | verified, updated |
| Manage (P1) | health preset, `q`, `spaceId`, `status`, `owner` | preset sets the others; user may refine | — |
| Ask KB sources | `kind`, `status`, `spaceId` | — | — |

## Views — What Each Page Uses

| Page | Default | Allowed | Do not add |
|---|---|---|---|
| Wiki Home | Cards | Cards, list | Board |
| My pages | List (tree-capable) | List, cards | Board |
| Shared | Cards | Cards, table | Tree of other people’s IA |
| Spaces | Cards | Cards, table | — |
| Space detail | Tree | Tree, cards | — |
| Trash | **Table** (replace cards) | Table | Cards as default |
| Reviews | Table | Table + `mobileCard` | — |
| Templates | Cards | Cards | — |
| Import jobs | Table (paginated) | Table | Client-sliced fake pages |
| Analytics | Stat cards + tables | Tables with pagination | 7-col overflow grid |
| Full search | List (snippet) | List, table | — |
| Manage (P1) | Table | Table, cards | — |
| Page history | Split list + preview | Keep | Pagination already cursor |
| Sidebar tree | Tree | Tree | Paginate roots; lazy children |

View choice is a URL param (`view=cards|list|table|tree`) where more than one
view is allowed. It does not change the query, only presentation.

## Pagination — Keep / Change / Remove

| Collection | Today | Decision |
|---|---|---|
| Quick find | Top 20 + hasMore | **Keep** bounded jump. Link to full search |
| Recents | 20 | **Keep** section, no pager |
| Favorites | 50 | **Keep** section; if >50 add “View all” on My pages `?favorite=1` (P1) |
| Page versions | Cursor 50–100 | **Keep** |
| Ask KB sources | Cursor 50 | **Keep** |
| Conversations | Cursor | **Keep** |
| Full search / Home / My / Shared / Trash / Reviews / Templates / Spaces / Manage | Silent cap or unbounded | **Add** cursor (keyset `updatedAt, id`) page size 25 default, max 100 |
| Tree | 2000 silent | **Change** — first 200 roots + lazy children; UI must show “more” |
| Import/export jobs | Client slice of 100 | **Change** to server cursor; **remove** fake `TablePagination` over a slice |
| Analytics lists | Unbounded 20–100 | **Add** cursor or “view in Manage” |
| Space members (ADD) | — | Cursor 50 |

**Remove pagination** from: recents, favorites, Quick find, page-level comment
threads that are already short and loaded with the page (cap 100, then
“view more” cursor if needed).

Never invent a total for a cursor list. Never present a 100-cap as “all
trash.”

## Dynamic Filter Rules

1. Parent constraint comes from the route (`spaceId`, `projectId`) and is
   not a user-clearable chip unless the page is a cross-space inventory.
2. Child options load from a facet or enum endpoint scoped to the parent
   (`GET /kb/pages/facets?spaceId=`). Do not load every org member to pick
   an owner.
3. Changing a parent filter clears invalid child values and resets the
   cursor.
4. Facet counts reflect ACL and the current `q`, not the unfiltered org.
5. If a facet endpoint is not ready, ship enums (status, type, audience)
   first; do not block P0 on counts.

## Todos

- [ ] **DOC-04-001** `GET /kb/pages` (or equivalent) list contract: `q`,
      `status`, `spaceId`, `ownerMembershipId`, `sharedWithMe`, `deleted`,
      `cursor`, `limit`, projected columns, `hasMore`. Stop using the tree
      as a list API.
- [ ] **DOC-04-002** Wiki Home, My pages, Shared, Spaces, Trash, Templates
      gain `FILTER_TOOLBAR_ROW` + URL state.
- [ ] **DOC-04-003** Reviews filters in URL; add derived **overdue** (D19);
      pass `pagination` into `DataTable`.
- [ ] **DOC-04-013** Replace mention typeahead’s full `/chat/users` dump
      with a bounded people search.
- [ ] **DOC-04-004** Analytics date range + optional `spaceId` wired to
      existing DTO.
- [ ] **DOC-04-005** Full search page + Quick find “View all results.”
- [ ] **DOC-04-006** Replace silent caps with cursor + `hasMore` UI on
      trash, reviews, templates, jobs, spaces.
- [ ] **DOC-04-007** Tree: truncation signal + lazy children; never claim
      the 2000th node is the end without saying so.
- [ ] **DOC-04-008** Import history: delete client-side page slice; use
      server cursor.
- [ ] **DOC-04-009** View toggle where DOC-14 allows more than one view.
- [ ] **DOC-04-010** Facet/options endpoint for space and owner (can ship
      enums-only in P0).
- [ ] **DOC-04-011** Indexes for list sorts: `(org_id, updated_at desc, id
      desc)` and `(org_id, space_id)` on `kb_pages` (DOC-07).
- [ ] **DOC-04-012** Tests: filter + page reset; ACL hides unauthorized
      facet values; changing space clears an inaccessible owner.

## Acceptance

- [ ] No list page client-filters a capped tree and calls it the result set.
- [ ] Every P0 filter is URL-shareable and server-enforced.
- [ ] Every unbounded collection has a completion path (`hasMore` or a
      documented section cap).

## Evidence Log

_Empty until DOC-04-001 through DOC-04-012 close._
