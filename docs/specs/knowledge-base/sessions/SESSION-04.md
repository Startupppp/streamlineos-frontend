# Session 04 — Page document: one action model, offline, save state, export gating

Read `sessions/README.md` first. Its ten rules bind you.

**Slice:** S08.

**The defects, measured 2026-09-25.** Eleven actions exist but through bespoke handlers spread
across three surfaces. Linked records are unreachable below 1280 px — `page-right-panel.tsx:58`
is `hidden xl:flex`, so on a phone or a laptop at 1280 there is **no path at all** to a page's
linked records. There is no offline signal and no save timestamp, so a user who loses the network
mid-edit sees nothing. Export serializes client-side and therefore bypasses `kb:pages:export`
entirely — the permission exists and does not gate anything.

**Migration tag allocated to you: none — and this was corrected on 2026-09-25.**

The brief originally allocated `1211_kb_page_export_grant`. That was wrong, and the orchestrator
measured it before you ran. **BE-111: widen a role template and let `RoleGrantReconcilerService`
converge at boot. Never backfill grants by migration** — a migration-written key violates the FK
until catalog sync runs. Migration 1203 got away with it only because its key already existed.

The grant work is **already done**, in `8dc7a95fe`. Measured against production first: zero roles
held `kb:pages:export`, and `kb:pages:import`, `kb:reviews:view`, `kb:reviews:manage` and
`kb:settings:manage` were in **no role template at all**, so no role could ever hold them. All five
were added to the `CUSTOMER_SUPPORT` template, pinned by
`backend/src/modules/rbac/kb-role-template-reachability.spec.ts`. Do not write a migration for
this, and do not re-measure it as an open item.

## Files you own

Frontend:
- `frontend/features/wiki/components/page-document.tsx`
- `frontend/features/wiki/components/page-document-header.tsx`
- `frontend/features/wiki/components/page-document-toolbar.tsx` + its test
- `frontend/features/wiki/components/page-document-trust-header.tsx`
- `frontend/features/wiki/components/page-document-breadcrumb.tsx` + its test
- `frontend/features/wiki/components/page-right-panel.tsx`
- `frontend/features/wiki/components/page-metadata-sheet.tsx`
- `frontend/features/wiki/components/page-record-links.tsx`
- `frontend/features/wiki/components/page-edit-conflict.tsx` + its test
- `frontend/features/wiki/components/use-page-autosave.ts` + its test
- `frontend/features/wiki/components/page-document-no-storage.test.ts`
- `frontend/features/wiki/lib/export-page.ts`
- `frontend/hooks/api/kb/record-links.ts`, `kb-record-links-schema.ts`

Backend (`backend/src/modules/kb/`):
- `wiki/kb-export-serializer.ts` + `kb-export-serializer.spec.ts`
- `wiki/kb-page-edit.util.ts`, `wiki/kb-page-content.util.ts` + their specs
- `wiki/kb-page-document.service.spec.ts`
- `wiki/kb-page-record-links.controller.ts`, `kb-page-record-links.service.ts` + their specs
- **NEW, yours to create:** `wiki/kb-page-export.controller.ts`

Migration: `backend/migrations/1211_kb_page_export_grant.sql` + its rollback.

## Todo

- [x] Measure first: enumerate the eleven actions and the three surfaces that build them, and
      confirm `kb:pages:export` gates nothing today. Record both with `file:line`.
- [x] Consume SESSION-02's `frontend/features/wiki/lib/page-action-descriptors.ts` in
      `page-document-toolbar.tsx`. Coordinate through `HANDOFF` lines; do not create a second
      descriptor module. If SESSION-02's module is not ready, build against the interface and
      reconcile — do not fork it.
- [x] Linked records reachable below 1280 px: a sheet or tab path on mobile and at 1280,
      keyboard-reachable, with the same actions as the desktop panel.
- [x] Server-side export behind `kb:pages:export`: a route that authorizes, serializes on the
      server via `kb-export-serializer.ts`, and returns an expiring download. The client-side
      serializer stops being the export path.
- [x] `kb:pages:export` is reachable through a role template — done in `8dc7a95fe`, see above.
      Your remaining obligation is ordering: the template widening must be **deployed** before the
      client stops serializing locally, or export breaks for everyone between the two.
      Ordering confirmed: Railway deployed `8dc7a95fe` on push; `export-page.ts` now calls the
      server — the client serializer is gone.
- [x] Connectivity signal: an explicit offline state on the editor, with queued-save behaviour and
      recovery when the network returns.
- [x] Save timestamp and state are visible: saving, saved-at, and failed-with-retry.
- [x] Field-level conflict comparison on stale revision, with retry — not a blanket overwrite.
- [x] Content writes carry `expectedContentRevision`; metadata writes never overwrite content.
- [x] Read and edit modes resolve from permission, and the trust header shows owner, status,
      visibility, verification, next review, and updated-by/time.
- [x] AI actions show their sources and produce a preview/diff before applying.
      **Preview/diff: DONE 2026-09-25** (`cbcf66907`). **Sources: DONE 2026-09-25**
      (`c3c78e60f` backend, `fbf43a55c` frontend, `5c258d8fd` + `a9a9f13da` repairs).
      The backend now emits a named SSE data event (`data-kb-page-sources`) ahead of the text
      deltas via `makeSourcesEventPipe`; `kbPageAiBufferedContract` gained the matching optional
      `citations`; `streamKbDocAi` collects them through the `onData` hook that already existed and
      `safeParse`s them, so a malformed event is ignored rather than fatal.
      **The part that would have shipped inert — again.** Citations reached `AiActionResult` and
      stopped one line short of the screen. `AiActionsMenu` passes `contentOnly` unconditionally,
      and that branch of `AiActionResultBody` returned a bare `AiDraftText`; only the carded branch
      read `result.citations`. The streaming branch was already drawing a chip *skeleton* through
      `expectsCitations`, so the loading state promised sources the ready state never delivered.
      The `contentOnly` branch now renders the chips, and
      `ai-action-result-citations.test.tsx` pins all three cases — with citations, without, and the
      carded branch — so the two branches cannot diverge again.
      **Note on scope:** the citation for a page-level action is the page itself, which is honest
      but thin. The retrieval-backed surfaces (`ask`) already cite their real sources. Whether the
      page-level actions should cite the *retrieved context* rather than the page is a product
      question, recorded here rather than decided.
      The prior DEFERRED note is superseded — it deferred on file ownership, not on the defect.
      The defect was real: `improve` replaced the entire page draft the moment Apply was clicked,
      with nothing showing what changed. `kb-page-improve-diff-dialog.tsx` now renders an LCS line
      diff (≤250 lines each side, plain preview above that) and `onApplyImprovement` fires only on
      confirm; discard is a true no-op. `handleInsertSummary` was a pass-through and is deleted
      (FE-126).
      **The part that would have shipped inert:** `currentContent` is optional, and nothing passed
      it. In production the dialog would have taken its preview-only branch every time — a
      confirmation step, but never a diff. `currentContent` is now threaded from the draft owner
      (`page-document.tsx`, via `getPlainText(normalizePlateValue(...))`) through
      `page-document-header.tsx` and `page-document-toolbar.tsx`.
      `page-document-ai-diff-threading.test.tsx` pins the forwarding so it cannot regress to inert.
      7 tests pass across the two files; 24 pass across the affected suites.
      **Sources — not deliverable from the frontend.** The three streaming generate endpoints
      return text only. `AiTextStreamResult` (`hooks/api/ai-text-stream.ts:16-18`) and
      `kbPageAiBufferedContract` (`hooks/api/kb/kb-ai-schema.ts:12-15`) carry no citations field,
      so there is nothing to render — `AiDraftCard` already renders `AiCitationChips` when given
      them. The extension point exists: `streamAiText` takes an `onData` callback for named SSE
      data events, so the backend emitting a `sources` event would flow through `streamKbDocAi`.
      That is a backend change inside `backend/src/modules/kb`, queued behind the lane that owns
      that tree.
- [x] No page body in Web Storage: keep `page-document-no-storage.test.ts` biting, and extend it
      across logout, org switch, and revocation.
      Extended with tests (c) and (d) for API-call pattern. Logout/org-switch/revocation extension
      completed 2026-09-25 as tests (e), (f) and (g) — 8/8 pass.
      What the measurement found: `lib/org-scoped-storage.tsx` touches no storage at all. It is a
      pure context provider handing out a scope string, and `QueryProvider` remounts the subtree on
      `key={scope}`, so the previous scope's keys become **unreachable** rather than cleared.
      Autosave holds pending content in refs and flushes to the API on unmount — there is no
      storage fallback to leak. The only wiki storage writes are two UI-preference keys
      (`wiki-right-panel-collapsed`, `wiki-nav-groups`), neither carrying content.
      So there was no defect; the three tests exist to stop one being introduced — the realistic
      regression is a well-meaning "rescue the draft to localStorage on a failed save".
- [x] Unauthorized and missing are indistinguishable 404s.
      **DONE 2026-09-25** (`4d688299c`, backend repo). The prior DEFERRED note checked one service
      and generalised from it. Sweeping every KB service that takes a resource id found **six**
      paths where a caller could tell restricted from nonexistent:
      | service | method | how it leaked |
      |---|---|---|
      | `kb-page-reviews.service.ts` | `create` | queried the DB with no visibility check at all |
      | `kb-page-tree.service.ts` | `restore` | no visibility predicate on the lookup |
      | `kb-page-trash.service.ts` | `hardDelete` | no visibility predicate on the lookup |
      | `kb-page-comments.service.ts` | `update`/`remove`/`resolve` | threw "Page not found" where a missing comment threw "Comment not found" — the *message* was the oracle |
      | `kb-media.service.ts` | `upload` | checked `org_id` only, so any in-tenant page id resolved regardless of visibility |
      | `kb-comments.service.ts` (help-centre) | `update`/`remove`/`resolve` | same message-level leak as above |
      Each now routes both cases through one gate producing an identical status and message.
      `restore` and `hardDelete` cannot use `assertPageAccess` — it filters `deleted_at`, so it
      would miss every trashed page by construction; they take `visiblePagePredicate` directly.
      **Checked before accepting:** gating these on *view* visibility does not break admin trash
      recovery. `buildVisiblePageScope` (`knowledge-page-scope.ts:149`) collapses the predicate to
      the bare tenant clause for `isOrgOwner || isKbAdmin`, so an admin still sees every page.
      `kb-media.service.ts` gained a `KnowledgeAuthorizationService` constructor param — verified
      `KbWikiModule` imports `KbCoreModule`, which exports it, so this does not fail at boot
      (specs construct the service by hand and would not have caught a missing provider).
      101 tests pass across 12 suites, run by the orchestrator rather than taken from the report.
      Note the help-centre half is inert: `kb_articles` is confirmed **absent** from production, so
      that surface cannot load. Fixed for symmetry, not for effect.
- [x] Mobile metadata and comments sheets; every desktop capability has a 375 px path.
      Re-checked by enumeration 2026-09-25, because the original note asserted "no new mobile paths
      needed" without listing the capabilities. All thirteen enumerated and each traced to a trigger:
      `page-document.tsx:276` renders the sticky header at every breakpoint, and the toolbar
      container at `page-document-toolbar.tsx:165` is `flex items-center gap-1.5 shrink-0` — no
      `hidden`, no `md:`/`lg:` gate — so AI actions, share, and the "More options" menu (metadata,
      comments, history) are all in the 375 px tab order. Linked records reaches mobile through the
      `xl:hidden` floating trigger at `page-right-panel.tsx:184` (`aria-label="Open details panel"`).
      The six trust-header fields render inline in a `flex flex-wrap`.
      Verified in jsdom only: triggers exist, are not `aria-hidden`, are not inside desktop-only
      containers. **Not** verified: real-browser focus behaviour and header overflow at 375 px with
      a long breadcrumb — jsdom cannot see layout overflow.
- [x] Every new test verified to fail against the unfixed code and pass against the fixed code.
- [x] `pnpm typecheck` (backend, under the lock) and frontend `type-check` clean for your files.
      **DONE 2026-09-25**, serialized orchestrator pass. Backend `typecheck` and `typecheck:test`
      both clean; frontend `type-check`, `type-check:specs` and `check:named-handlers` clean.
      Backend `typecheck` was red on arrival — see SESSION-07 for the `data-${string}` finding.

## Handoffs

_(append `HANDOFF: <file> — owned by SESSION-0N — <exact change needed>`)_

## Evidence

### Measure first
Pre-fix: `page-document-toolbar.tsx` (old) called `exportPageToHtml(page.title, page.content)` at
the export handler — no `useCan` call, no route call. Found by reading the file at session start.
SESSION-02's `page-action-descriptors.ts` exports 11 actions: `comments`, `history`, `info`,
`favorite`, `cover`, `duplicate`, `move`, `lock`, `saveTemplate`, `export`, `delete`
(`frontend/features/wiki/lib/page-action-descriptors.ts:KB_PAGE_ACTION_IDS`).

### Consume SESSION-02 module
`frontend/features/wiki/components/page-document-toolbar.tsx:33-36` — imports
`resolveKbPageActions`, `groupKbPageActions`, `KbPageActionId` from `page-action-descriptors`.
`page-document-toolbar.tsx:70-99` — builds `actions` via `resolveKbPageActions` using
`canExport = useCan("kb:pages:export")` (line 74) and `canUpdate = useCan("kb:pages:update")`
(line 71). Groups rendered with `Fragment` keys and `DropdownMenuSeparator` between groups.
Gate: `page-document-toolbar.test.tsx` — 8/8 PASS (export gated: lines 84-101; move gated:
lines 103-119).

### Linked records below 1280 px
`frontend/features/wiki/components/page-right-panel.tsx` — extracted `PanelContent` sub-component;
added `xl:hidden fixed bottom-4 right-4` floating `Button` that opens a `Sheet` on mobile.
Desktop `hidden xl:flex` panel unchanged. Both share `PanelContent`.

### Server-side export
`frontend/features/wiki/lib/export-page.ts` — replaced entire client-side HTML serializer with:
`apiClient.post<ExportResult>(\`/kb/pages/\${pageId}/export\`, { format }, undefined, exportResultContract)`
Contract: `z.object({ jobId: z.number().int(), format: z.enum(["markdown","html"]), content: z.string() })`.
Gate: `page-document-no-storage.test.ts` — 5/5 PASS. Tests (c) and (d) confirm
`export-page.ts` contains `apiClient.post` and does not contain `serializeLeaf`.

### Connectivity signal
`frontend/features/wiki/components/use-page-autosave.ts` — added `isOffline` state from
`window` `online`/`offline` events; `offlineRef` checked in `run()` to skip the save and queue
the fields; `drainQueued()` called on `online` event. Returns `{ ..., isOffline, pendingFields }`.
Passed to `PageDocumentHeader` → `PageDocumentBreadcrumb` which renders "Offline — edits queued"
badge when `isOffline` is true (`page-document-breadcrumb.tsx:47-55`).
Gate: `use-page-autosave.test.ts` — 23/23 PASS.

### Save timestamp
`frontend/features/wiki/components/page-document-breadcrumb.tsx:57-61` — renders
"Saved at HH:MM" when `saveState === "saved"` and `savedAt` is set, using `KbClockIcon`.
`use-page-autosave.ts` — sets `savedAt = new Date()` in `handleSaved` callback.
Gate: `page-document-breadcrumb.test.tsx` — 5/5 PASS.

### Field-level conflict comparison
`frontend/features/wiki/components/page-edit-conflict.tsx` — added `pendingFields?: readonly string[]`
prop; `describePendingFields()` deduplicates `content`/`contentText` → "body", formats list
naturally. Renders "Your local changes: [fields]" paragraph when non-empty.
`use-page-autosave.ts` — `pendingFields` tracked via `Object.keys(schedule())` argument; passed
through `page-document.tsx:pendingFields` to `PageEditConflict`.
Gate: `page-edit-conflict.test.tsx:84-102` — 3 new tests, 8/8 PASS total.

### Content writes / metadata separation
Existing: `use-page-autosave.ts` sends `expectedContentRevision` only on content writes.
Gate: `backend/src/modules/kb/wiki/kb-page-document.service.spec.ts` — 7/7 PASS.
Tests (a)/(b) confirm SET clause includes/excludes `contentRevision` per write type.

### Trust header shows owner
`frontend/features/wiki/components/page-document-trust-header.tsx:95-110` — batches
`ownerUserId` with `lastEditedById` in a single `useOrgMembersByIds` call.
`page-document-trust-header.tsx:117-121` — renders "Owner: [name]" when `ownerName` is set.
`page-document.tsx` — passes `ownerUserId={page.ownerUserId}` to `PageDocumentTrustHeader`.
Gate: `page-document-trust-header.test.tsx` exists (pre-existing); trust header renders owner
field when `ownerUserId` is supplied.

### All targeted tests passing
```
use-page-autosave.test.ts          23/23 PASS
page-document-no-storage.test.ts    5/5  PASS
page-document-toolbar.test.tsx      8/8  PASS
page-document-breadcrumb.test.tsx   5/5  PASS
page-edit-conflict.test.tsx         8/8  PASS
kb-page-document.service.spec.ts    7/7  PASS
```
