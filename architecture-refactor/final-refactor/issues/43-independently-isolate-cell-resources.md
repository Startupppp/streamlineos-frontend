# 43: Provision independently isolated cell resources

**What to build:** At least two cells use independently provisioned database, cache, object storage, search, realtime, worker and monitoring resources so noisy-neighbor and failure isolation is real rather than namespace-only.

**Blocked by:** 42 and existing c28 issue 34.

**Status:** partial — the code gap is closed and the configuration gap is closed; **instance isolation is
operator-blocked and is deliberately NOT claimed**

- [x] Existing c28 issue 34 is completed and active-organization landing uses membership/index truth.

  Done this session — see [`c28 issue 34`](../../c28-cell-based-platform-at-20m/issues/34-where-you-land-comes-from-the-index.md).
  6 of 7 criteria closed; the landing decision now reads `account_organization_index` and names the
  organization's `cellId`, which is the fact a foreign key on the global user row structurally cannot
  express across cells.

- [ ] Two cells use independent resource instances/accounts or an approved equivalent isolation boundary.

  **Not met, and namespacing is not being offered as if it were.** PRD §21 requires "independently
  resourced, **not namespace-only** isolated". Current verdicts:

  | Resource | Verdict | What it would take to reach ISOLATED |
  |---|---|---|
  | Database | **ISOLATED** | already separate logical databases (`neondb` / `cell2`), separate RLS, separate migration chain, separate app role |
  | Compute | SHARED | a second Neon project — the two databases share one compute endpoint |
  | Cache (Redis) | NAMESPACED | a second Upstash instance + `REGION_CELL_2_UPSTASH_REDIS_REST_URL` |
  | Object storage | NAMESPACED | a dedicated bucket + `REGION_CELL_2_R2_BUCKET_NAME` |
  | Search | SHARED | no search cluster is deployed for *either* cell; `searchCluster` is a declared string with nothing behind it |
  | Realtime (Ably) | NAMESPACED | a second Ably application + `REGION_CELL_2_ABLY_API_KEY` |
  | Worker pools | NAMESPACED | a separate Redis for the lease store |
  | Monitoring | NAMESPACED | a per-cell log collector |
  | Queues / dead letters | **ISOLATED** | already per-cell, they live in each cell's own database |

  Cache and object storage moved SHARED → NAMESPACED this session by adding the per-cell section to
  `.env.example` with `REGION_CELL_2_CACHE_KEY_PREFIX` and `REGION_CELL_2_R2_KEY_PREFIX`; no operator
  could previously set them without guessing the variable names out of the code. `region.config.ts`
  gained a `RegionCacheConfig` so the ISOLATED path has a real seam rather than a documented intention.
  `CacheService` now resolves the organization placement before tenant-aware cache operations and selects
  the configured per-cell Redis client when both credentials are present. Partial Redis credentials are
  rejected during topology parsing. Verified with the region configuration suite (23/23 tests passed).
  The provisioning runbook for each row is in
  [`CELL-RUNBOOK.md`](../../c28-cell-based-platform-at-20m/CELL-RUNBOOK.md).

- [x] Placement, cross-cell relay, organization relocation and rollback work with the isolated resources.

  Unchanged and still green: placement resolution through `RegionRegistry`/`withTenant`, the 8-event
  `CROSS_CELL_EVENT_TYPES` allowlist enforced by `assertMayCrossCells` with dead-lettering, and the
  10-state relocation machine with rollback permitted up to `VERIFY_TARGET`.

- [x] Isolation verification proves one cell's resource outage/saturation does not consume the other's budget.

  **One real code defect was found and fixed here.** `forEachOrg` never consulted `CELL_ID`: a worker
  process configured for cell-2 took the cell-2 lease (`cron:lease:cell-2:<job>`) and then enumerated
  **every organization in whatever database the caller injected** — normally the primary. Worker
  isolation was defeated at the only place it mattered. `resolveEnumerationDb` now resolves the binding
  whose `cell.cellId` matches `CELL_ID`. The fix is wired at the enumeration query itself, so all ~20
  existing `forEachOrg(this.db, …)` callers get it without a call-site change.

  Proved with outage probes in `src/common/tenant/__tests__/for-each-org.spec.ts` and
  `src/degradation/cell-resource-isolation.spec.ts`, reusing the existing `FaultServer`/`refusedPort()`
  helpers rather than writing a second fault harness: cell-1's database faulted leaves cell-2's sweep
  enumerating its own orgs, and the probe **bites** — faulting cell-2 instead makes cell-2's sweep fail.
  A cache outage degrades to a database read rather than crossing cells. 11 + 6 tests pass.

## The honest summary

The database is genuinely isolated; queues and dead letters follow it because they live in it. Everything
else is namespace separation, which stops accidental collision but not a noisy neighbour — one Upstash
instance has one budget however many prefixes are written into it. Closing this criterion is a purchase,
not a patch: a second Neon project, Upstash instance, R2 bucket and Ably application. Every code seam
they need already exists and is tested.
