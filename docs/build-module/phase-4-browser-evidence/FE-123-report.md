# FE-123 Browser Evidence Report

Captured: 2026-09-22T04:49:43.126Z
Widths: 375, 1440px
Approach: (a) static-render via esbuild bundle + compiled Tailwind CSS
CSS source: main checkout .next/static/css/e4722c266c890a04.css (Tailwind v4, 393 KB)
CSS SHA-256: 3ab896beb74df78528adc54218b87e4d5016a4bc0ae50e92ef1463856ff4fd55 (stated limitation: design-token CSS variables may differ from production build)

## Approach

Approach (a) — static-render harness — was used.

Each surface component was bundled to browser JavaScript using esbuild with mock stubs
for all data-fetching hooks, `next/link`, `next/navigation`, `next/dynamic`, `framer-motion`,
and `sonner`. UI components (Radix, Tailwind) are real and unblocked.
The real compiled Tailwind CSS from the main checkout was served alongside the bundle.

Per-surface step order (each width, in sequence):
  1. Navigate and settle (2500ms)
  2. Measure overflow (scrollWidth vs innerWidth via overflowExpression)
  3. Walk focus order (Tab keypresses via CDP, up to 35 stops)
  4. Analyse focus order (DOM queries for positive-tabIndex, zero-size, mouse-only)
  5. Check SVG paint (getBBox on chart surfaces only)
  6. Reset scroll to origin (window.scroll(0,0) + all scrolled containers)
  7. Capture screenshot

Screenshots therefore show the initial rendered state, not the post-focus-walk scroll position.
Overflow is measured at step 2 before Tab keypresses move any scroll container.

Focus order analysis checks three conditions via CDP DOM queries: (1) positive tabIndex
attributes (break natural document order), (2) zero-size keyboard-focusable elements
(invisible but reachable by keyboard), and (3) mouse-reachable-but-keyboard-excluded
elements (visible interactive elements with tabindex=-1).

Three named exemption rules are applied before verdict; all are documented in the report:
TABLIST-ROVING-TABINDEX, RADIX-FOCUS-GUARD, and DISPLAY-NONE-NOT-FOCUSABLE (see Named Exemptions).

Approach (b) (Next.js dev server) was rejected: no backend is running, authenticated
routes redirect to sign-in, and starting Next.js without auth is out of scope.

Chart surfaces (velocity, burnup, CFD, cycle-time, lead-time) render the chart component
directly (bypassing the section wrapper with its `dynamic(() => ..., {ssr: false})`)
to allow recharts SVG to render synchronously in the browser bundle.

## Named Exemptions

These rules are applied before focus-order verdict and suppress false positives.
Each exempted element is listed per surface so a reviewer can verify the classification.
A PASS with exemptions differs from a PASS without: the former means the harness found
elements that matched a named rule; the latter means the harness found nothing to exempt.

### TABLIST-ROVING-TABINDEX
- **Applies to:** elements with `role=tab`, or any descendant of `[role=tablist]`, carrying `tabindex="-1"`
- **Justification:** WAI-ARIA Authoring Practices (Tabs Pattern, §5.3) requires roving tabindex: exactly
  one tab carries `tabindex=0` (the active tab); all inactive tabs carry `tabindex=-1` and are reached via
  Arrow keys, not Tab. An inactive tab IN the Tab sequence would be the defect. Radix UI
  `@radix-ui/react-tabs` implements this correctly.
- **Source:** WAI-ARIA APG Tabs Pattern; Radix UI tabs.tsx:4 (`@radix-ui/react-tabs`)

### RADIX-FOCUS-GUARD
- **Applies to:** zero-size keyboard-focusable elements carrying `aria-hidden=true` OR any
  `data-radix-*-focus-guard` attribute
- **Justification:** Radix UI inserts zero-size sentinel elements around modal content to intercept
  Tab-wrap events. They are marked `aria-hidden=true` and carry a `data-radix-focus-guard` attribute.
  Screen readers skip them; sighted users never see them. Flagging them would produce noise on every
  surface that uses Radix Dialog, Sheet, or DropdownMenu.
- **Source:** radix-ui/primitives focus-guards.tsx

### DISPLAY-NONE-NOT-FOCUSABLE
- **Applies to:** zero-size elements whose computed `display` property is `none` (or whose computed
  `visibility` is `hidden`), regardless of their `tabindex` attribute value
- **Justification:** HTML specification and all major browser implementations: `display:none` elements
  cannot receive keyboard focus regardless of tabindex. An element can have `tabindex=0` in the DOM
  (so it is ready to receive focus when its state changes to visible) while being `display:none`
  when inactive — a common pattern in Radix UI TabsContent (`data-[state=inactive]:hidden`) and
  similar widget implementations. The tabindex attribute is harmless; the element is not in the Tab
  sequence and poses no accessibility issue.
- **Detection:** `getComputedStyle(el).display === "none"` via CDP Runtime.evaluate

## Bundle Status

- client-visibility: BUILD OK
- portal-list: BUILD OK
- change-requests: BUILD OK
- client-access: BUILD OK
- feedbucket: BUILD OK
- velocity-chart: BUILD OK
- burnup-chart: BUILD OK
- cfd-chart: BUILD OK
- cycle-time-chart: BUILD OK
- lead-time-chart: BUILD OK
- critical-path-section: NOT-COVERED — React Flow dependency loaded via next/dynamic({ssr:false}); no standalone chart component to bundle outside the dynamic 

## Coverage Matrix

surface | 375px overflow | 375px focus | 375px SVG | 1440px overflow | 1440px focus | 1440px SVG
--- | --- | --- | --- | --- | --- | ---
client-visibility | PASS | PASS | n/a | PASS | PASS | n/a
portal-list | PASS | PASS | n/a | PASS | PASS | n/a
change-requests | PASS | PASS | n/a | PASS | PASS | n/a
client-access | PASS | PASS | n/a | PASS | PASS | n/a
feedbucket | PASS | PASS | n/a | PASS | PASS | n/a
velocity-chart | PASS | PASS | PASS | PASS | PASS | PASS
burnup-chart | PASS | PASS | PASS | PASS | PASS | PASS
cfd-chart | PASS | PASS | PASS | PASS | PASS | PASS
cycle-time-chart | PASS | PASS | PASS | PASS | PASS | PASS
lead-time-chart | PASS | PASS | PASS | PASS | PASS | PASS
critical-path-section | NOT-RUN | NOT-RUN | n/a | NOT-RUN | NOT-RUN | n/a

## Findings

### Note: Focus exemptions applied — client-visibility @ 375px (verdict: PASS)
- [DISPLAY-NONE-NOT-FOCUSABLE: computed display:none — element cannot receive keyboard focus in browsers regardless of tabindex value] `div role=tabpanel tabindex=0 #radix-_r_1_-content-milestones .outline-none.data-[state=inactive]:hidden.data-[st (parent:div)`
- [TABLIST-ROVING-TABINDEX: role=tab or descendant of role=tablist uses roving tabindex per WAI-ARIA Tabs pattern; inactive tabs are intentionally excluded from Tab sequence and reached via Arrow keys] `button[role=tab]:Milestones3`

### Note: Focus exemptions applied — client-visibility @ 1440px (verdict: PASS)
- [DISPLAY-NONE-NOT-FOCUSABLE: computed display:none — element cannot receive keyboard focus in browsers regardless of tabindex value] `div role=tabpanel tabindex=0 #radix-_r_1_-content-milestones .outline-none.data-[state=inactive]:hidden.data-[st (parent:div)`
- [TABLIST-ROVING-TABINDEX: role=tab or descendant of role=tablist uses roving tabindex per WAI-ARIA Tabs pattern; inactive tabs are intentionally excluded from Tab sequence and reached via Arrow keys] `button[role=tab]:Milestones3`

No FAIL findings.

## NOT-COVERED Surfaces

- **critical-path-section** (CriticalPathSection): React Flow dependency loaded via next/dynamic({ssr:false}); no standalone chart component to bundle outside the dynamic wrapper

## NOT-RUN Cells

None.

## Focus Analysis Detail

surface | width | tab-stops | dom-focusable | pos-tabindex | zero-size | mouse-only | tablist-exempt | radix-guard-exempt | verdict
--- | --- | --- | --- | --- | --- | --- | --- | --- | ---
client-visibility | 375 | 9 | 10 | 0 | 0 | 0 | 1 | 1 | PASS
client-visibility | 1440 | 9 | 10 | 0 | 0 | 0 | 1 | 1 | PASS
portal-list | 375 | 9 | 4 | 0 | 0 | 0 | 0 | 0 | PASS
portal-list | 1440 | 5 | 4 | 0 | 0 | 0 | 0 | 0 | PASS
change-requests | 375 | 7 | 9 | 0 | 0 | 0 | 0 | 0 | PASS
change-requests | 1440 | 7 | 9 | 0 | 0 | 0 | 0 | 0 | PASS
client-access | 375 | 5 | 4 | 0 | 0 | 0 | 0 | 0 | PASS
client-access | 1440 | 5 | 4 | 0 | 0 | 0 | 0 | 0 | PASS
feedbucket | 375 | 3 | 2 | 0 | 0 | 0 | 0 | 0 | PASS
feedbucket | 1440 | 5 | 2 | 0 | 0 | 0 | 0 | 0 | PASS
velocity-chart | 375 | 2 | 1 | 0 | 0 | 0 | 0 | 0 | PASS
velocity-chart | 1440 | 2 | 1 | 0 | 0 | 0 | 0 | 0 | PASS
burnup-chart | 375 | 2 | 1 | 0 | 0 | 0 | 0 | 0 | PASS
burnup-chart | 1440 | 2 | 1 | 0 | 0 | 0 | 0 | 0 | PASS
cfd-chart | 375 | 1 | 1 | 0 | 0 | 0 | 0 | 0 | PASS
cfd-chart | 1440 | 2 | 1 | 0 | 0 | 0 | 0 | 0 | PASS
cycle-time-chart | 375 | 2 | 1 | 0 | 0 | 0 | 0 | 0 | PASS
cycle-time-chart | 1440 | 2 | 1 | 0 | 0 | 0 | 0 | 0 | PASS
lead-time-chart | 375 | 2 | 1 | 0 | 0 | 0 | 0 | 0 | PASS
lead-time-chart | 1440 | 2 | 1 | 0 | 0 | 0 | 0 | 0 | PASS

## Screenshots

- client-visibility @ 375px: `D:\projects\personal\slos-phase-4-collab\docs\build-module\phase-4-browser-evidence\screenshots\client-visibility-375px-375px.png`
- client-visibility @ 1440px: `D:\projects\personal\slos-phase-4-collab\docs\build-module\phase-4-browser-evidence\screenshots\client-visibility-1440px-1440px.png`
- portal-list @ 375px: `D:\projects\personal\slos-phase-4-collab\docs\build-module\phase-4-browser-evidence\screenshots\portal-list-375px-375px.png`
- portal-list @ 1440px: `D:\projects\personal\slos-phase-4-collab\docs\build-module\phase-4-browser-evidence\screenshots\portal-list-1440px-1440px.png`
- change-requests @ 375px: `D:\projects\personal\slos-phase-4-collab\docs\build-module\phase-4-browser-evidence\screenshots\change-requests-375px-375px.png`
- change-requests @ 1440px: `D:\projects\personal\slos-phase-4-collab\docs\build-module\phase-4-browser-evidence\screenshots\change-requests-1440px-1440px.png`
- client-access @ 375px: `D:\projects\personal\slos-phase-4-collab\docs\build-module\phase-4-browser-evidence\screenshots\client-access-375px-375px.png`
- client-access @ 1440px: `D:\projects\personal\slos-phase-4-collab\docs\build-module\phase-4-browser-evidence\screenshots\client-access-1440px-1440px.png`
- feedbucket @ 375px: `D:\projects\personal\slos-phase-4-collab\docs\build-module\phase-4-browser-evidence\screenshots\feedbucket-375px-375px.png`
- feedbucket @ 1440px: `D:\projects\personal\slos-phase-4-collab\docs\build-module\phase-4-browser-evidence\screenshots\feedbucket-1440px-1440px.png`
- velocity-chart @ 375px: `D:\projects\personal\slos-phase-4-collab\docs\build-module\phase-4-browser-evidence\screenshots\velocity-chart-375px-375px.png`
- velocity-chart @ 1440px: `D:\projects\personal\slos-phase-4-collab\docs\build-module\phase-4-browser-evidence\screenshots\velocity-chart-1440px-1440px.png`
- burnup-chart @ 375px: `D:\projects\personal\slos-phase-4-collab\docs\build-module\phase-4-browser-evidence\screenshots\burnup-chart-375px-375px.png`
- burnup-chart @ 1440px: `D:\projects\personal\slos-phase-4-collab\docs\build-module\phase-4-browser-evidence\screenshots\burnup-chart-1440px-1440px.png`
- cfd-chart @ 375px: `D:\projects\personal\slos-phase-4-collab\docs\build-module\phase-4-browser-evidence\screenshots\cfd-chart-375px-375px.png`
- cfd-chart @ 1440px: `D:\projects\personal\slos-phase-4-collab\docs\build-module\phase-4-browser-evidence\screenshots\cfd-chart-1440px-1440px.png`
- cycle-time-chart @ 375px: `D:\projects\personal\slos-phase-4-collab\docs\build-module\phase-4-browser-evidence\screenshots\cycle-time-chart-375px-375px.png`
- cycle-time-chart @ 1440px: `D:\projects\personal\slos-phase-4-collab\docs\build-module\phase-4-browser-evidence\screenshots\cycle-time-chart-1440px-1440px.png`
- lead-time-chart @ 375px: `D:\projects\personal\slos-phase-4-collab\docs\build-module\phase-4-browser-evidence\screenshots\lead-time-chart-375px-375px.png`
- lead-time-chart @ 1440px: `D:\projects\personal\slos-phase-4-collab\docs\build-module\phase-4-browser-evidence\screenshots\lead-time-chart-1440px-1440px.png`

## Reproduction

```bash
node frontend/scripts/fe-123-browser-checks.mjs
# Self-test mode:
node frontend/scripts/fe-123-browser-checks.mjs --self-test
# Visible browser (for debugging):
node frontend/scripts/fe-123-browser-checks.mjs --no-headless
```