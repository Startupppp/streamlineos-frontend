import "server-only";

import { dehydrate } from "@tanstack/react-query";
import { createServerQueryClient } from "./server-query-client";
import { platformCoreQueryKeys } from "@/lib/query-keys/platform-core";
import { serverGet } from "@/lib/server-fetch";
import { notificationCursorPageContract, notificationUnreadCountContract } from "@/lib/prefetch/prefetch-schema";
import type { Notification, UnreadCount } from "@/types/notifications";
import type { IdCursorPage } from "@/hooks/api/id-cursor-page-schema";

const INBOX_STALE_TIME = 30_000;
const INBOX_LIMIT = 30;

function lowestNotificationId(page: Notification[]): number | undefined {
  let lowest: number | undefined;
  for (const item of page) {
    if (lowest === undefined || item.id < lowest) lowest = item.id;
  }
  return lowest;
}

const FIRST_PAGE: number | undefined = undefined;

export async function prefetchNotificationsInbox() {
  const queryClient = await createServerQueryClient();

  await Promise.all([
    queryClient.prefetchInfiniteQuery({
      queryKey: platformCoreQueryKeys.notifications.list({
        section: "ALL",
        limit: INBOX_LIMIT,
        infinite: true,
      }),
      queryFn: async () => {
        const page = await serverGet<IdCursorPage<Notification>>(
          `/notifications?section=ALL&limit=${INBOX_LIMIT}`,
          notificationCursorPageContract,
        );
        return page.data;
      },
      initialPageParam: FIRST_PAGE,
      pages: 1,
      getNextPageParam: (lastPage: Notification[]) =>
        lastPage.length < INBOX_LIMIT ? undefined : lowestNotificationId(lastPage),
      staleTime: INBOX_STALE_TIME,
    }),

    queryClient.prefetchQuery({
      queryKey: platformCoreQueryKeys.notifications.unreadCount(),
      queryFn: () =>
        serverGet<UnreadCount>("/notifications/unread-count", notificationUnreadCountContract),
      staleTime: INBOX_STALE_TIME,
    }),
  ]);

  return dehydrate(queryClient);
}
