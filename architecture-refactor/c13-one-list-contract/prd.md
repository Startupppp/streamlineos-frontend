# c13 · One contract for every list

**Status: three helpers exist, none is the default.** Verified at source 2026-08-25. `common/pagination/cursor.ts` implements keyset pagination correctly — opaque cursor, id tie-break, `limit + 1` sentinel so `hasMore` costs nothing. Six files use it. `paginateOffset` caps a page at 100 and is used by 34. **143 files call `.offset()` directly.** Counting is split too: 166 `count()` calls run inside a `Promise.all` and 241 do not.

> **Correction, verified 2026-08-25 during implementation.** This spec originally claimed **zero** TypeScript files use a `count(*) OVER ()` window. That is wrong — **three do**: the ticket list read, the work-scope union, and HR interviews. The technique is already proven in this codebase, so the remaining work is propagation with in-repo prior art to copy, not introduction of a new pattern.

## Problem Statement

**As a user deep in a list, every page is slower than the last.** Offset pagination re-reads and discards every row before the page. Page 50 costs fifty pages of work to return one.

**As a user scrolling a list something is writing to, I see rows twice.** A row inserted above my position shifts everything down, so the next page repeats what I just read — or skips a record entirely. On chat, notifications and ticket lists, which are written to constantly, this is a correctness problem, not a performance one.

**As a user opening a ticket by its key, the page fetches a hundred other tickets.** The detail page resolves `PROJ-247` to a numeric id by downloading the project board's first hundred tickets — **with their full descriptions** — and searching the array. Past a hundred tickets, the ticket **cannot be opened at all**: deep links, notification links and shared URLs silently fail. One production tenant has over two hundred thousand tickets.

**As a user, every list page costs a round trip it does not need.** 241 count queries run as a separate await after the page query, so the page waits for two sequential round trips to render one screen.

**As a user of the receivables screen, the total is computed the expensive way.** When filtered to outstanding only, the count re-runs the entire join, grouping and having clause as a subquery purely to count rows. The full aggregation executes twice per page view.

**As a developer, I choose a pagination strategy per endpoint.** Three helpers, no default, so the answer is whatever the neighbouring file did.

## Solution

Make the list contract a decision taken once. Three parts:

**Cursor by default where it matters.** Do not convert 143 call sites — offset is genuinely fine for a page-numbered admin table someone opens twice a week. Convert the surfaces that are *scrolled* and *concurrently written*: chat, notifications, activity feeds, ticket lists, the inbox. Roughly a dozen endpoints, where offset is a correctness bug and not just a slow one.

**Count in the same pass.** Replace the separate count with a `count(*) OVER ()` window where a total is needed at all — one scan instead of two queries. Where a total is *not* needed, the `limit + 1` sentinel already answers `hasMore` for free.

**Resolve a ticket by its key on the server.** A dedicated by-key read replaces the hundred-row download, and `description` comes out of the board list projection — the kanban never renders it.

## User Stories

1. As a user, I want page fifty of a list to cost the same as page two, so that a long list stays usable.
2. As a user scrolling a live list, I want each row exactly once, so that new arrivals do not make me re-read or skip records.
3. As a user, I want a list page to render after one round trip, so that a total does not double my wait.
4. As a user opening a ticket by its key, I want that ticket fetched, so that the page is not downloading a hundred others.
5. As a user, I want a ticket outside the first hundred to open, so that deep links, notification links and shared URLs work.
6. As a user following a link to an old ticket, I want it to load, so that history remains reachable.
7. As a user on a board, I want the board to load without ticket descriptions, so that I am not downloading content the board does not show.
8. As a user of a filtered financial list, I want the total computed once, so that filtering does not double the cost.
9. As a user, I want a consistent way to ask for more, so that every list behaves the same.
10. As a user, I want the same filter and sort vocabulary on every list, so that knowing one list teaches me the rest.
11. As a user, I want a hard cap on page size, so that no request can ask for everything.
12. As a user, I want a stale or hand-edited cursor to return the first page rather than an error, so that a bookmarked link degrades gracefully.
13. As a developer, I want one list helper to reach for, so that pagination is not decided per endpoint.
14. As a developer, I want the cursor opaque, so that a client cannot construct a predicate the server never validated.
15. As a developer, I want `hasMore` without a count query, so that the common case costs one query.
16. As a developer, I want a total only where a total is displayed, so that unused counts are not paid for.
17. As a developer, I want sorting to compose with tenant-scoped indexes, so that adding a sort does not fall off an index.
18. As a security reviewer, I want cursors to carry no tenant or permission information, so that a stolen cursor grants nothing.
19. As a security reviewer, I want a by-key ticket read authorized like every other ticket read, so that a new endpoint is not a new hole.
20. As an operator, I want list endpoints under a read budget, so that a pagination regression fails the build.

## Implementation Decisions

**Already shipped — this is the contract; adopt it, do not rewrite it**

- **`cursor.ts` is correct and its reasoning is in the file.** Opaque base64url cursor, sort value plus id so ties still totally order, `limit + 1` over-fetch so `hasMore` needs no count, and a malformed cursor returns the first page rather than throwing. Do not re-derive any of these.
- **`paginateOffset` caps at 100.** Keep the cap for offset endpoints that stay offset.
- **`count(*) OVER ()` is already in use in three places** — the ticket list read, the work-scope union and HR interviews — as well as in the read-cost baseline. Copy one of those rather than inventing a shape.

**To build**

- **Convert the scrolled, concurrently-written surfaces to cursor.** Name them explicitly in the ticket. Do not open-endedly "migrate pagination" — 143 conversions is a sweep with no user on the other end of most of it.
- **A total is opt-in.** A list that displays no total should not compute one. Where one is displayed, it comes from a window in the page query, not a second statement.
- **Fix the receivables double-aggregation specifically.** It is the worst instance and it is not merely serial — the whole grouped join runs twice.
- **`GET /build/:projectId/tickets/by-key/:ticketNumber`** resolves a ticket key server-side, authorized identically to the existing ticket read. The frontend stops resolving ids from a board array.
- **Remove `description` from the board list projection.** The board does not render it. This is a one-line change that shrinks the heaviest list payload in the product.
- **Filter and sort vocabulary is shared.** One parsed, validated shape for page size, cursor, sort field, sort direction and filters, via the existing schema convention. Sort fields are an allowlist per endpoint — an arbitrary sort column is both an index problem and an injection surface.
- **Cursors encode position only.** No tenant, no permission, no filter state. Tenancy comes from the session on every request.
- **Cursor and offset coexist.** This is not a migration with an end date; it is a rule about which to choose. Both helpers stay.

## Testing Decisions

**What makes a good test here.** Test the properties a paginated list must hold — no duplicates, no gaps, stable under concurrent writes — rather than the shape of a query. The concurrency property is the one that justifies the work and it is the one offset fails.

- **No duplicates, no gaps under concurrent insert.** Page through a list while inserting rows above the cursor; assert every original row appears exactly once. Run the same test against an offset implementation to see it fail — that comparison is the argument for the change.
- **Cursor round-trip** — encode/decode is lossless; malformed, truncated and empty cursors all return the first page rather than throwing. `cursor.spec.ts` already covers part of this.
- **`hasMore` without a count** — with exactly `limit` rows remaining, `hasMore` is false and no count query is issued.
- **Page-size cap** — a request above the cap is clamped, not honoured and not rejected.
- **Ticket by key** — resolves within and beyond the first hundred tickets; unknown key is a 404; a ticket in another organisation is a 404 and never a 403 that confirms existence. **The beyond-100 case is the regression test for the live bug** and must exist.
- **Board projection** — the list response carries no `description`. A field-presence assertion, so re-adding it fails.
- **Authorization parity** — the by-key read allows and denies exactly as the by-id read does, across the same actor matrix. Controller e2e; note these run only under the e2e command.
- **Prior art**: `cursor.spec.ts`, `pagination.spec.ts`, and the existing ticket controller e2e specs.

## Out of Scope

- Converting all 143 offset call sites.
- Removing offset pagination.
- Infinite-scroll or virtualised-list UI work beyond what the contract requires.
- Search result pagination, which is c12's.
- Cross-module unified list components on the frontend.

## Further Notes

The ticket-by-key item is the only place in the review where a performance finding turned out to be a **correctness bug**. It was found by asking "what is the worst screen?" and reading it end to end, rather than by pattern-matching — the array search looks like a minor inefficiency until you notice the array is capped at a hundred and the id is not in it.

Worth stating for whoever picks this up: three of these five items are one-line changes (`description` removal, the window count, the receivables subquery). The cursor conversion is the only substantial work, and it is deliberately scoped to about a dozen endpoints.
