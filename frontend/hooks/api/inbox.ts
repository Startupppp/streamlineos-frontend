"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";

const unifiedInboxContract = lazyContract(() =>
  import("@/hooks/api/inbox-schema").then((m) => m.unifiedInboxContract),
);
import { platformCoreQueryKeys } from "@/lib/query-keys/platform-core";
import type { InboxKind, UnifiedInboxResponse } from "@/types/inbox";
import { NO_CURSOR_YET } from "@/hooks/api/cursor-page-param";

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
  const kinds =
    params?.kinds && params.kinds.length > 0
      ? [...params.kinds].sort()
      : undefined;
  const unreadOnly = params?.unreadOnly ?? false;

  return useInfiniteQuery<UnifiedInboxResponse, Error>({
    queryKey: platformCoreQueryKeys.inbox.unified({
      limit,
      kinds,
      unreadOnly,
      infinite: true,
    }),
    initialPageParam: NO_CURSOR_YET,
    queryFn: ({ pageParam , signal }) => {
      const query: Record<string, string> = { limit: String(limit) };
      if (pageParam !== undefined) query["cursor"] = String(pageParam);
      if (kinds) query["kinds"] = kinds.join(",");
      if (unreadOnly) query["unreadOnly"] = "true";
      return apiClient.get<UnifiedInboxResponse>("/me/inbox/unified", query, signal, unifiedInboxContract);
    },
    getNextPageParam: (lastPage) => lastPage.hasMore ? (lastPage.nextCursor ?? undefined) : undefined,
    staleTime: 30_000,
    enabled: !!orgId && (options?.enabled ?? true),
  });
}
