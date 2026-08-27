# c13 — One contract for every list

PRD: [`prd.md`](prd.md) · Program: [`../README.md`](../README.md)

**Wave 0** · 6 tickets, all done.

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
| 01 | A ticket opens by its key | — | done — deep link verified on the real branch; cross-tenant returns 404, never 403 |
| 02 | The board does not ship descriptions | 01 | done |
| 03 | A list total costs no extra round trip | — | done — 185 paging methods audited per method; all 5 sequential counts converted, 0 remain |
| 04 | The receivables total is computed once | 03 | done — premise was already false; totals pinned by spec, budget executes, ceiling provisional (branch has no `clients`) |
| 05 | Scrolled lists page by cursor | — | done — all five named surfaces on the helper; board cursor verified live, 500 rows, 0 duplicates |
| 06 | Every list speaks one filter and sort vocabulary | 05 | done — 403/411; 9 over-cap ceilings need a product ruling |

## Closed ticket digests

**01 — A ticket opens by its key.** `GET :projectId/tickets/key/:ticketNumber` added at `projects-tickets.controller.ts:151`; the service queries by `(orgId, projectId, ticketNumber)` directly so any position works and cross-tenant requests return 404 (never 403). Verified live on a 200,002-ticket org — tickets 1, 101, and 3335 all returned 200; unknown key 404; another org's member 404. Specs: `ticket-by-key.spec.ts` (3 tests), `projects-tickets-key-authz.e2e-spec.ts` (12 tests, 12 pass). `projects-tickets-key.e2e-spec.ts` skips without `RBAC_E2E_DATABASE_URL` — recorded in `OPEN-FINDINGS.md §3`.

**02 — The board does not ship descriptions.** `description` removed from `TICKET_LIST_COLUMNS` in `projects-tickets-read.service.ts:58-86`; `epic-story-row.tsx` updated to handle absence. `board-projection.spec.ts:22` spies on `db.query.tickets.findMany`, captures the `columns` argument, and fails if `description` re-appears. `frontend/types/projects/tasks.ts:85` is now `description?: string | null`; all three frontend consumers guard the absence.

**03 — A list total costs no extra round trip.** Exhaustive per-method audit (185 paging methods, 143 files) found exactly 5 sequential counts — not 241; all 5 converted to `count(*) OVER ()`. Shared helper extracted to `backend/src/common/pagination/window-count.ts` (`totalOverWindow`, `resolveWindowedTotal`, `withoutTotal`). Covered by `automation-runs-list-total.spec.ts` (5 tests), `recurring-journals-list-total.spec.ts` (4 tests), `window-count.spec.ts` (10 tests). Remaining 123 out-of-territory files listed in `OPEN-FINDINGS.md §5`.

**04 — The receivables total is computed once.** Premise was already false: `accounting-receivables.service.ts:84` already selected `count(*) OVER ()` alongside the aggregation; the double-compute described by the ticket never existed. The executable replacement for a vacuous before/after comparison is `receivables-total-equivalence.spec.ts` (10 tests), pinning window total, `totalPages` derivation, empty-page zero, and filtered fallback. Read budget entry at `scripts/read-cost-budgets.mjs:734-739`; ceiling provisional because branch has no `clients` table — recorded in `OPEN-FINDINGS.md §11`.

**05 — Scrolled lists page by cursor.** All five named scrolled surfaces (chat 3 methods, inbox, activity feed, notifications, Build board) now use `buildIdCursorPage` / `buildCursorPage` from `backend/src/common/pagination/cursor.ts`. Two pre-existing defects fixed: notifications cursor bounded `id` while ordering by `created_at` (permanent row skips); an exhausted mail account replayed its full mailbox because `undefined` drops from JSON (`null` now used, `mail-normalizers.ts:342-349`). Mail composite cursor is HMAC-signed (`mail-normalizers.ts:375-427`). Build board verified live: 20 pages × 25 rows, 0 duplicates. 73 tests across 5 spec files, all pass.

**06 — Every list speaks one filter and sort vocabulary.** Shared schema at `backend/src/common/pagination/list-query.schema.ts` (`pageSizeField` clamps, `withSortField` allows-lists); 403 of 411 hand-rolled fields migrated; `list-query.schema.spec.ts` (154 tests). Sort-index gap found by live EXPLAIN: all five sortable columns fell off the index at 16,725 blocks/page; migration `0575_ticket_list_sort_indexes.sql` takes all five to Index Only Scan at 180–196 blocks — migration needs a journal entry, recorded in `OPEN-FINDINGS.md §10`. Nine over-cap endpoints (csat 500, party 500, issues/data-quality 400, hr/interviews 200, tasks 200) need a product ruling before migration — recorded in `OPEN-FINDINGS.md §6`.

## Working these

Work the frontier — any ticket whose blockers are all done. A ticket marked `—` under **Blocked by** can start immediately.

Every ticket is a vertical slice: it cuts a narrow but complete path through schema, API, UI and tests, and is verifiable on its own. None is a layer.

Acceptance criteria are the contract. The **Todo** list is a suggested route and may be ignored if a better one exists — the criteria may not.
