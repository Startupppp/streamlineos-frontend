# Orchestrator queue — work found but not yet dispatched

Written by the orchestrator so findings survive a process death. Delete a row once its lane has landed.

## Q1 — Two parallel client-portal implementations (needs a named winner)

Both are live and reachable. Neither is dead code.

| Route group | Entry | Page component | Hooks |
|---|---|---|---|
| `(portal)` (external client) | `app/(portal)/client-portal/page.tsx` | inline, 82 lines | `hooks/api/portal/use-portal-projects.ts` |
| `(authenticated)` (internal) | `app/(authenticated)/portal/page.tsx` | `features/build/client-portal/portal-list-page.tsx`, 132 lines | `hooks/api/build/client-portal.ts` |

Two different `usePortalProjects` exist, one per hook file.

The decision is WHICH becomes canonical — that is the whole task, not a detail.
`hooks/api/build/client-portal.ts` is the richer surface (overview, change
requests, visibility mutations); `hooks/api/portal/` has only the list.
Do not rewrite one to match the other before deciding; a rewritten fixture
previously hid a 20-namespace regression in this program.

## Q2 — `/settings/directory` route-ownership violation

`frontend/PAGES.md` lines 877-878. Module configuration must live at
`/directory/settings/*`, not global `/settings/*`. Two routes:
`/settings/directory` and `/settings/directory/[personId]`.
Move, delete the old route files, update every inbound link. No redirect.

## Q3 — Oversize portal detail page

`app/(portal)/client-portal/[projectId]/page.tsx` is 479 lines — over the 300
target, under the 500 hard ceiling. Split by responsibility if Q1 keeps it.

## Q4 — `/directory/workers` universality is UNRESOLVED (needs the user)

Root `CLAUDE.md` §8 contains two sentences that disagree:
- the universality list includes "people directory"
- the route-ownership rule places workforce at `/directory/workers` as governance

Current code follows the gated reading (`directory:workers:view`, HR roles only).
The orchestrator kept the gated status quo deliberately: widening access is the
unsafe direction to guess. Ask the user before changing it. Changing it means
removing the nav gate, the route-access extension, and three backend
`@RequirePermission` guards in `directory.controller.ts`.

## Q5 — Re-emit the legacy-actor baseline

The scanner regex was fixed (`pgTable(` -> also matches `x.table(`), so the
stored baseline of 555 is stale and `--check` will false-alarm. Honest count is
679 organizational FKs / 687 total. Re-emit only AFTER lane ACTOR2b lands, or
the two will fight over the same file.
