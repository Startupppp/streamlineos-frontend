# Lane 8 — Content & intake

Read [`LANE-COMMON.md`](./LANE-COMMON.md) first. It is binding.

Migration range: **1275–1279**. Status file: `status/LANE-8-STATUS.md`. Requests: `requests/LANE-8.md`.

## Your page specs (13 — 9 at 7 boxes, 4 at 6 boxes = 87 checkboxes)

| Spec | Route |
|---|---|
| `docs/build-module/10-project-wiki.md` | `/build/[projectId]/wiki` |
| `docs/build-module/10-project-wiki-page.md` | `…/wiki/[pageId]` |
| `docs/build-module/10-project-whiteboard.md` | `…/whiteboard` |
| `docs/build-module/10-project-files.md` | `…/files` |
| `docs/build-module/10-project-forms.md` | `…/forms` |
| `docs/build-module/10-project-forms-form.md` | `…/forms/[formId]` |
| `docs/build-module/10-project-intake.md` | `…/intake` |
| `docs/build-module/10-project-meetings.md` | `…/meetings` |
| `docs/build-module/10-project-meetings-meeting.md` | `…/meetings/[meetingId]` |
| `docs/build-module/10-public-form.md` | public form |
| `docs/build-module/10-public-intake.md` | public intake |
| `docs/build-module/10-public-roadmap.md` | public roadmap |
| `docs/build-module/10-public-whiteboard.md` | public whiteboard |

## Territory

**Frontend features:** `frontend/features/build/{forms,intake,files,meetings,whiteboard,import-export}/**`, plus the Build project wiki surface reached only from `/build/[projectId]/wiki`.

**Frontend routes:** `frontend/app/(authenticated)/build/[projectId]/{wiki,whiteboard,files,forms,intake,meetings}/**`, and the four public Build routes reached only by your public specs.

**Frontend hooks:** `frontend/hooks/api/build/{forms,forms-schema,project-files,project-files-schema,meetings,meetings-schema,attachments,whiteboards,whiteboards-public,public-form,public-intake,ticket-import-export,ticket-import-export.test}.*`

**Backend:** `backend/src/modules/build/{forms,files,meetings,import-export}/**`, and in `backend/src/modules/build/execution/`: `whiteboards.service.ts`, `whiteboard-access.ts`, `whiteboard-board-helpers.ts`, `whiteboard-sharing.*`, plus their specs, and `intake-keyset.spec.ts`.

> The rest of `modules/build/execution/**` is **Lane 4's**. Your claim there is the whiteboard files
> and `intake-keyset.spec.ts` only.

**Not yours:** the Knowledge Base module (`help-centre/`, `kb_*` tables, `frontend/features/wiki/**`)
is a **separate, unrelated workstream with uncommitted changes in this checkout right now**. The Build
project wiki is not the Knowledge Base. Do not touch anything KB.

## Lane-specific hazards, measured

- **The four public routes are unauthenticated and therefore the highest-risk surface in the module.**
  A `@Public()` route's RLS lookup raises `42501`; the fix is a `SECURITY DEFINER` function — copy
  migration `1057`. An unauthenticated probe is **vacuous** without a bogus-route control.
- **`next.config.ts` shadows redirect pages.** If a public or intake route appears not to resolve,
  read `next.config.ts` **first** — a redirect declared there beats a page file, and the page file
  looks correct in every static gate.
- **A new frontend route file is unreachable until it is registered**, and every static gate still
  passes. Route registration is a request, not an edit.
- `/build/[projectId]/intake`, `/forms` and `/triage` are **three separate canonical jobs** and must
  not be consolidated. Triage is Lane 4's.
- Intake persists its tab in the shared `tab` parameter; Forms and project Incidents use validated
  cursor-page contracts. Forms already return a validated cursor page and preserve legacy array
  responses during rollout (24 focused tests); form **submissions** use a validated timestamp/id
  cursor page with the same legacy acceptance. Verify and cite; do not remove the legacy path.
- **Import/export declared an array against a cursor envelope** and shipped `200` +
  `CONTRACT_VIOLATION` — with the parity gate blind to it. That is the exact defect class for your
  lane. P1-7 import is otherwise complete (9 backend suites / 121 tests, 7 frontend / 80 tests).
- **Meeting agenda generation** used to filter on sprint equality. An incorrect cutover returns an
  **empty agenda with no error** — this programme has shipped that failure once already. `sprint_id`
  is gone from `project_meetings`. Assert a non-empty agenda from a positive control, not just the
  absence of a throw.
- Files: attachment grants need a writer to be meaningful — a grant table with no writer makes every
  "shared with me" list permanently empty, which is a missing feature, not a seeding problem.
- **vaul `Drawer` does not take focus**, and jsdom cannot see it — form sheets and filter drawers are
  real-browser-only facts. Same for horizontal overflow at 375 px and computed control height.
- `cn()` deletes custom font-size classes. Wiki and whiteboard typography is where that shows.
- A whiteboard is collaborative and durable, so the spec's overlay rules put it on a **full page**,
  not a dialog or popover.
- `postgres-js` errors are cross-realm; a `catch (e instanceof PgError)` check silently fails.
