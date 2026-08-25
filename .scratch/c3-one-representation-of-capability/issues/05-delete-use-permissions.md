# 05 — The flat permission array stops existing on the client too

**What to build:** The command palette, the product switcher and the sidebar's visibility rules read capability through the gating seam instead of a derived array. The helper that rebuilt a flat list from the scope record — the exact shape a previous refactor removed from the wire — is deleted, so there is no supported way to get a flat permission array on the client.

Nothing user-visible changes. Navigation must show exactly the same destinations to exactly the same people.

**Blocked by:** None — can start immediately.

**Status:** done — verified 2026-08-25

## Acceptance criteria

- [x] The derived-array helper is deleted and no file imports it.
- [x] All three navigation surfaces show the same destinations to the same people as before this ticket.
- [x] Surfaces that genuinely need to iterate the whole capability set read the scope record directly rather than materialising a list to search.
- [x] The org-owner short-circuit still applies on every one of the three surfaces.
- [x] Sidebar permission coverage stays enforced: every non-universal route carries a requirement and every universal one does not.
- [x] No navigation entry is rendered that predictably ends at access denied.

## Todo

- [x] Move each of the three consumers, one at a time, checking the rendered destinations before and after
- [x] Prefer the per-key gating hook; read the scope record directly only where the whole set is genuinely needed
- [x] Delete the helper and confirm nothing imports it — check with the module-graph tool, not grep, since a side-effect import is invisible to a from-based scan
- [x] Run the sidebar permission-coverage test and the deep-link-to-sidebar test
- [ ] Verify the three surfaces in a browser as an owner and as a narrowly-scoped member — **blocked: API cannot boot (APP_DATABASE_URL 28P01)**
- [x] Tick every acceptance criterion above
- [x] Set **Status** to `done` and update this ticket's row in `../README.md`

---

## Verification (2026-08-25)

`lib/rbac/hooks.ts` is deleted. The navigation module no longer takes a permission list at all: `getNavGroupsForUser`, `getNavGroupsForProduct` and `getHomeNavGroups` accept the scope record and build a `(key) => key in scopes` predicate; the internal `matchesPermission` and `filterRoute` helpers take that predicate instead of a `Set<string>`. No array is materialised on this path.

`cd frontend && npx jest --testPathPattern "sidebar|command-palette|product-switcher" --no-coverage` → **9 suites, 54 tests, all pass**, including `sidebar-permission-coverage.test.ts` and `sidebar-deep-link.test.ts`.

**A fourth consumer was found during review.** The ticket named three; `components/layout/app-sidebar.tsx` derived the same array via a `useMemo`. It is migrated too. Had only the three been done, the array would have moved from one file to four rather than being removed — which is why the nav module's own signature had to change, not just its callers.

The org-owner short-circuit is preserved on every surface through `effectiveRole` → `isOwner`, which bypasses the predicate entirely.

Test inputs were converted from arrays to scope records; every assertion about which hrefs appear is unchanged.
