# Pages

Ordered money-path first. Check off each page after fixing.

> **Visual redesign (redesign/v2 branch)**: All landing, auth, public/marketing pages have been visually redesigned — `brand-text` gradient clip-text removed (hero `brand-sweep` kept), `rounded-3xl` → `rounded-2xl`/`rounded-xl`, decorative uppercase eyebrows removed/converted to `font-medium`, `PageWrapper` eyebrow styling updated. Dashboard feature pages already use clean design system — no `brand-text` or `rounded-3xl` found.

---

## Global Navigation (Platform Shell)
- [x] `layout` — Activity Bar approach (VS Code/Linear style): thin 48px vertical icon rail (ActivityBar) for product switching using @phosphor-icons/react fill/regular weight + framer-motion spring indicator; full sidebar restored (logo+workspace, context-aware nav via getNavGroupsForProduct, search+bell footer, inline user profile dropdown); MobileBottomNav preserved; home product now shows Overview nav (Dashboard/Calendar/Chat/Notifications/Reports); tooltips z-[200]; deleted TopHeader, ProductSwitcher, orphaned NotificationBell and SidebarUserMenu

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
- [x] `/crm/deals` — Deals kanban + table, stage management, forecast
- [x] `/crm/deals/[dealId]` — Deal detail: info + activities + meetings + sidebar stats
- [x] `/crm/deals/approvals` — Deal approval workflow
- [x] `/crm/deals/aging` — Aging deals report
- [x] `/crm/deals/win-loss` — Win/loss analysis
- [x] `/crm/quotes` — Quotes list with status filters
- [x] `/crm/quotes/[quoteId]` — Quote detail with line items + totals
- [x] `/crm/contacts` — Contacts list with search/filter
- [x] `/crm/clients` — Client accounts list with health status
- [x] `/crm/clients/[clientId]` — Client detail: info + activities + timeline + opportunities
- [x] `/crm/organizations` — Organizations list
- [x] `/crm/organizations/[organizationId]` — Org detail: rollup stats + hierarchy + timeline
- [x] `/crm/targets` — Sales targets/quotas management
- [x] `/crm/territories` — Territory management
- [x] `/crm/web-forms` — Web lead forms CRUD
- [x] `/crm/analytics` — CRM analytics dashboard
- [x] `/crm/reports` — CRM reports
- [x] `/crm/csat` — Customer satisfaction scores
- [x] `/crm/settings/assignment-rules` — Lead assignment rules
- [x] `/crm/settings/email-templates` — CRM email templates
- [x] `/crm/settings/scoring-rules` — Lead scoring rules
- [x] `/crm/settings/sla` — SLA policies

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
- [x] `/hr/payroll` — Payroll
- [x] `/hr/my-payslips` — My payslips
- [x] `/hr/expenses` — Expenses
- [x] `/hr/reimbursements` — Reimbursements
- [x] `/hr/assets` — Assets
- [x] `/hr/devices` — Devices (redirects to /hr/assets — intentional)
- [x] `/hr/work-logs` — Work logs
- [x] `/timesheets` — Timesheets (personal)
- [x] `/timesheets/team` — Team timesheets

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
- [x] `/projects` — Projects list
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
- [x] `/projects/[projectId]/analytics` — Analytics (E2E fix: assignee chart now joins users for real names)
- [x] `/projects/[projectId]/budget` — Budget
- [x] `/projects/[projectId]/settings` — Project settings
- [x] `/projects/[projectId]/whiteboard` — Whiteboard
- [x] `/projects/templates` — Project templates
- [x] `/projects/resource-allocation` — Resource allocation

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

---

## Reports
- [x] `/reports` — Reports

---

## Chat & Communication
- [x] `/chat` — Chat
- [x] `/calendar` — Calendar
- [x] `/notifications` — Notifications

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
- [x] `/settings/notifications` — Notifications settings
- [x] `/settings/audit-log` — Audit log
- [x] `/settings/webhooks` — Webhooks (E2E fix: empty state fills content height with in-card primary CTA)
- [x] `/settings/email-templates` — Email templates
- [x] `/settings/custom-fields` — Custom fields (E2E fix: empty state fills content height with in-card primary CTA)
- [x] `/settings/feature-flags` — Feature flags; `DashboardGate permission="settings:manage"`
- [x] `/settings/automations` — No-code Automation Builder (see Non-HR Features section)
- [x] `/settings/integrations/recruitment` — Recruitment integrations
- [x] `/settings/integrations/calendar` — Calendar integration — multi-account connect (multiple Google/Microsoft accounts), default-calendar selection, per-account disconnect; free/busy unioned across all calendars
- [x] `/settings/integrations/git` — Git integration
- [x] `/settings/data-hub` — Data hub
- [x] `/settings/ai` — AI settings
- [x] `/settings/api-tokens` — API tokens
- [x] `/settings/devices` — Devices management
- [x] `/settings/login-history` — Login history
- [x] `/settings/security` — Security settings
- [x] `/settings/sessions` — Active sessions
- [x] `/settings/subscription` — Subscription management

---

## New Non-HR Feature Pages (added — full vertical: schema → migration → service → API → TanStack hooks → UI)
- [x] `/projects/[projectId]/reports` — Agile Reporting: velocity, burnup, cumulative-flow (CFD) + on-demand daily snapshots (`project_daily_snapshots`); recharts; per-section loading/empty/error states.
- [x] `/goals` — Goals & OKRs list: stats header, status/level filters, grouped goal cards w/ progress, create via Sheet (`okr_goals`/`okr_key_results`/`okr_updates`/`okr_links`; subject `projects:goals`).
- [x] `/goals/[goalId]` — Goal detail: key results + check-in Dialog (auto progress rollup), updates timeline, linked work items.
- [x] `/support/kb` — Knowledge Base manager: categories + articles, status/visibility filters, search (`kb_categories`/`kb_articles`/`kb_article_feedback`; subject `support:kb`).
- [x] `/support/kb/[articleId]` — KB article editor (title/category/excerpt/visibility/status/tags/content) + feedback summary.
- [x] `/help/[orgId]` & `/help/[orgId]/[slug]` — Public help center (no auth): browse/search published-public articles, helpful/not-helpful feedback.
- [x] `/projects/roadmap` — Roadmap manager: roadmap items by status, feedback (by votes), changelog (`roadmap_items`/`roadmap_votes`/`feedback_posts`/`feedback_votes`/`changelog_entries`; subject `projects:roadmap`).
- [x] `/roadmap/[orgId]` — Public roadmap board (no auth): upvote (localStorage voterKey), submit feedback, changelog feed.
- [x] `/customer-executive/health` — CS Health Score engine: configurable weights/thresholds (Sheet), recompute-now, per-account scores + breakdown (`health_score_config`/`client_health_scores`; reuses `crm:clients`).
- [x] `/settings/automations` — No-code Automation Builder: trigger→condition→action rules wired into `lead.created` + deal stage-change; in-app/email/task/webhook actions; run history + test (`automation_rules`/`automation_runs`; subject `settings:automations`).
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
