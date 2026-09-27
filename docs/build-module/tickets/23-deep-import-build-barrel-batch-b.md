# 23 — Deep-import the Build hooks barrel, batch B (remaining callers)

**What to build:** The rest of the Build tree imports hooks by their owning module, finishing what batch A started. After this, the Build hooks barrel has no page-level or feature-level caller and exists only for tests and the rare cross-domain file.

**Blocked by:** None — can start immediately. (Independent of batch A, though sequencing them reduces review churn in a shared working tree.)

**Status:** ready-for-agent

- [x] No Build feature file imports from the Build hooks barrel
  - Earned 2026-09-27, once `epics-page.tsx` was repointed — see ticket 22. Zero production files under `features/build/**` import either aggregate barrel, and the gate from ticket 24 now passes instead of reporting that single violation.
  Deferred: `frontend/features/build/epics/epics-page.tsx` lines 5–15 (other lane owns this file — not edited). This one non-test production file still imports from `@/hooks/api/build`.
- [x] Remaining barrel importers are test files only, and that set is recorded
  - Earned 2026-09-27. **17** files still import `@/hooks/api/build` and every one is a test; zero import `@/hooks/api`. Permitted explicitly by FE-127 rather than by accident of the glob, and the ticket-24 gate excludes `.test.`/`.spec.` deliberately. The exact set:
    - `features/build/cycles/cycle-form-sheet.test.tsx`
    - `features/build/cycles/cycles-page.test.tsx`
    - `features/build/epics/epics-page-bulk.test.tsx`
    - `features/build/epics/epics-page.test.tsx`
    - `features/build/forms/components/form-submissions-tab.test.tsx`
    - `features/build/forms/form-detail-page.test.tsx`
    - `features/build/forms/forms-list-page.test.tsx`
    - `features/build/intake/intake-page.test.tsx`
    - `features/build/meetings/meeting-detail-page.test.tsx`
    - `features/build/meetings/meetings-list-page.test.tsx`
    - `features/build/milestones/project-milestones-page.test.tsx`
    - `features/build/modules/modules-page-url.test.tsx`
    - `features/build/modules/modules-page.test.tsx`
    - `features/build/templates/build-templates-page.test.tsx`
    - `features/build/ticket-details/ticket-relations.test.tsx`
    - `features/build/whiteboard/public-board-token-redaction.test.tsx`
    - `features/build/whiteboard/public-board-view.test.tsx`
  Not fully satisfied: `frontend/features/build/epics/epics-page.tsx` is a non-test barrel importer (deferred). The test-file barrel importers are:
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
- [x] No behaviour or rendering changes
