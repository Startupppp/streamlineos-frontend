# Platform phase one — ticket set

Fourteen tickets across four independent streams, numbered in dependency order (blockers first).
Derived from four PRDs in `docs/specs/`, every claim verified against the running API, the live
database catalog, or a module-graph tool.

## Frontier — start immediately, no blockers

| # | Ticket | Stream |
|---|---|---|
| ~~01~~ | ~~Project boards stop reading 100 MB per page view~~ — **done**, 3.3× | Build |
| ~~02~~ | ~~My Work shows all of your work~~ — **done**, 12.8× | Build |
| ~~03~~ | ~~Unknown Build URLs return 404~~ — **done**, + a 500 nobody had noticed | Build |
| 04 | One database transaction per request | Access cost |
| ~~05~~ | ~~Permission key grammar becomes a build failure~~ — **done**; unblocks 08–11 | Ladder |
| 06 | Module owner and module admin answer one question | Ladder |
| ~~07~~ | ~~One seam resolves every person~~ — **done**; unblocks 14 | Person |

## Blocked

| # | Ticket | Blocked by |
|---|---|---|
| 08 | A billing owner can run billing without global settings | 05 |
| 09 | HR custom fields move to the HR namespace | 05 |
| 10 | Chat, Mail and Calendar get real permission vocabularies | 05 |
| 11 | Notifications, Workflows, Blog and Directory get vocabularies | 05 |
| 12 | Chat, Mail and Calendar become delegatable | 06, 10 |
| 13 | The remaining five modules become delegatable | 08, 11, 12 |
| 14 | A person with no login can be paid | ~~07~~ — **unblocked** |

## Deliberately not ticketed

- **Payroll schema-folder convergence** — 23 tables move from the HR folder to the payroll folder.
  A genuine wide refactor needing expand–contract across many batches, delivering no user-visible
  behaviour. Scope separately rather than forcing it into a tracer bullet.
- **Any schema deletion** — nothing proved safe. All 95 empty HR tables are referenced by live
  services, and the 11 files a module-graph tool flags as unused are a deliberate SQL-managed
  arrangement guarded by a spec.
- **Build index changes on `tickets`** — three were created, measured and rejected. One was 7.3×
  worse in I/O while appearing faster on a warm cache. See the Build PRD appendix before trying
  again. A fourth, on `build.ticket_assignees`, **was** accepted in ticket 01: on an RLS table an
  index-only scan is impossible unless `org_id` is a column of the index, so a covering index that
  omits it looks like "the index didn't help" when the planner simply refused it.

## Caveats carried into the tickets

- **Ticket 04 cannot be accepted** until the Upstash quota is restored; with the cache down, the
  same endpoints measure 4–9× worse and no number is trustworthy.
- **Measure in buffers, not milliseconds**, and as the RLS-enforced application role with the
  tenant GUC set. The owner role bypasses row-level security and its plans hide the costs that matter.
