# 64 — A ticket cannot carry a status no project defines

**What to build:** A board can never render a column named *bananas*. The foreign key from a ticket's status to its project's status list is composite — organisation, project, status — declared without a match clause, which means the PostgreSQL default: the key is **not checked at all** when any referencing column is null. The project column on tickets is nullable, so a row naming a status that exists nowhere inserts cleanly. An earlier migration declined to add a check constraint precisely because it trusted this foreign key.

The same null hole disarms the uniqueness of a ticket's number within its project, so project-less tickets can share a number.

Deciding *how* to close it is part of the work: requiring the project column, requiring all-or-nothing matching, or both. Whichever is chosen, the survey of existing project-less rows comes first — they are the reason the column is nullable.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] A ticket with a status no project defines cannot be inserted or updated into existence
- [ ] Project-less tickets can no longer share a ticket number, or the reason they may is recorded
- [ ] Existing rows are surveyed for both violations before the constraint changes, and findings are reported
- [ ] The migration is journalled with a rollback authored and a lock timeout set
- [ ] The check constraint the earlier migration declined to add is either added or recorded as unnecessary now, with its reason
- [ ] Verified in a rolled-back transaction as the application role
