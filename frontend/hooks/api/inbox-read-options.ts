import { platformCoreQueryKeys } from "@/lib/query-keys/platform-core";
import type { InboxKind } from "@/types/inbox";

export const inboxCountQueryOptions = {
  queryKey: platformCoreQueryKeys.inbox.unified({ count: true }),
  staleTime: 15_000,
} as const;

export function unifiedInboxListQueryOptions(params: {
  limit: number;
  unreadOnly: boolean;
  kinds?: InboxKind[];
  q?: string;
  category?: string;
  priority?: string;
  eventKeys?: string[];
  module?: string;
  triage?: "active" | "later" | "done";
}) {
  return {
    queryKey: platformCoreQueryKeys.inbox.unified({ ...params, infinite: true }),
    staleTime: 30_000,
    getNextPageParam: (lastPage: { hasMore: boolean; nextCursor: string | null }) =>
      lastPage.hasMore ? (lastPage.nextCursor ?? undefined) : undefined,
  } as const;
}
