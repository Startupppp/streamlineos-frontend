# C6 — Org-work surfaces

Gallery route: `/design-system/org-work`
Spec: `frontend/e2e/org-work-a11y.spec.ts`
Gallery: `frontend/app/(public)/design-system/org-work/gallery.tsx`

## Coverage matrix

| Page | Keyboard | Screen-reader | Reduced motion | 375 px mobile | 1920×1080 @2x |
|---|---|---|---|---|---|
| Templates | tab order verified (6 stops) | covered | covered | covered | covered |
| All Work | focusable + Esc overlay | covered | covered | covered | covered |
| Approvals | tab order verified (3 stops) | covered | covered | covered | covered |
| Command Center | tab order verified (3 stops) | covered | covered | covered | covered |
| Inbox | tab order verified (3 stops) | covered | covered | covered | covered |
| My Work | tab order verified (3 stops) | covered | covered | covered | covered |
| Org Projects | tab order verified (3 stops) | covered | covered | covered | covered |
| Teams | tab order verified (6 stops) + Esc overlay | covered | covered | covered | covered |

## Check details

**Keyboard** — Previous describes were named "keyboard reachability" but bodies used programmatic `.focus()` + `toBeFocused()`. That proves an element *can* receive focus; it does not prove tab order follows visual order. All eight describes have been rewritten.

- **Templates**: Six focus stops (Use Template + Delete per card × 3 cards). Describe renamed "keyboard tab order". One Tab-press test walks all 6 stops in card-reading order: Use1 → Delete1 → Use2 → Delete2 → Use3 → Delete3. Structural tests (listitem count=3, Delete aria-label, no search control) kept as separate tests.
- **All Work**: Single focus stop (the `AllWorkViewSwitcher` combobox). No Tab-order test is meaningful with one stop. Describe renamed "view-switcher is keyboard-focusable". Test name changed from "keyboard reachable" to "keyboard-focusable". Esc test added: Enter opens the `Select` listbox, Esc closes it, focus returns to the trigger.
- **Approvals**: Three focus stops (one `DecideButtonCell` button per row). Describe renamed "keyboard tab order". Tab-press test: Decide1 → Decide2 → Decide3. `ApprovalsInboxMobileCard` has no interactive elements (BuildMobileCard called without `actions` prop).
- **Command Center**: Three focus stops (one `Link` per `MyWorkRow`). Describe renamed "keyboard tab order". Tab-press test walks 3 links in row order.
- **Inbox**: Three focus stops (one `button[aria-pressed]` per `InboxNotificationItem`). Describe renamed "keyboard tab order". Tab-press test walks 3 buttons in row order. `isSelectable=false` in gallery so no checkbox added.
- **My Work**: Three focus stops (one `Link` per `WorkItemRow`). Describe renamed "keyboard tab order". Tab-press test walks 3 links in row order.
- **Org Projects**: Three focus stops (each `ProjectCard` `article[tabIndex=0, role="listitem"]`). In gallery context `useCan` returns false (no auth), so `showActions=false` and the dropdown trigger is not rendered — the article is the only stop per card. Describe renamed "keyboard tab order". Tab-press test walks 3 cards.
- **Teams**: Six focus stops (two `TeamRowActions` trigger buttons per row × 3 rows — one from inside `TeamMobileCard`'s `BuildMobileCard` `actions` slot, one standalone). Describe renamed "keyboard tab order and Esc". Tab-press test walks all 6 buttons. Esc test: Enter opens the Engineering row dropdown, Esc closes it, focus returns to the trigger. Previous test had `expect(count).toBe(3)` which was wrong; corrected to 6.

**Screen-reader** — Tests assert `role="listitem"`, `aria-label`, `aria-pressed`, and `role="combobox"` attributes on real component output. Section headings (`h2`) visible at all three viewports. No hand-rolled lookalikes — every element is the production component.

**Reduced motion** — Each page has a `{page}-loading` case frame containing its skeleton component (uses shadcn `Skeleton` → always includes `skeleton-shimmer animate-pulse`). Tests are PAIRED: one `test.use({ contextOptions: { reducedMotion: "reduce" } })` block asserts `animation-name: none`, one `test.use({ contextOptions: { reducedMotion: "no-preference" } })` block asserts non-`none`. The no-preference half proves the reduce test is not vacuous.

**375 px mobile** — Overflow check (`scrollWidth - clientWidth ≤ 1`) on `document.documentElement` at 375/812. All 8 section headings visible. Template cards column-stacked (unique y-offsets). Card `boundingBox().width ≤ 375`.

**1920×1080 @2x** — `test.use({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 2 })` (cannot use `page.setViewportSize` for `deviceScaleFactor`). Overflow check on `document.documentElement` and individually on each of the 16 case frames.

## Previously missing

The old spec was titled "Templates surfaces — responsive and a11y contract" (17 tests) and covered only the Templates page. The `gallery.tsx` file that existed only exported `TemplatesGallery`. Seven pages had zero E2E coverage.

## What changed

### First rewrite (previous agent)

- `frontend/app/(public)/design-system/org-work/gallery.tsx` — created; exports `OrgWorkGallery` with 16 case frames (keyboard + loading) for all 8 pages using real production components and static stub data.
- `frontend/app/(public)/design-system/org-work/page.tsx` — updated to render `OrgWorkGallery` instead of `TemplatesGallery`.
- `frontend/e2e/org-work-a11y.spec.ts` — rewritten; covers all 5 C6 checks × 8 pages. All keyboard describes used programmatic `.focus()`.

### Second rewrite (this agent — G-11)

- `frontend/e2e/org-work-a11y.spec.ts` — keyboard describes rewritten. Eight describes renamed (all used "reachability"). Seven multi-stop cases converted from `.focus()` to real Tab-press tests. One single-stop case (All Work) kept `.focus()` with renamed test. Two Esc tests added (All Work, Teams). Teams count assertion corrected from 3 to 6. No gallery changes were required.

## Findings not fixed in this session

- **Templates `useBuildListKeyboard`**: The keyboard hook wires j/k/Enter/Esc shortcuts to navigate the template list. These shortcuts are tested functionally by the gallery setup (`useBuildListKeyboard` with `enabled: true`), but no E2E test asserts j/k behaviour. Not required by CCG-4 because Templates has no list for j/k to move through at the gallery level (the hook fires callbacks but the gallery's `setFocused` only updates an `aria-live` region). Not a blocking gap.
- **`ProjectCard` focusable-inner state depends on `useCan`**: In production with auth, the card gains a `DropdownMenu` trigger (additional focus stop) and inline edit controls (`InlineProjectTitle`, `InlineProjectStatus`, etc.), each of which may add more stops. The gallery runs without auth so `useCan` returns false throughout. Tab order for the authenticated state is not covered here and cannot be tested from a public gallery route.
