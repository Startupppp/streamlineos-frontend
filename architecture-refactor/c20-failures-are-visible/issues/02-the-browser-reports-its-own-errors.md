# 02 — The browser reports its own errors

**What to build:** A crash in the web app is reported with the same grouping, release markers and scrubbing as the API, so a broken screen is not invisible until someone complains.

**Blocked by:** 01 — Errors reach a person

**Status:** done

> **No error tracker, per the operator decision in [`01`](01-errors-reach-a-person.md).** The
> frontend mirrors the backend's shape — a port with a noop default and a structured-log adapter —
> and imports no vendor SDK. Most of it already existed; what this ticket closed were the gaps in
> what it actually covered.

## Acceptance criteria

- [x] A client-side error is reported with route and release. — route at `frontend/lib/observability/reporting-route-error-boundary.tsx:23` (`window.location.pathname`, passed in `extra`); release at `frontend/lib/observability/console-reporter.ts:4`, read from `NEXT_PUBLIC_APP_VERSION` and stamped on every record. The variable is documented in `frontend/.env.example`. Boot wiring is `instrumentation-client.ts` (`setErrorReporter(consoleReporter)` + `installGlobalErrorHandlers()`), so `window.onerror` and `unhandledrejection` are covered as well as the boundaries.
- [x] Personal data and tokens are scrubbed client-side too. — `frontend/lib/observability/redact.ts`. **This was a real gap:** the deny-list had drifted from its backend mirror, missing `privatekey`, `pancard`, `accountnumber`, `connectionstring`, `dsn`, `query`, `driverdetail`, and the `MAX_ARRAY`/`MAX_KEYS` size caps. Both lists now match `backend/src/common/observability/redact.ts` key for key. Asserted by `redact.test.ts` and `console-reporter.test.ts`.
- [x] The existing error boundaries still render their recoverable UI — reporting does not change what the user sees. — verified by diff, not by assertion: `git diff -- 'frontend/app/**/error.tsx'` filtered for `return`/JSX/`className` lines matches only `Record<string, unknown>` type annotations. **No rendered output changed in any of the 19 files touched**; only the `useEffect` reporting side effect was added.
- [x] Stale-deploy chunk-load errors stay classified as recoverable rather than becoming alert noise. — `reporting-route-error-boundary.tsx:22-26` reports them with `extra.recoverable = true`. **The previous behaviour was a silent early return** — the criterion asks for them to stay *classified as recoverable*, not to disappear, so a bad deploy is still visible to a human while an alert filters on the flag. The classifier at `chunk-load.ts:7` was also extended to test `error.name`, not just `error.message`: a bundler that sets `error.name = "ChunkLoadError"` with a different message previously slipped through. Pinned by `chunk-load.test.ts` (8 cases: `ChunkLoadError` name, webpack message, native ESM fetch failure, Safari module failure, case-insensitivity, non-Error values, ordinary errors).

## Todo

- [x] Reuse the scrub configuration — the two repos cannot share code, so `frontend/lib/observability/redact.ts` is a deliberate port of the backend file. Same deny-list keys, same caps (`MAX_DEPTH=4`, `MAX_STRING=1000`, `MAX_ARRAY=100`, `MAX_KEYS=60`). The one intentional divergence is the backend's `bigint`/`Date` handling, which the browser path does not need.
- [x] Check the 197 error boundaries still behave identically — **the count was right**, unusually for this program: 197 `error.tsx` files under `frontend/app/`, plus one shared `ReportingRouteErrorBoundary` wrapper; zero `global-error.tsx` and zero class-based `componentDidCatch` boundaries. 19 of the 197 were reporting nothing and are now wired; the rest already routed through the shared wrapper. Behaviour verified identical by the diff check above.
- [x] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md)

**Validation (Lane 2, 2026-08-26):** `frontend` `tsc --noEmit` clean. `npx jest lib/observability/`
→ **6 suites, 40 tests passed**. Note that `frontend/tsconfig.json` excludes tests, so the
typecheck alone does not cover them — the suite was run.

---

PRD: [`c20 — A failure in production is visible`](../prd.md) · Candidate index: [`../README.md`](../README.md)
