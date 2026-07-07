# Pages

Ordered money-path first. Check off each page after fixing.

> **Visual QA wave (2026-07-02)**: Screenshot-driven QA via Playwright harness (`frontend/scripts/screenshot-pages.mjs`, 375/768/1280, auth-state reuse, `SCREENSHOT_EMAIL/PASSWORD` env override) across all admin groups — ~50 files fixed from real pixels. Root-cause theme repair: `--accent` blue→slate-100 neutral hover pair (fixes invisible dropdown hover icons app-wide), borders full-opacity, header violet leftovers→ink/blue. New primitives: compact `StatCard`+`StatCardGrid` (~56px rows, one-row mobile scroll), generic `DataTable` (sort/pagination/selection/skeleton), PageWrapper v3 (equal-width mobile actions, mobile filters popover, one-line subtitle clamp, `backHref`). virabha reference recipe codified + applied (filters block SEPARATE from table card; sheet anatomy header/body/footer with fixed header+footer). All bespoke error/empty states → shared `ErrorState`/`EmptyState` (dashed container, outline CTA). Rules codified in `UI-UX-SYSTEM.md`: calculated heights (no magic numbers), big-form→Sheet, equal-width sheet footer buttons, no overlapped spacing, per-module identity accents (nav-only). Demo-account seed + failing-API triage: failures were unseeded-org only, wiring correct.

> **Visual program wave 3 (2026-07-02)**: DataTable `search`/`toolbar` props REMOVED — filters can never share the table card (6 org pages rewired to PageWrapper filters row; 12 accounting pages' in-card filter blocks lifted out). Module switcher redesigned (root cause: 40%-opacity selected border — now per-module accent border + check; trigger shows accent-tinted current module). Per-module nav accents (MODULE_ACCENTS) across rail/sidebar/switcher. Create-workspace 404 → Dialog (create → switch → dashboard). Hidden products root-caused: module key case/name mismatch (`hrms` vs `"HR"`) — all products visible, disabled ones locked → /settings/modules. Module enable FIXED (3-point chain): catalog-merged list endpoint, dual-store transactional sync (`org_modules` + `organizations.enabledModules` via array_append/remove), cache bust + JWT/session refresh on toggle — DB-probe verified both stores agree incl. revert; 19 entitlements unit tests pass. PhoneInput standardized across 20 forms + rule in doc. Duplicate "API Keys" nav entry removed (Platform group). Dev rate limits ×10 (prod unchanged) + fixed cross-tier shared-bucket bug in the in-memory limiter. Demo org seeded (`seed-demo.ts`) + harness env-credential support; login verified end-to-end on screenshots. Module semantics UNIFIED: `organizations.enabledModules` is the single read truth (entitlements list derives `enabled` from it; kb/blog = `core: true` "Always on", non-toggleable, 400 on toggle); settings/modules toggles render pure backend state. `authorize.ts` guard: org-owner/platform-admin bypass, case-normalized module compare, error names the module (was `undefined`), tier check reads `ctx.plan` (dead cast removed). All 9 organization pages wrapped in `<RequireModule module="HR">` (module-disabled state + Manage Modules link on direct URL). Org sheet forms: doubled `py-2` removed (6 pages). AI credits 500 root-caused: `org_ai_credits.org_id` was integer vs text org UUIDs (`parseInt`→NaN) — schema/columns fixed to text+FKs, migration applied, zero-wallet default returns 200. Backend tsc ✓ frontend tsc ✓ (only user-in-flight chat/tickets edits outstanding).

> **Settings PM review (2026-07-02)**: `/settings/email-templates` DELETED (preview-only, no user value; CRM has its own full-CRUD editor at `/crm/settings/email-templates`); `/settings/custom-fields` → redirect to existing `/crm/settings/custom-fields` (dead global feature code deleted). Living rule added (CLAUDE.md §16): custom fields/automations/integrations/data-hub are module-owned, never global settings. `/users/import` dead nav link removed — UserImportDialog already on /users (More→Import CSV), backend verified with real 2-row import. `/billing` stats: two rows → one StatCardGrid (5 cards, dupes dropped). `/settings/security`: passwordExpiryDays was DECORATIVE — now enforced at login (baseline passwordChangedAt→createdAt → forceChangePassword → /reset-password); allowedEmailDomains + maxConcurrentSessions were enforced-but-hidden — UI cards added; NIST copy; ipAllowlist = stored-unenforced backlog. `/settings/sessions` e2e: next-auth.d.ts `sessionId` type gap (JWT always randomUUID → isCurrent never true) fixed; JwtAuthGuard now reads `revoked:session:` Redis denylist (revocation actually enforces, PAT skip, Redis-down graceful); page rebuilt on DataTable + canonical filters + ConfirmDialog. `/settings/api-tokens`: 12 violations fixed (viewport-tall empty pit, loose copy block, header action, condensed 32px rows). `/settings/ai` KEPT (real org AI flags + usage). Backend tsc ✓ frontend tsc ✓.

> **Module-owned settings wave 2 (2026-07-05)**: `/settings/integrations`, `/settings/automations`, `/settings/ai` DELETED as global pages — moved to module settings: HR integrations+automations → `/hr/settings/integrations`, `/hr/settings/automations`; Projects git → `/projects/settings/integrations`; Support automations → `/support/settings/automations`; Finance automations → `/accounting/settings/automations`; CRM AI → `/crm/settings/ai`. Old URLs redirect (integrations→HR, automations→HR, ai→CRM, git→projects). Platform sidebar group entries removed; `/settings/connected-accounts` kept global. Calendar/email connect CTAs → `/settings/connected-accounts`.

> **Projects UI wave + KB extraction + live modules (2026-07-03)**: All 22 eligible Projects pages refined to canon (roadmap/my-tickets/tickets-hooks skipped — user in-flight): PageWrapper eyebrow/backHref everywhere, shared DataTable/StatCardGrid/EmptyState/ErrorState, canonical sheet footers (intake ×3, webhooks inline-form→Sheet, cycles/modules/views body→footer), RequireModule PROJECTS on top-level pages; §9 splits: templates 693→149 (+4 feature files), reports 679→42 (+7 chart sections), epics 514→176 (+epic-card). Module state is LIVE everywhere: new `useEnabledModules()` reads `/me/access` (session fallback for first paint), 7 consumers swapped off JWT claim — toggle → instant unlock, no reload (root cause: NextAuth beta update() unreliable). KB extracted from helpdesk: `/support/kb/**` → `/kb/**` (param-preserving redirects, 7 link sites, features/kb/), Documents product tile → /kb, KB removed from Helpdesk nav group, /kb→documents pathname mapping. Wiki dedup: removed from Home Overview (Documents product is sole sidebar home). Analytics product tile fixed /analytics(404)→/reports (+product mapping). Agent screenshot-login failures root-caused: AUTH_RATE_LIMITED from parallel Playwright logins, not a regression — verified login works post-window. Backend tsc ✓ frontend tsc ✓ (user in-flight: chat-types, tickets hooks, my-tickets, roadmap, features/crm/analytics).

> **Sales/CRM conformance program (2026-07-03)**: All 34 CRM pages audited+fixed against CLAUDE.md/UI-UX-SYSTEM.md via 14-domain parallel workflow (95 files): PageWrapper/DataTable/StatCardGrid/EmptyState/ErrorState everywhere, 3-zone sheets, condensed tables, motion discipline + useReducedMotion, dead code removed. Empty states → inline illustration components (4 new: leads/deals/companies/clients, SMIL-animated; `Wrapper` now pauses SVG animations under reduced-motion); raw downloaded SVGs deleted per the inline-components rule. Hooks: 32 mutationKeys added; `useUpdateDealStage` optimistic update was a silent no-op (snapshotted the bare root key) → `getQueriesData`/`setQueriesData` across list variants; `useDealAging` staleTime→0 for polling; quotes.ts migrated to `queryKeys.crmQuotes` factory (raw keys lived in a separate namespace — factory invalidations silently missed); 22 dead hooks deleted (commissions/quotas/NPS-admin/CSAT/SLA/renewals) + orphaned factory keys pruned; `activities.ts`→`custom-fields.ts`. Backend RBAC hardening (~50 endpoints): fail-open GETs gated across crm/deals/sales/clients/quotes/calendar/contacts/leads-ops; banned `requireAuthorize` purged from contacts (vCard endpoint had ZERO auth); stale-JWT role/permission checks → DB DataScope (clients BOLA, targets); 8 catalog keys added + role defaults; §21 reconcile-note resolved and the PermissionGuard fail-open gap codified in CLAUDE.md. NEW backend: `crm_automation_rules` + `crm_products` tables + CRUD (DDL applied to dev DB directly — canonical drizzle migration still needs TTY `db:generate`) — `/crm/settings/automations` and `/crm/settings/products` were calling endpoints that never existed. E2E (Playwright, 28 routes + detail attempts, screenshots, 4 parallel shards) found+fixed: forecast `limit=200`→400 (backend caps 100), audit-log wrong path + 12 contract mismatches (`/audit-log`, targetType/dateFrom/logs/totalPages) + dead export button, login blocker = rate-limiter orphaned Redis key (`count=552, ttl=-1`) — limiter now self-heals TTL-less keys, fflate blob-worker CSP → `worker-src 'self' blob:`, Excalidraw fonts on public boards → `font-src + https://esm.sh`, wiki share page `ssr:false`-in-RSC build break → client loader, phantom `@tiptap/extension-image` pinned ^3.27.1. Final E2E: 25/28 routes zero-error; clients/quotes/settings-products carry one cosmetic console error from a Next 16.2.9 framework bug (1 of 37 SSR chunk script tags missing the CSP nonce; pages function). Follow-ups: PermissionGuard deny-by-default flip (platform-wide decision), `catalog.ts`/`authorize.ts` orphans blocked by settings/org-hierarchy, repo-wide `as Record<string,unknown>` filter-cast idiom (fix = api-client/query-keys generics). Backend tsc ✓ frontend tsc ✓ lint ✓ build ✓ E2E artifacts deleted per instruction.

> **Email system (2026-07-02)**: email system overhauled (shared layout kit, 63 templates, orphans wired/deleted, provider dedup)

> **UI/UX system program (2026-07-02)**: Canonical spec written at `UI-UX-SYSTEM.md` (repo root) from 100+ source research; CLAUDE.md §14 reconciled to the real ink-first system (slate-900 primary, blue-500 accent — violet gradients retired from the shell). PageWrapper v2 (`backHref` added); 13 legacy pages migrated off `min-h-screen` gradients/ad-hoc headers; 12 dead sidebar links removed + Developer group repointed; mobile nav → @animateicons; search filters added to all 7 org CRUD pages; CoA/assets filter-tabs → Selects; sheet padding unified (`p-0` + `px-6 py-4` header + `px-6 py-5` body); `/users/invitations` rebuilt canonical + `/settings/members` → redirect `/users`; CRM detail pages on PageWrapper+backHref. **Admin module overhaul (all 7 groups)**: Organization (9 pages — sticky sheet footers, dense tables, mobile overflow), People (users-page 905→430 lines, broken 17-line user detail stub rebuilt to full page, bulk ops verified), Access Control (stale `role.permissions` reads fixed post-column-drop, matrix sticky column, 613/693-line components split), Subscription/Platform (subscription page split 509→332), Security/Developer (`/settings/security` rewritten from personal-password form to real org policy page, session cache-key split bug fixed, audit user filter added, api-tokens/webhooks hardened). Verified: frontend tsc ✓ lint 0 errors ✓.

> **Visual redesign (redesign/v2 branch)**: All landing, auth, public/marketing pages have been visually redesigned — `brand-text` gradient clip-text removed (hero `brand-sweep` kept), `rounded-3xl` → `rounded-2xl`/`rounded-xl`, decorative uppercase eyebrows removed/converted to `font-medium`, `PageWrapper` eyebrow styling updated. Dashboard feature pages already use clean design system — no `brand-text` or `rounded-3xl` found.

---

## Global Navigation (Platform Shell)
- [x] `layout` — Activity Bar approach (VS Code/Linear style): thin 48px vertical icon rail (ActivityBar) for product switching using @phosphor-icons/react fill/regular weight + framer-motion spring indicator; full sidebar restored (logo+workspace, context-aware nav via getNavGroupsForProduct, search+bell footer, inline user profile dropdown); MobileBottomNav preserved; home product now shows Overview nav (Dashboard/Calendar/Chat/Notifications/Reports); tooltips z-[200]; deleted TopHeader, ProductSwitcher, orphaned NotificationBell and SidebarUserMenu
- [x] **Mobile shell (2026-07-04)** — GlobalHeader hidden below `md`; bottom nav = Menu (sidebar sheet: product switcher + workspace + module nav), Search (⌘K), module-aware Quick Create sheet, Alerts, Me (account menu opens upward); desktop header unchanged

---

## Dashboard
- [x] `/dashboard` — Removed type cast, duplicate import, dead widget exports, useEffect data fetch; added TanStack Query hook for public docs; named all event handlers; fixed empty states, grid orphan, loading skeleton alignment, quick-actions deduplication, comments removed

---

## CRM — Leads & Pipeline
- [x] `/crm` — Replaced all-deals fetch with dedicated stats endpoint; added error state; fixed empty state and timeAgo in CrmRecentActivity; added staleTime to useDeals
- [x] `/crm/leads` — Leads pipeline with kanban + table view, stats bar, filters, create/edit sheet
- [x] `/crm/leads/[leadId]` — Lead detail: info + activities + quick actions + sidebar
- [x] `/crm/leads/distribute` — Lead distribution to team members
- [x] `/crm/leads/smart-search` — AI-powered lead search
- [x] `/crm/leads/duplicates` — Duplicate detection + merge
- [x] `/crm/leads/source-report` — Lead source analytics
- [x] `/crm/deals` — Deals kanban + table, stage management
- [x] `/crm/deals/[dealId]` — Deal detail: info + activities + meetings + quotes + sidebar stats
- [x] `/crm/deals/forecast` — Pipeline forecast summary + chart + close-date list
- [x] `/crm/deals/approvals` — Deal approval workflow
- [x] `/crm/deals/aging` — Aging deals report
- [x] `/crm/deals/win-loss` — Win/loss analysis
- [x] `/crm/quotes` — Quotes list with status filters, pagination + CSV export (backend `/quotes` contract)
- [x] `/crm/quotes/[quoteId]` — Quote detail with line items, totals, status transitions
- [x] `/crm/contacts` — Contacts list with search/filter, table/card views, CSV import, AI enrich
- [x] `/crm/contacts/[contactId]` — Contact detail: info + timeline + notes + related deals
- [x] `/crm/clients` — Client accounts list with health status
- [x] `/crm/clients/[clientId]` — Client detail: info + activities + timeline + opportunities + onboarding + renewals
- [x] `/crm/companies` — Companies (CRM organizations) list with search + pagination
- [x] `/crm/companies/[companyId]` — Company detail: rollup stats + hierarchy + timeline + related leads
- [x] `/crm/activities` — Cross-entity activity log with filters + stats bar
- [x] `/crm/tasks` — CRM tasks by due-date buckets with complete/delete
- [x] `/crm/calendar` — CRM calendar (month/week) filtered to CRM entity events
- [x] `/crm/analytics` — CRM analytics dashboard
- [x] `/crm/reports` — CRM reports with Excel export
- [x] `/crm/settings/assignment-rules` — Lead assignment rules with priority reorder
- [x] `/crm/settings/email-templates` — CRM email templates with variables + preview
- [x] `/crm/settings/scoring-rules` — Lead scoring rules with live preview
- [x] `/crm/settings/sla` — SLA policies + report + breached leads
- [x] `/crm/settings/products` — Product catalog CRUD
- [x] `/crm/settings/custom-fields` — Custom field definitions per entity
- [x] `/crm/settings/automations` — Automation rules CRUD + toggle + run history
- [x] `/crm/settings/ai` — CRM AI feature flags + usage dashboard
- [x] `/crm/settings/audit-log` — Audit log with filters + pagination + export
- [x] `/crm/settings/import-export` — CRM leads/contacts/deals/clients import & export

---

## Billing & Accounting
- [x] `/billing` — Billing overview
- [x] `/billing/invoices` — Invoices list with status filters
- [x] `/billing/invoices/new` — New invoice creation
- [x] `/billing/invoices/[invoiceId]` — Invoice detail: line items table, totals, payments history, record-payment dialog, send/mark-paid/delete actions
- [x] `/billing/checkout` — Multi-step checkout wizard: plan selector → billing cycle → coupon → review & pay with Razorpay; 20% annual discount; coupon validation
- [x] `/billing/ai-credits` — AI Credits wallet: balance stats, auto top-up toggle, credit pack cards, usage history table with transaction types
- [x] `/billing/analytics` — Revenue Analytics (platform admin): MRR/ARR/ARPU/churn KPI cards, MRR trend BarChart, period selector (3m/6m/12m)
- [x] `/billing/affiliate` — Affiliate Dashboard: register CTA, referral link copy, send invite email, commission history table; empty state when not registered
- [x] `/billing/enterprise-quotes` — Enterprise Quotes list: status filter, table (ref/subject/status/seats/value/valid-until/deal), New Quote Sheet (seat negotiation + custom pricing + contract terms + Zod validation + live total preview), skeleton + empty + error states
- [x] `/billing/enterprise-quotes/[quoteId]` — Enterprise Quote detail: two-column layout, Quote Details card (seats/pricing/contract term/total value), Contract Terms + Notes cards, Approval Workflow sidebar timeline, context-sensitive actions (Submit/Approve+Reject/Send/Accept), Print button; gated behind `billing:enterprise-quotes:approve` for approve/reject
- [x] `/billing/bundles` — Solution Suites (Sales/People/Operations/Finance) with savings badges + individual vs bundle pricing; Custom Module Bundle builder with 11 modules, tiered 15%/20% discount, live price calculator
- [x] `/billing/seats` — Seat utilization dashboard: 4 stat cards (total/used/available/utilization%), dynamic color-coded progress bar, plan details, upgrade/contact-sales CTA, seat rules info; uses `useSeatInfo()` + `useSubscription()`
- [x] `/billing/addons` — Add-ons store: 9 add-on cards (AI Credits/Extra Storage/WhatsApp/SMS/Voice AI/White-label/Custom Domain/Premium Support/API Capacity), Coming Soon badges for unavailable, Manage Credits link for AI credits
- [x] `/billing/coupons` — Coupon management: 4-stat row, table with Active/Inactive/Expired badges, copy/deactivate actions, Create Coupon Sheet (code/type/value/maxUses/applicablePlans/expiresAt), `useCan("settings:manage")` gate; uses `coupons` table
- [x] `/billing/trials` — Trial management: TRIAL status shows countdown + days remaining + progress bar + upgrade CTA + trial type info cards; paid plan shows renewal date; no-subscription shows plan CTA
- [x] `/billing/referrals` — Referral program: rewards flow banner, email invite form, 3 stat cards (invites/active/rewarded), status-badged table (PENDING/SIGNED_UP/ACTIVATED/REWARDED/EXPIRED)
- [x] `/billing/checkout` — **Rebuilt to 8 steps**: Platform → Apps&Bundles → Seats → AI Credits → Review Pricing (coupon, annual/monthly toggle) → Tax Details (GSTIN/state/GST calc) → Payment (Razorpay) → Confirmation; invoice statuses updated to DRAFT/ISSUED/PAID/FAILED/VOIDED
- [x] `/marketplace` — App Marketplace: category filter tabs, app cards with install/trial/uninstall actions, skeleton loading, empty state per category
- [x] `/accounting` — Accounting overview
- [x] `/accounting/coa` — Chart of accounts
- [x] `/accounting/coa/[accountId]` — Account detail: type badge, edit dialog (name/description/isActive), recent journal entries
- [x] `/accounting/journal` — Journal entries
- [x] `/accounting/journal/new` — New journal entry
- [x] `/accounting/journal/[entryId]` — Journal entry detail: lines table with balanced indicator, Post/Reverse AlertDialog actions
- [x] `/accounting/trial-balance` — Trial balance
- [x] `/accounting/profit-loss` — Profit & loss
- [x] `/accounting/balance-sheet` — Balance sheet
- [x] `/accounting/customers` — Customer ledger list
- [x] `/accounting/customers/[clientId]` — Customer ledger: date-range filter, summary stats, ledger table with running balance
- [x] `/accounting/vendors` — Vendor ledger list
- [x] `/accounting/vendors/[vendorId]` — Vendor ledger: date-range filter, summary stats, ledger table with running balance
- [x] `/accounting/purchase-bills` — Purchase bills list
- [x] `/accounting/purchase-bills/new` — New purchase bill
- [x] `/accounting/purchase-bills/[billId]` — Bill detail: line items, totals, Post AlertDialog, record-payment dialog
- [x] `/accounting/aged-receivables` — Aged receivables
- [x] `/accounting/aged-payables` — Aged payables
- [x] `/accounting/gstr-1` — GSTR-1
- [x] `/accounting/gstr-3b` — GSTR-3B

---

## HR — Core
- [x] `/hr` — HR overview
- [x] `/hr/employees` — Employees list
- [x] `/hr/employees/[employeeId]` — Employee profile: tabs (overview/attendance/edit), avatar, stats, direct reports, skills, social links, full edit form
- [x] `/hr/attendance` — Attendance
- [x] `/hr/leaves` — Leave management
- [x] `/hr/payroll` — redirects to /payroll
- [x] `/hr/payroll/salary-structures` — redirects to /payroll/salary-structures
- [x] `/hr/payroll/allowances` — redirects to /payroll/components
- [x] `/hr/payroll/tax` — redirects to /payroll/taxes
- [x] `/hr/payroll/bank-transfers` — redirects to /payroll/bank-transfers
- [x] `/hr/my-payslips` — redirects to /payroll/me
- [x] `/hr/expenses` — Expenses
- [x] `/hr/reimbursements` — Reimbursements
- [x] `/hr/assets` — Assets
- [x] `/hr/devices` — Devices (redirects to /hr/assets — intentional)
- [x] `/hr/work-logs` — Work logs
- [x] `/timesheets` — My Time capture hub (timer + weekly grid + day timeline, submit/recall week)
- [x] `/timesheets/team` — Team time overview (week grid, submission status, drill-down)
- [x] `/timesheets/approvals` — Approval queue (bulk approve/reject, period detail + audit timeline)
- [x] `/timesheets/billing` — Billing queue (uninvoiced hours, rate resolution, CSV/XLSX export, invoice draft)
- [x] `/timesheets/payroll` — Timesheets payroll queue & export (summary, overtime, mapping, CSV/XLSX, history)
- [x] `/timesheets/reports` — Reports (overview analytics + Project Budgets burn tab live; other catalog tabs "coming soon")
- [x] `/timesheets/settings` — Settings (general policy, rates/rate cards, audit trail)
  - Standalone Timesheets product (MVP loop) — **its own top-level product module**: header product-switcher tile + dedicated sidebar (removed from Projects), RBAC-only core module (no `@RequireModule`, always-on). Backend module `timesheets-core/` (`TimesheetsCoreModule`), FE `features/timesheets-core/` + `hooks/api/timesheets-core/`; payroll queue stays in `timesheets/` (`TimesheetsModule`). APIs `/timesheets/{entries,timer,periods,approvals,billing,reports,settings,rates,audit}`; schema `timesheet_periods|timer_sessions|timesheet_audit_events|timesheet_rate_cards|timesheet_rates` + extended `timesheets`; migration `0160_timesheets_standalone.sql` (NOT YET RUN — deferred; renumbered from 0156 after siblings took 0156-0159); RBAC `timesheets:*` catalog. Backend + FE timesheets typecheck clean; pure-logic unit tests green.

---

## HR — People Ops
- [x] `/hr/onboarding` — Onboarding overview
- [x] `/hr/onboarding/[userId]` — Employee onboarding: progress bar, grouped tasks (pending/completed), overdue highlighting, toggle-complete actions
- [x] `/hr/onboarding/my-tasks` — My onboarding tasks
- [x] `/hr/org-chart` — Org chart
- [x] `/hr/teams/[teamId]` — Team detail: info card, lead employee resolution, edit Sheet, delete AlertDialog
- [x] `/hr/helpdesk` — HR helpdesk
- [x] `/hr/handbook` — Employee handbook; `DashboardGate permission="hr:documents:manage"`
- [x] `/hr/recognition` — Recognition
- [x] `/hr/performance` — Performance reviews; `DashboardGate permission="hr:performance:manage"`
- [x] `/hr/surveys` — Surveys
- [x] `/hr/enps` — eNPS
- [x] `/hr/assessments` — Assessments
- [x] `/hr/learning-paths` — Learning paths
- [x] `/hr/skills` — Skills
- [x] `/hr/certifications` — Certifications
- [x] `/hr/career-ladders` — Career ladders
- [x] `/hr/loans` — Loans
- [x] `/hr/bonuses` — Bonuses; `DashboardGate permission="hr:payroll:generate"`
- [x] `/hr/incentives` — Incentives
- [x] `/hr/documents` — Documents
- [x] `/hr/documents/templates` — Document templates
- [x] `/hr/documents/templates/new` — New document template
- [x] `/hr/documents/templates/[templateId]/edit` — Edit document template
- [x] `/hr/documents/editor/new` — New document
- [x] `/hr/documents/editor/[documentId]` — Document editor
- [x] `/hr/document-review` — Document review
- [x] `/hr/document-types` — Document types
- [x] `/hr/email-templates` — HR email templates; `DashboardGate permission="hr:documents:manage"`
- [x] `/hr/compliance` — Compliance
- [x] `/hr/background-verification` — Background verification; `DashboardGate permission="hr:employees:update"`
- [x] `/hr/alumni` — Alumni
- [x] `/hr/exit` — Exit management
- [x] `/hr/fnf` — Full & final settlement; `DashboardGate permission="hr:payroll:approve"`
- [x] `/hr/termination` — Terminations
- [x] `/hr/asset-returns` — Asset returns
- [x] `/hr/analytics` — HR analytics; `DashboardGate permission="hr:performance:view"`
- [x] `/hr/settings/import-export` — HR employees/expenses/assets export
- [x] `/hr/settings/integrations` — Recruitment job board integrations (LinkedIn, Naukri, Indeed)
- [x] `/hr/settings/automations` — HR automation rules (non-CRM triggers)
- [x] `/hr/team-events` — Team events
- [x] `/hr/employees/find-expert` — Find expert
- [x] `/hr/employees/skills-matrix` — Skills matrix

---

## HR — Recruitment
- [x] `/hr/recruitment` — Recruitment overview
- [x] `/hr/recruitment/jobs` — Job postings
- [x] `/hr/recruitment/jobs/new` — New job posting
- [x] `/hr/recruitment/jobs/[jobId]/edit` — Edit job posting
- [x] `/hr/recruitment/candidates` — Candidates list
- [x] `/hr/recruitment/candidates/[candidateId]` — Candidate detail
- [x] `/hr/recruitment/candidates/import` — Bulk candidate import
- [x] `/hr/recruitment/pipeline` — Pipeline
- [x] `/hr/recruitment/interviews` — Interviews
- [x] `/hr/recruitment/scorecard-templates` — Scorecard templates
- [x] `/hr/recruitment/scorecard-analytics` — Scorecard analytics
- [x] `/hr/recruitment/question-bank` — Question bank
- [x] `/hr/recruitment/interviewer-performance` — Interviewer performance
- [x] `/hr/recruitment/diversity-report` — Diversity report
- [x] `/hr/recruitment/sla` — Recruitment SLA
- [x] `/hr/recruitment/sla-report` — SLA report
- [x] `/hr/recruitment/analytics` — Recruitment analytics
- [x] `/hr/recruitment/automations` — Recruitment automations
- [x] `/hr/recruitment/booking-links` — Interview booking links
- [x] `/hr/recruitment/email-sequences` — Email sequences
- [x] `/hr/recruitment/headcount` — Headcount planning
- [x] `/hr/recruitment/hiring-flows` — Hiring flows
- [x] `/hr/recruitment/inbox` — Recruitment inbox
- [x] `/hr/recruitment/internal-jobs` — Internal job board
- [x] `/hr/recruitment/offer-templates` — Offer templates
- [x] `/hr/recruitment/recruiters` — Recruiters
- [x] `/hr/recruitment/refer` — Refer a candidate
- [x] `/hr/recruitment/referrals` — Referrals
- [x] `/hr/recruitment/reports` — Recruitment reports
- [x] `/hr/recruitment/vendors` — Recruitment vendors

---

## Projects
**Projects module UI consistency (2026-07-07):** All sidebar list pages aligned to Approvals/Portfolio reference — `PageWrapper` + `eyebrow="Projects"`, shared `StatCard`/`StatCardGrid`, filters in `PageWrapper.filters`, themed empty/error states, `rounded-xl` card chrome, no double inner padding.
- [x] `/projects/all` — All Projects list: eyebrow, subtitle, filter bar in PageWrapper, grid/list skeletons + empty/error states (`/projects` redirects to Command Center)
- [x] `/projects/[projectId]` — Project board
- [x] `/projects/[projectId]/backlog` — Backlog
- [x] `/projects/[projectId]/sprints` — Sprints
- [x] `/projects/[projectId]/timeline` — Timeline
- [x] `/projects/[projectId]/epics` — Epics
- [x] `/projects/[projectId]/cycles` — Cycles
- [x] `/projects/[projectId]/modules` — Modules
- [x] `/projects/[projectId]/milestones` — Milestones
- [x] `/projects/[projectId]/pages` — Pages
- [x] `/projects/[projectId]/views` — Views
- [x] `/projects/[projectId]/intake` — Intake
- [x] `/projects/[projectId]/my-tickets` — My tickets
- [x] `/projects/[projectId]/tickets/[ticketKey]` — Ticket detail (Jira-like 2-column page: title/description/activity left, status/assignees/labels sidebar right; board/backlog/my-tickets navigate here; sheet widened to 3/4 for quick-view fallback)
- [x] `/projects/[projectId]/analytics` — Analytics (E2E fix: assignee chart now joins users for real names)
- [x] `/projects/[projectId]/budget` — Budget
- [x] `/projects/[projectId]/settings` — Project settings
- [x] `/projects/[projectId]/whiteboard` — Whiteboard (2026-07-03 sharing pass: fixed P0 save contract — backend DTO/schema moved from legacy element array to Excalidraw scenes; visibility model private/project/public with per-member viewer/editor shares enforced object-level in `WhiteboardsService`; share dialog with public-link restrictions — view/edit link access, expiry presets, allow-export toggle, copy + reset link; autosave via `getSceneVersion` + 2s debounce with flush-on-unmount; writes re-keyed `projects:write` → catalog key `projects:whiteboards:manage`; migrations `0137_whiteboard_sharing.sql` + `0138_whiteboard_scene_backfill.sql` pending TTY apply + `backfill:rbac`; see `PRD-whiteboard.md`)
- [x] `/board/[shareToken]` — Public shared whiteboard (unauthenticated, `(public)` group; generic-404 token endpoints `public/whiteboard-links/:token` rate-limited 60 view / 30 edit per min per IP; view-only or editable per link access; export UI hidden when disallowed)
- [x] `/projects/whiteboards` — Whiteboards hub: eyebrow + PageWrapper-aligned grid, skeleton/error/empty states, no extra content padding

**Whiteboard UX wave (2026-07-03):** single-line header — PageWrapper gained an additive `leading` prop (renders in the backHref slot); whiteboard page title = selected board name, boards-panel collapse toggle replaces the back arrow, all actions (save status, Save, Fullscreen, `⋯` menu with Share/Hide boards/Open public link, New Board) on one row; autosave hook made board-switch-safe (pending scenes carry their boardId, flushed on switch) so it lives at page level; `ExcalidrawCanvas` now presentational (fullscreen overlay keeps its own slim bar, Esc-exit + scroll lock). Collapsible boards panel + fullscreen mode + trimmed Excalidraw MainMenu (external links removed; ClearCanvas/ToggleTheme/Background/SaveAsImage only). tldraw-style reskin via scoped `whiteboard-theme.css` (`.wb-canvas`, verified against Excalidraw 0.18 dist vars: white islands, 12px radius, soft `--shadow-island`, violet-600 active-tool pill, slate hovers; dark mode untouched except shadows). Project sidebar: header collapse icon (both states) + persisted collapse. RBAC: uncataloged `projects:write` fully retired — milestones/intake/views/pages writes now `projects:workspace:manage` (catalog + 6 role templates + frontend PermissionKey; backfilled live: 248 grants, versions bumped). Backend PRD closure: 2MB Zod scene cap + 3mb JSON body limit (`useBodyParser`, rawBody preserved). PM migrations 0008/0009 applied live (fixed 42703 `project_statuses.type` crash).

- [x] `/projects/templates` — Templates: eyebrow, error state, themed empty illustration, rounded-xl card skeletons
- [x] `/projects/resource-allocation` — Resource allocation: compact StatCardGrid + dense member cards with semantic load bars and inline project chips
- [x] `/projects/command-center` — Command Center: eyebrow on all states, StatCardGrid + PageSection pattern (reference-aligned)
- [x] `/projects/my-work` — My Work: eyebrow + StatCardGrid (open/overdue/today/upcoming), bucketed list states
- [x] `/projects/portfolio` — Portfolio health view: eyebrow, subtitle, StatCardGrid, filters in PageWrapper, rounded-xl table shell
- [x] `/projects/[projectId]/releases` — Releases (list + create/edit Sheet w/ TipTap notes, status badges, delete confirm; wired to existing releases API — screen was previously missing)
- [x] `/projects/[projectId]/workload` — Workload (dedicated route exposing existing `WorkloadView`; was only a hidden view-switcher tab)
- [x] `/projects/[projectId]/qa` — QA / Test Management (Test Cases tab: suite filter + DataTable + case Sheet w/ repeatable steps builder; Test Runs tab: runs + pass/fail/blocked/skip counts + progress; `projects:qa:*`)
- [x] `/projects/[projectId]/qa/runs/[runId]` — Test Run execution (per-result status controls gated `projects:qa:execute`, notes, Complete-run, QA-failed→Create-bug prefilled from the case)
- [x] `/projects/[projectId]/bugs` — Bug tracker (first-class `bugs` table: severity + 9-state workflow + reopenCount; filters status/severity/assignee/search; report/edit Sheet w/ TipTap + affected/fixed release links; `projects:bugs:*`)

**PM module completion pass (2026-07-02, PRD §16/§17 phases A–E):** backend — chat `metadata.entities` persisted; comment lookup + edit/delete endpoints; stable error codes (`PROJECTS_FORBIDDEN_TICKET/PROJECT`, `PROJECTS_TICKET_CONFLICT` 409, `PROJECTS_INVALID_TICKET_STATUS`); access-denied audit events; transactional `createFromDeal`; chat status action hardened (activity + audit + system message); ticket search returns recent tickets on empty query; calendar feed emits project-ticket due dates + `linkedTicket` enrichment; statuses settings re-pointed to `project_statuses` (board columns now follow settings). Frontend — `PROJ-123` identity everywhere; comment edit/delete UI + permalink deep-links; saved views apply + save-from-board; chat ticket/comment pills, internal permalink unfurls, offline-queue metadata; calendar link/unlink + create-ticket-from-calendar; TipTap rich-text ticket descriptions (living rule §8); `mutationKey`/`staleTime` sweep; ink-first UI polish across all PM pages + chat/calendar surfaces (violet/indigo brand chrome removed per UI-UX-SYSTEM). Adversarial review pass (7 finder angles + verifiers) fixed 9 confirmed bugs: realtime messages dropped sender/metadata (pills only appeared after reload); TipTap phantom empty-description PATCH on open + legacy plain-text newline normalization; statuses `type` silently dropped (new column + migration 0009); reorder bypassed status validation; self-inflicted 409 from stale `expectedUpdatedAt` (server now returns `updatedAt`, dialog tracks it call-time); layout rendered "no access" for 5xx/network errors (now rethrows to boundary); chat invalid-status threw an unmapped code; `null-123` in comment previews; burnup/velocity/CFD always showed 0 completed (pre-existing `stateId` gap — canonical-status fallback added). Consolidations: one `formatTicketKey`, one status-color source, shared `ticket-status.util.ts`, per-comment pending state. Migrations `0008_activity_comment_actions.sql` + `0009_project_statuses_type.sql` APPLIED 2026-07-03 (headless SQL run; fixed live 42703 `project_statuses.type` crash on project detail). Open: custom-field columns in table/list views; shared-views RBAC model; `removeMember`/"Hide Done" hardcode canonical terminal statuses (proper fix needs an `isTerminal` column on `project_statuses`).

**PM foundation harden + complete (2026-07-05, tasks/project-management ProjectOS spec — slice 1 of the "harden + complete foundation" scope):** Backend RBAC/BOLA closure — **every mutating PM endpoint now carries `@RequirePermission`** with class-level `PermissionGuard` across all controllers in `modules/projects/` (11) + `modules/projects-execution/` (all), reusing the existing catalog (NO new keys → zero conflict with concurrent payroll session; `permissions.constants.ts` untouched). Fixed phantom `projects:read` → `projects:manage` on report snapshot (was hard-blocking all users). Added `@RequireModule("projects")` to the 6 controllers missing it (advisory — module gating isn't guard-enforced repo-wide, matches KB precedent). New endpoints: `GET /projects/my-work` (cross-project assignee tickets, tenant+user scoped), `DELETE .../sprints/:id`, `PATCH`+`DELETE .../epics/:id` (with ownership/tenant checks). Service split: `projects-ticket-subresources.service.ts` 544→367 + new `projects-ticket-comments.service.ts` (224). Frontend — new screens: Command Center, My Work, Releases UI, Workload route (see above) + sidebar/project-sidebar wiring. **Project Creation Wizard** replaces the single dialog: 7-step Sheet (Basics→Type→Template→Toggles→Workflow→Team→Review), Framer Motion step transitions w/ `useReducedMotion`, per-step Zod (input===output, no coerce), template-apply vs direct-create provisioning w/ `Promise.allSettled` member adds; edge cases handled (409 dup key, template deleted mid-flight, no-invite-permission, start>end, partial member failure). Structural — centralized 8 scattered inline types into `types/projects/**` (hooks re-export for back-compat); **deleted dead `components/projects/`** (legacy dup, 0 external importers); split 6 oversized files (roadmap page 1127→66, board 475→345, backlog 422→244, saved-views 367→145, portfolio 365→168, ticket-details-dialog 421→303) into feature subfolders — nothing over 345. NO migrations (feature toggles ride existing `projects.settings` JSONB; project-type/workflow/extra-toggles are UI-only defaults this slice). Known debt (deferred, not regressions): 3 backend services still >500 (`projects.service` 540, `projects-tickets.service` 566, `projects-reports.service` 501 — shared private helpers make a clean split risky); pre-existing >500 frontend files untouched (`activity-feed` 620, `ticket-sidebar` 559, `git-integration-settings` 557, `create-ticket-dialog` 540, `whiteboard/page` 519); persisting project-type/workflow/toggles into `settings` needs a create-DTO extension. Build NOT run (concurrent payroll session mid-edit); verified by cross-agent import reconciliation. Next engine slices queued: QA/Test + first-class Bugs, Client Portal + Change Requests, Approvals engine, AI Project Manager.

**PM engine slice 1 — QA/Test + first-class Bugs (2026-07-05, ProjectOS spec docs 14/15):** New `projects-qa` engine end-to-end. Schema — 5 tables (`test_suites`, `test_cases`, `test_runs`, `test_run_results`, `bugs`) + 7 pgEnums, tenant+project scoped, FK-linked to `tickets`/`sprints`/`project_releases` (case→ticket traceability, result→bug, bug→affected/fixed release), per-project sequences `caseNumber`/`runNumber`/`bugNumber`. Migration `0159_qa_test_bugs.sql` HAND-WRITTEN, **NOT applied** (renumbered off the 0156 collision with sibling timesheets-standalone + inventory migrations; guarded enum DDL + `CREATE TABLE IF NOT EXISTS` in FK-safe order — apply in TTY). RBAC — 7 keys `projects:qa:view/manage/execute` + `projects:bugs:view/create/update/delete` in catalog + ROLE_DEFAULT_PERMISSIONS (engineering/design/etc get qa:view+execute+bugs:view/create/update; qa:manage+bugs:delete via ALL_PERMISSIONS). Backend — `modules/projects-qa/` (4 controllers, 3 services, Zod DTOs; every endpoint `@RequirePermission`-gated + `@RequireModule("projects")`; tenant/BOLA re-asserted on read+write with 404-not-leak; sequences via `pg_advisory_xact_lock` in txn + unique-constraint backstop; `createBugFromResult` prefills a bug from a failed test case and links `result.linkedBugId`; audit events bug.created/status_changed/created_from_result + test_run.completed; registered in app.module.ts). Frontend — `types/projects/qa.ts`+`bugs.ts`, `hooks/api/projects/qa.ts`+`bugs.ts` (20 hooks), query-keys + 7 PermissionKey-union entries, 3 screens (QA test-management w/ steps-builder Sheet, run-execution w/ per-result pass/fail controls + QA-failed→bug, bug tracker board) all 5 states, sidebar `QA / Tests`+`Bugs` gated by useCan. Reconciled end-to-end (hook URLs ↔ routes, types ↔ response shapes, all imports resolve). Build NOT run (sibling sessions mid-edit); zero file overlap with siblings (distinct module/schema/key namespaces). Next: Client Portal + Change Requests → Approvals → AI PM.

**PM engine slice 2 — Client Portal + Change Requests (2026-07-05):** Frontend-only slice (backend in parallel against same contract). Types: `types/projects/change-requests.ts` + `types/projects/client-portal.ts` (exported from barrel). Hooks: `hooks/api/projects/change-requests.ts` (5 hooks, mutationKey tuples, staleTime 60s) + `hooks/api/projects/client-portal.ts` (7 hooks + optimistic visibility toggles). Query keys: `queryKeys.projects.changeRequests.*` + `.clientPortal.*` added to `lib/query-keys.ts`. PermissionKey union: 5 new keys (`projects:portal:view`, `projects:changerequests:view/create/manage`, `projects:clientvisibility:manage`). Sidebar: "Client Portal" → `/projects/portal` added to "Projects & Time" group; project-sidebar adds "Client" section (`FilePen` Change Requests + `Globe` Client Portal) gated by useCan. Screens: (1) `/projects/portal` — client-facing project cards grid; (2) `/projects/portal/[projectId]` — client dashboard (milestones, tasks, files, change requests + submit-CR Sheet with Tiptap description); (3) `/projects/[projectId]/change-requests` — 8-state CR workflow DataTable with Sheet (full field set incl. estimate hrs/budget ₹/timeline days/approval owner/decision comment) + AlertDialog delete, gated useCan; (4) `/projects/[projectId]/client-portal` — visibility management with optimistic Switch toggles per ticket/milestone. All 4 screens: all 5 states (loading skeleton, error+retry, empty w/ illustration, filtered-empty, content). **Backend + schema (same slice):** added `client_visible boolean` (default false) to `tickets`/`ticket_comments`/`ticket_attachments`/`project_milestones` + new `change_requests` table (per-project `crNumber`, 8-state `change_request_status` enum, impact/estimate/budget/timeline). Migration `0161_client_portal_change_requests.sql` HAND-WRITTEN, **NOT applied** (renumbered off the `0160` collision w/ sibling timesheets-standalone). RBAC: 5 keys + new **`CLIENT` role template** (portal + CR-submit only, zero internal PM access) + `CLIENT_USER` role defaults. Backend module `modules/projects-client-portal/` (9 files, 14 endpoints, all `@RequirePermission`+`@RequireModule`): client-facing portal reads enforce **client isolation** — `assertClientProject` checks `orgId=caller.orgId AND clientId=caller.userId`, 404-not-leak, and the overview returns an EXPLICIT allowlist (no budget/description/estimate/assignee/internal-notes; only `clientVisible=true` rows); internal CR CRUD+workflow + audited client-visibility toggles; `crNumber` via `pg_advisory_xact_lock` in txn; audit events change_request.created/status_changed + client_visibility.changed; registered in app.module.ts. Reconciled end-to-end (hook URLs↔routes, types↔shapes; fixed one drift — backend portal project shape now returns `color`+`targetEndDate` to match the FE contract). Follow-up: role-default key is `CLIENT_USER` while the template slug is `CLIENT` — confirm the client-user assignment path grants `projects:portal:view` at `backfill:rbac` time. Build NOT run (sibling sessions mid-edit); zero file overlap with siblings.
- [x] `/projects/portal` — Client Portal: eyebrow, full-height empty/error states, removed double content padding
- [x] `/projects/portal/[projectId]` — Client dashboard: milestones, visible tasks, files (download), CRs list + submit request Sheet (Tiptap description)
- [x] `/projects/[projectId]/change-requests` — Internal CR management: 8-state workflow DataTable, filters, create/edit Sheet (estimate/budget/timeline/approvalOwner/decisionComment), delete AlertDialog; gated `projects:changerequests:view/create/manage`
- [x] `/projects/[projectId]/client-portal` — Client visibility management: Switch toggle per ticket + milestone (optimistic PATCH); info banner; gated `projects:clientvisibility:manage`
- [x] `/projects/approvals` — Approvals inbox: title matches sidebar, eyebrow + StatCardGrid + DataTable, all loading/error/empty states
- [x] `/projects/[projectId]/approvals` — Project approvals management: status/entity-type filters, Request-approval Sheet, row actions Decide/Delegate/Escalate/Cancel/Delete gated by useCan

**PM engine slice 3 — Approvals (2026-07-05, ProjectOS spec doc 22):** Generic project-scoped, polymorphic approval engine (distinct from the automation-engine `workflow_approvals`). Schema — `project_approvals` (`entityType`/`entityId` over task/milestone/budget/release/change_request/document/timesheet/client_approval, `approverId`, 7-state `approval_status`, `level`, `dueAt`/`decidedAt`/`decisionComment`) + 2 enums; indexed `(approverId,status)` for the cross-project inbox. Migration `0162_project_approvals.sql` HAND-WRITTEN, **NOT applied** (no collision this time). RBAC — 4 keys `projects:approvals:view/request/decide/manage` in catalog + role defaults + `project_manager` template. Backend `modules/projects-approvals/` (4 files, 7 endpoints, all `@RequirePermission`+`@RequireModule`): approver≠requester (400 pre-DB), decide-authorization BOLA (assigned approver OR `projects:approvals:manage`, else 404-not-leak), 409 on already-decided, cross-project inbox via INNER JOIN + `dueAt ASC NULLS LAST`, audit events approval.requested/decided/delegated/escalated/cancelled, registered in app.module.ts. Frontend — `types/projects/approvals.ts`, `hooks/api/projects/approvals.ts` (7 hooks), query-keys + 4 PermissionKey-union entries, 2 screens (inbox + per-project) + shared decide-dialog/delegate-dialog/request-sheet/status-badge, sidebar "Approvals" in Projects&Time + project-sidebar Tracking. NOTE: the frontend agent died mid-run (process exit); lead completed the missing per-project page + 6 route files + sidebar wiring by hand and removed a dead `useSession` in the inbox. Reconciled end-to-end (hook URLs↔routes, all UI deps + imports resolve). Build NOT run (sibling sessions mid-edit).

- [x] `/projects/[projectId]/ai` — AI Assistant: 6 capability cards (Project Summary, Risk Detection, Draft Client Update, Plan-from-Prompt, Extract Tasks from Notes, Ask a Question) — gated `projects:ai:use` + `useFeature("ai.project-manager")`

**PM engine slice 4 — AI Project Manager (2026-07-06, ProjectOS spec doc 31):** REUSES the existing AI stack (OpenAI gpt-4o-mini via `LlmService.invokeStructured`) — NOT a parallel LLM. NO new tables/migration. Backend extends `modules/ai/`: `projects-ai.controller.ts` (@Controller("ai"), class `@RequirePermission("projects:ai:use")`) + `projects-ai.service.ts` + `prompts/pm.prompts.ts` + `dto/pm.schemas.ts`; 6 POST routes summary/risks/client-update/plan/extract-tasks/ask, each `requireFeature(u.plan,"ai.project-manager")` (402) + `ensureLlm()` (503 if no `OPENAI_API_KEY`). Guardrails: BOLA `assertProject` 404-not-leak; **evidence computed in code from fresh DB** (LLM only narrates, never fabricates counts); **client-update reads ONLY `clientVisible=true` tickets + `isPublic` roadmap** and instructs the LLM to exclude internal data; **suggestions-only** (plan/extract create nothing); audit events `ai.project.*` on every call. RBAC key `projects:ai:use` + plan feature `ai.project-manager` (PROFESSIONAL+) + granted to 7 roles + `project_manager` template. Frontend — `types/projects/ai.ts`, `hooks/api/projects/ai.ts` (6 mutations), 14 files under `features/projects/ai/**` (page + 6 cards + evidence-strip + shared suggested-task-list), route `/projects/[projectId]/ai`, sidebar "AI Assistant" (More, gated), PermissionKey + frontend feature-gate mirror. **Create-tasks-from-suggestions**: `useCreateTicket` per selected item, deduped case-insensitively against open ticket titles from `useTickets`. **Lead fixes post-agent (reconciliation):** the empty-project short-circuit returned `{noData}` which crashed the cards (undefined `.highlights`/`evidence`) — changed to return typed empty shapes; removed the (wrong) short-circuit from plan/extract/ask so they work on brand-new projects; aligned `risks` evidence to the frontend `ProjectAiEvidence` shape. Reconciled end-to-end (hook URLs↔routes↔types). Runtime prereq: valid `OPENAI_API_KEY` in backend `.env` (else 503 + friendly toast, no crash). Build NOT run (sibling sessions mid-edit).

- [x] `/projects/[projectId]/risks` — Risk register: probability×impact **risk-matrix heatmap** (open-risk counts per cell, click-to-filter) + StatCards + status filter + DataTable (`RISK-{n}`, probability/impact/severity badges, owner, status); create/edit Sheet; `projects:risks:view/manage`
- [x] `/projects/[projectId]/decisions` — Decision log: status filter + search + DataTable (`DEC-{n}`, status badge, owner, decided/revisit dates); create/edit Sheet (context/decision/options + dates); `projects:decisions:view/manage`

**PM engine slice 5 — Governance: Risks & Decisions (2026-07-06, ProjectOS spec doc 26):** `project_risks` (probability/impact/status enums, owner, mitigation, per-project `riskNumber`) + `project_decisions` (context/decision/optionsConsidered, status, `decidedAt`/`revisitAt`, `decisionNumber`) + 4 enums. Migration `0163_project_governance.sql` HAND-WRITTEN, **NOT applied** (no collision). RBAC 4 keys `projects:risks:view/manage` + `projects:decisions:view/manage` + role defaults + `project_manager` template. Backend `modules/projects-governance/` (6 files, 10 endpoints, all `@RequirePermission`+`@RequireModule`): per-project sequences via `pg_advisory_xact_lock` in txn, BOLA `loadRisk`/`loadDecision` (id+org+project+not-deleted, 404-not-leak), audit `risk.*`/`decision.*`, registered in app.module.ts. Frontend — `types/projects/governance.ts`, `hooks/api/projects/governance.ts` (10 hooks), `features/projects/governance/**` (risk-severity 3×3 matrix helper + `RiskMatrix` heatmap + both pages + sheets), 2 routes, new "Governance" sidebar section (ShieldAlert/Gavel), PermissionKey + query-keys. Reconciled end-to-end (hook URLs↔routes↔types; `decidedAt`/`revisitAt` are `z.coerce.date()` so the FE date strings persist — no silent-strip). **`nest build` GREEN after fix:** the earlier cleanup pass wrongly de-exported `BurnupPoint`/`VelocitySprint`/`CriticalPathNode`/`MemberCost` (inferred controller-return types → TS4053); restored `export`. The build then found ONLY those 4 errors → all 5 engines' backend compiles clean.

- [x] `/projects/[projectId]/meetings` — Meetings list: type+status filters + search, DataTable (`MTG-{n}`, type/status badges, scheduled time, attendee + action-item counts); create Sheet; `projects:meetings:view/manage`
- [x] `/projects/[projectId]/meetings/[meetingId]` — Meeting detail: TipTap agenda+notes, attendees (project-member picker), action items w/ **Convert-to-Task**, standup panel (self-service yesterday/today/blockers for standup-type meetings)

**PM engine slice 6 — Meetings, Standups & Action Items (2026-07-06, ProjectOS spec doc 20):** 4 tables `project_meetings` (type meeting/standup/retro/planning/review, agenda, notes, per-project `meetingNumber`) + `meeting_attendees` (normalized) + `meeting_action_items` (assignee/due/status, `convertedTicketId`) + `meeting_standup_entries` (per-user yesterday/today/blockers) + 3 enums. Migration `0164_project_meetings.sql` HAND-WRITTEN, **NOT applied**. RBAC 2 keys `projects:meetings:view/manage` + role defaults + `project_manager` template. Backend `modules/projects-meetings/` (6 files, 13 endpoints): meetings CRUD + attendees (POST validates the user IS a `project_members` row → 400 else) + standup PUT (self-service, `view` perm, caller's own entry only) + action items CRUD + **convert-to-task** (atomic: creates a ticket via the same `ticketNumber` advisory-lock seq + `createTicket` defaults type=TASK/status=TODO/priority=MEDIUM, sets `convertedTicketId`+status=converted, 409 if already converted); two-level BOLA, audit, app.module registered. Frontend — `types/projects/meetings.ts`, `hooks/api/projects/meetings.ts` (12 hooks), 22 files `features/projects/meetings/**` (list + detail w/ TipTap notes, attendees/action-items/standup sections + badges + sheets), 2 routes, "Meetings" in Planning sidebar, PermissionKey + query-keys. **Lead fixes post-agent (build + reconciliation):** (1) **enum-name collision** — a new `meetingStatusEnum`/`"meeting_status"` clashed with the existing CRM enum in the shared `db/schema/enums.ts` (TS2308 + would silently reuse the wrong uppercase DB type) → renamed to `projectMeetingStatusEnum`/`"project_meeting_status"` in schema+migration+DTO; (2) GET `/:id` returned NESTED `{meeting,...}` but FE `MeetingDetail extends Meeting` is flat → changed backend to `{...meeting, attendees, actionItems, standupEntries}`; (3) list now returns real `attendeeCount`/`actionItemCount` (grouped `count(*)::int` + merge) the FE table displays. Reconciled end-to-end. GOTCHA: the repo has a SHARED `db/schema/enums.ts` with cross-domain enums — new projects enums must not reuse those names.

- [x] `/projects/[projectId]/incidents` (+`/[incidentId]`) — Incidents & SLA: severity/status, SLA response+resolution timers with breach chips, timeline updates, owner
- [x] `/projects/[projectId]/forms` (+`/[formId]`) — Forms builder: 11 field types, dynamic renderer, actions (create_task/bug on submit), submissions + process
- [x] `/projects/portfolios` (+`/[portfolioId]`) & `/projects/programs` (+`/[programId]`) — Portfolios/Programs: removed double padding, full-height empty states, filters in PageWrapper
- [x] `/projects/[projectId]/workflow` — Workflow builder: per-status WIP limits + configurable from→to transition rules (requiredFields/allowedRoles/requiresApproval, "Any status")
- [x] `/projects/[projectId]/chat` — Project Chat tab (wires existing entity-channel) + "Convert message → task/bug" action in chat message toolbar

**PM engine slices 7–11 (2026-07-06, ProjectOS docs 27/10/30/08-09/18) — built via pipelined parallel agents (schema→backend→frontend, sequential slices sharing the perm-catalog/barrels/sidebar):**
- **7 Incidents/SLA** (doc 27): `project_incidents`(severity/status enums, SLA timestamps respondedAt/resolvedAt/*DueAt, rootCause/customerComms) + `incident_updates` timeline; migration `0165`; `projects:incidents:view/manage`; `modules/projects-incidents` (respondedAt/resolvedAt auto-set on status change; flat GET-detail); FE SLA-breach helper + timeline + sidebar Quality section.
- **8 Forms-builder** (doc 10): `project_forms`(jsonb fields[]/actions[], isPublic/publicToken) + `form_submissions`(jsonb values, convertedTicketId); migration `0166`; `projects:forms:view/manage`; `modules/projects-forms` (submit executes create_task/create_bug actions inline → ticket + convertedTicketId); FE dynamic field-editor + 11-type renderer + submissions.
- **9 Portfolio/Program** (doc 30): workspace-level `project_portfolios`+`project_programs`(+health enum) + M2M `portfolio_projects`/`program_projects`; migration `0167`; 4 keys; `modules/projects-portfolios` mounted `@Controller("projects")` registered BEFORE ProjectsModule (static routes beat `:projectId`); FE top-level routes + nav-group entries.
- **10 Workflow-transition engine** (docs 08/09): `workflow_transitions`(from/to status FK, requiredFields/allowedRoles/requiresApproval) + `wip_limit` col on `project_statuses`; migration `0168`; `projects:workflow:view/manage`; `modules/projects-workflow` (from/to validated ∈ project, global transitions via null fromStatusId, WIP update); FE builder (WIP rows + transitions). **Gantt enhancement** (doc 09, no schema): `gantt-view.tsx` + `gantt/` overlays — SVG dependency arrows + critical-path highlight (reuse `useCriticalPath`) + milestone markers (`useProjectMilestones`); `projectId` became a required GanttView prop (both callers updated). Lead fix: removed agent's `as`-casts (added `wipLimit` to `CustomState`, typed transition `onSubmit`).
- **11 Chat-connected** (doc 18): mature chat infra already existed (ticket pills, `#`-mention, permalink unfurls, chat→ticket-status, entity-channel mechanism). Added (NO migration): backend `POST /chat/actions/create-task-from-message` (creates ticket from a message + posts back a ticket pill; reuses ticket-status membership/systemMessage pattern; inline ticket insert since ProjectsTicketsService isn't exported) + widened chat `entityType` enum to include sprint/release/incident; frontend convert-to-task toolbar action + dialog + project Chat tab (`/projects/[id]/chat` wiring `useEntityChannel`). Documented follow-ups (larger/cross-cutting, NOT built): work→chat auto-posting (needs a `send_chat_message` automation action + event wiring), assign/set-due-date-from-chat, AI-PM tools inside the chat assistant.

All slices 7–11: build not run (sibling sessions mid-edit) — verified by cross-agent import reconciliation; migrations `0165/0166/0167/0168` HAND-WRITTEN, NOT applied.

**PM follow-ups completed (2026-07-06, NO migrations) — the cross-cutting items previously documented as deferred:**
- **AI-PM tools in chat** — added `searchProjects`/`askProjectAI`/`getProjectSummary` tools to `ChatAssistantService.processChat()` (reuse `ProjectsAiService`, same AiModule so DI is trivial) → "what's blocked?"/"summarize project" answerable in chat.
- **Chat→work actions** — `POST /chat/actions/assign-ticket` (`projects:tickets:assign`) + `/set-due-date` (`projects:tickets:update`) mirroring the ticket-status membership+pill pattern; frontend toolbar actions + `assign-ticket-dialog`/`set-due-date-dialog` (prefill ticket/project from the message's linked-ticket entity via a type-predicate, no cast).
- **Work→chat** — approval-requested posts a system message to the project's entity chat channel; FAIL-SAFE fire-and-forget (`void notifyProjectChannel(...).catch(()=>undefined)`, outside the txn) so approval creation can't break; cycle-checked; `ChatModule` now exports `ChatChannelsService`/`ChatMessagesService`, imported by `ProjectsApprovalsModule`.
- **Board transition enforcement** — `assertTransitionAllowed` in `projects-tickets.service` `updateTicket`+`reorder`; FAIL-OPEN (allows when no `workflow_transitions` configured / unmappable status / any query error; throws 400 only on a clean "transitions exist + this from→to matches none"). `validateTicketStatus` untouched. (Service now 611 lines — known debt.)
- **Wizard persistence** — `projects.settings` `$type` widened (+`projectType`/`workflow`/`features?`, no migration); `createProjectSchema` + `createProject` merge them additively; wizard now sends them (were UI-only). Additive — a create without them behaves exactly as before.
All reconciled (hook URLs↔routes, chat signatures, PermissionKeys). Build not run (siblings mid-edit).

---

## Sales
- [x] `/sales` — Sales overview
- [x] `/sales/person/[personSlug]` — Sales person profile
- [x] `/sales/quotas` — Quotas
- [x] `/sales/commissions` — Commissions
- [x] `/sales/forecast-report` — Forecast report
- [x] `/sales/cohort-analysis` — Cohort analysis
- [x] `/sales/rep-comparison` — Rep comparison
- [x] `/sales/meeting-prep` — Meeting prep
- [x] `/sales/playbook` — Playbook
- [x] `/sales/task-sequences` — Task sequences
- [x] `/sales/report-narrator` — Report narrator

---

## Customer Executive
- [x] `/customer-executive` — Overview
- [x] `/customer-executive/account-summary` — Account summary
- [x] `/customer-executive/client-onboarding` — Client onboarding
- [x] `/customer-executive/renewals` — Renewals
- [x] `/customer-executive/upsell` — Upsell
- [x] `/customer-executive/sla` — SLA
- [x] `/customer-executive/surveys` — Surveys
- [x] `/customer-executive/sentiment` — Sentiment
- [x] `/customer-executive/health` — CS Health Score engine (see Non-HR Features section)
- [x] `/customer-executive/nps` — NPS closed-loop (see Non-HR Features section)

---

~~## Marketing~~ — **REMOVED**: All `/marketing/*` pages, API routes, schema, hooks, sidebar nav, billing gates, and AI features deleted end-to-end.

~~## Digital Marketing~~ — **REMOVED**: All `/digital-marketing/*` pages, API routes, DM leads/campaigns schema, hooks, and sidebar nav deleted end-to-end.

---

## Inventory
> 2026-07-03 — full UI/UX conformance pass (all 24 pages): PageWrapper + URL-synced filters everywhere, DataTable/condensed table density, StatCard adoption, semantic badges, skeleton/empty/error states with themed illustrations, sheet 3-zone anatomy, gradients/violet removed, mutationKeys + calibrated staleTimes, dashboard client moved to `features/inventory` and de-cast (2 redundant queries dropped), dead assets deleted. tsc green.
- [x] `/inventory` — Inventory overview
- [x] `/inventory/products` — Products list
- [x] `/inventory/products/new` — New product
- [x] `/inventory/products/[productId]` — Product detail
- [x] `/inventory/products/categories` — Product categories
- [x] `/inventory/products/uom` — Units of measure
- [x] `/inventory/stock` — Stock levels
- [x] `/inventory/stock/adjustments` — Stock adjustments
- [x] `/inventory/stock/movements` — Stock movements
- [x] `/inventory/stock/transfers` — Stock transfers
- [x] `/inventory/stock/transfers/[transferId]` — Transfer detail
- [x] `/inventory/warehouses` — Warehouses
- [x] `/inventory/warehouses/[warehouseId]` — Warehouse detail
- [x] `/inventory/vendors` — Inventory vendors
- [x] `/inventory/vendors/[vendorId]` — Vendor detail
- [x] `/inventory/purchase-orders` — Purchase orders
- [x] `/inventory/purchase-orders/new` — New purchase order
- [x] `/inventory/purchase-orders/[poId]` — Purchase order detail
- [x] `/inventory/sales-orders` — Sales orders
- [x] `/inventory/sales-orders/new` — New sales order
- [x] `/inventory/sales-orders/[soId]` — Sales order detail
- [x] `/inventory/reports/stock-summary` — Stock summary report
- [x] `/inventory/reports/movements` — Movements report
- [x] `/inventory/reports/reorder` — Reorder report

> 2026-07-05 — full Inventory module expansion per `tasks/inventory` 25-doc PRD: backend stock engine (idempotency, row locking, valuation layers, reservations, number sequences, audit events; migrations 0156–0158 applied live), 20 backend modules (186 tests green), 43-key RBAC catalog (`:view`→`:read` fix end-to-end), 34 new frontend pages below, hooks split ≤300 lines, barrel completed, lint clean (0 warnings).
- [x] `/inventory/operations` — Operations hub
- [x] `/inventory/operations/receipts` — Goods receipts (GRN list + reverse)
- [x] `/inventory/operations/issues` — Outbound issues ledger
- [x] `/inventory/operations/picking` — Pick queue
- [x] `/inventory/operations/packing` — Pack queue
- [x] `/inventory/operations/shipping` — Ship queue
- [x] `/inventory/operations/returns` — Vendor + customer returns
- [x] `/inventory/cycle-counts` — Cycle counts
- [x] `/inventory/cycle-counts/[countId]` — Cycle count detail (lifecycle + variance post)
- [x] `/inventory/physical-audits` — Physical audits
- [x] `/inventory/physical-audits/[auditId]` — Physical audit detail
- [x] `/inventory/lots` — Lots/batches
- [x] `/inventory/lots/[lotId]` — Lot detail + traceability chain
- [x] `/inventory/serials` — Serial numbers
- [x] `/inventory/serials/[serialId]` — Serial detail + traceability
- [x] `/inventory/expiry` — Expiry alerts
- [x] `/inventory/replenishment` — Reorder suggestions + generate PO
- [x] `/inventory/replenishment/rules` — Reorder rules CRUD
- [x] `/inventory/forecasting` — Demand forecasting (SMA)
- [x] `/inventory/valuation` — Stock valuation + layers
- [x] `/inventory/costing` — Costing methods governance
- [x] `/inventory/barcode` — Barcode scan + lookup
- [x] `/inventory/import` — CSV import wizard
- [x] `/inventory/settings` — Inventory settings + sequences + health
- [x] `/inventory/quality` — Quality hub
- [x] `/inventory/quality/inspections` — Inspections (pass/fail/dispose)
- [x] `/inventory/quality/holds` — Quality holds
- [x] `/inventory/quality/recalls` — Recalls (OPEN→IN_PROGRESS→CLOSED)
- [x] `/inventory/packages` — Packages
- [x] `/inventory/shipments` — Shipments
- [x] `/inventory/loads` — Loads/containers
- [x] `/inventory/carriers` — Carriers
- [x] `/inventory/channels` — Sales channels + stock publications
- [x] `/inventory/3pl` — 3PL connections

---

## Organization
- [x] `/organization` — Organization overview
- [x] `/organization/departments` — Departments
- [x] `/organization/teams` — Teams
- [x] `/organization/locations` — Locations
- [x] `/organization/branches` — Branches
- [x] `/organization/business-units` — Business units
- [x] `/organization/cost-centers` — Cost centers

---

## Support
- [x] `/support` — Support overview
- [x] `/support/inbox` — Support inbox; `DashboardGate permission="dashboard:support:view"`
- [x] `/support/settings/sla` — SLA Policies CRUD (mirrors `/crm/settings/sla`); subject `support:settings:manage`.
- [x] `/support/settings/business-hours` — Business-hours calendars: timezone, weekly schedule grid, holidays, 24x7/default toggles; Sheet form (multi-section); subject `support:settings:manage`.
- [x] `/support/settings/channels` — Support channels (email/chat/whatsapp/sms) CRUD, inline active toggle; subject `support:channels:manage`.
- [x] `/support/portal` + `/support/portal/[portalTicketId]` — Customer-facing ticket portal (reuses `CLIENT_USER` auth, no new auth system): own-tickets-only list/create/detail/reply, no internal-note visibility; subject `support:portal:tickets:*`.
- [x] `/support/reports` (tabs: overview / agent-performance / queue-performance / channel-performance / automation-performance / csat) — Reporting dashboards: FRT/resolution time/SLA compliance/reopen rate/breakdowns, date-range + agent/queue/channel filters, recharts; subject `support:reports:view`.
- [x] `/ticket-feedback/[token]` — Public CSAT survey (no auth; top-level path chosen to avoid the `/support` middleware-prefix collision and to stay distinct from the pre-existing generic `/csat` survey-campaign backend module).
- [x] `/support/macros` — extended with `visibility` (org/team/private), `actions` (set status/priority/tag/internal-note on apply), usage counts, and a compose-time preview; "Use macro" wired into the inbox reply composer.
- [x] `/support/settings/automations` — extended `AutomationTrigger`/`AutomationActionType` (shared `hooks/api/automations.ts` + `automation-meta.ts`/`automation-builder-sheet.tsx`) with `ticket.priority_changed`/`ticket.message_received` triggers and `support_assign_ticket`/`support_set_priority`/`support_add_tag`/`support_internal_note` actions.
- [x] Ticket detail — AI suggestions panel (`ticket-ai-panel.tsx`): summary/sentiment/category/priority/spam analysis, suggested reply/macro (insert-to-composer via a `SUPPORT_INSERT_REPLY_DRAFT_EVENT` window event), KB-article suggestions, duplicate-ticket detection — every suggestion requires explicit agent accept/reject, never auto-applied. Ticket risk badge (SLA due-soon/breached/paused) added to the detail header.

---

## Reports
- [x] ~~`/reports`~~ — REDIRECT 2026-07-05 → `/crm/reports` (global stub page deleted; reports are module-owned: CRM `/crm/reports`, Payroll `/payroll/reports`, Timesheets `/timesheets/reports`, Inventory `/inventory/reports/*`, HR `/hr/analytics`, Recruitment `/hr/recruitment/reports`, Projects `/projects/[projectId]/reports`; Analytics product removed from shell)

---

## Chat & Communication
- [x] `/chat` — Chat
- [x] `/calendar` — Calendar: month/week/day views, responsive toolbar (stacked mobile, icon-only Export/Add on xs, compact date labels), adaptive month grid height + mobile/tablet cell typography via calendar-container CSS; icons migrated to @animateicons/react/lucide (Ticket/Video/Calendar/Tag/Pencil/HelpCircle lucide fallbacks only); Composio external accounts (2026-07-05): connect multiple Google Calendar/Outlook accounts via accounts sheet (connect/disconnect/set-primary, per-account visibility toggles + colors), merged all-accounts grid view (60s Redis-cached backend fetch, external events read-only with detail sheet + join-meeting link), event create sync-to-account select + Meet/Teams conference toggle, finalize-on-return with StrictMode guard; backend `integrations` module (`user_integration_connections`, RBAC `integrations:connections:view/manage`, no ModuleGuard by design — platform-level plumbing); migration PENDING (db:generate held); live-connect fixes (2026-07-07): finalize ownership now via Composio `list({userIds})` membership + ACTIVE check (SDK `wordId` is an account slug, not the owner), tool execution pins the latest toolkit version (SDK rejects "latest"), finalize redirect accepts both `connected_account_id`/`connectedAccountId` — verified live: finalize/list/external-events all 200; Meet/Teams meeting creation (2026-07-07): Google Meet link verified LIVE end-to-end (create+push+delete on real account); Outlook create/list args fixed to pinned-toolkit schema (`start_datetime`/`end_datetime`+`time_zone`, `attendees_info`) — Teams path schema-verified, awaits a connected Outlook account; Outlook update/delete-event tools don't exist in Composio's catalog (no-op stands); New Event dialog upgrades (2026-07-07): (a) attendee picker rebuilt as a shadcn Popover+Command combobox that SERVER-searches `GET /org/members?search=&limit=` (org-scoped ILIKE on name/first/last/email, debounced 300ms via `useCalendarMemberSearch`, selected shown as removable chips) — replaces the static full-member list; backend `listMembers` gained optional org-scoped `search`/`limit` (cap 100), no-arg call unchanged for other consumers; (b) manual "Meeting link" URL field (Video icon) so a Meet/Teams/Zoom link can be pasted without a synced account — persists to the new normalized `calendar_events.meeting_url` column (DDL applied live, unjournaled), returned in list/get, rendered as a "Join meeting" button in the detail sheet; auto-sync now stores the generated link in `meeting_url` (prefers user-provided) instead of overloading `location`. Verified live: search (org-isolated), manual-url create/list/invalid-400
- [x] `/notifications` — Notifications: PRD-aligned sections (ALL/UNREAD/MENTIONS/ASSIGNED_TO_ME/APPROVALS/BROADCASTS/ARCHIVED/SYSTEM), search bar with 300ms debounce, bulk actions (mark-read/archive/delete), section/category/priority filters via desktop Select row + mobile single DropdownMenu (Radix viewport max-height), inline approve/reject for APPROVALS section, compact divide-y list; `/notifications/preferences` — channel toggles + quiet hours + timezone + digest mode; `/notifications/templates` — CRUD with preview dialog; `/notifications/broadcasts` — create/publish/cancel/delete with status tabs; `/notifications/analytics` — metrics + per-category/priority bar charts; `/notifications/queue` — active + failed tabs with retry; `/notifications/audit` — audit log; GlobalHeader added (logo+workspace switcher+product switcher+search+AI/calendar/chat links+bell+quick-create+avatar); approve/reject hooks added; notification bell with popover

---

## AI
- [x] `/ai` — AI assistant

---

## Settings
- [x] `/settings` — Settings (catch-all)
- [x] `/settings/organization` — Organization settings
- [x] `/settings/members` — Members management
- [x] `/settings/roles` — Roles list
- [x] `/settings/roles/[roleId]` — Role editor: per-role permission matrix + member list via `useRole`/`useRoleMembers`, gated `settings:rbac:manage`, back button to `/settings/roles`
- [x] `/settings/roles/simulate` — Permission Simulator — employee combobox, simulates effective permissions via GET /roles/simulate/:targetUserId, grouped by module with expandable rows, scope badges
- [x] `/settings/modules` — Org module management: enable/disable feature modules via `useOrgModules`/`useToggleOrgModule`, responsive grid with Switch per module, gated `settings:manage`
- [x] `/settings/permissions` — Permission Matrix — replaced `DashboardGate allowedRoles` with `permission="settings:rbac:manage"`, added `GET /roles/permissions/matrix` backend endpoint, `useRolePermissionsMatrix()` hook, page now renders live role/permission data with loading skeleton, error state, and empty state
- [x] `/settings/branches` — Branches (E2E fix: empty state fills content height with in-card primary CTA)
- [x] `/settings/notifications` — Redirects to `/notifications/preferences`
- [x] `/settings/audit-log` — Audit log
- [x] `/settings/webhooks` — Webhooks (E2E fix: empty state fills content height with in-card primary CTA)
- [x] `/settings/email-templates` — Email templates
- [x] `/settings/custom-fields` — Custom fields (E2E fix: empty state fills content height with in-card primary CTA)
- [x] `/settings/feature-flags` — Feature flags; `DashboardGate permission="settings:manage"`
- [x] ~~`/settings/automations`~~ — REDIRECT 2026-07-05 → `/hr/settings/automations` (module-owned)
- [x] ~~`/settings/integrations/recruitment`~~ — REDIRECT 2026-07-05 → `/hr/settings/integrations`
- [x] ~~`/settings/integrations/git`~~ — REDIRECT 2026-07-05 → `/projects/settings/integrations`
- [x] ~~`/settings/integrations/calendar`~~ — REMOVED 2026-07-05: superseded by the in-calendar accounts sheet on `/calendar` (Composio-managed connections)
- [x] ~~`/settings/data-hub`~~ — DELETED 2026-07-05: module-owned import/export moved to `/crm/settings/import-export`, `/hr/settings/import-export`, `/payroll/settings/import-export`
- [x] ~~`/settings/ai`~~ — REDIRECT 2026-07-05 → `/crm/settings/ai`
- [x] `/projects/settings/integrations` — Integrations: eyebrow, RequireModule wrapper, Git connections with loading/error/empty states
- [x] `/support/settings/automations` — Support ticket automation rules
- [x] `/accounting/settings/automations` — Finance automation rules
- [x] `/settings/api-tokens` — API tokens
- [x] `/settings/devices` — Devices management
- [x] `/settings/login-history` — Login history
- [x] `/settings/security` — Security settings
- [x] `/settings/sessions` — Active sessions
- [x] `/settings/subscription` — Subscription management

---

## New Non-HR Feature Pages (added — full vertical: schema → migration → service → API → TanStack hooks → UI)
- [x] `/projects/[projectId]/reports` — Agile Reporting: velocity, burnup, cumulative-flow (CFD) + on-demand daily snapshots (`project_daily_snapshots`); recharts; per-section loading/empty/error states.
- [x] `/projects/goal` — Goals & OKRs: eyebrow, shared StatCardGrid, blue progress bars, RequireModule, filters in PageWrapper (`/goals` redirects here)
- [x] `/projects/goal/[goalId]` — Goal detail: key results + check-in Dialog (auto progress rollup), updates timeline, linked work items (`/goals/[goalId]` redirects here)
- [x] `/support/kb` — Knowledge Base manager: categories + articles, status/visibility filters, search (`kb_categories`/`kb_articles`/`kb_article_feedback`; subject `support:kb`).
- [x] `/support/kb/[articleId]` — KB article editor (title/category/excerpt/visibility/status/tags/content) + feedback summary.
> 2026-07-03 — refactored: monolithic pages (843/1041 lines) decomposed into `features/kb/components/*` (manager-content, article-editor + card/dialog/panels); PageWrapper filters w/ URL sync, StatCardGrid, themed empty-state illustrations, AlertDialog confirms, mutationKeys on all 16 KB mutations; `/support/kb` stays canonical (`?create=1` quick-create supported). Open item: editor is a Textarea — TipTap migration needs backend HTML contract.
- [x] `/help/[orgId]` & `/help/[orgId]/[slug]` — Public help center (no auth): browse/search published-public articles, helpful/not-helpful feedback.
- [x] `/projects/roadmap` — Roadmap: eyebrow, search in PageWrapper.filters, RequireModule, tabbed roadmap/feedback/changelog
- [x] `/roadmap/[orgId]` — Public roadmap board (no auth): upvote (localStorage voterKey), submit feedback, changelog feed.
- [x] `/customer-executive/health` — CS Health Score engine: configurable weights/thresholds (Sheet), recompute-now, per-account scores + breakdown (`health_score_config`/`client_health_scores`; reuses `crm:clients`).
- [x] ~~`/settings/automations`~~ — REDIRECT 2026-07-05 → module settings (`/hr/settings/automations`, `/support/settings/automations`, `/accounting/settings/automations`, `/crm/settings/automations`)
- [x] `/customer-executive/nps` — NPS closed-loop: surveys w/ public token, overall NPS + promoter/passive/detractor split, per-survey responses, activate/close (`nps_surveys`/`nps_responses`; reuses `crm:clients`).
- [x] `/nps/[token]` — Public NPS response page (no auth): 0–10 score + comment; server-derived category; only when survey is active.
- [x] `/support/macros` — Canned Responses manager: create/edit/copy macros by category (`support_macros`; subject `support:macros`).
- [x] `/support/routing` — Ticket Routing Rules: ordered condition→assignee/priority rules with enable toggle, applied on ticket creation (`support_routing_rules`; integrated into `POST /api/support`).
- [x] `/accounting/cash-flow` — Cash Flow Statement: operating/investing/financing sections derived from posted GL cash/bank movements; opening/closing/net + reconciliation (no new tables; reuses ledger/journal).
- [x] `/billing/recurring` — Recurring Invoices: list recurring invoices + "Generate due now" (clones via existing `createInvoice` as DRAFT, advances `nextRecurringDate` by `recurringInterval`; no new tables).
- [x] `/support/kb` + `/support/kb/[articleId]` + `/help/[orgId]` — **KB PDF Q&A (RAG)**: pgvector on Neon (`kb_article_chunks`, `vector(1536)` + HNSW cosine index), PDF (`unpdf`) + Word `.docx` (`mammoth`) + text extraction, OpenAI `text-embedding-3-small` embeddings (Gemini `gemini-2.0-flash` answer fallback). New `lib/services/kb-rag.ts` (extract→chunk→embed→index + cosine search + grounded answer w/ citations), `lib/ai/embeddings.ts`. Auto-reindex on attachment upload/delete + article edit; manual "Rebuild AI index" + index-status on editor; bulk "Index all for AI" backfill (`POST /api/support/kb/reindex-all`); per-article chunk cap (400). Endpoints: `POST /api/support/kb/ask` (authed, `support:kb:view`, ai rate-tier), `POST /api/public/kb/ask` (no-auth, published+public only), `…/reindex`, `…/index-status`. Reusable `KbAskPanel` on dashboard KB + public help center. Hooks `lib/api/hooks/support/kb-rag.ts`. DB/vector round-trip verified live; **blocked on a valid OPENAI_API_KEY for live answers** (both keys in `.env` currently 401/unregistered).

---

## Knowledge Base Module (KB PRD — phased rebuild; schema authored in web repo + `sync:schema`, ALL APIs in NestJS backend)
- [x] **Phase 0 — Foundations** — Promoted KB to a first-class top-level `kb` module. Schema (web, synced to backend): new `lib/db/schema/kb/` — `kb_spaces`, `kb_space_members`, `kb_article_restrictions`, `kb_article_versions`, `kb_article_translations`, `kb_tags`/`kb_article_tags`, `kb_events`, `tenant_ai_credits` + `tenant_ai_credit_transactions`; enums `kb_audience`/`kb_space_role`/`kb_translation_status`; extended `kb_articles` (spaceId, ownerId, contentText, seo*, reviewIntervalDays, lastVerifiedAt, archivedAt, `in_review` status) and `kb_categories` (spaceId, parentId). Raw SQL `migrations/0118_kb_foundations.sql` — pgvector, `in_review` enum value, FTS tsvector+GIN on articles & chunks, HNSW on chunk embeddings, default-"General"-space backfill. Entitlement/RBAC (web → JWT claims): `kb` added to `MODULES`+plan tiers; KB feature flags (`kb.public-portal`/`kb.ai`/`kb.multi-space`/`kb.analytics`/`kb.multilingual`); `lib/rbac/permissions/kb.ts` catalog wired into PERMISSIONS + role defaults (employees get `kb:*:view`, support gets full). Backend (`backend/src/modules/kb/`): `KbModule` + `KbCreditsService` (atomic consume/grant + ledger, `InsufficientCreditsException` 402), `KbAccessService` (accessible-space resolution + `assertArticleViewable` with restriction checks), `KbEventsService`; entitlement via existing `@RequireModule("kb")`/`ModuleGuard`, RBAC via `@CheckAbility`. Verified: backend `nest build` clean, `check:schema` in sync, web `tsc` 0 errors + lint clean. (Checkpoints for user: run `db:push`+`0118.sql` on a DB; backend has no eslint config; credit provisioning/UI = later phases.)
- [x] **Phase 1** — Spaces / Collections / Articles CRUD + reader + editor (internal). Backend (`backend/src/modules/kb`, committed feat/kb-module, `nest build` clean): `KbSpacesController` (list/create/get/update/soft-delete + auto admin membership), `KbCategoriesController` (collections, nest depth≤3, cycle-safe move), `KbArticlesController` (paginated permission-scoped list, get w/ access+restriction checks, create+publish+update with version snapshots, unpublish, verify, vote, versions list, restore) — all gated by `@RequireModule("kb")`+`@CheckAbility`. Frontend (committed main, `tsc` 0 + lint clean): `lib/api/hooks/kb/*` (spaces/categories/articles/versions), `types/kb.ts`, `/kb` routed to backend in `api-client`, `app/(authenticated)/knowledge-base/` — P1 home (search + space grid + create-space Sheet), P2 `/spaces/[spaceId]` (collection tree + paginated article list + create-collection Dialog), P3 reader `/spaces/[spaceId]/articles/[articleId]` (TipTap-JSON render via `@tiptap/html`, auto-TOC w/ scroll-spy, verified badge, helpful vote, edit/verify actions), P4 editor `/new` + `/edit` (TipTap, debounced autosave w/ create-then-edit, publish gate, settings Sheet). Sidebar "Knowledge Base" nav + middleware `/knowledge-base` → `kb:articles:view`. Content canonical = TipTap JSON string; `contentText` = plaintext for search.
- [x] **Phase 2** — Granular permissions + public help center. (2a) Backend `KbMembersController` GET/POST/DELETE `/kb/spaces/:spaceId/members` (grant by user or role + spaceRole; exactly-one-target; can't remove last admin); frontend members admin page (`/spaces/[spaceId]/members`) + add-member Dialog (user/role picker) + "Manage access" link on the space. (2b) Backend hardened ALL public KB queries (`public/kb.service` list/get/feedback + public Ask retrieval) to require space.audience ∈ {public,mixed} + status=published + visibility=public (no internal leak). Frontend public help (`/help/[orgId]` + `[slug]`) → SSR server components: TipTap-JSON render via `ArticleContent`, auto-TOC, `generateMetadata` + Article JSON-LD, "Still need help? → /contact" deflection, public helpful vote.
- [x] **Phase 3** — Search + Ask AI. Backend (committed, `nest build` clean): `KbSearchService`/Controller `GET /kb/search` (permission-scoped keyword + optional pgvector RRF over kb_article_chunks when embeddings configured; snippet; `kb_events` search/search_no_results logging); `KbAskService`/Controller `POST /kb/ask` (grounded cited answer reusing `LlmService`+`EmbeddingsService`, retrieval over accessible articles, metered 1 credit via `KbCreditsService.consume`, 402 `INSUFFICIENT_CREDITS`, graceful refusal w/o charge, `ai_answer` events); `AiModule` exports Llm/Embeddings. Frontend (`tsc` 0): hooks `useKbSearch`/`useKbAsk`, P6 `/knowledge-base/search` (results + zero-result Ask-AI CTA), P7 `/knowledge-base/ask` (inline `[n]` citations → article links, top-up prompt on insufficient credits, refusal→ticket).
- [x] **Phase 4** — Analytics + verification. Backend `KbAnalyticsController`: `/kb/analytics/overview` (views, search-success rate, AI answers, helpful ratio, Trust Score = verified÷published, top articles), `/kb/analytics/no-results`, `/kb/verification/queue` (overdue-for-review); view instrumentation `POST /kb/articles/:id/view` (increments views + `kb_events` view). Frontend: P11 analytics dashboard (MetricCards + no-results/top-article tables + date filter), verification queue page (per-row Verify), reader logs a view on mount.
- [x] **Phase 5 (core)** — AI authoring + gap analysis. Backend `KbAuthoringController` `/kb/ai/draft|improve|summarize|translate` (metered 1 credit each, reuse `LlmService`, `kb:ai:generate`). Frontend: in-editor AI toolbar (Draft-from-prompt / Improve / Summarize→excerpt via TipTap key-remount, insufficient-credit handling) + gap analysis page (`/knowledge-base/gaps`, reuses analytics no-results → "Draft article" prefilled via `?title=`).
- [x] **Phase 5 (optional follow-ons)** — article-from-ticket: KbFromTicketService + helpdesk deflection UI; multilingual translations CRUD page; embeddable widget: /public/kb/widget/:orgId/script; Enterprise features: pending.

---

## Onboarding
- [x] `/onboarding` — Employee onboarding wizard. Fixed ID-proof upload (sent `ID` vs DB enum `ID_PROOF`); added server-side Zod validation for doc type/mime/size and personal details; trimmed personal step to standard HR fields (removed experience/skills, added home address + emergency contact); compacted document cards. All access gating moved to middleware (owners/platform admins redirected away; completed users redirected to /dashboard via new `users.onboardingCompletedAt`, set on submit + surfaced in JWT) — no page-level role checks.
- [x] `/org-setup` + auth/invitation flow hardening (2026-07-02) — Multi-org made first-class: new `users.lastActiveOrgId` column; canonical resolution (lastActiveOrgId if valid, else newest membership whose org exists — always innerJoin organizations) in `auth.service.resolveActiveMembership` + `jwt-auth.guard.resolveOrgContext`; JwtAuthGuard falls back to DB when the JWT orgId claim is empty (fixes blanket "Organization not found" 401s after setup); org-setup self-heals orphaned memberships. Wizard trimmed 7→5 steps (unreachable StepInvite/StepComplete deleted, dead `POST /org/invite` hook removed, `setupSchema` trimmed to sent keys). `acceptInvitation` now returns `autoLoginToken` (auto-login after accepting, both new + existing users) and sets `hasDashboardAccess: true` + `lastActiveOrgId`; `switchOrg` persists `lastActiveOrgId`. `POST /users/invite` + resend now actually send the invitation email, block duplicate invites, and no longer leak the raw token. Magic-link verify rate limit 10→60/min (shared server IP). Debug console.logs removed. Migration APPLIED via `src/scripts/apply-auth-flow-migration.ts`.
- [x] Schema normalization + RBAC single-source wave 3 (2026-07-02) — `roles.permissions` JSONB removed: backfill executed (225 permissions catalog, 23,650 grants), all reads/writes cut to `role_permission_grants` + `ROLE_DEFAULT_PERMISSIONS`; `org_modules` confirmed live (entitlements toggling) and kept. Lifecycle arrays → join tables: `interview_panel_members`, `booking_link_interviewers`, `calibration_participants`, `announcement_targets`, `deal_meeting_attendees` (API wire shapes preserved). `users.skills`/`experienceYears` removed (dual-write killed; `employee_skills` is the source; onboarding/edit forms + PDF updated). Signin page split via `features/auth/` (`MfaStep`, `MagicLinkForm`, `OAuthButtons`, `SignInAlerts`) → 498 lines. Auth e2e specs added: 37 tests (`auth.controller.e2e-spec.ts`, `invitations.e2e-spec.ts`) — guards, Zod, rate limits, error codes, internal-secret gate. All migrations applied to dev DB via `apply-auth-flow-migration.ts` + `apply-normalization-migration.ts`. Verified: backend tsc ✓ build ✓ boot `/health` 200 ✓ frontend tsc ✓ lint ✓.
- [x] Auth platform hardening wave 2 (2026-07-02) — Typed error contract: `{ code, message, details? }` envelope (`AUTH_ACCOUNT_LOCKED` + retryAfterSeconds, `AUTH_MFA_REQUIRED`, `AUTH_TOKEN_INVALID/EXPIRED`, `AUTH_RATE_LIMITED`, …); frontend branches via `lib/parse-auth-error.ts`, zero string matching. One password policy 8–128 + complexity (`lib/password-utils.ts` constants; backend `passwordSchema`). Register anti-enumeration (`{success:true}` always; silent verification resend for unverified existing). New `POST /auth/force-change-password` wired to forced-change UI mode. All tokens hashed at rest (verification + invitation + magic-link); auto-login tokens ≤10min; invite validate/accept rate-limited. Email reliability: DB outbox (`email_outbox`) + cron retries w/ exponential backoff + DEAD status DLQ + error alerts. `getSessionData` now Redis-cached 60s (12 existing invalidation sites finally effective). Invitation lifecycle consolidated from 3 duplicate implementations into one `invitations.service.ts` (11 routes preserved); `auth.service` split (`auth-tokens.service.ts`); `organization/users` services split under the 500-line cap; 10 zombie `/auth/*` endpoints deleted (superseded by `/me/*`, `/hr/sessions`). Double audit logging removed (`userActivity` table dropped; `audit_logs` gained actorUserId/resourceType/resourceId). Schema: 5 FK indexes added; ranked normalization plan produced for 9 remaining JSONB-array violations (interview panels, booking interviewers, calibration participants, roles.permissions dual-source, users.skills dual-write, enabledModules dual-source, announcement targets, deal meeting attendees). Verified: backend tsc ✓ build ✓ boot+/health 200 ✓ frontend tsc ✓ lint 0 errors ✓; dev-DB migration applied.

---

## Workspace Setup Wizard (2026-06-29 → 2026-06-30)
- [x] `/setup` — 8-step customer workspace onboarding wizard (Welcome → Goals → Industry → Company Profile → AI Workspace Generation → Module Recommendations → Invite Team → Success). Full implementation end-to-end:
  - **Backend**: `WorkspaceOnboardingModule` with `POST /workspace-onboarding/generate` (idempotent industry-template workspace creation: BU/branch/depts/teams) and `POST /workspace-onboarding/complete` (sets `onboardingCompletedAt`). Both gated `settings:organization:manage`. `updateOrgSettingsSchema` extended with `companySize`, `country`, `enabledModules`. Permission key added to catalog.
  - **Frontend steps**: WelcomeStep (skip option), GoalsStep (8 goal cards, min 1 required), IndustryStep (10 industries, auto-advance with double-click guard via `hasFiredRef`), CompanyProfileStep (react-hook-form + Zod, saves to server), GenerationStep (animated task list, idempotent API call, retry on error), RecommendationsStep (goal→module mapping, enable/skip per module), InviteStep (stable-ID rows keyed by `crypto.randomUUID()`, CSV upload, per-row validation), SuccessStep (auto-calls `completeOnboarding`, error UI with retry).
  - **Persistence**: `wizard-storage.ts` — all wizard state in `localStorage` (`streamline:onboarding-wizard`), written on every step transition, cleared on completion or "Enter Workspace".
  - **Step gating**: `sanitizeStep()` enforces: no goals → max step 1, no industry → max step 2, no orgName → max step 3, never restores to step 7 (success). Prevents localStorage/URL manipulation to jump ahead.
  - **State**: 7 useState → 2 useState (consolidated `WizardState` object + `direction`); 1 useEffect loads localStorage + merges server seed in one pass; server data (`orgSettings.name`, `orgSettings.industry`) seeds localStorage on load, redirect if `onboardingCompletedAt` set.
  - **Post-setup**: `SuccessChecklist` floating widget (bottom-right, 5 items, localStorage-persisted done/dismissed state) injected into `dashboard-shell.tsx`.
  - **Removed steps**: IntegrationsStep and ImportStep removed (files deleted) — too complex/low-value for initial onboarding.
  - **Bug fixes (12 audit issues)**: invalid Tailwind class `h-4.5` fixed, `valueLabel` non-existent Progress prop replaced with `aria-label`, stable row IDs in InviteStep (index → UUID), `completeOnboarding` error surfaced with retry, double-click guard in IndustryStep, array guards in `loadWizardState` for corrupted localStorage.

---

## E2E Hardening Pass (real-browser audit, 2026-06-16)
Live Playwright E2E across all non-HR modules (105 routes × 3 viewports, authenticated as seeded owner) + parallel screenshot review. Bugs found & fixed (build ✓):
- [x] `/accounting/journal/new` & `/accounting/purchase-bills/new` — forms were dead (`pageSize ≤100` validation error: line-item account dropdowns request all accounts). Fixed: `listAccountsQuerySchema` allows `pageSize` ≤1000.
- [x] Currency app-wide — `formatCurrency` hard-coded `$` on an INR app → now delegates to `formatINRCompact` (₹). Also fixed 2 chart axes (`revenue-vs-goal-chart`, `sales-pipeline-charts`) and swapped `DollarSign`→`IndianRupee` icon across 16 currency cards.
- [x] `/dashboard` — Executive KPIs showed "Failed to load" because `GET /api/dashboard/executive` returned 403 for `OWNER` (allowed only CEO/HR/ADMIN). Fixed: added `OWNER`.
- [x] `/projects/[projectId]/analytics` — assignee chart showed raw `User <uuid>`; now joins `users` for real names.
- [x] `/billing/invoices/new` — line-item grid (`grid-cols-12`) was unusable at 375px; now stacks to labeled cards on mobile, tabular at md+.
- [x] `/crm/organizations` & `/crm/contacts` — create flow existed but had no trigger button (users couldn't create the first record); added header "New …" buttons + empty-state CTAs wired to the existing create dialogs.
- [x] `/settings/branches`, `/settings/custom-fields`, `/settings/webhooks` — empty states now fill content height with a solid in-card primary CTA (match Automations).

---

## Organization & Authorization Completion Pass (2026-06-28)
Completed all identified missing features across Organization and Authorization domains (build ✓):
- [x] `/organization/business-units` — Added archive/restore UI (toggle "Archived (N)" button, amber badge, Restore/Delete for archived rows, Edit/Archive for active rows).
- [x] `/organization/branches` — Same archive/restore pattern as business-units.
- [x] `/organization/departments` — Same archive/restore pattern; added Branch selector in form.
- [x] `/organization/teams` — Same archive/restore pattern; Capacity column added.
- [x] `/organization/locations` — Same archive/restore pattern; no `deletedAt` so filter by `status === "ARCHIVED"` only.
- [x] `/organization/cost-centers` — Same archive/restore pattern; converted anonymous handlers to `useCallback`.
- [x] `/settings/api-tokens` — Full implementation: list/create/revoke/delete tokens; token-created dialog with one-time copy; scope selector; expiry date.
- [x] `/settings/organization` — Added `maxConcurrentSessions` field to Security Policies section; wired to backend.
- Backend: Created `api-tokens` NestJS module (controller/service/dto) with list/create/revoke/delete endpoints; registered in `app.module.ts`.
- Backend: Added `maxConcurrentSessions` to `organizations` schema (frontend + backend), org security DTO, and session enforcement in `auth.service.ts` (oldest sessions revoked on login when limit exceeded).
- DB: Migration `0124_max_concurrent_sessions.sql` adds `max_concurrent_sessions` column.

---

## HR — New HRMS Pages (2026-07-01)
Full end-to-end: backend NestJS API → TanStack Query hooks → Next.js pages + feature components. All TypeScript errors resolved; `tsc --noEmit` clean.

### Attendance & Scheduling
- [x] `/hr/shifts` — Shifts management: list with status/time filters, create/edit/delete shift Sheet (name/start/end/days/capacity), assign-employee Dialog, active/draft/archived tabs
- [x] `/hr/rosters` — Rosters: weekly calendar grid, employee row per day, assign/unassign shifts via slot click, week navigation
- [x] `/hr/overtime` — Overtime requests: my requests + team requests tabs, comp-off balance card, approve/reject actions, create request Sheet
- [x] `/hr/comp-off` — Comp-off management: balance card, request history, create comp-off request from overtime
- [x] `/hr/geofencing` — Geofencing: office location map list, add/edit geofence Sheet (name/radius/lat/lng), GPS validation status
- [x] `/hr/biometric` — Biometric integration: device list (ZKTeco/Suprema/eSSL), sync logs, attendance pull history, device add/remove Dialog

### Leave Management
- [x] `/hr/leave-policies` — Leave policy rules engine: accrual/carry-forward/encashment config per policy type, create/edit/delete Sheet with Zod validation
- [x] `/hr/holidays` — Holiday calendar: global + branch holidays, recurring support, import/export, create/edit/delete with date picker
- [x] `/hr/leaves/analytics` — Leave analytics: status distribution bar, monthly trend chart, stat cards (total/pending/months tracked)

### Legacy Payroll (now redirect stubs)
- [x] `/hr/payroll/salary-structures` — redirects to /payroll/salary-structures
- [x] `/hr/payroll/allowances` — redirects to /payroll/components
- [x] `/hr/payroll/tax` — redirects to /payroll/taxes
- [x] `/hr/payroll/bank-transfers` — redirects to /payroll/bank-transfers

### Recruitment
- [x] `/hr/recruitment/requisitions` — Job requisitions pipeline: list with status filters, create/edit requisition Sheet (role/dept/headcount/priority), approval workflow

### Performance
- [x] `/hr/goals` — Goals & OKRs: list with status/type filters, create/edit goal Sheet, progress tracking, key results inline
- [x] `/hr/kpis` — KPI & competency frameworks: KPI list with target/actual, framework categories, create/edit Sheet
- [x] `/hr/feedback` — 360-degree feedback: feedback cycles list, create cycle Sheet, peer/manager/self review assignments
- [x] `/hr/performance/analytics` — Performance analytics: review cycle stats (BarChart by type, PieChart by status), active cycles count

### Learning
- [x] `/hr/courses` — Courses & LMS: course catalog with category/status filters, enrollment management, create/edit Sheet
- [x] `/hr/training` — Training programs & attendance: program list, session scheduling, attendance tracking
- [x] `/hr/career-development` — Career development: career paths list + my career plan tab (path ladder, milestones, target role/date)
- [x] `/hr/learning/analytics` — Learning analytics: enrollment stats, completion rates, popular courses chart

### Travel & Comms
- [x] `/hr/travel` — Travel requests: my requests list, create request Sheet (destination/dates/purpose/advance), status tracking
- [x] `/hr/travel/approvals` — Travel approvals: manager view of pending/approved/rejected requests, approve/reject actions
- [x] `/hr/announcements` — Announcements broadcast: list with pinned/active/archived tabs, create/edit Sheet, read-count tracking
- [x] `/hr/signatures` — Digital signatures: document sign requests list, create signature request Dialog, status tracking (pending/signed/expired)

---

## Payroll (PayrollOS module — 20 routes; migrations 0147-0150 applied; 261 unit + 4 e2e suites; full conformance pass 2026-07-04: 40+ audit findings fixed incl. ESS RBAC, engine calc methods, variance, module gating, snapshot-immutability triggers)
<!-- Gap-closure pass 2026-07-05 (6-agent audit vs 32-doc PRD → ~24 P0 + ~35 P1/P2 fixed by 10 parallel agents + manual seam reconciliation): calc engine (PERCENT_OF_BASIC base, FY2025-26 TDS + §87A + OLD-regime, half-day proration, reimportInputs, deduction ordering, unary-minus, OT guard, profiles.active); loan EMI recovery wired atomically into both lock paths; multi-currency payout sub-batches; journal double-entry now balances; reports RBAC→AccessService + pagination(100) + N+1; FNF 9-component net + HR/FINANCE review states + statement download; ESS bank-lock + declaration SUBMITTED + lockDate; bonus month/taxable/9-types; reimbursement payrollMonth end-to-end; fxRates persistence; calendar BOLA/atomic/audit; reminder scheduler; setup preview/toggle/category/activation-crash fixes; migration 0155_payroll_gapclosure written (UNRUN, unjournaled — renumber before db:migrate). NOT build/test-verified this pass (concurrent session active — run `pnpm -C backend typecheck` + payroll suites). Deferred: SALARY_ON_HOLD (no data source) + DUPLICATE_BANK_ACCOUNT (needs bank decrypt in run loop) detection wired but unpopulated; US Medicare YTD, IN PT brackets, per-category receipts need schema. -->

- [x] `/payroll` — Command Center: live run status, employee exception counts, stat cards, pending actions
- [x] `/payroll/me` — Employee self-service portal: my payslips, salary breakdown, declarations, bank details, loan requests
- [x] `/payroll/setup` — Owner setup wizard: template-first onboarding, policy toggles, payroll policy version creation
- [x] `/payroll/templates` — Template library: 5+ preset templates (Startup/SMB/MNC/Contract/Compliance), preview & activate
- [x] `/payroll/components` — Salary components engine: earnings and deductions CRUD with fixed/percentage formula types
- [x] `/payroll/settings` — Payroll settings: policy builder toggles, statutory config, notification rules
- [x] `/payroll/settings/import-export` — Payroll register CSV export
- [x] `/payroll/salary-structures` — Salary structure templates: basic/HRA/allowance config, effective date ranges, active/inactive
- [x] `/payroll/runs` — Payroll runs list: all runs with status filter (DRAFT/APPROVED/LOCKED/PAID/CLOSED), create new run
- [x] `/payroll/runs/[runId]` — Run detail: generate, approve, lock, reopen, mark paid lifecycle; exception list; employee breakdown
- [x] `/payroll/inputs` — Attendance inputs: LOP days, half-days, overtime hours per employee per period
- [x] `/payroll/employees` — Employee salary profiles list: assigned structure, CTC, last run status
- [x] `/payroll/employees/[employeeUserId]` — Employee salary profile detail: structure assignment, bank details (masked), history
- [x] `/payroll/reimbursements` — Reimbursements CRUD: claim list with approve/reject, add reimbursement dialog
- [x] `/payroll/bonuses` — Bonuses & incentives: one-time/recurring bonus CRUD, variable pay config
- [x] `/payroll/loans` — Loans & advances: loan applications, repayment schedule, EMI deduction config
- [x] `/payroll/taxes` — Tax & statutory: investment declarations (employee + admin), IT proof upload, regime selection, verification
- [x] `/payroll/bank-transfers` — Bank transfer batches: NEFT/RTGS disbursement runs, status tracking, NEFT file download
- [x] `/payroll/payslips` — Payslips: org-wide published payslips list, download, bulk publish
- [x] `/payroll/fnf` — FNF settlement: full & final calculations for exiting employees, gratuity, leave encashment
- [x] `/payroll/reports` — Reports: payroll register, bank payout report, journal export, cost center report, variance report

---

## Workflow & Automation Platform
- [x] `/workflows` — Workflow dashboard: analytics stats (total/active/executions/pending), workflow card list with status filters + search, create workflow Dialog (name + description), duplicate + delete, border-color per status, Framer Motion stagger
- [x] `/workflows/[workflowId]` — Workflow detail: status badge, version, description, execution history list, trigger workflow button, edit/builder link
- [x] `/workflows/[workflowId]/builder` — Visual workflow builder: React Flow canvas, node palette sidebar, node config panel, publish/save actions, lazy state init via BuilderGate wrapper to avoid hook-in-effect violations
- [x] `/workflows/templates` — Template gallery: search + category filter, template cards with Use button, creates workflow from template and navigates to builder
- [x] `/workflows/executions` — Execution monitor: paginated global execution list, status filter tabs, cancel action, auto-refetch when running
- [x] `/workflows/approvals` — Approval center: pending approval cards, approve/reject Dialog with optional comment, pending count badge
- [x] `/workflows/scheduler` — Cron scheduler: global schedule list, toggle enable/disable, delete with confirm Dialog, cron badge + timezone display
- [x] `/workflows/analytics` — Analytics dashboard: 6 stat cards (total/active/executions/success-rate/avg-duration/pending-approvals), 30-day execution trend bar chart
- [x] `/workflows/secrets` — Secrets manager: org-level encrypted secrets list, create Sheet (name/value/description, uppercase key enforced), delete with confirm
- [x] `/workflows/variables` — Variables manager: org-wide workflow version variables list grouped with workflow link, delete with confirm

---

## Knowledge Base Wiki (Notion-style Pages) — PRD-knowledge-base-wiki.md
> 2026-07-03 — conformance pass: Skeleton loading states, EmptyState adoption (+ EmptyKnowledgeIllustration on wiki home), sheet header/border fixes, `--accent` misuse → blue tokens, GPU-safe tree animation + useReducedMotion, aria-labels on icon buttons, all 4 `window.confirm` → AlertDialog, casts removed. Route prefix renamed /knowledge-base → /knowledge; back-compat redirect shims added; right utility panel added to page-document.
> 2026-07-05 — Plate v53 editor upgraded to full-featured toolbar (undo/redo, block-type, font-size, marks, color, align, lists, link, table, emoji, HR) + R2 media uploads (image/video/audio/file via `POST /kb/media`); VideoPlugin/AudioPlugin/FilePlugin/PlaceholderPlugin + CaptionPlugin registered; new media element components + fixed sticky toolbar; `uploadKbMedia` wired through `page-document.tsx`; public renderer updated for media nodes.
- [x] `/knowledge` — Wiki home: Recents, Favorites, root pages, New page action, template starters + full-height empty state; layout owns collapsible page-tree panel (Favorites section, add-child/context menu per node, Quick find Ctrl+K, Templates, Trash)
- [x] `/knowledge/pages/[pageId]` — Notion-style document: breadcrumbs, gradient/URL cover, emoji icon, inline title, TipTap document editor (slash commands, to-dos, tables, images, code highlight, callouts, toggles, @user mentions, [[page links]]), 1.5s autosave with save indicator, favorite, threaded comments Sheet, version history Sheet with restore, backlinks, duplicate/move/lock/export HTML/delete, trash restore + permanent delete; right utility panel (Details, Backlinks, Linked records) hidden below xl; backend: kb_pages + 6 sibling tables, 6 RBAC keys (kb:pages:*, kb:templates:manage), FTS search; migrations 0139/0140 pending TTY
- [x] `/knowledge/recent` — Recently visited pages: compact list rows (icon, title link, relative updated-at); skeleton/empty/error states; live count subtitle
- [x] `/knowledge/favorites` — Favorited pages: list with hover remove-star action via toggleFavorite mutation; empty state CTA to browse pages
- [x] `/knowledge/trash` — Full-page trash: list rows (icon, title, deleted-at) with Restore + Delete forever (AlertDialog confirm) via existing hooks; skeleton/empty/error states
- [x] `/knowledge/templates` — Templates grid (icon, name, description); Use → create page from template → navigate to new page; Delete gated on kb:templates:manage; skeleton/empty/error states
- [x] `/knowledge/analytics` — KB analytics: StatCardGrid (total pages, views, searches, helpful votes, search success rate) + no-result searches table; client useCan("kb:analytics:view") gate with access-denied EmptyState; skeleton loading
- [x] `/wiki/[shareToken]` — Public shared wiki page (unauthenticated, `(public)` group); server-side fetches `GET /public/wiki/:token` from backend; token validated `/^[A-Za-z0-9-]{8,64}$/`; 404 on invalid/non-public; renders cover (gradient presets replicated), icon + title, updated-at, content via `PublicPageContent` (dynamic ssr:false) — defensive renderer for both TipTap JSON and Slate node trees; `robots: noindex,nofollow` via `generateMetadata`
- [x] `/knowledge/spaces` — Spaces list with card grid, create/edit Sheet, delete AlertDialog; manage gated by kb:spaces:manage
- [x] `/knowledge/spaces/[spaceId]` — Space detail with info card + honest EmptyState for page list (spaceId not in tree nodes)
- [x] `/knowledge/private` — Private pages view filtered from page tree (visibility==="private") via filterTreeWithAncestors
- [x] `/knowledge/shared` — Shared-with-me view: pages where createdById !== current user, shown as rows with status badge
- [x] `/knowledge/reviews` — Governance review queue: status+type filter selects, condensed table (page title link, type badge, status badge, reviewer, due date w/ overdue red, requested-by, Approve/Reject actions w/ note dialogs gated kb:reviews:manage); useCan("kb:reviews:view") gate with lock EmptyState; skeleton/empty/error states
- [x] `/knowledge/settings` — KB module settings: module status card (core always-on), default review intervals table (policy 180d / SOP 90d / support 120d / other 365d), quick-links to /settings/roles and /settings/modules; useCan("kb:settings:manage") gate with lock EmptyState
- [x] `/knowledge/pages/[pageId]/history` — Full-page version history: two-pane layout (left: version list with active bg-blue-50 selection; right: read-only PublicPageContent preview + diff-lite summary vs current page + Restore AlertDialog); diff-lite helper in features/knowledge-base/lib/version-diff.ts (title change, word-count delta, first differing 200-char excerpt); "Open full history" link added to page-history-sheet list-view footer; pageHistoryHref added to knowledge-routes.ts
- [x] `/knowledge/import` — Import & Export: mode toggle (Markdown files / Paste text); file-multiple FileReader parse → {title, contentText}; preview table with per-row dedupe warning + remove; import mutation → useImportKbPages (POST /kb/pages/import); import history table (useKbImportJobs); ExportJobsCard (useKbExportJobs, GET /kb/export-jobs); permission gate useCan("kb:pages:import"); starter templates section on /knowledge/templates (15 types, see features/knowledge-base/lib/starter-templates.ts)
- [x] `/knowledge-base` → redirect to `/knowledge` (back-compat shim for old DB notification links)
- [x] `/knowledge-base/pages/[pageId]` → redirect to `/knowledge/pages/[pageId]` (back-compat shim)
