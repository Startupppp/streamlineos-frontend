# PAGES.md — StreamlineOS Frontend Route Catalog

**What this is:** one row per `page.tsx` under `frontend/app/`. It records what each route is and what it calls. **Total routes: 611.**

**This is an inventory, not a task list.** It carries no checkboxes and no per-route audit state. A row is a fact about a route, never a to-do. Anything written here as `OPEN:` is a known unverified gap, not an assignment — do not infer work from a row.

- **Never delete a row.** When a route is removed, keep its row and append `[RETIRED path]` with the reason, so the path stays searchable and nobody re-creates it.
- Hooks names the primary TanStack Query hooks in the route file or its direct feature import; a route delegating entirely to a feature component shows `→ feature/`.
- Counts and per-module tallies are not maintained here — the rows are the source. Gates (`pnpm check:route-thinness`, `check:route-access-contract`) are authoritative over any number written in prose.

## Standing decisions

**`/directory/workers` — blocked, do not change unilaterally.** Root `CLAUDE.md` §8 calls the people directory universal but places workforce at `/directory/workers` as governance. The code gates it on `directory:workers:view`. Widening access is the unsafe direction to guess; left as-is pending an explicit product decision.

**`portal` vs `client-portal` are deliberately two surfaces.** `(authenticated)/portal` is internal (session JWT, `useCan("build:portal:view")`); `(portal)/client-portal` is external (portal token, `portalApiClient`). The hook collision was resolved by renaming the external one to `useExternalPortalProjects`.

**Sanitised HTML renders only after mount (2026-09-21).** `isomorphic-dompurify` is imported by exactly one module, `lib/sanitize-html.ts`, and that module is reached only through `useSanitizedHtml` / `SanitizedHtml` (a dynamic `import()` in an effect) or an event handler. Its node build constructs a jsdom window at import, and because pnpm nests `jsdom` under it Next cannot externalise it, so webpack bundled all of jsdom into a 5.8 MB server chunk whose `fs.readFileSync(__dirname + "/default-stylesheet.css")` threw ENOENT during SSR — the `Minified React error #419` the 2026-09-21 audit saw on Exit, Performance, Document Templates and Contingent Workforce (reproduced on 10 routes with `next start`). `lib/sanitize-html-import-boundary.test.ts` holds the line; `features/help-centre`'s server-side `sanitize-html` package is a different job (DOM-free, public SSR content) and stays.
**Selected tabs are a tinted surface, never a filled CTA (2026-09-21).** `TabsTrigger`'s active state is `bg-muted text-foreground shadow-sm`; the ink fill is reserved for the page's single primary action, so a selected view cannot be mistaken for a button. The global header's `+` is now a labelled "Create" button whose menu leads with the current product's group (`orderGroupsForProduct`).

**Backend prefixes renamed under `/build` (2026-09-02).** `product-management/workspaces` → `build/workspaces`; the org-wide `whiteboards` hub → `build/whiteboards`. §8 puts every Build resource under `/build`, and a middleware or rate-limit tier keyed on `/build` silently missed the old hub. **`build/workspaces` itself is retired 2026-09-23** — see PM Workspaces below; the `whiteboards` half of this decision is unaffected.

**Every static HRMS route has smoke coverage (2026-09-21).** The list is `lib/hrms-static-routes.ts` — derived from the sidebar navigation model (`NAV_GROUPS` + `HOME_NAV_GROUPS`, `/hr/**` static hrefs, minus `/payroll/**`; Recruitment OS lives under `/recruitment/**`, outside HRMS), never hand-copied, so a new sidebar entry is covered the moment it is added. Two tiers: (1) `lib/hrms-static-routes.test.tsx` runs under jest with no server — per route it asserts the `page.tsx` exists, the route is gated server-side (page-level `require*()` or the HR layout's `enforceRouteAccess` resolving to a registered decision), renders `loading.tsx` and asserts a non-empty `h1`, compares the skeleton's title with the page's declared `PageWrapper` title when both are static, and holds a shrink-only list of skeletons that still announce numbered "Column N" headers; (2) `e2e/hrms-routes.spec.ts` runs under Playwright, one `test` per route, signs in with the minted-cookie fixture, asserts the URL stays on the route (or on the page's declared `redirect()`), that `main` has an `h1` matching the declared title, that "Loading results…" and `aria-busy` content clear within 30s, and that no console error contains "Minified React error" or "Error:". Run tier 1 with `npx jest lib/hrms-static-routes.test.tsx --maxWorkers=2`; tier 2 needs a backend on a local database and the tenant env (`E2E_ORG_ID`, `E2E_USER_ID`, `E2E_USER_EMAIL`, `E2E_SESSION_ID` naming an unrevoked `user_sessions` row of that user, `BACKEND_JWT_SECRET`, `INTERNAL_API_SECRET` and `NEXTAUTH_SECRET` byte-matching the backend's — `POST /auth/session-exchange` verifies the session proof with the backend's `NEXTAUTH_SECRET` and refuses a session it has not registered — plus `NEXT_PUBLIC_API_URL`): `E2E_DEV_BUNDLER=webpack NEXTAUTH_SECRET=… NEXT_PUBLIC_API_URL=http://localhost:<port> E2E_ORG_ID=… E2E_USER_ID=… E2E_USER_EMAIL=… E2E_SESSION_ID=… BACKEND_JWT_SECRET=… INTERNAL_API_SECRET=… pnpm exec playwright test e2e/hrms-routes.spec.ts --project=chromium`; it skips with the missing variable names otherwise. `E2E_DEV_BUNDLER=webpack` is for worktrees whose `node_modules` is a symlink out of the project root, which Turbopack refuses. `/hr/settings/company` is asserted as the redirect it declares, not as a page.

---
## Auth `(auth)`

- `/access-suspended` · **Auth** · hooks: none
- `/invitation/[invitationToken]` · **Auth** · hooks: invite token fetch
- `/magic-link` · **Auth** · hooks: magic-link verify
- `/signin` · **Auth** · hooks: NextAuth
- `/verify-email` · **Auth** · hooks: email verify

---

## Platform Shell (root group)

- `/` · **Platform** · hooks: session redirect
- `/employee-onboarding` · **Platform** · hooks: `useOnboardingWizard` — multi-step wizard; skeleton loading; `ErrorState` for load failure; StrictMode-safe; delegates steps to feature components; no `requiredPermission` (correct, universal)
- `/org-setup` · **Platform** · hooks: `resolveWizardGate`
- `/home` · **Platform** · hooks: none — redirect to `/dashboard`; alias route
- `/access-denied` · **Platform** · hooks: none — server-rendered module/permission denial page; resolves `?required=` + `?reason=` search params into a `DeniedView` with module or permission copy
- `/announcements` · **Platform** · hooks: none — redirect to `/hr/announcements`; alias route
- `/owner` · **Platform (internal)** · hooks: `requireSession` (server) — platform operations hub for internal staff; links to blog admin, owner console, and platform management surfaces; `robots: { index: false }`

---

## Dashboard / Home

- `/dashboard` · **Home** · hooks: `usePageState` + `<PageState>` (stat section), `→ feature/dashboard` — section-scoped so a stats failure no longer hides the widgets below it; hand-rolled error block replaced by the shared one (2026-09-21: the Timesheet widget renders its "No hours logged this week" empty state for a zero-hour week — a new joiner saw a red "Hours Missing" alarm beside an empty My Tasks and read it as an error; a degraded `timesheet` source is still announced as an error)

---

## Calendar

- `/calendar` · **Platform (universal)** · hooks: `→ feature/calendar` — unified calendar; module event sources are toggleable
- `/calendar/settings` · **Platform** · hooks: `enforceRouteAccess("/calendar/settings")` — placeholder; `PageWrapper` + `EmptyState`; no data loading states needed until UI is implemented

---

## Mail

- `/mail` · **Communications** · hooks: `→ feature/mail` — 2026-09-21: `MailHtmlViewer` sanitises through `useSanitizedHtml` with two module-level policies (remote images blocked / allowed) instead of adding and removing a DOMPurify hook per call; the body is empty until the sanitiser has run after mount (`mail-html-viewer.test.tsx` pins it)
- `/inbox` · **Communications** · hooks: `→ feature/inbox`

---

## Chat


- `/chat` · **Communications** · hooks: `→ feature/chat` — OPEN: the denied state is not browser-verified. `/me/access` is fetched server-side and dehydrated, so no browser response can deny an owner session; it needs a fixture member without `chat:*`. Component coverage: `features/chat/__tests__/channel-sidebar-denied.test.tsx`.
- `/chat/channels` · **Communications** · hooks: `→ feature/chat` — OPEN: responsive not visually verified at 375/768/1280; the breakpoint classes exist in source but nobody rendered the page at those widths.
- `/chat/invite/[inviteToken]` · **Communications** · hooks: `useJoinViaInviteLink` — revoked, expired, exhausted and archived-channel all return a byte-identical 404 body, so the route is not an existence oracle. Admission is transactional and idempotent.

---

## Notifications

- `/inbox` · **Platform (universal)** · hooks: `→ feature/inbox` — member notification inbox; replaced the old `/notifications` hub as the canonical user-facing surface
- `/settings/notifications/my-preferences` · **Platform (universal)** · hooks: `→ features/notifications` — per-user channel, category, quiet-hours and digest preferences; no permission required
- `/settings/notifications/templates` · **Platform** · hooks: `→ features/notifications` — gated `notifications:templates:view`
- `/settings/notifications/broadcasts` · **Platform** · hooks: `→ features/notifications` — gated `notifications:broadcasts:view`
- `/settings/notifications/providers` · **Platform** · hooks: `→ features/notifications` — gated `notifications:providers:view`
- `/settings/notifications/events` · **Platform** · hooks: `→ features/notifications` — gated `notifications:events:view`
- `/settings/notifications/policy` · **Platform** · hooks: `→ features/notifications` — gated `notifications:policy:view`
- `/notifications` · [RETIRED — redirects to `/inbox` via `next.config.ts`; kept as compatibility redirect]
- `/notifications/preferences` · [RETIRED — redirects to `/settings/notifications/my-preferences` via `next.config.ts`]
- `/notifications/providers` · [RETIRED — redirects to `/settings/notifications/providers` via `next.config.ts`]
- `/notifications/templates` · [RETIRED — redirects to `/settings/notifications/templates` via `next.config.ts`]
- `/notifications/broadcasts` · [RETIRED — redirects to `/settings/notifications/broadcasts` via `next.config.ts`]
- `/notifications/events` · [RETIRED — redirects to `/settings/notifications/events` via `next.config.ts`]
- `/notifications/policy` · [RETIRED — redirects to `/settings/notifications/policy` via `next.config.ts`]

---

## AI / Ask

- `/ask` · [RETIRED — redirects to `/knowledge/chat` via `next.config.ts`]
- `/ai/executive-brief` · **AI** · hooks: `lib/api/hooks/executive-brief` → `features/ai/executive-brief-page` · streaming/cancel/failure states covered by `features/ai/executive-brief-streaming.test.tsx`; full page acceptance remains open

---

## CRM

### Hub & overview
- `/crm` · **CRM** · hooks: `useLeadStats`, `useDealStats`, `useDeals`, `useContacts`, `useWinLossAnalysis`, `useTasks`

### Leads
- `/crm/leads` · **CRM** · hooks: `useLeadBoard`, `useLeadStats`, `useLeads`, `useUpdateLeadStatus`, `useCrmOptions`
- `/crm/leads/[leadId]` · **CRM** · hooks: `→ feature/crm/leads`
- `/crm/leads/source-report` · **CRM** · hooks: `useLeadSourceReport` — analytics/report view; no `useCan` gate; all four states present (skeleton loading, `ErrorState`, `EmptyState` inside card, success chart); Framer Motion bar chart
- `/crm/leads/distribute` · **CRM** · hooks: `→ feature/crm/leads`
- `/crm/leads/duplicates` · **CRM** · hooks: `→ feature/crm/leads`
- `/crm/leads/smart-search` · **CRM** · hooks: `→ feature/crm/leads`

### Contacts & Companies
- `/crm/contacts` · **CRM** · hooks: `useContacts`
- `/crm/contacts/[contactId]` · **CRM** · hooks: `→ feature/crm/contacts`
- `/crm/companies` · **CRM** · hooks: `→ feature/crm/companies`
- `/crm/companies/[companyId]` · **CRM** · hooks: `→ feature/crm/companies`
- `/crm/clients` · **CRM** · hooks: `→ feature/crm/clients`
- `/crm/clients/[clientId]` · **CRM** · hooks: `→ feature/crm/clients`

### Deals
- `/crm/deals` · **CRM** · hooks: `useDeals`, `useDealStats`
- `/crm/deals/[dealId]` · **CRM** · hooks: `→ feature/crm/deals`
- `/crm/deals/forecast` · **CRM** · hooks: `→ feature/crm/deals`
- `/crm/deals/win-loss` · **CRM** · hooks: `useWinLossAnalysis` — analytics/report view; no `useCan` gate; all four states present (skeleton loading, `ErrorState`, `EmptyState` with `EmptyDealsIllustration`, success view); uses `access` prop on `EmptyState`
- `/crm/deals/aging` · **CRM** · hooks: `→ feature/crm/deals`
- `/crm/deals/approvals` · **CRM** · hooks: `→ feature/crm/deals`

### Quotes
- `/crm/quotes` · **CRM** · hooks: `→ feature/crm/quotes`
- `/crm/quotes/[quoteId]` · **CRM** · hooks: `→ feature/crm/quotes`

### Campaigns
- `/crm/campaigns` · **CRM** · hooks: `→ feature/crm/campaigns`
- `/crm/campaigns/[campaignId]` · **CRM** · hooks: `→ feature/crm/campaigns`
- `/crm/campaigns/attribution` · **CRM** · hooks: `usePageState` + `<PageState>`, `→ features/crm/campaigns` — attribution-by-model report; static segment beside `[campaignId]`, Next routes this first

### Activities & Tasks
- `/crm/activities` · **CRM** · hooks: `→ feature/crm/activities`
- `/crm/tasks` · **CRM** · hooks: `useTasks`

### Reports & Analytics
- `/crm/reports` · **CRM** · hooks: `→ feature/crm/reports`
- `/crm/reports/activity` · **CRM** · hooks: `→ features/crm/reports/activity` — activity report; gated by `RequireModule module="crm"`
- `/crm/reports/builder` · **CRM** · hooks: `→ features/crm/reports/builder` — custom report builder; gated by `RequireModule module="crm"`
- `/crm/analytics` · **CRM** · hooks: `→ feature/crm/analytics`

### Inbox & Issues
- `/crm/inbox` · **CRM** · hooks: `→ feature/crm/inbox`
- `/crm/issues` · **CRM** · hooks: `→ feature/crm/issues`
- `/crm/import` · **CRM** · hooks: `→ feature/crm/import`

### Revenue & Lifecycle
- `/crm/commissions` · **CRM** · hooks: `usePageState`, `→ features/crm/commissions` — commission tracking; `useOrgDisplay` for period
- `/crm/health` · **CRM** · hooks: `→ features/crm/lifecycle`
- `/crm/renewals` · **CRM** · hooks: `→ features/crm/lifecycle`
- `/crm/segments` · **CRM** · hooks: `→ features/crm/segments` — gated by `RequireModule module="crm"`

### Call Intelligence
- `/crm/intelligence` · **CRM** · hooks: `usePageState`, `useCoachingDigest`, `→ features/crm/intelligence`
- `/crm/intelligence/[activityId]` · **CRM** · hooks: `useCan`, `→ features/crm/intelligence` — call analysis detail; `RequireModule module`; `CallAnalysisPanel` + `CallParticipantsCard`
- `/crm/intelligence/reps` · **CRM** · hooks: `→ features/crm/intelligence` — rep-level coaching metrics; `RequireModule module`

### Autonomy
- `/crm/autonomy` · **CRM** · hooks: `→ feature/crm`
- `/crm/autonomy/nurture` · **CRM** · hooks: `→ features/crm/nurture` — nurture sequence list; gated `crm:autonomy:view`
- `/crm/autonomy/nurture/[nurtureSequenceId]` · **CRM** · hooks: `→ features/crm/nurture` — nurture sequence detail; gated `crm:autonomy:view`

### Calendar
- `/crm/calendar` · **CRM** [RETIRED 2026-08-30: file deleted; module events now flow through the unified `/calendar` per §8 rule]

### Access
- `/crm/access` · **CRM** · hooks: `→ feature/crm`

### Settings
- `/crm/settings/api-keys` · **CRM** · hooks: `→ feature/crm/settings`
- `/crm/settings/ai` · **CRM** · hooks: `→ feature/crm/settings`
- `/crm/settings/assignment-rules` · **CRM** · hooks: `→ feature/crm/settings`
- `/crm/settings/audit-log` · **CRM** · hooks: `→ feature/crm/settings`
- `/crm/settings/automations` · **CRM** · hooks: `→ feature/crm/settings`
- `/crm/settings/automations/new` · **CRM** · hooks: `→ feature/crm/settings`
- `/crm/settings/automations/[automationId]` · **CRM** · hooks: `→ feature/crm/settings`
- `/crm/settings/blueprints` · **CRM** · hooks: `→ feature/crm/settings`
- `/crm/settings/custom-fields` · **CRM** · hooks: `→ feature/crm/settings`
- `/crm/settings/data-quality` · **CRM** · hooks: `→ feature/crm/settings`
- `/crm/settings/email-templates` · **CRM** · hooks: `→ feature/crm/settings`
- `/crm/settings/import-export` · **CRM** · hooks: `→ feature/crm/settings`
- `/crm/settings/layouts` · **CRM** · hooks: `→ feature/crm/settings`
- `/crm/settings/options` · **CRM** · hooks: `→ feature/crm/settings`
- `/crm/settings/pipelines` · **CRM** · hooks: `→ feature/crm/settings`
- `/crm/settings/pricebooks` · **CRM** · hooks: `→ feature/crm/settings`
- `/crm/settings/products` · **CRM** · hooks: `→ feature/crm/settings`
- `/crm/settings/quotes` · **CRM** · hooks: `→ feature/crm/settings`
- `/crm/settings/scoring-rules` · **CRM** · hooks: `→ feature/crm/settings`
- `/crm/settings/sequences` · **CRM** · hooks: `→ feature/crm/settings`
- `/crm/settings/sla` · **CRM** · hooks: `→ feature/crm/settings`
- `/crm/settings/subject-types` · **CRM** · hooks: `→ feature/crm/settings`
- `/crm/settings/territories` · **CRM** · hooks: `→ feature/crm/settings`
- `/crm/settings/validation-rules` · **CRM** · hooks: `→ feature/crm/settings`
- `/crm/settings/mcp` · **CRM** · hooks: `→ features/crm/settings` — MCP (Model Context Protocol) integration settings

---

## Build (Project & Product Management)

### Navigation model (2026-09-19, PM Workspace removed 2026-09-23)
Build no longer renders the generic sidebar groups or the old project nav tree. One canonical, permission-filtered model — `lib/build/build-nav-model.ts` over the scope resolver `lib/build/build-scope.ts` — feeds every surface: the desktop sidebar and mobile drawer via `features/build/navigation/build-sidebar.tsx` (injected as `buildSidebarSlot` through `dashboard-shell` → `app-sidebar`), the mobile bottom nav and `hideSidebar` via `toBuildNavGroups` in `use-product-sidebar-visibility`, and the static route-access / product-path index via `buildOrganizationNavGroups()` in `sidebar-nav-groups-work-management.ts`. Scopes are organization · managed product · project — PM Workspace is removed, not a scope. The unified scope selector opens the selected scope's Overview and never copies the previous scope's subpath. Products and Projects sit directly under the organization scope; there is no workspace row and no Default Workspace. Search placeholder is "Search projects and products." Existing `17rem` / `3.5rem` collapse is reused unchanged. Permission drift repaired in navigation: `/build/customers` now `build:customers:view` (was `crm:leads:view`), project Settings now `build:update` (was global `settings:manage`), project Budget/Webhooks `build:manage` and Automations/Modules `build:view`, matching their controllers.
The Build catalog's two groups are `Build` (Overview · Projects · Products · Portfolios · Programs · Teams · Inbox · Assigned to me · Drafts · Browse all Build) and `Build settings` (Roadmap · Goals · Approvals · Customers · Templates · Client access · Members · Build access · Build settings) — `Workspaces` is removed from both groups. `EXPECTED_NAVIGATION_INVENTORY_DIGEST` must be regenerated for this change, not hand-copied from the pre-removal value.

### Hub & cross-project views
- `/build` · **Build** · hooks: `enforceRouteAccess`, `→ features/build/project-list`
- `/build/all` · **Build** · [RETIRED app/(authenticated)/build/all/page.tsx] — byte-equivalent duplicate of `/build` (same `ProjectsPage`, zero props); 17 inbound links repointed to `/build`, its tailored loading skeleton moved to `build/loading.tsx`
- `/build/all-work` · **Build** · hooks: `→ features/build/all-work`
- `/build/my-work` · **Build** · hooks: `→ features/build`
- `/build/inbox` · **Build** · hooks: `→ features/build`
- `/build/drafts` · **Build** · [RETIRED 2026-09-22 app/(authenticated)/build/drafts/page.tsx] — redirect-only page; the redirect moved into `next.config.ts` and the sidebar Drafts entry now points straight at `/build/inbox?view=drafts`
- `/build/command-center` · **Build** · hooks: `→ features/build`
- `/build/approvals` · **Build** · hooks: `→ features/build`
- `/build/members` · **Build** · [RETIRED 2026-09-22 app/(authenticated)/build/members/page.tsx + error.tsx] — redirect-only page shadowed by the `next.config.ts:132` redirect to `/build/settings/access`, which fires before the filesystem, so the page never executed; the URL still redirects
- ~~`/build/customers`~~ · **Build** · REMOVED 2026-09-23 · CRM owns customer identity and lifecycle · deep link preserved by `next.config.ts` → `/crm`
- `/build/client-access` · **Build** · [RETIRED 2026-09-22 app/(authenticated)/build/client-access/page.tsx + loading.tsx] — redirect-only page shadowed by the `next.config.ts` redirect to `/build/settings/client-access`; the URL still redirects
- `/build/access` · **Build** · [RETIRED 2026-09-22 app/(authenticated)/build/access/page.tsx] — redirect-only page shadowed by the `next.config.ts` redirect to `/build/settings/access`; the URL still redirects
- `/build/settings/access` · **Build** · hooks: `→ features/build` — canonical owner of the Build members and access job
- `/build/settings/client-access` · **Build** · hooks: `→ features/portal-access` — canonical owner of the external grant job

### PM Workspaces — Removed 2026-09-23
PM Workspace is removed from Build entirely (not renamed, not consolidated into one page). `build.pm_workspaces`, `build.pm_workspace_memberships`, every `pm_workspace_id` column, all 9 `/build/workspaces*` endpoints, and the 6 `build:workspaces:*` permission keys are dropped. `next.config.ts` redirects every former deep link:

- `/build/pm-workspaces` · [RETIRED] → `/build`
- `/build/workspaces` · [RETIRED] → `/build`
- `/build/workspaces/[pmWorkspaceId]` · [RETIRED] → `/build`
- `/build/workspaces/[pmWorkspaceId]/overview` · [RETIRED] → `/build/command-center`
- `/build/workspaces/[pmWorkspaceId]/all-work` · [RETIRED] → `/build/all-work`
- `/build/workspaces/[pmWorkspaceId]/goals` · [RETIRED] → `/build/goals`
- `/build/workspaces/[pmWorkspaceId]/products` · [RETIRED] → `/build/managed-products`
- `/build/workspaces/[pmWorkspaceId]/roadmap` · [RETIRED] → `/build/roadmap`
- `/build/workspaces/[pmWorkspaceId]/teams` · [RETIRED] → `/build/teams`
- `/build/workspaces/[pmWorkspaceId]/my-work` · [RETIRED 2026-09-22, redirect retargeted 2026-09-23] → `/build/my-work`
- `/build/workspaces/[pmWorkspaceId]/all` · [RETIRED, pre-dates the 2026-09-23 removal] — was a byte-equivalent duplicate of the workspace root, already dead before the scope itself was removed
- `/build/workspaces/[pmWorkspaceId]/pm-workspaces` · [RETIRED, pre-dates the 2026-09-23 removal] — was byte-identical to `/build/pm-workspaces` with zero inbound links, already dead before the scope itself was removed
- `/build/workspaces/[pmWorkspaceId]/[projectId]*` · [NEVER IMPLEMENTED, moot after 2026-09-23] — the five nested project entries once proposed here always 404'd; the scope they would have nested under no longer exists

### Programs, Portfolios, Goals, Roadmap, Teams
- `/build/programs` · **Build** · hooks: `→ features/build`
- `/build/portfolios` · **Build** · hooks: `→ features/build`
- `/build/portfolios/[portfolioId]` · **Build** · hooks: `→ features/build`
- `/build/goals` · **Build** · hooks: `→ features/build/goals` — renamed from `/build/goal` on 2026-09-22; `next.config.ts` redirects the old path
- `/build/goals/[goalId]` · **Build** · hooks: `→ features/build/goals` — renamed from `/build/goal/[goalId]` on 2026-09-22; `next.config.ts` redirects the old path
- `/build/goal`, `/build/goal/[goalId]` · **Build** · [RETIRED 2026-09-22 app/(authenticated)/build/goal/] — renamed to the plural form; deep links preserved by `next.config.ts`
- `/build/roadmap` · **Build** · hooks: `→ features/build`
- `/build/teams` · **Build** · hooks: `→ features/build`
- `/build/teams/[teamId]` · **Build** · hooks: `→ features/build`
- `/build/templates` · **Build** · hooks: `→ features/build`

### Managed Products (product management)
- `/build/managed-products` · **Build** · hooks: `→ features/build`
- `/build/managed-products/[managedProductId]` · **Build** · hooks: `→ features/build`
- `/build/managed-products/[managedProductId]/feedback` · **Build** · hooks: `→ features/build/managed-products` — product feedback from Feedbucket; gated `feedbucket:submissions:view` via `requireModulePermission`
- `/build/managed-products/[managedProductId]/goals` · **Build** · hooks: `→ features/build/managed-products` — product goal list; gated `build:goals:view`
- `/build/managed-products/[managedProductId]/insights` · **Build** · hooks: `→ features/build/managed-products` — product insights; gated `build:managed-products:view`
- `/build/managed-products/[managedProductId]/projects` · **Build** · hooks: `→ features/build/project-list` — projects scoped to a managed product; `enforceRouteAccess`
- `/build/managed-products/[managedProductId]/roadmap` · **Build** · hooks: `→ features/build/managed-products` — product roadmap; gated `build:roadmap:view`

### Settings (Build module)
- `/build/settings/integrations` · **Build** · hooks: `→ features/build/settings`

### Per-project views (`/build/[projectId]/*`)
- `/build/[projectId]` · **Build** · hooks: `→ features/build/project`
- ~~`/build/[projectId]/ai`~~ · **Build** · REMOVED 2026-09-23 · consolidated into the Command Center · deep link preserved by `next.config.ts` → `/build/command-center?projectId=…`
- ~~`/build/[projectId]/analytics`~~ · **Build** · REMOVED 2026-09-23 · duplicated the Reports overview metrics · deep link preserved by `next.config.ts` → `/build/[projectId]/reports?tab=overview`. The chart components it shared (`analytics-kpi-strip`, `chart-shell`, `project-charts`, `project-stats`, `estimate-vs-actual-chart`) are retained — `features/build/reports/reports-overview-tab.tsx` renders them.
- `/build/[projectId]/approvals` · **Build** · hooks: `→ features/build/project`
- `/build/[projectId]/automations` · **Build** · [RETIRED 2026-09-22 app/(authenticated)/build/[projectId]/automations/page.tsx + loading.tsx] — redirect-only page shadowed by the `next.config.ts:122` redirect to `/build/:projectId/settings/automations`; the URL still redirects
- `/build/[projectId]/backlog` · **Build** · hooks: `→ features/build/project`
- `/build/[projectId]/budget` · **Build** · hooks: `→ features/build/project`
- ~~`/build/[projectId]/bugs`~~ · **Build** · REMOVED 2026-09-23 · defects are `type=BUG` work items; QA evidence moved to the ticket detail and severity/QA-state filters to the Issues toolbar · deep link preserved by `next.config.ts` → `/build/[projectId]/issues?type=BUG`
- `/build/[projectId]/change-requests` · **Build** · hooks: `→ features/build/project`
- `/build/[projectId]/chat` · **Build** · hooks: `→ features/build/project`
- `/build/[projectId]/client-portal` · **Build** · hooks: `→ features/build/project` · renders `NoPermissionState` without `build:clientvisibility:manage` (2026-09-19: previously showed an empty list, since the disabled query left `data` undefined — denial read as emptiness). Sidebar entry is additionally hidden when the project stores `settings.features.clientPortal === false`; an absent flag counts as enabled, and the backend does not enforce that flag.
- `/build/[projectId]/cycles` · **Build** · hooks: `→ features/build/project`
- `/build/[projectId]/cycles/[cycleId]` · **Build** · hooks: `→ features/build/project`
- `/build/[projectId]/decisions` · **Build** · hooks: `→ features/build/project`
- `/build/[projectId]/epics` · **Build** · hooks: `→ features/build/project`
- `/build/[projectId]/feedbucket` · **Build** · hooks: `usePageState({permission,module})` + `PageWrapper state=`, `→ features/build/feedbucket` — the captured 402. **UN-RUN CHECK:** the browser proof (load as a member of an org with `feedbucket` disabled; expect the module name and an Enable path to `/settings/modules`, and NO upgrade link and NO "Try Again") was never executed — no booted stack. A passing typecheck is not proof of that journey.
- `/build/[projectId]/feedbucket/[submissionId]` · **Build** · hooks: `→ features/feedbucket` — delete submission + per-media (screenshot/recording) delete, gated `feedbucket:submissions:delete`. Submission delete is SOFT (`deleted_at`, media kept); media delete is a real storage delete. — 2026-09-21: the AI analysis description sanitises through `useSanitizedHtml` (was an inline `DOMPurify.sanitize` on `isomorphic-dompurify`)
- `/build/[projectId]/files` · **Build** · hooks: `→ features/build/files` — project file attachments; gated `build:files:view` via `requireModulePermission`
- `/build/[projectId]/forms` · **Build** · hooks: `→ features/build/project`
- `/build/[projectId]/forms/[formId]` · **Build** · hooks: `→ features/build/project`
- `/build/[projectId]/incidents` · **Build** · hooks: `→ features/build/project`
- `/build/[projectId]/incidents/[incidentId]` · **Build** · hooks: `→ features/build/project`
- `/build/[projectId]/issues` · **Build** · hooks: `→ features/build/project` — board view alias; `enforceRouteAccess`
- `/build/[projectId]/intake` · **Build** · hooks: `→ features/build/project`
- `/build/[projectId]/meetings` · **Build** · hooks: `→ features/build/project`
- `/build/[projectId]/meetings/[meetingId]` · **Build** · hooks: `→ features/build/project`
- `/build/[projectId]/milestones` · **Build** · hooks: `→ features/build/project`
- `/build/[projectId]/modules` · **Build** · hooks: `→ features/build/project`
- `/build/[projectId]/my-tickets` · **Build** · [RETIRED 2026-09-22 app/(authenticated)/build/[projectId]/my-tickets/] — redirect-only page; the redirect moved into `next.config.ts` and targets `/build/my-work?projectId=…`. The command palette and the `g`+`i` chord now open the canonical URL directly.
- `/build/[projectId]/qa` · **Build** · hooks: `→ features/build/project`
- `/build/[projectId]/qa/runs/[runId]` · **Build** · hooks: `→ features/build/project`
- `/build/[projectId]/releases` · **Build** · hooks: `→ features/build/project`
- `/build/[projectId]/reports` · **Build** · hooks: `→ features/build/project`
- `/build/[projectId]/risks` · **Build** · hooks: `→ features/build/project`
- `/build/[projectId]/settings` · **Build** · hooks: `→ features/build/project`
- `/build/[projectId]/tickets/[ticketKey]` · **Build** · hooks: `→ features/build/project` — notification/email/search deep links emit `/build/...` (not legacy `/projects/...`); client navigation normalizes any stored `/projects` links via `normalizeBuildDeepLink`; main column uses `min-h-0 flex-1 basis-0 overflow-y-auto` inside an `overflow-hidden` split so long descriptions scroll (parity with inbox preview; `ticket-detail-scroll-chain.test.ts`)
- ~~`/build/[projectId]/timeline`~~ · **Build** · REMOVED 2026-09-23 · timeline is a view of Issues · deep link preserved by `next.config.ts` → `/build/[projectId]/issues?view=timeline`
- `/build/[projectId]/triage` · **Build** · hooks: `→ features/build/project`
- `/build/[projectId]/updates` · **Build** · hooks: `→ features/build/updates` — project status updates; gated `build:updates:view` via `requireModulePermission`
- ~~`/build/[projectId]/views`~~ · **Build** · REMOVED 2026-09-23 · saved views are managed from the Issues toolbar · deep link preserved by `next.config.ts` → `/build/[projectId]/issues`
- `/build/[projectId]/webhooks` · **Build** · [RETIRED 2026-09-22 app/(authenticated)/build/[projectId]/webhooks/page.tsx + loading.tsx] — redirect-only page shadowed by the `next.config.ts:127` redirect to `/build/:projectId/settings/integrations/webhooks`; the URL still redirects
- `/build/[projectId]/whiteboard` · **Build** · hooks: `→ features/build/project`
- `/build/[projectId]/wiki` · **Build** · hooks: `→ features/build/project`
- `/build/[projectId]/wiki/[pageId]` · **Build** · hooks: `→ features/build/project`
- `/build/[projectId]/workflow` · **Build** · [RETIRED 2026-09-22 app/(authenticated)/build/[projectId]/workflow/page.tsx + error.tsx + loading.tsx] — redirect-only page shadowed by the `next.config.ts:117` redirect to `/build/:projectId/settings/workflow`; the URL still redirects
- `/build/[projectId]/workload` · **Build** · hooks: `→ features/build/project` — workload view alias; `enforceRouteAccess`

---

## HR (Human Resources)

### Hub
- `/hr` · **HR** · hooks: `→ features/hr/hub` (2026-09-21: titled "HR overview"; one primary action "Onboard employee" with "Review approvals" and "Create announcement" as outlined actions; the Dashboard, Analytics and Approvals tiles that duplicated nav destinations are gone) (2026-09-21: `loading.tsx` is titled "HR overview", matching the page)
- `/hr/dashboard` — **deleted 2026-09-21**; it duplicated `/hr` (the hub snapshot already carries the metrics, leave calendar and onboarding status), so the route, `features/hr/dashboard/**`, `useHrDashboardMetrics`/`useHrLeaveCalendar`/`useHrOnboardingStatus` and their keys are gone

### Employees
- `/hr/employees` · **HR** · hooks: `requirePermission("hr:employees:view")` (server), `usePageState` + `PageWrapper state=`, `→ features/hr/employees` — the duplicated loading-only `PageWrapper` early return is gone — 2026-09-21: the route wraps its `useSearchParams` consumer in `<Suspense fallback={<Loading/>}>` (the route's own `loading.tsx` skeleton), matching `payroll/settings/import-export`; pinned by `app/(authenticated)/hr/hr-search-params-suspense.test.ts`
- `/hr/employees` · **HR** · hooks: `requirePermission("hr:employees:view")` (server), `usePageState` + `PageWrapper state=`, `→ features/hr/employees` — the duplicated loading-only `PageWrapper` early return is gone (2026-09-21: `loading.tsx` is titled "Employee directory", matching the page, so the h1 no longer changes case when the data lands)
- `/hr/employees` · **HR** · hooks: `requirePermission("hr:employees:view")` (server), `usePageState` + `PageWrapper state=`, `→ features/hr/employees` — the duplicated loading-only `PageWrapper` early return is gone. 2026-09-21 (FE#156/BE#36): the Active/Inactive summary now reads `useHrEmployeeCounts` → `GET /hr/employees/counts`, which runs the list's own predicate (search, department, role) under the same `hr:employees:view` DataScope, so with the Active filter applied the count equals the list length; the org-wide command-center headcount (`hr:analytics:read`) no longer feeds this page. "Loaded" carries "of N matching". FE#100: subtitle now states this is employment administration and points everyone-in-the-organization reads at `/directory`.
- `/hr/employees` · **HR** · hooks: `requirePermission("hr:employees:view")` (server), `usePageState` + `PageWrapper state=`, `→ features/hr/employees` — the duplicated loading-only `PageWrapper` early return is gone (2026-09-21: `loading.tsx` is titled "Employee directory", matching the page, so the h1 no longer changes case when the data lands)
- `/hr/employees/[employeeId]` · **HR** · hooks: `→ features/hr/employees` — 2026-09-21: the route wraps its `useSearchParams` consumer in `<Suspense fallback={<Loading/>}>` (the route's own `loading.tsx` skeleton), matching `payroll/settings/import-export`; pinned by `app/(authenticated)/hr/hr-search-params-suspense.test.ts`
- `/hr/employees/[employeeId]` · **HR** · hooks: `→ features/hr/employees` (2026-09-21: overview tab mounts `ReportingLineSection` on `useReportingLine` → `GET /hr/reporting-lines/{employeeUserId}` — current, scheduled and historical managers with the manager's state; the edit form's Reports to writes through `PATCH /hr/employees/{employeeUserId}` `reportingTo`, which the backend now validates for inactive, exited and circular managers)
- `/hr/employees/[employeeId]` · **HR** · hooks: `→ features/hr/employees` (2026-09-21: header card gains a "Resend invite" action — `ResendInviteButton` → `useResendEmployeeInvite` → `POST /hr/employees/:employeeId/resend-invite`, `Idempotency-Key` per intent, rendered only for `hr:onboarding:manage` holders and never on your own profile or a terminated one; success toasts "Invitation sent", a queued-but-undeliverable outcome warns with the backend's reason)
- `/hr/employees/[employeeId]` · **HR** · hooks: `→ features/hr/employees` (2026-09-21: overview tab mounts `ReportingLineSection` on `useReportingLine` → `GET /hr/reporting-lines/{employeeUserId}` — current, scheduled and historical managers with the manager's state; the edit form's Reports to writes through `PATCH /hr/employees/{employeeUserId}` `reportingTo`, which the backend now validates for inactive, exited and circular managers)
- `/hr/employees/find-expert` · **HR** · hooks: `→ features/hr/employees`
- `/hr/employees/manager-coverage` · **HR** · hooks: `requirePermission("hr:employees:view")` (server), `useManagerCoverage` → `GET /hr/reporting-lines/coverage`, `usePageState` + `PageState`, `→ features/hr/employees/manager-coverage-page` (2026-09-21: employees without a manager, reporting to an inactive/exited manager, circular chains, and managers over the span-of-control limit — the repair queue behind every approval fallback) (2026-09-21: `loading.tsx` shows the table's real column headers under the page title while the rows load; the in-feature loading branch derives its headers from `WITHOUT_MANAGER_COLUMNS`)
- `/hr/employees/skills-matrix` · **HR** · hooks: `→ features/hr/employees`

### Onboarding
- `/hr/onboarding` · **HR** · hooks: `→ features/hr/onboarding` — 2026-09-21: the route wraps its `useSearchParams` consumer in `<Suspense fallback={<Loading/>}>` (the route's own `loading.tsx` skeleton), matching `payroll/settings/import-export`; pinned by `app/(authenticated)/hr/hr-search-params-suspense.test.ts`
- `/hr/onboarding` · **HR** · hooks: `→ features/hr/onboarding` (2026-09-21: the New employee wizard footer is sticky above the mobile module nav; the Create onboarding plan sheet is react-hook-form + Zod (`onboarding-plan-schema.ts`) with per-field messages and a step field array)
- `/hr/onboarding` · **HR** · hooks: `→ features/hr/onboarding` (2026-09-21: the New Employee wizard reads the onboard response's `invite: { sent, reason }` — the employee is created either way, and an unsent invitation raises a warning toast naming the backend's reason (suppressed address, no email provider, already a member) instead of "created successfully" hiding it; the tracker row gains "Resend invite" beside View, gated on `hr:onboarding:manage`; Skills & Pay labels professional tax and net pay as estimates — payroll's state slab and salary structure decide the real deductions)
- `/hr/onboarding` · **HR** · hooks: `→ features/hr/onboarding` (2026-09-21: the New employee wizard footer is sticky above the mobile module nav; the Create onboarding plan sheet is react-hook-form + Zod (`onboarding-plan-schema.ts`) with per-field messages and a step field array)
- `/hr/onboarding/[userId]` · **HR** · hooks: `→ features/hr/onboarding`
- `/hr/onboarding/my-tasks` · **HR** · [RETIRED app/(authenticated)/hr/onboarding/my-tasks/page.tsx] — legacy redirect stub to `/me/onboarding` sitting behind the HR layout gate its own audience lacks; §8 forbids legacy redirects
- `/hr/onboarding/probation` · **HR** · hooks: `requirePermission("hr:probation:view")`, `→ features/hr/onboarding`

### Attendance & Time
- `/hr/attendance` · **HR** · hooks: `→ features/hr/attendance` (2026-09-21: the inline Manage Holidays card and its legacy `useHrHolidaysForYear`/add/update/delete hooks are gone — holidays are managed at `/hr/holidays`)
- `/hr/leaves` · **HR** · hooks: `→ features/hr/leaves` (2026-09-21: one primary action per context — "Request leave" for members, "Review requests" for HR admins with the request buttons outlined; the leave and WFH request sheets show `ApprovalRoutePanel` — who approves, why, and the SLA — from `GET /me/time-off`'s `approvalRoute` and `GET /me/approvers/wfh`; the WFH sheet no longer lets the employee pick an approver, the server routes it)
- `/hr/leaves/analytics` · **HR** · hooks: `→ features/hr/leaves`
- `/hr/leave-policies` · **HR** · hooks: `→ features/hr/leaves` (2026-09-21: the policy sheet resets to the edited policy on open via `policyFormValues`; the leave type editor is `EntityFormDialog` on `leave-type-schema.ts` with a `ConfirmDialog` delete)
- `/hr/holidays` · **HR** · hooks: `requirePermission("self:attendance")` (server, nav-aligned), `useHolidays` → `GET /me/attendance/holidays` (`self:attendance`), `usePageState` + `PageState`, `→ features/hr/holidays`. 2026-09-21 (FE#133): the list read, the nav entry and the page gate all use the ESS route's key `self:attendance` (universal for active members; the admin route `/hr/attendance/holidays` returns the identical `org_holidays` rows); Add/Edit/Delete controls and their `useAuthorizedMutation`s gate on `hr:attendance:manage`, the exact key of `POST/PATCH/DELETE /hr/attendance/holidays*`. No key is invented and no catalog changes. CTA is "Add holiday" (audit §5).
- `/hr/work-logs` · **HR** · hooks: `→ features/hr/work-logs` — 2026-09-21: the route wraps its `useSearchParams` consumer in `<Suspense fallback={<Loading/>}>` (the route's own `loading.tsx` skeleton), matching `payroll/settings/import-export`; pinned by `app/(authenticated)/hr/hr-search-params-suspense.test.ts`
- `/hr/overtime` · **HR** · hooks: `→ features/hr/overtime`
- `/hr/shifts` · **HR** · hooks: `→ features/hr/shifts`
- `/hr/rosters` · **HR** · hooks: `→ features/hr/rosters` (2026-09-21: week start is pinned to Mondays — picker disables other days, `roster-schema.ts` refuses them, week end derives via parseISO)
- `/hr/comp-off` · **HR** · hooks: `→ features/hr/comp-off`

### Recruitment
- `/recruitment` · **HR** · hooks: `→ features/recruitment`
- `/recruitment/jobs` · **HR** · hooks: `→ features/recruitment` — 2026-09-21: the route wraps its `useSearchParams` consumer in `<Suspense fallback={<Loading/>}>` (the route's own `loading.tsx` skeleton), matching `payroll/settings/import-export`; pinned by `app/(authenticated)/hr/hr-search-params-suspense.test.ts`
- `/recruitment/jobs/new` · **HR** · hooks: `→ features/recruitment`
- `/recruitment/jobs/[jobId]/edit` · **HR** · hooks: `→ features/recruitment`
- `/recruitment/candidates` · **HR** · hooks: `→ features/recruitment` — 2026-09-21: in the reproduced React #419 set (jsdom chunk reached through a shared import); fixed by the sanitiser boundary. 2026-09-21: the route wraps its `useSearchParams` consumer in `<Suspense fallback={<Loading/>}>` (the route's own `loading.tsx` skeleton), matching `payroll/settings/import-export`; pinned by `app/(authenticated)/hr/hr-search-params-suspense.test.ts`
- `/recruitment/candidates/[candidateId]` · **HR** · hooks: `→ features/recruitment`
- `/recruitment/candidates/import` · **HR** · hooks: `→ features/recruitment`
- `/recruitment/candidates/intake` · **HR** · hooks: `→ features/recruitment`
- `/recruitment/pipeline` · **HR** · hooks: `→ features/recruitment` — 2026-09-21: the route wraps its `useSearchParams` consumer in `<Suspense fallback={<Loading/>}>` (the route's own `loading.tsx` skeleton), matching `payroll/settings/import-export`; pinned by `app/(authenticated)/hr/hr-search-params-suspense.test.ts`
- `/recruitment/interviews` · **HR** · hooks: `→ features/recruitment` (2026-09-21: `loading.tsx` shows the table's real column headers under the page title while the rows load)
- `/recruitment/offers` · **HR** · hooks: `→ features/recruitment`
- `/recruitment/offer-templates` · **HR** · hooks: `→ features/recruitment` — 2026-09-21: the preview sheet renders `SanitizedHtml` instead of an inline `DOMPurify.sanitize`; this route was in the reproduced React #419 set
- `/recruitment/requisitions` · **HR** · hooks: `→ features/recruitment`
- `/recruitment/talent-pools` · **HR** · hooks: `→ features/recruitment`
- `/recruitment/headcount` · **HR** · hooks: `→ features/recruitment`
- `/recruitment/analytics` · **HR** · hooks: `→ features/recruitment`
- `/recruitment/diversity-report` · **HR** · hooks: `requirePermission("hr:sensitive:view")` (server), `useDiversityReport` (`useGatedQuery("hr:sensitive:view")` → `GET /hr/recruitment/diversity-report`), `usePageState` + `PageWrapper state=`, `→ features/recruitment`. 2026-09-21 (FE#134): the page's state resolves through `usePageState({ permission: "hr:sensitive:view", …, error, isEmpty })`, so access-loading is a skeleton, denial is `DeniedView`, a failed read is `ErrorState` with the backend message, and "No applicant data found" appears only for a permitted, finished read with `total === 0`; removed from `denial-is-not-emptiness.known.json`.
- `/recruitment/scorecard-analytics` · **HR** · hooks: `→ features/recruitment`
- `/recruitment/scorecard-templates` · **HR** · hooks: `→ features/recruitment`
- `/recruitment/question-bank` · **HR** · hooks: `→ features/recruitment`
- `/recruitment/hiring-flows` · **HR** · hooks: `→ features/recruitment`
- `/recruitment/booking-links` · **HR** · hooks: `→ features/recruitment` (2026-09-21: `loading.tsx` is titled "Interview Booking Links" with the page's subtitle)
- `/recruitment/email-sequences` · **HR** · hooks: `→ features/recruitment`
- `/recruitment/automations` · **HR** · hooks: `→ features/recruitment`
- `/recruitment/recruiters` · **HR** · hooks: `→ features/recruitment`
- `/recruitment/vendors` · **HR** · hooks: `→ features/recruitment`
- `/recruitment/internal-jobs` · **HR** · hooks: `→ features/recruitment`
- `/recruitment/referrals` · **HR** · hooks: `→ features/recruitment`
- `/recruitment/refer` · **HR** · hooks: `→ features/recruitment`
- `/recruitment/sla` · **HR** · hooks: `→ features/recruitment`
- `/recruitment/sla-report` · **HR** · hooks: `→ features/recruitment`
- `/recruitment/interviewer-performance` · **HR** · hooks: `→ features/recruitment`
- `/recruitment/inbox` · **HR** · hooks: `→ features/recruitment`
- `/recruitment/reports` · **HR** · hooks: `→ features/recruitment`
- `/recruitment/settings` · **HR** · hooks: `→ features/recruitment`

### Performance & Engagement
- `/hr/performance` · **HR** · hooks: `→ features/hr/performance` — 2026-09-21: React #419 came in through `@/components/ai`'s barrel (`AiFailureBody` import pulled `AiInlinePreview` → `isomorphic-dompurify` → bundled jsdom across the client boundary); the preview now renders through `SanitizedHtml`. 2026-09-21: the route wraps its `useSearchParams` consumer in `<Suspense fallback={<Loading/>}>` (the route's own `loading.tsx` skeleton), matching `payroll/settings/import-export`; pinned by `app/(authenticated)/hr/hr-search-params-suspense.test.ts`
- `/hr/performance/analytics` · **HR** · hooks: `→ features/hr/performance`
- `/hr/engagement` · **HR** · hooks: `→ features/hr/engagement` — 2026-09-21: renamed **Polls & engagement** (sidebar label, page title, subtitle) per the HRMS audit: the surface is recognition, mood check-ins, polls, communities and campaigns, not a survey programme (audience, schedule, reminders, action plan live nowhere); the real survey builder stays at `/surveys`. Anonymous poll results and the org mood trend now honour the backend anonymity floor (`minResponses`, 5): a poll under it answers `suppressed` with no per-option counts and the tab renders `AnonymitySuppressedNotice`; the mood aggregate is `{ minResponses, suppressedDays, points }` so a trend hidden on every day says so instead of "no data". Primary poll action reads "Create poll".
- `/hr/engagement` · **HR** · hooks: `→ features/hr/engagement` (2026-09-21: the Overview tab is honest about failed reads — the Recognitions stat shows an unknown value with a "Couldn't load" hint and the mood-trend card offers retry (FE#138); `BadgesGrid` and `PointsLeaderboard` retry through the shared `ErrorState` (FE#115))
- `/hr/feedback` · **HR** · hooks: `→ features/hr/feedback`
- `/hr/goals` · **HR** · hooks: `→ features/hr/goals`
- `/hr/kpis` · **HR** · hooks: `→ features/hr/kpis`
- `/hr/compensation-planning` · **HR** · hooks: `→ features/hr/compensation`
- `/hr/retention` · **HR** · hooks: `→ features/hr/retention` (2026-09-21: `loading.tsx` shows the table's real column headers under the page title while the rows load (the Retention Policies tab))

### Expenses & Travel
- `/hr/expenses` · **HR** · hooks: `→ features/hr/expenses` (2026-09-21: admin actions are "Add expense" primary, "Import expenses" outlined and "Export expenses" in the overflow menu, opening `ExpenseExportDialog` in its controlled mode)
- `/hr/reimbursements` · **HR** · hooks: `→ features/hr/reimbursements` (2026-09-21: the request sheet validates on change through `reimbursement-schema.ts`; a negative amount is flagged inline before submit) (2026-09-21: `loading.tsx` shows the table's real column headers under the page title while the rows load)
- `/hr/travel` · **HR** · hooks: `→ features/hr/travel`
- `/hr/travel/approvals` · **HR** · hooks: `→ features/hr/travel`

### Documents & Templates
- `/hr/documents` · **HR** · hooks: `→ features/hr/documents`
- `/hr/documents/editor/new` · **HR** · hooks: `→ features/hr/documents`
- `/hr/documents/editor/[documentId]` · **HR** · hooks: `→ features/hr/documents`
- `/hr/documents/templates` · **HR** · hooks: `→ features/hr/documents` — 2026-09-21: React #419 — the row `PreviewDialog` sanitised at render with `isomorphic-dompurify`; it now renders `SanitizedHtml` (after-mount sanitiser), see Standing decisions
- `/hr/documents/templates/new` · **HR** · hooks: `→ features/hr/documents` — 2026-09-21: `TemplatePreviewPanel` (shared with the edit route) renders `SanitizedHtml` instead of an inline `DOMPurify.sanitize`; the route no longer carries jsdom in its server chunk
- `/hr/documents/templates/[templateId]/edit` · **HR** · hooks: `→ features/hr/documents` — 2026-09-21: same `TemplatePreviewPanel` change as `/new`
- `/hr/document-types` · **HR** · hooks: `→ features/hr/documents` — 2026-09-21: the route wraps its `useSearchParams` consumer in `<Suspense fallback={<Loading/>}>` (the route's own `loading.tsx` skeleton), matching `payroll/settings/import-export`; pinned by `app/(authenticated)/hr/hr-search-params-suspense.test.ts`
- `/hr/document-types` · **HR** · hooks: `→ features/hr/documents` (2026-09-21: `loading.tsx` shows the table's real column headers under the page title while the rows load)
- `/hr/document-review` · **HR** · hooks: `→ features/hr/documents` (2026-09-21: `loading.tsx` shows the table's real column headers under the page title while the rows load)
- `/hr/handbook` · **HR** · hooks: `→ features/hr/handbook`

### Org Chart & Structure
- `/hr/org` · **HR** · hooks: `→ features/hr/org` — 2026-09-21: the route wraps its `useSearchParams` consumer in `<Suspense fallback={<Loading/>}>` (the route's own `loading.tsx` skeleton), matching `payroll/settings/import-export`; pinned by `app/(authenticated)/hr/hr-search-params-suspense.test.ts`
- `/hr/org` · **HR** · hooks: `requirePermission("hr:employees:view")` (server), `useOrgJobRoles`/`useOrgJobLevels`, `→ features/hr/org`. 2026-09-21 (FE#158/BE#37): the "Total" that could read 1 above an empty Job Roles list was `HeadcountStats` (people per department, not roles); 4bf5b2421 stopped rendering it and the dead component, `useOrgHeadcount`, its contract, type and query key are now deleted. Backend `GET /hr/org/roles` and the role headcount share `liveJobRolesOf`, so an archived role is never a named count.
- `/hr/org-chart` · **HR** · hooks: `→ features/hr/org-chart` — 2026-09-21: the route wraps its `useSearchParams` consumer in `<Suspense fallback={<Loading/>}>` (the route's own `loading.tsx` skeleton), matching `payroll/settings/import-export`; pinned by `app/(authenticated)/hr/hr-search-params-suspense.test.ts`
- `/hr/org-chart` · **HR** · hooks: `→ features/hr/org-chart` (2026-09-21: the search draft is local state and the `q` param follows the 300ms-debounced value, so the loading boundary remount no longer drops keystrokes)

### Announcements & Communications
- `/hr/announcements` · **HR** · hooks: `→ features/hr/announcements` (2026-09-21: titled "Company announcements" with a subtitle saying it is the shared Home surface — the route is deliberately in Home's Company nav group, not the HR shell)
- `/hr/email-templates` · **HR** · hooks: `→ features/hr/email-templates`

### Assets & Devices
- `/hr/assets` · **HR** · hooks: `→ features/hr/assets`
- `/hr/asset-returns` · **HR** · hooks: `→ features/hr/assets` (2026-09-21: the Log asset return drawer shows each missing field's message under the field instead of a toast) (2026-09-21: `loading.tsx` shows the table's real column headers under the page title while the rows load)
- `/hr/devices` · **HR** · hooks: `→ features/hr/devices` (2026-09-21: `loading.tsx` shows the table's real column headers under the page title while the rows load (the Devices tab))

### Benefits, Equity, Payroll self-links
- `/hr/benefits` · **HR** · hooks: `→ features/hr/benefits`
- `/hr/equity` · **HR** · hooks: `→ features/hr/equity` (2026-09-21: `loading.tsx` shows the table's real column headers under the page title while the rows load)

### Compliance & Legal
- `/hr/compliance` · **HR** · hooks: `→ features/hr/compliance`
- `/hr/legal-holds` · **HR** · hooks: `→ features/hr/legal-holds` (2026-09-21: `loading.tsx` shows the table's real column headers under the page title while the rows load)
- `/hr/labor-relations` · **HR** · hooks: `→ features/hr/labor-relations` (2026-09-21: `loading.tsx` shows the table's real column headers under the page title while the rows load (the Memberships tab))
- `/hr/safety` · **HR** · hooks: `→ features/hr/safety` — 2026-09-21: the suppressed wellness pulse renders the shared `AnonymitySuppressedNotice` (same floor as polls, mood and survey analytics) instead of its own k-anonymity line
- `/hr/safety` · **HR** · hooks: `→ features/hr/safety` (2026-09-21: `WellnessPulseCard` renders `ErrorState` with retry when `useWellnessPulse` fails instead of returning null (FE#117); `loading.tsx` shows the table's real column headers under the page title while the rows load)
- `/hr/background-verification` · **HR** · hooks: `→ features/hr/bg-verification`
- `/hr/identity` · **HR** · hooks: `→ features/hr/identity` (2026-09-21: `loading.tsx` shows the table's real column headers under the page title while the rows load (the Provisioning tab))
- `/hr/accommodations` · **HR** · hooks: `→ features/hr/accommodations`

### Offboarding & Exit
- `/hr/exit` · **HR** · hooks: `→ features/hr/exit` — 2026-09-21: React #419 on full loads was `isomorphic-dompurify` imported at module top (bundled jsdom threw ENOENT on the server); the resignation-letter popup now sanitises through a lazy `import("@/lib/sanitize-html")` inside the click handler, so nothing DOM-dependent is in the SSR graph
- `/hr/exit` · **HR** · hooks: `requirePermission("hr:exit:view")` (server), `useResignations`, `useMyResignation`, `→ features/hr/exit/exit-management-page` (2026-09-21: primary action top-right is now one of "Submit resignation" (`hr:exit:create`), "Resignation pending" badge when one is already open, or "Initiate termination" for exit administrators — the empty state no longer offers a CTA the viewer cannot take; each card links to `/hr/exit/[resignationId]`; the list contract now mirrors the backend row (`hasResignationLetter`, enriched `user`, `hrReviewer`) — the old contract declared `resignationLetterUrl`/`checklists`/`finalReviewer` the list never returns)
- `/hr/termination` · **HR** · hooks: `→ features/hr/termination` (2026-09-21: user-visible wording is "Final settlement" — routes, permission keys and symbols unchanged)
- `/hr/fnf` · **HR** · hooks: `requirePermission("hr:payroll:view")` (server), `useFnfSettlements`, `usePageState` + `PageState`, `→ features/hr/fnf/fnf-page-client` (2026-09-21: titled "Final settlement"; the page resolves through `usePageState` so a failed read shows `ErrorState` with retry instead of the empty list and a 402/403 shows the backend's denial; "Create settlement" gates on `hr:exit:manage`; removed from `denial-is-not-emptiness.known.json`)
- `/hr/exit/[resignationId]` · **HR** · hooks: `requirePermission("hr:exit:view")` (server), `useResignation` → `GET /hr/exit/{resignationId}`, `useUpdateExitChecklistItem` → `PATCH /hr/exit/{resignationId}/checklist/{itemKey}` (idempotent), `useCompleteExit` → `PATCH /hr/exit/{exitId}`, `usePageState` + `PageState`, `→ features/hr/exit/exit-detail-page` (2026-09-21: the one offboarding checklist as primary content — typed items with owner (person or named queue), due date, status, evidence, notes, closed-by; exactly one action per item the viewer may take ("Close item"/"Update"), links to asset returns, identity and Final settlement gated on their own view keys; "Complete exit" for `hr:exit:manage` on an approved exit asks for a reason when items are still open, matching the backend completion guard; loading keeps the leaver title over a typed skeleton, failures show `ErrorState` with retry, denial is explicit; the checklist freezes once the exit is COMPLETED)

### Positions, Workforce, Delegations
- `/hr/positions` · **HR** · hooks: `→ features/hr/positions` — 2026-09-21: the server page keeps its `PageWrapper` and wraps `PositionsPageContent` (a `useSearchParams` consumer) in `<Suspense fallback={<DataTableSkeleton rows={10} columns={6} />}>`, the same body its `loading.tsx` draws; pinned by `app/(authenticated)/hr/hr-search-params-suspense.test.ts`
- `/hr/positions` · **HR** · hooks: `→ features/hr/governance` (2026-09-21: Create position dialog → `POST /hr/governance/positions`, statuses from `GET /hr/governance/position-taxonomy/statuses`; the empty-state CTA opens it) (2026-09-21: `loading.tsx` shows the table's real column headers under the page title while the rows load (the Positions tab))
- `/hr/positions` · **HR** · hooks: `→ features/hr/governance` (2026-09-21: Create position dialog → `POST /hr/governance/positions`, statuses from `GET /hr/governance/position-taxonomy/statuses`; the empty-state CTA opens it) (2026-09-21: `loading.tsx` shows the table's real column headers under the page title while the rows load (the Positions tab))
- `/hr/workforce` · **HR** · hooks: `→ features/hr/workforce`
- `/hr/workforce-cost` · **HR** · hooks: `→ features/hr/workforce` (2026-09-21: "Workforce costing"; the period button is "Update view")
- `/hr/contingent` · **HR** · hooks: `→ features/hr/contingent` — 2026-09-21: React #419 — the internship `CertificateViewer` sanitised at render with `isomorphic-dompurify`; it now renders `SanitizedHtml`
- `/hr/delegations` · **HR** · hooks: `→ features/hr/delegations`

### HR Analytics, Helpdesk, Cases
- `/hr/analytics` · **HR** · hooks: `→ features/hr/analytics` (2026-09-21: "People analytics"; the Recruitment tab and the Open positions KPI render only for a viewer holding `hr:interviews:view` — `GET /hr/recruitment/stats`'s key — since no org-level ATS enablement signal exists)
- `/hr/helpdesk` · **HR** · hooks: `requirePermission("hr:helpdesk:view")` (server), `→ features/employee-support` (`SupportQueuesPage`: `useSupportQueueTickets`, `useSupportQueues`, `useSupportQueueTicket`) — 2026-09-21: the HR-only helpdesk became the company-wide **Employee support** agent view. Five queue tabs (HR, IT, Finance, Admin, Legal) with open/overdue counts for the queues the agent is a member of (`useCan("hr:helpdesk:queue-<q>")` or `hr:helpdesk:manage`); non-member tabs are read-only and show non-confidential requests only. Rows carry the confidential badge, the SLA marker (due / response overdue / overdue / escalated) and the assignee; the detail sheet works the request (status, queue) only for queue members. `Queue settings` (SLA hours, escalation target, category routing) is admin-only. State resolves through `usePageState` + `<PageState>` with `module: "hr"`; the loading branch keeps the title and typed column headers (no `Column 1`), error has retry, empty names the queue. Tab, status, search and the open ticket sync to the URL (`queue`, `status`, `q`, `ticket`). Employees no longer raise requests here — that surface moved to `/me/support`.
- `/hr/cases` · **HR** · hooks: `→ features/hr/cases`
- `/hr/service-delivery` · **HR** · hooks: `→ features/hr/service-delivery`

### Misc HR
- `/hr/approvals` · **HR** · hooks: `→ features/hr/workflows` (2026-09-21: "Approvals"; each pending row states the persisted step routing — rung, explanation and escalation — read from `instance.context.approvalRouting[currentStepOrder]` by `currentStepRouting`) (2026-09-21: the My delegations dialog renders `ErrorState` with retry on a failed `useMyDelegations` read (FE#129))
- `/hr/biometric` · **HR** · hooks: `→ features/hr/biometric` (2026-09-21: `loading.tsx` mirrors the Devices tab's card grid instead of a numbered table)
- `/hr/geofencing` · **HR** · hooks: `→ features/hr/geofencing` (2026-09-21: `geofence-schema.ts` validates latitude/longitude as numbers in range; no pre-filled coordinates)
- `/hr/emergency` · **HR** · hooks: `→ features/hr/emergency` (2026-09-21: `loading.tsx` shows the table's real column headers under the page title while the rows load)
- `/hr/event-stream` · **HR** · hooks: `→ features/hr/event-stream` (2026-09-21: `loading.tsx` shows the table's real column headers under the page title while the rows load (the Event Log tab))
- `/hr/simulator` · **HR** · hooks: `→ features/hr/simulator`

### HR Settings
- `/hr/settings` · **HR** · hooks: `→ features/hr/settings` (2026-09-21: "HR configuration"; the Simple/Advanced banner is a one-line helper; the Company tab is gone — company settings live at `/settings/organization`; below `md` the section tabs are a Select so the active section is never off-screen)
- `/hr/settings/automations` · **HR** · hooks: `→ features/hr/settings` (2026-09-21: the Runs sheet renders `ErrorState` with retry on a failed `useHrAutomationRuns` read (FE#130))
- `/hr/settings/company` — **deleted 2026-09-21**; it duplicated `/settings/organization`
- `/hr/settings/custom-fields` · **HR** · hooks: `→ features/hr/settings`
- `/hr/settings/forms` · **HR** · hooks: `→ features/hr/settings`
- `/hr/settings/forms/[formId]` · **HR** · hooks: `→ features/hr/settings`
- `/hr/settings/forms/[formId]/submissions` · **HR** · hooks: `→ features/hr/settings`
- `/hr/settings/import-export` · **HR** · hooks: `→ features/hr/settings`
- `/hr/settings/integrations` · **HR** · hooks: `→ features/hr/settings`
- `/hr/settings/policies` · **HR** · hooks: `usePageState({permission:"hr:policies:view"})` + `PageWrapper state=`, `→ features/hr/policies` — the separate `!canView` return that re-declared the page chrome is gone
- `/hr/settings/preview` · **HR** · hooks: `→ features/hr/settings`
- `/hr/settings/templates` · **HR** · hooks: `→ features/hr/settings`
- `/hr/settings/versions` · **HR** · hooks: `→ features/hr/settings`
- `/hr/settings/workflows` · **HR** · hooks: `→ features/hr/settings`

### Access
- `/hr/access` · **HR** · hooks: `→ features/hr` — 2026-09-21: the route wraps its `useSearchParams` consumer in `<Suspense fallback={<Loading/>}>` (the route's own `loading.tsx` skeleton), matching `payroll/settings/import-export`; pinned by `app/(authenticated)/hr/hr-search-params-suspense.test.ts`

---

## Payroll

### Hub
- `/payroll` · **Payroll** · hooks: `useCommandCenter`, `useCreateRun`, `useCan("payroll:runs:view")`, `useCan("payroll:runs:manage")` (2026-09-21: the KPI row and every `TabsList` fade the edge that hides more via `useHorizontalOverflow`, so a clipped row reads as scrollable at 390/768 — FE#76)
- `/payroll/readiness` · **Payroll** · hooks: `usePayrollReadiness(month)` → `GET /payroll/readiness` (2026-09-21: the pay-period readiness ledger — timesheets approved → hours exported → received → acknowledged → inputs locked → run generated, each with owner, timestamp and next action; exceptions for periods awaiting a decision, hours approved after export, rejected exports and periods reopened after their hours reached payroll; state via `usePageState` + `PageState`; sidebar "Readiness" under Payroll)

### Core payroll operations
- `/payroll/runs` · **Payroll** · hooks: `→ features/payroll/runs` (2026-09-21: `loading.tsx` shows the table's real column headers under the page title while the rows load)
- `/payroll/runs/[runId]` · **Payroll** · hooks: `→ features/payroll/runs` (2026-09-21: `loading.tsx` shows the table's real column headers under the page title while the rows load (the Employees tab))
- `/payroll/employees` · **Payroll** · hooks: `→ features/payroll/employees` (2026-09-21: `loading.tsx` shows the table's real column headers under the page title while the rows load)
- `/payroll/employees/[employeeUserId]` · **Payroll** · hooks: `→ features/payroll/employees`
- `/payroll/workers/[workerId]` · **Payroll** · hooks: `→ features/payroll/workers`
- `/payroll/payslips` · **Payroll** · hooks: `→ features/payroll/payslips`
- `/payroll/bank-transfers` · **Payroll** · hooks: `→ features/payroll/bank-transfers` (2026-09-21: the batch detail sheet's skeleton derives its headers from the batch columns)
- `/payroll/inputs` · **Payroll** · hooks: `→ features/payroll/inputs` (2026-09-21: `loading.tsx` shows the table's real column headers under the page title while the rows load (the Attendance tab); every input tab renders `ErrorState` with retry on a failed snapshot read instead of "Build the period first" (FE#153))
- `/payroll/bonuses` · **Payroll** · hooks: `→ features/payroll/bonuses`
- `/payroll/loans` · **Payroll** · hooks: `→ features/payroll/loans` (2026-09-21: `loading.tsx` shows the table's real column headers under the page title while the rows load)
- `/payroll/reimbursements` · **Payroll** · hooks: `→ features/payroll/reimbursements` (2026-09-21: `loading.tsx` shows the table's real column headers under the page title while the rows load)
- `/payroll/fnf` · **Payroll** · hooks: `→ features/payroll/fnf` (2026-09-21: `loading.tsx` shows the table's real column headers under the page title while the rows load)
- `/payroll/fnf` · **Payroll** · hooks: `→ features/payroll/fnf` (2026-09-21: nav label, title, table, detail sheet, error boundary and statement download say "Final settlement"; route `/payroll/fnf` and `payroll:fnf:*` keys unchanged)
- `/payroll/taxes` · **Payroll** · hooks: `→ features/payroll/taxes` (2026-09-21: the Filings tab renders `ErrorState` with retry on a failed `usePayrollFilings` read instead of "No filings prepared" (FE#153))
- `/payroll/team` · **Payroll** · hooks: `→ features/payroll/team`

### Configuration
- `/payroll/salary-structures` · **Payroll** · hooks: `→ features/payroll`
- `/payroll/components` · **Payroll** · hooks: `→ features/payroll` (2026-09-21: `loading.tsx` shows the table's real column headers under the page title while the rows load)
- `/payroll/templates` · **Payroll** · hooks: `→ features/payroll`

### Reports & Setup
- `/payroll/reports` · **Payroll** · hooks: `→ features/payroll/reports`
- `/payroll/setup` · **Payroll** · hooks: `→ features/payroll/setup`

### Settings
- `/payroll/settings` · **Payroll** · hooks: `→ features/payroll/settings` (2026-09-21: the payroll calendar renders `ErrorState` with retry on a failed `usePayrollCalendar` read instead of "No calendar events" (FE#153); the policy version history skeleton derives its headers from its columns)
- `/payroll/settings/import-export` · **Payroll** · hooks: `requirePermission("payroll:reports:view")` (server) — server component; Suspense loading fallback; delegates entirely to feature component; import/export only, no CRUD

### Self-service
- `/payroll/me` · **Payroll** [RETIRED 2026-08-30: file deleted; self-service pay is at `/me/pay` (no `requiredPermission`, universal for all active members)]

### Access
- `/payroll/access` · **Payroll** · hooks: `→ features/payroll`

---

## Accounting

### Hub
- `/accounting` · **Accounting** · hooks: `→ features/accounting/overview`

### Invoices & Receivables
- `/accounting/invoices` · **Accounting** · hooks: `useInvoices`, `useInvoiceStats`, `useVoidInvoice`, `useCan("accounting:receivables:manage")`
- `/accounting/invoices/new` · **Accounting** · hooks: `→ features/accounting/sales` — invoice composer; gated `accounting:receivables:manage`
- `/accounting/invoices/[invoiceId]` · **Accounting** · hooks: `→ features/accounting/sales`
- `/accounting/recurring-invoices` · **Accounting** [RETIRED: no page.tsx found 2026-09-21; ARs may have been consolidated]
- `/accounting/payments-received` · **Accounting** · hooks: `→ features/accounting`
- `/accounting/credit-notes` · **Accounting** · hooks: `→ features/accounting/sales`
- `/accounting/credit-notes/new` · **Accounting** · hooks: `→ features/accounting/sales` — credit note composer; gated `accounting:credit-notes:create`
- `/accounting/credit-notes/[creditNoteId]` · **Accounting** · hooks: `→ features/accounting/sales` — credit note detail; gated `accounting:credit-notes:read`
- `/accounting/customers/[partyId]` · **Accounting** · hooks: `→ features/accounting`
- `/accounting/customers` · **Accounting** · hooks: `→ features/accounting`
- `/accounting/payment-reminders` · **Accounting** [RETIRED: no page.tsx found 2026-09-21]
- `/accounting/aged-receivables` · **Accounting** · hooks: `→ features/accounting`

### Purchase & Payables
- `/accounting/purchase-bills` · **Accounting** · hooks: `usePurchaseBills`, `useCreatePurchaseBill`, `useCan("accounting:payables:approve")`, `useCan("accounting:payables:manage")` — cursor pagination; search + status filters URL-synced; `EmptyState` with `EmptyExpensesIllustration` ✓; minor: empty state action shows "New bill" without checking `canManage`
- `/accounting/purchase-bills/new` · **Accounting** · hooks: `→ features/accounting/purchase-bills`
- `/accounting/purchase-bills/[apDocumentId]` · **Accounting** · hooks: `→ features/accounting/purchase-bills`
- `/accounting/vendor-payments` · **Accounting** · hooks: `useVendorPayments`, `useCreateVendorPayment`, `useCan("accounting:payables:manage")` — dual cursor queries (paid + partial) merged; vendor filter URL-synced; `EmptyState` with `illustrationPreset="tasks"` ✓
- `/accounting/vendor-credits` · **Accounting** · hooks: `→ features/accounting`
- `/accounting/vendor-credits/new` · **Accounting** · hooks: `→ features/accounting/purchases` — vendor credit composer (DEBIT_NOTE type); `ApDocumentNewPage`
- `/accounting/vendors/[vendorId]` · **Accounting** · hooks: `→ features/accounting`
- `/accounting/vendors` · **Accounting** · hooks: `→ features/accounting`
- `/accounting/recurring-bills` · **Accounting** [RETIRED: no page.tsx found 2026-09-21]
- `/accounting/aged-payables` · **Accounting** · hooks: `→ features/accounting`

### Chart of Accounts & Journal
- `/accounting/coa` · **Accounting** · hooks: `→ features/accounting/coa`
- `/accounting/coa/[accountId]` · **Accounting** [RETIRED: no page.tsx found 2026-09-21; account detail may have been merged into the COA list view] — detail; Edit via `EditAccountDialog`; journal preview table capped at 20 rows (acceptable for preview); not-found uses bespoke div, not `EmptyState` (minor)
- `/accounting/journal` · **Accounting** · hooks: `useJournalEntries`, `useCan("accounting:journal:create")` — cursor pagination (pageSize 25, server mode); filters: date range, source, status, URL-synced; `useCan` gates create button only — no `enabled` view-gate on the list query (403-spam for non-finance roles); `EmptyState` with `EmptyReportIllustration` ✓
- `/accounting/journal/new` · **Accounting** [RETIRED: no page.tsx found 2026-09-21; journal entry creation appears to be form-within-list or was removed]
- `/accounting/journal/[journalId]` · **Accounting** · hooks: `useJournalEntry`, `usePostJournalEntry`, `useReverseJournalEntry`, `useSubmitJournalApproval`, `useCan("accounting:journal:post")`, `useCan("accounting:journal:approve")` — detail; post, submit-for-approval, approve, reject, reverse lifecycle; `LoadingState` and `ErrorState` ✓; not-found renders `ErrorState` ✓
- `/accounting/general-ledger` · **Accounting** · hooks: `→ features/accounting`
- `/accounting/opening-balances` · **Accounting** · hooks: `→ features/accounting`
- `/accounting/dimensions` · **Accounting** [RETIRED: no page.tsx found 2026-09-21]

### Banking
- `/accounting/banking` · **Accounting** · hooks: `→ features/accounting/banking`
- `/accounting/banking/[bankAccountId]` · **Accounting** [RETIRED: no page.tsx found 2026-09-21]
- `/accounting/banking/import` · **Accounting** · hooks: `→ features/accounting/banking`
- `/accounting/banking/reconciliation` · **Accounting** · hooks: `→ features/accounting/banking`
- `/accounting/banking/transfers` · **Accounting** [RETIRED: no page.tsx found 2026-09-21]

### Payments, Runs & Approvals
- `/accounting/payment-runs` · **Accounting** [RETIRED: no page.tsx found 2026-09-21]
- `/accounting/payment-runs/[runId]` · **Accounting** [RETIRED: no page.tsx found 2026-09-21]
- `/accounting/approvals` · **Accounting** [RETIRED: no page.tsx found 2026-09-21]

### Taxes
- `/accounting/taxes` · **Accounting** · hooks: `→ features/accounting/taxes`
- `/accounting/taxes/codes` · **Accounting** [RETIRED: no page.tsx found 2026-09-21; tax codes may live inside the taxes hub]
- `/accounting/taxes/payments` · **Accounting** [RETIRED: no page.tsx found 2026-09-21]
- `/accounting/taxes/reports` · **Accounting** [RETIRED: no page.tsx found 2026-09-21]
- `/accounting/gstr-1` · **Accounting** [RETIRED: no page.tsx found 2026-09-21]
- `/accounting/gstr-3b` · **Accounting** [RETIRED: no page.tsx found 2026-09-21]

### Financial Reports
- `/accounting/profit-loss` · **Accounting** · hooks: `→ features/accounting/reports`
- `/accounting/balance-sheet` · **Accounting** · hooks: `→ features/accounting/reports`
- `/accounting/trial-balance` · **Accounting** · hooks: `→ features/accounting/reports`
- `/accounting/cash-flow` · **Accounting** · hooks: `→ features/accounting/reports`
- `/accounting/forecast` · **Accounting** [RETIRED: no page.tsx found 2026-09-21]
- `/accounting/scenarios` · **Accounting** [RETIRED: no page.tsx found 2026-09-21]
- `/accounting/period-close` · **Accounting** · hooks: `→ features/accounting`

### Assets
- `/accounting/assets` · **Accounting** [RETIRED: no page.tsx found 2026-09-21]
- `/accounting/assets/[assetId]` · **Accounting** [RETIRED: no page.tsx found 2026-09-21]
- `/accounting/assets/depreciation` · **Accounting** [RETIRED: no page.tsx found 2026-09-21]

### Budgets
- `/accounting/budgets` · **Accounting** [RETIRED: no page.tsx found 2026-09-21; OPEN items preserved: (1) `pageSize: 100` hard-coded; (2) no view-gate on list query]
- `/accounting/budgets/[budgetId]` · **Accounting** [RETIRED: no page.tsx found 2026-09-21]

### Expenses
- `/accounting/expenses` · **Accounting** [RETIRED: no page.tsx found 2026-09-21]
- `/accounting/expenses/policies` · **Accounting** [RETIRED: no page.tsx found 2026-09-21]
- `/accounting/expenses/receipts` · **Accounting** [RETIRED: no page.tsx found 2026-09-21]
- `/accounting/expenses/reimbursements` · **Accounting** [RETIRED: no page.tsx found 2026-09-21]
- `/accounting/expenses/reimbursements/[batchId]` · **Accounting** [RETIRED: no page.tsx found 2026-09-21]

### Sub-reports
- `/accounting/reports` · **Accounting** · hooks: `→ features/accounting/reports`
- `/accounting/reports/aging` · **Accounting** · hooks: `→ features/accounting/reports` — AR/AP aging report
- `/accounting/reports/burn-rate` · **Accounting** [RETIRED: no page.tsx found 2026-09-21]
- `/accounting/reports/customer-statement` · **Accounting** [RETIRED: no page.tsx found 2026-09-21]
- `/accounting/reports/department-profitability` · **Accounting** [RETIRED: no page.tsx found 2026-09-21]
- `/accounting/reports/expense-by-category` · **Accounting** [RETIRED: no page.tsx found 2026-09-21]
- `/accounting/reports/project-profitability` · **Accounting** [RETIRED: no page.tsx found 2026-09-21]
- `/accounting/reports/sales-by-customer` · **Accounting** [RETIRED: no page.tsx found 2026-09-21]
- `/accounting/reports/sales-by-item` · **Accounting** [RETIRED: no page.tsx found 2026-09-21]
- `/accounting/reports/tax-summary` · **Accounting** [RETIRED: no page.tsx found 2026-09-21]
- `/accounting/reports/vendor-statement` · **Accounting** [RETIRED: no page.tsx found 2026-09-21]
- `/accounting/reports/working-capital` · **Accounting** [RETIRED: no page.tsx found 2026-09-21]

### Settings
- `/accounting/settings` · **Accounting** · hooks: `useAccountingSettings`, `useUpdateAccountingSettings`, `useCan("accounting:settings:manage")` — company + tax registration forms; ISSUE: loading and error branches return bare `<div>` wrappers, not `PageWrapper` with `LoadingState`/`ErrorState`
- `/accounting/settings/automations` · **Accounting** · hooks: `→ features/accounting/settings`
- `/accounting/settings/payment-providers` · **Accounting** · hooks: `→ features/accounting/settings`
- `/accounting/setup` · **Accounting** · hooks: `→ features/accounting/setup`
- `/accounting/access` · **Accounting** · hooks: `→ features/accounting`

---

## Inventory

### Hub
- `/inventory` · **Inventory** · hooks: `→ features/inventory/inventory-dashboard-client`

### Products
- `/inventory/products` · **Inventory** · hooks: `useProducts`, `useCategories`, `useArchiveProduct`, `useRestoreProduct`, `useDeleteProduct`, `useCan("inventory:products:create/update/delete")`
- `/inventory/products/new` · **Inventory** · hooks: `→ features/inventory/products`
- `/inventory/products/[productId]` · **Inventory** · hooks: `→ features/inventory/products`
- `/inventory/products/categories` · **Inventory** · hooks: `→ features/inventory/products`
- `/inventory/products/uom` · **Inventory** · hooks: `→ features/inventory/products`

### Stock Management
- `/inventory/stock` · **Inventory** · hooks: `→ features/inventory/stock`
- `/inventory/stock/adjustments` · **Inventory** · hooks: `→ features/inventory/stock`
- `/inventory/stock/movements` · **Inventory** · hooks: `→ features/inventory/stock`
- `/inventory/stock/transfers` · **Inventory** · hooks: `→ features/inventory/stock`
- `/inventory/stock/transfers/[transferId]` · **Inventory** · hooks: `→ features/inventory/stock`
- `/inventory/stock/transit` · **Inventory** · hooks: `→ features/inventory` — in-transit stock view; `TransitClient`

### Lots & Serials
- `/inventory/lots` · **Inventory** · hooks: `→ features/inventory/lots`
- `/inventory/lots/[lotId]` · **Inventory** · hooks: `→ features/inventory/lots`
- `/inventory/serials` · **Inventory** · hooks: `→ features/inventory/serials`
- `/inventory/serials/[serialId]` · **Inventory** · hooks: `→ features/inventory/serials`

### Purchase & Sales Orders
- `/inventory/purchase-orders` · **Inventory** · hooks: `→ features/inventory/purchase-orders`
- `/inventory/purchase-orders/new` · **Inventory** · hooks: `→ features/inventory/purchase-orders`
- `/inventory/purchase-orders/[poId]` · **Inventory** · hooks: `→ features/inventory/purchase-orders`
- `/inventory/sales-orders` · **Inventory** · hooks: `→ features/inventory/sales-orders`
- `/inventory/sales-orders/new` · **Inventory** · hooks: `→ features/inventory/sales-orders`
- `/inventory/sales-orders/[soId]` · **Inventory** · hooks: `→ features/inventory/sales-orders`

### Warehouse Operations
- `/inventory/warehouses` · **Inventory** · hooks: `→ features/inventory/warehouses`
- `/inventory/warehouses/[warehouseId]` · **Inventory** · hooks: `→ features/inventory/warehouses`
- `/inventory/operations` · **Inventory** · hooks: `→ features/inventory/operations`
- `/inventory/operations/receipts` · **Inventory** · hooks: `→ features/inventory/operations`
- `/inventory/operations/picking` · **Inventory** · hooks: `→ features/inventory/operations`
- `/inventory/operations/packing` · **Inventory** · hooks: `→ features/inventory/operations`
- `/inventory/operations/shipping` · **Inventory** · hooks: `→ features/inventory/operations`
- `/inventory/operations/returns` · **Inventory** · hooks: `→ features/inventory/operations`
- `/inventory/operations/issues` · **Inventory** · hooks: `→ features/inventory/operations`
- `/inventory/operations/putaway` · **Inventory** · hooks: `→ features/inventory` — putaway workbench; `PutawayWorkbenchPage`
- `/inventory/shipments` · **Inventory** · hooks: `→ features/inventory/shipments`
- `/inventory/loads` · **Inventory** · hooks: `→ features/inventory/loads`
- `/inventory/packages` · **Inventory** · hooks: `→ features/inventory/packages`
- `/inventory/carriers` · **Inventory** · hooks: `→ features/inventory/carriers`

### Suppliers & 3PL
- `/inventory/vendors` · **Inventory** · hooks: `→ features/inventory/vendors`
- `/inventory/vendors/[vendorId]` · **Inventory** · hooks: `→ features/inventory/vendors`
- `/inventory/3pl` · **Inventory** · hooks: `→ features/inventory`
- `/inventory/channels` · **Inventory** · hooks: `→ features/inventory`

### Quality
- `/inventory/quality` · **Inventory** · hooks: `→ features/inventory/quality`
- `/inventory/quality/inspections` · **Inventory** · hooks: `→ features/inventory/quality`
- `/inventory/quality/holds` · **Inventory** · hooks: `→ features/inventory/quality`
- `/inventory/quality/plans` · **Inventory** · hooks: `→ features/inventory/quality` — quality control plans
- `/inventory/quality/recalls` · **Inventory** · hooks: `→ features/inventory/quality`

### Counting & Audits
- `/inventory/cycle-counts` · **Inventory** · hooks: `→ features/inventory/cycle-counts`
- `/inventory/cycle-counts/[countId]` · **Inventory** · hooks: `→ features/inventory/cycle-counts`
- `/inventory/physical-audits` · **Inventory** · hooks: `→ features/inventory/physical-audits`
- `/inventory/physical-audits/[auditId]` · **Inventory** · hooks: `→ features/inventory/physical-audits`

### Analytics & Reporting
- `/inventory/forecasting` · **Inventory** · hooks: `→ features/inventory/forecasting`
- `/inventory/replenishment` · **Inventory** · hooks: `→ features/inventory/replenishment`
- `/inventory/replenishment/drift` · **Inventory** · hooks: `→ features/inventory` — forecast drift; `ForecastDriftClient`
- `/inventory/replenishment/rules` · **Inventory** · hooks: `→ features/inventory/replenishment`
- `/inventory/replenishment/transfers` · **Inventory** · hooks: `→ features/inventory` — transfer recommendations; `TransferRecommendationsClient`
- `/inventory/reports` · **Inventory** · hooks: `useAccess, useCan` — report index; links each report, gates the list on the reader's own permissions
- `/inventory/reports/stock-summary` · **Inventory** · hooks: `→ features/inventory/reports`
- `/inventory/reports/movements` · **Inventory** · hooks: `→ features/inventory/reports`
- `/inventory/reports/slow-moving` · **Inventory** · hooks: `→ features/inventory/reports`
- `/inventory/reports/reorder` · **Inventory** · hooks: `→ features/inventory/reports`
- `/inventory/reports/expiry` · **Inventory** · hooks: `→ features/inventory/reports`
- `/inventory/reports/allocation-overrides` · **Inventory** · hooks: `→ features/inventory/reports` — allocation override report; `AllocationOverridesClient`
- `/inventory/reports/audit-trail` · **Inventory** · hooks: `→ features/inventory/reports` — inventory audit trail
- `/inventory/reports/throughput` · **Inventory** · hooks: `→ features/inventory/reports` — throughput dashboard; `ThroughputDashboardPage`
- `/inventory/expiry` · **Inventory** · hooks: `→ features/inventory`
- `/inventory/valuation` · **Inventory** · hooks: `→ features/inventory/valuation`
- `/inventory/costing` · **Inventory** · hooks: `→ features/inventory/costing`

### Advanced Warehouse & Fulfilment
- `/inventory/ai` · **Inventory** · hooks: `→ features/inventory` — AI assistant for inventory; `InventoryAiClient`
- `/inventory/consignment` · **Inventory** · hooks: `→ features/inventory` — consignment stock management
- `/inventory/dark-stores` · **Inventory** · hooks: `→ features/inventory` — dark store locations; `DarkStoresClient`
- `/inventory/dock` · **Inventory** · hooks: `→ features/inventory` — dock scheduling
- `/inventory/handling-units` · **Inventory** · hooks: `→ features/inventory` — handling unit (pallet/carton) management
- `/inventory/kits` · **Inventory** · hooks: `→ features/inventory` — kit / bundle management
- `/inventory/labor` · **Inventory** · hooks: `→ features/inventory` — warehouse labor tracking
- `/inventory/landed-cost` · **Inventory** · hooks: `→ features/inventory` — landed cost allocation; `LandedCostClient`
- `/inventory/pick-lists` · **Inventory** · hooks: none — redirect to `/inventory/operations/picking`; alias so bookmarks and nav labels ("Pick lists") resolve to the picking workbench
- `/inventory/projects` · **Inventory** · hooks: `→ features/inventory` — inventory projects (manufacturing/production orders); `ProjectsClient`
- `/inventory/projects/[projectId]` · **Inventory** · hooks: `→ features/inventory` — project detail; `ProjectDetailClient`
- `/inventory/quick-commerce` · **Inventory** · hooks: `→ features/inventory` — quick-commerce order fulfillment
- `/inventory/reconciliation` · **Inventory** · hooks: `→ features/inventory` — inventory reconciliation; `ReconciliationClient`
- `/inventory/reconciliation/gl` · **Inventory** · hooks: `→ features/inventory` — GL reconciliation; `GlReconciliationClient`
- `/inventory/rf` · **Inventory** · hooks: `→ features/inventory` — RF (radio-frequency) scanner hub; links to pick and putaway flows
- `/inventory/rf/pick` · **Inventory** · hooks: `→ features/inventory` — RF picking queue
- `/inventory/rf/pick/[pickListId]` · **Inventory** · hooks: `→ features/inventory` — RF pick list execution
- `/inventory/rf/putaway` · **Inventory** · hooks: `→ features/inventory` — RF putaway queue
- `/inventory/rf/putaway/[taskId]` · **Inventory** · hooks: `→ features/inventory` — RF putaway task execution
- `/inventory/slotting` · **Inventory** · hooks: `→ features/inventory` — slot / bin optimization

### Misc
- `/inventory/barcode` · **Inventory** · hooks: `→ features/inventory`
- `/inventory/import` · **Inventory** · hooks: `→ features/inventory`
- `/inventory/settings` · **Inventory** · hooks: `→ features/inventory/settings`
- `/inventory/access` · **Inventory** · hooks: `→ features/inventory`

---

## Knowledge (Wiki / KB)

- `/knowledge/wiki` · **Knowledge** · hooks: `requireSession`, `RequireModule module="kb"`, `→ features/wiki` — WikiShell hides the Documents product sidebar; header Collapse sidebar toggles the wiki rail; Ask KB is a wiki-nav row to `/knowledge/chat`; expanded rail has no Wiki title bar (New page is the home header primary); recents and favorites live on this home surface plus sidebar shortcuts, not as separate destinations; cards show the page cover strip when one is set; Quick find snippets render `ts_headline` matches as emphasis, not raw `<b>` tags
- `/knowledge/wiki/spaces` · **Knowledge** · hooks: `→ features/wiki`
- `/knowledge/wiki/spaces/[spaceId]` · **Knowledge** · hooks: `→ features/wiki`
- `/knowledge/wiki/doc/[pageId]` · **Knowledge** · hooks: `→ features/wiki` — title and More live outside the editor so they stay clickable; AI / Share / More are icon-only; cover banner, Cover/Favorite badges, and home-card cover strips show whether a cover is set; Ask about this page is a chat thread with a pinned composer, not a one-shot form; the format bar font-size control is a compact − / size / + group, not a native number stepper
- `/knowledge/wiki/doc/[pageId]/history` · **Knowledge** · hooks: `→ features/wiki`
- `/knowledge/wiki/private` · **Knowledge** · hooks: `→ features/wiki`
- `/knowledge/wiki/shared` · **Knowledge** · hooks: `→ features/wiki`
- `/knowledge/wiki/templates` · **Knowledge** · hooks: `usePageState` + `<PageState>` (saved-templates tab), `→ features/wiki` — Starters and Saved are URL-synced tabs (`?tab=saved`); a fetch error on Saved is a real error with retry, and Starters stay available on their own tab
- `/knowledge/wiki/trash` · **Knowledge** · hooks: `→ features/wiki` — Trash retention (auto-purge days) lives here for managers; there is no separate wiki Settings page
- `/knowledge/wiki/reviews` · **Knowledge** · hooks: `→ features/wiki`
- `/knowledge/wiki/import` · **Knowledge** · hooks: `→ features/wiki` — sidebar label is Import & Export; Import and Export are URL-synced tabs (`?tab=export`); Choose files and Paste text are Import-tab header actions; recent imports show uploaded page titles (from job `errorReport.itemTitles`) with client-side pagination
- `/knowledge/wiki/analytics` · **Knowledge** · hooks: `→ features/wiki`
- `/knowledge/chat` · **Knowledge** · hooks: `→ features/wiki`
- `/knowledge/research-briefs` · **Knowledge** · hooks: `requirePermission("kb:pages:view")`, `useKbResearchBriefs`, `useCreateResearchBrief`, `→ features/help-centre` — components live under `features/help-centre/`, the route under `knowledge/`; there is no Support-owned twin
- `/knowledge/research-briefs/[briefId]` · **Knowledge** · hooks: `enforceRouteAccess`, `useKbResearchBrief`, `useRetryResearchBrief`, `useCancelResearchBrief`, `useRateResearchBrief`, `useConvertResearchBriefToPage`, `→ features/help-centre` — brief detail refuses the whole brief (404) when any cited record is no longer visible, rather than redacting the citation; Convert to page posts `/kb/research-briefs/:briefId/convert-to-page` and routes to the created page

### Legacy
- `/knowledge-base` · **Knowledge (legacy)** [RETIRED 2026-08-30: file deleted; canonical KB is at `/knowledge/wiki/**`]
- `/knowledge` · **Knowledge** · hooks: none — redirect to `/knowledge/chat`; top-level alias for the knowledge hub
- `/docs` · **Platform** · hooks: none — redirect to `/knowledge/wiki`; alias route for convenience linking
- `/kb` · **Platform** · hooks: none — redirect to `/knowledge/wiki`; alias route (replaces the old `/knowledge-base` path shape)

---

## Me (Self-service — universal for all active members)

- `/me/attendance` · **Self-service** · hooks: `requirePermission("self:attendance")` (server), `→ features/me/attendance` — VIOLATION: server component uses `requirePermission` with `self:*` key; §8/CLAUDE.md rule: `/me/*` must NEVER carry `requiredPermission` (universal for all active members)
- `/me/documents` · **Self-service** · hooks: `requirePermission("self:onboarding-docs")` (server), `→ features/me/documents` — VIOLATION: `requirePermission` on a `/me/*` route; must be removed
- `/me/expenses` · **Self-service** · hooks: `requirePermission("self:expenses")` (server), `→ features/me/expenses` — VIOLATION: `requirePermission` on a `/me/*` route; must be removed
- `/me/onboarding` · **Self-service** · hooks: `→ features/me/onboarding`
- `/me/pay` · **Self-service** · hooks: `requireSession()` (server), `usePageState` (error only) + `PageWrapper state=`, `→ features/payroll/me` — universal no-gate zone holds: NO module and NO permission passed to `usePageState`. Per-card skeletons kept deliberately, so page-level loading is not used; a failed overview read now shows an error with retry instead of silently blank cards (2026-09-21: the salary structure section renders `ErrorState` + `getErrorMessage` with retry, wrapping in full at 390 — FE#77)
- `/me/pay` · **Self-service** · hooks: `requireSession()` (server), `usePageState` (error only) + `PageWrapper state=`, `→ features/payroll/me` — universal no-gate zone holds: NO module and NO permission passed to `usePageState`. Per-card skeletons kept deliberately, so page-level loading is not used; a failed overview read now shows an error with retry instead of silently blank cards (2026-09-21: the Final settlement tab is also shown when its read fails, rendering `ErrorState` with retry rather than vanishing)
- `/me/recruitment` · **Self-service** · hooks: `requirePermission("self:recruitment")` (server), `→ features/employee-self-service` — serves assigned interviews and own hiring feedback. A `self:*` key is what §8 prescribes for `/me/*` and is a member default, so it denies nobody; internal job openings live at `/me/job-openings`
- `/me/job-openings` · **Self-service** · hooks: `requirePermission("self:job-openings")` (server), `useSelfJobOpenings` — §8 member entitlement: browse internal openings and apply. Backend `GET|POST /hr/recruitment/me/job-openings*`, no `@RequireModule`
- `/me/referrals` · **Self-service** · hooks: `requirePermission("self:referrals")` (server), `useSelfReferrals` — §8 member entitlement: submit and track own referrals. Backend `GET|POST /hr/recruitment/me/referrals`, no `@RequireModule`
- `/me/support` · **Self-service** · hooks: `requireSession()` (server), `→ features/employee-support` (`MySupportPage`: `useMySupportRequests`, `useMySupportRequest`, `useCreateMySupportRequest`, `useAddMySupportComment` under `hooks/api/employee-self-service/support.ts`) — 2026-09-21: the employee side of Employee support. `self:support` is a member default (§8), backend `GET|POST /me/support*` carries no `@RequireModule`. One primary action, `Create request` (`EntityFormDialog`, `Idempotency-Key` fenced through `useAuthorizedIdempotentMutation`): category routes the request to a queue server-side, HR/Legal default to confidential and the dialog says so. The list shows status, priority, the SLA marker and the confidential badge; a request opens in a read-only detail sheet with the conversation and a reply box. State through `usePageState` + `<PageState>` (no module: universal zone); loading keeps the title and typed headers, error has retry, empty state offers `Create request`, denial renders `NoPermissionState` rather than an empty list.
- `/me/time-off` · **Self-service** · hooks: `requirePermission("self:leaves")` (server), `→ features/me/time-off` — VIOLATION: `requirePermission` on a `/me/*` route; must be removed
- `/me/team` · **Self-service** · hooks: `requireSession()` (server), `useManagerHome()` → `GET /me/team` (universal), `usePageState` (no permission, no module) + `PageState` (2026-09-21: the manager home — requests routed to the viewer as reporting manager (leave, WFH, timesheets, workflows) oldest first with due dates, the direct-report roster with today's presence, unsettled timesheets and probation end, missing timesheets, approved leave over the next fortnight and probation ending within thirty days; a member nobody reports to sees "Nobody reports to you yet"; sidebar "My Team" under For Me)

---

## Support


### Hub & inbox
- `/support` · **Support** · hooks: `→ features/support`
- `/support/inbox` · **Support** · hooks: `→ features/support/inbox`
- `/support/routing` · **Support** · hooks: `→ features/support/routing`
- `/support/macros` · **Support** · hooks: `→ features/support/macros`
- `/support/knowledge-gaps` · **Support** · hooks: `→ features/support`
- `/support/ai-report` · **Support** · hooks: `→ features/support`

### Support KB (internal help content)
- `/support/kb` · **Support** · hooks: `→ features/support/kb`
- `/support/kb/[articleId]` · **Support** · hooks: `→ features/support/kb`
- `/support/kb/research-briefs` · **Support** [RETIRED: no such file under `app/(authenticated)/support/kb/`; research briefs are Knowledge-owned at `/knowledge/research-briefs`]
- `/support/kb/research-briefs/[briefId]` · **Support** [RETIRED: no such file under `app/(authenticated)/support/kb/`; research brief detail is Knowledge-owned at `/knowledge/research-briefs/[briefId]`]

### Portal (customer-facing)
- `/support/portal` · **Support** · hooks: `→ features/support/portal`
- `/support/portal/[portalTicketId]` · **Support** · hooks: `→ features/support/portal`

### Reports
- `/support/reports` · **Support** · hooks: `→ features/support/reports`
- `/support/reports/agent-performance` · **Support** · hooks: `→ features/support/reports`
- `/support/reports/automation-performance` · **Support** · hooks: `→ features/support/reports`
- `/support/reports/channel-performance` · **Support** · hooks: `→ features/support/reports`
- `/support/reports/csat` · **Support** · hooks: `→ features/support/reports`
- `/support/reports/queue-performance` · **Support** · hooks: `→ features/support/reports`

### Settings
- `/support/settings/agent-routing` · **Support** · hooks: `→ features/support/settings`
- `/support/settings/audit-log` · **Support** · hooks: `→ features/support/settings`
- `/support/settings/automations` · **Support** · hooks: `→ features/support/settings`
- `/support/settings/business-hours` · **Support** · hooks: `→ features/support/settings`
- `/support/settings/channels` · **Support** · hooks: `→ features/support/settings`
- `/support/settings/custom-fields` · **Support** · hooks: `→ features/support/settings`
- `/support/settings/sla` · **Support** · hooks: `→ features/support/settings`

### Access
- `/support/access` · **Support** · hooks: `→ features/support`

---

## Surveys

- `/surveys` · **Surveys** · hooks: `→ features/surveys` (`useSurveys`) — 2026-09-21: states resolve through `usePageState` + `<PageState>` with the read error passed; the Draft/Mode filters are server-side only (`keepPreviousData` was dropped, so a Published card no longer sits under the Draft filter while the filtered page loads — SURV-003); filter-empty renders "No surveys match your filters" + Clear filters; below `md` the two facet selects collapse into a Drawer behind a Filters button (SURV-004/005); primary action reads "Create survey"
- `/surveys/new` · **Surveys** · hooks: `→ features/surveys` (`useSurveyTemplates`, `useCreateSurvey`) — 2026-09-21: title "Create survey"; own `loading.tsx` and in-page skeleton share `TemplatePickerSkeleton` so the route fallback keeps this page's title instead of the list's; the create hang was the backend writing the first draft version on a second transaction (SURV-001)
- `/surveys/[surveyId]` · **Surveys** · hooks: `→ features/surveys` (`useSurvey`) — 2026-09-21: `SurveyDetailContent` resolves through `usePageState({ permission: "surveys:view" })` + `<PageState>` with the read error passed, so a failed read shows the backend message with retry and a denied reader sees Access Restricted, never an indefinite skeleton (SURV-002); own `loading.tsx` shares `SurveyDetailSkeleton`. Results tab: `GET /surveys/{surveyId}/analytics/questions` rows carry `minResponses` + `suppressed`; while a survey holds fewer anonymous submissions than the floor every question card renders `AnonymitySuppressedNotice` instead of its distribution or free text
- `/surveys/[surveyId]/participants` · **Surveys** · hooks: `→ features/surveys`
- `/surveys/live/[sessionId]/host` · **Surveys** · hooks: `→ features/surveys`
- `/surveys/access` · **Surveys** · hooks: `→ features/surveys`

---

## Workflows

- `/workflows` · **Workflows** · hooks: `useWorkflows`, `useCreateWorkflow`, `useDeleteWorkflow`, `useWorkflowStats` — ISSUES: (1) `limit: 50`, no pagination prop on `DataTable`; (2) no `useCan` gate on create button or list query; `EmptyState` with `EmptyProjectsIllustration` ✓; `AlertDialog` confirm on delete ✓
- `/workflows/[workflowId]` · **Workflows** · hooks: `→ features/workflows`
- `/workflows/[workflowId]/builder` · **Workflows** · hooks: `→ features/workflows/builder`
- `/workflows/analytics` · **Workflows** · hooks: `→ features/workflows`
- `/workflows/approvals` · **Workflows** · hooks: `→ features/workflows`
- `/workflows/executions` · **Workflows** · hooks: `→ features/workflows`
- `/workflows/scheduler` · **Workflows** · hooks: `→ features/workflows`
- `/workflows/secrets` · **Workflows** [RETIRED path: moved to `/workflows/settings/secrets`]
- `/workflows/templates` · **Workflows** · hooks: `→ features/workflows`
- `/workflows/variables` · **Workflows** [RETIRED path: moved to `/workflows/settings/variables`]
- `/workflows/access` · **Workflows** · hooks: `→ features/workflows`

### Settings (Workflows module)
- `/workflows/settings/access` · **Workflows** · hooks: `→ features/workflows/settings`
- `/workflows/settings/secrets` · **Workflows** · hooks: `→ features/workflows/settings`
- `/workflows/settings/variables` · **Workflows** · hooks: `→ features/workflows/settings`

---

## Sign (e-signature)

- `/sign` · **Sign** · hooks: `→ features/sign`
- `/sign/envelopes` · **Sign** · hooks: `→ features/sign/envelopes`
- `/sign/envelopes/[envelopeId]` · **Sign** · hooks: `→ features/sign/envelopes`
- `/sign/bulk-send` · **Sign** · hooks: `→ features/sign`
- `/sign/templates` · **Sign** · hooks: `→ features/sign/templates`
- `/sign/reports` · **Sign** · hooks: `→ features/sign/reports`
- `/sign/settings` · **Sign** · hooks: `→ features/sign/settings`
- `/sign/access` · **Sign** · hooks: `→ features/sign`

---

## Timesheets

- `/timesheets` · **Timesheets** · hooks: `→ features/timesheets` (2026-09-21: the week grid scroller fades its hidden edge and, below `sm`, says "Swipe sideways to reach every day of the week" whenever it overflows — FE#79; header wrapping at 768 landed earlier in 08f6406e2 — FE#80)
- `/timesheets` · **Timesheets** · hooks: `→ features/timesheets` (2026-09-21: My Time shows the shared `ApprovalRoutePanel` from `GET /timesheets/periods/{periodId}/approver` before submit — who approves, why, SLA, escalation — and disables Submit when nobody can own the period)
- `/timesheets/approvals` · **Timesheets** · hooks: `→ features/timesheets` (2026-09-21: the queue lists periods routed to the viewer, an Approver column names the rung, escalation and deadline (`approvalRoute`/`approvalDueAt`), the detail sheet spells out the routing explanation; `?period=<periodId>` — the link notifications and the payroll readiness ledger use — opens that period's detail sheet directly) (2026-09-21: `loading.tsx` shows the table's real column headers under the page title while the rows load)
- `/timesheets/billing` · **Timesheets** · hooks: `→ features/timesheets`
- `/timesheets/exceptions` · **Timesheets** · hooks: `→ features/timesheets` (2026-09-21: `loading.tsx` shows the table's real column headers under the page title while the rows load (open exceptions with the actions column))
- `/timesheets/overdue` · **Timesheets** · hooks: `→ features/timesheets` — overdue timesheets list; `enforceRouteAccess`
- `/timesheets/payroll` · **Timesheets** · hooks: `→ features/timesheets`
- `/timesheets/reports` · **Timesheets** · hooks: `→ features/timesheets/reports` (2026-09-21: the utilization, compliance, client-profitability and approval-SLA tab skeletons derive their headers from their column definitions)
- `/timesheets/settings` · **Timesheets** · hooks: `→ features/timesheets/settings` (2026-09-21: approval mode offers Manager or Auto only — multi-level is not configurable until it exists — and "Who approves" picks the reporting manager (default) or the dominant project's manager)
- `/timesheets/team` · **Timesheets** · hooks: `→ features/timesheets` (2026-09-21: `loading.tsx` shows the table's real column headers under the page title while the rows load (Member, the seven weekdays, Total, Status))
- `/timesheets/access` · **Timesheets** · hooks: `→ features/timesheets`

---

## Directory

- `/directory` · **Directory** · hooks: `→ features/directory`
- `/directory/workers` · **Directory** · hooks: `→ features/directory`
- `/directory/[personId]` · **Directory** · hooks: `→ features/directory`
- `/directory/access` · **Directory** · hooks: `→ features/directory`
- `/directory/settings` · **Directory (Administration view)** · hooks: `→ features/directory/people`
- `/directory/settings/[personId]` · **Directory (Administration view)** · hooks: `→ features/directory/people`

---

## Settings (Global Administration)

- `/settings` · **Settings** · hooks: `→ features/settings` — universal route, gate stays `enforceRouteAccess`; server-prefetched via `prefetchAccountSettings`.
- `/settings/users` · **Settings** · hooks: `→ features/settings/users` — C8 (2026-09-10): server-prefetched + `HydrationBoundary` via `prefetchSettingsUsers` (`/v2/users`, `/users/stats`); the initial key is derived from server `searchParams` through `readUsersListState`, shared with the page
- `/settings/roles` · **Settings** · hooks: `→ features/settings/roles`
- `/settings/roles/[roleId]` · **Settings** · hooks: `→ features/settings/roles`
- `/settings/roles/audit` · **Settings** · hooks: `→ features/settings/roles` — C8 (2026-09-10): server-prefetched + `HydrationBoundary` via `prefetchRolesAudit` over `RBAC_AUDIT_INITIAL_FILTERS`
- `/settings/roles/simulate` · **Settings** · hooks: `→ features/settings/roles` — C8 (2026-09-10): server-prefetched + `HydrationBoundary` via `prefetchRoleSimulation` (`/roles/simulate/candidates?limit=100`); the per-user simulate read stays client-side because it needs a selection
- `/settings/modules` · **Settings** · hooks: `→ features/settings/modules` — C8 (2026-09-10): server-prefetched + `HydrationBoundary` via `prefetchOrgModules`; converted from a client page + `DashboardGate` to a server wrapper with `requirePermission("settings:manage")` over `features/settings/modules/modules-page.tsx`
- `/settings/organization` · **Settings** · hooks: `→ features/settings/organization` — `PATCH /organization/security` is the only writer for `mfaEnforced`, `allowedEmailDomains` and `ipAllowlist`. OPEN: permissions and states not verified in a browser.
- `/settings/organization/branches` · **Settings** · hooks: `→ features/settings/organization`
- `/settings/organization/business-units` · **Settings** · hooks: `→ features/settings/organization`
- `/settings/organization/chart` · **Settings** · hooks: `→ features/settings/organization`
- `/settings/organization/cost-centers` · **Settings** · hooks: `→ features/settings/organization`
- `/settings/organization/departments` · **Settings** · hooks: `→ features/settings/organization`
- `/settings/organization/locations` · **Settings** · hooks: `→ features/settings/organization`
- `/settings/organization/structure` · **Settings** · hooks: `→ features/settings/organization`
- `/settings/organization/teams` · **Settings** · hooks: `→ features/settings/organization`
- `/settings/billing` · **Settings** · hooks: `→ features/settings/billing` — platform billing page 1 of 2; C8 (2026-09-10): server-prefetched + `HydrationBoundary` via `prefetchBillingSettings(tab)` — the `?tab` param selects which reads are prefetched, and `/billing/seats` is skipped for a viewer without `billing:seats:view`
- `/settings/billing/ai-credits` · **Settings** · hooks: `→ features/settings/billing` — platform billing page 2 of 2; C8 (2026-09-10): server-prefetched + `HydrationBoundary` via `prefetchAiCreditsSettings` (wallet, transactions, usage)
- `/settings/api-tokens` · **Settings** · hooks: `→ features/settings/api-tokens`
- `/settings/webhooks` · **Settings** · hooks: `→ features/settings/webhooks` — C8 (2026-09-10): server-prefetched + `HydrationBoundary` via `prefetchSettingsWebhooks`; the `?size` param feeds the initial key
- `/settings/audit-log` · **Settings** · hooks: `→ features/settings/audit-log` — C8 (2026-09-10): server-prefetched + `HydrationBoundary` via `prefetchSettingsAuditLog` (list + actions + target types); the initial key comes from `readAuditLogFilters(searchParams)`, shared with the page
- `/settings/delegations` · **Settings** · hooks: `→ features/settings/delegations` — C8 (2026-09-10): server-prefetched + `HydrationBoundary` via `prefetchSettingsDelegations` (received, given, discovery members); each list keys off its own `received*`/`granted*` params. S01 (2026-09-02): neither side bounded the delegation window, so a delegation could be granted for a century — a permanent shadow role. Capped at 90 days in `delegation-policy.ts` and mirrored in the form schema.
- `/settings/incoming-transfer` · **Settings** · hooks: `→ features/settings/incoming-transfer` — C8 (2026-09-10): classified NO PREFETCH NEEDED. `useIncomingOrgTransfers` declares `staleTime: 0` + `refetchOnMount: "always"`, so a hydrated offer is re-read on first mount anyway; a stale accept/decline offer is the one thing this page must not show. Pinned by `lib/prefetch/settings-prefetch-census.test.ts`

---

## Billing — Customer Invoicing

> These three routes are the org's own outbound customer invoicing (not platform billing). They are legitimate per root §8: "`/billing/invoices` is the org's own customer invoicing."

- `/billing/invoices` · **Accounting (customer invoicing)** · hooks: `→ features/billing/invoices`
- `/billing/invoices/new` · **Accounting (customer invoicing)** · hooks: `→ features/billing/invoices`
- `/billing/invoices/[invoiceId]` · **Accounting (customer invoicing)** · hooks: `→ features/billing/invoices`

---

## Blog (authenticated admin)

- `/blog/access` · **Blog** · hooks: `→ features/blog`
- `/blog/admin` · **Blog** · hooks: `→ features/blog`

---

## Parties & Subjects

- `/parties` · **Platform** · hooks: `→ features/parties`
- `/parties/duplicates` · **Platform** · hooks: `requirePermission("party:duplicates:view")` (server), `→ features/party/duplicates`
- `/subjects` · **Platform** · hooks: `→ features/subjects`

---

## Portal (authenticated — client portal management)

- `/portal` · **Build (client portal)** · hooks: `→ features/portal`
- `/portal/[projectId]` · **Build (client portal)** · hooks: `→ features/portal`

---

## Portal Group `(portal)` — external client portal

> External surface only — portal token auth (`portalApiClient`), no session JWT. Distinct from `(authenticated)/portal` (internal, session JWT, `useCan("build:portal:view")`).

- `/accept-invitation` · **Portal (client)** · hooks: `useAcceptInvitation`, `setPortalToken` — invitation acceptance flow; four states: missing token, loading, error (expired vs other), success redirect; StrictMode double-invoke guard via `calledRef`
- `/projects` · **Portal (client)** [RETIRED 2026-08-30: file deleted; moved to `/client-portal`]
- `/projects/[projectId]` · **Portal (client)** [RETIRED 2026-08-30: file deleted; moved to `/client-portal/[projectId]`]
- `/client-portal` · **Portal (client)** · hooks: `usePortalGuard`, `useExternalPortalProjects`
- `/client-portal/[projectId]` · **Portal (client)** · hooks: `usePortalGuard`, `usePortalProjectOverview`

---

## Public Group `(public)`

- `/about` · **Marketing** · hooks: none
- `/pricing` · **Marketing** · hooks: none
- `/signup` · **Auth** · hooks: `SignupForm` — renders a sign-up form, currently redirects to `/signin`; see `frontend/CLAUDE.md`
- `/contact` · **Marketing** · hooks: none
- `/waitlist` · **Marketing** [RETIRED path: no page.tsx found on disk]
- `/waitlist/claim/[claimToken]` · **Marketing** · hooks: none — workspace claim form for waitlist invitees; `ClaimForm` + `PublicShell`; token-gated, not indexed
- `/design-system` · **Dev** · hooks: none — dev-only gallery
- `/legal/privacy` · **Marketing** · hooks: none
- `/legal/security` · **Marketing** · hooks: none
- `/legal/terms` · **Marketing** · hooks: none
- `/blogs` · **Marketing** · hooks: `→ features/blog` — disk path: `(public)/blogs/(site)/page.tsx`; `(site)` is a route group, not a URL segment
- `/blogs/[postSlug]` · **Marketing** · hooks: `→ features/blog`
- `/blogs/category/[categorySlug]` · **Marketing** · hooks: `→ features/blog`
- `/blogs/tag/[tag]` · **Marketing** · hooks: `→ features/blog`
- `/careers/[orgSlug]` · **HR (public)** · hooks: `→ features/careers`
- `/careers/[orgSlug]/jobs/[jobId]/apply` · **HR (public)** · hooks: `→ features/careers`
- `/application-status/[applicationToken]` · **HR (public)** · hooks: `→ features/careers`
- `/interview-booking/[bookingToken]` · **HR (public)** · hooks: `→ features/careers`
- `/offer/[offerToken]` · **HR (public)** · hooks: `→ features/careers`
- `/nps/[npsToken]` · **Support (public)** · hooks: `→ features/support`
- `/ticket-feedback/[csatToken]` · **Support (public)** · hooks: `→ features/support`
- `/help/[orgId]` · **Support (public KB)** · hooks: `→ features/support/kb`
- `/help/[orgId]/[articleSlug]` · **Support (public KB)** · hooks: `→ features/support/kb`
- `/forms/[formToken]` · **Build/HR (public forms)** · hooks: `→ features/forms`
- `/intake/[projectId]` · **Build (public intake)** · hooks: `→ features/build/intake`
- `/board/[shareToken]` · **Build (public board share)** · hooks: `→ features/build/board`
- `/wiki/[shareToken]` · **Knowledge (public wiki share)** · hooks: `→ features/wiki`
- `/roadmap/[orgId]` · **Build (public roadmap)** · hooks: `→ features/build/roadmap`
- `/live/[sessionCode]` · **Surveys (live session)** · hooks: `→ features/surveys/live`
- `/live-chat/[orgId]` · **Support (live chat widget)** · hooks: `→ features/support/chat`
- `/vendor-portal/[vendorPortalToken]` · **Inventory/Accounting** · hooks: `→ features/vendor-portal`
- `/sign/[recipientToken]` · **Sign (public signing)** · hooks: `→ features/sign`
- `/s/[collectorToken]` · **Platform (short link)** · hooks: redirect
- `/refer/[orgId]` · **HR (public referral)** · hooks: `→ features/recruitment`
- `/refer/link/[referralToken]` · **HR (public referral)** · hooks: `→ features/recruitment`
- `/unsubscribe/[unsubscribeToken]` · **Platform (public)** · hooks: `usePublicUnsubscribe` — email unsubscribe flow; four states: loading, success, error, already-unsubscribed
