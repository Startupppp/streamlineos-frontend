# User identity recovery assignment

Required acceptance and independent implementation review: [full-stack completion contract](README.md#mandatory-full-stack-completion-contract).

Status: **IMPLEMENTED — VERIFICATION-PENDING**, 2026-09-12. I1–I6 and every local gap check
are repaired with red-then-green regressions; no live browser, database, email-provider or
deployed evidence was obtained, so gates 1, 4, 7, 8 and 10 of the completion contract remain
BLOCKED. See "Verification record and handoff" at the end for the full result. This file is a
standalone implementation assignment. Read root `CLAUDE.md`, both repository `CLAUDE.md` files
and applicable `.claude/` instructions before editing. Paths below are relative to
`D:/projects/personal/Streamlineos`.

## Outcome and ownership

One verified email/provider identity can create an account, establish a distinct device session, reach the correct organization gate, switch organizations and revoke that device without affecting a different device. Failures remain actionable and cannot silently select another signed-in account.

Own `backend/src/modules/auth/**`, identity-specific tests, `frontend/lib/auth.ts`, `frontend/lib/auth-session.ts`, `frontend/features/auth/**`, `frontend/app/(auth)/signin/**`, `verify-email/**`, `magic-link/**` and auth-specific portions of `frontend/hooks/common/auth-hooks.ts` and `frontend/hooks/api/auth.ts`. Reserve shared auth-hook edits with the coordinator before beginning. Organization provisioning, invitation acceptance and membership mutation belong to their other lane owners. Propose shared schema, session service, global guard, API-client and cache-primitive changes to the coordinator before overlapping edits.

Implement bounded repairs in priority order below. First reproduce the selected defect, then change the smallest responsible seam and rerun its regression. Do not rewrite authentication or add providers as a cleanup step. Never contact external email, identity, Redis or database services during unit diagnosis. A real journey needs the named disposable environment; local unit success does not close that gate.

## Current flow map

All backend routes below use `backend/src/modules/auth/auth.controller.ts`; the listed public credential endpoints have explicit rate limits. The NextAuth bridge is `frontend/app/api/auth/[...nextauth]/route.ts` -> `frontend/lib/auth.ts`.

| Entry / API | Actual caller and service | Authority, persistence and cache | Existing evidence / missing case |
| --- | --- | --- | --- |
| `/signin` -> `POST /auth/email-otp` | `PasswordlessSigninForm` -> `useRequestOtp` -> `AuthEmailOtpService.requestEmailOtp` -> `findOrCreateUser` | Public IP tier; normalized email; `users`, `emailOtpCodes`; email provider send | `auth-passwordless-isolation.spec.ts`; concurrent resends/delivery remain unproved |
| `POST /auth/email-otp/verify` | `useVerifyOtp` -> `verifyEmailOtp` -> `signInWithMagicToken` | Active account check; attempt counter; atomic used-at claim; writes `magicLinkTokens` | `auth-otp-brute-force.spec.ts`; real parallel expiry/claim rollback missing |
| `/magic-link?token=...` -> `POST /auth/magic-link/verify` | `MagicLinkPage` -> credentials authorize -> `AuthMagicLinkService.verifyMagicLink` | Hash lookup, atomic unconsumed/unexpired claim, active/nondeleted account, membership resolver, device session, session-cache invalidation | `auth-passwordless-isolation.spec.ts`, token suites; browser recovery and old-session false positive missing |
| `POST /auth/magic-link` | `useSendMagicLink` -> `requestMagicLink` | Public IP tier; shared identity upsert; email failure consumes issued token | Provider delivery/retry requires disposable transport |
| `/verify-email` -> `POST /auth/verify-email` | `useVerifyEmail` -> `AuthEmailVerificationService.verifyEmail` -> credentials bridge | Read token, separate update/delete, then issue auto-login token | Source defect I2; previous simulated reproduction is not rerun evidence |
| `POST /auth/resend-verification` | `useResendVerificationEmail` -> `resendVerification` | Generic response; deletes prior verification rows, inserts new hash, sends email | Delivery failure/concurrent resend test gap |
| `POST /auth/register` | Public legacy API -> `AuthService.register`; no frontend `/auth/register` caller found | Immediately creates verified user, organization, owner membership, trial and modules; identity projection after transaction | Placement compensation suite passes; proof-of-email defect I3 |
| Google callback -> `POST /auth/google` | NextAuth `signIn` -> `resolveGoogleUser` -> `AuthService.googleOAuth` | Internal-secret boundary; Google account ID lookup then normalized-email link/create; login session | `auth-internal-secret-gate.spec.ts`; provider claim trust and simultaneous create require further tests |
| Session read -> `GET /auth/session-data/:userId` | NextAuth session/jwt callbacks -> `fetchSessionData[Cached]` -> `getSessionData` | Internal secret; 60s backend `CACHE_KEYS.userSession(userId)`; identity organization index + live membership + subscription/module reads | Source traced; failure/null routing and post-mutation freshness need integrated checks |
| Session read -> `POST /auth/session-exchange` | `exchangeSessionForBackendJwt` -> controller | Internal secret + signed 30s proof + nonce + account/membership checks; returns session-bound JWT | `auth-session-exchange.spec.ts` passes; frontend cache key breaks device identity (I1) |
| Switch -> `POST /organization/switch` | `useSwitchOrg` -> organization lane; then session update and Query clear | Refresh result currently ignored; 18s timeout; claim update must match returned organization | I6; cross-lane integration test needed |
| Sign out -> `POST /auth/logout` | `useSignOut` -> `AuthService.logout` -> `SessionsService.revokeCurrent` | Token session subject; clears client token/Query caches then NextAuth signout | Backend tombstone suites exist; offline logout and two-device end-to-end missing |

## Prioritized repairs

### I1 — P0: backend JWT cache merges separate device sessions (confirmed source defect)

Evidence: `frontend/lib/auth.ts:211` constructs `${userId}:${claims.orgId ?? ""}`; `auth-session.ts` keeps that token in a process-level Map. Exchange signs `sessionId` into the returned JWT. Device B with the same user/organization on the same worker therefore receives device A's token. A token-based logout can revoke A; a later login can reuse the revoked cached token. This is session confusion within one account, not a claim of cross-user disclosure.

- [ ] Exercise the real NextAuth session callback with two session IDs for one user/org and a stubbed exchange. First callback fills the store; second must receive a JWT for its own session. Decode and assert the session claim, not merely unequal strings.
- [ ] Include user, session and org in the cache identity; add scoped in-flight coalescing only if measured contention requires it (the current Map does not provide it). Bound/evict expired entries (current expiry removal only happens on lookup, allowing abandoned keys to remain).
- [ ] Reject/recover malformed or missing session IDs through the established login path; inspect the existing random-ID compatibility fallback before changing it. A new fallback ID must not bypass server session registration/revocation.
- [ ] Acceptance: concurrent A/B sessions stay distinct; revoke A leaves B usable; new login after A logout succeeds; org A/B tokens stay isolated; expired entries cannot grow indefinitely. Coordinate server-store invalidation with logout; clearing the browser token cache alone cannot clear a server Map.

### I2 — P1: verification is not atomically consumed (confirmed source defect)

Evidence: `auth-email-verification.service.ts:27-65` reads a valid record then independently updates users, deletes *all tokens for the identifier* and inserts a login token. Two requests can both pass the read and issue different login tokens. A failure between writes can burn verification without issuing login; a concurrent resend can be deleted by an older request.

Historical evidence (2026-09-12): a deterministic adapter around the actual verification method produced two successes and two login tokens from one proof (expected one; exit 1, no external connections). This is not PostgreSQL proof; preserve the interleaving in a durable regression rather than rely on the temporary harness.

- [ ] Add a concurrent two-call reproduction against the actual service with a controlled token-store seam, then a disposable database race test for transaction correctness.
- [ ] Claim the exact unexpired hashed token atomically and perform verified-state plus auto-login-token writes in the same transaction. Claim failure returns the existing invalid/expired contract. Preserve a newly resent token created after the old token was selected.
- [ ] Add active/deleted-account checks before issuing login material. Downstream magic verification already denies inactive/deleted accounts; preserve that second boundary.
- [ ] Acceptance: exactly one successful result for a token; expired/replayed token produces none; rollback permits safe retry after insert failure; resending versus verifying has documented deterministic behavior.

### I3 — P1: public legacy registration asserts email verification without proof (confirmed source defect)

Evidence: controller `register` is `@Public()` and service `register` sets `emailVerified: new Date()` from arbitrary submitted email. It neither validates email possession nor sends verification. The current `/signin` uses OTP/Google and a frontend search found no `/auth/register` caller. Absence of a frontend caller does not prove no external clients.

- [ ] Search SDKs, API contracts, tests, docs and external-client compatibility records for legacy registration. Record whether it must be retained. Coordinate its provisioning transaction with the organization owner.
- [ ] Remove unsupported exposure if no supported consumer exists, updating OpenAPI/contracts/tests; otherwise require the established verified identity before provisioning. Do not add a second signup engine or grant verification from input.
- [ ] Acceptance: anonymous caller cannot create a verified identity for another address; OTP/Google new-user setup remains supported; existing account request stays enumeration-resistant; transaction/index failure does not create a second organization on retry.

### I4 — P1: failed credentials sign-in can report success for an unrelated existing session (confirmed source defect)

Evidence: `frontend/hooks/common/auth-hooks.ts:57-74` falls back from a failed token sign-in to `Boolean(session?.user)`. An already signed-in user A opening invalid user B invitation/magic material can be reported as successfully signed in. Invitation outcome handling is owned by the people lane; this helper owns truthful identity establishment.

- [ ] Reproduce with failed credentials result plus existing A session; require failure unless success is positively bound to the newly established intended session. Also test server success with lost response using the agreed identity/session proof.
- [ ] Remove unconditional existing-session success; return an explicit outcome that callers can distinguish. Do not retry a consumed single-use credential. Coordinate any result-contract change with invitation callers.
- [ ] Acceptance: invalid/expired token never navigates as successful because another account exists; genuine successful sign-in navigates once; ambiguous network outcome offers safe reauthentication without claiming success.

### I5 — P2: sign-in controls contradict available actions (confirmed source defects)

Evidence: `frontend/features/auth/components/passwordless-signin-form.tsx:177` renders Verify only for 1–5 digits while line 181 disables it unless six, so the manual control is never usable. Auto-submit still exists; this does not mean OTP login always fails. `signin/page.tsx` exposes Microsoft from `!!NEXT_PUBLIC_MICROSOFT_ENABLED`, but `auth.ts` registers only Google and Credentials. Both provider flags also treat the string `"false"` as true.

- [ ] Make six-digit paste, keyboard submit and explicit button verification converge on one pending-guarded action. Render a usable fallback, visible progress and inline error/live-region feedback; prevent double request from auto-submit plus click.
- [ ] Render only configured supported providers from a canonical availability contract; parse booleans explicitly. Remove unsupported Microsoft surface/hook if product support is absent; do not implement a new integration in this assignment.
- [ ] Acceptance: 0–5 digits cannot submit; six digits can submit exactly once; resend/back while verification is pending cannot redirect with a stale response; 429 cooldown, network error, expired code, keyboard focus and 320px view are usable.

### I6 — P1: switch success ignores failed claim refresh (confirmed control-flow gap; observed symptom unverified)

Evidence: `useSwitchOrg.onSuccess` awaits `refreshSessionClaims` but ignores its nullable result, clears queries and redirects. The helper resolves null after 18s or update failure. Server `fetchSessionData` makes up to two 8s attempts, so a stalled identity read can materially delay transitions; this is not proof of the reported 1–2 minute provisioning cause.

- [ ] Coordinate a single switch contract with organization/frontend-data owners: block tenant reads during switch, require fresh session.orgId equals mutation result, then release reads and navigate. On timeout show recoverable pending/error state; do not announce completed switch.
- [ ] Test delayed old-org query completion across switch, rejected switch, refresh null, refreshed wrong org, two tabs, suspended destination and rapid A/B/A switching. Clear/cancel only under the agreed Query ownership contract.
- [ ] Fence or serialize refresh generations: timeout resolves null without cancelling NextAuth `update()`. Test timeout of A, successful switch to B, then late A completion; stale completion must not overwrite or release reads under the new scope.
- [ ] Instrument identity read, exchange and claim refresh separately in a disposable run; use bounded retry only for transient statuses. Never cache authorization failures as a successful session to reduce latency.

## Required gap checks before closing this lane

- [ ] Auth transport deadlines: test stalled headers and bodies for credentials, Google bridge, session-data and session-exchange. Credentials Axios and Google fetch lack local deadlines; session fetch timers clear before body parsing in `frontend/lib/auth-session.ts`. Bound the whole operation through parsing and clear timers in finally. Ambiguous one-use-token consumption requires safe reauthentication, not blind retry; infrastructure timeouts are a separate check.

- [ ] Identity creation: mixed-case/trimmed email, simultaneous OTP/magic/Google creation, unique-email conflict recovery, inactive/deleted identity, malformed DTO and rate-limited request. `findOrCreateUser` already uses conflict fallback; preserve it. Google new-user transaction lacks equivalent fallback: reproduce before labeling it broken.
- [ ] OTP: first/fifth/sixth wrong attempt; resend invalidates prior code; parallel resends and delivery inversion; expiry between initial read and atomic claim; failure after consume before auto-login insert. Current consume predicate checks usedAt but not expiry/attempts at final claim: establish race evidence before repair.
- [ ] OAuth: verify trusted provider email semantics, subject binding, missing email, denied consent, wrong secret, duplicate callback, existing email account linking and disabled/deleted account. Use provider fixtures locally; real provider verification remains environment work.
- [ ] Verification page: missing token, replay, transient failure then retry, unmount/remount after `attemptedTokens` entry, navigation to a different token, and successful verification followed by failed login. The module-level Set can suppress remount work without restoring UI result; reproduce in a browser/component test before changing dedupe.
- [ ] Session: no org routes to setup, suspended preference shows access-suspended, owner reaches organization gate, employee reaches employee gate, platform operator uses its dedicated route. Exercise actual server layout + `requireSession`/wizard/access seams, not only isolated predicates.
- [ ] Revocation: current, all-other, admin, inactive account, expired session, missing session, Redis miss/error and database error. `JwtAuthGuard` already has tombstone/database fallback: inspect it and existing session tests before suggesting new caching. Session exchange currently checks Redis tombstone but not the session row; determine acceptance policy and test revoked-session exchange with absent Redis, without falsely claiming issued JWT necessarily bypasses guarded APIs.
- [ ] Logout: a failed backend logout is swallowed by `useSignOut`; verify cookie clearing and report whether server revocation completed. Reproduce offline logout/reconnect and distinguish local signout from remote-device revocation. Do not silently promise global revocation.

## Cache and cleanup contract

| Data | Correct owner / existing reuse | Required invalidation / safety |
| --- | --- | --- |
| Backend bearer JWT | Server auth store, scoped user + device session + org | Expiry/size eviction; revoke/logout cannot contaminate another session; no localStorage or shared response cache |
| Session profile/gates | Backend `CACHE_KEYS.userSession` (60s); React request cache on web tier | Membership, switch, profile, onboarding and billing mutations must invalidate after commit; inventory each writer with its owner |
| Credentials/proofs/token claims | Existing token tables, one-use atomic claims | `no-store` for HTTP identity/token responses; never memoize verification outcomes as reusable credentials |
| Organization picker and permissions | Existing Query keys/access provider | Agree switch cancellation and tenant-key ownership with frontend-data lane; dedupe shared reads without hoisting page-specific data into global bootstrap |

- [ ] Search declarations and consumers before adding identity types/schemas/hooks. Reuse canonical response schemas; replace `unwrapBackend<T>` forced casts at security boundaries with runtime contracts without unrelated API refactoring.
- [ ] Treat legacy register, Microsoft hook/surface and redundant auth response types as candidates, not preapproved deletions. Preserve live verify-email/resend and migration/token schema compatibility until proven unused.
- [ ] Every deletion needs import graph/knip evidence, dynamic route/export/script/doc references, relevant build and contract checks. Schema removal additionally needs migration/raw SQL/FK checks. Do not erase historical migration evidence or delete a live table because it is empty.

## Verification record and handoff

### Prior audit (superseded, kept for provenance)

The 2026-09-12 audit ran five backend auth suites (**5 suites, 38 tests passed**) without
changing application source. That run did not reproduce I1–I6. It is superseded by the
implementation record below.

### Repaired, with the evidence that closed each one

| ID | Outcome | Evidence |
| --- | --- | --- |
| I1 | REPAIRED | Backend-JWT cache key is now user + session + org; the store is size-bounded with expiry-first eviction and a scoped `invalidateBackendJwtSession` seam. The unregistered-session fallback is marked `~` and skips the exchange rather than minting a token for a session the backend never registered. `lib/auth-session-store.test.ts` + `lib/auth-session-callback.test.ts` — **18 tests**, decoding the JWT and asserting the `sessionId` claim, not merely unequal strings |
| I2 | REPAIRED | Conditional `DELETE … WHERE token = $hash AND expires > now() RETURNING` claim, all writes in one transaction, only the claimed row removed, active/deleted account gate on the same invalid/expired contract. `auth-email-verification-consume.spec.ts` — **10 tests**, including an explicit BITE proving the old two-read path let both concurrent calls succeed |
| I3 | REMOVED | `POST /auth/register`, `AuthService.register`, `registerSchema`/`RegisterInput`, `authRegisterResponseSchema`, its README rate-limit row and its e2e cases are gone; the e2e suite now asserts 404. Consumer search found no frontend caller, no SDK and no doc reference. `auth-register-placement-compensation.spec.ts` deleted after confirming `organization-creation.service.spec.ts:303` covers the same `unplaceOrganization` compensation on the live org-creation path |
| I4 | REPAIRED | `signInWithMagicToken` returns `MagicLinkSignInOutcome`; success requires both session probes readable, a session present afterwards, and a `sessionId` different from the one captured before the attempt. `auth-hooks-sign-in-outcome.test.tsx` |
| I5 | REPAIRED | Verify converges on one pending-guarded action that cannot double-submit; provider availability moved to `lib/auth-providers.ts` with explicit boolean parsing (`"false"` was truthy); Microsoft surface and `useMicrosoftSignIn` removed. `passwordless-signin-form.test.tsx`, `oauth-buttons.test.tsx`, `auth-providers.test.ts` |
| I6 | REPAIRED | Switch cancels in-flight tenant reads before the POST and releases reads only when the refreshed `session.orgId` equals the mutation result; a generation counter fences a late switch-A completion under switch-B. `auth-hooks-switch-org.test.tsx` |

### Gap checks

| Check | Result |
| --- | --- |
| Auth transport deadlines | REPAIRED — axios timeout on credentials, AbortController on the Google bridge, `clearTimeout` moved into `finally` so a stalled body is bounded through parsing |
| Identity creation | REPAIRED (Google new-user path gained the conflict fallback `findOrCreateUser` already had) / PARTIAL — malformed DTO and rate-limited request live in `dto/**` and remain open |
| OTP | REPAIRED — expiry and the attempt cap are re-asserted at the final claim; consume + verified-state + login-token insert are one transaction. Concurrent double-verify and resend ordering are CORRECT-BY-DESIGN with proof, not repairs |
| OAuth | Recorded per item as CORRECT-BY-DESIGN / ALREADY-COVERED / BLOCKED in `auth-google-oauth.spec.ts` — 16 tests. Denied consent never reaches the service and is stated as such rather than faked |
| Verification page | REPAIRED — `attemptedTokens` became a `Map` recording each token's outcome, so a remount renders the recorded result instead of the pre-verification "check your email" panel. Different-token case was CORRECT-BY-DESIGN |
| Session | PASS — `app/(authenticated)/session-gate.test.tsx`, 13 tests through the real server layout + `requireSession` + `resolveWizardGate` + MFA. A stale case in `wizard-gate.test.ts` was red and is fixed: it wrote the employee gate cookie under scope `user-1` while writer and reader both use `${userId}--${orgId}` |
| Revocation | PASS, already covered — `sessions-admin-revoke`, `sessions-revocation-tombstone`, `sessions-tombstone-failure`, `sessions-list-upsert`, `sessions-list-bounds`, `jwt-guard-revocation`: **6 suites / 36 tests**. No duplicate specs written. Session exchange additionally gained the guard's own fall-through: an absent tombstone is a cache MISS that consults `user_sessions`, which it previously skipped |
| Logout | REPAIRED — the swallowed backend call now yields a `SignOutOutcome` distinguishing local sign-out from server revocation; local sign-out still always runs and the message no longer implies remote devices were signed out |

### Cache and cleanup

`PATCH /me/profile` wrote `users.name/firstName/lastName/image` — all projected into the 60s
`CACHE_KEYS.userSession` payload — and busted nothing. Repaired with the canonical
invalidate-now-and-after-commit pattern; `me-profile-session-cache.spec.ts`, 7 tests, bite-proved
(5 fail with the call removed). **Cross-lane finding, not fixed here:** no writer under
`src/modules/billing/**` busts `CACHE_KEYS.userSession`, yet `getSessionData` projects `plan`
from `subscriptions`, so a plan change is invisible for up to 60s. Owner: access/billing lane.

### Checks run

Backend — 13 auth suites / 100 tests; OTP claim 26; sessions + guard revocation 36; appsec
session-fixation 21; `tsc -p tsconfig.test.json` clean for this lane. Frontend — 11 auth suites /
102 tests; `tsc --noEmit` clean for this lane; `check-query-scope`, `check-no-arbitrary-colors`,
`check-client-pages`, `check-contract-vendor` pass; `madge --circular` **zero cycles**.

Known failures **outside this lane**, untouched: backend `tsconfig.build.json` fails on
`billing-payment-activation.ts` (2); backend spec typecheck has 38 errors in billing /
organization / access; frontend `tsc` has 3 (billing, chat, invitations `status: string` vs its
enum union); `check-named-handlers` flags `plan-card.tsx:87`; `check-file-sizes` lists 5
pre-existing unregistered files.

### Real-database proof — CLOSED

`pnpm verify:auth-races` (`backend/src/scripts/verify-auth-claim-races.mjs`) races the
claims on a real server. Measured on **PostgreSQL 18.6, read committed**, against the local
disposable `scratch_local`: **10/10 invariants held**, and the run reproduces each OLD defect
on the same server rather than only asserting the repair.

| Race | Old shape | Repaired shape |
| --- | --- | --- |
| verification token, two concurrent callers | read-then-act lets **both** proceed (2 rows) | atomic `DELETE … WHERE expires > now()` — exactly one wins |
| verification rollback after the claim | — | token still claimable on retry |
| OTP expired at claim time | `used_at IS NULL` alone **consumes it** | refused |
| OTP attempts exhausted at claim time | `used_at IS NULL` alone **consumes it** | refused |
| two concurrent OTP consumes | — | exactly one wins |
| a second writer against an uncommitted claim | — | genuinely **blocks** on the row lock, then re-evaluates after the commit and matches 0 rows |

That last row is the part no mock can express: the loser does not error, it waits and then
finds the predicate no longer true. The probe takes its own `AUTH_RACE_PROBE_DATABASE_URL`,
never falls back to `DATABASE_URL`, refuses a non-loopback target without `--allow-remote`,
and removes every row it created.

Deletion evidence for I3: `pnpm exec knip --no-progress` reports 4 unused exports, **none in
`modules/auth`** — the register removal left no orphan. `insertTrialSubscription` is retained
and still used by the live org-creation path (`bootstrap-cell-organization.ts:81`).

### BLOCKED — do not read the above as a passing release

- **Real email delivery**, provider retry and true delivery inversion — the transport is a stub throughout.
- **Browser evidence.** No screenshots, no keyboard/mobile/zoom pass, no 320px check in a real browser. `verify-email`, `magic-link` and `invitation/[token]` page branches are typecheck-and-source verified only; no component test covers them.
- **Combined journey** at one root/backend revision pair: signup → correct gate → two devices → org switch → revocation. Not exercised.
- `nest build` not green because of the billing-lane errors above, so the backend build gate is unproven for this lane in isolation.

### Cross-lane contract changes the coordinator must integrate

1. `signInWithMagicToken` returns `MagicLinkSignInOutcome`, not `boolean`. The three org-setup call sites had `if (!signedIn) throw`, which an object return makes permanently inert while the typecheck stays clean; they were repaired here, but any new caller must branch on the discriminant.
2. `POST /auth/register` is gone. `backend/openapi.json` was regenerated and vendored to `frontend/contracts/openapi.json`. **That regeneration also captured 3 net-new paths from other in-flight backend lanes** (2715 → 2718), so the contract must be regenerated and re-reviewed at the final one-revision-pair build.
3. `AuthController` now injects `DRIZZLE`. Any test constructing it must provide a session-row double or the exchange fails closed — `test/security/**` is run by jest but never typechecked, so this does not surface at compile time.
4. `MeService` gained a `CacheService` parameter; its one direct construction was updated.
5. `useSessionClaimsRefresh`'s 18s timeout still cannot cancel NextAuth's `update()`. Every consumer is fenced by generation; cancelling the update itself needs the session provider.
