# STREAMLINEOS DESIGN SYSTEM — SINGLE SOURCE OF TRUTH

> Claude Code: Read this file COMPLETELY before auditing any page.
> Every visual decision on every page must comply with this file.
> If a page violates any rule here, it is a defect and must be fixed.
> If a value below is marked `TODO`, replace it with the project's actual value
> from `tailwind.config` / `globals.css` BEFORE starting the audit.

---

## 0. REPO RECONCILIATION (filled 2026-07-14 — extracted tokens win)

Source of truth: `frontend/globals.css` + `frontend/themes.css` + `UI-UX-SYSTEM.md` (canonical spec) +
`CLAUDE.md` §13–§15. Where the generic §2–§4 values below conflict with the repo's compact scale,
**the repo standard wins** — do NOT "fix" pages toward the generic values:

- **Tables:** header cells `text-[10px] uppercase tracking-wider font-bold px-2 py-1.5`; data rows `h-8 hover:bg-muted/30`; cells `px-2 py-1 text-[11px]`.
- **Badges:** table-row `h-4 text-[9px] px-1.5 py-0`; card chip `h-5 text-[10px] px-2 py-0.5`; header/filter `h-5 text-xs`.
- **Sheets/Dialogs:** 3 zones — header `px-6 py-4 border-b shrink-0`, body `flex-1 min-h-0 overflow-y-auto px-6 py-5`, footer `px-6 py-4 border-t shrink-0`; container `p-0 flex flex-col gap-0`.
- **Spacing:** 4px grid, compact density (Linear/Stripe tier) — not the literal 8px/24px-card-padding scale below.
- **Every authenticated page uses `PageWrapper`** (`components/ui/page-wrapper.tsx`) — the single H1 comes from it; filters live in its `filters` prop; no `min-h-screen`, no page-level gradients.
- **Cards in-shell:** `bg-card border border-border rounded-xl shadow-sm` — no backdrop-blur/heavy shadows.
- **Buttons:** `<LoadingButton>` for every mutation trigger; icons on hoverable surfaces via `@animateicons/react` + `useAnimatedIcon()`.

## 1. COLOR PALETTE

> Extract the real values from `tailwind.config.ts` / CSS variables and fill in.
> NEVER allow hardcoded hex values inside page/component files — all colors must
> come from design tokens (Tailwind theme or CSS variables).

| Token                | Value (repo-verified 2026-07-14)                          | Usage |
|----------------------|-----------------------------------------------------------|-------|
| `primary`            | `--primary` `#0b1220` (slate-900 ink)                     | Primary CTAs, active nav — ink-first, NOT blue |
| `primary-hover`      | `hover:bg-primary/90`                                     | Hover state of primary |
| `primary-active`     | press-scale built into `Button` (never re-add per button) | Pressed state |
| `secondary`          | `--secondary` `#f1f5f9` (slate-100)                       | Secondary buttons |
| `success`            | emerald family — chip `bg-emerald-50 text-emerald-700 border-emerald-200` + `dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30` | Success, positive badges |
| `error` / `danger`   | `--destructive` `#dc2626` (red-600)                       | Errors, destructive buttons, invalid inputs |
| `warning`            | amber family (same chip pattern as success)               | Warnings, pending states |
| `info`               | blue family `#3b82f6` (blue-500) — semantic info + chart seeds ONLY | Informational banners |
| `background`         | `--background` `#f8fafc` (slate-50)                       | Page canvas — shell-owned; pages never repaint it |
| `surface` / `card`   | `--card` `#ffffff`                                        | Card and panel backgrounds |
| `border`             | `--border` `#e2e8f0` (slate-200)                          | ALL borders — must be visible against surface |
| `text-primary`       | `--foreground` `#0b1220`                                  | Headings, primary content |
| `text-secondary`     | `--muted-foreground` `#64748b` (slate-500)                | Captions, helper text, labels |
| `text-disabled`      | `#94a3b8` (slate-400)                                     | Disabled labels |

> **Theme-accent rule (multi-theme system, `frontend/themes.css`):** the shell ships Light/Dark/System × 18
> accent palettes. Interactive accent surfaces (selection tints, active filters, unread dots, count badges,
> drag/selected states) MUST use theme tokens — `bg-primary`, `bg-primary/5..15` tints, `border-l-primary`,
> `--ring` — never hardcoded `blue-*`. Literal blue is reserved for semantic "info" status and chart seeds.
> Every colored light-tint pairing carries its `dark:` variants; never hardcode `bg-white`/`slate-*` chrome —
> semantic tokens only.

### Hard color rules
1. **Contrast:** Text on any background must meet WCAG AA — 4.5:1 for body text, 3:1 for large text (≥18px bold / 24px regular). If content on a card is hard to read because the background dominates, this is a P1 defect.
2. **Borders must be visible.** Card/table/input borders must have visible contrast against both the card surface AND the page background. If `border` color is invisible against `surface`, darken the border token — do not add shadows to compensate.
3. **One primary per view.** Only ONE primary (filled) button per screen section. Everything else is secondary/ghost/outline.
4. **Destructive = danger color, always.** Delete/Remove/Deactivate buttons use the danger token, never primary.
5. **No raw hex in components.** Any `#xxxxxx`, `rgb()`, or arbitrary Tailwind value like `bg-[#123456]` found in a page/component is a defect — replace with the token.

---

## 2. SPACING SYSTEM — 8PX GRID

Base unit = **8px** (Tailwind scale: `2 = 8px`).

| Name | Value | Tailwind | Usage |
|------|-------|----------|-------|
| xs   | 4px   | `1`      | Icon-to-text gap, tight chip padding |
| sm   | 8px   | `2`      | Between related items (label→input) |
| md   | 16px  | `4`      | Between form fields, inside small cards |
| lg   | 24px  | `6`      | Card padding, between card sections |
| xl   | 32px  | `8`      | Between page sections |
| 2xl  | 48px  | `12`     | Page top/bottom padding |

### Hard spacing rules
1. **Every padding/margin must be on the scale above.** Values like `p-[13px]`, `mt-[7px]`, `p-5` mixed with `p-6` on sibling cards = defect.
2. **Card padding is `lg` (24px) everywhere.** All cards across all modules use the same internal padding.
3. **Page shell is identical across modules:** same header height, same page title position, same content max-width, same page padding. Two modules with different page shells = defect.
4. **Table row height, cell padding, and header style must be identical across every table in the app.**
5. **Remove double-spacing:** a card with `p-6` containing a child with `m-6` producing 48px visual gap where siblings show 24px = defect.
6. **Buttons:** `px-5 py-3` (20px/12px) for default size; height 40px. Small buttons 32px, large 48px. All buttons in one toolbar must be the same height.

---

## 3. TYPOGRAPHY

| Style   | Size | Weight | Color            | Usage |
|---------|------|--------|------------------|-------|
| H1      | 30px | 700    | text-primary     | Page title — exactly ONE per page |
| H2      | 24px | 600    | text-primary     | Section titles |
| H3      | 18px | 600    | text-primary     | Card titles |
| Body    | 16px | 400    | text-primary     | Default content |
| Small   | 14px | 400    | text-secondary   | Helper text, table meta |
| Label   | 13px | 500    | text-secondary   | Form labels — uppercase optional but consistent app-wide |
| Caption | 12px | 400    | text-secondary   | Timestamps, badges |

Hard rules: one H1 per page; no skipped heading levels; identical font family everywhere; no page defining its own font sizes outside this scale.

---

## 4. COMPONENT STANDARDS

### Buttons
- Variants: `primary` (filled), `secondary` (outline), `ghost`, `danger` (filled red), `danger-outline`.
- States required on EVERY button: default, hover, active, focus-visible ring, disabled (50% opacity + `cursor-not-allowed`), loading (spinner + disabled + label kept, no layout shift).
- Icon buttons need `aria-label` and a tooltip.

### Inputs / Selects / Textareas
- Height 40px, radius consistent app-wide, label ABOVE the field (13px label style).
- States: default, focus (primary ring), error (danger border + danger helper text BELOW the field), disabled.
- Error message text must state what is wrong and how to fix it — never just "Invalid".
- Required fields marked consistently (one convention app-wide: asterisk OR "(required)" — never both, never mixed).

### Cards
- `surface` background, visible `border`, radius consistent app-wide, padding `lg` (24px).
- Card title = H3. Optional header row with actions right-aligned.
- Content must never touch card edges; nothing inside a card may be unreadable due to background color (P1 if it is).

### Tables / Lists
- Sticky header optional but consistent per module.
- Every table needs: loading state (skeleton rows, NOT spinner-only), empty state (icon + message + primary CTA), error state (message + Retry button), pagination or infinite scroll (one convention app-wide).
- Row actions: same order everywhere (e.g., View, Edit, Delete). Delete always last, always danger-styled.

### Modals / Dialogs
- Overlay dims background; modal has title (H3), body, footer with actions right-aligned: [Cancel (secondary)] [Confirm (primary or danger)].
- Escape closes; overlay click closes ONLY non-destructive modals; focus trapped inside.
- **Destructive confirmation modal is MANDATORY for every delete/deactivate/irreversible action.** Copy pattern: "Delete {item name}? This action cannot be undone." Confirm button = danger, labeled with the verb ("Delete"), never "OK"/"Yes".

### Toasts / Alerts
- Success (green), error (red), warning (amber), info (blue) — consistent position (e.g., top-right) app-wide, auto-dismiss 4s except errors which persist with a close button.
- Every mutation (create/update/delete) MUST produce a success toast on success and an error toast with an actionable message on failure.

### Filters / Search (module list pages)
- One consistent filter bar pattern app-wide: search input left, filter dropdowns next, "Clear filters" appears only when filters are active, active filters shown as removable chips.
- Filtering must be debounced (300ms) for search, and must show a loading indicator on the results area, not a full-page spinner.
- Filter state should survive pagination and ideally be reflected in the URL query string.

### Badges / Status chips
- One status→color mapping app-wide (e.g., Active=success, Pending=warning, Inactive=neutral, Failed=danger). The same status must NEVER be a different color on two pages.

---

## 5. MANDATORY PAGE STATES

Every data-driven page MUST implement all five. A missing state is a defect:

1. **Loading** — skeletons matching final layout (no blank white flash, no layout shift).
2. **Empty** — icon + friendly message + primary CTA to create the first item.
3. **Error** — human-readable message + Retry button. Never a raw error string, stack trace, or silent blank page.
4. **Success/content** — the normal state, compliant with all rules above.
5. **Permission-denied** — if RBAC (`AccessService` on backend) denies access, show a proper "You don't have access" view; hidden/disabled actions for missing permissions, never buttons that 403 silently on click.

---

## 6. ACCESSIBILITY & RESPONSIVENESS MINIMUMS

- All interactive elements keyboard-reachable with a visible focus ring.
- Images/icons that convey meaning have alt/aria-label.
- Forms submit on Enter; modals close on Escape.
- Layout must not break at 1280px and 1440px widths (primary desktop targets); tables scroll horizontally rather than crushing columns.

---

## 7. SEVERITY DEFINITIONS (used in audit reports)

- **P0** — Page broken: crash, blank page, action fails, delete works without confirmation, data loss risk.
- **P1** — Major UX/consistency defect: unreadable content (background dominating), missing error/empty/loading state, wrong color for destructive action, broken filter.
- **P2** — Consistency defect: off-grid spacing, hardcoded color, inconsistent button height, mismatched table style.
- **P3** — Polish: copy improvements, minor alignment, nice-to-have PM suggestions.
