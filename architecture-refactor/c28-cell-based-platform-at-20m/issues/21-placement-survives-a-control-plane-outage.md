# 21 — A signed placement cache survives a control-plane outage

**What to build:** When the control plane is unreachable, organizations that are already placed keep working. Their sessions carry a signed, expiring placement that the cell verifies for itself; an organization the cache does not know about is refused rather than guessed at.

**Blocked by:** [20 — Placement is a record, not a column](20-placement-is-a-record.md)

**Status:** ready-for-agent

**Grounding (2026-08-28, evidence not instruction — re-read at source):** the PRD's dependency table is explicit for this row — control plane unavailable means *"serve valid signed placement cache; refuse unknown or stale placement"*, and product intent #4 requires existing organizations to keep working while the control plane is temporarily unavailable. `RegionRegistry` already caches placement for 10 minutes in process (`region-registry.ts:14`), which is the right shape and the wrong trust model: an in-process map cannot be verified after a restart and is not signed.

## Acceptance criteria

- [ ] A resolved placement is signed with an expiry, and the cell verifies the signature rather than trusting the cache it came from.
- [ ] A cached placement whose signature is valid and whose expiry has not passed serves traffic with the control plane down.
- [ ] An organization with no cached placement is refused while the control plane is down — a fail-open here writes one tenant's rows into another cell.
- [ ] An expired signed placement is refused, not renewed locally.
- [ ] A placement version change invalidates the cached entry ahead of its expiry; the signature carries the version so a stale one is detectable rather than merely old.
- [ ] A degraded-control-plane test runs with the control plane genuinely unreachable, not mocked — the failure mode is a network one and a stubbed client will not reproduce it.

## Todo

- [ ] Decide where the signing key lives before the format. A per-cell key and a global key have different failure modes during relocation.
- [ ] Keep the in-process cache; add the signature and versioning to it rather than replacing it with a network call on the hot path.
- [ ] The expiry has to be shorter than the fence lease in ticket 22, or a cached placement can outlive the write fence it implies.
- [ ] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md)

---

PRD: [`c28 — Organization-routed cells for 20M+ users`](../prd.md) · Candidate index: [`../README.md`](../README.md)
