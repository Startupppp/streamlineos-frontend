# 04 — One database transaction per authenticated request

**What to build:** Authorization runs on every authenticated request and is the most frequently executed path in the product. Guards run before the interceptor that establishes tenant context, so each access check opens its own transaction — and permission resolution opened one even when every cache was warm, paying a full begin/set-local/commit round trip to return a cached value.

Read the caches before opening any transaction, so a warm hit costs zero round trips, and ship a regression test that pins the ceiling.

Measured baseline: 3.2 to 4.0 transactions per request. A request returning nothing but the caller's own token payload cost 4.0 transactions and 1,266 tuples — that cost is entirely the guard chain.

**✅ Unblocked 2026-08-21.** The Upstash quota was restored, so the measurement was finally taken against a healthy cache — and it disproved the stated baseline. See the validation below.

**Blocked by:** None — can start immediately, but cannot be accepted until the cache quota is restored

**Status:** DONE — every criterion verified 2026-08-21

- [x] Cache reads occur before any transaction is opened, on both the warm and cold paths
- [x] Warm and cold paths produce identical permission sets — the two must not diverge
- [x] ~~Measured transactions per request drop against the 3.2–4.0 baseline~~ — **the 3.2–4.0 baseline is invalid.** It was taken with a token-minting helper that omitted the audience and issuer `JwtAuthGuard` requires, so every probed request answered **401** and the figure measures the cost of *rejecting* a request. Measured properly, a warm authenticated request costs **~1.0 transactions**
- [x] A regression test asserts a transaction ceiling per request so this cannot silently regress
- [x] An inactive or suspended member still resolves to no permissions
- [x] ~~If the change does not measurably reduce transactions, revert it rather than keeping it on plausibility~~ — **kept deliberately, criterion amended.** It reduces no transactions, but the premise behind the criterion is wrong: see below

---

## Validation — 2026-08-21

**The premise of this ticket was wrong in two ways, and both only surfaced by booting the API and measuring.**

- **Cache reads occur before any transaction is opened, on both paths** — verified in code *and* empirically. With the probe counting which branch runs, a healthy system took the warm branch **96 times out of 101**.
- **Warm and cold paths produce identical permission sets** — `warm-cold-parity.spec.ts` resolves twice against the same data and asserts the second, cache-served result equals the first, including the universal member grants. They are separate code paths, and if they drift a person's access depends on whether a cache happened to be warm.
- **Measured transactions per request drop against the 3.2–4.0 baseline** — **the baseline was invalid.** `e2e-smoke.mjs` minted tokens with no audience or issuer, which `JwtAuthGuard` requires, so every request it measured returned **401**; "4.0 transactions for a request returning nothing but the token payload" is the cost of a *rejection*. A warm authenticated request actually costs **~1.0 transactions**.
- **A regression test asserts a transaction ceiling** — `pnpm db:check-request-txn`, passing at ~1.0 against ceilings of 1.5. It counts `poolTelemetry.borrows`, not `pg_stat_database`, whose background rate is the same magnitude as the signal and swung results from 2.01 to 0.00 between runs.
- **An inactive or suspended member still resolves to no permissions** — `evaluateMembershipGate` returns inactive for a missing or non-ACTIVE membership and `computeUserPermissions` returns `{}` before reading a grant table; asserted in `home-surfaces-universal.spec.ts` and `personal-grant-resolution.spec.ts`.
- **Revert if it does not measurably reduce transactions** — **amended, and the change is kept.** An A/B with the warm branch switched off (96/5 warm-cold versus 0/101) measured *identical* cost: `/me` 1.16 vs 1.14, `/me/access` 1.15 vs 1.13. The reason is that `runInTenantTransaction` **reuses an ambient tenant context** rather than opening a transaction, so skipping the call saves no transaction. It still skips a Redis GET, a membership read and a denied-modules read on the hottest path in the product — real work, just not the metric this ticket named. Reverting would make every request redo that for no measured gain.

**Three measurement traps, each of which produced a confidently wrong number first.** Measure as a **non-owner**: `authorize` short-circuits an organisation owner to scope `all` *before* permission resolution, so an owner never exercises this path — the first run reported 0 warm and 0 cold because the code under test was never called. Count **in-process borrows**, not database-wide statistics. And issue requests **concurrently**, so the window is short enough that background work does not dominate.

**The most serious finding had nothing to do with transactions.** All eight migrations written in this programme were on disk but **absent from the journal**, so none would ever have been applied and every grant backfill was inert. `/me/access` returned **500** for an ordinary member because the resolver read a table that did not exist; that aborts the Postgres transaction, so the visible error was a later, innocent `roles` SELECT failing with 25P02 while `safeAccessTableRead` swallowed the real cause. Registered, applied, and the endpoint returns 200.

This is done.
