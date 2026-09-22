# Codex Browser QA — Dead Build Surface Removal

**Branch:** `build/remove-dead-build-surface`
**Worktree:** `D:/projects/personal/slos-dead-surface`
**Status:** `READY_FOR_CODEX_BROWSER_QA`

Claude ran code and automated tests only. **No browser verification is claimed**
by Claude, and none of the results below may be inferred from unit tests — jsdom
cannot observe real paint, focus order or layout overflow.

Verify every route at **1440×900** and **375×812**.

## What changed, in one paragraph

Six Build routes carried both a `next.config.ts` redirect and a redirect-only
`page.tsx`. Configuration redirects fire before the filesystem, so those page
files never executed; they were deleted and the redirects kept. Three other
redirect-only routes had no configuration redirect and were kept unchanged. The
command palette entry and the `g`+`i` keyboard chord for "My Tickets" now open
the canonical `/build/my-work?projectId=…` instead of hopping through the
`/build/[projectId]/my-tickets` redirect. Nothing else in the Build navigation
moved.

Use a real project id throughout — project `1` has representative work.
Substitute it for `{projectId}` below.

## A. Retained redirects — must still land on the target

Each of these must resolve to the canonical page, not a 404 and not
Access Denied. Type the URL into the address bar (a fresh document request) and
then repeat it as an in-app navigation so both the server redirect and the
client router are exercised.

| # | Enter this URL | Must land on | Notes |
|---|---|---|---|
| A1 | `/build/access` | `/build/settings/access` | Members list plus Build Access panel |
| A2 | `/build/members` | `/build/settings/access` | same page as A1 |
| A3 | `/build/client-access` | `/build/settings/client-access` | external grant administration |
| A4 | `/build/{projectId}/workflow` | `/build/{projectId}/settings/workflow` | |
| A5 | `/build/{projectId}/automations` | `/build/{projectId}/settings/automations` | |
| A6 | `/build/{projectId}/webhooks` | `/build/{projectId}/settings/integrations/webhooks` | |
| A7 | `/build/{projectId}/my-tickets` | `/build/my-work?projectId={projectId}` | redirect **moved** from the page into config |
| A8 | `/build/drafts` | `/build/inbox?view=drafts` | redirect **moved** from the page into config |
| A9 | `/build/workspaces/{pmWorkspaceId}/my-work` | `/build/my-work?pmWorkspaceId=…` | redirect **moved** from the page into config |

**Failure signature to watch for:** all nine are routes whose page file was
deleted. If any 404s, the configuration redirect is not covering a case the page
used to cover, and the deletion must be reverted for that route.

A7–A9 deserve the closest look, because their redirect changed mechanism rather
than merely losing a redundant copy. In particular confirm the **query string
survives**: A7 must arrive with `?projectId=` populated, A9 with
`?pmWorkspaceId=`, and A8 with `?view=drafts`. A redirect that lands on a bare
`/build/my-work` or `/build/inbox` is a regression even though it does not 404.

Also confirm a **non-numeric** project id degrades safely: `/build/abc/workflow`
should 404, not throw and not render a broken settings page. The configuration
redirect is constrained to `:projectId(\d+)`, so this path no longer has a page
behind it. A clean 404 is the intended outcome.

## B. Canonical navigation — no link may point at a deleted page

| # | Surface | Check |
|---|---|---|
| B1 | Build sidebar, organization scope | "Members & access" opens `/build/settings/access`; "Client access" opens `/build/settings/client-access`. Neither URL bar shows `/build/access`, `/build/members` or `/build/client-access` even momentarily. |
| B2 | Build sidebar, project scope → More tools | "Workflow", "Automations" and "Webhooks" each open their `…/settings/…` URL directly, with no visible redirect flash. |
| B3 | Every entry in project More tools | Click all of them. None 404s. |
| B4 | Collapsed sidebar | Same checks with the rail collapsed; tooltips and icons still identify the destination. |
| B5 | Mobile drawer at 375 px | Build navigation opens as a sheet, current scope in the header, no horizontal scroll, every retained entry reachable. |
| B6 | Build sidebar → **Drafts** (under My Work) | Opens `/build/inbox?view=drafts` **directly**. The URL bar must never show `/build/drafts` on the way. This entry was changed by this work — it previously linked into the redirect. |

## C. Command palette and keyboard — the repointed entries

| # | Action | Expected |
|---|---|---|
| C1 | Open the palette (`/` or `Cmd/Ctrl-K`) on a project page, choose **My Tickets** | Navigates to `/build/my-work?projectId={projectId}` in one hop. No intermediate `/build/{projectId}/my-tickets` in the URL bar or in browser history. |
| C2 | On a project page press `g` then `i` | Same destination as C1. |
| C3 | After C1, press browser **Back** | Returns to the originating project page, **not** to a redirect stub. Then **Forward** returns to My Work with the filter still applied. |
| C4 | Palette search for "workflow", "automations", "webhooks", "access", "members" | Every result that navigates lands on a real page. |
| C5 | Palette, keyboard only | Arrow keys move the highlight, `Enter` activates, `Esc` closes and returns focus to the trigger. |

## D. My Work and Inbox must actually honour the forwarded scope

The redirects only matter if the target respects the parameter.

| # | Check |
|---|---|
| D1 | `/build/my-work?projectId={projectId}` shows work scoped to that project, and the project filter control reflects it rather than reading as unfiltered. |
| D2 | `/build/my-work?pmWorkspaceId=…` likewise for a workspace. |
| D3 | `/build/inbox?view=drafts` opens the Inbox **on the drafts view**, not on the default view. |
| D4 | Reload each of D1–D3. The state survives, because it is URL state. |
| D5 | Copy the URL from D1 into a new tab. Same view. |

## E. Managed products — organization correctness

No managed-product file was changed. Verify the structure is correct as it
stands, at both widths.

| # | Route | Check |
|---|---|---|
| E1 | `/build/managed-products` | Organization product listing. |
| E2 | `/build/managed-products/{id}` | Product overview. Scope selector shows the product, not the organization. |
| E3 | `/build/managed-products/{id}/projects` | Only projects linked to **this** product. |
| E4 | `/build/managed-products/{id}/roadmap` | Roadmap scoped to this product. |
| E5 | `/build/managed-products/{id}/goals` | Goals scoped to this product. |
| E6 | `/build/managed-products/{id}/insights` | Insights scoped to this product. |
| E7 | `/build/managed-products/{id}/feedback` | Feedback scoped to this product. Hidden if the feedback org module is off. |
| E8 | Switch products via the scope selector | Every tab re-scopes to the new product. No page shows the previous product's rows. |
| E9 | `/build/workspaces/{pmWorkspaceId}/products` | Workspace-scoped listing — a **different** set from E1, not a duplicate of it. |
| E10 | All of E1–E7 at 375 px | Tab strip does not overflow horizontally; no content is clipped. |

## F. States — loading, empty, error, denied, offline

For `/build/settings/access`, `/build/settings/client-access`,
`/build/{projectId}/settings/workflow`, `…/settings/automations`,
`…/settings/integrations/webhooks`, `/build/my-work`, `/build/inbox` and every
managed-product route:

| # | Check |
|---|---|
| F1 | Cold load shows a skeleton that mirrors the real layout, not a bare spinner, and it fills the available height rather than collapsing. |
| F2 | A genuinely empty result shows the empty state, **not** a permission denial and not a blank panel. |
| F3 | A user lacking the permission sees the denial state, **not** an empty list. This is the highest-value check on this list. |
| F4 | Throttle the network to Offline and reload: the offline state appears rather than a misleading "nothing here". |
| F5 | Force a failing request: the error state appears with a retry, and a 402 shows the upgrade path rather than "Something went wrong". |

## G. Access-denied behaviour on the retained redirects

| # | Check |
|---|---|
| G1 | As a user **without** `build:access:view`, enter `/build/access`. Expect the normal Access Denied treatment for `/build/settings/access` — not a redirect loop, not a blank page. |
| G2 | Same for `/build/{projectId}/workflow` without `build:workflow:view`. |
| G3 | No user is bounced to `/access-denied` from a route they *should* reach. Walk the whole Build sidebar as a restricted role and confirm every visible link opens. |

## H. Focus, overflow and paint (FE-123 — jsdom cannot see these)

| # | Check |
|---|---|
| H1 | Tab order through `/build/settings/access` is visually sequential; the focus ring is visible on every stop. |
| H2 | No horizontal scrollbar at 375 px on any route in this document. |
| H3 | Tables become cards or scroll within their own container at 375 px; the page itself does not scroll sideways. |
| H4 | Overlays trap focus and return it to the trigger on close. |
| H5 | Icon-only controls announce a label to the accessibility tree. |

## Reporting

For each row record **PASS**, **FAIL** or **NOT-RUN** with the width. Report
`NOT-RUN` rather than a fabricated pass. For any FAIL, capture the URL, the
width, a screenshot and the console output.

The deletion must be reverted for a specific route if, and only if, a row in
section **A** fails — that is the only evidence that a deleted page was
reachable after all.
