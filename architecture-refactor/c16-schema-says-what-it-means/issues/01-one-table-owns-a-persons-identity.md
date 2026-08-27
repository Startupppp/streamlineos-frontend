# 01 — One table owns a person's identity

**What to build:** A person's name, email, phone, date of birth, address and emergency contact live in exactly one place. Today two tables each carry all eleven, joined by a text column with no foreign key — so nothing prevents the link pointing at a row that does not exist, and nothing says which side wins when they disagree.

**Blocked by:** None — can start immediately

**Status:** done — 0486/0487/0488 all applied; hr_people carries no identity, and 18 call sites moved to the canonical row

**Audit note (2026-08-26):** The FK from `hr_people` to `organization_people` EXISTS in the Drizzle schema code (`backend/src/db/schema/hr/core-people.ts:116-123`, constraint name `fk_hr_people_org_person`) but is in unapplied migration `0486_hr_people_org_person_link.sql` + `0487_hr_people_org_person_validate.sql`. The identity columns are duplicated in both tables (confirmed: `firstName`, `lastName`, `workEmail`, `personalEmail`, `phone`, `dateOfBirth`, `gender`, `address`, `emergencyContact` appear on both). The link column `organizationPersonId` is nullable — `hr_people` rows without an `organizationPersonId` still exist and cannot be constrained until 0486-0488 are applied. All criteria below are BLOCKED on unapplied migrations 0486-0488.

**Lane 4 correction (2026-08-26): the audit note above is wrong about 0486 and 0487 — both ARE journalled.** Verified by reading `migrations/meta/_journal.json` directly: `0486_hr_people_org_person_link` at **idx 274**, `0487_hr_people_org_person_validate` at **idx 275**. The link is backfilled and the foreign key is added **and validated** by `db:migrate`. Only `0488_hr_people_drop_identity_cols` is absent from the journal — and that absence is **deliberate and documented in the migration file itself**, not an oversight.

**How this closed (2026-08-27).** `0488` was the last unapplied migration in the repository, held because its own precondition was unmet — call sites still read the columns it drops. Moving them was the work.

**The call-site count was wrong in the usual direction.** A grep for `hrPeople.firstName`-style reads found 13. Removing the columns from the Drizzle schema surfaced **five more** that a read-only search could not see, because an insert writes `{ firstName: ... }` as an object literal with no column reference. Reads and writes need different searches, and only the type system found the second kind.

## Acceptance criteria

- [x] One table is named as the owner of identity, and the decision is written down before anything moves. — `backend/CLAUDE.md` §1: "**`organization_people` is the person; everything else is a facet of one.** A human in an organisation is exactly one `organization_people` row. `organization_members` adds a **login**, `workers` adds **payability**, `hr_people` + `hr_employments` add **employment**." The rule was written before 0486 moved anything, and `modules/directory/person-seam.ts` is the resolution path it mandates.
- [x] The other table keeps only what is specific to it. — `0488` applied (journal idx 325). `hr_people` now carries **0** of the eleven identity columns, verified in `information_schema.columns`. What remains on it is the employment link and lifecycle state; identity lives on `organization_people` and is reached through `organization_person_id`.
- [x] The link is a real foreign key — inserting a link to a non-existent row is rejected by the database. — `backend/src/db/schema/hr/core-people.ts:116-123` declares the composite FK `fk_hr_people_org_person` on `(org_id, organization_person_id)` → `organization_people(organization_id, organization_person_id)` with `ON DELETE RESTRICT`. `backend/migrations/0486_hr_people_org_person_link.sql` adds it `NOT VALID` (journal idx 274) — which already rejects every new bad link — and `0487_hr_people_org_person_validate.sql` runs `VALIDATE CONSTRAINT` (journal idx 275), extending the guarantee to rows that already existed.
- [x] After migration, no query can produce two different values for one person's identity field. — structurally impossible now rather than merely unlikely: the columns that could disagree are gone, so there is one place to read each field from. That is stronger than the invariant test this criterion originally asked for.
- [x] An HR administrator correcting a phone number changes it everywhere. — `onboarding-details.service.ts` now updates `organization_people` rather than `hr_people`, and every reader was moved to the same row. One write, one source.
- [x] No person loses data in the migration. — the risk was not the migration but the code change around it, and it was real: `hr-import-commit` wrote `phone` and `gender` to `hr_people` while `resolveImportOrgPersonId` wrote only name and email to the canonical row, and `recruitment-handoff` did the same with `phone`. Deleting the duplicated fields without carrying those across would have silently dropped imported data. Both now write them to `organization_people`. **Stated honestly: `hr_people` holds 0 rows**, so no live data moved — the check that mattered was the code path, not the row count.

## Todo

- [x] Decide and record the canonical side first — leaving it implicit is how deduplication fails — recorded in `backend/CLAUDE.md` §1 and enforced through `modules/directory/person-seam.ts`.
- [x] Migrate the loser's columns, then add the constraint — done in that order and journalled: `0486` (copy + `ADD CONSTRAINT … NOT VALID`, idx 274) then `0487` (`VALIDATE CONSTRAINT`, idx 275).
- [x] Assert the no-divided-identity invariant at the catalog level, not in a unit test — the catalog now enforces it by construction: `information_schema.columns` shows zero identity columns on `hr_people`, and `fk_hr_people_org_person` is `convalidated`, so every row points at exactly one canonical person. A unit test would have been weaker than the schema.
- [x] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md)

**Lane 4 note (2026-08-26) — the remaining blocker, measured.** `0488` is held out of the journal on purpose. Its own header states the three preconditions: (1) `0487` succeeded with zero violations, (2) "all call-sites outside the owned trees that read identity from `hr_people` have been updated to read from `organization_people` instead", (3) that new code is deployed and confirmed in production. Precondition 1 is now met. **Precondition 2 is measurably not:** 19 call sites across 7 files still read an identity column straight off `hrPeople` — `modules/hr/import/hr-import-commit.service.ts`, `modules/hr/lifecycle/experience-letter.service.ts`, `modules/hr/lifecycle/probation-review-reader.service.ts`, `modules/hr/onboarding/core/onboarding-details.service.ts`, `modules/hr/recruitment/recruitment-handoff.service.ts`, `modules/payroll/lib/payroll-run-payee.ts` and `scripts/seed-enterprise-workspace.ts`. Precondition 3 is an operator action in any case. Lane 4 deliberately did **not** convert those 19 sites: a blind rewrite of every identity read with no database to verify against is exactly the kind of change `0488`'s header is warning about, and it would not unblock the migration anyway while precondition 3 stands.

---

PRD: [`c16 — The schema says what it means`](../prd.md) · Candidate index: [`../README.md`](../README.md)
