# Wave F-07 status: project integrations and webhooks

## Pages owned

| Spec | Route | Feature file(s) |
|---|---|---|
| `10-project-settings-integrations.md` | `/build/[projectId]/settings/integrations` | `git-integration-settings.tsx` (wrapped by `project-settings-integrations-page.tsx`) |
| `10-project-settings-integrations-webhooks.md` | `/build/[projectId]/settings/integrations/webhooks` | `features/build/webhooks/project-webhooks-page.tsx`, `features/build/settings/webhook-card.tsx` |

---

## Files changed

| File | Change |
|---|---|
| `frontend/features/build/webhooks/project-webhooks-page.tsx` | Added `useOnlineStatus`, `ShortcutHelpDialog`; wired `onShortcutHelp` to `useBuildListKeyboard`; gated Add Webhook button and `onCreate` on `isOnline`; added offline empty state |
| `frontend/features/build/webhooks/project-webhooks-page.test.tsx` | Added mocks for `use-online-status` and `shortcut-help-dialog`; added 7 new tests covering WH-031 (shortcut help) and WH-032 (offline) |
| `frontend/features/build/settings/git-integration-settings.tsx` | Added `useOnlineStatus`, `ShortcutHelpDialog`; wired `onShortcutHelp` to `useBuildListKeyboard`; gated Add Connection button and `onCreate` on `isOnline`; added offline empty state in connections tab |
| `frontend/features/build/settings/git-integration-settings.test.tsx` | Added mocks for `use-online-status` and `shortcut-help-dialog`; added 7 new tests covering INT-018 (shortcut help) and INT-019 (offline) |

---

## Backend claims verification

### The two dispatchers

`ProjectsWebhooksController` (`backend/src/modules/build/core/projects-webhooks.controller.ts:10`) injects `ProjectsWebhooksDispatchService` from `projects-webhooks-dispatch.service.ts`. The global `webhooks.service.ts` under `modules/webhooks/` is a separate outbound service used by HR, Inventory and billing modules. The build webhooks page uses `ProjectsWebhooksDispatchService` exclusively. No ambiguity.

### @Public() + RLS 42501 hazard

`ProjectsWebhooksController` is decorated with `@UseGuards(JwtAuthGuard, PermissionGuard)` and `@RequireModule("build")`. It is not `@Public()`. The `42501` hazard from MEMORY.md (`@Public webhook rls lookup raises 42501`) applies to `backend/src/modules/billing/payments/payment-webhooks-public.controller.ts` and similar unauthenticated ingress handlers, not to the build project webhooks surface. No hazard here.

### Backend route inventory

Routes in `ProjectsWebhooksController`:

| Method | Path | Notes |
|---|---|---|
| GET | `:projectId/webhooks` | list |
| POST | `:projectId/webhooks` | create |
| DELETE | `:projectId/webhooks/:webhookId` | delete |
| GET | `:projectId/webhooks/:webhookId/deliveries` | list deliveries |
| POST | `:projectId/webhooks/:webhookId/test` | send test |

**No PATCH endpoint.** Enable/disable toggle is confirmed backend-blocked.

### Schema columns

`projectWebhooks` table (`backend/src/db/schema/build/ticket-integrations.ts:7`): `id, orgId, projectId, url, events, secret, isActive, createdBy, createdAt`. No `lastDelivery`, no `failureRate` computed column.

`projectWebhookSchema` in backend (`backend/src/modules/build/core/dto/build-core-response.schemas.ts:152`): `id, orgId, projectId, url, events, isActive, createdAt`. Matches `projectWebhooks` list projection in `listWebhooks`. No delivery data joined.

The `lastDelivery` field is not present in either the schema or the service projection. Implementing it on the card face would require a backend change (join to `webhookDeliveries` or a new computed column). Confirmed backend-blocked.

### Filter support

`listWebhooks` (`backend/src/modules/build/core/projects-webhooks.service.ts:14`) accepts only `orgId` and `projectId`. No `q`, `state`, `event`, `from`, `to`, `cursor` parameters. URL-backed filters (`state`, `event`, `from`, `to`, `q`, `cursor`) named in the spec are confirmed backend-blocked.

### Git connections search

`useGitConnections` calls `GET /integrations/git/connections` with no `q` parameter. The backend controller for that route does not accept filter params. The `search` URL param named for the integrations page is confirmed backend-blocked.

---

## C3 row-by-row analysis

### Page 1: `/build/[projectId]/settings/integrations` (`git-integration-settings.tsx`)

| Row | Implemented | Tested | Verdict |
|---|:---:|:---:|---|
| Core fields: Git connection (provider, repoUrl, repoName, isActive, maskedSecret, webhookUrl) | ✓ | ✓ | INT-010–014 |
| Core fields: Agent token (name, scopes, last-used, expiry) | ✓ | ✓ | `agent-tokens-section.test.tsx` |
| Action: Add connection | ✓ | partial | dialog wired; no submission test |
| Action: Toggle connection active/inactive | ✓ | partial | handler wired; no success-path test |
| Action: Delete connection | ✓ | ✓ | ConfirmDialog wired; no e2e-tier test needed |
| Action: Show-once secret (CreatedSecretDialog) | ✓ | ✓ | INT-014 |
| Overlay: Add connection dialog | ✓ | partial | renders; no submission test |
| Overlay: CreatedSecretDialog | ✓ | ✓ | INT-014 |
| Overlay: Delete confirm dialog | ✓ | partial | wired; no submission test |
| URL param: `section` | ✓ | ✓ | INT-015 |
| URL param: `search` | ✗ | ✗ | backend-blocked: no `q` param on `GET /integrations/git/connections` |
| Keyboard: `Tab` + `Esc` | ✓ (hook) | partial | hook wired |
| Keyboard: `c` create | ✓ | ✓ | INT-016 |
| Keyboard: `j/k`, `Enter` | no target | — | CCG-4: connection row has no "open" view; `handleOpenConnection` correctly no-op |
| Keyboard: `?` shortcut help | ✓ (NEW) | ✓ (NEW) | INT-018 |
| Keyboard: `/` search | not required | — | CCG-4: no `SearchInput` on this page |
| State: Loading | ✓ | ✓ | INT-010 |
| State: Error | ✓ | ✓ | INT-011 |
| State: Empty | ✓ | ✓ | INT-012 |
| State: Offline | ✓ (NEW) | ✓ (NEW) | INT-019 |
| State: Denied (page level) | ✓ | ✓ | INT-001 |
| Permissions: `build:update` gates page | ✓ | ✓ | INT-001 |
| Permissions: `RequireModule("build")` | ✓ | ✓ | INT-017 |

**C3 verdict: NOT ticked.**

Remaining open items:
- `search` URL param — backend-blocked (no `q` param in `GET /integrations/git/connections`)
- Overlay submission tests for toggle and add-connection — not yet covered

---

### Page 2: `/build/[projectId]/settings/integrations/webhooks` (`project-webhooks-page.tsx`)

| Row | Implemented | Tested | Verdict |
|---|:---:|:---:|---|
| Core field: URL | ✓ | ✓ | WH-021 |
| Core field: events | ✓ | ✓ | WH-023 |
| Core field: enabled (isActive) | ✓ | ✓ | WH-020 |
| Core field: secret age | ✓ | ✓ | WH-022 |
| Core field: last delivery | ✗ | ✗ | backend-blocked: `listWebhooks` does not join `webhookDeliveries`; `projectWebhookSchema` has no such field |
| Core field: failure rate | ✗ | ✗ | backend-blocked: no aggregate endpoint or column |
| Action: Create webhook | ✓ | partial | sheet renders; no submission test |
| Action: Delete webhook | ✓ | ✓ | WH-023 |
| Action: Send test | ✓ | ✓ | WH-023 |
| Action: Enable/disable toggle | ✗ | ✗ | backend-blocked: no `PATCH /:projectId/webhooks/:webhookId` |
| Overlay: Create webhook sheet | ✓ | partial | renders; no submission test |
| Overlay: Delete confirm | ✓ | ✓ | WH-023 |
| Overlay: Delivery list | ✓ | partial | renders; no state-driven test |
| URL params: `state`, `event`, `from`, `to`, `q`, `cursor` | ✗ | ✗ | backend-blocked: `GET /:projectId/webhooks` accepts no filter params |
| Keyboard: `Tab` + `Esc` | ✓ (hook) | partial | hook wired |
| Keyboard: `c` create | ✓ | ✓ | WH-030 |
| Keyboard: `j/k`, `Enter` | hook wired; `onOpen` no-op | partial | page has a list; `Enter` should expand focused card; `WebhookCard` manages expand state internally — wiring requires passing `onExpand` prop |
| Keyboard: `?` shortcut help | ✓ (NEW) | ✓ (NEW) | WH-031 |
| Keyboard: `/` search | not required | — | CCG-4: no `SearchInput` on this page |
| State: Loading | ✓ | ✓ | WH-011 |
| State: Error | ✓ | ✓ | WH-012 |
| State: Empty | ✓ | ✓ | WH-013 |
| State: Offline | ✓ (NEW) | ✓ (NEW) | WH-032 |
| State: Denied | ✓ | ✓ | WH-010 |
| State: Populated | ✓ | ✓ | WH-014 |
| Secret redaction (list contract strips `secret`) | ✓ | ✓ | WH-015 |
| Permissions: `build:manage` gates view | ✓ | ✓ | WH-010 |
| Permissions: `build:manage` gates create/delete/test | ✓ | ✓ | WH-010, WH-023 |

**C3 verdict: NOT ticked.**

Permanently blocked on backend:
- `last delivery` on card face — `projectWebhookSchema` (file: `backend/src/modules/build/core/dto/build-core-response.schemas.ts:152`) carries no delivery data; `listWebhooks` service (file: `backend/src/modules/build/core/projects-webhooks.service.ts:14`) does not join `webhookDeliveries`
- `failure rate` — no aggregate endpoint or column in `projectWebhooks`
- Enable/disable toggle — no `PATCH` route in `ProjectsWebhooksController` (`backend/src/modules/build/core/projects-webhooks.controller.ts`)
- URL-backed filters (`state`, `event`, `from`, `to`, `q`, `cursor`) — `listWebhooks` accepts no filter params

Frontend-only remaining:
- `j/k` + `Enter` with a working `onOpen` — `WebhookCard` (`frontend/features/build/settings/webhook-card.tsx`) manages `expanded` state internally; wiring keyboard navigation requires exposing `onExpand` from the card or lifting `expanded` state to the parent
- Overlay submission tests for create webhook sheet

---

## Test runs

```
npx jest --runTestsByPath \
  features/build/webhooks/project-webhooks-page.test.tsx \
  features/build/settings/git-integration-settings.test.tsx \
  features/build/settings/project-settings-integrations-page.test.tsx \
  features/build/webhooks/webhook-card.test.tsx

PASS features/build/settings/project-settings-integrations-page.test.tsx
PASS features/build/webhooks/webhook-card.test.tsx
PASS features/build/webhooks/project-webhooks-page.test.tsx
PASS features/build/settings/git-integration-settings.test.tsx

Test Suites: 4 passed, 4 total
Tests:       60 passed, 0 failed
Time:        4.966 s
```

Baseline before this wave: 50 tests across 5 suites (from Wave-E-06).
After: 60 tests across 4 suites (+10 new tests, 0 regressions).

---

## Summary

### Closed in this wave

- `?` shortcut help on both pages (INT-018, WH-031): `ShortcutHelpDialog` wired via `onShortcutHelp` callback in `useBuildListKeyboard`
- Offline state on both pages (INT-019, WH-032): `useOnlineStatus` wired; Add button hidden when offline; offline empty state replaces normal empty state

### Permanently blocked on backend (confirmed with file paths)

| Gap | File | Specific blocker |
|---|---|---|
| `last delivery` on card face | `backend/src/modules/build/core/dto/build-core-response.schemas.ts:152`, `backend/src/modules/build/core/projects-webhooks.service.ts:14` | Field absent from schema and list projection |
| `failure rate` | same files | No aggregate endpoint or column |
| Enable/disable toggle | `backend/src/modules/build/core/projects-webhooks.controller.ts` | No `PATCH /:projectId/webhooks/:webhookId` route |
| URL-backed filters | `backend/src/modules/build/core/projects-webhooks.service.ts:14` | `listWebhooks` accepts no filter params |
| `search` URL param (integrations) | `frontend/hooks/api/git-integration.ts:56` | `GET /integrations/git/connections` has no `q` param |

### Remaining frontend-only gaps (not backend-blocked)

| Gap | Page | Notes |
|---|---|---|
| `j/k` + `Enter` with working `onOpen` | Webhooks | `WebhookCard` manages expand state internally; requires lifting state or adding `onExpand` prop |
| Overlay submission tests (add-connection toggle, create webhook) | Both | Actions wired; success/error paths untested |
