import { collaborationQueryKeys } from "@/lib/query-keys/collaboration";

export const chatUnreadTotalQueryOptions = {
  queryKey: collaborationQueryKeys.chat.unreadTotal(),
  staleTime: 300_000,
} as const;

export const chatChannelsQueryOptions = {
  queryKey: collaborationQueryKeys.chat.myChannels(),
  staleTime: 300_000,
} as const;
