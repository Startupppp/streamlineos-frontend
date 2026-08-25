# 02 — Object access and DataScope share one query seam

**Status:** ready-for-agent

## Acceptance criteria

- [ ] Record-by-id reads and writes compose `org_id`, soft-delete, DataScope and domain ACL in SQL.
- [ ] No protected row is fetched and then rejected in application code.
- [ ] Cross-tenant and invisible records both return not-found.
- [ ] Each domain owns its predicate; no generic dynamic table abstraction is introduced.
- [ ] Bulk operations apply the predicate once to the set, not once per row.

## Todo

- [ ] Start with chat channels, KB pages and module-access mutations
- [ ] Add same-tenant/cross-tenant allow-deny matrices
- [ ] Delete superseded shallow check helpers after their last caller moves
