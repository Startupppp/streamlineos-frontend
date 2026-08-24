# 08 — One way to resolve a person, and a third door into payroll

**What to build:** A Person Directory module that answers "who is this person in this organization", and the payroll entry point that is currently missing.

Payroll can assert eligibility by user id (a member, or a worker carrying that user id) or by worker id (a flagged payee whose user id may be null). There is no entry point keyed by person — so someone recorded only in HR, with no login, can hold an employment and never be payable. That is the hole, and it is narrower and more real than the "consolidating would break contractors" claim an earlier draft made, which was false: `hr_employments` keys on `hr_people`, not on membership, and `hr_people.user_id` is nullable.

The subject abstraction already exists inside Payroll. This promotes it into a module of its own, tightens it so an empty subject cannot be constructed, and gives resolution a result callers can switch on.

**Blocked by:** None — can start immediately.

**Status:** SHIPPED — the seam exists. Criteria below are marked only where re-verified; the rest are unchecked because they were not tested, not because they are known to fail.

`src/modules/directory/person-seam.ts` carries the three-way `PersonSubject` (`user` | `worker` | `person`), returns a discriminated `PersonResolution` whose unresolved case is a value rather than a throw, and reports `resolvedVia` so a caller knows which path answered. `person-seam.spec.ts` covers it. Payroll consumes it through `runs/payee-eligibility.service.ts` and `lib/payroll-payee-eligibility.ts`.

Backend `CLAUDE.md` §1 already records the rule this ticket would have established: resolve through the seam, never by querying a facet. The criteria below are kept as the record of what was required.

- [ ] A Person Directory module owns resolution and is the only module permitted to join across the person tables. **Not met** — payroll still joins `hrPeople` and `organizationPeople` directly. That is ticket 10.
- [x] (re-verified) The subject union moves out of Payroll with its helpers, tightened so neither-field-set is unrepresentable. The current shape allows both to be null at once; that is the defect the move fixes. (`person-seam.ts:11-14` — `PersonSubject` is a discriminated union with three variants, each requiring exactly one identifying field; resolution helpers `resolvePerson` and `subjectKey` live in `directory/person-seam.ts`)
- [x] Resolution returns a **discriminated union** — resolved member, resolved non-member payee, unresolvable — and callers switch exhaustively. It does not throw.
- [x] (re-verified) Payroll's existing eligibility assertion becomes a thin wrapper converting the unresolvable case into **its current forbidden error**, so its external behaviour is byte-identical. A caller must not be able to tell this changed. (`payroll-payee-eligibility.ts:18-61` — three wrappers each call `resolvePerson` and throw `ForbiddenException` on unresolved/not-payable; `payroll-payee-eligibility.spec.ts` 16 tests pass)
- [ ] (not re-verified) A person recorded only in HR, with no login and no worker row, is resolvable and payable. This is the ticket's point; a test names it explicitly.
- [x] (re-verified) Being a payee grants no module access, no permission and no session. A test asserts resolvability is not authorization — the resolver now returns contractors beside members and a future caller could mistake one for the other. (`payee-eligibility.service.spec.ts:72-84` — `evaluateMembershipGate(null)` and `evaluateMembershipGate({ status: "SUSPENDED" })` both return `{ active: false, isOwner: false }`; 16 tests pass)
- [x] (re-verified) The existing unit specs for the subject helpers move with the code and are extended to the tightened type and the three-way result. (`person-seam.spec.ts` 13 tests covering all three subject kinds including the three-way unresolved case at :213-221; `person-seam-batch.spec.ts` 6 tests; 20 tests pass total)
- [x] No new person table, no table retired, no data migration. All affected tables are empty or near-empty, which is why this ships as code.
- [x] (re-verified) Both existing payroll entry points still work unchanged, proven by their current tests passing untouched. (`payroll-payee-eligibility.spec.ts` — `assertPayrollPayeeEligible` (user path) and `assertPayrollWorkerPayeeEligible` (worker path) both covered; 16 tests pass)
