# Bound the tenant-transaction connection hold

**Status:** in progress · **Owner:** backend · **Opened:** 2026-09-19
**Follows:** the stabilise phase landed the same day (process-failure handler, payment-provider timeouts, admission-gate sizing, readiness off the shared pool, sweep budgets, three unbounded registries, span sampling).

---

## 1. Problem

`TenantContextInterceptor` wraps every authenticated request in a Postgres transaction, which borrows **one exclusive pooled connection for the whole request lifetime** — including every millisecond spent in `fetch`, object storage, an LLM provider or an email provider.

`DB_POOL_MAX` is therefore the ceiling on concurrent authenticated requests for the entire process, across all 3,922 routes and all tenants. It is 15 on this deployment (AWS RDS). Only ~142 routes (3.6%) carry `@NoTenantTransaction()`.

The request-long transaction is **not** there for atomicity. `common/tenant/tenant-db.ts:7-13` states the actual reason:

> 557 of 767 service files never open a transaction, so they issue autocommit statements that cannot carry a `SET LOCAL` tenant GUC. Rather than rewrite them, this proxy makes `this.db.select()` resolve to the ambient `tx` whose GUC is already set.

Tenant scoping and connection lifetime are fused into one module. The requirement is "every query carries the tenant GUC"; the implementation also delivers "one exclusive connection, held for the whole request", which no caller asked for and none can opt out of per unit of work.

## 2. Goal

Reduce the time a pooled connection is held for work that is not database work, without weakening the tenant GUC guarantee, and make the improvement non-reversible by a future change.

## 3. Non-goals

- Raising `DB_POOL_MAX`. That trades one limit for a different one and is a deployment decision, not an architectural fix.
- Read-replica routing for the 1,646 GET routes. High value, but `DB_REPLICA_URL` is unset and `runInReplicaTenantRead` has 3 call sites; it needs a reader endpoint and live measurement first. Recorded in §7.
- Any change requiring a live database to verify. No disposable environment is available in this session, and production credentials must not be loaded to make a check pass.

## 4. Rejected approach — per-query borrow inside the proxy

The obvious deepening is to relocate the borrow into `createTenantAwareDb`: acquire a connection per unit of work, set the GUC, run, release. The proxy already intercepts every query in the codebase, so 557 service files would not change.

**This is not implementable with Drizzle.** `db.select()` returns a query builder bound to its target at call time, and that builder executes lazily on `await`. To route a query into a fresh transaction the proxy would have to hand back a builder already bound to a `tx` — which means acquiring a connection *synchronously* inside the proxy's `get`/apply trap. Connection acquisition is async. The builder cannot be rebound afterwards, and replaying a recorded method chain onto a real `tx` at `then` time would mean reimplementing Drizzle's builder surface.

Recorded so a future review does not re-propose it. Revisit only if Drizzle gains a deferred-execution binding.

## 5. Approach

Three moves, in increasing order of risk, all verifiable without a live database:

1. **Freeze the win already banked.** Every global `fetch()` on a request path now carries an abort signal (the Stripe and Razorpay calls had none and could pin a connection for Node's 300s default). A gate keeps it that way.
2. **Make the debt visible and shrink-only.** A ratchet counts routes that sit in files reaching an outbound seam without `@NoTenantTransaction()`. It may only go down.
3. **Sink the clearest offenders.** Five files opted their *streaming* AI route out of the request transaction and left the non-streaming twin inside it. The streaming sibling is the proven template: opt the twin out and wrap its database read in `runInTenantTransaction` exactly as the sibling does.

## 6. Todo

- [x] **T1** — Write this PRD, including the rejected approach and its reasoning.
- [x] **T2** — `check:outbound-timeouts`. Scans `src/` excluding scripts and tests; reports **17 outbound calls, all bounded**. Vacuity floor of 8, `--json`, `--self-test`, and an `ALLOWED` map that is empty. Wired into the CI `gates` job. Its self-test caught three false-positive classes in the scanner itself before it shipped: a `node-fetch` user-agent regex, `private async fetch(` declarations, and a locally-bound `fetch`. Bite-checked end to end with a planted unbounded call.
- [x] **T3** — `check:ai-route-tenant-optout`. Rule is file-local and exact: a controller that already carries `@NoTenantTransaction()` somewhere must not leave a sibling route behind without a frozen reason. **211 routes across 33 controllers; 66 frozen.** Two broader rules were built, measured and discarded — directory proximity (counted all ~900 `modules/chat` routes) and transitive import resolution (counted a plain `settings` read three hops from a model call). Wired into CI, bite-checked with a planted route.
- [x] **T4** — Sunk the two twins whose fix is exactly evidenced by a deployed sibling: `POST /payroll/me/payslips/:publicationId/ai/explain` and `POST /inventory/ai/insights/:insightId/explain`. Each gets `@NoTenantTransaction()` and has its evidence read wrapped in `runInTenantTransaction`; the payroll route also gains `@UseInterceptors(AiRequestAbortInterceptor)`, which the opt-out **requires** — `@NoTenantTransaction()` removes the tenant context `getAmbientAiAbortSignal` reads, so without it the released connection is bought with an uncancellable, still-billed provider call (PRD-C091). The inventory controller already carries that interceptor class-level. Scope was cut from five files to two deliberately: see §9.
- [x] **T5** — Verified.

## 7. Deferred, with reasons

> **Closed out on 2026-09-20 by `2026-09-20-deferred-items-lane.md`.** Four of the five were taken; **three of the five reasons below turned out to be wrong**, each in the direction of making the work look larger or different than it was. The original text is kept verbatim so the correction is legible.

| Item | Why not now | Outcome |
|---|---|---|
| Read-replica routing for GET routes | Needs a reader endpoint and cold/warm measurement. Largest remaining capacity win. | **Still deferred.** Genuinely blocked on infrastructure, and it now inherits the "15 writing GET routes" hazard below — a reader cannot serve a GET that writes either. |
| `accessMode: "read only"` for read-intent transactions | `withTenantOn` writes inside the request transaction during a relocation (`recordTargetRequest`), so a read-only mode would break relocation tracking. Needs that write moved first. | **Reason understated, verdict upheld.** The relocation write is conditional, but it fires on *every* request for an org mid-relocation, so read-only would 500 every GET on the target cell. The real blocker is bigger: **15 GET routes write inside the request transaction**. Not implemented — see the lane. |
| `kb-media` sharp transform below the seam | `MediaTransformRunner` is fire-and-forget; `kb-media` needs the transformed buffer before it uploads. Needs a synchronous transform seam. | **Reason WRONG** — `MediaTransformRunner` does not appear in `kb-media.service.ts`. No new seam was needed. **Done.** |
| Upload antivirus scan (`storage`, `kb-media`) | Holds a connection for up to 10s. Opting out needs every `this.db` touch on the path wrapped; worth doing, but needs a live request to certify. | **Reason WRONG on both counts** — the bound is 35s, not 10s, and the wrapping was already done. **Done**, plus `download` and `image`, which the ratchet caught. |
| Inline email send (~75 call sites) | `enqueueAndTry` inserts then sends inline with a 30s provider timeout. The durable path already exists (`registerAfterCommit`); migrating call sites is its own lane. | **Reason WRONG** — all 75 already funnel through one method. The real offender was `AutomationEmailService`, which bypassed the outbox entirely at ~123s worst case and was never durable. **Done.** |

## 8. Acceptance — met

| Check | Result |
|---|---|
| `check:outbound-timeouts` + self-test | pass · 17 calls, all bounded · bites on a planted violation |
| `check:ai-route-tenant-optout` + self-test | pass · 66 frozen, down from 68 · bites on a planted route |
| `tsc --noEmit -p tsconfig.test.json` | **0 errors in any file touched**; 62 pre-existing errors remain in 9 files owned by concurrent sessions |
| jest, affected suites | **3,391 passed / 3,392**, 327 suites |
| Pre-existing failure, separated | `notification-delivery-class.spec.ts` — its inventory lists `sign-notifications.service.ts` as reaching `EmailService`, but at HEAD that file imports `EmailSignService`. Both files unmodified; it fails on a clean tree. |

**Residual risk, stated.** T4 is verified by typecheck, unit test and structural equivalence to a deployed streaming sibling — **not** by a live request. No disposable database was available and production credentials were not loaded to make a check pass. The AI credit path these routes share is unchanged and already exercised in production by those siblings, so the change introduces no new failure class; it makes a route match its twin. Certify with one real request per route before trusting it in production.

## 9. Why T4 stopped at two routes

The audit named five files with the same shape. Three were left alone on evidence, not fatigue:

- `inv-ai-explain.controller.ts` carries a docblock stating that four handlers **keep** the request transaction and that the class-level interceptor is "strictly an improvement and never a behaviour change" for them. That is a considered position by the author, and `getDigest` / `getSupplierDelayBriefing` interleave their reads with the model call rather than loading evidence up front — so the wrap is not the mechanical one-liner it is for the other two.
- `kb-ask.controller.ts` has both of its asking routes already opted out; what remains is `getHistory` / `clearHistory`, which make no model call and correctly stay inside the transaction.
- `chat-assistant.controller.ts` and `inv-report-builder.controller.ts` likewise leave only non-model routes behind.

Those routes stay in the ratchet's frozen list, so the debt is recorded and cannot grow.
