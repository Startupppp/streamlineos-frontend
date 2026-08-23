# 07 — Translate module key case in one place

**What to build:** One owner for the translation between the stored uppercase module keys and the lowercase catalog.

The enabled-modules projection stores module keys in one case and the catalog declares them in another. The module guard lowercases inline to compensate — a fix applied at one boundary for a mismatch that once broke module gates for **every non-owner across more than a dozen modules**, and showed up in the product as a locked tile on a module the organization had actually enabled.

A translation applied at whichever boundary happened to break is a translation waiting to be forgotten at the next one.

**Blocked by:** 02 — One registry declares what a module is.

**Status:** ready-for-agent

- [ ] One function owns the translation between the stored projection form and the registry identifier, and it round-trips.
- [ ] The module guard no longer lowercases inline.
- [ ] Every other site that compares a stored module key against a catalog key uses that function.
- [ ] A test asserts that the stored form of every module in the registry resolves back to that module — enumerated from the registry, not from a literal list.
- [ ] Stored values are unchanged. This is a reading concern, not a migration.
- [ ] Module gating behaviour is unchanged for owners and non-owners alike, proven by the existing guard-tier specs passing untouched.
