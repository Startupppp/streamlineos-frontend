# DOC-03 — Sidebar Information Architecture and Reuse

## Outcome

Desktop wiki rail, mobile wiki drawer, Documents product sidebar, mobile
bottom tabs, command palette, and Quick find consume **one** destination
model. Every item a customer sees is a real, permitted route.

## Current Source Findings

| Defect | Evidence |
|---|---|
| Wiki rail desktop-only | `wiki-shell.tsx:132` |
| Templates, Import, Spaces, Trash always visible | `wiki-sidebar-nav.tsx:90-117, 243` |
| Labels “Private” / “Shared” | `wiki-sidebar-nav.tsx:109-110` |
| New page not gated on `kb:pages:create` | `wiki-shell.tsx:36-48, 140` |
| Product sidebar is only Ask KB + Wiki | `sidebar-nav-groups-knowledge-support.ts:167-180` |
| Help centre / research briefs orphaned | No nav group entry |
| Favorites hidden when rail collapsed | `wiki-shell.tsx:92` |
| ⌘K on wiki should be Quick find only | Confirm single handler (DOC-01 / tests) |

## Documents Product Sidebar (global)

Shown on `/knowledge/chat` and non-wiki Documents routes. Hidden on
`/knowledge/wiki/**` (Wiki rail replaces it).

| Order | Label | href | Gate |
|---|---|---|---|
| 1 | Ask KB | `/knowledge/chat` | Universal |
| 2 | Wiki | `/knowledge/wiki` | Universal |
| 3 | Help centre | `/support/kb` | `kb:articles:view` (dual-run only) |
| 4 | Research briefs | current or moved path | `kb:pages:view` until P1 move |

Mobile bottom nav stays **Ask KB + Wiki** (`MAX_MOBILE_MODULE_TABS`). Help
centre and briefs live in the Menu drawer, not a third tab.

## Wiki Rail / Drawer (one model)

### Primary

| Label | href | Gate |
|---|---|---|
| Ask KB | `/knowledge/chat` | Universal |
| Wiki | `/knowledge/wiki` | Universal |

### Library

| Label | href | Gate |
|---|---|---|
| My pages | `/knowledge/wiki/private` | Universal |
| Shared with me | `/knowledge/wiki/shared` | Universal |
| Spaces | `/knowledge/wiki/spaces` | `kb:spaces:view` |

Space **detail** remains universal once the actor can open that space
(record ACL). The list route stays gated.

### Manage (omit empty group)

| Label | href | Gate |
|---|---|---|
| Templates | `/knowledge/wiki/templates` | Read/use: `kb:pages:create` (starters + “Use”). Save/edit/delete: `kb:templates:manage`. Route allows create **or** manage; Saved-tab mutations still manage-only. |
| Reviews | `/knowledge/wiki/reviews` | `kb:reviews:view` |
| Import & Export | `/knowledge/wiki/import` | `kb:pages:import` **or** `kb:pages:export` (show if either; tabs self-gate) |
| Analytics | `/knowledge/wiki/analytics` | `kb:analytics:view` |
| Content management | `/knowledge/wiki/manage` | `kb:pages:manage` — P1, omit until shipped |
| Research briefs | wiki path | `kb:pages:view` — P1, omit until moved |

### Footer

| Label | Behavior | Gate |
|---|---|---|
| Quick find | Opens dialog, not a route | Universal |
| Trash | `/knowledge/wiki/trash` | `kb:pages:view` (see DOC-01-007); purge actions still `kb:pages:purge` |

### Dynamic sections (not routes)

| Section | Data | Gate |
|---|---|---|
| Favorites | `GET /kb/pages/favorites` | Universal; show empty-omit |
| Page tree | `GET /kb/pages/tree` | Record ACL; lazy-load children if tree exceeds budget (DOC-04) |

## Mobile Contract

- Below `md`, the wiki rail is a **left Drawer** (`w-[17rem]`) opened from
  the header Menu / “Wiki” control — the same filtered items, favorites, and
  tree.
- Product sidebar stays hidden on wiki paths.
- Ask KB / Wiki bottom tabs remain the two-item switcher.
- Quick find is reachable from the drawer footer and from the header search
  action.

## Command Palette

- On `/knowledge/wiki/**`, ⌘K and the header Search action open Wiki Quick
  find. Exactly one handler.
- Elsewhere, ⌘K opens the global command palette, which may deep-link into
  Wiki destinations using this same model.

## Components to Reuse (do not invent)

| Need | Canonical |
|---|---|
| Page chrome | `PageWrapper`, `PageSection` |
| Filter row | `FILTER_TOOLBAR_ROW`, `SearchInput`, `FILTER_SELECT_TRIGGER` |
| Table | `DataTable` + `mobileCard` |
| Pagination | `TablePagination`, `useCursorPager`, `CursorPageControls` |
| Form shells | `EntityFormSheet`, `EntityFormDialog` |
| Overlays | `AppSheet`, `ResponsivePopover`, `ConfirmDialog`, `UnsavedChangesDialog` |
| States | `EmptyState`, `ErrorState`, `LoadingState`, `NoPermissionState` |
| Buttons | `LoadingButton`, `AnimatedIconButton` |
| Stats | `StatCard`, `StatCardGrid` |
| Mobile nav chrome | `Drawer` (left, `w-[17rem]`) |
| Cards | `CONTENT_PANEL_SOLID` / `WikiPageCard` (`rounded-xl`) |
| Editor | `PlateDocumentEditor` |
| Chat | `ChatBubble`, `TypingBubble` |
| AI | `AiActionsMenu`, `AiUsageChip` |
| Status | `statusToneClasses`, `SemanticBadge` |
| Dates | `lib/date-utils` — never `toLocaleDateString` |
| Confirm archive | `HierarchyArchiveDialog` pattern for spaces |

Wiki-specific keepers: `WikiShell`, `WikiSidebarNav`, `WikiPageCard`,
`PageTree`, `QuickFindDialog`, `PlateDocumentEditor`. Do not copy them into
Build; project wiki imports the feature.

## Todos

- [ ] **DOC-03-001** Single destination factory consumed by `WikiSidebarNav`,
      mobile Drawer, product sidebar (Documents group), and command-palette
      Documents section. No parallel arrays.
- [ ] **DOC-03-002** Gate every Manage / Library admin item on the exact key.
      Hide an empty Manage group.
- [ ] **DOC-03-003** Relabel Private → My pages, Shared → Shared with me.
- [ ] **DOC-03-004** Gate New page on `kb:pages:create`. Hide collapsed and
      expanded create chrome when denied.
- [ ] **DOC-03-005** Mobile Drawer mirroring the desktop rail, including
      Quick find and Trash.
- [ ] **DOC-03-006** Add Help centre (and briefs, while they live under
      Support) to the Documents product group.
- [ ] **DOC-03-007** `sidebar-permission-coverage` (or wiki-specific sibling)
      fails if a non-universal wiki destination lacks `requiredPermission`.
- [ ] **DOC-03-008** Browser proof: member with only page view sees Ask KB,
      Wiki, My pages, Shared, Quick find, Trash (own deletes only);
      manager sees Manage items; mobile can reach every permitted item.

## Acceptance

- [ ] No nav link predicts Access Denied.
- [ ] Mobile and desktop expose the same permitted destinations.
- [ ] No new sidebar primitive that duplicates `Drawer` / `PageWrapper` /
      filter constants.

## Evidence Log

_Empty until DOC-03-001 through DOC-03-008 close._
