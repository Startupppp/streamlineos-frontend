# Ticket 13 — Calendar — current-head audit

- **Backend head:** `2f37e1bb0` (`release/code-10-10-v2`), `/Users/tarunchintakunta/Personal/streamline/streamlineos-backend`
- **Frontend head:** `7469d2789` (`release/code-10-10-v2`), `/Users/tarunchintakunta/Personal/streamline/streamlineos-frontend`
- **Databases used:** `scratch_head_1010` (owner + `streamline_app` non-owner). Both are structurally at journal head and **contain zero rows** (`calendar_events`, `event_attendees`, `calendar_event_exceptions`, `calendar_provider_sync_queue`, `organizations` all `count = 0`), so every performance claim below is a *shape* claim, not a measurement. See "Not measured".
- **No prior report existed for this ticket.** Everything below was reconstructed from scratch.

---

## 1. What I read, with numbers

### Backend

| Slice | Count |
|---|---|
| Files anywhere under `src` matching `*calendar*` | 111 |
| `src/modules/calendar/` total files | 83 |
| — production files (non-spec) | 35 (**4,449 LOC**) |
| — unit specs (`*.spec.ts`) | 45 (**9,678 LOC**) |
| — e2e specs (`*.e2e-spec.ts`) | 3 (295 LOC) |
| Controllers | 3 (`CalendarController`, `CalendarAdminSettingsController`, `CalendarProviderWebhookController`) |
| Services registered in `CalendarModule` | 13 providers, 3 exports |
| DTO/Zod schema files | 9 |
| Calendar HTTP operations in `openapi.json` | **11** under `/calendar/*` + 1 `/cron/calendar-reminder-sweep` + 1 `/webhooks/calendar/provider` |
| Calendar tables | **5** — `calendar_events` (29 live columns), `event_attendees`, `calendar_event_exceptions`, `calendar_source_preferences`, `calendar_provider_sync_queue` |
| Registered `CalendarEventSource` implementations | **8 keys**: `calendar-events`, `tasks`, `build`, `hr`, `hr-leaves`, `hr-interviews`, `hr-attendance`, `hr-holidays` |
| RBAC keys | 5 (`calendar:read`, `calendar:write`, `calendar:ai:use`, `calendar:events:export`, `calendar:admin:manage`) — identical in both catalogs |

Files read in full: `calendar.controller.ts`, `calendar.service.ts`, `calendar-events-aggregate.service.ts`, `calendar-event-source.loader.ts`, `calendar-native-event-source.ts`, `calendar-occurrence.service.ts`, `calendar-exception-loader.ts`, `calendar-recurrence.service.ts`, `calendar-conflict.service.ts`, `calendar-attendees.service.ts`, `calendar-export.service.ts`, `calendar-source.registry.ts`, `calendar-source-preferences.service.ts`, `calendar-sync-status.service.ts`, `calendar-provider-sync-sweep.service.ts`, `calendar-provider-webhook.service.ts`, `calendar-provider-webhook.controller.ts`, `calendar-webhook-secret.ts`, `calendar-reminder-sweep.service.ts`, `external-calendar-events.service.ts`, `external-calendar-sync.service.ts`, `calendar-keyset-drain.ts`, `calendar-admin-settings.controller.ts`, all 9 DTO files, `db/schema/common/calendar-events.ts`, `db/schema/calendar/*`, plus `common/date/zoned-wall-clock.ts`, `common/tenant/for-each-org.ts`, `common/tenant/tenant-db.ts`, `common/tenant/tenant-context.interceptor.ts`, `integrations/core/composio.gateway.ts`.

### Frontend

| Slice | Count |
|---|---|
| Files matching `*calendar*` (excl. node_modules/.next) | 94 |
| `features/calendar/` files | 70 — 51 production (**7,212 LOC**) + 19 test |
| App routes under `app/(authenticated)/calendar` | 4 files: `page.tsx`, `loading.tsx`, `error.tsx`, `settings/page.tsx` |
| `hooks/api/calendar.ts` | 419 LOC, 13 hooks (5 queries, 8 mutations) |
| Query-key entries | 8 under `platformHierarchyQueryKeys.calendar` |

### Commands actually run

```
backend: npx jest --runInBand --testPathPattern="src/modules/calendar/"
  -> Test Suites: 45 passed, 45 total   Tests: 429 passed, 429 total   (e2e excluded)

frontend: npx jest --runInBand --clearCache
frontend: npx jest --runInBand --testPathPattern="(features/calendar/|features/__tests__/calendar-a11y|hooks/api/calendar-source-key|lib/date-utils.calendar-date)"
  -> Test Suites: 1 FAILED, 21 passed, 22 total   Tests: 1 failed, 175 passed, 176 total
     failure: features/calendar/calendar-toolbar.test.tsx:17  (reproduced after --clearCache)

backend: COLUMN_DRIFT_GATE_DATABASE_URL=<scratch_head_1010> pnpm check:declaration-column-drift   -> exit 0
backend: REFERENTIAL_ACTION_GATE_DATABASE_URL=<scratch_head_1010> pnpm check:referential-action-drift -> exit 0
  (its own output names one calendar entry, baselined — see F12)

psql scratch_head_1010: pg_class RLS flags, pg_policies, pg_indexes, information_schema.columns,
                        pg_constraint for calendar_events / calendar_event_exceptions
psql as streamline_app with NO tenant GUC: `select count(*) from user_integration_connections`
  -> ERROR: no tenant context: app.organization_id is not set for this transaction  (SQLSTATE 42501)
node: regex probe of extractEventNumericId against the real occurrence-id shape
```

---

## 2. Per-criterion assessment

### PRD-C128 — "verify one `/calendar`, source toggles, timezone display, series-versus-instance edits, cursor/range keys and DST/exception/conflict/reminder E2E"

**Status: PARTIALLY MET.** Walked in the order the criterion names them.

**(a) One `/calendar` — MET.**
`features/calendar/unified-calendar-surface-boundary.test.ts` (132 lines) is a real fence with two scans and an anti-vacuity check on each ("the scan detects the import it exists to ban, so a green result is meaningful"). Scan 1 bans any import of `@/features/calendar/**` or `react-big-calendar` from outside `features/calendar/**`; scan 2 catches hand-rolled `grid-cols-7` day grids that import nothing. Three module surfaces are recorded with `toEqual`, so both adding one and fixing one without deleting the entry fails: `build/views/calendar-view.tsx`, `hr/holidays/components/calendar-view.tsx`, `hr/leaves/components/leave-calendar-widget.tsx`. All three are out-of-release or explicitly handed to ticket 25. Test passes at head. `/calendar/settings` is the only other route and is a stub, not a second grid.

**(b) Source toggles — MET on the per-user path, NOT MET on the org path.**
8 registered source keys. `CalendarSourceRegistry.resolveAvailable` filters by `access.moduleAvailabilityFor(orgId, userId, module)` — per-*user* module availability, not `isModuleEnabled` (the comment at `calendar-source.registry.ts:45` records why). Per-user preferences persist in `calendar_source_preferences`, unique on `(org_id, membership_id, source_key)`, exercised by an e2e (`calendar-sources.e2e-spec.ts:78`). `loadAll` runs sources through `Promise.allSettled` and returns `failures` + `truncatedKeys` rather than failing the whole read; the frontend renders both (`CalendarSourcePanel`'s `SourceFailureBanner`, plus the truncation banner at `calendar-view.tsx:355`). Org-level: `GET /calendar/admin/settings` exists and is permission-gated on `calendar:admin:manage`, but **it has no client** — `/calendar/settings` renders a hard-coded `EmptyState` ("Full settings UI is coming soon") and never calls it. There is no write endpoint for org-level source configuration at all.

**(c) Timezone display — PARTIALLY MET, and one defect.**
The primitive is genuinely correct: `common/date/zoned-wall-clock.ts` carries the wall clock in UTC fields (`toWallClockUtc`/`fromWallClockUtc`) precisely so a host DST transition cannot skip an hour, and documents why `date-fns-tz` and `getTimezoneOffset` are both wrong for this. `expandRecurring` (`calendar-occurrence.service.ts:74-88`) converts `dtstart`, both window bounds and `UNTIL` through it before handing them to `rrule`. Four unit specs pin it (`calendar-dst-edge`, `calendar-timezone`, `calendar-host-timezone-independence`, `calendar-item-timezone`) plus `common/date/calendar-date-host-independence.spec.ts`.
Display: `formatEventTimeRange` (`lib/date-utils.ts:134`) renders the authored zone *and*, when it differs from the reader's, appends the reader's local time. It is used in exactly one place — `event-detail-content.tsx:73-74`. The grid and the agenda/list panel show no zone at all.
**Defect (F5):** `buildEventPayload` (`features/calendar/event-create-validators.ts:96`) unconditionally sets `timezone: Intl.DateTimeFormat().resolvedOptions().timeZone` on **edit** as well as create, so any edit rewrites the event's authored zone to the editor's browser zone.

**(d) Series-versus-instance edits — NOT MET.**
The mechanism is complete on the backend: `PUT /calendar/events/:eventId` is the series edit, `PATCH|DELETE /calendar/events/:eventId/occurrences/:occurrenceStart` are the instance edit and cancel, both writing `calendar_event_exceptions` with a proper `ON CONFLICT (org_id, event_id, occurrence_start) DO UPDATE`. The frontend has the scope dialog (`event-series-scope-dialog.tsx`) and routes through it whenever `event.rrule` is set.
**It is dead in the UI (F3).** The backend emits recurring occurrence ids of the form `event-<id>-<ISO instant>` (`calendar-native-event-source.ts:70`, pinned by `calendar-native-source-recurrence.spec.ts:115`). `extractEventNumericId` (`hooks/api/calendar.ts:123`) is `id.match(/(\d+)$/)` — an ISO instant ends in `Z`, so the match fails and it returns `null` for **every** recurring occurrence. Verified by direct probe. Every recurring mutation in `event-detail-sheet.tsx` and `use-event-create-dialog.ts` guards on `numericEventId === null` with a bare `return`, so Delete, "Cancel occurrence", RSVP and ticket-unlink are rendered, clickable, confirmable — and silently do nothing. The series-scope confirm reaches a `toast.error("Cannot edit this event type")`. There is no test anywhere in the frontend that feeds a recurring-shaped id to this function (grepped: every fixture uses `"event-42"`).
Second, smaller defect (F2 below): an instance edit never enqueues a provider-sync operation and never bumps `local_version`.

**(e) Cursor/range keys — MET for range; there is no cursor by design.**
`queryKeys.calendar.events(startIso, endIso, enabledSources)` (`lib/query-keys/platform-hierarchy.ts:6`) carries the range **and the sorted enabled-source set**, and `useCalendarEvents` waits for the source list before firing rather than fetching under a key it would have to change (`hooks/api/calendar.ts:187-206`). That closes the "cache key missing a filter dimension" shape for the one read where it bites. Tenancy is in the hash, not the key: `scopedQueryKeyHashFn(authenticatedScope(orgId, userId))` prefixes every key and the provider is remounted on `key={scope}` (`lib/query-scope.ts`).
The range itself is `startOfMonth(subMonths(d,1)) → endOfMonth(addMonths(d,1))` — worst real span 92 days against a 120-day server cap, and `dto/calendar-span.spec.ts` derives the client's worst case and fails if the cap drops under it. There is no cursor: `/calendar/events` returns one page capped at `CALENDAR_EVENTS_CAP = 2000` (per-source `CALENDAR_PER_SOURCE_CAP = 400`) with `truncated: true`, which the UI surfaces as a banner. That is a defensible design, but it means "cursor keys" is *not applicable* rather than met, and a tenant over the cap has no way to page.

**(f) DST / exception / conflict / reminder E2E — NOT MET.**
Backend e2e for calendar is 3 files, 295 lines total:
- `calendar.controller.e2e-spec.ts` (45 lines) — auth only.
- `calendar-sources.e2e-spec.ts` (119 lines) — source registration through the real module graph, preference persistence, HR sources hidden when the module is unavailable.
- `calendar-member-lookup-gate.e2e-spec.ts` (131 lines) — `directory:people:view` MISSING/GRANTED/REVOKED, cross-tenant isolation, and a bite-proof block.

There is **no DST e2e, no exception e2e, no conflict e2e and no reminder e2e**. DST, exceptions and reminders have solid *unit* coverage (429 unit tests, all green). Conflicts have unit coverage of the service and none of the surface, because the surface does not exist (F6).

Frontend tests for calendar: 22 suites / 176 tests, **1 red at head** (F10).

---

### PRD-C129 — "Commit Calendar changes locally first with an atomic provider-sync intent and `pending` state; process create/update/delete asynchronously with idempotent lease, retry/backoff and cancellation, persist per-event monotonic operation/version ordering plus delete tombstones, discard stale jobs/webhooks, reconcile provider drift, expose `synced/failed` plus user retry, and prevent permanent local/external divergence."

**Status: NOT MET.** The design is all there; two of its three moving parts never execute. Clause by clause:

| Clause | Verdict | Evidence |
|---|---|---|
| local-first with an **atomic** provider-sync intent | **MET** | `calendar.service.ts:185`, `:307`, `:434` — all three inserts into `calendar_provider_sync_queue` are inside the same `db.transaction` as the event write. The queue is a table, not a network call; nothing external is held in the transaction. |
| `pending` state | **MET** | `calendar_provider_sync_queue.state` defaults `'PENDING'`; `mapState` in `calendar-sync-status.service.ts:15` projects PENDING→`pending`, IN_FLIGHT→`in_flight`, PROCESSED→`synced`, FAILED→`failed`. |
| process create/update/delete **asynchronously** | **NOT MET** | `CalendarProviderSyncSweepService.run()` has **no production caller** (F1). Grep for the class across `src` returns only `calendar.module.ts:36` (provider) and 9 spec files. `CalendarModule.exports` (line 47) does not export it, so no other module could inject it. There is no `/cron/calendar-provider-sync-sweep` route — I enumerated all 65 cron routes and all `/calendar*` paths in `openapi.json`. **The queue never drains.** |
| **idempotent lease** | PARTIALLY | The lease itself is correct: a single `UPDATE … WHERE id IN (SELECT … FOR UPDATE SKIP LOCKED)` sets `IN_FLIGHT` + `lease_expires_at`, and an expired `IN_FLIGHT` row is re-claimable (`calendar-provider-sync-sweep.service.ts:41-57`). The duplicate-create guard is a read-then-check on `eventRow.externalEventId` (line 132), not a fence — two workers claiming the same row via an expired lease can both pass it. Separately, the *enqueue* has no idempotency key at all (F7): no `@Idempotent` on any calendar route, and no unique constraint on the queue. |
| retry / backoff | MET in code, unreachable | `RETRY_BACKOFF_MS = [0, 30s, 2m, 10m, 30m]`, `MAX_ATTEMPTS = 5`, backoff parked in `lease_expires_at` which the claim predicate respects. Never executes. |
| cancellation | PARTIALLY | Stale jobs self-cancel: `processRow` returns early when the event row is gone (line 119) or when a newer pending update exists (line 154-159). There is no operator or user path to cancel a queued job. |
| per-event monotonic operation/version ordering | PARTIALLY | `local_version` increments atomically in SQL (`calendar.service.ts:245`), is stamped on create and update queue rows, and `hasNewerPendingUpdateFor` supersedes an older update. But `delete` rows are enqueued with **no `eventLocalVersion`** (`calendar.service.ts:434-441`), so a delete is unordered relative to the version chain; and per-occurrence exception writes bump nothing (F2). |
| delete tombstones | MET | The queue row *is* the tombstone, and `findDeleteTombstone` (`calendar-sync-status.service.ts:84`) resolves visibility from the tombstone's own author after the event row is gone, so a failed delete stays visible and retryable. Well done and explicitly documented. |
| discard stale jobs / webhooks | code present, webhook path unreachable | `handleScoped` discards when `event.updatedAt >= providerUpdatedAt` (line 115) and when a local sync is still pending (line 131). But the whole receiver 500s (F4). |
| reconcile provider drift | **NOT MET** | Same as above — F4. |
| expose `synced/failed` + user retry | code present, states unreachable | `GET /events/:id/sync-status` + `POST /events/:id/sync-retry` exist; `EventSyncStatus` is mounted at `event-detail-content.tsx:131` and renders a retry button when `retryable`. With F1 standing, no row ever leaves `PENDING`, so the UI shows "Syncing to your calendar…" forever and polls every 5 s indefinitely (F17); `retrySync` only touches `state = 'FAILED'` rows and returns `{ requeued: 0 }` forever. And it is passed `numericEventId`, which is `null` for recurring events (F3), so recurring events have no sync status at all. |
| **prevent permanent local/external divergence** | **NOT MET** | F1 (nothing ever pushes), F2 (occurrence edits never push), F8 (a delete between enqueue and push orphans the provider copy permanently). |

---

## 3. Findings

| # | Sev | File:line | Summary |
|---|---|---|---|
| F1 | **P0** | `backend/src/modules/calendar/calendar-provider-sync-sweep.service.ts:34` | The provider-sync sweep has no production caller; `calendar_provider_sync_queue` never drains. |
| F2 | **P0** | `backend/src/modules/calendar/calendar-provider-webhook.service.ts:45` | `POST /webhooks/calendar/provider` always 500s: an RLS-protected read with no tenant GUC. |
| F3 | **P1** | `frontend/hooks/api/calendar.ts:123` | `extractEventNumericId` returns `null` for every recurring occurrence id; all recurring-event mutations silently no-op. |
| F4 | **P1** | `backend/src/modules/calendar/calendar-recurrence.service.ts:41` | Per-occurrence edit/cancel enqueues no provider-sync op and bumps no version. |
| F5 | **P1** | `frontend/features/calendar/event-create-validators.ts:96` | Every edit overwrites the event's authored timezone with the editor's browser zone. |
| F6 | **P1** | `backend/src/modules/calendar/calendar.service.ts:185` | `syncConnectionId` is taken from the request body with no ownership check. |
| F7 | **P1** | `backend/src/modules/calendar/calendar-conflict.service.ts:117` | Unbounded org-wide exception scan (no window, no limit) inside the create-event transaction. |
| F8 | **P1** | `backend/src/modules/calendar/calendar-provider-sync-sweep.service.ts:139` | Create-then-delete race orphans the provider copy permanently. |
| F9 | **P1** | `frontend/hooks/api/calendar.ts:78` | `eventConflicts`/`oooConflicts` are computed on every create and never surfaced. |
| F10 | P2 | `frontend/features/calendar/calendar-toolbar.test.tsx:17` | Red test at head — asserts a "Share" accessible name the component no longer has. |
| F11 | P2 | `backend/src/modules/calendar/calendar.controller.ts:133` | No `@Idempotent` on any of the 8 calendar mutations. |
| F12 | P2 | `backend/src/db/schema/common/calendar-events.ts:50` | Declaration/catalog divergence: 4 undeclared indexes, 1 index column-list mismatch, 1 undeclared column, 1 undeclared `ON DELETE CASCADE`. |
| F13 | P2 | `backend/src/modules/calendar/calendar-reminder-sweep.service.ts:67` | The recurring branch drains and RRULE-expands every recurring event in the org on every tick. |
| F14 | P2 | `frontend/features/calendar/use-event-create-dialog.ts:97` | Attendee-hydration race: submitting an edit before the attendee query resolves wipes all attendees. |
| F15 | P2 | `backend/src/modules/calendar/calendar-provider-sync-sweep.service.ts:39` | `BATCH_LIMIT = 20` is shared across all tenants in `forEachOrg` order — first orgs starve the rest. |
| F16 | P2 | `backend/src/modules/calendar/calendar-sync-status.service.ts:161` | Raw provider error text (`lastError`) is returned to every org member who can see the event. |
| F17 | P2 | `frontend/hooks/api/calendar.ts:399` | The sync-status poll has no attempt or age ceiling; with F1 it polls every 5 s forever. |
| F18 | P2 | `backend/src/modules/calendar/calendar-source-preferences.service.ts:39` | `PUT /calendar/sources/:sourceKey` accepts any string as a source key and persists it. |
| F19 | P2 | `backend/src/modules/calendar/calendar-attendees.service.ts:110` | `listAttendees` truncates at 100 with no cursor; create accepts 200. |
| F20 | P2 | `backend/src/modules/calendar/calendar.service.ts:209` | `POST /calendar/events` returns `{meetingUrl: null, syncQueued}`; the client reads `syncError`/`meetingUrl`, so two toasts are unreachable. |
| F21 | P2 | `frontend/app/(authenticated)/calendar/settings/page.tsx:11` | `/calendar/settings` is a hard-coded `EmptyState`; `GET /calendar/admin/settings` has no client and no write counterpart. |
| F22 | P2 | `backend/src/modules/calendar/external-calendar-events.service.ts:95` | The `needs_reauth` write has no `org_id` predicate. |
| F23 | P2 | `backend/src/modules/calendar/calendar-reminder-sweep.service.ts:203` | `reminder_15min_sent` is burned even when zero recipients existed; a creator who is not an attendee never gets a reminder. |

### Detail on the P0s and P1s

**F1 — P0. The provider-sync queue never drains.**
`calendar-provider-sync-sweep.service.ts:34` defines `run()`. Grepping `CalendarProviderSyncSweepService` and `provider-sync-sweep` across all of `src` returns exactly: the module registration (`calendar.module.ts:36`) and nine `*.spec.ts` files. `CalendarModule.exports` at line 47 is `[CalendarService, CalendarReminderSweepService, CalendarSourceRegistry]` — the sweep is not exported, so `CronModule` (which does import `CalendarModule`) could not inject it even if it wanted to. I enumerated every cron route in `src/modules/cron/*.controller.ts` (65 routes) and every `calendar` path in `openapi.json`: `/cron/calendar-reminder-sweep` exists, `/cron/calendar-provider-sync-sweep` does not.
*Failure scenario:* a user creates an event with `syncConnectionId = 7`. `calendar.service.ts:185` writes a `PENDING` queue row in the same transaction. Nothing ever claims it. `GET /calendar/events/7/sync-status` returns `{status:"pending", retryable:false}` forever; the detail sheet shows "Syncing to your calendar…" and re-polls every 5 s for the life of the tab; `POST .../sync-retry` matches only `state='FAILED'` and returns `{requeued:0}`. The event never appears in Google Calendar, and deleting it locally never removes a provider copy that was never created. This is the exact "permanent local/external divergence" C129 forbids, for 100% of provider-synced events.
*Fix:* export `CalendarProviderSyncSweepService` from `CalendarModule`, add a `GET|POST /cron/calendar-provider-sync-sweep` handler on `CronPlatformController` wrapped in `cronLease.withLease("calendar-provider-sync-sweep", …)` exactly as `runCalendarReminderSweep` does, and register the schedule. Fix F15 in the same change, because a working sweep with a global batch of 20 starves large tenants.

**F2 — P0. The provider webhook always 500s.**
`CalendarProviderWebhookController` is `@Public()`. `TenantContextInterceptor.resolveTenant` (`common/tenant/tenant-context.interceptor.ts:82-94`) returns `null` when there is neither `req.user.orgId` nor `req.portalUser.organizationId`, so `intercept` calls `next.handle()` with **no tenant transaction and no `app.organization_id` GUC**. `CalendarProviderWebhookService.handleDelivery:45` then does `this.db.select().from(userIntegrationConnections)`. `createTenantAwareDb` falls through to the raw pool when there is no ambient context (`common/tenant/tenant-db.ts:20`). `user_integration_connections` has `relrowsecurity = t` with policy `tenant_isolation: org_id = app.current_org_id()`, and `app.current_org_id()` is documented to raise `42501` when the GUC is unset.
Measured directly:
```
$ psql "postgresql://streamline_app:…@localhost:5432/scratch_head_1010" \
    -c "select count(*) from user_integration_connections;"
ERROR:  no tenant context: app.organization_id is not set for this transaction
CONTEXT:  PL/pgSQL function current_org_id() line 7 at RAISE
```
*Failure scenario:* Google posts a change notification with a valid `x-calendar-webhook-secret`. `assertCalendarWebhookSecret` passes, `handleDelivery` throws a raw postgres error, `AllExceptionsFilter` returns 500, the provider retries and 500s again until it disables the channel. Provider drift is **never** reconciled. If `CALENDAR_PROVIDER_WEBHOOK_SECRET` is unset the route 503s instead — so the drift-reconciliation half of C129 is unreachable in both configurations.
Why no test caught it: `calendar-provider-webhook-delivery.spec.ts` mocks `db.select` entirely (line 84-92), so it asserts the *shape* of the connection lookup and can never observe the GUC.
*Fix:* the connection lookup must not run under RLS with no context. Either resolve the connection through a `SECURITY DEFINER` function owned by the DB owner that returns `(id, org_id)` for an active calendar connection, or add `@NoTenantTransaction` + an owner-role handle for this one lookup, then hand every subsequent read/write to the existing `runInNewTenantTransaction(orgId, …)` (which is already correct). Add an integration test that boots the API and posts a real delivery — CLAUDE.md §8 says exactly this ("a swallowed `42501` passes every static check").

**F3 — P1. Recurring events cannot be mutated from the UI.**
`hooks/api/calendar.ts:123`:
```ts
export function extractEventNumericId(id: string): number | null {
  const match = id.match(/(\d+)$/);
  return match ? parseInt(match[1], 10) : null;
}
```
Probe:
```
event-42                              -> 42
event-42-2026-01-05T10:00:00.000Z     -> null
```
Call sites: `event-detail-sheet.tsx:64`, `use-event-create-dialog.ts:50` and `:232`, `use-event-series-scope.ts:37`, `components/ui/calendar-event-combobox.tsx:22`.
*Failure scenario:* a user opens a weekly stand-up occurrence, clicks Delete, confirms in the destructive `ConfirmDialog`. `handleDelete` hits `if (!event || numericEventId === null) return;` (`event-detail-sheet.tsx:83`) and returns. No request, no error toast, no state change. Same for "Cancel occurrence" (`:94`), RSVP (`:106`) and Unlink (`:72`). In the edit dialog, `useEventAttendees(editNumericId)` is disabled so attendees never load, and confirming the series-scope dialog produces `toast.error("Cannot edit this event type")`. `EventSyncStatus` is passed `null` and renders nothing.
*Fix:* parse the id by structure rather than by trailing digits — `const m = /^event-(\d+)(?:-(.+))?$/.exec(id)` returning `{ eventId, occurrenceIso }` — and thread the occurrence part through as the `occurrenceStart` (see F4's note about which instant that is). Add a frontend test whose fixture id is `event-42-<ISO>`; there is currently none.

**F4 — P1. Per-occurrence edits never reach the provider, and re-editing a moved occurrence is a silent no-op.**
`calendar-recurrence.service.ts:41` (`upsertOccurrenceException`) and `:83` (`cancelOccurrence`) write `calendar_event_exceptions` and dead-letter the matching reminder outbox rows. Neither inserts into `calendar_provider_sync_queue` (confirmed: the only four inserts repo-wide are `calendar.service.ts:185/307/434` and `calendar-provider-webhook.service.ts:159`), and neither touches `calendar_events.local_version` or `updated_at`.
*Failure scenario A:* a weekly meeting synced to Google. The owner moves next Tuesday's instance to Wednesday. Locally the occurrence moves; the Google copy still says Tuesday, and nothing will ever correct it — permanent divergence for exactly the operation C129 names.
*Failure scenario B (compounding with F3's fix):* `expandRecurring` returns `startDate: effectiveStart` (`calendar-occurrence.service.ts:106-117`) and `calendar-native-event-source.ts:70` builds the id from `occ.startDate` — i.e. the **modified** start — while the rescheduled branch at line 102 builds it from `rs.nominalStartMs`, the **nominal** start. The same id shape carries two different meanings. `use-event-series-scope.ts:47` sends `occurrenceStart: event.start`, so a second edit of an already-moved occurrence writes a *new* exception keyed on the moved instant, which the RRULE never generates as a nominal — so `expandRecurring` ignores it and `collectRescheduledOccurrences` skips it (`calendar-exception-loader.ts:30`). The user sees "Occurrence updated" and nothing changes.
*Fix:* (i) carry `nominalStart` on `CalendarOccurrence` and always build the projection id from it, so the id identifies the exception's key; (ii) have `upsertOccurrenceException`/`cancelOccurrence` bump `local_version` and enqueue an `update` (or `delete`) queue row when the parent event has `integration_connection_id` and `external_event_id`.

**F5 — P1. Editing an event rewrites its authored timezone.**
`features/calendar/event-create-validators.ts:96` sets `timezone: Intl.DateTimeFormat().resolvedOptions().timeZone` in the payload returned by `buildEventPayload`, which `use-event-create-dialog.ts:236` and `use-event-series-scope.ts:56` both send on **update**. `toEditForm` never reads `event.timezone` (`event-form-state.ts:82-105` — it is not in the returned `FormState`).
*Failure scenario:* a weekly 10:00 stand-up authored `Asia/Kolkata`. A colleague in `America/New_York` opens it and fixes a typo in the title. The update sets `timezone = 'America/New_York'`. `expandRecurring` re-anchors `dtstart` to New York wall clock, so every future occurrence shifts and subsequently follows US DST rather than IST. `updateEvent` also sets `reminder15MinSent = false` when the timezone changed, re-firing reminders. Nothing warns anyone.
*Fix:* carry `event.timezone` into `FormState` in `toEditForm`, send it unchanged on edit, and only default to the browser zone on create. If the product wants re-anchoring, make it an explicit field in the form.

**F6 — P1. `syncConnectionId` is unvalidated.**
`calendar.service.ts:183-202` writes `connectionId: input.syncConnectionId` straight from the request body. `createEventSchema` validates only `z.number().int().positive()`. Nothing checks that the connection belongs to the caller. The sweep's `resolveConnection` (`calendar-provider-sync-sweep.service.ts:173-194`) checks `org_id`, `status = 'active'` and toolkit — **not `user_id`/`membership_id`** — and `ComposioGateway.executeTool` passes `connectedAccountId` explicitly to `client.tools.execute`, so the connection, not the `userId` argument, selects the target account.
*Failure scenario:* user A in org X enumerates connection ids (or guesses a small integer) and creates an event with `syncConnectionId` set to user B's Google Calendar connection. Once F1 is fixed, the sweep writes A's event — title, description, attendee emails — into B's personal Google Calendar, and A's later updates and deletes follow. Latent only because the sweep never runs.
*Fix:* in `createEvent`, resolve the connection inside the transaction with `and(eq(orgId), eq(id, input.syncConnectionId), eq(userId, callerUserId), eq(status,'active'), inArray(toolkit, CALENDAR_TOOLKITS))` and 404 on a miss; add the same `user_id` predicate to `resolveConnection` as defence in depth.

**F7 — P1. Unbounded conflict scan inside the create transaction.**
`CalendarConflictService.checkConflictsInTx` runs on every `POST /calendar/events`, inside the write transaction. Its keyset loop (`calendar-conflict.service.ts:60-109`) has no cap and the comment at line 61 confirms it is meant to drain: `.limit(CONFLICT_SCAN_BATCH_SIZE) below is intentional: the keyset loop consumes every batch`. The recurring arm has **no lower bound on `start_date`** — `isNotNull(rrule) AND start_date < endDate AND (recurrence_end IS NULL OR recurrence_end > startDate)` — so it loads every open-ended recurring event the tenant has ever created. Then line 117 loads `calendar_event_exceptions` for all of those with `inArray(eventId, recurringIds)` and **no window predicate and no limit at all**. Then every row is RRULE-expanded in `expandToOccurrences`.
*Failure scenario:* a tenant with 5,000 open-ended weekly series and 50,000 exception rows. Creating a 30-minute meeting loads all 5,000 events over 50 round trips plus all 50,000 exceptions into one array, expands each series, and holds the write transaction open for the duration — against a 30 s `statement_timeout`. The cost grows with tenant size, not with the meeting.
*Fix:* bound the exception load to the requested window (reuse `loadExceptionsByEvent`, which already takes `windowStart`/`windowEnd`), cap the candidate drain, and restrict the conflict check to events the caller actually owns or attends — the filter at line 164 already discards everything else *after* loading it, so the predicate can move into SQL.

**F8 — P1. Create-then-delete orphans the provider copy.**
`processRow`'s create branch (`calendar-provider-sync-sweep.service.ts:139-149`) calls `pushCreate` and *then* writes `external_event_id` back in a separate transaction. `deleteEvent` (`calendar.service.ts:433`) only enqueues a `delete` when `d.integrationConnectionId && d.externalEventId` are already set.
*Failure scenario:* an event is created with sync enabled; the sweep claims the row and pushes to Google; before the write-back commits, the user deletes the event. The write-back updates 0 rows and is not checked. The local delete sees `external_event_id IS NULL` and enqueues nothing. The Google event exists forever with no local record, and the pending create row is later discarded as stale (line 119) — silently.
*Fix:* reserve the external id before the push where the provider supports a client-supplied id, or on a zero-row write-back enqueue a compensating `delete` carrying the id `pushCreate` returned.

**F9 — P1. Conflict detection is computed and thrown away.**
`createEvent` returns `{ event, oooConflicts, eventConflicts, meetingUrl, syncQueued }` (`calendar.service.ts:209`). The frontend's `MutateCalendarEventResponse` (`hooks/api/calendar.ts:76-81`) declares `{ event, oooConflicts, meetingUrl?, syncError? }` — `eventConflicts` is absent from the type. Grepping the whole frontend for `eventConflicts` and `oooConflicts` returns **only** the type declaration at line 78; there is no consumer of either.
*Failure scenario:* a user double-books themselves. The server does the entire O(tenant) scan of F7 to detect it, returns the conflicting occurrences, and the UI shows a plain "Event created" toast. Likewise an attendee who is on approved leave produces `oooConflicts` that nobody renders. C128 names conflict as a dimension to verify; the surface does not exist.
*Fix:* render both in the create dialog before dismissing it, or delete the computation — but not both silently.

### Notes on the P2s worth calling out

- **F12 (declaration drift).** `pg_indexes` on `calendar_events` shows 10 indexes; `db/schema/common/calendar-events.ts` declares 5 + pkey. Undeclared: `idx_calendar_events_org_end_date`, `idx_calendar_events_org_recurring_start`, `idx_calendar_events_org_start_cover`, `idx_calendar_events_linked_lead_party_id`. Mismatched: declared `idx_calendar_events_org_created_by_membership` is `(org_id, created_by_membership_id)`, live is `(org_id, created_by_membership_id, start_date)`. Undeclared live column: `linked_lead_party_id text`. `event_attendees` has an undeclared `uniq_event_attendees_org_id`. And `check:referential-action-drift` names it itself: `DESTRUCTIVE calendar_event_exceptions.fk_calendar_event_exceptions_org_event declared=no action (implicit) live=cascade`. The gate exits 0 because that row is baselined; the live behaviour (cascade) is the right one and the declaration at `db/schema/calendar/calendar-event-exceptions.ts:35` is simply missing `.onDelete("cascade")`. Notably `check:declaration-column-drift` does not look at indexes at all, so the four missing index declarations are invisible to every gate — the loader's own comments at `calendar-event-source.loader.ts:190-193` cite two of them by name as load-bearing.
- **F15 (tenant starvation).** `remaining = BATCH_LIMIT - claimed.length` inside `forEachOrg`, which iterates `ORDER BY organizations.id ASC`. With a global budget of 20 rows per run, one busy tenant early in id order consumes the entire batch and every later tenant's queue stalls indefinitely. Must be fixed with F1, not after.
- **F16.** `getSyncStatus` returns `lastError` verbatim to any caller who can see the event, and `visibility='org'` is the default. Composio error strings can carry account identifiers and upstream URLs.
- **F23.** `emitReminderIntents` only walks `event_attendees`, and `createEvent` does not add the creator as an attendee. A solo event therefore produces zero outbox rows, yet `reminder_15min_sent` is set to `true` at `calendar-reminder-sweep.service.ts:206` regardless. If that is intended, it deserves a comment; if not, it is a silent miss.

---

## 4. What head already gets right

These are load-bearing and should not be disturbed by the fix wave.

- **Tenant isolation on every calendar table.** All 5 calendar tables have `relrowsecurity = t` with a `tenant_isolation` policy `org_id = app.current_org_id()`, and every service predicate also carries `eq(orgId)` explicitly rather than leaning on RLS. Composite tenant FKs are in place on `event_attendees`, `calendar_event_exceptions` and `calendar_source_preferences`. Ten isolation specs exist (`*-isolation.spec.ts`, `*-tenant-isolation.spec.ts`) and all pass.
- **Membership-keyed visibility, not user-keyed.** Every read resolves the caller's `organizationMembers.id` (with `status = 'ACTIVE'`) and gates on `visibility='org' OR createdByMembershipId = caller OR attendee-row-exists`. `JwtAuthGuard` already rejects an inactive membership (`jwt-auth.guard.ts:274`), so the `?? 0` fallback is defence in depth and cannot alias a real membership (`serial` starts at 1).
- **The DST primitive is genuinely correct and documented.** `common/date/zoned-wall-clock.ts` explains why `date-fns-tz` and `getTimezoneOffset` are both wrong here and carries measured counter-examples per host zone. `expandRecurring` converts `dtstart`, both window bounds and `UNTIL`.
- **The read path is measured and deliberately optimised.** `CalendarEventSourceLoader` splits the recurring/non-recurring `OR` into two independently-indexed branches, uses a scalar sublink instead of `EXISTS` for caller attendance (with buffer counts in the comment: 47 probes for 172 blocks vs 39,114 rows for 1,128), resolves creator names once over distinct membership ids, and re-asserts visibility in step three rather than trusting step one. This is the opposite of the shapes this ticket asked me to look for.
- **Errors are surfaced as errors, never as an empty state.** `calendar-view.tsx:340` renders `getErrorMessage(eventsError)` with a Retry action; `:355` renders the truncation banner; `:363` renders per-connection external errors with a "Manage accounts" action; `CalendarSourcePanel` renders per-source `failures`. There is also a route `error.tsx` wired to `ReportingRouteErrorBoundary`.
- **The cache key carries the enabled-source set,** and the read waits for it rather than fetching under a key it would immediately invalidate (`hooks/api/calendar.ts:183-206`). Tenancy is in the query hash plus a provider remount.
- **No provider call is held inside a database transaction** anywhere in the calendar module. `pushCreate`/`pushUpdate`/`pushDelete` are all awaited outside, and the write-back opens its own `runInNewTenantTransaction`. `ComposioGateway` arms a 15 s `AbortSignal` per call.
- **The webhook authenticates before it parses,** with a constant-time compare, and refuses every delivery when the secret is unconfigured rather than accepting unauthenticated ones. The delivery body is `.strict()` and carries **no** tenant selector — the org comes from the connection row. The design is right; only the RLS plumbing (F2) is wrong.
- **The delete tombstone is real and reasoned.** `findDeleteTombstone` resolves visibility from the queue row's own author after the event is gone, with a comment explaining why the naive version leaves the provider copy alive forever.
- **The reminder pipeline is idempotent** through `notificationOutbox`'s `(org_id, dedupe_key)` arbiter, and every mutation that invalidates a reminder (time change, attendee removal, occurrence move, occurrence cancel, event delete) dead-letters the matching `PENDING` outbox rows in the same transaction.
- **`drainByKeyset` exists precisely to stop the "bare `.limit(N)` silently drops rows" shape** in sweeps, and is used consistently in the reminder sweep.
- **The "one `/calendar`" fence is anti-vacuous** — both scans assert they detect their own known-bad input before asserting the corpus is clean, and the exception list is `toEqual` so it bites in both directions.
- **Both permission catalogs agree** on all 5 calendar keys, and `calendar:read`/`calendar:write` come from `EMPLOYEE_SELF_SERVICE_GRANTS`, so the `useCan` gates in the hooks are not inert-but-broken.
- **429 backend unit tests across 45 suites, all green.**

---

## 5. Not measured / blocked on infrastructure

| What | Why | What would measure it |
|---|---|---|
| Buffer/plan cost of `/calendar/events`, the conflict scan (F7) and the reminder sweep (F13) | `scratch_head_1010` and `scratch_cold_1010` contain **0 rows** in every calendar table and 0 `organizations`. `EXPLAIN (ANALYZE, BUFFERS)` on an empty table proves nothing. | Seed a skewed fixture (one tenant at ~90% of rows: ~200k `calendar_events`, ~40k `event_attendees` for one membership, ~50k `calendar_event_exceptions`, ≥1k open-ended recurring series), `VACUUM ANALYZE`, then run `EXPLAIN (ANALYZE, BUFFERS)` **as `streamline_app` with `SET LOCAL app.organization_id`** for: the two `candidatePage` branches, the `attendedByCaller` sublink, `checkConflictsInTx`'s drain + its unbounded exception load, and the reminder sweep's recurring branch (which has no `(org_id, id)` index and must sort). |
| The webhook 500 as an end-to-end HTTP response | I proved the SQL raises `42501` for the app role with no GUC, and traced `resolveTenant → null → no transaction → tenant-aware proxy falls through to the pool`. I did not boot the API and POST a delivery. | `CALENDAR_PROVIDER_WEBHOOK_SECRET=… pnpm start:dev` against a DB where `APP_DATABASE_URL` is the non-owner role, then `curl -X POST /webhooks/calendar/provider -H 'x-calendar-webhook-secret: …' -d '{"connectionId":1,"externalEventId":"x","providerUpdatedAt":"2026-09-03T00:00:00Z"}'`. Expect 500 with `42501` in the logs. |
| Any provider round-trip (Composio → Google/Outlook) | No `COMPOSIO_API_KEY`, no connected account, and F1 means the sweep does not run anyway. | A Composio sandbox key plus one connected `googlecalendar` account, then drive `CalendarProviderSyncSweepService.run()` directly. |
| DST / exception / conflict / reminder **E2E** (the literal C128 deliverable) | The three existing calendar e2e specs cover auth, source registration and the member-lookup gate only. `pnpm test:e2e` was not run — it needs a seeded database and the brief caps the laptop budget. | Add e2e specs and run `pnpm test:e2e --testPathPattern=calendar` against a local seeded Postgres: (1) a series crossing a US and an EU DST boundary in two different authored zones; (2) an occurrence moved out of and back into the window; (3) a create whose response carries `eventConflicts` and `oooConflicts`; (4) a reminder sweep tick asserting exactly one outbox row per attendee per occurrence and none after a cancel. |
| `check:alert-ack` | Needs a real `ALERT_WEBHOOK_URL` and a human ack (noted in the shared brief). Not calendar-specific. | — |
| Frontend `check:web-vitals-budget`, `check:route-bundle-budget` | Known red repo-wide; require a production build, which the brief forbids on this budget. | Central orchestrator build. |

Two further things I want to be explicit about:

1. **`check:declaration-column-drift` and `check:referential-action-drift` both exit 0, and both are blind to what F12 records.** The column gate demotes 155 undeclared nullable/defaulted columns to "reported, not failed" (`linked_lead_party_id` is one of them) and never inspects indexes at all. The referential gate *does* name the calendar FK — `DESTRUCTIVE calendar_event_exceptions.fk_calendar_event_exceptions_org_event declared=no action (implicit) live=cascade` — but it is baselined, so the exit code is 0. A green gate here means "baselined", not "no drift".
2. **The 45 green backend suites cannot see F1, F2 or F6.** F1 is an absence (no caller) that no unit test can express; F2 is masked because `calendar-provider-webhook-delivery.spec.ts` mocks `db.select` outright; F6 is a missing predicate that only a two-account test would catch. This is the "gates report green over unread code" shape — the corpus is large and green, and the three worst defects are all outside what it covers.
