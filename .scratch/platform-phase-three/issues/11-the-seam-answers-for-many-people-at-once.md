# 11 — The person seam answers for many people in one query

**What to build:** A batch identity read on the Person Directory seam.

`resolvePerson` takes one subject and returns one resolution. That is the right shape for "may this person be paid", which is how payroll's eligibility check uses it, and it is why the seam shipped useful.

It is the wrong shape for the other question payroll asks, which is "give me the identity of every payee on this run". Today that is one batched query joining `organization_people` and `users` (`payroll/lib/payroll-run-payee.ts:85-119`), returning display name, work email, employee id, designation, joining date and bank details for the whole run at once.

Ticket 10 wants payroll to stop importing those tables. It cannot, because calling `resolvePerson` per payee would turn one query into N on a run that may carry hundreds of employees — the exact N+1 the backend rules forbid, on the payroll path.

This ticket closes that gap so ticket 10 becomes mechanical.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] The seam exposes a batch identity read: many subjects in, one query out, results keyed so a caller can look each subject up without scanning.
- [ ] It is **one** query regardless of subject count. A test asserts the query count does not grow with the number of subjects — that assertion is the whole point of the ticket and the thing a future refactor will break first.
- [ ] A subject that does not resolve is absent from the result rather than throwing, matching `resolvePerson`'s existing discriminated shape. A caller must be able to tell "no such person" from "person with no name".
- [ ] It returns identity and flags only. Bank details and anything else sensitive stay behind their own permission gate at the call site — the seam must not become the thing that widens access, and payroll's current join reads bank details, so this boundary needs stating rather than assuming.
- [ ] `orgId` is re-asserted in the query rather than left to RLS, as `resolvePerson` already does, so a cross-tenant subject simply does not come back.
- [ ] The short-circuit rule is preserved: a caller that needs every facet resolves by `person`. Document which facets a batch answer populates, because `resolvePerson`'s membership path already reports `workerId: null` without looking, and a batch read that quietly differs would be worse than no batch read.
- [ ] Existing `resolvePerson` behaviour and its spec are untouched.
