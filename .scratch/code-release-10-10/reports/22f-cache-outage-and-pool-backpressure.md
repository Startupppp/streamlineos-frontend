# 22f — Ticket 23 boxes 4 and 7: the fixable structural halves, implemented

**Session: 2026-09-03. Backend commits `1ffac8fe`, `a94e64b3`, `e1a016ef`, `baf88d27`, `7a6c1b7e`,
`d4650152`, all in `streamlineos-backend` on `main`.**

Worklist was the per-clause verdicts in `22e-derived-critical-set-and-structural-clauses.md` §6.
Every claim below was re-read at source before acting; two of 22e's findings needed correcting and
are corrected here.

## 0. NO BENCHMARK WAS RUN, AND NO `measured*` FIELD WAS TOUCHED

~5 agents are live. Every number in this report is either a **deterministic counter** (fetcher
calls, Redis GETs, DB statements, census counts) or a **structural consequence** of a declared
constant. The two millisecond figures in §1 are poll-count consequences of `FILL_POLL_MS = 50`,
not timings — 40 polls versus ~1. No latency, p50/p95/p99, throughput or wall-clock figure was
recorded, and `measuredLatencyP95Ms` / `measuredBufferBlocks` were not read or written.

## 1. Ranked by consequence, not by list order

The brief asked for a ranking and a reason. An outbound call with no deadline and an unbounded
pool wait queue are **availability defects: they convert a dependency's bad day into a total
outage of ours, with no ceiling and no signal**. Jitter and the fill-lease pathology are stampede
defects — they make a bad minute worse, but the system still answers. SWR is an optimisation with
no safe default. So:

| # | defect | class | done |
|---|---|---|---|
| 1 | VirusTotal: three bare `fetch`, no timeout at all | availability | **fixed** |
| 2 | Composio: ~180 s effective per SDK call | availability | **fixed** |
| 3 | Pool: unbounded FIFO, waits forever | availability | **fixed** |
| 4 | Cache outage: 100% of reads hit the database | availability | **fixed** |
| 5 | Fill lease worse than no lease on a null key | stampede + latency | **fixed** |
| 6 | TTL jitter absent on 183 of 213 call sites | stampede | **fixed** |
| 7 | Admission: URI version prefix defeats reserved class | availability | **fixed** |
| 8 | Rate limiting opt-in | question | **answered + enforced** |
| 9 | stale-while-revalidate absent | optimisation | **NOT DONE — needs an owner** |

---

## 2. Box 7 — provider timeouts. One correction to 22e.

**VirusTotal — 22e is right.** `virustotal-av-scanner.ts:49, 67, 85` were three bare `fetch` calls
with `headers` only. Node's `fetch` has **no default request timeout**, so a VirusTotal endpoint
that accepted the socket and stopped writing held the upload request until the socket died. `:67`
streams a whole file body. The scanner is fail-closed, so this blocked an upload indefinitely.
All three now go through `vtFetch`, which takes the deadline as a **required argument** — 10 s
report / 60 s upload / 10 s analysis — so a fourth endpoint cannot be added with a bare `fetch`.

**Composio — 22e is overstated, and the real number matters.** "NO timeout at all" is not what the
code does. `ComposioConfig` (`@composio/core` 0.14.0) exposes **no timeout key** — confirmed by
reading the type at `composio-6C8kHtqc.d.mts:5326` — and `index.mjs:8023` constructs
`new ComposioClient({ apiKey, baseURL, defaultHeaders, logLevel })`, passing none. But the client
it builds is `@composio/client` 0.1.0-alpha.75, whose `client.mjs:525` sets
`DEFAULT_TIMEOUT = 60000` and `:121` `maxRetries = 2`. So the true exposure was **~180 s plus
retry backoff per SDK call** — bounded, but far past the 30 s `statement_timeout` bounding the
transaction around it, and this is the mail path.

The per-call `ComposioRequestOptions` is `{ signal?: AbortSignal }` and nothing else; that is the
only lever the SDK offers. All **7** SDK calls (`connectedAccounts.link/get/list/delete`,
`toolkits.get`, `tools.proxyExecute`, `tools.execute`) now pass a fresh 15 s deadline.

**Bite-proved** (`git archive HEAD src …` into a temp tree, never the shared working tree). Against
the pre-fix source: **exit 1, 5 failed / 1 passed**, and the Composio source scan listed **9**
undeadlined SDK call sites. Against the fixed source: **exit 0, 25 passed**.

**Not fixed:** the outbound concurrency cap is still absent (`webhooks-dispatch.service.ts:107`
`void this.run(...)`, `:124-126` `Promise.allSettled` over an unlimited `findMany`).
**Owner: webhooks owner.**

## 3. Box 7 — the connection pool. Backpressure, defined.

22e's reading is confirmed: postgres-js has no acquire or queue timeout, its option parser has no
such key, and its pool handler ends `busy.length ? go(busy.shift(), query) : queries.push(query)` —
an unbounded FIFO that only `end()`/`destroy()` ever rejects. `pool-telemetry.ts:221-229` already
logs "Database pool saturated"; **logging is not shedding**.

### What backpressure means here

**The gate sits in front of the driver, not around it.** This is the load-bearing decision. The
obvious implementation — race `sql.begin()` against a timer — sheds the caller and *still runs the
query later*, because abandoning the promise does not remove it from the driver's queue. On a write
that is a phantom write: the caller is told 503 and the row is written anyway. So a caller shed by
this gate has **never been handed to postgres-js** and executes no statement.

`src/db/pool-admission.ts`, acquired inside `withPoolBorrow` (the single seam every `withTenant`
already passes through):

| knob | default | env |
|---|---|---|
| `maxConcurrent` | the pool's own `max` (20 pooled / 10 direct / 5 dev) | — |
| `maxQueueDepth` | `4 × max` | `DB_POOL_QUEUE_DEPTH` |
| `acquireTimeoutMs` | 5 000 (under the 30 s `statement_timeout`) | `DB_POOL_ACQUIRE_TIMEOUT_MS` |
| enabled | true | `DB_POOL_ADMISSION_ENABLED=false` restores the unbounded wait |

Refusal is `503` + `retryAfterMs`, matching admission's shape. Capacity is **per lane** because
`region.module.ts:47` opens one pool per secondary region with the same `poolOptions`, so a single
global counter sized at one pool's `max` would under-admit by the region count. The released slot is
**handed to the next waiter** rather than decremented and re-taken, so an arriving request cannot
jump a queued one. The gate is **inert until configured**, and it is configured exactly where the
pool is built (`drizzle.module.ts:33`), so unit tests and scripts with no pool are never gated.

**Bite-proved, two shapes, both in a temp tree:**

| bite | result |
|---|---|
| the gate never sheds (restore the unbounded wait) | **exit 1**, 5 of 10 fail |
| shed *after* the body runs instead of before | **exit 1**, exactly 1 fails — "never runs the transaction body for a shed caller" |

The second is the precise one: only the phantom-statement property breaks, and it breaks alone.

**Known limit, stated:** anything that reaches the database *without* `withTenant` bypasses the gate
(migrations, health probes). That is unchanged from before and is not a regression.

## 4. Box 4 — the cache. Three clauses fixed, one left.

### 4.1 The outage clause — measured with Redis unavailable, not merely cold

22e is confirmed. Four degraded returns in `loadOrFetch` were bare `fetcher()`, and `inFlight`
deletes on settle, so it coalesced only requests overlapping **in time**. Sequential traffic hit the
database on every request.

Measured against a Redis whose every command rejects `ECONNREFUSED` (and separately against
`redis: null`, the never-configured case):

| | before | after |
|---|---|---|
| 20 sequential requests for one key | **20 database calls** | **1** |

A degraded fill retains its settled promise in `inFlight` for **1 s** instead of deleting it.
Process-local, never shared, armed **only** when Redis could not answer — the healthy path still
deletes on settle, because there Redis is the single source and an invalidation must bite at once.
One second against a smallest declared TTL of **30 s** (`CACHE_TTL.SHORT`) means it can never
extend an entry beyond what the same call site already accepts from the shared cache. Expiry is by
front-sweep, not a timer per key: the window is constant so insertion order is expiry order, giving
amortised O(1), with a hard cap of 2 000 keys because the retained values can be large.

### 4.2 How this interacts with permission caching — stated explicitly

`degradation/redis.spec.ts` pinned **"calls the fetcher on every miss when Redis is dead — no stale
value served"**, for every key. That is a real invariant and I did not overrule it. It is **kept
where it was earned and narrowed elsewhere**:

- **An authorization-scoped key is never memoised at all.** `CacheService.AUTHZ_KEY_MARKERS` —
  `user:session:`, `membership:`, `access:`, `rbac:`, `mfa:`, `revoked:`, `perms:`, `permission`,
  `entitlement`. **Substrings, not prefixes**: `cachedForOrg` prepends the tenant and a region cell
  before it, so `access:perms:<user>:v<n>` arrives as `<cell>:<org>:access:perms:…` and a prefix
  test would miss every one. Asserted in both spellings, and **derived from `CACHE_KEYS`** in the
  spec, so a renamed key factory that stops matching a marker fails there rather than silently
  becoming memoisable.
- **Two authorization paths were already immune by construction** — now stated rather than assumed.
  `revoked:session:<id>` is read with a raw `redis.get` in `jwt-auth.guard.ts:106`, never through
  this fill path, and it already falls back to the database on a Redis error. The permission cache
  key carries the **access version** (`access:perms:<userId>:v<version>`), and the version is read
  through `accessVersionChannel` which falls through to `accessVersions.findFirst` when Redis is
  down — so a `bumpPermissionsVersion` produces a **different key**, which no memo can answer.
- **A `null` is never retained**, preserving the negative-caching pin exactly: a denial re-queries
  every request, so a fresh grant takes effect immediately.
- **An explicit `invalidate` drops the memo** *before* the `!redis` early return, so it bites during
  the outage too.

Residual, honestly: during an outage an ordinary read may be up to 1 s stale on an instance that did
not itself perform the invalidation. The alternative during an outage is not a fresher answer — it
is no cache at all and the entire read volume on the database.

**Bite-proved:** removing the exclusion fails **10 tests**, all of them the authorization ones.

### 4.3 The fill lease was worse than no lease — fixed

The waiter polled only the value key, so it could not distinguish "the leader has not written yet"
from "the leader finished and the answer is null" — and a null is never cached, so the second case
never resolved. It also meant a crashed leader held every waiter for the full window.

| | before | after |
|---|---|---|
| follower on a null-valued hot key | **2,045 ms**, 40 GETs, then the DB query anyway | **61 ms**, ≤ 6 GETs, then the DB query |

The waiter now also reads the lease, whose absence means no fill is coming. The extra GET is paid
only on a poll that found no value, replacing up to 39 pointless ones. The leader also **no longer
writes a `null`** at all, since the read treats one as a miss by design.

### 4.4 TTL jitter — fixed on all 213 sites

`applyJitter` reached only `cachedForOrg` and `cachedVersionedForOrg` (30 sites). It now applies in
`resolveTtl`, where the TTL is resolved for the write — the one place no caller can bypass — so
`cached` (88) and `cachedVersioned` (95), the path §6 names as canonical, are covered. The two
ForOrg sites no longer double-jitter. A caller-supplied TTL function jitters **inside its own bound**
so a declared `maxTtl` still holds (proved).

**Bite-proved:** the whole spec against the pre-fix service is **exit 1, 9 failed / 2 passed**.

### 4.5 Stale-while-revalidate — NOT DONE, and why

Unlike the three above, SWR has **no safe default**. It works by lengthening an entry's life past
its TTL, which is exactly what §6 forbids for an authorization answer, so it can only ship opt-in —
and choosing which of 213 call sites opt in is a per-site product judgement I do not own. Shipping
the mechanism with no call site using it would be a speculative abstraction (§1.9). **Owner: cache
owner.** The shape that fits this codebase without changing the stored value: a companion
`<key>:fresh` marker read alongside the value in one `MGET`, with the hard TTL set to
`ttl + staleWindow`; the marker's absence means "serve stale and refresh under the existing lease".

## 5. Box 7 — the two questions 22e left open

### 5.1 The URI version prefix — DETERMINED (22e said "not determinable from source")

`main.ts:85-87` enables `VersioningType.URI`, so `@Controller("auth")` serves both `/auth/login` and
`/v1/auth/login`, and `normalisePath` classified the second as `ordinary-write`.

**The frontend does not reach it.** `NEXT_PUBLIC_API_URL` in `frontend/.env` and `.env.example`
carries **no path segment**, and `frontend/lib/api-client.ts:254` is
`` const url = `${BACKEND_API_URL}${path}` `` over unversioned paths. Every `/v1/` in that repo is
either a literal controller prefix (`agent/v1`, `portal/v1` — **second** segments, so unaffected by
the fix) or `checkout.razorpay.com/v1/`.

It remains reachable by any direct API consumer, which is what the OpenAPI document advertises, so
it is fixed: `normalisePath` strips a leading version segment **after** normalisation (so traversal
resolves first) and **only** for versions `API_VERSIONS` declares (so a controller whose first
segment starts with `v` is untouched). **Bite-proved: exit 1, 8 failures on the pre-fix classifier,
with the pre-existing 48 assertions still passing.**

**Still unfixed in this box:** `admission.service.ts:30-33` returns admitted before the per-org
check, so one tenant can hold all 400 reserved slots. Narrowing it is a capacity decision.
**Owner: platform/admission owner.**

### 5.2 Opt-in rate limiting — ANSWERED: deliberate, and now enforced

It is deliberate, and promoting `RateLimitGuard` to `APP_GUARD` would change **nothing on its own**:
`rate-limit.guard.ts:27` is `if (!tier) return true`, so it is a no-op wherever a route has not
opted in. Ambient limiting requires a **default tier for ~3,500 handlers**, which is a capacity
decision, not a wiring one. Backend §4 asks for limits on "abusable flows (signup, purchase)" and on
login — a *targeted* instruction — and the ambient layer in this system is admission control, which
**is** an `APP_GUARD` (`app.module.ts:207`).

What targeting lacked was any way to notice a flow that never opted in. The failure is silent, and
the TIERS table's own comments record it biting twice (SEC-004; the three
`INTERNAL_API_SECRET` routes). So the invariant is now pinned: **an unauthenticated write with no
limiter of any kind fails `rate-limit-coverage.spec.ts`.** Both mechanisms count — the
`@UseRateLimit` decorator and an inline `RateLimitService.check` naming a declared tier — because
the codebase genuinely uses all of `@UseRateLimit`, a direct `this.rateLimit.check(...)`, and a
per-controller `enforceRateLimit` wrapper. (My first two censuses were wrong for exactly this
reason and were discarded.)

**Census: 31 `@Public()` write handlers, 27 limited, 4 not.** Named with owners rather than
exempted, so the count cannot grow silently:

| route | why it is a gap | owner |
|---|---|---|
| `POST /internal/audit` | the **fourth** `INTERNAL_API_SECRET` route. TIERS records that the other three were limited precisely because a leaked shared secret was otherwise unbounded; this one was missed, so a leaked secret floods the audit log | audit/platform |
| `POST /careers/apply` | `"public:job-apply"` is **declared at 3/hour and wired to nothing** | careers |
| `POST /csat/:surveyId/responses` | the sibling CSAT controller is limited by `support:csat-submit`; this second one is not | csat |
| `POST /crm/mailboxes/push` | every comparable inbound webhook is limited (`webhook:email` 600/60, `billing:webhook` 600/60, `support:inbound-email` 120/60) | crm ingress |

**Three tiers name no route** (the mirror-image defect — a table that reads as though a limiter is
wired):

- **`auth:login` — there is no `POST /auth/login` in this repository.** The only credentials
  provider is a magic-link token (`frontend/lib/auth.ts:28`) verified at `POST /auth/magic-link/verify`,
  limited by `auth:magic-link-verify` (60/60) with issuance at `auth:magic-link` (3/60); Google is
  `auth:google` (10/60). §4's "rate limiting on login" is met by that pair, **not** by this entry.
  **DO NOT DELETE IT:** `src/scripts/check-log-secrets.mjs:279` asserts the key exists.
- `sign:bulk-send-create` — no `src/modules/sign` exists here.
- `ai:vision` — no route references it.

**Bite-proved, three shapes:** a new unlimited `@Public()` write → exit 1 naming it; promoting
`RateLimitGuard` to `APP_GUARD` → exit 1 on the recorded-decision assertion; a named gap whose
location no longer exists → exit 1 on the stale-entry assertion.

---

## 6. Commands, exit codes, numbers

| command | exit | number |
|---|---|---|
| `pnpm typecheck` (`tsc --noEmit -p tsconfig.build.json`, 8 GB heap) | **0** | run twice, mid-work and final |
| `pnpm check:spec-typecheck` | **0** | "spec-inclusive typecheck passed" |
| `pnpm check:cache-key-shapes` | **0** | — |
| `pnpm check:type-assertions` | **0** | — |
| `pnpm check:route-classification` | **0** | — |
| `pnpm check:cache-invalidation` | **1** | **PRE-EXISTING, NOT MINE** — see §7 |
| focused jest, cache + admission + ratelimit + security + http + outbound + db + tenant + degradation + health + integrations + access + auth | **0** | **138 suites, 1,535 passed, 18 skipped** |
| bite: new specs vs pre-fix outbound source | **1** | 5 failed / 1 passed; 9 undeadlined Composio calls |
| bite: pool gate neutered | **1** | 5 of 10 fail |
| bite: pool shed moved after the body | **1** | exactly 1 fails — the phantom-statement test |
| bite: cache spec vs pre-fix service | **1** | 9 failed / 2 passed; **20 DB calls** for 20 requests; follower **2,045 ms** |
| bite: authorization exclusion removed | **1** | **10** failed, all authorization keys |
| bite: version-prefix spec vs pre-fix classifier | **1** | 8 failed, 48 pre-existing still passing |
| bite: new unlimited `@Public()` write | **1** | names `platform.controller.ts:38` |
| bite: `RateLimitGuard` promoted to `APP_GUARD` | **1** | recorded-decision assertion |
| bite: stale named gap | **1** | 2 assertions fire |

**Not run:** `pnpm lint`, `pnpm test:e2e`, `pnpm test:e2e:seeded`, `madge --circular`,
`check:route-budgets`, `check:benchmark-manifest`, any database or Redis benchmark. Say "not run",
not "passing". No `psql` was executed at all this session.

## 7. Cross-territory findings I did not fix

1. **`pnpm check:cache-invalidation` is RED and it is not mine.** 1 MEDIUM,
   `src/modules/access/entitlements.service.ts:setModuleEnabled` — does not invalidate `userSession`
   for every ACTIVE org member. **Verified pre-existing**: the identical single finding, exit 1, at
   commit `a94e64b3`, before any cache edit of mine. **Owner: access/entitlements owner.**
2. **Four unauthenticated writes with no rate limit** — §5.2, one owner each.
3. **`auth:login` is a stale tier that makes the table read as though a login limiter is wired**;
   it must not be deleted because a gate script depends on it. **Owner: auth owner.**
4. **`admission.service.ts:30-33`** — reserved classes bypass the per-org cap. **Owner: admission owner.**
5. **No outbound concurrency cap**; `webhooks-dispatch.service.ts:107` is a detached
   `void this.run(...)` over an unlimited `findMany`. **Owner: webhooks owner.**
6. **`CronLeaseService` fails open and the lease TTL is not a deadline on `fn`.** Untouched.
   **Owner: cron/worker owner.**
7. **stale-while-revalidate** — §4.5. **Owner: cache owner.**

## 8. Files changed (backend only)

```
src/common/security/virustotal-av-scanner.ts
src/common/security/virustotal-timeout.spec.ts            (new)
src/modules/integrations/core/composio.gateway.ts
src/modules/integrations/core/composio-timeout.spec.ts    (new)
src/db/pool-admission.ts                                  (new)
src/db/__tests__/pool-admission.spec.ts                   (new)
src/db/pool-telemetry.ts
src/db/pool.config.ts
src/db/drizzle.module.ts
src/common/tenant/with-tenant.ts
src/common/cache/cache.service.ts
src/common/cache/cache-degradation.spec.ts                (new)
src/degradation/redis.spec.ts
src/common/admission/reserved-routes.ts
src/common/admission/reserved-routes.spec.ts
src/common/ratelimit/rate-limit-coverage.spec.ts          (new)
```

## 9. Neither box closes

Both boxes keep a measurement half this session cannot reach, and box 4 keeps a fourth structural
clause:

- **Box 4** — the cache-**hit** latency ceiling is unmeasured (unchanged blocker: no Redis this seed
  may talk to), and stale-while-revalidate is absent and needs an owner.
- **Box 7** — the exhaustion behaviour is unmeasured (unchanged blocker R-18: the perf harness is
  serial by construction — a module-level telemetry singleton and a process-wide heap baseline), and
  four sub-items above stay open with named owners.
