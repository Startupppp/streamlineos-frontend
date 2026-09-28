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
- **P1 BLOCKED (BE-13):** `from` and `to` are listed as URL parameters above but `listWebhooksQuerySchema` at `backend/src/modules/build/core/dto/webhook.schemas.ts` uses `.strict()` and declares only `state`, `event`, `q`, and `cursor`. Wiring `from`/`to` client-side returns 400. Backend is fenced. Box stays unchecked until backend adds these fields.
- **P1:** Complete URL-backed filters, saved views, keyboard/context actions, bulk semantics, mobile layout, and accessible chart/table alternatives.
- **P2:** Add realtime or AI only when it reduces a measured user delay and preserves deterministic non-AI operation.

## Acceptance criteria

- [x] The canonical route and disposition are implemented, with old callers and redirects covered by a route census.
- [x] The page satisfies the stated user job and success metric without duplicating another module owner.
- [ ] Every core field, action, overlay, query parameter, bulk action, shortcut, state, and permission above is implemented and tested.
  - 2026-09-28 NOT EARNED, backend gap confirmed by reading the schema. `sed -n '17,22p' backend/src/modules/build/core/dto/webhook.schemas.ts`:

    ```text
    export const listWebhooksQuerySchema = z.object({
      state: z.enum(["active", "inactive"]).optional(),
      event: z.string().optional(),
      q: z.string().optional(),
      cursor: z.coerce.number().int().positive().optional(),
    }).strict();
    ```

    Bound at `backend/src/modules/build/core/projects-webhooks.controller.ts:44` (`@Validate({ params: projectIdParams, query: listWebhooksQuerySchema })` on `@Get(":projectId/webhooks")`); `backend/src/common/validation/zod-validation.interceptor.ts:30` does `schemas.query.parse(req.query)`, so an unrecognised key is a 400, not a silent strip. `from` and `to` are listed in the URL state section and cannot be wired client-side.
    - **BE required:** add `from` and `to` to `listWebhooksQuerySchema` at `backend/src/modules/build/core/dto/webhook.schemas.ts:17` (ISO-date strings, both optional, with a refinement that `to >= from`) and filter on `projectWebhooks.createdAt` — or on the delivery timestamp if the intent is "webhooks with deliveries in this window" — in `ProjectsWebhooksService.listWebhooks`. Do not relax `.strict()`.
  - 2026-09-28 everything on the box the backend already supports is now wired: `cursor` was the remaining unimplemented URL parameter and is done. `useWebhooks` (`hooks/api/build/webhooks.ts`) had `select: (page) => page.data`, which threw away `hasMore`/`nextCursor` and made paging impossible; it now returns the envelope (FE-31). The page pages through the shared `useBuildCursorPager`, serialising the cursor stack into the URL as `cursors`, and renders `TablePagination mode="cursor"` with `hideOnSinglePage` — prev/next over a keyset read, no reveal button and no faked page count (FE-125, FE-105). A filter or search write clears the stack in the same `router.replace`. 7 tests under `BLD-X-FE-SETTINGS-WH-034`.
  - 2026-09-28 also not on this page and not blocked by the backend: the wireframe's selection-aware **bulk action bar** has no counterpart here, and there is no bulk webhook endpoint to back one. Decide whether bulk enable/disable/delete is in scope for this page before the box is re-opened; the box as written asks for it.
- [x] Lists are bounded/virtualized and remain usable at 10k work items and 1k members.
- [x] Server/client schemas, errors, cursor semantics, cache keys, optimistic patches, and invalidations have contract tests.
- [ ] Keyboard, screen-reader, reduced-motion, 375 px mobile, and high-density desktop checks pass.
- [ ] Production browser evidence confirms ready, empty, filtered-empty, error, denied, and conflict behavior without modifying real data.
