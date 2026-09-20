import { QueryClient } from "@tanstack/react-query";
import { platformCoreQueryKeys } from "@/lib/query-keys/platform-core";
import { invalidateNotificationInbox } from "@/hooks/api/notifications-shared";

/**
 * `useBuildNotificationUnreadCount` (hooks/api/build/approvals.ts) — the source
 * of the Build sidebar's "Inbox" badge — reads
 * `platformCoreQueryKeys.notifications.unreadCount("build")`, a FOUR-element
 * key. Every inbox mutation (mark-read, mark-all-read, bulk-mark-read, archive,
 * pin, snooze, ...) settles through `invalidateNotificationInbox`
 * (hooks/api/notifications-shared.ts), which invalidates
 * `platformCoreQueryKeys.notifications.unreadCount()` — the THREE-element,
 * sourceModule-less key — with `exact: true`. TanStack Query's `exact: true`
 * matches only that literal key, never a longer key it prefixes, so the
 * "build"-scoped badge query is never told it is stale by any Inbox action; it
 * only recovers once its own staleTime elapses. The optimistic patch inside
 * `beginInboxPatch`/`applyUnreadDelta` (notifications-inbox-optimistic.ts) has
 * the identical gap — it reads and writes only the sourceModule-less key.
 */
describe("the Build Inbox unread badge after a read mutation settles", () => {
  it("invalidates the global unread count but leaves the build-scoped badge untouched", () => {
    const queryClient = new QueryClient();
    const globalKey = platformCoreQueryKeys.notifications.unreadCount();
    const buildKey = platformCoreQueryKeys.notifications.unreadCount("build");

    queryClient.setQueryData(globalKey, { count: 3 });
    queryClient.setQueryData(buildKey, { count: 3 });

    invalidateNotificationInbox(queryClient);

    expect(queryClient.getQueryState(globalKey)?.isInvalidated).toBe(true);
    expect(queryClient.getQueryState(buildKey)?.isInvalidated).toBe(false);
  });
});
