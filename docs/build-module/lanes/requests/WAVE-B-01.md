# Wave-B-01 requests

## Request 1: Spec template reconciliation for form-type settings pages

**Filed by:** Wave-B-01 (project-settings-core)
**Affects:** `docs/build-module/10-project-settings.md`

**Issue:** The spec template includes "section and search" URL params and a full keyboard-shortcut table (`/`, `c`, `j/k`, `Enter`, `e`, `Esc`, `?`). These are appropriate for list/work-item pages. The settings page (`/build/[projectId]/settings`) is a section-navigation form, not a list page. The following spec items do not have a meaningful implementation for a settings form:

- `search` URL param: there is no searchable list; the page has fixed named sections
- `/` focus search: requires a search input that does not exist
- `c` create: only meaningful section-by-section (labels section has its own Add button)
- `j/k` navigate rows, `Enter` open: no row list exists
- `?` shortcut help: global application feature (see Request 2)

**Ask:** Update the spec for `10-project-settings.md` to replace the generic keyboard table with one scoped to section navigation (tab navigation, `Esc` to close overlays), and remove the `search` URL param from the URL state section, since the only meaningful URL param for this page is `section`.

---

## Request 2: Global `?` shortcut help modal

**Filed by:** Wave-B-01 (project-settings-core)
**Affects:** `docs/build-module/10-project-settings-fields.md` (and every other page that references `?` shortcut help)

**Issue:** The spec lists `?` as a keyboard shortcut that opens shortcut help. `useBuildListKeyboard` (the shared hook used by all build list pages) does not handle `?`. There is no application-level `?` handler visible in the codebase.

**Ask:** Either:
1. Add `?` handling to `useBuildListKeyboard` (opening a shared `ShortcutHelpDialog` component), or
2. Wire a global `document.addEventListener("keydown")` in the build layout to open a help dialog when `?` is pressed outside an input.

Once wired globally, each page's spec `?` row becomes satisfiable without per-page changes.

Until this is resolved, every C3 on a page that uses `useBuildListKeyboard` will have a gap at the `?` shortcut row.
