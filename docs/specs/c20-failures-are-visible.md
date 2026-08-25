# c20 · A failure in production is visible

**Status: nothing exists.** Verified at source 2026-08-25. Both `package.json` files were grepped for Sentry, OpenTelemetry, Datadog, New Relic, Bugsnag, `prom-client`, `pino` and `winston` — **zero hits**. Logging is `console` through a hand-rolled logger restricted to `warn`, `error` and `fatal` in production. Health endpoints exist and nothing scrapes them. This is the connective tissue behind a large share of the whole review: at least ten known places swallow a failure, and there is no mechanism that would tell anyone.

## Problem Statement

**As an operator, I find out from a customer.** There is no error tracking. A crash, a swallowed promise rejection or a permission failure inside a background job produces a console line on a container nobody is reading.

**As an operator, ten known failures are silent by construction.** Six realtime publishes discard their error entirely. Two payment-webhook side effects are fired and forgotten with a warning handler labelled non-fatal. The plan-limit counter catches everything and returns zeros, which disables every quota. Vector-retrieval errors are swallowed. Four financial statement caches serve stale books with no signal. **The project's own rule says never to swallow a deferred failure — it is violated in at least ten places.**

**As an operator, I cannot follow a request.** A correlation-id middleware already exists and the id is generated, but logs are unstructured text and are not shipped anywhere, so tracing a request from guard to service to outbox means reading code and guessing.

**As an operator, I do not know when the outbox is stuck.** Rows reaching a dead state are the definitive signal that a side effect was lost. Nothing watches them.

**As an operator, I cannot tell whether a fix worked.** Every performance finding in this review was measured by hand, once. There is no p95 on any endpoint, so an improvement is unverifiable and a regression is undetectable.

**As a developer, a tenant-context failure is invisible.** A write with no tenant context fails with a specific Postgres error code. It has bitten this codebase repeatedly — including breaking notification delivery for every organisation while the cron endpoint returned 200.

## Solution

Three steps, deliberately small and in this order.

**Error tracking first.** Sentry in both repos. This is an afternoon of work and it surfaces every swallowed failure listed above immediately, plus the tenant-context class that has caused real incidents here.

**Structured logs on the correlation id that already exists.** Emit JSON and ship it, so a request can be followed across the guard, the service and the outbox.

**Four alerts, not a dashboard suite.** Outbox rows in a dead state; webhook signature failures; tenant-context error rate; p95 on the ten hottest endpoints.

Explicitly **not** full APM, distributed tracing, a metrics time-series database or log analytics. Those are premature and expensive to run at this stage, and adding them now would mean adopting none of it properly.

## User Stories

1. As an operator, I want to be told when the application throws, so that I do not learn about outages from customers.
2. As an operator, I want an unhandled promise rejection reported, so that a swallowed failure is not silent.
3. As an operator, I want each error to carry the organisation, user and route, so that I can judge blast radius immediately.
4. As an operator, I want a stack trace with source context, so that I can act without reproducing.
5. As an operator, I want errors grouped, so that one incident is one alert rather than ten thousand.
6. As an operator, I want a release marker on each error, so that I can tell whether a deploy caused it.
7. As an operator, I want to follow one request across guard, service and outbox by its correlation id, so that debugging is not archaeology.
8. As an operator, I want logs as structured JSON, so that they can be queried rather than read.
9. As an operator, I want to be alerted when outbox rows reach a dead state, so that lost side effects are worked.
10. As an operator, I want to be alerted on webhook signature failures, so that a misconfiguration or an attack is visible.
11. As an operator, I want to be alerted on the tenant-context error rate, so that a regression in that class is caught in minutes.
12. As an operator, I want p95 latency on the ten hottest endpoints, so that a performance regression is detectable.
13. As an operator, I want alerts to reach a person, so that a signal nobody receives is not mistaken for coverage.
14. As an operator, I want alert thresholds tuned so that a noisy alert is fixed or removed, so that alerts stay trusted.
15. As a developer, I want a failed realtime publish logged, so that a realtime outage is not invisible.
16. As a developer, I want a failed background side effect reported, so that "non-fatal" does not mean "unobserved".
17. As a developer, I want to know when a quota check silently returned zero, so that a disabled limit is noticed.
18. As a developer, I want an error to carry the tenant context it was missing, so that the specific failure class is diagnosable.
19. As a security reviewer, I want no secrets, tokens or personal data in error payloads, so that observability is not a disclosure channel.
20. As a security reviewer, I want request bodies scrubbed before they leave the system, so that an error report cannot carry customer data.
21. As the business, I want to know that a customer paid and was not provisioned, so that revenue-affecting failures are worked rather than lost.

## Implementation Decisions

**Already shipped — build on this**

- **The correlation-id middleware exists** and generates an id per request. Nothing needs designing; it needs emitting and shipping.
- **Health endpoints exist.** They are unscraped, which is a wiring gap rather than a missing capability.
- **Startup is already strict** — environment validation runs before the application factory, and the application refuses to serve in production if connected as a bypass-RLS role. Keep both; they are the model for failing loudly.
- **The outbox already has a dead state** with bounded retry. The signal exists; nothing watches it.

**To build**

- **Sentry in both repos**, with release markers, the correlation id as a tag, and organisation and user as context. First, because it is the step that makes everything else discoverable.
- **Scrubbing before send.** Deny-list request bodies, authorization headers, tokens and known personal-data fields. This is a precondition of enabling error tracking, not a follow-up — an error report is an outbound channel and story 19 is the constraint.
- **Structured JSON logging** replacing the hand-rolled console logger, carrying the correlation id, and shipped. Keep production levels as they are; the change is format and destination, not verbosity.
- **The ten swallowed failures are converted to reported failures.** Not every one becomes a thrown error — the realtime publishes are legitimately non-fatal — but every one becomes *visible*. The rule is that a caught error is either handled or reported, never discarded.
- **The quota-counter catch is removed entirely**, which is c17's fix; here it also gains a report so that the fail-closed refusal is attributable.
- **Four alerts, defined with thresholds and a recipient.** An alert with no recipient is not coverage.
- **p95 from the existing health/metrics surface**, not a new metrics stack. The bar is "a regression is detectable", not "we have a dashboard".
- **No APM, tracing, TSDB or log analytics.** Recorded as a deliberate deferral so it is not re-proposed as an omission.

## Testing Decisions

**What makes a good test here.** Assert that a failure *produces a signal* — that is the entire behaviour under test. Observability code is unusual in that its failure mode is silence, so a test that only checks the happy path proves nothing. The valuable tests are the ones that force an error and assert something was emitted.

- **A thrown handler error is reported**, with organisation, user, route and correlation id attached. This is the core assertion.
- **A swallowed background failure is reported.** Force a realtime publish and a webhook side effect to fail; assert a report was emitted even though the request succeeded. This is the direct regression test for the ten known sites.
- **Scrubbing works** — an error carrying an authorization header, a token and a known personal-data field emits none of them. Story 19 is a security property and must be asserted, not assumed.
- **The correlation id is stable across layers** — one request produces one id in the guard, the service and the outbox record.
- **Log output is parseable JSON** with the expected fields present.
- **Alert conditions fire** — given a dead outbox row, a signature failure and a burst of tenant-context errors, the alert predicate evaluates true. Test the predicate, not the delivery.
- **Prior art**: the existing cron and outbox specs, which already construct failure conditions and can be extended to assert on the emitted signal.

## Out of Scope

- Full APM and distributed tracing.
- A metrics time-series database.
- Log analytics or a search product.
- Uptime and synthetic monitoring.
- Frontend real-user monitoring, beyond error reporting.
- Fixing the underlying failures. This spec makes them visible; c15 and c17 fix them.

## Further Notes

This spec is unusual in the set because it fixes nothing directly. Its value is that **it is the reason every other finding in this review had to be found by a person reading source.** Ten failures were swallowed, four caches served stale financial data, one webhook returned success after losing work, and the plan-limit counter disabled every quota — and in each case the system's behaviour was to continue quietly.

It pairs with c11 the same way: c11 makes a slow query fail the build, c20 makes a broken production path raise a signal. Between them they move this codebase from *auditable by inspection* to *self-reporting*, and that is worth more than any individual fix in the plan.
