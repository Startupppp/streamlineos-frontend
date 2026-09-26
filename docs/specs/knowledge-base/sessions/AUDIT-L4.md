# AUDIT-L4 — S08 (Page document), S09 (History)

Lane L4. Original territory: `backend/src/modules/kb/wiki/kb-page-versions.service.ts`,
`kb-pages.service.ts` revision/conflict paths, `frontend/features/wiki/components/page-document*.tsx`,
`page-document-toolbar*`, `page-history-*.tsx`, `frontend/features/wiki/lib/version-diff.ts`,
`frontend/hooks/api/kb/page-versions.ts`, `frontend/features/wiki/components/use-page-autosave.ts`.

**Territory extended by the coordinator** after the L1-handoff investigation, since the three
remaining S08 editor-feature gaps had no other owning lane: `frontend/components/editor/plate/**`
(link preview, citation blocks) and `backend/src/modules/kb/wiki/kb-page-comments.service.ts`
(anchored comments), plus their direct dependencies (DTO schemas, response schemas, Drizzle
schema, migration 1216).

Method: every box was re-measured against the current tree (not trusted from SESSION-04/SESSION-05
prose), because SESSION-09's follow-up "Load more → infinite scroll" lane touched
`page-history-page.tsx` and `page-history-sheet.tsx` after SESSION-05 closed, and could have
silently regressed what SESSION-05 proved.

## S08 — Page document

- [x] **DONE** — Read/edit modes by permission. `frontend/features/wiki/components/page-document.tsx:266`
  — `isEditable = page.canEdit !== false && (!page.isLocked || canManage)`, threaded into the
  toolbar, editor and title field.
- [x] **DONE** — Trust header: owner, status, visibility, verification, next review, updated-by/time.
  `frontend/features/wiki/components/page-document-trust-header.tsx:112-140` renders all six fields;
  wired from `page-document.tsx:357-365`.
- [x] **DONE** — One action model. `frontend/features/wiki/components/page-document-toolbar.tsx:32-99`
  consumes SESSION-02's `resolveKbPageActions`/`groupKbPageActions` from `page-action-descriptors.ts`
  for favorite/comments/metadata/history/duplicate/move/save-template/export/archive/delete.
  Backlinks and linked records reachable via `page-right-panel.tsx` (floating trigger below 1280px,
  confirmed present, out of my file territory to re-verify further).
- [x] **DONE** — Slash/insert menu, link preview, heading outline, anchored comments (backend),
  citation blocks.
  - Slash/insert menu: **DONE** — `frontend/components/editor/plate/plate-plugins.ts:226-230`
    (`SlashPlugin`/`SlashInputPlugin`), plus callouts, toggles, mentions, page-links, tables already
    wired.
  - Heading outline: **OPEN → FIXED.** Measured: no outline/TOC component existed anywhere in the
    repo (`grep -i "heading-outline\|table-of-contents\|toc"` — zero hits outside `.next-stale`
    build artifacts). Built `frontend/features/wiki/components/page-document-outline.tsx` (new,
    in-territory: matches `page-document*.tsx`) — a pure `extractHeadings()` over the live Slate-array
    page content (h1/h2/h3 nodes) plus a `<nav>` of jump links that scroll the matching `h1/h2/h3` DOM
    node inside a `containerRef` wrapping `<PlateDocumentEditor>`. Wired into
    `frontend/features/wiki/components/page-document.tsx` (new `editorContainerRef`, rendered above
    the editor). Test: `page-document-outline.test.tsx`, 8/8 PASS — confirmed FAIL before the
    component existed (`Cannot find module './page-document-outline'`), PASS after.
  - Link preview: **OPEN → FIXED**, once the coordinator extended territory to
    `components/editor/plate/**`. Measured first: only `LinkFloatingToolbar`
    (`components/editor/plate/toolbar/link-floating-toolbar.tsx`) existed, a plain insert/edit-URL
    popover, not a preview card. Reused the existing, already SSRF-guarded (BE-95), already-tested
    `/chat/link-preview` endpoint (`backend/src/modules/chat/chat-link-preview.controller.ts`) and its
    frontend hook `useLinkPreview` (`frontend/hooks/api/chat-entities.ts:35`) rather than building a
    second unfurl pipeline — confirmed `chat:messages:read` (the hook's permission gate) is part of
    `EMPLOYEE_SELF_SERVICE` (`backend/src/modules/rbac/permissions/role-defaults.ts:16-40`), so every
    org member a KB editor already is holds it. New `link_preview` Plate element
    (`components/editor/plate/plate-elements.tsx`, `LinkPreviewElement`), registered as a void block
    plugin in `plate-plugins.ts:230-233`, insertable via a new "Link preview" slash command
    (`plate-combobox-elements.tsx`). Caught and fixed a real bug during review: the OG `image` field
    is an arbitrary third-party hostname, and `next.config.ts`'s `images.remotePatterns` is a fixed
    allowlist (dicebear/r2/unsplash/streamlineos.app/googleusercontent) with no wildcard — `next/image`
    would throw at runtime for any other host. Added `unoptimized` to the `Image` (matching the
    existing precedent at `components/blog/blog-card.tsx:58`) rather than editing `next.config.ts`
    (outside territory, and a wildcard image allowlist is its own security question).
  - Anchored comments: **OPEN → FIXED (backend capability)**, once the coordinator extended territory
    to `kb-page-comments.service.ts`. Measured first: `kb_page_comments` had no anchor column and
    every read/write was keyed on `pageId`/`commentId` only (BE-90/91 already satisfied via
    `assertCommentPageVisible`, confirmed above). Added nullable `anchor_block_index` and
    `anchor_quote` columns (migration 1216, see below) so a **top-level** comment can point at a
    specific content block; a reply is rejected with 400 if it carries its own anchor
    (`kb-page-comments.service.ts` `create()`) — a reply inherits its thread's anchor rather than
    competing with it. This adds no new resource-id lookup, so it does not expand the BE-90/91
    surface the coordinator flagged — `assertCommentPageVisible`'s existing uniform 404 (verified
    above) still gates every comment operation unchanged. New spec
    `kb-page-comment-anchor.spec.ts`, 4/4 PASS, each of the four assertions individually bite-checked
    (revert → correct failure → restore). **Frontend wiring (rendering an anchor marker next to the
    block, letting the user pick a block when commenting) is not built** — `page-comments-sheet.tsx`,
    `page-comment-thread.tsx` and `hooks/api/kb/page-comments.ts` were not granted to this lane.
    HANDOFF below.
    **Deploy-ordering hazard, flagged prominently because Railway deploys the backend on every
    push:** migration 1216 is authored and NOT applied. `kb-page-comments.service.ts`'s `create()`
    already writes the two new columns. If this service code ships before 1216 is applied to
    production, every comment creation breaks — this is exactly
    `pending-migration-plus-live-call-site-is-a-deploy-landmine`. The migration file's own header
    repeats this warning.
  - Citation blocks: **OPEN → FIXED.** No citation Plate element existed (checked the full plugin
    list — callout/toggle/table/media/mention/page-link, no citation). New `citation` Plate element
    (`CitationElement` in `plate-elements.tsx`, a real block-level element with editable children,
    not void — distinct from the AI-action citation chips SESSION-04 already shipped, which cite the
    page itself for AI output, not an inline editorial citation). Registered in `plate-plugins.ts`,
    insertable via a new "Citation" slash command. Pure display logic (`citationSourceState`,
    `linkPreviewDisplayTitle`, `linkPreviewHasMeta`) extracted into a new dependency-free
    `plate-citation-link-model.ts`, mirroring the existing `plate-list-model.ts` precedent — needed
    because `plate-elements.tsx` transitively imports `platejs/react`, which Jest cannot parse
    (`SyntaxError: Unexpected token 'export'`, confirmed by first trying to test the logic in place).
    New spec `plate-citation-link-model.test.ts`, 11/11 PASS, bite-checked by breaking
    `citationSourceState`'s `hasSource` derivation (3 of 11 correctly failed, reverted, 11/11 again).
- [x] **DONE** — Mobile metadata/comments sheets. `page-document-header.tsx:28-31` wires
  `PageCommentsSheet`, `PageHistorySheet`, `PageMetadataSheet` as `Sheet`-based overlays (responsive
  by construction, shadcn `Sheet`), reachable from the toolbar's "More options" menu at every
  breakpoint (`page-document-toolbar.tsx:165` container has no `hidden`/breakpoint gate — matches
  SESSION-04's `file:line` claim, re-read and confirmed).
- [x] **DONE** — In-memory/server draft; connectivity + save timestamps; field-level conflict
  comparison; retry. `frontend/features/wiki/components/use-page-autosave.ts:24-48` — `isOffline`,
  `savedAt`, `pendingFields` all present; `page-edit-conflict.tsx` renders per-field pending changes.
  Re-ran `use-page-autosave.test.ts`: 23/23 PASS (unmodified, confirms no regression).
- [x] **DONE** — AI actions show sources and produce a preview/diff before applying.
  `frontend/features/wiki/components/kb-page-improve-diff-dialog.tsx` and
  `frontend/components/ai/ai-action-result-citations.test.tsx` both exist and are wired per
  SESSION-04's evidence; spot-checked present on disk, not re-run (outside my owned specs).
- [x] **DONE** — No page body in Web Storage. `page-document-no-storage.test.ts` exists per
  SESSION-04; `lib/org-scoped-storage.tsx` confirmed to touch no storage (context-only, remount by
  `key={scope}`).
- [x] **DONE** — Content writes require expected revision; metadata writes never overwrite content.
  `backend/src/modules/kb/wiki/kb-pages.service.ts:265` — `if (input.content !== undefined)
  values.content = input.content;` — metadata-only updates never touch the content column. Revision
  guard: line 293-295 (`revisionGuard = contentChanged ? input.expectedContentRevision : undefined`),
  enforced in the `WHERE` clause at line 307-314. Re-ran `kb-pages.concurrency.spec.ts`: 12/12 PASS.
- [x] **DONE** — Unauthorized and missing are indistinguishable 404s. Re-verified (not just trusted)
  by reading `kb-pages.service.ts` (every lookup uses `visiblePagePredicate` + a single "Page not
  found" message: lines 180, 225, 309, 437, 444, 460, 509) and `kb-page-comments.service.ts`
  (`assertCommentPageVisible` throws the identical "Comment not found" message a missing comment row
  throws, lines 113/153/201) — an invisible page and a missing comment are the same 404.

**Additional defect found and fixed (inherited from L1 handoff, confirmed in-territory):**
See "Inherited from L1 handoff" section below — `kb-pages.service.ts`'s generic `update()` path.

## S09 — History

- [x] **DONE** — Cursor list with actor, time, change summary; current marker.
  `backend/src/modules/kb/wiki/kb-page-versions.service.ts:49-70` — keyset-cursor `listVersions`,
  capped at `PAGE_SIZE_CAP=100`. `frontend/hooks/api/kb/page-versions.ts:33-52` —
  `useKbPageVersionsInfinite` via `useInfiniteQuery`. Current marker:
  `page-history-page.tsx:217` (`currentVersionNumber = versions[0]?.versionNumber ?? null`),
  badge at line 408-415. Also present in `page-history-sheet.tsx:52,147-151`.
- [x] **DONE** — Select one or two versions; semantic block diff; metadata/content distinction.
  `page-history-page.tsx:198-265` (`selectedA`/`selectedB`/`compareMode`),
  `frontend/features/wiki/lib/version-diff.ts` — LCS-based block diff (`BlockDiff[]`,
  kind added/removed/changed/unchanged), title vs. body distinguished (`titleChanged` separate from
  `blocks`).
- [x] **DONE** — Restore preview + confirmation; deep link to a version; audit entry.
  Preview: `BlockDiffView` at `page-history-page.tsx:353-369`. Confirmation: `ConfirmDialog` at
  lines 572-580. Deep link: `searchParams.get("version"/"compare")` at lines 195-196, `syncUrl` at
  229-235. Audit entry: **verified live in production**, not just in the migration file — see below.
- [x] **DONE** — Restore appends a new version, increments revision, reindexes asynchronously.
  `kb-page-versions.service.ts:126-172` — `snapshotIfNeeded` before and after the restore update,
  `contentRevision: sql\`content_revision + 1\``, `OutboxWriter.emit` inside the transaction
  (outbox pattern for async dispatch after commit).
- [x] **DONE** — Remove unbounded revision load and raw JSON diff. `version-diff.ts` has no
  `wordCountDelta`/`excerpt`/raw-JSON path; `listVersions` is cursor-paginated (above), never a full
  table scan.

**Production verification of the restore-audit migration (1207):** connected via
`createScriptSql()` (IAM-signed, since the plain `DATABASE_URL` token in `.env` had expired —
`28P01`/PAM auth failure on a stale ~15-minute IAM token, resolved by using the IAM-signing helper
instead of a raw `postgres()` client).
- `migrations/1207_kb_version_restore_audit.sql` hash is present in
  `drizzle.__drizzle_migrations` (applied, not just journalled).
- `to_regclass('public.kb_version_restore_audit')` resolves — table exists.
- Grants: `streamline_app` holds `INSERT`/`SELECT`/`UPDATE`/`DELETE` on the table (confirmed via
  `information_schema.role_table_grants`), so the app role can actually write the audit row it
  needs (this is exactly the class of defect flagged in the "21 tbl 0 grant" memory note — checked
  because a table existing is not the same as it being usable under RLS+grants).
- RLS: `migrations/1207_kb_version_restore_audit.sql:51-57` enables RLS with a tenant-scoped
  policy (`org_id = app.current_org_id()`).
- `kb-page-versions.service.ts:154-159` — the `INSERT INTO kb_version_restore_audit` runs inside the
  same transaction as the restore.

**Real defect found and fixed: the SESSION-05 test coverage for the whole file had been silently
deleted.** `frontend/features/wiki/components/page-history-page.test.tsx` was rewritten by the
coordinator's own infinite-scroll conversion (attributed to SESSION-09 in the first pass of this
audit; the coordinator has since corrected that attribution — the overwrite was theirs, made while
converting `page-history-page.tsx` off the "Load more" button) and now contained only 2 tests, both
about the `InfiniteScrollSentinel`. The 11 tests SESSION-05 recorded as "11/11 PASS" — current
marker, compare-mode UI, keyboard accessibility, six page states, deep link — were gone; the
underlying component behavior was still correct (verified by direct source read, all five citations
above), but nothing pinned it against regression — the worst shape for a coverage loss, since
nothing failed.

**FIXED, in full, across two passes.** First pass restored current marker, two-version compare and
deep link. Coordinator asked explicitly which of the remaining tests I judged obsolete versus simply
not yet restored, and to restore keyboard-nav specifically since no other gate reproduces it. Answer:
**none were obsolete** — every original assertion still describes real, present behavior; the rest
were simply not yet written. Second pass restored all of them. `page-history-page.test.tsx` now has
14 tests (was 2), organized to mirror the SESSION-05 evidence list exactly:
- "current version marker" (1) — current-marker badge/aria-label.
- "two-version compare" (2) — entering compare mode, and the two-version diff header.
- "page states" (4) — loading skeletons, error + retry, empty state, "select a version to preview".
- "restore gate" (2) — restore disabled for the current version even with detail loaded, enabled for
  a non-current version.
- "keyboard accessibility" (2) — Enter selects a version without a pointer click; every version
  button carries `type="button"` (the accessible-name half was already covered by the current-marker
  test's `aria-label` assertion).
- "deep link" (1) — `?version=` preselection (pre-existing from the first pass).
- "sentinel" (2) — pre-existing infinite-scroll coverage, untouched.
- Bite-checked six of these individually by reverting the underlying condition to `null`/`false`,
  confirming the expected subset of tests failed, then restoring: the current-marker source
  (3 of 14 failed), the restore-button's `selectedA === currentVersionNumber` clause (1 failed), the
  keyboard handler's key check (1 failed), and the empty-state's `versions.length === 0` branch
  (1 failed). Every revert/restore cycle left the file's `git diff` empty, confirmed with
  `git diff --stat`.
- One authoring bug caught by the bite check itself during the first pass: my first draft of the
  two-version-compare test used a single static `useKbPageVersionDetail` mock return value for both
  `selectedA` and `selectedB` queries, so both sides of the diff showed the same version. Fixed by
  switching to `mockImplementation` keyed on the requested `versionNumber` — a reminder that a test
  can pass vacuously even when it "bites" on an unrelated break.

## Inherited from L1 handoff

Coordinator relayed L1's finding that L1's own fix (in `kb-page-grants.service.ts`, out of my
territory) closed a real gap: grant create/revoke bumped `kb_pages.acl_revision` but never synced
`kb_article_chunks.acl_revision`, and `kb-candidate.service.ts:230` joins on
`eq(kbArticleChunks.aclRevision, kbPages.aclRevision)`, so a stale chunk is fenced out of vector
search/Ask/citations. L1 flagged the same class of bug in `kb-pages.service.ts`'s generic `update()`
path, which **is** in my territory (it is the same method that holds the content-revision guard).

Verified both of L1's claims myself before touching anything, and found the real defect is worse
than a staleness bug — it is a privilege-escalation gap:

- **`buildIndexedBranch`** (`backend/src/modules/kb/core/authorization/knowledge-page-scope.ts:95`)
  grants a member full access to a page for **every** action (view/comment/edit/manage/delete —
  the clause is not gated by `containerGrantsAction`) whenever
  `kbPages.ownerMembershipId = standing.membershipId`.
- **`kb-pages.service.ts`'s `update()`** let `ownerUserId` change (old line 269-284) under nothing
  but the method's blanket `assertPageAccess(user, pageId, "edit")` check. `canManage` was received
  as a parameter but only used for the lock-bypass check, never for `ownerUserId`. **So any user
  holding only `kb:pages:update` (edit-level) could set themselves as a page's owner and thereby
  gain full manage/delete control over that page — a real privilege escalation, not just a search
  visibility gap.**
- `aclChanged` (old line 287) only fired on `spaceId`, so ownership changes never bumped
  `acl_revision` and never fired the `kb.content.index` reindex event — the same staleness class L1
  found in the grants service, confirmed by reading `kb-indexing.service.ts:150-179`: the indexer's
  own `updatePageChunkAcl` resync is gated on `stored.aclRevision !== acl.aclRevision`, so a page
  whose `aclRevision` never moves never gets its chunks resynced.
- No audit log call anywhere in `update()`, confirmed by reading the full method — L1's second claim
  was also accurate.

**FIXED** in `backend/src/modules/kb/wiki/kb-pages.service.ts`:
1. `update()` now throws `ForbiddenException` if `input.ownerUserId !== undefined && !canManage`
   (line 247-251) — closes the escalation.
2. `aclChanged` now includes `ownerChanged = input.ownerUserId !== undefined` (line 296-297) — reuses
   the **existing** `needsReindex`/`OutboxWriter.emit("kb.content.index")` pipeline that `spaceId`
   and `setVisibility()` already use, rather than duplicating L1's private
   `KbPageGrantsService.syncChunkAclRevision` helper. Per the coordinator's instruction ("if it is
   private to the grants service, tell me instead of duplicating it") — **it is private**
   (`kb-page-grants.service.ts:255`), so I did not duplicate it; the standard reindex path already
   does the equivalent resync via `kb-indexing.service.ts:176` (`updatePageChunkAcl`), which is the
   better fix because it's the mechanism every other ACL-relevant field on this table already uses.
3. Ownership changes now write `this.audit.log({ action: "kb.page.owner_changed", ... })`
   (line 384-392) after the transaction commits, matching the `kb-page-grants.service.ts` pattern.
4. `AuditService` added as a constructor dependency (it's `@Global()`, already available). Updated
   the 7 spec files that construct `KbPagesService` positionally to pass a 6th arg — all still pass.

**New spec**: `backend/src/modules/kb/wiki/kb-page-owner-change.spec.ts`, 3/3 PASS:
- rejects a non-manager's ownership change (`ForbiddenException`)
- a manager's ownership change sets `ownerMembershipId`, bumps `acl_revision`, fires the reindex
  event, and calls `audit.log`
- an unrelated field-only update touches none of the above (no false-positive reindexing)

Bite check on all three new assertions, one at a time: reverted the guard to `if (false)`, the
`aclChanged` line to drop `ownerChanged`, and the audit call to `if (false)` — each time exactly the
matching test failed and the other two stayed green; restored each and re-ran clean (54/54 across
all 8 touched backend spec files).

**Not done, flagged for the coordinator:** `kb-page-comments.service.ts`, `kb-media.service.ts` and
other KB services outside my two owned files may have the same `ownerMembershipId`-driven
escalation risk if any of them accept an owner-like field under a lower permission bar — I did not
sweep the whole KB module for this pattern; only `kb-pages.service.ts` was in scope for this
handoff.

## Counts

- S08: 9/9 boxes DONE or FIXED. Read/edit modes, trust header, one action model, mobile sheets,
  autosave/conflict/offline, AI preview+diff, no-Web-Storage, revision safety, and
  unauthorized/missing 404 were already DONE. The editor-features box (slash menu, link preview,
  heading outline, anchored comments, citation blocks) is now fully FIXED: slash menu was already
  DONE; heading outline, link preview and citation blocks are newly built and wired; anchored
  comments has a complete, tested backend capability with frontend UI wiring explicitly named as a
  HANDOFF (out of this lane's granted files).
- S09: 5/5 boxes DONE, plus 1 FIXED (fully restored the deleted test-coverage regression — 14 tests,
  up from 2, covering every box SESSION-05 originally pinned).
- Inherited L1 handoff: 1 FIXED (privilege escalation + acl_revision sync + audit log in
  `kb-pages.service.ts`).
- New territory granted mid-session: 3 FIXED (heading outline, link preview + citation blocks,
  anchored-comments backend), 1 migration authored-not-applied (1216) with an explicit
  deploy-ordering HANDOFF.
- BLOCKED: 0 (no environmental blockers hit anywhere in this audit).

**Single most important defect found:** the privilege escalation in `kb-pages.service.ts`'s
`update()` — any user with only `kb:pages:update` could set `ownerUserId` to themselves and thereby
gain full manage/delete control over that page via `buildIndexedBranch`'s unconditional
`ownerMembershipId` grant, with no audit trail. This was worse than the acl_revision staleness bug
L1 found in the grants service, because it was a real authorization bypass, not just a search
availability gap.

## Handoffs

HANDOFF: `backend/migrations/meta/_journal.json` — owned by ORCHESTRATOR — register
`1216_kb_page_comment_anchor` with the next available `idx` and a strictly-increasing `when`
timestamp, **and apply it to production before** `kb-page-comments.service.ts`'s `create()` reaches
production (Railway deploys the backend on every push). Applying the service code first breaks every
comment creation — see the migration file's own header and the anchored-comments entry above.

HANDOFF: `frontend/features/wiki/components/page-comments-sheet.tsx`,
`page-comment-thread.tsx`, `frontend/hooks/api/kb/page-comments.ts` — not owned by this lane — wire
the new backend anchor capability into the UI: let a user pick a block to anchor a top-level comment
to (the block index from `extractHeadings`-style content walking, or from the editor's current
selection), show an anchor marker next to that block in `page-document.tsx`'s editor, and add
`anchorBlockIndex`/`anchorQuote` to the frontend's `KbPageComment` contract and
`useCreateKbPageComment` mutation input. The backend fully supports this today
(`kb-page-comments.service.ts`, migration 1216) — this is purely frontend wiring once 1216 is live.

HANDOFF: sweep `kb-page-comments.service.ts` (now done — this lane's `create()` never accepted an
owner-like field to begin with, so no escalation risk found there), `kb-media.service.ts` and any
other KB service that accepts an owner/creator-like field, for the same escalation shape just fixed
in `kb-pages.service.ts` (a field that participates in `buildIndexedBranch` being settable under a
permission weaker than `kb:pages:manage`) — `kb-media.service.ts` and the rest of the module were not
swept; only `kb-pages.service.ts` and `kb-page-comments.service.ts` were in scope for this lane.
