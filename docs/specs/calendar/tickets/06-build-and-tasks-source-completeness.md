# 06: Make Build and Tasks projections bounded and deterministic

**What to build:** Return Build and Tasks commitments in stable chronological windows without unbounded reads or arbitrary truncation.

**Blocked by:** 03: Expand the Calendar projection contract.

**Status:** accepted

- [x] Build due dates are ordered before the source limit is applied.
- [x] Tasks filtering and limiting happen in storage rather than after an unbounded load.
- [x] Both sources expose whether more authorized results exist and provide a continuation or narrower-window path.
- [x] Moving or deleting a record removes it from the old window and places it correctly in the new one.
- [x] Dense-source tests prove stable ordering and reachability beyond the first source page.

