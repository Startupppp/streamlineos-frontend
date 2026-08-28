# 01: Remove stale global-user employment writes

**What to build:** Bulk employee updates write department, branch and manager data only to organization-scoped person/employment assignments, so migrated databases never receive removed global-user columns.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

- [ ] Bulk department, branch and manager updates complete through organization-scoped records in one transaction.
- [ ] The global user update contract cannot express organization employment fields.
- [ ] Multi-organization and migrated-schema tests prove no cross-org write or removed-column runtime failure.
- [ ] Backend typecheck and focused runtime tests pass with evidence recorded here.
