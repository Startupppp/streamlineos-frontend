# 13 — Give the list-view module an address any module can reach

**What to build:** Move the filter machinery out of Build and rename its public surface off ticket vocabulary.

The module is good. It is also invisible: files outside Build importing any part of it number **zero**, and the only two importers live in Build's own views folder. A well-built module filed under a product name is invisible to exactly the search that would want it — nobody looking for a shared list abstraction searches inside a product module, which is why the architecture review's first pass recommended building one from scratch.

By this point the type layer is open (ticket 08), so this is relocation and naming. Build's imports change path; nothing else in Build changes.

**Blocked by:** 08 — Filters take a description of what a page filters by.

**Status:** PARTIAL - the decision layer moved, the presentation layer could not

- [ ] ~~The machinery lives in a shared location named for lists.~~ **Partly met.** `features/shared/list-view/` now holds the spec, the hook and the chip primitive behind a barrel. The interaction machinery - command menu, category submenus, flat search, category list and row, option leading, trigger button, submenu internals - did **not** move: every one of them imports Build's `filter-types.ts` or `StatusConfigEntry`, so moving them means generalising them first. That is its own ticket.
- [x] No exported name mentions tickets, sprints, cycles or projects - true of everything that moved.
- [x] Build's imports change path and nothing else in Build changes. Three files repointed: the ticket hook, the ticket filter bar, and the workload filter bar.
- [x] The fence from ticket 03 passes unchanged.
- [x] The module reimplements none of the shared table, pagination, search-input or page-wrapper primitives. What moved is URL state plus one chip; presentation stays with the caller.
- [ ] ~~Build's list screens behave identically - verified by running them.~~ **Not met.** Tests and typecheck only; the app was not booted.
- [x] Nothing is left behind. The files were moved, not copied, and no re-export shim was created.

## Result

Moved to `features/shared/list-view/`: `list-filter-spec.ts`, `use-list-filter-params.ts`, its test, and `filter-chips.tsx` (renamed `filter-chip.tsx` for its single export), behind an `index.ts` barrel.

**What did not move, and why it matters.** Nine presentation files stayed in `features/build/shared/`. The wall this stream set out to remove is therefore only half down: another module can now own its filter *state* declaratively, but still has to build its own filter *control*. Ticket 15 proves the state half works; the control half needs the same treatment ticket 08 gave the types.

Also found while surveying: Build holds at least three further independent filter implementations - `all-work/use-all-work-filters.ts` (which the frontend constitution names canonical), `project-list/add-filter-popover.tsx` and `customers/customer-filter-popover.tsx`. The duplication is wider than the review's figures suggested, and the canonical one named in the constitution is not the one this stream generalised.

Verified: 39/39 tests; frontend `tsc --noEmit` 0 errors.
