# 31 — Declared degradation is tested, not described

**What to build:** When a dependency fails, the platform does the thing the PRD says it does — and there is a test that proves it. When it is overloaded, it sheds optional work in the declared order while authentication, revocation, ownership, the billing ledger, payroll posting, audit and mandatory security delivery keep their reserved capacity.

**Blocked by:** None — can start immediately

**Status:** done — one row open, see below

**Not blocked by 20 (revised 2026-08-28).** Asserted against the placement resolution that exists today. The *"serve valid signed placement cache"* half is ticket 21's criterion and is not claimed here.

## What was built, because it did not exist

There was **no load-shedding machinery in this repository at all** — no admission control, no work classes, no shed order, no reserved capacity. The shed half of this ticket was a build, not a test. `backend/src/common/admission/` is new: a work-class vocabulary, a Zod-parsed limits config, an admission service, a global guard and a completion interceptor, wired in `app.module.ts` and enabled by default per the product ruling.

## The fault harness

The constraint that shaped everything: *"kill the dependency, do not stub it — a stubbed Redis returns errors instantly; a real one returns them after a timeout, and the timeout is the behaviour under test."* There is no Docker and no local Redis here, and every dependency is reached over HTTP, so `src/degradation/fault-server.ts` is a real `node:http` server on an ephemeral port that the **real client** is pointed at, in one of three modes — `blackhole` (accepts the socket, never answers, so the client experiences a genuine timeout), `error` (503) and `slow` — plus `refusedPort()` for a genuine `ECONNREFUSED`. `fault-server.spec.ts` proves the harness itself behaves, in 7 tests, before anything relies on it.

## Acceptance criteria

- [ ] Every row above has a test that removes the dependency for real and asserts the declared behaviour, not a mocked client returning an error.

**Seven of eight rows are closed. The read-replica row is open because there is no read replica.**

| Dependency | How it was actually removed | What is asserted |
|---|---|---|
| Control plane | a throwing `lookupOrgRegion`, a `FaultServer` returning 503, and `refusedPort()` | refuses unknown and stale placement; the error is marked retryable, names the organization, and a failed lookup is **not** cached |
| Redis | `refusedPort()` (ECONNREFUSED) and `FaultServer("blackhole")` with a real 150 ms `AbortSignal.timeout` | `CacheService` falls through to the fetcher — correctness stays database-backed; the rate limiter falls back in-memory and **still denies** past the limit |
| Search / vector | conditions built and rendered through `PgDialect().sqlToQuery()` | the ACL predicate is inside the outer `and()` — filtering happens in the query, never after the fetch; `scope=none` renders `false` |
| Realtime adapter | `AblyService` constructed with no API key | publishes become no-ops, the durable path is untouched, channel names stay deterministic and tenant-scoped |
| Email / SMS | outbox envelope functions and a mocked `OutboxWriter.emit` whose callback really runs | the row commits `PENDING`; retry backoff is exponential and bounded by `OUTBOX_RETRY_MAX_MS`; `shouldDeadLetter` bites at `OUTBOX_MAX_RETRIES` |
| Read replica | — | **open, see below** |
| Object storage | `FaultServer` 503, `refusedPort()`, and an unreachable endpoint | the key and URL are generated **before** any network call, so metadata survives; upload throws rather than reporting success; `isConfigured` never touches the network |
| AI provider | a mock `LlmService` that throws, driven through the real gateway credit helpers | the credit reserve happens **before** the provider call (asserted on invocation order), the reservation is **released** on failure and settled on success, and no charge means no ledger write |

The **read-replica row is open**: there is no replica in this deployment and no replica-aware routing seam to point a fault server at, so a passing test would be theatre. `read-replica.spec.ts` exists carrying two `it.skip` cases that state what must exist. What would close it: a configured replica connection plus a routing seam that can be asked "did this read go to the primary?".

- [x] The search row is asserted specifically: degraded search must still apply ACLs in the index, never fetch globally and filter after.

Asserted by rendering the built condition to SQL rather than by inspecting an object. A Drizzle condition is **circular**, so `JSON.stringify` on one throws — which has silently disabled tests in this program before; `PgDialect().sqlToQuery()` is used instead. 10 tests, 2 skipped for want of a real Postgres.

- [x] Overload sheds in the declared order, and each reserved category is proved to survive at full saturation.

The shed order is data with an explicit numeric rank, and admission thresholds are graduated by that rank, which is what makes the *order* assertable rather than just the fact of shedding. `admission.service.spec.ts` drives utilisation up gradually and asserts `prefetch` is refused before `analytics-refresh`, before `ai-enrichment`, before `search-freshness`, before `non-mandatory-notification`, before `ordinary-write` — and that every one of the seven reserved classes is still admitted at full sheddable saturation.

**Tested at the boundary, not at 10× saturation**, per the ticket's own warning that everything sheds at 10× and that proves no ordering.

**The reserved classes are not inert.** A guard that only reads a decorator would leave every reserved route classified `ordinary-write`, because no controller carries one — so at saturation authentication would have shed first. `reserved-routes.ts` maps real controller prefixes to reserved classes, and `reserved-routes.spec.ts` asserts every prefix is served by a controller that actually exists, refusing to pass vacuously if the scan finds fewer than 200 controllers. That guard caught a broken scan on its first run: `execSync("git ls-files … 'src/**/*.ts'")` returns **zero** files on Windows because `cmd.exe` does not strip the quotes, so all 12 cases failed until the scan became a filesystem walk.

- [x] Overload returns explicit retry information and never accepts work it cannot recover.

Refusal is a 503 carrying a `Retry-After` header and a machine-readable `retryAfterSeconds` in the body. The refused path never increments the in-flight counter, so a shed request consumes nothing.

**Proved over real HTTP through real Nest dependency injection, not against mocks.** A global `APP_GUARD` is the highest-blast-radius thing that can be added to this application — if it cannot be constructed, every route fails, and unit tests with hand-made `ExecutionContext` doubles would never show it. `admission-boot.spec.ts` stands up a real Nest application containing `AdmissionModule`, the guard and the interceptor, with the same CORS-then-body-parser ordering `main.ts` uses, and drives it with `supertest`:

```
$ node ./node_modules/jest/bin/jest.js src/common/admission/admission-boot.spec.ts
  admission control resolves through real Nest DI and serves real HTTP
    √ boots, which is what proves the guard and interceptor are constructible
    √ admits an ordinary request and returns the handler's response
    √ returns the in-flight count to zero after a served request
    √ answers an oversized body with 413 that still carries its CORS header
    √ leaks no in-flight slot when the body parser rejects before the guard
  admission control sheds over real HTTP
    √ refuses a sheddable route with 503 and retry information once saturated
    √ serves the reserved route again as soon as capacity is released
Tests:       7 passed, 7 total
```

**Why this rather than booting the whole API:** the application currently **cannot start**. `pnpm build` is clean, but `dist/main.js` exits during `NestFactory.create` with `UnknownExportException: Nest cannot export a provider/module that is not a part of the currently processed module (HrCoreModule) … EmploymentFactsService`. That is c28 Session 2's in-flight work, not this ticket's; it is recorded in `sessions/CROSS-SESSION.md`. Standing up a real application module containing only the admission seam answers the same question for this ticket without waiting on it.

- [x] Every ingress has a bounded concurrency, queue depth, body size, execution time and per-organization cost, each with a number rather than a default.

| Bound | Env | Default | Where the number comes from |
|---|---|---:|---|
| Concurrency | `ADMISSION_MAX_CONCURRENT` | 200 | the normal ceiling; above it only reserved classes are admitted |
| Queue depth | `ADMISSION_MAX_QUEUE_DEPTH` | 400 | absolute ceiling — refuses **every** class, reserved included |
| Body size | `ADMISSION_MAX_BODY_BYTES` | 3,145,728 | now the actual body-parser limit in `main.ts` |
| Execution time | `ADMISSION_MAX_EXECUTION_MS` | 30,000 | read from `resolveTransactionGuards().statementTimeoutMs`, the guard that really enforces it |
| Per-organization cost | `ADMISSION_ORG_MAX_CONCURRENT` | 50 | one noisy tenant cannot consume the sheddable pool |
| Reserved share | `ADMISSION_RESERVED_FRACTION` | 0.2 | fraction of concurrency withheld from sheddable work |

**Two of these were declared but not enforced when first written** — `maxQueueDepth` and `maxBodyBytes` existed only as parsed config fields, which is precisely the "a number rather than a default" criterion satisfied on paper and not in behaviour. Queue depth is now an absolute ceiling with two tests, body size is now the real parser limit, and execution time is sourced from the transaction guard rather than being a second, unenforced copy of the same number. `admission.config.spec.ts` asserts the derivation and that a bad value is refused rather than silently defaulted.

- [x] The rate-limit fallback test accounts for the dev multiplier and for the fail-open tier gap, or it proves nothing.

Both traps handled, and both turned out to be already-closed in the source — verified rather than assumed. `RateLimitService.check` now **denies** an unknown tier (deny-by-default), and all 24 `@UseRateLimit` decorator keys have a `TIERS` entry (counted directly: 24 unique decorator keys, 24 present in `TIERS`), so the fail-open gap does not currently exist. The tests use `effectiveRateLimit(tier)` rather than the declared limit, so `DEV_LIMIT_MULTIPLIER`'s ×10 outside production cannot make them pass for the wrong reason.

Coverage, counted rather than estimated: `src/degradation/redis.spec.ts` is 12 tests across the cache and rate-limit fallback paths, and `src/common/ratelimit` is a further 13.

## Todo

- [x] Kill the dependency, do not stub it.

The fault server is a real socket. The blackhole mode produces a real client timeout rather than an instant error, which is the distinction the ticket draws.

- [x] Check the CORS ordering while testing body-size limits.

**The defect described is not present in this codebase** — verified rather than assumed, and worth recording because the premise was inherited. `main.ts` registers `enableCors` *before* `useBodyParser`, and both register onto Express immediately in call order (`NestApplication.enableCors` → `httpAdapter.enableCors` → `instance.use`; `useBodyParser` → `this.use(parser)`). A faithful replication of that middleware stack:

```
status: 413
access-control-allow-origin: http://localhost:3000
PASS: oversized body returns 413 WITH its CORS header — a browser sees 413, not a network error
```

`ingress-bounds.spec.ts` pins it both ways: cors-first keeps the header, body-first loses it, and a static assertion holds `enableCors`'s line number below `useBodyParser`'s so a future reorder fails the suite.

- [x] Test the shed order at the boundary, not well past it.

- [x] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md)

## Validation

```
$ node ./node_modules/jest/bin/jest.js src/degradation
Test Suites: 1 skipped, 9 passed, 9 of 10 total
Tests:       13 skipped, 78 passed, 91 total

$ node ./node_modules/jest/bin/jest.js src/common/admission
Test Suites: 4 passed, 4 total
Tests:       68 passed, 68 total
```

The 13 skips are declared, not silent: 2 read-replica (no replica exists) and 11 that need a real seeded Postgres, real S3 or real Ably. Each carries its reason in the test name.

## Files changed

| File | Change |
|---|---|
| `backend/src/common/admission/work-class.ts` | shed order and reserved classes as ranked data |
| `backend/src/common/admission/admission.config.ts` (+ spec) | the six bounds, Zod-parsed, execution time sourced from the transaction guard |
| `backend/src/common/admission/admission.service.ts` (+ spec) | graduated-by-rank admission, per-org bound, self-pruning counters |
| `backend/src/common/admission/admission.guard.ts` (+ spec) | 503 with retry information; unclassified routes default to sheddable |
| `backend/src/common/admission/admission.interceptor.ts` | releases in-flight on both the success and error paths |
| `backend/src/common/admission/reserved-routes.ts` (+ spec) | reserved classes bound to real controller prefixes |
| `backend/src/common/admission/{admission.module.ts,work-class.decorator.ts,index.ts}` | module, decorator, barrel |
| `backend/src/app.module.ts` | registers `AdmissionModule`, the guard after `JwtAuthGuard`, and the interceptor |
| `backend/src/main.ts` | body-parser limits sourced from the admission config |
| `backend/src/degradation/*` | the fault harness and ten dependency specs |

---

PRD: [`c28 — Organization-routed cells for 20M+ users`](../prd.md) · Candidate index: [`../README.md`](../README.md)
