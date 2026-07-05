# Calendar External Accounts via Composio — Design Spec

Date: 2026-07-04 · Status: Approved · Surface: `/calendar` page (frontend + backend)

## 1. Problem

The `/calendar` page shows only internal events. Users need to connect their own
Google and Microsoft calendar accounts (multiple per user), see external events
merged into the grid, switch between accounts or view all, and get real meeting
links (Google Meet / Teams) attached when creating events. The org cannot publish
its own verified Google OAuth app, so direct provider OAuth is not viable.

## 2. Decision Record

**Platform: Composio** (`@composio/core`, backend-only). Verified against
docs.composio.dev on 2026-07-04:

- Managed auth (Composio-owned verified OAuth apps, zero setup): **Gmail,
  Outlook, Teams, Slack, OneDrive** — not Google Calendar, not Google Drive.
- **Google Calendar requires a custom auth config** with our own Google OAuth
  client. We reuse the existing sign-in app (`GOOGLE_CLIENT_ID/SECRET`): works
  today for up to 100 test users; Calendar scopes are Google-"sensitive" (free
  verification later, no CASA audit); zero code change when verified.
- **Outlook Calendar is fully managed** — production-ready today, Teams links
  included, no Azure registration (Microsoft creds are currently empty anyway).
- Free tier 20k tool-calls/month; SDK: `connectedAccounts.link()` (NOT
  `initiate()` — dead for managed auth since 2026-07-03), `waitForConnection`,
  `tools.execute`, `connectedAccounts.list/get/delete`.
- Accepted trade-offs: consent screen says "Composio"; Composio custodies
  tokens (SOC 2, post-May-2026 breach remediations); calendar triggers poll
  ~15 min (not used in v1).
- Rejected: Pipedream/Nango/Arcade/Klavis (all BYOC for Google in production),
  ACI.dev (Google-blocked), Nylas/Unipile (enterprise/paid, no Slack/general
  integrations).

Future features (Gmail, Slack, Drive, migrations) ride the same rails; codified
as a living rule in CLAUDE.md §6.

## 3. Architecture

### Backend — new `integrations` module (`backend/src/modules/integrations/`)

Generic connection rails, calendar-agnostic:

- `ComposioClientProvider` — singleton `Composio` client from validated env
  `COMPOSIO_API_KEY` (optional in schema; endpoints return a clear 503-style
  typed error when unset — fail loud, never silent).
- `IntegrationsService` + `IntegrationsController` (`@Controller("integrations")`),
  `JwtAuthGuard` + `PermissionGuard`, explicit `@RequirePermission` per method:
  - `POST /integrations/connections/initiate` `{ toolkit: "googlecalendar" | "outlook" }`
    → `connectedAccounts.link(userId, authConfigId, { callbackUrl, allowMultiple: true })`
    → `{ redirectUrl }`. Auth config ids from env
    (`COMPOSIO_AUTH_CONFIG_GOOGLE_CALENDAR`, `COMPOSIO_AUTH_CONFIG_OUTLOOK`).
    Composio userId = our internal user id.
  - `POST /integrations/connections/finalize` `{ connectedAccountId }` — fetches
    the account from Composio server-side, asserts `account.userId === actor.id`
    (never trusts client params), upserts mirror row. Idempotent.
  - `GET /integrations/connections` — actor's own rows (org + user scoped).
  - `DELETE /integrations/connections/:connectionId` — ownership re-asserted,
    deletes at Composio then locally.
  - `PATCH /integrations/connections/:connectionId/primary` — ownership
    re-asserted; single-primary enforced in one transaction.
- Zod DTOs via `ZodValidationPipe` (repo pattern). Upstream responses validated
  with Zod before use (§20 A10).

### DB (backend schema source of truth, one migration)

New `backend/src/db/schema/integrations.ts`:

- `user_integration_connections`: identity PK, `org_id` FK (non-null, indexed),
  `user_id` FK, `toolkit` text, `composio_connected_account_id` text unique,
  `account_email` text nullable, `account_label` text, `status` text
  (`active | needs_reauth | disabled`), `is_primary` boolean, `scope` text
  (`user` now; `org` reserved for future Slack), timestamps.
  Indexes: `(org_id, user_id)`; uniqueness rides on
  `composio_connected_account_id` alone (account email may be unavailable from
  the provider). **No provider tokens ever.**
- `calendar_events` additions: `integration_connection_id` (nullable FK),
  `external_event_id` text nullable + index — push mapping + render dedupe.
- Dropped: `user_calendar_connections` (superseded).

### Calendar module changes

- `GET /calendar/external-events?start&end[&connectionIds]` — fans out over the
  user's active connections in parallel: `GOOGLECALENDAR_EVENTS_LIST` /
  Outlook calendar-view action via `tools.execute`. Normalized item:
  `{ id: "ext-<connId>-<providerEventId>", connectionId, toolkit, accountEmail,
  title, start, end, allDay, location, meetingUrl }`. Redis cache 60s per
  (connectionId, range bucket) — user-owned key, never shared (§22).
  Partial-failure tolerant: failed accounts reported in `errors[]`, others
  returned. Composio auth errors mark the connection `needs_reauth`.
- Create/update/delete event: DTO gains optional `syncConnectionId` +
  `addConference`. After local write: push via `GOOGLECALENDAR_CREATE_EVENT`
  `{ create_meeting_room: true }` (→ `hangoutLink`) or
  `OUTLOOK_CALENDAR_CREATE_EVENT` `{ is_online_meeting: true,
  online_meeting_provider: "teamsForBusiness" }` (→ Teams join URL). Meeting
  URL stored in `location` (existing convention); mapping stored in the new
  columns. Update/delete propagate best-effort (log, never block local op).
  Dedupe on read: skip external items whose provider event id matches a local
  `external_event_id`.

### RBAC

- Catalog adds `integrations:connections:view` and
  `integrations:connections:manage`; both in employee-default grants (personal,
  self-scoped resources). Calendar endpoints keep `calendar:read`/`calendar:write`
  (repo's established 2-segment shared keys) + `@RequireModule("calendar")`.
- Every connections endpoint: explicit `@RequirePermission` (fail-open guard
  gap) + object-level ownership assertion on reads AND writes (§20 A01).

### Frontend (calendar page only)

- Toolbar **Accounts button** (connected-count badge) → `calendar-accounts-sheet.tsx`:
  accounts list (toolkit icon, email, primary star, per-account color dot,
  visibility toggle, reconnect-if-needed, disconnect) + Connect Google /
  Connect Microsoft actions (mutation → `redirectUrl` → `window.location`).
  Empty state per §15 (themed illustration).
- OAuth return: Composio redirects to `/calendar?connected_account_id=…`; the
  view fires an authed finalize mutation once (StrictMode ref guard), toasts
  via Sonner, cleans the URL.
- **Account switching / all-accounts view**: per-account visibility toggles +
  "All accounts" scope in a localStorage-backed feature hook (the repo has no
  Zustand or other state library — TanStack Query + native React state is the
  established pattern), deterministic per-account colors from the existing
  `EVENT_COLORS` palette; external events render read-only with account color
  + provider glyph.
  External event click → detail sheet variant: time, Join meeting, "Open in
  Google/Outlook", no edit/RSVP.
- `use-external-calendar-events` query hook (staleTime 60s) merged with
  `useCalendarEvents` output in `calendar-view.tsx`; external fetch failure
  degrades to internal events + per-account error badge (never a broken grid).
- Event form: legacy "Meet" button replaced with *Sync to account* select
  (None / connected accounts, default primary) + *Add Google Meet / Teams
  link* switch (label follows selected account's provider).
- Deleted: `/settings/integrations/calendar` page, the 4 `app/api/auth/calendar/*`
  routes, `lib/api/calendar-oauth.ts`, hooks `useCalendarConnections` /
  `useDisconnectCalendar` / `useSetPrimaryCalendar` / `useGoogleMeetStatus` /
  `useCreateMeetLink` (replaced by integrations hooks).

### Backend deletions (dead code after cutover)

`calendar-connections` module (controller/service/schemas/module),
`google-calendar` create-meet controller + its service methods and frontend
callers. HR interview sync (`hr/integrations/google-calendar`) stays — separate
surface, migrates to Composio later (documented follow-up).

## 4. Error Handling

- No `COMPOSIO_API_KEY` / auth config id → typed error → UI banner "Integration
  not configured" (never silent).
- Composio 4xx auth failure on a connection → mark `needs_reauth`, surface
  Reconnect in the sheet.
- External fetch timeout (per-account abort ~8s) → partial results + `errors[]`.
- Push failure after local create → local event kept, toast warns sync failed,
  mapping columns stay null (retry by editing).

## 5. Testing & Verification

- e2e specs: integrations controller — authn required, RBAC key enforced,
  A-cannot-touch-B ownership on finalize/delete/set-primary, cross-tenant
  isolation; calendar external-events — partial failure shape.
- Unit: IntegrationsService (mocked Composio SDK), external-event normalizers
  (Google/Outlook fixtures), dedupe logic.
- Green `build + lint + typecheck` in both apps; responsive 375/768/1280;
  `PAGES.md` updated. Live E2E: Outlook (managed) + Google via test-user org.

## 6. User setup prerequisites (one-time, ~10 min)

1. Create Composio account → API key → `COMPOSIO_API_KEY` (backend/.env).
2. Dashboard → Auth Configs: create **Outlook** (managed, one click) and
   **Google Calendar** (custom: existing `GOOGLE_CLIENT_ID/SECRET`; add redirect
   URI `https://backend.composio.dev/api/v3.1/toolkits/auth/callback` to the
   Google app; enable Google Calendar API; add own email as test user).
3. Put both auth config ids (`ac_…`) in backend/.env.

## 7. Out of scope (follow-ups)

Attendee free/busy overlay · Composio triggers (webhook push sync) · org-level
Slack connection + notifications · Gmail/Drive features · HR interview-sync
migration to Composio · multiple calendars per account (primary only in v1).
