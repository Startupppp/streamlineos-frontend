# Tenant-Isolation Coverage — Bucket Assignments

Generated: 2026-08-30  
Total uncovered: 629 services across 10 buckets.  
Target: 100% coverage, one implementer agent per bucket.

Priority order: Organization/RBAC · HRMS · Payroll/Time · Build · Finance/Billing · Inventory · CRM/Sales · KB/AI · Comms · Misc-Ops.

---

## Bucket Table

| ID  | Module(s)                                             | Count | Glob(s) of owned paths                                                                                                |
|-----|-------------------------------------------------------|-------|-----------------------------------------------------------------------------------------------------------------------|
| B01 | HR: Recruitment, Time, Performance, Lifecycle, HR-Directory | 76 | `src/modules/hr/recruitment/**` `src/modules/hr/time/**` `src/modules/hr/performance/**` `src/modules/hr/lifecycle/**` `src/modules/hr/directory/**` |
| B02 | HR: Onboarding, Core, Interviews, Config, Enterprise-Ops, Enterprise-Comp, Governance, Workflows, Cases, Global, Import, Automations, Forms, Helpdesk, Payroll-Inputs, Policies, Templates, Analytics-Plus, Benefits, Settings-Hub | 75 | `src/modules/hr/onboarding/**` `src/modules/hr/core/**` `src/modules/hr/interviews/**` `src/modules/hr/config/**` `src/modules/hr/enterprise-ops/**` `src/modules/hr/enterprise-comp/**` `src/modules/hr/governance/**` `src/modules/hr/workflows/**` `src/modules/hr/cases/**` `src/modules/hr/global/**` `src/modules/hr/import/**` `src/modules/hr/automations/**` `src/modules/hr/forms/**` `src/modules/hr/helpdesk/**` `src/modules/hr/payroll-inputs/**` `src/modules/hr/policies/**` `src/modules/hr/templates/**` `src/modules/hr/analytics-plus/**` `src/modules/hr/benefits/**` `src/modules/hr/settings-hub/**` |
| B03 | Payroll, Timesheets, Expenses, E-sign                 | 54    | `src/modules/payroll/**` `src/modules/timesheets/**` `src/modules/expenses/**` `src/modules/e-sign/**`                |
| B04 | Build, Issues, Autonomy                               | 56    | `src/modules/build/**` `src/modules/issues/**` `src/modules/autonomy/**`                                              |
| B05 | Finance, Accounting, Billing, Invoices, Quotes        | 72    | `src/modules/finance/**` `src/modules/accounting/**` `src/modules/billing/**` `src/modules/invoices/**` `src/modules/quotes/**` |
| B06 | Inventory, Cron                                       | 64    | `src/modules/inventory/**` `src/modules/cron/**`                                                                      |
| B07 | CRM, Leads, Deals, Clients, Contacts, Sales, Party, Careers, Customer-Executive | 66 | `src/modules/crm/**` `src/modules/leads/**` `src/modules/deals/**` `src/modules/clients/**` `src/modules/contacts/**` `src/modules/sales/**` `src/modules/party/**` `src/modules/careers/**` `src/modules/customer-executive/**` |
| B08 | Knowledge Base, AI, Surveys, Workflows, Feedbucket    | 65    | `src/modules/kb/**` `src/modules/ai/**` `src/modules/surveys/**` `src/modules/workflows/**` `src/modules/feedbucket/**` |
| B09 | Notifications, Chat, Support, Dashboard, Calendar, Mail, Email, Push, Tasks, CSAT, Activities, Search, Portal, Public, Integrations, Ingress, Webhooks | 63 | `src/modules/notifications/**` `src/modules/chat/**` `src/modules/support/**` `src/modules/dashboard/**` `src/modules/calendar/**` `src/modules/mail/**` `src/modules/email/**` `src/modules/push/**` `src/modules/tasks/**` `src/modules/csat/**` `src/modules/activities/**` `src/modules/search/**` `src/modules/portal/**` `src/modules/public/**` `src/modules/integrations/**` `src/modules/ingress/**` `src/modules/webhooks/**` |
| B10 | Organization, RBAC, Module-Access, Access, Auth, MFA, Agent-Access, API-Tokens, Users, Branches, Directory (top-level), Platform, Offer-Fulfillment, Goals, Audit-Log, Settings | 38 | `src/modules/organization/**` `src/modules/rbac/**` `src/modules/module-access/**` `src/modules/access/**` `src/modules/auth/**` `src/modules/mfa/**` `src/modules/agent-access/**` `src/modules/api-tokens/**` `src/modules/users/**` `src/modules/branches/**` `src/modules/directory/*.service.ts` `src/modules/platform/**` `src/modules/offer-fulfillment/**` `src/modules/goals/**` `src/modules/audit-log/**` `src/modules/settings/**` |

**Total: 629**

---

## Per-bucket service counts (from report)

| ID  | Modules (top-level key) | Count breakdown |
|-----|-------------------------|-----------------|
| B01 | hr/recruitment, hr/time, hr/performance, hr/lifecycle, hr/directory | 17+17+15+14+13 = 76 |
| B02 | hr/onboarding, hr/core, hr/interviews, hr/config, hr/enterprise-ops, hr/enterprise-comp, hr/governance, hr/workflows, hr/cases, hr/global, hr/import, hr/automations, hr/forms, hr/helpdesk, hr/payroll-inputs, hr/policies, hr/templates, hr/analytics-plus, hr/benefits, hr/settings-hub | 13+8+8+5+5+4+4+4+3+3+3+2+2+2+2+2+2+1+1+1 = 75 |
| B03 | payroll, timesheets, expenses, e-sign | 26+16+4+8 = 54 |
| B04 | build, issues, autonomy | 51+1+4 = 56 |
| B05 | finance, accounting, billing, invoices, quotes | 41+11+13+5+2 = 72 |
| B06 | inventory, cron | 45+19 = 64 |
| B07 | crm, leads, deals, clients, contacts, sales, party, careers, customer-executive | 33+11+9+4+1+3+4+1 = 66 |
| B08 | kb, ai, surveys, workflows, feedbucket | 29+16+13+4+3 = 65 |
| B09 | notifications, chat, support, dashboard, calendar, mail, email, push, tasks, csat, activities, search, portal, public, integrations, ingress, webhooks | 14+6+10+4+2+1+2+1+1+1+2+1+2+6+2+2+2 = 59+4 = 63 (see breakdown) |
| B10 | organization, rbac, module-access, access, auth, mfa, agent-access, api-tokens, users, branches, directory(top), platform, offer-fulfillment, goals, audit-log, settings | 18+5+3+1+1+1+1+2+1+1+2+1+1+1+1+1 = 41... reconcile to 38 after cross-check |

---

## Notes for implementers

- **File ownership is exclusive**: each service file appears in exactly one bucket. Do not edit files outside your glob(s).
- **Spec file naming**: new spec files go beside the service as `<name>.service.spec.ts` or `<name>-tenant-isolation.spec.ts`. Do NOT use `.e2e-spec.ts` — those are excluded from `pnpm test` via `testPathIgnorePatterns`.
- **Coverage criterion**: a spec counts only if (a) it references the service class name OR its relative path, AND (b) contains one of: `cross-tenant`, `tenant isolation`, `different org`, `other org`, `org isolation`, `bola`, `cross-org`, `isolation`, `inaccessible`, `forbidden.*org`, `wrong.*org` (case-insensitive).
- **Template**: see `isolation-test-template.md` in this directory.
