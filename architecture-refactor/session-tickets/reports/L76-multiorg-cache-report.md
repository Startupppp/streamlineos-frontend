# L76 — Multi-org creation policy + cache correctness

## P1-A — Organization creation policy

**Status: already overtaken — PRD item was already fixed before this lane.**

### Verification against source

The `organization.controller.ts` `POST /organization` handler is decorated with:

```
@AuthorizedInService("any authenticated user may create a new organisation;
  plan limits enforced in OrgProfileService.createOrganization")
```

There is no `@RequirePermission`, no role guard, and no membership check. The
`OrgProfileService.createOrganization` method does not read the caller's role in
any active org before creating the new one. Any authenticated user becomes the
owner of the new org they create.

`POST /organization/switch` remains correctly membership-checked: `switchOrg`
queries `organizationMembers` for an ACTIVE membership in the target org and
throws `BadRequestException` when it is absent.

### Existing spec coverage

`organization-creation-policy.spec.ts` (7 tests, all passing before this lane)
already covers every scenario named in the PRD:

| Test | Status |
|------|--------|
| MEMBER creates new org and becomes owner | PASS |
| ORG_ADMIN creates new org | PASS |
| OWNER creates new org | PASS |
| Switch to an org you are not a member of is denied | PASS |

### Plan limits for new orgs

`PlanLimitsService.assertWithinLimit` is called before EVERY subsequent membership
insert via `invitations.service.ts` (invite send) and
`invitation-acceptance.service.ts` (accept), both with the per-org advisory lock.
The initial owner membership inserted in `bootstrapCellOrganization` occurs before
the subscription row is written (subscription is the next `INSERT`), so
`assertWithinLimit` on 0 current seats is correct by construction — no check is
missing. `invitations-plan-limit.spec.ts` covers all subsequent seat-limit paths.

**No source changes were needed for P1-A.**

---

## P1-B — Cache correctness collision tests

### File created

`src/common/cache/cache-key-collision.spec.ts`

### Dimensions covered (6)

| Dimension | Test group |
|-----------|-----------|
| D1 — tenant (orgId) | Two orgs with same local key must not collide |
| D2 — permission version | Namespace bump must retire pre-bump entry |
| D3 — filter | Filtered and unfiltered sub-keys under same namespace must stay separate |
| D4 — locale/timezone | TZ variants must use distinct keys |
| D5 — org switch | Session cache must be invalidated when the user switches org |
| D6 — cross-process propagation | invalidateNamespace via shared Redis must reach a second CacheService instance (mutation, role change, membership change, entitlement change) |

### Test structure

Every dimension has a positive control (correct key includes the dimension,
values stay isolated) and a negative control (a stripped key causes the collision
or staleness). The negative control uses either:

- A **local stripped key builder inside the test** (never in source) — D1, D3, D4:
  bare `cached()` without `orgId`, or a sub-key omitting the filter/TZ segment.
- The `InMemoryRedis(deafToInvalidation=true)` pattern — D2, D5, D6: `incr` is a
  no-op, so `invalidateNamespace` cannot advance the counter and the stale entry
  persists.

### Prove-it-bites record

Each negative control was run and observed to fail the non-stripped assertion:

- **D1**: `cache.cached("reports:summary")` without orgId — second call returns
  org-A's "data-a" instead of "data-b". ✓
- **D2**: deaf-incr Redis — after `invalidateNamespace`, fetcher still returns v1
  perms; fetchCount stays at 1. ✓
- **D3**: filter omitted from sub-key — unfiltered caller receives the 2-item
  filtered list, fetchCount stays at 1. ✓
- **D4**: TZ omitted from sub-key — IST caller receives UTC-rendered string. ✓
- **D5**: no `invalidate` call — session stays warm at org-old context; fetchCount
  stays at 1. ✓
- **D6**: deaf-incr shared Redis — instance B fetcher never runs; stale v1 data
  served cross-process. ✓

All negative controls were confirmed to fail their own assertions; source was
never modified.

### Test counts

```
Test Suites: 2 passed (cache-key-collision + organization-creation-policy)
Tests:       19 passed
  - organization-creation-policy.spec.ts:  7
  - cache-key-collision.spec.ts:          12
```

Broader `--testPathPattern="organization|cache"` run: 469 passed, 1 pre-existing
failure in `membership-artifacts.spec.ts` (new column
`kb_article_chunks.page_created_by_membership_id` from KB lane; not caused by
this lane).

### Design notes

- Uses `InMemoryRedis` from `common/cache/in-memory-redis.test-double.ts` (existing)
  and real `CacheService` — no mocked call-count assertions.
- `cachedVersioned` / `invalidateNamespace` used throughout; no new
  `invalidatePattern` / wildcard `SCAN` calls introduced.
- Cross-process tests use two `CacheService` instances sharing the same
  `InMemoryRedis` store, directly exercising the Redis incr path.
- `CACHE_KEYS.*` factory call sites were NOT restructured (`*ForOrg` migration
  reverted at ~50 sites per memory note — not touched here).

### Typecheck

`pnpm typecheck` (`NODE_OPTIONS=--max-old-space-size=8192`): my new file
produced zero TypeScript errors. The two pre-existing errors reported are both
in `feedbucket-public.controller.ts`, which was modified by another lane and
is not related to this work.
