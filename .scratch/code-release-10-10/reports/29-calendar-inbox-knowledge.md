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
