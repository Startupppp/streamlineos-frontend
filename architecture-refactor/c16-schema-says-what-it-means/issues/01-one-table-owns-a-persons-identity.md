# 01 — One table owns a person's identity

**What to build:** A person's name, email, phone, date of birth, address and emergency contact live in exactly one place. Today two tables each carry all eleven, joined by a text column with no foreign key — so nothing prevents the link pointing at a row that does not exist, and nothing says which side wins when they disagree.

**Blocked by:** None — can start immediately

**Status:** ready-for-agent

## Acceptance criteria

- [ ] One table is named as the owner of identity, and the decision is written down before anything moves.
- [ ] The other table keeps only what is specific to it.
- [ ] The link is a real foreign key — inserting a link to a non-existent row is rejected by the database.
- [ ] After migration, no query can produce two different values for one person's identity field.
- [ ] An HR administrator correcting a phone number changes it everywhere.
- [ ] No person loses data in the migration, verified against production-shaped data.

## Todo

- [ ] Decide and record the canonical side first — leaving it implicit is how deduplication fails
- [ ] Migrate the loser's columns, then add the constraint
- [ ] Assert the no-divided-identity invariant at the catalog level, not in a unit test
- [ ] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md)

---

PRD: [`c16 — The schema says what it means`](../prd.md) · Candidate index: [`../README.md`](../README.md)
