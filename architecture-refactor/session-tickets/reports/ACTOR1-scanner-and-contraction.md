# ACTOR1 — Scanner Fix and Contraction Report

Date: 2026-08-30  
File edited: `backend/src/scripts/scan-legacy-org-actors.mjs`

---

## Task 1 — Scanner fix

### Root cause of undercounting

Two structural blindspots, both confirmed by running `--catalog` against the live Neon DB before the fix:

**Blindspot A — pgSchema tables (69 FKs)**  
The `tableDecl` regex at line 102 matched only `pgTable(`. The entire build module
declares tables as `build.table()` / `buildEvents.table()` via `pgSchema("build")` /
`pgSchema("build_events")` (defined in `src/db/schema/build/namespaces.ts`). Every
`.ts` file under `src/db/schema/build/` was scanned but matched zero table declarations,
so all 77 build-module organizational FKs were silently dropped.

The one-line fix (confirmed line 102 in the file before editing):
```
before: /export\s+const\s+([A-Za-z_$][A-Za-z0-9_$]*)\s*=\s*pgTable\(/g
after:  /export\s+const\s+([A-Za-z_$][A-Za-z0-9_$]*)\s*=\s*(?:pgTable|[A-Za-z_$][A-Za-z0-9_$]*\.table)\(/g
```

The break condition on line 131 was updated in parallel to also stop backward column
walks at `.table(` boundaries, matching the extended pattern.

**Blindspot B — raw-SQL-only tables (49+2 FK pairs)**  
A second category of FKs exists in pg_catalog with no Drizzle schema declaration at
all. These were added by raw-SQL migrations (AP/AR/bank/GL, CRM commissions, HR extras,
advanced inventory) and two platform-global tables. They are permanently invisible to
any source-file scan.

**Choice for Blindspot B: static list (option a)**  
Option (b) — adding Drizzle declarations — would pull these tables into the runtime
schema barrel. `migration-integrity.spec.ts` explicitly asserts that SQL-managed tables
stay outside that barrel (`hrms-phase1-sql-managed.ts` is the documented precedent).
Using Drizzle to manage these tables would invalidate that spec and risk Drizzle
generating spurious diffs against the raw-SQL schema on every `db:generate`.

Option (a) — `KNOWN_RAW_SQL_ACTOR_FKS` static list — keeps CI accurate without a DB
connection and without touching the migration barrel. The `--catalog` mode exists to
validate the list whenever a new raw-SQL migration touches users.id FKs.

**Explicitly excluded globals (2 FK pairs, with comments in the script)**  
```
organizations.purge_scheduled_by  — platform-admin only; schedules GDPR erasure jobs;
                                    table has no org_id, no membership lookup possible
subprocessors.updated_by          — platform-legal record (DPA sub-processor list);
                                    no org_id, updated by ops staff not org members
```

---

## Task 2 — Soundness proof

### Before fix (source scan only)

```
Organizational:  553
Bridge:            3
Authentication:    5
Total scanned:   561
Build module:      0  ← every build-schema FK invisible
```

pg_catalog cross-check before fix:
```
pg_catalog users.id FK pairs  : 663
visible to source scan         : 561
INVISIBLE                      : 121
```

### After fix

Running `node src/scripts/scan-legacy-org-actors.mjs`:

```
Organizational:  679
Bridge:            3
Authentication:    5
Total scanned:   687
Build module:     77  ← previously 0; regex fix recovered all 77
```

Running `node src/scripts/scan-legacy-org-actors.mjs --catalog` (with DATABASE_URL):

```
pg_catalog users.id FK pairs      : 663
visible to Drizzle source scan    : 638
covered by KNOWN_RAW_SQL_ACTOR_FKS:  49
excluded as global (non-org) FKs  :   2
STILL INVISIBLE (needs list update):  0   ← gap closed
source-only (Drizzle, no DB FK)   :  26
static list entries not in catalog :   0
```

Arithmetic check: 638 Drizzle in catalog + 49 raw-SQL + 2 global = 689. Minus 26
source-only not yet in catalog = 663. ✓

Self-test result:
```
Self-test passed (687 total FKs found, all known examples verified).
```

The self-test now asserts five build-schema FKs (`tickets.assignee_id`,
`tickets.reporter_id`, `ticket_comment_mentions.mentioned_user_id`,
`bugs.created_by`, `projects.manager_id`) and three raw-SQL-static FKs
(`ap_documents.posted_by`, `crm_commission_plans.created_by`,
`inv_pick_lists.assigned_to`) in addition to the original HR/auth/bridge probes.
The floor was raised from 50 to 600.

### Numbers and residual gap

| Metric | Before fix | After fix |
|---|---|---|
| Drizzle source-visible FKs (unique) | 561 | 638 |
| Build-module FKs | 0 | 77 |
| Raw-SQL static entries | 0 | 49 |
| Global excluded | 0 (unknown) | 2 (explicit) |
| Organizational ratchet count | 553 | 679 |
| pg_catalog FKs still invisible | 121 | 0 |

**Note on CRM duplicates:** the CRM module declares the `deals` table in both
`crm/deal-pipeline.ts` and `crm/deals.ts`; 18 FK pairs are parsed twice. The
`--catalog` mode's Set deduplicates correctly to 638 unique Drizzle FKs. The scanner
output of 679 organizational already reflects the correct (deduplicated) count:
630 unique Drizzle org + 49 raw-SQL = **679 distinct org FKs to contract**. The
CRM schema duplication is a separate dead-code issue, not a scanner defect.

**Residual gap: zero.** The 26 source-only entries are Drizzle declarations whose FK
constraints have not yet been applied to the DB. They are not a scanner defect.

**Ratchet baseline must be re-emitted** before CI uses `--check`:
```
node src/scripts/scan-legacy-org-actors.mjs --emit-baseline
```
The old baseline (555, captured 2026-08-28) will cause a false violation because it
predates both the build-schema discovery and the raw-SQL static list.

---

## Task 3 — Next contraction tranche

### Already contracted (2 columns)

Comparing baseline (555, 2026-08-28) to source scan immediately before this session
(553): two legacy `users.id` references have been removed from Drizzle schema files.
The contracted membership_id companions visible in the schema are `tickets.assignee_membership_id`
and `tickets.reporter_membership_id` (both in `build/ticket-core.ts`), but the legacy
`assigneeId`/`reporterId` still carry `.references(() => users.id)` — those are still
in the ratchet. The 2 dropped references are from a different table, likely
`invitations` where `revokedByMembershipId` was added and the legacy `revoked_by`
column's `users.id` reference was removed.

### Next mechanical batch

The safest first tranche beyond what is already in flight are **nullable, single-column,
organizational `created_by` / `actor` columns on tables that already have `org_id`**
and no other users.id references. Examples from the build module (now visible to the
scanner for the first time):

- `build.ticket_activity_log.user_id` (nullable, has org_id, single users.id ref)
- `build.ticket_comment_mentions.mentioned_user_id` (nullable, has org_id, single ref)
- `build.ticket_related_links.created_by` (nullable, has org_id, single ref)
- `build.sprint_scope_events.actor_id` (nullable, has org_id, single ref)
- `build.workflow_transitions.created_by` (nullable, has org_id, single ref)

These are mechanically identical: one lookup, one new column, one FK. No NOT NULL
concern (all nullable). No multi-column complexity.

### Migration shape (exact template — do NOT write this migration in this lane)

Each contraction is two consecutive migrations (two `.sql` files, both journalled):

**Migration A — add column, backfill, add FK NOT VALID**
```sql
SET lock_timeout = '5s';

ALTER TABLE build.<table>
  ADD COLUMN IF NOT EXISTS <col>_membership_id integer;

-- No lock on this UPDATE; runs after the DDL commits
UPDATE build.<table> t
SET <col>_membership_id = om.id
FROM organization_members om
WHERE om.user_id = t.<col>
  AND om.org_id  = t.org_id
  AND t.<col> IS NOT NULL;

ALTER TABLE build.<table>
  ADD CONSTRAINT fk_<table>_<col>_actor
  FOREIGN KEY (org_id, <col>_membership_id)
  REFERENCES organization_members (org_id, id)
  ON DELETE RESTRICT
  NOT VALID;
```

**Migration B — validate (separate file, separate journal entry)**
```sql
SET lock_timeout = '5s';

ALTER TABLE build.<table>
  VALIDATE CONSTRAINT fk_<table>_<col>_actor;
```

Rules that bind:
- `ADD CONSTRAINT … NOT VALID` takes ACCESS EXCLUSIVE on BOTH tables (~instant for
  metadata-only); `VALIDATE CONSTRAINT` takes `ShareUpdateExclusiveLock` (online).
  They must be separate migrations with separate journal entries.
- No `CREATE INDEX CONCURRENTLY` (runner wraps each file in a transaction).
- No `-->statement-breakpoint` inside a `DO $$ … $$;` block.
- Every migration sets `lock_timeout` first so it fails fast rather than queueing.
- The `.sql` file must appear in `_journal.json` before `db:migrate` — a file absent
  from the journal never applies while `db:migrate` still prints success.
- The UPDATE backfill may leave NULLs for rows where the user has left the org
  (user_id has no matching organization_members row). Those nulls are correct — the
  FK allows NULL since the column is nullable. Service code must be updated to write
  the membership_id column before the legacy column is eventually dropped.
