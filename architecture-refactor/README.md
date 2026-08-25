# Architecture refactor — 2026-08-25

The complete program from the final architecture review: **18 PRDs and 87 tickets**, self-contained in this folder so it does not mix with the other work in `docs/`.

Each candidate folder holds its PRD and its tickets together:

~~~
architecture-refactor/
  <candidate>/
    prd.md              the spec — problem, solution, user stories, decisions
    README.md           the ticket index for this candidate
    issues/NN-slug.md   one ticket per file, numbered in dependency order
~~~

The nine candidates from the 2026-08-23 review (c1–c9) are **all closed**; their specs stay in [`docs/specs/`](../docs/specs/README.md) as history.

## The verdict this program starts from

**The architecture does not need replacing.** Zero import cycles in both repos. Zero unused frontend files across 4,429. Zero arbitrary colour classes across 591k lines. Zero `useEffect` firing an API call. CI rebuilds the database from empty. The RBAC model as originally envisioned is substantially already built.

What four passes found was not systemic decay. It was concentrated problems and two structural gaps: **the instrument that proves a query is fast is pointed at two queries, and nothing reports a failure in production.**

## Wave 0 — stops a loss, fixes a live bug, or makes the rest observable

| Candidate | Tickets | Done | Open |
|---|---|---|---|
| [c12 — Route text search through the id probe that already exists](c12-text-search-id-probe/README.md) | 3 | 0 | **3** |
| [c13 — One contract for every list](c13-one-list-contract/README.md) | 6 | 0 | **6** |
| [c15 — Outbound I/O leaves the request transaction](c15-outbound-io-leaves-the-request/README.md) | 5 | 1 | **4** |
| [c17 — Every billing write is provable](c17-billing-writes-are-provable/README.md) | 7 | 0 | **7** |
| [c19 — A cache key cannot be unsafe, and a write invalidates what it changed](c19-cache-keys-cannot-be-unsafe/README.md) | 5 | 0 | **5** |
| [c20 — A failure in production is visible](c20-failures-are-visible/README.md) | 5 | 0 | **5** |
| | **31** | **1** | **30** |

Start with **c20-01**. It is an afternoon, and it surfaces every other Wave 0 item as it happens — without it, each fix below is verified by hope.

## Wave 1 — stops recurrence, or removes the largest costs

| Candidate | Tickets | Done | Open |
|---|---|---|---|
| [c11 — Make "this query is fast" a thing CI proves](c11-read-cost-budgets/README.md) | 3 | 0 | **3** |
| [c14 — Background sweeps operate on sets, not on rows](c14-set-based-sweeps/README.md) | 3 | 0 | **3** |
| [c21 — Right models, right throughput — fan-out, retention and polling](c21-fanout-retention-and-polling/README.md) | 7 | 0 | **7** |
| [c22 — Scheduled work runs once, and a deploy sheds no requests](c22-scheduled-work-and-deploy-safety/README.md) | 4 | 2 | **2** |
| [c25 — Authorization cannot be omitted](c25-authorization-cannot-be-omitted/README.md) | 3 | 0 | **3** |
| [c26 — Commercial billing is a versioned ledger](c26-commercial-billing-ledger/README.md) | 5 | 0 | **5** |
| [c27 — Indexed knowledge obeys the same visibility as direct reads](c27-permissioned-knowledge-index/README.md) | 5 | 0 | **5** |
| | **30** | **2** | **28** |

## Wave 2 — mechanical, parallelisable

| Candidate | Tickets | Done | Open |
|---|---|---|---|
| [c16 — The schema says what it means](c16-schema-says-what-it-means/README.md) | 7 | 0 | **7** |
| [c18 — Removals are proved, not grepped](c18-removals-are-proved/README.md) | 4 | 0 | **4** |
| [c23 — A tenant extends the product without a deploy](c23-tenant-extensibility-without-migrations/README.md) | 5 | 0 | **5** |
| [c24 — The design system is the only way to build a screen](c24-frontend-consistency-and-access/README.md) | 5 | 0 | **5** |
| | **21** | **0** | **21** |

## Wave 3 — the read side

| Candidate | Tickets | Done | Open |
|---|---|---|---|
| [c10 — Make module-level standing answerable](c10-module-role-standing/README.md) | 5 | 0 | **5** |
| | **5** | **0** | **5** |

**87 tickets → 3 done, 84 open.**

## The six that matter most

| Ticket | Why it is first |
|---|---|
| [c20-01](c20-failures-are-visible/issues/01-errors-reach-a-person.md) | Zero error tracking exists. This is why every finding in the review had to be found by a person reading source. |
| [c17-02](c17-billing-writes-are-provable/issues/02-a-webhook-acknowledges-only-durable-work.md) | A customer can pay and not be credited, and nothing knows to retry. |
| [c19-01](c19-cache-keys-cannot-be-unsafe/issues/01-the-books-are-correct-when-an-entry-posts.md) | Post a journal entry and the books are wrong for five minutes. One line. |
| [c13-01](c13-one-list-contract/issues/01-a-ticket-opens-by-its-key.md) | The only correctness bug in the review — a ticket past #100 cannot be opened at all. |
| [c15-02](c15-outbound-io-leaves-the-request/issues/02-the-three-providers-adopt-the-deadline.md) | Three providers with no deadline, inside a transaction that spans the whole request. |
| [c12-02](c12-text-search-id-probe/issues/02-global-search-uses-the-probes.md) | The highest-traffic query in the product is five parallel sequential scans. |

## Rules that apply to every ticket here

- **Verify by running the app**, not only by test. Typecheck, build and a fully mocked suite have all been green here while nothing worked.
- **Prove a deletion with a module graph and a real build**, never a text search. A bare side-effect import is invisible to a scanner and has already cost a live file.
- **A `db.transaction` mock must invoke its callback.** A bare stub never runs the body, so every assertion inside it silently passes.
- **Do not rewrite a test to accommodate a change.** A test failing because behaviour changed is the signal.
- **Measure as the application's database role**, never as the owner — the owner bypasses row-level security and its plans are not the ones production gets.
- **After a table rewrite, vacuum and analyse.** A rewrite invalidates statistics and empties the visibility map.
- **Lint and tests are run only when asked**, and are reported as not run otherwise — never as passing.

## Reading the PRDs

- **No file path or line number is load-bearing.** They were accurate on 2026-08-25 and cited as evidence, not instruction. Re-read at source.
- **Each PRD's "Already shipped" section is as important as its "To build".** The previous round's main failure mode was re-specifying work that had landed.
- **Static analysis produces candidates, not conclusions.** Three scans in this review were wrong in the same direction — a route join off by three orders of magnitude, 155 N+1 loops that were 57, 588 unbounded reads that were ~85. All three were caught by classifying rather than counting.
- **Deliberately not raised**, because they are recorded decisions or already-disproved claims: the frontend permission-key subset, downgrade not revoking an enabled module, table splitting by width, key-type unification, migrating all naive timestamps, wrapping every text-match call site, and full APM/tracing. Do not re-raise them.
