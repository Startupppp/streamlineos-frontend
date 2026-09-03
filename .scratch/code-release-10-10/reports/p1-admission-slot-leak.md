# P1 — admission slots leak on every downstream rejection

**Status:** FIXED. Found in passing during the code-release-10-10 orchestration; not attached to a
numbered ticket.
**Repo:** `streamlineos-backend` · **Territory:** `src/common/admission/**`

---

## 1. The defect

`AdmissionGuard.canActivate` **takes** a slot (`admissionService.tryAdmit`) and stamps
`req._admissionOrgId`. `AdmissionInterceptor.intercept` **returns** it, in
`next.handle().pipe(finalize(...))`.

NestJS runs *every* guard before *any* interceptor. Acquire and release therefore sit in two
different lifecycle phases, and everything that terminates a request between them strands the slot
permanently:

| Terminating path | Reaches `finalize`? | Slot returned before fix |
|---|---|---|
| Downstream guard 403 (`PermissionGuard`, `ModuleGuard`, `MfaGuard`, record access) | no | **leaked** |
| Downstream guard 429 (`RateLimitGuard`) | no | **leaked** |
| Client disconnects mid-response | no (observable never completes) | **leaked** |
| Handler throws 500 | yes | returned |
| Request succeeds | yes | returned |

`AdmissionService` has no timeout, no reaper and no expiry: `inFlight` only ever moves via
`tryAdmit`/`release`, so each missed release is permanent for the life of the process. Once the
strand count reaches the sheddable threshold, `tryAdmit` refuses **everything** — the product
returns 503 "temporarily overloaded" under no load and never heals without a restart. An agent
driving the real app measured the in-flight counter climbing monotonically to 2,278 shed requests.

### Blast radius — guard registration order

`src/app.module.ts:205-210`, in execution order:

```
APP_GUARD  RouteClassifierGuard
APP_GUARD  JwtAuthGuard
APP_GUARD  AdmissionGuard          <-- slot taken here
APP_GUARD  MfaGuard                <-- can strand it
APP_GUARD  ModuleGuard             <-- can strand it
APP_INTERCEPTOR AdmissionInterceptor  <-- slot returned here
```

Nest runs global guards first, then controller-scoped, then handler-scoped. So **two global guards
plus every route-level guard** run inside the window. `grep -c "@UseGuards"` over `src/` = **1,418**
decorator sites; `PermissionGuard` alone appears on ~1,180 of them and `RateLimitGuard` on 108.
Effectively every 403 and every 429 in the product leaked a slot. `main.ts` registers no admission
guard or interceptor (it only reads `resolveAdmissionConfig` for body-parser limits), so
`app.module.ts` is the whole ordering story. Neither file was edited.

---

## 2. Reproduction — the failing test, written before the fix

`src/common/admission/admission.lifecycle.spec.ts` simulates the real Nest ordering (admission guard
→ downstream guards → interceptor → handler) against an `EventEmitter`-backed fake `express`
response that emits `finish`/`close` the way the framework's responder does after any exception
filter writes a response.

Red run, **before** any source change:

```
$HEAVY 2 -- pnpm exec jest --runInBand --testPathPattern="admission.lifecycle"
exit 1 — Tests: 5 failed, 5 passed, 10 total
```

| Failing test | Expected | Received (pre-fix) |
|---|---|---|
| releases the slot when a downstream guard rejects with 403 | inFlight 0 | 1 |
| does not leak across a burst of 403s | inFlight 0 | **16** |
| releases the slot when a downstream guard rejects with 429 | inFlight 0 | 1 |
| releases the slot when the client disconnects mid-response | inFlight 0 | 1 |
| keeps one request's slot when a sibling request of the same org is rejected | inFlight 1 | 2 |

The burst case reproduces the production symptom exactly. With `maxConcurrent: 20` and
`reservedFraction: 0.2` the sheddable budget is 16 slots; 50 sequential 403s stranded **16 of 16**,
and from that point the guard refused every further request with 503 while the service was
completely idle. That is the "503 with no load, never heals" report, in a unit test.

The five branches that already worked — success, handler-throw, `AdmissionGuard`'s own 503 refusal,
non-HTTP context, HTTP request that never took a slot — passed before the fix as well, so they are
regression guards rather than reproductions.

---

## 3. The fix

New file `src/common/admission/admission-slot.ts`:

```ts
export function attachAdmissionSlot(req, res, release): void {
  let released = false;
  const releaseOnce = () => { if (released) return; released = true; release(); };
  req._admissionRelease = releaseOnce;
  if (!hasResponseLifecycle(res)) return;
  res.on("close", releaseOnce);
  res.on("finish", releaseOnce);
}
```

- **`admission.guard.ts`** — on admission, alongside stamping `_admissionOrgId`, calls
  `attachAdmissionSlot(req, res, () => this.admissionService.release(orgId))`. The refusal branch is
  unchanged and still takes no slot.
- **`admission.interceptor.ts`** — now invokes the request's one-shot in `finalize` instead of
  calling `release(orgId)` itself, falling back to a direct release only if no one-shot is stamped
  (a hand-built request in an older spec).

**Mechanism: bind the release to the response lifecycle, keep acquisition in the guard.**
`res` `close` is the only edge Node guarantees fires for every terminated request — normal
completion, exception-filter-written 403/429/500, or a prematurely destroyed connection — and it
fires regardless of which pipeline phase ended the request. Acquisition stays in the guard because
that is the entire point of admission control: shed *before* the expensive RBAC/DB work.

### Options rejected

- **Release from an `ExceptionFilter` too.** It does not cover a client disconnect (no exception is
  thrown), and it depends on filter resolution: `main.ts:117` already installs a global
  `AllExceptionsFilter` via `useGlobalFilters`, so a second catch-all filter would have to be
  ordered against it and would make correctness depend on which filter Nest picks per exception.
  Strictly narrower coverage than the response lifecycle, for more moving parts.
- **Move acquisition into the interceptor.** This makes acquire/release symmetric, but interceptors
  run *after every guard* — admission would then happen after `MfaGuard`, `ModuleGuard` and
  `PermissionGuard`, i.e. after the DB work each of those performs. The limiter would only shed load
  it had already paid for, which inverts its purpose. Rejected on those grounds, not on effort.

---

## 4. Exactly-once proof

The invariant is *every admitted request releases exactly once — not zero times, not twice*.

- **Not zero:** the release is bound to `res` `close`, which Node emits when the response completes
  or the connection is destroyed. Covered by the 403, 429, burst and client-disconnect tests.
- **Not twice:** `releaseOnce` closes over a per-request `released` boolean and is the *single*
  release callable for that request — the guard registers it on both `close` and `finish` (express
  emits both on a normal response) and the interceptor's `finalize` calls the same closure. Every
  duplicate edge collapses into the first one.
- **Asserted, not argued:** every lifecycle test spies on `AdmissionService.release` and asserts an
  exact call count — 1 for a single request, 50 for the burst, 2 for the two-request sibling case.
  The success path fires all three edges (finalize, then `finish`, then `close`) and still records
  exactly one release.

Double release is not a cosmetic concern here: `AdmissionService.release(orgId)` decrements whenever
that org has *any* slot recorded, so a stray second release for org X silently frees a *different*
in-flight request's slot for the same org and lets in more concurrency than the limit allows. The
"keeps one request's slot when a sibling request of the same org is rejected" test pins exactly that:
a long-running request and a 403 on the same org, asserting `inFlight === 1` afterwards.

Green run over the whole admission surface:

```
$HEAVY 2 -- pnpm exec jest --runInBand --testPathPattern="admission"
exit 0 — Test Suites: 8 passed, Tests: 129 passed, 129 total
```

---

## 5. Leak detection / recovery in `AdmissionService` — decision: none added

`AdmissionService` today has **no** expiry, reaper or drift detection. A single missed release is
permanent. I deliberately did **not** add a bounded safeguard:

1. **A time-based reaper cannot pick a safe ceiling here.** The only duration in the config is
   `maxExecutionMs` (default 30s, inherited from the DB statement timeout), but
   `GET /notifications/events` is an `@Sse()` route (`src/modules/notifications/notifications.controller.ts:80`)
   that legitimately holds its slot for the life of the stream. Any reaper tuned to seconds would
   force-release live streaming slots, over-admitting past the limit — the failure the limiter exists
   to prevent, and per the brief as bad as the leak. Making it safe needs a per-route "streaming"
   classification, i.e. more machinery than the defect warrants once release is lifecycle-bound.
2. **It would have hidden this bug.** A reaper set high enough to be safe would have converted a
   deterministic, reproducible leak into an intermittent one that only surfaces under load.
3. **The residual leak surface after the fix is empty on this adapter.** The only path that skips the
   `res` listeners is a response object without `.on` (unit fakes; a non-express adapter). This app is
   `NestExpressApplication`, and the interceptor's `finalize` still covers the success path there.

What is genuinely missing is **observability, not recovery**: `snapshot()` already exposes exactly
the signal that caught this (`inFlight`, `maxConcurrent`, `orgMapSize`) and **nothing in the
application reads it** — no health field, no metric, no log. Recommended follow-up for whoever owns
observability: emit `snapshot()` on the health/metrics surface so monotonic `inFlight` growth is
alertable instead of being discovered by an agent watching a counter.

---

## 6. Cross-territory findings (reported, not fixed)

- **`GET /notifications/events` (`@Sse()` + `@Public()`) occupies an admission slot for its entire
  connected lifetime**, classified `ordinary-write` (not in `RESERVED_ROUTES`, no `@UseWorkClass`).
  Because it is `@Public()`, `req.user` is undefined and every such stream buckets into the single
  `__public__` org, which is capped at `orgMaxConcurrent` (default **50**). The 51st concurrent
  notification stream across the whole deployment is refused with 503, and ~160 of them exhaust the
  entire sheddable budget for everyone. Pre-existing, unchanged by this fix; owner is the
  notifications module. The likely fix is a work-class/exemption decision, not an admission change.
- **`pnpm check:spec-typecheck` is red at 2 errors**, both `TS2554` in
  `src/modules/hr/config/hr-config-tenant-isolation.spec.ts:136,146` — another agent's territory,
  mid-edit. No admission path appears in that output.

---

## 7. Commands run

| Command | Exit | Result |
|---|---|---|
| `jest --runInBand --testPathPattern="admission.lifecycle"` (pre-fix) | 1 | 5 failed / 5 passed / 10 |
| `jest --runInBand --testPathPattern="admission"` (post-fix) | 0 | 8 suites, 129 passed / 129 |
| `pnpm typecheck` | 0 | 0 errors |
| `pnpm check:spec-typecheck` | 2 | 2 errors, both outside admission (see above) |
| `npx eslint <the 4 changed files>` | 0 | clean |
| `npx madge@8 --circular --extensions ts src` | 0 | 5515 files, no cycles |
| `check:kebab-case` / `check:type-assertions` / `check:test-suppressions` / `check:mock-surface` / `check:file-sizes` | 0 each | clean |

All jest/typecheck runs went through `heavy.sh 2`. Not run: `pnpm lint` repo-wide, e2e suites,
seeded-DB suites, a real app boot.

## 8. Files changed

```
src/common/admission/admission-slot.ts            (new)
src/common/admission/admission.lifecycle.spec.ts  (new)
src/common/admission/admission.guard.ts
src/common/admission/admission.interceptor.ts
```

`src/app.module.ts` and `src/main.ts` were read for guard ordering and **not modified** — the fix
needs no registration change.

---

# P1b — the `__public__` bucket: a tenant-identifiable stream charged to a global 50-slot pool

**Status:** FIXED. Follow-up to §6 above, which reported this and did not fix it.
**Repo:** `streamlineos-backend` · **Commit:** `fde182a5` · **Territory:** `src/common/admission/**`
plus 3 lines of `src/modules/notifications/**`

---

## 9. The defect

`GET /notifications/events` is `@Sse()` **and** `@Public()`. `JwtAuthGuard` (2nd `APP_GUARD`) returns
`true` immediately on `@Public()` without touching `req.user`, so by the time `AdmissionGuard` (3rd)
runs, `req.user?.orgId` is `undefined` and the request buckets as the literal string `__public__`.
Its work class was `ordinary-write`, so `orgMaxConcurrent` (**50**) applied and the slot was held for
the **entire life of the stream**.

Two consequences, both deployment-wide rather than per tenant:

1. The **51st concurrent notification listener anywhere in the deployment** got a 503. Fifty open
   browser tabs is fifty logged-in users, not a load event.
2. Long-lived streams and ordinary public traffic (login, webhooks, health, every other `@Public()`
   route) shared one 50-slot bucket and starved each other.

The org **is** resolvable: the route is `@Public()` only because it authenticates by a one-shot
stream token whose server-side entry is `{userId, orgId}` (`notification-event.service.ts:23-27`).
The identity was on the request; the guard had no way to reach it.

---

## 10. Reproduction — the failing test, written before the source change

`src/common/admission/admission-tenant-hint.spec.ts` (new, 20 tests). Written and run **before** the
guard was touched, against a fake `AdmissionTenantHintProvider` and the real
`AdmissionService`/`AdmissionGuard`/`AdmissionInterceptor`:

```
$HEAVY 2 -- pnpm exec jest --runInBand --testPathPattern="admission-tenant-hint"
Tests: 3 failed, 17 passed, 20 total
```

| Failing test | Expected | Received (pre-fix) |
|---|---|---|
| gives every org its own headroom once the route declares a tenant hint | 6 admitted | **3 admitted, 3 refused** |
| stamps the hinted bucket, not the bare org id | `hint:org-a` | `__public__` |
| keeps a hinted bucket disjoint from the same org's authenticated bucket | release(`hint:org-a`) | release(`__public__`) |

The first row is the defect exactly: with `orgMaxConcurrent: 3`, six streams from **six different
orgs** exhausted one bucket at three. The 17 that passed pre-fix are the characterisation of the bug
(`documents the defect: without a hint, streams from different orgs share one public bucket` —
4 orgs, 3 admitted, 1 refused, `orgMapSize` **1**) and the security properties, which pass vacuously
before the fix because *everything* bucketed `__public__`.

### Bite-proof, in a hermetic copy

The new real-HTTP tests in `admission-boot.spec.ts` (below) had never been red, so they were proved
to bite in a throwaway tree — `git archive HEAD | tar -x` into scratch, my files copied in,
`node_modules` symlinked, `bucketFor` reduced to `return PUBLIC_ADMISSION_BUCKET`. Nothing was
planted in the shared tree.

```
jest --runInBand --testPathPattern="admission-boot|admission-tenant-hint"   (defect planted)
exit 1 — Tests: 5 failed, 32 passed, 37 total
```

The 5 include both real-HTTP cases: *charges a resolvable token to its own namespaced bucket* and
*keeps a hinted stream admitted while the shared public bucket is exhausted*. Tree deleted after.

---

## 11. The fix — an org-resolver hook that is a bucketing hint, never an authentication

New file `src/common/admission/admission-tenant-hint.ts`:

```ts
export interface AdmissionTenantHintProvider {
  resolveAdmissionTenantOrgId(req: unknown): string | undefined;
}
export const UseAdmissionTenantHint = (provider: Type<AdmissionTenantHintProvider>) =>
  SetMetadata(ADMISSION_TENANT_HINT_KEY, provider);
export function hintedBucket(orgId: string): string { return `hint:${orgId}`; }
export function sanitiseTenantHint(value: unknown): string | undefined { /* /^[A-Za-z0-9_-]{1,64}$/ */ }
```

`AdmissionGuard` gains `ModuleRef` and one private `bucketFor`:

- `req.user?.orgId` (verified, set by `JwtAuthGuard`) → that org's bucket, unchanged.
- else, if the handler declares a hint provider → resolve it once through `moduleRef.get(token,
  { strict: false })`, cache the instance (or the `null`), call it inside `try/catch`, run the answer
  through `sanitiseTenantHint`, and bucket as `hint:<orgId>`.
- else → `__public__`, exactly as today.

`NotificationEventService` implements the interface in 7 lines: it **peeks** the bearer token in the
server-side `streamTokens` map — it does not delete it and does not extend its TTL — so the handler's
`consumeToken` remains the one and only verification. The controller adds two decorators to the
stream route. That is the whole cross-territory footprint: **3 added lines of behaviour in
`notification-event.service.ts` + 2 decorator lines + 2 imports in `notifications.controller.ts`**,
plus one new additive spec file.

### Why the hint cannot become an authentication bypass

1. **The caller never names the bucket.** The only thing the caller supplies is an opaque token
   string. The orgId comes out of the server's own `Map`, keyed by a `crypto.randomUUID()` the server
   minted. Supplying `?orgId=`, a body field or a `user` object on the request changes nothing —
   asserted by *ignores an org id the caller supplies itself* in both specs.
2. **Failure is closed and lands in the most contended bucket.** Absent, non-bearer, forged, expired,
   already-consumed, malformed (non-string / >64 chars / `hint:`-prefixed / empty), throwing resolver,
   provider missing from the container — every one returns `undefined` and buckets `__public__`.
   Lying is therefore never *cheaper*: it costs you the shared bucket.
3. **The only reachable "cheap" bucket is your own tenant's**, and reaching it requires a token minted
   by `POST /notifications/events/token`, which is `@Universal()` behind `JwtAuthGuard` **and**
   `@UseRateLimit("notifications:stream-token")`. Naming a *victim's* bucket needs an unexpired
   122-bit UUID minted for that victim inside a 120 s window.
4. **The peeked value cannot reach an authorization decision.** It is written only to
   `req._admissionOrgId` and closed over by the release callback. `grep` for `_admissionOrgId` /
   `_admissionRelease` outside `src/common/admission/` returns **zero** hits, and the guard never
   writes `req.user` — pinned by *never stamps the hint onto req.user*.
5. **Namespacing keeps the two keyspaces disjoint.** `hint:<org>` can never equal an authenticated
   `<org>`, so a hinted request can never decrement a slot held by an authenticated request of the
   same tenant — the sibling-release hazard, extended to the new key.

### Exactly-once, preserved

Nothing about the release path changed: the guard still calls `attachAdmissionSlot(req, res, …)` on
admission, the one-shot still closes over a per-request `released` boolean registered on `close` and
`finish`, and the interceptor's `finalize` still invokes that same closure. The only difference is
the *string* the closure releases. New assertions: *releases exactly once when the client
disconnects* (abort then finish → 1 release, inFlight 0) and *keeps a sibling stream of the same org
when one of them ends* (2 streams in `hint:org-a`, one finishes → inFlight 1, 1 release). The
pre-existing *keeps one request's slot when a sibling request of the same org is rejected* is
untouched and green.

### Alternatives rejected

- **`ReservedClass`** — `isReserved` short-circuits *before* both the shed threshold and the org
  check, so it fixes the cap by removing shedding entirely, admitting unbounded streams ahead of
  authentication. That is the failure the limiter exists to prevent.
- **`non-mandatory-notification` alone** (the previous agent's reading) — still sheddable, still
  lands in `__public__`. Correct as a rejection *of a bucketing fix*; taken here as the shed-priority
  half (see §12).
- **A registry keyed by hint name, with `OnModuleInit` registration** — needs a constructor parameter
  on `NotificationEventService`, which `test/security/bola/bola-realtime-grant-time.spec.ts`
  constructs bare in 4 places (`new NotificationEventService()`). That would have broken another
  agent's spec under `check:spec-typecheck` for no gain. `ModuleRef` needs no signature change.
- **A reaper** — not added, for the reason already recorded in §5: this stream legitimately outlives
  `maxExecutionMs` (30 s), so a reaper tuned to seconds force-releases live streams and over-admits.

---

## 12. Should a long-lived stream share the ordinary cap? (requirement 5)

**No, on two axes, and both are now implemented.**

**Shed order.** As `ordinary-write` the stream sat at shed rank 5 — the *last* class to be shed — so
with defaults (`maxConcurrent` 200, `reservedFraction` 0.2 → sheddable 160) streams could consume all
160 sheddable slots before yielding one to an ordinary write. Backwards. `@UseWorkClass(
"non-mandatory-notification")` moves it to rank 4, threshold `floor(160 × 5/6)` = **133**, leaving 27
slots ordinary writes can still reach after streams are refused. It is *still sheddable* — asserted
by *sheds a notification stream before an ordinary write* (inFlight 10 of a 12-slot sheddable budget:
the stream 503s, `tryAdmit("ordinary-write", …)` succeeds).

**Bucket.** A per-org cap shared between millisecond requests and hour-long streams is a per-tenant
outage waiting to happen: 50 open tabs in one org would leave that org **zero** headroom for its own
API traffic. The `hint:` namespace gives streams their own per-org counter. The honest trade: org A
can now hold 50 authenticated + 50 hinted rather than 50 total. That is deliberate — the *global*
`maxConcurrent` / `maxQueueDepth` / shed-threshold checks all run **before** the org check and bind
regardless, so no bucketing choice escapes system-wide shedding.

**The residual ceiling is global, not per-org, and I did not change it.** At defaults a process
admits at most **133** concurrent SSE streams whatever the bucketing, because the rank-4 shed
threshold binds long before any org cap. A deployment expecting more concurrent tabs than that must
either size `ADMISSION_MAX_CONCURRENT` for its tab count or stop charging long-lived streams an
admission slot at all and give them a separate connection limiter. Both are capacity/product
decisions with blast radius well beyond this ticket, so they are **reported, not taken**. I
deliberately did not invent an `ADMISSION_STREAM_ORG_MAX_CONCURRENT` knob: raising a per-org stream
cap above 50 would change nothing while the global 133 binds first.

---

## 13. `snapshot()` on health — NOT taken

Re-verified at head: `grep -rn "AdmissionService" src --exclude-dir=admission` returns **zero** hits.
Nothing in the application still reads `snapshot()`. It was not exposed here because
`src/health/health.controller.ts` is outside this ticket's territory, is a 400-line file with
`BeforeApplicationShutdown` drain semantics and its own `health.controller.spec.ts` asserting payload
shape, and injecting `AdmissionService` into it is a change its owner should make. **Recommended
follow-up, unchanged:** add `admission: admissionService.snapshot()` to `/health` so `inFlight`
growth is alertable. `AdmissionModule` is `@Global()` and exports the service, so no wiring is needed.

---

## 14. Commands run

| Command | Exit | Result |
|---|---|---|
| `jest --runInBand --testPathPattern="admission-tenant-hint"` (pre-fix) | 1 | **3 failed** / 17 passed / 20 |
| `jest --runInBand --testPathPattern="admission-boot\|admission-tenant-hint"` (hermetic, defect planted) | 1 | **5 failed** / 32 passed / 37 |
| `jest --runInBand --testPathPattern="admission\|notification-stream-admission-hint"` (post-fix) | 0 | 10 suites, **169 passed / 169** |
| `jest --runInBand --testPathPattern="modules/notifications\|bola-realtime-grant-time"` | 0 | 48 suites, **297 passed / 297** |
| `pnpm typecheck` | 0 | **0 errors** (`grep -c "error TS"` = 0) |
| `pnpm check:spec-typecheck` | 0 | spec-inclusive typecheck passed |
| `npx eslint src/common/admission src/modules/notifications/{notification-event.service,notifications.controller,notification-stream-admission-hint.spec}.ts` | 1 | **1 error, pre-existing**, `admission.config.ts:55` `no-restricted-syntax` (`process.env` as a value); `git diff --quiet` confirms that file is untouched by me. Zero findings in any file I changed. |
| `npx madge@8 --circular --extensions ts src` | 0 | 5521 files, no cycles |
| `check:kebab-case` / `check:type-assertions` / `check:test-suppressions` / `check:mock-surface` / `check:file-sizes` / `check:route-classification` | 0 each | clean |

Every jest and typecheck run went through `heavy.sh 2`. **Not run:** repo-wide `pnpm lint`, e2e
suites, seeded-DB suites, a real app boot against Postgres. The `admission-boot.spec.ts` additions do
boot a real Nest container and serve real HTTP through the real guard chain, which is why the
`moduleRef.get` resolution path is proved rather than argued.

## 15. Files changed (commit `fde182a5`)

```
src/common/admission/admission-tenant-hint.ts             (new)
src/common/admission/admission-tenant-hint.spec.ts        (new)
src/modules/notifications/notification-stream-admission-hint.spec.ts (new)
src/common/admission/admission.guard.ts
src/common/admission/admission-boot.spec.ts
src/common/admission/admission.guard.spec.ts
src/common/admission/admission.lifecycle.spec.ts
src/modules/notifications/notification-event.service.ts
src/modules/notifications/notifications.controller.ts
```

`src/app.module.ts` and `src/main.ts` read for guard ordering and **not modified** — `ModuleRef` is
injectable into an `APP_GUARD` with no registration change, proved by `admission-boot.spec.ts`
booting a real container.

## 16. Cross-territory findings (reported, not fixed)

- **`AdmissionGuard`'s constructor arity changed** (3rd param `ModuleRef`). The only constructors are
  in `src/common/admission/*.spec.ts`, all updated in this commit. No other file constructs it.
- **`src/common/admission/admission.config.ts:55` fails `no-restricted-syntax`** (`env = process.env`
  default parameter). Pre-existing, untouched by this commit, owner unknown.
- **`NotificationEventService`'s stream-token store is per-process and in-memory.** Behind more than
  one replica, a token minted on instance A cannot be peeked *or* consumed on instance B, so the SSE
  route is already single-replica-affine — the hint inherits that limitation and fails closed to
  `__public__` there, it does not make it worse. Notifications' owner should know.
- **Recommended follow-up for whoever owns health/metrics:** expose `AdmissionService.snapshot()` on
  `/health` (§13).
