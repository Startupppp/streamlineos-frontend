# Non-HR Feature Build — Design & Execution Spec (2026-06-14)

Autonomous overnight build. Goal: add genuinely-missing, self-contained, high-leverage **non-HR** features end-to-end (schema → migration → service → API → TanStack hooks → UI → build-verified). HR is owned by another engineer and is OUT of scope.

## Ground truth (from full codebase map, not the research doc)
The research doc is partly outdated. Verified in code:
- **Finance/Accounting is already deep**: double-entry GL, COA (43-acct seed), journals, trial balance, P&L, balance sheet, GSTR-1/3B, aged AR/AP, GST-compliant invoicing (HSN/SAC, CGST/SGST/IGST, RCM), recurring-invoice flags. → Only thin add-ons remain (Tier B).
- **Marketing was deliberately REMOVED** end-to-end (PAGES.md). → Do NOT rebuild it.
- CRM, Projects, Sales, Customer-Executive (CS), Support are broad but have real gaps.

## Conventions (must follow exactly — reference files)
- Route handler: `app/api/projects/[projectId]/milestones/route.ts` — Next 16 `params: Promise<…>` (await it), `withAuth`/`withAbility`, `ok`/`err`, `parseBody`/`parseQuery` (zod), `db` from `@/lib/db`, multitenant `eq(table.orgId, session.orgId)`.
- Auth: new top-level features use `withAbility(verb, subject)` (RBAC only, owner/platform-admin bypass via manage-all). Public routes use NO auth, scope strictly to org from URL + only published/public rows.
- Hook: `lib/api/hooks/projects/milestones.ts` — `"use client"`, `apiClient` (axios) from `@/lib/api-client`, `useQuery`/`useMutation`, invalidate on success. Query keys may be inline or from `@/lib/query-keys`.
- Schema: `lib/db/schema/projects/*` — `pgTable`, `serial` id, `orgId text references(organizations.id,{onDelete:'cascade'}).notNull()`, `createdAt defaultNow().notNull()`, `updatedAt defaultNow().$onUpdate(()=>new Date())`, `pgEnum` (declare feature enums in the feature file to avoid central conflicts), `index()` on hot cols, co-locate `relations()` in the feature file. Wire `export * from "./<file>"` in the domain `index.ts`.
- Page: `app/(dashboard)/projects/[projectId]/milestones/page.tsx` — `"use client"`, `PageWrapper`, small form → `Dialog`, large/multi-section → `Sheet`, delete → `AlertDialog`, `LoadingState`/`EmptyState`/`ErrorState` (`components/shared|ui`), `sonner` toasts, `date-fns`, `lucide-react`, `recharts` for charts. No comments, no `any`, no casts, named handlers.
- Migrations: `pnpm db:generate` then `pnpm db:push` (Neon, DATABASE_URL present). Additive only.
- RBAC catalog: `lib/rbac/permissions/*` + `AbilitySubject` union in `lib/api/helpers.ts` + nav `components/layout/sidebar/sidebar-nav-items.ts` + `middleware.ts` (`PROTECTED_ROUTES` + `ROUTE_PERMISSION_MAP`).

## Features (waves)
**Wave 1 — Projects/Product**
- F1 Agile Reporting: velocity, burnup, cumulative-flow (CFD), sprint report. Routes `/api/projects/[projectId]/reports/{velocity,burnup,cfd,snapshot}`. New table `project_daily_snapshots` (CFD history) + on-the-fly velocity/burnup from existing tickets/sprints/points. Page `/projects/[projectId]/reports`. Subject reuse `projects` (`withAbility('view','projects')` for project-scoped → actually use `withAuth` + project-scope like milestones).
- F2 Goals/OKRs: tables `goals`, `goal_key_results`, `goal_updates`, `goal_links`. Routes `/api/goals*`. Page `/goals`. Subject `projects:goals`. Nav under "Projects & Time". Middleware: add `/goals`.

**Wave 2 — Support + Product**
- F3 Knowledge Base: tables `kb_categories`, `kb_articles`, `kb_article_feedback`. Agent manage + internal browse + search; public help-center `/help/[orgId]`. Routes `/api/support/kb/*` (auth) + `/api/public/kb` (no auth). Subject `support:kb`. Nav under "Support".
- F4 Public Roadmap + Feedback + Changelog: tables `roadmap_items`, `roadmap_votes`, `feedback_posts`, `feedback_votes`, `changelog_entries`. Manage `/projects/roadmap`; public `/roadmap/[orgId]`. Routes `/api/projects/roadmap|feedback|changelog/*` + `/api/public/roadmap`. Subject `projects:roadmap`. Nav under "Projects & Time".

**Wave 3 — CS + Platform**
- F5 CS Health Score Engine: tables `health_score_config`, `client_health_scores`. Service `lib/services/cs-health.ts` aggregating SLA compliance, ticket trend, CSAT, activity recency, renewal proximity. Routes `/api/customer-executive/health/{config,recompute,(list)}`. Page `/customer-executive/health`. Subject reuse `crm:clients`. Inngest daily recompute (best-effort; manual recompute button always works).
- F6 No-code Automation Builder (v1): tables `automation_rules`, `automation_runs`. Engine `lib/services/automation/engine.ts` → `runAutomationsForEvent(orgId,event,payload)`; triggers (lead.created, deal.stage_changed, ticket.created, invoice.overdue), conditions (field/op/value), actions (in-app notification, email, create task, dispatch webhook). Wire at existing event sites (lead create, deal stage). Routes `/api/settings/automations/*` incl `/test`. Page `/settings/automations`. Subject `settings:automations`. Nav under "System".

**Tier B (if green + time):** NPS closed-loop (CS), support canned-responses/macros + routing rules, finance cash-flow statement + recurring-invoice scheduler, deal prediction display.

## Integration discipline
Each wave: (1) I wire registries; (2) parallel coder agents write ONLY new feature files; (3) I add schema index exports; (4) `db:generate` + `db:push`; (5) `pnpm build` + `pnpm lint`, fix to green; (6) commit; (7) update PAGES.md. Earlier waves stay shipped-green if a later wave stalls.
