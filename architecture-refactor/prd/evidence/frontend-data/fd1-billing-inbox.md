# FD1 — Billing & Inbox Request Inventory

Source audit: 2026-09-12. Read-only; no files modified.

---

## 1. Forbidden-Route Verification

| Route | Status | Evidence |
|---|---|---|
| `/settings/billing` | EXISTS — correct | `app/(authenticated)/settings/billing/page.tsx` |
| `/settings/billing/ai-credits` | EXISTS — correct | `app/(authenticated)/settings/billing/ai-credits/page.tsx` |
| `/billing/seats` | ABSENT — correct | glob returned nothing |
| `/settings/subscription` | ABSENT — correct | glob returned nothing |
| `/billing` (standalone) | EXISTS — LEGITIMATE | `app/(authenticated)/billing/layout.tsx` + sub-routes `/billing/invoices/**` only. This is org customer accounting invoicing per CLAUDE.md §8: "/billing/invoices is the org's own customer invoicing (accounting)". No `/billing/page.tsx` — the root `/billing` is unreachable; layout enforces `enforceRouteAccess("/billing/invoices")`. |

---

## 2. Billing — Mounted Read Consumer Table

### 2a. `/settings/billing` (tab-conditional renders)

Default staleTime 2min/gcTime 10min from `query-provider.tsx:74-76`. Per-hook overrides shown in column.

| screen/component (file:line) | hook | canonical query key (exact factory call) | API route + method | trigger | staleTime + gcTime in effect | enabled/gating condition | AbortSignal | verdict | evidence |
|---|---|---|---|---|---|---|---|---|---|
| `BillingSettingsPage` > `PlanTab` (plan-tab.tsx:52) | `useSubscription()` | `growthAndSignQueryKeys.billing.subscription()` | `GET /billing` | mount | 5min / 10min | `!!orgId && useCan("billing:subscription:view")` | yes | KEEP | subscription.ts:98-103 |
| `BillingSettingsPage` > `PlanTab` (plan-tab.tsx:57) | `useBillingPlans()` | `growthAndSignQueryKeys.billing.plans()` | `GET /billing/plans` | mount | 60min / 10min | always (no org/permission gate) | yes | REPAIR — missing `!!orgId` gate | subscription.ts:127-133 |
| `BillingSettingsPage` > `PlanTab` > `SeatsBlock` (seats-block.tsx:65) | `useSeatInfo()` | `growthAndSignQueryKeys.billing.seats()` | `GET /billing/seats` | mount | 2min / 10min | `useCan("billing:seats:view")` | yes | KEEP | subscription.ts:174-182 |
| `BillingSettingsPage` > `PlanTab` > `SeatsBlock` (seats-block.tsx:66) | `useSubscription()` | same as PlanTab row | `GET /billing` | mount | 5min / 10min | `!!orgId && useCan("billing:subscription:view")` | yes (coalesced) | CONSOLIDATE — SeatsBlock reads planName from subscription only for display; pass as prop instead of fetching independently | seats-block.tsx:66,95 |
| `BillingSettingsPage` > `PlanTab` > `PlanUsageMeters` (plan-usage-meters.tsx:82) | `useEntitlements()` | `growthAndSignQueryKeys.billing.entitlements()` | `GET /billing/entitlements` | mount | 15min / 10min | always (no gate) | yes | KEEP | entitlements.ts:19-28; staleTime 900_000ms |
| `BillingSettingsPage` > `PaymentsTab` (payments-tab.tsx:77) | `useSubscription()` | same key as PlanTab | `GET /billing` | mount (TanStack coalesces with PlanTab) | 5min / 10min | same | yes (coalesced) | KEEP — coalesces; 0 extra HTTP | payments-tab.tsx:77 |
| `BillingSettingsPage` > `BillingProfileTab` (billing-profile-tab.tsx:~60) | `useBillingProfile()` | `growthAndSignQueryKeys.billing.profile()` | `GET /billing/profile` | mount (see note A) | 5min / 10min | `useCan("billing:profile:view")` | yes | UNVERIFIED — see Note A | subscription.ts:152-159 |
| `BillingSettingsPage` > `PlanTab` (plan-tab.tsx:80) | `useValidateCoupon("", null)` | `growthAndSignQueryKeys.billing.coupon("", null)` | `GET /billing/coupons/validate?…` | user-action (min 3-char code + selected plan) | 30s / 10min | `canManage && code.trim().length >= 3 && plan !== null` (false on mount) | yes | KEEP — correctly gated, never fires on mount | subscription.ts:136-150 |

> **Note A — tab eager-mount**: Radix UI `TabsContent` lazy-mounts by default (content only renders when the tab is first activated). If `forceMount` is absent (confirmed: no `forceMount` in billing-settings-page.tsx), `BillingProfileTab` and `PaymentsTab` do NOT mount until their tab is clicked. Verified: no `forceMount` prop in `billing-settings-page.tsx:57-65`. Therefore `useBillingProfile()` fires only on first profile-tab visit, not on every billing page load. **KEEP** (marking UNVERIFIED for the Radix version in use; treat as KEEP unless a runtime trace proves otherwise).

**Server prefetch** (`lib/prefetch/settings-billing.ts:35-77`):
- `tab=plan` prefetches: subscription (5min stale), plans (60min stale), entitlements (15min stale), seats (2min stale).
- `tab=payments` prefetches: subscription only.
- `tab=profile` prefetches: profile (5min stale).
- Match: prefetch keys use `growthAndSignQueryKeys.*` factory calls that align with the client-side hook keys. No mismatch found.

### 2b. `/settings/billing/ai-credits`

| screen/component (file:line) | hook | canonical query key (exact factory call) | API route + method | trigger | staleTime + gcTime | enabled/gating | AbortSignal | verdict | evidence |
|---|---|---|---|---|---|---|---|---|---|
| `AiCreditsSettingsPage` (ai-credits-settings-page.tsx:62) | `useAiCreditsWallet()` | `growthAndSignQueryKeys.billing.aiCredits()` | `GET /billing/ai-credits` | mount | 5min / 10min | `useCan("billing:ai-credits:view")` | yes | KEEP | ai-credits.ts:33-42 |
| `AiCreditsSettingsPage` (ai-credits-settings-page.tsx:73) | `useAiCreditTransactions({ cursor: undefined, limit: 20 })` | `growthAndSignQueryKeys.billing.aiCreditTransactions({ cursor: undefined, limit: 20 })` | `GET /billing/ai-credits/transactions?limit=20` | mount | 30s / 10min | `useCan("billing:ai-credits:view")` | yes | KEEP — prefetch key matches (both use `AI_CREDIT_TRANSACTION_PARAMS`) | ai-credits.ts:44-62; settings-initial-reads.ts:10-13 |
| `AiCreditsSettingsPage` (ai-credits-settings-page.tsx:84) | `useAiCreditsUsage(30)` | `growthAndSignQueryKeys.billing.aiCreditsUsage(30)` | `GET /billing/ai-credits/usage?days=30` | mount | 60s / 10min | `useCan("billing:ai-credits:view")` | yes | KEEP — prefetch key matches (both use `AI_CREDITS_USAGE_DAYS=30`) | ai-credits.ts:114-129; settings-initial-reads.ts:15 |

---

## 3. Inbox / Notifications — Mounted Read Consumer Table

### 3a. `/inbox` (unified inbox)

| screen/component (file:line) | hook | canonical query key (exact factory call) | API route + method | trigger | staleTime + gcTime | enabled/gating | AbortSignal | verdict | evidence |
|---|---|---|---|---|---|---|---|---|---|
| `InboxShell` (inbox-shell.tsx:103-112) | `useUnifiedInbox({ kinds: VIEW_KINDS[view], limit: 25 })` | `platformCoreQueryKeys.inbox.unified({ limit: params?.limit, kinds: params?.kinds, unreadOnly: params?.unreadOnly, infinite: true })` | `GET /me/inbox/unified?limit=25[&kinds=…]` | mount + view change | 30s / 10min | `!!orgId` | yes | REPAIR — key normalization defect (see §4) | inbox.ts:29-48 |

### 3b. `/notifications` (notifications inbox page)

| screen/component (file:line) | hook | canonical query key (exact factory call) | API route + method | trigger | staleTime + gcTime | enabled/gating | AbortSignal | verdict | evidence |
|---|---|---|---|---|---|---|---|---|---|
| `NotificationsInboxPage` (notifications-inbox-page.tsx:74-80) | `useInfiniteNotifications({ section, category, priority, search, limit: 30 })` | `platformCoreQueryKeys.notifications.list({ section, category, priority, search, limit: 30, infinite: true })` | `GET /notifications?section=…&limit=30[&…]` | mount + filter change | 30s / 10min | `!!orgId` | yes | KEEP | notifications-inbox.ts:80-115 |
| `NotificationsInboxPage` (notifications-inbox-page.tsx:83) | `useUnreadNotificationCount()` | `platformCoreQueryKeys.notifications.unreadCount()` | `GET /notifications/unread-count` | mount (coalesced with shell) | 5min / 10min | `!!orgId` | yes | KEEP — coalesces with shell bell and sidebar | notifications-inbox.ts:139-153 |

**Server prefetch** (`lib/prefetch/notifications.ts`):
- Prefetches `list({ section: "ALL", limit: 30, infinite: true })` and `unreadCount()`. Both keys match client-side defaults. Route: `app/(authenticated)/notifications/page.tsx:5`.
- Note: `/inbox` page (`app/(authenticated)/inbox/page.tsx`) does NOT prefetch — `InboxShell` is fully client-fetched.

### 3c. Shell — unread badge and realtime stream (always mounted)

| screen/component (file:line) | hook | canonical query key (exact factory call) | API route + method | trigger | staleTime + gcTime | enabled/gating | AbortSignal | verdict | evidence |
|---|---|---|---|---|---|---|---|---|---|
| `NotificationBell` shell (notification-bell.tsx:69) | `useUnreadNotificationCount()` | `platformCoreQueryKeys.notifications.unreadCount()` | `GET /notifications/unread-count` | mount | 5min / 10min | `!!orgId` | yes | KEEP — dedicated count endpoint, not a full list | notifications-inbox.ts:139-153 |
| `AppSidebar` shell (app-sidebar.tsx:199-203) | `useUnreadNotificationCount({ refetchInterval: 300_000, refetchIntervalInBackground: false })` | same key | same endpoint | mount + 5-min poll fallback | 5min / 10min | `!!orgId` | yes (coalesced) | KEEP — polling fallback for SSE drop; coalesces with bell | app-sidebar.tsx:199-203; query-request-policies.ts:2 |
| `NotificationBell` shell (notification-bell.tsx:68) | `useNotificationEvents()` (SSE) | no query key — module-level singleton stream | `POST /notifications/events/token` → SSE `GET /notifications/events` | mount; reconnects on `window.online` | n/a | `status === "authenticated" && !!orgId` | n/a — AbortController | KEEP — singleton with subscriber ref-count; only one SSE connection | use-notification-events.ts:141-163 |
| `NotificationBellPanel` (notification-bell-panel.tsx:13-17, mounted on first open) | `useUnreadNotifications()` | `platformCoreQueryKeys.notifications.unreadList()` | `GET /notifications?section=UNREAD&limit=20` | first bell panel open | 30s / 10min | `!!orgId` | yes | KEEP — lazy-mounted (panelMounted guard), provides display list not count | notification-bell.tsx:60-61; notification-bell-panel.tsx:13 |

---

## 4. Specific Questions — Evidence

### 4.1 Unread badge: count endpoint or full list?

The badge uses `useUnreadNotificationCount()` which calls `GET /notifications/unread-count` — a **dedicated count endpoint**. It does NOT fetch the full list.

The `NotificationBellPanel` (opened lazily) calls `useUnreadNotifications()` → `GET /notifications?section=UNREAD&limit=20` for the display list only. These are separate queries with different keys.

The badge is **realtime with a bounded fallback**: `useNotificationEvents()` in `notification-bell.tsx:68` opens a singleton SSE stream that invalidates `unreadCount()` on each notification event (`use-notification-events.ts:69`). The sidebar mounts `useUnreadNotificationCount({ refetchInterval: 300_000 })` providing a 5-minute polling fallback when SSE drops.

The badge hook is **mounted three times simultaneously** in the shell: `NotificationBell` (no `refetchInterval`), `AppSidebar` (with `refetchInterval: 300_000`), and on `/notifications` page `NotificationsInboxPage` (no `refetchInterval`). TanStack Query coalesces all three to **one HTTP request** per refresh cycle. The sidebar's `refetchInterval` option is respected by the shared query — the most aggressive interval wins across all observers.

### 4.2 Distinct hooks hitting the same API route with equivalent params (true duplicate HTTP)?

**None found** in these two journeys.

- `useSubscription()` is called from `PlanTab` (plan-tab.tsx:52), `SeatsBlock` (seats-block.tsx:66), and `PaymentsTab` (payments-tab.tsx:77) simultaneously. All use the identical `growthAndSignQueryKeys.billing.subscription()` key. TanStack coalesces to **1 HTTP request** — not a true duplicate.
- `useUnreadNotificationCount()` is called from `NotificationBell`, `AppSidebar`, and `NotificationsInboxPage` with the same key. Coalesced to **1 HTTP request**.
- `useNotifications` and `useInfiniteNotifications` both hit `GET /notifications` but with different keys and different params (e.g. `list(params)` vs `list({ ...params, infinite: true })`). These are intentionally distinct queries for different consumers and behaviors.

### 4.3 Query keys omitting response-shaping inputs

**`hooks/api/inbox.ts:30` — `useUnifiedInbox` key normalization defect:**

```ts
const limit = params?.limit ?? 25;   // effective value used in request
queryKey: platformCoreQueryKeys.inbox.unified({
  limit: params?.limit,              // BUG: passes undefined when no params given
  kinds: params?.kinds,
  unreadOnly: params?.unreadOnly,
  infinite: true,
}),
```

If called as `useUnifiedInbox()` (no params), the key contains `{ limit: undefined, ... }`. JSON serialization omits undefined, so the key becomes `{ infinite: true }`. If called as `useUnifiedInbox({ limit: 25 })`, the key contains `{ limit: 25, infinite: true }`. These are **different cache entries for the same effective request** (both send `limit=25`). Currently `InboxShell` always passes `limit: 25` so there is no live duplicate, but this is a latent key normalization defect that will cause a cache miss when any new consumer calls `useUnifiedInbox()` without `limit`.

**Fix**: Replace `limit: params?.limit` with `limit` (the defaulted value) in the query key object.

No similar defect found in `useInfiniteNotifications`, `useUnreadNotificationCount`, or any billing hook. The `AI_CREDIT_TRANSACTION_PARAMS` pattern explicitly names params once in `settings-initial-reads.ts` and is reused by both the prefetch and the hook.

### 4.4 AI-credits wallet invalidation and `carriesAiCharge` match

**`query-provider.tsx:52-58`** (`carriesAiCharge`):
```ts
function carriesAiCharge(data: unknown): boolean {
  if (typeof data !== "object" || data === null || !("aiUsage" in data)) return false;
  const usage = data.aiUsage;
  if (typeof usage !== "object" || usage === null || !("credits" in usage)) return false;
  const credits = usage.credits;
  return typeof credits === "number" && credits > 0;
}
```

Checks `data.aiUsage.credits` as a number > 0 and invalidates `growthAndSignQueryKeys.billing.aiCredits()` on every successful mutation that carries this field.

**Match verification**: UNVERIFIED. Backend source is not readable in this audit. CLAUDE.md §8 states "APIs emit fractional credits" for `aiUsage`. If the backend emits `{ aiUsage: { credits: <fractional_number> } }` at the top response level, `carriesAiCharge` fires correctly. If the backend wraps it in a `data` envelope (e.g. `{ data: { ..., aiUsage: { credits: ... } } }`), `apiClient.ts:121` shows `{ success: true, data }` is unwrapped to `data` before `onSuccess` receives it — so the `aiUsage` field would need to be at the unwrapped `data` level for `carriesAiCharge` to see it. This requires backend source confirmation. Mark as UNVERIFIED; backend FD4/FD5 agent should confirm the exact shape emitted by AI-charging endpoints.

### 4.5 Entitlements duplicated across billing screens and shell?

`useEntitlements()` is called in two places:
1. `features/billing/components/plan-usage-meters.tsx:82` — always enabled, mounts when PlanTab is active.
2. `components/layout/header/product-switcher-menu.tsx:62` — `enabled=open` (only fires when the product switcher panel is open).

Both use `growthAndSignQueryKeys.billing.entitlements()` (same key, `staleTime: 900_000`). TanStack coalesces. **No true duplication.** The 15-minute staleTime means the switcher will reuse the billing page's warm cache almost always.

### 4.6 Expensive reads for unopened dialogs/sheets or inaccessible modules?

**Billing tabs**: As argued in Note A above, Radix UI `TabsContent` lazy-mounts (no `forceMount` present). Inactive tab components do not mount until first activated. UNVERIFIED — runtime trace needed to confirm for the installed Radix version.

**`useBillingPlans()` has no `!!orgId` gate** (`subscription.ts:127-133`). The query will attempt `GET /billing/plans` even before the session is ready, relying solely on `apiClient`'s 401 retry. Other billing hooks gate on `!!orgId`. REPAIR: add `enabled: !!orgId` to `useBillingPlans`.

**Chat unread in sidebar** (`app-sidebar.tsx:194`): `useChatUnreadTotal` is gated on `isChatModuleEnabled && canReadChat` — correctly skipped when module is off.

### 4.7 Duplicate React subscriptions (realtime channels, BroadcastChannel, storage events, intervals, EventSource)

**SSE stream (`useNotificationEvents`)**: Module-level `activeStream` singleton with subscriber ref-count (`use-notification-events.ts:33`). `stream.subscribers` increments on each hook mount, decrements on unmount; the stream only closes when the last subscriber leaves. `NotificationBell` is the only direct caller (`notification-bell.tsx:68`). One SSE connection per authenticated org. **No duplicates.**

**BroadcastChannel**: Only in `lib/build-cache-sync.ts` — instantiated once per QueryClient, scoped to the build module. Not related to billing or notifications. **No duplicates.**

**`refetchInterval` for unread count**: Set only in `AppSidebar` (`app-sidebar.tsx:200`). TanStack Query activates the fastest interval among all observers of the same key — since only the sidebar sets one, one interval fires at 5-minute cadence. **No duplicate intervals.**

**Window `online` listener**: Registered inside `openStream()` (`use-notification-events.ts:125`), one per stream instance, removed when the stream is released. Since the stream is a singleton, **one listener**.

---

## 5. Counts

| Category | Count | Notes |
|---|---|---|
| Duplicate HTTP requests | **0** | All multi-consumer reads coalesce via TanStack Query on identical keys |
| Repeated SQL | **UNVERIFIED** | Backend source not read; see FD4/FD5. `GET /billing` coalesces to 1 SQL round-trip per cycle. |
| Duplicate React subscriptions | **0** | SSE singleton, one BroadcastChannel per QueryClient, one `refetchInterval` per query key |

---

## 6. REPAIR / CONSOLIDATE Summary

| # | Item | File:line | Impact | Verdict |
|---|---|---|---|---|
| R1 | `useUnifiedInbox` key uses `params?.limit` (possibly `undefined`) instead of the effective `limit = params?.limit ?? 25` | `hooks/api/inbox.ts:30` | Cache miss: any future consumer calling without `limit` creates a separate entry for the same 25-item fetch | REPAIR |
| R2 | `useBillingPlans()` has no `!!orgId` enabled gate | `hooks/api/subscription.ts:127-133` | Fires `GET /billing/plans` before session ready; 401 silent retry wastes a connection | REPAIR |
| R3 | `SeatsBlock` calls `useSubscription()` to read only `subscription.plan` for display | `features/billing/components/seats-block.tsx:66,95` | TanStack coalesces so no extra HTTP, but `SeatsBlock` is tightly coupled to the subscription query when a `planName` prop would suffice | CONSOLIDATE |
| R4 | `carriesAiCharge` vs backend `aiUsage` envelope shape | `components/providers/query-provider.tsx:52-58` | If backend wraps `aiUsage` inside the `data` envelope differently, wallet is not invalidated after AI spends | UNVERIFIED — confirm with backend agent |
| R5 | `/inbox` route has no server prefetch | `app/(authenticated)/inbox/page.tsx` | `InboxShell` renders a spinner until `GET /me/inbox/unified` completes client-side; `/notifications` has a server prefetch but `/inbox` does not | REPAIR — add `prefetchUnifiedInbox` analogous to `prefetchNotificationsInbox` |
