# 37: Remove proven frontend dead code

**What to build:** Confirmed unused files, exports and types are removed after feature decomposition without deleting extension points or side-effect dependencies.

**Blocked by:** 30, 31, 32 and 33.

**Status:** ready-for-agent

- [ ] Module-graph tooling and public-contract review confirm each removal.
- [ ] The four reported files and reported exports/types are removed or explicitly retained with reason.
- [ ] No schema or deliberate holding file is deleted from Knip evidence alone.
- [ ] Knip, typecheck and production build pass after removals.
