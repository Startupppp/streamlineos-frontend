# 22 — Deep-import the Build hooks barrel, batch A (page-level modules)

**What to build:** Build page-level modules import the specific hook module rather than the Build hooks barrel, which re-exports 40 modules spanning incidents, QA, forms, client portal, agent tokens and more. 99 Build files name that barrel today; this batch covers the page-level modules, which are the ones whose module graph matters most.

Split across two tickets deliberately: the blast radius is wide enough that one change touching all 99 files would be hard to review and would collide with concurrent work in a shared tree.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [x] Every Build page-level module imports hooks by their owning module
  - Earned 2026-09-27. The lane deferred `features/build/epics/epics-page.tsx` because it believed another lane owned the file; by the time the batch finished, no lane did, so the orchestrator repointed it. Its eight hooks and one type now come from the six modules that own them: `projects`, `ticket-update-mutation`, `ticket-create-rank-mutations`, `ticket-queries`, `advanced` and `project-members`.
  Repointing it broke 13 tests, which is the part worth recording. `epics-page.test.tsx` and `epics-page-bulk.test.tsx` both `jest.mock("@/hooks/api/build")` — the barrel — so deep imports in the component bypassed the mock entirely and the real `useProject` ran against `apiClient`. Both files now mock the six owning modules instead. 18 tests pass. A barrel mock is invisible to a grep for barrel *imports*, so this class of breakage does not show up in the audit that motivated the ticket — only in running the tests.
  Verified: `grep` for `from "@/hooks/api"` or `from "@/hooks/api/build"` across `features/build/**`, excluding `.test.`/`.spec.`, returns **zero** production files.
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
