# Session 6 — Cells, relocation, envelope and cost

**Start this only after Session 3's commits have landed.** It is the one session with a cross-session
dependency, and it is unavoidable: ticket 26 is blocked by all six of Session 3's placement tickets, and
everything else here descends from 26. Check that `organization_placement` exists and Session 3's tickets
are ticked before you begin.

**It is also the one session that needs infrastructure this repository cannot provision.** Expect to
finish with real open criteria. That is the correct outcome, not a failure — write them up honestly
rather than ticking them.

**Read in this order, then act.**

1. [`PROTOCOL.md`](PROTOCOL.md) — binding. Especially §1 (ask everything now) and §2 (a checkbox is evidence).
2. Root `CLAUDE.md`, then `backend/CLAUDE.md`.
3. Session 3's final report and the state of [`../issues/`](../issues/) `20`–`25`.
4. Your six tickets in full: `26`, `27`, `28`, `29`, `30`, `32`.
5. The PRD's *Migration plan* (Phases 2–4), *Acceptance criteria* and *Cost, ownership, and change
   governance* sections ([`../prd.md`](../prd.md)).

## Your tickets

| # | Ticket | Blocked by |
|---|---|---|
| 26 | A second cell exists and is proved from cold | 20–25 (Session 3) |
| 27 | A cell has a measured capacity budget and an admission threshold | 26 |
| 28 | An organization moves between cells, and can roll back until the flip | 22 (Session 3), 26 |
| 29 | Placement is automated and a noisy neighbour is relocated | 27, 28 |
| 30 | The workload envelope is a runnable load profile | 26 |
| 32 | Unit cost per cell is tracked and forecast | 27 |

**Split the work by what needs hardware and what does not.** `28`'s state machine, checksum and
offset-reconciliation code, `29`'s placement-selection logic, `30`'s fixture generator, and `27`'s budget
declarations are all writable and unit-testable against a single cell. Only the *exercises* — cold
bootstrap, restore, isolation, relocation, the full envelope — need the second cell. Write and test the
code; leave the exercise criteria open with the command that would close them.

**Do `30`'s fixture generator early even if the rest stalls.** It is the blocker for three tickets left
honestly open elsewhere in this program — `c16-06`, `c21-04` and the read-cost budgets generally all
refuse to measure against zero rows. That refusal is correct; this is where it gets solved.

## Ask these first — plus anything else you find

1. **Is a second database, Redis, object-storage prefix and search index actually available to
   provision — and where?** A Neon branch, a separate Neon project, a different region? Without it,
   `26`, `27`, `29` and `32` stop at code plus a written runbook. Ask before planning around either answer.
2. **Fixture scale for ticket 30.** The full envelope is 20M accounts and 1M organizations. Run it at
   full scale, or a proportional single-cell profile with the extrapolation method written down?
   *Recommend: a 100,000-member organization plus one cell's proportional share*, with the extrapolation
   stated — the largest-tenant case is the one that actually breaks queries, and it is affordable.
3. **Which of ticket 32's nine units can be measured from current billing and infrastructure data?**
   The AI token unit already exists and is the model — `computeTokenCharge(model, in, out)` with an
   integer milli-credit ledger. The other eight need real spend data. *Recommend: instrument only what
   this cell can measure and say which are estimates.*
4. **Does this session drop `organizations.region`** — the contract half of Session 3's dual-read?
   *Recommend: yes, but only after ticket 26 proves the second cell serves traffic through the placement
   record*, never before.

## Territory

**Yours, exclusively:**

- `backend/src/common/region/region.config.ts` topology entries and any second-cell configuration
- The relocation state machine (new module) and its checksum/offset reconciliation
- Placement-selection and noisy-neighbour detection (extending Session 3's placement service — **that
  work must be committed first**)
- Load-profile and fixture-generator scripts under `backend/src/scripts/`
- Read-cost budget declarations and the cell capacity budget
- Deployment and cell-bootstrap scripts

**Shared:** you extend `common/region/**` and `common/tenant/**`, which Session 3 owns. Since Session 3
must be finished first, this is a hand-off rather than a conflict — but re-read those files before
editing and do not undo Session 3's decisions. If one looks wrong, say so in your report rather than
reversing it.

**Not yours:** `modules/access`, `common/rbac`, `modules/hr`, `modules/payroll`, `main.ts`,
`frontend/**`. Report, do not edit.

## Traps in this territory

- **Measure as `streamline_app` with the tenant GUC, never as the owner.** The owner has `BYPASSRLS` and
  its plans are not the ones production gets. This is the single most common way a capacity number here
  comes out wrong.
- **`VACUUM ANALYZE` after any bulk load.** A rewrite kills the statistics *and* empties the visibility
  map — measured here as 53 → 201,875 blocks after `ANALYZE`, and a COUNT of 37 → 3,340 that only
  `VACUUM` fixed. An Index Only Scan will not appear without it.
- **Do not seed synthetic rows to manufacture a budget pass.** The runner's `seed too small — 0 rows`
  refusal is intentional: an empty-table buffer budget is a tautology and self-seeding calibrates CI
  against invented distribution. Two boxes in this program were un-ticked for offering that refusal as a
  measurement. Seed to *production shape*, then measure against the **existing declared ceilings** — do
  not invent new ones from your own fixture.
- **`streamline_app`'s password must be set in the Neon console.** `ALTER ROLE … WITH PASSWORD` does not
  stick: the control plane restores the previous one when the branch suspends.
- **RLS forces `org_id` into covering indexes.** There is no Index Only Scan unless `org_id` is *in* the
  index; a covering index without it is silently ignored.
- **RLS defeats GIN and trigram indexes** — text search sequential-scans for `streamline_app`, and
  `LEAKPROOF` is impossible on Neon. The escape is a `SECURITY DEFINER` function; five exist.
- **`assignee = me OR EXISTS(...)` scans the organization.** Split into a UNION with `count(*) OVER ()`.
  The winner flips at around one project — measure, do not assume.
- **An org-led composite index is not always enough.** An inequality plus an `ORDER BY` on another column
  needs `(tenant, eq cols, sort col) WHERE <ineq>` — measured 11,477 → 53 blocks.
- **The read-cost guard covers 2 of 3,385 routes today.** Do not read a green guard as coverage.
- **Exercise ticket 28's rollback before polishing its forward path**, and test with an organization that
  is actively writing — `CATCH_UP` is the state an idle test never enters.

## Definition of done for this session

- Every ticket's criteria either ticked with pasted evidence, or **explicitly open** with the reason, what
  would close it, and the exact command that refused. Do not tick an exercise you could not run.
- `NODE_OPTIONS=--max-old-space-size=8192 pnpm -C backend exec tsc --noEmit` clean.
- The relocation state machine's unit tests pass, including the rollback path, against a single cell.
- Ticket 30's fixture generator runs and produces a production-shaped population; the previously
  refusing read budgets now emit a number, and it is reported against the **declared** ceiling.
- A written runbook for anything that needed infrastructure you did not have.
- A commit per closed ticket, pathspec-scoped.
- Your final report states plainly which acceptance criteria remain unmet, because per the PRD's release
  decision, **published workload and SLO results — not typecheck, not review — are the only basis for a
  `20M-ready` claim.**
