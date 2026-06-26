# Frontend Cutover-Cleanup Manifest — Batch 1

Status: ANALYSIS ONLY. Nothing in this manifest is executed until the corresponding
domain's NestJS backend has been functional-tested in staging. Each domain is cut over
independently; do not delete a domain's route files until its backend passes tests.

Batch 1 domains: blog, audit-log, goals (fully migrated) · expenses (partial) · tasks (fully migrated).

Repo root for all paths below: `D:/projects/personal/Streamlineos/frontend/`.

---

## 1. Files to delete

Route files for FULLY-migrated domains plus the two truly-dead support files
(verified: zero importers outside their own deletable domain routes).

### blog (fully migrated)
- `app/api/blog/feed/route.ts`
- `app/api/blog/posts/route.ts`
- `app/api/blog/posts/[entityId]/route.ts`
- `app/api/blog/categories/route.ts`
- `app/api/blog/categories/[entityId]/route.ts`
- `lib/blog/post-write.ts` — DEAD. Grep confirms importers are only the two blog posts
  routes above (`app/api/blog/posts/route.ts`, `app/api/blog/posts/[entityId]/route.ts`),
  both deleted here. Safe to delete on cutover.

### audit-log (fully migrated)
- `app/api/audit-log/route.ts`
- `app/api/audit-log/actions/route.ts`
- `app/api/audit-log/target-types/route.ts`
- (No dead support files. The audit WRITE utilities `lib/audit-log.ts` and `lib/db/audit.ts`
  are heavily shared and are NOT part of this domain's deletable graph — see Keep-shared.)

### goals (fully migrated)
- `app/api/goals/route.ts`
- `app/api/goals/stats/route.ts`
- `app/api/goals/[goalId]/route.ts`
- `app/api/goals/[goalId]/check-in/route.ts`
- `app/api/goals/[goalId]/key-results/route.ts`
- `app/api/goals/[goalId]/links/route.ts`
- `app/api/goals/key-results/[keyResultId]/route.ts`
- `lib/services/goals.ts` — DEAD. Grep confirms `recomputeGoalProgress` is imported only by
  3 goals routes (`[goalId]/check-in`, `[goalId]/key-results`, `key-results/[keyResultId]`),
  all deleted here. No `lib/services/index` barrel exists, so no barrel edit needed. Safe to delete.

### tasks (fully migrated)
- `app/api/tasks/route.ts`
- `app/api/tasks/[taskId]/route.ts`
- `app/api/tasks/[taskId]/complete/route.ts`
- `app/api/tasks/analytics/route.ts`
- `app/api/tasks/my-queue/route.ts`
- `app/api/tasks/overdue/route.ts`
- `app/api/tasks/sequences/route.ts`
- `app/api/tasks/sequences/[sequenceId]/route.ts`
- `app/api/tasks/sequences/[sequenceId]/apply/route.ts`
- (No dead support files: all logic was inline in the route handlers; no tasks-specific
  `server/queries/*`, `lib/services/*`, `types/**`, or `scripts/*` exist.)

### expenses (PARTIAL — only the 4 fully-ported GET routes are deletable)
- `app/api/hr/expenses/categories/route.ts` — GET+POST both ported.
- `app/api/hr/expenses/export/route.ts` — GET ported.
- `app/api/hr/expenses/page-data/route.ts` — GET ported.
- `app/api/hr/expenses/report/route.ts` — GET ported.

> Note (expenses): these 4 share a folder with deferred routes. Delete the four files
> individually; do NOT `rm -rf app/api/hr/expenses/`.

---

## 2. Barrel edits (edit, do not delete)

NONE in Batch 1.

Investigated and explicitly confirmed no surgical re-export removal is required:
- `lib/db/schema/index.ts` — keep `export * from "./blog"` (line 12). Still depended on by
  the live public blog pages, `server/queries/blog.ts`, and DB infra. Likewise the CRM barrel
  that re-exports task tables (`lib/db/schema/crm/deals.ts`) and the goals schema
  (`lib/db/schema/projects/goals.ts`) stay — they back Drizzle types app-wide.
- `server/queries/hr.ts` → `server/queries/hr/index.ts` — `getExpenses` lives in
  `payroll.ts` and is re-exported wholesale (`export * from "./hr/index"`); 30+ HR routes
  depend on the barrel. No expenses-specific line to remove.
- `lib/services/goals.ts` is deleted outright (no `lib/services/index` barrel exists), so it
  is a file deletion, not a barrel edit.
- `lib/email/index.ts` (line 57) and `lib/email.ts` (line 46) re-export
  `sendTaskAssignedEmail`. This export becomes unused after the tasks routes are deleted, but
  removal is OPTIONAL, non-load-bearing cleanup and is explicitly OUT OF SCOPE for cutover-safe
  deletion — `@/lib/email` is imported by 64 files; leave the barrels untouched.

---

## 3. api-client MIGRATED_PREFIXES additions

File: `lib/api-client.ts`. Current value (line 4):
```ts
const MIGRATED_PREFIXES = ["/contacts", "/targets", "/csat"] as const;
```
Matching is prefix-based (`path === p || path.startsWith(p + "/") || path.startsWith(p + "?")`),
so the base prefix covers every sub-path. Hook base paths were verified for each domain.

Add ONLY the fully-migrated domains (so their TanStack hooks route to the NestJS backend):
- `/blog` — `lib/api/hooks/blog.ts` hits `/blog/feed`, `/blog/posts`, `/blog/posts/:id`,
  `/blog/categories`, `/blog/categories/:id`. All ported.
- `/audit-log` — `lib/api/hooks/audit-log.ts` hits `/audit-log`, `/audit-log/actions`,
  `/audit-log/target-types`. All ported.
- `/goals` — `lib/api/hooks/goals.ts` hits `/goals`, `/goals/:id`, `/goals/stats`, etc. All ported.
- `/tasks` — `lib/api/hooks/tasks.ts` hits `/tasks`, `/tasks/my-queue`, `/tasks/overdue`,
  `/tasks/sequences`, etc. All ported.

Resulting array after Batch-1 cutover:
```ts
const MIGRATED_PREFIXES = ["/contacts", "/targets", "/csat", "/blog", "/audit-log", "/goals", "/tasks"] as const;
```

DO NOT add `/hr/expenses` (or `/expenses`). The expenses domain is PARTIAL: a blanket prefix
would route the still-unported flows — POST create (`/hr/expenses`), PATCH update
(`/hr/expenses/:expenseId`), import (`/expenses/import`), email-report
(`/hr/expenses/email-report`), and the monthly cron — to a backend that does not implement
them, breaking those flows. The expenses hooks (`lib/api/hooks/hr/expenses.ts`,
`lib/api/hooks/use-import-expenses.ts`) stay pointed at same-origin `/api` until expenses is
fully ported in a later batch.

---

## 4. Keep-shared (domain-looking but still imported elsewhere)

These must NOT be deleted. They look domain-specific but have live importers outside the
deletable route graph.

### blog
- `server/queries/blog.ts` — used directly server-side by 6 public/admin blog pages
  (`app/(public)/blogs/(site)/page.tsx`, `[slug]/page.tsx`, `category/[slug]/page.tsx`,
  `tag/[tag]/page.tsx`, `admin/new/page.tsx`, `admin/[id]/edit/page.tsx`). Deleting it breaks
  the live public blog. KEEP.
- `lib/blog-db.ts` — blog Drizzle client; kept alive by `server/queries/blog.ts` + seed/migrate
  scripts. KEEP.
- `lib/blog-utils.ts` — used by blog pages, `components/blog/*`, and `scripts/seed-blog-data.ts`. KEEP.
- `lib/db/schema/blog.ts` — core schema re-exported via the shared barrel. KEEP.
- `scripts/seed-blog.ts`, `scripts/migrate-blog.ts`, `scripts/seed-blog-data.ts` — operational tooling. KEEP.
- `features/blog/data/posts.ts` — static marketing data used by `app/sitemap.ts`; unrelated to the API. KEEP.

### audit-log
- `lib/api/helpers.ts` — shared API kernel (`withAbility`/`withAuth`/`ok`/`err`/`toNumber`), ~hundreds of importers. KEEP.
- `lib/db.ts` (`@/lib/db`) — global Drizzle client. KEEP.
- `lib/db/schema/**` (`@/lib/db/schema` barrel; `auditLogs`, `users`) — global schema. KEEP.
- `lib/audit-log.ts` — audit WRITER (`createAuditLog` + `AuditAction`); 37 importers. NOT used by the read routes. KEEP.
- `lib/db/audit.ts` — second audit WRITER (`writeAuditLog`); 13 importers. KEEP.
- `lib/api/hooks/audit-log.ts` — CLIENT consumer of the now-backend endpoints; repointed via `/audit-log` prefix. KEEP.
- `app/(dashboard)/settings/audit-log/{page,loading,error}.tsx` — the UI page. KEEP.

### goals
- `lib/api/helpers.ts`, `lib/db/index.ts` (`@/lib/db`), `lib/db/schema` barrel — shared infra. KEEP.
- `lib/api/hooks/goals.ts` — client hooks (API consumer, repointed via `/goals` prefix). KEEP.
- `lib/db/schema/projects/goals.ts` — Drizzle schema for okr tables (re-exported by the barrel). KEEP.
- `features/projects/goals/**`, `app/(dashboard)/goals/**`, `features/hr/performance/goals-tab.tsx` — UI consumers. KEEP.

### tasks
- `lib/db/schema/crm/deals.ts` — defines `tasks`/`taskSequences`/`taskSequenceSteps` alongside deals; consumed app-wide via the barrel. KEEP.
- `lib/db/schema/index.ts` — re-exports CRM schema incl. task tables. KEEP (no edit).
- `lib/email/notifications.ts` (`sendTaskAssignedEmail` + many other fns) and its barrels
  `lib/email/index.ts`, `lib/email.ts` — shared email infra, 64 importers. KEEP.
- `lib/api/helpers.ts`, `lib/db.ts` (`@/lib/db`) — shared. KEEP.
- `lib/api/hooks/tasks.ts` — client hooks (API consumer, repointed via `/tasks` prefix). KEEP.

### expenses (partial — extensive keep list)
- `app/api/hr/expenses/route.ts` — GET ported, but POST create NOT in backend. KEEP (deferred).
  On full cutover, trim to POST-only.
- `app/api/hr/expenses/[expenseId]/route.ts` — DELETE ported, but PATCH NOT in backend. KEEP (deferred).
  On full cutover, trim to PATCH-only.
- `app/api/hr/expenses/email-report/route.ts` — no backend equiv. KEEP (deferred).
- `app/api/expenses/import/route.ts` — no backend equiv (self-contained ExcelJS/CSV import). KEEP (deferred).
- `app/api/cron/monthly-expense-report/route.ts` — cron, no backend equiv. KEEP (deferred).
- `server/queries/hr/payroll.ts` (`getExpenses`) — used by 30+ HR routes via the barrel. KEEP.
- `server/queries/hr.ts` + `server/queries/hr/index.ts` — shared HR query barrel. KEEP (no edit).
- `server/actions/expense-export.ts` (+ folder `index.ts`/`query.ts`/`csv-export.ts`/`data-generators.ts`/`types.ts`) —
  used by the deferred email-report route and by `components/expenses/expense-export/*`. KEEP.
- `server/actions/monthly-expense-report.ts` — used by the deferred cron route and `lib/inngest/functions/monthly-expense-report.ts`. KEEP.
- `server/actions/expense-query.ts` (+ folder) — type-only consumers in the expenses page/features/`hooks/use-expense-filters.ts`. KEEP.
- `lib/api/hooks/hr/expenses.ts` — client hooks; several hit deferred endpoints. KEEP, stay same-origin.
- `lib/api/hooks/use-import-expenses.ts` — calls the deferred import route. KEEP.
- `lib/api/hooks/hr/leaves-expenses.ts` — re-exported from the hr hooks barrel; not the CRUD hook. KEEP.
- `lib/email/hr-expense.ts`, `lib/monthly-expense-report-xlsx.ts`, `lib/email-templates/expense.ts` — email infra. KEEP.
- `features/hr/expenses/*`, `hooks/use-expense-filters.ts`, `features/hr/expenses/expense-constants.ts` — frontend UI. KEEP.

---

## 5. Execution checklist (per domain, in order)

For each FULLY-migrated domain (blog, audit-log, goals, tasks):
1. Confirm the domain's NestJS backend passed functional tests in staging.
2. Add the domain's prefix to `MIGRATED_PREFIXES` in `lib/api-client.ts`.
3. Smoke-test the UI pages/hooks against the backend (with `NEXT_PUBLIC_API_URL` set).
4. Delete the domain's route files + listed dead support file(s).
5. Run `pnpm build` + `pnpm lint`; fix any newly-orphaned import.

For expenses (PARTIAL):
1. Do NOT add `/hr/expenses` to `MIGRATED_PREFIXES`.
2. After the 4 GET backends pass tests, delete only the 4 listed GET route files.
3. Leave the 5 deferred routes and all listed support files in place.
4. Repoint only the corresponding read hooks if/when per-endpoint routing is supported;
   otherwise leave expenses hooks same-origin until the domain is fully ported in a later batch.

### Behavioral gap flagged for the backend team (not a deletion concern)
The frontend POST `/tasks` and PATCH `/tasks/:taskId` fire `sendTaskAssignedEmail` on assignee
change; the NestJS `TasksService` does not send any assignment email. Confirm this is
intentionally deferred/handled elsewhere before cutting tasks over, or assignment notifications
will silently stop.
