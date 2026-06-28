# Pages

Ordered money-path first. Check off each page after fixing.

> **Visual redesign (redesign/v2 branch)**: All landing, auth, public/marketing pages have been visually redesigned — `brand-text` gradient clip-text removed (hero `brand-sweep` kept), `rounded-3xl` → `rounded-2xl`/`rounded-xl`, decorative uppercase eyebrows removed/converted to `font-medium`, `PageWrapper` eyebrow styling updated. Dashboard feature pages already use clean design system — no `brand-text` or `rounded-3xl` found.

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
- [ ] `/hr/helpdesk` — HR helpdesk
- [ ] `/hr/handbook` — Employee handbook
- [ ] `/hr/recognition` — Recognition
- [ ] `/hr/performance` — Performance reviews
- [ ] `/hr/surveys` — Surveys
- [ ] `/hr/enps` — eNPS
- [ ] `/hr/assessments` — Assessments
- [ ] `/hr/learning-paths` — Learning paths
- [ ] `/hr/skills` — Skills
- [ ] `/hr/certifications` — Certifications
- [ ] `/hr/career-ladders` — Career ladders
- [ ] `/hr/loans` — Loans
- [ ] `/hr/bonuses` — Bonuses
- [ ] `/hr/incentives` — Incentives
- [ ] `/hr/documents` — Documents
- [ ] `/hr/documents/templates` — Document templates
- [ ] `/hr/documents/editor/new` — New document
- [ ] `/hr/documents/editor/[documentId]` — Document editor
- [ ] `/hr/document-review` — Document review
- [ ] `/hr/document-types` — Document types
- [ ] `/hr/email-templates` — HR email templates
- [ ] `/hr/compliance` — Compliance
- [ ] `/hr/background-verification` — Background verification
- [ ] `/hr/alumni` — Alumni
- [ ] `/hr/exit` — Exit management
- [ ] `/hr/fnf` — Full & final settlement
- [ ] `/hr/termination` — Terminations
- [ ] `/hr/asset-returns` — Asset returns
- [ ] `/hr/analytics` — HR analytics
- [ ] `/hr/team-events` — Team events
- [ ] `/hr/employees/find-expert` — Find expert
- [ ] `/hr/employees/skills-matrix` — Skills matrix

---

## HR — Recruitment
- [ ] `/hr/recruitment` — Recruitment overview
- [ ] `/hr/recruitment/jobs` — Job postings
- [ ] `/hr/recruitment/candidates` — Candidates list
- [ ] `/hr/recruitment/candidates/[candidateId]` — Candidate detail
- [ ] `/hr/recruitment/pipeline` — Pipeline
- [ ] `/hr/recruitment/interviews` — Interviews
- [ ] `/hr/recruitment/scorecard-templates` — Scorecard templates
- [ ] `/hr/recruitment/question-bank` — Question bank
- [ ] `/hr/recruitment/interviewer-performance` — Interviewer performance
- [ ] `/hr/recruitment/diversity-report` — Diversity report
- [ ] `/hr/recruitment/sla` — Recruitment SLA
- [ ] `/hr/recruitment/sla-report` — SLA report

---

## Projects
- [ ] `/projects` — Projects list
- [ ] `/projects/[projectId]` — Project board
- [ ] `/projects/[projectId]/backlog` — Backlog
- [ ] `/projects/[projectId]/sprints` — Sprints
- [ ] `/projects/[projectId]/timeline` — Timeline
- [ ] `/projects/[projectId]/epics` — Epics
- [ ] `/projects/[projectId]/cycles` — Cycles
- [ ] `/projects/[projectId]/modules` — Modules
- [ ] `/projects/[projectId]/milestones` — Milestones
- [ ] `/projects/[projectId]/pages` — Pages
- [ ] `/projects/[projectId]/views` — Views
- [ ] `/projects/[projectId]/intake` — Intake
- [ ] `/projects/[projectId]/my-tickets` — My tickets
- [ ] `/projects/[projectId]/analytics` — Analytics
- [ ] `/projects/[projectId]/budget` — Budget
- [ ] `/projects/[projectId]/settings` — Project settings
- [ ] `/projects/templates` — Project templates
- [ ] `/projects/resource-allocation` — Resource allocation

---

## Sales
- [ ] `/sales` — Sales overview
- [ ] `/sales/person/[personSlug]` — Sales person profile
- [ ] `/sales/quotas` — Quotas
- [ ] `/sales/commissions` — Commissions
- [ ] `/sales/forecast-report` — Forecast report
- [ ] `/sales/cohort-analysis` — Cohort analysis
- [ ] `/sales/rep-comparison` — Rep comparison
- [ ] `/sales/meeting-prep` — Meeting prep
- [ ] `/sales/playbook` — Playbook
- [ ] `/sales/task-sequences` — Task sequences
- [ ] `/sales/report-narrator` — Report narrator

---

## Customer Executive
- [ ] `/customer-executive` — Overview
- [ ] `/customer-executive/account-summary` — Account summary
- [ ] `/customer-executive/client-onboarding` — Client onboarding
- [ ] `/customer-executive/renewals` — Renewals
- [ ] `/customer-executive/upsell` — Upsell
- [ ] `/customer-executive/sla` — SLA
- [ ] `/customer-executive/surveys` — Surveys
- [ ] `/customer-executive/sentiment` — Sentiment

---

~~## Marketing~~ — **REMOVED**: All `/marketing/*` pages, API routes, schema, hooks, sidebar nav, billing gates, and AI features deleted end-to-end.

~~## Digital Marketing~~ — **REMOVED**: All `/digital-marketing/*` pages, API routes, DM leads/campaigns schema, hooks, and sidebar nav deleted end-to-end.

---

## Support
- [ ] `/support` — Support overview
- [ ] `/support/inbox` — Support inbox

---

## Reports
- [ ] `/reports` — Reports

---

## Chat & Communication
- [ ] `/chat` — Chat
- [ ] `/calendar` — Calendar
- [ ] `/notifications` — Notifications

---

## AI
- [ ] `/ai` — AI assistant

---

## Settings
- [ ] `/settings` — Settings (catch-all)
- [ ] `/settings/organization` — Organization
- [ ] `/settings/members` — Members
- [ ] `/settings/roles` — Roles
- [x] `/settings/roles/simulate` — Permission Simulator — employee combobox, simulates effective permissions via GET /roles/simulate/:targetUserId, grouped by module with expandable rows, scope badges
- [x] `/settings/permissions` — Permission Matrix — replaced `DashboardGate allowedRoles` with `permission="settings:rbac:manage"`, added `GET /roles/permissions/matrix` backend endpoint, `useRolePermissionsMatrix()` hook, page now renders live role/permission data with loading skeleton, error state, and empty state
- [ ] `/settings/branches` — Branches
- [ ] `/settings/notifications` — Notifications
- [ ] `/settings/audit-log` — Audit log
- [ ] `/settings/webhooks` — Webhooks
- [ ] `/settings/email-templates` — Email templates
- [ ] `/settings/custom-fields` — Custom fields
- [ ] `/settings/integrations/recruitment` — Integrations
- [x] `/settings/integrations/calendar` — Calendar integration — multi-account connect (multiple Google/Microsoft accounts), default-calendar selection, per-account disconnect; free/busy unioned across all calendars
- [ ] `/settings/data-hub` — Data hub
- [ ] `/settings/ai` — AI settings

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

## E2E Hardening Pass (real-browser audit, 2026-06-16)
Live Playwright E2E across all non-HR modules (105 routes × 3 viewports, authenticated as seeded owner) + parallel screenshot review. Bugs found & fixed (build ✓):
- [x] `/accounting/journal/new` & `/accounting/purchase-bills/new` — forms were dead (`pageSize ≤100` validation error: line-item account dropdowns request all accounts). Fixed: `listAccountsQuerySchema` allows `pageSize` ≤1000.
- [x] Currency app-wide — `formatCurrency` hard-coded `$` on an INR app → now delegates to `formatINRCompact` (₹). Also fixed 2 chart axes (`revenue-vs-goal-chart`, `sales-pipeline-charts`) and swapped `DollarSign`→`IndianRupee` icon across 16 currency cards.
- [x] `/dashboard` — Executive KPIs showed "Failed to load" because `GET /api/dashboard/executive` returned 403 for `OWNER` (allowed only CEO/HR/ADMIN). Fixed: added `OWNER`.
- [x] `/projects/[projectId]/analytics` — assignee chart showed raw `User <uuid>`; now joins `users` for real names.
- [x] `/billing/invoices/new` — line-item grid (`grid-cols-12`) was unusable at 375px; now stacks to labeled cards on mobile, tabular at md+.
- [x] `/crm/organizations` & `/crm/contacts` — create flow existed but had no trigger button (users couldn't create the first record); added header "New …" buttons + empty-state CTAs wired to the existing create dialogs.
- [x] `/settings/branches`, `/settings/custom-fields`, `/settings/webhooks` — empty states now fill content height with a solid in-card primary CTA (match Automations).
