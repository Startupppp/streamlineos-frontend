# 15 — Prove the door opens: one non-Build list adopts the module

**What to build:** Adopt the shared list-view module on one list page outside Build, and delete the hand-rolled filtering it replaces.

Across the web app, 106 files hand-sync filter state to the URL, 94 hand-debounce their search, and 129 hand-handle the neutral "all" value — each a slightly different set of decisions, each a place where a filter bar can grow past the width available with nobody owning what happens next. That is the size of the opportunity, not a task list; this ticket takes one page.

Pick a page whose filter bar currently overflows, and preferably one that phase-one work is touching anyway. Until a second module uses this module, its interface is still a guess.

**Blocked by:** 13 — Give the list-view module an address any module can reach.

**Status:** DONE — with three criteria not met, recorded below

- [x] One list page outside Build filters through the shared module: inventory purchase orders.
- [ ] ~~That page declares its categories and contains no hand-rolled URL syncing, debouncing or neutral-value handling.~~ **Partly met.** Hand-rolled URL syncing and debouncing are gone. The `all` sentinel mapping stays in the page as a four-line adapter, because the select primitive cannot take an empty string as an item value while the module represents unfiltered as absence. Owning the sentinel properly means owning the control, which ticket 13 could not finish.
- [x] Met, but only after acting on the signal — see below. 461 lines to 458.
- [x] Filters survive a refresh and are shareable. **Search now is too**, which it was not before: it lived in component state and was lost on reload. A deliberate improvement, and it adds a `q` parameter to this page's URL.
- [ ] ~~Every filter the page offers is reachable at 375, 768 and 1280 pixels wide.~~ **Not met.** Not verified; requires a browser. The page's existing responsive markup is untouched by this change.
- [ ] ~~The page's filter behaviour matches Build's — same overflow treatment, same chips, same neutral value.~~ **Not met, and cannot be yet.** This page keeps its own selects; it did not gain Build's chips or overflow treatment, because that is the presentation layer ticket 13 could not move.
- [ ] ~~Active filters are announced to a screen reader.~~ **Not met.** This page has no chips to announce; it uses labelled selects whose value is their own announcement. Revisit when the control moves.
- [x] No API contract or backend filter semantic changed. The page's own URL gains `q` for search, as described above.
- [x] Recorded, and acted on — this was the ticket's real yield.

## Result — the adoption found a hole, which is what it was for

The first conversion **added 8 lines instead of removing any**. The criterion says that means the interface is wrong and is worth stopping for, and it was right.

The cause: the module owned filters but not pagination. It knew the page parameter well enough to reset it on every filter change, but offered no way to *set* it — so the page kept a nine-line hand-rolled URL writer purely for paging, and with it `useSearchParams`, `useTransition` and a router reference.

`page` and `setPage` now belong to the module, with the reset-versus-preserve distinction handled inside it. The page dropped the writer and two now-dead imports and came out at 458 lines against 461. Four tests cover the new surface, including that page one is expressed as absence rather than `page=1`.

Had the line count not been checked, the module would have shipped with a gap every future adopter paid for silently.

Verified: 39/39 tests across the build and shared suites; frontend `tsc --noEmit` 0 errors.
