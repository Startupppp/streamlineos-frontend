# 08 — Stand up EU, US and India regions

**Status:** code done and now actually guarded; **remaining work is provisioning
three Neon databases and three R2 buckets, which needs credentials this repo does
not hold.** Two acceptance criteria — "three regional databases are provisioned
and reachable" and "an outage in one region does not affect the others,
demonstrated rather than asserted" — cannot be closed from code and are the only
things left. The runbook below is the handover for whoever has the credentials.
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
- [x] The registry is populated **from configuration**; adding a region requires no code change. *(Serving one does. Placing signups into it by country does not — see finding 3.)*
- [x] **Standing up region two requires no change to `withTenant`, `resolveRegionalDb`, or any caller.**
- [x] Where a change below the seam was required, it is recorded as a finding about Phase 1's placement rather than patched around.
- [ ] An outage in one region does not affect the others, demonstrated rather than asserted. *(Structurally true for a secondary, false for the primary — see finding 4.)*

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

## Notes (2026-08-27) — the negative test could not fail

The conclusion above was right. The evidence for it was not.

**`three-regions.spec.ts` never imported `withTenant`.** It asserted against
`RegionRegistry` directly and left the claim about the tenant transaction path in
a comment — "`withTenant`'s signature is (db, {orgId, audience}, fn)" was prose,
not an assertion. Two breaks were applied to check:

| Break | Old spec | Now |
|---|---|---|
| `resolveRegionalDb` reduced to `return db` — every tenant served from the primary | **passed, 11/11** | fails, 3 tests |
| `withTenant` given a required `region` in its context — every caller must name one | **passed, 11/11** | fails, 1 test |

The first break is the single failure the whole seam exists to prevent: one
tenant's rows written into another region's database. A guard that stays green
through it is not evidence.

Both are now caught, and the fix was to make the file do what it claimed:
`three-regions.spec.ts` drives the **real** `withTenant` across three configured
regions and asserts which handle each transaction opened on. The signature half
is read from the source of `with-tenant.ts`, because it cannot be reached at
runtime — **ts-jest runs with `isolatedModules: true` and never type-checks**, so
no test in this repo fails on a type change. `tsc --noEmit` does catch it (31
errors across 14 files, measured), but a typecheck failing somewhere else is not
this ticket's evidence.

`with-tenant-region.spec.ts` did already cover the behavioural half against two
regions, and it caught the first break. It was doing the work this ticket was
taking credit for.

### 2. `db:migrate:regions` migrated every secondary as the wrong role

`env.validation.ts` refuses to boot production when `APP_DATABASE_URL` equals
`DATABASE_URL`: they are the application role and the owner role, and the
application role is deliberately RLS-enforced and without `BYPASSRLS`.

`migrate-all-regions.mjs` honoured that for the primary — it read `DATABASE_URL`,
the owner — and inverted it for every secondary, reading
`REGION_<KEY>_APP_DATABASE_URL` first. So `pnpm db:migrate:regions` ran DDL
through the RLS-enforced role in every region but the primary. Either it is
refused on privileges, or it succeeds because the app role was given owner
privileges to make it work — and the second outcome silently disables every
tenant isolation policy in that region.

Owner candidates now come first everywhere. A region with only one role still
migrates, and says so on the way past rather than being assumed.

### 3. A configured-but-unlisted region was skipped by a run that reported success

`REGION_KEYS` is the whole list; a per-region URL on its own configures nothing —
in `region.config.ts` and in the migration runner alike. Setting
`REGION_EU_APP_DATABASE_URL` and forgetting `REGION_KEYS` used to migrate the
primary, print `All 1 region(s) migrated` and exit 0. It now exits 1 and names
the region. This was the one outcome the script exists to make impossible.

### 4. Two findings that qualify the criteria rather than fail them

**Placement into a new region is a code change, even though serving one is not.**
`PLACEMENT_REGIONS` in `region-placement.ts` is the literal `["eu", "us",
"india"]`, and `regionForCountry` maps countries only onto those three. A fourth
region can be configured, migrated and served without touching code, but
`regionForNewOrg` will never choose it: an unserved placement falls back to
`registry.primary`. Reachable, never chosen. The ticket's "adding a region
requires no code change" is true of the registry and false of placement.

**Outage isolation is asymmetric, by design.** Each region gets its own pool and
postgres.js connects lazily, so a dead secondary neither blocks boot nor touches
another region. But placement is read from the primary —
`orgRegionLookup(primaryDb)` in `region.module.ts`, deliberately, and pinned by
`control-plane-boundary.spec.ts`: you have to know the region before you can
reach it, so the lookup cannot itself be region-scoped. A **primary** outage
therefore stops resolution for every region once the 10-minute
`CACHE_TTL_MS` entries expire. "An outage in one region does not affect the
others" holds for a secondary and not for the primary, and that is a property of
having a control plane at all, not a defect to patch.

### 5. Erasure across regions (ticket 17) does not silently skip, but is unwired

`subject-request.ts` was checked against the question asked of it. It does not
silently skip: an unreachable region throws inside `run()`, is recorded as
`failed` rather than dropped, and forces `complete: false`; an empty enumeration
raises rather than reporting success; and `mayReportComplete` refuses when a
configured region was never visited, which is the "a region was added and the
enumeration was not updated" case. All four are tested.

What is missing is a caller. Nothing in `src/` imports it, and nothing feeds it
`getRegionRegistry().keys` — so `mayReportComplete`'s configured-region list is
whatever a future caller passes, and a hardcoded `["india", "eu", "us"]` there
would defeat the one check that catches a newly added region. The logic is sound
and unprotected by anything downstream of it. Left alone rather than wired,
because that wiring is tickets 17/18's remaining work, not this one's.

## Runbook — adding a region to a running deployment

Worked for `eu`. The environment-variable key is the region key uppercased with
dashes replaced by underscores (`ap-south` → `REGION_AP_SOUTH_*`).

### Variables

| Variable | Required | What it is |
|---|---|---|
| `REGION_KEYS` | yes | The whole list, e.g. `india,eu,us`. The primary is prepended if missing. **A per-region URL alone configures nothing.** |
| `PRIMARY_REGION` | — | Defaults to `primary`. Must equal the value already on `organizations.region`; `DEFAULT_REGION` is `primary`. |
| `REGION_EU_APP_DATABASE_URL` | yes | Runtime connection, the RLS-enforced application role. |
| `REGION_EU_DATABASE_URL` | strongly | Owner connection, used by `db:migrate:regions` for DDL. Also the runtime fallback if the `APP_` one is unset. |
| `REGION_EU_R2_BUCKET_NAME`, `_R2_KB_BUCKET_NAME`, `_R2_ENDPOINT`, `_R2_ACCESS_KEY_ID`, `_R2_SECRET_ACCESS_KEY`, `_R2_PUBLIC_URL`, `_R2_KB_PUBLIC_URL` | yes | Storage. `_R2_REGION` defaults to `auto`. |

**A secondary inherits nothing flat.** Only the primary falls back to bare
`DATABASE_URL` / `R2_*`, so that a single-region deployment needs no
configuration it did not already need.

### Order of operations

1. **Provision the database and both roles.** `pnpm db:bootstrap-role` creates
   the non-`BYPASSRLS` application role; it reads the flat variables, so point it
   at the new region.
2. **Create the buckets.** `pnpm setup:r2` reads only flat `R2_*`
   (`setup-r2-buckets.ts`) — **it is not region-aware.** Run it with the new
   region's values exported, or create the buckets by hand.
3. **Set every `REGION_EU_*` variable, then add `eu` to `REGION_KEYS`.** In that
   order: `REGION_KEYS` is what makes the region real to both the app and the
   migrator.
4. **Migrate, before the app boots with the new `REGION_KEYS`.**
   `pnpm db:migrate:regions` must exit 0. It reports per region and exits 1 if any
   one of them did not migrate, so a partial rollout cannot read as success.
5. **Restart the application.**
6. **Verify** (below).

### What to check afterwards

- Boot log: `Regions ready — india, eu, us (primary: india)`. `RegionModule`
  refuses to start with zero regions.
- `pnpm db:migrate:regions` → `All 3 region(s) migrated.`
- `pnpm db:migrate:regions:self-test` → exit 0. Exercises the selection rules
  against fixtures; touches no database.
- `pnpm db:verify-rls` against the new region — the point of the separate
  application role is that RLS actually bites there.
- Place a test organisation in `eu` and open any tenant request for it. No caller
  names a region; `withTenant` resolves from the organisation alone.

### What breaks if a step is skipped

| Skipped | Symptom |
|---|---|
| `eu` not added to `REGION_KEYS` | App and migrator both ignore the region entirely. `db:migrate:regions` now exits 1 and names it; before this ticket it printed `All 1 region(s) migrated`. |
| `REGION_EU_APP_DATABASE_URL` unset | App does not boot — `resolveRegionTopology` throws `region "eu" has no database`. Fail-fast, intended. |
| Storage variables unset | **Not fail-fast.** `storage.bucket` is `undefined` and the first upload by a `eu` tenant fails at runtime. The database is validated at boot and storage is not — know this before trusting a clean startup. |
| `REGION_EU_DATABASE_URL` unset | Migrations fall back to the application role and warn. DDL is refused, or it succeeds because that role was over-privileged — which disables RLS in that region. |
| Migrating after boot instead of before | The app serves a region with no tables; the first organisation placed in `eu` fails on its first write. |
| Primary region taken down | Not isolated — see finding 4. Placement resolution stops for every region once the 10-minute cache expires. |

### Still open

Provisioning the three Neon databases and their buckets, and then demonstrating
outage isolation against them. Both need credentials. Everything reachable from
code is done, and — unlike before — the guards fail when the seam is cut.
