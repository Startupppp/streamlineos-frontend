"use client";

import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import type { Notification, UnreadCount } from "@/types/notifications";
import type { InboxKind, UnifiedInboxResponse } from "@/types/inbox";

export type InboxSection = "ALL" | "MENTIONS" | "ASSIGNED_TO_ME" | "APPROVALS";

export interface InboxListParams {
  section?: InboxSection;
  limit?: number;
}

function toStringParams(params: Record<string, unknown>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null) out[k] = String(v);
  }
  return out;
}

export function useInfiniteInbox(
  params?: InboxListParams,
  options?: { enabled?: boolean },
) {
  const { data: session } = useSession();
  const orgId = session?.orgId;
  const limit = params?.limit ?? 25;

  return useInfiniteQuery<Notification[], Error>({
    queryKey: queryKeys.inbox.list({
      ...(params as Record<string, unknown>),
      infinite: true,
    }),
    initialPageParam: undefined as number | undefined,
    queryFn: ({ pageParam, signal }) =>
      apiClient.get<Notification[]>(
        "/me/inbox",
        toStringParams({
          ...(params as Record<string, unknown>),
          limit,
          cursor: pageParam,
        }), signal,
      ),
    getNextPageParam: (lastPage) =>
      lastPage.length < limit ? undefined : lastPage[lastPage.length - 1]?.id,
    staleTime: 30_000,
    enabled: !!orgId && (options?.enabled ?? true),
  });
}

export function useInboxCount() {
  const { data: session } = useSession();
  const orgId = session?.orgId;

  return useQuery<UnreadCount, Error>({
    queryKey: queryKeys.inbox.count(),
    queryFn: ({ signal }) => apiClient.get<UnreadCount>("/me/inbox/count", undefined, signal),
    staleTime: 30_000,
    enabled: !!orgId,
  });
}

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
