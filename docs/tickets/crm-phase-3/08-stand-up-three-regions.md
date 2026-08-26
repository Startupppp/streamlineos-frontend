# 08 — Stand up EU, US and India regions

**Status:** code half done — the seam claim holds; databases are infrastructure.
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

## Notes (2026-08-26)

**Phase 1's bet is validated.** `three-regions.spec.ts` configures three regions
the way a deployment would — environment variables and nothing else — and asserts
each tenant resolves to its own database and its own bucket. `withTenant` still
takes `(db, {orgId, audience}, fn)`: there is no region parameter, and adding two
regions did not introduce one. **No change below the seam was required.**

The registry was already populated from configuration; Phase 1 did that half. So
what remained here was the negative test, and it passes.

Four failure modes are pinned rather than assumed: a secondary configured without
a database raises instead of inheriting the primary's; a secondary does not
inherit the primary's flat storage variables; an unplaced organisation raises
rather than falling back; a placement this deployment does not serve is refused
by name. And a single-region deployment still needs no configuration it did not
need before.

**Not done: provisioning three databases.** That needs Neon credentials and is
infrastructure rather than code. The outage-isolation criterion needs them too.
The code half was the part in question, and it holds.