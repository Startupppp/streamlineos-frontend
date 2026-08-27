# Architecture refactor — final review, 2026-08-26

The complete program from the final architecture review: **18 PRDs and 90 tickets**, self-contained in this folder so it does not mix with the other work in `docs/`.

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

What the passes found was not systemic decay. It was concentrated correctness and scale failures around omission-proof authorization, list cursors, commercial billing truth, calendar expansion, durable knowledge ingestion and production signal delivery. Existing deep modules are explicitly preserved.

## Wave 0 — stops a loss, fixes a live bug, or makes the rest observable

| Candidate | Tickets | Done | Open |
|---|---|---|---|
| [c12 — Route text search through the id probe that already exists](c12-text-search-id-probe/README.md) | 3 | 2 | **1** |
| [c13 — One contract for every list](c13-one-list-contract/README.md) | 6 | 1 | **5** |
| [c15 — Outbound I/O leaves the request transaction](c15-outbound-io-leaves-the-request/README.md) | 6 | 5 | **1** |
| [c17 — Every billing write is provable](c17-billing-writes-are-provable/README.md) | 7 | 1 | **6** |
| [c19 — A cache key cannot be unsafe, and a write invalidates what it changed](c19-cache-keys-cannot-be-unsafe/README.md) | 5 | 5 | **0** |
| [c20 — A failure in production is visible](c20-failures-are-visible/README.md) | 5 | 5 | **0** |
| | **32** | **19** | **13** |

**c20-01 is done, and it was the right thing to do first.** The reporter port had no adapter, so `reportError` discarded everything — and two of its five call sites (`workflow-runner`, `import-pump`) report *without* also logging, so every workflow-run and import failure was reaching nobody. That is now a structured log record, no vendor.

## Wave 1 — stops recurrence, or removes the largest costs

| Candidate | Tickets | Done | Open |
|---|---|---|---|
| [c11 — Make "this query is fast" a thing CI proves](c11-read-cost-budgets/README.md) | 3 | 3 | **0** |
| [c14 — Background sweeps operate on sets, not on rows](c14-set-based-sweeps/README.md) | 3 | 3 | **0** |
| [c21 — Right models, right throughput — fan-out, retention and polling](c21-fanout-retention-and-polling/README.md) | 7 | 4 | **3** |
| [c22 — Scheduled work runs once, and a deploy sheds no requests](c22-scheduled-work-and-deploy-safety/README.md) | 4 | 4 | **0** |
| [c25 — Authorization cannot be omitted](c25-authorization-cannot-be-omitted/README.md) | 4 | 0 | **4** |
| [c26 — Commercial billing is a versioned ledger](c26-commercial-billing-ledger/README.md) | 6 | 2 | **4** |
| [c27 — Indexed knowledge obeys the same visibility as direct reads](c27-permissioned-knowledge-index/README.md) | 5 | 2 | **3** |
| | **32** | **18** | **14** |

## Wave 2 — mechanical, parallelisable

| Candidate | Tickets | Done | Open |
|---|---|---|---|
| [c16 — The schema says what it means](c16-schema-says-what-it-means/README.md) | 9 | 5 | **4** |
| [c18 — Removals are proved, not grepped](c18-removals-are-proved/README.md) | 4 | 1 | **3** |
| [c23 — A tenant extends the product without a deploy](c23-tenant-extensibility-without-migrations/README.md) | 5 | 3 | **2** |
| [c24 — The design system is the only way to build a screen](c24-frontend-consistency-and-access/README.md) | 5 | 4 | **1** |
| | **23** | **13** | **10** |

## Wave 3 — the read side

| Candidate | Tickets | Done | Open |
|---|---|---|---|
| [c10 — Make module-level standing answerable](c10-module-role-standing/README.md) | 5 | 5 | **0** |
| | **5** | **5** | **0** |

**92 tickets: 56 complete, 36 with open boxes.** Counted from the ticket files themselves — a ticket is complete when it has no `- [ ]` left. Recounted 2026-08-26 while five lanes were running, so treat it as a snapshot: re-run the count rather than trusting this line.

**Tickets are no longer deleted on completion.** The earlier convention retired a finished ticket by deleting its file and leaving its index row as the record. Those files have since been restored — but restored from *pre-completion* content, so their ticks were lost while their index rows still said `done`. 21 rows now read **`needs re-verification`**: the index claimed done, the file has open boxes, and only checking source can say which is right. Two things got mixed together there — genuinely finished work whose ticks were lost (`c20-01`'s reporter adapter is committed and real), and rows my de-link pass marked `done` simply because the file was momentarily absent, when the ticket was actually *blocked* (`c18-02/03/04`). Re-verify before rebuilding: this program's repeated finding is that "open" tickets are often already done.

A false `done` hides a defect; a false `open` costs only a re-check, and the 2026-08-26 audit showed re-checking is fast. That is why the reconciliation went in this direction.

**The index under-reports what is built.** c10 shipped in `191f4817` and c11's read budgets exist, yet both read as untouched — the tickets were never retired. Three of c12's four probes landed in `0475`. Before starting a candidate, check source first: several "open" tickets are verification, not construction. Findings with no ticket live in [`OPEN-FINDINGS.md`](OPEN-FINDINGS.md).

## The 2026-08-26 todo audit — read this before working any ticket

Every unticked box across all open tickets was checked against source. **Some described defects that did not exist.** An agent had already implemented one of them before anyone noticed, and the change had to be reverted. Each is now struck in place with its evidence, so the reasoning survives:

| Ticket | The claim | The reality |
|---|---|---|
| c19-02 / c19-04 | Migrate cache call sites to the tenant-required `*ForOrg` wrappers — 216 sites | `CACHE_KEYS.*` factories already interpolate `orgId`. The swap reorders the same key components and changes nothing. **Reverted in `search.service.ts`; criterion withdrawn.** |
| c16-09 | "No enforcement path reads the flag. Not the accrual sweep, not the leave-request path, not approvals." | `leaves-write.service.ts:80-103` reads `probationRestricted` and throws with a user-facing message. Five of nine criteria were already met. |
| c25-02 | The resolver signature `resolve(db, type, id, orgId)` omits the actor, so the access check cannot be written | That signature does not exist anywhere. `EntityReferenceService.resolve()` takes `(actor, references)`. |
| c13-04 | The receivables total is computed twice; replace the subquery with a window | `accounting-receivables.service.ts:84` already uses `count(*) OVER ()` on the same single query. |
| c20-05 | `setSpanExporter(new LogSpanExporter())` is still unwired | Present at `main.ts:69`. |
| c15-06 | Enumerate every case the local SSRF guard blocks, then run that table against the shared one | ⚠️ **This entry was itself wrong, and hid a real gap.** The local helper was gone, but "nothing to enumerate" does not follow — the retired copy is recoverable from `git show a9166e06^`. Doing the diff found the shared *sync* guard matched `localhost` exactly where the local one matched the `.localhost` suffix, so `http://api.localhost/` passed at two live call sites. Fixed; the case table is now executable in `ssrf-guard.spec.ts`. |
| c24-01 | 13 pages are missing the page wrapper | Zero. An independent walk of all 553 authenticated pages found no violation — the same artefact as the 487 icon buttons that were 2. |
| c13-06 | "The 16 duplicated local copies of the pagination schema" | **204 copies across 135 files.** The estimate was low by an order of magnitude, which is the opposite of this program's usual direction. 16 of those files happen to sit in one lane's territory, which is probably where the number came from. |
| c13-03 | 241 count queries run as a separate sequential await | **1 confirmed** on a normal list path (`payroll/setup/components.service.ts:51-54`). Three more look sequential but are empty-page fallbacks behind a `count(*) OVER ()`. 83 files remain unclassified and need a per-method audit — a per-file one is systematically wrong. |
| c13-03 | Zero — then "exactly three" — TypeScript files use a `count(*) OVER ()` window | **20 files.** Three were added for c13; the other seventeen already did it and nobody had counted. |
| c16-01 / c16-05 / c16-06 | All three "fully blocked on unapplied migrations 0479–0488" | **Five of those seven migrations are journalled** — `0479` idx 268, `0480` 269, `0481` 270, `0486` 274, `0487` 275 — so they run on `db:migrate` and reproduce on a cold DB. Six criteria across the three tickets were already met. Only `0482` (never journalled — the journal jumps 270 → 271) and `0488` (deliberately excluded, preconditions in its own header) still block. **"Unapplied" was inferred, not read**; the journal is one file and answers it in seconds. |

**A ticket's premise is evidence, not instruction.** Re-verify it before building against it; it may describe a state the codebase has already left. Where a criterion is genuinely unmeetable right now it is marked `**BLOCKED:**` with the specific dependency rather than left ambiguous — most often the unapplied migrations, which gate 4 of c16, all of c21-04/05 and c25-04.

**A schema file is not a shipped table.** All five c26 ledger tables exist in `db/schema/billing/` and are exported by the barrel, but **no migration creates any of them** — so typecheck and the barrel stay green while every query fails at runtime. Criteria ticked against a schema file say "schema only"; the migration is its own unticked criterion.

## The eight that mattered most — five now closed

| Ticket | Why it is first |
|---|---|
| ~~c20-01~~ | ✅ **done.** The port had no adapter at all, and two call sites report without logging — workflow and import failures reached nobody. |
| ~~c17-02~~ | ✅ **done.** A customer could pay and not be credited with nothing knowing to retry; the grant is now ledgered and a failure returns 503. |
| [c25-01](c25-authorization-cannot-be-omitted/issues/01-every-route-declares-exposure.md) | Guard built and wired, **enforcement still deliberately off**. The report now exists (`pnpm check:route-classification`): **141** undeclared handlers, not the 12 the ticket guessed. 34 classified in Lane 2 territory, 107 itemised in `architecture-refactor/OPEN-FINDINGS.md`. Do not flip the flag until that is zero — the largest group is `/me/*`, calendar, notifications and logout. |
| [c25-04](c25-authorization-cannot-be-omitted/issues/04-rls-coverage-is-a-release-invariant.md) | Verifier now exits non-zero and runs in CI. The gap count is still unknown — it needs a live database. |
| [c13-05](c13-one-list-contract/issues/05-scrolled-lists-page-by-cursor.md) | 8 of 9 criteria met. The property tests exist and found a **second** inbox defect: an exhausted account was marked done with `undefined`, which `JSON.stringify` drops, so the next page restarted that mailbox from row zero and replayed every message. Fixed with a distinct `null`. The inbox cursor is now HMAC-signed and bound to the reader. Remaining: notifications and the ticket list, both outside that lane's territory. |
| ~~c19-01~~ | ✅ **done.** Read-after-write now runs through a real `CacheService` over an in-memory Redis, with two negative controls — a cache that never caches would otherwise pass every such test vacuously. |
| ~~c19-04~~ | ✅ **done.** All 36 event-invalidated namespaces carry a read-after-write test driven from `CACHE_INVALIDATION_MATRIX` itself, so a new entry is covered the moment it is added. |
| ~~c13-02~~ | ✅ **done.** The board projection drops `description` and `board-projection.spec.ts` fails if it is re-added. One frontend type still says `string | null`; recorded in `architecture-refactor/OPEN-FINDINGS.md`. |
| [c16-04](c16-schema-says-what-it-means/issues/04-invoice-line-items-are-queryable.md) | Worse than recorded: `0478_invoice_line_items_column_drop.sql` is **absent from `_journal.json`**, so the column drop would never run and `db:migrate` would still report success. `0477` is in the journal. Exact entry to append is in `architecture-refactor/OPEN-FINDINGS.md`. |
| ~~c26-06~~ | ✅ **done.** The shadow table had **zero writers**, so platform administration was reading an always-empty table and every customer showed as unsubscribed. Reads hit `subscriptions`, the customer list is keyset-paged at 100, and 18 contract tests pin paid, trial, cancelled, missing and concurrent-webhook states. |
| ~~c16-03~~ | ✅ **done.** `rrule` 2.8.1 now expands series through the one seam free/busy and conflicts already share. Expansion runs in the event's IANA zone, so a weekly 09:00 meeting stays 09:00 across a DST boundary, and `calendar_event_exceptions` makes one occurrence editable without touching its siblings. |
| ~~c27-02~~ | ✅ **done** in a concurrent Batch B session — `kb-ingestion-consumer.ts`. |

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
