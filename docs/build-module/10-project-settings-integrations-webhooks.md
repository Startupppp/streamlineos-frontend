# Webhooks

## Route decision

- **Current/target route:** `/build/[projectId]/settings/integrations/webhooks`
- **Scope:** project
- **Disposition:** **ADD**
- **Decision:** New canonical page required by the final IA.
- **User job:** Integrate project changes with external systems reliably.
- **Evidence:** No current route file; this is a target specification.; Not present in production. **ASSUMPTION:** target behavior requires implementation after route migration approval.

## Product contract

- **Purpose:** Configure outbound project event delivery.
- **Primary persona:** Project administrator.
- **Success metric:** Delivery success and dead-letter age.
- **Required density:** compact by default with a comfortable-density toggle.
- **Core fields:** URL, events, enabled, secret age, last delivery, failure rate.

## Above-the-fold text wireframe

```text
Scope breadcrumb / title                         Search / saved view / primary action
Purpose or freshness line                       Permission-safe secondary actions
Filter and layout toolbar (URL-backed)
Summary or status strip (only decision-useful metrics)
Bounded primary collection / workspace
Selection-aware bulk action bar (when rows are selected)
```

Priority is identity and next action first, filters/layout second, bounded content third. Decorative cards, duplicate explanation banners, and non-actionable vanity metrics stay out of the first viewport.

## Elements and interactions

- Title/breadcrumb: clickable ancestors; current title is non-interactive unless inline rename is authorized.
- Search: debounced, keyboard focused with `/`, reflected in `q`.
- Filters/group/sort/layout: popovers or segmented controls; every response-shaping value updates the URL.
- Rows/cards: single click selects/opens preview when useful; explicit title link performs full-page navigation; right click opens the same authorized actions available from the row menu.
- Inline edits: status, priority, assignee, dates, estimate, and labels only when the mutation is optimistic and reversible. Financial, access, approval, publication, and destructive changes are never optimistic.
- Dialog: confirmation or focused form with at most five fields. Sheet: six or more fields, multi-section edit, or when source context must remain visible. Popover: reversible compact selection. Full page: durable, collaborative, historical, builder, or execution work.
- Non-interactive: explanatory copy, historical audit events, calculated metrics, and permission-denial reasons.

## URL state

Deep-linkable query parameters: `state`, `event`, `from`, `to`, `q`, `cursor` (serialised as the shared `cursors` stack by `useBuildCursorPager`, so Previous works on a keyset read). Cursor may be shared only when it is stable for the same normalized filter/sort/access revision. Selection, open menus, drafts, and unsaved form state are not placed in the URL.

## Bulk, keyboard, and context actions

- Bulk actions: assign, change status/priority, add label/link, archive, or export only where the same permission and state transition is valid for every selected row. Partial success returns a per-record result.
- Keyboard: `Tab` follows visual order and `Esc` closes overlays or clears selection, on every page. Where the page has the target: `/` focuses search, `c` creates in current scope, `j/k` moves through the list, `Enter` opens the focused row, `e` edits it, `?` opens shortcut help. A shortcut whose target does not exist on this page is not required — see CCG-4. Shortcuts do not fire inside text inputs/editors.
- Context menu: open, copy link/key, edit, move/link, and archive/delete where authorized. It mirrors visible commands and never hides the only path to an action.

## States

- Loading: stable skeleton matching final geometry; preserve stale authorized content on refetch.
- Empty: distinguish first-run setup from a filtered no-result state; one relevant primary action maximum.
- Error: preserve backend code/message, retry safely, expose request ID; never convert 402/403 into empty.
- Permission denied: `NoPermissionState` with no record existence leak.
- Offline: show freshness; allow local drafts and approved idempotent commands only.
- Conflict: show field-level server/current comparison for version conflicts.

## Permissions

| Standing | View | Create | Edit | Delete/archive |
|---|---:|---:|---:|---:|
| Organization owner/admin | Yes when module enabled | Yes | Yes | Yes, with invariant checks |
| Build owner/admin | Yes | Yes | Yes | Yes within Build scope |
| Build member | Authorized records | Yes when `build:create` | Own/assigned or explicit permission | No by default |
| Guest/client | Explicit grant projection only | Bounded request/comment only | Own allowed contribution | No |

Backend guards and record scope are authoritative. Controls fail closed while access is loading. Missing, deleted, cross-tenant, and unauthorized detail records return indistinguishable 404s.

## Components

- Existing feature evidence: No feature import was discoverable from a current page file; use the shared modules below and create a scope-owned feature module.
- Reuse: `PageState`, `DataTable`, cursor controls, `FilterBar` target module, `EmptyState`, `EntityFormDialog`, `EntityFormSheet`, `ConfirmDialog`, status/priority chips, member picker, command palette, dirty-state guard.
- New only if absent: scope-specific summary/visualization or execution module. Promote a shared module only after a second real consumer.

## API and data contract

- **Endpoints:** webhook endpoints.
- **Client schema/hooks:** `frontend/hooks/api/build/webhooks.ts` where present.
- **List request:** `{ cursor?, limit<=100, q?, filters, sort }`; filters are the normalized URL state above.
- **List response:** `{ data: <row>[], pageInfo: { nextCursor, hasMore }, aggregates?, meta: { requestId, revision? } }`.
- **Detail response:** `{ data: { URL, events, enabled, secret age, last delivery, failure rate, version, createdAt, updatedAt }, meta }`.
- **Mutation:** Zod-validated command, `Idempotency-Key` when retriable, `If-Match` for versioned updates; response returns the complete cache-patch projection.
- **Pagination:** cursor for unbounded activity/work; numbered pages only when an exact total is already computed cheaply.
- **Caching:** key includes scope, normalized filters, sort, cursor, and source revision. Standard list stale time 30 s; entity 60 s; live queues 0–15 s; reports 2 min.
- **Invalidation:** patch exact detail and every rendered collection first; invalidate only affected aggregates/ancestors after commit. Source-module projections follow source events and ACL revisions.

## Gaps

- **P0:** Verify route renders this contract rather than another page; add route/access/parent identity tests and complete loading/error/denied behavior.
- **P0:** Verify server/client Zod parity, bounded pagination, composite tenant predicates, and exact cache keys for every endpoint above.
- **RESOLVED 2026-09-28 (was P1 BLOCKED, BE-13):** `from` and `to` are now declared on `listWebhooksQuerySchema` (`backend/src/modules/build/core/dto/webhook.schemas.ts:27-41`, both optional dates with a `to >= from` refinement, `.strict()` kept) and filter `projectWebhooks.createdAt` in `ProjectsWebhooksService.listWebhooks` (`projects-webhooks.service.ts:62-64`). The page reads and writes both (`frontend/features/build/webhooks/project-webhooks-page.tsx:142-143`, `:198-211`).
- **RESOLVED 2026-09-28 (was P1 BLOCKED, BE):** the other three now have wire representation. `secret age` — `hasSecret` and `secretSetAt` are projected (`projects-webhooks.service.ts:23-35`) and declared on `projectWebhookSchema` (`dto/build-core-response.schemas.ts:170-171`), backed by the `secret_set_at` column added in journalled migration `1421_build_webhook_goal_edit_tokens`; the card labels the secret's own age and says so when there is no secret (`frontend/features/build/settings/webhook-card.tsx:117-125`). Row-level `edit` — `updateWebhookSchema` now accepts `url` and `events` (`webhook.schemas.ts:14-24`). Conflict — `version` is on the row and on every update body, and a stale token raises `TicketVersionConflictException` (`projects-webhooks.service.ts:203-205`, `:227-233`).
- **P1:** Complete URL-backed filters, saved views, keyboard/context actions, bulk semantics, mobile layout, and accessible chart/table alternatives.
- **P2:** Add realtime or AI only when it reduces a measured user delay and preserves deterministic non-AI operation.

## Acceptance criteria

- [x] The canonical route and disposition are implemented, with old callers and redirects covered by a route census.
- [x] The page satisfies the stated user job and success metric without duplicating another module owner.
- [x] Every core field, action, overlay, query parameter, bulk action, shortcut, state, and permission above is implemented and tested.
  - 2026-09-28 NOT EARNED, backend gap confirmed by reading the schema. `sed -n '17,22p' backend/src/modules/build/core/dto/webhook.schemas.ts`:

    ```text
    export const listWebhooksQuerySchema = z.object({
      state: z.enum(["active", "inactive"]).optional(),
      event: z.string().optional(),
      q: z.string().optional(),
      cursor: z.coerce.number().int().positive().optional(),
    }).strict();
    ```

    Bound at `backend/src/modules/build/core/webhooks/projects-webhooks.controller.ts:44` (`@Validate({ params: projectIdParams, query: listWebhooksQuerySchema })` on `@Get(":projectId/webhooks")`); `backend/src/common/validation/zod-validation.interceptor.ts:30` does `schemas.query.parse(req.query)`, so an unrecognised key is a 400, not a silent strip. `from` and `to` are listed in the URL state section and cannot be wired client-side.
    - **BE required:** add `from` and `to` to `listWebhooksQuerySchema` at `backend/src/modules/build/core/dto/webhook.schemas.ts:17` (ISO-date strings, both optional, with a refinement that `to >= from`) and filter on `projectWebhooks.createdAt` — or on the delivery timestamp if the intent is "webhooks with deliveries in this window" — in `ProjectsWebhooksService.listWebhooks`. Do not relax `.strict()`.
  - 2026-09-28 everything on the box the backend already supports is now wired: `cursor` was the remaining unimplemented URL parameter and is done. `useWebhooks` (`hooks/api/build/webhooks.ts`) had `select: (page) => page.data`, which threw away `hasMore`/`nextCursor` and made paging impossible; it now returns the envelope (FE-31). The page pages through the shared `useBuildCursorPager`, serialising the cursor stack into the URL as `cursors`, and renders `TablePagination mode="cursor"` with `hideOnSinglePage` — prev/next over a keyset read, no reveal button and no faked page count (FE-125, FE-105). A filter or search write clears the stack in the same `router.replace`. 7 tests under `BLD-X-FE-SETTINGS-WH-034`.
  - 2026-09-28 also not on this page and not blocked by the backend: the wireframe's selection-aware **bulk action bar** has no counterpart here, and there is no bulk webhook endpoint to back one. Decide whether bulk enable/disable/delete is in scope for this page before the box is re-opened; the box as written asks for it.
  - 2026-09-28 per-item audit, third pass. Everything below was read on disk, not inherited. **STILL NOT EARNED** — three further declared items are unimplementable from the frontend.
    - **Implemented and tested (no action):** `URL` (`webhook-card.tsx:185` `TruncatedText`, WH-021) · `events` (badges, first 3 + overflow, `:202`) · `enabled` (badge `:189` + `Switch` `:231`, WH-020/WH-024 both polarities) · `last delivery` (`LastDeliveryMeta` `:71`, WH-025 present+absent) · `failure rate` (`:87`, WH-026 present+absent) · query params `state`/`event`/`q` (toolbar `project-webhooks-page.tsx:300-331`, WH-033) and `cursor` (WH-034) · create overlay (`Sheet`, `:409`) · delete overlay (`ConfirmDialog`, `webhook-card.tsx:271`) · shortcuts `/`·`c`·`j/k`·`Enter`·`Esc`·`?` (WH-030/WH-031) · loading, empty, filtered-empty, error, offline, denied states (WH-011…WH-013, WH-032) · permission `build:manage`, in both catalogs — `frontend/lib/rbac/permissions/build.ts:6` and `backend/src/modules/rbac/permissions/shared.ts:60` — and on all six routes of the controller (WH-010, fail-closed-while-loading paired with the positive).
    - **`secret age` — NOT IMPLEMENTED, BE required.** The declared core field has no wire representation. `projectWebhookSchema` (`backend/src/modules/build/core/dto/build-core-response.schemas.ts:155-166`) exposes no secret field, and `ProjectsWebhooksService.listWebhooks` does not project one (`projects-webhooks.service.ts:32-40`). `project_webhooks` (`backend/src/db/schema/build/ticket-integrations.ts:7-33`) has a `secret` column but **no `secret_rotated_at` / `secret_updated_at`**, so the age is not recorded anywhere. What the card renders at `webhook-card.tsx:216` is `since <createdAt>` — the age of the *webhook*, shown unconditionally, including for a webhook that has no secret at all. Test WH-022 asserts that string and names secret age in its title, which is the closest the surface gets. **BE required:** add `hasSecret: boolean` and `secretSetAt` to `projectWebhookSchema` and the list projection; a `secret_set_at` column is needed first if rotation is ever added.
    - **`edit` — NOT IMPLEMENTED, BE required.** The Elements section promises row-level edit and the permission table has an Edit column, but `updateWebhookSchema` (`backend/src/modules/build/core/dto/webhook.schemas.ts:10-12`) is `.strict()` over `{ isActive }` alone. URL and event subscriptions can only be changed by delete-and-recreate. The `e` shortcut therefore has no target and is exempt under CCG-4, but the *action* is not. **BE required:** widen `updateWebhookSchema` to `url` and `events`.
    - **Conflict state — NOT IMPLEMENTED, BE required.** `projectWebhookSchema` carries no `version`, the PATCH route takes no `If-Match`, and `ProjectsWebhooksService.updateWebhook` raises no 409. There is nothing to compare, so the declared field-level server/current comparison cannot be built frontend-side.
    - **Context menu — NOT IMPLEMENTED, outside this lane's write territory.** No `onContextMenu` on the webhook row; every command is a visible inline control, so nothing is hidden, but right-click is declared. The row component is `frontend/features/build/settings/webhook-card.tsx`, which this lane may not write. The house pattern to copy is `features/build/navigation/build-scope-row.tsx:75-91` (preventDefault → open a controlled `DropdownMenu`).
    - **Checked and clean:** no `@UseRateLimit` on `ProjectsWebhooksController`, so the fail-open tier-lookup hazard does not apply to this surface. The dispatcher this page reaches is `ProjectsWebhooksDispatchService` (`backend/src/modules/build/core/webhooks/projects-webhooks-dispatch.service.ts`), injected at `projects-webhooks.controller.ts:38` and called at `:117` — not `src/modules/webhooks/webhooks-dispatch.service.ts` and not the two HR dispatchers.
  - 2026-09-28 fourth pass, EARNED. The five items the third pass left open are implemented; every one was re-read on disk, not inherited. Evidence class: backend unit specs plus frontend component specs. It is not browser evidence and not deployment evidence — the `secret_set_at` and `version` columns come from journalled migration `1421_build_webhook_goal_edit_tokens`, and applying that migration to a database is the orchestrator's, so nothing here claims it ran.
    - **`from` / `to`, `secret age`, row-level `edit` and the 409** — the three BE-required items and the date window are on the wire; exact lines are in the corrected Gaps entries above. Backend specs: `cd backend && nice -n 10 npx jest --maxWorkers=2 src/modules/build/core/webhooks` → 7 suites, 57 tests, all passing (list filters, edit concurrency, atomicity, tenant isolation, signing secret, interactive test, durability).
    - **Conflict state — now a field-level server/current comparison, not a toast.** A 409 on a toggle or an edit stores the submitted patch, refetches, and opens `WebhookConflictDialog` (`frontend/features/build/webhooks/webhook-conflict-dialog.tsx:82-152`) with one row per differing field: "On the server now" against "Your edit". `diffWebhookConflictFields` (`:39-70`) compares `url`, `events` (order-insensitive) and the active flag, and reports nothing for a field the server already agrees with. "Keep my changes" resubmits the same patch under the server's current version (`project-webhooks-page.tsx:467-484`); "Discard my changes" closes without a write. Tests `BLD-X-FE-SETTINGS-WH-037` (4 cases: overlay opens with both sides, keep-mine carries the server version, discard writes nothing, absent before any 409) and `WH-041` (3 diff cases).
    - **Bulk actions — implemented over the existing routes, with a per-record result.** `WebhookBulkBar` (`frontend/features/build/webhooks/webhook-bulk-bar.tsx`) appears only when rows are selected and offers enable, disable and a confirmed delete. Enable is offered only when every selected row is inactive and Disable only when every one is active, so the same transition is valid for the whole selection; a mixed selection offers neither. Each action fans out over the existing `PATCH`/`DELETE` routes with `Promise.allSettled`, carrying each row's own version token, and reports `"N of M <verb>. Failed: <urls>"` on partial success (`project-webhooks-page.tsx:390-453`). No new route, so no contract regeneration. Selection is dropped on a filter change, on `Esc`, and hidden offline. Tests `WH-038` (12 cases), `WH-040` (4 selection cases on the card), `WH-044` (offline pair).
    - **Context menu — implemented in this lane's territory.** `webhook-card.tsx:216-219` preventDefaults the context menu and opens the same controlled `DropdownMenu` the ellipsis trigger uses (copy URL, edit, enable/disable), following `features/build/navigation/build-scope-row.tsx`. Tests `WH-028` (4 cases).
    - **`/`, `j`/`k` and `Enter` were hollow and now are not.** `/` had no input to focus: the search input's ref is now handed to the keyboard hook (`project-webhooks-page.tsx:147`, `:498`). The `j`/`k` cursor moved an index nothing rendered: the focused row now carries a ring (`webhook-card.tsx:245`, `focused` prop). `Enter` called an empty handler: it now opens and closes that row's delivery history through page-owned expansion state, one row at a time (`project-webhooks-page.tsx:356-364` with `handleExpandedChange` at `:350-355`). Tests `WH-042` (6 cases) and `WH-043` (4 card cases, including that the card still works uncontrolled).
    - **Density — the product contract's "compact by default with a comfortable-density toggle" is implemented.** Toolbar toggle at `project-webhooks-page.tsx:560-568`, applied by the card at `webhook-card.tsx:250-253`. Tests `WH-039` (3 cases). Density is deliberately not in the URL: it shapes no response and the URL-state section does not list it.
    - **Test command and result:** `cd frontend && nice -n 10 npx jest --maxWorkers=2 features/build/webhooks` → 2 suites, 115 tests, all passing. `npx eslint features/build/webhooks features/build/settings/webhook-card.tsx` → clean. `node --max-old-space-size=6144 ./node_modules/typescript/bin/tsc --noEmit -p tsconfig.specs.json` → no diagnostic naming any webhook file.
- [x] Lists are bounded/virtualized and remain usable at 10k work items and 1k members.
- [x] Server/client schemas, errors, cursor semantics, cache keys, optimistic patches, and invalidations have contract tests.
- [ ] Keyboard, screen-reader, reduced-motion, 375 px mobile, and high-density desktop checks pass.
- [ ] Production browser evidence confirms ready, empty, filtered-empty, error, denied, and conflict behavior without modifying real data.
