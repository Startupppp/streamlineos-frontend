# Lane 1 — Organization work surfaces & directory

Read [`LANE-COMMON.md`](./LANE-COMMON.md) first. It is binding.

Migration range: **1240–1244**. Status file: `status/LANE-1-STATUS.md`. Requests: `requests/LANE-1.md`.

## Your page specs (9 — 63 checkboxes)

| Spec | Route |
|---|---|
| `docs/build-module/10-my-work.md` | `/build/my-work` |
| `docs/build-module/10-inbox.md` | `/build/inbox` |
| `docs/build-module/10-all-work.md` | `/build/all-work` |
| `docs/build-module/10-command-center.md` | `/build/command-center` |
| `docs/build-module/10-approvals.md` | `/build/approvals` |
| `docs/build-module/10-org-projects.md` | `/build` |
| `docs/build-module/10-teams.md` | `/build/teams` |
| `docs/build-module/10-teams-team.md` | `/build/teams/[teamId]` |
| `docs/build-module/10-templates.md` | `/build/templates` |

## Territory

**Frontend features:** `frontend/features/build/{my-work,inbox,all-work,command-center,approvals,project-list,project-create,teams,templates,drafts,my-tickets,overview}/**`

**Frontend routes:** `frontend/app/(authenticated)/build/{my-work,inbox,all-work,command-center,approvals,teams,templates}/**`, `frontend/app/(authenticated)/build/page.tsx`

**Frontend hooks:** `frontend/hooks/api/build/{all-work,approvals,approvals-schema,approvals-badge.test,teams,teams-schema,teams-schema.test,teams-list-contract.test,templates,scope-directory,scope-directory-schema,roster,project-members,build-members,projects-list-contract.test,projects-error-policy.test,project-list-patch-scope.test}.*`

**Backend:** `backend/src/modules/build/{approvals,teams,scope-directory}/**`, and in `backend/src/modules/build/core/`: `projects-work-query*.ts`, `work-scope-union.ts`, `projects-templates.*`, `build-members.*`, `projects-members.service.ts`, `projects-activity.service.ts`, `build-notification-context*.ts`, `build-notification-visibility.ts`, `build-due-sweep.service.ts`, `projects-search.service.ts`, plus each file's `*.spec.ts`.

**Not yours:** the notification/inbox persistence layer lives outside `modules/build` — read it, request changes to it.

## Lane-specific hazards, measured

- **Chat notifications never persist**, so the Inbox cannot see them. If a criterion implies chat
  in the Inbox, that is a missing feature, not a query bug — record it and do not fake it.
- **Leave approvals are double-counted in the Inbox.** Approval adapters have no approver routing
  at create time. If your approvals criteria touch routing, that is a create-path gap.
- Approval inbox and project approval lists already return validated cursor pages (15 focused
  tests pass). Do not re-derive that; verify and cite it.
- `/build/inbox` (609,560 B) and `/build/my-work` (644,655 B) both breach the 524,288 B first-load
  JS ceiling. Two of your routes are the worst offenders in the module. Criterion 4 (bounded lists)
  and the bundle budget are related but not the same claim — do not tick one from the other. If you
  reduce a bundle, you may **not** run `check:route-bundle-budget` yourself; hand the measurement
  request to the orchestrator.
- `/build/all-work?scope=mine` is the endpoint behind My Work. Its `scope` value is a real
  server-side filter; a `z.string()` there instead of the enum is the house defect.
- The org scope selector (`All of Build / Organization`) is intentional, not a resurrected PM
  Workspace. `check:pm-workspace-removal` must stay green — do not introduce the word "workspace".
- `setListParams` inside an effect loops forever. My Work, All Work and the project directory all
  use the shared list-filter hook, which is **request-only**.
