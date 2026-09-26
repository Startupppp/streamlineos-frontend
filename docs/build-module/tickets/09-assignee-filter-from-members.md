# 09 — Source the assignee filter from members, not from a capped project list

**What to build:** Every person who can be assigned work appears in the All Work assignee filter, regardless of how many projects the organisation has. Today the options are assembled by flattening the member arrays embedded in a project list capped at 100 projects, so anyone who is only a member of projects beyond that cap is silently absent — their work cannot be filtered by assignee, and nothing indicates they are missing. This is a wrong answer, not a slow one.

An embedded member array on a capped list is not a member directory. Use the member read that supports a server-side search term and whose paging is independent of project count, with the debounced-search pattern the ticket picker already uses.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] Assignee options come from the member read, not from project rows
- [ ] Filtering by a member reachable only through a project beyond the old cap works
- [ ] Typing in the assignee picker filters server-side and is debounced
- [ ] No client-side filter is applied to a page-limited list as though it were complete
