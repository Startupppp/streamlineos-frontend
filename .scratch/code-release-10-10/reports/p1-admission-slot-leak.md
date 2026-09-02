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
