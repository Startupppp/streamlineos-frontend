import { platformCoreQueryKeys } from "@/lib/query-keys/platform-core";

export const inboxCountQueryOptions = {
  queryKey: platformCoreQueryKeys.inbox.unified({ count: true }),
  staleTime: 15_000,
} as const;
