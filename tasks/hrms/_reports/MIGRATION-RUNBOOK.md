# HRMS PeopleOS — Migration & Deployment Runbook

All HRMS backend code is merged and typecheck-green (backend `tsc` 0 errors, frontend 0 errors outside stale `.next` artifacts). The migrations below are **hand-written and NOT yet applied** — they require one TTY session (drizzle `db:push`/`db:migrate` needs an interactive terminal to create enums). Apply in ascending order.

## 1. Apply migrations (single TTY session, in order)

Run from repo root. Each file is idempotent (`CREATE TABLE IF NOT EXISTS`, enum creation guarded by `DO $$ BEGIN … EXCEPTION WHEN duplicate_object THEN NULL; END $$;`), so re-running is safe.

```
pnpm -C backend db:migrate
```

If applying by hand, the ordered set (0222 intentionally absent — admin hub added no table):

| # | File | Adds |
|---|------|------|
| 0201 | hr_core_people_employment | hr_people, hr_employments, profiles, sensitive-fields, effective-dated changes, org catalogs, audit logs (+ backfill from users/org_members) |
| 0202 | hr_policy_engine | hr_policies, scopes, assignments |
| 0203 | hr_workflow_engine | hr_workflow_definitions/steps/instances/actions/delegations |
| 0204 | hr_automation_engine | hr_automation_rules/runs |
| 0205 | hr_template_engine | hr_templates, hr_template_renders |
| 0206 | hr_leave_ledger | hr_leave_ledger (+ opening-balance backfill from leaveBalances) |
| 0207 | hr_attendance_regularizations | hr_attendance_regularizations + attendance.location_verified |
| 0208 | hr_payroll_inputs | periods, snapshots, adjustments |
| 0209 | hr_probation_lifecycle | hr_probation_reviews + alumni_profiles.rehire_eligibility |
| 0210 | hr_perf_succession_skills | calibration, succession, mentorships, role-skill-requirements |
| 0211 | hr_access_requests | hr_access_requests |
| 0212 | hr_engagement_extras | mood, badges, points ledger, polls, communities, campaigns |
| 0213 | hr_cases_safety | hr_cases + notes/docs/disciplinary, hr_safety_incidents, wellness |
| 0214 | hr_benefits | plans, windows, enrollments, dependents, claims, loan_repayments, travel_visit_logs |
| 0215 | hr_helpdesk_calendar | helpdesk cols + routing + comments |
| 0216 | hr_workforce_planning | headcount_plans, hiring_plan_items |
| 0217 | hr_forms | hr_forms, hr_form_submissions |
| 0218 | hr_global_compliance | work_authorizations, compliance_requirements/events, contracts |
| 0219 | hr_import_jobs | import_jobs, import_rows |
| 0220 | hr_webhooks | webhook_subscriptions, webhook_deliveries |
| 0221 | hr_assets_expected_return | assets.expected_return_date |
| 0223 | hr_enterprise_comp | devices, sync logs, mappings, variance/arrears/compliance-tasks, comp cycles/recs/pools, equity grants/vesting/exercises |
| 0224 | hr_governance | legal_holds, retention, proxy_access, positions, reorg, union/agreements/labor_cases |
| 0225 | hr_enterprise_ops | accommodations, emergency, identity provisioning, simulations, event_stream |

## 2. Seed RBAC grants

After migrations, seed the ~40 new `hr:*` permission keys onto existing roles:

```
pnpm -C backend backfill:rbac
```

New permission resources added this program: hr:sensitive, hr:audit, hr:policies, hr:workflows, hr:templates, hr:automations, hr:probation, hr:succession, hr:engagement, hr:cases (+confidential), hr:safety, hr:benefits, hr:forms, hr:workforce, hr:contracts, hr:helpdesk, hr:communications, hr:import, hr:export, hr:legalhold, hr:retention, hr:positions, hr:labor, hr:compensation, hr:equity, hr:accommodations, hr:emergency, hr:identity, hr:eventstream, hr:attendance:regularize, hr:exit (view/create/approve).

## 3. Seed default engine content (per-org, idempotent)

For each org, seed defaults so behavior matches the pre-refactor system (the hardcode refactor moved all rules to these engines):

- `POST /hr/policies/seed-defaults` — leave/attendance/probation/notice defaults reproducing old constants (30-day notice, monthly accrual, etc.)
- `POST /hr/templates/seed-defaults` — offer/appointment/confirmation/experience/relieving/internship letters, onboarding+offboarding checklists, probation review, exit survey, welcome email
- `seedDefaultWorkflows(orgId)` (hr-lifecycle) — default HR→CEO resignation/termination chains
- `POST /hr/global/compliance/seed-country-pack?country=IN` — India holidays + statutory compliance requirements

## 4. Scheduler wiring (external cron → cron endpoints)

Point the scheduler at these (existing pattern — cron controller endpoints hit by an external scheduler):
- `POST /cron/hr-engines-sweep` — daily 01:00 UTC: effective-dated changes, overdue goals, probation-due, reviews-due, enrollment-window close, asset returns-due, compliance events, work-auth/contract expiry, webhook retries
- `POST /cron/hr-engines-sweep/workflow-sla` — every 2h: workflow SLA escalations
- existing: `/cron/auto-checkout`, `/cron/monthly-leave-reset`, `/cron/document-expiry`, `/cron/certification-expiry`

## 5. Post-deploy verification

- `nest build` (prod build from dist) then restart `node dist/main`
- Smoke: create a policy → preview for an employee; submit a leave → workflow inbox; build a payroll-inputs period → lock; anonymous case report stores no reporter.
- Cross-tenant: confirm org A cannot read org B rows (107 engine unit tests already green; run `pnpm -C backend jest`).

## Deferred follow-ups (non-blocking)
- Bind `IdentityService.hasUnverifiedRevokes` into exit-completion gate (cross-module import).
- Dual-write `EventStreamService.appendEvent` from automation emit + audit.
- Emergency broadcast → Notifications module push wiring.
- Webhook `::1` SSRF branch: `new URL()` throws first (still `ok:false`) — cosmetic error-message path.
- `shift_swap` workflow objectType enum addition to enable shift-swap approval routing.
