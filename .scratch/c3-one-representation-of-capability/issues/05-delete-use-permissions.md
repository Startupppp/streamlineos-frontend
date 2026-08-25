# 05 — The flat permission array stops existing on the client too

**What to build:** The command palette, the product switcher and the sidebar's visibility rules read capability through the gating seam instead of a derived array. The helper that rebuilt a flat list from the scope record — the exact shape a previous refactor removed from the wire — is deleted, so there is no supported way to get a flat permission array on the client.

Nothing user-visible changes. Navigation must show exactly the same destinations to exactly the same people.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

## Acceptance criteria

- [ ] The derived-array helper is deleted and no file imports it.
- [ ] All three navigation surfaces show the same destinations to the same people as before this ticket.
- [ ] Surfaces that genuinely need to iterate the whole capability set read the scope record directly rather than materialising a list to search.
- [ ] The org-owner short-circuit still applies on every one of the three surfaces.
- [ ] Sidebar permission coverage stays enforced: every non-universal route carries a requirement and every universal one does not.
- [ ] No navigation entry is rendered that predictably ends at access denied.

## Todo

- [ ] Move each of the three consumers, one at a time, checking the rendered destinations before and after
- [ ] Prefer the per-key gating hook; read the scope record directly only where the whole set is genuinely needed
- [ ] Delete the helper and confirm nothing imports it — check with the module-graph tool, not grep, since a side-effect import is invisible to a from-based scan
- [ ] Run the sidebar permission-coverage test and the deep-link-to-sidebar test
- [ ] Verify the three surfaces in a browser as an owner and as a narrowly-scoped member
- [ ] Tick every acceptance criterion above
- [ ] Set **Status** to `done` and update this ticket's row in `../README.md`
