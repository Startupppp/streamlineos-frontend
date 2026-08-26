# 01 — Errors reach a person

**What to build:** When the API throws, someone finds out — with the organisation, user, route and correlation id attached, grouped so one incident is one alert. Scrubbing comes with it, because an error report is an outbound channel.

**Blocked by:** None — can start immediately

**Status:** done — structured logs only, no error tracker. The decision stands; the port has a log adapter.

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
> **Decision (operator): structured logs only — do NOT add an error tracker.** This still holds.
> No vendor SDK is imported anywhere and none was added.
>
> **Two claims in the original decision note are now out of date (Lane 2, 2026-08-26):**
>
> 1. *"The noop reporter stays the default and `setErrorReporter` stays uncalled."* — superseded.
>    The port now has a **log adapter**, `LogErrorReporter`, wired at `main.ts:68`. That is the
>    decision honoured rather than reversed: reports go to the structured log stream, not to a
>    vendor. The noop remains the *default*, so an unwired deployment still reports nothing and
>    the port stays swappable.
> 2. *"What is knowingly given up: error grouping, release markers, and alert-on-new-error-type."*
>    — only the third is actually given up. Grouping and release marking do not need a tracker:
>    a stable `fingerprint` field makes `count(*) group by fingerprint` an incident count, and
>    `release` is one field read from the environment. Both now ship. See the criteria below.
>
> Visibility still comes from JSON logs carrying the existing correlation id, shipped to whatever
> aggregator is in use, so **c20-03 remains load-bearing in this candidate**.
>
> c20-05's four alerts are built on log queries rather than tracker events. **Re-read that ticket
> before touching it**: its tenant-context alert matched on the string "42501", which no log line
> actually contained until this ticket lifted the SQLSTATE out of the driver error's cause chain.

## Acceptance criteria

- [x] A thrown handler error is reported with organisation, user, route and correlation id. — `common/http/all-exceptions.filter.ts:198` calls `reportError(exception, request)`; `error-reporter.ts:44-48` attaches `getObservabilityContext()`; `log-error-reporter.ts:46-50` emits `correlationId`, `orgId`, `actorId`, `method`, `route`. The identity is filled in by `observability-enrichment.interceptor.ts:30-33` (after the guards, when it is known) and the correlation id by `common/http/correlation-id.middleware.ts:66-67`. Asserted by `log-error-reporter.spec.ts` "writes one JSON line carrying organisation, actor, route and correlation id".
- [x] An unhandled promise rejection is reported. — `backend/src/main.ts:32-41`. **This was a real gap, fixed 2026-08-26:** the handler existed but only called `logger.error`, so a rejection never reached the reporter and was never fingerprinted or classified. It now also calls `reportError(reason, { source: "unhandledRejection" })`.
- [x] Errors are grouped, and carry a release marker so a deploy can be implicated. — `common/observability/error-fingerprint.ts` + `release.ts`, emitted at `log-error-reporter.ts:54-55`. **Grouping is achieved without a tracker:** the fingerprint is a hash of error name + normalised message + first non-vendor stack frame + route, so an aggregator gets incidents from `count(*) group by fingerprint`. Ids, quantities and quoted values are normalised out first — otherwise one bug scatters across a thousand groups. Release comes from `APP_RELEASE` (`.env.example:7-10`). Pinned by `error-fingerprint.spec.ts` (8 cases: groups across differing ids/quantities/quoted values; separates different messages, different origins, different routes) and `log-error-reporter.spec.ts` "carries a release marker and a fingerprint that groups repeat occurrences".
- [x] An error carrying an authorization header, a token or a known personal-data field emits none of them. — `common/observability/redact.ts:18-34` deny-lists `password`, `passwd`, `secret`, `token`, `authorization`, `cookie`, `apikey`, `credential`, `privatekey`, `sessionid`, plus PII `aadhaar`, `pannumber`, `pancard`, `cardnumber`, `accountnumber`, `connectionstring`, and `:44-53` the short exact keys `pan`, `otp`, `cvv`, `ssn`, `dsn`, `pin`, plus `query`/`driverdetail` (a Postgres `detail` quotes the offending row). Applied at `error-reporter.ts:47` and again at `log-error-reporter.ts:62`.
- [x] Scrubbing is asserted by test, not assumed. — `redact.spec.ts`, plus `log-error-reporter.spec.ts` "redacts a credential passed as extra detail", which asserts the **raw emitted line** does not contain the secret value rather than only inspecting the parsed object.
- [x] The tenant-context permission error class is reported distinctly, since it has caused real incidents here. — `common/observability/error-classification.ts`; `log-error-reporter.ts:59-60` emits `sqlstate` and `errorClass: "tenant-context"`, and `all-exceptions.filter.ts:113,118` lifts `sqlstate` onto the log line. **This was the load-bearing gap.** postgres-js builds its message from the server's text alone and puts the SQLSTATE on `.code`, which Drizzle buries one or two `.cause` links down — so no emitted line contained "42501" and this class was indistinguishable from any other 500. See the c20-05 note below: the alert built on this predicate could not fire.
- [x] The existing reporter port has a production adapter and remains replaceable; no caller imports a provider SDK directly. — `common/observability/log-error-reporter.ts` (`LogErrorReporter`), wired at `main.ts:69` via `setErrorReporter`. The port keeps its noop default (`error-reporter.ts:22`) and `setErrorReporter`/`resetErrorReporter` keep it swappable. `grep -rn "@sentry\|sentry" backend/src` returns zero — no provider SDK is imported anywhere, and none was added.
- [x] The duplicate reporter import in `all-exceptions.filter.spec.ts` is removed and type checking covers the regression. — verified at source 2026-08-26: the file has exactly one import from `../observability/error-reporter` (`all-exceptions.filter.spec.ts:4-8`). `tsc --noEmit` clean.

## Todo

- [x] Add scrubbing in the same change as reporting — not as a follow-up — `redact` is applied inside `reportError` itself (`error-reporter.ts:47`), so a caller cannot report without it.
- [x] Tag with the existing correlation id — `log-error-reporter.ts:45`, sourced from the middleware's context rather than a second id.
- [x] Assert the deny-list works before enabling in production — `redact.spec.ts` + `log-error-reporter.spec.ts`; 84 tests pass across `src/common/observability/`.
- [x] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md)

## What is still knowingly given up

**Alert-on-new-error-type.** Detecting that a fingerprint has never been seen before needs somewhere
to remember the fingerprints seen so far — a tracker or a metrics store, both deferred by the
operator decision above. Grouping and release marking, the other two costs originally recorded
against that decision, turned out to be recoverable in the log stream and are now delivered.

---

PRD: [`c20 — A failure in production is visible`](../prd.md) · Candidate index: [`../README.md`](../README.md)
