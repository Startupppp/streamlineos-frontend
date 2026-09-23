# DOC-14 — Exhaustive Page Catalog

## Authority

This file is the per-page contract. DOC-02 owns disposition. Child PRDs own
depth. A KEEP/ADD page is not done until its row’s checkboxes have evidence.

Legend: **L** loading · **E** error+retry · **∅** empty · **F∅** filter-empty ·
**D** denied · **P** populated.

---

## DOC-14-A — Ask KB `/knowledge/chat`

| | |
|---|---|
| Job | Ask a natural-language question and inspect cited sources |
| Gate | Universal route; API `kb:pages:view` + retrieval ACL; AI `kb:ai:generate` |
| Primary | Send question |
| Views | Thread (not a collection view) |
| Search | Retrieval over ACL chunks; conversation list title is client-side |
| Filters | Sources sheet: kind, status, spaceId (add) |
| Pagination | Conversations cursor; sources cursor; **no** thread pager |
| Actions | New conversation, rename, delete, cite → page, open sources |
| Remove | Page-level `Loader2` (use skeletons) |
| Back | Sidebar destination |
| States | L E ∅ (no convos) D (module off) P |

- [ ] **DOC-14-A-001** AI permission + source ACL + composer contrast +
      skeletons (DOC-07-012, DOC-09-006).

---

## DOC-14-B — Wiki Home `/knowledge/wiki`

| | |
|---|---|
| Job | Resume recents/favorites and browse root pages |
| Gate | Universal; `kb:pages:create` for New page |
| Primary | New page |
| Views | Cards default; list allowed (`view=`) |
| Search | `q` on title/content via list API |
| Filters | `status`, `spaceId` |
| Pagination | Recents 20 / favorites 50 **no pager**; All pages **cursor** |
| Card actions | Open, favorite, copy link, share, duplicate, move, archive, delete |
| Bulk | None on cards; table view may select in P1 |
| Back | Sidebar destination |
| States | L E ∅ F∅ P |

- [ ] **DOC-14-B-001** Stop rendering “All pages” from the raw tree.
- [ ] **DOC-14-B-002** Filter toolbar + card menu + badges.

---

## DOC-14-C — My pages `/knowledge/wiki/private`

| | |
|---|---|
| Job | Pages I own |
| Gate | Universal |
| Primary | New page (if create) |
| Views | List/tree default; cards allowed |
| Search / filters | `q`, `status`, `spaceId` — **server** `ownerMembershipId=me` |
| Pagination | Cursor |
| Card/row actions | Same as Home |
| Back | Sidebar destination |
| Copy | Title “My pages”; empty “You do not own any pages yet” |

- [ ] **DOC-14-C-001** Replace `visibility === "private"` client filter.

---

## DOC-14-D — Shared with me `/knowledge/wiki/shared`

| | |
|---|---|
| Job | Pages explicitly shared with me that I do not own |
| Gate | Universal |
| Primary | None (read-mostly) |
| Views | Cards default; table allowed |
| Search / filters | `q`, `status`, `access` |
| Pagination | Cursor |
| Card extras | Sharer name, shared date, access |
| Back | Sidebar destination |
| Copy | Keep “Shared with me”; empty “Nothing has been shared with you” |

- [ ] **DOC-14-D-001** Replace `createdById !== myId`. Needs share grants
      (DOC-08-002).

---

## DOC-14-E — Spaces list `/knowledge/wiki/spaces`

| | |
|---|---|
| Job | Find and administer spaces |
| Gate | Route `kb:spaces:view`; manage actions `kb:spaces:manage` |
| Primary | New space (manage) |
| Views | Cards default; table allowed |
| Search / filters | `q`, `audience` |
| Pagination | Cursor (today unbounded — fix) |
| Card actions | Open; Edit; **Archive / Restore** — never Delete. Members (manage) |
| Forms | Space sheet (DOC-06) |
| Back | Sidebar destination |
| A11y | Actions **outside** `<Link>` |

- [ ] **DOC-14-E-001** Archive lifecycle + search + pagination + a11y.

---

## DOC-14-F — Space detail `/knowledge/wiki/spaces/[spaceId]`

| | |
|---|---|
| Job | Browse one space’s pages and (if manage) its members |
| Gate | Universal route; record `assertSpaceAccessible` |
| Primary | New page in this space |
| Views | Tree default; cards allowed |
| Search / filters | `q`, `status` (space locked) |
| Pagination | Lazy tree / cursor list |
| Actions | Members sheet (manage); archive space (manage) |
| Back | `/knowledge/wiki/spaces` |
| States | L E ∅ D (inaccessible space) P |

- [ ] **DOC-14-F-001** In-space search + members sheet + ErrorState retry.

---

## DOC-14-G — Page `/knowledge/wiki/doc/[pageId]`

| | |
|---|---|
| Job | Read and edit one page |
| Gate | Universal route; `assertPageAccessible`; mutations exact keys |
| Primary | Edit (autosave) |
| Views | Editor / reader — not a collection |
| Pagination | Comments cursor if >100; versions on history route |
| Actions | Favorite, share, comments, history, info, cover, duplicate, move,
  lock (`manage`), save template, export (`export`), backlinks, delete |
| Forms | Metadata, share, move, comment, template save (DOC-06) |
| Back | Breadcrumb → Wiki |
| Mobile | Metadata + comments via sheets; no `xl`-only panel as the only path |
| States | L E D (ACL) not-found P conflict offline |

- [ ] **DOC-14-G-001** Gate Move/Export; mobile metadata; owner membership
      id; required/optional labels on metadata.

---

## DOC-14-H — History `/knowledge/wiki/doc/[pageId]/history`

| | |
|---|---|
| Job | Compare and restore a version |
| Gate | Page view; restore `kb:pages:update` |
| Primary | Restore (confirm) |
| Pagination | Cursor — **keep** |
| Back | That page |
| States | L E ∅ P |

- [ ] **DOC-14-H-001** Confirm restore uses `LoadingButton` + revision
      guard.

---

## DOC-14-I — Templates `/knowledge/wiki/templates`

| | |
|---|---|
| Job | Start from a starter or a saved org template |
| Gate | Nav: `templates:manage` **or** create-only starters. Saved-tab
  mutations `templates:manage` |
| Primary | Use template → new page |
| Views | Cards |
| Search / filters | `tab` (URL), `q` |
| Pagination | Cursor (today cap 200) |
| Card actions | Use; Delete saved (manage) |
| Back | Sidebar destination |
| States | L E ∅ (per tab) D P |

- [ ] **DOC-14-I-001** Search + cursor + split permission (starters vs
      manage).

---

## DOC-14-J — Reviews `/knowledge/wiki/reviews`

| | |
|---|---|
| Job | Approve, reject, and find expired reviews |
| Gate | `kb:reviews:view`; decide `kb:reviews:manage` |
| Primary | None (queue) |
| Views | Table + `mobileCard` |
| Search / filters | URL `status` (incl. derived **overdue**, D19), `type`, `q` |
| Pagination | Server cursor — **add**; pass `pagination` to DataTable |
| Row actions | Open page; Approve; Reject |
| Bulk | Approve / Reject (P0) |
| Forms | Note optional 2k; reason required 1–2k |
| Back | Sidebar destination |
| Denied | `NoPermissionState`, not EmptyState |

- [ ] **DOC-14-J-001** URL filters, derived overdue, pagination, bulk,
      denied UX.

---

## DOC-14-K — Import & Export `/knowledge/wiki/import`

| | |
|---|---|
| Job | Bring pages in and watch export jobs |
| Gate | Page if `import` **or** `export`; tabs hide independently |
| Primary | Choose files / Paste text (import tab) |
| Views | Forms + jobs table |
| Filters | `tab`, job `status` |
| Pagination | Server cursor — **remove** client slice of 100 |
| Forms | Paste title `*`, content `*`, space/parent optional, duplicate
  policy `*` (DOC-06) |
| Back | Sidebar destination |

- [ ] **DOC-14-K-001** Tab permission split + Zod paste + server job pager.

---

## DOC-14-L — Analytics `/knowledge/wiki/analytics`

| | |
|---|---|
| Job | See usage and knowledge gaps the actor is allowed to see |
| Gate | `kb:analytics:view` + record/space ACL |
| Primary | Date range apply; P1: create page / assign gap |
| Views | StatCardGrid + paginated tables |
| Filters | `from`, `to`, `spaceId` |
| Pagination | Cursor or “Open in Manage” — **add** |
| Remove | 7-col overflow grid; org-wide titles; inline locale dates |
| Back | Sidebar destination |
| Denied | `NoPermissionState` (already) |

- [ ] **DOC-14-L-001** Range + space ACL + pagination + `formatShortDate`.

---

## DOC-14-M — Trash `/knowledge/wiki/trash`

| | |
|---|---|
| Job | Restore or permanently delete; set retention |
| Gate | View own/allowed deleted (`pages:view` + ACL); restore `update`;
  purge/empty `purge`; retention `settings:manage` |
| Primary | Empty trash (purge, confirm) |
| Views | **Table** + `mobileCard` (replace card grid) |
| Search / filters | `q`, `deletedBy`, date |
| Pagination | Cursor — **signal hasMore** (today silent 100) |
| Row / bulk | Restore; Delete forever |
| Form | Retention days `*` 1–365 |
| Back | Sidebar destination |

- [ ] **DOC-14-M-001** Table + bulk + search + honest pager + Zod
      retention.

---

## DOC-14-N — Full search `/knowledge/wiki/search` **ADD P0**

| | |
|---|---|
| Job | See every ACL-visible match and act on it |
| Gate | Universal route; API `kb:pages:view` + ACL |
| Primary | Search (`q` required) |
| Views | Snippet list default; table allowed |
| Filters | `spaceId`, `status`, `contentType`, `owner` |
| Pagination | Cursor |
| Row / bulk | Open; favorite; archive; status; move; export |
| Back | Wiki Home |
| From | Quick find “View all results” |

- [ ] **DOC-14-N-001** Route, page, facets, bulk, Quick find link.

---

## DOC-14-O — Content management `/knowledge/wiki/manage` **ADD P1**

| | |
|---|---|
| Job | Find unhealthy pages and fix them in bulk |
| Gate | `kb:pages:manage` + record ACL |
| Primary | Health preset |
| Presets | Unowned, empty, stale, expired review, overexposed (public +
  org-wide), no verification |
| Views | Table + cards |
| Filters | Preset + `q` + space + status + owner |
| Pagination | Cursor |
| Bulk | Owner, verify, stale, archive, status |
| Back | Wiki Home |

- [ ] **DOC-14-O-001** Ship only after P0 list/bulk APIs exist.

---

## DOC-14-P — Research briefs **ADD/MOVE P1**

| | |
|---|---|
| List | `/knowledge/wiki/research-briefs` |
| Detail | `/knowledge/wiki/research-briefs/[briefId]` |
| Job | Run and read AI research reports |
| Gate | `kb:pages:view`; enqueue `kb:ai:generate` |
| Pagination | Existing cursor |
| Back | List ← detail; list is sidebar once moved |
| Remove | `/support/kb/research-briefs/**` after callers migrate |

- [ ] **DOC-14-P-001** Move + nav + delete old routes.

---

## DOC-14-Q — Build wiki

| Path | Job | Notes |
|---|---|---|
| `/build/[projectId]/wiki` | Project docs home | Same Home contract scoped by `projectId`; `backHref` project overview |
| `/build/[projectId]/wiki/[pageId]` | Project page | Same editor; link back to project wiki home |

- [ ] **DOC-14-Q-001** Project ACL on every list/get; no org-wide leak.
- [ ] **DOC-14-Q-002** Home back control when `projectId` set.

---

## DOC-14-R — Help centre (dual-run)

| Path | Job | Until cutover |
|---|---|---|
| `/support/kb` | CMS list | Add Documents nav; keep article model |
| `/support/kb/[articleId]` | Article editor | `backHref=/support/kb`; send `expectedContentRevision` |
| `/help/[orgId]` / `[slug]` | Public help | ACL is “published + public space” |

- [ ] **DOC-14-R-001** Nav discoverability (DOC-01-009).
- [ ] **DOC-14-R-002** Citation URLs never point a page id at `/support/kb`
      or an article id at `/knowledge/wiki/doc/`.

---

## DOC-14-S — Public wiki `/wiki/[shareToken]`

| | |
|---|---|
| Job | Read one explicitly shared page |
| Gate | Token; rate limit `public:kb` |
| Actions | None authenticated; P1 helpful/not-helpful |
| Back | None |
| Must not | Reveal siblings, comments marked internal, Ask KB |

- [ ] **DOC-14-S-001** Token invalid = 404; no private chrome leak.

---

## DOC-14-T — Aliases

| Path | Behavior |
|---|---|
| `/knowledge` | → `/knowledge/chat` |
| `/kb`, `/docs`, `/knowledge-base` | → `/knowledge/wiki` |
| `/knowledge/wiki/pages/:pageId` | → `/doc/:pageId` |
| `/ask` | → `/knowledge/chat` then REMOVE (D21) |

- [ ] **DOC-14-T-001** `/knowledge-base` and `/ask` redirects exist.

## DOC-14-V — Ask KB sources (sheet, not a route)

| | |
|---|---|
| Job | Manage files/notes used for retrieval |
| Surface | Sheet from Ask KB (not a wiki rail item) |
| Gate | List `kb:pages:view` + space ACL; create `kb:pages:create`; delete `kb:pages:delete` |
| Filters | `kind`, `status`, `spaceId` |
| Pagination | Existing cursor — **keep** |
| Actions | Upload, add note, delete, retry failed index, open quarantine (manager) |
| Must not | Org-wide unscoped list (DOC-07-011) |

- [ ] **DOC-14-V-001** Sources sheet uses space-scoped API; note form
      matches DOC-06.

## DOC-14-Q addendum — project history

- [ ] **DOC-14-Q-003** `/build/[projectId]/wiki/[pageId]/history` exists
      (DOC-01-019).

---

## DOC-14-U — Do not create

`/knowledge/wiki/recent` · `/favorites` · `/settings` · a second export
page · a Documents drive · a second calendar · HR documents under Wiki.

---

## Catalog Completeness

- [ ] **DOC-14-001** Every `page.tsx` under the in-scope trees appears
      above (KEEP / ADD / MOVE / BOUNDARY).
- [ ] **DOC-14-002** Each KEEP/ADD row has browser evidence at 375/768/1280
      before DOC-11 P0 (P1 rows excepted).

## Evidence Log

_Empty until lettered items close._
