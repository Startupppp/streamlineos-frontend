import "server-only";

import { dehydrate } from "@tanstack/react-query";
import { createServerQueryClient } from "./server-query-client";
import {
  WORKERS_PAGE_SIZE,
  workersListKey,
} from "@/lib/query-keys/directory-workers-list";
import { serverGet } from "@/lib/server-fetch";
import { workersPageContract } from "@/hooks/api/directory/workers-schema";

export async function prefetchWorkers() {
  const queryClient = await createServerQueryClient();
  await queryClient.prefetchQuery({
    queryKey: workersListKey(),
    queryFn: () =>
      serverGet(
        `/directory/workers?limit=${WORKERS_PAGE_SIZE}`,
        workersPageContract,
      ),
    staleTime: 60_000,
  });
  return dehydrate(queryClient);
}
