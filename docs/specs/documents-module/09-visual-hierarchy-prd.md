# DOC-09 — Visual Hierarchy, Tokens, and Accessibility

## Outcome

Customers can tell the page, the card, and the overlay apart in light and
dark themes. Wiki is usable at 375, 768, and 1280. Denied, empty, error, and
loading states are distinct. Documents stays ink-first — no HR rich-surface
exception.

## Current Source Findings

| Defect | Evidence |
|---|---|
| Light `--card` and `--popover` are both `#ffffff` | `frontend/globals.css` ~L82-84 |
| `SheetContent` default `bg-background` | `frontend/components/ui/sheet.tsx:81` |
| `DialogContent` default `bg-background` | `frontend/components/ui/dialog.tsx:81` |
| Metadata sheet header/footer `bg-background` | `page-metadata-sheet.tsx:187-193, 386` |
| Wiki main canvas + sidebar `bg-card/50` | `wiki-shell.tsx:130-132` |
| Sticky editor chrome `bg-background` on canvas | `page-document.tsx:274` |
| Ask KB composer `bg-background/60` on `bg-card` | `knowledge-base-page.tsx:308, 377` |
| Page cards `rounded-lg` vs space cards `rounded-xl` | `wiki-page-card.tsx:65` vs `space-card.tsx:29` |
| Desktop-only rail | `wiki-shell.tsx:132` |
| Editor right panel `hidden xl:flex`, no mobile drawer | `page-right-panel.tsx:58` |
| Nested interactives in space card | `space-card.tsx:65-107` |
| Ask KB page uses `Loader2` as page load | `knowledge-base-page.tsx:333-336` |
| Errors without retry | Shared, Private, Spaces, Reviews |
| Analytics 7-col grid overflow | `knowledge-analytics-page.tsx` ~L71 |
| Inline `toLocaleDateString` | analytics page |
| Axe tests cover chat only | `__tests__/kb-documents-a11y.test.tsx` |

## Five-Level Surface Stack (D12)

| Level | Token / class | Use |
|---|---|---|
| 0 Canvas | `bg-background` | Wiki main, Ask KB page, list page body |
| 1 Rail | `bg-card` (full opacity) + `border-border` | Wiki sidebar, mobile Drawer |
| 2 Card | `bg-card` + `border-border` + `shadow-sm` + `rounded-xl` | Page cards, space cards, table shells, `CONTENT_PANEL_SOLID` |
| 3 Overlay | `bg-popover` + `border-border` + `shadow-lg` + dimmed scrim | Sheet, Dialog, Confirm |
| 4 Nested | `bg-muted` wells **inside** overlay, or a second popover | Metadata field groups, menus |

**Do not** paint Sheet/Dialog with `bg-background`. If light `--popover`
must stay white for menus, Sheets still need a visible lift: border +
stronger shadow + scrim `bg-black/40` (or token equivalent) so they never
merge with a white card on a near-white canvas.

If a token change is required, prefer lifting `--popover` in light mode
slightly off `#ffffff` **or** introducing an `--overlay` token used only by
Sheet/Dialog. Do not invent hex in components.

## Wiki-Specific Chrome

- Sidebar: `bg-card`, not `bg-card/50` on canvas (50% reads as the same
  color).
- Editor sticky header: `bg-card/95` (or `bg-background` **with**
  `border-b` and backdrop only if contrast holds) — content must not show
  through.
- Ask KB thread sits on `bg-card`; composer is `bg-muted` or a second card
  strip, not `bg-background/60`.
- Public share page uses the same canvas/card rules without the wiki rail.

## Component Reuse (visual)

Follow DOC-03’s reuse table. Additional visual rules:

- One primary `Button` per view.
- Status via `statusToneClasses` / `SemanticBadge` — no new `bg-X-50`
  literals.
- Dates via `lib/date-utils`.
- Cards: `rounded-xl`, `hover:border-primary/40 hover:shadow-md` when
  clickable.
- Density: `h-9` controls; tree icon buttons may stay compact on desktop
  but must meet 44×44 on touch (`md` breakpoint).

## States

| State | Component |
|---|---|
| Loading | Skeletons matching the real layout — never a page-level `Loader2` |
| Empty | `EmptyState` + one CTA |
| Filter-empty | “No results match your filters” + Clear filters |
| Error | `ErrorState` + `onRetry` + `getErrorMessage` |
| Denied | `NoPermissionState` with the exact key |
| Sparse (2–5) | Normal list, no special empty |
| Offline / conflict | Existing `UnsavedChangesDialog` / conflict card |

## Responsive / A11y

- 375 / 768 / 1280, light and dark, for every KEEP/ADD page.
- Wiki Drawer below `md` (DOC-03).
- Metadata / backlinks / comments available below `xl` via sheets (comments
  and history already have sheets; metadata must too).
- Reviews and analytics tables pass `mobileCard`.
- No interactive control inside a wrapping `<Link>`.
- Icon-only controls have `aria-label`.
- Keyboard: tree, Quick find, card menu, bulk bar.
- `prefers-reduced-motion` honored (existing motion tokens).

## Todos

- [ ] **DOC-09-001** Change shared `SheetContent` / `DialogContent` default
      from `bg-background` to `bg-popover` (repo-wide; verify HR/Build
      overlays still contrast).
- [ ] **DOC-09-002** Stop overriding metadata sheet chrome back to
      `bg-background`.
- [ ] **DOC-09-003** Wiki rail `bg-card`; editor sticky opaque; Ask KB
      composer distinct from thread.
- [ ] **DOC-09-004** `WikiPageCard` `rounded-xl` + `CONTENT_PANEL_SOLID`.
- [ ] **DOC-09-005** Mobile metadata Drawer/Sheet; analytics `mobileCard`
      or stacked rows; no 7-col overflow.
- [ ] **DOC-09-006** Replace Ask KB page spinner with chat skeletons.
- [ ] **DOC-09-007** Error retry + `NoPermissionState` sweep (DOC-01-008).
- [ ] **DOC-09-008** Expand axe coverage: wiki home, page editor, sidebar,
      search, trash table, one sheet.
- [ ] **DOC-09-009** Browser proof light/dark at 375/768/1280 for Home,
      page, Share popover, metadata sheet, Confirm delete, mobile Drawer.

## Acceptance

- [ ] A screenshot (or recorded browser check) shows canvas ≠ card ≠
      sheet in light mode.
- [ ] Mobile can open nav, search, metadata, and comments without the
      desktop rail or `xl` panel.
- [ ] No AP-7 page spinner remains under `features/wiki`.

## Evidence Log

_Empty until DOC-09-001 through DOC-09-009 close._
