import "server-only";

import { dehydrate, QueryClient } from "@tanstack/react-query";
import { createServerQueryClient } from "./server-query-client";
import { serverGet } from "@/lib/server-fetch";
import { inboxCountQueryOptions } from "@/hooks/api/inbox-read-options";
import { unifiedInboxCountContract } from "@/hooks/api/inbox-schema";
import type { z } from "zod";

type UnifiedInboxCount = z.infer<typeof unifiedInboxCountContract>;

export async function prefetchInboxCount() {
  try {
    const queryClient = await createServerQueryClient();

    await queryClient.prefetchQuery({
      ...inboxCountQueryOptions,
      queryFn: () =>
        serverGet<UnifiedInboxCount>("/me/inbox/unified/count", unifiedInboxCountContract),
    });

    return dehydrate(queryClient);
  } catch {
    return dehydrate(new QueryClient());
  }
}
