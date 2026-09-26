# C6 — Org-work surfaces

Gallery route: `/design-system/org-work`
Spec: `frontend/e2e/org-work-a11y.spec.ts`
Gallery: `frontend/app/(public)/design-system/org-work/gallery.tsx`

## Coverage matrix

| Page | Keyboard | Screen-reader | Reduced motion | 375 px mobile | 1920×1080 @2x |
|---|---|---|---|---|---|
| Templates | covered | covered | covered | covered | covered |
| All Work | covered | covered | covered | covered | covered |
| Approvals | covered | covered | covered | covered | covered |
| Command Center | covered | covered | covered | covered | covered |
| Inbox | covered | covered | covered | covered | covered |
| My Work | covered | covered | covered | covered | covered |
| Org Projects | covered | covered | covered | covered | covered |
| Teams | covered | covered | covered | covered | covered |

## Check details

**Keyboard** — Each page has a `{page}-keyboard` case frame containing real components. Tests assert `toBeFocused()` after programmatic `.focus()` on real interactive elements: buttons (`Use Template`, `Decide`, actions trigger), links (`MyWorkRow`, `WorkItemRow`), combobox (`AllWorkViewSwitcher`), listitem with `tabIndex` (`ProjectCard`), and `aria-pressed` buttons (`InboxNotificationItem`).

**Screen-reader** — Tests assert `role="listitem"`, `aria-label`, `aria-pressed`, and `role="combobox"` attributes on real component output. Section headings (`h2`) visible at all three viewports. No hand-rolled lookalikes — every element is the production component.

**Reduced motion** — Each page has a `{page}-loading` case frame containing its skeleton component (uses shadcn `Skeleton` → always includes `skeleton-shimmer animate-pulse`). Tests are PAIRED: one `test.use({ contextOptions: { reducedMotion: "reduce" } })` block asserts `animation-name: none`, one `test.use({ contextOptions: { reducedMotion: "no-preference" } })` block asserts non-`none`. The no-preference half proves the reduce test is not vacuous.

**375 px mobile** — Overflow check (`scrollWidth - clientWidth ≤ 1`) on `document.documentElement` at 375/812. All 8 section headings visible. Template cards column-stacked (unique y-offsets). Card `boundingBox().width ≤ 375`.

**1920×1080 @2x** — `test.use({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 2 })` (cannot use `page.setViewportSize` for `deviceScaleFactor`). Overflow check on `document.documentElement` and individually on each of the 16 case frames.

## Previously missing

The old spec was titled "Templates surfaces — responsive and a11y contract" (17 tests) and covered only the Templates page. The `gallery.tsx` file that existed only exported `TemplatesGallery`. Seven pages had zero E2E coverage.

## What changed

- `frontend/app/(public)/design-system/org-work/gallery.tsx` — created; exports `OrgWorkGallery` with 16 case frames (keyboard + loading) for all 8 pages using real production components and static stub data.
- `frontend/app/(public)/design-system/org-work/page.tsx` — updated to render `OrgWorkGallery` instead of `TemplatesGallery`.
- `frontend/e2e/org-work-a11y.spec.ts` — rewritten; now 57 tests covering all 5 C6 checks × 8 pages.
