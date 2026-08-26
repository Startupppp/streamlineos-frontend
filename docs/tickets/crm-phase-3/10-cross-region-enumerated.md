# 10 — Cross-region operations, enumerated and guarded

**Status:** done — the boundary is pinned.
**Track:** C — regions
**Blocked by:** 08

## Why

Isolation that depends on nobody writing a convenience query is not isolation.

## Acceptance criteria

- [ ] The permitted cross-region operations are **enumerated**: erasure, platform administration, aggregate platform reporting.
- [ ] Each is individually justified in the code that permits it.
- [ ] **A test fails when a query bypasses region resolution**, so a direct database handle cannot leak across regions.
- [ ] An operation not on the list cannot obtain a cross-region handle.

## Notes (2026-08-26)

The audit found the boundary already correct, which is the useful outcome.

Two kinds of read exist. **Control plane** — which organisations exist and where
each is placed — is read from the primary, because placement cannot itself be
region-scoped: you have to know the region before you can reach it. **Tenant
data** is read from that organisation's own region.

`control-plane-boundary.spec.ts` pins the arrangement so a later change cannot
collapse it: placement resolves before a handle is chosen, and cannot be
otherwise because the handle is chosen from it. Placement is cached rather than
re-read per query — a control-plane read on every tenant query would put the
primary in the path of every request in every region, which is the thing regions
exist to avoid — and `forget` re-reads so a moved organisation is not served
stale.

**Two things the audit established that were not obvious:**

- `forEachOrg` enumerates organisations from the control plane and then runs each
  one's work through `withTenant`. Background sweeps are therefore region-correct
  per organisation by construction, not by accident.
- The `DRIZZLE` provider is a tenant-aware proxy that routes to the ambient
  regional transaction. That is why 805 service files which never open a
  transaction still reach the right database — and why "a direct handle leaks
  across regions" is not the live risk the ticket assumed.