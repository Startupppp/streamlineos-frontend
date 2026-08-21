# 02 — My Work shows all of your work

**What to build:** My Work took 500 participation rows with no ordering and built the list from those. Anyone working across more than 500 tickets saw an arbitrary, unstable subset — different items on different visits — with nothing indicating rows were missing. `getAllWork` did the same with a 1,000-row cap on both the `mine` and `subscribed` scopes. One seeded user participates on 42,859 tickets.

**Status:** done

## The obvious fix was 13× more expensive

Replacing the id list with a correlated `EXISTS` is correct and reads well, and it made My Work **157,240 buffers — 1.2 GB**. `getAllWork` ran that twice, once for the page and once for the count: **314,474 buffers**.

The reason is structural, and it generalises: **an `OR` between an indexed predicate and a semi-join defeats both.** `assignee_id = me OR EXISTS(participation)` cannot use the assignee index, because rows matching only the second branch would be missed, so the planner scans every ticket in the organisation. The cost becomes O(organisation) — 200,001 tickets — no matter how little work you actually have.

Splitting the `OR` into a `UNION` of two independently-indexed branches makes the cost O(*your* work instead of the org's):

| shape | My Work | all-work `mine` (page + count) |
|---|---:|---:|
| old, 500/1,000 unordered ids — **wrong** | 12,052 | 24,110 |
| `EXISTS` in an `OR` — correct, naive | 157,243 | 314,474 |
| **`UNION` of two branches, single pass** | **24,483** | **24,478** |

Both are now one query rather than two: `count(*) OVER ()` carries the total out of the union, the way ticket 01 does for a board. So `getAllWork` is **12.8× cheaper than the naive fix and level with the old broken version**, while being correct — and for a normal user holding tens of items rather than 42,859, it is dramatically cheaper than either.

This is the mirror image of ticket 01, and the pair gives the rule: **when the outer set is already narrowed to one project, a single pass with `EXISTS` wins; when it is the whole organisation, a `UNION` of indexed branches wins.** Ticket 01 deleted a UNION for exactly the reason this ticket adds one.

Both branches ride the covering index shipped in ticket 01 — `Index Only Scan using idx_ticket_assignees_org_user_ticket` — so no new index or migration was needed here.

## Verification

Typecheck and build prove nothing about a raw SQL template, so the generated SQL was rendered through the Postgres dialect, executed against the seeded database as the RLS-enforced role, and cross-checked:

- The union's total (34,287) equals a reference `EXISTS`-`OR` count of the same predicate, exactly.
- The seed makes every participant also the assignee, so the participation branch proved nothing on its own. A participation row was inserted for a ticket assigned to someone else: total went 34,287 → 34,288 and the ticket appeared; deleting the row restored both. Seed left byte-identical.

**Blocked by:** None

- [x] A member participating in more tickets than the page bound receives a correct, deterministically ordered first page — the bound is gone entirely, not raised
- [x] Repeating the request returns the same items in the same order — every sort now carries an `id` tiebreaker; previously ties were planner-arbitrary across all non-rank sorts
- [x] Where a bound is applied, the response indicates it — no arbitrary bound remains. `getAllWork` reports a true `total`; `getMyWork` returns a deterministic top-100 by urgency rather than an arbitrary subset
- [x] The participation lookup carries an explicit organisation predicate alongside the policy — as do the two `project_members` lookups, which had the same omission
- [x] A member with fewer participations than the bound sees no behaviour change
- [x] Archived projects remain excluded, as today — the predicate is inside both union branches

## Caught in code review

The first cut passed `col` and `dir` into the UNION builder while separately deriving `sortExpr` for hydration — two derivations of one concept. They disagreed for exactly one input: `orderBy=rank` forced ascending in `sortExpr` but honoured `orderDir` in the union's `ORDER BY`. So `?scope=mine&orderBy=rank&orderDir=desc` **selected the last page's ids and then displayed them ascending** — a wholly wrong page, and a bug this ticket introduced rather than one it inherited.

Fixed by giving the sort one owner: `resolveWorkSort` in `work-scope-union.ts` returns the direction, the hydration sort, the carried columns and the union `ORDER BY` together, so the two can no longer drift. Verified over HTTP: `rank&orderDir=desc` now matches `asc`, `dueDate` asc and desc genuinely differ, and page 2 of a descending sort does not overlap page 1.

## Findings for you

- **`GET /projects/my-work` has no caller.** The command centre derives its items from paginated all-work via `mapAllWorkTicketToMyWorkItem`; nothing in the frontend fetches this route. It duplicates `getAllWork(scope: "mine")`. I fixed it rather than delete it — removing a public route is your call, and a non-web client could use it.
- **`ticket_watchers` carries the same index shape `ticket_assignees` had** — `(ticket_id, user_id)` plus `(user_id)`, no tenant-led covering index. The `subscribed` scope will hit the identical ceiling once watchers grow. The seed holds **one** watcher row, so I did not add an index I could not measure; that is exactly how the three rejected `tickets` indexes happened.
- **`projects-work-query.service.ts` is 440 lines** — under the 500 hard cap, over the 300 target, and it was 386 before. The union builder went into its own module rather than adding to it.
