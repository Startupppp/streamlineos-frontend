# 16 — Give the activity log a project column

**What to build:** The activity log can be filtered by project directly. It currently has no project column, so a project's feed has to reach the project through a join on the ticket and no index can serve the filter. Add the column, backfill it, and index it — with no reader change yet, so nothing can break.

This is the expand half; ticket 17 switches the reader.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] The column is added nullable and backfilled from the existing ticket relationship
- [ ] A partial index supports filtering by organisation and project in the feed's sort order
- [ ] The migration is journalled with a rollback authored, and sets a lock timeout
- [ ] No reader depends on the new column yet
- [ ] Applied and independently verified before any code reads it
