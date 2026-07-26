# Wave 12 — dead-code inventory (removal checklist)

> Candidates found by read-only grep analysis (2026-07-26). **This is a CHECKLIST, not a delete-now
> list.** Every item is re-verified immediately before removal, then build+lint+typecheck must stay
> green (§0 rule 7 — "only when proven unused, never breaking"). Schema-table/column removals are
> migrations → **DB-gated** (do with Wave 7/12, after reconciliation). Endpoint removals need a
> check for **non-frontend callers** (MCP tools, server-to-server, cron, external API) before delete.

## 1. Dead schema tables (HIGH confidence — deletion = migration, DB-gated)
- `workflow_triggers` (`schema/workflow.ts:39`) — not imported by `workflows.service.ts` or anywhere; workflow engine uses versions/executions/steps, not this table.
- `workflow_actions` (`schema/workflow.ts:49`) — same; zero references.
- `courses` / `course_categories` / `course_enrollments` (`schema/hr/learning.ts`) — re-exported via `hr.ts` but zero module queries (matches prior HR audit deleting learning/career dead tables).
- `training_programs` / `training_attendance` (`schema/hr/training.ts`) — zero module queries.
- ⚠️ `payrolls` (`schema/hr/payroll.ts:31`) — **NOT dead**, still 4+ readers (ai ops-copilot, chat-assistant, hr-analytics, hr compliance). Remove only after Wave 4/HR migrates readers → `payroll_runs`. KEEP for now.

## 2. Dead schema columns (HIGH — migration, DB-gated; verify once more)
- `users.login_attempts`, `users.locked_until` (`auth.ts:113-114`) — account-lockout scaffolded, never implemented; only written by `seed-demo.ts`.
- `users.google_refresh_token`, `users.google_email` (`auth.ts:133-134`) — no Google OAuth token-exchange code; `me.service.ts` explicitly excludes them (Composio custodies tokens per CLAUDE.md §6).
- `journal_lines.{client_id,vendor_id,project_id,department_id,employee_id,tax_code_id}` (`accounting.ts:63`) — raw integer placeholders, no FK, superseded by the `dimension_values` JSONB; zero service reads.

## 3. Zombie backend endpoints (HIGH per zero-FRONTEND-callers — ⚠️ MUST verify no MCP/server/cron/external caller before delete)
- `reports.controller`: `GET /reports/{attendance,payroll,project,team-performance}` (`/reports/source-effectiveness` IS used — keep).
- `service-accounts.controller`: all 5 routes (`/service-accounts*`).
- `temporary-access.controller`: `/access/temporary*` (3 routes).
- `workspace-search.controller`: `/workspace-search*` (2 routes) — cross-check the `workspace_search_chunks` table + any AI/command-palette server usage first.
- `targets.controller`: `/targets*` (7 routes) — ⚠️ `targets.service` is a LIVE CRM feature (reads `users.role` for BRANCH_MANAGER). Verify the frontend truly never calls it (maybe via a different hook) before removing.

## 4. Orphan frontend files
- None confirmed (feature→page coverage is good). `lib/rbac/permissions/roles.ts` export reachability is MEDIUM-uncertain — verify how `PERMISSIONS` is imported before touching.

## 5. Dead types/enums/constants
- No high-confidence dead backend enums (affiliate/commission/referral/revenue enums are all live in billing). `workflow_trigger_type`/`workflow_node_type` enums are shared with live tables — keep even if the trigger/action tables go.

## 6. Ad-hoc migration scripts (post-reconciliation)
- `backend/scripts/apply-hrms-migrations.mjs` — inert (targets non-existent `0201-0226` range); safe to delete, but harmless. Remove during/after reconciliation.
- `backend/scripts/apply-sql-file.mjs` — generic applier; the user may use it during Wave 0 reconciliation → **keep until reconciliation done**, then remove so nothing side-applies SQL past the ledger.

## Execution rule (Wave 12)
Per item: (1) re-grep for ALL callers incl. `backend/scripts/mcp-server.mjs`, cron, server-to-server, external; (2) if truly zero → delete file/route/column; (3) `pnpm -C backend build && typecheck` + frontend `type-check` green; (4) commit that single removal. Never batch-delete unverified.
