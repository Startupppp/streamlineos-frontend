# Wave 12 — dead-code inventory (removal checklist)

> Candidates found by read-only grep analysis (2026-07-26). **This is a CHECKLIST, not a delete-now
> list.** Every item is re-verified immediately before removal, then build+lint+typecheck must stay
> green (§0 rule 7 — "only when proven unused, never breaking"). Schema-table/column removals are
> migrations → **DB-gated** (do with Wave 7/12, after reconciliation). Endpoint removals need a
> check for **non-frontend callers** (MCP tools, server-to-server, cron, external API) before delete.
>
> **UPDATE 2026-07-28** — verified against live DB and codebase. Per-section corrections below.

## 1. Dead schema tables (HIGH confidence — deletion = migration, DB-gated)

**Verified 2026-07-28 against live DB:**

- ✅ `workflow_triggers`, `workflow_actions` — **DROPPED** by migration `0334_drop_dead_schema_objects`.
  No action needed.
- ⚠️ `courses` / `course_categories` / `course_enrollments` — **STILL ALIVE** in DB (confirmed 2026-07-28).
  Drop via `docs/schema-migration/drop-dead-tables.sql` (still pending as of this date).
- ⚠️ `training_programs` / `training_attendance` — **STILL ALIVE** in DB (confirmed 2026-07-28).
  Drop via `docs/schema-migration/drop-dead-tables.sql`.
- ⚠️ `service_accounts`, `allowance_types` — **STILL ALIVE** in DB (confirmed 2026-07-28). Also in
  `drop-dead-tables.sql`.
- 🚫 `payroll_statutory_rule_sets` — **intentionally NOT dropped**: holds 8 seeded IS statutory rule
  sets (PF, ESI, PT, LWF, TDS, GRATUITY, HRA, MIN_WAGE). Code-dead but data-live. See note in
  `drop-dead-tables.sql`. Do not drop without a product decision.
- ⚠️ `payrolls` (`schema/hr/payroll.ts:31`) — **NOT dead**, still 4+ readers (ai ops-copilot,
  chat-assistant, hr-analytics, hr compliance). Remove only after Wave 4/HR migrates readers →
  `payroll_runs`. KEEP for now.

## 2. Dead schema columns (HIGH — migration, DB-gated; verify once more)

**Verified 2026-07-28 against live DB:**

- ✅ `users.login_attempts`, `users.locked_until` — **DROPPED** by migration `0334_drop_dead_schema_objects`.
- ✅ `users.google_refresh_token`, `users.google_email` — **DROPPED** by migration `0334_drop_dead_schema_objects`.
- ❌ `journal_lines.{client_id,vendor_id,project_id,department_id,employee_id,tax_code_id}` — **NOT
  dead.** All 6 columns exist in DB (confirmed 2026-07-28) and are actively read and written by
  `accounting/finance-posting.service.ts`, `accounting-gl/general-ledger.service.ts`, and
  `finance-reports/analytics-reports.service.ts`. Migration `0334` explicitly records this correction.
  These columns are not superseded by `dimension_values` JSONB. **Do not drop.**

## 3. Zombie backend endpoints (verified 2026-07-28 — ALL REMOVED)

All five zombie controller groups have been deleted from the codebase. Verified by searching
`backend/src/modules/` for each module directory and by grepping for controller symbols.

- ✅ `reports.controller` zombie sub-routes (`/reports/{attendance,payroll,project,team-performance}`)
  — **REMOVED**. Only `/reports/source-effectiveness` remains (kept, still used).
- ✅ `service-accounts.controller` — **REMOVED** (no `service-accounts` module directory exists).
- ✅ `temporary-access.controller` — **REMOVED** (no `temporary-access` module directory exists).
- ✅ `workspace-search.controller` — **REMOVED**; `workspace_search_chunks` table also dropped by
  migration `0334`.
- ✅ `targets.controller` — **REMOVED**; `targets` and `target_history` tables dropped by migration
  `0334`.

## 4. Orphan frontend files
- None confirmed (feature→page coverage is good). `lib/rbac/permissions/roles.ts` export reachability is MEDIUM-uncertain — verify how `PERMISSIONS` is imported before touching.

## 5. Dead types/enums/constants
- No high-confidence dead backend enums (affiliate/commission/referral/revenue enums are all live in billing). `workflow_trigger_type`/`workflow_node_type` enums are shared with live tables — keep even if the trigger/action tables go.

## 6. Ad-hoc migration scripts (post-reconciliation)

**UPDATE 2026-07-28:** Wave 0 reconciliation (GATE 0.4) is now DONE. Both scripts can be removed.

- `backend/scripts/apply-hrms-migrations.mjs` — inert (targets non-existent `0201-0226` range); safe to delete now.
- `backend/scripts/apply-sql-file.mjs` — the reconciliation hold has been lifted (GATE 0.4 done). Safe to remove. Ensure nothing in `scripts/`, cron, or CI references it first.

## Execution rule (Wave 12)
Per item: (1) re-grep for ALL callers incl. `backend/scripts/mcp-server.mjs`, cron, server-to-server, external; (2) if truly zero → delete file/route/column; (3) `pnpm -C backend build && typecheck` + frontend `type-check` green; (4) commit that single removal. Never batch-delete unverified.
