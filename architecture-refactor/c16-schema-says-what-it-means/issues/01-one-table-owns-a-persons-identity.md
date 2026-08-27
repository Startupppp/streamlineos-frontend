# 01 — One table owns a person's identity

**What to build:** A person's name, email, phone, date of birth, address and emergency contact live in exactly one place. Today two tables each carry all eleven, joined by a text column with no foreign key — so nothing prevents the link pointing at a row that does not exist, and nothing says which side wins when they disagree.

**Blocked by:** None — can start immediately

**Status:** ready-for-agent

**Audit note (2026-08-26):** The FK from `hr_people` to `organization_people` EXISTS in the Drizzle schema code (`backend/src/db/schema/hr/core-people.ts:116-123`, constraint name `fk_hr_people_org_person`) but is in unapplied migration `0486_hr_people_org_person_link.sql` + `0487_hr_people_org_person_validate.sql`. The identity columns are duplicated in both tables (confirmed: `firstName`, `lastName`, `workEmail`, `personalEmail`, `phone`, `dateOfBirth`, `gender`, `address`, `emergencyContact` appear on both). The link column `organizationPersonId` is nullable — `hr_people` rows without an `organizationPersonId` still exist and cannot be constrained until 0486-0488 are applied. All criteria below are BLOCKED on unapplied migrations 0486-0488.

## Acceptance criteria

- [ ] One table is named as the owner of identity, and the decision is written down before anything moves. — **BLOCKED:** on migrations 0486-0488 being applied; the house rule (`organization_people IS the person`) is already documented in `backend/CLAUDE.md §1`.
- [ ] The other table keeps only what is specific to it. — **BLOCKED:** `hr_people` still carries `firstName`, `lastName`, `workEmail`, `personalEmail`, `phone`, `dateOfBirth`, `gender`, `address`, `emergencyContact` at `core-people.ts:76-96`; migration `0488_hr_people_drop_identity_cols.sql` is unapplied.
- [ ] The link is a real foreign key — inserting a link to a non-existent row is rejected by the database. — **BLOCKED:** FK exists in schema code (`core-people.ts:116-123`) but migrations 0486/0487 are unapplied, so the constraint is not in the live database.
- [ ] After migration, no query can produce two different values for one person's identity field. — **BLOCKED:** depends on 0488 dropping the duplicate columns.
- [ ] An HR administrator correcting a phone number changes it everywhere. — **BLOCKED:** depends on 0488.
- [ ] No person loses data in the migration, verified against production-shaped data. — **BLOCKED:** requires a live database; no DB access in this program.

## Todo

- [ ] Decide and record the canonical side first — leaving it implicit is how deduplication fails — **BLOCKED:** house rule exists in CLAUDE.md; migration plan deferred to after 0486-0488 apply.
- [ ] Migrate the loser's columns, then add the constraint — **BLOCKED:** migrations 0486-0488 unapplied.
- [ ] Assert the no-divided-identity invariant at the catalog level, not in a unit test — **BLOCKED:** depends on migration completion.
- [ ] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md)

---

PRD: [`c16 — The schema says what it means`](../prd.md) · Candidate index: [`../README.md`](../README.md)
