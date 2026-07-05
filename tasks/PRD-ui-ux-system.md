# StreamlineOS UI/UX System (Canonical)

**Status**: Source of truth  
**Last updated**: 2026-07-01  
**Applies to**: `frontend/` (Next.js App Router)

## Purpose

StreamlineOS currently suffers from an “AI generated / random colors / inconsistent spacing” feel. This document defines the **single canonical UI/UX system** so every page ships with consistent:

- **Density** (compact, not airy)
- **Spacing** (no double-padding)
- **Color usage** (tokens only; no ad-hoc palettes)
- **Interaction states** (hover/active/focus)
- **Layouts + states** (loading/empty/error are mandatory)

## Canonical references (do not deviate)

- **Design tokens + global utilities**: `frontend/globals.css` (Tailwind v4 tokens live here; there may be no `tailwind.config.*`.)
- **Auth density + interactions**: `/signin` and `/signup`
  - `frontend/app/(auth)/layout.tsx`
  - `frontend/app/(auth)/signin/page.tsx`
  - `frontend/app/(auth)/signup/page.tsx`
- **Primary page structure**: `PageWrapper` + `PageSection`
  - `frontend/components/ui/page-wrapper.tsx`
- **Global shell + scroll model**:
  - `frontend/components/layout/dashboard-shell.tsx`
- **UI primitives** (Radix/shadcn-style):
  - `frontend/components/ui/button.tsx`
  - `frontend/components/ui/dialog.tsx`
  - `frontend/components/ui/sheet.tsx`

## Non-goals

- Redesigning product IA/navigation.
- Reworking module-specific workflows beyond making them consistent with this system.

---

## 1) Design tokens & color rules (no invented colors)

### 1.1 Token source of truth

**All colors, radius, fonts, and semantic roles come from** `frontend/globals.css` via CSS variables and Tailwind v4 token mapping (`@theme inline`).

Use **semantic utilities** backed by tokens:

- Surfaces: `bg-background`, `bg-card`, `bg-muted`
- Text: `text-foreground`, `text-muted-foreground`
- Borders/ring: `border-border`, focus ring via `ring-ring/*` and `border-ring`
- Primary CTA: `bg-primary text-primary-foreground`

Avoid:

- Hardcoded hex colors.
- Ad-hoc “pretty gradients” on random pages.
- Repurposing brand colors for status semantics.

### 1.2 Brand vs semantic colors (rule of thumb)

- **Brand** is for *identity* (logos, subtle decoration, occasional top-of-funnel highlight).
- **Semantic** colors are for *meaning* (success/warn/error/info/status).
- Status badges/alerts should use standard Tailwind semantics (emerald/amber/red/blue) or existing UI components that already encode them.

### 1.3 Links and accent color

Prefer:

- `<Button variant="link" />` (canonical inline link styling), or
- existing link styling used in auth pages (blue link with underline on hover).

Do not make random page-specific link colors.

---

## 2) Global layout rules (sidebar, header, and scroll)

### 2.1 One scroll area (default)

**The layout must feel stable**: sidebar and global header remain fixed; the main content scrolls.

Canonical shell behavior is defined in `frontend/components/layout/dashboard-shell.tsx`:

- Sidebar: non-scrolling panel (`aside`), fixed height, internal content manages itself.
- Main: a single scroll container wraps routed page content.

### 2.2 Page content scroll: when to use internal vs outer scroll

`PageWrapper` supports an internal scroll region by default.

- **Default**: Use `PageWrapper` with its internal scroll region and keep page root as a simple flex column (no extra full-viewport containers).
- **When the page owns scrolling** (virtualized grids, split panes, kanban with horizontal scrolling, calendars):
  - Use `PageWrapper noInternalScroll` and implement a single scroll region inside the content area.

Avoid:

- Two independent vertical scrollbars (outer shell scroll + inner content scroll) unless the inner scroll is intentionally constrained (e.g., a table body with sticky header).

---

## 3) Spacing + density system (no double padding)

### 3.1 Canonical density values (from `/signin` + `/signup`)

Use these as defaults across the app:

- **Primary control height**: `h-9` (buttons/inputs)
- **Compact toolbar height**: `h-8` (filters, secondary controls)
- **Card radius**: `rounded-xl` (auth cards), `rounded-md` for table containers; larger cards may use `rounded-2xl` only when consistent with existing usage.
- **Common vertical rhythm**: `space-y-3` inside forms and toolbars.

### 3.2 “Double padding” rule

If a container already provides padding (sheet/dialog content, page content padding, cards), **do not add another full padding wrapper inside it**.

Preferred patterns:

- Page-level padding comes from `PageWrapper`.
- Section-level spacing uses `space-y-*` and separators, not nested `p-6` blocks.
- In sheets, keep one padding layer (either the sheet itself, or the inner content — never both).

---

## 4) Canonical page templates (screen-by-screen guidance)

This section defines how pages should be structured. Use these templates as the default for **every** module screen.

### 4.1 List pages (index routes)

**Goal**: predictable header + toolbar + content, with mandatory states.

- **Wrapper**: `PageWrapper`
  - `title`: module entity (e.g. “Contacts”, “Vendors”, “Tickets”)
  - `subtitle`: short purpose or count (“123 contacts”)
  - `actions`: right side; keep it compact and consistent
  - `filters`: use the `PageWrapper.filters` slot

**Header structure**:

- Title row: title + optional badge + right-side actions (max 2–4 controls)
- Filter toolbar: search (left), select filters, view toggles, and “Clear” when active

**Filters**:

- Search input: `h-8`, left icon, optional clear button.
- Use `TabsList` for primary “segments” (All/Unread/etc) when applicable.
- Use `.filter-chip` utility for chip filters where appropriate (defined in `frontend/globals.css`).

**Content options** (choose one; avoid mixing without a clear view toggle):

- **Data table** (default for dense lists)
  - Container: `border border-border rounded-md`, with sticky header row when scrolling.
  - Table body may scroll inside the container (one intentional nested scroll).
- **Cards grid** (for people/objects where visual scanning matters)
  - Grid: `grid gap-4 md:grid-cols-2 lg:grid-cols-3`
  - Card hover: subtle border + shadow lift; keep contrast readable.

**Mandatory states**:

- Loading: skeleton matching final layout (table skeleton for tables, list skeleton for lists).
- Empty: full-height (at least `min-h-[40vh]`), centered, with a primary action when appropriate.
- Error: friendly error with a retry action.

### 4.2 Detail pages (entity routes)

**Goal**: strong “record identity” + clear actions + scannable sections.

- **Wrapper**: `PageWrapper`
  - Prefer `variant="display"` when the page represents a primary entity (Project, Deal, Employee, Product).
- **Actions**: edit, share, export, status changes; keep destructive actions in menus.
- **Content structure**:
  - Tabs for major sections (Overview / Activity / Files / Settings), or
  - `PageSection` blocks for smaller pages.

**Recommended section pattern**:

- Use `PageSection` for subsection headers (title/description/actions).
- Inside a section, use one surface container (card/panel) and then rely on spacing/separators.

### 4.3 Settings pages (module settings or org settings)

**Goal**: calm, predictable forms with explicit save semantics.

- **Wrapper**: `PageWrapper` (default title sizing is correct).
- Group settings into 2–6 `PageSection`s.
- Prefer `Dialog` for small edits (single object, few fields) and `Sheet` for larger forms.

### 4.4 Wizard pages (multi-step onboarding/setup)

**Goal**: compact steps, smooth transitions, consistent controls.

- Page uses the same base density as auth (`space-y-3`, `h-9`, small helper text).
- Each step:
  - Clear step title + subtitle
  - Inline validation messages
  - Primary action bottom aligned where possible

Use existing motion utilities and global animation classes (e.g. `animate-fade-up`) rather than new custom animations.

---

## 5) Component patterns (canonical behaviors)

### 5.1 PageWrapper (required for most pages)

`PageWrapper` defines the canonical page chrome:

- Header padding: `px-4 sm:px-6 pt-4 pb-2`
- Optional filter bar: sticky-ish row with `bg-card/95 backdrop-blur-sm` and border
- Content padding: `px-4 sm:px-6 pt-3 pb-6`

Rules:

- Put **search + filters** in the `filters` prop (not in the main children).
- Use `actions` for top-right controls; avoid placing actions inside filter bars unless they are clearly “filter-adjacent”.
- Choose `noInternalScroll` only when the page owns its own scroll.

### 5.2 FilterBar (pattern)

Even when module-specific components exist, filters should follow one consistent shape:

- One row that wraps on small screens (`flex flex-wrap items-center gap-2/3`)
- Inputs `h-8` and `text-xs` / `text-sm`
- Clear filters appears only when active
- Use `.filter-chip` for chip filters (consistent hover + active styling)

### 5.3 DataTable (pattern)

Dense tables should follow:

- Sticky header: `sticky top-0 z-10 bg-muted/80 backdrop-blur-sm`
- Compact text: `text-[11px]` body; `text-[10px] uppercase tracking-wider` for headers
- Row hover: `hover:bg-muted/30 transition-colors`
- Pagination/footer: fixed at bottom of table container with `border-t`

### 5.4 Cards grid (pattern)

Card grids should:

- Use consistent grid breakpoints and `gap-4`
- Use token-backed surfaces (`bg-card`, `border-border`) unless a module has an established special surface that is already used consistently
- Put overflow actions into an inline menu (`Button variant="ghost" size="icon" className="h-7 w-7"`)

### 5.5 Inline actions

Preferred:

- Primary actions as buttons in header `actions`
- Per-row actions in `DropdownMenu` via an icon button
- Destructive actions:
  - in menus, styled as destructive (`text-destructive`), and
  - confirmed with `AlertDialog` when irreversible

---

## 6) Sheet vs Dialog rules (decision + padding)

### 6.1 Decision rule

Use **Dialog** when:

- The interaction is short and self-contained (confirmations, quick edits, < ~6 fields).
- The user should stay mentally “on” the current page.

Use **Sheet** when:

- The form is long, multi-section, or requires supporting context (side panels, attachments, inline tables).
- The user benefits from a larger surface and scroll inside the sheet.

### 6.2 Padding rules (avoid double padding)

Canonical components:

- `DialogContent` has a built-in padding (`p-6`) and a compact mobile treatment.
- `SheetContent` defaults to `p-6`.

Rules:

- If you keep the default `p-6`, the inner content should use **spacing** (`space-y-*`) not a second card with its own `p-6`.
- If you need a full-bleed layout (e.g., mobile navigation sidebar), set `SheetContent className="p-0"` and apply padding inside the child layout once.

---

## 7) Icon rules (consistency + libraries)

### 7.1 Libraries

- **Prefer** `@animateicons/react` for new UI iconography when an equivalent icon exists in the approved AnimateIcons sets.
- If an icon is not available in AnimateIcons, use **`lucide-react`**.

Do not introduce new icon libraries for feature work.

### 7.2 Sizes + alignment

- Buttons (default): icons `size-4` (already enforced in `Button` base styles)
- Tight controls (chips, inline menus): `h-3`–`h-3.5`
- Keep icons vertically centered and avoid custom inline transforms unless absolutely necessary.

---

## 8) Hover / active / focus rules (must be predictable)

### 8.1 Buttons

`frontend/components/ui/button.tsx` is the single source of truth for button variants. Prefer using variants (`default`, `outline`, `ghost`, `link`, `destructive`, `brand`) instead of ad-hoc class overrides.

### 8.2 Focus-visible

Every interactive element must have a visible focus state:

- Prefer components that already apply `focus-visible` rings.
- Custom clickable elements must add a ring consistent with the token ring (`ring-ring/40` and a 3px ring).

### 8.3 Tables and rows

- Row hover must not reduce text readability.
- Sticky headers must have a background (`bg-muted/80` + blur) so content doesn’t visually bleed through.

---

## 9) Loading / empty / error states (mandatory)

Every route must render all states:

- **Loading**: skeletons that match final layout; avoid spinners as the primary loading UI.
- **Empty**: fill space and guide next action; avoid tiny empty blocks floating in content.
- **Error**: short message + retry; avoid raw error dumps.

Prefer existing components already in the repo (e.g., `ErrorState`, `EmptyState`, module-specific skeletons) instead of inventing new ones.

---

## 10) Accessibility checklist (ship-blocking)

- Skip link present and reachable (already implemented in auth layout and dashboard shell patterns).
- All inputs have labels (no placeholder-only forms).
- Errors are announced:
  - inline error text has `role="alert"` where appropriate
  - inputs have `aria-invalid` and `aria-describedby`
- Keyboard navigation:
  - dialogs/sheets trap focus (Radix)
  - menus reachable and operable
- Focus-visible styling is present on all interactive elements.
- Color contrast remains readable in hover/active states.

---

## 11) Performance checklist (default expectations)

- Prefer Server Components; `"use client"` only where needed.
- Debounce search/filter inputs (300ms is canonical in current pages).
- Avoid rerender storms: keep handlers named and stable (`useCallback`) when passed deep.
- Lazy-load heavy interactive panels (dynamic imports already used in the shell).
- Prefer skeletons over spinners to reduce layout shift.

---

## 12) Per-module structural mapping (quick guide)

This section tells you what module pages should “look like” structurally (not pixel-perfect).

### 12.1 Projects (PM)

- List pages (`/projects`, backlogs, sprints lists): **PageWrapper + FilterBar + DataTable**.
- Project detail (`/projects/[projectId]`): `PageWrapper` with strong header, view switcher (board/list/table/etc), and a single primary content region; avoid nested scroll bugs.
- Ticket detail: open as **Dialog** when quick (preview) and **Sheet** when it’s a full edit or multi-section view; keep one padding layer.

### 12.2 CRM

- Entity lists (Leads/Contacts/Deals/Companies/Tasks): PageWrapper with a consistent “list toolbar”:
  - search, view toggle (table/cards), and create action.
- Detail pages: header actions + tabbed sections (activity/notes/files/related).
- Inline row actions: always in a `DropdownMenu` icon button; destructive actions require confirmation.

### 12.3 HR

- Employee/admin lists: PageWrapper + dense table + filters (department, location, status).
- Onboarding and approvals: wizard-style steps with compact spacing and clear primary CTA.
- Long “profile” style pages: sections via `PageSection` and avoid stacking too many nested cards.

### 12.4 Inventory

- Operational lists (Stock movements, Transfers, Orders): PageWrapper + strong filters + DataTable.
- Transactional detail pages (PO/SO/Transfers): clear header + status badge + right-side actions; sections for line items, history, notes.
- Reporting pages: charts/tables must use token colors and consistent panel surfaces; never introduce new palettes.

---

## Appendix: Useful global utilities (already defined)

From `frontend/globals.css` (prefer these over inventing new CSS):

- `surface-soft` (page background)
- `shadow-soft`, `shadow-medium`, `shadow-noir`
- `press-scale` (active press micro-interaction)
- `filter-chip` (filter pill styling)
- `compact` (density mode utility; use intentionally)

