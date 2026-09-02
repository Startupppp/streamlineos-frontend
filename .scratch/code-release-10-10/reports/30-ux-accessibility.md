# Ticket 30 — UX, accessibility and state coverage across authenticated surfaces

Session S7. Every number below came out of a command whose output I read. Two boxes are ticked;
five are not, each with the precise reason.

## Gates as I found them — all four the brief named already pass

Run first, before any edit, and re-run after. `.next-buildmart/` no longer produces findings —
ticket 25's report described it as red; on this tree it is excluded and the numbers are clean.

| Gate | Before | After | Self-test |
|---|---|---|---|
| `check:empty-states` | ✔ 0 hand-rolled | ✔ 0 hand-rolled, 3770 files | ✔ |
| `check:icon-labels` | ✔ 0 unlabelled, 3755 files | ✔ 0 unlabelled, 3770 files | ✔ |
| `check:seo-metadata` | ✔ OK | ✔ OK | ✔ |
| `check:formatters` | ✔ 0 local formatters | ✔ 0, 5153 files | ✔ |
| `check:colors` (AP-8) | — | ✔ 0 arbitrary hex, 5153 files | ✔ |
| `check:over-300` · `check:client-pages` · `check:route-thinness` · `check:effect-fetches` | — | ✔ 510/5138 · within ceiling · within ratchet · 0 | ✔ |

So no existing gate was hiding the state problem. **There was no gate that measured it.** That is
the gap ticket 28 handed over, and it is what I built.

## The measurement ticket 28 marked BLOCKED — now taken, and ratcheted

`test-utils/surface-state-analysis.ts` resolves each of the 556 `app/(authenticated)/**/page.tsx`
modules through its imports into the feature-owned body ticket 25 extracted (primitives, shell and
providers excluded so their signals cannot leak in), and separately reads the ancestor
`layout.tsx` chain for server-side gates. `components/__tests__/authenticated-surface-states.contract.test.ts`
asserts the counts against frozen baselines and prints the offending routes on failure.

**556 authenticated route modules · 540 read server state.**

| State | Surfaces missing it | Notes |
|---|---|---|
| loading | **2** | effectively closed |
| empty | **56** | |
| **read error** | **78** | see P1 below |
| permission gate | **1** | `/inbox` only |
| offline | **0** | handled once, globally, in the shell |
| filter-empty vs data-empty | **101 files** conflate them | `EmptyState` beside filter state with no `filtersActive` |

The suite has 5 self-tests of the analyzer itself (all four signals detected in a surface that has
them, none in a surface that has none, `animate-spin` caught, `requirePermission` counted as a
gate, a mutation-only file *not* counted as reading server state), so a broken analyzer reporting
"everything is fine" fails rather than passes. 19/19 green.

### P1 — a failed read renders a wrong number, not an error

`components/providers/query-provider.tsx` sets no `throwOnError`, so a rejected query never reaches
`app/(authenticated)/error.tsx`. The segment boundary catches render throws only. On the 78
surfaces with no `isError` branch the page renders its success layout over `undefined`.

Worked example, `/hr/comp-off` → `features/hr/overtime/comp-off-page-client.tsx`:

```tsx
const { data: records, isLoading } = useCompOff();
const earnedDays = records?.[0] ? parseFloat(records[0].earnedDays) : 0;
```

A 500 renders **"0.0 days earned"** in a hero panel. Not a blank state — a confident wrong balance.
This is the shape of all 78. The fix is per-page and lives in `features/**`; the ratchet now stops
it growing.

## Accessibility defects found and fixed (all in `components/**`)

**1. `DataTableColumn.sortable` has never rendered a control — P1.**
`columnDefs` built `{ id, header, cell, enableSorting }` with **no accessor**. `@tanstack/table-core@8.21.3`
`RowSorting.js:178` ends `… && !!column.accessorFn`, so `getCanSort()` was always `false`, the
`<button>` in the header never rendered, and no table in the app could be sorted by keyboard or
mouse — **197 `sortable: true` declarations across 85 files, silently inert**, plus the
`aria-sort` attribute rendering with nothing to operate it. 192 of the 197 already ship an explicit
`sortValue`, so the fix uses it as the accessor and falls back to a narrowed property read for the
other 5. The header button also gained `aria-label={"Sort by " + header}` and a visible
`focus-visible` ring.

**2. `LoadingState` named nothing.** `aria-label` sat on a bare `<div>`, where ARIA's generic role
prohibits naming — the label reached no screen reader. Its existing test asserted the *attribute*,
which is why it passed. Now `role="status"`, and the new test asserts the accessible *name*, with a
bite proof showing a role-less div exposes none.

**3. `DataTable`'s loading branch was silent.** 12 skeleton rows announced as an empty table. Now
`aria-busy="true"` plus an `sr-only role="status"` naming the pending load; the empty branch is a
`role="status"` region so a filter change is announced.

**4. `Skeleton` blocks were announced.** Now `aria-hidden="true"` — the region carries the message.

**5. Heading order broke on every list page.** `PageWrapper` renders `h1`; `EmptyState`,
`ErrorState` and `NoPermissionState` all rendered `h3`, so axe flagged `heading-order` on **every**
empty, error and denied state under a page title (9 of my first 12 axe runs). All three are now
`h2`, the correct level for a section directly under the page heading.

**6. `<main id="dashboard-content">` had no accessible name** while `useRouteFocus` focuses it on
every route change — the announcement was "main", nothing more. Now `aria-label="Main content"`.

## Contrast — measured, not assumed

`components/ui/__tests__/contrast-tokens.test.ts` grew **13 → 41 assertions**. Two corrections
were needed before any of it was trustworthy:

- The file split light from dark at the *first* `.dark {`. `globals.css` has **eight** `:root`
  blocks and **six** `.dark` blocks; every token defined after line 148 — the entire semantic
  status family — was being read out of the wrong block. Replaced with a brace-balanced collector
  for all blocks of each selector.
- Status tokens are `var(--color-emerald-600, #059669)`, which the old extractor could not read at
  all. Added a fallback-hex extractor.

**Fixed — focus indicators failed WCAG 2.2 SC 1.4.11 (3:1) app-wide.**
`--ring: #94a3b8` measured **2.45:1** on `--background`, and `--sidebar-ring: #60a5fa` **2.54:1** on
the white sidebar. Both are now `#3b82f6` — 3.52:1 and 3.68:1 — which is also the value
`frontend/CLAUDE.md` §7 already specifies ("blue-500 focus/links"). `--ring` is used only for focus
on public surfaces (grep confirms no decorative use in `app/(public)` or `features/landing`), so no
landing visual or animation changed. A bite proof asserts slate-400 is below 3:1.

**Not fixed — reported. `--status-{success,warning,danger}-ink` fail AA as text (light mode).**

| Pair | Ratio | AA normal text |
|---|---|---|
| `--status-success-ink` on its surface | **3.58** | ✗ |
| `--status-warning-ink` on its surface | **3.07** | ✗ |
| `--status-danger-ink` on its surface | **4.41** | ✗ |
| `--status-success-ink-strong` on its surface | 5.21 | ✓ |
| `--status-warning-ink-strong` on its surface | 4.84 | ✓ |
| `--status-danger-ink-strong` on its surface | 5.91 | ✓ |
| `--muted-foreground` on `--muted` | **4.34** | ✗ |

`statusToneClasses(tone)` emits `text-status-<tone>-ink` and it is used at **2134 sites** for badge
text at `text-[9px]`–`text-xs`, which is normal text. `-ink-strong` is the AA-safe ink and already
passes everywhere. Whether to repoint `statusToneClasses` or raise the `-ink` tokens is a token-layer
decision with a 2134-call-site blast radius and no browser here to verify it — so I measured it,
locked the measurement into three tests (`-ink-strong` meets 4.5, `-ink` clears at least 3.0, and an
explicit assertion that success/warning/danger are the three that fall short), and left the call to
the orchestrator. Dark mode is clean throughout: every status ink clears 6:1 on `--card`.

## Tests added (all green)

| File | Tests | Covers |
|---|---|---|
| `components/__tests__/authenticated-surface-states.contract.test.ts` | 19 | the ratchet + analyzer self-test + offline-is-global |
| `components/ui/__tests__/data-table-states.a11y.test.tsx` | 19 | loading announced · empty announced · filter-empty ≠ data-empty · denied-not-empty · error · sort keyboard-operable · axe ×3 viewports |
| `components/ui/__tests__/overlay-focus.a11y.test.tsx` | 12 | Dialog/Sheet focus trap on open, restore to trigger on Escape, page hidden from AT while open, accessible name+description, axe while open; ResponsivePopover as Drawer at 375 and Popover at 1280 |
| `components/ui/__tests__/page-states-responsive.a11y.test.tsx` | 30 | all four states × 375/768/1280 under axe · one `h1` · filter row never wraps · stat row scrolls not wraps · skeleton is a Xerox not a spinner |
| `components/ui/__tests__/contrast-tokens.test.ts` | 13 → 41 | above |

**Full run: `npx jest components features lib app test-utils hooks --maxWorkers=2` → 260 suites /
2483 tests, 0 failures.** `eslint` on all 14 changed files: 0 problems.

## Checkbox verdicts

- **`- [ ]` States on every authenticated surface.** Not met: 78 surfaces have no read-error branch,
  56 no empty state, 2 no loading state, 101 files conflate filter-empty with data-empty. Now
  measured and ratcheted for the first time; the fixes are per-page work in `features/**`.
- **`- [ ]` Keyboard + screen-reader semantics on *every* interactive surface.** The focus-management
  half is closed and proven — dialogs, drawers/sheets, `ResponsivePopover`, route transitions
  (`useRouteFocus` + a now-named `<main>`), skip link. Six real defects fixed. But "every interactive
  surface" across 556 pages is not something 61 component tests establish, and I will not claim it.
- **`- [ ]` Contrast meets the standard and is verified.** *Verified* — yes, 41 measured assertions.
  *Meets* — not yet: three status inks and `muted-foreground`-on-`muted` are below AA, listed above
  with exact ratios. Focus rings were below 3:1 and are fixed.
- **`- [ ]` Layout correct at 375/768/1280.** BLOCKED: jsdom has no layout engine — it cannot
  compute overflow, wrapping or intersection, so "correct" is unprovable here. What *is* proven at
  the three widths: axe passes for all four states, one `h1`, the filter row carries no wrap class,
  the stat row keeps its scroller and never gains `md:overflow-x-visible`.
- **`- [ ]` Representative browser end-to-end journeys.** BLOCKED. There is no browser harness in
  either repo: no `playwright`/`cypress`/`puppeteer` dependency in `package.json` or the root
  manifest, no binary in either `node_modules/.bin`, no `playwright.config.*`/`cypress.config.*`,
  no `e2e/` directory and no `test:e2e` script. Closing this needs a harness added and a running
  app + backend + seeded auth, none of which exists in this session. An unrun suite is not a pass.
- **`- [x]` Error and offline states are not removed during cleanup because they are uncommon
  locally.** Closed by construction: the ratchet fails the moment any surface loses its loading,
  empty, error or permission state, and four tests pin the offline path — the shell mounts
  `<ShellOfflineBanner />`, the banner is a `role="status" aria-live="polite"` region, the hook
  listens for both `online` and `offline`, and a bite proof fails if the banner is unmounted.
- **`- [x]` Public metadata correct without changing landing visuals or animations.** `check:seo-metadata`
  exit 0 and its self-test passes; it enforces `robots: { index: false, follow: false }` on every
  authenticated layout, `title` + `description` + `alternates.canonical` on every intentionally
  indexable public page, and no auth-gated import inside `app/(public)`. `app/robots.ts` and
  `app/sitemap.ts` both exist. Nothing under `app/(public)/**` or `features/landing/**` was touched.

## For the orchestrator

- **P1 · `sortable` was dead in every table.** Now live. 197 columns across 85 files gain a working,
  keyboard-operable sort. 192 already supplied `sortValue`, so behaviour is what each call site
  declared; the 5 without one now sort on the column key. Worth a spot-check in a browser.
- **P1 · no `throwOnError`** means a failed query is invisible on 78 surfaces. Setting it globally
  in `components/providers/query-provider.tsx` would route them all to the existing
  `app/(authenticated)/error.tsx` in one change — that file is ticket 28's territory, not mine.
- **P2 · status-ink contrast**, above. Decision needed at the token layer.
- **Ticket 27 broke an accessibility suite and I fixed the test, not their code.** The new
  `components/layout/nav-intent-prefetch.ts` calls `useRouter()`, which `shell-keyboard.test.tsx`'s
  `next/navigation` mock did not provide; 9 keyboard/skip-link assertions failed with
  `(0 , _navigation.useRouter) is not a function`. I extended the mock. Both layout suites are green
  (32/32).
- **Typecheck: 10 errors, all in `components/ai/`** — `ai-actions-menu.tsx` uses `getErrorMessage`
  and `isApiError` without importing them, and `AiInlineSession` has no `status` field. That is S3
  mid-edit on AI surfaces, not ticket 30. Zero errors in any file I touched. The 22
  `.next/types/validator.ts` errors the brief warned about are gone — that artifact regenerated.
- **146 → 101 filter-empty conflations**: the two counts differ because the ratchet's detector
  excludes test files and requires a real filter signal. Either number is a per-page job in
  `features/**`; `features/accounting` (39), `features/hr` (23) and `features/build` (15) hold half
  of it.

## Files changed

**Source (8)**
- `frontend/globals.css` — light `--ring` and `--sidebar-ring` → `#3b82f6` (focus contrast only)
- `frontend/components/ui/data-table.tsx` — `accessorFn` + `readSortKey`, sort-button `aria-label`
  and focus ring, `aria-busy` + `sr-only role="status"` on loading, `role="status"` on empty
- `frontend/components/ui/skeleton.tsx` — `aria-hidden="true"`
- `frontend/components/ui/empty-state.tsx` — `h3` → `h2`
- `frontend/components/shared/loading-state.tsx` — `role="status"`
- `frontend/components/shared/error-state.tsx` — `h3` → `h2`
- `frontend/components/shared/no-permission-state.tsx` — `h3` → `h2`
- `frontend/components/layout/dashboard-shell.tsx` — `aria-label="Main content"` on `<main>`

**Tests / test infrastructure (6)**
- `frontend/test-utils/surface-state-analysis.ts` (new)
- `frontend/components/__tests__/authenticated-surface-states.contract.test.ts` (new)
- `frontend/components/ui/__tests__/data-table-states.a11y.test.tsx` (new)
- `frontend/components/ui/__tests__/overlay-focus.a11y.test.tsx` (new)
- `frontend/components/ui/__tests__/page-states-responsive.a11y.test.tsx` (new)
- `frontend/components/ui/__tests__/contrast-tokens.test.ts` — block collector + 28 assertions
- `frontend/components/layout/__tests__/shell-keyboard.test.tsx` — `next/navigation` mock (ticket 27 fallout)

`frontend/globals.css` sits outside the literal `components/**` lane. It is the only place a focus-ring
contrast failure can be fixed, nothing else in the tree defines `--ring`, and no other ticket owns
that file. Flagging it rather than burying it.

No git command was run at any point.
