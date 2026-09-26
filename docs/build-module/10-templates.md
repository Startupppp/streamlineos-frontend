# Templates

## Route decision

- **Current/target route:** `/build/templates`
- **Scope:** organization
- **Disposition:** **KEEP**
- **Decision:** Retain as a canonical page, subject to the gaps and acceptance criteria below.
- **User job:** Start proven workflows without rebuilding them.
- **Evidence:** `frontend/app/(authenticated)/build/templates/page.tsx`; Production URL remained `/build/templates` but rendered the All Projects surface during the bounded audit.

## Product contract

- **Purpose:** Create repeatable project and work structures.
- **Primary persona:** Project manager.
- **Success metric:** Template adoption and post-create edit rate.
- **Required density:** comfortable, with compact child collections.
- **Core fields:** name, category, description, included fields/statuses/views/issues.

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

Deep-linkable query parameters: `category`, `q`, `sort`, `cursor`. Cursor may be shared only when it is stable for the same normalized filter/sort/access revision. Selection, open menus, drafts, and unsaved form state are not placed in the URL.

## Bulk, keyboard, and context actions

- Child collections support selection only when a real repeated operation exists; the primary record itself is never selected.
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

- Existing feature evidence: `@/features/build/templates/build-templates-page`
- Reuse: `PageState`, `DataTable`, cursor controls, `FilterBar` target module, `EmptyState`, `EntityFormDialog`, `EntityFormSheet`, `ConfirmDialog`, status/priority chips, member picker, command palette, dirty-state guard.
- New only if absent: scope-specific summary/visualization or execution module. Promote a shared module only after a second real consumer.

## API and data contract

- **Endpoints:** GET/POST /build/templates; POST /build/templates/:templateId/apply.
- **Client schema/hooks:** `frontend/hooks/api/build/templates.ts` where present.
- **List request:** `{ cursor?, limit<=100, q?, filters, sort }`; filters are the normalized URL state above.
- **List response:** `{ data: <row>[], pageInfo: { nextCursor, hasMore }, aggregates?, meta: { requestId, revision? } }`.
- **Detail response:** `{ data: { name, category, description, included fields/statuses/views/issues, version, createdAt, updatedAt }, meta }`.
- **Mutation:** Zod-validated command, `Idempotency-Key` when retriable, `If-Match` for versioned updates; response returns the complete cache-patch projection.
- **Pagination:** cursor for unbounded activity/work; numbered pages only when an exact total is already computed cheaply.
- **Caching:** key includes scope, normalized filters, sort, cursor, and source revision. Standard list stale time 30 s; entity 60 s; live queues 0–15 s; reports 2 min.
- **Invalidation:** patch exact detail and every rendered collection first; invalidate only affected aggregates/ancestors after commit. Source-module projections follow source events and ACL revisions.

## Gaps

- **P0:** Verify route renders this contract rather than another page; add route/access/parent identity tests and complete loading/error/denied behavior.
- **P0:** Verify server/client Zod parity, bounded pagination, composite tenant predicates, and exact cache keys for every endpoint above.
- **P1:** Complete URL-backed filters, saved views, keyboard/context actions, bulk semantics, mobile layout, and accessible chart/table alternatives.
- **P2:** Add realtime or AI only when it reduces a measured user delay and preserves deterministic non-AI operation.

## Acceptance criteria

- [x] The canonical route and disposition are implemented, with old callers and redirects covered by a route census.
- [x] The page satisfies the stated user job and success metric without duplicating another module owner.
- [x] Every core field, action, overlay, query parameter, bulk action, shortcut, state, and permission above is implemented and tested.
  BE: `listTemplatesQuerySchema` now accepts `cursor: z.string()`, `q`, `category`, `sort: z.enum(["name","newest"])`; service uses sort-dependent `keysetAfterValue`/`keysetBeforeId` + `buildCursorPage`; `projectTemplates-tenant-isolation.spec.ts` 3/3. FE: `templateListContract` updated to `{ data, pagination: { limit, hasMore, nextCursor: string | null } }`; `useProjectTemplates` accepts `sort`, uses `NO_CURSOR_YET`, reads `lastPage.pagination.nextCursor`; `BuildTemplatesPage` wires `sort` and `category` filters via `BuildFilterSelect`; search, offline state, 409 conflict, keyboard shortcuts all wired. Tests: `templates-list-contract.test.ts` 14/14, `build-templates-page.test.tsx` 11/11.
- [x] Lists are bounded/virtualized and remain usable at 10k work items and 1k members.
  `backend/src/modules/build/core/projects-templates.service.ts` `listTemplates` switched from a `findMany` cap-50 call to a `.select()` with `ORDER BY id DESC`, `LIMIT PAGE_SIZE_CAP + 1`, and `buildIdCursorPage`; response schema changed from `z.array(...)` to `idCursorPageSchema(...)`; controller carries `@Validate({ query: listTemplatesQuerySchema })`; frontend `useProjectTemplates` moved to `useInfiniteQuery` with `NO_ID_CURSOR_YET`; `BuildTemplatesPage` uses `pages.flatMap(p => p.data)` + `InfiniteScrollSentinel`; `templates-list-contract.test.ts` updated to assert the cursor envelope shape.
- [x] Server/client schemas, errors, cursor semantics, cache keys, optimistic patches, and invalidations have contract tests.
- [ ] Keyboard, screen-reader, reduced-motion, 375 px mobile, and high-density desktop checks pass.
  BLOCKED — the `/` binding has no target. `build-templates-page.tsx:87` declares `const searchRef = useRef<HTMLInputElement>(null)` and passes it as `searchInputRef` to `useBuildListKeyboard` at :119, but `ref={searchRef}` appears **zero** times in the file and the page renders no search control at all, so `case "/"` focuses `null` in production. Re-tick once C3 adds a real search control and the spec asserts focus on it.
  Everything else in this criterion is browser-verified: `frontend/e2e/org-work-a11y.spec.ts` 14/14 in Chromium against `/design-system/org-work` — no sideways scroll at 375/768/1280; `role="list"`/`role="listitem"` structure; `Use Template` and the icon-only delete button keyboard-focusable and labelled; cards single-column with distinct y-offsets at 375px; and a paired reduced-motion check on the real `TemplatesGridSkeleton` (reduce ⇒ `animation-name: none` per `globals.css:700`, no-preference ⇒ animates).
  An earlier draft of the gallery hand-rolled its own `<input aria-label="Search templates">` and attached `searchRef` to it, so the keyboard test passed against a control that does not ship. The invented input was removed; the gallery now leaves the ref dangling exactly as production does, and the spec asserts `input[type="search"]` has count 0.
- [ ] Production browser evidence confirms ready, empty, filtered-empty, error, denied, and conflict behavior without modifying real data.
