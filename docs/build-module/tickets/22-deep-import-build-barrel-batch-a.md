# 22 — Deep-import the Build hooks barrel, batch A (page-level modules)

**What to build:** Build page-level modules import the specific hook module rather than the Build hooks barrel, which re-exports 40 modules spanning incidents, QA, forms, client portal, agent tokens and more. 99 Build files name that barrel today; this batch covers the page-level modules, which are the ones whose module graph matters most.

Split across two tickets deliberately: the blast radius is wide enough that one change touching all 99 files would be hard to review and would collide with concurrent work in a shared tree.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] Every Build page-level module imports hooks by their owning module
  Deferred: `frontend/features/build/epics/epics-page.tsx` lines 5–15 (other lane owns this file — not edited). Exact imports: `useProject, useUpdateTicket, useDeleteTicket, useCreateTicket, useProjectBoardTickets, useBulkUpdateTickets, useCycles, useProjectMembers` from `@/hooks/api/build`; and `type BulkUpdateTicketsInput` from `@/hooks/api/build`.
- [x] The barrel itself is untouched and still works for remaining callers
- [x] No behaviour or rendering changes
- [x] The remaining callers are recorded so batch B has an exact list
  Remaining barrel importers (all non-deferred callers are now fixed; these are deferred or test-only):
  - `frontend/features/build/epics/epics-page.tsx` (deferred — other lane)
  - `frontend/features/build/cycles/cycle-form-sheet.test.tsx`
  - `frontend/features/build/cycles/cycles-page.test.tsx`
  - `frontend/features/build/epics/epics-page-bulk.test.tsx`
  - `frontend/features/build/epics/epics-page.test.tsx`
  - `frontend/features/build/forms/components/form-submissions-tab.test.tsx`
  - `frontend/features/build/forms/form-detail-page.test.tsx`
  - `frontend/features/build/forms/forms-list-page.test.tsx`
  - `frontend/features/build/intake/intake-page.test.tsx`
  - `frontend/features/build/meetings/meeting-detail-page.test.tsx`
  - `frontend/features/build/meetings/meetings-list-page.test.tsx`
  - `frontend/features/build/milestones/project-milestones-page.test.tsx`
  - `frontend/features/build/modules/modules-page-url.test.tsx`
  - `frontend/features/build/modules/modules-page.test.tsx`
  - `frontend/features/build/templates/build-templates-page.test.tsx`
  - `frontend/features/build/ticket-details/ticket-relations.test.tsx`
  - `frontend/features/build/whiteboard/public-board-token-redaction.test.tsx`
  - `frontend/features/build/whiteboard/public-board-view.test.tsx`
