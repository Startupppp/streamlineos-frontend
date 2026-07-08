# StreamlineOS PRD (v1 · Implementation-Grade)
## Website Feedback Widget — embeddable visual feedback that creates tickets (Feedbucket/Marker.io-class)

**Owner (PM)**: StreamlineOS Platform
**Owner (Eng)**: Projects / Collaboration
**Status**: Implementation-ready (grounded in current repo state, audited 2026-07-07)
**Scope**: Frontend `frontend/` + Backend `backend/` (NestJS, port 1500) + a standalone embeddable widget bundle
**Reference product**: Feedbucket (feedbucket.app) — script-embed feedback widget with annotated screenshots, auto-captured technical data, and one-click task creation in PM tools.

## UI/UX source of truth
- **Source of truth**: `PRD-ui-ux-system.md` / `UI-UX-SYSTEM.md`; canonical references `/signin`, `/signup`.
- **Copy-embed UX reference**: `frontend/features/surveys/builder/tabs/collectors-card.tsx` (clipboard copy + public link builder).
- **Inbox/detail UX reference**: projects tickets list + ticket detail; `components/ui/data-table.tsx`, `PageWrapper`, `EmptyState`.

---

## 1) Vision (why this exists)

Let any StreamlineOS org drop **one `<script>` tag** on their website / staging site so that clients and testers can leave **visual, contextual feedback** without signing up or installing anything. Each submission captures an **annotated screenshot** plus **automatic technical context** (page URL, browser, OS, screen/viewport, console logs) and lands in a StreamlineOS **Feedback inbox**, where the team triages it and **turns it into a project ticket** (StreamlineOS's native equivalent of Feedbucket's Jira/Asana integration). The public ingestion path must be secure-by-default: tenant is derived from the widget, every dashboard read/write re-asserts org access, and the public endpoint is domain-scoped, rate-limited, and payload-capped.

## 2) Current state (audit) — reuse, do not rebuild

Verified against the repo (2026-07-07). Building blocks that already exist:

- **Public, unauthenticated ingestion pattern**: `@Public()` decorator (`backend/src/common/auth/public.decorator.ts`) honored by `JwtAuthGuard`; `PublicController` (`backend/src/modules/public/public.controller.ts`) with `clientIp(req)` helper; `POST /public/intake/:projectId` (`IntakeService`) resolves `orgId` from the resource, Zod-validates the body, no session — the **direct architectural ancestor** for widget ingestion. Closest schema analog: `intakeItems` (`db/schema/projects/members.ts`) with `orgId`, `title`, `description`, `source`, `status`, `submitterEmail`, `linkedWorkItemId`.
- **Ticket creation**: `ProjectsTicketsService.createTicket(u, projectId, body)` + `createTicketSchema` (`modules/projects/dto/projects.schemas.ts`); attachments table `ticketAttachments` (`db/schema/projects/tasks.ts`) with `fileUrl/fileKey/fileSize/mimeType/clientVisible`. **Gap**: no session-less path — we add an internal `createFromFeedback(orgId, actingUserId, projectId, input)` that reuses the same insert logic.
- **File storage**: `StorageService.uploadFile(buffer, folder, fileName, mimeType) → { url, key, size, mimeType }` (Cloudflare R2), magic-byte validation (`file-signatures.ts`). **Gap**: `/storage/upload` is auth-gated — the public feedback endpoint uploads the screenshot **server-side** via `StorageService` (images only, size-capped) rather than exposing a public upload route.
- **Rate limiting**: Redis sliding-window `RateLimitService.check(tier, identifier)` (`common/ratelimit/rate-limit.service.ts`) with named `TIERS`. Add tier `"feedback:widget-submit"`.
- **RBAC**: catalog `modules/rbac/permissions.constants.ts` + `ROLE_DEFAULT_PERMISSIONS`; frontend union `frontend/lib/rbac/permissions.ts`; gates `useCan` / `<Can>` / `<RequireModule>`; `@RequireModule` + `ModuleGuard`; `enabledModules text[]` on `organizations`.
- **Notifications**: `NotificationsService.create({ orgId, userId, category, sourceModule, title, message, link, metadata })`.
- **Frontend plumbing**: add `"/feedback"` to `MIGRATED_PREFIXES` (`lib/api-client.ts`); module lives at `app/(authenticated)/feedback/`, `features/feedback/`, `hooks/api/feedback/`, `types/feedback.ts`.
- **Schema conventions**: `db/schema/feedback.ts` (+ export from barrel `db/schema/index.ts`); every table `orgId text NOT NULL REFERENCES organizations(id) ON DELETE CASCADE` + leading composite index; `serial` PK; soft-delete `deletedAt`; migration `0189_feedback_*.sql` (latest is `0188`).

Design decision recorded: **the widget "embed key" is a public per-widget identifier** (unguessable token like the whiteboard `share_token`, global-unique), **not** an `api_keys` secret. Reasoning: the key ships inside the customer's client-side HTML, so it cannot be secret; abuse is prevented by domain-allowlist + rate-limit + payload caps (the Sentry-DSN / Intercom-app-id model). We therefore do **not** build an `EmbedKeyAuthGuard` against `api_keys`; the public controller resolves the widget by `:publicKey` and derives `orgId` from its row (the `intake/:projectId` pattern).

## 3) Outcomes

### 3.1 User outcomes
- An org admin creates a **Widget** (name, target **project** for tickets, allowed domains, auto-create-ticket toggle), copies a one-line `<script>` snippet, and pastes it on their site.
- A visitor on that site sees a floating **Feedback** button, picks a type (Bug / Idea / Question / Other), types a message, **captures + (Phase 2) annotates a screenshot**, and submits — no login, no extension. Technical context is captured automatically.
- The team sees the submission in **`/feedback`**, opens it (screenshot + metadata + console logs), sets status/assignee, and **converts it to a project ticket** (or it was auto-created) — the ticket carries the message, metadata, and screenshot attachment, and links back to the feedback item.

### 3.2 Engineering outcomes
- Public ingestion is **`@Public()`, domain-scoped, rate-limited, payload-capped, dynamic-CORS**, returns generic errors, and never leaks internal ids; tenant is derived from the widget row.
- Every authenticated dashboard read/write **re-asserts `orgId` (BOLA)** in `FeedbackService`; widget/submission access is tenant-scoped and RBAC-gated + DataScope-aware.
- The embeddable widget is a **standalone, style-isolated (Shadow DOM)** bundle that does not depend on the Next.js app runtime and does not leak styles into or read secrets from the host page.
- Build + lint + typecheck green in both repos + the widget bundle; migration generated; e2e specs cover ingestion abuse (bad key / wrong origin / over-limit), cross-tenant isolation, and convert-to-ticket.

## 4) Data model (definitive)

New enums (feedback-domain-prefixed to avoid cross-domain collisions): `feedback_type = bug|idea|question|praise|other`, `feedback_status = open|in_progress|resolved|archived`, `feedback_priority = low|medium|high|urgent`.

**`feedback_widgets`** (`db/schema/feedback.ts`)
- `id serial PK`, `orgId` (FK cascade, indexed), `projectId int` (FK `projects`, nullable — where tickets are created), `name text NOT NULL`, `publicKey text NOT NULL UNIQUE` (global; `fb_` + 24-byte base64url), `allowedDomains text[] NOT NULL DEFAULT '{}'` (hostnames), `autoCreateTicket boolean NOT NULL DEFAULT false`, `defaultTicketType text NOT NULL DEFAULT 'BUG'`, `isActive boolean NOT NULL DEFAULT true`, `theme jsonb` (button color/position/label — display config only), `createdBy`, `createdAt`, `updatedAt`, `deletedAt`.
- Indexes: `(orgId, createdAt DESC)`, unique `publicKey`.

**`feedback_submissions`**
- `id serial PK`, `orgId` (FK cascade), `widgetId int NOT NULL` (FK cascade), `type feedback_type NOT NULL`, `status feedback_status NOT NULL DEFAULT 'open'`, `priority feedback_priority`, `message text NOT NULL`, `pageUrl text`, `screenshotUrl text`, `screenshotKey text`, `metadata jsonb` (whitelisted: `browser, browserVersion, os, device, screenW, screenH, viewportW, viewportH, userAgent, language, referrer`), `consoleLogs jsonb` (capped array of `{level,message,ts}`, ≤50 entries / ≤32 KB), `reporterName text`, `reporterEmail text`, `assigneeId text` (FK users, nullable), `linkedTicketId int` (FK `tickets`, nullable), `createdAt`, `updatedAt`, `deletedAt`.
- Indexes: `(orgId, widgetId, status, createdAt DESC)`, `(orgId, status, createdAt DESC)`, `(orgId, assigneeId)`.

**`feedback_comments`** (Phase 2, schema included now) — `id, orgId, submissionId (FK cascade), userId, content text, createdAt`; index `(orgId, submissionId, createdAt)`.

**`feedback_attachments`** (Phase 2, schema included now) — `id, orgId, submissionId (FK cascade), fileUrl, fileKey, fileName, fileSize, mimeType, createdAt` (extra files beyond the primary screenshot).

## 5) Security & abuse model (definitive — §20)

Public ingestion (`POST /public/feedback/:publicKey`) gates, in order:
1. **Widget resolution**: look up active, non-deleted widget by `publicKey`; unknown/inactive → generic `404`. `orgId` derived from the row (BOLA — never from client input).
2. **Domain allowlist**: derive the request origin host from `Origin` (fallback `Referer`); if `allowedDomains` is non-empty and the host is not in it → generic `403`. (Empty allowlist = unrestricted but still rate-limited; the create-widget UI warns and recommends setting domains.)
3. **Rate limit**: `RateLimitService.check("feedback:widget-submit", \`${widget.id}:${clientIp(req)}\`)` (default 10/min; dev ×10) → `429` with `Retry-After`.
4. **Payload caps (Zod)**: `message ≤ 5000`, `type ∈ enum`, `pageUrl` valid URL ≤ 2048, `reporterEmail` valid email (optional), `metadata` keys whitelisted, `consoleLogs` ≤ 50/≤32 KB, screenshot ≤ 5 MB and **image-only** (magic-byte validated) — reject **before** any R2 upload (denial-of-wallet).
5. **Dynamic CORS**: for the public feedback routes only, reflect `Access-Control-Allow-Origin` = the request `Origin` **iff** it passes the allowlist (else omit); handle `OPTIONS` preflight; `Access-Control-Allow-Methods: POST, OPTIONS`, `Access-Control-Allow-Headers: Content-Type`. Implemented as a scoped Nest middleware on `public/feedback/*` (global `enableCors` stays locked to `CORS_ORIGINS`).
6. **Output**: return `{ ok: true }` only — no ids, no org, no ticket data.
7. **Tenant isolation**: every authenticated `FeedbackService` method re-asserts `orgId` on the widget/submission row on reads AND writes; convert-to-ticket verifies the caller's project access via the existing project-access check.
8. **Attribution**: auto-created / converted tickets are attributed to `widget.createdBy` (a real org user) as `reporterId`/actor — no privilege escalation, no anonymous ticket authorship. `reporterEmail` is stored as data only, never used for auth.

## 6) Backend contract

**Schema**: `db/schema/feedback.ts` (tables + enums above), exported from `db/schema/index.ts`. Migration `0189_feedback_widgets_submissions.sql` (`db:generate`; apply pending TTY, consistent with other pending migrations).

**Module**: `modules/feedback/` — `FeedbackModule` (imports `ProjectsModule` for ticket creation, `StorageModule`, `NotificationsModule`), registered in `app.module.ts`. `FeedbackController` (authenticated), `FeedbackPublicController` (`@Public()`), `FeedbackService`, `FeedbackWidgetsService`, `feedback.schemas.ts` (Zod), `feedback-scope.ts` (DataScope), e2e spec.

**Authenticated** (`@Controller("feedback")`, `JwtAuthGuard + PermissionGuard + @RequireModule("feedback")`, every method an explicit `@RequirePermission`):
- `GET /feedback/widgets` (`feedback:widgets:view`) · `POST /feedback/widgets` (`feedback:widgets:create`, mints `publicKey`) · `GET|PATCH|DELETE /feedback/widgets/:widgetId` (`view|update|delete`, soft-delete) · `POST /feedback/widgets/:widgetId/rotate-key` (`feedback:widgets:manage`).
- `GET /feedback/submissions` (`feedback:submissions:view`, filters `widgetId,type,status,assigneeId,search`, paginated ≤100, DataScope) · `GET /feedback/submissions/:submissionId` (`view`) · `PATCH /feedback/submissions/:submissionId` (`update`: status/priority/assigneeId) · `DELETE /feedback/submissions/:submissionId` (`delete`, soft-delete) · `POST /feedback/submissions/:submissionId/convert-to-ticket` (`feedback:submissions:manage` → returns `{ ticketId }`, sets `linkedTicketId`, attaches screenshot).
- `GET /feedback/stats` (`feedback:submissions:view`) — counts by status/type for the dashboard.

**Public** (`@Public() @Controller("public/feedback")`, dynamic-CORS middleware, rate-limited):
- `POST /public/feedback/:publicKey` — `multipart/form-data`: fields `type, message, pageUrl, reporterName?, reporterEmail?, metadata (JSON), consoleLogs (JSON)` + optional `screenshot` (image). Runs the §5 gate chain; uploads screenshot to R2 (`feedback/screenshots/<orgId>/<uuid>`); inserts submission; if `widget.autoCreateTicket && widget.projectId` → `ProjectsTicketsService.createFromFeedback(...)` + link + attach screenshot; `NotificationsService.create` to `widget.createdBy` (+ future watchers); returns `{ ok: true }`.
- `OPTIONS /public/feedback/:publicKey` — preflight (handled by middleware).

**Ticket bridge**: add `ProjectsTicketsService.createFromFeedback(orgId, actingUserId, projectId, { title, description, type, screenshot })` — reuses the existing insert/watcher/activity path but takes `orgId` directly (no `CurrentUserContext`); `ProjectsModule` exports `ProjectsTicketsService`. Ticket: `title = "[Feedback] " + truncate(message,72)`, `description = message + metadata block + screenshot link`, `type = map(feedbackType)`, `reporterId = actingUserId`.

## 7) The embeddable widget (bundle)

- **Source**: `frontend/feedback-widget/src/` (`index.ts`, `ui.ts`, `screenshot.ts`, `metadata.ts`, `console-capture.ts`, `api.ts`). **Build**: `frontend/feedback-widget/build.mjs` (esbuild → IIFE, minified, target ES2019) → **`frontend/public/feedback-widget.js`**, served at `{APP_URL}/feedback-widget.js`. `pnpm build:widget` script; runs in CI before `next build`.
- **Embed snippet** (shown in the dashboard, copy-to-clipboard):
  ```html
  <script src="{APP_URL}/feedback-widget.js" data-key="fb_XXXXXXXX" async></script>
  ```
  The widget reads `data-key` from its own `<script>` tag; API base is baked from `WIDGET_API_URL` at build, overridable via `data-api`.
- **Isolation**: all UI mounted in a **Shadow DOM** root (`attachShadow`) with self-contained styles — zero leakage to/from the host page. Respects `prefers-reduced-motion`.
- **Behavior**: on load, `console-capture` wraps `console.log/info/warn/error` into a 50-entry ring buffer. Floating button → panel: type selector + message + **Capture screenshot** (`modern-screenshot` on `document.documentElement`; chosen over `html2canvas` for CSS fidelity + smaller footprint) → thumbnail (Phase 2: annotate: pen/rect/arrow on an overlay canvas) → collects `metadata` (UA/platform/screen/viewport/language/referrer/URL) → `POST` multipart to `{API}/public/feedback/{key}`. In-widget success/error state via `getErrorMessage`-equivalent minimal messaging (widget is standalone; no app imports). Fails safe: capture errors still allow text-only submission.

## 8) Frontend (dashboard)

- **Nav**: sidebar "Feedback" entry, gated `<RequireModule module="feedback">` + `useCan("feedback:submissions:view")`.
- **`/feedback`** (inbox): `PageWrapper` (no `backHref` — top-level), `DataTable` of submissions (thumbnail, type badge, message excerpt, widget, status, assignee, age), filter bar (widget / type / status / assignee / search), pagination; loading skeleton, themed empty state, error+retry.
- **`/feedback/[submissionId]`** (detail): screenshot (large, annotated), message, `type/status/priority/assignee` controls (autosave via `PATCH`, TanStack `useMutation`), metadata panel (browser/OS/screen/URL/referrer), console-logs (collapsible, monospace), reporter info, **Convert to ticket** button → on success shows the linked ticket link; comments (Phase 2). `backHref="/feedback"`.
- **`/feedback/widgets`**: widget list + **create/edit Sheet** (name, project `<Select>`, allowed-domains chips, auto-create toggle, default ticket type, theme). Each widget row: status, project, **Copy embed snippet** (reusing the surveys `collectors-card` clipboard pattern), rotate key, soft-delete. Empty/loading/error states.
- **Hooks**: `hooks/api/feedback/` — `useFeedbackWidgets`, `useCreateWidget`, `useUpdateWidget`, `useRotateWidgetKey`, `useFeedbackSubmissions`, `useSubmission`, `useUpdateSubmission`, `useConvertToTicket`, `useFeedbackStats` — query-key factory + calibrated `staleTime`; mutations invalidate by prefix. Types in `types/feedback.ts` mirroring the backend Zod contract exactly. Add `"/feedback"` to `MIGRATED_PREFIXES`.

## 9) Phasing

- **Phase 1 (this build — complete core loop)**: schema + migration; `feedback` module (widgets CRUD + rotate-key, public ingestion with full §5 gate chain, screenshot→R2, submissions list/detail/update/delete, auto-create + convert-to-ticket); RBAC `feedback:*` + entitlement + nav; dashboard (inbox + detail + widgets/copy-embed); the widget bundle (button → type + message → screenshot → metadata + console logs → submit, Shadow DOM). Fully functional and usable end-to-end.
- **Phase 2**: annotation drawing tools (pen/rect/arrow) + comments + `feedback_attachments` extra files + assignee notifications + status workflow polish + on-page "existing feedback" pins.
- **Phase 3**: screen-video recording (`MediaRecorder`/`getDisplayMedia`), guest collaboration portal, external integrations (Slack / generic webhook / Zapier) + two-way comment sync, AI triage/auto-tagging.

## 10) Non-goals (v1)
- Screen/video recording, on-page pins & guest portal, external PM integrations (Jira/Asana/Slack/GitHub) and two-way sync, Zapier/webhooks, AI triage, WordPress plugin, multi-language widget i18n, annotation drawing tools (Phase 2).

## 11) Definition of Done (v1)
Build ✓ · Lint ✓ · Types ✓ (both repos + widget bundle) · widget loads via Shadow DOM on an external page and submits successfully · public ingestion enforces domain-allowlist + rate-limit + payload caps + dynamic CORS + generic errors · tenant re-asserted on every dashboard read/write (BOLA) · screenshot → R2 · auto-create **and** convert-to-ticket working (ticket carries message + metadata + screenshot attachment + back-link) · RBAC gated + DataScope-scoped + entitlement · migration generated · states (loading/empty/error) present · responsive 375/768/1280 · e2e specs (ingestion abuse: bad key / wrong origin / over-limit; cross-tenant isolation; convert-to-ticket) + unit tests for the gate chain · `PAGES.md` updated.
