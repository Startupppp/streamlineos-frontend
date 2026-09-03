# Ticket 15 — Notifications, email and push (PRD-C132), and the PRD-C014 roll-up gaps

**Status:** audited at backend `70fbf9e9` / frontend `778f7d467`. PRD-C014 names this ticket as carrying
unresolved "notification/email permission and delivery gaps". **I found five. Three are live defects, two
are gates that cannot fail.** One perf defect referred to me was already fixed at HEAD but unpinned; it is
now pinned.

---

## The five gaps

| # | Gap | Severity | Territory |
|---|---|---|---|
| 1 | Delivery queue starves tenants 6..N under saturation | **HIGH** — this is the C132 "tenant-fair" criterion | mine (backend) |
| 2 | Push permission revocation is never observed by the UI | **HIGH** | frontend, adjacent |
| 3 | `quietHoursTimezone` — frontend reads and writes a column the backend dropped | **MEDIUM**, live user-visible | frontend, mine |
| 4 | `alert:dead-delivery` measures an empty table and is unwired | **gate vacuity** | infrastructure |
| 5 | SSE notification stream never recovers from an offline spell | **MEDIUM** | frontend, adjacent |

---

### Gap 1 — Tenant-fair delivery: the cap is right, the ORDER is not

This is the criterion the brief said to probe hardest, and a single-tenant test genuinely cannot show it.

**What is correct.** `notification-delivery-worker.service.ts:22-23` sets `BATCH_SIZE = 50` and
`ORG_BATCH_CAP = Math.ceil(BATCH_SIZE / 5)` = **10**, and the claim loop caps each org at
`Math.min(remaining, ORG_BATCH_CAP)` (`:118`). So the 89.93% tenant can never take more than 10 of 50
slots. That is real per-tenant backpressure and it is pinned by
`notification-delivery-worker-provider-validation.spec.ts:158`. The same shape is used by
`notification-outbox-relay.service.ts:52`. Both claim with `FOR UPDATE SKIP LOCKED`, so concurrent
workers take disjoint sets.

**What is broken.** The iteration order is fixed:

- `src/common/tenant/for-each-org.ts:161` — `.orderBy(asc(organizations.id))`
- `notification-delivery-worker.service.ts:116-117` — `const remaining = BATCH_SIZE - claimed.length;
  if (remaining <= 0) return;`

The batch is filled **greedily in ascending organisation id**. With the cap at 10 and the batch at 50,
exactly `floor(50/10) = 5` organisations can fill a tick. **When more than five tenants have backlog at
the same time, the same lowest-id five are served on every tick and the rest never advance.** It is
deterministic, not probabilistic — there is no rotation, no cursor, no randomised start offset.

On this seed there are 8 organisations, so **3 starve entirely** under sustained load. The 89.93% tenant
sorts first (`aaaaaaaa-1111-…-0001`) and permanently holds 10 slots, which the cap correctly bounds — the
starvation is not caused by the big tenant, it is caused by *position*. In production the tail of the org
id ordering is the victim, regardless of skew.

A single-tenant test cannot show this, and neither can a four-tenant one where fewer than six are busy.
The fix is a rotating start offset (round-robin cursor persisted per worker, or seeding the iteration at
`hash(runId) mod orgCount`) so the served window advances across ticks.

**Not fixed.** `forEachOrg` lives in `src/common/tenant/**`, which is not my territory, and changing the
iteration order there affects every background sweep in the repo, not just notifications. **Routed to the
orchestrator** — the right fix is either an opt-in `rotate: true` on `forEachOrg` or a cursor local to the
delivery worker.

### Gap 2 — Push revocation is never observed (the classic hole, and it is present)

`hooks/common/use-push-subscription.ts:22-25` reads `Notification.permission` **once per `userId`** into
React state. Repo-wide there is:

- **no `navigator.permissions.query({name:"notifications"})` and no `onchange` listener** — zero hits;
- no `visibilitychange` / `focus` re-read, no polling;
- **no `pushsubscriptionchange` handler in `public/sw.js`** — zero hits repo-wide;
- **no unsubscribe control anywhere** — `usePushSubscription` returns only `{permission, enable, isEnabling}`
  (`:51`); `pushManager.unsubscribe` has zero hits.

Consequence: the user grants push, `push-permission-card.tsx:42-55` renders "Push notifications are on —
this browser will show alerts even when StreamlineOS is closed", the user then revokes in browser site
settings, and **the tab is never told**. The `denied` branch at `:57-71` is well written but nothing can
ever transition into it after mount.

Worse, the server-invalidated case is actively short-circuited — `use-push-subscription.ts:54-57`:

```ts
const registration = await navigator.serviceWorker.register("/sw.js");
const existing = await registration.pushManager.getSubscription();
if (existing) return;                    // never re-POSTs to the server
```

`getSubscription()` reflects **browser-local** state only. If the server pruned the row (410 Gone from
the push service, org change, retention), the browser still holds a `PushSubscription`, so `subscribe()`
returns at line 57 and `POST /push/subscribe` (`:69`) is never re-issued. The subscription is permanently
dead server-side with no client path back, and the UI still says it is on.

**Not fixed** — `hooks/common/**` and `public/sw.js` are outside `features/notifications/**`.

### Gap 3 — `quietHoursTimezone`: the frontend drives a column that no longer exists

A live, user-visible defect that typechecks clean in both repos because `apiClient.get<T>()` is a cast.

| | |
|---|---|
| Frontend declares it **required** | `types/notifications.ts:222` |
| Frontend reads it | `features/notifications/preferences-page.tsx:244` — `value={prefs?.quietHoursTimezone ?? "UTC"}` |
| Frontend writes it | `features/notifications/preferences-page.tsx:109` |
| Backend column | **dropped** — `migrations/0432_drop_quiet_hours_timezone.sql`, journalled |
| Backend emits it | No — `notification-preferences.service.ts:12-28` has no such key |
| Backend accepts it | **No, it 400s** — `dto/preference.schemas.ts:11-27` is `.strict()` |

Net: the quiet-hours timezone `Select` always displays "UTC" regardless of the real setting, and **every
change is rejected 400** by strict Zod and surfaces as the generic `toast.error("Failed to save")`
(`preferences-page.tsx:112`). The backend migration comment says the real timezone moved to
`user_preferences.timezone`; the frontend was never cut over.

This is exactly the defect class AGENT-BRIEF rule 11 warns about: both repos green, the app wrong.

**Secondary (latent, not live):** `NotificationPreferences` also declares `id`, `createdAt`, `updatedAt`
as required, but for a user with no preferences row the backend returns
`{...DEFAULT_PREFERENCES, userId, orgId}` (`notification-preferences.service.ts:54`) carrying none of them.
Nothing dereferences them today.

**Not fixed** — the correct fix spans `types/notifications.ts` (unowned) and `hooks/api/**` (another
agent's). Fixing only `preferences-page.tsx` would leave the type lying.

### Gap 4 — `alert:dead-delivery` cannot fire

`pnpm alert:dead-delivery` exits 0 and reports `{"fired":false,"count":0,"rows":[]}`. That zero is not
evidence of health:

- its query is `WHERE status = 'DEAD'` over a 24h window (`src/scripts/alert-dead-delivery.mjs:82`);
- on the production-shaped seed, **`notification_deliveries` has 0 rows and `notification_queue` has 0
  rows** (measured directly). `check:retention-coverage` independently reports `notification_deliveries`
  at 0 MB on the `.env` database it reads;
- its own output names its destination as `"CONFIGURE_ME — wire exit-code 1 to your oncall system
  (PagerDuty, Slack webhook, etc.)"`.

So it is an unwired alert querying an empty table. It is measuring nothing, and it will report `count: 0`
whether delivery is perfect or entirely broken. **The DLQ/retry code paths are real** (`MAX_ATTEMPTS = 5`
and a `dead` transition at `notification-outbox-relay.service.ts:108`, a circuit breaker at
`notification-circuit-breaker.ts`, `retryDelivery` at `notification-delivery-worker.service.ts:452`), but
nothing in this release exercises them against data.

### Gap 5 — the SSE stream does not survive going offline

`use-notification-events.ts:12` sets `MAX_RETRIES = 5`; `:63-68` stops scheduling once
`retryCount >= 5` (~62 s of backoff). There is **no `window.addEventListener("online", …)`** to reset the
counter or reconnect, and the effect deps `[orgId, queryClient, router, status]` (`:91`) do not change on
reconnect. After about a minute offline the live notification stream is dead until the component
remounts.

Related, and an inconsistency worth naming: the two inbox surfaces have **inverted** offline coverage.
`/inbox` guards every write through `runWhenOnline` (`features/inbox/use-inbox-actions.ts:44,55-64`) but
renders no local banner; `/notifications` renders the banner
(`inbox/notifications-inbox-page.tsx:100,179-187`) but `use-notification-inbox.ts` has **zero** offline
guards — all 13 handlers call `.mutate()` unconditionally. Offline, that page tells you data may be stale
while every button still fires a request that fails. `use-inbox-actions.ts` is the correct pattern and it
was not applied.

---

## Consent, suppression, provider-response schemas — no defect found

- **Provider-response validation is real**: `notification-delivery-worker.service.ts:350` treats an
  invalid provider response shape as a *retryable failure* rather than trusting it, and
  `notification-delivery-worker-provider-validation.spec.ts` drives it.
- **Suppression and consent** have dedicated services and tenant-isolation specs
  (`email-suppression.service.ts`, `notification-suppression-record.spec.ts`,
  `email-suppression-tenant-isolation.spec.ts`).
- **De-duplication is sound.** `notification-dispatch-persistence.service.ts:107` uses
  `.onConflictDoNothing({ target: notificationDeliveries.idempotencyKey })`, and I verified in the live
  catalog that `uq_notification_deliveries_idempotency` is a **full** unique index, not partial — so the
  arbiter is inferable and no 42P10 is possible. `pnpm check:conflict-targets` (exit 0) confirms this
  across the module: 362 `onConflictDo*` calls scanned, 158 resolved, 13 targeting a partial index, and
  **both of its two open defects are outside my territory** (`billing/core/versioned-catalog.service.ts:182`,
  `hr/time/rosters.service.ts:41`).
- **Zero dead `err.code === "23505"` branches** in `storage`, `notifications`, `email`, `push`, `gdpr` or
  `common/media`. 28 exist repo-wide — inventory 3, hr 3, crm 2, billing 2, e-sign 1, 4 under `src/`.
  **Cross-territory finding.**
- **The unread badge is correctly invalidated on arrival**, which I checked because the canonical dispatch
  path inserts into `notifications` without touching the cache. It is handled one level up:
  `notification-dispatch.service.ts:285` → `notifications.service.ts:97-99` `announce()` →
  `lifecycle.invalidateCache` + a realtime `type: "notification"` emit. Not a defect.

---

## The referred perf defect — already fixed at HEAD, and now pinned

I was asked to fix `notifications-read.service.ts:334` `queryUnreadCount`, reported at **12,063 planning
buffers / 31.7–50.4 ms per request**. **That measurement describes pre-`3d157c15` code.** Commit
`3d157c15` ("prune 41 notification partitions", Sep 2) is an ancestor of HEAD and already added the
`created_at` retention window.

Measured on `scratch_perf_seed` (at head) as `streamline_app` with `app.organization_id` set, across the
89.93 / 9.00 / 0.90 / 0.18 skew, `EXPLAIN (ANALYZE, BUFFERS)`:

| Variant | Planning buffers | Warm planning | Partitions planned |
|---|---|---|---|
| Without the window (the reported shape) | **11,986** | 8.3–19.2 ms | 49 |
| At HEAD, with the window | **2,351** | 0.43–0.72 ms | 8 |

11,986 reproduces the reported 12,063 almost exactly, which is how I identified the measurement as stale.
Planning buffers are identical across all four tenants (planning cost is catalog-bound, not data-bound);
warm execution is 0.1–0.4 ms.

Answering the three questions put to me:

1. **`prepare: false` cannot change.** It is deliberate — `src/db/pool.config.ts:157` documents that a
   transaction-mode pooler cannot serve prepared statements, and `pool.config.spec.ts:43` pins it. But it
   does **not** cause the feared repeated planning: postgres.js sends an unnamed extended-protocol
   statement, so Postgres builds a one-shot plan with parameter values known.
2. **Plan-time pruning already happens, with real bind parameters.** Driving the actual driver
   (`postgres@3.4.9`, `prepare: false`) against the seed: `partitions_in_plan=8`,
   `subplans_removed_at_runtime=0` on every repetition — all pruning is at plan time, none deferred.
   Steady state after the first call in a backend is **24 planning buffers / 0.55–0.73 ms**, which is
   better than the 0.6–0.7 ms / 239–799 buffers cited for every other Home source.
3. **A maintained counter is not warranted.** The query sits behind a 30 s versioned cache
   (`notifications-read.service.ts:326-333`) whose namespace is correctly bumped on both arrival and
   lifecycle mutation. A counter would add write amplification across 9 `insert(notifications)` sites and
   re-create the `chat:unread` dead-namespace hazard for no measurable gain.

**What I did fix: the window was load-bearing and completely unpinned.** `notification-read-window.spec.ts`
tests the *helper* in isolation; nothing asserted the count *applies* it. I proved this by mutation —
deleting the two bounds from `queryUnreadCount` left **all three** pre-existing tests in
`notifications-counter-watermark.spec.ts` green while restoring the full 49-partition plan.

Added `notifications-counter-watermark.spec.ts:85-135`, which asserts both bounds are present, that the
lower bound equals `notificationWindowStart`, that the upper tracks `now` (asserted as an interval, not an
equality, so it cannot be flaky), and that the window is narrower than the declared partition range.
Under the same mutation this test is the **only** one that fails. The service file was restored and its
checksum verified identical.

---

## Measured gate reach

| Gate | Exit | Gate's own number | Governed set | Verdict |
|---|---|---|---|---|
| `alert:dead-delivery` | 0 | `count: 0`, threshold 0 | **0 rows in `notification_deliveries`; destination `CONFIGURE_ME`** | **VACUOUS — cannot fire** |
| `check:outbox-consumers` | 0 | 3,642 files; 24 emitted / 29 declared / 29 registered | 35 of 36 `OutboxWriter.emit` sites | **VACUOUS** (below) |
| `check:fire-and-forget` | 0 | 3,659 files; tier-1 0, tier-2 255 vs ratchet 279 | tier-1 real; tier-2 ratcheted | **REAL (tier 1) / NARROW (tier 2)** |
| `check:idempotent-commands` | 0 | "Controllers 546, handlers in scope 11" | **129 of 2,030 mutating handlers = 6.4%** | **NARROW + mislabelled** |
| `check:namespace-coverage` | 0 | 1,076 service files, 75 reads / 76 bumps | 4 read expressions unresolved | **NARROW** |
| `check:conflict-targets` | 0 | 362 calls, 158 resolved | 158 of 159 explicit targets | **REAL** |
| `check:tenant-isolation` | 0 | 931/931 (100%) | static existence, not execution | **NARROW (self-declared)** |
| frontend `check:empty-states` | 0 | 3,852 files | 122 candidate sites → 2 matches, both allowlisted | **NARROW, and it misses a real one** |
| frontend `check:gated-reads` | 0 | 720 read sites in 377 files | `SCAN_DIRS = ["hooks/api"]` | **ZERO files in `features/notifications/**`** |
| frontend `type-check` | 0 | — | **cached no-op: `Types: 89, Instantiations: 0`** | forced re-run: 0 errors, real |

Detail on the ones that bear on this ticket:

- **`check:outbox-consumers` cannot see an emission whose `eventType` is a variable.** Its predicate
  accepts only a quoted literal or an ALL-CAPS const (`check-outbox-consumers.mjs:239-247`); anything else
  is `continue`d away silently. `src/modules/expenses/expense-outbox-emitter.ts:43-52` passes
  `eventType: input.eventType` — **invisible**, covering 5 call sites and 2 live event types
  (`expense.submitted`, `expense.decided`). Simulating the regression the gate exists to catch — repointing
  both expense consumers at types nobody emits — the gate still reports PASS, because those types were
  never in `allEmitted`. Control runs confirm it *does* fire for literal-emitted types.
- **`check:idempotent-commands` prints its residual as if it were its scope.** "Handlers in scope 11" is
  `violations.length + excused.length` (`:239`); handlers that already carry `@Idempotent` (245 of them)
  are never counted. The real governed set is **129 critical handlers of 2,030 mutating handlers = 6.4%**,
  and since all 11 are on `HANDLER_EXCLUSIONS`, `violations` is 0 by construction. Its route regex anchors
  segments at position 0, so `/:id/refund`, `/:id/settle`, `/:id/void`, `/:id/pay`, `/:id/charge` are all
  out of scope.
- **`check:gated-reads` inspects zero files in my frontend territory.** `SCAN_DIRS = ["hooks/api"]`
  (`scripts/check-gated-reads.mjs:113`) and nothing else. It does cover the 12 notification/inbox read
  sites that live in `hooks/api`, and none of them appear in its residue. Its own header concedes it
  "reported 0 while 48 existed". Its `reportGateConsumption` walk (`:555-568`) — which never fails — finds
  exactly **one** non-test consumer of the permission gate repo-wide, and **zero** notification or inbox
  files consume it.
- **`check:empty-states` misses a real violation in my territory.** `features/notifications/notification-bell.tsx:207`
  is a hand-rolled empty state that its sibling page renders with `<EmptyState>`. It matches the structural
  regex but escapes the indicator regex because **"notifications" is not in the noun alternation**
  (`results|data|items|records|entries|invoices|branches|members|projects|tickets|employees|leads|deals`).
- **The frontend `type-check` exit 0 was a cached no-op** — `Files: 7026, Types: 89, Instantiations: 0`,
  no "Check time" line at all, because `incremental: true` reused `tsconfig.tsbuildinfo`. Forced with
  `--incremental false`: `Types: 1048410, Instantiations: 3109386, Check time: 25.72s`, **0 errors**. The
  tree is genuinely clean, but the first exit code proved nothing. `tsconfig.json` also excludes all test
  files, so the 9 specs in my territory are not typechecked there.

---

## Commands run

| Command | Exit | Number |
|---|---|---|
| `pnpm alert:dead-delivery` | 0 | count 0 over an empty table |
| `pnpm check:outbox-consumers` | 0 | 3,642 files; 24/29/29 |
| `pnpm check:fire-and-forget` | 0 | tier-2 255 vs ratchet 279 |
| `pnpm check:idempotent-commands` | 0 | 546 controllers, 11 residual (129 governed) |
| `pnpm check:namespace-coverage` | 0 | 75 reads / 76 bumps, 1 dead bump (`chat:unread`) |
| `pnpm check:conflict-targets` | 0 | 362 calls, 2 ratcheted defects (neither mine) |
| `pnpm check:tenant-isolation` | 0 | 931/931 |
| `pnpm typecheck` (backend) | 0 | 0 errors |
| `pnpm check:spec-typecheck` | 0 | passed |
| `jest --testPathPattern="modules/(storage\|notifications\|email\|push\|gdpr)/"` | 0 | 95 suites, 875 tests |
| frontend `check:empty-states` | 0 | 3,852 files |
| frontend `check:gated-reads` | 0 | 720 sites, 0 in my territory |
| frontend `type-check` | 0 | cached; forced re-run 0 errors |

## Files changed

- `src/modules/notifications/notifications-counter-watermark.spec.ts` — pins the partition-pruning window
  (mutation-proven to bite)

## Where code correctness ends and operator evidence begins

- **Delivery has never been exercised against data in this release.** `notification_deliveries` and
  `notification_queue` are both empty on the production-shaped seed. Every claim about retry, DLQ,
  circuit-breaking and tenant fairness in this report is a claim about **code shape**, verified by reading
  and by unit tests. Gap 1 in particular is a code-shape argument: it needs six busy tenants and a
  saturated queue to demonstrate, which requires a seeded delivery backlog nobody has built.
- `alert:dead-delivery` is unwired (`CONFIGURE_ME`) — routing it to an oncall system is operator action.
- Whether push subscriptions are actually being pruned server-side (Gap 2's second half) is a deployed
  fact I cannot read from code.
