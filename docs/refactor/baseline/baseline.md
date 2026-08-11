# Build module — Phase 0 performance baseline

Captured as `streamline_app` (RLS enforced, `app.organization_id` set) against the seeded dataset.
Org `aa5627a2-a7de-4dca-97d2-135f3a5f801b` · project `9` · ticket `251`.

## Query timings

| ID | Query | Exec ms | Rows | Buffer blocks | Seq scans |
|---|---|---:|---:|---:|---:|
| Q1-board-page1 | Board / list, page 1, sorted by fractional rank (the benchmark) | 0.22 | 50 | 57 | 0 |
| Q2-board-deep-page | Same list at offset 3000 (offset pagination cost) | 6.64 | 50 | 3082 | 0 |
| Q3-list-count | The COUNT(*) fired alongside every list request | 1.35 | 1 | 37 | 0 |
| Q4-search-ilike | Search: leading-wildcard ILIKE on title | 4.49 | 2 | 3340 | 0 |
| Q5-board-with-relations | Board page 1 hydrated with assignees + labels (the relational `with` shape) | 0.69 | 50 | 390 | 1 |
| Q6-my-work | My Work: assigned tickets across the whole org | 0.17 | 50 | 53 | 0 |
| Q7-status-counts | Per-column badge counts for the board | 0.99 | 1 | 8 | 0 |
| Q8-ticket-comments | Ticket detail: comment thread | 0.08 | 2 | 5 | 0 |
| Q9-ticket-activity | Ticket detail: activity feed | 0.08 | 2 | 5 | 0 |
| Q10-dependency-graph | Dependency edges for a ticket (blocks / blocked_by) | 0.07 | 0 | 4 | 0 |
| Q11-portfolio-rollup | Portfolio dashboard: per-project open/done rollup from daily snapshots (post-fix) | 0.64 | 36 | 364 | 0 |
| Q12-timesheet-billing-rollup | Billing: approved billable hours + amount by project | 41.28 | 21 | 3959 | 1 |

## Table sizes

| Table | Rows | Heap | Indexes | Total |
|---|---:|---:|---:|---:|
| ticket_comments | 500000 | 106 MB | 52 MB | 157 MB |
| ticket_activity_log | 400000 | 60 MB | 76 MB | 136 MB |
| tickets | 204000 | 94 MB | 60 MB | 154 MB |
| sprint_scope_events | 200000 | 21 MB | 16 MB | 37 MB |
| ticket_assignees | 171429 | 22 MB | 33 MB | 55 MB |
| timesheets | 150150 | 31 MB | 19 MB | 50 MB |
| ticket_label_mappings | 100000 | 9096 kB | 11 MB | 20 MB |
| work_item_relations | 60000 | 5464 kB | 9536 kB | 15 MB |
| role_permission_grants | 3965 | 448 kB | 1040 kB | 1528 kB |
| permission_supported_scopes | 739 | 48 kB | 64 kB | 144 kB |
| permissions | 649 | 248 kB | 136 kB | 424 kB |
| sprints | 320 | 56 kB | 80 kB | 168 kB |
| project_statuses | 272 | 32 kB | 112 kB | 152 kB |
| project_members | 244 | 48 kB | 136 kB | 216 kB |
| project_daily_snapshots | 190 | 24 kB | 80 kB | 136 kB |
| notification_events | 117 | 32 kB | 80 kB | 144 kB |
| roles | 105 | 24 kB | 136 kB | 192 kB |

## Index scan counts (pre-traffic; zero means unproven, not unused)

| Table | Index | Scans | Size |
|---|---|---:|---:|
| projects | uniq_projects_org_key | 0 | 16 kB |
| projects | idx_projects_deal | 0 | 16 kB |
| projects | idx_projects_managed_product | 0 | 16 kB |
| projects | idx_projects_name_trgm | 0 | 16 kB |
| projects | idx_projects_org_status | 0 | 16 kB |
| projects | idx_projects_manager | 1 | 16 kB |
| projects | uniq_projects_org_id | 139 | 16 kB |
| projects | projects_pkey | 608 | 16 kB |
| projects | idx_projects_org_pm_workspace | 1409 | 16 kB |
| ticket_activity_log | idx_ticket_activity_log_ticket_recent | 0 | 12 MB |
| ticket_activity_log | uniq_ticket_activity_log_org_id | 0 | 26 MB |
| ticket_activity_log | ticket_activity_log_pkey | 1 | 8792 kB |
| ticket_activity_log | idx_ticket_activity_log_org_ticket | 21 | 30 MB |
| ticket_assignees | idx_ticket_assignees_user_id | 14 | 1152 kB |
| ticket_assignees | ticket_assignees_pkey | 171601 | 3784 kB |
| ticket_assignees | uniq_ticket_assignees_org_id | 171603 | 11 MB |
| ticket_assignees | uniq_ticket_assignees_ticket_user | 173214 | 17 MB |
| ticket_comments | uniq_ticket_comments_org_id | 2 | 32 MB |
| ticket_comments | idx_ticket_comments_ticket | 3 | 8784 kB |
| ticket_comments | ticket_comments_pkey | 901 | 11 MB |
| ticket_label_mappings | ticket_label_mappings_pkey | 100100 | 2208 kB |
| ticket_label_mappings | uniq_ticket_label_mappings_org_id | 100102 | 6704 kB |
| ticket_label_mappings | uniq_ticket_label_mappings_ticket_label | 101050 | 2752 kB |
| tickets | idx_tickets_cycle | 0 | 1392 kB |
| tickets | uniq_tickets_project_number | 0 | 4496 kB |
| tickets | idx_tickets_org_status_priority | 0 | 1504 kB |
| tickets | idx_tickets_recurrence_next | 0 | 8192 bytes |
| tickets | idx_tickets_org_assignee_status | 2 | 1584 kB |
| tickets | idx_tickets_project_status | 3 | 1448 kB |
| tickets | idx_tickets_title_trgm | 3 | 10 MB |
| tickets | idx_tickets_customer | 5 | 1392 kB |
| tickets | idx_tickets_org_assignee_due_open | 17 | 1264 kB |
| tickets | idx_tickets_org_project_rank | 41 | 15 MB |
| tickets | idx_tickets_sprint | 69 | 1432 kB |
| tickets | idx_tickets_parent | 250 | 1392 kB |
| tickets | idx_tickets_org_project_status | 1388 | 1512 kB |
| tickets | uniq_tickets_org_id | 1381580 | 13 MB |
| tickets | tickets_pkey | 1858853 | 4496 kB |
| timesheets | idx_timesheets_org_invoicing | 0 | 1104 kB |
| timesheets | timesheets_pkey | 0 | 3320 kB |
| timesheets | idx_timesheets_org_status | 0 | 1104 kB |
| timesheets | idx_timesheets_org_payroll | 0 | 1104 kB |
| timesheets | idx_timesheets_period | 0 | 1032 kB |
| timesheets | uniq_timesheets_day_project | 0 | 8192 bytes |
| timesheets | uniq_timesheets_day_blank | 0 | 32 kB |
| timesheets | idx_timesheets_user_date | 4 | 1112 kB |
| timesheets | idx_timesheets_org_project_date | 9 | 1112 kB |
| timesheets | uniq_timesheets_org_id | 112 | 9968 kB |
| work_item_relations | idx_work_item_relations_item | 19 | 1392 kB |
| work_item_relations | idx_work_item_relations_related | 20 | 1392 kB |
| work_item_relations | work_item_relations_pkey | 60043 | 1328 kB |
| work_item_relations | uniq_work_item_relation | 60043 | 1392 kB |
| work_item_relations | uniq_work_item_relations_org_id | 60045 | 4032 kB |

## Plan nodes

### Q1-board-page1 — Board / list, page 1, sorted by fractional rank (the benchmark)

```
  Limit
  Incremental Sort
  Result
  Index Scan on tickets using idx_tickets_org_project_rank
```

### Q2-board-deep-page — Same list at offset 3000 (offset pagination cost)

```
  Limit
  Incremental Sort
  Result
  Index Scan on tickets using idx_tickets_org_project_rank
```

### Q3-list-count — The COUNT(*) fired alongside every list request

```
  Aggregate
  Result
  Index Only Scan on tickets using idx_tickets_org_project_rank
```

### Q4-search-ilike — Search: leading-wildcard ILIKE on title

```
  Limit
  Sort
  Result
  Index Scan on tickets using idx_tickets_org_project_status
```

### Q5-board-with-relations — Board page 1 hydrated with assignees + labels (the relational `with` shape)

```
  Limit
  Result
  Incremental Sort
  Result
  Index Scan on tickets using idx_tickets_org_project_rank
  Aggregate
  Nested Loop
  Index Scan on ticket_assignees using uniq_ticket_assignees_ticket_user
  Seq Scan on users
  Aggregate
  Merge Join
  Index Scan on ticket_label_mappings using uniq_ticket_label_mappings_ticket_label
  Index Scan on ticket_labels using uniq_ticket_labels_org_id
```

### Q6-my-work — My Work: assigned tickets across the whole org

```
  Limit
  Result
  Index Scan on tickets using idx_tickets_org_assignee_due_open
```

### Q7-status-counts — Per-column badge counts for the board

```
  Aggregate
  Result
  Index Only Scan on tickets using idx_tickets_org_project_status
```

### Q8-ticket-comments — Ticket detail: comment thread

```
  Limit
  Sort
  Result
  Index Scan on ticket_comments using idx_ticket_comments_ticket
```

### Q9-ticket-activity — Ticket detail: activity feed

```
  Limit
  Sort
  Result
  Index Scan on ticket_activity_log using idx_ticket_activity_log_org_ticket
```

### Q10-dependency-graph — Dependency edges for a ticket (blocks / blocked_by)

```
  Result
  Bitmap Heap Scan on work_item_relations
  BitmapOr
  Bitmap Index Scan using idx_work_item_relations_item
  Bitmap Index Scan using idx_work_item_relations_related
```

### Q11-portfolio-rollup — Portfolio dashboard: per-project open/done rollup from daily snapshots (post-fix)

```
  Limit
  Sort
  Aggregate
  Sort
  Result
  Bitmap Heap Scan on project_daily_snapshots
  Bitmap Index Scan using idx_project_daily_snapshots_org_project
  Result
  Limit
  Index Scan on project_daily_snapshots using uniq_project_daily_snapshots_project_date_group
```

### Q12-timesheet-billing-rollup — Billing: approved billable hours + amount by project

```
  Limit
  Sort
  Aggregate
  Result
  Seq Scan on timesheets
```
