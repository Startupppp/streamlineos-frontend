# 10 — Cross-region operations, enumerated and guarded

**Status:** not started
**Track:** C — regions
**Blocked by:** 08

## Why

Isolation that depends on nobody writing a convenience query is not isolation.

## Acceptance criteria

- [ ] The permitted cross-region operations are **enumerated**: erasure, platform administration, aggregate platform reporting.
- [ ] Each is individually justified in the code that permits it.
- [ ] **A test fails when a query bypasses region resolution**, so a direct database handle cannot leak across regions.
- [ ] An operation not on the list cannot obtain a cross-region handle.
