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
