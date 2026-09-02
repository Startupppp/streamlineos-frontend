# S7 · Ticket 29 — Calendar, Inbox/mail, Knowledge

## Headline: the KB accessible-space cache had no ACL dimension at all

`KbAccessService.getAccessibleSpaceIds` cached under `(kb:acc-spaces:<orgId>, userId)`. The
value it caches depends on `kb:spaces:manage`, on the caller's role slugs, and on the
principal's accountable membership — none of which are in the key. The namespace is bumped
only by space and member mutations (`kb-spaces.service.ts`, `kb-members.service.ts`), **never
by `bumpPermissionsVersion`**. So a user who lost `kb:spaces:manage`, or the role that granted
them space membership, kept the admin-wide space list for the full 60-second TTL — and that
list is the tenant filter for `kb-article-query`, `kb-search`, `kb-ask` (RAG), `kb-verification`
and `support-ai-triage-data`. Content the ACL forbids, served from cache, into a model context.

New `modules/kb/core/kb-acl-cache-key.ts` makes `{ permissionsVersion, membershipId }` a
**required** field and throws on an unresolved version; `computeAccessibleSpaceIds` now takes
the same dimension as a required parameter, so a value can never be computed under a dimension
the key does not carry. Mirrors `resolveUserPermissions`' own `${orgId}:${userId}:${version}`.

Proof: `jest src/modules/kb/core/kb-acl-cache-key.spec.ts` → **6 pass**. Reverting the key to
`user.userId` turns **2 red**, including the concrete leak (a revoked admin still served the
restricted space).

The other half of that trap was checked read-only and is already fail-closed: the revision gate
joins on `=` (`kb-candidate.service.ts:95,161`), so a NULL `acl_revision` never matches, and the
optional `aclRevision` in `kb-ingestion-consumer.ts:27` is inert — the indexer re-reads it from
the live row.

## Boxes closed

| Box | Proof |
|---|---|
| KB cache keys carry the ACL dimension as a required field | above; 6 pass, 2 red on revert |
| Knowledge comment permissions recheck visibility at the data seam | new `kb-comment-permission-model.spec.ts` → **8 pass**; stripping the recheck from the two `update` paths turns **4 red** |
| A cursor survives the JSON round trip | new `mail-cursor-roundtrip.spec.ts` → **5 pass**, incl. a BITE case pinning that `undefined` *does* vanish |
| `check:tenant-isolation` reaches 924/924 | **924 / 924, exit 0** |
| `check:mock-surface` green (coordinator hand-off) | **0 phantoms, 3813 doubles scanned** |

The comment model was already correct on both surfaces — authors edit/delete their own, KB
admins moderate, editors resolve, and every action re-reads current visibility at the seam. It
had **no test at all**; the two existing comment specs were 2 cases each, both cross-tenant only.

## Defects found and fixed

1. **(P2, silent truncation) The calendar reminder sweep used three bare `.limit()` reads.**
   `EVENT_BATCH_LIMIT = 200` on both event queries and `×10` on exceptions, with no keyset loop
   — an org with more than 200 qualifying events in a 20-minute window silently lost the rest,
   and the sweep runs once per window so they are never picked up. Now keyset-drained via a new
   `calendar-keyset-drain.ts`. Proof: `calendar-reminder-sweep-event-paging.spec.ts` — 205
   candidates across two pages; forcing the drain back to one page turns it red.
2. **(P2, silent truncation) `CALENDAR_PER_SOURCE_CAP = 400` cut each source with no signal.**
   The aggregate already has a `truncated` flag the UI banners, and the per-source cap did not
   feed it. `calendar-source.registry.ts` now returns `truncatedKeys`;
   `calendar-events-aggregate.service.ts` folds it in. 4 assertions added across the two specs.
3. **(P2) `KbPageCommentsService.list` was completely unpaginated** — no limit, no cursor, every
   comment on a page on every open. Now keyset-paged at 50 with `afterCreatedAt`/`afterId`,
   matching its article sibling exactly (so the FE contract, an array, is unchanged).
4. **(P2) `KbCommentsService.list` paged on `(createdAt, id)` while ordering by `createdAt`
   alone** — rows sharing a timestamp could be skipped at a page boundary, the exact defect
   `common/pagination/keyset.ts`'s header warns about. `asc(id)` added.
5. **(P1, frontend) Nothing in the mail UI ever marked a message read.** `useMailAction` already
   patches `markRead` optimistically with a full `onError` restore, and **no caller existed** —
   opening a message did not mark it read, so every message stayed unread forever, the unread
   badge was permanently inflated, and "Mark unread" was the only read-state control in the app.
   `features/mail/mail-shell.tsx` now marks read on open, gated on `useCan("mail:messages:manage")`
   so a reader never 403-spams, with a local rollback on failure. 3 tests.
6. **(P3, frontend) The revoked-account banner read only `pages[0]`** — a revocation surfacing
   mid-scroll was invisible. Now unioned across pages, deduped by account id.
7. **Ticket 14's isolation gap was declared but did not bite.** The spec existed and passed, but
   its harness applied an org filter only when the predicate bound one — so *removing* the org
   clause narrowed the result to nothing instead of exposing the other tenant, and the primary
   cross-tenant case passed either way. Rewritten so a predicate binding no org applies no org
   filter, which is what a real database does. Actors now come from `humanSessionPrincipal` +
   `actingMembershipId`, asserted non-owner; the sync-queue and creator-membership lookups are
   modelled too. **9 pass; stripping all three `org_id` predicates turns 4 red**, including the
   case that previously passed. Two permanent in-suite BITE tests assert the concrete leak.
8. **Coordinator hand-off — the phantom mock was not in a KB spec.** Every KB spec already mocks
   `embedQueryWithCredit` / `embedBatchWithCredit` correctly. The single phantom was three dead
   stubs (`embedQuery`, `embedBatch`, `embedQueryDeduped`) left in
   `src/modules/ai/core/gateway/ai-gateway.service.spec.ts` — ticket 10's own file. That spec's
   real assertions already use `embedQueryRaw`/`embedBatchRaw`, so deleting the stubs changed no
   assertion: **32 tests still pass, gate 1 → 0 defects.** I did not re-add anything, and I built
   nothing that assumes full-document coverage past `chunkText`'s 400-chunk cap.

## Boxes NOT closed, with the reason

**Calendar — four sub-criteria fail; three fixes are outside this territory.**
- **P1, product rule.** A second full calendar surface exists:
  `frontend/features/hr/recruitment/interviews-page.tsx:249` renders `BigCalendarWrapper` (the
  unified calendar's own component, imported cross-feature) with month/week toggle and prev/next
  at `/hr/recruitment/interviews`. Breaks root §8 ("Never module-specific calendar pages") and
  §9 (feature→feature imports). `hr-interviews` is already a registered aggregate source, so the
  unified calendar already shows these events. Fix = list + a link to `/calendar`. **HR territory.**
- Timezone never reaches the client: the column and the expansion are correct, but
  `CalendarEventItem` never carries it and `event-detail-content.tsx:74` labels browser-local
  times with the browser's zone. Needs a field in `hooks/api/**` — **ticket 28's territory**.
- "This and following" does not exist anywhere in either repo; only `occurrence | series`.
- Server-side source toggles are absent from the query key; correctness rests on a blanket
  `queryKeys.calendar.all` invalidation. **`hooks/api/**` — ticket 28's territory.**
- Satisfied and verified: DST, single-occurrence exceptions, conflict detection (backend; the
  result is never rendered — `eventConflicts` is not even in the FE response type), reminders.

**Inbox/mail backend — four of six sub-criteria have no implementation.** Search is a
leading-wildcard `ilike` with no tsvector on `mail_message_metadata`, and that code path is
unreachable anyway (`listCached`'s `query` argument is never passed). `mail-sync-checkpoint.service.ts::loadPosition`
has **zero production callers** and `clearPositions` has none anywhere — the table is write-only
and stores a Gmail `nextPageToken`, not a `historyId`/`deltaToken`. There is no inbound mail path
at all. There is no retry/backoff/DLQ for mail (the machinery exists for notifications and was
never applied). Unread is a 100-message provider fan-out counted in JS, self-declared inexact.
Each is platform work with a schema or module dependency, not a frontend matrix item.

**Inbox/mail frontend — three remain.** Thread hydration seeds no cache (full skeleton on every
open); compose errors are a toast with no retry affordance and no draft persistence;
**offline/reconnect is entirely absent** from `features/mail/**` and `features/inbox/**` (zero
`onlineManager` / `navigator.onLine` / `refetchOnReconnect`), while `features/chat` already has
the pattern to copy.

**Knowledge integrity — every remaining failure needs a migration** (`db/schema/**` and
`migrations/**` are both off-limits here). Immutable revisions is satisfied. The gaps are: a bare
single-column FK on `kb_space_grants.space_id`; polymorphic no-FK pointers in
`kb_ingestion_checkpoints` and in record links (stored in `kb_page_links.target_type/target_id`,
with no uniqueness, so `kb-page-record-links.service.ts:34-62` dedupes by a racing read-then-insert);
missing composite uniques on `kb_space_members`, `kb_article_restrictions` and `kb_page_templates`;
a bare global `uniq_kb_pages_public_token`; declared-vs-live drift on the two chunk revision
uniques from `migrations/0510`; and no KB media row at all (`kb-media.service.ts` performs zero
DB writes). Full per-entity table is in the ticket file.

## P1/P2 for the orchestrator, outside my territory

1. **`CalendarProviderWebhookService` is dead at runtime.** It is listed in `calendar.module.ts`
   providers, never injected, never exported, and has no controller route and no cron entry —
   grep for `handleProviderWebhook` outside its own two specs returns nothing. Provider drift
   detection exists as 110 lines of service plus 14 specs and never runs. (I still hardened its
   isolation spec, because that is what closes the 924/924 gate.)
2. **A KB space-property ACL change bumps `acl_revision` and never reindexes.**
   `kb-spaces.service.ts:186-201` bumps every page and article in the space but calls neither
   `syncAclRevisionForSpace` nor any `kb.content.index` emit, unlike `kb-members.service.ts`.
   The retrieval join fails closed — but permanently: change a space's audience and its whole
   content silently vanishes from vector search until an unrelated edit re-indexes it. No spec.
3. **`kb.content.delete` is dead code.** `KbIngestionDeleteConsumer` implements a full durable
   four-way purge; nothing emits that event. Purging is entirely in-request `tx.delete`, not
   outbox-backed, so a crash mid-delete leaves orphan chunks.
4. **The KB ingestion lease fails open** — no Redis, or a Redis error, returns `acquired: true`
   (`kb-ingestion-lease.service.ts:24-25, 37-43`). And lease contention is thrown as an ordinary
   error, so a heavily-edited page can dead-letter after 8 contentions without ever failing.
5. **Mail send is idempotent on paper only.** `@Idempotent("mail.send")` is on the route, but
   `frontend/lib/api-client.ts:150-153` mints a fresh UUID per HTTP call, so a user retry after a
   timeout is a genuine second send.
6. **`unified-inbox.service.ts:379-393` counts notifications by `userId`**, while
   `idx_notifications_unread_count` is `(org_id, membership_id, id)` and
   `notifications-read.service.ts:322-338` counts by `membershipId`. Two divergent unread counts,
   one of them unindexed.
7. **`mail_message_metadata`'s unique omits `org_id`** (`db/schema/mail/mail-metadata.ts:37`),
   and `crm/inbound-events.ts:59-63` uniques on `(org, provider, external_id)` where `provider`
   is a toolkit label — two Gmail accounts in one org collide. Schema; off-limits here.
8. **`kb-article-query.service.ts:67-71` is a leading-wildcard `ilike`** on title+excerpt only,
   the pattern BE/CLAUDE.md §3 bans, while `kb-search.service.ts` correctly uses the SECURITY
   DEFINER FTS probe. Same term, two different result sets.

## Gates run (all read, not assumed)

| Gate | Result |
|---|---|
| backend `tsc --noEmit -p tsconfig.json` | exit 2, **3 errors, all `src/modules/contacts/**`** — another agent's lane; 0 in calendar/kb/mail |
| frontend `tsc --noEmit` | **exit 0, 0 errors** |
| `jest src/modules/{kb,mail,calendar}` | **133 suites / 963 tests, all pass** |
| `jest --testPathPattern="(calendar\|kb\|mail).*(tenant-isolation\|isolation.spec)"` | **52 suites / 159 tests, all pass** |
| `jest features/{mail,inbox,calendar}` (frontend) | **19 suites / 131 tests, all pass** |
| `check:tenant-isolation` | **924 / 924, exit 0** |
| `check:mock-surface` | **0 phantoms, exit 0** (was 1) |
| `check:over-300` | red at 400 / baseline 394 — **none of them mine**; my sweep service crossed 300 and I extracted the helper to bring it back to 296, verified off the list |
| `eslint` on all 13 changed backend files | **exit 0, 0 problems** |
| `eslint` on all 4 changed frontend files | **0 errors**, 1 pre-existing `set-state-in-effect` warning at `mail-shell.tsx:80` (not my code) |

Bite proofs, each run and read: webhook isolation 4/9 red on predicate strip · KB ACL key 2/6 red
on key revert · comment permission model 4/8 red on seam strip · reminder paging 1/1 red on drain
revert. Every mutated file was restored from a backup and re-verified by `shasum -a 256 -c`.

## Files changed

**Backend, new** — `src/modules/calendar/calendar-keyset-drain.ts` ·
`src/modules/calendar/calendar-reminder-sweep-event-paging.spec.ts` ·
`src/modules/kb/core/kb-acl-cache-key.ts` · `src/modules/kb/core/kb-acl-cache-key.spec.ts` ·
`src/modules/kb/help-centre/kb-comment-permission-model.spec.ts` ·
`src/modules/mail/mail-cursor-roundtrip.spec.ts`

**Backend, modified** — `src/modules/calendar/`: `calendar-provider-webhook-tenant-isolation.spec.ts`
(rewritten), `calendar-reminder-sweep.service.ts`, `calendar-reminder-sweep-tenant-isolation.spec.ts`,
`calendar-source.registry.ts`, `calendar-source.registry.spec.ts`,
`calendar-events-aggregate.service.ts`, `calendar-events-aggregate.service.spec.ts`,
`calendar-aggregate-projection.spec.ts` · `src/modules/kb/core/`: `kb-access.service.ts`,
`kb-access.service.spec.ts` · `src/modules/kb/wiki/`: `kb-page-comments.service.ts`,
`kb-page-comments.controller.ts`, `kb-page-comments-tenant-isolation.spec.ts` ·
`src/modules/kb/help-centre/kb-comments.service.ts` ·
`src/modules/ai/core/gateway/ai-gateway.service.spec.ts` (coordinator-directed, spec-only)

**Frontend, new** — `frontend/features/mail/mail-account-revocation.test.tsx` ·
`frontend/features/mail/mail-open-marks-read.test.tsx`

**Frontend, modified** — `frontend/features/mail/mail-shell.tsx` ·
`frontend/features/mail/mail-list-pane.tsx`

**Ticket** — `.scratch/code-release-10-10/issues/29-module-matrix-calendar-inbox-knowledge.md`

No `FE/hooks/**`, `FE/lib/query*`, `FE/app/**`, `BE/migrations/**` or `BE/src/db/schema/**` file
was edited. `kb/retrieval/**` was read only. No git command was run.

---

# S8 · Ticket 29 — second pass

## Headline: the calendar provider-webhook receiver was dead *and* unauthenticated

The previous session committed `calendar-provider-webhook.controller.ts`, `calendar-webhook-secret.ts`,
`dto/provider-webhook.schemas.ts` and `calendar-provider-webhook-delivery.spec.ts` — and committed the
spec **5 red**. Three independent defects, all live:

1. **The route did not exist.** `CalendarProviderWebhookController` was imported at the top of
   `calendar.module.ts` but never added to its `controllers: []` array. Nest registers controllers from
   that array, so `POST /webhooks/calendar/provider` was unroutable. Provider drift detection — 110 lines
   of service, ~32 tests — still never ran.
2. **The secret check was imported and never called.** `handle()` imported `assertCalendarWebhookSecret`
   and declared the `x-calendar-webhook-secret` header parameter, then went straight to
   `this.webhooks.handleDelivery(...)`. The controller is `@Public()`, so the moment step 1 was fixed the
   endpoint would have accepted **any unauthenticated POST naming any `connectionId`**. The tenant is
   resolved from the connection row, so this was not a cross-tenant write — but it was an unauthenticated
   trigger for arbitrary provider-sync re-queues.
3. **The body schema was not `.strict()`.** A caller-supplied `orgId` was silently stripped rather than
   rejected — the exact failure mode the brief's rule 9 describes.

Fixed all three. `jest calendar-provider-webhook` → **3 suites / 32 pass** (was 5 failing).

## Two more calendar defects, both permanent divergence

**A re-claimed CREATE minted a duplicate provider event.** `ExternalCalendarSyncService.pushCreate`
carries no idempotency key, and `processRow` pushed unconditionally. If a worker pushed successfully and
then died before `mark(PROCESSED)`, the 90-second lease expired, the row was re-claimed, and a **second**
external event was created — with the local row's `externalEventId` overwritten to point at the new one,
orphaning the first in the user's real calendar forever. The sweep now skips the push when the event
already carries an external id.

**A failed DELETE was invisible and unretryable.** `deleteEvent` hard-deletes the local row and enqueues a
delete intent — the tombstone — but wrote `eventId: null`. Both `getSyncStatus` and `retrySync` key on
`eventId` *and* resolve visibility by reading the event row, which no longer exists. So a delete that
exhausted its 5 attempts sat in `FAILED` with **no status surface and no retry path**, and the provider's
copy of a deleted meeting lived forever. That is precisely the "no permanent local/external divergence"
requirement failing.

The tombstone now keeps the deleted event's id — `calendar_provider_sync_queue.event_id` has **no foreign
key** (verified against `migrations/0934_ar05_calendar_provider_sync_queue.sql`, where only `org_id` is an
FK), so retaining the id of a deleted row is exactly what a tombstone should do. `getSyncStatus`/`retrySync`
fall back to the tombstone's own author — the person `deleteEvent` already verified as the creator — when
the local row is gone. A bystander still gets a 404; the tombstone is not a hole in event visibility.

Also hardened: `mark()` now carries an explicit `org_id` predicate rather than leaning on RLS alone.

Proof: new `calendar-provider-divergence.spec.ts` → **7 pass**. Reverting the tombstone id turns 1 red,
reverting the idempotent-create guard turns 1 red, reverting the tombstone-aware status/retry turns 3 red.
Full module: **41 suites / 391 tests** (was 39/371).

## KB: two stale claims, one real fix, one repo-wide gate moved

Re-audited against current source. **Two of the ticket's "not satisfied" items are stale:**
- The ingestion lease **no longer fails open.** It returns a discriminated
  `{status: "acquired"|"contended"|"unavailable"}` with no boolean; no-Redis and Redis-error both refuse.
- A space-property ACL change **does** reindex — the sync moved inside `bumpSpaceAclRevision`, which both
  the spaces and members paths call symmetrically.

**Real and fixed here: lease contention burned the retry budget.** Contention was thrown as an ordinary
`Error`, and the outbox has *no* error classification — `outbox-envelope.ts` exports only
`nextRetryDelayMs` and `shouldDeadLetter`, and `handleFailure` treats every throw identically. So a
heavily-edited page could dead-letter after 8 contentions **without ever failing to index**. Contention now
suppresses the delivery, which is correct rather than merely lenient: the lease is held for the exact same
`(org, contentType, contentId)`, the indexer re-reads the live row rather than the payload, and every KB
content mutation emits its own `kb.content.index` — so suppressing a duplicate loses no write. I did not
touch `common/outbox/**`; adding a defer there would change retry semantics for all 28 consumers.

**The repo-wide isolation gate moved.** `kb-acl-isolation.spec.ts` was red
(`this.indexing.bumpSpaceAclRevision is not a function`) — the coordinator's item 2. It was double-vs-service
drift: the spec asserted `db.update(kbPages)`/`db.update(kbArticles)` inside `KbMembersService.remove`, but
that bump had moved into `KbIndexingService`. Rather than restore the assertion against a stub — which is
what drifted in the first place — the spec now constructs the **real** `KbIndexingService` over the same mock
db, so the two-table bump is behaviour again and cannot drift silently. Same treatment for the coordinator's
item 1: `kb-spaces-tenant-isolation.spec.ts` passed 2 constructor args to a 3-arg service.
`check:tenant-isolation:run` → **447 suites / 1816 tests, all pass** (was 444/446 with 2 red).

On the coordinator's item 3: I did not touch KB search plans, cache keys, `kb-candidate.service.ts` or any
`hnsw` setting. `SET LOCAL hnsw.iterative_scan = relaxed_order` is untouched.

## Frontend: closed the compose data-loss path

**`handleClose` unconditionally `reset()` the form.** Escape or an outside-click on the compose sheet
silently destroyed an unsent body, with no confirmation and nothing persisted anywhere — no localStorage,
no backend draft. Combined with the total absence of offline handling (confirmed: zero `onlineManager` /
`navigator.onLine` / `refetchOnReconnect` in `features/mail` and `features/inbox`), composing on a flaky
connection could lose a message with one keypress.

- New `use-mail-connectivity.ts` — subscribes to TanStack's `onlineManager` via `useSyncExternalStore`.
  (An effect + `setState` trips this repo's `react-hooks/set-state-in-effect` rule; `useSyncExternalStore`
  is the right primitive for an external store anyway.) Compose and reply now refuse to send while offline,
  save the draft, and say so — instead of firing a doomed request into a toast.
- New `mail-draft-storage.ts` — persists body and subject, keyed per-compose and per-replied-message so two
  replies never collide. Escape/outside-click now **preserves** and restores on reopen; the explicit
  **Discard** button clears; a successful send clears; a failed send persists and the error toast now
  carries a **Retry** action. Every access is try/caught, so a private window or a quota error degrades to
  "no draft" rather than breaking compose.

Proof: new `mail-draft-storage.test.ts` → **10 pass**, incl. 3 BITE cases (unparseable JSON, non-string
body, throwing `localStorage`). `jest features/(mail|inbox)` → **9 suites / 54 pass**.

## Gates (every one run and read)

| Gate | Result |
|---|---|
| `check:cache-invalidation` | exit 0 — LOW-only, 0 blockers, 1072 files |
| `check:idempotent-commands` | exit 0 — OK, every in-scope handler carries `@Idempotent` |
| `check:outbox-consumers` | exit 0 — OK (and confirms `kb.content.delete` is consumed by nobody's emit) |
| `check:unbounded-reads` | exit 0 — 0 offset, 0 unbounded |
| `check:tenant-indexes` | FAIL 7/828 — **none mine** (build ×4, crm, auth, releases) |
| `check:tenant-isolation` (declaration) | FAIL 1 — `cron-gdpr-export-retention.service.ts`, another agent's new untracked file |
| `check:tenant-isolation:run` (execution) | **447 suites / 1816 tests, all pass** |
| `check:spec-typecheck` | FAIL — 18 `modules/storage`, 2 `degradation`, 1 `rbac`; **0 in calendar/kb/mail** |
| backend `pnpm typecheck` | exit 2 — 3 errors, all `feedbucket` + `storage` `AfterCommitHook`; **0 in my modules** |
| `jest src/modules/(calendar\|kb\|mail)` | **136 of 137 suites / 980 tests pass** |
| frontend `pnpm type-check` | **exit 0** |
| frontend `check:query-scope` | exit 0 — no violations, 5184 files |
| frontend `check:command-catalog` | exit 0 — PASS |
| `jest features/(mail\|inbox)` | **9 suites / 54 tests pass** |
| `eslint` on my 4 frontend files | **0 problems** |

## Not mine — regressed mid-session, reported not fixed

`sharp.concurrency is not a function` in `src/common/media/media-compression.service.ts` (reached via
`src/modules/storage/storage.service.ts`) breaks `src/modules/kb/wiki/kb-media.service.spec.ts` at import
time — the one red suite above. It ran green earlier in this same session and stopped mid-way; `git status`
shows `common/media` and twelve `modules/storage` files modified by another agent, plus a new untracked
`storage/media-transform.runner.ts`. Same root cause as the 18 storage `check:spec-typecheck` errors and
the 3 backend typecheck errors. **Ticket 33's territory** — I did not touch it.

Also note `src/modules/kb/wiki/kb-media.service.ts` and `src/modules/kb/core/kb-tags.service.ts` are
modified in the shared tree by another agent, inside my nominal territory. I staged neither.

## Files changed this pass

**Backend, new** — `src/modules/calendar/calendar-provider-divergence.spec.ts`

**Backend, modified** — `src/modules/calendar/`: `calendar.module.ts`, `calendar.service.ts`,
`calendar-provider-webhook.controller.ts`, `calendar-provider-sync-sweep.service.ts`,
`calendar-sync-status.service.ts`, `dto/provider-webhook.schemas.ts` ·
`src/modules/kb/retrieval/`: `kb-ingestion-consumer.ts`, `kb-ingestion-consumer.spec.ts`,
`kb-ingestion-lease-fail-closed.spec.ts`, `kb-acl-isolation.spec.ts` ·
`src/modules/kb/wiki/kb-spaces-tenant-isolation.spec.ts`

**Frontend, new** — `features/mail/use-mail-connectivity.ts` · `features/mail/mail-draft-storage.ts` ·
`features/mail/mail-draft-storage.test.ts`

**Frontend, modified** — `features/mail/mail-compose-sheet.tsx`

No `migrations/**`, `db/schema/**`, `modules/ai/**`, `modules/storage/**`, `common/telemetry/**`,
frontend `lib/**` or frontend `hooks/api/**` file was touched.

---

# S9 · Ticket 29 — Inbox/mail frontend, closed

Scope of this pass: **frontend only**, `features/inbox/**`, `features/mail/**` and the one shared
hook they both needed. No backend file, no `hooks/api/**`, no `lib/**`, no `app/**`, and nothing
under `features/{chat,notifications,directory,hr,build,calendar}` was touched. The four Inbox/mail
**backend** sub-criteria ticket 29 found unimplemented are untouched and still open.

## Headline: the compose draft was saved on Escape and could never be restored

`MailComposeSheet` had never been mounted in a test — ticket 29 proved the draft feature only
through `mail-draft-storage.ts` unit tests. Mounting it showed the storage layer was fine and the
component was not. The restore branch read:

```
} else if (mode.type === "compose" && (prev.type === "reply" || !open)) {
```

`!open` is unreachable — the effect returns three lines above on `if (!open) return;`. And `prev`
is the *previous mode*, which on every ordinary reopen is `{type: "compose"}`, not a reply. So the
only path that ever restored a compose draft was a reply→compose transition. Escape saved the body
to `localStorage` and the next open showed an empty editor: the data-loss path the S8 pass believed
it had closed was still open, one layer up from the code its tests covered.

The effect now keys on a **closed→open transition** or a change of `mailDraftKey(mode)`, which also
stops a re-rendered `mode` object from resetting a reply mid-typing. Proof:
`features/mail/mail-compose-sheet.test.tsx` → **6 pass**. Restoring the original effect verbatim
turns **2 red**; a narrower mutation (`wasOpen ||` instead of `wasOpen &&`) also turns **2 red**.
The file was restored from backup and re-verified by `shasum -a 256` after each bite run.

## Thread hydration seeds the detail cache, and the seed is born stale

`features/mail/mail-thread-seed.ts` (new) converts a `MailMessageSummary` into a
`MailMessageDetail` and writes it to `queryKeys.mail.thread(accountId, threadId)`, or to
`queryKeys.mail.message(accountId, id)` when the row carries no thread. `mail-shell.tsx` calls it
from the open handler.

The correctness risk here is the opposite of the speed win: a seeded cache that never refreshes is
a stale-data bug. The seed is written with `{ updatedAt: 0 }`, so `dataUpdatedAt` is `0` and the
entry is already past `useMailThread`'s `staleTime: 2 * 60_000` — `refetchOnMount` fires the real
request on the first render. It also refuses to overwrite a thread the cache already holds, so a
re-open of a fully hydrated thread is not downgraded to a one-message stub.

`MailReadingPane` derives `isHydrating` from `isFetching` plus a message with neither `bodyHtml`
nor `bodyText`, and `MailThreadMessage` renders a body skeleton for that case instead of a
premature "No content". Opening a message is now subject-and-sender-first with a body placeholder,
not a full-pane skeleton.

Proof: `mail-thread-seed.test.tsx` → **6 pass**, including a BITE case that seeds through a plain
`setQueryData` (no `updatedAt`) and asserts the api client is **never called** and the body stays
empty — the exact stale-data failure. `mail-thread-hydration.test.tsx` → **5 pass**: MailShell
writes the key on click, `dataUpdatedAt === 0`, and the pane shows skeleton / "No content" /
real body in the three matching states.

## The offline hook moved by deletion, not duplication

The brief's remainder said to move `features/mail/use-mail-connectivity.ts` to a shared location.
`hooks/common/use-online-status.ts` already existed and already answered the same question for the
shell's global offline banner and for notifications — so adding a second connectivity hook beside
it would have been the duplication the remainder warned against. Instead:

- `features/mail/use-mail-connectivity.ts` is **deleted**.
- `hooks/common/use-online-status.ts` keeps its single `useOnlineStatus(): boolean` export but is
  rewritten onto `useSyncExternalStore` over the window `online`/`offline` events. This removes
  that file's pre-existing `react-hooks/set-state-in-effect` warning, and makes the first render
  read `navigator.onLine` instead of optimistically returning `true` and correcting in an effect.
  `components/__tests__/authenticated-surface-states.contract.test.ts` asserts the file registers
  both listeners; it still does, and that suite plus `shell-offline-banner`,
  `notifications-offline-indicator` and `shell-a11y` were re-run — **4 suites / 43 pass**.
- `features/mail/mail-compose-sheet.tsx` and `features/inbox/**` both import the shared hook. No
  feature→feature import; net one fewer file.

`features/inbox/use-inbox-actions.ts` (new) holds every inbox mutation handler behind a
connectivity guard. Explicit actions (archive, unarchive, delete, pin/unpin, snooze, approve,
reject, the drawer's Mark read) refuse while offline and say why; the **passive** mark-read that
fires when a notification is opened is skipped silently, because toasting on every click while
offline is noise, not information. `isOnline` also reaches `InboxVirtualList`: with TanStack's
default `networkMode: "online"` an offline `fetchNextPage` is *paused*, so `isFetchingNextPage`
stays false and "Load more" looks clickable and does nothing — it is now disabled and labelled.
Extracting the handlers also took `inbox-shell.tsx` from 325 lines to 294.

Proof: `features/inbox/inbox-offline.test.tsx` → **6 pass**, including an online baseline (the
guard is not a blanket block) and a reconnect case (the action works again with no remount).

## Sanitization: proven on the render path, not only in isolation

`mail-html-viewer.test.tsx` mounts the viewer directly and `mail-html-render-boundary.test.ts` is a
source scan for `dangerouslySetInnerHTML`. Together they show the sanitizer works and is the only
raw renderer — but neither shows a thread body actually reaching it. New
`features/mail/mail-body-sanitization.test.tsx` renders `MailReadingPane` over a thread whose
`bodyHtml` carries `<script>`, an `onerror` handler, a `javascript:` href, an `<iframe>` and a
remote tracking pixel, and asserts against the real DOM: no script tag, no global set, no iframe,
no `javascript:`, the pixel's `src` moved to `data-blocked-src` with the "1 remote image blocked"
banner, and the legitimate link hardened with `target="_blank" rel="noopener noreferrer"`.
**5 pass**, including a BITE case that parses the same payload with a bare `innerHTML` to prove it
is genuinely hostile.

One incidental finding, benign: DOMPurify strips a `javascript:` href entirely, leaving
`<a>Click here</a>` — and the viewer's `/<a(\s)/gi` link-hardening regex therefore skips it, since
there is no attribute whitespace. Correct behaviour (a hrefless anchor needs no `rel`), but worth
recording so nobody "fixes" the regex into matching hrefless anchors.

## Optimistic read/label rollback — audited, already satisfied on both sides

Read-only audit, no change needed. `useMailAction` (`hooks/api/mail.ts`) snapshots every
`mail.messages` and `inbox.unified` infinite page in `onMutate` and restores all of them in
`onError`. Every optimistic notification mutation in `hooks/api/notifications-inbox.ts` —
mark-read, mark-all-read, archive, unarchive, delete, pin, unpin, snooze, and the three bulk
variants — carries an `onError` that restores both the list snapshots and the unread count. There
is no unrollbacked optimistic update left in either feature.

## Defects and debt fixed alongside

1. **A circular import, introduced by the S8 pass.** `mail-draft-storage.ts` imported
   `MailComposeMode` back from `mail-compose-sheet.tsx`, which imports the storage functions —
   `madge --circular` reported **1** cycle, against a repo that root §9 says stands at zero. Fixed
   per §9 rule (1): the type moved to the neutral `mail-compose-schema.ts` (the sheet re-exports it
   so no call site changed meaning). `madge --circular` → **0**.
2. **`features/inbox` and `features/mail` were carrying 12 lint errors.** Six
   `streamline/no-raw-visual-values` (`text-[13px]` → `text-label`, `text-[11px]` → `text-dense`,
   `text-[9px]` → `text-micro` — the first two are exact token matches), four
   `react-hooks/use-memo` (`useCallback(getRowKey, [])` in both virtual lists), and two unused type
   imports. Territory lint is now **0 errors**; the one remaining warning
   (`mail-shell.tsx:83 set-state-in-effect`) is pre-existing and untouched.
3. Three inline arrows in JSX event props in `inbox-shell.tsx` replaced with named handlers
   (`handleRetry`, `handleLoadMore`, and an extracted `InboxViewTab`), per the repo's handler rule.

## Gates (each run and read)

| Gate | Result |
|---|---|
| `pnpm type-check` | **exit 0**, 0 errors |
| `jest --runInBand --testPathPattern="inbox\|mail"` | **exit 0 — 18 suites / 133 tests pass** (was 13 / 105) |
| `jest --runInBand --testPathPattern="features/(mail\|inbox)"` | **exit 0 — 14 suites / 82 tests pass** (ticket 29 left this at 9 / 54) |
| `jest` over the changed hook's consumers (`shell-offline-banner`, `notifications-offline-indicator`, `shell-a11y`, `authenticated-surface-states`) | **exit 0 — 4 suites / 43 pass** |
| `check:icon-labels` | **exit 0** — 3796 files, none unlabelled |
| `check:query-scope` | **exit 0** — 5206 files, no violations |
| `check:command-catalog` | **exit 0** — PASS, 66 gated / 4 off-contract |
| `check:empty-states` | **exit 1 — NOT MINE.** Single offender `features/workflows/builder/workflow-builder-canvas.tsx:118`; that file is unmodified in the working tree, so the failure predates this pass. Zero offenders in `features/inbox` or `features/mail`. |
| `check:over-300` | **exit 0** — 519 of 5192, baseline 519, unchanged |
| `madge --circular` | **exit 0 — no circular dependency** (was 1 before this pass) |
| `eslint features/mail features/inbox hooks/common/use-online-status.ts` | **0 errors, 1 pre-existing warning** (was 12 errors / 4 warnings) |

Bite proofs, each run and read: compose restore **2 red** on reverting the effect (twice, two
different mutations) · thread seed BITE asserts the no-`updatedAt` seed never refetches · inbox
offline BITE is the online baseline · sanitization BITE parses the payload raw. Every temporarily
mutated file was restored and re-verified by `shasum -a 256`.

## Cross-territory findings — reported, not fixed

1. **The unified inbox gets no optimistic patch from notification mutations.**
   `hooks/api/notifications-inbox.ts` patches only `queryKeys.notifications.lists()` in `onMutate`;
   `queryKeys.inbox.unified(...)` is merely *invalidated* in `onSettled` (via `invalidateInbox`).
   `useMailAction` does patch both. So archiving a notification from `/inbox` shows a pending row
   until the refetch lands, where archiving the same notification from `/notifications` is instant.
   The rollback is correct either way — this is a consistency gap, not a correctness one. Fix
   belongs in `hooks/api/**` — **ticket 28's territory**.
2. **`hooks/common/use-online-status.ts` now has two shapes of consumer.** The shell banner and
   `features/notifications/inbox/notifications-inbox-page.tsx` consume it for display; mail and
   inbox now consume it to gate writes. The export signature is unchanged and all four consumer
   suites pass, but whoever owns `features/notifications` should know the implementation moved from
   an effect to `useSyncExternalStore`.
3. Still true from S7/S8 and untouched here: **mail send is idempotent on paper only** —
   `@Idempotent("mail.send")` is on the route but `lib/api-client.ts:150-153` mints a fresh UUID per
   HTTP call, so the Retry action added to the failed-send toast issues a genuinely new send rather
   than a replay. `lib/**` — **ticket 28's territory**. This is the one place where the retry
   affordance this box ships is weaker than it looks.

## Files changed this pass

**Frontend, new** — `features/mail/mail-thread-seed.ts` · `features/mail/mail-thread-seed.test.tsx` ·
`features/mail/mail-thread-hydration.test.tsx` · `features/mail/mail-compose-sheet.test.tsx` ·
`features/mail/mail-body-sanitization.test.tsx` · `features/inbox/use-inbox-actions.ts` ·
`features/inbox/inbox-offline.test.tsx`

**Frontend, modified** — `hooks/common/use-online-status.ts` · `features/mail/mail-shell.tsx` ·
`features/mail/mail-reading-pane.tsx` · `features/mail/mail-thread-message.tsx` ·
`features/mail/mail-compose-sheet.tsx` · `features/mail/mail-compose-schema.ts` ·
`features/mail/mail-draft-storage.ts` · `features/mail/mail-draft-storage.test.ts` ·
`features/mail/mail-virtual-list.tsx` · `features/mail/mail-open-marks-read.test.tsx` ·
`features/inbox/inbox-shell.tsx` · `features/inbox/inbox-virtual-list.tsx` ·
`features/inbox/inbox-item-card.tsx` · `features/inbox/inbox-virtual-list.test.tsx`

**Frontend, deleted** — `features/mail/use-mail-connectivity.ts`

**Ticket** — `.scratch/code-release-10-10/issues/29-module-matrix-calendar-inbox-knowledge.md`

---

# S10 pass — the schema and migration boxes, now that they are in territory

The previous pass marked four boxes BLOCKED on "schema and migrations are off-limits". This
pass had them. **Two of the four named schema defects turned out to be already fixed**, one was
real, and the two mail defects were both real and both worse than described.

## 1. Re-verification of the four named defects, against the live catalog

Measured on `scratch_perf_seed` (journal head) with `psql`, not against the ticket notes.

| Named defect | Verdict |
|---|---|
| `kb_space_grants.space_id → kb_spaces(id)` is a bare single-column FK | **STALE in SQL, REAL in Drizzle.** `0965_ar02_canonical_tenant_fks_3.sql:392-401` already added the composite `fk_kb_space_grants_space_id_org (org_id, space_id) → kb_spaces(org_id, id)`, and `0972_ar02_drop_superseded_tenant_fks_3.sql:55` already drops the single-column `fk_kb_space_grants_space`. Both are journalled and applied. What was still true is the **second half** of the ticket's sentence: the Drizzle table declared no FK at all, so the next `db:generate` would have proposed dropping a live tenant constraint. Fixed in the declaration only — no migration is owed. |
| `kb_ingestion_checkpoints` has no uniqueness | **STALE.** `uniq_kb_ingestion_checkpoint (org_id, content_type, content_id, chunk_index)` exists in `migrations/0701` and in `db/schema/support/kb-ingestion-checkpoints.ts:29-35`, and is live in `pg_indexes`. Also note the table is under `schema/support/`, not `schema/kb/`, and its only service (`kb-ingestion-checkpoint.service.ts`) is in `kb/retrieval/**` — both outside this session's territory anyway. |
| `kb_page_links` record links have no uniqueness | **REAL, and fixed.** `uniq_kb_page_links_source_target` is `(source_page_id, target_page_id)`, and for a record link `target_page_id` is NULL. NULLs are distinct in a btree, so that index constrains the record grain not at all. `kb-page-record-links.service.ts:34-44` was a read-then-insert with nothing behind it. |
| Mail ordering and search | **REAL, both, and the paging one is a hard "cannot scroll".** See §3. |

**Correction to the ticket's wording on search.** "Mail search does not work at all today" is not
right. Provider search works: `mail.controller.ts:81` passes `query.q` down, `mail.service.ts`
forwards it to `gmail.listMessages`/`outlook.listMessages`. What is dead is the **database**
search — `listCached`'s `query` parameter has zero callers, and so does `isFreshForAccount`.
Both are now live.

## 2. `kb_page_links` — the record-link grain gets a constraint

`migrations/1021_t29_kb_page_links_record_unique.sql`: a partial
`UNIQUE (org_id, source_page_id, target_type, target_id) WHERE target_id IS NOT NULL`, preceded
by a self-join DELETE of pre-existing duplicates (0 on the seeded database, so the index built
without a repair). `KbPageRecordLinksService.add` no longer reads first — it inserts and maps
`23505` to `ConflictException` through `getPostgresErrorCode`, which walks Drizzle's `cause`
chain, so the wrapped form is caught too.

**On making the polymorphic pointer referential — it cannot be, and here is why rather than a
silent open box.** `target_type` ranges over seven entity types in five modules
(`RECORD_LINK_TARGET_TYPES`: `crm_lead`, `crm_deal`, `crm_contact`, `project`, `project_ticket`,
`support_ticket`, `hr_employee`) and `target_id` is `text` because those tables do not share a
key type. An exclusive arc would put seven nullable FK columns on `kb_page_links` reaching into
five other modules' schemas, which backend/CLAUDE.md §1 forbids outright. It stays what §3
grandfathers: a display/dedupe pointer. The thing §3 actually requires of a grandfathered pair
is that it never be the sole path to resolve, join or cascade a record — and it is not:
`listByRecord` joins only `kb_page_links → kb_pages` (its own composite tenant FK) and treats
the pair as opaque text.

## 3. Mail — the two real product defects

### 3a. The cached page was a dead end

`mail.service.ts:65-88` served page one from `mail_message_metadata` and returned
`nextCursor: null` **unconditionally**. So on the single-account path with a fresh mirror — the
ordinary case — the inbox showed `limit` messages and "load more" did nothing, forever. That is
the whole of "ordering is not stable": the DB-ordered path was not a paging regime at all, it
was one page.

Fixed by giving the mirror its own keyset cursor:

- `providers/mail-metadata-cursor.ts` (new) — `{ d: ISO date | null, i: id }`, HMAC-signed and
  reader-bound exactly like the provider cursor, but under a **different version prefix**
  (`md1` vs `m1`) so neither decoder can read the other's cursor. That is what lets the regime
  be chosen once, at page one, and held for the whole scroll. Mixing them mid-scroll is what
  repeats and skips rows.
- `providers/mail-cursor-signing.ts` (new) — the HMAC key derivation, previously private to
  `mail-normalizers.ts`, extracted so both namespaces share one definition and neither imports
  the other's internals. `mail-normalizers.ts` drops from 495 to 421 lines.
- `mail-metadata.service.ts` — `listCached` orders by `(date DESC, id DESC)`, fetches
  `limit + 1`, and returns a `nextCursor` from the last row of the page.
- `mail.service.ts` — a metadata cursor continues in the database and an exhausted one **ends
  the scroll** rather than falling through to the provider, where it would decode as "no
  position" and replay page one.

The null-date branch is a real branch, not defensive noise: `date` is nullable and Postgres
sorts DESC NULLS FIRST, so a null-dated cursor is a position inside the leading block. A bare
row comparison `(date, id) < (NULL, i)` evaluates to NULL and would drop **every dated row** —
pinned by a BITE case.

### 3b. Search had no index a leading wildcard could use, and RLS meant an ordinary one would not have helped

`mail-metadata.service.ts:125-134` was three leading-wildcard `ILIKE`s. Adding a GIN trigram
index alone does not fix that here, because `mail_message_metadata` has RLS on
(`tenant_isolation: org_id = app.current_org_id()`) and `texticlike` is `proleakproof = false`,
so the planner must evaluate the security qual first and refuses the index — measured below, the
"before" plans never touch the trigram index even when it exists.

`migrations/1022` therefore follows the 0424/0425/0453 pattern: `app.search_mail_message_ids`,
SECURITY DEFINER, org from `app.current_org_id()` and never a parameter, ids only, EXECUTE
revoked from PUBLIC, caller asks for `cap + 1` (cap 500) and falls back to the plain ILIKE at
the cap. `p_membership_id`/`p_folder` are narrowing parameters only — the outer query re-applies
both under RLS, so safety does not move into the function.

The index is one GIN trigram over
`coalesce(subject,'') || chr(1) || coalesce(sender_name,'') || chr(1) || coalesce(sender_email,'')`
rather than three separate ones, on a table that is upserted on every inbox load. `chr(1)`
cannot appear in a query string that reached the Zod boundary, so a term can never span a
separator and the single match is **exactly** the OR of three column ILIKEs. Verified on the
seeded copy over eight terms, including two deliberate boundary-spanning probes:

```
term                or_of_three   concat_expr
Zephyrine                    27            27
Invoice                      15            15
sender17@example             60            60
Sender 42                   548           548
quarter                      42            42
filing 7                      2             2
e Sender                      0             0     <- spans subject|sender_name
team sender                   0             0     <- spans subject|sender_name
```

The function also asserts `strpos(p_q, chr(1)) = 0`, so the equivalence holds unconditionally
rather than by convention.

## 4. Measurement

`scratch_t29`, my own copy: schema dumped from `scratch_perf_seed` at journal head (1,025 tables,
982 RLS policies, `streamline_app` grants intact), then 257,850 mail rows seeded across the
seed's four perf tenants and topped up to a realistic per-mailbox depth (30,450 in each measured
mailbox). Final tenant split 255,000 / 57,000 / 33,600 / 32,250. `VACUUM ANALYZE` after every
load. All reads as the **non-owner `streamline_app`** with `app.organization_id` set, in
**buffers**, across **four tenants**.

Why the top-up: at the seed's own mail volume (4,448 rows, ~200 per mailbox) every plan is
degenerate — a seq scan of 4,448 rows beats any index and the measurement says nothing. That is
report 00 §1's trap, and it is why the first run of this benchmark read 47-98 buffers for
everything.

### Search, LIMIT 50

| term | matches | before: leading-wildcard ILIKE | after: definer + trigram |
|---|---|---|---|
| `Zephyrine` | 27 | **13,595** (majority) · 13,814–13,820 (three minorities) | **693–697** |
| `Invoice` | 15 | **13,595** · 13,814–13,817 | **573–575** |
| `update` | >cap | 13,595 (majority) · **92** (minorities) | falls back to ILIKE — unchanged, deliberately |

About **20× fewer buffers** on a selective term, consistently across the skew.

Two things worth keeping:

- **The plans genuinely differ per tenant.** The majority tenant takes a BitmapAnd on
  `idx_mail_metadata_search`; the three minority tenants walk `idx_mail_metadata_list_keyset`.
  A single-tenant reading would have shown one of these and missed the other.
- **The `update` row is why the cap exists.** A term matching most of the mailbox is *already*
  fast as an ILIKE under `LIMIT` (92 buffers on the minorities) because the scan stops as soon
  as it has 50 rows, while a materialised id list would have to be built in full first. That
  92 is not a number to "improve"; the fallback is there to preserve it.
- Inside the definer the plan is `BitmapAnd(idx_mail_metadata_search_trgm, idx_mail_metadata_search)`
  — the trigram index is reached only there, which is the whole point of the SECURITY DEFINER
  escape.

### Keyset paging, page 2, LIMIT 50

| tenant | with `idx_mail_metadata_list_keyset` | without it |
|---|---|---|
| majority | **60** | 102 (Incremental Sort over the prefix index) · **13,592** once the prefix index is gone too |
| tiny | **60** | 102 |

### And the prefix index is dropped, on measurement not on containment

`idx_mail_metadata_list (org_id, user_membership_id, folder, date DESC)` is a strict prefix of
the new keyset index. Migration 1007 is the standing warning that prefix containment proves
*reachability*, not *cost*, so it was measured rather than reasoned. Page one — the exact shape
`read-cost-budgets.mjs` "mail-inbox-cached" asserts:

| tenant | both indexes | keyset only |
|---|---|---|
| majority | 92 | **95** |
| tiny | 89 | **92** |

Three buffers, still an Index Scan (the budget's `forbid-seq-scan` assertion holds), against
**49 MB** of index on an **89 MB** table and one more B-tree maintained on every row of a mirror
that is rewritten on every inbox load. Dropped in 1022.

## 4b. KB — the other read-then-inserts, and two notes that were wrong

Migration `1040_t29_kb_membership_and_template_uniques.sql`.

`KbMembersService.add` (`kb-members.service.ts:90-105`) checked for an existing grant on
`(org_id, space_id, membership_id)` and, independently, on `(org_id, space_id, role)`, with no
unique behind either — the same shape as the record links. On a space ACL a duplicated grant is
worse than noise: the second row is invisible to whoever revokes the first. Both grains now have
a partial unique, each restricted to its own column so a role grant and a membership grant still
coexist in one space, and the service inserts and maps `23505` to 409 with the right message per
constraint name.

`KbPageTemplatesService.create` had no check at all, while `list()` orders by name and shows
nothing else — two templates sharing a name were indistinguishable to the person picking one.
`(org_id, name)` is now the per-org key it already read as. `list()` was also **completely
unbounded** (no limit, no cursor); capped at 200.

The de-duplicating DELETEs remove only rows identical on *every* meaningful column. A pair that
disagrees — same member, two different `space_role`s — deliberately fails the CREATE UNIQUE
INDEX rather than being resolved: silently keeping one of two conflicting grants is a permission
change made by a migration. Measured first: 0 duplicates on all three tuples on the seeded
database, so both DELETEs are no-ops there.

Verified by inserting through the real constraints on `scratch_t29`, not only in a mock:

```
BITE-1 second identical member          -> ERROR 23505 uniq_kb_space_members_org_space_membership
BITE-2 second same-name template        -> ERROR 23505 uniq_kb_page_templates_org_name
CONTROL another org, same name          -> INSERT 0 1
CONTROL role grant beside a membership  -> INSERT 0 1
CONTROL a second member in that space   -> INSERT 0 1
```

**Two of the ticket's named gaps are not defects, and are left alone on purpose.**

- `uniq_kb_pages_public_token` being a bare global unique is **correct**.
  `KbPagesService.getPublicPage(token)` resolves by token alone on a `@Public()` route, so the
  token *is* the tenant selector and must be globally unique and globally indexed; a composite
  `(org_id, public_token)` would break the only lookup that uses it. And it is 24 random bytes
  (`randomBytes(24)`, `kb-pages.service.ts:334-336`), not a tenant-supplied business key, so the
  cross-tenant DoS backend/CLAUDE.md §3 guards against cannot occur.
- `kb_article_restrictions` has **no writer** anywhere in `src/modules/` — only
  `kb-access.service.ts`, `kb-candidate.service.ts` and `support-ai-triage-data.service.ts`, all
  reads. A unique there would back no assumption and would be a guess at a natural key nothing
  asserts.

And one that is real but out of territory: `uniq_kb_chunks_article_revision` /
`_page_revision` are live and undeclared in Drizzle, on `kb_article_chunks`
(`db/schema/support/kb-chunks.ts`) — `schema/support/`, not `schema/kb/`. The companion claim
about `idx_kb_page_templates_org` is stale in the other direction: that index does not exist
live, and `uniq_kb_page_templates_org_name` is org-leading so none is owed.

## 5. Calendar

The S8 fixes hold: `jest src/modules/calendar` → **42 suites / 396 tests pass, exit 0** (was
41/391 at S8; the delta is this pass's new spec).

The backend half of open item (b) is closed. `calendar_events.timezone` drove occurrence
expansion but stopped at the source: `calendar-native-event-source.ts` selected it and did not
put it in `meta`, so `projectionToItem` had nothing to project and `CalendarEventItem` had no
field. All three now carry it, `null` for aggregate sources with no authored zone. The client
half — rendering it instead of labelling browser-local times with the browser's zone — is
`hooks/api/**` and `event-detail-content.tsx`, ticket 28/25 territory.

## 6. What I could not do, and why

- **(a) the HR second calendar surface** — `frontend/features/hr/recruitment/interviews-page.tsx`.
  Frontend, ticket 25.
- **(b) timezone reaching the UI** — backend done here; `hooks/api/calendar.ts` is ticket 28.
- **(c) "this and following"** — a series-split product feature, not a defect. Nothing in either
  repo implements it; `event-series-scope-dialog.tsx:15` still offers `occurrence | series`.
- **(d) source toggles in the query key** — `lib/query-keys/platform-hierarchy.ts`, ticket 28.
- **Mail unread, incremental sync, idempotent send/receive, bounce/retry/DLQ** — each is a
  platform feature rather than a defect in an existing path, and each is larger than the two
  this pass fixed. They stay open with the S8 findings intact.

## 7. Cross-territory findings

1. **`src/scripts/read-cost-budgets.mjs:838-873`** — the `mail-inbox-cached` budget's SQL is
   `ORDER BY date DESC` and its comment names `idx_mail_metadata_list on (org_id, user_id, folder,
   date DESC)`. Both are now stale: the service orders by `date DESC, id DESC` and the index is
   `idx_mail_metadata_list_keyset`. The budget still **passes** (Index Scan, no seq scan, 95/92
   buffers) — it is the description that drifted. One-line fix, not mine to make.
2. **`check:tenant-relationships` default target is misleading.** It reports **627** actionable
   single-column tenant FKs, including `fk_kb_space_grants_space`, because it defaults to
   `scratch_boot_a`, whose ledger is only partly replayed — the script's own TARGET CAVEAT.
   Against a database at head it is **0**: `TENANT_RELATIONSHIP_DB_URL=…/scratch_perf_seed
   check:tenant-relationships --db-only` → *Ledger rows on target 659 of 662 · Total single-col
   FKs 214 · Actionable 0 · exit 0*. Anyone reading 627 as a release number is reading
   `scratch_boot_a`.
3. **Another agent's commit `f4c7bdf5` swallowed `migrations/meta/_journal.json`** with this
   ticket's two new entries in it, while the two `.sql` files were still untracked — so between
   that commit and this one, HEAD named two migrations with no file on disk
   (`check:migration-discipline` rule 8). Committed here. This is the shared-index hazard the
   brief describes, arriving from the other direction: not a pathspec that took too much, but a
   file another agent had no reason to know was mid-edit.
4. **A duplicate constraint I created and then removed.** The first draft of this pass added
   `fk_kb_space_grants_org_space` before discovering 0965 had already added the identical
   constraint under a different name. Another agent's bootstrap applied it to
   `scratch_perf_seed` before I caught it. The migration was withdrawn (file, rollback and
   journal entry all removed) and the duplicate dropped from both `scratch_perf_seed` and
   `scratch_t29`; `kb_space_grants` now carries exactly `fk_kb_space_grants_org`,
   `fk_kb_space_grants_granted_by` and `fk_kb_space_grants_space_id_org` on both.

## 8. Gates — literal command, exit code, number

| Command | Exit | Number |
|---|---|---|
| `pnpm typecheck` | **0** | 0 errors |
| `jest --testPathPattern="src/modules/calendar"` | **0** | 42 suites / 396 tests pass |
| `jest --testPathPattern="src/modules/mail\|kb-page-record-links\|calendar-item-timezone"` | **0** | 15 suites / 115 tests pass |
| `jest --testPathPattern="src/modules/kb/wiki"` | **0** | 34 suites / 197 tests pass |
| `check:migration-discipline` | **0** | 662 SQL files, 0 new violations |
| `check:migration-rollback` | **0** | 662 scanned, all rollback checks pass |
| `check:tenant-indexes` | **0** | 839 / 839 tenant tables lead with the tenant column |
| `check:tenant-relationships --db-only` (→ `scratch_perf_seed`) | **0** | 214 single-col FKs, **0 actionable** |
| `check:restrict-fks` | **0** | 345 schema files |
| `check:unbounded-reads` | **0** | no violations |
| `check:cache-invalidation` | **0** | — |
| `check:record-access` | **0** | — |
| `check:import-direction` | **0** | 219 files, 0 new |
| `check:kebab-case` | **0** | 6,291 entries, 0 violations |
| `madge --circular` | **0** | 5,507 files, **0 cycles** |

**Red, and not mine** — each verified to be outside `mail/`, `kb/`, `calendar/` and
`db/schema/{mail,kb,calendar}`:

| Command | Exit | Where it fails |
|---|---|---|
| `check:spec-typecheck` | 2 | 1 error, `src/modules/gdpr/gdpr-erasure-chat-attachments.spec.ts:213` |
| `check:tenant-isolation` | 1 | 1 uncovered service, `src/modules/organization/setup/org-setup-completed-consumer.service.ts` (arrived in `f4c7bdf5`) |
| `check:file-sizes` | 1 | `src/modules/access/access-permission.resolver.ts` at 507 lines |
| `check:db-call-count` | 1 | 1 unclassified + 8 stale verdicts, all in `access/`, `build/`, `cron/`, `finance/`, `hr/`, `notifications/` |

**Not run:** `pnpm test:e2e` (including `test/kb-page-record-links.e2e-spec.ts`), `pnpm lint`,
`check:openapi-*`, `check:contract-registry`.

## 9. Files changed this pass (backend)

**New** — `migrations/1021_t29_kb_page_links_record_unique.sql` ·
`migrations/1022_t29_mail_metadata_search_and_keyset.sql` ·
`migrations/rollback/1021_t29_kb_page_links_record_unique.down.sql` ·
`migrations/rollback/1022_t29_mail_metadata_search_and_keyset.down.sql` ·
`src/modules/mail/providers/mail-metadata-cursor.ts` ·
`src/modules/mail/providers/mail-cursor-signing.ts` ·
`src/modules/mail/mail-metadata-keyset-search.spec.ts` ·
`src/modules/mail/mail-list-paging-regime.spec.ts` ·
`src/modules/kb/wiki/kb-page-record-links-uniqueness.spec.ts` ·
`src/modules/calendar/calendar-item-timezone.spec.ts` ·
`migrations/1040_t29_kb_membership_and_template_uniques.sql` ·
`migrations/rollback/1040_t29_kb_membership_and_template_uniques.down.sql` ·
`src/modules/kb/wiki/kb-membership-uniqueness.spec.ts`

**Modified** — `migrations/meta/_journal.json` · `src/db/schema/common/access.ts` ·
`src/db/schema/kb/pages.ts` · `src/db/schema/mail/mail-metadata.ts` ·
`src/modules/mail/mail.service.ts` · `src/modules/mail/mail-metadata.service.ts` ·
`src/modules/mail/providers/mail-normalizers.ts` ·
`src/modules/kb/wiki/kb-page-record-links.service.ts` ·
`src/modules/calendar/calendar.types.ts` ·
`src/modules/calendar/calendar-events-aggregate.service.ts` ·
`src/modules/calendar/calendar-native-event-source.ts` · `src/db/schema/kb/spaces.ts` ·
`src/db/schema/kb/page-collab.ts` · `src/modules/kb/wiki/kb-members.service.ts` ·
`src/modules/kb/wiki/kb-page-templates.service.ts`

Two commits in `streamlineos-backend`: **122334c2** (mail paging + search, kb_page_links,
calendar timezone, the kb_space_grants declaration) and **e287fef6** (kb_space_members and
kb_page_templates uniques).

---

# S11 pass — closing what is closable, and naming the rest as requirements

The three open boxes were re-verified against current source rather than against the S10
notes, because ticket 28 landed in between and because two of this session's assigned
defects turned out to be already fixed. One box closes. Two do not, and this pass says
exactly what they are waiting on rather than restating "PARTIAL".

## 1. What ticket 28 delivered, verified — three notes are now stale

Three of the four calendar remainders and one mail remainder were carried as blocked on
ticket 28. Checked at head:

| Carried as blocked | State now | Evidence |
|---|---|---|
| Calendar (b) timezone never reaches the client | **DONE** | `hooks/api/calendar.ts:103` declares `timezone?: string \| null`; `features/calendar/event-detail-content.tsx:73-74` passes it to `formatEventDate`/`formatEventTimeRange`, which take an explicit `timeZone` (`lib/date-utils.ts:126-139`) and probe the zone first (`:101`) so an unknown IANA name degrades instead of throwing `RangeError`. Covered by `lib/date-utils.event-timezone.test.ts`. |
| Calendar (d) source toggles absent from the query key | **DONE** | `lib/query-keys/platform-hierarchy.ts:6-9` — `events(start, end, sources?)` appends the enabled-source set as an optional tail, consumed at `hooks/api/calendar.ts:195`, pinned by `hooks/api/calendar-source-key.test.ts`. |
| Mail — idempotent send mints a fresh UUID per HTTP call | **DONE** | `lib/api-client.ts:172-178` now mints a key only as a last resort and points at `hooks/common/use-idempotent-operation.ts`, which holds ONE key for the life of a retried operation. `hooks/api/mail.ts:95,109` use it for `/mail/send` and `/mail/reply` and call `operation.settle()` on success. |
| Mail — no hook invalidates the unread count | **NOT A DEFECT** (per the orchestrator's finding, re-checked here) | `/notifications/unread-count` is notifications-only and mail writes no notification row, so invalidating it from mail could not change its answer. `queryKeys.inbox.count()` exists (`lib/query-keys/platform-core.ts:144`) but `/me/inbox/unified/count` has no client hook at all — there is nothing to invalidate. Recorded, not re-reported as open. |

**Calendar (a) is NOT resolved, and the kickoff brief for this pass assumed it was.**
`frontend/features/hr/recruitment/interviews-page.tsx:249` still renders `BigCalendarWrapper`
(month/week toggle, prev/next, `eventPropGetter`) as a second full calendar surface at
`/hr/recruitment/interviews`. Last touched by `e33873d6c` (the route-thinning commit), which
did not address it. It violates root CLAUDE.md §8 ("Never module-specific calendar pages")
and §9 (feature → feature import), and it is redundant: `hr-interviews` is already a
registered aggregate source (`backend/src/modules/hr/hr-calendar-sources.ts`), so `/calendar`
already shows these events. The fix is to replace the calendar view with a list plus a link
to `/calendar`. **Not done here — `features/hr/**` is HR/ticket-25 territory, and the change
rewrites the primary view of an HR recruitment page, not a calendar file.**

## 2. Knowledge — attachments now have a row, which is what the box was waiting on

`KbMediaService.upload` uploaded to R2 and returned a key with **zero database writes**. The
only tenancy the object carried was the `kb-media/<org_id>/` prefix inside its own key — a
naming convention, not a constraint. The box asks that attachments "carry tenant-composite
integrity"; there was no row to give integrity to, which is why S10 could not close it.

**Decision: creating the row is in scope, and only the row.** The object's *storage lifecycle*
(garbage collection, retention, erasure) is ticket 33's subject, and it could not be built at
all while nothing in the database knew an object existed. Creating the row is the smaller half
and it is the half that unblocks the other.

### `kb_page_attachments` (migration `1042_t29_kb_page_attachments`)

Shaped as the deliberate twin of `kb_article_attachments` (`schema/support/kb-attachments.ts`),
which is the wiki side's missing counterpart:

- `uniq_kb_page_attachments_org_id` — the `(org_id, id)` tenant anchor every other kb table
  carries, so a future child can take a composite FK.
- `fk_kb_page_attachments_org_page` — **composite** `(org_id, page_id) → kb_pages(org_id, id)`,
  `ON DELETE CASCADE`. A single-column `page_id` FK would let a row in org A name a page in
  org B and still satisfy the constraint.
- `page_id` is **nullable on purpose**: `/kb/media` accepts an upload with no page (a cover
  image chosen before the page is saved — `features/wiki/components/page-cover.tsx`), and a
  composite FK with a NULL member is unenforced under MATCH SIMPLE. That is the intended
  "not attached to a page" state, not a hole.
- `uniq_kb_page_attachments_org_file_key` — the storage key *is* the object's identity, and the
  multipart POST is at-least-once from the caller's point of view. Per-org, not global, so one
  tenant's key value cannot block another's (BE/CLAUDE.md §3).
- `deleted_at` + a partial `(org_id, page_id, created_at) WHERE deleted_at IS NULL` index.

The FK is inline in `CREATE TABLE` rather than a later `ADD CONSTRAINT … NOT VALID` →
`VALIDATE`: the table is empty at creation, so there is no validation pass to take ACCESS
EXCLUSIVE on `kb_pages` for.

### The unchecked `pageId` was a real hole, and it is now 404

`KbMediaController.upload` took `pageId` from the multipart body and passed it straight
through. Nothing checked it belonged to the caller's org. Today that is invisible (the
indexer re-checks org+page and silently returns 0 chunks), but with a composite FK it would
have become a `23503` **after** the bytes were already in the bucket. `assertPageInOrg` now
resolves the page against the caller's org with `deleted_at IS NULL` **before** the upload
and throws `NotFoundException` — 404, never 403, because a 403 on another org's id confirms
the page exists.

### Verified against a real catalog, not against Drizzle

Migration applied to `scratch_t29` (local, non-shared) and probed directly:

| Property | Result |
|---|---|
| org A row → org A page | inserts |
| org A row → **org B's page** | **rejected `23503`** — the composite FK bites |
| `page_id` NULL (cover image, no page) | inserts |
| duplicate `(org_id, file_key)` | **rejected `23505`** |
| org B reusing org A's `file_key` **value** | inserts — no cross-tenant DoS |
| hard `DELETE` of the page (`emptyTrash` / `purgeExpired`) | ledger row cascades away |

Test rows were removed afterwards; `scratch_t29` is back to 0 `kb_pages` / 0
`kb_page_attachments`.

### What the row still does not buy — for ticket 33

The cascade removes the ledger row but **not the R2 object**. Those objects are orphaned today
as well (there is no row at all), so this is not a regression — but a purge sweep now finally
has something to read, and the two hard-delete call sites are named:
`kb-page-tree.service.ts::emptyTrash` and `::purgeExpired`. Doing it properly means reading
`file_key` for the subtree **before** the delete and handing it to `StorageService.deleteFile`.
That is upload-lifecycle work and it is left to ticket 33.

## 3. Inbox/mail — which of the four are in scope, decided

Ordering and search were the two genuine defects and S10 fixed both. The remaining four were
re-verified as unbuilt, and they are **not four requirements — they are two**:

**(A) Exact unread requires a complete mirror, and a complete mirror requires delta sync.**
`mail_message_metadata.is_read` exists and the keyset index
`(org_id, user_membership_id, folder, date DESC, id DESC)` already covers the count's
predicate, so `count(*) … WHERE is_read = false` is an index range scan away. It is not built
because **the answer would be wrong**: the mirror holds only what has already been listed, so
on a fresh account it would report "3 unread" for a mailbox with 400 and present it as
authoritative. `unified-inbox.service.ts:395-413` sidesteps this by fanning out to the provider
for 100 messages and counting in JS, self-declared inexact — and that file is in
`modules/notifications`, not `modules/mail`.
The prerequisite is incremental sync, which is also unbuilt in a specific way:
`MailSyncCheckpointService.loadPosition` still has **zero production callers** and
`clearPositions` has none anywhere, so `mail_sync_checkpoints` is a **write-only table** —
`mail.service.ts:284` upserts a row on every provider page fetch and nothing ever reads it.
Worse, what it stores is the token of the *last page scrolled to*, not a delta position, so
even wiring `loadPosition` up would resume mid-scroll rather than sync forward. Gmail needs
`historyId` and Outlook needs a `deltaLink`; neither provider wrapper requests one
(`providers/gmail-mail.provider.ts`, `outlook-mail.provider.ts`).
**NEW REQUIREMENT.** Cost: a delta-token column and semantics on `mail_sync_checkpoints`, a
`listChanges`/`delta` method on both providers, a background sync worker (there is none — the
mirror is populated only as a side effect of a user scrolling), and only then an unread
endpoint. The checkpoint write is not removed here because deleting it would also delete
`mail-sync-checkpoint-isolation.spec.ts`'s subject, which is 4 of `check:tenant-isolation`'s
924 declarations.

**(B) Idempotent receive and bounce/retry/DLQ are the same missing thing: there is no
inbound mail path at all.** Confirmed by scan — zero `webhook`, zero inbound, zero
bounce/DLQ references anywhere under `src/modules/mail/`. Mail is outbound-and-poll only.
A bounce arrives as an inbound DSN, so bounce handling cannot precede receiving; and
"idempotent receive" has nothing to be idempotent about until something receives.
**NEW REQUIREMENT.** Cost: a provider trigger or webhook receiver (the calendar module's
`CalendarProviderWebhookController` is the pattern, including the `@Public()` + shared-secret
shape and the `.strict()` body schema), a dedupe key that includes `account_id` — note
`mail_message_metadata`'s own unique `(account_id, message_id)` omits `org_id` — and only then
a DSN classifier feeding the existing `notification-delivery-worker` retry/dead-letter
machinery, which has never been applied to mail.

Neither is a defect and neither is a small fix; both are platform features that need a
provider-integration design first. Recording them as requirements is the honest close.

## 4. Calendar — "this and following" is a product decision, and here is what has to be decided

Re-verified: nothing in either repo implements it. The frontend vocabulary is exactly
`"occurrence" | "series"` (`features/calendar/event-series-scope-dialog.tsx:15`) and the
backend has only `upsertOccurrenceException` and `cancelOccurrence`
(`calendar-recurrence.service.ts:32,80`) plus whole-series update. There is no series split
anywhere.

What "this and following" mechanically requires is a **series split**, and every question below
changes the schema or the wire contract, so none of them can be guessed:

1. **Does the split mint a new event row?** The standard answer (RFC 5545 / Google / Outlook)
   is yes: stamp `UNTIL = <split point − 1>` onto the original RRULE and create a second event
   carrying the remaining rule plus the edits. That means a new `calendar_events` row and a
   link between the two halves — a `series_parent_id` or equivalent — which is a migration.
2. **What happens to existing exceptions and cancellations after the split point?** They belong
   to the new half. Nothing currently re-parents `calendar_occurrence_exceptions`, and leaving
   them on the old half silently resurrects cancelled occurrences.
3. **What happens to attendees and their RSVPs after the split point?** Copy them (RSVPs reset,
   or carried?), or re-invite? This is a notification decision as much as a data one.
4. **What happens to the provider copy?** `calendar-provider-sync-sweep.service.ts` pushes one
   local event to one `externalEventId`. A split produces two local events where the provider
   has one series; whether the sweep truncates-and-creates or issues a provider-native
   "this and following" edit is a per-provider capability question.
5. **What is the reminder behaviour across the boundary?** `calendar-reminder-sweep.service.ts`
   reads per-event; two events means two sweeps, and a reminder already sent for an occurrence
   that moved to the new half must not fire twice.

Until (1) and (2) are answered there is nothing to build against. **BLOCKED on a product
decision**, not on territory and not on infrastructure.

## 4b. Knowledge queries/workers — an article's chunk ACL went stale and the article vanished

`modules/kb/retrieval/**` was held by ticket 10 during S8 and is in territory now, so the four
items S8 left open there were re-audited. One is a live defect and is fixed.

`indexArticle` read the stored content hash and, on a match, **returned unconditionally**
(`kb-indexing.service.ts:202`). So an article whose ACL moved without its text — a restriction
added or removed — kept the **old `acl_revision`** on every one of its chunks. The candidate
gate joins `acl_revision` with `=` (`kb-candidate.service.ts:95,161`, pinned by
`kb-acl-revision-gate.spec.ts:79-94`), so those chunks matched **nothing**: the article dropped
out of RAG retrieval entirely, not partially, until somebody happened to edit its body. It
fails *closed*, so this lost recall rather than disclosing anything — but it lost it silently,
and `syncAclRevisionForSpace` only repairs space-level changes, never an article-level
restriction change.

`indexPage` has had the correct branch all along (`:288-324`). The article path is now its twin:
on an unchanged hash with a moved `acl_revision` or `content_revision`, the two columns are
updated in place and nothing is re-embedded — so this costs no AI credit.

The three-times-repeated `article_body` predicate is factored into one `articleBodyChunks`
helper. That is also what keeps the file under the gate: the branch took it from 480 to 513
lines, and `check:file-sizes` fails at 500. It is 498 now.

Proof: new `kb-article-acl-only-reindex.spec.ts` → **5 pass**, including a BITE pinning that the
revision written is the article's live one and not the stale stored one, one asserting that
nothing at all is written when neither text nor revision moved, and one asserting a genuinely
changed body still takes the full re-embed path rather than the ACL shortcut. Reverting the
branch to `return;` turns **3 red**.

**Still open in that box (3), all in `kb/retrieval/**`:** `kb.content.delete` is dead code —
`KbIngestionDeleteConsumer` implements a full four-way durable purge and nothing emits the
event, so purging depends entirely on in-request `tx.delete` calls that are not outbox-backed;
KB space soft-delete purges nothing (`kb-spaces.service.ts::remove` sets `deletedAt` and busts
the access cache, and neither de-indexes nor purges the space's pages and articles); and the
search plan is split-brain — `kb-search.service.ts` correctly goes through
`app.search_kb_article_ids` over `idx_kb_articles_fts`, while `kb-article-query.service.ts:67-71`
is a leading-wildcard `ilike` on title+excerpt, so `GET /kb/articles?search=` and the search
endpoint return different results for the same term.

## 5. Gates — literal command, exit code, number

| Gate | Command | Result |
|---|---|---|
| Backend typecheck (baseline, before any edit) | `heavy.sh 2 -- pnpm -C streamlineos-backend typecheck` | **exit 0** |
| Backend typecheck (after the attachment row) | `heavy.sh 2 -- pnpm -C streamlineos-backend typecheck` | **exit 0** |
| Backend typecheck (final) | `heavy.sh 2 -- pnpm -C streamlineos-backend typecheck` | **exit 2 — 1 error, NOT MINE**: `src/modules/hr/governance/legal-holds/legal-hold-check.helper.ts(42,3) TS2322`. That file is **uncommitted, mid-edit by another agent** (`git status` shows it ` M`); it was clean at my baseline and appeared during this pass. Zero errors in `kb`, `mail`, `calendar`, `db/schema/kb` or `migrations`. |
| Spec typecheck (after the attachment row) | `pnpm -s check:spec-typecheck` | **exit 0** — "spec-inclusive typecheck passed" |
| Spec typecheck (final) | `pnpm -s check:spec-typecheck` | **exit 1 — same single HR error, NOT MINE** |
| kb-media suite | `heavy.sh 2 -- jest --runInBand --testPathPattern="kb-media"` | **exit 0 — 34/34** (was 27) |
| kb-media BITE probe | same, with `assertPageInOrg` removed | **3 red** |
| Whole kb module (after the attachment row) | `heavy.sh 2 -- jest --runInBand --testPathPattern="src/modules/kb"` | **exit 0 — 88 suites / 566 tests** |
| article ACL spec | `heavy.sh 2 -- jest --runInBand --testPathPattern="kb-article-acl-only-reindex"` | **exit 0 — 5/5** |
| article ACL BITE probe | same, with the branch reverted to `return;` | **3 red** |
| Whole kb module (after the ACL fix) | `heavy.sh 2 -- jest --runInBand --testPathPattern="src/modules/kb"` | **exit 0 — 89 suites / 571 tests** |
| mail + calendar modules | `heavy.sh 2 -- jest --runInBand --testPathPattern="src/modules/(mail\|calendar)"` | **exit 0 — 54 suites / 494 tests** |
| migration discipline | `pnpm -s check:migration-discipline` | **exit 0** |
| migration rollback | `pnpm -s check:migration-rollback` | **exit 0** |
| tenant indexes | `pnpm -s check:tenant-indexes` | **exit 0** |
| restrict FKs | `pnpm -s check:restrict-fks` | **exit 0** — 346 schema files |
| lifecycle predicates | `pnpm -s check:lifecycle-predicates` | **exit 0** — 75/335 ratchets held |
| module DI | `pnpm -s check:module-di` | **exit 0** — 217 modules, 0 violations |
| file sizes | `pnpm -s check:file-sizes` | **exit 0** — 3567 files, all under 500 |
| kebab-case | `pnpm -s check:kebab-case` | **exit 0** — 6312 entries |
| unjoined table refs | `pnpm -s check:unjoined-table-refs` | **exit 0** — 5396 queries |
| dead code | `pnpm -s check:dead-code` | **exit 0** |
| type assertions | `pnpm -s check:type-assertions` | **exit 0** |
| transaction callbacks | `pnpm -s check:transaction-callbacks` | **exit 0** |
| cache invalidation | `pnpm -s check:cache-invalidation` | **exit 0** |
| contract registry / breaking change / openapi coverage / multipart / route classification / authz deny | `pnpm -s check:<each>` | **all exit 0** |
| Journal integrity | 666 entries, `idx` unique, `when` strictly increasing | verified before and after the append |

**Red, and NOT mine — pre-existing, both name the same file:**
`pnpm -s check:db-call-count` **exit 1** ("UNDETECTED /hr/time/leave-approver.service.ts") and
`pnpm -s check:unbounded-reads` **exit 1** (1 unclassified path, `/hr/time/leave-approver.service.ts:65`).
HR territory, another agent's in-flight work.

**Not run:** `pnpm test:e2e`, backend `pnpm lint`, frontend `pnpm lint`, frontend `type-check`
(no frontend file was changed this pass), `check:migration-chain` and `check:migration-ledger`
(they read `DATABASE_URL`, which is the shared remote Neon instance and is off-limits),
`check:tenant-relationships` (its default target `scratch_boot_a` is half-replayed and its
count is not quotable).

**Database used:** `scratch_t29` — local, the S10 pass's own copy. Migration `1042` was applied
to it directly to probe the constraints. It is not at journal head (its `drizzle.__drizzle_migrations`
is empty; it was built by schema load, not replay), which is why it was used only for
constraint behaviour and **not** for any buffer measurement. No measurement was taken this
pass, so no database needed to be at head.

## 6. Cross-territory findings — reported, not fixed

- **`frontend/features/hr/recruitment/interviews-page.tsx:249`** — the second full calendar
  surface, still present. HR / ticket 25. Detailed in §1.
- **`kb-page-tree.service.ts::emptyTrash` and `::purgeExpired`** hard-delete `kb_pages` and now
  cascade the new attachment rows away without deleting the R2 objects. Ticket 33
  (upload lifecycle) — see §2.
- **`mail_sync_checkpoints` is a write-only table.** `mail.service.ts:284` upserts on every
  provider page fetch; `loadPosition` has zero production callers and `clearPositions` has none
  at all. Not removed here because it is 4 of `check:tenant-isolation`'s 924 declarations.
- Carried forward from S10, still true: `src/scripts/read-cost-budgets.mjs`'s `mail-inbox-cached`
  entry still names the dropped `idx_mail_metadata_list` in its comment;
  `uniq_kb_chunks_article_revision` / `_page_revision` are live and undeclared in Drizzle
  (`schema/support/kb-chunks.ts`); `idx_mail_metadata_thread` is maintained on every mirror
  write and no thread read touches the database.

## 7. Files changed this pass (backend only — no frontend file was changed)

**New** — `src/db/schema/kb/attachments.ts` ·
`migrations/1042_t29_kb_page_attachments.sql` ·
`migrations/rollback/1042_t29_kb_page_attachments.down.sql` ·
`src/modules/kb/retrieval/kb-article-acl-only-reindex.spec.ts`

**Modified** — `src/db/schema/kb/index.ts` · `migrations/meta/_journal.json` ·
`src/modules/kb/wiki/kb-media.service.ts` · `src/modules/kb/wiki/kb-media.service.spec.ts` ·
`src/modules/kb/retrieval/kb-indexing.service.ts`

Two commits in `streamlineos-backend`: **07757b42** (the attachment row) and **204b152f** (the
article ACL reindex). The migration was first authored as `1041`
and renumbered to `1042` mid-pass — another agent appended `1041_t22c_…` to the journal in the
same window, and discipline rule 8 forbids two files sharing a numeric prefix. `idx` and `when`
were corrected with it; the final journal is 666 entries, `idx` unique, `when` strictly
increasing.
