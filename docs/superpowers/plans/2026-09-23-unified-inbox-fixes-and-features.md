# Unified Inbox — Defect Fixes + Feature Additions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix four correctness/UX bugs in the unified inbox and add five features (Mentions view, Unread view, date filter, module filter, date grouping).

**Architecture:** All changes stay inside `frontend/features/notifications/unified-inbox/`, `frontend/features/notifications/notification-bell-panel.tsx`, and `frontend/types/inbox.ts`. Client-side filtering compensates for backend `.strict()` schemas that accept no new params (eventKey, date, module). A new `inbox-mail-link.ts` pure-function module is the single source of truth for mail deep-link params so the two call sites cannot drift.

**Tech Stack:** Next.js 16.3, React 19, TypeScript strict, Tailwind 4, date-fns (already installed), `DateRangePicker` from `components/ui/date-range-picker.tsx`

**Spec:** This plan implements the task spec in the parent conversation.

## Global Constraints

- No `any`, no `as X`, no `@ts-ignore` — zero tolerance (gate: tsc strict)
- Every JSX callback must be a named handler — `onClick={handleX}` never an inline arrow (gate: check:named-handlers)
- Filter state lives in URL; reset pagination on filter change (FE-86)
- Reuse `DateRangePicker` from `components/ui/date-range-picker.tsx` (FE-58/59)
- No code comments — reason goes in the test name (project rule)
- `h-9 text-sm` for field controls (FE-102)
- `aria-label` on icon-only buttons (FE-117)
- `type="button"` on every standalone button (FE-119)
- Run gates from `frontend/`: `pnpm exec jest --ci --runInBand --testPathPattern="unified-inbox|notification-bell"` must stay green
- Mention event keys found in backend: `build.comment.mention`, `chat.message.mention`, `knowledge.article.mentioned`, `support.ticket.mention`

---

### Task 1: D3 — Extract shared mail deep-link helper

**Files:**
- Create: `frontend/features/notifications/unified-inbox/inbox-mail-link.ts`
- Modify: `frontend/features/notifications/unified-inbox/inbox-shell.tsx` (use it in handleMailClick)
- Modify: `frontend/features/notifications/notification-bell-panel.tsx` (fix threadId gap + use it)
- Modify: `frontend/features/notifications/unified-inbox/inbox-deep-link.test.tsx` (add unit tests)

**Interfaces:**
- Produces: `mailDeepLinkParams(item: MailInboxItem): Record<string, string>` — exported from `inbox-mail-link.ts`

- [ ] Write the pure function in `inbox-mail-link.ts`:
```typescript
import type { MailInboxItem } from "@/types/inbox";

export function mailDeepLinkParams(item: MailInboxItem): Record<string, string> {
  if (item.threadId !== null) {
    return { threadId: item.threadId, accountId: String(item.accountId) };
  }
  return { messageId: item.id, accountId: String(item.accountId) };
}
```

- [ ] Update `inbox-shell.tsx` `handleMailClick` to use `mailDeepLinkParams`:
```typescript
import { mailDeepLinkParams } from "./inbox-mail-link";
// ...
const handleMailClick = useCallback(
  (item: MailInboxItem) => {
    router.push(`/mail?${toSearchParams(mailDeepLinkParams(item)).toString()}`);
  },
  [router],
);
```

- [ ] Update `notification-bell-panel.tsx` `handleMailClick` to use `mailDeepLinkParams`:
```typescript
import { mailDeepLinkParams } from "./unified-inbox/inbox-mail-link";
// ...
const handleMailClick = useCallback(
  (item: MailInboxItem) => {
    onClose();
    router.push(`/mail?${toSearchParams(mailDeepLinkParams(item)).toString()}`);
  },
  [onClose, router],
);
```

- [ ] Add unit tests to `inbox-deep-link.test.tsx`:
```typescript
import { mailDeepLinkParams } from "./inbox-mail-link";

describe("mailDeepLinkParams — shared mail link builder", () => {
  it("returns messageId params when threadId is null", () => {
    const item = makeMailItem("msg-42", 7);
    const params = mailDeepLinkParams(item);
    expect(params).toEqual({ messageId: "msg-42", accountId: "7" });
  });

  it("returns threadId params when threadId is present, not messageId", () => {
    const item = { ...makeMailItem("msg-42", 7), threadId: "thread-99" };
    const params = mailDeepLinkParams(item);
    expect(params).toEqual({ threadId: "thread-99", accountId: "7" });
    expect(params).not.toHaveProperty("messageId");
  });

  it("positive: single-message mail still navigates to the mail route", () => {
    const props = await mountInbox();
    act(() => props.onMailClick(makeMailItem("solo", 3)));
    const pushed = pushMock.mock.calls[0][0];
    expect(new URL(pushed, "http://localhost").pathname).toBe("/mail");
  });
});
```

- [ ] Run: `pnpm exec jest --ci --runInBand --testPathPattern="inbox-deep-link"` — expect PASS

---

### Task 2: D1 — Fix approval deep-link routing

**Files:**
- Modify: `frontend/features/notifications/unified-inbox/inbox-shell.tsx` (handleApprovalClick)
- Modify: `frontend/features/notifications/notification-bell-panel.tsx` (handleApprovalClick)
- Modify: `frontend/features/notifications/unified-inbox/inbox-deep-link.test.tsx` (add per-module tests)
- Modify: `frontend/features/notifications/unified-inbox/inbox-url-views.test.tsx` (update existing approval tests)

- [ ] Update `inbox-shell.tsx` `handleApprovalClick`:
```typescript
const handleApprovalClick = useCallback(
  (item: BuildApprovalInboxItem) => {
    if (item.deepLink !== null) {
      router.push(normalizeBuildDeepLink(item.deepLink));
      return;
    }
    if (item.sourceModule === "build") {
      if (item.projectId !== null) {
        router.push(`/build/approvals?${toSearchParams({ projectId: String(item.projectId) }).toString()}`);
      } else {
        router.push("/build/approvals");
      }
      return;
    }
    router.push("/inbox?view=approvals");
  },
  [router],
);
```

- [ ] Update `notification-bell-panel.tsx` `handleApprovalClick`:
```typescript
const handleApprovalClick = useCallback(
  (item: BuildApprovalInboxItem) => {
    onClose();
    if (item.deepLink !== null) {
      router.push(normalizeBuildDeepLink(item.deepLink));
      return;
    }
    if (item.sourceModule === "build") {
      if (item.projectId !== null) {
        const params = toSearchParams({ projectId: String(item.projectId) });
        router.push(`/build/approvals?${params.toString()}`);
      } else {
        router.push("/build/approvals");
      }
      return;
    }
    router.push("/inbox?view=approvals");
  },
  [onClose, router],
);
```

- [ ] Add tests to `inbox-deep-link.test.tsx` — four cases (positive + negative pairs):
  - Build approval with deepLink navigates to that link, NOT /build/approvals
  - HR leave item with null deepLink does NOT navigate to /build/..., navigates to /inbox?view=approvals
  - HR leave item with deepLink navigates to that link
  - Build approval with null deepLink and null projectId navigates to /build/approvals (fallback)

- [ ] Run: `pnpm exec jest --ci --runInBand --testPathPattern="inbox-deep-link|inbox-url-views"` — expect PASS

---

### Task 3: D2 — Approval source labels

**Files:**
- Modify: `frontend/features/notifications/unified-inbox/inbox-sources.ts` (add APPROVAL_KIND_LABELS)
- Modify: `frontend/features/notifications/unified-inbox/inbox-item-card.tsx` (render badge in ApprovalItemCard)
- Modify: `frontend/features/notifications/unified-inbox/inbox-item-identity.test.tsx` (add label tests)

- [ ] Add to `inbox-sources.ts`:
```typescript
export const APPROVAL_KIND_LABELS: Record<string, string> = {
  build: "Build",
  leave: "Leave",
  wfh: "Work from home",
  workflow: "HR workflow",
  timesheet: "Timesheet",
};

export function approvalKindLabel(kind: string): string {
  return APPROVAL_KIND_LABELS[kind] ?? kind;
}
```

- [ ] Update `ApprovalItemCard` in `inbox-item-card.tsx` to import and render:
```typescript
import { approvalKindLabel } from "./inbox-sources";
// in ApprovalItemCard, inside the badges row:
<Badge variant="secondary" className="h-4 px-1.5 py-0 text-micro">
  {approvalKindLabel(item.approvalKind)}
</Badge>
```

- [ ] Add tests to `inbox-item-identity.test.tsx` for approval source badge visibility

- [ ] Run: `pnpm exec jest --ci --runInBand --testPathPattern="inbox-item-identity"` — expect PASS

---

### Task 4: D4 + F1 + F2 — View changes (remove updates, add mentions + unread)

**Files:**
- Modify: `frontend/features/notifications/unified-inbox/inbox-view-params.ts`
- Modify: `frontend/features/notifications/unified-inbox/inbox-url-views.test.tsx`
- Modify: `frontend/features/notifications/unified-inbox/inbox-shell.test.tsx`
- Modify: `frontend/features/notifications/unified-inbox/inbox-shell.tsx` (client-side mentions filter)

Key changes to `inbox-view-params.ts`:
- Remove "updates" from `InboxView`, `ALL_VIEW_VALUES`, `VIEWS`, `VIEW_KINDS`, `VIEW_TRIAGE`, `VIEW_DEFAULT_UNREAD_ONLY`
- Add "mentions" and "unread" to all of those
- Add `MENTION_EVENT_KEYS` constant
- `VIEW_KINDS.mentions = ["notification"]`
- `VIEW_KINDS.unread = undefined`
- `VIEW_DEFAULT_UNREAD_ONLY.mentions = false`
- `VIEW_DEFAULT_UNREAD_ONLY.unread = true`
- `VIEW_TRIAGE.mentions = undefined` (all triage states)
- `VIEW_TRIAGE.unread = undefined`

Update `inbox-shell.tsx` to client-side filter for mentions:
```typescript
export const MENTION_EVENT_KEYS: ReadonlySet<string> = new Set([
  "build.comment.mention",
  "chat.message.mention",
  "knowledge.article.mentioned",
  "support.ticket.mention",
]);
// in inbox-shell.tsx, after items = dedupeInboxItems(pages):
const mentionFilteredItems = useMemo(() => {
  if (filterState.view !== "mentions") return items;
  return items.filter(
    (item) =>
      item.kind === "notification" &&
      item.eventKey !== null &&
      MENTION_EVENT_KEYS.has(item.eventKey),
  );
}, [items, filterState.view]);
```

- [ ] Run: `pnpm exec jest --ci --runInBand --testPathPattern="inbox-url-views|inbox-shell.test"` — expect PASS

---

### Task 5: F3 + F4 — Date filter + Module filter (expand InboxFilterState)

**Files:**
- Modify: `frontend/features/notifications/unified-inbox/inbox-view-params.ts` (add from/to/module to InboxFilterState, serialization)
- Modify: `frontend/features/notifications/unified-inbox/use-inbox-filter-state.ts` (add state/handlers)
- Modify: `frontend/features/notifications/unified-inbox/inbox-toolbar.tsx` (add controls)
- Modify: `frontend/features/notifications/unified-inbox/inbox-shell.tsx` (pass props, client-side filter)
- Modify all test files that construct InboxFilterState objects

New fields: `from: string`, `to: string`, `module: string` (all default to `""`)

URL encoding: `from=YYYY-MM-DD&to=YYYY-MM-DD&module=hr`

Toolbar receives: `availableModules: string[]`, `onFromToChange`, `onModuleChange`

Client-side filter in inbox-shell:
```typescript
const filteredItems = useMemo(() => {
  let result = mentionFilteredItems;
  if (filterState.from || filterState.to) {
    const fromTs = filterState.from ? new Date(filterState.from + "T00:00:00").getTime() : -Infinity;
    const toTs = filterState.to ? new Date(filterState.to + "T23:59:59.999").getTime() : Infinity;
    result = result.filter((item) => {
      const ts = new Date(item.timestamp).getTime();
      return ts >= fromTs && ts <= toTs;
    });
  }
  if (filterState.module) {
    result = result.filter((item) => item.sourceModule === filterState.module);
  }
  return result;
}, [mentionFilteredItems, filterState.from, filterState.to, filterState.module]);
```

- [ ] Run: `pnpm exec jest --ci --runInBand --testPathPattern="(inbox|notifications)"` — expect PASS

---

### Task 6: F5 — Date grouping

**Files:**
- Modify: `frontend/features/notifications/unified-inbox/inbox-grouping.ts`
- Modify: `frontend/features/notifications/unified-inbox/inbox-grouping.test.ts`

```typescript
// inbox-grouping.ts additions
import { isToday, isYesterday, isThisWeek } from "date-fns";

export type InboxGrouping = "none" | "kind" | "module" | "thread" | "date";

function getDateBucketKey(timestamp: string): string {
  const d = new Date(timestamp);
  if (isToday(d)) return "date:today";
  if (isYesterday(d)) return "date:yesterday";
  if (isThisWeek(d, { weekStartsOn: 1 })) return "date:this-week";
  return "date:earlier";
}

const DATE_BUCKET_LABELS: Record<string, string> = {
  "date:today": "Today",
  "date:yesterday": "Yesterday",
  "date:this-week": "This week",
  "date:earlier": "Earlier",
};

const DATE_BUCKET_ORDER = ["date:today", "date:yesterday", "date:this-week", "date:earlier"] as const;
```

- [ ] Run: `pnpm exec jest --ci --runInBand --testPathPattern="inbox-grouping"` — expect PASS

---

### Task 7: Full test run + gates

- [ ] `pnpm exec jest --ci --runInBand --testPathPattern="unified-inbox|notification-bell"`
- [ ] `pnpm exec jest --ci --runInBand --testPathPattern="(inbox|notifications)"` (regression check)
- [ ] `pnpm run type-check:specs`
- [ ] `pnpm exec eslint features/notifications`
- [ ] Report all commands with real output

---
