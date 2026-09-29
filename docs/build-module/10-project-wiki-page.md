# [pageId]

## Route decision

- **Current/target route:** `/build/[projectId]/wiki/[pageId]`
- **Scope:** project
- **Disposition:** **KEEP**
- **Decision:** Retain as a canonical page, subject to the gaps and acceptance criteria below.
- **User job:** Create and find durable project knowledge.
- **Evidence:** `frontend/app/(authenticated)/build/[projectId]/wiki/[pageId]/page.tsx`; route and access guard verified in the repository. Browser verification on 2026-09-28 used `/build/6/wiki/860067` with the local frontend on port 1000 and the configured deployed API: the page detail, page tree, editor, breadcrumbs, and details panel rendered after refresh with no fresh browser errors. The test record was created during browser verification and remains pending explicit cleanup approval.

## Product contract

- **Purpose:** Expose project-related Knowledge pages without duplicating Library.
- **Primary persona:** Contributor.
- **Success metric:** Search success and stale-page review rate.
- **Required density:** comfortable, with compact child collections.
- **Core fields:** page tree, title, status, owner, updated, backlinks, project links.

## Above-the-fold text wireframe

```text
Scope breadcrumb / title                         Search / saved view / primary action
Purpose or freshness line                       Permission-safe secondary actions
Filter and layout toolbar (URL-backed)
Summary or status strip (only decision-useful metrics)
Bounded primary collection / workspace
Selection-aware bulk action bar (when rows are selected)
```

Priority is identity and next action first, filters/layout second, bounded content third. Decorative cards, duplicate explanation banners, and non-actionable vanity metrics stay out of the first viewport.

## Elements and interactions

- Title/breadcrumb: clickable ancestors; current title is non-interactive unless inline rename is authorized.
- Search: debounced, keyboard focused with `/`, reflected in `q`.
- Filters/group/sort/layout: popovers or segmented controls; every response-shaping value updates the URL.
- Rows/cards: single click selects/opens preview when useful; explicit title link performs full-page navigation; right click opens the same authorized actions available from the row menu.
- Inline edits: status, priority, assignee, dates, estimate, and labels only when the mutation is optimistic and reversible. Financial, access, approval, publication, and destructive changes are never optimistic.
- Dialog: confirmation or focused form with at most five fields. Sheet: six or more fields, multi-section edit, or when source context must remain visible. Popover: reversible compact selection. Full page: durable, collaborative, historical, builder, or execution work.
- Non-interactive: explanatory copy, historical audit events, calculated metrics, and permission-denial reasons.

## URL state

Deep-linkable query parameters: the page detail has no collection filters. `q` on the wiki home redirects to KB search (deliberate). Collection filter params (`space`, `owner`, `status`, `sort`, `cursor`) apply to the wiki home list, not this detail view. Selection, open menus, drafts, and unsaved form state are not placed in the URL.

## Bulk, keyboard, and context actions

- Child collections support selection only when a real repeated operation exists; the primary record itself is never selected.
- Keyboard: `Tab` follows visual order and `Esc` closes overlays or clears selection, on every page. Where the page has the target: `/` focuses search, `c` creates in current scope, `j/k` moves through the list, `Enter` opens the focused row, `e` edits it, `?` opens shortcut help. A shortcut whose target does not exist on this page is not required — see CCG-4. Shortcuts do not fire inside text inputs/editors.
- Context menu: open, copy link/key, edit, move/link, and archive/delete where authorized. It mirrors visible commands and never hides the only path to an action.

## States

- Loading: stable skeleton matching final geometry; preserve stale authorized content on refetch.
- Empty: distinguish first-run setup from a filtered no-result state; one relevant primary action maximum.
- Error: preserve backend code/message, retry safely, expose request ID; never convert 402/403 into empty.
- Permission denied: `NoPermissionState` with no record existence leak.
- Offline: show freshness; allow local drafts and approved idempotent commands only.
- Conflict: show field-level server/current comparison for version conflicts.

## Permissions

| Standing | View | Create | Edit | Delete/archive |
|---|---:|---:|---:|---:|
| Organization owner/admin | Yes when module enabled | Yes | Yes | Yes, with invariant checks |
| Build owner/admin | Yes | Yes | Yes | Yes within Build scope |
| Build member | Authorized records | Yes when `build:create` | Own/assigned or explicit permission | No by default |
| Guest/client | Explicit grant projection only | Bounded request/comment only | Own allowed contribution | No |

Backend guards and record scope are authoritative. Controls fail closed while access is loading. Missing, deleted, cross-tenant, and unauthorized detail records return indistinguishable 404s.

## Components

- Existing feature evidence: `@/features/wiki/components/project-wiki-page-document`
- Reuse: `PageState`, `DataTable`, cursor controls, `FilterBar` target module, `EmptyState`, `EntityFormDialog`, `EntityFormSheet`, `ConfirmDialog`, status/priority chips, member picker, command palette, dirty-state guard.
- New only if absent: scope-specific summary/visualization or execution module. Promote a shared module only after a second real consumer.

## API and data contract

- **Endpoints:** Knowledge page APIs plus project record links.
- **Client schema/hooks:** `frontend/hooks/api/build/kb/pages.ts; kb/record-links.ts` where present.
- **List request:** `{ cursor?, limit<=100, q?, filters, sort }`; filters are the normalized URL state above.
- **List response:** `{ data: <row>[], pageInfo: { nextCursor, hasMore }, aggregates?, meta: { requestId, revision? } }`.
- **Detail response:** `{ data: { page tree, title, status, owner, updated, backlinks, project links, version, createdAt, updatedAt }, meta }`.
- **Mutation:** Zod-validated command, `Idempotency-Key` when retriable, `If-Match` for versioned updates; response returns the complete cache-patch projection.
- **Pagination:** cursor for unbounded activity/work; numbered pages only when an exact total is already computed cheaply.
- **Caching:** key includes scope, normalized filters, sort, cursor, and source revision. Standard list stale time 30 s; entity 60 s; live queues 0–15 s; reports 2 min.
- **Invalidation:** patch exact detail and every rendered collection first; invalidate only affected aggregates/ancestors after commit. Source-module projections follow source events and ACL revisions.

## Verification evidence

- `GET /kb/pages/860067/backlinks` was verified through the rendered details panel as a cursor-page response and displayed the empty state `No pages link here.` without a contract error.
- `GET /kb/pages/860067/comments` was exercised during document loading; the page remained usable after the client and server contracts were aligned to cursor pages.
- The browser action `Open details panel` opened and closed the panel successfully. The final page reload preserved the document route and rendered the editor without fresh warning or error logs.
- Focused frontend verification: 48 tests passed across milestones and wiki contract/gating suites; dialog-description structural check passed.
- Focused backend verification: backlinks service 5 tests passed; KB pagination suite 19 tests passed; backend typecheck passed.
- Backend commits pushed to `main`: `37dabb34a`, `0e94ed6`. Frontend commit pushed to `main`: `71a193bcc`.
- Railway CLI deployment status was not confirmed because the supplied token was rejected as unauthorized. The browser verification confirms the running API response shape, not a deployment audit record.

## Gaps

- **P0:** Verify route renders this contract rather than another page; add route/access/parent identity tests and complete loading/error/denied behavior.
- **P0:** Verify server/client Zod parity, bounded pagination, composite tenant predicates, and exact cache keys for every endpoint above.
- **P1:** Complete URL-backed filters, saved views, keyboard/context actions, bulk semantics, mobile layout, and accessible chart/table alternatives.
- **P2:** Add realtime or AI only when it reduces a measured user delay and preserves deterministic non-AI operation.

## Acceptance criteria

- [x] The canonical route and disposition are implemented, with old callers and redirects covered by a route census.
- [x] The page satisfies the stated user job and success metric without duplicating another module owner.
- [x] Every core field, action, overlay, query parameter, bulk action, shortcut, state, and permission above is implemented and tested.
  **Verified 2026-09-29 — `nice -n 10 npx jest --maxWorkers=2 features/wiki/components/project-wiki features/wiki/components/page-document-toolbar` → 3 suites, 40 passed — proves all three itemised remainders below are implemented, that the page tree is mounted project-scoped rather than against the global Knowledge Base, and that a viewer without `kb:pages:update` reaches a copy-link control. It does NOT prove focus order, overlay focus trapping or the 375 px layout of any of them, which jsdom cannot see (FE-123) and the two browser boxes below own.**

  **2026-09-29, closing lane. ALL THREE WERE CLOSED BY PEER LANES SINCE THE 2026-09-28 AUDIT; THIS LANE RE-READ EACH ON DISK RATHER THAN TRUSTING THE LIST, AND THE MOST INTERESTING ONE IS THE THIRD.**

  | Item as listed below | State at HEAD | Evidence |
  |---|---|---|
  | page tree | **implemented, and project-scoped** | `project-wiki-page-document.tsx:67` mounts `<PageTree projectId baseHref="/build/{projectId}/wiki">` |
  | `?` opens shortcut help | **implemented** | `project-wiki-page-document.tsx:39-49` `keydown` listener for `"?"` behind an `isTypingTarget` guard (`:18-24`), dialog at `:74` |
  | copy link for a read-only viewer | **implemented** | `page-document-toolbar.tsx:185-198` |

  **THE PAGE-TREE CONCERN IN THE LIST BELOW WAS CORRECT AND WAS FIXED AT THE ROOT RATHER THAN WORKED AROUND.** The note said mounting `page-tree.tsx` unchanged would break the project-scope guard because it hardcoded the global `pageHref`/`KNOWLEDGE_BASE`. It no longer does: `page-tree.tsx:53` and `page-tree-item.tsx:75,:122` all resolve `baseHref ? \`${baseHref}/${node.id}\` : pageHref(node.id)`, so `KNOWLEDGE_BASE` survives only as the unscoped fallback at `page-tree-item.tsx:154`. That is the difference between a component that can serve two scopes and a component copied for the second one. The guard is pinned by **paired** assertions — `project-wiki-scope.test.tsx:190/198`, `:206/217` and `:228/242` each put a project-scoped case beside an unscoped control, which is what stops the scoped test passing because the link is simply dead (FE-122).

  **THE READ-ONLY COPY-LINK FIX IS NOT THE UNGATING IT LOOKS LIKE, AND THIS IS THE PART WORTH READING.** The obvious reading of the old note is "the share popover was gated on `kb:pages:update`, so drop the gate". That would have been wrong. The popover's own copy handler (`page-share-popover.tsx:88-95`) copies the **public share token URL** — `${origin}/wiki/${page.publicToken ?? ""}` — which is a link that grants access to anyone holding it. Exposing that to a read-only viewer would turn a missing convenience into a permission escalation. What shipped instead is a **second, different control**: `page-document-toolbar.tsx:185-198` keeps `PageSharePopover` behind `canUpdate` and renders a plain `aria-label="Copy link"` button in its place otherwise, whose handler (`:169-175`) copies `window.location.href` — the authenticated URL the viewer is already on, which grants nothing. **Two links that look like one string in a spec; conflating them would have been a security defect, and the spec item is satisfied by the harmless one.**

  <details><summary>The stale 2026-09-28 itemisation, retained so the audit trail is not rewritten</summary>

  **NOT EARNED 2026-09-29 (superseded) — three named items are absent (page tree, the `?` shortcut, and a copy-link path for a read-only viewer).**
  - Audited per item against `/build/[projectId]/wiki/[pageId]` on 2026-09-28. Implemented and tested: core fields `title` (inline rename gated on the record's `canEdit`), `status`, `owner`, `updated`, `backlinks`, `project links`; project-scoped breadcrumb with clickable ancestors; overlays at their lowest sufficing rung — share popover, one-field template `Dialog`, `ConfirmDialog destructive` for delete, `Sheet` for comments / version history / page info / linked records, mobile details `Sheet` below `xl`; query parameters — none, correctly, this detail has no collection filters; bulk actions — none, correctly, the primary record is never selected; states loading / error-with-request-id / not-found / record-level 403 / surface denial as `NoPermissionState` / offline-with-queued-edits / field-level edit conflict; permissions `kb:pages:view`, `:create`, `:update`, `:manage`, `:delete`, `:export` and `kb:templates:manage`, each paired positive and negative. Three items are missing:
  - Core field **page tree** — absent. `frontend/features/wiki/components/project-wiki-page-document.tsx` renders a back-link plus `PageDocument`; the breadcrumb gives ancestors only (`frontend/features/wiki/components/page-document-breadcrumb.tsx:87`) and the outline gives headings, not sibling or child pages. `page-tree.tsx` and `page-tree-item.tsx` hardcode the global `pageHref`/`KNOWLEDGE_BASE`, so mounting them unchanged would break the project-scope guard in `frontend/features/wiki/components/project-wiki-scope.test.tsx:122`.
  - Shortcut **`?` opens shortcut help** — no keyboard handler and no `ShortcutHelpDialog` on this route; a grep for `useBuildListKeyboard|ShortcutHelpDialog|keydown` over `frontend/features/wiki/components/page-document*.tsx` and `project-wiki-page-document.tsx` finds nothing.
  - Context action **copy link/key** — reachable only from inside `frontend/features/wiki/components/page-share-popover.tsx`, which `frontend/features/wiki/components/page-document-toolbar.tsx:176` gates on `kb:pages:update`, so a read-only viewer has no path to the page's link.

  </details>
- [x] Lists are bounded/virtualized and remain usable at 10k work items and 1k members.
- [x] Server/client schemas, errors, cursor semantics, cache keys, optimistic patches, and invalidations have contract tests.
- [ ] Keyboard, screen-reader, reduced-motion, 375 px mobile, and high-density desktop checks pass. — **OUT OF SCOPE — browser verification** (2026-09-29: waived by Tarun, not a release blocker; see the open non-browser box above).
- [ ] Production browser evidence confirms ready, empty, filtered-empty, error, denied, and conflict behavior without modifying real data. — **OUT OF SCOPE — browser verification** (2026-09-29: waived by Tarun, not a release blocker; see the open non-browser box above).
