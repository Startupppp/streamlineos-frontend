# 09 — A leave policy that says it restricts, does

**What to build:** An HR administrator who turns on "restrict this leave type during probation" gets that restriction enforced. Today the flag saves, the UI offers it, the default seed sets it to `true` — and nothing anywhere consults it. An employee on probation can book leave the policy says they cannot.

**Blocked by:** None — can start immediately.

**Status:** done

## Product decisions (Lane 4, 2026-08-26)

Stated in code on `decideProbationLeave` — `backend/src/modules/hr/time/probation-leave-restriction.ts:15-25`.

1. **Accrual is unaffected; only booking is restricted.** A restricted type keeps accruing during
   probation and merely becomes unbookable. Leave is earned from the joining date — the annual
   reset already prorates from it (`cron-leave.service.ts:495-501`) — so withholding accrual would
   mean a confirmed employee starts at zero. No change to the accrual sweep; the current behaviour
   is now the decided behaviour rather than an unexamined default.
2. **"Never recorded" allows.** Probation status is now a three-value `ProbationCoverage`
   (`on-probation` · `past-probation` · `no-record`), not a boolean, so absence of a probation
   record is a named case rather than a falsy one. `no-record` **allows**: the flag seeds `true`
   for every new organisation, so refusing would block leave for every org that never used the
   probation module.
3. **There is no override permission.** The administrator's lever is the policy flag itself
   (`PATCH /leave-policies/:id`), which is durable and auditable. A per-request bypass of a
   compliance restriction leaves no policy trace, and no new permission key is worth that.
4. **The request is judged on the dates requested, not the date of the request** — specifically its
   start date. A window that opens during probation is refused **entirely** rather than silently
   trimmed to the allowed days, so the employee re-requests dates they can actually take.
   The boundary is inclusive: probation ending exactly on the leave start date still restricts.

## How this was found

Not by review. It surfaced while converting monthly leave accrual to set-based writes (c14-01): the agent reported that `probationRestricted` was "fetched but never used" in the accrual path and that it had preserved the no-op rather than inventing behaviour. That was the correct call for a refactor — and the right thing to escalate.

Verified at source 2026-08-26 (original audit note) and re-verified 2026-08-26 (this audit):

- `leave_policies.probation_restricted` is a real, `NOT NULL` column.
- It is settable through the leave-policy controller and service.
- `seed-default-policies.ts` seeds it **`true`**, so this is on by default for new organisations.
- Probation itself is tracked properly — there is a whole lifecycle module for it.
- **The "no enforcement path" claim is FALSE.** `backend/src/modules/hr/time/leaves-write.service.ts:80-103` reads the flag and enforces it: it fetches `probationRestricted` for the active policy (line 80-90), calls `this.probation.isOnProbationDuring(orgId, userId, startStr)` if the flag is true (line 92-97), and throws `BadRequestException("This leave type is not available during your probation period. Contact HR if you have questions.")` (line 99-101) when the employee is on probation.

The original "How this was found" statement that the refactor agent "preserved the no-op" was inaccurate — the enforcement code is in `leaves-write.service.ts`, not the accrual path where the agent was looking. The enforcement exists and is connected; some acceptance criteria below are already satisfied.

## Acceptance criteria

- [x] An employee within their probation period cannot book a leave type whose policy has `probationRestricted` set. — `backend/src/modules/hr/time/leaves-write.service.ts:93-101`: the flag is read, `probationCoverageOn` resolves the person's coverage and a `BadRequestException` carries the refusal. Asserted end to end by `leaves-write-probation.spec.ts:76-86` (nothing is inserted).
- [x] The refusal names the reason, so the person understands it is policy and not a bug. — `probation-leave-restriction.ts:3-4` is the single source of the message, `"This leave type is not available during your probation period. Contact HR if you have questions."`, thrown at `leaves-write.service.ts:100`. `__tests__/probation-leave-restriction.spec.ts:16-17` asserts it names the policy and an action.
- [x] An employee **past** probation books that leave type normally. — `probation-leave-restriction.ts:32-34` returns `{ allowed: true }` for `past-probation`; `leaves-write-probation.spec.ts:87-99` books successfully with the flag on.
- [x] An employee whose probation ends mid-request-window is evaluated against the dates requested, not the date of the request. — Decision 4 above, stated at `probation-leave-restriction.ts:22-24` and named at `probation-review-reader.service.ts:14-15` (`probationCoveringPredicate`, "the boundary day is inside probation"). `leaves-write.service.ts:94-98` passes the leave start date, never today. Pinned by `leaves-write-probation.spec.ts:140-149` (the start date is the argument) and `__tests__/probation-leave-restriction.spec.ts:55-61` (the predicate is `>=`, so flipping it to `>` fails).
- [x] A policy with the flag **off** is unaffected. — `probation-leave-restriction.ts:27` short-circuits before coverage is even asked for; `leaves-write-probation.spec.ts:113-126` and `:127-139` assert `probationCoverageOn` is never called when the flag is off and when no active policy exists.
- [x] Where probation status is unknown or unset, the behaviour is decided explicitly and stated — do not let "unknown" silently mean "restricted" or silently mean "allowed". — Decision 2 above. The boolean is gone: `probation-coverage.ts:5` defines `ProbationCoverage` as `on-probation | past-probation | no-record` and `probation-review-reader.service.ts:150-183` (`probationCoverageOn`) distinguishes "no probation record at all" from "finished probation" with a `count(*) FILTER` aggregate. `probation-leave-restriction.ts:29-39` decides `no-record` in a named, exhaustive `switch`, so the unknown case can no longer fall through a truthiness check. Asserted by `__tests__/probation-leave-restriction.spec.ts:26-30` and `leaves-write-probation.spec.ts:100-112`.
- [x] An administrator with the override permission can still grant the leave, if the product wants that escape hatch — decide and state it either way. — Decision 3 above: **no override permission**, stated at `probation-leave-restriction.ts:21-22`. `__tests__/probation-leave-restriction.spec.ts:46-53` pins it — `decideProbationLeave` takes one argument and no actor, so an override cannot be added without failing that test and revisiting the decision.
- [x] Accrual behaviour is decided explicitly: does a restricted type still **accrue** during probation and merely become unbookable, or does it not accrue at all? These are different products and the answer must be written down. — Decision 1 above: **accrual continues, only booking is restricted**, stated at `probation-leave-restriction.ts:17-18`. `modules/cron/cron-leave.service.ts` correctly has no `probationRestricted` gate; no change was needed and none was made (that file is outside Lane 4's territory in any case).
- [x] Existing leave already booked under the unenforced flag is not retroactively invalidated. — **Not a violation:** the enforcement is at booking time only (`leaves-write.service.ts`); no retroactive sweep or cancellation exists.

## Todo

- [x] Decide the accrue-vs-book question first — it changes what you build — Decision 1: accrual is unaffected, only booking is restricted. Stated at `probation-leave-restriction.ts:17-18`; no accrual code changed.
- [x] Find the canonical probation-status read in the lifecycle module and reuse it; do not derive probation from a date comparison at a second site — `leaves-write.service.ts:94` calls `this.probation.probationCoverageOn` (`probation.service.ts:390-396`), which delegates to `probation-review-reader.service.ts:150`. The date comparison exists once, in `probationCoveringPredicate` (`probation-review-reader.service.ts:15-17`).
- [x] Enforce at the data layer on the request/approval path, not only in the UI — `leaves-write.service.ts:93-101` enforces at the service layer (data path).
- [x] Decide and document the unknown-probation-status case — Decision 2: `no-record` allows, and it is now a named third value (`probation-coverage.ts:5`) rather than a falsy boolean.
- [x] Add the allow/deny test matrix: within probation, past probation, boundary date, flag off, status unknown — `backend/src/modules/hr/time/__tests__/probation-leave-restriction.spec.ts` (6 tests) covers the decision matrix and the inclusive boundary; `backend/src/modules/hr/time/leaves-write-probation.spec.ts` (6 tests) covers the same matrix through the real `LeavesWriteService.create` path. 12 tests, all passing.
- [x] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md)

**Audit note (2026-08-26):** The ticket's core claim ("No enforcement path reads the flag") is false. `leaves-write.service.ts:80-103` both reads and enforces `probationRestricted`. Five of nine ACs are already satisfied. Three remain genuinely open: the accrual decision, the unknown-status documentation, and the allow/deny test matrix. One AC (mid-window semantics) is implemented but the chosen semantics are undocumented. The override question requires a product decision.

**Lane 4 note (2026-08-26):** The audit note above is accurate and its remaining three items are now closed. Two things it did not catch: `leaves-write-approver.spec.ts` was **failing on `main`** (`this.db.select is not a function` — its db mock predated the policy lookup added at `leaves-write.service.ts:81`), so the one existing probation assertion was proving nothing; and the boolean `isOnProbationDuring` could not express "unknown", which is why it was replaced by `probationCoverageOn` rather than documented in place.

---

## Why this belongs in c16

c16's theme is **the schema says what it means**. This is the same defect shape as `recurring_rule`, which is written at two call sites and read by nothing: a stored, configurable field that reads as a working feature and enforces nothing.

The difference is that this one is worse in one specific way — `recurring_rule` promises a feature that visibly does not happen, so a user notices. `probationRestricted` promises a *restriction*, and an unenforced restriction is silent: nobody notices until someone takes leave they should not have had.

PRD: [`c16 — The schema says what it means`](../prd.md) · Candidate index: [`../README.md`](../README.md)
