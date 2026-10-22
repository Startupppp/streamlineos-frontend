import { platformCoreQueryKeys } from "@/lib/query-keys/platform-core";

export const inboxCountQueryOptions = {
  queryKey: platformCoreQueryKeys.inbox.unified({ count: true }),
  staleTime: 15_000,
} as const;

export const inboxListDefaultQueryOptions = {
  queryKey: platformCoreQueryKeys.inbox.unified({
    limit: 25,
    unreadOnly: false,
    triage: "active",
    infinite: true,
  }),
  staleTime: 30_000,
} as const;
