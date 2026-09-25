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

- [ ] Measure first: enumerate the eleven actions and the three surfaces that build them, and
      confirm `kb:pages:export` gates nothing today. Record both with `file:line`.
- [ ] Consume SESSION-02's `frontend/features/wiki/lib/page-action-descriptors.ts` in
      `page-document-toolbar.tsx`. Coordinate through `HANDOFF` lines; do not create a second
      descriptor module. If SESSION-02's module is not ready, build against the interface and
      reconcile — do not fork it.
- [ ] Linked records reachable below 1280 px: a sheet or tab path on mobile and at 1280,
      keyboard-reachable, with the same actions as the desktop panel.
- [ ] Server-side export behind `kb:pages:export`: a route that authorizes, serializes on the
      server via `kb-export-serializer.ts`, and returns an expiring download. The client-side
      serializer stops being the export path.
- [x] `kb:pages:export` is reachable through a role template — done in `8dc7a95fe`, see above.
      Your remaining obligation is ordering: the template widening must be **deployed** before the
      client stops serializing locally, or export breaks for everyone between the two.
- [ ] Connectivity signal: an explicit offline state on the editor, with queued-save behaviour and
      recovery when the network returns.
- [ ] Save timestamp and state are visible: saving, saved-at, and failed-with-retry.
- [ ] Field-level conflict comparison on stale revision, with retry — not a blanket overwrite.
- [ ] Content writes carry `expectedContentRevision`; metadata writes never overwrite content.
- [ ] Read and edit modes resolve from permission, and the trust header shows owner, status,
      visibility, verification, next review, and updated-by/time.
- [ ] AI actions show their sources and produce a preview/diff before applying.
- [ ] No page body in Web Storage: keep `page-document-no-storage.test.ts` biting, and extend it
      across logout, org switch, and revocation.
- [ ] Unauthorized and missing are indistinguishable 404s.
- [ ] Mobile metadata and comments sheets; every desktop capability has a 375 px path.
- [ ] Every new test verified to fail against the unfixed code and pass against the fixed code.
- [ ] `pnpm typecheck` (backend, under the lock) and frontend `type-check` clean for your files.

## Handoffs

_(append `HANDOFF: <file> — owned by SESSION-0N — <exact change needed>`)_

## Evidence

_(record command output and file:line here as you close each box)_
