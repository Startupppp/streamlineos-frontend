# Security findings both registers list as OPEN and UNOWNED

Backend repo `streamlineos-backend`, branch `main`. Four items: three fixed with a
RED-first proof, one recorded deliberately unchanged.

| Item | Register | Verdict | Commit |
|---|---|---|---|
| 1 | #15 | FIXED | `cdaf636d` |
| 1b | #15, sibling key — named by the coordinator after the first pass | FIXED | `47085372` |
| 2 | #23 / #242 | FIXED (2 of 3 sub-fixes; the third is not applicable — see below) | `e335c065` |
| 3 | #48 | FIXED | `54dd1f2c` |
| 4 | #241 | RECORDED, not changed | `02e01cfa` |

Baseline before any edit: backend `typecheck` **exit 0**, `check:spec-typecheck` **exit 0**,
`check:authz-deny` uncovered **2441** against ratchet 2443, `check:route-classification`
**0 undeclared**. Both required gates are exit 0 at the end.

Bite proofs were run in a hermetic tree built with `git archive HEAD src test evals` into the
scratchpad, with only the new spec (plus, where the spec needs it to import at all, the new pure
helper) copied in, and the live `node_modules` symlinked. The three trees were deleted afterwards.

---

## Item 1 — `sign:certificate:download` bypassed the envelope scope (#15, P1)

`sign:certificate:download` is **not** `scopable` in `modules/rbac/permissions/sign.ts`, so its
grant can only ever read `all`. `sign:envelope:view` **is** scopable. A per-person
`user_permission_grants` row therefore hands the download key to a member whose view scope stays
`own`, and both download routes bound only `orgId` — so that member could read every
fully-executed contract PDF in the organisation, and any other tenant's envelope id was the same
request minus the org match.

**Changed**

- `src/modules/e-sign/sign-envelope-scope.ts` (new) — `resolveEnvelopeViewScope` reads
  `AccessService.scopeFor(u, "sign:envelope:view")`, which is *literally* the value
  `GET /sign/envelopes/:envelopeId` gets off `req.rbacScope` (PermissionGuard sets it from
  `authorize()`, which calls the same `scopeFor`). `envelopeIsVisible` mirrors `getFull`'s
  predicate: `viewAll`, else the caller must be the sender.
- `src/modules/e-sign/sign-certificates.controller.ts` — both `sign:certificate:download` routes
  (`/certificate` and `/final-pdf`) resolve and forward that scope. Follows the in-repo precedent
  of `deals-scope.ts` / `deals.controller.ts`.
- `src/modules/e-sign/sign-finalization.service.ts` — `mustGetVisibleEnvelope` refuses an envelope
  the caller cannot see. **404, never 403**, and the same message a missing envelope and an
  unfinalized envelope give, so the response confirms nothing.

`POST /regenerate-certificate` was left unscoped on purpose: it requires `sign:admin:manage`, an
admin key, not a scopable read key.

**Test that fails without it** —
`src/modules/e-sign/__tests__/sign-certificate-download-scope.spec.ts` (16 tests).
Bite in the hermetic tree: **8 failed / 8 passed / 16 total**. With the fix: **16 passed**;
the whole e-sign + chat pattern is 12 suites / 108 tests green.

`check:authz-deny` uncovered **2435 -> 2433** with the spec present (measured by moving the file
aside and back), so **2 handlers**. Ratchet lowered **2443 -> 2441** in the same commit — my
measured delta only, not the tree's live number, because concurrent agents move it (it read 2411
by the end of the session).

## Item 1b — the same defect on `GET /sign/envelopes/:envelopeId/audit` (`47085372`)

Named by the coordinator after the first pass; I had flagged it and declined to take it unasked.

**Scopability checked first, because it was the load-bearing detail in #15.** At runtime,
`isScopable("sign:audit:view")` is **false** — the same property as
`sign:certificate:download`, and unlike `sign:envelope:view` which is `true`. So the audit key's
own grant can only ever resolve `all`, and the scope has to come from `sign:envelope:view`. The two
routes do not differ for any real reason, so they now read the same source.

The route bound only `orgId`, so a member scoped `own` on `sign:envelope:view` holding
`sign:audit:view` could read the signing trail of every envelope in the organisation — who opened,
signed, declined and downloaded what, and when.

**Changed**

- `mustGetVisibleEnvelope` moved out of `SignFinalizationService` (where it was private) into
  `sign-envelope-scope.ts`, so all three routes refuse an invisible envelope through **one**
  implementation rather than three copies.
- `SignAuditService.listForEnvelope` now **requires** the scope. Missing, cross-tenant and
  out-of-scope all answer 404 with the identical message, and a spec asserts the two messages are
  *equal* rather than merely both being 404s.
- The finalization pipeline's own two audit reads pass `SYSTEM_ENVELOPE_SCOPE`, which names them as
  system reads instead of leaving them looking unscoped by omission. The two e2e call sites were
  updated with it.

**Test that fails without it** — the same spec extended to the third handler, now 25 tests. Bite
against a tree carrying the item-1 fix but not this one: **7 failed / 18 passed / 25 total**, and
the 7 failures are exactly the audit tests, which isolates the new defect from the already-proven
ones. With the fix: **25 passed**; the e-sign module is 11 suites / 109 tests green.

**`check:authz-deny` ratchet deliberately NOT lowered, delta 0.** `--why "GET
/sign/envelopes/*/audit"` reports `COVERED  DELEGATE SignAuditService.listForEnvelope  by
e-sign-signing-flow.e2e-spec.ts` — **both before and after my change**. The gate called this
handler covered the whole time the route had no scope gate at all, on a delegate symbol link to a
file that asserts a deny somewhere else in it. That is the looseness the gate's own header admits
("attribution is per spec FILE, not per `it()` block") showing up on a live P1. Measured with the
spec moved aside and back: 2411 -> 2409, i.e. still the same **2** handlers banked in `cdaf636d`.
The tree reads 2409 against the ratchet of 2441, but that 32 of improvement is other agents' and is
not mine to bank.

## Item 2 — three `@Public()` auth routes with no rate limit (#23 / #242, P1)

**Sub-fix 1, DONE — the limiter.** `POST auth/google`, `POST auth/session-exchange` and
`GET auth/session-data/:userId` were the only `@Public()` routes on `auth.controller.ts` calling
no `enforceRateLimit`.

The identifier is the **subject**, not the source, and the limiter runs **after** the secret
check. Both choices are deliberate and are in a comment at the seam:

- the caller is the Next.js server (`frontend/lib/auth-session.ts`), so every request arrives from
  one server IP with no `x-forwarded-for`; a per-IP tier would be one global bucket throttling the
  whole product, and `fetchSessionData` retries twice then returns null, i.e. a 429 reads as
  signed-out.
- the subject on two of the three is attacker-supplied (`:userId` in the path), so limiting
  *before* the secret check would let an unauthenticated request exhaust a named user's budget and
  lock them out of session refresh.

Tiers added to `src/common/ratelimit/rate-limit.service.ts` — **required**, because `check()` denies
an undeclared tier, so a missing entry is an outage: `auth:google` 10/60 per email,
`auth:session-exchange` 300/60 per proof subject, `auth:session-data` 300/60 per subject user.
That file is outside the three modules named as my territory; it is a data addition with no other
call sites, and it is flagged here.

**Sub-fix 2, DONE — constant time.** `src/modules/auth/internal-secret.ts` reduces both sides to a
32-byte sha256 digest before `timingSafeEqual`, so the buffers are always the same length and
neither the secret's bytes nor its *length* is observable. This is the shape
`modules/support/core/support-inbound-secret.ts` established; it is re-expressed rather than
imported because that function's contract is a *stored* column that may still hold plaintext, and
importing support into auth would add a module edge for a pure crypto helper.

**Sub-fix 3, NOT APPLICABLE — reported rather than forced, as the brief allows.**
`@AuthorizedInService` exists and is well-formed, but:

1. `@Public()` cannot be removed. `JwtAuthGuard.canActivate` short-circuits on `IS_PUBLIC` **only**
   (`src/common/auth/jwt-auth.guard.ts:63-67`); these three routes carry no Bearer token, so
   removing it 401s all three.
2. Adding `@AuthorizedInService("INTERNAL_API_SECRET header")` *alongside* `@Public()` is inert.
   `IS_PUBLIC` wins the precedence in both `classifyHandler`
   (`src/common/auth/record-route-classification.ts:43`) and
   `route-classification-report.mjs:266`, so the report and the `x-exposure` stamp would still
   read "public".

Making the declaration honest needs `src/common/auth/**` — either teaching `JwtAuthGuard` to skip
on `AUTHORIZED_IN_SERVICE` (which would weaken the 57 in-service routes that legitimately require a
JWT today) or introducing a fourth classification that means "unauthenticated at the guard,
authorized by a named service". **That is a cross-territory design decision and is left for an
owner.**

**Test that fails without it** — `src/modules/auth/auth-internal-secret-gate.spec.ts` (14 tests).
Bite in the hermetic tree: **8 failed / 6 passed / 14 total** (the 6 that pass are the pure
`internalSecretMatches` unit tests, which needed the helper copied in to import at all; the 8
failures are the wiring). With the fix: **14 passed**; the auth + ratelimit pattern is
15 suites / 153 tests green.

## Item 3 — `safeAccessTableRead` degraded a user to zero permissions (#48, P1)

**The mechanism, measured.** The seam only swallowed what `isMissingRelationError` matched — but
that predicate is a **substring test for `"does not exist"`**, recursing through `cause`. It
therefore also matched `column "…" does not exist` (schema drift mid-deploy),
`role "…" does not exist`, `database "…" does not exist` and any wrapped message containing the
phrase. `computeUserPermissions` reads the resulting `[]` as "this user holds no permissions", and
`resolveUserPermissions` **caches that empty map** under the snapshot validity window — so one
transient failure removes a user's permissions for seconds, behind a `logger.warn` fired at most
once per process and no error the user can see.

**The decision, and why.** It throws. Every call site was grepped (7 in
`access-permission.resolver.ts`, 8 in `access-permission-members.resolver.ts`, 2 in
`access-grant-drains.ts`, 1 in `access.service.ts`, 1 each in `denied-modules.resolver.ts` and
`user-module-access.service.ts`) and **no caller depends on the empty array for its own sake** —
every one of them wants rows. Two are worse than silent: `DeniedModulesResolver.resolve` and
`UserModuleAccessService.getUserDeniedModules` **fail OPEN** on the fallback, because "no denied
modules" restores every module the org took away from that user, and that too was cached.

Failing closed *loudly* is already this repository's written policy for exactly this class:
`src/config/env.validation.ts:249` refuses `RBAC_MIGRATION_MODE=degrade` in production "because
missing entitlement tables must fail closed", and `EntitlementsService` denies rather than degrades
whenever that mode is off. A throw reaches `PermissionGuard`, which logs
`"PermissionGuard: unexpected error during authorization — denying"` with the permission key and
denies; nothing is cached, so the next request re-reads. The cold-bootstrap use the fallback
existed for is not reachable at boot — `AccessService.onModuleInit` performs no DB read.

**Changed**

- `safeAccessTableRead` -> `readAccessTable`, and its `fallback` parameter is **gone**, so the
  silent path cannot be reintroduced by passing one. 17 fallback arguments removed across the five
  files; the `ReadAccessTable` type in `access-grant-drains.ts` is now one-argument.
- `user-module-access.service.ts` — its own private `safeRead` twin removed for the same reason.
- `access-error-utils.ts` — deleted. It had no importer left and `check:dead-code` failed on it
  (`FAIL: 1 file(s) have no live importer`); exit 0 after deletion. `entitlements.service.ts` keeps
  its own local copy for the `RBAC_MIGRATION_MODE` path, which is deliberate and gated, and is not
  touched.
- `__tests__/role-grant-drain.spec.ts`, `__tests__/user-grant-drain.spec.ts` — their reader stubs
  caught and returned the fallback, i.e. **they swallowed exactly the way production did**, which
  is the mechanism register #48 says hid this. They are pass-throughs now.

**Test that fails without it** —
`src/modules/access/__tests__/access-read-failure-throws.spec.ts` (11 tests).
Bite in the hermetic tree: **8 failed / 3 passed / 11 total**. The 3 that pass at HEAD are the
negative controls: a plain connection failure already threw, and the two resolver-level tests that
depend on the stub rather than the seam. With the fix: **11 passed**; the whole access module is
41 suites / 408 tests green, and access + rbac + auth + e-sign is 92 suites / 736 tests green.

## Item 4 — `email.send` gated on a chat permission (#241) — RECORDED, NOT CHANGED

`src/modules/ai/core/controllers/chat-assistant.controller.ts` maps
`"email.send": "chat:messages:write"`, and `case "email.send"` reaches
`EmailOutboxService.enqueueAndTry` — a real outbound send. `"mail.send"` one line below uses the
matching `"mail:messages:send"`. So **any holder of `chat:messages:write` can send outbound email**
from an org address.

The key is **not** changed. A doc comment now sits at the mapping site naming the mismatch, naming
the matching key, and saying it is deliberate pending an owner — so it cannot be read as an
oversight in either direction, and cannot be "fixed" silently by the next reader.

**Options and their consequences, for the owner:**

1. **Change the key to `mail:messages:send`.** Correct by intent, and it makes the two send paths
   agree. Cost: every caller who reaches `email.send` today holding only `chat:messages:write`
   stops working, with a 403 from the confirm-action path. The AI assistant's email confirmation is
   a user-facing flow, so this is a visible regression for anyone whose role carries the chat key
   and not the mail key — which is the default shape, since `chat:messages:write` is a far broader
   grant than `mail:messages:send`.
2. **Require both keys.** Strictly safer than (1) for reviewers, identical blast radius for
   callers, and it adds a second concept ("this action needs two keys") that nothing else in
   `CONFIRM_ACTION_PERMISSION` uses.
3. **Introduce `ai:email:send`** and grant it to exactly the roles that should have it. Most
   honest, most work: a catalog key, a role-defaults decision, a frontend key parity check
   (root CLAUDE.md §5: a key used in `useCan` must exist verbatim in the backend catalog), and a
   migration-free reconciler pass.
4. **Leave it, documented.** What is committed. The exposure is unchanged and is now impossible to
   miss.

This is a product decision with real blast radius, which is why the register marked it unowned and
why it is not resolved here.

---

## Commands run

| Command | Exit | Number |
|---|---|---|
| `pnpm typecheck` (baseline, and after each of items 1/2/3) | 0 each time | 0 errors |
| `pnpm check:spec-typecheck` (after each item) | 0 | passed |
| `pnpm check:authz-deny` | 0 | uncovered 2441 baseline -> 2411 at end, ratchet 2441 |
| `pnpm check:route-classification` | 0 | 0 undeclared, 3623 handlers |
| `pnpm check:scope-application` | 0 | 144 resolutions / 144 applied |
| `pnpm check:dead-code` | 1 -> 0 | failed on `access-error-utils.ts`, passes after deletion |
| `pnpm check:cycles` | 0 | no circular dependency |
| `pnpm check:file-sizes` | 0 | 3575 files, all under 500 |
| `pnpm check:hardcoded-secrets` | 0 | 0 files |
| `jest --testPathPattern="sign-certificate-download-scope\|…\|e-sign"` | 0 | 12 suites / 108 tests |
| `jest --testPathPattern="modules/e-sign/"` (after item 1b) | 0 | 11 suites / 109 tests |
| `check:import-direction` (after item 1b) | 0 | — |
| `jest --testPathPattern="modules/auth/\|rate-limit"` | 0 | 15 suites / 153 tests |
| `jest --testPathPattern="modules/access/"` | 0 | 41 suites / 408 tests |
| `jest --testPathPattern="rbac\|permission\|module-access\|entitlement"` | 0 | 74 suites / 893 tests |
| `jest --testPathPattern="modules/access/\|rbac/\|auth/\|e-sign/"` | 0 | 92 suites / 736 tests |
| `eslint` on every file changed | 0 errors | 2 pre-existing warnings in `access.service.ts`, present at HEAD |

## Not mine — observed in the shared tree, reported not fixed

- `check:mock-surface` **exit 1**: phantom `CacheService.delByPrefix()` in
  `src/modules/organization/core/organization-custom-domains-404.spec.ts` (another agent's file).
- `check:spec-typecheck` failed twice mid-session on files being edited by other agents
  (`organization/core/organization-settings.service.ts` missing a `NotFoundException` import;
  `chat/chat-cross-tenant-404.spec.ts` importing a not-yet-written `./chat-entity-actor`). Both
  cleared on re-run / are not in my paths. The final run against my committed state is exit 0.
- ~~`GET /sign/envelopes/:envelopeId/audit` still binds only `orgId`.~~ **RESOLVED** — the
  coordinator named it and it is fixed in `47085372`; see Item 1b.
- `check:authz-deny`'s DELEGATE symbol link can report a handler COVERED on the strength of a spec
  file that asserts a deny about something else in the same file. It did exactly that for
  `GET /sign/envelopes/*/audit` throughout the period the route had no scope gate. The gate is a
  floor, not a signal — worth a register line for whoever owns it.

## Not run

- No e2e, no seeded database, no HTTP probe. Every proof here is unit-level jest plus the static
  gates. The 404-not-403 property is asserted at the service boundary (`rejects.toMatchObject({
  status: 404 })`), not through a live request.
- `pnpm lint` repo-wide was not run; only the changed files were linted.
