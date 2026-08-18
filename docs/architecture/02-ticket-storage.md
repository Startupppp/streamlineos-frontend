# 2. How a ticket is stored and what it attaches to

## Split by access pattern

The board needs id, title, rank, status, assignee — not description bodies, custom fields or
attachments. So:

```
┌────────────────────── tickets (HOT — the board reads only this) ──────────────────────┐
│ id bigint identity · org_id · project_id · ticket_number (PROJ-123)                    │
│ title · status → FK project_statuses · rank numeric · assignee_id · reporter_id        │
│ sprint_id · epic_id · parent_ticket_id · cycle_id · priority · type · points           │
│ due_date (date) · version (int) · deleted_at · created_at · updated_at (timestamptz)    │
└────────────────────────────────────────────────────────────────────────────────────────┘
   ├── ticket_comments, ticket_activity_log     append-only, partition by month
   ├── ticket_assignees, ticket_labels          junction tables — never arrays
   ├── ticket_custom_field_values               EAV, one query per page not per row
   └── work_item_relations                      typed edge table (blocks/blocked_by/relates_to)
```

Nothing relational lives in an array or JSONB: multiple assignees, labels, watchers and dependencies
are junction rows with composite unique constraints, so they can be indexed, paginated and deleted
atomically.

## Attachment graph

```
organizations
   └─ pm_workspaces ─┐
      portfolios ────┼─► projects ──┬─► project_statuses  (the workflow; FK target for tickets.status)
                                    ├─► sprints ─► tickets.sprint_id
                                    ├─► cycles  ─► tickets.cycle_id
                                    ├─► project_ticket_counters (next_ticket_number)
                                    └─► tickets ─┬─ parent_ticket_id → tickets   (hierarchy)
                                                 ├─ epic_id          → tickets
                                                 └─ work_item_relations           (graph)
```

Hierarchy is an adjacency list guarded by a write-time cycle check. Dependencies are a separate typed
edge table, also cycle-checked — a circular blocker makes critical-path computation non-terminating.

## Status is not free text

```
project_statuses (org_id, project_id, name) PK
  type: backlog | unstarted | started | completed | cancelled
  order
workflow_transitions: from_status → to_status, enforced server-side
```

`type` is what reports read, so "done" means the same thing across projects that spell it differently.
A free-text status column cannot express that, which silently corrupts every burndown.

## Ordering — one row per reorder

`rank numeric`: inserting between neighbours is the midpoint, so a drag updates exactly one row.
Postgres `numeric` is arbitrary precision (30 successive splits consumed 13 of 16383 digits). Rank is
scoped — a ticket holds one position in the backlog and another on the board — sorted by
`(org_id, project_id, rank)` with a partial index excluding deleted rows. A background rebalance runs
post-commit in its own tenant transaction only when the decimal scale crosses a threshold.
