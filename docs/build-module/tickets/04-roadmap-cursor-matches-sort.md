# 04 — Make the roadmap cursor match its own ordering

**What to build:** Paging through the roadmap returns each item exactly once, under every sort a client can choose. Today the page-boundary predicate always compares the display-order column while the ordering column varies with the requested sort, so paging duplicates and skips rows. The request schema offers three sort values — by updated, by created, by title — and all three are broken; the only correct ordering is the default reached by omitting the parameter. Under the title sort the boundary filters on a column that does not appear in the ordering at all.

The cursor must carry the value of whichever column drives the ordering, plus enough information to rebuild the matching predicate.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] For every selectable sort, walking all pages yields each item exactly once with no gaps
- [ ] The cursor records which ordering it was issued for, and cannot be applied under a different ordering
- [ ] Choosing the ordering and building the boundary happen in one place, so they cannot be selected independently
- [ ] A contract test covers each sort value, paging past the first page and asserting no duplicate and no missing item
- [ ] The keyset page still reports no total, per BE-25
