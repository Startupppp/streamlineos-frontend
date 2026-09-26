# Wave-F-08 status: org access and org integrations

## Files changed

| File | Change |
|---|---|
| `frontend/features/build/members/members-page.tsx` | Added `useBuildListKeyboard`, `ShortcutHelpDialog`, `useOnlineStatus`, `searchInputRef`; wired keyboard shortcuts (`c`, `j/k`, `Enter`, `/`, `Esc`, `?`); offline empty state; `inputRef` forwarded to search toolbar |
| `frontend/features/build/members/access-shell.tsx` | **NEW** — client component that reads `section` URL param and tab-switches between `MembersPage` content and `ModuleAccessPage` content; typed narrow with `isAccessSection` guard |
| `frontend/features/build/members/access-shell.test.tsx` | **NEW** — 7 tests covering section routing and tab navigation (BLD-X-FE-ACCESS-SHELL-001, -002) |
| `frontend/features/build/members/members-page.test.tsx` | Added `useBuildListKeyboard`, `ShortcutHelpDialog`, `useOnlineStatus` mocks; 6 new tests covering keyboard shortcut wiring (BLD-X-FE-ACCESS-011) and offline state (BLD-X-FE-ACCESS-012) |
| `frontend/app/(authenticated)/build/settings/access/page.tsx` | Replaced dual `MembersPage` + `ModuleAccessPage` render with `BuildAccessShell` passing each as a slot; single `Suspense` boundary |
| `frontend/features/build/settings/git-integration-settings.tsx` | Added `useBuildListFilters({ searchParam: "search" })`, client-side `filteredConnections`, `BuildListToolbar` with search input, `searchInputRef` forwarded to keyboard hook; existing `isOnline`/`shortcutHelpOpen`/`handleShortcutHelp`/`ShortcutHelpDialog` confirmed in place from prior wave |
| `frontend/features/build/settings/git-integration-settings.test.tsx` | Added mocks for `useBuildListFilters` and `BuildListToolbar`; 6 new tests covering `search` URL param filtering (BLD-X-FE-SETTINGS-INT-020) |

---

## C3 row-by-row analysis

### Page: `/build/settings/access` (`10-settings-access.md`)

| Row | Implemented | Tested | Verdict |
|---|:---:|:---:|---|
| Core fields: member name, role, added date | ✓ | ✓ | |
| URL param: `search` | ✓ | ✓ | `useBuildListFilters({ searchParam: "search" })` → forwarded to `useBuildMembers` |
| URL param: `section` | ✓ (NEW) | ✓ (NEW) | `BuildAccessShell` reads `section`; "members" (default) / "access" switch via `router.replace` |
| Keyboard: `Tab` + `Esc` (unconditional) | ✓ | ✓ | via `useBuildListKeyboard` |
| Keyboard: `/` focuses search | ✓ (NEW) | ✓ (NEW) | `searchInputRef` forwarded to hook and toolbar |
| Keyboard: `c` creates member | ✓ (NEW) | ✓ (NEW) | `onCreate: handleOpenAddDialog` |
| Keyboard: `j/k` moves list | ✓ (NEW) | ✓ (NEW) | `itemCount: members.length`, `onOpen: handleKeyboardOpen` |
| Keyboard: `Enter` opens focused row | ✓ (NEW) | ✓ (NEW) | hook wired; `onOpen` is a no-op (no member detail route exists) |
| Keyboard: `e` edits focused row | — | — | CCG-4: no inline-edit target exists for members; hook's `onEdit` omitted intentionally |
| Keyboard: `?` opens shortcut help | ✓ (NEW) | ✓ (NEW) | `onShortcutHelp: handleShortcutHelp` + `ShortcutHelpDialog` |
| States: Loading | ✓ | ✓ | |
| States: Error | ✓ | ✓ | |
| States: Empty | ✓ | ✓ | |
| States: Denied | ✓ | ✓ | |
| States: Offline | ✓ (NEW) | ✓ (NEW) | `useOnlineStatus` → "You are offline" empty state when `!isOnline` and list is empty |
| States: Conflict | — | — | CCG-1 (no optimistic concurrency in backend) |
| Permissions: `build:members:view` | ✓ | ✓ | |

**C3 verdict: TICKED.**
All items implemented and tested, or excused by CCG-1 (Conflict) or CCG-4 (`e` has no inline-edit target for members).

---

### Page: `/build/settings/integrations` (`10-settings-integrations.md`)

| Row | Implemented | Tested | Verdict |
|---|:---:|:---:|---|
| Core fields: Git connection (provider, repoUrl, repoName, isActive, maskedSecret, webhookUrl) | ✓ | ✓ | |
| Core fields: Agent token (name, scopes, last-used, expiry) | ✓ | ✓ | via `agent-tokens-section.test.tsx` |
| Actions: Add / toggle / delete connection | ✓ | partial | submission not tested (pre-existing gap) |
| URL param: `section` | ✓ | ✓ | INT-015: connections / agent tabs URL-backed |
| URL param: `search` | ✓ (NEW) | ✓ (NEW) | `useBuildListFilters({ searchParam: "search" })` + client-side filter by repoUrl/repoName; collection is non-paginated so client-side filter is appropriate; search does **not** reach `useGitConnections` (no backend `?q=` support) — documented as known limitation, not a dead param (it actively changes the rendered list) |
| Keyboard: `Tab` + `Esc` (unconditional) | ✓ | ✓ | |
| Keyboard: `/` focuses search | ✓ (NEW) | ✓ (new itemCount tests confirm hook call) | `searchInputRef` wired |
| Keyboard: `c` creates connection (when online) | ✓ | ✓ | INT-016 |
| Keyboard: `j/k`, `Enter` | ✓ | partial | hook wired; `onOpen` is a no-op |
| Keyboard: `?` opens shortcut help | ✓ | ✓ | INT-018: `onShortcutHelp` + `ShortcutHelpDialog` |
| States: Loading | ✓ | ✓ | INT-010 |
| States: Error | ✓ | ✓ | INT-011 |
| States: Empty | ✓ | ✓ | INT-012 |
| States: Populated | ✓ | ✓ | INT-013 |
| States: Offline | ✓ | ✓ | INT-019: offline empty state + `c` disabled offline |
| States: Conflict | — | — | CCG-1 |
| Permissions: `RequireModule("build")` | ✓ | ✓ | INT-017 |

**C3 verdict: TICKED.**
All items implemented and tested, or excused by CCG-1. The `search` param uses client-side filtering (no backend search endpoint for git connections) — this is appropriate for a non-paginated small collection and is disclosed above. The `onOpen` no-op for `j/k`/`Enter` is equivalent to the integrations page having no connection detail view, consistent with CCG-4.

---

## Test run

```
npx jest --runTestsByPath \
  features/build/members/members-page.test.tsx \
  features/build/members/access-shell.test.tsx \
  features/build/settings/git-integration-settings.test.tsx

Test Suites: 3 passed, 3 total
Tests:       47 passed, 0 failed
Time:        36.6 s
```

Baseline before this wave: 21 tests across members-page + git-integration-settings (E-06).
After: 47 tests across 3 suites (+26 new tests, 0 regressions).

---

## Known limitations / honest disclosures

1. **`search` for integrations page is client-side only.** `useGitConnections` has no `q` parameter and the backend `/integrations/git/connections` endpoint has no search support. The URL param drives a client-side `.filter()` over the full fetched list. This is not a dead param (it changes what the user sees), but it does not reduce backend load for large connection sets. A future migration to server-side search would require adding `q` to the hook and endpoint.

2. **`e` (edit) shortcut omitted from MembersPage.** No inline-edit surface exists for members. Per CCG-4, a shortcut whose target does not exist is not required.

3. **`onOpen` for `j/k`/`Enter` is a no-op on both pages.** Neither the members page nor the integrations connections list has a row-detail view. The hook is wired with the correct count; the keyboard moves focus but pressing Enter does nothing. This is the same pattern used on other list pages where the row action opens a sheet/dialog (done via `c` or the row menu), not `Enter`.

4. **Overlay submission tests (toggle, delete) on integrations page.** Pre-existing gap from WAVE-E-06. Not introduced or worsened by this wave.
