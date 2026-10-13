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

## Lane partition

| Lane | Domain | Bugs | Stage |
|---|---|---|---|
| L1 | storage, attachments, project files, ticket page shell | B-013, B-016, B-024, B-030, B-031, B-017, NEW-27, B-020 | OPEN |
| L2 | board rank, list/table ordering, display options, search limits | B-027, B-037, B-028, B-025, B-034, B-035, B-029, B-005, B-036, B-081, B-006 | OPEN |
| L3 | create-issue dialog, ticket activity, comments, timer, a11y, mobile | B-001, B-003, B-004, B-008, B-019, B-060, B-023, B-038, NEW-06 | OPEN |
| L4 | releases, milestones, project updates | B-039, B-065, B-044, B-045, B-048, B-049, B-059, B-066, B-085, B-053, B-068 | OPEN |
| L5 | portfolios, programs, roadmap timeline | B-014, B-015, B-074, B-075, B-069, B-080 | OPEN |
| L6 | project settings, budget, CSV import, create-project wizard | B-007, B-010, B-046, B-002, B-050, B-051, B-052, NEW-11, NEW-26, NEW-10, B-012, B-083 | OPEN |
| L7 | epics, triage, ticket relations, parents, history, sub-issues | B-043, B-047, B-062, B-070, B-041, B-063, B-064, B-071, B-072, B-073, B-079, B-082 | OPEN |
| L8 | approvals, inbox | B-084, B-061, B-056, B-076, B-054, B-055, B-057, B-077, B-040 | OPEN |
| L9 | calendar source, navigation, dead links, org-setup invite | B-011, B-022, B-042, B-033, B-009 | OPEN |

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
| `2000_release_version_unique_per_project` | B-049 | not yet |

## Policy decisions to confirm

Brief rule 6 names B-061, B-063, B-069, B-073 and the permission half of B-084 as
confirm-intended. The recommended behaviour is implemented; the decisions are listed in the
final summary.

| ID | Decision |
|---|---|
| B-061 | Owner may no longer decide another person's approval; only the assigned approver or an active delegate may. |
| B-063 | An epic may be set Done with open linked items, but the confirm dialog states the open count. |
| B-069 | Timeline bars are drag-resizable only where the viewer may edit the item's dates; read-only viewers get a tooltip. |
| B-073 | "Add subtask" accepts an existing ticket key as well as a new title. |
| B-084 | The assigned approver and an active delegate see Decide regardless of Build Admin; Delegate/Escalate/Cancel/Delete stay admin-only. |
