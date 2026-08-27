# c23 — A tenant extends the product without a deploy

PRD: [`prd.md`](prd.md) · Program: [`../README.md`](../README.md)

**Wave 2** · 5 tickets, all done.

306 of 415 enums are tenant-facing taxonomy, so adding a candidate status or expense category needs a migration and a release. **Build and CRM already model this correctly** — status as text under a tenant-scoped foreign key, with a transitions table carrying approval and required-field rules. This is propagation of a proven pattern, not a redesign.

| # | Ticket | Blocked by | Status |
|---|---|---|---|
| 01 | The 306 taxonomies are classified | — | done |
| 02 | One module's taxonomy moves to lookup tables | 01 | done |
| 03 | Custom field values are indexed | — | done |
| 04 | HR's table count is frozen and payroll is one folder | — | done |
| 05 | The shared schema file splits by domain | — | done |

## Closed ticket digests

**01 — The 306 taxonomies are classified.** Deliverable is `enum-classification.md` (634 lines). 422 enums scanned (PRD estimated 415; 7 added during the program): 54 classified as tenant-extensible taxonomy, 362 as system state machines, 6 as uncertain. No code changed — documentation only.

**02 — One module's taxonomy moves to lookup tables.** `hr_position_statuses` and `hr_position_transitions` tables added in migrations `0543`/`0544`, mirroring Build's `project_statuses`/`workflow_transitions` shape; existing enum values (`open`, `filled`, `frozen`, `future`) seeded per org before the `DO $$` abort guard runs, and `hr_positions.status` widened to `text`. Transition and approval enforcement lives in `positions-workflow-utils.ts:assertPositionTransitionAllowed`; 14 tests pass in `positions-taxonomy.spec.ts`. The abort guard passed on zero real `hr_positions` rows — "production-shaped data" verification is still pending and should be run once the table has real data.

**03 — Custom field values are indexed.** `customFieldValues jsonb` column added to `hr_employments` in migrations `0540`–`0542`; `0541` backfills from the sidecar with a `DO $$` abort guard, `0542` creates a GIN containment index (`jsonb_path_ops`). Filter endpoint `GET /hr/custom-fields/:entityType/filter` uses `@>` containment plus `NOT (custom_field_values ? key)` for absent-field queries; 16 unit tests including explicit absent-vs-null distinction in `__tests__/hr-custom-fields.service.spec.ts`. The definition registry (`customFieldDefinitions` table) is unchanged.

**04 — HR's table count is frozen and payroll is one folder.** Two rules added to `backend/CLAUDE.md §1`: no new HR table without removing one; new HR state routes onto existing lifecycle columns or the custom-field engine. Six HR payroll schema files moved from `db/schema/hr/` into `db/schema/payroll/` as renames in commit `1c99a2e6`; 16 import sites rewritten; `tsc --noEmit`, `nest build`, and `madge --circular` all clean. An accounting cross-file import (`db/schema/accounting/finance-expenses.ts` line 5) was updated as a necessary build fix; recorded in `architecture-refactor/OPEN-FINDINGS.md`.

**05 — The shared schema file splits by domain.** `db/schema/common/shared.ts` split into eight domain files: `notifications.ts`, `broadcasts.ts`, `push-subscriptions.ts`, `calendar-events.ts`, `webhooks.ts`, `subscriptions.ts`, `audit-logs.ts`, `ai-usage.ts`; only nine direct importers required repointing. `pnpm check:cycles` over 3,930 files: zero cycles; `nest build` exits 0. Also adds the missing `chk_audit_logs_tenant_or_platform` constraint to the Drizzle `auditLogs` definition — migration `0479` had created it but the ORM declaration never matched.

## Working these

Work the frontier — any ticket whose blockers are all done. A ticket marked `—` under **Blocked by** can start immediately.

Every ticket is a vertical slice: it cuts a narrow but complete path through schema, API, UI and tests, and is verifiable on its own. None is a layer.

Acceptance criteria are the contract. The **Todo** list is a suggested route and may be ignored if a better one exists — the criteria may not.
