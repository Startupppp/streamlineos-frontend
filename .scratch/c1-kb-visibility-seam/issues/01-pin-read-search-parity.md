# 01 — Pin that the direct read and search agree about the same person

**What to build:** A test that answers, for every combination of page visibility and viewer relationship, whether that person can reach that page — and asserts the direct read and the search path give the same answer. Today they disagree in one direction: a page the direct read returns is absent from search. This ticket does not fix that; it makes the disagreement visible and stops the opposite disagreement (search returning what the read refuses) from ever returning.

Nothing user-facing changes. This is the safety net that makes ticket 02 safe to ship.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

## Acceptance criteria

- [ ] The matrix covers every page visibility level against every viewer relationship: the author, a member of the page's project, someone outside that project, an ordinary org member, and the org owner.
- [ ] For each cell the test asserts a single verdict and checks the direct read and the retrieval path both produce it.
- [ ] Cells where the two paths currently disagree are asserted at today's behaviour and marked, so ticket 02 flips them deliberately rather than by accident.
- [ ] The test drives the real visibility predicate, not a reimplementation of it.
- [ ] It lives beside the existing retrieval visibility specs rather than in a new location.
- [ ] Backend suite green (sequential shards at reduced worker count; grep for failed-to-run suites, not just the tally).

## Todo

- [ ] Read the existing retrieval visibility specs and reuse their fixture style
- [ ] Enumerate the visibility × viewer matrix and write down the expected verdict per cell before coding
- [ ] Drive both paths from one fixture so a divergence is a test failure, not two separate assertions
- [ ] Mark the currently-disagreeing cells with a comment naming ticket 02
- [ ] Run the backend suite in shards and confirm no suite failed to run
- [ ] Tick every acceptance criterion above
- [ ] Set **Status** to `done` and update this ticket's row in `../README.md`
