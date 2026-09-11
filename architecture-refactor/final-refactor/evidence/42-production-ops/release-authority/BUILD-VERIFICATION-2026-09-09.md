# Build / Project Management — verification status, 2026-09-09

Root `db887baad` · backend `8a6737df2`. Written into tracked evidence deliberately: the first copy
of this work was written to the untracked `architecture-refactor/audit-2026-09-09/` and was deleted
by another session's untracked-file cleanup before it could be read.

The five pending Build items were: browser acceptance for loading/empty/error/retry; responsive and
accessibility verification at 375/768/1280; cross-tab cache freshness; current production-build Web
Vitals; and inclusion in the clean-pair and executable cross-tenant run.

## 1. Cross-tenant / clean pair — CLOSED

`jest --testPathPattern="modules/build/.*(isolation|cross-tenant|404)"` → **52 suites, 197 tests,
all passing**. Covers approvals inbox, client-portal visibility and change requests, comment drafts,
core services, due sweep, notification context, release-published consumer, activity, templates,
webhooks, changelog, customers, teams, epics/cycles, sprints, workflow and ticket detail.

At the same pair: backend typecheck (build + test), frontend typecheck, `nest build` and
`next build` all exit 0; 15 backend and 6 frontend gates pass.

## 2. Browser acceptance — PARTIAL, and it found a defect

`scripts/browser-journeys.mjs`, Chrome, widths 375/768/1280, authenticated.
**57 of 63 planned steps reached, so the run is REFUSED as clean by its own harness and is
diagnostic, not release evidence.** axe ran on 57/57 steps over 8,112 nodes; 99 findings, 17 in Build.

- **`/build` and `/build/all` settle correctly** at all three widths — zero `never-settled` findings
  in Build. (The five `never-settled` findings are CRM, Inventory and HR, not Build.)
- **`/build/{projectId}` and `/build/{projectId}/backlog` were never reached at any width**
  (6 × `step-not-reached`), because the harness logged
  `token projectId UNRESOLVED from /build/all` — the seeded tenant surfaced no project id to
  substitute. The `build-create-ticket` write never ran for the same reason (0 of 4 writes asserted
  run-wide). **The project-scoped Build routes are therefore UNVERIFIED**, and that is the gap to
  close before this item is claimed.

**DEFECT (high), found by source audit, verified by reading:**
`features/build/ticket-details/ticket-detail-page.tsx:186-217`. Two `isApiError` branches handle
`PROJECTS_FORBIDDEN_TICKET` and `PROJECTS_TICKET_NOT_FOUND`. Any other failure — a network error, a
500 — falls through to `if (!ticket || !ticketId)` and renders **"Ticket not found" with only a
"Back to board" button**. The message is factually wrong (the ticket exists; the request failed) and
there is no retry affordance. The route's `error.tsx` does not catch it because TanStack Query stores
the error in `ticketError` rather than throwing. Fix: an explicit `if (ticketError)` branch
rendering `ErrorState` with `onRetry={refetchTicket}` before the null guard.

Every other Build route (79 of 81 audited; 1 N/A — the AI streaming panel has no recoverable query)
carries loading, empty, error and retry. Every non-test file in `features/build/**` that imports
`ErrorState` also passes `onRetry`.

## 3. Responsive and accessibility at 375/768/1280 — PARTIAL

**Responsive: passes for every route reached.** Zero horizontal-overflow findings at any of the
three widths, run-wide. Eight statically-identified overflow risks (kanban `w-72 min-w-[280px]`,
workload stat grid, Gantt `min-w-max`, `TicketFilterBar` `flex-nowrap`, and the
`overflow-x-visible` overrides in `members-page.tsx:151` / `my-work-page.tsx:145`) **did not
materialise** — each sits inside a deliberate `overflow-x-auto` scroller.

Eight static UX/a11y gates pass: unlabeled icon buttons, arbitrary colours, named handlers,
hand-rolled empty states, effect fetches, file sizes, local formatters, type assertions.

**DEFECT (a11y), verified by reading:** `features/build/governance/risk-matrix.tsx:52-64`. Each
matrix cell is a `<button type="button">` whose entire body is `{count > 0 ? count : ""}`, with no
`aria-label` or `title`. At `count === 0` the button has **no accessible name at all** (axe
`button-name`, WCAG 4.1.2); at `count > 0` the name is a bare integer with no probability/impact
context. `check-no-unlabeled-icon-buttons` misses it because that gate only inspects `size="icon"`
Button props, not a raw `<button>` with an expression child. Fix: `aria-label` naming probability,
impact and count.

Lower-severity, unverified against a browser: bulk-action-bar search input has no label
(`bulk-action-bar.tsx:106`); emoji reaction buttons carry no `aria-pressed`
(`emoji-reaction-bar.tsx:50`); saved-view pin/delete use `title` rather than `aria-label` and are
`opacity-0` on touch (`all-work-views-menu.tsx:158`).

**TWO RUNTIME FINDINGS THAT CONTRADICT THE SOURCE — unresolved, do not action without a re-run.**
The capture reports `no-main-landmark` on 19 routes (9 at 768, 19 at 1280, none at 375) and
`axe:meta-viewport` on the same distribution, the latter quoting
`content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"`.
Both disagree with the source: `components/layout/dashboard-shell.tsx:268` renders
`<main id="dashboard-content" aria-label="Main content">` unconditionally, and the only viewport
declaration in the tree is `app/layout.tsx:114-119` with `maximumScale: 5` and no `userScalable`.
`user-scalable=no` appears nowhere in `.next/server` or in the vendored `feedbucket-widget/src`.
The other Build axe findings are the third-party Feedbucket launcher
(`#feedbucket-root .launcher-logo`, `aria-prohibited-attr`), so a remotely-loaded Feedbucket script
injecting a viewport meta is the leading hypothesis and would make both findings third-party rather
than ours. The frontend server was killed before this could be confirmed against the live DOM.
**Resolve by re-running and inspecting the DOM before treating either as a product defect.**

Heading and landmark structure is otherwise clean: `DashboardShell` provides the single `<main>`,
`PageWrapper` renders exactly one `<h1>` from its `title` prop, and no Build feature file declares
a rogue `<h1>`.

## 4. Cross-tab cache freshness — NOT a verification; the mechanism is ABSENT

`components/providers/query-provider.tsx:71-74` sets `staleTime: 2 min`, `gcTime: 10 min`,
`refetchOnWindowFocus: false`. No Build hook overrides them; there is no `refetchInterval` anywhere
in Build, and the only `refetchOnMount` overrides are in `hooks/api/access.ts:65` and
`hooks/api/ownership.ts:111`, neither of which is Build data.

No cross-tab mechanism exists: `@tanstack/query-broadcast-client-experimental` is absent from
`package.json`, `BroadcastChannel` has **zero** occurrences in the frontend tree, the four `storage`
listeners are unrelated to query invalidation, `public/sw.js` only delivers push notifications, and
Build has **no** Ably subscription (Ably is used by Chat, Support, Inventory and Accounting only).

Consequence: a mutation in tab A calls `queryClient.invalidateQueries` on **tab A's** client only.
Tab B holds a separate `QueryClient` with no signal path, and with `refetchOnWindowFocus: false`
focusing tab B does not refetch either. A user sitting on a Build board in tab B sees stale data
**indefinitely** — not for `gcTime`, which only collects *inactive* queries and never forces an
active one to refetch — until they navigate away and back (remount) or reload.

No test was written: asserting the absence would read as requiring it.

## 5. Web Vitals for Build routes — NOT RUN

Blocked on host contention, which the driver refuses on by design: measured 77% busy before launch
and 90% median during an earlier attempt, against a 50% pre-launch / 75% during ceiling. The load is
external to this work. Two real defects in the measurement path were found and fixed first — a
production `NEXT_PUBLIC_API_URL` inlined into the build, and `CORS_ORIGINS` omitting
`http://127.0.0.1:1000` — see the 2026-09-09 session record in the code-release PRD.

## Summary

| Item | State |
|---|---|
| Cross-tenant + clean pair | **CLOSED** — 52 suites / 197 tests |
| Browser acceptance | **PARTIAL** — 57/63 steps; project-scoped routes unreached; 1 high defect found |
| Responsive 375/768/1280 | **PASS for routes reached** — zero overflow at all widths |
| Accessibility | **PARTIAL** — 8 static gates pass; 1 verified defect; 2 runtime findings unresolved |
| Cross-tab cache freshness | **ABSENT** — a finding, not a passed verification |
| Web Vitals | **NOT RUN** — host contention |

"No pending implementation defect" does not hold as stated: the ticket-detail retry gap and the
risk-matrix accessible-name gap are both implementation defects, each verified by reading the source.
