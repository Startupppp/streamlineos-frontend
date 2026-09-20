# BLD-05A — Build Form and Mutation Surface Matrix

> Acceptance reference only. Dispatch and status live in
> [`Build execution`](../README.md); do not assign
> or tick a checkbox in this file directly.

## Purpose

This is the current-source census for BLD-05. Every production create, edit,
import, bulk, builder, settings, and destructive surface must remain represented
here until it is removed or migrated. Paths are relative to
`frontend/features/build/` unless stated otherwise.

## Save Models

- **Explicit:** Save/Submit is disabled while pending and uses dirty-state
  registration until success.
- **Autosave:** versioned save exposes saving, saved, offline, error, conflict,
  and local recovery.
- **Immediate:** one atomic mutation with rollback; it does not maintain a
  partially edited local form.
- A surface cannot be marked covered merely because a parent navigation guard
  exists.

## Current Surface Census

| Family | Current production surface | Frontend schema owner | API schema owner · durable owner | Current save/dirty state |
|---|---|---|---|
| Project create | `project-create/project-create-wizard.tsx` | `project-create/project-create-schema.ts` | `core/dto/project-core.schemas.ts` · `build/core.ts` | Explicit · registered |
| Project edit | `project-list/edit-project-sheet.tsx` | `project-list/edit-project-schema.ts` | `project-core.schemas.ts` · `projects` | Explicit · missing |
| Project settings | `settings/project-settings-page.tsx` | current shared validation must move to Build owner | `project-core.schemas.ts` · `projects` and section tables | Explicit · registered |
| Workspace create/edit | `pm-workspaces/pm-workspace-form-sheet.tsx` | Inline, migrate to owned schema | `pm-workspaces/dto/pm-workspaces.schemas.ts` · `pm-workspaces.ts` | Explicit · missing |
| Managed Product create/edit | `managed-products/managed-product-form-sheet.tsx` | Inline, migrate to owned schema | `managed-products/dto/managed-products.schemas.ts` · `managed-products.ts` | Explicit · registered |
| Ticket rich create | `tickets/create-ticket-dialog.tsx` | current shared validation must move to `tickets/*-schema.ts` | `core/dto/ticket.schemas.ts` · `ticket-core.ts` | Explicit · missing; move to sheet |
| Global ticket create | `tickets/global-create-ticket-dialog.tsx` | Must reuse ticket create owner | Same as ticket create | Explicit · missing |
| Ticket detail edit | `ticket-details/use-ticket-detail.ts` and field controls | No single form schema | `ticket.schemas.ts` · `ticket-core.ts` | Autosave · conflict/exit incomplete |
| Ticket inline edit | `views/sidebar-select-fields.tsx` and view cells | No single registry | `ticket.schemas.ts` · `ticket-core.ts` | Immediate · rollback proof required |
| Ticket move/rank | `views/use-kanban-drag.ts` | N/A | rank/update schemas · ticket rank/status | Immediate · current Hide-done defect |
| Ticket import | No frontend surface | Missing | `ticket.schemas.ts` import endpoint · tickets | Missing UI and dry run |
| Ticket bulk | `all-work/use-all-work-bulk.ts`, `backlog/bulk-action-bar.tsx` | Request shape only | `ticket.schemas.ts` bulk · tickets | Immediate · partial failure incomplete |
| Sprint create/edit | `sprints/create-sprint-dialog.tsx`, `edit-sprint-dialog.tsx` | `sprints/sprint-schema.ts` | `execution/dto/iterations.schemas.ts` · current Sprint storage | Explicit · missing; migrate to Cycle |
| Sprint completion | `sprints/complete-sprint-sheet.tsx` | Owned completion schema required | iteration completion schema · current Sprint storage | Explicit · missing; hard-coded DONE |
| Cycle create/edit | `cycles/cycles-page.tsx` | Missing owned schema | `iterations.schemas.ts` · Cycle storage | Explicit · missing |
| Module | `modules/modules-page.tsx` | `modules/create-module-schema.ts` | `iterations.schemas.ts` · modules | Explicit · missing |
| Epic create/edit | `epics/create-epic-dialog.tsx`, `edit-epic-dialog.tsx` | Duplicate inline schemas | `iterations.schemas.ts` · canonical tickets | Explicit · missing |
| Milestone | `milestones/milestone-upsert-sheet.tsx` | Inline | `core/dto/roadmap.schemas.ts` · roadmap owner | Explicit · missing |
| Release | `releases/release-form-sheet.tsx` | Inline | `core/dto/project-state.schemas.ts` · release owner | Explicit · missing |
| Project update | `updates/updates-page.tsx`, `updates/update-form-fields.tsx` | Inline page schema must move beside feature | `updates/dto/updates.schemas.ts` · project updates | Explicit · registered only in form fields |
| Goal/KR/check-in | `goals/goal-form-sheet.tsx`, `check-in-dialog.tsx`, `add-link-dialog.tsx` | `goals/goal-form-schema.ts` covers only part | Goals DTOs · Goals schema | Explicit/immediate · missing |
| Risk | `governance/risk-form-sheet.tsx` | Inline | `governance/dto/governance.schemas.ts` · governance | Explicit · missing |
| Decision | `governance/decision-form-sheet.tsx` | Inline | `governance.schemas.ts` · project decisions | Explicit · missing |
| Change request | `change-requests/change-request-sheet.tsx` | Inline | `client-portal/dto/change-requests.schemas.ts` · change requests | Explicit · missing |
| Incident | `incidents/incident-sheet.tsx`, `incident-timeline.tsx` | Inline | `incidents/dto/incidents.schemas.ts` · incidents/events | Explicit/immediate · missing |
| Meeting/action item | `meetings/meeting-form-sheet.tsx`, `action-item-form-sheet.tsx`, `meeting-notes-section.tsx` | `meetings/meeting-form-schema.ts` is partial | Meeting DTOs · meetings/actions | Explicit/autosave · notes registered only |
| QA case/run/result | `qa/test-case-sheet.tsx`, `test-run-sheet.tsx`, `runs/run-execution-page.tsx` | Inline | `qa/dto/qa.schemas.ts` · QA | Explicit/execution · missing |
| Intake | `intake/intake-page.tsx` | `intake/intake-schema.ts` plus inline decline schema | intake DTOs · intake | Explicit · missing; accept drops fields |
| Form builder | `forms/form-detail-page.tsx`, `forms/components/form-builder-tab.tsx` | Submission schema does not own builder | `forms/dto/forms.schemas.ts` · forms | Explicit/builder · missing |
| Form submission triage | `forms/components/form-submissions-tab.tsx` | Missing mapping schema | submission update schema · submissions | Immediate · classification/merge absent |
| Automation | `automations/automation-sheet.tsx` | `automations/automation-schema.ts` | `core/dto/automation.schemas.ts` · automation/runs | Explicit · missing |
| Webhook | `webhooks/project-webhooks-page.tsx` | `webhooks/webhook-schema.ts` | webhook DTOs · webhooks/deliveries | Explicit · missing |
| Git integration | `settings/git-integration-settings.tsx` | `settings/git-connection-schema.ts` | integration DTOs · integration connection | Explicit/provider flow · missing |
| Custom field | `settings/custom-fields-settings.tsx` | Inline | custom-field DTOs · custom fields/values | Explicit · missing |
| Status/workflow | `settings/statuses-settings.tsx`, `workflow/transition-form-sheet.tsx` | Inline/manual validation | workflow DTOs · status/transitions | Explicit · missing |
| Template | `templates/create-template-sheet.tsx`, `apply-template-dialog.tsx` | Inline | template DTOs · templates | Explicit · missing |
| Client change request | `client-portal/portal-cr-sheet.tsx` | Inline | client portal DTOs · change requests | Explicit · missing |
| Member/access | `members/add-member-dialog.tsx`, `members/pm-access-sheet.tsx`, `settings/project-members-section.tsx` | Missing owned schema | member/access DTOs · membership tables | Explicit · missing |
| Project file | `files/files-page.tsx` | Local file limits | file DTOs · file metadata | Immediate upload · recovery proof required |
| Ticket attachment | ticket create/detail attachment controls | Conflicting local limits | ticket subresource schema · attachments | Immediate upload · policy mismatch |
| Comment/reaction | `ticket-details/comment-item.tsx` and activity controls | Missing | ticket subresource schemas · collaboration | Explicit/immediate · draft/rollback incomplete |
| Time entry | `ticket-details/ticket-time-tracker.tsx` | Response schema only | timesheet DTOs · Timesheets entries | Explicit/immediate · missing |
| Budget | `project-detail/project-budget-page.tsx` | Manual number check | budget update schema · project/accounting owner | Explicit · missing currency/precision contract |
| Agent credential | `settings/agent-token-create-dialog.tsx` | `settings/agent-token-schema.ts` | agent token DTOs · credentials/audit | Explicit · missing |
| Portfolio | `portfolios/portfolio-form-sheet.tsx` | Inline | portfolio DTOs · portfolio tables | Explicit · missing |
| Program | `programs/program-form-sheet.tsx` | Owned program schema | program DTOs · program tables | Explicit · missing |
| Team | `teams/team-form-sheet.tsx` | Owned team schema | team DTOs · team tables | Explicit · missing |
| Roadmap item/changelog | `roadmap/roadmap-item-sheet.tsx`, `changelog-sheet.tsx` | Inline | roadmap DTOs · roadmap/changelog | Explicit · missing |
| Feedback merge | `roadmap/merge-feedback-dialog.tsx` | Inline | feedback DTOs · feedback/linkage | Decision · missing |
| Approval | `approvals/request-approval-sheet.tsx`, `decide-dialog.tsx`, `delegate-dialog.tsx` | Inline | approval DTOs · approvals/audit | Explicit/decision · missing |
| Whiteboard | `whiteboard/whiteboard-page.tsx`, `create-board-dialog.tsx` | Inline create schema | whiteboard DTOs · boards/snapshots | Autosave · page registered |
| Saved view | `views/saved-views/create-view-sheet.tsx` | Inline | view DTOs · saved views | Explicit · missing |

## Proven Contract Drift

| Contract | Current mismatch | Required resolution |
|---|---|---|
| Ticket type | DB and frontend exclude `SUBTASK`; create API accepts it; normalization stores it as `TASK` | One strict canonical policy with no silent coercion |
| Estimate | frontend requires positive; API accepts zero; DB has no nonnegative check | One zero/null meaning across all layers |
| Ticket update type | API accepts arbitrary string before normalization | strict enum and field error |
| Relation IDs | create API does not consistently require positive integers | one positive-ID relation policy |
| Reporter | client can select another member without a named widening permission | derive current actor or enforce explicit permission/data scope |
| Import title | weaker than normal create and no frontend dry run | same parser/policy as create |
| Risk title | frontend max 200; API max 500 | one approved maximum |
| Approval title | frontend max 200; API max 500 | one approved maximum |
| Epic title | frontend 3–120; API has different bounds | one meaningful-title policy |
| Goal fields | frontend and API disagree on required owner/dates | one field inventory |
| Change status | frontend string; API enum | strict shared vocabulary |
| Automation trigger | frontend string; API enum | strict shared vocabulary |
| Project edit name | frontend min 2; API min 1 | one normalized limit |
| Webhook URL | UI implies HTTPS; API accepts broader URL | HTTPS plus server-side SSRF policy |
| Ticket attachment | current create paths use different per-file limits | one platform upload policy |

## Completion Checklist

- [ ] **BLD-05A-001** source census and this matrix contain the same mutation
  component set with zero unexplained additions or omissions.
- [ ] **BLD-05A-002** every row names one save model, schema owner, request
  contract, mutation, response/error contract, durable owner, and dirty rule.
- [ ] **BLD-05A-003** every non-trivial inline schema is migrated to the
  existing canonical owner or one new cohesive `*-schema.ts`; no duplicate
  shape remains, and the root constitution's trivial single-field guard
  exception remains valid.
- [ ] **BLD-05A-004** every explicit-save and builder row has route, overlay,
  Escape, browser navigation, scope switch, organization switch, refresh, and
  sign-out dirty-exit tests.
- [ ] **BLD-05A-005** every autosave row has offline, retry, version conflict,
  local recovery, and successful-clear tests.
- [ ] **BLD-05A-006** every immediate row has authorization, idempotency,
  optimistic rollback, partial-failure, and cache-writer proof.
- [ ] **BLD-05A-007** all proven drift rows have parity tests that fail when
  frontend, API, and durable invariants diverge.
- [ ] **BLD-05A-008** ticket import ships preview, mapping, strict row errors,
  commit, progress, cancellation policy, and error download.
- [ ] **BLD-05A-009** API field paths map to controls; a 422 never degrades to
  toast-only feedback when a field target exists.
- [ ] **BLD-05A-010** database constraints or named transactional tests prove
  every durable range, date, tenant relation, and uniqueness invariant.
