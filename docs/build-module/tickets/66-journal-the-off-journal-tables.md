# 66 — Every live Build table is created by a journalled migration

**What to build:** A database replayed from cold serves the QA and bug surfaces instead of answering "relation does not exist". Two tables the bug service reads live — the QA detail table and the bug-to-work-item map — are created only by a file in a directory the migration chain verifier does not know about, and appear in zero journalled migrations. The same is true of a cycle scope event rename the burnup report depends on. BE-66 requires replay on an empty database; today that replay produces a schema the application cannot run against.

Re-journalling is safe because the create statements are already conditional. The rename is the exception and needs a guard that tolerates the object already carrying its new name.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] Both tables are created by journalled migrations, with journal entries whose indexes are unique and strictly increasing per BE-59
- [ ] The cycle scope event rename is journalled behind a guard that is safe whether or not it has already happened
- [ ] The migration chain verifier sees every directory that creates a live Build table, or the stray directory is retired
- [ ] Replaying the chain on an empty database produces a schema the bug service and burnup report can read
- [ ] The production ledger is reconciled by hash for the new entries rather than replayed over live objects
- [ ] Nothing is applied to production before the entries are confirmed to be no-ops against it
