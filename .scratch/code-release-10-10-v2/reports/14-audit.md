# Ticket 14 — Inbox and Mail — current-head audit

**Date:** 2026-09-03
**Backend head:** `45f8a2e99` on `release/code-10-10-v2`
**Frontend head:** `7469d2789` on `release/code-10-10-v2`
**Prior report:** none. This reconstructs the evidence from scratch.

Acceptance criteria under audit (verbatim from `architecture-refactor/PRD-10-10-CODE-RELEASE-TODO.md` §10.14, lines 413–414):

- **PRD-C130** — Queries/cache/workers: verify indexed conversation ordering/search/unread, incremental sync, idempotent send/receive, bounce/retry/DLQ and invalidation of list/thread/count keys.
- **PRD-C131** — Frontend/TanStack/tests: verify infinite lists, thread hydration, optimistic read/label rollback, compose/send states, offline/reconnect, sanitization and account-revocation E2E.

---

## 1. What I read — the corpus, with numbers

### Backend (`streamlineos-backend`)

| Surface | Count | Detail |
|---|---|---|
| `src/modules/mail/` production files | **14** (2,634 LOC) | controller, module, 5 services, 2 DTO files, 4 provider files, 1 cursor-signing util |
| `src/modules/mail/` spec files | **14** (2,312 LOC) | 113 test cases |
| HTTP routes on `MailController` | **11** | 5 GET, 6 POST — enumerated below |
| Unified-inbox routes (`src/me/inbox.controller.ts`) | **4** | `GET /me/inbox`, `/count`, `/unified`, `/unified/count` |
| Mail tables declared | **2** | `mail_message_metadata` (16 cols), `mail_sync_checkpoints` (6 cols) — 87 LOC of schema |
| Indexes on `mail_message_metadata` (live catalog) | **9** | verified against `scratch_head_1010` |
| Supporting services read in full | **5** | `UnifiedInboxService` (470 LOC), `CronMailRetentionService` (108), `IdempotencyInterceptor` (231), `TenantContextInterceptor`, `MailAccountsService` |
| SECURITY DEFINER search function | **1** | `app.search_mail_message_ids(text,int,text,int)` — read its live `pg_get_functiondef` |
| Migration read in full | **1** | `migrations/1022_t29_mail_metadata_search_and_keyset.sql` (135 lines incl. its measurement notes) |

The 11 `MailController` routes:

```
GET  /mail/accounts                                        mail:inbox:view
GET  /mail/messages                                        mail:inbox:view
GET  /mail/messages/:messageId                             mail:inbox:view
GET  /mail/threads/:threadId                               mail:inbox:view
GET  /mail/messages/:messageId/attachments/:attachmentId   mail:inbox:view
POST /mail/send                        @Idempotent + RL    mail:messages:send
POST /mail/reply                       @Idempotent + RL    mail:messages:send
POST /mail/messages/:messageId/actions                     mail:messages:manage
POST /mail/ai/inbox-summary                                mail:ai:use
POST /mail/ai/thread-summary                               mail:ai:use
POST /mail/ai/draft                                        mail:ai:use
```

### Frontend (`streamlineos-frontend/frontend`)

| Surface | Count | Detail |
|---|---|---|
| `features/mail/` production files | **24** (4,295 LOC) | shell, list pane, virtual list, reading pane, compose sheet, accounts sheet, HTML viewer, draft storage, AI toolbar, thread seed |
| `features/mail/` test files | **10** (58 cases) | |
| `features/inbox/` production files | **6** (886 LOC) | |
| `features/inbox/` test files | **4** (19 cases) | |
| Hooks / types read | **5 files** (530 LOC) | `hooks/api/mail.ts`, `hooks/api/mail-action-cache.ts`, `hooks/api/inbox.ts`, `types/mail.ts`, `types/inbox.ts` |
| Hook test files | **3** (20 cases) | `hooks/api/mail.test.ts`, `mail-send-idempotency`, `mail-send-invalidation` |
| Routes | **2** | `app/(authenticated)/mail/` (page/layout/loading/error), `app/(authenticated)/inbox/` (page/loading/error) |
| React Query hooks in the mail surface | **9** | 4 queries, 5 mutations |
| Query-key factories | **6** | `queryKeys.mail.{all,accounts,messages,thread,message}`, `queryKeys.inbox.{all,list,count,unified}` |

### Test runs actually executed

```
backend:  npx jest --runInBand --testPathPattern="src/modules/mail/"
          14 suites passed / 14 · 113 tests passed / 113 · 5.2 s
frontend: npx jest --runInBand --testPathPattern="(features/mail/|features/inbox/|hooks/api/mail)"
          17 suites passed / 17 · 102 tests passed / 102 · 4.6 s
```

Every one of these 215 tests is a unit/jsdom test with a mocked DB or a mocked `apiClient`. **Zero of them touch a database, a provider, or a browser.**

### Gates actually executed (all cheap, all run)

| Gate | Repo | Exit | Mail-relevant output |
|---|---|---|---|
| `check:unbounded-reads` | backend | 0 | `/mail/mail-accounts.service.ts` classified FALSE-POSITIVE; 3 ACTIONABLE instances remain repo-wide, none in mail |
| `check:n1-growing-loops` | backend | 0 | 97 sites against a ratchet of 102; none in mail |
| `check:cache-invalidation` | backend | 0 | LOW-only |
| `check:cache-key-shapes` | backend | 0 | clean |
| `check:idempotent-commands` | backend | 0 | every in-scope mutating handler carries `@Idempotent` |
| `check:conflict-targets` | backend | 0 | no uninferable ON CONFLICT arbiter |
| `check:retention-coverage` | backend | 0 | `mail_message_metadata` → `CronMailRetentionService`, 365-day |
| `check:fire-and-forget` | backend | 0 | tier 1 clean |
| `check:transaction-callbacks` | backend | 0 | clean |
| `check:query-scope` | frontend | 0 | 5,367 files scanned, clean |
| `check:gated-reads` | frontend | 0 | clean |
| `check:empty-states` | frontend | 0 | 3,858 files scanned, clean |
| `check:query-signal` | frontend | 0 | 1,056 `queryFn` blocks / 426 files, clean |
| `check:permission-binding` | frontend | 0 | 2,384 bindings checked |
| `check:route-access-contract` | frontend | 0 | clean |

**No gate flags the mail module.** Every finding below is one the gate set does not model.

### Database work actually performed

Against local `scratch_head_1010` (owner + non-owner `streamline_app`):

- Read the live `\d mail_message_metadata` and `\d`-equivalent for `mail_sync_checkpoints`. **Declaration and live catalog agree** (9 indexes, 2 FKs, RLS policy `tenant_isolation` present, `relforcerowsecurity = false`).
- Read `pg_get_functiondef(app.search_mail_message_ids)` and `pg_get_expr(indexprs)` for `idx_mail_metadata_search_trgm`.
- Built a **200,000-row faithful reproduction** in a private schema `audit14` (owner-created, RLS enabled not forced, all 5 production indexes, the SECURITY DEFINER function reproduced verbatim, 180k rows in the measured tenant and 20k in a second tenant), ran `EXPLAIN (ANALYZE, BUFFERS)` as `streamline_app` with the tenant GUC set, warm cache, then **dropped the schema** (`DROP SCHEMA audit14 CASCADE` — verified 0 rows in `information_schema.schemata` afterwards). Plus three session-local temp-table control experiments for GIN-trigram matchability.

**Correction I am recording because I got it wrong first.** My initial temp-table harness used `FORCE ROW LEVEL SECURITY` so that RLS would apply to its owner. That made the SECURITY DEFINER path *also* subject to RLS, and I briefly concluded that `idx_mail_metadata_search_trgm` was unusable dead weight. It is not. A three-way control (`trgm-control.sql`: plain-column index, `chr(1)` expression index, `E'\x01'` expression index, all on one 200k table) proved the `chr(1)` expression index **is** matched by the planner (23 buffers, 0.24 ms). The seq scans I first saw were caused by my own FORCE RLS, which is exactly the mechanism migration 1022 documents. The corrected numbers below are the ones to trust.

---

## 2. PRD-C130 — queries / cache / workers

Walked in the order the criterion names them.

### 2.1 Indexed conversation ordering — **MET**

`MailMetadataService.listCached` (`mail-metadata.service.ts:197`) orders `date DESC, id DESC` with `LIMIT limit + 1` and a keyset predicate (`keysetCondition`, `:186`) that correctly handles Postgres's `DESC NULLS FIRST` for null-dated rows. `idx_mail_metadata_list_keyset (org_id, user_membership_id, folder, date DESC, id DESC)` exists in the live catalog and matches the declaration.

Measured, 200k rows, warm, as the non-owner with RLS on:

```
### A. keyset page one (org+membership+folder ORDER BY date DESC,id DESC LIMIT 26)
 Limit → Result (One-Time Filter: current_org_id() = 'org_bench')
   → Index Scan using idx14_list_keyset   Buffers: shared hit=18   Execution Time: 1.236 ms
```

Thread read from the mirror (`idx_mail_metadata_thread`): **5 buffers, 0.058 ms**.

Cursors are HMAC-signed and bound to `userId` (`mail-metadata-cursor.ts:33`, `mail-normalizers.ts:387`), with `timingSafeEqual` and a version prefix that keeps the two cursor namespaces from being read as each other. A tampered or foreign cursor decodes to page one, never to another reader's position. This is genuinely well built.

### 2.2 Indexed search — **PARTIALLY MET**

The design works: `app.search_mail_message_ids` is `SECURITY DEFINER`, owned by the BYPASSRLS role, filters `org_id = app.current_org_id()` inside itself (so it fails closed with 42501 when the GUC is absent), returns ids only, and the caller re-applies org/membership/folder/account predicates under RLS (`listCached:206-213`). No tenant boundary moves into the function.

Measured, same 200k-row reproduction, warm:

| Path | Plan | Buffers | Time |
|---|---|---|---|
| C. definer id-list, term matching 1 row | GIN trigram inside definer | ~75 | **27.5 ms** |
| B. plain ILIKE fallback under RLS, same term | **Seq Scan**, 199,999 rows removed | **5,006** | **168 ms** |
| D. definer id-list, term matching **0** rows | GIN trigram | 486 | **2.2 ms** |
| E. ILIKE fallback for that same 0-match term | **Seq Scan**, 200,000 rows removed | **5,006** | **184 ms** |

The defect is at `mail-metadata.service.ts:164`:

```ts
if (rows.length === 0 || rows.length > SEARCH_ID_CAP) return literal;
```

`rows.length > SEARCH_ID_CAP` is the documented, deliberate broad-term fallback and is correct. `rows.length === 0` is not: the index has just answered the question definitively — *nothing matches* — and the code throws that answer away and re-derives the same empty result with a full sequential scan of the tenant's mirrored mailbox. **Measured 2.2 ms / 486 buffers replaced by 184 ms / 5,006 buffers: 84× the latency, 10× the buffers, for the identical result.** This is the single most common interactive case, because `mail-list-pane.tsx:85` debounces at 300 ms and fires a search for every partial term the user has typed so far.

### 2.3 Indexed unread — **NOT MET**

There is no unread query anywhere. `UnifiedInboxService.countMailUnread` (`unified-inbox.service.ts:395`) derives the unread badge by calling `MailService.listMessages(..., "all", 100)` and filtering in JavaScript:

```ts
const result = await this.mail.listMessages(orgId, userId, membershipId, "inbox", "all", MAIL_COUNT_SCAN_LIMIT, undefined);
return { unread: result.messages.filter((m) => !m.isRead).length, exact: result.messages.length < MAIL_COUNT_SCAN_LIMIT };
```

Because `accountIdParam === "all"`, this **never** reaches the local mirror (see 2.5) — it is a live Gmail/Graph fetch of 100 messages per connected account. It is also called with `limit = 100` while the route's own DTO caps `limit` at 50 (`mail-schemas.ts:18`, `pageSizeField(25, 50)`).

For completeness I measured what an indexed unread count *would* cost against the mirror as it is indexed today:

```
### G. SELECT count(*) ... AND is_read = false
 Aggregate → Seq Scan on mmm   Buffers: shared 5,000   Execution Time: 49.8 ms
```

There is no partial index on `is_read = false`, so even a mirror-backed count would be a full scan. Neither the query nor the index exists.

### 2.4 Incremental sync — **NOT MET**

`MailSyncCheckpointService.savePosition` is called once, at `mail.service.ts:289`, on every provider list. **`loadPosition` is never called from production code** — the only reference outside its own definition is `mail-sync-checkpoint-isolation.spec.ts`. `clearPositions` has no caller at all.

```
$ grep -rn "loadPosition" src --include="*.ts" | grep -v "\.spec\.ts"
src/modules/mail/mail-sync-checkpoint.service.ts:13:  async loadPosition(
```

So `mail_sync_checkpoints` is a **write-only table**. Nothing resumes from a checkpoint; every list starts from the provider's page one. What is stored is a Gmail `nextPageToken` (an ephemeral pagination cursor), not a `historyId` or a Graph `deltaLink`, so it could not support incremental sync even if it were read.

There is no background sync at all. `MailModule` (`mail.module.ts`) registers one controller and six providers — **no cron, no queue, no consumer**. Grep for `historyId`, `GMAIL_WATCH`, `deltaLink`, `deltaToken` across `src/modules/mail` returns nothing. The only mail worker in the system is `CronMailRetentionService`, which deletes rows older than 365 days.

### 2.5 The mirror is unreachable in the product's default state — **structural**

`MailService.listMessages` (`mail.service.ts:76`) gates the entire local-mirror path on a single account:

```ts
const singleAcc = accountIdParam === "all" ? undefined : targetAccounts[0];
if (singleAcc && membershipId !== null) { /* metadata path */ }
```

Every default caller passes `"all"`:

- `MailShell` initialises `selectedAccountId` to `"all"` (`mail-shell.tsx:61`).
- `UnifiedInboxService.fetchMail` hardcodes `"all"` (`unified-inbox.service.ts:322`).
- `UnifiedInboxService.countMailUnread` hardcodes `"all"` (`:406`).
- `MailAiService.inboxSummary` defaults to `"all"` (`mail-ai.service.ts:48`).

So `mail_message_metadata` — the whole indexed-ordering, indexed-search, keyset-cursor apparatus that migration 1022 measured and that section 2.1 shows working — is bypassed unless the user explicitly picks one mailbox from the account dropdown. Out of the box, opening `/mail`, opening `/inbox`, and computing the unread badge are all live provider fanouts.

### 2.6 Idempotent send — **MET**. Idempotent receive — **N/A, there is no receive path**

`POST /mail/send` and `POST /mail/reply` carry `@Idempotent("mail.send")` / `@Idempotent("mail.reply")`. `IdempotencyInterceptor` (read in full) requires the `Idempotency-Key` header (400 without it), hashes `{v:2, commandName, method, canonical(params), canonical(query), canonical(body)}`, and implements four claim branches — `mismatch` → 422, `inflight` → 409, `replay` → stored status + body, `claimed` → execute then stamp. It fails closed when there is no org context. `check:idempotent-commands` passes.

The client half is correct too: `useIdempotentOperation` (`hooks/common/use-idempotent-operation.ts`) keeps one key alive across retries of the same input and releases it on `settle()`, and the compose sheet's error toast offers a `Retry` that re-enters the same submit handler with the same body — so a retried send is deduped rather than delivered twice. `mail-send-idempotency.test.tsx` (6 cases) covers this and passes.

There is no receive path: no Gmail push subscription, no Graph webhook, no inbound mail controller in the mail module. (`src/modules/ingress/adapters/mailbox-push.ts` exists but belongs to CRM ingress, which is out of scope for this release.)

### 2.7 Bounce / retry / DLQ — **NOT MET**

Nothing in the mail module implements any of the three:

- **Bounce.** `EmailWebhookController` handles Resend/SES bounce and complaint events for the *transactional* notification system (`email_outbox`, `email_suppression`). Nothing routes a Gmail or Graph delivery failure back to `/mail/send`. A message that hard-bounces at the provider produces no record and no UI signal.
- **Retry.** `POST /mail/send` calls Composio synchronously in the request; on failure it throws and the client shows a toast with a manual `Retry`. There is no server-side retry, no backoff, no lease.
- **DLQ.** `grep -rn "dlq|DLQ|deadLetter" src/modules/mail` → **no matches**. `MailModule` imports no queue or outbox module.

The `email_outbox` + `cron-email-outbox` + DLQ machinery exists in this codebase (ticket 15's surface) and the mail module does not use it.

### 2.8 Invalidation of list / thread / count keys — **MET**

`useSendMail`, `useReplyMail` and `useMailAction` each invalidate `queryKeys.mail.all` **and** `queryKeys.inbox.all` (`hooks/api/mail.ts:100-101, 115-116, 188-189`). Prefix matching means `mail.all` covers `mail.accounts/messages/thread/message` and `inbox.all` covers `inbox.list/count/unified`. `mail-send-invalidation.test.tsx` (6 cases) asserts this and passes.

Server-side, `performAction` calls `this.cache.invalidateNamespace('mail:messages:${acc.id}')` (`mail.service.ts:450`) before deferring the mirror update, so the 45-second provider-response cache cannot serve a stale read after a mutation.

Cache keys carry no tenant dimension, and they do not need one: the `QueryClient` is remounted per `(orgId, userId)` scope (`components/providers/query-provider.tsx:88-96`, `<ScopedQueryProvider key={scope}>`) **and** `queryKeyHashFn: scopedQueryKeyHashFn(scope)` salts every hash with the same scope. Two layers. `check:query-scope` passes over 5,367 files.

### PRD-C130 verdict: **partially met.**
Ordering ✓, cursors ✓, idempotent send ✓, invalidation ✓. Search is indexed but throws the index away on the most common case. Unread is not indexed and not even queried. Incremental sync is write-only. Bounce/retry/DLQ do not exist.

---

## 3. PRD-C131 — frontend / TanStack / tests

### 3.1 Infinite lists — **PARTIALLY MET**

`useMailMessages` is a correct `useInfiniteQuery` (`hooks/api/mail.ts:45`): `initialPageParam: undefined`, `getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined`, `placeholderData: keepPreviousData`, `staleTime: 30_000`, `enabled: can`. `MailVirtualList` uses `react-window` with a stable `${accountId}-${id}` row key and an explicit "Load more" row. `check:query-signal` confirms every `queryFn` threads the abort signal (1,056 blocks across 426 files, clean) — including these.

Three ways rows are lost or duplicated:

1. **The unified inbox skips mail it fetched but did not show** (`unified-inbox.service.ts:199`). Notifications, broadcasts and approvals all resume from the id of the last item *in the page*; mail alone resumes from the cursor at the end of the *fetched batch*. Fetch `limit+1 = 26` mail items, merge with 3 other sources, slice to 25 — if only 10 mail items survive the cut, the next page's mail cursor is already past all 26. Sixteen messages are never displayed on any page.
2. **A per-account error mid-scroll restarts that account from row zero** (`mail.service.ts:139-167`). An account whose fetch rejects is pushed to `accountErrors` and never added to `accountFetches`, so its key is absent from `nextCursorMap`, so the next page decodes `parsedCursor[accId] === undefined` = "no position yet". Every message that account already delivered is delivered again, with duplicate react-window keys.
3. **Outlook pagination ends early on one unparseable message** (`outlook-mail.provider.ts:120`): `nextSkip = messages.length === limit ? ... : null` counts *normalised* messages. The sibling method `listMessagesForIngress` counts raw `items.length` for exactly this reason and says so in a comment at `:177-178` — the user-facing path was never fixed.

### 3.2 Thread hydration — **MET**

`seedMailDetailFromSummary` (`mail-thread-seed.ts:19`) writes the summary into `queryKeys.mail.thread(accountId, threadId)` with `updatedAt: 0`, so the seed renders instantly and is immediately stale, guaranteeing a refetch. It refuses to overwrite an existing cache entry. `MailReadingPane` derives `isHydrating` from "fetching, has messages, and every body is still null" (`mail-reading-pane.tsx:83`), which is the right predicate for a seeded-but-not-yet-hydrated thread. `mail-thread-hydration.test.tsx` (5 cases) and `mail-thread-seed.test.tsx` (6) pass.

### 3.3 Optimistic read/label rollback — **MET, with two gaps**

`useMailAction` pairs `onMutate: applyMailActionToCaches` with `onError: restoreMailCaches` and `onSettled: invalidate` (`hooks/api/mail.ts:182-190`). `applyMailActionToCaches` cancels in-flight queries on both prefixes, snapshots every matching cache entry, patches both the folder listing and the unified inbox, and returns the snapshot set for rollback. `mail-open-marks-read.test.tsx` covers open-marks-read plus its `onError` revert.

Gaps:
- `archive`/`trash` filter on `m.id !== messageId` alone (`mail-action-cache.ts:51`), while `markRead`/`star` correctly require `m.accountId === accountId`. Two accounts holding the same provider message id would both drop the row.
- `star`/`unstar` is patched into the mail listing but **not** into the unified inbox (`:111` handles only archive/trash and markRead/markUnread), so the star icon on `/inbox` does not move until the `onSettled` refetch lands.

Server-side, the mirror update after a Gmail label operation is narrower than the operation itself: `performAction` calls `modifyThreadLabels(..., threadId, [], ["UNREAD"])` — which marks the **whole thread** read at Gmail — then `deferUpdateState(acc.id, membershipId, orgId, messageId, {isRead:true})` for **one row** (`mail.service.ts:411` and `:461`). Every other message in that thread stays unread in the mirror.

### 3.4 Compose / send states — **NOT MET (P1)**

Loading, pending, disabled, error and retry states are all present and correct: `LoadingButton isPending` with `loadingText="Sending..."`, Discard disabled while pending, `toast.error(getErrorMessage(err))` with a `Retry` action, and `persistDraft()` on every failure and on close. Drafts are keyed per compose/reply mode (`mail-draft-storage.ts`, 10 passing tests).

But **the reply composer's "To" field is a lie.** `MailComposeHeaderFields:119-132` renders a fully editable `EmailChipsInput` bound to `replyForm.to`; `mailReplySchema:18` validates it with `.min(1, "At least one recipient is required")`; and then `onSubmitReply` (`mail-compose-sheet.tsx:243`) sends:

```ts
await replyMail.mutateAsync({ accountId, messageId, threadId, bodyHtml, cc });
```

`to` is absent. `ReplyMailBody` (`types/mail.ts:71`) has no `to`. `replyMailSchema` (`src/modules/mail/dto/mail-schemas.ts:48`) has no `to`. The backend picks the recipient itself (`mail.service.ts:376-384` for Gmail; Graph's `/reply` for Outlook). `cc` **is** sent, so the field next to it works — which makes the failure harder to notice, not easier.

Concretely: a user opens a thread with an external counterparty, clicks Reply, deletes `partner@external.com` from the To chips, types `legal@ourcompany.com`, writes a reply, and clicks Send reply. The toast says "Reply sent". The mail goes to `partner@external.com`.

### 3.5 Offline / reconnect — **PARTIALLY MET**

`useOnlineStatus` is a correct `useSyncExternalStore` over the `online`/`offline` events with a server snapshot of `true`. Both compose submit handlers check it, persist the draft and toast "You're offline — your draft is saved. Try again once you reconnect." (`mail-compose-sheet.tsx:212, 238`). `/inbox` threads `isOnline` through `useInboxActions` into the shell and disables actions (`inbox-offline.test.tsx`, 6 passing cases).

`/mail` itself has no offline state. `MailListPane` never reads `useOnlineStatus`; going offline surfaces as the generic `isError` branch with a fetch error string. Reconnect refetch is inherited (`refetchOnReconnect` is not overridden and TanStack's default is `true`); `refetchOnWindowFocus` is explicitly `false`.

### 3.6 Sanitization — **MET**

`MailHtmlViewer` (`mail-html-viewer.tsx`) runs every provider body through `isomorphic-dompurify` with an explicit 56-tag allowlist, a 17-attribute allowlist, `ALLOW_UNKNOWN_PROTOCOLS: false` and `FORCE_BODY: true`, then rewrites every anchor to `target="_blank" rel="noopener noreferrer"` (injected first, so it wins HTML's first-duplicate-attribute rule). Remote images are blocked by default via an `afterSanitizeAttributes` hook that moves `src` to `data-blocked-src`, with a counted "N remote images blocked / Load images" affordance; the hook is added and removed inside a `try/finally`, and it is the **only** `DOMPurify.addHook` call in the repo, so the global-hook-stack hazard does not arise.

`mail-html-render-boundary.test.ts` is a source-level assertion that `dangerouslySetInnerHTML` in this file only ever receives `sanitized`. `mail-html-viewer.test.tsx` (19 cases) and `mail-body-sanitization.test.tsx` (5) pass. Backend `ai-email-html-boundary.spec.ts` covers the AI side.

Residual: `style` is in `ALLOWED_ATTR`. DOMPurify sanitizes CSS, but a `position:fixed; inset:0; z-index:9999` overlay from a hostile email is still expressible inside the viewer's container. Low severity, worth knowing.

### 3.7 Account-revocation E2E — **NOT MEASURABLE HERE**

There is **no E2E tooling in the frontend repository**: no `playwright.config.*`, no `cypress.config.*`, no `e2e` directory, and no `e2e` or `playwright` script in `package.json`. The backend has `test/security`, `test/crm`, `test/inventory`, `test/kb`, `test/billing` seeded-e2e suites; `grep -rln "mail" test/` returns no mail suite.

What exists instead is `features/mail/mail-account-revocation.test.tsx` — 5 jsdom cases with `useIntegrationConnections` mocked, asserting that a `needs_reauth` connection renders a "Reconnect" affordance and re-initiates OAuth for its own toolkit. That is a component test, not an E2E.

The mechanism it stands in for is real and correct: `MailService.listMessages` collects auth failures and issues one batched `markNeedsReauthMany` UPDATE (`mail.service.ts:126-133`), the response carries `accountErrors[]`, and `MailListPane:216-243` renders a per-account destructive banner with a Reconnect button. Backend `mail-auth-revocation.spec.ts` (8) and `mail-reauth-marking.spec.ts` (5) pass. **To measure the criterion as written** you would need: a Playwright config in the frontend repo, a seeded org with a connected mailbox, a Composio stub that returns an auth error, and a scripted revoke → list → banner → reconnect flow.

### PRD-C131 verdict: **partially met.**
Thread hydration ✓, optimistic rollback ✓ (two gaps), sanitization ✓. Infinite lists drop and duplicate rows. The reply composer's To field is inert. `/mail` has no offline state. The E2E the criterion names does not exist and cannot be run here.

---

## 4. Findings

| # | Sev | File:line | Failure scenario | Fix |
|---|---|---|---|---|
| 1 | **P1** | `frontend/features/mail/mail-compose-header-fields.tsx:119` (with `mail-compose-sheet.tsx:243`, `hooks/api/mail.ts:111`, `types/mail.ts:71`, `backend/src/modules/mail/dto/mail-schemas.ts:48`) | Reply composer renders an editable, `.min(1)`-validated To chips input whose value is never transmitted. User replies to an external thread, removes `partner@external.com`, types `legal@ourcompany.com`, sends. Toast says "Reply sent". Backend picks the original sender; the reply goes to `partner@external.com`. `cc` on the same form *is* transmitted. | Either add `to: z.array(z.string().email()).min(1).max(25)` to `replyMailSchema`/`ReplyMailBody` and honour it in `MailService.replyMail` (Gmail `replyToThread` already takes `recipientEmail`; Outlook needs `/createReply` + `toRecipients` instead of `/reply`), or make the reply To field read-only and derive it from the same rule the backend uses. |
| 2 | **P1** | `backend/src/modules/notifications/unified-inbox.service.ts:199` | Unified inbox fetches `limit+1` mail items and merges them with 3 other sources, then slices to `limit`. `nextState.m` is set to `mailResult.nextMailCursor` — the position after the whole fetched batch — while `n`/`b`/`a` correctly use the id of the last item *in the page*. Page 1 shows 10 of 26 fetched mail items; page 2 starts mail after item 26. Messages 11–26 appear on no page and are unrecoverable by scrolling. | Resume mail from the last mail item actually rendered, as the other three sources do. Because the mail cursor is opaque and provider-shaped, `fetchMail` must return a per-item resume cursor (or the response must carry `nextCursor` alongside each item) rather than one batch-end token. |
| 3 | **P1** | `backend/src/modules/mail/mail.controller.ts:54` | `MailController` carries no `@NoTenantTransaction()`. `TenantContextInterceptor` wraps every org-bearing HTTP request in `withTenant(...)`, i.e. a Postgres transaction on a pooled connection. So `POST /mail/ai/draft` holds a transaction open across a Composio `getThread` **and** an LLM completion; `GET /mail/messages?accountId=all` holds one across N concurrent Gmail/Graph calls. `idle_in_transaction_session_timeout` is 60 s (`db/pool.config.ts:122`) and a connection awaiting an HTTP response is idle-in-transaction, so an LLM call over 60 s is killed by Postgres *after* the model has been called and charged. 36 other files — including every other AI controller, e.g. `chat-assistant.controller.ts:239` — already carry the decorator. | Add `@NoTenantTransaction()` to `MailController` (or at minimum to the three `ai/*` handlers plus `send`/`reply`) and wrap the handlers' actual DB work in `runInTenantTransaction`, following the pattern in `kb-ask.controller.ts` / `kb-page-ai.controller.ts`. Also stop `await`ing `checkpoints.savePosition` (`mail.service.ts:289`) inside the request — `runInNewTenantTransaction` borrows a *second* pooled connection while the first is still held. |
| 4 | **P1** | `backend/src/modules/integrations/core/integrations.service.ts:195` (with `mail-metadata.service.ts:324`, `mail-sync-checkpoint.service.ts:51`) | Disconnecting a mailbox deletes the `user_integration_connections` row and the Composio account, and purges nothing else. `mail_message_metadata` has **no FK to `user_integration_connections`** (verified: `SELECT conrelid::regclass FROM pg_constraint WHERE confrelid='user_integration_connections'::regclass` returns 0 rows), so every mirrored subject, sender name, sender address and thread id survives for up to 365 days until `CronMailRetentionService`. `MailMetadataService.markStaleForAccount` and `MailSyncCheckpointService.clearPositions` exist for exactly this and have **zero callers**. A user who revokes a mailbox to remove their mail from the product has not removed it. | Call `markStaleForAccount` + `clearPositions` — or better, a hard `DELETE FROM mail_message_metadata WHERE org_id = $1 AND account_id = $2` — from `IntegrationsService.disconnect` inside the same transaction, for `gmail`/`outlook` toolkits. |
| 5 | **P1** | `backend/src/modules/mail/mail-metadata.service.ts:164` | `if (rows.length === 0 || rows.length > SEARCH_ID_CAP) return literal;` — when the trigram-backed definer returns **zero** ids, that definitive answer is discarded and the query re-runs as three leading-wildcard ILIKEs, which RLS forces into a sequential scan. Measured at 200k rows, warm, non-owner with GUC set: definer **2.2 ms / 486 buffers** → ILIKE fallback **184 ms / 5,006 buffers**, same empty result. Fires on every debounced keystroke whose partial term has not matched yet. | Split the branches: `if (rows.length > SEARCH_ID_CAP) return literal;` keeps the documented broad-term fallback; `if (rows.length === 0) return sql\`false\`;` (or `inArray(id, [])`) honours the index's answer. The `catch` fallback stays as-is. |
| 6 | **P1** | `backend/src/modules/mail/mail-sync-checkpoint.service.ts:13` | `loadPosition` has no production caller (`grep -rn "loadPosition" src --include="*.ts" \| grep -v spec` → the definition only). `savePosition` writes a Gmail `nextPageToken` on every list. `mail_sync_checkpoints` is therefore a write-only table with a per-request write cost and no read: nothing resumes from a checkpoint, so PRD-C130's "incremental sync" is unimplemented. A stored page token could not support it anyway — Gmail needs `historyId`, Graph needs a `deltaLink`. | Either delete the table, service and its write (and say so in the PRD), or implement real incremental sync: persist `historyId`/`deltaLink`, read it at the start of a sync, and drive the mirror from `users.messages.list?startHistoryId` / the delta query. |
| 7 | **P1** | `backend/src/modules/mail/mail.service.ts:76` (with `unified-inbox.service.ts:322,406`, `mail-ai.service.ts:48`, `frontend/features/mail/mail-shell.tsx:61`) | The local mirror is gated on `accountIdParam !== "all"`, and every default caller passes `"all"`. Opening `/mail`, opening `/inbox`, and the unread badge are all live Gmail/Graph fanouts — one concurrent provider call per connected mailbox, inside the request's DB transaction (finding 3), with no cap on how many mailboxes a user may connect (`grep -n "MAX_CONNECTIONS\|maxConnections" src/modules/integrations/core/*.ts` → nothing). The indexed keyset path measured at 18 buffers / 1.2 ms is unreachable from the shipped UI. | Make the mirror serve the multi-account case: `listCached` already accepts `accountId: number \| null` and its `WHERE` works without an account predicate. Pass the user's account-id set instead of requiring exactly one, and keep the provider as the fall-through for a cold or stale mirror. Independently, cap the per-user fanout. |
| 8 | **P2** | `backend/src/modules/mail/providers/outlook-mail.provider.ts:120` | `nextSkip = messages.length === limit ? skip + limit : null` counts messages that *normalised*. One message Graph returns in an unexpected shape makes `messages.length < limit`, so `nextSkip` is null, so `outlookHasMore` is false, so the whole scroll ends — silently, mid-mailbox. `listMessagesForIngress:179` counts raw `items.length` and its comment at `:177` names this exact bug. | `const nextSkip = items.length === limit ? skip + limit : null;` — match the ingress method. |
| 9 | **P2** | `backend/src/modules/mail/mail.service.ts:139` | An account whose provider fetch rejects is recorded in `accountErrors` but is never pushed to `accountFetches`, so its id is absent from `nextCursorMap`. `encodeCursor` therefore emits a cursor with no entry for it, and the next page decodes `parsedCursor[accId] === undefined` = "start from the beginning". One transient 503 on page 3 re-delivers every message that account served on pages 1–3, with duplicate `${accountId}-${id}` react-window keys. | Carry the failed account's incoming cursor value through unchanged: add a `{accId, currentCursorValue}` entry for rejected outcomes so its position is preserved verbatim. |
| 10 | **P2** | `backend/src/modules/mail/mail.service.ts:411` and `:461` | `modifyThreadLabels(userId, conn, threadId, [], ["UNREAD"])` marks the entire Gmail thread read at the provider, but `deferUpdateState` updates exactly one `message_id` in the mirror. A 12-message thread marked read shows 11 unread in the mirror; every mirror-backed read and every future unread count disagrees with Gmail. | When `threadId` is present and the provider is Gmail, update the mirror by `(account_id, thread_id)` rather than `(account_id, message_id)`. `idx_mail_metadata_thread (org_id, user_membership_id, thread_id)` already exists and measured at 5 buffers. |
| 11 | **P2** | `frontend/features/mail/mail-shell.tsx:225` | `MailShell` never checks `mail:inbox:view`. `/mail` is a **universal** route (`lib/rbac/route-access/universal-routes.ts:32`), so any authenticated member reaches the page; `useMailAccounts` is then disabled by `useCan`, so `accounts = []` and `accountsLoading = false`, and the user is shown `MailEmptyPane variant="connect"` — "Connect your mailbox" — for a feature they are not permitted to use. `/inbox` gets this right: `deniedPermissionFor` reads `sources[].reason` and renders `NoPermissionState` (`inbox-shell.tsx:41-56`). `check:empty-states` passes because the component *is* `EmptyState`. | Read `useCan("mail:inbox:view")` in `MailShell` and render `NoPermissionState` when it is false, before the accounts branch. |
| 12 | **P2** | `backend/src/modules/mail/providers/mail-normalizers.ts:420` | `mergeMessagesByDate` sorts with `b.date.localeCompare(a.date)` on raw strings. Gmail dates are normalised through `toISOString()` (`...:30.000Z`); Outlook passes Graph's `receivedDateTime` through untouched, and Graph emits both `...:30Z` and `...:30.0000000Z`. `'Z'` (0x5A) sorts above `'.'` (0x2E), so an Outlook `...:30Z` sorts *ahead of* a Gmail `...:30.999Z` that is 999 ms later. `sortThreadChronologically:436` was written to fix this for threads and documents it in its own comment; the cross-account list merge still has it. | Use the same `Date.parse` comparator in `mergeMessagesByDate`, with the same `POSITIVE_INFINITY` guard for unparseable values. |
| 13 | **P2** | `backend/src/modules/mail/providers/outlook-mail.provider.ts:219` | `getThread` hardcodes `top: 50` with `skip: 0` and no continuation. A conversation of 60 messages silently renders 50, and neither the response nor the UI says anything was truncated. Gmail's `getThread` has no equivalent cap. | Page the Graph call to exhaustion under a documented bound, or return a `truncated: true` flag and render it. |
| 14 | **P2** | `backend/src/modules/mail/mail-metadata.service.ts:113` | `onConflictDoUpdate` targets `(account_id, message_id)` — a correct, inferable arbiter — but its `set` never refreshes `org_id` or `user_membership_id`. `fk_mail_meta_org_user_mbr` is `ON DELETE SET NULL`, so removing a member NULLs `user_membership_id` on their mirrored rows. If that person is re-added (new membership id) while their integration connection persists, every subsequent upsert hits the existing row and leaves `user_membership_id` NULL, while `listCached:208` requires `user_membership_id = membershipId`. The mirror is permanently dead for that account and every read falls through to the provider forever, with no error anywhere. | Add `userMembershipId: sql\`excluded.user_membership_id\`` to the `set` clause. |
| 15 | **P2** | `frontend/hooks/api/mail-action-cache.ts:51` and `:111` | (a) `archive`/`trash` filter on `m.id !== messageId` without the `accountId` guard that `markRead`/`star` use, so the same provider message id in two mailboxes drops both rows optimistically. (b) `star`/`unstar` is patched into the mail listing but not into the unified inbox, so the star on `/inbox` does not move until `onSettled` refetches. | Add `&& m.accountId === accountId` to the archive/trash filter; add a star/unstar branch to the unified-inbox loop (`UnifiedInboxItem` for mail would need an `isStarred` field, or the branch can be omitted deliberately and documented). |
| 16 | **P2** | `backend/src/me/inbox.controller.ts:41` | `GET /me/inbox/unified/count` has no frontend caller (`grep -rn "unified/count" frontend` → nothing). It is a live route that, if called, performs a 100-message provider fetch per connected mailbox (finding 7) inside a request transaction (finding 3). Dead but loaded. | Delete the route and `unifiedUnreadCount`, or wire the badge to it *after* fixing findings 3 and 7. |
| 17 | **P2** | `backend/src/modules/mail/providers/outlook-mail.provider.ts:277`, `:281`, `:285` | `executeProxy(conn.composioAccountId, "POST", \`/me/messages/${messageId}/reply\`, ...)` interpolates a caller-supplied `messageId` (validated only as `z.string().min(1).max(500)`) into a Graph URL path with no encoding. A `messageId` containing `/` or `..` reshapes the request path. Blast radius is bounded to the caller's own Microsoft grant — `assertOwnedConnection` runs first, so no tenant boundary is crossed — but the caller controls which Graph endpoint is hit as themselves. | `encodeURIComponent(messageId)` at all three sites, and tighten the DTO to the Graph id charset. |

**No P0.** I looked specifically for the shapes this repo has shipped before and did not find them here: every mail read carries an explicit `org_id` predicate *and* runs under an RLS policy verified present in the live catalog; the SECURITY DEFINER search function derives org from `app.current_org_id()` rather than a parameter and returns ids only; cache keys are salted per `(orgId, userId)` twice over; the ON CONFLICT arbiter matches a real unique index; there is no money in this module; and the declared schema and the live catalog agree column for column and index for index.

---

## 5. What head already gets right

- **Tenant isolation.** Every mail read binds `org_id` explicitly and runs under RLS (`tenant_isolation` policy verified live on both mail tables). `assertOwnedConnection` re-checks `(id, orgId, userId, toolkit)` on every single-account route. `app.search_mail_message_ids` takes org from the GUC, never from a parameter, and fails closed with 42501. Six backend isolation specs cover this and pass.
- **Cursor integrity.** Both cursor namespaces are HMAC-signed with a key namespaced off `ENCRYPTION_KEY`, bound to the reader's `userId`, compared with `timingSafeEqual`, and version-prefixed so one regime cannot be decoded as the other. Unreadable → page one; missing key → throw, not degrade. `mail-cursor-roundtrip.spec.ts` and `mail-list-paging-regime.spec.ts` (15 cases) pass.
- **Idempotent send.** End to end: `@Idempotent` + a four-branch fence with request hashing over method/params/query/body, and a client that keeps one key alive across retries and releases it on settle. `check:idempotent-commands` passes.
- **Sanitization.** DOMPurify with explicit allowlists, `ALLOW_UNKNOWN_PROTOCOLS: false`, remote images blocked by default with a counted opt-in, anchors forced to `noopener noreferrer`, and a source-level boundary test that fails if `dangerouslySetInnerHTML` is ever handed anything but `sanitized`.
- **Indexed ordering, measured.** 18 buffers / 1.2 ms for a keyset page at 200k rows; 5 buffers for a thread read. The keyset `(date, id)` tiebreak is real and the null-date branch is correct.
- **Revocation signalling.** One batched `markNeedsReauthMany` UPDATE that logs rather than discards its failure, `accountErrors[]` on the wire, and a per-account destructive banner with Reconnect. The commit comments show this was a real bug that was really fixed.
- **Error states are not empty states** in the list pane: `isLoading` → skeletons, `isError` → the error message, `length === 0` → "No messages in {folder}", and `accountErrors` renders above all three.
- **Retention.** `CronMailRetentionService` drains in 500-row batches to a 100-batch cap, reports `truncated`, and writes an audit row per org. `check:retention-coverage` recognises the table.
- **Query-cache scoping.** `QueryClient` remounted per `(orgId, userId)` **and** `queryKeyHashFn` salted with the same scope — belt and braces.

---

## 6. Blocked on infrastructure / not measured

| Item | Why | What would measure it |
|---|---|---|
| Account-revocation E2E (PRD-C131, explicit) | No E2E tooling exists in the frontend repo: no `playwright.config.*`, no `cypress.config.*`, no `e2e/`, no `e2e` script in `package.json`. `grep -rln "mail" backend/test/` finds no mail suite. | A Playwright config in `streamlineos-frontend/frontend`, a seeded org with a connected mailbox, a Composio stub returning `isAuthError`, and a scripted revoke → list → banner → reconnect flow. |
| Offline/reconnect E2E (PRD-C131) | Same. `inbox-offline.test.tsx` is jsdom with mocked hooks. | Playwright `context.setOffline(true)` around a compose submit and a list refetch. |
| Real provider latency and fanout cost | Composio, Gmail and Microsoft Graph are all mocked in every test. Findings 3 and 7 are read from the code and from the transaction/timeout configuration, not from a live trace. | A staging org with 2+ real mailboxes, an APM span around `GET /mail/messages?accountId=all`, and `pg_stat_activity` sampling for `idle in transaction` duration. |
| End-to-end mail latency budgets | `check:route-budgets` / `check:route-budgets-http` were not run for mail (they need the benchmark manifest, which is under repair in the concurrent wave). | `check:benchmark-manifest` green, then `check:route-budgets-http` with `/mail/messages` in the manifest. |
| `check:tenant-isolation`, `check:record-access`, `check:scope-application` | Not run — they need DB URLs I did not wire, and the brief says the 9 previously-inconclusive backend gates already pass against these databases. | `TENANT_RELATIONSHIP_DB_URL` etc. as documented in the shared context. |
| Whether the 200k-row plans hold at real tenant sizes and real skew | My reproduction is synthetic: uniform sender distribution, one folder, two tenants at 180k/20k. Real mailboxes skew hard. Per `buffers-alone-mismeasure`, I paired buffers with rows and execution time, but not with plan time or bytes. | The same `EXPLAIN (ANALYZE, BUFFERS)` set against a restored production-shaped tenant. |
| `npm run build` / `typecheck` | Prohibited by the laptop budget; run centrally by the orchestrator. | — |

**Context, not counted against this ticket:** all 15 mail/inbox paths are present in `openapi.json`, and **none of the 15 carries a 2xx response schema**. That is the repo-wide condition ticket 04 owns (1 of 3,642 operations has one), not a ticket-14 regression.

---

## 7. Verdict

**PRD-C130 — partially met.** Indexed ordering, signed keyset cursors, idempotent send and list/thread/count invalidation are all present and, where measurable, measured good. Indexed search works but is discarded on its most common case (finding 5). Indexed unread does not exist — there is no unread query at all, and the badge is a provider fanout (finding 7, §2.3). Incremental sync is write-only (finding 6). Bounce, retry and DLQ do not exist in this module in any form.

**PRD-C131 — partially met.** Thread hydration, optimistic rollback and sanitization are solid and tested. Infinite lists drop rows (finding 2) and duplicate rows (finding 9). The reply composer's To field is validated, editable, and never sent (finding 1). `/mail` has no offline state and no permission-denied state. The account-revocation E2E the criterion names does not exist and cannot be run in this repository.

**215 tests pass (113 backend / 102 frontend). 15 gates pass. 17 findings — 7 P1, 10 P2, 0 P0.**
