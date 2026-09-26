# 17 — Read the project activity feed by project

**What to build:** Opening a project's activity feed reads only that project's events. Today the query filters by organisation and pushes the project constraint into a join, so the planner scans the organisation's entire event log to assemble one page — the cost grows with every other project in the organisation, not with the project being viewed.

**Blocked by:** 16 — Give the activity log a project column.

**Status:** ready-for-agent

- [ ] The feed query filters on the project column directly
- [ ] The query's filter, ordering and cursor are all served by one index range
- [ ] The feed returns the same entries in the same order as before
- [ ] Cursor paging still yields each entry exactly once
