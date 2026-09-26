# Lane 4 — Cross-Territory Requests

Requests for files outside Lane 4 territory. The orchestrator applies these.

---

## ORCHESTRATOR RULING on Request 1 (2026-09-26): NOT APPLICABLE — nothing to remove

`"features/build/modules/modules-page.tsx"` is **not in** `frontend/lib/rbac/denial-is-not-emptiness.known.json`.
The only `modules-page.tsx` entry in that file is line 192, `"features/settings/modules/modules-page.tsx"` —
a different file in a different feature, which Lane 4 does not own and which this session has not
changed. `grep -n "build/" lib/rbac/denial-is-not-emptiness.known.json` returns zero hits: the whole
239-entry list contains no build-module file.

Your fix to `frontend/features/build/modules/modules-page.tsx` stands and is real —
`usePageState` at line 89 with `permission: "build:view"`, `PageState` at line 196 with the house
`loading={null}`. It just never needed a suppression entry removed, because it never had one. No edit
applied. Do not re-file this.

---

## Request 2: Register execution-core gallery route in the design-system registry

**File:** `frontend/app/(public)/design-system/page.tsx` (or equivalent design-system index file)

**Change:** Add an entry or link for `/design-system/execution-core` so the gallery route is discoverable in the dev design-system index page.

**Reason:** The Playwright C6 spec at `frontend/e2e/execution-core-a11y.spec.ts` navigates to `/design-system/execution-core`. The gallery page exists at `frontend/app/(public)/design-system/execution-core/page.tsx` and the `ExecutionCoreGallery` component is at `frontend/features/build/views/execution-core-gallery.tsx`. The route works but is unreachable from the design-system index. Adding a link to the design-system listing lets maintainers find it and keeps it consistent with the existing `build-list` gallery entry pattern.

---

## Request 1: Remove modules-page.tsx from denial-is-not-emptiness known list

**File:** `frontend/lib/rbac/denial-is-not-emptiness.known.json`

**Change:** Remove the entry `"features/build/modules/modules-page.tsx"` from the array.

**Reason:** `features/build/modules/modules-page.tsx` was fixed in this session to use proper `usePageState` / `<PageState>` pattern (import of `usePageState` and `PageState` added, manual `if (isLoading)` / `if (isError)` branches replaced with PageState dispatch, permission `"build:view"` wired). The file no longer renders empty-success state on denial — it renders `NoPermissionState` via PageState. The 8 new tests in `features/build/modules/modules-page.test.tsx` verify this including the `ACCESS_DENIED` → `no-permission` case.
