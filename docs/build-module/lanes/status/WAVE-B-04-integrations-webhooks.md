# Wave-B-04 — Integrations & Webhooks Status

## Pages owned
- `docs/build-module/10-project-settings-integrations.md`
- `docs/build-module/10-project-settings-integrations-webhooks.md`

---

## Webhook dispatcher verdict

There are two distinct webhook dispatchers in this codebase:

| Dispatcher | File | Table read | Delivery pattern |
|---|---|---|---|
| **ProjectsWebhooksDispatchService** | `backend/src/modules/build/core/projects-webhooks-dispatch.service.ts` | `projectWebhooks` | Outbox-backed (transactional, durable) |
| WebhooksDispatchService | `backend/src/modules/webhooks/webhooks-dispatch.service.ts` | `webhookEndpoints` | Fire-and-forget with `registerAfterCommit` |

The build settings page (`/build/[projectId]/settings/integrations/webhooks`) exclusively uses `ProjectsWebhooksDispatchService`. Every endpoint in `ProjectsWebhooksController` routes through `ProjectsWebhooksService` + `ProjectsWebhooksDispatchService`. The automation module's `WebhooksDispatchService` reads a different table (`webhookEndpoints`, not `projectWebhooks`) and is not connected to this page.

**The page drives the correct dispatcher.**

---

## @Public webhook RLS verdict

`IntegrationsGitController` (`backend/src/modules/integrations/git/integrations-git.controller.ts`) is decorated `@Public()`. Its handler calls `app.resolve_git_connection_org_id(${connectionId})` via a raw SQL SECURITY DEFINER function before establishing tenant context, then wraps all tenant-scoped work in `runInTenantTransaction`. This is the documented house fix (copy of migration 1057 pattern). **The @Public RLS defect does not apply here** — the service uses the SECURITY DEFINER function, not an RLS-scoped lookup without tenant context.

---

## Signing secret exposure verdict

**Project webhooks page (`/webhooks`):**
- `listWebhooks` projects: id, orgId, projectId, url, events, isActive, createdAt — no `secret` field.
- `createWebhook` returns the same projection — secret is also absent from the create response.
- The frontend `projectWebhookSchema` has no `secret` field; Zod strips any `secret` key the backend might accidentally include. Verified by test `BLD-X-FE-SETTINGS-WH-015`.
- The form has a `secret` field (type="password") the user can set; if left blank the backend auto-generates one. The auto-generated secret is never shown to the user. This is a UX gap but not a secret-re-rendering defect. Filed as a request.

**Integrations page (git connections):**
- `listConnections` returns `maskedSecret` (prefix + dots), not the raw secret. The `gitConnectionListContract` schema validates only `maskedSecret: z.string()`. Verified by test `BLD-X-FE-SETTINGS-INT-014`.
- `createConnection` returns `webhookSecret: z.string()` (the full secret, once). The `CreatedSecretDialog` renders it once at creation time — code confirmed at `git-created-secret-dialog.tsx:65`.
- **Note for Wave-A browser-spec agent**: `CreatedSecretDialog` renders the raw secret as `{created.webhookSecret}` inside a `<code>` element. The copy button has `label="Secret"`. If the browser assertion checks for a masked prefix, it will fail — the secret is the full raw value here.

---

## C3 row-by-row table

### Page 1: `/build/[projectId]/settings/integrations`

| Row | Implemented | Tested | Notes |
|---|:---:|:---:|---|
| **Core fields** | | | |
| Git connection: provider | ✓ | ✓ | Select in add dialog, icon in ConnectionRow |
| Git connection: repoUrl | ✓ | ✓ | Required field in dialog |
| Git connection: repoName | ✓ | ✓ | Optional display name |
| Git connection: isActive | ✓ | ✓ | Toggle via updateConnection |
| Git connection: maskedSecret | ✓ | ✓ | List returns prefix only |
| Git connection: webhookUrl | ✓ | ✓ | Shown in CreatedSecretDialog |
| **Actions** | | | |
| Add connection | ✓ | ✓ | Dialog with 3 fields |
| Toggle active/inactive | ✓ | partial | onToggle wired, no dedicated test |
| Delete connection | ✓ | partial | ConfirmDialog, no dedicated test |
| Show-once secret | ✓ | ✓ | CreatedSecretDialog renders raw secret once |
| **Overlays** | | | |
| Add connection dialog | ✓ | partial | Renders; form fields; no submission test |
| CreatedSecretDialog | ✓ | ✓ | Secret visible, never re-shown |
| Delete confirm dialog | ✓ | partial | ConfirmDialog destructive; no submission test |
| **URL state** | | | |
| `section` param | ✗ | ✗ | Tab state is local; not URL-backed |
| `search` param | ✗ | ✗ | No search bar implemented |
| **States** | | | |
| Loading | ✓ | ✓ | Skeleton rows in git-integration-settings |
| Empty | ✓ | ✓ | EmptyState with add action |
| Error | ✓ | ✓ | ErrorState with retry |
| Denied (page level) | ✓ | ✓ | PageState gates on build:update |
| **Permissions** | | | |
| build:update gates page | ✓ | ✓ | usePageState with permission |
| integrations:git:view gates data | ✓ | partial | useGatedQuery, no explicit test |

**C3 verdict for Page 1: NOT ticked.**  
Blocking gaps: `section` and `search` URL params not implemented.

---

### Page 2: `/build/[projectId]/settings/integrations/webhooks`

| Row | Implemented | Tested | Notes |
|---|:---:|:---:|---|
| **Core fields** | | | |
| URL | ✓ | ✓ | TruncatedText in WebhookCard |
| events | ✓ | ✓ | Badges (up to 3 + overflow) |
| enabled (isActive) | ✓ (NEW) | ✓ (NEW) | Badge: "Enabled"/"Disabled" — BLD-X-FE-SETTINGS-WH-020 |
| secret age | ✓ (approx, NEW) | ✓ (NEW) | createdAt shown as "since [month year]" — BLD-X-FE-SETTINGS-WH-022 |
| last delivery | partial | partial | Visible in expanded delivery list; no summary on card face |
| failure rate | ✗ | ✗ | No backend aggregate endpoint; requires PATCH/metrics route |
| **Actions** | | | |
| Create webhook | ✓ | ✓ | Sheet form with URL, events, secret |
| Delete webhook | ✓ | ✓ | ConfirmDialog destructive |
| Send test | ✓ | ✓ | POST to /test, result shown in delivery list |
| Enable/disable toggle | ✗ | ✗ | No PATCH endpoint in backend controller |
| **Overlays** | | | |
| Create webhook sheet | ✓ | partial | Sheet renders; permission tests exist |
| Delete confirm dialog | ✓ | ✓ | ConfirmDialog destructive |
| Delivery list (expanded) | ✓ | partial | AnimatePresence expand, no test |
| **Query parameters** | | | |
| `state`, `event`, `from`, `to` | ✗ | ✗ | No filter bar; P1 per spec |
| `q` (search) | ✗ | ✗ | P1 per spec |
| `cursor` | ✗ | ✗ | List is bounded (20 rows); P1 for pagination |
| **Bulk actions** | | | |
| (none specified for webhooks) | N/A | N/A | No bulk operations defined in spec |
| **Keyboard shortcuts** | | | |
| `/` search, `c` create, etc. | ✗ | ✗ | P1 per spec |
| **States** | | | |
| Loading | ✓ | ✓ (NEW) | PageState skeleton — BLD-X-FE-SETTINGS-WH-011 |
| Empty | ✓ | ✓ (NEW) | EmptyState via PageState — BLD-X-FE-SETTINGS-WH-013 |
| Error | ✓ | ✓ (NEW) | PageState error — BLD-X-FE-SETTINGS-WH-012 |
| Denied | ✓ (fixed) | ✓ (NEW) | Was `return null`; now PageState denied — BLD-X-FE-SETTINGS-WH-010 |
| Populated | ✓ | ✓ (NEW) | Cards render — BLD-X-FE-SETTINGS-WH-014 |
| **Permissions** | | | |
| build:manage gates view | ✓ | ✓ | usePageState with permission |
| build:manage gates create | ✓ | ✓ | useAuthorizedMutation |
| build:manage gates delete | ✓ | ✓ | useAuthorizedMutation |
| build:manage gates send test | ✓ | ✓ | useAuthorizedMutation |
| build:manage gates Add Webhook button | ✓ | ✓ | useCan gating — BLD-X-FE-SETTINGS-WH-010 |

**C3 verdict for Page 2: NOT ticked.**  
Blocking gaps:
- `failure rate` field: no backend aggregate endpoint exists; implementing it would require a new backend route and DB query with no migration.
- Enable/disable toggle: no `PATCH /build/:projectId/webhooks/:webhookId` endpoint in backend.
- URL-backed filters (`state`, `event`, `from`, `to`, `q`, `cursor`): P1 per spec gaps; not yet implemented.

---

## Files changed

| File | Change |
|---|---|
| `frontend/features/build/webhooks/project-webhooks-page.tsx` | Replaced manual `accessState` guard with `usePageState` + `<PageState>`; imports `ErrorState` dropped (handled by PageState); `isEmpty` prop drives empty state |
| `frontend/features/build/settings/webhook-card.tsx` | Added `isActive` badge (Enabled/Disabled); added `createdAt` display ("since [month year]") |
| `frontend/features/build/webhooks/project-webhooks-page.test.tsx` | Replaced 3 tests with 13 tests covering all states, populated, secret contract |
| `frontend/features/build/webhooks/webhook-card.test.tsx` | NEW — 6 tests: isActive field, URL field, secret age, mutation controls |
| `frontend/features/build/settings/git-integration-settings.test.tsx` | NEW — 8 tests: loading, error, empty, populated, CreatedSecretDialog secret contract |
| `backend/src/modules/build/core/projects-webhooks.controller.ts` | Fixed `deleteWebhook` params schema: `projectId: z.string().min(1)` → `z.coerce.number().int().positive()`; removed duplicate `projectIdwebhookIdParams_` |

---

## Test commands run and results

```
cd frontend && npx jest --runTestsByPath features/build/webhooks/project-webhooks-page.test.tsx
  13 passed, 0 failed

cd frontend && npx jest --runTestsByPath features/build/webhooks/webhook-card.test.tsx
  6 passed, 0 failed

cd frontend && npx jest --runTestsByPath features/build/settings/git-integration-settings.test.tsx
  8 passed, 0 failed

cd frontend && npx jest --runTestsByPath features/build/settings/project-settings-integrations-page.test.tsx
  3 passed, 0 failed

cd frontend && npx jest --runTestsByPath hooks/api/build/webhooks-schema.test.ts
  11 passed, 0 failed

cd backend && npx jest --runTestsByPath src/modules/build/core/projects-webhooks-signing-secret.spec.ts src/modules/build/core/projects-webhooks-tenant-isolation.spec.ts
  10 passed, 0 failed

cd backend && npx jest --runTestsByPath src/modules/build/core/projects-webhooks-durability.spec.ts src/modules/build/core/projects-webhooks-interactive-test.spec.ts
  6 passed, 0 failed
```

Total: 57 tests, 0 failures.

---

## Requests filed

See `docs/build-module/lanes/requests/WAVE-B-04.md`.
