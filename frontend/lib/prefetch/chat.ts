import "server-only";

import { dehydrate, QueryClient } from "@tanstack/react-query";
import { createServerQueryClient } from "./server-query-client";
import { serverGet } from "@/lib/server-fetch";
import { resolvePrefetchGate } from "@/lib/prefetch/prefetch-gate";
import { chatUnreadTotalQueryOptions } from "@/hooks/api/chat-read-options";
import { chatUnreadContract } from "@/hooks/api/chat-schema/presence-schema";
import type { z } from "zod";

type ChatUnreadResponse = z.infer<typeof chatUnreadContract>;

export async function prefetchChatUnreadTotal() {
  try {
    const [queryClient, gate] = await Promise.all([
      createServerQueryClient(),
      resolvePrefetchGate(),
    ]);
    if (!gate.can("chat:messages:read")) return dehydrate(new QueryClient());

    await queryClient.prefetchQuery({
      ...chatUnreadTotalQueryOptions,
      queryFn: () =>
        serverGet<ChatUnreadResponse>("/chat/unread", chatUnreadContract),
    });

    return dehydrate(queryClient);
  } catch {
    return dehydrate(new QueryClient());
  }
}
