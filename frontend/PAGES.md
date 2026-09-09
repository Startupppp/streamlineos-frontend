# PAGES.md — StreamlineOS Frontend Route Catalog

**What this file is:** A complete audit index of every page route in `frontend/app/`. Each row is one `page.tsx` file. It exists so the §3 workflow ("go" = next unchecked page) has a durable, ordered queue and so any contributor can confirm a route's module, primary hooks, and §8 Definition-of-Done status at a glance.

**How to use it:**

Build/PM verification (2026-09-09): repaired infinite-board edit/drag cache updates, mutation-owned field rollback, project analytics/report invalidation, ticket/detail/sprint/dashboard refresh, and cursor-based older activity with retry. Ticket list contracts match the lightweight backend projection and preserve assignee/label identities. The initial focused run passed **23 suites / 134 tests**; the subsequent review fixes passed **13 suites / 71 tests**, including overlapping edits and preserving newly loaded pages, and frontend source typecheck passed. Earlier Madge processed 5,934 files with zero cycles (20 resolution warnings). Evidence: `.artifacts/build-pm-2026-09-09-frontend-final-results.json` and the Build certification document. This does not certify production latency, browser Web Vitals or responsive layouts.

Five-area verification (2026-09-09): the focused organization/RBAC, Settings, module-access, billing and payments frontend run passed **52 suites / 474 tests**. Query-scope validation passed across 5,933 files; route-access validation checked 205 navigation permission keys against 633 contract permissions; the permission catalog remained current at 704 keys. Madge processed 5,929 files with zero circular dependencies (20 resolution warnings). Raw logs are in `.artifacts/five-areas-2026-09-09/frontend-agent/`. These checks do not certify individual page layouts or production infrastructure.

Focused shared-shell verification (2026-09-05): Ask OS now loads its full runtime on first opening and preserves state after minimizing; Inbox no longer preloads its closed notification drawer on mount. The two focused suites pass 6 tests and frontend source typecheck passes. This does not mark individual page audits or measured browser performance complete.

- `- [ ]` = not yet audited for this cycle. `- [x]` = audited; mark done after Audit → Plan → Confirm → Edit.
- §8 DoD columns: **L**ist · **C**reate · **E**dit · **D**elete · **F**ilters · **P**agination · **Perm** · **States** (loading/error/empty/denied). `✓` confirmed present, `✗` confirmed missing, `?` not yet verified.
- Hooks column shows the primary TanStack Query hooks seen in the `page.tsx` or its direct feature import. Routes that delegate entirely to a feature component show `→ feature/`.
- **Never delete a row** — mark it `[x]` and append `[RETIRED path]` if a route is removed.

**Generated:** 2026-08-30. **Total routes: 606.** Last updated: 2026-09-08 (task5/6 additions).

**PAGES2 count reconciliation (2026-08-30):**
- Disk: 598 `page.tsx` files (confirmed via `find … | wc -l`).
- Normalizer strips every parenthesised route-group segment (e.g. `(auth)`, `(authenticated)`, `(portal)`, `(public)`, `(site)`). All 6 sanity-test paths passed.
- 4 blog routes were labelled with `(site)` in the path — corrected to their real URLs below.
- 3 routes existed on disk but were absent from this catalog: `/calendar/settings`, `/chat/moderation`, `/chat/settings` — added below.
- Module-index sum after those additions: 600. Disk: 598. The 2-row gap is a parser artefact (2 rows use non-standard formatting that the script skipped); it is NOT a missing file. The module index is authoritative.

**Count reconciliation (2026-09-08):**
- Disk: 601 `page.tsx` files (measured via Glob tool).
- 6 routes existed on disk but were absent from this catalog: `/hr/dashboard`, `/inbox`, `/workflows/settings/access`, `/workflows/settings/secrets`, `/workflows/settings/variables`, `/blog/admin` — added below.
- 3 catalog rows had no matching `page.tsx` on disk: `/workflows/secrets`, `/workflows/variables`, `/waitlist` — marked `[x] [RETIRED path]`.
- Module-index sum after additions: 606. Disk: 601. Gap of 5 = 3 newly retired rows + the pre-existing 2-row parser artefact.

**Route-module thinness (S11, 2026-09-02).** `pnpm check:route-thinness` now measures what the "thin route module" rule asks for, so it is a number rather than a judgement. It scans all 586 authenticated `page.tsx`/`layout.tsx` files for component state, data fetching, forms, direct `apiClient` calls and files over 300 lines, and ratchets the in-scope count at **118**; a further **67** are CRM/Inventory and are printed under OUT OF SCOPE rather than filtered away. Run it with `--list` for the per-file reasons. Owners of the 118: HR 42, Accounting 33, Support 14, Build 10, Workflows 7, Notifications 6, Surveys 2, Settings 2, Payroll 1, Chat 1. Client route modules remain **260 of 600** against the 304 ceiling.

---

## Route-Ownership Violations

All prior violations resolved on 2026-08-30:

| Path | Resolution |
|---|---|
| `/crm/calendar` | DELETED — module events flow through the unified `/calendar`. |
| `/payroll/me` | DELETED — self-service pay is at `/me/pay`. |
| `/knowledge-base` | DELETED — canonical KB is at `/knowledge/wiki/**`. |
| `(portal)/projects` and `(portal)/projects/[projectId]` | DELETED — external client portal moved to `/client-portal` and `/client-portal/[projectId]`. |

Resolved on 2026-09-02 (S06 — backend API prefixes, not page routes):

| API prefix | Resolution |
|---|---|
| `product-management/workspaces` | RENAMED to `build/workspaces` — §8 puts every Build resource under `/build`. Both frontend callers (`hooks/api/build/pm-workspaces.ts`, the `[pmWorkspaceId]` layout server fetch) and 6 e2e route literals updated; all 9 operations were `internal permissioned`, so no published contract broke. |
| `whiteboards` (hub) | RENAMED to `build/whiteboards`. The project-scoped `build/:projectId/whiteboards` routes were already canonical; only the org-wide hub sat outside the prefix, where any middleware or rate-limit tier keyed on `/build` silently missed it. No frontend caller existed. |

**Open question (blocked — do not change unilaterally):** Root `CLAUDE.md` §8 lists "people directory" as a universal surface but also places workforce at `/directory/workers` as governance. The current code gates `/directory/workers` on `directory:workers:view`. Widening access is the unsafe direction to guess; left as-is pending an explicit product decision.

**Note:** `(authenticated)/portal` (internal, session JWT, `useCan("build:portal:view")`) and `(portal)/client-portal` (external, portal token, `portalApiClient`) are intentionally distinct surfaces — the hook collision was resolved by renaming to `useExternalPortalProjects`.

---

## Module Index (count per module)

| Module | Route count |
|---|---|
| Auth | 5 |
| Platform shell (root) | 4 |
| Dashboard / Home | 1 |
| Calendar | 2 |
| Mail | 2 |
| Chat | 5 |
| Notifications | 7 |
| AI / Ask | 2 |
| CRM | 56 |
| Build | 77 |
| HR | 125 |
| Payroll | 23 |
| Accounting | 74 |
| Inventory | 61 |
| Knowledge | 16 |
| Me (self-service) | 7 |
| Support | 26 |
| Surveys | 6 |
| Workflows | 14 |
| Sign (e-signature) | 8 |
| Timesheets | 9 |
| Directory | 6 |
| Settings | 25 |
| Billing (customer invoices) | 3 |
| Blog | 2 |
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
- [ ] `/employee-onboarding` · **Platform** · hooks: `useOnboardingWizard` · §8: L ✗ C ✗ E ✓ D ✗ F ✗ P ✗ Perm ✓ States ✓ — multi-step wizard; skeleton loading; `ErrorState` for load failure; StrictMode-safe; delegates steps to feature components; no `requiredPermission` (correct, universal)
- [ ] `/org-setup` · **Platform** · hooks: `resolveWizardGate` · §8: States ?

---

## Dashboard / Home

- [ ] `/dashboard` · **Home** · hooks: `→ feature/dashboard` · §8: States ?

---

## Calendar

- [ ] `/calendar` · **Platform (universal)** · hooks: `→ feature/calendar` · §8: F ✓ States ? — unified calendar; module event sources are toggleable
- [ ] `/calendar/settings` · **Platform** · hooks: `enforceRouteAccess("/calendar/settings")` · §8: E ? Perm ✓ States ✓ — placeholder; `PageWrapper` + `EmptyState`; no data loading states needed until UI is implemented

---

## Mail

- [ ] `/mail` · **Communications** · hooks: `→ feature/mail` · §8: L ? States ?
- [ ] `/inbox` · **Communications** · hooks: `→ feature/inbox` · §8: L ? States ?

---

## Chat

- [ ] `/chat` · **Communications** · hooks: `→ feature/chat` · §8: L ? States ?
- [ ] `/chat/channels` · **Communications** · hooks: `→ feature/chat` · §8: L ? C ? States ?
- [ ] `/chat/invite/[token]` · **Communications** · hooks: channel invite fetch · §8: States ?
- [ ] `/chat/moderation` · **Communications** · hooks: `enforceRouteAccess("/chat/moderation")` · §8: L ? Perm ✓ States ✓ — placeholder; `PageWrapper` + `EmptyState`; no data loading until full UI ships
- [ ] `/chat/settings` · **Communications** · hooks: `enforceRouteAccess("/chat/settings")` · §8: E ? Perm ✓ States ✓ — placeholder; `PageWrapper` + `EmptyState`; no data loading until full UI ships

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
- [ ] `/ai/executive-brief` · **AI** · hooks: `lib/api/hooks/executive-brief` → `features/ai/executive-brief-page` · streaming/cancel/failure states covered by `features/ai/executive-brief-streaming.test.tsx`; full page acceptance remains open

---

## CRM

### Hub & overview
- [ ] `/crm` · **CRM** · hooks: `useLeadStats`, `useDealStats`, `useDeals`, `useContacts`, `useWinLossAnalysis`, `useTasks` · §8: States ✓ (loading/error skeletons, error state, hub not a list)

### Leads
- [ ] `/crm/leads` · **CRM** · hooks: `useLeadBoard`, `useLeadStats`, `useLeads`, `useUpdateLeadStatus`, `useCrmOptions` · §8: L ✓ C ✓ E ✓ D ✓ F ✓ P ✓ Perm ✓ States ✓
- [ ] `/crm/leads/[leadId]` · **CRM** · hooks: `→ feature/crm/leads` · §8: E ? D ? Perm ? States ?
- [ ] `/crm/leads/source-report` · **CRM** · hooks: `useLeadSourceReport` · §8: L ✓ C ✗ E ✗ D ✗ F ✓ P ✗ Perm ✗ States ✓ — analytics/report view; no `useCan` gate; all four states present (skeleton loading, `ErrorState`, `EmptyState` inside card, success chart); Framer Motion bar chart
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
- [ ] `/crm/deals/win-loss` · **CRM** · hooks: `useWinLossAnalysis` · §8: L ✓ C ✗ E ✗ D ✗ F ✓ P ✗ Perm ✗ States ✓ — analytics/report view; no `useCan` gate; all four states present (skeleton loading, `ErrorState`, `EmptyState` with `EmptyDealsIllustration`, success view); uses `access` prop on `EmptyState`
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

### Autonomy
- [ ] `/crm/autonomy` · **CRM** · hooks: `→ feature/crm` · §8: States ?

### Calendar
- [x] `/crm/calendar` · **CRM** [RETIRED 2026-08-30: file deleted; module events now flow through the unified `/calendar` per §8 rule]

### Access
- [ ] `/crm/access` · **CRM** · hooks: `→ feature/crm` · §8: Perm ? States ?

### Settings
- [ ] `/crm/settings/api-keys` · **CRM** · hooks: `→ feature/crm/settings` · §8: L ? C ? D ? Perm ? States ?
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
- [x] `/build/[projectId]/sprints` · **Build** · hooks: `useSprints, useUpdateSprint, useUpdateTicket, useSprintTicketMover` · §8: L ✓ C ✓ E ✓ D ✓ F ? P ? States ✓ — S06: three `Promise.all` per-ticket fan-outs replaced by the bounded transactional `POST /build/:projectId/tickets/bulk` (chunked at the backend cap of 100); sprint completion now sends `sprintId: null` so "move to backlog" actually clears the sprint instead of serialising `undefined` to a no-op. 5 tests in `use-sprint-ticket-mover.test.ts`.
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
- [ ] `/hr/dashboard` · **HR** · hooks: `→ features/hr/dashboard` · §8: States ?

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
- [ ] `/payroll/settings/import-export` · **Payroll** · hooks: `requirePermission("payroll:reports:view")` (server) · §8: L ✗ C ✗ E ✗ D ✗ F ✗ P ✗ Perm ✓ States ✓ — server component; Suspense loading fallback; delegates entirely to feature component; import/export only, no CRUD

### Self-service
- [x] `/payroll/me` · **Payroll** [RETIRED 2026-08-30: file deleted; self-service pay is at `/me/pay` (no `requiredPermission`, universal for all active members)]

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
- [ ] `/accounting/purchase-bills` · **Accounting** · hooks: `usePurchaseBills`, `useCreatePurchaseBill`, `useCan("accounting:payables:approve")`, `useCan("accounting:payables:manage")` · §8: L ✓ C ✓ E ✓ D ✓ F ✓ P ✓ Perm ✓ States ✓ — cursor pagination; search + status filters URL-synced; `EmptyState` with `EmptyExpensesIllustration` ✓; minor: empty state action shows "New bill" without checking `canManage`
- [ ] `/accounting/purchase-bills/new` · **Accounting** · hooks: `→ features/accounting/purchase-bills` · §8: C ? Perm ? States ?
- [ ] `/accounting/purchase-bills/[billId]` · **Accounting** · hooks: `→ features/accounting/purchase-bills` · §8: E ? D ? Perm ? States ?
- [ ] `/accounting/vendor-payments` · **Accounting** · hooks: `useVendorPayments`, `useCreateVendorPayment`, `useCan("accounting:payables:manage")` · §8: L ✓ C ✓ E ✗ D ✗ F ✓ P ✓ Perm ✓ States ✓ — dual cursor queries (paid + partial) merged; vendor filter URL-synced; `EmptyState` with `illustrationPreset="tasks"` ✓
- [ ] `/accounting/vendor-credits` · **Accounting** · hooks: `→ features/accounting` · §8: L ? C ? E ? D ? F ? P ? States ?
- [ ] `/accounting/vendors/[vendorId]` · **Accounting** · hooks: `→ features/accounting` · §8: E ? D ? States ?
- [ ] `/accounting/vendors` · **Accounting** · hooks: `→ features/accounting` · §8: L ? C ? E ? D ? F ? P ? States ?
- [ ] `/accounting/recurring-bills` · **Accounting** · hooks: `→ features/accounting` · §8: L ? C ? E ? D ? F ? P ? States ?
- [ ] `/accounting/aged-payables` · **Accounting** · hooks: `→ features/accounting` · §8: F ? States ?

### Chart of Accounts & Journal
- [ ] `/accounting/coa` · **Accounting** · hooks: `→ features/accounting/coa` · §8: L ? C ? E ? D ? F ? P ? Perm ? States ?
- [ ] `/accounting/coa/[accountId]` · **Accounting** · hooks: `useAccount`, `useAccountJournalEntries`, `useCan("accounting:accounts:update")`, `useCan("accounting:journal:manage")` · §8: L ✗ C ✗ E ✓ D ✗ F ✗ P ✗ Perm ✓ States ✓ — detail; Edit via `EditAccountDialog`; journal preview table capped at 20 rows (acceptable for preview); not-found uses bespoke div, not `EmptyState` (minor)
- [ ] `/accounting/journal` · **Accounting** · hooks: `useJournalEntries`, `useCan("accounting:journal:create")` · §8: L ✓ C ✓ E ✗ D ✗ F ✓ P ✓ Perm ✗ States ✓ — cursor pagination (pageSize 25, server mode); filters: date range, source, status, URL-synced; `useCan` gates create button only — no `enabled` view-gate on the list query (403-spam for non-finance roles); `EmptyState` with `EmptyReportIllustration` ✓
- [ ] `/accounting/journal/new` · **Accounting** · hooks: `useChartOfAccounts`, `useCreateJournalEntry`, `useCan("accounting:journal:create")` · §8: L ✗ C ✓ E ✗ D ✗ F ✗ P ✗ Perm ✓ States ✓ — create-only form; gate: `EmptyState illustrationPreset="security"` when `!canCreate`; `LoadingState` while accounts load; `ErrorState` if accounts fail; `LoadingButton` for submit
- [ ] `/accounting/journal/[entryId]` · **Accounting** · hooks: `useJournalEntry`, `usePostJournalEntry`, `useReverseJournalEntry`, `useSubmitJournalApproval`, `useCan("accounting:journal:post")`, `useCan("accounting:journal:approve")` · §8: L ✗ C ✗ E ✓ D ✗ F ✗ P ✗ Perm ✓ States ✓ — detail; post, submit-for-approval, approve, reject, reverse lifecycle; `LoadingState` and `ErrorState` ✓; not-found renders `ErrorState` ✓
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
- [ ] `/accounting/assets/[assetId]` · **Accounting** · hooks: `useAsset`, `useActivateAsset`, `useDisposeAsset`, `useAssetCategories`, `useCan("accounting:assets:update")`, `useCan("accounting:assets:manage")` · §8: L ✗ C ✗ E ✓ D ✓ F ✗ P ✗ Perm ✓ States ✓ — detail page; Edit via `EditAssetSheet` (DRAFT); Dispose via `AlertDialog` + `EntityFormDialog` (ACTIVE); depreciation schedule table is bounded (usefulLifeMonths rows), no pagination needed
- [ ] `/accounting/assets/depreciation` · **Accounting** · hooks: `useDepreciationRuns`, `useCreateDepreciationRun`, `useReverseDepreciationRun`, `useCan("accounting:assets:manage")` · §8: L ✓ C ✓ E ✗ D ✗ F ✗ P ✗ Perm ✓ States ✓ — runs are immutable; reverse ≠ delete; list is bounded by accounting periods; `EmptyState` with `EmptyReportIllustration` ✓

### Budgets
- [ ] `/accounting/budgets` · **Accounting** · hooks: `useBudgets`, `useCreateBudget`, `useCan("accounting:budgets:create")` · §8: L ✓ C ✓ E ✗ D ✗ F ✓ P ✗ Perm ✗ States ✓ — ISSUES: (1) `pageSize: 100` hard-coded, no `pagination` prop on `DataTable` — budgets can grow past 100; (2) no view-gate: query fires unconditionally, 403-spams for non-finance roles; fix: `enabled: useCan("accounting:budgets:view")` on the hook; `EmptyState` with `EmptyReportIllustration` ✓
- [ ] `/accounting/budgets/[budgetId]` · **Accounting** · hooks: `useBudget`, `useSubmitBudget`, `useApproveBudget`, `useDuplicateBudget`, `useCan("accounting:budgets:update")`, `useCan("accounting:budgets:approve")` · §8: L ✗ C ✗ E ✓ D ✗ F ✗ P ✗ Perm ✓ States ✓ — detail; Edit = BudgetMatrix + duplicate; Submit/Approve lifecycle; not-found renders `ErrorState` ✓

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
- [ ] `/accounting/settings` · **Accounting** · hooks: `useAccountingSettings`, `useUpdateAccountingSettings`, `useCan("accounting:settings:manage")` · §8: L ✗ C ✗ E ✓ D ✗ F ✗ P ✗ Perm ✓ States ✗ — company + tax registration forms; ISSUE: loading and error branches return bare `<div>` wrappers, not `PageWrapper` with `LoadingState`/`ErrorState`
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

### Legacy
- [x] `/knowledge-base` · **Knowledge (legacy)** [RETIRED 2026-08-30: file deleted; canonical KB is at `/knowledge/wiki/**`]

---

## Me (Self-service — universal for all active members)

- [ ] `/me/attendance` · **Self-service** · hooks: `requirePermission("self:attendance")` (server), `→ features/me/attendance` · §8: L ? F ? P ? Perm ✗ States ? — VIOLATION: server component uses `requirePermission` with `self:*` key; §8/CLAUDE.md rule: `/me/*` must NEVER carry `requiredPermission` (universal for all active members)
- [ ] `/me/documents` · **Self-service** · hooks: `requirePermission("self:onboarding-docs")` (server), `→ features/me/documents` · §8: L ? P ? Perm ✗ States ? — VIOLATION: `requirePermission` on a `/me/*` route; must be removed
- [ ] `/me/expenses` · **Self-service** · hooks: `requirePermission("self:expenses")` (server), `→ features/me/expenses` · §8: L ? C ? E ? D ? F ? P ? Perm ✗ States ? — VIOLATION: `requirePermission` on a `/me/*` route; must be removed
- [ ] `/me/onboarding` · **Self-service** · hooks: `→ features/me/onboarding` · §8: States ?
- [ ] `/me/pay` · **Self-service** · hooks: `requirePermission(["self:payroll","self:payslips"])` (server), `→ features/me/pay` · §8: L ? F ? Perm ✗ States ? — VIOLATION: `requirePermission` on a `/me/*` route; must be removed
- [ ] `/me/recruitment` · **Self-service** · hooks: `requirePermission("self:recruitment")` (server), `→ features/me/recruitment` · §8: L ? Perm ✗ States ? — VIOLATION: `requirePermission` on a `/me/*` route; must be removed; internal job openings only, not the candidate pipeline
- [ ] `/me/time-off` · **Self-service** · hooks: `requirePermission("self:leaves")` (server), `→ features/me/time-off` · §8: L ? C ? F ? Perm ✗ States ? — VIOLATION: `requirePermission` on a `/me/*` route; must be removed

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

- [ ] `/workflows` · **Workflows** · hooks: `useWorkflows`, `useCreateWorkflow`, `useDeleteWorkflow`, `useWorkflowStats` · §8: L ✓ C ✓ E ✓ D ✓ F ✗ P ✗ Perm ✗ States ✓ — ISSUES: (1) `limit: 50`, no pagination prop on `DataTable`; (2) no `useCan` gate on create button or list query; `EmptyState` with `EmptyProjectsIllustration` ✓; `AlertDialog` confirm on delete ✓
- [ ] `/workflows/[workflowId]` · **Workflows** · hooks: `→ features/workflows` · §8: E ? D ? Perm ? States ?
- [ ] `/workflows/[workflowId]/builder` · **Workflows** · hooks: `→ features/workflows/builder` · §8: E ? Perm ? States ?
- [ ] `/workflows/analytics` · **Workflows** · hooks: `→ features/workflows` · §8: F ? States ?
- [ ] `/workflows/approvals` · **Workflows** · hooks: `→ features/workflows` · §8: L ? Perm ? States ?
- [ ] `/workflows/executions` · **Workflows** · hooks: `→ features/workflows` · §8: L ? F ? P ? States ?
- [ ] `/workflows/scheduler` · **Workflows** · hooks: `→ features/workflows` · §8: L ? C ? E ? D ? Perm ? States ?
- [x] `/workflows/secrets` · **Workflows** [RETIRED path: moved to `/workflows/settings/secrets`]
- [ ] `/workflows/templates` · **Workflows** · hooks: `→ features/workflows` · §8: L ? C ? E ? D ? Perm ? States ?
- [x] `/workflows/variables` · **Workflows** [RETIRED path: moved to `/workflows/settings/variables`]
- [ ] `/workflows/access` · **Workflows** · hooks: `→ features/workflows` · §8: Perm ? States ?

### Settings (Workflows module)
- [ ] `/workflows/settings/access` · **Workflows** · hooks: `→ features/workflows/settings` · §8: Perm ? States ?
- [ ] `/workflows/settings/secrets` · **Workflows** · hooks: `→ features/workflows/settings` · §8: L ? C ? D ? Perm ? States ?
- [ ] `/workflows/settings/variables` · **Workflows** · hooks: `→ features/workflows/settings` · §8: L ? C ? E ? D ? Perm ? States ?

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

- [ ] `/settings` · **Settings** · hooks: `→ features/settings` · §8: States ✓ — S01 (2026-09-02): the sessions panel had loading/empty but no error branch, so a failed `GET /sessions` rendered "No active sessions found" — a false all-clear on a security surface. `ErrorState` + retry added; `revokedCount` typed at the hook instead of two `as` casts.
- [ ] `/settings/users` · **Settings** · hooks: `→ features/settings/users` · §8: L ? C ? E ? D ? F ? P ? Perm ? States ?
- [ ] `/settings/roles` · **Settings** · hooks: `→ features/settings/roles` · §8: L ? C ? E ? D ? Perm ? States ?
- [ ] `/settings/roles/[roleId]` · **Settings** · hooks: `→ features/settings/roles` · §8: E ? D ? Perm ? States ?
- [ ] `/settings/roles/audit` · **Settings** · hooks: `→ features/settings/roles` · §8: L ? F ? P ? Perm ? States ?
- [ ] `/settings/roles/simulate` · **Settings** · hooks: `→ features/settings/roles` · §8: States ?
- [ ] `/settings/modules` · **Settings** · hooks: `→ features/settings/modules` · §8: L ? E ? Perm ? States ?
- [ ] `/settings/organization` · **Settings** · hooks: `→ features/settings/organization` · §8: E ✓ Perm ? States ? — S01 (2026-09-02): `mfaEnforced`, `allowedEmailDomains` and `ipAllowlist` were writable through both `PATCH /organization/settings` and `PATCH /organization/security` with different bounds and cache order; the security route is now the only writer, and the form's list bounds match the backend's 100-entry cap.
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
- [ ] `/settings/delegations` · **Settings** · hooks: `→ features/settings/delegations` · §8: L ? C ✓ D ? Perm ? States ? — S01 (2026-09-02): neither side bounded the delegation window, so a delegation could be granted for a century — a permanent shadow role. Capped at 90 days in `delegation-policy.ts` and mirrored in the form schema.
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
- [ ] `/blog/admin` · **Blog** · hooks: `→ features/blog` · §8: L ? C ? E ? D ? Perm ? States ?

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

> External surface only — portal token auth (`portalApiClient`), no session JWT. Distinct from `(authenticated)/portal` (internal, session JWT, `useCan("build:portal:view")`).

- [ ] `/accept-invitation` · **Portal (client)** · hooks: `useAcceptInvitation`, `setPortalToken` · §8: L ✗ C ✗ E ✗ D ✗ F ✗ P ✗ Perm ✓ States ✓ — invitation acceptance flow; four states: missing token, loading, error (expired vs other), success redirect; StrictMode double-invoke guard via `calledRef`
- [x] `/projects` · **Portal (client)** [RETIRED 2026-08-30: file deleted; moved to `/client-portal`]
- [x] `/projects/[projectId]` · **Portal (client)** [RETIRED 2026-08-30: file deleted; moved to `/client-portal/[projectId]`]
- [ ] `/client-portal` · **Portal (client)** · hooks: `usePortalGuard`, `useExternalPortalProjects` · §8: L ? States ?
- [ ] `/client-portal/[projectId]` · **Portal (client)** · hooks: `usePortalGuard`, `usePortalProjectOverview` · §8: E ? States ?

---

## Public Group `(public)`

- [ ] `/about` · **Marketing** · hooks: none
- [ ] `/pricing` · **Marketing** · hooks: none
- [ ] `/contact` · **Marketing** · hooks: none
- [x] `/waitlist` · **Marketing** [RETIRED path: no page.tsx found on disk]
- [ ] `/design-system` · **Dev** · hooks: none — dev-only gallery
- [ ] `/legal/privacy` · **Marketing** · hooks: none
- [ ] `/legal/security` · **Marketing** · hooks: none
- [ ] `/legal/terms` · **Marketing** · hooks: none
- [ ] `/blogs` · **Marketing** · hooks: `→ features/blog` — disk path: `(public)/blogs/(site)/page.tsx`; `(site)` is a route group, not a URL segment
- [ ] `/blogs/[slug]` · **Marketing** · hooks: `→ features/blog`
- [ ] `/blogs/category/[slug]` · **Marketing** · hooks: `→ features/blog`
- [ ] `/blogs/tag/[tag]` · **Marketing** · hooks: `→ features/blog`
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
