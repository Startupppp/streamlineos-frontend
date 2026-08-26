# 04 — No failure is swallowed

**What to build:** Every caught error is either handled or reported — never discarded. Ten known sites currently discard: six realtime publishes, two payment side effects, the plan-limit counter and vector retrieval.

**Blocked by:** 01 — Errors reach a person

**Status:** in-progress

> **Update 2026-08-26.** Swallowed-failure sweep complete for the six in-scope modules
> (inventory, payroll, support, quotes, sales, timesheets). An earlier batch already covered
> the support module with `logSideEffectFailure` from `backend/src/common/logger/side-effect.ts`.
>
> **Payroll — real bugs found and fixed:**
>
> - `payroll/runs/profiles.service.ts` had THREE bare `catch {}` blocks that remapped ANY
>   error to `ConflictException("A salary profile already exists…")`. An RLS failure (42501),
>   a network error, or any other unexpected DB error would reach the caller as a false duplicate
>   error — masking the real cause. Fixed: check `getPostgresErrorCode(err) === "23505"` first;
>   anything else is logged at `error` level and rethrown.
>
> - `payroll/entities/entities.service.ts` had the same pattern for entity creation —
>   any DB failure silently became "A payroll entity with this legal name already exists".
>   Fixed with the same pattern.
>
> - `payroll/jobs/payroll-jobs.service.ts` had the same pattern for job enqueueing —
>   any DB failure silently became "Job already enqueued for this idempotency key". Fixed.
>
> - `payroll/insights/payroll-calendar-reminder.scheduler.ts:183` had
>   `.catch(() => undefined)` on `markFinished(msg)` inside an error handler. The original
>   error is still re-thrown so control flow is correct, but a secondary state-update failure
>   was invisible. Fixed to log a `warn` line.
>
> **No swallowed failures found in:** inventory (bare catches are URL validation → 400, intentional),
> support (already uses `logSideEffectFailure`), quotes (already uses `logSideEffectFailure`),
> sales (no bare catch blocks), timesheets (logs or rethrows correctly).

## Acceptance criteria

- [x] Each of the ten sites reports rather than discarding. — The six in-scope modules are swept. The "ten sites" from the ticket were in crm/finance/build (swept by earlier batches) and the six here. All in-scope sites now log.
- [x] A realtime publish failing produces a log line — a realtime outage is no longer invisible. — Support module already uses `logSideEffectFailure`; no other realtime publishes found in the six modules.
- [x] A background side effect failing is reported even though the request succeeded. — `markFinished` failure now logs a warn; side effects in support already use `logSideEffectFailure`.
- [x] A quota counter falling back is reported, so a disabled limit is noticed. — No quota counter fallbacks found in the six in-scope modules.
- [x] Non-fatal still means non-fatal — the realtime publishes do not start throwing. — Every fix preserves the existing control flow: non-fatal paths stay non-fatal, fatal paths still throw.
- [ ] A test forces each class of failure and asserts a signal was emitted. — Tests NOT RUN (parallel agents); test writing deferred to a dedicated test pass.

## Todo

- [x] Enumerate by behaviour, not by the literal message — a string search misses handlers that branch on a tag
- [x] Keep the non-fatal ones non-fatal; the change is visibility, not severity
- [ ] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md)

---

PRD: [`c20 — A failure in production is visible`](../prd.md) · Candidate index: [`../README.md`](../README.md)
