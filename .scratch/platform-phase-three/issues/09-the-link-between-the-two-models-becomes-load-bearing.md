
# 09 — A person present in both models is provably the same person

**What to build:** The link column stops being decorative.

The HR person model already carries a nullable link to the directory person, with a partial unique index on it. Nothing depends on it, so today a person can exist in both models with no proof they are the same human — and the two payroll generations, one keyed on HR people and one keyed on workers, have no join path between them.

No schema change is needed. The column exists; this ticket makes resolution use it and keeps it populated.

**Blocked by:** 08 — One way to resolve a person.

**Status:** SHIPPED — resolution uses the link. Only the criterion actually re-verified is ticked.

`person-seam.ts:123` resolves the person-record path on `hrPeople.organizationPersonId`, so the link is what proves a person present in both models is one human. Note the deliberate consequence recorded in backend `CLAUDE.md` §1: resolution **short-circuits**, so only the `person-record` path populates every facet and a `membership` answer reports `workerId: null` because it never looked. Resolve by `person` when all facets are needed.

- [x] Resolution uses the link to prove a person present in both models is one human, rather than inferring it from a matching name or email.
- [ ] (not re-verified) The link is populated whenever a person comes to exist in both models, on every path that can create that situation. Enumerate those paths rather than assuming there is one.
- [x] (re-verified) A person in both models resolves to a single result, not two. (`resolvePerson` returns one `PersonResolution` per subject by construction; `person-seam.spec.ts:160-175` tests a person who is simultaneously a member and a payee worker and returns one result; 20 tests pass)
- [x] (re-verified) A person in exactly one model still resolves. Neither model becomes mandatory. (`person-seam.spec.ts:57-65` — worker with null userId resolves via payee-worker path; `:68-88` — HR person with null userId and null membershipId resolves via person-record path with employment; 20 tests pass)
- [ ] (not re-verified) The partial unique index still holds — two HR people cannot link to the same directory person. A test asserts the conflict is refused rather than silently overwriting.
- [x] No column is added, altered or dropped.
- [ ] (not re-verified) The two payroll generations can be joined through the seam. Demonstrate it with a test that reaches an input keyed on one model from a run keyed on the other; that join being impossible is the concrete symptom this stream exists to remove.
