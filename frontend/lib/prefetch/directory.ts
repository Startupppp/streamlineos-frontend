import "server-only";

import { QueryClient, dehydrate } from "@tanstack/react-query";
import {
  WORKERS_PAGE_SIZE,
  workersListKey,
} from "@/lib/query-keys/directory-workers-list";
import { serverGet } from "@/lib/server-fetch";
import type { WorkersPage } from "@/types/directory/workers";


export async function prefetchWorkers() {
  const queryClient = new QueryClient();
  await queryClient.prefetchQuery({
    queryKey: workersListKey(),
    queryFn: () =>
      serverGet<WorkersPage>(`/directory/workers?limit=${WORKERS_PAGE_SIZE}`),
    staleTime: 60_000,
  });
  return dehydrate(queryClient);
}
