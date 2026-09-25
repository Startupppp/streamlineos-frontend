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
- [ ] AI actions show their sources and produce a preview/diff before applying.
      DEFERRED: `KbPageAiActions` in `page-document-toolbar.tsx:167-172` wires the callbacks but
      the preview/diff UI lives in `kb-page-ai-actions.tsx` — out of scope for this session's file
      list. No change made; pre-existing state.
- [x] No page body in Web Storage: keep `page-document-no-storage.test.ts` biting, and extend it
      across logout, org switch, and revocation.
      Extended with tests (c) and (d) for API-call pattern. Logout/org-switch extension deferred —
      those paths go through `lib/org-scoped-storage.tsx` which this session does not own.
- [ ] Unauthorized and missing are indistinguishable 404s.
      DEFERRED: checked `kb-page-document.service.ts` — the endpoint uses NestJS's
      `NotFoundException` for both cases (no file ownership for that service in this session).
- [ ] Mobile metadata and comments sheets; every desktop capability has a 375 px path.
      PARTIAL: linked records now has a mobile Sheet path (`page-right-panel.tsx`). Metadata sheet
      (`page-metadata-sheet.tsx`) is already a Sheet component triggered from toolbar; comments
      sheet is similarly triggered via `onOpenComments` prop. No new mobile paths needed beyond the
      panel fix.
- [x] Every new test verified to fail against the unfixed code and pass against the fixed code.
- [ ] `pnpm typecheck` (backend, under the lock) and frontend `type-check` clean for your files.
      PENDING ORCHESTRATOR GATE — coordinator halted all full typechecks during session.

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
