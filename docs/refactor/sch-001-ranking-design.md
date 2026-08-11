# SCH-001 — item ranking: agreed design

Approved 2026-08-10. This is the single source of truth for the change; every workstream implements
against it exactly. Do not deviate without saying so.

## The defect being fixed

`tickets.order` is `integer("order").default(0).notNull()`. Dragging one card makes the **client**
renumber every ticket in the source column *and* the destination column `0..n-1`
(`use-kanban-drag.ts:211-241`) and the server writes all of them verbatim via a `CASE` bulk update
(`projects-tickets-query.service.ts:353-368`). Consequences:

- One drag rewrites a whole column instead of one row.
- No version check → two simultaneous drags are last-writer-wins.
- The **client** is authoritative, so a stale client silently reorders cards it never saw move.

## Target

**Fractional rank on a `numeric` column, server-authoritative, one row updated per drag.**

`numeric` over LexoRank strings deliberately: Postgres `numeric` is arbitrary-precision, so the
midpoint `(a+b)/2` is always exact and never fails. Repeated insertion at the same point grows the
decimal expansion (~1 digit each), and Postgres allows 16383 digits after the point — so rebalancing
is a housekeeping optimisation, not a correctness requirement. LexoRank buys compactness we don't need
and adds an encoding to get wrong.

### Schema

```ts
rank: numeric("rank").notNull().default("1000"),
```
plus `index("idx_tickets_org_project_rank").on(t.orgId, t.projectId, t.rank)`.

`order` is **removed**, not kept alongside — two ordering systems is exactly how the status model
became three (SCH-002).

### Migration (expand → backfill → contract, in one file since there are no production tenants)

```sql
SET lock_timeout = '5s';
ALTER TABLE tickets ADD COLUMN rank numeric;
UPDATE tickets SET rank = ("order" + 1) * 1000;   -- preserves existing relative order exactly
ALTER TABLE tickets ALTER COLUMN rank SET NOT NULL;
ALTER TABLE tickets ALTER COLUMN rank SET DEFAULT 1000;
CREATE INDEX idx_tickets_org_project_rank ON tickets (org_id, project_id, rank);
DROP INDEX IF EXISTS idx_tickets_org_project_order;
ALTER TABLE tickets DROP COLUMN "order";
```
Gap of 1000 between neighbours leaves room for ~10 midpoint inserts before the decimal expands at all.

## API contract

**Replaces** `PATCH /build/:projectId/tickets/reorder` (the bulk CASE write). Do not leave the old
endpoint behind — §0.9, leave less code than you found.

```
PATCH /build/:projectId/tickets/:ticketId/rank
body: { beforeTicketId?: number | null, afterTicketId?: number | null, status?: string }
```

`beforeTicketId` / `afterTicketId` are the cards the dragged card was dropped **between**, in the
destination column's current visual order. Either may be null (dropped at the head or tail).

Server algorithm — all of it inside one transaction, all queries org- **and** project-scoped:

1. Load the two neighbours' ranks by id. Reject with 404 if a supplied neighbour isn't in this
   org+project (never 403 — §20, a 403 confirms existence).
2. Compute:
   - both neighbours → `(before.rank + after.rank) / 2`
   - only `after` (dropped at head) → `after.rank - 1000`
   - only `before` (dropped at tail) → `before.rank + 1000`
   - neither (empty column) → `1000`
3. If `status` is supplied and differs from the current status, run the **existing** validation
   unchanged: `assertTransitionAllowed` (workflow transitions, required fields, approval, allowed
   roles) and the WIP-limit check. Do not reimplement or weaken these.
4. Single-row `UPDATE tickets SET rank = $new, status = $status, updated_at = now()` scoped by
   `id AND org_id AND project_id`.
5. Return the updated row's `{ id, rank, status }`.

**Concurrency:** two clients dropping different cards into the same slot both compute a midpoint of
the same neighbours and get the same value. Ties are broken deterministically and stably by
`(rank, created_at DESC, id)` — so they converge to a defined order instead of one silently winning.
Every read that sorts by rank must use that full tiebreak.

## Sort order — every read site

Wherever the code currently sorts `asc(tickets.order), desc(tickets.createdAt)`, it becomes
`asc(tickets.rank), desc(tickets.createdAt), asc(tickets.id)`.

This includes the API-012 UNION branches in `projects-tickets-read.service.ts`, which currently order
by `t."order"` inside raw SQL — those must become `t.rank` with the same tiebreak, and the
`orderBy === "order"` guard that selects the UNION path becomes `orderBy === "rank"`.

The public list DTO's `orderBy` enum value `"order"` is renamed to `"rank"`; `TICKET_ORDERBY_COLUMNS`
maps it to the new column. Keep the default sort as rank.

## Rebalance

`rebalanceProjectRanks(orgId, projectId)` — renumbers a project's tickets to `1000, 2000, 3000…` in
current sorted order, in one transaction. Not scheduled (there is no scheduler); exposed for manual
use and called automatically if a computed midpoint's scale exceeds a threshold. Bound it.

## Out of scope here

- Optimistic locking (`version`) is **SCH-005**, tracked separately.
- Per-sprint / per-backlog independent rank scopes — current usage sorts one rank per project, and
  the brief's multi-scope model is a later change.
