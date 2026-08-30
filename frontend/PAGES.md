# PAGES.md — StreamlineOS Frontend Route Catalog

**What this file is:** A complete audit index of every page route in `frontend/app/`. Each row is one `page.tsx` file. It exists so the §3 workflow ("go" = next unchecked page) has a durable, ordered queue and so any contributor can confirm a route's module, primary hooks, and §8 Definition-of-Done status at a glance.

**How to use it:**
- `- [ ]` = not yet audited for this cycle. `- [x]` = audited; mark done after Audit → Plan → Confirm → Edit.
- §8 DoD columns: **L**ist · **C**reate · **E**dit · **D**elete · **F**ilters · **P**agination · **Perm** · **States** (loading/error/empty/denied). `✓` confirmed present, `✗` confirmed missing, `?` not yet verified.
- Hooks column shows the primary TanStack Query hooks seen in the `page.tsx` or its direct feature import. Routes that delegate entirely to a feature component show `→ feature/`.
- **Never delete a row** — mark it `[x]` and append `[RETIRED path]` if a route is removed.

**Generated:** 2026-08-30. **Total routes: 598.**

---

## Route-Ownership Violations

Violations of the rules in root `CLAUDE.md` §8. Routes are listed as-is; nothing has been moved or deleted.

| Path | Rule Violated |
|---|---|
| `/crm/calendar` | Single unified calendar rule — exactly one calendar lives at `/calendar`; a CRM-specific calendar page is a violation. |
| `/payroll/me` | Employee self-service rule — self-service pay belongs at `/me/pay` (which already exists at `app/(authenticated)/me/pay/page.tsx`). Duplicate self-service surface inside the payroll admin route tree. |
| `/knowledge-base` | Legacy route — canonical knowledge base is at `/knowledge/wiki/**`. This orphan route should be deleted. |
| `(portal)/projects` and `(portal)/projects/[projectId]` | Build module naming rule — the build module route is `/build`; `/projects` is documented as a redirect to `/build`. The client portal group uses `/projects` directly as a path segment instead of `/build`. |

---

## Module Index (count per module)

| Module | Route count |
|---|---|
| Auth | 5 |
| Platform shell (root) | 4 |
| Dashboard / Home | 1 |
| Calendar | 1 |
| Mail | 1 |
| Chat | 3 |
| Notifications | 7 |
| AI / Ask | 2 |
| CRM | 57 |
| Build | 77 |
| HR | 124 |
| Payroll | 24 |
| Accounting | 74 |
| Inventory | 61 |
| Knowledge | 16 |
| Knowledge-base (legacy) | 1 |
| Me (self-service) | 7 |
| Support | 26 |
| Surveys | 6 |
| Workflows | 11 |
| Sign (e-signature) | 8 |
| Timesheets | 9 |
| Directory | 4 |
| Settings | 25 |
| Billing (customer invoices) | 3 |
| Blog | 1 |
| Parties / Subjects | 2 |
| Portal (authenticated) | 2 |
| Portal group (client) | 3 |
| Public | 33 |

---

## Auth `(auth)`

- [ ] `/access-suspended` · **Auth** · hooks: none · §8: States ✓ (access-denied surface)
- [ ] `/invitation/[token]` · **Auth** · hooks: invite token fetch · §8: States ?
- [ ] `/magic-link` · **Auth** · hooks: magic-link verify · §8: States ?
- [ ] `/signin` · **Auth** · hooks: NextAuth · §8: States ✓ (IMMUTABLE reference surface)
- [ ] `/verify-email` · **Auth** · hooks: email verify · §8: States ?

---

## Platform Shell (root group)

- [ ] `/` · **Platform** · hooks: session redirect · §8: not a data page
- [ ] `/access-denied` · **Platform** · hooks: none · §8: States ✓
- [ ] `/employee-onboarding` · **Platform** · hooks: `resolveWizardGate` · §8: States ?
- [ ] `/org-setup` · **Platform** · hooks: `resolveWizardGate` · §8: States ?

---

## Dashboard / Home

- [ ] `/dashboard` · **Home** · hooks: `→ feature/dashboard` · §8: States ?

---

## Calendar

- [ ] `/calendar` · **Platform (universal)** · hooks: `→ feature/calendar` · §8: F ✓ States ? — unified calendar; module event sources are toggleable

---

## Mail

- [ ] `/mail` · **Communications** · hooks: `→ feature/mail` · §8: L ? States ?

---

## Chat

- [ ] `/chat` · **Communications** · hooks: `→ feature/chat` · §8: L ? States ?
- [ ] `/chat/channels` · **Communications** · hooks: `→ feature/chat` · §8: L ? C ? States ?
- [ ] `/chat/invite/[token]` · **Communications** · hooks: channel invite fetch · §8: States ?

---

## Notifications

- [ ] `/notifications` · **Platform** · hooks: `→ feature/notifications` · §8: L ? States ?
- [ ] `/notifications/broadcasts` · **Platform** · hooks: `→ feature/notifications` · §8: L ? C ? States ?
- [ ] `/notifications/events` · **Platform** · hooks: `→ feature/notifications` · §8: L ? States ?
- [ ] `/notifications/policy` · **Platform** · hooks: `→ feature/notifications` · §8: E ? States ?
- [ ] `/notifications/preferences` · **Platform** · hooks: `→ feature/notifications` · §8: E ? States ?
- [ ] `/notifications/providers` · **Platform** · hooks: `→ feature/notifications` · §8: L ? C ? States ?
- [ ] `/notifications/templates` · **Platform** · hooks: `→ feature/notifications` · §8: L ? C ? States ?

---

## AI / Ask

- [ ] `/ask` · **AI** · hooks: `→ feature/ask` · §8: States ?
- [ ] `/ai/executive-brief` · **AI** · hooks: `→ feature/ai` · §8: States ?

---

## CRM

### Hub & overview
- [ ] `/crm` · **CRM** · hooks: `useLeadStats`, `useDealStats`, `useDeals`, `useContacts`, `useWinLossAnalysis`, `useTasks` · §8: States ✓ (loading/error skeletons, error state, hub not a list)

### Leads
- [ ] `/crm/leads` · **CRM** · hooks: `useLeadBoard`, `useLeadStats`, `useLeads`, `useUpdateLeadStatus`, `useCrmOptions` · §8: L ✓ C ✓ E ✓ D ✓ F ✓ P ✓ Perm ✓ States ✓
- [ ] `/crm/leads/[leadId]` · **CRM** · hooks: `→ feature/crm/leads` · §8: E ? D ? Perm ? States ?
- [ ] `/crm/leads/source-report` · **CRM** · hooks: `→ feature/crm/leads` · §8: F ? States ?
- [ ] `/crm/leads/distribute` · **CRM** · hooks: `→ feature/crm/leads` · §8: E ? Perm ? States ?
- [ ] `/crm/leads/duplicates` · **CRM** · hooks: `→ feature/crm/leads` · §8: L ? States ?
- [ ] `/crm/leads/smart-search` · **CRM** · hooks: `→ feature/crm/leads` · §8: F ? States ?

### Contacts & Companies
- [ ] `/crm/contacts` · **CRM** · hooks: `useContacts` · §8: L ? C ? E ? D ? F ? P ? Perm ? States ?
- [ ] `/crm/contacts/[contactId]` · **CRM** · hooks: `→ feature/crm/contacts` · §8: E ? D ? Perm ? States ?
- [ ] `/crm/companies` · **CRM** · hooks: `→ feature/crm/companies` · §8: L ? C ? E ? D ? F ? P ? Perm ? States ?
- [ ] `/crm/companies/[companyId]` · **CRM** · hooks: `→ feature/crm/companies` · §8: E ? D ? Perm ? States ?
- [ ] `/crm/clients` · **CRM** · hooks: `→ feature/crm/clients` · §8: L ? C ? E ? D ? F ? P ? Perm ? States ?
- [ ] `/crm/clients/[clientId]` · **CRM** · hooks: `→ feature/crm/clients` · §8: E ? D ? Perm ? States ?

### Deals
- [ ] `/crm/deals` · **CRM** · hooks: `useDeals`, `useDealStats` · §8: L ? C ? E ? D ? F ? P ? Perm ? States ?
- [ ] `/crm/deals/[dealId]` · **CRM** · hooks: `→ feature/crm/deals` · §8: E ? D ? Perm ? States ?
- [ ] `/crm/deals/forecast` · **CRM** · hooks: `→ feature/crm/deals` · §8: F ? States ?
- [ ] `/crm/deals/win-loss` · **CRM** · hooks: `useWinLossAnalysis` · §8: F ? States ?
- [ ] `/crm/deals/aging` · **CRM** · hooks: `→ feature/crm/deals` · §8: F ? States ?
- [ ] `/crm/deals/approvals` · **CRM** · hooks: `→ feature/crm/deals` · §8: L ? States ?

### Quotes
- [ ] `/crm/quotes` · **CRM** · hooks: `→ feature/crm/quotes` · §8: L ? C ? E ? D ? F ? P ? Perm ? States ?
- [ ] `/crm/quotes/[quoteId]` · **CRM** · hooks: `→ feature/crm/quotes` · §8: E ? D ? Perm ? States ?

### Campaigns
- [ ] `/crm/campaigns` · **CRM** · hooks: `→ feature/crm/campaigns` · §8: L ? C ? E ? D ? F ? P ? Perm ? States ?
- [ ] `/crm/campaigns/[campaignId]` · **CRM** · hooks: `→ feature/crm/campaigns` · §8: E ? D ? Perm ? States ?

### Activities & Tasks
- [ ] `/crm/activities` · **CRM** · hooks: `→ feature/crm/activities` · §8: L ? C ? E ? D ? F ? P ? Perm ? States ?
- [ ] `/crm/tasks` · **CRM** · hooks: `useTasks` · §8: L ? C ? E ? D ? F ? P ? Perm ? States ?

### Reports & Analytics
- [ ] `/crm/reports` · **CRM** · hooks: `→ feature/crm/reports` · §8: F ? States ?
- [ ] `/crm/analytics` · **CRM** · hooks: `→ feature/crm/analytics` · §8: F ? States ?

### Inbox & Issues
- [ ] `/crm/inbox` · **CRM** · hooks: `→ feature/crm/inbox` · §8: L ? States ?
- [ ] `/crm/issues` · **CRM** · hooks: `→ feature/crm/issues` · §8: L ? States ?
- [ ] `/crm/import` · **CRM** · hooks: `→ feature/crm/import` · §8: States ?

### API Keys & Autonomy
- [ ] `/crm/api-keys` · **CRM** · hooks: `→ feature/crm` · §8: L ? C ? D ? Perm ? States ?
- [ ] `/crm/autonomy` · **CRM** · hooks: `→ feature/crm` · §8: States ?

### Calendar (⚠ VIOLATION)
- [ ] `/crm/calendar` · **CRM** · hooks: `→ feature/crm/calendar` · §8: States ? · ⚠ VIOLATION: module-specific calendar; should use `/calendar`

### Access
- [ ] `/crm/access` · **CRM** · hooks: `→ feature/crm` · §8: Perm ? States ?

### Settings
- [ ] `/crm/settings/ai` · **CRM** · hooks: `→ feature/crm/settings` · §8: E ? Perm ? States ?
- [ ] `/crm/settings/assignment-rules` · **CRM** · hooks: `→ feature/crm/settings` · §8: L ? C ? E ? D ? Perm ? States ?
- [ ] `/crm/settings/audit-log` · **CRM** · hooks: `→ feature/crm/settings` · §8: L ? F ? P ? Perm ? States ?
- [ ] `/crm/settings/automations` · **CRM** · hooks: `→ feature/crm/settings` · §8: L ? C ? E ? D ? Perm ? States ?
- [ ] `/crm/settings/automations/new` · **CRM** · hooks: `→ feature/crm/settings` · §8: C ? Perm ? States ?
- [ ] `/crm/settings/automations/[automationId]` · **CRM** · hooks: `→ feature/crm/settings` · §8: E ? D ? Perm ? States ?
- [ ] `/crm/settings/blueprints` · **CRM** · hooks: `→ feature/crm/settings` · §8: L ? C ? E ? Perm ? States ?
- [ ] `/crm/settings/custom-fields` · **CRM** · hooks: `→ feature/crm/settings` · §8: L ? C ? E ? D ? Perm ? States ?
- [ ] `/crm/settings/data-quality` · **CRM** · hooks: `→ feature/crm/settings` · §8: States ?
- [ ] `/crm/settings/email-templates` · **CRM** · hooks: `→ feature/crm/settings` · §8: L ? C ? E ? D ? Perm ? States ?
- [ ] `/crm/settings/import-export` · **CRM** · hooks: `→ feature/crm/settings` · §8: States ?
- [ ] `/crm/settings/layouts` · **CRM** · hooks: `→ feature/crm/settings` · §8: L ? E ? Perm ? States ?
- [ ] `/crm/settings/options` · **CRM** · hooks: `→ feature/crm/settings` · §8: L ? C ? E ? D ? Perm ? States ?
- [ ] `/crm/settings/pipelines` · **CRM** · hooks: `→ feature/crm/settings` · §8: L ? C ? E ? D ? Perm ? States ?
- [ ] `/crm/settings/pricebooks` · **CRM** · hooks: `→ feature/crm/settings` · §8: L ? C ? E ? D ? Perm ? States ?
- [ ] `/crm/settings/products` · **CRM** · hooks: `→ feature/crm/settings` · §8: L ? C ? E ? D ? Perm ? States ?
- [ ] `/crm/settings/quotes` · **CRM** · hooks: `→ feature/crm/settings` · §8: L ? E ? Perm ? States ?
- [ ] `/crm/settings/scoring-rules` · **CRM** · hooks: `→ feature/crm/settings` · §8: L ? C ? E ? D ? Perm ? States ?
- [ ] `/crm/settings/sequences` · **CRM** · hooks: `→ feature/crm/settings` · §8: L ? C ? E ? D ? Perm ? States ?
- [ ] `/crm/settings/sla` · **CRM** · hooks: `→ feature/crm/settings` · §8: L ? C ? E ? D ? Perm ? States ?
- [ ] `/crm/settings/subject-types` · **CRM** · hooks: `→ feature/crm/settings` · §8: L ? C ? E ? D ? Perm ? States ?
- [ ] `/crm/settings/territories` · **CRM** · hooks: `→ feature/crm/settings` · §8: L ? C ? E ? D ? Perm ? States ?
- [ ] `/crm/settings/validation-rules` · **CRM** · hooks: `→ feature/crm/settings` · §8: L ? C ? E ? D ? Perm ? States ?

---

## Build (Project & Product Management)

### Hub & cross-project views
- [ ] `/build` · **Build** · hooks: `enforceRouteAccess`, `→ features/build/project-list` · §8: L ? C ? E ? D ? F ? P ? Perm ✓ States ?
- [ ] `/build/all` · **Build** · hooks: `enforceRouteAccess`, `→ features/build/project-list` · §8: L ? F ? P ? Perm ✓ States ?
- [ ] `/build/all-work` · **Build** · hooks: `→ features/build/all-work` · §8: L ? F ? P ? Perm ? States ?
- [ ] `/build/my-work` · **Build** · hooks: `→ features/build` · §8: L ? States ?
- [ ] `/build/inbox` · **Build** · hooks: `→ features/build` · §8: L ? States ?
- [ ] `/build/drafts` · **Build** · hooks: `→ features/build` · §8: L ? States ?
- [ ] `/build/command-center` · **Build** · hooks: `→ features/build` · §8: States ?
- [ ] `/build/approvals` · **Build** · hooks: `→ features/build` · §8: L ? Perm ? States ?
- [ ] `/build/members` · **Build** · hooks: `→ features/build` · §8: L ? Perm ? States ?
- [ ] `/build/customers` · **Build** · hooks: `→ features/build` · §8: L ? States ?
- [ ] `/build/client-access` · **Build** · hooks: `→ features/build` · §8: Perm ? States ?
- [ ] `/build/access` · **Build** · hooks: `→ features/build` · §8: Perm ? States ?

### PM Workspaces
- [ ] `/build/pm-workspaces` · **Build** · hooks: `→ features/build` · §8: L ? C ? E ? D ? Perm ? States ?
- [ ] `/build/workspaces/[pmWorkspaceId]/all` · **Build** · hooks: `→ features/build` · §8: L ? F ? P ? States ?
- [ ] `/build/workspaces/[pmWorkspaceId]/all-work` · **Build** · hooks: `→ features/build` · §8: L ? F ? P ? States ?
- [ ] `/build/workspaces/[pmWorkspaceId]/my-work` · **Build** · hooks: `→ features/build` · §8: L ? States ?
- [ ] `/build/workspaces/[pmWorkspaceId]/pm-workspaces` · **Build** · hooks: `→ features/build` · §8: L ? States ?
- [ ] `/build/workspaces/[pmWorkspaceId]/[projectId]` · **Build** · hooks: `→ features/build` · §8: L ? F ? P ? States ?
- [ ] `/build/workspaces/[pmWorkspaceId]/[projectId]/epics` · **Build** · hooks: `→ features/build` · §8: L ? C ? E ? D ? F ? P ? States ?
- [ ] `/build/workspaces/[pmWorkspaceId]/[projectId]/my-tickets` · **Build** · hooks: `→ features/build` · §8: L ? States ?
- [ ] `/build/workspaces/[pmWorkspaceId]/[projectId]/views` · **Build** · hooks: `→ features/build` · §8: L ? C ? E ? D ? States ?
- [ ] `/build/workspaces/[pmWorkspaceId]/[projectId]/settings` · **Build** · hooks: `→ features/build` · §8: E ? Perm ? States ?

### Programs, Portfolios, Goals, Roadmap, Teams
- [ ] `/build/programs` · **Build** · hooks: `→ features/build` · §8: L ? C ? E ? D ? Perm ? States ?
- [ ] `/build/portfolios` · **Build** · hooks: `→ features/build` · §8: L ? C ? E ? D ? Perm ? States ?
- [ ] `/build/portfolios/[portfolioId]` · **Build** · hooks: `→ features/build` · §8: E ? D ? Perm ? States ?
- [ ] `/build/goal` · **Build** · hooks: `→ features/build` · §8: L ? C ? E ? D ? Perm ? States ?
- [ ] `/build/goal/[goalId]` · **Build** · hooks: `→ features/build` · §8: E ? D ? Perm ? States ?
- [ ] `/build/roadmap` · **Build** · hooks: `→ features/build` · §8: F ? States ?
- [ ] `/build/teams` · **Build** · hooks: `→ features/build` · §8: L ? C ? E ? D ? Perm ? States ?
- [ ] `/build/teams/[teamId]` · **Build** · hooks: `→ features/build` · §8: E ? D ? Perm ? States ?
- [ ] `/build/templates` · **Build** · hooks: `→ features/build` · §8: L ? C ? E ? D ? States ?

### Managed Products (product management)
- [ ] `/build/managed-products` · **Build** · hooks: `→ features/build` · §8: L ? C ? E ? D ? F ? P ? Perm ? States ?
- [ ] `/build/managed-products/[managedProductId]` · **Build** · hooks: `→ features/build` · §8: E ? D ? Perm ? States ?

### Settings (Build module)
- [ ] `/build/settings/integrations` · **Build** · hooks: `→ features/build/settings` · §8: L ? C ? E ? Perm ? States ?

### Per-project views (`/build/[projectId]/*`)
- [ ] `/build/[projectId]` · **Build** · hooks: `→ features/build/project` · §8: States ?
- [ ] `/build/[projectId]/ai` · **Build** · hooks: `→ features/build/project` · §8: States ?
- [ ] `/build/[projectId]/analytics` · **Build** · hooks: `→ features/build/project` · §8: F ? States ?
- [ ] `/build/[projectId]/approvals` · **Build** · hooks: `→ features/build/project` · §8: L ? Perm ? States ?
- [ ] `/build/[projectId]/automations` · **Build** · hooks: `→ features/build/project` · §8: L ? C ? E ? D ? Perm ? States ?
- [ ] `/build/[projectId]/backlog` · **Build** · hooks: `→ features/build/project` · §8: L ? C ? F ? P ? States ?
- [ ] `/build/[projectId]/budget` · **Build** · hooks: `→ features/build/project` · §8: F ? States ?
- [ ] `/build/[projectId]/bugs` · **Build** · hooks: `→ features/build/project` · §8: L ? C ? E ? D ? F ? P ? States ?
- [ ] `/build/[projectId]/change-requests` · **Build** · hooks: `→ features/build/project` · §8: L ? C ? E ? D ? F ? P ? States ?
- [ ] `/build/[projectId]/chat` · **Build** · hooks: `→ features/build/project` · §8: States ?
- [ ] `/build/[projectId]/client-portal` · **Build** · hooks: `→ features/build/project` · §8: Perm ? States ?
- [ ] `/build/[projectId]/cycles` · **Build** · hooks: `→ features/build/project` · §8: L ? C ? E ? D ? P ? States ?
- [ ] `/build/[projectId]/cycles/[cycleId]` · **Build** · hooks: `→ features/build/project` · §8: E ? D ? States ?
- [ ] `/build/[projectId]/decisions` · **Build** · hooks: `→ features/build/project` · §8: L ? C ? E ? D ? States ?
- [ ] `/build/[projectId]/epics` · **Build** · hooks: `→ features/build/project` · §8: L ? C ? E ? D ? F ? P ? States ?
- [ ] `/build/[projectId]/feedbucket` · **Build** · hooks: `→ features/build/project` · §8: L ? F ? P ? States ?
- [ ] `/build/[projectId]/feedbucket/[submissionId]` · **Build** · hooks: `→ features/build/project` · §8: E ? D ? States ?
- [ ] `/build/[projectId]/forms` · **Build** · hooks: `→ features/build/project` · §8: L ? C ? E ? D ? States ?
- [ ] `/build/[projectId]/forms/[formId]` · **Build** · hooks: `→ features/build/project` · §8: E ? D ? States ?
- [ ] `/build/[projectId]/incidents` · **Build** · hooks: `→ features/build/project` · §8: L ? C ? E ? D ? F ? P ? States ?
- [ ] `/build/[projectId]/incidents/[incidentId]` · **Build** · hooks: `→ features/build/project` · §8: E ? D ? States ?
- [ ] `/build/[projectId]/intake` · **Build** · hooks: `→ features/build/project` · §8: L ? States ?
- [ ] `/build/[projectId]/meetings` · **Build** · hooks: `→ features/build/project` · §8: L ? C ? E ? D ? States ?
- [ ] `/build/[projectId]/meetings/[meetingId]` · **Build** · hooks: `→ features/build/project` · §8: E ? D ? States ?
- [ ] `/build/[projectId]/milestones` · **Build** · hooks: `→ features/build/project` · §8: L ? C ? E ? D ? F ? P ? States ?
- [ ] `/build/[projectId]/modules` · **Build** · hooks: `→ features/build/project` · §8: L ? C ? E ? D ? States ?
- [ ] `/build/[projectId]/my-tickets` · **Build** · hooks: `→ features/build/project` · §8: L ? States ?
- [ ] `/build/[projectId]/qa` · **Build** · hooks: `→ features/build/project` · §8: L ? C ? E ? D ? F ? P ? States ?
- [ ] `/build/[projectId]/qa/runs/[runId]` · **Build** · hooks: `→ features/build/project` · §8: E ? D ? States ?
- [ ] `/build/[projectId]/releases` · **Build** · hooks: `→ features/build/project` · §8: L ? C ? E ? D ? F ? P ? States ?
- [ ] `/build/[projectId]/reports` · **Build** · hooks: `→ features/build/project` · §8: F ? States ?
- [ ] `/build/[projectId]/risks` · **Build** · hooks: `→ features/build/project` · §8: L ? C ? E ? D ? F ? P ? States ?
- [ ] `/build/[projectId]/settings` · **Build** · hooks: `→ features/build/project` · §8: E ? Perm ? States ?
- [ ] `/build/[projectId]/sprints` · **Build** · hooks: `→ features/build/project` · §8: L ? C ? E ? D ? F ? P ? States ?
- [ ] `/build/[projectId]/tickets/[ticketKey]` · **Build** · hooks: `→ features/build/project` · §8: E ? D ? Perm ? States ?
- [ ] `/build/[projectId]/timeline` · **Build** · hooks: `→ features/build/project` · §8: F ? States ?
- [ ] `/build/[projectId]/triage` · **Build** · hooks: `→ features/build/project` · §8: L ? States ?
- [ ] `/build/[projectId]/views` · **Build** · hooks: `→ features/build/project` · §8: L ? C ? E ? D ? States ?
- [ ] `/build/[projectId]/webhooks` · **Build** · hooks: `→ features/build/project` · §8: L ? C ? D ? Perm ? States ?
- [ ] `/build/[projectId]/whiteboard` · **Build** · hooks: `→ features/build/project` · §8: States ?
- [ ] `/build/[projectId]/wiki` · **Build** · hooks: `→ features/build/project` · §8: L ? C ? E ? D ? States ?
- [ ] `/build/[projectId]/wiki/[pageId]` · **Build** · hooks: `→ features/build/project` · §8: E ? D ? States ?
- [ ] `/build/[projectId]/workflow` · **Build** · hooks: `→ features/build/project` · §8: E ? Perm ? States ?

---

## HR (Human Resources)

### Hub
- [ ] `/hr` · **HR** · hooks: `→ features/hr/hub` · §8: States ✓ (hub surface)

### Employees
- [ ] `/hr/employees` · **HR** · hooks: `requirePermission("hr:employees:view")`, `→ features/hr/employees` · §8: L ? C ? E ? D ? F ? P ? Perm ✓ States ?
- [ ] `/hr/employees/[employeeId]` · **HR** · hooks: `→ features/hr/employees` · §8: E ? D ? Perm ? States ?
- [ ] `/hr/employees/find-expert` · **HR** · hooks: `→ features/hr/employees` · §8: F ? States ?
- [ ] `/hr/employees/skills-matrix` · **HR** · hooks: `→ features/hr/employees` · §8: L ? F ? States ?

### Onboarding
- [ ] `/hr/onboarding` · **HR** · hooks: `→ features/hr/onboarding` · §8: L ? C ? E ? D ? F ? P ? Perm ? States ?
- [ ] `/hr/onboarding/[userId]` · **HR** · hooks: `→ features/hr/onboarding` · §8: E ? States ?
- [ ] `/hr/onboarding/my-tasks` · **HR** · hooks: `→ features/hr/onboarding` · §8: L ? States ?
- [ ] `/hr/onboarding/probation` · **HR** · hooks: `→ features/hr/onboarding` · §8: L ? F ? States ?

### Attendance & Time
- [ ] `/hr/attendance` · **HR** · hooks: `→ features/hr/attendance` · §8: L ? F ? P ? Perm ? States ?
- [ ] `/hr/leaves` · **HR** · hooks: `→ features/hr/leaves` · §8: L ? C ? E ? D ? F ? P ? Perm ? States ?
- [ ] `/hr/leaves/analytics` · **HR** · hooks: `→ features/hr/leaves` · §8: F ? States ?
- [ ] `/hr/leave-policies` · **HR** · hooks: `→ features/hr/leaves` · §8: L ? C ? E ? D ? Perm ? States ?
- [ ] `/hr/holidays` · **HR** · hooks: `→ features/hr/holidays` · §8: L ? C ? E ? D ? Perm ? States ?
- [ ] `/hr/work-logs` · **HR** · hooks: `→ features/hr/work-logs` · §8: L ? F ? P ? States ?
- [ ] `/hr/overtime` · **HR** · hooks: `→ features/hr/overtime` · §8: L ? F ? P ? States ?
- [ ] `/hr/shifts` · **HR** · hooks: `→ features/hr/shifts` · §8: L ? C ? E ? D ? Perm ? States ?
- [ ] `/hr/rosters` · **HR** · hooks: `→ features/hr/rosters` · §8: L ? C ? E ? D ? F ? States ?
- [ ] `/hr/comp-off` · **HR** · hooks: `→ features/hr/comp-off` · §8: L ? F ? States ?

### Recruitment
- [ ] `/hr/recruitment` · **HR** · hooks: `→ features/hr/recruitment` · §8: States ?
- [ ] `/hr/recruitment/jobs` · **HR** · hooks: `→ features/hr/recruitment` · §8: L ? C ? E ? D ? F ? P ? Perm ? States ?
- [ ] `/hr/recruitment/jobs/new` · **HR** · hooks: `→ features/hr/recruitment` · §8: C ? Perm ? States ?
- [ ] `/hr/recruitment/jobs/[jobId]/edit` · **HR** · hooks: `→ features/hr/recruitment` · §8: E ? Perm ? States ?
- [ ] `/hr/recruitment/candidates` · **HR** · hooks: `→ features/hr/recruitment` · §8: L ? C ? E ? D ? F ? P ? Perm ? States ?
- [ ] `/hr/recruitment/candidates/[candidateId]` · **HR** · hooks: `→ features/hr/recruitment` · §8: E ? D ? Perm ? States ?
- [ ] `/hr/recruitment/candidates/import` · **HR** · hooks: `→ features/hr/recruitment` · §8: States ?
- [ ] `/hr/recruitment/candidates/intake` · **HR** · hooks: `→ features/hr/recruitment` · §8: C ? States ?
- [ ] `/hr/recruitment/pipeline` · **HR** · hooks: `→ features/hr/recruitment` · §8: L ? F ? States ?
- [ ] `/hr/recruitment/interviews` · **HR** · hooks: `→ features/hr/recruitment` · §8: L ? C ? F ? P ? States ?
- [ ] `/hr/recruitment/offers` · **HR** · hooks: `→ features/hr/recruitment` · §8: L ? C ? E ? D ? F ? P ? States ?
- [ ] `/hr/recruitment/offer-templates` · **HR** · hooks: `→ features/hr/recruitment` · §8: L ? C ? E ? D ? Perm ? States ?
- [ ] `/hr/recruitment/requisitions` · **HR** · hooks: `→ features/hr/recruitment` · §8: L ? C ? E ? D ? F ? P ? States ?
- [ ] `/hr/recruitment/talent-pools` · **HR** · hooks: `→ features/hr/recruitment` · §8: L ? C ? E ? D ? States ?
- [ ] `/hr/recruitment/headcount` · **HR** · hooks: `→ features/hr/recruitment` · §8: F ? States ?
- [ ] `/hr/recruitment/analytics` · **HR** · hooks: `→ features/hr/recruitment` · §8: F ? States ?
- [ ] `/hr/recruitment/diversity-report` · **HR** · hooks: `→ features/hr/recruitment` · §8: F ? States ?
- [ ] `/hr/recruitment/scorecard-analytics` · **HR** · hooks: `→ features/hr/recruitment` · §8: F ? States ?
- [ ] `/hr/recruitment/scorecard-templates` · **HR** · hooks: `→ features/hr/recruitment` · §8: L ? C ? E ? D ? States ?
- [ ] `/hr/recruitment/question-bank` · **HR** · hooks: `→ features/hr/recruitment` · §8: L ? C ? E ? D ? Perm ? States ?
- [ ] `/hr/recruitment/hiring-flows` · **HR** · hooks: `→ features/hr/recruitment` · §8: L ? C ? E ? D ? Perm ? States ?
- [ ] `/hr/recruitment/booking-links` · **HR** · hooks: `→ features/hr/recruitment` · §8: L ? C ? D ? States ?
- [ ] `/hr/recruitment/email-sequences` · **HR** · hooks: `→ features/hr/recruitment` · §8: L ? C ? E ? D ? States ?
- [ ] `/hr/recruitment/automations` · **HR** · hooks: `→ features/hr/recruitment` · §8: L ? C ? E ? D ? Perm ? States ?
- [ ] `/hr/recruitment/recruiters` · **HR** · hooks: `→ features/hr/recruitment` · §8: L ? Perm ? States ?
- [ ] `/hr/recruitment/vendors` · **HR** · hooks: `→ features/hr/recruitment` · §8: L ? C ? E ? D ? States ?
- [ ] `/hr/recruitment/internal-jobs` · **HR** · hooks: `→ features/hr/recruitment` · §8: L ? F ? States ?
- [ ] `/hr/recruitment/referrals` · **HR** · hooks: `→ features/hr/recruitment` · §8: L ? F ? P ? States ?
- [ ] `/hr/recruitment/refer` · **HR** · hooks: `→ features/hr/recruitment` · §8: C ? States ?
- [ ] `/hr/recruitment/sla` · **HR** · hooks: `→ features/hr/recruitment` · §8: L ? C ? E ? D ? Perm ? States ?
- [ ] `/hr/recruitment/sla-report` · **HR** · hooks: `→ features/hr/recruitment` · §8: F ? States ?
- [ ] `/hr/recruitment/interviewer-performance` · **HR** · hooks: `→ features/hr/recruitment` · §8: F ? States ?
- [ ] `/hr/recruitment/inbox` · **HR** · hooks: `→ features/hr/recruitment` · §8: L ? States ?
- [ ] `/hr/recruitment/reports` · **HR** · hooks: `→ features/hr/recruitment` · §8: F ? States ?
- [ ] `/hr/recruitment/settings` · **HR** · hooks: `→ features/hr/recruitment` · §8: E ? Perm ? States ?

### Performance & Engagement
- [ ] `/hr/performance` · **HR** · hooks: `→ features/hr/performance` · §8: L ? F ? P ? Perm ? States ?
- [ ] `/hr/performance/analytics` · **HR** · hooks: `→ features/hr/performance` · §8: F ? States ?
- [ ] `/hr/engagement` · **HR** · hooks: `→ features/hr/engagement` · §8: F ? States ?
- [ ] `/hr/feedback` · **HR** · hooks: `→ features/hr/feedback` · §8: L ? F ? States ?
- [ ] `/hr/goals` · **HR** · hooks: `→ features/hr/goals` · §8: L ? C ? E ? D ? F ? P ? Perm ? States ?
- [ ] `/hr/kpis` · **HR** · hooks: `→ features/hr/kpis` · §8: L ? C ? E ? D ? States ?
- [ ] `/hr/compensation-planning` · **HR** · hooks: `→ features/hr/compensation` · §8: L ? F ? Perm ? States ?
- [ ] `/hr/retention` · **HR** · hooks: `→ features/hr/retention` · §8: F ? States ?

### Expenses & Travel
- [ ] `/hr/expenses` · **HR** · hooks: `→ features/hr/expenses` · §8: L ? C ? E ? D ? F ? P ? Perm ? States ?
- [ ] `/hr/reimbursements` · **HR** · hooks: `→ features/hr/reimbursements` · §8: L ? F ? P ? Perm ? States ?
- [ ] `/hr/travel` · **HR** · hooks: `→ features/hr/travel` · §8: L ? C ? E ? D ? F ? P ? States ?
- [ ] `/hr/travel/approvals` · **HR** · hooks: `→ features/hr/travel` · §8: L ? Perm ? States ?

### Documents & Templates
- [ ] `/hr/documents` · **HR** · hooks: `→ features/hr/documents` · §8: L ? C ? E ? D ? F ? P ? Perm ? States ?
- [ ] `/hr/documents/editor/new` · **HR** · hooks: `→ features/hr/documents` · §8: C ? Perm ? States ?
- [ ] `/hr/documents/editor/[documentId]` · **HR** · hooks: `→ features/hr/documents` · §8: E ? D ? Perm ? States ?
- [ ] `/hr/documents/templates` · **HR** · hooks: `→ features/hr/documents` · §8: L ? C ? E ? D ? Perm ? States ?
- [ ] `/hr/documents/templates/new` · **HR** · hooks: `→ features/hr/documents` · §8: C ? Perm ? States ?
- [ ] `/hr/documents/templates/[templateId]/edit` · **HR** · hooks: `→ features/hr/documents` · §8: E ? Perm ? States ?
- [ ] `/hr/document-types` · **HR** · hooks: `→ features/hr/documents` · §8: L ? C ? E ? D ? Perm ? States ?
- [ ] `/hr/document-review` · **HR** · hooks: `→ features/hr/documents` · §8: L ? Perm ? States ?
- [ ] `/hr/handbook` · **HR** · hooks: `→ features/hr/handbook` · §8: E ? Perm ? States ?

### Org Chart & Structure
- [ ] `/hr/org` · **HR** · hooks: `→ features/hr/org` · §8: States ?
- [ ] `/hr/org-chart` · **HR** · hooks: `→ features/hr/org-chart` · §8: States ?

### Announcements & Communications
- [ ] `/hr/announcements` · **HR** · hooks: `→ features/hr/announcements` · §8: L ? C ? E ? D ? F ? P ? Perm ? States ?
- [ ] `/hr/email-templates` · **HR** · hooks: `→ features/hr/email-templates` · §8: L ? C ? E ? D ? Perm ? States ?

### Assets & Devices
- [ ] `/hr/assets` · **HR** · hooks: `→ features/hr/assets` · §8: L ? C ? E ? D ? F ? P ? Perm ? States ?
- [ ] `/hr/asset-returns` · **HR** · hooks: `→ features/hr/assets` · §8: L ? States ?
- [ ] `/hr/devices` · **HR** · hooks: `→ features/hr/devices` · §8: L ? C ? E ? D ? F ? P ? States ?

### Benefits, Equity, Payroll self-links
- [ ] `/hr/benefits` · **HR** · hooks: `→ features/hr/benefits` · §8: L ? C ? E ? D ? Perm ? States ?
- [ ] `/hr/equity` · **HR** · hooks: `→ features/hr/equity` · §8: L ? F ? Perm ? States ?

### Compliance & Legal
- [ ] `/hr/compliance` · **HR** · hooks: `→ features/hr/compliance` · §8: L ? F ? Perm ? States ?
- [ ] `/hr/legal-holds` · **HR** · hooks: `→ features/hr/legal-holds` · §8: L ? C ? E ? D ? Perm ? States ?
- [ ] `/hr/labor-relations` · **HR** · hooks: `→ features/hr/labor-relations` · §8: States ?
- [ ] `/hr/safety` · **HR** · hooks: `→ features/hr/safety` · §8: L ? F ? States ?
- [ ] `/hr/background-verification` · **HR** · hooks: `→ features/hr/bg-verification` · §8: L ? F ? P ? Perm ? States ?
- [ ] `/hr/identity` · **HR** · hooks: `→ features/hr/identity` · §8: L ? Perm ? States ?
- [ ] `/hr/accommodations` · **HR** · hooks: `→ features/hr/accommodations` · §8: L ? F ? States ?

### Offboarding & Exit
- [ ] `/hr/exit` · **HR** · hooks: `→ features/hr/exit` · §8: L ? C ? E ? D ? F ? P ? Perm ? States ?
- [ ] `/hr/termination` · **HR** · hooks: `→ features/hr/termination` · §8: L ? Perm ? States ?
- [ ] `/hr/fnf` · **HR** · hooks: `→ features/hr/fnf` · §8: L ? F ? Perm ? States ?

### Positions, Workforce, Delegations
- [ ] `/hr/positions` · **HR** · hooks: `→ features/hr/positions` · §8: L ? C ? E ? D ? Perm ? States ?
- [ ] `/hr/workforce` · **HR** · hooks: `→ features/hr/workforce` · §8: L ? F ? P ? Perm ? States ?
- [ ] `/hr/workforce-cost` · **HR** · hooks: `→ features/hr/workforce` · §8: F ? States ?
- [ ] `/hr/contingent` · **HR** · hooks: `→ features/hr/contingent` · §8: L ? C ? E ? D ? F ? P ? States ?
- [ ] `/hr/delegations` · **HR** · hooks: `→ features/hr/delegations` · §8: L ? C ? D ? Perm ? States ?

### HR Analytics, Helpdesk, Cases
- [ ] `/hr/analytics` · **HR** · hooks: `→ features/hr/analytics` · §8: F ? States ?
- [ ] `/hr/helpdesk` · **HR** · hooks: `→ features/hr/helpdesk` · §8: L ? F ? P ? States ?
- [ ] `/hr/cases` · **HR** · hooks: `→ features/hr/cases` · §8: L ? C ? F ? P ? Perm ? States ?
- [ ] `/hr/service-delivery` · **HR** · hooks: `→ features/hr/service-delivery` · §8: States ?

### Misc HR
- [ ] `/hr/approvals` · **HR** · hooks: `→ features/hr/approvals` · §8: L ? Perm ? States ?
- [ ] `/hr/biometric` · **HR** · hooks: `→ features/hr/biometric` · §8: States ?
- [ ] `/hr/geofencing` · **HR** · hooks: `→ features/hr/geofencing` · §8: States ?
- [ ] `/hr/emergency` · **HR** · hooks: `→ features/hr/emergency` · §8: States ?
- [ ] `/hr/event-stream` · **HR** · hooks: `→ features/hr/event-stream` · §8: L ? F ? States ?
- [ ] `/hr/simulator` · **HR** · hooks: `→ features/hr/simulator` · §8: States ?

### HR Settings
- [ ] `/hr/settings` · **HR** · hooks: `→ features/hr/settings` · §8: E ? Perm ? States ?
- [ ] `/hr/settings/automations` · **HR** · hooks: `→ features/hr/settings` · §8: L ? C ? E ? D ? Perm ? States ?
- [ ] `/hr/settings/company` · **HR** · hooks: `→ features/hr/settings` · §8: E ? Perm ? States ?
- [ ] `/hr/settings/custom-fields` · **HR** · hooks: `→ features/hr/settings` · §8: L ? C ? E ? D ? Perm ? States ?
- [ ] `/hr/settings/forms` · **HR** · hooks: `→ features/hr/settings` · §8: L ? C ? E ? D ? Perm ? States ?
- [ ] `/hr/settings/forms/[formId]` · **HR** · hooks: `→ features/hr/settings` · §8: E ? D ? Perm ? States ?
- [ ] `/hr/settings/forms/[formId]/submissions` · **HR** · hooks: `→ features/hr/settings` · §8: L ? F ? P ? States ?
- [ ] `/hr/settings/import-export` · **HR** · hooks: `→ features/hr/settings` · §8: States ?
- [ ] `/hr/settings/integrations` · **HR** · hooks: `→ features/hr/settings` · §8: L ? C ? E ? Perm ? States ?
- [ ] `/hr/settings/policies` · **HR** · hooks: `→ features/hr/settings` · §8: L ? C ? E ? D ? Perm ? States ?
- [ ] `/hr/settings/preview` · **HR** · hooks: `→ features/hr/settings` · §8: States ?
- [ ] `/hr/settings/templates` · **HR** · hooks: `→ features/hr/settings` · §8: L ? C ? E ? D ? Perm ? States ?
- [ ] `/hr/settings/versions` · **HR** · hooks: `→ features/hr/settings` · §8: L ? F ? States ?
- [ ] `/hr/settings/workflows` · **HR** · hooks: `→ features/hr/settings` · §8: L ? C ? E ? D ? Perm ? States ?

### Access
- [ ] `/hr/access` · **HR** · hooks: `→ features/hr` · §8: Perm ? States ?

---

## Payroll

### Hub
- [ ] `/payroll` · **Payroll** · hooks: `useCommandCenter`, `useCreateRun`, `useCan("payroll:runs:view")`, `useCan("payroll:runs:manage")` · §8: States ✓ (loading/empty/error/denied all present)

### Core payroll operations
- [ ] `/payroll/runs` · **Payroll** · hooks: `→ features/payroll/runs` · §8: L ? C ? F ? P ? Perm ? States ?
- [ ] `/payroll/runs/[runId]` · **Payroll** · hooks: `→ features/payroll/runs` · §8: E ? D ? Perm ? States ?
- [ ] `/payroll/employees` · **Payroll** · hooks: `→ features/payroll/employees` · §8: L ? F ? P ? Perm ? States ?
- [ ] `/payroll/employees/[employeeUserId]` · **Payroll** · hooks: `→ features/payroll/employees` · §8: E ? Perm ? States ?
- [ ] `/payroll/workers/[workerId]` · **Payroll** · hooks: `→ features/payroll/workers` · §8: E ? Perm ? States ?
- [ ] `/payroll/payslips` · **Payroll** · hooks: `→ features/payroll/payslips` · §8: L ? F ? P ? Perm ? States ?
- [ ] `/payroll/bank-transfers` · **Payroll** · hooks: `→ features/payroll/bank-transfers` · §8: L ? F ? P ? Perm ? States ?
- [ ] `/payroll/inputs` · **Payroll** · hooks: `→ features/payroll/inputs` · §8: L ? C ? E ? D ? F ? P ? Perm ? States ?
- [ ] `/payroll/bonuses` · **Payroll** · hooks: `→ features/payroll/bonuses` · §8: L ? C ? E ? D ? F ? P ? Perm ? States ?
- [ ] `/payroll/loans` · **Payroll** · hooks: `→ features/payroll/loans` · §8: L ? C ? E ? D ? F ? P ? Perm ? States ?
- [ ] `/payroll/reimbursements` · **Payroll** · hooks: `→ features/payroll/reimbursements` · §8: L ? F ? P ? Perm ? States ?
- [ ] `/payroll/fnf` · **Payroll** · hooks: `→ features/payroll/fnf` · §8: L ? F ? Perm ? States ?
- [ ] `/payroll/taxes` · **Payroll** · hooks: `→ features/payroll/taxes` · §8: L ? F ? Perm ? States ?
- [ ] `/payroll/team` · **Payroll** · hooks: `→ features/payroll/team` · §8: L ? F ? States ?

### Configuration
- [ ] `/payroll/salary-structures` · **Payroll** · hooks: `→ features/payroll` · §8: L ? C ? E ? D ? Perm ? States ?
- [ ] `/payroll/components` · **Payroll** · hooks: `→ features/payroll` · §8: L ? C ? E ? D ? Perm ? States ?
- [ ] `/payroll/templates` · **Payroll** · hooks: `→ features/payroll` · §8: L ? C ? E ? D ? Perm ? States ?

### Reports & Setup
- [ ] `/payroll/reports` · **Payroll** · hooks: `→ features/payroll/reports` · §8: F ? States ?
- [ ] `/payroll/setup` · **Payroll** · hooks: `→ features/payroll/setup` · §8: E ? Perm ? States ?

### Settings
- [ ] `/payroll/settings` · **Payroll** · hooks: `→ features/payroll/settings` · §8: E ? Perm ? States ?
- [ ] `/payroll/settings/import-export` · **Payroll** · hooks: `→ features/payroll/settings` · §8: States ?

### Self-service (⚠ VIOLATION)
- [ ] `/payroll/me` · **Payroll** · hooks: `→ features/payroll/me` · §8: States ? · ⚠ VIOLATION: self-service pay belongs at `/me/pay` (already exists); this duplicates it inside the payroll admin route tree

### Access
- [ ] `/payroll/access` · **Payroll** · hooks: `→ features/payroll` · §8: Perm ? States ?

---

## Accounting

### Hub
- [ ] `/accounting` · **Accounting** · hooks: `→ features/accounting/overview` · §8: States ?

### Invoices & Receivables
- [ ] `/accounting/invoices` · **Accounting** · hooks: `useInvoices`, `useInvoiceStats`, `useVoidInvoice`, `useCan("accounting:receivables:manage")` · §8: L ✓ C ✓ E ✓ D ✓ F ✓ P ✓ Perm ✓ States ✓
- [ ] `/accounting/invoices/[invoiceId]` · **Accounting** · hooks: `→ features/accounting/sales` · §8: E ? D ? Perm ? States ?
- [ ] `/accounting/recurring-invoices` · **Accounting** · hooks: `→ features/accounting` · §8: L ? C ? E ? D ? F ? P ? Perm ? States ?
- [ ] `/accounting/payments-received` · **Accounting** · hooks: `→ features/accounting` · §8: L ? F ? P ? Perm ? States ?
- [ ] `/accounting/credit-notes` · **Accounting** · hooks: `→ features/accounting` · §8: L ? C ? E ? D ? F ? P ? States ?
- [ ] `/accounting/customers/[clientId]` · **Accounting** · hooks: `→ features/accounting` · §8: E ? D ? States ?
- [ ] `/accounting/customers` · **Accounting** · hooks: `→ features/accounting` · §8: L ? C ? E ? D ? F ? P ? States ?
- [ ] `/accounting/payment-reminders` · **Accounting** · hooks: `→ features/accounting` · §8: L ? C ? E ? D ? Perm ? States ?
- [ ] `/accounting/aged-receivables` · **Accounting** · hooks: `→ features/accounting` · §8: F ? States ?

### Purchase & Payables
- [ ] `/accounting/purchase-bills` · **Accounting** · hooks: `→ features/accounting/purchase-bills` · §8: L ? C ? E ? D ? F ? P ? Perm ? States ?
- [ ] `/accounting/purchase-bills/new` · **Accounting** · hooks: `→ features/accounting/purchase-bills` · §8: C ? Perm ? States ?
- [ ] `/accounting/purchase-bills/[billId]` · **Accounting** · hooks: `→ features/accounting/purchase-bills` · §8: E ? D ? Perm ? States ?
- [ ] `/accounting/vendor-payments` · **Accounting** · hooks: `→ features/accounting` · §8: L ? C ? F ? P ? Perm ? States ?
- [ ] `/accounting/vendor-credits` · **Accounting** · hooks: `→ features/accounting` · §8: L ? C ? E ? D ? F ? P ? States ?
- [ ] `/accounting/vendors/[vendorId]` · **Accounting** · hooks: `→ features/accounting` · §8: E ? D ? States ?
- [ ] `/accounting/vendors` · **Accounting** · hooks: `→ features/accounting` · §8: L ? C ? E ? D ? F ? P ? States ?
- [ ] `/accounting/recurring-bills` · **Accounting** · hooks: `→ features/accounting` · §8: L ? C ? E ? D ? F ? P ? States ?
- [ ] `/accounting/aged-payables` · **Accounting** · hooks: `→ features/accounting` · §8: F ? States ?

### Chart of Accounts & Journal
- [ ] `/accounting/coa` · **Accounting** · hooks: `→ features/accounting/coa` · §8: L ? C ? E ? D ? F ? P ? Perm ? States ?
- [ ] `/accounting/coa/[accountId]` · **Accounting** · hooks: `→ features/accounting/coa` · §8: E ? D ? Perm ? States ?
- [ ] `/accounting/journal` · **Accounting** · hooks: `→ features/accounting/journal` · §8: L ? C ? E ? D ? F ? P ? Perm ? States ?
- [ ] `/accounting/journal/new` · **Accounting** · hooks: `→ features/accounting/journal` · §8: C ? Perm ? States ?
- [ ] `/accounting/journal/[entryId]` · **Accounting** · hooks: `→ features/accounting/journal` · §8: E ? D ? Perm ? States ?
- [ ] `/accounting/general-ledger` · **Accounting** · hooks: `→ features/accounting` · §8: L ? F ? P ? Perm ? States ?
- [ ] `/accounting/opening-balances` · **Accounting** · hooks: `→ features/accounting` · §8: E ? Perm ? States ?
- [ ] `/accounting/dimensions` · **Accounting** · hooks: `→ features/accounting` · §8: L ? C ? E ? D ? Perm ? States ?

### Banking
- [ ] `/accounting/banking` · **Accounting** · hooks: `→ features/accounting/banking` · §8: L ? C ? E ? D ? F ? P ? Perm ? States ?
- [ ] `/accounting/banking/[bankAccountId]` · **Accounting** · hooks: `→ features/accounting/banking` · §8: E ? D ? Perm ? States ?
- [ ] `/accounting/banking/import` · **Accounting** · hooks: `→ features/accounting/banking` · §8: C ? States ?
- [ ] `/accounting/banking/reconciliation` · **Accounting** · hooks: `→ features/accounting/banking` · §8: L ? F ? States ?
- [ ] `/accounting/banking/transfers` · **Accounting** · hooks: `→ features/accounting/banking` · §8: L ? C ? E ? D ? F ? P ? States ?

### Payments, Runs & Approvals
- [ ] `/accounting/payment-runs` · **Accounting** · hooks: `→ features/accounting` · §8: L ? C ? F ? P ? Perm ? States ?
- [ ] `/accounting/payment-runs/[runId]` · **Accounting** · hooks: `→ features/accounting` · §8: E ? D ? Perm ? States ?
- [ ] `/accounting/approvals` · **Accounting** · hooks: `→ features/accounting` · §8: L ? Perm ? States ?

### Taxes
- [ ] `/accounting/taxes` · **Accounting** · hooks: `→ features/accounting/taxes` · §8: L ? C ? E ? D ? Perm ? States ?
- [ ] `/accounting/taxes/codes` · **Accounting** · hooks: `→ features/accounting/taxes` · §8: L ? C ? E ? D ? Perm ? States ?
- [ ] `/accounting/taxes/payments` · **Accounting** · hooks: `→ features/accounting/taxes` · §8: L ? F ? P ? States ?
- [ ] `/accounting/taxes/reports` · **Accounting** · hooks: `→ features/accounting/taxes` · §8: F ? States ?
- [ ] `/accounting/gstr-1` · **Accounting** · hooks: `→ features/accounting/taxes` · §8: F ? States ?
- [ ] `/accounting/gstr-3b` · **Accounting** · hooks: `→ features/accounting/taxes` · §8: F ? States ?

### Financial Reports
- [ ] `/accounting/profit-loss` · **Accounting** · hooks: `→ features/accounting/reports` · §8: F ? States ?
- [ ] `/accounting/balance-sheet` · **Accounting** · hooks: `→ features/accounting/reports` · §8: F ? States ?
- [ ] `/accounting/trial-balance` · **Accounting** · hooks: `→ features/accounting/reports` · §8: F ? States ?
- [ ] `/accounting/cash-flow` · **Accounting** · hooks: `→ features/accounting/reports` · §8: F ? States ?
- [ ] `/accounting/forecast` · **Accounting** · hooks: `→ features/accounting/reports` · §8: F ? States ?
- [ ] `/accounting/scenarios` · **Accounting** · hooks: `→ features/accounting/scenarios` · §8: L ? C ? E ? D ? States ?
- [ ] `/accounting/period-close` · **Accounting** · hooks: `→ features/accounting` · §8: Perm ? States ?

### Assets
- [ ] `/accounting/assets` · **Accounting** · hooks: `→ features/accounting/assets` · §8: L ? C ? E ? D ? F ? P ? Perm ? States ?
- [ ] `/accounting/assets/[assetId]` · **Accounting** · hooks: `→ features/accounting/assets` · §8: E ? D ? Perm ? States ?
- [ ] `/accounting/assets/depreciation` · **Accounting** · hooks: `→ features/accounting/assets` · §8: F ? States ?

### Budgets
- [ ] `/accounting/budgets` · **Accounting** · hooks: `→ features/accounting/budgets` · §8: L ? C ? E ? D ? F ? P ? Perm ? States ?
- [ ] `/accounting/budgets/[budgetId]` · **Accounting** · hooks: `→ features/accounting/budgets` · §8: E ? D ? Perm ? States ?

### Expenses
- [ ] `/accounting/expenses` · **Accounting** · hooks: `→ features/accounting/expenses` · §8: L ? F ? P ? Perm ? States ?
- [ ] `/accounting/expenses/policies` · **Accounting** · hooks: `→ features/accounting/expenses` · §8: L ? C ? E ? D ? Perm ? States ?
- [ ] `/accounting/expenses/receipts` · **Accounting** · hooks: `→ features/accounting/expenses` · §8: L ? F ? P ? States ?
- [ ] `/accounting/expenses/reimbursements` · **Accounting** · hooks: `→ features/accounting/expenses` · §8: L ? F ? P ? Perm ? States ?
- [ ] `/accounting/expenses/reimbursements/[batchId]` · **Accounting** · hooks: `→ features/accounting/expenses` · §8: E ? States ?

### Sub-reports
- [ ] `/accounting/reports` · **Accounting** · hooks: `→ features/accounting/reports` · §8: States ?
- [ ] `/accounting/reports/burn-rate` · **Accounting** · hooks: `→ features/accounting/reports` · §8: F ? States ?
- [ ] `/accounting/reports/customer-statement` · **Accounting** · hooks: `→ features/accounting/reports` · §8: F ? States ?
- [ ] `/accounting/reports/department-profitability` · **Accounting** · hooks: `→ features/accounting/reports` · §8: F ? States ?
- [ ] `/accounting/reports/expense-by-category` · **Accounting** · hooks: `→ features/accounting/reports` · §8: F ? States ?
- [ ] `/accounting/reports/project-profitability` · **Accounting** · hooks: `→ features/accounting/reports` · §8: F ? States ?
- [ ] `/accounting/reports/sales-by-customer` · **Accounting** · hooks: `→ features/accounting/reports` · §8: F ? States ?
- [ ] `/accounting/reports/sales-by-item` · **Accounting** · hooks: `→ features/accounting/reports` · §8: F ? States ?
- [ ] `/accounting/reports/tax-summary` · **Accounting** · hooks: `→ features/accounting/reports` · §8: F ? States ?
- [ ] `/accounting/reports/vendor-statement` · **Accounting** · hooks: `→ features/accounting/reports` · §8: F ? States ?
- [ ] `/accounting/reports/working-capital` · **Accounting** · hooks: `→ features/accounting/reports` · §8: F ? States ?

### Settings
- [ ] `/accounting/settings` · **Accounting** · hooks: `→ features/accounting/settings` · §8: E ? Perm ? States ?
- [ ] `/accounting/settings/automations` · **Accounting** · hooks: `→ features/accounting/settings` · §8: L ? C ? E ? D ? Perm ? States ?
- [ ] `/accounting/settings/payment-providers` · **Accounting** · hooks: `→ features/accounting/settings` · §8: L ? C ? E ? Perm ? States ?
- [ ] `/accounting/setup` · **Accounting** · hooks: `→ features/accounting/setup` · §8: E ? Perm ? States ?
- [ ] `/accounting/access` · **Accounting** · hooks: `→ features/accounting` · §8: Perm ? States ?

---

## Inventory

### Hub
- [ ] `/inventory` · **Inventory** · hooks: `→ features/inventory/inventory-dashboard-client` · §8: States ?

### Products
- [ ] `/inventory/products` · **Inventory** · hooks: `useProducts`, `useCategories`, `useArchiveProduct`, `useRestoreProduct`, `useDeleteProduct`, `useCan("inventory:products:create/update/delete")` · §8: L ✓ C ✓ E ✓ D ✓ F ✓ P ✓ Perm ✓ States ✓
- [ ] `/inventory/products/new` · **Inventory** · hooks: `→ features/inventory/products` · §8: C ? Perm ? States ?
- [ ] `/inventory/products/[productId]` · **Inventory** · hooks: `→ features/inventory/products` · §8: E ? D ? Perm ? States ?
- [ ] `/inventory/products/categories` · **Inventory** · hooks: `→ features/inventory/products` · §8: L ? C ? E ? D ? Perm ? States ?
- [ ] `/inventory/products/uom` · **Inventory** · hooks: `→ features/inventory/products` · §8: L ? C ? E ? D ? Perm ? States ?

### Stock Management
- [ ] `/inventory/stock` · **Inventory** · hooks: `→ features/inventory/stock` · §8: L ? F ? P ? States ?
- [ ] `/inventory/stock/adjustments` · **Inventory** · hooks: `→ features/inventory/stock` · §8: L ? C ? F ? P ? Perm ? States ?
- [ ] `/inventory/stock/movements` · **Inventory** · hooks: `→ features/inventory/stock` · §8: L ? F ? P ? States ?
- [ ] `/inventory/stock/transfers` · **Inventory** · hooks: `→ features/inventory/stock` · §8: L ? C ? E ? D ? F ? P ? Perm ? States ?
- [ ] `/inventory/stock/transfers/[transferId]` · **Inventory** · hooks: `→ features/inventory/stock` · §8: E ? D ? States ?

### Lots & Serials
- [ ] `/inventory/lots` · **Inventory** · hooks: `→ features/inventory/lots` · §8: L ? C ? F ? P ? States ?
- [ ] `/inventory/lots/[lotId]` · **Inventory** · hooks: `→ features/inventory/lots` · §8: E ? D ? States ?
- [ ] `/inventory/serials` · **Inventory** · hooks: `→ features/inventory/serials` · §8: L ? F ? P ? States ?
- [ ] `/inventory/serials/[serialId]` · **Inventory** · hooks: `→ features/inventory/serials` · §8: E ? D ? States ?

### Purchase & Sales Orders
- [ ] `/inventory/purchase-orders` · **Inventory** · hooks: `→ features/inventory/purchase-orders` · §8: L ? C ? E ? D ? F ? P ? Perm ? States ?
- [ ] `/inventory/purchase-orders/new` · **Inventory** · hooks: `→ features/inventory/purchase-orders` · §8: C ? Perm ? States ?
- [ ] `/inventory/purchase-orders/[poId]` · **Inventory** · hooks: `→ features/inventory/purchase-orders` · §8: E ? D ? Perm ? States ?
- [ ] `/inventory/sales-orders` · **Inventory** · hooks: `→ features/inventory/sales-orders` · §8: L ? C ? E ? D ? F ? P ? Perm ? States ?
- [ ] `/inventory/sales-orders/new` · **Inventory** · hooks: `→ features/inventory/sales-orders` · §8: C ? Perm ? States ?
- [ ] `/inventory/sales-orders/[soId]` · **Inventory** · hooks: `→ features/inventory/sales-orders` · §8: E ? D ? Perm ? States ?

### Warehouse Operations
- [ ] `/inventory/warehouses` · **Inventory** · hooks: `→ features/inventory/warehouses` · §8: L ? C ? E ? D ? Perm ? States ?
- [ ] `/inventory/warehouses/[warehouseId]` · **Inventory** · hooks: `→ features/inventory/warehouses` · §8: E ? D ? Perm ? States ?
- [ ] `/inventory/operations` · **Inventory** · hooks: `→ features/inventory/operations` · §8: L ? F ? States ?
- [ ] `/inventory/operations/receipts` · **Inventory** · hooks: `→ features/inventory/operations` · §8: L ? F ? P ? States ?
- [ ] `/inventory/operations/picking` · **Inventory** · hooks: `→ features/inventory/operations` · §8: L ? F ? P ? States ?
- [ ] `/inventory/operations/packing` · **Inventory** · hooks: `→ features/inventory/operations` · §8: L ? F ? P ? States ?
- [ ] `/inventory/operations/shipping` · **Inventory** · hooks: `→ features/inventory/operations` · §8: L ? F ? P ? States ?
- [ ] `/inventory/operations/returns` · **Inventory** · hooks: `→ features/inventory/operations` · §8: L ? F ? P ? States ?
- [ ] `/inventory/operations/issues` · **Inventory** · hooks: `→ features/inventory/operations` · §8: L ? F ? P ? States ?
- [ ] `/inventory/shipments` · **Inventory** · hooks: `→ features/inventory/shipments` · §8: L ? F ? P ? States ?
- [ ] `/inventory/loads` · **Inventory** · hooks: `→ features/inventory/loads` · §8: L ? F ? P ? States ?
- [ ] `/inventory/packages` · **Inventory** · hooks: `→ features/inventory/packages` · §8: L ? F ? P ? States ?
- [ ] `/inventory/carriers` · **Inventory** · hooks: `→ features/inventory/carriers` · §8: L ? C ? E ? D ? Perm ? States ?

### Suppliers & 3PL
- [ ] `/inventory/vendors` · **Inventory** · hooks: `→ features/inventory/vendors` · §8: L ? C ? E ? D ? F ? P ? Perm ? States ?
- [ ] `/inventory/vendors/[vendorId]` · **Inventory** · hooks: `→ features/inventory/vendors` · §8: E ? D ? Perm ? States ?
- [ ] `/inventory/3pl` · **Inventory** · hooks: `→ features/inventory` · §8: States ?
- [ ] `/inventory/channels` · **Inventory** · hooks: `→ features/inventory` · §8: L ? C ? E ? D ? Perm ? States ?

### Quality
- [ ] `/inventory/quality` · **Inventory** · hooks: `→ features/inventory/quality` · §8: States ?
- [ ] `/inventory/quality/inspections` · **Inventory** · hooks: `→ features/inventory/quality` · §8: L ? C ? E ? D ? F ? P ? States ?
- [ ] `/inventory/quality/holds` · **Inventory** · hooks: `→ features/inventory/quality` · §8: L ? F ? P ? States ?
- [ ] `/inventory/quality/recalls` · **Inventory** · hooks: `→ features/inventory/quality` · §8: L ? C ? F ? P ? States ?

### Counting & Audits
- [ ] `/inventory/cycle-counts` · **Inventory** · hooks: `→ features/inventory/cycle-counts` · §8: L ? C ? E ? D ? F ? P ? Perm ? States ?
- [ ] `/inventory/cycle-counts/[countId]` · **Inventory** · hooks: `→ features/inventory/cycle-counts` · §8: E ? D ? States ?
- [ ] `/inventory/physical-audits` · **Inventory** · hooks: `→ features/inventory/physical-audits` · §8: L ? C ? E ? D ? F ? P ? States ?
- [ ] `/inventory/physical-audits/[auditId]` · **Inventory** · hooks: `→ features/inventory/physical-audits` · §8: E ? D ? States ?

### Analytics & Reporting
- [ ] `/inventory/forecasting` · **Inventory** · hooks: `→ features/inventory/forecasting` · §8: F ? States ?
- [ ] `/inventory/replenishment` · **Inventory** · hooks: `→ features/inventory/replenishment` · §8: L ? F ? States ?
- [ ] `/inventory/replenishment/rules` · **Inventory** · hooks: `→ features/inventory/replenishment` · §8: L ? C ? E ? D ? Perm ? States ?
- [ ] `/inventory/reports/stock-summary` · **Inventory** · hooks: `→ features/inventory/reports` · §8: F ? States ?
- [ ] `/inventory/reports/movements` · **Inventory** · hooks: `→ features/inventory/reports` · §8: F ? States ?
- [ ] `/inventory/reports/slow-moving` · **Inventory** · hooks: `→ features/inventory/reports` · §8: F ? States ?
- [ ] `/inventory/reports/reorder` · **Inventory** · hooks: `→ features/inventory/reports` · §8: F ? States ?
- [ ] `/inventory/reports/expiry` · **Inventory** · hooks: `→ features/inventory/reports` · §8: F ? States ?
- [ ] `/inventory/expiry` · **Inventory** · hooks: `→ features/inventory` · §8: L ? F ? P ? States ?
- [ ] `/inventory/valuation` · **Inventory** · hooks: `→ features/inventory/valuation` · §8: F ? States ?
- [ ] `/inventory/costing` · **Inventory** · hooks: `→ features/inventory/costing` · §8: F ? States ?

### Misc
- [ ] `/inventory/barcode` · **Inventory** · hooks: `→ features/inventory` · §8: States ?
- [ ] `/inventory/import` · **Inventory** · hooks: `→ features/inventory` · §8: C ? States ?
- [ ] `/inventory/settings` · **Inventory** · hooks: `→ features/inventory/settings` · §8: E ? Perm ? States ?
- [ ] `/inventory/access` · **Inventory** · hooks: `→ features/inventory` · §8: Perm ? States ?

---

## Knowledge (Wiki / KB)

- [ ] `/knowledge/wiki` · **Knowledge** · hooks: `requireSession`, `RequireModule module="kb"`, `→ features/wiki` · §8: States ?
- [ ] `/knowledge/wiki/spaces` · **Knowledge** · hooks: `→ features/wiki` · §8: L ? C ? E ? D ? Perm ? States ?
- [ ] `/knowledge/wiki/spaces/[spaceId]` · **Knowledge** · hooks: `→ features/wiki` · §8: E ? D ? Perm ? States ?
- [ ] `/knowledge/wiki/pages/[pageId]` · **Knowledge** · hooks: `→ features/wiki` · §8: E ? D ? Perm ? States ?
- [ ] `/knowledge/wiki/pages/[pageId]/history` · **Knowledge** · hooks: `→ features/wiki` · §8: L ? States ?
- [ ] `/knowledge/wiki/recent` · **Knowledge** · hooks: `→ features/wiki` · §8: L ? States ?
- [ ] `/knowledge/wiki/favorites` · **Knowledge** · hooks: `→ features/wiki` · §8: L ? States ?
- [ ] `/knowledge/wiki/private` · **Knowledge** · hooks: `→ features/wiki` · §8: L ? States ?
- [ ] `/knowledge/wiki/shared` · **Knowledge** · hooks: `→ features/wiki` · §8: L ? Perm ? States ?
- [ ] `/knowledge/wiki/templates` · **Knowledge** · hooks: `→ features/wiki` · §8: L ? C ? E ? D ? Perm ? States ?
- [ ] `/knowledge/wiki/trash` · **Knowledge** · hooks: `→ features/wiki` · §8: L ? States ?
- [ ] `/knowledge/wiki/reviews` · **Knowledge** · hooks: `→ features/wiki` · §8: L ? Perm ? States ?
- [ ] `/knowledge/wiki/import` · **Knowledge** · hooks: `→ features/wiki` · §8: C ? States ?
- [ ] `/knowledge/wiki/analytics` · **Knowledge** · hooks: `→ features/wiki` · §8: F ? Perm ? States ?
- [ ] `/knowledge/wiki/settings` · **Knowledge** · hooks: `→ features/wiki` · §8: E ? Perm ? States ?
- [ ] `/knowledge/chat` · **Knowledge** · hooks: `→ features/wiki` · §8: States ?

### Legacy (⚠ VIOLATION)
- [ ] `/knowledge-base` · **Knowledge (legacy)** · hooks: `→ features/wiki or features/knowledge-base` · §8: ? · ⚠ VIOLATION: legacy route; canonical KB is at `/knowledge/wiki/**`; this route should be deleted

---

## Me (Self-service — universal for all active members)

- [ ] `/me/attendance` · **Self-service** · hooks: `→ features/me/attendance` · §8: L ? F ? States ?
- [ ] `/me/documents` · **Self-service** · hooks: `→ features/me/documents` · §8: L ? States ?
- [ ] `/me/expenses` · **Self-service** · hooks: `→ features/me/expenses` · §8: L ? C ? E ? D ? F ? P ? States ?
- [ ] `/me/onboarding` · **Self-service** · hooks: `→ features/me/onboarding` · §8: States ?
- [ ] `/me/pay` · **Self-service** · hooks: `→ features/me/pay` · §8: L ? F ? States ?
- [ ] `/me/recruitment` · **Self-service** · hooks: `→ features/me/recruitment` · §8: L ? States ? — internal job openings only, not the candidate pipeline
- [ ] `/me/time-off` · **Self-service** · hooks: `→ features/me/time-off` · §8: L ? C ? F ? States ?

---

## Support

### Hub & inbox
- [ ] `/support` · **Support** · hooks: `→ features/support` · §8: States ?
- [ ] `/support/inbox` · **Support** · hooks: `→ features/support/inbox` · §8: L ? F ? P ? Perm ? States ?
- [ ] `/support/routing` · **Support** · hooks: `→ features/support/routing` · §8: L ? Perm ? States ?
- [ ] `/support/macros` · **Support** · hooks: `→ features/support/macros` · §8: L ? C ? E ? D ? Perm ? States ?
- [ ] `/support/knowledge-gaps` · **Support** · hooks: `→ features/support` · §8: L ? F ? States ?
- [ ] `/support/ai-report` · **Support** · hooks: `→ features/support` · §8: F ? States ?

### Support KB (internal help content)
- [ ] `/support/kb` · **Support** · hooks: `→ features/support/kb` · §8: L ? C ? E ? D ? F ? P ? Perm ? States ?
- [ ] `/support/kb/[articleId]` · **Support** · hooks: `→ features/support/kb` · §8: E ? D ? Perm ? States ?
- [ ] `/support/kb/research-briefs` · **Support** · hooks: `→ features/support/kb` · §8: L ? C ? E ? D ? Perm ? States ?
- [ ] `/support/kb/research-briefs/[briefId]` · **Support** · hooks: `→ features/support/kb` · §8: E ? D ? Perm ? States ?

### Portal (customer-facing)
- [ ] `/support/portal` · **Support** · hooks: `→ features/support/portal` · §8: L ? F ? P ? States ?
- [ ] `/support/portal/[portalTicketId]` · **Support** · hooks: `→ features/support/portal` · §8: E ? D ? States ?

### Reports
- [ ] `/support/reports` · **Support** · hooks: `→ features/support/reports` · §8: F ? States ?
- [ ] `/support/reports/agent-performance` · **Support** · hooks: `→ features/support/reports` · §8: F ? States ?
- [ ] `/support/reports/automation-performance` · **Support** · hooks: `→ features/support/reports` · §8: F ? States ?
- [ ] `/support/reports/channel-performance` · **Support** · hooks: `→ features/support/reports` · §8: F ? States ?
- [ ] `/support/reports/csat` · **Support** · hooks: `→ features/support/reports` · §8: F ? States ?
- [ ] `/support/reports/queue-performance` · **Support** · hooks: `→ features/support/reports` · §8: F ? States ?

### Settings
- [ ] `/support/settings/agent-routing` · **Support** · hooks: `→ features/support/settings` · §8: E ? Perm ? States ?
- [ ] `/support/settings/audit-log` · **Support** · hooks: `→ features/support/settings` · §8: L ? F ? P ? States ?
- [ ] `/support/settings/automations` · **Support** · hooks: `→ features/support/settings` · §8: L ? C ? E ? D ? Perm ? States ?
- [ ] `/support/settings/business-hours` · **Support** · hooks: `→ features/support/settings` · §8: E ? Perm ? States ?
- [ ] `/support/settings/channels` · **Support** · hooks: `→ features/support/settings` · §8: L ? C ? E ? Perm ? States ?
- [ ] `/support/settings/custom-fields` · **Support** · hooks: `→ features/support/settings` · §8: L ? C ? E ? D ? Perm ? States ?
- [ ] `/support/settings/sla` · **Support** · hooks: `→ features/support/settings` · §8: L ? C ? E ? D ? Perm ? States ?

### Access
- [ ] `/support/access` · **Support** · hooks: `→ features/support` · §8: Perm ? States ?

---

## Surveys

- [ ] `/surveys` · **Surveys** · hooks: `→ features/surveys` · §8: L ? C ? E ? D ? F ? P ? Perm ? States ?
- [ ] `/surveys/new` · **Surveys** · hooks: `→ features/surveys` · §8: C ? Perm ? States ?
- [ ] `/surveys/[surveyId]` · **Surveys** · hooks: `→ features/surveys` · §8: E ? D ? Perm ? States ?
- [ ] `/surveys/[surveyId]/participants` · **Surveys** · hooks: `→ features/surveys` · §8: L ? States ?
- [ ] `/surveys/live/[sessionId]/host` · **Surveys** · hooks: `→ features/surveys` · §8: States ?
- [ ] `/surveys/access` · **Surveys** · hooks: `→ features/surveys` · §8: Perm ? States ?

---

## Workflows

- [ ] `/workflows` · **Workflows** · hooks: `→ features/workflows` · §8: L ? C ? E ? D ? F ? P ? Perm ? States ?
- [ ] `/workflows/[workflowId]` · **Workflows** · hooks: `→ features/workflows` · §8: E ? D ? Perm ? States ?
- [ ] `/workflows/[workflowId]/builder` · **Workflows** · hooks: `→ features/workflows/builder` · §8: E ? Perm ? States ?
- [ ] `/workflows/analytics` · **Workflows** · hooks: `→ features/workflows` · §8: F ? States ?
- [ ] `/workflows/approvals` · **Workflows** · hooks: `→ features/workflows` · §8: L ? Perm ? States ?
- [ ] `/workflows/executions` · **Workflows** · hooks: `→ features/workflows` · §8: L ? F ? P ? States ?
- [ ] `/workflows/scheduler` · **Workflows** · hooks: `→ features/workflows` · §8: L ? C ? E ? D ? Perm ? States ?
- [ ] `/workflows/secrets` · **Workflows** · hooks: `→ features/workflows` · §8: L ? C ? D ? Perm ? States ?
- [ ] `/workflows/templates` · **Workflows** · hooks: `→ features/workflows` · §8: L ? C ? E ? D ? Perm ? States ?
- [ ] `/workflows/variables` · **Workflows** · hooks: `→ features/workflows` · §8: L ? C ? E ? D ? Perm ? States ?
- [ ] `/workflows/access` · **Workflows** · hooks: `→ features/workflows` · §8: Perm ? States ?

---

## Sign (e-signature)

- [ ] `/sign` · **Sign** · hooks: `→ features/sign` · §8: States ?
- [ ] `/sign/envelopes` · **Sign** · hooks: `→ features/sign/envelopes` · §8: L ? C ? E ? D ? F ? P ? Perm ? States ?
- [ ] `/sign/envelopes/[envelopeId]` · **Sign** · hooks: `→ features/sign/envelopes` · §8: E ? D ? Perm ? States ?
- [ ] `/sign/bulk-send` · **Sign** · hooks: `→ features/sign` · §8: C ? Perm ? States ?
- [ ] `/sign/templates` · **Sign** · hooks: `→ features/sign/templates` · §8: L ? C ? E ? D ? Perm ? States ?
- [ ] `/sign/reports` · **Sign** · hooks: `→ features/sign/reports` · §8: F ? States ?
- [ ] `/sign/settings` · **Sign** · hooks: `→ features/sign/settings` · §8: E ? Perm ? States ?
- [ ] `/sign/access` · **Sign** · hooks: `→ features/sign` · §8: Perm ? States ?

---

## Timesheets

- [ ] `/timesheets` · **Timesheets** · hooks: `→ features/timesheets` · §8: L ? C ? F ? P ? Perm ? States ?
- [ ] `/timesheets/approvals` · **Timesheets** · hooks: `→ features/timesheets` · §8: L ? Perm ? States ?
- [ ] `/timesheets/billing` · **Timesheets** · hooks: `→ features/timesheets` · §8: L ? F ? P ? Perm ? States ?
- [ ] `/timesheets/exceptions` · **Timesheets** · hooks: `→ features/timesheets` · §8: L ? F ? States ?
- [ ] `/timesheets/payroll` · **Timesheets** · hooks: `→ features/timesheets` · §8: L ? F ? Perm ? States ?
- [ ] `/timesheets/reports` · **Timesheets** · hooks: `→ features/timesheets/reports` · §8: F ? States ?
- [ ] `/timesheets/settings` · **Timesheets** · hooks: `→ features/timesheets/settings` · §8: E ? Perm ? States ?
- [ ] `/timesheets/team` · **Timesheets** · hooks: `→ features/timesheets` · §8: L ? F ? P ? States ?
- [ ] `/timesheets/access` · **Timesheets** · hooks: `→ features/timesheets` · §8: Perm ? States ?

---

## Directory

- [ ] `/directory` · **Directory** · hooks: `→ features/directory` · §8: L ? F ? P ? States ?
- [ ] `/directory/workers` · **Directory** · hooks: `→ features/directory` · §8: L ? F ? P ? Perm ? States ?
- [ ] `/directory/[personId]` · **Directory** · hooks: `→ features/directory` · §8: E ? D ? Perm ? States ?
- [ ] `/directory/access` · **Directory** · hooks: `→ features/directory` · §8: Perm ? States ?
- [ ] `/directory/settings` · **Directory (Administration view)** · hooks: `→ features/directory/people` · §8: L ? F ? Perm ? States ?
- [ ] `/directory/settings/[personId]` · **Directory (Administration view)** · hooks: `→ features/directory/people` · §8: E ? D ? Perm ? States ?

---

## Settings (Global Administration)

- [ ] `/settings` · **Settings** · hooks: `→ features/settings` · §8: States ?
- [ ] `/settings/users` · **Settings** · hooks: `→ features/settings/users` · §8: L ? C ? E ? D ? F ? P ? Perm ? States ?
- [ ] `/settings/roles` · **Settings** · hooks: `→ features/settings/roles` · §8: L ? C ? E ? D ? Perm ? States ?
- [ ] `/settings/roles/[roleId]` · **Settings** · hooks: `→ features/settings/roles` · §8: E ? D ? Perm ? States ?
- [ ] `/settings/roles/audit` · **Settings** · hooks: `→ features/settings/roles` · §8: L ? F ? P ? Perm ? States ?
- [ ] `/settings/roles/simulate` · **Settings** · hooks: `→ features/settings/roles` · §8: States ?
- [ ] `/settings/modules` · **Settings** · hooks: `→ features/settings/modules` · §8: L ? E ? Perm ? States ?
- [ ] `/settings/organization` · **Settings** · hooks: `→ features/settings/organization` · §8: E ? Perm ? States ?
- [ ] `/settings/organization/branches` · **Settings** · hooks: `→ features/settings/organization` · §8: L ? C ? E ? D ? F ? P ? Perm ? States ?
- [ ] `/settings/organization/business-units` · **Settings** · hooks: `→ features/settings/organization` · §8: L ? C ? E ? D ? Perm ? States ?
- [ ] `/settings/organization/chart` · **Settings** · hooks: `→ features/settings/organization` · §8: States ?
- [ ] `/settings/organization/cost-centers` · **Settings** · hooks: `→ features/settings/organization` · §8: L ? C ? E ? D ? Perm ? States ?
- [ ] `/settings/organization/departments` · **Settings** · hooks: `→ features/settings/organization` · §8: L ? C ? E ? D ? Perm ? States ?
- [ ] `/settings/organization/locations` · **Settings** · hooks: `→ features/settings/organization` · §8: L ? C ? E ? D ? Perm ? States ?
- [ ] `/settings/organization/structure` · **Settings** · hooks: `→ features/settings/organization` · §8: States ?
- [ ] `/settings/organization/teams` · **Settings** · hooks: `→ features/settings/organization` · §8: L ? C ? E ? D ? Perm ? States ?
- [ ] `/settings/billing` · **Settings** · hooks: `→ features/settings/billing` · §8: E ? Perm ? States ? — platform billing page 1 of 2
- [ ] `/settings/billing/ai-credits` · **Settings** · hooks: `→ features/settings/billing` · §8: L ? C ? Perm ? States ? — platform billing page 2 of 2
- [ ] `/settings/api-tokens` · **Settings** · hooks: `→ features/settings/api-tokens` · §8: L ? C ? D ? Perm ? States ?
- [ ] `/settings/webhooks` · **Settings** · hooks: `→ features/settings/webhooks` · §8: L ? C ? D ? Perm ? States ?
- [ ] `/settings/audit-log` · **Settings** · hooks: `→ features/settings/audit-log` · §8: L ? F ? P ? Perm ? States ?
- [ ] `/settings/delegations` · **Settings** · hooks: `→ features/settings/delegations` · §8: L ? C ? D ? Perm ? States ?
- [ ] `/settings/incoming-transfer` · **Settings** · hooks: `→ features/settings/incoming-transfer` · §8: States ?

---

## Billing — Customer Invoicing

> These three routes are the org's own outbound customer invoicing (not platform billing). They are legitimate per root §8: "`/billing/invoices` is the org's own customer invoicing."

- [ ] `/billing/invoices` · **Accounting (customer invoicing)** · hooks: `→ features/billing/invoices` · §8: L ? C ? E ? D ? F ? P ? Perm ? States ?
- [ ] `/billing/invoices/new` · **Accounting (customer invoicing)** · hooks: `→ features/billing/invoices` · §8: C ? Perm ? States ?
- [ ] `/billing/invoices/[invoiceId]` · **Accounting (customer invoicing)** · hooks: `→ features/billing/invoices` · §8: E ? D ? Perm ? States ?

---

## Blog (authenticated admin)

- [ ] `/blog/access` · **Blog** · hooks: `→ features/blog` · §8: Perm ? States ?

---

## Parties & Subjects

- [ ] `/parties` · **Platform** · hooks: `→ features/parties` · §8: L ? F ? P ? States ?
- [ ] `/subjects` · **Platform** · hooks: `→ features/subjects` · §8: L ? F ? P ? States ?

---

## Portal (authenticated — client portal management)

- [ ] `/portal` · **Build (client portal)** · hooks: `→ features/portal` · §8: L ? C ? Perm ? States ?
- [ ] `/portal/[projectId]` · **Build (client portal)** · hooks: `→ features/portal` · §8: E ? D ? Perm ? States ?

---

## Portal Group `(portal)` — external client portal

- [ ] `/accept-invitation` · **Portal (client)** · hooks: `→ features/portal` · §8: States ?
- [ ] `/projects` · **Portal (client)** · hooks: `→ features/portal` · §8: L ? States ? · ⚠ VIOLATION: uses `/projects` path; build module canonical is `/build`
- [ ] `/projects/[projectId]` · **Portal (client)** · hooks: `→ features/portal` · §8: E ? States ? · ⚠ VIOLATION: same as above

---

## Public Group `(public)`

- [ ] `/about` · **Marketing** · hooks: none
- [ ] `/pricing` · **Marketing** · hooks: none
- [ ] `/contact` · **Marketing** · hooks: none
- [ ] `/waitlist` · **Marketing** · hooks: none
- [ ] `/design-system` · **Dev** · hooks: none — dev-only gallery
- [ ] `/legal/privacy` · **Marketing** · hooks: none
- [ ] `/legal/security` · **Marketing** · hooks: none
- [ ] `/legal/terms` · **Marketing** · hooks: none
- [ ] `/blogs/(site)` · **Marketing** · hooks: `→ features/blog`
- [ ] `/blogs/(site)/[slug]` · **Marketing** · hooks: `→ features/blog`
- [ ] `/blogs/(site)/category/[slug]` · **Marketing** · hooks: `→ features/blog`
- [ ] `/blogs/(site)/tag/[tag]` · **Marketing** · hooks: `→ features/blog`
- [ ] `/careers/[orgSlug]` · **HR (public)** · hooks: `→ features/careers`
- [ ] `/careers/[orgSlug]/jobs/[jobId]/apply` · **HR (public)** · hooks: `→ features/careers`
- [ ] `/application-status/[token]` · **HR (public)** · hooks: `→ features/careers`
- [ ] `/interview-booking/[token]` · **HR (public)** · hooks: `→ features/careers`
- [ ] `/offer/[token]` · **HR (public)** · hooks: `→ features/careers`
- [ ] `/nps/[token]` · **Support (public)** · hooks: `→ features/support`
- [ ] `/ticket-feedback/[token]` · **Support (public)** · hooks: `→ features/support`
- [ ] `/help/[orgId]` · **Support (public KB)** · hooks: `→ features/support/kb`
- [ ] `/help/[orgId]/[slug]` · **Support (public KB)** · hooks: `→ features/support/kb`
- [ ] `/forms/[token]` · **Build/HR (public forms)** · hooks: `→ features/forms`
- [ ] `/intake/[projectId]` · **Build (public intake)** · hooks: `→ features/build/intake`
- [ ] `/board/[shareToken]` · **Build (public board share)** · hooks: `→ features/build/board`
- [ ] `/wiki/[shareToken]` · **Knowledge (public wiki share)** · hooks: `→ features/wiki`
- [ ] `/roadmap/[orgId]` · **Build (public roadmap)** · hooks: `→ features/build/roadmap`
- [ ] `/live/[sessionCode]` · **Surveys (live session)** · hooks: `→ features/surveys/live`
- [ ] `/live-chat/[orgId]` · **Support (live chat widget)** · hooks: `→ features/support/chat`
- [ ] `/vendor-portal/[token]` · **Inventory/Accounting** · hooks: `→ features/vendor-portal`
- [ ] `/sign/[token]` · **Sign (public signing)** · hooks: `→ features/sign`
- [ ] `/s/[token]` · **Platform (short link)** · hooks: redirect
- [ ] `/refer/[orgId]` · **HR (public referral)** · hooks: `→ features/hr/recruitment`
- [ ] `/refer/link/[token]` · **HR (public referral)** · hooks: `→ features/hr/recruitment`
