# DOC-05 — Cards, Row Actions, and Bulk Actions

## Outcome

Every card and table row exposes the actions the customer workflow needs, and
only those the actor may perform. Selection + bulk mutations are real,
authorized, and honest about partial success. Configurable properties are
named; locked properties stay locked.

## Current Source Findings

| Defect | Evidence |
|---|---|
| `WikiPageCard` is a link only | `wiki-page-card.tsx:62-87` — no menu |
| Tree favorite can add, not remove | `page-tree-item.tsx:135-141` always `isFavorite: false` |
| Move / Export HTML ungated | `page-document-toolbar.tsx:186-208` |
| Space Edit/Delete nested inside `<Link>` | `space-card.tsx:65-107` |
| Space lifecycle is hard delete | `spaces-page.tsx:79-87` |
| Trash is a card grid, no selection | `trash-page.tsx:203-207` |
| Zero wiki bulk endpoints | grep `bulk` in `backend/src/modules/kb` = 0 |
| Reviews table has no `selection` | `reviews-page.tsx:439` |
| Trust/status hidden on Home cards | Only Shared shows a status badge |

## Configurable vs Locked

### Configurable by the actor (when they hold the key)

| Property | Where | Key |
|---|---|---|
| Title, icon, cover | Editor / card hover | `kb:pages:update` |
| Favorite | Card, tree, toolbar | `kb:pages:view` |
| Status (draft / in_review / published / archived) | Metadata, bulk | `kb:pages:update` |
| Owner | Metadata, bulk | `kb:pages:manage` to reassign others |
| Space | Metadata, move, bulk | `kb:pages:update` + space ACL |
| Visibility | Share popover | `kb:pages:update` |
| Verification / stale | Metadata, bulk | `kb:pages:update` or `manage` |
| Content type | Metadata | `kb:pages:update` |
| Template save | Toolbar | `kb:templates:manage` |
| View density (cards / list / table) | List pages | Preference / URL — P0 where DOC-04 allows |

### Locked (not customer-configurable)

| Property | Why |
|---|---|
| `id`, `orgId`, `createdAt`, `createdBy` | Identity |
| `projectId` | Immutable outside the Build project-move flow (D08) |
| `contentRevision` / `aclRevision` | Concurrency / security |
| `sourceArticleId` | Migration provenance |
| Public share token | Server-issued; rotate/revoke only |
| Record ACLs derived from space membership | Not a card toggle |
| Plan / module entitlement | Billing |
| Help-centre slug uniqueness | CMS rules until cutover |

### Not configurable as a “database property system” in P0

Notion-style arbitrary page properties and multi-view databases are **P2**.
P0 uses the fixed columns above. P1 Content management can *filter* on those
columns; it does not let tenants invent new ones.

## Card / Row Action Matrix

`•••` = overflow menu. Hide unauthorized items. Backend still enforces.

| Action | Home card | My/Shared card | Tree row | Trash row | Space card | Template card | Review row | Page toolbar |
|---|---|---|---|---|---|---|---|---|
| Open | Yes | Yes | Yes | Yes (if restorable preview) | Yes | Use template | Open page | — |
| Favorite / unfavorite | Yes | Yes | Yes (toggle) | No | No | No | No | Yes |
| Copy link | Yes | Yes | Yes | No | Yes | No | Yes | Share popover |
| Share / visibility | Menu | Menu | Menu | No | No | No | No | Yes |
| Duplicate | Menu | Menu | Yes | No | No | No | No | Yes (`create`) |
| Move | Menu | Menu | Menu | No | No | No | No | Yes (`update`) |
| Rename | — (open) | — | Yes | No | Edit sheet | No | No | Inline title |
| Add child | No | No | Yes (`create`) | No | No | No | No | No |
| Archive | Menu | Menu | Menu | No | **Archive** (D06) | No | No | Metadata |
| Restore | No | No | No | Yes (`update`) | Restore | No | No | Unarchive |
| Delete (soft) | Menu | Menu | Yes | — | No | Delete saved (`templates:manage`) | No | Yes (`delete`) |
| Delete forever | No | No | No | Yes (`purge`) | No | No | No | No |
| Verify / mark stale | Menu (manage) | Menu | No | No | No | No | Approve/Reject | Metadata |
| Export | Menu (`export`) | Menu | No | No | No | No | No | Menu (`export`) |
| Save as template | No | No | No | No | No | — | No | Yes |
| Members | No | No | No | No | Manage | No | No | No |

Home / Shared cards today implement **none** of the menu. That is the P0 gap.

## Views Recap (cards vs table)

See DOC-04. Trash and Reviews are tables. Home defaults to cards with a
list/table toggle. Space directory stays cards. Do not put kanban on pages
in P0.

## Bulk Actions

Selection appears only on table (or list) views that declare it in DOC-14.

### P0 bulk surfaces

| Surface | Actions | Permission per id |
|---|---|---|
| Trash | Restore, Delete forever | `update` / `purge` |
| Reviews | Approve, Reject | `kb:reviews:manage` |
| Full search | Archive, Change status, Move space, Export, Favorite | exact page key |
| Content management (P1, may slip if P0 search ships first) | Reassign owner, Verify, Mark stale, Archive, Change status | `manage` / `update` |

### P1 bulk surfaces

| Surface | Actions |
|---|---|
| Wiki Home / My pages (table view) | Archive, status, move, favorite |
| Spaces table | Archive / restore |

### Never bulk

- Permanent delete outside Trash
- Visibility → public (too easy to overexpose; keep single-page Share)
- Lock / unlock (manager, one page at a time)
- Empty trash is a single confirmed action, not a selection

### Bulk API contract

```
POST /kb/pages/bulk
{ "action": "archive" | "restore" | "purge" | "status" | "move" | "owner" | "verify" | "favorite" | "unfavorite" | "export",
  "pageIds": number[],   // max 100
  "payload": { ... } }   // action-specific, Zod

Response: { "results": [ { "pageId", "ok", "code?", "message?" } ],
            "succeeded": n, "failed": n }
```

Reviews may share the pattern at `POST /kb/page-reviews/bulk`.

Rules:

- Tenant + per-record ACL inside one transaction-friendly loop; do not
  fail the batch because one id is denied — mark that id failed.
- Idempotent: restoring an already-restored page is `ok`.
- Return a toast + inline summary. Do not silently drop failures.
- ConfirmDialog for archive / purge / reject; typed confirm for empty trash
  and purge > 10.
- Invalidate the exact list + tree + search keys (DOC-07).

## Todos

- [ ] **DOC-05-001** Extend `WikiPageCard` with a permission-filtered `•••`
      menu (favorite, copy link, share, duplicate, move, archive, delete).
      Actions sit **outside** the card `<Link>`.
- [ ] **DOC-05-002** Show status / verified / private badges on Home and My
      pages cards, not only Shared.
- [ ] **DOC-05-003** Tree favorite is a toggle; fix `isFavorite`.
- [ ] **DOC-05-004** Gate toolbar Move on `kb:pages:update`, Export on
      `kb:pages:export`.
- [ ] **DOC-05-005** Space card: stop nesting buttons in `<Link>`; replace
      Delete with archive/restore (D06).
- [ ] **DOC-05-006** Trash → `DataTable` + `selection` + `mobileCard` +
      bulk restore / purge.
- [ ] **DOC-05-007** Reviews `selection` + bulk approve/reject with note/
      reason validation (DOC-06).
- [ ] **DOC-05-008** Backend `POST /kb/pages/bulk` (and reviews sibling)
      with e2e allow / deny / partial / cross-tenant tests.
- [ ] **DOC-05-009** Full search selection uses the same bulk endpoint.
- [ ] **DOC-05-010** `rounded-xl` + `CONTENT_PANEL_SOLID` on page and space
      cards (DOC-09).

## Acceptance

- [ ] A member without update never sees edit/delete/move on a card.
- [ ] Bulk of 3 allowed + 2 denied pages reports 3/2 and mutates only the 3.
- [ ] Space archive never hard-deletes.

## Evidence Log

_Empty until DOC-05-001 through DOC-05-010 close._
