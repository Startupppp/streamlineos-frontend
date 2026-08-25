# 01 — A read budget is data, not a script

**What to build:** A developer declares a cost budget for a query by adding a table entry — a name, the fixtures it needs, a block ceiling, and any plan assertions — rather than editing a script. The runner keeps everything the current one does.

**Blocked by:** None — can start immediately

**Status:** ready-for-agent

## Acceptance criteria

- [ ] A budget entry carries an id, query text, fixture requirements, a shared-block ceiling and zero or more plan assertions.
- [ ] Plan assertions can require an Index Only Scan on a relation and can forbid a sequential scan on a relation.
- [ ] The runner connects as the app role and sets the tenant GUC inside the transaction before measuring.
- [ ] A budget whose named relation is absent from the plan fails, rather than passing vacuously.
- [ ] A malformed budget entry is rejected at load rather than skipped.
- [ ] The two existing checks are expressed as budget entries with no change in behaviour.

## Todo

- [ ] Promote the two hard-coded checks into entries
- [ ] Add the forbid-sequential-scan assertion kind
- [ ] Unit-test the plan walker against a recorded EXPLAIN fixture — no database needed
- [ ] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md)

---

PRD: [`c11 — Make "this query is fast" a thing CI proves`](../prd.md) · Candidate index: [`../README.md`](../README.md)
