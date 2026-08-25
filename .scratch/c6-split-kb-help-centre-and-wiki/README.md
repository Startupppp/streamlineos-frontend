# c6 — Split the two products living inside the KB module

Spec: [`docs/specs/c6-split-kb-help-centre-and-wiki.md`](../../docs/specs/c6-split-kb-help-centre-and-wiki.md)

**Candidate status:** shipped on the backend — and it is the best-executed of the nine. 109 flat files became one, in the shape the review drew, with the retrieval folder landing exactly where it predicted candidate 1 would drag it. What remains is visible only to a developer: the frontend still uses two synonyms for two opposite products, the migration has no end date, and the shared permission namespace is undecided rather than decided.

| # | Ticket | Blocked by | Status |
|---|---|---|---|
| — | ticket 01 complete and retired | — | **candidate complete** |

**Candidate closed 2026-08-25.** Ticket 01 is done and its file deleted.

**Runtime check, which was the only thing outstanding:** with the API and web app both booted, `/knowledge/wiki` returned `200` (96,529 bytes) and the public help centre `200` (33,372 bytes), with zero `Module not found` / `Cannot find module` in either response and zero import errors in the dev log. That is what the 72-file import-path rename needed — a typecheck and a build cannot catch a bare side-effect import, but loading the two surfaces can.

**Ticket 01 is the cheapest work in the whole review with the highest legibility payoff** — two renames, and telling the two products apart stops being a coin flip.

**The migration folder standing alone is both the win and the risk.** It is now obvious enough to delete that someone may delete it before the backlog is drained. Ticket 02's recorded condition is what prevents that. If it is ever retired, remember that a dead-code tool alone never justifies deleting a schema file — a path search for specs asserting the file, and an FK check, come first.
