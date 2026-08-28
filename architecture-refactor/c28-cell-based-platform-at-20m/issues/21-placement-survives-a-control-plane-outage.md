# 21 — A signed placement cache survives a control-plane outage

**What to build:** When the control plane is unreachable, organizations that are already placed keep working. Their sessions carry a signed, expiring placement that the cell verifies for itself; an organization the cache does not know about is refused rather than guessed at.

**Blocked by:** [20 — Placement is a record, not a column](20-placement-is-a-record.md)

**Status:** done

**Grounding (2026-08-28, evidence not instruction — re-read at source):** the PRD's dependency table is explicit for this row — control plane unavailable means *"serve valid signed placement cache; refuse unknown or stale placement"*, and product intent #4 requires existing organizations to keep working while the control plane is temporarily unavailable. `RegionRegistry` already caches placement for 10 minutes in process (`region-registry.ts:14`), which is the right shape and the wrong trust model: an in-process map cannot be verified after a restart and is not signed.

## Acceptance criteria

- [x] A resolved placement is signed with an expiry, and the cell verifies the signature rather than trusting the cache it came from.

  `common/region/placement-signature.ts`: HMAC-SHA256 over a canonical field list, token format `pl1.<kid>.<body>.<mac>`, compared with `timingSafeEqual`. `RegionRegistry.writeCache` signs every entry; `readCache` **verifies on every read** and treats an unverifiable entry as absent rather than as suspicious. `signedPlacementFor()` hands the token to a session; `acceptSignedPlacement()` verifies one without consulting the control plane.

- [x] A cached placement whose signature is valid and whose expiry has not passed serves traffic with the control plane down.

  `placement-degraded-control-plane.spec.ts` → *"keeps serving an organisation whose signed placement is cached and unexpired"*. The lookup is switched to a real dead socket mid-test; the cached org still resolves.

- [x] An organization with no cached placement is refused while the control plane is down — a fail-open here writes one tenant's rows into another cell.

  Same spec: `registry.placementForOrg("org-2")` rejects with `ControlPlaneUnavailableError` (503, `retryable: true`) while `org-1` is still served from cache. The registry separates *"the control plane says unplaced"* (permanent) from *"the control plane did not answer"* (retryable) — conflating them would make an outage look like a deletion.

- [x] An expired signed placement is refused, not renewed locally.

  *"refuses an expired cached placement instead of renewing it locally"* — clock advances 11 minutes past the 10-minute TTL, control plane is unreachable, the call rejects rather than extending the entry. `placement-signature.spec.ts` additionally pins that a token is rejected **exactly at** its expiry, not one tick later.

- [x] A placement version change invalidates the cached entry ahead of its expiry; the signature carries the version so a stale one is detectable rather than merely old.

  `placementVersion` is inside the signed canonical string, so editing it yields `BAD_SIGNATURE` rather than a silently-accepted downgrade (`placement-signature.spec.ts`, *"is rejected when the placement version in the body is edited"*). `forgetVersionsBelow(orgId, version)` drops a superseded entry ahead of expiry, and `acceptSignedPlacement` refuses a token whose version the cell has already superseded.

- [x] A degraded-control-plane test runs with the control plane genuinely unreachable, not mocked — the failure mode is a network one and a stubbed client will not reproduce it.

  Real `postgres-js` client → real `drizzle` → the real `orgPlacementLookup`, pointed at a port obtained by opening a TCP server and closing it, so nothing listens. No stub anywhere in the failure path.

  ```
  PASS src/common/region/placement-degraded-control-plane.spec.ts (7.875 s)
    a genuinely unreachable control plane
      √ really is a network failure, not a stub — the driver refuses the connection (90 ms)
      √ refuses an organisation with no cached placement rather than guessing a cell (43 ms)
      √ reports the outage as retryable, so a caller waits rather than failing over (75 ms)
      √ keeps serving an organisation whose signed placement is cached and unexpired (202 ms)
      √ refuses an expired cached placement instead of renewing it locally (539 ms)
    the signed cache entry
      √ is verified on every read, so a tampered entry is treated as absent (2 ms)
      √ hands out a token a cell can verify without the control plane (2 ms)
      √ refuses a token signed by a key this cell does not hold (30 ms)
      √ refuses a presented placement whose version the cell has already superseded (2 ms)
  Tests: 9 passed, 9 total
  ```

  **The first test earned its place.** It asserts the driver's real error code, and getting it to pass exposed that `postgres-js` builds its socket error in another realm — `instanceof Error` is **false** on it, so a `cause` walk guarded by `instanceof` silently returns nothing. A mocked client would have hidden that entirely.

## Todo

- [x] Signing key: **control-plane global with a key id in the payload** (`PLACEMENT_SIGNING_KEY` / `PLACEMENT_SIGNING_KEY_ID`, falling back to `BACKEND_JWT_SECRET` as `AI_CONFIRMATION_SECRET` already does). A relocating organisation's placement is issued by the control plane, not by either cell, so a per-cell key would leave a `MOVING` organisation's placement unverifiable in the target. `PLACEMENT_SIGNING_KEY_PREVIOUS` makes rotation a second key rather than a flag day, and is tested.
- [x] Kept the in-process cache and added signing and versioning to it. No network call was added to the hot path.
- [x] Ordering constraint holds: signed-cache TTL **10 min** < fence lease **24 h** (`FENCE_LEASE_MS`), renewed at 6 h remaining. A cached placement cannot outlive the write fence it implies.
- [x] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md)

---

PRD: [`c28 — Organization-routed cells for 20M+ users`](../prd.md) · Candidate index: [`../README.md`](../README.md)
