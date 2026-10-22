import "server-only";

import { dehydrate } from "@tanstack/react-query";
import { createServerQueryClient } from "./server-query-client";
import { serverGet } from "@/lib/server-fetch";
import { resolvePrefetchGate } from "@/lib/prefetch/prefetch-gate";
import { chatUnreadTotalQueryOptions, chatChannelsQueryOptions } from "@/hooks/api/chat-read-options";
import { chatUnreadContract, chatChannelPageContract, chatChannelContract } from "@/hooks/api/chat-schema";
import type { z } from "zod";

type ChatUnreadResponse = z.infer<typeof chatUnreadContract>;

const channelPageSchema = chatChannelPageContract(chatChannelContract);
type ChannelPageResponse = z.infer<typeof channelPageSchema>;

export async function prefetchChat() {
  try {
    const [queryClient, gate] = await Promise.all([
      createServerQueryClient(),
      resolvePrefetchGate(),
    ]);

    await Promise.all([
      gate.can("chat:messages:read")
        ? queryClient.prefetchQuery({
            ...chatUnreadTotalQueryOptions,
            queryFn: () =>
              serverGet<ChatUnreadResponse>("/chat/unread", chatUnreadContract),
          })
        : Promise.resolve(),
      gate.can("chat:channels:read")
        ? queryClient.prefetchInfiniteQuery({
            ...chatChannelsQueryOptions,
            queryFn: () =>
              serverGet<ChannelPageResponse>("/chat/channels", channelPageSchema),
            initialPageParam: null,
            pages: 1,
          })
        : Promise.resolve(),
    ]);

    return dehydrate(queryClient);
  } catch {
    return dehydrate(await createServerQueryClient());
  }
}
