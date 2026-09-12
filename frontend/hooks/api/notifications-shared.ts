"use client";

import { useQueryClient } from "@tanstack/react-query";
import type { QueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { platformCoreQueryKeys } from "@/lib/query-keys/platform-core";
import type { QueryParams } from "@/lib/api-client";
import type { NotificationListParams } from "@/types/notifications";

export const SHARED_UNREAD_PARAMS: NotificationListParams = {
  section: "UNREAD",
  limit: 20,
};

export function invalidateNotificationInbox(queryClient: QueryClient): void {
  void queryClient.invalidateQueries({
    queryKey: platformCoreQueryKeys.notifications.lists(),
  });
  void queryClient.invalidateQueries({
    queryKey: platformCoreQueryKeys.notifications.unreadCount(),
    exact: true,
  });
  void queryClient.invalidateQueries({
    queryKey: platformCoreQueryKeys.inbox.all,
  });
}

export function useNotificationInboxInvalidation() {
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const orgId = session?.orgId ?? "";

  function invalidateInbox() {
    invalidateNotificationInbox(queryClient);
  }

  return { invalidateInbox, orgId, queryClient };
}

export function toStringParams(params: QueryParams): Record<string, string> {
  const entries: Array<[string, unknown]> = Object.entries(params);
  return Object.fromEntries(
    entries
      .filter(([, v]) => v !== undefined && v !== null)
      .map(([k, v]) => [k, String(v)]),
  );
}
