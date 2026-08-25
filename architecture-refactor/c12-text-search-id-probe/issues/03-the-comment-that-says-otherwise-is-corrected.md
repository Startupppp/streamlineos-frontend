# 03 — The comment that says otherwise is corrected

**What to build:** The search service's header comment claims the trigram indexes are what its plain matches land on. Migration 0275 says the opposite, with the reasoning and a working implementation. The wrong sentence is why nobody re-checked for eleven days.

**Blocked by:** 02 — Global search uses the probes

**Status:** ready-for-agent

## Acceptance criteria

- [ ] The service comment states what is actually true and points at the migration that explains why.
- [ ] No other comment in the module contradicts the migration.
- [ ] Search is registered under a read budget so this cannot silently regress again.

## Todo

- [ ] Rewrite the comment
- [ ] Grep the module for the same claim elsewhere
- [ ] Add the budget entry once c11-01 lands
- [ ] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md)

---

PRD: [`c12 — Route text search through the id probe that already exists`](../prd.md) · Candidate index: [`../README.md`](../README.md)
