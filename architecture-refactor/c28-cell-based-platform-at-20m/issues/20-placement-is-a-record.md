# 20 — Placement is a record, not a column

**What to build:** Where an organization lives becomes a first-class fact: its region, cell, database shard, object-storage region, search cluster, placement version, write fence and lease, with an explicit status. Every organization request resolves it, and an organization whose placement is unknown, stale or moving is refused rather than served from a guess.

This is the Phase 1 opener. Nothing moves; the deployment becomes cell `legacy-1` and the lookup that already exists gets deeper.

**Blocked by:** None — can start immediately

**Status:** done

**Grounding (2026-08-28, evidence not instruction — re-read at source):** the seam is already built and is explicitly a KEEP. `RegionRegistry.regionForOrg` (`backend/src/common/region/region-registry.ts:47`) already fails closed in both directions — an unplaced organization raises, and one placed in a region this deployment does not serve raises, *"a silent fallback is how one tenant's rows end up written into another region's database"*. `region.module.ts:44` reads placement from a single `organizations.region` column (`db/schema/common/auth.ts:19`) outside any tenant transaction, which is correct and stays. `withTenant` resolves the regional connection inside itself rather than at its three callers, deliberately, so a fourth caller cannot reach the wrong database. The PRD's mistake #19 warns against replacing this: *"replacing them would create competing placement truth instead of preventing a failure."*

## Acceptance criteria

- [x] An `organization_placement` record holds region, cell id, database shard, object-storage region, search cluster, placement version, write fence token, lease expiry and status (`ACTIVE` · `MOVING` · `READ_ONLY` · `FAILED`).

  `backend/src/db/schema/common/placement.ts` + migration `0608_organization_placement_and_lifecycle.sql`. All ten columns present; status is a real `pgEnum` (`organization_placement_status`). **No FK to `organizations`** — placement is reserved *before* the cell's organisation row exists, and once the control plane and the cell are separate databases the constraint cannot exist at all. Removal is explicit, via `unplaceOrganization`.

- [x] `RegionRegistry` resolves the full placement rather than a region string, keeping its existing fail-closed behaviour in both directions; there is no second registry.

  `region-registry.ts` gains `placementForOrg()` / `admittedPlacementForOrg()`; `regionForOrg()` is now the narrow read of the same record. The class was deepened in place — no second registry exists. Fail-closed is preserved *and extended to the cell*: a placement naming a cell this binding is not now raises too. Proof that behaviour is unchanged — the nine pre-existing suites pass **unmodified**:

  ```
  PASS src/common/region/region.config.spec.ts
  PASS src/common/region/region-registry.spec.ts
  PASS src/common/tenant/__tests__/with-tenant-region.spec.ts
  PASS src/modules/storage/storage-region.spec.ts
  ... 15 suites, 164 tests passed across common/region + common/tenant + storage-region
  ```

  The nine pre-existing suites were verified **untouched**, not merely passing: zero commits against them since the session began and a clean worktree for each. "Passes unchanged" is therefore true by provenance, not just by outcome.

- [x] The current production deployment is placed as cell `legacy-1` and behaves exactly as it does today.

  `LEGACY_CELL_ID = "legacy-1"` in `common/region/placement.ts`; `RegionCellConfig` defaults every region to it unless `REGION_<KEY>_CELL_ID` / `CELL_ID` says otherwise. Migration `0608` backfills one placement row per existing organisation at `legacy-1` from `COALESCE(organizations.region, 'primary')`.

- [x] `MOVING`, `READ_ONLY` and `FAILED` each have declared request behaviour, and an unknown placement is refused.

  `decidePlacement()` in `common/region/placement.ts` is the single declaration. `FAILED` refuses reads and writes; `MOVING` and `READ_ONLY` serve reads and refuse writes — during relocation the source cell stays authoritative until the flip, and stopping its reads would turn a migration into an outage. An expired fence lease refuses writes even while the status still reads `ACTIVE`. Unknown/unplaced raises from the registry. Twelve cases in `placement.spec.ts`, all passing (10 status/intent cases + 2 legacy-region normalisation cases).

- [x] The placement read stays outside the tenant transaction — it runs before one is opened, and routing it into a caller's transaction ties it to the wrong database the moment a second cell exists.

  `orgPlacementLookup` (`common/region/placement-lookup.ts`) keeps the original `runOutsideTenantContext` wrapper and its rationale comment, relocated verbatim from `region.module.ts`. `withTenant` resolves placement **before** `regional.transaction(...)` opens. Enforced mechanically by ticket 23's CI check, which lists all three call sites as allowlisted with that reason.

- [x] `organizations.region` is migrated into the placement record rather than duplicated; two sources of placement truth is the failure this ticket exists to prevent.

  **Routing now reads the placement record only.** `organizations.region` is no longer consulted by any routing path; it is still dual-*written* on create and is read solely to log a divergence (`placement-lookup.ts`, `"[region] placement diverges from the legacy region column"`). Dropping the column is deliberately deferred to Session 6 (ticket 28) so a rollback exists before a second cell has ever been exercised — decision recorded at session start. One source of routing truth; one legacy mirror scheduled for contraction.

## Follow-up: the statuses can now be written (2026-08-28)

A verifier pointed out that `MOVING`, `READ_ONLY` and `FAILED` had declared behaviour, enforcement and tests — but **no code path could ever set them**. The guard infrastructure was unreachable.

`OrganizationPlacementAdminService` (`core/lifecycle/`) closes that: `markMoving` / `markReadOnly` / `markFailed` / `markActive`, each a **conditional UPDATE on both the current status and the current `placementVersion`**, checking the affected-row count so two concurrent operators cannot both succeed. Every transition **bumps the version and rotates the write fence token** — which is precisely what makes every in-flight writer's fence check fail, and therefore how source writes stop before a relocation starts. Legal edges are declared as a map, not scattered `if`s. Each transition invalidates the registry via `forgetVersionsBelow(orgId, newVersion)`, which finally gives that method a production caller. 23 tests.

**No HTTP routes were added, deliberately.** The proposed surface took `orgId` from the **URL** and gated it on `settings:organization:manage` — but that key is granted to the `hr` role template, and every existing route in that controller reads `orgId` from the **token**. As proposed, an HR-role user in org A could have marked org B's placement `FAILED`, denying all writes to another tenant — the exact cross-tenant hole root `CLAUDE.md` §5 forbids. This codebase has no platform-admin guard to gate it correctly, so the operator surface belongs with ticket 29, which owns operator-driven relocation. The service is registered and ready; only the unsafe entry point is withheld.

## Findings

**Organization creation was broken by this seam before this ticket.** All three creation paths — `auth.service.ts:78`, `org-profile.service.ts:170`, `org-setup.service.ts:342` — opened a tenant transaction for an organisation that had no `organizations` row yet, so `regionForOrg` found no placement and raised. `with-tenant-region.spec.ts:77` ("refuses to open anything for an unplaced organisation") is the proof the refusal is real, and `RegionModule` is registered in `app.module.ts:106`, so `hasRegionRegistry()` is true in a booted app. Fixed by reserving placement *before* the transaction opens in all three paths, which is also what ticket 25's saga requires.

## Todo

- [x] Read `region-registry.ts`, `region.module.ts` and `with-tenant.ts` end to end before touching them.
- [x] The placement cache TTL is 10 minutes on the assumption placement is effectively immutable — the cache now knows that assumption ends. Every entry carries the `placementVersion` it was issued under, inside the signature, and that is verified on every read (live today). `forgetVersionsBelow(orgId, version)` drops a superseded entry ahead of its expiry — tested, but with **no production caller until ticket 28**, because nothing changes a placement version before relocation exists.
- [x] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md)

---

PRD: [`c28 — Organization-routed cells for 20M+ users`](../prd.md) · Candidate index: [`../README.md`](../README.md)
