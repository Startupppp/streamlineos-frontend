# 62 — One active cycle per project, and no overlapping cycles, enforced by the database

**What to build:** Two people activating a cycle at the same moment cannot both succeed. Both cycle invariants — only one active cycle per project, and cycle dates must not overlap — are read-then-write with no row lock, no advisory lock and no database constraint. The update path throws a conflict naming the invariant, which tells every reader it is enforced; it is enforced against sequential callers only.

A partial unique index on the project keyed to the active status, and an exclusion constraint over the date range, make them real. Keep the application check for the good error message and let the constraint be the authority — the application check becomes a courtesy, not the guarantee.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] A second active cycle for the same project is rejected by the database
- [ ] Overlapping cycle date ranges for the same project are rejected by the database
- [ ] The constraint violation is translated into the same conflict response the application check produces, so the client behaviour is unchanged
- [ ] Existing rows are checked for violations before the constraint is added, and any found are reported rather than silently coerced
- [ ] The migration is journalled with a rollback authored and a lock timeout set, and is applied before the code relies on it
- [ ] Verified in a rolled-back transaction as the application role
