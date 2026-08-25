# c6 — Split the two products living inside the KB module

Spec: [`docs/specs/c6-split-kb-help-centre-and-wiki.md`](../../docs/specs/c6-split-kb-help-centre-and-wiki.md)

**Candidate status:** shipped on the backend — and it is the best-executed of the nine. 109 flat files became one, in the shape the review drew, with the retrieval folder landing exactly where it predicted candidate 1 would drag it. What remains is visible only to a developer: the frontend still uses two synonyms for two opposite products, the migration has no end date, and the shared permission namespace is undecided rather than decided.

| # | Ticket | Blocked by | Status |
|---|---|---|---|
| 01 | [The frontend folder name says which product it holds](issues/01-rename-the-frontend-features.md) | — | ready-for-agent |
| 02 | [The article migration acquires an end date](issues/02-measure-the-article-migration-backlog.md) | — | ready-for-agent |
| 03 | [Whether the two products share one permission namespace is a decision](issues/03-record-the-kb-namespace-decision.md) | — | ready-for-agent |

**On completing a ticket:** tick its todo list, set its `Status` to `done` in the ticket file, and update its row above.

**Ticket 01 is the cheapest work in the whole review with the highest legibility payoff** — two renames, and telling the two products apart stops being a coin flip.

**The migration folder standing alone is both the win and the risk.** It is now obvious enough to delete that someone may delete it before the backlog is drained. Ticket 02's recorded condition is what prevents that. If it is ever retired, remember that a dead-code tool alone never justifies deleting a schema file — a path search for specs asserting the file, and an FK check, come first.
