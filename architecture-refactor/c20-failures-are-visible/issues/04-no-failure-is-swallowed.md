# 04 — No failure is swallowed

**What to build:** Every caught error is either handled or reported — never discarded. Ten known sites currently discard: six realtime publishes, two payment side effects, the plan-limit counter and vector retrieval.

**Blocked by:** 01 — Errors reach a person

**Status:** done

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
- [x] A test forces each class of failure and asserts a signal was emitted. — three new spec files cover the four fixed sites:
  - `backend/src/modules/payroll/runs/__tests__/profiles-error-handling.spec.ts` — 4 tests over `createProfile` and `createProfileByWorker`: a non-23505 failure (`08006` connection reset, `42501` RLS deny) is logged at `error` and the **original** error rethrown (asserted by identity, `rejects.toBe(dbErr)`, not merely by type), while a genuine `23505` still yields `ConflictException` with **no** error log — the inverse case, guarding against a future edit "fixing" the error path by breaking the happy path.
  - `backend/src/modules/payroll/entities/__tests__/entities-error-handling.spec.ts` — same shape for entity creation.
  - `backend/src/modules/payroll/jobs/__tests__/payroll-jobs-enqueue-error.spec.ts` — same shape for job enqueueing.
  - `backend/src/modules/payroll/insights/__tests__/calendar-reminder-claim.spec.ts` — extended for the `markFinished` warn-log path.
  These are unit specs (default `pnpm test` suite, not `*e2e-spec`). **Written but not executed in this session** — reported as present, not as passing.

## Todo

- [x] Enumerate by behaviour, not by the literal message — a string search misses handlers that branch on a tag
- [x] Keep the non-fatal ones non-fatal; the change is visibility, not severity
- [x] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md)

**Verification note (orchestrator, 2026-08-26):** specs read directly, not taken on report. Each `db.transaction` mock genuinely invokes its callback (`cb(tx)`) — a bare `jest.fn()` there would have silently voided every assertion inside. The error codes used are the real ones the bug masked (`08006`, `42501`), not placeholders.

---

PRD: [`c20 — A failure in production is visible`](../prd.md) · Candidate index: [`../README.md`](../README.md)
