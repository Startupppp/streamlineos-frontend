# 11 — The person seam answers for many people in one query

**What to build:** A batch identity read on the Person Directory seam.

`resolvePerson` takes one subject and returns one resolution. That is the right shape for "may this person be paid", which is how payroll's eligibility check uses it, and it is why the seam shipped useful.

It is the wrong shape for the other question payroll asks, which is "give me the identity of every payee on this run". Today that is one batched query joining `organization_people` and `users` (`payroll/lib/payroll-run-payee.ts:85-119`), returning display name, work email, employee id, designation, joining date and bank details for the whole run at once.

Ticket 10 wants payroll to stop importing those tables. It cannot, because calling `resolvePerson` per payee would turn one query into N on a run that may carry hundreds of employees — the exact N+1 the backend rules forbid, on the payroll path.

This ticket closes that gap so ticket 10 becomes mechanical.

**Blocked by:** None — can start immediately.

**Status:** DONE — `resolvePeopleIdentities` + `subjectKey` in `directory/person-seam.ts`, six tests in `person-seam-batch.spec.ts`.

- [x] The seam exposes a batch identity read: many subjects in, one query out, results keyed so a caller can look each subject up without scanning.
- [x] It is **one** query regardless of subject count. A test asserts the query count does not grow with the number of subjects — that assertion is the whole point of the ticket and the thing a future refactor will break first.
- [x] A subject that does not resolve is absent from the result rather than throwing, matching `resolvePerson`'s existing discriminated shape. A caller must be able to tell "no such person" from "person with no name".
- [x] It returns identity and flags only. Bank details and anything else sensitive stay behind their own permission gate at the call site — the seam must not become the thing that widens access, and payroll's current join reads bank details, so this boundary needs stating rather than assuming.
- [x] `orgId` is re-asserted in the query rather than left to RLS, as `resolvePerson` already does, so a cross-tenant subject simply does not come back.
- [x] The batch read **does not** short-circuit — it populates person, worker and membership facets together, which is a deliberate difference from `resolvePerson` and is stated where the code is.
- [x] **One semantic difference, called out rather than hidden:** the batch query anchors on `organization_people`, so a subject with no person row is **absent from the map**, whereas `resolveUser` still resolves a member with no person row. Backend §1 says a human in an organisation is exactly one `organization_people` row, so that state is a data defect rather than a supported one — but a caller must treat absence as *identity unknown*, never as *skip this record*. Ticket 10 carries that constraint. (`person-seam.ts:292` — comment reads "anchored on organization_people, so an absent subject means identity unknown, never 'skip'"; `person-seam-batch.spec.ts:74-87` — "leaves a subject that does not resolve out of the answer"; 6 tests pass)
- [x] Existing `resolvePerson` behaviour and its spec are untouched.
