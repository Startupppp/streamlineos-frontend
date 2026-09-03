# 45 — the PM-workspace redirect pointed at 30 routes nobody built

P1 raised by the S14 browser sweep (`reports/30d-boards-reached.md` §4). Territory:
`frontend/app/(authenticated)/build/**` route files and `frontend/app/**/not-found.tsx`.
The kickoff prompt said `app/(app)/build/**`; **there is no `(app)` route group** — the
authenticated tree is `app/(authenticated)/`. Same files, different name.

## 1 · The two trees, enumerated

`ls` of both roots, not inferred:

| Tree | Entries | Sub-routes with a top-level `page.tsx` |
|---|---|---|
| `app/(authenticated)/build/[projectId]/` | **39** (35 dirs + `page/layout/loading/error.tsx`) | **34** |
| `app/(authenticated)/build/workspaces/[pmWorkspaceId]/[projectId]/` | **6** (`page.tsx`, `layout.tsx`, `epics`, `my-tickets`, `settings`, `views`) | **4** |

The canonical tree also holds **8 nested dynamic routes** the workspace tree has none of:
`tickets/[ticketKey]`, `qa/runs/[runId]`, `wiki/[pageId]`, `cycles/[cycleId]`,
`forms/[formId]`, `incidents/[incidentId]`, `meetings/[meetingId]`,
`feedbucket/[submissionId]`.

**The exact missing set — 30 top-level sub-routes:**

```
ai            approvals    automations   analytics    backlog
budget        bugs         change-requests            chat
client-portal cycles       decisions     feedbucket   forms
incidents     intake       meetings      milestones   modules
qa            releases     reports       risks        sprints
timeline      triage       webhooks      whiteboard   wiki
workflow
```

plus the 8 nested dynamic routes above. `tickets/` has no top-level page in either tree, so
it is correctly absent from both — 34 − 4 mirrored = **30**, matching the sweep's "~30".

## 2 · The mechanism, reproduced live

`app/(authenticated)/build/[projectId]/layout.tsx` rewrote the **whole** path through
`withPmWorkspacePath` for any project carrying a `pmWorkspaceId`. The sidebar
(`features/build/sidebar/project-nav-tree.tsx:112`) always builds `baseUrl = /build/${projectId}`,
so **every** project-nav click for a workspace project entered that redirect.

Measured against the live stack (`next dev` :3000, backend :1501, project `20`,
workspace `31510333-f0af-4f1d-bbaa-969b0aecf845`), BEFORE the change:

```
/build/20/backlog                        307 -> /build/workspaces/<w>/20/backlog
/build/workspaces/<w>/20/{epics,my-tickets,settings,views}   200
/build/workspaces/<w>/20/{backlog,sprints,bugs,qa,timeline,analytics}   404
```

## 3 · The fix, and why it is not 33 route files

Two candidates were on the table. **Mirroring was rejected**, and the reason is not just file
count: the 5 existing mirror pages are 11-line re-exports, so the mirror *looks* cheap, but a
faithful one is **43 new `page.tsx` files** (30 top-level + 8 nested + their parents) before
`loading.tsx`/`error.tsx` parity, which the canonical tree has for 30 of 35 sub-routes and
would push it past 100 files. Every one of those is a second place to drift, and there is **no
Next.js construct that expresses the mirror once**: route groups add no URL segment, and a
catch-all `[...rest]/page.tsx` would need a 35-entry component switch in one module, which
destroys per-route code splitting and the `loading.tsx`/`error.tsx` boundaries that the sweep's
"never-settled = 0" result depends on. A third option — deleting the parallel tree outright —
was rejected as a unilateral product decision that breaks 5 URLs that currently answer 200.

**Chosen: narrow the redirect to the sub-paths that actually have a mirror.** It changes
behaviour on exactly the set that currently 404s, and on nothing else.

`app/(authenticated)/build/workspaces/mirrored-project-routes.ts` (new, 24 lines) holds the
mirrored set plus `projectSubPath`. The layout now redirects only on a hit:

```ts
const subPath = projectSubPath(pathname, projectId);
if (subPath !== null && hasWorkspaceMirror(subPath))
  redirect(withPmWorkspacePath(pathname, search, project.pmWorkspaceId));
```

The registry cannot silently drift from the tree, because
`mirrored-project-routes.test.ts` (new, 8 tests) **walks the real
`workspaces/[pmWorkspaceId]/[projectId]` directory** and asserts the constant equals it, with
an anti-vacuity floor (≥5 entries) and a guard that the tree still contains no dynamic segment
— so if a mirror is ever added, the test goes red until the registry names it, and the redirect
then widens on its own. Bite-proved: adding `"/backlog"` to the constant with no such directory
turns **2 of 8 red**; removing it turns them green again.

## 4 · Measured after, on the running product

All 30 previously-404ing sub-routes and all 8 nested dynamic ones now answer **200**, and the
5 mirrored paths still redirect exactly as before, query string intact:

| Probe | Before | After |
|---|---|---|
| 30 top-level sub-routes of `/build/20` | 307 → **404** | **200 × 30** |
| 8 nested dynamic (`/qa/runs/1`, `/wiki/1`, `/tickets/PRJ-1`, …) | 307 → **404** | **200 × 8** |
| `/build/20`, `/epics`, `/my-tickets`, `/settings`, `/views` | 307 → workspace | **307 → workspace, unchanged** |
| `/build/20?view=workload` | — | 307 → `…/20?view=workload` (search preserved) |
| `/build/workspaces/<w>/20/{epics,my-tickets,settings,views}` | 200 | **200, unchanged** |

Real browser (headless Chrome over CDP, the same mechanism `scripts/browser-journeys.mjs` uses):
`/build/20/backlog` renders **1 `main` named "Main content", h1 "Backlog"** — the page the sweep
recorded as a landmark-less 404 is now the backlog page.

## 5 · The 404 landmark — and three findings the sweep could not see

`app/not-found.tsx` (the global boundary, the one an unmatched URL reaches) rendered its shell as
a `<div>` and used its `<h1>` for the **brand wordmark**, with the page title as an `<h2>`. It now
renders `<main aria-label="Main content">`, the wordmark is a `<span>`, and "Page Not Found" is the
`<h1>` — so the count stays exactly one and the one it has is the page's own title. Classes are
unchanged, so nothing moves visually.

A CDP check of the other four `not-found.tsx` files then found something the sweep never
reached, because a thrown `notFound()` in dev streams through the RSC payload and never appears in
the initial HTML — **curl cannot see it, only a hydrated DOM can**:

| Boundary | main | h1 before | h1 after |
|---|---|---|---|
| `app/not-found.tsx` (unmatched URL) | 0 → **1** | brand wordmark | **"Page Not Found"** |
| `app/(authenticated)/not-found.tsx` | 1 (shell) | **0** (`<h2>`) | **1** |
| `app/(authenticated)/support/kb/[articleId]/not-found.tsx` | 1 (shell) | **0** (`<h2>`) | **1** |
| `app/(authenticated)/build/[projectId]/cycles/[cycleId]/not-found.tsx` | 1 (shell) | **0** (styled `<p>`) | **1** |
| `app/(public)/blogs/(site)/not-found.tsx` | 1 (site layout) | 1 | untouched — public |

So a 404 inside the shell answered "exactly one h1" with **none**. Verified after the change in
a real browser: `/build/99999999`, `/build/20/cycles/99999999` and an unmatched URL each render
1 `main` = "Main content" and exactly 1 `h1`.

## 6 · Commands, exit codes, numbers

| Command | Exit | Number |
|---|---|---|
| `npx jest --runInBand --testPathPattern="mirrored-project-routes"` | **0** | **8/8** |
| same, with `"/backlog"` injected into the registry (bite) | **1** | **2 failed / 6 passed** — then 8/8 restored |
| `npx jest --runInBand --testPathPattern="(route-access\|page-level-gates\|sidebar-permission\|layout-gate-coverage\|mirrored-project-routes)"` | **0** | **158/158, 9 suites** |
| `pnpm -C frontend type-check` (through `heavy.sh 2`) | **0** | 0 errors |
| `npx eslint <the 7 changed files>` | **0** | 0 problems |
| `node scripts/check-route-module-thinness.mjs` | **0** | 588 route modules · in-scope thick **0** (baseline 0) |
| live HTTP sweep of 38 sub-route URLs + 5 mirrored + 5 workspace | — | **30 + 8 → 200**, 5 still 307, 5 still 200 |
| headless-Chrome landmark probe, 4 not-found boundaries | — | 1 `main` + 1 `h1` on each |

**Not run:** `next build`, `pnpm lint` repo-wide, the full `scripts/browser-journeys.mjs` sweep
(it needs the whole 63-step run and a free machine; the fix's effect on it is the 3
`no-main-landmark` findings, which are now unreachable because the route resolves), and any
backend gate.

## 7 · Findings handed to other territories

1. **`/build/workspaces/<w>/<projectId>` (the board root) 500s on this dev server, and it is a
   broken install, not source.** `Cannot find module 'undici/lib/handler/wrap-handler.js'`
   thrown from `jsdom`, pulled in by `isomorphic-dompurify` at
   `components/ai/ai-inline-preview.tsx:3` → `components/ai/index.ts` →
   `features/build/ai/create-ticket-ai-menu.tsx` → `features/build/tickets/create-ticket-dialog.tsx`
   → `features/build/project-detail/project-board-page.tsx`. Reproducible 3/3, **present before
   this change**, and it means the kanban board that `reports/30d` measured is currently
   unreachable in this environment. `node_modules` + `features/`, not this territory.
2. **The PM workspace chip now shows the *default* workspace on the 30 un-mirrored paths.**
   `components/layout/header/pm-workspace-context-chip.tsx:36` reads the workspace from the
   pathname and falls back to the default. On `/build/20/backlog` there is no workspace segment,
   so a project in a non-default workspace gets a wrong label. This is a label, not a 404, and it
   is the known cost of the narrowing; the durable fix is for the chip to read the workspace from
   the project rather than the URL. Another territory.
3. **Ninth attribution incident — and the first from a non-Claude agent.** At 08:06:37 a **Cursor**
   agent (`Co-authored-by: Cursor <cursoragent@cursor.com>`) ran a bare commit over the shared
   index and swallowed all four of this ticket's files into `4ade571fa`, alongside its own
   `frontend/types/projects/shared.ts` change, under a message it wrote. Content is byte-correct
   in HEAD and nothing was lost — the diff was verified line by line — but the work is attributed
   to that commit, not to this one. **Pathspec discipline does not protect against this**: the
   rule in the brief governs Claude agents committing, and a second tool in the same working tree
   is bound by none of it. The follow-up commit `91c8067e6` (the three `h1` fixes) landed
   correctly with an explicit `:(literal)` file pathspec, 3 files, no strays.
