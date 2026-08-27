# 31 — Declared degradation is tested, not described

**What to build:** When a dependency fails, the platform does the thing the PRD says it does — and there is a test that proves it. When it is overloaded, it sheds optional work in the declared order while authentication, revocation, ownership, the billing ledger, payroll posting, audit and mandatory security delivery keep their reserved capacity.

**Blocked by:** None — can start immediately

**Status:** ready-for-agent

**Not blocked by 20 (revised 2026-08-28).** This ticket originally listed 20 as a blocker for the control-plane row alone. It does not need it. That row has two halves and they belong to different tickets: *"refuse unknown or stale placement"* is **already true today** — `RegionRegistry.regionForOrg` raises for an unplaced organization and for one placed in a region this deployment does not serve — so this ticket asserts it against whatever placement resolution exists at the time. *"Serve valid signed placement cache"* is ticket 21's own acceptance criterion and is proved there, not here. The other seven dependency rows and the entire shed order have nothing to do with placement.

**The declared behaviour, from the PRD:**

| Dependency unavailable | Required behaviour |
|---|---|
| Control plane | Serve valid signed placement cache; refuse unknown or stale placement |
| Redis | Fall back only where correctness is database-backed; rate-limit conservatively |
| Search/vector index | Direct reads continue; search reports degraded, never bypasses ACL |
| Realtime adapter | Durable events remain; clients reconnect and catch up from watermarks |
| Email/SMS provider | Outbox retries and dead-letters; the request transaction stays committed |
| Read replica | Correctness-sensitive reads go to primary; shed stale-tolerant projections |
| Object storage | Preserve metadata state and retry; never mark upload or scan complete early |
| AI provider | Core product continues; metering reservation released or reconciled idempotently |

**Shed order under saturation:** prefetch and analytics refresh → AI enrichment → search freshness → non-mandatory notifications → ordinary writes.

**Grounding (2026-08-28, evidence not instruction — re-read at source):** two of these rows already have a foothold worth keeping. The rate-limit tier system **fails open** when a decorator names a key with no `TIERS` entry — the limit silently disappears — and `DEV_LIMIT_MULTIPLIER` makes every tier ten times larger outside production, so a conservative-fallback test written carelessly will pass for the wrong reason. Metering already reserves credits atomically before spend and settles refunds on under-run, which is the AI row's mechanism.

## Acceptance criteria

- [ ] Every row above has a test that removes the dependency for real and asserts the declared behaviour, not a mocked client returning an error.
- [ ] The search row is asserted specifically: degraded search must still apply ACLs in the index, never fetch globally and filter after.
- [ ] Overload sheds in the declared order, and each reserved category is proved to survive at full saturation.
- [ ] Overload returns explicit retry information and never accepts work it cannot recover.
- [ ] Every ingress has a bounded concurrency, queue depth, body size, execution time and per-organization cost, each with a number rather than a default.
- [ ] The rate-limit fallback test accounts for the dev multiplier and for the fail-open tier gap, or it proves nothing.

## Todo

- [ ] Kill the dependency, do not stub it. A stubbed Redis returns errors instantly; a real one returns them after a timeout, and the timeout is the behaviour under test.
- [ ] Check the CORS ordering while testing body-size limits — a parser rejection returned before `enableCors` loses its headers and reads as a network error rather than a 413.
- [ ] Test the shed order at the boundary, not well past it; everything sheds at 10× saturation and that proves no ordering.
- [ ] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md)

---

PRD: [`c28 — Organization-routed cells for 20M+ users`](../prd.md) · Candidate index: [`../README.md`](../README.md)
