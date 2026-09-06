import "server-only";

import { dehydrate, QueryClient } from "@tanstack/react-query";
import { createServerQueryClient } from "./server-query-client";
import { serverGet } from "@/lib/server-fetch";
import { directoryAndOwnershipQueryKeys } from "@/lib/query-keys/directory-and-ownership";
import type { PartiesPage } from "@/types/party/parties";

export async function prefetchParties() {
  try {
    const queryClient = await createServerQueryClient();
    await queryClient.prefetchQuery({
      queryKey: directoryAndOwnershipQueryKeys.party.parties({ page: 1, limit: 20 }),
      queryFn: () => serverGet<PartiesPage>("/party/parties?page=1&limit=20"),
      staleTime: 60_000,
    });
    return dehydrate(queryClient);
  } catch {
    return dehydrate(new QueryClient());
  }
}
