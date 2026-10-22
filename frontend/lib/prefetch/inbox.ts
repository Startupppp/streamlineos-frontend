import "server-only";

import { dehydrate } from "@tanstack/react-query";
import { createServerQueryClient } from "./server-query-client";
import { serverGet } from "@/lib/server-fetch";
import { inboxCountQueryOptions, unifiedInboxListQueryOptions } from "@/hooks/api/inbox-read-options";
import { unifiedInboxCountContract, unifiedInboxContract } from "@/hooks/api/inbox-schema";
import { NO_CURSOR_YET } from "@/hooks/api/cursor-page-param";
import type { z } from "zod";

type UnifiedInboxCount = z.infer<typeof unifiedInboxCountContract>;
type UnifiedInboxResponse = z.infer<typeof unifiedInboxContract>;

export async function prefetchInbox() {
  try {
    const queryClient = await createServerQueryClient();

    await Promise.all([
      queryClient.prefetchQuery({
        ...inboxCountQueryOptions,
        queryFn: () =>
          serverGet<UnifiedInboxCount>("/me/inbox/unified/count", unifiedInboxCountContract),
      }),
      queryClient.prefetchInfiniteQuery({
        ...unifiedInboxListQueryOptions({ limit: 25, unreadOnly: false, triage: "active" }),
        queryFn: () =>
          serverGet<UnifiedInboxResponse>("/me/inbox/unified?limit=25&triage=active", unifiedInboxContract),
        initialPageParam: NO_CURSOR_YET,
        pages: 1,
      }),
    ]);

    return dehydrate(queryClient);
  } catch {
    return dehydrate(await createServerQueryClient());
  }
}
