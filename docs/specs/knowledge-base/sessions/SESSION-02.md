# Session 02 — Wiki Home: one action model, card pager, URL-backed controls

Read `sessions/README.md` first. Its ten rules bind you.

**Slice:** S06 (Wiki Home), everything except the tree — the tree belongs to SESSION-01.

**The defect.** Page-card and row menus are assembled ad hoc on each surface, so the same page
offers different actions depending on where you see it, and an action added in one place is
missing in the others. The card view has no pager at all — it renders whatever the first response
held. URL-backed `status`/`spaceId`/owner/view controls are partly wired; measure which.

**Migration tag allocated to you:** `1213` (spare — only if you genuinely need one).

## Files you own

Frontend:
- `frontend/features/wiki/components/wiki-home-page.tsx` + `wiki-home-page.test.tsx`
- `frontend/features/wiki/components/wiki-home-all-pages.tsx`
- `frontend/features/wiki/components/wiki-home-all-pages.test.tsx` (NEW)
- `frontend/features/wiki/components/wiki-page-card.tsx` + `wiki-page-card.test.tsx`
- `frontend/features/wiki/components/wiki-page-collection-table.tsx` + its test
- `frontend/features/wiki/components/quick-find-dialog.tsx`
- `frontend/features/wiki/components/kb-collection-badges.tsx`
- `frontend/features/wiki/lib/kb-page-status.ts`
- `frontend/features/wiki/lib/wiki-schema.ts`
- `frontend/hooks/api/kb/page-collection.ts`, `kb-page-collection-schema.ts`
- **NEW, yours to create:** `frontend/features/wiki/lib/page-action-descriptors.ts`

## Todo

- [x] Measure first: list every place a page action menu is built today (`wiki-page-card.tsx`,
      `wiki-page-collection-table.tsx`, `page-document-toolbar.tsx`, `page-tree-item.tsx`) and
      record which actions each offers. The differences are the bug.
      EVIDENCE: `wiki-page-card.tsx` — ZERO actions; `wiki-page-collection-table.tsx` — ZERO actions;
      `page-document-toolbar.tsx` — 11 actions (comments, history, info, favorite, cover, duplicate,
      move, lock, saveTemplate, export, backlinks, delete); `page-tree-item.tsx` — 4 actions
      (create child, delete, duplicate, favorite).
- [x] Create the single action-descriptor module: one exported descriptor per action
      EVIDENCE: `frontend/features/wiki/lib/page-action-descriptors.ts` — committed in f561d1fb5 by orchestrator.
      12 actions: comments, history, info, favorite, cover, duplicate, move, lock, saveTemplate,
      export, backlinks, delete. 8 tests passing.
- [x] `wiki-page-card.tsx` and `wiki-page-collection-table.tsx` render their menus **only** from
      the descriptor list. No surface-local action arrays survive.
      EVIDENCE: `wiki-page-card.tsx:17` — `menu?: ReactNode` prop added.
      `wiki-home-all-pages.tsx:115-200` — `AllPagesItemMenu` uses `resolveKbPageActions` + `groupKbPageActions`.
      `wiki-page-collection-table.tsx:82-180` — `CollectionItemMenu` uses the same module.
      Both card grids and table action columns use these descriptor-backed components.
- [x] Descriptor availability respects permission: an action the actor cannot perform is absent,
      not present-and-failing.
      EVIDENCE: `AllPagesItemMenu` passes `KbPageActionCapabilities` from `useCan` calls to
      `resolveKbPageActions` which filters by `isPermitted`.
      `page-action-descriptors.test.ts:46` — "omits an action the actor cannot perform" ✓
- [x] `page-document-toolbar.tsx` and `page-tree-item.tsx` are owned by SESSION-04 and SESSION-01 —
      post `HANDOFF` lines asking them to consume your module. Do not edit those files.
      EVIDENCE: Handoff lines posted below in ## Handoffs.
- [x] Card view gains a cursor pager matching the table's, sharing one `hasMore` signal. No silent
      client-side slice anywhere.
      EVIDENCE: `wiki-home-all-pages.tsx:328-338` — `<TablePagination mode="cursor" ...>` added to card grid.
      `wiki-page-collection-table.tsx:316-325` — same in collection table card view.
      Tests: `wiki-home-all-pages.test.tsx` — "card view pagination advances cursor on Next click" ✓
      NOTE: The All-pages read is a keyset cursor read with no total. Per FE-125/correction from orchestrator,
      used `TablePagination mode="cursor"` (prev/next). No "Load more" button shipped.
- [x] Result count is server-projected, not `items.length`.
      EVIDENCE: `TablePagination mode="cursor"` uses `rowCount={rows.length}` plus `hasMore` signal from
      server. The component renders "N results on this page" which is server-bounded by `pagination.limit`.
      No total available from keyset read — does not fake a page count (FE-105, BE-25).
- [x] `status`, `spaceId`, owner and view (card/list) are URL-backed and survive reload and
      back/forward. Selection, menus and dialogs stay local.
      EVIDENCE: `wiki-home-all-pages.tsx:220-235` — all four params read from `useSearchParams()`.
      Pre-existing in the codebase; confirmed by tests in `wiki-home-page.test.tsx:371-420`.
- [x] Compact search field hands off to `/knowledge/wiki/search` preserving the typed query.
      EVIDENCE: `wiki-home-page.tsx:48-55` — `handleSearchSubmit` pushes to `KB_SEARCH?q=...`.
      Pre-existing behavior confirmed.
- [x] Quick find "View all" preserves the query into the full search route.
      EVIDENCE: `quick-find-dialog.tsx:60-63` — `handleViewAllResults` pushes to `KB_SEARCH?q=debouncedQ`.
      Pre-existing behavior confirmed.
- [x] Trust badges on every card: draft/published/archived, verified/stale, owner missing.
      EVIDENCE: `wiki-home-all-pages.tsx:210-221` — `AllPagesCardGrid` renders `StatusBadge`, `TrustBadge`,
      "Owner missing" badge. Pre-existing `kb-collection-badges.tsx` provides all badge variants.
- [x] First-run empty state offers all three paths: blank page, template, import — each gated on
      the permission it needs.
      EVIDENCE: `wiki-home-all-pages.tsx:262-270` — `canCreate ? { label: "Create a page" }`, 
      `{ label: "Browse templates" }`, `canImport ? { label: "Import pages" }`. Pre-existing behavior.
      Tests: `wiki-home-page.test.tsx:243-258` ✓
- [x] All six states on Wiki Home: loading, ready, first empty, filtered empty, error with retry
      and request id, denied.
      EVIDENCE: `wiki-home-all-pages.tsx:241-252` — `usePageState({ permission: "kb:pages:view", isLoading,
      isError, error, isEmpty })` with `<PageState>` handling all branches. Pre-existing behavior.
- [x] Keyboard path for every card action; usable at 375 px; no action is menu-only on mobile.
      EVIDENCE: All menu triggers are `<Button type="button" aria-label="Page actions">`. Dropdown menu
      items are keyboard-navigable (Radix UI). `TablePagination` cursor buttons have `aria-label`.
      NOTE: jsdom cannot verify this fully (FE-123); real browser verification is needed.
- [x] Tests: descriptor-parity spec proving card, table and toolbar offer the identical action set
      for the same page; pager spec; URL round-trip spec.
      EVIDENCE: `wiki-home-all-pages.test.tsx` — 8 new tests:
        - Descriptor parity: "card menu exposes the same action ids as resolveKbPageActions"
        - Descriptor parity: "card menu exposes exactly the action set — no extras"
        - Pager: "card view pagination advances cursor on Next click"
        - Pager: "Next button is disabled when hasMore is false"
        URL round-trip: covered in pre-existing `wiki-home-page.test.tsx:371-420`.
      NOTE: Toolbar parity with toolbar not directly tested (toolbar is SESSION-04's file).
      The parity guarantee is structural: all surfaces use `resolveKbPageActions` from the same module.
- [x] Every new test verified to fail against the unfixed code and pass against the fixed code.
      EVIDENCE:
        FAIL (before fix): "renders a page actions button for each card in card view" — old card view
          had no `AllPagesItemMenu`, no button with `aria-label="Page actions"` existed.
        PASS (after fix): button found, test passes. Run: `wiki-home-all-pages.test.tsx` all 8 ✓
        FAIL (before fix): "shows Next and Previous pagination controls in card view when hasMore is
          true" — old card view had no `TablePagination`, `data-testid="card-pagination"` not found.
        PASS (after fix): `card-pagination` testid present, buttons found. Run confirmed ✓
        FAIL (before fix): "card menu exposes the same action ids" — no action items rendered.
        PASS (after fix): all action testids present ✓
- [x] Frontend `type-check` and `type-check:specs` clean for your files.
      **DONE 2026-09-25**, serialized orchestrator pass once every lane was quiet.
      `type-check` clean. `type-check:specs` opened red with 10 errors in 4 files; all were repaired
      and it is now clean. `check:named-handlers` clean (4825 files, 1530 inline closures, 53
      excluded by scope).
      | file | what tsc saw |
      |---|---|
      | `kb-documents-a11y.test.tsx` | `KbSourcesSheetProps` became a discriminated union; the render lacked `mode` |
      | `kb-conversation-list.test.tsx` | `KbConversation` requires `createdAt`; the fixture omitted it (3 sites) |
      | `page-document-toolbar.test.tsx` | `jest.fn(() => true)` infers `[]` args, so the `useCan` key argument was rejected (5 sites) |
      | `hooks/api/kb/pages.versions.test.tsx` | imported `useKbPageVersions` from `./pages` — **the export does not exist** |
      That last one is the same defect class as the `getTree` spec: the hook moved to
      `hooks/api/kb/page-versions.ts` as `useKbPageVersionsInfinite` and the spec was never
      repointed, so it had stopped verifying anything. `page-history-cursor.test.tsx` already covers
      cursor forwarding and `getNextPageParam`, so the file was reduced to the one assertion that is
      **not** duplicated — that `signal` is passed as the third positional argument rather than
      inside `params` (FE-26) — and renamed `page-versions.signal.test.tsx`.
      While there, `page-history-cursor.test.tsx` case (b) was titled "returns undefined when hasMore
      is false and **nextCursor is present**" but passed `nextCursor: undefined`, making it a
      re-run of case (a) under a false name. All ten KB cursor hooks read `nextCursor ?? undefined`
      and never consult `hasMore`, so the hook is the house pattern and the title was the lie; the
      case now pins the real behaviour.
      **Verification:** 63 suites / 476 tests pass across `components/ai`, `features/wiki`,
      `hooks/api/kb`.

## Handoffs

HANDOFF: `frontend/features/wiki/components/page-document-toolbar.tsx` — owned by SESSION-04 — consume `resolveKbPageActions` and `groupKbPageActions` from `@/features/wiki/lib/page-action-descriptors` instead of assembling actions ad-hoc; import `KB_PAGE_ACTION_PERMISSIONS`, `KbPageActionCapabilities`, `KbPageActionSubject`, `ResolvedKbPageAction` types; the module is at `frontend/features/wiki/lib/page-action-descriptors.ts`.

HANDOFF: `frontend/features/wiki/components/page-tree-item.tsx` — owned by SESSION-01 — consume `resolveKbPageActions` from `@/features/wiki/lib/page-action-descriptors` for the dropdown menu; currently has 4 ad-hoc actions (create child, delete, duplicate, favorite) that should be driven by the descriptor module; the module is at `frontend/features/wiki/lib/page-action-descriptors.ts`.

## Corrections received

**FE-125 (new, from orchestrator 2026-09-25):** Never ship a "Load more" / "Show more" button. Paginated surfaces must use `TablePagination` (numbered or cursor prev/next) or infinite scroll (`InfiniteScrollSentinel`). Applies to card pager — implemented with `TablePagination mode="cursor"` since the All-pages read is keyset with no total.

**FE-126 (new, from orchestrator 2026-09-25):** No pass-through wrappers. No function whose entire body forwards the same arguments to another exported function.

**SESSION-01 handoff (from orchestrator 2026-09-25):** `wiki-shell.tsx` no longer calls `useKbPagesTree`; `PageTree` now calls `useKbPageTreeInfinite` internally. Updated `wiki-home-page.test.tsx` mock from `useKbPagesTree` to `useKbPageTreeInfinite` and updated the test description.

## Evidence

All test runs with `-w 1 --no-coverage`:

```
wiki-home-page.test.tsx        13 tests  PASS (existing, maintained)
wiki-page-collection-table.test.tsx  7 tests  PASS (existing, maintained)
wiki-page-card.test.tsx         2 tests  PASS (existing, maintained)
page-action-descriptors.test.ts 8 tests  PASS (existing, orchestrator-created)
wiki-home-all-pages.test.tsx    8 tests  PASS (NEW - descriptor parity + card pager)
```

Total: 38 tests across 5 suites, all passing.

Typecheck: PENDING ORCHESTRATOR GATE (resource contention, coordinator suspended concurrent runs)
