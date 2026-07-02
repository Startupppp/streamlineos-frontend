# StreamlineOS — UI/UX System v1.0

> **This is the canonical, enforceable design specification for StreamlineOS.**
> Every authenticated page, every new component, every token decision defers to this file.
> Auth pages (`/signin`, `/signup`) and the landing page are **IMMUTABLE reference surfaces** — the
> rest of the application conforms to them, never the other way around.
> When a rule here conflicts with CLAUDE.md, this file is more specific and wins on visual matters.

---

## 1. Thesis

### What the research says best-in-class B2B SaaS UIs share

After auditing the design languages of **Linear, Stripe, Vercel, Attio, Resend, Cal.com, PostHog,
Supabase, Notion, HiBob, Rippling, Gusto, Deel, Personio, Lattice, HubSpot, Pipedrive, Close CRM,
Asana, Monday.com, ClickUp, Height, Campsite, Missive, Plain, Front, Clerk, and Airtable**, five
invariant traits separate the tier-1 products from the also-rans:

**1. Density with restraint.** Power users spend 6–8 hours per day in these interfaces. Whitespace
is not a virtue when the user needs to see 50 rows at once. Tier-1 products like Linear and Stripe
pack information tightly — 32–40px table rows, 13px body text, `px-2 py-1` cell padding — while
still breathing through deliberate section separation, not random gaps.

**2. One accent, not a rainbow.** Linear uses one purple. Stripe uses one blue. Vercel uses black
with zero brand color in the dashboard chrome. Resend uses a single green CTA on a dark canvas.
The pattern is identical: neutral surfaces + neutral text + exactly one accent color reserved for
primary actions and interactive focus states. Status colors (emerald/amber/red/blue) are semantic,
never decorative. Brand gradient text is marketing, not dashboard chrome.

**3. Consistent page anatomy.** Every screen in a great SaaS product shares the same skeleton: a
compact header (page title + optional subtitle + right-aligned actions), a filter/toolbar strip
below it, then the content body. Users navigate 30+ different feature pages; if each invents its
own layout, cognitive load multiplies. PageWrapper is the backbone — every page uses it, none
deviates.

**4. Motion discipline.** Animation is not decoration. It is communication: it tells the user
_where_ something came from, _what_ changed, and _that_ the system responded. Linear and Vercel
both use 150–250 ms transitions on GPU-composited properties only (opacity, transform). No slow
1-second fades. No spring bounces on table rows. No animation on every hover. Motion is used
sparingly, purposefully, and always respects `prefers-reduced-motion`.

**5. Predictable states.** Every page in a tier-1 product handles all five states: loading
(skeleton matching the real layout), empty (contextual icon + message + one CTA), error (friendly
message + retry), sparse (2–5 items), and dense (50–500 items). An application that handles only
the happy path feels unfinished regardless of how polished the happy path looks.

---

## 2. Palette

### Decision

StreamlineOS uses a **slate-neutral base with a single blue accent family**, derived directly from
the existing auth pages and global stylesheet. The auth pages and landing page are already correct
and **must not be changed**. Every other page conforms to them.

This is a "Vercel-meets-Stripe" palette: near-white canvas, ink-black primary CTAs (slate-900),
blue-500 for interactive states and links, and full Tailwind semantic families for status.

### CSS Custom Properties — paste-ready :root block

```css
:root {
  /* ── Radius ── */
  --radius: 0.625rem;              /* 10px — all components inherit via --radius-sm/md/lg/xl */

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

  /* ── Primary CTA (ink-style — Linear/Stripe feel) ── */
  --primary:               #0b1220;   /* slate-900 */
  --primary-foreground:    #ffffff;

  /* ── Accent (links, interactive highlights, focus) ── */
  --accent:                #3b82f6;   /* blue-500 */
  --accent-foreground:     #ffffff;
  --secondary:             #f1f5f9;   /* slate-100 */
  --secondary-foreground:  #0b1220;

  /* ── Semantic status ── */
  --destructive:           #dc2626;   /* red-600 */
  --destructive-foreground: #ffffff;

  /* ── Brand (gradient text, onboarding, marketing spots only) ── */
  --brand-deep:            #1e40af;   /* blue-800 */
  --brand-core:            #3b82f6;   /* blue-500 */
  --brand-bright:          #60a5fa;   /* blue-400 */
  --brand-cyan:            #06b6d4;   /* cyan-500 */
  --gradient-signature: linear-gradient(135deg, #1e40af 0%, #3b82f6 50%, #06b6d4 100%);

  /* ── Charts (blue family first, violet + pink for variety) ── */
  --chart-1:               #1d4ed8;   /* blue-700 */
  --chart-2:               #06b6d4;   /* cyan-500 */
  --chart-3:               #60a5fa;   /* blue-400 */
  --chart-4:               #8b5cf6;   /* violet-500 */
  --chart-5:               #ec4899;   /* pink-500 */

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
  --background:            #07091a;
  --foreground:            #f1f4fb;
  --card:                  #101428;
  --card-foreground:       #f1f4fb;
  --popover:               #141a32;
  --popover-foreground:    #f1f4fb;
  --muted:                 #161e36;
  --muted-foreground:      #94a0c0;
  --border:                rgba(148, 178, 245, 0.12);
  --input:                 rgba(148, 178, 245, 0.14);
  --ring:                  #60a5fa;

  --primary:               #f1f4fb;
  --primary-foreground:    #07091a;
  --secondary:             #1a2238;
  --secondary-foreground:  #f1f4fb;
  --accent:                #1a2238;
  --accent-foreground:     #f1f4fb;
  --destructive:           #ef4444;
  --destructive-foreground: #f1f4fb;

  --chart-1:               #3b82f6;
  --chart-2:               #06b6d4;
  --chart-3:               #60a5fa;
  --chart-4:               #8b5cf6;
  --chart-5:               #ec4899;

  --sidebar:               #0b1024;
  --sidebar-foreground:    #c4cbe0;
  --sidebar-primary:       #3b82f6;
  --sidebar-primary-foreground: #ffffff;
  --sidebar-accent:        color-mix(in srgb, var(--sidebar-primary) 14%, transparent);
  --sidebar-accent-foreground: #f4f7ff;
  --sidebar-border:        rgba(148, 178, 245, 0.10);
  --sidebar-ring:          #60a5fa;
}
```

### Semantic status mapping (badges, toasts, icons)

| Semantic | Tailwind bg | Tailwind text | Tailwind border | Usage |
|---|---|---|---|---|
| Success | `bg-emerald-50` | `text-emerald-700` | `border-emerald-200` | Completed, active, approved |
| Warning | `bg-amber-50` | `text-amber-700` | `border-amber-200` | Pending, expiring, caution |
| Destructive | `bg-red-50` | `text-red-700` | `border-red-200` | Error, rejected, overdue |
| Info | `bg-blue-50` | `text-blue-700` | `border-blue-200` | Draft, in-progress, informational |
| Neutral | `bg-slate-100` | `text-slate-700` | `border-slate-200` | Closed, archived, neutral |

**Rule:** Never use brand gradient colors (`--brand-core`, `.brand-text`, `.gradient-signature`) for
status badges. Never repurpose status colors for brand decoration.

---

## 3. Typography

### Font stack

Geist (already wired via `next/font`). Do not introduce Inter, Roboto, or any other sans-serif.

```css
body {
  font-family: var(--font-sans);    /* Geist → system fallback */
  font-feature-settings: 'cv02', 'cv03', 'cv04', 'cv11';
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
```

The `cv02`, `cv03`, `cv04`, `cv11` stylistic alternates are already active globally in `globals.css`
— do not remove them. They give Geist its clean, Swiss-geometry feel.

### Type scale

| Role | Size | Weight | Line-height | Letter-spacing | Class |
|---|---|---|---|---|---|
| Page title (default) | 18px / `text-lg` | 600 | tight | −0.015em | `text-lg font-semibold tracking-tight` |
| Page title (display variant) | 24–28px / `text-2xl` | 800 | tight | −0.02em | `text-2xl font-extrabold tracking-[-0.02em]` |
| Section heading | 14px / `text-sm` | 600 | tight | 0 | `text-sm font-semibold` |
| Section sub-heading | 13px / `text-[13px]` | 500 | snug | 0 | `text-[13px] font-medium` |
| Body | 14px / `text-sm` | 400 | normal | 0 | `text-sm` |
| Table cell / dense body | 11px / `text-[11px]` | 400 | normal | 0 | `text-[11px]` |
| Label / input label | 13px / `text-[13px]` | 500 | none | 0 | `text-[13px] font-medium` |
| Caption / eyebrow | 11px / `text-[11px]` | 500 | none | +0.05em | `text-[11px] font-medium tracking-wider` |
| Table header | 10px / `text-[10px]` | 700 | none | +0.05em | `text-[10px] uppercase tracking-wider font-bold` |
| Mono / code / numbers | 11–13px | 400–500 | normal | 0 | `font-mono text-[11px]` |
| Badge / status | 10px / `text-[10px]` | 500 | none | 0 | `text-[10px]` |

**Headings rule:** All `h1`–`h6` use `letter-spacing: -0.02em` and `font-weight: 600` by default
(set globally in `globals.css`). Only use `font-extrabold` (800) for `variant="display"` page
titles or landing/marketing headings.

**Tabular numerals rule:** All table cells containing numeric data (amounts, counts, percentages,
dates) must render with `font-mono` or `font-variant-numeric: tabular-nums`. This prevents column
width jitter and enables value comparison by eye. Apply at the container level for data-dense
views:

```tsx
<TableCell className="font-mono text-[11px] tabular-nums">
  {formatCurrency(amount)}
</TableCell>
```

Or apply globally to a data table container:
```tsx
<table className="font-feature-settings-['tnum']">
```
In Tailwind: use `tabular-nums` utility class (maps to `font-variant-numeric: tabular-nums`).

---

## 4. Spacing and Density

### Grid

**Base unit: 4px.** All spacing uses multiples of 4. Never use arbitrary values like `p-[7px]`,
`mt-[13px]`, or `gap-[5px]`.

### Page-level spacing

| Zone | Value | Tailwind |
|---|---|---|
| Page horizontal padding | 16px (mobile) / 24px (desktop) | `px-4 sm:px-6` |
| Page header top padding | 16px | `pt-4` |
| Page header bottom padding | 8px | `pb-2` |
| Filter bar vertical padding | 8px | `py-2` |
| Content area top padding | 12px | `pt-3` |
| Content area bottom padding | 24px | `pb-6` |

### Card / panel padding

| Context | Padding | Tailwind |
|---|---|---|
| Standard content card | 16px | `p-4` |
| Compact list card | 12px | `p-3` |
| Metric / stat card | 16–20px | `p-4 sm:p-5` |
| Section header within card | 12px 16px | `px-4 py-3` |
| Sheet inner padding | 16px horizontal / 16–24px vertical | `px-4 py-4` or `px-6 py-5` |

### Table density (enforced scale)

| Mode | Row height | Cell padding | Font size | When to use |
|---|---|---|---|---|
| Condensed (default) | 32px (`h-8`) | `px-2 py-1` | 11px (`text-[11px]`) | All data tables: CRM, HR, inventory, billing |
| Regular | 40px (`h-10`) | `px-3 py-2` | 13px (`text-[13px]`) | Detail panels, settings tables, reference lists |
| Relaxed | 48px (`h-12`) | `px-4 py-3` | 14px (`text-sm`) | Onboarding steps, empty-state sub-tables only |

**Default is condensed.** Only upgrade to regular when the row contains multi-line content (e.g.,
a description field that can wrap to 2 lines). Never use relaxed in a main data view.

### Gap scale

| Gap | Value | Tailwind | Used for |
|---|---|---|---|
| xs | 4px | `gap-1` | Icon + label, badge + icon |
| sm | 8px | `gap-2` | Form field stack, button group |
| md | 12px | `gap-3` | Filter bar items, header actions |
| lg | 16px | `gap-4` | Card grid, section between elements |
| xl | 24px | `gap-6` | Section separator |
| 2xl | 32px | `gap-8` | Page sections (rare) |

### Sheet inner padding rule

`SheetContent` **always receives `p-0`**. Inner sections own their own padding via their own
wrapper divs. This eliminates the double-padding bug (SheetContent default padding + inner `p-4`
= 32px of wasted edge space).

```tsx
// CORRECT
<SheetContent className="p-0 flex flex-col gap-0 sm:max-w-md">
  <div className="px-6 py-4 border-b">  {/* header section */}
    <h3 className="text-sm font-semibold">Create Employee</h3>
  </div>
  <div className="flex-1 overflow-y-auto px-6 py-4">  {/* body */}
    {/* form fields */}
  </div>
  <div className="px-6 py-4 border-t flex justify-end gap-2">  {/* footer */}
    <Button variant="outline">Cancel</Button>
    <Button type="submit">Save</Button>
  </div>
</SheetContent>

// WRONG — double padding
<SheetContent className="sm:max-w-md">   {/* has default p-6 */}
  <div className="p-4">                  {/* adds another 16px = 40px total */}
    {/* content */}
  </div>
</SheetContent>
```

---

## 5. Page Anatomy

### The canonical authenticated page

Every authenticated page in StreamlineOS uses `PageWrapper`. No page invents its own header,
title row, or filter bar. Deviation requires explicit approval and codification here.

### PageWrapper contract

```tsx
interface PageWrapperProps {
  title: string;                    // Required. The h1. Keep to 2–3 words.
  subtitle?: React.ReactNode;       // Optional. Count ("48 employees") or description.
  eyebrow?: string;                 // Optional. Uppercase module label ("HR / Onboarding").
  badge?: React.ReactNode;          // Optional. Small count badge next to title.
  actions?: React.ReactNode;        // Optional. Right-aligned CTA buttons.
  filters?: React.ReactNode;        // Optional. If present, renders a full-width filter bar.
  children: React.ReactNode;        // The page body.
  variant?: "default" | "display";  // display = larger, bolder title for dashboards.
  noInternalScroll?: boolean;       // For pages that manage their own overflow (Kanban, map).
}
```

### Header row anatomy

```
┌─────────────────────────────────────────────────────────────────────┐
│  [eyebrow — 11px uppercase muted]                                   │
│  [h1 title — 18px semibold]  [badge count]                          │
│  [subtitle — 13px muted, max-w-2xl]              [actions — right]  │
└─────────────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────────────┐
│  [filter bar — bg-card/95 backdrop-blur border-b]                   │
│  [search] [select filters] [date range?] [export?]   [right tools]  │
└─────────────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────────────┐
│  [page body — scrollable content area]                              │
└─────────────────────────────────────────────────────────────────────┘
```

### Rules

- **One `<h1>` per page** — the `title` prop. Never add another `h1` inside children.
- **Subtitle as live count:** when the page shows a list, set `subtitle` to a live count string
  (`"48 employees"`, `"3 open deals"`). This gives users instant orientation without a separate
  metric card.
- **Actions are right-aligned, max 3 buttons.** Primary (one per page) + optional secondary +
  optional tertiary. Never stack actions vertically in the header.
- **Filter bar appears only when the page has filterable content.** A settings page does not need
  a filter bar. An empty page where filters would never match anything should hide the filter bar.
- **If there is no filter bar, `PageWrapper` renders a hairline divider** (`h-px bg-border`) below
  the header to separate it from content. Both the divider and the filter bar are built into
  `PageWrapper` — do not add your own.

### Responsive behavior

| Breakpoint | Title size | Actions | Filters |
|---|---|---|---|
| Mobile (< 640px) | `text-base` semibold | Stack below title | Wrap, horizontal scroll |
| Tablet (640–1280px) | `text-lg` semibold | Row, right-aligned | Wrap |
| Desktop (> 1280px) | `text-lg` semibold | Row, right-aligned | Single row, no wrap |

### Detail page back-navigation rule

- **Single parent:** Use a back button (`ChevronLeft` icon + "Back to X"). Example:
  `/crm/deals/123` → button "Back to Deals".
- **Multi-level hierarchy:** Use breadcrumbs only when there are ≥3 levels (e.g.,
  `Projects / PROJ-1 / Board / Issue #42`). Do not add breadcrumbs for two-level navigation.
- **Never rely on the browser Back button** as the primary back mechanism — provide an explicit
  in-page back link so users who open pages via direct link are not stranded.

---

## 6. Filter and Toolbar Patterns

### Component selection rule

| Situation | Component | Reason |
|---|---|---|
| 2–4 mutually exclusive views of the **same data** (e.g., Active / Archived / All) | `Tabs` or `SegmentedControl` (inline chips) | Keeps all options visible, one click |
| 5+ status options or data-specific values | `Select` (shadcn) | Saves horizontal space |
| Multiple independent filter facets (status + assignee + date range) | Filter bar with one `Select` per facet | Each Select is a separate dimension |
| Searching free text | `Input` with search icon, debounced ≥300ms, min 3 chars | Standard per existing repo pattern |
| Date filtering | `DateRangePicker` or two `date` inputs | Never a free-text date field |
| Bulk action trigger | Contextual toolbar appearing only when rows are selected | Never visible with 0 rows selected |

**The sentinel-default Select rule (already a repo rule):** Every `Select` used as a filter must
have a "all" sentinel value as its first option with a descriptive label:
```tsx
<SelectItem value="all">All statuses</SelectItem>
<SelectItem value="ACTIVE">Active</SelectItem>
```
When "all" is selected, the query param is removed from the URL (not set to "all").

### Filter bar layout spec

```
[Search input — max-w-[240px] h-8] [Status Select — w-[140px] h-8] [Other Select — w-auto h-8] [Date range?] ... flex-1 ... [Export button]
```

- All filter controls: height `h-8`, font size `text-xs`.
- The filter bar sits inside `PageWrapper`'s `filters` prop — it receives `px-3 sm:px-4 py-2` from
  the PageWrapper and must not add its own outer horizontal padding.
- Export/secondary actions go at the far right of the filter bar, separated by `ml-auto` or
  `justify-between`.
- On mobile, the filter bar wraps (`flex-wrap`) to a second row.
- **Search is always the leftmost item.** Status filter is always second. More specific filters
  (assignee, date, type) follow.

### Filter UX rules

- Filters always update the URL (via `router.replace` with `useSearchParams`) so pages are
  shareable and browser-navigable.
- Never reset page to 1 silently — always reset pagination when a filter changes.
- Active filter count badge: if > 2 filters are active simultaneously, show a count badge on the
  filter bar's trigger (relevant for mobile sheet-based filters).

---

## 7. Components

### Buttons

**One `<Button>` per view with the default (primary) variant.** Do not stack two primary buttons
side by side. The action hierarchy is:

| Variant | Visual | When to use |
|---|---|---|
| Default (primary) | `bg-primary text-primary-foreground` = slate-900 fill + white text | The single most important action per view (Create, Save, Submit) |
| Outline | `border-border bg-background hover:bg-muted` | Secondary actions (Export, Edit, Cancel) |
| Ghost | Transparent, `hover:bg-muted` | Tertiary, icon-only, destructive confirm cancel |
| Destructive | `bg-destructive text-destructive-foreground` | Delete confirm only — inside AlertDialogAction |

- Height: `h-9` for standard, `h-8` for compact (filter bar), `h-7` for icon-only in table rows.
- Font: `text-sm font-medium`.
- All buttons respond to `whileTap={{ scale: 0.97 }}` via Framer Motion on interactive pages.
- `disabled` state: always explicitly set when a mutation is pending. Never block UI with
  pointer-events tricks.

### Cards

Standard authenticated dashboard card:

```tsx
<div className="bg-card rounded-lg border border-border shadow-soft p-4">
```

- `rounded-lg` = `--radius` = 10px. Never `rounded-3xl` (24px) in dashboard chrome. That radius
  is for landing/marketing surfaces only.
- `shadow-soft` (defined in globals.css): `0 1px 3px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.04)`.
- `bg-card` = white in light mode. Do not use `bg-white` directly — always reference the token.
- Hover variant for clickable cards: add `hover:shadow-medium transition-shadow cursor-pointer`.

Metric / stat card:
```tsx
<div className="bg-card rounded-lg border border-border p-4 sm:p-5">
  <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
    {label}
  </p>
  <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
  <p className="mt-0.5 text-xs text-muted-foreground">{subtext}</p>
</div>
```

### Data tables

The canonical dense table pattern (as established by CRM quotes and HR pages):

```tsx
<div className="border border-border rounded-md flex flex-col h-[calc(100dvh-OFFSET)]">
  {/* Scrollable body */}
  <div className="flex-1 min-h-0 overflow-auto">
    <div className="min-w-max">
      <table className="w-full caption-bottom text-[11px]">
        <TableHeader className="sticky top-0 z-10 bg-muted/80 backdrop-blur-sm">
          <TableRow className="border-b-2 border-border">
            <TableHead className="text-[10px] uppercase tracking-wider font-bold px-2 py-1.5">
              Column Name
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow className="h-8 hover:bg-muted/30 transition-colors">
            <TableCell className="px-2 py-1">content</TableCell>
          </TableRow>
        </TableBody>
      </table>
    </div>
  </div>
  {/* Sticky pagination footer */}
  <div className="shrink-0 flex items-center justify-between px-4 py-2 border-t">
    <span className="text-xs text-muted-foreground">Showing X–Y of Z</span>
    {/* pagination controls */}
  </div>
</div>
```

**Table rules:**

- **Header row:** `text-[10px] uppercase tracking-wider font-bold`. Background: `bg-muted/80
  backdrop-blur-sm`. Always `sticky top-0 z-10`.
- **Row height:** `h-8` (32px condensed). `hover:bg-muted/30 transition-colors`.
- **Cell padding:** `px-2 py-1`.
- **Row actions column:** Width `w-8`, contains a 7×7 ghost icon button with `h-7 w-7`.
- **Numeric columns:** `font-mono tabular-nums` + right-aligned (`text-right`).
- **Text columns:** left-aligned. Truncated when needed: `truncate block max-w-[Xpx]`.
- **Link columns:** `text-blue-600 hover:underline transition-colors` — no other color for links.
- **Status column:** `<Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 {STATUS_BADGE_CLASSES[status]}">`.
- **Empty table body:** Render a single `<TableRow><TableCell colSpan={N} className="p-0">` containing the `<EmptyState>` component with `border-0 bg-transparent min-h-[40vh]`.
- **Table height:** `h-[calc(100dvh-Xrem)]` where X accounts for header + filter bar + pagination. Minimum height: `min-h-[320px]`.
- **Offset calculation guide:** `16rem` for pages with standard header + filter bar.

### Sheets vs Dialogs

| Use case | Component | Max width |
|---|---|---|
| Quick confirmation (delete? cancel?) | `AlertDialog` | auto (compact) |
| Short single-purpose form (≤5 fields) | `Dialog` | `sm:max-w-md` |
| Long form or multi-section form (6+ fields) | `Sheet` (side="right") | `sm:max-w-md` to `sm:max-w-lg` |
| Detail view (read-heavy, entity overview) | `Sheet` (side="right") | `sm:max-w-lg` to `sm:max-w-xl` |
| Full-context edit (complex entity with nested sections) | `Sheet` (side="right") | `sm:max-w-2xl` |
| Mobile navigation | `Sheet` (side="left") | `w-[17rem]` |

**Sheet anatomy (3-zone layout):**
```tsx
<SheetContent className="p-0 flex flex-col gap-0 sm:max-w-lg">
  {/* Zone 1 — Header (sticky) */}
  <div className="shrink-0 px-6 py-4 border-b flex items-center justify-between">
    <SheetHeader>
      <SheetTitle className="text-base font-semibold">Sheet Title</SheetTitle>
      <SheetDescription className="text-[13px] text-muted-foreground">
        Optional description.
      </SheetDescription>
    </SheetHeader>
  </div>
  {/* Zone 2 — Scrollable body */}
  <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4 space-y-4">
    {/* form fields */}
  </div>
  {/* Zone 3 — Footer (sticky) */}
  <div className="shrink-0 px-6 py-4 border-t flex items-center justify-end gap-2">
    <SheetClose asChild><Button variant="outline">Cancel</Button></SheetClose>
    <Button type="submit">Save Changes</Button>
  </div>
</SheetContent>
```

### Empty states

Every empty state uses `<EmptyState>` (`components/ui/empty-state.tsx`). Rules:

- **Always fills the available height** of its container: `flex-1 h-full min-h-[40vh]` or
  `min-h-[60vh]` for full-page empty states.
- **Three elements, in order:** illustration/icon → title → description → one CTA.
- **Icon context:** use a lucide-react icon at `h-8 w-8 text-muted-foreground/40` for empty table
  bodies. Use an `@animateicons/react` animated icon for full-page empty states.
- **Title:** short noun phrase — "No employees yet", "No deals found", "Nothing here".
- **Description:** one sentence — what the user would need to do or why the state exists.
- **CTA:** one `<Button>` linking to the create action. Never two CTAs.
- **Filter-empty vs data-empty:** When filters are active, description = "No results match your
  filters." and CTA = "Clear filters". When no data at all, CTA = the create action.

```tsx
<EmptyState
  illustration={<UserIcon className="h-8 w-8 text-muted-foreground/40" />}
  title="No employees yet"
  description="Add your first employee to get started with HR management."
  action={
    <Button size="sm" onClick={onCreateEmployee}>
      Add Employee
    </Button>
  }
  className="flex-1 min-h-[50vh] border-0 bg-transparent"
/>
```

### Loading states

**Rule: skeletons, never standalone spinners for data-loading.**

- Use `<SkeletonTable rows={N} columns={M} />` from `components/shared` for table pages.
- Use `<Skeleton>` (shadcn) for card/metric placeholders — each `Skeleton` must match the shape
  of its real content (height, width, border-radius).
- `Loader2` spinning icon is only for button loading states (`isPending`) and inline mutations,
  never as a page-level loading indicator.
- Timing: if data resolves in < 200ms, suppress the skeleton (use `{ isPending && !data }` guard).

### Error states

Use `<ErrorState>` (`components/shared`) with:
- A friendly, non-technical title.
- A `description` that can include the raw error if it is user-actionable (e.g., "Network error —
  check your connection").
- An `onRetry` callback wired to the query's `refetch`.
- `className="flex-1"` so it fills available height.

### Badges / status chips

All status indicators use `<Badge variant="outline">` from shadcn with semantic Tailwind classes
from the palette table in §2. The size scale:

| Context | Height | Padding | Font size |
|---|---|---|---|
| Table row | `h-4` | `px-1.5 py-0` | `text-[9px]` |
| Card chip | `h-5` | `px-2 py-0.5` | `text-[10px]` |
| Page header / filter | `h-5` | `px-2 py-0.5` | `text-xs` |

---

## 8. Icons

### Primary library: `@animateicons/react`

Use `@animateicons/react` for contexts where animation adds value:
- Primary sidebar navigation items (active state triggers animation once on selection)
- Empty state illustrations on full-page empty states
- Primary CTA buttons on onboarding and feature-intro screens
- Success / completion states (confetti, checkmark spring)

Available icon sets: 248 Lucide icons at `animateicons.in/icons/lucide` and 33 Huge icons at
`animateicons.in/icons/huge`. **Check these lists before reaching for a lucide-react fallback.**

```tsx
import { AnimateIcon } from "@animateicons/react";
// Use the exact icon name from animateicons.in
```

### Fallback: `lucide-react` (static)

For all contexts where animation is inappropriate or the icon does not exist in `@animateicons/react`:
- All table row action icons
- Filter bar icons (search magnifier, etc.)
- Dense list icons
- Form field icons
- All `MoreHorizontal`, `ChevronLeft`, `ChevronRight`, `X`, `Loader2`
- Any icon not available in the animateicons catalog

```tsx
import { Search, MoreHorizontal, Loader2 } from "lucide-react";
```

### Banned icon libraries

- `@phosphor-icons/react` — banned for all new code.
- `react-icons` — banned.
- Any other icon library not listed above.

### Sizing scale

| Context | Size | Tailwind |
|---|---|---|
| Sidebar nav item | 16×16px | `h-4 w-4` |
| Table row action | 16×16px | `h-4 w-4` |
| Filter bar icon | 16×16px | `h-4 w-4` |
| Button icon (standard) | 14×14px | `h-3.5 w-3.5` |
| Button icon (small) | 12×12px | `h-3 w-3` |
| Empty state illustration | 32×32px | `h-8 w-8` |
| Full-page empty state (animated) | 48×48px | `h-12 w-12` |
| Card / stat icon | 20×20px | `h-5 w-5` |

---

## 9. Motion

### Principles

1. **Animate only GPU-composited properties**: `opacity`, `transform` (translate, scale, rotate).
   Never animate `width`, `height`, `padding`, `margin`, or `top/left` — they trigger layout.
2. **Fast and purposeful**: 150–250ms for micro-interactions; 250–350ms for panel/page transitions.
   Nothing slower than 400ms in application chrome.
3. **Always respect `prefers-reduced-motion`**: Use Framer Motion's `useReducedMotion()` hook.
   When reduced motion is requested: preserve opacity transitions only; disable all translate and
   scale animations.
4. **Animate the container, never text nodes**: Animating text directly causes anti-aliasing
   artifacts. Wrap text in a `motion.div`.

### Duration and easing reference

| Context | Duration | Easing | Notes |
|---|---|---|---|
| Button hover color | 150ms | CSS `transition-colors` | No Framer needed |
| Button press scale | 100ms | `ease-out` | `whileTap={{ scale: 0.97 }}` |
| Dropdown / popover open | 150ms | `ease-out` | Via shadcn `tailwindcss-animate` |
| Sheet slide-in from right | 200ms | `ease-out` | `slide-in-from-right` |
| Dialog fade + scale | 150ms | `ease-out` | `fade-in-0 zoom-in-95` |
| Page transition (fade-up) | 300ms | `ease` forwards | `.animate-fade-up` CSS class |
| List stagger entrance | 80ms per item | `ease-out` | `delay: index * 0.08` |
| Toast entrance | 200ms | `ease-out` | Sonner default |
| Skeleton shimmer | 1.5s | linear infinite | CSS `animation: shimmer` |

### Framer Motion variant patterns (standardized)

```ts
// Stagger container (list pages)
export const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06 } },
};

// Child fade-up item
export const fadeUp = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.22, ease: "easeOut" } },
};

// Page-level entrance
export const pageEnter = {
  initial: { opacity: 0, x: 16 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -16 },
  transition: { duration: 0.22, ease: "easeOut" },
};
```

### Reduced motion implementation

```tsx
import { useReducedMotion, motion } from "framer-motion";

function AnimatedList({ items }: { items: Item[] }) {
  const shouldReduceMotion = useReducedMotion();

  const itemVariants = shouldReduceMotion
    ? { hidden: { opacity: 0 }, visible: { opacity: 1 } }
    : fadeUp;

  return (
    <motion.ul variants={staggerContainer} initial="hidden" animate="visible">
      {items.map((item) => (
        <motion.li key={item.id} variants={itemVariants}>
          {/* content */}
        </motion.li>
      ))}
    </motion.ul>
  );
}
```

### What never animates

- Sidebar width transition: use CSS `transition-[width] duration-300 ease-in-out` only (already
  correct in DashboardShell).
- Table rows on data refresh: no entrance animation when rows re-render after a mutation. Rows are
  not unmounted/remounted on update — only the page-level `AnimatePresence` wraps new pages.
- Every hover state: hover color/background changes use CSS `transition-colors duration-150` only,
  never Framer Motion (saves 10s of JS events per second on dense tables).
- Status badge changes: instant, no animation.

---

## 10. Anti-Patterns

Each pattern below is **banned**. Code review must flag any instance.

### AP-1: Double padding in Sheets

**Pattern:** `<SheetContent>` has no explicit `p-0`, so its default `p-6` padding applies. Inner
content adds another `p-4` wrapper. Total: 40px of edge padding.

**Rule:** `SheetContent` always receives `className="p-0 flex flex-col gap-0"`. Inner zones manage
their own padding. (See §4 and §7 for the correct pattern.)

**Detectable in review by:** `SheetContent` missing `p-0` in its className.

---

### AP-2: Tabs with 5+ options

**Pattern:** A status filter implemented as `<Tabs>` with 6 tab items: All / Draft / Sent /
Accepted / Rejected / Expired. At 768px the tab strip overflows or wraps.

**Rule:** Tabs are only used when there are ≤4 mutually exclusive views AND each option is a major
content category (not a status filter value). For status filters: use `<Select>`. For 5+ values:
always `<Select>`. (See §6.)

**Detectable in review by:** `<TabsList>` containing ≥5 `<TabsTrigger>` children.

---

### AP-3: Gradient text in application chrome

**Pattern:** `.brand-text` or `background-clip: text` gradient applied to page titles, section
headers, table column names, button labels, or sidebar nav items inside the authenticated shell.

**Rule:** Brand gradient text is restricted to: landing page, `/signin`, `/signup`, and onboarding
wizard hero text. Inside the authenticated dashboard: all text uses foreground semantic tokens only.
`text-foreground`, `text-muted-foreground`, `text-blue-600` (links only) — no `.brand-text`.

**Detectable in review by:** `brand-text`, `brand-sweep`, or `gradient-signature` classes inside
`app/(authenticated)/` or `features/` component files (except org-setup / onboarding).

---

### AP-4: Oversized border radius

**Pattern:** `rounded-3xl` (24px) or `rounded-2xl` (16px) on cards, tables, inputs, sheets, or
dialogs inside the authenticated shell.

**Rule:** `rounded-lg` (10px via `--radius`) for cards/panels, `rounded-md` (8px) for inputs and
table containers, `rounded-xl` (14px) for bottom sheets and onboarding steps only.
`rounded-2xl`/`rounded-3xl` are marketing-only surfaces.

**Detectable in review by:** `rounded-2xl` or `rounded-3xl` class on any element inside
`app/(authenticated)/`.

---

### AP-5: Missing filters on filterable list pages

**Pattern:** A list page (employees, deals, invoices, assets) with ≥50 potential rows has no
search input and no status filter. Users must scroll the full list.

**Rule:** Every list page with searchable/filterable content must have at minimum: (a) a search
input and (b) a status `<Select>`. Pages with multi-dimension data must add assignee, date range,
or type filters. (See §6.)

**Detectable in review by:** A `PageWrapper` component on a list page with no `filters` prop.

---

### AP-6: Per-page ad-hoc header

**Pattern:** A page renders its own `<div>` header with a title, not using `<PageWrapper>`. This
breaks the grid alignment and creates inconsistent spacing.

**Rule:** Every authenticated page uses `<PageWrapper>` from `@/components/ui/page-wrapper`. No
page builds its own title/header/action row. The only exceptions are pages with `noInternalScroll`
that wrap their entire layout in a custom flex container — and even those must embed `<PageWrapper>`
or replicate its header JSX exactly.

**Detectable in review by:** A page file in `app/(authenticated)/` that contains a `<h1>` not
inside `<PageWrapper>`.

---

### AP-7: Spinning loader as page loading state

**Pattern:** `{isLoading && <Loader2 className="animate-spin mx-auto" />}` used as the page-level
loading state.

**Rule:** Page-level data loading shows `<SkeletonTable>` (for list pages) or `<Skeleton>`
placeholders (for card/detail pages) that match the real layout shape. `Loader2` is for button
pending states only.

**Detectable in review by:** `<Loader2>` or `animate-spin` appearing as the direct child of a
page's root return when `isLoading` is true, without a `<Button>` parent.

---

### AP-8: Inline hex colors or arbitrary values

**Pattern:** `className="text-[#3b82f6]"` or `style={{ backgroundColor: '#0b1220' }}` in component
files.

**Rule:** All colors reference design tokens (CSS variables via Tailwind utilities: `text-primary`,
`text-accent`, `text-blue-600`). Only status badge Tailwind classes (emerald/amber/red/blue
semantic families) are allowed as literal Tailwind color utilities without a CSS variable. No hex
codes or RGB values in JSX.

**Detectable in review by:** Arbitrary color values in square brackets in Tailwind classes
(e.g., `text-[#...]`, `bg-[rgba(...)]`) or `style` attributes with color properties.

---

## 11. Rollout Conformance Checklist

For each page being built or audited, verify every item:

### Header and navigation
- [ ] Uses `<PageWrapper>` with `title`, `subtitle`, `actions`, `filters` props (no ad-hoc header)
- [ ] Page title is ≤3 words (or a clear noun phrase)
- [ ] `subtitle` shows a live count for list pages
- [ ] At most 3 action buttons; exactly 1 uses `variant="default"` (primary)
- [ ] Back-navigation link present on detail pages (`ChevronLeft` + label)
- [ ] Eyebrow label set on pages nested ≥2 levels deep

### Filters and toolbar
- [ ] List page has at minimum a search input + status Select in `filters` prop
- [ ] All filter controls are height `h-8`, font `text-xs`
- [ ] Filters update URL via `router.replace` + `useSearchParams`
- [ ] Pagination resets when any filter changes
- [ ] Tabs not used for ≥5 options (use Select instead)
- [ ] Active filter count badge shown on mobile when ≥3 filters active

### Tables
- [ ] Table container uses `border border-border rounded-md` with internal `flex flex-col`
- [ ] Scrollable body uses `flex-1 min-h-0 overflow-auto`
- [ ] Header is `sticky top-0 z-10 bg-muted/80 backdrop-blur-sm`
- [ ] Header cells: `text-[10px] uppercase tracking-wider font-bold px-2 py-1.5`
- [ ] Data rows: `h-8 hover:bg-muted/30 transition-colors`
- [ ] Data cells: `px-2 py-1 text-[11px]`
- [ ] Numeric cells: `font-mono tabular-nums`
- [ ] Link cells: `text-blue-600 hover:underline`
- [ ] Status cells: `<Badge variant="outline" className="h-4 text-[9px] px-1.5 py-0 ...">` with semantic colors
- [ ] Empty table body renders `<EmptyState>` inside colspan cell with `border-0 bg-transparent min-h-[40vh]`
- [ ] Row action button: `variant="ghost" size="icon" className="h-7 w-7"`
- [ ] Sticky pagination footer with "Showing X–Y of Z" text

### Cards and layout
- [ ] Cards use `bg-card rounded-lg border border-border` (no `rounded-3xl`, no inline hex)
- [ ] Card internal padding is `p-4` (standard) or `p-3` (compact)
- [ ] No gradient text in dashboard chrome
- [ ] All spacing uses 4px-grid values (no arbitrary px values)

### Sheets and Dialogs
- [ ] `SheetContent` always has `p-0 flex flex-col gap-0`
- [ ] Sheet has 3 zones: header (px-6 py-4 border-b), scrollable body (flex-1 overflow-y-auto px-6 py-4), footer (px-6 py-4 border-t)
- [ ] Dialog used for ≤5-field forms; Sheet used for ≥6-field forms
- [ ] `AlertDialog` used for all destructive confirmations
- [ ] No double-padding (SheetContent outer + inner div)

### States
- [ ] Loading: `<SkeletonTable>` or per-element `<Skeleton>` — no standalone `<Loader2>` spinner
- [ ] Empty: `<EmptyState>` with icon + title + description + one CTA, filling available height
- [ ] Error: `<ErrorState>` with friendly message + retry, filling available height
- [ ] All three states are implemented (not just happy path)

### Icons
- [ ] lucide-react for table rows, filter icons, button icons, dense lists
- [ ] `@animateicons/react` checked first for empty states and primary CTAs
- [ ] No `@phosphor-icons/react` imports in new or modified files
- [ ] Icon sizes follow sizing scale (h-4 w-4 for nav/table, h-3.5 w-3.5 for button icons)

### Motion
- [ ] List pages use `staggerContainer` + `fadeUp` variants from `lib/motion-variants`
- [ ] `useReducedMotion()` checked; animations disabled/simplified when true
- [ ] No animation on table rows during data refresh
- [ ] No `animate-spin` at page level
- [ ] No duration > 400ms in dashboard chrome

### Type and tokens
- [ ] No `any`, no `@ts-ignore`, no type casts to silence TS
- [ ] No inline hex colors or arbitrary color values
- [ ] All colors use Tailwind semantic utilities or CSS variable references
- [ ] Numeric data in tables uses `font-mono tabular-nums`
- [ ] Table headers use `text-[10px] uppercase tracking-wider font-bold`

### Accessibility and responsiveness
- [ ] Tested at 375px (mobile), 768px (tablet), 1280px (desktop)
- [ ] `<SkipLink>` present in shell (already wired in DashboardShell)
- [ ] All interactive elements keyboard-navigable; `aria-label` on icon-only buttons
- [ ] Filter bar wraps gracefully at 375px
- [ ] Table uses `min-w-max` on inner div for horizontal scroll without overflow clip

---

## Appendix A — Shell Architecture Reference

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
    └── div [Content area — flex-1 min-w-0 flex flex-col overflow-hidden]
        ├── GlobalHeader [h-10 shrink-0 border-b px-4]
        └── main [flex-1 min-w-0 flex flex-col overflow-hidden]
            └── div [flex-1 min-h-0 overflow-auto flex flex-col pb-16 md:pb-0]
                └── [PageWrapper — fills remaining height]
                    ├── Header zone [shrink-0 px-4 sm:px-6 pt-4 pb-2]
                    ├── Filter bar zone [shrink-0 border-b]
                    └── Content zone [flex-1 min-h-0 overflow-y-auto]
```

Mobile:
```
└── [Sheet — left, w-[17rem]] for nav
└── [MobileBottomNav — fixed bottom, z-40, pb-safe]
```

---

## Appendix B — Sources Consulted

This document synthesizes patterns from the following sources (100+ data points):

**Product design languages analyzed:** Linear (redesign blog + DesignMD), Stripe (dashboard
patterns + DesignMD), Vercel (design guidelines + typography docs + DesignMD), Attio (design
breakdown + SaaSUI), Resend (DesignMD), Cal.com (design system), PostHog, Supabase (dashboard
design), Notion, HiBob, Rippling, Gusto, Deel, Personio, Lattice, HubSpot, Pipedrive, Close,
Asana, Monday.com, ClickUp, Height, Campsite, Missive, Plain, Clerk, Airtable (via SaaSUI.design,
SaaSFrame, NicelyDone, PageFlows, Refero, Mobbin pattern databases).

**Reference articles:** Pencil & Paper (enterprise data table UX), Eleken (filter UX, tab UX,
table UX, empty states), UXPin (filter patterns), DonUX (B2B listing page anatomy), NN/G
(skeleton screens), LogRocket (sheets vs dialogs, Linear design), UX Collective (B2B dashboard
design), UXPatterns.dev, Carbon Design System (data table usage), PatternFly (drawer patterns).

**Typography:** Vercel Geist Typography docs, Lexington Themes Geist OpenType features guide,
FontAlternatives (dense dashboard fonts), official Geist Google Fonts entry.

**Technical:** shadcn/ui theming documentation, Framer Motion animation docs, Framer easing
functions reference, Motion for React (prefers-reduced-motion), CSS `font-variant-numeric`
specification, Tailwind CSS utility reference.

**Codebase ground truth:** StreamlineOS `frontend/globals.css` (token definitions), `components/
ui/page-wrapper.tsx` (PageWrapper contract), `components/layout/dashboard-shell.tsx` (shell
architecture), `app/(auth)/signin/page.tsx` (immutable reference), `app/(authenticated)/crm/
quotes/page.tsx` (table + filter pattern reference), `components/layout/project-sidebar.tsx`
(secondary sidebar reference).
