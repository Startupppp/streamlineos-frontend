# 15 — Prove the door opens: one non-Build list adopts the module

**What to build:** Adopt the shared list-view module on one list page outside Build, and delete the hand-rolled filtering it replaces.

Across the web app, 106 files hand-sync filter state to the URL, 94 hand-debounce their search, and 129 hand-handle the neutral "all" value — each a slightly different set of decisions, each a place where a filter bar can grow past the width available with nobody owning what happens next. That is the size of the opportunity, not a task list; this ticket takes one page.

Pick a page whose filter bar currently overflows, and preferably one that phase-one work is touching anyway. Until a second module uses this module, its interface is still a guess.

**Blocked by:** 13 — Give the list-view module an address any module can reach.

**Status:** ready-for-agent

- [ ] One list page outside Build filters through the shared module.
- [ ] That page declares its categories and contains no hand-rolled URL syncing, debouncing or neutral-value handling.
- [ ] The adoption **removes more lines from the page than it adds**. If it does not, the interface is wrong and that is worth stopping for.
- [ ] Filters on that page survive a refresh and are shareable by copying the URL.
- [ ] Every filter the page offers is reachable at 375, 768 and 1280 pixels wide.
- [ ] The page's filter behaviour matches Build's — same overflow treatment, same chips, same neutral value.
- [ ] Active filters are announced to a screen reader.
- [ ] No API contract, query parameter or backend filter semantic changed.
- [ ] Anything the adoption revealed as awkward in the module's interface is recorded. This is the ticket that tests whether the spec shape generalises, and what it finds is more valuable than the page.
