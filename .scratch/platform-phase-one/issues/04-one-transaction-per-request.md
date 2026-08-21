# 04 — One database transaction per authenticated request

**What to build:** Authorization runs on every authenticated request and is the most frequently executed path in the product. Guards run before the interceptor that establishes tenant context, so each access check opens its own transaction — and permission resolution opened one even when every cache was warm, paying a full begin/set-local/commit round trip to return a cached value.

Read the caches before opening any transaction, so a warm hit costs zero round trips, and ship a regression test that pins the ceiling.

Measured baseline: 3.2 to 4.0 transactions per request. A request returning nothing but the caller's own token payload cost 4.0 transactions and 1,266 tuples — that cost is entirely the guard chain.

**⚠ Verification is currently blocked.** The Upstash quota is exhausted, so every cache read falls through to Postgres and no measurement is trustworthy. With the cache down the same endpoints measured 13.8, 10.2 and 28.4 transactions — a 4–9× degradation that also demonstrates caching here is load-bearing, not an optimisation. The code change exists and typechecks; only the measurement is outstanding.

**Blocked by:** None — can start immediately, but cannot be accepted until the cache quota is restored

**Status:** ready-for-agent

- [ ] Cache reads occur before any transaction is opened, on both the warm and cold paths
- [ ] Warm and cold paths produce identical permission sets — the two must not diverge
- [ ] Measured transactions per request drop against the 3.2–4.0 baseline, measured with the cache healthy
- [ ] A regression test asserts a transaction ceiling per request so this cannot silently regress
- [ ] An inactive or suspended member still resolves to no permissions
- [ ] If the change does not measurably reduce transactions, revert it rather than keeping it on plausibility
