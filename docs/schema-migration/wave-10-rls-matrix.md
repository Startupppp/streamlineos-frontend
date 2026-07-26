# Wave 10 — RLS ADR + per-tenant-table matrix

> DRAFT — architect sign-off required before ENABLE on any prod table (plan §5).
> Prereq: composite-FK matrix validated (wave-7), integer-org_id defects fixed, tenant tables have UNIQUE(org_id,id).
> RLS is DEFENSE-IN-DEPTH ONLY — app-layer BOLA stays mandatory and is never removed because RLS exists.

## ADR-0010 invariants (non-negotiable)
1. **Roles.** Migration role owns tables + runs DDL (never on app traffic). Runtime role (`streamline_app`) is a NON-owner WITHOUT `BYPASSRLS` (verify `pg_roles.rolbypassrls=false`). Neon pooler = transaction mode.
2. **Transaction-local GUCs**, set AFTER session+membership validation, BEFORE first tenant query, parameterized (never string-interpolated): `set_config('app.organization_id',$1,true)`, `'app.organization_membership_id'`, `'app.audience'` (`internal`|`portal`). No session-level SET. No query outside an explicit txn; connection not returned to pool until commit/rollback.
3. **Fail-closed helpers.** Policies call `rls_org_id()` = `NULLIF(TRIM(current_setting('app.organization_id',true)),'')` and `rls_require_audience(x)` — NULL/empty/malformed context → no rows (never an error).
4. **Both USING + WITH CHECK** on every policy (WITH CHECK closes the cross-tenant INSERT/UPDATE-retarget vector), `AS RESTRICTIVE`.
5. **ENABLE + FORCE ROW LEVEL SECURITY** (FORCE so the owner is also subject).
6. **Dual-audience tables** (portal_memberships, project_client_grants, projects/tickets clientVisible) get audience-split policies; portal WITH CHECK often `false` (read-only).
7. **Workers/outbox/backfills** use the same tenant-transaction wrapper (org_id in payload, revalidate lifecycle, one org per txn, never wildcard).
8. **Pool safety:** transaction-local GUC auto-resets on commit/rollback; test that a reused pooled connection sees NULL after commit.

## Rollout sequence
Phase 0 shadow-observe (deploy helpers + log would-be-NULL) → Phase 1 ENABLE (no FORCE) per group → Phase 2 FORCE per bounded group AFTER composite FKs validated → Phase 3 steady state (new tables ship ENABLE+FORCE; CI policy tests gate deploys). Emergency rollback = migration role DISABLEs the policy group; never grant runtime BYPASSRLS.

## Mandatory negative tests (before FORCE per wave)
Cross-tenant SELECT→0 rows · cross-tenant INSERT→WITH CHECK error · cross-tenant UPDATE→0 rows · missing/empty/malformed GUC→0 rows (fail closed) · pool reuse after commit/rollback→GUC NULL · internal↔portal audience can't cross · worker wrong-tenant→0 rows · runtime role `rolbypassrls=false` · WITH CHECK blocks org_id re-target.

## Pilot table
**`command_fences`** (`idempotency.ts`) — has `organization_id` text FK + `UNIQUE(org_id,audience,key)`; low-traffic; a policy miss fails SAFE (fence re-executes, no leak). Run the full negative suite in staging against the runtime role, complete one rollback drill, then FORCE.

## Rollout groups (~230 tenant tables)
| Wave | Group | ~Tables |
|---|---|---|
| A | Pilot `command_fences` | 1 |
| B | Core tenancy & access (auth.ts, access.ts) | ~15 |
| C | Directory, Workforce, Portal (dual-audience) | ~7 |
| D | Org structure | ~8 |
| E | Product Management (projects/*, pm_*) — portal clientVisible sub-wave | ~25 |
| F | CRM | ~25 |
| G | Support & KB (KB public-help-center needs a permissive public-read policy) | ~25 |
| H | Timesheets, Notifications, Chat | ~15 |
| I | HRMS & Payroll (sensitive PII — highest value; single-HR pilot `payrolls` first) | ~50 |
| J | Inventory, Accounting, Finance, Signos, Surveys | ~40 |
| K | Billing defect tables (AFTER integer→text type fix) | ~8 |
| L | Platform & misc | ~15 |

## Pre-RLS blockers (add `org_id` column / fix type before ENABLE) — deadline 2026-12-01 unless noted
Missing direct `org_id` (backfill from parent): `department_members`, `ticket_label_mappings`, `ticket_watchers`,
`work_item_relations`, `ticket_checklist_items`, `ticket_custom_field_values`, `release_tickets`,
`webhook_deliveries`, `project_members`, `project_template_tickets`, `chat_channel_members`, `chat_messages`.
Type fix integer→text (by 2026-10-01, T7-HOTFIX): `billing_profiles`, `app_installations`, `affiliates`,
`revenue_events`, `referrals`, `org_modules` (varchar36→text — FK done, widen type).
Nullable-org exceptions (system rows) need `(org_id IS NULL OR org_id = rls_org_id())` USING + strict WITH CHECK:
`role_permissions`, `journal_lines`, `notification_events`, `feature_flags`.

## Excluded (global identity/platform — permanent unless a table gains an org column)
`users`, `accounts`, `sessions`, `verification_tokens`, `user_sessions`, `mfa_backup_codes`,
`magic_link_tokens`, `email_otp_codes`, `user_api_tokens`, `devices`, `permissions`, `indian_states`,
`marketplace_apps`, `ai_credit_packs` + enum-only files.

> Release gate: no `FORCE ROW LEVEL SECURITY` on any table not listed here; no listed table FORCE-d until its wave preconditions + negative tests pass.
