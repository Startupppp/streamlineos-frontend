# 52 — Batch C: the project settings lists adopt the surface

**What to build:** The settings lists inside a project — fields, views, workflow, automations, integrations and webhooks, agents and credentials, access, retention, portal, iterations — render through the list surface.

These pages are the most permission-sensitive in Build, so the branch the module owns matters most here: a settings list must show a no-permission state, never an empty table, and must surface a 402 as the upgrade path rather than a generic failure.

**Blocked by:** 49 — A Build list surface exists, and a list can be rendered without fetching.

**Status:** ready-for-agent

- [ ] Each settings list renders through the surface
  **Left unchecked: one list in the batch is still not migrated.** `members/members-page.tsx` (295 lines) was
  the batch's only full `DataTable` list page and it now renders through `BuildListSurface`. The nine
  `project-settings-*-page.tsx` files and `workflow/workflow-page.tsx` are forms, panels and card grids rather
  than table lists -- they use `PageState` directly, which is correct for them, and forcing them onto a list
  surface would be the wrong shape.
  `workflow/transitions-table.tsx` genuinely belongs on the surface and is blocked: it passes `compact` to
  `PageState` and `className="border-0"` to the inner `DataTable`, and `BuildListSurface` forwards neither.
  Both are one-line passthroughs to props that already exist on the components underneath, so this is a small
  piece of work on the module rather than a design problem -- but it is not done, so the box is not ticked.
- [x] Every page in the batch shows a no-permission state for an actor without its permission key, never an empty table
  Earned 2026-09-27 across all eleven suites in the batch, each asserting `NoPermissionState` for a denied
  actor with a paired positive in the same file (FE-122) -- the pairing matters here because a denial test
  passes just as well when the control it is looking for cannot render at all. 277 tests pass across
  `features/build/settings/`.
- [x] The permission key each page declares matches the one its route requires, asserted rather than assumed
  Earned 2026-09-27, and this was the criterion that found real defects. Every one of the eleven suites now
  asserts its page's key through `expect.objectContaining({ permission })` on the `usePageState` call, so the
  key is pinned rather than described.
  **Five pages were declaring a key their endpoint does not use.** Each was checked against the controller,
  not inferred:
  | page | declared | its GET requires | its writes require |
  |---|---|---|---|
  | fields | `build:update` | `build:view` | `build:manage` |
  | iterations | `build:update` | `build:view` | `build:update` |
  | retention | `build:update` | `build:view` | `build:update` |
  | agents | `build:update` | `settings:api-tokens:read` | `settings:api-tokens:write` |
  | integrations | `build:update` | `integrations:git:view` | `integrations:git:manage` |
  For fields, agents and integrations `build:update` governs **nothing** on the endpoint the page reads. For
  iterations and retention it is the *write* key, so a member who could read the page was shown Access Denied
  while a `build:update` holder was shown the page and then refused by the API. Each surface now declares the
  key its own GET requires.
  **Widening a surface is only safe if the controls inside it are gated**, so that was checked per page rather
  than assumed: custom fields already gated on `build:manage`, iterations and retention already on
  `build:update`. The agent token controls were gated on nothing at all -- `New token` and `Revoke` were
  visible to any viewer who reached the page -- and are now gated on `settings:api-tokens:write` with paired
  tests in both directions (FE-44). The API was left untouched throughout: it is the boundary, and the UI had
  been disagreeing with it.
- [x] No page in the batch changes visibly for an actor who does hold the permission
  Earned 2026-09-27. No rendering logic changed on the granted-actor path; the positive half of each paired
  test asserts the same content as before. The only behavioural changes are to *who* reaches a page, which is
  the subject of the criterion above, and the removal of controls from actors who were never authorised to
  use them.
- [x] Files in the batch that exceeded 500 lines drop below it, per FE-57
  Earned 2026-09-27. `project-settings-retention-page.tsx` was **523 lines and is now 165**, with
  `PolicySection`, `HoldsSection` and `retentionDaysLabel` extracted to a new sibling,
  `project-settings-retention-sections.tsx` (368 lines). Both are under 500 and neither is padded or split
  along an artificial seam -- the sections are the page's two independent panels.
  One regression came out of that extraction and is fixed rather than left: the iteration-settings form owns a
  react-hook-form instance and never called `useRegisterDirtyState`, so typing a duration and switching scope
  discarded the draft with no prompt. `build-dirty-state-coverage.test.ts` had been naming that file for some
  time; the registration is now in place and that ratchet is green.
