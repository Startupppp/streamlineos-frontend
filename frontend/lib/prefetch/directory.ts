import "server-only";

import { QueryClient, dehydrate } from "@tanstack/react-query";
import {
  WORKERS_PAGE_SIZE,
  workersListKey,
} from "@/lib/query-keys/directory-workers-list";
import { serverFetch } from "@/lib/server-fetch";
import type { WorkersPage } from "@/types/directory/workers";


export async function prefetchWorkers(canView: boolean) {
  const queryClient = new QueryClient();
  if (canView) {
    await queryClient.prefetchQuery({
      queryKey: workersListKey(),
      queryFn: () =>
        serverFetch<WorkersPage>("/directory/workers", { limit: WORKERS_PAGE_SIZE }),
      staleTime: 60_000,
    });
  }
  return dehydrate(queryClient);
}
