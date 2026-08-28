# 18: Cursor-page and index HR Helpdesk search

**What to build:** Helpdesk lists and searches stay bounded and tenant-safe without leading-wildcard table scans.

**Blocked by:** None (can start immediately).

**Status:** done

- [x] Lists use validated filters and stable cursor pagination.
- [x] Search uses the approved tenant-safe indexed search mechanism.
- [x] Permission/DataScope predicates execute before result retrieval.
- [x] Production-shaped query plans and search/pagination tests pass.

## Changes

- `backend/src/modules/hr/helpdesk/dto/hr-helpdesk.schemas.ts` — `page`/`pageSize` replaced by `cursor`/`limit`; added the `q` search filter.
- `backend/src/modules/hr/helpdesk/hr-helpdesk.service.ts` — `list()` walks a `(created_at, id)` keyset with `keysetBeforeId` + `buildCursorPage` and drops the second `COUNT(*)`; the ownership, confidentiality and filter predicates are all in the `WHERE` clause, so nothing is fetched and then discarded. `suggest()` and the new ticket search both go through a SECURITY DEFINER id probe. `getById()` now also binds `org_id` when reading comments.
- `backend/migrations/0640_helpdesk_search_and_cursor_indexes.sql` — four tenant-leading keyset indexes, two `gin_trgm_ops` indexes, and `app.search_helpdesk_ticket_ids` with `REVOKE ALL … FROM PUBLIC` + `GRANT EXECUTE` to the app role. It also drops the three indexes the new ones supersede (`idx_helpdesk_tickets_org_status`, `_org_user`, `_org_assignee` — each a strict prefix of a new index).
- `backend/src/db/schema/hr/attendance.ts` — the same four indexes declared on `helpdeskTickets`.
- Frontend: `hooks/api/hr/helpdesk.ts`, `features/hr/helpdesk/queue-tab.tsx` (debounced search box + `CursorPageControls`), `features/hr/helpdesk/my-tickets-tab.tsx`.

## Findings

- `suggest()` ran `ILIKE '%q%'` against `kb_articles` while `app.search_kb_article_ids` — the approved probe for exactly that table — already existed unused. This is the second module found searching a table raw beside its own probe.
- The helpdesk list had no text search at all, so "search" was a leading-wildcard scan in the suggest path only. The list now has a bounded one.
- Two defects were fixed in the delegated work before it was accepted: the Drizzle index declarations omitted `DESC` (so the schema disagreed with the SQL, and the next `db:generate` would have proposed a drop/recreate), and three superseded index declarations had been deleted from the schema without the migration dropping them.
- A third defect was a zero-result fallback: both probe call sites fell back to a plain `ILIKE` when the probe returned **no** rows. That is the exact case the probe exists for — a term matching nothing is what scans the whole table. Both now return `false` without touching the table, and there is a test for it.

## Verification

`node ./node_modules/jest/bin/jest.js src/modules/hr/helpdesk`:

```
PASS src/modules/hr/helpdesk/hr-calendar.service.spec.ts
PASS src/modules/hr/helpdesk/hr-helpdesk.service.spec.ts
PASS src/modules/hr/helpdesk/hr-helpdesk-events.consumer.spec.ts
Tests:       26 passed, 26 total
```

The two search tests as delivered asserted only that `db.execute` had been called once — they passed against any implementation. They now render the built predicate with `PgDialect.sqlToQuery` and assert the actual SQL: the probe is asked for `cap + 1`, a within-cap result filters on `id in (…)` with no `ILIKE`, a zero-result search emits `false`, and only past the cap does it fall back to `ILIKE`. The confidentiality test was strengthened the same way, from `expect(whereCall).toBeDefined()` to asserting `is_confidential`, `user_id` and both bound parameters.

Query plans as `streamline_app` with the tenant GUC, against 203,000 seeded tickets in one organization and 20,000 in a second (`node src/scripts/check-hr-list-read-cost.mjs`):

```
helpdesk-page-1              blocks=      90 (ceiling 2000) Index Scan using idx_helpdesk_tickets_org_created
helpdesk-page-deep-cursor    blocks=      90 (ceiling 2000) Index Scan using idx_helpdesk_tickets_org_created
helpdesk-non-admin-cursor    blocks=      28 (ceiling 2000) Index Scan using idx_helpdesk_tickets_org_user_created
helpdesk-search-probe        blocks=     202 (ceiling 2000)
helpdesk-search-probe-miss   blocks=      53 (ceiling 2000)
helpdesk-search-ilike-baseline blocks=     131 (baseline)
helpdesk-search-miss-baseline blocks=    7349 (baseline)
OK
```

Page one and page 5,000 both cost 90 blocks — the cursor cost does not grow with depth.

**The search numbers are not a uniform win and the ticket should say so.** For a term that matches plenty of rows the raw `ILIKE` is *cheaper* (131 blocks against the probe's 202), because `LIMIT` lets it stop early. The probe earns its place on the miss: **53 blocks against 7,349**, because a term matching nothing has no early exit and reads the whole table. That asymmetry is the reason for the cap-and-fall-back shape rather than a blanket replacement.

Catalog verification after applying `0640`:

```
idx_helpdesk_tickets_org_created, idx_helpdesk_tickets_org_status_created,
idx_helpdesk_tickets_org_user_created, idx_helpdesk_tickets_org_assignee_created,
idx_helpdesk_tickets_title_trgm, idx_helpdesk_tickets_description_trgm
app.search_helpdesk_ticket_ids | owner neondb_owner | acl neondb_owner=X/neondb_owner,streamline_app=X/neondb_owner
```

The three superseded indexes are gone, and the probe is owned by the BYPASSRLS role with `EXECUTE` granted only to the app role.

Runtime, against the booted API (`node src/scripts/verify-hr-list-endpoints.mjs`):

```
PASS  helpdesk page 1 returns a cursor envelope — status=200 rows=3
PASS  helpdesk page 2 walks the cursor without repeating a row — status=200 page2=3004,3005,3006
PASS  helpdesk search returns only matching rows — status=200 rows=5
PASS  helpdesk search returns nothing for a term with no match — status=200 rows=0
```

Backend `tsc --noEmit -p tsconfig.build.json` and frontend `tsc --noEmit`: both clean.
