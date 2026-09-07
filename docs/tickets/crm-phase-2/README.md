# CRM Phase 2 — widening the skeleton

Source: `streamlineos-frontend/docs/specs/2026-08-24-crm-phase-2-widening-prd.md`

Phase 1 proved the architecture on one vertical slice. Everything it proved is
still true of about five percent of the product. This phase widens every Phase 1
seam to production breadth and retires the identity split.

**The identity migration is the phase.** Channels, importer and queue are each a
few weeks; moving 132 module file references onto one identity model without an
outage is the work, and it is what makes every later phase cheaper.

## Preserved visual-token exception

CRM retains 79 deliberate solid-fill values that the shared semantic token set
cannot currently express. They are CRM-owned follow-up work, not part of the
platform architecture completion tickets. Any replacement requires a CRM design
decision; the repository's design-token lint gate remains the permanent
regression control.

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
| Done | 01–06, 12–24 |
| In progress | 07 (long tail), 08 (contract) |
| Built but not reachable | 09, 10, 11 — normalisers and services exist and are tested; no controller or queue consumer wires any of the three to a real transport, so no telephony, WhatsApp or web-form message can reach the seam in production |
| Partially done | 25 — backend convergence landed (`employer_party_id`, the `crm_organizations` → Party backfill, merge-service retirement), but `/crm/companies`, `/crm/clients` and `/parties` are still three independent route trees on the frontend |
| Deliberately not done | 26 |

Ticket 20 moved to Done on 2026-09-07: the four routes it waited on are live at
`backend/src/modules/record-layouts/record-layouts.controller.ts` — `@Controller("renderer/layouts")`
with `GET/PUT/DELETE :layoutKey` and `GET :layoutKey/usage`.

Tickets 01–06 and 12–24 were deleted on 2026-09-07 after each was verified
against real code rather than against its own checkbox. The seven that remain
are the seven that are open.

**The identity migration went 71 → 29 readers.** Re-counted 2026-09-07 from
`legacy-reader-ratchet.spec.ts`'s `KNOWN_READERS`, which is the executable
authority rather than this prose: 29 entries — 13 under `party` (the seam
itself: `party-legacy-*.ts` and the divergence report, files that legitimately
read what they write and are deleted along with the tables), 12 under
`finance`, 4 under `accounting`. So **16 real readers remain**, not the 24 this
paragraph previously claimed.

⚠ **A 30th reader exists and is on no list.**
`backend/src/modules/calendar/calendar-linked-crm.ts:3` imports `{ deals, leads }`
from `db/schema`. The ratchet scans all of `src/`, so it sees this file, and
"calendar" appears nowhere in `KNOWN_READERS` — meaning the guard ticket 08
built to stop exactly this is currently red. Calendar is outside ticket 07's
scope, so this reader is owned by no ticket.

### What is blocking the drop, precisely

Ticket 08 cannot drop `leads`, `clients`, `contacts` and `crm_organizations`
while anything still reads them, and **all 16 of the remaining non-seam readers
are in `src/modules/finance/` (12) and `src/modules/accounting/` (4)**. Those
modules are being rewritten onto one `gl_*` kernel by a separate workstream, and
this phase has no authority to change them. The drop therefore waits on that
rewrite landing, not on any CRM work.

The earlier "13 of 24, with 11 CRM-owned" split was wrong in both halves: the
count was 16, and there are now **zero** CRM-owned readers left — this phase
finished its side. What remains outside the seam is entirely the finance and
accounting rewrite, plus the one unowned calendar reader noted above.

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
