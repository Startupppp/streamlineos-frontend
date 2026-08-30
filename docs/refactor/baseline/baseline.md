# Build module — Phase 0 performance baseline

Captured as `streamline_app` (RLS enforced, `app.organization_id` set) against the seeded dataset.
Org `73e5076a-225f-4b4c-b93e-9bc66a548bfe` · project `129` · ticket `20001`.

## Query timings

| ID | Query | Exec ms | Rows | Buffer blocks | Seq scans |
|---|---|---:|---:|---:|---:|
| Q1-board-page1 | Board / list, page 1, sorted by fractional rank (the benchmark) | 0.2 | 50 | 54 | 0 |
| Q2-board-deep-page | Same list at offset 3000 (offset pagination cost) | 0.77 | 0 | 336 | 0 |
| Q3-list-count | The COUNT(*) fired alongside every list request | 0.18 | 1 | 9 | 0 |
| Q4-search-ilike | Search: leading-wildcard ILIKE on title (seq-scan under RLS — use app.search_ticket_ids SDF instead) | 0.57 | 0 | 336 | 0 |
| Q6-my-work | My Work: assigned tickets across the whole org | 0.18 | 50 | 52 | 0 |
| Q7-status-counts | Per-column badge counts for the board | 0.17 | 1 | 4 | 0 |
| Q10-dependency-graph | Dependency edges for a ticket (blocks / blocked_by) | 0.1 | 1 | 5 | 0 |
| Q11-portfolio-rollup | Portfolio dashboard: per-project open/done rollup from daily snapshots | 0.07 | 0 | 2 | 0 |

## Table sizes

| Table | Rows | Heap | Indexes | Total |
|---|---:|---:|---:|---:|
| ticket_comments | 50000 | 21 MB | 11 MB | 32 MB |
| ticket_activity_log | 40000 | 12 MB | 20 MB | 32 MB |
| tickets | 24000 | 30 MB | 73 MB | 104 MB |
| ticket_assignees | 17143 | 4504 kB | 12 MB | 17 MB |
| timesheets | 15000 | 3160 kB | 2984 kB | 6184 kB |
| ticket_label_mappings | 10000 | 1824 kB | 2456 kB | 4320 kB |
| work_item_relations | 6647 | 1216 kB | 2600 kB | 3856 kB |
| permission_supported_scopes | 833 | 48 kB | 64 kB | 144 kB |
| permissions | 725 | 336 kB | 248 kB | 624 kB |
| sprints | 320 | 88 kB | 136 kB | 264 kB |
| project_statuses | 256 | 64 kB | 200 kB | 304 kB |
| notification_events | 133 | 112 kB | 120 kB | 272 kB |
| project_members | 128 | 40 kB | 152 kB | 232 kB |

## Index scan counts (pre-traffic; zero means unproven, not unused)

| Table | Index | Scans | Size |
|---|---|---:|---:|
| projects | idx_projects_managed_product | 0 | 16 kB |
| projects | idx_projects_manager | 0 | 16 kB |
| projects | idx_projects_name_trgm | 0 | 40 kB |
| projects | idx_projects_org_status | 0 | 16 kB |
| projects | uniq_projects_org_key | 0 | 16 kB |
| projects | idx_projects_deal | 0 | 16 kB |
| projects | uniq_projects_org_id | 0 | 16 kB |
| projects | idx_projects_org_pm_workspace | 1 | 16 kB |
| projects | projects_pkey | 17 | 16 kB |
| ticket_activity_log | uniq_ticket_activity_log_org_id | 0 | 5368 kB |
| ticket_activity_log | ticket_activity_log_pkey | 0 | 1768 kB |
| ticket_activity_log | idx_ticket_activity_log_ticket_recent | 20000 | 3712 kB |
| ticket_activity_log | idx_ticket_activity_log_org_ticket | 20001 | 9104 kB |
| ticket_assignees | idx_ticket_assignees_org_user_ticket | 0 | 5136 kB |
| ticket_assignees | idx_ticket_assignees_user_id | 94 | 240 kB |
| ticket_assignees | idx_ticket_assignees_org_member_membership | 142 | 240 kB |
| ticket_assignees | ticket_assignees_pkey | 34286 | 768 kB |
| ticket_assignees | uniq_ticket_assignees_org_id | 34286 | 2312 kB |
| ticket_assignees | uniq_ticket_assignees_ticket_user | 74292 | 3544 kB |
| ticket_comments | idx_ticket_comments_ticket | 0 | 2208 kB |
| ticket_comments | uniq_ticket_comments_org_id | 1 | 6704 kB |
| ticket_comments | ticket_comments_pkey | 150000 | 2208 kB |
| ticket_label_mappings | ticket_label_mappings_pkey | 20000 | 456 kB |
| ticket_label_mappings | uniq_ticket_label_mappings_org_id | 20045 | 1360 kB |
| ticket_label_mappings | uniq_ticket_label_mappings_ticket_label | 60000 | 568 kB |
| tickets | idx_tickets_org_status_priority | 0 | 680 kB |
| tickets | idx_tickets_cycle | 0 | 608 kB |
| tickets | idx_tickets_recurrence_next | 0 | 8192 bytes |
| tickets | idx_tickets_customer | 0 | 608 kB |
| tickets | idx_tickets_title_trgm | 0 | 8104 kB |
| tickets | uniq_tickets_org_id | 0 | 5896 kB |
| tickets | idx_tickets_org_project_rank | 0 | 9600 kB |
| tickets | idx_tickets_org_project_created | 0 | 5720 kB |
| tickets | idx_tickets_org_project_updated | 0 | 6880 kB |
| tickets | idx_tickets_org_project_priority | 0 | 5720 kB |
| tickets | idx_tickets_org_project_due_date | 0 | 5736 kB |
| tickets | idx_tickets_customer_party_id | 0 | 640 kB |
| tickets | idx_tickets_customer_org_party_id | 0 | 640 kB |
| tickets | idx_tickets_project_status | 0 | 1040 kB |
| tickets | uniq_tickets_project_number | 0 | 2144 kB |
| tickets | idx_tickets_org_project_rank_sort | 1 | 8456 kB |
| tickets | idx_tickets_org_assignee_due_open | 1 | 352 kB |
| tickets | idx_tickets_org_assignee_membership | 2 | 640 kB |
| tickets | idx_tickets_org_reporter_membership | 7 | 640 kB |
| tickets | idx_tickets_org_assignee_status | 8 | 688 kB |
| tickets | idx_tickets_org_project_number | 11 | 5368 kB |
| tickets | idx_tickets_sprint | 600 | 752 kB |
| tickets | idx_tickets_org_project_status | 786 | 1040 kB |
| tickets | idx_tickets_parent | 20000 | 608 kB |
| tickets | tickets_pkey | 1066790 | 1944 kB |
| timesheets | idx_timesheets_org_status | 0 | 128 kB |
| timesheets | idx_timesheets_org_project_date | 0 | 296 kB |
| timesheets | uniq_timesheets_work_log | 0 | 8192 bytes |
| timesheets | idx_timesheets_timer_session | 0 | 112 kB |
| timesheets | idx_timesheets_org_billing | 0 | 128 kB |
| timesheets | idx_timesheets_org_user_date | 0 | 184 kB |
| timesheets | uniq_timesheets_day_blank | 0 | 8192 bytes |
| timesheets | uniq_timesheets_day_project | 0 | 8192 bytes |
| timesheets | idx_timesheets_org_payroll | 0 | 200 kB |
| timesheets | idx_timesheets_period | 0 | 112 kB |
| timesheets | uniq_timesheets_org_id | 0 | 1008 kB |
| timesheets | timesheets_pkey | 0 | 344 kB |
| timesheets | idx_timesheets_org_invoicing | 0 | 120 kB |
| timesheets | idx_timesheets_user_date | 2 | 208 kB |
| timesheets | idx_timesheets_org_approved_actor | 3 | 120 kB |
| work_item_relations | uniq_work_item_relation | 13293 | 424 kB |
| work_item_relations | work_item_relations_pkey | 13294 | 312 kB |
| work_item_relations | uniq_work_item_relations_org_id | 13338 | 896 kB |
| work_item_relations | idx_work_item_relations_item | 20001 | 424 kB |
| work_item_relations | idx_work_item_relations_related | 40001 | 424 kB |

## Plan nodes

### Q1-board-page1 — Board / list, page 1, sorted by fractional rank (the benchmark)

```
  Limit
  Result
  Index Scan on tickets using idx_tickets_org_project_rank_sort
```

### Q2-board-deep-page — Same list at offset 3000 (offset pagination cost)

```
  Limit
  Sort
  Result
  Index Scan on tickets using idx_tickets_org_project_status
```

### Q3-list-count — The COUNT(*) fired alongside every list request

```
  Aggregate
  Result
  Index Only Scan on tickets using idx_tickets_org_project_number
```

### Q4-search-ilike — Search: leading-wildcard ILIKE on title (seq-scan under RLS — use app.search_ticket_ids SDF instead)

```
  Limit
  Sort
  Result
  Index Scan on tickets using idx_tickets_org_project_status
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

### Q10-dependency-graph — Dependency edges for a ticket (blocks / blocked_by)

```
  Result
  Bitmap Heap Scan on work_item_relations
  BitmapOr
  Bitmap Index Scan using idx_work_item_relations_item
  Bitmap Index Scan using idx_work_item_relations_related
```

### Q11-portfolio-rollup — Portfolio dashboard: per-project open/done rollup from daily snapshots

```
  Limit
  Sort
  Aggregate
  Sort
  Result
  Bitmap Heap Scan on project_daily_snapshots
  Bitmap Index Scan using uniq_project_daily_snapshots_org_id
  Aggregate
  Index Scan on project_daily_snapshots using idx_project_daily_snapshots_org_project
```
