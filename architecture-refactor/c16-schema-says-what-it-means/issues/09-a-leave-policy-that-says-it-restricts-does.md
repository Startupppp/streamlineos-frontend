# 09 — A leave policy that says it restricts, does

**What to build:** An HR administrator who turns on "restrict this leave type during probation" gets that restriction enforced. Today the flag saves, the UI offers it, the default seed sets it to `true` — and nothing anywhere consults it. An employee on probation can book leave the policy says they cannot.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

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

- [x] An employee within their probation period cannot book a leave type whose policy has `probationRestricted` set. — `backend/src/modules/hr/time/leaves-write.service.ts:92-103`: the flag is checked and a `BadRequestException` is thrown when the employee is on probation.
- [x] The refusal names the reason, so the person understands it is policy and not a bug. — `leaves-write.service.ts:99-101`: message is `"This leave type is not available during your probation period. Contact HR if you have questions."` — policy-attributed and actionable.
- [x] An employee **past** probation books that leave type normally. — `leaves-write.service.ts:93-103`: block only fires when `isOnProbationDuring` returns `true`; returning `false` (no active probation row covering the leave start date) falls through to the normal booking path.
- [ ] An employee whose probation ends mid-request-window is evaluated against the dates requested, not the date of the request. — `leaves-write.service.ts:93` passes `startStr` (the leave start date), not today; `isOnProbationDuring` at `probation-review-reader.service.ts:144-177` checks `probationEndDate >= leaveStartDate`, so if probation ends AFTER the leave starts, the request is blocked for the whole window. This may be intentional but the AC requires the behaviour to be **stated** explicitly. The code does not document whether "starts during probation = whole request blocked" is the intended policy.
- [x] A policy with the flag **off** is unaffected. — `leaves-write.service.ts:92`: `if (activePolicy?.probationRestricted)` is falsy when the flag is false or when no policy exists; the block is skipped.
- [ ] Where probation status is unknown or unset, the behaviour is decided explicitly and stated — do not let "unknown" silently mean "restricted" or silently mean "allowed". — `probation-review-reader.service.ts:176`: `return row !== undefined` — no row means `false` (allowed). This silently means "allowed"; the AC requires the choice to be **stated** somewhere visible (a comment in the function or a documented policy decision), not just implied by the `undefined` check.
- [ ] An administrator with the override permission can still grant the leave, if the product wants that escape hatch — decide and state it either way. — No override path exists; the AC requires a decision either way.
- [ ] Accrual behaviour is decided explicitly: does a restricted type still **accrue** during probation and merely become unbookable, or does it not accrue at all? These are different products and the answer must be written down. — No accrual gate on `probationRestricted` found in the leave accrual sweep path; the current code accrues regardless. The AC requires this to be an explicit decision, not an implicit default.
- [x] Existing leave already booked under the unenforced flag is not retroactively invalidated. — **Not a violation:** the enforcement is at booking time only (`leaves-write.service.ts`); no retroactive sweep or cancellation exists.

## Todo

- [ ] Decide the accrue-vs-book question first — it changes what you build — **GENUINELY OPEN:** the current code accrues regardless; the AC requires the choice to be stated.
- [x] Find the canonical probation-status read in the lifecycle module and reuse it; do not derive probation from a date comparison at a second site — `leaves-write.service.ts:93` calls `this.probation.isOnProbationDuring` from `probation.service.ts:390`, which delegates to `probation-review-reader.service.ts:144`. No second-site date comparison.
- [x] Enforce at the data layer on the request/approval path, not only in the UI — `leaves-write.service.ts:92-103` enforces at the service layer (data path).
- [ ] Decide and document the unknown-probation-status case — **GENUINELY OPEN:** currently silently allows; needs a documented decision.
- [ ] Add the allow/deny test matrix: within probation, past probation, boundary date, flag off, status unknown — **GENUINELY OPEN:** `leaves-write-approver.spec.ts:94` mocks `isOnProbationDuring` as returning `false` but does not test the full matrix.
- [ ] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md)

**Audit note (2026-08-26):** The ticket's core claim ("No enforcement path reads the flag") is false. `leaves-write.service.ts:80-103` both reads and enforces `probationRestricted`. Five of nine ACs are already satisfied. Three remain genuinely open: the accrual decision, the unknown-status documentation, and the allow/deny test matrix. One AC (mid-window semantics) is implemented but the chosen semantics are undocumented. The override question requires a product decision.

---

## Why this belongs in c16

c16's theme is **the schema says what it means**. This is the same defect shape as `recurring_rule`, which is written at two call sites and read by nothing: a stored, configurable field that reads as a working feature and enforces nothing.

The difference is that this one is worse in one specific way — `recurring_rule` promises a feature that visibly does not happen, so a user notices. `probationRestricted` promises a *restriction*, and an unenforced restriction is silent: nobody notices until someone takes leave they should not have had.

PRD: [`c16 — The schema says what it means`](../prd.md) · Candidate index: [`../README.md`](../README.md)
