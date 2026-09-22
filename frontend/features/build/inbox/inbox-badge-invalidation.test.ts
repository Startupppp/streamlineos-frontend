import { QueryClient } from "@tanstack/react-query";
import { platformCoreQueryKeys } from "@/lib/query-keys/platform-core";
import { invalidateNotificationInbox } from "@/hooks/api/notifications-shared";

describe("the Build Inbox unread badge after a read mutation settles", () => {
  it("invalidates the four-element unreadCount('build') badge key, because exact:true on the three-element key never matches a longer key it merely prefixes and the badge then waits out its own five-minute staleTime", () => {
    const queryClient = new QueryClient();
    const globalKey = platformCoreQueryKeys.notifications.unreadCount();
    const buildKey = platformCoreQueryKeys.notifications.unreadCount("build");

    queryClient.setQueryData(globalKey, { count: 3 });
    queryClient.setQueryData(buildKey, { count: 3 });

    invalidateNotificationInbox(queryClient);

    expect(queryClient.getQueryState(globalKey)?.isInvalidated).toBe(true);
    expect(queryClient.getQueryState(buildKey)?.isInvalidated).toBe(true);
  });

  it("invalidates every module-scoped unread badge, not only the one Build happens to mount", () => {
    const queryClient = new QueryClient();
    const hrKey = platformCoreQueryKeys.notifications.unreadCount("hr");
    queryClient.setQueryData(hrKey, { count: 1 });

    invalidateNotificationInbox(queryClient);

    expect(queryClient.getQueryState(hrKey)?.isInvalidated).toBe(true);
  });

  it("leaves unrelated notification caches alone, so widening the unreadCount match does not refetch the whole family", () => {
    const queryClient = new QueryClient();
    const preferencesKey = platformCoreQueryKeys.notifications.preferences();
    queryClient.setQueryData(preferencesKey, { digestMode: "daily" });

    invalidateNotificationInbox(queryClient);

    expect(queryClient.getQueryState(preferencesKey)?.isInvalidated).toBe(false);
  });
});
