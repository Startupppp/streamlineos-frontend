---
name: StreamlineOS
description: Multi-tenant business OS — monochrome ink chrome, user-chosen accent, color only for meaning
colors:
  ink: "#0b1220"
  canvas: "#f8fafc"
  panel: "#ffffff"
  mist: "#f1f5f9"
  hairline: "#e2e8f0"
  annotation: "#64748b"
  focus: "#94a3b8"
  signal-red: "#dc2626"
  signal-blue: "#3b82f6"
  brand-deep: "#1e40af"
  brand-cyan: "#06b6d4"
  night-canvas: "#0a0a0b"
  night-panel: "#131316"
typography:
  display:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.7rem"
    fontWeight: 800
    lineHeight: 1.25
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "-0.02em"
  title:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: "-0.01em"
  body:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: 1.35
  mono:
    fontFamily: "Geist Mono, ui-monospace, SFMono-Regular, monospace"
    fontSize: "0.8125rem"
    fontWeight: 400
    lineHeight: 1.5
rounded:
  sm: "6px"
  md: "8px"
  lg: "10px"
  xl: "14px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
components:
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "#ffffff"
    rounded: "{rounded.md}"
    height: "36px"
    padding: "8px 16px"
  button-primary-hover:
    backgroundColor: "#232936"
  button-secondary:
    backgroundColor: "{colors.mist}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    height: "36px"
    padding: "8px 16px"
  button-outline:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    height: "36px"
    padding: "8px 16px"
  button-ghost:
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    height: "36px"
    padding: "8px 16px"
  button-destructive:
    backgroundColor: "{colors.signal-red}"
    textColor: "#ffffff"
    rounded: "{rounded.md}"
    height: "36px"
    padding: "8px 16px"
  input:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    height: "36px"
    padding: "8px 12px"
  card:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.ink}"
    rounded: "{rounded.xl}"
    padding: "16px"
  filter-control:
    backgroundColor: "{colors.panel}"
    rounded: "{rounded.md}"
    height: "32px"
---

# Design System: StreamlineOS

## 1. Overview

**Creative North Star: "Ink First, Color Earned"**

StreamlineOS is a monochrome instrument. The chrome — canvas, panels, borders, text, even the primary CTA — is drawn entirely in ink and slate. Color appears on screen for exactly two reasons: the user chose it (one of 18 selectable accent themes that retint `--primary`, `--ring`, and the sidebar in one move) or it means something (emerald success, amber warning, red danger, blue info). The default Ink theme renders the entire authenticated app with no hue at all, and it must always look finished that way. Any surface that only works when an accent theme is active is wrong.

This is a product-register system in the Linear/Stripe lane, built for people who live in it 6–8 hours a day across 30+ modules. Density with restraint: compact 36px controls, 14px body text, tables that show 50 rows — breathing through deliberate section separation, never random gaps. Every page shares one skeleton (PageWrapper: compact header, flat filter toolbar, content body), so the whole platform feels like one desk. It explicitly rejects the retired violet/indigo gradient SaaS look, rainbow dashboards, glassy blurred cards inside the shell, and generic admin-template output. The landing page and `/signin`/`/signup` are immutable reference surfaces; the app conforms to them, never the reverse.

**Key Characteristics:**
- Monochrome ink chrome; accent is user-selected via theme tokens, never hardcoded
- Dense, compact, all-day-usable: 36px controls, 14px body, 32px filter rows
- One page anatomy everywhere (PageWrapper); consistency over surprise
- Borders structure, shadows respond; flat by default
- Every state designed: skeleton loading, teaching empty states, friendly errors
- Motion is 150–250ms state communication, never decoration

## 2. Colors

A slate-neutral instrument palette: cool near-white canvas, white panels, ink text, with all accent color delegated to theme tokens and all semantic color held in reserve.

### Primary
- **Ink** (#0b1220): The system's voice. Primary CTAs, headings, body text, the active accent in the default Ink theme. In dark mode it inverts to near-white (#f4f4f5) on a zinc-black canvas (#0a0a0b).

### Neutral
- **Canvas** (#f8fafc): The page background, owned by the shell. Pages never repaint it — no page-level gradients, no `min-h-screen`.
- **Panel** (#ffffff): Cards, popovers, inputs, and the sidebar. Sits one tonal step above Canvas; the lift is the border's job, not a shadow's.
- **Mist** (#f1f5f9): The hover wash for menus and rows, secondary button fill, muted surfaces. Never a text color.
- **Hairline** (#e2e8f0): Every border and input stroke. 1px, full-perimeter, never thicker, never a colored side-stripe.
- **Annotation** (#64748b): Secondary text — descriptions, timestamps, meta. Body copy stays Ink; Annotation is for genuinely subordinate text only.
- **Focus** (#94a3b8): The focus ring in the Ink theme; accent themes override `--ring` with their own hue.
- **Night Canvas / Night Panel** (#0a0a0b / #131316): Dark mode's zinc ladder. Dark stays monochrome in Ink; borders become white at 30% opacity.

### Semantic
- **Signal Red** (#dc2626): Destructive actions and errors only.
- **Signal Blue** (#3b82f6): Semantic "info" status and chart seeds only — never the theme accent. Interactive accent surfaces use `--primary`/`--ring` tokens so all 18 themes retint them.
- **Brand Deep → Brand Cyan** (#1e40af → #3b82f6 → #06b6d4): The marketing gradient. Landing and auth surfaces only; forbidden inside the authenticated shell.

### Named Rules
**The Borrowed Accent Rule.** The accent color is never yours to pick. Interactive tints (selection, active nav, unread dots, count badges, drag states) use theme tokens — `bg-primary`, `bg-primary/5..15`, `border-l-primary`, `--ring` — never a literal Tailwind hue. If the screen only looks right in the Blue theme, it's broken.

**The Semantic Reserve Rule.** Emerald, amber, red, and blue are a status vocabulary, not decoration. A colored chip always means something; every light-tint pairing (`bg-X-50 text-X-700 border-X-200`) carries its dark-mode variant (`dark:bg-X-500/10 dark:text-X-300 dark:border-X-500/30`).

**The HR Exception.** The HR module keeps its rich gradient hero and toned quick-action tiles by explicit decision. Preserve it in conformance passes; do not export its richness to other modules.

## 3. Typography

**Display/Body Font:** Geist (with ui-sans-serif, system-ui fallback)
**Mono Font:** Geist Mono (with ui-monospace fallback)

**Character:** One family carries everything — a crisp geometric sans tuned with `cv02/cv03/cv04/cv11` alternates, negative tracking on headings, and weight (not size) doing most of the hierarchy work. Fixed rem sizes; nothing fluid inside the app shell.

### Hierarchy
- **Display** (800, 1.25–1.7rem responsive, tight leading, -0.02em): Module hero surfaces only, via PageWrapper `variant="display"`. Reserved, not default.
- **Headline** (600, 1rem–1.125rem, tight leading, -0.02em): The standard PageWrapper page title.
- **Title** (600, 0.875rem): Card headers, dialog titles, section headings.
- **Body** (400, 0.875rem, 1.5): Default text. Prose caps at 65–75ch; tables and dense UI may run wider.
- **Label** (500, 0.75rem): Form labels, table headers, badges, meta text.
- **Mono** (400, 0.8125rem): IDs, keys, code, numeric tabular data.

### Named Rules
**The One Family Rule.** Geist everywhere, weight for hierarchy. No display fonts in UI labels, no second sans, no font pairing inside the shell.

**The Balanced Heading Rule.** Headings get `text-wrap: balance`, prose gets `text-wrap: pretty` — set globally; don't undo it.

## 4. Elevation

**The doctrine: borders structure, shadows respond.** Surfaces are flat at rest — a 1px Hairline border and a one-step tonal difference (Canvas → Panel) convey all structure. Shadows exist only where something floats above the page (popovers, dialogs, dropdowns) or demands action (the primary CTA's soft ambient glow). In dark mode, drop shadows become inset glass highlights (`shadow-noir` flips to a light inner edge) because black-on-black shadows are invisible.

### Shadow Vocabulary
- **Card rest** (`shadow-sm`): The most a resting card ever carries. `bg-card border border-border rounded-xl shadow-sm` is the canonical in-shell card.
- **Soft** (`0 1px 3px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.04)`): Barely-there ambient lift for grouped panels.
- **Medium** (`0 4px 6px -1px rgba(0,0,0,0.07), 0 10px 32px -4px rgba(0,0,0,0.06)`): Floating layers — popovers, dropdowns, hover-lifted cards.
- **Noir** (`0 1px 2px rgba(15,23,42,0.04), 0 8px 24px -10px rgba(15,23,42,0.12), 0 0 0 1px rgba(15,23,42,0.04)`): Premium framed lift with a built-in 1px ring; hero cards and key surfaces.
- **CTA** (`0 8px 22px -10px rgba(11,18,32,0.35)`): The primary button's ambient authority — the one resting shadow with real presence.

### Named Rules
**The Flat-At-Rest Rule.** If an element isn't floating and isn't the primary CTA, it has at most `shadow-sm`. Backdrop-blur and glass panels are landing/auth-only; inside the shell they are prohibited.

## 5. Components

Crisp, compact, quietly tactile: hairline borders, instant hover feedback, and a universal `press-scale` (scale 0.97, 100ms) on press that makes controls feel physical without being playful.

### Buttons
- **Shape:** Gently rounded (8px), 36px tall (`h-9` canon), 14px medium/semibold text, press-scale built in.
- **Primary:** Ink fill, white text, CTA ambient shadow; hover dims to 90%. One primary per view.
- **Outline:** Panel fill, Hairline border; hover keeps the fill and warms the border to `primary/50`.
- **Secondary / Ghost:** Mist fill fading to 70% / transparent with Mist hover wash.
- **Destructive:** Signal Red fill; reserved for genuinely destructive acts.
- **Focus:** 1px `--ring` ring plus ring-colored border — visible in every theme.
- **Async:** Every mutation button is the shared `LoadingButton` (spinner + optional loading text); icon-bearing buttons use `AnimatedIconButton` with the animated icon set.

### Inputs / Fields
- **Style:** 36px, Panel background, Hairline stroke, 8px radius, 14px text (`FIELD_CONTROL_CLASS` — the single source for all field chrome).
- **Hover:** Border warms to `primary/40`. **Focus:** border and 1px ring take `--ring`.
- **Error / Disabled:** `aria-invalid` flips border+ring to Signal Red; disabled drops to 50% opacity on a Mist fill.

### Cards / Containers
- **Corner Style:** 14px (`rounded-xl`).
- **Canonical form:** Panel background, Hairline border, `shadow-sm`, 16px padding. No backdrop-blur, no heavy shadows, no nested cards — a card never contains another card.

### Filter Toolbars
- **Flat flex row, never a panel.** Controls sit directly on Canvas at 32px (`h-8`, `FILTER_SELECT_TRIGGER`); compact `ViewToggle`/`TabsList` groups are the only bordered chrome. Select dropdowns grow to fit long labels (`min-w-[var(--radix-select-trigger-width)]`).

### Navigation
- **Sidebar:** Panel-white (near-black in dark), sticky full-height; only the main content scrolls. Active item gets a `color-mix` tint of the theme's sidebar-primary (8–10%) — a wash, not a fill. Nav icons animate on hover via the shared `useAnimatedIcon` hook.

### PageWrapper (signature)
Every authenticated page renders through it: eyebrow/title/subtitle + right-aligned actions, optional filter strip, then a fill-chain content body (`flex-1 min-h-0`, inner scroll only). `backHref` appears only on nested detail pages; sibling pages in a module share one heading variant.

## 6. Do's and Don'ts

### Do:
- **Do** render the default Ink theme as the finished product — pure monochrome chrome with `bg-primary` accents that happen to be ink.
- **Do** use theme tokens (`bg-primary`, `bg-primary/10`, `--ring`) for every interactive accent so all 18 palettes retint the app in one move.
- **Do** keep the h-9 (36px) control canon and h-8 (32px) filter canon; density is the product.
- **Do** ship all five states per page: skeleton loading that mirrors the real layout, teaching empty states with one action, friendly error + retry, sparse, and dense.
- **Do** keep motion 150–250ms ease-out on opacity/transform, with `prefers-reduced-motion` fallbacks, and press feedback via the built-in `press-scale`.
- **Do** preserve the HR module's gradient hero and toned tiles — it is a deliberate exception.
- **Do** show human-readable names everywhere; a visible raw UUID is a bug.

### Don't:
- **Don't** resurrect the retired violet/indigo gradient CTA style — brand gradients (`gradient-brand`, `brand-sweep`) live on landing/marketing surfaces only, never inside the authenticated shell.
- **Don't** hardcode `blue-*` (or any literal hue) on interactive accent surfaces; blue is semantic "info" and chart seeds only.
- **Don't** build rainbow dashboards: no decorative color on chrome, no full-saturation tints on inactive states.
- **Don't** use glassy blurred cards, heavy shadows, `min-h-screen`, or page-level gradients inside the shell — the shell owns the background.
- **Don't** wrap filter rows in a bordered card, nest cards, or use colored side-stripe borders thicker than 1px.
- **Don't** ship default-looking buttons, flat identical card grids, or lone spinners where skeletons belong — the anti-reference is "generic admin template".
- **Don't** invent a second field style, a second error-message path (`getErrorMessage` is canonical), or a second rich-text editor.
- **Don't** let neutral hexes or `bg-white`/`slate-*` chrome bypass semantic tokens — they must flip correctly in dark mode.
