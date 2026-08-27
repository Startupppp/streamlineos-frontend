# 20 — Placement is a record, not a column

**What to build:** Where an organization lives becomes a first-class fact: its region, cell, database shard, object-storage region, search cluster, placement version, write fence and lease, with an explicit status. Every organization request resolves it, and an organization whose placement is unknown, stale or moving is refused rather than served from a guess.

This is the Phase 1 opener. Nothing moves; the deployment becomes cell `legacy-1` and the lookup that already exists gets deeper.

**Blocked by:** None — can start immediately

**Status:** ready-for-agent

**Grounding (2026-08-28, evidence not instruction — re-read at source):** the seam is already built and is explicitly a KEEP. `RegionRegistry.regionForOrg` (`backend/src/common/region/region-registry.ts:47`) already fails closed in both directions — an unplaced organization raises, and one placed in a region this deployment does not serve raises, *"a silent fallback is how one tenant's rows end up written into another region's database"*. `region.module.ts:44` reads placement from a single `organizations.region` column (`db/schema/common/auth.ts:19`) outside any tenant transaction, which is correct and stays. `withTenant` resolves the regional connection inside itself rather than at its three callers, deliberately, so a fourth caller cannot reach the wrong database. The PRD's mistake #19 warns against replacing this: *"replacing them would create competing placement truth instead of preventing a failure."*

## Acceptance criteria

- [ ] An `organization_placement` record holds region, cell id, database shard, object-storage region, search cluster, placement version, write fence token, lease expiry and status (`ACTIVE` · `MOVING` · `READ_ONLY` · `FAILED`).
- [ ] `RegionRegistry` resolves the full placement rather than a region string, keeping its existing fail-closed behaviour in both directions; there is no second registry.
- [ ] The current production deployment is placed as cell `legacy-1` and behaves exactly as it does today.
- [ ] `MOVING`, `READ_ONLY` and `FAILED` each have declared request behaviour, and an unknown placement is refused.
- [ ] The placement read stays outside the tenant transaction — it runs before one is opened, and routing it into a caller's transaction ties it to the wrong database the moment a second cell exists.
- [ ] `organizations.region` is migrated into the placement record rather than duplicated; two sources of placement truth is the failure this ticket exists to prevent.

## Todo

- [ ] Read `region-registry.ts`, `region.module.ts` and `with-tenant.ts` end to end before touching them. The existing comments record why each decision is where it is, and those reasons still hold.
- [ ] Deepen the interface in one commit and change its callers in the next; the registry's cache and bootstrap check are load-bearing.
- [ ] The placement cache TTL is currently 10 minutes on the assumption placement is effectively immutable — that assumption ends at ticket 28 and the cache has to know it.
- [ ] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md)

---

PRD: [`c28 — Organization-routed cells for 20M+ users`](../prd.md) · Candidate index: [`../README.md`](../README.md)
