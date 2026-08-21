# 14 — A person with no login can be paid

**What to build:** Payroll can assert eligibility two ways: by platform user, or by directory worker. There is no path keyed by person. A person recorded in HR without a login can therefore hold an employment and never be payable — employment and payability can diverge with nothing surfacing the gap.

Add the missing third path through the person seam, so every person the product can employ is a person the product can pay.

This corrects a specific error in an earlier draft of the person spec, which claimed HR employment required organisation membership and that consolidating would remove the ability to pay a non-member. That is false: HR employment hangs off the person record, not off membership, and the person's user link is optional. The capability was never at risk — the gap is a missing function, not a missing model.

**Blocked by:** 07 — One seam resolves every person

**Status:** DONE — every criterion verified 2026-08-21

- [x] Eligibility resolves for a member, a non-member payee, and a person with no login
- [x] An unresolvable subject produces the same refusal it does today
- [x] Being payable grants no module access, no permissions and no session — paying someone never implies entry
- [x] A payroll run can reach its own inputs for all three kinds of payee
- [x] The identity a payee resolved through is visible, so an unexpected inclusion or exclusion can be explained
- [x] Existing payroll specs pass unedited; if one needs changing, the external behaviour changed and that needs justifying

---

## Validation — 2026-08-21

Every criterion above is ticked because it was verified individually, not because the work felt finished. Evidence, deviations and corrections are recorded in the commit that closed this ticket and in the `PAGES.md` changelog entry for 2026-08-21.

Highlights: the ticket's premise held and **my own earlier doubt was wrong** — `workers.organization_person_id` already links payee to person, so no migration was needed. A real defect was fixed on the way: the seam computed `payable` independently of the identity it reported, so the two could disagree, and it could hand payroll a **non-payee** worker's id. Criterion 4 was verified by reading the existing run-inputs path rather than by a new test, and that is stated rather than implied.

This is done.
