# Product Overview

## Route decision

- **Current/target route:** `/build/managed-products/[managedProductId]`
- **Scope:** managed product
- **Disposition:** **KEEP**
- **Decision:** Retain as a canonical page, subject to the gaps and acceptance criteria below.
- **User job:** Connect discovery, goals, roadmap, and delivery for a product.
- **Evidence:** `frontend/app/(authenticated)/build/managed-products/[managedProductId]/page.tsx`; Route existence verified in the repository; live behavior not directly observed with a valid detail record. **ASSUMPTION:** the page follows its source component until browser evidence is captured.

## Product contract

- **Purpose:** Manage products independently from delivery projects.
- **Primary persona:** Product manager.
- **Success metric:** Products with current outcome and roadmap evidence.
- **Required density:** compact by default with a comfortable-density toggle.
- **Core fields:** name, owner, status, goals, projects, feedback, updated.

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

Deep-linkable query parameters: `ownerId`, `status`, `q`, `sort`, `cursor`. Cursor may be shared only when it is stable for the same normalized filter/sort/access revision. Selection, open menus, drafts, and unsaved form state are not placed in the URL.

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

- Existing feature evidence: `@/features/build/overview/managed-product-overview-page`
- Reuse: `PageState`, `DataTable`, cursor controls, `FilterBar` target module, `EmptyState`, `EntityFormDialog`, `EntityFormSheet`, `ConfirmDialog`, status/priority chips, member picker, command palette, dirty-state guard.
- New only if absent: scope-specific summary/visualization or execution module. Promote a shared module only after a second real consumer.

## API and data contract

- **Endpoints:** GET/POST /build/managed-products.
- **Client schema/hooks:** `frontend/hooks/api/build/managed-products.ts; managed-products-schema.ts` where present.
- **List request:** `{ cursor?, limit<=100, q?, filters, sort }`; filters are the normalized URL state above.
- **List response:** `{ data: <row>[], pageInfo: { nextCursor, hasMore }, aggregates?, meta: { requestId, revision? } }`.
- **Detail response:** `{ data: { name, owner, status, goals, projects, feedback, updated, version, createdAt, updatedAt }, meta }`.
- **Mutation:** Zod-validated command, `Idempotency-Key` when retriable, `If-Match` for versioned updates; response returns the complete cache-patch projection.
- **Pagination:** cursor for unbounded activity/work; numbered pages only when an exact total is already computed cheaply.
- **Caching:** key includes scope, normalized filters, sort, cursor, and source revision. Standard list stale time 30 s; entity 60 s; live queues 0–15 s; reports 2 min.
- **Invalidation:** patch exact detail and every rendered collection first; invalidate only affected aggregates/ancestors after commit. Source-module projections follow source events and ACL revisions.

## Gaps

- **P0:** Verify route renders this contract rather than another page; add route/access/parent identity tests and complete loading/error/denied behavior.
- **P0:** Verify server/client Zod parity, bounded pagination, composite tenant predicates, and exact cache keys for every endpoint above.
- **P1 BLOCKED (BE):** the `owner` core field cannot be rendered — the managed-product detail response projects `ownerId`/`ownerMembershipId` only, and FE-85 forbids putting a raw id on screen. A resolved owner projection is required. The conflict state has no `version` or `If-Match` to build on.
- **P1 (other lane):** the page has no filter toolbar and no `/`, `c`, `e` or `?` shortcut. `frontend/features/build/overview/managed-product-overview-page.tsx` is outside the managed-products lane; route it to whoever owns `features/build/overview/`.
- **P1:** Complete URL-backed filters, saved views, keyboard/context actions, bulk semantics, mobile layout, and accessible chart/table alternatives.
- **P2:** Add realtime or AI only when it reduces a measured user delay and preserves deterministic non-AI operation.

## Acceptance criteria

- [x] The canonical route and disposition are implemented, with old callers and redirects covered by a route census.
- [x] The page satisfies the stated user job and success metric without duplicating another module owner.
- [ ] Every core field, action, overlay, query parameter, bulk action, shortcut, state, and permission above is implemented and tested.
  - 2026-09-27: `ownerId`→`managerId`, `status`, and `cursor`→`afterId` URL params are now wired in `OVERVIEW_FILTER_DEFINITIONS` and forwarded to `useProjects`; 5 new tests cover these params.
  - 2026-09-28 NOT EARNED, backend gap confirmed by reading the schema. `sort` is listed in the URL state section but `listProjectsSchema` is `.strict()` and declares no sort argument, so sending one is a 400. `sed -n '73,80p' backend/src/modules/build/core/dto/project-core.schemas.ts`:

    ```text
    export const listProjectsSchema = z.object({
      search: z.string().optional(),
      status: z.enum(["ACTIVE", "COMPLETED", "ARCHIVED", "ALL"]).default("ALL"),
      afterId: idCursorSchema,
      limit: pageSizeField(9),
      managedProductId: z.coerce.number().int().positive().optional(),
      managerId: z.string().optional(),
    }).strict();
    ```

    The schema is bound to the live read at `backend/src/modules/build/core/projects.controller.ts:65` (`@Validate({ query: listProjectsSchema })` on `@Get()`), and `backend/src/common/validation/zod-validation.interceptor.ts:30` calls `schemas.query.parse(req.query)`, so a `.strict()` miss is a 400 and not a silent strip.
    - **BE required:** add a sort field to `listProjectsSchema` (`backend/src/modules/build/core/dto/project-core.schemas.ts:73`), plus the matching `ORDER BY` in `ProjectsQueryService.listProjects`. A keyset list must keep the cursor and the sort in agreement, so the sort whitelist has to stay compatible with `afterId` descending-id paging.
  - 2026-09-28 second gap on this box: the four URL params are read and forwarded but the page renders **no filter toolbar at all** — the wireframe's "Filter and layout toolbar (URL-backed)" row has no control on `managed-product-overview-page.tsx`. The params are deep-linkable only. Re-verified on disk 2026-09-28: `OVERVIEW_FILTER_DEFINITIONS` is read at `:49-61` and forwarded into `useProjects` at `:64-74`, and the JSX from `:137` renders `PageWrapper` with no `filters` prop and no search input, owner select or status select anywhere. Not fixed here because the box cannot be earned while `sort` is a 400 — and because the page file is `frontend/features/build/overview/managed-product-overview-page.tsx`, outside this lane's write territory this wave.
  - 2026-09-28 per-item audit, third pass. Everything below was read on disk. **STILL NOT EARNED.** All remaining work is either backend-fenced or in `features/build/overview/`, which this lane may not write.
    - **Implemented (no action):** `name` (`PageWrapper title`, `:139`, with `key` as the badge) · `status` and `updated` (subtitle, `:141-145`) · `goals` (`StatCard`, `:164`, from `useGoalsPage().total`) · `projects` (`StatCard` `:156` plus the Linked projects card `:218-259`) · `feedback` (`StatCard` `:172`, summed from `insights.feedbackByStatus`) · loading skeleton, empty, error and denied states through `PageState` + `usePageState` with `error` passed (`:87-93`, FE-41) · permission `build:managed-products:view`, present in the frontend catalog (`lib/rbac/permissions/permission-key-business.ts:118`) and the backend catalog (`backend/src/modules/rbac/permissions/build.ts:262`), matching `@RequirePermission` on `@Get(":managedProductId")` and `@Get(":managedProductId/insights")` (`managed-products.controller.ts:71`, `:106`).
    - **`owner` core field — NOT RENDERED, BE required.** Nothing on the page shows an owner. The detail response gives only raw identifiers: `managedProductRowSchema` (`backend/src/modules/build/managed-products/dto/managed-products-response.schemas.ts:6-25`) projects `ownerId: z.string().nullable()` and `ownerMembershipId`, with no name, email or avatar. Rendering either one would put a raw id on screen, which FE-85 forbids. **BE required:** project a resolved `owner: { id, name, email, image } | null` onto the managed-product detail response, as `goalListItemSchema` already does for goals.
    - **Shortcuts `/`, `c`, `e`, `?` — NOT IMPLEMENTED.** `useBuildListKeyboard` is called at `:130-135` with `onOpen` and `onClearSelection` only, so `j/k`, `Enter` and `Esc` work over the linked-projects list and the other four are inert. `/` has no target precisely because the search control is missing (same defect as the toolbar gap above), so CCG-4 does not excuse it — the doc requires the search box. `c` and `e` have no create or edit affordance on this page at all. `?` is a one-line fix of the kind landed on the goals page this session, but the file is another lane's.
    - **Bulk action bar — NOT IMPLEMENTED.** No selection state, no bulk bar. A backing endpoint does exist (`@Post("bulk")`, `build:managed-products:update`, `managed-products.controller.ts:58-60`) and is already consumed by the managed-products **list** page's `managed-product-bulk-toolbar.tsx`, but it operates on managed products — it is not a bulk operation over this page's primary collection, which is linked projects. Decide the intended selection target before re-opening the box.
    - **Conflict state — NOT IMPLEMENTED, BE required.** `managedProductRowSchema` carries no `version` and `@Patch(":managedProductId")` takes no `If-Match`, so the declared field-level server/current comparison has nothing to compare.
    - **Note on the box's own premise:** this page has no mutation control of any kind — no create, rename, archive or inline edit — so the Create/Edit/Delete columns of the permission table are unexercised here rather than mis-gated. The title being non-interactive is compliant with the Elements section, which only requires interactivity when inline rename is authorized.
- [x] Lists are bounded/virtualized and remain usable at 10k work items and 1k members.
- [x] Server/client schemas, errors, cursor semantics, cache keys, optimistic patches, and invalidations have contract tests.
- [ ] Keyboard, screen-reader, reduced-motion, 375 px mobile, and high-density desktop checks pass.
- [ ] Production browser evidence confirms ready, empty, filtered-empty, error, denied, and conflict behavior without modifying real data.
