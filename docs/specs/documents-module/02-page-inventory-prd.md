# DOC-02 — Page Inventory (Keep / Merge / Remove / Add)

## Outcome

Every Documents-owned page either earns its place with a clear customer job or
is removed. Missing journeys required for a complete knowledge product are
listed as additions. HR, payroll, accounting, and SignOS document pages stay
BOUNDARY.

## Disposition Legend

| Code | Meaning |
|------|---------|
| **KEEP** | Retain; repair defects listed in child PRDs |
| **MERGE** | Collapse into the listed owner; delete the route after callers move |
| **MOVE** | Change canonical path; delete the old route (no legacy redirect unless D04/D07 says otherwise) |
| **REMOVE** | Delete page and all callers; job is obsolete or duplicated |
| **ADD** | New page required for product completeness |
| **BOUNDARY** | Owned by HR / Build / Support / another module; Documents links only |
| **DO NOT CREATE** | Explicitly rejected; job lives elsewhere |

## Page Anatomy Contract (every KEEP / ADD)

Each retained page must declare in DOC-14:

1. Customer job (one sentence)
2. Permission / entitlement gate
3. Primary action (or explicit read-only)
4. Loading, error, empty, filtered-empty, denied, populated states
5. Collection strategy: none | cursor | offset ≤100 | infinite | bounded
   section | lazy tree
6. Allowed views
7. Search / filter owner (DOC-04) or N/A
8. Card / bulk owner (DOC-05) or none
9. Form owner (DOC-06) or N/A
10. `backHref` or “sidebar destination”

- [ ] **DOC-02-001** every KEEP and ADD page has a matching DOC-14 row.

## Org Wiki

| Path | Disposition | Job | Notes |
|---|---|---|---|
| `/knowledge` | KEEP | Entry redirect | Redirects to `/knowledge/chat` |
| `/knowledge/chat` | KEEP | Ask a question with citations | Outside WikiShell by design (D02) |
| `/knowledge/wiki` | KEEP | Recents, favorites, root pages, create | Canonical hub |
| `/knowledge/wiki/doc/[pageId]` | KEEP | Read / edit one page | Core surface |
| `/knowledge/wiki/doc/[pageId]/history` | KEEP | Compare and restore versions | |
| `/knowledge/wiki/private` | KEEP | My pages (D03) | Relabel; fix query |
| `/knowledge/wiki/shared` | KEEP | Shared with me (D03) | Fix query |
| `/knowledge/wiki/spaces` | KEEP | Browse / manage spaces | Gate nav on `kb:spaces:view` |
| `/knowledge/wiki/spaces/[spaceId]` | KEEP | Space home + page tree | |
| `/knowledge/wiki/templates` | KEEP | Starters + saved templates | Gate nav; starters may be usable with `kb:pages:create` |
| `/knowledge/wiki/trash` | KEEP | Restore / purge + retention | Align view vs purge (DOC-01-007) |
| `/knowledge/wiki/reviews` | KEEP | Approval / freshness queue | Add expired filter; paginate |
| `/knowledge/wiki/import` | KEEP | Import + export job history | Gate tabs separately |
| `/knowledge/wiki/analytics` | KEEP | Usage and gaps | Date range + ACL (DOC-07) |
| `/knowledge/wiki/search` | **ADD P0** | Full results + filters + bulk | D05 |
| `/knowledge/wiki/manage` | **ADD P1** | Content health inventory | D14 |
| `/knowledge/wiki/research-briefs` | **ADD P1** | AI research reports | MOVE from Support |
| `/knowledge/wiki/research-briefs/[briefId]` | **ADD P1** | Brief detail | |

## Aliases

| Path | Disposition | Job |
|---|---|---|
| `/kb` | KEEP | Redirect → Wiki |
| `/docs` | KEEP | Redirect → Wiki |
| `/knowledge-base` | KEEP (add redirect) | Redirect → Wiki |
| `/ask` | **MERGE** | Redirect → `/knowledge/chat`; then REMOVE the page |
| `/knowledge/wiki/pages/:pageId` | KEEP (config only) | Redirect → `/doc/:pageId` |

## Do Not Create

| Path | Why |
|---|---|
| `/knowledge/wiki/recent` | Section on Wiki Home (D04) |
| `/knowledge/wiki/favorites` | Section on Wiki Home + sidebar |
| `/knowledge/wiki/settings` | Retention lives on Trash |

## Build Adapter

| Path | Disposition | Job |
|---|---|---|
| `/build/[projectId]/wiki` | KEEP | Project-scoped wiki home |
| `/build/[projectId]/wiki/[pageId]` | KEEP | Project-scoped page |
| `/build/[projectId]/wiki/[pageId]/history` | **ADD** | Same versions UI; keep Build chrome |

## Help Centre (linked CMS)

| Path | Disposition | Job |
|---|---|---|
| `/support/kb` | KEEP (dual-run) | Help-centre article list / CMS |
| `/support/kb/[articleId]` | KEEP (dual-run) | Article editor |
| `/support/kb/research-briefs` | **MOVE P1** | → `/knowledge/wiki/research-briefs` |
| `/support/kb/research-briefs/[briefId]` | **MOVE P1** | → wiki brief detail |
| `/help/[orgId]` | KEEP | Public help index |
| `/help/[orgId]/[slug]` | KEEP | Public help article |

After D07 cutover, `/support/kb/**` is **REMOVE** (no redirect). Public
`/help/**` may stay as a published-page renderer over `kb_pages`.

## Public Wiki

| Path | Disposition | Job |
|---|---|---|
| `/wiki/[shareToken]` | KEEP | Token-scoped public page |

## Boundary — Do Not Pull In

| Path | Owner | Why |
|---|---|---|
| `/me/documents` | Home / HR | Employment files |
| `/hr/documents/**` | HR | Workforce document admin |
| Accounting invoice / bill attachments | Accounting | Financial records |
| SignOS envelopes | SignOS | Signing, not knowledge |

## Missing Actions on Retained Pages (summary)

Full field-level contracts live in DOC-14 / DOC-05. This is the inventory of
**jobs that exist on a page but are incomplete**:

| Page | Missing job |
|---|---|
| Wiki Home | Search, status/space filters, view toggle, card menu |
| My pages | Correct owner query, search, filters, card menu |
| Shared | Correct share query, sharer/date/access columns, card menu |
| Spaces | Search, archive (not delete), members sheet, pagination |
| Space detail | In-space search, members, archive |
| Trash | Table, search, selection, bulk restore/purge |
| Reviews | URL filters, expired status, pagination, bulk approve/reject |
| Templates | Search, category, permission-split starters vs manage |
| Import | Required title `*`, target space, separate export permission |
| Analytics | Date range, pagination, gap assign/dismiss (P1) |
| Page document | Mobile metadata drawer; gate Move/Export |
| Page cards | Favorite, copy link, more menu |
| Ask KB | Sources filter; conversation search stays local (ok) |
| Quick find | “View all results” |

## Unnecessary / Thin Surfaces

| Surface | Verdict |
|---|---|
| Export tab on Import | KEEP — job history. Do not add a second export page. Per-page export stays on the doc menu. |
| Analytics “Help centre articles” copy | KEEP page; retarget metrics to pages (DOC-07, DOC-08). |
| Private-by-visibility as a library | REMOVE as a concept; path reused for My pages (D03). |

## Todos

- [ ] **DOC-02-002** Relabel Private → My pages in sidebar, `PageWrapper`
      title, empty states, and `frontend/PAGES.md`.
- [ ] **DOC-02-003** Implement `/knowledge/wiki/search` (P0) per DOC-04 / DOC-14.
- [ ] **DOC-02-004** Implement `/knowledge/wiki/manage` (P1) per DOC-10 / DOC-14.
- [ ] **DOC-02-005** Move research briefs (P1) and delete Support routes after
      callers migrate. No dual URLs.
- [ ] **DOC-02-006** Add Help centre to Documents nav (DOC-01-009) without
      merging article and page models (D01).
- [ ] **DOC-02-007** Confirm zero callers before any REMOVE. Prove with knip
      plus `next build` / `nest build` for side-effect imports.
- [ ] **DOC-02-008** Update `frontend/PAGES.md` only after each route’s
      measured behavior is true.

## Acceptance

- [ ] Disposition table accounts for every current `page.tsx` under
      `knowledge/**`, `kb/`, `docs/`, `wiki/[shareToken]`,
      `build/[projectId]/wiki/**`, and `support/kb/**`.
- [ ] Every KEEP/ADD has a DOC-14 catalog row.
- [ ] DO NOT CREATE routes are absent from nav, PAGES, and tests.

## Evidence Log

_Empty until DOC-02-001 through DOC-02-008 close._
