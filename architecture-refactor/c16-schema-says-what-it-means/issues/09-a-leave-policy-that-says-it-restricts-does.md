# 09 — A leave policy that says it restricts, does

**What to build:** An HR administrator who turns on "restrict this leave type during probation" gets that restriction enforced. Today the flag saves, the UI offers it, the default seed sets it to `true` — and nothing anywhere consults it. An employee on probation can book leave the policy says they cannot.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

## How this was found

Not by review. It surfaced while converting monthly leave accrual to set-based writes (c14-01): the agent reported that `probationRestricted` was "fetched but never used" in the accrual path and that it had preserved the no-op rather than inventing behaviour. That was the correct call for a refactor — and the right thing to escalate.

Verified at source 2026-08-26:

- `leave_policies.probation_restricted` is a real, `NOT NULL` column.
- It is settable through the leave-policy controller and service.
- `seed-default-policies.ts` seeds it **`true`**, so this is on by default for new organisations.
- Probation itself is tracked properly — there is a whole lifecycle module for it.
- **No enforcement path reads the flag.** Not the accrual sweep, not the leave-request path, not approvals.

The flag and the probation state exist. They were never connected.

## Acceptance criteria

- [ ] An employee within their probation period cannot book a leave type whose policy has `probationRestricted` set.
- [ ] The refusal names the reason, so the person understands it is policy and not a bug.
- [ ] An employee **past** probation books that leave type normally.
- [ ] An employee whose probation ends mid-request-window is evaluated against the dates requested, not the date of the request.
- [ ] A policy with the flag **off** is unaffected.
- [ ] Where probation status is unknown or unset, the behaviour is decided explicitly and stated — do not let "unknown" silently mean "restricted" or silently mean "allowed".
- [ ] An administrator with the override permission can still grant the leave, if the product wants that escape hatch — decide and state it either way.
- [ ] Accrual behaviour is decided explicitly: does a restricted type still **accrue** during probation and merely become unbookable, or does it not accrue at all? These are different products and the answer must be written down.
- [ ] Existing leave already booked under the unenforced flag is not retroactively invalidated.

## Todo

- [ ] Decide the accrue-vs-book question first — it changes what you build
- [ ] Find the canonical probation-status read in the lifecycle module and reuse it; do not derive probation from a date comparison at a second site
- [ ] Enforce at the data layer on the request/approval path, not only in the UI
- [ ] Decide and document the unknown-probation-status case
- [ ] Add the allow/deny test matrix: within probation, past probation, boundary date, flag off, status unknown
- [ ] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md)

---

## Why this belongs in c16

c16's theme is **the schema says what it means**. This is the same defect shape as `recurring_rule`, which is written at two call sites and read by nothing: a stored, configurable field that reads as a working feature and enforces nothing.

The difference is that this one is worse in one specific way — `recurring_rule` promises a feature that visibly does not happen, so a user notices. `probationRestricted` promises a *restriction*, and an unenforced restriction is silent: nobody notices until someone takes leave they should not have had.

PRD: [`c16 — The schema says what it means`](../prd.md) · Candidate index: [`../README.md`](../README.md)
