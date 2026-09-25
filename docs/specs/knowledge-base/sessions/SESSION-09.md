# SESSION-09 — "Load more" → infinite scroll / numbered pagination (FE-125)

Converted **37 non-wiki surfaces** across nine categories. The six wiki/KB files were deliberately
left out of this session's scope and are tracked at the bottom; five of them were converted
afterwards in a follow-up lane, and `page-history-sheet.tsx` was converted by the orchestrator in
`91aba82a6`.

The shared primitive is `components/ui/infinite-scroll-sentinel.tsx`, committed in `173a2a154`:

```ts
import { InfiniteScrollSentinel } from "@/components/ui/infinite-scroll-sentinel";
```

It guards on `typeof IntersectionObserver === "undefined"`, constructs no observer while
`isFetchingNextPage`, and always renders an `sr-only focus:not-sr-only` labelled button — that
button is the keyboard path and the no-observer fallback, which is why the accessible name still
reads "Load more …" in the converted files. The banned thing is a *visible button the user must
click to see more rows*, not the accessible name.

Three shapes were used, chosen by what the surface actually is:

| Surface shape | Conversion |
|---|---|
| accumulating feed on `useInfiniteQuery` | `InfiniteScrollSentinel` |
| table with a fixed page window | `TablePagination mode="cursor"` (numbered) |
| popover / combobox / short scroll container | `InfiniteScrollSentinel` with `rootMargin="0px"` |

---

## Category 1 — `useInfiniteQuery` → `InfiniteScrollSentinel`

- `features/build/files/files-page.tsx`
- `features/build/updates/updates-page.tsx`
- `features/crm/shared/customer-360-timeline.tsx`
- `features/help-centre/components/kb-research-briefs-page-content.tsx`
- `features/module-access/components/audit-log-drawer.tsx`
- `features/module-access/components/module-members-tab.tsx`
- `features/support/components/knowledge-gaps-page.tsx`
- `features/timesheets/approvals/approvals-tab-panel.tsx`
- `features/timesheets/exceptions/exceptions-view.tsx`
- `features/timesheets/payroll/payroll-exports-history.tsx`
- `features/timesheets/settings/audit-tab.tsx`
- `features/workflows/scheduler/scheduler-page.tsx`
- `features/workflows/secrets/secrets-page.tsx`
- `features/hr/engagement/communities-tab.tsx`
- `features/hr/performance/succession-tab.tsx`
- `components/assistant/ask-os-conversation-list.tsx`
- `components/blog/post-feed.tsx`
- `components/timeline/my-tasks-panel.tsx`

## Category 2 — manual cursor → `TablePagination mode="cursor"`

- `features/crm/issues/issues-page.tsx`
- `features/party/subjects/subjects-page.tsx`
- `features/build/portfolios/portfolio-detail-page.tsx` — `useCursorPager` + `TablePagination`
- `components/ui/chat-channel-combobox.tsx` — sentinel, `rootMargin="0px"`
- `components/organization/hierarchy-parent-selector.tsx` — sentinel, `rootMargin="0px"`

## Category 3 — react-window virtual lists

- `features/notifications/unified-inbox/inbox-virtual-list.tsx`
- `features/notifications/unified-inbox/inbox-grouped-virtual-list.tsx`
- `features/mail/mail-virtual-list.tsx` — the load-more row was removed entirely

A virtual list has no sentinel to observe, so these hook `onRowsRendered` instead.

**The defect that shape introduces, and the fix.** `stopIndex >= items.length - 1` is trivially
true on every re-render once the list is short enough to fit the viewport, so any unrelated state
change — an online/offline toggle was the case that surfaced it — re-fires `onLoadMore`
indefinitely. A `lastTriggerStopIndexRef` deduplicates the call against the last `stopIndex` that
actually triggered a fetch. Without that ref the conversion is a render-loop, not a feature.

## Category 4 — chat panels with DOM windowing

- `features/chat/saved-messages-panel.tsx` — `usePanelRenderWindow` preserved, `TablePagination` cursor
- `features/chat/shared-files-panel.tsx` — same
- `features/chat/chat-side-panels-bounded.test.tsx` — button labels updated to `/next page/i`

## Category 5 — build scope browser

- `features/build/navigation/build-scope-browser.tsx` — three independent sentinels

## Category 6 — backlog / board `isTruncated`

- `features/build/backlog/project-backlog-page.tsx`
- `features/build/views/project-board-content.tsx`

## Category 7 — chat channel load more

- `features/chat/channel-archived-section.tsx`
- `features/chat/channel-sidebar.tsx`
- `features/chat/channels-discovery-page.tsx`
- `features/chat/forward-message-dialog.tsx`
- `features/chat/channel-load-more.tsx` — **deleted**, it existed only to render the banned button

## Category 8 — bounded limit growth

- `features/build/change-requests/change-request-affected-tickets.tsx`

## Category 9 — employee list (windowed grid)

- `features/hr/employees/employees-list-page.tsx` — windowing preserved, sentinel added

---

## Test files updated

`project-backlog-page.test.tsx`, `project-board-content.test.tsx`, `build-scope-browser.test.tsx`,
`inbox-keyboard-a11y.test.tsx`, `inbox-virtual-list.test.tsx`, `chat-side-panels-bounded.test.tsx`.
23 tests pass across the virtual-list conversions.

## Wiki/KB files — excluded from this session

Out of scope here to keep this session non-overlapping with the KB sessions that own those files:

| File | Disposition |
|---|---|
| `features/wiki/components/page-history-sheet.tsx` | converted by the orchestrator in `91aba82a6` |
| `features/wiki/components/export-jobs-card.tsx` | follow-up lane |
| `features/wiki/components/import-history-section.tsx` | follow-up lane |
| `features/wiki/components/kb-conversation-list.tsx` | follow-up lane |
| `features/wiki/components/page-history-page.tsx` | follow-up lane |
| `features/wiki/components/templates-page.tsx` | follow-up lane |

## Gates

- `pnpm type-check` — PENDING ORCHESTRATOR GATE
- `pnpm lint` — PENDING ORCHESTRATOR GATE
- `check:named-handlers` — PENDING ORCHESTRATOR GATE

Deferred deliberately: whole-repo gates were suspended while ten sessions shared one working tree,
and are run serialized by the orchestrator once the tree is quiet.
