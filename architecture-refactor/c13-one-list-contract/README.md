# c13 — One contract for every list

PRD: [`prd.md`](prd.md) · Program: [`../README.md`](../README.md)

**Wave 0** · 6 tickets, 5 done.

All five scrolled surfaces now page by cursor — chat, the inbox, the activity feed, notifications
and the Build board — each on one shared implementation of the sentinel step. Every list total in
the backend comes from a window or a parallel count; none costs a sequential extra round trip. The
one ticket still open is 06, held by 28 hand-rolled page fields: 19 sit in modules other sessions
are editing right now, and 9 belong to endpoints that deliberately exceed the platform cap of 100,
where migrating would quietly shrink what they return.

Numbers that turned out to be wrong, re-verified 2026-08-27: **411** local pagination-schema fields
across 141 files — not 16, and not the 204 counted on 2026-08-26 · **5** sequential list counts
repo-wide, not 241 and not 1, found only by reading each method rather than each file · **20** files
already used `count(*) OVER ()`, not three · `.offset()` at 143 files is correct.

Measured on the real branch (200,002 tickets) as `streamline_app` with the tenant GUC, the only role
whose plans mean anything: a 50-row page cost **16,725 blocks on every one of the five sortable
columns**, because no index carried the whole `ORDER BY` tuple. Migration `0575` takes all five to
an Index Only Scan at **180–196 blocks**.

| # | Ticket | Blocked by | Status |
|---|---|---|---|
| 01 | [A ticket opens by its key](issues/01-a-ticket-opens-by-its-key.md) | — | done — deep link verified on the real branch; cross-tenant returns 404, never 403 |
| 02 | [The board does not ship descriptions](issues/02-the-board-does-not-ship-descriptions.md) | 01 | done |
| 03 | [A list total costs no extra round trip](issues/03-a-list-total-costs-no-extra-round-trip.md) | — | done — 185 paging methods audited per method; all 5 sequential counts converted, 0 remain |
| 04 | [The receivables total is computed once](issues/04-the-receivables-total-is-computed-once.md) | 03 | done — premise was already false; totals pinned by spec, budget executes, ceiling provisional (branch has no `clients`) |
| 05 | [Scrolled lists page by cursor](issues/05-scrolled-lists-page-by-cursor.md) | — | done — all five named surfaces on the helper; board cursor verified live, 500 rows, 0 duplicates |
| 06 | [Every list speaks one filter and sort vocabulary](issues/06-every-list-speaks-one-filter-vocabulary.md) | 05 | in-progress — 383 of 411 fields migrated and sorting now composes (16,725 → 196 blocks); last 28 are other sessions' files and above-cap endpoints |

## Working these

Work the frontier — any ticket whose blockers are all done. A ticket marked `—` under **Blocked by** can start immediately.

Every ticket is a vertical slice: it cuts a narrow but complete path through schema, API, UI and tests, and is verifiable on its own. None is a layer.

Acceptance criteria are the contract. The **Todo** list is a suggested route and may be ignored if a better one exists — the criteria may not.
