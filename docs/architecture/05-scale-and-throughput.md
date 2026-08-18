# 5. Scaling to 50M users

## Where the volume is

| table | driver | at scale |
|---|---|---|
| `ticket_activity_log` | every field change | largest table in the product |
| `ticket_comments` | append-only | very large |
| `notifications` | fan-out on write | very large |
| `timesheets` | per user per day | large, financial |
| `tickets` | working set | large but bounded per org |

Only the last is read-hot; the rest are append-mostly and read within a recent window, which is what
makes them partitionable.

## Insert throughput, ranked by what actually limits it

1. **Index count on the hot table.** Every index is a write amplifier. `tickets` carries only indexes
   serving real query shapes, each partial where possible so the index covers only live rows:
   ```
   (org_id, project_id, rank)      WHERE deleted_at IS NULL     board
   (org_id, assignee_id, due_date) WHERE status <> 'DONE'       my work
   (org_id, project_id, status)    WHERE deleted_at IS NULL     counts
   (org_id, sprint_id)             WHERE deleted_at IS NULL     sprint board
   ```
2. **Identity over UUID for hot PKs.** `bigint GENERATED ALWAYS AS IDENTITY` inserts sequentially so
   B-tree pages fill without splitting. Random UUIDv4 PKs on a 100M-row table cause constant page
   splits and index bloat. (UUIDv7 acceptable; v4 is not.)
3. **Batch, never loop.** Bulk move/assign/status is one statement with `unnest` in one transaction;
   above a threshold it becomes a queued job.
4. **`prepare: false` on Neon** means no prepared-statement reuse — optimise with indexes and
   projection, never `sql.placeholder`.

Note: ticket-number allocation is *not* on this list. It was measured and is not a bottleneck — see
`03`. It was changed for correctness.

## Partitioning

```
ticket_activity_log · ticket_comments · notifications   PARTITION BY RANGE (created_at), monthly
```

Decide before doing it: the partition key must be in every PK/UNIQUE, so the PK becomes
`(id, created_at)` and bare `id` stops being globally unique — queries should already use the tenant
key `(org_id, id)`. Partitions pre-created by cron; retention by `DETACH PARTITION CONCURRENTLY` +
`DROP`, never a bulk `DELETE`.

**Not yet triggered** — current volumes are 500k/400k seeded rows. Documented trigger: ~50M rows, or
the first retention sweep that times out.

## Read cost — measured

| query | before | after |
|---|---|---|
| board page | 3,345 blocks | ~57 blocks |
| My Work | 11,477 blocks | 53 blocks |
| scoped board | 49.31 ms / 2,914 | 1.20 ms / 354 |
| portfolio rollup | 142.8 ms / 1,478 | 0.64 ms / 364 |

Portfolio and dashboard aggregates read a **daily snapshot table** maintained by cron rather than
recomputing per page load — that is the ~190× on the rollup.

## Text search under RLS

Every search operator is non-leakproof, so under an RLS policy the planner cannot use a GIN/trigram
index: measured 12,036 blocks / 134 ms versus 16 blocks / 0.34 ms. `LEAKPROOF` is **impossible on
Neon** — no superuser exists. The working escape is a `SECURITY DEFINER` function owned by the
BYPASSRLS role returning **ids only**, bounded by a limit, with the org from `app.current_org_id()` and
never a parameter (`app.search_ticket_ids`). Selective searches went 208 ms → 2 ms.

## Connections

Neon pooled endpoint; the app connects as `streamline_app` (no BYPASSRLS). One transaction per request
carries the tenant GUC. Post-commit work opens its **own** tenant transaction — it must never borrow
the request's handle, which is dead by then.
