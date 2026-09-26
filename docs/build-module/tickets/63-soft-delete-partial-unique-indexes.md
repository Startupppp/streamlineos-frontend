# 63 — Deleting something frees its name

**What to build:** Delete a team keyed PLAT and you can create a new team keyed PLAT. Seven unique indexes cover columns on soft-deleted rows — the team key, the ticket number within a project, the risk, decision, change-request and form numbers, and a feedbucket widget's public key — and none is restricted to rows that are not deleted. So a user sees a key as free, uses it, and gets a uniqueness error naming a row they cannot see. The widget case is worse than an error: a soft-deleted widget burns its public key permanently, leaving a dead embed endpoint that can never be reissued.

The module already knows the right form — one project index does exactly this correctly, restricted to undeleted rows. Copy it seven times.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] Each of the seven indexes is restricted to rows that are not deleted
- [ ] Deleting and recreating each affected key succeeds
- [ ] Two live rows still cannot share a key
- [ ] Existing duplicate-among-deleted data is surveyed before the change, since the new index must still build
- [ ] Indexes are created concurrently where the table warrants it, each migration journalled with a rollback
- [ ] Any number-allocation query that assumed the old index still allocates correctly
