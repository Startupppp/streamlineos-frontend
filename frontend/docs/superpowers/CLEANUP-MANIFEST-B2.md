# Frontend Cutover-Cleanup Manifest — Batch 2

Status: ANALYSIS ONLY. Nothing in this manifest is executed until the corresponding
domain's NestJS backend has been functional-tested in staging. Each domain is cut over
independently; do not delete a domain's route files until its backend passes tests.

Batch 2 domains:
- FULLY migrated → quotes, customer-executive, reports.
- PARTIAL (have deferred routes — no blanket prefix) → notifications, calendar, settings.

The Batch-2 JSON also carries an umbrella "platform (logical group)" entry spanning
`platform/visit` + notifications + calendar + settings. It is a duplicate view of the three
PARTIAL sub-domains below plus the lone `platform/visit` route. To avoid double-listing, this
manifest treats notifications/calendar/settings as the source of truth and folds the umbrella's
unique facts (the `platform/visit` route, CE-out-of-scope) inline. `app/api/platform/visit/route.ts`
belongs to the backend `platform` module and is deletable with the notifications cutover wave
(it has a backend equivalent and no dead support file); it is listed under "platform/visit" below.

Repo root for all paths below: `D:/projects/personal/Streamlineos/frontend/`.

Precondition (from `FRONTEND-STRANGLE-MANIFEST.md`): do NOT delete until the NestJS backend is
deployed AND `NEXT_PUBLIC_API_URL` is set in the frontend env — otherwise `apiClient` falls back
to same-origin `/api` and these features 404.

---

## 1. Files to delete

Route files for FULLY-migrated domains, plus only truly-dead support files (verified zero
importers outside their own deletable domain routes). PARTIAL domains list only their
fully-ported route files (deleted individually — never `rm -rf` the folder).

### quotes (fully migrated)
- `app/api/quotes/route.ts`
- `app/api/quotes/[quoteId]/route.ts`
- `app/api/quotes/[quoteId]/send/route.ts`
- `app/api/quotes/export/route.ts`
- (No dead support files. Routes import only third-party libs + shared infra
  `@/lib/api/helpers`, `@/lib/cache`, `@/lib/db`, `@/lib/db/schema`, `@/lib/audit-log`.
  Quote table defs live in the shared `lib/db/schema/crm/billing.ts` — NOT deleted, see Keep-shared.)

### customer-executive (fully migrated)
- `app/api/customer-executive/health/route.ts`
- `app/api/customer-executive/health/config/route.ts`
- `app/api/customer-executive/health/recompute/route.ts`
- `app/api/customer-executive/nps/route.ts`
- `app/api/customer-executive/nps/[surveyId]/route.ts`
- `app/api/customer-executive/nps/stats/route.ts`
- `app/api/customer-executive/sla/route.ts`
- `app/api/crm/customer-executive/route.ts`
- `lib/services/cs-health.ts` — DEAD. Imported only by the 3 CE `health/**` routes above.
  Repo-wide grep of `cs-health` and every exported symbol (`getLatestHealthScores`,
  `computeHealthForOrg`, `getOrgHealthConfig`, `upsertOrgHealthConfig`, `HealthScoreResult`,
  `LatestHealthScore`, `HealthStatus`, `getDefaultHealthConfig`) found no importers outside
  `app/api/customer-executive/health/**` (only docs `.md` references, non-code). Safe to delete
  after the 3 health routes are removed. It imports csat/clientHealth SCHEMA tables — those
  schema files STAY (see Keep-shared); only this service file goes.

### reports (fully migrated)
- `app/api/reports/attendance/route.ts`
- `app/api/reports/payroll/route.ts`
- `app/api/reports/project/route.ts`
- `app/api/reports/team-performance/route.ts`
- `app/api/reports/source-effectiveness/route.ts`
- `server/queries/reports.ts` — DEAD. Exports `getAttendanceReport`/`getPayrollReport`/
  `getProjectReport`/`getTeamPerformanceReport` + the `*Filters` interfaces, imported ONLY by
  the 4 attendance/payroll/project/team-performance routes above. Flat standalone file, no
  barrel re-exports it (`server/queries` has no flat `index.ts`). The `source-effectiveness`
  route uses its own inline Drizzle query + inline `SourceEffectivenessRow` type (dies with the
  route). Safe to delete.

### notifications (PARTIAL — delete only the 5 ported routes)
- `app/api/notifications/route.ts` — GET list (ported).
- `app/api/notifications/unread-count/route.ts` — GET (ported).
- `app/api/notifications/read-all/route.ts` — PATCH (ported).
- `app/api/notifications/clear-all/route.ts` — DELETE (ported).
- `app/api/notifications/[notificationId]/read/route.ts` — PATCH (ported).
- `server/queries/notifications.ts` — DEAD (delete with the above). Exports `getNotifications` +
  `getUnreadCount`, imported ONLY by `notifications/route.ts` and `notifications/unread-count/route.ts`,
  both deleted here. No `server/queries/index.ts` barrel. (The grep hits
  `lib/email-templates/notifications.ts` and `lib/api/hooks/index.ts` are unrelated.)

> Note (notifications): `app/api/notifications/dispatch/route.ts` is DEFERRED (email + Twilio
> fan-out) — KEEP. Delete the five files individually; do NOT `rm -rf app/api/notifications/`.

### calendar (PARTIAL — delete only the 4 ported routes)
- `app/api/calendar/events/route.ts` — GET/POST (ported).
- `app/api/calendar/events/[eventId]/route.ts` — PUT/DELETE (ported).
- `app/api/calendar/events/[eventId]/rsvp/route.ts` — GET/POST (ported).
- `app/api/calendar/export/route.ts` — GET CSV (ported) — see CONSUMER CAVEAT below before deleting.
- `server/queries/calendar.ts` — DEAD (delete with the events routes). Exports
  `getCalendarEvents`, `getCalendarEvent`, `createCalendarEvent`, `updateCalendarEvent`,
  `deleteCalendarEvent`, `getOooConflicts`, `interface CalendarEventItem`. Imported via
  `@/server/queries/calendar` ONLY by `events/route.ts` and `events/[eventId]/route.ts`, both
  deleted here. No barrel re-exports it. Does NOT depend on `create-meet`, so it dies cleanly
  even though `create-meet` is kept.
  NAME-COLLISION GUARD: `lib/services/hr/calendar.ts` exports a DIFFERENT `createCalendarEvent`
  used by `app/api/hr/recruitment/interviews/route.ts`. That is a separate HR module — KEEP it;
  it must NOT block deleting `server/queries/calendar.ts`.

> Note (calendar): `app/api/calendar/create-meet/route.ts` is DEFERRED (Google OAuth + Calendar
> API) — KEEP. Delete the four files individually; do NOT `rm -rf app/api/calendar/`.

### settings (PARTIAL — delete only the 13 ported routes)
- `app/api/settings/ai-usage/route.ts`
- `app/api/settings/api-keys/route.ts`
- `app/api/settings/api-keys/[keyId]/route.ts`
- `app/api/settings/automations/route.ts`
- `app/api/settings/automations/[ruleId]/route.ts`
- `app/api/settings/automations/[ruleId]/runs/route.ts`
- `app/api/settings/custom-fields/route.ts`
- `app/api/settings/custom-fields/[fieldId]/route.ts`
- `app/api/settings/feature-flags/route.ts`
- `app/api/settings/integrations/git/route.ts`
- `app/api/settings/integrations/git/[connectionId]/route.ts`
- `app/api/settings/permissions/route.ts`
- `app/api/settings/users/[userId]/role/route.ts`

> Note (settings): TWO test endpoints are DEFERRED (integration side-effects) — KEEP:
> `app/api/settings/email-templates/test/route.ts` (calls `sendEmail`) and
> `app/api/settings/automations/[ruleId]/test/route.ts` (calls `runRule`).
> `lib/services/automation/validation.ts` is the ONLY would-be-dead support file but is BLOCKED
> from deletion: it is imported by the create/update automation routes (both deleted here) AND by
> the DEFERRED `automations/[ruleId]/test/route.ts` (`testAutomationSchema`). It must STAY until
> the automation-test endpoint is also ported. Delete the 13 files individually; do NOT
> `rm -rf app/api/settings/`.

### platform/visit (deletable with the notifications cutover wave)
- `app/api/platform/visit/route.ts` — has a backend equivalent in the NestJS `platform` module.
  No dead support file. Cutover-deletable once the platform module passes functional tests.

---

## 2. Barrel edits (edit, do not delete)

NONE in Batch 2.

Investigated and explicitly confirmed no surgical re-export removal is required:
- `server/queries` has NO flat `index.ts`. Both dead query files (`server/queries/notifications.ts`,
  `server/queries/reports.ts`, and `server/queries/calendar.ts`) are standalone — plain file
  deletions, not barrel edits.
- `lib/services` has NO `index.ts` barrel — `cs-health.ts`, `automation/engine.ts`,
  `automation/validation.ts` are imported by direct path. The dead `lib/services/cs-health.ts`
  is a file deletion.
- `server/queries/crm/index.ts` re-exports `support-queries.ts` wholesale. KEEP — the same module
  still exports the LIVE `getSupportDashboard` (consumed by the un-migrated
  `app/api/crm/support-dashboard/route.ts`) plus pipeline/sales/client queries used by many non-CE
  routes. Only `getCustomerExecutiveDashboard` (+ private `_getCustomerExecutiveDashboard`) become
  dead code inside that file — prune later as optional cleanup; the FILE and barrel line STAY.
- `lib/db/schema/index.ts` and `lib/db/schema/crm/index.ts` re-export the CRM/billing/automation/
  customer-success schema via `export * from "..."` (namespace re-exports, no domain-specific line).
  Tables (`quotes`, `quoteLineItems`, `npsSurveys`, `npsResponses`, `automationRules`,
  `gitConnections`, `customFieldDefinitions`, `aiUsageLogs`, etc.) back Drizzle types app-wide. KEEP.

---

## 3. api-client MIGRATED_PREFIXES additions

File: `lib/api-client.ts`. Current value (line 4):
```ts
const MIGRATED_PREFIXES = ["/contacts", "/targets", "/csat"] as const;
```
(Batch 1's prefixes are not yet applied to the file — both batches are analysis-only until
their backends pass tests.) Matching is prefix-based
(`path === p || path.startsWith(p + "/") || path.startsWith(p + "?")`), so a base prefix covers
every sub-path. Hook base paths were verified per domain.

Add ONLY the FULLY-migrated Batch-2 domains:
- `/quotes` — `lib/api/hooks/quotes.ts` hits `/quotes`, `/quotes/:id`, `/quotes/:id/send`,
  `/quotes/export`. All ported (NestJS `QuotesController`).
- `/customer-executive` — CE health/nps/sla hooks hit `/customer-executive/**`. All ported.
- `/reports` — `lib/api/hooks/reports.ts` and `lib/api/hooks/hr/recruitment/candidates.ts` hit
  `/reports/attendance|payroll|project|team-performance|source-effectiveness`. All ported.

> CE prefix caveat: `app/api/crm/customer-executive/route.ts` (the CE dashboard) lives under the
> `/crm/...` path, NOT `/customer-executive/...`, so the `/customer-executive` prefix does NOT
> repoint its hook. Verify the CE-dashboard hook's base path at cutover; if it calls
> `/crm/customer-executive`, do NOT blanket-add `/crm` (that umbrella prefix would capture the many
> un-migrated `/crm/**` routes). Repoint that single hook explicitly, or defer it.

Resulting array after Batch-2 cutover (assuming Batch-1 already applied):
```ts
const MIGRATED_PREFIXES = [
  "/contacts", "/targets", "/csat",
  "/blog", "/audit-log", "/goals", "/tasks",
  "/quotes", "/customer-executive", "/reports",
] as const;
```

DO NOT add prefixes for the PARTIAL domains — a blanket prefix would route their DEFERRED routes
to a backend that lacks them and break those flows:
- NOT `/notifications` — would break the deferred `/notifications/dispatch` (email + Twilio).
- NOT `/calendar` — would break the deferred `/calendar/create-meet` (Google Meet).
- NOT `/settings` — would break the deferred `/settings/email-templates/test` and
  `/settings/automations/:ruleId/test`.

These domains' hooks (`lib/api/hooks/calendar.ts` `useGoogleMeetStatus`/`useCreateMeetLink`, the
notifications + settings hooks) stay pointed at same-origin `/api` until each domain is fully
ported in a later batch. Repoint only individual ported-endpoint hooks if/when per-endpoint
routing is supported.

---

## 4. Keep-shared (domain-looking but still imported elsewhere)

These must NOT be deleted. They look domain-specific but have live importers outside the
deletable route graph.

### quotes
- `lib/api/helpers.ts`, `lib/cache.ts`, `lib/audit-log.ts`, `lib/db.ts` (`@/lib/db`),
  `lib/db/schema` barrel — shared infra, hundreds of importers. KEEP.
- `lib/db/schema/crm/billing.ts` — defines `quotes`/`quoteLineItems` ALONGSIDE invoices, payments,
  purchaseBills, vendorPayments, supportTickets, etc. NOT quotes-specific. KEEP (no trim).
- `lib/api/hooks/quotes.ts` — CLIENT consumer (still used by `app/(dashboard)/crm/quotes/page.tsx`
  and `[quoteId]/page.tsx`); repointed via `/quotes` prefix. `lib/query-keys.ts`, `lib/api-client.ts` — shared. KEEP.

### customer-executive
- `lib/services/nps.ts` — exports `categoryForScore`/`npsScore`/`npsBreakdown`/`NpsBreakdown`/
  `NpsCategory`. The CE nps routes use it, BUT the PUBLIC `app/api/public/nps/[token]/route.ts`
  (survey submission, NOT under CE) imports `categoryForScore`. Deleting it breaks that public
  route's build. KEEP.
- `server/queries/crm/support-queries.ts` + `server/queries/crm/index.ts` — the CE dashboard route
  imports `getCustomerExecutiveDashboard` from here, but the module also exports the LIVE
  `getSupportDashboard` (used by `app/api/crm/support-dashboard/route.ts`) and the barrel re-exports
  pipeline/sales/client queries used across `app/api/crm`, `app/api/clients`, `app/api/deals`. KEEP both.
- `lib/api/helpers.ts`, `lib/cache.ts`, `lib/db` (`@/lib/db`), `lib/db/schema` barrel,
  `lib/db/schema/crm` barrel, `lib/db/schema/crm/customer-success.ts`
  (HealthScore weights/thresholds/breakdown types — imported by the dead `cs-health.ts` but is a
  schema file, used app-wide). KEEP. `npsSurveys`/`npsResponses` schema tables also back the public
  nps route; `supportTickets` (used by the CE sla route) is used by ~34 other files. KEEP.

### reports
- `lib/api/helpers.ts`, `lib/abilities-server.ts` (`getSessionAbility`, 122 importers),
  `lib/cache.ts`, `lib/db` + `lib/db/schema` (684 importers), `lib/date-utils.ts`
  (`formatDateOnly`, 33 importers — `server/queries/reports.ts` uses it but is going away). KEEP.
- `lib/api/hooks/reports.ts` — CLIENT hooks (`useAttendanceReport`/`usePayrollReport`/
  `useProjectReport`/`useTeamPerformanceReport`); calls `apiClient.get('/reports/...')`, imports
  types from `@/types/reports` — does NOT touch the server query layer. Repointed via `/reports`. KEEP.
- `lib/api/hooks/hr/recruitment/candidates.ts` — CLIENT hook; calls
  `apiClient.get<SourceEffectivenessRow[]>('/reports/source-effectiveness')` and declares its OWN
  independent `SourceEffectivenessRow` interface (unrelated to the route's inline copy). KEEP.
- `types/reports.ts` — client-safe response types consumed by the kept hook. KEEP.

### notifications (partial)
- `app/api/notifications/dispatch/route.ts` — DEFERRED (email/sms/whatsapp fan-out). KEEP.
- `lib/email.ts` — barrel re-exporting `lib/email/*`; ~60+ importers app-wide AND the deferred
  dispatch route. KEEP.
- `lib/twilio.ts` — `sendWhatsApp`/`sendSms`/`sendWhatsAppWithSmsFallback`; used by the deferred
  dispatch route AND by `app/api/hr/recruitment/interviews/schedule/route.ts`. KEEP.
- `lib/api/helpers.ts`, `lib/cache.ts`, `lib/db.ts` (`@/lib/db`), `lib/db/schema` barrel — core infra. KEEP.

### calendar (partial)
- `app/api/calendar/create-meet/route.ts` — DEFERRED (Google OAuth + Calendar API); consumed by
  `lib/api/hooks/calendar.ts` `useGoogleMeetStatus`/`useCreateMeetLink`. KEEP.
- `lib/services/hr/calendar.ts` — DIFFERENT HR-recruitment module (dynamic-imported by
  `app/api/hr/recruitment/interviews/route.ts`); name-collides with the dead query but unrelated. KEEP.
- `lib/rate-limit.ts` — contains the string-prefix config `{ prefix: "/api/calendar/create-meet",
  tier: "auth-write" }` (~line 244). NOT an import; KEEP (no edit) because create-meet is deferred.
- `lib/api/helpers.ts`, `lib/cache.ts`, `lib/app-url.ts` (~11 importers), `lib/db` + `lib/db/schema`
  (`calendarEvents`, `eventAttendees`, `users`, `leaveRequests`, `interviews`, `tasks`, `holidays`). KEEP.

### settings (partial)
- `app/api/settings/email-templates/test/route.ts`, `app/api/settings/automations/[ruleId]/test/route.ts`
  — DEFERRED test endpoints. KEEP.
- `lib/services/automation/validation.ts` — would-be-dead BUT pinned alive by the deferred
  `automations/[ruleId]/test/route.ts` (`testAutomationSchema`). Delete ONLY after the automation
  test endpoint is ported. (`engine.ts` does NOT import it, so keeping engine.ts does not pin it.) KEEP.
- `lib/services/automation/engine.ts` — `runAutomationsForEvent` dynamically imported by 25+ files
  (leads, deals, hr leaves/exit/expenses/recruitment/onboarding/performance/reimbursements/
  termination, 5 inngest functions); `runRule` used by the deferred test route. KEEP.
- `lib/org-features.ts` (also `app/api/chat/route.ts`), `lib/app-url.ts`, `lib/abilities-server.ts`,
  `lib/constants/roles.ts`, `lib/rbac/permissions.ts`, `lib/email.ts`, `lib/email-templates/*`
  (auth/hr/expense/appraisal/crm/project/organization), `lib/api/helpers.ts`, `lib/db` + `lib/db/schema`
  barrel — all SHARED app-wide. KEEP.

### platform/visit
- No domain-specific support file; the route imports only shared infra (`lib/api/helpers`, `lib/db`). KEEP infra.

---

## 5. Cutover caveats & consumer wiring (NOT deletion blockers, coordinate at cutover)

- CALENDAR EXPORT hardcoded same-origin consumers: `app/api/calendar/export/route.ts` is opened via
  `window.open("/api/calendar/export?...")` in `features/calendar/calendar-view.tsx` (line 238) and
  `features/calendar/event-detail-sheet.tsx` (line 89). These BYPASS `apiClient` (so the
  `MIGRATED_PREFIXES` mechanism never repoints them). Deleting `export/route.ts` at cutover WILL
  break CSV export in both components unless those `window.open` URLs are first repointed to the
  backend export endpoint. The route file stays classified deletable; this dependency is flagged.
- CLIENT LAYER (all PARTIAL/FULL domains): the `lib/api/hooks/**` TanStack hooks are consumers
  (HTTP via `apiClient`), not server-side importers. They are repointed (prefix add) or left
  same-origin (partial domains) at cutover — they are never deleted as part of route-file cleanup.

---

## 6. Out of scope (explicitly confirmed clean of Batch-2 coupling)

- The PARTIAL-domain deferred routes (notifications/dispatch, calendar/create-meet, the two
  settings test endpoints) belong to those domains only and do NOT affect quotes/CE/reports cutover.
- No Batch-2 route touches the other domains' deferred integrations; grep confirmed.
- No scripts/cron import the dead support files (`cs-health.ts`, `server/queries/reports.ts`,
  `server/queries/notifications.ts`, `server/queries/calendar.ts`) or the CE dashboard query.
  The CE "daily recompute" is referenced only in design docs; the `health/recompute` route is the
  manual trigger and is deletable.

---

## 7. Execution checklist (per domain, in order)

For each FULLY-migrated domain (quotes, customer-executive, reports):
1. Confirm the domain's NestJS backend passed functional tests in staging.
2. Add the domain's prefix to `MIGRATED_PREFIXES` in `lib/api-client.ts`
   (for CE, verify/repoint the `/crm/customer-executive` dashboard hook separately — see §3 caveat).
3. Smoke-test the UI pages/hooks against the backend (with `NEXT_PUBLIC_API_URL` set).
4. Delete the domain's route files + listed dead support file(s).
5. Run `pnpm build` + `pnpm lint`; fix any newly-orphaned import.

For each PARTIAL domain (notifications, calendar, settings):
1. Do NOT add a blanket prefix to `MIGRATED_PREFIXES`.
2. After the ported backends pass tests, delete ONLY the listed ported route files (+ the dead
   `server/queries/notifications.ts` / `server/queries/calendar.ts`), individually.
3. Leave the deferred routes (`dispatch`, `create-meet`, the two settings `test` endpoints) and
   `lib/services/automation/validation.ts` in place until those endpoints are ported.
4. For calendar: BEFORE deleting `export/route.ts`, repoint the two `window.open` consumers
   (calendar-view.tsx, event-detail-sheet.tsx) to the backend export URL (see §5).
5. Repoint only individual ported-endpoint hooks if/when per-endpoint routing is supported;
   otherwise leave the partial-domain hooks same-origin until the domain is fully ported.

`app/api/platform/visit/route.ts` ships with the notifications cutover wave (backend `platform`
module) — delete it once that module passes tests; no support-file cleanup needed.

---

## Batch-2 redo: sales + push

Two additional FULLY-migrated domains analyzed for cutover. Same precondition as the rest of this
manifest: do NOT delete until each domain's NestJS backend passes functional tests in staging AND
`NEXT_PUBLIC_API_URL` is set. Repo root for all paths: `D:/projects/personal/Streamlineos/frontend/`.

### Files to delete

**sales (fully migrated)** — 16 route files, NO dead support files (every imported support file is
shared with a live consumer outside the sales routes, so `deadSupportFiles` is empty):
- `app/api/sales/commission-rules/route.ts`
- `app/api/sales/commissions/route.ts`
- `app/api/sales/commissions/[commissionId]/route.ts`
- `app/api/sales/quotas/route.ts`
- `app/api/sales/playbook/route.ts`
- `app/api/sales/playbook/[entryId]/route.ts`
- `app/api/sales/dashboard/kpis/route.ts`
- `app/api/sales/dashboard/funnel/route.ts`
- `app/api/sales/dashboard/leaderboard/route.ts`
- `app/api/sales/dashboard/revenue-vs-goal/route.ts`
- `app/api/sales/dashboard/velocity/route.ts`
- `app/api/sales/dashboard/aging/route.ts`
- `app/api/sales/dashboard/cycle-length/route.ts`
- `app/api/sales/dashboard/lost-analysis/route.ts`
- `app/api/sales/dashboard/cohort/route.ts`
- `app/api/sales/dashboard/rep-comparison/route.ts`

**push (fully migrated)** — 2 route files, NO dead support files:
- `app/api/push/subscribe/route.ts`
- `app/api/push/vapid-public-key/route.ts`

### api-client MIGRATED_PREFIXES additions

Both domains are FULLY migrated and consumed exclusively through `apiClient` hooks (no per-endpoint
deferrals), so add both base prefixes to `MIGRATED_PREFIXES` in `lib/api-client.ts`:
- `/sales` — repoints all 16 routes. Consumed via `lib/api/hooks/crm/analytics.ts` (10 dashboard GETs:
  kpis/funnel/leaderboard/revenue-vs-goal/velocity/aging/cycle-length/lost-analysis/cohort/rep-comparison),
  `lib/api/hooks/crm/deals.ts` (quotas, commissions, `/sales/commissions/{id}`, commission-rules), and
  `lib/api/hooks/sales-playbook.ts` (playbook CRUD). All use the `/sales/...` path prefix — no hook edits needed.
- `/push` — repoints both routes. Sole consumer is `hooks/use-push-subscription.ts`
  (`apiClient.get("/push/vapid-public-key")` + `apiClient.post("/push/subscribe")`), both via apiClient.

### Keep-shared (domain-looking but still imported elsewhere)

**sales** — routes import only shared infra + two shared support files; all KEEP:
- `server/queries/sales-dashboard.ts` — used by the 6 dashboard routes for KPIs/funnel/leaderboard/
  revenue-vs-goal/velocity/aging, BUT also imported OUTSIDE sales by `app/api/deals/[dealId]/route.ts`
  (`import { invalidateSalesKpiCache }`). After the dashboard routes are deleted the getter functions
  become dead FUNCTIONS, but the FILE must stay (live `invalidateSalesKpiCache` consumer). KEEP.
- `server/actions/create-notification.ts` — used by `commissions/[commissionId]/route.ts` and ~14 other domains. KEEP.
- `lib/api/helpers.ts`, `lib/cache.ts`, `lib/abilities-server.ts`, `lib/db.ts`, `lib/db/schema/index.ts`,
  `lib/constants/roles.ts` — app-wide infra. The schema barrel holds `commissionRules`/`commissions`/
  `salesQuotas`/`playbookEntries` tables also read by `lib/inngest/functions/daily-sales-digest.ts`. KEEP.
- Kept client/type files: `lib/api/hooks/crm/analytics.ts`, `lib/api/hooks/crm/deals.ts`,
  `lib/api/hooks/sales-playbook.ts` (and its inline `PlaybookEntry` types) — repointed via the `/sales` prefix. KEEP.

**push** — routes import only shared infra; all KEEP:
- `lib/api/helpers.ts`, `lib/db.ts`, `lib/db/schema/shared.ts`, `lib/db/schema/index.ts` — infra; the
  `pushSubscriptions` table (defined in `shared.ts`, re-exported by the barrel) has an outside importer. KEEP.
- `lib/web-push.ts` — NOT imported by the push routes; it is the push-SEND service, imported by
  `app/api/chat/channels/[channelId]/messages/route.ts` (`sendPushToChannelMembers`) and
  `lib/inngest/functions/notification-handler.ts` (`sendPushToUser`). Reads/cleans the same
  `push_subscriptions` table. KEEP — do not delete on push cutover.
- `hooks/use-push-subscription.ts` — the CLIENT consumer (not deletable); repointed via `/push`. Keep its
  mount in `components/layout/dashboard-shell.tsx`. KEEP.

### Bare-URL / cutover caveats (NOT deletion blockers)

- **sales — NO bare-URL bypasses.** Repo-wide grep for the literal `/api/sales` returns ZERO matches; no
  bare `fetch()`/`window.open()`/`<a href>` to `/api/sales/...`. All 16 routes go through `apiClient`, so
  the `/sales` prefix cleanly repoints every call with Bearer auth.
- **sales — apiClient path-boundary caution (do NOT repoint these).** There exist Next.js PAGE-navigation
  links `<Link href="/sales/person/...">`, `<Link href="/sales">`, and `<a href="/sales/person/...">` in
  `app/(dashboard)/customer-executive/page.tsx`, `features/sales/sales-leaderboard.tsx`,
  `components/charts/activity-feed.tsx`, and `app/(dashboard)/sales/person/[personSlug]/page.tsx`. These are
  dashboard-UI page links, NOT apiClient API calls — they are unaffected by `MIGRATED_PREFIXES` and must NOT be repointed.
- **sales — cross-domain dead functions.** After the dashboard routes are deleted, the getter functions in
  `server/queries/sales-dashboard.ts` are dead code, but `invalidateSalesKpiCache` keeps the file alive
  (live import from `app/api/deals/[dealId]/route.ts`). Prune the dead getters later as optional cleanup; the file STAYS.
- **push — NO bare-URL bypasses.** Grep for `/api/push` across all `.ts/.tsx/.js` returns ZERO matches; the
  only consumer is `hooks/use-push-subscription.ts` via apiClient. No fetch/window.open/`<a href>` to repoint.
- **push — shared-DB consistency at cutover.** After deleting the two frontend push routes, the frontend
  still READS `push_subscriptions` via `lib/web-push.ts` while the NestJS backend owns subscribe/unsubscribe
  WRITES. This stays consistent ONLY if frontend and backend share the same Postgres (`push_subscriptions`).
  Do NOT delete `lib/web-push.ts` or the schema. The route's DELETE/unsubscribe handler has NO frontend
  caller today (the hook never unsubscribes), so it drops safely with the route.
- **push — VAPID parity.** `vapid-public-key` simply echoes `process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY`;
  ensure the backend `/push/vapid-public-key` returns the SAME VAPID public key so subscription keeps working
  post-cutover. `public/sw.js` only handles browser `push`/`notificationclick` events (no `/api/push` fetch) — leave as-is.
