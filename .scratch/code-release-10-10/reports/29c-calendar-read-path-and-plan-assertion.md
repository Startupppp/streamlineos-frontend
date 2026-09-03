# 29c — `GET /calendar/events` redesigned, and the plan assertion that would have caught it

**Status:** the redesign named in report 22d is built and measured. The read-cost gate for
`calendar-events-visible-batch` is **green at 706 blocks against an untouched 2,000 ceiling**
(it was 7,063 and deliberately red). The two cross-territory asks 22d handed over —
`forbid-hashed-subplan` and the private upcoming seed anchor — are both delivered.

Every number below was taken on **`scratch_perf_seed`** (local, journal head, `VACUUM ANALYZE`d)
as **`streamline_app`** (`rolbypassrls = false`) with `app.organization_id` set, **in buffers**,
on the four seeded tenants (89.93 / 9.00 / 0.90 / 0.18 percent). `DATABASE_URL` was never touched.

---

## 1 — What the old query did, and why the number moved the wrong way first

`CalendarEventSourceLoader.queryVisibleEvents` was one statement: both range branches under an
`OR`, three left joins, an 18-column projection, `LIMIT 500`, keyset-paged.

The recurring arm has no lower bound on `start_date`. The planner therefore walked
`idx_calendar_events_org_date` from the tenant's first event forward and fetched the heap tuple
for **every** candidate before the window filter could reject it — 3,610 rows scanned to keep
517, **7,063 buffers for one page**, four times a sequential scan of a 1,731-page table.

Splitting the branches and fetching by candidate id cut that to 1,815 per page. **It also
tripled the round trips**, and an agent measuring over HTTP caught it: 79 → 196 statements,
p95 583.8 → 915.9 ms, over the route's 800 ms ceiling. A buffers-only win that multiplies
statements is not a win.

The cause was not the split. It was the drain: the keyset loop paged until the tenant's whole
window was in memory — **8,522 event rows over 18 pages** — while both consumers were already
capped far below that. `CalendarNativeEventSource` stops projecting at `CALENDAR_EVENTS_CAP`
(2,000) and `CalendarSourceRegistry:105` then keeps the first **400**. The loop was reading
twenty times what anything downstream could use, and its statement count grew with the tenant
rather than with the answer.

## 2 — The shape now, and what each statement is for

Four statements per page, at most four pages:

1. **candidate identifiers, non-recurring** — `rrule IS NULL AND start_date < end AND end_date > start`,
   served by `idx_calendar_events_org_end_date`. Only 260 of the tenant's 60,012 rows have
   `end_date > start`, so this branch is bounded where the combined `OR` was not.
2. **candidate identifiers, recurring** — served by the partial `idx_calendar_events_org_recurring_start`.
3. **the caller's RSVP for this page** — `event_id = ANY(ids)` through
   `event_attendees_event_membership_unique`. As a `LEFT JOIN` the planner hashes the caller's
   whole attendee set (1,128 blocks); as a `LEFT JOIN LATERAL` it probes per row (1,834); as its
   own statement over the page's ids it is **501**.
4. **the wide projection**, by identifier, with no joins at all. The creator's display name is a
   property of a membership, not of an event, so it is resolved **once per request** over the
   distinct membership ids — joined per page it was 582 of the 0.90% tenant's 603 blocks.

The two candidate branches are merged in memory rather than by SQL `UNION ALL`. That is safe
against the page boundary: each branch is ordered and limited by the same `(start_date, id)` key,
so a row in the global first 500 is necessarily in the first 500 of its own branch.

**The visibility test is a scalar sublink, not an `EXISTS`, and that is load-bearing.** As an
`EXISTS` the planner de-correlates it into a hashed SubPlan that materialises all 39,114 attendee
rows of the fixture membership *before* the `OR` can short-circuit on `visibility = 'org'` — a
cost that is O(the caller's own attendance), not O(page). A scalar sublink is not hashable, so it
stays a correlated probe evaluated only for rows the two cheap arms did not already admit:
**47 probes for 172 blocks** instead of 1,128.

## 3 — Measured

| tenant | statements (was) | worst statement (was) | whole load (was) |
|---|---:|---:|---:|
| 89.93% | **19** (20) | **697** (7,063) | **10,552** (433,308) |
| 9.00% | **11** (4) | **700** (202) | **1,208** (416) |
| 0.90% | **7** (3) | **46** (70) | **109** (82) |
| 0.18% | — | — | — (no calendar_events) |

State the trade honestly. On the two minority tenants the whole-load buffer count goes **up**
(416 → 1,208 and 82 → 109) and so does the statement count, because the old single query could
reach a Bitmap-OR over both indexes when the whole candidate set was small, and four statements
have a floor the one statement did not. Both remain tiny in absolute terms and both stay far
under every ceiling. What is bought is the majority tenant — 41x less database work — and the
removal of two unbounded quantities: the scan is no longer O(the tenant's history) and the
attendee probe is no longer O(the caller's attendance).

**The statement count is now bounded at 19 for this source** whatever the tenant size or the
window width. Before, it was proportional to the tenant's event count, which is what the HTTP
measurement caught.

**Equivalence, not just cost:** the old keyset loop and the new one were run against each other
on all four tenants and compared row-for-row including RSVP status — `identical=true` on every
tenant under the drain bound. (Above the bound the 89.93% tenant now stops at 2,000 rows by
design; see §2.)

## 4 — `forbid-hashed-subplan`, the third assertion kind

22d asked for it and said it "would have caught this without any fixture work at all". It is now
in `run-read-cost-budgets.mjs` beside `require-index-only-scan` and `forbid-seq-scan`.

It reads the plan rather than the number: it collects the `(hashed SubPlan N)` names out of every
qual field and fails if the named relation is scanned inside one. A hashed SubPlan's cost is
O(inner relation), so it is invisible on a small tenant, invisible on a warm cache, and invisible
in any fixture that happens not to reach the row that triggers it — `GET /dashboard/personal`
measured 6 blocks on one run and 1,140 on the next for exactly this reason.

Applied to `calendar-events-visible-batch` and `dashboard-personal-calendar-events`, the two
budgets that carried the defect. `validateBudgets` now also rejects an unknown assertion kind,
which previously surfaced only as a per-run failure.

**Bite proof, twice.** `run-read-cost-budgets.mjs --self-test` detects **all 6** breach types
(was 5) — a new fixture using `NOT IN (SELECT …)`, which cannot be pulled up into a semi-join and
so is reliably hashed. And on the *real* budget: turning the calendar scalar sublink back into an
`EXISTS` turns `calendar-events-visible-batch` **FAIL** — *while staying under the 2,000 ceiling*.
The ceiling could not have caught it. Only the plan assertion did.

## 5 — The private upcoming seed anchor

`test/perf/seed-heavy-query-load.mjs` now seeds, per tenant, one **private, upcoming,
non-recurring, unattended** event at a timestamp **no other event of that tenant shares**, placed
at `GREATEST(now(), max(start_date))` plus a distinctive offset so uniqueness and
upcoming-ness hold by construction rather than by luck.

Its post-conditions are **checked, not assumed** — private, upcoming, single, alone at its
timestamp, unattended — and the section fails the seed if any has drifted. That check is a pure
function (`anchorDefects`) so the self-test can exercise it: `--self-test` is now **11/11**
(was 6/6), including four cases that each turn one post-condition off. The insert is idempotent
(a second run reports the same ids).

**Honest limit.** The anchor is placed *after* every existing event, which guarantees each tenant
always has an upcoming event — so an upcoming-events budget can never go vacuous as the seed ages,
which is how `dashboard-personal-calendar-events` was already reading `UNMS`/0 rows on the 0.90%
tenant. It does **not** enter a `LIMIT 3 ORDER BY start_date ASC` while fresher upcoming events
exist. On this seed the same-day band of ~56 `org` events sorts ahead of it for about 23 hours
after a seed; after that the anchor is the only upcoming event and the non-`org` branch is forced.
A durable top-3 private anchor is not constructible on this seed's shape, because the 12
reminder-window events are `org` and always occupy the first slots. Said plainly rather than
claimed away.

## 6 — Gates

| command | exit | result |
|---|---|---|
| `run-read-cost-budgets` (89.93%, samples=5) | 0 | **71 PASS / 0 FAIL**, 71/71 measured (100%), STATUS OK |
| `run-read-cost-budgets --self-test` | 0 | **all 6 breach types** detected (was 5) |
| `run-read-cost-budgets --ids=calendar-events-visible-batch` | 0 | **706 blocks**, ceiling 2,000, ceiling NOT raised |
| same, with the sublink reverted to `EXISTS` | 1 | **FAIL on the plan assertion, under the ceiling** |
| `seed-heavy-query-load.mjs --self-test` | 0 | **11/11** (was 6/6) |
| `seed-heavy-query-load.mjs` (scratch_perf_seed) | 0 | every section succeeded; anchors 66649 / 66662 / 66675 |
| `jest --testPathPattern="src/modules/calendar"` | 0 | **42 suites / 396 tests** |
| `jest --testPathPattern="src/modules/calendar\|src/modules/kb"` | 0 | **136 suites / 988 tests** |
| `pnpm typecheck` | **0** | |
| `pnpm check:spec-typecheck` | **0** | |
| `pnpm -s check:file-sizes` / `check:route-classification` / `check:db-call-count` | 0 | |
| `pnpm -s check:tenant-isolation` | **1** | **not mine** — see §8 |

**Not run:** the HTTP harness (`route-budget-http.seeded-e2e-spec.ts`) on `scratch_t23_http`.
p95 is therefore **not re-measured by me**. The statement count is, and it is back to 19 for
this source; the p95 regression another agent measured was attributed to the statement
multiplication that the §2 drain bound removes, but that is an inference, not a measurement.
**Somebody must re-run the HTTP harness before this is called closed.**

## 7 — The KB attachment orphan (out of ticket, assigned mid-pass)

`kb_page_attachments` carries a composite `(org_id, page_id)` FK with `ON DELETE CASCADE`, so
`hardDelete`, `emptyTrash` and `purgeExpired` each took the attachment rows with the page and
left the R2 objects behind. Once the row was cascaded away nothing recorded that the object had
ever been ours — an orphan **no backfill can find**, because the pointer lived only in the row
that was deleted.

Fixed by the mechanism the repo already has and which nothing in KB used:
`storage_pending_purge`, the write-ahead record that `CronStorageSweepService.drainPendingPurge`
reads back and retries. All three paths now open a `pending` row for every file key **before**
the delete, then attempt the object delete and mark `confirmed`/`failed`. A failure to open the
write-ahead row **propagates**, so the page is not deleted; a failure to delete the object does
not, because the row survives for the sweep.

Proof: `kb-page-attachment-purge.spec.ts` (7) + `kb-page-tree-attachment-purge.spec.ts` (5),
both green; removing the three `recordPageAttachmentPurge` calls from the service turns **4 of 5**
red in the second file, including the invocation-order assertion that pins record-before-delete.

## 8 — Cross-territory findings

1. **`StorageService.deleteFile` has no bucket override, but `uploadFile` does.** KB media is
   uploaded with `R2_KB_BUCKET_NAME` (`kb-media.service.ts:128`) and deleted without it
   (`kb-sources.service.ts:182`, and now the purge above follows the same pattern). Where
   `R2_KB_BUCKET_NAME` is set and differs from `R2_BUCKET_NAME`, **every KB object delete targets
   the wrong bucket** and silently succeeds. Pre-existing; my fix inherits it. `src/modules/storage/**`.
2. **`check:tenant-isolation` is red at head and it is not this pass's doing.**
   `MISSING src/modules/storage/storage-pending-purge.service.ts` — that file arrived in
   `a6902e5e` at 07:08, six minutes after `638adb67`, the head this session started from. The
   gate reads **929 / 930**; it was 929/929. It needs a cross-tenant negative spec naming
   `StoragePendingPurgeService`. `src/modules/storage/**`.
3. **The next lever on `GET /calendar/events` is the 400-row cap, not the query.**
   `CalendarSourceRegistry` keeps 400 events per source and `CalendarNativeEventSource` projects
   up to 2,000 before that. The loader is now bounded at 2,000 rows, which is still 5x what
   survives. Lowering the loader's bound toward the registry's cap would take this source from 4
   pages to 1 — but it changes which events a user sees when occurrences are cancelled, so it is
   a product decision, not a perf change, and I did not take it.
