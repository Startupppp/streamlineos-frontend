# Architecture refactor — final review, 2026-08-26

**Program status (2026-08-27): 89 of 92 tickets closed.** 15 of 18 candidates are fully closed — every
ticket file was deleted after folding its evidence into that candidate's `README.md`, and once a
candidate had zero tickets left, its **whole folder** (PRD included) was deleted in turn. Nothing from
those folders was lost: a condensed digest of each lives in [§ Closed candidates — archived](#closed-candidates--archived-2026-08-27)
below, and the full original text of every deleted file is still in git history (`git log --all -- <path>`).

Three tickets remain genuinely open, each blocked on something outside this repo, not on unfinished work —
their candidate folders are the only ones still on disk, alongside c28 which hasn't started:

| Ticket | Blocked on |
|---|---|
| [c16-06](c16-schema-says-what-it-means/issues/06-candidate-resume-text-leaves-the-row.md) | Read-budget measurement needs production-shaped seed data; `db:check-read-budgets` correctly refuses to pass against 0 rows |
| [c18-03](c18-removals-are-proved/issues/03-the-dead-controller-is-removed.md) | Needs a real deployment's access log before a dead controller can be proved safe to remove — cannot be produced locally |
| [c21-04](c21-fanout-retention-and-polling/issues/04-three-growing-tables-are-partitioned.md) | Same read-budget/seed-data blocker as c16-06, on the partitioned notifications tables |

**c28 now has 32 tickets, none started** (written 2026-08-28) — it is a proposed target architecture
(cell-based platform for 20M+ users), not a repair. It is out of scope for the count above. Its
breakdown, and the four repository facts that shaped it, are in
[`c28-cell-based-platform-at-20m/README.md`](c28-cell-based-platform-at-20m/README.md).

What remains on disk:

~~~
architecture-refactor/
  README.md                      this file — the only remaining index, including the archive below
  OPEN-FINDINGS.md               findings with no ticket of their own
  c16-schema-says-what-it-means/   1 open ticket (seed data)
  c18-removals-are-proved/         1 open ticket (operator access log)
  c21-fanout-retention-and-polling/  1 open ticket (seed data)
  c28-cell-based-platform-at-20m/  PRD + 32 tickets, not started
~~~

The nine candidates from the 2026-08-23 review (c1–c9) are **all closed**; their specs stay in
[`docs/specs/`](../docs/specs/README.md) as history — that decision predates this program and stands.
`docs/tickets/crm-phase-2/` is a separate, still-active program (3 tickets genuinely open) and was not
touched by this cleanup.

## The verdict this program starts from

**The architecture does not need replacing.** Zero import cycles in both repos. Zero unused frontend files
across 4,429. Zero arbitrary colour classes across 591k lines. Zero `useEffect` firing an API call. CI
rebuilds the database from empty. The RBAC model as originally envisioned is substantially already built.

What the passes found was not systemic decay. It was concentrated correctness and scale failures around
omission-proof authorization, list cursors, commercial billing truth, calendar expansion, durable knowledge
ingestion and production signal delivery. Existing deep modules are explicitly preserved. Every one of
those failure classes now has a closed ticket and a durable guard (a spec, a CI check, or a migration) —
see the archive below for which.

## Still open

| Candidate | Tickets | Status |
|---|---|---|
| [c16 — The schema says what it means](c16-schema-says-what-it-means/README.md) | 9 | 8 closed, 1 open (seed data) |
| [c18 — Removals are proved, not grepped](c18-removals-are-proved/README.md) | 4 | 3 closed, 1 open (operator access log) |
| [c21 — Right models, right throughput — fan-out, retention and polling](c21-fanout-retention-and-polling/README.md) | 7 | 6 closed, 1 open (seed data) |
| [c28 — Cell-based platform at 20M](c28-cell-based-platform-at-20m/README.md) | 32 | not started — 0 closed |

## Closed candidates — archived 2026-08-27

Folder deleted once its last ticket closed. Each entry is what its README's "Closed ticket digests"
section said at time of deletion, compressed to one paragraph. Recover the full folder with
`git show <commit>:architecture-refactor/<name>/README.md` — see each candidate's own commit in
`git log --oneline --all -- architecture-refactor/<name>/`.

**c10 — Make module-level standing answerable** (5/5). A module's roster is readable
(`module-standing-roster.service.ts`), an actor can be told what they may grant (`grantability.ts`), the
read and write of standing share one predicate, standing can be granted and revoked
(`module-standing-mutations.service.ts`), and ownership transfers atomically in one operation
(`ownership/module-owner-role.helper.ts`). Covered by `module-access.controller.e2e-spec.ts`,
`standing-grantability-agreement.spec.ts`, `standing-mutations.spec.ts`.

**c11 — Read-cost budgets** (3/3). Budgets are data (a schema), not a script — 43 declared budgets across
modules, a seed-adequacy gate that refuses to pass on too few rows rather than lying, and CI wiring that
fails the build non-zero on breach, self-tested against an impossible ceiling.

**c12 — Text-search id probe** (3/3). Three `SECURITY DEFINER` id-only search probes existed but weren't
used; global search now routes through them (migration `0475`) with a specific `42883` fallback to
`ILIKE` if a probe is missing, and a stale comment claiming otherwise was corrected. 4 new read-cost-budget
entries.

**c13 — One list contract** (6/6). A ticket opens by its key; the board projection no longer ships
`description` (guarded by a spec that fails if it's re-added); list totals compute once via
`count(*) OVER ()` instead of a second query (16,725 → 180-196 blocks measured); the receivables total
bug was already fixed by the time this ran; scrolled lists page by an HMAC-signed cursor (migration
`0575`) — building it found and fixed a second bug where an exhausted mailbox's `undefined` cursor
vanished under `JSON.stringify` and replayed the whole inbox from row zero; every list now speaks one
filter vocabulary.

**c14 — Set-based sweeps** (3/3). Leave accrual is set-based (`cron-leave.service.ts`, batches of 500,
SQL `LEAST` clamp); the remaining six tenant-growing loops converted; sweeps report duration and
structured error codes. 2 new read-cost-budget entries backed by migration `0513`.

**c15 — Outbound I/O leaves the request** (6/6). Outbound calls carry a deadline, adopted by all three
providers; a blob upload no longer holds a pooled connection open (`registerAfterCommit` at
`storage-onboarding.controller.ts:114`); post-commit work now carries tenant context — this was the root
cause of notifications silently failing platform-wide across ~50 call sites; the API surface isn't
published where it shouldn't be; and there is one SSRF guard, not two — building the comparison found the
shared guard missed the `*.localhost` suffix form the retired local one caught, a live gap, now fixed and
covered by a case table in `ssrf-guard.spec.ts`.

**c17 — Every billing write is provable** (7/7). A provider event is recorded before it's acted on
(ledger + migration); a webhook only acknowledges durable work; a coupon is usable exactly once; a quota
that can't be computed refuses rather than guessing; revenue reporting reads what's written; dunning
history is queryable; an issued invoice can't change. Pointers preserved in `OPEN-FINDINGS.md` §§2-5 and
downstream candidates c18-04, c26-03, c26-05. The revenue-events question (write vs. delete
`revenue_events`) was decided in favour of writing: `GET /billing/analytics` was already a shipped,
permission-gated reader, not a stub, so producers now call `RevenueAnalyticsService.emit(tx, event)`
inside the state-changing transaction, which enqueues an outbox event the same service consumes behind
an `InboxConsumer` fence — a delivery failure retries and dead-letters rather than vanishing.

**c19 — A cache key cannot be unsafe** (5/5). Books are correct when an entry posts; every cache key
carries its tenant; filtered views refresh; all 36 invalidation namespaces carry a read-after-write test
driven from the matrix itself; Redis has a budget and an eviction policy. Two traps recorded and must not
be re-attempted: `CACHE_KEYS.*` factories already interpolate `orgId` (a migration to `*ForOrg` wrappers
was tried and reverted as a no-op), and a null-DB-fallback "fix" for session revocation was tried and
reverted (adds a DB round trip to all traffic).

**c20 — A failure in production is visible** (5/5). Errors now reach a person — the reporter port had no
adapter at all, so two call sites (workflow-runner, import-pump) were failing silently; the browser reports
its own errors (19 of 197 boundaries wired, redacted); a request is traceable end-to-end via structured
stdout/stderr logging; no failure is swallowed — fixed live bugs in `profiles.service.ts`,
`entities.service.ts`, `payroll-jobs.service.ts`, `payroll-calendar-reminder.scheduler.ts`; four alerts
reach someone via `LogSpanExporter`, wired at `main.ts:69`.

**c22 — Scheduled work and deploy safety** (4/4). A scheduled job runs once via a Redis NX lease with a
negative-control spec; a deploy sheds no requests (readiness flips before drain, corrected from the
reverse order); invoice numbering is race-free via an existing advisory lock, now spec-covered; stock
adjustments and transfers serialize via `FOR UPDATE`.

**c23 — Tenant extensibility without migrations** (5/5). All 422 enums classified (54 taxonomy / 362
system / 6 uncertain, recorded in `enum-classification.md`); one taxonomy (HR position status) moved to
lookup tables (migrations `0543`/`0544`); custom-field values indexed (migrations `0540`-`0542`, JSONB +
GIN); two new rules freeze HR's table count and give payroll its own schema folder; the shared schema
file split into 8 domain files with zero new import cycles.

**c24 — Frontend consistency and access** (5/5). Icon-only buttons: zero violations found exhaustively
(a stale "13 pages" claim corrected to zero, same pattern as the 487-icon-buttons-that-were-2 finding);
missing-accessible-label rule raised from inert `warn` to build-failing `error`, 4 real labels fixed;
7 shared components gained labelling/role assertions; 3 local duplicate formatters flagged with active
callers, deletion deferred to their last caller rather than forced; 4 CI checks assert the measured
properties.

**c25 — Authorization cannot be omitted** (4/4). Every route declares its exposure — 0 undeclared of
3,518 handlers, enforcement on by default; object access and DataScope share one query seam — 119/119
scopes applied in SQL, 12 soft-delete holes closed; the authorization matrix fails closed in CI via 6
required checks, which caught and fixed 4 real navigation-permission-key drifts; RLS coverage is a
release invariant — a 129-table silent gap closed to 0 (migrations `0591`/`0592`). One live gap surfaced
while archiving this candidate: `DashboardLeaveService.getPendingApprovals` counts resignations org-wide
regardless of DataScope, not a mechanical fix since `resignations` has no approver-equivalent column to
scope by — recorded properly in `OPEN-FINDINGS.md` §6a after a dangling, inaccurate pointer to "§3" in the
original ticket was caught and corrected.

**c26 — Commercial billing is a versioned ledger** (6/6). A versioned product/plan catalog; a seat ledger
with one source of truth for `seatCount()` and its advisory-lock key; a proration ledger with replay-safe
bigint math; usage metering that reserves credits atomically before spend (and fixed a JS-`Date`-in-`sql`
runtime bug along the way); tax/currency/invoice snapshot correctness (inclusive-tax-on-tax fix); and one
subscription truth — found and fixed a shadow table with **zero writers**, meaning platform admin was
reading an always-empty table and every paying customer showed as unsubscribed.

**c27 — Indexed knowledge obeys the same visibility as direct reads** (5/5). A wiki search id probe
mirrors c12's pattern; ingestion is one state machine (migrations `0498` Part B, `0510`); the ACL
revision/reindex gate's `IS NULL` backward-compatibility arm is documented as a fix-order trap (the sweep
must run before the arm is dropped, not after); the chatbot retrieval contract enforces four hard caps and
an injection-resistance test; revision/chunk retention is explicit and the snapshot-optimisation criterion
closed by *measuring* (96 kB) rather than building against an unjustified condition.

## Rules that apply to every ticket here

- **Verify by running the app**, not only by test. Typecheck, build and a fully mocked suite have all been
  green here while nothing worked.
- **Prove a deletion with a module graph and a real build**, never a text search. A bare side-effect import
  is invisible to a scanner and has already cost a live file.
- **A `db.transaction` mock must invoke its callback.** A bare stub never runs the body, so every assertion
  inside it silently passes.
- **Do not rewrite a test to accommodate a change.** A test failing because behaviour changed is the signal.
- **Measure as the application's database role**, never as the owner — the owner bypasses row-level
  security and its plans are not the ones production gets.
- **After a table rewrite, vacuum and analyse.** A rewrite invalidates statistics and empties the
  visibility map.
- **A ticket's "done" tick is evidence, not proof — re-check it if the evidence looks like a refusal.**
  Three ticks in this program were briefly wrong: two read-budget criteria were ticked with a budget
  script's *refusal to measure* offered as the measurement, and one enforcement claim named a migration
  that had never been applied. All three were caught by re-running the actual command rather than trusting
  the checkbox, corrected, and are why c16-06 and c21-04 are honestly open rather than falsely closed.
  A fourth, smaller instance surfaced while archiving c25: a dangling pointer claiming a finding was
  "written up" somewhere it wasn't — corrected rather than carried forward.
- **Lint and tests are run only when asked**, and are reported as not run otherwise — never as passing.

## Reading what's left

- **No file path or line number is load-bearing.** They were accurate when written and cited as evidence,
  not instruction. Re-read at source.
- **Static analysis produces candidates, not conclusions.** Several scans in this review were wrong by an
  order of magnitude in both directions — a route join off by three orders of magnitude, "six overlapping
  route groups" that measured one, a pagination-schema count low by an order of magnitude the other way.
  All were caught by classifying rather than counting.
- **Deliberately not raised**, because they are recorded decisions or already-disproved claims: the
  frontend permission-key subset, downgrade not revoking an enabled module, table splitting by width,
  key-type unification, migrating all naive timestamps, wrapping every text-match call site, and full
  APM/tracing. Do not re-raise them.
- Findings with no ticket of their own live in [`OPEN-FINDINGS.md`](OPEN-FINDINGS.md).
