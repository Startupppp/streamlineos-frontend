# Wave-B-04 Requests

## WAVE-B-04-REQ-01: Backend PATCH endpoint for webhook enable/disable

**Blocking C3 for `10-project-settings-integrations-webhooks.md`.**

The spec's "enabled" core field requires a toggle action. The `projectWebhooks` table has `isActive boolean`. The backend controller (`projects-webhooks.controller.ts`) has no `PATCH /:projectId/webhooks/:webhookId` endpoint. Adding one requires:
- New service method `updateWebhook(orgId, projectId, webhookId, { isActive })` in `ProjectsWebhooksService`
- New controller route `PATCH :projectId/webhooks/:webhookId` with `@RequirePermission("build:manage")`
- Frontend `useUpdateWebhook` hook and toggle button in `WebhookCard`

Precedent: `git-connections.service.ts` / `git-connections.controller.ts` have the same pattern (update toggles `isActive`).

---

## WAVE-B-04-REQ-02: Backend failure-rate aggregate for webhook card

**Blocking C3 for `10-project-settings-integrations-webhooks.md`.**

The spec's "failure rate" core field requires an aggregate per webhook. No such endpoint exists. Implementing it would require:
- A new query in `ProjectsWebhooksService` joining `webhookDeliveries` with `projectWebhooks`, computing `failed / total` over a time window
- A new `GET /:projectId/webhooks/:webhookId/stats` endpoint (or include the aggregate in `listWebhooks`)
- Frontend contract update and display in `WebhookCard`

---

## WAVE-B-04-REQ-03: Show auto-generated signing secret once after webhook creation

Currently if a user creates a webhook without supplying a `secret`, the backend auto-generates one (`generateWebhookSecret()`), stores it, and returns the webhook row without the secret. The user never sees their auto-generated secret, so they cannot verify webhook signatures.

The fix mirrors the git-connection pattern:
- `createWebhook` response should include `webhookSecret: z.string()` (once only)
- The frontend should display a show-once dialog (analogous to `CreatedSecretDialog`) after creation
- The list response should continue to omit the raw secret

**Note**: Wave-B-03's `agent-token-create-dialog.tsx` solves the same show-once problem. If a shared `ShowOnceSecretDialog` component is promoted to `components/shared/`, this page should use it rather than creating a new one.

---

## WAVE-B-04-REQ-04: URL-backed filters for both integrations pages

**Blocking C3 for both pages.**

Both spec files declare URL state (`section`+`search` for integrations; `state`+`event`+`from`+`to`+`q`+`cursor` for webhooks). Neither is implemented. This is marked P1 in both spec gap sections. Implementing URL-backed filters for the webhooks page requires:
- A `FilterBar` over `state` (enabled/disabled) and `event` subscription
- URL sync via `router.replace` (FE-86)
- Server-side filtering in `listWebhooks` (add optional `isActive?: boolean`, `event?: string`, `q?: string` query params to the backend controller)
