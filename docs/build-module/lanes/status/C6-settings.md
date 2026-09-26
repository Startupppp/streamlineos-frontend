# C6 — Settings surfaces (LANE-7)

Covers `10-project-settings.md`, `-access`, `-agents`, `-agents-credentials`, `-automations`,
`-fields`, `-integrations`, `-integrations-webhooks`, `-iterations`, `-portal`, `-retention`,
`-views`, `-workflow`, `10-settings-access.md`, and `10-settings-integrations.md`.

---

## Task 1 — Test failure root cause and fix

**Failed test:** `e2e/settings-a11y.spec.ts:137` "Tab from the search input moves focus to the first
view card name button"

**Symptom:** `expect(locator).toBeFocused()` on the "Engineering backlog" name button received
`inactive` after one `Tab` from the search input. The locator resolved (the button was found), so the
issue is focus destination, not element absence.

**Classification: (a) — a real product defect.** There is an intervening, invisible focus stop.

**Root cause:** `PageWrapper` (`components/ui/page-wrapper.tsx` line 275) wraps its scroll region
with `tabIndex={0}`. The full element:

```tsx
<div
  role="region"
  aria-labelledby={...}
  tabIndex={0}                 // in the natural Tab sequence
  className="... outline-none" // no visible focus ring
>
```

The `outline-none` class removes all visual feedback. A keyboard user pressing Tab after the search
input lands on this invisible div — they see no focus movement — then must press Tab a second time to
reach the first card. The visual order (search → first card) and the actual Tab order (search →
invisible region → first card) disagree. That is precisely the C6 keyboard defect.

**Why not (b) gallery defect:** The gallery mounts the real `PageWrapper` component, not a
lookalike. The same `tabIndex={0}` region is present on all production pages that use `PageWrapper`
with its default `noInternalScroll={false}` setting.

**Why the sibling test passed:** "Tab from the Rename saved view button reaches the Delete saved view
button in the same card" focuses the Rename button directly via `locator.focus()` — it never crosses
the scroll region boundary. Intra-card Tab order (Rename → Delete) is correct.

**Fix applied:** `components/ui/page-wrapper.tsx` line 275: `tabIndex={0}` → `tabIndex={-1}`.

`tabIndex={-1}` removes the region from the natural Tab sequence while preserving programmatic
focusability (e.g. `ref.current.focus()` in a router transition). Tab from the search input now
lands directly on the first focusable element inside the region — the "Engineering backlog" name
button.

---

## Task 2 — Per-page × per-check matrix

### Legend

- `✓` — explicit test assertion
- `loading✓` — loading-state gallery case now in the CASES array; overflow + reduced-motion covered
  via the global CSS assertion (proved by the paired `settings-views-loading` test)
- `✗` — not covered; no gallery case with real interactive elements exists for this state

### Before this session

| Page | 375 px | Screen-reader | Reduced motion | Keyboard | HiDPI |
|------|--------|---------------|----------------|----------|-------|
| project-settings | ✗ | ✗ | ✗ | ✗ | ✗ |
| project-settings-access | ✗ | ✗ | ✗ | ✗ | ✗ |
| project-settings-agents | ✗ | ✗ | ✗ | ✗ | ✗ |
| project-settings-agents-credentials | ✓ | ✗ | ✗ | ✗ | ✓ |
| project-settings-automations | ✗ | ✗ | ✗ | ✗ | ✗ |
| project-settings-fields | ✗ | ✗ | ✗ | ✗ | ✗ |
| project-settings-integrations | ✗ | ✗ | ✗ | ✗ | ✗ |
| project-settings-integrations-webhooks | ✗ | ✗ | ✗ | ✗ | ✗ |
| project-settings-iterations | ✗ | ✗ | ✗ | ✗ | ✗ |
| project-settings-portal | ✗ | ✗ | ✗ | ✗ | ✗ |
| project-settings-retention | ✗ | ✗ | ✗ | ✗ | ✗ |
| project-settings-views | ✓ | ✓ | ✓ | FAIL | ✓ |
| project-settings-workflow | ✗ | ✗ | ✗ | ✗ | ✗ |
| settings-access | ✗ | ✗ | ✗ | ✗ | ✗ |
| settings-integrations | ✗ | ✗ | ✗ | ✗ | ✗ |

### After this session

| Page | 375 px | Screen-reader | Reduced motion | Keyboard | HiDPI |
|------|--------|---------------|----------------|----------|-------|
| project-settings | loading✓ | ✗ | loading✓ | ✗ | loading✓ |
| project-settings-access | loading✓ | ✗ | loading✓ | ✗ | loading✓ |
| project-settings-agents | loading✓ | ✗ | loading✓ | ✗ | loading✓ |
| project-settings-agents-credentials | ✓ | ✓ | ✗ | ✓ | ✓ |
| project-settings-automations | loading✓ | ✗ | loading✓ | ✗ | loading✓ |
| project-settings-fields | loading✓ | ✗ | loading✓ | ✗ | loading✓ |
| project-settings-integrations | loading✓ | ✗ | loading✓ | ✗ | loading✓ |
| project-settings-integrations-webhooks | loading✓ | ✗ | loading✓ | ✗ | loading✓ |
| project-settings-iterations | loading✓ | ✗ | loading✓ | ✗ | loading✓ |
| project-settings-portal | loading✓ | ✗ | loading✓ | ✗ | loading✓ |
| project-settings-retention | loading✓ | ✗ | loading✓ | ✗ | loading✓ |
| project-settings-views | ✓ | ✓ | ✓ | ✓ | ✓ |
| project-settings-workflow | loading✓ | ✗ | loading✓ | ✗ | loading✓ |
| settings-access | loading✓ | ✗ | loading✓ | ✗ | loading✓ |
| settings-integrations | loading✓ | ✗ | loading✓ | ✗ | loading✓ |

### What `loading✓` provides and what it does not

Thirteen loading skeleton cases were added to `settings-gallery.tsx` and to the `CASES` array in
`settings-a11y.spec.ts`. Each uses the real `PageWrapper` + `Skeleton` sub-components — not
lookalikes.

- **375 px mobile** — the viewport overflow loop iterates `CASES`, so all 18 cases (including the
  13 new ones) are photographed and asserted at 375×812, 768×1024, and 1280×800.
- **Reduced motion** — `Skeleton` renders `skeleton-shimmer animate-pulse`. The paired CSS assertion
  on `settings-views-loading` proves `globals.css` lines 700–708 set `animation-name: none` on the
  class globally. This covers every skeleton element on the page, including those in the 13 new
  loading cases. The `loading✓` entries inherit this coverage without a per-case assertion.
- **HiDPI** — the high-density overflow loop also iterates `CASES`; all 18 cases are asserted at
  1920×1080 @ deviceScaleFactor 2.
- **Screen-reader** and **Keyboard** are NOT covered for the 13 pages that have no ready-state
  gallery case. A loading skeleton has no interactive elements to navigate or ARIA roles to assert
  beyond `aria-hidden="true"` (already proved by the new "loading skeleton cases mark each skeleton
  element aria-hidden" test, which targets `settings-views-loading` as representative).

### Remaining gaps and what closing them requires

**Screen-reader gaps (13 pages):** Each page needs a ready-state gallery case mounting the real
row/section component with static stub data. Sub-components that could be used without API queries
(they use only mutation hooks):

- `project-settings-workflow`: `StatusRow` (`features/build/settings/status-row.tsx`) with a
  static `CustomState` stub
- `project-settings-agents-credentials` is already closed (TokenRow).
- All other pages need investigation; the page-level components use `useQuery` hooks that will fire
  on render and return 401 from the gallery.

**Keyboard gaps (13 pages):** Same prerequisite — ready-state cases are needed before Tab-order
assertions are meaningful.

**credentials reduced-motion gap:** The credentials case (`settings-credentials-token-list`) has no
skeleton elements. The reduced-motion check for this page requires either a loading-state case for
credentials or an assertion that the `TokenListSkeleton` (from `agent-token-list.tsx`) renders with
the correct CSS — neither is currently tested. This is a one-test gap.

---

## Summary of changes made (prior session)

| File | Change |
|------|--------|
| `components/ui/page-wrapper.tsx` | `tabIndex={0}` → `tabIndex={-1}` on scroll region (line 275) |
| `features/build/settings/settings-gallery.tsx` | 13 loading skeleton gallery cases added |
| `e2e/settings-a11y.spec.ts` | CASES array expanded (+13); 2 new ARIA tests; 1 new keyboard test |
| `docs/build-module/lanes/status/C6-settings.md` | This document |

**Verified by reading source, not by browser run.** The fix removes the `tabIndex={0}` scroll region
from the Tab sequence; the first Tab after the search input now reaches the "Engineering backlog"
name button because it is the next element with a natural tab stop (`<button type="button">`) in DOM
order.

---

## G-13 session — ready-state gallery cases and per-page screen-reader/keyboard/Esc coverage

### Technique

Seven of the 13 skeleton-only pages were unblocked by seeding TanStack Query's cache before render:
1. Create a fresh `QueryClient` via `createAppQueryClient` inside `useState`
2. Call `client.setQueryData(key, stubValue)` for every key the page reads at load time
3. Wrap the page component in `QueryClientProvider` with that client
4. Seed `platformCoreQueryKeys.access.me()` with `{ isOrgOwner: true, scopes: {}, ... }` — this
   makes every `useCan` call return `true` without enumerating individual permission keys
5. For pages with hardcoded `isLoading: false` (fields, agents, integrations), no data key needs
   seeding beyond the access key

**Automations key trap:** `useAutomations(projectId, { action: undefined })` appends `filters ?? {}`
to its base key. `JSON.stringify({ action: undefined })` === `"{}"`, so the seeded key must use
`[...buildWorkQueryKeys.projects.automations(1), {}]` — seeding the bare automation base key would
miss the runtime key and leave the query in loading state.

### Pages not mounted (and why)

| Page | Reason |
|------|--------|
| `project-settings` (main form) | `useProject(projectId)` requires `buildWorkQueryKeys.projects.detail(n)` seeded with a full `ProjectDetail` shape; not done in this session |
| `project-settings-access` | `useProjectMembers`, `useTeamRoster`, cursor-paginated roster; mountable but not done |
| `project-settings-integrations-webhooks` | peer sessions own `features/build/settings/webhooks/**`; read-only to avoid conflicts |
| `project-settings-portal` | not analysed; could be mounted in a subsequent session |
| `settings-access` (org-level) | `BuildAccessShell`, `MembersPage`, `ModuleAccessPage` are Server Components; cannot be mounted in a client gallery |
| `settings-integrations` (org-level) | org-level integrations use server-side data fetching; cannot be mounted in a client gallery |

### Updated per-page × per-check matrix (after G-13)

`ready✓` = explicit test assertion on a real mounted component.

| Page | 375 px | Screen-reader | Reduced motion | Keyboard | HiDPI | Esc |
|------|--------|---------------|----------------|----------|-------|-----|
| project-settings | loading✓ | ✗ | loading✓ | ✗ | loading✓ | ✗ |
| project-settings-access | loading✓ | ✗ | loading✓ | ✗ | loading✓ | ✗ |
| project-settings-agents | ready✓ | ready✓ | loading✓ | ready✓ | ready✓ | ✗ |
| project-settings-agents-credentials | ✓ | ✓ | ✗ | ✓ | ✓ | ✗ |
| project-settings-automations | ready✓ | ready✓ | loading✓ | ready✓ | ready✓ | ready✓ |
| project-settings-fields | ready✓ | ready✓ | loading✓ | ready✓ | ready✓ | ✗ |
| project-settings-integrations | ready✓ | ready✓ | loading✓ | ready✓ | ready✓ | ✗ |
| project-settings-integrations-webhooks | loading✓ | ✗ | loading✓ | ✗ | loading✓ | ✗ |
| project-settings-iterations | ready✓ | ready✓ | loading✓ | ready✓ | ready✓ | ✗ |
| project-settings-portal | loading✓ | ✗ | loading✓ | ✗ | loading✓ | ✗ |
| project-settings-retention | ready✓ | ready✓ | loading✓ | ready✓ | ready✓ | ready✓ |
| project-settings-views | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ |
| project-settings-workflow | ready✓ | ready✓ | loading✓ | ready✓ | ready✓ | ready✓ |
| settings-access | loading✓ | ✗ | loading✓ | ✗ | loading✓ | ✗ |
| settings-integrations | loading✓ | ✗ | loading✓ | ✗ | loading✓ | ✗ |

### Remaining gaps after G-13

- **Screen-reader / Keyboard / Esc** on 6 pages still skeleton-only: `project-settings`,
  `project-settings-access`, `project-settings-integrations-webhooks`,
  `project-settings-portal`, `settings-access`, `settings-integrations`
- **Esc** on fields, agents, integrations, iterations — no easy overlay trigger on those pages in
  the ready state (no button that opens a sheet or dialog without complex interaction)
- **Reduced motion** on the credentials token-list case — `TokenRow` has no skeleton elements

### Summary of G-13 changes

| File | Change |
|------|--------|
| `features/build/settings/settings-gallery.tsx` | 7 ready-state frame components; 7 new `GalleryCase` entries |
| `e2e/settings-a11y.spec.ts` | CASES array expanded (+7); 7 new `test.describe` blocks (SR + KB + Esc where applicable) |
| `docs/build-module/lanes/status/C6-settings.md` | Updated matrix and G-13 session notes |
