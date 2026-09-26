# G-04 Webhooks — wave report

Session-start SHA: pinned to HEAD at session start (see memory: Baseline SHA).

## Migration

No migration needed. `isActive` already exists on `project_webhooks` (added in `ticket-integrations.ts`). Delivery stats (`lastDeliveryAt`, `lastDeliveryStatus`, `failureRate`) are computed at query time from the existing `webhook_deliveries` table via a raw SQL CTE with window functions — no schema change required. Migration range 1320–1324 is entirely unused. The code is safe to deploy without any migration.

## What was delivered

### Backend

- `backend/src/modules/build/core/dto/webhook.schemas.ts` — added `updateWebhookSchema` (`{ isActive: boolean }`, `.strict()`) and `listWebhooksQuerySchema` (`state`, `event`, `q`, `cursor`, `.strict()`).
- `backend/src/modules/build/core/dto/build-core-response.schemas.ts` — extended `projectWebhookSchema` with `lastDeliveryAt` (nullableWireDate), `lastDeliveryStatus` (enum nullable), `failureRate` (number nullable); added `projectWebhookPageSchema = idCursorPageSchema(projectWebhookSchema)`.
- `backend/src/modules/build/core/projects-webhooks.service.ts` — `listWebhooks` accepts `ListWebhooksQuery`, applies state/event/q/cursor filters, fetches delivery stats for the whole result page in one raw SQL CTE batch (ROW_NUMBER OVER PARTITION for last delivery, COUNT CASE for failure rate), returns cursor page via `buildIdCursorPage`. New `updateWebhook(projectId, webhookId, input)` method.
- `backend/src/modules/build/core/projects-webhooks.controller.ts` — `GET /build/:projectId/webhooks` now uses `@ResponseSchema(projectWebhookPageSchema)` and `@Validate({ query: listWebhooksQuerySchema })`; added `PATCH /build/:projectId/webhooks/:webhookId` guarded by `@RequirePermission("build:manage")`.

### Frontend

- `frontend/hooks/api/build/build-project-schema.ts` — `projectWebhookSchema` extended with three new nullable fields; `projectWebhookPageContract = idCursorPageContract(projectWebhookSchema)`; `projectWebhookListContract` aliased to it.
- `frontend/hooks/api/build/webhooks.ts` — `useWebhooks` accepts `WebhookListFilters`, uses `select: (page) => page.data` to preserve existing array API; `useUpdateWebhook` added.
- `frontend/lib/query-keys/build-work.ts` — `webhooks` key factory accepts optional `filters` so filtered and unfiltered queries cache independently.
- `frontend/types/projects/webhooks.ts` — added `lastDeliveryAt?`, `lastDeliveryStatus?`, `failureRate?` (optional for backward compat with existing fixtures).
- `frontend/features/build/settings/webhook-card.tsx` — `LastDeliveryMeta` component (date + failure rate); enable/disable `Switch` (renders only when `canManage && onToggle` — fails closed, FE-44); `onToggle?(id, isActive)` prop.
- `frontend/features/build/webhooks/project-webhooks-page.tsx` — URL-backed filter bar (`state` Select, `event` Select, `q` Input with 300 ms debounce); `useUpdateWebhook` wired; `handleToggle` passed to `WebhookCard`; filtered-empty vs truly-empty empty states.

### Tests (61 passing, 0 failing)

Suites run:
```
npx jest --config jest.config.cjs --runTestsByPath \
  features/build/webhooks/webhook-card.test.tsx \
  hooks/api/build/webhooks-schema.test.ts \
  features/build/webhooks/project-webhooks-page.test.tsx
```

Real output:
```
PASS hooks/api/build/webhooks-schema.test.ts
PASS features/build/webhooks/webhook-card.test.tsx
PASS features/build/webhooks/project-webhooks-page.test.tsx (6.202 s)

Test Suites: 3 passed, 3 total
Tests:       61 passed, 61 total
Time:        8.141 s
```

New test suites added:
- `webhooks-schema.test.ts` — updated to cursor page format; covers `lastDeliveryAt`, `failureRate`, `lastDeliveryStatus` enum rejection, `hasMore`/`nextCursor`, `isActive` row rejection, filter key independence.
- `webhook-card.test.tsx` — WH-024 (5 tests): toggle renders/calls/hides; WH-025 (2 tests): last delivery date present/absent; WH-026 (2 tests): failure rate present/absent.
- `project-webhooks-page.test.tsx` — WH-015 updated to cursor page shape; WH-033 (4 tests): state/event/q controls render; all three controls present simultaneously.

## Acceptance criterion box 3 — NOT ticked

`from`/`to` date-range filters specified in the URL state section are not yet implemented (P1 gap, noted in the page's own Gaps section). All P0 items are done.

## Remaining gaps

- `from`/`to` webhook list date-range filters (P1)
- Mobile layout and screen-reader verification (P1)
- Production browser evidence for filtered-empty, conflict, and offline states
