# 03 — Whether the two products share one permission namespace is a decision

**What to build:** A recorded decision on whether the public help centre and the internal wiki continue to share one permission namespace. The backend folders are now separate; the vocabulary that gates them is not. A grant intended to give someone help-centre authorship may or may not also confer wiki authority depending on which key it happens to be — and nobody has decided whether that is correct.

This is a decision, not a refactor. The bar for splitting is high: renaming a key breaks every stored grant and needs a backfill migration, so "it would be tidier" does not clear it.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

## Acceptance criteria

- [ ] Every key in the shared namespace is listed and attributed to the help centre, the wiki, or genuinely both.
- [ ] Any key that currently confers authority across both products is identified explicitly — that is the case that decides this.
- [ ] A written verdict: keep one namespace, or split, with the reasoning.
- [ ] If keeping: the rationale is recorded where a future reader will find it, so it is not re-litigated.
- [ ] If splitting: the consequences are stated — a key rename invalidates stored grants, needs a backfill migration, and must land in both catalogs simultaneously or the frontend gate fails forever.
- [ ] No key changes in this ticket. Execution, if any, is a separate ticket written after this one.

## Todo

- [ ] Enumerate the namespace's keys from the catalog and attribute each to a product
- [ ] Find the keys that cross both products and check what standing they actually confer
- [ ] Check whether any role template grants a key that reaches the other product
- [ ] Decide and record the verdict with reasoning
- [ ] If splitting, write the follow-up ticket rather than starting the work here
- [ ] Tick every acceptance criterion above
- [ ] Set **Status** to `done` and update this ticket's row in `../README.md`
