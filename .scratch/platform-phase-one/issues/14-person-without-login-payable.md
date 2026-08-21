# 14 — A person with no login can be paid

**What to build:** Payroll can assert eligibility two ways: by platform user, or by directory worker. There is no path keyed by person. A person recorded in HR without a login can therefore hold an employment and never be payable — employment and payability can diverge with nothing surfacing the gap.

Add the missing third path through the person seam, so every person the product can employ is a person the product can pay.

This corrects a specific error in an earlier draft of the person spec, which claimed HR employment required organisation membership and that consolidating would remove the ability to pay a non-member. That is false: HR employment hangs off the person record, not off membership, and the person's user link is optional. The capability was never at risk — the gap is a missing function, not a missing model.

**Blocked by:** 07 — One seam resolves every person

**Status:** ready-for-agent

- [ ] Eligibility resolves for a member, a non-member payee, and a person with no login
- [ ] An unresolvable subject produces the same refusal it does today
- [ ] Being payable grants no module access, no permissions and no session — paying someone never implies entry
- [ ] A payroll run can reach its own inputs for all three kinds of payee
- [ ] The identity a payee resolved through is visible, so an unexpected inclusion or exclusion can be explained
- [ ] Existing payroll specs pass unedited; if one needs changing, the external behaviour changed and that needs justifying
