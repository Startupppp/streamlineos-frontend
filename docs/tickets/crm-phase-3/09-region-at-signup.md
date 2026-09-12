# 09 — Region chosen at signup, immutable after

**Status:** done — placement from billing country, immutability guarded.
**Track:** C — regions
**Blocked by:** 08

## Why

Residency has to be a property of the tenant rather than a hope. A prospect who
discovers a compliance problem after migrating does not stay.

## Acceptance criteria

- [ ] Region is chosen at signup, defaulted from billing country, and shown **before** the tenant is created.
- [ ] A prospect can see where their data will rest before signing up.
- [ ] Region is **immutable** after creation. Moving a tenant is a supported but explicit offline operation, never a setting.
- [ ] A tenant's region is visible in support tooling, so an operator knows which database to look in before looking.

## Notes (2026-08-26)

Placement is decided once at creation from something the customer told us, not
inferred later from an IP address or a browser locale, which change with a
business trip.

An unmapped country falls to the default rather than failing — refusing to create
an organisation because its country is unmapped turns a signup into a support
ticket. The result carries `isMapped` and a **description in prose**, so the
customer is told "European Union (Ireland)" before they commit rather than "eu"
after. Country sets are explicit rather than a continent lookup: placement is a
commitment made in writing, and "somewhere in Asia" is not one.

Region was already immutable, but **only by absence**. That holds until somebody
adds an organisation settings form with every column on it — and a `region` field
there would silently repoint a live tenant at a database its data is not in,
after which every query returns an empty result indistinguishable from a deleted
record. An invariant now keeps the absence honest.

**The first version of that invariant did not work.** It required `region:` and
missed the shorthand `.set({ region })`, passing cheerfully when I injected a
mover to check. Fixed and re-verified. An invariant nobody has watched fail is a
comment; one that fails to fail is worse — it is a comment that looks like a
guarantee.

**Still open:** showing the placement during signup, which is ticket 13's surface.