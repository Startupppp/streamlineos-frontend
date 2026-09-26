# Wave-E-06 status: integrations, webhooks, org access, org settings-integrations

## Spec → page mapping

| Spec | Route | Feature file(s) |
|---|---|---|
| `10-project-settings-integrations.md` | `/build/[projectId]/settings/integrations` | `project-settings-integrations-page.tsx` wrapping `git-integration-settings.tsx` |
| `10-project-settings-integrations-webhooks.md` | `/build/[projectId]/settings/integrations/webhooks` | `features/build/webhooks/project-webhooks-page.tsx`, `features/build/settings/webhook-card.tsx` |
| `10-settings-access.md` | `/build/settings/access` | `features/build/members/members-page.tsx` + `ModuleAccessPage` |
| `10-settings-integrations.md` | `/build/settings/integrations` | `features/build/settings/git-integration-settings.tsx` + `agent-tokens-section.tsx` |

---

## Files changed

| File | Change |
|---|---|
| `frontend/features/build/settings/git-integration-settings.tsx` | Added URL-backed `section` param (reads/writes via `useSearchParams`/`useRouter`); added `useBuildListKeyboard` wiring for `c` shortcut (create connection); added `connectionsList` derived from `connections?.data ?? []` |
| `frontend/features/build/settings/git-integration-settings.test.tsx` | Added mocks for `next/navigation` and `useBuildListKeyboard`; added 10 new tests covering URL section param (BLD-X-FE-SETTINGS-INT-015), keyboard shortcut wiring (BLD-X-FE-SETTINGS-INT-016), and RequireModule gate (BLD-X-FE-SETTINGS-INT-017) |
| `frontend/features/build/webhooks/project-webhooks-page.tsx` | Added `useBuildListKeyboard` wiring for `c` shortcut (open sheet), enabled only when `pageState.kind === "ready"` |
| `frontend/features/build/webhooks/project-webhooks-page.test.tsx` | Added `useBuildListKeyboard` mock; added 4 new tests covering keyboard shortcut wiring (BLD-X-FE-SETTINGS-WH-030) |
| `frontend/features/build/settings/project-settings-integrations-page.test.tsx` | Fixed `usePageState` mock to return proper `{ kind: "..." }` objects instead of strings; fixed `PageState` mock to check `resolution.kind`; added error state tests (BLD-X-FE-SETTINGS-INT-002) |
| `frontend/features/build/members/members-page.test.tsx` | Added error state and populated state tests (BLD-X-FE-ACCESS-010) |

---

## C3 row-by-row analysis

### Page 1: `/build/[projectId]/settings/integrations` (`10-project-settings-integrations.md`)

| Row | Implemented | Tested | Notes |
|---|:---:|:---:|---|
| Core fields: Git connection (provider, repoUrl, repoName, isActive, maskedSecret, webhookUrl) | ✓ | ✓ | via `git-integration-settings.test.tsx` INT-010–014 |
| Core fields: Agent token (name, scopes, last-used, expiry) | ✓ | ✓ | via `agent-tokens-section.test.tsx` |
| Action: Add connection | ✓ | partial | dialog wired; no submission test |
| Action: Toggle connection active/inactive | ✓ | partial | handler wired; no dedicated action test |
| Action: Delete connection | ✓ | partial | ConfirmDialog wired; no submission test |
| Action: Show-once secret (CreatedSecretDialog) | ✓ | ✓ | INT-014 |
| Overlay: Add connection dialog | ✓ | partial | renders; no submission test |
| Overlay: CreatedSecretDialog | ✓ | ✓ | INT-014 |
| Overlay: Delete confirm dialog | ✓ | partial | wired; no submission test |
| URL param: `section` | ✓ (NEW) | ✓ (NEW) | INT-015: URL-backed tab switching via `useSearchParams`/`useRouter` |
| URL param: `search` | ✗ | ✗ | No search UI on this page; no backend search endpoint for connections |
| Keyboard shortcut: `c` (create) | ✓ (NEW) | ✓ (NEW) | INT-016: wired via `useBuildListKeyboard` |
| Keyboard shortcut: `/`, `j/k`, `Enter`, `e`, `Esc`, `?` | partial | partial | `j/k`/`Enter` wired via hook; `?` help not implemented; `/` requires search input |
| States: Loading | ✓ | ✓ | INT-010 |
| States: Error | ✓ | ✓ (NEW) | INT-002: page-level error |
| States: Empty | ✓ | ✓ | INT-012 |
| States: Denied (page level) | ✓ | ✓ | INT-001 |
| Permissions: `build:update` gates page | ✓ | ✓ | INT-001 |
| Permissions: `RequireModule("build")` | ✓ | ✓ (NEW) | INT-017: prop assertion |

**C3 verdict: NOT ticked.**
Remaining gaps: `search` URL param (no search UI exists on this page); overlay submission tests (toggle, delete); `?` keyboard shortcut help not implemented.

---

### Page 2: `/build/[projectId]/settings/integrations/webhooks` (`10-project-settings-integrations-webhooks.md`)

| Row | Implemented | Tested | Notes |
|---|:---:|:---:|---|
| Core field: URL | ✓ | ✓ | WH-021 |
| Core field: events | ✓ | ✓ | WH-023 (mutation controls test shows events badges) |
| Core field: enabled (isActive) | ✓ | ✓ | WH-020 |
| Core field: secret age | ✓ | ✓ | WH-022 |
| Core field: last delivery | partial | partial | Visible only in expanded delivery list; no summary on card face |
| Core field: failure rate | ✗ | ✗ | No backend aggregate endpoint |
| Action: Create webhook | ✓ | partial | Sheet renders; no submission test |
| Action: Delete webhook | ✓ | ✓ | WH-023 |
| Action: Send test | ✓ | ✓ | WH-023 |
| Action: Enable/disable toggle | ✗ | ✗ | No `PATCH` endpoint in backend controller |
| Overlay: Create webhook sheet | ✓ | partial | Renders; no submission test |
| Overlay: Delete confirm | ✓ | ✓ | WH-023 |
| Overlay: Delivery list | ✓ | partial | Renders; no state-driven test |
| URL param: `state`, `event`, `from`, `to`, `q`, `cursor` | ✗ | ✗ | Backend filter support required; P1 per spec |
| Keyboard shortcut: `c` (create) | ✓ (NEW) | ✓ (NEW) | WH-030: wired via `useBuildListKeyboard`, gated on `canManage` |
| Keyboard shortcut: `j/k`, `Enter`, `Esc` | ✓ (hook wired) | partial | Hook wired but `onOpen` is a no-op |
| States: Loading | ✓ | ✓ | WH-011 |
| States: Error | ✓ | ✓ | WH-012 |
| States: Empty | ✓ | ✓ | WH-013 |
| States: Denied | ✓ | ✓ | WH-010 |
| States: Populated | ✓ | ✓ | WH-014 |
| Permissions: `build:manage` gates view | ✓ | ✓ | WH-010 |
| Permissions: `build:manage` gates create/delete/test | ✓ | ✓ | WH-010, WH-023 |

**C3 verdict: NOT ticked.**
Remaining gaps (all backend-blocked or P1 items):
- `failure rate` field: no backend aggregate endpoint
- `enable/disable` toggle action: no `PATCH /build/:projectId/webhooks/:webhookId` in the backend controller
- URL-backed filters (`state`, `event`, `from`, `to`, `q`, `cursor`): backend filter support required
- `last delivery` summary on card face (currently only in expanded view)
These are the same gaps recorded in WAVE-B-04.

---

### Page 3: `/build/settings/access` (`10-settings-access.md`)

| Row | Implemented | Tested | Notes |
|---|:---:|:---:|---|
| Core fields: member name, role, added date | ✓ | partial | `data-table` renders when populated |
| URL param: `search` | ✓ | partial | `useBuildListFilters({ searchParam: "search" })` wired |
| URL param: `section` | ✗ | ✗ | No tabs/sections UI on this page |
| Keyboard shortcuts (`c`, `j/k`, `Enter`, `e`, `Esc`, `?`) | ✗ | ✗ | `useBuildListKeyboard` not wired in `MembersPage` |
| States: Loading (access) | ✓ | ✓ | via `members-page.test.tsx` |
| States: Denied | ✓ | ✓ | via `members-page.test.tsx` |
| States: Error | ✓ | ✓ (NEW) | ACCESS-010 |
| States: Populated | ✓ | ✓ (NEW) | ACCESS-010 positive pair |
| Permissions: `build:members:view` | ✓ | ✓ | via `members-page.test.tsx` |

**C3 verdict: NOT ticked.**
Remaining gaps: `section` URL param (no tabs UI exists on this page to link into); keyboard shortcuts (`useBuildListKeyboard` not wired in `MembersPage`).

---

### Page 4: `/build/settings/integrations` (`10-settings-integrations.md`)

This page renders `ProjectsGitIntegrationSettings` (same component as Page 1) with an `AgentTokensSection` footer.

| Row | Implemented | Tested | Notes |
|---|:---:|:---:|---|
| Core fields: Git connection fields | ✓ | ✓ | INT-010–014 |
| Core fields: Agent token fields | ✓ | ✓ | `agent-tokens-section.test.tsx` |
| URL param: `section` | ✓ (NEW) | ✓ (NEW) | INT-015: both tabs (connections ↔ agent) URL-backed |
| URL param: `search` | ✗ | ✗ | No search UI on the integrations page |
| Keyboard shortcut: `c` (create connection) | ✓ (NEW) | ✓ (NEW) | INT-016 |
| Keyboard shortcut: `j/k`, `Enter`, `Esc` | partial | partial | hook wired; `onOpen` is a no-op |
| States: Loading | ✓ | ✓ | INT-010 |
| States: Error | ✓ | ✓ | INT-011 |
| States: Empty | ✓ | ✓ | INT-012 |
| States: Populated | ✓ | ✓ | INT-013 |
| Permissions: `RequireModule("build")` | ✓ | ✓ (NEW) | INT-017 |

**C3 verdict: NOT ticked.**
Remaining gaps: `search` URL param (no search UI on this page); `?` keyboard shortcut help not implemented.

---

## Test runs

```
npx jest --runTestsByPath \
  features/build/webhooks/project-webhooks-page.test.tsx \
  features/build/webhooks/webhook-card.test.tsx \
  features/build/settings/project-settings-integrations-page.test.tsx \
  features/build/settings/git-integration-settings.test.tsx \
  features/build/members/members-page.test.tsx

Test Suites: 5 passed, 5 total
Tests:       50 passed, 0 failed
Time:        3.673 s
```

Baseline before this wave: 30 tests across first 4 suites.
After: 50 tests across 5 suites (+20 new tests, 0 regressions).

---

## Summary of what closed and what remains open

### Closed in this wave

- URL-backed `section` tab param for `git-integration-settings.tsx` (affects pages 1 and 4)
- Keyboard shortcut wiring (`c` key) for webhooks page and integrations page
- Error state test for project integrations page (`usePageState` mock fixed to object form)
- Error state and populated state tests for org access page
- `RequireModule("build")` gate test for integrations page

### Permanently open (backend-blocked)

The following items on Page 2 cannot close without backend changes. They are recorded here and in WAVE-B-04:

| Gap | Reason |
|---|---|
| `failure rate` core field | No backend aggregate endpoint |
| Enable/disable toggle action | No `PATCH /build/:projectId/webhooks/:webhookId` endpoint |
| URL-backed filters (`state`, `event`, `from`, `to`, `q`, `cursor`) | Backend filter support required |
| `last delivery` on card face | Would require always-loading delivery data or a new field on the webhook row |

### Remaining frontend-only gaps (not backend-blocked)

| Gap | Page(s) | Notes |
|---|---|---|
| `search` URL param | Pages 1, 3, 4 | No search UI exists on any of these pages |
| `section` URL param | Page 3 | No tabs/sections UI on the org access page |
| Keyboard shortcuts (`c`, `j/k`, `e`, `?`, `Esc`) | Page 3 | `useBuildListKeyboard` not yet wired in `MembersPage` |
| `?` keyboard shortcut help | Pages 1, 2, 4 | Requires a global shortcut help overlay |
| Overlay submission tests (toggle, delete) | Pages 1, 4 | Actions wired; submission not tested |
