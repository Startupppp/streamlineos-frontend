# QA run build-2026-10-13 — fix program ledger

Source of truth for the work: `CLAUDE-FIX-BRIEF.md` at the repository root (83 bug IDs).
This file is the resume point: lane partition, per-lane bug lists, and stage.

Stage legend: `OPEN` · `RUNNING` · `CODE DONE` (code + tests landed, gates green) ·
`PENDING_BROWSER_VERIFICATION` (only a live browser check remains) · `BLOCKED`.

## Shared foundations

| Thing | Where | Owner |
|---|---|---|
| G1 in-flight submit guard | `frontend/hooks/common/use-submit-guard.ts` (+ `.test.ts`) | coordinator — done |
| G1 idempotency key per attempt | `frontend/hooks/common/use-idempotent-operation.ts` (pre-existing) | reuse, do not fork |
| G4 shared field rules | `frontend/lib/validation/projects.ts` | shared-append file |
| G8 error text | `frontend/lib/get-error-message.ts` (pre-existing, FE-76) | reuse, do not fork |

Shared-append files may be edited by more than one lane, but only by **adding** an export
or amending the one rule a lane owns. Never rewrite the file wholesale.

## Baseline and the no-regression bar

Pre-session commits, for telling a pre-existing failure from one this program caused:
frontend/root `0919e7014`, backend `caf249b2a`. Never call a failure pre-existing without
comparing against those — read the baseline file with `git show <sha>:<path>`, or build a
throwaway worktree. Never `git stash`: a peer session's tracked edits live in this tree.

Known-red before this program started (from the 2026-10-12 run, re-confirm before
blaming them): `ticket-detail-errors.test.tsx` (2), `use-ticket-comment-composer.test.tsx`
(1, flaky real timers), `ask-os-chat-view.test.tsx` (4, confirmable-AI), 
`board-cursor-param.test.tsx` (1), `projects-page-empty.test.tsx` (1), and the four
chat-assistant suites that need a provider key.

Exit criteria for every lane: it runs the **existing** test files that cover each source
file it changed — not only the tests it wrote — and reports each as pass/fail. A test that
fails because the lane deliberately changed behaviour is updated in the same change and
called out; a test that fails for any other reason means the lane's change is wrong.

Coordinator gates before any push: `pnpm type-check`, `pnpm type-check:specs`,
`pnpm lint`, the Build-module suites, and the brief's section 4 regression checklist.

## Scope: quality, not just the bug

The user widened the scope on 2026-10-14, overriding brief rule 2 ("smallest correct
change"). Every lane leaves the files it touches **compliant**, fixing what is wrong or
missing in architecture, reusability, readability, maintainability, cleanliness,
efficiency and caching. The standard is the two CLAUDE.md files, not taste:

- caching and data flow — FE-133, FE-35, FE-24, FE-25, FE-26, FE-34, FE-18, FE-127
- reuse — FE-58, FE-59, FE-60, FE-126, FE-135, FE-140, FE-74
- cleanliness — FE-134, FE-57, FE-114, FE-137, FE-138, FE-139
- forms and errors — FE-73, FE-75, FE-76, FE-78, FE-79, FE-80, FE-83
- backend — BE-05, no N+1, an index that serves the predicate, a contract matching the
  client field for field

Two boundaries keep it from becoming an uncontrolled rewrite:
1. A lane fixes what is in **its own territory**. A defect in another lane's file, or a
   cross-cutting redesign, is reported under ARCHITECTURE FINDINGS — the coordinator
   assigns it. This preserves the no-collision rule.
2. Any behaviour change beyond the bug is named in the lane report and covered by a test
   that was actually run. No drive-by changes to visible text, labels or response shapes
   (FE-129).

Unchanged: no code comments, no gate or ratchet weakened to pass (FE-136), no `any` /
`as X` / `@ts-ignore`, no new markdown files.

## Lane partition

| Lane | Domain | Bugs | Stage |
|---|---|---|---|
| L1 | storage, attachments, project files, ticket page shell | B-013, B-016, B-024, B-030, B-031, B-017, NEW-27, B-020 | RUNNING |
| L2 | board rank, list/table ordering, display options, search limits | B-027, B-037, B-028, B-025, B-034, B-035, B-029, B-005, B-036, B-081, B-006 | RUNNING |
| L3 | create-issue dialog, ticket activity, comments, timer, a11y, mobile | B-001, B-003, B-004, B-008, B-019, B-060, B-023, B-038, NEW-06 | CODE DONE |
| L4 | releases, milestones, project updates | B-039, B-065, B-044, B-045, B-048, B-049, B-059, B-066, B-085, B-053, B-068 | CODE DONE |
| L5 | portfolios, programs, roadmap timeline | B-014, B-015, B-074, B-075, B-069, B-080 | CODE DONE |
| L6 | project settings, budget, CSV import, create-project wizard | B-007, B-010, B-046, B-002, B-050, B-051, B-052, NEW-11, NEW-26, NEW-10, B-012, B-083 | CODE DONE |
| L7 | epics, triage, ticket relations, parents, history, sub-issues | B-043, B-047, B-062, B-070, B-041, B-063, B-064, B-071, B-072, B-073, B-079, B-082 | RUNNING |
| L8 | approvals, inbox | B-084, B-061, B-056, B-076, B-054, B-055, B-057, B-077, B-040 | RUNNING |
| L9 | calendar source, navigation, dead links, org-setup invite | B-011, B-022, B-042, B-033, B-009 | RUNNING |

## Territory

Contested directories are split by file. A lane that needs a file outside its territory
reports it instead of editing it.

**`frontend/features/build/ticket-details/`**
- L1: `attachment-image.tsx`, `ticket-detail-main-section.tsx`, `ticket-detail-page.tsx`, `ticket-detail-guards.tsx`
- L3: `activity-feed.tsx`, `use-activity-feed.ts`, `comment-*.tsx`, `ticket-time-tracker.tsx`, `ticket-sidebar*.tsx`, `sidebar-*.tsx`, `ticket-date-fields.tsx`, `ticket-customer-picker.tsx`, `ticket-custom-fields.tsx`, `ticket-detail-pane.tsx`, `ticket-detail-right-panel.tsx`, `ticket-detail-skeleton.tsx`, `ticket-detail-toolbar.tsx`, `ticket-panel-inner.tsx`, `ticket-detail-actions.tsx`
- L7: `ticket-relations.tsx`, `related-ticket-card.tsx`, `remove-relation-button.tsx`, `ticket-parent-control.tsx`, `ticket-parent-link.tsx`, `subtask-*.tsx`, `ticket-subtasks.tsx`, `ticket-related-links.tsx`, `ticket-activity-log.tsx`, `checklist*`

**`frontend/features/build/tickets/`** — L3 owns the create dialog; L1 owns
`ticket-attachment-preview.tsx` and `use-ticket-file-drop.ts`; L7 owns
`ticket-related-links-editor.tsx`.

**`frontend/features/build/views/`** — L2 only.

**Off limits to every lane** (a peer session is editing them):
`frontend/features/build/overview/**`, `frontend/hooks/api/__tests__/calendar-event-id.test.ts`,
`frontend/playwright-intercepted.config.ts`, `docs/specs/calendar/release-evidence.md`.

## Migrations

Lanes write the migration file and its journal entry but never run it. The coordinator
applies to production (authorized for this program).

| Migration | For | Applied |
|---|---|---|
| `2021_release_version_unique_per_project` (idx 1291) | B-049 | yes — proven on a `prodshape` clone, then applied to Neon production; index and ledger row verified. 2022-2025 / idx 1292-1295 stay reserved. |

## Policy decisions to confirm

Brief rule 6 names B-061, B-063, B-069, B-073 and the permission half of B-084 as
confirm-intended. The recommended behaviour is implemented; the decisions are listed in the
final summary.

| ID | Decision |
|---|---|
| B-061 | Owner may no longer decide another person's approval; only the assigned approver or an active delegate may. |
| B-063 | An epic may be set Done with open linked items, but the confirm dialog states the open count. |
| B-069 | Bars stay click-only with a tooltip and a drag no longer opens the ticket — the brief's own recommended fix. Drag-to-reschedule was deliberately NOT built; the timeline has no drag support to wire up. |
| B-073 | "Add subtask" accepts an existing ticket key as well as a new title. |
| B-084 | The assigned approver and an active delegate see Decide regardless of Build Admin; Delegate/Escalate/Cancel/Delete stay admin-only. |
