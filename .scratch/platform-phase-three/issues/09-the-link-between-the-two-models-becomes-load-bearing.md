
# 09 — A person present in both models is provably the same person

**What to build:** The link column stops being decorative.

The HR person model already carries a nullable link to the directory person, with a partial unique index on it. Nothing depends on it, so today a person can exist in both models with no proof they are the same human — and the two payroll generations, one keyed on HR people and one keyed on workers, have no join path between them.

No schema change is needed. The column exists; this ticket makes resolution use it and keeps it populated.

**Blocked by:** 08 — One way to resolve a person.

**Status:** DONE — resolution used the link; as of 2026-08-24 (`2366a8eb`) the link is also **written**, which is what made the rest of this ticket true rather than aspirational.

`person-seam.ts:123` resolves the person-record path on `hrPeople.organizationPersonId`, so the link is what proves a person present in both models is one human. Note the deliberate consequence recorded in backend `CLAUDE.md` §1: resolution **short-circuits**, so only the `person-record` path populates every facet and a `membership` answer reports `workerId: null` because it never looked. Resolve by `person` when all facets are needed.

- [x] Resolution uses the link to prove a person present in both models is one human, rather than inferring it from a matching name or email.
- [x] The link is populated whenever a person comes to exist in both models, on every path that can create that situation. **Enumerated rather than assumed — there are four**, and all four omitted it, which made `person-seam.ts`'s person-record path a dead letter for every row created since the column was added:
  1. `hr-people.service.ts` — direct create
  2. `hr-import-commit.service.ts` — the importer, which also backfills the link on an existing unlinked row
  3. `person-employment-sync.service.ts` — user-to-person sync, resolving by `userId` first and then work email
  4. `recruitment-handoff.service.ts` — offer accepted

  Where no `organization_people` row answers, one is created: backend §1 says a human in an organisation is exactly one such row, so leaving the facet unlinked would preserve the defect.
- [x] (re-verified) A person in both models resolves to a single result, not two. (`resolvePerson` returns one `PersonResolution` per subject by construction; `person-seam.spec.ts:160-175` tests a person who is simultaneously a member and a payee worker and returns one result; 20 tests pass)
- [x] (re-verified) A person in exactly one model still resolves. Neither model becomes mandatory. (`person-seam.spec.ts:57-65` — worker with null userId resolves via payee-worker path; `:68-88` — HR person with null userId and null membershipId resolves via person-record path with employment; 20 tests pass)
- [x] The partial unique index still holds — two HR people cannot link to the same directory person. Every one of the four paths catches `23505` on `uniq_hr_people_org_person_link` and raises `ConflictException` (409) rather than a 500 or a silent overwrite, and `hr-people.service.spec.ts:95` asserts the refusal.
- [x] No column is added, altered or dropped.
- [~] The two payroll generations can be joined through the seam. The join is now **possible** — the link is written on every path, and `person-seam.ts:123` resolves `person-record` on it — but the crossing test named here was not written. What is proven is the precondition, not the crossing.
