# Chat product contract (CHAT-001)

Date: 2026-10-20 · Status: draft for approval

Sources: [reset plan](2026-10-20-product-chat-reset-plan.md), [ADR-0001](../../adr/0001-chat-realtime-is-server-published.md), [CONTEXT.md](../../../CONTEXT.md), [suite competitor analysis](../knowledge-base/2026-10-20-streamlineos-suite-competitor-analysis.md) (Slack/Teams/Meet/Google rows: integrate conferencing, own record-aware messaging). Competitor detail lives there, not here.

## Role

- Chat is a universal module in the Home shell, next to Inbox, Mail and Calendar.
- One Chat product and one conversation graph. Modules embed or deep-link; none builds its own messaging.
- Chat does not build video, email hosting or office infrastructure.
- Not part of Chat: Knowledge Ask Chat (`/knowledge/chat`), Ask OS, public live chat (`/live-chat/[orgId]`).
- This release does not claim Slack/Teams replacement. Parity needs governed guests, retention/legal hold, audit export, admin, imports, message recovery, mobile notifications. These are GA blockers for that claim.

## Scope

### Retain

- DMs, public/private/group channels, threads, mentions, reactions, attachments, pins.
- Notifications, mute, realtime and offline delivery, deep links.
- Project-linked Chat (Build embed), invitation join flow, Meet/Teams join actions.

### Simplify

- Sidebar: Starred plus one Conversations list, URL-backed All/Unread/DMs/Channels filters, Archive as secondary destination.
- One search dialog (messages, channels, people). One New DM/Channel dialog owner.
- Message actions: Reply, React, More.
- Details own members, pins, shared files, notification settings. Saved is user-global. AI summarize lives in conversation overflow.
- One ChatShell. `/chat/channels` redirects to unified search.

### Remove

- Collapsible header chrome hiding primary controls, sidebar search scopes, exposed markdown button strip, hover-only delete submenu, manual "load older" controls.
- Ephemeral Huddle chat, client Huddle publish rights, "kick from meeting", provider-attendance and participant-cap claims.
- Dead and orphaned wiring once callers migrate.

### Deferred

- New CRM/HR/Support/Finance/Inventory embeds.
- Transcript/recording ingestion, AI meeting notes, entity-action frameworks, notification matrices.

## Decisions

### Realtime (ADR-0001)

- Clients never publish to Ably. Chat channel tokens grant `subscribe` + `presence`. Huddle and notification channels grant `subscribe`.
- Every chat event goes through one chat events module (`emit(event)`), validated by a per-kind zod schema.
- Typing is Ably presence on the conversation channel, not a chat event. Identity is the token `clientId`; display names come from the member list.
- Durable events publish after commit, outbox is a backstop, clients refetch on reconnect. Correctness must not depend on the outbox worker running.

### Huddles

- A Huddle is an external Google Meet or Microsoft Teams meeting started from a conversation. StreamlineOS stores join link, starter, provider, invites and active status. The provider owns chat, video, recording and moderation.
- Provider comes from the starter's primary Composio calendar connection across `googlecalendar` and `outlook`.
  - Both connected: `isPrimary` chooses. Tie-break: user scope before org scope, then `createdAt`, then stable ID; log the decision.
  - One active account: that account.
  - None usable: 412 with an action that opens Calendar accounts.
  - Reauth needed: 412 with reconnect copy.
  - Provider or Composio outage: retryable 503.
- Never fall back to another provider after the chosen connection fails.
- Google creates Meet. Outlook creates Teams for Business after capability preflight; Skype-only or conference-disabled calendars return 412.
- A successful start always returns a usable join URL.
- Start is idempotent: one active Huddle per org and channel, enforced in the database.
- Legacy rows with only a URL stay valid and render as "External meeting".
- Fan-out and notifications run after commit; no tenant transaction spans a provider call.

### Linked records

- A linked record is referenced by type and id and resolved through an entity adapter that checks access.
- A record conversation embeds on its module page (Build project/ticket today; CRM client/deal/lead via links).
- Linking never grants record access. Effective visibility is conversation permission intersected with record permission at read time.
- Revocation removes previews, snippets, notifications, search hits, AI citations and exports. The conversation stays.
- HR, Finance and sensitive Support records never expose titles or snippets to members without source access.
- Every active member reaches `/chat`. Reads, mutations, search, AI, exports and admin still enforce exact permissions.

## Release gates

- Message-send success >= 99.9%; p95 send-to-visible < 1s with healthy realtime.
- Zero message loss or duplication across reconnect cases.
- Known-message search success >= 95%.
- Healthy-provider Huddle creation >= 99%, p95 < 5s, usable URL.
- No unreconciled provider event older than 24h.
- Zero unauthorized metadata disclosure. Detail revocation immediate; search and AI within 60s.
- WCAG 2.2 AA on core flows. Pilot task completion without help >= 90%.
- Rollback a cohort on: cross-tenant or record leakage, message loss/duplication, broken legacy links, provider cleanup backlog past SLO, material task-completion regression.

## Acceptance criteria

### CHAT-001 Contract and baseline

- [ ] This file is approved and linked from the reset plan.
- [ ] Baseline values for every release-gate metric are recorded before any behaviour change.

### CHAT-002 Huddle data model

- [ ] `chat_huddles` has nullable `meeting_provider`, provider event id and integration connection id.
- [ ] A partial unique index allows one active Huddle per org and channel.
- [ ] Migration has a journal entry and rollback; legacy rows keep null provider and still load.
- [ ] A spec proves a second active insert for the same org and channel fails.

### CHAT-003 Provider selection

- [ ] Resolver reads `googlecalendar` and `outlook` together.
- [ ] Tests cover: Google only, Outlook only, both primary, one primary, user vs org scope, no account.
- [ ] Ordering is `isPrimary`, `createdAt`, stable ID, user scope first; the decision is logged without tokens.
- [ ] No fallback to the other provider after the chosen one fails.

### CHAT-004 Link minting

- [ ] Google returns provider event id and Meet URL.
- [ ] Outlook returns provider event id and Teams URL after preflight.
- [ ] Skype-only or conference-disabled Outlook returns 412, not a plain event.
- [ ] No usable account returns 412 with Calendar accounts action; reauth returns 412 with reconnect copy.
- [ ] Composio outage returns 503 marked retryable.
- [ ] Pending Teams URL is polled within a bound; success responses never lack a URL.

### CHAT-005 Idempotent start

- [ ] Two concurrent starts on one channel yield one active Huddle and the same response.
- [ ] The race loser's provider event is deleted or queued for reconciliation; a test asserts one of the two.
- [ ] Retrying a start after a network failure creates no second provider event.

### CHAT-006 Lifecycle and fan-out

- [ ] The internal calendar event stores the provider identity.
- [ ] End and cancel update the provider event where supported; UI claims "ended" only on provider confirmation.
- [ ] Ably publish and notifications run after commit; a test shows no publish on rollback.
- [ ] No provider call runs inside a tenant transaction.

### CHAT-007 Contracts

- [ ] Backend DTO, OpenAPI, generated contracts, frontend Zod and `types/chat.ts` carry provider fields additively.
- [ ] `meetingProvider: null` parses on the frontend.
- [ ] Response-contract and parity gates pass.

### CHAT-008 Server-side Huddle validation

- [ ] Invite rejects users who are not active in the organization or channel.
- [ ] Heartbeat rejects when no active Huddle, no active membership, or no open participant row.
- [ ] Join, leave and end enforce tenant and membership; each writes an audit entry with no token or join URL.
- [ ] One backend entitlement source gates Huddle creation and group invites.

### CHAT-009 Message reliability

- [ ] Send retry and offline queue deliver each message exactly once after reconnect.
- [ ] After realtime reconnect the client refetches and shows no gap and no duplicate.
- [ ] Read marker and unread counts agree across list, sidebar and inbox after send, receive, and reconnect.
- [ ] Typing shows only for other members, from presence, and clears on leave.

### CHAT-010 URL and history

- [ ] `channel`, `message`, `inbox`, `dm=1`, `joinHuddle=1` follow the plan's URL contract.
- [ ] `message` is ignored without its channel and cleared on channel change.
- [ ] Action params are consumed once and removed without losing other params.
- [ ] Selecting a conversation pushes history; filter and panel changes replace it.
- [ ] Browser back/forward and mobile Back restore the prior conversation or the list.
- [ ] No effect mirrors URL state into component state.

### CHAT-011 Exact-message context

- [ ] An endpoint returns a bounded window around a message id after checking channel membership.
- [ ] A message outside loaded pages opens and scrolls into view from a link.
- [ ] Non-member, wrong-org and deleted-message requests return no content (403/404 per contract).
- [ ] Saved-message and search-result clicks use this path.

### CHAT-012 Unified search

- [ ] One dialog searches messages, channels and people; the sidebar has no search scopes.
- [ ] Message hits only come from channels the user can read.
- [ ] Selecting a public channel the user is not in joins it, then opens it.
- [ ] Selecting a person opens or creates the DM.

### CHAT-013 New dialog and sidebar

- [ ] Exactly one New DM/Channel dialog is mounted; home, sidebar, mobile and quick-create open it.
- [ ] Sidebar shows Starred and one Conversations list with URL-backed All/Unread/DMs/Channels; Archive is separate.
- [ ] The four accordion sections and compact duplicate action rail are gone.

### CHAT-014 Shell and redirect

- [ ] `/chat` renders one ChatShell on desktop and mobile; conversations are selected with `?channel=`, `?message=`, `?inbox=` and action params `dm=1`, `joinHuddle=1`, not path segments.
- [ ] `/chat/channels` redirects via `next.config` to the unified channel-search state on `/chat`.
- [ ] Channel links (`/chat?channel=`), message links (`/chat?channel=&message=`) and invite links (`/chat/invite/[inviteToken]`) keep working.
- [ ] The redirect has a documented deprecation window.

### CHAT-015 Page states

- [ ] `/chat` uses PageState with a layout-matching skeleton.
- [ ] Loading, denied, error and empty states each render distinctly.
- [ ] A failed read shows an error, not an empty state.

### CHAT-016 Message actions

- [ ] Hover and focus show Reply and React; More holds save, pin, copy, link, forward, edit, delete and permission-gated entity actions.
- [ ] All actions work by keyboard and on touch without hover.
- [ ] Icon buttons have aria-labels. Entity actions appear only with the module permission.

### CHAT-017 Lifecycle confirmations

- [ ] Delete message, leave, archive, hide and member removal use `ConfirmDialog destructive`.
- [ ] Cancel performs no mutation; confirm performs exactly one.
- [ ] Confirm copy names the target.

### CHAT-018 Composer and history

- [ ] Composer has an accessible label; no exposed markdown button strip.
- [ ] Older messages load on scroll with no "Load more" or "load older" control.
- [ ] Thread replies load the same way.

### CHAT-019 Details and Saved

- [ ] Details own members, pins, shared files and notification settings.
- [ ] Saved is user-global and each item jumps to its exact message.
- [ ] AI summarize is in conversation overflow only.

### CHAT-020 Huddle chat removal

- [ ] `huddle-chat-panel.tsx` is deleted with no remaining importer.
- [ ] Ably capability for huddle and notification channels is `subscribe` only; chat channels are `subscribe` + `presence`.
- [ ] A test shows a client publish attempt on each is rejected.

### CHAT-021 Provider-aware UI

- [ ] UI shows Google Meet or Teams join, connect, or reconnect states from the provider field; null shows "External meeting".
- [ ] No kick, end-meeting, provider attendance or two-person cap claims remain.
- [ ] Any in-app roster is labelled "Joined through StreamlineOS".

### CHAT-022 Cross-module boundaries

- [ ] A conversation linked to a record shows preview and snippets only when the viewer passes the record check.
- [ ] After record access is revoked, search, notifications, AI citations and exports omit that record's metadata within the gate windows.
- [ ] Build embed uses the canonical Chat backend; no new module-local chat screen or table exists.
- [ ] Knowledge Ask Chat, Ask OS and live chat are not reachable from employee Chat navigation.

### CHAT-023 Tests

- [ ] Backend specs cover the CHAT-002..008 matrix, tenant isolation, wire parity and Ably capability.
- [ ] Frontend specs cover URL, search, dialog ownership, redirect, PageState, confirmations, actions, provider copy, removed UI.
- [ ] Accessibility checks cover keyboard, focus, screen reader and touch on core flows.
- [ ] Mocked-provider tests are mandatory; live Meet/Teams smoke runs only with approved credentials.

### CHAT-024 Quality gates

- [ ] Backend: focused Jest, typecheck, lint, OpenAPI, migration, contract, tenant, idempotency and Ably gates pass.
- [ ] Frontend: focused Jest, type-check, lint, response-contract, permission, PageState, dead-code, file-size and route-bundle gates pass.
- [ ] Browser journeys pass at 375, 768 and 1280 widths, including offline/reconnect.

### CHAT-025 Rollout

- [ ] Order: baseline telemetry, additive contracts and migration, internal cohort, agency/service pilots, staged release, GA.
- [ ] Each stage has a metric threshold and rollback trigger from Release gates.
- [ ] Support notes exist for every removed control.
- [ ] GA is marked only when every release gate holds for a full cohort period.
