# StreamlineOS — UI/UX System v2.0

> The canonical, enforceable design spec **and code contract**. Every authenticated page, component, and token decision defers to it.
> Auth pages (`/signin`, `/signup`) and the landing page are **IMMUTABLE reference surfaces** — the app conforms to them.
> On visual matters this file is more specific than CLAUDE.md and wins.
>
> **There is no `UI-CONTRACT.md`.** This file is it — a second design document would drift. §12–§17 are the code-level
> half: overlay rules, form/error contract, data-layer contract, structure, an import index, and the conflicts register.
> **§18 is the screen-template catalog** — nine copy-pasteable archetypes (list+table, list+cards, detail+tabs,
> settings section, hub, board, overlays, states, data contract), each extracted from a named conformed file. Build a
> new screen from §18 and it will match by construction; the scroll chain at the top of §18 is the single most
> common source of layout bugs.
> §12–§17 were extracted from **Build, Accounting and Inventory** (2026-08-10); every claim carries a `file:line`.
> A `> **Correction (v2.0)**` block marks a place where v1.0 described something the code does not do — those are
> the ones most likely to be wrong in existing screens.

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
>
> **Administration shares that exception (living rule, 2026-08-11).** `/settings/*` follows the HRMS treatment, so
> the rich-surface kit is shared rather than HR-local — `components/shared/rich-surface.tsx`, re-exported from
> `features/hr/shared/hr-ui.tsx` under the `Hr*` names. For **HR and Administration only**, `rounded-2xl` and
> `backdrop-blur` are sanctioned and override DS-001 / AP-4 below. Every other module stays ink-first at
> `rounded-xl`. Structural rules (fill chain, `h-9` control canon, `LoadingButton`, `getErrorMessage`, a11y) are
> **not** relaxed — HR itself conforms to those, so Administration must too.

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

Page chrome is owned by exported constants (`components/ui/content-fill-panel.tsx`) — **never re-declare page padding at a call site**:

| Constant | Value | Line |
|---|---|---|
| `PAGE_CHROME_X` | `px-4 sm:px-6 lg:px-8` | `:9` |
| `PAGE_CHROME_BOTTOM` | `pb-0` — bodies meet the shell edge; Ask OS / FABs float above | `:12` |
| Header zone | `pt-2 pb-3 sm:pt-3 sm:pb-3`, or `pt-3.5 pb-2` with `actionsInline` | `page-wrapper.tsx:102` |
| Filter zone | `pb-3` + `PAGE_CHROME_X` | `page-wrapper.tsx:167-170` |

| Card padding | Tailwind |
|---|---|
| Standard card | `p-4` |
| Compact list card | `p-3` |
| Metric / stat card | `p-4 sm:p-5` |
| Section header in card | `px-4 py-3` |

### Table density

**The implemented density is `h-10` / `px-2 py-2` / `text-sm`** — set by the primitives, not by call sites:

| Slot | Class | Source |
|---|---|---|
| `TableHead` | `h-10 px-2 text-left align-middle text-sm font-medium text-muted-foreground whitespace-nowrap` | `components/ui/table.tsx:79` |
| `TableRow` | `hover:bg-muted/50 data-[state=selected]:bg-muted border-b transition-colors` | `components/ui/table.tsx:66` |
| `TableHeader` (in `DataTable`) | `sticky top-0 z-10 bg-muted/50 border-b border-border` | `components/ui/data-table.tsx:318`, `:414` |
| Skeleton row / cell | `h-10` · `px-2 py-2 text-sm` | `components/ui/data-table.tsx:358`, `:360` |

Do not re-declare these at the call site. A row needing more height gets it from multi-line cell content, not an `h-*` override. Anything denser than `h-10` is not implemented — do not specify it in a design and do not hand-roll it.

> **Correction (v2.0):** v1.0 documented a `h-8` / `px-2 py-1` / `text-[11px]` "condensed default" and a `text-[10px] uppercase tracking-wider font-bold` header. Neither exists in the primitives. The table above is the ground truth.

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
// components/ui/page-wrapper.tsx:11-32 — verbatim
interface PageWrapperProps {
  title?: React.ReactNode;          // The h1. Optional — omit for chromeless pages.
  subtitle?: React.ReactNode;       // Live count ("48 employees") or description.
  badge?: React.ReactNode;          // Meaningful status label — not a bare row count.
  backHref?: string;                // Labeled Back link left of the title.
  onBack?: () => void;              // Back button (handler). Ignored when `leading` is set.
  backLabel?: string;               // a11y label for backHref/onBack. Default "Back".
  leading?: React.ReactNode;        // Custom left control; overrides backHref/onBack.
  actions?: React.ReactNode;        // Right-aligned CTAs, max 3.
  filters?: React.ReactNode;        // Renders the full-width filter bar.
  filtersClassName?: string;
  actionsInline?: boolean;          // Actions on the title line (tighter pt-3.5 pb-2).
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
  noInternalScroll?: boolean;       // Pages managing their own overflow (Kanban, map).
  variant?: "default" | "display";  // display = module hero surfaces only.
}
```

Title classes are owned by the component (`page-wrapper.tsx:54-57`) — never restyle the `h1`:
- `default` → `text-base sm:text-lg font-semibold tracking-tight text-foreground leading-tight`
- `display` → `font-display text-xl sm:text-2xl lg:text-[1.7rem] font-extrabold tracking-[-0.02em] leading-tight`

`badge` renders as `bg-primary/10 border-primary/20 text-[11px] tabular-nums` (`:130`). A string `title` is auto-wrapped in `<TruncatedText>`; a `ReactNode` title is not.

> **Correction (v2.0):** `eyebrow` and `filtersCollapseBreakpoint` do **not exist** — v1.0 documented them and omitted seven real props. `title` is optional. Do not pass `eyebrow`.

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
- **Filter bar only when the page has filterable content.** `PageWrapper` renders **no divider** in either case (verified: no border element in `page-wrapper.tsx`) — separation comes from the header's `pb-3` and the body surface's own border. Never add a manual `border-b` to fake one.
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

**`rounded-xl` is the shell card radius.** Two sanctioned surfaces — pick by whether you need the primitive's sub-components:

```tsx
// 1. The <Card> primitive (components/ui/card.tsx:10) — with CardHeader/CardContent/CardFooter
"bg-card text-card-foreground flex flex-col rounded-xl border border-border/70 shadow-noir transition-all duration-200"

// 2. A plain panel — import the constant, never retype it
import { CONTENT_PANEL_SOLID } from "@/components/ui/content-fill-panel";  // :21
"rounded-xl border border-border bg-card shadow-sm"
```

**Radius scale** (`globals.css:62-65,72`, `--radius: 0.625rem`): `rounded-sm` 6px · `rounded-md` 8px · `rounded-lg` 10px · `rounded-xl` 14px. Inputs and tables are `rounded-md`; cards and panels are `rounded-xl`; `rounded-2xl`/`rounded-3xl` stay marketing-only (AP-4).

**Shadow tokens** (`globals.css:274-291`, all defined as plain utility classes):

| Token | Value | Status |
|---|---|---|
| `shadow-sm` | Tailwind default | **Canonical for page panels** — 257 files |
| `shadow-noir` | `0 1px 2px rgba(15,23,42,.04), 0 8px 24px -10px rgba(15,23,42,.12), 0 0 0 1px rgba(15,23,42,.04)` | Baked into `<Card>` — 27 files |
| `shadow-soft` | `0 1px 3px rgba(0,0,0,.04), 0 4px 16px rgba(0,0,0,.04)` | **Deprecated** — 1 file. Do not use in new code |
| `shadow-medium` | `0 4px 6px -1px rgba(0,0,0,.07), 0 10px 32px -4px rgba(0,0,0,.06)` | **Deprecated** — 1 file |

- Always `bg-card`, never `bg-white`. Translucent fills stay ≥75% card opacity with ≥70% borders — `border-border/70` (as `<Card>` uses) is compliant; anything thinner is not.
- Clickable cards add `hover:border-primary/40 hover:shadow-md transition-all cursor-pointer`. No backdrop-blur or heavy shadows in the shell.

> **Correction (v2.0):** v1.0 specified `rounded-lg` + `shadow-soft` for cards. The primitive, `CONTENT_PANEL_SOLID`, CLAUDE.md §14, and usage (135 `rounded-xl` vs 81 `rounded-lg`) all say `rounded-xl`; `shadow-soft` is effectively dead. §2's "never `/60` on a card's outer boundary" also contradicted the primitive's `/70` — the rule is **≥70%**, not full opacity.

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

Props verbatim from `components/ui/data-table.tsx:66-97`:

| Prop | Type | Notes |
|---|---|---|
| `data` | `T[]` | required |
| `columns` | `DataTableColumn<T>[]` | required |
| `getRowKey` | `(row: T, index: number) => string \| number` | required — takes **index too** |
| `isLoading` | `boolean` | skeleton rows matching column count |
| `emptyState` | `ReactNode` | rendered in a colspan cell |
| `pagination` | `{ pageSize?; onPageSizeChange? }` \| `{ mode: "server"; page; pageSize; total; onPageChange; onPageSizeChange?; pageSizeOptions? }` | **always pass this** (§23 windowing) |
| `selection` | `{ selected: Set<string \| number>; onChange; isRowSelectable? }` | adds the checkbox column |
| `sortState` | `{ field: string \| null; direction: "asc" \| "desc"; onChange }` | **server-side sort** — omit for client sort |
| `mobileCard` | `(row: T, index: number) => ReactNode` | replaces the table below `sm` to avoid 375px overflow |
| `search` | `{ value; onChange; placeholder? }` | exists, but see the layout rule below |
| `toolbar` | `ReactNode` | exists, but see the layout rule below |
| `onRowClick` / `footer` / `minWidth` / `className` / `rowClassName` | | `rowClassName: (row, index) => string` |

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

**Layout rule:** search and filters live in `PageWrapper`'s `filters` prop, above the table card. `DataTable` renders only the table + pagination footer.

> **Correction (v2.0):** v1.0 claimed `search`/`toolbar` "were removed; passing them is a compile error." **They still exist** (`data-table.tsx:81-88`) and compile. The rule is a convention, not a type error — so it must be enforced in review. Do not pass `search`/`toolbar` in new code; a page needing a table-local toolbar is a bulk-action bar, which belongs above the card.

**Table styling rules** — the primitives own density (§4); these are the call-site rules:
- Row actions column `w-8` with an `h-7 w-7` ghost icon button.
- Numeric: `font-mono tabular-nums text-right`. Text: left, `truncate` when needed. Links: `text-blue-600 hover:underline` — no other link color.
- Status: `<Badge variant="outline">` sized per §7 Badges.
- Empty body: one `<TableRow><TableCell colSpan={N} className="p-0">` wrapping `<EmptyState className="border-0 bg-transparent min-h-[40vh]">`.
- Scroll body `flex-1 min-h-0 overflow-auto` with `min-w-max` inner div.
- **Fill chain:** a table filling the page body needs `className="flex-1 min-h-0"` on `DataTable` and a `flex min-h-0 flex-1 flex-col` ancestor chain, or the surface stops short of the shell edge.

**Pagination — two components, and they are not interchangeable:**

| Component | Path | Use |
|---|---|---|
| `DataTablePagination` | `components/shared/data-table-pagination.tsx` | What `DataTable` renders internally (`data-table.tsx:19`). Adds page-size + first/last. Do not mount it yourself. |
| `TablePagination` | `components/ui/table-pagination.tsx` | Every **non-`DataTable`** paginated surface (card grids, boards, custom lists). |

Never hand-roll a per-feature prev/next footer, and never hardcode `?page=1&limit=100` in a hook (CLAUDE.md §14).

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

### Lifecycle confirmations

- Organization hierarchy records are archived and restored; they are never permanently deleted from the UI. All six hierarchy pages use the shared `HierarchyArchiveDialog` built on `ConfirmDialog`, with clear reversible-impact copy rather than irreversible-delete language.
- A failed archive must not dismiss its confirmation. Dependency conflicts switch the open dialog to a blocked state that lists each dependency and its count, explains how to resolve it, hides the archive action, and states that no data changed.
- Parent selectors never offer archived, disabled, or retired units for new assignments. After create, edit, archive, or restore, invalidate the shared hierarchy query prefix so the list, overview, chart, and dependent selectors update together.

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

## 12. Overlay Decision Tree

Extracted from Build / Accounting / Inventory usage. **Always use the lowest rung that suffices.** Escalating past the first rung that fits is a violation, not a style choice.

```
Does the action change exactly ONE field on a record already on screen?
├─ YES → does it need a choice from a bounded option set?
│        ├─ NO  → RUNG 1: inline / in-place edit          (no overlay at all)
│        └─ YES → RUNG 2: anchored Popover                (ResponsivePopover → Drawer < md)
└─ NO  → how many fields, and does the user need surrounding context?
         ├─ ≤5 fields, context not needed → RUNG 3: Dialog        (EntityFormDialog)
         ├─ 6+ fields OR multi-section OR context stays visible
         │                                 → RUNG 4: Sheet right  (EntityFormSheet)
         ├─ Read-only detail of one record → RUNG 4: Sheet right  (AppSheet)
         ├─ Irreversible / lifecycle action → ConfirmDialog        (any field count)
         └─ Creating a substantial entity, or a workspace → RUNG 5: full page route
```

| Rung | Component | Path | Max width |
|---|---|---|---|
| 1 — inline edit | `card-inline-fields` pattern | `features/build/views/card-inline-fields.tsx` | n/a |
| 2 — popover | `ResponsivePopover` | `components/ui/responsive-popover.tsx` | trigger width (`INLINE_POPOVER_MIN_CLASS`) |
| 3 — dialog form | `EntityFormDialog` | `components/shared` | `sm:max-w-md` |
| 3 — dialog content | `AppDialog` | `components/shared` | `sm:max-w-md` |
| 4 — sheet form | `EntityFormSheet` | `components/shared` | `sm:max-w-md`–`lg` |
| 4 — sheet content | `AppSheet` | `components/shared` | `sm:max-w-lg`–`xl` |
| — confirm | `ConfirmDialog` | `components/ui/confirm-dialog.tsx` | auto |
| — unsaved guard | `UnsavedChangesDialog` | `components/ui/unsaved-changes-dialog.tsx` | auto |

**Hard rules**
- **A single-field transform never opens a Sheet or Dialog.** If it does, the rung is wrong.
- Below `md`, every rung-2 popover and rung-3/4 filter or menu panel becomes a **Drawer** (§6). Date pickers and 1–3 item menus are exempt.
- Rung 3 vs 4 is decided by field count (≤5 / 6+), not by which felt easier to build.
- A destructive action is always `ConfirmDialog destructive` — never a bare `Dialog` with a red button.
- Hierarchy records archive, never delete: `HierarchyArchiveDialog` over `ConfirmDialog` (§7).

---

## 13. Forms and Errors — code contract

### Stack

**react-hook-form + Zod, always.** `zodResolver` from `@hookform/resolvers/zod`. No uncontrolled ad-hoc forms, no manual `useState` field soup.

### The two form shells

Prefer these over hand-wiring `useForm`. Both take the resolver and render children as a function of the form (`components/shared/entity-form-sheet.tsx:*`, `entity-form-dialog.tsx:*`):

```tsx
interface EntityFormSheetProps<TInput extends FieldValues, TOutput extends FieldValues = TInput> {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  resolver: Resolver<TInput, unknown, TOutput>;
  defaultValues: DefaultValues<TInput>;
  onSubmit: SubmitHandler<TOutput>;
  isSubmitting?: boolean;
  submitLabel?: string;
  cancelLabel?: string;
  side?: "right" | "left" | "top" | "bottom";   // Sheet only
  className?: string;
  resetOnOpen?: boolean;
  children: (form: UseFormReturn<TInput, unknown, TOutput>) => ReactNode;
}
```

`EntityFormDialogProps` is identical minus `side`.

### Canonical call site

`features/build/sprints/create-sprint-dialog.tsx:26-74` — copy this shape exactly:

```tsx
const createSprint = useCreateSprint();

const handleSubmit = (data: CreateSprintInput) => {
  createSprint.mutate(payload, {
    onSuccess: () => { toast.success("Sprint created successfully"); setOpen(false); },
    onError: (error) => { toast.error(getErrorMessage(error)); },
  });
};

<EntityFormSheet<CreateSprintInput>
  open={open} onOpenChange={setOpen}
  title="Create new sprint"
  resolver={zodResolver(createSprintSchema)}
  defaultValues={{ name: "", startDate: format(new Date(), "yyyy-MM-dd"), … }}
  onSubmit={handleSubmit}
  isSubmitting={createSprint.isPending}
  submitLabel="Create sprint"
>
  {(form) => <SprintFormFields form={form} />}
</EntityFormSheet>
```

Fields live in a sibling `*-form-fields.tsx` taking `{ form }`; the schema in a sibling `*-schema.ts` exporting the schema + `z.infer` type.

### Field primitives

`components/ui/form.tsx` — shadcn Form, re-exported names only:

| Export | Renders | Line |
|---|---|---|
| `Form` | `FormProvider` | `:19` |
| `FormField` | `Controller` + name context | `:32` |
| `FormItem` | `div.grid.gap-2` — the field wrapper | `:83` |
| `FormLabel` | `Label` + `data-[error=true]:text-destructive`, auto `htmlFor` | `:90` |
| `FormControl` | `Slot` wiring `id`, `aria-describedby`, `aria-invalid` | `:107` |
| `FormDescription` | `p.text-muted-foreground.text-sm` — helper text | `:126` |
| `FormMessage` | `p.text-destructive.text-xs.leading-snug.break-words`, `role="alert" aria-live="polite"` | `:139` |

Label above control, helper below control, error below helper. `FormMessage` renders `null` when there is no error — never conditionally mount it yourself.

All field controls inherit **`h-9` / `text-sm`** from `FIELD_CONTROL_CLASS` (`components/ui/field-control.ts:1`). Never add local `h-8`/`h-10`/`text-xs`.

### The one error-extraction function

```ts
// lib/get-error-message.ts:94
export function getErrorMessage(error: unknown): string
```

**Every mutation's `onError` and every error state's text goes through it.** No `error instanceof Error ? … : …`, no raw `.message`. Verified zero violations in the reference modules.

It surfaces the backend message and substitutes a friendly generic only for: bare status lines (`"404 Not Found"`), reason phrases, network failures, stale-build chunk errors, and empty/`[object Object]` errors. Status fallbacks are specific — 402 → credit/plan limit, 403 → permission, 409 → conflict.

### The API error envelope

`lib/api-client.ts` is **the only place that parses an error response** (`:219-262`):

```ts
export class ApiError extends Error {      // :192
  readonly status?: number;
  readonly code?: string;
  readonly details?: unknown;
}
export function isApiError(error: unknown): error is ApiError    // :211
export function getApiErrorCode(error: unknown): string | undefined  // :215
```

- Error body: `message` as `string` **or** `string[]` (NestJS validation → joined with `", "`), else `error`; plus `code`, plus `details` (or leftover keys).
- Success body: `{ success: true, data }` is unwrapped to `data`; anything else returns as-is. `204` → `undefined`.
- Branch on `isApiError(e) && e.status === 409`, never on message-prefix matching.
- Request timeout is **30s** (`:5`), surfaced as `ApiError("Request timed out…", undefined, "TIMEOUT")`.
- `401` retries once with a fresh token, then signs out. `403` with code `ORG_MEMBERSHIP_INACTIVE`/`SUSPENDED` redirects to `/access-suspended`.

### Toasts

**Sonner.** Success toasts **are** used — past tense, specific: `toast.success("Sprint created successfully")`. Errors are always `toast.error(getErrorMessage(error))`. No toast for an optimistic inline edit that already shows its result; the rollback is the error signal.

### Unsaved changes and destructive actions

```tsx
// components/ui/unsaved-changes-dialog.tsx
{ open, onOpenChange, title?, description?, keepEditingLabel?, discardLabel?,
  saveLabel?, onSave?, onDiscard, isSaving? }        // omit onSave → Discard + Keep editing only

// components/ui/confirm-dialog.tsx — trigger XOR controlled, enforced by the type
{ title, description, icon?, content?, confirmLabel?, cancelLabel?, destructive?,
  isPending?, confirmIcon?, hideConfirm?, keepOpenOnConfirm?, onConfirm }
  & ({ trigger } | { open, onOpenChange })
```

`keepOpenOnConfirm` is how a failed action keeps its dialog open (the hierarchy dependency-conflict rule, §7). `hideConfirm` turns the dialog into a blocked-state explainer.

### Async buttons

Every async button is `<LoadingButton isPending>` (`components/ui/loading-button.tsx`). Never `disabled={isPending}` + a spinner ternary.

---

## 14. Data Layer — code contract

### Query keys

```ts
// lib/query-keys.ts:1
const base = ["streamlineos"] as const;
```

One exported `queryKeys` object, one factory per entity. **Never hand-type a key array.**

⚠️ **`base` carries no tenant segment.** A two-org user shares one cache across a switch, so an org switch MUST `queryClient.clear()` (CLAUDE.md §11) — `useSwitchOrg` and the leave/delete-org paths already do. That is the regression to guard until the org id moves into `base`. Some factories thread it manually (`queryKeys.access.me(orgId, userId)`, `hr.attendanceStatus(orgId)`); do the same for any new org-scoped `localStorage` cache.

### staleTime tiers

Calibrate to volatility. Observed distribution across `hooks/api/` + `lib/api/`:

| Tier | Value | Uses | For |
|---|---|---|---|
| Live | `0` + `refetchInterval` | 10 | Realtime counters, in-flight jobs |
| Volatile | `15_000` | 28 | Fast-moving queues |
| **Standard list** | `30_000` | 240 | Permissions, lists that change often |
| **Standard entity** | `60_000` | 290 | The default — most lists and details |
| Slow list | `2 * 60_000` | 202 | Reference lists, aggregates |
| Session/org | `5 * 60_000` | 99 | Session, org, members |
| Catalog | `30 * 60_000` | 6 | Permission catalog, near-static config |

Every `useQuery` declares a `staleTime`; every `useMutation` declares a `mutationKey`.

### Hooks

- Location: `hooks/api/<module>/<entity>.ts` (or `hooks/api/<module>.ts` for small modules). No raw `fetch`/`axios` in components.
- Naming: `useThings` (list) · `useThing` (detail) · `useCreateThing` / `useUpdateThing` / `useDeleteThing`.
- Options pass-through: `options?: Omit<UseQueryOptions<T, Error>, "queryKey" | "queryFn">`, spread **before** the gate.
- **Never re-declare `enabled` after `...options`** — it silently clobbers every caller's gate. Combine: `enabled: !!orgId && (options?.enabled ?? true)` (`hooks/api/access.ts:35`).

### Permission gating

```ts
// hooks/api/access.ts
useCan(permissionKey: PermissionKey): boolean          // :39 — owner short-circuits true
useModuleEnabled(moduleKey: string): boolean           // :51 — defaults true while loading
useAccess(options?)                                    // :16 — staleTime 30_000, GET /me/access
```

Every query hitting a gated endpoint sets `enabled: useCan("<the endpoint's exact @RequirePermission key>")`. The frontend key must match the backend key **exactly** — a frontend-only key fails `useCan` forever. Server pages use `requirePermission()` (`lib/rbac/require-permission.ts`). Denied UI renders `NoPermissionState` (`components/shared/no-permission-state.tsx`, props `{ permission, title?, description?, className? }`).

### Mutations and invalidation

Plain mutation — invalidate by **true key prefix**, listing every affected surface (`hooks/api/build/ticket-mutations.ts:86-100`):

```ts
onSuccess: (data, variables, context, mutFnCtx) => {
  queryClient.invalidateQueries({ queryKey: queryKeys.projects.tickets({ projectId: variables.projectId }) });
  queryClient.invalidateQueries({ queryKey: queryKeys.projects.detail(variables.projectId) });
  queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.myIssues() });
  options?.onSuccess?.(data, variables, context, mutFnCtx);   // always re-call
}
```

**Optimistic — canonical implementation is `useUpdateTicket` (`ticket-mutations.ts:119-200`).** The shape, and why each step exists:

1. `onMutate` — `cancelQueries` on every key you will patch, then snapshot each into a typed context.
2. Patch **every cache the view renders from**, not just one: detail, single-entity, board array, and all paginated list pages via `getQueriesData` (`:132`).
3. Resolve related display objects from already-cached data inside the patch — `applyTicketPatch` looks the assignee up in `previousDetail.members` so the avatar and name appear immediately (`:57-73`). Never render an id while waiting.
4. `onError` — restore every snapshot, including each `listSnapshots` entry (`:180-190`).
5. `onSettled` — invalidate, and **gate expensive aggregates behind the fields that actually move them** (`:201`), so a title edit doesn't refetch sprint rollups.

Inline edits on board/list/card surfaces MUST be optimistic. Never optimistic for quotes or revenue figures.

### Formatting

`lib/format-utils.ts` — currency is **INR-first**:

| Function | Line | Output |
|---|---|---|
| `formatCurrency(value)` | `:3` | Alias of `formatINRCompact` |
| `formatINRCompact(amount)` | `:89` | `₹1.2Cr` / `₹3.4L` / `₹12K` — Indian units, for stats and dense cells |
| `formatINR(amount)` | `:76` | `₹1,23,456` — paisa only when non-integer |
| `formatCurrencyFull(amount, currency?, locale?, maxFrac?)` | `:7` | Full precision, multi-currency. Default `INR`/`en-IN` |
| `getInitials(name, firstName?, lastName?)` | `:30` | Avatar fallback |
| `formatTime(time)` | `:48` | `hh:mm a` |
| `formatFileSize` / `calcPercent` / `numberToWords` | `:23` / `:72` / `:115` | |

Dates: `lib/date-utils.ts` + `date-fns` `format`. Never `toLocaleDateString` inline.

---

## 15. Structure and Naming — code contract

- **kebab-case for every file and folder.** PascalCase symbol inside a kebab-case file.
- Feature code → `features/<feature>/{components,lib,hooks}/`. `app/` holds route files only. **Banned:** `_components/`, `_lib/`.
- **Import through the feature barrel**, not deep paths: `import { EntityFormSheet } from "@/components/shared"`. Max ~3–4 folders deep.
- Hooks `use-*.ts` → `useX`. Server fetch helpers `get-*`.
- **Zod schemas live in `*-schema.ts`** beside the feature, type derived via `z.infer` — never a hand-maintained parallel `interface`.
  ⚠️ Current drift: 83 proper `*-schema.ts` files vs **215 `.tsx` files with inline `z.object({`**. New CRM code adds none; the CRM's share is a Phase 1 finding.
- Tabs: `PageTabsToolbar` (`components/ui/page-tabs-toolbar.tsx`, props `{ tabs, search?, filters?, actions?, tabsDensity?, collapseBelow?, className? }`) when tabs share the line with search/filters. `TabsContent` filling the page body needs `TABS_CONTENT_PAGE_BODY_CLASS` (`components/ui/tabs.tsx:63`).
- Tab and filter state syncs to the URL with `router.replace(\`${pathname}?${params.toString()}\`, { scroll: false })` — canonical: `features/build/all-work/use-all-work-filters.ts:41`. Always reset pagination on filter change.

---

## 16. Component Import Index

Every canonical component, one line each. If it is here, do not reimplement it.

| Need | Component | Path |
|---|---|---|
| Page shell | `PageWrapper`, `PageSection` | `components/ui/page-wrapper.tsx` |
| Page chrome constants | `PAGE_CHROME_X`, `PAGE_CHROME_BOTTOM`, `CONTENT_PANEL_SOLID`, `CONTENT_FILL_PANEL`, `FILTER_TOOLBAR_ROW`, `FILTER_SELECT_TRIGGER`, `PAGE_BODY_SKELETON_CLASS`, `PAGE_BODY_EMPTY_CLASS` | `components/ui/content-fill-panel.tsx` |
| Field sizing constants | `FIELD_CONTROL_CLASS`, `FIELD_SELECT_CONTENT_CLASS`, `FIELD_DATE_POPOVER_CONTENT_CLASS`, `INLINE_POPOVER_MIN_CLASS` | `components/ui/field-control.ts` |
| Table | `DataTable`, `DataTableColumn` | `components/ui/data-table.tsx` |
| Pagination | `TablePagination` · `DataTablePagination` | `components/ui/table-pagination.tsx` · `components/shared/data-table-pagination.tsx` |
| Stats | `StatCard`, `StatCardGrid` | `components/ui/stat-card.tsx` |
| Search | `SearchInput` | `components/ui/search-input.tsx` |
| Tabs | `Tabs`, `TABS_CONTENT_PAGE_BODY_CLASS` · `PageTabsToolbar` | `components/ui/tabs.tsx` · `components/ui/page-tabs-toolbar.tsx` |
| Form shells | `EntityFormSheet`, `EntityFormDialog`, `AppSheet`, `AppDialog` | `components/shared` |
| Form primitives | `Form`, `FormField`, `FormItem`, `FormLabel`, `FormControl`, `FormDescription`, `FormMessage` | `components/ui/form.tsx` |
| Confirm | `ConfirmDialog` · `UnsavedChangesDialog` · `ConfirmSheet`, `ConfirmWithReasonSheet` | `components/ui/confirm-dialog.tsx` · `unsaved-changes-dialog.tsx` · `confirm-sheet.tsx` |
| Async button | `LoadingButton` | `components/ui/loading-button.tsx` |
| Animated icon button | `AnimatedIconButton` · `useAnimatedIcon` | `components/ui/animated-icon-button.tsx` · `hooks/common/use-animated-icon.ts` |
| States | `EmptyState` · `ErrorState`, `LoadingState`, `AccessDenied`, `NoPermissionState` | `components/ui/empty-state.tsx` · `components/shared` |
| Mobile overlay | `ResponsivePopover` · `Drawer` | `components/ui/responsive-popover.tsx` · `drawer.tsx` |
| Badges | `Badge` · `SemanticBadge`, `StatusBadge`, `StatusMapBadge` | `components/ui/badge.tsx` · `semantic-badge.tsx` etc. |
| Pickers | `PhoneInput` · `DatePicker`, `DateRangePicker` · `Combobox`, `UserCombobox` | `components/ui/phone-input.tsx` · `date-picker.tsx` · `combobox.tsx` |
| API | `apiClient`, `ApiError`, `isApiError`, `getApiErrorCode` | `lib/api-client.ts` |
| Errors | `getErrorMessage` | `lib/get-error-message.ts` |
| Keys | `queryKeys` | `lib/query-keys.ts` |
| Access | `useAccess`, `useCan`, `useModuleEnabled` · `requirePermission` | `hooks/api/access.ts` · `lib/rbac/require-permission.ts` |
| Format | `formatINR`, `formatINRCompact`, `formatCurrencyFull`, `getInitials` | `lib/format-utils.ts` |
| Motion | `staggerContainer`, `fadeUp`, `pageEnter` | `lib/motion-variants.ts` |

---

## 17. Conflicts and Decisions

Reference modules and v1.0 of this document disagreed in nine places. Each is resolved below; the decision is the rule.

| ID | Conflict | Evidence | Decision |
|---|---|---|---|
| DS-001 | Card radius `rounded-lg` vs `rounded-xl` | `card.tsx:10` xl · `content-fill-panel.tsx:21` xl · CLAUDE.md §14 xl · 135 vs 81 files | **`rounded-xl`.** v1.0 corrected |
| DS-002 | Card border full-opacity vs `/70` | v1.0 §2 "never `/60` on an outer boundary" vs `card.tsx:10` `border-border/70` | **≥70% allowed.** Rule reworded |
| DS-003 | Three card shadows | `shadow-sm` 257 files · `shadow-noir` 27 · `shadow-soft` 1 · `shadow-medium` 1 | **`shadow-sm`** for panels, `shadow-noir` inside `<Card>`. `soft`/`medium` deprecated |
| DS-004 | `DataTable` `search`/`toolbar` "removed" | Still declared at `data-table.tsx:81-88`; compiles | **Convention, not a type error.** Enforce in review |
| DS-005 | `PageWrapper` props documented wrong | `eyebrow`, `filtersCollapseBreakpoint` absent; 7 real props undocumented; `title` optional | **Code wins.** §5 rewritten verbatim |
| DS-006 | Page inset `px-4 sm:px-6` | `content-fill-panel.tsx:9` adds `lg:px-8` | **Use `PAGE_CHROME_X`**, never literals |
| DS-007 | "Pagination is `TablePagination`" | `DataTable` uses `shared/data-table-pagination` (`:19`) | **Two components, split by surface.** §7 table added |
| DS-008 | "`PageWrapper` renders a hairline divider" | No border element in `page-wrapper.tsx` | **No divider exists.** Claim removed |
| DS-009 | Table density `h-8`/`text-[11px]` | `table.tsx:79` `h-10 text-sm`; `data-table.tsx:360` `px-2 py-2 text-sm` | **`h-10` / `px-2 py-2` / `text-sm`.** §4 rewritten |

---

## 18. Screen Templates

Copy the archetype, fill in the entity. These are extracted from conformed pages, not invented — each names its
reference file. **Anything not shown here is already owned by a primitive; do not re-declare it.** In particular you
never write page padding (`PAGE_CHROME_X`), control heights (`h-9`), table density (§4), card radius, or the
scroll container.

### The scroll chain — memorise this

Only **one** element scrolls: `PageWrapper`'s content zone. The shell is `overflow-hidden` above it (Appendix).

```
PageWrapper                         flex h-full min-h-0 flex-1 flex-col   ← owned by the component
├── header zone                     shrink-0
├── filter zone                     shrink-0, one non-wrapping scrollable row
└── content zone                    flex-1 min-h-0 overflow-y-auto        ← the ONE scroller
    └── your body                   must carry flex-1 min-h-0 to fill it
```

Consequences, and the two mistakes that cause 90% of fill bugs:
- A body using `space-y-4` instead of `flex flex-1 min-h-0 flex-col` leaves dead background above the Ask OS bar.
- A `DataTable`/`EmptyState`/`ErrorState` without `flex-1 min-h-0` (or `flex-1`) stops short of the shell edge.
- `noInternalScroll` moves the scroll responsibility to **you** — use it only for boards/maps that scroll internally.

---

### T1 · List + filters + table — the most common screen

Reference: `features/settings/organization/hierarchy/branches-page.tsx:343-406`.

```tsx
<PageWrapper
  title="Branches"
  subtitle="Branches within your organization."          // descriptive, not a bare row count
  actions={
    <div className="flex w-full items-center gap-2 sm:w-auto">
      {/* secondary first, ONE primary last, max 3 total */}
      <Button variant="outline" size="sm" className="flex-1 text-xs sm:flex-none" onClick={onToggle}>…</Button>
      {canManage ? (
        <AnimatedIconButton icon={PlusIcon} iconSize={16} iconClassName="mr-1.5" size="sm"
          className="flex-1 sm:flex-none" onClick={onCreate}>Add Branch</AnimatedIconButton>
      ) : null}
    </div>
  }
  filters={<SearchInput placeholder="Search branches…" value={search} onValueChange={onSearch} />}
>
  {isError ? (
    <ErrorState className="flex-1" title="Couldn't load branches"
      description={getErrorMessage(error)} onRetry={onRetry} />
  ) : (
    <DataTable
      data={rows}
      columns={columns}
      getRowKey={(row) => row.id}
      isLoading={isLoading}
      emptyState={emptyState}
      minWidth="1000px"
      className="flex-1 min-h-0"                          // mandatory — this is the fill chain
      pagination={{
        mode: "server", page, pageSize, total: data?.total ?? 0,
        onPageChange: setPage, onPageSizeChange: setPageSize,
        pageSizeOptions: STANDARD_PAGE_SIZE_OPTIONS,
      }}
    />
  )}
</PageWrapper>
```

Rules that bite here:
- **`className="flex-1 min-h-0"` on `DataTable` is not optional.**
- `pagination` is always **server** mode for anything that can exceed a page (§19 caps at 100).
- Error branch comes **before** the empty/not-found branch, or a failure reads as "no data".
- `minWidth` forces horizontal scroll rather than crushing columns.
- A sole filter (usually search) fills the width on mobile — never collapse a lone search into a Drawer.
- 2+ filters: search stays first, the rest collapse into a Drawer below `md` (§6). Use `ResponsivePopover`.

**Mobile (375px):** actions become a full-width row (`PageWrapper` handles it), the filter row scrolls
horizontally rather than wrapping, and the table becomes cards if you pass `mobileCard`. Reserve
`pb-[calc(4rem+…)]` only when a bottom bar is mounted.

---

### T2 · List + cards, when rows aren't tabular

Same header/filters as T1. Body:

```tsx
<div className="flex flex-1 min-h-0 flex-col gap-3">
  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
    {rows.map((row) => (
      <div key={row.id} className="bg-card rounded-xl border border-border shadow-sm p-4
        hover:border-primary/40 hover:shadow-md transition-all cursor-pointer">…</div>
    ))}
  </div>
  <TablePagination … />                                  {/* the non-DataTable pagination */}
</div>
```

Card surface is `rounded-xl border border-border bg-card shadow-sm` (§7). Inner rows and chips inside a card stay
`rounded-lg`/`rounded-md` — only the card itself is `xl`.

---

### T3 · Detail + tabs

```tsx
<PageWrapper title={record.name} backHref="/crm/contacts" subtitle={…}
  contentClassName="flex min-h-0 flex-1 flex-col">
  <Tabs value={tab} onValueChange={onTabChange} className="flex min-h-0 flex-1 flex-col">
    <TabsList>…</TabsList>
    <TabsContent value="overview" className={TABS_CONTENT_PAGE_BODY_CLASS}>…</TabsContent>
  </Tabs>
</PageWrapper>
```

- `backHref` **only** on a page with no sidebar entry of its own (§5).
- Tab state syncs to the URL: `router.replace(\`${pathname}?${params}\`, { scroll: false })` (§15).
- Every body-filling `TabsContent` gets `TABS_CONTENT_PAGE_BODY_CLASS` — hand-writing `flex-1 min-h-0 mt-0` omits
  the `data-[state=active]:` guards.
- Tabs sharing the line with search/filters/actions use `PageTabsToolbar`.
- 5+ triggers used as a status filter is **AP-2** — that is a `Select`, not tabs.

---

### T4 · Settings section page — Administration & HR (rich surface)

Administration and HRMS use the **rich-surface** kit; every other module stays ink-first. Reference:
`features/settings/organization/organization-settings-page.tsx`.

```tsx
<PageWrapper title="Organization" subtitle="Profile, branding, localization and lifecycle.">
  <RichPageContent className="flex-1 min-h-0">
    <OrgSettingsCard title="Profile" description="…" icon={<Building2 className="h-4 w-4" />}
      action={canEdit ? <OrgSettingsEditButton onClick={onEdit} /> : undefined}>
      <SettingsFieldGrid>
        <SettingsField label="Legal name" value={org.legalName} />
      </SettingsFieldGrid>
    </OrgSettingsCard>
  </RichPageContent>
</PageWrapper>
```

`OrgSettingsCard` sits on `RichPanel` + `RichIconWell`, so all sections inherit the treatment from one place.
`RichPageContent` supplies the `gap-3 sm:gap-4` rhythm — never `space-y-*` here, and never a non-4px value.

---

### T5 · Module hub / landing

Reference: `features/hr/hub/hr-hub-page.tsx`.

```tsx
<PageWrapper title="HR" subtitle="…" variant="display">
  <div className="flex flex-1 min-h-0 flex-col">
    <RichPageContent>
      <RichHero>{/* quick-action tiles, horizontally scrollable on mobile */}
        <RichQuickAction href="…" icon={UserPlus} label="Add employee" tone="blue" />
      </RichHero>
      <QueuesBand /> <TodayPanel /> <MetricsRow />
    </RichPageContent>
  </div>
</PageWrapper>
```

- `variant="display"` is for genuine hero surfaces only, and must be consistent across siblings.
- Every panel self-gates on the endpoint's exact permission and renders **nothing** when unheld — a 2-permission
  user gets a short clean page, not a wall of empty states.
- Do not put a hero on a page whose `PageWrapper` title already says the same thing.

---

### T6 · Board / kanban — the one screen that owns its scroll

```tsx
<PageWrapper title="Deals" filters={…} noInternalScroll
  className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
  <div className="flex min-h-0 flex-1 gap-3 overflow-x-auto">
    {columns.map((col) => (
      <div key={col.key} className="flex w-72 shrink-0 flex-col rounded-xl border border-border bg-card">
        <div className="shrink-0 px-3 py-2">{col.label}</div>
        <div className="flex-1 min-h-0 overflow-y-auto p-2">{/* virtualize past ~50 */}</div>
      </div>
    ))}
  </div>
</PageWrapper>
```

Column totals come from a server aggregate, never `COUNT(*)` per render. Past ~50 cards use `react-window` v2 with
`Droppable mode="virtual"` + `renderClone` (§23, and note the `api.element`-is-null gotcha).

---

### T7 · Overlays — pick by the §12 ladder

| Situation | Component |
|---|---|
| One field, immediate | inline edit — no overlay |
| One field, bounded choice | `ResponsivePopover` (Drawer below `md`) |
| ≤5 fields | `EntityFormDialog` |
| 6+ fields, multi-section, or context must stay visible | `EntityFormSheet` |
| Read-only detail | `AppSheet` |
| Irreversible / lifecycle | `ConfirmDialog destructive` (+ typed-name confirm for high blast radius) |

`SheetContent` is **always** `p-0` with inner zones owning padding (AP-1), and the body needs `min-h-0`.

---

### T8 · The four states — every screen ships all of them

```tsx
if (isLoading) return <SkeletonTable rows={10} columns={columns.length} />;   // never a spinner
if (isError)   return <ErrorState className="flex-1" description={getErrorMessage(error)} onRetry={refetch} />;
if (!canView)  return <NoPermissionState permission="crm:contacts:view" />;
if (rows.length === 0) return <EmptyState className="flex-1 min-h-0" … />;    // filter-empty ≠ data-empty
```

- Skeleton is a **visual Xerox**: same sections, same column count, ~9–12 dense rows, `h-9` filter blocks.
- Empty state distinguishes *filters active* ("No results match your filters" + Clear filters) from *no data*
  (the create action). One CTA, never two.
- Suppress the skeleton under 200ms (`isPending && !data`).

---

### T9 · The data contract behind every template

```tsx
const canView = useCan("crm:contacts:view");            // the endpoint's EXACT @RequirePermission key
const { data, isLoading, isError, error, refetch } = useContacts(
  { page, limit, search },
  { enabled: canView },                                  // never fire an API the role cannot access
);
```

- Hook lives in `hooks/api/<module>/<entity>.ts`; key from the `queryKeys` factory; calibrated `staleTime`;
  `mutationKey` on every mutation; `enabled` combined **after** any `...options` spread, never re-declared.
- Search is debounced ≥300ms (`SearchInput` / `useDebouncedValue`) and resets pagination to page 1.
- Forms: react-hook-form + `zodResolver`, schema in a sibling `*-schema.ts`, per-field `<FormMessage>`.
- Every async button `<LoadingButton isPending>`; every error string `getErrorMessage`.
- Never render a raw id — resolve names at the display boundary.

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
- A URL communicates product context. Platform administration owns `/settings/*`; module configuration owns `/<module>/settings/*`. Settings is for configuration and access governance, not day-to-day operational queues or workflows; those live inside their owning product (for example `/directory/workers` and `/payroll/*`). Settings navigation must never point at a top-level operational URL and silently switch the selected product/sidebar.
- If the same workflow is intentionally available in two products, both routes render one shared `features/` component through thin adapters. Pass each route's base path into links and back navigation. The employee directory is the reference pattern: `/directory/*` stays in Home while `/settings/directory/*` stays in Administration.
- When a surface moves to its canonical owner, delete the old route outright — no legacy redirect files. Sidebar, menus, command actions, empty states, and onboarding links always use the canonical route.
- Home and Documents are always available products for active organization members. Documents owns Knowledge Base reading (`/knowledge/*`); Home owns personal employment documents (`/me/documents`). Show core products and permissions as disabled “Included” controls in administration rather than editable toggles.
- `For Me` uses canonical `/me/*` routes and remains visible independently of paid-module enablement. It includes only the signed-in person's time off, attendance, expenses, pay, and employment documents.
- Announcements and the people directory are company-wide reading surfaces. Their creation or administration controls may still require an owning-module permission.
- Module-specific administration never appears in Home. Recruitment/interviews, HR employee administration, payroll operations, accounting operations, and product delivery remain inside their owning module sidebar.
- Desktop sidebar, mobile drawer, mobile module bottom navigation, product switcher, and command palette all consume the same filtered navigation model; never maintain parallel hard-coded destination lists.
- Permissioned hubs, quick links, cards, and empty-state actions use that same filtered model or the exact permission enforced by their destination. Do not render a link that predictably ends at Access Denied; when a parent is unavailable but a child is allowed, promote the child without exposing the parent.
- Hide unauthorized mutation controls rather than showing unusable buttons. This includes row menus, bulk actions, create/import/export controls, builder actions, and configuration tabs. Keep the backend guard as the authoritative security boundary.
- Module Access ownership is intentionally narrow: only the canonical module owner sees the Ownership tab. Org owners/admins and canonical module owners/admins may manage module members and roles, but ordinary/custom permission grants never unlock those controls.
