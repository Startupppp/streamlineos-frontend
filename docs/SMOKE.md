# Production smoke checklist

Run after every refactor PR is merged and deployed. Target: ≤10 minutes. If any item fails, revert the PR's merge commit immediately.

Use the production URL. Sign in as a CEO/admin account unless otherwise noted.

## Auth & shell
- [ ] `/login` — sign in with valid credentials; reach `/dashboard` without redirect loop.
- [ ] Sidebar renders; user menu shows correct name/role; sign out works.

## CRM
- [ ] `/crm/leads` — list loads, filters work, can open one lead detail.
- [ ] Create a new lead via "New Lead" sheet; appears at top of the list.
- [ ] `/crm/clients` — list loads; status filter chips switch correctly; open one client.
- [ ] `/sales` — dashboard loads; no broken charts; date preset toggle works.

## Projects
- [ ] `/projects` — list loads.
- [ ] Open a project → tickets board renders; drag a ticket between columns.
- [ ] Open a ticket detail → activity feed loads; post a comment.

## HR
- [ ] `/hr/employees` — list loads.
- [ ] `/hr/attendance` — punch in/out widget renders for the current user.
- [ ] `/hr/leave` — leave balance and recent requests visible.
- [ ] `/hr/payroll` — payroll preview loads for current month (admin only); no error toast.
- [ ] `/hr/my-payslips` — most recent payslip viewable; PDF download works.
- [ ] `/hr/termination` — list loads; CEO review tab visible for CEO role.

## Settings
- [ ] `/settings/organization` — page loads; all four sections (basic, config, security, billing) render.
- [ ] Edit org name → save → reload → persisted.

## API spot checks (curl or browser devtools)
- [ ] `GET /api/clients?limit=10` returns 200 with paginated data.
- [ ] `GET /api/leads?limit=10` returns 200.
- [ ] `GET /api/projects` returns 200.

## Sentry / error tracking (after Step A1)
- [ ] No new error groups in Sentry within 15 min of deploy.
- [ ] Error rate within ±10% of pre-deploy baseline (24h window).

## Rollback
If any item above fails: `git revert <merge-sha> && git push origin main`. Vercel auto-redeploys from main.
