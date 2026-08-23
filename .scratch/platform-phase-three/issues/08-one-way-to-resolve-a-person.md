# 08 — One way to resolve a person, and a third door into payroll

**What to build:** A Person Directory module that answers "who is this person in this organization", and the payroll entry point that is currently missing.

Payroll can assert eligibility by user id (a member, or a worker carrying that user id) or by worker id (a flagged payee whose user id may be null). There is no entry point keyed by person — so someone recorded only in HR, with no login, can hold an employment and never be payable. That is the hole, and it is narrower and more real than the "consolidating would break contractors" claim an earlier draft made, which was false: `hr_employments` keys on `hr_people`, not on membership, and `hr_people.user_id` is nullable.

The subject abstraction already exists inside Payroll. This promotes it into a module of its own, tightens it so an empty subject cannot be constructed, and gives resolution a result callers can switch on.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] A Person Directory module owns resolution and is the only module permitted to join across the person tables.
- [ ] The subject union moves out of Payroll with its helpers, tightened so neither-field-set is unrepresentable. The current shape allows both to be null at once; that is the defect the move fixes.
- [ ] Resolution returns a **discriminated union** — resolved member, resolved non-member payee, unresolvable — and callers switch exhaustively. It does not throw.
- [ ] Payroll's existing eligibility assertion becomes a thin wrapper converting the unresolvable case into **its current forbidden error**, so its external behaviour is byte-identical. A caller must not be able to tell this changed.
- [ ] A person recorded only in HR, with no login and no worker row, is resolvable and payable. This is the ticket's point; a test names it explicitly.
- [ ] Being a payee grants no module access, no permission and no session. A test asserts resolvability is not authorization — the resolver now returns contractors beside members and a future caller could mistake one for the other.
- [ ] The existing unit specs for the subject helpers move with the code and are extended to the tightened type and the three-way result.
- [ ] No new person table, no table retired, no data migration. All affected tables are empty or near-empty, which is why this ships as code.
- [ ] Both existing payroll entry points still work unchanged, proven by their current tests passing untouched.
