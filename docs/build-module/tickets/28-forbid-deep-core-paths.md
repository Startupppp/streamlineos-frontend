# 28 — Close the core surface against deep paths

**What to build:** The contract half of the restructure. A sibling Build submodule can no longer reach past the shared surface into a core internal by file path, so the seam established in ticket 01 stays real rather than decaying as new code is written. Until this lands, the surface is a convention; after it, it is enforced.

**Blocked by:** 25 — Group the ticket concept. 26 — Group roadmap, automation, work-query and project CRUD. 27 — Group the remaining concepts.

**Status:** ready-for-agent

- [ ] A gate fails when a sibling submodule imports a core internal by deep path
- [ ] The gate's self-test proves it resolves files and would fire, rather than passing vacuously
- [ ] The shared surface exports everything siblings legitimately need, so nothing is forced to violate the gate
- [ ] The gate runs on Windows paths correctly
