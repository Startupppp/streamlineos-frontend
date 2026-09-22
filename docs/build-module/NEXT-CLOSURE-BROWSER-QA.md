# Next closure — browser QA checklist for Codex

**Status: READY_FOR_CODEX_BROWSER_QA**

Claude opened no browser, took no screenshot, and verified no UI in this session. Everything below is
unverified in a real browser. Each item states what an automated test already proves and what only a
browser can settle, so Codex does not re-check what jsdom already covers.

**Branch:** `build/next-build-closure` (both repos)
**Root head:** see `NEXT-CLOSURE-STATUS.md`
**Prepared:** 2026-09-22

## Read this before starting

**Two items cannot be exercised until a migration is applied.** Migration `1149` adds
`change_requests.release_id` and `.client_visible`, and the service reads both. Until an owner applies it,
every Change Requests list request raises PostgreSQL `42703` and the page is a hard 500. Sections 1 and 2
below are therefore **BLOCKED**, not failing. Do not file them as UI defects.

Migration `1151` adds the Inbox project-filter index. The filter works without it — the query is just
unindexed — so section 4 is testable either way.

**No non-production database exists.** `.env` and `.env.production` both resolve to the same production
RDS host; that was re-verified this session. Anything requiring seeded data needs a disposable stack first.

## 1. Change Requests — new fields — BLOCKED on migration 1149

Route: `/build/[projectId]/change-requests`

| # | Check | Expected |
|---|---|---|
| 1.1 | Page loads at all | Renders. If it 500s, migration 1149 is not applied — stop, this section is blocked |
| 1.2 | `clientVisible` filter control | Selecting Yes / No / All narrows the list and writes `clientVisible` to the URL |
| 1.3 | Reload with `?clientVisible=true` | Filter is restored from the URL on a cold load |
| 1.4 | `requesterId`, `approverId`, `releaseId` in the URL | Each narrows the list; all four clear together on Clear filters |
| 1.5 | Deep link with several filters | Every filter survives a hard refresh |

Proven by jsdom already: URL round-trip for all four params, clearing, and the row contract decode
(23 tests in `change-requests-url-state.test.tsx`, plus `client-portal-schema.test.ts`).
**Only a browser can settle:** that the new `clientVisible` Select renders without overlapping the
adjacent controls, and that the filter bar still fits at 1280 px and 1440 px.

## 2. Client portal — non-disclosure of unpublished change requests — BLOCKED on 1149

`client_visible` is a publication decision. The guest portal must never show a change request whose flag is
false, and a missing flag must not read as published.

| # | Check | Expected |
|---|---|---|
| 2.1 | Guest portal as an external client | Only change requests with `clientVisible = true` appear |
| 2.2 | Toggle a CR to not-visible internally, reload the guest portal | It disappears for the guest |
| 2.3 | Guest deep-links straight to a not-visible CR id | Denied or not-found — never the record |

2.3 is the one that matters. A list filter that hides a row while the detail route still serves it is the
exact shape of the BOLA findings this programme already closed.

## 3. Bugs — work-item cutover

Route: `/build/[projectId]/bugs`

| # | Check | Expected |
|---|---|---|
| 3.1 | Bugs list loads with rows | Not an empty state. **An empty list here is the failure mode to watch** — a contract mismatch renders as "no bugs" rather than an error |
| 3.2 | Bug identifier column | Shows a stable identifier; note exactly what it displays |
| 3.3 | An existing/legacy bug number deep link | Still resolves to the right work item (`bug_work_item_map.legacy_bug_number` retains it) |
| 3.4 | Status badge | Shows the QA state, not a raw enum token or a blank chip |
| 3.5 | Severity on a bug with no sidecar row | Renders the em-dash fallback, not `undefined` |
| 3.6 | Priority | Displays lower-case to the user although the API now sends UPPER |
| 3.7 | Open the bug sheet on an existing bug | Status and priority pickers pre-select the current values, not blank |
| 3.8 | Create a bug, then reopen it | Round-trips; the created record appears in the list |
| 3.9 | Test run with a failure → create bug from result | Creates a work item and the failure stays linked to it |

Proven by jsdom already: the row contract decodes a realistic payload field-by-field and rejects the old
`bugNumber` shape, a lower-case priority, and a missing `ticketNumber` (6 tests).
**Only a browser can settle:** 3.1 through 3.9 as user journeys, and especially 3.7 — a pre-select that
silently falls back to blank is invisible to a contract test.

## 4. Inbox — project filter

Route: `/build/inbox`

| # | Check | Expected |
|---|---|---|
| 4.1 | Apply a project filter | List narrows to that project; a chip appears |
| 4.2 | Chip X | Clears the filter and restores the full list |
| 4.3 | Reload with `?project=<id>` | Filter restored on cold load |
| 4.4 | **Change the `view` while a filter is active** | The cursor does **not** reset — scroll position and paging continue. This is a pinned prior regression |
| 4.5 | Filter a project with many notifications | Paging still works; no duplicate or skipped rows |

## 5. Workload — real capacity

Route: `/build/[projectId]/workload`

| # | Check | Expected |
|---|---|---|
| 5.1 | Open Workload | Capacity data loads; over-allocation reflects hours, not ticket count |
| 5.2 | A member with few tickets but more logged hours than availability | Flagged over-capacity |
| 5.3 | A member with no employment schedule | Falls back to the ticket-count rule rather than showing zero or an error |
| 5.4 | A member on approved leave for the whole window | Availability reduced accordingly; half-days count as half |
| 5.5 | Tooltip on a member row | Shows hours and utilisation, not only a count |
| 5.6 | Switch away from Workload and back | No refetch storm; the request fires only while the view is active |
| 5.7 | **A user WITHOUT `build:tickets:view`** | Sees a denied state, **not** an empty "none yet" panel |

5.7 is a regression this session fixed. The hook previously fetched for everyone, and a 403 surfaced as
`isPending` with nothing fetching — which looks exactly like a finished empty read.

## 6. Feedbucket widget — mobile overlap and dialog accessibility

| # | Check | Viewport | Expected |
|---|---|---|---|
| 6.1 | Open the widget; inspect the form | **375 px** (iPhone SE) | Name, email and message fields fully visible, not obscured by the launcher |
| 6.2 | Same | **414 px** | Same |
| 6.3 | Launcher while the sheet is open | 375 px | Computed `opacity` is `0` — confirm in the Elements panel, not by eye |
| 6.4 | Click the dark backdrop outside the panel | 375 px | Panel closes; backdrop `visible` class removed |
| 6.5 | Open at tablet width | **768 px** | Does not render in mobile-sheet mode; backdrop stays hidden |
| 6.6 | Open the panel | any | The close button receives focus immediately |
| 6.7 | Press Tab repeatedly | any | Focus cycles **within** the dialog and never escapes to the page behind |
| 6.8 | Press Shift+Tab at the first element | any | Wraps to the last element in the dialog |
| 6.9 | Press Escape | any | Panel closes and focus returns to the launcher |
| 6.10 | Screen reader (VoiceOver / NVDA) with the panel open | any | Content outside the dialog is not announced, consistent with `aria-modal="true"` |

Proven by jsdom already: 6.6, 6.8 and 6.9 are asserted programmatically against `shadowRoot.activeElement`,
and 6.4's handler wiring is tested (4 tests in `ui-focus-trap.test.ts`).
**Only a browser can settle:** 6.1, 6.2, 6.3, 6.5, 6.7 and 6.10. jsdom has no CSS engine, computes no
stacking or breakpoints, fires no transitions, and does not perform native Tab traversal — so visual
overlap, paint order and real keyboard traversal are all invisible to it.

6.10 is the one to take seriously. `aria-modal="true"` promises assistive technology that the page behind
is inert. This session added the focus trap that makes the promise true; if 6.7 or 6.10 fail, the correct
fix is to revert `aria-modal` to `"false"` rather than leave a misleading claim in place.

## 7. Offline drafts and reconnect

Route: any ticket detail with a comment box.

| # | Check | Expected |
|---|---|---|
| 7.1 | Type a comment draft, go offline (DevTools → Network → Offline) | No error toast; the draft is retained |
| 7.2 | Edit the draft twice while offline | Last write wins for that ticket |
| 7.3 | Go back online | The draft flushes to the server without user action |
| 7.4 | Offline, then reload the page before reconnecting | The draft survives the reload |
| 7.5 | Drafts for two different tickets while offline | Both survive; neither overwrites the other |

Proven by jsdom already: buffer write, last-write-wins, drain-empties-buffer, and survival of a storage
error (10 tests). **Only a browser can settle:** real offline/online transitions and 7.4's reload.

## 8. Cycles — iteration identity, and the deep links that must not break

This session made Cycle the canonical iteration identity across the backend. Legacy sprint ids are bridged
through `cycles.legacy_sprint_id` rather than dropped, so **every one of these must still work**.

| # | Check | Expected |
|---|---|---|
| 8.1 | `/build/[projectId]/cycles` and a cycle detail page | Load and show their tickets |
| 8.2 | Backlog → select tickets → bulk assign to an iteration | Assignment lands and persists after reload |
| 8.3 | A saved/bookmarked URL carrying `?sprintId=<n>` | Still resolves and filters correctly |
| 8.4 | My Work with a legacy `?cycle=<n>` param | Still normalises and filters |
| 8.5 | **Meetings → generate agenda for a meeting tied to an iteration** | Agenda lists that iteration's tickets — **not empty**. A near-miss this session returned `sprintId: null` here, which would have produced a silently empty agenda |
| 8.6 | Meetings list, iteration column | Shows the iteration name, not blank |
| 8.7 | Reports → burnup / velocity | Render, and the figures are continuous with what they showed before |
| 8.8 | All Work and My Work grouped or filtered by iteration | Grouping still matches |
| 8.9 | Dashboard active-iteration summary | Shows the active iteration and its stats |
| 8.10 | Ask the AI assistant to move a ticket to a cycle, then confirm | The action **executes**. Mid-session the tool proposed an action no handler consumed, so confirming did nothing |

8.5 and 8.10 are the two highest-value checks in this document. Both were live regressions caught in review,
and both fail silently rather than erroring.

## 9. Regression sweep — surfaces touched indirectly

| # | Route | Expected |
|---|---|---|
| 9.1 | `/build/[projectId]/issues` — board, list, table, timeline | All four render; card click still opens the ticket |
| 9.2 | Ticket detail | Loads, comments post, time logs |
| 9.3 | `/build/my-work`, `/build/all-work` | Load with rows |
| 9.4 | `/build/[projectId]/qa` and a test run | Load; results show |
| 9.5 | `/build/[projectId]/releases` | Loads |
| 9.6 | Console across every route above | No application errors. The Feedbucket widget's missing dialog-description warning is a known non-blocker |

## Reporting

For each failure record: route, viewport, exact steps, expected vs actual, console output, and whether a
network request 4xx/5xx'd. Distinguish **BLOCKED** (sections 1 and 2 without migration 1149) from **FAIL**.

A blank list, an empty panel or a silently missing value is a defect here, not an empty state — several of
this session's near-misses would have presented exactly that way.
