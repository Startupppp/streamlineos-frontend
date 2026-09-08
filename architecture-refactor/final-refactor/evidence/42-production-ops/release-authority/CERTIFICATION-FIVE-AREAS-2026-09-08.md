# Five-area certification run — 2026-09-08

Scope: the twelve certification items raised against Organization-level RBAC, Module-level
RBAC, Organization, Settings/module access, and Billing/payments. CRM and Inventory remain
excluded (root `CLAUDE.md`). Nothing outside those five areas was certified here.

## Commit pair

| Repository | SHA |
|---|---|
| `Streamlineos` (root + frontend) | `a028bf94f36be4973c497c4c582e484c210155d1` |
| `streamlineos-backend` | `514ea82daf01a848d01a5af1988939fa1de4915d` |

Backend `514ea82da` is this session's only code commit. The frontend was unchanged and is
verified at the SHA it already carried.

## Measurement environment

Co-located stack in `D:\localstack`, brought up for this run: PostgreSQL 18.6 on
127.0.0.1:5432 (`scratch_local`), Redis 5 on 6379, Upstash REST shim on 8079. The cluster
had crashed under memory pressure before this session and was restarted; recovery completed
cleanly. `scratch_local` was confirmed at journal head — 699 ledger rows against 699 journal
entries, last tag `1072_attendance_shift_membership_fks` — before any database proof ran.

## Item-by-item disposition

| # | Item | Verdict |
|---|---|---|
| 1 | Executable cross-tenant isolation and tenant-relationship tests | RUN — green |
| 2 | Seeded Organization/RBAC grant, descendant, revocation | RUN — green |
| 3 | Revoked sessions lose access immediately | RUN — green |
| 4 | Settings route-wide allow/deny/cross-tenant E2E | RUN — green, both halves |
| 5 | Remaining 25 unparsed frontend responses | ALREADY CLOSED — reproduced |
| 6 | Nine OpenAPI/controller disagreements | ALREADY CLOSED — reproduced |
| 7 | Billing tests require exact success and 404 statuses | ALREADY CLOSED — reproduced |
| 8 | Billing E2E response-contract violations | FIXED this session |
| 9 | Real PostgreSQL webhook replay/uniqueness tests | RUN — green, bite-proved |
| 10 | Entitlement checks cover every limited creation path | FIXED this session |
| 11 | Provider sandbox failure and recovery scenarios | FAILURE half RUN; RECOVERY half remains unprovable |
| 12 | Everything at one clean commit pair | RUN — one contended flake, named below |

## Evidence

### Static gates (all exit 0)

`check:settings-route-e2e-coverage` 159/159 routes from 12/12 controllers, 812 supertest
calls across 155 spec files · `check:plan-limit-enforcement` 14/14 keys, 35 DIRECT, 9
DELEGATED, 0 ORDER-VIOLATION, 9/9 `.insert(candidates)` sites covered · `check:operation-ids`
3,666 operations, 0 duplicates · `check:openapi-coverage` 3,666/3,666 error shapes, response
schemas and request schemas · `check:openapi-path-params` 3,666 checked · `check:owner-authority`
· `check:authz-deny` uncovered 2,222 against ratchet 2,231 · `check:scope-application` 151/151
resolutions reach a predicate · `check:record-access` · `check:module-gate` ·
`check:module-entitlement` · `check:permission-keys` 704 backend keys = 704 frontend union keys
· `check:tenant-isolation` · `check:vacuous-assertions` · `check:test-suppressions` 20/20
conditional, 6/6 quarantine, both at ratchet · `check:type-assertions` (ledger lowered 394 → 392)
· `check:baseline-integrity` 172 registered, 0 unregistered, 0 stale · `check:gate-wiring` ·
`check:file-sizes` · `check:kebab-case` · `check:transaction-callbacks` · `check:module-di` ·
`check:module-registration` · `check:evidence-seal` 7 seals, 106/106 files.

### Tenant-relationship integrity — item 1

```
TENANT_RELATIONSHIP_DB_URL=…/scratch_local node src/scripts/check-tenant-relationships.mjs
```
Mode `pg_catalog (scratch_local)`, ledger 699/699, 214 single-column FKs, 79 excluded CRM,
134 excluded Inventory, 1 excluded platform-global, **0 actionable**. Exit 0.

This closes the standing INCONCLUSIVE: the previous attempt was refused because the gate
correctly declined an unapproved remote Neon database. It now has an authorized disposable
database at current head.

### Typechecks and build

`tsc --noEmit` exit 0 · `check:spec-typecheck` exit 0 · `check:test-typecheck` exit 0 ·
`nest build` exit 0 · frontend `tsc --noEmit` exit 0 · frontend `next build` exit 0
(compiled in 2.5 min, TypeScript pass and route manifest emitted).

`check:test-typecheck` earned its place in this run: it caught
`test/security/bola/bola-bulk-fail-whole.spec.ts` constructing
`RecruitmentCandidateOpsService` with five arguments after it gained a sixth. ts-jest runs
with diagnostics off, so that spec was green over a broken construction. Typecheck is the
only gate that sees arity.

### Full backend unit suite

2,152 suites · 18,634 tests · 18,586 passed · 46 skipped (registered suppressions) · 1 todo ·
766 s at `--maxWorkers=3`.

One failure, named rather than absorbed: `ai-request-abort.integration.spec.ts` →
"aborts the in-flight signal when a real client hangs up mid-request". It runs a real HTTP
server and asserts inside a fixed `sleep(250)` window; under contention the request had not
reached the handler at all (`observed` was empty), which is scheduling starvation, not an
abort-propagation defect. Re-run alone immediately afterwards: **3/3 passes, three
consecutive runs**. The production code is not implicated; the test carries a load-sensitive
timing dependency. It is outside the five certified areas and is left as a named finding, not
silently counted as passing.

A second failure in the first full-suite pass was real and is fixed in `514ea82da`:
`razorpay-service-import-boundary.spec.ts` was **already red at backend HEAD `9ff8ab33d`**,
which added `src/scripts/verify-razorpay-sandbox.ts` (an adapter importer) without updating
the boundary spec or its snapshot. Found only because the whole suite was run at one commit;
that commit's own targeted runs could not see it.

### Disposable HTTP E2E — items 3, 4, 8

Config `jest-e2e.json`, `--runInBand --forceExit`. Collection confirmed free of the peer
worktree (`--listTests | grep -c worktrees` = 0).

Settings/organization/module-access/RBAC/billing/payments fences, session revocation, and the
billing and payments controllers: **16 suites · 787 tests · all passed · 833 s · exit 0**, with
**0 `ResponseContractViolation` and 0 `Email sent` lines** — the second is checked because this
repo has previously delivered 14 real ZeptoMail messages from a test sweep.

`session-revocation-live.e2e-spec.ts` passes: a tombstoned session is refused 401 over the
real guard chain on the very next request, with no TTL window.

### Seeded E2E against real Postgres — items 1, 2

```
node --env-file=D:/localstack/backend-local.env -r ts-node/register/transpile-only \
  test/helpers/run-seeded-e2e.ts scratch_local <spec>…
```
The runner preflights the target's migration ledger against journal head before Jest starts.

Run as two parallel lanes at the committed tree, both exit 0:

- Lane A — `settings-per-person-grant-lifecycle`, `settings-rbac-authorization`,
  `home-module-universal-access`, `home-self-service-universal`: **4 suites · 30 tests**.
- Lane B — `billing-entitlement-and-seat-isolation`, `ai-credits-reserve-race`,
  `payment-record-isolation`, `manual-payment-methods`: **4 suites · 27 tests**.

Grant and revocation scenarios run against real rows in `scratch_local`.
`home-module-universal-access` passes here, which settles the discarded number in the
honesty note below.

### Real-Postgres database specs — items 2, 9

```
DATABASE_URL=…/scratch_local ALLOW_DESTRUCTIVE_DB_TESTS=1 jest --config ./jest-db.json
```
`provider-event-ledger.db.spec.ts`, `payment-webhook-event-id-precedence.db.spec.ts`,
`org-hierarchy-descendant-protection.db.spec.ts` — **3 suites / 17 tests**, exit 0.

Bite-proved rather than trusted: the same command against port 5499 fails with
`connect ECONNREFUSED`, so the pass genuinely depends on a reachable database and is not a
suite that skipped.

The descendant half of item 2 lives in a `.db.spec.ts`, not a seeded-e2e spec — stated
plainly because it is the only descendant-protection test in the repository.

### Razorpay sandbox — item 11

`verify:razorpay-sandbox:self-test` **7/7**. Live run against `api.razorpay.com` with an
`rzp_test_` key: **3/3** — a wrong key secret maps to `BadGatewayException`, an invalid order
payload maps to `BadGatewayException`, and a 4xx is terminal (one attempt in 104 ms, not the
three-attempt retry budget). Exit 0.

**The recovery half is not proven and cannot be, by the script's own account:** Razorpay's
sandbox cannot be made to return a 5xx on demand. Related and left as a named gap rather than
an invented fix — `POST /v1/orders` is retried up to three times on 5xx/timeout with no
verified idempotency mechanism, so a timeout after Razorpay created the order can leave a
duplicate. Blast radius is orphan orders, not double charges, and the caller-computed
`receipt` keeps duplicates reconcilable. Closing it needs a verified answer about Razorpay's
idempotency support, not a guessed header.

### Frontend gates — items 5, 6

`check:response-contracts` — 2,674 seam calls scanned, **2,674 carrying a contract (100.0%)**,
unparsed 0 against a baseline of 0, 1,971/1,971 distinct routes parsed. The 25 are closed.

`check:contract-vendor` — `frontend/contracts/openapi.json` matches
`backend/openapi.json`, sha256 `299eaefe650fc775…`.

`check:permission-binding` — 2,425 bindings, **0 contract/controller disagreements**, 0 ungated.

`check:contract-drift` — 57 timesheets calls resolved, 0 baselined drift.

`openapi:check` (backend) — regenerates the document from the live controllers and diffs it
against the committed one: **3,666 operations, current, 0 disagreements**. The "nine" were
`GET|POST|PATCH /agent/v1/*`, fixed in backend `c2d2e5843`: a class-level `@Public()` outranked
each handler's `@RequirePermission`, so nine operations published `x-permission: null` while
`PermissionGuard` was enforcing `build:*` on every one of them. The gate was never absent; the
document understated it.

## What this run does NOT claim

1. **`home-module-universal-access.seeded-e2e-spec.ts` failed once, and the failure was mine,
   not the code's.** I ran it while two agents were mid-edit, so the app could not boot:
   `CareersService` had gained a `PlanLimitsService` parameter seconds before `CareersModule`
   gained the matching import. A full-application boot measured against a tree that is being
   written is not a measurement. It is recorded here because the number was produced, and a
   discarded number should be visible rather than deleted. Re-run at the committed tree the
   suite passes; that is the result the record stands on.

2. **`ai-request-abort.integration.spec.ts` is flaky under load** and is not fixed. Outside
   the five areas.

3. **13 of the 14 billing-enterprise routes remain without response-contract coverage.**
   `GET /billing/analytics` now runs through the interceptor; the affiliate, referral and
   enterprise-quote routes do not. Pre-existing, stated rather than implied by silence.

4. **Nine `assertWithinLimit` call sites remain DELEGATED** — the write sits behind a
   cross-file helper, so the gate proves the call happens but not that it precedes the insert.
   They are reported by the gate, counted as unproven, and not counted as a pass.

5. **CI wiring is unchanged.** Several of the suites run here are gated to
   `schedule`/`workflow_dispatch` in `ci.yml`/`db-gates.yml`, with the workflows' own comments
   stating they have never completed in CI. This run proves they pass on this machine at this
   commit pair. It does not make them per-PR blocking.

6. Nothing outside the five named areas was audited or certified.

## Product decision requested

Public candidate creation now enforces the `hrCandidates` quota, per root `CLAUDE.md` §8
("every creation endpoint for a limited resource calls `assertWithinLimit` before insert").
Two of the newly covered paths are `@Public()` and unauthenticated — the careers-page
application and external referral submission — so an anonymous applicant hitting an exhausted
quota receives `PaymentRequiredException` / `QUOTA_EXCEEDED`. Enforcement is correct and was
the whole point of the gap: without it the limit was bypassable by anyone holding the careers
URL. The message surfaced to an anonymous visitor is a separate product question and has not
been changed.
