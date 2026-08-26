# 08 — Stand up EU, US and India regions

**Status:** not started
**Track:** C — regions
**Blocked by:** — (can start immediately)

## Why

Phase 1 made region a tenant attribute from the first migration and routed every
storage access through a resolver, precisely so this would be a deployment
exercise rather than a rewrite. That claim is untested: `region.config.ts` knows
only `primary`.

**The acceptance test here is negative.**

## Acceptance criteria

- [ ] Three regional databases are provisioned and reachable.
- [ ] The registry is populated **from configuration**; adding a region requires no code change.
- [ ] **Standing up region two requires no change to `withTenant`, `resolveRegionalDb`, or any caller.**
- [ ] Where a change below the seam was required, it is recorded as a finding about Phase 1's placement rather than patched around.
- [ ] An outage in one region does not affect the others, demonstrated rather than asserted.
