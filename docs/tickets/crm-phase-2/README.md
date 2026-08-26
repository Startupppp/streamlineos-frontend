# CRM Phase 2 — widening the skeleton

Source: `streamlineos-frontend/docs/specs/2026-08-24-crm-phase-2-widening-prd.md`

Phase 1 proved the architecture on one vertical slice. Everything it proved is
still true of about five percent of the product. This phase widens every Phase 1
seam to production breadth and retires the identity split.

**The identity migration is the phase.** Channels, importer and queue are each a
few weeks; moving 132 module file references onto one identity model without an
outage is the work, and it is what makes every later phase cheaper.

| Track | Tickets | Shape |
|---|---|---|
| A — identity convergence | 01-08 | expand → dual-write → 5 migrate batches → contract |
| B — channels | 09-12 | three adapters, then the seam claim tested |
| C — importer | 13-15 | universal path, connectors, mapping evals |
| D — data quality | 16-17 | one queue, then a number that moves |
| E — records + renderer | 18-20 | issues/complaints, remaining types, tenant layout |
| F — access | 21 | keys and backfills for everything above |

**Measured on this branch**, not taken from the PRD: `leads` 70 module files,
`contacts` 29, `clients` 24, `businessParties` 9 — across `crm` (25), `leads`
(19), `ai` (11), `clients` (8), `email` (7), `contacts` (6), and a long tail of
1-3 each in `surveys`, `rbac`, `dashboard`, `billing`, `timesheets`, `support`,
`settings`, `search`.

## Order

01 and 02 gate everything in track A. Tracks B, C, D and E can start against the
Party seam as soon as 02 lands. 08 is last in track A; 21 is last overall.

Tracks B and C have no dependency on each other and can run in parallel.

---

## Where the phase actually stands

Measured against `main` in both repos, not against intent. Per-ticket detail is
in each ticket's `Status:` line.

| | Tickets |
|---|---|
| Done | 01–07, 09–18, 21–25 |
| In progress | 08 (contract), 19 (records on the engine), 20 (tenant layout) |
| Deliberately not done | 26 |

**The identity migration went 71 → 36 readers**, and 12 of the 36 are the seam
itself — `party-legacy-*.ts` and the divergence report, files that legitimately
read what they write and are deleted along with the tables. So 24 real readers
remain of an original 71.

### What is blocking the drop, precisely

Ticket 08 cannot drop `leads`, `clients`, `contacts` and `crm_organizations`
while anything still reads them, and **13 of the 24 remaining readers are in
`src/modules/finance/` and `src/modules/accounting/core/`**. Those modules are
being rewritten onto one `gl_*` kernel by a separate workstream, and this phase
has no authority to change them. The drop therefore waits on that rewrite
landing, not on any CRM work. The 11 CRM-owned readers are the part this phase
can finish, and finishing them is what makes the drop a single migration
afterwards rather than a project.

That is a real dependency, not a scheduling excuse — and it is worth saying that
the ratchet is what makes it visible. Without a register of readers, "we still
read the old tables somewhere" is a feeling; with one it is a list of eleven
files and a blocked thirteen.

### Two things found while closing the phase, not yet fixed

**`src/modules/crm-import/` is in the wrong place.** The backend rule is that a
sub-module lives inside its parent — `modules/build/qa/`, never
`modules/build-qa/` — and the CRM module already follows it everywhere else
(`crm/core`, `crm/inbox`, `crm/consent`, `crm/entity`, `crm/metadata`,
`crm/pricebooks`, `crm/automation-studio`). The importer is the one CRM
sub-module standing outside its parent, which is exactly the shape the rule
names. Moving it is mechanical but touches every importer import path, so it is
recorded here rather than done in the middle of ticket 08.

**Main is red in eight suites and nineteen type errors**, all outside this
phase's files (`common/http`, `billing`, `kb`, `storage`, `chat`, `build`, and a
CRM automation-studio suite pushed by another session). Every Phase 2 commit was
verified to add none of them, by running the same gate on a clean checkout of
`origin/main` and comparing counts. Worth stating plainly: "the suite passes"
has not been true of this repository's `main` for the whole of this phase, and a
green local run means the diff is clean, not the tree.
