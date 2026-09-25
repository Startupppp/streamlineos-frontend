# LEDGER-PATCH-L4 — S08, S09, S18

Lane L4. 20 open boxes, 20 verdicts: **15 SATISFIED, 5 DEFECT FIXED, 0 DECISION-REQUIRED.**

Box lines below follow the brief's template literally so the orchestrator can string-match
verbatim text. **Every box in this file — SATISFIED and DEFECT FIXED alike — is ready to tick**;
the `- [ ]` prefix on DEFECT FIXED lines is the template's, not a residual gap.

Nothing here was accepted from AUDIT-L4, SESSION-04 or SESSION-05 prose. Every `file:line`
was opened and read in this pass, and every user-facing box was checked for a real consumer
(a hook that calls the route **and** a component that renders it), not merely a registration.

---

### S08 — Page document

- [x] Read/edit modes by permission — SATISFIED: `frontend/features/wiki/components/page-document.tsx:268`
- [x] Trust header: owner, status, visibility, verification, next review, updated-by/time — SATISFIED: `frontend/features/wiki/components/page-document-trust-header.tsx:112`
- [x] One action model: favorite, comments, metadata, backlinks, linked records, history, duplicate, move, save template, export, archive/delete — SATISFIED: `frontend/features/wiki/lib/page-action-descriptors.ts:129`
- [ ] Slash/insert menu, link preview, heading outline, anchored comments, citation blocks — DEFECT FIXED: `frontend/features/wiki/lib/page-comment-anchors.ts:16`, `frontend/features/wiki/components/page-comments-sheet.tsx:204`, `frontend/features/wiki/components/page-comment-thread.tsx:91`, `frontend/hooks/api/kb/kb-comments-schema.ts:10`; test `keeps anchorBlockIndex and anchorQuote instead of stripping the backend's anchor fields` in `frontend/features/wiki/components/page-comment-anchor.test.tsx:61`; bite-tested (failed before, passed after)
- [x] Mobile metadata/comments sheets — SATISFIED: `frontend/features/wiki/components/page-document-header.tsx:175`
- [x] In-memory or tenant-scoped server draft; connectivity + save timestamps; field-level conflict comparison; retry — SATISFIED: `frontend/features/wiki/components/use-page-autosave.ts:203`
- [x] AI actions show sources and produce a preview/diff before applying — SATISFIED: `frontend/features/wiki/components/kb-page-ai-actions.tsx:46`
- [x] Remove any page body in Web Storage (static scan + logout/org-switch/revocation tests) — SATISFIED: `frontend/features/wiki/components/page-document-no-storage.test.ts:29`
- [x] Content writes require expected revision; metadata writes never overwrite content — SATISFIED: `backend/src/modules/kb/wiki/dto/kb-pages.schemas.ts:46`
- [x] Unauthorized and missing are indistinguishable 404 — SATISFIED: `backend/src/modules/kb/core/authorization/knowledge-authorization.service.ts:185`

**Evidence:** Read/edit is one derived flag — `page-document.tsx:268` (`page.canEdit !== false && (!page.isLocked || canManage)`) — threaded to the title (`:332` `readOnly`), the editor (`:391` `uploadFile` gated) and the formatting-toolbar host (`:307`); `canEdit` itself is the backend's `resolvePageAccess(user, pageId, "edit")` decision (`kb-pages.service.ts:236`), not a client guess. The trust header renders all six fields in one row — status/verification/visibility badges at `page-document-trust-header.tsx:114-116`, owner `:117`, next review `:123`, updated-time + updated-by `:129-138` — and is rendered unconditionally at `page-document.tsx:359`. The action model is a single descriptor table (`page-action-descriptors.ts:129-245`) resolved once by permission (`resolveKbPageActions:270`) and dispatched by one switch (`page-document-toolbar.tsx:147-161`); backlinks appear both as a submenu (`page-document-toolbar.tsx:189-215`) and in the right panel alongside **linked records** (`page-right-panel.tsx:103-149`, which is reachable below 1280px through the floating trigger at `:185-194`), and "archive/delete" is the soft-delete-to-trash confirm at `page-document-header.tsx:192-211`. Mobile sheets are `Sheet`-based overlays mounted from the header (`page-document-header.tsx:175` comments, `:180` history, `:240` metadata), reachable from a "More options" menu with no breakpoint gate. Autosave carries the four required signals — `savedAt` (`use-page-autosave.ts:124`), `isOffline` (`:203-219`), `pendingFields` (`:155`), and retry on both reconnect (`:211 drainQueued`) and failure (`:131` requeue) — and the conflict banner names the user's own changed fields (`page-edit-conflict.tsx:74-78`). AI output is draft-first: `kb-page-ai-actions.tsx:46-58` stashes the improvement and only applies it after `KbPageImproveDiffDialog` confirms, and citations survive the content-only branch at `components/ai/ai-action-result-body.tsx:174-186`. The Web-Storage box is a live static scan plus logout/org-switch/revocation cases — re-run, 7/7 pass. On the backend, a content write without `expectedContentRevision` is rejected by a `superRefine` at `kb-pages.schemas.ts:46-58`, the guard lands in the `WHERE` clause at `kb-pages.service.ts:323` and raises 409 at `:330`, while metadata-only updates never assign `values.content` (`:274`). Unauthorized and missing are the same 404 because `resolvePageAccess` only returns `denied()` for an actor with no membership at all (`knowledge-authorization.service.ts:106-109`); every page-level miss is `notFound()` (`:131`) and `assertPageAccess` turns that into `NotFoundException("Page not found")` (`:189`) — the identical message a genuinely missing row produces (`kb-pages.service.ts:193, 238, 329`).

**The defect, and why it had been ticked in prose:** the editor half of box 4 was real and reachable — `plate-document-editor.tsx:55` calls `buildPlugins()`, which registers the slash menu (`plate-plugins.ts:236`), the `citation` element (`:228`) and the `link_preview` element (`:232`), each insertable from a slash command (`plate-combobox-elements.tsx:38-39`, handlers at `:112` and `:118`), and `LinkPreviewElement` really unfurls through `useLinkPreview` (`plate-elements.tsx:314`); the heading outline is rendered at `page-document.tsx:376`. **Anchored comments were not.** The backend was complete — columns, DTO (`kb-page-comments.schemas.ts:6-7`), reply rejection (`kb-page-comments.service.ts:85-87`), write (`:98-99`), response schema (`kb-wiki-response.schemas.ts:36-37`), controller `@ResponseSchema` (`kb-page-comments.controller.ts:47, 65`), migration 1216 applied — and **zero frontend consumed it**: `grep -rn "anchorBlockIndex\|anchorQuote"` over `frontend/` returned nothing. Worse, the frontend contract (`kb-comments-schema.ts`) omitted both fields, so `z.object` silently stripped them on every decode — a fully-built, fully-tested capability with no consumer and a contract-parity violation hiding it. Fixed end to end: contract (`kb-comments-schema.ts:10-11`), types and mutation input (`page-comments.ts:22-23, 32-33`), a new pure anchor model reusing `version-diff`'s existing block walk rather than duplicating it (`page-comment-anchors.ts:16`, `version-diff.ts:71` now exported), a bounded (`ANCHOR_TARGET_CAP = 25`) chip group in the composer that posts `anchorBlockIndex`/`anchorQuote` for a top-level comment and nothing for a reply (`page-comments-sheet.tsx:69-70, 204-236`), the quoted block rendered on each anchored comment (`page-comment-thread.tsx:91-95`), and the page content threaded in from the one component that already holds it (`page-document-header.tsx:179`) so no second fetch was added. 8 new tests in `page-comment-anchor.test.tsx`; bite-tested — before the fix the suite could not even resolve the anchor module, and with the module present 5 of 8 failed for exactly the right reasons (contract stripped the fields, no anchor control rendered, no quote displayed); after, 8/8 pass with `page-comments-visibility.test.tsx` and `page-comment-thread.test.tsx` still green.

---

### S09 — History

- [x] Cursor list with actor, time, change summary; current marker — SATISFIED: `backend/src/modules/kb/wiki/kb-page-versions.service.ts:49`
- [x] Select one or two versions; semantic block diff; metadata/content distinction — SATISFIED: `frontend/features/wiki/lib/version-diff.ts:177`
- [x] Restore preview + confirmation; deep link to a version; audit entry — SATISFIED: `frontend/features/wiki/components/page-history-page.tsx:572`
- [x] Restore appends a new version, never rewrites history, increments revision, reindexes asynchronously — SATISFIED: `backend/src/modules/kb/wiki/kb-page-versions.service.ts:125`
- [x] Remove unbounded revision load and raw JSON diff — SATISFIED: `backend/src/modules/kb/wiki/kb-page-versions.service.ts:51`

**Evidence:** The list is genuinely keyset-paginated, not a capped full read: `listVersions` orders by `(versionNumber DESC, id DESC)` and pages with `keysetBeforeValue` on the same pair (`kb-page-versions.service.ts:63-68`), so the cursor matches the ORDER BY, and the limit is clamped to `PAGE_SIZE_CAP = 100` at `:51`. Its consumer is real on both surfaces — `useKbPageVersionsInfinite` (`frontend/hooks/api/kb/page-versions.ts:33-52`) drives the full-page list (`page-history-page.tsx:208-216`, `InfiniteScrollSentinel` at `:450`) and the in-editor sheet (`page-history-sheet.tsx:50`), and the route that renders the full page exists and is registered (`frontend/app/(authenticated)/knowledge/wiki/doc/[pageId]/history/page.tsx`). Each row shows actor, time and change summary (`page-history-page.tsx:433-441`) with the current marker derived from the first row (`:217`) and badged at `:408-415`. One or two versions select through `selectedA`/`selectedB` under an explicit compare toggle (`:237-265`), and the diff is semantic, not textual: `computeVersionDiff` (`version-diff.ts:177`) extracts top-level blocks for both Slate arrays and legacy TipTap docs (`:71-86`), runs an LCS over `(type, text)` pairs (`:101-150`), and promotes an adjacent remove/add pair to a single `changed` block above 0.3 similarity (`:152-175`); metadata is kept distinct from content — `titleChanged`/`oldTitle`/`newTitle` are returned beside `blocks` (`:195-203`) and rendered separately at `page-history-page.tsx:74-81`. Restore is previewed as a diff against current (`:548-553`), confirmed through `ConfirmDialog` (`:572-580`), deep-linkable via `?version=`/`?compare=` read at `:195-196` and written back with `router.replace(..., { scroll: false })` at `:229-235`, and audited server-side. The server path never rewrites history: `snapshotIfNeeded` runs **before** the update (`kb-page-versions.service.ts:126`) and again **after** it with a `Restored from version N` summary (`:141-149`), the page row only gains `contentRevision: content_revision + 1` (`:135`), the audit row is inserted in the same transaction (`:155-159`), and reindexing is deferred through `OutboxWriter.emit` inside that transaction (`:161-170`) rather than a fire-and-forget call on a committed handle. No raw-JSON diff path survives anywhere on the history surfaces (`JSON.stringify` returns zero hits across `page-history-page.tsx`, `page-history-sheet.tsx` and `version-diff.ts`). Re-ran `page-history-page.test.tsx`, `page-history-cursor.test.tsx` and `version-diff.test.ts` — all green.

---

### S18 — Project wiki adapters

- [ ] `/build/[projectId]/wiki` and `/build/[projectId]/wiki/[pageId]` scope every list/search/create/read/history path by project — DEFECT FIXED: `frontend/features/wiki/components/page-document-toolbar.tsx:111`, `frontend/features/wiki/components/page-history-sheet.tsx:178`; test `routes a duplicated page through the caller's navigator instead of the global knowledge URL` in `frontend/features/wiki/components/project-wiki-scope.test.tsx:103`; bite-tested (failed before, passed after)
- [x] Project membership enforced on every path — SATISFIED: `backend/src/modules/kb/core/authorization/knowledge-page-scope.ts:110`
- [ ] History adapter added — DEFECT FIXED: `frontend/features/wiki/components/page-history-sheet.tsx:49`, `frontend/features/wiki/components/page-document-header.tsx:185`; test `offers no link to the global knowledge history when the page is opened inside a project` in `frontend/features/wiki/components/project-wiki-scope.test.tsx:121`; bite-tested (failed before, passed after)
- [x] Project back path in the breadcrumb (Project → Wiki → ancestors) — SATISFIED: `frontend/features/wiki/components/page-document-breadcrumb.tsx:50`
- [x] No duplicate data, editor, or authorization implementation — SATISFIED: `frontend/features/wiki/components/project-wiki-page-document.tsx:37`

**Evidence:** Both routes exist and are registered — `frontend/app/(authenticated)/build/[projectId]/wiki/page.tsx:10` and `.../wiki/[pageId]/page.tsx:11` both call `enforceRouteAccess`, and both patterns are pinned to `module:build + build:view` by `lib/build/build-route-access-deny.test.ts:122-123`, so they are reachable, not merely present. Of the five data paths: **list** is scoped (`wiki-home-all-pages.tsx:321` passes `projectId` into `useKbPageCollection`, which forwards it at `hooks/api/kb/page-collection.ts:57`); **create** is scoped (`wiki-home-page.tsx:58`, `wiki-home-all-pages.tsx:380`); **read** resolves through `useKbPage(pageId)` with no project param, which is correct because the backend derives scope from the page's own stored `projectId` (below); **search** has no path on either route at all — the search form is explicitly suppressed when project-scoped (`wiki-home-page.tsx:88`) and the all-pages list has no `q` filter, so there is no unscoped search path to close (see HANDOFF); **history** was the real leak. Two escapes out of the project context were found and fixed: `page-document-toolbar.tsx` duplicated a project page and then pushed the **global** `/knowledge/wiki/doc/{id}` URL, ignoring the `onNavigate` prop it already receives — now it routes through that caller-supplied navigator (`:111`), which `ProjectWikiPageDocument` binds to `projectPageHref` (`project-wiki-page-document.tsx:19-25`); and `PageHistorySheet`'s "Open full history →" footer link was hardcoded to `pageHistoryHref(pageId)` — `/knowledge/wiki/doc/{id}/history` — so a user reading history inside `/build/7/wiki/42` was deep-linked out of the project. The sheet is now project-aware (`page-history-sheet.tsx:45-49`) and suppresses that escape when scoped (`:178`), with `projectId` threaded from the header (`page-document-header.tsx:185`); inside a project the sheet *is* the history adapter — it carries the same cursor list, actor/time/summary rows, current marker, version preview and restore-with-confirm. Membership is enforced by the authorization layer rather than by a client-supplied parameter, which is the stronger arrangement: `getAccessibleProjectIds` (`backend/src/modules/kb/retrieval/kb-project-access.util.ts:6-30`) joins `project_members` → `organization_members` with `status = 'ACTIVE'`, `buildIndexedBranch` admits a project page **only** through that list (`knowledge-page-scope.ts:110-114`), and a project page is deliberately excluded from the org/public branch (`:87-89`), so omitting `projectId` from a request cannot widen access; the explicit `resolveProjectAccess` 404 checks on create/tree/search (`kb-pages.service.ts:125-132, 416`) are belt-and-braces on top. The one caveat worth recording: org owners and KB admins bypass this by design (`knowledge-page-scope.ts:149-156`). The breadcrumb renders `Project → Wiki → ancestors → page` with project-relative ancestor hrefs (`page-document-breadcrumb.tsx:50-78`, `resolveAncestorHref:41-45`). And there is genuinely no duplication: `ProjectWikiPageDocument` is a 41-line adapter that delegates to the same `PageDocument` (`:37`), which mounts the same `PlateDocumentEditor`, the same `hooks/api/kb/*` and the same `KnowledgeAuthorizationService` the `/knowledge/wiki` routes use — the project-specific surface is two route files, one wrapper, and `projectId` branches inside otherwise-shared components. Bite-tested: before the fix, the duplicate test failed with `onNavigate` never called and the history test found the global link still rendered; the paired control (the link **is** offered outside a project, `project-wiki-scope.test.tsx:129`) passed both before and after, so the absence above is a scoping decision and not a missing element. `page-document-toolbar.test.tsx`, `project-wiki-page-document.test.tsx` and `page-document-breadcrumb.test.tsx` all still pass.

---

## Verification run

Frontend, `--runTestsByPath -w 2` only (no repo-wide gate, no full suite):
`page-comment-anchor.test.tsx` (8), `project-wiki-scope.test.tsx` (3), `page-history-page.test.tsx`,
`page-history-cursor.test.tsx`, `page-document-outline.test.tsx`, `page-document-toolbar.test.tsx`,
`page-document-no-storage.test.ts`, `page-comments-visibility.test.tsx`, `page-comment-thread.test.tsx`,
`page-document-breadcrumb.test.tsx`, `project-wiki-page-document.test.tsx`,
`page-action-descriptors.test.ts`, `version-diff.test.ts`, `hooks/api/kb/page-comments-gate.test.tsx`
— **all green.** Backend: `kb-page-comment-anchor.spec.ts`, `kb-pages.concurrency.spec.ts` — 16/16 green.
`npx eslint` clean on all seven changed source files and both new specs. No `any`, no `as X`,
no `@ts-ignore`, no code comments added. No migration authored, no database touched.

## Files changed

| File | Change |
|---|---|
| `frontend/hooks/api/kb/kb-comments-schema.ts` | contract carries `anchorBlockIndex`/`anchorQuote` |
| `frontend/hooks/api/kb/page-comments.ts` | `KbPageComment` + `CreateKbPageCommentInput` carry the anchor |
| `frontend/features/wiki/lib/page-comment-anchors.ts` | **new** — anchor target model over the existing block walk |
| `frontend/features/wiki/lib/version-diff.ts` | `extractBlocks` exported so the anchor model reuses it |
| `frontend/features/wiki/components/page-comments-sheet.tsx` | anchor chip group; posts the anchor on top-level comments only |
| `frontend/features/wiki/components/page-comment-thread.tsx` | renders the anchored block quote |
| `frontend/features/wiki/components/page-document-header.tsx` | passes `content` to the comments sheet, `projectId` to the history sheet |
| `frontend/features/wiki/components/page-document-toolbar.tsx` | duplicate navigates through `onNavigate`, not the global URL |
| `frontend/features/wiki/components/page-history-sheet.tsx` | project-aware; no global history escape when scoped |
| `frontend/features/wiki/components/page-comment-thread.test.tsx` | fixture gains the two new required fields |
| `frontend/features/wiki/components/page-comment-anchor.test.tsx` | **new** — 8 tests |
| `frontend/features/wiki/components/project-wiki-scope.test.tsx` | **new** — 3 tests |

## Handoffs

**HANDOFF — full-page project history route. Owner: ORCHESTRATOR + the Build lane. Do not let L4
do this.** A `/build/[projectId]/wiki/[pageId]/history` route would give project pages the
two-version compare and `?version=` deep links that `/knowledge/wiki/doc/[pageId]/history` has and
the sheet does not. It cannot be added from this lane: `lib/build/build-route-manifest.test.ts:8-30`
walks `app/(authenticated)/build` for `page.tsx` files and compares the set **bidirectionally**
against a hand-written 65-entry manifest, with a hard `expect(BUILD_ROUTE_MANIFEST).toHaveLength(65)`
at `:33`; `build-route-access-deny.test.ts` pins the same 65 by length. A new page file under
`build/` therefore turns **three Build-owned specs red** until `lib/build/build-route-manifest.ts`
and both specs are updated together. Per this lane's brief ("do not reach into Build"), the route
was not added. If it is wanted: add the manifest entry + both spec rows, then a route rendering
`PageHistoryPage` with a `projectId` prop, add `projectPageHistoryHref` to `lib/knowledge-routes.ts`,
and point `page-history-sheet.tsx:178` at it instead of suppressing the link.

**HANDOFF — project-scoped wiki search. Owner: the S05 (Full Search) / S06 (Wiki Home) lanes.**
There is no search path on either project wiki route: `wiki-home-page.tsx:88` hides the search form
when `isProjectScoped`, and `wiki-home-all-pages.tsx` never sends `q`. Nothing is therefore
*unscoped* — but nothing is searchable either. The backend already supports it on two endpoints
(`GET /kb/pages` takes `q` + `projectId`, forwarded at `hooks/api/kb/page-collection.ts:55-57`;
`GET /kb/pages/search` takes `projectId` and enforces membership with a 404). Closing it means
editing `wiki-home-page.tsx` / `wiki-home-all-pages.tsx` / `wiki-search-page.tsx`, which belong to
S05/S06, so L4 did not touch them.

**HANDOFF — `GET /kb/pages` enforces project scope by row-filtering, not by a 404.** `create`,
`tree` and `search` all call `resolveProjectAccess` and throw `NotFoundException("Project not
found")` for a non-member; the collection endpoint relies solely on `buildVisiblePageScope`
filtering the rows out, so a non-member's `?projectId=` query returns an empty list instead of a
404. Not a hole — the predicate still excludes every row — but it is an inconsistency in
enforcement style that a future reader will trip over. Owner: whichever lane owns S04
(`KnowledgeCollection` + canonical `GET /kb/pages`).

**HANDOFF — no backend e2e covers project-wiki scoping.** Coverage is unit-level only
(`kb-wiki-project-scoped.spec.ts`, `kb-page-create-project-scope.spec.ts`), both against a mocked
`resolveProjectAccess`; no `*.e2e-spec.ts` in `modules/kb` references `projectId`, so the real
guard chain on these routes has never been exercised end to end.
