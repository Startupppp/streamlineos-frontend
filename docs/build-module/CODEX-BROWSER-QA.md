# Codex browser verification — Build module closure

Owner: **Codex**. Claude does not mark anything in this file passed. Every check below is `READY_FOR_CODEX_BROWSER_QA` until Codex records a result from a real browser.

Claude's scope was code, automated tests and static verification. jsdom cannot observe layout overflow, real focus order, or paint (FE-123), so none of the checks here were covered by the automated suites.

## Read this before starting the stack

**`.env` and `.env.production` both resolve to the production RDS host.** There is no non-production PostgreSQL reachable from this machine. `D:\localstack` was deleted; `backend/.env.localstack` config survives but its database does not.

Consequences you must not work around by accident:

- Do not start the backend with `.env`. A local backend on `:1500` loaded from `.env` serves production data.
- Do not start the frontend without setting `API_INTERNAL_URL`. Unset, it silently points the local frontend at the production API — the app will look like it is working, against live tenant data.
- A blank app is almost always the API URL, not a code defect. Check that first.

**Unblock condition for a full authenticated pass:** a non-production PostgreSQL 15+ with the migration chain applied, `DATABASE_URL` set in the worktree environment, a seeded disposable tenant, and a frontend built against that local API. If you cannot provision one, record every check below as `BLOCKED_WITH_REASON: no non-production database` rather than skipping it silently.

If a full stack is unavailable, the fallback that Phase 4 used is a component-level harness: bundle the real components with esbuild against the real compiled Tailwind CSS, serve locally, drive system Chrome over CDP. That is honest evidence for layout, focus order and paint — the three target defect classes — but it is **not** evidence for data-dependent behaviour (pagination, partial failures, permission denial, revoked-grant non-disclosure). Mark those separately.

## Viewports

| Name | Size |
|---|---|
| Desktop | 1440 × 900 |
| Mobile | 375 × 812 |

Every surface below is checked at both widths.

## Surfaces and routes

| # | Surface | Route |
|---|---|---|
| 1 | My Work | `/build/my-work` |
| 2 | My Work (redirect source) | `/build/{projectId}/my-tickets` → `/build/my-work?projectId={projectId}` |
| 3 | My Work (workspace redirect source) | `/build/workspaces/{pmWorkspaceId}/my-work` → `/build/my-work?pmWorkspaceId=…` |
| 4 | Inbox | `/build/inbox` |
| 5 | Drafts (redirect source) | `/build/drafts` → `/build/inbox?view=drafts` |
| 6 | All Work | `/build/all-work` |
| 7 | Org settings — access | `/build/settings/access` |
| 8 | Org settings — client access | `/build/settings/client-access` |
| 9 | Org settings — integrations | `/build/settings/integrations` |
| 10 | Project settings (sectioned) | `/build/{projectId}/settings?section=…` |
| 11 | Project settings — workflow | `/build/{projectId}/settings/workflow` |
| 12 | Project settings — automations | `/build/{projectId}/settings/automations` |
| 13 | Project settings — webhooks | `/build/{projectId}/settings/integrations/webhooks` |
| 14 | Client access / portal grants | `/build/client-access` and `/build/settings/client-access` |
| 15 | Guest portal | `/client-portal` and `/client-portal/{projectId}` |
| 16 | Managed product roadmap | `/build/managed-products/{managedProductId}/roadmap` |
| 17 | Managed product feedback | `/build/managed-products/{managedProductId}/feedback` |
| 18 | Org roadmap | `/build/roadmap` |

## Required checks

Record each as PASS / FAIL / BLOCKED with a screenshot at both viewports.

### A. My Work loads and paginates

- [ ] `/build/my-work` renders real rows at 1440 and 375.
- [ ] At 375 the list renders as `mobileCard`, not a horizontally scrolling table.
- [ ] Cursor pagination advances and the cursor appears in the URL.
- [ ] Copy the paginated URL, open it in a fresh tab — the same page renders, not page 1.
- [ ] Change a filter — pagination resets to the first page and the cursor leaves the URL.
- [ ] Sort and group controls change the URL and the rendered order.

### B. Inbox and Drafts URL state survives refresh

- [ ] `/build/inbox` with `view`, `section`, `q`, `type` and `cursor` set — hard-refresh reproduces the exact view.
- [ ] `/build/drafts` redirects to `/build/inbox?view=drafts` and does not bounce back.
- [ ] The Mentions tab loads mentions from the server, not a client-side filter of another list.
- [ ] Search debounces (no request per keystroke) and resets pagination.
- [ ] Selection-aware bulk mark-read / archive / delete work; delete is behind a confirm dialog.

### C. All Work bulk actions show partial failures correctly

This is the highest-value check on the page, and it is the one jsdom proved but no human has seen.

- [ ] Select tickets spanning **more than one project** and run a bulk action where **one project fails and another succeeds**.
- [ ] The result names which projects succeeded and which failed. It must not report total failure.
- [ ] The successful projects' lists refresh; the failed one does not silently appear updated.
- [ ] A 409 conflict surfaces distinctly from a generic error and reads as retryable.
- [ ] Select **more than 100 tickets** — the action chunks and reports one combined outcome.
- [ ] Note: bulk selection exists only in the **Table** view. List and Board have no selection affordance. That is a known open follow-up, not a defect to file.

### D. Settings deep links resolve correctly

- [ ] Each of routes 7–13 loads directly from a cold address-bar navigation (not via in-app click). A cold load is the case that historically resolved the wrong permission.
- [ ] `/build/{projectId}/settings?section=…` deep-links to the named section.
- [ ] An unknown `section` value falls back to `general` rather than erroring.
- [ ] The owner-only `danger` section fails closed against a hand-crafted deep link for a non-owner.
- [ ] The six redirect sources (`/build/members`, `/build/access`, `/build/client-access`, `/build/{id}/workflow`, `/build/{id}/automations`, `/build/{id}/webhooks`) land on their targets with no redirect loop.

### E. Portal grant create / update / revoke

- [ ] Create a grant. The dialog closes, the row appears, no Zod parse error in the console.
- [ ] Update a grant. The row updates without a full-page reload.
- [ ] Revoke a grant. The row moves to revoked state.
- [ ] **Watch the browser console on all three.** A client-side contract parse failure surfaces there; this was finding P4-17 and the automated tests cover the schema, not the live response.
- [ ] Grants with no contact name and grants with a contact name both render — an absent contact must not blank the row.

### F. Revoked grant no longer exposes portal data

- [ ] With a grant active, load the guest portal for that project and note what is visible.
- [ ] Revoke the grant from the internal admin surface.
- [ ] **Without a hard refresh**, navigate back to the portal projection in the admin UI. Previously-granted project data must not still render. This is finding P4-18.
- [ ] As the guest, reload `/client-portal/{projectId}`. It must return an indistinguishable not-found — no project name, no id, no organisation name in the denied response or the page.
- [ ] Repeat for an **expired** grant (set `expiresAt` in the past). Same result as revoked.

### G. Roadmap and feedback status displays correctly

- [ ] `/build/roadmap` and the managed-product roadmap render each item's status.
- [ ] Filtering by `?status=` returns the matching subset and the filter round-trips through the URL.
- [ ] The feedback surface renders status and filters by it.
- [ ] Confirm status is not blank. The published `openapi.json` was verified on 2026-09-22 to carry `status` on `GET /build/roadmap`, `GET /build/feedback` and both PATCH routes, with the correct enum values, so a blank status here is a **real defect** and not an artifact gap. Report it rather than patching the client.
- [ ] Follow a feedback item → its linked roadmap item → its linked project. All three hops must be clickable.

### H. Keyboard focus order

At both viewports, on My Work, Inbox and All Work:

- [ ] Tab from the top of the page. Focus order follows visual order; no focus jumps backwards or into an offscreen element.
- [ ] `j` / `k` move the list selection, `Enter` opens, `Esc` closes, `/` focuses search.
- [ ] `/` inside a text input types a slash — it must not steal focus or open the command palette.
- [ ] Focus is trapped inside every dialog, sheet and drawer, and returns to the trigger on close.
- [ ] Every icon-only control is reachable and announces a label.

### I. Responsive overflow

- [ ] At 375, no surface scrolls horizontally. Check tables, filter bars, tab strips, stat rows and dialog footers specifically.
- [ ] At 375, rung-2 popovers and rung-3/4 filter panels open as **Drawers**, not popovers.
- [ ] At 1440, no content column stretches past its container or collapses to zero width.

### J. State ladder

For each of the 18 surfaces, at both viewports:

- [ ] **Loading** — a skeleton matching the real layout fills the available height. Never a bare spinner as the page state.
- [ ] **Empty** — first-run empty reads as "nothing here yet", with a create affordance where one exists.
- [ ] **Filtered-empty** — with a filter applied that matches nothing, the copy says the filter matched nothing. It must NOT claim there is no data at all. This was finding P4-27.
- [ ] **Error** — a real request failure renders an error state with a retry, not an empty list.
- [ ] **Permission-denied** — as a user lacking the surface's permission, the page renders a no-permission state, **not** an empty list. This was finding P4-19; test at minimum the roadmap, feedback and changelog tabs.
- [ ] **402 / plan-required** — if reachable, the upgrade path is shown rather than "Something went wrong".
- [ ] **Offline** — disable the network in DevTools. My Work, Inbox and All Work must not render misleading empty copy.
- [ ] **Expired-grant / session-expired** on the guest portal reads as expiry, distinct from denial.

### K. SVG and chart paint

The repo's design tokens are complete hex values, so the common `hsl(var(--token))` form expands to invalid CSS and the browser **silently drops the fill**. This cannot be seen in jsdom and no test asserts it.

- [ ] Every chart and status swatch on the Build reports and roadmap surfaces paints a real colour. A shape rendering in the default/black fill is the symptom.
- [ ] Check the fallback path specifically: a project or item with a **custom status** (one not in the built-in set) — that is the branch that takes the muted token.
- [ ] `critical-path-section` on the reports surface was explicitly **not covered** by the Phase 4 harness (React Flow behind `next/dynamic`). It needs a first real-browser look.
- [ ] Verify at both light and dark theme.

## What Claude did not verify, stated plainly

- No browser was opened. No screenshot was taken by Claude in this session.
- No database was contacted. No migration was applied.
- `openapi.json` was regenerated with placeholder env to test the standing "artifact is stale" blocker. It came back byte-identical to the committed artifact, which already carried `status`, so nothing was committed and the blocker is retired.
- Mobile layout, real focus order and paint are unverified by Claude across the entire Build module.

## Recording results

Put findings in `docs/build-module/NEXT-CLOSURE-STATUS.md` under the browser column, or a sibling `CODEX-BROWSER-QA-RESULTS.md`. For each FAIL, record the route, the viewport, the exact steps, and a screenshot. A check that could not be run is `BLOCKED`, never a silent skip.
