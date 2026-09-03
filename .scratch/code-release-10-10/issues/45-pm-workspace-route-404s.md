# 45 — P1: ~30 build sub-routes 404 for any project in a PM workspace

**What to fix:** `app/(authenticated)/build/[projectId]/layout.tsx` redirected the whole path
through `withPmWorkspacePath` for any project carrying a `pmWorkspaceId`, but the workspace tree
was never a mirror of the canonical one. Every un-mirrored sub-route redirected to a URL that has
no route. Second item: the 404 page then rendered with no `<main>` landmark — 3 of the only 4
non-contrast findings in the 63-step S14 sweep.

**Raised by:** `reports/30d-boards-reached.md` §4. **Report:** `reports/45-pm-workspace-route-404s.md`.

**Status:** 3 of 3 closed. The redirect is narrowed to the sub-paths that actually have a mirror,
held in one filesystem-pinned registry rather than 43 hand-copied route files; all 30 top-level
and 8 nested sub-routes now answer 200 on the running product, and every `not-found.tsx` in this
territory now renders one `main` and exactly one `h1`. Commits `4ade571fa` (see the attribution
note) and `91c8067e6`.

- [x] The two route trees are enumerated and the exact missing set is produced, not estimated.
  CLOSED. `ls` of both roots: `build/[projectId]/` **39 entries / 34 top-level sub-route pages**,
  `build/workspaces/[pmWorkspaceId]/[projectId]/` **6 entries / 4**. The missing set is **30
  top-level** sub-routes (ai, analytics, approvals, automations, backlog, budget, bugs,
  change-requests, chat, client-portal, cycles, decisions, feedbucket, forms, incidents, intake,
  meetings, milestones, modules, qa, releases, reports, risks, sprints, timeline, triage, webhooks,
  whiteboard, wiki, workflow) plus **8 nested dynamic** routes the workspace tree has none of
  (`tickets/[ticketKey]`, `qa/runs/[runId]`, `wiki/[pageId]`, `cycles/[cycleId]`, `forms/[formId]`,
  `incidents/[incidentId]`, `meetings/[meetingId]`, `feedbucket/[submissionId]`). `tickets/` has no
  top-level page in either tree, so 34 − 4 = **30**, which is the sweep's "~30" exactly.
  Reproduced live before changing anything: `/build/20/backlog` → 307 →
  `/build/workspaces/<w>/20/backlog` → **404**; `/build/workspaces/<w>/20/epics` → **200**.

- [x] The right fix is chosen and justified, and it is not 33 copy-pasted route files.
  CLOSED. **Mirroring was rejected on evidence, not on taste.** The 5 existing mirror pages are
  11-line re-exports, so the mirror looks cheap — but a faithful one is **43 new `page.tsx` files**
  before `loading.tsx`/`error.tsx` parity (which the canonical tree has for 30 of 35 sub-routes),
  and **no Next.js construct expresses it once**: a route group adds no URL segment, and a
  `[...rest]` catch-all would need a 35-entry component switch in a single module, destroying
  per-route code splitting and the `loading.tsx`/`error.tsx` boundaries the sweep's
  "0 never-settled" result rests on. Deleting the parallel tree was rejected as a unilateral
  product decision that breaks 5 URLs currently answering 200.
  **Chosen: narrow the redirect to the sub-paths that have a mirror** — behaviour changes on
  exactly the set that 404s and on nothing else. `app/(authenticated)/build/workspaces/mirrored-project-routes.ts`
  (24 lines) holds the set; the layout redirects only on a hit.
  The registry cannot drift: `mirrored-project-routes.test.ts` **walks the real workspace
  directory** and asserts equality, with an anti-vacuity floor (≥5) and a guard that the tree still
  holds no dynamic segment, so adding a mirror later reddens the test until the registry names it
  and the redirect then widens on its own.
  `npx jest --runInBand --testPathPattern="mirrored-project-routes"` → exit **0**, **8/8**.
  **Bite-proved**: injecting `"/backlog"` into the constant with no such directory → exit **1**,
  **2 failed / 6 passed**; restored → 8/8.
  Measured after, on the running product: **30 top-level + 8 nested sub-routes → 200**, the 5
  mirrored paths still 307 to the workspace tree with the query string intact, and the 5 workspace
  URLs still 200. Real browser: `/build/20/backlog` renders 1 `main` "Main content", h1 "Backlog".

- [x] The 404 page renders a `<main>` landmark.
  CLOSED, and it was wider than the sweep could see. `app/not-found.tsx` — the boundary an
  unmatched URL actually reaches — wrapped its content in a `<div>` and spent its only `<h1>` on
  the brand wordmark. It is now `<main aria-label="Main content">`, the wordmark is a `<span>`, and
  "Page Not Found" is the `<h1>`; classes are unchanged so nothing moves visually.
  A headless-Chrome check of the other four `not-found.tsx` files then found what curl cannot: a
  thrown `notFound()` in dev streams through the RSC payload and never reaches the initial HTML, so
  those boundaries had **1 `main` and ZERO `h1`** — `<h2>` in the authenticated and KB boundaries,
  a styled `<p>` in the cycle one. All three now carry an `<h1>`.
  Verified in a real browser after the change: an unmatched URL, `/build/99999999` and
  `/build/20/cycles/99999999` each render **1 `main` named "Main content" and exactly 1 `h1`**.
  `app/(public)/blogs/(site)/not-found.tsx` already had both from the site layout and was left
  alone (public surfaces are out of scope).

**Gates run:** `pnpm -C frontend type-check` exit **0** (0 errors) · `npx eslint` over the 7 changed
files exit **0** · `node scripts/check-route-module-thinness.mjs` exit **0** (588 route modules,
in-scope thick **0**, baseline 0) · `npx jest --testPathPattern="(route-access|page-level-gates|sidebar-permission|layout-gate-coverage|mirrored-project-routes)"` exit **0**, **158/158 across 9 suites**.
**Not run:** `next build`, repo-wide `pnpm lint`, the full 63-step `scripts/browser-journeys.mjs`
sweep, and every backend gate.

**Handed up, not fixed here:**
1. `/build/workspaces/<w>/<projectId>` (the board root) **500s on this dev server** —
   `Cannot find module 'undici/lib/handler/wrap-handler.js'` from `jsdom` via
   `isomorphic-dompurify` at `components/ai/ai-inline-preview.tsx:3`, reaching
   `features/build/project-detail/project-board-page.tsx`. Reproducible 3/3 and **present before
   this change**; it means the board `reports/30d` measured is currently unreachable in this
   environment. Broken install + `features/`, not this territory.
2. The PM workspace chip (`components/layout/header/pm-workspace-context-chip.tsx:36`) reads the
   workspace from the pathname, so on the 30 now-canonical paths it falls back to the *default*
   workspace and can show a wrong label. Known cost of the narrowing; the durable fix is to read
   the workspace from the project rather than the URL. Another territory.
3. **Ninth attribution incident, first from a non-Claude agent.** At 08:06:37 a **Cursor** agent
   (`Co-authored-by: Cursor <cursoragent@cursor.com>`) ran a bare commit over the shared index and
   swallowed all four of this ticket's files into `4ade571fa` under its own message, alongside its
   own `frontend/types/projects/shared.ts` change. Content is byte-correct in HEAD and the diff was
   verified line by line — nothing was lost, only attribution. The brief's pathspec rule cannot
   prevent this: it binds Claude agents, and a second tool in the same working tree is bound by
   none of it.
