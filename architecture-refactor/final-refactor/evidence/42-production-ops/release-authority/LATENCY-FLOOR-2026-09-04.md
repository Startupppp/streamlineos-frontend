# The measurement floor: why the performance criteria cannot be judged on this machine — 2026-09-04

Bears on PRD-C006, C085, C140, C141, C142, C143, C145, C149 and C151. **This does not excuse the code.
It locates the cost**, and it changes what those criteria can honestly be measured against here.

## The measurement

Two probes from this machine against the services the application actually uses. Both are transit
measurements, not workload measurements.

**Neon Postgres** (`ep-polished-art-azutwo4c.c-3.ap-southeast-1.aws.neon.tech`), as `streamline_app`
on an already-warm connection:

| Operation | n | p50 | p95 | min |
|---|---:|---:|---:|---:|
| `SELECT 1` | 20 | **88.0 ms** | 96.0 ms | 87.2 ms |
| `BEGIN` + `SET LOCAL app.organization_id` + `SELECT 1` + `COMMIT` | 20 | **447.9 ms** | 463.7 ms | 439.2 ms |

**Upstash Redis** (`cheerful-prawn-119475.upstash.io`), HTTP REST:

| Operation | n | p50 | p95 |
|---|---:|---:|---:|
| `GET` (200-byte value) | 25 | **120.8 ms** | 137.6 ms |
| `PING` (no payload) | 25 | 120.0 ms | 128.8 ms |

`PING` and `GET` are indistinguishable, so the Redis figure is pure transit. The Postgres tenant
transaction costs four sequential round trips, hence roughly 4 × 88 ms.

## What this means

**Every authenticated request in this application opens a tenant transaction.**
`TenantContextInterceptor` wraps each request in `runInTenantTransaction` to set the RLS GUC — that is
required for correctness and is not a defect. From this machine it costs **~448 ms before the handler
does anything at all.**

That is a floor, not an average. No amount of query optimisation, indexing, caching or bundle work moves
it, because it is the speed of light to Singapore multiplied by four round trips.

### The corroboration: a module with zero rows costs the same as one with 240,500

From `BENCHMARK-MANIFEST-2026-09-04.md`, concurrency-1 p95 across all fifteen modules:

| Module | Reference rows | c1 p95 |
|---|---:|---:|
| notifications | 240,500 | 520.7 ms |
| calendar | 180,535 | 575.9 ms |
| build | 18,779 | 520.7 ms |
| kb | 12,606 | 616.1 ms |
| search | 12,000 | 496.8 ms |
| mail | 4,000 | 575.9 ms |
| **inventory** | **0** | **591.9 ms** |
| payroll | 36 | 519.8 ms |

The whole range is **496.8–623.2 ms** for workloads spanning five orders of magnitude in row count.
**`inventory` has zero reference rows and still measures 591.9 ms.** A module with no data cannot be
performing 592 ms of work. The benchmark is measuring the transaction floor, plus noise, plus a small
per-module term.

This is why the earlier manifest reported a 0% error rate and a suspiciously uniform distribution. The
numbers are real; they are simply dominated by a constant this machine contributes.

## Consequences for each criterion

| Criterion | Target | Consequence |
|---|---|---|
| **C141** | ordinary reads/mutations p95 ≤ 300 ms | **Unreachable here for any route**, since the floor alone is ~448 ms. Not a code verdict. |
| **C142** | statements p95 ≤ 50 ms | Statement-level timings are measured inside the transaction and are NOT subject to the four-round-trip floor, so this one remains meaningful. Its gap is coverage (63/300), not geography. |
| **C143** | cache-hit paths p95 ≤ 100 ms | **Unreachable here**: one cache round trip is 120 ms. |
| **C006 / C149 / C151** | LCP ≤ 2.5 s, TTFB ≤ 400 ms | The recorded dominant term — `GET /me/access` at p50 **503 ms** — is almost entirely this floor: a single empty tenant transaction is 448 ms, leaving ~55 ms for all of the handler's own work. Since LCP ≥ FCP ≥ TTFB, it propagates into all three. |
| **C085 / C145** | route budgets, chat/calendar/inbox/notification paths | The floor applies, **but the chat message-send breach was a genuine additional defect on top of it** and is fixed separately (see below). |

## What was a real defect, and is fixed

The floor explains ~450 ms of every route. It does **not** explain
`POST /chat/channels/{channelId}/messages` at **p95 5043 ms** — 16.8× its ceiling and an order of
magnitude worse than every other route in the 105-benchmark corpus.

That one had its own cause: `chat-messages.controller.ts` called `rateLimit.check(...)` **inside the
handler**, therefore inside the tenant transaction, and Upstash is HTTP rather than TCP Redis. A cold
HTTP connection (TCP + TLS + handshake) takes seconds, and for its whole duration a pooled Postgres
connection is pinned idle-in-transaction. `backend/CLAUDE.md` §4 bans precisely this: *"never a network
call [inside the request transaction], which would hold a pooled connection for the length of someone
else's outage."* `pool.config.ts` carries the same warning verbatim.

Fixed by moving the check to the **existing** `RateLimitGuard` + `@UseRateLimit("chat:send-message")`
mechanism. Guards run before interceptors, so the Redis call now happens before any transaction is open.
Nothing new was written — the guard already existed, is already used by 20+ handlers, and additionally
sets the `Retry-After` header the inline version omitted. The controller lost its `RateLimitService`
injection and two now-unused imports.

## What this evidence does NOT claim

- It does **not** claim the application is fast. It claims these particular numbers, taken here, are not
  a measurement of the application.
- It does **not** claim no optimisation is warranted. Caching the assembled access snapshot would replace
  a 448 ms Neon transaction with a 120 ms Redis read on the hot path — a real ~330 ms win that is worth
  making, and still above budget from this machine.
- It does **not** retire any budget. **No ceiling, ratchet or budget was changed.** C141, C143, C149 and
  C151 remain OPEN and failing; what changes is the recorded *cause*, from "the application is slow" to
  "the dominant term is a four-round-trip transaction floor to another continent, and the measurement
  must be repeated co-located before the application can be judged."

The correct next measurement is one taken from the same region as the database, which makes these
deployed-environment evidence rather than code evidence.
