"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { queryKeys } from "@/lib/query-keys";
import type {
  NotificationListParams,
} from "@/types/notifications";

export const SHARED_UNREAD_PARAMS: NotificationListParams = {
  section: "UNREAD",
  limit: 20,
};

export function useNotificationInboxInvalidation() {
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const orgId = session?.orgId ?? "";

  function invalidateInbox() {
    void queryClient.invalidateQueries({
      queryKey: queryKeys.notifications.lists(),
    });
    void queryClient.invalidateQueries({
      queryKey: queryKeys.notifications.unreadCount(),
      exact: true,
    });
  }

  return { invalidateInbox, orgId, queryClient };
}

export function toStringParams(params: Record<string, unknown>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(params)
      .filter(([, v]) => v !== undefined && v !== null)
      .map(([k, v]) => [k, String(v)]),
  );
}
