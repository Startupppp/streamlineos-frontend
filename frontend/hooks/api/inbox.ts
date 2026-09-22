"use client";

import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import type { UseQueryOptions } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { apiClient, isApiError } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";

const unifiedInboxContract = lazyContract(() =>
  import("@/hooks/api/inbox-schema").then((m) => m.unifiedInboxContract),
);
const unifiedInboxCountContract = lazyContract(() =>
  import("@/hooks/api/inbox-schema").then((m) => m.unifiedInboxCountContract),
);
import { platformCoreQueryKeys } from "@/lib/query-keys/platform-core";
import { INLINE_READ_ERROR } from "@/lib/query-error-policy";
import type { InboxKind, UnifiedInboxCount, UnifiedInboxResponse } from "@/types/inbox";
import { NO_CURSOR_YET } from "@/hooks/api/cursor-page-param";

export interface UnifiedInboxParams {
  limit?: number;
  kinds?: InboxKind[];
  unreadOnly?: boolean;
}

export const INBOX_ERROR_RECOVERY_MS = 3_000;

export function inboxErrorRecoveryInterval(query: {
  state: { status: string; error: Error | null };
}): number | false {
  if (query.state.status !== "error") return false;
  const error = query.state.error;
  if (
    isApiError(error) &&
    error.status !== undefined &&
    error.status >= 400 &&
    error.status < 500
  )
    return error.status === 408 || error.status === 429
      ? INBOX_ERROR_RECOVERY_MS
      : false;
  return INBOX_ERROR_RECOVERY_MS;
}

export function useUnifiedInboxCount(
  options?: Omit<UseQueryOptions<UnifiedInboxCount, Error>, "queryKey" | "queryFn">,
) {
  const { data: session } = useSession();
  const orgId = session?.orgId;
  return useQuery<UnifiedInboxCount, Error>({
    ...options,
    queryKey: platformCoreQueryKeys.inbox.unified({ count: true }),
    queryFn: ({ signal }) =>
      apiClient.get<UnifiedInboxCount>(
        "/me/inbox/unified/count",
        undefined,
        signal,
        unifiedInboxCountContract,
      ),
    staleTime: 15_000,
    enabled: !!orgId && (options?.enabled ?? true),
  });
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
    ...INLINE_READ_ERROR,
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
    refetchInterval: inboxErrorRecoveryInterval,
    refetchIntervalInBackground: false,
    enabled: !!orgId && (options?.enabled ?? true),
  });
}
