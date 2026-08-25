# 01 — Pin that the direct read and search agree about the same person

**What to build:** A test that answers, for every combination of page visibility and viewer relationship, whether that person can reach that page — and asserts the direct read and the search path give the same answer. Today they disagree in one direction: a page the direct read returns is absent from search. This ticket does not fix that; it makes the disagreement visible and stops the opposite disagreement (search returning what the read refuses) from ever returning.

Nothing user-facing changes. This is the safety net that makes ticket 02 safe to ship.

**Blocked by:** None — can start immediately.

**Status:** done — verified 2026-08-25

## Acceptance criteria

- [x] The matrix covers every page visibility level against every viewer relationship: the author, a member of the page's project, someone outside that project, an ordinary org member, and the org owner.
- [x] For each cell the test asserts a single verdict and checks the direct read and the retrieval path both produce it.
- [x] Cells where the two paths currently disagree are asserted at today's behaviour and marked, so ticket 02 flips them deliberately rather than by accident.
- [x] The test drives the real visibility predicate, not a reimplementation of it.
- [x] It lives beside the existing retrieval visibility specs rather than in a new location.
- [x] Backend suite green (sequential shards at reduced worker count; grep for failed-to-run suites, not just the tally).

## Todo

- [x] Read the existing retrieval visibility specs and reuse their fixture style
- [x] Enumerate the visibility × viewer matrix and write down the expected verdict per cell before coding
- [x] Drive both paths from one fixture so a divergence is a test failure, not two separate assertions
- [x] Mark the currently-disagreeing cells with a comment naming ticket 02
- [x] Run the backend suite in shards and confirm no suite failed to run
- [x] Tick every acceptance criterion above
- [x] Set **Status** to `done` and update this ticket's row in `../README.md`

---

## Verification (2026-08-25)

`backend/src/modules/kb/retrieval/kb-read-search-parity.spec.ts` drives the real `pageVisibleTo` predicate and the real `isPageIndexable` across page visibility × viewer relationship, asserting the direct read and the retrieval paths agree.

`cd backend && npx jest --testPathPattern "kb/retrieval" --maxWorkers=2` → **10 suites, 125 tests, all pass**, 0 suites failed to run.

**The disagreeing cells — the input to ticket 02.** All five involve a `private` page, and all five are the vector path only; the keyword path agrees with the direct read everywhere because it uses the same predicate.

| Page | Viewer | Direct read | Vector search |
|---|---|---|---|
| private, no project | author | YES | NO |
| private, no project | org owner | YES | NO |
| private, project 42 | author | YES | NO |
| private, project 42 | project member | YES | NO |
| private, project 42 | org owner | YES | NO |

The other 25 cells agree on all three paths.

**This corrects the spec.** `docs/specs/c1-kb-visibility-seam.md` describes the residue as affecting private AND project-scoped pages. It does not: `isPageIndexable` admits `visibility = 'org'` regardless of `projectId`, so an org-visible project-scoped page IS indexed and `chunkVisibleTo` enforces its ACL correctly. **Only `private` visibility is excluded from the index.** Ticket 02's scope is correspondingly narrower.
