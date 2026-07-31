# 04 — Build Schema Design (Target State)

**Date:** 2026-07-31 · **Scope:** Build module only · **Status:** Phase 3 deliverable, awaiting approval

> **This is a DELTA document, not a greenfield ERD.**
> `docs/schema-redesign/north-star.md` is the decided destination and `docs/schema-redesign/todo.md`
> is **392 done / 5 open**. Re-deriving an 81-table target from scratch would contradict a program
> that is essentially complete. This document specifies only what changes **inside Build**, and
> defers to north-star on every cross-cutting question (tenancy, RBAC, ownership, portal access).

---

## 1. Current state

81 tables across 27 files in `backend/src/db/schema/build/`.

| Property | Count | Note |
|---|---|---|
| Tables with `org_id` notNull | 78 / 81 | 3 gaps, see §3.1 |
| Tables classed **unbounded growth** | 34 | the tables that decide scalability |
| Tables with `serial` (int4) PK | **73 / 81** | **the binding capacity constraint, §2** |
| Tables with `bigserial` PK | **0** | none in the entire repo |
| Tables with soft-delete (`deletedAt`) | ~20 | inconsistent, §3.4 |
| Tables with no timestamps at all | 1 | `project_template_tickets` |

The structural work is largely done: composite `(org_id, id)` candidate keys are present on most
tables, `uniq_projects_org_key` is a correct tenant-composite unique, and typed grants
(`pm_project_grants`, `pm_workspace_grants`) already exist.

---

## 2. Capacity at 10M users — the one thing that must change

### 2.1 The constraint

`serial` in Postgres is **`integer`** — max **2,147,483,647**. 73 Build tables use it.
Exhaustion is not a slowdown; it is a hard `INSERT` failure. Repairing it means an int4→int8 PK
rewrite plus every referencing FK column — on a table that by then holds hundreds of millions of
rows, with a long exclusive lock. **This is cheap now and catastrophic later.**

### 2.2 Model

B2B SaaS at 10M users. Assume ~25 users/org → **~400k orgs**; assume 10% are highly active.

| Table | Rows per parent event | Growth driver | Est. annual rows at scale | Years to int4 exhaustion |
|---|---|---|---|---|
| `ticket_activity_log` | ~8 per ticket lifecycle | every field change | **~1.5–6B** | **< 1** |
| `webhook_deliveries` | 1 per event per endpoint | event fan-out × retries | ~0.5–3B | **< 1** |
| `ticket_comments` | ~4 per ticket | collaboration | ~300–800M | ~3–7 |
| `ticket_assignees`, `ticket_label_mappings`, `ticket_watchers` | 1–5 per ticket | junctions | ~200–600M each | ~4–10 |
| `project_daily_snapshots` | projects × days | daily cron | ~150M | ~14 |
| `tickets` | 1 | core entity | ~100–200M | ~10–20 |

The estimates carry wide error bars, but the **ordering is robust** and two tables are inside the
danger zone on any plausible assumption. `ticket_activity_log` and `webhook_deliveries` are
append-only, high-fan-out, and never pruned today.

### 2.3 Decision

**D-1. Migrate PKs to `bigint` (identity) on the 34 unbounded tables, starting with the 6 highest-velocity.**
Bounded config tables (`projects`, `sprints`, `custom_states`, `project_templates`, portfolios,
teams, OKR goals…) stay `serial` — they will never approach 2.1B and churning them is pure risk.

**D-2. Add a retention/pruning policy** for `ticket_activity_log`, `webhook_deliveries`, and
`project_daily_snapshots`. Unbounded append-only with no purge job violates H8 regardless of PK
width. Snapshots should roll up to monthly beyond 90 days.

**D-3. Do NOT partition yet.** Declarative partitioning by `org_id` hash is the right eventual answer
for `tickets`/`ticket_activity_log`, but it is a large change with real query-planner consequences
and the current row counts do not justify it. Revisit at ~100M rows in a single table. Recorded so
the decision is explicit rather than forgotten.

---

## 3. Table-level changes

### 3.1 Add `org_id` to the three tables missing it — **P0**

| Table | File:line | Current scoping |
|---|---|---|
| `project_members` | `members.ts:27-37` | `project_id → projects.org_id` |
| `project_template_tickets` | `core.ts:246-264` | `template_id → project_templates.org_id` |
| `ticket_checklist_items` | `tasks.ts:325-347` | `checklist_id → ticket_checklists.org_id` |

Violates H7 and CLAUDE.md §19. `project_members` is the urgent one — it carries `hourly_rate`, and
`projects-members.service.ts` / `projects-budget.service.ts` query it by `project_id`/`user_id`
with no org filter (currently safe only via upstream checks).

**Target for `project_members`:**
```
org_id      text not null → organizations.id
UNIQUE (org_id, project_id, user_id)      -- replaces uniq(project_id, user_id)
UNIQUE (org_id, id)                       -- candidate key, enables composite child FKs
FK (org_id, project_id) → projects(org_id, id)   -- structurally blocks cross-tenant rows
INDEX (org_id, user_id)                   -- owning query: "my projects"
```
Migration is expand → backfill → enforce (§5). The composite FK is what makes the wrong thing
*impossible* rather than merely detected.

### 3.2 ~~Split unbounded JSONB entity collections out of hot rows~~ — **RETRACTED 2026-07-31**

> **This section was wrong and is superseded by `03-change-map.md` §"Feedbucket JSONB".**
> The arrays are **bounded** — `feedbucket.schemas.ts:80-81` caps ingest at `.max(50)` and the widget
> sends `.slice(-30)`. No child table is needed; building one would be churn on a false premise.
> The real defect was an **unprojected list query** selecting the log columns on every row, fixed with
> `columns: { consoleLogs: false, networkLogs: false }`. Original (incorrect) analysis retained below
> for provenance.

### 3.2-original (superseded) — split unbounded JSONB entity collections out of hot rows

`feedback.ts:145-146`:
```
consoleLogs: jsonb("console_logs").$type<FeedbucketConsoleEntry[]>()
networkLogs: jsonb("network_logs").$type<FeedbucketNetworkEntry[]>()
```
Arrays of entities inside a row that also serves list/filter queries (`type`, `status`,
`assignee_id`). Exactly the anti-pattern the user called out and north-star §0.1 bans. A heavy-XHR
page produces MB-scale rows that every list query must read past.

**Target:** `feedbucket_submission_logs (id bigint, org_id, submission_id, kind enum('CONSOLE','NETWORK'), seq int, payload jsonb, created_at)`
with `INDEX (org_id, submission_id, kind, seq)` and a **hard cap on ingest** (e.g. last 200 entries
per kind) — the widget is externally driven, so the cap belongs at the write boundary, not in a
constraint.

**Related hot/cold splits (P1):** `project_whiteboards.data` (`whiteboards.ts:45`, full Excalidraw
scene) and `pages.content` (`members.ts:89`, full document body) both sit in rows that power list
views. Move the payload to a `*_content` sibling keyed 1:1, so list queries never read it.

> **Explicitly NOT changing:** `project_webhooks.events` and `project_custom_fields.options` are
> documented in the redesign register as *deliberately kept* bounded value lists. They are decisions,
> not defects.

### 3.3 Money — **P1**

| Column | File:line | Current | Target |
|---|---|---|---|
| `projects.budget` | `core.ts:50` | `decimal(15,2)`, no currency | `budget_minor bigint` + `budget_currency char(3)` |
| `project_members.hourly_rate` | `members.ts:32` | `decimal(10,2)`, no currency | `hourly_rate_minor bigint` + `currency char(3)` |

`decimal` is not a float, so this is a **rule violation and a correctness risk on FX**, not a live
rounding bug. Sequenced after §3.1 because it touches the same table. Currency defaults to the org's
currency at backfill.

### 3.4 Consistency items — **P2**

- **Soft-delete:** only ~20 of 81 tables have `deletedAt`. Apply to entities users can "delete" and
  expect to recover; explicitly *not* to junctions and append-only logs. Add partial indexes
  `WHERE deleted_at IS NULL` to the list-serving indexes on those tables.
- **Timestamps:** `project_template_tickets` has none. Many tables have `created_at` only. Add
  `updated_at` wherever the row is mutable.
- **PK type drift:** `serial` (73) / `identity` (6) / `text` UUID (2 — `pm_workspaces`,
  `pm_workspace_memberships`). Do **not** mass-convert; new tables use `bigint identity`. Recorded
  so it isn't re-flagged every audit.
- **Status columns:** `sprints.status`, `tickets.status`, `project_releases.status`,
  `project_milestones.status` are bare `text` with no DB constraint. Add `CHECK` constraints (per
  brief §12, preferring text+check over `pgEnum` for extensibility) with the allowed set shared from
  one source.

### 3.5 Deletion — **P2**

`reports` (`core.ts:192-223`): `from|insert|update|delete(reports)` = **0** occurrences repo-wide
**[VERIFIED]**. Drop after the bare-import re-check in §5.

---

## 4. Index design

Every index below names its owning query. Only changes are listed; the existing tenant-composite
indexes are correct and stay.

| Action | Index | Owning query | Rationale |
|---|---|---|---|
| **DROP** | `idx_tickets_org_project` (`tasks.ts:117`) | — | Strict prefix duplicate of `idx_tickets_org_project_status` (`:118`). Pure write overhead. |
| **ADD** | `project_members (org_id, user_id)` | "projects I'm a member of" | Replaces bare `idx_project_members_user`; depends on §3.1 |
| **REPLACE** | `custom_states (org_id, project_id)` | per-project state list | `idx_custom_states_org` is a standalone `(org_id)` index; the real filter is both |
| **ADD** | `ticket_activity_log (org_id, ticket_id, created_at DESC)` | ticket history pane | Verify one doesn't already cover it before adding |
| **ADD** | partial `WHERE deleted_at IS NULL` on soft-deleted tables' list indexes | all list endpoints | Keeps the index to live rows only |

**Deliberate global uniques — keep, now documented** (brief §4 exception for genuinely global keys):
- `uniq_project_whiteboards_share_token` (`whiteboards.ts:60`) — public share links must be globally unique.
- `uniq_feedbucket_widgets_public_key` (`feedback.ts:120`) — embedded on external sites.

**Non-org-led support indexes** (`idx_tickets_assignee`, `_sprint`, `_cycle`, `_parent`,
`_customer`, `idx_projects_manager`) are **acceptable as-is**: each leads with a column that already
implies tenant via its FK parent, and they serve point lookups rather than tenant scans. Flagging
them as H7 violations would be a false positive — recorded so a later audit doesn't "fix" them.

---

## 5. Migration runbook

Every step is **expand → backfill → dual-read → cutover → contract**. No big-bang rename (brief §21).

**M1 — `project_members.org_id`** (blocks M2)
1. `ALTER TABLE project_members ADD COLUMN org_id text NULL;`
2. Backfill in batches: `UPDATE … SET org_id = p.org_id FROM projects p WHERE …` — chunked by id range.
3. Dry-run counts: `SELECT count(*) FILTER (WHERE org_id IS NULL)` must reach 0.
4. `SET NOT NULL`; add FK, composite unique, `(org_id, user_id)` index (`CONCURRENTLY`).
5. Drop `uniq_project_members_project_user` only after the new unique exists.
- **Rollback:** drop the constraints/index, drop the column. Non-destructive at every step.

**M2 — money columns** — add `*_minor bigint` + `currency`, backfill `round(value*100)`, dual-read
behind the DTO, then drop the `decimal`. Rollback = keep the old column until contract.

**M3 — feedbucket log child table** — create table, dual-write, backfill existing rows, cut reads
over, then drop the two JSONB columns. Ingest cap ships with the dual-write.

**M4 — PK widening (`bigint`)** on the 6 highest-velocity tables. Highest risk; own batch; run
against a restored copy first with row counts before/after. Do the two danger-zone tables
(`ticket_activity_log`, `webhook_deliveries`) first.

**M5 — index drop/add** — `DROP INDEX CONCURRENTLY` / `CREATE INDEX CONCURRENTLY`, one per migration.

**M6 — drop `reports`** — after the bare-import grep (`import "…"` with no `from`) confirms zero
references. A prior cleanup deleted a live file because from-based scanners miss that form.

**Cold-DB rules inherited from the register** (proven, non-negotiable):
- Extensions (`vector`, `pg_trgm`, `btree_gist`, `pgcrypto`, `uuid-ossp`) must be created before
  `db:migrate`; never fold into `0000` (editing an applied migration changes its hash).
- Heavy catalog `DO`-block migrations must `SET statement_timeout = 0;` or Neon cancels them.
- To promote a unique index an FK already targets, use `ADD CONSTRAINT … UNIQUE USING INDEX`.
- Author discrete dependency-ordered migrations; a ~2000-op monolith ECONNRESETs on Neon.

---

## 6. Access-pattern matrix (hot Build queries)

| # | Query | Endpoint | Filter | Serving index | Status |
|---|---|---|---|---|---|
| Q1 | Project list | `GET /build` | `org_id, status` | `idx_projects_org_status` | OK |
| Q2 | Board tickets | `GET /build/:id/tickets` | `org_id, project_id, status` | `idx_tickets_org_project_status` | OK |
| Q3 | My issues | `/build/my-work` | `assignee_id` | `idx_tickets_assignee` | OK |
| Q4 | Ticket search | `useTicketSearch` | `title ILIKE %x%` | `idx_tickets_title_trgm` (GIN) | OK — trgm present |
| Q5 | Project search | `GET /build?search=` | `name ILIKE %x%` | **none** | **GAP — see below** |
| Q6 | Ticket history | ticket detail | `ticket_id, created_at` | verify | §4 |
| Q7 | My projects | members surfaces | `user_id` (no org) | `idx_project_members_user` | **fix in M1** |
| Q8 | Budget rollup | `GET /build/:id/budget` | `project_id` | FK index | OK |

**Q5 gap:** `projects.service.ts:117-121` and `projects-customers.service.ts:18` use leading-wildcard
`ILIKE '%x%'` with no trgm index on `projects.name` — a sequential scan that grows with tenant count.
Tickets already have `idx_tickets_title_trgm`; projects do not. **Add a matching GIN trgm index**
(brief §17 bans `ILIKE '%x%'` at scale). Low risk, high value.

---

## 7. Explicitly not doing

| Rejected | Why |
|---|---|
| A shared/merged `products` table | north-star.md:397 — `managed_products`, `inv_products`, `crm_products` and Inventory SKU are distinct concepts and "must stay so" |
| Normalising `project_webhooks.events` / `project_custom_fields.options` | Documented deliberate bounded value lists |
| Partitioning `tickets` / `ticket_activity_log` now | D-3 — right answer eventually, unjustified at current volume |
| Mass PK-type unification across all 81 tables | Churn without benefit; new tables use `bigint identity` |
| Re-deriving a greenfield 81-table ERD | The redesign program is 392/397 done; this converges on it |
| Cursor pagination on existing Build lists | H3 — would change working numbered-page UX. Approved default: offset stays; cursor only for new/unbounded lists |
