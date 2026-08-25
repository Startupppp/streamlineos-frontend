# c1 — KB visibility predicate as a seam both paths cross

Spec: [`docs/specs/c1-kb-visibility-seam.md`](../../docs/specs/c1-kb-visibility-seam.md)

**Candidate status:** shipped, one residue. The shared visibility predicate is in place and the disclosure the review verified is fixed. What remains is index eligibility, which still states a visibility rule of its own — no longer a leak, now a capability gap.

| # | Ticket | Blocked by | Status |
|---|---|---|---|
| 01 | [Pin that the direct read and search agree about the same person](issues/01-pin-read-search-parity.md) | — | ready-for-agent |
| 02 | [I can find my own private page by searching for it](issues/02-index-eligibility-is-lifecycle-only.md) | 01 | ready-for-agent |
| 03 | [Pages that already exist become findable too](issues/03-backfill-previously-ineligible-pages.md) | 02 | ready-for-agent |

**On completing a ticket:** tick its todo list, set its `Status` to `done` in the ticket file, and update its row above.
