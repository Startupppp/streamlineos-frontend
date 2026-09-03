# 30d — the board was reached, and the run finally has a whole denominator

Session S14. Continues `reports/30b-…` (S11) and `reports/30c-…` (S13). FE = `streamlineos-frontend/frontend`.

**Headline: 63 of 63 planned steps ran.** S11 reported 57 of 63 and exited 1 on its own
incompleteness refusal, because `/build/all` rendered "Failed to load projects" and no project id
could be resolved, so no kanban board had ever been rendered in this release. That drift was fixed and
committed as `f75797ae1` (cursor paging via `useInfiniteProjects`). This session verified the fix from
a real browser, reached the board, and measured it at all three reference widths.

## 1 · The blocker is gone, verified from the running product

```
[19.4s] token projectId = 20 (click-through from /build/all)
```
The harness's own click-through resolved the id: it opened `/build/all`, found no `href` to read,
clicked the first row, and read where it landed. That is the product's list rendering rows, being
clicked, and navigating — the exact path that was impossible in S11 and S13.

## 2 · The run

```
node scripts/browser-journeys.mjs \
  --base-url=http://localhost:3000 \
  --cookie-file=<minted authjs.session-token> \
  --widths=375,768,1280 --settle-ms=6000
```
→ **exit 1**, `63 of 63 planned steps run · 39 findings` (`contrast: 36`, `no-main-landmark: 3`).

| Measure | S8 | S11 | **S14** |
|---|---|---|---|
| steps run / planned | 57 / 57 | 57 / **63** | **63 / 63** |
| `scrollWidth − innerWidth`, max over all steps | 0 | 0 | **0** |
| never-settled (stuck skeleton) | 7 | 0 | **0** |
| exactly one `h1` | 46 of 57 | 57 of 57 | **63 of 63** |
| `main` landmark present | 57 of 57 | 57 of 57 | **60 of 63** |
| unauthenticated steps | 0 | 0 | **0** |
| steps rendering an error boundary | 11 | 12 | **3** (one route × 3 widths) |
| a kanban board rendered | no | **no** | **yes, at 375 / 768 / 1280** |

Terminal states, identical at each width: **12 content · 7 empty · 1 error · 1 denied**.
The one error is `/crm/leads` (CRM is excluded from this release; the `lead_party_map` /
`business_parties` grouping 500 is unchanged). The one denied is `/settings/roles`, which is a
correct permission state, not a failure. **`/calendar` no longer errors** — S11's finding 2 (the
62-day window) is gone; it now renders content at all three widths.

## 3 · Box 4 — the kanban board, measured

`/build/20` redirects to `/build/workspaces/31510333-…/20` because project 20 carries a
`pmWorkspaceId`. The board rendered there as **content**, `main` = "Main content", one `h1`, at every
width, and the document did not scroll horizontally at any of them.

A document-level `scrollWidth` of 0 over a board would be a weak result on its own — the board is
*supposed* to scroll, inside its own container. So the containers were measured directly:

| width | document `sw` / `iw` | `.kanban-scroll-container` | droppable columns | draggable cards | container right edge |
|---|---|---|---|---|---|
| 375 | 375 / 375 | `sw 1496` / `cw 343` | 5 | 4 | 359 ≤ 375 |
| 768 | 768 / 768 | `sw 1496` / `cw 448` | 5 | 4 | 744 ≤ 768 |
| 1280 | 1280 / 1280 | `sw 1496` / `cw 944` | 5 | 4 | 1248 ≤ 1280 |

The board is 1,496px wide at every width and **it is contained**: it scrolls inside
`.kanban-scroll-container`, whose right edge stays inside the viewport, and the document never
scrolls. Five columns and four drag handles were present, so this is a populated board and not an
empty shell. At 375 and 768 a second contained scroller appears — the project toolbar
(`flex flex-nowrap … overflow-x-…`, `sw 464 / cw 375` and `sw 645 / cw 496`) — also within the
viewport. **No horizontal overflow defect exists on the widest screen in the product.**

## 4 · The one new defect the board journey found — `/build/<id>/backlog` 404s for any workspace project

The 3 `no-main-landmark` findings are all `/build/20/backlog`, at all three widths. The cause is not
an a11y omission on the backlog page; it is that **the page is never reached**:

- `app/(authenticated)/build/[projectId]/layout.tsx` redirects any project with a `pmWorkspaceId`
  through `withPmWorkspacePath(pathname, …)`, which rewrites the **whole** path.
- `app/(authenticated)/build/[projectId]/` holds **39** entries (35 sub-routes).
  `app/(authenticated)/build/workspaces/[pmWorkspaceId]/[projectId]/` holds **6**
  (`page.tsx`, `layout.tsx`, `epics`, `my-tickets`, `settings`, `views`).
- Measured: `/build/workspaces/<w>/20/epics` → **200**, `/build/workspaces/<w>/20/backlog` → **404**.

So for a project that belongs to a PM workspace, ~30 sub-routes — backlog, sprints, bugs, qa,
timeline, analytics, releases, risks, incidents and the rest — redirect to a URL that does not exist.
The 404 page then renders without a `<main>` landmark, which is the finding the run recorded.

Two separable defects, neither fixed here: the missing workspace-mirror routes (route ownership, a
product decision about whether the mirror should exist or the redirect should be narrowed), and the
not-found page having no `main` landmark (`app/**/not-found.tsx`, another territory).

## 5 · Contrast — unchanged in kind, one new pair

5,175 text nodes sampled, **0 unresolved**, 468 AA failures, reported as 36 findings (the probe caps
at 3 per route). Three distinct pairs, on `/dashboard`, `/inbox`, `/hr/attendance` and `/calendar`:

| ink | ground | ratio | need |
|---|---|---|---|
| `#64748b` (`--muted-foreground`) | `#f1f5f9` (`--muted`) | **4.34** | 4.5 |
| `#cb7006` (`--status-warning-ink`) | `#ffffff` (`--card`) | **3.58** | 4.5 |
| `#ffffff` | `#22c55e` | **2.28** | 4.5 |

The first two are the pairs box 3 already recorded and handed up as a token-layer decision. The third
is new to the browser sweep and is white text on a green fill. Box 3 is closed on the token layer and
this does not reopen it; it is recorded here as call-site evidence.

## 6 · Box 2 — the one target in this territory, and the nine that are out of scope

`components/__tests__/keyboard-reachability.contract.test.ts` measures **633 click targets across
3,647 `.tsx` files**. Ten were unreachable at the start of this session; the complete list, produced
by running the analyzer directly:

```
app/(authenticated)/inventory/purchase-orders/page.tsx:198  <div>   inventory — out of release scope
app/(authenticated)/inventory/purchase-orders/page.tsx:253  <div>   inventory — out of release scope
features/build/views/kanban-ticket-card.tsx:74              <div>   THIS TERRITORY
features/crm/contacts/contact-list-page.tsx:186             <div>   CRM — out of release scope
features/crm/deals/deal-kanban-card.tsx:156                 <div>   CRM — out of release scope
features/crm/deals/deal-list.tsx:69                         <div>   CRM — out of release scope
features/crm/leads/kanban-card.tsx:177                      <span>  CRM — out of release scope
features/crm/leads/kanban-card.tsx:369                      <span>  CRM — out of release scope
features/crm/leads/kanban-card.tsx:386                      <div>   CRM — out of release scope
features/crm/settings/shared/chip-control.tsx:91            <div>   CRM — out of release scope
```

The nine CRM and inventory entries are recorded in the ticket as an **accepted scope exclusion, named
file by file**, rather than leaving the box silently open. They are real defects; they are simply not
in this release's blast radius, and the ratchet keeps them from growing.

## 7 · Environment

The stack S11 built was still live and was **probed before it was trusted**: `next dev` on :3000
(PID 50703, worker restarted 07:37:59, so it compiles current source — not a `next start` over a
stale `.next`), backend on :1501 against **`scratch_t30_browser`** (confirmed via `pg_stat_activity`),
org `aaaaaaaa-1111-0000-0000-000000000001`, session `335d656c-…`. The repo `.env`'s 36-character
`NEXTAUTH_SECRET` does **not** match the running server (a cookie minted with it 307s to `/signin`);
the 64-character process-only secret from the scratchpad does, and `/dashboard` answered **200**.
