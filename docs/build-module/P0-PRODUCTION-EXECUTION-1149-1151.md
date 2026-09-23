# Production execution evidence — migrations 1149, 1150, 1151

Date: 2026-09-22
Target: Aurora PostgreSQL 18.4, cluster `streamlineos`, ap-south-1,
instance `streamlineos-instance-1`, database `streamlineos`, connected as `streamline_admin` over IAM auth.
Authorization: the repository owner explicitly authorized production execution in session, stating they are
the only user of the database.

## Recovery point

Manual cluster snapshot **`pre-1149-20260922132524`** reached `available` (100%) before any DDL ran.

Cluster state read from the CLUSTER, not the instance, at snapshot time:

| Property | Value |
|---|---|
| Engine | aurora-postgresql 18.4 |
| Backup retention | **1 day** |
| Earliest restorable | 2026-09-20T19:43:15Z |
| Latest restorable | 2026-09-22T13:22:45Z |
| Members | streamlineos-instance-1 |

The 1-day retention is why the manual snapshot matters: the automatic recovery window is narrow and moving.

## What was applied

Each was dry-run first, then applied with `--tag=`, which bypasses the watermark-0 replay path.

| Migration | Statements | Effect |
|---|---|---|
| `1149_change_requests_client_visible_release_id` | 6 | `build.change_requests` gains `client_visible BOOLEAN NOT NULL DEFAULT FALSE` and `release_id INTEGER`, two partial indexes, and a composite FK to `build.project_releases` |
| `1150_invoice_items_timesheet_entry_ref` | 5 | `public.invoice_items` gains `timesheet_entry_id INTEGER`, a partial index on `(org_id, timesheet_entry_id)`, and a composite FK to `public.timesheets` |
| `1151_notifications_metadata_project_id_index` | 2 | Expression index on `public.notifications (org_id, membership_id, (metadata->>'projectId'))` for the new Inbox project filter |

## 1150 was corrected before it was applied

As written and merged, 1150 declared `REFERENCES public.timesheets(id)` — a **single-column** foreign key.
`invoice_items` carries `org_id`, so that would have permitted an invoice line in one organization to
reference another organization's timesheet. It also contradicted
`0954_ar02_hr_payroll_timesheet_composite_fks.sql`, whose entire purpose was converting every referrer of
`timesheets` to the composite form.

Rewritten before applying to:

```
FOREIGN KEY (org_id, timesheet_entry_id)
REFERENCES public.timesheets (org_id, id)
ON DELETE SET NULL (timesheet_entry_id)
NOT VALID
```

The explicit `(timesheet_entry_id)` column list is required: without it Postgres nulls every column in the
key, including the NOT NULL `org_id`, and the delete fails `23502` surfaced as a 500.

## Postconditions — all pass

**1149** — `migrations/sql/1149-verify.sql`, six read-only queries:

| Check | Expected | Got |
|---|---|---|
| `client_visible` column, boolean, default false | 1 | 1 |
| `release_id` column, integer, nullable | 1 | 1 |
| `idx_change_requests_org_release` exists | 1 | 1 |
| `idx_change_requests_org_client_visible` exists | 1 | 1 |
| `fk_change_requests_org_release` exists | 1 | 1 |
| FK violators before validation | 0 | 0 |

**1150 / 1151**:

| Check | Expected | Got |
|---|---|---|
| `invoice_items.timesheet_entry_id` integer, nullable | 1 | 1 |
| `idx_invoice_items_timesheet_entry` exists | 1 | 1 |
| `fk_invoice_items_org_timesheet_entry` exists | 1 | 1 |
| FK violators before validation | 0 | 0 |
| `idx_notifications_metadata_project_id` exists | 1 | 1 |

Both foreign keys were then **validated**, each moving `convalidated` false → true:

```
fk_change_requests_org_release
  FOREIGN KEY (org_id, release_id) REFERENCES build.project_releases(org_id, id)
  ON DELETE SET NULL (release_id)

fk_invoice_items_org_timesheet_entry
  FOREIGN KEY (org_id, timesheet_entry_id) REFERENCES timesheets(org_id, id)
  ON DELETE SET NULL (timesheet_entry_id)
```

## Ledger

| Property | Before | After |
|---|---|---|
| Applied rows | 905 | **908** |
| Journal entries | 908 | 908 |
| Pending | 3 | **0** |
| Watermark | 1803000010440 | **1803000010470** |

Each ledger row's `created_at` equals its journal `when` exactly (`…10450`, `…10460`, `…10470`), and each
row's hash equals the sha256 of the file on disk. 1149's hash:
`c7eff7adf3365dfadac9c1c5c39edba4e2004be84832022602793c1890d15b68`.

## Live gates that could finally run

These two refuse to report without a database and had been BLOCKED all session:

| Gate | Result |
|---|---|
| `check:composite-fk-set-null` | **PASS** — 816 live `ON DELETE SET NULL` foreign keys read, **0** that would null a NOT NULL column, 0 known, 0 new. Both new composite FKs are inside that 816 |
| `check:tenant-relationships` | Ran, but declares itself **not release evidence**: the ledger matches 907 of 908 entries by when-value because of a pre-existing defect, so it reports `TARGET IS MID-BOOTSTRAP` |

## Pre-existing ledger defects, unchanged

`check:migration-ledger` still fails on two counts that predate this session and are unrelated to these
migrations:

- **1 duplicate row: `47`**
- **1 entry below the watermark that will never apply: `1123_ai_action_proposals_rls`**

Both are consistent with the recorded posture that the production ledger was reconciled rather than
replayed. Neither was introduced here and neither was touched.

## Follow-up

`backend/src/db/schema/crm/invoicing.ts` does not yet declare `invoiceItems.timesheetEntryId`, so the
Drizzle schema is narrower than the live catalog by one inert column. No code reads or writes it. Adding it
is the natural next step when the invoicing service starts populating the approved-time link.

## Acceptance criteria

- [x] Recovery snapshot exists and reached `available` before any DDL.
- [x] Exact target confirmed by host, database and role before applying.
- [x] Every migration dry-run before execution.
- [x] Rollback file present for each.
- [x] Postcondition evidence captured for each, all passing.
- [x] Both foreign keys validated, with their definitions read back from `pg_constraint`.
- [x] Ledger reconciled: 908/908, 0 pending, hashes match the files on disk.
- [x] No single-column foreign key to a tenant-owned table was introduced.
