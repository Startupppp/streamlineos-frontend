# Wave 7 — Composite-FK release-gate matrix

> Release gate (plan §3). ~214 tenant-scoped tables inventoried across `backend/src/db/schema/**`
> (2026-07-26, full read of every schema file). This is a checklist: no wave-N composite-FK work
> ships until the parent has `UNIQUE(org_id, id)` and the child FK is `(org_id, parent_id)`.

## Counts
| Category | Count |
|---|---|
| (A) Already composite-FK compliant | 11 |
| (B) Needs composite FKs (single-col FK today) | ~205 |
| (C) Global-identity / platform — EXEMPT | 17 |
| **Total tenant-scoped** | **~231** |

## (A) Compliant today (this session)
`organization_people`, `workers` (→people), `worker_engagements` (→workers), `business_parties`,
`party_contacts`/`party_addresses` (→parties), `portal_memberships` (→party_contacts),
`portal_invitations` (→memberships & contacts), `project_client_grants` (3-col →membership + →contact),
`pm_workspaces` + `pm_workspace_memberships` (→workspace). `org_modules` FK widened varchar→text this session.

## (C) Exempt — global identity / platform
`users`, `accounts`, `sessions`, `verification_tokens`, `user_sessions`, `mfa_backup_codes`,
`magic_link_tokens`, `email_otp_codes`, `user_api_tokens`, `devices`, `permissions`, `organizations`
(root anchor), `indian_states`, `marketplace_apps`, `ai_credit_packs`, `assignment_rule_state`,
`task_sequence_steps`. Reason: global user/platform scope, no tenant parent.

## CRITICAL defects (block composite FKs until fixed) — "W7-HOTFIX"
Integer `org_id` vs text `organizations.id` (must migrate type → text, add UNIQUE + FK):
`billing_profiles`, `app_installations`, `affiliates`, `affiliate_commissions`, `referrals`,
`revenue_events` (all `billing.ts`).
Missing FK entirely (`org_id` present, no `.references()`): `crm_sla_breach_log`,
`ticket_comment_reactions`, `project_automations`, `resource_grants` (varchar36).

## Rollout waves (apply parent UNIQUE(org_id,id) before child FKs; per group)
| Wave | Theme | ~Tables |
|---|---|---|
| W7-HOTFIX | billing integer org_id type fixes | 6 |
| W7-A | auth/access/org-scope direct tables | ~20 |
| W7-B | organization hierarchy (units/branches/departments/teams) | 6 |
| W7-C | CRM cluster (leads/contacts/deals/invoices/support/campaigns) | ~45 |
| W7-D | Projects cluster (projects/sprints/tickets/tasks/members/milestones) | ~30 |
| W7-E | HR cluster (all hr/*) | ~55 |
| W7-F | Inventory + Payroll module | ~25 |
| W7-G | KB, Timesheets, Signos, Surveys, Support | ~50 |
| W7-H | Finance, Accounting, AI, Automation, cross-cutting | ~30 |

## Standard per-table pattern (apply in dependency order)
1. Ensure parent has `UNIQUE(org_id, id)` (constraint, not just index — FK targets need a constraint).
2. Ensure types match (child `org_id` text == `organizations.id` text; fix W7-HOTFIX integers first).
3. Audit data (no cross-tenant orphans) before applying in prod.
4. `foreignKey({ columns: [orgId, parentId], foreignColumns: [parent.orgId, parent.id] })`.
5. `NOT VALID` → backfill/validate → `VALIDATE CONSTRAINT` on large tables.

Reference implementation: the 11 compliant tables above (directory/party/portal-access/pm schema files)
use `unique("uniq_..._org_id")` candidate keys + `foreignKey({...})` composite FKs — copy that shape.
