# 01 — One table owns a person's identity

**What to build:** A person's name, email, phone, date of birth, address and emergency contact live in exactly one place. Today two tables each carry all eleven, joined by a text column with no foreign key — so nothing prevents the link pointing at a row that does not exist, and nothing says which side wins when they disagree.

**Blocked by:** None — can start immediately

**Status:** ready-for-agent

**Audit note (2026-08-26):** The FK from `hr_people` to `organization_people` EXISTS in the Drizzle schema code (`backend/src/db/schema/hr/core-people.ts:116-123`, constraint name `fk_hr_people_org_person`) but is in unapplied migration `0486_hr_people_org_person_link.sql` + `0487_hr_people_org_person_validate.sql`. The identity columns are duplicated in both tables (confirmed: `firstName`, `lastName`, `workEmail`, `personalEmail`, `phone`, `dateOfBirth`, `gender`, `address`, `emergencyContact` appear on both). The link column `organizationPersonId` is nullable — `hr_people` rows without an `organizationPersonId` still exist and cannot be constrained until 0486-0488 are applied. All criteria below are BLOCKED on unapplied migrations 0486-0488.

**Lane 4 correction (2026-08-26): the audit note above is wrong about 0486 and 0487 — both ARE journalled.** Verified by reading `migrations/meta/_journal.json` directly: `0486_hr_people_org_person_link` at **idx 274**, `0487_hr_people_org_person_validate` at **idx 275**. The link is backfilled and the foreign key is added **and validated** by `db:migrate`. Only `0488_hr_people_drop_identity_cols` is absent from the journal — and that absence is **deliberate and documented in the migration file itself**, not an oversight.

## Acceptance criteria

- [x] One table is named as the owner of identity, and the decision is written down before anything moves. — `backend/CLAUDE.md` §1: "**`organization_people` is the person; everything else is a facet of one.** A human in an organisation is exactly one `organization_people` row. `organization_members` adds a **login**, `workers` adds **payability**, `hr_people` + `hr_employments` add **employment**." The rule was written before 0486 moved anything, and `modules/directory/person-seam.ts` is the resolution path it mandates.
- [ ] The other table keeps only what is specific to it. — **BLOCKED on `0488`.** `hr_people` still carries `firstName` (`core-people.ts:77`), `lastName` (`:78`), `workEmail` (`:79`), `personalEmail` (`:80`), `phone` (`:81`), `dateOfBirth` (`:82`), `gender` (`:83`), `address` (`:84-91`), `emergencyContact` (`:92-96`).
- [x] The link is a real foreign key — inserting a link to a non-existent row is rejected by the database. — `backend/src/db/schema/hr/core-people.ts:116-123` declares the composite FK `fk_hr_people_org_person` on `(org_id, organization_person_id)` → `organization_people(organization_id, organization_person_id)` with `ON DELETE RESTRICT`. `backend/migrations/0486_hr_people_org_person_link.sql` adds it `NOT VALID` (journal idx 274) — which already rejects every new bad link — and `0487_hr_people_org_person_validate.sql` runs `VALIDATE CONSTRAINT` (journal idx 275), extending the guarantee to rows that already existed.
- [ ] After migration, no query can produce two different values for one person's identity field. — **BLOCKED on `0488`.** Both tables still hold all nine columns, so two values remain representable.
- [ ] An HR administrator correcting a phone number changes it everywhere. — **BLOCKED on `0488`,** and on the call-site work below.
- [ ] No person loses data in the migration, verified against production-shaped data. — **BLOCKED on a live database.** `0486` does the copy in four phases (null out dangling links → match by email → insert missing `organization_people` rows → re-link) and `0487` validates, but "verified against production-shaped data" is a measurement Lane 4 cannot take.

## Todo

- [x] Decide and record the canonical side first — leaving it implicit is how deduplication fails — recorded in `backend/CLAUDE.md` §1 and enforced through `modules/directory/person-seam.ts`.
- [x] Migrate the loser's columns, then add the constraint — done in that order and journalled: `0486` (copy + `ADD CONSTRAINT … NOT VALID`, idx 274) then `0487` (`VALIDATE CONSTRAINT`, idx 275).
- [ ] Assert the no-divided-identity invariant at the catalog level, not in a unit test — **BLOCKED on `0488`:** while both tables carry the columns there is no catalog-level statement to make.
- [ ] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md)

**Lane 4 note (2026-08-26) — the remaining blocker, measured.** `0488` is held out of the journal on purpose. Its own header states the three preconditions: (1) `0487` succeeded with zero violations, (2) "all call-sites outside the owned trees that read identity from `hr_people` have been updated to read from `organization_people` instead", (3) that new code is deployed and confirmed in production. Precondition 1 is now met. **Precondition 2 is measurably not:** 19 call sites across 7 files still read an identity column straight off `hrPeople` — `modules/hr/import/hr-import-commit.service.ts`, `modules/hr/lifecycle/experience-letter.service.ts`, `modules/hr/lifecycle/probation-review-reader.service.ts`, `modules/hr/onboarding/core/onboarding-details.service.ts`, `modules/hr/recruitment/recruitment-handoff.service.ts`, `modules/payroll/lib/payroll-run-payee.ts` and `scripts/seed-enterprise-workspace.ts`. Precondition 3 is an operator action in any case. Lane 4 deliberately did **not** convert those 19 sites: a blind rewrite of every identity read with no database to verify against is exactly the kind of change `0488`'s header is warning about, and it would not unblock the migration anyway while precondition 3 stands.

---

PRD: [`c16 — The schema says what it means`](../prd.md) · Candidate index: [`../README.md`](../README.md)
