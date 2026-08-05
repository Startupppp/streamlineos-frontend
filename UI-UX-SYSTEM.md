# StreamlineOS — UI/UX System v1.0

> The canonical, enforceable design spec. Every authenticated page, component, and token decision defers to it.
> Auth pages (`/signin`, `/signup`) and the landing page are **IMMUTABLE reference surfaces** — the app conforms to them.
> On visual matters this file is more specific than CLAUDE.md and wins.

---

## 1. Principles

1. **Density with restraint.** Power users live here 6–8h/day. 32–40px rows, 13px body, `px-2 py-1` cells — breathing through deliberate section separation, not random gaps.
2. **One accent, not a rainbow.** Neutral surfaces + neutral text + exactly one accent for primary actions and focus. Status colors are semantic, never decorative. Gradient text is marketing, not chrome.
3. **Consistent page anatomy.** Compact header → filter strip → body, on every screen. `PageWrapper` is the backbone; none deviates.
4. **Motion discipline.** Animation communicates where something came from and what changed. 150–250ms, GPU properties only, always respecting `prefers-reduced-motion`.
5. **Predictable states.** Every page handles loading, empty, error, sparse (2–5), and dense (50–500). Happy-path-only feels unfinished.

---

## 2. Palette

Slate-neutral base + a single blue accent, derived from the auth pages. "Vercel-meets-Stripe": near-white canvas, ink-black CTAs, blue-500 for interactive states and links.

```css
:root {
  /* ── Radius ── */
  --radius: 0.625rem;              /* 10px — components inherit via --radius-sm/md/lg/xl */

  /* ── Surfaces ── */
  --background:            #f8fafc;   /* slate-50 page canvas */
  --foreground:            #0b1220;   /* near-black primary ink */
  --card:                  #ffffff;
  --card-foreground:       #0b1220;
  --popover:               #ffffff;
  --popover-foreground:    #0b1220;
  --muted:                 #f1f5f9;   /* slate-100 */
  --muted-foreground:      #64748b;   /* slate-500 */
  --border:                #e2e8f0;   /* slate-200 */
  --input:                 #e2e8f0;
  --ring:                  #3b82f6;   /* blue-500 focus ring */

  /* ── Primary CTA (ink-style) ── */
  --primary:               #0b1220;   /* slate-900 */
  --primary-foreground:    #ffffff;

  /* ── Accent (neutral hover wash — shadcn item bg-accent, NOT brand blue) ── */
  --accent:                #f1f5f9;
  --accent-foreground:     #0f172a;
  --secondary:             #f1f5f9;
  --secondary-foreground:  #0b1220;

  /* ── Semantic status ── */
  --destructive:           #dc2626;
  --destructive-foreground: #ffffff;

  /* ── Brand (gradient text, onboarding, marketing only) ── */
  --brand-deep:            #1e40af;
  --brand-core:            #3b82f6;
  --brand-bright:          #60a5fa;
  --brand-cyan:            #06b6d4;
  --gradient-signature: linear-gradient(135deg, #1e40af 0%, #3b82f6 50%, #06b6d4 100%);

  /* ── Charts ── */
  --chart-1: #1d4ed8;  --chart-2: #06b6d4;  --chart-3: #60a5fa;
  --chart-4: #8b5cf6;  --chart-5: #ec4899;

  /* ── Sidebar (white panel) ── */
  --sidebar:               #ffffff;
  --sidebar-foreground:    #0b1220;
  --sidebar-primary:       #3b82f6;
  --sidebar-primary-foreground: #ffffff;
  --sidebar-accent:        color-mix(in srgb, var(--sidebar-primary) 10%, transparent);
  --sidebar-accent-foreground: #1e40af;
  --sidebar-border:        #e2e8f0;
  --sidebar-ring:          #60a5fa;
}

.dark {
  --background: #07091a;  --foreground: #f1f4fb;
  --card: #101428;        --card-foreground: #f1f4fb;
  --popover: #141a32;     --popover-foreground: #f1f4fb;
  --muted: #161e36;       --muted-foreground: #94a0c0;
  --border: rgba(148, 178, 245, 0.12);
  --input:  rgba(148, 178, 245, 0.14);
  --ring:   #60a5fa;

  --primary: #f1f4fb;     --primary-foreground: #07091a;
  --secondary: #1a2238;   --secondary-foreground: #f1f4fb;
  --accent: #1a2238;      --accent-foreground: #f1f4fb;
  --destructive: #ef4444; --destructive-foreground: #f1f4fb;

  --chart-1: #3b82f6;  --chart-2: #06b6d4;  --chart-3: #60a5fa;
  --chart-4: #8b5cf6;  --chart-5: #ec4899;

  --sidebar: #0b1024;              --sidebar-foreground: #c4cbe0;
  --sidebar-primary: #3b82f6;      --sidebar-primary-foreground: #ffffff;
  --sidebar-accent: color-mix(in srgb, var(--sidebar-primary) 14%, transparent);
  --sidebar-accent-foreground: #f4f7ff;
  --sidebar-border: rgba(148, 178, 245, 0.10);
  --sidebar-ring: #60a5fa;
}
```

### Semantic status mapping

| Semantic | bg | text | border | Usage |
|---|---|---|---|---|
| Success | `bg-emerald-50` | `text-emerald-700` | `border-emerald-200` | Completed, active, approved |
| Warning | `bg-amber-50` | `text-amber-700` | `border-amber-200` | Pending, expiring, caution |
| Destructive | `bg-red-50` | `text-red-700` | `border-red-200` | Error, rejected, overdue |
| Info | `bg-blue-50` | `text-blue-700` | `border-blue-200` | Draft, in-progress, informational |
| Neutral | `bg-slate-100` | `text-slate-700` | `border-slate-200` | Closed, archived |

Never use brand gradient colors for status badges; never repurpose status colors for decoration. Every light tint carries its `dark:` pairing (`dark:bg-X-500/10 dark:text-X-300 dark:border-X-500/30`).

### Accent vs brand — critical distinction

`--accent` is a **neutral hover wash**. shadcn primitives (DropdownMenuItem, SelectItem, CommandItem, CalendarDay…) apply `bg-accent text-accent-foreground` on hover/focus — setting it to a chromatic blue makes every menu hover illegible.

- **`bg-accent`** — shadcn hover/focus only. Never chromatic.
- **`--ring`** — focus rings.
- **`--brand-core` / `blue-600`** — links, active tints, icon highlights, info badges.
- **`bg-primary`** — ink CTAs. Not brand blue.
- **`--sidebar-accent`** — sidebar active item (10% blue tint), separate from global `--accent`.
- **Theme accents:** the shell ships 18 accent palettes that tint neutral chrome. Interactive accent surfaces (unread bars/dots, selection tints, active filters, count badges) use `bg-primary`, `bg-primary/5..15`, `border-l-primary`, `--ring` — **never hardcoded `blue-*`**. Literal blue survives only for semantic info and chart seeds.

### Border opacity

`border-border` at **full opacity** for all structural borders (card edges, table borders, sheet/dialog separators, field outlines). `border-border/60` only for hairline dividers inside dense rows or decorative separators — never on the outer boundary of a card, table, or panel.

### Per-module identity accent

One unified chrome across all modules. Each module's accent is used ONLY for identity moments — activity-bar icon tint, active nav indicator, module hero tint, chart seed — never buttons, hovers, or body text:

CRM/Sales `blue-600` · Build/PM `violet-600` · HR/People `emerald-600` · Inventory `amber-600` · Billing/Finance `cyan-700` · Support `rose-600` · Admin/Settings `slate-600`.

> **HR exception:** the HRMS gradient hero, colored tone tiles, and tinted section chrome are DESIRED and preserved — do not flatten HR to ink in conformance passes.

---

## 3. Typography

Geist via `next/font`. Do not introduce another sans-serif. The `cv02`/`cv03`/`cv04`/`cv11` stylistic alternates are active globally in `globals.css` — do not remove them.

| Role | Size | Weight | Class |
|---|---|---|---|
| Page title (default) | 18px | 600 | `text-lg font-semibold tracking-tight` |
| Page title (display) | 24–28px | 800 | `text-2xl font-extrabold tracking-[-0.02em]` |
| Section heading | 14px | 600 | `text-sm font-semibold` |
| Section sub-heading | 13px | 500 | `text-[13px] font-medium` |
| Body | 14px | 400 | `text-sm` |
| Table cell / dense body | 11px | 400 | `text-[11px]` |
| Label / input label | 13px | 500 | `text-[13px] font-medium` |
| Caption / eyebrow | 11px | 500 | `text-[11px] font-medium tracking-wider` |
| Table header | 10px | 700 | `text-[10px] uppercase tracking-wider font-bold` |
| Mono / numbers | 11–13px | 400–500 | `font-mono text-[11px]` |
| Badge / status | 10px | 500 | `text-[10px]` |

- **Headings:** `h1`–`h6` default to `letter-spacing: -0.02em` and weight 600 globally. `font-extrabold` only for `variant="display"` titles and marketing headings.
- **Tabular numerals:** every numeric table cell (amounts, counts, percentages, dates) renders `font-mono` or `tabular-nums`. Prevents column jitter and enables comparison by eye.

---

## 4. Spacing and Density

**Base unit 4px.** All spacing is a multiple of 4 — never `p-[7px]`, `mt-[13px]`, `gap-[5px]`.

| Page zone | Tailwind | | Card padding | Tailwind |
|---|---|---|---|---|
| Horizontal padding | `px-4 sm:px-6` | | Standard card | `p-4` |
| Header top / bottom | `pt-4` / `pb-2` | | Compact list card | `p-3` |
| Filter bar vertical | `py-2` | | Metric / stat card | `p-4 sm:p-5` |
| Content top / bottom | `pt-3` / `pb-6` | | Section header in card | `px-4 py-3` |

### Table density

| Mode | Row height | Cell padding | Font | When |
|---|---|---|---|---|
| **Condensed (default)** | `h-8` (32px) | `px-2 py-1` | `text-[11px]` | All data tables |
| Regular | `h-10` (40px) | `px-3 py-2` | `text-[13px]` | Detail panels, settings, reference lists |
| Relaxed | `h-12` (48px) | `px-4 py-3` | `text-sm` | Onboarding steps only |

Upgrade to regular only for multi-line row content. Never use relaxed in a main data view.

### Gap scale

`gap-1` icon+label · `gap-2` field stack / button group · `gap-3` filter bar & header actions · `gap-4` card grid · `gap-6` section separator · `gap-8` page sections (rare).

### Calculated heights — never hardcode

No `h-60`, `min-h-[260px]`, or fixed skeleton block heights. Heights derive from available space:
- Empty/error states fill the content area via a flex chain (`flex flex-col` ancestors + `flex-1 min-h-0` on the state), or `min-h-[calc(100vh-<real chrome>)]` when a flex chain is impractical.
- Scroll areas: `flex-1 min-h-0 overflow-y-auto`, never fixed px.
- Skeletons size themselves from the real components they mimic.

### No overlapped spacing

A container owns its padding once — children never re-add horizontal padding inside a padded parent, never combine `space-y-*` with child `mt-*`, and gaps come from ONE `gap-*` on the parent.

---

## 5. Page Anatomy

Every authenticated page uses `PageWrapper` (`components/ui/page-wrapper.tsx`). No page invents its own header, title row, or filter bar.

```tsx
interface PageWrapperProps {
  title: string;                    // Required. The h1. 2–3 words.
  subtitle?: React.ReactNode;       // Live count ("48 employees") or description.
  eyebrow?: string;                 // Uppercase module label ("HR / Onboarding").
  badge?: React.ReactNode;          // Meaningful status label — not a bare row count.
  actions?: React.ReactNode;        // Right-aligned CTAs, max 3.
  filters?: React.ReactNode;        // Renders the full-width filter bar.
  children: React.ReactNode;
  variant?: "default" | "display";  // display = module hero surfaces only.
  noInternalScroll?: boolean;       // Pages managing their own overflow (Kanban, map).
  filtersCollapseBreakpoint?: "sm" | "md";  // "md" for wide filter bars.
}
```

```
┌──────────────────────────────────────────────────────────┐
│ [eyebrow — 11px uppercase muted]                         │
│ [h1 — 18px semibold]  [badge]                            │
│ [subtitle — 13px muted, line-clamp-1]     [actions →]    │
├──────────────────────────────────────────────────────────┤
│ [filter bar]  [search] [selects] [date?]   [tools →]     │
├──────────────────────────────────────────────────────────┤
│ [page body — scrollable content area]                    │
└──────────────────────────────────────────────────────────┘
```

**Rules**
- **One `<h1>` per page** — the `title` prop. Never another inside children.
- **Subtitle as live count** on list pages ("48 employees") for instant orientation, always `line-clamp-1`.
- **Max 3 actions**, exactly one primary. Never stacked vertically.
- **Filter bar only when the page has filterable content.** With no filter bar, `PageWrapper` renders its own hairline divider — never add your own.
- **No `backHref` on a page that has its own sidebar nav entry.** Detail pages: back button (`ChevronLeft` + "Back to X"); breadcrumbs only at ≥3 levels. Never rely on the browser Back button.

**Responsive**

| Breakpoint | Title | Actions | Filters |
|---|---|---|---|
| < 640px | `text-base` semibold | Full-width row (`grid grid-flow-col auto-cols-fr`); a lone action goes full width | Sole filter fills width; multi-filter collapses into a **Drawer** |
| 640–1280px | `text-lg` semibold | Right-aligned row | Inline row |
| > 1280px | `text-lg` semibold | Right-aligned row | Single row, no wrap |

---

## 6. Filters and Toolbars

| Situation | Component |
|---|---|
| 2–4 mutually exclusive views of the same data | `Tabs` / segmented chips |
| 5+ status options or data-specific values | `Select` |
| Multiple independent facets | Filter bar, one `Select` per facet |
| Free-text search | `SearchInput` (`components/ui/search-input.tsx`), debounced ≥300ms — never a raw `Input` with a hand-placed icon |
| Date filtering | `DateRangePicker` or two `date` inputs — never free text |
| Bulk actions | Contextual toolbar, visible only when rows are selected |

**Sentinel-default Selects:** every filter `Select`'s first option is an "all" sentinel with a descriptive label (`<SelectItem value="all">All statuses</SelectItem>`). When "all" is selected the query param is removed from the URL, not set to `"all"`.

### Toolbar layout — h-9 canon

```tsx
<div className={FILTER_TOOLBAR_ROW}>            // components/ui/content-fill-panel.tsx
  <SearchInput … />
  <Select …><SelectTrigger className={FILTER_SELECT_TRIGGER} />…</Select>
  …more facets…
  <div className="ml-auto flex shrink-0 items-center gap-2">{/* export/secondary */}</div>
</div>
```

- All field controls (Input/SearchInput/SelectTrigger/DatePicker/combobox triggers) are the default **h-9 / text-sm** from `FIELD_CONTROL_CLASS` (`components/ui/field-control.ts`), already applied by the root primitives. **Never add local `h-8`, `h-10`, or `text-xs` overrides** at page/sheet/dialog level. The only sanctioned compact controls are established inline-cell/popover editors inside tables and cards.
- `FILTER_SELECT_TRIGGER` carries color chrome only (`border-input bg-card`) and intentionally **no height class**.
- `FILTER_TOOLBAR_ROW` is the only filter-row container: one row, `flex-nowrap`, `overflow-x-auto scrollbar-hide`, children `shrink-0`. **Filter rows never wrap** — on every viewport they stay one horizontally scrollable line. Never hide the overflow with `overflow-hidden`.
- **No outer card/panel around a filter row** — fields already carry `border-input bg-card`; a wrapper creates nested cards. The row sits in `PageWrapper`'s `filters` prop with no border, no background, and no extra horizontal padding.
- **Search is always leftmost**, status second, specific filters (assignee, date, type) after, export/secondary at `ml-auto`.
- When tabs share the line with search/filters/actions, use `PageTabsToolbar` (`components/ui/page-tabs-toolbar.tsx`).
- Filter-bar skeletons mirror this: one non-wrapping row of `h-9` blocks.

### Filter UX

- Filters always update the URL (`router.replace` + `useSearchParams`) so pages are shareable.
- Always reset pagination when a filter changes.
- Show an active-filter count badge on the mobile trigger when >2 filters are active.
- **Mobile overlays are Drawers.** Below `md`, any filter/display/menu panel that would open as a Popover or Sheet uses a Drawer — via `ResponsivePopover` (`components/ui/responsive-popover.tsx`). Never a raw `Popover`/`Sheet` for a mobile filter/menu collapse. Desktop/tablet unchanged; tiny 1–3 item menus and date pickers are exempt.

### Reference layout recipe

> Structure extracted from the virabha admin reference (read-only source `D:\projects\virabha\frontend`). Sizing follows the **h-9 canon above**, which supersedes virabha's `h-8`/`text-xs`.

```tsx
<PageWrapper title="…" filters={…} actions={…}
  noInternalScroll
  className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
  {/* stats row (shrink-0, mb-2) → bulk bar (conditional) → table card (flex-1 min-h-0) */}
</PageWrapper>
```

Filters render **above** the table card with no border and no background (`shrink-0`); the search block is `min-w-0 flex-1 lg:max-w-md`; selects sit in a `hidden sm:flex min-w-0 flex-[2]` group. Table card:

```tsx
<Card className="flex min-h-0 min-w-0 flex-1 flex-col gap-0 overflow-hidden py-0">
  <CardContent className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden p-0">
    <DataTable fillContainer … />
    {/* pagination: border-t, shrink-0 */}
  </CardContent>
</Card>
```

Non-fill-height pages (settings, detail sub-tables) use `<Card className="overflow-hidden"><CardContent className="p-0 overflow-x-auto">`.

---

## 7. Components

### Buttons

**One default-variant `<Button>` per view.** Never two primaries side by side.

| Variant | Visual | When |
|---|---|---|
| Default | slate-900 fill + white text | The single most important action (Create, Save, Submit) |
| Outline | `border-border bg-background hover:bg-muted` | Secondary (Export, Edit, Cancel) |
| Ghost | transparent, `hover:bg-muted` | Tertiary, icon-only |
| Destructive | `bg-destructive` | Delete confirm only, inside `AlertDialogAction` |

- Height `h-9` standard, `h-7` icon-only in table rows. Font `text-sm font-medium`.
- Press feedback is built into `Button` — never re-add `active:scale` per call site.
- **Every async button is `<LoadingButton isPending>`** (`components/ui/loading-button.tsx`) — never hand-roll `disabled` + spinner ternaries.

### Cards

```tsx
<div className="bg-card rounded-lg border border-border shadow-soft p-4">
```

- `rounded-lg` = `--radius` = 10px. `rounded-2xl`/`rounded-3xl` are marketing surfaces only.
- `shadow-soft` = `0 1px 3px rgba(0,0,0,.04), 0 4px 16px rgba(0,0,0,.04)`. No backdrop-blur or heavy shadows in the shell.
- Always `bg-card`, never `bg-white`. Translucent fills stay ≥75% card opacity with ≥70% borders.
- Clickable cards add `hover:shadow-medium transition-shadow cursor-pointer`.

### StatCard

`<StatCard>` / `<StatCardGrid>` (`components/ui/stat-card.tsx`) is the ONE stats component. **Anti-pattern:** bespoke `text-xl font-bold` divs over a label, or a bespoke `grid grid-cols-*` wrapper.

```tsx
<StatCardGrid cols={4}>
  <StatCard label="Active Users" value={42} icon={Users} tone="emerald" />
  <StatCard label="Pending" value={7} icon={Clock} tone="amber" />
</StatCardGrid>
```

- **Card:** `rounded-lg border border-border bg-card px-3 py-2.5` (~56px tall) — tinted icon square left (`h-8 w-8 rounded-md`), label + value stacked right. Label `text-[11px] font-medium text-muted-foreground` (no uppercase); value `text-lg font-semibold tabular-nums leading-tight`.
- **`tone`:** `default` slate (neutral) · `blue` (info/primary) · `emerald` (success) · `amber` (warning) · `red` (error) · `violet` (RBAC/privileged).
- **Optional props:** `delta` (↑/↓ vs prior period), `hint` (static context, shown only without `delta` — never both), `href` (wraps in a Link), `isLoading` (Skeleton in place of the value).
- **`StatCardGrid` is always ONE horizontal row** of equal-width cards: `gridTemplateColumns: repeat(N, minmax(10rem, 1fr))` from child count, `gap-3`, `[&>*]:min-w-0 [&>*]:h-full`. It is a **horizontal-scroll container at every breakpoint** (`overflow-x-auto scrollbar-hide touch-pan-x`, snap on mobile via `md:snap-none`) so the ROW scrolls and the PAGE never does. **Never `md:overflow-x-visible`**, never multi-row breakpoints, never wrap to a second row, never compress below ~10rem.

### Data tables

Use `DataTable` (`components/ui/data-table.tsx`) for all page-level list/admin tables — never hand-roll a raw shadcn `<Table>`. Engine is `@tanstack/react-table` v8, wrapped so consumers never import TanStack types.

| Prop | Type | Notes |
|---|---|---|
| `data` | `T[]` | required |
| `columns` | `DataTableColumn<T>[]` | required |
| `getRowKey` | `(row: T) => string \| number` | required |
| `isLoading` | `boolean` | skeleton rows matching column count |
| `emptyState` | `ReactNode` | rendered in a colspan cell |
| `pagination` | `{ pageSize? }` \| `{ mode: "server"; page; pageSize; total; onPageChange }` | |
| `selection` | `{ selected: Set<…>; onChange }` | adds the checkbox column |
| `footer` / `onRowClick` / `rowClassName` / `minWidth` / `className` | | |

```tsx
interface DataTableColumn<T> {
  key: string;
  header: string;
  cell: (row: T) => ReactNode;
  sortable?: boolean;
  sortValue?: (row: T) => string | number;
  className?: string;
  headerClassName?: string;
}
```

**Layout rule:** DataTable renders only the table card + pagination footer. It never renders search or filters internally — those live in `PageWrapper`'s `filters` prop. (`search`/`toolbar` props were removed; passing them is a compile error.)

**Table styling rules**
- Header: `sticky top-0 z-10 bg-muted/80 backdrop-blur-sm`, cells `text-[10px] uppercase tracking-wider font-bold px-2 py-1.5`.
- Rows: `h-8 hover:bg-muted/30 transition-colors`; cells `px-2 py-1 text-[11px]`.
- Row actions column `w-8` with an `h-7 w-7` ghost icon button.
- Numeric: `font-mono tabular-nums text-right`. Text: left, `truncate` when needed. Links: `text-blue-600 hover:underline` — no other link color.
- Status: `<Badge variant="outline" className="h-4 text-[9px] px-1.5 py-0 …">`.
- Empty body: one `<TableRow><TableCell colSpan={N} className="p-0">` wrapping `<EmptyState className="border-0 bg-transparent min-h-[40vh]">`.
- Scroll body `flex-1 min-h-0 overflow-auto` with `min-w-max` inner div; sticky footer showing "Showing X–Y of Z".
- **Pagination is the shared `TablePagination`** (`components/ui/table-pagination.tsx`) — never a per-feature prev/next footer.

### Sheets vs Dialogs

| Use case | Component | Max width |
|---|---|---|
| Quick confirmation | `AlertDialog` | auto |
| Short form (≤5 fields) | `Dialog` | `sm:max-w-md` |
| Long / multi-section form (6+) | `Sheet` right | `sm:max-w-md`–`lg` |
| Detail view | `Sheet` right | `sm:max-w-lg`–`xl` |
| Full-context edit | `Sheet` right | `sm:max-w-2xl` |
| Mobile navigation | `Sheet` left | `w-[17rem]` |

**Three-zone anatomy — header and footer never scroll, only the body does:**

```tsx
<SheetContent className="p-0 flex flex-col gap-0 overflow-hidden sm:max-w-lg">
  <div className="shrink-0 px-6 py-4 border-b">
    <SheetHeader>
      <SheetTitle className="text-base font-semibold">Sheet Title</SheetTitle>
      <SheetDescription className="text-[13px] text-muted-foreground">Optional.</SheetDescription>
    </SheetHeader>
  </div>

  <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4 space-y-4">
    {/* form fields */}
  </div>

  <div className="shrink-0 px-6 py-4 border-t">
    <div className="grid grid-cols-2 gap-2">           {/* equal-width footer buttons */}
      <SheetClose asChild><Button variant="outline">Cancel</Button></SheetClose>
      <Button type="submit">Save Changes</Button>
    </div>
  </div>
</SheetContent>
```

`SheetContent` **always** gets `p-0` — inner zones own their padding. `min-h-0` on the body is mandatory or the flex chain overflows. Three or more footer buttons use `grid-flow-col auto-cols-fr`; buttons never hug.

### Empty states

`<EmptyState>` (`components/ui/empty-state.tsx`), always filling available height (`flex-1 min-h-[40vh]`, or `min-h-[60vh]` full-page).

- **Order:** illustration/icon → title → description → one CTA. Never two CTAs.
- Full-page/main-region empties use a themed SVG from `components/illustrations` (shared `_shared.tsx` tokens; extend in the same style — unDraw may be adapted but always as recolored inline components, never raw downloaded SVGs). Compact/table-cell empties keep a lucide icon at `h-8 w-8 text-muted-foreground/40`.
- **Title:** short noun phrase ("No employees yet"). **Description:** one sentence.
- **Filter-empty vs data-empty:** with filters active → "No results match your filters." + "Clear filters"; with no data → the create action.

### Loading states

**Skeletons, never standalone spinners.**

- `<SkeletonTable rows={N} columns={M} />` for table pages; `<Skeleton>` shaped to the real content elsewhere.
- **Skeletons are a visual Xerox of the loaded page:** same sections, columns, and row density. Dense lists render ~9–12 rows (never 2–3 cards floating on a full page), fill remaining height (`flex-1`), use `StatCardGridSkeleton` for stat rows, one non-wrapping row of `h-9` blocks for filters, and `h-9` header action placeholders.
- `Loader2` is for button/inline mutation states only (via `LoadingButton`), never page level.
- Suppress the skeleton when data resolves in <200ms (`isPending && !data`).

### Error states

`<ErrorState>` (`components/shared`) with a friendly non-technical title, a `description` that may include a user-actionable error, an `onRetry` wired to `refetch`, and `className="flex-1"` to fill height. All user-facing text goes through `getErrorMessage` (CLAUDE.md §15).

### Badges

`<Badge variant="outline">` + semantic classes from §2.

| Context | Height | Padding | Font |
|---|---|---|---|
| Table row | `h-4` | `px-1.5 py-0` | `text-[9px]` |
| Card chip | `h-5` | `px-2 py-0.5` | `text-[10px]` |
| Page header / filter | `h-5` | `px-2 py-0.5` | `text-xs` |

### Phone input

Every phone/mobile/WhatsApp field uses `<PhoneInput>` (`components/ui/phone-input`, wraps `react-phone-number-input` with a searchable country selector) — never a bare `<Input type="tel">`. Default `defaultCountry="IN"`; emits E.164 via `onChange(value: string)`; spread `{...field}` for react-hook-form.

---

## 8. Icons

**Animated icons on ALL interactive/hoverable surfaces** — table row actions, dropdown/popover/sheet triggers, primary CTAs, clickable cards, nav items — from `@animateicons/react/lucide` (`XxxIcon`), hover-driven from the PARENT via `useAnimatedIcon()` (`hooks/common/use-animated-icon.ts` → `{ iconRef, hoverHandlers }`).

**Canonical helpers — never hand-wire the hook when one fits:**

1. **`AnimatedIconButton`** (`components/ui/animated-icon-button.tsx`) — THE way to put an animated icon in any shadcn `Button`. Wires the hook internally, forwards all Button props, works under `DropdownMenuTrigger asChild`. `iconSize` defaults to 14; pass 16 where the static icon was `h-4 w-4`.
   ```tsx
   <AnimatedIconButton icon={EllipsisIcon} variant="ghost" size="icon" className="w-7" aria-label="Actions" />
   <AnimatedIconButton icon={PlusIcon} iconClassName="mr-1.5" size="sm">New Item</AnimatedIconButton>
   ```
2. Plain `<button>` and `.map()`/DataTable-cell contexts (hooks can't run in cell callbacks): extract a small named `forwardRef` sub-component in the same file that calls `useAnimatedIcon()`.

**Names are not 1:1 with lucide** (`MoreHorizontal` → `EllipsisIcon`). Verify the export exists in `node_modules/@animateicons/react` before importing. **`PencilIcon` does not exist — keep `Pencil` static.**

**Static `lucide-react` — non-interactive only:** badges/status chips, empty states, informational rows, section titles, `Loader2`, decorative icons with no hover affordance (breadcrumb chevrons, field adornments, the `SearchInput` magnifier), and anything missing from the animated catalog.

**Banned:** `@phosphor-icons/react`, `react-icons`, any other icon library.

**Sizes:** sidebar nav / table row action / filter icon `h-4 w-4` · button icon `h-3.5 w-3.5` (small `h-3 w-3`) · card/stat icon `h-5 w-5` · empty-state icon `h-8 w-8` · full-page empty illustration `h-12 w-12`.

---

## 9. Motion

1. **Animate only GPU-composited properties** — `opacity`, `transform`. Never `width`, `height`, `padding`, `margin`, `top/left`.
2. **Fast and purposeful** — 150–250ms micro-interactions, 250–350ms panels/pages. Nothing over 400ms in app chrome.
3. **Always respect `prefers-reduced-motion`** via `useReducedMotion()`: keep opacity, drop translate and scale.
4. **Animate containers, never text nodes** (anti-aliasing artifacts).

| Context | Duration | Easing | Notes |
|---|---|---|---|
| Button hover color | 150ms | `transition-colors` | CSS only, no Framer |
| Button press | 100ms | `ease-out` | `whileTap={{ scale: 0.97 }}` |
| Dropdown / popover | 150ms | `ease-out` | `tailwindcss-animate` |
| Sheet slide-in | 200ms | `ease-out` | matched to its side |
| Dialog fade + scale | 150ms | `ease-out` | `fade-in-0 zoom-in-95` |
| Page transition | 300ms | `ease` | `.animate-fade-up` |
| List stagger | 80ms/item | `ease-out` | `delay: index * 0.08` |
| Toast | 200ms | `ease-out` | Sonner default |
| Skeleton shimmer | 1.5s | linear infinite | CSS |

```ts
export const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06 } },
};

export const fadeUp = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.22, ease: "easeOut" } },
};

export const pageEnter = {
  initial: { opacity: 0, x: 16 },
  animate: { opacity: 1, x: 0 },
  exit:    { opacity: 0, x: -16 },
  transition: { duration: 0.22, ease: "easeOut" },
};
```

```tsx
const shouldReduceMotion = useReducedMotion();
const itemVariants = shouldReduceMotion
  ? { hidden: { opacity: 0 }, visible: { opacity: 1 } }
  : fadeUp;
```

**Never animates:** sidebar width (CSS `transition-[width]` only) · table rows on data refresh · hover states (CSS `transition-colors` only — Framer would cost 10s of JS events/second on dense tables) · status badge changes.

---

## 10. Anti-Patterns (code review must flag)

| # | Banned pattern | Rule | Detect by |
|---|---|---|---|
| **AP-1** | `SheetContent` without `p-0` + an inner `p-4` wrapper (40px edge padding) | `SheetContent` always `p-0 flex flex-col gap-0`; inner zones own padding (§7) | `SheetContent` missing `p-0` |
| **AP-2** | Status filter as `<Tabs>` with 5+ triggers (overflows at 768px) | Tabs only for ≤4 major content categories; status filters use `<Select>` (§6) | `<TabsList>` with ≥5 triggers |
| **AP-3** | Gradient/`.brand-text` on titles, headers, labels, or nav inside the shell | Gradient text only on landing, `/signin`, `/signup`, onboarding hero. Shell text uses semantic tokens | `brand-text`/`brand-sweep`/`gradient-signature` under `app/(authenticated)/` or `features/` |
| **AP-4** | `rounded-2xl`/`rounded-3xl` on shell cards, tables, inputs, sheets | `rounded-lg` cards/panels, `rounded-md` inputs/tables, `rounded-xl` bottom sheets + onboarding only | those classes under `app/(authenticated)/` |
| **AP-5** | A ≥50-row list page with no search and no status filter | Every filterable list page has at minimum search + status `Select` (§6) | list-page `PageWrapper` with no `filters` prop |
| **AP-6** | A page rendering its own `<div>` header instead of `PageWrapper` | Every authenticated page uses `PageWrapper`; `noInternalScroll` pages still embed it (§5) | `<h1>` in `app/(authenticated)/` outside `PageWrapper` |
| **AP-7** | `{isLoading && <Loader2 className="animate-spin" />}` as the page loading state | Page loading shows `<SkeletonTable>`/`<Skeleton>` matching the real shape; `Loader2` is button-only (§7) | `animate-spin` as a direct child of a page's root return |
| **AP-8** | `text-[#3b82f6]` or `style={{ backgroundColor: '#0b1220' }}` | All colors reference tokens; only semantic status families may be literal Tailwind colors. No hex/RGB in JSX (§2) | arbitrary bracket color values or `style` color props |

---

## 11. Conformance Checklist (per page)

Spec details live in §2–§10; these are the items most often missed.

- [ ] All three of loading / empty / error implemented — not just the happy path
- [ ] Empty and error states **fill** available height (flex chain), no hardcoded heights anywhere
- [ ] Skeleton mirrors the real layout (row count, columns, `h-9` filter blocks) — no page-level `animate-spin`
- [ ] Every query gated by `useCan("<the endpoint's exact permission key>")` (CLAUDE.md §11)
- [ ] Filters update the URL; pagination resets on filter change; server-side pagination via `TablePagination`
- [ ] Field controls left at the `h-9` root standard — no local `h-8`/`text-xs` overrides
- [ ] Mobile: sole filter and sole action fill width; multi-filter collapses into a **Drawer**, not a Popover/Sheet
- [ ] No raw IDs rendered anywhere — names/titles only (CLAUDE.md §15)
- [ ] Interactive icons animated via `AnimatedIconButton`/`useAnimatedIcon`; async buttons are `LoadingButton`
- [ ] Colored tints carry their `dark:` pairing; no hardcoded `blue-*` on theme-accent surfaces
- [ ] Numeric table cells `font-mono tabular-nums`
- [ ] Tested at 375 / 768 / 1280; icon-only buttons have `aria-label`; everything keyboard-navigable
- [ ] No `any`, no `@ts-ignore`, no casts to silence TS
- [ ] Real data renders — if an API fails, fix the API/hook; demo org has seed rows for every page **and its detail routes**

---

## Appendix — Shell Architecture

```
h-dvh flex flex-col overflow-hidden
├── [TrialBanner — shrinks to 0 when inactive]
├── [CommandPalette — Portal, z-50]
└── flex-1 flex min-h-0
    ├── aside [Sidebar — w-[17rem] / w-[3.5rem] collapsed, hidden md:flex]
    │   ├── Logo + workspace switcher
    │   ├── Primary nav (≤7 items)
    │   ├── Module nav sections
    │   └── User / settings footer
    └── div [Content — flex-1 min-w-0 flex flex-col overflow-hidden]
        ├── GlobalHeader [h-10 shrink-0 border-b px-4]   (hidden below md)
        └── main [flex-1 min-w-0 flex flex-col overflow-hidden]
            └── div [flex-1 min-h-0 overflow-auto flex flex-col pb-16 md:pb-0]
                └── [PageWrapper — fills remaining height]
                    ├── Header zone [shrink-0 px-4 sm:px-6 pt-4 pb-2]
                    ├── Filter zone [shrink-0]
                    └── Content zone [flex-1 min-h-0 overflow-y-auto]

Mobile: [Sheet — left, w-[17rem]] for nav · [MobileModuleBottomNav — fixed bottom, z-40, pb-safe] · [MobileShellFab]
```

### Navigation ownership

- Home is the universal employee workspace. Group it as Overview, Communication, For Me, and Company; groups may collapse, but their destinations remain permission-filtered and keyboard accessible.
- `For Me` uses canonical `/me/*` routes and remains visible independently of paid-module enablement. It includes only the signed-in person's time off, attendance, expenses, pay, and employment documents.
- Announcements and the people directory are company-wide reading surfaces. Their creation or administration controls may still require an owning-module permission.
- Module-specific administration never appears in Home. Recruitment/interviews, HR employee administration, payroll operations, accounting operations, and product delivery remain inside their owning module sidebar.
- Desktop sidebar, mobile drawer, mobile module bottom navigation, product switcher, and command palette all consume the same filtered navigation model; never maintain parallel hard-coded destination lists.
