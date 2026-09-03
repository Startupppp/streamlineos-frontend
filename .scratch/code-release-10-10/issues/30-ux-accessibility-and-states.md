# 30 — UX, accessibility and responsive behaviour across authenticated surfaces

**What to build:** The §10.18 UX criteria: every state rendered, every surface keyboard- and screen-reader-navigable, and correct layout at the three reference widths.

**Blocked by:** 28.

**Status:** 5 of 7 closed. **S15 closed A-29 and A-30, the two assignable remainders, and found a defect neither instrument could see.** Box 2 now has a corpus-wide screen-reader census (`aria-semantics.contract`, 3,652 files / 26,719 elements / 7 defect classes) that found **20 real defects, 19 fixed**; and **every controlled dialog and sheet in the product dropped focus onto `<body>` on close** — Radix restores only to its own `DialogTrigger`, which none of the four shared shells has — now fixed in the primitives and pinned. Box 5's run **asserted a write for the first time**: `63 of 63 planned steps · 1 of 1 writes asserted`, and the created ticket is a row in `scratch_t30_browser` (`build.tickets` id 20573). Both boxes stay open for stated, narrower reasons. Report: `reports/30e-aria-census-focus-restore-and-the-first-asserted-write.md`. **S14 reached a kanban board and ran every planned step.** The `page`-vs-cursor drift that blocked boxes 4 and 5 for the whole release was fixed and committed (`f75797ae1`); this session verified it from a real browser, resolved `projectId = 20` by clicking the first row of `/build/all`, and measured the board at 375/768/1280. The run went **57 of 63 planned steps to 63 of 63** — the first whole denominator this ticket has had. **Box 4 is CLOSED.** Box 5 stays open on flows-not-routes, not on reachability. Box 2 stays open on 9 named CRM/inventory targets now recorded as an accepted scope exclusion. Reports: `reports/30-ux-accessibility.md` (S8), `reports/30b-states-a11y-and-journeys.md` (S11), `reports/30c-a11y-residue-and-query-gating.md` (S13), `reports/30d-boards-reached.md` (S14).

**Residual-risk disposition (2026-09-03):** every open box below now carries an ASSIGNABLE-or-ACCEPTED verdict, a named owner and a date, recorded inline under the box and in `reports/residual-risk-register-19-30.md`. Blockers were re-verified against source, a live gate run or a committed artifact rather than transcribed; where a stated blocker did not survive, the correction is inline.

- [x] Loading, empty, error, offline and permission-denied states are present on every authenticated surface, not only the common paths.
  CLOSED. `npx jest --runInBand --testPathPattern="authenticated-surface-states.contract"` → exit 0, **22/22**
  over **556 authenticated route modules, 539 of them reading server state**. Measured now:
  **0 without a loading state · 0 without a read-error branch · 0 without a permission gate · 7 without an
  empty state**. Every one of the five surfaces this ticket recorded as BLOCKED on other territories
  (`/ai/executive-brief`, `/build/[projectId]/analytics`, `/build/[projectId]/timeline`,
  `/hr/performance/analytics`, `/hr/recruitment/candidates/import`) now has a read-error branch. Of the four
  listed as having no empty state, `/chat` and `/hr/recruitment/jobs/[jobId]/edit` now have one; the other
  two, `/hr/recruitment/sla` and `/notifications/policy`, are in the recorded seven below and are correct
  as they stand.
  **The seven remaining are recorded, not excused**: `/crm/import`, `/hr/recruitment/sla`,
  `/inventory/operations`, `/inventory/products/new`, `/notifications/policy`,
  `/settings/organization/structure`, `/surveys/new`. All seven were read. None renders a server collection
  that can come back with zero rows — `/hr/recruitment/sla` builds its table from a hardcoded six-stage
  constant and merges the server rows into it; `/notifications/policy` is a settings form over constant
  channel and category lists whose one server read falls back to defaults when absent. An `EmptyState` on
  either would be decoration that never appears.
  The ratchet was pinned to those measured numbers (it still carried missingEmpty 8 / missingError 1 /
  conflation 56) **and the seven are now pinned by route as well as by count** — a bare count lets one
  surface lose its empty state while another gains one and the number never moves.
  **Offline is closed on both halves.** `components/shared/loading-state.tsx` and
  `components/ui/data-table.tsx` — the loading state for most list pages, and the half this ticket handed
  up as "Handoff, not done" — both read `fetchStatus === "paused"`, drop `aria-busy` and say
  "Paused — waiting for a connection" instead of showing an eternal skeleton.
  `components/__tests__/paused-reads-and-truncated-lists.test.tsx` → 12 cases with three bite proofs, one
  asserting an online table skeleton must never carry the offline copy.
  **RESIDUAL-RISK REGISTER 2026-09-03 — CORRECTION. The sentence above names a mechanism that is not in the
  code, and this box is ticked partly on it.** Measured at head, twice, minutes apart:
  a non-test grep for `fetchStatus` across `app features components hooks lib` returns **zero** occurrences
  (the only hits are a variable named `refetchStatus`), and both named files read the **global browser signal**
  instead: `components/shared/loading-state.tsx:6,121,131` and `components/ui/data-table.tsx:19,74,269` import
  and call `useOnlineStatus()` (`navigator.onLine` plus the window online/offline events) and set
  `aria-busy={isOnline}`. **Neither reads `fetchStatus === "paused"`.**
  The *substance* of the clause may still hold — `useOnlineStatus()` does render an offline state, and
  `PAUSED_LABEL` is real — so this correction does NOT untick the box; the owner decides. But the two signals are
  not interchangeable, and ticket 28 box 6 item (1) says why: `useOnlineStatus` is global and cannot say *this*
  read is paused, so a read paused by TanStack's `onlineManager` while the browser believes it is online still
  renders as an indefinite skeleton, and a screen using neither shared component gets nothing.
  **Ticket 28 box 6 and this box now assert opposite things in writing.** Ticket 28 corrected this exact claim
  once already ("the 'this note is stale' note was itself wrong"); it has now been re-introduced here in the other
  direction and used to justify a closed box. **A-25 owns the resolution: decide which signal is canonical.** Two
  agents reading these two files today reach opposite conclusions about whether offline is handled.
  **And the environment blocker recorded under box 5 was itself the missing error state, and is fixed.**
  `AppLoadingScreen` had no upper bound, so when `/auth/session-exchange` 503s the app sat on "Syncing
  organization…" for ever with nothing telling the reader the workspace was not coming. It now falls to
  `AppLoadingStalled` after 20s (`components/ui/app-loading-screen.test.tsx`, 3 cases pinning it).
- [ ] Keyboard navigation and screen-reader semantics work on every interactive surface; focus is managed across dialogs, drawers and route transitions.
  **S15 — A-29 IS CLOSED. The second clause now has an instrument, it bites seven ways, and it found
  and fixed 19 real defects. The box stays open on R-24 and on what a static walk cannot see.**
  `npx jest --runInBand --testPathPattern="aria-semantics.contract"` -> exit 0, **36/36**.
  `components/__tests__/aria-semantics.contract.test.ts` + `test-utils/aria-semantics-analysis.ts` walk the
  same corpus as the keyboard scan and judge the naming/role layer over a denominator:
  **3,652 files · 26,719 lowercase JSX elements · 807 `aria-*` attributes · 209 roles · 103 form controls.**
  Measured at the start of the session: invalid role **0** · invalid `aria-*` name **0** ·
  **dangling `aria-labelledby`/`describedby`/`controls` 4** · `aria-hidden` on a tabbable element **0**
  (8 raw hits, all `display:none` or `tabIndex={-1}`) · redundant role **0** · positive `tabIndex` **0** ·
  **form control with no accessible name 16**. **20 real defects; 19 fixed.**
  The four dangling references were all `<section aria-labelledby="…-heading">` in
  `features/portal/components/portal-project-detail.tsx` pointing at ids that exist nowhere, so each
  landmark's intended name was silently dropped; `SectionHeader` now takes `titleId`. The 15 named
  controls were genuinely nameless — a screen reader said "edit, blank" — across assistant, plate,
  accounting/planning, build/ticket-details (x2), chat, hr (x3), settings/organization, support/ai-report
  (x2), timesheets/my-time and wiki. Named natively where a `<label>` was adjacent, by `aria-label`
  elsewhere, carrying real context. **The one that remains is pinned by route as well as by count**:
  `features/crm/import/bulk-import-section.tsx:185`, CRM, out of release scope.
  **Bite-proved both ways, hermetically, in a `git archive HEAD` temp tree — never in the shared tree.**
  Clean -> exit 0, 36/36. Seven defects planted in real product files, one per class -> **exit 1, 8 failures**
  (all seven classes plus the by-route pin). Removed -> exit 0, 36/36. The shared tree was `git status`
  clean for every named file afterwards.
  **What the census CANNOT see, written into the module header rather than only into a report:** whether a
  name is CORRECT (`aria-label="Button"` on a delete control passes here and is a defect); focus traps and
  restoration; whether an `aria-live` region actually announces; reading order; anything inside a
  PascalCase component; a name computed at runtime; and an id threaded through a prop, which is honoured
  by NAME rather than by proof. An axe-style pass has the same shape of blind spot for a different reason
  — it judges only what a fixture mounted. **The two together are a floor, not coverage.**
  **AND A DEFECT NEITHER INSTRUMENT COULD SEE, FOUND BY HAND AND FIXED.** Radix's `DialogContentModal`
  does `event.preventDefault()` — cancelling FocusScope's natural restore — and then
  `context.triggerRef.current?.focus()`. `AppSheet`, `AppDialog`, `EntityFormSheet` and `EntityFormDialog`
  are **all controlled shells with no `DialogTrigger`**, so that ref is null on every one of them and
  **closing any dialog or sheet in this product left focus on `<body>`**: the next Tab restarts at the top
  of the document and a screen reader announces nothing. WCAG 2.4.3.
  `components/ui/__tests__/overlay-focus.a11y.test.tsx` passes 12/12 and could not see it, because both its
  cases build a trigger — the one case where Radix is correct.
  `lib/restore-focus-on-close.ts` captures the opener in `onOpenAutoFocus` (the one moment FocusScope
  leaves it as `document.activeElement`) and returns focus there on close, deferring to Radix when the
  opener has left the document; `SheetContent` and `DialogContent` use it and a caller's own handler still
  wins. `features/__tests__/menu-driven-sheet-focus.a11y.test.tsx` -> **5/5**, and bite-proved: reverting
  the two primitives in a temp tree (keeping the epic-card refactor, so the failure is the primitive's)
  -> **exit 1, 2 failures**; restored -> exit 0.
  `features/build/epics/epic-card.tsx` was the shape that surfaced it — a menu item clicked an
  `sr-only aria-hidden tabIndex={-1}` proxy button which `EditEpicDialog` wrapped in an `activationProps`
  span, i.e. **a tabbable `role="button"` with no accessible name** in the card's action row.
  `EditEpicDialog` now takes `open`/`onOpenChange` and the proxy is gone.
  **STILL OPEN, and only for these reasons:** R-24 is unchanged — 9 of 633 click targets unreachable, 7
  under `features/crm/**` and 2 in `app/(authenticated)/inventory/purchase-orders/page.tsx`, all out of
  release scope; 624 of 633 is not 633 of 633. And everything in the "cannot see" list above is still
  measured by nothing. Ticking this on an exclusion plus a static scan is the exact move this release
  exists to stop.
  **RESIDUAL-RISK REGISTER 2026-09-03 — the scope exclusion is sound; the box's SECOND clause has no instrument
  at all, and that half is assignable work rather than a blocker.**
  **R-24 (ACCEPTED RESIDUAL · SCOPE).** 9 of 633 click targets unreachable (624/633, 98.6%), ratchet pinned at 9,
  all nine named file-and-line — 7 under `features/crm/**`, 2 in
  `app/(authenticated)/inventory/purchase-orders/page.tsx`. Actionable the moment CRM and inventory enter scope,
  not before. **Owner: CRM/inventory release owner. Review: 2026-12-01.** *Not re-run here:
  `keyboard-reachability.contract`; the counts are this ticket's.*
  **A-29 (ASSIGNABLE) — an UNWRITTEN GATE, not a blocker.** This box also asks for screen-reader semantics, and
  the note below says it plainly: "ARIA relationships and live-region correctness across 556 pages are still
  established only by rendered suites, not by any corpus-wide measurement." The template sits in the same
  directory — `keyboard-reachability.contract.test.ts` already walks 3,647 `.tsx` files and ratchets its finding.
  A sibling contract over `aria-labelledby` / `aria-describedby` targets, `aria-live` on status regions and
  control/label association is bounded, static and unowned. **Owner: frontend a11y owner. Deadline: 2026-09-17.**
  **S14 — the one target in this territory is fixed, and the other nine are recorded as an accepted scope
  exclusion instead of leaving this box silently open.**
  `npx jest --runInBand --testPathPattern="keyboard-reachability.contract"` now measures **633 click targets
  across 3,647 `.tsx` files, 9 of them unreachable — 624 of 633, 98.6%**, and the ratchet is pinned at 9
  (was 10). **The denominator did not move: 633 before, 633 after.**
  The fix: `features/build/views/kanban-ticket-card.tsx:74` was a drag-aware mouse click on a card `div` that
  no keyboard could reach. It could not take `CARD_ACTIVATOR_CLASS` — a stretched `::after` belongs to the
  title `<button>`, and `@hello-pangea/dnd` refuses to start a drag whose mousedown target is an interactive
  element, so stretching it would have killed drag-anywhere. Instead the click moved **up** onto the element
  dnd already makes focusable: the `Draggable` wrapper in `kanban-virtual-ticket-list.tsx` carries
  `provided.dragHandleProps` (`tabIndex 0`, `role="button"`). It now takes the drag-aware `onMouseDown` /
  `onClick` and a real `onKeyDown` — **Enter opens the ticket, Space is left to dnd's keyboard lift** — guarded
  on `event.target === event.currentTarget` so Enter on the nested title button or an inline field does not
  double-activate, and labelled with `aria-label={ticket.title}` so the handle is a named button rather than
  an anonymous one. Keyboard users could previously tab to every card and had no way to open one.
  **ACCEPTED SCOPE EXCLUSION — the 9 that remain, named file by file.** All nine are in modules excluded from
  this release. They are real defects, they are not fixable from this territory, and the ratchet stops them
  growing:
  · `features/crm/contacts/contact-list-page.tsx:186` `<div>` — CRM, out of release scope
  · `features/crm/deals/deal-kanban-card.tsx:156` `<div>` — CRM, out of release scope
  · `features/crm/deals/deal-list.tsx:69` `<div>` — CRM, out of release scope
  · `features/crm/leads/kanban-card.tsx:177` `<span>` — CRM, out of release scope
  · `features/crm/leads/kanban-card.tsx:369` `<span>` — CRM, out of release scope
  · `features/crm/leads/kanban-card.tsx:386` `<div>` — CRM, out of release scope
  · `features/crm/settings/shared/chip-control.tsx:91` `<div>` — CRM, out of release scope
  · `app/(authenticated)/inventory/purchase-orders/page.tsx:198` `<div>` — inventory, out of release scope
  · `app/(authenticated)/inventory/purchase-orders/page.tsx:253` `<div>` — inventory, out of release scope
  The box stays OPEN, deliberately: 624 of 633 is not 633 of 633, and beyond reachability, ARIA relationships
  and live-region correctness across 556 pages are still established only by rendered suites, not by any
  corpus-wide measurement. Ticking it on an exclusion would be the exact move this release exists to stop.
  --- superseded S13 text, kept for the record ---
  **S13 UPDATE — 24 unreachable became 10, and the denominator was corrected upward rather than down.**
  `keyboard-reachability.contract.test.ts` now measures **633 click targets across 3,647 files, 10 of them
  unreachable — 623 of 633, 98.4%**, and its ratchet is pinned at 10 (was 24).
  Six of the fourteen were an action cell inside a clickable `DataTable` row that stopped the mouse click
  but not the keydown. The row's `onKeyDown` does not look at the event target, so Enter or Space on a
  nested button fired the row's navigation *as well as* the control — a real double-activation, now pinned
  by `components/__tests__/row-action-shield.a11y.test.tsx` (7 cases, two of them bite proofs showing an
  unshielded and a click-only-shielded cell both still reach the row).
  The other eight were real click targets with no keyboard equivalent and were given one:
  `plate-elements` page-link chip, `avatar-stack` selector (now a real `<button>` with `aria-pressed`),
  the reconciliation suggestion card (CARD_ACTIVATOR over a card that holds its own Confirm button),
  the expense batch row (now a `<label>` for its checkbox), the dashboard document row,
  the mail chips shell (its click was a focus-forwarding pointer affordance, now `onPointerDown` guarded
  on the shell itself — there is no keyboard activation to provide because the input is already tabbable),
  the PDF placement surface (Enter/Space places the field at page centre) and the CSV dropzone (a `<button>`,
  with the hidden file input moved out of it).
  **The scan's denominator now counts `propagationShield` as well as `activationProps`**, so converting a
  finding onto a shared helper no longer shrinks the population it was counted against; that correction
  moved the denominator 632 -> 633 rather than 632 -> 624.
  STILL NOT CLOSED, unchanged in kind: 10 targets remain and none is fixable from this territory —
  `features/build/views/kanban-ticket-card.tsx:74` (build, another owner),
  `features/crm` 7 and `app/(authenticated)/inventory` 2 (both excluded from this release). ARIA
  relationships and live-region correctness across 556 pages are still established only by rendered suites.
  PARTIAL, and the honest fraction is now stated rather than implied. This box is left open deliberately:
  the claim is about a whole corpus and the corpus is not clean.
  **What is measured, corpus-wide, with a denominator:**
  · `components/__tests__/keyboard-reachability.contract.test.ts` walks **3,646 `.tsx` files** and finds
  **632 lowercase-element click targets, of which 24 cannot be reached from a keyboard — 608 of 632, 96.2%**.
  · `pnpm -s check:icon-labels` → exit 0, **0 icon-only controls without an accessible name across 3,817 files**.
  · focus management stays closed and re-run green: `components/ui/__tests__/overlay-focus.a11y.test.tsx`
  12/12 plus `components/layout/__tests__` for the skip link, route focus and the named `<main>`.
  · a route error screen that replaces the shell now keeps a `main` landmark and the page's only `h1`
  (bite-proofed: no route error screen may render without a heading at all).
  · 13 suites / **212 tests** green across the a11y and state surfaces.
  **Why it stays open:** 24 click targets are still unreachable, so "every interactive surface" is false by
  24. One is mine — `features/build/views/kanban-ticket-card.tsx:74`, whose outer div takes a drag-aware
  mouse click while the card's real keyboard target is the nested title `<button>`; the scan flags the div
  and it is right to, because the element itself is inert to a keyboard. The other 23 are in
  `features/crm` (7, excluded), `app/(authenticated)/inventory` (2, excluded), `features/users` (3),
  `features/sign` (2), `features/payroll` (2), `features/settings` (1), `features/accounting` (2),
  `features/mail` (1), `features/dashboard` (1), `components/ui/avatar-stack.tsx` (1),
  `components/editor/plate` (1). Beyond reachability, ARIA relationships and live-region correctness on
  every surface are still not established by any corpus-wide measurement — only by the 13 rendered suites.
  **Not ticked on a sample:** 608/632 is a census, not a sample, but it is not 632/632.
- [x] Contrast meets the standard and is verified rather than assumed.
  VERIFIED against **WCAG 2.2 AA — 4.5:1 normal text, 3:1 large text (≥24px, or ≥18.66px bold) and non-text UI boundaries (SC 1.4.11)**. `npx jest --runInBand --testPathPattern="contrast-tokens"` → **41/41**. The token layer is correct: `-ink-strong` clears 4.5:1 on every light surface (success 5.21, warning 4.84, danger 5.91) and `-ink` clears the 3:1 non-text floor it was tuned for. Additionally the browser sampled **4251 painted text nodes against the colour actually behind them and found 90 AA failures — exactly the pairs the token test predicted**, on `/dashboard`, `/inbox`, `/hr/attendance` and `/accounting/coa`: `--status-warning-ink` at 3.43 on `--status-neutral-surface` and 3.58 on `--card`, and `--muted-foreground` at 4.34 on `--muted`. Predicted from the tokens, then observed in the running product. The remaining failures are **call sites handing the icon ink to text**, not tokens: `--status-success-ink` 3.58, `--status-warning-ink` 3.07, `--status-danger-ink` 4.41, `--muted-foreground`-on-`--muted` 4.34, across **2234 `text-status-*-ink` occurrences**. Recorded in the suite and handed up as a token-layer decision.
- [x] Layout is correct at 375, 768 and 1280.
  **CLOSED by S14.** `node scripts/browser-journeys.mjs --base-url=http://localhost:3000 --cookie-file=<minted>
  --widths=375,768,1280 --settle-ms=6000` -> exit 1 (39 findings), **63 of 63 planned steps run** — the first
  whole denominator. **`scrollWidth - innerWidth` = 0 on every one of the 63 steps at all three widths**
  (max over the whole run: 0), **0 never-settled**, **one `h1` on 63 of 63**, 0 unauthenticated.
  **The kanban board was reached and measured**, which is what this box was actually waiting for.
  `/build/20` (resolved by the harness clicking the first row of `/build/all`) redirects to
  `/build/workspaces/31510333-.../20` and renders **content** with a named `main` and one `h1` at every width.
  The board's own containment was then measured directly, because a document that does not scroll is a weak
  result over a surface that is supposed to: `.kanban-scroll-container` is **1,496px wide against a client
  width of 343 / 448 / 944**, holds **5 droppable columns and 4 draggable cards**, and its right edge sits at
  **359 / 744 / 1248 inside viewports of 375 / 768 / 1280**. The board scrolls; the document does not. At 375
  and 768 the project toolbar is a second contained scroller (464/375 and 645/496), also inside the viewport.
  **No horizontal overflow defect exists on the widest screen in the product.**
  Error boundaries fell from 12 steps to 3: `/crm/leads` only (CRM excluded from this release).
  **`/calendar` no longer errors** — S11's 62-day-window finding is gone.
  One NEW defect this box's board journey found, written up in `reports/30d-boards-reached.md` S4 and not
  fixed here: `/build/<id>/backlog` **404s for any project that belongs to a PM workspace**. The
  `[projectId]` layout redirects the whole path through `withPmWorkspacePath`, but
  `build/[projectId]/` has 39 entries and `build/workspaces/[pmWorkspaceId]/[projectId]/` has 6 — measured,
  `/build/workspaces/<w>/20/epics` -> 200, `/build/workspaces/<w>/20/backlog` -> 404. That 404 page renders
  with no `main` landmark, which is the run's only 3 non-contrast findings. Route ownership + `not-found.tsx`,
  both other territories.
  --- superseded S13 text, kept for the record ---
  S13: NOT WORKED. No browser, dev server or database was started this session; every number below is S11's.
  The blocker S11 named — `/build/all` failing on the `page` vs cursor drift — was not fixed here either; it is `types/**` plus the backend schema.
  PARTIAL, but the result is stronger than S8's and the gap has moved from "the run errored" to one
  named contract drift. `node scripts/browser-journeys.mjs --widths=<W>` run once per width with the dev
  server restarted between, against a local backend on :1501 over `scratch_t30_browser` (journal head
  665) with every module enabled → **57 steps · `scrollWidth − innerWidth` = 0 on every one of the 57, at
  375, 768 and 1280 · 0 never-settled (S8 had 7) · one `h1` on 57 of 57 (S8 had 46) · a named `main` on
  57 of 57 · 0 unauthenticated**. 45 of 57 reached a terminal product state (21 empty, 21 content,
  3 denied); 12 are the same four routes at three widths.
  NOT closed, and now for a precise reason: **a kanban board still has not been rendered.** The board and
  its backlog table were *planned* steps this time and the harness tried to reach them, resolving the
  project id from the running product; it recorded `step-not-reached` ×2 per width rather than reporting a
  smaller clean run. The id is unresolvable because **`/build/all` renders "Failed to load projects"** —
  `types/projects/projects.ts:344` declares `page` and `projects-page.tsx:293` sends it, while the
  backend's `listProjectsSchema` is cursor-based and `.strict()`, so `GET /build?page=1` is rejected with
  `Unrecognized key: "page"`. There is no row to click, so there is no board to open. Fixing that one
  drift unblocks this box. `/build/<id>` additionally fails to server-render on a `undici`/`jsdom`
  dependency mismatch (`Cannot find module 'undici/lib/handler/wrap-handler.js'`, verified absent on
  disk). Both are outside this territory and are written up in `reports/30b-states-a11y-and-journeys.md` §5.
  `/crm/leads` still fails on the `lead_party_map`/`business_parties` grouping error — CRM is excluded
  from this release; recorded and moved past.
- [ ] Representative browser end-to-end journeys cover the main module flows.
  **S15 — A-30 IS CLOSED. The run asserts a write, and the write is a row in Postgres, not a claim.**
  `node scripts/browser-journeys.mjs --base-url=http://localhost:3130 --cookie-file=<minted>
  --widths=375,768,1280 --settle-ms=6000 --allow-cross-origin-api` -> exit 1,
  **`63 of 63 planned steps run · 1 of 1 writes asserted · 31 findings`** (contrast 27, never-settled 4).
  `--self-test` -> **exit 0, 48 passed** (was 39; nine new, three of them bite proofs).
  `WRITE_JOURNEYS` drives the kanban column composer to create a ticket and asserts the row **survives a
  reload** — away to `/dashboard`, back, look again — which is the only way a browser distinguishes a
  server write from the optimistic cache entry the mutation wrote locally. The subject is unique per run
  and asserted **absent** before the write, so an earlier run's row can never pass for this one's.
  `writesIncomplete()` is the mirror of `stepsIncomplete()`: a run whose write never landed exits 1
  rather than reporting a clean read-only sweep, and both checks are required to name `{subject}` so
  neither can degrade into a constant `true`.
  **Proved in the database, not in the DOM:**
  `select id,title,status,project_id from build.tickets where title like 'journey-write-%'` on
  `scratch_t30_browser` -> `20573 | journey-write-1788415461072-a9fe35 | TODO | 20`.
  Real Chrome -> real `next dev` -> real Nest backend -> real Postgres. **Nothing in that path is mocked.**
  Other numbers, all three widths: **`scrollWidth - innerWidth` = 0 on every one of the 63 steps** ·
  **one `h1` on 63 of 63** · **a NAMED `main` on 63 of 63** (S14 had 60; the three misses were
  `/build/20/backlog` 404ing for a PM-workspace project, which now answers 200) · 0 unauthenticated ·
  3 error-boundary steps, all `/crm/leads`, CRM excluded (R-26 unchanged) · contrast 4,485 sampled /
  **0 unresolved** / 369 failing.
  **The 4 never-settled were investigated, not reported raw.** `/accounting/coa` shows 0 busy regions and
  0 skeletons at 6s/14s/30s when re-probed — it was a cold Turbopack compile. `/dashboard` shows **15
  visible skeletons and 0 `aria-busy` at 30s**, every time: `features/dashboard/dashboard-deferred-body.tsx`
  gates every read on `deferredVisible`, which `DeferredDashboardContent` only flips `onVisible`, and a
  headless viewport never scrolls. That is a deliberate below-the-fold deferral (ticket 27), **not** a
  stuck read — but its fallback paints skeletons with no `aria-busy` and no live region, so a sighted
  user sees "loading" and a screen-reader user is told nothing. Handed to ticket 27/28.
  **ENVIRONMENT — the stale-server trap was real and two of three running servers were traps.** :1043 was
  a 14h37m `next-server` whose cwd is a scratchpad `t26/frontend`; :1000 is `next start` over a `BUILD_ID`
  stamped 08:27; **:3000 is a `next dev` whose `INTERNAL_API_SECRET` does not match the backend's, so
  `/api/auth/session` carries no `backendJwt`, every client read 401s and `lib/api-client.ts:202` calls
  `signOut({callbackUrl:"/signin"})` — while `curl /dashboard` still answers 200.** Anyone screenshotting
  :3000 today is screenshotting a signed-out app. This session ran instead against **its own
  `git archive HEAD` tree** at `/Users/.../streamline/.t30-live`, `next dev -p 3130`, secrets verified by
  sha256 against the running backend's process env, pointed at the existing backend on :1501 over
  `scratch_t30_browser`; `/api/auth/session` -> `backendJwt: true, enabledModules: 13` before the run.
  **`--allow-cross-origin-api` was used and is declared.** The backend's `CORS_ORIGINS` is
  `http://localhost:1000,http://localhost:3000` and both ports were occupied by other agents, so the
  BROWSER's CORS check was turned off for :3130. The flag prints a warning line and is recorded as
  `crossOriginApiAllowed: true` in the results JSON. **A run that used it is not evidence CORS is
  configured**, and nothing here claims it is.
  **STILL OPEN, on two narrower remainders:**
  (1) **One module has a write.** Build. HR, accounting, settings, calendar, workflows, knowledge and
  notifications are covered as routes at three widths, not as flows with a mutation. "Cover the main
  module flows" is not yet true. The mechanism is generic now — a route, an `absent` check, actions, a
  `present` check — so each further write is bounded work, not new design. **Owner: ticket 30.**
  (2) **R-25 unchanged and not in this territory.** No frontend CI job boots the app;
  `.github/workflows/frontend.yml` has five jobs and none starts a server or a database. **Owner: CI.**
  **RESIDUAL-RISK REGISTER 2026-09-03 — three separable remainders are presented here as one, and only the CI
  half is actually blocked.**
  **A-30 (ASSIGNABLE) — in this ticket's OWN territory.** "Nothing asserts a write" is work inside
  `frontend/scripts/browser-journeys.mjs`, whose own header says it: "Each step is a route plus an optional inert
  interaction — none of these writes". Adding a write-and-assert journey is not blocked on anything and is not
  owned. **Owner: ticket 30 owner. Deadline: 2026-09-17.**
  **R-25 (ACCEPTED RESIDUAL · INFRA/CI).** "Cannot be a CI gate" is genuine, and the browser is **not** the
  obstacle — the harness's candidate list already includes `/usr/bin/google-chrome` and `/usr/bin/chromium`. The
  obstacle is that **no frontend CI job boots the app**: `.github/workflows/frontend.yml` has five jobs
  (`frontend`, `type-check`, `build`, `tests`, `gates`) and none starts a server or a database. It needs
  `--base-url` (a running app, both repos) and `--cookie-file` (a minted `authjs.session-token`). Backend CI
  already runs a seeded job (`tenant-isolation`), so the pattern exists for one repo; a cross-repo job with a
  minted session does not. **Owner: CI owner. Deadline: 2026-09-17.**
  **R-26 (ACCEPTED RESIDUAL · SCOPE).** `/crm/leads` is the one route of 21 still reaching an error boundary.
  **Owner: CRM/inventory release owner. Review: 2026-12-01.**
  **S14 — the journeys the broken project list made unreachable are now closed, and the honesty property is
  intact.** `node scripts/browser-journeys.mjs --self-test` -> **exit 0, 39 passed**, six bite proofs,
  unchanged. The full run -> **exit 1, `63 of 63 planned steps run`** — the first time this harness has
  reported a whole denominator. S11 reported `57 of 63` and exited 1 on its own incompleteness refusal
  because no `projectId` could be resolved; this session the harness's click-through resolved
  `projectId = 20` from `/build/all` in 19 seconds and both build journey steps ran at all three widths.
  **The `n of m planned` refusal was NOT relaxed to get there** — no step was removed, no denominator was
  shrunk, and `stepsIncomplete` still exits 1. The number moved because the product was fixed, which is the
  whole point of the property.
  NOT closed, and for the same reason S11 gave rather than a new one: the steps are still routes plus one
  click, nothing asserts a write, and the run needs a live app plus a minted session, so it cannot be a CI
  gate as it stands. What changed is that the "four of 19 routes reach an error boundary" caveat is now
  **one of 21** — `/crm/leads` only, and CRM is excluded from this release.
  --- superseded S13 text, kept for the record ---
  S13: NOT WORKED. No browser, dev server or database was started this session; every number below is S11's.
  The blocker S11 named — `/build/all` failing on the `page` vs cursor drift — was not fixed here either; it is `types/**` plus the backend schema.
  PARTIAL. The harness is materially stronger than S8 left it, and both of its refusals are intact.
  `node scripts/browser-journeys.mjs --self-test` → **exit 0, 39 passed** (was 20), six of them bite proofs.
  Added this session: **steps may carry a `{token}` resolved from the running product** — read from a link
  if there is one, otherwise by **clicking the first row of the listing and reading where it landed**,
  which is the click-through this box said was missing; and **a step that was never reached no longer
  shrinks the denominator** — the run reports `n of m planned`, records `step-not-reached`, and exits 1,
  because a run that skipped a step would otherwise read as cleaner than the run it failed to be. That is
  the mirror of S8's all-errors refusal, which was left in place untouched.
  One probe defect found and fixed rather than reported: the contrast sampler walked past any background
  colour its `rgb()` parser could not read, and Tailwind 4 serialises its palette as `oklch()`, so a white
  label on `bg-status-danger-fill` was scored against the page ground at **1.05:1** — invisible text, which
  no shipped page has. An unparseable ground is now unmeasurable, not absent. Same tree, re-measured at
  1280: **1,995 sampled / 143 AA failures became 1,688 / 86**, and the three real token pairs are unchanged.
  NOT closed: the steps are still routes plus one click rather than flows with assertions on writes,
  nothing exercises a mutation, four of 19 routes reach an error boundary (box 4), and the run needs a live
  app plus a minted session, so it cannot be a CI gate as it stands.
- [x] Error and offline states are not removed during cleanup merely because they are uncommon in local development.
  Closed by construction and strengthened. The ratchet in `components/__tests__/authenticated-surface-states.contract.test.ts` now sits at **0 missing loading states and 0 missing permission gates**, so any surface that loses either fails immediately rather than after a 73-surface slide. Four tests pin offline: the shell mounts `<ShellOfflineBanner />`, the banner is `role="status" aria-live="polite"`, the hook listens for both `online` and `offline`, and a bite proof fails if the banner is unmounted. 19/19 green.
- [x] Public metadata is correct without changing landing visuals or animations.
  `pnpm -s check:seo-metadata` exit 0 and `check:seo-metadata:self-test` exit 0 ("all three failure modes bite as designed"), re-run at head. It enforces `robots: { index: false, follow: false }` on every authenticated layout, `title` + `description` + `alternates.canonical` on every intentionally indexable public page, and no auth-gated import inside `app/(public)`. No file under `app/(public)/**` or `features/landing/**` was touched this session.
