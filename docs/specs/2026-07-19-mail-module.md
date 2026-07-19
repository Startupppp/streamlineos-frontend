# Mail Module — Unified Inbox (Gmail + Outlook via Composio)

> Binding spec for the `/mail` module. Companion ground-truth file: `docs/specs/composio-mail-tools.md`
> (live-fetched Composio input schemas — arg names there are EXACT, never guessed).
> All work follows CLAUDE.md + UI-UX-SYSTEM.md. NO git commands anywhere. No code comments. Strict TS.

## Architecture

- **Live proxy, zero new tables.** Emails are NEVER stored in our DB (CLAUDE.md §6: Composio custodies tokens; we mirror only connected-account metadata). Reads hit Gmail/Outlook per connected account at request time with short-TTL Redis caching (`CacheService.cached`, 45–60s, keyed per account+folder+cursor+query). Sends/actions are pass-through + `audit_logs` entry. No migrations.
- **Multi-account:** a user may connect several Gmail + Outlook accounts (`user_integration_connections` already supports this). "All accounts" inbox = parallel per-account fetch (`Promise.all`), merge by date desc, opaque combined cursor.
- **Provider quirks (ground-truthed):**
  - Gmail folders = label filters on `GMAIL_FETCH_EMAILS` (`label_ids`: INBOX / SENT / TRASH / STARRED / UNREAD); pagination `page_token`; search via `query` (Gmail syntax).
  - Gmail read/star/archive are THREAD-level → `GMAIL_MODIFY_THREAD_LABELS` (add/remove UNREAD, STARRED, INBOX); trash is message-level `GMAIL_MOVE_TO_TRASH`.
  - Outlook list = `OUTLOOK_OUTLOOK_LIST_MESSAGES` (folder well-known names Inbox/SentItems/DeletedItems/Archive, `top`+`skip` paging, `conversationId` filter for threads, `select` to project incl. `body`); search = `OUTLOOK_OUTLOOK_SEARCH_MESSAGES`.
  - Outlook mark-read/star and HTML reply/multi-recipient send are NOT in the Composio catalog → use **Composio proxy execution** (raw Graph on the connected account): `PATCH /me/messages/{id}` `{isRead}` / `{flag:{flagStatus}}`, `POST /me/sendMail`, `POST /me/messages/{id}/reply`. Implement `ComposioGateway.executeProxy(connectedAccountId, method, endpoint, body?)` — check `@composio/core` typings for the proxy method (`tools.proxyExecute` or similar); if the SDK lacks it, call Composio REST `POST /api/v3/tools/execute/proxy` with `COMPOSIO_API_KEY`. NEVER use `OUTLOOK_OUTLOOK_UPDATE_EMAIL` (omitted fields are CLEARED).
  - Attachment download tools return a downloadable file/S3 URL → backend returns `{ downloadUrl, fileName }`.
- **Deferred (fast-follows, record in PAGES.md):** sending attachments, provider draft sync, snooze/schedule-send, AI triage labels, folder unread-count badges.

## Backend

### Integrations module extension (small)
- `IntegrationToolkit` union + Zod enum + `toToolkit()` gain `"gmail"`. Env: `COMPOSIO_AUTH_CONFIG_GMAIL` (optional, like the others).
- `initiate` accepts optional `returnPath` (Zod enum: `"/calendar" | "/mail"`) → callbackUrl `${APP_URL}${returnPath}` (default per toolkit: gmail→/mail, googlecalendar→/calendar, outlook→passed value or /calendar).
- Finalize account-email resolution: gmail → `GMAIL_GET_PROFILE` (`emailAddress`); outlook → `OUTLOOK_OUTLOOK_GET_PROFILE` (mail/userPrincipalName); keep calendar path for googlecalendar.
- `executeProxy` added to `composio.gateway.ts` (same error wrapping → `ComposioToolError`, auth-error regex → needs_reauth handling by callers).

### New `src/modules/mail/`
Files: `mail.module.ts` (imports IntegrationsModule), `mail.controller.ts` (`@Controller("mail")`, thin), `mail-accounts.service.ts` (mail-capable connections + BOLA assert), `mail.service.ts` (orchestration, merge, cursors, caching), `providers/gmail-mail.provider.ts`, `providers/outlook-mail.provider.ts`, `providers/mail-normalizers.ts` (+ Zod parse of provider payloads), `dto/mail-schemas.ts`, `mail-ai.service.ts` (wave 2), specs.

**BOLA rule:** every endpoint taking `accountId` calls `mailAccounts.assertOwnedConnection(orgId, userId, accountId)` → row from `user_integration_connections` where id+orgId+userId match AND toolkit ∈ (gmail, outlook), else 404. Never trust client accountId.

### Normalized contract (frontend mirrors exactly — `types/mail.ts`)
```ts
type MailProvider = "gmail" | "outlook";
type MailFolder = "inbox" | "sent" | "archive" | "trash" | "starred";
interface MailAccount { id: number; provider: MailProvider; accountEmail: string | null; accountLabel: string | null; status: "active" | "needs_reauth" | "disabled"; isPrimary: boolean; }
interface MailAddress { name: string | null; email: string; }
interface MailMessageSummary { id: string; threadId: string | null; accountId: number; provider: MailProvider; from: MailAddress; to: MailAddress[]; subject: string; snippet: string; date: string; isRead: boolean; isStarred: boolean; hasAttachments: boolean; }
interface MailAttachment { id: string; fileName: string; mimeType: string; sizeBytes: number | null; }
interface MailMessageDetail extends MailMessageSummary { cc: MailAddress[]; bodyHtml: string | null; bodyText: string | null; attachments: MailAttachment[]; }
interface MailListResponse { messages: MailMessageSummary[]; nextCursor: string | null; accountErrors: { accountId: number; accountEmail: string | null; message: string }[]; }
```
Opaque cursor = base64url JSON `{ [accountId]: providerCursor }` (gmail pageToken / outlook skip int). Snippet: strip/clamp ≤160 chars. Dates ISO. Subject fallback `"(no subject)"`.

### Endpoints (all `@UseGuards(JwtAuthGuard, PermissionGuard)`)
| Endpoint | Permission | Notes |
|---|---|---|
| GET `/mail/accounts` | `mail:inbox:view` | user's gmail/outlook connections |
| GET `/mail/messages?folder&accountId(all\|id)&q&cursor&limit≤50` | `mail:inbox:view` | folder default inbox; `q` → Gmail query / Outlook SEARCH_MESSAGES; cached 45s (skip cache when `q`) |
| GET `/mail/messages/:messageId?accountId` | `mail:inbox:view` | full detail incl. sanit-ready bodyHtml + attachments (outlook: GET_MESSAGE + LIST_OUTLOOK_ATTACHMENTS in parallel) |
| GET `/mail/threads/:threadId?accountId` | `mail:inbox:view` | gmail FETCH_MESSAGE_BY_THREAD_ID; outlook LIST_MESSAGES{conversationId, select incl body} asc |
| POST `/mail/send` | `mail:messages:send` | body `{accountId,to[]≥1,cc?,bcc?,subject,bodyHtml}` (all emails Zod `.email()`, arrays ≤25, subject ≤500, body ≤100k). gmail: GMAIL_SEND_EMAIL (recipient_email=to[0], extra_recipients=rest, is_html:true); outlook: proxy `/me/sendMail`. audit_logs `mail.send`. Throttler: 30/min/user |
| POST `/mail/reply` | `mail:messages:send` | `{accountId,messageId,threadId?,bodyHtml,cc?}` gmail REPLY_TO_THREAD (is_html); outlook proxy reply. audit + throttle same |
| POST `/mail/messages/:messageId/actions` | `mail:messages:manage` | `{accountId, action: markRead\|markUnread\|star\|unstar\|archive\|trash, threadId?}` — gmail needs threadId for label ops (400 if missing), trash by messageId; outlook proxy PATCH / MOVE_MESSAGE(archive\|deleteditems). Invalidate that account's list cache keys |
| GET `/mail/messages/:messageId/attachments/:attachmentId?accountId&fileName` | `mail:inbox:view` | returns `{downloadUrl, fileName}` |
| POST `/mail/ai/inbox-summary` | `mail:ai:use` | wave 2 — see AI |
| POST `/mail/ai/thread-summary` | `mail:ai:use` | wave 2 |
| POST `/mail/ai/draft` | `mail:ai:use` | wave 2 |

On `ComposioToolError.isAuthError`: set connection `needs_reauth` (calendar pattern), surface as accountErrors (list) or 424-style friendly failure (detail/mutations) — messages must be human-readable, never raw provider JSON.

### RBAC + module registration
- Catalog (`permissions.constants.ts`): `mail:inbox:view`, `mail:messages:send`, `mail:messages:manage`, `mail:ai:use` (+ descriptions). `ROLE_DEFAULT_PERMISSIONS`: grant all four to the same roles that get `calendar`-level personal-productivity keys (mirror calendar/chat defaults; ai key mirrors other `*:ai:use` role defaults). Org owners bypass anyway.
- Module key `"mail"`: register wherever module enablement is cataloged (EntitlementsService / modules catalog — mirror how `kb` is treated as core-enabled; AVOID the KB gotcha: do not add a ModuleGuard that contradicts entitlements). Frontend `MODULE_KEY_MAP` gets `mail: "MAIL"` (match the exact casing convention found in that map).
- No plan `assertWithinLimit` (no rows created). No `bumpPermissionsVersion` (no role tables mutated).

### Tests (per CLAUDE.md §27, mirror existing controller spec style)
- `mail.controller.spec.ts` e2e-style: 401 unauthed; 403 without permission; BOLA — accountId belonging to another user/org → 404; send validation (bad email 400); actions gmail-without-threadId 400.
- `mail-normalizers.spec.ts`: gmail payload → summary/detail; outlook payload → summary/detail; cursor encode/decode roundtrip; merge ordering.

## Backend AI (wave 2)
- `mail-ai.service.ts` via `AiGatewayService.invokeStructured`, tier fast, `redact` default, short-circuit before provider call when zero messages. Costs in `ai-cost-catalog.ts`: `mail.inbox-summary: 2`, `mail.thread-summary: 1`, `mail.draft: 1`.
- inbox-summary: fetch ≤25 inbox summaries (metadata only, snippet ≤160) → `{ summary, highlights: [{subject, fromEmail, reason}], actionItems: string[] }`.
- thread-summary: thread bodies text-stripped, each message ≤1500 chars, ≤10 messages → `{ summary, actionItems, suggestedReply }`.
- draft: `{ mode: compose|reply, instruction ≤2000, accountId?, threadId? }` (reply mode includes thread context, same caps) → `{ subject, bodyHtml }` (simple semantic HTML only: p/br/ul/li).
- Ask OS: new `mail-copilot-tools.ts` in the existing tool-builder pattern (`buildTools(ctx)` + `ToolAccessService.denyReason("mail:inbox:view")`): `listRecentEmails` (metadata, ≤10), `summarizeMailThread`, and `sendMailFromAccount` → `confirmation.propose({action:"mail.send"})` (requiresConfirmation card). Register in `ChatAssistantService` merge + `CONFIRMABLE_ACTIONS` + `/chat/confirm` switch (execute via MailService using the user's primary/named mail account). NOTE: files under `modules/chat/` have uncommitted sibling work — mail tools live in `modules/ai/`, the controller switch edit is additive; do not touch `modules/chat/**`.

## Frontend

### Routes & registration
- `app/(authenticated)/mail/`: `layout.tsx` (`await requireSession()` + `<RequireModule module="mail">`), `page.tsx`, `loading.tsx` (skeleton Xerox of three-pane), `error.tsx`.
- `sidebar-nav-items.ts`: `ProductKey` + `"mail"`; `MODULE_KEY_MAP`; `PRODUCT_DEFINITIONS` `{key:"mail", label:"Mail", href:"/mail", icon: Inbox}`; `PRODUCT_DESCRIPTIONS`; `MODULE_ACCENTS` (sky-600); `PRODUCT_NAV_GROUP_LABELS` `mail:["Mail"]`; `NAV_GROUPS` group `Mail` → routes Inbox `/mail` (`requiredPermission:"mail:inbox:view"`, `module:"mail"`); `getProductFromPathname` `/mail`.
- `hooks/api/integrations.ts`: toolkit union + `"gmail"`; initiate mutation passes `returnPath`.
- Frontend `PermissionKey` union: add the 4 keys.
- `lib/query-keys.ts` `mail` namespace: `all`, `accounts()`, `messages(params)`, `thread(accountId, threadId)`, `message(accountId, messageId)`.

### `hooks/api/mail.ts` (chat.ts conventions; every mutation has mutationKey, every query staleTime)
- `useMailAccounts` (5m) · `useMailMessages({folder,accountId,q})` `useInfiniteQuery` cursor, 30s, `keepPreviousData` · `useMailThread` (2m) · `useMailMessage` (2m) · `useSendMail` / `useReplyMail` (invalidate list) · `useMailAction` — OPTIMISTIC per §11: cancel + snapshot the exact infinite-list cache, patch isRead/isStarred or remove row (archive/trash), rollback onError, reconcile onSettled · AI mutations `useMailInboxSummary`, `useMailThreadSummary`, `useMailAiDraft`.
- All errors surfaced via `getErrorMessage`; 402 → quota state (AiActionsMenu handles internally).

### `features/mail/` (three-pane, chat-shell pattern; barrel `index.ts`)
- `mail-shell.tsx` — pane orchestration + mobile single-pane switching (`hidden md:flex`), NO PageWrapper (chat precedent) but compact header row with title, account switcher Select, "Summarize inbox" AI button, Compose primary button, accounts (settings) trigger.
- `mail-list-pane.tsx` — folder nav (Inbox/Starred/Sent/Archive/Trash — lucide static icons), `SearchInput` debounced ≥300ms, account filter, virtual-less infinite list (chat pattern), rows: sender, subject+snippet single-line truncate, date (`format-utils`), unread = `font-semibold` + `bg-primary` dot (theme tokens, NOT literal blue), star toggle + hover quick-actions (archive/trash) via `AnimatedIconButton`/named forwardRef sub-components, `EmptyState illustrationPreset="mail"` fill, skeleton rows, `accountErrors` → per-account reauth banner (Connect X pattern).
- `mail-reading-pane.tsx` — thread view: sender/recipients (`getUserDisplayName` NOT applicable — external senders: show `name ?? email`), date, collapsible earlier messages, sanitized HTML body (see below), attachments chips → download via endpoint, actions toolbar (reply, archive, trash, star, unread) + `AiActionsMenu` (Summarize thread; Draft reply → `onApply` opens composer prefilled). Empty selection state fills pane.
- `mail-compose-sheet.tsx` + `mail-compose-schema.ts` — Sheet (`p-0 flex flex-col gap-0 sm:max-w-2xl`, 3-zone), RHF+Zod (`z.email()` chips for to/cc/bcc — reuse an existing chips/multi-email input if one exists in the repo, else a minimal named component here; from-account Select; subject; `TiptapEditor output="html"` body), footer `LoadingButton` Send; "Write with AI" ghost button → instruction popover → `useMailAiDraft` → insert into editor. Reply mode = prefilled recipients/subject `Re:` + threadId.
- `mail-accounts-sheet.tsx` — CalendarAccountsSheet pattern: list connections (status badge, primary star, disconnect, set-primary), Connect Gmail / Connect Outlook via `useInitiateIntegrationConnection({toolkit, returnPath:"/mail"})` → `window.location.assign`; gated `useCan("integrations:connections:manage")`.
- `mail-finalize-handler` — on `/mail` mount with `?connectedAccountId=` → finalize mutation (StrictMode-guarded ref per CLAUDE.md §10), toast, strip param (calendar-view precedent).
- `use-mail-selection.ts` — selected account/folder/message local state (Zustand only if genuinely needed across panes; else lifted state in shell).
- **HTML sanitization:** check deps for an existing sanitizer (`dompurify`/`isomorphic-dompurify`/`sanitize-html`); reuse if present, else add `dompurify` + `@types/dompurify`. Wrapper `mail-html-viewer.tsx`: sanitize (strip script/style/on*), remote images BLOCKED by default → placeholder + "Load remote images" chip toggle (per-render state), links `target="_blank" rel="noopener noreferrer"`.
- Zero-accounts state: full-pane `EmptyState` "Connect your email" + CTA opening accounts sheet (never broken data — CLAUDE.md §15).

### UI conformance
UI-UX-SYSTEM.md throughout: h-9 field controls, `FILTER_SELECT_TRIGGER` on selects, dropdown `min-w-[var(--radix-select-trigger-width)]`, semantic tokens only (`bg-card`, `border-border`, `bg-primary/10` tints; dark-mode pairings for any status tints), 150–250ms motion + `useReducedMotion`, animated icons on interactive surfaces (verify each export exists in `@animateicons/react`; static lucide fallback), Sonner toasts, `loading.tsx` = skeleton Xerox, responsive 375/768/1280 (mobile: list⇄reading single pane).

## Validation gates (each wave)
- Backend: `pnpm -C backend exec tsc -p tsconfig.build.json --noEmit` (NODE_OPTIONS=--max-old-space-size=8192) + new jest specs green (`pnpm -C backend exec jest mail`). Backend lint is broken repo-wide — skip lint, use typecheck+jest.
- Frontend: `pnpm -C frontend exec tsc --noEmit` + `pnpm -C frontend lint` (scoped if slow). Full `next build` once at the end (serialize with sibling sessions).
- PAGES.md: add `/mail` row when done. Update this spec if reality diverges (living doc).

## Wave plan
1. **Wave 1 (parallel):** BE-core (integrations ext + mail module + RBAC + tests) ∥ FE-foundation (registration + hooks + routes + shell + list + accounts sheet + finalize).
2. **Wave 2 (parallel):** BE-AI (mail-ai + cost catalog + copilot tools + confirm) ∥ FE-experience (reading pane + compose + AI UI + polish + loading/error states).
3. Gates + PAGES.md + ops notes (Composio dashboard: create Gmail auth config incl. gmail.modify scope, add Mail.Read/Mail.Send/Mail.ReadWrite scopes to Outlook auth config; reconnects needed; `nest build` + restart — backend runs from dist).
