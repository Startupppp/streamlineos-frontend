"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import type { InboxKind, UnifiedInboxResponse } from "@/types/inbox";

export interface UnifiedInboxParams {
  limit?: number;
  kinds?: InboxKind[];
  unreadOnly?: boolean;
}

export function useUnifiedInbox(
  params?: UnifiedInboxParams,
  options?: { enabled?: boolean },
) {
  const { data: session } = useSession();
  const orgId = session?.orgId;
  const limit = params?.limit ?? 25;

  return useInfiniteQuery<UnifiedInboxResponse, Error>({
    queryKey: queryKeys.inbox.unified({
      ...(params as Record<string, unknown>),
      infinite: true,
    }),
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) => {
      const query: Record<string, string> = { limit: String(limit) };
      if (pageParam) query["cursor"] = String(pageParam);
      if (params?.kinds && params.kinds.length > 0)
        query["kinds"] = params.kinds.join(",");
      if (params?.unreadOnly) query["unreadOnly"] = "true";
      return apiClient.get<UnifiedInboxResponse>("/me/inbox/unified", query);
    },
    getNextPageParam: (lastPage) => lastPage.hasMore ? (lastPage.nextCursor ?? undefined) : undefined,
    staleTime: 30_000,
    enabled: !!orgId && (options?.enabled ?? true),
  });
}
