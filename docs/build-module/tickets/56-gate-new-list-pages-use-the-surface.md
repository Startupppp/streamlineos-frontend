# 56 — A new Build list page cannot hand-assemble its own surface

**What to build:** The next Build list page inherits the branch order instead of restating it. With the pages migrated, the remaining risk is the 74th page written the old way, and nothing would notice until a user sees "Something went wrong" where an upgrade prompt belonged. A gate fails a Build page that assembles the toolbar, state branch and pager itself rather than going through the surface.

**Blocked by:** 50 — Batch A. 51 — Batch B. 52 — Batch C. 53 — Batch D. 54 — Batch E.

**Status:** ready-for-agent

- [ ] A hand-assembled Build list page fails the gate
- [ ] The gate has a self-test constructing that page and failing without the check
- [ ] Pages legitimately outside the pattern are enumerated in a ratchet file that may only shrink
- [ ] The gate states what it scans and what it cannot see
- [ ] It is green on a settled tree, and that run is recorded
