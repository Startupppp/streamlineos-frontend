# 29d — Calendar and Inbox/mail, decomposed into clauses and given a verdict each

Session S14. Both open boxes on ticket 29 are multi-clause. A single tick over a
nine-clause box is unfalsifiable, so each box below is split into its named clauses
and each clause carries its own verdict and its own evidence.

**Headline:** two boxes stay open, but for materially different reasons than the ticket
recorded. Two clauses previously written up as closed are **PARTIAL** — the code is real,
correct and journalled, but sits behind a gate the default request never satisfies. And the
stated justification for deferring the whole bounce/receive requirement is **false at head**.

Two real defects were found, fixed and bite-proved; a third was found, reproduced at
runtime, and left for its owner because the remedy is a genuine product choice.

---

## Gates run this session

| Command | Exit | Number |
|---|---|---|
| `pnpm -C streamlineos-backend exec jest --runInBand --testPathPattern="src/modules/calendar"` | **0** | 43 suites / 406 tests (was 42/396) |
| `pnpm -C streamlineos-backend exec jest --runInBand --testPathPattern="calendar-recurrence-end"` (before fix) | **1** | 6 failed / 4 passed |
| `pnpm -C .../frontend exec jest --runInBand --testPathPattern="hooks/api/mail\|features/mail\|features/inbox"` | **0** | 17 suites / 102 tests |
| `pnpm -C .../frontend exec jest --runInBand --testPathPattern="mail-send-invalidation"` (before fix) | **1** | 2 failed / 4 passed |
| `pnpm -C streamlineos-backend check:spec-typecheck` | **0** | spec-inclusive typecheck passed |
| `pnpm -C .../frontend type-check` | **0** | 0 errors |
| `pnpm -C streamlineos-backend typecheck` | **2** | **5 errors, all `src/modules/kb/wiki/kb-page-ai.*`, none mine** |
| `pnpm -C .../frontend exec eslint hooks/api/mail.ts hooks/api/mail-send-invalidation.test.tsx` | **0** | 0 problems |

**Backend typecheck is red and it is not this ticket's.** All 5 errors are
`src/modules/kb/wiki/kb-page-ai.controller.ts` / `.service.ts` failing on
`Cannot find module '../retrieval/kb-doc-ai-actions'`. That file does not exist on disk and
`kb-page-ai.service.ts` was last touched by `529a8d0b`, not by me. Zero calendar or mail
errors. Reported under brief rule 4, not debugged.

**No benchmarks were run** — ~8 agents are live and timings would be worthless.

---

## BOX 1 — Calendar. 6 of 10 clauses hold.

> one `/calendar` serving everyone with module events as toggleable sources; timezone
> display, series-versus-instance edits, cursor/range keys, and DST, exception, conflict
> and reminder coverage. No module-specific calendar page.

| # | Clause | Verdict |
|---|---|---|
| C1 | one `/calendar` serving everyone | **HOLDS** |
| C2 | module events as toggleable sources | **HOLDS** |
| C3 | timezone display | **HOLDS** |
| C4 | series-versus-instance edits | **PARTIAL** |
| C5 | cursor/range keys | **PARTIAL** |
| C6 | DST coverage | **HOLDS** (a real zone defect fixed here) |
| C7 | exception coverage | **PARTIAL** |
| C8 | conflict coverage | **HOLDS** |
| C9 | reminder coverage | **HOLDS** (strengthened here) |
| C10 | no module-specific calendar page | **DOES NOT HOLD** |

### C1 · one `/calendar` serving everyone — HOLDS
`app/(authenticated)/calendar/page.tsx:3` renders `CalendarView`, which reads the backend
aggregate. One surface, all roles, gated on `useCan("calendar:read")`
(`hooks/api/calendar.ts:188`).

### C2 · module events as toggleable sources — HOLDS
`CalendarSourceRegistry` on the backend; `useCalendarSources()` on the client; the enabled
set is filtered, mapped and **sorted** into the query key (`hooks/api/calendar.ts:190-199`).
Sorting matters: an unsorted set would mint a different cache entry per toggle order.

### C3 · timezone display — HOLDS
Delivered by ticket 28 and re-verified at head. `hooks/api/calendar.ts:103` declares
`timezone?: string | null`; `event-detail-content.tsx:73-74` passes it to
`formatEventDate` / `formatEventTimeRange`, which take an explicit `timeZone` and probe the
zone first (`lib/date-utils.ts:101`), so an unknown IANA name degrades instead of throwing
`RangeError`. Pinned by `lib/date-utils.event-timezone.test.ts`.

### C4 · series-versus-instance edits — PARTIAL
**The mechanism is correct and proven.** An occurrence edit writes only an exception row and
never the series — `calendar-series-exception-scope.spec.ts` asserts `"rrule" in insertPayload
=== false` and `"title" in insertPayload === false`. A series edit writes only `calendar_events`.
Three residues:

1. **An occurrence edit silently discards most of what the user typed.**
   `features/calendar/use-event-series-scope.ts:44-51` forwards exactly three fields —
   `modifiedTitle`, `modifiedStart`, `modifiedEnd`. The dialog collected description,
   location, colour, category, allDay and attendees; on "This occurrence only" they are
   dropped with no signal. This is not a frontend oversight: `calendar_event_exceptions`
   (`src/db/schema/calendar/calendar-event-exceptions.ts`) physically has only
   `is_cancelled`, `modified_title`, `modified_start`, `modified_end`. Widening it is a
   migration plus a product call on which fields are per-occurrence overridable.
   **Owner: release owner (product) + calendar schema. NEW, not previously recorded.**
2. **The scope dialog defaults to the destructive option.**
   `event-series-scope-dialog.tsx:30` — `useState<SeriesScope>("series")`. Confirming
   without reading rewrites every occurrence. **Owner: release owner (product).**
3. **"This and following" does not exist** — the vocabulary is exactly
   `"occurrence" | "series"` (`event-series-scope-dialog.tsx:15`). Unchanged; this is the
   already-accepted **R-21** product decision (`29b-open-decisions.md` §1 Q1/Q2).

### C5 · cursor/range keys — PARTIAL
**Range keys hold.** `queryKeys.calendar.events(start, end, sources)`
(`lib/query-keys/platform-hierarchy.ts:6-9`) carries both range bounds as ISO instants plus
the sorted enabled-source set. Correct and pinned by `hooks/api/calendar-source-key.test.ts`.

**There is no cursor, because there is no pagination.** `hooks/api/calendar.ts:200-204` sends
`{ start, end }` and nothing else — no `cursor`, `page`, `limit` or `offset`, and no
`useInfiniteQuery`. Server truncation at 2,000 surfaces as a banner the user cannot page past
(`calendar-view.tsx:298-304`, "Switch to a shorter range to see all events"). The clause reads
"cursor/range keys"; only the range half exists. Whether a calendar window *should* paginate
is a product question, so this is recorded rather than built.

Also found: `components/ui/calendar-event-combobox.tsx:35-43` requests a **±6 month
(~365 day)** window from the same hook, against a documented **120-day** server cap, and then
searches the result client-side. It also mints a cache entry no calendar page will ever share.
**Owner: support/ticket-external-links owner.**

### C6 · DST coverage — HOLDS, and a real zone defect was fixed here
`calendar-dst-edge.spec.ts` is properly built: it pins **explicit** 2024 transition dates in a
**named** zone (America/New_York 2024-03-10 spring-forward, 2024-11-03 fall-back) with
UTC-instant assertions on both sides, plus BITE cases asserting the wrong-by-an-hour answer is
*absent*. No fixture is anchored to wall-clock `today`, so it cannot decay into passing. It
also covers a non-DST zone (Asia/Kolkata) and a UTC control.

**Defect found and fixed:** `RRule.origOptions.until` is a **UTC** Date and was passed
unchanged into a rule whose `dtstart` had been converted to local-wall-clock space
(`calendar-occurrence.service.ts`). So `UNTIL` was compared as a wall-clock literal and the
series cutoff was wrong by the zone offset — for America/New_York, 4 to 5 hours, enough to
keep or drop a final occurrence. Now converted into the same space as `dtstart`. Probed
directly: `RRule.fromString("FREQ=WEEKLY;BYDAY=MO;UNTIL=20240624T100000Z").origOptions.until`
is `2024-06-24T10:00:00.000Z`.

### C7 · exception coverage — PARTIAL
**Expansion-side coverage is genuinely good.** `calendar-exception-loader.ts` is keyset-paged
at 500, and it loads an exception when **either** its nominal start **or** its modified start
falls in the window, with `collectRescheduledOccurrences` handling an occurrence dragged into
the window from outside. Cancellation and modification are both pinned with BITE cases.

**But a series timing edit orphans every exception, and a cancelled occurrence resurrects.**
Exceptions are keyed by the nominal occurrence instant —
`exceptionMap.set(ex.occurrenceStart.getTime(), ex)` matched against
`exceptionMap.get(utcStart.getTime())`, where `utcStart` derives from the *current*
`event.startDate`. `CalendarService.updateEvent` (`calendar.service.ts:212-325`) writes
`startDate` / `timezone` / `rrule` / `recurrenceEnd` and **never touches
`calendar_event_exceptions`**. It already computes exactly the right predicate — `timeChanged`
at `:239-243` — and uses it only to reset `reminder15MinSent` and to DEAD the pending reminder
outbox.

Reproduced at runtime in a throwaway `git archive HEAD` tree (never in the shared working
tree), weekly Mon 10:00 UTC series with the 2024-06-10 occurrence cancelled:

```
BEFORE series edit: 2024-06-10 correctly absent
AFTER  moving series start 10:00 -> 11:00:
cancelled 2024-06-10 present as 11:00? true
```

An attendee who was told a meeting was cancelled gets it back, with reminders re-armed
(`timeChanged` sets `reminder15MinSent = false`).

**Left unfixed deliberately, because the remedy is a genuine product choice**, and the same
discipline that kept S12 from inventing "this and following" applies. Deleting the orphans
does *not* fix it — a deleted cancellation resurrects identically. The three real options are
(a) shift each exception by the series delta, well-defined for a pure time shift and undefined
for an rrule change; (b) reject a timing edit while exceptions exist; (c) surface the
cancelled occurrences and make the organiser re-confirm. Note the bug bites **only** on a
timing change — a title/colour/attendee edit leaves nominal instants untouched and every
exception still matches.
**Owner: release owner (product), with calendar as the implementer. NEW, not previously recorded.**

### C8 · conflict coverage — HOLDS
`calendar-conflict.service.ts` + `calendar-conflict.service.spec.ts` (10 tests over 2
describes), bounding by `recurrenceEnd` in SQL, resolving exceptions per event, and skipping
declined RSVPs (`:165`). Also fed by the C9 fix below.

### C9 · reminder coverage — HOLDS, and strengthened here
Keyset-drained sweep, per-occurrence reminder cancellation with an occurrence-specific
`dedupeKey` LIKE prefix, per-attendee key coverage, and BITE cases proving the prefix does not
match another event or another occurrence. The `recurrenceEnd` fix below removes a live
false-positive class: reminders were firing for occurrences of series that had already ended.

### C10 · no module-specific calendar page — DOES NOT HOLD
`features/hr/recruitment/interviews-page.tsx:249` still renders `BigCalendarWrapper` at
`/hr/recruitment/interviews`, with its own month/week toggle (`:56-61`) and prev/next nav
(`:107-113`), building events from `useInterviews` rather than the aggregate. It is also the
only cross-feature importer of `features/calendar/**` (`:28`, `:32`), a feature→feature import
banned by root §9. `hr-interviews` is already a registered aggregate source, so `/calendar`
already shows these events and the remedy is a list plus a link.
**Reported in five consecutive passes now (S8, S10, S11, S13, S14). Owner: HR / ticket 25.
Deadline 2026-09-10.** This clause alone keeps the box open regardless of everything else.

### Fix landed in this box
**`recurrenceEnd` was declared, passed by all four callers, and consulted by none.**
`CalendarEventLike.recurrenceEnd` exists and `calendar-event-source.loader.ts:317`,
`calendar-conflict.service.ts:178`, `calendar-export.service.ts:124` and
`calendar-reminder-sweep.service.ts:156` all pass it into `expandToOccurrences` — which
ignored it entirely. The SQL layers only filter out series whose end precedes the window
*start* (`or(isNull(recurrenceEnd), gt(recurrenceEnd, start))`), so **any window straddling
the end leaked**: a weekly meeting ended on 30 June still rendered through July, still raised
conflicts, still exported to ICS, and still sent reminders.

Truncation is applied to the **nominal** occurrence, so an exception may still legitimately
move a live occurrence past the end. Proof: `calendar-recurrence-end.spec.ts`, **10 tests,
6 red before the fix and all 10 green after**, with the 4 controls green throughout —
including a DST-zone case asserting the series ends at the right instant across the
America/New_York fall-back.

---

## BOX 2 — Inbox/mail. 2 of 10 clauses hold outright.

> indexed conversation ordering, search and unread; incremental sync; idempotent send and
> receive; bounce/retry/DLQ; invalidation of list, thread and count keys.

| # | Clause | Verdict |
|---|---|---|
| M1 | indexed ordering — message list | **PARTIAL** (was recorded closed) |
| M2 | indexed ordering — conversation/thread | **DOES NOT HOLD** |
| M3 | search | **PARTIAL** (was recorded closed) |
| M4 | unread | **DOES NOT HOLD** |
| M5 | incremental sync | **DOES NOT HOLD** |
| M6 | idempotent send | **PARTIAL** |
| M7 | idempotent receive | **DOES NOT HOLD** — but the premise for deferring it is false |
| M8 | bounce / retry / DLQ | **DOES NOT HOLD** — same correction |
| M9 | invalidation — list and thread keys | **HOLDS** (a gap fixed here) |
| M10 | invalidation — count keys | **DOES NOT HOLD**, but inert |

### M1 · indexed conversation ordering, message list — PARTIAL. **Correction to the ticket.**
Every mechanical part the ticket claims is real and verified at head: the keyset order
(`mail-metadata.service.ts:234-235`, `ORDER BY date DESC, id DESC`), `limit + 1` to detect
more (`:235`), the null-date keyset split (`:186-195`), the conditional `nextCursor`
(`mail.service.ts:242` — the unconditional `null` is genuinely gone), the separate signed
cursor namespace (`md1` vs `m1`), and the tiebreak index
`idx_mail_metadata_list_keyset` present **both** in Drizzle
(`db/schema/mail/mail-metadata.ts:40-46`) and in journalled migration
`1022_t29_mail_metadata_search_and_keyset.sql:88-93` (`_journal.json` idx 789; 672 `.sql`
files vs 672 journal entries, 0 orphans).

**But the default request never reaches it.** `accountId` defaults to `"all"`
(`dto/mail-schemas.ts:15`); `mail.service.ts:69` therefore leaves `singleAcc` undefined; and
the entire metadata branch is gated on `if (singleAcc && membershipId !== null)`
(`mail.service.ts:75`). Traced through to the client: `features/mail/mail-shell.tsx:39-41`
initialises `selectedAccountId` to `"all"`, so **opening `/mail` uses the provider merge
cursor, not the keyset**. The keyset engages only after the user explicitly picks one account
from the switcher. Every internal caller also passes `"all"`
(`unified-inbox.service.ts:322`, `:405`; `ai/core/mail-copilot-tools.ts:56`).

The index prefix is `(org_id, user_membership_id, folder, date DESC, id DESC)` — already
account-agnostic — so widening the path to the multi-account case is mechanically plausible.
It was **not** attempted here: it needs cross-account freshness semantics
(`isFreshForAccount` is per-account), an equivalence run against the provider merge, and a
measured read cost. This is the hottest mail read path, it already produced one p95
regression in this release, and no benchmark is possible with ~8 agents live. Shipping it
unmeasured would be the wrong trade.
**Owner: mail owner + perf-harness owner. Highest-value residue in this box.**

### M2 · indexed conversation ordering, thread — DOES NOT HOLD
`getThread` never touches `mail_message_metadata` at all (`mail.service.ts:318-333`); it
delegates straight to the providers. Gmail (`providers/gmail-mail.provider.ts:92-113`) maps
the Composio response with **no sort of any kind**; Outlook
(`providers/outlook-mail.provider.ts:210-238`) pushes `receivedDateTime asc` to Graph. The two
providers do not agree on ordering, and `idx_mail_metadata_thread`
(`db/schema/mail/mail-metadata.ts:51`) has **no reader in the mail module** — it is a
maintained index backing nothing. The clause says "conversation ordering"; the conversation is
the half that is unindexed.
**Owner: mail owner.**

### M3 · search — PARTIAL. **Correction to the ticket.**
The indexed path is genuinely wired: `mail.controller.ts:76-85` passes `query.q` through to
`listCached`, which calls `app.search_mail_message_ids`
(`mail-metadata.service.ts:160-172`). The function is defined in journalled migration 1022
(`:105-135`) with all five §3 properties — SECURITY DEFINER, org from `app.current_org_id()`
and never a parameter, ids only, `REVOKE`/`GRANT`, `cap + 1`.

**Gated behind the same `singleAcc` check**, and additionally `skipCache = Boolean(query)`
(`mail.service.ts:90`) forces a provider fan-out on the `"all"` path. So the measured ~20x
improvement applies only when the client sends a numeric `accountId` — which the mail shell
does not do by default and no internal caller does at all. Secondary: a genuinely-zero-match
term returns to the three leading-wildcard ILIKEs (`mail-metadata.service.ts:164`), the exact
plan the migration exists to avoid.

### M4 · unread — DOES NOT HOLD
`unified-inbox.service.ts:395-413` still fans out to the provider and counts in JS:
`result.messages.filter((m) => !m.isRead).length` over `MAIL_COUNT_SCAN_LIMIT = 100`, with
`exact: result.messages.length < 100`. `GET /me/inbox/unified/count` **does** exist
(`me/inbox.controller.ts:41-45`) and returns exact DB counts for notifications and approvals
alongside this 100-message sample. Because it passes `"all"`, it never reads the local mirror
— every count call is N provider round-trips. `MAIL_COUNT_SCAN_LIMIT = 100` also exceeds the
DTO's own page cap of 50 (`dto/mail-schemas.ts:18`), forwarded raw to the providers because
the service is called directly and Zod never sees it. Unbuilt feature, matching **R-22**.

### M5 · incremental sync — DOES NOT HOLD
Unchanged and matching **R-22**: `mail-sync-checkpoint.service.ts::loadPosition` has zero
production callers, the table stores a page token rather than a Gmail `historyId` or an
Outlook `deltaLink`, and no background sync worker exists.

### M6 · idempotent send — PARTIAL. This is the money clause, so the split matters.
**What holds.** Both routes carry `@Idempotent` (`mail.controller.ts:112`, `:128`). The client
holds **one** key for the life of a retried operation and releases it only in `onSuccess`
(`hooks/common/use-idempotent-operation.ts:41-62`; `hooks/api/mail.ts:101`, `:115`), with the
transport minting a per-call key only as a last resort (`lib/api-client.ts:185-191`). A
**completed** duplicate replays the stored response without re-executing
(`idempotency.interceptor.ts` `claim.kind === "replay"`), and an **in-flight** duplicate 409s.
So the double-click and lost-response cases are genuinely safe.

**What does not hold — redelivery after an error.** The provider send is not naturally
idempotent and carries no dedupe token: `GMAIL_SEND_EMAIL` via `gateway.executeTool`
(`providers/gmail-mail.provider.ts:115-139`) and Outlook `POST /me/sendMail`
(`providers/outlook-mail.provider.ts:262`). So the fence is the only protection, and it
re-executes in two states:

1. **status FAILED reclaims and proceeds.** `command-fence-store.ts` has branches for
   COMPLETED and for a live-lease IN_FLIGHT; **FAILED has no branch of its own** and falls
   into the reclaim `update`, which returns `proceed`. The interceptor's `error:` tap calls
   `fail(fenceId)` on *any* throw — including a timeout or socket reset that happened after
   Composio already accepted and delivered the message. The user presses Retry, the client
   deliberately replays the same key, and the backend treats it as a fresh command. **This is
   precisely the path `useIdempotentOperation` was written for**: its own doc comment says "a
   compose Retry after a timeout sent the recipient a second real email". The client half was
   fixed; the server half still re-executes on the same key.
2. **`complete()` swallows a failed completion write** by design ("best-effort: a lost
   completion write just means the next retry re-executes after the lease"), leaving the row
   IN_FLIGHT; after `IDEMPOTENCY_LEASE_MS = 60_000` a retry reclaims and re-sends.

The interceptor's own doc comment states the fence is "fail-closed because these are sensitive
commands where a double-execution is worse than a client retry" — which is not what the FAILED
path does.

**Not fixed here, deliberately.** `common/idempotency/**` is shared framework territory and
changing FAILED semantics would alter every `@Idempotent` command in the repo. The real
distinction is *which* error: a 4xx validation failure definitely did not execute and is safe
to retry, a provider timeout may have. That is a framework design decision with a genuine
trade-off, not a mail bug.
**Owner: idempotency-framework owner, with mail as the first consumer.**

### M7 / M8 · idempotent receive, and bounce/retry/DLQ — the ticket's stated premise is FALSE at head
The ticket defers both on the grounds that "there is **no inbound mail path at all**, and a
bounce arrives as an inbound DSN, so bounce handling cannot precede receiving", flagged in the
residual register as *"Taken on trust: the scan was not re-run."* The scan was re-run. **The
scan result is right and the conclusion drawn from it is wrong, because the scan's scope was
wrong.**

Scoped to `src/modules/mail/` the counts are indeed zero:
`grep -rniE "webhook|inbound|bounce|dlq|dead.?letter" src/modules/mail --include='*.ts'` → **0 lines**.

Widened, an inbound path plainly exists and is registered in `app.module.ts`:
`grep -rniE "webhook|inbound|bounce|dlq|dead.?letter" src/modules/ingress --include='*.ts'` → **523 lines**.

- **`POST /crm/mailboxes/push`** — `@Public()` push-notification receiver
  (`modules/ingress/adapters/crm-mailbox.controller.ts:23,28,30`), with HMAC verification
  against the mailbox row's own `pushSecret` and tenancy read from that row rather than from
  the body (`adapters/mailbox-push-route.ts`, `crm_mailbox_sync.push_secret`, migration 0269).
- **`POST /crm/ingress/inbound`** — authenticated inbound submission
  (`inbound-ingress.controller.ts:20,25,27`).
- **A polling sweep that pulls real mail** through the very providers `MailModule` exports
  (`adapters/crm-mailbox-provider-fetch.ts:30,51`).
- **Bounce handling exists in a third module:** `@Public() @Controller("webhooks/email")` for
  resend/zeptomail (`modules/email/email-webhook.controller.ts:31-33`) mapping
  `email.bounced -> HARD_BOUNCE` into `email-suppression.service.ts`.
- **No mail-specific DLQ**, but the generic durable machinery is there
  (`common/outbox/outbox-publisher.service.ts:208-231`).

So M7/M8 are still **not satisfied for the mail module** — that part of the verdict is
unchanged — but the ask is *not* "build a receive path from nothing". It is "the mail module
does not reuse inbound and bounce machinery that already exists two modules over, with a
working `@Public()` + shared-secret + tenant-from-row pattern to copy". That is a materially
smaller and differently-owned piece of work than **R-23** records, and the R-23 disposition
should be re-taken on the corrected facts.
**`src/modules/ingress/**` is CRM territory and EXCLUDED from this session — reported, not touched.
Owner: mail/integrations product owner, re-briefed.**

### M9 · invalidation of list and thread keys — HOLDS, after a fix landed here
List and thread both sit under the `queryKeys.mail.all` prefix
(`lib/query-keys/directory-and-ownership.ts:9-20`) and every mail mutation invalidates it.

**Gap found and fixed:** `/me/inbox/unified` serves mail as a **first-class kind**
(`unified-inbox.service.ts:111-113`, backed by `MailService`), so a send or a reply changes
what it returns. `useMailAction` invalidated both `mail.all` and `inbox.all`
(`hooks/api/mail.ts:294-297`), but `useSendMail` and `useReplyMail` invalidated only
`mail.all` — so the identical message was fresh on `/mail` and stale on `/inbox` for the life
of the 30s staleTime. Both now invalidate the unified prefix.
Proof: `hooks/api/mail-send-invalidation.test.tsx`, **6 tests, 2 red before the fix and all 6
green after**, the 4 controls green throughout — including a BITE case proving the assertion
can tell a never-invalidated prefix apart, and one proving a *failed* send invalidates
nothing.

### M10 · invalidation of count keys — DOES NOT HOLD, but it is inert
`queryKeys.inbox.count()` exists (`lib/query-keys/platform-core.ts:144`) and has **zero
consumers anywhere in the frontend** — `/me/inbox/unified/count` has no hook, despite the
backend endpoint existing (see M4). So no mail mutation invalidates it, and nothing renders
from it. Every unread badge in the product — bell (`notification-bell.tsx:254`), tab title
(`app-sidebar.tsx:190-198`), inbox page header — is notifications-only and backed by
`queryKeys.notifications.unreadCount()`, which **is** correctly invalidated alongside the list
on all 13 notification mutations via one shared helper
(`hooks/api/notifications-shared.ts:18-28`).

**So the stale-unread-badge failure mode is currently unreachable for mail, for the accident
that the badge does not exist.** The key factory does, and it will go silently
un-invalidated the moment somebody writes the hook. Left as-is rather than deleting the
factory — M4's unread work is its intended consumer.
**Owner: mail owner, together with M4.**

---

## Cross-territory findings, with owners

| # | Finding | Owner |
|---|---|---|
| 1 | `/hr/recruitment/interviews:249` still renders a second full calendar surface | HR / ticket 25 · 2026-09-10 |
| 2 | Backend typecheck red: 5 errors, `kb/wiki/kb-page-ai.*` missing `../retrieval/kb-doc-ai-actions` | KB retrieval owner |
| 3 | `calendar-event-combobox.tsx:35-43` requests ~365 days against a 120-day server cap | support / external-links owner |
| 4 | R-23's premise is false: inbound + bounce machinery exists in `ingress`/`email` | mail/integrations owner |
| 5 | `@Idempotent` FAILED re-executes on the same key; mail send is not naturally idempotent | idempotency-framework owner |
| 6 | A series timing edit orphans exceptions; a cancelled occurrence resurrects | release owner (product) |
| 7 | An occurrence edit silently drops all but title/start/end | release owner (product) + calendar schema |
| 8 | `idx_mail_metadata_thread` is maintained and has no reader | mail owner |

## Honest gaps

- **p95 over HTTP was not re-measured** (A-17), and no benchmark of any kind was run this
  session — ~8 agents are live. `check:route-budgets` and `check:benchmark-manifest` were
  **not run** by me.
- The `singleAcc` widening (M1/M3) was **not attempted**; the equivalence and read-cost work
  it needs cannot be done without a benchmark.
- `src/modules/ingress/**` and `src/modules/email/**` were **read only** — CRM is excluded.
- Frontend lint was run only on the two files I changed, not repo-wide.
