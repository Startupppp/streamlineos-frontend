# 01 — Errors reach a person

**What to build:** When the API throws, someone finds out — with the organisation, user, route and correlation id attached, grouped so one incident is one alert. Scrubbing comes with it, because an error report is an outbound channel.

**Blocked by:** None — can start immediately

**Status:** DECIDED 2026-08-26 — structured logs only. No error tracker.

> **Update, verified at source 2026-08-26.** Most of this ticket has been built, by a concurrent
> session, and built better than this ticket specced it. `backend/src/common/observability/`
> now contains an **error-reporter port** rather than a vendor integration:
>
> - `reportError(error, extra)` with a pluggable `ErrorReporter` interface and a **noop default**,
>   so a self-hosted or air-gapped deployment runs with nothing attached.
> - `redact.ts` deny-lists `password`, `secret`, `token`, `authorization` — the scrubbing this
>   ticket required as a precondition, already in place.
> - `reportError` never throws, because a tracker failing while reporting would turn a handled
>   500 into an unhandled crash at the worst possible moment.
> - An observability context carries the correlation id; a Nest logger adapter and an enrichment
>   interceptor exist; every piece has a spec.
> - It is already consumed: the tenant interceptor reports after-commit hook failures through it.
>
> **This ticket originally said "Sentry in both repos". That was the wrong shape** — it named a
> vendor where a port belongs. Take the port as built.
>
> **Decision (operator): structured logs only — do NOT add an error tracker.**
>
> The noop reporter stays the default and `setErrorReporter` stays uncalled. Visibility comes from
> **c20-03** instead: JSON logs carrying the existing correlation id, shipped to whatever
> aggregator is already in use.
>
> The port stays because it costs nothing to keep and it is already consumed by the tenant
> interceptor — but it deliberately routes nowhere. **This makes c20-03 the load-bearing ticket in
> this candidate**, not a follow-up to this one.
>
> What is knowingly given up: error grouping (one incident will be N log lines, not one alert),
> release markers, and alert-on-new-error-type. c20-05's four alerts must therefore be built on
> log queries rather than on tracker events — re-read that ticket before starting it, because it
> assumed a tracker existed.

## Acceptance criteria

- [ ] A thrown handler error is reported with organisation, user, route and correlation id.
- [ ] An unhandled promise rejection is reported.
- [ ] Errors are grouped, and carry a release marker so a deploy can be implicated.
- [ ] An error carrying an authorization header, a token or a known personal-data field emits none of them.
- [ ] Scrubbing is asserted by test, not assumed.
- [ ] The tenant-context permission error class is reported distinctly, since it has caused real incidents here.
- [ ] The existing reporter port has a production adapter and remains replaceable; no caller imports a provider SDK directly.
- [ ] The duplicate reporter import in `all-exceptions.filter.spec.ts` is removed and type checking covers the regression.

## Todo

- [ ] Add scrubbing in the same change as reporting — not as a follow-up
- [ ] Tag with the existing correlation id
- [ ] Assert the deny-list works before enabling in production
- [ ] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md)

---

PRD: [`c20 — A failure in production is visible`](../prd.md) · Candidate index: [`../README.md`](../README.md)
