# 06: Make Build and Tasks projections bounded and deterministic

**What to build:** Return Build and Tasks commitments in stable chronological windows without unbounded reads or arbitrary truncation.

**Blocked by:** 03: Expand the Calendar projection contract.

**Status:** ready-for-agent

- [ ] Build due dates are ordered before the source limit is applied.
- [ ] Tasks filtering and limiting happen in storage rather than after an unbounded load.
- [ ] Both sources expose whether more authorized results exist and provide a continuation or narrower-window path.
- [ ] Moving or deleting a record removes it from the old window and places it correctly in the new one.
- [ ] Dense-source tests prove stable ordering and reachability beyond the first source page.

